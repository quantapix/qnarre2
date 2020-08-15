import { newCheck, Fcheck } from './check';
import { newCreate, Fcreate, newInstantiate, Finstantiate, newResolve, Fresolve } from './create';
import { newGet, Fget } from './get';
import { newHas, Fhas, newIs, Fis } from './groups';
import { ObjectFlags, SignatureFlags, SymbolFlags, TypeFlags } from './types';
import * as qb from './bases';
import * as qc from '../core';
import * as qd from '../diags';
import * as qt from './types';
import * as qu from '../utils';
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
  newResolve(f);
  return f;
}
export const qf = newFrame();

export function create(host: qt.TypeCheckerHost, produceDiagnostics: boolean): qt.TypeChecker {
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
}
