import * as qc from '../core';
import * as qd from '../diagnostic';
import * as qg from '../debug';
import { ExpandingFlags, Node, NodeFlags, ObjectFlags, SymbolFlags, TypeFlags, VarianceFlags } from './type';
import * as qt from './type';
import * as qu from '../util';
import { ModifierFlags, Syntax } from '../syntax';
import * as qy from '../syntax';
import { Symbol } from './symbol';
import { Tget } from './get';
import { Thas, Tis } from './predicate';
interface Frame extends qt.Frame {
  get: Tget;
  has: Thas;
  is: Tis;
}
export function newCreate(f: qt.Frame) {
  const qf = f as Frame;
  interface Tcreate extends ReturnType<typeof qc.newCreate> {}
  class Tcreate {
    intrinsicType(kind: qt.TypeFlags, intrinsicName: string, objectFlags: ObjectFlags = 0): IntrinsicType {
      const type = <IntrinsicType>this.type(kind);
      type.intrinsicName = intrinsicName;
      type.objectFlags = objectFlags;
      return type;
    }
    booleanType(trueFalseTypes: readonly Type[]): IntrinsicType & UnionType {
      const type = <IntrinsicType & UnionType>qf.get.unionType(trueFalseTypes);
      type.flags |= qt.TypeFlags.Boolean;
      type.intrinsicName = 'boolean';
      return type;
    }
    objectType(objectFlags: ObjectFlags, symbol?: Symbol): ObjectType {
      const type = <ObjectType>this.type(TypeFlags.Object);
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
      return qf.get.unionType(arrayFrom(typeofEQFacts.keys(), getLiteralType));
    }
    typeParameter(symbol?: Symbol) {
      const type = <TypeParameter>this.type(TypeFlags.TypeParameter);
      if (symbol) type.symbol = symbol;
      return type;
    }
    anonymousType(
      symbol: Symbol | undefined,
      members: SymbolTable,
      callSignatures: readonly Signature[],
      constructSignatures: readonly Signature[],
      stringIndexInfo: IndexInfo | undefined,
      numberIndexInfo: IndexInfo | undefined
    ): ResolvedType {
      return setStructuredTypeMembers(this.objectType(ObjectFlags.Anonymous, symbol), members, callSignatures, constructSignatures, stringIndexInfo, numberIndexInfo);
    }
    instantiatedSymbolTable(symbols: Symbol[], mapper: TypeMapper, mappingThisOnly: boolean): SymbolTable {
      const result = new SymbolTable();
      for (const symbol of symbols) {
        result.set(symbol.escName, mappingThisOnly && isThisless(symbol) ? symbol : qf.instantiate.symbol(symbol, mapper));
      }
      return result;
    }
    signature(
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
    unionSignature(signature: Signature, unionSignatures: Signature[]) {
      const result = cloneSignature(signature);
      result.unionSignatures = unionSignatures;
      result.target = undefined;
      result.mapper = undefined;
      return result;
    }
    optionalCallSignature(signature: Signature, callChainFlags: SignatureFlags) {
      assert(
        callChainFlags === SignatureFlags.IsInnerCallChain || callChainFlags === SignatureFlags.IsOuterCallChain,
        'An optional call signature can either be for an inner call chain or an outer call chain, but not both.'
      );
      const result = cloneSignature(signature);
      result.flags |= callChainFlags;
      return result;
    }
    unionOrIntersectionProperty(containingType: UnionOrIntersectionType, name: qu.__String): Symbol | undefined {
      let singleProp: Symbol | undefined;
      let propSet: qu.QMap<Symbol> | undefined;
      let indexTypes: Type[] | undefined;
      const isUnion = containingType.flags & qt.TypeFlags.Union;
      let optionalFlag = isUnion ? qt.SymbolFlags.None : qt.SymbolFlags.Optional;
      let syntheticFlag = qt.CheckFlags.SyntheticMethod;
      let checkFlags = 0;
      for (const current of containingType.types) {
        const type = getApparentType(current);
        if (!(type === errorType || type.flags & qt.TypeFlags.Never)) {
          const prop = qf.get.propertyOfType(type, name);
          const modifiers = prop ? getDeclarationModifierFlagsFromSymbol(prop) : 0;
          if (prop) {
            if (isUnion) optionalFlag |= prop.flags & qt.SymbolFlags.Optional;
            else optionalFlag &= prop.flags;
            if (!singleProp) singleProp = prop;
            else if (prop !== singleProp) {
              if (!propSet) {
                propSet = new qu.QMap<Symbol>();
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
        const type = qf.get.typeOfSymbol(prop);
        if (!firstType) {
          firstType = type;
          nameType = s.getLinks(prop).nameType;
        } else if (type !== firstType) {
          checkFlags |= qt.CheckFlags.HasNonUniformType;
        }
        if (qf.is.literalType(type)) checkFlags |= qt.CheckFlags.HasLiteralType;
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
        result.type = isUnion ? qf.get.unionType(propTypes) : getIntersectionType(propTypes);
      }
      return result;
    }
    typePredicate(kind: TypePredicateKind, parameterName: string | undefined, parameterIndex: number | undefined, type: Type | undefined): TypePredicate {
      return { kind, parameterName, parameterIndex, type } as TypePredicate;
    }
    typePredicateFromTypingPredicate(node: TypingPredicate, signature: Signature): TypePredicate {
      const parameterName = node.parameterName;
      const type = node.type && getTypeFromTypeNode(node.type);
      return parameterName.kind === Syntax.ThisTyping
        ? this.typePredicate(node.assertsModifier ? TypePredicateKind.AssertsThis : TypePredicateKind.This, undefined, type)
        : this.typePredicate(
            node.assertsModifier ? TypePredicateKind.AssertsIdentifier : TypePredicateKind.Identifier,
            parameterName.escapedText as string,
            findIndex(signature.parameters, (p) => p.escName === parameterName.escapedText),
            type
          );
    }
    signatureInstantiation(signature: Signature, typeArguments: readonly Type[] | undefined): Signature {
      return qf.instantiate.signature(signature, this.signatureTypeMapper(signature, typeArguments), true);
    }
    signatureTypeMapper(signature: Signature, typeArguments: readonly Type[] | undefined): TypeMapper {
      return this.typeMapper(signature.typeParameters!, typeArguments);
    }
    erasedSignature(signature: Signature) {
      return qf.instantiate.signature(signature, this.typeEraser(signature.typeParameters!), true);
    }
    canonicalSignature(signature: Signature) {
      return getSignatureInstantiation(
        signature,
        map(signature.typeParameters, (tp) => (tp.target && !getConstraintOfTypeParameter(tp.target) ? tp.target : tp)),
        qf.is.inJSFile(signature.declaration)
      );
    }
    indexInfo(type: Type, isReadonly: boolean, declaration?: IndexSignatureDeclaration): IndexInfo {
      return { type, isReadonly, declaration };
    }
    typeReference(target: GenericType, typeArguments: readonly Type[] | undefined): TypeReference {
      const id = getTypeListId(typeArguments);
      let type = target.instantiations.get(id);
      if (!type) {
        type = <TypeReference>this.objectType(ObjectFlags.Reference, target.symbol);
        target.instantiations.set(id, type);
        type.objectFlags |= typeArguments ? getPropagatingFlagsOfTypes(typeArguments, 0) : 0;
        type.target = target;
        type.resolvedTypeArguments = typeArguments;
      }
      return type;
    }
    deferredTypeReference(target: GenericType, node: TypingReference | ArrayTyping | TupleTyping, mapper?: TypeMapper): DeferredTypeReference {
      const aliasSymbol = getAliasSymbolForTypeNode(node);
      const aliasTypeArguments = getTypeArgumentsForAliasSymbol(aliasSymbol);
      const type = <DeferredTypeReference>this.objectType(ObjectFlags.Reference, target.symbol);
      type.target = target;
      type.node = node;
      type.mapper = mapper;
      type.aliasSymbol = aliasSymbol;
      type.aliasTypeArguments = mapper ? qf.instantiate.types(aliasTypeArguments, mapper) : aliasTypeArguments;
      return type;
    }
    typeFromGenericGlobalType(genericGlobalType: GenericType, typeArguments: readonly Type[]): ObjectType {
      return genericGlobalType !== emptyGenericType ? this.typeReference(genericGlobalType, typeArguments) : emptyObjectType;
    }
    typedPropertyDescriptorType(propertyType: Type): Type {
      return this.typeFromGenericGlobalType(getGlobalTypedPropertyDescriptorType(), [propertyType]);
    }
    iterableType(iteratedType: Type): Type {
      return this.typeFromGenericGlobalType(getGlobalIterableType(true), [iteratedType]);
    }
    arrayType(elemType: Type, readonly?: boolean): ObjectType {
      return this.typeFromGenericGlobalType(readonly ? globalReadonlyArrayType : globalArrayType, [elemType]);
    }
    tupleTypeOfArity(
      arity: number,
      minLength: number,
      hasRestElem: boolean,
      readonly: boolean,
      namedMemberDeclarations: readonly (NamedTupleMember | ParameterDeclaration)[] | undefined
    ): TupleType {
      let typeParameters: TypeParameter[] | undefined;
      const properties: Symbol[] = [];
      const maxLength = hasRestElem ? arity - 1 : arity;
      if (arity) {
        typeParameters = new Array(arity);
        for (let i = 0; i < arity; i++) {
          const typeParameter = (typeParameters[i] = this.typeParameter());
          if (i < maxLength) {
            const property = new Symbol(SymbolFlags.Property | (i >= minLength ? qt.SymbolFlags.Optional : 0), ('' + i) as qu.__String, readonly ? qt.CheckFlags.Readonly : 0);
            property.tupleLabelDeclaration = namedMemberDeclarations?.[i];
            property.type = typeParameter;
            properties.push(property);
          }
        }
      }
      const literalTypes = [];
      for (let i = minLength; i <= maxLength; i++) literalTypes.push(getLiteralType(i));
      const lengthSymbol = new Symbol(SymbolFlags.Property, 'length' as qu.__String);
      lengthSymbol.type = hasRestElem ? numberType : qf.get.unionType(literalTypes);
      properties.push(lengthSymbol);
      const type = <TupleType & InterfaceTypeWithDeclaredMembers>this.objectType(ObjectFlags.Tuple | ObjectFlags.Reference);
      type.typeParameters = typeParameters;
      type.outerTypeParameters = undefined;
      type.localTypeParameters = typeParameters;
      type.instantiations = new qu.QMap<TypeReference>();
      type.instantiations.set(getTypeListId(type.typeParameters), <GenericType>type);
      type.target = <GenericType>type;
      type.resolvedTypeArguments = type.typeParameters;
      type.thisType = this.typeParameter();
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
    tupleType(
      elemTypes: readonly Type[],
      minLength = elemTypes.length,
      hasRestElem = false,
      readonly = false,
      namedMemberDeclarations?: readonly (NamedTupleMember | ParameterDeclaration)[]
    ) {
      const arity = elemTypes.length;
      if (arity === 1 && hasRestElem) return this.arrayType(elemTypes[0], readonly);
      const tupleType = getTupleTypeOfArity(arity, minLength, arity > 0 && hasRestElem, readonly, namedMemberDeclarations);
      return elemTypes.length ? this.typeReference(tupleType, elemTypes) : tupleType;
    }
    intersectionType(types: Type[], aliasSymbol?: Symbol, aliasTypeArguments?: readonly Type[]) {
      const result = <IntersectionType>this.type(TypeFlags.Intersection);
      result.objectFlags = getPropagatingFlagsOfTypes(types, qt.TypeFlags.Nullable);
      result.types = types;
      result.aliasSymbol = aliasSymbol;
      result.aliasTypeArguments = aliasTypeArguments;
      return result;
    }
    indexType(type: InstantiableType | UnionOrIntersectionType, stringsOnly: boolean) {
      const result = <IndexType>this.type(TypeFlags.Index);
      result.type = type;
      result.stringsOnly = stringsOnly;
      return result;
    }
    indexedAccessType(objectType: Type, indexType: Type) {
      const type = <IndexedAccessType>this.type(TypeFlags.IndexedAccess);
      type.objectType = objectType;
      type.indexType = indexType;
      return type;
    }
    literalType(flags: qt.TypeFlags, value: string | number | PseudoBigInt, symbol: Symbol | undefined) {
      const type = <LiteralType>this.type(flags);
      type.symbol = symbol!;
      type.value = value;
      return type;
    }
    typeMapper(sources: readonly TypeParameter[], targets: readonly Type[] | undefined): TypeMapper {
      return sources.length === 1 ? makeUnaryTypeMapper(sources[0], targets ? targets[0] : anyType) : makeArrayTypeMapper(sources, targets);
    }
    typeEraser(sources: readonly TypeParameter[]): TypeMapper {
      return this.typeMapper(sources, undefined);
    }
    backreferenceMapper(context: InferenceContext, index: number): TypeMapper {
      return makeFunctionTypeMapper((t) => (findIndex(context.inferences, (info) => info.typeParameter === t) >= index ? unknownType : t));
    }
    symbolWithType(source: Symbol, type: Type | undefined) {
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
    wideningContext(parent: WideningContext | undefined, propertyName: qu.__String | undefined, siblings: Type[] | undefined): WideningContext {
      return { parent, propertyName, siblings, resolvedProperties: undefined };
    }
    inferenceContext(typeParameters: readonly TypeParameter[], signature: Signature | undefined, flags: InferenceFlags, compareTypes?: TypeComparer): InferenceContext {
      return this.inferenceContextWorker(typeParameters.map(this.inferenceInfo), signature, flags, compareTypes || compareTypesAssignable);
    }
    inferenceContextWorker(inferences: InferenceInfo[], signature: Signature | undefined, flags: InferenceFlags, compareTypes: TypeComparer): InferenceContext {
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
    inferenceInfo(typeParameter: TypeParameter): InferenceInfo {
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
    emptyObjectTypeFromStringLiteral(type: Type) {
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
      const indexInfo = type.flags & qt.TypeFlags.String ? this.indexInfo(emptyObjectType, false) : undefined;
      return this.anonymousType(undefined, members, empty, empty, indexInfo, undefined);
    }
    reverseMappedType(source: Type, target: MappedType, constraint: IndexType) {
      if (!(qf.get.indexInfoOfType(source, IndexKind.String) || (qf.get.propertiesOfType(source).length !== 0 && qf.is.partiallyInferableType(source)))) return;
      if (qf.is.arrayType(source)) return this.arrayType(inferReverseMappedType(getTypeArguments(<TypeReference>source)[0], target, constraint), qf.is.readonlyArrayType(source));
      if (qf.is.tupleType(source)) {
        const elemTypes = map(getTypeArguments(source), (t) => inferReverseMappedType(t, target, constraint));
        const minLength = getMappedTypeModifiers(target) & MappedTypeModifiers.IncludeOptional ? getTypeReferenceArity(source) - (source.target.hasRestElem ? 1 : 0) : source.target.minLength;
        return this.tupleType(elemTypes, minLength, source.target.hasRestElem, source.target.readonly, source.target.labeledElemDeclarations);
      }
      const reversed = this.objectType(ObjectFlags.ReverseMapped | ObjectFlags.Anonymous, undefined) as ReverseMappedType;
      reversed.source = source;
      reversed.mappedType = target;
      reversed.constraintType = constraint;
      return reversed;
    }
    flowType(type: Type, incomplete: boolean): FlowType {
      return incomplete ? { flags: 0, type } : type;
    }
    evolvingArrayType(elemType: Type): EvolvingArrayType {
      const result = <EvolvingArrayType>this.objectType(ObjectFlags.EvolvingArray);
      result.elemType = elemType;
      return result;
    }
    finalArrayType(elemType: Type) {
      return elemType.flags & qt.TypeFlags.Never
        ? autoArrayType
        : this.arrayType(elemType.flags & qt.TypeFlags.Union ? qf.get.unionType((<UnionType>elemType).types, UnionReduction.Subtype) : elemType);
    }
    arrayLiteralType(type: ObjectType) {
      if (!(getObjectFlags(type) & ObjectFlags.Reference)) return type;
      let literalType = (<TypeReference>type).literalType;
      if (!literalType) {
        literalType = (<TypeReference>type).literalType = cloneTypeReference(<TypeReference>type);
        literalType.objectFlags |= ObjectFlags.ArrayLiteral | ObjectFlags.ContainsObjectOrArrayLiteral;
      }
      return literalType;
    }
    jsxAttributesTypeFromAttributesProperty(openingLikeElem: JsxOpeningLikeElem, checkMode: CheckMode | undefined) {
      const attributes = openingLikeElem.attributes;
      const allAttributesTable = strictNullChecks ? new SymbolTable() : undefined;
      let attributesTable = new SymbolTable();
      let spread: Type = emptyJsxObjectType;
      let hasSpreadAnyType = false;
      let typeToIntersect: Type | undefined;
      let explicitlySpecifyChildrenAttribute = false;
      let objectFlags: ObjectFlags = ObjectFlags.JsxAttributes;
      const jsxChildrenPropertyName = getJsxElemChildrenPropertyName(getJsxNamespaceAt(openingLikeElem));
      for (const attributeDecl of attributes.properties) {
        const member = attributeDecl.symbol;
        if (attributeDecl.kind === Syntax.JsxAttribute) {
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
            spread = getSpreadType(spread, this.jsxAttributesType(), attributes.symbol, objectFlags, false);
            attributesTable = new SymbolTable();
          }
          const exprType = getReducedType(check.expressionCached(attributeDecl.expression, checkMode));
          if (qf.is.typeAny(exprType)) hasSpreadAnyType = true;
          if (qf.is.validSpreadType(exprType)) {
            spread = getSpreadType(spread, exprType, attributes.symbol, objectFlags, false);
            if (allAttributesTable) check.spreadPropOverrides(exprType, allAttributesTable, attributeDecl);
          } else {
            typeToIntersect = typeToIntersect ? getIntersectionType([typeToIntersect, exprType]) : exprType;
          }
        }
      }
      if (!hasSpreadAnyType) {
        if (attributesTable.size > 0) spread = getSpreadType(spread, this.jsxAttributesType(), attributes.symbol, objectFlags, false);
      }
      const parent = openingLikeElem.parent.kind === Syntax.JsxElem ? (openingLikeElem.parent as JsxElem) : undefined;
      if (parent && parent.openingElem === openingLikeElem && parent.children.length > 0) {
        const childrenTypes: Type[] = check.jsxChildren(parent, checkMode);
        if (!hasSpreadAnyType && jsxChildrenPropertyName && jsxChildrenPropertyName !== '') {
          if (explicitlySpecifyChildrenAttribute) error(attributes, qd.msgs._0_are_specified_twice_The_attribute_named_0_will_be_overwritten, qy.get.unescUnderscores(jsxChildrenPropertyName));
          const contextualType = getApparentTypeOfContextualType(openingLikeElem.attributes);
          const childrenContextualType = contextualType && getTypeOfPropertyOfContextualType(contextualType, jsxChildrenPropertyName);
          const childrenPropSymbol = new Symbol(SymbolFlags.Property | qt.SymbolFlags.Transient, jsxChildrenPropertyName);
          childrenPropSymbol.type =
            childrenTypes.length === 1 ? childrenTypes[0] : getArrayLiteralTupleTypeIfApplicable(childrenTypes, childrenContextualType, false) || this.arrayType(qf.get.unionType(childrenTypes));
          childrenPropSymbol.valueDeclaration = PropertySignature.create(undefined, qy.get.unescUnderscores(jsxChildrenPropertyName), undefined, undefined, undefined);
          childrenPropSymbol.valueDeclaration.parent = attributes;
          childrenPropSymbol.valueDeclaration.symbol = childrenPropSymbol;
          const childPropMap = new SymbolTable();
          childPropMap.set(jsxChildrenPropertyName, childrenPropSymbol);
          spread = getSpreadType(spread, this.anonymousType(attributes.symbol, childPropMap, empty, empty, undefined), attributes.symbol, objectFlags, false);
        }
      }
      if (hasSpreadAnyType) return anyType;
      if (typeToIntersect && spread !== emptyJsxObjectType) return getIntersectionType([typeToIntersect, spread]);
      return typeToIntersect || (spread === emptyJsxObjectType ? this.jsxAttributesType() : spread);
      function createJsxAttributesType() {
        objectFlags |= freshObjectLiteralFlag;
        const result = this.anonymousType(attributes.symbol, attributesTable, empty, empty, undefined);
        result.objectFlags |= objectFlags | ObjectFlags.ObjectLiteral | ObjectFlags.ContainsObjectOrArrayLiteral;
        return result;
      }
    }
    syntheticExpression(parent: Node, type: Type, isSpread?: boolean, tupleNameSource?: ParameterDeclaration | NamedTupleMember) {
      const result = <SyntheticExpression>this.node(Syntax.SyntheticExpression, parent.pos, parent.end);
      result.parent = parent;
      result.type = type;
      result.isSpread = isSpread || false;
      result.tupleNameSource = tupleNameSource;
      return result;
    }
    unionOfSignaturesForOverloadFailure(candidates: readonly Signature[]): Signature {
      const thisParameters = mapDefined(candidates, (c) => c.thisParameter);
      let thisParameter: Symbol | undefined;
      if (thisParameters.length) thisParameter = this.combinedSymbolFromTypes(thisParameters, thisParameters.map(getTypeOfParameter));
      const { min: minArgumentCount, max: maxNonRestParam } = minAndMax(candidates, getNumNonRestParameters);
      const parameters: Symbol[] = [];
      for (let i = 0; i < maxNonRestParam; i++) {
        const symbols = mapDefined(candidates, (s) =>
          signatureHasRestParameter(s) ? (i < s.parameters.length - 1 ? s.parameters[i] : last(s.parameters)) : i < s.parameters.length ? s.parameters[i] : undefined
        );
        assert(symbols.length !== 0);
        parameters.push(
          this.combinedSymbolFromTypes(
            symbols,
            mapDefined(candidates, (candidate) => tryGetTypeAtPosition(candidate, i))
          )
        );
      }
      const restParameterSymbols = mapDefined(candidates, (c) => (signatureHasRestParameter(c) ? last(c.parameters) : undefined));
      let flags = SignatureFlags.None;
      if (restParameterSymbols.length !== 0) {
        const type = this.arrayType(qf.get.unionType(mapDefined(candidates, tryGetRestTypeOfSignature), UnionReduction.Subtype));
        parameters.push(this.combinedSymbolForOverloadFailure(restParameterSymbols, type));
        flags |= SignatureFlags.HasRestParameter;
      }
      if (candidates.some(signatureHasLiteralTypes)) flags |= SignatureFlags.HasLiteralTypes;
      return this.signature(candidates[0].declaration, undefined, thisParameter, parameters, getIntersectionType(candidates.map(getReturnTypeOfSignature)), undefined, minArgumentCount, flags);
    }
    combinedSymbolFromTypes(sources: readonly Symbol[], types: Type[]): Symbol {
      return this.combinedSymbolForOverloadFailure(sources, qf.get.unionType(types, UnionReduction.Subtype));
    }
    combinedSymbolForOverloadFailure(sources: readonly Symbol[], type: Type): Symbol {
      return this.symbolWithType(first(sources), type);
    }
    signatureForJSXIntrinsic(node: JsxOpeningLikeElem, result: Type): Signature {
      const namespace = getJsxNamespaceAt(node);
      const exports = namespace && namespace.getExportsOfSymbol();
      const typeSymbol = exports && getSymbol(exports, JsxNames.Elem, qt.SymbolFlags.Type);
      const returnNode = typeSymbol && nodeBuilder.symbolToEntityName(typeSymbol, qt.SymbolFlags.Type, node);
      const declaration = FunctionTyping.create(
        undefined,
        [new qc.ParameterDeclaration(undefined, undefined, undefined, 'props', undefined, nodeBuilder.typeToTypeNode(result, node))],
        returnNode ? TypingReference.create(returnNode, undefined) : new qc.KeywordTyping(Syntax.AnyKeyword)
      );
      const parameterSymbol = new Symbol(SymbolFlags.FunctionScopedVariable, 'props' as qu.__String);
      parameterSymbol.type = result;
      return this.signature(declaration, undefined, undefined, [parameterSymbol], typeSymbol ? getDeclaredTypeOfSymbol(typeSymbol) : errorType, undefined, 1, SignatureFlags.None);
    }
    promiseType(promisedType: Type): Type {
      const globalPromiseType = getGlobalPromiseType(true);
      if (globalPromiseType !== emptyGenericType) {
        promisedType = getAwaitedType(promisedType) || unknownType;
        return this.typeReference(globalPromiseType, [promisedType]);
      }
      return unknownType;
    }
    promiseLikeType(promisedType: Type): Type {
      const globalPromiseLikeType = getGlobalPromiseLikeType(true);
      if (globalPromiseLikeType !== emptyGenericType) {
        promisedType = getAwaitedType(promisedType) || unknownType;
        return this.typeReference(globalPromiseLikeType, [promisedType]);
      }
      return unknownType;
    }
    promiseReturnType(func: FunctionLikeDeclaration | ImportCall, promisedType: Type) {
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
    generatorReturnType(yieldType: Type, returnType: Type, nextType: Type, isAsyncGenerator: boolean) {
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
    iterationTypes(yieldType: Type = neverType, returnType: Type = neverType, nextType: Type = unknownType): IterationTypes {
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
      declarationIn: AccessorDeclaration | VariableLikeDeclaration | PropertyAccessExpression,
      enclosingDeclaration: Node,
      flags: NodeBuilderFlags,
      tracker: SymbolTracker,
      addUndefined?: boolean
    ) {
      const declaration = qf.get.parseTreeOf(declarationIn, isVariableLikeOrAccessor);
      if (!declaration) return new Token(Syntax.AnyKeyword) as KeywordTyping;
      const symbol = getSymbolOfNode(declaration);
      let type = symbol && !(symbol.flags & (SymbolFlags.TypeLiteral | qt.SymbolFlags.Signature)) ? getWidenedLiteralType(this.qf.get.typeOfSymbol()) : errorType;
      if (type.flags & qt.TypeFlags.UniqueESSymbol && type.symbol === symbol) flags |= NodeBuilderFlags.AllowUniqueESSymbolType;
      if (addUndefined) type = getOptionalType(type);
      return nodeBuilder.typeToTypeNode(type, enclosingDeclaration, flags | NodeBuilderFlags.MultilineObjectLiterals, tracker);
    }
    returnTypeOfSignatureDeclaration(signatureDeclarationIn: SignatureDeclaration, enclosingDeclaration: Node, flags: NodeBuilderFlags, tracker: SymbolTracker) {
      const signatureDeclaration = qf.get.parseTreeOf(signatureDeclarationIn, isFunctionLike);
      if (!signatureDeclaration) return new Token(Syntax.AnyKeyword) as KeywordTyping;
      const signature = getSignatureFromDeclaration(signatureDeclaration);
      return nodeBuilder.typeToTypeNode(getReturnTypeOfSignature(signature), enclosingDeclaration, flags | NodeBuilderFlags.MultilineObjectLiterals, tracker);
    }
    typeOfExpression(exprIn: Expression, enclosingDeclaration: Node, flags: NodeBuilderFlags, tracker: SymbolTracker) {
      const expr = qf.get.parseTreeOf(exprIn, isExpression);
      if (!expr) return new Token(Syntax.AnyKeyword) as KeywordTyping;
      const type = getWidenedType(getRegularTypeOfExpression(expr));
      return nodeBuilder.typeToTypeNode(type, enclosingDeclaration, flags | NodeBuilderFlags.MultilineObjectLiterals, tracker);
    }
    literalConstValue(node: VariableDeclaration | PropertyDeclaration | PropertySignature | ParameterDeclaration, tracker: SymbolTracker) {
      const type = qf.get.typeOfSymbol(getSymbolOfNode(node));
      return literalTypeToNode(<FreshableType>type, node, tracker);
    }
    resolver(): EmitResolver {
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
        isReferencedAliasDeclaration: (node, checkChildren?) => {
          node = qf.get.parseTreeOf(node);
          return node ? isReferencedAliasDeclaration(node, checkChildren) : true;
        },
        getNodeCheckFlags: (node) => {
          node = qf.get.parseTreeOf(node);
          return node ? getNodeCheckFlags(node) : 0;
        },
        isTopLevelValueImportEqualsWithEntityName,
        qf.is.declarationVisible,
        isImplementationOfOverload,
        isRequiredInitializedParameter,
        isOptionalUninitializedParameterProperty,
        isExpandoFunctionDeclaration,
        getPropertiesOfContainerFunction,
        //this.typeOfDeclaration,
        //this.returnTypeOfSignatureDeclaration,
        //this.typeOfExpression,
        //this.literalConstValue,
        isSymbolAccessible,
        isEntityNameVisible,
        getConstantValue: (nodeIn) => {
          const node = qf.get.parseTreeOf(nodeIn, canHaveConstantValue);
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
        isLateBound: (nodeIn: Declaration): nodeIn is LateBoundDecl => {
          const node = qf.get.parseTreeOf(nodeIn, isDeclaration);
          const symbol = node && getSymbolOfNode(node);
          return !!(symbol && this.getCheckFlags() & qt.CheckFlags.Late);
        },
        getJsxFactoryEntity,
        qf.get.allAccessorDeclarations(accessor: AccessorDeclaration): AllAccessorDeclarations {
          accessor = qf.get.parseTreeOf(accessor, qf.is.getOrSetKind)!;
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
        getSymbolOfExternalModuleSpecifier: (moduleName) => qf.resolve.externalModuleNameWorker(moduleName, moduleName, undefined),
        isBindingCapturedByNode: (node, decl) => {
          const parseNode = qf.get.parseTreeOf(node);
          const parseDecl = qf.get.parseTreeOf(decl);
          return !!parseNode && !!parseDecl && (parseDecl.kind === Syntax.VariableDeclaration || parseDecl.kind === Syntax.BindingElem) && isBindingCapturedByNode(parseNode, parseDecl);
        },
        getDeclarationStmtsForSourceFile: (node, flags, tracker, bundled) => {
          const n = qf.get.parseTreeOf(node) as SourceFile;
          assert(n && n.kind === Syntax.SourceFile, 'Non-sourcefile node passed into getDeclarationsForSourceFile');
          const sym = getSymbolOfNode(node);
          if (!sym) return !node.locals ? [] : nodeBuilder.symbolTableToDeclarationStmts(node.locals, node, flags, tracker, bundled);
          return !sym.exports ? [] : nodeBuilder.symbolTableToDeclarationStmts(sym.exports, node, flags, tracker, bundled);
        },
        isImportRequiredByAugmentation,
      };
      function isImportRequiredByAugmentation(node: ImportDeclaration) {
        const file = node.sourceFile;
        if (!file.symbol) return false;
        const importTarget = getExternalModuleFileFromDeclaration(node);
        if (!importTarget) return false;
        if (importTarget === file) return false;
        const exports = getExportsOfModule(file.symbol);
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
      function isInHeritageClause(node: PropertyAccessEntityNameExpression) {
        return node.parent && node.parent.kind === Syntax.ExpressionWithTypings && node.parent.parent && node.parent.parent.kind === Syntax.HeritageClause;
      }
      function getTypeReferenceDirectivesForEntityName(node: EntityNameOrEntityNameExpression): string[] | undefined {
        if (!fileToDirective) return;
        let meaning = qt.SymbolFlags.Type | qt.SymbolFlags.Namespace;
        if ((node.kind === Syntax.Identifier && isInTypeQuery(node)) || (node.kind === Syntax.PropertyAccessExpression && !isInHeritageClause(node)))
          meaning = qt.SymbolFlags.Value | qt.SymbolFlags.ExportValue;
        const symbol = qf.resolve.entityName(node, meaning, true);
        return symbol && symbol !== unknownSymbol ? getTypeReferenceDirectivesForSymbol(symbol, meaning) : undefined;
      }
      function addReferencedFilesToTypeDirective(file: SourceFile, key: string) {
        if (fileToDirective.has(file.path)) return;
        fileToDirective.set(file.path, key);
        for (const { fileName } of file.referencedFiles) {
          const resolvedFile = qf.resolve.tripleslashReference(fileName, file.originalFileName);
          const referencedFile = host.getSourceFile(resolvedFile);
          if (referencedFile) addReferencedFilesToTypeDirective(referencedFile, key);
        }
      }
    }
    makeUnaryTypeMapper(source: Type, target: Type): TypeMapper {
      return { kind: TypeMapKind.Simple, source, target };
    }
    makeArrayTypeMapper(sources: readonly TypeParameter[], targets: readonly Type[] | undefined): TypeMapper {
      return { kind: TypeMapKind.Array, sources, targets };
    }
    makeFunctionTypeMapper(func: (t: Type) => Type): TypeMapper {
      return { kind: TypeMapKind.Function, func };
    }
    makeCompositeTypeMapper(kind: TypeMapKind.Composite | TypeMapKind.Merged, mapper1: TypeMapper, mapper2: TypeMapper): TypeMapper {
      return { kind, mapper1, mapper2 };
    }
  }
  return (qf.create = new Tcreate());
}
export interface Tcreate extends ReturnType<typeof newCreate> {}
export function newInstantiate(f: qt.Frame) {
  const qf = f as Frame;
  return (qf.instantiate = new (class {
    list<T>(items: readonly T[], mapper: TypeMapper, instantiator: (item: T, mapper: TypeMapper) => T): readonly T[];
    list<T>(items: readonly T[] | undefined, mapper: TypeMapper, instantiator: (item: T, mapper: TypeMapper) => T): readonly T[] | undefined;
    list<T>(items: readonly T[] | undefined, mapper: TypeMapper, instantiator: (item: T, mapper: TypeMapper) => T): readonly T[] | undefined {
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
    types(types: readonly Type[], mapper: TypeMapper): readonly Type[];
    types(types: readonly Type[] | undefined, mapper: TypeMapper): readonly Type[] | undefined;
    types(types: readonly Type[] | undefined, mapper: TypeMapper): readonly Type[] | undefined {
      return this.list<Type>(types, mapper, this.type);
    }
    signatures(signatures: readonly Signature[], mapper: TypeMapper): readonly Signature[] {
      return this.list<Signature>(signatures, mapper, this.signature);
    }
    typePredicate(predicate: TypePredicate, mapper: TypeMapper): TypePredicate {
      return qf.create.typePredicate(predicate.kind, predicate.parameterName, predicate.parameterIndex, this.type(predicate.type, mapper));
    }
    signature(signature: Signature, mapper: TypeMapper, eraseTypeParameters?: boolean): Signature {
      let freshTypeParameters: TypeParameter[] | undefined;
      if (signature.typeParameters && !eraseTypeParameters) {
        freshTypeParameters = map(signature.typeParameters, cloneTypeParameter);
        mapper = combineTypeMappers(qf.create.typeMapper(signature.typeParameters, freshTypeParameters), mapper);
        for (const tp of freshTypeParameters) {
          tp.mapper = mapper;
        }
      }
      const result = qf.create.signature(
        signature.declaration,
        freshTypeParameters,
        signature.thisParameter && this.symbol(signature.thisParameter, mapper),
        this.list(signature.parameters, mapper, this.symbol),
        undefined,
        undefined,
        signature.minArgumentCount,
        signature.flags & SignatureFlags.PropagatingFlags
      );
      result.target = signature;
      result.mapper = mapper;
      return result;
    }
    symbol(symbol: Symbol, mapper: TypeMapper): Symbol {
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
    mappedType(type: MappedType, mapper: TypeMapper): Type {
      const typeVariable = getHomomorphicTypeVariable(type);
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
    mappedArrayType(arrayType: Type, mappedType: MappedType, mapper: TypeMapper) {
      const elemType = this.mappedTypeTemplate(mappedType, numberType, true, mapper);
      return elemType === errorType ? errorType : qf.create.arrayType(elemType, getModifiedReadonlyState(qf.is.readonlyArrayType(arrayType), getMappedTypeModifiers(mappedType)));
    }
    mappedTupleType(tupleType: TupleTypeReference, mappedType: MappedType, mapper: TypeMapper) {
      const minLength = tupleType.target.minLength;
      const elemTypes = map(getTypeArguments(tupleType), (_, i) => this.mappedTypeTemplate(mappedType, getLiteralType('' + i), i >= minLength, mapper));
      const modifiers = getMappedTypeModifiers(mappedType);
      const newMinLength =
        modifiers & MappedTypeModifiers.IncludeOptional
          ? 0
          : modifiers & MappedTypeModifiers.ExcludeOptional
          ? getTypeReferenceArity(tupleType) - (tupleType.target.hasRestElem ? 1 : 0)
          : minLength;
      const newReadonly = getModifiedReadonlyState(tupleType.target.readonly, modifiers);
      return contains(elemTypes, errorType) ? errorType : qf.create.tupleType(elemTypes, newMinLength, tupleType.target.hasRestElem, newReadonly, tupleType.target.labeledElemDeclarations);
    }
    mappedTypeTemplate(type: MappedType, key: Type, isOptional: boolean, mapper: TypeMapper) {
      const templateMapper = appendTypeMapping(mapper, getTypeParameterFromMappedType(type), key);
      const propType = this.type(getTemplateTypeFromMappedType(<MappedType>type.target || type), templateMapper);
      const modifiers = getMappedTypeModifiers(type);
      return strictNullChecks && modifiers & MappedTypeModifiers.IncludeOptional && !maybeTypeOfKind(propType, qt.TypeFlags.Undefined | qt.TypeFlags.Void)
        ? getOptionalType(propType)
        : strictNullChecks && modifiers & MappedTypeModifiers.ExcludeOptional && isOptional
        ? getTypeWithFacts(propType, TypeFacts.NEUndefined)
        : propType;
    }
    anonymousType(type: AnonymousType, mapper: TypeMapper): AnonymousType {
      const result = <AnonymousType>qf.create.objectType(type.objectFlags | ObjectFlags.Instantiated, type.symbol);
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
      result.aliasTypeArguments = this.types(type.aliasTypeArguments, mapper);
      return result;
    }
    conditionalType(root: ConditionalRoot, mapper: TypeMapper): Type {
      if (root.isDistributive) {
        const checkType = <TypeParameter>root.checkType;
        const instantiatedType = getMappedType(checkType, mapper);
        if (checkType !== instantiatedType && instantiatedType.flags & (TypeFlags.Union | qt.TypeFlags.Never))
          return mapType(instantiatedType, (t) => getConditionalType(root, prependTypeMapping(checkType, t, mapper)));
      }
      return getConditionalType(root, mapper);
    }
    type(type: Type, mapper: TypeMapper | undefined): Type;
    type(type: Type | undefined, mapper: TypeMapper | undefined): Type | undefined;
    type(type: Type | undefined, mapper: TypeMapper | undefined): Type | undefined {
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
    typeWithoutDepthIncrease(type: Type, mapper: TypeMapper | undefined) {
      instantiationDepth--;
      const result = this.type(type, mapper);
      instantiationDepth++;
      return result;
    }
    typeWorker(type: Type, mapper: TypeMapper): Type {
      const flags = type.flags;
      if (flags & qt.TypeFlags.TypeParameter) return getMappedType(type, mapper);
      if (flags & qt.TypeFlags.Object) {
        const objectFlags = (<ObjectType>type).objectFlags;
        if (objectFlags & (ObjectFlags.Reference | ObjectFlags.Anonymous | ObjectFlags.Mapped)) {
          if (objectFlags & ObjectFlags.Reference && !(<TypeReference>type).node) {
            const resolvedTypeArguments = (<TypeReference>type).resolvedTypeArguments;
            const newTypeArguments = this.types(resolvedTypeArguments, mapper);
            return newTypeArguments !== resolvedTypeArguments ? qf.create.typeReference((<TypeReference>type).target, newTypeArguments) : type;
          }
          return getObjectTypeInstantiation(<TypeReference | AnonymousType | MappedType>type, mapper);
        }
        return type;
      }
      if (flags & qt.TypeFlags.UnionOrIntersection) {
        const types = (<UnionOrIntersectionType>type).types;
        const newTypes = this.types(types, mapper);
        return newTypes === types
          ? type
          : flags & qt.TypeFlags.Intersection
          ? getIntersectionType(newTypes, type.aliasSymbol, this.types(type.aliasTypeArguments, mapper))
          : qf.get.unionType(newTypes, UnionReduction.Literal, type.aliasSymbol, this.types(type.aliasTypeArguments, mapper));
      }
      if (flags & qt.TypeFlags.Index) return getIndexType(this.type((<IndexType>type).type, mapper));
      if (flags & qt.TypeFlags.IndexedAccess) return getIndexedAccessType(this.type((<IndexedAccessType>type).objectType, mapper), this.type((<IndexedAccessType>type).indexType, mapper));
      if (flags & qt.TypeFlags.Conditional) return getConditionalTypeInstantiation(<ConditionalType>type, combineTypeMappers((<ConditionalType>type).mapper, mapper));
      if (flags & qt.TypeFlags.Substitution) {
        const maybeVariable = this.type((<SubstitutionType>type).baseType, mapper);
        if (maybeVariable.flags & qt.TypeFlags.TypeVariable) return getSubstitutionType(maybeVariable as TypeVariable, this.type((<SubstitutionType>type).substitute, mapper));
        else {
          const sub = this.type((<SubstitutionType>type).substitute, mapper);
          if (sub.flags & qt.TypeFlags.AnyOrUnknown || qf.is.typeAssignableTo(getRestrictiveInstantiation(maybeVariable), getRestrictiveInstantiation(sub))) return maybeVariable;
          return sub;
        }
      }
      return type;
    }
    indexInfo(info: IndexInfo | undefined, mapper: TypeMapper): IndexInfo | undefined {
      return info && qf.create.indexInfo(this.type(info.type, mapper), info.isReadonly, info.declaration);
    }
    contextualType(contextualType: Type | undefined, node: Node, contextFlags?: ContextFlags): Type | undefined {
      if (contextualType && maybeTypeOfKind(contextualType, qt.TypeFlags.Instantiable)) {
        const inferenceContext = getInferenceContext(node);
        if (inferenceContext && some(inferenceContext.inferences, hasInferenceCandidates)) {
          if (contextFlags && contextFlags & ContextFlags.Signature) return this.instantiableTypes(contextualType, inferenceContext.nonFixingMapper);
          if (inferenceContext.returnMapper) return this.instantiableTypes(contextualType, inferenceContext.returnMapper);
        }
      }
      return contextualType;
    }
    instantiableTypes(type: Type, mapper: TypeMapper): Type {
      if (type.flags & qt.TypeFlags.Instantiable) return this.type(type, mapper);
      if (type.flags & qt.TypeFlags.Union) {
        return qf.get.unionType(
          map((<UnionType>type).types, (t) => this.instantiableTypes(t, mapper)),
          UnionReduction.None
        );
      }
      if (type.flags & qt.TypeFlags.Intersection) return getIntersectionType(map((<IntersectionType>type).types, (t) => this.instantiableTypes(t, mapper)));
      return type;
    }
    signatureInContextOf(signature: Signature, contextualSignature: Signature, inferenceContext?: InferenceContext, compareTypes?: TypeComparer): Signature {
      const context = qf.create.inferenceContext(signature.typeParameters!, signature, InferenceFlags.None, compareTypes);
      const restType = getEffectiveRestType(contextualSignature);
      const mapper = inferenceContext && (restType && restType.flags & qt.TypeFlags.TypeParameter ? inferenceContext.nonFixingMapper : inferenceContext.mapper);
      const sourceSignature = mapper ? this.signature(contextualSignature, mapper) : contextualSignature;
      applyToParameterTypes(sourceSignature, signature, (source, target) => {
        inferTypes(context.inferences, source, target);
      });
      if (!inferenceContext) {
        applyToReturnTypes(contextualSignature, signature, (source, target) => {
          inferTypes(context.inferences, source, target, InferencePriority.ReturnType);
        });
      }
      return getSignatureInstantiation(signature, getInferredTypes(context), qf.is.inJSFile(contextualSignature.declaration));
    }
    typeWithSingleGenericCallSignature(node: Expression | MethodDeclaration | QualifiedName, type: Type, checkMode?: CheckMode) {
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
                const inferences = map(context.inferences, (info) => qf.create.inferenceInfo(info.typeParameter));
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
              return getOrCreateTypeFromSignature(this.signatureInContextOf(signature, contextualSignature, context));
            }
          }
        }
      }
      return type;
    }
  })());
}
export interface Tinstantiate extends ReturnType<typeof newInstantiate> {}
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
    ): Symbol | undefined {
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
    ): Symbol | undefined {
      const originalLocation = location;
      let result: Symbol | undefined;
      let lastLocation: Node | undefined;
      let lastSelfReferenceLocation: Node | undefined;
      let propertyWithInvalidIniter: Node | undefined;
      let associatedDeclarationForContainingIniterOrBindingName: ParameterDeclaration | BindingElem | undefined;
      let withinDeferredContext = false;
      const errorLocation = location;
      let grandparent: Node;
      let isInExternalModule = false;
      loop: while (location) {
        if (location.locals && !qf.is.globalSourceFile(location)) {
          if ((result = lookup(location.locals, name, meaning))) {
            let useResult = true;
            if (qf.is.functionLike(location) && lastLocation && lastLocation !== (<FunctionLikeDeclaration>location).body) {
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
            } else if (location.kind === Syntax.ConditionalTyping) {
              useResult = lastLocation === (<ConditionalTyping>location).trueType;
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
            if (!qf.is.externalOrCommonJsModule(<SourceFile>location)) break;
            isInExternalModule = true;
          case Syntax.ModuleDeclaration:
            const moduleExports = getSymbolOfNode(location as SourceFile | ModuleDeclaration).exports || emptySymbols;
            if (location.kind === Syntax.SourceFile || (location.kind === Syntax.ModuleDeclaration && location.flags & NodeFlags.Ambient && !qf.is.globalScopeAugmentation(location))) {
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
              if (location.kind === Syntax.SourceFile && location.commonJsModuleIndicator && !result.declarations.some(isDocTypeAlias)) result = undefined;
              else {
                break loop;
              }
            }
            break;
          case Syntax.EnumDeclaration:
            if ((result = lookup(getSymbolOfNode(location)!.exports!, name, meaning & qt.SymbolFlags.EnumMember))) break loop;
            break;
          case Syntax.PropertyDeclaration:
            if (!qf.has.syntacticModifier(location, ModifierFlags.Static)) {
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
              if (lastLocation && qf.has.syntacticModifier(lastLocation, ModifierFlags.Static)) {
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
          case Syntax.ExpressionWithTypings:
            if (lastLocation === (<ExpressionWithTypings>location).expression && (<HeritageClause>location.parent).token === Syntax.ExtendsKeyword) {
              const container = location.parent.parent;
              if (qf.is.classLike(container) && (result = lookup(getSymbolOfNode(container).members!, name, meaning & qt.SymbolFlags.Type))) {
                if (nameNotFoundMessage) error(errorLocation, qd.msgs.Base_class_expressions_cannot_reference_class_type_parameters);
                return;
              }
            }
            break;
          case Syntax.ComputedPropertyName:
            grandparent = location.parent.parent;
            if (qf.is.classLike(grandparent) || grandparent.kind === Syntax.InterfaceDeclaration) {
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
            if (location.parent && (qf.is.classElem(location.parent) || location.parent.kind === Syntax.ClassDeclaration)) location = location.parent;
            break;
          case Syntax.DocTypedefTag:
          case Syntax.DocCallbackTag:
          case Syntax.DocEnumTag:
            location = qc.getDoc.host(location);
            break;
          case Syntax.Parameter:
            if (
              lastLocation &&
              (lastLocation === (location as ParameterDeclaration).initer || (lastLocation === (location as ParameterDeclaration).name && lastLocation.kind === Syntax.BindingPattern))
            ) {
              if (!associatedDeclarationForContainingIniterOrBindingName) associatedDeclarationForContainingIniterOrBindingName = location as ParameterDeclaration;
            }
            break;
          case Syntax.BindingElem:
            if (lastLocation && (lastLocation === (location as BindingElem).initer || (lastLocation === (location as BindingElem).name && lastLocation.kind === Syntax.BindingPattern))) {
              const root = qf.get.rootDeclaration(location);
              if (root.kind === Syntax.Parameter) {
                if (!associatedDeclarationForContainingIniterOrBindingName) associatedDeclarationForContainingIniterOrBindingName = location as BindingElem;
              }
            }
            break;
        }
        if (qf.is.selfReferenceLocation(location)) lastSelfReferenceLocation = location;
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
            let suggestion: Symbol | undefined;
            if (suggestedNameNotFoundMessage && suggestionCount < maximumSuggestionCount) {
              suggestion = getSuggestedSymbolForNonexistentSymbol(originalLocation, name, meaning);
              if (suggestion) {
                const suggestionName = suggestion.symbolToString();
                const diagnostic = error(errorLocation, suggestedNameNotFoundMessage, diagnosticName(nameArg!), suggestionName);
                if (suggestion.valueDeclaration) addRelatedInfo(diagnostic, qf.create.diagnosticForNode(suggestion.valueDeclaration, qd.msgs._0_is_declared_here, suggestionName));
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
              !compilerOptions.allowUmdGlobalAccess,
              errorLocation!,
              qd.msgs._0_refers_to_a_UMD_global_but_the_current_file_is_a_module_Consider_adding_an_import_instead,
              qy.get.unescUnderscores(name)
            );
          }
        }
        if (result && associatedDeclarationForContainingIniterOrBindingName && !withinDeferredContext && (meaning & qt.SymbolFlags.Value) === qt.SymbolFlags.Value) {
          const candidate = qf.get.mergedSymbol(qf.get.lateBoundSymbol(result));
          const root = qf.get.rootDeclaration(associatedDeclarationForContainingIniterOrBindingName) as ParameterDeclaration;
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
    exportByName(moduleSymbol: Symbol, name: qu.__String, sourceNode: TypeOnlyCompatibleAliasDeclaration | undefined, dontResolveAlias: boolean) {
      const exportValue = moduleSymbol.exports!.get(InternalSymbol.ExportEquals);
      if (exportValue) return qf.get.propertyOfType(qf.get.typeOfSymbol(exportValue), name);
      const exportSymbol = moduleSymbol.exports!.get(name);
      const resolved = exportSymbol.resolve.symbol(dontResolveAlias);
      markSymbolOfAliasDeclarationIfTypeOnly(sourceNode, exportSymbol, resolved, false);
      return resolved;
    }
    entityName(name: EntityNameOrEntityNameExpression, meaning: qt.SymbolFlags, ignoreErrors?: boolean, dontResolveAlias?: boolean, location?: Node): Symbol | undefined {
      if (qf.is.missing(name)) return;
      const namespaceMeaning = qt.SymbolFlags.Namespace | (qf.is.inJSFile(name) ? meaning & qt.SymbolFlags.Value : 0);
      let symbol: Symbol | undefined;
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
            const moduleName = (namespace.valueDeclaration.initer as CallExpression).arguments[0] as StringLiteral;
            const moduleSym = this.externalModuleName(moduleName, moduleName);
            if (moduleSym) {
              const resolvedModuleSymbol = this.externalModuleSymbol(moduleSym);
              if (resolvedModuleSymbol) namespace = resolvedModuleSymbol;
            }
          }
        }
        symbol = qf.get.mergedSymbol(getSymbol(namespace.getExportsOfSymbol(), right.escapedText, meaning));
        if (!symbol) {
          if (!ignoreErrors) error(right, qd.msgs.Namespace_0_has_no_exported_member_1, getFullyQualifiedName(namespace), declarationNameToString(right));
          return;
        }
      } else throw qc.assert.never(name, 'Unknown entity name kind.');
      assert((this.getCheckFlags() & qt.CheckFlags.Instantiated) === 0, 'Should never get an instantiated symbol here.');
      if (!isSynthesized(name) && qf.is.entityName(name) && (symbol.flags & qt.SymbolFlags.Alias || name.parent.kind === Syntax.ExportAssignment))
        markSymbolOfAliasDeclarationIfTypeOnly(qf.get.aliasDeclarationFromName(name), symbol, undefined, true);
      return symbol.flags & meaning || dontResolveAlias ? symbol : symbol.resolve.alias();
    }
    entityNameFromAssignmentDeclaration(name: Identifier, meaning: qt.SymbolFlags) {
      if (isDocTypeReference(name.parent)) {
        const secondaryLocation = getAssignmentDeclarationLocation(name.parent);
        if (secondaryLocation) return this.name(secondaryLocation, name.escapedText, meaning, undefined, name, true);
      }
    }
    externalModuleName(location: Node, moduleReferenceExpression: Expression, ignoreErrors?: boolean): Symbol | undefined {
      return this.externalModuleNameWorker(location, moduleReferenceExpression, ignoreErrors ? undefined : qd.msgs.Cannot_find_module_0_or_its_corresponding_type_declarations);
    }
    externalModuleNameWorker(location: Node, moduleReferenceExpression: Expression, moduleNotFoundError: qd.Message | undefined, isForAugmentation = false): Symbol | undefined {
      return qf.is.stringLiteralLike(moduleReferenceExpression)
        ? this.externalModule(location, moduleReferenceExpression.text, moduleNotFoundError, moduleReferenceExpression, isForAugmentation)
        : undefined;
    }
    externalModule(location: Node, moduleReference: string, moduleNotFoundError: qd.Message | undefined, errorNode: Node, isForAugmentation = false): Symbol | undefined {
      if (startsWith(moduleReference, '@types/')) {
        const diag = qd.msgs.Cannot_import_type_declaration_files_Consider_importing_0_instead_of_1;
        const withoutAtTypePrefix = removePrefix(moduleReference, '@types/');
        error(errorNode, diag, withoutAtTypePrefix, moduleReference);
      }
      const ambientModule = tryFindAmbientModule(moduleReference, true);
      if (ambientModule) return ambientModule;
      const currentSourceFile = location.sourceFile;
      const resolvedModule = getResolvedModule(currentSourceFile, moduleReference)!;
      const resolutionDiagnostic = resolvedModule && getResolutionDiagnostic(compilerOptions, resolvedModule);
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
            !compilerOptions.resolve.jsonModule &&
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
    externalModuleSymbol(moduleSymbol: Symbol, dontResolveAlias?: boolean): Symbol;
    externalModuleSymbol(moduleSymbol: Symbol | undefined, dontResolveAlias?: boolean): Symbol | undefined;
    externalModuleSymbol(moduleSymbol: Symbol, dontResolveAlias?: boolean): Symbol {
      if (moduleSymbol?.exports) {
        const exportEquals = moduleSymbol.exports.get(InternalSymbol.ExportEquals)?.resolve.symbol(dontResolveAlias);
        const exported = getCommonJsExportEquals(qf.get.mergedSymbol(exportEquals), qf.get.mergedSymbol(moduleSymbol));
        return qf.get.mergedSymbol(exported) || moduleSymbol;
      }
      return undefined!;
    }
    eSModuleSymbol(moduleSymbol: Symbol | undefined, referencingLocation: Node, dontResolveAlias: boolean, suppressInteropError: boolean): Symbol | undefined {
      const symbol = this.externalModuleSymbol(moduleSymbol, dontResolveAlias);
      if (!dontResolveAlias && symbol) {
        if (!suppressInteropError && !(symbol.flags & (SymbolFlags.Module | qt.SymbolFlags.Variable)) && !getDeclarationOfKind(symbol, Syntax.SourceFile)) {
          const compilerOptionName = moduleKind >= ModuleKind.ES2015 ? 'allowSyntheticDefaultImports' : 'esModuleInterop';
          error(referencingLocation, qd.msgs.This_module_can_only_be_referenced_with_ECMAScript_imports_Slashexports_by_turning_on_the_0_flag_and_referencing_its_default_export, compilerOptionName);
          return symbol;
        }
        if (compilerOptions.esModuleInterop) {
          const referenceParent = referencingLocation.parent;
          if ((referenceParent.kind === Syntax.ImportDeclaration && qf.get.namespaceDeclarationNode(referenceParent)) || qf.is.importCall(referenceParent)) {
            const type = this.qf.get.typeOfSymbol();
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
              const resolvedModuleType = this.structuredTypeMembers(moduleType as StructuredType);
              result.type = qf.create.anonymousType(result, resolvedModuleType.members, empty, empty, resolvedModuleType.stringIndexInfo, resolvedModuleType.numberIndexInfo);
              return result;
            }
          }
        }
      }
      return symbol;
    }
    baseTypesOfClass(type: InterfaceType) {
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
      if (!qf.is.validBaseType(reducedBaseType)) {
        const elaboration = elaborateNeverIntersection(undefined, baseType);
        const diagnostic = chainqd.Messages(
          elaboration,
          qd.msgs.Base_constructor_return_type_0_is_not_an_object_type_or_intersection_of_object_types_with_statically_known_members,
          typeToString(reducedBaseType)
        );
        diagnostics.add(qf.create.diagnosticForNodeFromMessageChain(baseTypeNode.expression, diagnostic));
        return (type.resolvedBaseTypes = empty);
      }
      if (type === reducedBaseType || hasBaseType(reducedBaseType, type)) {
        error(type.symbol.valueDeclaration, qd.msgs.Type_0_recursively_references_itself_as_a_base_type, typeToString(type, undefined, TypeFormatFlags.WriteArrayAsGenericType));
        return (type.resolvedBaseTypes = empty);
      }
      if (type.resolvedBaseTypes === resolvingEmptyArray) type.members = undefined;
      return (type.resolvedBaseTypes = [reducedBaseType]);
    }
    baseTypesOfInterface(type: InterfaceType): void {
      type.resolvedBaseTypes = type.resolvedBaseTypes || empty;
      for (const declaration of type.symbol.declarations) {
        if (declaration.kind === Syntax.InterfaceDeclaration && qf.get.interfaceBaseTypeNodes(<InterfaceDeclaration>declaration)) {
          for (const node of qf.get.interfaceBaseTypeNodes(<InterfaceDeclaration>declaration)!) {
            const baseType = getReducedType(getTypeFromTypeNode(node));
            if (baseType !== errorType) {
              if (qf.is.validBaseType(baseType)) {
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
    declaredMembers(type: InterfaceType): InterfaceTypeWithDeclaredMembers {
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
    objectTypeMembers(type: ObjectType, source: InterfaceTypeWithDeclaredMembers, typeParameters: readonly TypeParameter[], typeArguments: readonly Type[]) {
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
        mapper = qf.create.typeMapper(typeParameters, typeArguments);
        members = qf.create.instantiatedSymbolTable(source.declaredProperties, mapper, typeParameters.length === 1);
        callSignatures = qf.instantiate.signatures(source.declaredCallSignatures, mapper);
        constructSignatures = qf.instantiate.signatures(source.declaredConstructSignatures, mapper);
        stringIndexInfo = qf.instantiate.indexInfo(source.declaredStringIndexInfo, mapper);
        numberIndexInfo = qf.instantiate.indexInfo(source.declaredNumberIndexInfo, mapper);
      }
      const baseTypes = getBaseTypes(source);
      if (baseTypes.length) {
        if (source.symbol && members === getMembersOfSymbol(source.symbol)) members = new SymbolTable(source.declaredProperties);
        setStructuredTypeMembers(type, members, callSignatures, constructSignatures, stringIndexInfo, numberIndexInfo);
        const thisArgument = lastOrUndefined(typeArguments);
        for (const baseType of baseTypes) {
          const instantiatedBaseType = thisArgument ? getTypeWithThisArgument(qf.instantiate.type(baseType, mapper), thisArgument) : baseType;
          addInheritedMembers(members, qf.get.propertiesOfType(instantiatedBaseType));
          callSignatures = concatenate(callSignatures, getSignaturesOfType(instantiatedBaseType, SignatureKind.Call));
          constructSignatures = concatenate(constructSignatures, getSignaturesOfType(instantiatedBaseType, SignatureKind.Construct));
          if (!stringIndexInfo) stringIndexInfo = instantiatedBaseType === anyType ? qf.create.indexInfo(anyType, false) : qf.get.indexInfoOfType(instantiatedBaseType, IndexKind.String);
          numberIndexInfo = numberIndexInfo || qf.get.indexInfoOfType(instantiatedBaseType, IndexKind.Number);
        }
      }
      setStructuredTypeMembers(type, members, callSignatures, constructSignatures, stringIndexInfo, numberIndexInfo);
    }
    classOrInterfaceMembers(type: InterfaceType): void {
      this.objectTypeMembers(type, this.declaredMembers(type), empty, empty);
    }
    typeReferenceMembers(type: TypeReference): void {
      const source = this.declaredMembers(type.target);
      const typeParameters = concatenate(source.typeParameters!, [source.thisType!]);
      const typeArguments = getTypeArguments(type);
      const paddedTypeArguments = typeArguments.length === typeParameters.length ? typeArguments : concatenate(typeArguments, [type]);
      this.objectTypeMembers(type, source, typeParameters, paddedTypeArguments);
    }
    unionTypeMembers(type: UnionType) {
      const callSignatures = getUnionSignatures(map(type.types, (t) => (t === globalFunctionType ? [unknownSignature] : getSignaturesOfType(t, SignatureKind.Call))));
      const constructSignatures = getUnionSignatures(map(type.types, (t) => getSignaturesOfType(t, SignatureKind.Construct)));
      const stringIndexInfo = getUnionIndexInfo(type.types, IndexKind.String);
      const numberIndexInfo = getUnionIndexInfo(type.types, IndexKind.Number);
      setStructuredTypeMembers(type, emptySymbols, callSignatures, constructSignatures, stringIndexInfo, numberIndexInfo);
    }
    intersectionTypeMembers(type: IntersectionType) {
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
        stringIndexInfo = intersectIndexInfos(stringIndexInfo, qf.get.indexInfoOfType(t, IndexKind.String));
        numberIndexInfo = intersectIndexInfos(numberIndexInfo, qf.get.indexInfoOfType(t, IndexKind.Number));
      }
      setStructuredTypeMembers(type, emptySymbols, callSignatures || empty, constructSignatures || empty, stringIndexInfo, numberIndexInfo);
    }
    anonymousTypeMembers(type: AnonymousType) {
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
            addInheritedMembers(members, qf.get.propertiesOfType(baseConstructorType));
          } else if (baseConstructorType === anyType) {
            stringIndexInfo = qf.create.indexInfo(anyType, false);
          }
        }
        const numberIndexInfo =
          symbol.flags & qt.SymbolFlags.Enum &&
          (getDeclaredTypeOfSymbol(symbol).flags & qt.TypeFlags.Enum || some(type.properties, (prop) => !!(qf.get.typeOfSymbol(prop).flags & qt.TypeFlags.NumberLike)))
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
                qf.is.jsConstructor(sig.declaration)
                  ? qf.create.signature(sig.declaration, sig.typeParameters, sig.thisParameter, sig.parameters, classType, undefined, sig.minArgumentCount, sig.flags & SignatureFlags.PropagatingFlags)
                  : undefined
              )
            );
          }
          if (!constructSignatures.length) constructSignatures = getDefaultConstructSignatures(classType);
          type.constructSignatures = constructSignatures;
        }
      }
    }
    reverseMappedTypeMembers(type: ReverseMappedType) {
      const indexInfo = qf.get.indexInfoOfType(type.source, IndexKind.String);
      const modifiers = getMappedTypeModifiers(type.mappedType);
      const readonlyMask = modifiers & MappedTypeModifiers.IncludeReadonly ? false : true;
      const optionalMask = modifiers & MappedTypeModifiers.IncludeOptional ? 0 : qt.SymbolFlags.Optional;
      const stringIndexInfo = indexInfo && qf.create.indexInfo(inferReverseMappedType(indexInfo.type, type.mappedType, type.constraintType), readonlyMask && indexInfo.isReadonly);
      const members = new SymbolTable();
      for (const prop of qf.get.propertiesOfType(type.source)) {
        const f = qt.CheckFlags.ReverseMapped | (readonlyMask && isReadonlySymbol(prop) ? qt.CheckFlags.Readonly : 0);
        const inferredProp = new Symbol(SymbolFlags.Property | (prop.flags & optionalMask), prop.escName, f) as ReverseMappedSymbol;
        inferredProp.declarations = prop.declarations;
        inferredProp.nameType = s.getLinks(prop).nameType;
        inferredProp.propertyType = qf.get.typeOfSymbol(prop);
        inferredProp.mappedType = type.mappedType;
        inferredProp.constraintType = type.constraintType;
        members.set(prop.escName, inferredProp);
      }
      setStructuredTypeMembers(type, members, empty, empty, stringIndexInfo, undefined);
    }
    mappedTypeMembers(type: MappedType) {
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
        for (const prop of qf.get.propertiesOfType(modifiersType)) {
          addMemberForKeyType(qf.get.literalTypeFromProperty(prop, include));
        }
        if (modifiersType.flags & qt.TypeFlags.Any || qf.get.indexInfoOfType(modifiersType, IndexKind.String)) addMemberForKeyType(stringType);
        if (!keyofStringsOnly && qf.get.indexInfoOfType(modifiersType, IndexKind.Number)) addMemberForKeyType(numberType);
      } else {
        forEachType(getLowerBoundOfKeyType(constraintType), addMemberForKeyType);
      }
      setStructuredTypeMembers(type, members, empty, empty, stringIndexInfo, numberIndexInfo);
      function addMemberForKeyType(t: Type) {
        const templateMapper = appendTypeMapping(type.mapper, typeParameter, t);
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
          const propType = qf.instantiate.type(templateType, templateMapper);
          if (t.flags & (TypeFlags.Any | qt.TypeFlags.String)) stringIndexInfo = qf.create.indexInfo(propType, !!(templateModifiers & MappedTypeModifiers.IncludeReadonly));
          else {
            numberIndexInfo = qf.create.indexInfo(numberIndexInfo ? qf.get.unionType([numberIndexInfo.type, propType]) : propType, !!(templateModifiers & MappedTypeModifiers.IncludeReadonly));
          }
        }
      }
    }
    structuredTypeMembers(type: StructuredType): ResolvedType {
      if (!(<ResolvedType>type).members) {
        if (type.flags & qt.TypeFlags.Object) {
          if ((<ObjectType>type).objectFlags & ObjectFlags.Reference) this.typeReferenceMembers(<TypeReference>type);
          else if ((<ObjectType>type).objectFlags & ObjectFlags.ClassOrInterface) this.classOrInterfaceMembers(<InterfaceType>type);
          else if ((<ReverseMappedType>type).objectFlags & ObjectFlags.ReverseMapped) this.reverseMappedTypeMembers(type as ReverseMappedType);
          else if ((<ObjectType>type).objectFlags & ObjectFlags.Anonymous) this.anonymousTypeMembers(<AnonymousType>type);
          else if ((<MappedType>type).objectFlags & ObjectFlags.Mapped) this.mappedTypeMembers(<MappedType>type);
        } else if (type.flags & qt.TypeFlags.Union) this.unionTypeMembers(<UnionType>type);
        else if (type.flags & qt.TypeFlags.Intersection) this.intersectionTypeMembers(<IntersectionType>type);
      }
      return <ResolvedType>type;
    }
    externalModuleTypeByLiteral(name: StringLiteral) {
      const moduleSym = this.externalModuleName(name, name);
      if (moduleSym) {
        const resolvedModuleSymbol = this.externalModuleSymbol(moduleSym);
        if (resolvedModuleSymbol) return qf.get.typeOfSymbol(resolvedModuleSymbol);
      }
      return anyType;
    }
    typeReferenceName(typeReferenceName: EntityNameExpression | EntityName | undefined, meaning: qt.SymbolFlags, ignoreErrors?: boolean) {
      if (!typeReferenceName) return unknownSymbol;
      return this.entityName(typeReferenceName, meaning, ignoreErrors) || unknownSymbol;
    }
    importSymbolType(node: ImportTyping, links: NodeLinks, symbol: Symbol, meaning: qt.SymbolFlags) {
      const resolvedSymbol = symbol.resolve.symbol();
      links.resolvedSymbol = resolvedSymbol;
      if (meaning === qt.SymbolFlags.Value) return this.qf.get.typeOfSymbol();
      return getTypeReferenceType(node, resolvedSymbol);
    }
    untypedCall(node: CallLikeExpression): Signature {
      if (callLikeExpressionMayHaveTypeArguments(node)) forEach(node.typeArguments, checkSourceElem);
      if (node.kind === Syntax.TaggedTemplateExpression) check.expression(node.template);
      else if (qc.isJsx.openingLikeElem(node)) {
        check.expression(node.attributes);
      } else if (node.kind !== Syntax.Decorator) {
        forEach((<CallExpression>node).arguments, (argument) => {
          check.expression(argument);
        });
      }
      return anySignature;
    }
    errorCall(node: CallLikeExpression): Signature {
      this.untypedCall(node);
      return unknownSignature;
    }
    call(
      node: CallLikeExpression,
      signatures: readonly Signature[],
      candidatesOutArray: Signature[] | undefined,
      checkMode: CheckMode,
      callChainFlags: SignatureFlags,
      fallbackError?: qd.Message
    ): Signature {
      const isTaggedTemplate = node.kind === Syntax.TaggedTemplateExpression;
      const isDecorator = node.kind === Syntax.Decorator;
      const isJsxOpeningOrSelfClosingElem = qc.isJsx.openingLikeElem(node);
      const reportErrors = !candidatesOutArray;
      let typeArguments: Nodes<Typing> | undefined;
      if (!isDecorator) {
        typeArguments = (<CallExpression>node).typeArguments;
        if (isTaggedTemplate || isJsxOpeningOrSelfClosingElem || (<CallExpression>node).expression.kind !== Syntax.SuperKeyword) forEach(typeArguments, checkSourceElem);
      }
      const candidates = candidatesOutArray || [];
      reorderCandidates(signatures, candidates, callChainFlags);
      if (!candidates.length) {
        if (reportErrors) diagnostics.add(getDiagnosticForCallNode(node, qd.msgs.Call_target_does_not_contain_any_signatures));
        return this.errorCall(node);
      }
      const args = getEffectiveCallArguments(node);
      const isSingleNonGenericCandidate = candidates.length === 1 && !candidates[0].typeParameters;
      let argCheckMode = !isDecorator && !isSingleNonGenericCandidate && some(args, qf.is.contextSensitive) ? CheckMode.SkipContextSensitive : CheckMode.Normal;
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
                if (last.declaration && candidatesForArgumentError.length > 3) addRelatedInfo(d, qf.create.diagnosticForNode(last.declaration, qd.msgs.The_last_overload_is_declared_here));
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
              diagnostics.add(qf.create.diagnosticForNodeFromMessageChain(node, chain, related));
            }
          }
        } else if (candidateForArgumentArityError) {
          diagnostics.add(getArgumentArityError(node, [candidateForArgumentArityError], args));
        } else if (candidateForTypeArgumentError) {
          check.typeArguments(candidateForTypeArgumentError, (node as CallExpression | TaggedTemplateExpression | JsxOpeningLikeElem).typeArguments!, true, fallbackError);
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
      function chooseOverload(candidates: Signature[], relation: qu.QMap<RelationComparisonResult>, signatureHelpTrailingComma = false) {
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
              inferenceContext = qf.create.inferenceContext(candidate.typeParameters, candidate, qf.is.inJSFile(node) ? InferenceFlags.AnyDefault : InferenceFlags.None);
              typeArgumentTypes = inferTypeArguments(node, candidate, args, argCheckMode | CheckMode.SkipGenericFunctions, inferenceContext);
              argCheckMode |= inferenceContext.flags & InferenceFlags.SkippedGenericFunction ? CheckMode.SkipGenericFunctions : CheckMode.Normal;
            }
            checkCandidate = getSignatureInstantiation(candidate, typeArgumentTypes, qf.is.inJSFile(candidate.declaration), inferenceContext && inferenceContext.inferredTypeParameters);
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
              checkCandidate = getSignatureInstantiation(candidate, typeArgumentTypes, qf.is.inJSFile(candidate.declaration), inferenceContext && inferenceContext.inferredTypeParameters);
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
    callExpression(node: CallExpression, candidatesOutArray: Signature[] | undefined, checkMode: CheckMode): Signature {
      if (node.expression.kind === Syntax.SuperKeyword) {
        const superType = check.superExpression(node.expression);
        if (qf.is.typeAny(superType)) {
          for (const arg of node.arguments) {
            check.expression(arg);
          }
          return anySignature;
        }
        if (superType !== errorType) {
          const baseTypeNode = qf.get.effectiveBaseTypeNode(qf.get.containingClass(node)!);
          if (baseTypeNode) {
            const baseConstructors = getInstantiatedConstructorsForTypeArguments(superType, baseTypeNode.typeArguments, baseTypeNode);
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
        if (funcType !== errorType && node.typeArguments) error(node, qd.msgs.Untyped_function_calls_may_not_accept_type_arguments);
        return this.untypedCall(node);
      }
      if (!callSignatures.length) {
        if (numConstructSignatures) error(node, qd.msgs.Value_of_type_0_is_not_callable_Did_you_mean_to_include_new, typeToString(funcType));
        else {
          let relatedInformation: qd.DiagnosticRelatedInformation | undefined;
          if (node.arguments.length === 1) {
            const text = node.sourceFile.text;
            if (qy.is.lineBreak(text.charCodeAt(qy.skipTrivia(text, node.expression.end, true) - 1)))
              relatedInformation = qf.create.diagnosticForNode(node.expression, qd.msgs.Are_you_missing_a_semicolon);
          }
          invocationError(node.expression, apparentType, SignatureKind.Call, relatedInformation);
        }
        return this.errorCall(node);
      }
      if (checkMode & CheckMode.SkipGenericFunctions && !node.typeArguments && callSignatures.some(isGenericFunctionReturningFunction)) {
        skippedGenericFunction(node, checkMode);
        return resolvingSignature;
      }
      if (callSignatures.some((sig) => qf.is.inJSFile(sig.declaration) && !!qc.getDoc.classTag(sig.declaration!))) {
        error(node, qd.msgs.Value_of_type_0_is_not_callable_Did_you_mean_to_include_new, typeToString(funcType));
        return this.errorCall(node);
      }
      return this.call(node, callSignatures, candidatesOutArray, checkMode, callChainFlags);
    }
    newExpression(node: NewExpression, candidatesOutArray: Signature[] | undefined, checkMode: CheckMode): Signature {
      let expressionType = check.nonNullExpression(node.expression);
      if (expressionType === silentNeverType) return silentNeverSignature;
      expressionType = getApparentType(expressionType);
      if (expressionType === errorType) return this.errorCall(node);
      if (qf.is.typeAny(expressionType)) {
        if (node.typeArguments) error(node, qd.msgs.Untyped_function_calls_may_not_accept_type_arguments);
        return this.untypedCall(node);
      }
      const constructSignatures = getSignaturesOfType(expressionType, SignatureKind.Construct);
      if (constructSignatures.length) {
        if (!isConstructorAccessible(node, constructSignatures[0])) return this.errorCall(node);
        const valueDecl = expressionType.symbol && getClassLikeDeclarationOfSymbol(expressionType.symbol);
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
          if (signature.declaration && !qf.is.jsConstructor(signature.declaration) && getReturnTypeOfSignature(signature) !== voidType)
            error(node, qd.msgs.Only_a_void_function_can_be_called_with_the_new_keyword);
          if (getThisTypeOfSignature(signature) === voidType) error(node, qd.msgs.A_function_that_is_called_with_the_new_keyword_cannot_have_a_this_type_that_is_void);
        }
        return signature;
      }
      invocationError(node.expression, expressionType, SignatureKind.Construct);
      return this.errorCall(node);
    }
    taggedTemplateExpression(node: TaggedTemplateExpression, candidatesOutArray: Signature[] | undefined, checkMode: CheckMode): Signature {
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
    decorator(node: Decorator, candidatesOutArray: Signature[] | undefined, checkMode: CheckMode): Signature {
      const funcType = check.expression(node.expression);
      const apparentType = getApparentType(funcType);
      if (apparentType === errorType) return this.errorCall(node);
      const callSignatures = getSignaturesOfType(apparentType, SignatureKind.Call);
      const numConstructSignatures = getSignaturesOfType(apparentType, SignatureKind.Construct).length;
      if (isUntypedFunctionCall(funcType, apparentType, callSignatures.length, numConstructSignatures)) return this.untypedCall(node);
      if (isPotentiallyUncalledDecorator(node, callSignatures)) {
        const nodeStr = qf.get.textOf(node.expression, false);
        error(node, qd.msgs._0_accepts_too_few_arguments_to_be_used_as_a_decorator_here_Did_you_mean_to_call_it_first_and_write_0, nodeStr);
        return this.errorCall(node);
      }
      const headMessage = getDiagnosticHeadMessageForDecoratorResolution(node);
      if (!callSignatures.length) {
        const errorDetails = invocationErrorDetails(node.expression, apparentType, SignatureKind.Call);
        const messageChain = chainqd.Messages(errorDetails.messageChain, headMessage);
        const diag = qf.create.diagnosticForNodeFromMessageChain(node.expression, messageChain);
        if (errorDetails.relatedMessage) addRelatedInfo(diag, qf.create.diagnosticForNode(node.expression, errorDetails.relatedMessage));
        diagnostics.add(diag);
        invocationErrorRecovery(apparentType, SignatureKind.Call, diag);
        return this.errorCall(node);
      }
      return this.call(node, callSignatures, candidatesOutArray, checkMode, SignatureFlags.None, headMessage);
    }
    jsxOpeningLikeElem(node: JsxOpeningLikeElem, candidatesOutArray: Signature[] | undefined, checkMode: CheckMode): Signature {
      if (isJsxIntrinsicIdentifier(node.tagName)) {
        const result = getIntrinsicAttributesTypeFromJsxOpeningLikeElem(node);
        const fakeSignature = qf.create.signatureForJSXIntrinsic(node, result);
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
      if (apparentType === errorType) return this.errorCall(node);
      const signatures = getUninstantiatedJsxSignaturesOfType(exprTypes, node);
      if (isUntypedFunctionCall(exprTypes, apparentType, signatures.length, 0)) return this.untypedCall(node);
      if (signatures.length === 0) {
        error(node.tagName, qd.msgs.JSX_elem_type_0_does_not_have_any_construct_or_call_signatures, qf.get.textOf(node.tagName));
        return this.errorCall(node);
      }
      return this.call(node, signatures, candidatesOutArray, checkMode, SignatureFlags.None);
    }
    signature(node: CallLikeExpression, candidatesOutArray: Signature[] | undefined, checkMode: CheckMode): Signature {
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
    helpersModule(node: SourceFile, errorNode: Node) {
      if (!externalHelpersModule)
        externalHelpersModule = this.externalModule(node, externalHelpersModuleNameText, qd.msgs.This_syntax_requires_an_imported_helper_but_module_0_cannot_be_found, errorNode) || unknownSymbol;
      return externalHelpersModule;
    }
  })());
}
export interface Tresolve extends ReturnType<typeof newResolve> {}
export function tryExtractTSExtension(fileName: string): string | undefined {
  return find(supportedTSExtensionsForExtractExtension, (extension) => fileExtensionIs(fileName, extension));
}
