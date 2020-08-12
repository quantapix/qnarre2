import * as qc from '../core';
import * as qd from '../diagnostic';
import { ModifierFlags, Node, ObjectFlags, SymbolFlags, TypeFlags } from './type';
import * as qt from './type';
import * as qu from '../util';
import { Syntax } from '../syntax';
import * as qy from '../syntax';
import { newGet, Fget } from './get';
import { newHas, Fhas, newIs, Fis } from './predicate';
import { newCreate, Fcreate, newInstantiate, Finstantiate, newResolve, Fresolve } from './create';
import { newCheck, Fcheck } from './check';
export interface Frame extends qc.Frame, qt.TypeChecker {
  check: Fcheck;
  create: Fcreate;
  get: Fget;
  has: Fhas;
  instantiate: Finstantiate;
  is: Fis;
  resolve: Fresolve;
}
export function newFrame() {
  const f = qc.newFrame() as Frame;
  newCheck(f);
  newCreate(f);
  newGet(f);
  newHas(f);
  newInstantiate(f);
  newIs(f);
  newResolve(f)
  return f;
}
export const qf = newFrame();

export const anyType = qf.create.intrinsicType(TypeFlags.Any, 'any');
export const autoType = qf.create.intrinsicType(TypeFlags.Any, 'any');
export const wildcardType = qf.create.intrinsicType(TypeFlags.Any, 'any');
export const errorType = qf.create.intrinsicType(TypeFlags.Any, 'error');
export const nonInferrableAnyType = qf.create.intrinsicType(TypeFlags.Any, 'any', ObjectFlags.ContainsWideningType);
export const unknownType = qf.create.intrinsicType(TypeFlags.Unknown, 'unknown');
export const undefinedType = qf.create.intrinsicType(TypeFlags.Undefined, 'undefined');
export const undefinedWideningType = strictNullChecks ? undefinedType : qf.create.intrinsicType(TypeFlags.Undefined, 'undefined', ObjectFlags.ContainsWideningType);
export const optionalType = qf.create.intrinsicType(TypeFlags.Undefined, 'undefined');
export const nullType = qf.create.intrinsicType(TypeFlags.Null, 'null');
export const nullWideningType = strictNullChecks ? nullType : qf.create.intrinsicType(TypeFlags.Null, 'null', ObjectFlags.ContainsWideningType);
export const stringType = qf.create.intrinsicType(TypeFlags.String, 'string');
export const numberType = qf.create.intrinsicType(TypeFlags.Number, 'number');
export const bigintType = qf.create.intrinsicType(TypeFlags.BigInt, 'bigint');
export const falseType = qf.create.intrinsicType(TypeFlags.BooleanLiteral, 'false') as FreshableIntrinsicType;
export const regularFalseType = qf.create.intrinsicType(TypeFlags.BooleanLiteral, 'false') as FreshableIntrinsicType;
export const trueType = qf.create.intrinsicType(TypeFlags.BooleanLiteral, 'true') as FreshableIntrinsicType;
export const regularTrueType = qf.create.intrinsicType(TypeFlags.BooleanLiteral, 'true') as FreshableIntrinsicType;
trueType.regularType = regularTrueType;
trueType.freshType = trueType;
regularTrueType.regularType = regularTrueType;
regularTrueType.freshType = trueType;
falseType.regularType = regularFalseType;
falseType.freshType = falseType;
regularFalseType.regularType = regularFalseType;
regularFalseType.freshType = falseType;
export const booleanType = qf.create.booleanType([regularFalseType, regularTrueType]);
qf.create.booleanType([regularFalseType, trueType]);
qf.create.booleanType([falseType, regularTrueType]);
qf.create.booleanType([falseType, trueType]);
export const esSymbolType = qf.create.intrinsicType(TypeFlags.ESSymbol, 'symbol');
export const voidType = qf.create.intrinsicType(TypeFlags.Void, 'void');
export const neverType = qf.create.intrinsicType(TypeFlags.Never, 'never');
export const silentNeverType = qf.create.intrinsicType(TypeFlags.Never, 'never');
export const nonInferrableType = qf.create.intrinsicType(TypeFlags.Never, 'never', ObjectFlags.NonInferrableType);
export const implicitNeverType = qf.create.intrinsicType(TypeFlags.Never, 'never');
export const unreachableNeverType = qf.create.intrinsicType(TypeFlags.Never, 'never');
export const nonPrimitiveType = qf.create.intrinsicType(TypeFlags.NonPrimitive, 'object');
export const stringNumberSymbolType = qf.get.unionType([stringType, numberType, esSymbolType]);
export const keyofConstraintType = keyofStringsOnly ? stringType : stringNumberSymbolType;
export const numberOrBigIntType = qf.get.unionType([numberType, bigintType]);
export const restrictiveMapper: TypeMapper = makeFunctionTypeMapper((t) => (t.flags & qt.TypeFlags.TypeParam ? getRestrictiveTypeParam(<TypeParam>t) : t));
export const permissiveMapper: TypeMapper = makeFunctionTypeMapper((t) => (t.flags & qt.TypeFlags.TypeParam ? wildcardType : t));
export const emptyObjectType = qf.create.anonymousType(undefined, emptySymbols, qu.empty, qu.empty, undefined, undefined);
export const emptyJsxObjectType = qf.create.anonymousType(undefined, emptySymbols, qu.empty, qu.empty, undefined, undefined);
emptyJsxObjectType.objectFlags |= ObjectFlags.JsxAttributes;
export const emptyTypeLiteralSymbol = new Symbol(SymbolFlags.TypeLiteral, InternalSymbol.Type);
emptyTypeLiteralSymbol.members = new SymbolTable();
export const emptyTypeLiteralType = qf.create.anonymousType(emptyTypeLiteralSymbol, emptySymbols, qu.empty, qu.empty, undefined, undefined);
export const emptyGenericType = <GenericType>(<ObjectType>qf.create.anonymousType(undefined, emptySymbols, qu.empty, qu.empty, undefined, undefined));
emptyGenericType.instantiations = new qu.QMap<TypeReference>();
export const anyFunctionType = qf.create.anonymousType(undefined, emptySymbols, qu.empty, qu.empty, undefined, undefined);
anyFunctionType.objectFlags |= ObjectFlags.NonInferrableType;
export const noConstraintType = qf.create.anonymousType(undefined, emptySymbols, qu.empty, qu.empty, undefined, undefined);
export const circularConstraintType = qf.create.anonymousType(undefined, emptySymbols, qu.empty, qu.empty, undefined, undefined);
export const resolvingDefaultType = qf.create.anonymousType(undefined, emptySymbols, qu.empty, qu.empty, undefined, undefined);
export const markerSuperType = qf.create.typeParam();
export const markerSubType = qf.create.typeParam();
markerSubType.constraint = markerSuperType;
export const markerOtherType = qf.create.typeParam();
export const noTypePredicate = qf.create.typePredicate(TypePredicateKind.Identifier, '<<unresolved>>', 0, anyType);
export const anySignature = qf.create.signature(undefined, undefined, undefined, qu.empty, anyType, undefined, 0, SignatureFlags.None);
export const unknownSignature = qf.create.signature(undefined, undefined, undefined, qu.empty, errorType, undefined, 0, SignatureFlags.None);
export const resolvingSignature = qf.create.signature(undefined, undefined, undefined, qu.empty, anyType, undefined, 0, SignatureFlags.None);
export const silentNeverSignature = qf.create.signature(undefined, undefined, undefined, qu.empty, silentNeverType, undefined, 0, SignatureFlags.None);
export const enumNumberIndexInfo = qf.create.indexInfo(stringType, true);
export const iterationTypesCache = new qu.QMap<IterationTypes>();
export const noIterationTypes: IterationTypes = {
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
export const anyIterationTypes = qf.create.iterationTypes(anyType, anyType, anyType);
export const anyIterationTypesExceptNext = qf.create.iterationTypes(anyType, anyType, unknownType);
export const defaultIterationTypes = qf.create.iterationTypes(neverType, anyType, undefinedType);
export const asyncIterationTypesResolver: IterationTypesResolver = {
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
export const syncIterationTypesResolver: IterationTypesResolver = {
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

export class TypeChecker implements Frame {
  host: qt.TypeCheckerHost;
  typeCount: number;
  totalInstantiationCount: number;
  mergedSymbols: Symbol[];
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
let nextMergeId = 1;
let nextFlowId = 1;

function SymbolLinks(this: SymbolLinks) {}
export function isInstantiatedModule(node: ModuleDeclaration, preserveConstEnums: boolean) {
  const moduleState = getModuleInstanceState(node);
  return moduleState === ModuleInstanceState.Instantiated || (preserveConstEnums && moduleState === ModuleInstanceState.ConstEnumOnly);
}
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
  const compilerOpts = host.getCompilerOpts();
  const languageVersion = getEmitScriptTarget(compilerOpts);
  const moduleKind = getEmitModuleKind(compilerOpts);
  const allowSyntheticDefaultImports = getAllowSyntheticDefaultImports(compilerOpts);
  const strictNullChecks = getStrictOptionValue(compilerOpts, 'strictNullChecks');
  const strictFunctionTypes = getStrictOptionValue(compilerOpts, 'strictFunctionTypes');
  const strictBindCallApply = getStrictOptionValue(compilerOpts, 'strictBindCallApply');
  const strictPropertyInitialization = getStrictOptionValue(compilerOpts, 'strictPropertyInitialization');
  const noImplicitAny = getStrictOptionValue(compilerOpts, 'noImplicitAny');
  const noImplicitThis = getStrictOptionValue(compilerOpts, 'noImplicitThis');
  const keyofStringsOnly = !!compilerOpts.keyofStringsOnly;
  const freshObjectLiteralFlag = compilerOpts.suppressExcessPropertyErrors ? 0 : ObjectFlags.FreshLiteral;
  const emitResolver = createResolver();
  const nodeBuilder = createNodeBuilder();
  class QNode extends qc.Nobj {
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
  const argsSymbol = new Symbol(SymbolFlags.Property, 'args' as qu.__String);
  const requireSymbol = new Symbol(SymbolFlags.Property, 'require' as qu.__String);
  let apparentArgCount: number | undefined;
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
    getPrivateIdentifierPropertyOfType(leftType: Type, name: string, location: Node) {
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
      const location = qf.get.parseTreeOf(locationIn, isIdentifier);
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
    getContextualType(nodeIn: Expression, contextFlags?: ContextFlags) {
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
    isSymbolAccessible;
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
    getDefaultFromTypeParam(type) {return (type && type.flags & qt.TypeFlags.TypeParam ? getDefaultFromTypeParam(type as TypeParam) : undefined);}
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
      if (skipTypeChecking(file, compilerOpts, host)) return empty;
      let diagnostics: qd.DiagnosticWithLocation[] | undefined;
      try {
        cancellationToken = ct;
        check.sourceFile(file);
        assert(!!(qf.get.nodeLinks(file).flags & NodeCheckFlags.TypeChecked));
        diagnostics = addRange(diagnostics, suggestionqd.msgs.getDiagnostics(file.fileName));
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
  const tupleTypes = new qu.QMap<GenericType>();
  const unionTypes = new qu.QMap<UnionType>();
  const intersectionTypes = new qu.QMap<Type>();
  const literalTypes = new qu.QMap<LiteralType>();
  const indexedAccessTypes = new qu.QMap<IndexedAccessType>();
  const substitutionTypes = new qu.QMap<SubstitutionType>();
  const evolvingArrayTypes: EvolvingArrayType[] = [];
  const undefinedProperties = new qu.QMap<Symbol>() as EscapedMap<Symbol>;
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
  const emptyStringType = qf.get.literalType('');
  const zeroType = qf.get.literalType(0);
  const zeroBigIntType = qf.get.literalType({ negative: false, base10Value: '0' });
  const resolutionTargets: TypeSystemEntity[] = [];
  const resolutionResults: boolean[] = [];
  const resolutionPropertyNames: TypeSystemPropertyName[] = [];
  let suggestionCount = 0;
  const maximumSuggestionCount = 10;
  const mergedSymbols: Symbol[] = [];
  const symbolLinks: SymbolLinks[] = [];
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
    const errorNode = (qf.get.expandoIniter(node, false) ? qf.decl.nameOfExpando(node) : qf.decl.nameOf(node)) || node;
    const err = lookupOrIssueError(errorNode, message, symbolName);
    for (const relatedNode of relatedNodes || empty) {
      const adjustedNode = (qf.get.expandoIniter(relatedNode, false) ? qf.decl.nameOfExpando(relatedNode) : qf.decl.nameOf(relatedNode)) || relatedNode;
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
  function useOuterVariableScopeInParam(result: Symbol, location: Node, lastLocation: Node) {
    const target = getEmitScriptTarget(compilerOpts);
    const functionLocation = <FunctionLikeDeclaration>location;
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
    function requiresScopeChange(node: ParamDeclaration): boolean {
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
          if (qf.has.staticModifier(node)) return target < ScriptTarget.ESNext || !compilerOpts.useDefineForClassFields;
          return requiresScopeChangeWorker((node as PropertyDeclaration).name);
        default:
          if (qf.is.nullishCoalesce(node) || qf.is.optionalChain(node)) return false;
          if (node.kind === Syntax.BindingElem && node.dot3Token && node.parent.kind === Syntax.ObjectBindingPattern) return false;
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
          (decl) => !!(decl.kind === Syntax.ExportDeclaration && decl.moduleSpecifier && resolveExternalModuleName(decl, decl.moduleSpecifier)?.exports?.has(InternalSymbol.Default))
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
        qf.get.symbolIfSameReference(exportedEqualsSymbol, localSymbol)
          ? reportInvalidImportEqualsExportMember(node, name, declarationName, moduleName)
          : error(name, qd.msgs.Module_0_has_no_exported_member_1, moduleName, declarationName);
      } else {
        const exportedSymbol = exports ? find(exports.toArray(), (s) => !!qf.get.symbolIfSameReference(s, localSymbol)) : undefined;
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
  function markSymbolOfAliasDeclarationIfTypeOnly(aliasDeclaration: Declaration | undefined, immediateTarget: Symbol | undefined, finalTarget: Symbol | undefined, overwriteEmpty: boolean): boolean {
    if (!aliasDeclaration) return false;
    const sourceSymbol = qf.get.symbolOfNode(aliasDeclaration);
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
    const symbol = qf.get.symbolOfNode(node);
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
    const symbolTable = qf.get.exportsOfModule(moduleSymbol);
    if (symbolTable) return symbolTable.get(memberName);
  }
  function tryGetMemberInModuleExportsAndProperties(memberName: qu.__String, moduleSymbol: Symbol): Symbol | undefined {
    const symbol = tryGetMemberInModuleExports(memberName, moduleSymbol);
    if (symbol) return symbol;
    const exportEquals = resolveExternalModuleSymbol(moduleSymbol);
    if (exportEquals === moduleSymbol) return;
    const type = exportEquals.typeOfSymbol();
    return type.flags & qt.TypeFlags.Primitive || getObjectFlags(type) & ObjectFlags.Class || isArrayOrTupleLikeType(type) ? undefined : qf.get.propertyOfType(type, memberName);
  }
  interface ExportCollisionTracker {
    specText: string;
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
      if (location.locals && !qf.is.globalSourceFile(location)) if ((result = callback(location.locals))) return result;
      switch (location.kind) {
        case Syntax.SourceFile:
          if (!is.externalOrCommonJsModule(<SourceFile>location)) break;
        case Syntax.ModuleDeclaration:
          const sym = qf.get.symbolOfNode(location as ModuleDeclaration);
          if ((result = callback(sym?.exports || emptySymbols))) return result;
          break;
        case Syntax.ClassDeclaration:
        case Syntax.ClassExpression:
        case Syntax.InterfaceDeclaration:
          let table: EscapedMap<Symbol> | undefined;
          (qf.get.symbolOfNode(location as ClassLikeDeclaration | InterfaceDeclaration).members || emptySymbols).forEach((memberSymbol, key) => {
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
      if (flags & TypeFormatFlags.WriteArrowStyleSignature) sigOutput = kind === SignatureKind.Construct ? Syntax.ConstructorTyping : Syntax.FunctionTyping;
      else {
        sigOutput = kind === SignatureKind.Construct ? Syntax.ConstructSignature : Syntax.CallSignature;
      }
      const sig = nodeBuilder.signatureToSignatureDeclaration(
        signature,
        sigOutput,
        enclosingDeclaration,
        toNodeBuilderFlags(flags) | NodeBuilderFlags.IgnoreErrors | NodeBuilderFlags.WriteTypeParamsInQualifiedName
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
    const noTruncation = compilerOpts.noErrorTruncation || flags & TypeFormatFlags.NoTruncation;
    const typeNode = nodeBuilder.typeToTypeNode(type, enclosingDeclaration, toNodeBuilderFlags(flags) | NodeBuilderFlags.IgnoreErrors | (noTruncation ? NodeBuilderFlags.NoTruncation : 0), writer);
    if (typeNode === undefined) return qu.fail('should always get typenode');
    const opts = { removeComments: true };
    const printer = createPrinter(opts);
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
      const predicate = new qc.TypingPredicate(
        typePredicate.kind === TypePredicateKind.AssertsThis || typePredicate.kind === TypePredicateKind.AssertsIdentifier ? new Token(Syntax.AssertsKeyword) : undefined,
        typePredicate.kind === TypePredicateKind.Identifier || typePredicate.kind === TypePredicateKind.AssertsIdentifier ? new Identifier(typePredicate.paramName) : ThisTyping.create(),
        typePredicate.type &&
          nodeBuilder.typeToTypeNode(typePredicate.type, enclosingDeclaration, toNodeBuilderFlags(flags) | NodeBuilderFlags.IgnoreErrors | NodeBuilderFlags.WriteTypeParamsInQualifiedName)!
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
      exportSymbol = qf.get.targetOfExportSpecifier(<ExportSpecifier>node.parent, qt.SymbolFlags.Value | qt.SymbolFlags.Type | qt.SymbolFlags.Namespace | qt.SymbolFlags.Alias);
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
        if (setVisibility) qf.get.nodeLinks(declaration).isVisible = true;
        else {
          result = result || [];
          qu.pushIfUnique(result, resultNode);
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
    return strictNullChecks && optional ? qf.get.optionalType(type) : type;
  }
  function widenTypeForVariableLikeDeclaration(type: Type | undefined, declaration: any, reportErrors?: boolean) {
    if (type) {
      if (reportErrors) reportErrorsFromWidening(declaration, type);
      if (type.flags & qt.TypeFlags.UniqueESSymbol && (declaration.kind === Syntax.BindingElem || !declaration.type) && type.symbol !== qf.get.symbolOfNode(declaration)) type = esSymbolType;
      return qf.get.widenedType(type);
    }
    type = declaration.kind === Syntax.ParamDeclaration && declaration.dot3Token ? anyArrayType : anyType;
    if (reportErrors) {
      if (!declarationBelongsToPrivateAmbientMember(declaration)) reportImplicitAny(declaration, type);
    }
    return type;
  }
  function declarationBelongsToPrivateAmbientMember(declaration: VariableLikeDeclaration) {
    const root = qf.get.rootDeclaration(declaration);
    const memberDeclaration = root.kind === Syntax.Param ? root.parent : root;
    return isPrivateWithinAmbient(memberDeclaration);
  }
  function tryGetTypeFromEffectiveTypeNode(declaration: Declaration) {
    const typeNode = qf.get.effectiveTypeAnnotationNode(declaration);
    if (typeNode) return qf.get.typeFromTypeNode(typeNode);
  }
  function appendTypeParams(typeParams: TypeParam[] | undefined, declarations: readonly TypeParamDeclaration[]): TypeParam[] | undefined {
    for (const declaration of declarations) {
      typeParams = appendIfUnique(typeParams, getDeclaredTypeOfTypeParam(qf.get.symbolOfNode(declaration)));
    }
    return typeParams;
  }
  function areAllOuterTypeParamsApplied(type: Type): boolean {
    const outerTypeParams = (<InterfaceType>type).outerTypeParams;
    if (outerTypeParams) {
      const last = outerTypeParams.length - 1;
      const typeArgs = getTypeArgs(<TypeReference>type);
      return outerTypeParams[last].symbol !== typeArgs[last].symbol;
    }
    return true;
  }
  function addDeclarationToLateBoundSymbol(symbol: Symbol, member: LateBoundDecl | BinaryExpression, symbolFlags: qt.SymbolFlags) {
    assert(!!(this.checkFlags() & qt.CheckFlags.Late), 'Expected a late-bound symbol.');
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
  function lateBindMember(parent: Symbol, earlySymbols: SymbolTable | undefined, lateSymbols: EscapedMap<TransientSymbol>, decl: LateBoundDecl | LateBoundBinaryExpressionDeclaration) {
    assert(!!decl.symbol, 'The member is expected to have a symbol.');
    const ls = qf.get.nodeLinks(decl);
    if (!ls.resolvedSymbol) {
      ls.resolvedSymbol = decl.symbol;
      const declName = decl.kind === Syntax.BinaryExpression ? decl.left : decl.name;
      const type = declName.kind === Syntax.ElemAccessExpression ? check.expressionCached(declName.argExpression) : check.computedPropertyName(declName);
      if (qf.is.typeUsableAsPropertyName(type)) {
        const memberName = getPropertyNameFromType(type);
        const symbolFlags = decl.symbol.flags;
        let lateSymbol = lateSymbols.get(memberName);
        if (!lateSymbol) lateSymbols.set(memberName, (lateSymbol = new Symbol(SymbolFlags.None, memberName, qt.CheckFlags.Late)));
        const earlySymbol = earlySymbols && earlySymbols.get(memberName);
        if (lateSymbol.flags & getExcludedSymbolFlags(symbolFlags) || earlySymbol) {
          const declarations = earlySymbol ? concatenate(earlySymbol.declarations, lateSymbol.declarations) : lateSymbol.declarations;
          const name = (!(type.flags & qt.TypeFlags.UniqueESSymbol) && qy.get.unescUnderscores(memberName)) || declarationNameToString(declName);
          forEach(declarations, (declaration) => error(qf.decl.nameOf(declaration) || declaration, qd.msgs.Property_0_was_also_declared_here, name));
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
    const result = qf.create.signature(sig.declaration, sig.typeParams, sig.thisParam, sig.params, undefined, undefined, sig.minArgCount, sig.flags & SignatureFlags.PropagatingFlags);
    result.target = sig.target;
    result.mapper = sig.mapper;
    result.unions = sig.unions;
    return result;
  }
  function findMatchingSignature(signatureList: readonly Signature[], signature: Signature, partialMatch: boolean, ignoreThisTypes: boolean, ignoreReturnTypes: boolean): Signature | undefined {
    for (const s of signatureList) {
      if (compareSignaturesIdentical(s, signature, partialMatch, ignoreThisTypes, ignoreReturnTypes, partialMatch ? compareTypesSubtypeOf : compareTypesIdentical)) return s;
    }
  }
  function findMatchingSignatures(signatureLists: readonly (readonly Signature[])[], signature: Signature, listIndex: number): Signature[] | undefined {
    if (signature.typeParams) {
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
    const thisType = qf.get.intersectionType([left.typeOfSymbol(), right.typeOfSymbol()]);
    return createSymbolWithType(left, thisType);
  }
  function combineUnionParams(left: Signature, right: Signature) {
    const leftCount = getParamCount(left);
    const rightCount = getParamCount(right);
    const longest = leftCount >= rightCount ? left : right;
    const shorter = longest === left ? right : left;
    const longestCount = longest === left ? leftCount : rightCount;
    const eitherHasEffectiveRest = hasEffectiveRestParam(left) || hasEffectiveRestParam(right);
    const needsExtraRestElem = eitherHasEffectiveRest && !hasEffectiveRestParam(longest);
    const params = new Array<Symbol>(longestCount + (needsExtraRestElem ? 1 : 0));
    for (let i = 0; i < longestCount; i++) {
      const longestParamType = tryGetTypeAtPosition(longest, i)!;
      const shorterParamType = tryGetTypeAtPosition(shorter, i) || unknownType;
      const unionParamType = qf.get.intersectionType([longestParamType, shorterParamType]);
      const isRestParam = eitherHasEffectiveRest && !needsExtraRestElem && i === longestCount - 1;
      const isOptional = i >= getMinArgCount(longest) && i >= getMinArgCount(shorter);
      const leftName = i >= leftCount ? undefined : getParamNameAtPosition(left, i);
      const rightName = i >= rightCount ? undefined : getParamNameAtPosition(right, i);
      const paramName = leftName === rightName ? leftName : !leftName ? rightName : !rightName ? leftName : undefined;
      const paramSymbol = new Symbol(SymbolFlags.FunctionScopedVariable | (isOptional && !isRestParam ? qt.SymbolFlags.Optional : 0), paramName || (`arg${i}` as qu.__String));
      paramSymbol.type = isRestParam ? createArrayType(unionParamType) : unionParamType;
      params[i] = paramSymbol;
    }
    if (needsExtraRestElem) {
      const restParamSymbol = new Symbol(SymbolFlags.FunctionScopedVariable, 'args' as qu.__String);
      restParamSymbol.type = createArrayType(getTypeAtPosition(shorter, longestCount));
      params[longestCount] = restParamSymbol;
    }
    return params;
  }
  function combineSignaturesOfUnionMembers(left: Signature, right: Signature): Signature {
    const declaration = left.declaration;
    const params = combineUnionParams(left, right);
    const thisParam = combineUnionThisParam(left.thisParam, right.thisParam);
    const minArgCount = Math.max(left.minArgCount, right.minArgCount);
    const result = qf.create.signature(
      declaration,
      left.typeParams || right.typeParams,
      thisParam,
      params,
      undefined,
      undefined,
      minArgCount,
      (left.flags | right.flags) & SignatureFlags.PropagatingFlags
    );
    result.unions = concatenate(left.unions || [left], [right]);
    return result;
  }
  function intersectTypes(type1: Type, type2: Type): Type;
  function intersectTypes(type1: Type | undefined, type2: Type | undefined): Type | undefined;
  function intersectTypes(type1: Type | undefined, type2: Type | undefined): Type | undefined {
    return !type1 ? type2 : !type2 ? type1 : qf.get.intersectionType([type1, type2]);
  }
  function intersectIndexInfos(info1: IndexInfo | undefined, info2: IndexInfo | undefined): IndexInfo | undefined {
    return !info1 ? info2 : !info2 ? info1 : qf.create.indexInfo(qf.get.intersectionType([info1.type, info2.type]), info1.isReadonly && info2.isReadonly);
  }
  function unionSpreadIndexInfos(info1: IndexInfo | undefined, info2: IndexInfo | undefined): IndexInfo | undefined {
    return info1 && info2 && qf.create.indexInfo(qf.get.unionType([info1.type, info2.type]), info1.isReadonly || info2.isReadonly);
  }
  function findMixins(types: readonly Type[]): readonly boolean[] {
    const constructorTypeCount = countWhere(types, (t) => getSignaturesOfType(t, SignatureKind.Construct).length > 0);
    const mixinFlags = map(types, qf.is.mixinConstructorType);
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
        mixedTypes.push(qf.get.returnTypeOfSignature(getSignaturesOfType(types[i], SignatureKind.Construct)[0]));
      }
    }
    return qf.get.intersectionType(mixedTypes);
  }
  function appendSignatures(signatures: Signature[] | undefined, newSignatures: readonly Signature[]) {
    for (const sig of newSignatures) {
      if (!signatures || every(signatures, (s) => !compareSignaturesIdentical(s, sig, false, compareTypesIdentical))) signatures = append(signatures, sig);
    }
    return signatures;
  }
  function elaborateNeverIntersection(errorInfo: qd.MessageChain | undefined, type: Type) {
    if (getObjectFlags(type) & ObjectFlags.IsNeverIntersection) {
      const neverProp = find(getPropertiesOfUnionOrIntersectionType(<IntersectionType>type), qf.is.discriminantWithNeverType);
      if (neverProp) {
        return chainqd.Messages(
          errorInfo,
          qd.msgs.The_intersection_0_was_reduced_to_never_because_property_1_has_conflicting_types_in_some_constituents,
          typeToString(type, undefined, TypeFormatFlags.NoTypeReduction),
          neverProp.symbolToString()
        );
      }
      const privateProp = find(getPropertiesOfUnionOrIntersectionType(<IntersectionType>type), qf.is.conflictingPrivateProperty);
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
  function fillMissingTypeArgs(typeArgs: readonly Type[], typeParams: readonly TypeParam[] | undefined, minTypeArgCount: number, isJavaScriptImplicitAny: boolean): Type[];
  function fillMissingTypeArgs(
    typeArgs: readonly Type[] | undefined,
    typeParams: readonly TypeParam[] | undefined,
    minTypeArgCount: number,
    isJavaScriptImplicitAny: boolean
  ): Type[] | undefined;
  function fillMissingTypeArgs(typeArgs: readonly Type[] | undefined, typeParams: readonly TypeParam[] | undefined, minTypeArgCount: number, isJavaScriptImplicitAny: boolean) {
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
  function maybeAddJsSyntheticRestParam(declaration: SignatureDeclaration | DocSignature, params: Symbol[]): boolean {
    if (declaration.kind === Syntax.DocSignature || !containsArgsReference(declaration)) return false;
    const lastParam = lastOrUndefined(declaration.params);
    const lastParamTags = lastParam ? qc.getDoc.paramTags(lastParam) : qc.getDoc.tags(declaration).filter(isDocParamTag);
    const lastParamVariadicType = firstDefined(lastParamTags, (p) => (p.typeExpression && p.typeExpression.type.kind === Syntax.DocVariadicTyping ? p.typeExpression.type : undefined));
    const syntheticArgsSymbol = new Symbol(SymbolFlags.Variable, 'args' as qu.__String, qt.CheckFlags.RestParam);
    syntheticArgsSymbol.type = lastParamVariadicType ? createArrayType(qf.get.typeFromTypeNode(lastParamVariadicType.type)) : anyArrayType;
    if (lastParamVariadicType) params.pop();
    params.push(syntheticArgsSymbol);
    return true;
  }
  function tryGetRestTypeOfSignature(s: Signature): Type | undefined {
    if (s.hasRestParam()) {
      const sigRestType = s.params[s.params.length - 1].typeOfSymbol();
      const restType = qf.is.tupleType(sigRestType) ? getRestTypeOfTupleType(sigRestType) : sigRestType;
      return restType && qf.get.indexTypeOfType(restType, IndexKind.Number);
    }
    return;
  }
  function cloneTypeReference(source: TypeReference): TypeReference {
    const type = <TypeReference>createType(source.flags);
    type.symbol = source.symbol;
    type.objectFlags = source.objectFlags;
    type.target = source.target;
    type.resolvedTypeArgs = source.resolvedTypeArgs;
    return type;
  }
  function typeArgsFromTypingReference(node: WithArgsTobj): Type[] | undefined {
    return map(node.typeArgs, qf.get.typeFromTypeNode);
  }
  function mayResolveTypeAlias(node: Node): boolean {
    switch (node.kind) {
      case Syntax.TypingReference:
        return isDocTypeReference(node) || !!(resolveTypeReferenceName((<TypingReference>node).typeName, qt.SymbolFlags.Type).flags & qt.SymbolFlags.TypeAlias);
      case Syntax.TypingQuery:
        return true;
      case Syntax.TypingOperator:
        return (<TypingOperator>node).operator !== Syntax.UniqueKeyword && mayResolveTypeAlias((<TypingOperator>node).type);
      case Syntax.ParenthesizedTyping:
      case Syntax.OptionalTyping:
      case Syntax.NamedTupleMember:
      case Syntax.DocOptionalTyping:
      case Syntax.DocNullableTyping:
      case Syntax.DocNonNullableTyping:
      case Syntax.DocTypingExpression:
        return mayResolveTypeAlias((<ParenthesizedTyping | OptionalTyping | DocTypeReferencingNode | NamedTupleMember>node).type);
      case Syntax.RestTyping:
        return (<RestTyping>node).type.kind !== Syntax.ArrayTyping || mayResolveTypeAlias((<ArrayTyping>(<RestTyping>node).type).elemType);
      case Syntax.UnionTyping:
      case Syntax.IntersectionTyping:
        return some((<UnionOrIntersectionTyping>node).types, mayResolveTypeAlias);
      case Syntax.IndexedAccessTyping:
        return mayResolveTypeAlias((<IndexedAccessTyping>node).objectType) || mayResolveTypeAlias((<IndexedAccessTyping>node).indexType);
      case Syntax.ConditionalTyping:
        return (
          mayResolveTypeAlias((<ConditionalTyping>node).checkType) ||
          mayResolveTypeAlias((<ConditionalTyping>node).extendsType) ||
          mayResolveTypeAlias((<ConditionalTyping>node).trueType) ||
          mayResolveTypeAlias((<ConditionalTyping>node).falseType)
        );
    }
    return false;
  }
  function sliceTupleType(type: TupleTypeReference, index: number) {
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
        (qf.is.freshLiteralType(t) && containsType(types, (<LiteralType>t).regularType));
      if (remove) orderedRemoveItemAt(types, i);
    }
  }
  function typePredicateKindsMatch(a: TypePredicate, b: TypePredicate): boolean {
    return a.kind === b.kind && a.paramIndex === b.paramIndex;
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
    types[index] = qf.get.unionTypeFromSortedList(result, ObjectFlags.PrimitiveUnion);
    return true;
  }
  function distributeIndexOverObjectType(objectType: Type, indexType: Type, writing: boolean) {
    if (objectType.flags & qt.TypeFlags.UnionOrIntersection) {
      const types = map((objectType as UnionOrIntersectionType).types, (t) => getSimplifiedType(qf.get.indexedAccessType(t, indexType), writing));
      return objectType.flags & qt.TypeFlags.Intersection || writing ? qf.get.intersectionType(types) : qf.get.unionType(types);
    }
  }
  function distributeObjectOverIndexType(objectType: Type, indexType: Type, writing: boolean) {
    if (indexType.flags & qt.TypeFlags.Union) {
      const types = map((indexType as UnionType).types, (t) => getSimplifiedType(qf.get.indexedAccessType(objectType, t), writing));
      return writing ? qf.get.intersectionType(types) : qf.get.unionType(types);
    }
  }
  function unwrapSubstitution(type: Type): Type {
    if (type.flags & qt.TypeFlags.Substitution) return (type as SubstitutionType).substitute;
    return type;
  }
  function substituteIndexedMappedType(objectType: MappedType, index: Type) {
    const mapper = createTypeMapper([getTypeParamFromMappedType(objectType)], [index]);
    const templateMapper = combineTypeMappers(objectType.mapper, mapper);
    return instantiateType(getTemplateTypeFromMappedType(objectType), templateMapper);
  }
  function tryMergeUnionOfObjectTypeAndEmptyObject(type: UnionType, readonly: boolean): Type | undefined {
    if (type.types.length === 2) {
      const firstType = type.types[0];
      const secondType = type.types[1];
      if (every(type.types, qf.is.emptyObjectTypeOrSpreadsIntoEmptyObject)) return qf.is.emptyObjectType(firstType) ? firstType : qf.is.emptyObjectType(secondType) ? secondType : emptyObjectType;
      if (qf.is.emptyObjectTypeOrSpreadsIntoEmptyObject(firstType) && isSinglePropertyAnonymousObjectType(secondType)) return getAnonymousPartialType(secondType);
      if (qf.is.emptyObjectTypeOrSpreadsIntoEmptyObject(secondType) && isSinglePropertyAnonymousObjectType(firstType)) return getAnonymousPartialType(firstType);
    }
    function getAnonymousPartialType(type: Type) {
      const members = new SymbolTable();
      for (const prop of qf.get.propertiesOfType(type)) {
        if (prop.declarationModifierFlags() & (ModifierFlags.Private | ModifierFlags.Protected)) {
        } else if (isSpreadableProperty(prop)) {
          const isSetonlyAccessor = prop.flags & qt.SymbolFlags.SetAccessor && !(prop.flags & qt.SymbolFlags.GetAccessor);
          const flags = qt.SymbolFlags.Property | qt.SymbolFlags.Optional;
          const result = new Symbol(flags, prop.escName, readonly ? qt.CheckFlags.Readonly : 0);
          result.type = isSetonlyAccessor ? undefinedType : prop.typeOfSymbol();
          result.declarations = prop.declarations;
          result.nameType = s.getLinks(prop).nameType;
          result.syntheticOrigin = prop;
          members.set(prop.escName, result);
        }
      }
      const spread = qf.create.anonymousType(type.symbol, members, qu.empty, qu.empty, qf.get.indexInfoOfType(type, IndexKind.String), qf.get.indexInfoOfType(type, IndexKind.Number));
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
  function cloneTypeParam(typeParam: TypeParam): TypeParam {
    const result = qf.create.typeParam(typeParam.symbol);
    result.target = typeParam;
    return result;
  }
  function maybeTypeParamReference(node: Node) {
    return !(
      node.kind === Syntax.QualifiedName ||
      (node.parent.kind === Syntax.TypingReference && (<TypingReference>node.parent).typeArgs && node === (<TypingReference>node.parent).typeName) ||
      (node.parent.kind === Syntax.ImportTyping && (node.parent as ImportTyping).typeArgs && node === (node.parent as ImportTyping).qualifier)
    );
  }
  function compareTypesIdentical(source: Type, target: Type): Ternary {
    return qf.is.typeRelatedTo(source, target, identityRelation) ? Ternary.True : Ternary.False;
  }
  function compareTypesAssignable(source: Type, target: Type): Ternary {
    return qf.is.typeRelatedTo(source, target, assignableRelation) ? Ternary.True : Ternary.False;
  }
  function compareTypesSubtypeOf(source: Type, target: Type): Ternary {
    return qf.is.typeRelatedTo(source, target, subtypeRelation) ? Ternary.True : Ternary.False;
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
          const returnType = qf.get.returnTypeOfSignature(s);
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
    if (node.body.kind === Syntax.Block) return false;
    if (some(node.params, qc.hasType)) return false;
    const sourceSig = getSingleCallSignature(source);
    if (!sourceSig) return false;
    const targetSignatures = getSignaturesOfType(target, SignatureKind.Call);
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
            qf.create.diagnosticForNode(target.symbol.declarations[0], qd.msgs.The_expected_type_comes_from_the_return_type_of_this_signature)
          );
        }
        if (
          (qf.get.functionFlags(node) & FunctionFlags.Async) === 0 &&
          !qf.get.typeOfPropertyOfType(sourceReturn, 'then' as qu.__String) &&
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
  function elaborateElemwise(
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
      if (prop.kind === Syntax.JsxSpreadAttribute) continue;
      yield { errorNode: prop.name, innerExpression: prop.initer, nameType: qf.get.literalType(idText(prop.name)) };
    }
  }
  function* generateJsxChildren(node: JsxElem, getInvalidTextDiagnostic: () => qd.Message): ElaborationIterator {
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
    node: JsxAttributes,
    source: Type,
    target: Type,
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
  function* generateLimitedTupleElems(node: ArrayLiteralExpression, target: Type): ElaborationIterator {
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
    node: ArrayLiteralExpression,
    source: Type,
    target: Type,
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
  function* generateObjectLiteralElems(node: ObjectLiteralExpression): ElaborationIterator {
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
    node: ObjectLiteralExpression,
    source: Type,
    target: Type,
    relation: qu.QMap<RelationComparisonResult>,
    containingMessageChain: (() => qd.MessageChain | undefined) | undefined,
    errorOutputContainer: { errors?: qd.Diagnostic[]; skipLogging?: boolean } | undefined
  ) {
    if (target.flags & qt.TypeFlags.Primitive) return false;
    return elaborateElemwise(generateObjectLiteralElems(node), source, target, relation, containingMessageChain, errorOutputContainer);
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
    const targetCount = getParamCount(target);
    const sourceHasMoreParams =
      !hasEffectiveRestParam(target) &&
      (checkMode & SignatureCheckMode.StrictArity ? hasEffectiveRestParam(source) || getParamCount(source) > targetCount : getMinArgCount(source) > targetCount);
    if (sourceHasMoreParams) return Ternary.False;
    if (source.typeParams && source.typeParams !== target.typeParams) {
      target = getCanonicalSignature(target);
      source = instantiateSignatureInContextOf(source, target, undefined, compareTypes);
    }
    const sourceCount = getParamCount(source);
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
      if (related && checkMode & SignatureCheckMode.StrictArity && i >= getMinArgCount(source) && i < getMinArgCount(target) && compareTypes(sourceType, targetType, false))
        related = Ternary.False;
      if (!related) {
        if (reportErrors) {
          errorReporter!(
            qd.msgs.Types_of_params_0_and_1_are_incompatible,
            qy.get.unescUnderscores(getParamNameAtPosition(source, i)),
            qy.get.unescUnderscores(getParamNameAtPosition(target, i))
          );
        }
        return Ternary.False;
      }
      result &= related;
    }
    if (!(checkMode & SignatureCheckMode.IgnoreReturnTypes)) {
      const targetReturnType = isResolvingReturnTypeOfSignature(target)
        ? anyType
        : target.declaration && qf.is.jsConstructor(target.declaration)
        ? getDeclaredTypeOfClassOrInterface(qf.get.mergedSymbol(target.declaration.symbol))
        : qf.get.returnTypeOfSignature(target);
      if (targetReturnType === voidType) return result;
      const sourceReturnType = isResolvingReturnTypeOfSignature(source)
        ? anyType
        : source.declaration && qf.is.jsConstructor(source.declaration)
        ? getDeclaredTypeOfClassOrInterface(qf.get.mergedSymbol(source.declaration.symbol))
        : qf.get.returnTypeOfSignature(source);
      const targetTypePredicate = getTypePredicateOfSignature(target);
      if (targetTypePredicate) {
        const sourceTypePredicate = getTypePredicateOfSignature(source);
        if (sourceTypePredicate) result &= compareTypePredicateRelatedTo(sourceTypePredicate, targetTypePredicate, reportErrors, errorReporter, compareTypes);
        else if (qf.is.identifierTypePredicate(targetTypePredicate)) {
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
        errorReporter!(qd.msgs.A_this_based_type_guard_is_not_compatible_with_a_param_based_type_guard);
        errorReporter!(qd.msgs.Type_predicate_0_is_not_assignable_to_1, typePredicateToString(source), typePredicateToString(target));
      }
      return Ternary.False;
    }
    if (source.kind === TypePredicateKind.Identifier || source.kind === TypePredicateKind.AssertsIdentifier) {
      if (source.paramIndex !== (target as IdentifierTypePredicate).paramIndex) {
        if (reportErrors) {
          errorReporter!(qd.msgs.Param_0_is_not_in_the_same_position_as_param_1, source.paramName, (target as IdentifierTypePredicate).paramName);
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
  function forEachProperty<T>(prop: Symbol, callback: (p: Symbol) => T): T | undefined {
    if (prop.checkFlags() & qt.CheckFlags.Synthetic) {
      for (const t of (<TransientSymbol>prop).containingType!.types) {
        const p = qf.get.propertyOfType(t, prop.escName);
        const result = p && forEachProperty(p, callback);
        if (result) return result;
      }
      return;
    }
    return callback(prop);
  }
  function compareProperties(sourceProp: Symbol, targetProp: Symbol, compareTypes: (source: Type, target: Type) => Ternary): Ternary {
    if (sourceProp === targetProp) return Ternary.True;
    const sourcePropAccessibility = sourceProp.declarationModifierFlags() & ModifierFlags.NonPublicAccessibilityModifier;
    const targetPropAccessibility = targetProp.declarationModifierFlags() & ModifierFlags.NonPublicAccessibilityModifier;
    if (sourcePropAccessibility !== targetPropAccessibility) return Ternary.False;
    if (sourcePropAccessibility) {
      if (getTargetSymbol(sourceProp) !== getTargetSymbol(targetProp)) return Ternary.False;
    } else {
      if ((sourceProp.flags & qt.SymbolFlags.Optional) !== (targetProp.flags & qt.SymbolFlags.Optional)) return Ternary.False;
    }
    if (isReadonlySymbol(sourceProp) !== isReadonlySymbol(targetProp)) return Ternary.False;
    return compareTypes(sourceProp.typeOfSymbol(), targetProp.typeOfSymbol());
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
    if (length(source.typeParams) !== length(target.typeParams)) return Ternary.False;
    if (target.typeParams) {
      const mapper = createTypeMapper(source.typeParams!, target.typeParams);
      for (let i = 0; i < target.typeParams.length; i++) {
        const s = source.typeParams![i];
        const t = target.typeParams[i];
        if (
          !(
            s === t ||
            (compareTypes(instantiateType(getConstraintFromTypeParam(s), mapper) || unknownType, getConstraintFromTypeParam(t) || unknownType) &&
              compareTypes(instantiateType(getDefaultFromTypeParam(s), mapper) || unknownType, getDefaultFromTypeParam(t) || unknownType))
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
    const targetLen = getParamCount(target);
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
          : compareTypes(qf.get.returnTypeOfSignature(source), qf.get.returnTypeOfSignature(target));
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
    return strictNullChecks ? qf.get.unionType([type, optionalType]) : type;
  }
  function removeOptionalTypeMarker(type: Type): Type {
    return strictNullChecks ? filterType(type, isNotOptionalTypeMarker) : type;
  }
  function propagateOptionalTypeMarker(type: Type, node: OptionalChain, wasOptional: boolean) {
    return wasOptional ? (qf.is.outermostOptionalChain(node) ? qf.get.optionalType(type) : addOptionalTypeMarker(type)) : type;
  }
  function transformTypeOfMembers(type: Type, f: (propertyType: Type) => Type) {
    const members = new SymbolTable();
    for (const property of getPropertiesOfObjectType(type)) {
      const original = property.typeOfSymbol();
      const updated = f(original);
      members.set(property.escName, updated === original ? property : createSymbolWithType(property, updated));
    }
    return members;
  }
  function reportWideningErrorsInType(type: Type): boolean {
    let errorReported = false;
    if (getObjectFlags(type) & ObjectFlags.ContainsWideningType) {
      if (type.flags & qt.TypeFlags.Union) {
        if (some((<UnionType>type).types, qf.is.emptyObjectType)) errorReported = true;
        else {
          for (const t of (<UnionType>type).types) {
            if (reportWideningErrorsInType(t)) errorReported = true;
          }
        }
      }
      if (qf.is.arrayType(type) || qf.is.tupleType(type)) {
        for (const t of getTypeArgs(<TypeReference>type)) {
          if (reportWideningErrorsInType(t)) errorReported = true;
        }
      }
      if (qf.is.objectLiteralType(type)) {
        for (const p of getPropertiesOfObjectType(type)) {
          const t = p.typeOfSymbol();
          if (getObjectFlags(t) & ObjectFlags.ContainsWideningType) {
            if (!reportWideningErrorsInType(t)) error(p.valueDeclaration, qd.msgs.Object_literal_s_property_0_implicitly_has_an_1_type, p.symbolToString(), typeToString(qf.get.widenedType(t)));
            errorReported = true;
          }
        }
      }
    }
    return errorReported;
  }
  function reportImplicitAny(declaration: Declaration, type: Type, wideningKind?: WideningKind) {
    const typeAsString = typeToString(qf.get.widenedType(type));
    if (qf.is.inJSFile(declaration) && !isCheckJsEnabledForFile(declaration.sourceFile, compilerOpts)) return;
    let diagnostic: qd.Message;
    switch (declaration.kind) {
      case Syntax.BinaryExpression:
      case Syntax.PropertyDeclaration:
      case Syntax.PropertySignature:
        diagnostic = noImplicitAny ? qd.msgs.Member_0_implicitly_has_an_1_type : qd.msgs.Member_0_implicitly_has_an_1_type_but_a_better_type_may_be_inferred_from_usage;
        break;
      case Syntax.Param:
        const param = declaration as ParamDeclaration;
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
        diagnostic = (<ParamDeclaration>declaration).dot3Token
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
        if (noImplicitAny && !(declaration as NamedDecl).name) {
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
  function applyToParamTypes(source: Signature, target: Signature, callback: (s: Type, t: Type) => void) {
    const sourceCount = getParamCount(source);
    const targetCount = getParamCount(target);
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
      callback(qf.get.returnTypeOfSignature(source), qf.get.returnTypeOfSignature(target));
    }
  }
  function cloneInferenceContext<T extends InferenceContext | undefined>(context: T, extraFlags: InferenceFlags = 0): InferenceContext | (T & undefined) {
    return context && createInferenceContextWorker(map(context.inferences, cloneInferenceInfo), context.signature, context.flags | extraFlags, context.compareTypes);
  }
  function mapToInferredType(context: InferenceContext, t: Type, fix: boolean): Type {
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
  function clearCachedInferences(inferences: InferenceInfo[]) {
    for (const inference of inferences) {
      if (!inference.isFixed) inference.inferredType = undefined;
    }
  }
  function cloneInferenceInfo(inference: InferenceInfo): InferenceInfo {
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
        ((objectFlags & ObjectFlags.Reference && ((<TypeReference>type).node || forEach(getTypeArgs(<TypeReference>type), couldContainTypeVariables))) ||
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
    const typeParam = <TypeParam>qf.get.indexedAccessType(constraint.type, getTypeParamFromMappedType(target));
    const templateType = getTemplateTypeFromMappedType(target);
    const inference = createInferenceInfo(typeParam);
    inferTypes([inference], sourceType, templateType);
    return getTypeFromInference(inference) || unknownType;
  }
  function tupleTypesDefinitelyUnrelated(source: TupleTypeReference, target: TupleTypeReference) {
    return target.target.minLength > source.target.minLength || (!getRestTypeOfTupleType(target) && (!!getRestTypeOfTupleType(source) || getLengthOfTupleType(target) < getLengthOfTupleType(source)));
  }
  function typesDefinitelyUnrelated(source: Type, target: Type) {
    return (
      (qf.is.tupleType(source) && qf.is.tupleType(target) && tupleTypesDefinitelyUnrelated(source, target)) ||
      (!!getUnmatchedProperty(source, target, true) && !!getUnmatchedProperty(target, source, true))
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
      if (source.aliasSymbol && source.aliasTypeArgs && source.aliasSymbol === target.aliasSymbol) {
        inferFromTypeArgs(source.aliasTypeArgs, target.aliasTypeArgs!, getAliasVariances(source.aliasSymbol));
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
        target = qf.get.unionType(targets);
        if (sources.length === 0) {
          inferWithPriority(source, target, InferencePriority.NakedTypeVariable);
          return;
        }
        source = qf.get.unionType(sources);
      } else if (
        target.flags & qt.TypeFlags.Intersection &&
        some((<IntersectionType>target).types, (t) => !!getInferenceInfoForType(t) || (qf.is.genericMappedType(t) && !!getInferenceInfoForType(qf.get.homomorphicTypeVariable(t) || neverType)))
      ) {
        if (!(source.flags & qt.TypeFlags.Union)) {
          const [sources, targets] = inferFromMatchingTypes(
            source.flags & qt.TypeFlags.Intersection ? (<IntersectionType>source).types : [source],
            (<IntersectionType>target).types,
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
              !qf.is.typeParamAtTopLevel(originalTarget, <TypeParam>target)
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
        ((<TypeReference>source).target === (<TypeReference>target).target || (qf.is.arrayType(source) && qf.is.arrayType(target))) &&
        !((<TypeReference>source).node && (<TypeReference>target).node)
      ) {
        inferFromTypeArgs(getTypeArgs(<TypeReference>source), getTypeArgs(<TypeReference>target), getVariances((<TypeReference>source).target));
      } else if (source.flags & qt.TypeFlags.Index && target.flags & qt.TypeFlags.Index) {
        contravariant = !contravariant;
        inferFromTypes((<IndexType>source).type, (<IndexType>target).type);
        contravariant = !contravariant;
      } else if ((qf.is.literalType(source) || source.flags & qt.TypeFlags.String) && target.flags & qt.TypeFlags.Index) {
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
    function inferFromTypeArgs(sourceTypes: readonly Type[], targetTypes: readonly Type[], variances: readonly VarianceFlags[]) {
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
          if (type === inference.typeParam) return inference;
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
    function inferToMultipleTypes(source: Type, targets: Type[], f: qt.TypeFlags) {
      let typeVariableCount = 0;
      if (f & qt.TypeFlags.Union) {
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
    function inferFromObjectTypes(source: Type, target: Type) {
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
    function inferFromObjectTypesWorker(source: Type, target: Type) {
      if (
        getObjectFlags(source) & ObjectFlags.Reference &&
        getObjectFlags(target) & ObjectFlags.Reference &&
        ((<TypeReference>source).target === (<TypeReference>target).target || (qf.is.arrayType(source) && qf.is.arrayType(target)))
      ) {
        inferFromTypeArgs(getTypeArgs(<TypeReference>source), getTypeArgs(<TypeReference>target), getVariances((<TypeReference>source).target));
        return;
      }
      if (qf.is.genericMappedType(source) && qf.is.genericMappedType(target)) {
        inferFromTypes(getConstraintTypeFromMappedType(source), getConstraintTypeFromMappedType(target));
        inferFromTypes(getTemplateTypeFromMappedType(source), getTemplateTypeFromMappedType(target));
      }
      if (getObjectFlags(target) & ObjectFlags.Mapped) {
        const constraintType = getConstraintTypeFromMappedType(<MappedType>target);
        if (inferToMappedType(source, <MappedType>target, constraintType)) return;
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
              inferFromTypes(i < sourceLength ? getTypeArgs(<TypeReference>source)[i] : sourceRestType!, getTypeArgs(target)[i]);
            }
            if (targetRestType) {
              const types = fixedLength < sourceLength ? getTypeArgs(<TypeReference>source).slice(fixedLength, sourceLength) : [];
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
        inferFromSignatures(source, target, SignatureKind.Call);
        inferFromSignatures(source, target, SignatureKind.Construct);
        inferFromIndexTypes(source, target);
      }
    }
    function inferFromProperties(source: Type, target: Type) {
      const properties = getPropertiesOfObjectType(target);
      for (const targetProp of properties) {
        const sourceProp = qf.get.propertyOfType(source, targetProp.escName);
        if (sourceProp) inferFromTypes(sourceProp.typeOfSymbol(), targetProp.typeOfSymbol());
      }
    }
    function inferFromSignatures(source: Type, target: Type, kind: SignatureKind) {
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
    function inferFromSignature(source: Signature, target: Signature, skipParams: boolean) {
      if (!skipParams) {
        const saveBivariant = bivariant;
        const kind = target.declaration ? target.declaration.kind : Syntax.Unknown;
        bivariant = bivariant || kind === Syntax.MethodDeclaration || kind === Syntax.MethodSignature || kind === Syntax.Constructor;
        applyToParamTypes(source, target, inferFromContravariantTypes);
        bivariant = saveBivariant;
      }
      applyToReturnTypes(source, target, inferFromTypes);
    }
    function inferFromIndexTypes(source: Type, target: Type) {
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
  function unionObjectAndArrayLiteralCandidates(candidates: Type[]): Type[] {
    if (candidates.length > 1) {
      const objectLiterals = filter(candidates, qf.is.objectOrArrayLiteralType);
      if (objectLiterals.length) {
        const literalsType = qf.get.unionType(objectLiterals, UnionReduction.Subtype);
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
    if (!(source.flags & qt.TypeFlags.Union)) return qf.is.typeAssignableTo(source, target);
    for (const t of (<UnionType>source).types) {
      if (qf.is.typeAssignableTo(t, target)) return true;
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
      return filtered === types ? type : qf.get.unionTypeFromSortedList(filtered, (<UnionType>type).objectFlags);
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
    return mappedTypes && qf.get.unionType(mappedTypes, noReductions ? UnionReduction.None : UnionReduction.Literal);
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
  function addEvolvingArrayElemType(evolvingArrayType: EvolvingArrayType, node: Expression): EvolvingArrayType {
    const elemType = getBaseTypeOfLiteralType(getContextFreeTypeOfExpression(node));
    return isTypeSubsetOf(elemType, evolvingArrayType.elemType) ? evolvingArrayType : getEvolvingArrayType(qf.get.unionType([evolvingArrayType.elemType, elemType]));
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
  function markParamAssignments(node: Node) {
    if (node.kind === Syntax.Identifier) {
      if (qf.is.assignmentTarget(node)) {
        const symbol = getResolvedSymbol(<Identifier>node);
        if (symbol.valueDeclaration && qf.get.rootDeclaration(symbol.valueDeclaration).kind === Syntax.Param) symbol.assigned = true;
      }
    } else {
      qf.each.child(node, markParamAssignments);
    }
  }
  function removeOptionalityFromDeclaredType(declaredType: Type, declaration: VariableLikeDeclaration): Type {
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
  function typeHasNullableConstraint(type: Type) {
    return type.flags & qt.TypeFlags.InstantiableNonPrimitive && maybeTypeOfKind(qf.get.baseConstraintOfType(type) || unknownType, qt.TypeFlags.Nullable);
  }
  function markAliasReferenced(symbol: Symbol, location: Node) {
    if (symbol.isNonLocalAlias(SymbolFlags.Value) && !qf.is.inTypeQuery(location) && !this.getTypeOnlyAliasDeclaration()) {
      if ((compilerOpts.preserveConstEnums && isExportOrExportExpression(location)) || !isConstEnumOrConstEnumOnlyModule(this.resolveAlias())) symbol.markAliasSymbolAsReferenced();
      else symbol.markConstEnumAliasAsReferenced();
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
  function findFirstSuperCall(node: Node): SuperCall | undefined {
    return qf.is.superCall(node) ? node : qf.is.functionLike(node) ? undefined : qf.each.child(node, findFirstSuperCall);
  }
  function classDeclarationExtendsNull(classDecl: ClassDeclaration): boolean {
    const classSymbol = qf.get.symbolOfNode(classDecl);
    const classInstanceType = <InterfaceType>getDeclaredTypeOfSymbol(classSymbol);
    const baseConstructorType = getBaseConstructorTypeOfClass(classInstanceType);
    return baseConstructorType === nullWideningType;
  }
  function tryGetThisTypeAt(node: Node, includeGlobalThis = true, container = qf.get.thisContainer(node, false)): Type | undefined {
    const isInJS = qf.is.inJSFile(node);
    if (qf.is.functionLike(container) && (!isInParamIniterBeforeContainingFunction(node) || qf.get.thisNodeKind(ParamDeclaration, container))) {
      const className = getClassNameFromPrototypeMethod(container);
      if (isInJS && className) {
        const classSymbol = check.expression(className).symbol;
        if (classSymbol && classSymbol.members && classSymbol.flags & qt.SymbolFlags.Function) {
          const classType = (getDeclaredTypeOfSymbol(classSymbol) as InterfaceType).thisType;
          if (classType) return qf.get.flow.typeOfReference(node, classType);
        }
      } else if (isInJS && (container.kind === Syntax.FunctionExpression || container.kind === Syntax.FunctionDeclaration) && qc.getDoc.classTag(container)) {
        const classType = (getDeclaredTypeOfSymbol(qf.get.mergedSymbol(container.symbol)) as InterfaceType).thisType!;
        return qf.get.flow.typeOfReference(node, classType);
      }
      const thisType = getThisTypeOfDeclaration(container) || getContextualThisParamType(container);
      if (thisType) return qf.get.flow.typeOfReference(node, thisType);
    }
    if (qf.is.classLike(container.parent)) {
      const symbol = qf.get.symbolOfNode(container.parent);
      const type = qf.has.syntacticModifier(container, ModifierFlags.Static) ? this.typeOfSymbol() : (getDeclaredTypeOfSymbol(symbol) as InterfaceType).thisType!;
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
  function discriminateContextualTypeByObjectMembers(node: ObjectLiteralExpression, contextualType: UnionType) {
    return discriminateTypeByDiscriminableItems(
      contextualType,
      map(
        filter(node.properties, (p) => !!p.symbol && p.kind === Syntax.PropertyAssignment && qf.is.possiblyDiscriminantValue(p.initer) && isDiscriminantProperty(contextualType, p.symbol.escName)),
        (prop) => [() => check.expression((prop as PropertyAssignment).initer), prop.symbol.escName] as [() => Type, qu.__String]
      ),
      qf.is.typeAssignableTo,
      contextualType
    );
  }
  function discriminateContextualTypeByJSXAttributes(node: JsxAttributes, contextualType: UnionType) {
    return discriminateTypeByDiscriminableItems(
      contextualType,
      map(
        filter(
          node.properties,
          (p) => !!p.symbol && p.kind === Syntax.JsxAttribute && isDiscriminantProperty(contextualType, p.symbol.escName) && (!p.initer || qf.is.possiblyDiscriminantValue(p.initer))
        ),
        (prop) => [!(prop as JsxAttribute).initer ? () => trueType : () => check.expression((prop as JsxAttribute).initer!), prop.symbol.escName] as [() => Type, qu.__String]
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
  function lookupSymbolForPrivateIdentifierDeclaration(propName: qu.__String, location: Node): Symbol | undefined {
    for (let containingClass = qf.get.containingClass(location); !!containingClass; containingClass = qf.get.containingClass(containingClass)) {
      const { symbol } = containingClass;
      const name = symbol.nameForPrivateIdentifier(propName);
      const prop = (symbol.members && symbol.members.get(name)) || (symbol.exports && symbol.exports.get(name));
      if (prop) return prop;
    }
  }
  function reportNonexistentProperty(propNode: qc.Identifier | qc.PrivateIdentifier, containingType: Type) {
    let errorInfo: qd.MessageChain | undefined;
    let relatedInfo: qd.Diagnostic | undefined;
    if (!is.kind(qc.PrivateIdentifier, propNode) && containingType.flags & qt.TypeFlags.Union && !(containingType.flags & qt.TypeFlags.Primitive)) {
      for (const subtype of (containingType as UnionType).types) {
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
    const prop = containingType.symbol && qf.get.propertyOfType(containingType.symbol.typeOfSymbol(), propName);
    return prop !== undefined && prop.valueDeclaration && qf.has.syntacticModifier(prop.valueDeclaration, ModifierFlags.Static);
  }
  function markPropertyAsReferenced(prop: Symbol, nodeForCheckWriteOnly: Node | undefined, isThisAccess: boolean) {
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
    (prop.checkFlags() & qt.CheckFlags.Instantiated ? s.getLinks(prop).target : prop)!.referenced = qt.SymbolFlags.All;
  }
  function callLikeExpressionMayHaveTypeArgs(node: CallLikeExpression): node is CallExpression | NewExpression | TaggedTemplateExpression | JsxOpeningElem {
    return qf.is.callOrNewExpression(node) || node.kind === Syntax.TaggedTemplateExpression || qc.isJsx.openingLikeElem(node);
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
  function acceptsVoid(t: Type): boolean {
    return !!(t.flags & qt.TypeFlags.Void);
  }
  function inferJsxTypeArgs(node: JsxOpeningLikeElem, signature: Signature, checkMode: CheckMode, context: InferenceContext): Type[] {
    const paramType = getEffectiveFirstArgForJsxSignature(signature, node);
    const checkAttrType = check.expressionWithContextualType(node.attributes, paramType, context, checkMode);
    inferTypes(context.inferences, checkAttrType, paramType);
    return getInferredTypes(context);
  }
  function inferTypeArgs(node: CallLikeExpression, signature: Signature, args: readonly Expression[], checkMode: CheckMode, context: InferenceContext): Type[] {
    if (qc.isJsx.openingLikeElem(node)) return inferJsxTypeArgs(node, signature, checkMode, context);
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
  function pickLongestCandidateSignature(node: CallLikeExpression, candidates: Signature[], args: readonly Expression[]): Signature {
    const bestIndex = getLongestCandidateIndex(candidates, apparentArgCount === undefined ? args.length : apparentArgCount);
    const candidate = candidates[bestIndex];
    const { typeParams } = candidate;
    if (!typeParams) return candidate;
    const typeArgNodes: readonly Typing[] | undefined = callLikeExpressionMayHaveTypeArgs(node) ? node.typeArgs : undefined;
    const instantiated = typeArgNodes
      ? qf.create.signatureInstantiation(candidate, getTypeArgsFromNodes(typeArgNodes, typeParams, qf.is.inJSFile(node)))
      : inferSignatureInstantiationForOverloadFailure(node, typeParams, candidate, args);
    candidates[bestIndex] = instantiated;
    return instantiated;
  }
  function inferSignatureInstantiationForOverloadFailure(node: CallLikeExpression, typeParams: readonly TypeParam[], candidate: Signature, args: readonly Expression[]): Signature {
    const inferenceContext = createInferenceContext(typeParams, candidate, qf.is.inJSFile(node) ? InferenceFlags.AnyDefault : InferenceFlags.None);
    const typeArgTypes = inferTypeArgs(node, candidate, args, CheckMode.SkipContextSensitive | CheckMode.SkipGenericFunctions, inferenceContext);
    return qf.create.signatureInstantiation(candidate, typeArgTypes);
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
    if (errorTarget.parent.kind === Syntax.CallExpression && errorTarget.parent.args.length === 0) {
      const { resolvedSymbol } = qf.get.nodeLinks(errorTarget);
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
    if (errorTarget.parent.kind === Syntax.CallExpression) {
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
      const sigs = getSignaturesOfType(s.getLinks(apparentType.symbol).target!.typeOfSymbol(), kind);
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
        const inferred = target.isTransient() ? target : (target.clone() as TransientSymbol);
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
    const paramCount = signature.params.length - (signature.hasRestParam() ? 1 : 0);
    if (pos < paramCount) return getTypeOfParam(signature.params[pos]);
    if (signature.hasRestParam()) {
      const restType = signature.params[paramCount].typeOfSymbol();
      const index = pos - paramCount;
      if (!qf.is.tupleType(restType) || restType.target.hasRestElem || index < getTypeArgs(restType).length) return qf.get.indexedAccessType(restType, qf.get.literalType(index));
    }
    return;
  }
  function inferFromAnnotatedParams(signature: Signature, context: Signature, inferenceContext: InferenceContext) {
    const len = signature.params.length - (signature.hasRestParam() ? 1 : 0);
    for (let i = 0; i < len; i++) {
      const declaration = <ParamDeclaration>signature.params[i].valueDeclaration;
      if (declaration.type) {
        const typeNode = qf.get.effectiveTypeAnnotationNode(declaration);
        if (typeNode) inferTypes(inferenceContext.inferences, qf.get.typeFromTypeNode(typeNode), getTypeAtPosition(context, i));
      }
    }
    const restType = getEffectiveRestType(context);
    if (restType && restType.flags & qt.TypeFlags.TypeParam) {
      const instantiatedContext = instantiateSignature(context, inferenceContext.nonFixingMapper);
      assignContextualParamTypes(signature, instantiatedContext);
      const restPos = getParamCount(context) - 1;
      inferTypes(inferenceContext.inferences, getRestTypeAtPosition(signature, restPos), restType);
    }
  }
  function assignContextualParamTypes(signature: Signature, context: Signature) {
    signature.typeParams = context.typeParams;
    if (context.thisParam) {
      const param = signature.thisParam;
      if (!param || (param.valueDeclaration && !(<ParamDeclaration>param.valueDeclaration).type)) {
        if (!param) signature.thisParam = createSymbolWithType(context.thisParam, undefined);
        assignParamType(signature.thisParam!, context.thisParam.typeOfSymbol());
      }
    }
    const len = signature.params.length - (signature.hasRestParam() ? 1 : 0);
    for (let i = 0; i < len; i++) {
      const param = signature.params[i];
      if (!get.effectiveTypeAnnotationNode(<ParamDeclaration>param.valueDeclaration)) {
        const contextualParamType = tryGetTypeAtPosition(context, i);
        assignParamType(param, contextualParamType);
      }
    }
    if (signature.hasRestParam()) {
      const param = last(signature.params);
      if (param.isTransient() || !get.effectiveTypeAnnotationNode(<ParamDeclaration>param.valueDeclaration)) {
        const contextualParamType = getRestTypeAtPosition(context, len);
        assignParamType(param, contextualParamType);
      }
    }
  }
  function assignNonContextualParamTypes(signature: Signature) {
    if (signature.thisParam) assignParamType(signature.thisParam);
    for (const param of signature.params) {
      assignParamType(param);
    }
  }
  function assignParamType(param: Symbol, type?: Type) {
    const links = s.getLinks(param);
    if (!links.type) {
      const declaration = param.valueDeclaration as ParamDeclaration;
      links.type = type || qf.get.widenedTypeForVariableLikeDeclaration(declaration, true);
      if (declaration.name.kind !== Syntax.Identifier) {
        if (links.type === unknownType) links.type = qf.get.typeFromBindingPattern(declaration.name);
        assignBindingElemTypes(declaration.name);
      }
    }
  }
  function assignBindingElemTypes(pattern: BindingPattern) {
    for (const elem of pattern.elems) {
      if (!is.kind(qc.OmittedExpression, elem)) {
        if (elem.name.kind === Syntax.Identifier) s.getLinks(qf.get.symbolOfNode(elem)).type = qf.get.typeForBindingElem(elem);
        else assignBindingElemTypes(elem.name);
      }
    }
  }
  function issueMemberSpecificError(node: ClassLikeDeclaration, typeWithThis: Type, baseWithThis: Type, broadDiag: qd.Message) {
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
  function computeExhaustiveSwitchStatement(node: SwitchStatement): boolean {
    if (node.expression.kind === Syntax.TypeOfExpression) {
      const operandType = qf.get.typeOfExpression((node.expression as TypeOfExpression).expression);
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
    const links = qf.get.nodeLinks(node);
    if (!(links.flags & NodeCheckFlags.ContextChecked)) {
      const contextualSignature = getContextualSignature(node);
      if (!(links.flags & NodeCheckFlags.ContextChecked)) {
        links.flags |= NodeCheckFlags.ContextChecked;
        const signature = firstOrUndefined(getSignaturesOfType(qf.get.symbolOfNode(node).typeOfSymbol(), SignatureKind.Call));
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
    return source.flags & qt.TypeFlags.Union ? every((source as UnionType).types, (subType) => allTypesAssignableToKind(subType, kind, strict)) : qf.is.typeAssignableToKind(source, kind, strict);
  }
  const enum CheckBinaryExpressionState {
    MaybeCheckLeft,
    CheckRight,
    FinishCheck,
  }
  function padTupleType(type: TupleTypeReference, pattern: ArrayBindingPattern) {
    const patternElems = pattern.elems;
    const arity = getTypeReferenceArity(type);
    const elemTypes = arity ? getTypeArgs(type).slice() : [];
    for (let i = arity; i < patternElems.length; i++) {
      const e = patternElems[i];
      if (i < patternElems.length - 1 || !(e.kind === Syntax.BindingElem && e.dot3Token)) {
        elemTypes.push(!is.kind(qc.OmittedExpression, e) && hasDefaultValue(e) ? getTypeFromBindingElem(e, false, false) : anyType);
        if (!is.kind(qc.OmittedExpression, e) && !hasDefaultValue(e)) reportImplicitAny(e, anyType);
      }
    }
    return createTupleType(elemTypes, type.target.minLength, false, type.target.readonly);
  }
  function widenTypeInferredFromIniter(declaration: HasExpressionIniter, type: Type) {
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
  function mergeInferences(target: InferenceInfo[], source: InferenceInfo[]) {
    for (let i = 0; i < target.length; i++) {
      if (!hasInferenceCandidates(target[i]) && hasInferenceCandidates(source[i])) target[i] = source[i];
    }
  }
  function markTypeNodeAsReferenced(node: Typing) {
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
  function markDecoratorMedataDataTypeNodeAsReferenced(node: Typing | undefined): void {
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
    | Exclude<SignatureDeclaration, IndexSignatureDeclaration | DocFunctionTyping>
    | TypeAliasDeclaration
    | InferTyping;
  function errorUnusedLocal(declaration: Declaration, name: string, addDiagnostic: AddUnusedDiagnostic) {
    const node = qf.decl.nameOf(declaration) || declaration;
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
  function tryGetRootParamDeclaration(node: Node): ParamDeclaration | undefined {
    return qu.tryCast(qf.get.rootDeclaration(node), isParam);
  }
  function bindingNameText(name: BindingName): string {
    switch (name.kind) {
      case Syntax.Identifier:
        return idText(name);
      case Syntax.ArrayBindingPattern:
      case Syntax.ObjectBindingPattern:
        return bindingNameText(cast(first(name.elems), BindingElem.kind).name);
      default:
        return qc.assert.never(name);
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
    if (root.kind === Syntax.Param && qf.is.missing((<FunctionLikeDeclaration>root.parent).body)) return false;
    return true;
  }
  function convertAutoToAny(type: Type) {
    return type === autoType ? anyType : type === autoArrayType ? anyArrayType : type;
  }
  function errorNextVariableOrPropertyDeclarationMustHaveSameType(firstDeclaration: Declaration | undefined, firstType: Type, nextDeclaration: Declaration, nextType: Type): void {
    const nextDeclarationName = qf.decl.nameOf(nextDeclaration);
    const message =
      nextDeclaration.kind === Syntax.PropertyDeclaration || nextDeclaration.kind === Syntax.PropertySignature
        ? qd.msgs.Subsequent_property_declarations_must_have_the_same_type_Property_0_must_be_of_type_1_but_here_has_type_2
        : qd.msgs.Subsequent_variable_declarations_must_have_the_same_type_Variable_0_must_be_of_type_1_but_here_has_type_2;
    const declName = declarationNameToString(nextDeclarationName);
    const err = error(nextDeclarationName, message, declName, typeToString(firstType), typeToString(nextType));
    if (firstDeclaration) addRelatedInfo(err, qf.create.diagnosticForNode(firstDeclaration, qd.msgs._0_was_also_declared_here, declName));
  }
  function areDeclarationFlagsIdentical(left: Declaration, right: Declaration) {
    if ((left.kind === Syntax.Param && right.kind === Syntax.VariableDeclaration) || (left.kind === Syntax.VariableDeclaration && right.kind === Syntax.Param)) return true;
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
      return qf.create.iterationTypes(yieldTypes && qf.get.unionType(yieldTypes), returnTypes && qf.get.unionType(returnTypes), nextTypes && qf.get.intersectionType(nextTypes));
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
  function areTypeParamsIdentical(declarations: readonly (ClassDeclaration | InterfaceDeclaration)[], targetParams: TypeParam[]) {
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
  function computeEnumMemberValues(node: EnumDeclaration) {
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
  function computeMemberValue(member: EnumMember, autoValue?: number) {
    if (qf.is.computedNonLiteralName(member.name)) error(member.name, qd.msgs.Computed_property_names_are_not_allowed_in_enums);
    else {
      const t = qf.get.textOfPropertyName(member.name);
      if (NumericLiteral.name(t) && !qu.isInfinityOrNaNString(t)) error(member.name, qd.msgs.An_enum_member_cannot_have_a_numeric_name);
    }
    if (member.initer) return computeConstantValue(member);
    if (member.parent.flags & NodeFlags.Ambient && !is.enumConst(member.parent) && getEnumKind(qf.get.symbolOfNode(member.parent)) === EnumKind.Numeric) return;
    if (autoValue !== undefined) return autoValue;
    error(member.name, qd.msgs.Enum_member_must_have_initer);
    return;
  }
  function computeConstantValue(member: EnumMember): string | number | undefined {
    const enumKind = getEnumKind(qf.get.symbolOfNode(member.parent));
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
    function evaluate(e: Expression): string | number | undefined {
      switch (e.kind) {
        case Syntax.PrefixUnaryExpression:
          const value = evaluate((<PrefixUnaryExpression>e).operand);
          if (typeof value === 'number') {
            switch ((<PrefixUnaryExpression>e).operator) {
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
          const left = evaluate((<BinaryExpression>e).left);
          const right = evaluate((<BinaryExpression>e).right);
          if (typeof left === 'number' && typeof right === 'number') {
            switch ((<BinaryExpression>e).operatorToken.kind) {
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
          } else if (typeof left === 'string' && typeof right === 'string' && (<BinaryExpression>e).operatorToken.kind === Syntax.PlusToken) {
            return left + right;
          }
          break;
        case Syntax.StringLiteral:
        case Syntax.NoSubstitutionLiteral:
          return (<StringLiteralLike>e).text;
        case Syntax.NumericLiteral:
          checkGrammar.numericLiteral(<NumericLiteral>e);
          return +(<NumericLiteral>e).text;
        case Syntax.ParenthesizedExpression:
          return evaluate((<ParenthesizedExpression>e).expression);
        case Syntax.Identifier:
          if (qu.isInfinityOrNaNString(e.escapedText)) return +e.escapedText;
          return qf.is.missing(e) ? 0 : evaluateEnumMember(e, qf.get.symbolOfNode(member.parent), identifier.escapedText);
        case Syntax.ElemAccessExpression:
        case Syntax.PropertyAccessExpression:
          const ex = <AccessExpression>e;
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
    function evaluateEnumMember(e: Expression, enumSymbol: Symbol, name: qu.__String) {
      const memberSymbol = enumSymbol.exports!.get(name);
      if (memberSymbol) {
        const declaration = memberSymbol.valueDeclaration;
        if (declaration !== member) {
          if (qf.is.blockScopedNameDeclaredBeforeUse(declaration, member)) return getEnumMemberValue(declaration as EnumMember);
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
  function importClauseContainsReferencedImport(importClause: ImportClause) {
    return qf.each.importClause(importClause, (declaration) => {
      return !!qf.get.symbolOfNode(declaration).referenced;
    });
  }
  function importClauseContainsConstEnumUsedAsValue(importClause: ImportClause) {
    return qf.each.importClause(importClause, (declaration) => {
      return !!s.getLinks(qf.get.symbolOfNode(declaration)).constEnumReferenced;
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
  function typeHasCallOrConstructSignatures(type: Type): boolean {
    return type.hasCallOrConstructSignatures(checker);
  }
  function moduleExportsSomeValue(moduleReferenceExpression: Expression): boolean {
    let moduleSymbol = resolveExternalModuleName(moduleReferenceExpression.parent, moduleReferenceExpression);
    if (!moduleSymbol || moduleSymbol.isShorthandAmbientModule()) return true;
    const hasExportAssignment = hasExportAssignmentSymbol(moduleSymbol);
    moduleSymbol = resolveExternalModuleSymbol(moduleSymbol);
    const symbolLinks = s.getLinks(moduleSymbol);
    if (symbolLinks.exportsSomeValue === undefined)
      symbolLinks.exportsSomeValue = hasExportAssignment ? !!(moduleSymbol.flags & qt.SymbolFlags.Value) : forEachEntry(qf.get.exportsOfModule(moduleSymbol), isValue);
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
      case Syntax.ElemAccessExpression:
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
      bindSourceFile(file, compilerOpts);
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
    s.getLinks(argsSymbol).type = getGlobalType('IArgs' as qu.__String, 0, true);
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
    if (autoArrayType === emptyObjectType) autoArrayType = qf.create.anonymousType(undefined, emptySymbols, qu.empty, qu.empty, undefined, undefined);
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
  function doesAccessorHaveCorrectParamCount(accessor: AccessorDeclaration) {
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
    if (getObjectFlags(source) & ObjectFlags.ObjectLiteral && forEachType(unionTarget, qf.is.arrayLikeType)) return find(unionTarget.types, (t) => !qf.is.arrayLikeType(t));
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
      const overlap = qf.get.intersectionType([qf.get.indexType(source), qf.get.indexType(target)]);
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
      const sourceProperties = qf.get.propertiesOfType(source);
      if (sourceProperties) {
        const sourcePropertiesFiltered = findDiscriminantProperties(sourceProperties, target);
        if (sourcePropertiesFiltered) {
          return discriminateTypeByDiscriminableItems(
            <UnionType>target,
            map(sourcePropertiesFiltered, (p) => [() => p.typeOfSymbol(), p.escName] as [() => Type, qu.__String]),
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
  qf.get.typeOfSymbolAtLocation(symbol: Symbol, node: Node): Type;
  getDeclaredTypeOfSymbol(symbol: Symbol): Type;
  getPrivateIdentifierPropertyOfType(leftType: Type, name: string, location: Node): Symbol | undefined;
  qf.get.typeOfPropertyOfType(type: Type, propertyName: string): Type | undefined;
  qf.get.indexInfoOfType(type: Type, kind: qt.IndexKind): IndexInfo | undefined;
  getBaseTypeOfLiteralType(type: Type): Type;
  qf.get.widenedType(type: Type): Type;
  getPromisedTypeOfPromise(promise: Type, errorNode?: Node): Type | undefined;
  getAwaitedType(type: Type): Type | undefined;
  getParamType(signature: Signature, paramIndex: number): Type;
  getNullableType(type: Type, flags: qt.TypeFlags): Type;
  typeToTypeNode(type: Type, enclosingDeclaration: Node | undefined, flags: qt.NodeBuilderFlags | undefined): Typing | undefined;
  typeToTypeNode(type: Type, enclosingDeclaration: Node | undefined, flags: qt.NodeBuilderFlags | undefined, tracker?: SymbolTracker): Typing | undefined;
  signatureToSignatureDeclaration(
    signature: Signature,
    kind: Syntax,
    enclosingDeclaration: Node | undefined,
    flags: qt.NodeBuilderFlags | undefined
  ): (SignatureDeclaration & { typeArgs?: Nodes<Typing> }) | undefined;
  signatureToSignatureDeclaration(
    signature: Signature,
    kind: Syntax,
    enclosingDeclaration: Node | undefined,
    flags: qt.NodeBuilderFlags | undefined,
    tracker?: SymbolTracker
  ): (SignatureDeclaration & { typeArgs?: Nodes<Typing> }) | undefined;
  indexInfoToIndexSignatureDeclaration(indexInfo: IndexInfo, kind: qt.IndexKind, enclosingDeclaration: Node | undefined, flags: qt.NodeBuilderFlags | undefined): IndexSignatureDeclaration | undefined;
  indexInfoToIndexSignatureDeclaration(
    indexInfo: IndexInfo,
    kind: qt.IndexKind,
    enclosingDeclaration: Node | undefined,
    flags: qt.NodeBuilderFlags | undefined,
    tracker?: SymbolTracker
  ): IndexSignatureDeclaration | undefined;
  symbolToEntityName(symbol: Symbol, meaning: qt.SymbolFlags, enclosingDeclaration: Node | undefined, flags: qt.NodeBuilderFlags | undefined): EntityName | undefined;
  symbolToExpression(symbol: Symbol, meaning: qt.SymbolFlags, enclosingDeclaration: Node | undefined, flags: qt.NodeBuilderFlags | undefined): Expression | undefined;
  symbolToTypeParamDeclarations(symbol: Symbol, enclosingDeclaration: Node | undefined, flags: qt.NodeBuilderFlags | undefined): Nodes<TypeParamDeclaration> | undefined;
  symbolToParamDeclaration(symbol: Symbol, enclosingDeclaration: Node | undefined, flags: qt.NodeBuilderFlags | undefined): ParamDeclaration | undefined;
  typeParamToDeclaration(param: TypeParam, enclosingDeclaration: Node | undefined, flags: qt.NodeBuilderFlags | undefined): TypeParamDeclaration | undefined;
  getSymbolsInScope(location: Node, meaning: qt.SymbolFlags): Symbol[];
  getSymbolAtLocation(node: Node): Symbol | undefined;
  getSymbolsOfParamPropertyDeclaration(param: ParamDeclaration, paramName: string): Symbol[];
  getShorthandAssignmentValueSymbol(location: Node): Symbol | undefined;
  getExportSpecifierLocalTargetSymbol(location: ExportSpecifier): Symbol | undefined;
  getExportSymbolOfSymbol(symbol: Symbol): Symbol;
  getPropertySymbolOfDestructuringAssignment(location: Identifier): Symbol | undefined;
  getTypeOfAssignmentPattern(pattern: AssignmentPattern): Type;
  qf.get.typeFromTypeNode(node: Typing): Type;
  signatureToString(signature: Signature, enclosingDeclaration?: Node, flags?: qt.TypeFormatFlags, kind?: qt.SignatureKind): string;
  typeToString(type: Type, enclosingDeclaration?: Node, flags?: qt.TypeFormatFlags): string;
  symbolToString(s: Symbol, decl?: Node, meaning?: qt.SymbolFlags, flags?: qt.SymbolFormatFlags): string;
  typePredicateToString(predicate: TypePredicate, enclosingDeclaration?: Node, flags?: qt.TypeFormatFlags): string;
  writeSignature(signature: Signature, enclosingDeclaration?: Node, flags?: qt.TypeFormatFlags, kind?: qt.SignatureKind, writer?: EmitTextWriter): string;
  writeType(type: Type, enclosingDeclaration?: Node, flags?: qt.TypeFormatFlags, writer?: EmitTextWriter): string;
  writeSymbol(symbol: Symbol, enclosingDeclaration?: Node, meaning?: qt.SymbolFlags, flags?: qt.SymbolFormatFlags, writer?: EmitTextWriter): string;
  writeTypePredicate(predicate: TypePredicate, enclosingDeclaration?: Node, flags?: qt.TypeFormatFlags, writer?: EmitTextWriter): string;
  qf.get.fullyQualifiedName(symbol: Symbol): string;
  getRootSymbols(symbol: Symbol): readonly Symbol[];
  getContextualType(node: Expression): Type | undefined;
  getContextualType(node: Expression, contextFlags?: qt.ContextFlags): Type | undefined;
  getContextualTypeForObjectLiteralElem(elem: ObjectLiteralElemLike): Type | undefined;
  getContextualTypeForArgAtIndex(call: CallLikeExpression, argIndex: number): Type | undefined;
  getContextualTypeForJsxAttribute(attribute: JsxAttribute | JsxSpreadAttribute): Type | undefined;
  qf.is.contextSensitive(node: Expression | MethodDeclaration | ObjectLiteralElemLike | JsxAttributeLike): boolean;
  getResolvedSignature(node: CallLikeExpression, candidatesOutArray?: Signature[], argCount?: number): Signature | undefined;
  getResolvedSignatureForSignatureHelp(node: CallLikeExpression, candidatesOutArray?: Signature[], argCount?: number): Signature | undefined;
  getExpandedParams(sig: Signature): readonly (readonly Symbol[])[];
  hasEffectiveRestParam(sig: Signature): boolean;
  qf.get.signatureFromDeclaration(declaration: SignatureDeclaration): Signature | undefined;
  isImplementationOfOverload(node: SignatureDeclaration): boolean | undefined;
  isUndefinedSymbol(symbol: Symbol): boolean;
  isArgsSymbol(symbol: Symbol): boolean;
  isUnknownSymbol(symbol: Symbol): boolean;
  qf.get.mergedSymbol(symbol: Symbol): Symbol;
  getConstantValue(node: EnumMember | PropertyAccessExpression | ElemAccessExpression): string | number | undefined;
  isValidPropertyAccess(node: PropertyAccessExpression | QualifiedName | ImportTyping, propertyName: string): boolean;
  isValidPropertyAccessForCompletions(node: PropertyAccessExpression | ImportTyping | QualifiedName, type: Type, property: Symbol): boolean;
  getImmediateAliasedSymbol(symbol: Symbol): Symbol | undefined;
  qf.get.exportsOfModule(moduleSymbol: Symbol): Symbol[];
  getExportsAndPropertiesOfModule(moduleSymbol: Symbol): Symbol[];
  getJsxIntrinsicTagNamesAt(location: Node): Symbol[];
  isOptionalParam(node: ParamDeclaration): boolean;
  getAmbientModules(): Symbol[];
  tryGetMemberInModuleExports(memberName: string, moduleSymbol: Symbol): Symbol | undefined;
  tryGetMemberInModuleExportsAndProperties(memberName: string, moduleSymbol: Symbol): Symbol | undefined;
  getApparentType(type: Type): Type;
  getSuggestedSymbolForNonexistentProperty(name: Identifier | PrivateIdentifier | string, containingType: Type): Symbol | undefined;
  getSuggestionForNonexistentProperty(name: Identifier | PrivateIdentifier | string, containingType: Type): string | undefined;
  getSuggestedSymbolForNonexistentSymbol(location: Node, name: string, meaning: qt.SymbolFlags): Symbol | undefined;
  getSuggestionForNonexistentSymbol(location: Node, name: string, meaning: qt.SymbolFlags): string | undefined;
  qf.get.suggestedSymbolForNonexistentModule(node: Identifier, target: Symbol): Symbol | undefined;
  getSuggestionForNonexistentExport(node: Identifier, target: Symbol): string | undefined;
  getAnyType(): Type;
  getStringType(): Type;
  getNumberType(): Type;
  getBooleanType(): Type;
  getFalseType(fresh?: boolean): Type;
  getTrueType(fresh?: boolean): Type;
  getVoidType(): Type;
  getUndefinedType(): Type;
  getNullType(): Type;
  getESSymbolType(): Type;
  qf.get.unionType(types: Type[], subtypeReduction?: qt.UnionReduction): Type;
  createArrayType(elemType: Type): Type;
  getElemTypeOfArrayType(arrayType: Type): Type | undefined;
  createPromiseType(type: Type): Type;
  qf.is.typeAssignableTo(source: Type, target: Type): boolean;
  qf.create.anonymousType(
    symbol: Symbol | undefined,
    members: SymbolTable,
    callSignatures: Signature[],
    constructSignatures: Signature[],
    stringIndexInfo: IndexInfo | undefined,
    numberIndexInfo: IndexInfo | undefined
  ): Type;
  qf.create.signature(
    declaration: SignatureDeclaration,
    typeParams: TypeParam[] | undefined,
    thisParam: Symbol | undefined,
    params: Symbol[],
    resolvedReturn: Type,
    typePredicate: TypePredicate | undefined,
    minArgCount: number,
    flags: qt.SignatureFlags
  ): Signature;
  qf.create.indexInfo(type: Type, isReadonly: boolean, declaration?: SignatureDeclaration): IndexInfo;
  isSymbolAccessible(symbol: Symbol, enclosingDeclaration: Node | undefined, meaning: qt.SymbolFlags, shouldComputeAliasToMarkVisible: boolean): SymbolAccessibilityResult;
  tryFindAmbientModuleWithoutAugmentations(moduleName: string): Symbol | undefined;
  getSymbolWalker(accept?: (symbol: Symbol) => boolean): SymbolWalker;
  getDiagnostics(sourceFile?: SourceFile, cancellationToken?: CancellationToken): qd.Diagnostic[];
  getGlobalDiagnostics(): qd.Diagnostic[];
  getEmitResolver(sourceFile?: SourceFile, cancellationToken?: CancellationToken): EmitResolver;
  getRelationCacheSizes(): { assignable: number; identity: number; subtype: number; strictSubtype: number };
  qf.is.arrayType(type: Type): boolean;
  qf.is.tupleType(type: Type): boolean;
  qf.is.arrayLikeType(type: Type): boolean;
  isTypeInvalidDueToUnionDiscriminant(contextualType: Type, obj: ObjectLiteralExpression | JsxAttributes): boolean;
  getAllPossiblePropertiesOfTypes(type: readonly Type[]): Symbol[];
  resolveName(name: string, location: Node | undefined, meaning: qt.SymbolFlags, excludeGlobals: boolean): Symbol | undefined;
  getJsxNamespace(location?: Node): string;
  qf.get.accessibleSymbolChain(symbol: Symbol, enclosingDeclaration: Node | undefined, meaning: qt.SymbolFlags, useOnlyExternalAliasing: boolean): Symbol[] | undefined;
  getTypePredicateOfSignature(signature: Signature): TypePredicate | undefined;
  resolveExternalModuleName(moduleSpecifier: Expression): Symbol | undefined;
  resolveExternalModuleSymbol(symbol: Symbol): Symbol;
  tryGetThisTypeAt(node: Node, includeGlobalThis?: boolean): Type | undefined;
  getTypeArgConstraint(node: Typing): Type | undefined;
  getSuggestionDiagnostics(file: SourceFile, cancellationToken?: CancellationToken): readonly qd.DiagnosticWithLocation[];
  runWithCancellationToken<T>(token: CancellationToken, cb: (checker: TypeChecker) => T): T;
  getLocalTypeParamsOfClassOrInterfaceOrTypeAlias(symbol: Symbol): readonly TypeParam[] | undefined;
  qf.is.declarationVisible(node: Declaration | AnyImportSyntax): boolean;
}
*/