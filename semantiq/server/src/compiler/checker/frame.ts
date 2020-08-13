import { newCheck, Fcheck } from './check';
import { newCreate, Fcreate, newInstantiate, Finstantiate, newResolve, Fresolve } from './create';
import { newGet, Fget } from './get';
import { newHas, Fhas, newIs, Fis } from './groups';
import { ObjectFlags, SymbolFlags, TypeFlags } from './types';
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
