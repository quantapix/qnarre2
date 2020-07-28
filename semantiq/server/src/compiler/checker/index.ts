import * as qc from '../core';
import * as qd from '../diagnostic';
import { Node, SymbolFlags, TypeFlags } from './type';
import * as qt from './type';
import * as qu from '../util';
import { ModifierFlags, Syntax } from '../syntax';
import * as qy from '../syntax';
import { newGet, Tget } from './get';
import { newHas, Thas, newIs, Tis } from './predicate';
import { newCreate, Tcreate, newInstantiate, Tinstantiate, newResolve, Tresolve } from './create';
import { newCheck, Tcheck } from './check';
export interface Tframe extends qt.Frame {
  check: Tcheck;
  create: Tcreate;
  each: qc.Neach;
  get: Tget;
  has: Thas;
  instantiate: Tinstantiate;
  is: Tis;
  resolve: Tresolve;
}
export const qf = {} as Tframe;
newCheck(qf);
newCreate(qf);
qc.newEach(qf);
newGet(qf);
newHas(qf);
newInstantiate(qf);
newIs(qf);
newResolve(qf);

const ambientModuleSymbolRegex = /^".+"$/;
const anon = '(anonymous)' as qu.__String & string;
let nextMergeId = 1;
let nextFlowId = 1;

