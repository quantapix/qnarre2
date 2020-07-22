import * as qb from '../base';
import { is, get, has } from '../core3';
import * as qc from '../core3';
import * as qd from '../diags';
import { Node, SymbolFlags,  TypeFlags } from './types';
import * as qt from './types';
import { ModifierFlags, Syntax } from '../syntax';
import * as qy from '../syntax';
import {check, checkGrammar} from './check';
const ambientModuleSymbolRegex = /^".+"$/;
const anon = '(anonymous)' as qb.__String & string;
let nextMergeId = 1;
let nextFlowId = 1;
export const isNotOverloadAndNotAccessor = qb.and(qc.is.notOverload, qc.is.notAccessor);

function SymbolLinks(this: SymbolLinks) {}
function NodeLinks(this: NodeLinks) {
  this.flags = 0;
}
export function isInstantiatedModule(node: ModuleDeclaration, preserveConstEnums: boolean) {
  const moduleState = getModuleInstanceState(node);
  return moduleState === ModuleInstanceState.Instantiated || (preserveConstEnums && moduleState === ModuleInstanceState.ConstEnumOnly);
}
export function create(host: qt.TypeCheckerHost, produceDiagnostics: boolean): qt.TypeChecker {
  const getPackagesSet: () => qb.QMap<true> = qb.memoize(() => {
    const set = new qb.QMap<true>();
    host.getSourceFiles().forEach((sf) => {
      if (!sf.resolvedModules) return;
      forEachEntry(sf.resolvedModules, (r) => {
        if (r && r.packageId) set.set(r.packageId.name, true);
      });
    });
    return set;
  });
  let cancellationToken: CancellationToken | undefined;
  let requestedExternalEmitHelpers: ExternalEmitHelpers;
  let externalHelpersModule: Symbol;
  let enumCount = 0;
  let totalInstantiationCount = 0;
  let instantiationCount = 0;
  let instantiationDepth = 0;
  let constraintDepth = 0;
  let currentNode: Node | undefined;
  const emptySymbols = new SymbolTable();
  const arrayVariances = [VarianceFlags.Covariant];
  const compilerOptions = host.getCompilerOptions();
  const languageVersion = getEmitScriptTarget(compilerOptions);
  const moduleKind = getEmitModuleKind(compilerOptions);
  const allowSyntheticDefaultImports = getAllowSyntheticDefaultImports(compilerOptions);
  const strictNullChecks = getStrictOptionValue(compilerOptions, 'strictNullChecks');
  const strictFunctionTypes = getStrictOptionValue(compilerOptions, 'strictFunctionTypes');
  const strictBindCallApply = getStrictOptionValue(compilerOptions, 'strictBindCallApply');
  const strictPropertyInitialization = getStrictOptionValue(compilerOptions, 'strictPropertyInitialization');
  const noImplicitAny = getStrictOptionValue(compilerOptions, 'noImplicitAny');
  const noImplicitThis = getStrictOptionValue(compilerOptions, 'noImplicitThis');
  const keyofStringsOnly = !!compilerOptions.keyofStringsOnly;
  const freshObjectLiteralFlag = compilerOptions.suppressExcessPropertyErrors ? 0 : ObjectFlags.FreshLiteral;
  const emitResolver = createResolver();
  const nodeBuilder = createNodeBuilder();
  class QNode extends qc.Nobj {
    static nextNodeId = 1;
    getNodeId() {
      if (!this.id) {
        this.id = QNode.nextNodeId;
        QNode.nextNodeId++;
      }
      return this.id;
    }
    getNodeLinks(): NodeLinks {
      const i = this.getNodeId();
      return nodeLinks[i] || (nodeLinks[i] = new (<any>NodeLinks)());
    }
    isGlobalSourceFile() {
      return this.kind === Syntax.SourceFile && !is.externalOrCommonJsModule(this as xSourceFile);
    }
  }
  class QType extends qc.Type {
    static typeCount = 0;
    createType(flags: qt.TypeFlags): Type {
      const result = new Type(checker, flags);
      QType.typeCount++;
      result.id = QType.typeCount;
      return result;
    }
  }
  const globals = new SymbolTable();
  const undefinedSymbol = new Symbol(SymbolFlags.Property, 'undefined' as qb.__String);
  undefinedSymbol.declarations = [];
  const globalThisSymbol = new Symbol(SymbolFlags.Module, 'globalThis' as qb.__String, qt.CheckFlags.Readonly);
  globalThisSymbol.exports = globals;
  globalThisSymbol.declarations = [];
  globals.set(globalThisSymbol.escName, globalThisSymbol);
  const argumentsSymbol = new Symbol(SymbolFlags.Property, 'arguments' as qb.__String);
  const requireSymbol = new Symbol(SymbolFlags.Property, 'require' as qb.__String);
  let apparentArgumentCount: number | undefined;
  const checker: TypeChecker = {
    getNodeCount: () => sum(host.getSourceFiles(), 'nodeCount'),
    getIdentifierCount: () => sum(host.getSourceFiles(), 'identifierCount'),
    getSymbolCount: () => sum(host.getSourceFiles(), 'symbolCount') + Symbol.count,
    getTypeCount: () => QType.typeCount,
    getInstantiationCount: () => totalInstantiationCount,
    getRelationCacheSizes: () => ({
      assignable: assignableRelation.size,
      identity: identityRelation.size,
      subtype: subtypeRelation.size,
      strictSubtype: strictSubtypeRelation.size,
    }),
    isUndefinedSymbol: (symbol) => symbol === undefinedSymbol,
    isArgumentsSymbol: (symbol) => symbol === argumentsSymbol,
    isUnknownSymbol: (symbol) => symbol === unknownSymbol,
    getMergedSymbol,
    getDiagnostics,
    getGlobalDiagnostics,
    getTypeOfSymbolAtLocation: (symbol, location) => {
      location = get.parseTreeOf(location);
      return location ? getTypeOfSymbolAtLocation(symbol, location) : errorType;
    },
    getSymbolsOfParameterPropertyDeclaration: (parameterIn, parameterName) => {
      const parameter = get.parseTreeOf(parameterIn, isParameter);
      if (parameter === undefined) return qb.fail('Cannot get symbols of a synthetic parameter that cannot be resolved to a parse-tree node.');
      return getSymbolsOfParameterPropertyDeclaration(parameter, qy.get.escUnderscores(parameterName));
    },
    getDeclaredTypeOfSymbol,
    getPropertiesOfType,
    getPropertyOfType: (type, name) => getPropertyOfType(type, qy.get.escUnderscores(name)),
    getPrivateIdentifierPropertyOfType: (leftType: Type, name: string, location: Node) => {
      const node = get.parseTreeOf(location);
      if (!node) return;
      const propName = qy.get.escUnderscores(name);
      const lexicallyScopedIdentifier = lookupSymbolForPrivateIdentifierDeclaration(propName, node);
      return lexicallyScopedIdentifier ? getPrivateIdentifierPropertyOfType(leftType, lexicallyScopedIdentifier) : undefined;
    },
    getTypeOfPropertyOfType: (type, name) => getTypeOfPropertyOfType(type, qy.get.escUnderscores(name)),
    getIndexInfoOfType,
    getSignaturesOfType,
    getIndexTypeOfType,
    getBaseTypes,
    getBaseTypeOfLiteralType,
    getWidenedType,
    getTypeFromTypeNode: (nodeIn) => {
      const node = get.parseTreeOf(nodeIn, isTypeNode);
      return node ? getTypeFromTypeNode(node) : errorType;
    },
    getParameterType: getTypeAtPosition,
    getPromisedTypeOfPromise,
    getAwaitedType: (type) => getAwaitedType(type),
    getReturnTypeOfSignature,
    isNullableType,
    getNullableType,
    getNonNullableType,
    getNonOptionalType: removeOptionalTypeMarker,
    getTypeArguments,
    typeToTypeNode: nodeBuilder.typeToTypeNode,
    indexInfoToIndexSignatureDeclaration: nodeBuilder.indexInfoToIndexSignatureDeclaration,
    signatureToSignatureDeclaration: nodeBuilder.signatureToSignatureDeclaration,
    symbolToEntityName: nodeBuilder.symbolToEntityName,
    symbolToExpression: nodeBuilder.symbolToExpression,
    symbolToTypeParameterDeclarations: nodeBuilder.symbolToTypeParameterDeclarations,
    symbolToParameterDeclaration: nodeBuilder.symbolToParameterDeclaration,
    typeParameterToDeclaration: nodeBuilder.typeParameterToDeclaration,
    getSymbolsInScope: (location, meaning) => {
      location = get.parseTreeOf(location);
      return location ? getSymbolsInScope(location, meaning) : [];
    },
    getSymbolAtLocation: (node) => {
      node = get.parseTreeOf(node);
      return node ? getSymbolAtLocation(node, true) : undefined;
    },
    getShorthandAssignmentValueSymbol: (node) => {
      node = get.parseTreeOf(node);
      return node ? getShorthandAssignmentValueSymbol(node) : undefined;
    },
    getExportSpecifierLocalTargetSymbol: (nodeIn) => {
      const node = get.parseTreeOf(nodeIn, isExportSpecifier);
      return node ? getExportSpecifierLocalTargetSymbol(node) : undefined;
    },
    getExportSymbolOfSymbol(symbol) {
      return getMergedSymbol(symbol.exportSymbol || symbol);
    },
    getTypeAtLocation: (node) => {
      node = get.parseTreeOf(node);
      return node ? getTypeOfNode(node) : errorType;
    },
    getTypeOfAssignmentPattern: (nodeIn) => {
      const node = get.parseTreeOf(nodeIn, isAssignmentPattern);
      return (node && getTypeOfAssignmentPattern(node)) || errorType;
    },
    getPropertySymbolOfDestructuringAssignment: (locationIn) => {
      const location = get.parseTreeOf(locationIn, isIdentifier);
      return location ? getPropertySymbolOfDestructuringAssignment(location) : undefined;
    },
    signatureToString: (signature, enclosingDeclaration, flags, kind) => {
      return signatureToString(signature, get.parseTreeOf(enclosingDeclaration), flags, kind);
    },
    typeToString: (type, enclosingDeclaration, flags) => {
      return typeToString(type, get.parseTreeOf(enclosingDeclaration), flags);
    },
    symbolToString: (symbol, enclosingDeclaration, meaning, flags) => {
      return symbol.symbolToString(get.parseTreeOf(enclosingDeclaration), meaning, flags);
    },
    typePredicateToString: (predicate, enclosingDeclaration, flags) => {
      return typePredicateToString(predicate, get.parseTreeOf(enclosingDeclaration), flags);
    },
    writeSignature: (signature, enclosingDeclaration, flags, kind, writer) => {
      return signatureToString(signature, get.parseTreeOf(enclosingDeclaration), flags, kind, writer);
    },
    writeType: (type, enclosingDeclaration, flags, writer) => {
      return typeToString(type, get.parseTreeOf(enclosingDeclaration), flags, writer);
    },
    writeSymbol: (symbol, enclosingDeclaration, meaning, flags, writer) => {
      return symbol.symbolToString(get.parseTreeOf(enclosingDeclaration), meaning, flags, writer);
    },
    writeTypePredicate: (predicate, enclosingDeclaration, flags, writer) => {
      return typePredicateToString(predicate, get.parseTreeOf(enclosingDeclaration), flags, writer);
    },
    getAugmentedPropertiesOfType,
    getRootSymbols,
    getContextualType: (nodeIn: Expression, contextFlags?: ContextFlags) => {
      const node = get.parseTreeOf(nodeIn, isExpression);
      if (!node) return;
      const containingCall = qc.findAncestor(node, isCallLikeExpression);
      const containingCallResolvedSignature = containingCall && getNodeLinks(containingCall).resolvedSignature;
      if (contextFlags! & ContextFlags.Completions && containingCall) {
        let toMarkSkip = node as Node;
        do {
          getNodeLinks(toMarkSkip).skipDirectInference = true;
          toMarkSkip = toMarkSkip.parent;
        } while (toMarkSkip && toMarkSkip !== containingCall);
        getNodeLinks(containingCall).resolvedSignature = undefined;
      }
      const result = getContextualType(node, contextFlags);
      if (contextFlags! & ContextFlags.Completions && containingCall) {
        let toMarkSkip = node as Node;
        do {
          getNodeLinks(toMarkSkip).skipDirectInference = undefined;
          toMarkSkip = toMarkSkip.parent;
        } while (toMarkSkip && toMarkSkip !== containingCall);
        getNodeLinks(containingCall).resolvedSignature = containingCallResolvedSignature;
      }
      return result;
    },
    getContextualTypeForObjectLiteralElement: (nodeIn) => {
      const node = get.parseTreeOf(nodeIn, isObjectLiteralElementLike);
      return node ? getContextualTypeForObjectLiteralElement(node) : undefined;
    },
    getContextualTypeForArgumentAtIndex: (nodeIn, argIndex) => {
      const node = get.parseTreeOf(nodeIn, isCallLikeExpression);
      return node && getContextualTypeForArgumentAtIndex(node, argIndex);
    },
    getContextualTypeForJsxAttribute: (nodeIn) => {
      const node = get.parseTreeOf(nodeIn, isJsxAttributeLike);
      return node && getContextualTypeForJsxAttribute(node);
    },
    isContextSensitive,
    getFullyQualifiedName,
    getResolvedSignature: (node, candidatesOutArray, argumentCount) => getResolvedSignatureWorker(node, candidatesOutArray, argumentCount, CheckMode.Normal),
    getResolvedSignatureForSignatureHelp: (node, candidatesOutArray, argumentCount) => getResolvedSignatureWorker(node, candidatesOutArray, argumentCount, CheckMode.IsForSignatureHelp),
    getExpandedParameters,
    hasEffectiveRestParameter,
    getConstantValue: (nodeIn) => {
      const node = get.parseTreeOf(nodeIn, canHaveConstantValue);
      return node ? getConstantValue(node) : undefined;
    },
    isValidPropertyAccess: (nodeIn, propertyName) => {
      const node = get.parseTreeOf(nodeIn, isPropertyAccessOrQualifiedNameOrImportTypeNode);
      return !!node && isValidPropertyAccess(node, qy.get.escUnderscores(propertyName));
    },
    isValidPropertyAccessForCompletions: (nodeIn, type, property) => {
      const node = get.parseTreeOf(nodeIn, isPropertyAccessExpression);
      return !!node && isValidPropertyAccessForCompletions(node, type, property);
    },
    getSignatureFromDeclaration: (declarationIn) => {
      const declaration = get.parseTreeOf(declarationIn, isFunctionLike);
      return declaration ? getSignatureFromDeclaration(declaration) : undefined;
    },
    isImplementationOfOverload: (node) => {
      const parsed = get.parseTreeOf(node, isFunctionLike);
      return parsed ? isImplementationOfOverload(parsed) : undefined;
    },
    getImmediateAliasedSymbol,
    getAliasedSymbol: resolveAlias,
    getEmitResolver,
    getExportsOfModule: getExportsOfModuleAsArray,
    getExportsAndPropertiesOfModule,
    getSymbolWalker: createGetSymbolWalker(
      getRestTypeOfSignature,
      getTypePredicateOfSignature,
      getReturnTypeOfSignature,
      getBaseTypes,
      resolveStructuredTypeMembers,
      getTypeOfSymbol,
      getResolvedSymbol,
      getIndexTypeOfStructuredType,
      getConstraintOfTypeParameter,
      getFirstIdentifier,
      getTypeArguments
    ),
    getAmbientModules,
    getJsxIntrinsicTagNamesAt,
    isOptionalParameter: (nodeIn) => {
      const node = get.parseTreeOf(nodeIn, isParameter);
      return node ? isOptionalParameter(node) : false;
    },
    tryGetMemberInModuleExports: (name, symbol) => tryGetMemberInModuleExports(qy.get.escUnderscores(name), symbol),
    tryGetMemberInModuleExportsAndProperties: (name, symbol) => tryGetMemberInModuleExportsAndProperties(qy.get.escUnderscores(name), symbol),
    tryFindAmbientModuleWithoutAugmentations: (moduleName) => {
      return tryFindAmbientModule(moduleName, false);
    },
    getApparentType,
    getUnionType,
    isTypeAssignableTo,
    createAnonymousType,
    createSignature,
    createSymbol,
    createIndexInfo,
    getAnyType: () => anyType,
    getStringType: () => stringType,
    getNumberType: () => numberType,
    createPromiseType,
    createArrayType,
    getElementTypeOfArrayType,
    getBooleanType: () => booleanType,
    getFalseType: (fresh?) => (fresh ? falseType : regularFalseType),
    getTrueType: (fresh?) => (fresh ? trueType : regularTrueType),
    getVoidType: () => voidType,
    getUndefinedType: () => undefinedType,
    getNullType: () => nullType,
    getESSymbolType: () => esSymbolType,
    getNeverType: () => neverType,
    getOptionalType: () => optionalType,
    isSymbolAccessible,
    isArrayType,
    isTupleType,
    isArrayLikeType,
    isTypeInvalidDueToUnionDiscriminant,
    getAllPossiblePropertiesOfTypes,
    getSuggestedSymbolForNonexistentProperty,
    getSuggestionForNonexistentProperty,
    getSuggestedSymbolForNonexistentSymbol: (location, name, meaning) => getSuggestedSymbolForNonexistentSymbol(location, qy.get.escUnderscores(name), meaning),
    getSuggestionForNonexistentSymbol: (location, name, meaning) => getSuggestionForNonexistentSymbol(location, qy.get.escUnderscores(name), meaning),
    getSuggestedSymbolForNonexistentModule,
    getSuggestionForNonexistentExport,
    getBaseConstraintOfType,
    getDefaultFromTypeParameter: (type) => (type && type.flags & qt.TypeFlags.TypeParameter ? getDefaultFromTypeParameter(type as TypeParameter) : undefined),
    resolveName(name, location, meaning, excludeGlobals) {
      return resolveName(location, qy.get.escUnderscores(name), meaning, undefined, undefined, false, excludeGlobals);
    },
    getJsxNamespace: (n) => qy.get.unescUnderscores(getJsxNamespace(n)),
    getAccessibleSymbolChain,
    getTypePredicateOfSignature,
    resolveExternalModuleName: (moduleSpecifier) => {
      return resolveExternalModuleName(moduleSpecifier, moduleSpecifier, true);
    },
    resolveExternalModuleSymbol,
    tryGetThisTypeAt: (node, includeGlobalThis) => {
      node = get.parseTreeOf(node);
      return node && tryGetThisTypeAt(node, includeGlobalThis);
    },
    getTypeArgumentConstraint: (nodeIn) => {
      const node = get.parseTreeOf(nodeIn, isTypeNode);
      return node && getTypeArgumentConstraint(node);
    },
    getSuggestionDiagnostics: (file, ct) => {
      if (skipTypeChecking(file, compilerOptions, host)) return empty;
      let diagnostics: qd.DiagnosticWithLocation[] | undefined;
      try {
        cancellationToken = ct;
        check.sourceFile(file);
        assert(!!(getNodeLinks(file).flags & NodeCheckFlags.TypeChecked));
        diagnostics = addRange(diagnostics, suggestionqd.msgs.getDiagnostics(file.fileName));
        check.unusedIdentifiers(getPotentiallyUnusedIdentifiers(file), (containingNode, kind, diag) => {
          if (!containsParseError(containingNode) && !unusedIsError(kind, !!(containingNode.flags & NodeFlags.Ambient)))
            (diagnostics || (diagnostics = [])).push({ ...diag, category: qd.msgs.Category.Suggestion });
        });
        return diagnostics || empty;
      } finally {
        cancellationToken = undefined;
      }
    },
    runWithCancellationToken: (token, callback) => {
      try {
        cancellationToken = token;
        return callback(checker);
      } finally {
        cancellationToken = undefined;
      }
    },
    getLocalTypeParametersOfClassOrInterfaceOrTypeAlias,
    isDeclarationVisible,
  };
  const tupleTypes = new qb.QMap<GenericType>();
  const unionTypes = new qb.QMap<UnionType>();
  const intersectionTypes = new qb.QMap<Type>();
  const literalTypes = new qb.QMap<LiteralType>();
  const indexedAccessTypes = new qb.QMap<IndexedAccessType>();
  const substitutionTypes = new qb.QMap<SubstitutionType>();
  const evolvingArrayTypes: EvolvingArrayType[] = [];
  const undefinedProperties = new qb.QMap<Symbol>() as EscapedMap<Symbol>;
  const unknownSymbol = new Symbol(SymbolFlags.Property, 'unknown' as qb.__String);
  const resolvingSymbol = new Symbol(0, InternalSymbol.Resolving);
  const anyType = createIntrinsicType(TypeFlags.Any, 'any');
  const autoType = createIntrinsicType(TypeFlags.Any, 'any');
  const wildcardType = createIntrinsicType(TypeFlags.Any, 'any');
  const errorType = createIntrinsicType(TypeFlags.Any, 'error');
  const nonInferrableAnyType = createIntrinsicType(TypeFlags.Any, 'any', ObjectFlags.ContainsWideningType);
  const unknownType = createIntrinsicType(TypeFlags.Unknown, 'unknown');
  const undefinedType = createIntrinsicType(TypeFlags.Undefined, 'undefined');
  const undefinedWideningType = strictNullChecks ? undefinedType : createIntrinsicType(TypeFlags.Undefined, 'undefined', ObjectFlags.ContainsWideningType);
  const optionalType = createIntrinsicType(TypeFlags.Undefined, 'undefined');
  const nullType = createIntrinsicType(TypeFlags.Null, 'null');
  const nullWideningType = strictNullChecks ? nullType : createIntrinsicType(TypeFlags.Null, 'null', ObjectFlags.ContainsWideningType);
  const stringType = createIntrinsicType(TypeFlags.String, 'string');
  const numberType = createIntrinsicType(TypeFlags.Number, 'number');
  const bigintType = createIntrinsicType(TypeFlags.BigInt, 'bigint');
  const falseType = createIntrinsicType(TypeFlags.BooleanLiteral, 'false') as FreshableIntrinsicType;
  const regularFalseType = createIntrinsicType(TypeFlags.BooleanLiteral, 'false') as FreshableIntrinsicType;
  const trueType = createIntrinsicType(TypeFlags.BooleanLiteral, 'true') as FreshableIntrinsicType;
  const regularTrueType = createIntrinsicType(TypeFlags.BooleanLiteral, 'true') as FreshableIntrinsicType;
  trueType.regularType = regularTrueType;
  trueType.freshType = trueType;
  regularTrueType.regularType = regularTrueType;
  regularTrueType.freshType = trueType;
  falseType.regularType = regularFalseType;
  falseType.freshType = falseType;
  regularFalseType.regularType = regularFalseType;
  regularFalseType.freshType = falseType;
  const booleanType = createBooleanType([regularFalseType, regularTrueType]);
  createBooleanType([regularFalseType, trueType]);
  createBooleanType([falseType, regularTrueType]);
  createBooleanType([falseType, trueType]);
  const esSymbolType = createIntrinsicType(TypeFlags.ESSymbol, 'symbol');
  const voidType = createIntrinsicType(TypeFlags.Void, 'void');
  const neverType = createIntrinsicType(TypeFlags.Never, 'never');
  const silentNeverType = createIntrinsicType(TypeFlags.Never, 'never');
  const nonInferrableType = createIntrinsicType(TypeFlags.Never, 'never', ObjectFlags.NonInferrableType);
  const implicitNeverType = createIntrinsicType(TypeFlags.Never, 'never');
  const unreachableNeverType = createIntrinsicType(TypeFlags.Never, 'never');
  const nonPrimitiveType = createIntrinsicType(TypeFlags.NonPrimitive, 'object');
  const stringNumberSymbolType = getUnionType([stringType, numberType, esSymbolType]);
  const keyofConstraintType = keyofStringsOnly ? stringType : stringNumberSymbolType;
  const numberOrBigIntType = getUnionType([numberType, bigintType]);
  const restrictiveMapper: TypeMapper = makeFunctionTypeMapper((t) => (t.flags & qt.TypeFlags.TypeParameter ? getRestrictiveTypeParameter(<TypeParameter>t) : t));
  const permissiveMapper: TypeMapper = makeFunctionTypeMapper((t) => (t.flags & qt.TypeFlags.TypeParameter ? wildcardType : t));
  const emptyObjectType = createAnonymousType(undefined, emptySymbols, empty, empty, undefined, undefined);
  const emptyJsxObjectType = createAnonymousType(undefined, emptySymbols, empty, empty, undefined, undefined);
  emptyJsxObjectType.objectFlags |= ObjectFlags.JsxAttributes;
  const emptyTypeLiteralSymbol = new Symbol(SymbolFlags.TypeLiteral, InternalSymbol.Type);
  emptyTypeLiteralSymbol.members = new SymbolTable();
  const emptyTypeLiteralType = createAnonymousType(emptyTypeLiteralSymbol, emptySymbols, empty, empty, undefined, undefined);
  const emptyGenericType = <GenericType>(<ObjectType>createAnonymousType(undefined, emptySymbols, empty, empty, undefined, undefined));
  emptyGenericType.instantiations = new qb.QMap<TypeReference>();
  const anyFunctionType = createAnonymousType(undefined, emptySymbols, empty, empty, undefined, undefined);
  anyFunctionType.objectFlags |= ObjectFlags.NonInferrableType;
  const noConstraintType = createAnonymousType(undefined, emptySymbols, empty, empty, undefined, undefined);
  const circularConstraintType = createAnonymousType(undefined, emptySymbols, empty, empty, undefined, undefined);
  const resolvingDefaultType = createAnonymousType(undefined, emptySymbols, empty, empty, undefined, undefined);
  const markerSuperType = createTypeParameter();
  const markerSubType = createTypeParameter();
  markerSubType.constraint = markerSuperType;
  const markerOtherType = createTypeParameter();
  const noTypePredicate = createTypePredicate(TypePredicateKind.Identifier, '<<unresolved>>', 0, anyType);
  const anySignature = createSignature(undefined, undefined, undefined, empty, anyType, undefined, 0, SignatureFlags.None);
  const unknownSignature = createSignature(undefined, undefined, undefined, empty, errorType, undefined, 0, SignatureFlags.None);
  const resolvingSignature = createSignature(undefined, undefined, undefined, empty, anyType, undefined, 0, SignatureFlags.None);
  const silentNeverSignature = createSignature(undefined, undefined, undefined, empty, silentNeverType, undefined, 0, SignatureFlags.None);
  const enumNumberIndexInfo = createIndexInfo(stringType, true);
  const iterationTypesCache = new qb.QMap<IterationTypes>();
  const noIterationTypes: IterationTypes = {
    get yieldType(): Type {
      return qb.fail('Not supported');
    },
    get returnType(): Type {
      return qb.fail('Not supported');
    },
    get nextType(): Type {
      return qb.fail('Not supported');
    },
  };
  const anyIterationTypes = createIterationTypes(anyType, anyType, anyType);
  const anyIterationTypesExceptNext = createIterationTypes(anyType, anyType, unknownType);
  const defaultIterationTypes = createIterationTypes(neverType, anyType, undefinedType);
  const asyncIterationTypesResolver: IterationTypesResolver = {
    iterableCacheKey: 'iterationTypesOfAsyncIterable',
    iteratorCacheKey: 'iterationTypesOfAsyncIterator',
    iteratorSymbolName: 'asyncIterator',
    getGlobalIteratorType: getGlobalAsyncIteratorType,
    getGlobalIterableType: getGlobalAsyncIterableType,
    getGlobalIterableIteratorType: getGlobalAsyncIterableIteratorType,
    getGlobalGeneratorType: getGlobalAsyncGeneratorType,
    resolveIterationType: getAwaitedType,
    mustHaveANextMethodDiagnostic: qd.msgs.An_async_iterator_must_have_a_next_method,
    mustBeAMethodDiagnostic: qd.msgs.The_0_property_of_an_async_iterator_must_be_a_method,
    mustHaveAValueDiagnostic: qd.msgs.The_type_returned_by_the_0_method_of_an_async_iterator_must_be_a_promise_for_a_type_with_a_value_property,
  };
  const syncIterationTypesResolver: IterationTypesResolver = {
    iterableCacheKey: 'iterationTypesOfIterable',
    iteratorCacheKey: 'iterationTypesOfIterator',
    iteratorSymbolName: 'iterator',
    getGlobalIteratorType,
    getGlobalIterableType,
    getGlobalIterableIteratorType,
    getGlobalGeneratorType,
    resolveIterationType: (type, _errorNode) => type,
    mustHaveANextMethodDiagnostic: qd.msgs.An_iterator_must_have_a_next_method,
    mustBeAMethodDiagnostic: qd.msgs.The_0_property_of_an_iterator_must_be_a_method,
    mustHaveAValueDiagnostic: qd.msgs.The_type_returned_by_the_0_method_of_an_iterator_must_have_a_value_property,
  };
  interface DuplicateInfoForSymbol {
    readonly firstFileLocations: Declaration[];
    readonly secondFileLocations: Declaration[];
    readonly isBlockScoped: boolean;
  }
  interface DuplicateInfoForFiles {
    readonly firstFile: SourceFile;
    readonly secondFile: SourceFile;
    readonly conflictingSymbols: qb.QMap<DuplicateInfoForSymbol>;
  }
  let amalgamatedDuplicates: qb.QMap<DuplicateInfoForFiles> | undefined;
  const reverseMappedCache = new qb.QMap<Type | undefined>();
  let inInferTypeForHomomorphicMappedType = false;
  let ambientModulesCache: Symbol[] | undefined;
  let patternAmbientModules: PatternAmbientModule[];
  let patternAmbientModuleAugmentations: qb.QMap<Symbol> | undefined;
  let globalObjectType: ObjectType;
  let globalFunctionType: ObjectType;
  let globalCallableFunctionType: ObjectType;
  let globalNewableFunctionType: ObjectType;
  let globalArrayType: GenericType;
  let globalReadonlyArrayType: GenericType;
  let globalStringType: ObjectType;
  let globalNumberType: ObjectType;
  let globalBooleanType: ObjectType;
  let globalRegExpType: ObjectType;
  let globalThisType: GenericType;
  let anyArrayType: Type;
  let autoArrayType: Type;
  let anyReadonlyArrayType: Type;
  let deferredGlobalNonNullableTypeAlias: Symbol;
  let deferredGlobalESSymbolConstructorSymbol: Symbol | undefined;
  let deferredGlobalESSymbolType: ObjectType;
  let deferredGlobalTypedPropertyDescriptorType: GenericType;
  let deferredGlobalPromiseType: GenericType;
  let deferredGlobalPromiseLikeType: GenericType;
  let deferredGlobalPromiseConstructorSymbol: Symbol | undefined;
  let deferredGlobalPromiseConstructorLikeType: ObjectType;
  let deferredGlobalIterableType: GenericType;
  let deferredGlobalIteratorType: GenericType;
  let deferredGlobalIterableIteratorType: GenericType;
  let deferredGlobalGeneratorType: GenericType;
  let deferredGlobalIteratorYieldResultType: GenericType;
  let deferredGlobalIteratorReturnResultType: GenericType;
  let deferredGlobalAsyncIterableType: GenericType;
  let deferredGlobalAsyncIteratorType: GenericType;
  let deferredGlobalAsyncIterableIteratorType: GenericType;
  let deferredGlobalAsyncGeneratorType: GenericType;
  let deferredGlobalTemplateStringsArrayType: ObjectType;
  let deferredGlobalImportMetaType: ObjectType;
  let deferredGlobalExtractSymbol: Symbol;
  let deferredGlobalOmitSymbol: Symbol;
  let deferredGlobalBigIntType: ObjectType;
  const allPotentiallyUnusedIdentifiers = new qb.QMap<PotentiallyUnusedIdentifier[]>();
  let flowLoopStart = 0;
  let flowLoopCount = 0;
  let sharedFlowCount = 0;
  let flowAnalysisDisabled = false;
  let flowInvocationCount = 0;
  let lastFlowNode: FlowNode | undefined;
  let lastFlowNodeReachable: boolean;
  let flowTypeCache: Type[] | undefined;
  const emptyStringType = getLiteralType('');
  const zeroType = getLiteralType(0);
  const zeroBigIntType = getLiteralType({ negative: false, base10Value: '0' });
  const resolutionTargets: TypeSystemEntity[] = [];
  const resolutionResults: boolean[] = [];
  const resolutionPropertyNames: TypeSystemPropertyName[] = [];
  let suggestionCount = 0;
  const maximumSuggestionCount = 10;
  const mergedSymbols: Symbol[] = [];
  const symbolLinks: SymbolLinks[] = [];
  const nodeLinks: NodeLinks[] = [];
  const flowLoopCaches: qb.QMap<Type>[] = [];
  const flowLoopNodes: FlowNode[] = [];
  const flowLoopKeys: string[] = [];
  const flowLoopTypes: Type[][] = [];
  const sharedFlowNodes: FlowNode[] = [];
  const sharedFlowTypes: FlowType[] = [];
  const flowNodeReachable: (boolean | undefined)[] = [];
  const flowNodePostSuper: (boolean | undefined)[] = [];
  const potentialThisCollisions: Node[] = [];
  const potentialNewTargetCollisions: Node[] = [];
  const potentialWeakMapCollisions: Node[] = [];
  const awaitedTypeStack: number[] = [];
  const diagnostics = createDiagnosticCollection();
  const suggestionDiagnostics = createDiagnosticCollection();
  const typeofTypesByName: qb.QReadonlyMap<Type> = new qb.QMap<Type>({
    string: stringType,
    number: numberType,
    bigint: bigintType,
    boolean: booleanType,
    symbol: esSymbolType,
    undefined: undefinedType,
  });
  const typeofType = createTypeofType();
  let _jsxNamespace: qb.__String;
  let _jsxFactoryEntity: EntityName | undefined;
  let outofbandVarianceMarkerHandler: ((onlyUnreliable: boolean) => void) | undefined;
  const subtypeRelation = new qb.QMap<RelationComparisonResult>();
  const strictSubtypeRelation = new qb.QMap<RelationComparisonResult>();
  const assignableRelation = new qb.QMap<RelationComparisonResult>();
  const comparableRelation = new qb.QMap<RelationComparisonResult>();
  const identityRelation = new qb.QMap<RelationComparisonResult>();
  const enumRelation = new qb.QMap<RelationComparisonResult>();
  const builtinGlobals = new SymbolTable();
  builtinGlobals.set(undefinedSymbol.escName, undefinedSymbol);
  initializeTypeChecker();
  return checker;
  function lookupOrIssueError(location: Node | undefined, message: qd.Message, arg0?: string | number, arg1?: string | number, arg2?: string | number, arg3?: string | number): qd.Diagnostic {
    const diagnostic = location ? createDiagnosticForNode(location, message, arg0, arg1, arg2, arg3) : createCompilerDiagnostic(message, arg0, arg1, arg2, arg3);
    const existing = diagnostics.lookup(diagnostic);
    if (existing) return existing;
    else {
      diagnostics.add(diagnostic);
      return diagnostic;
    }
  }
  function error(location: Node | undefined, message: qd.Message, arg0?: string | number, arg1?: string | number, arg2?: string | number, arg3?: string | number): qd.Diagnostic {
    const diagnostic = location ? createDiagnosticForNode(location, message, arg0, arg1, arg2, arg3) : createCompilerDiagnostic(message, arg0, arg1, arg2, arg3);
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
    addErrorOrSuggestion(isError, 'message' in message ? createDiagnosticForNode(location, message, arg0, arg1, arg2, arg3) : createDiagnosticForNodeFromMessageChain(location, message));
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
      const related = createDiagnosticForNode(location, qd.msgs.Did_you_forget_to_use_await);
      addRelatedInfo(diagnostic, related);
    }
    return diagnostic;
  }
  function addDuplicateDeclarationError(node: Declaration, message: qd.Message, symbolName: string, relatedNodes: readonly Declaration[] | undefined) {
    const errorNode = (getExpandoIniter(node, false) ? getNameOfExpando(node) : get.nameOfDeclaration(node)) || node;
    const err = lookupOrIssueError(errorNode, message, symbolName);
    for (const relatedNode of relatedNodes || empty) {
      const adjustedNode = (getExpandoIniter(relatedNode, false) ? getNameOfExpando(relatedNode) : get.nameOfDeclaration(relatedNode)) || relatedNode;
      if (adjustedNode === errorNode) continue;
      err.relatedInformation = err.relatedInformation || [];
      const leadingMessage = createDiagnosticForNode(adjustedNode, qd.msgs._0_was_also_declared_here, symbolName);
      const followOnMessage = createDiagnosticForNode(adjustedNode, qd.msgs.and_here);
      if (
        length(err.relatedInformation) >= 5 ||
        some(err.relatedInformation, (r) => compareDiagnostics(r, followOnMessage) === Comparison.EqualTo || compareDiagnostics(r, leadingMessage) === Comparison.EqualTo)
      )
        continue;
      addRelatedInfo(err, !length(err.relatedInformation) ? leadingMessage : followOnMessage);
    }
  }
  function mergeModuleAugmentation(moduleName: StringLiteral | Identifier): void {
    const moduleAugmentation = <ModuleDeclaration>moduleName.parent;
    if (moduleAugmentation.symbol.declarations[0] !== moduleAugmentation) {
      assert(moduleAugmentation.symbol.declarations.length > 1);
      return;
    }
    if (isGlobalScopeAugmentation(moduleAugmentation)) globals.merge(moduleAugmentation.symbol.exports!);
    else {
      const moduleNotFoundError = !(moduleName.parent.parent.flags & NodeFlags.Ambient) ? qd.msgs.Invalid_module_name_in_augmentation_module_0_cannot_be_found : undefined;
      let mainModule = resolveExternalModuleNameWorker(moduleName, moduleName, moduleNotFoundError, true);
      if (!mainModule) return;
      mainModule = resolveExternalModuleSymbol(mainModule);
      if (mainModule.flags & qt.SymbolFlags.Namespace) {
        if (some(patternAmbientModules, (module) => mainModule === module.symbol)) {
          const merged = mainModule.merge(moduleAugmentation.symbol, true);
          if (!patternAmbientModuleAugmentations) patternAmbientModuleAugmentations = new qb.QMap();
          patternAmbientModuleAugmentations.set((moduleName as StringLiteral).text, merged);
        } else {
          if (mainModule.exports?.get(InternalSymbol.ExportStar) && moduleAugmentation.symbol.exports?.size) {
            const resolvedExports = getResolvedMembersOrExportsOfSymbol(mainModule, MembersOrExportsResolutionKind.resolvedExports);
            for (const [key, value] of arrayFrom(moduleAugmentation.symbol.exports.entries())) {
              if (resolvedExports.has(key) && !mainModule.exports.has(key)) value.merge(resolvedExports.get(key)!);
            }
          }
          moduleAugmentation.symbol.merge(mainModule);
        }
      } else error(moduleName, qd.msgs.Cannot_augment_module_0_because_it_resolves_to_a_non_module_entity, (moduleName as StringLiteral).text);
    }
  }
  function isBlockScopedNameDeclaredBeforeUse(declaration: Declaration, usage: Node): boolean {
    const declarationFile = get.sourceFileOf(declaration);
    const useFile = get.sourceFileOf(usage);
    const declContainer = get.enclosingBlockScopeContainer(declaration);
    if (declarationFile !== useFile) {
      if (
        (moduleKind && (declarationFile.externalModuleIndicator || useFile.externalModuleIndicator)) ||
        (!compilerOptions.outFile && !compilerOptions.out) ||
        isInTypeQuery(usage) ||
        declaration.flags & NodeFlags.Ambient
      ) {
        return true;
      }
      if (isUsedInFunctionOrInstanceProperty(usage, declaration)) return true;
      const sourceFiles = host.getSourceFiles();
      return sourceFiles.indexOf(declarationFile) <= sourceFiles.indexOf(useFile);
    }
    if (declaration.pos <= usage.pos && !(is.kind(qc.PropertyDeclaration, declaration) && is.thisProperty(usage.parent) && !declaration.initer && !declaration.exclamationToken)) {
      if (declaration.kind === Syntax.BindingElement) {
        const errorBindingElement = get.ancestor(usage, Syntax.BindingElement) as BindingElement;
        if (errorBindingElement)
          return qc.findAncestor(errorBindingElement, BindingElement.kind) !== qc.findAncestor(declaration, BindingElement.kind) || declaration.pos < errorBindingElement.pos;
        return isBlockScopedNameDeclaredBeforeUse(get.ancestor(declaration, Syntax.VariableDeclaration) as Declaration, usage);
      } else if (declaration.kind === Syntax.VariableDeclaration) {
        return !isImmediatelyUsedInIniterOfBlockScopedVariable(declaration as VariableDeclaration, usage);
      } else if (is.kind(qc.ClassDeclaration, declaration)) {
        return !qc.findAncestor(usage, (n) => is.kind(qc.ComputedPropertyName, n) && n.parent.parent === declaration);
      } else if (is.kind(qc.PropertyDeclaration, declaration)) {
        return !isPropertyImmediatelyReferencedWithinDeclaration(declaration, usage, false);
      } else if (is.parameterPropertyDeclaration(declaration, declaration.parent)) {
        return !(
          compilerOptions.target === ScriptTarget.ESNext &&
          !!compilerOptions.useDefineForClassFields &&
          get.containingClass(declaration) === get.containingClass(usage) &&
          isUsedInFunctionOrInstanceProperty(usage, declaration)
        );
      }
      return true;
    }
    if (usage.parent.kind === Syntax.ExportSpecifier || (usage.parent.kind === Syntax.ExportAssignment && (usage.parent as ExportAssignment).isExportEquals)) return true;
    if (usage.kind === Syntax.ExportAssignment && (usage as ExportAssignment).isExportEquals) return true;
    if (!!(usage.flags & NodeFlags.Doc) || isInTypeQuery(usage) || usageInTypeDeclaration()) return true;
    if (isUsedInFunctionOrInstanceProperty(usage, declaration)) {
      if (
        compilerOptions.target === ScriptTarget.ESNext &&
        !!compilerOptions.useDefineForClassFields &&
        get.containingClass(declaration) &&
        (is.kind(qc.PropertyDeclaration, declaration) || is.parameterPropertyDeclaration(declaration, declaration.parent))
      ) {
        return !isPropertyImmediatelyReferencedWithinDeclaration(declaration, usage, true);
      }
      return true;
    }
    return false;
    function usageInTypeDeclaration() {
      return !!qc.findAncestor(usage, (node) => is.kind(qc.InterfaceDeclaration, node) || is.kind(qc.TypeAliasDeclaration, node));
    }
    function isImmediatelyUsedInIniterOfBlockScopedVariable(declaration: VariableDeclaration, usage: Node): boolean {
      switch (declaration.parent.parent.kind) {
        case Syntax.VariableStatement:
        case Syntax.ForStatement:
        case Syntax.ForOfStatement:
          if (isSameScopeDescendentOf(usage, declaration, declContainer)) return true;
          break;
      }
      const grandparent = declaration.parent.parent;
      return is.forInOrOfStatement(grandparent) && isSameScopeDescendentOf(usage, grandparent.expression, declContainer);
    }
    function isUsedInFunctionOrInstanceProperty(usage: Node, declaration: Node): boolean {
      return !!qc.findAncestor(usage, (current) => {
        if (current === declContainer) return 'quit';
        if (is.functionLike(current)) return true;
        const initerOfProperty = current.parent && current.parent.kind === Syntax.PropertyDeclaration && (<PropertyDeclaration>current.parent).initer === current;
        if (initerOfProperty) {
          if (has.syntacticModifier(current.parent, ModifierFlags.Static)) {
            if (declaration.kind === Syntax.MethodDeclaration) return true;
          } else {
            const isDeclarationInstanceProperty = declaration.kind === Syntax.PropertyDeclaration && !has.syntacticModifier(declaration, ModifierFlags.Static);
            if (!isDeclarationInstanceProperty || get.containingClass(usage) !== get.containingClass(declaration)) return true;
          }
        }
        return false;
      });
    }
    function isPropertyImmediatelyReferencedWithinDeclaration(declaration: PropertyDeclaration | ParameterPropertyDeclaration, usage: Node, stopAtAnyPropertyDeclaration: boolean) {
      if (usage.end > declaration.end) return false;
      const ancestorChangingReferenceScope = qc.findAncestor(usage, (node: Node) => {
        if (node === declaration) return 'quit';
        switch (node.kind) {
          case Syntax.ArrowFunction:
            return true;
          case Syntax.PropertyDeclaration:
            return stopAtAnyPropertyDeclaration &&
              ((is.kind(qc.PropertyDeclaration, declaration) && node.parent === declaration.parent) ||
                (is.parameterPropertyDeclaration(declaration, declaration.parent) && node.parent === declaration.parent.parent))
              ? 'quit'
              : true;
          case Syntax.Block:
            switch (node.parent.kind) {
              case Syntax.GetAccessor:
              case Syntax.MethodDeclaration:
              case Syntax.SetAccessor:
                return true;
              default:
                return false;
            }
          default:
            return false;
        }
      });
      return ancestorChangingReferenceScope === undefined;
    }
  }
  function useOuterVariableScopeInParameter(result: Symbol, location: Node, lastLocation: Node) {
    const target = getEmitScriptTarget(compilerOptions);
    const functionLocation = <FunctionLikeDeclaration>location;
    if (
      is.kind(qc.ParameterDeclaration, lastLocation) &&
      functionLocation.body &&
      result.valueDeclaration.pos >= functionLocation.body.pos &&
      result.valueDeclaration.end <= functionLocation.body.end
    ) {
      const ls = getNodeLinks(functionLocation);
      if (ls.declarationRequiresScopeChange === undefined) ls.declarationRequiresScopeChange = forEach(functionLocation.parameters, requiresScopeChange) || false;
      return !ls.declarationRequiresScopeChange;
    }
    return false;
    function requiresScopeChange(node: ParameterDeclaration): boolean {
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
          return requiresScopeChangeWorker((node as MethodDeclaration | AccessorDeclaration | PropertyAssignment).name);
        case Syntax.PropertyDeclaration:
          if (has.staticModifier(node)) return target < ScriptTarget.ESNext || !compilerOptions.useDefineForClassFields;
          return requiresScopeChangeWorker((node as PropertyDeclaration).name);
        default:
          if (is.nullishCoalesce(node) || is.optionalChain(node)) return false;
          if (is.kind(qc.BindingElement, node) && node.dot3Token && is.kind(qc.ObjectBindingPattern, node.parent)) return false;
          if (is.typeNode(node)) return false;
          return qc.forEach.child(node, requiresScopeChangeWorker) || false;
      }
    }
  }
  function resolveName(
    location: Node | undefined,
    name: qb.__String,
    meaning: qt.SymbolFlags,
    nameNotFoundMessage: qd.Message | undefined,
    nameArg: qb.__String | qc.Identifier | undefined,
    isUse: boolean,
    excludeGlobals = false,
    suggestedNameNotFoundMessage?: qd.Message
  ): Symbol | undefined {
    return resolveNameHelper(location, name, meaning, nameNotFoundMessage, nameArg, isUse, excludeGlobals, getSymbol, suggestedNameNotFoundMessage);
  }
  function resolveNameHelper(
    location: Node | undefined,
    name: qb.__String,
    meaning: qt.SymbolFlags,
    nameNotFoundMessage: qd.Message | undefined,
    nameArg: qb.__String | qc.Identifier | undefined,
    isUse: boolean,
    excludeGlobals: boolean,
    lookup: typeof getSymbol,
    suggestedNameNotFoundMessage?: qd.Message
  ): Symbol | undefined {
    const originalLocation = location;
    let result: Symbol | undefined;
    let lastLocation: Node | undefined;
    let lastSelfReferenceLocation: Node | undefined;
    let propertyWithInvalidIniter: Node | undefined;
    let associatedDeclarationForContainingIniterOrBindingName: ParameterDeclaration | BindingElement | undefined;
    let withinDeferredContext = false;
    const errorLocation = location;
    let grandparent: Node;
    let isInExternalModule = false;
    loop: while (location) {
      if (location.locals && !isGlobalSourceFile(location)) {
        if ((result = lookup(location.locals, name, meaning))) {
          let useResult = true;
          if (is.functionLike(location) && lastLocation && lastLocation !== (<FunctionLikeDeclaration>location).body) {
            if (meaning & result.flags & qt.SymbolFlags.Type && lastLocation.kind !== Syntax.DocComment) {
              useResult =
                result.flags & qt.SymbolFlags.TypeParameter
                  ? lastLocation === (<FunctionLikeDeclaration>location).type || lastLocation.kind === Syntax.Parameter || lastLocation.kind === Syntax.TypeParameter
                  : false;
            }
            if (meaning & result.flags & qt.SymbolFlags.Variable) {
              if (useOuterVariableScopeInParameter(result, location, lastLocation)) useResult = false;
              else if (result.flags & qt.SymbolFlags.FunctionScopedVariable) {
                useResult = lastLocation.kind === Syntax.Parameter || (lastLocation === (<FunctionLikeDeclaration>location).type && !!qc.findAncestor(result.valueDeclaration, isParameter));
              }
            }
          } else if (location.kind === Syntax.ConditionalType) {
            useResult = lastLocation === (<ConditionalTypeNode>location).trueType;
          }
          if (useResult) break loop;
          else {
            result = undefined;
          }
        }
      }
      withinDeferredContext = withinDeferredContext || getIsDeferredContext(location, lastLocation);
      switch (location.kind) {
        case Syntax.SourceFile:
          if (!is.externalOrCommonJsModule(<SourceFile>location)) break;
          isInExternalModule = true;
        case Syntax.ModuleDeclaration:
          const moduleExports = getSymbolOfNode(location as SourceFile | ModuleDeclaration).exports || emptySymbols;
          if (location.kind === Syntax.SourceFile || (is.kind(qc.ModuleDeclaration, location) && location.flags & NodeFlags.Ambient && !isGlobalScopeAugmentation(location))) {
            if ((result = moduleExports.get(InternalSymbol.Default))) {
              const localSymbol = getLocalSymbolForExportDefault(result);
              if (localSymbol && result.flags & meaning && localSymbol.escName === name) break loop;
              result = undefined;
            }
            const moduleExport = moduleExports.get(name);
            if (
              moduleExport &&
              moduleExport.flags === qt.SymbolFlags.Alias &&
              (getDeclarationOfKind(moduleExport, Syntax.ExportSpecifier) || getDeclarationOfKind(moduleExport, Syntax.NamespaceExport))
            ) {
              break;
            }
          }
          if (name !== InternalSymbol.Default && (result = lookup(moduleExports, name, meaning & qt.SymbolFlags.ModuleMember))) {
            if (is.kind(qc.SourceFile, location) && location.commonJsModuleIndicator && !result.declarations.some(isDocTypeAlias)) result = undefined;
            else {
              break loop;
            }
          }
          break;
        case Syntax.EnumDeclaration:
          if ((result = lookup(getSymbolOfNode(location)!.exports!, name, meaning & qt.SymbolFlags.EnumMember))) break loop;
          break;
        case Syntax.PropertyDeclaration:
          if (!has.syntacticModifier(location, ModifierFlags.Static)) {
            const ctor = findConstructorDeclaration(location.parent as ClassLikeDeclaration);
            if (ctor && ctor.locals) {
              if (lookup(ctor.locals, name, meaning & qt.SymbolFlags.Value)) propertyWithInvalidIniter = location;
            }
          }
          break;
        case Syntax.ClassDeclaration:
        case Syntax.ClassExpression:
        case Syntax.InterfaceDeclaration:
          if ((result = lookup(getSymbolOfNode(location as ClassLikeDeclaration | InterfaceDeclaration).members || emptySymbols, name, meaning & qt.SymbolFlags.Type))) {
            if (!isTypeParameterSymbolDeclaredInContainer(result, location)) {
              result = undefined;
              break;
            }
            if (lastLocation && has.syntacticModifier(lastLocation, ModifierFlags.Static)) {
              error(errorLocation, qd.msgs.Static_members_cannot_reference_class_type_parameters);
              return;
            }
            break loop;
          }
          if (location.kind === Syntax.ClassExpression && meaning & qt.SymbolFlags.Class) {
            const className = (<ClassExpression>location).name;
            if (className && name === className.escapedText) {
              result = location.symbol;
              break loop;
            }
          }
          break;
        case Syntax.ExpressionWithTypeArguments:
          if (lastLocation === (<ExpressionWithTypeArguments>location).expression && (<HeritageClause>location.parent).token === Syntax.ExtendsKeyword) {
            const container = location.parent.parent;
            if (is.classLike(container) && (result = lookup(getSymbolOfNode(container).members!, name, meaning & qt.SymbolFlags.Type))) {
              if (nameNotFoundMessage) error(errorLocation, qd.msgs.Base_class_expressions_cannot_reference_class_type_parameters);
              return;
            }
          }
          break;
        case Syntax.ComputedPropertyName:
          grandparent = location.parent.parent;
          if (is.classLike(grandparent) || grandparent.kind === Syntax.InterfaceDeclaration) {
            if ((result = lookup(getSymbolOfNode(grandparent as ClassLikeDeclaration | InterfaceDeclaration).members!, name, meaning & qt.SymbolFlags.Type))) {
              error(errorLocation, qd.msgs.A_computed_property_name_cannot_reference_a_type_parameter_from_its_containing_type);
              return;
            }
          }
          break;
        case Syntax.ArrowFunction:
          if (true) break;
        case Syntax.MethodDeclaration:
        case Syntax.Constructor:
        case Syntax.GetAccessor:
        case Syntax.SetAccessor:
        case Syntax.FunctionDeclaration:
          if (meaning & qt.SymbolFlags.Variable && name === 'arguments') {
            result = argumentsSymbol;
            break loop;
          }
          break;
        case Syntax.FunctionExpression:
          if (meaning & qt.SymbolFlags.Variable && name === 'arguments') {
            result = argumentsSymbol;
            break loop;
          }
          if (meaning & qt.SymbolFlags.Function) {
            const functionName = (<FunctionExpression>location).name;
            if (functionName && name === functionName.escapedText) {
              result = location.symbol;
              break loop;
            }
          }
          break;
        case Syntax.Decorator:
          if (location.parent && location.parent.kind === Syntax.Parameter) location = location.parent;
          if (location.parent && (is.classElement(location.parent) || location.parent.kind === Syntax.ClassDeclaration)) location = location.parent;
          break;
        case Syntax.DocTypedefTag:
        case Syntax.DocCallbackTag:
        case Syntax.DocEnumTag:
          location = qc.getDoc.host(location);
          break;
        case Syntax.Parameter:
          if (
            lastLocation &&
            (lastLocation === (location as ParameterDeclaration).initer || (lastLocation === (location as ParameterDeclaration).name && is.kind(qc.BindingPattern, lastLocation)))
          ) {
            if (!associatedDeclarationForContainingIniterOrBindingName) associatedDeclarationForContainingIniterOrBindingName = location as ParameterDeclaration;
          }
          break;
        case Syntax.BindingElement:
          if (lastLocation && (lastLocation === (location as BindingElement).initer || (lastLocation === (location as BindingElement).name && is.kind(qc.BindingPattern, lastLocation)))) {
            const root = get.rootDeclaration(location);
            if (root.kind === Syntax.Parameter) {
              if (!associatedDeclarationForContainingIniterOrBindingName) associatedDeclarationForContainingIniterOrBindingName = location as BindingElement;
            }
          }
          break;
      }
      if (is.selfReferenceLocation(location)) lastSelfReferenceLocation = location;
      lastLocation = location;
      location = location.parent;
    }
    if (isUse && result && (!lastSelfReferenceLocation || result !== lastSelfReferenceLocation.symbol)) result.isReferenced! |= meaning;
    if (!result) {
      if (lastLocation) {
        assert(lastLocation.kind === Syntax.SourceFile);
        if ((lastLocation as SourceFile).commonJsModuleIndicator && name === 'exports' && meaning & lastLocation.symbol.flags) return lastLocation.symbol;
      }
      if (!excludeGlobals) result = lookup(globals, name, meaning);
    }
    if (!result) {
      if (originalLocation && is.inJSFile(originalLocation) && originalLocation.parent) {
        if (isRequireCall(originalLocation.parent, false)) return requireSymbol;
      }
    }
    if (!result) {
      if (nameNotFoundMessage) {
        if (
          !errorLocation ||
          (!check.andReportErrorForMissingPrefix(errorLocation, name, nameArg!) &&
            !check.andReportErrorForExtendingInterface(errorLocation) &&
            !check.andReportErrorForUsingTypeAsNamespace(errorLocation, name, meaning) &&
            !check.andReportErrorForExportingPrimitiveType(errorLocation, name) &&
            !check.andReportErrorForUsingTypeAsValue(errorLocation, name, meaning) &&
            !check.andReportErrorForUsingNamespaceModuleAsValue(errorLocation, name, meaning) &&
            !check.andReportErrorForUsingValueAsType(errorLocation, name, meaning))
        ) {
          let suggestion: Symbol | undefined;
          if (suggestedNameNotFoundMessage && suggestionCount < maximumSuggestionCount) {
            suggestion = getSuggestedSymbolForNonexistentSymbol(originalLocation, name, meaning);
            if (suggestion) {
              const suggestionName = suggestion.symbolToString();
              const diagnostic = error(errorLocation, suggestedNameNotFoundMessage, diagnosticName(nameArg!), suggestionName);
              if (suggestion.valueDeclaration) addRelatedInfo(diagnostic, createDiagnosticForNode(suggestion.valueDeclaration, qd.msgs._0_is_declared_here, suggestionName));
            }
          }
          if (!suggestion) error(errorLocation, nameNotFoundMessage, diagnosticName(nameArg!));
          suggestionCount++;
        }
      }
      return;
    }
    if (nameNotFoundMessage) {
      if (propertyWithInvalidIniter && !(compilerOptions.target === ScriptTarget.ESNext && compilerOptions.useDefineForClassFields)) {
        const propertyName = (<PropertyDeclaration>propertyWithInvalidIniter).name;
        error(errorLocation, qd.msgs.Initer_of_instance_member_variable_0_cannot_reference_identifier_1_declared_in_the_constructor, declarationNameToString(propertyName), diagnosticName(nameArg!));
        return;
      }
      if (errorLocation && (meaning & qt.SymbolFlags.BlockScopedVariable || ((meaning & qt.SymbolFlags.Class || meaning & qt.SymbolFlags.Enum) && (meaning & qt.SymbolFlags.Value) === qt.SymbolFlags.Value))) {
        const exportOrLocalSymbol = getExportSymbolOfValueSymbolIfExported(result);
        if (exportOrLocalSymbol.flags & qt.SymbolFlags.BlockScopedVariable || exportOrLocalSymbol.flags & qt.SymbolFlags.Class || exportOrLocalSymbol.flags & qt.SymbolFlags.Enum)
          check.resolvedBlockScopedVariable(exportOrLocalSymbol, errorLocation);
      }
      if (result && isInExternalModule && (meaning & qt.SymbolFlags.Value) === qt.SymbolFlags.Value && !(originalLocation!.flags & NodeFlags.Doc)) {
        const merged = getMergedSymbol(result);
        if (length(merged.declarations) && every(merged.declarations, (d) => is.kind(qc.NamespaceExportDeclaration, d) || (is.kind(qc.SourceFile, d) && !!d.symbol.globalExports))) {
          errorOrSuggestion(
            !compilerOptions.allowUmdGlobalAccess,
            errorLocation!,
            qd.msgs._0_refers_to_a_UMD_global_but_the_current_file_is_a_module_Consider_adding_an_import_instead,
            qy.get.unescUnderscores(name)
          );
        }
      }
      if (result && associatedDeclarationForContainingIniterOrBindingName && !withinDeferredContext && (meaning & qt.SymbolFlags.Value) === qt.SymbolFlags.Value) {
        const candidate = getMergedSymbol(getLateBoundSymbol(result));
        const root = get.rootDeclaration(associatedDeclarationForContainingIniterOrBindingName) as ParameterDeclaration;
        if (candidate === getSymbolOfNode(associatedDeclarationForContainingIniterOrBindingName))
          error(errorLocation, qd.msgs.Parameter_0_cannot_reference_itself, declarationNameToString(associatedDeclarationForContainingIniterOrBindingName.name));
        else if (
          candidate.valueDeclaration &&
          candidate.valueDeclaration.pos > associatedDeclarationForContainingIniterOrBindingName.pos &&
          root.parent.locals &&
          lookup(root.parent.locals, candidate.escName, meaning) === candidate
        ) {
          error(
            errorLocation,
            qd.msgs.Parameter_0_cannot_reference_identifier_1_declared_after_it,
            declarationNameToString(associatedDeclarationForContainingIniterOrBindingName.name),
            declarationNameToString(<Identifier>errorLocation)
          );
        }
      }
      if (result && errorLocation && meaning & qt.SymbolFlags.Value && result.flags & qt.SymbolFlags.Alias) check.symbolUsageInExpressionContext(result, name, errorLocation);
    }
    return result;
  }
  function diagnosticName(nameArg: qb.__String | qc.Identifier | qc.PrivateIdentifier) {
    return isString(nameArg) ? qy.get.unescUnderscores(nameArg as qb.__String) : declarationNameToString(nameArg as Identifier);
  }
  function isPrimitiveTypeName(name: qb.__String) {
    return name === 'any' || name === 'string' || name === 'number' || name === 'boolean' || name === 'never' || name === 'unknown';
  }
  function isES2015OrLaterConstructorName(n: qb.__String) {
    switch (n) {
      case 'Promise':
      case 'Symbol':
      case 'Map':
      case 'WeakMap':
      case 'Set':
      case 'WeakSet':
        return true;
    }
    return false;
  }
  function isSameScopeDescendentOf(initial: Node, parent: Node | undefined, stopAt: Node): boolean {
    return !!parent && !!qc.findAncestor(initial, (n) => (n === stopAt || is.functionLike(n) ? 'quit' : n === parent));
  }
  function isAliasSymbolDeclaration(node: Node): boolean {
    return (
      node.kind === Syntax.ImportEqualsDeclaration ||
      node.kind === Syntax.NamespaceExportDeclaration ||
      (node.kind === Syntax.ImportClause && !!(<ImportClause>node).name) ||
      node.kind === Syntax.NamespaceImport ||
      node.kind === Syntax.NamespaceExport ||
      node.kind === Syntax.ImportSpecifier ||
      node.kind === Syntax.ExportSpecifier ||
      (node.kind === Syntax.ExportAssignment && is.exportAssignmentAlias(<ExportAssignment>node)) ||
      (is.kind(qc.BinaryExpression, node) && getAssignmentDeclarationKind(node) === AssignmentDeclarationKind.ModuleExports && is.exportAssignmentAlias(node)) ||
      (is.kind(qc.PropertyAccessExpression, node) &&
        is.kind(qc.BinaryExpression, node.parent) &&
        node.parent.left === node &&
        node.parent.operatorToken.kind === Syntax.EqualsToken &&
        isAliasableOrJsExpression(node.parent.right)) ||
      node.kind === Syntax.ShorthandPropertyAssignment ||
      (node.kind === Syntax.PropertyAssignment && isAliasableOrJsExpression((node as PropertyAssignment).initer))
    );
  }
  function isAliasableOrJsExpression(e: Expression) {
    return is.aliasableExpression(e) || (is.kind(qc.FunctionExpression, e) && isJSConstructor(e));
  }
  function resolveExportByName(moduleSymbol: Symbol, name: qb.__String, sourceNode: TypeOnlyCompatibleAliasDeclaration | undefined, dontResolveAlias: boolean) {
    const exportValue = moduleSymbol.exports!.get(InternalSymbol.ExportEquals);
    if (exportValue) return getPropertyOfType(getTypeOfSymbol(exportValue), name);
    const exportSymbol = moduleSymbol.exports!.get(name);
    const resolved = exportSymbol.resolveSymbol(dontResolveAlias);
    markSymbolOfAliasDeclarationIfTypeOnly(sourceNode, exportSymbol, resolved, false);
    return resolved;
  }
  function isSyntacticDefault(node: Node) {
    return (is.kind(qc.ExportAssignment, node) && !node.isExportEquals) || has.syntacticModifier(node, ModifierFlags.Default) || is.kind(qc.ExportSpecifier, node);
  }
  function canHaveSyntheticDefault(file: SourceFile | undefined, moduleSymbol: Symbol, dontResolveAlias: boolean) {
    if (!allowSyntheticDefaultImports) return false;
    if (!file || file.isDeclarationFile) {
      const defaultExportSymbol = resolveExportByName(moduleSymbol, InternalSymbol.Default, undefined, true);
      if (defaultExportSymbol && some(defaultExportSymbol.declarations, isSyntacticDefault)) return false;
      if (resolveExportByName(moduleSymbol, qy.get.escUnderscores('__esModule'), undefined, dontResolveAlias)) return false;
      return true;
    }
    if (!isSourceFileJS(file)) return hasExportAssignmentSymbol(moduleSymbol);
    return !file.externalModuleIndicator && !resolveExportByName(moduleSymbol, qy.get.escUnderscores('__esModule'), undefined, dontResolveAlias);
  }
  function reportNonDefaultExport(moduleSymbol: Symbol, node: ImportClause) {
    if (moduleSymbol.exports?.has(node.symbol.escName))
      error(node.name, qd.msgs.Module_0_has_no_default_export_Did_you_mean_to_use_import_1_from_0_instead, moduleSymbol.symbolToString(), node.symbol.symbolToString());
    else {
      const diagnostic = error(node.name, qd.msgs.Module_0_has_no_default_export, moduleSymbol.symbolToString());
      const exportStar = moduleSymbol.exports?.get(InternalSymbol.ExportStar);
      if (exportStar) {
        const defaultExport = find(
          exportStar.declarations,
          (decl) => !!(is.kind(qc.ExportDeclaration, decl) && decl.moduleSpecifier && resolveExternalModuleName(decl, decl.moduleSpecifier)?.exports?.has(InternalSymbol.Default))
        );
        if (defaultExport) addRelatedInfo(diagnostic, createDiagnosticForNode(defaultExport, qd.msgs.export_Asterisk_does_not_re_export_a_default));
      }
    }
  }
  function combineValueAndTypeSymbols(valueSymbol: Symbol, typeSymbol: Symbol): Symbol {
    if (valueSymbol === unknownSymbol && typeSymbol === unknownSymbol) return unknownSymbol;
    if (valueSymbol.flags & (SymbolFlags.Type | qt.SymbolFlags.Namespace)) return valueSymbol;
    const result = new Symbol(valueSymbol.flags | typeSymbol.flags, valueSymbol.escName);
    result.declarations = deduplicate(concatenate(valueSymbol.declarations, typeSymbol.declarations), equateValues);
    result.parent = valueSymbol.parent || typeSymbol.parent;
    if (valueSymbol.valueDeclaration) result.valueDeclaration = valueSymbol.valueDeclaration;
    if (typeSymbol.members) result.members = cloneMap(typeSymbol.members);
    if (valueSymbol.exports) result.exports = cloneMap(valueSymbol.exports);
    return result;
  }
  function reportNonExportedMember(node: ImportDeclaration | ExportDeclaration, name: Identifier, declarationName: string, moduleSymbol: Symbol, moduleName: string): void {
    const localSymbol = moduleSymbol.valueDeclaration.locals?.get(name.escapedText);
    const exports = moduleSymbol.exports;
    if (localSymbol) {
      const exportedEqualsSymbol = exports?.get(InternalSymbol.ExportEquals);
      if (exportedEqualsSymbol) {
        getSymbolIfSameReference(exportedEqualsSymbol, localSymbol)
          ? reportInvalidImportEqualsExportMember(node, name, declarationName, moduleName)
          : error(name, qd.msgs.Module_0_has_no_exported_member_1, moduleName, declarationName);
      } else {
        const exportedSymbol = exports ? find(symbolsToArray(exports), (symbol) => !!getSymbolIfSameReference(symbol, localSymbol)) : undefined;
        const diagnostic = exportedSymbol
          ? error(name, qd.msgs.Module_0_declares_1_locally_but_it_is_exported_as_2, moduleName, declarationName, exportedSymbol.symbolToString())
          : error(name, qd.msgs.Module_0_declares_1_locally_but_it_is_not_exported, moduleName, declarationName);
        addRelatedInfo(diagnostic, ...map(localSymbol.declarations, (decl, index) => createDiagnosticForNode(decl, index === 0 ? qd.msgs._0_is_declared_here : qd.msgs.and_here, declarationName)));
      }
    } else {
      error(name, qd.msgs.Module_0_has_no_exported_member_1, moduleName, declarationName);
    }
  }
  function reportInvalidImportEqualsExportMember(node: ImportDeclaration | ExportDeclaration, name: Identifier, declarationName: string, moduleName: string) {
    if (moduleKind >= ModuleKind.ES2015) {
      const message = compilerOptions.esModuleInterop
        ? qd.msgs._0_can_only_be_imported_by_using_a_default_import
        : qd.msgs._0_can_only_be_imported_by_turning_on_the_esModuleInterop_flag_and_using_a_default_import;
      error(name, message, declarationName);
    } else {
      if (is.inJSFile(node)) {
        const message = compilerOptions.esModuleInterop
          ? qd.msgs._0_can_only_be_imported_by_using_a_require_call_or_by_using_a_default_import
          : qd.msgs._0_can_only_be_imported_by_using_a_require_call_or_by_turning_on_the_esModuleInterop_flag_and_using_a_default_import;
        error(name, message, declarationName);
      } else {
        const message = compilerOptions.esModuleInterop
          ? qd.msgs._0_can_only_be_imported_by_using_import_1_require_2_or_a_default_import
          : qd.msgs._0_can_only_be_imported_by_using_import_1_require_2_or_by_turning_on_the_esModuleInterop_flag_and_using_a_default_import;
        error(name, message, declarationName, declarationName, moduleName);
      }
    }
  }
  function markSymbolOfAliasDeclarationIfTypeOnly(aliasDeclaration: Declaration | undefined, immediateTarget: Symbol | undefined, finalTarget: Symbol | undefined, overwriteEmpty: boolean): boolean {
    if (!aliasDeclaration) return false;
    const sourceSymbol = getSymbolOfNode(aliasDeclaration);
    if (is.typeOnlyImportOrExportDeclaration(aliasDeclaration)) {
      const ls = sourceSymbol.getLinks();
      ls.typeOnlyDeclaration = aliasDeclaration;
      return true;
    }
    const ls = sourceSymbol.getLinks();
    return markSymbolOfAliasDeclarationIfTypeOnlyWorker(ls, immediateTarget, overwriteEmpty) || markSymbolOfAliasDeclarationIfTypeOnlyWorker(ls, finalTarget, overwriteEmpty);
  }
  function markSymbolOfAliasDeclarationIfTypeOnlyWorker(aliasDeclarationLinks: SymbolLinks, target: Symbol | undefined, overwriteEmpty: boolean): boolean {
    if (target && (aliasDeclarationLinks.typeOnlyDeclaration === undefined || (overwriteEmpty && aliasDeclarationLinks.typeOnlyDeclaration === false))) {
      const exportSymbol = target.exports?.get(InternalSymbol.ExportEquals) ?? target;
      const typeOnly = exportSymbol.declarations && find(exportSymbol.declarations, isTypeOnlyImportOrExportDeclaration);
      aliasDeclarationLinks.typeOnlyDeclaration = typeOnly ?? s.getLinks(exportSymbol).typeOnlyDeclaration ?? false;
    }
    return !!aliasDeclarationLinks.typeOnlyDeclaration;
  }
  function markExportAsReferenced(node: ImportEqualsDeclaration | ExportSpecifier) {
    const symbol = getSymbolOfNode(node);
    const target = this.resolveAlias();
    if (target) {
      const markAlias = target === unknownSymbol || (target.flags & qt.SymbolFlags.Value && !isConstEnumOrConstEnumOnlyModule(target) && !this.getTypeOnlyAliasDeclaration());
      if (markAlias) symbol.markAliasSymbolAsReferenced();
    }
  }
  function resolveEntityName(name: EntityNameOrEntityNameExpression, meaning: qt.SymbolFlags, ignoreErrors?: boolean, dontResolveAlias?: boolean, location?: Node): Symbol | undefined {
    if (is.missing(name)) return;
    const namespaceMeaning = qt.SymbolFlags.Namespace | (is.inJSFile(name) ? meaning & qt.SymbolFlags.Value : 0);
    let symbol: Symbol | undefined;
    if (name.kind === Syntax.Identifier) {
      const message = meaning === namespaceMeaning || isSynthesized(name) ? qd.msgs.Cannot_find_namespace_0 : getCannotFindNameDiagnosticForName(getFirstIdentifier(name));
      const symbolFromJSPrototype = is.inJSFile(name) && !isSynthesized(name) ? resolveEntityNameFromAssignmentDeclaration(name, meaning) : undefined;
      symbol = getMergedSymbol(resolveName(location || name, name.escapedText, meaning, ignoreErrors || symbolFromJSPrototype ? undefined : message, name, true));
      if (!symbol) return getMergedSymbol(symbolFromJSPrototype);
    } else if (name.kind === Syntax.QualifiedName || name.kind === Syntax.PropertyAccessExpression) {
      const left = name.kind === Syntax.QualifiedName ? name.left : name.expression;
      const right = name.kind === Syntax.QualifiedName ? name.right : name.name;
      let namespace = resolveEntityName(left, namespaceMeaning, ignoreErrors, false, location);
      if (!namespace || is.missing(right)) return;
      else if (namespace === unknownSymbol) return namespace;
      if (is.inJSFile(name)) {
        if (
          namespace.valueDeclaration &&
          is.kind(qc.VariableDeclaration, namespace.valueDeclaration) &&
          namespace.valueDeclaration.initer &&
          isCommonJsRequire(namespace.valueDeclaration.initer)
        ) {
          const moduleName = (namespace.valueDeclaration.initer as CallExpression).arguments[0] as StringLiteral;
          const moduleSym = resolveExternalModuleName(moduleName, moduleName);
          if (moduleSym) {
            const resolvedModuleSymbol = resolveExternalModuleSymbol(moduleSym);
            if (resolvedModuleSymbol) namespace = resolvedModuleSymbol;
          }
        }
      }
      symbol = getMergedSymbol(getSymbol(namespace.getExportsOfSymbol(), right.escapedText, meaning));
      if (!symbol) {
        if (!ignoreErrors) error(right, qd.msgs.Namespace_0_has_no_exported_member_1, getFullyQualifiedName(namespace), declarationNameToString(right));
        return;
      }
    } else throw Debug.assertNever(name, 'Unknown entity name kind.');
    assert((this.getCheckFlags() & qt.CheckFlags.Instantiated) === 0, 'Should never get an instantiated symbol here.');
    if (!isSynthesized(name) && is.entityName(name) && (symbol.flags & qt.SymbolFlags.Alias || name.parent.kind === Syntax.ExportAssignment))
      markSymbolOfAliasDeclarationIfTypeOnly(getAliasDeclarationFromName(name), symbol, undefined, true);
    return symbol.flags & meaning || dontResolveAlias ? symbol : symbol.resolveAlias();
  }
  function resolveEntityNameFromAssignmentDeclaration(name: Identifier, meaning: qt.SymbolFlags) {
    if (isDocTypeReference(name.parent)) {
      const secondaryLocation = getAssignmentDeclarationLocation(name.parent);
      if (secondaryLocation) return resolveName(secondaryLocation, name.escapedText, meaning, undefined, name, true);
    }
  }
  function resolveExternalModuleName(location: Node, moduleReferenceExpression: Expression, ignoreErrors?: boolean): Symbol | undefined {
    return resolveExternalModuleNameWorker(location, moduleReferenceExpression, ignoreErrors ? undefined : qd.msgs.Cannot_find_module_0_or_its_corresponding_type_declarations);
  }
  function resolveExternalModuleNameWorker(location: Node, moduleReferenceExpression: Expression, moduleNotFoundError: qd.Message | undefined, isForAugmentation = false): Symbol | undefined {
    return StringLiteral.like(moduleReferenceExpression)
      ? resolveExternalModule(location, moduleReferenceExpression.text, moduleNotFoundError, moduleReferenceExpression, isForAugmentation)
      : undefined;
  }
  function resolveExternalModule(location: Node, moduleReference: string, moduleNotFoundError: qd.Message | undefined, errorNode: Node, isForAugmentation = false): Symbol | undefined {
    if (startsWith(moduleReference, '@types/')) {
      const diag = qd.msgs.Cannot_import_type_declaration_files_Consider_importing_0_instead_of_1;
      const withoutAtTypePrefix = removePrefix(moduleReference, '@types/');
      error(errorNode, diag, withoutAtTypePrefix, moduleReference);
    }
    const ambientModule = tryFindAmbientModule(moduleReference, true);
    if (ambientModule) return ambientModule;
    const currentSourceFile = get.sourceFileOf(location);
    const resolvedModule = getResolvedModule(currentSourceFile, moduleReference)!;
    const resolutionDiagnostic = resolvedModule && getResolutionDiagnostic(compilerOptions, resolvedModule);
    const sourceFile = resolvedModule && !resolutionDiagnostic && host.getSourceFile(resolvedModule.resolvedFileName);
    if (sourceFile) {
      if (sourceFile.symbol) {
        if (resolvedModule.isExternalLibraryImport && !resolutionExtensionIsTSOrJson(resolvedModule.extension)) errorOnImplicitAnyModule(false, errorNode, resolvedModule, moduleReference);
        return getMergedSymbol(sourceFile.symbol);
      }
      if (moduleNotFoundError) error(errorNode, qd.msgs.File_0_is_not_a_module, sourceFile.fileName);
      return;
    }
    if (patternAmbientModules) {
      const pattern = findBestPatternMatch(patternAmbientModules, (_) => _.pattern, moduleReference);
      if (pattern) {
        const augmentation = patternAmbientModuleAugmentations && patternAmbientModuleAugmentations.get(moduleReference);
        if (augmentation) return getMergedSymbol(augmentation);
        return getMergedSymbol(pattern.symbol);
      }
    }
    if (
      (resolvedModule && !resolutionExtensionIsTSOrJson(resolvedModule.extension) && resolutionDiagnostic === undefined) ||
      resolutionDiagnostic === qd.msgs.Could_not_find_a_declaration_file_for_module_0_1_implicitly_has_an_any_type
    ) {
      if (isForAugmentation) {
        const diag = qd.msgs.Invalid_module_name_in_augmentation_Module_0_resolves_to_an_untyped_module_at_1_which_cannot_be_augmented;
        error(errorNode, diag, moduleReference, resolvedModule.resolvedFileName);
      } else {
        errorOnImplicitAnyModule(noImplicitAny && !!moduleNotFoundError, errorNode, resolvedModule, moduleReference);
      }
      return;
    }
    if (moduleNotFoundError) {
      if (resolvedModule) {
        const redirect = host.getProjectReferenceRedirect(resolvedModule.resolvedFileName);
        if (redirect) {
          error(errorNode, qd.msgs.Output_file_0_has_not_been_built_from_source_file_1, redirect, resolvedModule.resolvedFileName);
          return;
        }
      }
      if (resolutionDiagnostic) error(errorNode, resolutionDiagnostic, moduleReference, resolvedModule.resolvedFileName);
      else {
        const tsExtension = tryExtractTSExtension(moduleReference);
        if (tsExtension) {
          const diag = qd.msgs.An_import_path_cannot_end_with_a_0_extension_Consider_importing_1_instead;
          error(errorNode, diag, tsExtension, removeExtension(moduleReference, tsExtension));
        } else if (
          !compilerOptions.resolveJsonModule &&
          fileExtensionIs(moduleReference, Extension.Json) &&
          getEmitModuleResolutionKind(compilerOptions) === ModuleResolutionKind.NodeJs &&
          hasJsonModuleEmitEnabled(compilerOptions)
        ) {
          error(errorNode, qd.msgs.Cannot_find_module_0_Consider_using_resolveJsonModule_to_import_module_with_json_extension, moduleReference);
        } else {
          error(errorNode, moduleNotFoundError, moduleReference);
        }
      }
    }
    return;
  }
  function errorOnImplicitAnyModule(isError: boolean, errorNode: Node, { packageId, resolvedFileName }: ResolvedModuleFull, moduleReference: string): void {
    const errorInfo =
      !isExternalModuleNameRelative(moduleReference) && packageId
        ? typesPackageExists(packageId.name)
          ? chainqd.Messages(
              undefined,
              qd.msgs.If_the_0_package_actually_exposes_this_module_consider_sending_a_pull_request_to_amend_https_Colon_Slash_Slashgithub_com_SlashDefinitelyTyped_SlashDefinitelyTyped_Slashtree_Slashmaster_Slashtypes_Slash_1,
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
  function resolveExternalModuleSymbol(moduleSymbol: Symbol, dontResolveAlias?: boolean): Symbol;
  function resolveExternalModuleSymbol(moduleSymbol: Symbol | undefined, dontResolveAlias?: boolean): Symbol | undefined;
  function resolveExternalModuleSymbol(moduleSymbol: Symbol, dontResolveAlias?: boolean): Symbol {
    if (moduleSymbol?.exports) {
      const exportEquals = moduleSymbol.exports.get(InternalSymbol.ExportEquals)?.resolveSymbol(dontResolveAlias);
      const exported = getCommonJsExportEquals(getMergedSymbol(exportEquals), getMergedSymbol(moduleSymbol));
      return getMergedSymbol(exported) || moduleSymbol;
    }
    return undefined!;
  }
  function resolveESModuleSymbol(moduleSymbol: Symbol | undefined, referencingLocation: Node, dontResolveAlias: boolean, suppressInteropError: boolean): Symbol | undefined {
    const symbol = resolveExternalModuleSymbol(moduleSymbol, dontResolveAlias);
    if (!dontResolveAlias && symbol) {
      if (!suppressInteropError && !(symbol.flags & (SymbolFlags.Module | qt.SymbolFlags.Variable)) && !getDeclarationOfKind(symbol, Syntax.SourceFile)) {
        const compilerOptionName = moduleKind >= ModuleKind.ES2015 ? 'allowSyntheticDefaultImports' : 'esModuleInterop';
        error(referencingLocation, qd.msgs.This_module_can_only_be_referenced_with_ECMAScript_imports_Slashexports_by_turning_on_the_0_flag_and_referencing_its_default_export, compilerOptionName);
        return symbol;
      }
      if (compilerOptions.esModuleInterop) {
        const referenceParent = referencingLocation.parent;
        if ((is.kind(qc.ImportDeclaration, referenceParent) && getNamespaceDeclarationNode(referenceParent)) || is.importCall(referenceParent)) {
          const type = this.getTypeOfSymbol();
          let sigs = getSignaturesOfStructuredType(type, SignatureKind.Call);
          if (!sigs || !sigs.length) sigs = getSignaturesOfStructuredType(type, SignatureKind.Construct);
          if (sigs && sigs.length) {
            const moduleType = getTypeWithSyntheticDefaultImportType(type, symbol, moduleSymbol!);
            const result = new Symbol(symbol.flags, symbol.escName);
            result.declarations = symbol.declarations ? symbol.declarations.slice() : [];
            result.parent = symbol.parent;
            result.target = symbol;
            result.originatingImport = referenceParent;
            if (symbol.valueDeclaration) result.valueDeclaration = symbol.valueDeclaration;
            if (symbol.constEnumOnlyModule) result.constEnumOnlyModule = true;
            if (symbol.members) result.members = cloneMap(symbol.members);
            if (symbol.exports) result.exports = cloneMap(symbol.exports);
            const resolvedModuleType = resolveStructuredTypeMembers(moduleType as StructuredType);
            result.type = createAnonymousType(result, resolvedModuleType.members, empty, empty, resolvedModuleType.stringIndexInfo, resolvedModuleType.numberIndexInfo);
            return result;
          }
        }
      }
    }
    return symbol;
  }
  function hasExportAssignmentSymbol(moduleSymbol: Symbol): boolean {
    return moduleSymbol.exports!.get(InternalSymbol.ExportEquals) !== undefined;
  }
  function tryGetMemberInModuleExports(memberName: qb.__String, moduleSymbol: Symbol): Symbol | undefined {
    const symbolTable = getExportsOfModule(moduleSymbol);
    if (symbolTable) return symbolTable.get(memberName);
  }
  function tryGetMemberInModuleExportsAndProperties(memberName: qb.__String, moduleSymbol: Symbol): Symbol | undefined {
    const symbol = tryGetMemberInModuleExports(memberName, moduleSymbol);
    if (symbol) return symbol;
    const exportEquals = resolveExternalModuleSymbol(moduleSymbol);
    if (exportEquals === moduleSymbol) return;
    const type = getTypeOfSymbol(exportEquals);
    return type.flags & qt.TypeFlags.Primitive || getObjectFlags(type) & ObjectFlags.Class || isArrayOrTupleLikeType(type) ? undefined : getPropertyOfType(type, memberName);
  }
  interface ExportCollisionTracker {
    specifierText: string;
    exportsWithDuplicate: ExportDeclaration[];
  }
  type ExportCollisionTrackerTable = EscapedMap<ExportCollisionTracker>;
  function extendExportSymbols(target: SymbolTable, source: SymbolTable | undefined, lookupTable?: ExportCollisionTrackerTable, exportNode?: ExportDeclaration) {
    if (!source) return;
    source.forEach((sourceSymbol, id) => {
      if (id === InternalSymbol.Default) return;
      const targetSymbol = target.get(id);
      if (!targetSymbol) {
        target.set(id, sourceSymbol);
        if (lookupTable && exportNode) {
          lookupTable.set(id, {
            specifierText: get.textOf(exportNode.moduleSpecifier!),
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
  function findConstructorDeclaration(node: ClassLikeDeclaration): ConstructorDeclaration | undefined {
    const members = node.members;
    for (const member of members) {
      if (member.kind === Syntax.Constructor && is.present((<ConstructorDeclaration>member).body)) return <ConstructorDeclaration>member;
    }
  }
  function createIntrinsicType(kind: qt.TypeFlags, intrinsicName: string, objectFlags: ObjectFlags = 0): IntrinsicType {
    const type = <IntrinsicType>createType(kind);
    type.intrinsicName = intrinsicName;
    type.objectFlags = objectFlags;
    return type;
  }
  function createBooleanType(trueFalseTypes: readonly Type[]): IntrinsicType & UnionType {
    const type = <IntrinsicType & UnionType>getUnionType(trueFalseTypes);
    type.flags |= qt.TypeFlags.Boolean;
    type.intrinsicName = 'boolean';
    return type;
  }
  function createObjectType(objectFlags: ObjectFlags, symbol?: Symbol): ObjectType {
    const type = <ObjectType>createType(TypeFlags.Object);
    type.objectFlags = objectFlags;
    type.symbol = symbol!;
    type.members = undefined;
    type.properties = undefined;
    type.callSignatures = undefined;
    type.constructSignatures = undefined;
    type.stringIndexInfo = undefined;
    type.numberIndexInfo = undefined;
    return type;
  }
  function createTypeofType() {
    return getUnionType(arrayFrom(typeofEQFacts.keys(), getLiteralType));
  }
  function createTypeParameter(symbol?: Symbol) {
    const type = <TypeParameter>createType(TypeFlags.TypeParameter);
    if (symbol) type.symbol = symbol;
    return type;
  }
  function setStructuredTypeMembers(
    type: StructuredType,
    members: SymbolTable,
    callSignatures: readonly Signature[],
    constructSignatures: readonly Signature[],
    stringIndexInfo: IndexInfo | undefined,
    numberIndexInfo: IndexInfo | undefined
  ): ResolvedType {
    (<ResolvedType>type).members = members;
    (<ResolvedType>type).properties = members === emptySymbols ? empty : getNamedMembers(members);
    (<ResolvedType>type).callSignatures = callSignatures;
    (<ResolvedType>type).constructSignatures = constructSignatures;
    (<ResolvedType>type).stringIndexInfo = stringIndexInfo;
    (<ResolvedType>type).numberIndexInfo = numberIndexInfo;
    return <ResolvedType>type;
  }
  function createAnonymousType(
    symbol: Symbol | undefined,
    members: SymbolTable,
    callSignatures: readonly Signature[],
    constructSignatures: readonly Signature[],
    stringIndexInfo: IndexInfo | undefined,
    numberIndexInfo: IndexInfo | undefined
  ): ResolvedType {
    return setStructuredTypeMembers(createObjectType(ObjectFlags.Anonymous, symbol), members, callSignatures, constructSignatures, stringIndexInfo, numberIndexInfo);
  }
  function forEachSymbolTableInScope<T>(enclosingDeclaration: Node | undefined, callback: (symbolTable: SymbolTable) => T): T {
    let result: T;
    for (let location = enclosingDeclaration; location; location = location.parent) {
      if (location.locals && !isGlobalSourceFile(location)) if ((result = callback(location.locals))) return result;
      switch (location.kind) {
        case Syntax.SourceFile:
          if (!is.externalOrCommonJsModule(<SourceFile>location)) break;
        case Syntax.ModuleDeclaration:
          const sym = getSymbolOfNode(location as ModuleDeclaration);
          if ((result = callback(sym?.exports || emptySymbols))) return result;
          break;
        case Syntax.ClassDeclaration:
        case Syntax.ClassExpression:
        case Syntax.InterfaceDeclaration:
          let table: EscapedMap<Symbol> | undefined;
          (getSymbolOfNode(location as ClassLikeDeclaration | InterfaceDeclaration).members || emptySymbols).forEach((memberSymbol, key) => {
            if (memberSymbol.flags & (SymbolFlags.Type & ~SymbolFlags.Assignment)) (table || (table = new SymbolTable())).set(key, memberSymbol);
          });
          if (table && (result = callback(table))) return result;
          break;
      }
    }
    return callback(globals);
  }
  function isAnySymbolAccessible(
    symbols: Symbol[] | undefined,
    enclosingDeclaration: Node | undefined,
    initialSymbol: Symbol,
    meaning: qt.SymbolFlags,
    shouldComputeAliasesToMakeVisible: boolean
  ): SymbolAccessibilityResult | undefined {
    if (!length(symbols)) return;
    let hadAccessibleChain: Symbol | undefined;
    let earlyModuleBail = false;
    for (const symbol of symbols!) {
      const accessibleSymbolChain = getAccessibleSymbolChain(symbol, enclosingDeclaration, meaning, false);
      if (accessibleSymbolChain) {
        hadAccessibleChain = symbol;
        const hasAccessibleDeclarations = hasVisibleDeclarations(accessibleSymbolChain[0], shouldComputeAliasesToMakeVisible);
        if (hasAccessibleDeclarations) return hasAccessibleDeclarations;
      } else {
        if (some(symbol.declarations, hasNonGlobalAugmentationExternalModuleSymbol)) {
          if (shouldComputeAliasesToMakeVisible) {
            earlyModuleBail = true;
            continue;
          }
          return {
            accessibility: SymbolAccessibility.Accessible,
          };
        }
      }
      let containers = getContainersOfSymbol(symbol, enclosingDeclaration);
      const firstDecl: Node | false = !!length(symbol.declarations) && first(symbol.declarations);
      if (!length(containers) && meaning & qt.SymbolFlags.Value && firstDecl && is.kind(qc.ObjectLiteralExpression, firstDecl)) {
        if (firstDecl.parent && is.kind(qc.VariableDeclaration, firstDecl.parent) && firstDecl === firstDecl.parent.initer) containers = [getSymbolOfNode(firstDecl.parent)];
      }
      const parentResult = isAnySymbolAccessible(
        containers,
        enclosingDeclaration,
        initialSymbol,
        initialSymbol === symbol ? getQualifiedLeftMeaning(meaning) : meaning,
        shouldComputeAliasesToMakeVisible
      );
      if (parentResult) return parentResult;
    }
    if (earlyModuleBail) {
      return {
        accessibility: SymbolAccessibility.Accessible,
      };
    }
    if (hadAccessibleChain) {
      return {
        accessibility: SymbolAccessibility.NotAccessible,
        errorSymbolName: initialSymbol.symbolToString(enclosingDeclaration, meaning),
        errorModuleName: hadAccessibleChain !== initialSymbol ? hadAccessibleChain.symbolToString(enclosingDeclaration, qt.SymbolFlags.Namespace) : undefined,
      };
    }
  }
  function isSymbolAccessible(symbol: Symbol | undefined, enclosingDeclaration: Node | undefined, meaning: qt.SymbolFlags, shouldComputeAliasesToMakeVisible: boolean): SymbolAccessibilityResult {
    if (symbol && enclosingDeclaration) {
      const result = isAnySymbolAccessible([symbol], enclosingDeclaration, symbol, meaning, shouldComputeAliasesToMakeVisible);
      if (result) return result;
      const symbolExternalModule = forEach(symbol.declarations, getExternalModuleContainer);
      if (symbolExternalModule) {
        const enclosingExternalModule = getExternalModuleContainer(enclosingDeclaration);
        if (symbolExternalModule !== enclosingExternalModule) {
          return {
            accessibility: SymbolAccessibility.CannotBeNamed,
            errorSymbolName: symbol.symbolToString(enclosingDeclaration, meaning),
            errorModuleName: symbolExternalModule.symbolToString(),
          };
        }
      }
      return {
        accessibility: SymbolAccessibility.NotAccessible,
        errorSymbolName: symbol.symbolToString(enclosingDeclaration, meaning),
      };
    }
    return { accessibility: SymbolAccessibility.Accessible };
  }
  function hasExternalModuleSymbol(declaration: Node) {
    return is.ambientModule(declaration) || (declaration.kind === Syntax.SourceFile && is.externalOrCommonJsModule(<SourceFile>declaration));
  }
  function hasNonGlobalAugmentationExternalModuleSymbol(declaration: Node) {
    return is.moduleWithStringLiteralName(declaration) || (declaration.kind === Syntax.SourceFile && is.externalOrCommonJsModule(<SourceFile>declaration));
  }
  function isEntityNameVisible(entityName: EntityNameOrEntityNameExpression, enclosingDeclaration: Node): SymbolVisibilityResult {
    let meaning: qt.SymbolFlags;
    if (entityName.parent.kind === Syntax.TypeQuery || is.expressionWithTypeArgumentsInClassExtendsClause(entityName.parent) || entityName.parent.kind === Syntax.ComputedPropertyName)
      meaning = qt.SymbolFlags.Value | qt.SymbolFlags.ExportValue;
    else if (entityName.kind === Syntax.QualifiedName || entityName.kind === Syntax.PropertyAccessExpression || entityName.parent.kind === Syntax.ImportEqualsDeclaration) {
      meaning = qt.SymbolFlags.Namespace;
    } else {
      meaning = qt.SymbolFlags.Type;
    }
    const firstIdentifier = getFirstIdentifier(entityName);
    const symbol = resolveName(enclosingDeclaration, firstIdentifier.escapedText, meaning, undefined, undefined, false);
    return (
      (symbol && hasVisibleDeclarations(symbol, true)) || {
        accessibility: SymbolAccessibility.NotAccessible,
        errorSymbolName: get.textOf(firstIdentifier),
        errorNode: firstIdentifier,
      }
    );
  }
  function signatureToString(signature: Signature, enclosingDeclaration?: Node, flags = TypeFormatFlags.None, kind?: SignatureKind, writer?: EmitTextWriter): string {
    return writer ? signatureToStringWorker(writer).getText() : usingSingleLineStringWriter(signatureToStringWorker);
    function signatureToStringWorker(writer: EmitTextWriter) {
      let sigOutput: Syntax;
      if (flags & TypeFormatFlags.WriteArrowStyleSignature) sigOutput = kind === SignatureKind.Construct ? Syntax.ConstructorType : Syntax.FunctionType;
      else {
        sigOutput = kind === SignatureKind.Construct ? Syntax.ConstructSignature : Syntax.CallSignature;
      }
      const sig = nodeBuilder.signatureToSignatureDeclaration(
        signature,
        sigOutput,
        enclosingDeclaration,
        toNodeBuilderFlags(flags) | NodeBuilderFlags.IgnoreErrors | NodeBuilderFlags.WriteTypeParametersInQualifiedName
      );
      const printer = createPrinter({ removeComments: true, omitTrailingSemicolon: true });
      const sourceFile = enclosingDeclaration && get.sourceFileOf(enclosingDeclaration);
      printer.writeNode(EmitHint.Unspecified, sig!, sourceFile, getTrailingSemicolonDeferringWriter(writer));
      return writer;
    }
  }
  function typeToString(
    type: Type,
    enclosingDeclaration?: Node,
    flags: TypeFormatFlags = TypeFormatFlags.AllowUniqueESSymbolType | TypeFormatFlags.UseAliasDefinedOutsideCurrentScope,
    writer: EmitTextWriter = createTextWriter('')
  ): string {
    const noTruncation = compilerOptions.noErrorTruncation || flags & TypeFormatFlags.NoTruncation;
    const typeNode = nodeBuilder.typeToTypeNode(type, enclosingDeclaration, toNodeBuilderFlags(flags) | NodeBuilderFlags.IgnoreErrors | (noTruncation ? NodeBuilderFlags.NoTruncation : 0), writer);
    if (typeNode === undefined) return qb.fail('should always get typenode');
    const options = { removeComments: true };
    const printer = createPrinter(options);
    const sourceFile = enclosingDeclaration && get.sourceFileOf(enclosingDeclaration);
    printer.writeNode(EmitHint.Unspecified, typeNode, sourceFile, writer);
    const result = writer.getText();
    const maxLength = noTruncation ? noTruncationMaximumTruncationLength * 2 : defaultMaximumTruncationLength * 2;
    if (maxLength && result && result.length >= maxLength) return result.substr(0, maxLength - '...'.length) + '...';
    return result;
  }
  function toNodeBuilderFlags(flags = TypeFormatFlags.None): NodeBuilderFlags {
    return flags & TypeFormatFlags.NodeBuilderFlagsMask;
  }
  function typePredicateToString(
    typePredicate: TypePredicate,
    enclosingDeclaration?: Node,
    flags: TypeFormatFlags = TypeFormatFlags.UseAliasDefinedOutsideCurrentScope,
    writer?: EmitTextWriter
  ): string {
    return writer ? typePredicateToStringWorker(writer).getText() : usingSingleLineStringWriter(typePredicateToStringWorker);
    function typePredicateToStringWorker(writer: EmitTextWriter) {
      const predicate = new qc.TypePredicateNode(
        typePredicate.kind === TypePredicateKind.AssertsThis || typePredicate.kind === TypePredicateKind.AssertsIdentifier ? new Token(Syntax.AssertsKeyword) : undefined,
        typePredicate.kind === TypePredicateKind.Identifier || typePredicate.kind === TypePredicateKind.AssertsIdentifier ? new Identifier(typePredicate.parameterName) : ThisTypeNode.create(),
        typePredicate.type &&
          nodeBuilder.typeToTypeNode(typePredicate.type, enclosingDeclaration, toNodeBuilderFlags(flags) | NodeBuilderFlags.IgnoreErrors | NodeBuilderFlags.WriteTypeParametersInQualifiedName)!
      );
      const printer = createPrinter({ removeComments: true });
      const sourceFile = enclosingDeclaration && get.sourceFileOf(enclosingDeclaration);
      printer.writeNode(EmitHint.Unspecified, predicate, sourceFile, writer);
      return writer;
    }
  }
  function formatUnionTypes(types: readonly Type[]): Type[] {
    const result: Type[] = [];
    let flags: qt.TypeFlags = 0;
    for (let i = 0; i < types.length; i++) {
      const t = types[i];
      flags |= t.flags;
      if (!(t.flags & qt.TypeFlags.Nullable)) {
        if (t.flags & (TypeFlags.BooleanLiteral | qt.TypeFlags.EnumLiteral)) {
          const baseType = t.flags & qt.TypeFlags.BooleanLiteral ? booleanType : getBaseTypeOfEnumLiteralType(<LiteralType>t);
          if (baseType.flags & qt.TypeFlags.Union) {
            const count = (<UnionType>baseType).types.length;
            if (i + count <= types.length && getRegularTypeOfLiteralType(types[i + count - 1]) === getRegularTypeOfLiteralType((<UnionType>baseType).types[count - 1])) {
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
  function isTopLevelInExternalModuleAugmentation(node: Node): boolean {
    return node && node.parent && node.parent.kind === Syntax.ModuleBlock && is.externalModuleAugmentation(node.parent.parent);
  }
  function isDefaultBindingContext(location: Node) {
    return location.kind === Syntax.SourceFile || is.ambientModule(location);
  }
  function isDeclarationVisible(node: Node): boolean {
    if (node) {
      const ls = getNodeLinks(node);
      if (ls.isVisible === undefined) ls.isVisible = !!determineIfDeclarationIsVisible();
      return ls.isVisible;
    }
    return false;
    function determineIfDeclarationIsVisible() {
      switch (node.kind) {
        case Syntax.DocCallbackTag:
        case Syntax.DocTypedefTag:
        case Syntax.DocEnumTag:
          return !!(node.parent && node.parent.parent && node.parent.parent.parent && is.kind(qc.SourceFile, node.parent.parent.parent));
        case Syntax.BindingElement:
          return isDeclarationVisible(node.parent.parent);
        case Syntax.VariableDeclaration:
          if (is.kind(qc.BindingPattern, (node as VariableDeclaration).name) && !((node as VariableDeclaration).name as BindingPattern).elements.length) return false;
        case Syntax.ModuleDeclaration:
        case Syntax.ClassDeclaration:
        case Syntax.InterfaceDeclaration:
        case Syntax.TypeAliasDeclaration:
        case Syntax.FunctionDeclaration:
        case Syntax.EnumDeclaration:
        case Syntax.ImportEqualsDeclaration:
          if (is.externalModuleAugmentation(node)) return true;
          const parent = getDeclarationContainer(node);
          if (
            !(get.combinedModifierFlags(node as Declaration) & ModifierFlags.Export) &&
            !(node.kind !== Syntax.ImportEqualsDeclaration && parent.kind !== Syntax.SourceFile && parent.flags & NodeFlags.Ambient)
          ) {
            return isGlobalSourceFile(parent);
          }
          return isDeclarationVisible(parent);
        case Syntax.PropertyDeclaration:
        case Syntax.PropertySignature:
        case Syntax.GetAccessor:
        case Syntax.SetAccessor:
        case Syntax.MethodDeclaration:
        case Syntax.MethodSignature:
          if (has.effectiveModifier(node, ModifierFlags.Private | ModifierFlags.Protected)) return false;
        case Syntax.Constructor:
        case Syntax.ConstructSignature:
        case Syntax.CallSignature:
        case Syntax.IndexSignature:
        case Syntax.Parameter:
        case Syntax.ModuleBlock:
        case Syntax.FunctionType:
        case Syntax.ConstructorType:
        case Syntax.TypeLiteral:
        case Syntax.TypeReference:
        case Syntax.ArrayType:
        case Syntax.TupleType:
        case Syntax.UnionType:
        case Syntax.IntersectionType:
        case Syntax.ParenthesizedType:
        case Syntax.NamedTupleMember:
          return isDeclarationVisible(node.parent);
        case Syntax.ImportClause:
        case Syntax.NamespaceImport:
        case Syntax.ImportSpecifier:
          return false;
        case Syntax.TypeParameter:
        case Syntax.SourceFile:
        case Syntax.NamespaceExportDeclaration:
          return true;
        case Syntax.ExportAssignment:
          return false;
        default:
          return false;
      }
    }
  }
  function collectLinkedAliases(node: Identifier, setVisibility?: boolean): Node[] | undefined {
    let exportSymbol: Symbol | undefined;
    if (node.parent && node.parent.kind === Syntax.ExportAssignment)
      exportSymbol = resolveName(node, node.escapedText, qt.SymbolFlags.Value | qt.SymbolFlags.Type | qt.SymbolFlags.Namespace | qt.SymbolFlags.Alias, undefined, node, false);
    else if (node.parent.kind === Syntax.ExportSpecifier) {
      exportSymbol = getTargetOfExportSpecifier(<ExportSpecifier>node.parent, qt.SymbolFlags.Value | qt.SymbolFlags.Type | qt.SymbolFlags.Namespace | qt.SymbolFlags.Alias);
    }
    let result: Node[] | undefined;
    let visited: qb.QMap<true> | undefined;
    if (exportSymbol) {
      visited = new qb.QMap();
      visited.set('' + exportSymbol.getId(), true);
      buildVisibleNodeList(exportSymbol.declarations);
    }
    return result;
    function buildVisibleNodeList(declarations: Declaration[]) {
      forEach(declarations, (declaration) => {
        const resultNode = getAnyImportSyntax(declaration) || declaration;
        if (setVisibility) getNodeLinks(declaration).isVisible = true;
        else {
          result = result || [];
          pushIfUnique(result, resultNode);
        }
        if (is.internalModuleImportEqualsDeclaration(declaration)) {
          const internalModuleReference = <Identifier | QualifiedName>declaration.moduleReference;
          const firstIdentifier = getFirstIdentifier(internalModuleReference);
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
      if (is.withType(resolutionTargets[i], resolutionPropertyNames[i])) return -1;
      if (resolutionTargets[i] === target && resolutionPropertyNames[i] === propertyName) return i;
    }
    return -1;
  }
  function isNodewithType(target: TypeSystemEntity, propertyName: TypeSystemPropertyName): boolean {
    switch (propertyName) {
      case TypeSystemPropertyName.Type:
        return !!s.getLinks(<Symbol>target).type;
      case TypeSystemPropertyName.EnumTagType:
        return !!getNodeLinks(target as DocEnumTag).resolvedEnumType;
      case TypeSystemPropertyName.DeclaredType:
        return !!s.getLinks(<Symbol>target).declaredType;
      case TypeSystemPropertyName.ResolvedBaseConstructorType:
        return !!(<InterfaceType>target).resolvedBaseConstructorType;
      case TypeSystemPropertyName.ResolvedReturnType:
        return !!(<Signature>target).resolvedReturnType;
      case TypeSystemPropertyName.ImmediateBaseConstraint:
        return !!(<Type>target).immediateBaseConstraint;
      case TypeSystemPropertyName.ResolvedTypeArguments:
        return !!(target as TypeReference).resolvedTypeArguments;
    }
    return Debug.assertNever(propertyName);
  }
  function popTypeResolution(): boolean {
    resolutionTargets.pop();
    resolutionPropertyNames.pop();
    return resolutionResults.pop()!;
  }
  function isTypeAny(type: Type | undefined) {
    return type && (type.flags & qt.TypeFlags.Any) !== 0;
  }
  function isNullOrUndefined(node: Expression) {
    const expr = skipParentheses(node);
    return expr.kind === Syntax.NullKeyword || (expr.kind === Syntax.Identifier && getResolvedSymbol(<Identifier>expr) === undefinedSymbol);
  }
  function isEmptyArrayLiteral(node: Expression) {
    const expr = skipParentheses(node);
    return expr.kind === Syntax.ArrayLiteralExpression && (<ArrayLiteralExpression>expr).elements.length === 0;
  }
  function addOptionality(type: Type, optional = true): Type {
    return strictNullChecks && optional ? getOptionalType(type) : type;
  }
  function containsSameNamedThisProperty(thisProperty: Expression, expression: Expression) {
    return (
      is.kind(qc.PropertyAccessExpression, thisProperty) && thisProperty.expression.kind === Syntax.ThisKeyword && qc.forEach.childRecursively(expression, (n) => isMatchingReference(thisProperty, n))
    );
  }
  function isDeclarationInConstructor(expression: Expression) {
    const thisContainer = get.thisContainer(expression, false);
    return (
      thisContainer.kind === Syntax.Constructor ||
      thisContainer.kind === Syntax.FunctionDeclaration ||
      (thisContainer.kind === Syntax.FunctionExpression && !is.prototypePropertyAssignment(thisContainer.parent))
    );
  }
  function widenTypeForVariableLikeDeclaration(type: Type | undefined, declaration: any, reportErrors?: boolean) {
    if (type) {
      if (reportErrors) reportErrorsFromWidening(declaration, type);
      if (type.flags & qt.TypeFlags.UniqueESSymbol && (is.kind(qc.BindingElement, declaration) || !declaration.type) && type.symbol !== getSymbolOfNode(declaration)) type = esSymbolType;
      return getWidenedType(type);
    }
    type = is.kind(qc.ParameterDeclaration, declaration) && declaration.dot3Token ? anyArrayType : anyType;
    if (reportErrors) {
      if (!declarationBelongsToPrivateAmbientMember(declaration)) reportImplicitAny(declaration, type);
    }
    return type;
  }
  function declarationBelongsToPrivateAmbientMember(declaration: VariableLikeDeclaration) {
    const root = get.rootDeclaration(declaration);
    const memberDeclaration = root.kind === Syntax.Parameter ? root.parent : root;
    return isPrivateWithinAmbient(memberDeclaration);
  }
  function tryGetTypeFromEffectiveTypeNode(declaration: Declaration) {
    const typeNode = get.effectiveTypeAnnotationNode(declaration);
    if (typeNode) return getTypeFromTypeNode(typeNode);
  }
  function isReferenceToType(type: Type, target: Type) {
    return type !== undefined && target !== undefined && (getObjectFlags(type) & ObjectFlags.Reference) !== 0 && (<TypeReference>type).target === target;
  }
  function hasBaseType(type: Type, checkBase: Type | undefined) {
    return check(type);
    function check(type: Type): boolean {
      if (getObjectFlags(type) & (ObjectFlags.ClassOrInterface | ObjectFlags.Reference)) {
        const target = <InterfaceType>getTargetType(type);
        return target === checkBase || some(getBaseTypes(target), check);
      } else if (type.flags & qt.TypeFlags.Intersection) {
        return some((<IntersectionType>type).types, check);
      }
      return false;
    }
  }
  function appendTypeParameters(typeParameters: TypeParameter[] | undefined, declarations: readonly TypeParameterDeclaration[]): TypeParameter[] | undefined {
    for (const declaration of declarations) {
      typeParameters = appendIfUnique(typeParameters, getDeclaredTypeOfTypeParameter(getSymbolOfNode(declaration)));
    }
    return typeParameters;
  }
  function isMixinConstructorType(type: Type) {
    const signatures = getSignaturesOfType(type, SignatureKind.Construct);
    if (signatures.length === 1) {
      const s = signatures[0];
      return !s.typeParameters && s.parameters.length === 1 && signatureHasRestParameter(s) && getElementTypeOfArrayType(getTypeOfParameter(s.parameters[0])) === anyType;
    }
    return false;
  }
  function isConstructorType(type: Type): boolean {
    if (getSignaturesOfType(type, SignatureKind.Construct).length > 0) return true;
    if (type.flags & qt.TypeFlags.TypeVariable) {
      const constraint = getBaseConstraintOfType(type);
      return !!constraint && isMixinConstructorType(constraint);
    }
    return false;
  }
  function resolveBaseTypesOfClass(type: InterfaceType) {
    type.resolvedBaseTypes = resolvingEmptyArray;
    const baseConstructorType = getApparentType(getBaseConstructorTypeOfClass(type));
    if (!(baseConstructorType.flags & (TypeFlags.Object | qt.TypeFlags.Intersection | qt.TypeFlags.Any))) return (type.resolvedBaseTypes = empty);
    const baseTypeNode = getBaseTypeNodeOfClass(type)!;
    let baseType: Type;
    const originalBaseType = baseConstructorType.symbol ? getDeclaredTypeOfSymbol(baseConstructorType.symbol) : undefined;
    if (baseConstructorType.symbol && baseConstructorType.symbol.flags & qt.SymbolFlags.Class && areAllOuterTypeParametersApplied(originalBaseType!))
      baseType = getTypeFromClassOrInterfaceReference(baseTypeNode, baseConstructorType.symbol);
    else if (baseConstructorType.flags & qt.TypeFlags.Any) {
      baseType = baseConstructorType;
    } else {
      const constructors = getInstantiatedConstructorsForTypeArguments(baseConstructorType, baseTypeNode.typeArguments, baseTypeNode);
      if (!constructors.length) {
        error(baseTypeNode.expression, qd.msgs.No_base_constructor_has_the_specified_number_of_type_arguments);
        return (type.resolvedBaseTypes = empty);
      }
      baseType = getReturnTypeOfSignature(constructors[0]);
    }
    if (baseType === errorType) return (type.resolvedBaseTypes = empty);
    const reducedBaseType = getReducedType(baseType);
    if (!isValidBaseType(reducedBaseType)) {
      const elaboration = elaborateNeverIntersection(undefined, baseType);
      const diagnostic = chainqd.Messages(
        elaboration,
        qd.msgs.Base_constructor_return_type_0_is_not_an_object_type_or_intersection_of_object_types_with_statically_known_members,
        typeToString(reducedBaseType)
      );
      diagnostics.add(createDiagnosticForNodeFromMessageChain(baseTypeNode.expression, diagnostic));
      return (type.resolvedBaseTypes = empty);
    }
    if (type === reducedBaseType || hasBaseType(reducedBaseType, type)) {
      error(type.symbol.valueDeclaration, qd.msgs.Type_0_recursively_references_itself_as_a_base_type, typeToString(type, undefined, TypeFormatFlags.WriteArrayAsGenericType));
      return (type.resolvedBaseTypes = empty);
    }
    if (type.resolvedBaseTypes === resolvingEmptyArray) type.members = undefined;
    return (type.resolvedBaseTypes = [reducedBaseType]);
  }
  function areAllOuterTypeParametersApplied(type: Type): boolean {
    const outerTypeParameters = (<InterfaceType>type).outerTypeParameters;
    if (outerTypeParameters) {
      const last = outerTypeParameters.length - 1;
      const typeArguments = getTypeArguments(<TypeReference>type);
      return outerTypeParameters[last].symbol !== typeArguments[last].symbol;
    }
    return true;
  }
  function isValidBaseType(type: Type): type is BaseType {
    if (type.flags & qt.TypeFlags.TypeParameter) {
      const constraint = getBaseConstraintOfType(type);
      if (constraint) return isValidBaseType(constraint);
    }
    return !!(
      (type.flags & (TypeFlags.Object | qt.TypeFlags.NonPrimitive | qt.TypeFlags.Any) && !isGenericMappedType(type)) ||
      (type.flags & qt.TypeFlags.Intersection && every((<IntersectionType>type).types, isValidBaseType))
    );
  }
  function resolveBaseTypesOfInterface(type: InterfaceType): void {
    type.resolvedBaseTypes = type.resolvedBaseTypes || empty;
    for (const declaration of type.symbol.declarations) {
      if (declaration.kind === Syntax.InterfaceDeclaration && getInterfaceBaseTypeNodes(<InterfaceDeclaration>declaration)) {
        for (const node of getInterfaceBaseTypeNodes(<InterfaceDeclaration>declaration)!) {
          const baseType = getReducedType(getTypeFromTypeNode(node));
          if (baseType !== errorType) {
            if (isValidBaseType(baseType)) {
              if (type !== baseType && !hasBaseType(baseType, type)) {
                if (type.resolvedBaseTypes === empty) type.resolvedBaseTypes = [<ObjectType>baseType];
                else {
                  type.resolvedBaseTypes.push(baseType);
                }
              } else {
                error(declaration, qd.msgs.Type_0_recursively_references_itself_as_a_base_type, typeToString(type, undefined, TypeFormatFlags.WriteArrayAsGenericType));
              }
            } else {
              error(node, qd.msgs.An_interface_can_only_extend_an_object_type_or_intersection_of_object_types_with_statically_known_members);
            }
          }
        }
      }
    }
  }
  function isStringConcatExpression(expr: Node): boolean {
    if (StringLiteral.like(expr)) return true;
    else if (expr.kind === Syntax.BinaryExpression) return isStringConcatExpression((<BinaryExpression>expr).left) && isStringConcatExpression((<BinaryExpression>expr).right);
    return false;
  }
  function isLiteralEnumMember(member: EnumMember) {
    const expr = member.initer;
    if (!expr) return !(member.flags & NodeFlags.Ambient);
    switch (expr.kind) {
      case Syntax.StringLiteral:
      case Syntax.NumericLiteral:
      case Syntax.NoSubstitutionLiteral:
        return true;
      case Syntax.PrefixUnaryExpression:
        return (<PrefixUnaryExpression>expr).operator === Syntax.MinusToken && (<PrefixUnaryExpression>expr).operand.kind === Syntax.NumericLiteral;
      case Syntax.Identifier:
        return is.missing(expr) || !!getSymbolOfNode(member.parent).exports!.get((<Identifier>expr).escapedText);
      case Syntax.BinaryExpression:
        return isStringConcatExpression(expr);
      default:
        return false;
    }
  }
  function isThislessType(node: TypeNode): boolean {
    switch (node.kind) {
      case Syntax.AnyKeyword:
      case Syntax.UnknownKeyword:
      case Syntax.StringKeyword:
      case Syntax.NumberKeyword:
      case Syntax.BigIntKeyword:
      case Syntax.BooleanKeyword:
      case Syntax.SymbolKeyword:
      case Syntax.ObjectKeyword:
      case Syntax.VoidKeyword:
      case Syntax.UndefinedKeyword:
      case Syntax.NullKeyword:
      case Syntax.NeverKeyword:
      case Syntax.LiteralType:
        return true;
      case Syntax.ArrayType:
        return isThislessType((<ArrayTypeNode>node).elementType);
      case Syntax.TypeReference:
        return !(node as TypeReferenceNode).typeArguments || (node as TypeReferenceNode).typeArguments!.every(isThislessType);
    }
    return false;
  }
  function isThislessTypeParameter(node: TypeParameterDeclaration) {
    const constraint = get.effectiveConstraintOfTypeParameter(node);
    return !constraint || isThislessType(constraint);
  }
  function isThislessVariableLikeDeclaration(node: VariableLikeDeclaration): boolean {
    const typeNode = get.effectiveTypeAnnotationNode(node);
    return typeNode ? isThislessType(typeNode) : !is.withIniter(node);
  }
  function isThislessFunctionLikeDeclaration(node: FunctionLikeDeclaration): boolean {
    const returnType = getEffectiveReturnTypeNode(node);
    const typeParameters = get.effectiveTypeParameterDeclarations(node);
    return (
      (node.kind === Syntax.Constructor || (!!returnType && isThislessType(returnType))) && node.parameters.every(isThislessVariableLikeDeclaration) && typeParameters.every(isThislessTypeParameter)
    );
  }
  function createInstantiatedSymbolTable(symbols: Symbol[], mapper: TypeMapper, mappingThisOnly: boolean): SymbolTable {
    const result = new SymbolTable();
    for (const symbol of symbols) {
      result.set(symbol.escName, mappingThisOnly && isThisless(symbol) ? symbol : instantiateSymbol(symbol, mapper));
    }
    return result;
  }
  function addInheritedMembers(symbols: SymbolTable, baseSymbols: Symbol[]) {
    for (const s of baseSymbols) {
      if (!symbols.has(s.escName) && !isStaticPrivateIdentifierProperty(s)) symbols.set(s.escName, s);
    }
  }
  function isStaticPrivateIdentifierProperty(s: Symbol): boolean {
    return s.valueDeclaration?.is.privateIdentifierPropertyDeclaration() && has.syntacticModifiers(.valueDeclaration, ModifierFlags.Static);
  }
  function resolveDeclaredMembers(type: InterfaceType): InterfaceTypeWithDeclaredMembers {
    if (!(<InterfaceTypeWithDeclaredMembers>type).declaredProperties) {
      const symbol = type.symbol;
      const members = getMembersOfSymbol(symbol);
      (<InterfaceTypeWithDeclaredMembers>type).declaredProperties = getNamedMembers(members);
      (<InterfaceTypeWithDeclaredMembers>type).declaredCallSignatures = empty;
      (<InterfaceTypeWithDeclaredMembers>type).declaredConstructSignatures = empty;
      (<InterfaceTypeWithDeclaredMembers>type).declaredCallSignatures = getSignaturesOfSymbol(members.get(InternalSymbol.Call));
      (<InterfaceTypeWithDeclaredMembers>type).declaredConstructSignatures = getSignaturesOfSymbol(members.get(InternalSymbol.New));
      (<InterfaceTypeWithDeclaredMembers>type).declaredStringIndexInfo = getIndexInfoOfSymbol(symbol, IndexKind.String);
      (<InterfaceTypeWithDeclaredMembers>type).declaredNumberIndexInfo = getIndexInfoOfSymbol(symbol, IndexKind.Number);
    }
    return <InterfaceTypeWithDeclaredMembers>type;
  }
  function isTypeUsableAsPropertyName(type: Type): type is StringLiteralType | NumberLiteralType | UniqueESSymbolType {
    return !!(type.flags & qt.TypeFlags.StringOrNumberLiteralOrUnique);
  }
  function isLateBindableName(node: DeclarationName): node is LateBoundName {
    if (!is.kind(qc.ComputedPropertyName, node) && !is.kind(qc.ElementAccessExpression, node)) return false;
    const expr = is.kind(qc.ComputedPropertyName, node) ? node.expression : node.argumentExpression;
    return is.entityNameExpression(expr) && isTypeUsableAsPropertyName(is.kind(qc.ComputedPropertyName, node) ? check.computedPropertyName(node) : check.expressionCached(expr));
  }
  function isLateBoundName(name: qb.__String): boolean {
    return (name as string).charCodeAt(0) === Codes._ && (name as string).charCodeAt(1) === Codes._ && (name as string).charCodeAt(2) === Codes.at;
  }
  function hasLateBindableName(node: Declaration): node is LateBoundDeclaration | LateBoundBinaryExpressionDeclaration {
    const name = get.nameOfDeclaration(node);
    return !!name && isLateBindableName(name);
  }
  function hasNonBindableDynamicName(node: Declaration) {
    return hasDynamicName(node) && !hasLateBindableName(node);
  }
  function isNonBindableDynamicName(node: DeclarationName) {
    return isDynamicName(node) && !isLateBindableName(node);
  }
  function addDeclarationToLateBoundSymbol(symbol: Symbol, member: LateBoundDeclaration | BinaryExpression, symbolFlags: qt.SymbolFlags) {
    assert(!!(this.getCheckFlags() & qt.CheckFlags.Late), 'Expected a late-bound symbol.');
    symbol.flags |= symbolFlags;
    s.getLinks(member.symbol).lateSymbol = symbol;
    if (!symbol.declarations) symbol.declarations = [member];
    else {
      symbol.declarations.push(member);
    }
    if (symbolFlags & qt.SymbolFlags.Value) {
      if (!symbol.valueDeclaration || symbol.valueDeclaration.kind !== member.kind) symbol.valueDeclaration = member;
    }
  }
  function lateBindMember(
    parent: Symbol,
    earlySymbols: SymbolTable | undefined,
    lateSymbols: EscapedMap<TransientSymbol>,
    decl: LateBoundDeclaration | LateBoundBinaryExpressionDeclaration
  ) {
    assert(!!decl.symbol, 'The member is expected to have a symbol.');
    const ls = getNodeLinks(decl);
    if (!ls.resolvedSymbol) {
      ls.resolvedSymbol = decl.symbol;
      const declName = is.kind(qc.BinaryExpression, decl) ? decl.left : decl.name;
      const type = is.kind(qc.ElementAccessExpression, declName) ? check.expressionCached(declName.argumentExpression) : check.computedPropertyName(declName);
      if (isTypeUsableAsPropertyName(type)) {
        const memberName = getPropertyNameFromType(type);
        const symbolFlags = decl.symbol.flags;
        let lateSymbol = lateSymbols.get(memberName);
        if (!lateSymbol) lateSymbols.set(memberName, (lateSymbol = new Symbol(SymbolFlags.None, memberName, qt.CheckFlags.Late)));
        const earlySymbol = earlySymbols && earlySymbols.get(memberName);
        if (lateSymbol.flags & getExcludedSymbolFlags(symbolFlags) || earlySymbol) {
          const declarations = earlySymbol ? concatenate(earlySymbol.declarations, lateSymbol.declarations) : lateSymbol.declarations;
          const name = (!(type.flags & qt.TypeFlags.UniqueESSymbol) && qy.get.unescUnderscores(memberName)) || declarationNameToString(declName);
          forEach(declarations, (declaration) => error(get.nameOfDeclaration(declaration) || declaration, qd.msgs.Property_0_was_also_declared_here, name));
          error(declName || decl, qd.msgs.Duplicate_property_0, name);
          lateSymbol = new Symbol(SymbolFlags.None, memberName, qt.CheckFlags.Late);
        }
        lateSymbol.nameType = type;
        addDeclarationToLateBoundSymbol(lateSymbol, decl, symbolFlags);
        if (lateSymbol.parent) assert(lateSymbol.parent === parent, 'Existing symbol parent should match new one');
        else {
          lateSymbol.parent = parent;
        }
        return (ls.resolvedSymbol = lateSymbol);
      }
    }
    return ls.resolvedSymbol;
  }
  function resolveObjectTypeMembers(type: ObjectType, source: InterfaceTypeWithDeclaredMembers, typeParameters: readonly TypeParameter[], typeArguments: readonly Type[]) {
    let mapper: TypeMapper | undefined;
    let members: SymbolTable;
    let callSignatures: readonly Signature[];
    let constructSignatures: readonly Signature[] | undefined;
    let stringIndexInfo: IndexInfo | undefined;
    let numberIndexInfo: IndexInfo | undefined;
    if (rangeEquals(typeParameters, typeArguments, 0, typeParameters.length)) {
      members = source.symbol ? getMembersOfSymbol(source.symbol) : new SymbolTable(source.declaredProperties);
      callSignatures = source.declaredCallSignatures;
      constructSignatures = source.declaredConstructSignatures;
      stringIndexInfo = source.declaredStringIndexInfo;
      numberIndexInfo = source.declaredNumberIndexInfo;
    } else {
      mapper = createTypeMapper(typeParameters, typeArguments);
      members = createInstantiatedSymbolTable(source.declaredProperties, mapper, typeParameters.length === 1);
      callSignatures = instantiateSignatures(source.declaredCallSignatures, mapper);
      constructSignatures = instantiateSignatures(source.declaredConstructSignatures, mapper);
      stringIndexInfo = instantiateIndexInfo(source.declaredStringIndexInfo, mapper);
      numberIndexInfo = instantiateIndexInfo(source.declaredNumberIndexInfo, mapper);
    }
    const baseTypes = getBaseTypes(source);
    if (baseTypes.length) {
      if (source.symbol && members === getMembersOfSymbol(source.symbol)) members = new SymbolTable(source.declaredProperties);
      setStructuredTypeMembers(type, members, callSignatures, constructSignatures, stringIndexInfo, numberIndexInfo);
      const thisArgument = lastOrUndefined(typeArguments);
      for (const baseType of baseTypes) {
        const instantiatedBaseType = thisArgument ? getTypeWithThisArgument(instantiateType(baseType, mapper), thisArgument) : baseType;
        addInheritedMembers(members, getPropertiesOfType(instantiatedBaseType));
        callSignatures = concatenate(callSignatures, getSignaturesOfType(instantiatedBaseType, SignatureKind.Call));
        constructSignatures = concatenate(constructSignatures, getSignaturesOfType(instantiatedBaseType, SignatureKind.Construct));
        if (!stringIndexInfo) stringIndexInfo = instantiatedBaseType === anyType ? createIndexInfo(anyType, false) : getIndexInfoOfType(instantiatedBaseType, IndexKind.String);
        numberIndexInfo = numberIndexInfo || getIndexInfoOfType(instantiatedBaseType, IndexKind.Number);
      }
    }
    setStructuredTypeMembers(type, members, callSignatures, constructSignatures, stringIndexInfo, numberIndexInfo);
  }
  function resolveClassOrInterfaceMembers(type: InterfaceType): void {
    resolveObjectTypeMembers(type, resolveDeclaredMembers(type), empty, empty);
  }
  function resolveTypeReferenceMembers(type: TypeReference): void {
    const source = resolveDeclaredMembers(type.target);
    const typeParameters = concatenate(source.typeParameters!, [source.thisType!]);
    const typeArguments = getTypeArguments(type);
    const paddedTypeArguments = typeArguments.length === typeParameters.length ? typeArguments : concatenate(typeArguments, [type]);
    resolveObjectTypeMembers(type, source, typeParameters, paddedTypeArguments);
  }
  function createSignature(
    declaration: SignatureDeclaration | DocSignature | undefined,
    typeParameters: readonly TypeParameter[] | undefined,
    thisParameter: Symbol | undefined,
    parameters: readonly Symbol[],
    resolvedReturnType: Type | undefined,
    resolvedTypePredicate: TypePredicate | undefined,
    minArgumentCount: number,
    flags: SignatureFlags
  ): Signature {
    const sig = new Signature(checker, flags);
    sig.declaration = declaration;
    sig.typeParameters = typeParameters;
    sig.parameters = parameters;
    sig.thisParameter = thisParameter;
    sig.resolvedReturnType = resolvedReturnType;
    sig.resolvedTypePredicate = resolvedTypePredicate;
    sig.minArgumentCount = minArgumentCount;
    sig.target = undefined;
    sig.mapper = undefined;
    sig.unionSignatures = undefined;
    return sig;
  }
  function cloneSignature(sig: Signature): Signature {
    const result = createSignature(sig.declaration, sig.typeParameters, sig.thisParameter, sig.parameters, undefined, undefined, sig.minArgumentCount, sig.flags & SignatureFlags.PropagatingFlags);
    result.target = sig.target;
    result.mapper = sig.mapper;
    result.unionSignatures = sig.unionSignatures;
    return result;
  }
  function createUnionSignature(signature: Signature, unionSignatures: Signature[]) {
    const result = cloneSignature(signature);
    result.unionSignatures = unionSignatures;
    result.target = undefined;
    result.mapper = undefined;
    return result;
  }
  function createOptionalCallSignature(signature: Signature, callChainFlags: SignatureFlags) {
    assert(
      callChainFlags === SignatureFlags.IsInnerCallChain || callChainFlags === SignatureFlags.IsOuterCallChain,
      'An optional call signature can either be for an inner call chain or an outer call chain, but not both.'
    );
    const result = cloneSignature(signature);
    result.flags |= callChainFlags;
    return result;
  }
  function findMatchingSignature(signatureList: readonly Signature[], signature: Signature, partialMatch: boolean, ignoreThisTypes: boolean, ignoreReturnTypes: boolean): Signature | undefined {
    for (const s of signatureList) {
      if (compareSignaturesIdentical(s, signature, partialMatch, ignoreThisTypes, ignoreReturnTypes, partialMatch ? compareTypesSubtypeOf : compareTypesIdentical)) return s;
    }
  }
  function findMatchingSignatures(signatureLists: readonly (readonly Signature[])[], signature: Signature, listIndex: number): Signature[] | undefined {
    if (signature.typeParameters) {
      if (listIndex > 0) return;
      for (let i = 1; i < signatureLists.length; i++) {
        if (!findMatchingSignature(signatureLists[i], signature, false)) return;
      }
      return [signature];
    }
    let result: Signature[] | undefined;
    for (let i = 0; i < signatureLists.length; i++) {
      const match = i === listIndex ? signature : findMatchingSignature(signatureLists[i], signature, true);
      if (!match) return;
      result = appendIfUnique(result, match);
    }
    return result;
  }
  function combineUnionThisParam(left: Symbol | undefined, right: Symbol | undefined): Symbol | undefined {
    if (!left || !right) return left || right;
    const thisType = getIntersectionType([getTypeOfSymbol(left), getTypeOfSymbol(right)]);
    return createSymbolWithType(left, thisType);
  }
  function combineUnionParameters(left: Signature, right: Signature) {
    const leftCount = getParameterCount(left);
    const rightCount = getParameterCount(right);
    const longest = leftCount >= rightCount ? left : right;
    const shorter = longest === left ? right : left;
    const longestCount = longest === left ? leftCount : rightCount;
    const eitherHasEffectiveRest = hasEffectiveRestParameter(left) || hasEffectiveRestParameter(right);
    const needsExtraRestElement = eitherHasEffectiveRest && !hasEffectiveRestParameter(longest);
    const params = new Array<Symbol>(longestCount + (needsExtraRestElement ? 1 : 0));
    for (let i = 0; i < longestCount; i++) {
      const longestParamType = tryGetTypeAtPosition(longest, i)!;
      const shorterParamType = tryGetTypeAtPosition(shorter, i) || unknownType;
      const unionParamType = getIntersectionType([longestParamType, shorterParamType]);
      const isRestParam = eitherHasEffectiveRest && !needsExtraRestElement && i === longestCount - 1;
      const isOptional = i >= getMinArgumentCount(longest) && i >= getMinArgumentCount(shorter);
      const leftName = i >= leftCount ? undefined : getParameterNameAtPosition(left, i);
      const rightName = i >= rightCount ? undefined : getParameterNameAtPosition(right, i);
      const paramName = leftName === rightName ? leftName : !leftName ? rightName : !rightName ? leftName : undefined;
      const paramSymbol = new Symbol(SymbolFlags.FunctionScopedVariable | (isOptional && !isRestParam ? qt.SymbolFlags.Optional : 0), paramName || (`arg${i}` as qb.__String));
      paramSymbol.type = isRestParam ? createArrayType(unionParamType) : unionParamType;
      params[i] = paramSymbol;
    }
    if (needsExtraRestElement) {
      const restParamSymbol = new Symbol(SymbolFlags.FunctionScopedVariable, 'args' as qb.__String);
      restParamSymbol.type = createArrayType(getTypeAtPosition(shorter, longestCount));
      params[longestCount] = restParamSymbol;
    }
    return params;
  }
  function combineSignaturesOfUnionMembers(left: Signature, right: Signature): Signature {
    const declaration = left.declaration;
    const params = combineUnionParameters(left, right);
    const thisParam = combineUnionThisParam(left.thisParameter, right.thisParameter);
    const minArgCount = Math.max(left.minArgumentCount, right.minArgumentCount);
    const result = createSignature(
      declaration,
      left.typeParameters || right.typeParameters,
      thisParam,
      params,
      undefined,
      undefined,
      minArgCount,
      (left.flags | right.flags) & SignatureFlags.PropagatingFlags
    );
    result.unionSignatures = concatenate(left.unionSignatures || [left], [right]);
    return result;
  }
  function resolveUnionTypeMembers(type: UnionType) {
    const callSignatures = getUnionSignatures(map(type.types, (t) => (t === globalFunctionType ? [unknownSignature] : getSignaturesOfType(t, SignatureKind.Call))));
    const constructSignatures = getUnionSignatures(map(type.types, (t) => getSignaturesOfType(t, SignatureKind.Construct)));
    const stringIndexInfo = getUnionIndexInfo(type.types, IndexKind.String);
    const numberIndexInfo = getUnionIndexInfo(type.types, IndexKind.Number);
    setStructuredTypeMembers(type, emptySymbols, callSignatures, constructSignatures, stringIndexInfo, numberIndexInfo);
  }
  function intersectTypes(type1: Type, type2: Type): Type;
  function intersectTypes(type1: Type | undefined, type2: Type | undefined): Type | undefined;
  function intersectTypes(type1: Type | undefined, type2: Type | undefined): Type | undefined {
    return !type1 ? type2 : !type2 ? type1 : getIntersectionType([type1, type2]);
  }
  function intersectIndexInfos(info1: IndexInfo | undefined, info2: IndexInfo | undefined): IndexInfo | undefined {
    return !info1 ? info2 : !info2 ? info1 : createIndexInfo(getIntersectionType([info1.type, info2.type]), info1.isReadonly && info2.isReadonly);
  }
  function unionSpreadIndexInfos(info1: IndexInfo | undefined, info2: IndexInfo | undefined): IndexInfo | undefined {
    return info1 && info2 && createIndexInfo(getUnionType([info1.type, info2.type]), info1.isReadonly || info2.isReadonly);
  }
  function findMixins(types: readonly Type[]): readonly boolean[] {
    const constructorTypeCount = countWhere(types, (t) => getSignaturesOfType(t, SignatureKind.Construct).length > 0);
    const mixinFlags = map(types, isMixinConstructorType);
    if (constructorTypeCount > 0 && constructorTypeCount === countWhere(mixinFlags, (b) => b)) {
      const firstMixinIndex = mixinFlags.indexOf(true);
      mixinFlags[firstMixinIndex] = false;
    }
    return mixinFlags;
  }
  function includeMixinType(type: Type, types: readonly Type[], mixinFlags: readonly boolean[], index: number): Type {
    const mixedTypes: Type[] = [];
    for (let i = 0; i < types.length; i++) {
      if (i === index) mixedTypes.push(type);
      else if (mixinFlags[i]) {
        mixedTypes.push(getReturnTypeOfSignature(getSignaturesOfType(types[i], SignatureKind.Construct)[0]));
      }
    }
    return getIntersectionType(mixedTypes);
  }
  function resolveIntersectionTypeMembers(type: IntersectionType) {
    let callSignatures: Signature[] | undefined;
    let constructSignatures: Signature[] | undefined;
    let stringIndexInfo: IndexInfo | undefined;
    let numberIndexInfo: IndexInfo | undefined;
    const types = type.types;
    const mixinFlags = findMixins(types);
    const mixinCount = countWhere(mixinFlags, (b) => b);
    for (let i = 0; i < types.length; i++) {
      const t = type.types[i];
      if (!mixinFlags[i]) {
        let signatures = getSignaturesOfType(t, SignatureKind.Construct);
        if (signatures.length && mixinCount > 0) {
          signatures = map(signatures, (s) => {
            const clone = cloneSignature(s);
            clone.resolvedReturnType = includeMixinType(getReturnTypeOfSignature(s), types, mixinFlags, i);
            return clone;
          });
        }
        constructSignatures = appendSignatures(constructSignatures, signatures);
      }
      callSignatures = appendSignatures(callSignatures, getSignaturesOfType(t, SignatureKind.Call));
      stringIndexInfo = intersectIndexInfos(stringIndexInfo, getIndexInfoOfType(t, IndexKind.String));
      numberIndexInfo = intersectIndexInfos(numberIndexInfo, getIndexInfoOfType(t, IndexKind.Number));
    }
    setStructuredTypeMembers(type, emptySymbols, callSignatures || empty, constructSignatures || empty, stringIndexInfo, numberIndexInfo);
  }
  function appendSignatures(signatures: Signature[] | undefined, newSignatures: readonly Signature[]) {
    for (const sig of newSignatures) {
      if (!signatures || every(signatures, (s) => !compareSignaturesIdentical(s, sig, false, compareTypesIdentical))) signatures = append(signatures, sig);
    }
    return signatures;
  }
  function resolveAnonymousTypeMembers(type: AnonymousType) {
    const symbol = getMergedSymbol(type.symbol);
    if (type.target) {
      setStructuredTypeMembers(type, emptySymbols, empty, empty, undefined, undefined);
      const members = createInstantiatedSymbolTable(getPropertiesOfObjectType(type.target), type.mapper!, false);
      const callSignatures = instantiateSignatures(getSignaturesOfType(type.target, SignatureKind.Call), type.mapper!);
      const constructSignatures = instantiateSignatures(getSignaturesOfType(type.target, SignatureKind.Construct), type.mapper!);
      const stringIndexInfo = instantiateIndexInfo(getIndexInfoOfType(type.target, IndexKind.String), type.mapper!);
      const numberIndexInfo = instantiateIndexInfo(getIndexInfoOfType(type.target, IndexKind.Number), type.mapper!);
      setStructuredTypeMembers(type, members, callSignatures, constructSignatures, stringIndexInfo, numberIndexInfo);
    } else if (symbol.flags & qt.SymbolFlags.TypeLiteral) {
      setStructuredTypeMembers(type, emptySymbols, empty, empty, undefined, undefined);
      const members = getMembersOfSymbol(symbol);
      const callSignatures = getSignaturesOfSymbol(members.get(InternalSymbol.Call));
      const constructSignatures = getSignaturesOfSymbol(members.get(InternalSymbol.New));
      const stringIndexInfo = getIndexInfoOfSymbol(symbol, IndexKind.String);
      const numberIndexInfo = getIndexInfoOfSymbol(symbol, IndexKind.Number);
      setStructuredTypeMembers(type, members, callSignatures, constructSignatures, stringIndexInfo, numberIndexInfo);
    } else {
      let members = emptySymbols;
      let stringIndexInfo: IndexInfo | undefined;
      if (symbol.exports) {
        members = this.getExportsOfSymbol();
        if (symbol === globalThisSymbol) {
          const varsOnly = new SymbolTable();
          members.forEach((p) => {
            if (!(p.flags & qt.SymbolFlags.BlockScoped)) varsOnly.set(p.escName, p);
          });
          members = varsOnly;
        }
      }
      setStructuredTypeMembers(type, members, empty, empty, undefined, undefined);
      if (symbol.flags & qt.SymbolFlags.Class) {
        const classType = this.getDeclaredTypeOfClassOrInterface();
        const baseConstructorType = getBaseConstructorTypeOfClass(classType);
        if (baseConstructorType.flags & (TypeFlags.Object | qt.TypeFlags.Intersection | qt.TypeFlags.TypeVariable)) {
          members = new SymbolTable(getNamedMembers(members));
          addInheritedMembers(members, getPropertiesOfType(baseConstructorType));
        } else if (baseConstructorType === anyType) {
          stringIndexInfo = createIndexInfo(anyType, false);
        }
      }
      const numberIndexInfo =
        symbol.flags & qt.SymbolFlags.Enum && (getDeclaredTypeOfSymbol(symbol).flags & qt.TypeFlags.Enum || some(type.properties, (prop) => !!(getTypeOfSymbol(prop).flags & qt.TypeFlags.NumberLike)))
          ? enumNumberIndexInfo
          : undefined;
      setStructuredTypeMembers(type, members, empty, empty, stringIndexInfo, numberIndexInfo);
      if (symbol.flags & (SymbolFlags.Function | qt.SymbolFlags.Method)) type.callSignatures = getSignaturesOfSymbol(symbol);
      if (symbol.flags & qt.SymbolFlags.Class) {
        const classType = this.getDeclaredTypeOfClassOrInterface();
        let constructSignatures = symbol.members ? getSignaturesOfSymbol(symbol.members.get(InternalSymbol.Constructor)) : empty;
        if (symbol.flags & qt.SymbolFlags.Function) {
          constructSignatures = addRange(
            constructSignatures.slice(),
            mapDefined(type.callSignatures, (sig) =>
              isJSConstructor(sig.declaration)
                ? createSignature(sig.declaration, sig.typeParameters, sig.thisParameter, sig.parameters, classType, undefined, sig.minArgumentCount, sig.flags & SignatureFlags.PropagatingFlags)
                : undefined
            )
          );
        }
        if (!constructSignatures.length) constructSignatures = getDefaultConstructSignatures(classType);
        type.constructSignatures = constructSignatures;
      }
    }
  }
  function resolveReverseMappedTypeMembers(type: ReverseMappedType) {
    const indexInfo = getIndexInfoOfType(type.source, IndexKind.String);
    const modifiers = getMappedTypeModifiers(type.mappedType);
    const readonlyMask = modifiers & MappedTypeModifiers.IncludeReadonly ? false : true;
    const optionalMask = modifiers & MappedTypeModifiers.IncludeOptional ? 0 : qt.SymbolFlags.Optional;
    const stringIndexInfo = indexInfo && createIndexInfo(inferReverseMappedType(indexInfo.type, type.mappedType, type.constraintType), readonlyMask && indexInfo.isReadonly);
    const members = new SymbolTable();
    for (const prop of getPropertiesOfType(type.source)) {
      const f = qt.CheckFlags.ReverseMapped | (readonlyMask && isReadonlySymbol(prop) ? qt.CheckFlags.Readonly : 0);
      const inferredProp = new Symbol(SymbolFlags.Property | (prop.flags & optionalMask), prop.escName, f) as ReverseMappedSymbol;
      inferredProp.declarations = prop.declarations;
      inferredProp.nameType = s.getLinks(prop).nameType;
      inferredProp.propertyType = getTypeOfSymbol(prop);
      inferredProp.mappedType = type.mappedType;
      inferredProp.constraintType = type.constraintType;
      members.set(prop.escName, inferredProp);
    }
    setStructuredTypeMembers(type, members, empty, empty, stringIndexInfo, undefined);
  }
  function resolveMappedTypeMembers(type: MappedType) {
    const members = new SymbolTable();
    let stringIndexInfo: IndexInfo | undefined;
    let numberIndexInfo: IndexInfo | undefined;
    setStructuredTypeMembers(type, emptySymbols, empty, empty, undefined, undefined);
    const typeParameter = getTypeParameterFromMappedType(type);
    const constraintType = getConstraintTypeFromMappedType(type);
    const templateType = getTemplateTypeFromMappedType(<MappedType>type.target || type);
    const modifiersType = getApparentType(getModifiersTypeFromMappedType(type));
    const templateModifiers = getMappedTypeModifiers(type);
    const include = keyofStringsOnly ? qt.TypeFlags.StringLiteral : qt.TypeFlags.StringOrNumberLiteralOrUnique;
    if (isMappedTypeWithKeyofConstraintDeclaration(type)) {
      for (const prop of getPropertiesOfType(modifiersType)) {
        addMemberForKeyType(getLiteralTypeFromProperty(prop, include));
      }
      if (modifiersType.flags & qt.TypeFlags.Any || getIndexInfoOfType(modifiersType, IndexKind.String)) addMemberForKeyType(stringType);
      if (!keyofStringsOnly && getIndexInfoOfType(modifiersType, IndexKind.Number)) addMemberForKeyType(numberType);
    } else {
      forEachType(getLowerBoundOfKeyType(constraintType), addMemberForKeyType);
    }
    setStructuredTypeMembers(type, members, empty, empty, stringIndexInfo, numberIndexInfo);
    function addMemberForKeyType(t: Type) {
      const templateMapper = appendTypeMapping(type.mapper, typeParameter, t);
      if (isTypeUsableAsPropertyName(t)) {
        const propName = getPropertyNameFromType(t);
        const modifiersProp = getPropertyOfType(modifiersType, propName);
        const isOptional = !!(
          templateModifiers & MappedTypeModifiers.IncludeOptional ||
          (!(templateModifiers & MappedTypeModifiers.ExcludeOptional) && modifiersProp && modifiersProp.flags & qt.SymbolFlags.Optional)
        );
        const isReadonly = !!(
          templateModifiers & MappedTypeModifiers.IncludeReadonly ||
          (!(templateModifiers & MappedTypeModifiers.ExcludeReadonly) && modifiersProp && isReadonlySymbol(modifiersProp))
        );
        const stripOptional = strictNullChecks && !isOptional && modifiersProp && modifiersProp.flags & qt.SymbolFlags.Optional;
        const prop = <MappedSymbol>(
          new Symbol(
            qt.SymbolFlags.Property | (isOptional ? qt.SymbolFlags.Optional : 0),
            propName,
            qt.CheckFlags.Mapped | (isReadonly ? qt.CheckFlags.Readonly : 0) | (stripOptional ? qt.CheckFlags.StripOptional : 0)
          )
        );
        prop.mappedType = type;
        prop.mapper = templateMapper;
        if (modifiersProp) {
          prop.syntheticOrigin = modifiersProp;
          prop.declarations = modifiersProp.declarations;
        }
        prop.nameType = t;
        members.set(propName, prop);
      } else if (t.flags & (TypeFlags.Any | qt.TypeFlags.String | qt.TypeFlags.Number | qt.TypeFlags.Enum)) {
        const propType = instantiateType(templateType, templateMapper);
        if (t.flags & (TypeFlags.Any | qt.TypeFlags.String)) stringIndexInfo = createIndexInfo(propType, !!(templateModifiers & MappedTypeModifiers.IncludeReadonly));
        else {
          numberIndexInfo = createIndexInfo(numberIndexInfo ? getUnionType([numberIndexInfo.type, propType]) : propType, !!(templateModifiers & MappedTypeModifiers.IncludeReadonly));
        }
      }
    }
  }
  function isMappedTypeWithKeyofConstraintDeclaration(type: MappedType) {
    const constraintDeclaration = getConstraintDeclarationForMappedType(type)!;
    return constraintDeclaration.kind === Syntax.TypeOperator && (<TypeOperatorNode>constraintDeclaration).operator === Syntax.KeyOfKeyword;
  }
  function isPartialMappedType(type: Type) {
    return !!(getObjectFlags(type) & ObjectFlags.Mapped && getMappedTypeModifiers(<MappedType>type) & MappedTypeModifiers.IncludeOptional);
  }
  function isGenericMappedType(type: Type): type is MappedType {
    return !!(getObjectFlags(type) & ObjectFlags.Mapped) && isGenericIndexType(getConstraintTypeFromMappedType(<MappedType>type));
  }
  function resolveStructuredTypeMembers(type: StructuredType): ResolvedType {
    if (!(<ResolvedType>type).members) {
      if (type.flags & qt.TypeFlags.Object) {
        if ((<ObjectType>type).objectFlags & ObjectFlags.Reference) resolveTypeReferenceMembers(<TypeReference>type);
        else if ((<ObjectType>type).objectFlags & ObjectFlags.ClassOrInterface) resolveClassOrInterfaceMembers(<InterfaceType>type);
        else if ((<ReverseMappedType>type).objectFlags & ObjectFlags.ReverseMapped) resolveReverseMappedTypeMembers(type as ReverseMappedType);
        else if ((<ObjectType>type).objectFlags & ObjectFlags.Anonymous) resolveAnonymousTypeMembers(<AnonymousType>type);
        else if ((<MappedType>type).objectFlags & ObjectFlags.Mapped) resolveMappedTypeMembers(<MappedType>type);
      } else if (type.flags & qt.TypeFlags.Union) resolveUnionTypeMembers(<UnionType>type);
      else if (type.flags & qt.TypeFlags.Intersection) resolveIntersectionTypeMembers(<IntersectionType>type);
    }
    return <ResolvedType>type;
  }
  function isTypeInvalidDueToUnionDiscriminant(contextualType: Type, obj: ObjectLiteralExpression | JsxAttributes): boolean {
    const list = obj.properties as Nodes<ObjectLiteralElementLike | JsxAttributeLike>;
    return list.some((property) => {
      const nameType = property.name && getLiteralTypeFromPropertyName(property.name);
      const name = nameType && isTypeUsableAsPropertyName(nameType) ? getPropertyNameFromType(nameType) : undefined;
      const expected = name === undefined ? undefined : getTypeOfPropertyOfType(contextualType, name);
      return !!expected && isLiteralType(expected) && !isTypeAssignableTo(getTypeOfNode(property), expected);
    });
  }
  function hasNonCircularBaseConstraint(type: InstantiableType): boolean {
    return getResolvedBaseConstraint(type) !== circularConstraintType;
  }
  function hasNonCircularTypeParameterDefault(typeParameter: TypeParameter) {
    return getResolvedTypeParameterDefault(typeParameter) !== circularConstraintType;
  }
  function hasTypeParameterDefault(typeParameter: TypeParameter): boolean {
    return !!(typeParameter.symbol && forEach(typeParameter.symbol.declarations, (decl) => is.kind(qc.TypeParameterDeclaration, decl) && decl.default));
  }
  function createUnionOrIntersectionProperty(containingType: UnionOrIntersectionType, name: qb.__String): Symbol | undefined {
    let singleProp: Symbol | undefined;
    let propSet: qb.QMap<Symbol> | undefined;
    let indexTypes: Type[] | undefined;
    const isUnion = containingType.flags & qt.TypeFlags.Union;
    let optionalFlag = isUnion ? qt.SymbolFlags.None : qt.SymbolFlags.Optional;
    let syntheticFlag = qt.CheckFlags.SyntheticMethod;
    let checkFlags = 0;
    for (const current of containingType.types) {
      const type = getApparentType(current);
      if (!(type === errorType || type.flags & qt.TypeFlags.Never)) {
        const prop = getPropertyOfType(type, name);
        const modifiers = prop ? getDeclarationModifierFlagsFromSymbol(prop) : 0;
        if (prop) {
          if (isUnion) optionalFlag |= prop.flags & qt.SymbolFlags.Optional;
          else optionalFlag &= prop.flags;
          if (!singleProp) singleProp = prop;
          else if (prop !== singleProp) {
            if (!propSet) {
              propSet = new qb.QMap<Symbol>();
              propSet.set('' + singleProp.getId(), singleProp);
            }
            const id = '' + prop.getId();
            if (!propSet.has(id)) propSet.set(id, prop);
          }
          checkFlags |=
            (isReadonlySymbol(prop) ? qt.CheckFlags.Readonly : 0) |
            (!(modifiers & ModifierFlags.NonPublicAccessibilityModifier) ? qt.CheckFlags.ContainsPublic : 0) |
            (modifiers & ModifierFlags.Protected ? qt.CheckFlags.ContainsProtected : 0) |
            (modifiers & ModifierFlags.Private ? qt.CheckFlags.ContainsPrivate : 0) |
            (modifiers & ModifierFlags.Static ? qt.CheckFlags.ContainsStatic : 0);
          if (!isPrototypeProperty(prop)) syntheticFlag = qt.CheckFlags.SyntheticProperty;
        } else if (isUnion) {
          const indexInfo = !isLateBoundName(name) && ((NumericLiteral.name(name) && getIndexInfoOfType(type, IndexKind.Number)) || getIndexInfoOfType(type, IndexKind.String));
          if (indexInfo) {
            checkFlags |= qt.CheckFlags.WritePartial | (indexInfo.isReadonly ? qt.CheckFlags.Readonly : 0);
            indexTypes = append(indexTypes, isTupleType(type) ? getRestTypeOfTupleType(type) || undefinedType : indexInfo.type);
          } else if (isObjectLiteralType(type)) {
            checkFlags |= qt.CheckFlags.WritePartial;
            indexTypes = append(indexTypes, undefinedType);
          } else checkFlags |= qt.CheckFlags.ReadPartial;
        }
      }
    }
    if (!singleProp || (isUnion && (propSet || checkFlags & qt.CheckFlags.Partial) && checkFlags & (CheckFlags.ContainsPrivate | qt.CheckFlags.ContainsProtected))) return;
    if (!propSet && !(checkFlags & qt.CheckFlags.ReadPartial) && !indexTypes) return singleProp;
    const props = propSet ? arrayFrom(propSet.values()) : [singleProp];
    let declarations: Declaration[] | undefined;
    let firstType: Type | undefined;
    let nameType: Type | undefined;
    const propTypes: Type[] = [];
    let firstValueDeclaration: Declaration | undefined;
    let hasNonUniformValueDeclaration = false;
    for (const prop of props) {
      if (!firstValueDeclaration) firstValueDeclaration = prop.valueDeclaration;
      else if (prop.valueDeclaration && prop.valueDeclaration !== firstValueDeclaration) {
        hasNonUniformValueDeclaration = true;
      }
      declarations = addRange(declarations, prop.declarations);
      const type = getTypeOfSymbol(prop);
      if (!firstType) {
        firstType = type;
        nameType = s.getLinks(prop).nameType;
      } else if (type !== firstType) {
        checkFlags |= qt.CheckFlags.HasNonUniformType;
      }
      if (isLiteralType(type)) checkFlags |= qt.CheckFlags.HasLiteralType;
      if (type.flags & qt.TypeFlags.Never) checkFlags |= qt.CheckFlags.HasNeverType;
      propTypes.push(type);
    }
    addRange(propTypes, indexTypes);
    const result = new Symbol(SymbolFlags.Property | optionalFlag, name, syntheticFlag | checkFlags);
    result.containingType = containingType;
    if (!hasNonUniformValueDeclaration && firstValueDeclaration) {
      result.valueDeclaration = firstValueDeclaration;
      if (firstValueDeclaration.symbol.parent) result.parent = firstValueDeclaration.symbol.parent;
    }
    result.declarations = declarations!;
    result.nameType = nameType;
    if (propTypes.length > 2) {
      result.checkFlags |= qt.CheckFlags.DeferredType;
      result.deferralParent = containingType;
      result.deferralConstituents = propTypes;
    } else {
      result.type = isUnion ? getUnionType(propTypes) : getIntersectionType(propTypes);
    }
    return result;
  }
  function isNeverReducedProperty(prop: Symbol) {
    return isDiscriminantWithNeverType(prop) || isConflictingPrivateProperty(prop);
  }
  function isDiscriminantWithNeverType(prop: Symbol) {
    return (
      !(prop.flags & qt.SymbolFlags.Optional) &&
      (getCheckFlags(prop) & (CheckFlags.Discriminant | qt.CheckFlags.HasNeverType)) === qt.CheckFlags.Discriminant &&
      !!(getTypeOfSymbol(prop).flags & qt.TypeFlags.Never)
    );
  }
  function isConflictingPrivateProperty(prop: Symbol) {
    return !prop.valueDeclaration && !!(getCheckFlags(prop) & qt.CheckFlags.ContainsPrivate);
  }
  function elaborateNeverIntersection(errorInfo: qd.MessageChain | undefined, type: Type) {
    if (getObjectFlags(type) & ObjectFlags.IsNeverIntersection) {
      const neverProp = find(getPropertiesOfUnionOrIntersectionType(<IntersectionType>type), isDiscriminantWithNeverType);
      if (neverProp) {
        return chainqd.Messages(
          errorInfo,
          qd.msgs.The_intersection_0_was_reduced_to_never_because_property_1_has_conflicting_types_in_some_constituents,
          typeToString(type, undefined, TypeFormatFlags.NoTypeReduction),
          neverProp.symbolToString()
        );
      }
      const privateProp = find(getPropertiesOfUnionOrIntersectionType(<IntersectionType>type), isConflictingPrivateProperty);
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
  function symbolsToArray(symbols: SymbolTable): Symbol[] {
    const result: Symbol[] = [];
    symbols.forEach((symbol, id) => {
      if (!qy.is.reservedName(id)) result.push(symbol);
    });
    return result;
  }
  function isDocOptionalParameter(node: ParameterDeclaration) {
    return (
      is.inJSFile(node) &&
      ((node.type && node.type.kind === Syntax.DocOptionalType) ||
        qc.getDoc.parameterTags(node).some(({ isBracketed, typeExpression }) => isBracketed || (!!typeExpression && typeExpression.type.kind === Syntax.DocOptionalType)))
    );
  }
  function tryFindAmbientModule(moduleName: string, withAugmentations: boolean) {
    if (isExternalModuleNameRelative(moduleName)) return;
    const symbol = getSymbol(globals, ('"' + moduleName + '"') as qb.__String, qt.SymbolFlags.ValueModule);
    return symbol && withAugmentations ? getMergedSymbol(symbol) : symbol;
  }
  function isOptionalParameter(node: ParameterDeclaration | DocParameterTag) {
    if (has.questionToken(node) || isOptionalDocParameterTag(node) || isDocOptionalParameter(node)) return true;
    if (node.initer) {
      const signature = getSignatureFromDeclaration(node.parent);
      const parameterIndex = node.parent.parameters.indexOf(node);
      assert(parameterIndex >= 0);
      return parameterIndex >= getMinArgumentCount(signature, true);
    }
    const iife = get.immediatelyInvokedFunctionExpression(node.parent);
    if (iife) return !node.type && !node.dot3Token && node.parent.parameters.indexOf(node) >= iife.arguments.length;
    return false;
  }
  function isOptionalDocParameterTag(node: Node): node is DocParameterTag {
    if (!is.kind(qc.DocParameterTag, node)) return false;
    const { isBracketed, typeExpression } = node;
    return isBracketed || (!!typeExpression && typeExpression.type.kind === Syntax.DocOptionalType);
  }
  function createTypePredicate(kind: TypePredicateKind, parameterName: string | undefined, parameterIndex: number | undefined, type: Type | undefined): TypePredicate {
    return { kind, parameterName, parameterIndex, type } as TypePredicate;
  }
  function fillMissingTypeArguments(typeArguments: readonly Type[], typeParameters: readonly TypeParameter[] | undefined, minTypeArgumentCount: number, isJavaScriptImplicitAny: boolean): Type[];
  function fillMissingTypeArguments(
    typeArguments: readonly Type[] | undefined,
    typeParameters: readonly TypeParameter[] | undefined,
    minTypeArgumentCount: number,
    isJavaScriptImplicitAny: boolean
  ): Type[] | undefined;
  function fillMissingTypeArguments(typeArguments: readonly Type[] | undefined, typeParameters: readonly TypeParameter[] | undefined, minTypeArgumentCount: number, isJavaScriptImplicitAny: boolean) {
    const numTypeParameters = length(typeParameters);
    if (!numTypeParameters) return [];
    const numTypeArguments = length(typeArguments);
    if (isJavaScriptImplicitAny || (numTypeArguments >= minTypeArgumentCount && numTypeArguments <= numTypeParameters)) {
      const result = typeArguments ? typeArguments.slice() : [];
      for (let i = numTypeArguments; i < numTypeParameters; i++) {
        result[i] = errorType;
      }
      const baseDefaultType = getDefaultTypeArgumentType(isJavaScriptImplicitAny);
      for (let i = numTypeArguments; i < numTypeParameters; i++) {
        let defaultType = getDefaultFromTypeParameter(typeParameters![i]);
        if (isJavaScriptImplicitAny && defaultType && (isTypeIdenticalTo(defaultType, unknownType) || isTypeIdenticalTo(defaultType, emptyObjectType))) defaultType = anyType;
        result[i] = defaultType ? instantiateType(defaultType, createTypeMapper(typeParameters!, result)) : baseDefaultType;
      }
      result.length = typeParameters!.length;
      return result;
    }
    return typeArguments && typeArguments.slice();
  }
  function maybeAddJsSyntheticRestParameter(declaration: SignatureDeclaration | DocSignature, parameters: Symbol[]): boolean {
    if (is.kind(qc.DocSignature, declaration) || !containsArgumentsReference(declaration)) return false;
    const lastParam = lastOrUndefined(declaration.parameters);
    const lastParamTags = lastParam ? qc.getDoc.parameterTags(lastParam) : qc.getDoc.tags(declaration).filter(isDocParameterTag);
    const lastParamVariadicType = firstDefined(lastParamTags, (p) => (p.typeExpression && is.kind(qc.DocVariadicType, p.typeExpression.type) ? p.typeExpression.type : undefined));
    const syntheticArgsSymbol = new Symbol(SymbolFlags.Variable, 'args' as qb.__String, qt.CheckFlags.RestParameter);
    syntheticArgsSymbol.type = lastParamVariadicType ? createArrayType(getTypeFromTypeNode(lastParamVariadicType.type)) : anyArrayType;
    if (lastParamVariadicType) parameters.pop();
    parameters.push(syntheticArgsSymbol);
    return true;
  }
  function containsArgumentsReference(declaration: SignatureDeclaration): boolean {
    const links = getNodeLinks(declaration);
    if (links.containsArgumentsReference === undefined) {
      if (links.flags & NodeCheckFlags.CaptureArguments) links.containsArgumentsReference = true;
      else {
        links.containsArgumentsReference = traverse((declaration as FunctionLikeDeclaration).body!);
      }
    }
    return links.containsArgumentsReference;
    function traverse(node: Node): boolean {
      if (!node) return false;
      switch (node.kind) {
        case Syntax.Identifier:
          return (<Identifier>node).escapedText === 'arguments' && is.expressionNode(node);
        case Syntax.PropertyDeclaration:
        case Syntax.MethodDeclaration:
        case Syntax.GetAccessor:
        case Syntax.SetAccessor:
          return (<NamedDeclaration>node).name!.kind === Syntax.ComputedPropertyName && traverse((<NamedDeclaration>node).name!);
        default:
          return !nodeStartsNewLexicalEnvironment(node) && !is.partOfTypeNode(node) && !!qc.forEach.child(node, traverse);
      }
    }
  }
  function resolveExternalModuleTypeByLiteral(name: StringLiteral) {
    const moduleSym = resolveExternalModuleName(name, name);
    if (moduleSym) {
      const resolvedModuleSymbol = resolveExternalModuleSymbol(moduleSym);
      if (resolvedModuleSymbol) return getTypeOfSymbol(resolvedModuleSymbol);
    }
    return anyType;
  }
  function createTypePredicateFromTypePredicateNode(node: TypePredicateNode, signature: Signature): TypePredicate {
    const parameterName = node.parameterName;
    const type = node.type && getTypeFromTypeNode(node.type);
    return parameterName.kind === Syntax.ThisType
      ? createTypePredicate(node.assertsModifier ? TypePredicateKind.AssertsThis : TypePredicateKind.This, undefined, type)
      : createTypePredicate(
          node.assertsModifier ? TypePredicateKind.AssertsIdentifier : TypePredicateKind.Identifier,
          parameterName.escapedText as string,
          findIndex(signature.parameters, (p) => p.escName === parameterName.escapedText),
          type
        );
  }
  function isResolvingReturnTypeOfSignature(signature: Signature) {
    return !signature.resolvedReturnType && findResolutionCycleStartIndex(signature, TypeSystemPropertyName.ResolvedReturnType) >= 0;
  }
  function tryGetRestTypeOfSignature(signature: Signature): Type | undefined {
    if (signatureHasRestParameter(signature)) {
      const sigRestType = getTypeOfSymbol(signature.parameters[signature.parameters.length - 1]);
      const restType = isTupleType(sigRestType) ? getRestTypeOfTupleType(sigRestType) : sigRestType;
      return restType && getIndexTypeOfType(restType, IndexKind.Number);
    }
    return;
  }
  function createSignatureInstantiation(signature: Signature, typeArguments: readonly Type[] | undefined): Signature {
    return instantiateSignature(signature, createSignatureTypeMapper(signature, typeArguments), true);
  }
  function createSignatureTypeMapper(signature: Signature, typeArguments: readonly Type[] | undefined): TypeMapper {
    return createTypeMapper(signature.typeParameters!, typeArguments);
  }
  function createErasedSignature(signature: Signature) {
    return instantiateSignature(signature, createTypeEraser(signature.typeParameters!), true);
  }
  function createCanonicalSignature(signature: Signature) {
    return getSignatureInstantiation(
      signature,
      map(signature.typeParameters, (tp) => (tp.target && !getConstraintOfTypeParameter(tp.target) ? tp.target : tp)),
      is.inJSFile(signature.declaration)
    );
  }
  function createIndexInfo(type: Type, isReadonly: boolean, declaration?: IndexSignatureDeclaration): IndexInfo {
    return { type, isReadonly, declaration };
  }
  function createTypeReference(target: GenericType, typeArguments: readonly Type[] | undefined): TypeReference {
    const id = getTypeListId(typeArguments);
    let type = target.instantiations.get(id);
    if (!type) {
      type = <TypeReference>createObjectType(ObjectFlags.Reference, target.symbol);
      target.instantiations.set(id, type);
      type.objectFlags |= typeArguments ? getPropagatingFlagsOfTypes(typeArguments, 0) : 0;
      type.target = target;
      type.resolvedTypeArguments = typeArguments;
    }
    return type;
  }
  function cloneTypeReference(source: TypeReference): TypeReference {
    const type = <TypeReference>createType(source.flags);
    type.symbol = source.symbol;
    type.objectFlags = source.objectFlags;
    type.target = source.target;
    type.resolvedTypeArguments = source.resolvedTypeArguments;
    return type;
  }
  function createDeferredTypeReference(target: GenericType, node: TypeReferenceNode | ArrayTypeNode | TupleTypeNode, mapper?: TypeMapper): DeferredTypeReference {
    const aliasSymbol = getAliasSymbolForTypeNode(node);
    const aliasTypeArguments = getTypeArgumentsForAliasSymbol(aliasSymbol);
    const type = <DeferredTypeReference>createObjectType(ObjectFlags.Reference, target.symbol);
    type.target = target;
    type.node = node;
    type.mapper = mapper;
    type.aliasSymbol = aliasSymbol;
    type.aliasTypeArguments = mapper ? instantiateTypes(aliasTypeArguments, mapper) : aliasTypeArguments;
    return type;
  }
  function resolveTypeReferenceName(typeReferenceName: EntityNameExpression | EntityName | undefined, meaning: qt.SymbolFlags, ignoreErrors?: boolean) {
    if (!typeReferenceName) return unknownSymbol;
    return resolveEntityName(typeReferenceName, meaning, ignoreErrors) || unknownSymbol;
  }
  function isUnaryTupleTypeNode(node: TypeNode) {
    return node.kind === Syntax.TupleType && (<TupleTypeNode>node).elements.length === 1;
  }
  function isDocTypeReference(node: Node): node is TypeReferenceNode {
    return !!(node.flags & NodeFlags.Doc) && (node.kind === Syntax.TypeReference || node.kind === Syntax.ImportType);
  }
  function typeArgumentsFromTypeReferenceNode(node: NodeWithTypeArguments): Type[] | undefined {
    return map(node.typeArguments, getTypeFromTypeNode);
  }
  function createTypeFromGenericGlobalType(genericGlobalType: GenericType, typeArguments: readonly Type[]): ObjectType {
    return genericGlobalType !== emptyGenericType ? createTypeReference(genericGlobalType, typeArguments) : emptyObjectType;
  }
  function createTypedPropertyDescriptorType(propertyType: Type): Type {
    return createTypeFromGenericGlobalType(getGlobalTypedPropertyDescriptorType(), [propertyType]);
  }
  function createIterableType(iteratedType: Type): Type {
    return createTypeFromGenericGlobalType(getGlobalIterableType(true), [iteratedType]);
  }
  function createArrayType(elementType: Type, readonly?: boolean): ObjectType {
    return createTypeFromGenericGlobalType(readonly ? globalReadonlyArrayType : globalArrayType, [elementType]);
  }
  function isTupleRestElement(node: TypeNode) {
    return node.kind === Syntax.RestType || (node.kind === Syntax.NamedTupleMember && !!(node as NamedTupleMember).dot3Token);
  }
  function isTupleOptionalElement(node: TypeNode) {
    return node.kind === Syntax.OptionalType || (node.kind === Syntax.NamedTupleMember && !!(node as NamedTupleMember).questionToken);
  }
  function isDeferredTypeReferenceNode(node: TypeReferenceNode | ArrayTypeNode | TupleTypeNode, hasDefaultTypeArguments?: boolean) {
    return (
      !!getAliasSymbolForTypeNode(node) ||
      (isResolvedByTypeAlias(node) &&
        (node.kind === Syntax.ArrayType
          ? mayResolveTypeAlias(node.elementType)
          : node.kind === Syntax.TupleType
          ? some(node.elements, mayResolveTypeAlias)
          : hasDefaultTypeArguments || some(node.typeArguments, mayResolveTypeAlias)))
    );
  }
  function isResolvedByTypeAlias(node: Node): boolean {
    const parent = node.parent;
    switch (parent.kind) {
      case Syntax.ParenthesizedType:
      case Syntax.NamedTupleMember:
      case Syntax.TypeReference:
      case Syntax.UnionType:
      case Syntax.IntersectionType:
      case Syntax.IndexedAccessType:
      case Syntax.ConditionalType:
      case Syntax.TypeOperator:
      case Syntax.ArrayType:
      case Syntax.TupleType:
        return isResolvedByTypeAlias(parent);
      case Syntax.TypeAliasDeclaration:
        return true;
    }
    return false;
  }
  function mayResolveTypeAlias(node: Node): boolean {
    switch (node.kind) {
      case Syntax.TypeReference:
        return isDocTypeReference(node) || !!(resolveTypeReferenceName((<TypeReferenceNode>node).typeName, qt.SymbolFlags.Type).flags & qt.SymbolFlags.TypeAlias);
      case Syntax.TypeQuery:
        return true;
      case Syntax.TypeOperator:
        return (<TypeOperatorNode>node).operator !== Syntax.UniqueKeyword && mayResolveTypeAlias((<TypeOperatorNode>node).type);
      case Syntax.ParenthesizedType:
      case Syntax.OptionalType:
      case Syntax.NamedTupleMember:
      case Syntax.DocOptionalType:
      case Syntax.DocNullableType:
      case Syntax.DocNonNullableType:
      case Syntax.DocTypeExpression:
        return mayResolveTypeAlias((<ParenthesizedTypeNode | OptionalTypeNode | DocTypeReferencingNode | NamedTupleMember>node).type);
      case Syntax.RestType:
        return (<RestTypeNode>node).type.kind !== Syntax.ArrayType || mayResolveTypeAlias((<ArrayTypeNode>(<RestTypeNode>node).type).elementType);
      case Syntax.UnionType:
      case Syntax.IntersectionType:
        return some((<UnionOrIntersectionTypeNode>node).types, mayResolveTypeAlias);
      case Syntax.IndexedAccessType:
        return mayResolveTypeAlias((<IndexedAccessTypeNode>node).objectType) || mayResolveTypeAlias((<IndexedAccessTypeNode>node).indexType);
      case Syntax.ConditionalType:
        return (
          mayResolveTypeAlias((<ConditionalTypeNode>node).checkType) ||
          mayResolveTypeAlias((<ConditionalTypeNode>node).extendsType) ||
          mayResolveTypeAlias((<ConditionalTypeNode>node).trueType) ||
          mayResolveTypeAlias((<ConditionalTypeNode>node).falseType)
        );
    }
    return false;
  }
  function isReadonlyTypeOperator(node: Node) {
    return is.kind(qc.TypeOperatorNode, node) && node.operator === Syntax.ReadonlyKeyword;
  }
  function createTupleTypeOfArity(
    arity: number,
    minLength: number,
    hasRestElement: boolean,
    readonly: boolean,
    namedMemberDeclarations: readonly (NamedTupleMember | ParameterDeclaration)[] | undefined
  ): TupleType {
    let typeParameters: TypeParameter[] | undefined;
    const properties: Symbol[] = [];
    const maxLength = hasRestElement ? arity - 1 : arity;
    if (arity) {
      typeParameters = new Array(arity);
      for (let i = 0; i < arity; i++) {
        const typeParameter = (typeParameters[i] = createTypeParameter());
        if (i < maxLength) {
          const property = new Symbol(SymbolFlags.Property | (i >= minLength ? qt.SymbolFlags.Optional : 0), ('' + i) as qb.__String, readonly ? qt.CheckFlags.Readonly : 0);
          property.tupleLabelDeclaration = namedMemberDeclarations?.[i];
          property.type = typeParameter;
          properties.push(property);
        }
      }
    }
    const literalTypes = [];
    for (let i = minLength; i <= maxLength; i++) literalTypes.push(getLiteralType(i));
    const lengthSymbol = new Symbol(SymbolFlags.Property, 'length' as qb.__String);
    lengthSymbol.type = hasRestElement ? numberType : getUnionType(literalTypes);
    properties.push(lengthSymbol);
    const type = <TupleType & InterfaceTypeWithDeclaredMembers>createObjectType(ObjectFlags.Tuple | ObjectFlags.Reference);
    type.typeParameters = typeParameters;
    type.outerTypeParameters = undefined;
    type.localTypeParameters = typeParameters;
    type.instantiations = new qb.QMap<TypeReference>();
    type.instantiations.set(getTypeListId(type.typeParameters), <GenericType>type);
    type.target = <GenericType>type;
    type.resolvedTypeArguments = type.typeParameters;
    type.thisType = createTypeParameter();
    type.thisType.isThisType = true;
    type.thisType.constraint = type;
    type.declaredProperties = properties;
    type.declaredCallSignatures = empty;
    type.declaredConstructSignatures = empty;
    type.declaredStringIndexInfo = undefined;
    type.declaredNumberIndexInfo = undefined;
    type.minLength = minLength;
    type.hasRestElement = hasRestElement;
    type.readonly = readonly;
    type.labeledElementDeclarations = namedMemberDeclarations;
    return type;
  }
  function createTupleType(
    elementTypes: readonly Type[],
    minLength = elementTypes.length,
    hasRestElement = false,
    readonly = false,
    namedMemberDeclarations?: readonly (NamedTupleMember | ParameterDeclaration)[]
  ) {
    const arity = elementTypes.length;
    if (arity === 1 && hasRestElement) return createArrayType(elementTypes[0], readonly);
    const tupleType = getTupleTypeOfArity(arity, minLength, arity > 0 && hasRestElement, readonly, namedMemberDeclarations);
    return elementTypes.length ? createTypeReference(tupleType, elementTypes) : tupleType;
  }
  function sliceTupleType(type: TupleTypeReference, index: number) {
    const tuple = type.target;
    if (tuple.hasRestElement) index = Math.min(index, getTypeReferenceArity(type) - 1);
    return createTupleType(
      getTypeArguments(type).slice(index),
      Math.max(0, tuple.minLength - index),
      tuple.hasRestElement,
      tuple.readonly,
      tuple.labeledElementDeclarations && tuple.labeledElementDeclarations.slice(index)
    );
  }
  function containsType(types: readonly Type[], type: Type): boolean {
    return binarySearch(types, type, getTypeId, compareNumbers) >= 0;
  }
  function insertType(types: Type[], type: Type): boolean {
    const index = binarySearch(types, type, getTypeId, compareNumbers);
    if (index < 0) {
      types.splice(~index, 0, type);
      return true;
    }
    return false;
  }
  function addTypeToUnion(typeSet: Type[], includes: qt.TypeFlags, type: Type) {
    const flags = type.flags;
    if (flags & qt.TypeFlags.Union) return addTypesToUnion(typeSet, includes, (<UnionType>type).types);
    if (!(flags & qt.TypeFlags.Never)) {
      includes |= flags & qt.TypeFlags.IncludesMask;
      if (flags & qt.TypeFlags.StructuredOrInstantiable) includes |= qt.TypeFlags.IncludesStructuredOrInstantiable;
      if (type === wildcardType) includes |= qt.TypeFlags.IncludesWildcard;
      if (!strictNullChecks && flags & qt.TypeFlags.Nullable)
        if (!(getObjectFlags(type) & ObjectFlags.ContainsWideningType)) includes |= qt.TypeFlags.IncludesNonWideningType;
        else {
          const len = typeSet.length;
          const index = len && type.id > typeSet[len - 1].id ? ~len : binarySearch(typeSet, type, getTypeId, compareNumbers);
          if (index < 0) typeSet.splice(~index, 0, type);
        }
    }
    return includes;
  }
  function addTypesToUnion(typeSet: Type[], includes: qt.TypeFlags, types: readonly Type[]): qt.TypeFlags {
    for (const type of types) {
      includes = addTypeToUnion(typeSet, includes, type);
    }
    return includes;
  }
  function isSetOfLiteralsFromSameEnum(types: readonly Type[]): boolean {
    const first = types[0];
    if (first.flags & qt.TypeFlags.EnumLiteral) {
      const firstEnum = getParentOfSymbol(first.symbol);
      for (let i = 1; i < types.length; i++) {
        const other = types[i];
        if (!(other.flags & qt.TypeFlags.EnumLiteral) || firstEnum !== getParentOfSymbol(other.symbol)) return false;
      }
      return true;
    }
    return false;
  }
  function removeSubtypes(types: Type[], primitivesOnly: boolean): boolean {
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
            isTypeRelatedTo(source, target, strictSubtypeRelation) &&
            (!(getObjectFlags(getTargetType(source)) & ObjectFlags.Class) || !(getObjectFlags(getTargetType(target)) & ObjectFlags.Class) || isTypeDerivedFrom(source, target))
          ) {
            orderedRemoveItemAt(types, i);
            break;
          }
        }
      }
    }
    return true;
  }
  function removeRedundantLiteralTypes(types: Type[], includes: qt.TypeFlags) {
    let i = types.length;
    while (i > 0) {
      i--;
      const t = types[i];
      const remove =
        (t.flags & qt.TypeFlags.StringLiteral && includes & qt.TypeFlags.String) ||
        (t.flags & qt.TypeFlags.NumberLiteral && includes & qt.TypeFlags.Number) ||
        (t.flags & qt.TypeFlags.BigIntLiteral && includes & qt.TypeFlags.BigInt) ||
        (t.flags & qt.TypeFlags.UniqueESSymbol && includes & qt.TypeFlags.ESSymbol) ||
        (isFreshLiteralType(t) && containsType(types, (<LiteralType>t).regularType));
      if (remove) orderedRemoveItemAt(types, i);
    }
  }
  function typePredicateKindsMatch(a: TypePredicate, b: TypePredicate): boolean {
    return a.kind === b.kind && a.parameterIndex === b.parameterIndex;
  }
  function addTypeToIntersection(typeSet: qb.QMap<Type>, includes: qt.TypeFlags, type: Type) {
    const flags = type.flags;
    if (flags & qt.TypeFlags.Intersection) return addTypesToIntersection(typeSet, includes, (<IntersectionType>type).types);
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
  function addTypesToIntersection(typeSet: qb.QMap<Type>, includes: qt.TypeFlags, types: readonly Type[]) {
    for (const type of types) {
      includes = addTypeToIntersection(typeSet, includes, getRegularTypeOfLiteralType(type));
    }
    return includes;
  }
  function removeRedundantPrimitiveTypes(types: Type[], includes: qt.TypeFlags) {
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
  function eachUnionContains(unionTypes: UnionType[], type: Type) {
    for (const u of unionTypes) {
      if (!containsType(u.types, type)) {
        const primitive =
          type.flags & qt.TypeFlags.StringLiteral
            ? stringType
            : type.flags & qt.TypeFlags.NumberLiteral
            ? numberType
            : type.flags & qt.TypeFlags.BigIntLiteral
            ? bigintType
            : type.flags & qt.TypeFlags.UniqueESSymbol
            ? esSymbolType
            : undefined;
        if (!primitive || !containsType(u.types, primitive)) return false;
      }
    }
    return true;
  }
  function extractIrreducible(types: Type[], flag: qt.TypeFlags) {
    if (every(types, (t) => !!(t.flags & qt.TypeFlags.Union) && some((t as UnionType).types, (tt) => !!(tt.flags & flag)))) {
      for (let i = 0; i < types.length; i++) {
        types[i] = filterType(types[i], (t) => !(t.flags & flag));
      }
      return true;
    }
    return false;
  }
  function intersectUnionsOfPrimitiveTypes(types: Type[]) {
    let unionTypes: UnionType[] | undefined;
    const index = findIndex(types, (t) => !!(getObjectFlags(t) & ObjectFlags.PrimitiveUnion));
    if (index < 0) return false;
    let i = index + 1;
    while (i < types.length) {
      const t = types[i];
      if (getObjectFlags(t) & ObjectFlags.PrimitiveUnion) {
        (unionTypes || (unionTypes = [<UnionType>types[index]])).push(<UnionType>t);
        orderedRemoveItemAt(types, i);
      } else {
        i++;
      }
    }
    if (!unionTypes) return false;
    const checked: Type[] = [];
    const result: Type[] = [];
    for (const u of unionTypes) {
      for (const t of u.types) {
        if (insertType(checked, t)) {
          if (eachUnionContains(unionTypes, t)) insertType(result, t);
        }
      }
    }
    types[index] = getUnionTypeFromSortedList(result, ObjectFlags.PrimitiveUnion);
    return true;
  }
  function createIntersectionType(types: Type[], aliasSymbol?: Symbol, aliasTypeArguments?: readonly Type[]) {
    const result = <IntersectionType>createType(TypeFlags.Intersection);
    result.objectFlags = getPropagatingFlagsOfTypes(types, qt.TypeFlags.Nullable);
    result.types = types;
    result.aliasSymbol = aliasSymbol;
    result.aliasTypeArguments = aliasTypeArguments;
    return result;
  }
  function createIndexType(type: InstantiableType | UnionOrIntersectionType, stringsOnly: boolean) {
    const result = <IndexType>createType(TypeFlags.Index);
    result.type = type;
    result.stringsOnly = stringsOnly;
    return result;
  }
  function createIndexedAccessType(objectType: Type, indexType: Type) {
    const type = <IndexedAccessType>createType(TypeFlags.IndexedAccess);
    type.objectType = objectType;
    type.indexType = indexType;
    return type;
  }
  function isJSLiteralType(type: Type): boolean {
    if (noImplicitAny) return false;
    if (getObjectFlags(type) & ObjectFlags.JSLiteral) return true;
    if (type.flags & qt.TypeFlags.Union) return every((type as UnionType).types, isJSLiteralType);
    if (type.flags & qt.TypeFlags.Intersection) return some((type as IntersectionType).types, isJSLiteralType);
    if (type.flags & qt.TypeFlags.Instantiable) return isJSLiteralType(getResolvedBaseConstraint(type));
    return false;
  }
  function isGenericObjectType(type: Type): boolean {
    if (type.flags & qt.TypeFlags.UnionOrIntersection) {
      if (!((<UnionOrIntersectionType>type).objectFlags & ObjectFlags.IsGenericObjectTypeComputed)) {
        (<UnionOrIntersectionType>type).objectFlags |=
          ObjectFlags.IsGenericObjectTypeComputed | (some((<UnionOrIntersectionType>type).types, isGenericObjectType) ? ObjectFlags.IsGenericObjectType : 0);
      }
      return !!((<UnionOrIntersectionType>type).objectFlags & ObjectFlags.IsGenericObjectType);
    }
    return !!(type.flags & qt.TypeFlags.InstantiableNonPrimitive) || isGenericMappedType(type);
  }
  function isGenericIndexType(type: Type): boolean {
    if (type.flags & qt.TypeFlags.UnionOrIntersection) {
      if (!((<UnionOrIntersectionType>type).objectFlags & ObjectFlags.IsGenericIndexTypeComputed))
        (<UnionOrIntersectionType>type).objectFlags |= ObjectFlags.IsGenericIndexTypeComputed | (some((<UnionOrIntersectionType>type).types, isGenericIndexType) ? ObjectFlags.IsGenericIndexType : 0);
      return !!((<UnionOrIntersectionType>type).objectFlags & ObjectFlags.IsGenericIndexType);
    }
    return !!(type.flags & (TypeFlags.InstantiableNonPrimitive | qt.TypeFlags.Index));
  }
  function isThisTypeParameter(type: Type): boolean {
    return !!(type.flags & qt.TypeFlags.TypeParameter && (<TypeParameter>type).isThisType);
  }
  function distributeIndexOverObjectType(objectType: Type, indexType: Type, writing: boolean) {
    if (objectType.flags & qt.TypeFlags.UnionOrIntersection) {
      const types = map((objectType as UnionOrIntersectionType).types, (t) => getSimplifiedType(getIndexedAccessType(t, indexType), writing));
      return objectType.flags & qt.TypeFlags.Intersection || writing ? getIntersectionType(types) : getUnionType(types);
    }
  }
  function distributeObjectOverIndexType(objectType: Type, indexType: Type, writing: boolean) {
    if (indexType.flags & qt.TypeFlags.Union) {
      const types = map((indexType as UnionType).types, (t) => getSimplifiedType(getIndexedAccessType(objectType, t), writing));
      return writing ? getIntersectionType(types) : getUnionType(types);
    }
  }
  function unwrapSubstitution(type: Type): Type {
    if (type.flags & qt.TypeFlags.Substitution) return (type as SubstitutionType).substitute;
    return type;
  }
  function isIntersectionEmpty(type1: Type, type2: Type) {
    return !!(getUnionType([intersectTypes(type1, type2), neverType]).flags & qt.TypeFlags.Never);
  }
  function substituteIndexedMappedType(objectType: MappedType, index: Type) {
    const mapper = createTypeMapper([getTypeParameterFromMappedType(objectType)], [index]);
    const templateMapper = combineTypeMappers(objectType.mapper, mapper);
    return instantiateType(getTemplateTypeFromMappedType(objectType), templateMapper);
  }
  function resolveImportSymbolType(node: ImportTypeNode, links: NodeLinks, symbol: Symbol, meaning: qt.SymbolFlags) {
    const resolvedSymbol = symbol.resolveSymbol();
    links.resolvedSymbol = resolvedSymbol;
    if (meaning === qt.SymbolFlags.Value) return this.getTypeOfSymbol();
    return getTypeReferenceType(node, resolvedSymbol);
  }
  function isNonGenericObjectType(type: Type) {
    return !!(type.flags & qt.TypeFlags.Object) && !isGenericMappedType(type);
  }
  function isEmptyObjectTypeOrSpreadsIntoEmptyObject(type: Type) {
    return (
      isEmptyObjectType(type) ||
      !!(
        type.flags &
        (TypeFlags.Null |
          qt.TypeFlags.Undefined |
          qt.TypeFlags.BooleanLike |
          qt.TypeFlags.NumberLike |
          qt.TypeFlags.BigIntLike |
          qt.TypeFlags.StringLike |
          qt.TypeFlags.EnumLike |
          qt.TypeFlags.NonPrimitive |
          qt.TypeFlags.Index)
      )
    );
  }
  function isSinglePropertyAnonymousObjectType(type: Type) {
    return (
      !!(type.flags & qt.TypeFlags.Object) &&
      !!(getObjectFlags(type) & ObjectFlags.Anonymous) &&
      (length(getPropertiesOfType(type)) === 1 || every(getPropertiesOfType(type), (p) => !!(p.flags & qt.SymbolFlags.Optional)))
    );
  }
  function tryMergeUnionOfObjectTypeAndEmptyObject(type: UnionType, readonly: boolean): Type | undefined {
    if (type.types.length === 2) {
      const firstType = type.types[0];
      const secondType = type.types[1];
      if (every(type.types, isEmptyObjectTypeOrSpreadsIntoEmptyObject)) return isEmptyObjectType(firstType) ? firstType : isEmptyObjectType(secondType) ? secondType : emptyObjectType;
      if (isEmptyObjectTypeOrSpreadsIntoEmptyObject(firstType) && isSinglePropertyAnonymousObjectType(secondType)) return getAnonymousPartialType(secondType);
      if (isEmptyObjectTypeOrSpreadsIntoEmptyObject(secondType) && isSinglePropertyAnonymousObjectType(firstType)) return getAnonymousPartialType(firstType);
    }
    function getAnonymousPartialType(type: Type) {
      const members = new SymbolTable();
      for (const prop of getPropertiesOfType(type)) {
        if (getDeclarationModifierFlagsFromSymbol(prop) & (ModifierFlags.Private | ModifierFlags.Protected)) {
        } else if (isSpreadableProperty(prop)) {
          const isSetonlyAccessor = prop.flags & qt.SymbolFlags.SetAccessor && !(prop.flags & qt.SymbolFlags.GetAccessor);
          const flags = qt.SymbolFlags.Property | qt.SymbolFlags.Optional;
          const result = new Symbol(flags, prop.escName, readonly ? qt.CheckFlags.Readonly : 0);
          result.type = isSetonlyAccessor ? undefinedType : getTypeOfSymbol(prop);
          result.declarations = prop.declarations;
          result.nameType = s.getLinks(prop).nameType;
          result.syntheticOrigin = prop;
          members.set(prop.escName, result);
        }
      }
      const spread = createAnonymousType(type.symbol, members, empty, empty, getIndexInfoOfType(type, IndexKind.String), getIndexInfoOfType(type, IndexKind.Number));
      spread.objectFlags |= ObjectFlags.ObjectLiteral | ObjectFlags.ContainsObjectOrArrayLiteral;
      return spread;
    }
  }
  function isSpreadableProperty(prop: Symbol): boolean {
    return (
      !some(prop.declarations, isPrivateIdentifierPropertyDeclaration) &&
      (!(prop.flags & (SymbolFlags.Method | qt.SymbolFlags.GetAccessor | qt.SymbolFlags.SetAccessor)) || !prop.declarations.some((decl) => is.classLike(decl.parent)))
    );
  }
  function createLiteralType(flags: qt.TypeFlags, value: string | number | PseudoBigInt, symbol: Symbol | undefined) {
    const type = <LiteralType>createType(flags);
    type.symbol = symbol!;
    type.value = value;
    return type;
  }
  function isFreshLiteralType(type: Type) {
    return !!(type.flags & qt.TypeFlags.Literal) && (<LiteralType>type).freshType === type;
  }
  function instantiateList<T>(items: readonly T[], mapper: TypeMapper, instantiator: (item: T, mapper: TypeMapper) => T): readonly T[];
  function instantiateList<T>(items: readonly T[] | undefined, mapper: TypeMapper, instantiator: (item: T, mapper: TypeMapper) => T): readonly T[] | undefined;
  function instantiateList<T>(items: readonly T[] | undefined, mapper: TypeMapper, instantiator: (item: T, mapper: TypeMapper) => T): readonly T[] | undefined {
    if (items && items.length) {
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const mapped = instantiator(item, mapper);
        if (item !== mapped) {
          const result = i === 0 ? [] : items.slice(0, i);
          result.push(mapped);
          for (i++; i < items.length; i++) {
            result.push(instantiator(items[i], mapper));
          }
          return result;
        }
      }
    }
    return items;
  }
  function instantiateTypes(types: readonly Type[], mapper: TypeMapper): readonly Type[];
  function instantiateTypes(types: readonly Type[] | undefined, mapper: TypeMapper): readonly Type[] | undefined;
  function instantiateTypes(types: readonly Type[] | undefined, mapper: TypeMapper): readonly Type[] | undefined {
    return instantiateList<Type>(types, mapper, instantiateType);
  }
  function instantiateSignatures(signatures: readonly Signature[], mapper: TypeMapper): readonly Signature[] {
    return instantiateList<Signature>(signatures, mapper, instantiateSignature);
  }
  function createTypeMapper(sources: readonly TypeParameter[], targets: readonly Type[] | undefined): TypeMapper {
    return sources.length === 1 ? makeUnaryTypeMapper(sources[0], targets ? targets[0] : anyType) : makeArrayTypeMapper(sources, targets);
  }
  function makeUnaryTypeMapper(source: Type, target: Type): TypeMapper {
    return { kind: TypeMapKind.Simple, source, target };
  }
  function makeArrayTypeMapper(sources: readonly TypeParameter[], targets: readonly Type[] | undefined): TypeMapper {
    return { kind: TypeMapKind.Array, sources, targets };
  }
  function makeFunctionTypeMapper(func: (t: Type) => Type): TypeMapper {
    return { kind: TypeMapKind.Function, func };
  }
  function makeCompositeTypeMapper(kind: TypeMapKind.Composite | TypeMapKind.Merged, mapper1: TypeMapper, mapper2: TypeMapper): TypeMapper {
    return { kind, mapper1, mapper2 };
  }
  function createTypeEraser(sources: readonly TypeParameter[]): TypeMapper {
    return createTypeMapper(sources, undefined);
  }
  function createBackreferenceMapper(context: InferenceContext, index: number): TypeMapper {
    return makeFunctionTypeMapper((t) => (findIndex(context.inferences, (info) => info.typeParameter === t) >= index ? unknownType : t));
  }
  function combineTypeMappers(mapper1: TypeMapper | undefined, mapper2: TypeMapper): TypeMapper {
    return mapper1 ? makeCompositeTypeMapper(TypeMapKind.Composite, mapper1, mapper2) : mapper2;
  }
  function mergeTypeMappers(mapper1: TypeMapper | undefined, mapper2: TypeMapper): TypeMapper {
    return mapper1 ? makeCompositeTypeMapper(TypeMapKind.Merged, mapper1, mapper2) : mapper2;
  }
  function prependTypeMapping(source: Type, target: Type, mapper: TypeMapper | undefined) {
    return !mapper ? makeUnaryTypeMapper(source, target) : makeCompositeTypeMapper(TypeMapKind.Merged, makeUnaryTypeMapper(source, target), mapper);
  }
  function appendTypeMapping(mapper: TypeMapper | undefined, source: Type, target: Type) {
    return !mapper ? makeUnaryTypeMapper(source, target) : makeCompositeTypeMapper(TypeMapKind.Merged, mapper, makeUnaryTypeMapper(source, target));
  }
  function cloneTypeParameter(typeParameter: TypeParameter): TypeParameter {
    const result = createTypeParameter(typeParameter.symbol);
    result.target = typeParameter;
    return result;
  }
  function instantiateTypePredicate(predicate: TypePredicate, mapper: TypeMapper): TypePredicate {
    return createTypePredicate(predicate.kind, predicate.parameterName, predicate.parameterIndex, instantiateType(predicate.type, mapper));
  }
  function instantiateSignature(signature: Signature, mapper: TypeMapper, eraseTypeParameters?: boolean): Signature {
    let freshTypeParameters: TypeParameter[] | undefined;
    if (signature.typeParameters && !eraseTypeParameters) {
      freshTypeParameters = map(signature.typeParameters, cloneTypeParameter);
      mapper = combineTypeMappers(createTypeMapper(signature.typeParameters, freshTypeParameters), mapper);
      for (const tp of freshTypeParameters) {
        tp.mapper = mapper;
      }
    }
    const result = createSignature(
      signature.declaration,
      freshTypeParameters,
      signature.thisParameter && instantiateSymbol(signature.thisParameter, mapper),
      instantiateList(signature.parameters, mapper, instantiateSymbol),
      undefined,
      undefined,
      signature.minArgumentCount,
      signature.flags & SignatureFlags.PropagatingFlags
    );
    result.target = signature;
    result.mapper = mapper;
    return result;
  }
  function instantiateSymbol(symbol: Symbol, mapper: TypeMapper): Symbol {
    const links = s.getLinks(symbol);
    if (links.type && !couldContainTypeVariables(links.type)) return symbol;
    if (this.getCheckFlags() & qt.CheckFlags.Instantiated) {
      symbol = links.target!;
      mapper = combineTypeMappers(links.mapper, mapper);
    }
    const result = new Symbol(
      symbol.flags,
      symbol.escName,
      qt.CheckFlags.Instantiated | (this.getCheckFlags() & (CheckFlags.Readonly | qt.CheckFlags.Late | qt.CheckFlags.OptionalParameter | qt.CheckFlags.RestParameter))
    );
    result.declarations = symbol.declarations;
    result.parent = symbol.parent;
    result.target = symbol;
    result.mapper = mapper;
    if (symbol.valueDeclaration) result.valueDeclaration = symbol.valueDeclaration;
    if (links.nameType) result.nameType = links.nameType;
    return result;
  }
  function maybeTypeParameterReference(node: Node) {
    return !(
      node.kind === Syntax.QualifiedName ||
      (node.parent.kind === Syntax.TypeReference && (<TypeReferenceNode>node.parent).typeArguments && node === (<TypeReferenceNode>node.parent).typeName) ||
      (node.parent.kind === Syntax.ImportType && (node.parent as ImportTypeNode).typeArguments && node === (node.parent as ImportTypeNode).qualifier)
    );
  }
  function isTypeParameterPossiblyReferenced(tp: TypeParameter, node: Node) {
    if (tp.symbol && tp.symbol.declarations && tp.symbol.declarations.length === 1) {
      const container = tp.symbol.declarations[0].parent;
      for (let n = node; n !== container; n = n.parent) {
        if (!n || n.kind === Syntax.Block || (n.kind === Syntax.ConditionalType && qc.forEach.child((<ConditionalTypeNode>n).extendsType, containsReference))) return true;
      }
      return !!qc.forEach.child(node, containsReference);
    }
    return true;
    function containsReference(node: Node): boolean {
      switch (node.kind) {
        case Syntax.ThisType:
          return !!tp.isThisType;
        case Syntax.Identifier:
          return !tp.isThisType && is.partOfTypeNode(node) && maybeTypeParameterReference(node) && getTypeFromTypeNodeWorker(<TypeNode>node) === tp;
        case Syntax.TypeQuery:
          return true;
      }
      return !!qc.forEach.child(node, containsReference);
    }
  }
  function instantiateMappedType(type: MappedType, mapper: TypeMapper): Type {
    const typeVariable = getHomomorphicTypeVariable(type);
    if (typeVariable) {
      const mappedTypeVariable = instantiateType(typeVariable, mapper);
      if (typeVariable !== mappedTypeVariable) {
        return mapType(getReducedType(mappedTypeVariable), (t) => {
          if (t.flags & (TypeFlags.AnyOrUnknown | qt.TypeFlags.InstantiableNonPrimitive | qt.TypeFlags.Object | qt.TypeFlags.Intersection) && t !== wildcardType && t !== errorType) {
            const replacementMapper = prependTypeMapping(typeVariable, t, mapper);
            return isArrayType(t)
              ? instantiateMappedArrayType(t, type, replacementMapper)
              : isTupleType(t)
              ? instantiateMappedTupleType(t, type, replacementMapper)
              : instantiateAnonymousType(type, replacementMapper);
          }
          return t;
        });
      }
    }
    return instantiateAnonymousType(type, mapper);
  }
  function instantiateMappedArrayType(arrayType: Type, mappedType: MappedType, mapper: TypeMapper) {
    const elementType = instantiateMappedTypeTemplate(mappedType, numberType, true, mapper);
    return elementType === errorType ? errorType : createArrayType(elementType, getModifiedReadonlyState(isReadonlyArrayType(arrayType), getMappedTypeModifiers(mappedType)));
  }
  function instantiateMappedTupleType(tupleType: TupleTypeReference, mappedType: MappedType, mapper: TypeMapper) {
    const minLength = tupleType.target.minLength;
    const elementTypes = map(getTypeArguments(tupleType), (_, i) => instantiateMappedTypeTemplate(mappedType, getLiteralType('' + i), i >= minLength, mapper));
    const modifiers = getMappedTypeModifiers(mappedType);
    const newMinLength =
      modifiers & MappedTypeModifiers.IncludeOptional ? 0 : modifiers & MappedTypeModifiers.ExcludeOptional ? getTypeReferenceArity(tupleType) - (tupleType.target.hasRestElement ? 1 : 0) : minLength;
    const newReadonly = getModifiedReadonlyState(tupleType.target.readonly, modifiers);
    return contains(elementTypes, errorType) ? errorType : createTupleType(elementTypes, newMinLength, tupleType.target.hasRestElement, newReadonly, tupleType.target.labeledElementDeclarations);
  }
  function instantiateMappedTypeTemplate(type: MappedType, key: Type, isOptional: boolean, mapper: TypeMapper) {
    const templateMapper = appendTypeMapping(mapper, getTypeParameterFromMappedType(type), key);
    const propType = instantiateType(getTemplateTypeFromMappedType(<MappedType>type.target || type), templateMapper);
    const modifiers = getMappedTypeModifiers(type);
    return strictNullChecks && modifiers & MappedTypeModifiers.IncludeOptional && !maybeTypeOfKind(propType, qt.TypeFlags.Undefined | qt.TypeFlags.Void)
      ? getOptionalType(propType)
      : strictNullChecks && modifiers & MappedTypeModifiers.ExcludeOptional && isOptional
      ? getTypeWithFacts(propType, TypeFacts.NEUndefined)
      : propType;
  }
  function instantiateAnonymousType(type: AnonymousType, mapper: TypeMapper): AnonymousType {
    const result = <AnonymousType>createObjectType(type.objectFlags | ObjectFlags.Instantiated, type.symbol);
    if (type.objectFlags & ObjectFlags.Mapped) {
      (<MappedType>result).declaration = (<MappedType>type).declaration;
      const origTypeParameter = getTypeParameterFromMappedType(<MappedType>type);
      const freshTypeParameter = cloneTypeParameter(origTypeParameter);
      (<MappedType>result).typeParameter = freshTypeParameter;
      mapper = combineTypeMappers(makeUnaryTypeMapper(origTypeParameter, freshTypeParameter), mapper);
      freshTypeParameter.mapper = mapper;
    }
    result.target = type;
    result.mapper = mapper;
    result.aliasSymbol = type.aliasSymbol;
    result.aliasTypeArguments = instantiateTypes(type.aliasTypeArguments, mapper);
    return result;
  }
  function instantiateConditionalType(root: ConditionalRoot, mapper: TypeMapper): Type {
    if (root.isDistributive) {
      const checkType = <TypeParameter>root.checkType;
      const instantiatedType = getMappedType(checkType, mapper);
      if (checkType !== instantiatedType && instantiatedType.flags & (TypeFlags.Union | qt.TypeFlags.Never))
        return mapType(instantiatedType, (t) => getConditionalType(root, prependTypeMapping(checkType, t, mapper)));
    }
    return getConditionalType(root, mapper);
  }
  function instantiateType(type: Type, mapper: TypeMapper | undefined): Type;
  function instantiateType(type: Type | undefined, mapper: TypeMapper | undefined): Type | undefined;
  function instantiateType(type: Type | undefined, mapper: TypeMapper | undefined): Type | undefined {
    if (!(type && mapper && couldContainTypeVariables(type))) return type;
    if (instantiationDepth === 50 || instantiationCount >= 5000000) {
      error(currentNode, qd.msgs.Type_instantiation_is_excessively_deep_and_possibly_infinite);
      return errorType;
    }
    totalInstantiationCount++;
    instantiationCount++;
    instantiationDepth++;
    const result = instantiateTypeWorker(type, mapper);
    instantiationDepth--;
    return result;
  }
  function instantiateTypeWithoutDepthIncrease(type: Type, mapper: TypeMapper | undefined) {
    instantiationDepth--;
    const result = instantiateType(type, mapper);
    instantiationDepth++;
    return result;
  }
  function instantiateTypeWorker(type: Type, mapper: TypeMapper): Type {
    const flags = type.flags;
    if (flags & qt.TypeFlags.TypeParameter) return getMappedType(type, mapper);
    if (flags & qt.TypeFlags.Object) {
      const objectFlags = (<ObjectType>type).objectFlags;
      if (objectFlags & (ObjectFlags.Reference | ObjectFlags.Anonymous | ObjectFlags.Mapped)) {
        if (objectFlags & ObjectFlags.Reference && !(<TypeReference>type).node) {
          const resolvedTypeArguments = (<TypeReference>type).resolvedTypeArguments;
          const newTypeArguments = instantiateTypes(resolvedTypeArguments, mapper);
          return newTypeArguments !== resolvedTypeArguments ? createTypeReference((<TypeReference>type).target, newTypeArguments) : type;
        }
        return getObjectTypeInstantiation(<TypeReference | AnonymousType | MappedType>type, mapper);
      }
      return type;
    }
    if (flags & qt.TypeFlags.UnionOrIntersection) {
      const types = (<UnionOrIntersectionType>type).types;
      const newTypes = instantiateTypes(types, mapper);
      return newTypes === types
        ? type
        : flags & qt.TypeFlags.Intersection
        ? getIntersectionType(newTypes, type.aliasSymbol, instantiateTypes(type.aliasTypeArguments, mapper))
        : getUnionType(newTypes, UnionReduction.Literal, type.aliasSymbol, instantiateTypes(type.aliasTypeArguments, mapper));
    }
    if (flags & qt.TypeFlags.Index) return getIndexType(instantiateType((<IndexType>type).type, mapper));
    if (flags & qt.TypeFlags.IndexedAccess) return getIndexedAccessType(instantiateType((<IndexedAccessType>type).objectType, mapper), instantiateType((<IndexedAccessType>type).indexType, mapper));
    if (flags & qt.TypeFlags.Conditional) return getConditionalTypeInstantiation(<ConditionalType>type, combineTypeMappers((<ConditionalType>type).mapper, mapper));
    if (flags & qt.TypeFlags.Substitution) {
      const maybeVariable = instantiateType((<SubstitutionType>type).baseType, mapper);
      if (maybeVariable.flags & qt.TypeFlags.TypeVariable) return getSubstitutionType(maybeVariable as TypeVariable, instantiateType((<SubstitutionType>type).substitute, mapper));
      else {
        const sub = instantiateType((<SubstitutionType>type).substitute, mapper);
        if (sub.flags & qt.TypeFlags.AnyOrUnknown || isTypeAssignableTo(getRestrictiveInstantiation(maybeVariable), getRestrictiveInstantiation(sub))) return maybeVariable;
        return sub;
      }
    }
    return type;
  }
  function instantiateIndexInfo(info: IndexInfo | undefined, mapper: TypeMapper): IndexInfo | undefined {
    return info && createIndexInfo(instantiateType(info.type, mapper), info.isReadonly, info.declaration);
  }
  function isContextSensitive(node: Expression | MethodDeclaration | ObjectLiteralElementLike | JsxAttributeLike | JsxChild): boolean {
    assert(node.kind !== Syntax.MethodDeclaration || is.objectLiteralMethod(node));
    switch (node.kind) {
      case Syntax.FunctionExpression:
      case Syntax.ArrowFunction:
      case Syntax.MethodDeclaration:
      case Syntax.FunctionDeclaration:
        return isContextSensitiveFunctionLikeDeclaration(<FunctionExpression | ArrowFunction | MethodDeclaration>node);
      case Syntax.ObjectLiteralExpression:
        return some((<ObjectLiteralExpression>node).properties, isContextSensitive);
      case Syntax.ArrayLiteralExpression:
        return some((<ArrayLiteralExpression>node).elements, isContextSensitive);
      case Syntax.ConditionalExpression:
        return isContextSensitive((<ConditionalExpression>node).whenTrue) || isContextSensitive((<ConditionalExpression>node).whenFalse);
      case Syntax.BinaryExpression:
        return (
          ((<BinaryExpression>node).operatorToken.kind === Syntax.Bar2Token || (<BinaryExpression>node).operatorToken.kind === Syntax.Question2Token) &&
          (isContextSensitive((<BinaryExpression>node).left) || isContextSensitive((<BinaryExpression>node).right))
        );
      case Syntax.PropertyAssignment:
        return isContextSensitive((<PropertyAssignment>node).initer);
      case Syntax.ParenthesizedExpression:
        return isContextSensitive((<ParenthesizedExpression>node).expression);
      case Syntax.JsxAttributes:
        return some((<JsxAttributes>node).properties, isContextSensitive) || (is.kind(qc.JsxOpeningElement, node.parent) && some(node.parent.parent.children, isContextSensitive));
      case Syntax.JsxAttribute: {
        const { initer } = node as JsxAttribute;
        return !!initer && isContextSensitive(initer);
      }
      case Syntax.JsxExpression: {
        const { expression } = node as JsxExpression;
        return !!expression && isContextSensitive(expression);
      }
    }
    return false;
  }
  function isContextSensitiveFunctionLikeDeclaration(node: FunctionLikeDeclaration): boolean {
    return (
      (!is.kind(qc.FunctionDeclaration, node) || (is.inJSFile(node) && !!getTypeForDeclarationFromDocComment(node))) &&
      (hasContextSensitiveParameters(node) || hasContextSensitiveReturnExpression(node))
    );
  }
  function hasContextSensitiveParameters(node: FunctionLikeDeclaration) {
    if (!node.typeParameters) {
      if (some(node.parameters, (p) => !get.effectiveTypeAnnotationNode(p))) return true;
      if (node.kind !== Syntax.ArrowFunction) {
        const parameter = firstOrUndefined(node.parameters);
        if (!(parameter && parameterIsThqy.is.keyword(parameter))) return true;
      }
    }
    return false;
  }
  function hasContextSensitiveReturnExpression(node: FunctionLikeDeclaration) {
    return !node.typeParameters && !getEffectiveReturnTypeNode(node) && !!node.body && node.body.kind !== Syntax.Block && isContextSensitive(node.body);
  }
  function isContextSensitiveFunctionOrObjectLiteralMethod(func: Node): func is FunctionExpression | ArrowFunction | MethodDeclaration {
    return (
      ((is.inJSFile(func) && is.kind(qc.FunctionDeclaration, func)) || isFunctionExpressionOrArrowFunction(func) || is.objectLiteralMethod(func)) && isContextSensitiveFunctionLikeDeclaration(func)
    );
  }
  function isTypeIdenticalTo(source: Type, target: Type): boolean {
    return isTypeRelatedTo(source, target, identityRelation);
  }
  function compareTypesIdentical(source: Type, target: Type): Ternary {
    return isTypeRelatedTo(source, target, identityRelation) ? Ternary.True : Ternary.False;
  }
  function compareTypesAssignable(source: Type, target: Type): Ternary {
    return isTypeRelatedTo(source, target, assignableRelation) ? Ternary.True : Ternary.False;
  }
  function compareTypesSubtypeOf(source: Type, target: Type): Ternary {
    return isTypeRelatedTo(source, target, subtypeRelation) ? Ternary.True : Ternary.False;
  }
  function isTypeSubtypeOf(source: Type, target: Type): boolean {
    return isTypeRelatedTo(source, target, subtypeRelation);
  }
  function isTypeAssignableTo(source: Type, target: Type): boolean {
    return isTypeRelatedTo(source, target, assignableRelation);
  }
  function isTypeDerivedFrom(source: Type, target: Type): boolean {
    return source.flags & qt.TypeFlags.Union
      ? every((<UnionType>source).types, (t) => isTypeDerivedFrom(t, target))
      : target.flags & qt.TypeFlags.Union
      ? some((<UnionType>target).types, (t) => isTypeDerivedFrom(source, t))
      : source.flags & qt.TypeFlags.InstantiableNonPrimitive
      ? isTypeDerivedFrom(getBaseConstraintOfType(source) || unknownType, target)
      : target === globalObjectType
      ? !!(source.flags & (TypeFlags.Object | qt.TypeFlags.NonPrimitive))
      : target === globalFunctionType
      ? !!(source.flags & qt.TypeFlags.Object) && isFunctionObjectType(source as ObjectType)
      : hasBaseType(source, getTargetType(target));
  }
  function isTypeComparableTo(source: Type, target: Type): boolean {
    return isTypeRelatedTo(source, target, comparableRelation);
  }
  function areTypesComparable(type1: Type, type2: Type): boolean {
    return isTypeComparableTo(type1, type2) || isTypeComparableTo(type2, type1);
  }
  function isOrHasGenericConditional(type: Type): boolean {
    return !!(type.flags & qt.TypeFlags.Conditional || (type.flags & qt.TypeFlags.Intersection && some((type as IntersectionType).types, isOrHasGenericConditional)));
  }
  function elaborateError(
    node: Expression | undefined,
    source: Type,
    target: Type,
    relation: qb.QMap<RelationComparisonResult>,
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
        return elaborateError((node as ParenthesizedExpression | JsxExpression).expression, source, target, relation, headMessage, containingMessageChain, errorOutputContainer);
      case Syntax.BinaryExpression:
        switch ((node as BinaryExpression).operatorToken.kind) {
          case Syntax.EqualsToken:
          case Syntax.CommaToken:
            return elaborateError((node as BinaryExpression).right, source, target, relation, headMessage, containingMessageChain, errorOutputContainer);
        }
        break;
      case Syntax.ObjectLiteralExpression:
        return elaborateObjectLiteral(node as ObjectLiteralExpression, source, target, relation, containingMessageChain, errorOutputContainer);
      case Syntax.ArrayLiteralExpression:
        return elaborateArrayLiteral(node as ArrayLiteralExpression, source, target, relation, containingMessageChain, errorOutputContainer);
      case Syntax.JsxAttributes:
        return elaborateJsxComponents(node as JsxAttributes, source, target, relation, containingMessageChain, errorOutputContainer);
      case Syntax.ArrowFunction:
        return elaborateArrowFunction(node as ArrowFunction, source, target, relation, containingMessageChain, errorOutputContainer);
    }
    return false;
  }
  function elaborateDidYouMeanToCallOrConstruct(
    node: Expression,
    source: Type,
    target: Type,
    relation: qb.QMap<RelationComparisonResult>,
    headMessage: qd.Message | undefined,
    containingMessageChain: (() => qd.MessageChain | undefined) | undefined,
    errorOutputContainer: { errors?: qd.Diagnostic[]; skipLogging?: boolean } | undefined
  ): boolean {
    const callSignatures = getSignaturesOfType(source, SignatureKind.Call);
    const constructSignatures = getSignaturesOfType(source, SignatureKind.Construct);
    for (const signatures of [constructSignatures, callSignatures]) {
      if (
        some(signatures, (s) => {
          const returnType = getReturnTypeOfSignature(s);
          return !(returnType.flags & (TypeFlags.Any | qt.TypeFlags.Never)) && check.typeRelatedTo(returnType, target, relation, undefined);
        })
      ) {
        const resultObj: { errors?: qd.Diagnostic[] } = errorOutputContainer || {};
        check.typeAssignableTo(source, target, node, headMessage, containingMessageChain, resultObj);
        const diagnostic = resultObj.errors![resultObj.errors!.length - 1];
        addRelatedInfo(diagnostic, createDiagnosticForNode(node, signatures === constructSignatures ? qd.msgs.Did_you_mean_to_use_new_with_this_expression : qd.msgs.Did_you_mean_to_call_this_expression));
        return true;
      }
    }
    return false;
  }
  function elaborateArrowFunction(
    node: ArrowFunction,
    source: Type,
    target: Type,
    relation: qb.QMap<RelationComparisonResult>,
    containingMessageChain: (() => qd.MessageChain | undefined) | undefined,
    errorOutputContainer: { errors?: qd.Diagnostic[]; skipLogging?: boolean } | undefined
  ): boolean {
    if (is.kind(qc.Block, node.body)) return false;
    if (some(node.parameters, qc.hasType)) return false;
    const sourceSig = getSingleCallSignature(source);
    if (!sourceSig) return false;
    const targetSignatures = getSignaturesOfType(target, SignatureKind.Call);
    if (!length(targetSignatures)) return false;
    const returnExpression = node.body;
    const sourceReturn = getReturnTypeOfSignature(sourceSig);
    const targetReturn = getUnionType(map(targetSignatures, getReturnTypeOfSignature));
    if (!check.typeRelatedTo(sourceReturn, targetReturn, relation, undefined)) {
      const elaborated = returnExpression && elaborateError(returnExpression, sourceReturn, targetReturn, relation, undefined, containingMessageChain, errorOutputContainer);
      if (elaborated) return elaborated;
      const resultObj: { errors?: qd.Diagnostic[] } = errorOutputContainer || {};
      check.typeRelatedTo(sourceReturn, targetReturn, relation, returnExpression, undefined, containingMessageChain, resultObj);
      if (resultObj.errors) {
        if (target.symbol && length(target.symbol.declarations)) {
          addRelatedInfo(resultObj.errors[resultObj.errors.length - 1], createDiagnosticForNode(target.symbol.declarations[0], qd.msgs.The_expected_type_comes_from_the_return_type_of_this_signature));
        }
        if (
          (getFunctionFlags(node) & FunctionFlags.Async) === 0 &&
          !getTypeOfPropertyOfType(sourceReturn, 'then' as qb.__String) &&
          check.typeRelatedTo(createPromiseType(sourceReturn), targetReturn, relation, undefined)
        ) {
          addRelatedInfo(resultObj.errors[resultObj.errors.length - 1], createDiagnosticForNode(node, qd.msgs.Did_you_mean_to_mark_this_function_as_async));
        }
        return true;
      }
    }
    return false;
  }
  type ElaborationIterator = IterableIterator<{
    errorNode: Node;
    innerExpression: Expression | undefined;
    nameType: Type;
    errorMessage?: qd.Message | undefined;
  }>;
  function elaborateElementwise(
    iterator: ElaborationIterator,
    source: Type,
    target: Type,
    relation: qb.QMap<RelationComparisonResult>,
    containingMessageChain: (() => qd.MessageChain | undefined) | undefined,
    errorOutputContainer: { errors?: qd.Diagnostic[]; skipLogging?: boolean } | undefined
  ) {
    let reportedError = false;
    for (let status = iterator.next(); !status.done; status = iterator.next()) {
      const { errorNode: prop, innerExpression: next, nameType, errorMessage } = status.value;
      const targetPropType = getBestMatchIndexedAccessTypeOrUndefined(source, target, nameType);
      if (!targetPropType || targetPropType.flags & qt.TypeFlags.IndexedAccess) continue;
      const sourcePropType = getIndexedAccessTypeOrUndefined(source, nameType);
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
            const propertyName = isTypeUsableAsPropertyName(nameType) ? getPropertyNameFromType(nameType) : undefined;
            const targetProp = propertyName !== undefined ? getPropertyOfType(target, propertyName) : undefined;
            let issuedElaboration = false;
            if (!targetProp) {
              const indexInfo = (isTypeAssignableToKind(nameType, qt.TypeFlags.NumberLike) && getIndexInfoOfType(target, IndexKind.Number)) || getIndexInfoOfType(target, IndexKind.String) || undefined;
              if (indexInfo && indexInfo.declaration && !get.sourceFileOf(indexInfo.declaration).hasNoDefaultLib) {
                issuedElaboration = true;
                addRelatedInfo(reportedDiag, createDiagnosticForNode(indexInfo.declaration, qd.msgs.The_expected_type_comes_from_this_index_signature));
              }
            }
            if (!issuedElaboration && ((targetProp && length(targetProp.declarations)) || (target.symbol && length(target.symbol.declarations)))) {
              const targetNode = targetProp && length(targetProp.declarations) ? targetProp.declarations[0] : target.symbol.declarations[0];
              if (!get.sourceFileOf(targetNode).hasNoDefaultLib) {
                addRelatedInfo(
                  reportedDiag,
                  createDiagnosticForNode(
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
  function* generateJsxAttributes(node: JsxAttributes): ElaborationIterator {
    if (!length(node.properties)) return;
    for (const prop of node.properties) {
      if (is.kind(qc.JsxSpreadAttribute, prop)) continue;
      yield { errorNode: prop.name, innerExpression: prop.initer, nameType: getLiteralType(idText(prop.name)) };
    }
  }
  function* generateJsxChildren(node: JsxElement, getInvalidTextDiagnostic: () => qd.Message): ElaborationIterator {
    if (!length(node.children)) return;
    let memberOffset = 0;
    for (let i = 0; i < node.children.length; i++) {
      const child = node.children[i];
      const nameType = getLiteralType(i - memberOffset);
      const elem = getElaborationElementForJsxChild(child, nameType, getInvalidTextDiagnostic);
      if (elem) yield elem;
      else {
        memberOffset++;
      }
    }
  }
  function elaborateJsxComponents(
    node: JsxAttributes,
    source: Type,
    target: Type,
    relation: qb.QMap<RelationComparisonResult>,
    containingMessageChain: (() => qd.MessageChain | undefined) | undefined,
    errorOutputContainer: { errors?: qd.Diagnostic[]; skipLogging?: boolean } | undefined
  ) {
    let result = elaborateElementwise(generateJsxAttributes(node), source, target, relation, containingMessageChain, errorOutputContainer);
    let invalidTextDiagnostic: qd.Message | undefined;
    if (is.kind(qc.JsxOpeningElement, node.parent) && is.kind(qc.JsxElement, node.parent.parent)) {
      const containingElement = node.parent.parent;
      const childPropName = getJsxElementChildrenPropertyName(getJsxNamespaceAt(node));
      const childrenPropName = childPropName === undefined ? 'children' : qy.get.unescUnderscores(childPropName);
      const childrenNameType = getLiteralType(childrenPropName);
      const childrenTargetType = getIndexedAccessType(target, childrenNameType);
      const validChildren = getSemanticJsxChildren(containingElement.children);
      if (!length(validChildren)) return result;
      const moreThanOneRealChildren = length(validChildren) > 1;
      const arrayLikeTargetParts = filterType(childrenTargetType, isArrayOrTupleLikeType);
      const nonArrayLikeTargetParts = filterType(childrenTargetType, (t) => !isArrayOrTupleLikeType(t));
      if (moreThanOneRealChildren) {
        if (arrayLikeTargetParts !== neverType) {
          const realSource = createTupleType(check.jsxChildren(containingElement, CheckMode.Normal));
          const children = generateJsxChildren(containingElement, getInvalidTextualChildDiagnostic);
          result = elaborateElementwise(children, realSource, arrayLikeTargetParts, relation, containingMessageChain, errorOutputContainer) || result;
        } else if (!isTypeRelatedTo(getIndexedAccessType(source, childrenNameType), childrenTargetType, relation)) {
          result = true;
          const diag = error(
            containingElement.openingElement.tagName,
            qd.msgs.This_JSX_tag_s_0_prop_expects_a_single_child_of_type_1_but_multiple_children_were_provided,
            childrenPropName,
            typeToString(childrenTargetType)
          );
          if (errorOutputContainer && errorOutputContainer.skipLogging) (errorOutputContainer.errors || (errorOutputContainer.errors = [])).push(diag);
        }
      } else {
        if (nonArrayLikeTargetParts !== neverType) {
          const child = validChildren[0];
          const elem = getElaborationElementForJsxChild(child, childrenNameType, getInvalidTextualChildDiagnostic);
          if (elem) {
            result =
              elaborateElementwise(
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
        } else if (!isTypeRelatedTo(getIndexedAccessType(source, childrenNameType), childrenTargetType, relation)) {
          result = true;
          const diag = error(
            containingElement.openingElement.tagName,
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
        const tagNameText = get.textOf(node.parent.tagName);
        const childPropName = getJsxElementChildrenPropertyName(getJsxNamespaceAt(node));
        const childrenPropName = childPropName === undefined ? 'children' : qy.get.unescUnderscores(childPropName);
        const childrenTargetType = getIndexedAccessType(target, getLiteralType(childrenPropName));
        const diagnostic = qd.msgs._0_components_don_t_accept_text_as_child_elements_Text_in_JSX_has_the_type_string_but_the_expected_type_of_1_is_2;
        invalidTextDiagnostic = {
          ...diagnostic,
          key: '!!ALREADY FORMATTED!!',
          message: formatMessage(undefined, diagnostic, tagNameText, childrenPropName, typeToString(childrenTargetType)),
        };
      }
      return invalidTextDiagnostic;
    }
  }
  function* generateLimitedTupleElements(node: ArrayLiteralExpression, target: Type): ElaborationIterator {
    const len = length(node.elements);
    if (!len) return;
    for (let i = 0; i < len; i++) {
      if (isTupleLikeType(target) && !getPropertyOfType(target, ('' + i) as qb.__String)) continue;
      const elem = node.elements[i];
      if (is.kind(qc.OmittedExpression, elem)) continue;
      const nameType = getLiteralType(i);
      yield { errorNode: elem, innerExpression: elem, nameType };
    }
  }
  function elaborateArrayLiteral(
    node: ArrayLiteralExpression,
    source: Type,
    target: Type,
    relation: qb.QMap<RelationComparisonResult>,
    containingMessageChain: (() => qd.MessageChain | undefined) | undefined,
    errorOutputContainer: { errors?: qd.Diagnostic[]; skipLogging?: boolean } | undefined
  ) {
    if (target.flags & qt.TypeFlags.Primitive) return false;
    if (isTupleLikeType(source)) return elaborateElementwise(generateLimitedTupleElements(node, target), source, target, relation, containingMessageChain, errorOutputContainer);
    const oldContext = node.contextualType;
    node.contextualType = target;
    try {
      const tupleizedType = check.arrayLiteral(node, CheckMode.Contextual, true);
      node.contextualType = oldContext;
      if (isTupleLikeType(tupleizedType)) return elaborateElementwise(generateLimitedTupleElements(node, target), tupleizedType, target, relation, containingMessageChain, errorOutputContainer);
      return false;
    } finally {
      node.contextualType = oldContext;
    }
  }
  function* generateObjectLiteralElements(node: ObjectLiteralExpression): ElaborationIterator {
    if (!length(node.properties)) return;
    for (const prop of node.properties) {
      if (is.kind(qc.SpreadAssignment, prop)) continue;
      const type = getLiteralTypeFromProperty(getSymbolOfNode(prop), qt.TypeFlags.StringOrNumberLiteralOrUnique);
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
            errorMessage: isComputedNonLiteralName(prop.name) ? qd.msgs.Type_of_computed_property_s_value_is_0_which_is_not_assignable_to_type_1 : undefined,
          };
          break;
        default:
          Debug.assertNever(prop);
      }
    }
  }
  function elaborateObjectLiteral(
    node: ObjectLiteralExpression,
    source: Type,
    target: Type,
    relation: qb.QMap<RelationComparisonResult>,
    containingMessageChain: (() => qd.MessageChain | undefined) | undefined,
    errorOutputContainer: { errors?: qd.Diagnostic[]; skipLogging?: boolean } | undefined
  ) {
    if (target.flags & qt.TypeFlags.Primitive) return false;
    return elaborateElementwise(generateObjectLiteralElements(node), source, target, relation, containingMessageChain, errorOutputContainer);
  }
  function isSignatureAssignableTo(source: Signature, target: Signature, ignoreReturnTypes: boolean): boolean {
    return compareSignaturesRelated(source, target, ignoreReturnTypes ? SignatureCheckMode.IgnoreReturnTypes : 0, false, undefined, undefined, compareTypesAssignable, undefined) !== Ternary.False;
  }
  type ErrorReporter = (message: qd.Message, arg0?: string, arg1?: string) => void;
  function isAnySignature(s: Signature) {
    return (
      !s.typeParameters &&
      (!s.thisParameter || isTypeAny(getTypeOfParameter(s.thisParameter))) &&
      s.parameters.length === 1 &&
      signatureHasRestParameter(s) &&
      (getTypeOfParameter(s.parameters[0]) === anyArrayType || isTypeAny(getTypeOfParameter(s.parameters[0]))) &&
      isTypeAny(getReturnTypeOfSignature(s))
    );
  }
  function compareSignaturesRelated(
    source: Signature,
    target: Signature,
    checkMode: SignatureCheckMode,
    reportErrors: boolean,
    errorReporter: ErrorReporter | undefined,
    incompatibleErrorReporter: ((source: Type, target: Type) => void) | undefined,
    compareTypes: TypeComparer,
    reportUnreliableMarkers: TypeMapper | undefined
  ): Ternary {
    if (source === target) return Ternary.True;
    if (isAnySignature(target)) return Ternary.True;
    const targetCount = getParameterCount(target);
    const sourceHasMoreParameters =
      !hasEffectiveRestParameter(target) &&
      (checkMode & SignatureCheckMode.StrictArity ? hasEffectiveRestParameter(source) || getParameterCount(source) > targetCount : getMinArgumentCount(source) > targetCount);
    if (sourceHasMoreParameters) return Ternary.False;
    if (source.typeParameters && source.typeParameters !== target.typeParameters) {
      target = getCanonicalSignature(target);
      source = instantiateSignatureInContextOf(source, target, undefined, compareTypes);
    }
    const sourceCount = getParameterCount(source);
    const sourceRestType = getNonArrayRestType(source);
    const targetRestType = getNonArrayRestType(target);
    if (sourceRestType || targetRestType) void instantiateType(sourceRestType || targetRestType, reportUnreliableMarkers);
    if (sourceRestType && targetRestType && sourceCount !== targetCount) return Ternary.False;
    const kind = target.declaration ? target.declaration.kind : Syntax.Unknown;
    const strictVariance = !(checkMode & SignatureCheckMode.Callback) && strictFunctionTypes && kind !== Syntax.MethodDeclaration && kind !== Syntax.MethodSignature && kind !== Syntax.Constructor;
    let result = Ternary.True;
    const sourceThisType = getThisTypeOfSignature(source);
    if (sourceThisType && sourceThisType !== voidType) {
      const targetThisType = getThisTypeOfSignature(target);
      if (targetThisType) {
        const related = (!strictVariance && compareTypes(sourceThisType, targetThisType, false)) || compareTypes(targetThisType, sourceThisType, reportErrors);
        if (!related) {
          if (reportErrors) errorReporter!(qd.msgs.The_this_types_of_each_signature_are_incompatible);
          return Ternary.False;
        }
        result &= related;
      }
    }
    const paramCount = sourceRestType || targetRestType ? Math.min(sourceCount, targetCount) : Math.max(sourceCount, targetCount);
    const restIndex = sourceRestType || targetRestType ? paramCount - 1 : -1;
    for (let i = 0; i < paramCount; i++) {
      const sourceType = i === restIndex ? getRestTypeAtPosition(source, i) : getTypeAtPosition(source, i);
      const targetType = i === restIndex ? getRestTypeAtPosition(target, i) : getTypeAtPosition(target, i);
      const sourceSig = checkMode & SignatureCheckMode.Callback ? undefined : getSingleCallSignature(getNonNullableType(sourceType));
      const targetSig = checkMode & SignatureCheckMode.Callback ? undefined : getSingleCallSignature(getNonNullableType(targetType));
      const callbacks =
        sourceSig &&
        targetSig &&
        !getTypePredicateOfSignature(sourceSig) &&
        !getTypePredicateOfSignature(targetSig) &&
        (getFalsyFlags(sourceType) & qt.TypeFlags.Nullable) === (getFalsyFlags(targetType) & qt.TypeFlags.Nullable);
      let related = callbacks
        ? compareSignaturesRelated(
            targetSig!,
            sourceSig!,
            (checkMode & SignatureCheckMode.StrictArity) | (strictVariance ? SignatureCheckMode.StrictCallback : SignatureCheckMode.BivariantCallback),
            reportErrors,
            errorReporter,
            incompatibleErrorReporter,
            compareTypes,
            reportUnreliableMarkers
          )
        : (!(checkMode & SignatureCheckMode.Callback) && !strictVariance && compareTypes(sourceType, targetType, false)) || compareTypes(targetType, sourceType, reportErrors);
      if (related && checkMode & SignatureCheckMode.StrictArity && i >= getMinArgumentCount(source) && i < getMinArgumentCount(target) && compareTypes(sourceType, targetType, false))
        related = Ternary.False;
      if (!related) {
        if (reportErrors) {
          errorReporter!(
            qd.msgs.Types_of_parameters_0_and_1_are_incompatible,
            qy.get.unescUnderscores(getParameterNameAtPosition(source, i)),
            qy.get.unescUnderscores(getParameterNameAtPosition(target, i))
          );
        }
        return Ternary.False;
      }
      result &= related;
    }
    if (!(checkMode & SignatureCheckMode.IgnoreReturnTypes)) {
      const targetReturnType = isResolvingReturnTypeOfSignature(target)
        ? anyType
        : target.declaration && isJSConstructor(target.declaration)
        ? getDeclaredTypeOfClassOrInterface(getMergedSymbol(target.declaration.symbol))
        : getReturnTypeOfSignature(target);
      if (targetReturnType === voidType) return result;
      const sourceReturnType = isResolvingReturnTypeOfSignature(source)
        ? anyType
        : source.declaration && isJSConstructor(source.declaration)
        ? getDeclaredTypeOfClassOrInterface(getMergedSymbol(source.declaration.symbol))
        : getReturnTypeOfSignature(source);
      const targetTypePredicate = getTypePredicateOfSignature(target);
      if (targetTypePredicate) {
        const sourceTypePredicate = getTypePredicateOfSignature(source);
        if (sourceTypePredicate) result &= compareTypePredicateRelatedTo(sourceTypePredicate, targetTypePredicate, reportErrors, errorReporter, compareTypes);
        else if (isIdentifierTypePredicate(targetTypePredicate)) {
          if (reportErrors) errorReporter!(qd.msgs.Signature_0_must_be_a_type_predicate, signatureToString(source));
          return Ternary.False;
        }
      } else {
        result &= (checkMode & SignatureCheckMode.BivariantCallback && compareTypes(targetReturnType, sourceReturnType, false)) || compareTypes(sourceReturnType, targetReturnType, reportErrors);
        if (!result && reportErrors && incompatibleErrorReporter) incompatibleErrorReporter(sourceReturnType, targetReturnType);
      }
    }
    return result;
  }
  function compareTypePredicateRelatedTo(
    source: TypePredicate,
    target: TypePredicate,
    reportErrors: boolean,
    errorReporter: ErrorReporter | undefined,
    compareTypes: (s: Type, t: Type, reportErrors?: boolean) => Ternary
  ): Ternary {
    if (source.kind !== target.kind) {
      if (reportErrors) {
        errorReporter!(qd.msgs.A_this_based_type_guard_is_not_compatible_with_a_parameter_based_type_guard);
        errorReporter!(qd.msgs.Type_predicate_0_is_not_assignable_to_1, typePredicateToString(source), typePredicateToString(target));
      }
      return Ternary.False;
    }
    if (source.kind === TypePredicateKind.Identifier || source.kind === TypePredicateKind.AssertsIdentifier) {
      if (source.parameterIndex !== (target as IdentifierTypePredicate).parameterIndex) {
        if (reportErrors) {
          errorReporter!(qd.msgs.Parameter_0_is_not_in_the_same_position_as_parameter_1, source.parameterName, (target as IdentifierTypePredicate).parameterName);
          errorReporter!(qd.msgs.Type_predicate_0_is_not_assignable_to_1, typePredicateToString(source), typePredicateToString(target));
        }
        return Ternary.False;
      }
    }
    const related = source.type === target.type ? Ternary.True : source.type && target.type ? compareTypes(source.type, target.type, reportErrors) : Ternary.False;
    if (related === Ternary.False && reportErrors) errorReporter!(qd.msgs.Type_predicate_0_is_not_assignable_to_1, typePredicateToString(source), typePredicateToString(target));
    return related;
  }
  function isImplementationCompatibleWithOverload(implementation: Signature, overload: Signature): boolean {
    const erasedSource = getErasedSignature(implementation);
    const erasedTarget = getErasedSignature(overload);
    const sourceReturnType = getReturnTypeOfSignature(erasedSource);
    const targetReturnType = getReturnTypeOfSignature(erasedTarget);
    if (targetReturnType === voidType || isTypeRelatedTo(targetReturnType, sourceReturnType, assignableRelation) || isTypeRelatedTo(sourceReturnType, targetReturnType, assignableRelation))
      return isSignatureAssignableTo(erasedSource, erasedTarget, true);
    return false;
  }
  function isEmptyResolvedType(t: ResolvedType) {
    return t !== anyFunctionType && t.properties.length === 0 && t.callSignatures.length === 0 && t.constructSignatures.length === 0 && !t.stringIndexInfo && !t.numberIndexInfo;
  }
  function isEmptyObjectType(type: Type): boolean {
    return type.flags & qt.TypeFlags.Object
      ? !isGenericMappedType(type) && isEmptyResolvedType(resolveStructuredTypeMembers(<ObjectType>type))
      : type.flags & qt.TypeFlags.NonPrimitive
      ? true
      : type.flags & qt.TypeFlags.Union
      ? some((<UnionType>type).types, isEmptyObjectType)
      : type.flags & qt.TypeFlags.Intersection
      ? every((<UnionType>type).types, isEmptyObjectType)
      : false;
  }
  function isEmptyAnonymousObjectType(type: Type) {
    return !!(
      getObjectFlags(type) & ObjectFlags.Anonymous &&
      (((<ResolvedType>type).members && isEmptyResolvedType(<ResolvedType>type)) || (type.symbol && type.symbol.flags & qt.SymbolFlags.TypeLiteral && getMembersOfSymbol(type.symbol).size === 0))
    );
  }
  function isStringIndexSignatureOnlyType(type: Type): boolean {
    return (
      (type.flags & qt.TypeFlags.Object &&
        !isGenericMappedType(type) &&
        getPropertiesOfType(type).length === 0 &&
        getIndexInfoOfType(type, IndexKind.String) &&
        !getIndexInfoOfType(type, IndexKind.Number)) ||
      (type.flags & qt.TypeFlags.UnionOrIntersection && every((<UnionOrIntersectionType>type).types, isStringIndexSignatureOnlyType)) ||
      false
    );
  }
  function isEnumTypeRelatedTo(sourceSymbol: Symbol, targetSymbol: Symbol, errorReporter?: ErrorReporter) {
    if (sourceSymbol === targetSymbol) return true;
    const id = sourceSymbol.getId() + ',' + targetSymbol.getId();
    const entry = enumRelation.get(id);
    if (entry !== undefined && !(!(entry & RelationComparisonResult.Reported) && entry & RelationComparisonResult.Failed && errorReporter)) return !!(entry & RelationComparisonResult.Succeeded);
    if (sourceSymbol.escName !== targetSymbol.escName || !(sourceSymbol.flags & qt.SymbolFlags.RegularEnum) || !(targetSymbol.flags & qt.SymbolFlags.RegularEnum)) {
      enumRelation.set(id, RelationComparisonResult.Failed | RelationComparisonResult.Reported);
      return false;
    }
    const targetEnumType = getTypeOfSymbol(targetSymbol);
    for (const property of getPropertiesOfType(getTypeOfSymbol(sourceSymbol))) {
      if (property.flags & qt.SymbolFlags.EnumMember) {
        const targetProperty = getPropertyOfType(targetEnumType, property.escName);
        if (!targetProperty || !(targetProperty.flags & qt.SymbolFlags.EnumMember)) {
          if (errorReporter) {
            errorReporter(qd.msgs.Property_0_is_missing_in_type_1, property.name, typeToString(getDeclaredTypeOfSymbol(targetSymbol), undefined, TypeFormatFlags.UseFullyQualifiedType));
            enumRelation.set(id, RelationComparisonResult.Failed | RelationComparisonResult.Reported);
          } else enumRelation.set(id, RelationComparisonResult.Failed);
          return false;
        }
      }
    }
    enumRelation.set(id, RelationComparisonResult.Succeeded);
    return true;
  }
  function isSimpleTypeRelatedTo(source: Type, target: Type, relation: qb.QMap<RelationComparisonResult>, errorReporter?: ErrorReporter) {
    const s = source.flags;
    const t = target.flags;
    if (t & qt.TypeFlags.AnyOrUnknown || s & qt.TypeFlags.Never || source === wildcardType) return true;
    if (t & qt.TypeFlags.Never) return false;
    if (s & qt.TypeFlags.StringLike && t & qt.TypeFlags.String) return true;
    if (
      s & qt.TypeFlags.StringLiteral &&
      s & qt.TypeFlags.EnumLiteral &&
      t & qt.TypeFlags.StringLiteral &&
      !(t & qt.TypeFlags.EnumLiteral) &&
      (<StringLiteralType>source).value === (<StringLiteralType>target).value
    )
      return true;
    if (s & qt.TypeFlags.NumberLike && t & qt.TypeFlags.Number) return true;
    if (
      s & qt.TypeFlags.NumberLiteral &&
      s & qt.TypeFlags.EnumLiteral &&
      t & qt.TypeFlags.NumberLiteral &&
      !(t & qt.TypeFlags.EnumLiteral) &&
      (<NumberLiteralType>source).value === (<NumberLiteralType>target).value
    )
      return true;
    if (s & qt.TypeFlags.BigIntLike && t & qt.TypeFlags.BigInt) return true;
    if (s & qt.TypeFlags.BooleanLike && t & qt.TypeFlags.Boolean) return true;
    if (s & qt.TypeFlags.ESSymbolLike && t & qt.TypeFlags.ESSymbol) return true;
    if (s & qt.TypeFlags.Enum && t & qt.TypeFlags.Enum && isEnumTypeRelatedTo(source.symbol, target.symbol, errorReporter)) return true;
    if (s & qt.TypeFlags.EnumLiteral && t & qt.TypeFlags.EnumLiteral) {
      if (s & qt.TypeFlags.Union && t & qt.TypeFlags.Union && isEnumTypeRelatedTo(source.symbol, target.symbol, errorReporter)) return true;
      if (
        s & qt.TypeFlags.Literal &&
        t & qt.TypeFlags.Literal &&
        (<LiteralType>source).value === (<LiteralType>target).value &&
        isEnumTypeRelatedTo(getParentOfSymbol(source.symbol)!, getParentOfSymbol(target.symbol)!, errorReporter)
      )
        return true;
    }
    if (s & qt.TypeFlags.Undefined && (!strictNullChecks || t & (TypeFlags.Undefined | qt.TypeFlags.Void))) return true;
    if (s & qt.TypeFlags.Null && (!strictNullChecks || t & qt.TypeFlags.Null)) return true;
    if (s & qt.TypeFlags.Object && t & qt.TypeFlags.NonPrimitive) return true;
    if (relation === assignableRelation || relation === comparableRelation) {
      if (s & qt.TypeFlags.Any) return true;
      if (s & (TypeFlags.Number | qt.TypeFlags.NumberLiteral) && !(s & qt.TypeFlags.EnumLiteral) && (t & qt.TypeFlags.Enum || (t & qt.TypeFlags.NumberLiteral && t & qt.TypeFlags.EnumLiteral))) return true;
    }
    return false;
  }
  function isTypeRelatedTo(source: Type, target: Type, relation: qb.QMap<RelationComparisonResult>) {
    if (isFreshLiteralType(source)) source = (<FreshableType>source).regularType;
    if (isFreshLiteralType(target)) target = (<FreshableType>target).regularType;
    if (source === target) return true;
    if (relation !== identityRelation) {
      if ((relation === comparableRelation && !(target.flags & qt.TypeFlags.Never) && isSimpleTypeRelatedTo(target, source, relation)) || isSimpleTypeRelatedTo(source, target, relation)) return true;
    } else {
      if (!(source.flags & qt.TypeFlags.UnionOrIntersection) && !(target.flags & qt.TypeFlags.UnionOrIntersection) && source.flags !== target.flags && !(source.flags & qt.TypeFlags.Substructure)) return false;
    }
    if (source.flags & qt.TypeFlags.Object && target.flags & qt.TypeFlags.Object) {
      const related = relation.get(getRelationKey(source, target, IntersectionState.None, relation));
      if (related !== undefined) return !!(related & RelationComparisonResult.Succeeded);
    }
    if (source.flags & qt.TypeFlags.StructuredOrInstantiable || target.flags & qt.TypeFlags.StructuredOrInstantiable) return check.typeRelatedTo(source, target, relation, undefined);
    return false;
  }
  function isIgnoredJsxProperty(source: Type, sourceProp: Symbol) {
    return getObjectFlags(source) & ObjectFlags.JsxAttributes && !isUnhyphenatedJsxName(sourceProp.escName);
  }
  function typeCouldHaveTopLevelSingletonTypes(type: Type): boolean {
    if (type.flags & qt.TypeFlags.UnionOrIntersection) return !!forEach((type as IntersectionType).types, typeCouldHaveTopLevelSingletonTypes);
    if (type.flags & qt.TypeFlags.Instantiable) {
      const constraint = getConstraintOfType(type);
      if (constraint) return typeCouldHaveTopLevelSingletonTypes(constraint);
    }
    return isUnitType(type);
  }
  function discriminateTypeByDiscriminableItems(
    target: UnionType,
    discriminators: [() => Type, qb.__String][],
    related: (source: Type, target: Type) => boolean | Ternary,
    defaultValue?: undefined,
    skipPartial?: boolean
  ): Type | undefined;
  function discriminateTypeByDiscriminableItems(
    target: UnionType,
    discriminators: [() => Type, qb.__String][],
    related: (source: Type, target: Type) => boolean | Ternary,
    defaultValue: Type,
    skipPartial?: boolean
  ): Type;
  function discriminateTypeByDiscriminableItems(
    target: UnionType,
    discriminators: [() => Type, qb.__String][],
    related: (source: Type, target: Type) => boolean | Ternary,
    defaultValue?: Type,
    skipPartial?: boolean
  ) {
    const discriminable = target.types.map((_) => undefined) as (boolean | undefined)[];
    for (const [getDiscriminatingType, propertyName] of discriminators) {
      const targetProp = getUnionOrIntersectionProperty(target, propertyName);
      if (skipPartial && targetProp && getCheckFlags(targetProp) & qt.CheckFlags.ReadPartial) continue;
      let i = 0;
      for (const type of target.types) {
        const targetType = getTypeOfPropertyOfType(type, propertyName);
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
  function isWeakType(type: Type): boolean {
    if (type.flags & qt.TypeFlags.Object) {
      const resolved = resolveStructuredTypeMembers(<ObjectType>type);
      return (
        resolved.callSignatures.length === 0 &&
        resolved.constructSignatures.length === 0 &&
        !resolved.stringIndexInfo &&
        !resolved.numberIndexInfo &&
        resolved.properties.length > 0 &&
        every(resolved.properties, (p) => !!(p.flags & qt.SymbolFlags.Optional))
      );
    }
    if (type.flags & qt.TypeFlags.Intersection) return every((<IntersectionType>type).types, isWeakType);
    return false;
  }
  function hasCommonProperties(source: Type, target: Type, isComparingJsxAttributes: boolean) {
    for (const prop of getPropertiesOfType(source)) {
      if (isKnownProperty(target, prop.escName, isComparingJsxAttributes)) return true;
    }
    return false;
  }
  function hasCovariantVoidArgument(typeArguments: readonly Type[], variances: VarianceFlags[]): boolean {
    for (let i = 0; i < variances.length; i++) {
      if ((variances[i] & VarianceFlags.VarianceMask) === VarianceFlags.Covariant && typeArguments[i].flags & qt.TypeFlags.Void) return true;
    }
    return false;
  }
  function isUnconstrainedTypeParameter(type: Type) {
    return type.flags & qt.TypeFlags.TypeParameter && !getConstraintOfTypeParameter(<TypeParameter>type);
  }
  function isNonDeferredTypeReference(type: Type): type is TypeReference {
    return !!(getObjectFlags(type) & ObjectFlags.Reference) && !(<TypeReference>type).node;
  }
  function isTypeReferenceWithGenericArguments(type: Type): boolean {
    return isNonDeferredTypeReference(type) && some(getTypeArguments(type), (t) => isUnconstrainedTypeParameter(t) || isTypeReferenceWithGenericArguments(t));
  }
  function forEachProperty<T>(prop: Symbol, callback: (p: Symbol) => T): T | undefined {
    if (getCheckFlags(prop) & qt.CheckFlags.Synthetic) {
      for (const t of (<TransientSymbol>prop).containingType!.types) {
        const p = getPropertyOfType(t, prop.escName);
        const result = p && forEachProperty(p, callback);
        if (result) return result;
      }
      return;
    }
    return callback(prop);
  }
  function isPropertyInClassDerivedFrom(prop: Symbol, baseClass: Type | undefined) {
    return forEachProperty(prop, (sp) => {
      const sourceClass = getDeclaringClass(sp);
      return sourceClass ? hasBaseType(sourceClass, baseClass) : false;
    });
  }
  function isValidOverrideOf(sourceProp: Symbol, targetProp: Symbol) {
    return !forEachProperty(targetProp, (tp) => (getDeclarationModifierFlagsFromSymbol(tp) & ModifierFlags.Protected ? !isPropertyInClassDerivedFrom(sourceProp, getDeclaringClass(tp)) : false));
  }
  function isClassDerivedFromDeclaringClasses(checkClass: Type, prop: Symbol) {
    return forEachProperty(prop, (p) => (getDeclarationModifierFlagsFromSymbol(p) & ModifierFlags.Protected ? !hasBaseType(checkClass, getDeclaringClass(p)) : false)) ? undefined : checkClass;
  }
  function isDeeplyNestedType(type: Type, stack: Type[], depth: number): boolean {
    if (depth >= 5 && type.flags & qt.TypeFlags.Object && !isObjectOrArrayLiteralType(type)) {
      const symbol = type.symbol;
      if (symbol) {
        let count = 0;
        for (let i = 0; i < depth; i++) {
          const t = stack[i];
          if (t.flags & qt.TypeFlags.Object && t.symbol === symbol) {
            count++;
            if (count >= 5) return true;
          }
        }
      }
    }
    if (depth >= 5 && type.flags & qt.TypeFlags.IndexedAccess) {
      const root = getRootObjectTypeFromIndexedAccessChain(type);
      let count = 0;
      for (let i = 0; i < depth; i++) {
        const t = stack[i];
        if (getRootObjectTypeFromIndexedAccessChain(t) === root) {
          count++;
          if (count >= 5) return true;
        }
      }
    }
    return false;
  }
  function isPropertyIdenticalTo(sourceProp: Symbol, targetProp: Symbol): boolean {
    return compareProperties(sourceProp, targetProp, compareTypesIdentical) !== Ternary.False;
  }
  function compareProperties(sourceProp: Symbol, targetProp: Symbol, compareTypes: (source: Type, target: Type) => Ternary): Ternary {
    if (sourceProp === targetProp) return Ternary.True;
    const sourcePropAccessibility = getDeclarationModifierFlagsFromSymbol(sourceProp) & ModifierFlags.NonPublicAccessibilityModifier;
    const targetPropAccessibility = getDeclarationModifierFlagsFromSymbol(targetProp) & ModifierFlags.NonPublicAccessibilityModifier;
    if (sourcePropAccessibility !== targetPropAccessibility) return Ternary.False;
    if (sourcePropAccessibility) {
      if (getTargetSymbol(sourceProp) !== getTargetSymbol(targetProp)) return Ternary.False;
    } else {
      if ((sourceProp.flags & qt.SymbolFlags.Optional) !== (targetProp.flags & qt.SymbolFlags.Optional)) return Ternary.False;
    }
    if (isReadonlySymbol(sourceProp) !== isReadonlySymbol(targetProp)) return Ternary.False;
    return compareTypes(getTypeOfSymbol(sourceProp), getTypeOfSymbol(targetProp));
  }
  function isMatchingSignature(source: Signature, target: Signature, partialMatch: boolean) {
    const sourceParameterCount = getParameterCount(source);
    const targetParameterCount = getParameterCount(target);
    const sourceMinArgumentCount = getMinArgumentCount(source);
    const targetMinArgumentCount = getMinArgumentCount(target);
    const sourceHasRestParameter = hasEffectiveRestParameter(source);
    const targetHasRestParameter = hasEffectiveRestParameter(target);
    if (sourceParameterCount === targetParameterCount && sourceMinArgumentCount === targetMinArgumentCount && sourceHasRestParameter === targetHasRestParameter) return true;
    if (partialMatch && sourceMinArgumentCount <= targetMinArgumentCount) return true;
    return false;
  }
  function compareSignaturesIdentical(
    source: Signature,
    target: Signature,
    partialMatch: boolean,
    ignoreThisTypes: boolean,
    ignoreReturnTypes: boolean,
    compareTypes: (s: Type, t: Type) => Ternary
  ): Ternary {
    if (source === target) return Ternary.True;
    if (!isMatchingSignature(source, target, partialMatch)) return Ternary.False;
    if (length(source.typeParameters) !== length(target.typeParameters)) return Ternary.False;
    if (target.typeParameters) {
      const mapper = createTypeMapper(source.typeParameters!, target.typeParameters);
      for (let i = 0; i < target.typeParameters.length; i++) {
        const s = source.typeParameters![i];
        const t = target.typeParameters[i];
        if (
          !(
            s === t ||
            (compareTypes(instantiateType(getConstraintFromTypeParameter(s), mapper) || unknownType, getConstraintFromTypeParameter(t) || unknownType) &&
              compareTypes(instantiateType(getDefaultFromTypeParameter(s), mapper) || unknownType, getDefaultFromTypeParameter(t) || unknownType))
          )
        ) {
          return Ternary.False;
        }
      }
      source = instantiateSignature(source, mapper, true);
    }
    let result = Ternary.True;
    if (!ignoreThisTypes) {
      const sourceThisType = getThisTypeOfSignature(source);
      if (sourceThisType) {
        const targetThisType = getThisTypeOfSignature(target);
        if (targetThisType) {
          const related = compareTypes(sourceThisType, targetThisType);
          if (!related) return Ternary.False;
          result &= related;
        }
      }
    }
    const targetLen = getParameterCount(target);
    for (let i = 0; i < targetLen; i++) {
      const s = getTypeAtPosition(source, i);
      const t = getTypeAtPosition(target, i);
      const related = compareTypes(t, s);
      if (!related) return Ternary.False;
      result &= related;
    }
    if (!ignoreReturnTypes) {
      const sourceTypePredicate = getTypePredicateOfSignature(source);
      const targetTypePredicate = getTypePredicateOfSignature(target);
      result &=
        sourceTypePredicate || targetTypePredicate
          ? compareTypePredicatesIdentical(sourceTypePredicate, targetTypePredicate, compareTypes)
          : compareTypes(getReturnTypeOfSignature(source), getReturnTypeOfSignature(target));
    }
    return result;
  }
  function compareTypePredicatesIdentical(source: TypePredicate | undefined, target: TypePredicate | undefined, compareTypes: (s: Type, t: Type) => Ternary): Ternary {
    return !(source && target && typePredicateKindsMatch(source, target))
      ? Ternary.False
      : source.type === target.type
      ? Ternary.True
      : source.type && target.type
      ? compareTypes(source.type, target.type)
      : Ternary.False;
  }
  function literalTypesWithSameBaseType(types: Type[]): boolean {
    let commonBaseType: Type | undefined;
    for (const t of types) {
      const baseType = getBaseTypeOfLiteralType(t);
      if (!commonBaseType) commonBaseType = baseType;
      if (baseType === t || baseType !== commonBaseType) return false;
    }
    return true;
  }
  function isArrayType(type: Type): boolean {
    return !!(getObjectFlags(type) & ObjectFlags.Reference) && ((<TypeReference>type).target === globalArrayType || (<TypeReference>type).target === globalReadonlyArrayType);
  }
  function isReadonlyArrayType(type: Type): boolean {
    return !!(getObjectFlags(type) & ObjectFlags.Reference) && (<TypeReference>type).target === globalReadonlyArrayType;
  }
  function isMutableArrayOrTuple(type: Type): boolean {
    return (isArrayType(type) && !isReadonlyArrayType(type)) || (isTupleType(type) && !type.target.readonly);
  }
  function isArrayLikeType(type: Type): boolean {
    return isArrayType(type) || (!(type.flags & qt.TypeFlags.Nullable) && isTypeAssignableTo(type, anyReadonlyArrayType));
  }
  function isEmptyArrayLiteralType(type: Type): boolean {
    const elementType = isArrayType(type) ? getTypeArguments(<TypeReference>type)[0] : undefined;
    return elementType === undefinedWideningType || elementType === implicitNeverType;
  }
  function isTupleLikeType(type: Type): boolean {
    return isTupleType(type) || !!getPropertyOfType(type, '0' as qb.__String);
  }
  function isArrayOrTupleLikeType(type: Type): boolean {
    return isArrayLikeType(type) || isTupleLikeType(type);
  }
  function isNeitherUnitTypeNorNever(type: Type): boolean {
    return !(type.flags & (TypeFlags.Unit | qt.TypeFlags.Never));
  }
  function isUnitType(type: Type): boolean {
    return !!(type.flags & qt.TypeFlags.Unit);
  }
  function isLiteralType(type: Type): boolean {
    return type.flags & qt.TypeFlags.Boolean ? true : type.flags & qt.TypeFlags.Union ? (type.flags & qt.TypeFlags.EnumLiteral ? true : every((<UnionType>type).types, isUnitType)) : isUnitType(type);
  }
  function isTupleType(type: Type): type is TupleTypeReference {
    return !!(getObjectFlags(type) & ObjectFlags.Reference && (<TypeReference>type).target.objectFlags & ObjectFlags.Tuple);
  }
  function isZeroBigInt({ value }: BigIntLiteralType) {
    return value.base10Value === '0';
  }
  function removeDefinitelyFalsyTypes(type: Type): Type {
    return getFalsyFlags(type) & qt.TypeFlags.DefinitelyFalsy ? filterType(type, (t) => !(getFalsyFlags(t) & qt.TypeFlags.DefinitelyFalsy)) : type;
  }
  function extractDefinitelyFalsyTypes(type: Type): Type {
    return mapType(type, getDefinitelyFalsyPartOfType);
  }
  function addOptionalTypeMarker(type: Type) {
    return strictNullChecks ? getUnionType([type, optionalType]) : type;
  }
  function isNotOptionalTypeMarker(type: Type) {
    return type !== optionalType;
  }
  function removeOptionalTypeMarker(type: Type): Type {
    return strictNullChecks ? filterType(type, isNotOptionalTypeMarker) : type;
  }
  function propagateOptionalTypeMarker(type: Type, node: OptionalChain, wasOptional: boolean) {
    return wasOptional ? (is.outermostOptionalChain(node) ? getOptionalType(type) : addOptionalTypeMarker(type)) : type;
  }
  function isCoercibleUnderDoubleEquals(source: Type, target: Type): boolean {
    return (source.flags & (TypeFlags.Number | qt.TypeFlags.String | qt.TypeFlags.BooleanLiteral)) !== 0 && (target.flags & (TypeFlags.Number | qt.TypeFlags.String | qt.TypeFlags.Boolean)) !== 0;
  }
  function isObjectTypeWithInferableIndex(type: Type): boolean {
    return type.flags & qt.TypeFlags.Intersection
      ? every((<IntersectionType>type).types, isObjectTypeWithInferableIndex)
      : !!(type.symbol && (type.symbol.flags & (SymbolFlags.ObjectLiteral | qt.SymbolFlags.TypeLiteral | qt.SymbolFlags.Enum | qt.SymbolFlags.ValueModule)) !== 0 && !typeHasCallOrConstructSignatures(type)) ||
          !!(getObjectFlags(type) & ObjectFlags.ReverseMapped && isObjectTypeWithInferableIndex((type as ReverseMappedType).source));
  }
  function createSymbolWithType(source: Symbol, type: Type | undefined) {
    const symbol = new Symbol(source.flags, source.escName, getCheckFlags(source) & qt.CheckFlags.Readonly);
    symbol.declarations = source.declarations;
    symbol.parent = source.parent;
    symbol.type = type;
    symbol.target = source;
    if (source.valueDeclaration) symbol.valueDeclaration = source.valueDeclaration;
    const nameType = s.getLinks(source).nameType;
    if (nameType) symbol.nameType = nameType;
    return symbol;
  }
  function transformTypeOfMembers(type: Type, f: (propertyType: Type) => Type) {
    const members = new SymbolTable();
    for (const property of getPropertiesOfObjectType(type)) {
      const original = getTypeOfSymbol(property);
      const updated = f(original);
      members.set(property.escName, updated === original ? property : createSymbolWithType(property, updated));
    }
    return members;
  }
  function createWideningContext(parent: WideningContext | undefined, propertyName: qb.__String | undefined, siblings: Type[] | undefined): WideningContext {
    return { parent, propertyName, siblings, resolvedProperties: undefined };
  }
  function reportWideningErrorsInType(type: Type): boolean {
    let errorReported = false;
    if (getObjectFlags(type) & ObjectFlags.ContainsWideningType) {
      if (type.flags & qt.TypeFlags.Union) {
        if (some((<UnionType>type).types, isEmptyObjectType)) errorReported = true;
        else {
          for (const t of (<UnionType>type).types) {
            if (reportWideningErrorsInType(t)) errorReported = true;
          }
        }
      }
      if (isArrayType(type) || isTupleType(type)) {
        for (const t of getTypeArguments(<TypeReference>type)) {
          if (reportWideningErrorsInType(t)) errorReported = true;
        }
      }
      if (isObjectLiteralType(type)) {
        for (const p of getPropertiesOfObjectType(type)) {
          const t = getTypeOfSymbol(p);
          if (getObjectFlags(t) & ObjectFlags.ContainsWideningType) {
            if (!reportWideningErrorsInType(t)) error(p.valueDeclaration, qd.msgs.Object_literal_s_property_0_implicitly_has_an_1_type, p.symbolToString(), typeToString(getWidenedType(t)));
            errorReported = true;
          }
        }
      }
    }
    return errorReported;
  }
  function reportImplicitAny(declaration: Declaration, type: Type, wideningKind?: WideningKind) {
    const typeAsString = typeToString(getWidenedType(type));
    if (is.inJSFile(declaration) && !isCheckJsEnabledForFile(get.sourceFileOf(declaration), compilerOptions)) return;
    let diagnostic: qd.Message;
    switch (declaration.kind) {
      case Syntax.BinaryExpression:
      case Syntax.PropertyDeclaration:
      case Syntax.PropertySignature:
        diagnostic = noImplicitAny ? qd.msgs.Member_0_implicitly_has_an_1_type : qd.msgs.Member_0_implicitly_has_an_1_type_but_a_better_type_may_be_inferred_from_usage;
        break;
      case Syntax.Parameter:
        const param = declaration as ParameterDeclaration;
        if (
          is.kind(qc.Identifier, param.name) &&
          (is.kind(qc.CallSignatureDeclaration, param.parent) || is.kind(qc.MethodSignature, param.parent) || is.kind(qc.FunctionTypeNode, param.parent)) &&
          param.parent.parameters.indexOf(param) > -1 &&
          (resolveName(param, param.name.escapedText, qt.SymbolFlags.Type, undefined, param.name.escapedText, true) ||
            (param.name.originalKeywordKind && qy.is.typeNode(param.name.originalKeywordKind)))
        ) {
          const newName = 'arg' + param.parent.parameters.indexOf(param);
          errorOrSuggestion(noImplicitAny, declaration, qd.msgs.Parameter_has_a_name_but_no_type_Did_you_mean_0_Colon_1, newName, declarationNameToString(param.name));
          return;
        }
        diagnostic = (<ParameterDeclaration>declaration).dot3Token
          ? noImplicitAny
            ? qd.msgs.Rest_parameter_0_implicitly_has_an_any_type
            : qd.msgs.Rest_parameter_0_implicitly_has_an_any_type_but_a_better_type_may_be_inferred_from_usage
          : noImplicitAny
          ? qd.msgs.Parameter_0_implicitly_has_an_1_type
          : qd.msgs.Parameter_0_implicitly_has_an_1_type_but_a_better_type_may_be_inferred_from_usage;
        break;
      case Syntax.BindingElement:
        diagnostic = qd.msgs.Binding_element_0_implicitly_has_an_1_type;
        if (!noImplicitAny) return;
        break;
      case Syntax.DocFunctionType:
        error(declaration, qd.msgs.Function_type_which_lacks_return_type_annotation_implicitly_has_an_0_return_type, typeAsString);
        return;
      case Syntax.FunctionDeclaration:
      case Syntax.MethodDeclaration:
      case Syntax.MethodSignature:
      case Syntax.GetAccessor:
      case Syntax.SetAccessor:
      case Syntax.FunctionExpression:
      case Syntax.ArrowFunction:
        if (noImplicitAny && !(declaration as NamedDeclaration).name) {
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
      case Syntax.MappedType:
        if (noImplicitAny) error(declaration, qd.msgs.Mapped_object_type_implicitly_has_an_any_template_type);
        return;
      default:
        diagnostic = noImplicitAny ? qd.msgs.Variable_0_implicitly_has_an_1_type : qd.msgs.Variable_0_implicitly_has_an_1_type_but_a_better_type_may_be_inferred_from_usage;
    }
    errorOrSuggestion(noImplicitAny, declaration, diagnostic, declarationNameToString(get.nameOfDeclaration(declaration)), typeAsString);
  }
  function reportErrorsFromWidening(declaration: Declaration, type: Type, wideningKind?: WideningKind) {
    if (
      produceDiagnostics &&
      noImplicitAny &&
      getObjectFlags(type) & ObjectFlags.ContainsWideningType &&
      (!wideningKind || !getContextualSignatureForFunctionLikeDeclaration(declaration as FunctionLikeDeclaration))
    ) {
      if (!reportWideningErrorsInType(type)) reportImplicitAny(declaration, type, wideningKind);
    }
  }
  function applyToParameterTypes(source: Signature, target: Signature, callback: (s: Type, t: Type) => void) {
    const sourceCount = getParameterCount(source);
    const targetCount = getParameterCount(target);
    const sourceRestType = getEffectiveRestType(source);
    const targetRestType = getEffectiveRestType(target);
    const targetNonRestCount = targetRestType ? targetCount - 1 : targetCount;
    const paramCount = sourceRestType ? targetNonRestCount : Math.min(sourceCount, targetNonRestCount);
    const sourceThisType = getThisTypeOfSignature(source);
    if (sourceThisType) {
      const targetThisType = getThisTypeOfSignature(target);
      if (targetThisType) callback(sourceThisType, targetThisType);
    }
    for (let i = 0; i < paramCount; i++) {
      callback(getTypeAtPosition(source, i), getTypeAtPosition(target, i));
    }
    if (targetRestType) callback(getRestTypeAtPosition(source, paramCount), targetRestType);
  }
  function applyToReturnTypes(source: Signature, target: Signature, callback: (s: Type, t: Type) => void) {
    const sourceTypePredicate = getTypePredicateOfSignature(source);
    const targetTypePredicate = getTypePredicateOfSignature(target);
    if (sourceTypePredicate && targetTypePredicate && typePredicateKindsMatch(sourceTypePredicate, targetTypePredicate) && sourceTypePredicate.type && targetTypePredicate.type)
      callback(sourceTypePredicate.type, targetTypePredicate.type);
    else {
      callback(getReturnTypeOfSignature(source), getReturnTypeOfSignature(target));
    }
  }
  function createInferenceContext(typeParameters: readonly TypeParameter[], signature: Signature | undefined, flags: InferenceFlags, compareTypes?: TypeComparer): InferenceContext {
    return createInferenceContextWorker(typeParameters.map(createInferenceInfo), signature, flags, compareTypes || compareTypesAssignable);
  }
  function cloneInferenceContext<T extends InferenceContext | undefined>(context: T, extraFlags: InferenceFlags = 0): InferenceContext | (T & undefined) {
    return context && createInferenceContextWorker(map(context.inferences, cloneInferenceInfo), context.signature, context.flags | extraFlags, context.compareTypes);
  }
  function createInferenceContextWorker(inferences: InferenceInfo[], signature: Signature | undefined, flags: InferenceFlags, compareTypes: TypeComparer): InferenceContext {
    const context: InferenceContext = {
      inferences,
      signature,
      flags,
      compareTypes,
      mapper: makeFunctionTypeMapper((t) => mapToInferredType(context, t, true)),
      nonFixingMapper: makeFunctionTypeMapper((t) => mapToInferredType(context, t, false)),
    };
    return context;
  }
  function mapToInferredType(context: InferenceContext, t: Type, fix: boolean): Type {
    const inferences = context.inferences;
    for (let i = 0; i < inferences.length; i++) {
      const inference = inferences[i];
      if (t === inference.typeParameter) {
        if (fix && !inference.isFixed) {
          clearCachedInferences(inferences);
          inference.isFixed = true;
        }
        return getInferredType(context, i);
      }
    }
    return t;
  }
  function clearCachedInferences(inferences: InferenceInfo[]) {
    for (const inference of inferences) {
      if (!inference.isFixed) inference.inferredType = undefined;
    }
  }
  function createInferenceInfo(typeParameter: TypeParameter): InferenceInfo {
    return {
      typeParameter,
      candidates: undefined,
      contraCandidates: undefined,
      inferredType: undefined,
      priority: undefined,
      topLevel: true,
      isFixed: false,
    };
  }
  function cloneInferenceInfo(inference: InferenceInfo): InferenceInfo {
    return {
      typeParameter: inference.typeParameter,
      candidates: inference.candidates && inference.candidates.slice(),
      contraCandidates: inference.contraCandidates && inference.contraCandidates.slice(),
      inferredType: inference.inferredType,
      priority: inference.priority,
      topLevel: inference.topLevel,
      isFixed: inference.isFixed,
    };
  }
  function cloneInferredPartOfContext(context: InferenceContext): InferenceContext | undefined {
    const inferences = filter(context.inferences, hasInferenceCandidates);
    return inferences.length ? createInferenceContextWorker(map(inferences, cloneInferenceInfo), context.signature, context.flags, context.compareTypes) : undefined;
  }
  function couldContainTypeVariables(type: Type): boolean {
    const objectFlags = getObjectFlags(type);
    if (objectFlags & ObjectFlags.CouldContainTypeVariablesComputed) return !!(objectFlags & ObjectFlags.CouldContainTypeVariables);
    const result = !!(
      type.flags & qt.TypeFlags.Instantiable ||
      (type.flags & qt.TypeFlags.Object &&
        !isNonGenericTopLevelType(type) &&
        ((objectFlags & ObjectFlags.Reference && ((<TypeReference>type).node || forEach(getTypeArguments(<TypeReference>type), couldContainTypeVariables))) ||
          (objectFlags & ObjectFlags.Anonymous &&
            type.symbol &&
            type.symbol.flags & (SymbolFlags.Function | qt.SymbolFlags.Method | qt.SymbolFlags.Class | qt.SymbolFlags.TypeLiteral | qt.SymbolFlags.ObjectLiteral) &&
            type.symbol.declarations) ||
          objectFlags & (ObjectFlags.Mapped | ObjectFlags.ObjectRestType))) ||
      (type.flags & qt.TypeFlags.UnionOrIntersection && !(type.flags & qt.TypeFlags.EnumLiteral) && !isNonGenericTopLevelType(type) && some((<UnionOrIntersectionType>type).types, couldContainTypeVariables))
    );
    if (type.flags & qt.TypeFlags.ObjectFlagsType) (<ObjectFlagsType>type).objectFlags |= ObjectFlags.CouldContainTypeVariablesComputed | (result ? ObjectFlags.CouldContainTypeVariables : 0);
    return result;
  }
  function isNonGenericTopLevelType(type: Type) {
    if (type.aliasSymbol && !type.aliasTypeArguments) {
      const declaration = getDeclarationOfKind(type.aliasSymbol, Syntax.TypeAliasDeclaration);
      return !!(declaration && qc.findAncestor(declaration.parent, (n) => (n.kind === Syntax.SourceFile ? true : n.kind === Syntax.ModuleDeclaration ? false : 'quit')));
    }
    return false;
  }
  function isTypeParameterAtTopLevel(type: Type, typeParameter: TypeParameter): boolean {
    return !!(
      type === typeParameter ||
      (type.flags & qt.TypeFlags.UnionOrIntersection && some((<UnionOrIntersectionType>type).types, (t) => isTypeParameterAtTopLevel(t, typeParameter))) ||
      (type.flags & qt.TypeFlags.Conditional &&
        (isTypeParameterAtTopLevel(getTrueTypeFromConditionalType(<ConditionalType>type), typeParameter) ||
          isTypeParameterAtTopLevel(getFalseTypeFromConditionalType(<ConditionalType>type), typeParameter)))
    );
  }
  function createEmptyObjectTypeFromStringLiteral(type: Type) {
    const members = new SymbolTable();
    forEachType(type, (t) => {
      if (!(t.flags & qt.TypeFlags.StringLiteral)) return;
      const name = qy.get.escUnderscores((t as StringLiteralType).value);
      const literalProp = new Symbol(SymbolFlags.Property, name);
      literalProp.type = anyType;
      if (t.symbol) {
        literalProp.declarations = t.symbol.declarations;
        literalProp.valueDeclaration = t.symbol.valueDeclaration;
      }
      members.set(name, literalProp);
    });
    const indexInfo = type.flags & qt.TypeFlags.String ? createIndexInfo(emptyObjectType, false) : undefined;
    return createAnonymousType(undefined, members, empty, empty, indexInfo, undefined);
  }
  function inferTypeForHomomorphicMappedType(source: Type, target: MappedType, constraint: IndexType): Type | undefined {
    if (inInferTypeForHomomorphicMappedType) return;
    const key = source.id + ',' + target.id + ',' + constraint.id;
    if (reverseMappedCache.has(key)) return reverseMappedCache.get(key);
    inInferTypeForHomomorphicMappedType = true;
    const type = createReverseMappedType(source, target, constraint);
    inInferTypeForHomomorphicMappedType = false;
    reverseMappedCache.set(key, type);
    return type;
  }
  function isPartiallyInferableType(type: Type): boolean {
    return !(getObjectFlags(type) & ObjectFlags.NonInferrableType) || (isObjectLiteralType(type) && some(getPropertiesOfType(type), (prop) => isPartiallyInferableType(getTypeOfSymbol(prop))));
  }
  function createReverseMappedType(source: Type, target: MappedType, constraint: IndexType) {
    if (!(getIndexInfoOfType(source, IndexKind.String) || (getPropertiesOfType(source).length !== 0 && isPartiallyInferableType(source)))) return;
    if (isArrayType(source)) return createArrayType(inferReverseMappedType(getTypeArguments(<TypeReference>source)[0], target, constraint), isReadonlyArrayType(source));
    if (isTupleType(source)) {
      const elementTypes = map(getTypeArguments(source), (t) => inferReverseMappedType(t, target, constraint));
      const minLength = getMappedTypeModifiers(target) & MappedTypeModifiers.IncludeOptional ? getTypeReferenceArity(source) - (source.target.hasRestElement ? 1 : 0) : source.target.minLength;
      return createTupleType(elementTypes, minLength, source.target.hasRestElement, source.target.readonly, source.target.labeledElementDeclarations);
    }
    const reversed = createObjectType(ObjectFlags.ReverseMapped | ObjectFlags.Anonymous, undefined) as ReverseMappedType;
    reversed.source = source;
    reversed.mappedType = target;
    reversed.constraintType = constraint;
    return reversed;
  }
  function inferReverseMappedType(sourceType: Type, target: MappedType, constraint: IndexType): Type {
    const typeParameter = <TypeParameter>getIndexedAccessType(constraint.type, getTypeParameterFromMappedType(target));
    const templateType = getTemplateTypeFromMappedType(target);
    const inference = createInferenceInfo(typeParameter);
    inferTypes([inference], sourceType, templateType);
    return getTypeFromInference(inference) || unknownType;
  }
  function tupleTypesDefinitelyUnrelated(source: TupleTypeReference, target: TupleTypeReference) {
    return target.target.minLength > source.target.minLength || (!getRestTypeOfTupleType(target) && (!!getRestTypeOfTupleType(source) || getLengthOfTupleType(target) < getLengthOfTupleType(source)));
  }
  function typesDefinitelyUnrelated(source: Type, target: Type) {
    return (
      (isTupleType(source) && isTupleType(target) && tupleTypesDefinitelyUnrelated(source, target)) || (!!getUnmatchedProperty(source, target, true) && !!getUnmatchedProperty(target, source, true))
    );
  }
  function hasSkipDirectInferenceFlag(node: Node) {
    return !!getNodeLinks(node).skipDirectInference;
  }
  function isFromInferenceBlockedSource(type: Type) {
    return !!(type.symbol && some(type.symbol.declarations, hasSkipDirectInferenceFlag));
  }
  function inferTypes(inferences: InferenceInfo[], originalSource: Type, originalTarget: Type, priority: InferencePriority = 0, contravariant = false) {
    let symbolOrTypeStack: (Symbol | Type)[];
    let visited: qb.QMap<number>;
    let bivariant = false;
    let propagationType: Type;
    let inferencePriority = InferencePriority.MaxValue;
    let allowComplexConstraintInference = true;
    inferFromTypes(originalSource, originalTarget);
    function inferFromTypes(source: Type, target: Type): void {
      if (!couldContainTypeVariables(target)) return;
      if (source === wildcardType) {
        const savePropagationType = propagationType;
        propagationType = source;
        inferFromTypes(target, target);
        propagationType = savePropagationType;
        return;
      }
      if (source.aliasSymbol && source.aliasTypeArguments && source.aliasSymbol === target.aliasSymbol) {
        inferFromTypeArguments(source.aliasTypeArguments, target.aliasTypeArguments!, getAliasVariances(source.aliasSymbol));
        return;
      }
      if (source === target && source.flags & qt.TypeFlags.UnionOrIntersection) {
        for (const t of (<UnionOrIntersectionType>source).types) {
          inferFromTypes(t, t);
        }
        return;
      }
      if (target.flags & qt.TypeFlags.Union) {
        const [tempSources, tempTargets] = inferFromMatchingTypes(source.flags & qt.TypeFlags.Union ? (<UnionType>source).types : [source], (<UnionType>target).types, isTypeOrBaseIdenticalTo);
        const [sources, targets] = inferFromMatchingTypes(tempSources, tempTargets, isTypeCloselyMatchedBy);
        if (targets.length === 0) return;
        target = getUnionType(targets);
        if (sources.length === 0) {
          inferWithPriority(source, target, InferencePriority.NakedTypeVariable);
          return;
        }
        source = getUnionType(sources);
      } else if (
        target.flags & qt.TypeFlags.Intersection &&
        some((<IntersectionType>target).types, (t) => !!getInferenceInfoForType(t) || (isGenericMappedType(t) && !!getInferenceInfoForType(getHomomorphicTypeVariable(t) || neverType)))
      ) {
        if (!(source.flags & qt.TypeFlags.Union)) {
          const [sources, targets] = inferFromMatchingTypes(source.flags & qt.TypeFlags.Intersection ? (<IntersectionType>source).types : [source], (<IntersectionType>target).types, isTypeIdenticalTo);
          if (sources.length === 0 || targets.length === 0) return;
          source = getIntersectionType(sources);
          target = getIntersectionType(targets);
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
            if (!(priority & InferencePriority.ReturnType) && target.flags & qt.TypeFlags.TypeParameter && inference.topLevel && !isTypeParameterAtTopLevel(originalTarget, <TypeParameter>target)) {
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
            const indexType = getSimplifiedType((target as IndexedAccessType).indexType, false);
            if (indexType.flags & qt.TypeFlags.Instantiable) {
              const simplified = distributeIndexOverObjectType(getSimplifiedType((target as IndexedAccessType).objectType, false), indexType, false);
              if (simplified && simplified !== target) invokeOnce(source, simplified, inferFromTypes);
            }
          }
        }
      }
      if (
        getObjectFlags(source) & ObjectFlags.Reference &&
        getObjectFlags(target) & ObjectFlags.Reference &&
        ((<TypeReference>source).target === (<TypeReference>target).target || (isArrayType(source) && isArrayType(target))) &&
        !((<TypeReference>source).node && (<TypeReference>target).node)
      ) {
        inferFromTypeArguments(getTypeArguments(<TypeReference>source), getTypeArguments(<TypeReference>target), getVariances((<TypeReference>source).target));
      } else if (source.flags & qt.TypeFlags.Index && target.flags & qt.TypeFlags.Index) {
        contravariant = !contravariant;
        inferFromTypes((<IndexType>source).type, (<IndexType>target).type);
        contravariant = !contravariant;
      } else if ((isLiteralType(source) || source.flags & qt.TypeFlags.String) && target.flags & qt.TypeFlags.Index) {
        const empty = createEmptyObjectTypeFromStringLiteral(source);
        contravariant = !contravariant;
        inferWithPriority(empty, (target as IndexType).type, InferencePriority.LiteralKeyof);
        contravariant = !contravariant;
      } else if (source.flags & qt.TypeFlags.IndexedAccess && target.flags & qt.TypeFlags.IndexedAccess) {
        inferFromTypes((<IndexedAccessType>source).objectType, (<IndexedAccessType>target).objectType);
        inferFromTypes((<IndexedAccessType>source).indexType, (<IndexedAccessType>target).indexType);
      } else if (source.flags & qt.TypeFlags.Conditional && target.flags & qt.TypeFlags.Conditional) {
        inferFromTypes((<ConditionalType>source).checkType, (<ConditionalType>target).checkType);
        inferFromTypes((<ConditionalType>source).extendsType, (<ConditionalType>target).extendsType);
        inferFromTypes(getTrueTypeFromConditionalType(<ConditionalType>source), getTrueTypeFromConditionalType(<ConditionalType>target));
        inferFromTypes(getFalseTypeFromConditionalType(<ConditionalType>source), getFalseTypeFromConditionalType(<ConditionalType>target));
      } else if (target.flags & qt.TypeFlags.Conditional) {
        const savePriority = priority;
        priority |= contravariant ? InferencePriority.ContravariantConditional : 0;
        const targetTypes = [getTrueTypeFromConditionalType(<ConditionalType>target), getFalseTypeFromConditionalType(<ConditionalType>target)];
        inferToMultipleTypes(source, targetTypes, target.flags);
        priority = savePriority;
      } else if (target.flags & qt.TypeFlags.UnionOrIntersection) {
        inferToMultipleTypes(source, (<UnionOrIntersectionType>target).types, target.flags);
      } else if (source.flags & qt.TypeFlags.Union) {
        const sourceTypes = (<UnionOrIntersectionType>source).types;
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
    function inferWithPriority(source: Type, target: Type, newPriority: InferencePriority) {
      const savePriority = priority;
      priority |= newPriority;
      inferFromTypes(source, target);
      priority = savePriority;
    }
    function invokeOnce(source: Type, target: Type, action: (source: Type, target: Type) => void) {
      const key = source.id + ',' + target.id;
      const status = visited && visited.get(key);
      if (status !== undefined) {
        inferencePriority = Math.min(inferencePriority, status);
        return;
      }
      (visited || (visited = new qb.QMap<number>())).set(key, InferencePriority.Circularity);
      const saveInferencePriority = inferencePriority;
      inferencePriority = InferencePriority.MaxValue;
      action(source, target);
      visited.set(key, inferencePriority);
      inferencePriority = Math.min(inferencePriority, saveInferencePriority);
    }
    function inferFromMatchingTypes(sources: Type[], targets: Type[], matches: (s: Type, t: Type) => boolean): [Type[], Type[]] {
      let matchedSources: Type[] | undefined;
      let matchedTargets: Type[] | undefined;
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
    function inferFromTypeArguments(sourceTypes: readonly Type[], targetTypes: readonly Type[], variances: readonly VarianceFlags[]) {
      const count = sourceTypes.length < targetTypes.length ? sourceTypes.length : targetTypes.length;
      for (let i = 0; i < count; i++) {
        if (i < variances.length && (variances[i] & VarianceFlags.VarianceMask) === VarianceFlags.Contravariant) inferFromContravariantTypes(sourceTypes[i], targetTypes[i]);
        else {
          inferFromTypes(sourceTypes[i], targetTypes[i]);
        }
      }
    }
    function inferFromContravariantTypes(source: Type, target: Type) {
      if (strictFunctionTypes || priority & InferencePriority.AlwaysStrict) {
        contravariant = !contravariant;
        inferFromTypes(source, target);
        contravariant = !contravariant;
      } else {
        inferFromTypes(source, target);
      }
    }
    function getInferenceInfoForType(type: Type) {
      if (type.flags & qt.TypeFlags.TypeVariable) {
        for (const inference of inferences) {
          if (type === inference.typeParameter) return inference;
        }
      }
      return;
    }
    function getSingleTypeVariableFromIntersectionTypes(types: Type[]) {
      let typeVariable: Type | undefined;
      for (const type of types) {
        const t = type.flags & qt.TypeFlags.Intersection && find((<IntersectionType>type).types, (t) => !!getInferenceInfoForType(t));
        if (!t || (typeVariable && t !== typeVariable)) return;
        typeVariable = t;
      }
      return typeVariable;
    }
    function inferToMultipleTypes(source: Type, targets: Type[], targetFlags: qt.TypeFlags) {
      let typeVariableCount = 0;
      if (targetFlags & qt.TypeFlags.Union) {
        let nakedTypeVariable: Type | undefined;
        const sources = source.flags & qt.TypeFlags.Union ? (<UnionType>source).types : [source];
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
            inferFromTypes(getUnionType(unmatched), nakedTypeVariable!);
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
      if (targetFlags & qt.TypeFlags.Intersection ? typeVariableCount === 1 : typeVariableCount > 0) {
        for (const t of targets) {
          if (getInferenceInfoForType(t)) inferWithPriority(source, t, InferencePriority.NakedTypeVariable);
        }
      }
    }
    function inferToMappedType(source: Type, target: MappedType, constraintType: Type): boolean {
      if (constraintType.flags & qt.TypeFlags.Union) {
        let result = false;
        for (const type of (constraintType as UnionType).types) {
          result = inferToMappedType(source, target, type) || result;
        }
        return result;
      }
      if (constraintType.flags & qt.TypeFlags.Index) {
        const inference = getInferenceInfoForType((<IndexType>constraintType).type);
        if (inference && !inference.isFixed && !isFromInferenceBlockedSource(source)) {
          const inferredType = inferTypeForHomomorphicMappedType(source, target, <IndexType>constraintType);
          if (inferredType) {
            inferWithPriority(
              inferredType,
              inference.typeParameter,
              getObjectFlags(source) & ObjectFlags.NonInferrableType ? InferencePriority.PartialHomomorphicMappedType : InferencePriority.HomomorphicMappedType
            );
          }
        }
        return true;
      }
      if (constraintType.flags & qt.TypeFlags.TypeParameter) {
        inferWithPriority(getIndexType(source), constraintType, InferencePriority.MappedTypeConstraint);
        const extendedConstraint = getConstraintOfType(constraintType);
        if (extendedConstraint && inferToMappedType(source, target, extendedConstraint)) return true;
        const propTypes = map(getPropertiesOfType(source), getTypeOfSymbol);
        const stringIndexType = getIndexTypeOfType(source, IndexKind.String);
        const numberIndexInfo = getNonEnumNumberIndexInfo(source);
        const numberIndexType = numberIndexInfo && numberIndexInfo.type;
        inferFromTypes(getUnionType(append(append(propTypes, stringIndexType), numberIndexType)), getTemplateTypeFromMappedType(target));
        return true;
      }
      return false;
    }
    function inferFromObjectTypes(source: Type, target: Type) {
      const isNonConstructorObject = target.flags & qt.TypeFlags.Object && !(getObjectFlags(target) & ObjectFlags.Anonymous && target.symbol && target.symbol.flags & qt.SymbolFlags.Class);
      const symbolOrType = isNonConstructorObject ? (isTupleType(target) ? target.target : target.symbol) : undefined;
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
    function inferFromObjectTypesWorker(source: Type, target: Type) {
      if (
        getObjectFlags(source) & ObjectFlags.Reference &&
        getObjectFlags(target) & ObjectFlags.Reference &&
        ((<TypeReference>source).target === (<TypeReference>target).target || (isArrayType(source) && isArrayType(target)))
      ) {
        inferFromTypeArguments(getTypeArguments(<TypeReference>source), getTypeArguments(<TypeReference>target), getVariances((<TypeReference>source).target));
        return;
      }
      if (isGenericMappedType(source) && isGenericMappedType(target)) {
        inferFromTypes(getConstraintTypeFromMappedType(source), getConstraintTypeFromMappedType(target));
        inferFromTypes(getTemplateTypeFromMappedType(source), getTemplateTypeFromMappedType(target));
      }
      if (getObjectFlags(target) & ObjectFlags.Mapped) {
        const constraintType = getConstraintTypeFromMappedType(<MappedType>target);
        if (inferToMappedType(source, <MappedType>target, constraintType)) return;
      }
      if (!typesDefinitelyUnrelated(source, target)) {
        if (isArrayType(source) || isTupleType(source)) {
          if (isTupleType(target)) {
            const sourceLength = isTupleType(source) ? getLengthOfTupleType(source) : 0;
            const targetLength = getLengthOfTupleType(target);
            const sourceRestType = isTupleType(source) ? getRestTypeOfTupleType(source) : getElementTypeOfArrayType(source);
            const targetRestType = getRestTypeOfTupleType(target);
            const fixedLength = targetLength < sourceLength || sourceRestType ? targetLength : sourceLength;
            for (let i = 0; i < fixedLength; i++) {
              inferFromTypes(i < sourceLength ? getTypeArguments(<TypeReference>source)[i] : sourceRestType!, getTypeArguments(target)[i]);
            }
            if (targetRestType) {
              const types = fixedLength < sourceLength ? getTypeArguments(<TypeReference>source).slice(fixedLength, sourceLength) : [];
              if (sourceRestType) types.push(sourceRestType);
              if (types.length) inferFromTypes(getUnionType(types), targetRestType);
            }
            return;
          }
          if (isArrayType(target)) {
            inferFromIndexTypes(source, target);
            return;
          }
        }
        inferFromProperties(source, target);
        inferFromSignatures(source, target, SignatureKind.Call);
        inferFromSignatures(source, target, SignatureKind.Construct);
        inferFromIndexTypes(source, target);
      }
    }
    function inferFromProperties(source: Type, target: Type) {
      const properties = getPropertiesOfObjectType(target);
      for (const targetProp of properties) {
        const sourceProp = getPropertyOfType(source, targetProp.escName);
        if (sourceProp) inferFromTypes(getTypeOfSymbol(sourceProp), getTypeOfSymbol(targetProp));
      }
    }
    function inferFromSignatures(source: Type, target: Type, kind: SignatureKind) {
      const sourceSignatures = getSignaturesOfType(source, kind);
      const targetSignatures = getSignaturesOfType(target, kind);
      const sourceLen = sourceSignatures.length;
      const targetLen = targetSignatures.length;
      const len = sourceLen < targetLen ? sourceLen : targetLen;
      const skipParameters = !!(getObjectFlags(source) & ObjectFlags.NonInferrableType);
      for (let i = 0; i < len; i++) {
        inferFromSignature(getBaseSignature(sourceSignatures[sourceLen - len + i]), getErasedSignature(targetSignatures[targetLen - len + i]), skipParameters);
      }
    }
    function inferFromSignature(source: Signature, target: Signature, skipParameters: boolean) {
      if (!skipParameters) {
        const saveBivariant = bivariant;
        const kind = target.declaration ? target.declaration.kind : Syntax.Unknown;
        bivariant = bivariant || kind === Syntax.MethodDeclaration || kind === Syntax.MethodSignature || kind === Syntax.Constructor;
        applyToParameterTypes(source, target, inferFromContravariantTypes);
        bivariant = saveBivariant;
      }
      applyToReturnTypes(source, target, inferFromTypes);
    }
    function inferFromIndexTypes(source: Type, target: Type) {
      const targetStringIndexType = getIndexTypeOfType(target, IndexKind.String);
      if (targetStringIndexType) {
        const sourceIndexType = getIndexTypeOfType(source, IndexKind.String) || getImplicitIndexTypeOfType(source, IndexKind.String);
        if (sourceIndexType) inferFromTypes(sourceIndexType, targetStringIndexType);
      }
      const targetNumberIndexType = getIndexTypeOfType(target, IndexKind.Number);
      if (targetNumberIndexType) {
        const sourceIndexType = getIndexTypeOfType(source, IndexKind.Number) || getIndexTypeOfType(source, IndexKind.String) || getImplicitIndexTypeOfType(source, IndexKind.Number);
        if (sourceIndexType) inferFromTypes(sourceIndexType, targetNumberIndexType);
      }
    }
  }
  function isTypeOrBaseIdenticalTo(s: Type, t: Type) {
    return isTypeIdenticalTo(s, t) || !!((t.flags & qt.TypeFlags.String && s.flags & qt.TypeFlags.StringLiteral) || (t.flags & qt.TypeFlags.Number && s.flags & qt.TypeFlags.NumberLiteral));
  }
  function isTypeCloselyMatchedBy(s: Type, t: Type) {
    return !!((s.flags & qt.TypeFlags.Object && t.flags & qt.TypeFlags.Object && s.symbol && s.symbol === t.symbol) || (s.aliasSymbol && s.aliasTypeArguments && s.aliasSymbol === t.aliasSymbol));
  }
  function hasPrimitiveConstraint(type: TypeParameter): boolean {
    const constraint = getConstraintOfTypeParameter(type);
    return (
      !!constraint &&
      maybeTypeOfKind(constraint.flags & qt.TypeFlags.Conditional ? getDefaultConstraintOfConditionalType(constraint as ConditionalType) : constraint, qt.TypeFlags.Primitive | qt.TypeFlags.Index)
    );
  }
  function isObjectLiteralType(type: Type) {
    return !!(getObjectFlags(type) & ObjectFlags.ObjectLiteral);
  }
  function isObjectOrArrayLiteralType(type: Type) {
    return !!(getObjectFlags(type) & (ObjectFlags.ObjectLiteral | ObjectFlags.ArrayLiteral));
  }
  function unionObjectAndArrayLiteralCandidates(candidates: Type[]): Type[] {
    if (candidates.length > 1) {
      const objectLiterals = filter(candidates, isObjectOrArrayLiteralType);
      if (objectLiterals.length) {
        const literalsType = getUnionType(objectLiterals, UnionReduction.Subtype);
        return concatenate(
          filter(candidates, (t) => !isObjectOrArrayLiteralType(t)),
          [literalsType]
        );
      }
    }
    return candidates;
  }
  function isInTypeQuery(node: Node): boolean {
    return !!qc.findAncestor(node, (n) => (n.kind === Syntax.TypeQuery ? true : n.kind === Syntax.Identifier || n.kind === Syntax.QualifiedName ? false : 'quit'));
  }
  function isMatchingReference(source: Node, target: Node): boolean {
    switch (target.kind) {
      case Syntax.ParenthesizedExpression:
      case Syntax.NonNullExpression:
        return isMatchingReference(source, (target as NonNullExpression | ParenthesizedExpression).expression);
    }
    switch (source.kind) {
      case Syntax.Identifier:
        return (
          (target.kind === Syntax.Identifier && getResolvedSymbol(<Identifier>source) === getResolvedSymbol(<Identifier>target)) ||
          ((target.kind === Syntax.VariableDeclaration || target.kind === Syntax.BindingElement) &&
            getExportSymbolOfValueSymbolIfExported(getResolvedSymbol(<Identifier>source)) === getSymbolOfNode(target))
        );
      case Syntax.ThisKeyword:
        return target.kind === Syntax.ThisKeyword;
      case Syntax.SuperKeyword:
        return target.kind === Syntax.SuperKeyword;
      case Syntax.NonNullExpression:
      case Syntax.ParenthesizedExpression:
        return isMatchingReference((source as NonNullExpression | ParenthesizedExpression).expression, target);
      case Syntax.PropertyAccessExpression:
      case Syntax.ElementAccessExpression:
        return (
          is.accessExpression(target) &&
          getAccessedPropertyName(<AccessExpression>source) === getAccessedPropertyName(target) &&
          isMatchingReference((<AccessExpression>source).expression, target.expression)
        );
    }
    return false;
  }
  function containsTruthyCheck(source: Node, target: Node): boolean {
    return (
      isMatchingReference(source, target) ||
      (target.kind === Syntax.BinaryExpression &&
        (<BinaryExpression>target).operatorToken.kind === Syntax.Ampersand2Token &&
        (containsTruthyCheck(source, (<BinaryExpression>target).left) || containsTruthyCheck(source, (<BinaryExpression>target).right)))
    );
  }
  function containsMatchingReference(source: Node, target: Node) {
    while (is.accessExpression(source)) {
      source = source.expression;
      if (isMatchingReference(source, target)) return true;
    }
    return false;
  }
  function optionalChainContainsReference(source: Node, target: Node) {
    while (is.optionalChain(source)) {
      source = source.expression;
      if (isMatchingReference(source, target)) return true;
    }
    return false;
  }
  function isDiscriminantProperty(type: Type | undefined, name: qb.__String) {
    if (type && type.flags & qt.TypeFlags.Union) {
      const prop = getUnionOrIntersectionProperty(<UnionType>type, name);
      if (prop && getCheckFlags(prop) & qt.CheckFlags.SyntheticProperty) {
        if ((<TransientSymbol>prop).isDiscriminantProperty === undefined) {
          (<TransientSymbol>prop).isDiscriminantProperty =
            ((<TransientSymbol>prop).checkFlags & qt.CheckFlags.Discriminant) === qt.CheckFlags.Discriminant && !maybeTypeOfKind(getTypeOfSymbol(prop), qt.TypeFlags.Instantiable);
        }
        return !!(<TransientSymbol>prop).isDiscriminantProperty;
      }
    }
    return false;
  }
  function findDiscriminantProperties(sourceProperties: Symbol[], target: Type): Symbol[] | undefined {
    let result: Symbol[] | undefined;
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
  function isOrContainsMatchingReference(source: Node, target: Node) {
    return isMatchingReference(source, target) || containsMatchingReference(source, target);
  }
  function hasMatchingArgument(callExpression: CallExpression, reference: Node) {
    if (callExpression.arguments) {
      for (const argument of callExpression.arguments) {
        if (isOrContainsMatchingReference(reference, argument)) return true;
      }
    }
    if (callExpression.expression.kind === Syntax.PropertyAccessExpression && isOrContainsMatchingReference(reference, (<PropertyAccessExpression>callExpression.expression).expression)) return true;
    return false;
  }
  function typeMaybeAssignableTo(source: Type, target: Type) {
    if (!(source.flags & qt.TypeFlags.Union)) return isTypeAssignableTo(source, target);
    for (const t of (<UnionType>source).types) {
      if (isTypeAssignableTo(t, target)) return true;
    }
    return false;
  }
  function isFunctionObjectType(type: ObjectType): boolean {
    const resolved = resolveStructuredTypeMembers(type);
    return !!(resolved.callSignatures.length || resolved.constructSignatures.length || (resolved.members.get('bind' as qb.__String) && isTypeSubtypeOf(type, globalFunctionType)));
  }
  function isDestructuringAssignmentTarget(parent: Node) {
    return (
      (parent.parent.kind === Syntax.BinaryExpression && (parent.parent as BinaryExpression).left === parent) ||
      (parent.parent.kind === Syntax.ForOfStatement && (parent.parent as ForOfStatement).initer === parent)
    );
  }
  function isEmptyArrayAssignment(node: VariableDeclaration | BindingElement | Expression) {
    return (
      (node.kind === Syntax.VariableDeclaration && (<VariableDeclaration>node).initer && isEmptyArrayLiteral((<VariableDeclaration>node).initer!)) ||
      (node.kind !== Syntax.BindingElement && node.parent.kind === Syntax.BinaryExpression && isEmptyArrayLiteral((<BinaryExpression>node.parent).right))
    );
  }
  function eachTypeContainedIn(source: Type, types: Type[]) {
    return source.flags & qt.TypeFlags.Union ? !forEach((<UnionType>source).types, (t) => !contains(types, t)) : contains(types, source);
  }
  function isTypeSubsetOf(source: Type, target: Type) {
    return source === target || (target.flags & qt.TypeFlags.Union && isTypeSubsetOfUnion(source, <UnionType>target));
  }
  function isTypeSubsetOfUnion(source: Type, target: UnionType) {
    if (source.flags & qt.TypeFlags.Union) {
      for (const t of (<UnionType>source).types) {
        if (!containsType(target.types, t)) return false;
      }
      return true;
    }
    if (source.flags & qt.TypeFlags.EnumLiteral && getBaseTypeOfEnumLiteralType(<LiteralType>source) === target) return true;
    return containsType(target.types, source);
  }
  function forEachType<T>(type: Type, f: (t: Type) => T | undefined): T | undefined {
    return type.flags & qt.TypeFlags.Union ? forEach((<UnionType>type).types, f) : f(type);
  }
  function everyType(type: Type, f: (t: Type) => boolean): boolean {
    return type.flags & qt.TypeFlags.Union ? every((<UnionType>type).types, f) : f(type);
  }
  function filterType(type: Type, f: (t: Type) => boolean): Type {
    if (type.flags & qt.TypeFlags.Union) {
      const types = (<UnionType>type).types;
      const filtered = filter(types, f);
      return filtered === types ? type : getUnionTypeFromSortedList(filtered, (<UnionType>type).objectFlags);
    }
    return type.flags & qt.TypeFlags.Never || f(type) ? type : neverType;
  }
  function countTypes(type: Type) {
    return type.flags & qt.TypeFlags.Union ? (type as UnionType).types.length : 1;
  }
  function mapType(type: Type, mapper: (t: Type) => Type, noReductions?: boolean): Type;
  function mapType(type: Type, mapper: (t: Type) => Type | undefined, noReductions?: boolean): Type | undefined;
  function mapType(type: Type, mapper: (t: Type) => Type | undefined, noReductions?: boolean): Type | undefined {
    if (type.flags & qt.TypeFlags.Never) return type;
    if (!(type.flags & qt.TypeFlags.Union)) return mapper(type);
    let mappedTypes: Type[] | undefined;
    for (const t of (<UnionType>type).types) {
      const mapped = mapper(t);
      if (mapped) {
        if (!mappedTypes) mappedTypes = [mapped];
        else {
          mappedTypes.push(mapped);
        }
      }
    }
    return mappedTypes && getUnionType(mappedTypes, noReductions ? UnionReduction.None : UnionReduction.Literal);
  }
  function extractTypesOfKind(type: Type, kind: qt.TypeFlags) {
    return filterType(type, (t) => (t.flags & kind) !== 0);
  }
  function replacePrimitivesWithLiterals(typeWithPrimitives: Type, typeWithLiterals: Type) {
    if (
      (isTypeSubsetOf(stringType, typeWithPrimitives) && maybeTypeOfKind(typeWithLiterals, qt.TypeFlags.StringLiteral)) ||
      (isTypeSubsetOf(numberType, typeWithPrimitives) && maybeTypeOfKind(typeWithLiterals, qt.TypeFlags.NumberLiteral)) ||
      (isTypeSubsetOf(bigintType, typeWithPrimitives) && maybeTypeOfKind(typeWithLiterals, qt.TypeFlags.BigIntLiteral))
    ) {
      return mapType(typeWithPrimitives, (t) =>
        t.flags & qt.TypeFlags.String
          ? extractTypesOfKind(typeWithLiterals, qt.TypeFlags.String | qt.TypeFlags.StringLiteral)
          : t.flags & qt.TypeFlags.Number
          ? extractTypesOfKind(typeWithLiterals, qt.TypeFlags.Number | qt.TypeFlags.NumberLiteral)
          : t.flags & qt.TypeFlags.BigInt
          ? extractTypesOfKind(typeWithLiterals, qt.TypeFlags.BigInt | qt.TypeFlags.BigIntLiteral)
          : t
      );
    }
    return typeWithPrimitives;
  }
  function isIncomplete(flowType: FlowType) {
    return flowType.flags === 0;
  }
  function createFlowType(type: Type, incomplete: boolean): FlowType {
    return incomplete ? { flags: 0, type } : type;
  }
  function createEvolvingArrayType(elementType: Type): EvolvingArrayType {
    const result = <EvolvingArrayType>createObjectType(ObjectFlags.EvolvingArray);
    result.elementType = elementType;
    return result;
  }
  function addEvolvingArrayElementType(evolvingArrayType: EvolvingArrayType, node: Expression): EvolvingArrayType {
    const elementType = getBaseTypeOfLiteralType(getContextFreeTypeOfExpression(node));
    return isTypeSubsetOf(elementType, evolvingArrayType.elementType) ? evolvingArrayType : getEvolvingArrayType(getUnionType([evolvingArrayType.elementType, elementType]));
  }
  function createFinalArrayType(elementType: Type) {
    return elementType.flags & qt.TypeFlags.Never
      ? autoArrayType
      : createArrayType(elementType.flags & qt.TypeFlags.Union ? getUnionType((<UnionType>elementType).types, UnionReduction.Subtype) : elementType);
  }
  function finalizeEvolvingArrayType(type: Type): Type {
    return getObjectFlags(type) & ObjectFlags.EvolvingArray ? getFinalArrayType(<EvolvingArrayType>type) : type;
  }
  function isEvolvingArrayTypeList(types: Type[]) {
    let hasEvolvingArrayType = false;
    for (const t of types) {
      if (!(t.flags & qt.TypeFlags.Never)) {
        if (!(getObjectFlags(t) & ObjectFlags.EvolvingArray)) return false;
        hasEvolvingArrayType = true;
      }
    }
    return hasEvolvingArrayType;
  }
  function isEvolvingArrayOperationTarget(node: Node) {
    const root = getReferenceRoot(node);
    const parent = root.parent;
    const isLengthPushOrUnshift =
      is.kind(qc.PropertyAccessExpression, parent) &&
      (parent.name.escapedText === 'length' || (parent.parent.kind === Syntax.CallExpression && is.kind(qc.Identifier, parent.name) && isPushOrUnshiftIdentifier(parent.name)));
    const isElementAssignment =
      parent.kind === Syntax.ElementAccessExpression &&
      (<ElementAccessExpression>parent).expression === root &&
      parent.parent.kind === Syntax.BinaryExpression &&
      (<BinaryExpression>parent.parent).operatorToken.kind === Syntax.EqualsToken &&
      (<BinaryExpression>parent.parent).left === parent &&
      !is.assignmentTarget(parent.parent) &&
      isTypeAssignableToKind(getTypeOfExpression((<ElementAccessExpression>parent).argumentExpression), qt.TypeFlags.NumberLike);
    return isLengthPushOrUnshift || isElementAssignment;
  }
  function isDeclarationWithExplicitTypeAnnotation(declaration: Declaration) {
    return (
      (declaration.kind === Syntax.VariableDeclaration || declaration.kind === Syntax.Parameter || declaration.kind === Syntax.PropertyDeclaration || declaration.kind === Syntax.PropertySignature) &&
      !!get.effectiveTypeAnnotationNode(declaration as VariableDeclaration | ParameterDeclaration | PropertyDeclaration | PropertySignature)
    );
  }
  function hasTypePredicateOrNeverReturnType(signature: Signature) {
    return !!(getTypePredicateOfSignature(signature) || (signature.declaration && (getReturnTypeFromAnnotation(signature.declaration) || unknownType).flags & qt.TypeFlags.Never));
  }
  function reportFlowControlError(node: Node) {
    const block = <Block | ModuleBlock | SourceFile>qc.findAncestor(node, isFunctionOrModuleBlock);
    const sourceFile = get.sourceFileOf(node);
    const span = getSpanOfTokenAtPosition(sourceFile, block.statements.pos);
    diagnostics.add(createFileDiagnostic(sourceFile, span.start, span.length, qd.msgs.The_containing_function_or_module_body_is_too_large_for_control_flow_analysis));
  }
  function isReachableFlowNode(flow: FlowNode) {
    const result = isReachableFlowNodeWorker(flow, false);
    lastFlowNode = flow;
    lastFlowNodeReachable = result;
    return result;
  }
  function isFalseExpression(expr: Expression): boolean {
    const node = skipParentheses(expr);
    return (
      node.kind === Syntax.FalseKeyword ||
      (node.kind === Syntax.BinaryExpression &&
        (((<BinaryExpression>node).operatorToken.kind === Syntax.Ampersand2Token && (isFalseExpression((<BinaryExpression>node).left) || isFalseExpression((<BinaryExpression>node).right))) ||
          ((<BinaryExpression>node).operatorToken.kind === Syntax.Bar2Token && isFalseExpression((<BinaryExpression>node).left) && isFalseExpression((<BinaryExpression>node).right))))
    );
  }
  function isReachableFlowNodeWorker(flow: FlowNode, noCacheCheck: boolean): boolean {
    while (true) {
      if (flow === lastFlowNode) return lastFlowNodeReachable;
      const flags = flow.flags;
      if (flags & FlowFlags.Shared) {
        if (!noCacheCheck) {
          const id = getFlowNodeId(flow);
          const reachable = flowNodeReachable[id];
          return reachable !== undefined ? reachable : (flowNodeReachable[id] = isReachableFlowNodeWorker(flow, true));
        }
        noCacheCheck = false;
      }
      if (flags & (FlowFlags.Assignment | FlowFlags.Condition | FlowFlags.ArrayMutation)) flow = (<FlowAssignment | FlowCondition | FlowArrayMutation>flow).antecedent;
      else if (flags & FlowFlags.Call) {
        const signature = getEffectsSignature((<FlowCall>flow).node);
        if (signature) {
          const predicate = getTypePredicateOfSignature(signature);
          if (predicate && predicate.kind === TypePredicateKind.AssertsIdentifier) {
            const predicateArgument = (<FlowCall>flow).node.arguments[predicate.parameterIndex];
            if (predicateArgument && isFalseExpression(predicateArgument)) return false;
          }
          if (getReturnTypeOfSignature(signature).flags & qt.TypeFlags.Never) return false;
        }
        flow = (<FlowCall>flow).antecedent;
      } else if (flags & FlowFlags.BranchLabel) {
        return some((<FlowLabel>flow).antecedents, (f) => isReachableFlowNodeWorker(f, false));
      } else if (flags & FlowFlags.LoopLabel) {
        flow = (<FlowLabel>flow).antecedents![0];
      } else if (flags & FlowFlags.SwitchClause) {
        if ((<FlowSwitchClause>flow).clauseStart === (<FlowSwitchClause>flow).clauseEnd && isExhaustiveSwitchStatement((<FlowSwitchClause>flow).switchStatement)) return false;
        flow = (<FlowSwitchClause>flow).antecedent;
      } else if (flags & FlowFlags.ReduceLabel) {
        lastFlowNode = undefined;
        const target = (<FlowReduceLabel>flow).target;
        const saveAntecedents = target.antecedents;
        target.antecedents = (<FlowReduceLabel>flow).antecedents;
        const result = isReachableFlowNodeWorker((<FlowReduceLabel>flow).antecedent, false);
        target.antecedents = saveAntecedents;
        return result;
      }
      return !(flags & FlowFlags.Unreachable);
    }
  }
  function isPostSuperFlowNode(flow: FlowNode, noCacheCheck: boolean): boolean {
    while (true) {
      const flags = flow.flags;
      if (flags & FlowFlags.Shared) {
        if (!noCacheCheck) {
          const id = getFlowNodeId(flow);
          const postSuper = flowNodePostSuper[id];
          return postSuper !== undefined ? postSuper : (flowNodePostSuper[id] = isPostSuperFlowNode(flow, true));
        }
        noCacheCheck = false;
      }
      if (flags & (FlowFlags.Assignment | FlowFlags.Condition | FlowFlags.ArrayMutation | FlowFlags.SwitchClause))
        flow = (<FlowAssignment | FlowCondition | FlowArrayMutation | FlowSwitchClause>flow).antecedent;
      else if (flags & FlowFlags.Call) {
        if ((<FlowCall>flow).node.expression.kind === Syntax.SuperKeyword) return true;
        flow = (<FlowCall>flow).antecedent;
      } else if (flags & FlowFlags.BranchLabel) {
        return every((<FlowLabel>flow).antecedents, (f) => isPostSuperFlowNode(f, false));
      } else if (flags & FlowFlags.LoopLabel) {
        flow = (<FlowLabel>flow).antecedents![0];
      } else if (flags & FlowFlags.ReduceLabel) {
        const target = (<FlowReduceLabel>flow).target;
        const saveAntecedents = target.antecedents;
        target.antecedents = (<FlowReduceLabel>flow).antecedents;
        const result = isPostSuperFlowNode((<FlowReduceLabel>flow).antecedent, false);
        target.antecedents = saveAntecedents;
        return result;
      }
      return !!(flags & FlowFlags.Unreachable);
    }
  }
  function hasParentWithAssignmentsMarked(node: Node) {
    return !!qc.findAncestor(node.parent, (node) => is.functionLike(node) && !!(getNodeLinks(node).flags & NodeCheckFlags.AssignmentsMarked));
  }
  function markParameterAssignments(node: Node) {
    if (node.kind === Syntax.Identifier) {
      if (is.assignmentTarget(node)) {
        const symbol = getResolvedSymbol(<Identifier>node);
        if (symbol.valueDeclaration && get.rootDeclaration(symbol.valueDeclaration).kind === Syntax.Parameter) symbol.isAssigned = true;
      }
    } else {
      qc.forEach.child(node, markParameterAssignments);
    }
  }
  function removeOptionalityFromDeclaredType(declaredType: Type, declaration: VariableLikeDeclaration): Type {
    if (pushTypeResolution(declaration.symbol, TypeSystemPropertyName.DeclaredType)) {
      const annotationIncludesUndefined =
        strictNullChecks &&
        declaration.kind === Syntax.Parameter &&
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
  function isConstraintPosition(node: Node) {
    const parent = node.parent;
    return (
      parent.kind === Syntax.PropertyAccessExpression ||
      (parent.kind === Syntax.CallExpression && (<CallExpression>parent).expression === node) ||
      (parent.kind === Syntax.ElementAccessExpression && (<ElementAccessExpression>parent).expression === node) ||
      (parent.kind === Syntax.BindingElement && (<BindingElement>parent).name === node && !!(<BindingElement>parent).initer)
    );
  }
  function typeHasNullableConstraint(type: Type) {
    return type.flags & qt.TypeFlags.InstantiableNonPrimitive && maybeTypeOfKind(getBaseConstraintOfType(type) || unknownType, qt.TypeFlags.Nullable);
  }
  function isExportOrExportExpression(location: Node) {
    return !!qc.findAncestor(location, (e) => e.parent && is.kind(qc.ExportAssignment, e.parent) && e.parent.expression === e && is.entityNameExpression(e));
  }
  function markAliasReferenced(symbol: Symbol, location: Node) {
    if (symbol.isNonLocalAlias(SymbolFlags.Value) && !isInTypeQuery(location) && !this.getTypeOnlyAliasDeclaration()) {
      if ((compilerOptions.preserveConstEnums && isExportOrExportExpression(location)) || !isConstEnumOrConstEnumOnlyModule(this.resolveAlias())) symbol.markAliasSymbolAsReferenced();
      else symbol.markConstEnumAliasAsReferenced();
    }
  }
  function isInsideFunction(node: Node, threshold: Node): boolean {
    return !!qc.findAncestor(node, (n) => (n === threshold ? 'quit' : is.functionLike(n)));
  }
  function isBindingCapturedByNode(node: Node, decl: VariableDeclaration | BindingElement) {
    const links = getNodeLinks(node);
    return !!links && contains(links.capturedBlockScopeBindings, getSymbolOfNode(decl));
  }
  function isAssignedInBodyOfForStatement(node: Identifier, container: ForStatement): boolean {
    let current: Node = node;
    while (current.parent.kind === Syntax.ParenthesizedExpression) {
      current = current.parent;
    }
    let isAssigned = false;
    if (is.assignmentTarget(current)) isAssigned = true;
    else if (current.parent.kind === Syntax.PrefixUnaryExpression || current.parent.kind === Syntax.PostfixUnaryExpression) {
      const expr = <PrefixUnaryExpression | PostfixUnaryExpression>current.parent;
      isAssigned = expr.operator === Syntax.Plus2Token || expr.operator === Syntax.Minus2Token;
    }
    if (!isAssigned) return false;
    return !!qc.findAncestor(current, (n) => (n === container ? 'quit' : n === container.statement));
  }
  function captureLexicalThis(node: Node, container: Node): void {
    getNodeLinks(node).flags |= NodeCheckFlags.LexicalThis;
    if (container.kind === Syntax.PropertyDeclaration || container.kind === Syntax.Constructor) {
      const classNode = container.parent;
      getNodeLinks(classNode).flags |= NodeCheckFlags.CaptureThis;
    } else {
      getNodeLinks(container).flags |= NodeCheckFlags.CaptureThis;
    }
  }
  function findFirstSuperCall(node: Node): SuperCall | undefined {
    return is.superCall(node) ? node : is.functionLike(node) ? undefined : qc.forEach.child(node, findFirstSuperCall);
  }
  function classDeclarationExtendsNull(classDecl: ClassDeclaration): boolean {
    const classSymbol = getSymbolOfNode(classDecl);
    const classInstanceType = <InterfaceType>getDeclaredTypeOfSymbol(classSymbol);
    const baseConstructorType = getBaseConstructorTypeOfClass(classInstanceType);
    return baseConstructorType === nullWideningType;
  }
  function tryGetThisTypeAt(node: Node, includeGlobalThis = true, container = get.thisContainer(node, false)): Type | undefined {
    const isInJS = is.inJSFile(node);
    if (is.functionLike(container) && (!isInParameterIniterBeforeContainingFunction(node) || getThisNodeKind(ParameterDeclaration, container))) {
      const className = getClassNameFromPrototypeMethod(container);
      if (isInJS && className) {
        const classSymbol = check.expression(className).symbol;
        if (classSymbol && classSymbol.members && classSymbol.flags & qt.SymbolFlags.Function) {
          const classType = (getDeclaredTypeOfSymbol(classSymbol) as InterfaceType).thisType;
          if (classType) return getFlowTypeOfReference(node, classType);
        }
      } else if (isInJS && (container.kind === Syntax.FunctionExpression || container.kind === Syntax.FunctionDeclaration) && qc.getDoc.classTag(container)) {
        const classType = (getDeclaredTypeOfSymbol(getMergedSymbol(container.symbol)) as InterfaceType).thisType!;
        return getFlowTypeOfReference(node, classType);
      }
      const thisType = getThisTypeOfDeclaration(container) || getContextualThisParameterType(container);
      if (thisType) return getFlowTypeOfReference(node, thisType);
    }
    if (is.classLike(container.parent)) {
      const symbol = getSymbolOfNode(container.parent);
      const type = has.syntacticModifier(container, ModifierFlags.Static) ? this.getTypeOfSymbol() : (getDeclaredTypeOfSymbol(symbol) as InterfaceType).thisType!;
      return getFlowTypeOfReference(node, type);
    }
    if (isInJS) {
      const type = getTypeForThisExpressionFromDoc(container);
      if (type && type !== errorType) return getFlowTypeOfReference(node, type);
    }
    if (is.kind(qc.SourceFile, container)) {
      if (container.commonJsModuleIndicator) {
        const fileSymbol = getSymbolOfNode(container);
        return fileSymbol && getTypeOfSymbol(fileSymbol);
      } else if (container.externalModuleIndicator) {
        return undefinedType;
      } else if (includeGlobalThis) {
        return getTypeOfSymbol(globalThisSymbol);
      }
    }
  }
  function isInConstructorArgumentIniter(node: Node, constructorDecl: Node): boolean {
    return !!qc.findAncestor(node, (n) => (is.functionLikeDeclaration(n) ? 'quit' : n.kind === Syntax.Parameter && n.parent === constructorDecl));
  }
  function isInParameterIniterBeforeContainingFunction(node: Node) {
    let inBindingIniter = false;
    while (node.parent && !is.functionLike(node.parent)) {
      if (is.kind(qc.ParameterDeclaration, node.parent) && (inBindingIniter || node.parent.initer === node)) return true;
      if (is.kind(qc.BindingElement, node.parent) && node.parent.initer === node) inBindingIniter = true;
      node = node.parent;
    }
    return false;
  }
  function isPossiblyDiscriminantValue(node: Expression): boolean {
    switch (node.kind) {
      case Syntax.StringLiteral:
      case Syntax.NumericLiteral:
      case Syntax.BigIntLiteral:
      case Syntax.NoSubstitutionLiteral:
      case Syntax.TrueKeyword:
      case Syntax.FalseKeyword:
      case Syntax.NullKeyword:
      case Syntax.Identifier:
      case Syntax.UndefinedKeyword:
        return true;
      case Syntax.PropertyAccessExpression:
      case Syntax.ParenthesizedExpression:
        return isPossiblyDiscriminantValue((<PropertyAccessExpression | ParenthesizedExpression>node).expression);
      case Syntax.JsxExpression:
        return !(node as JsxExpression).expression || isPossiblyDiscriminantValue((node as JsxExpression).expression!);
    }
    return false;
  }
  function discriminateContextualTypeByObjectMembers(node: ObjectLiteralExpression, contextualType: UnionType) {
    return discriminateTypeByDiscriminableItems(
      contextualType,
      map(
        filter(node.properties, (p) => !!p.symbol && p.kind === Syntax.PropertyAssignment && isPossiblyDiscriminantValue(p.initer) && isDiscriminantProperty(contextualType, p.symbol.escName)),
        (prop) => [() => check.expression((prop as PropertyAssignment).initer), prop.symbol.escName] as [() => Type, qb.__String]
      ),
      isTypeAssignableTo,
      contextualType
    );
  }
  function discriminateContextualTypeByJSXAttributes(node: JsxAttributes, contextualType: UnionType) {
    return discriminateTypeByDiscriminableItems(
      contextualType,
      map(
        filter(
          node.properties,
          (p) => !!p.symbol && p.kind === Syntax.JsxAttribute && isDiscriminantProperty(contextualType, p.symbol.escName) && (!p.initer || isPossiblyDiscriminantValue(p.initer))
        ),
        (prop) => [!(prop as JsxAttribute).initer ? () => trueType : () => check.expression((prop as JsxAttribute).initer!), prop.symbol.escName] as [() => Type, qb.__String]
      ),
      isTypeAssignableTo,
      contextualType
    );
  }
  function instantiateContextualType(contextualType: Type | undefined, node: Node, contextFlags?: ContextFlags): Type | undefined {
    if (contextualType && maybeTypeOfKind(contextualType, qt.TypeFlags.Instantiable)) {
      const inferenceContext = getInferenceContext(node);
      if (inferenceContext && some(inferenceContext.inferences, hasInferenceCandidates)) {
        if (contextFlags && contextFlags & ContextFlags.Signature) return instantiateInstantiableTypes(contextualType, inferenceContext.nonFixingMapper);
        if (inferenceContext.returnMapper) return instantiateInstantiableTypes(contextualType, inferenceContext.returnMapper);
      }
    }
    return contextualType;
  }
  function instantiateInstantiableTypes(type: Type, mapper: TypeMapper): Type {
    if (type.flags & qt.TypeFlags.Instantiable) return instantiateType(type, mapper);
    if (type.flags & qt.TypeFlags.Union) {
      return getUnionType(
        map((<UnionType>type).types, (t) => instantiateInstantiableTypes(t, mapper)),
        UnionReduction.None
      );
    }
    if (type.flags & qt.TypeFlags.Intersection) return getIntersectionType(map((<IntersectionType>type).types, (t) => instantiateInstantiableTypes(t, mapper)));
    return type;
  }
  function isAritySmaller(signature: Signature, target: SignatureDeclaration) {
    let targetParameterCount = 0;
    for (; targetParameterCount < target.parameters.length; targetParameterCount++) {
      const param = target.parameters[targetParameterCount];
      if (param.initer || param.questionToken || param.dot3Token || isDocOptionalParameter(param)) break;
    }
    if (target.parameters.length && parameterIsThqy.is.keyword(target.parameters[0])) targetParameterCount--;
    return !hasEffectiveRestParameter(signature) && getParameterCount(signature) < targetParameterCount;
  }
  function isFunctionExpressionOrArrowFunction(node: Node): node is FunctionExpression | ArrowFunction {
    return node.kind === Syntax.FunctionExpression || node.kind === Syntax.ArrowFunction;
  }
  function hasDefaultValue(node: BindingElement | Expression): boolean {
    return (
      (node.kind === Syntax.BindingElement && !!(<BindingElement>node).initer) || (node.kind === Syntax.BinaryExpression && (<BinaryExpression>node).operatorToken.kind === Syntax.EqualsToken)
    );
  }
  function createArrayLiteralType(type: ObjectType) {
    if (!(getObjectFlags(type) & ObjectFlags.Reference)) return type;
    let literalType = (<TypeReference>type).literalType;
    if (!literalType) {
      literalType = (<TypeReference>type).literalType = cloneTypeReference(<TypeReference>type);
      literalType.objectFlags |= ObjectFlags.ArrayLiteral | ObjectFlags.ContainsObjectOrArrayLiteral;
    }
    return literalType;
  }
  function isNumericName(name: DeclarationName): boolean {
    switch (name.kind) {
      case Syntax.ComputedPropertyName:
        return isNumericComputedName(name);
      case Syntax.Identifier:
        return NumericLiteral.name(name.escapedText);
      case Syntax.NumericLiteral:
      case Syntax.StringLiteral:
        return NumericLiteral.name(name.text);
      default:
        return false;
    }
  }
  function isNumericComputedName(name: ComputedPropertyName): boolean {
    return isTypeAssignableToKind(check.computedPropertyName(name), qt.TypeFlags.NumberLike);
  }
  function isInfinityOrNaNString(name: string | qb.__String): boolean {
    return name === 'Infinity' || name === '-Infinity' || name === 'NaN';
  }
  function isValidSpreadType(type: Type): boolean {
    if (type.flags & qt.TypeFlags.Instantiable) {
      const constraint = getBaseConstraintOfType(type);
      if (constraint !== undefined) return isValidSpreadType(constraint);
    }
    return !!(
      type.flags & (TypeFlags.Any | qt.TypeFlags.NonPrimitive | qt.TypeFlags.Object | qt.TypeFlags.InstantiableNonPrimitive) ||
      (getFalsyFlags(type) & qt.TypeFlags.DefinitelyFalsy && isValidSpreadType(removeDefinitelyFalsyTypes(type))) ||
      (type.flags & qt.TypeFlags.UnionOrIntersection && every((<UnionOrIntersectionType>type).types, isValidSpreadType))
    );
  }
  function isUnhyphenatedJsxName(name: string | qb.__String) {
    return !stringContains(name as string, '-');
  }
  function isJsxIntrinsicIdentifier(tagName: JsxTagNameExpression): boolean {
    return tagName.kind === Syntax.Identifier && qy.is.intrinsicJsxName(tagName.escapedText);
  }
  function createJsxAttributesTypeFromAttributesProperty(openingLikeElement: JsxOpeningLikeElement, checkMode: CheckMode | undefined) {
    const attributes = openingLikeElement.attributes;
    const allAttributesTable = strictNullChecks ? new SymbolTable() : undefined;
    let attributesTable = new SymbolTable();
    let spread: Type = emptyJsxObjectType;
    let hasSpreadAnyType = false;
    let typeToIntersect: Type | undefined;
    let explicitlySpecifyChildrenAttribute = false;
    let objectFlags: ObjectFlags = ObjectFlags.JsxAttributes;
    const jsxChildrenPropertyName = getJsxElementChildrenPropertyName(getJsxNamespaceAt(openingLikeElement));
    for (const attributeDecl of attributes.properties) {
      const member = attributeDecl.symbol;
      if (is.kind(qc.JsxAttribute, attributeDecl)) {
        const exprType = check.jsxAttribute(attributeDecl, checkMode);
        objectFlags |= getObjectFlags(exprType) & ObjectFlags.PropagatingFlags;
        const attributeSymbol = new Symbol(SymbolFlags.Property | qt.SymbolFlags.Transient | member.flags, member.escName);
        attributeSymbol.declarations = member.declarations;
        attributeSymbol.parent = member.parent;
        if (member.valueDeclaration) attributeSymbol.valueDeclaration = member.valueDeclaration;
        attributeSymbol.type = exprType;
        attributeSymbol.target = member;
        attributesTable.set(attributeSymbol.escName, attributeSymbol);
        allAttributesTable?.set(attributeSymbol.escName, attributeSymbol);
        if (attributeDecl.name.escapedText === jsxChildrenPropertyName) explicitlySpecifyChildrenAttribute = true;
      } else {
        assert(attributeDecl.kind === Syntax.JsxSpreadAttribute);
        if (attributesTable.size > 0) {
          spread = getSpreadType(spread, createJsxAttributesType(), attributes.symbol, objectFlags, false);
          attributesTable = new SymbolTable();
        }
        const exprType = getReducedType(check.expressionCached(attributeDecl.expression, checkMode));
        if (isTypeAny(exprType)) hasSpreadAnyType = true;
        if (isValidSpreadType(exprType)) {
          spread = getSpreadType(spread, exprType, attributes.symbol, objectFlags, false);
          if (allAttributesTable) check.spreadPropOverrides(exprType, allAttributesTable, attributeDecl);
        } else {
          typeToIntersect = typeToIntersect ? getIntersectionType([typeToIntersect, exprType]) : exprType;
        }
      }
    }
    if (!hasSpreadAnyType) {
      if (attributesTable.size > 0) spread = getSpreadType(spread, createJsxAttributesType(), attributes.symbol, objectFlags, false);
    }
    const parent = openingLikeElement.parent.kind === Syntax.JsxElement ? (openingLikeElement.parent as JsxElement) : undefined;
    if (parent && parent.openingElement === openingLikeElement && parent.children.length > 0) {
      const childrenTypes: Type[] = check.jsxChildren(parent, checkMode);
      if (!hasSpreadAnyType && jsxChildrenPropertyName && jsxChildrenPropertyName !== '') {
        if (explicitlySpecifyChildrenAttribute) error(attributes, qd.msgs._0_are_specified_twice_The_attribute_named_0_will_be_overwritten, qy.get.unescUnderscores(jsxChildrenPropertyName));
        const contextualType = getApparentTypeOfContextualType(openingLikeElement.attributes);
        const childrenContextualType = contextualType && getTypeOfPropertyOfContextualType(contextualType, jsxChildrenPropertyName);
        const childrenPropSymbol = new Symbol(SymbolFlags.Property | qt.SymbolFlags.Transient, jsxChildrenPropertyName);
        childrenPropSymbol.type =
          childrenTypes.length === 1 ? childrenTypes[0] : getArrayLiteralTupleTypeIfApplicable(childrenTypes, childrenContextualType, false) || createArrayType(getUnionType(childrenTypes));
        childrenPropSymbol.valueDeclaration = PropertySignature.create(undefined, qy.get.unescUnderscores(jsxChildrenPropertyName), undefined, undefined, undefined);
        childrenPropSymbol.valueDeclaration.parent = attributes;
        childrenPropSymbol.valueDeclaration.symbol = childrenPropSymbol;
        const childPropMap = new SymbolTable();
        childPropMap.set(jsxChildrenPropertyName, childrenPropSymbol);
        spread = getSpreadType(spread, createAnonymousType(attributes.symbol, childPropMap, empty, empty, undefined), attributes.symbol, objectFlags, false);
      }
    }
    if (hasSpreadAnyType) return anyType;
    if (typeToIntersect && spread !== emptyJsxObjectType) return getIntersectionType([typeToIntersect, spread]);
    return typeToIntersect || (spread === emptyJsxObjectType ? createJsxAttributesType() : spread);
    function createJsxAttributesType() {
      objectFlags |= freshObjectLiteralFlag;
      const result = createAnonymousType(attributes.symbol, attributesTable, empty, empty, undefined);
      result.objectFlags |= objectFlags | ObjectFlags.ObjectLiteral | ObjectFlags.ContainsObjectOrArrayLiteral;
      return result;
    }
  }
  function isKnownProperty(targetType: Type, name: qb.__String, isComparingJsxAttributes: boolean): boolean {
    if (targetType.flags & qt.TypeFlags.Object) {
      const resolved = resolveStructuredTypeMembers(targetType as ObjectType);
      if (
        resolved.stringIndexInfo ||
        (resolved.numberIndexInfo && NumericLiteral.name(name)) ||
        getPropertyOfObjectType(targetType, name) ||
        (isComparingJsxAttributes && !isUnhyphenatedJsxName(name))
      ) {
        return true;
      }
    } else if (targetType.flags & qt.TypeFlags.UnionOrIntersection && isExcessPropertyCheckTarget(targetType)) {
      for (const t of (targetType as UnionOrIntersectionType).types) {
        if (isKnownProperty(t, name, isComparingJsxAttributes)) return true;
      }
    }
    return false;
  }
  function isExcessPropertyCheckTarget(type: Type): boolean {
    return !!(
      (type.flags & qt.TypeFlags.Object && !(getObjectFlags(type) & ObjectFlags.ObjectLiteralPatternWithComputedProperties)) ||
      type.flags & qt.TypeFlags.NonPrimitive ||
      (type.flags & qt.TypeFlags.Union && some((<UnionType>type).types, isExcessPropertyCheckTarget)) ||
      (type.flags & qt.TypeFlags.Intersection && every((<IntersectionType>type).types, isExcessPropertyCheckTarget))
    );
  }
  function isNullableType(type: Type) {
    return !!((strictNullChecks ? getFalsyFlags(type) : type.flags) & qt.TypeFlags.Nullable);
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
  function isMethodAccessForCall(node: Node) {
    while (node.parent.kind === Syntax.ParenthesizedExpression) {
      node = node.parent;
    }
    return is.callOrNewExpression(node.parent) && node.parent.expression === node;
  }
  function lookupSymbolForPrivateIdentifierDeclaration(propName: qb.__String, location: Node): Symbol | undefined {
    for (let containingClass = get.containingClass(location); !!containingClass; containingClass = get.containingClass(containingClass)) {
      const { symbol } = containingClass;
      const name = getSymbolNameForPrivateIdentifier(symbol, propName);
      const prop = (symbol.members && symbol.members.get(name)) || (symbol.exports && symbol.exports.get(name));
      if (prop) return prop;
    }
  }
  function isThisPropertyAccessInConstructor(node: ElementAccessExpression | PropertyAccessExpression | QualifiedName, prop: Symbol) {
    return is.thisProperty(node) && (isAutoTypedProperty(prop) || isConstructorDeclaredProperty(prop)) && get.thisContainer(node, true) === getDeclaringConstructor(prop);
  }
  function isInPropertyIniter(node: Node): boolean {
    return !!qc.findAncestor(node, (node) => {
      switch (node.kind) {
        case Syntax.PropertyDeclaration:
          return true;
        case Syntax.PropertyAssignment:
        case Syntax.MethodDeclaration:
        case Syntax.GetAccessor:
        case Syntax.SetAccessor:
        case Syntax.SpreadAssignment:
        case Syntax.ComputedPropertyName:
        case Syntax.TemplateSpan:
        case Syntax.JsxExpression:
        case Syntax.JsxAttribute:
        case Syntax.JsxAttributes:
        case Syntax.JsxSpreadAttribute:
        case Syntax.JsxOpeningElement:
        case Syntax.ExpressionWithTypeArguments:
        case Syntax.HeritageClause:
          return false;
        default:
          return is.expressionNode(node) ? false : 'quit';
      }
    });
  }
  function isPropertyDeclaredInAncestorClass(prop: Symbol): boolean {
    if (!(prop.parent!.flags & qt.SymbolFlags.Class)) return false;
    let classType: InterfaceType | undefined = getTypeOfSymbol(prop.parent!) as InterfaceType;
    while (true) {
      classType = classType.symbol && (getSuperClass(classType) as InterfaceType | undefined);
      if (!classType) return false;
      const superProperty = getPropertyOfType(classType, prop.escName);
      if (superProperty && superProperty.valueDeclaration) return true;
    }
  }
  function reportNonexistentProperty(propNode: qc.Identifier | qc.PrivateIdentifier, containingType: Type) {
    let errorInfo: qd.MessageChain | undefined;
    let relatedInfo: qd.Diagnostic | undefined;
    if (!is.kind(qc.PrivateIdentifier, propNode) && containingType.flags & qt.TypeFlags.Union && !(containingType.flags & qt.TypeFlags.Primitive)) {
      for (const subtype of (containingType as UnionType).types) {
        if (!getPropertyOfType(subtype, propNode.escapedText) && !getIndexInfoOfType(subtype, IndexKind.String)) {
          errorInfo = chainqd.Messages(errorInfo, qd.msgs.Property_0_does_not_exist_on_type_1, declarationNameToString(propNode), typeToString(subtype));
          break;
        }
      }
    }
    if (typeHasStaticProperty(propNode.escapedText, containingType))
      errorInfo = chainqd.Messages(errorInfo, qd.msgs.Property_0_is_a_static_member_of_type_1, declarationNameToString(propNode), typeToString(containingType));
    else {
      const promisedType = getPromisedTypeOfPromise(containingType);
      if (promisedType && getPropertyOfType(promisedType, propNode.escapedText)) {
        errorInfo = chainqd.Messages(errorInfo, qd.msgs.Property_0_does_not_exist_on_type_1, declarationNameToString(propNode), typeToString(containingType));
        relatedInfo = createDiagnosticForNode(propNode, qd.msgs.Did_you_forget_to_use_await);
      } else {
        const suggestion = getSuggestedSymbolForNonexistentProperty(propNode, containingType);
        if (suggestion !== undefined) {
          const suggestedName = suggestion.name;
          errorInfo = chainqd.Messages(errorInfo, qd.msgs.Property_0_does_not_exist_on_type_1_Did_you_mean_2, declarationNameToString(propNode), typeToString(containingType), suggestedName);
          relatedInfo = suggestion.valueDeclaration && createDiagnosticForNode(suggestion.valueDeclaration, qd.msgs._0_is_declared_here, suggestedName);
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
    const resultDiagnostic = createDiagnosticForNodeFromMessageChain(propNode, errorInfo);
    if (relatedInfo) addRelatedInfo(resultDiagnostic, relatedInfo);
    diagnostics.add(resultDiagnostic);
  }
  function typeHasStaticProperty(propName: qb.__String, containingType: Type): boolean {
    const prop = containingType.symbol && getPropertyOfType(getTypeOfSymbol(containingType.symbol), propName);
    return prop !== undefined && prop.valueDeclaration && has.syntacticModifier(prop.valueDeclaration, ModifierFlags.Static);
  }
  function markPropertyAsReferenced(prop: Symbol, nodeForCheckWriteOnly: Node | undefined, isThisAccess: boolean) {
    const valueDeclaration = prop && prop.flags & qt.SymbolFlags.ClassMember && prop.valueDeclaration;
    if (!valueDeclaration) return;
    const hasPrivateModifier = has.effectiveModifier(valueDeclaration, ModifierFlags.Private);
    const hasPrivateIdentifier = is.namedDeclaration(prop.valueDeclaration) && is.kind(qc.PrivateIdentifier, prop.valueDeclaration.name);
    if (!hasPrivateModifier && !hasPrivateIdentifier) return;
    if (nodeForCheckWriteOnly && is.writeOnlyAccess(nodeForCheckWriteOnly) && !(prop.flags & qt.SymbolFlags.SetAccessor)) return;
    if (isThisAccess) {
      const containingMethod = qc.findAncestor(nodeForCheckWriteOnly, isFunctionLikeDeclaration);
      if (containingMethod && containingMethod.symbol === prop) return;
    }
    (getCheckFlags(prop) & qt.CheckFlags.Instantiated ? s.getLinks(prop).target : prop)!.isReferenced = qt.SymbolFlags.All;
  }
  function isValidPropertyAccess(node: PropertyAccessExpression | QualifiedName | ImportTypeNode, propertyName: qb.__String): boolean {
    switch (node.kind) {
      case Syntax.PropertyAccessExpression:
        return isValidPropertyAccessWithType(node, node.expression.kind === Syntax.SuperKeyword, propertyName, getWidenedType(check.expression(node.expression)));
      case Syntax.QualifiedName:
        return isValidPropertyAccessWithType(node, false, propertyName, getWidenedType(check.expression(node.left)));
      case Syntax.ImportType:
        return isValidPropertyAccessWithType(node, false, propertyName, getTypeFromTypeNode(node));
    }
  }
  function isValidPropertyAccessForCompletions(node: PropertyAccessExpression | ImportTypeNode | QualifiedName, type: Type, property: Symbol): boolean {
    return isValidPropertyAccessWithType(node, node.kind === Syntax.PropertyAccessExpression && node.expression.kind === Syntax.SuperKeyword, property.escName, type);
  }
  function isValidPropertyAccessWithType(node: PropertyAccessExpression | QualifiedName | ImportTypeNode, isSuper: boolean, propertyName: qb.__String, type: Type): boolean {
    if (type === errorType || isTypeAny(type)) return true;
    const prop = getPropertyOfType(type, propertyName);
    if (prop) {
      if (is.kind(qc.PropertyAccessExpression, node) && prop.valueDeclaration?.is.privateIdentifierPropertyDeclaration()) {
        const declClass = get.containingClass(prop.valueDeclaration);
        return !is.optionalChain(node) && !!qc.findAncestor(node, (parent) => parent === declClass);
      }
      return check.propertyAccessibility(node, isSuper, type, prop);
    }
    return is.inJSFile(node) && (type.flags & qt.TypeFlags.Union) !== 0 && (<UnionType>type).types.some((elementType) => isValidPropertyAccessWithType(node, isSuper, propertyName, elementType));
  }
  function hasNumericPropertyNames(type: Type) {
    return getIndexTypeOfType(type, IndexKind.Number) && !getIndexTypeOfType(type, IndexKind.String);
  }
  function isForInVariableForNumericPropertyNames(expr: Expression) {
    const e = skipParentheses(expr);
    if (e.kind === Syntax.Identifier) {
      const symbol = getResolvedSymbol(<Identifier>e);
      if (symbol.flags & qt.SymbolFlags.Variable) {
        let child: Node = expr;
        let node = expr.parent;
        while (node) {
          if (
            node.kind === Syntax.ForInStatement &&
            child === (<ForInStatement>node).statement &&
            getForInVariableSymbol(<ForInStatement>node) === symbol &&
            hasNumericPropertyNames(getTypeOfExpression((<ForInStatement>node).expression))
          ) {
            return true;
          }
          child = node;
          node = node.parent;
        }
      }
    }
    return false;
  }
  function callLikeExpressionMayHaveTypeArguments(node: CallLikeExpression): node is CallExpression | NewExpression | TaggedTemplateExpression | JsxOpeningElement {
    return is.callOrNewExpression(node) || is.kind(qc.TaggedTemplateExpression, node) || qc.isJsx.openingLikeElement(node);
  }
  function resolveUntypedCall(node: CallLikeExpression): Signature {
    if (callLikeExpressionMayHaveTypeArguments(node)) forEach(node.typeArguments, checkSourceElement);
    if (node.kind === Syntax.TaggedTemplateExpression) check.expression(node.template);
    else if (qc.isJsx.openingLikeElement(node)) {
      check.expression(node.attributes);
    } else if (node.kind !== Syntax.Decorator) {
      forEach((<CallExpression>node).arguments, (argument) => {
        check.expression(argument);
      });
    }
    return anySignature;
  }
  function resolveErrorCall(node: CallLikeExpression): Signature {
    resolveUntypedCall(node);
    return unknownSignature;
  }
  function reorderCandidates(signatures: readonly Signature[], result: Signature[], callChainFlags: SignatureFlags): void {
    let lastParent: Node | undefined;
    let lastSymbol: Symbol | undefined;
    let cutoffIndex = 0;
    let index: number | undefined;
    let specializedIndex = -1;
    let spliceIndex: number;
    assert(!result.length);
    for (const signature of signatures) {
      const symbol = signature.declaration && getSymbolOfNode(signature.declaration);
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
      if (signatureHasLiteralTypes(signature)) {
        specializedIndex++;
        spliceIndex = specializedIndex;
        cutoffIndex++;
      } else {
        spliceIndex = index;
      }
      result.splice(spliceIndex, 0, callChainFlags ? getOptionalCallSignature(signature, callChainFlags) : signature);
    }
  }
  function isSpreadArgument(arg: Expression | undefined): arg is Expression {
    return !!arg && (arg.kind === Syntax.SpreadElement || (arg.kind === Syntax.SyntheticExpression && (<SyntheticExpression>arg).isSpread));
  }
  function acceptsVoid(t: Type): boolean {
    return !!(t.flags & qt.TypeFlags.Void);
  }
  function hasCorrectArity(node: CallLikeExpression, args: readonly Expression[], signature: Signature, signatureHelpTrailingComma = false) {
    let argCount: number;
    let callIsIncomplete = false;
    let effectiveParameterCount = getParameterCount(signature);
    let effectiveMinimumArguments = getMinArgumentCount(signature);
    if (node.kind === Syntax.TaggedTemplateExpression) {
      argCount = args.length;
      if (node.template.kind === Syntax.TemplateExpression) {
        const lastSpan = last(node.template.templateSpans);
        callIsIncomplete = is.missing(lastSpan.literal) || !!lastSpan.literal.isUnterminated;
      } else {
        const templateLiteral = <LiteralExpression>node.template;
        assert(templateLiteral.kind === Syntax.NoSubstitutionLiteral);
        callIsIncomplete = !!templateLiteral.isUnterminated;
      }
    } else if (node.kind === Syntax.Decorator) {
      argCount = getDecoratorArgumentCount(node, signature);
    } else if (qc.isJsx.openingLikeElement(node)) {
      callIsIncomplete = node.attributes.end === node.end;
      if (callIsIncomplete) return true;
      argCount = effectiveMinimumArguments === 0 ? args.length : 1;
      effectiveParameterCount = args.length === 0 ? effectiveParameterCount : 1;
      effectiveMinimumArguments = Math.min(effectiveMinimumArguments, 1);
    } else {
      if (!node.arguments) {
        assert(node.kind === Syntax.NewExpression);
        return getMinArgumentCount(signature) === 0;
      }
      argCount = signatureHelpTrailingComma ? args.length + 1 : args.length;
      callIsIncomplete = node.arguments.end === node.end;
      const spreadArgIndex = getSpreadArgumentIndex(args);
      if (spreadArgIndex >= 0) return spreadArgIndex >= getMinArgumentCount(signature) && (hasEffectiveRestParameter(signature) || spreadArgIndex < getParameterCount(signature));
    }
    if (!hasEffectiveRestParameter(signature) && argCount > effectiveParameterCount) return false;
    if (callIsIncomplete || argCount >= effectiveMinimumArguments) return true;
    for (let i = argCount; i < effectiveMinimumArguments; i++) {
      const type = getTypeAtPosition(signature, i);
      if (filterType(type, acceptsVoid).flags & qt.TypeFlags.Never) return false;
    }
    return true;
  }
  function hasCorrectTypeArgumentArity(signature: Signature, typeArguments: Nodes<TypeNode> | undefined) {
    const numTypeParameters = length(signature.typeParameters);
    const minTypeArgumentCount = getMinTypeArgumentCount(signature.typeParameters);
    return !some(typeArguments) || (typeArguments.length >= minTypeArgumentCount && typeArguments.length <= numTypeParameters);
  }
  function instantiateSignatureInContextOf(signature: Signature, contextualSignature: Signature, inferenceContext?: InferenceContext, compareTypes?: TypeComparer): Signature {
    const context = createInferenceContext(signature.typeParameters!, signature, InferenceFlags.None, compareTypes);
    const restType = getEffectiveRestType(contextualSignature);
    const mapper = inferenceContext && (restType && restType.flags & qt.TypeFlags.TypeParameter ? inferenceContext.nonFixingMapper : inferenceContext.mapper);
    const sourceSignature = mapper ? instantiateSignature(contextualSignature, mapper) : contextualSignature;
    applyToParameterTypes(sourceSignature, signature, (source, target) => {
      inferTypes(context.inferences, source, target);
    });
    if (!inferenceContext) {
      applyToReturnTypes(contextualSignature, signature, (source, target) => {
        inferTypes(context.inferences, source, target, InferencePriority.ReturnType);
      });
    }
    return getSignatureInstantiation(signature, getInferredTypes(context), is.inJSFile(contextualSignature.declaration));
  }
  function inferJsxTypeArguments(node: JsxOpeningLikeElement, signature: Signature, checkMode: CheckMode, context: InferenceContext): Type[] {
    const paramType = getEffectiveFirstArgumentForJsxSignature(signature, node);
    const checkAttrType = check.expressionWithContextualType(node.attributes, paramType, context, checkMode);
    inferTypes(context.inferences, checkAttrType, paramType);
    return getInferredTypes(context);
  }
  function inferTypeArguments(node: CallLikeExpression, signature: Signature, args: readonly Expression[], checkMode: CheckMode, context: InferenceContext): Type[] {
    if (qc.isJsx.openingLikeElement(node)) return inferJsxTypeArguments(node, signature, checkMode, context);
    if (node.kind !== Syntax.Decorator) {
      const contextualType = getContextualType(node);
      if (contextualType) {
        const outerContext = getInferenceContext(node);
        const outerMapper = getMapperFromContext(cloneInferenceContext(outerContext, InferenceFlags.NoDefault));
        const instantiatedType = instantiateType(contextualType, outerMapper);
        const contextualSignature = getSingleCallSignature(instantiatedType);
        const inferenceSourceType =
          contextualSignature && contextualSignature.typeParameters
            ? getOrCreateTypeFromSignature(getSignatureInstantiationWithoutFillingInTypeArguments(contextualSignature, contextualSignature.typeParameters))
            : instantiatedType;
        const inferenceTargetType = getReturnTypeOfSignature(signature);
        inferTypes(context.inferences, inferenceSourceType, inferenceTargetType, InferencePriority.ReturnType);
        const returnContext = createInferenceContext(signature.typeParameters!, signature, context.flags);
        const returnSourceType = instantiateType(contextualType, outerContext && outerContext.returnMapper);
        inferTypes(returnContext.inferences, returnSourceType, inferenceTargetType);
        context.returnMapper = some(returnContext.inferences, hasInferenceCandidates) ? getMapperFromContext(cloneInferredPartOfContext(returnContext)) : undefined;
      }
    }
    const thisType = getThisTypeOfSignature(signature);
    if (thisType) {
      const thisArgumentNode = getThisArgumentOfCall(node);
      const thisArgumentType = thisArgumentNode ? check.expression(thisArgumentNode) : voidType;
      inferTypes(context.inferences, thisArgumentType, thisType);
    }
    const restType = getNonArrayRestType(signature);
    const argCount = restType ? Math.min(getParameterCount(signature) - 1, args.length) : args.length;
    for (let i = 0; i < argCount; i++) {
      const arg = args[i];
      if (arg.kind !== Syntax.OmittedExpression) {
        const paramType = getTypeAtPosition(signature, i);
        const argType = check.expressionWithContextualType(arg, paramType, context, checkMode);
        inferTypes(context.inferences, argType, paramType);
      }
    }
    if (restType) {
      const spreadType = getSpreadArgumentType(args, argCount, args.length, restType, context);
      inferTypes(context.inferences, spreadType, restType);
    }
    return getInferredTypes(context);
  }
  function createSyntheticExpression(parent: Node, type: Type, isSpread?: boolean, tupleNameSource?: ParameterDeclaration | NamedTupleMember) {
    const result = <SyntheticExpression>createNode(Syntax.SyntheticExpression, parent.pos, parent.end);
    result.parent = parent;
    result.type = type;
    result.isSpread = isSpread || false;
    result.tupleNameSource = tupleNameSource;
    return result;
  }
  function resolveCall(
    node: CallLikeExpression,
    signatures: readonly Signature[],
    candidatesOutArray: Signature[] | undefined,
    checkMode: CheckMode,
    callChainFlags: SignatureFlags,
    fallbackError?: qd.Message
  ): Signature {
    const isTaggedTemplate = node.kind === Syntax.TaggedTemplateExpression;
    const isDecorator = node.kind === Syntax.Decorator;
    const isJsxOpeningOrSelfClosingElement = qc.isJsx.openingLikeElement(node);
    const reportErrors = !candidatesOutArray;
    let typeArguments: Nodes<TypeNode> | undefined;
    if (!isDecorator) {
      typeArguments = (<CallExpression>node).typeArguments;
      if (isTaggedTemplate || isJsxOpeningOrSelfClosingElement || (<CallExpression>node).expression.kind !== Syntax.SuperKeyword) forEach(typeArguments, checkSourceElement);
    }
    const candidates = candidatesOutArray || [];
    reorderCandidates(signatures, candidates, callChainFlags);
    if (!candidates.length) {
      if (reportErrors) diagnostics.add(getDiagnosticForCallNode(node, qd.msgs.Call_target_does_not_contain_any_signatures));
      return resolveErrorCall(node);
    }
    const args = getEffectiveCallArguments(node);
    const isSingleNonGenericCandidate = candidates.length === 1 && !candidates[0].typeParameters;
    let argCheckMode = !isDecorator && !isSingleNonGenericCandidate && some(args, isContextSensitive) ? CheckMode.SkipContextSensitive : CheckMode.Normal;
    let candidatesForArgumentError: Signature[] | undefined;
    let candidateForArgumentArityError: Signature | undefined;
    let candidateForTypeArgumentError: Signature | undefined;
    let result: Signature | undefined;
    const signatureHelpTrailingComma = !!(checkMode & CheckMode.IsForSignatureHelp) && node.kind === Syntax.CallExpression && node.arguments.trailingComma;
    if (candidates.length > 1) result = chooseOverload(candidates, subtypeRelation, signatureHelpTrailingComma);
    if (!result) result = chooseOverload(candidates, assignableRelation, signatureHelpTrailingComma);
    if (result) return result;
    if (reportErrors) {
      if (candidatesForArgumentError) {
        if (candidatesForArgumentError.length === 1 || candidatesForArgumentError.length > 3) {
          const last = candidatesForArgumentError[candidatesForArgumentError.length - 1];
          let chain: qd.MessageChain | undefined;
          if (candidatesForArgumentError.length > 3) {
            chain = chainqd.Messages(chain, qd.msgs.The_last_overload_gave_the_following_error);
            chain = chainqd.Messages(chain, qd.msgs.No_overload_matches_this_call);
          }
          const diags = getSignatureApplicabilityError(node, args, last, assignableRelation, CheckMode.Normal, true, () => chain);
          if (diags) {
            for (const d of diags) {
              if (last.declaration && candidatesForArgumentError.length > 3) addRelatedInfo(d, createDiagnosticForNode(last.declaration, qd.msgs.The_last_overload_is_declared_here));
              diagnostics.add(d);
            }
          } else {
            qb.fail('No error for last overload signature');
          }
        } else {
          const allDiagnostics: (readonly qd.DiagnosticRelatedInformation[])[] = [];
          let max = 0;
          let min = Number.MAX_VALUE;
          let minIndex = 0;
          let i = 0;
          for (const c of candidatesForArgumentError) {
            const chain = () => chainqd.Messages(undefined, qd.msgs.Overload_0_of_1_2_gave_the_following_error, i + 1, candidates.length, signatureToString(c));
            const diags = getSignatureApplicabilityError(node, args, c, assignableRelation, CheckMode.Normal, true, chain);
            if (diags) {
              if (diags.length <= min) {
                min = diags.length;
                minIndex = i;
              }
              max = Math.max(max, diags.length);
              allqd.msgs.push(diags);
            } else {
              qb.fail('No error for 3 or fewer overload signatures');
            }
            i++;
          }
          const diags = max > 1 ? allDiagnostics[minIndex] : flatten(allDiagnostics);
          assert(diags.length > 0, 'No errors reported for 3 or fewer overload signatures');
          const chain = chainqd.Messages(
            map(diags, (d) => (typeof d.messageText === 'string' ? (d as qd.MessageChain) : d.messageText)),
            qd.msgs.No_overload_matches_this_call
          );
          const related = flatMap(diags, (d) => (d as qd.Diagnostic).relatedInformation) as qd.DiagnosticRelatedInformation[];
          if (every(diags, (d) => d.start === diags[0].start && d.length === diags[0].length && d.file === diags[0].file)) {
            const { file, start, length } = diags[0];
            diagnostics.add({ file, start, length, code: chain.code, category: chain.category, messageText: chain, relatedInformation: related });
          } else {
            diagnostics.add(createDiagnosticForNodeFromMessageChain(node, chain, related));
          }
        }
      } else if (candidateForArgumentArityError) {
        diagnostics.add(getArgumentArityError(node, [candidateForArgumentArityError], args));
      } else if (candidateForTypeArgumentError) {
        check.typeArguments(candidateForTypeArgumentError, (node as CallExpression | TaggedTemplateExpression | JsxOpeningLikeElement).typeArguments!, true, fallbackError);
      } else {
        const signaturesWithCorrectTypeArgumentArity = filter(signatures, (s) => hasCorrectTypeArgumentArity(s, typeArguments));
        if (signaturesWithCorrectTypeArgumentArity.length === 0) diagnostics.add(getTypeArgumentArityError(node, signatures, typeArguments!));
        else if (!isDecorator) {
          diagnostics.add(getArgumentArityError(node, signaturesWithCorrectTypeArgumentArity, args));
        } else if (fallbackError) {
          diagnostics.add(getDiagnosticForCallNode(node, fallbackError));
        }
      }
    }
    return getCandidateForOverloadFailure(node, candidates, args, !!candidatesOutArray);
    function chooseOverload(candidates: Signature[], relation: qb.QMap<RelationComparisonResult>, signatureHelpTrailingComma = false) {
      candidatesForArgumentError = undefined;
      candidateForArgumentArityError = undefined;
      candidateForTypeArgumentError = undefined;
      if (isSingleNonGenericCandidate) {
        const candidate = candidates[0];
        if (some(typeArguments) || !hasCorrectArity(node, args, candidate, signatureHelpTrailingComma)) return;
        if (getSignatureApplicabilityError(node, args, candidate, relation, CheckMode.Normal, false, undefined)) {
          candidatesForArgumentError = [candidate];
          return;
        }
        return candidate;
      }
      for (let candidateIndex = 0; candidateIndex < candidates.length; candidateIndex++) {
        const candidate = candidates[candidateIndex];
        if (!hasCorrectTypeArgumentArity(candidate, typeArguments) || !hasCorrectArity(node, args, candidate, signatureHelpTrailingComma)) continue;
        let checkCandidate: Signature;
        let inferenceContext: InferenceContext | undefined;
        if (candidate.typeParameters) {
          let typeArgumentTypes: Type[] | undefined;
          if (some(typeArguments)) {
            typeArgumentTypes = check.typeArguments(candidate, typeArguments, false);
            if (!typeArgumentTypes) {
              candidateForTypeArgumentError = candidate;
              continue;
            }
          } else {
            inferenceContext = createInferenceContext(candidate.typeParameters, candidate, is.inJSFile(node) ? InferenceFlags.AnyDefault : InferenceFlags.None);
            typeArgumentTypes = inferTypeArguments(node, candidate, args, argCheckMode | CheckMode.SkipGenericFunctions, inferenceContext);
            argCheckMode |= inferenceContext.flags & InferenceFlags.SkippedGenericFunction ? CheckMode.SkipGenericFunctions : CheckMode.Normal;
          }
          checkCandidate = getSignatureInstantiation(candidate, typeArgumentTypes, is.inJSFile(candidate.declaration), inferenceContext && inferenceContext.inferredTypeParameters);
          if (getNonArrayRestType(candidate) && !hasCorrectArity(node, args, checkCandidate, signatureHelpTrailingComma)) {
            candidateForArgumentArityError = checkCandidate;
            continue;
          }
        } else {
          checkCandidate = candidate;
        }
        if (getSignatureApplicabilityError(node, args, checkCandidate, relation, argCheckMode, false, undefined)) {
          (candidatesForArgumentError || (candidatesForArgumentError = [])).push(checkCandidate);
          continue;
        }
        if (argCheckMode) {
          argCheckMode = CheckMode.Normal;
          if (inferenceContext) {
            const typeArgumentTypes = inferTypeArguments(node, candidate, args, argCheckMode, inferenceContext);
            checkCandidate = getSignatureInstantiation(candidate, typeArgumentTypes, is.inJSFile(candidate.declaration), inferenceContext && inferenceContext.inferredTypeParameters);
            if (getNonArrayRestType(candidate) && !hasCorrectArity(node, args, checkCandidate, signatureHelpTrailingComma)) {
              candidateForArgumentArityError = checkCandidate;
              continue;
            }
          }
          if (getSignatureApplicabilityError(node, args, checkCandidate, relation, argCheckMode, false, undefined)) {
            (candidatesForArgumentError || (candidatesForArgumentError = [])).push(checkCandidate);
            continue;
          }
        }
        candidates[candidateIndex] = checkCandidate;
        return checkCandidate;
      }
      return;
    }
  }
  function createUnionOfSignaturesForOverloadFailure(candidates: readonly Signature[]): Signature {
    const thisParameters = mapDefined(candidates, (c) => c.thisParameter);
    let thisParameter: Symbol | undefined;
    if (thisParameters.length) thisParameter = createCombinedSymbolFromTypes(thisParameters, thisParameters.map(getTypeOfParameter));
    const { min: minArgumentCount, max: maxNonRestParam } = minAndMax(candidates, getNumNonRestParameters);
    const parameters: Symbol[] = [];
    for (let i = 0; i < maxNonRestParam; i++) {
      const symbols = mapDefined(candidates, (s) =>
        signatureHasRestParameter(s) ? (i < s.parameters.length - 1 ? s.parameters[i] : last(s.parameters)) : i < s.parameters.length ? s.parameters[i] : undefined
      );
      assert(symbols.length !== 0);
      parameters.push(
        createCombinedSymbolFromTypes(
          symbols,
          mapDefined(candidates, (candidate) => tryGetTypeAtPosition(candidate, i))
        )
      );
    }
    const restParameterSymbols = mapDefined(candidates, (c) => (signatureHasRestParameter(c) ? last(c.parameters) : undefined));
    let flags = SignatureFlags.None;
    if (restParameterSymbols.length !== 0) {
      const type = createArrayType(getUnionType(mapDefined(candidates, tryGetRestTypeOfSignature), UnionReduction.Subtype));
      parameters.push(createCombinedSymbolForOverloadFailure(restParameterSymbols, type));
      flags |= SignatureFlags.HasRestParameter;
    }
    if (candidates.some(signatureHasLiteralTypes)) flags |= SignatureFlags.HasLiteralTypes;
    return createSignature(candidates[0].declaration, undefined, thisParameter, parameters, getIntersectionType(candidates.map(getReturnTypeOfSignature)), undefined, minArgumentCount, flags);
  }
  function createCombinedSymbolFromTypes(sources: readonly Symbol[], types: Type[]): Symbol {
    return createCombinedSymbolForOverloadFailure(sources, getUnionType(types, UnionReduction.Subtype));
  }
  function createCombinedSymbolForOverloadFailure(sources: readonly Symbol[], type: Type): Symbol {
    return createSymbolWithType(first(sources), type);
  }
  function pickLongestCandidateSignature(node: CallLikeExpression, candidates: Signature[], args: readonly Expression[]): Signature {
    const bestIndex = getLongestCandidateIndex(candidates, apparentArgumentCount === undefined ? args.length : apparentArgumentCount);
    const candidate = candidates[bestIndex];
    const { typeParameters } = candidate;
    if (!typeParameters) return candidate;
    const typeArgumentNodes: readonly TypeNode[] | undefined = callLikeExpressionMayHaveTypeArguments(node) ? node.typeArguments : undefined;
    const instantiated = typeArgumentNodes
      ? createSignatureInstantiation(candidate, getTypeArgumentsFromNodes(typeArgumentNodes, typeParameters, is.inJSFile(node)))
      : inferSignatureInstantiationForOverloadFailure(node, typeParameters, candidate, args);
    candidates[bestIndex] = instantiated;
    return instantiated;
  }
  function inferSignatureInstantiationForOverloadFailure(node: CallLikeExpression, typeParameters: readonly TypeParameter[], candidate: Signature, args: readonly Expression[]): Signature {
    const inferenceContext = createInferenceContext(typeParameters, candidate, is.inJSFile(node) ? InferenceFlags.AnyDefault : InferenceFlags.None);
    const typeArgumentTypes = inferTypeArguments(node, candidate, args, CheckMode.SkipContextSensitive | CheckMode.SkipGenericFunctions, inferenceContext);
    return createSignatureInstantiation(candidate, typeArgumentTypes);
  }
  function resolveCallExpression(node: CallExpression, candidatesOutArray: Signature[] | undefined, checkMode: CheckMode): Signature {
    if (node.expression.kind === Syntax.SuperKeyword) {
      const superType = check.superExpression(node.expression);
      if (isTypeAny(superType)) {
        for (const arg of node.arguments) {
          check.expression(arg);
        }
        return anySignature;
      }
      if (superType !== errorType) {
        const baseTypeNode = getEffectiveBaseTypeNode(get.containingClass(node)!);
        if (baseTypeNode) {
          const baseConstructors = getInstantiatedConstructorsForTypeArguments(superType, baseTypeNode.typeArguments, baseTypeNode);
          return resolveCall(node, baseConstructors, candidatesOutArray, checkMode, SignatureFlags.None);
        }
      }
      return resolveUntypedCall(node);
    }
    let callChainFlags: SignatureFlags;
    let funcType = check.expression(node.expression);
    if (is.callChain(node)) {
      const nonOptionalType = getOptionalExpressionType(funcType, node.expression);
      callChainFlags = nonOptionalType === funcType ? SignatureFlags.None : is.outermostOptionalChain(node) ? SignatureFlags.IsOuterCallChain : SignatureFlags.IsInnerCallChain;
      funcType = nonOptionalType;
    } else {
      callChainFlags = SignatureFlags.None;
    }
    funcType = check.nonNullTypeWithReporter(funcType, node.expression, reportCannotInvokePossiblyNullOrUndefinedError);
    if (funcType === silentNeverType) return silentNeverSignature;
    const apparentType = getApparentType(funcType);
    if (apparentType === errorType) return resolveErrorCall(node);
    const callSignatures = getSignaturesOfType(apparentType, SignatureKind.Call);
    const numConstructSignatures = getSignaturesOfType(apparentType, SignatureKind.Construct).length;
    if (isUntypedFunctionCall(funcType, apparentType, callSignatures.length, numConstructSignatures)) {
      if (funcType !== errorType && node.typeArguments) error(node, qd.msgs.Untyped_function_calls_may_not_accept_type_arguments);
      return resolveUntypedCall(node);
    }
    if (!callSignatures.length) {
      if (numConstructSignatures) error(node, qd.msgs.Value_of_type_0_is_not_callable_Did_you_mean_to_include_new, typeToString(funcType));
      else {
        let relatedInformation: qd.DiagnosticRelatedInformation | undefined;
        if (node.arguments.length === 1) {
          const text = get.sourceFileOf(node).text;
          if (qy.is.lineBreak(text.charCodeAt(qy.skipTrivia(text, node.expression.end, true) - 1)))
            relatedInformation = createDiagnosticForNode(node.expression, qd.msgs.Are_you_missing_a_semicolon);
        }
        invocationError(node.expression, apparentType, SignatureKind.Call, relatedInformation);
      }
      return resolveErrorCall(node);
    }
    if (checkMode & CheckMode.SkipGenericFunctions && !node.typeArguments && callSignatures.some(isGenericFunctionReturningFunction)) {
      skippedGenericFunction(node, checkMode);
      return resolvingSignature;
    }
    if (callSignatures.some((sig) => is.inJSFile(sig.declaration) && !!qc.getDoc.classTag(sig.declaration!))) {
      error(node, qd.msgs.Value_of_type_0_is_not_callable_Did_you_mean_to_include_new, typeToString(funcType));
      return resolveErrorCall(node);
    }
    return resolveCall(node, callSignatures, candidatesOutArray, checkMode, callChainFlags);
  }
  function isGenericFunctionReturningFunction(signature: Signature) {
    return !!(signature.typeParameters && isFunctionType(getReturnTypeOfSignature(signature)));
  }
  function isUntypedFunctionCall(funcType: Type, apparentFuncType: Type, numCallSignatures: number, numConstructSignatures: number): boolean {
    return (
      isTypeAny(funcType) ||
      (isTypeAny(apparentFuncType) && !!(funcType.flags & qt.TypeFlags.TypeParameter)) ||
      (!numCallSignatures && !numConstructSignatures && !(apparentFuncType.flags & (TypeFlags.Union | qt.TypeFlags.Never)) && isTypeAssignableTo(funcType, globalFunctionType))
    );
  }
  function resolveNewExpression(node: NewExpression, candidatesOutArray: Signature[] | undefined, checkMode: CheckMode): Signature {
    let expressionType = check.nonNullExpression(node.expression);
    if (expressionType === silentNeverType) return silentNeverSignature;
    expressionType = getApparentType(expressionType);
    if (expressionType === errorType) return resolveErrorCall(node);
    if (isTypeAny(expressionType)) {
      if (node.typeArguments) error(node, qd.msgs.Untyped_function_calls_may_not_accept_type_arguments);
      return resolveUntypedCall(node);
    }
    const constructSignatures = getSignaturesOfType(expressionType, SignatureKind.Construct);
    if (constructSignatures.length) {
      if (!isConstructorAccessible(node, constructSignatures[0])) return resolveErrorCall(node);
      const valueDecl = expressionType.symbol && getClassLikeDeclarationOfSymbol(expressionType.symbol);
      if (valueDecl && has.syntacticModifier(valueDecl, ModifierFlags.Abstract)) {
        error(node, qd.msgs.Cannot_create_an_instance_of_an_abstract_class);
        return resolveErrorCall(node);
      }
      return resolveCall(node, constructSignatures, candidatesOutArray, checkMode, SignatureFlags.None);
    }
    const callSignatures = getSignaturesOfType(expressionType, SignatureKind.Call);
    if (callSignatures.length) {
      const signature = resolveCall(node, callSignatures, candidatesOutArray, checkMode, SignatureFlags.None);
      if (!noImplicitAny) {
        if (signature.declaration && !isJSConstructor(signature.declaration) && getReturnTypeOfSignature(signature) !== voidType)
          error(node, qd.msgs.Only_a_void_function_can_be_called_with_the_new_keyword);
        if (getThisTypeOfSignature(signature) === voidType) error(node, qd.msgs.A_function_that_is_called_with_the_new_keyword_cannot_have_a_this_type_that_is_void);
      }
      return signature;
    }
    invocationError(node.expression, expressionType, SignatureKind.Construct);
    return resolveErrorCall(node);
  }
  function typeHasProtectedAccessibleBase(target: Symbol, type: InterfaceType): boolean {
    const baseTypes = getBaseTypes(type);
    if (!length(baseTypes)) return false;
    const firstBase = baseTypes[0];
    if (firstBase.flags & qt.TypeFlags.Intersection) {
      const types = (firstBase as IntersectionType).types;
      const mixinFlags = findMixins(types);
      let i = 0;
      for (const intersectionMember of (firstBase as IntersectionType).types) {
        if (!mixinFlags[i]) {
          if (getObjectFlags(intersectionMember) & (ObjectFlags.Class | ObjectFlags.Interface)) {
            if (intersectionMember.symbol === target) return true;
            if (typeHasProtectedAccessibleBase(target, intersectionMember as InterfaceType)) return true;
          }
        }
        i++;
      }
      return false;
    }
    if (firstBase.symbol === target) return true;
    return typeHasProtectedAccessibleBase(target, firstBase as InterfaceType);
  }
  function isConstructorAccessible(node: NewExpression, signature: Signature) {
    if (!signature || !signature.declaration) return true;
    const declaration = signature.declaration;
    const modifiers = get.selectedEffectiveModifierFlags(declaration, ModifierFlags.NonPublicAccessibilityModifier);
    if (!modifiers || declaration.kind !== Syntax.Constructor) return true;
    const declaringClassDeclaration = getClassLikeDeclarationOfSymbol(declaration.parent.symbol)!;
    const declaringClass = <InterfaceType>getDeclaredTypeOfSymbol(declaration.parent.symbol);
    if (!isNodeWithinClass(node, declaringClassDeclaration)) {
      const containingClass = get.containingClass(node);
      if (containingClass && modifiers & ModifierFlags.Protected) {
        const containingType = getTypeOfNode(containingClass);
        if (typeHasProtectedAccessibleBase(declaration.parent.symbol, containingType as InterfaceType)) return true;
      }
      if (modifiers & ModifierFlags.Private) error(node, qd.msgs.Constructor_of_class_0_is_private_and_only_accessible_within_the_class_declaration, typeToString(declaringClass));
      if (modifiers & ModifierFlags.Protected) error(node, qd.msgs.Constructor_of_class_0_is_protected_and_only_accessible_within_the_class_declaration, typeToString(declaringClass));
      return false;
    }
    return true;
  }
  function invocationErrorDetails(errorTarget: Node, apparentType: Type, kind: SignatureKind): { messageChain: qd.MessageChain; relatedMessage: qd.Message | undefined } {
    let errorInfo: qd.MessageChain | undefined;
    const isCall = kind === SignatureKind.Call;
    const awaitedType = getAwaitedType(apparentType);
    const maybeMissingAwait = awaitedType && getSignaturesOfType(awaitedType, kind).length > 0;
    if (apparentType.flags & qt.TypeFlags.Union) {
      const types = (apparentType as UnionType).types;
      let hasSignatures = false;
      for (const constituent of types) {
        const signatures = getSignaturesOfType(constituent, kind);
        if (signatures.length !== 0) {
          hasSignatures = true;
          if (errorInfo) break;
        } else {
          if (!errorInfo) {
            errorInfo = chainqd.Messages(errorInfo, isCall ? qd.msgs.Type_0_has_no_call_signatures : qd.msgs.Type_0_has_no_construct_signatures, typeToString(constituent));
            errorInfo = chainqd.Messages(errorInfo, isCall ? qd.msgs.Not_all_constituents_of_type_0_are_callable : qd.msgs.Not_all_constituents_of_type_0_are_constructable, typeToString(apparentType));
          }
          if (hasSignatures) break;
        }
      }
      if (!hasSignatures) errorInfo = chainqd.Messages(undefined, isCall ? qd.msgs.No_constituent_of_type_0_is_callable : qd.msgs.No_constituent_of_type_0_is_constructable, typeToString(apparentType));
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
    if (is.kind(qc.CallExpression, errorTarget.parent) && errorTarget.parent.arguments.length === 0) {
      const { resolvedSymbol } = getNodeLinks(errorTarget);
      if (resolvedSymbol && resolvedSymbol.flags & qt.SymbolFlags.GetAccessor) headMessage = qd.msgs.This_expression_is_not_callable_because_it_is_a_get_accessor_Did_you_mean_to_use_it_without;
    }
    return {
      messageChain: chainqd.Messages(errorInfo, headMessage),
      relatedMessage: maybeMissingAwait ? qd.msgs.Did_you_forget_to_use_await : undefined,
    };
  }
  function invocationError(errorTarget: Node, apparentType: Type, kind: SignatureKind, relatedInformation?: qd.DiagnosticRelatedInformation) {
    const { messageChain, relatedMessage: relatedInfo } = invocationErrorDetails(errorTarget, apparentType, kind);
    const diagnostic = createDiagnosticForNodeFromMessageChain(errorTarget, messageChain);
    if (relatedInfo) addRelatedInfo(diagnostic, createDiagnosticForNode(errorTarget, relatedInfo));
    if (is.kind(qc.CallExpression, errorTarget.parent)) {
      const { start, length } = getDiagnosticSpanForCallNode(errorTarget.parent, true);
      diagnostic.start = start;
      diagnostic.length = length;
    }
    diagnostics.add(diagnostic);
    invocationErrorRecovery(apparentType, kind, relatedInformation ? addRelatedInfo(diagnostic, relatedInformation) : diagnostic);
  }
  function invocationErrorRecovery(apparentType: Type, kind: SignatureKind, diagnostic: qd.Diagnostic) {
    if (!apparentType.symbol) return;
    const importNode = s.getLinks(apparentType.symbol).originatingImport;
    if (importNode && !is.importCall(importNode)) {
      const sigs = getSignaturesOfType(getTypeOfSymbol(s.getLinks(apparentType.symbol).target!), kind);
      if (!sigs || !sigs.length) return;
      addRelatedInfo(
        diagnostic,
        createDiagnosticForNode(
          importNode,
          qd.msgs.Type_originates_at_this_import_A_namespace_style_import_cannot_be_called_or_constructed_and_will_cause_a_failure_at_runtime_Consider_using_a_default_import_or_import_require_here_instead
        )
      );
    }
  }
  function resolveTaggedTemplateExpression(node: TaggedTemplateExpression, candidatesOutArray: Signature[] | undefined, checkMode: CheckMode): Signature {
    const tagType = check.expression(node.tag);
    const apparentType = getApparentType(tagType);
    if (apparentType === errorType) return resolveErrorCall(node);
    const callSignatures = getSignaturesOfType(apparentType, SignatureKind.Call);
    const numConstructSignatures = getSignaturesOfType(apparentType, SignatureKind.Construct).length;
    if (isUntypedFunctionCall(tagType, apparentType, callSignatures.length, numConstructSignatures)) return resolveUntypedCall(node);
    if (!callSignatures.length) {
      invocationError(node.tag, apparentType, SignatureKind.Call);
      return resolveErrorCall(node);
    }
    return resolveCall(node, callSignatures, candidatesOutArray, checkMode, SignatureFlags.None);
  }
  function resolveDecorator(node: Decorator, candidatesOutArray: Signature[] | undefined, checkMode: CheckMode): Signature {
    const funcType = check.expression(node.expression);
    const apparentType = getApparentType(funcType);
    if (apparentType === errorType) return resolveErrorCall(node);
    const callSignatures = getSignaturesOfType(apparentType, SignatureKind.Call);
    const numConstructSignatures = getSignaturesOfType(apparentType, SignatureKind.Construct).length;
    if (isUntypedFunctionCall(funcType, apparentType, callSignatures.length, numConstructSignatures)) return resolveUntypedCall(node);
    if (isPotentiallyUncalledDecorator(node, callSignatures)) {
      const nodeStr = get.textOf(node.expression, false);
      error(node, qd.msgs._0_accepts_too_few_arguments_to_be_used_as_a_decorator_here_Did_you_mean_to_call_it_first_and_write_0, nodeStr);
      return resolveErrorCall(node);
    }
    const headMessage = getDiagnosticHeadMessageForDecoratorResolution(node);
    if (!callSignatures.length) {
      const errorDetails = invocationErrorDetails(node.expression, apparentType, SignatureKind.Call);
      const messageChain = chainqd.Messages(errorDetails.messageChain, headMessage);
      const diag = createDiagnosticForNodeFromMessageChain(node.expression, messageChain);
      if (errorDetails.relatedMessage) addRelatedInfo(diag, createDiagnosticForNode(node.expression, errorDetails.relatedMessage));
      diagnostics.add(diag);
      invocationErrorRecovery(apparentType, SignatureKind.Call, diag);
      return resolveErrorCall(node);
    }
    return resolveCall(node, callSignatures, candidatesOutArray, checkMode, SignatureFlags.None, headMessage);
  }
  function createSignatureForJSXIntrinsic(node: JsxOpeningLikeElement, result: Type): Signature {
    const namespace = getJsxNamespaceAt(node);
    const exports = namespace && namespace.getExportsOfSymbol();
    const typeSymbol = exports && getSymbol(exports, JsxNames.Element, qt.SymbolFlags.Type);
    const returnNode = typeSymbol && nodeBuilder.symbolToEntityName(typeSymbol, qt.SymbolFlags.Type, node);
    const declaration = FunctionTypeNode.create(
      undefined,
      [new qc.ParameterDeclaration(undefined, undefined, undefined, 'props', undefined, nodeBuilder.typeToTypeNode(result, node))],
      returnNode ? TypeReferenceNode.create(returnNode, undefined) : new qc.KeywordTypeNode(Syntax.AnyKeyword)
    );
    const parameterSymbol = new Symbol(SymbolFlags.FunctionScopedVariable, 'props' as qb.__String);
    parameterSymbol.type = result;
    return createSignature(declaration, undefined, undefined, [parameterSymbol], typeSymbol ? getDeclaredTypeOfSymbol(typeSymbol) : errorType, undefined, 1, SignatureFlags.None);
  }
  function resolveJsxOpeningLikeElement(node: JsxOpeningLikeElement, candidatesOutArray: Signature[] | undefined, checkMode: CheckMode): Signature {
    if (isJsxIntrinsicIdentifier(node.tagName)) {
      const result = getIntrinsicAttributesTypeFromJsxOpeningLikeElement(node);
      const fakeSignature = createSignatureForJSXIntrinsic(node, result);
      check.typeAssignableToAndOptionallyElaborate(
        check.expressionWithContextualType(node.attributes, getEffectiveFirstArgumentForJsxSignature(fakeSignature, node), undefined, CheckMode.Normal),
        result,
        node.tagName,
        node.attributes
      );
      return fakeSignature;
    }
    const exprTypes = check.expression(node.tagName);
    const apparentType = getApparentType(exprTypes);
    if (apparentType === errorType) return resolveErrorCall(node);
    const signatures = getUninstantiatedJsxSignaturesOfType(exprTypes, node);
    if (isUntypedFunctionCall(exprTypes, apparentType, signatures.length, 0)) return resolveUntypedCall(node);
    if (signatures.length === 0) {
      error(node.tagName, qd.msgs.JSX_element_type_0_does_not_have_any_construct_or_call_signatures, get.textOf(node.tagName));
      return resolveErrorCall(node);
    }
    return resolveCall(node, signatures, candidatesOutArray, checkMode, SignatureFlags.None);
  }
  function isPotentiallyUncalledDecorator(decorator: Decorator, signatures: readonly Signature[]) {
    return (
      signatures.length &&
      every(signatures, (signature) => signature.minArgumentCount === 0 && !signatureHasRestParameter(signature) && signature.parameters.length < getDecoratorArgumentCount(decorator, signature))
    );
  }
  function resolveSignature(node: CallLikeExpression, candidatesOutArray: Signature[] | undefined, checkMode: CheckMode): Signature {
    switch (node.kind) {
      case Syntax.CallExpression:
        return resolveCallExpression(node, candidatesOutArray, checkMode);
      case Syntax.NewExpression:
        return resolveNewExpression(node, candidatesOutArray, checkMode);
      case Syntax.TaggedTemplateExpression:
        return resolveTaggedTemplateExpression(node, candidatesOutArray, checkMode);
      case Syntax.Decorator:
        return resolveDecorator(node, candidatesOutArray, checkMode);
      case Syntax.JsxOpeningElement:
      case Syntax.JsxSelfClosingElement:
        return resolveJsxOpeningLikeElement(node, candidatesOutArray, checkMode);
    }
    throw Debug.assertNever(node, "Branch in 'resolveSignature' should be unreachable.");
  }
  function isJSConstructor(node: Node | undefined): node is FunctionDeclaration | FunctionExpression {
    if (!node || !is.inJSFile(node)) return false;
    const func =
      is.kind(qc.FunctionDeclaration, node) || is.kind(qc.FunctionExpression, node)
        ? node
        : is.kind(qc.VariableDeclaration, node) && node.initer && is.kind(qc.FunctionExpression, node.initer)
        ? node.initer
        : undefined;
    if (func) {
      if (qc.getDoc.classTag(node)) return true;
      const symbol = getSymbolOfNode(func);
      return !!symbol && qb.hasEntries(symbol.members);
    }
    return false;
  }
  function mergeJSSymbols(target: Symbol, source: Symbol | undefined) {
    if (source) {
      const links = s.getLinks(source);
      if (!links.inferredClassSymbol || !links.inferredClassSymbol.has('' + target.getId())) {
        const inferred = isTransientSymbol(target) ? target : (target.clone() as TransientSymbol);
        inferred.exports = inferred.exports || new SymbolTable();
        inferred.members = inferred.members || new SymbolTable();
        inferred.flags |= source.flags & qt.SymbolFlags.Class;
        if (qb.hasEntries(source.exports)) inferred.exports.merge(source.exports);
        if (qb.hasEntries(source.members)) inferred.members.merge(source.members);
        (links.inferredClassSymbol || (links.inferredClassSymbol = new qb.QMap<TransientSymbol>())).set('' + inferred.getId(), inferred);
        return inferred;
      }
      return links.inferredClassSymbol.get('' + target.getId());
    }
  }
  function isSymbolOrSymbolForCall(node: Node) {
    if (!is.kind(qc.CallExpression, node)) return false;
    let left = node.expression;
    if (is.kind(qc.PropertyAccessExpression, left) && left.name.escapedText === 'for') left = left.expression;
    if (!is.kind(qc.Identifier, left) || left.escapedText !== 'Symbol') return false;
    const globalESSymbol = getGlobalESSymbolConstructorSymbol(false);
    if (!globalESSymbol) return false;
    return globalESSymbol === resolveName(left, 'Symbol' as qb.__String, qt.SymbolFlags.Value, undefined, undefined, false);
  }
  function isCommonJsRequire(node: Node): boolean {
    if (!isRequireCall(node, true)) return false;
    if (!is.kind(qc.Identifier, node.expression)) return qb.fail();
    const resolvedRequire = resolveName(node.expression, node.expression.escapedText, qt.SymbolFlags.Value, undefined, undefined, true)!;
    if (resolvedRequire === requireSymbol) return true;
    if (resolvedRequire.flags & qt.SymbolFlags.Alias) return false;
    const targetDeclarationKind =
      resolvedRequire.flags & qt.SymbolFlags.Function ? Syntax.FunctionDeclaration : resolvedRequire.flags & qt.SymbolFlags.Variable ? Syntax.VariableDeclaration : Syntax.Unknown;
    if (targetDeclarationKind !== Syntax.Unknown) {
      const decl = getDeclarationOfKind(resolvedRequire, targetDeclarationKind)!;
      return !!decl && !!(decl.flags & NodeFlags.Ambient);
    }
    return false;
  }
  function isValidConstAssertionArgument(node: Node): boolean {
    switch (node.kind) {
      case Syntax.StringLiteral:
      case Syntax.NoSubstitutionLiteral:
      case Syntax.NumericLiteral:
      case Syntax.BigIntLiteral:
      case Syntax.TrueKeyword:
      case Syntax.FalseKeyword:
      case Syntax.ArrayLiteralExpression:
      case Syntax.ObjectLiteralExpression:
        return true;
      case Syntax.ParenthesizedExpression:
        return isValidConstAssertionArgument((<ParenthesizedExpression>node).expression);
      case Syntax.PrefixUnaryExpression:
        const op = (<PrefixUnaryExpression>node).operator;
        const arg = (<PrefixUnaryExpression>node).operand;
        return (op === Syntax.MinusToken && (arg.kind === Syntax.NumericLiteral || arg.kind === Syntax.BigIntLiteral)) || (op === Syntax.PlusToken && arg.kind === Syntax.NumericLiteral);
      case Syntax.PropertyAccessExpression:
      case Syntax.ElementAccessExpression:
        const expr = (<PropertyAccessExpression | ElementAccessExpression>node).expression;
        if (is.kind(qc.Identifier, expr)) {
          let symbol = getSymbolAtLocation(expr);
          if (symbol && symbol.flags & qt.SymbolFlags.Alias) symbol = this.resolveAlias();
          return !!(symbol && symbol.flags & qt.SymbolFlags.Enum && getEnumKind(symbol) === EnumKind.Literal);
        }
    }
    return false;
  }
  function isValidDeclarationForTupleLabel(d: Declaration): d is NamedTupleMember | (ParameterDeclaration & { name: qc.Identifier }) {
    return d.kind === Syntax.NamedTupleMember || (is.kind(qc.ParameterDeclaration, d) && d.name && is.kind(qc.Identifier, d.name));
  }
  function tryGetTypeAtPosition(signature: Signature, pos: number): Type | undefined {
    const paramCount = signature.parameters.length - (signatureHasRestParameter(signature) ? 1 : 0);
    if (pos < paramCount) return getTypeOfParameter(signature.parameters[pos]);
    if (signatureHasRestParameter(signature)) {
      const restType = getTypeOfSymbol(signature.parameters[paramCount]);
      const index = pos - paramCount;
      if (!isTupleType(restType) || restType.target.hasRestElement || index < getTypeArguments(restType).length) return getIndexedAccessType(restType, getLiteralType(index));
    }
    return;
  }
  function hasEffectiveRestParameter(signature: Signature) {
    if (signatureHasRestParameter(signature)) {
      const restType = getTypeOfSymbol(signature.parameters[signature.parameters.length - 1]);
      return !isTupleType(restType) || restType.target.hasRestElement;
    }
    return false;
  }
  function inferFromAnnotatedParameters(signature: Signature, context: Signature, inferenceContext: InferenceContext) {
    const len = signature.parameters.length - (signatureHasRestParameter(signature) ? 1 : 0);
    for (let i = 0; i < len; i++) {
      const declaration = <ParameterDeclaration>signature.parameters[i].valueDeclaration;
      if (declaration.type) {
        const typeNode = get.effectiveTypeAnnotationNode(declaration);
        if (typeNode) inferTypes(inferenceContext.inferences, getTypeFromTypeNode(typeNode), getTypeAtPosition(context, i));
      }
    }
    const restType = getEffectiveRestType(context);
    if (restType && restType.flags & qt.TypeFlags.TypeParameter) {
      const instantiatedContext = instantiateSignature(context, inferenceContext.nonFixingMapper);
      assignContextualParameterTypes(signature, instantiatedContext);
      const restPos = getParameterCount(context) - 1;
      inferTypes(inferenceContext.inferences, getRestTypeAtPosition(signature, restPos), restType);
    }
  }
  function assignContextualParameterTypes(signature: Signature, context: Signature) {
    signature.typeParameters = context.typeParameters;
    if (context.thisParameter) {
      const parameter = signature.thisParameter;
      if (!parameter || (parameter.valueDeclaration && !(<ParameterDeclaration>parameter.valueDeclaration).type)) {
        if (!parameter) signature.thisParameter = createSymbolWithType(context.thisParameter, undefined);
        assignParameterType(signature.thisParameter!, getTypeOfSymbol(context.thisParameter));
      }
    }
    const len = signature.parameters.length - (signatureHasRestParameter(signature) ? 1 : 0);
    for (let i = 0; i < len; i++) {
      const parameter = signature.parameters[i];
      if (!get.effectiveTypeAnnotationNode(<ParameterDeclaration>parameter.valueDeclaration)) {
        const contextualParameterType = tryGetTypeAtPosition(context, i);
        assignParameterType(parameter, contextualParameterType);
      }
    }
    if (signatureHasRestParameter(signature)) {
      const parameter = last(signature.parameters);
      if (isTransientSymbol(parameter) || !get.effectiveTypeAnnotationNode(<ParameterDeclaration>parameter.valueDeclaration)) {
        const contextualParameterType = getRestTypeAtPosition(context, len);
        assignParameterType(parameter, contextualParameterType);
      }
    }
  }
  function assignNonContextualParameterTypes(signature: Signature) {
    if (signature.thisParameter) assignParameterType(signature.thisParameter);
    for (const parameter of signature.parameters) {
      assignParameterType(parameter);
    }
  }
  function assignParameterType(parameter: Symbol, type?: Type) {
    const links = s.getLinks(parameter);
    if (!links.type) {
      const declaration = parameter.valueDeclaration as ParameterDeclaration;
      links.type = type || getWidenedTypeForVariableLikeDeclaration(declaration, true);
      if (declaration.name.kind !== Syntax.Identifier) {
        if (links.type === unknownType) links.type = getTypeFromBindingPattern(declaration.name);
        assignBindingElementTypes(declaration.name);
      }
    }
  }
  function assignBindingElementTypes(pattern: BindingPattern) {
    for (const element of pattern.elements) {
      if (!is.kind(qc.OmittedExpression, element)) {
        if (element.name.kind === Syntax.Identifier) s.getLinks(getSymbolOfNode(element)).type = getTypeForBindingElement(element);
        else assignBindingElementTypes(element.name);
      }
    }
  }
  function createPromiseType(promisedType: Type): Type {
    const globalPromiseType = getGlobalPromiseType(true);
    if (globalPromiseType !== emptyGenericType) {
      promisedType = getAwaitedType(promisedType) || unknownType;
      return createTypeReference(globalPromiseType, [promisedType]);
    }
    return unknownType;
  }
  function createPromiseLikeType(promisedType: Type): Type {
    const globalPromiseLikeType = getGlobalPromiseLikeType(true);
    if (globalPromiseLikeType !== emptyGenericType) {
      promisedType = getAwaitedType(promisedType) || unknownType;
      return createTypeReference(globalPromiseLikeType, [promisedType]);
    }
    return unknownType;
  }
  function createPromiseReturnType(func: FunctionLikeDeclaration | ImportCall, promisedType: Type) {
    const promiseType = createPromiseType(promisedType);
    if (promiseType === unknownType) {
      error(
        func,
        is.importCall(func)
          ? qd.msgs.A_dynamic_import_call_returns_a_Promise_Make_sure_you_have_a_declaration_for_Promise_or_include_ES2015_in_your_lib_option
          : qd.msgs.An_async_function_or_method_must_return_a_Promise_Make_sure_you_have_a_declaration_for_Promise_or_include_ES2015_in_your_lib_option
      );
      return errorType;
    } else if (!getGlobalPromiseConstructorSymbol(true)) {
      error(
        func,
        is.importCall(func)
          ? qd.msgs.A_dynamic_import_call_in_ES5_SlashES3_requires_the_Promise_constructor_Make_sure_you_have_a_declaration_for_the_Promise_constructor_or_include_ES2015_in_your_lib_option
          : qd.msgs.An_async_function_or_method_in_ES5_SlashES3_requires_the_Promise_constructor_Make_sure_you_have_a_declaration_for_the_Promise_constructor_or_include_ES2015_in_your_lib_option
      );
    }
    return promiseType;
  }
  function createGeneratorReturnType(yieldType: Type, returnType: Type, nextType: Type, isAsyncGenerator: boolean) {
    const resolver = isAsyncGenerator ? asyncIterationTypesResolver : syncIterationTypesResolver;
    const globalGeneratorType = resolver.getGlobalGeneratorType(false);
    yieldType = resolver.resolveIterationType(yieldType, undefined) || unknownType;
    returnType = resolver.resolveIterationType(returnType, undefined) || unknownType;
    nextType = resolver.resolveIterationType(nextType, undefined) || unknownType;
    if (globalGeneratorType === emptyGenericType) {
      const globalType = resolver.getGlobalIterableIteratorType(false);
      const iterationTypes = globalType !== emptyGenericType ? getIterationTypesOfGlobalIterableType(globalType, resolver) : undefined;
      const iterableIteratorReturnType = iterationTypes ? iterationTypes.returnType : anyType;
      const iterableIteratorNextType = iterationTypes ? iterationTypes.nextType : undefinedType;
      if (isTypeAssignableTo(returnType, iterableIteratorReturnType) && isTypeAssignableTo(iterableIteratorNextType, nextType)) {
        if (globalType !== emptyGenericType) return createTypeFromGenericGlobalType(globalType, [yieldType]);
        resolver.getGlobalIterableIteratorType(true);
        return emptyObjectType;
      }
      resolver.getGlobalGeneratorType(true);
      return emptyObjectType;
    }
    return createTypeFromGenericGlobalType(globalGeneratorType, [yieldType, returnType, nextType]);
  }
  function isExhaustiveSwitchStatement(node: SwitchStatement): boolean {
    const links = getNodeLinks(node);
    return links.isExhaustive !== undefined ? links.isExhaustive : (links.isExhaustive = computeExhaustiveSwitchStatement(node));
  }
  function computeExhaustiveSwitchStatement(node: SwitchStatement): boolean {
    if (node.expression.kind === Syntax.TypeOfExpression) {
      const operandType = getTypeOfExpression((node.expression as TypeOfExpression).expression);
      const witnesses = getSwitchClauseTypeOfWitnesses(node, false);
      const notEqualFacts = getFactsFromTypeofSwitch(0, 0, witnesses, true);
      const type = getBaseConstraintOfType(operandType) || operandType;
      return !!(filterType(type, (t) => (getTypeFacts(t) & notEqualFacts) === notEqualFacts).flags & qt.TypeFlags.Never);
    }
    const type = getTypeOfExpression(node.expression);
    if (!isLiteralType(type)) return false;
    const switchTypes = getSwitchClauseTypes(node);
    if (!switchTypes.length || some(switchTypes, isNeitherUnitTypeNorNever)) return false;
    return eachTypeContainedIn(mapType(type, getRegularTypeOfLiteralType), switchTypes);
  }
  function functionHasImplicitReturn(func: FunctionLikeDeclaration) {
    return func.endFlowNode && isReachableFlowNode(func.endFlowNode);
  }
  function mayReturnNever(func: FunctionLikeDeclaration): boolean {
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
  function contextuallyCheckFunctionExpressionOrObjectLiteralMethod(node: FunctionExpression | ArrowFunction | MethodDeclaration, checkMode?: CheckMode) {
    const links = getNodeLinks(node);
    if (!(links.flags & NodeCheckFlags.ContextChecked)) {
      const contextualSignature = getContextualSignature(node);
      if (!(links.flags & NodeCheckFlags.ContextChecked)) {
        links.flags |= NodeCheckFlags.ContextChecked;
        const signature = firstOrUndefined(getSignaturesOfType(getTypeOfSymbol(getSymbolOfNode(node)), SignatureKind.Call));
        if (!signature) return;
        if (isContextSensitive(node)) {
          if (contextualSignature) {
            const inferenceContext = getInferenceContext(node);
            if (checkMode && checkMode & CheckMode.Inferential) inferFromAnnotatedParameters(signature, contextualSignature, inferenceContext!);
            const instantiatedContextualSignature = inferenceContext ? instantiateSignature(contextualSignature, inferenceContext.mapper) : contextualSignature;
            assignContextualParameterTypes(signature, instantiatedContextualSignature);
          } else {
            assignNonContextualParameterTypes(signature);
          }
        }
        if (contextualSignature && !getReturnTypeFromAnnotation(node) && !signature.resolvedReturnType) {
          const returnType = getReturnTypeFromBody(node, checkMode);
          if (!signature.resolvedReturnType) signature.resolvedReturnType = returnType;
        }
        check.signatureDeclaration(node);
      }
    }
  }
  function isReadonlyAssignmentDeclaration(d: Declaration) {
    if (!is.kind(qc.CallExpression, d)) return false;
    if (!isBindableObjectDefinePropertyCall(d)) return false;
    const objectLitType = check.expressionCached(d.arguments[2]);
    const valueType = getTypeOfPropertyOfType(objectLitType, 'value' as qb.__String);
    if (valueType) {
      const writableProp = getPropertyOfType(objectLitType, 'writable' as qb.__String);
      const writableType = writableProp && getTypeOfSymbol(writableProp);
      if (!writableType || writableType === falseType || writableType === regularFalseType) return true;
      if (writableProp && writableProp.valueDeclaration && is.kind(qc.PropertyAssignment, writableProp.valueDeclaration)) {
        const initer = writableProp.valueDeclaration.initer;
        const rawOriginalType = check.expression(initer);
        if (rawOriginalType === falseType || rawOriginalType === regularFalseType) return true;
      }
      return false;
    }
    const setProp = getPropertyOfType(objectLitType, 'set' as qb.__String);
    return !setProp;
  }
  function isAssignmentToReadonlyEntity(expr: Expression, symbol: Symbol, assignmentKind: AssignmentKind) {
    if (assignmentKind === AssignmentKind.None) return false;
    if (isReadonlySymbol(symbol)) {
      if (symbol.flags & qt.SymbolFlags.Property && is.accessExpression(expr) && expr.expression.kind === Syntax.ThisKeyword) {
        const ctor = get.containingFunction(expr);
        if (!(ctor && ctor.kind === Syntax.Constructor)) return true;
        if (symbol.valueDeclaration) {
          const isAssignmentDeclaration = is.kind(qc.BinaryExpression, symbol.valueDeclaration);
          const isLocalPropertyDeclaration = ctor.parent === symbol.valueDeclaration.parent;
          const isLocalParameterProperty = ctor === symbol.valueDeclaration.parent;
          const isLocalThisPropertyAssignment = isAssignmentDeclaration && symbol.parent?.valueDeclaration === ctor.parent;
          const isLocalThisPropertyAssignmentConstructorFunction = isAssignmentDeclaration && symbol.parent?.valueDeclaration === ctor;
          const isWriteableSymbol = isLocalPropertyDeclaration || isLocalParameterProperty || isLocalThisPropertyAssignment || isLocalThisPropertyAssignmentConstructorFunction;
          return !isWriteableSymbol;
        }
      }
      return true;
    }
    if (is.accessExpression(expr)) {
      const node = skipParentheses(expr.expression);
      if (node.kind === Syntax.Identifier) {
        const symbol = getNodeLinks(node).resolvedSymbol!;
        if (symbol.flags & qt.SymbolFlags.Alias) {
          const declaration = symbol.getDeclarationOfAliasSymbol();
          return !!declaration && declaration.kind === Syntax.NamespaceImport;
        }
      }
    }
    return false;
  }
  function isTopLevelAwait(node: AwaitExpression) {
    const container = get.thisContainer(node, true);
    return is.kind(qc.SourceFile, container);
  }
  function maybeTypeOfKind(type: Type, kind: qt.TypeFlags): boolean {
    if (type.flags & kind) return true;
    if (type.flags & qt.TypeFlags.UnionOrIntersection) {
      const types = (<UnionOrIntersectionType>type).types;
      for (const t of types) {
        if (maybeTypeOfKind(t, kind)) return true;
      }
    }
    return false;
  }
  function isTypeAssignableToKind(source: Type, kind: qt.TypeFlags, strict?: boolean): boolean {
    if (source.flags & kind) return true;
    if (strict && source.flags & (TypeFlags.AnyOrUnknown | qt.TypeFlags.Void | qt.TypeFlags.Undefined | qt.TypeFlags.Null)) return false;
    return (
      (!!(kind & qt.TypeFlags.NumberLike) && isTypeAssignableTo(source, numberType)) ||
      (!!(kind & qt.TypeFlags.BigIntLike) && isTypeAssignableTo(source, bigintType)) ||
      (!!(kind & qt.TypeFlags.StringLike) && isTypeAssignableTo(source, stringType)) ||
      (!!(kind & qt.TypeFlags.BooleanLike) && isTypeAssignableTo(source, booleanType)) ||
      (!!(kind & qt.TypeFlags.Void) && isTypeAssignableTo(source, voidType)) ||
      (!!(kind & qt.TypeFlags.Never) && isTypeAssignableTo(source, neverType)) ||
      (!!(kind & qt.TypeFlags.Null) && isTypeAssignableTo(source, nullType)) ||
      (!!(kind & qt.TypeFlags.Undefined) && isTypeAssignableTo(source, undefinedType)) ||
      (!!(kind & qt.TypeFlags.ESSymbol) && isTypeAssignableTo(source, esSymbolType)) ||
      (!!(kind & qt.TypeFlags.NonPrimitive) && isTypeAssignableTo(source, nonPrimitiveType))
    );
  }
  function allTypesAssignableToKind(source: Type, kind: qt.TypeFlags, strict?: boolean): boolean {
    return source.flags & qt.TypeFlags.Union ? every((source as UnionType).types, (subType) => allTypesAssignableToKind(subType, kind, strict)) : isTypeAssignableToKind(source, kind, strict);
  }
  function isConstEnumObjectType(type: Type): boolean {
    return !!(getObjectFlags(type) & ObjectFlags.Anonymous) && !!type.symbol && isConstEnumSymbol(type.symbol);
  }
  function isSideEffectFree(node: Node): boolean {
    node = skipParentheses(node);
    switch (node.kind) {
      case Syntax.Identifier:
      case Syntax.StringLiteral:
      case Syntax.RegexLiteral:
      case Syntax.TaggedTemplateExpression:
      case Syntax.TemplateExpression:
      case Syntax.NoSubstitutionLiteral:
      case Syntax.NumericLiteral:
      case Syntax.BigIntLiteral:
      case Syntax.TrueKeyword:
      case Syntax.FalseKeyword:
      case Syntax.NullKeyword:
      case Syntax.UndefinedKeyword:
      case Syntax.FunctionExpression:
      case Syntax.ClassExpression:
      case Syntax.ArrowFunction:
      case Syntax.ArrayLiteralExpression:
      case Syntax.ObjectLiteralExpression:
      case Syntax.TypeOfExpression:
      case Syntax.NonNullExpression:
      case Syntax.JsxSelfClosingElement:
      case Syntax.JsxElement:
        return true;
      case Syntax.ConditionalExpression:
        return isSideEffectFree((node as ConditionalExpression).whenTrue) && isSideEffectFree((node as ConditionalExpression).whenFalse);
      case Syntax.BinaryExpression:
        if (qy.is.assignmentOperator((node as BinaryExpression).operatorToken.kind)) return false;
        return isSideEffectFree((node as BinaryExpression).left) && isSideEffectFree((node as BinaryExpression).right);
      case Syntax.PrefixUnaryExpression:
      case Syntax.PostfixUnaryExpression:
        switch ((node as PrefixUnaryExpression).operator) {
          case Syntax.ExclamationToken:
          case Syntax.PlusToken:
          case Syntax.MinusToken:
          case Syntax.TildeToken:
            return true;
        }
        return false;
      case Syntax.VoidExpression:
      case Syntax.TypeAssertionExpression:
      case Syntax.AsExpression:
      default:
        return false;
    }
  }
  function isTypeEqualityComparableTo(source: Type, target: Type) {
    return (target.flags & qt.TypeFlags.Nullable) !== 0 || isTypeComparableTo(source, target);
  }
  const enum CheckBinaryExpressionState {
    MaybeCheckLeft,
    CheckRight,
    FinishCheck,
  }
  function isNodekind(TypeAssertion, node: Expression) {
    node = skipParentheses(node);
    return node.kind === Syntax.TypeAssertionExpression || node.kind === Syntax.AsExpression;
  }
  function padTupleType(type: TupleTypeReference, pattern: ArrayBindingPattern) {
    const patternElements = pattern.elements;
    const arity = getTypeReferenceArity(type);
    const elementTypes = arity ? getTypeArguments(type).slice() : [];
    for (let i = arity; i < patternElements.length; i++) {
      const e = patternElements[i];
      if (i < patternElements.length - 1 || !(e.kind === Syntax.BindingElement && e.dot3Token)) {
        elementTypes.push(!is.kind(qc.OmittedExpression, e) && hasDefaultValue(e) ? getTypeFromBindingElement(e, false, false) : anyType);
        if (!is.kind(qc.OmittedExpression, e) && !hasDefaultValue(e)) reportImplicitAny(e, anyType);
      }
    }
    return createTupleType(elementTypes, type.target.minLength, false, type.target.readonly);
  }
  function widenTypeInferredFromIniter(declaration: HasExpressionIniter, type: Type) {
    const widened = get.combinedFlagsOf(declaration) & NodeFlags.Const || isDeclarationReadonly(declaration) ? type : getWidenedLiteralType(type);
    if (is.inJSFile(declaration)) {
      if (widened.flags & qt.TypeFlags.Nullable) {
        reportImplicitAny(declaration, anyType);
        return anyType;
      } else if (isEmptyArrayLiteralType(widened)) {
        reportImplicitAny(declaration, anyArrayType);
        return anyArrayType;
      }
    }
    return widened;
  }
  function isLiteralOfContextualType(candidateType: Type, contextualType: Type | undefined): boolean {
    if (contextualType) {
      if (contextualType.flags & qt.TypeFlags.UnionOrIntersection) {
        const types = (<UnionType>contextualType).types;
        return some(types, (t) => isLiteralOfContextualType(candidateType, t));
      }
      if (contextualType.flags & qt.TypeFlags.InstantiableNonPrimitive) {
        const constraint = getBaseConstraintOfType(contextualType) || unknownType;
        return (
          (maybeTypeOfKind(constraint, qt.TypeFlags.String) && maybeTypeOfKind(candidateType, qt.TypeFlags.StringLiteral)) ||
          (maybeTypeOfKind(constraint, qt.TypeFlags.Number) && maybeTypeOfKind(candidateType, qt.TypeFlags.NumberLiteral)) ||
          (maybeTypeOfKind(constraint, qt.TypeFlags.BigInt) && maybeTypeOfKind(candidateType, qt.TypeFlags.BigIntLiteral)) ||
          (maybeTypeOfKind(constraint, qt.TypeFlags.ESSymbol) && maybeTypeOfKind(candidateType, qt.TypeFlags.UniqueESSymbol)) ||
          isLiteralOfContextualType(candidateType, constraint)
        );
      }
      return !!(
        (contextualType.flags & (TypeFlags.StringLiteral | qt.TypeFlags.Index) && maybeTypeOfKind(candidateType, qt.TypeFlags.StringLiteral)) ||
        (contextualType.flags & qt.TypeFlags.NumberLiteral && maybeTypeOfKind(candidateType, qt.TypeFlags.NumberLiteral)) ||
        (contextualType.flags & qt.TypeFlags.BigIntLiteral && maybeTypeOfKind(candidateType, qt.TypeFlags.BigIntLiteral)) ||
        (contextualType.flags & qt.TypeFlags.BooleanLiteral && maybeTypeOfKind(candidateType, qt.TypeFlags.BooleanLiteral)) ||
        (contextualType.flags & qt.TypeFlags.UniqueESSymbol && maybeTypeOfKind(candidateType, qt.TypeFlags.UniqueESSymbol))
      );
    }
    return false;
  }
  function isConstContext(node: Expression): boolean {
    const parent = node.parent;
    return (
      (is.assertionExpression(parent) && is.constTypeReference(parent.type)) ||
      ((is.kind(qc.ParenthesizedExpression, parent) || isArrayLiteralExpression(parent) || is.kind(qc.SpreadElement, parent)) && isConstContext(parent)) ||
      ((is.kind(qc.PropertyAssignment, parent) || is.kind(qc.ShorthandPropertyAssignment, parent)) && isConstContext(parent.parent))
    );
  }
  function instantiateTypeWithSingleGenericCallSignature(node: Expression | MethodDeclaration | QualifiedName, type: Type, checkMode?: CheckMode) {
    if (checkMode && checkMode & (CheckMode.Inferential | CheckMode.SkipGenericFunctions)) {
      const callSignature = getSingleSignature(type, SignatureKind.Call, true);
      const constructSignature = getSingleSignature(type, SignatureKind.Construct, true);
      const signature = callSignature || constructSignature;
      if (signature && signature.typeParameters) {
        const contextualType = getApparentTypeOfContextualType(<Expression>node, ContextFlags.NoConstraints);
        if (contextualType) {
          const contextualSignature = getSingleSignature(getNonNullableType(contextualType), callSignature ? SignatureKind.Call : SignatureKind.Construct, false);
          if (contextualSignature && !contextualSignature.typeParameters) {
            if (checkMode & CheckMode.SkipGenericFunctions) {
              skippedGenericFunction(node, checkMode);
              return anyFunctionType;
            }
            const context = getInferenceContext(node)!;
            const returnType = context.signature && getReturnTypeOfSignature(context.signature);
            const returnSignature = returnType && getSingleCallOrConstructSignature(returnType);
            if (returnSignature && !returnSignature.typeParameters && !every(context.inferences, hasInferenceCandidates)) {
              const uniqueTypeParameters = getUniqueTypeParameters(context, signature.typeParameters);
              const instantiatedSignature = getSignatureInstantiationWithoutFillingInTypeArguments(signature, uniqueTypeParameters);
              const inferences = map(context.inferences, (info) => createInferenceInfo(info.typeParameter));
              applyToParameterTypes(instantiatedSignature, contextualSignature, (source, target) => {
                inferTypes(inferences, source, target, true);
              });
              if (some(inferences, hasInferenceCandidates)) {
                applyToReturnTypes(instantiatedSignature, contextualSignature, (source, target) => {
                  inferTypes(inferences, source, target);
                });
                if (!hasOverlappingInferences(context.inferences, inferences)) {
                  mergeInferences(context.inferences, inferences);
                  context.inferredTypeParameters = concatenate(context.inferredTypeParameters, uniqueTypeParameters);
                  return getOrCreateTypeFromSignature(instantiatedSignature);
                }
              }
            }
            return getOrCreateTypeFromSignature(instantiateSignatureInContextOf(signature, contextualSignature, context));
          }
        }
      }
    }
    return type;
  }
  function skippedGenericFunction(node: Node, checkMode: CheckMode) {
    if (checkMode & CheckMode.Inferential) {
      const context = getInferenceContext(node)!;
      context.flags |= InferenceFlags.SkippedGenericFunction;
    }
  }
  function hasInferenceCandidates(info: InferenceInfo) {
    return !!(info.candidates || info.contraCandidates);
  }
  function hasOverlappingInferences(a: InferenceInfo[], b: InferenceInfo[]) {
    for (let i = 0; i < a.length; i++) {
      if (hasInferenceCandidates(a[i]) && hasInferenceCandidates(b[i])) return true;
    }
    return false;
  }
  function mergeInferences(target: InferenceInfo[], source: InferenceInfo[]) {
    for (let i = 0; i < target.length; i++) {
      if (!hasInferenceCandidates(target[i]) && hasInferenceCandidates(source[i])) target[i] = source[i];
    }
  }
  function hasTypeParameterByName(typeParameters: readonly TypeParameter[] | undefined, name: qb.__String) {
    return some(typeParameters, (tp) => tp.symbol.escName === name);
  }
  function isPrivateWithinAmbient(node: Node): boolean {
    return (has.effectiveModifier(node, ModifierFlags.Private) || node.is.privateIdentifierPropertyDeclaration()) && !!(node.flags & NodeFlags.Ambient);
  }
  function isThenableType(type: Type): boolean {
    const thenFunction = getTypeOfPropertyOfType(type, 'then' as qb.__String);
    return !!thenFunction && getSignaturesOfType(getTypeWithFacts(thenFunction, TypeFacts.NEUndefinedOrNull), SignatureKind.Call).length > 0;
  }
  function markTypeNodeAsReferenced(node: TypeNode) {
    markEntityNameOrEntityExpressionAsReference(node && getEntityNameFromTypeNode(node));
  }
  function markEntityNameOrEntityExpressionAsReference(typeName: EntityNameOrEntityNameExpression | undefined) {
    if (!typeName) return;
    const rootName = getFirstIdentifier(typeName);
    const meaning = (typeName.kind === Syntax.Identifier ? qt.SymbolFlags.Type : qt.SymbolFlags.Namespace) | qt.SymbolFlags.Alias;
    const rootSymbol = resolveName(rootName, rootName.escapedText, meaning, undefined, undefined, true);
    if (rootSymbol && rootSymbol.flags & qt.SymbolFlags.Alias && symbolIsValue(rootSymbol) && !isConstEnumOrConstEnumOnlyModule(rootSymbol.resolveAlias()) && !rootSymbol.getTypeOnlyAliasDeclaration())
      rootSymbol.markAliasSymbolAsReferenced();
  }
  function markDecoratorMedataDataTypeNodeAsReferenced(node: TypeNode | undefined): void {
    const entityName = getEntityNameForDecoratorMetadata(node);
    if (entityName && is.entityName(entityName)) markEntityNameOrEntityExpressionAsReference(entityName);
  }
  function registerForUnusedIdentifiersCheck(node: PotentiallyUnusedIdentifier): void {
    if (produceDiagnostics) {
      const sourceFile = get.sourceFileOf(node);
      let potentiallyUnusedIdentifiers = allPotentiallyUnusedIdentifiers.get(sourceFile.path);
      if (!potentiallyUnusedIdentifiers) {
        potentiallyUnusedIdentifiers = [];
        allPotentiallyUnusedIdentifiers.set(sourceFile.path, potentiallyUnusedIdentifiers);
      }
      potentiallyUnusedIdentifiers.push(node);
    }
  }
  type PotentiallyUnusedIdentifier =
    | SourceFile
    | ModuleDeclaration
    | ClassLikeDeclaration
    | InterfaceDeclaration
    | Block
    | CaseBlock
    | ForStatement
    | ForInStatement
    | ForOfStatement
    | Exclude<SignatureDeclaration, IndexSignatureDeclaration | DocFunctionType>
    | TypeAliasDeclaration
    | InferTypeNode;
  function errorUnusedLocal(declaration: Declaration, name: string, addDiagnostic: AddUnusedDiagnostic) {
    const node = get.nameOfDeclaration(declaration) || declaration;
    const message = isTypeDeclaration(declaration) ? qd.msgs._0_is_declared_but_never_used : qd.msgs._0_is_declared_but_its_value_is_never_read;
    addDiagnostic(declaration, UnusedKind.Local, createDiagnosticForNode(node, message, name));
  }
  function isIdentifierThatStartsWithUnderscore(node: Node) {
    return is.kind(qc.Identifier, node) && idText(node).charCodeAt(0) === Codes._;
  }
  function isTypeParameterUnused(typeParameter: TypeParameterDeclaration): boolean {
    return !(getMergedSymbol(typeParameter.symbol).isReferenced! & qt.SymbolFlags.TypeParameter) && !isIdentifierThatStartsWithUnderscore(typeParameter.name);
  }
  function addToGroup<K, V>(map: qb.QMap<string, [K, V[]]>, key: K, value: V, getKey: (key: K) => number | string): void {
    const keyString = String(getKey(key));
    const group = map.get(keyString);
    if (group) group[1].push(value);
    else {
      map.set(keyString, [key, [value]]);
    }
  }
  function tryGetRootParameterDeclaration(node: Node): ParameterDeclaration | undefined {
    return tryCast(get.rootDeclaration(node), isParameter);
  }
  function isValidUnusedLocalDeclaration(declaration: Declaration): boolean {
    if (is.kind(qc.BindingElement, declaration) && isIdentifierThatStartsWithUnderscore(declaration.name)) {
      return !!qc.findAncestor(declaration.parent, (ancestor) =>
        is.kind(qc.ArrayBindingPattern, ancestor) || is.kind(qc.VariableDeclaration, ancestor) || is.kind(qc.VariableDeclarationList, ancestor)
          ? false
          : is.kind(qc.ForOfStatement, ancestor)
          ? true
          : 'quit'
      );
    }
    return (
      is.ambientModule(declaration) ||
      (((is.kind(qc.VariableDeclaration, declaration) && is.forInOrOfStatement(declaration.parent.parent)) || isImportedDeclaration(declaration)) &&
        isIdentifierThatStartsWithUnderscore(declaration.name!))
    );
  }
  function bindingNameText(name: BindingName): string {
    switch (name.kind) {
      case Syntax.Identifier:
        return idText(name);
      case Syntax.ArrayBindingPattern:
      case Syntax.ObjectBindingPattern:
        return bindingNameText(cast(first(name.elements), BindingElement.kind).name);
      default:
        return Debug.assertNever(name);
    }
  }
  type ImportedDeclaration = ImportClause | ImportSpecifier | NamespaceImport;
  function isImportedDeclaration(node: Node): node is ImportedDeclaration {
    return node.kind === Syntax.ImportClause || node.kind === Syntax.ImportSpecifier || node.kind === Syntax.NamespaceImport;
  }
  function importClauseFromImported(decl: ImportedDeclaration): ImportClause {
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
    const root = get.rootDeclaration(node);
    if (root.kind === Syntax.Parameter && is.missing((<FunctionLikeDeclaration>root.parent).body)) return false;
    return true;
  }
  function convertAutoToAny(type: Type) {
    return type === autoType ? anyType : type === autoArrayType ? anyArrayType : type;
  }
  function errorNextVariableOrPropertyDeclarationMustHaveSameType(firstDeclaration: Declaration | undefined, firstType: Type, nextDeclaration: Declaration, nextType: Type): void {
    const nextDeclarationName = get.nameOfDeclaration(nextDeclaration);
    const message =
      nextDeclaration.kind === Syntax.PropertyDeclaration || nextDeclaration.kind === Syntax.PropertySignature
        ? qd.msgs.Subsequent_property_declarations_must_have_the_same_type_Property_0_must_be_of_type_1_but_here_has_type_2
        : qd.msgs.Subsequent_variable_declarations_must_have_the_same_type_Variable_0_must_be_of_type_1_but_here_has_type_2;
    const declName = declarationNameToString(nextDeclarationName);
    const err = error(nextDeclarationName, message, declName, typeToString(firstType), typeToString(nextType));
    if (firstDeclaration) addRelatedInfo(err, createDiagnosticForNode(firstDeclaration, qd.msgs._0_was_also_declared_here, declName));
  }
  function areDeclarationFlagsIdentical(left: Declaration, right: Declaration) {
    if ((left.kind === Syntax.Parameter && right.kind === Syntax.VariableDeclaration) || (left.kind === Syntax.VariableDeclaration && right.kind === Syntax.Parameter)) return true;
    if (has.questionToken(left) !== has.questionToken(right)) return false;
    const interestingFlags = ModifierFlags.Private | ModifierFlags.Protected | ModifierFlags.Async | ModifierFlags.Abstract | ModifierFlags.Readonly | ModifierFlags.Static;
    return get.selectedEffectiveModifierFlags(left, interestingFlags) === get.selectedEffectiveModifierFlags(right, interestingFlags);
  }
  function createIterationTypes(yieldType: Type = neverType, returnType: Type = neverType, nextType: Type = unknownType): IterationTypes {
    if (
      yieldType.flags & qt.TypeFlags.Intrinsic &&
      returnType.flags & (TypeFlags.Any | qt.TypeFlags.Never | qt.TypeFlags.Unknown | qt.TypeFlags.Void | qt.TypeFlags.Undefined) &&
      nextType.flags & (TypeFlags.Any | qt.TypeFlags.Never | qt.TypeFlags.Unknown | qt.TypeFlags.Void | qt.TypeFlags.Undefined)
    ) {
      const id = getTypeListId([yieldType, returnType, nextType]);
      let iterationTypes = iterationTypesCache.get(id);
      if (!iterationTypes) {
        iterationTypes = { yieldType, returnType, nextType };
        iterationTypesCache.set(id, iterationTypes);
      }
      return iterationTypes;
    }
    return { yieldType, returnType, nextType };
  }
  function combineIterationTypes(array: (IterationTypes | undefined)[]) {
    let yieldTypes: Type[] | undefined;
    let returnTypes: Type[] | undefined;
    let nextTypes: Type[] | undefined;
    for (const iterationTypes of array) {
      if (iterationTypes === undefined || iterationTypes === noIterationTypes) continue;
      if (iterationTypes === anyIterationTypes) return anyIterationTypes;
      yieldTypes = append(yieldTypes, iterationTypes.yieldType);
      returnTypes = append(returnTypes, iterationTypes.returnType);
      nextTypes = append(nextTypes, iterationTypes.nextType);
    }
    if (yieldTypes || returnTypes || nextTypes)
      return createIterationTypes(yieldTypes && getUnionType(yieldTypes), returnTypes && getUnionType(returnTypes), nextTypes && getIntersectionType(nextTypes));
    return noIterationTypes;
  }
  function setCachedIterationTypes(type: Type, cacheKey: MatchingKeys<IterableOrIteratorType, IterationTypes | undefined>, cachedTypes: IterationTypes) {
    return ((type as IterableOrIteratorType)[cacheKey] = cachedTypes);
  }
  function reportTypeNotIterableError(errorNode: Node, type: Type, allowAsyncIterables: boolean): void {
    const message = allowAsyncIterables ? qd.msgs.Type_0_must_have_a_Symbol_asyncIterator_method_that_returns_an_async_iterator : qd.msgs.Type_0_must_have_a_Symbol_iterator_method_that_returns_an_iterator;
    errorAndMaybeSuggestAwait(errorNode, !!getAwaitedTypeOfPromise(type), message, typeToString(type));
  }
  function isIteratorResult(type: Type, kind: IterationTypeKind.Yield | IterationTypeKind.Return) {
    const doneType = getTypeOfPropertyOfType(type, 'done' as qb.__String) || falseType;
    return isTypeAssignableTo(kind === IterationTypeKind.Yield ? falseType : trueType, doneType);
  }
  function isYieldIteratorResult(type: Type) {
    return isIteratorResult(type, IterationTypeKind.Yield);
  }
  function isReturnIteratorResult(type: Type) {
    return isIteratorResult(type, IterationTypeKind.Return);
  }
  function unwrapReturnType(returnType: Type, functionFlags: FunctionFlags) {
    const isGenerator = !!(functionFlags & FunctionFlags.Generator);
    const isAsync = !!(functionFlags & FunctionFlags.Async);
    return isGenerator ? getIterationTypeOfGeneratorFunctionReturnType(IterationTypeKind.Return, returnType, isAsync) ?? errorType : isAsync ? getAwaitedType(returnType) ?? errorType : returnType;
  }
  function isUnwrappedReturnTypeVoidOrAny(func: SignatureDeclaration, returnType: Type): boolean {
    const unwrappedReturnType = unwrapReturnType(returnType, getFunctionFlags(func));
    return !!unwrappedReturnType && maybeTypeOfKind(unwrappedReturnType, qt.TypeFlags.Void | qt.TypeFlags.AnyOrUnknown);
  }
  function areTypeParametersIdentical(declarations: readonly (ClassDeclaration | InterfaceDeclaration)[], targetParameters: TypeParameter[]) {
    const maxTypeArgumentCount = length(targetParameters);
    const minTypeArgumentCount = getMinTypeArgumentCount(targetParameters);
    for (const declaration of declarations) {
      const sourceParameters = get.effectiveTypeParameterDeclarations(declaration);
      const numTypeParameters = sourceParameters.length;
      if (numTypeParameters < minTypeArgumentCount || numTypeParameters > maxTypeArgumentCount) return false;
      for (let i = 0; i < numTypeParameters; i++) {
        const source = sourceParameters[i];
        const target = targetParameters[i];
        if (source.name.escapedText !== target.symbol.escName) return false;
        const constraint = get.effectiveConstraintOfTypeParameter(source);
        const sourceConstraint = constraint && getTypeFromTypeNode(constraint);
        const targetConstraint = getConstraintOfTypeParameter(target);
        if (sourceConstraint && targetConstraint && !isTypeIdenticalTo(sourceConstraint, targetConstraint)) return false;
        const sourceDefault = source.default && getTypeFromTypeNode(source.default);
        const targetDefault = getDefaultFromTypeParameter(target);
        if (sourceDefault && targetDefault && !isTypeIdenticalTo(sourceDefault, targetDefault)) return false;
      }
    }
    return true;
  }
  function issueMemberSpecificError(node: ClassLikeDeclaration, typeWithThis: Type, baseWithThis: Type, broadDiag: qd.Message) {
    let issuedMemberError = false;
    for (const member of node.members) {
      if (has.staticModifier(member)) continue;
      const declaredProp = (member.name && getSymbolAtLocation(member.name)) || getSymbolAtLocation(member);
      if (declaredProp) {
        const prop = getPropertyOfType(typeWithThis, declaredProp.escName);
        const baseProp = getPropertyOfType(baseWithThis, declaredProp.escName);
        if (prop && baseProp) {
          const rootChain = () =>
            chainqd.Messages(
              undefined,
              qd.msgs.Property_0_in_type_1_is_not_assignable_to_the_same_property_in_base_type_2,
              declaredProp.symbolToString(),
              typeToString(typeWithThis),
              typeToString(baseWithThis)
            );
          if (!check.typeAssignableTo(getTypeOfSymbol(prop), getTypeOfSymbol(baseProp), member.name || member, undefined, rootChain)) issuedMemberError = true;
        }
      }
    }
    if (!issuedMemberError) check.typeAssignableTo(typeWithThis, baseWithThis, node.name || node, broadDiag);
  }
  function isInstancePropertyWithoutIniter(node: Node) {
    return (
      node.kind === Syntax.PropertyDeclaration &&
      !has.syntacticModifier(node, ModifierFlags.Static | ModifierFlags.Abstract) &&
      !(<PropertyDeclaration>node).exclamationToken &&
      !(<PropertyDeclaration>node).initer
    );
  }
  function isPropertyInitializedInConstructor(propName: qc.Identifier | qc.PrivateIdentifier, propType: Type, constructor: ConstructorDeclaration) {
    const reference = new qc.PropertyAccessExpression(new qc.ThisExpression(), propName);
    reference.expression.parent = reference;
    reference.parent = constructor;
    reference.flowNode = constructor.returnFlowNode;
    const flowType = getFlowTypeOfReference(reference, propType, getOptionalType(propType));
    return !(getFalsyFlags(flowType) & qt.TypeFlags.Undefined);
  }
  function computeEnumMemberValues(node: EnumDeclaration) {
    const nodeLinks = getNodeLinks(node);
    if (!(nodeLinks.flags & NodeCheckFlags.EnumValuesComputed)) {
      nodeLinks.flags |= NodeCheckFlags.EnumValuesComputed;
      let autoValue: number | undefined = 0;
      for (const member of node.members) {
        const value = computeMemberValue(member, autoValue);
        getNodeLinks(member).enumMemberValue = value;
        autoValue = typeof value === 'number' ? value + 1 : undefined;
      }
    }
  }
  function computeMemberValue(member: EnumMember, autoValue: number | undefined) {
    if (isComputedNonLiteralName(member.name)) error(member.name, qd.msgs.Computed_property_names_are_not_allowed_in_enums);
    else {
      const text = get.textOfPropertyName(member.name);
      if (NumericLiteral.name(text) && !isInfinityOrNaNString(text)) error(member.name, qd.msgs.An_enum_member_cannot_have_a_numeric_name);
    }
    if (member.initer) return computeConstantValue(member);
    if (member.parent.flags & NodeFlags.Ambient && !is.enumConst(member.parent) && getEnumKind(getSymbolOfNode(member.parent)) === EnumKind.Numeric) return;
    if (autoValue !== undefined) return autoValue;
    error(member.name, qd.msgs.Enum_member_must_have_initer);
    return;
  }
  function computeConstantValue(member: EnumMember): string | number | undefined {
    const enumKind = getEnumKind(getSymbolOfNode(member.parent));
    const isConstEnum = is.enumConst(member.parent);
    const initer = member.initer!;
    const value = enumKind === EnumKind.Literal && !isLiteralEnumMember(member) ? undefined : evaluate(initer);
    if (value !== undefined) {
      if (isConstEnum && typeof value === 'number' && !isFinite(value)) {
        error(initer, isNaN(value) ? qd.msgs.const_enum_member_initer_was_evaluated_to_disallowed_value_NaN : qd.msgs.const_enum_member_initer_was_evaluated_to_a_non_finite_value);
      }
    } else if (enumKind === EnumKind.Literal) {
      error(initer, qd.msgs.Computed_values_are_not_permitted_in_an_enum_with_string_valued_members);
      return 0;
    } else if (isConstEnum) {
      error(initer, qd.msgs.const_enum_member_initers_can_only_contain_literal_values_and_other_computed_enum_values);
    } else if (member.parent.flags & NodeFlags.Ambient) {
      error(initer, qd.msgs.In_ambient_enum_declarations_member_initer_must_be_constant_expression);
    } else {
      const source = check.expression(initer);
      if (!isTypeAssignableToKind(source, qt.TypeFlags.NumberLike)) {
        error(
          initer,
          qd.msgs.Only_numeric_enums_can_have_computed_members_but_this_expression_has_type_0_If_you_do_not_need_exhaustiveness_checks_consider_using_an_object_literal_instead,
          typeToString(source)
        );
      } else {
        check.typeAssignableTo(source, getDeclaredTypeOfSymbol(getSymbolOfNode(member.parent)), initer, undefined);
      }
    }
    return value;
    function evaluate(expr: Expression): string | number | undefined {
      switch (expr.kind) {
        case Syntax.PrefixUnaryExpression:
          const value = evaluate((<PrefixUnaryExpression>expr).operand);
          if (typeof value === 'number') {
            switch ((<PrefixUnaryExpression>expr).operator) {
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
          const left = evaluate((<BinaryExpression>expr).left);
          const right = evaluate((<BinaryExpression>expr).right);
          if (typeof left === 'number' && typeof right === 'number') {
            switch ((<BinaryExpression>expr).operatorToken.kind) {
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
          } else if (typeof left === 'string' && typeof right === 'string' && (<BinaryExpression>expr).operatorToken.kind === Syntax.PlusToken) {
            return left + right;
          }
          break;
        case Syntax.StringLiteral:
        case Syntax.NoSubstitutionLiteral:
          return (<StringLiteralLike>expr).text;
        case Syntax.NumericLiteral:
          checkGrammar.numericLiteral(<NumericLiteral>expr);
          return +(<NumericLiteral>expr).text;
        case Syntax.ParenthesizedExpression:
          return evaluate((<ParenthesizedExpression>expr).expression);
        case Syntax.Identifier:
          const identifier = <Identifier>expr;
          if (isInfinityOrNaNString(identifier.escapedText)) return +identifier.escapedText;
          return is.missing(expr) ? 0 : evaluateEnumMember(expr, getSymbolOfNode(member.parent), identifier.escapedText);
        case Syntax.ElementAccessExpression:
        case Syntax.PropertyAccessExpression:
          const ex = <AccessExpression>expr;
          if (isConstantMemberAccess(ex)) {
            const type = getTypeOfExpression(ex.expression);
            if (type.symbol && type.symbol.flags & qt.SymbolFlags.Enum) {
              let name: qb.__String;
              if (ex.kind === Syntax.PropertyAccessExpression) name = ex.name.escapedText;
              else {
                name = qy.get.escUnderscores(cast(ex.argumentExpression, isLiteralExpression).text);
              }
              return evaluateEnumMember(expr, type.symbol, name);
            }
          }
          break;
      }
      return;
    }
    function evaluateEnumMember(expr: Expression, enumSymbol: Symbol, name: qb.__String) {
      const memberSymbol = enumSymbol.exports!.get(name);
      if (memberSymbol) {
        const declaration = memberSymbol.valueDeclaration;
        if (declaration !== member) {
          if (isBlockScopedNameDeclaredBeforeUse(declaration, member)) return getEnumMemberValue(declaration as EnumMember);
          error(expr, qd.msgs.A_member_initer_in_a_enum_declaration_cannot_reference_members_declared_after_it_including_members_defined_in_other_enums);
          return 0;
        } else {
          error(expr, qd.msgs.Property_0_is_used_before_being_assigned, memberSymbol.symbolToString());
        }
      }
      return;
    }
  }
  function isConstantMemberAccess(node: Expression): boolean {
    return (
      node.kind === Syntax.Identifier ||
      (node.kind === Syntax.PropertyAccessExpression && isConstantMemberAccess((<PropertyAccessExpression>node).expression)) ||
      (node.kind === Syntax.ElementAccessExpression && isConstantMemberAccess((<ElementAccessExpression>node).expression) && StringLiteral.like((<ElementAccessExpression>node).argumentExpression))
    );
  }
  function inSameLexicalScope(node1: Node, node2: Node) {
    const container1 = get.enclosingBlockScopeContainer(node1);
    const container2 = get.enclosingBlockScopeContainer(node2);
    if (isGlobalSourceFile(container1)) return isGlobalSourceFile(container2);
    else if (isGlobalSourceFile(container2)) return false;
    return container1 === container2;
  }
  function importClauseContainsReferencedImport(importClause: ImportClause) {
    return forEachImportClauseDeclaration(importClause, (declaration) => {
      return !!getSymbolOfNode(declaration).isReferenced;
    });
  }
  function importClauseContainsConstEnumUsedAsValue(importClause: ImportClause) {
    return forEachImportClauseDeclaration(importClause, (declaration) => {
      return !!s.getLinks(getSymbolOfNode(declaration)).constEnumReferenced;
    });
  }
  function hasExportedMembers(moduleSymbol: Symbol) {
    return forEachEntry(moduleSymbol.exports!, (_, id) => id !== 'export=');
  }
  function unusedIsError(kind: UnusedKind, isAmbient: boolean): boolean {
    if (isAmbient) return false;
    switch (kind) {
      case UnusedKind.Local:
        return !!compilerOptions.noUnusedLocals;
      case UnusedKind.Parameter:
        return !!compilerOptions.noUnusedParameters;
      default:
        return Debug.assertNever(kind);
    }
  }
  function throwIfNonDiagnosticsProducing() {
    if (!produceDiagnostics) throw new Error('Trying to get diagnostics from a type checker that does not produce them.');
  }
  function isTypeReferenceIdentifier(node: EntityName): boolean {
    while (node.parent.kind === Syntax.QualifiedName) {
      node = node.parent as QualifiedName;
    }
    return node.parent.kind === Syntax.TypeReference;
  }
  function isHeritageClauseElementIdentifier(node: Node): boolean {
    while (node.parent.kind === Syntax.PropertyAccessExpression) {
      node = node.parent;
    }
    return node.parent.kind === Syntax.ExpressionWithTypeArguments;
  }
  function forEachEnclosingClass<T>(node: Node, callback: (node: Node) => T | undefined): T | undefined {
    let result: T | undefined;
    while (true) {
      node = get.containingClass(node)!;
      if (!node) break;
      if ((result = callback(node))) break;
    }
    return result;
  }
  function isNodeUsedDuringClassInitialization(node: Node) {
    return !!qc.findAncestor(node, (element) => {
      if ((is.kind(qc.ConstructorDeclaration, element) && is.present(element.body)) || is.kind(qc.PropertyDeclaration, element)) return true;
      else if (is.classLike(element) || is.functionLikeDeclaration(element)) return 'quit';
      return false;
    });
  }
  function isNodeWithinClass(node: Node, classDeclaration: ClassLikeDeclaration) {
    return !!forEachEnclosingClass(node, (n) => n === classDeclaration);
  }
  function isInRightSideOfImportOrExportAssignment(node: EntityName) {
    return getLeftSideOfImportEqualsOrExportAssignment(node) !== undefined;
  }
  function isImportTypeQualifierPart(node: EntityName): ImportTypeNode | undefined {
    let parent = node.parent;
    while (is.kind(qc.QualifiedName, parent)) {
      node = parent;
      parent = parent.parent;
    }
    if (parent && parent.kind === Syntax.ImportType && (parent as ImportTypeNode).qualifier === node) return parent as ImportTypeNode;
    return;
  }
  function typeHasCallOrConstructSignatures(type: Type): boolean {
    return type.hasCallOrConstructSignatures(checker);
  }
  function isArgumentsLocalBinding(nodeIn: Identifier): boolean {
    if (!is.generatedIdentifier(nodeIn)) {
      const node = get.parseTreeOf(nodeIn, isIdentifier);
      if (node) {
        const isPropertyName = node.parent.kind === Syntax.PropertyAccessExpression && (<PropertyAccessExpression>node.parent).name === node;
        return !isPropertyName && getReferencedValueSymbol(node) === argumentsSymbol;
      }
    }
    return false;
  }
  function moduleExportsSomeValue(moduleReferenceExpression: Expression): boolean {
    let moduleSymbol = resolveExternalModuleName(moduleReferenceExpression.parent, moduleReferenceExpression);
    if (!moduleSymbol || isShorthandAmbientModuleSymbol(moduleSymbol)) return true;
    const hasExportAssignment = hasExportAssignmentSymbol(moduleSymbol);
    moduleSymbol = resolveExternalModuleSymbol(moduleSymbol);
    const symbolLinks = s.getLinks(moduleSymbol);
    if (symbolLinks.exportsSomeValue === undefined)
      symbolLinks.exportsSomeValue = hasExportAssignment ? !!(moduleSymbol.flags & qt.SymbolFlags.Value) : forEachEntry(getExportsOfModule(moduleSymbol), isValue);
    return symbolLinks.exportsSomeValue!;
    function isValue(s: Symbol): boolean {
      s = s.resolveSymbol();
      return s && !!(s.flags & qt.SymbolFlags.Value);
    }
  }
  function isNameOfModuleOrEnumDeclaration(node: Identifier) {
    return is.moduleOrEnumDeclaration(node.parent) && node === node.parent.name;
  }
  function isDeclarationWithCollidingName(nodeIn: Declaration): boolean {
    const node = get.parseTreeOf(nodeIn, isDeclaration);
    if (node) {
      const symbol = getSymbolOfNode(node);
      if (symbol) return isSymbolOfDeclarationWithCollidingName(symbol);
    }
    return false;
  }
  function isValueAliasDeclaration(node: Node): boolean {
    switch (node.kind) {
      case Syntax.ImportEqualsDeclaration:
        return isAliasResolvedToValue(getSymbolOfNode(node) || unknownSymbol);
      case Syntax.ImportClause:
      case Syntax.NamespaceImport:
      case Syntax.ImportSpecifier:
      case Syntax.ExportSpecifier:
        const symbol = getSymbolOfNode(node) || unknownSymbol;
        return isAliasResolvedToValue(symbol) && !this.getTypeOnlyAliasDeclaration();
      case Syntax.ExportDeclaration:
        const exportClause = (<ExportDeclaration>node).exportClause;
        return !!exportClause && (is.kind(qc.NamespaceExport, exportClause) || some(exportClause.elements, isValueAliasDeclaration));
      case Syntax.ExportAssignment:
        return (<ExportAssignment>node).expression && (<ExportAssignment>node).expression.kind === Syntax.Identifier ? isAliasResolvedToValue(getSymbolOfNode(node) || unknownSymbol) : true;
    }
    return false;
  }
  function isTopLevelValueImportEqualsWithEntityName(nodeIn: ImportEqualsDeclaration): boolean {
    const node = get.parseTreeOf(nodeIn, isImportEqualsDeclaration);
    if (node === undefined || node.parent.kind !== Syntax.SourceFile || !is.internalModuleImportEqualsDeclaration(node)) return false;
    const isValue = isAliasResolvedToValue(getSymbolOfNode(node));
    return isValue && node.moduleReference && !is.missing(node.moduleReference);
  }
  function isReferencedAliasDeclaration(node: Node, checkChildren?: boolean): boolean {
    if (isAliasSymbolDeclaration(node)) {
      const symbol = getSymbolOfNode(node);
      if (symbol && s.getLinks(symbol).referenced) return true;
      const target = s.getLinks(symbol!).target;
      if (target && get.effectiveModifierFlags(node) & ModifierFlags.Export && target.flags & qt.SymbolFlags.Value && (compilerOptions.preserveConstEnums || !isConstEnumOrConstEnumOnlyModule(target)))
        return true;
    }
    if (checkChildren) return !!qc.forEach.child(node, (node) => isReferencedAliasDeclaration(node, checkChildren));
    return false;
  }
  function isImplementationOfOverload(node: SignatureDeclaration) {
    if (is.present((node as FunctionLikeDeclaration).body)) {
      if (is.kind(qc.GetAccessorDeclaration, node) || is.kind(qc.SetAccessorDeclaration, node)) return false;
      const symbol = getSymbolOfNode(node);
      const signaturesOfSymbol = getSignaturesOfSymbol(symbol);
      return signaturesOfSymbol.length > 1 || (signaturesOfSymbol.length === 1 && signaturesOfSymbol[0].declaration !== node);
    }
    return false;
  }
  function isRequiredInitializedParameter(parameter: ParameterDeclaration | DocParameterTag): boolean {
    return (
      !!strictNullChecks &&
      !isOptionalParameter(parameter) &&
      !is.kind(qc.DocParameterTag, parameter) &&
      !!parameter.initer &&
      !has.syntacticModifier(parameter, ModifierFlags.ParameterPropertyModifier)
    );
  }
  function isOptionalUninitializedParameterProperty(parameter: ParameterDeclaration) {
    return strictNullChecks && isOptionalParameter(parameter) && !parameter.initer && has.syntacticModifier(parameter, ModifierFlags.ParameterPropertyModifier);
  }
  function isExpandoFunctionDeclaration(node: Declaration): boolean {
    const declaration = get.parseTreeOf(node, isFunctionDeclaration);
    if (!declaration) return false;
    const symbol = getSymbolOfNode(declaration);
    if (!symbol || !(symbol.flags & qt.SymbolFlags.Function)) return false;
    return !!forEachEntry(this.getExportsOfSymbol(), (p) => p.flags & qt.SymbolFlags.Value && p.valueDeclaration && is.kind(qc.PropertyAccessExpression, p.valueDeclaration));
  }
  function canHaveConstantValue(node: Node): node is EnumMember | AccessExpression {
    switch (node.kind) {
      case Syntax.EnumMember:
      case Syntax.PropertyAccessExpression:
      case Syntax.ElementAccessExpression:
        return true;
    }
    return false;
  }
  function isFunctionType(type: Type): boolean {
    return !!(type.flags & qt.TypeFlags.Object) && getSignaturesOfType(type, SignatureKind.Call).length > 0;
  }
  function createTypeOfDeclaration(
    declarationIn: AccessorDeclaration | VariableLikeDeclaration | PropertyAccessExpression,
    enclosingDeclaration: Node,
    flags: NodeBuilderFlags,
    tracker: SymbolTracker,
    addUndefined?: boolean
  ) {
    const declaration = get.parseTreeOf(declarationIn, isVariableLikeOrAccessor);
    if (!declaration) return new Token(Syntax.AnyKeyword) as KeywordTypeNode;
    const symbol = getSymbolOfNode(declaration);
    let type = symbol && !(symbol.flags & (SymbolFlags.TypeLiteral | qt.SymbolFlags.Signature)) ? getWidenedLiteralType(this.getTypeOfSymbol()) : errorType;
    if (type.flags & qt.TypeFlags.UniqueESSymbol && type.symbol === symbol) flags |= NodeBuilderFlags.AllowUniqueESSymbolType;
    if (addUndefined) type = getOptionalType(type);
    return nodeBuilder.typeToTypeNode(type, enclosingDeclaration, flags | NodeBuilderFlags.MultilineObjectLiterals, tracker);
  }
  function createReturnTypeOfSignatureDeclaration(signatureDeclarationIn: SignatureDeclaration, enclosingDeclaration: Node, flags: NodeBuilderFlags, tracker: SymbolTracker) {
    const signatureDeclaration = get.parseTreeOf(signatureDeclarationIn, isFunctionLike);
    if (!signatureDeclaration) return new Token(Syntax.AnyKeyword) as KeywordTypeNode;
    const signature = getSignatureFromDeclaration(signatureDeclaration);
    return nodeBuilder.typeToTypeNode(getReturnTypeOfSignature(signature), enclosingDeclaration, flags | NodeBuilderFlags.MultilineObjectLiterals, tracker);
  }
  function createTypeOfExpression(exprIn: Expression, enclosingDeclaration: Node, flags: NodeBuilderFlags, tracker: SymbolTracker) {
    const expr = get.parseTreeOf(exprIn, isExpression);
    if (!expr) return new Token(Syntax.AnyKeyword) as KeywordTypeNode;
    const type = getWidenedType(getRegularTypeOfExpression(expr));
    return nodeBuilder.typeToTypeNode(type, enclosingDeclaration, flags | NodeBuilderFlags.MultilineObjectLiterals, tracker);
  }
  function hasGlobalName(name: string): boolean {
    return globals.has(qy.get.escUnderscores(name));
  }
  function isLiteralConstDeclaration(node: VariableDeclaration | PropertyDeclaration | PropertySignature | ParameterDeclaration): boolean {
    if (isDeclarationReadonly(node) || (is.kind(qc.VariableDeclaration, node) && is.varConst(node))) return isFreshLiteralType(getTypeOfSymbol(getSymbolOfNode(node)));
    return false;
  }
  function literalTypeToNode(type: FreshableType, enclosing: Node, tracker: SymbolTracker): Expression {
    const enumResult =
      type.flags & qt.TypeFlags.EnumLiteral
        ? nodeBuilder.symbolToExpression(type.symbol, qt.SymbolFlags.Value, enclosing, undefined, tracker)
        : type === trueType
        ? new qc.BooleanLiteral(true)
        : type === falseType && new qc.BooleanLiteral(false);
    return enumResult || qc.asLiteral((type as LiteralType).value);
  }
  function createLiteralConstValue(node: VariableDeclaration | PropertyDeclaration | PropertySignature | ParameterDeclaration, tracker: SymbolTracker) {
    const type = getTypeOfSymbol(getSymbolOfNode(node));
    return literalTypeToNode(<FreshableType>type, node, tracker);
  }
  function createResolver(): EmitResolver {
    const resolvedTypeReferenceDirectives = host.getResolvedTypeReferenceDirectives();
    let fileToDirective: qb.QMap<string>;
    if (resolvedTypeReferenceDirectives) {
      fileToDirective = new qb.QMap<string>();
      resolvedTypeReferenceDirectives.forEach((resolvedDirective, key) => {
        if (!resolvedDirective || !resolvedDirective.resolvedFileName) return;
        const file = host.getSourceFile(resolvedDirective.resolvedFileName);
        if (file) addReferencedFilesToTypeDirective(file, key);
      });
    }
    return {
      getReferencedExportContainer,
      getReferencedImportDeclaration,
      getReferencedDeclarationWithCollidingName,
      isDeclarationWithCollidingName,
      isValueAliasDeclaration: (node) => {
        node = get.parseTreeOf(node);
        return node ? isValueAliasDeclaration(node) : true;
      },
      hasGlobalName,
      isReferencedAliasDeclaration: (node, checkChildren?) => {
        node = get.parseTreeOf(node);
        return node ? isReferencedAliasDeclaration(node, checkChildren) : true;
      },
      getNodeCheckFlags: (node) => {
        node = get.parseTreeOf(node);
        return node ? getNodeCheckFlags(node) : 0;
      },
      isTopLevelValueImportEqualsWithEntityName,
      isDeclarationVisible,
      isImplementationOfOverload,
      isRequiredInitializedParameter,
      isOptionalUninitializedParameterProperty,
      isExpandoFunctionDeclaration,
      getPropertiesOfContainerFunction,
      createTypeOfDeclaration,
      createReturnTypeOfSignatureDeclaration,
      createTypeOfExpression,
      createLiteralConstValue,
      isSymbolAccessible,
      isEntityNameVisible,
      getConstantValue: (nodeIn) => {
        const node = get.parseTreeOf(nodeIn, canHaveConstantValue);
        return node ? getConstantValue(node) : undefined;
      },
      collectLinkedAliases,
      getReferencedValueDeclaration,
      getTypeReferenceSerializationKind,
      isOptionalParameter,
      moduleExportsSomeValue,
      isArgumentsLocalBinding,
      getExternalModuleFileFromDeclaration,
      getTypeReferenceDirectivesForEntityName,
      getTypeReferenceDirectivesForSymbol,
      isLiteralConstDeclaration,
      isLateBound: (nodeIn: Declaration): nodeIn is LateBoundDeclaration => {
        const node = get.parseTreeOf(nodeIn, isDeclaration);
        const symbol = node && getSymbolOfNode(node);
        return !!(symbol && this.getCheckFlags() & qt.CheckFlags.Late);
      },
      getJsxFactoryEntity,
      getAllAccessorDeclarations(accessor: AccessorDeclaration): AllAccessorDeclarations {
        accessor = get.parseTreeOf(accessor, GetAccessorDeclaration.orSetKind)!;
        const otherKind = accessor.kind === Syntax.SetAccessor ? Syntax.GetAccessor : Syntax.SetAccessor;
        const otherAccessor = getDeclarationOfKind<AccessorDeclaration>(getSymbolOfNode(accessor), otherKind);
        const firstAccessor = otherAccessor && otherAccessor.pos < accessor.pos ? otherAccessor : accessor;
        const secondAccessor = otherAccessor && otherAccessor.pos < accessor.pos ? accessor : otherAccessor;
        const setAccessor = accessor.kind === Syntax.SetAccessor ? accessor : (otherAccessor as SetAccessorDeclaration);
        const getAccessor = accessor.kind === Syntax.GetAccessor ? accessor : (otherAccessor as GetAccessorDeclaration);
        return {
          firstAccessor,
          secondAccessor,
          setAccessor,
          getAccessor,
        };
      },
      getSymbolOfExternalModuleSpecifier: (moduleName) => resolveExternalModuleNameWorker(moduleName, moduleName, undefined),
      isBindingCapturedByNode: (node, decl) => {
        const parseNode = get.parseTreeOf(node);
        const parseDecl = get.parseTreeOf(decl);
        return !!parseNode && !!parseDecl && (is.kind(qc.VariableDeclaration, parseDecl) || is.kind(qc.BindingElement, parseDecl)) && isBindingCapturedByNode(parseNode, parseDecl);
      },
      getDeclarationStatementsForSourceFile: (node, flags, tracker, bundled) => {
        const n = get.parseTreeOf(node) as SourceFile;
        assert(n && n.kind === Syntax.SourceFile, 'Non-sourcefile node passed into getDeclarationsForSourceFile');
        const sym = getSymbolOfNode(node);
        if (!sym) return !node.locals ? [] : nodeBuilder.symbolTableToDeclarationStatements(node.locals, node, flags, tracker, bundled);
        return !sym.exports ? [] : nodeBuilder.symbolTableToDeclarationStatements(sym.exports, node, flags, tracker, bundled);
      },
      isImportRequiredByAugmentation,
    };
    function isImportRequiredByAugmentation(node: ImportDeclaration) {
      const file = get.sourceFileOf(node);
      if (!file.symbol) return false;
      const importTarget = getExternalModuleFileFromDeclaration(node);
      if (!importTarget) return false;
      if (importTarget === file) return false;
      const exports = getExportsOfModule(file.symbol);
      for (const s of arrayFrom(exports.values())) {
        if (s.mergeId) {
          const merged = getMergedSymbol(s);
          for (const d of merged.declarations) {
            const declFile = get.sourceFileOf(d);
            if (declFile === importTarget) return true;
          }
        }
      }
      return false;
    }
    function isInHeritageClause(node: PropertyAccessEntityNameExpression) {
      return node.parent && node.parent.kind === Syntax.ExpressionWithTypeArguments && node.parent.parent && node.parent.parent.kind === Syntax.HeritageClause;
    }
    function getTypeReferenceDirectivesForEntityName(node: EntityNameOrEntityNameExpression): string[] | undefined {
      if (!fileToDirective) return;
      let meaning = qt.SymbolFlags.Type | qt.SymbolFlags.Namespace;
      if ((node.kind === Syntax.Identifier && isInTypeQuery(node)) || (node.kind === Syntax.PropertyAccessExpression && !isInHeritageClause(node)))
        meaning = qt.SymbolFlags.Value | qt.SymbolFlags.ExportValue;
      const symbol = resolveEntityName(node, meaning, true);
      return symbol && symbol !== unknownSymbol ? getTypeReferenceDirectivesForSymbol(symbol, meaning) : undefined;
    }
    function addReferencedFilesToTypeDirective(file: SourceFile, key: string) {
      if (fileToDirective.has(file.path)) return;
      fileToDirective.set(file.path, key);
      for (const { fileName } of file.referencedFiles) {
        const resolvedFile = resolveTripleslashReference(fileName, file.originalFileName);
        const referencedFile = host.getSourceFile(resolvedFile);
        if (referencedFile) addReferencedFilesToTypeDirective(referencedFile, key);
      }
    }
  }
  function initializeTypeChecker() {
    for (const file of host.getSourceFiles()) {
      bindSourceFile(file, compilerOptions);
    }
    amalgamatedDuplicates = new qb.QMap();
    let augmentations: (readonly (StringLiteral | Identifier)[])[] | undefined;
    for (const file of host.getSourceFiles()) {
      if (file.redirectInfo) continue;
      if (!is.externalOrCommonJsModule(file)) {
        const fileGlobalThisSymbol = file.locals!.get('globalThis' as qb.__String);
        if (fileGlobalThisSymbol) {
          for (const declaration of fileGlobalThisSymbol.declarations) {
            diagnostics.add(createDiagnosticForNode(declaration, qd.msgs.Declaration_name_conflicts_with_built_in_global_identifier_0, 'globalThis'));
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
          if (!isGlobalScopeAugmentation(augmentation.parent as ModuleDeclaration)) continue;
          mergeModuleAugmentation(augmentation);
        }
      }
    }
    globals.add(builtinGlobals, qd.msgs.Declaration_name_conflicts_with_built_in_global_identifier_0);
    s.getLinks(undefinedSymbol).type = undefinedWideningType;
    s.getLinks(argumentsSymbol).type = getGlobalType('IArguments' as qb.__String, 0, true);
    s.getLinks(unknownSymbol).type = errorType;
    s.getLinks(globalThisSymbol).type = createObjectType(ObjectFlags.Anonymous, globalThisSymbol);
    globalArrayType = getGlobalType('Array' as qb.__String, 1, true);
    globalObjectType = getGlobalType('Object' as qb.__String, 0, true);
    globalFunctionType = getGlobalType('Function' as qb.__String, 0, true);
    globalCallableFunctionType = (strictBindCallApply && getGlobalType('CallableFunction' as qb.__String, 0, true)) || globalFunctionType;
    globalNewableFunctionType = (strictBindCallApply && getGlobalType('NewableFunction' as qb.__String, 0, true)) || globalFunctionType;
    globalStringType = getGlobalType('String' as qb.__String, 0, true);
    globalNumberType = getGlobalType('Number' as qb.__String, 0, true);
    globalBooleanType = getGlobalType('Boolean' as qb.__String, 0, true);
    globalRegExpType = getGlobalType('RegExp' as qb.__String, 0, true);
    anyArrayType = createArrayType(anyType);
    autoArrayType = createArrayType(autoType);
    if (autoArrayType === emptyObjectType) autoArrayType = createAnonymousType(undefined, emptySymbols, empty, empty, undefined, undefined);
    globalReadonlyArrayType = <GenericType>getGlobalTypeOrUndefined('ReadonlyArray' as qb.__String, 1) || globalArrayType;
    anyReadonlyArrayType = globalReadonlyArrayType ? createTypeFromGenericGlobalType(globalReadonlyArrayType, [anyType]) : anyArrayType;
    globalThisType = <GenericType>getGlobalTypeOrUndefined('ThisType' as qb.__String, 1);
    if (augmentations) {
      for (const list of augmentations) {
        for (const augmentation of list) {
          if (isGlobalScopeAugmentation(augmentation.parent as ModuleDeclaration)) continue;
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
            createDiagnosticForNode(firstFile, qd.msgs.Definitions_of_the_following_identifiers_conflict_with_those_in_another_file_Colon_0, list),
            createDiagnosticForNode(secondFile, qd.msgs.Conflicts_are_in_this_file)
          )
        );
        diagnostics.add(
          addRelatedInfo(
            createDiagnosticForNode(secondFile, qd.msgs.Definitions_of_the_following_identifiers_conflict_with_those_in_another_file_Colon_0, list),
            createDiagnosticForNode(firstFile, qd.msgs.Conflicts_are_in_this_file)
          )
        );
      }
    });
    amalgamatedDuplicates = undefined;
  }
  function resolveHelpersModule(node: SourceFile, errorNode: Node) {
    if (!externalHelpersModule)
      externalHelpersModule = resolveExternalModule(node, externalHelpersModuleNameText, qd.msgs.This_syntax_requires_an_imported_helper_but_module_0_cannot_be_found, errorNode) || unknownSymbol;
    return externalHelpersModule;
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
      case Syntax.Parameter:
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
            qb.fail();
            return false;
        }
    }
  }
  function nodeHasAnyModifiersExcept(node: Node, allowedModifier: Syntax): boolean {
    return node.modifiers!.length > 1 || node.modifiers![0].kind !== allowedModifier;
  }
  function doesAccessorHaveCorrectParameterCount(accessor: AccessorDeclaration) {
    return getAccessorThisNodeKind(ParameterDeclaration, accessor) || accessor.parameters.length === (accessor.kind === Syntax.GetAccessor ? 0 : 1);
  }
  function isSimpleLiteralEnumReference(expr: Expression) {
    if (
      (is.kind(qc.PropertyAccessExpression, expr) || (is.kind(qc.ElementAccessExpression, expr) && StringLiteral.orNumberLiteralExpression(expr.argumentExpression))) &&
      is.entityNameExpression(expr.expression)
    ) {
      return !!(check.expressionCached(expr).flags & qt.TypeFlags.EnumLiteral);
    }
    return;
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
  function hasParseDiagnostics(sourceFile: SourceFile): boolean {
    return sourceFile.parseqd.msgs.length > 0;
  }
  function grammarErrorOnFirstToken(node: Node, message: qd.Message, arg0?: any, arg1?: any, arg2?: any): boolean {
    const sourceFile = get.sourceFileOf(node);
    if (!hasParseDiagnostics(sourceFile)) {
      const span = getSpanOfTokenAtPosition(sourceFile, node.pos);
      diagnostics.add(createFileDiagnostic(sourceFile, span.start, span.length, message, arg0, arg1, arg2));
      return true;
    }
    return false;
  }
  function grammarErrorAtPos(nodeForSourceFile: Node, start: number, length: number, message: qd.Message, arg0?: any, arg1?: any, arg2?: any): boolean {
    const sourceFile = get.sourceFileOf(nodeForSourceFile);
    if (!hasParseDiagnostics(sourceFile)) {
      diagnostics.add(createFileDiagnostic(sourceFile, start, length, message, arg0, arg1, arg2));
      return true;
    }
    return false;
  }
  function grammarErrorOnNode(node: Node, message: qd.Message, arg0?: any, arg1?: any, arg2?: any): boolean {
    const sourceFile = get.sourceFileOf(node);
    if (!hasParseDiagnostics(sourceFile)) {
      diagnostics.add(createDiagnosticForNode(node, message, arg0, arg1, arg2));
      return true;
    }
    return false;
  }
  function grammarErrorAfterFirstToken(node: Node, message: qd.Message, arg0?: any, arg1?: any, arg2?: any): boolean {
    const sourceFile = get.sourceFileOf(node);
    if (!hasParseDiagnostics(sourceFile)) {
      const span = getSpanOfTokenAtPosition(sourceFile, node.pos);
      diagnostics.add(createFileDiagnostic(sourceFile, textSpanEnd(span), 0, message, arg0, arg1, arg2));
      return true;
    }
    return false;
  }
  function findMatchingTypeReferenceOrTypeAliasReference(source: Type, unionTarget: UnionOrIntersectionType) {
    const sourceObjectFlags = getObjectFlags(source);
    if (sourceObjectFlags & (ObjectFlags.Reference | ObjectFlags.Anonymous) && unionTarget.flags & qt.TypeFlags.Union) {
      return find(unionTarget.types, (target) => {
        if (target.flags & qt.TypeFlags.Object) {
          const overlapObjFlags = sourceObjectFlags & getObjectFlags(target);
          if (overlapObjFlags & ObjectFlags.Reference) return (source as TypeReference).target === (target as TypeReference).target;
          if (overlapObjFlags & ObjectFlags.Anonymous) return !!(source as AnonymousType).aliasSymbol && (source as AnonymousType).aliasSymbol === (target as AnonymousType).aliasSymbol;
        }
        return false;
      });
    }
  }
  function findBestTypeForObjectLiteral(source: Type, unionTarget: UnionOrIntersectionType) {
    if (getObjectFlags(source) & ObjectFlags.ObjectLiteral && forEachType(unionTarget, isArrayLikeType)) return find(unionTarget.types, (t) => !isArrayLikeType(t));
  }
  function findBestTypeForInvokable(source: Type, unionTarget: UnionOrIntersectionType) {
    let signatureKind = SignatureKind.Call;
    const hasSignatures = getSignaturesOfType(source, signatureKind).length > 0 || ((signatureKind = SignatureKind.Construct), getSignaturesOfType(source, signatureKind).length > 0);
    if (hasSignatures) return find(unionTarget.types, (t) => getSignaturesOfType(t, signatureKind).length > 0);
  }
  function findMostOverlappyType(source: Type, unionTarget: UnionOrIntersectionType) {
    let bestMatch: Type | undefined;
    let matchingCount = 0;
    for (const target of unionTarget.types) {
      const overlap = getIntersectionType([getIndexType(source), getIndexType(target)]);
      if (overlap.flags & qt.TypeFlags.Index) {
        bestMatch = target;
        matchingCount = Infinity;
      } else if (overlap.flags & qt.TypeFlags.Union) {
        const len = length(filter((overlap as UnionType).types, isUnitType));
        if (len >= matchingCount) {
          bestMatch = target;
          matchingCount = len;
        }
      } else if (isUnitType(overlap) && 1 >= matchingCount) {
        bestMatch = target;
        matchingCount = 1;
      }
    }
    return bestMatch;
  }
  function filterPrimitivesIfContainsNonPrimitive(type: UnionType) {
    if (maybeTypeOfKind(type, qt.TypeFlags.NonPrimitive)) {
      const result = filterType(type, (t) => !(t.flags & qt.TypeFlags.Primitive));
      if (!(result.flags & qt.TypeFlags.Never)) return result;
    }
    return type;
  }
  function findMatchingDiscriminantType(source: Type, target: Type, isRelatedTo: (source: Type, target: Type) => Ternary, skipPartial?: boolean) {
    if (target.flags & qt.TypeFlags.Union && source.flags & (TypeFlags.Intersection | qt.TypeFlags.Object)) {
      const sourceProperties = getPropertiesOfType(source);
      if (sourceProperties) {
        const sourcePropertiesFiltered = findDiscriminantProperties(sourceProperties, target);
        if (sourcePropertiesFiltered) {
          return discriminateTypeByDiscriminableItems(
            <UnionType>target,
            map(sourcePropertiesFiltered, (p) => [() => getTypeOfSymbol(p), p.escName] as [() => Type, qb.__String]),
            isRelatedTo,
            undefined,
            skipPartial
          );
        }
      }
    }
    return;
  }
}
namespace JsxNames {
  export const JSX = 'JSX' as qb.__String;
  export const IntrinsicElements = 'IntrinsicElements' as qb.__String;
  export const ElementClass = 'ElementClass' as qb.__String;
  export const ElementAttributesPropertyNameContainer = 'ElementAttributesProperty' as qb.__String;
  export const ElementChildrenAttributeNameContainer = 'ElementChildrenAttribute' as qb.__String;
  export const Element = 'Element' as qb.__String;
  export const IntrinsicAttributes = 'IntrinsicAttributes' as qb.__String;
  export const IntrinsicClassAttributes = 'IntrinsicClassAttributes' as qb.__String;
  export const LibraryManagedAttributes = 'LibraryManagedAttributes' as qb.__String;
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
