import { newCheck, Fcheck } from './check';
import { newCreate, Fcreate, newInstantiate, Finstantiate, newResolve, Fresolve } from './create';
import { newGet, Fget } from './get';
import { newHas, Fhas, newIs, Fis } from './groups';
import { Node, ObjectFlags, SignatureFlags, SymbolFlags, TypeFlags } from './types';
import * as qb from './bases';
import * as qc from '../core';
import * as qd from '../diags';
import * as qt from './types';
import * as qu from '../utils';
export interface Frame extends qc.Frame {
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
  newResolve(f);
  return f;
}
export const qf = newFrame();

export function newChecker(host: qt.TypeCheckerHost, produceDiagnostics: boolean): Frame & qt.TypeChecker {
  const compilerOpts = host.getCompilerOpts();
  const allowSyntheticDefaultImports = getAllowSyntheticDefaultImports(compilerOpts);
  const emptySymbols = new qb.SymbolTable();
  const anyFunctionType = qf.create.anonymousType(undefined, emptySymbols, qu.empty, qu.empty, undefined, undefined);
  const anyType = qf.create.intrinsicType(TypeFlags.Any, 'any');
  const anyIterationTypes = qf.create.iterationTypes(anyType, anyType, anyType);
  const unknownType = qf.create.intrinsicType(TypeFlags.Unknown, 'unknown');
  const anyIterationTypesExceptNext = qf.create.iterationTypes(anyType, anyType, unknownType);
  const anySignature = qf.create.signature(undefined, undefined, undefined, qu.empty, anyType, undefined, 0, SignatureFlags.None);
  const argsSymbol = new qb.Symbol(SymbolFlags.Property, 'args' as qu.__String);
  const arrayVariances = [qt.VarianceFlags.Covariant];
  const autoType = qf.create.intrinsicType(TypeFlags.Any, 'any');
  const bigintType = qf.create.intrinsicType(TypeFlags.BigInt, 'bigint');
  const regularFalseType = qf.create.intrinsicType(TypeFlags.BooleanLiteral, 'false') as qt.FreshableIntrinsicType;
  const regularTrueType = qf.create.intrinsicType(TypeFlags.BooleanLiteral, 'true') as qt.FreshableIntrinsicType;
  const booleanType = qf.create.booleanType([regularFalseType, regularTrueType]);
  const circularConstraintType = qf.create.anonymousType(undefined, emptySymbols, qu.empty, qu.empty, undefined, undefined);
  const neverType = qf.create.intrinsicType(TypeFlags.Never, 'never');
  const undefinedType = qf.create.intrinsicType(TypeFlags.Undefined, 'undefined');
  const defaultIterationTypes = qf.create.iterationTypes(neverType, anyType, undefinedType);
  const emitResolver = createResolver();
  const emptyGenericType = <qt.GenericType>(<qt.ObjectType>qf.create.anonymousType(undefined, emptySymbols, qu.empty, qu.empty, undefined, undefined));
  const emptyJsxObjectType = qf.create.anonymousType(undefined, emptySymbols, qu.empty, qu.empty, undefined, undefined);
  const emptyObjectType = qf.create.anonymousType(undefined, emptySymbols, qu.empty, qu.empty, undefined, undefined);
  const emptyTypeLiteralSymbol = new qb.Symbol(SymbolFlags.TypeLiteral, qt.InternalSymbol.Type);
  const emptyTypeLiteralType = qf.create.anonymousType(emptyTypeLiteralSymbol, emptySymbols, qu.empty, qu.empty, undefined, undefined);
  const stringType = qf.create.intrinsicType(TypeFlags.String, 'string');
  const enumNumberIndexInfo = qf.create.indexInfo(stringType, true);
  const errorType = qf.create.intrinsicType(TypeFlags.Any, 'error');
  const esSymbolType = qf.create.intrinsicType(TypeFlags.ESSymbol, 'symbol');
  const falseType = qf.create.intrinsicType(TypeFlags.BooleanLiteral, 'false') as qt.FreshableIntrinsicType;
  const freshObjectLiteralFlag = compilerOpts.suppressExcessPropertyErrors ? 0 : ObjectFlags.FreshLiteral;
  const globals = new qb.SymbolTable();
  const globalThisSymbol = new qb.Symbol(SymbolFlags.Module, 'globalThis' as qu.__String, qt.CheckFlags.Readonly);
  const implicitNeverType = qf.create.intrinsicType(TypeFlags.Never, 'never');
  const iterationTypesCache = new qu.QMap<qt.IterationTypes>();
  const numberType = qf.create.intrinsicType(TypeFlags.Number, 'number');
  const stringNumberSymbolType = qf.get.unionType([stringType, numberType, esSymbolType]);
  const keyofStringsOnly = !!compilerOpts.keyofStringsOnly;
  const keyofConstraintType = keyofStringsOnly ? stringType : stringNumberSymbolType;
  const languageVersion = getEmitScriptTarget(compilerOpts);
  const markerOtherType = qf.create.typeParam();
  const markerSubType = qf.create.typeParam();
  const markerSuperType = qf.create.typeParam();
  const moduleKind = getEmitModuleKind(compilerOpts);
  const noConstraintType = qf.create.anonymousType(undefined, emptySymbols, qu.empty, qu.empty, undefined, undefined);
  const nodeBuilder = createNodeBuilder();
  const noImplicitAny = getStrictOptionValue(compilerOpts, 'noImplicitAny');
  const noImplicitThis = getStrictOptionValue(compilerOpts, 'noImplicitThis');
  const nonInferrableAnyType = qf.create.intrinsicType(TypeFlags.Any, 'any', ObjectFlags.ContainsWideningType);
  const nonInferrableType = qf.create.intrinsicType(TypeFlags.Never, 'never', ObjectFlags.NonInferrableType);
  const nonPrimitiveType = qf.create.intrinsicType(TypeFlags.NonPrimitive, 'object');
  const noTypePredicate = qf.create.typePredicate(qt.TypePredicateKind.Identifier, '<<unresolved>>', 0, anyType);
  const nullType = qf.create.intrinsicType(TypeFlags.Null, 'null');
  const strictNullChecks = getStrictOptionValue(compilerOpts, 'strictNullChecks');
  const nullWideningType = strictNullChecks ? nullType : qf.create.intrinsicType(TypeFlags.Null, 'null', ObjectFlags.ContainsWideningType);
  const numberOrBigIntType = qf.get.unionType([numberType, bigintType]);
  const optionalType = qf.create.intrinsicType(TypeFlags.Undefined, 'undefined');
  const permissiveMapper: qt.TypeMapper = makeFunctionTypeMapper((t) => (t.flags & qt.TypeFlags.TypeParam ? wildcardType : t));
  const requireSymbol = new qb.Symbol(SymbolFlags.Property, 'require' as qu.__String);
  const resolvingDefaultType = qf.create.anonymousType(undefined, emptySymbols, qu.empty, qu.empty, undefined, undefined);
  const resolvingSignature = qf.create.signature(undefined, undefined, undefined, qu.empty, anyType, undefined, 0, SignatureFlags.None);
  const restrictiveMapper: qt.TypeMapper = makeFunctionTypeMapper((t) => (t.flags & qt.TypeFlags.TypeParam ? getRestrictiveTypeParam(<qt.TypeParam>t) : t));
  const silentNeverType = qf.create.intrinsicType(TypeFlags.Never, 'never');
  const silentNeverSignature = qf.create.signature(undefined, undefined, undefined, qu.empty, silentNeverType, undefined, 0, SignatureFlags.None);
  const strictBindCallApply = getStrictOptionValue(compilerOpts, 'strictBindCallApply');
  const strictFunctionTypes = getStrictOptionValue(compilerOpts, 'strictFunctionTypes');
  const strictPropertyInitialization = getStrictOptionValue(compilerOpts, 'strictPropertyInitialization');
  const trueType = qf.create.intrinsicType(TypeFlags.BooleanLiteral, 'true') as qt.FreshableIntrinsicType;
  const undefinedSymbol = new qb.Symbol(SymbolFlags.Property, 'undefined' as qu.__String);
  const undefinedWideningType = strictNullChecks ? undefinedType : qf.create.intrinsicType(TypeFlags.Undefined, 'undefined', ObjectFlags.ContainsWideningType);
  const unknownSignature = qf.create.signature(undefined, undefined, undefined, qu.empty, errorType, undefined, 0, SignatureFlags.None);
  const unreachableNeverType = qf.create.intrinsicType(TypeFlags.Never, 'never');
  const voidType = qf.create.intrinsicType(TypeFlags.Void, 'void');
  const wildcardType = qf.create.intrinsicType(TypeFlags.Any, 'any');
  const tupleTypes = new qu.QMap<qt.GenericType>();
  const unionTypes = new qu.QMap<qt.UnionType>();
  const intersectionTypes = new qu.QMap<qt.Type>();
  const literalTypes = new qu.QMap<qt.LiteralType>();
  const indexedAccessTypes = new qu.QMap<qt.IndexedAccessType>();
  const substitutionTypes = new qu.QMap<qt.SubstitutionType>();
  const evolvingArrayTypes: qt.EvolvingArrayType[] = [];
  const undefinedProperties = new qu.QMap<qt.Symbol>() as EscapedMap<qt.Symbol>;
  const reverseMappedCache = new qu.QMap<qt.Type | undefined>();
  const emptyStringType = qf.get.literalType('');
  const zeroType = qf.get.literalType(0);
  const zeroBigIntType = qf.get.literalType({ negative: false, base10Value: '0' });
  const resolutionTargets: TypeSystemEntity[] = [];
  const resolutionResults: boolean[] = [];
  const resolutionPropertyNames: TypeSystemPropertyName[] = [];
  const maximumSuggestionCount = 10;
  const mergedSymbols: qt.Symbol[] = [];
  const symbolLinks: qt.SymbolLinks[] = [];
  const flowLoopCaches: qu.QMap<qt.Type>[] = [];
  const flowLoopNodes: qt.FlowNode[] = [];
  const flowLoopKeys: string[] = [];
  const flowLoopTypes: qt.Type[][] = [];
  const sharedFlowNodes: qt.FlowNode[] = [];
  const sharedFlowTypes: qt.FlowType[] = [];
  const flowNodeReachable: (boolean | undefined)[] = [];
  const flowNodePostSuper: (boolean | undefined)[] = [];
  const potentialThisCollisions: Node[] = [];
  const potentialNewTargetCollisions: Node[] = [];
  const potentialWeakMapCollisions: Node[] = [];
  const awaitedTypeStack: number[] = [];
  const diagnostics = createDiagnosticCollection();
  const suggestionDiagnostics = createDiagnosticCollection();
  const allPotentiallyUnusedIdentifiers = new qu.QMap<PotentiallyUnusedIdentifier[]>();
  const typeofType = createTypeofType();
  const subtypeRelation = new qu.QMap<qt.RelationComparisonResult>();
  const strictSubtypeRelation = new qu.QMap<qt.RelationComparisonResult>();
  const assignableRelation = new qu.QMap<qt.RelationComparisonResult>();
  const comparableRelation = new qu.QMap<qt.RelationComparisonResult>();
  const identityRelation = new qu.QMap<qt.RelationComparisonResult>();
  const enumRelation = new qu.QMap<qt.RelationComparisonResult>();
  const builtinGlobals = new qc.SymbolTable();

  qf.create.booleanType([falseType, regularTrueType]);
  qf.create.booleanType([falseType, trueType]);
  qf.create.booleanType([regularFalseType, trueType]);
  anyFunctionType.objectFlags |= ObjectFlags.NonInferrableType;
  emptyGenericType.instantiations = new qu.QMap<qt.TypeReference>();
  emptyJsxObjectType.objectFlags |= ObjectFlags.JsxAttributes;
  emptyTypeLiteralSymbol.members = new qc.SymbolTable();
  falseType.freshType = falseType;
  falseType.regularType = regularFalseType;
  globals.set(globalThisSymbol.escName, globalThisSymbol);
  globalThisSymbol.declarations = [];
  globalThisSymbol.exports = globals;
  markerSubType.constraint = markerSuperType;
  regularFalseType.freshType = falseType;
  regularFalseType.regularType = regularFalseType;
  regularTrueType.freshType = trueType;
  regularTrueType.regularType = regularTrueType;
  trueType.freshType = trueType;
  trueType.regularType = regularTrueType;
  undefinedSymbol.declarations = [];

  const noIterationTypes: qt.IterationTypes = {
    get yieldType(): qt.Type {
      return qu.fail('Not supported');
    },
    get returnType(): qt.Type {
      return qu.fail('Not supported');
    },
    get nextType(): qt.Type {
      return qu.fail('Not supported');
    },
  };
  const asyncIterationTypesResolver: qt.IterationTypesResolver = {
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
  const syncIterationTypesResolver: qt.IterationTypesResolver = {
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
  const typeofTypesByName: qu.QReadonlyMap<qt.Type> = new qu.QMap<qt.Type>({
    string: stringType,
    number: numberType,
    bigint: bigintType,
    boolean: booleanType,
    symbol: esSymbolType,
    undefined: undefinedType,
  });
  let _jsxNamespace: qu.__String;
  let _jsxFactoryEntity: qt.EntityName | undefined;
  let nextMergeId = 1;
  let nextFlowId = 1;
  let cancellationToken: qt.CancellationToken | undefined;
  let requestedExternalEmitHelpers: qt.ExternalEmitHelpers;
  let externalHelpersModule: qt.Symbol;
  let enumCount = 0;
  let totalInstantiationCount = 0;
  let instantiationCount = 0;
  let instantiationDepth = 0;
  let constraintDepth = 0;
  let currentNode: Node | undefined;
  let apparentArgCount: number | undefined;
  let amalgamatedDuplicates: qu.QMap<DuplicateInfoForFiles> | undefined;
  let inInferTypeForHomomorphicMappedType = false;
  let ambientModulesCache: qt.Symbol[] | undefined;
  let patternAmbientModules: qt.PatternAmbientModule[];
  let patternAmbientModuleAugmentations: qu.QMap<qt.Symbol> | undefined;
  let globalObjectType: qt.ObjectType;
  let globalFunctionType: qt.ObjectType;
  let globalCallableFunctionType: qt.ObjectType;
  let globalNewableFunctionType: qt.ObjectType;
  let globalArrayType: qt.GenericType;
  let globalReadonlyArrayType: qt.GenericType;
  let globalStringType: qt.ObjectType;
  let globalNumberType: qt.ObjectType;
  let globalBooleanType: qt.ObjectType;
  let globalRegExpType: qt.ObjectType;
  let globalThisType: qt.GenericType;
  let anyArrayType: qt.Type;
  let autoArrayType: qt.Type;
  let anyReadonlyArrayType: qt.Type;
  let deferredGlobalNonNullableTypeAlias: qt.Symbol;
  let deferredGlobalESSymbolConstructorSymbol: qt.Symbol | undefined;
  let deferredGlobalESSymbolType: qt.ObjectType;
  let deferredGlobalTypedPropertyDescriptorType: qt.GenericType;
  let deferredGlobalPromiseType: qt.GenericType;
  let deferredGlobalPromiseLikeType: qt.GenericType;
  let deferredGlobalPromiseConstructorSymbol: qt.Symbol | undefined;
  let deferredGlobalPromiseConstructorLikeType: qt.ObjectType;
  let deferredGlobalIterableType: qt.GenericType;
  let deferredGlobalIteratorType: qt.GenericType;
  let deferredGlobalIterableIteratorType: qt.GenericType;
  let deferredGlobalGeneratorType: qt.GenericType;
  let deferredGlobalIteratorYieldResultType: qt.GenericType;
  let deferredGlobalIteratorReturnResultType: qt.GenericType;
  let deferredGlobalAsyncIterableType: qt.GenericType;
  let deferredGlobalAsyncIteratorType: qt.GenericType;
  let deferredGlobalAsyncIterableIteratorType: qt.GenericType;
  let deferredGlobalAsyncGeneratorType: qt.GenericType;
  let deferredGlobalTemplateStringsArrayType: qt.ObjectType;
  let deferredGlobalImportMetaType: qt.ObjectType;
  let deferredGlobalExtractSymbol: qt.Symbol;
  let deferredGlobalOmitSymbol: qt.Symbol;
  let deferredGlobalBigIntType: qt.ObjectType;
  let flowLoopStart = 0;
  let flowLoopCount = 0;
  let sharedFlowCount = 0;
  let flowAnalysisDisabled = false;
  let flowInvocationCount = 0;
  let lastFlowNode: qt.FlowNode | undefined;
  let lastFlowNodeReachable: boolean;
  let flowTypeCache: qt.Type[] | undefined;
  let suggestionCount = 0;

  const checker = qc.newFrame() as Frame;
  newCheck(checker);
  newCreate(checker);
  newGet(checker);
  newHas(checker);
  newInstantiate(checker);
  newIs(checker);
  newResolve(checker);
  class Symbol extends qb.Symbol {
    static nextId = 1;
    static count = 0;
    _id?: number;
    constructor(f: SymbolFlags, n: qu.__String, c?: qt.CheckFlags) {
      super(f, n, c);
      Symbol.count++;
    }
    get id() {
      if (!this._id) {
        this._id = Symbol.nextId;
        Symbol.nextId++;
      }
      return this._id;
    }
    get links(): qt.SymbolLinks {
      if (this.isTransient()) return this;
      const i = this.id;
      return symbolLinks[i] || (symbolLinks[i] = {} as qt.SymbolLinks);
    }
    clone() {
      const r = new Symbol(this.flags, this.escName);
      r.declarations = this.declarations ? this.declarations.slice() : [];
      r.parent = this.parent;
      if (this.valueDeclaration) r.valueDeclaration = this.valueDeclaration;
      if (this.constEnumOnlyModule) r.constEnumOnlyModule = true;
      if (this.members) r.members = qc.cloneMap(this.members);
      if (this.exports) r.exports = qc.cloneMap(this.exports);
      this.recordMerged(r);
      return r;
    }
    private recordMerged(s: Symbol) {
      if (!this.mergeId) {
        this.mergeId = nextMergeId;
        nextMergeId++;
      }
      mergedSymbols[this.mergeId] = s;
    }
    markAliasReferenced(n: Node) {
      if (this.isNonLocalAlias(SymbolFlags.Value) && !qf.is.inTypeQuery(n) && !this.getTypeOnlyAliasDeclaration()) {
        if ((compilerOpts.preserveConstEnums && isExportOrExportExpression(n)) || !isConstEnumOrConstEnumOnlyModule(this.resolveAlias())) this.markAliasSymbolAsReferenced();
        else this.markConstEnumAliasAsReferenced();
      }
    }
    markAliasSymbolAsReferenced() {
      const ls = this.links;
      if (!ls.referenced) {
        ls.referenced = true;
        const d = this.getDeclarationOfAliasSymbol();
        qf.assert.true(d);
        if (qf.is.internalModuleImportEqualsDeclaration(d)) {
          const t = this.resolveSymbol();
          if (t === unknownSymbol || (t && t.flags & SymbolFlags.Value)) qf.check.expressionCached(d.moduleReference);
        }
      }
    }
  }
  const unknownSymbol = new Symbol(SymbolFlags.Property, 'unknown' as qu.__String);
  const resolvingSymbol = new Symbol(0, InternalSymbol.Resolving);

  return checker;
}