function SymbolLinks(this: SymbolLinks) {}
function NodeLinks(this: NodeLinks) {
  this.flags = 0;
}
export function isInstantiatedModule(node: ModuleDeclaration, preserveConstEnums: boolean) {
  const moduleState = getModuleInstanceState(node);
  return moduleState === ModuleInstanceState.Instantiated || (preserveConstEnums && moduleState === ModuleInstanceState.ConstEnumOnly);
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
    getNodeLinks(): NodeLinks {
      const i = this.qf.get.nodeId();
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
  const undefinedSymbol = new Symbol(SymbolFlags.Property, 'undefined' as qu.__String);
  undefinedSymbol.declarations = [];
  const globalThisSymbol = new Symbol(SymbolFlags.Module, 'globalThis' as qu.__String, qt.CheckFlags.Readonly);
  globalThisSymbol.exports = globals;
  globalThisSymbol.declarations = [];
  globals.set(globalThisSymbol.escName, globalThisSymbol);
  const argumentsSymbol = new Symbol(SymbolFlags.Property, 'arguments' as qu.__String);
  const requireSymbol = new Symbol(SymbolFlags.Property, 'require' as qu.__String);
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
      location = qf.get.parseTreeOf(location);
      return location ? getTypeOfSymbolAtLocation(symbol, location) : errorType;
    },
    getSymbolsOfParameterPropertyDeclaration: (parameterIn, parameterName) => {
      const parameter = qf.get.parseTreeOf(parameterIn, isParameter);
      if (parameter === undefined) return qu.fail('Cannot get symbols of a synthetic parameter that cannot be resolved to a parse-tree node.');
      return getSymbolsOfParameterPropertyDeclaration(parameter, qy.get.escUnderscores(parameterName));
    },
    getDeclaredTypeOfSymbol,
    getPropertiesOfType,
    getPropertyOfType: (type, name) => getPropertyOfType(type, qy.get.escUnderscores(name)),
    getPrivateIdentifierPropertyOfType: (leftType: Type, name: string, location: Node) => {
      const node = qf.get.parseTreeOf(location);
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
      const node = qf.get.parseTreeOf(nodeIn, isTypeNode);
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
      location = qf.get.parseTreeOf(location);
      return location ? getSymbolsInScope(location, meaning) : [];
    },
    getSymbolAtLocation: (node) => {
      node = qf.get.parseTreeOf(node);
      return node ? getSymbolAtLocation(node, true) : undefined;
    },
    getShorthandAssignmentValueSymbol: (node) => {
      node = qf.get.parseTreeOf(node);
      return node ? getShorthandAssignmentValueSymbol(node) : undefined;
    },
    getExportSpecifierLocalTargetSymbol: (nodeIn) => {
      const node = qf.get.parseTreeOf(nodeIn, isExportSpecifier);
      return node ? getExportSpecifierLocalTargetSymbol(node) : undefined;
    },
    getExportSymbolOfSymbol(symbol) {
      return getMergedSymbol(symbol.exportSymbol || symbol);
    },
    getTypeAtLocation: (node) => {
      node = qf.get.parseTreeOf(node);
      return node ? getTypeOfNode(node) : errorType;
    },
    getTypeOfAssignmentPattern: (nodeIn) => {
      const node = qf.get.parseTreeOf(nodeIn, isAssignmentPattern);
      return (node && getTypeOfAssignmentPattern(node)) || errorType;
    },
    getPropertySymbolOfDestructuringAssignment: (locationIn) => {
      const location = qf.get.parseTreeOf(locationIn, isIdentifier);
      return location ? getPropertySymbolOfDestructuringAssignment(location) : undefined;
    },
    signatureToString: (signature, enclosingDeclaration, flags, kind) => {
      return signatureToString(signature, qf.get.parseTreeOf(enclosingDeclaration), flags, kind);
    },
    typeToString: (type, enclosingDeclaration, flags) => {
      return typeToString(type, qf.get.parseTreeOf(enclosingDeclaration), flags);
    },
    symbolToString: (symbol, enclosingDeclaration, meaning, flags) => {
      return symbol.symbolToString(qf.get.parseTreeOf(enclosingDeclaration), meaning, flags);
    },
    typePredicateToString: (predicate, enclosingDeclaration, flags) => {
      return typePredicateToString(predicate, qf.get.parseTreeOf(enclosingDeclaration), flags);
    },
    writeSignature: (signature, enclosingDeclaration, flags, kind, writer) => {
      return signatureToString(signature, qf.get.parseTreeOf(enclosingDeclaration), flags, kind, writer);
    },
    writeType: (type, enclosingDeclaration, flags, writer) => {
      return typeToString(type, qf.get.parseTreeOf(enclosingDeclaration), flags, writer);
    },
    writeSymbol: (symbol, enclosingDeclaration, meaning, flags, writer) => {
      return symbol.symbolToString(qf.get.parseTreeOf(enclosingDeclaration), meaning, flags, writer);
    },
    writeTypePredicate: (predicate, enclosingDeclaration, flags, writer) => {
      return typePredicateToString(predicate, qf.get.parseTreeOf(enclosingDeclaration), flags, writer);
    },
    getAugmentedPropertiesOfType,
    getRootSymbols,
    getContextualType: (nodeIn: Expression, contextFlags?: ContextFlags) => {
      const node = qf.get.parseTreeOf(nodeIn, isExpression);
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
      const node = qf.get.parseTreeOf(nodeIn, isObjectLiteralElementLike);
      return node ? getContextualTypeForObjectLiteralElement(node) : undefined;
    },
    getContextualTypeForArgumentAtIndex: (nodeIn, argIndex) => {
      const node = qf.get.parseTreeOf(nodeIn, isCallLikeExpression);
      return node && getContextualTypeForArgumentAtIndex(node, argIndex);
    },
    getContextualTypeForJsxAttribute: (nodeIn) => {
      const node = qf.get.parseTreeOf(nodeIn, isJsxAttributeLike);
      return node && getContextualTypeForJsxAttribute(node);
    },
    isContextSensitive,
    getFullyQualifiedName,
    getResolvedSignature: (node, candidatesOutArray, argumentCount) => getResolvedSignatureWorker(node, candidatesOutArray, argumentCount, CheckMode.Normal),
    getResolvedSignatureForSignatureHelp: (node, candidatesOutArray, argumentCount) => getResolvedSignatureWorker(node, candidatesOutArray, argumentCount, CheckMode.IsForSignatureHelp),
    getExpandedParameters,
    hasEffectiveRestParameter,
    getConstantValue: (nodeIn) => {
      const node = qf.get.parseTreeOf(nodeIn, canHaveConstantValue);
      return node ? getConstantValue(node) : undefined;
    },
    isValidPropertyAccess: (nodeIn, propertyName) => {
      const node = qf.get.parseTreeOf(nodeIn, isPropertyAccessOrQualifiedNameOrImportTypeNode);
      return !!node && isValidPropertyAccess(node, qy.get.escUnderscores(propertyName));
    },
    isValidPropertyAccessForCompletions: (nodeIn, type, property) => {
      const node = qf.get.parseTreeOf(nodeIn, isPropertyAccessExpression);
      return !!node && isValidPropertyAccessForCompletions(node, type, property);
    },
    getSignatureFromDeclaration: (declarationIn) => {
      const declaration = qf.get.parseTreeOf(declarationIn, isFunctionLike);
      return declaration ? getSignatureFromDeclaration(declaration) : undefined;
    },
    isImplementationOfOverload: (node) => {
      const parsed = qf.get.parseTreeOf(node, isFunctionLike);
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
      qf.get.firstIdentifier,
      getTypeArguments
    ),
    getAmbientModules,
    getJsxIntrinsicTagNamesAt,
    isOptionalParameter: (nodeIn) => {
      const node = qf.get.parseTreeOf(nodeIn, isParameter);
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
      node = qf.get.parseTreeOf(node);
      return node && tryGetThisTypeAt(node, includeGlobalThis);
    },
    getTypeArgumentConstraint: (nodeIn) => {
      const node = qf.get.parseTreeOf(nodeIn, isTypeNode);
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
  const tupleTypes = new qu.QMap<GenericType>();
  const unionTypes = new qu.QMap<UnionType>();
  const intersectionTypes = new qu.QMap<Type>();
  const literalTypes = new qu.QMap<LiteralType>();
  const indexedAccessTypes = new qu.QMap<IndexedAccessType>();
  const substitutionTypes = new qu.QMap<SubstitutionType>();
  const evolvingArrayTypes: EvolvingArrayType[] = [];
  const undefinedProperties = new qu.QMap<Symbol>() as EscapedMap<Symbol>;
  const unknownSymbol = new Symbol(SymbolFlags.Property, 'unknown' as qu.__String);
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
  emptyGenericType.instantiations = new qu.QMap<TypeReference>();
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
  const iterationTypesCache = new qu.QMap<IterationTypes>();
  const noIterationTypes: IterationTypes = {
    get yieldType(): Type {
      return qu.fail('Not supported');
    },
    get returnType(): Type {
      return qu.fail('Not supported');
    },
    get nextType(): Type {
      return qu.fail('Not supported');
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
    readonly conflictingSymbols: qu.QMap<DuplicateInfoForSymbol>;
  }
  let amalgamatedDuplicates: qu.QMap<DuplicateInfoForFiles> | undefined;
  const reverseMappedCache = new qu.QMap<Type | undefined>();
  let inInferTypeForHomomorphicMappedType = false;
  let ambientModulesCache: Symbol[] | undefined;
  let patternAmbientModules: PatternAmbientModule[];
  let patternAmbientModuleAugmentations: qu.QMap<Symbol> | undefined;
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
  const allPotentiallyUnusedIdentifiers = new qu.QMap<PotentiallyUnusedIdentifier[]>();
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
  const flowLoopCaches: qu.QMap<Type>[] = [];
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
  const typeofTypesByName: qu.QReadonlyMap<Type> = new qu.QMap<Type>({
    string: stringType,
    number: numberType,
    bigint: bigintType,
    boolean: booleanType,
    symbol: esSymbolType,
    undefined: undefinedType,
  });
  const typeofType = createTypeofType();
  let _jsxNamespace: qu.__String;
  let _jsxFactoryEntity: EntityName | undefined;
  let outofbandVarianceMarkerHandler: ((onlyUnreliable: boolean) => void) | undefined;
  const subtypeRelation = new qu.QMap<RelationComparisonResult>();
  const strictSubtypeRelation = new qu.QMap<RelationComparisonResult>();
  const assignableRelation = new qu.QMap<RelationComparisonResult>();
  const comparableRelation = new qu.QMap<RelationComparisonResult>();
  const identityRelation = new qu.QMap<RelationComparisonResult>();
  const enumRelation = new qu.QMap<RelationComparisonResult>();
  const builtinGlobals = new SymbolTable();
  builtinGlobals.set(undefinedSymbol.escName, undefinedSymbol);
  initializeTypeChecker();
  return checker;
  function lookupOrIssueError(location: Node | undefined, message: qd.Message, arg0?: string | number, arg1?: string | number, arg2?: string | number, arg3?: string | number): qd.Diagnostic {
    const diagnostic = location ? qf.create.diagnosticForNode(location, message, arg0, arg1, arg2, arg3) : createCompilerDiagnostic(message, arg0, arg1, arg2, arg3);
    const existing = diagnostics.lookup(diagnostic);
    if (existing) return existing;
    else {
      diagnostics.add(diagnostic);
      return diagnostic;
    }
  }
  function error(location: Node | undefined, message: qd.Message, arg0?: string | number, arg1?: string | number, arg2?: string | number, arg3?: string | number): qd.Diagnostic {
    const diagnostic = location ? qf.create.diagnosticForNode(location, message, arg0, arg1, arg2, arg3) : createCompilerDiagnostic(message, arg0, arg1, arg2, arg3);
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
    addErrorOrSuggestion(isError, 'message' in message ? qf.create.diagnosticForNode(location, message, arg0, arg1, arg2, arg3) : qf.create.diagnosticForNodeFromMessageChain(location, message));
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
      const related = qf.create.diagnosticForNode(location, qd.msgs.Did_you_forget_to_use_await);
      addRelatedInfo(diagnostic, related);
    }
    return diagnostic;
  }
  function addDuplicateDeclarationError(node: Declaration, message: qd.Message, symbolName: string, relatedNodes: readonly Declaration[] | undefined) {
    const errorNode = (qf.get.expandoIniter(node, false) ? qf.get.declaration.nameOfExpando(node) : qf.get.declaration.nameOf(node)) || node;
    const err = lookupOrIssueError(errorNode, message, symbolName);
    for (const relatedNode of relatedNodes || empty) {
      const adjustedNode = (qf.get.expandoIniter(relatedNode, false) ? qf.get.declaration.nameOfExpando(relatedNode) : qf.get.declaration.nameOf(relatedNode)) || relatedNode;
      if (adjustedNode === errorNode) continue;
      err.relatedInformation = err.relatedInformation || [];
      const leadingMessage = qf.create.diagnosticForNode(adjustedNode, qd.msgs._0_was_also_declared_here, symbolName);
      const followOnMessage = qf.create.diagnosticForNode(adjustedNode, qd.msgs.and_here);
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
  function useOuterVariableScopeInParameter(result: Symbol, location: Node, lastLocation: Node) {
    const target = getEmitScriptTarget(compilerOptions);
    const functionLocation = <FunctionLikeDeclaration>location;
    if (
      qf.is.kind(qc.ParameterDeclaration, lastLocation) &&
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
          if (qf.has.staticModifier(node)) return target < ScriptTarget.ESNext || !compilerOptions.useDefineForClassFields;
          return requiresScopeChangeWorker((node as PropertyDeclaration).name);
        default:
          if (qf.is.nullishCoalesce(node) || qf.is.optionalChain(node)) return false;
          if (qf.is.kind(qc.BindingElement, node) && node.dot3Token && qf.is.kind(qc.ObjectBindingPattern, node.parent)) return false;
          if (qf.is.typeNode(node)) return false;
          return qf.each.child(node, requiresScopeChangeWorker) || false;
      }
    }
  }
  function diagnosticName(nameArg: qu.__String | qc.Identifier | qc.PrivateIdentifier) {
    return isString(nameArg) ? qy.get.unescUnderscores(nameArg as qu.__String) : declarationNameToString(nameArg as Identifier);
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
          (decl) => !!(qf.is.kind(qc.ExportDeclaration, decl) && decl.moduleSpecifier && resolveExternalModuleName(decl, decl.moduleSpecifier)?.exports?.has(InternalSymbol.Default))
        );
        if (defaultExport) addRelatedInfo(diagnostic, qf.create.diagnosticForNode(defaultExport, qd.msgs.export_Asterisk_does_not_re_export_a_default));
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
        addRelatedInfo(diagnostic, ...map(localSymbol.declarations, (decl, index) => qf.create.diagnosticForNode(decl, index === 0 ? qd.msgs._0_is_declared_here : qd.msgs.and_here, declarationName)));
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
      if (qf.is.inJSFile(node)) {
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
    if (qf.is.typeOnlyImportOrExportDeclaration(aliasDeclaration)) {
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
  function errorOnImplicitAnyModule(isError: boolean, errorNode: Node, { packageId, resolvedFileName }: ResolvedModuleFull, moduleReference: string): void {
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
  function tryGetMemberInModuleExports(memberName: qu.__String, moduleSymbol: Symbol): Symbol | undefined {
    const symbolTable = getExportsOfModule(moduleSymbol);
    if (symbolTable) return symbolTable.get(memberName);
  }
  function tryGetMemberInModuleExportsAndProperties(memberName: qu.__String, moduleSymbol: Symbol): Symbol | undefined {
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
            specifierText: qf.get.textOf(exportNode.moduleSpecifier!),
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
      if (member.kind === Syntax.Constructor && qf.is.present((<ConstructorDeclaration>member).body)) return <ConstructorDeclaration>member;
    }
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
      const sourceFile = enclosingDeclaration && enclosingDeclaration.sourceFile;
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
    if (typeNode === undefined) return qu.fail('should always get typenode');
    const options = { removeComments: true };
    const printer = createPrinter(options);
    const sourceFile = enclosingDeclaration && enclosingDeclaration.sourceFile;
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
      const sourceFile = enclosingDeclaration && enclosingDeclaration.sourceFile;
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
  function collectLinkedAliases(node: Identifier, setVisibility?: boolean): Node[] | undefined {
    let exportSymbol: Symbol | undefined;
    if (node.parent && node.parent.kind === Syntax.ExportAssignment)
      exportSymbol = resolveName(node, node.escapedText, qt.SymbolFlags.Value | qt.SymbolFlags.Type | qt.SymbolFlags.Namespace | qt.SymbolFlags.Alias, undefined, node, false);
    else if (node.parent.kind === Syntax.ExportSpecifier) {
      exportSymbol = getTargetOfExportSpecifier(<ExportSpecifier>node.parent, qt.SymbolFlags.Value | qt.SymbolFlags.Type | qt.SymbolFlags.Namespace | qt.SymbolFlags.Alias);
    }
    let result: Node[] | undefined;
    let visited: qu.QMap<true> | undefined;
    if (exportSymbol) {
      visited = new qu.QMap();
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
        if (qf.is.internalModuleImportEqualsDeclaration(declaration)) {
          const internalModuleReference = <Identifier | QualifiedName>declaration.moduleReference;
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
  function addOptionality(type: Type, optional = true): Type {
    return strictNullChecks && optional ? getOptionalType(type) : type;
  }
  function widenTypeForVariableLikeDeclaration(type: Type | undefined, declaration: any, reportErrors?: boolean) {
    if (type) {
      if (reportErrors) reportErrorsFromWidening(declaration, type);
      if (type.flags & qt.TypeFlags.UniqueESSymbol && (qf.is.kind(qc.BindingElement, declaration) || !declaration.type) && type.symbol !== getSymbolOfNode(declaration)) type = esSymbolType;
      return getWidenedType(type);
    }
    type = qf.is.kind(qc.ParameterDeclaration, declaration) && declaration.dot3Token ? anyArrayType : anyType;
    if (reportErrors) {
      if (!declarationBelongsToPrivateAmbientMember(declaration)) reportImplicitAny(declaration, type);
    }
    return type;
  }
  function declarationBelongsToPrivateAmbientMember(declaration: VariableLikeDeclaration) {
    const root = qf.get.rootDeclaration(declaration);
    const memberDeclaration = root.kind === Syntax.Parameter ? root.parent : root;
    return isPrivateWithinAmbient(memberDeclaration);
  }
  function tryGetTypeFromEffectiveTypeNode(declaration: Declaration) {
    const typeNode = qf.get.effectiveTypeAnnotationNode(declaration);
    if (typeNode) return getTypeFromTypeNode(typeNode);
  }
  function appendTypeParameters(typeParameters: TypeParameter[] | undefined, declarations: readonly TypeParameterDeclaration[]): TypeParameter[] | undefined {
    for (const declaration of declarations) {
      typeParameters = appendIfUnique(typeParameters, getDeclaredTypeOfTypeParameter(getSymbolOfNode(declaration)));
    }
    return typeParameters;
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
  function addInheritedMembers(symbols: SymbolTable, baseSymbols: Symbol[]) {
    for (const s of baseSymbols) {
      if (!symbols.has(s.escName) && !isStaticPrivateIdentifierProperty(s)) symbols.set(s.escName, s);
    }
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
  function lateBindMember(parent: Symbol, earlySymbols: SymbolTable | undefined, lateSymbols: EscapedMap<TransientSymbol>, decl: LateBoundDeclaration | LateBoundBinaryExpressionDeclaration) {
    assert(!!decl.symbol, 'The member is expected to have a symbol.');
    const ls = getNodeLinks(decl);
    if (!ls.resolvedSymbol) {
      ls.resolvedSymbol = decl.symbol;
      const declName = qf.is.kind(qc.BinaryExpression, decl) ? decl.left : decl.name;
      const type = qf.is.kind(qc.ElementAccessExpression, declName) ? check.expressionCached(declName.argumentExpression) : check.computedPropertyName(declName);
      if (isTypeUsableAsPropertyName(type)) {
        const memberName = getPropertyNameFromType(type);
        const symbolFlags = decl.symbol.flags;
        let lateSymbol = lateSymbols.get(memberName);
        if (!lateSymbol) lateSymbols.set(memberName, (lateSymbol = new Symbol(SymbolFlags.None, memberName, qt.CheckFlags.Late)));
        const earlySymbol = earlySymbols && earlySymbols.get(memberName);
        if (lateSymbol.flags & getExcludedSymbolFlags(symbolFlags) || earlySymbol) {
          const declarations = earlySymbol ? concatenate(earlySymbol.declarations, lateSymbol.declarations) : lateSymbol.declarations;
          const name = (!(type.flags & qt.TypeFlags.UniqueESSymbol) && qy.get.unescUnderscores(memberName)) || declarationNameToString(declName);
          forEach(declarations, (declaration) => error(qf.get.declaration.nameOf(declaration) || declaration, qd.msgs.Property_0_was_also_declared_here, name));
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
  function cloneSignature(sig: Signature): Signature {
    const result = createSignature(sig.declaration, sig.typeParameters, sig.thisParameter, sig.parameters, undefined, undefined, sig.minArgumentCount, sig.flags & SignatureFlags.PropagatingFlags);
    result.target = sig.target;
    result.mapper = sig.mapper;
    result.unionSignatures = sig.unionSignatures;
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
      const paramSymbol = new Symbol(SymbolFlags.FunctionScopedVariable | (isOptional && !isRestParam ? qt.SymbolFlags.Optional : 0), paramName || (`arg${i}` as qu.__String));
      paramSymbol.type = isRestParam ? createArrayType(unionParamType) : unionParamType;
      params[i] = paramSymbol;
    }
    if (needsExtraRestElement) {
      const restParamSymbol = new Symbol(SymbolFlags.FunctionScopedVariable, 'args' as qu.__String);
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
  function appendSignatures(signatures: Signature[] | undefined, newSignatures: readonly Signature[]) {
    for (const sig of newSignatures) {
      if (!signatures || every(signatures, (s) => !compareSignaturesIdentical(s, sig, false, compareTypesIdentical))) signatures = append(signatures, sig);
    }
    return signatures;
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
  function tryFindAmbientModule(moduleName: string, withAugmentations: boolean) {
    if (isExternalModuleNameRelative(moduleName)) return;
    const symbol = getSymbol(globals, ('"' + moduleName + '"') as qu.__String, qt.SymbolFlags.ValueModule);
    return symbol && withAugmentations ? getMergedSymbol(symbol) : symbol;
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
    if (qf.is.kind(qc.DocSignature, declaration) || !containsArgumentsReference(declaration)) return false;
    const lastParam = lastOrUndefined(declaration.parameters);
    const lastParamTags = lastParam ? qc.getDoc.parameterTags(lastParam) : qc.getDoc.tags(declaration).filter(isDocParameterTag);
    const lastParamVariadicType = firstDefined(lastParamTags, (p) => (p.typeExpression && qf.is.kind(qc.DocVariadicType, p.typeExpression.type) ? p.typeExpression.type : undefined));
    const syntheticArgsSymbol = new Symbol(SymbolFlags.Variable, 'args' as qu.__String, qt.CheckFlags.RestParameter);
    syntheticArgsSymbol.type = lastParamVariadicType ? createArrayType(getTypeFromTypeNode(lastParamVariadicType.type)) : anyArrayType;
    if (lastParamVariadicType) parameters.pop();
    parameters.push(syntheticArgsSymbol);
    return true;
  }
  function tryGetRestTypeOfSignature(signature: Signature): Type | undefined {
    if (signatureHasRestParameter(signature)) {
      const sigRestType = getTypeOfSymbol(signature.parameters[signature.parameters.length - 1]);
      const restType = isTupleType(sigRestType) ? getRestTypeOfTupleType(sigRestType) : sigRestType;
      return restType && getIndexTypeOfType(restType, IndexKind.Number);
    }
    return;
  }
  function cloneTypeReference(source: TypeReference): TypeReference {
    const type = <TypeReference>createType(source.flags);
    type.symbol = source.symbol;
    type.objectFlags = source.objectFlags;
    type.target = source.target;
    type.resolvedTypeArguments = source.resolvedTypeArguments;
    return type;
  }
  function typeArgumentsFromTypeReferenceNode(node: NodeWithTypeArguments): Type[] | undefined {
    return map(node.typeArguments, getTypeFromTypeNode);
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
  function addTypeToIntersection(typeSet: qu.QMap<Type>, includes: qt.TypeFlags, type: Type) {
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
  function addTypesToIntersection(typeSet: qu.QMap<Type>, includes: qt.TypeFlags, types: readonly Type[]) {
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
  function substituteIndexedMappedType(objectType: MappedType, index: Type) {
    const mapper = createTypeMapper([getTypeParameterFromMappedType(objectType)], [index]);
    const templateMapper = combineTypeMappers(objectType.mapper, mapper);
    return instantiateType(getTemplateTypeFromMappedType(objectType), templateMapper);
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
  function maybeTypeParameterReference(node: Node) {
    return !(
      node.kind === Syntax.QualifiedName ||
      (node.parent.kind === Syntax.TypeReference && (<TypeReferenceNode>node.parent).typeArguments && node === (<TypeReferenceNode>node.parent).typeName) ||
      (node.parent.kind === Syntax.ImportType && (node.parent as ImportTypeNode).typeArguments && node === (node.parent as ImportTypeNode).qualifier)
    );
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
  function areTypesComparable(type1: Type, type2: Type): boolean {
    return isTypeComparableTo(type1, type2) || isTypeComparableTo(type2, type1);
  }
  function elaborateError(
    node: Expression | undefined,
    source: Type,
    target: Type,
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
    relation: qu.QMap<RelationComparisonResult>,
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
        addRelatedInfo(
          diagnostic,
          qf.create.diagnosticForNode(node, signatures === constructSignatures ? qd.msgs.Did_you_mean_to_use_new_with_this_expression : qd.msgs.Did_you_mean_to_call_this_expression)
        );
        return true;
      }
    }
    return false;
  }
  function elaborateArrowFunction(
    node: ArrowFunction,
    source: Type,
    target: Type,
    relation: qu.QMap<RelationComparisonResult>,
    containingMessageChain: (() => qd.MessageChain | undefined) | undefined,
    errorOutputContainer: { errors?: qd.Diagnostic[]; skipLogging?: boolean } | undefined
  ): boolean {
    if (qf.is.kind(qc.Block, node.body)) return false;
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
          addRelatedInfo(
            resultObj.errors[resultObj.errors.length - 1],
            qf.create.diagnosticForNode(target.symbol.declarations[0], qd.msgs.The_expected_type_comes_from_the_return_type_of_this_signature)
          );
        }
        if (
          (qf.get.functionFlags(node) & FunctionFlags.Async) === 0 &&
          !getTypeOfPropertyOfType(sourceReturn, 'then' as qu.__String) &&
          check.typeRelatedTo(createPromiseType(sourceReturn), targetReturn, relation, undefined)
        ) {
          addRelatedInfo(resultObj.errors[resultObj.errors.length - 1], qf.create.diagnosticForNode(node, qd.msgs.Did_you_mean_to_mark_this_function_as_async));
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
    relation: qu.QMap<RelationComparisonResult>,
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
              const indexInfo =
                (isTypeAssignableToKind(nameType, qt.TypeFlags.NumberLike) && getIndexInfoOfType(target, IndexKind.Number)) || getIndexInfoOfType(target, IndexKind.String) || undefined;
              if (indexInfo && indexInfo.declaration && !indexInfo.declaration.sourceFile.hasNoDefaultLib) {
                issuedElaboration = true;
                addRelatedInfo(reportedDiag, qf.create.diagnosticForNode(indexInfo.declaration, qd.msgs.The_expected_type_comes_from_this_index_signature));
              }
            }
            if (!issuedElaboration && ((targetProp && length(targetProp.declarations)) || (target.symbol && length(target.symbol.declarations)))) {
              const targetNode = targetProp && length(targetProp.declarations) ? targetProp.declarations[0] : target.symbol.declarations[0];
              if (!targetNode.sourceFile.hasNoDefaultLib) {
                addRelatedInfo(
                  reportedDiag,
                  qf.create.diagnosticForNode(
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
      if (qf.is.kind(qc.JsxSpreadAttribute, prop)) continue;
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
    relation: qu.QMap<RelationComparisonResult>,
    containingMessageChain: (() => qd.MessageChain | undefined) | undefined,
    errorOutputContainer: { errors?: qd.Diagnostic[]; skipLogging?: boolean } | undefined
  ) {
    let result = elaborateElementwise(generateJsxAttributes(node), source, target, relation, containingMessageChain, errorOutputContainer);
    let invalidTextDiagnostic: qd.Message | undefined;
    if (qf.is.kind(qc.JsxOpeningElement, node.parent) && qf.is.kind(qc.JsxElement, node.parent.parent)) {
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
        const tagNameText = qf.get.textOf(node.parent.tagName);
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
      if (isTupleLikeType(target) && !getPropertyOfType(target, ('' + i) as qu.__String)) continue;
      const elem = node.elements[i];
      if (qf.is.kind(qc.OmittedExpression, elem)) continue;
      const nameType = getLiteralType(i);
      yield { errorNode: elem, innerExpression: elem, nameType };
    }
  }
  function elaborateArrayLiteral(
    node: ArrayLiteralExpression,
    source: Type,
    target: Type,
    relation: qu.QMap<RelationComparisonResult>,
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
      if (qf.is.kind(qc.SpreadAssignment, prop)) continue;
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
            errorMessage: qf.is.computedNonLiteralName(prop.name) ? qd.msgs.Type_of_computed_property_s_value_is_0_which_is_not_assignable_to_type_1 : undefined,
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
    relation: qu.QMap<RelationComparisonResult>,
    containingMessageChain: (() => qd.MessageChain | undefined) | undefined,
    errorOutputContainer: { errors?: qd.Diagnostic[]; skipLogging?: boolean } | undefined
  ) {
    if (target.flags & qt.TypeFlags.Primitive) return false;
    return elaborateElementwise(generateObjectLiteralElements(node), source, target, relation, containingMessageChain, errorOutputContainer);
  }
  type ErrorReporter = (message: qd.Message, arg0?: string, arg1?: string) => void;
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
    discriminators: [() => Type, qu.__String][],
    related: (source: Type, target: Type) => boolean | Ternary,
    defaultValue?: undefined,
    skipPartial?: boolean
  ): Type | undefined;
  function discriminateTypeByDiscriminableItems(
    target: UnionType,
    discriminators: [() => Type, qu.__String][],
    related: (source: Type, target: Type) => boolean | Ternary,
    defaultValue: Type,
    skipPartial?: boolean
  ): Type;
  function discriminateTypeByDiscriminableItems(
    target: UnionType,
    discriminators: [() => Type, qu.__String][],
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
  function removeDefinitelyFalsyTypes(type: Type): Type {
    return getFalsyFlags(type) & qt.TypeFlags.DefinitelyFalsy ? filterType(type, (t) => !(getFalsyFlags(t) & qt.TypeFlags.DefinitelyFalsy)) : type;
  }
  function extractDefinitelyFalsyTypes(type: Type): Type {
    return mapType(type, getDefinitelyFalsyPartOfType);
  }
  function addOptionalTypeMarker(type: Type) {
    return strictNullChecks ? getUnionType([type, optionalType]) : type;
  }
  function removeOptionalTypeMarker(type: Type): Type {
    return strictNullChecks ? filterType(type, isNotOptionalTypeMarker) : type;
  }
  function propagateOptionalTypeMarker(type: Type, node: OptionalChain, wasOptional: boolean) {
    return wasOptional ? (qf.is.outermostOptionalChain(node) ? getOptionalType(type) : addOptionalTypeMarker(type)) : type;
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
    if (qf.is.inJSFile(declaration) && !isCheckJsEnabledForFile(declaration.sourceFile, compilerOptions)) return;
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
          qf.is.kind(qc.Identifier, param.name) &&
          (qf.is.kind(qc.CallSignatureDeclaration, param.parent) || qf.is.kind(qc.MethodSignature, param.parent) || qf.is.kind(qc.FunctionTypeNode, param.parent)) &&
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
    errorOrSuggestion(noImplicitAny, declaration, diagnostic, declarationNameToString(qf.get.declaration.nameOf(declaration)), typeAsString);
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
  function cloneInferenceContext<T extends InferenceContext | undefined>(context: T, extraFlags: InferenceFlags = 0): InferenceContext | (T & undefined) {
    return context && createInferenceContextWorker(map(context.inferences, cloneInferenceInfo), context.signature, context.flags | extraFlags, context.compareTypes);
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
      (type.flags & qt.TypeFlags.UnionOrIntersection &&
        !(type.flags & qt.TypeFlags.EnumLiteral) &&
        !isNonGenericTopLevelType(type) &&
        some((<UnionOrIntersectionType>type).types, couldContainTypeVariables))
    );
    if (type.flags & qt.TypeFlags.ObjectFlagsType) (<ObjectFlagsType>type).objectFlags |= ObjectFlags.CouldContainTypeVariablesComputed | (result ? ObjectFlags.CouldContainTypeVariables : 0);
    return result;
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
  function inferTypes(inferences: InferenceInfo[], originalSource: Type, originalTarget: Type, priority: InferencePriority = 0, contravariant = false) {
    let symbolOrTypeStack: (Symbol | Type)[];
    let visited: qu.QMap<number>;
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
          const [sources, targets] = inferFromMatchingTypes(
            source.flags & qt.TypeFlags.Intersection ? (<IntersectionType>source).types : [source],
            (<IntersectionType>target).types,
            isTypeIdenticalTo
          );
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
      (visited || (visited = new qu.QMap<number>())).set(key, InferencePriority.Circularity);
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
  function optionalChainContainsReference(source: Node, target: Node) {
    while (qf.is.optionalChain(source)) {
      source = source.expression;
      if (isMatchingReference(source, target)) return true;
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
  function typeMaybeAssignableTo(source: Type, target: Type) {
    if (!(source.flags & qt.TypeFlags.Union)) return isTypeAssignableTo(source, target);
    for (const t of (<UnionType>source).types) {
      if (isTypeAssignableTo(t, target)) return true;
    }
    return false;
  }
  function eachTypeContainedIn(source: Type, types: Type[]) {
    return source.flags & qt.TypeFlags.Union ? !forEach((<UnionType>source).types, (t) => !contains(types, t)) : contains(types, source);
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
  function addEvolvingArrayElementType(evolvingArrayType: EvolvingArrayType, node: Expression): EvolvingArrayType {
    const elementType = getBaseTypeOfLiteralType(getContextFreeTypeOfExpression(node));
    return isTypeSubsetOf(elementType, evolvingArrayType.elementType) ? evolvingArrayType : getEvolvingArrayType(getUnionType([evolvingArrayType.elementType, elementType]));
  }
  function finalizeEvolvingArrayType(type: Type): Type {
    return getObjectFlags(type) & ObjectFlags.EvolvingArray ? getFinalArrayType(<EvolvingArrayType>type) : type;
  }
  function reportFlowControlError(node: Node) {
    const block = <Block | ModuleBlock | SourceFile>qc.findAncestor(node, isFunctionOrModuleBlock);
    const sourceFile = node.sourceFile;
    const span = getSpanOfTokenAtPosition(sourceFile, block.statements.pos);
    diagnostics.add(qf.create.fileDiagnostic(sourceFile, span.start, span.length, qd.msgs.The_containing_function_or_module_body_is_too_large_for_control_flow_analysis));
  }
  function markParameterAssignments(node: Node) {
    if (node.kind === Syntax.Identifier) {
      if (qf.is.assignmentTarget(node)) {
        const symbol = getResolvedSymbol(<Identifier>node);
        if (symbol.valueDeclaration && qf.get.rootDeclaration(symbol.valueDeclaration).kind === Syntax.Parameter) symbol.isAssigned = true;
      }
    } else {
      qf.each.child(node, markParameterAssignments);
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
  function typeHasNullableConstraint(type: Type) {
    return type.flags & qt.TypeFlags.InstantiableNonPrimitive && maybeTypeOfKind(getBaseConstraintOfType(type) || unknownType, qt.TypeFlags.Nullable);
  }
  function markAliasReferenced(symbol: Symbol, location: Node) {
    if (symbol.isNonLocalAlias(SymbolFlags.Value) && !isInTypeQuery(location) && !this.getTypeOnlyAliasDeclaration()) {
      if ((compilerOptions.preserveConstEnums && isExportOrExportExpression(location)) || !isConstEnumOrConstEnumOnlyModule(this.resolveAlias())) symbol.markAliasSymbolAsReferenced();
      else symbol.markConstEnumAliasAsReferenced();
    }
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
    return qf.is.superCall(node) ? node : qf.is.functionLike(node) ? undefined : qf.each.child(node, findFirstSuperCall);
  }
  function classDeclarationExtendsNull(classDecl: ClassDeclaration): boolean {
    const classSymbol = getSymbolOfNode(classDecl);
    const classInstanceType = <InterfaceType>getDeclaredTypeOfSymbol(classSymbol);
    const baseConstructorType = getBaseConstructorTypeOfClass(classInstanceType);
    return baseConstructorType === nullWideningType;
  }
  function tryGetThisTypeAt(node: Node, includeGlobalThis = true, container = qf.get.thisContainer(node, false)): Type | undefined {
    const isInJS = qf.is.inJSFile(node);
    if (qf.is.functionLike(container) && (!isInParameterIniterBeforeContainingFunction(node) || qf.get.thisNodeKind(ParameterDeclaration, container))) {
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
    if (qf.is.classLike(container.parent)) {
      const symbol = getSymbolOfNode(container.parent);
      const type = qf.has.syntacticModifier(container, ModifierFlags.Static) ? this.getTypeOfSymbol() : (getDeclaredTypeOfSymbol(symbol) as InterfaceType).thisType!;
      return getFlowTypeOfReference(node, type);
    }
    if (isInJS) {
      const type = getTypeForThisExpressionFromDoc(container);
      if (type && type !== errorType) return getFlowTypeOfReference(node, type);
    }
    if (qf.is.kind(qc.SourceFile, container)) {
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
  function discriminateContextualTypeByObjectMembers(node: ObjectLiteralExpression, contextualType: UnionType) {
    return discriminateTypeByDiscriminableItems(
      contextualType,
      map(
        filter(node.properties, (p) => !!p.symbol && p.kind === Syntax.PropertyAssignment && isPossiblyDiscriminantValue(p.initer) && isDiscriminantProperty(contextualType, p.symbol.escName)),
        (prop) => [() => check.expression((prop as PropertyAssignment).initer), prop.symbol.escName] as [() => Type, qu.__String]
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
        (prop) => [!(prop as JsxAttribute).initer ? () => trueType : () => check.expression((prop as JsxAttribute).initer!), prop.symbol.escName] as [() => Type, qu.__String]
      ),
      isTypeAssignableTo,
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
  function lookupSymbolForPrivateIdentifierDeclaration(propName: qu.__String, location: Node): Symbol | undefined {
    for (let containingClass = qf.get.containingClass(location); !!containingClass; containingClass = qf.get.containingClass(containingClass)) {
      const { symbol } = containingClass;
      const name = getSymbolNameForPrivateIdentifier(symbol, propName);
      const prop = (symbol.members && symbol.members.get(name)) || (symbol.exports && symbol.exports.get(name));
      if (prop) return prop;
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
        relatedInfo = qf.create.diagnosticForNode(propNode, qd.msgs.Did_you_forget_to_use_await);
      } else {
        const suggestion = getSuggestedSymbolForNonexistentProperty(propNode, containingType);
        if (suggestion !== undefined) {
          const suggestedName = suggestion.name;
          errorInfo = chainqd.Messages(errorInfo, qd.msgs.Property_0_does_not_exist_on_type_1_Did_you_mean_2, declarationNameToString(propNode), typeToString(containingType), suggestedName);
          relatedInfo = suggestion.valueDeclaration && qf.create.diagnosticForNode(suggestion.valueDeclaration, qd.msgs._0_is_declared_here, suggestedName);
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
    const resultDiagnostic = qf.create.diagnosticForNodeFromMessageChain(propNode, errorInfo);
    if (relatedInfo) addRelatedInfo(resultDiagnostic, relatedInfo);
    diagnostics.add(resultDiagnostic);
  }
  function typeHasStaticProperty(propName: qu.__String, containingType: Type): boolean {
    const prop = containingType.symbol && getPropertyOfType(getTypeOfSymbol(containingType.symbol), propName);
    return prop !== undefined && prop.valueDeclaration && qf.has.syntacticModifier(prop.valueDeclaration, ModifierFlags.Static);
  }
  function markPropertyAsReferenced(prop: Symbol, nodeForCheckWriteOnly: Node | undefined, isThisAccess: boolean) {
    const valueDeclaration = prop && prop.flags & qt.SymbolFlags.ClassMember && prop.valueDeclaration;
    if (!valueDeclaration) return;
    const hasPrivateModifier = qf.has.effectiveModifier(valueDeclaration, ModifierFlags.Private);
    const hasPrivateIdentifier = qf.is.namedDeclaration(prop.valueDeclaration) && qf.is.kind(qc.PrivateIdentifier, prop.valueDeclaration.name);
    if (!hasPrivateModifier && !hasPrivateIdentifier) return;
    if (nodeForCheckWriteOnly && qf.is.writeOnlyAccess(nodeForCheckWriteOnly) && !(prop.flags & qt.SymbolFlags.SetAccessor)) return;
    if (isThisAccess) {
      const containingMethod = qc.findAncestor(nodeForCheckWriteOnly, isFunctionLikeDeclaration);
      if (containingMethod && containingMethod.symbol === prop) return;
    }
    (getCheckFlags(prop) & qt.CheckFlags.Instantiated ? s.getLinks(prop).target : prop)!.isReferenced = qt.SymbolFlags.All;
  }
  function callLikeExpressionMayHaveTypeArguments(node: CallLikeExpression): node is CallExpression | NewExpression | TaggedTemplateExpression | JsxOpeningElement {
    return qf.is.callOrNewExpression(node) || qf.is.kind(qc.TaggedTemplateExpression, node) || qc.isJsx.openingLikeElement(node);
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
  function acceptsVoid(t: Type): boolean {
    return !!(t.flags & qt.TypeFlags.Void);
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
  function pickLongestCandidateSignature(node: CallLikeExpression, candidates: Signature[], args: readonly Expression[]): Signature {
    const bestIndex = getLongestCandidateIndex(candidates, apparentArgumentCount === undefined ? args.length : apparentArgumentCount);
    const candidate = candidates[bestIndex];
    const { typeParameters } = candidate;
    if (!typeParameters) return candidate;
    const typeArgumentNodes: readonly TypeNode[] | undefined = callLikeExpressionMayHaveTypeArguments(node) ? node.typeArguments : undefined;
    const instantiated = typeArgumentNodes
      ? createSignatureInstantiation(candidate, getTypeArgumentsFromNodes(typeArgumentNodes, typeParameters, qf.is.inJSFile(node)))
      : inferSignatureInstantiationForOverloadFailure(node, typeParameters, candidate, args);
    candidates[bestIndex] = instantiated;
    return instantiated;
  }
  function inferSignatureInstantiationForOverloadFailure(node: CallLikeExpression, typeParameters: readonly TypeParameter[], candidate: Signature, args: readonly Expression[]): Signature {
    const inferenceContext = createInferenceContext(typeParameters, candidate, qf.is.inJSFile(node) ? InferenceFlags.AnyDefault : InferenceFlags.None);
    const typeArgumentTypes = inferTypeArguments(node, candidate, args, CheckMode.SkipContextSensitive | CheckMode.SkipGenericFunctions, inferenceContext);
    return createSignatureInstantiation(candidate, typeArgumentTypes);
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
    if (qf.is.kind(qc.CallExpression, errorTarget.parent) && errorTarget.parent.arguments.length === 0) {
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
    const diagnostic = qf.create.diagnosticForNodeFromMessageChain(errorTarget, messageChain);
    if (relatedInfo) addRelatedInfo(diagnostic, qf.create.diagnosticForNode(errorTarget, relatedInfo));
    if (qf.is.kind(qc.CallExpression, errorTarget.parent)) {
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
        qf.create.diagnosticForNode(
          importNode,
          qd.msgs
            .Type_originates_at_this_import_A_namespace_style_import_cannot_be_called_or_constructed_and_will_cause_a_failure_at_runtime_Consider_using_a_default_import_or_import_require_here_instead
        )
      );
    }
  }
  function mergeJSSymbols(target: Symbol, source: Symbol | undefined) {
    if (source) {
      const links = s.getLinks(source);
      if (!links.inferredClassSymbol || !links.inferredClassSymbol.has('' + target.getId())) {
        const inferred = isTransientSymbol(target) ? target : (target.clone() as TransientSymbol);
        inferred.exports = inferred.exports || new SymbolTable();
        inferred.members = inferred.members || new SymbolTable();
        inferred.flags |= source.flags & qt.SymbolFlags.Class;
        if (qu.hasEntries(source.exports)) inferred.exports.merge(source.exports);
        if (qu.hasEntries(source.members)) inferred.members.merge(source.members);
        (links.inferredClassSymbol || (links.inferredClassSymbol = new qu.QMap<TransientSymbol>())).set('' + inferred.getId(), inferred);
        return inferred;
      }
      return links.inferredClassSymbol.get('' + target.getId());
    }
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
  function inferFromAnnotatedParameters(signature: Signature, context: Signature, inferenceContext: InferenceContext) {
    const len = signature.parameters.length - (signatureHasRestParameter(signature) ? 1 : 0);
    for (let i = 0; i < len; i++) {
      const declaration = <ParameterDeclaration>signature.parameters[i].valueDeclaration;
      if (declaration.type) {
        const typeNode = qf.get.effectiveTypeAnnotationNode(declaration);
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
  function issueMemberSpecificError(node: ClassLikeDeclaration, typeWithThis: Type, baseWithThis: Type, broadDiag: qd.Message) {
    let issuedMemberError = false;
    for (const member of node.members) {
      if (qf.has.staticModifier(member)) continue;
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
  function allTypesAssignableToKind(source: Type, kind: qt.TypeFlags, strict?: boolean): boolean {
    return source.flags & qt.TypeFlags.Union ? every((source as UnionType).types, (subType) => allTypesAssignableToKind(subType, kind, strict)) : isTypeAssignableToKind(source, kind, strict);
  }
  const enum CheckBinaryExpressionState {
    MaybeCheckLeft,
    CheckRight,
    FinishCheck,
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
    const widened = qf.get.combinedFlagsOf(declaration) & NodeFlags.Const || qf.is.declarationReadonly(declaration) ? type : getWidenedLiteralType(type);
    if (qf.is.inJSFile(declaration)) {
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
  function skippedGenericFunction(node: Node, checkMode: CheckMode) {
    if (checkMode & CheckMode.Inferential) {
      const context = getInferenceContext(node)!;
      context.flags |= InferenceFlags.SkippedGenericFunction;
    }
  }
  function mergeInferences(target: InferenceInfo[], source: InferenceInfo[]) {
    for (let i = 0; i < target.length; i++) {
      if (!hasInferenceCandidates(target[i]) && hasInferenceCandidates(source[i])) target[i] = source[i];
    }
  }
  function markTypeNodeAsReferenced(node: TypeNode) {
    markEntityNameOrEntityExpressionAsReference(node && qf.get.entityNameFromTypeNode(node));
  }
  function markEntityNameOrEntityExpressionAsReference(typeName: EntityNameOrEntityNameExpression | undefined) {
    if (!typeName) return;
    const rootName = qf.get.firstIdentifier(typeName);
    const meaning = (typeName.kind === Syntax.Identifier ? qt.SymbolFlags.Type : qt.SymbolFlags.Namespace) | qt.SymbolFlags.Alias;
    const rootSymbol = resolveName(rootName, rootName.escapedText, meaning, undefined, undefined, true);
    if (rootSymbol && rootSymbol.flags & qt.SymbolFlags.Alias && symbolIsValue(rootSymbol) && !isConstEnumOrConstEnumOnlyModule(rootSymbol.resolveAlias()) && !rootSymbol.getTypeOnlyAliasDeclaration())
      rootSymbol.markAliasSymbolAsReferenced();
  }
  function markDecoratorMedataDataTypeNodeAsReferenced(node: TypeNode | undefined): void {
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
    const node = qf.get.declaration.nameOf(declaration) || declaration;
    const message = qf.is.typeDeclaration(declaration) ? qd.msgs._0_is_declared_but_never_used : qd.msgs._0_is_declared_but_its_value_is_never_read;
    addDiagnostic(declaration, UnusedKind.Local, qf.create.diagnosticForNode(node, message, name));
  }
  function addToGroup<K, V>(map: qu.QMap<string, [K, V[]]>, key: K, value: V, getKey: (key: K) => number | string): void {
    const keyString = String(getKey(key));
    const group = map.get(keyString);
    if (group) group[1].push(value);
    else {
      map.set(keyString, [key, [value]]);
    }
  }
  function tryGetRootParameterDeclaration(node: Node): ParameterDeclaration | undefined {
    return qu.tryCast(qf.get.rootDeclaration(node), isParameter);
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
    const root = qf.get.rootDeclaration(node);
    if (root.kind === Syntax.Parameter && qf.is.missing((<FunctionLikeDeclaration>root.parent).body)) return false;
    return true;
  }
  function convertAutoToAny(type: Type) {
    return type === autoType ? anyType : type === autoArrayType ? anyArrayType : type;
  }
  function errorNextVariableOrPropertyDeclarationMustHaveSameType(firstDeclaration: Declaration | undefined, firstType: Type, nextDeclaration: Declaration, nextType: Type): void {
    const nextDeclarationName = qf.get.declaration.nameOf(nextDeclaration);
    const message =
      nextDeclaration.kind === Syntax.PropertyDeclaration || nextDeclaration.kind === Syntax.PropertySignature
        ? qd.msgs.Subsequent_property_declarations_must_have_the_same_type_Property_0_must_be_of_type_1_but_here_has_type_2
        : qd.msgs.Subsequent_variable_declarations_must_have_the_same_type_Variable_0_must_be_of_type_1_but_here_has_type_2;
    const declName = declarationNameToString(nextDeclarationName);
    const err = error(nextDeclarationName, message, declName, typeToString(firstType), typeToString(nextType));
    if (firstDeclaration) addRelatedInfo(err, qf.create.diagnosticForNode(firstDeclaration, qd.msgs._0_was_also_declared_here, declName));
  }
  function areDeclarationFlagsIdentical(left: Declaration, right: Declaration) {
    if ((left.kind === Syntax.Parameter && right.kind === Syntax.VariableDeclaration) || (left.kind === Syntax.VariableDeclaration && right.kind === Syntax.Parameter)) return true;
    if (qf.has.questionToken(left) !== qf.has.questionToken(right)) return false;
    const interestingFlags = ModifierFlags.Private | ModifierFlags.Protected | ModifierFlags.Async | ModifierFlags.Abstract | ModifierFlags.Readonly | ModifierFlags.Static;
    return qf.get.selectedEffectiveModifierFlags(left, interestingFlags) === qf.get.selectedEffectiveModifierFlags(right, interestingFlags);
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
    const message = allowAsyncIterables
      ? qd.msgs.Type_0_must_have_a_Symbol_asyncIterator_method_that_returns_an_async_iterator
      : qd.msgs.Type_0_must_have_a_Symbol_iterator_method_that_returns_an_iterator;
    errorAndMaybeSuggestAwait(errorNode, !!getAwaitedTypeOfPromise(type), message, typeToString(type));
  }
  function unwrapReturnType(returnType: Type, functionFlags: FunctionFlags) {
    const isGenerator = !!(functionFlags & FunctionFlags.Generator);
    const isAsync = !!(functionFlags & FunctionFlags.Async);
    return isGenerator ? getIterationTypeOfGeneratorFunctionReturnType(IterationTypeKind.Return, returnType, isAsync) ?? errorType : isAsync ? getAwaitedType(returnType) ?? errorType : returnType;
  }
  function areTypeParametersIdentical(declarations: readonly (ClassDeclaration | InterfaceDeclaration)[], targetParameters: TypeParameter[]) {
    const maxTypeArgumentCount = length(targetParameters);
    const minTypeArgumentCount = getMinTypeArgumentCount(targetParameters);
    for (const declaration of declarations) {
      const sourceParameters = qf.get.effectiveTypeParameterDeclarations(declaration);
      const numTypeParameters = sourceParameters.length;
      if (numTypeParameters < minTypeArgumentCount || numTypeParameters > maxTypeArgumentCount) return false;
      for (let i = 0; i < numTypeParameters; i++) {
        const source = sourceParameters[i];
        const target = targetParameters[i];
        if (source.name.escapedText !== target.symbol.escName) return false;
        const constraint = qf.get.effectiveConstraintOfTypeParameter(source);
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
    if (qf.is.computedNonLiteralName(member.name)) error(member.name, qd.msgs.Computed_property_names_are_not_allowed_in_enums);
    else {
      const text = qf.get.textOfPropertyName(member.name);
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
    const isConstEnum = qf.is.enumConst(member.parent);
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
          return qf.is.missing(expr) ? 0 : evaluateEnumMember(expr, getSymbolOfNode(member.parent), identifier.escapedText);
        case Syntax.ElementAccessExpression:
        case Syntax.PropertyAccessExpression:
          const ex = <AccessExpression>expr;
          if (isConstantMemberAccess(ex)) {
            const type = getTypeOfExpression(ex.expression);
            if (type.symbol && type.symbol.flags & qt.SymbolFlags.Enum) {
              let name: qu.__String;
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
    function evaluateEnumMember(expr: Expression, enumSymbol: Symbol, name: qu.__String) {
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
  function inSameLexicalScope(node1: Node, node2: Node) {
    const container1 = qf.get.enclosingBlockScopeContainer(node1);
    const container2 = qf.get.enclosingBlockScopeContainer(node2);
    if (isGlobalSourceFile(container1)) return isGlobalSourceFile(container2);
    else if (isGlobalSourceFile(container2)) return false;
    return container1 === container2;
  }
  function importClauseContainsReferencedImport(importClause: ImportClause) {
    return qf.each.importClause(importClause, (declaration) => {
      return !!getSymbolOfNode(declaration).isReferenced;
    });
  }
  function importClauseContainsConstEnumUsedAsValue(importClause: ImportClause) {
    return qf.each.importClause(importClause, (declaration) => {
      return !!s.getLinks(getSymbolOfNode(declaration)).constEnumReferenced;
    });
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
  function forEachEnclosingClass<T>(node: Node, callback: (node: Node) => T | undefined): T | undefined {
    let result: T | undefined;
    while (true) {
      node = qf.get.containingClass(node)!;
      if (!node) break;
      if ((result = callback(node))) break;
    }
    return result;
  }
  function typeHasCallOrConstructSignatures(type: Type): boolean {
    return type.hasCallOrConstructSignatures(checker);
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
  function canHaveConstantValue(node: Node): node is EnumMember | AccessExpression {
    switch (node.kind) {
      case Syntax.EnumMember:
      case Syntax.PropertyAccessExpression:
      case Syntax.ElementAccessExpression:
        return true;
    }
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
  function initializeTypeChecker() {
    for (const file of host.getSourceFiles()) {
      bindSourceFile(file, compilerOptions);
    }
    amalgamatedDuplicates = new qu.QMap();
    let augmentations: (readonly (StringLiteral | Identifier)[])[] | undefined;
    for (const file of host.getSourceFiles()) {
      if (file.redirectInfo) continue;
      if (!is.externalOrCommonJsModule(file)) {
        const fileGlobalThisSymbol = file.locals!.get('globalThis' as qu.__String);
        if (fileGlobalThisSymbol) {
          for (const declaration of fileGlobalThisSymbol.declarations) {
            diagnostics.add(qf.create.diagnosticForNode(declaration, qd.msgs.Declaration_name_conflicts_with_built_in_global_identifier_0, 'globalThis'));
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
          if (!qf.is.globalScopeAugmentation(augmentation.parent as ModuleDeclaration)) continue;
          mergeModuleAugmentation(augmentation);
        }
      }
    }
    globals.add(builtinGlobals, qd.msgs.Declaration_name_conflicts_with_built_in_global_identifier_0);
    s.getLinks(undefinedSymbol).type = undefinedWideningType;
    s.getLinks(argumentsSymbol).type = getGlobalType('IArguments' as qu.__String, 0, true);
    s.getLinks(unknownSymbol).type = errorType;
    s.getLinks(globalThisSymbol).type = createObjectType(ObjectFlags.Anonymous, globalThisSymbol);
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
    if (autoArrayType === emptyObjectType) autoArrayType = createAnonymousType(undefined, emptySymbols, empty, empty, undefined, undefined);
    globalReadonlyArrayType = <GenericType>getGlobalTypeOrUndefined('ReadonlyArray' as qu.__String, 1) || globalArrayType;
    anyReadonlyArrayType = globalReadonlyArrayType ? createTypeFromGenericGlobalType(globalReadonlyArrayType, [anyType]) : anyArrayType;
    globalThisType = <GenericType>getGlobalTypeOrUndefined('ThisType' as qu.__String, 1);
    if (augmentations) {
      for (const list of augmentations) {
        for (const augmentation of list) {
          if (qf.is.globalScopeAugmentation(augmentation.parent as ModuleDeclaration)) continue;
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
            qf.create.diagnosticForNode(firstFile, qd.msgs.Definitions_of_the_following_identifiers_conflict_with_those_in_another_file_Colon_0, list),
            qf.create.diagnosticForNode(secondFile, qd.msgs.Conflicts_are_in_this_file)
          )
        );
        diagnostics.add(
          addRelatedInfo(
            qf.create.diagnosticForNode(secondFile, qd.msgs.Definitions_of_the_following_identifiers_conflict_with_those_in_another_file_Colon_0, list),
            qf.create.diagnosticForNode(firstFile, qd.msgs.Conflicts_are_in_this_file)
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
            qu.fail();
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
    const sourceFile = node.sourceFile;
    if (!hasParseDiagnostics(sourceFile)) {
      const span = getSpanOfTokenAtPosition(sourceFile, node.pos);
      diagnostics.add(qf.create.fileDiagnostic(sourceFile, span.start, span.length, message, arg0, arg1, arg2));
      return true;
    }
    return false;
  }
  function grammarErrorAtPos(nodeForSourceFile: Node, start: number, length: number, message: qd.Message, arg0?: any, arg1?: any, arg2?: any): boolean {
    const sourceFile = nodeForSourceFile.sourceFile;
    if (!hasParseDiagnostics(sourceFile)) {
      diagnostics.add(qf.create.fileDiagnostic(sourceFile, start, length, message, arg0, arg1, arg2));
      return true;
    }
    return false;
  }
  function grammarErrorOnNode(node: Node, message: qd.Message, arg0?: any, arg1?: any, arg2?: any): boolean {
    const sourceFile = node.sourceFile;
    if (!hasParseDiagnostics(sourceFile)) {
      diagnostics.add(qf.create.diagnosticForNode(node, message, arg0, arg1, arg2));
      return true;
    }
    return false;
  }
  function grammarErrorAfterFirstToken(node: Node, message: qd.Message, arg0?: any, arg1?: any, arg2?: any): boolean {
    const sourceFile = node.sourceFile;
    if (!hasParseDiagnostics(sourceFile)) {
      const span = getSpanOfTokenAtPosition(sourceFile, node.pos);
      diagnostics.add(qf.create.fileDiagnostic(sourceFile, textSpanEnd(span), 0, message, arg0, arg1, arg2));
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
            map(sourcePropertiesFiltered, (p) => [() => getTypeOfSymbol(p), p.escName] as [() => Type, qu.__String]),
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
  export const JSX = 'JSX' as qu.__String;
  export const IntrinsicElements = 'IntrinsicElements' as qu.__String;
  export const ElementClass = 'ElementClass' as qu.__String;
  export const ElementAttributesPropertyNameContainer = 'ElementAttributesProperty' as qu.__String;
  export const ElementChildrenAttributeNameContainer = 'ElementChildrenAttribute' as qu.__String;
  export const Element = 'Element' as qu.__String;
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
