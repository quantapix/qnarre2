import * as qc from '../core';
import * as qd from '../diagnostic';
import { CheckFlags, InternalSymbol, ModifierFlags, Node, NodeFlags, SymbolFlags } from '../type';
import * as qt from '../type';
import * as qu from '../util';
import { Syntax } from '../syntax';
import * as qy from '../syntax';
import { qf } from './frame';
class SymbolTable extends qc.SymbolTable<Symbol> {
  addInheritedMembers(ss: Symbol[]) {
    for (const s of ss) {
      if (!this.has(s.escName) && !s.isStaticPrivateIdentifierProperty()) this.set(s.escName, s);
    }
  }
  fetch(n: qu.__String, f: SymbolFlags): Symbol | undefined {
    if (f) {
      const s = qf.get.mergedSymbol(this.get(n));
      if (s) {
        qu.assert((s.checkFlags() & CheckFlags.Instantiated) === 0);
        if (s.flags & f) return s;
        if (s.flags & SymbolFlags.Alias) {
          const t = s.resolveAlias();
          if (t === unknownSymbol || t.flags & f) return s;
        }
      }
    }
    return;
  }
  namedMembers(): Symbol[] {
    let r: Symbol[] | undefined;
    this.forEach((s, n) => {
      if (!qy.is.reservedName(n) && symbolIsValue(s)) (r || (r = [])).push(s);
    });
    return r || qu.empty;
  }
  visit(suppressNewPrivateContext?: boolean, propertyAsAlias?: boolean) {
    const o = deferredPrivates;
    if (!suppressNewPrivateContext) deferredPrivates = new qu.QMap();
    this.forEach((s) => s.serializeSymbol(false, !!propertyAsAlias));
    if (!suppressNewPrivateContext) {
      deferredPrivates!.forEach((s: Symbol) => s.serializeSymbol(true, !!propertyAsAlias));
    }
    deferredPrivates = o;
  }
  toArray(): Symbol[] {
    const r = [] as Symbol[];
    this.forEach((s, n) => {
      if (!qy.is.reservedName(n)) r.push(s);
    });
    return r;
  }
}
export class Type extends qc.Type {
  includeMixinType(type: Type, types: readonly Type[], mixinFlags: readonly boolean[], index: number): Type {
    const mixedTypes: Type[] = [];
    for (let i = 0; i < types.length; i++) {
      if (i === index) mixedTypes.push(type);
      else if (mixinFlags[i]) {
        mixedTypes.push(qf.get.returnTypeOfSignature(getSignaturesOfType(types[i], SignatureKind.Construct)[0]));
      }
    }
    return qf.get.intersectionType(mixedTypes);
  }
  prependTypeMapping(source: Type, target: Type, mapper: TypeMapper | undefined) {
    return !mapper ? makeUnaryTypeMapper(source, target) : makeCompositeTypeMapper(TypeMapKind.Merged, makeUnaryTypeMapper(source, target), mapper);
  }
  typeCouldHaveTopLevelSingletonTypes(type: Type): boolean {
    if (type.flags & qt.TypeFlags.UnionOrIntersection) return !!forEach((type as IntersectionType).types, typeCouldHaveTopLevelSingletonTypes);
    if (type.flags & qt.TypeFlags.Instantiable) {
      const constraint = getConstraintOfType(type);
      if (constraint) return typeCouldHaveTopLevelSingletonTypes(constraint);
    }
    return isUnitType(type);
  }
  unwrapReturnType(returnType: Type, functionFlags: FunctionFlags) {
    const isGenerator = !!(functionFlags & FunctionFlags.Generator);
    const isAsync = !!(functionFlags & FunctionFlags.Async);
    return isGenerator ? getIterationTypeOfGeneratorFunctionReturnType(IterationTypeKind.Return, returnType, isAsync) ?? errorType : isAsync ? getAwaitedType(returnType) ?? errorType : returnType;
  }
  typeHasCallOrConstructSignatures(type: Type): boolean {
    return type.hasCallOrConstructSignatures(checker);
  }
  findMatchingDiscriminantType(source: Type, target: Type, isRelatedTo: (source: Type, target: Type) => Ternary, skipPartial?: boolean) {
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
  findMatchingTypeReferenceOrTypeAliasReference(source: Type, unionTarget: UnionOrIntersectionType) {
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
  findBestTypeForObjectLiteral(source: Type, unionTarget: UnionOrIntersectionType) {
    if (getObjectFlags(source) & ObjectFlags.ObjectLiteral && forEachType(unionTarget, qf.is.arrayLikeType)) return find(unionTarget.types, (t) => !qf.is.arrayLikeType(t));
  }
  findBestTypeForInvokable(source: Type, unionTarget: UnionOrIntersectionType) {
    let signatureKind = SignatureKind.Call;
    const hasSignatures = getSignaturesOfType(source, signatureKind).length > 0 || ((signatureKind = SignatureKind.Construct), getSignaturesOfType(source, signatureKind).length > 0);
    if (hasSignatures) return find(unionTarget.types, (t) => getSignaturesOfType(t, signatureKind).length > 0);
  }
  findMostOverlappyType(source: Type, unionTarget: UnionOrIntersectionType) {
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
  setCachedIterationTypes(type: Type, cacheKey: MatchingKeys<IterableOrIteratorType, IterationTypes | undefined>, cachedTypes: IterationTypes) {
    return ((type as IterableOrIteratorType)[cacheKey] = cachedTypes);
  }
  convertAutoToAny(type: Type) {
    return type === autoType ? anyType : type === autoArrayType ? anyArrayType : type;
  }
  maybeTypeOfKind(type: Type, kind: qt.TypeFlags): boolean {
    if (type.flags & kind) return true;
    if (type.flags & qt.TypeFlags.UnionOrIntersection) {
      const types = (<UnionOrIntersectionType>type).types;
      for (const t of types) {
        if (maybeTypeOfKind(t, kind)) return true;
      }
    }
    return false;
  }
  allTypesAssignableToKind(source: Type, kind: qt.TypeFlags, strict?: boolean): boolean {
    return source.flags & qt.TypeFlags.Union ? every((source as UnionType).types, (subType) => allTypesAssignableToKind(subType, kind, strict)) : qf.is.typeAssignableToKind(source, kind, strict);
  }

  typeMaybeAssignableTo(source: Type, target: Type) {
    if (!(source.flags & qt.TypeFlags.Union)) return qf.is.typeAssignableTo(source, target);
    for (const t of (<UnionType>source).types) {
      if (qf.is.typeAssignableTo(t, target)) return true;
    }
    return false;
  }
  eachTypeContainedIn(source: Type, types: Type[]) {
    return source.flags & qt.TypeFlags.Union ? !forEach((<UnionType>source).types, (t) => !contains(types, t)) : contains(types, source);
  }
  forEachType<T>(type: Type, f: (t: Type) => T | undefined): T | undefined {
    return type.flags & qt.TypeFlags.Union ? forEach((<UnionType>type).types, f) : f(type);
  }
  everyType(type: Type, f: (t: Type) => boolean): boolean {
    return type.flags & qt.TypeFlags.Union ? every((<UnionType>type).types, f) : f(type);
  }
  filterType(type: Type, f: (t: Type) => boolean): Type {
    if (type.flags & qt.TypeFlags.Union) {
      const types = (<UnionType>type).types;
      const filtered = filter(types, f);
      return filtered === types ? type : qf.get.unionTypeFromSortedList(filtered, (<UnionType>type).objectFlags);
    }
    return type.flags & qt.TypeFlags.Never || f(type) ? type : neverType;
  }
  countTypes(type: Type) {
    return type.flags & qt.TypeFlags.Union ? (type as UnionType).types.length : 1;
  }
  mapType(type: Type, mapper: (t: Type) => Type, noReductions?: boolean): Type;
  mapType(type: Type, mapper: (t: Type) => Type | undefined, noReductions?: boolean): Type | undefined;
  mapType(type: Type, mapper: (t: Type) => Type | undefined, noReductions?: boolean): Type | undefined {
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
  acceptsVoid(t: Type): boolean {
    return !!(t.flags & qt.TypeFlags.Void);
  }
  typeHasNullableConstraint(type: Type) {
    return type.flags & qt.TypeFlags.InstantiableNonPrimitive && maybeTypeOfKind(qf.get.baseConstraintOfType(type) || unknownType, qt.TypeFlags.Nullable);
  }
  extractTypesOfKind(type: Type, kind: qt.TypeFlags) {
    return filterType(type, (t) => (t.flags & kind) !== 0);
  }
  replacePrimitivesWithLiterals(typeWithPrimitives: Type, typeWithLiterals: Type) {
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
  typesDefinitelyUnrelated(source: Type, target: Type) {
    return (
      (qf.is.tupleType(source) && qf.is.tupleType(target) && tupleTypesDefinitelyUnrelated(source, target)) ||
      (!!getUnmatchedProperty(source, target, true) && !!getUnmatchedProperty(target, source, true))
    );
  }

  couldContainTypeVariables(type: Type): boolean {
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
  inferTypeForHomomorphicMappedType(source: Type, target: MappedType, constraint: IndexType): Type | undefined {
    if (inInferTypeForHomomorphicMappedType) return;
    const key = source.id + ',' + target.id + ',' + constraint.id;
    if (reverseMappedCache.has(key)) return reverseMappedCache.get(key);
    inInferTypeForHomomorphicMappedType = true;
    const type = createReverseMappedType(source, target, constraint);
    inInferTypeForHomomorphicMappedType = false;
    reverseMappedCache.set(key, type);
    return type;
  }
  inferReverseMappedType(sourceType: Type, target: MappedType, constraint: IndexType): Type {
    const typeParam = <TypeParam>qf.get.indexedAccessType(constraint.type, getTypeParamFromMappedType(target));
    const templateType = getTemplateTypeFromMappedType(target);
    const inference = createInferenceInfo(typeParam);
    inferTypes([inference], sourceType, templateType);
    return getTypeFromInference(inference) || unknownType;
  }

  removeDefinitelyFalsyTypes(type: Type): Type {
    return getFalsyFlags(type) & qt.TypeFlags.DefinitelyFalsy ? filterType(type, (t) => !(getFalsyFlags(t) & qt.TypeFlags.DefinitelyFalsy)) : type;
  }
  extractDefinitelyFalsyTypes(type: Type): Type {
    return mapType(type, getDefinitelyFalsyPartOfType);
  }
  addOptionalTypeMarker(type: Type) {
    return strictNullChecks ? qf.get.unionType([type, optionalType]) : type;
  }
  removeOptionalTypeMarker(type: Type): Type {
    return strictNullChecks ? filterType(type, isNotOptionalTypeMarker) : type;
  }
  propagateOptionalTypeMarker(type: Type, node: OptionalChain, wasOptional: boolean) {
    return wasOptional ? (qf.is.outermostOptionalChain(node) ? qf.get.optionalType(type) : addOptionalTypeMarker(type)) : type;
  }
  transformTypeOfMembers(type: Type, f: (propertyType: Type) => Type) {
    const members = new SymbolTable();
    for (const property of getPropertiesOfObjectType(type)) {
      const original = property.typeOfSymbol();
      const updated = f(original);
      members.set(property.escName, updated === original ? property : createSymbolWithType(property, updated));
    }
    return members;
  }
  reportWideningErrorsInType(type: Type): boolean {
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

  compareTypesIdentical(source: Type, target: Type): Ternary {
    return qf.is.typeRelatedTo(source, target, identityRelation) ? Ternary.True : Ternary.False;
  }
  compareTypesAssignable(source: Type, target: Type): Ternary {
    return qf.is.typeRelatedTo(source, target, assignableRelation) ? Ternary.True : Ternary.False;
  }
  compareTypesSubtypeOf(source: Type, target: Type): Ternary {
    return qf.is.typeRelatedTo(source, target, subtypeRelation) ? Ternary.True : Ternary.False;
  }
  areTypesComparable(type1: Type, type2: Type): boolean {
    return isTypeComparableTo(type1, type2) || isTypeComparableTo(type2, type1);
  }

  distributeIndexOverObjectType(objectType: Type, indexType: Type, writing: boolean) {
    if (objectType.flags & qt.TypeFlags.UnionOrIntersection) {
      const types = map((objectType as UnionOrIntersectionType).types, (t) => getSimplifiedType(qf.get.indexedAccessType(t, indexType), writing));
      return objectType.flags & qt.TypeFlags.Intersection || writing ? qf.get.intersectionType(types) : qf.get.unionType(types);
    }
    return;
  }
  distributeObjectOverIndexType(objectType: Type, indexType: Type, writing: boolean) {
    if (indexType.flags & qt.TypeFlags.Union) {
      const types = map((indexType as UnionType).types, (t) => getSimplifiedType(qf.get.indexedAccessType(objectType, t), writing));
      return writing ? qf.get.intersectionType(types) : qf.get.unionType(types);
    }
    return;
  }
  unwrapSubstitution(type: Type): Type {
    if (type.flags & qt.TypeFlags.Substitution) return (type as SubstitutionType).substitute;
    return type;
  }
  eachUnionContains(unionTypes: UnionType[], type: Type) {
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
  insertType(types: Type[], type: Type): boolean {
    const index = binarySearch(types, type, getTypeId, compareNumbers);
    if (index < 0) {
      types.splice(~index, 0, type);
      return true;
    }
    return false;
  }
  addTypeToUnion(typeSet: Type[], includes: qt.TypeFlags, type: Type) {
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

  intersectTypes(type1: Type, type2: Type): Type;
  intersectTypes(type1: Type | undefined, type2: Type | undefined): Type | undefined;
  intersectTypes(type1: Type | undefined, type2: Type | undefined): Type | undefined {
    return !type1 ? type2 : !type2 ? type1 : qf.get.intersectionType([type1, type2]);
  }
  addOptionality(type: Type, optional = true): Type {
    return strictNullChecks && optional ? qf.get.optionalType(type) : type;
  }
  areAllOuterTypeParamsApplied(type: Type): boolean {
    const outerTypeParams = (<InterfaceType>type).outerTypeParams;
    if (outerTypeParams) {
      const last = outerTypeParams.length - 1;
      const typeArgs = getTypeArgs(<TypeReference>type);
      return outerTypeParams[last].symbol !== typeArgs[last].symbol;
    }
    return true;
  }

  widenTypeForVariableLikeDeclaration(type: Type | undefined, declaration: any, reportErrors?: boolean) {
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

  typeToString(
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
}
export class Signature extends qc.Signature {
  combineUnionParams(left: Signature, right: Signature) {
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
  combineSignaturesOfUnionMembers(left: Signature, right: Signature): Signature {
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
  compareSignaturesRelated(
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
      !hasEffectiveRestParam(target) && (checkMode & SignatureCheckMode.StrictArity ? hasEffectiveRestParam(source) || getParamCount(source) > targetCount : getMinArgCount(source) > targetCount);
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
      if (related && checkMode & SignatureCheckMode.StrictArity && i >= getMinArgCount(source) && i < getMinArgCount(target) && compareTypes(sourceType, targetType, false)) related = Ternary.False;
      if (!related) {
        if (reportErrors) {
          errorReporter!(qd.msgs.Types_of_params_0_and_1_are_incompatible, qy.get.unescUnderscores(getParamNameAtPosition(source, i)), qy.get.unescUnderscores(getParamNameAtPosition(target, i)));
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
  compareSignaturesIdentical(source: Signature, target: Signature, partialMatch: boolean, ignoreThisTypes: boolean, ignoreReturnTypes: boolean, compareTypes: (s: Type, t: Type) => Ternary): Ternary {
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
  tryGetTypeAtPosition(signature: Signature, pos: number): Type | undefined {
    const paramCount = signature.params.length - (signature.hasRestParam() ? 1 : 0);
    if (pos < paramCount) return getTypeOfParam(signature.params[pos]);
    if (signature.hasRestParam()) {
      const restType = signature.params[paramCount].typeOfSymbol();
      const index = pos - paramCount;
      if (!qf.is.tupleType(restType) || restType.target.hasRestElem || index < getTypeArgs(restType).length) return qf.get.indexedAccessType(restType, qf.get.literalType(index));
    }
    return;
  }
  inferFromAnnotatedParams(signature: Signature, context: Signature, inferenceContext: InferenceContext) {
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
  assignContextualParamTypes(signature: Signature, context: Signature) {
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
  assignNonContextualParamTypes(signature: Signature) {
    if (signature.thisParam) assignParamType(signature.thisParam);
    for (const param of signature.params) {
      assignParamType(param);
    }
  }

  applyToParamTypes(source: Signature, target: Signature, callback: (s: Type, t: Type) => void) {
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
  applyToReturnTypes(source: Signature, target: Signature, callback: (s: Type, t: Type) => void) {
    const sourceTypePredicate = getTypePredicateOfSignature(source);
    const targetTypePredicate = getTypePredicateOfSignature(target);
    if (sourceTypePredicate && targetTypePredicate && typePredicateKindsMatch(sourceTypePredicate, targetTypePredicate) && sourceTypePredicate.type && targetTypePredicate.type)
      callback(sourceTypePredicate.type, targetTypePredicate.type);
    else {
      callback(qf.get.returnTypeOfSignature(source), qf.get.returnTypeOfSignature(target));
    }
  }

  tryGetRestTypeOfSignature(s: Signature): Type | undefined {
    if (s.hasRestParam()) {
      const sigRestType = s.params[s.params.length - 1].typeOfSymbol();
      const restType = qf.is.tupleType(sigRestType) ? getRestTypeOfTupleType(sigRestType) : sigRestType;
      return restType && qf.get.indexTypeOfType(restType, IndexKind.Number);
    }
    return;
  }
  cloneSignature(sig: Signature): Signature {
    const result = qf.create.signature(sig.declaration, sig.typeParams, sig.thisParam, sig.params, undefined, undefined, sig.minArgCount, sig.flags & SignatureFlags.PropagatingFlags);
    result.target = sig.target;
    result.mapper = sig.mapper;
    result.unions = sig.unions;
    return result;
  }
  signatureToString(signature: Signature, enclosingDeclaration?: Node, flags = TypeFormatFlags.None, kind?: SignatureKind, writer?: EmitTextWriter): string {
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
}
export class Symbol extends qc.Symbol implements qt.TransientSymbol {
  static nextId = 1;
  static count = 0;
  _checkFlags: CheckFlags;
  constructor(f: SymbolFlags, name: qu.__String, c?: CheckFlags) {
    super(f | SymbolFlags.Transient, name);
    Symbol.count++;
    this._checkFlags = c || 0;
  }
  get checkFlags(): CheckFlags {
    return this.isTransient() ? this._checkFlags : 0;
  }
  getId() {
    if (!this.id) {
      this.id = Symbol.nextId;
      Symbol.nextId++;
    }
    return this.id;
  }
  private recordMerged(s: Symbol) {
    if (!this.mergeId) {
      this.mergeId = nextMergeId;
      nextMergeId++;
    }
    mergedSymbols[this.mergeId] = s;
  }
  typeOfSymbolWithDeferredType() {
    const ls = this.getLinks();
    if (!ls.type) {
      qu.assertIsDefined(ls.deferralParent);
      qu.assertIsDefined(ls.deferralConstituents);
      ls.type = ls.deferralParent!.flags & qt.TypeFlags.Union ? qf.get.unionType(ls.deferralConstituents!) : qf.get.intersectionType(ls.deferralConstituents);
    }
    return ls.type;
  }
  typeOfSymbol(): qt.Type {
    const f = this.checkFlags;
    if (f & CheckFlags.DeferredType) return this.typeOfSymbolWithDeferredType();
    if (f & CheckFlags.Instantiated) return this.getTypeOfInstantiatedSymbol();
    if (f & CheckFlags.Mapped) return qf.get.typeOfMappedSymbol(this as MappedSymbol);
    if (f & CheckFlags.ReverseMapped) return qf.get.typeOfReverseMappedSymbol(this as ReverseMappedSymbol);
    const f2 = this.flags;
    if (f2 & (SymbolFlags.Variable | SymbolFlags.Property)) return this.getTypeOfVariableOrParamOrProperty();
    if (f2 & (SymbolFlags.Function | SymbolFlags.Method | SymbolFlags.Class | SymbolFlags.Enum | SymbolFlags.ValueModule)) return this.getTypeOfFuncClassEnumModule();
    if (f2 & SymbolFlags.EnumMember) return this.getTypeOfEnumMember();
    if (f2 & SymbolFlags.Accessor) return this.getTypeOfAccessors();
    if (f2 & SymbolFlags.Alias) return this.getTypeOfAlias();
    return errorType;
  }
  declarationModifierFlags(): ModifierFlags {
    if (this.valueDeclaration) {
      const f = qf.decl.get.combinedModifierFlags(this.valueDeclaration);
      return this.parent && this.parent.flags & SymbolFlags.Class ? f : f & ~ModifierFlags.AccessibilityModifier;
    }
    if (this.isTransient() && this.checkFlags & CheckFlags.Synthetic) {
      const f = this.checkFlags;
      const a = f & CheckFlags.ContainsPrivate ? ModifierFlags.Private : f & CheckFlags.ContainsPublic ? ModifierFlags.Public : ModifierFlags.Protected;
      const s = f & CheckFlags.ContainsStatic ? ModifierFlags.Static : 0;
      return a | s;
    }
    if (this.flags & SymbolFlags.Prototype) return ModifierFlags.Public | ModifierFlags.Static;
    return 0;
  }
  isStaticPrivateIdentifierProperty() {
    const d = this.valueDeclaration;
    return qf.is.privateIdentifierPropertyDeclaration(d) && qf.has.syntacticModifier(d, ModifierFlags.Static);
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
  forEachProperty<T>(prop: Symbol, callback: (p: Symbol) => T): T | undefined {
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
  compareProperties(sourceProp: Symbol, targetProp: Symbol, compareTypes: (source: Type, target: Type) => Ternary): Ternary {
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
  markAliasReferenced(symbol: Symbol, location: Node) {
    if (symbol.isNonLocalAlias(SymbolFlags.Value) && !qf.is.inTypeQuery(location) && !this.getTypeOnlyAliasDeclaration()) {
      if ((compilerOpts.preserveConstEnums && isExportOrExportExpression(location)) || !isConstEnumOrConstEnumOnlyModule(this.resolveAlias())) symbol.markAliasSymbolAsReferenced();
      else symbol.markConstEnumAliasAsReferenced();
    }
  }

  merge(t: Symbol, unidirectional = false): this {
    if (!(t.flags & qc.getExcluded(this.flags)) || (this.flags | t.flags) & SymbolFlags.Assignment) {
      if (this === t) return this;
      if (!(t.flags & SymbolFlags.Transient)) {
        const r = t.resolveSymbol();
        if (r === unknownSymbol) return this;
        t = r?.clone();
      }
      if (this.flags & SymbolFlags.ValueModule && t.flags & SymbolFlags.ValueModule && t.constEnumOnlyModule && !this.constEnumOnlyModule) t.constEnumOnlyModule = false;
      t.flags |= this.flags;
      if (this.valueDeclaration) t.setValueDeclaration(this.valueDeclaration);
      addRange(t.declarations, this.declarations);
      if (this.members) {
        if (!t.members) t.members = new SymbolTable();
        t.members.merge(this.members, unidirectional);
      }
      if (this.exports) {
        if (!t.exports) t.exports = new SymbolTable();
        t.exports.merge(this.exports, unidirectional);
      }
      if (!unidirectional) this.recordMerged(t);
    } else if (t.flags & SymbolFlags.NamespaceModule) {
      if (t !== globalThisSymbol) error(qf.decl.nameOf(this.declarations[0]), qd.Cannot_augment_module_0_with_value_exports_because_it_resolves_to_a_non_module_entity, t.symbolToString());
    } else {
      const isEitherEnum = !!(t.flags & SymbolFlags.Enum || this.flags & SymbolFlags.Enum);
      const isEitherBlockScoped = !!(t.flags & SymbolFlags.BlockScopedVariable || this.flags & SymbolFlags.BlockScopedVariable);
      const message = isEitherEnum
        ? qd.msgs.Enum_declarations_can_only_merge_with_namespace_or_other_enum_declarations
        : isEitherBlockScoped
        ? qd.msgs.Cannot_redeclare_block_scoped_variable_0
        : qd.msgs.Duplicate_identifier_0;
      const sourceSymbolFile = this.declarations && this.declarations[0].sourceFile;
      const targetSymbolFile = t.declarations && t.declarations[0].sourceFile;
      const symbolName = this.symbolToString();
      if (sourceSymbolFile && targetSymbolFile && amalgamatedDuplicates && !isEitherEnum && sourceSymbolFile !== targetSymbolFile) {
        const firstFile = comparePaths(sourceSymbolFile.path, targetSymbolFile.path) === Comparison.LessThan ? sourceSymbolFile : targetSymbolFile;
        const secondFile = firstFile === sourceSymbolFile ? targetSymbolFile : sourceSymbolFile;
        const filesDuplicates = getOrUpdate<DuplicateInfoForFiles>(amalgamatedDuplicates, `${firstFile.path}|${secondFile.path}`, () => ({
          firstFile,
          secondFile,
          conflictingSymbols: new qu.QMap(),
        }));
        const conflictingSymbolInfo = getOrUpdate<DuplicateInfoForSymbol>(filesDuplicates.conflictingSymbols, symbolName, () => ({
          isBlockScoped: isEitherBlockScoped,
          firstFileLocations: [],
          secondFileLocations: [],
        }));
        this.addDuplicates(conflictingSymbolInfo.firstFileLocations);
        t.addDuplicates(conflictingSymbolInfo.secondFileLocations);
      } else {
        const addDuplicateErrors = (s: Symbol, m: qd.Message, n: string) => {
          qu.each(s.declarations, (d) => {
            addDuplicateDeclarationError(d, m, n, this.declarations);
          });
        };
        t.addDuplicateErrors(this, message, symbolName);
        this.addDuplicateErrors(t, message, symbolName);
      }
    }
    return t;
  }
  symbolToString(decl?: Node, meaning?: SymbolFlags, flags: qt.SymbolFormatFlags = qt.SymbolFormatFlags.AllowAnyNodeKind, w?: EmitTextWriter): string {
    let f = qt.NodeBuilderFlags.IgnoreErrors;
    if (flags & qt.SymbolFormatFlags.UseOnlyExternalAliasing) f |= qt.NodeBuilderFlags.UseOnlyExternalAliasing;
    if (flags & qt.SymbolFormatFlags.WriteTypeParamsOrArgs) f |= qt.NodeBuilderFlags.WriteTypeParamsInQualifiedName;
    if (flags & qt.SymbolFormatFlags.UseAliasDefinedOutsideCurrentScope) f |= qt.NodeBuilderFlags.UseAliasDefinedOutsideCurrentScope;
    if (flags & qt.SymbolFormatFlags.DoNotIncludeSymbolChain) f |= qt.NodeBuilderFlags.DoNotIncludeSymbolChain;
    const builder = flags & qt.SymbolFormatFlags.AllowAnyNodeKind ? nodeBuilder.symbolToExpression : nodeBuilder.symbolToEntityName;
    const worker = (w: EmitTextWriter) => {
      const b = builder(this, meaning!, decl, f)!;
      const p = createPrinter({ removeComments: true });
      const s = decl && decl.sourceFile;
      p.writeNode(EmitHint.Unspecified, b, s, w);
      return w;
    };
    return w ? worker(w).getText() : usingSingleLineStringWriter(worker);
  }
  resolveSymbol(noAlias?: boolean) {
    return !noAlias && this.isNonLocalAlias() ? this.resolveAlias() : this;
  }
  getLinks(): qt.SymbolLinks {
    if (this.flags & SymbolFlags.Transient) return this;
    const i = this.getId();
    return symbolLinks[i] || (symbolLinks[i] = new (<any>SymbolLinks)());
  }
  resolveAlias() {
    qu.assert((this.flags & SymbolFlags.Alias) !== 0);
    const ls = this.getLinks();
    if (!ls.target) {
      ls.target = resolvingSymbol;
      const n = this.getDeclarationOfAliasSymbol();
      if (!n) return qu.fail();
      const t = getTargetOfAliasDeclaration(n);
      if (ls.target === resolvingSymbol) ls.target = t || unknownSymbol;
      else error(n, qd.msgs.Circular_definition_of_import_alias_0, this.symbolToString());
    } else if (ls.target === resolvingSymbol) ls.target = unknownSymbol;
    return ls.target as Symbol;
  }
  private addDuplicates(ds: qt.Declaration[]) {
    if (this.declarations) {
      for (const d of this.declarations) {
        qu.pushIfUnique(ds, d);
      }
    }
  }
  isNonLocalAlias(excludes = SymbolFlags.Value | SymbolFlags.Type | SymbolFlags.Namespace): this is Symbol {
    const f = this.flags;
    return (f & (SymbolFlags.Alias | excludes)) === SymbolFlags.Alias || !!(f & SymbolFlags.Alias && f & SymbolFlags.Assignment);
  }
  tryResolveAlias() {
    const ls = this.getLinks();
    if (ls.target !== resolvingSymbol) return this.resolveAlias();
    return;
  }
  getDeclarationOfAliasSymbol() {
    const ds = this.declarations;
    return ds && qu.find(ds, isAliasSymbolDeclaration);
  }
  getTypeOnlyAliasDeclaration(): qt.TypeOnlyCompatibleAliasDeclaration | undefined {
    if (!(this.flags & SymbolFlags.Alias)) return;
    return this.getLinks().typeOnlyDeclaration || undefined;
  }
  markAliasSymbolAsReferenced(): void {
    const ls = this.getLinks();
    if (!ls.referenced) {
      ls.referenced = true;
      const d = this.getDeclarationOfAliasSymbol();
      qu.assert(d);
      if (qf.is.internalModuleImportEqualsDeclaration(d)) {
        const t = this.resolveSymbol();
        if (t === unknownSymbol || (t && t.flags & SymbolFlags.Value)) qf.check.expressionCached(d.moduleReference);
      }
    }
  }
  markConstEnumAliasAsReferenced() {
    const ls = this.getLinks();
    if (!ls.constEnumReferenced) ls.constEnumReferenced = true;
  }
  getDeclarationOfJSPrototypeContainer() {
    const v = this.parent!.valueDeclaration;
    if (!v) return;
    const i = qf.is.assignmentDeclaration(v) ? qf.get.assignedExpandoIniter(v) : qf.is.withOnlyExpressionIniter(v) ? qf.get.declaredExpandoIniter(v) : undefined;
    return i || v;
  }
  getExpandoSymbol(): Symbol | undefined {
    const v = this.valueDeclaration;
    if (!v || !qf.is.inJSFile(v) || this.flags & SymbolFlags.TypeAlias || qf.get.expandoIniter(v, false)) return;
    const i = v.kind === Syntax.VariableDeclaration ? qf.get.declaredExpandoIniter(v) : qf.get.assignedExpandoIniter(v);
    if (i) {
      const s = qf.get.symbolOfNode(i);
      if (s) return mergeJSSymbols(s, this);
    }
    return;
  }
  getExportsOfSymbol(): SymbolTable {
    return this.flags & SymbolFlags.LateBindingContainer
      ? (getResolvedMembersOrExportsOfSymbol(this, MembersOrExportsResolutionKind.resolvedExports) as SymbolTable)
      : this.flags & SymbolFlags.Module
      ? qf.get.exportsOfModule()
      : this.exports || emptySymbols;
  }
  getExportsOfModule(): SymbolTable {
    const ls = this.getLinks();
    const worker = (): SymbolTable => {
      const ss = [] as Symbol[];
      const s = resolveExternalModuleSymbol(this);
      const visit = (s?: Symbol): SymbolTable | undefined => {
        if (!(s && s.exports && qu.pushIfUnique(ss, s))) return;
        const symbols = cloneMap(s.exports);
        const stars = s.exports.get(InternalSymbol.ExportStar);
        if (stars) {
          const nesteds = new SymbolTable();
          const lookupTable = new qu.QMap<ExportCollisionTracker>() as ExportCollisionTrackerTable;
          for (const n of stars.declarations ?? []) {
            const m = resolveExternalModuleName(n, (n as qt.ExportDeclaration).moduleSpecifier!);
            const exporteds = visit(m);
            extendExportSymbols(nesteds, exporteds, lookupTable, n as qt.ExportDeclaration);
          }
          lookupTable.forEach(({ exportsWithDuplicate }, n) => {
            if (n === 'export=' || !(exportsWithDuplicate && exportsWithDuplicate.length) || symbols.has(n)) return;
            for (const n of exportsWithDuplicate) {
              diagnostics.add(
                qf.create.diagnosticForNode(
                  n,
                  qd.msgs.Module_0_has_already_exported_a_member_named_1_Consider_explicitly_re_exporting_to_resolve_the_ambiguity,
                  lookupTable.get(n)!.specText,
                  qy.get.unescUnderscores(n)
                )
              );
            }
          });
          extendExportSymbols(symbols, nesteds);
        }
        return symbols;
      };
      return visit(s) || emptySymbols;
    };
    return ls.resolvedExports || (ls.resolvedExports = worker());
  }
  getParentOfSymbol(): Symbol | undefined {
    return this.parent?.qf.get.lateBoundSymbol().qf.get.mergedSymbol();
  }
  getAlternativeContainingModules(enclosingDeclaration: Node): Symbol[] {
    const containingFile = enclosingDeclaration.sourceFile;
    const id = '' + containingFile.qf.get.nodeId();
    const ls = this.getLinks();
    let results: Symbol[] | undefined;
    if (ls.extendedContainersByFile && (results = ls.extendedContainersByFile.get(id))) return results;
    if (containingFile && containingFile.imports) {
      for (const importRef of containingFile.imports) {
        if (isSynthesized(importRef)) continue;
        const resolvedModule = resolveExternalModuleName(enclosingDeclaration, importRef, true);
        if (!resolvedModule) continue;
        const ref = this.getAliasForSymbolInContainer(resolvedModule);
        if (!ref) continue;
        results = qu.append(results, resolvedModule);
      }
      if (qu.length(results)) {
        (ls.extendedContainersByFile || (ls.extendedContainersByFile = new qu.QMap())).set(id, results!);
        return results!;
      }
    }
    if (ls.extendedContainers) return ls.extendedContainers;
    const otherFiles = host.getSourceFiles();
    for (const file of otherFiles) {
      if (!qf.is.externalModule(file)) continue;
      const sym = qf.get.symbolOfNode(file);
      const ref = this.getAliasForSymbolInContainer(sym);
      if (!ref) continue;
      results = qu.append(results, sym);
    }
    return (ls.extendedContainers = results || empty);
  }
  getContainersOfSymbol(enclosingDeclaration: Node | undefined): Symbol[] | undefined {
    const container = this.getParentOfSymbol();
    if (container && !(this.flags & SymbolFlags.TypeParam)) {
      const additionalContainers = mapDefined(container.declarations, fileSymbolIfFileSymbolExportEqualsContainer);
      const reexportContainers = enclosingDeclaration && this.getAlternativeContainingModules(enclosingDeclaration);
      if (enclosingDeclaration && qf.get.accessibleSymbolChain(container, enclosingDeclaration, SymbolFlags.Namespace, false))
        return concatenate(concatenate([container], additionalContainers), reexportContainers);
      const res = qu.append(additionalContainers, container);
      return concatenate(res, reexportContainers);
    }
    const candidates = mapDefined(this.declarations, (d) => {
      if (!qf.is.ambientModule(d) && d.parent && hasNonGlobalAugmentationExternalModuleSymbol(d.parent)) return qf.get.symbolOfNode(d.parent);
      if (
        d.kind === Syntax.ClassExpression &&
        d.parent.kind === Syntax.BinaryExpression &&
        d.parent.operatorToken.kind === Syntax.EqualsToken &&
        qf.is.accessExpression(d.parent.left) &&
        qf.is.entityNameExpression(d.parent.left.expression)
      ) {
        if (qf.is.moduleExportsAccessExpression(d.parent.left) || qf.is.exportsIdentifier(d.parent.left.expression)) return qf.get.symbolOfNode(d.sourceFile);
        qf.check.expressionCached(d.parent.left.expression);
        return qf.get.nodeLinks(d.parent.left.expression).resolvedSymbol;
      }
    });
    if (!qu.length(candidates)) return;
    return mapDefined(candidates, (candidate) => (this.getAliasForSymbolInContainer(candidate) ? candidate : undefined));
    function fileSymbolIfFileSymbolExportEqualsContainer(d: Declaration) {
      return container && getFileSymbolIfFileSymbolExportEqualsContainer(d, container);
    }
  }
  getExportSymbolOfValueSymbolIfExported(): Symbol;
  getExportSymbolOfValueSymbolIfExported(): Symbol | undefined;
  getExportSymbolOfValueSymbolIfExported(): Symbol | undefined {
    return ((this.flags & SymbolFlags.ExportValue) !== 0 ? this.exportSymbol : this)?.qf.get.mergedSymbol();
  }
  symbolIsValue() {
    return !!(this.flags & SymbolFlags.Value || (this.flags & SymbolFlags.Alias && this.resolveAlias().flags & SymbolFlags.Value && !this.getTypeOnlyAliasDeclaration()));
  }
  isPropertyOrMethodDeclarationSymbol() {
    if (this.declarations && this.declarations.length) {
      for (const d of this.declarations) {
        switch (d.kind) {
          case Syntax.PropertyDeclaration:
          case Syntax.MethodDeclaration:
          case Syntax.GetAccessor:
          case Syntax.SetAccessor:
            continue;
          default:
            return false;
        }
      }
      return true;
    }
    return false;
  }
  needsQualification(enclosingDeclaration: Node | undefined, meaning: SymbolFlags) {
    let qualify = false;
    forEachSymbolTableInScope(enclosingDeclaration, (symbolTable) => {
      let symbolFromSymbolTable = symbolTable.get(this.escName)?.qf.get.mergedSymbol();
      if (!symbolFromSymbolTable) return false;
      if (symbolFromSymbolTable === this) return true;
      symbolFromSymbolTable =
        symbolFromSymbolTable.flags & SymbolFlags.Alias && !symbolFromSymbolTable.declarationOfKind(Syntax.ExportSpecifier) ? symbolFromSymbolTable.resolveAlias() : symbolFromSymbolTable;
      if (symbolFromSymbolTable.flags & meaning) {
        qualify = true;
        return true;
      }
      return false;
    });
    return qualify;
  }
  isTypeSymbolAccessible(n?: Node) {
    const a = this.isSymbolAccessible(n, SymbolFlags.Type, false);
    return a.accessibility === qt.SymbolAccessibility.Accessible;
  }
  isValueSymbolAccessible(n?: Node) {
    const a = this.isSymbolAccessible(n, SymbolFlags.Value, false);
    return a.accessibility === qt.SymbolAccessibility.Accessible;
  }
  symbolValueDeclarationIsContextSensitive() {
    const v = this.valueDeclaration;
    return v && qf.is.expression(v) && !qf.is.contextSensitive(v);
  }
  serializeSymbol(isPrivate: boolean, propertyAsAlias: boolean) {
    const s = qf.get.mergedSymbol();
    if (visitedSymbols.has('' + s.getId())) return;
    visitedSymbols.set('' + s.getId(), true);
    const skip = !isPrivate;
    if (skip || (!!qu.length(this.declarations) && qu.some(this.declarations, (d) => !!qc.findAncestor(d, (n) => n === enclosingDeclaration)))) {
      const o = context;
      context = cloneQContext(context);
      const r = serializeSymbolWorker(this, isPrivate, propertyAsAlias);
      context = o;
      return r;
    }
  }
  serializeSymbolWorker(isPrivate: boolean, propertyAsAlias: boolean) {
    const symbolName = qy.get.unescUnderscores(this.escName);
    const isDefault = this.escName === InternalSymbol.Default;
    if (!(context.flags & qt.NodeBuilderFlags.AllowAnonymousIdentifier) && qy.is.stringANonContextualKeyword(symbolName) && !isDefault) {
      context.encounteredError = true;
      return;
    }
    const needsPostExportDefault =
      isDefault &&
      !!(this.flags & SymbolFlags.ExportDoesNotSupportDefaultModifier || (this.flags & SymbolFlags.Function && qu.length(qf.get.propertiesOfType(this.typeOfSymbol())))) &&
      !(this.flags & SymbolFlags.Alias);
    if (needsPostExportDefault) isPrivate = true;
    const modifierFlags = (!isPrivate ? ModifierFlags.Export : 0) | (isDefault && !needsPostExportDefault ? ModifierFlags.Default : 0);
    const isConstMergedWithNS =
      this.flags & SymbolFlags.Module && this.flags & (SymbolFlags.BlockScopedVariable | SymbolFlags.FunctionScopedVariable | SymbolFlags.Property) && this.escName !== InternalSymbol.ExportEquals;
    const isConstMergedWithNSPrintableAsSignatureMerge = isConstMergedWithNS && isTypeRepresentableAsFunctionNamespaceMerge(this.typeOfSymbol(), this);
    if (this.flags & (SymbolFlags.Function | SymbolFlags.Method) || isConstMergedWithNSPrintableAsSignatureMerge)
      serializeAsFunctionNamespaceMerge(this.typeOfSymbol(), this, getInternalSymbol(symbolName), modifierFlags);
    if (this.flags & SymbolFlags.TypeAlias) this.serializeTypeAlias(symbolName, modifierFlags);
    if (
      this.flags & (SymbolFlags.BlockScopedVariable | SymbolFlags.FunctionScopedVariable | SymbolFlags.Property) &&
      this.escName !== InternalSymbol.ExportEquals &&
      !(this.flags & SymbolFlags.Prototype) &&
      !(this.flags & SymbolFlags.Class) &&
      !isConstMergedWithNSPrintableAsSignatureMerge
    ) {
      this.serializeVariableOrProperty(symbolName, isPrivate, needsPostExportDefault, propertyAsAlias, modifierFlags);
    }
    if (this.flags & SymbolFlags.Enum) this.serializeEnum(symbolName, modifierFlags);
    if (this.flags & SymbolFlags.Class) {
      if (this.flags & SymbolFlags.Property && this.valueDeclaration.parent.kind === Syntax.BinaryExpression && qf.is.kind(qc.ClassExpression, this.valueDeclaration.parent.right))
        this.serializeAsAlias(this.getInternalSymbol(symbolName), modifierFlags);
      else {
        this.serializeAsClass(this.getInternalSymbol(symbolName), modifierFlags);
      }
    }
    if ((this.flags & (SymbolFlags.ValueModule | SymbolFlags.NamespaceModule) && (!isConstMergedWithNS || isTypeOnlyNamespace(this))) || isConstMergedWithNSPrintableAsSignatureMerge)
      this.serializeModule(symbolName, modifierFlags);
    if (this.flags & SymbolFlags.Interface) this.serializeInterface(symbolName, modifierFlags);
    if (this.flags & SymbolFlags.Alias) this.serializeAsAlias(this.getInternalSymbol(symbolName), modifierFlags);
    if (this.flags & SymbolFlags.Property && this.escName === InternalSymbol.ExportEquals) serializeMaybeAliasAssignment(this);
    if (this.flags & SymbolFlags.ExportStar) {
      for (const node of this.declarations) {
        const resolvedModule = resolveExternalModuleName(node, (node as qt.ExportDeclaration).moduleSpecifier!);
        if (!resolvedModule) continue;
        addResult(new qc.ExportDeclaration(undefined, undefined, undefined, qc.asLiteral(getSpecifierForModuleSymbol(resolvedModule, context))), ModifierFlags.None);
      }
    }
    if (needsPostExportDefault) addResult(new qc.ExportAssignment(undefined, undefined, false, new Identifier(this.getInternalSymbol(symbolName))), ModifierFlags.None);
  }
  includePrivateSymbol() {
    if (qu.some(this.declarations, qf.is.paramDeclaration)) return;
    qu.assertIsDefined(deferredPrivates);
    getUnusedName(qy.get.unescUnderscores(this.escName), this);
    deferredPrivates.set('' + this.getId(), this);
  }
  serializeTypeAlias(symbolName: string, modifierFlags: ModifierFlags) {
    const aliasType = this.getDeclaredTypeOfTypeAlias();
    const typeParams = this.getLinks().typeParams;
    const typeParamDecls = map(typeParams, (p) => typeParamToDeclaration(p, context));
    const jsdocAliasDecl = find(this.declarations, isDocTypeAlias);
    const commentText = jsdocAliasDecl ? jsdocAliasDecl.comment || jsdocAliasDecl.parent.comment : undefined;
    const oldFlags = context.flags;
    context.flags |= qt.NodeBuilderFlags.InTypeAlias;
    addResult(
      setSyntheticLeadingComments(
        new qc.TypeAliasDeclaration(undefined, undefined, this.getInternalSymbol(symbolName), typeParamDecls, typeToTypeNodeHelper(aliasType, context)),
        !commentText
          ? []
          : [
              {
                kind: Syntax.MultiLineCommentTrivia,
                text: '*\n * ' + commentText.replace(/\n/g, '\n * ') + '\n ',
                pos: -1,
                end: -1,
                hasTrailingNewLine: true,
              },
            ]
      ),
      modifierFlags
    );
    context.flags = oldFlags;
  }
  serializeInterface(symbolName: string, modifierFlags: ModifierFlags) {
    const interfaceType = this.getDeclaredTypeOfClassOrInterface();
    const localParams = this.getLocalTypeParamsOfClassOrInterfaceOrTypeAlias();
    const typeParamDecls = map(localParams, (p) => typeParamToDeclaration(p, context));
    const baseTypes = getBaseTypes(interfaceType);
    const baseType = qu.length(baseTypes) ? qf.get.intersectionType(baseTypes) : undefined;
    const members = flatMap<Symbol, TypeElem>(qf.get.propertiesOfType(interfaceType), (p) => serializePropertySymbolForInterface(p, baseType));
    const callSignatures = serializeSignatures(SignatureKind.Call, interfaceType, baseType, Syntax.CallSignature) as CallSignatureDeclaration[];
    const constructSignatures = serializeSignatures(SignatureKind.Construct, interfaceType, baseType, Syntax.ConstructSignature) as ConstructSignatureDeclaration[];
    const indexSignatures = serializeIndexSignatures(interfaceType, baseType);
    const heritageClauses = !qu.length(baseTypes)
      ? undefined
      : [
          new qc.HeritageClause(
            Syntax.ExtendsKeyword,
            mapDefined(baseTypes, (b) => trySerializeAsTypeReference(b))
          ),
        ];
    addResult(
      new qc.InterfaceDeclaration(undefined, undefined, this.getInternalSymbol(symbolName), typeParamDecls, heritageClauses, [
        ...indexSignatures,
        ...constructSignatures,
        ...callSignatures,
        ...members,
      ]),
      modifierFlags
    );
  }
  getNamespaceMembersForSerialization() {
    return !this.exports ? [] : qu.filter(arrayFrom(this.exports.values()), isNamespaceMember);
  }
  isTypeOnlyNamespace() {
    return qu.every(this.getNamespaceMembersForSerialization(), (m) => !(m.resolveSymbol().flags & SymbolFlags.Value));
  }
  serializeModule(symbolName: string, modifierFlags: ModifierFlags) {
    const members = this.getNamespaceMembersForSerialization();
    const locationMap = arrayToMultiMap(members, (m) => (m.parent && m.parent === this ? 'real' : 'merged'));
    const realMembers = locationMap.get('real') || empty;
    const mergedMembers = locationMap.get('merged') || empty;
    if (qu.length(realMembers)) {
      const localName = this.getInternalSymbol(symbolName);
      serializeAsNamespaceDeclaration(realMembers, localName, modifierFlags, !!(this.flags & (SymbolFlags.Function | SymbolFlags.Assignment)));
    }
    if (qu.length(mergedMembers)) {
      const containingFile = context.enclosingDeclaration.sourceFile;
      const localName = this.getInternalSymbol(symbolName);
      const nsBody = new qc.ModuleBlock([
        new qc.ExportDeclaration(
          undefined,
          undefined,
          new qc.NamedExports(
            mapDefined(
              qu.filter(mergedMembers, (n) => n.escName !== InternalSymbol.ExportEquals),
              (s) => {
                const name = qy.get.unescUnderscores(s.escName);
                const localName = getInternalSymbol(s, name);
                const aliasDecl = s.declarations && s.getDeclarationOfAliasSymbol();
                if (containingFile && (aliasDecl ? containingFile !== aliasDecl.sourceFile : !some(s.declarations, (d) => d.sourceFile === containingFile))) {
                  context.tracker?.reportNonlocalAugmentation?.(containingFile, this, s);
                  return;
                }
                const target = aliasDecl && getTargetOfAliasDeclaration(aliasDecl, true);
                includePrivateSymbol(target || s);
                const targetName = target ? getInternalSymbol(target, qy.get.unescUnderscores(target.escName)) : localName;
                return new qc.ExportSpecifier(name === targetName ? undefined : targetName, name);
              }
            )
          )
        ),
      ]);
      addResult(new qc.ModuleDeclaration(undefined, undefined, new Identifier(localName), nsBody, NodeFlags.Namespace), ModifierFlags.None);
    }
  }
  serializeEnum(symbolName: string, modifierFlags: ModifierFlags) {
    addResult(
      new qc.EnumDeclaration(
        undefined,
        qc.create.modifiersFromFlags(this.isConstEnumSymbol() ? ModifierFlags.Const : 0),
        this.getInternalSymbol(symbolName),
        map(
          qu.filter(qf.get.propertiesOfType(this.typeOfSymbol()), (p) => !!(p.flags & SymbolFlags.EnumMember)),
          (p) => {
            const initializedValue = p.declarations && p.declarations[0] && qf.is.kind(qc.EnumMember, p.declarations[0]) && getConstantValue(p.declarations[0] as EnumMember);
            return new qc.EnumMember(qy.get.unescUnderscores(p.escName), initializedValue === undefined ? undefined : qc.asLiteral(initializedValue));
          }
        )
      ),
      modifierFlags
    );
  }
  serializeVariableOrProperty(symbolName: string, isPrivate: boolean, needsPostExportDefault: boolean, propertyAsAlias: boolean | undefined, modifierFlags: ModifierFlags) {
    if (propertyAsAlias) serializeMaybeAliasAssignment(this);
    else {
      const type = this.typeOfSymbol();
      const localName = getInternalSymbol(this, symbolName);
      if (!(this.flags & SymbolFlags.Function) && isTypeRepresentableAsFunctionNamespaceMerge(type, this)) serializeAsFunctionNamespaceMerge(type, this, localName, modifierFlags);
      else {
        const flags = !(this.flags & SymbolFlags.BlockScopedVariable) ? undefined : isConstVariable(this) ? NodeFlags.Const : NodeFlags.Let;
        const name = needsPostExportDefault || !(this.flags & SymbolFlags.Property) ? localName : getUnusedName(localName, this);
        let textRange: Node | undefined = this.declarations && find(this.declarations, (d) => d.kind === Syntax.VariableDeclaration);
        if (textRange && textRange.parent.kind === Syntax.VariableDeclarationList && textRange.parent.declarations.length === 1) textRange = textRange.parent.parent;
        const statement = setRange(
          new qc.VariableStatement(
            undefined,
            new qc.VariableDeclarationList([new qc.VariableDeclaration(name, serializeTypeForDeclaration(context, type, this, enclosingDeclaration, includePrivateSymbol, bundled))], flags)
          ),
          textRange
        );
        addResult(statement, name !== localName ? modifierFlags & ~ModifierFlags.Export : modifierFlags);
        if (name !== localName && !isPrivate) addResult(new qc.ExportDeclaration(undefined, undefined, new qc.NamedExports([new qc.ExportSpecifier(name, localName)])), ModifierFlags.None);
      }
    }
  }
  serializeAsAlias(localName: string, modifierFlags: ModifierFlags) {
    const node = this.getDeclarationOfAliasSymbol();
    if (!node) return qu.fail();
    const target = qf.get.mergedSymbol(getTargetOfAliasDeclaration(node, true));
    if (!target) return;
    let verbatimTargetName = qy.get.unescUnderscores(target.escName);
    if (verbatimTargetName === InternalSymbol.ExportEquals && (compilerOpts.esModuleInterop || compilerOpts.allowSyntheticDefaultImports)) verbatimTargetName = InternalSymbol.Default;
    const targetName = getInternalSymbol(target, verbatimTargetName);
    includePrivateSymbol(target);
    switch (node.kind) {
      case Syntax.ImportEqualsDeclaration:
        const isLocalImport = !(target.flags & SymbolFlags.ValueModule);
        addResult(
          new qc.ImportEqualsDeclaration(
            undefined,
            undefined,
            new Identifier(localName),
            isLocalImport ? symbolToName(target, context, SymbolFlags.All, false) : new qc.ExternalModuleReference(qc.asLiteral(getSpecifierForModuleSymbol(this, context)))
          ),
          isLocalImport ? modifierFlags : ModifierFlags.None
        );
        break;
      case Syntax.NamespaceExportDeclaration:
        addResult(new qc.NamespaceExportDeclaration(idText((node as NamespaceExportDeclaration).name)), ModifierFlags.None);
        break;
      case Syntax.ImportClause:
        addResult(
          new qc.ImportDeclaration(undefined, undefined, new qc.ImportClause(new Identifier(localName), undefined), qc.asLiteral(getSpecifierForModuleSymbol(target.parent || target, context))),
          ModifierFlags.None
        );
        break;
      case Syntax.NamespaceImport:
        addResult(
          new qc.ImportDeclaration(undefined, undefined, new qc.ImportClause(undefined, new qc.NamespaceImport(new Identifier(localName))), qc.asLiteral(getSpecifierForModuleSymbol(target, context))),
          ModifierFlags.None
        );
        break;
      case Syntax.NamespaceExport:
        addResult(new qc.ExportDeclaration(undefined, undefined, new qc.NamespaceExport(new Identifier(localName)), qc.asLiteral(getSpecifierForModuleSymbol(target, context))), ModifierFlags.None);
        break;
      case Syntax.ImportSpecifier:
        addResult(
          new qc.ImportDeclaration(
            undefined,
            undefined,
            new qc.ImportClause(undefined, new qc.NamedImports([new qc.ImportSpecifier(localName !== verbatimTargetName ? new Identifier(verbatimTargetName) : undefined, new Identifier(localName))])),
            qc.asLiteral(getSpecifierForModuleSymbol(target.parent || target, context))
          ),
          ModifierFlags.None
        );
        break;
      case Syntax.ExportSpecifier:
        const spec = (node.parent.parent as qt.ExportDeclaration).moduleSpecifier;
        serializeExportSpecifier(qy.get.unescUnderscores(this.escName), spec ? verbatimTargetName : targetName, spec && qf.is.stringLiteralLike(spec) ? qc.asLiteral(spec.text) : undefined);
        break;
      case Syntax.ExportAssignment:
        serializeMaybeAliasAssignment(this);
        break;
      case Syntax.BinaryExpression:
      case Syntax.PropertyAccessExpression:
        if (this.escName === InternalSymbol.Default || this.escName === InternalSymbol.ExportEquals) serializeMaybeAliasAssignment(this);
        else {
          serializeExportSpecifier(localName, targetName);
        }
        break;
      default:
        return Debug.failBadSyntax(node, 'Unhandled alias declaration kind in symbol serializer!');
    }
  }
  serializeMaybeAliasAssignment() {
    if (this.flags & SymbolFlags.Prototype) return;
    const name = qy.get.unescUnderscores(this.escName);
    const isExportEquals = name === InternalSymbol.ExportEquals;
    const isDefault = name === InternalSymbol.Default;
    const isExportAssignment = isExportEquals || isDefault;
    const aliasDecl = this.declarations && this.getDeclarationOfAliasSymbol();
    const target = aliasDecl && getTargetOfAliasDeclaration(aliasDecl, true);
    if (target && qu.length(target.declarations) && qu.some(target.declarations, (d) => d.sourceFile === enclosingDeclaration.sourceFile)) {
      const expr = isExportAssignment
        ? qf.get.exportAssignmentExpression(aliasDecl as ExportAssignment | BinaryExpression)
        : qf.get.propertyAssignmentAliasLikeExpression(aliasDecl as ShorthandPropertyAssignment | PropertyAssignment | PropertyAccessExpression);
      const first = qf.is.entityNameExpression(expr) ? getFirstNonModuleExportsIdentifier(expr) : undefined;
      const referenced = first && resolveEntityName(first, SymbolFlags.All, true, true, enclosingDeclaration);
      if (referenced || target) includePrivateSymbol(referenced || target);
      const oldTrack = context.tracker.trackSymbol;
      context.tracker.trackSymbol = noop;
      if (isExportAssignment) results.push(new qc.ExportAssignment(undefined, undefined, isExportEquals, symbolToExpression(target, context, SymbolFlags.All)));
      else {
        if (first === expr) serializeExportSpecifier(name, idText(first));
        else if (expr.kind === Syntax.ClassExpression) {
          serializeExportSpecifier(name, getInternalSymbol(target, target.name));
        } else {
          const varName = getUnusedName(name, this);
          addResult(new qc.ImportEqualsDeclaration(undefined, undefined, new Identifier(varName), symbolToName(target, context, SymbolFlags.All, false)), ModifierFlags.None);
          serializeExportSpecifier(name, varName);
        }
      }
      context.tracker.trackSymbol = oldTrack;
    } else {
      const varName = getUnusedName(name, this);
      const typeToSerialize = qf.get.widenedType(qf.get.mergedSymbol(this).typeOfSymbol());
      if (isTypeRepresentableAsFunctionNamespaceMerge(typeToSerialize, this))
        serializeAsFunctionNamespaceMerge(typeToSerialize, this, varName, isExportAssignment ? ModifierFlags.None : ModifierFlags.Export);
      else {
        const statement = new qc.VariableStatement(
          undefined,
          new qc.VariableDeclarationList(
            [new qc.VariableDeclaration(varName, serializeTypeForDeclaration(context, typeToSerialize, this, enclosingDeclaration, includePrivateSymbol, bundled))],
            NodeFlags.Const
          )
        );
        addResult(statement, name === varName ? ModifierFlags.Export : ModifierFlags.None);
      }
      if (isExportAssignment) results.push(new qc.ExportAssignment(undefined, undefined, isExportEquals, new Identifier(varName)));
      else if (name !== varName) {
        serializeExportSpecifier(name, varName);
      }
    }
  }
  isConstructorDeclaredProperty() {
    if (this.valueDeclaration && this.valueDeclaration.kind === Syntax.BinaryExpression) {
      const ls = this.getLinks();
      if (ls.qf.is.constructorDeclaredProperty === undefined) {
        ls.qf.is.constructorDeclaredProperty =
          !!getDeclaringConstructor(this) &&
          qu.every(
            this.declarations,
            (d) =>
              d.kind === Syntax.BinaryExpression &&
              qf.get.assignmentDeclarationKind(d) === qt.AssignmentDeclarationKind.ThisProperty &&
              (d.left.kind !== Syntax.ElemAccessExpression || qf.is.stringOrNumericLiteralLike((<ElemAccessExpression>declaration.left).argExpression)) &&
              !getAnnotatedTypeForAssignmentDeclaration(undefined, d, this, d)
          );
      }
      return ls.qf.is.constructorDeclaredProperty;
    }
    return false;
  }
  isAutoTypedProperty() {
    const v = this.valueDeclaration;
    return v && v.kind === Syntax.PropertyDeclaration && !qf.get.effectiveTypeAnnotationNode(v) && !v.initer && (noImplicitAny || qf.is.inJSFile(v));
  }
  getDeclaringConstructor() {
    const ds = this.declarations;
    if (ds) {
      for (const d of ds) {
        const c = qf.get.thisContainer(d, false);
        if (c && (c.kind === Syntax.Constructor || qf.is.jsConstructor(c))) return <ConstructorDeclaration>c;
      }
    }
  }
  getTypeOfVariableOrParamOrProperty(): Type {
    const ls = this.getLinks();
    if (!ls.type) {
      const worker = () => {
        if (this.flags & SymbolFlags.Prototype) return getTypeOfPrototypeProperty(this);
        if (this === requireSymbol) return anyType;
        if (this.flags & SymbolFlags.ModuleExports) {
          const fileSymbol = qf.get.symbolOfNode(this.valueDeclaration.sourceFile);
          const members = new SymbolTable();
          members.set('exports' as qu.__String, fileSymbol);
          return createAnonymousType(this, members, empty, empty, undefined, undefined);
        }
        const d = this.valueDeclaration!;
        if (qf.is.catchClauseVariableDeclarationOrBindingElem(d)) return anyType;
        if (d.kind === Syntax.SourceFile && qf.is.jsonSourceFile(d)) {
          if (!d.statements.length) return emptyObjectType;
          return qf.get.widenedType(qf.get.widenedLiteralType(qf.check.expression(d.statements[0].expression)));
        }
        if (!pushTypeResolution(this, TypeSystemPropertyName.Type)) {
          if (this.flags & SymbolFlags.ValueModule && !(this.flags & SymbolFlags.Assignment)) return this.getTypeOfFuncClassEnumModule();
          return reportCircularityError(this);
        }
        let type: qt.Type | undefined;
        if (d.kind === Syntax.ExportAssignment) type = widenTypeForVariableLikeDeclaration(qf.check.expressionCached(d.expression), d);
        else if (
          d.kind === Syntax.BinaryExpression ||
          (qf.is.inJSFile(d) &&
            (d.kind === Syntax.CallExpression || ((d.kind === Syntax.PropertyAccessExpression || qf.is.bindableStaticElemAccessExpression(d)) && d.parent.kind === Syntax.BinaryExpression)))
        ) {
          type = qf.get.widenedTypeForAssignmentDeclaration(this);
        } else if (
          qc.isDoc.propertyLikeTag(d) ||
          d.kind === Syntax.PropertyAccessExpression ||
          d.kind === Syntax.ElemAccessExpression ||
          d.kind === Syntax.Identifier ||
          qf.is.stringLiteralLike(d) ||
          d.kind === Syntax.NumericLiteral ||
          d.kind === Syntax.ClassDeclaration ||
          d.kind === Syntax.FunctionDeclaration ||
          (d.kind === Syntax.MethodDeclaration && !qf.is.objectLiteralMethod(d)) ||
          d.kind === Syntax.MethodSignature ||
          d.kind === Syntax.SourceFile
        ) {
          if (this.flags & (SymbolFlags.Function | SymbolFlags.Method | SymbolFlags.Class | SymbolFlags.Enum | SymbolFlags.ValueModule)) return this.getTypeOfFuncClassEnumModule();
          type = d.parent?.kind === Syntax.BinaryExpression ? qf.get.widenedTypeForAssignmentDeclaration(this) : tryGetTypeFromEffectiveTypeNode(d) || anyType;
        } else if (d.kind === Syntax.PropertyAssignment) {
          type = tryGetTypeFromEffectiveTypeNode(d) || qf.check.propertyAssignment(d);
        } else if (d.kind === Syntax.JsxAttribute) {
          type = tryGetTypeFromEffectiveTypeNode(d) || qf.check.jsxAttribute(d);
        } else if (d.kind === Syntax.ShorthandPropertyAssignment) {
          type = tryGetTypeFromEffectiveTypeNode(d) || qf.check.expressionForMutableLocation(d.name, CheckMode.Normal);
        } else if (qf.is.objectLiteralMethod(d)) {
          type = tryGetTypeFromEffectiveTypeNode(d) || qf.check.objectLiteralMethod(d, CheckMode.Normal);
        } else if (d.kind === Syntax.Param || d.kind === Syntax.PropertyDeclaration || d.kind === Syntax.PropertySignature || d.kind === Syntax.VariableDeclaration || d.kind === Syntax.BindingElem) {
          type = qf.get.widenedTypeForVariableLikeDeclaration(d, true);
        } else if (d.kind === Syntax.EnumDeclaration) {
          type = this.getTypeOfFuncClassEnumModule();
        } else if (d.kind === Syntax.EnumMember) {
          type = this.getTypeOfEnumMember();
        } else if (qf.is.accessor(d)) {
          type = resolveTypeOfAccessors(this);
        } else return qu.fail('Unhandled declaration kind! ' + qc.format.syntax(d.kind) + ' for ' + qc.format.symbol(this));
        if (!popTypeResolution()) {
          if (this.flags & SymbolFlags.ValueModule && !(this.flags & SymbolFlags.Assignment)) return this.getTypeOfFuncClassEnumModule();
          return reportCircularityError(this);
        }
        return type;
      };
      const t = worker();
      if (!ls.type) ls.type = t;
    }
    return ls.type;
  }
  getTypeOfAccessors(): qt.Type {
    const ls = this.getLinks();
    const worker = (): Type => {
      if (!pushTypeResolution(this, TypeSystemPropertyName.Type)) return errorType;
      let t = resolveTypeOfAccessors(this);
      if (!popTypeResolution()) {
        t = anyType;
        if (noImplicitAny) {
          const getter = this.declarationOfKind<AccessorDeclaration>(Syntax.GetAccessor);
          error(
            getter,
            qd.msgs._0_implicitly_has_return_type_any_because_it_does_not_have_a_return_type_annotation_and_is_referenced_directly_or_indirectly_in_one_of_its_return_expressions,
            this.symbolToString()
          );
        }
      }
      return type;
    };
    return ls.type || (ls.type = worker());
  }
  resolveTypeOfAccessors() {
    const getter = this.declarationOfKind<AccessorDeclaration>(Syntax.GetAccessor);
    const setter = this.declarationOfKind<AccessorDeclaration>(Syntax.SetAccessor);
    if (getter && qf.is.inJSFile(getter)) {
      const docType = getTypeForDeclarationFromDocComment(getter);
      if (docType) return docType;
    }
    const getterReturnType = getAnnotatedAccessorType(getter);
    if (getterReturnType) return getterReturnType;
    const setterParamType = getAnnotatedAccessorType(setter);
    if (setterParamType) return setterParamType;
    if (getter && getter.body) return getReturnTypeFromBody(getter);
    if (setter) {
      if (!isPrivateWithinAmbient(setter))
        errorOrSuggestion(noImplicitAny, setter, qd.Property_0_implicitly_has_type_any_because_its_set_accessor_lacks_a_param_type_annotation, this.symbolToString());
    } else {
      qu.assert(!!getter, 'there must exist a getter as we are current checking either setter or getter in this function');
      if (!isPrivateWithinAmbient(getter))
        errorOrSuggestion(noImplicitAny, getter, qd.Property_0_implicitly_has_type_any_because_its_get_accessor_lacks_a_return_type_annotation, this.symbolToString());
    }
    return anyType;
  }
  getBaseTypeVariableOfClass() {
    const baseConstructorType = getBaseConstructorTypeOfClass(this.getDeclaredTypeOfClassOrInterface());
    return baseConstructorType.flags & qt.TypeFlags.TypeVariable
      ? baseConstructorType
      : baseConstructorType.flags & qt.TypeFlags.Intersection
      ? find((baseConstructorType as IntersectionType).types, (t) => !!(t.flags & qt.TypeFlags.TypeVariable))
      : undefined;
  }
  getTypeOfFuncClassEnumModule(): Type {
    let ls = this.getLinks();
    const originalLinks = ls;
    if (!ls.type) {
      const jsDeclaration = this.valueDeclaration && qf.get.declarationOfExpando(this.valueDeclaration);
      if (jsDeclaration) {
        const merged = this.mergeJSSymbols(qf.get.symbolOfNode(jsDeclaration));
        if (merged) symbol = ls = merged;
      }
      originalLinks.type = ls.type = getTypeOfFuncClassEnumModuleWorker(symbol);
    }
    return ls.type;
  }
  getTypeOfFuncClassEnumModuleWorker(): Type {
    const declaration = this.valueDeclaration;
    if (this.flags & SymbolFlags.Module && this.isShorthandAmbientModule()) return anyType;
    else if (declaration && (declaration.kind === Syntax.BinaryExpression || (qf.is.accessExpression(declaration) && declaration.parent.kind === Syntax.BinaryExpression)))
      return qf.get.widenedTypeForAssignmentDeclaration(this);
    else if (this.flags & SymbolFlags.ValueModule && declaration && declaration.kind === Syntax.SourceFile && declaration.commonJsModuleIndicator) {
      const resolvedModule = resolveExternalModuleSymbol(this);
      if (resolvedModule !== this) {
        if (!pushTypeResolution(this, TypeSystemPropertyName.Type)) return errorType;
        const exportEquals = qf.get.mergedSymbol(this.exports!.get(InternalSymbol.ExportEquals)!);
        const type = qf.get.widenedTypeForAssignmentDeclaration(exportEquals, exportEquals === resolvedModule ? undefined : resolvedModule);
        if (!popTypeResolution()) return reportCircularityError(this);
        return type;
      }
    }
    const type = createObjectType(ObjectFlags.Anonymous, this);
    if (this.flags & SymbolFlags.Class) {
      const baseTypeVariable = getBaseTypeVariableOfClass(this);
      return baseTypeVariable ? qf.get.intersectionType([type, baseTypeVariable]) : type;
    }
    return strictNullChecks && this.flags & SymbolFlags.Optional ? qf.get.optionalType(type) : type;
  }
  getTypeOfEnumMember(): Type {
    const ls = this.getLinks();
    return ls.type || (ls.type = getDeclaredTypeOfEnumMember(this));
  }
  getTypeOfAlias(): Type {
    const ls = this.getLinks();
    if (!ls.type) {
      const targetSymbol = this.resolveAlias();
      ls.type = targetSymbol.flags & SymbolFlags.Value ? targetSymbol.typeOfSymbol() : errorType;
    }
    return ls.type;
  }
  getTypeOfInstantiatedSymbol(): Type {
    const ls = this.getLinks();
    if (!ls.type) {
      if (!pushTypeResolution(this, TypeSystemPropertyName.Type)) return (ls.type = errorType);
      let type = instantiateType(ls.target!.typeOfSymbol(), ls.mapper);
      if (!popTypeResolution()) type = reportCircularityError(this);
      ls.type = type;
    }
    return ls.type;
  }
  reportCircularityError() {
    const declaration = <VariableLikeDeclaration>this.valueDeclaration;
    if (qf.get.effectiveTypeAnnotationNode(declaration)) {
      error(this.valueDeclaration, qd._0_is_referenced_directly_or_indirectly_in_its_own_type_annotation, this.symbolToString());
      return errorType;
    }
    if (noImplicitAny && (declaration.kind !== Syntax.Param || (<HasIniter>declaration).initer)) {
      error(this.valueDeclaration, qd._0_implicitly_has_type_any_because_it_does_not_have_a_type_annotation_and_is_referenced_directly_or_indirectly_in_its_own_initer, this.symbolToString());
    }
    return anyType;
  }
  getOuterTypeParamsOfClassOrInterface(): TypeParam[] | undefined {
    const d = this.flags & SymbolFlags.Class ? this.valueDeclaration : this.declarationOfKind(Syntax.InterfaceDeclaration)!;
    qu.assert(!!d, 'Class was missing valueDeclaration -OR- non-class had no interface declarations');
    return getOuterTypeParams(d);
  }
  getLocalTypeParamsOfClassOrInterfaceOrTypeAlias(): TypeParam[] | undefined {
    let r: TypeParam[] | undefined;
    for (const d of this.declarations ?? []) {
      if (d.kind === Syntax.InterfaceDeclaration || d.kind === Syntax.ClassDeclaration || d.kind === Syntax.ClassExpression || qf.is.jsConstructor(d) || qf.is.typeAlias(d)) {
        const d2 = d as InterfaceDeclaration | TypeAliasDeclaration | DocTypedefTag | DocCallbackTag;
        r = appendTypeParams(r, qf.get.effectiveTypeParamDeclarations(d2));
      }
    }
    return r;
  }
  getTypeParamsOfClassOrInterface(): TypeParam[] | undefined {
    return concatenate(this.getOuterTypeParamsOfClassOrInterface(), this.getLocalTypeParamsOfClassOrInterfaceOrTypeAlias());
  }
  isThislessInterface() {
    const ds = this.declarations;
    if (ds) {
      for (const d of ds) {
        if (d.kind === Syntax.InterfaceDeclaration) {
          if (d.flags & NodeFlags.ContainsThis) return false;
          const ns = qf.get.interfaceBaseTypeNodes(<InterfaceDeclaration>d);
          if (ns) {
            for (const n of ns) {
              if (qf.is.entityNameExpression(n.expression)) {
                const s = resolveEntityName(n.expression, SymbolFlags.Type, true);
                if (!s || !(s.flags & SymbolFlags.Interface) || s.getDeclaredTypeOfClassOrInterface().thisType) return false;
              }
            }
          }
        }
      }
    }
    return true;
  }
  getDeclaredTypeOfClassOrInterface(): InterfaceType {
    let ls = this.getLinks();
    const originalLinks = ls;
    if (!ls.declaredType) {
      const kind = this.flags & SymbolFlags.Class ? ObjectFlags.Class : ObjectFlags.Interface;
      const merged = mergeJSSymbols(this, getAssignedClassSymbol(this.valueDeclaration));
      if (merged) symbol = ls = merged;
      const type = (originalLinks.declaredType = ls.declaredType = <InterfaceType>createObjectType(kind, this));
      const outerTypeParams = this.getOuterTypeParamsOfClassOrInterface();
      const localTypeParams = this.getLocalTypeParamsOfClassOrInterfaceOrTypeAlias();
      if (outerTypeParams || localTypeParams || kind === ObjectFlags.Class || !isThislessInterface(this)) {
        type.objectFlags |= ObjectFlags.Reference;
        type.typeParams = concatenate(outerTypeParams, localTypeParams);
        type.outerTypeParams = outerTypeParams;
        type.localTypeParams = localTypeParams;
        (<GenericType>type).instantiations = new qu.QMap<TypeReference>();
        (<GenericType>type).instantiations.set(getTypeListId(type.typeParams), <GenericType>type);
        (<GenericType>type).target = <GenericType>type;
        (<GenericType>type).resolvedTypeArgs = type.typeParams;
        type.thisType = createTypeParam(this);
        type.thisType.isThisType = true;
        type.thisType.constraint = type;
      }
    }
    return <InterfaceType>ls.declaredType;
  }
  getDeclaredTypeOfTypeAlias(): Type {
    const ls = this.getLinks();
    if (!ls.declaredType) {
      if (!pushTypeResolution(this, TypeSystemPropertyName.DeclaredType)) return errorType;
      const d = Debug.check.defined(find(this.declarations, isTypeAlias), 'Type alias symbol with no valid declaration found');
      const typeNode = qc.isDoc.typeAlias(d) ? d.typeExpression : d.type;
      let type = typeNode ? qf.get.typeFromTypeNode(typeNode) : errorType;
      if (popTypeResolution()) {
        const ps = this.getLocalTypeParamsOfClassOrInterfaceOrTypeAlias();
        if (ps) {
          ls.typeParams = ps;
          ls.instantiations = new qu.QMap<Type>();
          ls.instantiations.set(getTypeListId(ps), type);
        }
      } else {
        type = errorType;
        error(qf.is.namedDeclaration(d) ? d.name : d || d, qd.Type_alias_0_circularly_references_itself, this.symbolToString());
      }
      ls.declaredType = type;
    }
    return ls.declaredType;
  }
  getEnumKind(): EnumKind {
    const ls = this.getLinks();
    if (ls.enumKind !== undefined) return ls.enumKind;
    let hasNonLiteralMember = false;
    for (const d of this.declarations ?? []) {
      if (d.kind === Syntax.EnumDeclaration) {
        for (const m of (<EnumDeclaration>d).members) {
          if (m.initer && qf.is.stringLiteralLike(m.initer)) return (ls.enumKind = EnumKind.Literal);
          if (!isLiteralEnumMember(m)) hasNonLiteralMember = true;
        }
      }
    }
    return (ls.enumKind = hasNonLiteralMember ? EnumKind.Numeric : EnumKind.Literal);
  }
  getDeclaredTypeOfEnum(): Type {
    const ls = this.getLinks();
    if (ls.declaredType) return ls.declaredType;
    if (this.getEnumKind() === EnumKind.Literal) {
      enumCount++;
      const memberTypeList: Type[] = [];
      for (const d of this.declarations ?? []) {
        if (d.kind === Syntax.EnumDeclaration) {
          for (const m of (<EnumDeclaration>d).members) {
            const v = getEnumMemberValue(m);
            const t = getFreshTypeOfLiteralType(qf.get.literalType(v !== undefined ? v : 0, enumCount, qf.get.symbolOfNode(m)));
            qf.get.symbolOfNode(m).getLinks().declaredType = t;
            memberTypeList.push(getRegularTypeOfLiteralType(t));
          }
        }
      }
      if (memberTypeList.length) {
        const e = qf.get.unionType(memberTypeList, UnionReduction.Literal, this, undefined);
        if (e.flags & qt.TypeFlags.Union) {
          e.flags |= qt.TypeFlags.EnumLiteral;
          e.symbol = this;
        }
        return (ls.declaredType = e);
      }
    }
    const e = createType(TypeFlags.Enum);
    e.symbol = this;
    return (ls.declaredType = e);
  }
  getDeclaredTypeOfEnumMember(): Type {
    const ls = this.getLinks();
    if (!ls.declaredType) {
      const e = this.getParentOfSymbol()!.getDeclaredTypeOfEnum();
      if (!ls.declaredType) ls.declaredType = e;
    }
    return ls.declaredType;
  }
  getDeclaredTypeOfTypeParam(): TypeParam {
    const ls = this.getLinks();
    return ls.declaredType || (ls.declaredType = createTypeParam(this));
  }
  getDeclaredTypeOfAlias(): Type {
    const ls = this.getLinks();
    return ls.declaredType || (ls.declaredType = this.resolveAlias().getDeclaredTypeOfSymbol());
  }
  getDeclaredTypeOfSymbol(): Type {
    return this.tryGetDeclaredTypeOfSymbol() || errorType;
  }
  tryGetDeclaredTypeOfSymbol(): Type | undefined {
    if (this.flags & (SymbolFlags.Class | SymbolFlags.Interface)) return this.getDeclaredTypeOfClassOrInterface();
    if (this.flags & SymbolFlags.TypeAlias) return this.getDeclaredTypeOfTypeAlias();
    if (this.flags & SymbolFlags.TypeParam) return this.getDeclaredTypeOfTypeParam();
    if (this.flags & SymbolFlags.Enum) return this.getDeclaredTypeOfEnum();
    if (this.flags & SymbolFlags.EnumMember) return this.getDeclaredTypeOfEnumMember();
    if (this.flags & SymbolFlags.Alias) return this.getDeclaredTypeOfAlias();
    return;
  }
  isThisless() {
    if (this.declarations && this.declarations.length === 1) {
      const declaration = this.declarations[0];
      if (declaration) {
        switch (declaration.kind) {
          case Syntax.PropertyDeclaration:
          case Syntax.PropertySignature:
            return qf.is.thislessVariableLikeDeclaration(<VariableLikeDeclaration>declaration);
          case Syntax.MethodDeclaration:
          case Syntax.MethodSignature:
          case Syntax.Constructor:
          case Syntax.GetAccessor:
          case Syntax.SetAccessor:
            return isThislessFunctionLikeDeclaration(<FunctionLikeDeclaration | AccessorDeclaration>declaration);
        }
      }
    }
    return false;
  }
  getMembersOfSymbol() {
    return this.flags & SymbolFlags.LateBindingContainer ? getResolvedMembersOrExportsOfSymbol(this, MembersOrExportsResolutionKind.resolvedMembers) : this.members || emptySymbols;
  }
  getLateBoundSymbol(): Symbol {
    if (this.flags & SymbolFlags.ClassMember && this.escName === InternalSymbol.Computed) {
      const ls = this.getLinks();
      if (!ls.lateSymbol && qu.some(this.declarations, hasLateBindableName)) {
        const parent = this.parent?.qf.get.mergedSymbol()!;
        if (qu.some(this.declarations, hasStaticModifier)) parent.getExportsOfSymbol();
        else parent.qf.get.membersOfSymbol();
      }
      return ls.lateSymbol || (ls.lateSymbol = this);
    }
    return this;
  }
  getIndexSymbol() {
    return this.members!.get(InternalSymbol.Index);
  }
  getIndexDeclarationOfSymbol(k: IndexKind): IndexSignatureDeclaration | undefined {
    const syntaxKind = k === IndexKind.Number ? Syntax.NumberKeyword : Syntax.StringKeyword;
    const s = this.getIndexSymbol();
    if (s) {
      for (const d of s.declarations ?? []) {
        const n = cast(d, IndexSignatureDeclaration.kind);
        if (n.params.length === 1) {
          const p = n.params[0];
          if (p.type && p.type.kind === syntaxKind) return n;
        }
      }
    }
    return;
  }
  getIndexInfoOfSymbol(k: IndexKind): IndexInfo | undefined {
    const d = this.getIndexDeclarationOfSymbol(k);
    if (d) return createIndexInfo(d.type ? qf.get.typeFromTypeNode(d.type) : anyType, qf.has.effectiveModifier(d, ModifierFlags.Readonly), d);
    return;
  }
  createUniqueESSymbolType() {
    const type = <UniqueESSymbolType>createType(TypeFlags.UniqueESSymbol);
    type.symbol = this;
    type.escName = `__@${this.escName}@${this.getId()}` as qu.__String;
    return type;
  }
  getAliasVariances() {
    const ls = this.getLinks();
    return getVariancesWorker(ls.typeParams, ls, (_links, param, marker) => {
      const type = qf.get.typeAliasInstantiation(this, instantiateTypes(ls.typeParams!, makeUnaryTypeMapper(param, marker)));
      type.aliasTypeArgsContainsMarker = true;
      return type;
    });
  }
  isParamAssigned() {
    const f = qf.get.rootDeclaration(this.valueDeclaration).parent as FunctionLikeDeclaration;
    const ls = qf.get.nodeLinks(f);
    if (!(ls.flags & NodeCheckFlags.AssignmentsMarked)) {
      ls.flags |= NodeCheckFlags.AssignmentsMarked;
      if (!hasParentWithAssignmentsMarked(f)) markParamAssignments(f);
    }
    return this.assigned || false;
  }
  isConstVariable() {
    return this.flags & SymbolFlags.Variable && (getDeclarationNodeFlagsFromSymbol(this) & NodeFlags.Const) !== 0 && this.typeOfSymbol() !== autoArrayType;
  }
  isCircularMappedProperty() {
    return !!(this.checkFlags() & CheckFlags.Mapped && !(this as MappedType).type && findResolutionCycleStartIndex(this, TypeSystemPropertyName.Type) >= 0);
  }
  getImmediateAliasedSymbol(): Symbol | undefined {
    qu.assert((this.flags & SymbolFlags.Alias) !== 0, 'Should only get Alias here.');
    const ls = this.getLinks();
    if (!ls.immediateTarget) {
      const node = this.getDeclarationOfAliasSymbol();
      if (!node) return qu.fail();
      ls.immediateTarget = getTargetOfAliasDeclaration(node, true);
    }
    return ls.immediateTarget;
  }
  isPrototypeProperty() {
    if (this.flags & SymbolFlags.Method || this.checkFlags() & CheckFlags.SyntheticMethod) return true;
    if (qf.is.inJSFile(this.valueDeclaration)) {
      const p = this.valueDeclaration?.parent;
      return p && p.kind === Syntax.BinaryExpression && qf.get.assignmentDeclarationKind(p) === qt.AssignmentDeclarationKind.PrototypeProperty;
    }
  }
  symbolHasNonMethodDeclaration() {
    return !!forEachProperty(this, (p) => !(p.flags & SymbolFlags.Method));
  }
  getTypeOfParam() {
    const t = this.typeOfSymbol();
    if (strictNullChecks) {
      const d = this.valueDeclaration;
      if (d && qf.is.withIniter(d)) return qf.get.optionalType(t);
    }
    return t;
  }
  isReadonlySymbol() {
    return !!(
      this.checkFlags() & CheckFlags.Readonly ||
      (this.flags & SymbolFlags.Property && this.declarationModifierFlags() & ModifierFlags.Readonly) ||
      (this.flags & SymbolFlags.Variable && this.getDeclarationNodeFlagsFromSymbol() & NodeFlags.Const) ||
      (this.flags & SymbolFlags.Accessor && !(this.flags & SymbolFlags.SetAccessor)) ||
      this.flags & SymbolFlags.EnumMember ||
      qu.some(this.declarations, isReadonlyAssignmentDeclaration)
    );
  }
  isConstEnumSymbol() {
    return (this.flags & SymbolFlags.ConstEnum) !== 0;
  }
  checkFunctionOrConstructorSymbol(): void {
    if (!produceDiagnostics) return;
    function getCanonicalOverload(overloads: Declaration[], implementation: FunctionLikeDeclaration | undefined): Declaration {
      const implementationSharesContainerWithFirstOverload = implementation !== undefined && implementation.parent === overloads[0].parent;
      return implementationSharesContainerWithFirstOverload ? implementation! : overloads[0];
    }
    function checkFlagAgreementBetweenOverloads(
      overloads: Declaration[],
      implementation: FunctionLikeDeclaration | undefined,
      flagsToCheck: ModifierFlags,
      someOverloadFlags: ModifierFlags,
      allOverloadFlags: ModifierFlags
    ): void {
      const someButNotAllOverloadFlags = someOverloadFlags ^ allOverloadFlags;
      if (someButNotAllOverloadFlags !== 0) {
        const canonicalFlags = getEffectiveDeclarationFlags(getCanonicalOverload(overloads, implementation), flagsToCheck);
        forEach(overloads, (o) => {
          const deviation = getEffectiveDeclarationFlags(o, flagsToCheck) ^ canonicalFlags;
          if (deviation & ModifierFlags.Export) error(qf.decl.nameOf(o), qd.Overload_signatures_must_all_be_exported_or_non_exported);
          else if (deviation & ModifierFlags.Ambient) {
            error(qf.decl.nameOf(o), qd.Overload_signatures_must_all_be_ambient_or_non_ambient);
          } else if (deviation & (ModifierFlags.Private | ModifierFlags.Protected)) {
            error(qf.decl.nameOf(o) || o, qd.Overload_signatures_must_all_be_public_private_or_protected);
          } else if (deviation & ModifierFlags.Abstract) {
            error(qf.decl.nameOf(o), qd.Overload_signatures_must_all_be_abstract_or_non_abstract);
          }
        });
      }
    }
    function checkQuestionTokenAgreementBetweenOverloads(
      overloads: Declaration[],
      implementation: FunctionLikeDeclaration | undefined,
      someHaveQuestionToken: boolean,
      allHaveQuestionToken: boolean
    ): void {
      if (someHaveQuestionToken !== allHaveQuestionToken) {
        const canonicalHasQuestionToken = qf.has.questionToken(getCanonicalOverload(overloads, implementation));
        forEach(overloads, (o) => {
          const deviation = qf.has.questionToken(o) !== canonicalHasQuestionToken;
          if (deviation) error(qf.decl.nameOf(o), qd.Overload_signatures_must_all_be_optional_or_required);
        });
      }
    }
    const flagsToCheck: ModifierFlags = ModifierFlags.Export | ModifierFlags.Ambient | ModifierFlags.Private | ModifierFlags.Protected | ModifierFlags.Abstract;
    let someNodeFlags: ModifierFlags = ModifierFlags.None;
    let allNodeFlags = flagsToCheck;
    let someHaveQuestionToken = false;
    let allHaveQuestionToken = true;
    let hasOverloads = false;
    let bodyDeclaration: FunctionLikeDeclaration | undefined;
    let lastSeenNonAmbientDeclaration: FunctionLikeDeclaration | undefined;
    let previousDeclaration: SignatureDeclaration | undefined;
    const declarations = this.declarations;
    const isConstructor = (this.flags & SymbolFlags.Constructor) !== 0;
    function reportImplementationExpectedError(node: SignatureDeclaration): void {
      if (node.name && qf.is.missing(node.name)) return;
      let seen = false;
      const subsequentNode = qf.each.child(node.parent, (c) => {
        if (seen) return c;
        seen = c === node;
      });
      if (subsequentNode && subsequentNode.pos === node.end) {
        if (subsequentNode.kind === node.kind) {
          const errorNode: Node = (<FunctionLikeDeclaration>subsequentNode).name || subsequentNode;
          const subsequentName = (<FunctionLikeDeclaration>subsequentNode).name;
          if (
            node.name &&
            subsequentName &&
            ((node.name.kind === Syntax.PrivateIdentifier && subsequentName.kind === Syntax.PrivateIdentifier && node.name.escapedText === subsequentName.escapedText) ||
              (node.name.kind === Syntax.ComputedPropertyName && subsequentName.kind === Syntax.ComputedPropertyName) ||
              (qf.is.propertyNameLiteral(node.name) &&
                qf.is.propertyNameLiteral(subsequentName) &&
                qf.get.escapedTextOfIdentifierOrLiteral(node.name) === qf.get.escapedTextOfIdentifierOrLiteral(subsequentName)))
          ) {
            const reportError =
              (node.kind === Syntax.MethodDeclaration || node.kind === Syntax.MethodSignature) &&
              qf.has.syntacticModifier(node, ModifierFlags.Static) !== qf.has.syntacticModifiers(ubsequentNode, ModifierFlags.Static);
            if (reportError) {
              const diagnostic = qf.has.syntacticModifier(node, ModifierFlags.Static) ? qd.Function_overload_must_be_static : qd.Function_overload_must_not_be_static;
              error(errorNode, diagnostic);
            }
            return;
          }
          if (qf.is.present((<FunctionLikeDeclaration>subsequentNode).body)) {
            error(errorNode, qd.Function_implementation_name_must_be_0, declarationNameToString(node.name));
            return;
          }
        }
      }
      const errorNode: Node = node.name || node;
      if (isConstructor) error(errorNode, qd.Constructor_implementation_is_missing);
      else {
        if (qf.has.syntacticModifier(node, ModifierFlags.Abstract)) error(errorNode, qd.All_declarations_of_an_abstract_method_must_be_consecutive);
        else error(errorNode, qd.Function_implementation_is_missing_or_not_immediately_following_the_declaration);
      }
    }
    let duplicateFunctionDeclaration = false;
    let multipleConstructorImplementation = false;
    let hasNonAmbientClass = false;
    for (const current of declarations) {
      const node = <SignatureDeclaration | ClassDeclaration | ClassExpression>current;
      const inAmbientContext = node.flags & NodeFlags.Ambient;
      const inAmbientContextOrInterface = node.parent.kind === Syntax.InterfaceDeclaration || node.parent.kind === Syntax.TypingLiteral || inAmbientContext;
      if (inAmbientContextOrInterface) previousDeclaration = undefined;
      if ((node.kind === Syntax.ClassDeclaration || node.kind === Syntax.ClassExpression) && !inAmbientContext) hasNonAmbientClass = true;
      if (node.kind === Syntax.FunctionDeclaration || node.kind === Syntax.MethodDeclaration || node.kind === Syntax.MethodSignature || node.kind === Syntax.Constructor) {
        const currentNodeFlags = getEffectiveDeclarationFlags(node, flagsToCheck);
        someNodeFlags |= currentNodeFlags;
        allNodeFlags &= currentNodeFlags;
        someHaveQuestionToken = someHaveQuestionToken || qf.has.questionToken(node);
        allHaveQuestionToken = allHaveQuestionToken && qf.has.questionToken(node);
        if (qf.is.present((node as FunctionLikeDeclaration).body) && bodyDeclaration) {
          if (isConstructor) multipleConstructorImplementation = true;
          else duplicateFunctionDeclaration = true;
        } else if (previousDeclaration && previousDeclaration.parent === node.parent && previousDeclaration.end !== node.pos) {
          reportImplementationExpectedError(previousDeclaration);
        }
        if (qf.is.present((node as FunctionLikeDeclaration).body))
          if (!bodyDeclaration) bodyDeclaration = node as FunctionLikeDeclaration;
          else hasOverloads = true;
        previousDeclaration = node;
        if (!inAmbientContextOrInterface) lastSeenNonAmbientDeclaration = node as FunctionLikeDeclaration;
      }
    }
    if (multipleConstructorImplementation) {
      forEach(declarations, (declaration) => {
        error(declaration, qd.Multiple_constructor_implementations_are_not_allowed);
      });
    }
    if (duplicateFunctionDeclaration) {
      forEach(declarations, (declaration) => {
        error(qf.decl.nameOf(declaration), qd.Duplicate_function_implementation);
      });
    }
    if (hasNonAmbientClass && !isConstructor && this.flags & SymbolFlags.Function) {
      forEach(declarations, (declaration) => {
        addDuplicateDeclarationError(declaration, qd.Duplicate_identifier_0, this.name, declarations);
      });
    }
    if (
      lastSeenNonAmbientDeclaration &&
      !lastSeenNonAmbientDeclaration.body &&
      !has.syntacticModifier(lastSeenNonAmbientDeclaration, ModifierFlags.Abstract) &&
      !lastSeenNonAmbientDeclaration.questionToken
    ) {
      reportImplementationExpectedError(lastSeenNonAmbientDeclaration);
    }
    if (hasOverloads) {
      qf.check.flagAgreementBetweenOverloads(declarations, bodyDeclaration, flagsToCheck, someNodeFlags, allNodeFlags);
      qf.check.questionTokenAgreementBetweenOverloads(declarations, bodyDeclaration, someHaveQuestionToken, allHaveQuestionToken);
      if (bodyDeclaration) {
        const ss = this.getSignaturesOfSymbol();
        const bs = qf.get.signatureFromDeclaration(bodyDeclaration);
        for (const s of ss) {
          if (!isImplementationCompatibleWithOverload(bs, s)) {
            addRelatedInfo(
              error(s.declaration, qd.This_overload_signature_is_not_compatible_with_its_implementation_signature),
              qf.create.diagnosticForNode(bodyDeclaration, qd.The_implementation_signature_is_declared_here)
            );
            break;
          }
        }
      }
    }
  }
  checkTypeParamListsIdentical() {
    if (this.declarations?.length === 1) return;
    const ls = this.getLinks();
    if (!ls.typeParamsChecked) {
      ls.typeParamsChecked = true;
      const ds = this.getClassOrInterfaceDeclarationsOfSymbol();
      if (!ds || ds.length <= 1) return;
      const t = this.getDeclaredTypeOfSymbol() as InterfaceType;
      if (!areTypeParamsIdentical(ds, t.localTypeParams!)) {
        const n = this.symbolToString();
        for (const d of ds) {
          error(d.name, qd.All_declarations_of_0_must_have_identical_type_params, n);
        }
      }
    }
  }
  getTargetSymbol() {
    return this.checkFlags() & CheckFlags.Instantiated ? this.target! : this;
  }
  getClassOrInterfaceDeclarationsOfSymbol() {
    return qu.filter(this.declarations, (d: Declaration): d is ClassDeclaration | InterfaceDeclaration => d.kind === Syntax.ClassDeclaration || d.kind === Syntax.InterfaceDeclaration);
  }
  getFirstNonAmbientClassOrFunctionDeclaration(): Declaration | undefined {
    for (const d of this.declarations ?? []) {
      if ((d.kind === Syntax.ClassDeclaration || (d.kind === Syntax.FunctionDeclaration && qf.is.present((<FunctionLikeDeclaration>d).body))) && !(d.flags & NodeFlags.Ambient)) return d;
    }
    return;
  }
  getRootSymbols(): readonly Symbol[] {
    const rs = this.getImmediateRootSymbols();
    return rs ? flatMap(rs, this.getRootSymbols) : [this];
  }
  getImmediateRootSymbols(): readonly Symbol[] | undefined {
    if (this.checkFlags() & CheckFlags.Synthetic) return mapDefined(this.getLinks().containingType!.types, (t) => qf.get.propertyOfType(t, this.escName));
    if (this.flags & SymbolFlags.Transient) {
      const { leftSpread, rightSpread, syntheticOrigin } = this as TransientSymbol;
      return leftSpread ? [leftSpread, rightSpread!] : syntheticOrigin ? [syntheticOrigin] : singleElemArray(this.tryGetAliasTarget());
    }
    return;
  }
  tryGetAliasTarget(): Symbol | undefined {
    let target: Symbol | undefined;
    let next: Symbol | undefined = this;
    while ((next = next.getLinks().target)) {
      target = next;
    }
    return target;
  }
  isSymbolOfDestructuredElemOfCatchBinding() {
    return this.valueDeclaration.kind === Syntax.BindingElem && walkUpBindingElemsAndPatterns(this.valueDeclaration).parent.kind === Syntax.CatchClause;
  }
  isSymbolOfDeclarationWithCollidingName() {
    if (this.flags & SymbolFlags.BlockScoped && !qf.is.kind(qc.SourceFile, this.valueDeclaration)) {
      const ls = this.getLinks();
      if (ls.isDeclarationWithCollidingName === undefined) {
        const container = qf.get.enclosingBlockScopeContainer(this.valueDeclaration);
        if (qf.is.statementWithLocals(container) || this.isSymbolOfDestructuredElemOfCatchBinding()) {
          const nodeLinks = qf.get.nodeLinks(this.valueDeclaration);
          if (resolveName(container.parent, this.escName, SymbolFlags.Value, undefined, undefined, false)) ls.isDeclarationWithCollidingName = true;
          else if (nodeLinks.flags & NodeCheckFlags.CapturedBlockScopedBinding) {
            const isDeclaredInLoop = nodeLinks.flags & NodeCheckFlags.BlockScopedBindingInLoop;
            const inLoopIniter = qf.is.iterationStatement(container, false);
            const inLoopBodyBlock = container.kind === Syntax.Block && qf.is.iterationStatement(container.parent, false);
            ls.isDeclarationWithCollidingName = !qf.is.blockScopedContainerTopLevel(container) && (!isDeclaredInLoop || (!inLoopIniter && !inLoopBodyBlock));
          } else {
            ls.isDeclarationWithCollidingName = false;
          }
        }
      }
      return ls.isDeclarationWithCollidingName!;
    }
    return false;
  }
  isAliasResolvedToValue() {
    const target = this.resolveAlias();
    if (target === unknownSymbol) return true;
    return !!(target.flags & SymbolFlags.Value) && (compilerOpts.preserveConstEnums || !isConstEnumOrConstEnumOnlyModule(target));
  }
  isConstEnumOrConstEnumOnlyModule() {
    return this.isConstEnumSymbol() || !!this.constEnumOnlyModule;
  }
  getTypeReferenceDirectivesForSymbol(meaning?: SymbolFlags): string[] | undefined {
    if (!fileToDirective) return;
    if (!this.isSymbolFromTypeDeclarationFile()) return;
    let typeReferenceDirectives: string[] | undefined;
    for (const d of this.declarations ?? []) {
      if (d.symbol && d.symbol.flags & meaning!) {
        const file = d.sourceFile;
        const typeReferenceDirective = fileToDirective.get(file.path);
        if (typeReferenceDirective) (typeReferenceDirectives || (typeReferenceDirectives = [])).push(typeReferenceDirective);
        else return;
      }
    }
    return typeReferenceDirectives;
  }
  isSymbolFromTypeDeclarationFile() {
    if (!this.declarations) return false;
    let current = this;
    while (true) {
      const p = current.getParentOfSymbol();
      if (p) current = p;
      else break;
    }
    if (current.valueDeclaration && current.valueDeclaration.kind === Syntax.SourceFile && current.flags & SymbolFlags.ValueModule) return false;
    for (const d of this.declarations) {
      const f = d.sourceFile;
      if (fileToDirective.has(f.path)) return true;
    }
    return false;
  }
  checkSymbolUsageInExpressionContext(name: qu.__String, useSite: Node) {
    if (!qf.is.validTypeOnlyAliasUseSite(useSite)) {
      const typeOnlyDeclaration = this.getTypeOnlyAliasDeclaration();
      if (typeOnlyDeclaration) {
        const isExport = typeOnlyDeclarationIsExport(typeOnlyDeclaration);
        const message = isExport ? qd._0_cannot_be_used_as_a_value_because_it_was_exported_using_export_type : qd._0_cannot_be_used_as_a_value_because_it_was_imported_using_import_type;
        const relatedMessage = isExport ? qd._0_was_exported_here : qd._0_was_imported_here;
        const unescName = qy.get.unescUnderscores(name);
        addRelatedInfo(error(useSite, message, unescName), qf.create.diagnosticForNode(typeOnlyDeclaration, relatedMessage, unescName));
      }
    }
  }
  isTypeParamSymbolDeclaredInContainer(container: Node) {
    for (const d of this.declarations) {
      if (d.kind === Syntax.TypeParam) {
        const p = d.parent.kind === Syntax.DocTemplateTag ? qc.getDoc.host(d.parent) : d.parent;
        if (p === container) return !(d.parent.kind === Syntax.DocTemplateTag && find((d.parent.parent as Doc).tags!, isDocTypeAlias));
      }
    }
    return false;
  }
  getExportOfModule(spec: ImportOrExportSpecifier, dontResolveAlias: boolean): Symbol | undefined {
    if (this.flags & SymbolFlags.Module) {
      const name = (spec.propertyName ?? spec.name).escapedText;
      const exportSymbol = this.getExportsOfSymbol().get(name);
      const resolved = exportSymbol.resolveSymbol(dontResolveAlias);
      markSymbolOfAliasDeclarationIfTypeOnly(spec, exportSymbol, resolved, false);
      return resolved;
    }
    return;
  }
  etPropertyOfVariable(name: qu.__String): Symbol | undefined {
    if (this.flags & SymbolFlags.Variable) {
      const typeAnnotation = (<VariableDeclaration>this.valueDeclaration).type;
      if (typeAnnotation) return qf.get.propertyOfType(qf.get.typeFromTypeNode(typeAnnotation), name)?.resolveSymbol();
    }
    return;
  }
  getFullyQualifiedName(containingLocation?: Node): string {
    return this.parent
      ? qf.get.fullyQualifiedName(this.parent, containingLocation) + '.' + this.symbolToString()
      : this.symbolToString(containingLocation, undefined, qt.SymbolFormatFlags.DoNotIncludeSymbolChain | qt.SymbolFormatFlags.AllowAnyNodeKind);
  }
  getAliasForSymbolInContainer(container: Symbol) {
    if (container === this.getParentOfSymbol()) return this;
    const exportEquals = container.exports && container.exports.get(InternalSymbol.ExportEquals);
    if (exportEquals && qf.get.symbolIfSameReference(exportEquals, this)) return container;
    const exports = container.getExportsOfSymbol();
    const quick = exports.get(this.escName);
    if (quick && qf.get.symbolIfSameReference(quick, this)) return quick;
    return forEachEntry(exports, (exported) => {
      if (qf.get.symbolIfSameReference(exported, this)) return exported;
    });
  }
  hasVisibleDeclarations(shouldComputeAliasToMakeVisible: boolean): SymbolVisibilityResult | undefined {
    let aliasesToMakeVisible: LateVisibilityPaintedStatement[] | undefined;
    if (
      !every(
        qu.filter(this.declarations, (d) => d.kind !== Syntax.Identifier),
        getIsDeclarationVisible
      )
    ) {
      return;
    }
    return { accessibility: qt.SymbolAccessibility.Accessible, aliasesToMakeVisible };
    function getIsDeclarationVisible(declaration: Declaration) {
      if (!qf.is.declarationVisible(declaration)) {
        const anyImportSyntax = getAnyImportSyntax(declaration);
        if (anyImportSyntax && !has.syntacticModifier(anyImportSyntax, ModifierFlags.Export) && qf.is.declarationVisible(anyImportSyntax.parent)) return addVisibleAlias(declaration, anyImportSyntax);
        else if (
          declaration.kind === Syntax.VariableDeclaration &&
          declaration.parent.parent.kind === Syntax.VariableStatement &&
          !has.syntacticModifier(declaration.parent.parent, ModifierFlags.Export) &&
          qf.is.declarationVisible(declaration.parent.parent.parent)
        ) {
          return addVisibleAlias(declaration, declaration.parent.parent);
        } else if (qf.is.lateVisibilityPaintedStatement(declaration) && !has.syntacticModifier(declaration, ModifierFlags.Export) && qf.is.declarationVisible(declaration.parent)) {
          return addVisibleAlias(declaration, declaration);
        }
        return false;
      }
      return true;
    }
    function addVisibleAlias(declaration: Declaration, aliasingStatement: LateVisibilityPaintedStatement) {
      if (shouldComputeAliasToMakeVisible) {
        qf.get.nodeLinks(declaration).isVisible = true;
        aliasesToMakeVisible = appendIfUnique(aliasesToMakeVisible, aliasingStatement);
      }
      return true;
    }
  }
  getDeclarationWithTypeAnnotation(enclosingDeclaration: Node | undefined) {
    return this.declarations && find(this.declarations, (s) => !!get.effectiveTypeAnnotationNode(s) && (!enclosingDeclaration || !!qc.findAncestor(s, (n) => n === enclosingDeclaration)));
  }
  getNameOfSymbolFromNameType(c?: QContext) {
    const nameType = this.getLinks().nameType;
    if (nameType) {
      if (nameType.flags & qt.TypeFlags.StringOrNumberLiteral) {
        const name = '' + (<StringLiteralType | NumberLiteralType>nameType).value;
        if (!qy.is.identifierText(name) && !NumericLiteral.name(name)) return `"${escapeString(name, Codes.doubleQuote)}"`;
        if (NumericLiteral.name(name) && startsWith(name, '-')) return `[${name}]`;
        return name;
      }
      if (nameType.flags & qt.TypeFlags.UniqueESSymbol) return `[${getNameOfSymbolAsWritten((<UniqueESSymbolType>nameType).symbol, c)}]`;
    }
  }
  getNameOfSymbolAsWritten(c?: QContext): string {
    if (
      c &&
      this.escName === InternalSymbol.Default &&
      !(c.flags & qt.NodeBuilderFlags.UseAliasDefinedOutsideCurrentScope) &&
      (!(c.flags & qt.NodeBuilderFlags.InInitialEntityName) ||
        !this.declarations ||
        (c.enclosingDeclaration && qc.findAncestor(this.declarations[0], isDefaultBindingContext) !== qc.findAncestor(c.enclosingDeclaration, isDefaultBindingContext)))
    ) {
      return 'default';
    }
    if (this.declarations && this.declarations.length) {
      let d = firstDefined(this.declarations, (d) => (qf.decl.nameOf(d) ? d : undefined));
      const name = d && qf.decl.nameOf(d);
      if (d && name) {
        if (d.kind === Syntax.CallExpression && qf.is.bindableObjectDefinePropertyCall(d)) return this.name;
        if (name.kind === Syntax.ComputedPropertyName && !(this.checkFlags() & CheckFlags.Late)) {
          const nameType = this.getLinks().nameType;
          if (nameType && nameType.flags & qt.TypeFlags.StringOrNumberLiteral) {
            const result = getNameOfSymbolFromNameType(this, c);
            if (result !== undefined) return result;
          }
        }
        return declarationNameToString(name);
      }
      if (!d) d = this.declarations[0];
      if (d.parent && d.parent.kind === Syntax.VariableDeclaration) return declarationNameToString((<VariableDeclaration>d.parent).name);
      switch (d.kind) {
        case Syntax.ClassExpression:
        case Syntax.FunctionExpression:
        case Syntax.ArrowFunction:
          if (c && !c.encounteredError && !(c.flags & qt.NodeBuilderFlags.AllowAnonymousIdentifier)) c.encounteredError = true;
          return d.kind === Syntax.ClassExpression ? '(Anonymous class)' : '(Anonymous function)';
      }
    }
    const n = getNameOfSymbolFromNameType(this, c);
    return n !== undefined ? n : this.name;
  }
  isNamespaceMember() {
    return !(this.flags & SymbolFlags.Prototype || this.escName === 'prototype' || (this.valueDeclaration?.parent && qc.is.classLike(this.valueDeclaration.parent)));
  }
}
const unknownSymbol = new Symbol(SymbolFlags.Property, 'unknown' as qu.__String);
const resolvingSymbol = new Symbol(0, InternalSymbol.Resolving);
