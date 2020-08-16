import { ExpandingFlags, ModifierFlags, Node, NodeFlags, ObjectFlags, SymbolFlags, TypeFlags, VarianceFlags } from './types';
import { Fget } from './get';
import { Fhas, Fis } from './groups';
import { qt.Symbol } from './bases';
import { Syntax } from '../syntax';
import * as qc from '../core';
import * as qd from '../diags';
import * as qg from '../debug';
import * as qt from './types';
import * as qu from '../utils';
import * as qy from '../syntax';
export function newCreate(f: qt.Frame) {
  interface Frame extends qt.Frame {
    get: Fget;
    has: Fhas;
    is: Fis;
  }
  const qf = f as Frame;
  interface Fcreate extends qc.Fcreate {}
  class Fcreate {
    intrinsicType(k: qt.TypeFlags, n: string, f: ObjectFlags = 0): qt.IntrinsicType {
      const r = this.type(k);
      r.intrinsicName = n;
      r.objectFlags = f;
      return r;
    }
    booleanType(ts: readonly qt.Type[]): qt.IntrinsicType & qt.UnionType {
      const type = qf.get.unionType(ts);
      type.flags |= qt.TypeFlags.Boolean;
      type.intrinsicName = 'boolean';
      return type;
    }
    objectType(objectFlags: ObjectFlags, symbol?: qt.Symbol): qt.ObjectType {
      const type = <qt.ObjectType>this.type(TypeFlags.Object);
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
    typeofType() {
      return qf.get.unionType(arrayFrom(typeofEQFacts.keys(), qf.get.literalType));
    }
    typeParam(symbol?: qt.Symbol) {
      const type = <qt.TypeParam>this.type(TypeFlags.TypeParam);
      if (symbol) type.symbol = symbol;
      return type;
    }
    anonymousType(
      symbol: qt.Symbol | undefined,
      members: qt.SymbolTable,
      callSignatures: readonly qt.Signature[],
      constructSignatures: readonly qt.Signature[],
      stringIndexInfo: qt.IndexInfo | undefined,
      numberIndexInfo: qt.IndexInfo | undefined
    ): qt.ResolvedType {
      return setStructuredTypeMembers(this.objectType(ObjectFlags.Anonymous, symbol), members, callSignatures, constructSignatures, stringIndexInfo, numberIndexInfo);
    }
    instantiatedSymbolTable(symbols: qt.Symbol[], mapper: qt.TypeMapper, mappingThisOnly: boolean): qt.SymbolTable {
      const result = new qc.SymbolTable();
      for (const symbol of symbols) {
        result.set(symbol.escName, mappingThisOnly && isThisless(symbol) ? symbol : qf.instantiate.symbol(symbol, mapper));
      }
      return result;
    }
    signature(
      declaration: qt.SignatureDeclaration | qt.DocSignature | undefined,
      typeParams: readonly qt.TypeParam[] | undefined,
      thisParam: qt.Symbol | undefined,
      params: readonly qt.Symbol[],
      resolvedReturn: qt.Type | undefined,
      resolvedPredicate: qt.TypePredicate | undefined,
      minArgCount: number,
      flags: SignatureFlags
    ): qt.Signature {
      const sig = new qc.Signature(checker, flags);
      sig.declaration = declaration;
      sig.typeParams = typeParams;
      sig.params = params;
      sig.thisParam = thisParam;
      sig.resolvedReturn = resolvedReturn;
      sig.resolvedPredicate = resolvedPredicate;
      sig.minArgCount = minArgCount;
      sig.target = undefined;
      sig.mapper = undefined;
      sig.unions = undefined;
      return sig;
    }
    unionSignature(signature: qt.Signature, unions: qt.Signature[]) {
      const result = cloneSignature(signature);
      result.unions = unions;
      result.target = undefined;
      result.mapper = undefined;
      return result;
    }
    optionalCallSignature(signature: qt.Signature, callChainFlags: SignatureFlags) {
      assert(
        callChainFlags === SignatureFlags.IsInnerCallChain || callChainFlags === SignatureFlags.IsOuterCallChain,
        'An optional call signature can either be for an inner call chain or an outer call chain, but not both.'
      );
      const result = cloneSignature(signature);
      result.flags |= callChainFlags;
      return result;
    }
    unionOrIntersectionProperty(containingType: qt.UnionOrIntersectionType, name: qu.__String): qt.Symbol | undefined {
      let singleProp: qt.Symbol | undefined;
      let propSet: qu.QMap<qt.Symbol> | undefined;
      let indexTypes: qt.Type[] | undefined;
      const isUnion = qf.is.union(containingType);
      let optionalFlag = isUnion ? qt.SymbolFlags.None : qt.SymbolFlags.Optional;
      let syntheticFlag = qt.CheckFlags.SyntheticMethod;
      let checkFlags = 0;
      for (const current of containingType.types) {
        const type = getApparentType(current);
        if (!(type === errorType || type.flags & qt.TypeFlags.Never)) {
          const prop = qf.get.propertyOfType(type, name);
          const modifiers = prop ? prop.declarationModifierFlags() : 0;
          if (prop) {
            if (isUnion) optionalFlag |= prop.flags & qt.SymbolFlags.Optional;
            else optionalFlag &= prop.flags;
            if (!singleProp) singleProp = prop;
            else if (prop !== singleProp) {
              if (!propSet) {
                propSet = new qu.QMap<qt.Symbol>();
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
            const indexInfo = !isLateBoundName(name) && ((NumericLiteral.name(name) && qf.get.indexInfoOfType(type, IndexKind.Number)) || qf.get.indexInfoOfType(type, IndexKind.String));
            if (indexInfo) {
              checkFlags |= qt.CheckFlags.WritePartial | (indexInfo.isReadonly ? qt.CheckFlags.Readonly : 0);
              indexTypes = append(indexTypes, qf.is.tupleType(type) ? getRestTypeOfTupleType(type) || undefinedType : indexInfo.type);
            } else if (qf.is.objectLiteralType(type)) {
              checkFlags |= qt.CheckFlags.WritePartial;
              indexTypes = append(indexTypes, undefinedType);
            } else checkFlags |= qt.CheckFlags.ReadPartial;
          }
        }
      }
      if (!singleProp || (isUnion && (propSet || checkFlags & qt.CheckFlags.Partial) && checkFlags & (CheckFlags.ContainsPrivate | qt.CheckFlags.ContainsProtected))) return;
      if (!propSet && !(checkFlags & qt.CheckFlags.ReadPartial) && !indexTypes) return singleProp;
      const props = propSet ? arrayFrom(propSet.values()) : [singleProp];
      let declarations: qt.Declaration[] | undefined;
      let firstType: qt.Type | undefined;
      let nameType: qt.Type | undefined;
      const propTypes: qt.Type[] = [];
      let firstValueDeclaration: qt.Declaration | undefined;
      let hasNonUniformValueDeclaration = false;
      for (const prop of props) {
        if (!firstValueDeclaration) firstValueDeclaration = prop.valueDeclaration;
        else if (prop.valueDeclaration && prop.valueDeclaration !== firstValueDeclaration) {
          hasNonUniformValueDeclaration = true;
        }
        declarations = qu.addRange(declarations, prop.declarations);
        const type = prop.typeOfSymbol();
        if (!firstType) {
          firstType = type;
          nameType = prop.links.nameType;
        } else if (type !== firstType) {
          checkFlags |= qt.CheckFlags.HasNonUniformType;
        }
        if (qf.is.literalType(type)) checkFlags |= qt.CheckFlags.HasLiteralType;
        if (type.flags & qt.TypeFlags.Never) checkFlags |= qt.CheckFlags.HasNeverType;
        propTypes.push(type);
      }
      qu.addRange(propTypes, indexTypes);
      const result = new qc.Symbol(SymbolFlags.Property | optionalFlag, name, syntheticFlag | checkFlags);
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
        result.type = isUnion ? qf.get.unionType(propTypes) : qf.get.intersectionType(propTypes);
      }
      return result;
    }
    typePredicate(kind: qt.TypePredicateKind, paramName: string | undefined, paramIndex: number | undefined, type: qt.Type | undefined): qt.TypePredicate {
      return { kind, paramName, paramIndex, type } as qt.TypePredicate;
    }
    typePredicateFromTypingPredicate(node: qt.TypingPredicate, signature: qt.Signature): qt.TypePredicate {
      const paramName = node.paramName;
      const type = node.type && qf.get.typeFromTypeNode(node.type);
      return paramName.kind === Syntax.ThisTyping
        ? this.typePredicate(node.assertsModifier ? qt.TypePredicateKind.AssertsThis : qt.TypePredicateKind.This, undefined, type)
        : this.typePredicate(
            node.assertsModifier ? qt.TypePredicateKind.AssertsIdentifier : qt.TypePredicateKind.Identifier,
            paramName.escapedText as string,
            findIndex(signature.params, (p) => p.escName === paramName.escapedText),
            type
          );
    }
    signatureInstantiation(s: qt.Signature, args?: readonly qt.Type[]): qt.Signature {
      return qf.instantiate.signature(s, this.signatureTypeMapper(s, args), true);
    }
    signatureTypeMapper(s: qt.Signature, args?: readonly qt.Type[]): qt.TypeMapper {
      return this.typeMapper(s.typeParams!, args);
    }
    erasedSignature(s: qt.Signature) {
      return qf.instantiate.signature(s, this.typeEraser(s.typeParams!), true);
    }
    canonicalSignature(s: qt.Signature) {
      return getSignatureInstantiation(
        s,
        map(s.typeParams, (p) => (p.target && !qf.get.constraintOfTypeParam(p.target) ? p.target : p)),
        qf.is.inJSFile(s.declaration)
      );
    }
    indexInfo(type: qt.Type, isReadonly: boolean, declaration?: qt.IndexSignatureDeclaration): qt.IndexInfo {
      return { type, isReadonly, declaration };
    }
    typeReference(target: qt.GenericType, typeArgs: readonly qt.Type[] | undefined): qt.TypeReference {
      const id = getTypeListId(typeArgs);
      let type = target.instantiations.get(id);
      if (!type) {
        type = <qt.TypeReference>this.objectType(ObjectFlags.Reference, target.symbol);
        target.instantiations.set(id, type);
        type.objectFlags |= typeArgs ? getPropagatingFlagsOfTypes(typeArgs, 0) : 0;
        type.target = target;
        type.resolvedTypeArgs = typeArgs;
      }
      return type;
    }
    deferredTypeReference(target: qt.GenericType, node: qt.TypingReference | qt.ArrayTyping | qt.TupleTyping, mapper?: qt.TypeMapper): qt.DeferredTypeReference {
      const aliasSymbol = getAliasSymbolForTypeNode(node);
      const aliasTypeArgs = getTypeArgsForAliasSymbol(aliasSymbol);
      const type = <qt.DeferredTypeReference>this.objectType(ObjectFlags.Reference, target.symbol);
      type.target = target;
      type.node = node;
      type.mapper = mapper;
      type.aliasSymbol = aliasSymbol;
      type.aliasTypeArgs = mapper ? qf.instantiate.types(aliasTypeArgs, mapper) : aliasTypeArgs;
      return type;
    }
    typeFromGenericGlobalType(genericGlobalType: qt.GenericType, typeArgs: readonly qt.Type[]): qt.ObjectType {
      return genericGlobalType !== emptyGenericType ? this.typeReference(genericGlobalType, typeArgs) : emptyObjectType;
    }
    typedPropertyDescriptorType(propertyType: qt.Type): qt.Type {
      return this.typeFromGenericGlobalType(getGlobalTypedPropertyDescriptorType(), [propertyType]);
    }
    iterableType(iteratedType: qt.Type): qt.Type {
      return this.typeFromGenericGlobalType(getGlobalIterableType(true), [iteratedType]);
    }
    arrayType(elemType: qt.Type, readonly?: boolean): qt.ObjectType {
      return this.typeFromGenericGlobalType(readonly ? globalReadonlyArrayType : globalArrayType, [elemType]);
    }
    tupleTypeOfArity(arity: number, minLength: number, hasRestElem: boolean, readonly: boolean, namedMemberDeclarations: readonly (NamedTupleMember | qt.ParamDeclaration)[] | undefined): qt.TupleType {
      let typeParams: qt.TypeParam[] | undefined;
      const properties: qt.Symbol[] = [];
      const maxLength = hasRestElem ? arity - 1 : arity;
      if (arity) {
        typeParams = new Array(arity);
        for (let i = 0; i < arity; i++) {
          const typeParam = (typeParams[i] = this.typeParam());
          if (i < maxLength) {
            const property = new qc.Symbol(SymbolFlags.Property | (i >= minLength ? qt.SymbolFlags.Optional : 0), ('' + i) as qu.__String, readonly ? qt.CheckFlags.Readonly : 0);
            property.tupleLabelDeclaration = namedMemberDeclarations?.[i];
            property.type = typeParam;
            properties.push(property);
          }
        }
      }
      const literalTypes = [];
      for (let i = minLength; i <= maxLength; i++) literalTypes.push(qf.get.literalType(i));
      const lengthSymbol = new qc.Symbol(SymbolFlags.Property, 'length' as qu.__String);
      lengthSymbol.type = hasRestElem ? numberType : qf.get.unionType(literalTypes);
      properties.push(lengthSymbol);
      const type = <qt.TupleType & qt.InterfaceTypeWithDeclaredMembers>this.objectType(ObjectFlags.Tuple | ObjectFlags.Reference);
      type.typeParams = typeParams;
      type.outerTypeParams = undefined;
      type.localTypeParams = typeParams;
      type.instantiations = new qu.QMap<qt.TypeReference>();
      type.instantiations.set(getTypeListId(type.typeParams), <qt.GenericType>type);
      type.target = <qt.GenericType>type;
      type.resolvedTypeArgs = type.typeParams;
      type.thisType = this.typeParam();
      type.thisType.isThisType = true;
      type.thisType.constraint = type;
      type.declaredProperties = properties;
      type.declaredCallSignatures = empty;
      type.declaredConstructSignatures = empty;
      type.declaredStringIndexInfo = undefined;
      type.declaredNumberIndexInfo = undefined;
      type.minLength = minLength;
      type.hasRestElem = hasRestElem;
      type.readonly = readonly;
      type.labeledElemDeclarations = namedMemberDeclarations;
      return type;
    }
    tupleType(elemTypes: readonly qt.Type[], minLength = elemTypes.length, hasRestElem = false, readonly = false, namedMemberDeclarations?: readonly (NamedTupleMember | qt.ParamDeclaration)[]) {
      const arity = elemTypes.length;
      if (arity === 1 && hasRestElem) return this.arrayType(elemTypes[0], readonly);
      const tupleType = getTupleTypeOfArity(arity, minLength, arity > 0 && hasRestElem, readonly, namedMemberDeclarations);
      return elemTypes.length ? this.typeReference(tupleType, elemTypes) : tupleType;
    }
    intersectionType(types: qt.Type[], aliasSymbol?: qt.Symbol, aliasTypeArgs?: readonly qt.Type[]) {
      const result = <qt.IntersectionType>this.type(TypeFlags.Intersection);
      result.objectFlags = getPropagatingFlagsOfTypes(types, qt.TypeFlags.Nullable);
      result.types = types;
      result.aliasSymbol = aliasSymbol;
      result.aliasTypeArgs = aliasTypeArgs;
      return result;
    }
    indexType(type: qt.InstantiableType | qt.UnionOrIntersectionType, stringsOnly: boolean) {
      const result = <qt.IndexType>this.type(TypeFlags.Index);
      result.type = type;
      result.stringsOnly = stringsOnly;
      return result;
    }
    indexedAccessType(objectType: qt.Type, indexType: qt.Type) {
      const type = <qt.IndexedAccessType>this.type(TypeFlags.IndexedAccess);
      type.objectType = objectType;
      type.indexType = indexType;
      return type;
    }
    literalType(flags: qt.TypeFlags, value: string | number | qt.PseudoBigInt, symbol: qt.Symbol | undefined) {
      const type = <qt.LiteralType>this.type(flags);
      type.symbol = symbol!;
      type.value = value;
      return type;
    }
    typeMapper(sources: readonly qt.TypeParam[], targets: readonly qt.Type[] | undefined): qt.TypeMapper {
      return sources.length === 1 ? makeUnaryTypeMapper(sources[0], targets ? targets[0] : anyType) : makeArrayTypeMapper(sources, targets);
    }
    typeEraser(sources: readonly qt.TypeParam[]): qt.TypeMapper {
      return this.typeMapper(sources, undefined);
    }
    backreferenceMapper(context: qt.InferenceContext, index: number): qt.TypeMapper {
      return makeFunctionTypeMapper((t) => (findIndex(context.inferences, (info) => info.typeParam === t) >= index ? unknownType : t));
    }
    symbolWithType(source: qt.Symbol, type: qt.Type | undefined) {
      const symbol = new qc.Symbol(source.flags, source.escName, source.checkFlags() & qt.CheckFlags.Readonly);
      symbol.declarations = source.declarations;
      symbol.parent = source.parent;
      symbol.type = type;
      symbol.target = source;
      if (source.valueDeclaration) symbol.valueDeclaration = source.valueDeclaration;
      const nameType = source.links.nameType;
      if (nameType) symbol.nameType = nameType;
      return symbol;
    }
    wideningContext(parent: qt.WideningContext | undefined, propertyName: qu.__String | undefined, siblings: qt.Type[] | undefined): qt.WideningContext {
      return { parent, propertyName, siblings, resolvedProperties: undefined };
    }
    inferenceContext(typeParams: readonly qt.TypeParam[], signature: qt.Signature | undefined, flags: InferenceFlags, compareTypes?: qt.TypeComparer): qt.InferenceContext {
      return this.inferenceContextWorker(typeParams.map(this.inferenceInfo), signature, flags, compareTypes || compareTypesAssignable);
    }
    inferenceContextWorker(inferences: qt.InferenceInfo[], signature: qt.Signature | undefined, flags: InferenceFlags, compareTypes: qt.TypeComparer): qt.InferenceContext {
      const context: qt.InferenceContext = {
        inferences,
        signature,
        flags,
        compareTypes,
        mapper: makeFunctionTypeMapper((t) => mapToInferredType(context, t, true)),
        nonFixingMapper: makeFunctionTypeMapper((t) => mapToInferredType(context, t, false)),
      };
      return context;
    }
    inferenceInfo(typeParam: qt.TypeParam): qt.InferenceInfo {
      return {
        typeParam,
        candidates: undefined,
        contraCandidates: undefined,
        inferredType: undefined,
        priority: undefined,
        topLevel: true,
        isFixed: false,
      };
    }
    emptyObjectTypeFromStringLiteral(type: qt.Type) {
      const members = new qc.SymbolTable();
      forEachType(type, (t) => {
        if (!(t.flags & qt.TypeFlags.StringLiteral)) return;
        const name = qy.get.escUnderscores((t as qt.StringLiteralType).value);
        const literalProp = new qc.Symbol(SymbolFlags.Property, name);
        literalProp.type = anyType;
        if (t.symbol) {
          literalProp.declarations = t.symbol.declarations;
          literalProp.valueDeclaration = t.symbol.valueDeclaration;
        }
        members.set(name, literalProp);
      });
      const indexInfo = type.flags & qt.TypeFlags.String ? this.indexInfo(emptyObjectType, false) : undefined;
      return this.anonymousType(undefined, members, empty, empty, indexInfo, undefined);
    }
    reverseMappedType(source: qt.Type, target: qt.MappedType, constraint: qt.IndexType) {
      if (!(qf.get.indexInfoOfType(source, IndexKind.String) || (qf.get.propertiesOfType(source).length !== 0 && qf.is.partiallyInferableType(source)))) return;
      if (qf.is.arrayType(source)) return this.arrayType(inferReverseMappedType(getTypeArgs(<qt.TypeReference>source)[0], target, constraint), qf.is.readonlyArrayType(source));
      if (qf.is.tupleType(source)) {
        const elemTypes = map(getTypeArgs(source), (t) => inferReverseMappedType(t, target, constraint));
        const minLength = getMappedTypeModifiers(target) & MappedTypeModifiers.IncludeOptional ? getTypeReferenceArity(source) - (source.target.hasRestElem ? 1 : 0) : source.target.minLength;
        return this.tupleType(elemTypes, minLength, source.target.hasRestElem, source.target.readonly, source.target.labeledElemDeclarations);
      }
      const reversed = this.objectType(ObjectFlags.ReverseMapped | ObjectFlags.Anonymous, undefined) as qt.ReverseMappedType;
      reversed.source = source;
      reversed.mappedType = target;
      reversed.constraintType = constraint;
      return reversed;
    }
    flowType(type: qt.Type, incomplete: boolean): qt.FlowType {
      return incomplete ? { flags: 0, type } : type;
    }
    evolvingArrayType(elemType: qt.Type): qt.EvolvingArrayType {
      const result = <qt.EvolvingArrayType>this.objectType(ObjectFlags.EvolvingArray);
      result.elemType = elemType;
      return result;
    }
    finalArrayType(elemType: qt.Type) {
      return elemType.flags & qt.TypeFlags.Never
        ? autoArrayType
        : this.arrayType(elemType.flags & qt.TypeFlags.Union ? qf.get.unionType((<qt.UnionType>elemType).types, qt.UnionReduction.Subtype) : elemType);
    }
    arrayLiteralType(type: qt.ObjectType) {
      if (!(getObjectFlags(type) & ObjectFlags.Reference)) return type;
      let literalType = (<qt.TypeReference>type).literalType;
      if (!literalType) {
        literalType = (<qt.TypeReference>type).literalType = cloneTypeReference(<qt.TypeReference>type);
        literalType.objectFlags |= ObjectFlags.ArrayLiteral | ObjectFlags.ContainsObjectOrArrayLiteral;
      }
      return literalType;
    }
    jsxAttributesTypeFromAttributesProperty(openingLikeElem: qt.JsxOpeningLikeElem, checkMode: CheckMode | undefined) {
      const attributes = openingLikeElem.attributes;
      const allAttributesTable = strictNullChecks ? new qc.SymbolTable() : undefined;
      let attributesTable = new qc.SymbolTable();
      let spread: qt.Type = emptyJsxObjectType;
      let hasSpreadAnyType = false;
      let typeToIntersect: qt.Type | undefined;
      let explicitlySpecifyChildrenAttribute = false;
      let objectFlags: ObjectFlags = ObjectFlags.JsxAttributes;
      const jsxChildrenPropertyName = getJsxElemChildrenPropertyName(getJsxNamespaceAt(openingLikeElem));
      for (const attributeDecl of attributes.properties) {
        const member = attributeDecl.symbol;
        if (attributeDecl.kind === Syntax.JsxAttribute) {
          const exprType = check.jsxAttribute(attributeDecl, checkMode);
          objectFlags |= getObjectFlags(exprType) & ObjectFlags.PropagatingFlags;
          const attributeSymbol = new qc.Symbol(SymbolFlags.Property | qt.SymbolFlags.Transient | member.flags, member.escName);
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
            spread = getSpreadType(spread, this.jsxAttributesType(), attributes.symbol, objectFlags, false);
            attributesTable = new qc.SymbolTable();
          }
          const exprType = getReducedType(check.expressionCached(attributeDecl.expression, checkMode));
          if (qf.is.typeAny(exprType)) hasSpreadAnyType = true;
          if (qf.is.validSpreadType(exprType)) {
            spread = getSpreadType(spread, exprType, attributes.symbol, objectFlags, false);
            if (allAttributesTable) check.spreadPropOverrides(exprType, allAttributesTable, attributeDecl);
          } else {
            typeToIntersect = typeToIntersect ? qf.get.intersectionType([typeToIntersect, exprType]) : exprType;
          }
        }
      }
      if (!hasSpreadAnyType) {
        if (attributesTable.size > 0) spread = getSpreadType(spread, this.jsxAttributesType(), attributes.symbol, objectFlags, false);
      }
      const parent = openingLikeElem.parent.kind === Syntax.JsxElem ? (openingLikeElem.parent as qt.JsxElem) : undefined;
      if (parent && parent.opening === openingLikeElem && parent.children.length > 0) {
        const childrenTypes: qt.Type[] = check.jsxChildren(parent, checkMode);
        if (!hasSpreadAnyType && jsxChildrenPropertyName && jsxChildrenPropertyName !== '') {
          if (explicitlySpecifyChildrenAttribute) error(attributes, qd.msgs._0_are_specified_twice_The_attribute_named_0_will_be_overwritten, qy.get.unescUnderscores(jsxChildrenPropertyName));
          const contextualType = getApparentTypeOfContextualType(openingLikeElem.attributes);
          const childrenContextualType = contextualType && getTypeOfPropertyOfContextualType(contextualType, jsxChildrenPropertyName);
          const childrenPropSymbol = new qc.Symbol(SymbolFlags.Property | qt.SymbolFlags.Transient, jsxChildrenPropertyName);
          childrenPropSymbol.type =
            childrenTypes.length === 1 ? childrenTypes[0] : getArrayLiteralTupleTypeIfApplicable(childrenTypes, childrenContextualType, false) || this.arrayType(qf.get.unionType(childrenTypes));
          childrenPropSymbol.valueDeclaration = qt.PropertySignature.create(undefined, qy.get.unescUnderscores(jsxChildrenPropertyName), undefined, undefined, undefined);
          childrenPropSymbol.valueDeclaration.parent = attributes;
          childrenPropSymbol.valueDeclaration.symbol = childrenPropSymbol;
          const childPropMap = new qc.SymbolTable();
          childPropMap.set(jsxChildrenPropertyName, childrenPropSymbol);
          spread = getSpreadType(spread, this.anonymousType(attributes.symbol, childPropMap, empty, empty, undefined), attributes.symbol, objectFlags, false);
        }
      }
      if (hasSpreadAnyType) return anyType;
      if (typeToIntersect && spread !== emptyJsxObjectType) return qf.get.intersectionType([typeToIntersect, spread]);
      return typeToIntersect || (spread === emptyJsxObjectType ? this.jsxAttributesType() : spread);
      function createJsxAttributesType() {
        objectFlags |= freshObjectLiteralFlag;
        const result = this.anonymousType(attributes.symbol, attributesTable, empty, empty, undefined);
        result.objectFlags |= objectFlags | ObjectFlags.ObjectLiteral | ObjectFlags.ContainsObjectOrArrayLiteral;
        return result;
      }
    }
    syntheticExpression(parent: Node, type: qt.Type, isSpread?: boolean, tupleNameSource?: qt.ParamDeclaration | qt.NamedTupleMember) {
      const result = <qt.SyntheticExpression>this.node(Syntax.SyntheticExpression, parent.pos, parent.end);
      result.parent = parent;
      result.type = type;
      result.isSpread = isSpread || false;
      result.tupleNameSource = tupleNameSource;
      return result;
    }
    unionOfSignaturesForOverloadFailure(candidates: readonly qt.Signature[]): qt.Signature {
      const thisParams = mapDefined(candidates, (c) => c.thisParam);
      let thisParam: qt.Symbol | undefined;
      if (thisParams.length) thisParam = this.combinedSymbolFromTypes(thisParams, thisParams.map(getTypeOfParam));
      const { min: minArgCount, max: maxNonRestParam } = minAndMax(candidates, getNumNonRestParams);
      const params: qt.Symbol[] = [];
      for (let i = 0; i < maxNonRestParam; i++) {
        const symbols = mapDefined(candidates, (s) => (s.hasRestParam(s) ? (i < s.params.length - 1 ? s.params[i] : last(s.params)) : i < s.params.length ? s.params[i] : undefined));
        assert(symbols.length !== 0);
        params.push(
          this.combinedSymbolFromTypes(
            symbols,
            mapDefined(candidates, (candidate) => tryGetTypeAtPosition(candidate, i))
          )
        );
      }
      const restParamSymbols = mapDefined(candidates, (c) => (c.hasRestParam() ? last(c.params) : undefined));
      let flags = SignatureFlags.None;
      if (restParamSymbols.length !== 0) {
        const type = this.arrayType(qf.get.unionType(mapDefined(candidates, tryRestType), qt.UnionReduction.Subtype));
        params.push(this.combinedSymbolForOverloadFailure(restParamSymbols, type));
        flags |= SignatureFlags.HasRestParam;
      }
      if (candidates.some((s) => s.hasLiteralTypes())) flags |= SignatureFlags.HasLiteralTypes;
      return this.signature(candidates[0].declaration, undefined, thisParam, params, qf.get.intersectionType(candidates.map(qf.get.returnTypeOfSignature)), undefined, minArgCount, flags);
    }
    combinedSymbolFromTypes(sources: readonly qt.Symbol[], types: qt.Type[]): qt.Symbol {
      return this.combinedSymbolForOverloadFailure(sources, qf.get.unionType(types, qt.UnionReduction.Subtype));
    }
    combinedSymbolForOverloadFailure(sources: readonly qt.Symbol[], type: qt.Type): qt.Symbol {
      return this.symbolWithType(first(sources), type);
    }
    signatureForJSXIntrinsic(node: qt.JsxOpeningLikeElem, result: qt.Type): qt.Signature {
      const namespace = getJsxNamespaceAt(node);
      const exports = namespace && namespace.getExportsOfSymbol();
      const typeSymbol = exports && exports.fetch(JsxNames.Elem, qt.SymbolFlags.Type);
      const returnNode = typeSymbol && nodeBuilder.symbolToEntityName(typeSymbol, qt.SymbolFlags.Type, node);
      const declaration = qt.FunctionTyping.create(
        undefined,
        [new qc.ParamDeclaration(undefined, undefined, undefined, 'props', undefined, nodeBuilder.typeToTypeNode(result, node))],
        returnNode ? qt.TypingReference.create(returnNode, undefined) : new qc.KeywordTyping(Syntax.AnyKeyword)
      );
      const paramSymbol = new qc.Symbol(SymbolFlags.FunctionScopedVariable, 'props' as qu.__String);
      paramSymbol.type = result;
      return this.signature(declaration, undefined, undefined, [paramSymbol], typeSymbol ? getDeclaredTypeOfSymbol(typeSymbol) : errorType, undefined, 1, SignatureFlags.None);
    }
    promiseType(promisedType: qt.Type): qt.Type {
      const globalPromiseType = getGlobalPromiseType(true);
      if (globalPromiseType !== emptyGenericType) {
        promisedType = getAwaitedType(promisedType) || unknownType;
        return this.typeReference(globalPromiseType, [promisedType]);
      }
      return unknownType;
    }
    promiseLikeType(promisedType: qt.Type): qt.Type {
      const globalPromiseLikeType = getGlobalPromiseLikeType(true);
      if (globalPromiseLikeType !== emptyGenericType) {
        promisedType = getAwaitedType(promisedType) || unknownType;
        return this.typeReference(globalPromiseLikeType, [promisedType]);
      }
      return unknownType;
    }
    promiseReturnType(func: qt.FunctionLikeDeclaration | qt.ImportCall, promisedType: qt.Type) {
      const promiseType = this.promiseType(promisedType);
      if (promiseType === unknownType) {
        error(
          func,
          qf.is.importCall(func)
            ? qd.msgs.A_dynamic_import_call_returns_a_Promise_Make_sure_you_have_a_declaration_for_Promise_or_include_ES2015_in_your_lib_option
            : qd.msgs.An_async_function_or_method_must_return_a_Promise_Make_sure_you_have_a_declaration_for_Promise_or_include_ES2015_in_your_lib_option
        );
        return errorType;
      } else if (!getGlobalPromiseConstructorSymbol(true)) {
        error(
          func,
          qf.is.importCall(func)
            ? qd.msgs.A_dynamic_import_call_in_ES5_SlashES3_requires_the_Promise_constructor_Make_sure_you_have_a_declaration_for_the_Promise_constructor_or_include_ES2015_in_your_lib_option
            : qd.msgs.An_async_function_or_method_in_ES5_SlashES3_requires_the_Promise_constructor_Make_sure_you_have_a_declaration_for_the_Promise_constructor_or_include_ES2015_in_your_lib_option
        );
      }
      return promiseType;
    }
    generatorReturnType(yieldType: qt.Type, returnType: qt.Type, nextType: qt.Type, isAsyncGenerator: boolean) {
      const resolver = isAsyncGenerator ? asyncIterationTypesResolver : syncIterationTypesResolver;
      const globalGeneratorType = resolver.getGlobalGeneratorType(false);
      yieldType = resolver.resolve.iterationType(yieldType, undefined) || unknownType;
      returnType = resolver.resolve.iterationType(returnType, undefined) || unknownType;
      nextType = resolver.resolve.iterationType(nextType, undefined) || unknownType;
      if (globalGeneratorType === emptyGenericType) {
        const globalType = resolver.getGlobalIterableIteratorType(false);
        const iterationTypes = globalType !== emptyGenericType ? getIterationTypesOfGlobalIterableType(globalType, resolver) : undefined;
        const iterableIteratorReturnType = iterationTypes ? iterationTypes.returnType : anyType;
        const iterableIteratorNextType = iterationTypes ? iterationTypes.nextType : undefinedType;
        if (qf.is.typeAssignableTo(returnType, iterableIteratorReturnType) && qf.is.typeAssignableTo(iterableIteratorNextType, nextType)) {
          if (globalType !== emptyGenericType) return this.typeFromGenericGlobalType(globalType, [yieldType]);
          resolver.getGlobalIterableIteratorType(true);
          return emptyObjectType;
        }
        resolver.getGlobalGeneratorType(true);
        return emptyObjectType;
      }
      return this.typeFromGenericGlobalType(globalGeneratorType, [yieldType, returnType, nextType]);
    }
    iterationTypes(yieldType: qt.Type = neverType, returnType: qt.Type = neverType, nextType: qt.Type = unknownType): qt.IterationTypes {
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
    typeOfDeclaration(
      declarationIn: qt.AccessorDeclaration | qt.VariableLikeDeclaration | qt.PropertyAccessExpression,
      enclosingDeclaration: Node,
      flags: NodeBuilderFlags,
      tracker: qt.SymbolTracker,
      addUndefined?: boolean
    ) {
      const declaration = qf.get.parseTreeOf(declarationIn, isVariableLikeOrAccessor);
      if (!declaration) return new qc.Token(Syntax.AnyKeyword) as qt.KeywordTyping;
      const symbol = qf.get.symbolOfNode(declaration);
      let type = symbol && !(symbol.flags & (SymbolFlags.TypeLiteral | qt.SymbolFlags.Signature)) ? qf.get.widenedLiteralType(this.typeOfSymbol()) : errorType;
      if (type.flags & qt.TypeFlags.UniqueESSymbol && type.symbol === symbol) flags |= NodeBuilderFlags.AllowUniqueESSymbolType;
      if (addUndefined) type = qf.get.optionalType(type);
      return nodeBuilder.typeToTypeNode(type, enclosingDeclaration, flags | NodeBuilderFlags.MultilineObjectLiterals, tracker);
    }
    returnTypeOfSignatureDeclaration(signatureDeclarationIn: qt.SignatureDeclaration, enclosingDeclaration: Node, flags: NodeBuilderFlags, tracker: qt.SymbolTracker) {
      const signatureDeclaration = qf.get.parseTreeOf(signatureDeclarationIn, isFunctionLike);
      if (!signatureDeclaration) return new qc.Token(Syntax.AnyKeyword) as qt.KeywordTyping;
      const signature = qf.get.signatureFromDeclaration(signatureDeclaration);
      return nodeBuilder.typeToTypeNode(qf.get.returnTypeOfSignature(signature), enclosingDeclaration, flags | NodeBuilderFlags.MultilineObjectLiterals, tracker);
    }
    typeOfExpression(exprIn: qt.Expression, enclosingDeclaration: Node, flags: NodeBuilderFlags, tracker: qt.SymbolTracker) {
      const expr = qf.get.parseTreeOf(exprIn, isExpression);
      if (!expr) return new qc.Token(Syntax.AnyKeyword) as qt.KeywordTyping;
      const type = qf.get.widenedType(getRegularTypeOfExpression(expr));
      return nodeBuilder.typeToTypeNode(type, enclosingDeclaration, flags | NodeBuilderFlags.MultilineObjectLiterals, tracker);
    }
    literalConstValue(node: qt.VariableDeclaration | qt.PropertyDeclaration | qt.PropertySignature | qt.ParamDeclaration, tracker: qt.SymbolTracker) {
      const type = qf.get.symbolOfNode(node).typeOfSymbol();
      return literalTypeToNode(<qt.FreshableType>type, node, tracker);
    }
    resolver(): qt.EmitResolver {
      const resolvedTypeReferenceDirectives = host.getResolvedTypeReferenceDirectives();
      let fileToDirective: qu.QMap<string>;
      if (resolvedTypeReferenceDirectives) {
        fileToDirective = new qu.QMap<string>();
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
          node = qf.get.parseTreeOf(node);
          return node ? isValueAliasDeclaration(node) : true;
        },
        hasGlobalName,
        referencedAliasDeclaration: (node, checkChildren?) => {
          node = qf.get.parseTreeOf(node);
          return node ? referencedAliasDeclaration(node, checkChildren) : true;
        },
        getNodeCheckFlags: (node) => {
          node = qf.get.parseTreeOf(node);
          return node ? getNodeCheckFlags(node) : 0;
        },
        isTopLevelValueImportEqualsWithEntityName,
        isDeclarationVisible,
        isImplementationOfOverload,
        isRequiredInitializedParam,
        isOptionalUninitializedParamProperty,
        isExpandoFunctionDeclaration,
        getPropertiesOfContainerFunction,
        //this.typeOfDeclaration,
        //this.returnTypeOfSignatureDeclaration,
        //this.typeOfExpression,
        //this.literalConstValue,
        isEntityNameVisible,
        getConstantValue: (nodeIn) => {
          const node = qf.get.parseTreeOf(nodeIn, canHaveConstantValue);
          return node ? getConstantValue(node) : undefined;
        },
        collectLinkedAliases,
        getReferencedValueDeclaration,
        getTypeReferenceSerializationKind,
        isOptionalParam,
        moduleExportsSomeValue,
        isArgsLocalBinding,
        getExternalModuleFileFromDeclaration,
        getTypeReferenceDirectivesForEntityName,
        getTypeReferenceDirectivesForSymbol,
        isLiteralConstDeclaration,
        isLateBound: (nodeIn: qt.Declaration): nodeIn is qt.LateBoundDecl => {
          const node = qf.get.parseTreeOf(nodeIn, isDeclaration);
          const symbol = node && qf.get.symbolOfNode(node);
          return !!(symbol && this.checkFlags() & qt.CheckFlags.Late);
        },
        getJsxFactoryEntity,
        getAllAccessorDeclarations(accessor: qt.AccessorDeclaration): qt.AllAccessorDeclarations {
          accessor = qf.get.parseTreeOf(accessor, qf.is.getOrSetKind)!;
          const otherKind = accessor.kind === Syntax.SetAccessor ? Syntax.GetAccessor : Syntax.SetAccessor;
          const otherAccessor = qf.get.symbolOfNode(accessor).declarationOfKind<qt.AccessorDeclaration>(otherKind);
          const firstAccessor = otherAccessor && otherAccessor.pos < accessor.pos ? otherAccessor : accessor;
          const secondAccessor = otherAccessor && otherAccessor.pos < accessor.pos ? accessor : otherAccessor;
          const setAccessor = accessor.kind === Syntax.SetAccessor ? accessor : (otherAccessor as qt.SetAccessorDeclaration);
          const getAccessor = accessor.kind === Syntax.GetAccessor ? accessor : (otherAccessor as qt.GetAccessorDeclaration);
          return {
            firstAccessor,
            secondAccessor,
            setAccessor,
            getAccessor,
          };
        },
        getSymbolOfExternalModuleSpecifier: (moduleName) => qf.resolve.externalModuleNameWorker(moduleName, moduleName, undefined),
        isBindingCapturedByNode: (node, decl) => {
          const parseNode = qf.get.parseTreeOf(node);
          const parseDecl = qf.get.parseTreeOf(decl);
          return !!parseNode && !!parseDecl && (parseDecl.kind === Syntax.VariableDeclaration || parseDecl.kind === Syntax.BindingElem) && isBindingCapturedByNode(parseNode, parseDecl);
        },
        getDeclarationStmtsForSourceFile: (node, flags, tracker, bundled) => {
          const n = qf.get.parseTreeOf(node) as qt.SourceFile;
          assert(n && n.kind === Syntax.SourceFile, 'Non-sourcefile node passed into getDeclarationsForSourceFile');
          const sym = qf.get.symbolOfNode(node);
          if (!sym) return !node.locals ? [] : nodeBuilder.symbolTableToDeclarationStmts(node.locals, node, flags, tracker, bundled);
          return !sym.exports ? [] : nodeBuilder.symbolTableToDeclarationStmts(sym.exports, node, flags, tracker, bundled);
        },
        isImportRequiredByAugmentation,
      };
      function isImportRequiredByAugmentation(node: qt.ImportDeclaration) {
        const file = node.sourceFile;
        if (!file.symbol) return false;
        const importTarget = getExternalModuleFileFromDeclaration(node);
        if (!importTarget) return false;
        if (importTarget === file) return false;
        const exports = qf.get.exportsOfModule(file.symbol);
        for (const s of arrayFrom(exports.values())) {
          if (s.mergeId) {
            const merged = qf.get.mergedSymbol(s);
            for (const d of merged.declarations) {
              const declFile = d.sourceFile;
              if (declFile === importTarget) return true;
            }
          }
        }
        return false;
      }
      function isInHeritageClause(node: qt.PropertyAccessEntityNameExpression) {
        return node.parent && node.parent.kind === Syntax.ExpressionWithTypings && node.parent.parent && node.parent.parent.kind === Syntax.HeritageClause;
      }
      function getTypeReferenceDirectivesForEntityName(node: qt.EntityNameOrEntityNameExpression): string[] | undefined {
        if (!fileToDirective) return;
        let meaning = qt.SymbolFlags.Type | qt.SymbolFlags.Namespace;
        if ((node.kind === Syntax.Identifier && qf.is.inTypeQuery(node)) || (node.kind === Syntax.PropertyAccessExpression && !isInHeritageClause(node)))
          meaning = qt.SymbolFlags.Value | qt.SymbolFlags.ExportValue;
        const symbol = qf.resolve.entityName(node, meaning, true);
        return symbol && symbol !== unknownSymbol ? getTypeReferenceDirectivesForSymbol(symbol, meaning) : undefined;
      }
      function addReferencedFilesToTypeDirective(file: qt.SourceFile, key: string) {
        if (fileToDirective.has(file.path)) return;
        fileToDirective.set(file.path, key);
        for (const { fileName } of file.referencedFiles) {
          const resolvedFile = qf.resolve.tripleslashReference(fileName, file.originalFileName);
          const referencedFile = host.getSourceFile(resolvedFile);
          if (referencedFile) addReferencedFilesToTypeDirective(referencedFile, key);
        }
      }
    }
    makeUnaryTypeMapper(source: qt.Type, target: qt.Type): qt.TypeMapper {
      return { kind: qt.TypeMapKind.Simple, source, target };
    }
    makeArrayTypeMapper(sources: readonly qt.TypeParam[], targets: readonly qt.Type[] | undefined): qt.TypeMapper {
      return { kind: qt.TypeMapKind.Array, sources, targets };
    }
    makeFunctionTypeMapper(func: (t: qt.Type) => qt.Type): qt.TypeMapper {
      return { kind: qt.TypeMapKind.Function, func };
    }
    makeCompositeTypeMapper(kind: qt.TypeMapKind.Composite | qt.TypeMapKind.Merged, mapper1: qt.TypeMapper, mapper2: qt.TypeMapper): qt.TypeMapper {
      return { kind, mapper1, mapper2 };
    }
  }
  return (qf.create = new Fcreate());
}
export interface Fcreate extends ReturnType<typeof newCreate> {}
export function newInstantiate(f: qt.Frame) {
  const qf = f as Frame;
  return (qf.instantiate = new (class {
    list<T>(items: readonly T[], mapper: qt.TypeMapper, instantiator: (item: T, mapper: qt.TypeMapper) => T): readonly T[];
    list<T>(items: readonly T[] | undefined, mapper: qt.TypeMapper, instantiator: (item: T, mapper: qt.TypeMapper) => T): readonly T[] | undefined;
    list<T>(items: readonly T[] | undefined, mapper: qt.TypeMapper, instantiator: (item: T, mapper: qt.TypeMapper) => T): readonly T[] | undefined {
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
    types(types: readonly qt.Type[], mapper: qt.TypeMapper): readonly qt.Type[];
    types(types: readonly qt.Type[] | undefined, mapper: qt.TypeMapper): readonly qt.Type[] | undefined;
    types(types: readonly qt.Type[] | undefined, mapper: qt.TypeMapper): readonly qt.Type[] | undefined {
      return this.list<qt.Type>(types, mapper, this.type);
    }
    signatures(signatures: readonly qt.Signature[], mapper: qt.TypeMapper): readonly qt.Signature[] {
      return this.list<qt.Signature>(signatures, mapper, this.signature);
    }
    typePredicate(predicate: qt.TypePredicate, mapper: qt.TypeMapper): qt.TypePredicate {
      return qf.create.typePredicate(predicate.kind, predicate.paramName, predicate.paramIndex, this.type(predicate.type, mapper));
    }
    signature(signature: qt.Signature, mapper: qt.TypeMapper, eraseTypeParams?: boolean): qt.Signature {
      let freshTypeParams: qt.TypeParam[] | undefined;
      if (signature.typeParams && !eraseTypeParams) {
        freshTypeParams = map(signature.typeParams, cloneTypeParam);
        mapper = combineTypeMappers(qf.create.typeMapper(signature.typeParams, freshTypeParams), mapper);
        for (const tp of freshTypeParams) {
          tp.mapper = mapper;
        }
      }
      const result = qf.create.signature(
        signature.declaration,
        freshTypeParams,
        signature.thisParam && this.symbol(signature.thisParam, mapper),
        this.list(signature.params, mapper, this.symbol),
        undefined,
        undefined,
        signature.minArgCount,
        signature.flags & SignatureFlags.PropagatingFlags
      );
      result.target = signature;
      result.mapper = mapper;
      return result;
    }
    symbol(symbol: qt.Symbol, mapper: qt.TypeMapper): qt.Symbol {
      const links = symbol.links;
      if (links.type && !couldContainTypeVariables(links.type)) return symbol;
      if (this.checkFlags() & qt.CheckFlags.Instantiated) {
        symbol = links.target!;
        mapper = combineTypeMappers(links.mapper, mapper);
      }
      const result = new qc.Symbol(
        symbol.flags,
        symbol.escName,
        qt.CheckFlags.Instantiated | (this.checkFlags() & (CheckFlags.Readonly | qt.CheckFlags.Late | qt.CheckFlags.OptionalParam | qt.CheckFlags.RestParam))
      );
      result.declarations = symbol.declarations;
      result.parent = symbol.parent;
      result.target = symbol;
      result.mapper = mapper;
      if (symbol.valueDeclaration) result.valueDeclaration = symbol.valueDeclaration;
      if (links.nameType) result.nameType = links.nameType;
      return result;
    }
    mappedType(type: qt.MappedType, mapper: qt.TypeMapper): qt.Type {
      const typeVariable = qf.get.homomorphicTypeVariable(type);
      if (typeVariable) {
        const mappedTypeVariable = this.type(typeVariable, mapper);
        if (typeVariable !== mappedTypeVariable) {
          return mapType(getReducedType(mappedTypeVariable), (t) => {
            if (t.flags & (TypeFlags.AnyOrUnknown | qt.TypeFlags.InstantiableNonPrimitive | qt.TypeFlags.Object | qt.TypeFlags.Intersection) && t !== wildcardType && t !== errorType) {
              const replacementMapper = prependTypeMapping(typeVariable, t, mapper);
              return qf.is.arrayType(t)
                ? this.mappedArrayType(t, type, replacementMapper)
                : qf.is.tupleType(t)
                ? this.mappedTupleType(t, type, replacementMapper)
                : this.anonymousType(type, replacementMapper);
            }
            return t;
          });
        }
      }
      return this.anonymousType(type, mapper);
    }
    mappedArrayType(arrayType: qt.Type, mappedType: qt.MappedType, mapper: qt.TypeMapper) {
      const elemType = this.mappedTypeTemplate(mappedType, numberType, true, mapper);
      return elemType === errorType ? errorType : qf.create.arrayType(elemType, getModifiedReadonlyState(qf.is.readonlyArrayType(arrayType), getMappedTypeModifiers(mappedType)));
    }
    mappedTupleType(tupleType: qt.TupleTypeReference, mappedType: qt.MappedType, mapper: qt.TypeMapper) {
      const minLength = tupleType.target.minLength;
      const elemTypes = map(getTypeArgs(tupleType), (_, i) => this.mappedTypeTemplate(mappedType, qf.get.literalType('' + i), i >= minLength, mapper));
      const modifiers = getMappedTypeModifiers(mappedType);
      const newMinLength =
        modifiers & MappedTypeModifiers.IncludeOptional ? 0 : modifiers & MappedTypeModifiers.ExcludeOptional ? getTypeReferenceArity(tupleType) - (tupleType.target.hasRestElem ? 1 : 0) : minLength;
      const newReadonly = getModifiedReadonlyState(tupleType.target.readonly, modifiers);
      return contains(elemTypes, errorType) ? errorType : qf.create.tupleType(elemTypes, newMinLength, tupleType.target.hasRestElem, newReadonly, tupleType.target.labeledElemDeclarations);
    }
    mappedTypeTemplate(type: qt.MappedType, key: qt.Type, isOptional: boolean, mapper: qt.TypeMapper) {
      const templateMapper = appendTypeMapping(mapper, getTypeParamFromMappedType(type), key);
      const propType = this.type(getTemplateTypeFromMappedType(<qt.MappedType>type.target || type), templateMapper);
      const modifiers = getMappedTypeModifiers(type);
      return strictNullChecks && modifiers & MappedTypeModifiers.IncludeOptional && !maybeTypeOfKind(propType, qt.TypeFlags.Undefined | qt.TypeFlags.Void)
        ? qf.get.optionalType(propType)
        : strictNullChecks && modifiers & MappedTypeModifiers.ExcludeOptional && isOptional
        ? getTypeWithFacts(propType, TypeFacts.NEUndefined)
        : propType;
    }
    anonymousType(type: qt.AnonymousType, mapper: qt.TypeMapper): qt.AnonymousType {
      const result = <qt.AnonymousType>qf.create.objectType(type.objectFlags | ObjectFlags.Instantiated, type.symbol);
      if (type.objectFlags & ObjectFlags.Mapped) {
        (<qt.MappedType>result).declaration = (<qt.MappedType>type).declaration;
        const origTypeParam = getTypeParamFromMappedType(<qt.MappedType>type);
        const freshTypeParam = cloneTypeParam(origTypeParam);
        (<qt.MappedType>result).typeParam = freshTypeParam;
        mapper = combineTypeMappers(makeUnaryTypeMapper(origTypeParam, freshTypeParam), mapper);
        freshTypeParam.mapper = mapper;
      }
      result.target = type;
      result.mapper = mapper;
      result.aliasSymbol = type.aliasSymbol;
      result.aliasTypeArgs = this.types(type.aliasTypeArgs, mapper);
      return result;
    }
    conditionalType(root: qt.ConditionalRoot, mapper: qt.TypeMapper): qt.Type {
      if (root.isDistributive) {
        const checkType = <qt.TypeParam>root.checkType;
        const instantiatedType = getMappedType(checkType, mapper);
        if (checkType !== instantiatedType && instantiatedType.flags & (TypeFlags.Union | qt.TypeFlags.Never))
          return mapType(instantiatedType, (t) => getConditionalType(root, prependTypeMapping(checkType, t, mapper)));
      }
      return getConditionalType(root, mapper);
    }
    type(type: qt.Type, mapper: qt.TypeMapper | undefined): qt.Type;
    type(type: qt.Type | undefined, mapper: qt.TypeMapper | undefined): qt.Type | undefined;
    type(type: qt.Type | undefined, mapper: qt.TypeMapper | undefined): qt.Type | undefined {
      if (!(type && mapper && couldContainTypeVariables(type))) return type;
      if (instantiationDepth === 50 || instantiationCount >= 5000000) {
        error(currentNode, qd.msgs.Type_instantiation_is_excessively_deep_and_possibly_infinite);
        return errorType;
      }
      totalInstantiationCount++;
      instantiationCount++;
      instantiationDepth++;
      const result = this.typeWorker(type, mapper);
      instantiationDepth--;
      return result;
    }
    typeWithoutDepthIncrease(type: qt.Type, mapper: qt.TypeMapper | undefined) {
      instantiationDepth--;
      const result = this.type(type, mapper);
      instantiationDepth++;
      return result;
    }
    typeWorker(type: qt.Type, mapper: qt.TypeMapper): qt.Type {
      const flags = type.flags;
      if (flags & qt.TypeFlags.TypeParam) return getMappedType(type, mapper);
      if (flags & qt.TypeFlags.Object) {
        const objectFlags = (<qt.ObjectType>type).objectFlags;
        if (objectFlags & (ObjectFlags.Reference | ObjectFlags.Anonymous | ObjectFlags.Mapped)) {
          if (objectFlags & ObjectFlags.Reference && !(<qt.TypeReference>type).node) {
            const resolvedTypeArgs = (<qt.TypeReference>type).resolvedTypeArgs;
            const newTypeArgs = this.types(resolvedTypeArgs, mapper);
            return newTypeArgs !== resolvedTypeArgs ? qf.create.typeReference((<qt.TypeReference>type).target, newTypeArgs) : type;
          }
          return getObjectTypeInstantiation(<qt.TypeReference | qt.AnonymousType | qt.MappedType>type, mapper);
        }
        return type;
      }
      if (flags & qt.TypeFlags.UnionOrIntersection) {
        const types = (<qt.UnionOrIntersectionType>type).types;
        const newTypes = this.types(types, mapper);
        return newTypes === types
          ? type
          : flags & qt.TypeFlags.Intersection
          ? qf.get.intersectionType(newTypes, type.aliasSymbol, this.types(type.aliasTypeArgs, mapper))
          : qf.get.unionType(newTypes, qt.UnionReduction.Literal, type.aliasSymbol, this.types(type.aliasTypeArgs, mapper));
      }
      if (flags & qt.TypeFlags.Index) return qf.get.indexType(this.type((<qt.IndexType>type).type, mapper));
      if (flags & qt.TypeFlags.IndexedAccess) return qf.get.indexedAccessType(this.type((<qt.IndexedAccessType>type).objectType, mapper), this.type((<qt.IndexedAccessType>type).indexType, mapper));
      if (flags & qt.TypeFlags.Conditional) return getConditionalTypeInstantiation(<qt.ConditionalType>type, combineTypeMappers((<qt.ConditionalType>type).mapper, mapper));
      if (flags & qt.TypeFlags.Substitution) {
        const maybeVariable = this.type((<qt.SubstitutionType>type).baseType, mapper);
        if (maybeVariable.flags & qt.TypeFlags.TypeVariable) return getSubstitutionType(maybeVariable as qt.TypeVariable, this.type((<qt.SubstitutionType>type).substitute, mapper));
        else {
          const sub = this.type((<qt.SubstitutionType>type).substitute, mapper);
          if (sub.flags & qt.TypeFlags.AnyOrUnknown || qf.is.typeAssignableTo(getRestrictiveInstantiation(maybeVariable), getRestrictiveInstantiation(sub))) return maybeVariable;
          return sub;
        }
      }
      return type;
    }
    indexInfo(info: qt.IndexInfo | undefined, mapper: qt.TypeMapper): qt.IndexInfo | undefined {
      return info && qf.create.indexInfo(this.type(info.type, mapper), info.isReadonly, info.declaration);
    }
    contextualType(contextualType: qt.Type | undefined, node: Node, contextFlags?: ContextFlags): qt.Type | undefined {
      if (contextualType && maybeTypeOfKind(contextualType, qt.TypeFlags.Instantiable)) {
        const inferenceContext = getInferenceContext(node);
        if (inferenceContext && some(inferenceContext.inferences, hasInferenceCandidates)) {
          if (contextFlags && contextFlags & ContextFlags.Signature) return this.instantiableTypes(contextualType, inferenceContext.nonFixingMapper);
          if (inferenceContext.returnMapper) return this.instantiableTypes(contextualType, inferenceContext.returnMapper);
        }
      }
      return contextualType;
    }
    instantiableTypes(type: qt.Type, mapper: qt.TypeMapper): qt.Type {
      if (type.flags & qt.TypeFlags.Instantiable) return this.type(type, mapper);
      if (type.flags & qt.TypeFlags.Union) {
        return qf.get.unionType(
          map((<qt.UnionType>type).types, (t) => this.instantiableTypes(t, mapper)),
          qt.UnionReduction.None
        );
      }
      if (type.flags & qt.TypeFlags.Intersection) return qf.get.intersectionType(map((<qt.IntersectionType>type).types, (t) => this.instantiableTypes(t, mapper)));
      return type;
    }
    signatureInContextOf(signature: qt.Signature, contextualSignature: qt.Signature, inferenceContext?: qt.InferenceContext, compareTypes?: qt.TypeComparer): qt.Signature {
      const context = qf.create.inferenceContext(signature.typeParams!, signature, InferenceFlags.None, compareTypes);
      const restType = getEffectiveRestType(contextualSignature);
      const mapper = inferenceContext && (restType && restType.flags & qt.TypeFlags.TypeParam ? inferenceContext.nonFixingMapper : inferenceContext.mapper);
      const sourceSignature = mapper ? this.signature(contextualSignature, mapper) : contextualSignature;
      applyToParamTypes(sourceSignature, signature, (source, target) => {
        inferTypes(context.inferences, source, target);
      });
      if (!inferenceContext) {
        applyToReturnTypes(contextualSignature, signature, (source, target) => {
          inferTypes(context.inferences, source, target, qt.InferencePriority.ReturnType);
        });
      }
      return getSignatureInstantiation(signature, getInferredTypes(context), qf.is.inJSFile(contextualSignature.declaration));
    }
    typeWithSingleGenericCallSignature(node: qt.Expression | qt.MethodDeclaration | qt.QualifiedName, type: qt.Type, checkMode?: CheckMode) {
      if (checkMode && checkMode & (CheckMode.Inferential | CheckMode.SkipGenericFunctions)) {
        const callSignature = getSingleSignature(type, SignatureKind.Call, true);
        const constructSignature = getSingleSignature(type, SignatureKind.Construct, true);
        const signature = callSignature || constructSignature;
        if (signature && signature.typeParams) {
          const contextualType = getApparentTypeOfContextualType(<qt.Expression>node, ContextFlags.NoConstraints);
          if (contextualType) {
            const contextualSignature = getSingleSignature(getNonNullableType(contextualType), callSignature ? SignatureKind.Call : SignatureKind.Construct, false);
            if (contextualSignature && !contextualSignature.typeParams) {
              if (checkMode & CheckMode.SkipGenericFunctions) {
                skippedGenericFunction(node, checkMode);
                return anyFunctionType;
              }
              const context = getInferenceContext(node)!;
              const returnType = context.signature && qf.get.returnTypeOfSignature(context.signature);
              const returnSignature = returnType && getSingleCallOrConstructSignature(returnType);
              if (returnSignature && !returnSignature.typeParams && !every(context.inferences, hasInferenceCandidates)) {
                const uniqueTypeParams = getUniqueTypeParams(context, signature.typeParams);
                const instantiatedSignature = getSignatureInstantiationWithoutFillingInTypeArgs(signature, uniqueTypeParams);
                const inferences = map(context.inferences, (info) => qf.create.inferenceInfo(info.typeParam));
                applyToParamTypes(instantiatedSignature, contextualSignature, (source, target) => {
                  inferTypes(inferences, source, target, true);
                });
                if (some(inferences, hasInferenceCandidates)) {
                  applyToReturnTypes(instantiatedSignature, contextualSignature, (source, target) => {
                    inferTypes(inferences, source, target);
                  });
                  if (!hasOverlappingInferences(context.inferences, inferences)) {
                    mergeInferences(context.inferences, inferences);
                    context.inferredTypeParams = concatenate(context.inferredTypeParams, uniqueTypeParams);
                    return getOrCreateTypeFromSignature(instantiatedSignature);
                  }
                }
              }
              return getOrCreateTypeFromSignature(this.signatureInContextOf(signature, contextualSignature, context));
            }
          }
        }
      }
      return type;
    }
  })());
}
export interface Finstantiate extends ReturnType<typeof newInstantiate> {}
export function newResolve(f: qt.Frame) {
  const qf = f as Frame;
  return (qf.resolve = new (class {
    name(
      location: Node | undefined,
      name: qu.__String,
      meaning: qt.SymbolFlags,
      nameNotFoundMessage: qd.Message | undefined,
      nameArg: qu.__String | qc.Identifier | undefined,
      isUse: boolean,
      excludeGlobals = false,
      suggestedNameNotFoundMessage?: qd.Message
    ): qt.Symbol | undefined {
      return this.nameHelper(location, name, meaning, nameNotFoundMessage, nameArg, isUse, excludeGlobals, getSymbol, suggestedNameNotFoundMessage);
    }
    nameHelper(
      location: Node | undefined,
      name: qu.__String,
      meaning: qt.SymbolFlags,
      nameNotFoundMessage: qd.Message | undefined,
      nameArg: qu.__String | qc.Identifier | undefined,
      isUse: boolean,
      excludeGlobals: boolean,
      lookup: typeof getSymbol,
      suggestedNameNotFoundMessage?: qd.Message
    ): qt.Symbol | undefined {
      const originalLocation = location;
      let result: qt.Symbol | undefined;
      let lastLocation: Node | undefined;
      let lastSelfReferenceLocation: Node | undefined;
      let propertyWithInvalidIniter: Node | undefined;
      let associatedDeclarationForContainingIniterOrBindingName: qt.ParamDeclaration | qt.BindingElem | undefined;
      let withinDeferredContext = false;
      const errorLocation = location;
      let grandparent: Node;
      let isInExternalModule = false;
      loop: while (location) {
        if (location.locals && !qf.is.globalSourceFile(location)) {
          if ((result = lookup(location.locals, name, meaning))) {
            let useResult = true;
            if (qf.is.functionLike(location) && lastLocation && lastLocation !== (<qt.FunctionLikeDeclaration>location).body) {
              if (meaning & result.flags & qt.SymbolFlags.Type && lastLocation.kind !== Syntax.DocComment) {
                useResult =
                  result.flags & qt.SymbolFlags.TypeParam
                    ? lastLocation === (<qt.FunctionLikeDeclaration>location).type || lastLocation.kind === Syntax.Param || lastLocation.kind === Syntax.TypeParam
                    : false;
              }
              if (meaning & result.flags & qt.SymbolFlags.Variable) {
                if (useOuterVariableScopeInParam(result, location, lastLocation)) useResult = false;
                else if (result.flags & qt.SymbolFlags.FunctionScopedVariable) {
                  useResult = lastLocation.kind === Syntax.Param || (lastLocation === (<qt.FunctionLikeDeclaration>location).type && !!qc.findAncestor(result.valueDeclaration, isParam));
                }
              }
            } else if (location.kind === Syntax.ConditionalTyping) {
              useResult = lastLocation === (<qt.ConditionalTyping>location).trueType;
            }
            if (useResult) break loop;
            else {
              result = undefined;
            }
          }
        }
        withinDeferredContext = withinDeferredContext || qf.is.deferredContext(location, lastLocation);
        switch (location.kind) {
          case Syntax.SourceFile:
            if (!qf.is.externalOrCommonJsModule(<qt.SourceFile>location)) break;
            isInExternalModule = true;
          case Syntax.ModuleDeclaration:
            const moduleExports = qf.get.symbolOfNode(location as qt.SourceFile | qt.ModuleDeclaration).exports || emptySymbols;
            if (location.kind === Syntax.SourceFile || (location.kind === Syntax.ModuleDeclaration && location.flags & NodeFlags.Ambient && !qf.is.globalScopeAugmentation(location))) {
              if ((result = moduleExports.get(InternalSymbol.Default))) {
                const localSymbol = result.localForExportDefault();
                if (localSymbol && result.flags & meaning && localSymbol.escName === name) break loop;
                result = undefined;
              }
              const moduleExport = moduleExports.get(name);
              if (moduleExport && moduleExport.flags === qt.SymbolFlags.Alias && (moduleExport.declarationOfKind(Syntax.ExportSpecifier) || moduleExport.declarationOfKind(Syntax.NamespaceExport))) {
                break;
              }
            }
            if (name !== qt.InternalSymbol.Default && (result = lookup(moduleExports, name, meaning & qt.SymbolFlags.ModuleMember))) {
              if (location.kind === Syntax.SourceFile && location.commonJsModuleIndicator && !result.declarations.some(isDocTypeAlias)) result = undefined;
              else {
                break loop;
              }
            }
            break;
          case Syntax.EnumDeclaration:
            if ((result = lookup(qf.get.symbolOfNode(location)!.exports!, name, meaning & qt.SymbolFlags.EnumMember))) break loop;
            break;
          case Syntax.PropertyDeclaration:
            if (!qf.has.syntacticModifier(location, ModifierFlags.Static)) {
              const ctor = findConstructorDeclaration(location.parent as qt.ClassLikeDeclaration);
              if (ctor && ctor.locals) {
                if (lookup(ctor.locals, name, meaning & qt.SymbolFlags.Value)) propertyWithInvalidIniter = location;
              }
            }
            break;
          case Syntax.ClassDeclaration:
          case Syntax.ClassExpression:
          case Syntax.InterfaceDeclaration:
            if ((result = lookup(qf.get.symbolOfNode(location as qt.ClassLikeDeclaration | qt.InterfaceDeclaration).members || emptySymbols, name, meaning & qt.SymbolFlags.Type))) {
              if (!isTypeParamSymbolDeclaredInContainer(result, location)) {
                result = undefined;
                break;
              }
              if (lastLocation && qf.has.syntacticModifier(lastLocation, ModifierFlags.Static)) {
                error(errorLocation, qd.msgs.Static_members_cannot_reference_class_type_params);
                return;
              }
              break loop;
            }
            if (location.kind === Syntax.ClassExpression && meaning & qt.SymbolFlags.Class) {
              const className = (<qt.ClassExpression>location).name;
              if (className && name === className.escapedText) {
                result = location.symbol;
                break loop;
              }
            }
            break;
          case Syntax.ExpressionWithTypings:
            if (lastLocation === (<qt.ExpressionWithTypings>location).expression && (<qt.HeritageClause>location.parent).token === Syntax.ExtendsKeyword) {
              const container = location.parent.parent;
              if (qf.is.classLike(container) && (result = lookup(qf.get.symbolOfNode(container).members!, name, meaning & qt.SymbolFlags.Type))) {
                if (nameNotFoundMessage) error(errorLocation, qd.msgs.Base_class_expressions_cannot_reference_class_type_params);
                return;
              }
            }
            break;
          case Syntax.ComputedPropertyName:
            grandparent = location.parent.parent;
            if (qf.is.classLike(grandparent) || grandparent.kind === Syntax.InterfaceDeclaration) {
              if ((result = lookup(qf.get.symbolOfNode(grandparent as qt.ClassLikeDeclaration | qt.InterfaceDeclaration).members!, name, meaning & qt.SymbolFlags.Type))) {
                error(errorLocation, qd.msgs.A_computed_property_name_cannot_reference_a_type_param_from_its_containing_type);
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
            if (meaning & qt.SymbolFlags.Variable && name === 'args') {
              result = argsSymbol;
              break loop;
            }
            break;
          case Syntax.FunctionExpression:
            if (meaning & qt.SymbolFlags.Variable && name === 'args') {
              result = argsSymbol;
              break loop;
            }
            if (meaning & qt.SymbolFlags.Function) {
              const functionName = (<qt.FunctionExpression>location).name;
              if (functionName && name === functionName.escapedText) {
                result = location.symbol;
                break loop;
              }
            }
            break;
          case Syntax.Decorator:
            if (location.parent && location.parent.kind === Syntax.Param) location = location.parent;
            if (location.parent && (qf.is.classElem(location.parent) || location.parent.kind === Syntax.ClassDeclaration)) location = location.parent;
            break;
          case Syntax.DocTypedefTag:
          case Syntax.DocCallbackTag:
          case Syntax.DocEnumTag:
            location = qf.get.doc.host(location);
            break;
          case Syntax.Param:
            if (
              lastLocation &&
              (lastLocation === (location as qt.ParamDeclaration).initer || (lastLocation === (location as qt.ParamDeclaration).name && lastLocation.kind === Syntax.BindingPattern))
            ) {
              if (!associatedDeclarationForContainingIniterOrBindingName) associatedDeclarationForContainingIniterOrBindingName = location as qt.ParamDeclaration;
            }
            break;
          case Syntax.BindingElem:
            if (lastLocation && (lastLocation === (location as qt.BindingElem).initer || (lastLocation === (location as qt.BindingElem).name && lastLocation.kind === Syntax.BindingPattern))) {
              const root = qf.get.rootDeclaration(location);
              if (root.kind === Syntax.Param) {
                if (!associatedDeclarationForContainingIniterOrBindingName) associatedDeclarationForContainingIniterOrBindingName = location as qt.BindingElem;
              }
            }
            break;
        }
        if (qf.is.selfReferenceLocation(location)) lastSelfReferenceLocation = location;
        lastLocation = location;
        location = location.parent;
      }
      if (isUse && result && (!lastSelfReferenceLocation || result !== lastSelfReferenceLocation.symbol)) result.referenced! |= meaning;
      if (!result) {
        if (lastLocation) {
          assert(lastLocation.kind === Syntax.SourceFile);
          if ((lastLocation as qt.SourceFile).commonJsModuleIndicator && name === 'exports' && meaning & lastLocation.symbol.flags) return lastLocation.symbol;
        }
        if (!excludeGlobals) result = lookup(globals, name, meaning);
      }
      if (!result) {
        if (originalLocation && qf.is.inJSFile(originalLocation) && originalLocation.parent) {
          if (qf.is.requireCall(originalLocation.parent, false)) return requireSymbol;
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
            let suggestion: qt.Symbol | undefined;
            if (suggestedNameNotFoundMessage && suggestionCount < maximumSuggestionCount) {
              suggestion = getSuggestedSymbolForNonexistentSymbol(originalLocation, name, meaning);
              if (suggestion) {
                const suggestionName = suggestion.symbolToString();
                const diagnostic = error(errorLocation, suggestedNameNotFoundMessage, diagnosticName(nameArg!), suggestionName);
                if (suggestion.valueDeclaration) addRelatedInfo(diagnostic, qf.create.diagForNode(suggestion.valueDeclaration, qd.msgs._0_is_declared_here, suggestionName));
              }
            }
            if (!suggestion) error(errorLocation, nameNotFoundMessage, diagnosticName(nameArg!));
            suggestionCount++;
          }
        }
        return;
      }
      if (nameNotFoundMessage) {
        if (propertyWithInvalidIniter && !(compilerOpts.target === qt.ScriptTarget.ESNext && compilerOpts.useDefineForClassFields)) {
          const propertyName = (<qt.PropertyDeclaration>propertyWithInvalidIniter).name;
          error(errorLocation, qd.msgs.Initer_of_instance_member_variable_0_cannot_reference_identifier_1_declared_in_the_constructor, declarationNameToString(propertyName), diagnosticName(nameArg!));
          return;
        }
        if (
          errorLocation &&
          (meaning & qt.SymbolFlags.BlockScopedVariable || ((meaning & qt.SymbolFlags.Class || meaning & qt.SymbolFlags.Enum) && (meaning & qt.SymbolFlags.Value) === qt.SymbolFlags.Value))
        ) {
          const exportOrLocalSymbol = getExportSymbolOfValueSymbolIfExported(result);
          if (exportOrLocalSymbol.flags & qt.SymbolFlags.BlockScopedVariable || exportOrLocalSymbol.flags & qt.SymbolFlags.Class || exportOrLocalSymbol.flags & qt.SymbolFlags.Enum)
            check.resolvedBlockScopedVariable(exportOrLocalSymbol, errorLocation);
        }
        if (result && isInExternalModule && (meaning & qt.SymbolFlags.Value) === qt.SymbolFlags.Value && !(originalLocation!.flags & NodeFlags.Doc)) {
          const merged = qf.get.mergedSymbol(result);
          if (length(merged.declarations) && every(merged.declarations, (d) => d.kind === Syntax.NamespaceExportDeclaration || (d.kind === Syntax.SourceFile && !!d.symbol.globalExports))) {
            errorOrSuggestion(
              !compilerOpts.allowUmdGlobalAccess,
              errorLocation!,
              qd.msgs._0_refers_to_a_UMD_global_but_the_current_file_is_a_module_Consider_adding_an_import_instead,
              qy.get.unescUnderscores(name)
            );
          }
        }
        if (result && associatedDeclarationForContainingIniterOrBindingName && !withinDeferredContext && (meaning & qt.SymbolFlags.Value) === qt.SymbolFlags.Value) {
          const candidate = qf.get.mergedSymbol(qf.get.lateBoundSymbol(result));
          const root = qf.get.rootDeclaration(associatedDeclarationForContainingIniterOrBindingName) as qt.ParamDeclaration;
          if (candidate === qf.get.symbolOfNode(associatedDeclarationForContainingIniterOrBindingName))
            error(errorLocation, qd.msgs.Param_0_cannot_reference_itself, declarationNameToString(associatedDeclarationForContainingIniterOrBindingName.name));
          else if (
            candidate.valueDeclaration &&
            candidate.valueDeclaration.pos > associatedDeclarationForContainingIniterOrBindingName.pos &&
            root.parent.locals &&
            lookup(root.parent.locals, candidate.escName, meaning) === candidate
          ) {
            error(
              errorLocation,
              qd.msgs.Param_0_cannot_reference_identifier_1_declared_after_it,
              declarationNameToString(associatedDeclarationForContainingIniterOrBindingName.name),
              declarationNameToString(<qt.Identifier>errorLocation)
            );
          }
        }
        if (result && errorLocation && meaning & qt.SymbolFlags.Value && result.flags & qt.SymbolFlags.Alias) check.symbolUsageInExpressionContext(result, name, errorLocation);
      }
      return result;
    }
    exportByName(moduleSymbol: qt.Symbol, name: qu.__String, sourceNode: qt.TypeOnlyCompatibleAliasDeclaration | undefined, dontResolveAlias: boolean) {
      const exportValue = moduleSymbol.exports!.get(InternalSymbol.ExportEquals);
      if (exportValue) return qf.get.propertyOfType(exportValue.typeOfSymbol(), name);
      const exportSymbol = moduleSymbol.exports!.get(name);
      const resolved = exportSymbol.resolve.symbol(dontResolveAlias);
      markSymbolOfAliasDeclarationIfTypeOnly(sourceNode, exportSymbol, resolved, false);
      return resolved;
    }
    entityName(name: qt.EntityNameOrEntityNameExpression, meaning: qt.SymbolFlags, ignoreErrors?: boolean, dontResolveAlias?: boolean, location?: Node): qt.Symbol | undefined {
      if (qf.is.missing(name)) return;
      const namespaceMeaning = qt.SymbolFlags.Namespace | (qf.is.inJSFile(name) ? meaning & qt.SymbolFlags.Value : 0);
      let symbol: qt.Symbol | undefined;
      if (name.kind === Syntax.Identifier) {
        const message = meaning === namespaceMeaning || isSynthesized(name) ? qd.msgs.Cannot_find_namespace_0 : getCannotFindNameDiagnosticForName(qf.get.firstIdentifier(name));
        const symbolFromJSPrototype = qf.is.inJSFile(name) && !isSynthesized(name) ? this.entityNameFromAssignmentDeclaration(name, meaning) : undefined;
        symbol = qf.get.mergedSymbol(this.name(location || name, name.escapedText, meaning, ignoreErrors || symbolFromJSPrototype ? undefined : message, name, true));
        if (!symbol) return qf.get.mergedSymbol(symbolFromJSPrototype);
      } else if (name.kind === Syntax.QualifiedName || name.kind === Syntax.PropertyAccessExpression) {
        const left = name.kind === Syntax.QualifiedName ? name.left : name.expression;
        const right = name.kind === Syntax.QualifiedName ? name.right : name.name;
        let namespace = this.entityName(left, namespaceMeaning, ignoreErrors, false, location);
        if (!namespace || qf.is.missing(right)) return;
        else if (namespace === unknownSymbol) return namespace;
        if (qf.is.inJSFile(name)) {
          if (
            namespace.valueDeclaration &&
            namespace.valueDeclaration.kind === Syntax.VariableDeclaration &&
            namespace.valueDeclaration.initer &&
            isCommonJsRequire(namespace.valueDeclaration.initer)
          ) {
            const moduleName = (namespace.valueDeclaration.initer as qt.CallExpression).args[0] as qt.StringLiteral;
            const moduleSym = this.externalModuleName(moduleName, moduleName);
            if (moduleSym) {
              const resolvedModuleSymbol = this.externalModuleSymbol(moduleSym);
              if (resolvedModuleSymbol) namespace = resolvedModuleSymbol;
            }
          }
        }
        symbol = qf.get.mergedSymbol(namespace.getExportsOfSymbol().fetch(right.escapedText, meaning));
        if (!symbol) {
          if (!ignoreErrors) error(right, qd.msgs.Namespace_0_has_no_exported_member_1, qf.get.fullyQualifiedName(namespace), declarationNameToString(right));
          return;
        }
      } else throw qc.assert.never(name, 'Unknown entity name kind.');
      assert((this.checkFlags() & qt.CheckFlags.Instantiated) === 0, 'Should never get an instantiated symbol here.');
      if (!isSynthesized(name) && qf.is.entityName(name) && (symbol.flags & qt.SymbolFlags.Alias || name.parent.kind === Syntax.ExportAssignment))
        markSymbolOfAliasDeclarationIfTypeOnly(qf.get.aliasDeclarationFromName(name), symbol, undefined, true);
      return symbol.flags & meaning || dontResolveAlias ? symbol : symbol.resolve.alias();
    }
    entityNameFromAssignmentDeclaration(name: qt.Identifier, meaning: qt.SymbolFlags) {
      if (isDocTypeReference(name.parent)) {
        const secondaryLocation = getAssignmentDeclarationLocation(name.parent);
        if (secondaryLocation) return this.name(secondaryLocation, name.escapedText, meaning, undefined, name, true);
      }
    }
    externalModuleName(location: Node, moduleReferenceExpression: qt.Expression, ignoreErrors?: boolean): qt.Symbol | undefined {
      return this.externalModuleNameWorker(location, moduleReferenceExpression, ignoreErrors ? undefined : qd.msgs.Cannot_find_module_0_or_its_corresponding_type_declarations);
    }
    externalModuleNameWorker(location: Node, moduleReferenceExpression: qt.Expression, moduleNotFoundError: qd.Message | undefined, isForAugmentation = false): qt.Symbol | undefined {
      return qf.is.stringLiteralLike(moduleReferenceExpression)
        ? this.externalModule(location, moduleReferenceExpression.text, moduleNotFoundError, moduleReferenceExpression, isForAugmentation)
        : undefined;
    }
    externalModule(location: Node, moduleReference: string, moduleNotFoundError: qd.Message | undefined, errorNode: Node, isForAugmentation = false): qt.Symbol | undefined {
      if (startsWith(moduleReference, '@types/')) {
        const diag = qd.msgs.Cannot_import_type_declaration_files_Consider_importing_0_instead_of_1;
        const withoutAtTypePrefix = removePrefix(moduleReference, '@types/');
        error(errorNode, diag, withoutAtTypePrefix, moduleReference);
      }
      const ambientModule = tryFindAmbientModule(moduleReference, true);
      if (ambientModule) return ambientModule;
      const currentSourceFile = location.sourceFile;
      const resolvedModule = currentSourceFile.resolvedModule(moduleReference)!;
      const resolutionDiagnostic = resolvedModule && getResolutionDiagnostic(compilerOpts, resolvedModule);
      const sourceFile = resolvedModule && !resolutionDiagnostic && host.getSourceFile(resolvedModule.resolvedFileName);
      if (sourceFile) {
        if (sourceFile.symbol) {
          if (resolvedModule.isExternalLibraryImport && !resolutionExtensionIsTSOrJson(resolvedModule.extension)) errorOnImplicitAnyModule(false, errorNode, resolvedModule, moduleReference);
          return qf.get.mergedSymbol(sourceFile.symbol);
        }
        if (moduleNotFoundError) error(errorNode, qd.msgs.File_0_is_not_a_module, sourceFile.fileName);
        return;
      }
      if (patternAmbientModules) {
        const pattern = findBestPatternMatch(patternAmbientModules, (_) => _.pattern, moduleReference);
        if (pattern) {
          const augmentation = patternAmbientModuleAugmentations && patternAmbientModuleAugmentations.get(moduleReference);
          if (augmentation) return qf.get.mergedSymbol(augmentation);
          return qf.get.mergedSymbol(pattern.symbol);
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
            !compilerOpts.resolve.jsonModule &&
            fileExtensionIs(moduleReference, qt.Extension.Json) &&
            getEmitModuleResolutionKind(compilerOpts) === qt.ModuleResolutionKind.NodeJs &&
            hasJsonModuleEmitEnabled(compilerOpts)
          ) {
            error(errorNode, qd.msgs.Cannot_find_module_0_Consider_using_resolveJsonModule_to_import_module_with_json_extension, moduleReference);
          } else {
            error(errorNode, moduleNotFoundError, moduleReference);
          }
        }
      }
      return;
    }
    externalModuleSymbol(moduleSymbol: qt.Symbol, dontResolveAlias?: boolean): qt.Symbol;
    externalModuleSymbol(moduleSymbol: qt.Symbol | undefined, dontResolveAlias?: boolean): qt.Symbol | undefined;
    externalModuleSymbol(moduleSymbol: qt.Symbol, dontResolveAlias?: boolean): qt.Symbol {
      if (moduleSymbol?.exports) {
        const exportEquals = moduleSymbol.exports.get(InternalSymbol.ExportEquals)?.resolve.symbol(dontResolveAlias);
        const exported = getCommonJsExportEquals(qf.get.mergedSymbol(exportEquals), qf.get.mergedSymbol(moduleSymbol));
        return qf.get.mergedSymbol(exported) || moduleSymbol;
      }
      return undefined!;
    }
    eSModuleSymbol(moduleSymbol: qt.Symbol | undefined, referencingLocation: Node, dontResolveAlias: boolean, suppressInteropError: boolean): qt.Symbol | undefined {
      const symbol = this.externalModuleSymbol(moduleSymbol, dontResolveAlias);
      if (!dontResolveAlias && symbol) {
        if (!suppressInteropError && !(symbol.flags & (SymbolFlags.Module | qt.SymbolFlags.Variable)) && !symbol.declarationOfKind(Syntax.SourceFile)) {
          const compilerOptionName = moduleKind >= qt.ModuleKind.ES2015 ? 'allowSyntheticDefaultImports' : 'esModuleInterop';
          error(referencingLocation, qd.msgs.This_module_can_only_be_referenced_with_ECMAScript_imports_Slashexports_by_turning_on_the_0_flag_and_referencing_its_default_export, compilerOptionName);
          return symbol;
        }
        if (compilerOpts.esModuleInterop) {
          const referenceParent = referencingLocation.parent;
          if ((referenceParent.kind === Syntax.ImportDeclaration && qf.get.namespaceDeclarationNode(referenceParent)) || qf.is.importCall(referenceParent)) {
            const type = this.typeOfSymbol();
            let sigs = getSignaturesOfStructuredType(type, SignatureKind.Call);
            if (!sigs || !sigs.length) sigs = getSignaturesOfStructuredType(type, SignatureKind.Construct);
            if (sigs && sigs.length) {
              const moduleType = getTypeWithSyntheticDefaultImportType(type, symbol, moduleSymbol!);
              const result = new qc.Symbol(symbol.flags, symbol.escName);
              result.declarations = symbol.declarations ? symbol.declarations.slice() : [];
              result.parent = symbol.parent;
              result.target = symbol;
              result.originatingImport = referenceParent;
              if (symbol.valueDeclaration) result.valueDeclaration = symbol.valueDeclaration;
              if (symbol.constEnumOnlyModule) result.constEnumOnlyModule = true;
              if (symbol.members) result.members = cloneMap(symbol.members);
              if (symbol.exports) result.exports = cloneMap(symbol.exports);
              const resolvedModuleType = this.structuredTypeMembers(moduleType as qt.StructuredType);
              result.type = qf.create.anonymousType(result, resolvedModuleType.members, empty, empty, resolvedModuleType.stringIndexInfo, resolvedModuleType.numberIndexInfo);
              return result;
            }
          }
        }
      }
      return symbol;
    }
    baseTypesOfClass(type: qt.InterfaceType) {
      type.resolvedBaseTypes = qt.resolvingEmptyArray;
      const baseConstructorType = getApparentType(getBaseConstructorTypeOfClass(type));
      if (!(baseConstructorType.flags & (TypeFlags.Object | qt.TypeFlags.Intersection | qt.TypeFlags.Any))) return (type.resolvedBaseTypes = empty);
      const baseTypeNode = getBaseTypeNodeOfClass(type)!;
      let baseType: qt.Type;
      const originalBaseType = baseConstructorType.symbol ? getDeclaredTypeOfSymbol(baseConstructorType.symbol) : undefined;
      if (baseConstructorType.symbol && baseConstructorType.symbol.flags & qt.SymbolFlags.Class && areAllOuterTypeParamsApplied(originalBaseType!))
        baseType = getTypeFromClassOrInterfaceReference(baseTypeNode, baseConstructorType.symbol);
      else if (baseConstructorType.flags & qt.TypeFlags.Any) {
        baseType = baseConstructorType;
      } else {
        const constructors = getInstantiatedConstructorsForTypeArgs(baseConstructorType, baseTypeNode.typeArgs, baseTypeNode);
        if (!constructors.length) {
          error(baseTypeNode.expression, qd.msgs.No_base_constructor_has_the_specified_number_of_type_args);
          return (type.resolvedBaseTypes = empty);
        }
        baseType = qf.get.returnTypeOfSignature(constructors[0]);
      }
      if (baseType === errorType) return (type.resolvedBaseTypes = empty);
      const reducedBaseType = getReducedType(baseType);
      if (!qf.is.validBaseType(reducedBaseType)) {
        const elaboration = elaborateNeverIntersection(undefined, baseType);
        const diagnostic = chainqd.Messages(
          elaboration,
          qd.msgs.Base_constructor_return_type_0_is_not_an_object_type_or_intersection_of_object_types_with_statically_known_members,
          typeToString(reducedBaseType)
        );
        diagnostics.add(qf.create.diagForNodeFromMessageChain(baseTypeNode.expression, diagnostic));
        return (type.resolvedBaseTypes = empty);
      }
      if (type === reducedBaseType || hasBaseType(reducedBaseType, type)) {
        error(type.symbol.valueDeclaration, qd.msgs.Type_0_recursively_references_itself_as_a_base_type, typeToString(type, undefined, TypeFormatFlags.WriteArrayAsGenericType));
        return (type.resolvedBaseTypes = empty);
      }
      if (type.resolvedBaseTypes === qt.resolvingEmptyArray) type.members = undefined;
      return (type.resolvedBaseTypes = [reducedBaseType]);
    }
    baseTypesOfInterface(type: qt.InterfaceType): void {
      type.resolvedBaseTypes = type.resolvedBaseTypes || empty;
      for (const declaration of type.symbol.declarations) {
        if (declaration.kind === Syntax.InterfaceDeclaration && qf.get.interfaceBaseTypeNodes(<qt.InterfaceDeclaration>declaration)) {
          for (const node of qf.get.interfaceBaseTypeNodes(<qt.InterfaceDeclaration>declaration)!) {
            const baseType = getReducedType(qf.get.typeFromTypeNode(node));
            if (baseType !== errorType) {
              if (qf.is.validBaseType(baseType)) {
                if (type !== baseType && !hasBaseType(baseType, type)) {
                  if (type.resolvedBaseTypes === empty) type.resolvedBaseTypes = [<qt.ObjectType>baseType];
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
    declaredMembers(type: qt.InterfaceType): qt.InterfaceTypeWithDeclaredMembers {
      if (!(<qt.InterfaceTypeWithDeclaredMembers>type).declaredProperties) {
        const symbol = type.symbol;
        const members = qf.get.membersOfSymbol(symbol);
        (<qt.InterfaceTypeWithDeclaredMembers>type).declaredProperties = getNamedMembers(members);
        (<qt.InterfaceTypeWithDeclaredMembers>type).declaredCallSignatures = empty;
        (<qt.InterfaceTypeWithDeclaredMembers>type).declaredConstructSignatures = empty;
        (<qt.InterfaceTypeWithDeclaredMembers>type).declaredCallSignatures = getSignaturesOfSymbol(members.get(InternalSymbol.Call));
        (<qt.InterfaceTypeWithDeclaredMembers>type).declaredConstructSignatures = getSignaturesOfSymbol(members.get(InternalSymbol.New));
        (<qt.InterfaceTypeWithDeclaredMembers>type).declaredStringIndexInfo = getIndexInfoOfSymbol(symbol, IndexKind.String);
        (<qt.InterfaceTypeWithDeclaredMembers>type).declaredNumberIndexInfo = getIndexInfoOfSymbol(symbol, IndexKind.Number);
      }
      return <qt.InterfaceTypeWithDeclaredMembers>type;
    }
    objectTypeMembers(type: qt.ObjectType, source: qt.InterfaceTypeWithDeclaredMembers, typeParams: readonly qt.TypeParam[], typeArgs: readonly qt.Type[]) {
      let mapper: qt.TypeMapper | undefined;
      let members: qt.SymbolTable;
      let callSignatures: readonly qt.Signature[];
      let constructSignatures: readonly qt.Signature[] | undefined;
      let stringIndexInfo: qt.IndexInfo | undefined;
      let numberIndexInfo: qt.IndexInfo | undefined;
      if (rangeEquals(typeParams, typeArgs, 0, typeParams.length)) {
        members = source.symbol ? qf.get.membersOfSymbol(source.symbol) : new qc.SymbolTable(source.declaredProperties);
        callSignatures = source.declaredCallSignatures;
        constructSignatures = source.declaredConstructSignatures;
        stringIndexInfo = source.declaredStringIndexInfo;
        numberIndexInfo = source.declaredNumberIndexInfo;
      } else {
        mapper = qf.create.typeMapper(typeParams, typeArgs);
        members = qf.create.instantiatedSymbolTable(source.declaredProperties, mapper, typeParams.length === 1);
        callSignatures = qf.instantiate.signatures(source.declaredCallSignatures, mapper);
        constructSignatures = qf.instantiate.signatures(source.declaredConstructSignatures, mapper);
        stringIndexInfo = qf.instantiate.indexInfo(source.declaredStringIndexInfo, mapper);
        numberIndexInfo = qf.instantiate.indexInfo(source.declaredNumberIndexInfo, mapper);
      }
      const baseTypes = getBaseTypes(source);
      if (baseTypes.length) {
        if (source.symbol && members === qf.get.membersOfSymbol(source.symbol)) members = new qc.SymbolTable(source.declaredProperties);
        setStructuredTypeMembers(type, members, callSignatures, constructSignatures, stringIndexInfo, numberIndexInfo);
        const thisArg = lastOrUndefined(typeArgs);
        for (const baseType of baseTypes) {
          const instantiatedBaseType = thisArg ? qf.get.typeWithThisArg(qf.instantiate.type(baseType, mapper), thisArg) : baseType;
          addInheritedMembers(members, qf.get.propertiesOfType(instantiatedBaseType));
          callSignatures = concatenate(callSignatures, getSignaturesOfType(instantiatedBaseType, SignatureKind.Call));
          constructSignatures = concatenate(constructSignatures, getSignaturesOfType(instantiatedBaseType, SignatureKind.Construct));
          if (!stringIndexInfo) stringIndexInfo = instantiatedBaseType === anyType ? qf.create.indexInfo(anyType, false) : qf.get.indexInfoOfType(instantiatedBaseType, IndexKind.String);
          numberIndexInfo = numberIndexInfo || qf.get.indexInfoOfType(instantiatedBaseType, IndexKind.Number);
        }
      }
      setStructuredTypeMembers(type, members, callSignatures, constructSignatures, stringIndexInfo, numberIndexInfo);
    }
    classOrInterfaceMembers(type: qt.InterfaceType): void {
      this.objectTypeMembers(type, this.declaredMembers(type), empty, empty);
    }
    typeReferenceMembers(type: qt.TypeReference): void {
      const source = this.declaredMembers(type.target);
      const typeParams = concatenate(source.typeParams!, [source.thisType!]);
      const typeArgs = getTypeArgs(type);
      const paddedTypeArgs = typeArgs.length === typeParams.length ? typeArgs : concatenate(typeArgs, [type]);
      this.objectTypeMembers(type, source, typeParams, paddedTypeArgs);
    }
    unionTypeMembers(type: qt.UnionType) {
      const callSignatures = getUnionSignatures(map(type.types, (t) => (t === globalFunctionType ? [unknownSignature] : getSignaturesOfType(t, SignatureKind.Call))));
      const constructSignatures = getUnionSignatures(map(type.types, (t) => getSignaturesOfType(t, SignatureKind.Construct)));
      const stringIndexInfo = getUnionIndexInfo(type.types, IndexKind.String);
      const numberIndexInfo = getUnionIndexInfo(type.types, IndexKind.Number);
      setStructuredTypeMembers(type, emptySymbols, callSignatures, constructSignatures, stringIndexInfo, numberIndexInfo);
    }
    intersectionTypeMembers(type: qt.IntersectionType) {
      let callSignatures: qt.Signature[] | undefined;
      let constructSignatures: qt.Signature[] | undefined;
      let stringIndexInfo: qt.IndexInfo | undefined;
      let numberIndexInfo: qt.IndexInfo | undefined;
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
              clone.resolvedReturn = includeMixinType(qf.get.returnTypeOfSignature(s), types, mixinFlags, i);
              return clone;
            });
          }
          constructSignatures = appendSignatures(constructSignatures, signatures);
        }
        callSignatures = appendSignatures(callSignatures, getSignaturesOfType(t, SignatureKind.Call));
        stringIndexInfo = intersectIndexInfos(stringIndexInfo, qf.get.indexInfoOfType(t, IndexKind.String));
        numberIndexInfo = intersectIndexInfos(numberIndexInfo, qf.get.indexInfoOfType(t, IndexKind.Number));
      }
      setStructuredTypeMembers(type, emptySymbols, callSignatures || empty, constructSignatures || empty, stringIndexInfo, numberIndexInfo);
    }
    anonymousTypeMembers(type: qt.AnonymousType) {
      const symbol = qf.get.mergedSymbol(type.symbol);
      if (type.target) {
        setStructuredTypeMembers(type, emptySymbols, empty, empty, undefined, undefined);
        const members = qf.create.instantiatedSymbolTable(getPropertiesOfObjectType(type.target), type.mapper!, false);
        const callSignatures = qf.instantiate.signatures(getSignaturesOfType(type.target, SignatureKind.Call), type.mapper!);
        const constructSignatures = qf.instantiate.signatures(getSignaturesOfType(type.target, SignatureKind.Construct), type.mapper!);
        const stringIndexInfo = qf.instantiate.indexInfo(qf.get.indexInfoOfType(type.target, IndexKind.String), type.mapper!);
        const numberIndexInfo = qf.instantiate.indexInfo(qf.get.indexInfoOfType(type.target, IndexKind.Number), type.mapper!);
        setStructuredTypeMembers(type, members, callSignatures, constructSignatures, stringIndexInfo, numberIndexInfo);
      } else if (symbol.flags & qt.SymbolFlags.TypeLiteral) {
        setStructuredTypeMembers(type, emptySymbols, empty, empty, undefined, undefined);
        const members = qf.get.membersOfSymbol(symbol);
        const callSignatures = getSignaturesOfSymbol(members.get(InternalSymbol.Call));
        const constructSignatures = getSignaturesOfSymbol(members.get(InternalSymbol.New));
        const stringIndexInfo = getIndexInfoOfSymbol(symbol, IndexKind.String);
        const numberIndexInfo = getIndexInfoOfSymbol(symbol, IndexKind.Number);
        setStructuredTypeMembers(type, members, callSignatures, constructSignatures, stringIndexInfo, numberIndexInfo);
      } else {
        let members = emptySymbols;
        let stringIndexInfo: qt.IndexInfo | undefined;
        if (symbol.exports) {
          members = this.getExportsOfSymbol();
          if (symbol === globalThisSymbol) {
            const varsOnly = new qc.SymbolTable();
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
            members = new qc.SymbolTable(getNamedMembers(members));
            addInheritedMembers(members, qf.get.propertiesOfType(baseConstructorType));
          } else if (baseConstructorType === anyType) {
            stringIndexInfo = qf.create.indexInfo(anyType, false);
          }
        }
        const numberIndexInfo =
          symbol.flags & qt.SymbolFlags.Enum && (getDeclaredTypeOfSymbol(symbol).flags & qt.TypeFlags.Enum || some(type.properties, (prop) => !!(prop.typeOfSymbol().flags & qt.TypeFlags.NumberLike)))
            ? enumNumberIndexInfo
            : undefined;
        setStructuredTypeMembers(type, members, empty, empty, stringIndexInfo, numberIndexInfo);
        if (symbol.flags & (SymbolFlags.Function | qt.SymbolFlags.Method)) type.callSignatures = getSignaturesOfSymbol(symbol);
        if (symbol.flags & qt.SymbolFlags.Class) {
          const classType = this.getDeclaredTypeOfClassOrInterface();
          let constructSignatures = symbol.members ? getSignaturesOfSymbol(symbol.members.get(InternalSymbol.Constructor)) : empty;
          if (symbol.flags & qt.SymbolFlags.Function) {
            constructSignatures = qu.addRange(
              constructSignatures.slice(),
              mapDefined(type.callSignatures, (sig) =>
                qf.is.jsConstructor(sig.declaration)
                  ? qf.create.signature(sig.declaration, sig.typeParams, sig.thisParam, sig.params, classType, undefined, sig.minArgCount, sig.flags & SignatureFlags.PropagatingFlags)
                  : undefined
              )
            );
          }
          if (!constructSignatures.length) constructSignatures = getDefaultConstructSignatures(classType);
          type.constructSignatures = constructSignatures;
        }
      }
    }
    reverseMappedTypeMembers(type: qt.ReverseMappedType) {
      const indexInfo = qf.get.indexInfoOfType(type.source, IndexKind.String);
      const modifiers = getMappedTypeModifiers(type.mappedType);
      const readonlyMask = modifiers & MappedTypeModifiers.IncludeReadonly ? false : true;
      const optionalMask = modifiers & MappedTypeModifiers.IncludeOptional ? 0 : qt.SymbolFlags.Optional;
      const stringIndexInfo = indexInfo && qf.create.indexInfo(inferReverseMappedType(indexInfo.type, type.mappedType, type.constraintType), readonlyMask && indexInfo.isReadonly);
      const members = new qc.SymbolTable();
      for (const prop of qf.get.propertiesOfType(type.source)) {
        const f = qt.CheckFlags.ReverseMapped | (readonlyMask && isReadonlySymbol(prop) ? qt.CheckFlags.Readonly : 0);
        const inferredProp = new qc.Symbol(SymbolFlags.Property | (prop.flags & optionalMask), prop.escName, f) as qt.ReverseMappedSymbol;
        inferredProp.declarations = prop.declarations;
        inferredProp.nameType = prop.links.nameType;
        inferredProp.propertyType = prop.typeOfSymbol();
        inferredProp.mappedType = type.mappedType;
        inferredProp.constraintType = type.constraintType;
        members.set(prop.escName, inferredProp);
      }
      setStructuredTypeMembers(type, members, empty, empty, stringIndexInfo, undefined);
    }
    mappedTypeMembers(type: qt.MappedType) {
      const members = new qc.SymbolTable();
      let stringIndexInfo: qt.IndexInfo | undefined;
      let numberIndexInfo: qt.IndexInfo | undefined;
      setStructuredTypeMembers(type, emptySymbols, empty, empty, undefined, undefined);
      const typeParam = getTypeParamFromMappedType(type);
      const constraintType = getConstraintTypeFromMappedType(type);
      const templateType = getTemplateTypeFromMappedType(<qt.MappedType>type.target || type);
      const modifiersType = getApparentType(getModifiersTypeFromMappedType(type));
      const templateModifiers = getMappedTypeModifiers(type);
      const include = keyofStringsOnly ? qt.TypeFlags.StringLiteral : qt.TypeFlags.StringOrNumberLiteralOrUnique;
      if (isMappedTypeWithKeyofConstraintDeclaration(type)) {
        for (const prop of qf.get.propertiesOfType(modifiersType)) {
          addMemberForKeyType(qf.get.literalTypeFromProperty(prop, include));
        }
        if (modifiersType.flags & qt.TypeFlags.Any || qf.get.indexInfoOfType(modifiersType, IndexKind.String)) addMemberForKeyType(stringType);
        if (!keyofStringsOnly && qf.get.indexInfoOfType(modifiersType, IndexKind.Number)) addMemberForKeyType(numberType);
      } else {
        forEachType(getLowerBoundOfKeyType(constraintType), addMemberForKeyType);
      }
      setStructuredTypeMembers(type, members, empty, empty, stringIndexInfo, numberIndexInfo);
      function addMemberForKeyType(t: qt.Type) {
        const templateMapper = appendTypeMapping(type.mapper, typeParam, t);
        if (qf.is.typeUsableAsPropertyName(t)) {
          const propName = getPropertyNameFromType(t);
          const modifiersProp = qf.get.propertyOfType(modifiersType, propName);
          const isOptional = !!(
            templateModifiers & MappedTypeModifiers.IncludeOptional ||
            (!(templateModifiers & MappedTypeModifiers.ExcludeOptional) && modifiersProp && modifiersProp.flags & qt.SymbolFlags.Optional)
          );
          const isReadonly = !!(
            templateModifiers & MappedTypeModifiers.IncludeReadonly ||
            (!(templateModifiers & MappedTypeModifiers.ExcludeReadonly) && modifiersProp && isReadonlySymbol(modifiersProp))
          );
          const stripOptional = strictNullChecks && !isOptional && modifiersProp && modifiersProp.flags & qt.SymbolFlags.Optional;
          const prop = <qt.MappedSymbol>(
            new qc.Symbol(
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
          const propType = qf.instantiate.type(templateType, templateMapper);
          if (t.flags & (TypeFlags.Any | qt.TypeFlags.String)) stringIndexInfo = qf.create.indexInfo(propType, !!(templateModifiers & MappedTypeModifiers.IncludeReadonly));
          else {
            numberIndexInfo = qf.create.indexInfo(numberIndexInfo ? qf.get.unionType([numberIndexInfo.type, propType]) : propType, !!(templateModifiers & MappedTypeModifiers.IncludeReadonly));
          }
        }
      }
    }
    structuredTypeMembers(type: qt.StructuredType): qt.ResolvedType {
      if (!(<qt.ResolvedType>type).members) {
        if (type.flags & qt.TypeFlags.Object) {
          if ((<qt.ObjectType>type).objectFlags & ObjectFlags.Reference) this.typeReferenceMembers(<qt.TypeReference>type);
          else if ((<qt.ObjectType>type).objectFlags & ObjectFlags.ClassOrInterface) this.classOrInterfaceMembers(<qt.InterfaceType>type);
          else if ((<qt.ReverseMappedType>type).objectFlags & ObjectFlags.ReverseMapped) this.reverseMappedTypeMembers(type as qt.ReverseMappedType);
          else if ((<qt.ObjectType>type).objectFlags & ObjectFlags.Anonymous) this.anonymousTypeMembers(<qt.AnonymousType>type);
          else if ((<qt.MappedType>type).objectFlags & ObjectFlags.Mapped) this.mappedTypeMembers(<qt.MappedType>type);
        } else if (type.flags & qt.TypeFlags.Union) this.unionTypeMembers(<qt.UnionType>type);
        else if (type.flags & qt.TypeFlags.Intersection) this.intersectionTypeMembers(<qt.IntersectionType>type);
      }
      return <qt.ResolvedType>type;
    }
    externalModuleTypeByLiteral(name: qt.StringLiteral) {
      const moduleSym = this.externalModuleName(name, name);
      if (moduleSym) {
        const resolvedModuleSymbol = this.externalModuleSymbol(moduleSym);
        if (resolvedModuleSymbol) return resolvedModuleSymbol.typeOfSymbol();
      }
      return anyType;
    }
    typeReferenceName(typeReferenceName: qt.EntityNameExpression | qt.EntityName | undefined, meaning: qt.SymbolFlags, ignoreErrors?: boolean) {
      if (!typeReferenceName) return unknownSymbol;
      return this.entityName(typeReferenceName, meaning, ignoreErrors) || unknownSymbol;
    }
    importSymbolType(node: qt.ImportTyping, links: qt.NodeLinks, symbol: qt.Symbol, meaning: qt.SymbolFlags) {
      const resolvedSymbol = symbol.resolve.symbol();
      links.resolvedSymbol = resolvedSymbol;
      if (meaning === qt.SymbolFlags.Value) return this.typeOfSymbol();
      return getTypeReferenceType(node, resolvedSymbol);
    }
    untypedCall(node: qt.CallLikeExpression): qt.Signature {
      if (callLikeExpressionMayHaveTypeArgs(node)) forEach(node.typeArgs, checkSourceElem);
      if (node.kind === Syntax.TaggedTemplateExpression) check.expression(node.template);
      else if (qf.is.jsx.openingLikeElem(node)) {
        check.expression(node.attributes);
      } else if (node.kind !== Syntax.Decorator) {
        forEach((<qt.CallExpression>node).args, (arg) => {
          check.expression(arg);
        });
      }
      return anySignature;
    }
    errorCall(node: qt.CallLikeExpression): qt.Signature {
      this.untypedCall(node);
      return unknownSignature;
    }
    call(
      node: qt.CallLikeExpression,
      signatures: readonly qt.Signature[],
      candidatesOutArray: qt.Signature[] | undefined,
      checkMode: CheckMode,
      callChainFlags: SignatureFlags,
      fallbackError?: qd.Message
    ): qt.Signature {
      const isTaggedTemplate = node.kind === Syntax.TaggedTemplateExpression;
      const isDecorator = node.kind === Syntax.Decorator;
      const isJsxOpeningOrSelfClosingElem = qf.is.jsx.openingLikeElem(node);
      const reportErrors = !candidatesOutArray;
      let typeArgs: Nodes<qt.Typing> | undefined;
      if (!isDecorator) {
        typeArgs = (<qt.CallExpression>node).typeArgs;
        if (isTaggedTemplate || isJsxOpeningOrSelfClosingElem || (<qt.CallExpression>node).expression.kind !== Syntax.SuperKeyword) forEach(typeArgs, checkSourceElem);
      }
      const candidates = candidatesOutArray || [];
      reorderCandidates(signatures, candidates, callChainFlags);
      if (!candidates.length) {
        if (reportErrors) diagnostics.add(getDiagnosticForCallNode(node, qd.msgs.Call_target_does_not_contain_any_signatures));
        return this.errorCall(node);
      }
      const args = getEffectiveCallArgs(node);
      const isSingleNonGenericCandidate = candidates.length === 1 && !candidates[0].typeParams;
      let argCheckMode = !isDecorator && !isSingleNonGenericCandidate && some(args, qf.is.contextSensitive) ? CheckMode.SkipContextSensitive : CheckMode.Normal;
      let candidatesForArgError: qt.Signature[] | undefined;
      let candidateForArgArityError: qt.Signature | undefined;
      let candidateForTypeArgError: qt.Signature | undefined;
      let result: qt.Signature | undefined;
      const signatureHelpTrailingComma = !!(checkMode & CheckMode.IsForSignatureHelp) && node.kind === Syntax.CallExpression && node.args.trailingComma;
      if (candidates.length > 1) result = chooseOverload(candidates, subtypeRelation, signatureHelpTrailingComma);
      if (!result) result = chooseOverload(candidates, assignableRelation, signatureHelpTrailingComma);
      if (result) return result;
      if (reportErrors) {
        if (candidatesForArgError) {
          if (candidatesForArgError.length === 1 || candidatesForArgError.length > 3) {
            const last = candidatesForArgError[candidatesForArgError.length - 1];
            let chain: qd.MessageChain | undefined;
            if (candidatesForArgError.length > 3) {
              chain = chainqd.Messages(chain, qd.msgs.The_last_overload_gave_the_following_error);
              chain = chainqd.Messages(chain, qd.msgs.No_overload_matches_this_call);
            }
            const diags = getSignatureApplicabilityError(node, args, last, assignableRelation, CheckMode.Normal, true, () => chain);
            if (diags) {
              for (const d of diags) {
                if (last.declaration && candidatesForArgError.length > 3) addRelatedInfo(d, qf.create.diagForNode(last.declaration, qd.msgs.The_last_overload_is_declared_here));
                diagnostics.add(d);
              }
            } else {
              qu.fail('No error for last overload signature');
            }
          } else {
            const allDiagnostics: (readonly qd.DiagnosticRelatedInformation[])[] = [];
            let max = 0;
            let min = Number.MAX_VALUE;
            let minIndex = 0;
            let i = 0;
            for (const c of candidatesForArgError) {
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
                qu.fail('No error for 3 or fewer overload signatures');
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
              diagnostics.add(qf.create.diagForNodeFromMessageChain(node, chain, related));
            }
          }
        } else if (candidateForArgArityError) {
          diagnostics.add(getArgArityError(node, [candidateForArgArityError], args));
        } else if (candidateForTypeArgError) {
          check.typeArgs(candidateForTypeArgError, (node as qt.CallExpression | qt.TaggedTemplateExpression | qt.JsxOpeningLikeElem).typeArgs!, true, fallbackError);
        } else {
          const signaturesWithCorrectTypeArgArity = filter(signatures, (s) => hasCorrectTypeArgArity(s, typeArgs));
          if (signaturesWithCorrectTypeArgArity.length === 0) diagnostics.add(getTypeArgArityError(node, signatures, typeArgs!));
          else if (!isDecorator) {
            diagnostics.add(getArgArityError(node, signaturesWithCorrectTypeArgArity, args));
          } else if (fallbackError) {
            diagnostics.add(getDiagnosticForCallNode(node, fallbackError));
          }
        }
      }
      return getCandidateForOverloadFailure(node, candidates, args, !!candidatesOutArray);
      function chooseOverload(candidates: qt.Signature[], relation: qu.QMap<RelationComparisonResult>, signatureHelpTrailingComma = false) {
        candidatesForArgError = undefined;
        candidateForArgArityError = undefined;
        candidateForTypeArgError = undefined;
        if (isSingleNonGenericCandidate) {
          const candidate = candidates[0];
          if (some(typeArgs) || !hasCorrectArity(node, args, candidate, signatureHelpTrailingComma)) return;
          if (getSignatureApplicabilityError(node, args, candidate, relation, CheckMode.Normal, false, undefined)) {
            candidatesForArgError = [candidate];
            return;
          }
          return candidate;
        }
        for (let candidateIndex = 0; candidateIndex < candidates.length; candidateIndex++) {
          const candidate = candidates[candidateIndex];
          if (!hasCorrectTypeArgArity(candidate, typeArgs) || !hasCorrectArity(node, args, candidate, signatureHelpTrailingComma)) continue;
          let checkCandidate: qt.Signature;
          let inferenceContext: qt.InferenceContext | undefined;
          if (candidate.typeParams) {
            let typeArgTypes: qt.Type[] | undefined;
            if (some(typeArgs)) {
              typeArgTypes = check.typeArgs(candidate, typeArgs, false);
              if (!typeArgTypes) {
                candidateForTypeArgError = candidate;
                continue;
              }
            } else {
              inferenceContext = qf.create.inferenceContext(candidate.typeParams, candidate, qf.is.inJSFile(node) ? InferenceFlags.AnyDefault : InferenceFlags.None);
              typeArgTypes = inferTypeArgs(node, candidate, args, argCheckMode | CheckMode.SkipGenericFunctions, inferenceContext);
              argCheckMode |= inferenceContext.flags & InferenceFlags.SkippedGenericFunction ? CheckMode.SkipGenericFunctions : CheckMode.Normal;
            }
            checkCandidate = getSignatureInstantiation(candidate, typeArgTypes, qf.is.inJSFile(candidate.declaration), inferenceContext && inferenceContext.inferredTypeParams);
            if (getNonArrayRestType(candidate) && !hasCorrectArity(node, args, checkCandidate, signatureHelpTrailingComma)) {
              candidateForArgArityError = checkCandidate;
              continue;
            }
          } else {
            checkCandidate = candidate;
          }
          if (getSignatureApplicabilityError(node, args, checkCandidate, relation, argCheckMode, false, undefined)) {
            (candidatesForArgError || (candidatesForArgError = [])).push(checkCandidate);
            continue;
          }
          if (argCheckMode) {
            argCheckMode = CheckMode.Normal;
            if (inferenceContext) {
              const typeArgTypes = inferTypeArgs(node, candidate, args, argCheckMode, inferenceContext);
              checkCandidate = getSignatureInstantiation(candidate, typeArgTypes, qf.is.inJSFile(candidate.declaration), inferenceContext && inferenceContext.inferredTypeParams);
              if (getNonArrayRestType(candidate) && !hasCorrectArity(node, args, checkCandidate, signatureHelpTrailingComma)) {
                candidateForArgArityError = checkCandidate;
                continue;
              }
            }
            if (getSignatureApplicabilityError(node, args, checkCandidate, relation, argCheckMode, false, undefined)) {
              (candidatesForArgError || (candidatesForArgError = [])).push(checkCandidate);
              continue;
            }
          }
          candidates[candidateIndex] = checkCandidate;
          return checkCandidate;
        }
        return;
      }
    }
    callExpression(node: qt.CallExpression, candidatesOutArray: qt.Signature[] | undefined, checkMode: CheckMode): qt.Signature {
      if (node.expression.kind === Syntax.SuperKeyword) {
        const superType = check.superExpression(node.expression);
        if (qf.is.typeAny(superType)) {
          for (const arg of node.args) {
            check.expression(arg);
          }
          return anySignature;
        }
        if (superType !== errorType) {
          const baseTypeNode = qf.get.effectiveBaseTypeNode(qf.get.containingClass(node)!);
          if (baseTypeNode) {
            const baseConstructors = getInstantiatedConstructorsForTypeArgs(superType, baseTypeNode.typeArgs, baseTypeNode);
            return this.call(node, baseConstructors, candidatesOutArray, checkMode, SignatureFlags.None);
          }
        }
        return this.untypedCall(node);
      }
      let callChainFlags: SignatureFlags;
      let funcType = check.expression(node.expression);
      if (qf.is.callChain(node)) {
        const nonOptionalType = getOptionalExpressionType(funcType, node.expression);
        callChainFlags = nonOptionalType === funcType ? SignatureFlags.None : qf.is.outermostOptionalChain(node) ? SignatureFlags.IsOuterCallChain : SignatureFlags.IsInnerCallChain;
        funcType = nonOptionalType;
      } else {
        callChainFlags = SignatureFlags.None;
      }
      funcType = check.nonNullTypeWithReporter(funcType, node.expression, reportCannotInvokePossiblyNullOrUndefinedError);
      if (funcType === silentNeverType) return silentNeverSignature;
      const apparentType = getApparentType(funcType);
      if (apparentType === errorType) return this.errorCall(node);
      const callSignatures = getSignaturesOfType(apparentType, SignatureKind.Call);
      const numConstructSignatures = getSignaturesOfType(apparentType, SignatureKind.Construct).length;
      if (isUntypedFunctionCall(funcType, apparentType, callSignatures.length, numConstructSignatures)) {
        if (funcType !== errorType && node.typeArgs) error(node, qd.msgs.Untyped_function_calls_may_not_accept_type_args);
        return this.untypedCall(node);
      }
      if (!callSignatures.length) {
        if (numConstructSignatures) error(node, qd.msgs.Value_of_type_0_is_not_callable_Did_you_mean_to_include_new, typeToString(funcType));
        else {
          let relatedInformation: qd.DiagnosticRelatedInformation | undefined;
          if (node.args.length === 1) {
            const text = node.sourceFile.text;
            if (qy.is.lineBreak(text.charCodeAt(qy.skipTrivia(text, node.expression.end, true) - 1)))
              relatedInformation = qf.create.diagForNode(node.expression, qd.msgs.Are_you_missing_a_semicolon);
          }
          invocationError(node.expression, apparentType, SignatureKind.Call, relatedInformation);
        }
        return this.errorCall(node);
      }
      if (checkMode & CheckMode.SkipGenericFunctions && !node.typeArgs && callSignatures.some(isGenericFunctionReturningFunction)) {
        skippedGenericFunction(node, checkMode);
        return resolvingSignature;
      }
      if (callSignatures.some((sig) => qf.is.inJSFile(sig.declaration) && !!qf.get.doc.classTag(sig.declaration!))) {
        error(node, qd.msgs.Value_of_type_0_is_not_callable_Did_you_mean_to_include_new, typeToString(funcType));
        return this.errorCall(node);
      }
      return this.call(node, callSignatures, candidatesOutArray, checkMode, callChainFlags);
    }
    newExpression(node: qt.NewExpression, candidatesOutArray: qt.Signature[] | undefined, checkMode: CheckMode): qt.Signature {
      let expressionType = check.nonNullExpression(node.expression);
      if (expressionType === silentNeverType) return silentNeverSignature;
      expressionType = getApparentType(expressionType);
      if (expressionType === errorType) return this.errorCall(node);
      if (qf.is.typeAny(expressionType)) {
        if (node.typeArgs) error(node, qd.msgs.Untyped_function_calls_may_not_accept_type_args);
        return this.untypedCall(node);
      }
      const constructSignatures = getSignaturesOfType(expressionType, SignatureKind.Construct);
      if (constructSignatures.length) {
        if (!isConstructorAccessible(node, constructSignatures[0])) return this.errorCall(node);
        const valueDecl = expressionType.symbol && expressionType.symbol.classLikeDeclaration();
        if (valueDecl && qf.has.syntacticModifier(valueDecl, ModifierFlags.Abstract)) {
          error(node, qd.msgs.Cannot_create_an_instance_of_an_abstract_class);
          return this.errorCall(node);
        }
        return this.call(node, constructSignatures, candidatesOutArray, checkMode, SignatureFlags.None);
      }
      const callSignatures = getSignaturesOfType(expressionType, SignatureKind.Call);
      if (callSignatures.length) {
        const signature = this.call(node, callSignatures, candidatesOutArray, checkMode, SignatureFlags.None);
        if (!noImplicitAny) {
          if (signature.declaration && !qf.is.jsConstructor(signature.declaration) && qf.get.returnTypeOfSignature(signature) !== voidType)
            error(node, qd.msgs.Only_a_void_function_can_be_called_with_the_new_keyword);
          if (getThisTypeOfSignature(signature) === voidType) error(node, qd.msgs.A_function_that_is_called_with_the_new_keyword_cannot_have_a_this_type_that_is_void);
        }
        return signature;
      }
      invocationError(node.expression, expressionType, SignatureKind.Construct);
      return this.errorCall(node);
    }
    taggedTemplateExpression(node: qt.TaggedTemplateExpression, candidatesOutArray: qt.Signature[] | undefined, checkMode: CheckMode): qt.Signature {
      const tagType = check.expression(node.tag);
      const apparentType = getApparentType(tagType);
      if (apparentType === errorType) return this.errorCall(node);
      const callSignatures = getSignaturesOfType(apparentType, SignatureKind.Call);
      const numConstructSignatures = getSignaturesOfType(apparentType, SignatureKind.Construct).length;
      if (isUntypedFunctionCall(tagType, apparentType, callSignatures.length, numConstructSignatures)) return this.untypedCall(node);
      if (!callSignatures.length) {
        invocationError(node.tag, apparentType, SignatureKind.Call);
        return this.errorCall(node);
      }
      return this.call(node, callSignatures, candidatesOutArray, checkMode, SignatureFlags.None);
    }
    decorator(node: qt.Decorator, candidatesOutArray: qt.Signature[] | undefined, checkMode: CheckMode): qt.Signature {
      const funcType = check.expression(node.expression);
      const apparentType = getApparentType(funcType);
      if (apparentType === errorType) return this.errorCall(node);
      const callSignatures = getSignaturesOfType(apparentType, SignatureKind.Call);
      const numConstructSignatures = getSignaturesOfType(apparentType, SignatureKind.Construct).length;
      if (isUntypedFunctionCall(funcType, apparentType, callSignatures.length, numConstructSignatures)) return this.untypedCall(node);
      if (isPotentiallyUncalledDecorator(node, callSignatures)) {
        const nodeStr = qf.get.textOf(node.expression, false);
        error(node, qd.msgs._0_accepts_too_few_args_to_be_used_as_a_decorator_here_Did_you_mean_to_call_it_first_and_write_0, nodeStr);
        return this.errorCall(node);
      }
      const headMessage = getDiagnosticHeadMessageForDecoratorResolution(node);
      if (!callSignatures.length) {
        const errorDetails = invocationErrorDetails(node.expression, apparentType, SignatureKind.Call);
        const messageChain = chainqd.Messages(errorDetails.messageChain, headMessage);
        const diag = qf.create.diagForNodeFromMessageChain(node.expression, messageChain);
        if (errorDetails.relatedMessage) addRelatedInfo(diag, qf.create.diagForNode(node.expression, errorDetails.relatedMessage));
        diagnostics.add(diag);
        invocationErrorRecovery(apparentType, SignatureKind.Call, diag);
        return this.errorCall(node);
      }
      return this.call(node, callSignatures, candidatesOutArray, checkMode, SignatureFlags.None, headMessage);
    }
    jsxOpeningLikeElem(node: qt.JsxOpeningLikeElem, candidatesOutArray: qt.Signature[] | undefined, checkMode: CheckMode): qt.Signature {
      if (isJsxIntrinsicIdentifier(node.tagName)) {
        const result = getIntrinsicAttributesTypeFromJsxOpeningLikeElem(node);
        const fakeSignature = qf.create.signatureForJSXIntrinsic(node, result);
        check.typeAssignableToAndOptionallyElaborate(
          check.expressionWithContextualType(node.attributes, getEffectiveFirstArgForJsxSignature(fakeSignature, node), undefined, CheckMode.Normal),
          result,
          node.tagName,
          node.attributes
        );
        return fakeSignature;
      }
      const exprTypes = check.expression(node.tagName);
      const apparentType = getApparentType(exprTypes);
      if (apparentType === errorType) return this.errorCall(node);
      const signatures = getUninstantiatedJsxSignaturesOfType(exprTypes, node);
      if (isUntypedFunctionCall(exprTypes, apparentType, signatures.length, 0)) return this.untypedCall(node);
      if (signatures.length === 0) {
        error(node.tagName, qd.msgs.JSX_elem_type_0_does_not_have_any_construct_or_call_signatures, qf.get.textOf(node.tagName));
        return this.errorCall(node);
      }
      return this.call(node, signatures, candidatesOutArray, checkMode, SignatureFlags.None);
    }
    signature(node: qt.CallLikeExpression, candidatesOutArray: qt.Signature[] | undefined, checkMode: CheckMode): qt.Signature {
      switch (node.kind) {
        case Syntax.CallExpression:
          return this.callExpression(node, candidatesOutArray, checkMode);
        case Syntax.NewExpression:
          return this.newExpression(node, candidatesOutArray, checkMode);
        case Syntax.TaggedTemplateExpression:
          return this.taggedTemplateExpression(node, candidatesOutArray, checkMode);
        case Syntax.Decorator:
          return this.decorator(node, candidatesOutArray, checkMode);
        case Syntax.JsxOpeningElem:
        case Syntax.JsxSelfClosingElem:
          return this.jsxOpeningLikeElem(node, candidatesOutArray, checkMode);
      }
      throw qc.assert.never(node, "Branch in 'this.signature' should be unreachable.");
    }
    helpersModule(node: qt.SourceFile, errorNode: Node) {
      if (!externalHelpersModule)
        externalHelpersModule = this.externalModule(node, qt.externalHelpersModuleNameText, qd.msgs.This_syntax_requires_an_imported_helper_but_module_0_cannot_be_found, errorNode) || unknownSymbol;
      return externalHelpersModule;
    }
  })());
}
export interface Fresolve extends ReturnType<typeof newResolve> {}
export function tryExtractTSExtension(fileName: string): string | undefined {
  return find(supportedTSExtensionsForExtractExtension, (extension) => fileExtensionIs(fileName, extension));
}
