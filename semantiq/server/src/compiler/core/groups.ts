import { CheckFlags, EmitFlags, FunctionFlags, ModifierFlags, NodeFlags, ObjectFlags, SymbolFlags, TrafoFlags, TypeFlags } from '../types';
import { Node, Nodes, Signature, Symbol, Type, TypeParam, TypeReference } from '../types';
import { qf, Fmake, Fget, Fhas, Fis } from './frame';
import { Syntax } from '../syntax';
import { Fvisit } from './visit';
import * as qb from './bases';
import * as qc from './classes';
import * as qt from '../types';
import * as qu from '../utils';
import * as qy from '../syntax';
export function newType(f: qt.Frame) {
  interface Frame extends qt.Frame {
    get: Fget;
    has: Fhas;
    is: Fis;
  }
  const qf = f as Frame;
  return (qf.type = new (class Base extends qb.Ftype {
    is = new (class extends Base {
      bbb() {
        if (this.aaa()) return true;
        this.has.ccc();
      }
      union(n: Type): n is qt.UnionType {
        return !!(n.flags & TypeFlags.Union);
      }
      setOfLiteralsFromSameEnum(ts: readonly Type[]) {
        const first = ts[0];
        if (first.flags & TypeFlags.EnumLiteral) {
          const e = getParentOfSymbol(first.symbol);
          for (let i = 1; i < ts.length; i++) {
            const t = ts[i];
            if (!(t.flags & TypeFlags.EnumLiteral) || e !== getParentOfSymbol(t.symbol)) return false;
          }
          return true;
        }
        return false;
      }
      functionType(t: Type) {
        return !!(t.flags & TypeFlags.Object) && getSignaturesOfType(t, qt.SignatureKind.Call).length > 0;
      }
      iteratorResult(t: Type, k: qt.IterationTypeKind.Yield | qt.IterationTypeKind.Return) {
        const d = qf.get.typeOfPropertyOfType(t, 'done' as qu.__String) || falseType;
        return qf.type.check.assignableTo(k === qt.IterationTypeKind.Yield ? falseType : trueType, d);
      }
      yieldIteratorResult(t: Type) {
        return isIteratorResult(t, qt.IterationTypeKind.Yield);
      }
      returnIteratorResult(t: Type) {
        return isIteratorResult(t, qt.IterationTypeKind.Return);
      }
      literalOfContextualType(t: Type, c?: Type) {
        if (c) {
          if (c.flags & TypeFlags.UnionOrIntersection) return qu.some(c.types, (t) => isLiteralOfContextualType(t, t));
          if (c.flags & TypeFlags.InstantiableNonPrimitive) {
            const b = qf.get.baseConstraintOfType(c) || unknownType;
            return (
              (maybeTypeOfKind(b, TypeFlags.String) && maybeTypeOfKind(t, TypeFlags.StringLiteral)) ||
              (maybeTypeOfKind(b, TypeFlags.Number) && maybeTypeOfKind(t, TypeFlags.NumberLiteral)) ||
              (maybeTypeOfKind(b, TypeFlags.BigInt) && maybeTypeOfKind(t, TypeFlags.BigIntLiteral)) ||
              (maybeTypeOfKind(b, TypeFlags.ESSymbol) && maybeTypeOfKind(t, TypeFlags.UniqueESSymbol)) ||
              isLiteralOfContextualType(t, b)
            );
          }
          return !!(
            (c.flags & (TypeFlags.StringLiteral | TypeFlags.Index) && maybeTypeOfKind(t, TypeFlags.StringLiteral)) ||
            (c.flags & TypeFlags.NumberLiteral && maybeTypeOfKind(t, TypeFlags.NumberLiteral)) ||
            (c.flags & TypeFlags.BigIntLiteral && maybeTypeOfKind(t, TypeFlags.BigIntLiteral)) ||
            (c.flags & TypeFlags.BooleanLiteral && maybeTypeOfKind(t, TypeFlags.BooleanLiteral)) ||
            (c.flags & TypeFlags.UniqueESSymbol && maybeTypeOfKind(t, TypeFlags.UniqueESSymbol))
          );
        }
        return false;
      }
      typeEqualityComparableTo(t: Type, to: Type) {
        return (to.flags & TypeFlags.Nullable) !== 0 || qf.type.is.comparableTo(t, to);
      }
      assignableToKind(t: Type, k: TypeFlags, strict?: boolean) {
        if (t.flags & k) return true;
        if (strict && t.flags & (TypeFlags.AnyOrUnknown | TypeFlags.Void | TypeFlags.Undefined | TypeFlags.Null)) return false;
        return (
          (!!(k & TypeFlags.NumberLike) && qf.type.check.assignableTo(t, numberType)) ||
          (!!(k & TypeFlags.BigIntLike) && qf.type.check.assignableTo(t, bigintType)) ||
          (!!(k & TypeFlags.StringLike) && qf.type.check.assignableTo(t, stringType)) ||
          (!!(k & TypeFlags.BooleanLike) && qf.type.check.assignableTo(t, booleanType)) ||
          (!!(k & TypeFlags.Void) && qf.type.check.assignableTo(t, voidType)) ||
          (!!(k & TypeFlags.Never) && qf.type.check.assignableTo(t, neverType)) ||
          (!!(k & TypeFlags.Null) && qf.type.check.assignableTo(t, nullType)) ||
          (!!(k & TypeFlags.Undefined) && qf.type.check.assignableTo(t, undefinedType)) ||
          (!!(k & TypeFlags.ESSymbol) && qf.type.check.assignableTo(t, esSymbolType)) ||
          (!!(k & TypeFlags.NonPrimitive) && qf.type.check.assignableTo(t, nonPrimitiveType))
        );
      }
      constEnumObjectType(t: Type) {
        return !!(t.objectFlags & ObjectFlags.Anonymous) && !!t.symbol && isConstEnumSymbol(t.symbol);
      }
      untypedFunctionCall(t: Type, apparentFuncType: Type, numCallSignatures: number, numConstructSignatures: number): boolean {
        return (
          this.any(t) ||
          (this.any(apparentFuncType) && !!(t.flags & TypeFlags.TypeParam)) ||
          (!numCallSignatures && !numConstructSignatures && !(apparentFuncType.flags & (TypeFlags.Union | TypeFlags.Never)) && qf.type.check.assignableTo(t, globalFunctionType))
        );
      }
      nullableType(t: Type) {
        return !!((strictNullChecks ? getFalsyFlags(t) : t.flags) & TypeFlags.Nullable);
      }
      knownProperty(t: Type, n: qu.__String, isComparingJsxAttributes: boolean) {
        if (t.flags & TypeFlags.Object) {
          const r = resolveStructuredTypeMembers(t as qt.ObjectType);
          if (r.stringIndexInfo || (r.numberIndexInfo && qt.NumericLiteral.name(n)) || getPropertyOfObjectType(t, n) || (isComparingJsxAttributes && !qu.unhyphenatedJsxName(n))) {
            return true;
          }
        } else if (t.flags & TypeFlags.UnionOrIntersection && this.excessPropertyCheckTarget(t)) {
          for (const u of (t as qt.UnionOrIntersectionType).types) {
            if (this.knownProperty(u, n, isComparingJsxAttributes)) return true;
          }
        }
        return false;
      }
      excessPropertyCheckTarget(t: Type) {
        return !!(
          (t.flags & TypeFlags.Object && !(t.objectFlags & ObjectFlags.ObjectLiteralPatternWithComputedProperties)) ||
          t.flags & TypeFlags.NonPrimitive ||
          (t.flags & TypeFlags.Union && qu.some(t.types, this.excessPropertyCheckTarget)) ||
          (t.flags & TypeFlags.Intersection && qu.every(t.types, this.excessPropertyCheckTarget))
        );
      }
      validSpreadType(t: Type) {
        if (t.flags & TypeFlags.Instantiable) {
          const c = qf.get.baseConstraintOfType(t);
          if (c !== undefined) return this.validSpreadType(c);
        }
        return !!(
          t.flags & (TypeFlags.Any | TypeFlags.NonPrimitive | TypeFlags.Object | TypeFlags.InstantiableNonPrimitive) ||
          (getFalsyFlags(t) & TypeFlags.DefinitelyFalsy && this.validSpreadType(removeDefinitelyFalsyTypes(t))) ||
          (t.flags & TypeFlags.UnionOrIntersection && qu.every(t.types, this.validSpreadType))
        );
      }
      evolvingArrayTypeList(ts: Type[]) {
        let has = false;
        for (const t of ts) {
          if (!(t.flags & TypeFlags.Never)) {
            if (!(t.objectFlags & ObjectFlags.EvolvingArray)) return false;
            has = true;
          }
        }
        return has;
      }
      typeSubsetOf(t: Type, to: Type) {
        return t === to || (to.flags & TypeFlags.Union && this.typeSubsetOfUnion(t, to));
      }
      typeSubsetOfUnion(t: Type, to: qt.UnionType) {
        if (t.flags & TypeFlags.Union) {
          for (const u of t.types) {
            if (!containsType(u.types, u)) return false;
          }
          return true;
        }
        if (t.flags & TypeFlags.EnumLiteral && getBaseTypeOfEnumLiteralType(<qt.LiteralType>t) === to) return true;
        return containsType(to.types, t);
      }
      discriminantProperty(t: Type | undefined, n: qu.__String) {
        if (t && t.flags & TypeFlags.Union) {
          const s = getUnionOrIntersectionProperty(t, n);
          if (s && s.checkFlags() & CheckFlags.SyntheticProperty) {
            if ((<qt.TransientSymbol>s).isDiscriminantProperty === undefined) {
              (<qt.TransientSymbol>s).isDiscriminantProperty =
                ((<qt.TransientSymbol>s).checkFlags & CheckFlags.Discriminant) === CheckFlags.Discriminant && !maybeTypeOfKind(s.typeOfSymbol(), TypeFlags.Instantiable);
            }
            return !!(<qt.TransientSymbol>s).isDiscriminantProperty;
          }
        }
        return false;
      }
      functionObjectType(t: qt.ObjectType): boolean {
        const resolved = resolveStructuredTypeMembers(t);
        return !!(resolved.callSignatures.length || resolved.constructSignatures.length || (resolved.members.get('bind' as qu.__String) && qf.type.is.subtypeOf(t, globalFunctionType)));
      }
      classDerivedFromDeclaringClasses(checkClass: Type, s: Symbol) {
        return forEachProperty(s, (p) => (p.declarationModifierFlags() & ModifierFlags.Protected ? !hasBaseType(checkClass, getDeclaringClass(p)) : false)) ? undefined : checkClass;
      }
      //
      unit(t: Type) {
        return !!(t.flags & TypeFlags.Unit);
      }
      neitherUnitNorNever(t: Type) {
        return !(t.flags & (TypeFlags.Unit | TypeFlags.Never));
      }
      objectLiteral(t: Type) {
        return !!(t.objectFlags & ObjectFlags.ObjectLiteral);
      }
      objectOrArrayLiteral(t: Type) {
        return !!(t.objectFlags & (ObjectFlags.ObjectLiteral | ObjectFlags.ArrayLiteral));
      }
      tuple(t: Type): t is qt.TupleTypeReference {
        return !!(t.objectFlags & ObjectFlags.Reference && t.target.objectFlags & ObjectFlags.Tuple);
      }
      intersection(t: Type): t is qt.IntersectionType {
        return !!(t.flags & TypeFlags.Intersection);
      }
      unionOrIntersection(t: Type): t is qt.UnionOrIntersectionType {
        return !!(t.flags & TypeFlags.UnionOrIntersection);
      }
      tupleLike(t: Type) {
        return this.tuple(t) || !!qf.get.propertyOfType(t, '0' as qu.__String);
      }
      arrayOrTupleLike(t: Type) {
        return this.arrayLike(t) || this.tupleLike(t);
      }
      literal(t: Type) {
        return t.flags & TypeFlags.Boolean ? true : t.flags & TypeFlags.Union ? (t.flags & TypeFlags.EnumLiteral ? true : qu.every(t.types, this.unit)) : this.unit(t);
      }
      stringOrNumberLiteral(t: Type): t is qt.LiteralType {
        return !!(t.flags & TypeFlags.StringOrNumberLiteral);
      }
      stringLiteral(t: Type): t is qt.StringLiteralType {
        return !!(t.flags & TypeFlags.StringLiteral);
      }
      numberLiteral(t: Type): t is qt.NumberLiteralType {
        return !!(t.flags & TypeFlags.NumberLiteral);
      }
      param(t: Type): t is TypeParam {
        return !!(t.flags & TypeFlags.TypeParam);
      }
      classOrInterface(t: Type): t is qt.InterfaceType {
        return !!(t.objectFlags & ObjectFlags.ClassOrInterface);
      }
      class(t: Type): t is qt.InterfaceType {
        return !!(t.objectFlags & ObjectFlags.Class);
      }
      any(t?: Type) {
        return t && (t.flags & TypeFlags.Any) !== 0;
      }
      referenceTo(t: Type, to: Type) {
        return t !== undefined && to !== undefined && (t.objectFlags & ObjectFlags.Reference) !== 0 && t.target === to;
      }
      mixinConstructor(t: Type) {
        const ss = getSignaturesOfType(t, qt.SignatureKind.Construct);
        if (ss.length === 1) {
          const s = ss[0];
          return !s.typeParams && s.params.length === 1 && s.hasRestParam() && getElemTypeOfArrayType(getTypeOfParam(s.params[0])) === anyType;
        }
        return false;
      }
      constructr(t: Type) {
        if (getSignaturesOfType(t, qt.SignatureKind.Construct).length > 0) return true;
        if (t.flags & TypeFlags.TypeVariable) {
          const c = qf.get.baseConstraintOfType(t);
          return !!c && this.mixinConstructor(c);
        }
        return false;
      }
      validBase(t: Type): t is qt.BaseType {
        if (t.flags & TypeFlags.TypeParam) {
          const c = qf.get.baseConstraintOfType(t);
          if (c) return this.validBase(c);
        }
        return !!((t.flags & (TypeFlags.Object | TypeFlags.NonPrimitive | TypeFlags.Any) && !this.genericMapped(t)) || (t.flags & TypeFlags.Intersection && qu.every(t.types, this.validBase)));
      }
      usableAsPropertyName(t: Type): t is qt.StringLiteralType | qt.NumberLiteralType | qt.UniqueESSymbolType {
        return !!(t.flags & TypeFlags.StringOrNumberLiteralOrUnique);
      }
      partialMapped(t: Type) {
        return !!(t.objectFlags & ObjectFlags.Mapped && getMappedTypeModifiers(t) & qt.MappedTypeModifiers.IncludeOptional);
      }
      genericMapped(t: Type): t is qt.MappedType {
        return !!(t.objectFlags & ObjectFlags.Mapped) && this.genericIndex(getConstraintTypeFromMappedType(t));
      }
      invalidDueToUnionDiscriminant(t: Type, e: qt.ObjectLiteralExpression | qt.JsxAttributes) {
        const ps = e.properties as Nodes<qt.ObjectLiteralElemLike | qt.JsxAttributeLike>;
        return ps.some((p) => {
          const nameType = p.name && qf.get.literalTypeFromPropertyName(p.name);
          const n = nameType && this.usableAsPropertyName(nameType) ? getPropertyNameFromType(nameType) : undefined;
          const r = n === undefined ? undefined : qf.get.typeOfPropertyOfType(t, n);
          return !!r && this.literal(r) && !this.assignableTo(getTypeOfNode(p), r);
        });
      }
      jsLiteral(t: Type): boolean {
        if (noImplicitAny) return false;
        if (t.objectFlags & ObjectFlags.JSLiteral) return true;
        if (t.flags & TypeFlags.Union) return qu.every((t as qt.UnionType).types, this.jsLiteral);
        if (t.flags & TypeFlags.Intersection) return qu.some((t as qt.IntersectionType).types, this.jsLiteral);
        if (t.flags & TypeFlags.Instantiable) return this.jsLiteral(getResolvedBaseConstraint(t));
        return false;
      }
      genericObject(t: Type) {
        if (t.flags & TypeFlags.UnionOrIntersection) {
          if (!(t.objectFlags & ObjectFlags.IsGenericObjectTypeComputed)) {
            t.objectFlags |= ObjectFlags.IsGenericObjectTypeComputed | (qu.some(t.types, this.genericObject) ? ObjectFlags.IsGenericObjectType : 0);
          }
          return !!(t.objectFlags & ObjectFlags.IsGenericObjectType);
        }
        return !!(t.flags & TypeFlags.InstantiableNonPrimitive) || this.genericMapped(t);
      }
      genericIndex(t: Type) {
        if (t.flags & TypeFlags.UnionOrIntersection) {
          if (!(t.objectFlags & ObjectFlags.IsGenericIndexTypeComputed))
            t.objectFlags |= ObjectFlags.IsGenericIndexTypeComputed | (qu.some(t.types, this.genericIndex) ? ObjectFlags.IsGenericIndexType : 0);
          return !!(t.objectFlags & ObjectFlags.IsGenericIndexType);
        }
        return !!(t.flags & (TypeFlags.InstantiableNonPrimitive | TypeFlags.Index));
      }
      thisParam(t: Type) {
        return !!(t.flags & TypeFlags.TypeParam && t.isThisType);
      }
      intersectionEmpty(t1: Type, t2: Type) {
        return !!(qf.get.unionType([intersectTypes(t1, t2), neverType]).flags & TypeFlags.Never);
      }
      nonGenericObject(t: Type) {
        return !!(t.flags & TypeFlags.Object) && !this.genericMapped(t);
      }
      emptyObjOrSpreadsIntoEmptyObj(t: Type) {
        return (
          this.emptyObject(t) ||
          !!(
            t.flags &
            (TypeFlags.BigIntLike |
              TypeFlags.BooleanLike |
              TypeFlags.EnumLike |
              TypeFlags.Index |
              TypeFlags.NonPrimitive |
              TypeFlags.Null |
              TypeFlags.NumberLike |
              TypeFlags.StringLike |
              TypeFlags.Undefined)
          )
        );
      }
      singlePropertyAnonymousObject(t: Type) {
        return (
          !!(t.flags & TypeFlags.Object) &&
          !!(t.objectFlags & ObjectFlags.Anonymous) &&
          (qu.length(qf.get.propertiesOfType(t)) === 1 || qu.every(qf.get.propertiesOfType(t), (s) => !!(s.flags & SymbolFlags.Optional)))
        );
      }
      nullable(t: Type) {
        return t.checker.is.nullableType(t);
      }
      withCallOrConstructSignatures(t: Type) {
        return t.checker.get.signaturesOfType(t, qt.SignatureKind.Call).length !== 0 || t.checker.get.signaturesOfType(t, qt.SignatureKind.Construct).length !== 0;
      }
      abstractConstructor(t: Type) {
        return !!(t.objectFlags & ObjectFlags.Anonymous) && !!t.symbol?.isAbstractConstructor();
      }
      notOptionalMarker(t: Type) {
        return t !== optionalType;
      }
      coercibleUnderDoubleEquals(t: Type, to: Type) {
        return (t.flags & (TypeFlags.Number | TypeFlags.String | TypeFlags.BooleanLiteral)) !== 0 && (to.flags & (TypeFlags.Number | TypeFlags.String | TypeFlags.Boolean)) !== 0;
      }
      withInferableIndex(t: Type): boolean {
        return t.flags & TypeFlags.Intersection
          ? qu.every(t.types, this.withInferableIndex)
          : !!(t.symbol && (t.symbol.flags & (SymbolFlags.ObjectLiteral | SymbolFlags.TypeLiteral | SymbolFlags.Enum | SymbolFlags.ValueModule)) !== 0 && !this.withCallOrConstructSignatures(t)) ||
              !!(t.objectFlags & ObjectFlags.ReverseMapped && this.withInferableIndex((t as qt.ReverseMappedType).source));
      }
      nonGenericTopLevel(t: Type) {
        if (t.aliasSymbol && !t.aliasTypeArgs) {
          const d = t.aliasSymbol.declarationOfKind(Syntax.TypeAliasDeclaration);
          return !!(d && qc.findAncestor(d.parent, (n) => (n.kind === Syntax.SourceFile ? true : n.kind === Syntax.ModuleDeclaration ? false : 'quit')));
        }
        return false;
      }
      paramAtTopLevel(t: Type, p: TypeParam): boolean {
        return !!(
          t === p ||
          (t.flags & TypeFlags.UnionOrIntersection && qu.some(t.types, (t) => this.paramAtTopLevel(t, p))) ||
          (t.flags & TypeFlags.Conditional &&
            (this.paramAtTopLevel(getTrueTypeFromConditionalType(<qt.ConditionalType>t), p) || this.paramAtTopLevel(getFalseTypeFromConditionalType(<qt.ConditionalType>t), p)))
        );
      }
      partiallyInferable(t: Type): boolean {
        return !(t.objectFlags & ObjectFlags.NonInferrableType) || (this.objectLiteral(t) && qu.some(qf.get.propertiesOfType(t), (s) => this.partiallyInferable(s.typeOfSymbol())));
      }
      fromInferenceBlockedSource(t: Type) {
        return !!(t.symbol && qu.some(t.symbol.declarations, hasSkipDirectInferenceFlag));
      }
      orBaseIdenticalTo(t: Type, to: Type) {
        return this.identicalTo(t, to) || !!((to.flags & TypeFlags.String && t.flags & TypeFlags.StringLiteral) || (to.flags & TypeFlags.Number && t.flags & TypeFlags.NumberLiteral));
      }
      closelyMatchedBy(t: Type, by: Type) {
        return !!((t.flags & TypeFlags.Object && by.flags & TypeFlags.Object && t.symbol && t.symbol === by.symbol) || (t.aliasSymbol && t.aliasTypeArgs && t.aliasSymbol === by.aliasSymbol));
      }
      array(t: Type) {
        return !!(t.objectFlags & ObjectFlags.Reference) && (t.target === globalArrayType || t.target === globalReadonlyArrayType);
      }
      readonlyArray(t: Type) {
        return !!(t.objectFlags & ObjectFlags.Reference) && t.target === globalReadonlyArrayType;
      }
      mutableArrayOrTuple(t: Type) {
        return (this.array(t) && !this.readonlyArray(t)) || (this.tuple(t) && !t.target.readonly);
      }
      arrayLike(t: Type) {
        return this.array(t) || (!(t.flags & TypeFlags.Nullable) && this.assignableTo(t, anyReadonlyArrayType));
      }
      emptyArrayLiteral(t: Type) {
        const e = this.array(t) ? getTypeArgs(t)[0] : undefined;
        return e === undefinedWideningType || e === implicitNeverType;
      }
      deeplyNested(t: Type, ts: Type[], depth: number) {
        if (depth >= 5 && t.flags & TypeFlags.Object && !this.objectOrArrayLiteral(t)) {
          const s = t.symbol;
          if (s) {
            let c = 0;
            for (let i = 0; i < depth; i++) {
              const t = ts[i];
              if (t.flags & TypeFlags.Object && t.symbol === s) {
                c++;
                if (c >= 5) return true;
              }
            }
          }
        }
        if (depth >= 5 && t.flags & TypeFlags.IndexedAccess) {
          const r = getRootObjectTypeFromIndexedAccessChain(t);
          let c = 0;
          for (let i = 0; i < depth; i++) {
            const t = ts[i];
            if (getRootObjectTypeFromIndexedAccessChain(t) === r) {
              c++;
              if (c >= 5) return true;
            }
          }
        }
        return false;
      }
      freshLiteral(t: Type) {
        return !!(t.flags & TypeFlags.Literal) && (t as qt.LiteralType).freshType === t;
      }
      identicalTo(t: Type, to: Type) {
        return this.relatedTo(t, to, identityRelation);
      }
      subtypeOf(t: Type, of: Type) {
        return this.relatedTo(t, of, subtypeRelation);
      }
      assignableTo(t: Type, to: Type): boolean {
        return this.relatedTo(t, to, assignableRelation);
      }
      derivedFrom(s: Type, t: Type): boolean {
        return s.flags & TypeFlags.Union
          ? qu.every(s.types, (t) => this.derivedFrom(t, t))
          : t.flags & TypeFlags.Union
          ? qu.some(t.types, (t) => this.derivedFrom(s, t))
          : s.flags & TypeFlags.InstantiableNonPrimitive
          ? this.derivedFrom(qf.get.baseConstraintOfType(s) || unknownType, t)
          : t === globalObjectType
          ? !!(s.flags & (TypeFlags.Object | TypeFlags.NonPrimitive))
          : t === globalFunctionType
          ? !!(s.flags & TypeFlags.Object) && this.functionObjectType(s as qt.ObjectType)
          : hasBaseType(s, getTargetType(t));
      }
      comparableTo(t: Type, to: Type) {
        return this.relatedTo(t, to, comparableRelation);
      }
      orHasGenericConditional(t: Type) {
        return !!(t.flags & TypeFlags.Conditional || (t.flags & TypeFlags.Intersection && qu.some((t as qt.IntersectionType).types, qf.type.is.orHasGenericConditional)));
      }
      emptyObject(t: Type): boolean {
        return t.flags & TypeFlags.Object
          ? !this.genericMapped(t) && this.emptyResolvedType(resolveStructuredTypeMembers(<qt.ObjectType>t))
          : t.flags & TypeFlags.NonPrimitive
          ? true
          : t.flags & TypeFlags.Union
          ? qu.some(t.types, this.emptyObject)
          : t.flags & TypeFlags.Intersection
          ? qu.every(t.types, this.emptyObject)
          : false;
      }
      emptyAnonymousObject(t: Type) {
        return !!(
          t.objectFlags & ObjectFlags.Anonymous &&
          ((t.members && this.emptyResolvedType(t)) || (t.symbol && t.symbol.flags & SymbolFlags.TypeLiteral && qf.get.membersOfSymbol(t.symbol).size === 0))
        );
      }
      stringIndexSignatureOnly(t: Type): boolean {
        return (
          (t.flags & TypeFlags.Object &&
            !this.genericMapped(t) &&
            qf.get.propertiesOfType(t).length === 0 &&
            qf.get.indexInfoOfType(t, qt.IndexKind.String) &&
            !qf.get.indexInfoOfType(t, qt.IndexKind.Number)) ||
          (t.flags & TypeFlags.UnionOrIntersection && qu.every(t.types, this.stringIndexSignatureOnly)) ||
          false
        );
      }
      simpleRelatedTo(t: Type, to: Type, r: qu.QMap<qt.RelationComparisonResult>, e?: qt.ErrorReporter) {
        const f = t.flags;
        const fto = to.flags;
        if (fto & TypeFlags.AnyOrUnknown || f & TypeFlags.Never || f === wildcardType) return true;
        if (fto & TypeFlags.Never) return false;
        if (f & TypeFlags.StringLike && fto & TypeFlags.String) return true;
        if (
          f & TypeFlags.StringLiteral &&
          f & TypeFlags.EnumLiteral &&
          fto & TypeFlags.StringLiteral &&
          !(fto & TypeFlags.EnumLiteral) &&
          (<qt.StringLiteralType>f).value === (<qt.StringLiteralType>target).value
        )
          return true;
        if (f & TypeFlags.NumberLike && fto & TypeFlags.Number) return true;
        if (
          f & TypeFlags.NumberLiteral &&
          f & TypeFlags.EnumLiteral &&
          fto & TypeFlags.NumberLiteral &&
          !(fto & TypeFlags.EnumLiteral) &&
          (<qt.NumberLiteralType>f).value === (<qt.NumberLiteralType>target).value
        )
          return true;
        if (f & TypeFlags.BigIntLike && fto & TypeFlags.BigInt) return true;
        if (f & TypeFlags.BooleanLike && fto & TypeFlags.Boolean) return true;
        if (f & TypeFlags.ESSymbolLike && fto & TypeFlags.ESSymbol) return true;
        if (f & TypeFlags.Enum && fto & TypeFlags.Enum && this.enumTypeRelatedTo(t.symbol, to.symbol, e)) return true;
        if (f & TypeFlags.EnumLiteral && fto & TypeFlags.EnumLiteral) {
          if (f & TypeFlags.Union && fto & TypeFlags.Union && this.enumTypeRelatedTo(t.symbol, to.symbol, e)) return true;
          if (
            f & TypeFlags.Literal &&
            fto & TypeFlags.Literal &&
            (<qt.LiteralType>f).value === (<qt.LiteralType>to).value &&
            this.enumTypeRelatedTo(getParentOfSymbol(t.symbol)!, getParentOfSymbol(to.symbol)!, e)
          )
            return true;
        }
        if (f & TypeFlags.Undefined && (!strictNullChecks || fto & (TypeFlags.Undefined | TypeFlags.Void))) return true;
        if (f & TypeFlags.Null && (!strictNullChecks || fto & TypeFlags.Null)) return true;
        if (f & TypeFlags.Object && fto & TypeFlags.NonPrimitive) return true;
        if (r === assignableRelation || r === comparableRelation) {
          if (f & TypeFlags.Any) return true;
          if (f & (TypeFlags.Number | TypeFlags.NumberLiteral) && !(f & TypeFlags.EnumLiteral) && (fto & TypeFlags.Enum || (fto & TypeFlags.NumberLiteral && fto & TypeFlags.EnumLiteral))) return true;
        }
        return false;
      }
      relatedTo(t: Type, to: Type, r: qu.QMap<qt.RelationComparisonResult>) {
        if (this.freshLiteral(t)) t = (<qt.FreshableType>t).regularType;
        if (this.freshLiteral(to)) to = (<qt.FreshableType>to).regularType;
        if (t === to) return true;
        if (r !== identityRelation) {
          if ((r === comparableRelation && !(to.flags & TypeFlags.Never) && this.simpleRelatedTo(to, t, r)) || this.simpleRelatedTo(t, to, r)) return true;
        } else {
          if (!(t.flags & TypeFlags.UnionOrIntersection) && !(to.flags & TypeFlags.UnionOrIntersection) && t.flags !== to.flags && !(t.flags & TypeFlags.Substructure)) return false;
        }
        if (t.flags & TypeFlags.Object && to.flags & TypeFlags.Object) {
          const related = r.get(getRelationKey(t, to, IntersectionState.None, r));
          if (related !== undefined) return !!(related & qt.RelationComparisonResult.Succeeded);
        }
        if (t.flags & TypeFlags.StructuredOrInstantiable || to.flags & TypeFlags.StructuredOrInstantiable) return qf.type.check.relatedTo(t, to, r, undefined);
        return false;
      }
      ignoredJsxProperty(t: Type, s: Symbol) {
        return t.objectFlags & ObjectFlags.JsxAttributes && !qu.unhyphenatedJsxName(s.escName);
      }
      weak(t: Type) {
        if (t.flags & TypeFlags.Object) {
          const r = resolveStructuredTypeMembers(<qt.ObjectType>t);
          return (
            r.callSignatures.length === 0 &&
            r.constructSignatures.length === 0 &&
            !r.stringIndexInfo &&
            !r.numberIndexInfo &&
            r.properties.length > 0 &&
            qu.every(r.properties, (p) => !!(p.flags & SymbolFlags.Optional))
          );
        }
        if (t.flags & TypeFlags.Intersection) return qu.every(t.types, qf.type.is.weak);
        return false;
      }
      unconstrainedParam(t: Type) {
        return t.flags & TypeFlags.TypeParam && !qf.get.constraintOfTypeParam(t);
      }
      nonDeferredReference(t: Type): t is TypeReference {
        return !!(t.objectFlags & ObjectFlags.Reference) && !t.node;
      }
      referenceWithGenericArgs(t: Type): boolean {
        return this.nonDeferredReference(t) && qu.some(getTypeArgs(t), (a) => this.unconstrainedParam(a) || this.referenceWithGenericArgs(a));
      }
    })();
    has = new (class extends Base {
      ccc(): boolean {
        if (this.is.bbb()) this.aaa();
        if (this.ccc()) return false;
        return true;
      }
      baseType(t: Type, checkBase: Type | undefined) {
        return check(t);
        function check(t: Type): boolean {
          if (t.objectFlags & (ObjectFlags.ClassOrInterface | ObjectFlags.Reference)) {
            const target = getTargetType(t);
            return target === checkBase || qu.some(getBaseTypes(target), check);
          } else if (t.flags & TypeFlags.Intersection) {
            return qu.some(t.types, check);
          }
          return false;
        }
      }
      nonCircularTypeParamDefault(typeParam: TypeParam) {
        return qf.get.resolvedTypeParamDefault(typeParam) !== circularConstraintType;
      }
      typeParamDefault(typeParam: TypeParam) {
        return !!(typeParam.symbol && forEach(typeParam.symbol.declarations, (decl) => decl.kind === Syntax.TypeParamDeclaration && decl.default));
      }
      commonProperties(s: Type, t: Type, isComparingJsxAttributes: boolean) {
        for (const prop of qf.get.propertiesOfType(s)) {
          if (qf.is.knownProperty(t, prop.escName, isComparingJsxAttributes)) return true;
        }
        return false;
      }
      primitiveConstraint(t: TypeParam) {
        const constraint = qf.get.constraintOfTypeParam(t);
        return (
          !!constraint &&
          maybeTypeOfKind(constraint.flags & TypeFlags.Conditional ? getDefaultConstraintOfConditionalType(constraint as qt.ConditionalType) : constraint, TypeFlags.Primitive | TypeFlags.Index)
        );
      }
      numericPropertyNames(t: Type) {
        return qf.get.indexTypeOfType(t, qt.IndexKind.Number) && !qf.get.indexTypeOfType(t, qt.IndexKind.String);
      }
      type(types: readonly Type[], t: Type) {
        return binarySearch(types, t, getTypeId, compareNumbers) >= 0;
      }
    })();
    get = new (class extends Base {
      properties(t: Type): Symbol[] {
        return t.checker.get.propertiesOfType(t);
      }
      property(t: Type, n: string): Symbol | undefined {
        return t.checker.get.propertyOfType(t, n);
      }
      apparentProperties(t: Type): Symbol[] {
        return t.checker.get.augmentedPropertiesOfType(t);
      }
      callSignatures(t: Type): readonly Signature[] {
        return t.checker.get.signaturesOfType(t, qt.SignatureKind.Call);
      }
      constructSignatures(t: Type): readonly Signature[] {
        return t.checker.get.signaturesOfType(t, qt.SignatureKind.Construct);
      }
      stringIndexType(t: Type): Type | undefined {
        return t.checker.get.indexTypeOfType(t, qt.IndexKind.String);
      }
      numberIndexType(t: Type): Type | undefined {
        return t.checker.get.indexTypeOfType(t, qt.IndexKind.Number);
      }
      baseTypes(t: Type): qt.BaseType[] | undefined {
        return this.is.classOrInterface(t) ? t.checker.get.baseTypes(t) : undefined;
      }
      nonNullableType(t: Type): Type {
        return t.checker.get.nonNullableType(t);
      }
      nonOptionalType(t: Type): Type {
        return t.checker.get.nonOptionalType(t);
      }
      constraint(t: Type): Type | undefined {
        return t.checker.get.baseConstraintOfType(t);
      }
      default(t: Type): Type | undefined {
        return t.checker.get.defaultFromTypeParam(t);
      }
      typeNamesForErrorDisplay(left: Type, right: Type): [string, string] {
        let l = symbolValueDeclarationIsContextSensitive(left.symbol) ? typeToString(left, left.symbol?.valueDeclaration) : typeToString(left);
        let r = symbolValueDeclarationIsContextSensitive(right.symbol) ? typeToString(right, right.symbol?.valueDeclaration) : typeToString(right);
        if (l === r) {
          l = this.typeNameForErrorDisplay(left);
          r = this.typeNameForErrorDisplay(right);
        }
        return [l, r];
      }
      typeNameForErrorDisplay(t: Type) {
        return typeToString(t, undefined, qt.TypeFormatFlags.UseFullyQualifiedType);
      }
      typeAliasForTypeLiteral(t: Type): Symbol | undefined {
        if (t.symbol && t.symbol.flags & SymbolFlags.TypeLiteral) {
          const n = walkUpParenthesizedTypes(t.symbol.declarations[0].parent);
          if (n.kind === Syntax.TypeAliasDeclaration) return this.symbolOfNode(n);
        }
        return;
      }
      typeOfPropertyOfType(t: Type, name: qu.__String): Type | undefined {
        const prop = this.propertyOfType(t, name);
        return prop ? this.typeOfSymbol(prop) : undefined;
      }
      typeOfPropertyOrIndexSignature(t: Type, n: qu.__String): Type {
        return this.typeOfPropertyOfType(t, n) || (NumericLiteral.name(n) && this.indexTypeOfType(t, qt.IndexKind.Number)) || this.indexTypeOfType(t, qt.IndexKind.String) || unknownType;
      }
      restType(t: Type, ps: qt.PropertyName[], s?: Symbol): Type {
        t = filterType(t, (t) => !(t.flags & TypeFlags.Nullable));
        if (t.flags & TypeFlags.Never) return qu.emptyObjectType;
        if (t.flags & TypeFlags.Union) return mapType(t, (t) => this.restType(t, ps, s));
        const omitKeyType = this.unionType(qu.map(ps, this.literalTypeFromPropertyName));
        if (this.is.genericObject(t) || this.is.genericIndex(omitKeyType)) {
          if (omitKeyType.flags & TypeFlags.Never) return t;
          const omitTypeAlias = this.globalOmitSymbol();
          if (!omitTypeAlias) return errorType;
          return this.typeAliasInstantiation(omitTypeAlias, [t, omitKeyType]);
        }
        const members = new qc.SymbolTable();
        for (const prop of this.propertiesOfType(t)) {
          if (
            !this.is.assignableTo(this.literalTypeFromProperty(prop, TypeFlags.StringOrNumberLiteralOrUnique), omitKeyType) &&
            !(prop.declarationModifierFlags() & (ModifierFlags.Private | ModifierFlags.Protected)) &&
            qf.is.spreadableProperty(prop)
          ) {
            members.set(prop.escName, this.spreadSymbol(prop, false));
          }
        }
        const stringIndexInfo = this.indexInfoOfType(t, qt.IndexKind.String);
        const numberIndexInfo = this.indexInfoOfType(t, qt.IndexKind.Number);
        const result = create.anonymousType(s, members, qu.empty, qu.empty, stringIndexInfo, numberIndexInfo);
        result.objectFlags |= ObjectFlags.ObjectRestType;
        return result;
      }
      annotatedTypeForAssignmentDeclaration(t: Type | undefined, e: qt.Expression, s: Symbol, d: qt.Declaration) {
        const typeNode = this.effectiveTypeAnnotationNode(e.parent);
        if (typeNode) {
          const type = this.widenedType(this.typeFromTypeNode(typeNode));
          if (!t) return type;
          else if (t !== errorType && type !== errorType && !this.is.identicalTo(t, type)) {
            errorNextVariableOrPropertyDeclarationMustHaveSameType(undefined, t, d, type);
          }
        }
        if (s.parent) {
          const typeNode = this.effectiveTypeAnnotationNode(s.parent?.valueDeclaration);
          if (typeNode) return this.typeOfPropertyOfType(this.typeFromTypeNode(typeNode), s.escName);
        }
        return t;
      }
      constructorDefinedThisAssignmentTypes(ts: Type[], ds: qt.Declaration[]): Type[] | undefined {
        qf.assert.true(ts.length === ds.length);
        return ts.filter((_, i) => {
          const declaration = ds[i];
          const expression = declaration.kind === Syntax.BinaryExpression ? declaration : declaration.parent?.kind === Syntax.BinaryExpression ? declaration.parent : undefined;
          return expression && qf.is.declarationInConstructor(expression);
        });
      }
      targetType(t: Type): Type {
        return t.objectFlags & ObjectFlags.Reference ? (<TypeReference>t).target : t;
      }
      constructorsForTypeArgs(t: Type, args: readonly qt.Typing[] | undefined, n: Node): readonly Signature[] {
        const typeArgCount = qu.length(args);
        const isJavascript = qf.is.inJSFile(n);
        return qu.filter(this.signaturesOfType(t, qt.SignatureKind.Construct), (s) => (isJavascript || typeArgCount >= this.minTypeArgCount(s.typeParams)) && typeArgCount <= qu.length(s.typeParams));
      }
      instantiatedConstructorsForTypeArgs(t: Type, args: readonly qt.Typing[] | undefined, n: Node): readonly Signature[] {
        const ss = this.constructorsForTypeArgs(t, args, n);
        const typeArgs = map(args, this.typeFromTypeNode);
        return sameMap<Signature>(ss, (s) => (qu.some(s.typeParams) ? this.signatureInstantiation(s, typeArgs, qf.is.inJSFile(n)) : s));
      }
      baseTypeOfEnumLiteralType(t: Type) {
        return t.flags & TypeFlags.EnumLiteral && !(t.flags & TypeFlags.Union) ? this.declaredTypeOfSymbol(this.parentOfSymbol(t.symbol)!) : t;
      }
      typeWithThisArg(t: Type, thisArg?: Type, needApparent?: boolean): Type {
        if (t.objectFlags & ObjectFlags.Reference) {
          const target = (<TypeReference>t).target;
          const typeArgs = this.typeArgs(<TypeReference>t);
          if (qu.length(target.typeParams) === qu.length(typeArgs)) {
            const ref = qf.make.typeReference(target, concatenate(typeArgs, [thisArg || target.thisType!]));
            return needApparent ? this.apparentType(ref) : ref;
          }
        } else if (t.flags & TypeFlags.Intersection) {
          return this.intersectionType(qu.map((<qt.IntersectionType>t).types, (t) => this.typeWithThisArg(t, thisArg, needApparent)));
        }
        return needApparent ? this.apparentType(t) : t;
      }
      lowerBoundOfKeyType(t: Type): Type {
        if (t.flags & (TypeFlags.Any | TypeFlags.Primitive)) return t;
        if (t.flags & TypeFlags.Index) return this.indexType(this.apparentType((<qt.IndexType>t).type));
        if (t.flags & TypeFlags.Conditional) {
          if ((<qt.ConditionalType>t).root.isDistributive) {
            const checkType = (<qt.ConditionalType>t).checkType;
            const constraint = this.lowerBoundOfKeyType(checkType);
            if (constraint !== checkType)
              return this.conditionalTypeInstantiation(<qt.ConditionalType>t, prependTypeMapping((<qt.ConditionalType>t).root.checkType, constraint, (<qt.ConditionalType>t).mapper));
          }
          return t;
        }
        if (t.flags & TypeFlags.Union) return this.unionType(sameMap((<qt.UnionType>t).types, getLowerBoundOfKeyType));
        if (t.flags & TypeFlags.Intersection) return this.intersectionType(sameMap((<qt.UnionType>t).types, getLowerBoundOfKeyType));
        return neverType;
      }
      propertiesOfObjectType(t: Type): Symbol[] {
        if (t.flags & TypeFlags.Object) return resolveStructuredTypeMembers(<qt.ObjectType>t).properties;
        return qu.empty;
      }
      propertyOfObjectType(t: Type, name: qu.__String): Symbol | undefined {
        if (t.flags & TypeFlags.Object) {
          const resolved = resolveStructuredTypeMembers(<qt.ObjectType>t);
          const symbol = resolved.members.get(name);
          if (symbol && symbol.isValue()) return symbol;
        }
      }
      propertiesOfType(t: Type): Symbol[] {
        t = this.reducedApparentType(t);
        return t.flags & TypeFlags.UnionOrIntersection ? this.propertiesOfUnionOrIntersectionType(<qt.UnionType>t) : this.propertiesOfObjectType(t);
      }
      constraintOfTypeParam(t: TypeParam): Type | undefined {
        return qf.has.nonCircularBaseConstraint(t) ? this.constraintFromTypeParam(t) : undefined;
      }
      simplifiedTypeOrConstraint(t: Type) {
        const simplified = this.simplifiedType(t, false);
        return simplified !== t ? simplified : this.constraintOfType(t);
      }
      baseConstraintOfType(t: Type): Type | undefined {
        if (t.flags & (TypeFlags.InstantiableNonPrimitive | TypeFlags.UnionOrIntersection)) {
          const constraint = this.resolvedBaseConstraint(<qt.InstantiableType | qt.UnionOrIntersectionType>t);
          return constraint !== noConstraintType && constraint !== circularConstraintType ? constraint : undefined;
        }
        return t.flags & TypeFlags.Index ? keyofConstraintType : undefined;
      }
      baseConstraintOrType(t: Type) {
        return this.baseConstraintOfType(t) || t;
      }
      resolvedTypeParamDefault(t: TypeParam): Type | undefined {
        if (!t.default) {
          if (t.target) {
            const targetDefault = this.resolvedTypeParamDefault(t.target);
            t.default = targetDefault ? instantiateType(targetDefault, t.mapper) : noConstraintType;
          } else {
            t.default = resolvingDefaultType;
            const defaultDeclaration = t.symbol && forEach(t.symbol.declarations, (d) => d.kind === Syntax.TypeParamDeclaration && d.default);
            const defaultType = defaultDeclaration ? this.typeFromTypeNode(defaultDeclaration) : noConstraintType;
            if (t.default === resolvingDefaultType) t.default = defaultType;
          }
        } else if (t.default === resolvingDefaultType) t.default = circularConstraintType;
        return t.default;
      }
      defaultFromTypeParam(t: TypeParam): Type | undefined {
        const r = this.resolvedTypeParamDefault(t);
        return r !== noConstraintType && r !== circularConstraintType ? r : undefined;
      }
      apparentType(t: Type): Type {
        const r = t.flags & TypeFlags.Instantiable ? this.baseConstraintOfType(t) || unknownType : t;
        return r.objectFlags & ObjectFlags.Mapped
          ? this.apparentTypeOfMappedType(<qt.MappedType>r)
          : r.flags & TypeFlags.Intersection
          ? this.apparentTypeOfIntersectionType(<qt.IntersectionType>r)
          : r.flags & TypeFlags.StringLike
          ? globalStringType
          : r.flags & TypeFlags.NumberLike
          ? globalNumberType
          : r.flags & TypeFlags.BigIntLike
          ? this.globalBigIntType(true)
          : r.flags & TypeFlags.BooleanLike
          ? globalBooleanType
          : r.flags & TypeFlags.ESSymbolLike
          ? this.globalESSymbolType(true)
          : r.flags & TypeFlags.NonPrimitive
          ? qu.emptyObjectType
          : r.flags & TypeFlags.Index
          ? keyofConstraintType
          : r.flags & TypeFlags.Unknown && !strictNullChecks
          ? qu.emptyObjectType
          : r;
      }
      reducedApparentType(t: Type): Type {
        return this.reducedType(this.apparentType(this.reducedType(t)));
      }
      reducedType(t: Type): Type {
        if (t.flags & TypeFlags.Union && (<qt.UnionType>t).objectFlags & ObjectFlags.ContainsIntersections)
          return (<qt.UnionType>t).resolvedReducedType || ((<qt.UnionType>t).resolvedReducedType = this.reducedUnionType(<qt.UnionType>t));
        else if (t.flags & TypeFlags.Intersection) {
          if (!((<qt.IntersectionType>t).objectFlags & ObjectFlags.IsNeverIntersectionComputed)) {
            (<qt.IntersectionType>t).objectFlags |=
              ObjectFlags.IsNeverIntersectionComputed | (qu.some(this.propertiesOfUnionOrIntersectionType(<qt.IntersectionType>t), isNeverReducedProperty) ? ObjectFlags.IsNeverIntersection : 0);
          }
          return (<qt.IntersectionType>t).objectFlags & ObjectFlags.IsNeverIntersection ? neverType : t;
        }
        return t;
      }
      propertyOfType(t: Type, name: qu.__String): Symbol | undefined {
        type = this.reducedApparentType(t);
        if (t.flags & TypeFlags.Object) {
          const resolved = resolveStructuredTypeMembers(<qt.ObjectType>type);
          const s = resolved.members.get(name);
          if (s && s.isValue()) return s;
          const functionType =
            resolved === anyFunctionType
              ? globalFunctionType
              : resolved.callSignatures.length
              ? globalCallableFunctionType
              : resolved.constructSignatures.length
              ? globalNewableFunctionType
              : undefined;
          if (functionType) {
            const s = this.propertyOfObjectType(functionType, name);
            if (s) return s;
          }
          return this.propertyOfObjectType(globalObjectType, name);
        }
        if (t.flags & TypeFlags.UnionOrIntersection) return this.propertyOfUnionOrIntersectionType(<qt.UnionOrIntersectionType>type, name);
        return;
      }
      signaturesOfStructuredType(t: Type, k: qt.SignatureKind): readonly Signature[] {
        if (t.flags & TypeFlags.StructuredType) {
          const r = resolveStructuredTypeMembers(<qt.ObjectType>t);
          return k === qt.SignatureKind.Call ? r.callSignatures : r.constructSignatures;
        }
        return qu.empty;
      }
      signaturesOfType(t: Type, k: qt.SignatureKind): readonly Signature[] {
        return this.signaturesOfStructuredType(this.reducedApparentType(t), k);
      }
      indexInfoOfStructuredType(t: Type, k: qt.IndexKind): qt.IndexInfo | undefined {
        if (t.flags & TypeFlags.StructuredType) {
          const r = resolveStructuredTypeMembers(<qt.ObjectType>t);
          return k === qt.IndexKind.String ? r.stringIndexInfo : r.numberIndexInfo;
        }
      }
      indexTypeOfStructuredType(t: Type, k: qt.IndexKind): Type | undefined {
        const info = this.indexInfoOfStructuredType(t, k);
        return info && info.type;
      }
      indexInfoOfType(t: Type, k: qt.IndexKind): qt.IndexInfo | undefined {
        return this.indexInfoOfStructuredType(this.reducedApparentType(t), k);
      }
      indexTypeOfType(t: Type, k: qt.IndexKind): Type | undefined {
        return this.indexTypeOfStructuredType(this.reducedApparentType(t), k);
      }
      implicitIndexTypeOfType(t: Type, k: qt.IndexKind): Type | undefined {
        if (this.is.withInferableIndex(t)) {
          const propTypes: Type[] = [];
          for (const p of this.propertiesOfType(t)) {
            if (k === qt.IndexKind.String || qt.NumericLiteral.name(p.escName)) propTypes.push(this.typeOfSymbol(p));
          }
          if (k === qt.IndexKind.String) qu.append(propTypes, this.indexTypeOfType(t, qt.IndexKind.Number));
          if (propTypes.length) return this.unionType(propTypes);
        }
        return;
      }
      constraintDeclaration(t: TypeParam): qt.Typing | undefined {
        return mapDefined(filter(t.symbol && t.symbol.declarations, qf.is.typeParamDeclaration), getEffectiveConstraintOfTypeParam)[0];
      }
      inferredTypeParamConstraint(t: TypeParam) {
        let inferences: Type[] | undefined;
        if (t.symbol) {
          for (const d of t.symbol.declarations) {
            if (d.parent?.kind === Syntax.InferTyping) {
              const gp = d.parent?.parent;
              if (gp?.kind === Syntax.TypingReference) {
                const typeReference = <qt.TypingReference>gp;
                const ps = this.typeParamsForTypeReference(typeReference);
                if (ps) {
                  const index = typeReference.typeArgs!.indexOf(<qt.Typing>d.parent);
                  if (index < ps.length) {
                    const declaredConstraint = this.constraintOfTypeParam(ps[index]);
                    if (declaredConstraint) {
                      const mapper = qf.make.typeMapper(ps, this.effectiveTypeArgs(typeReference, ps));
                      const constraint = instantiateType(declaredConstraint, mapper);
                      if (constraint !== t) inferences = qu.append(inferences, constraint);
                    }
                  }
                }
              } else if (gp?.kind === Syntax.Param && (<qt.ParamDeclaration>gp).dot3Token) {
                inferences = qu.append(inferences, qf.make.arrayType(unknownType));
              }
            }
          }
        }
        return inferences && this.intersectionType(inferences);
      }
      constraintFromTypeParam(t: TypeParam): Type | undefined {
        if (!t.constraint) {
          if (t.target) {
            const targetConstraint = this.constraintOfTypeParam(t.target);
            t.constraint = targetConstraint ? instantiateType(targetConstraint, t.mapper) : noConstraintType;
          } else {
            const constraintDeclaration = this.constraintDeclaration(t);
            if (!constraintDeclaration) t.constraint = this.inferredTypeParamConstraint(t) || noConstraintType;
            else {
              let type = this.typeFromTypeNode(constraintDeclaration);
              if (t.flags & TypeFlags.Any && type !== errorType) type = constraintDeclaration.parent?.parent?.kind === Syntax.MappedTyping ? keyofConstraintType : unknownType;
              t.constraint = type;
            }
          }
        }
        return t.constraint === noConstraintType ? undefined : t.constraint;
      }
      parentSymbolOfTypeParam(t: TypeParam): Symbol | undefined {
        const tp = t.symbol.declarationOfKind<TypeParamDeclaration>(Syntax.TypeParam)!;
        const host = tp.parent?.kind === Syntax.DocTemplateTag ? this.hostSignatureFromDoc(tp.parent) : tp.parent;
        return host && this.symbolOfNode(host);
      }
      typeListId(ts: readonly Type[] | undefined) {
        let r = '';
        if (ts) {
          const length = ts.length;
          let i = 0;
          while (i < length) {
            const startId = ts[i].id;
            let count = 1;
            while (i + count < length && ts[i + count].id === startId + count) {
              count++;
            }
            if (r.length) r += ',';
            r += startId;
            if (count > 1) r += ':' + count;
            i += count;
          }
        }
        return r;
      }
      propagatingFlagsOfTypes(ts: readonly Type[], exclude: TypeFlags): ObjectFlags {
        let r: ObjectFlags = 0;
        for (const t of ts) {
          if (!(t.flags & exclude)) r |= t.objectFlags;
        }
        return r & ObjectFlags.PropagatingFlags;
      }
      substitutionType(t: Type, substitute: Type) {
        if (substitute.flags & TypeFlags.AnyOrUnknown || substitute === t) return t;
        const id = `${this.typeId(t)}>${this.typeId(substitute)}`;
        const cached = substitutionTypes.get(id);
        if (cached) return cached;
        const r = <qt.SubstitutionType>qf.make.type(TypeFlags.Substitution);
        r.baseType = t;
        r.substitute = substitute;
        substitutionTypes.set(id, r);
        return r;
      }
      impliedConstraint(t: Type, check: qt.Typing, extend: qt.Typing): Type | undefined {
        return qf.is.unaryTupleTyping(check) && qf.is.unaryTupleTyping(extend)
          ? this.impliedConstraint(t, (<qt.TupleTyping>check).elems[0], (<qt.TupleTyping>extend).elems[0])
          : this.actualTypeVariable(this.typeFromTypeNode(check)) === type
          ? this.typeFromTypeNode(extend)
          : undefined;
      }
      conditionalFlowTypeOfType(t: Type, n: Node) {
        let cs: Type[] | undefined;
        while (n && !qf.is.statement(n) && n.kind !== Syntax.DocComment) {
          const p = n.parent;
          if (p?.kind === Syntax.ConditionalTyping && n === (<qt.ConditionalTyping>p).trueType) {
            const c = this.impliedConstraint(t, (<qt.ConditionalTyping>p).checkType, (<qt.ConditionalTyping>p).extendsType);
            if (c) cs = qu.append(cs, c);
          }
          n = p;
        }
        return cs ? this.substitutionType(t, this.intersectionType(qu.append(cs, t))) : t;
      }
      typeId(t: Type) {
        return t.id;
      }
      unionType(ts: readonly Type[], r: qt.UnionReduction = qt.UnionReduction.Literal, aliasSymbol?: Symbol, aliasTypeArgs?: readonly Type[]): Type {
        if (ts.length === 0) return neverType;
        if (ts.length === 1) return ts[0];
        const typeSet: Type[] = [];
        const includes = addTypesToUnion(typeSet, 0, ts);
        if (r !== qt.UnionReduction.None) {
          if (includes & TypeFlags.AnyOrUnknown) return includes & TypeFlags.Any ? (includes & TypeFlags.IncludesWildcard ? wildcardType : anyType) : unknownType;
          switch (r) {
            case qt.UnionReduction.Literal:
              if (includes & (TypeFlags.Literal | TypeFlags.UniqueESSymbol)) removeRedundantLiteralTypes(typeSet, includes);
              break;
            case qt.UnionReduction.Subtype:
              if (!removeSubtypes(typeSet, !(includes & TypeFlags.IncludesStructuredOrInstantiable))) return errorType;
              break;
          }
          if (typeSet.length === 0) {
            return includes & TypeFlags.Null
              ? includes & TypeFlags.IncludesNonWideningType
                ? nullType
                : nullWideningType
              : includes & TypeFlags.Undefined
              ? includes & TypeFlags.IncludesNonWideningType
                ? undefinedType
                : undefinedWideningType
              : neverType;
          }
        }
        const objectFlags = (includes & TypeFlags.NotPrimitiveUnion ? 0 : ObjectFlags.PrimitiveUnion) | (includes & TypeFlags.Intersection ? ObjectFlags.ContainsIntersections : 0);
        return this.unionTypeFromSortedList(typeSet, objectFlags, aliasSymbol, aliasTypeArgs);
      }
      unionTypeFromSortedList(ts: Type[], f: ObjectFlags, aliasSymbol?: Symbol, aliasTypeArgs?: readonly Type[]): Type {
        if (ts.length === 0) return neverType;
        if (ts.length === 1) return ts[0];
        const id = this.typeListId(ts);
        let t = unionTypes.get(id);
        if (!t) {
          t = <qt.UnionType>qf.make.type(TypeFlags.Union);
          unionTypes.set(id, t);
          t.objectFlags = f | this.propagatingFlagsOfTypes(ts, TypeFlags.Nullable);
          t.types = ts;
          t.aliasSymbol = aliasSymbol;
          t.aliasTypeArgs = aliasTypeArgs;
        }
        return t;
      }
      literalTypeFromProperties(t: Type, f: TypeFlags) {
        return this.unionType(qu.map(this.propertiesOfType(t), (p) => this.literalTypeFromProperty(p, f)));
      }
      nonEnumNumberIndexInfo(t: Type) {
        const i = this.indexInfoOfType(t, qt.IndexKind.Number);
        return i !== enumNumberIndexInfo ? i : undefined;
      }
      indexType(t: Type, stringsOnly = keyofStringsOnly, noIndexSignatures?: boolean): Type {
        t = this.reducedType(t);
        return t.flags & TypeFlags.Union
          ? this.intersectionType(qu.map((<qt.IntersectionType>t).types, (t) => this.indexType(t, stringsOnly, noIndexSignatures)))
          : t.flags & TypeFlags.Intersection
          ? this.unionType(qu.map((<qt.IntersectionType>t).types, (t) => this.indexType(t, stringsOnly, noIndexSignatures)))
          : maybeTypeOfKind(t, TypeFlags.InstantiableNonPrimitive)
          ? this.indexTypeForGenericType(<qt.InstantiableType | qt.UnionOrIntersectionType>t, stringsOnly)
          : t.objectFlags & ObjectFlags.Mapped
          ? filterType(this.constraintTypeFromMappedType(<qt.MappedType>t), (t) => !(noIndexSignatures && t.flags & (TypeFlags.Any | TypeFlags.String)))
          : t === wildcardType
          ? wildcardType
          : t.flags & TypeFlags.Unknown
          ? neverType
          : t.flags & (TypeFlags.Any | TypeFlags.Never)
          ? keyofConstraintType
          : stringsOnly
          ? !noIndexSignatures && this.indexInfoOfType(t, qt.IndexKind.String)
            ? stringType
            : this.literalTypeFromProperties(t, TypeFlags.StringLiteral)
          : !noIndexSignatures && this.indexInfoOfType(t, qt.IndexKind.String)
          ? this.unionType([stringType, numberType, this.literalTypeFromProperties(t, TypeFlags.UniqueESSymbol)])
          : this.nonEnumNumberIndexInfo(t)
          ? this.unionType([numberType, this.literalTypeFromProperties(t, TypeFlags.StringLiteral | TypeFlags.UniqueESSymbol)])
          : this.literalTypeFromProperties(t, TypeFlags.StringOrNumberLiteralOrUnique);
      }
      extractStringType(t: Type) {
        if (keyofStringsOnly) return t;
        const extractTypeAlias = this.globalExtractSymbol();
        return extractTypeAlias ? this.typeAliasInstantiation(extractTypeAlias, [t, stringType]) : stringType;
      }
      indexTypeOrString(t: Type): Type {
        const i = this.extractStringType(this.indexType(t));
        return i.flags & TypeFlags.Never ? stringType : i;
      }
      simplifiedType(t: Type, writing: boolean): Type {
        return t.flags & TypeFlags.IndexedAccess
          ? this.simplifiedIndexedAccessType(<qt.IndexedAccessType>t, writing)
          : t.flags & TypeFlags.Conditional
          ? this.simplifiedConditionalType(<qt.ConditionalType>t, writing)
          : t;
      }
      indexedAccessType(o: Type, i: Type, accessNode?: qt.ElemAccessExpression | qt.IndexedAccessTyping | qt.PropertyName | qt.BindingName | qt.SyntheticExpression): Type {
        return this.indexedAccessTypeOrUndefined(o, i, accessNode, qt.AccessFlags.None) || (accessNode ? errorType : unknownType);
      }
      actualTypeVariable(t: Type): Type {
        if (t.flags & TypeFlags.Substitution) return (<qt.SubstitutionType>t).baseType;
        if (t.flags & TypeFlags.IndexedAccess && ((<qt.IndexedAccessType>t).objectType.flags & TypeFlags.Substitution || (<qt.IndexedAccessType>t).indexType.flags & TypeFlags.Substitution))
          return this.indexedAccessType(this.actualTypeVariable((<qt.IndexedAccessType>t).objectType), this.actualTypeVariable((<qt.IndexedAccessType>t).indexType));
        return t;
      }
      spreadType(left: Type, right: Type, s: Symbol | undefined, f: ObjectFlags, readonly: boolean): Type {
        if (left.flags & TypeFlags.Any || right.flags & TypeFlags.Any) return anyType;
        if (left.flags & TypeFlags.Unknown || right.flags & TypeFlags.Unknown) return unknownType;
        if (left.flags & TypeFlags.Never) return right;
        if (right.flags & TypeFlags.Never) return left;
        if (left.flags & TypeFlags.Union) {
          const merged = tryMergeUnionOfObjectTypeAndEmptyObject(left as qt.UnionType, readonly);
          if (merged) return this.spreadType(merged, right, s, f, readonly);
          return mapType(left, (t) => this.spreadType(t, right, s, f, readonly));
        }
        if (right.flags & TypeFlags.Union) {
          const merged = tryMergeUnionOfObjectTypeAndEmptyObject(right as qt.UnionType, readonly);
          if (merged) return this.spreadType(left, merged, s, f, readonly);
          return mapType(right, (t) => this.spreadType(left, t, s, f, readonly));
        }
        if (right.flags & (TypeFlags.BooleanLike | TypeFlags.NumberLike | TypeFlags.BigIntLike | TypeFlags.StringLike | TypeFlags.EnumLike | TypeFlags.NonPrimitive | TypeFlags.Index)) return left;
        if (this.is.genericObject(left) || this.is.genericObject(right)) {
          if (this.is.emptyObject(left)) return right;
          if (left.flags & TypeFlags.Intersection) {
            const types = (<qt.IntersectionType>left).types;
            const lastLeft = types[types.length - 1];
            if (this.is.nonGenericObject(lastLeft) && this.is.nonGenericObject(right))
              return this.intersectionType(concatenate(types.slice(0, types.length - 1), [this.spreadType(lastLeft, right, s, f, readonly)]));
          }
          return this.intersectionType([left, right]);
        }
        const members = new qc.SymbolTable();
        const skippedPrivateMembers = qu.qf.make.escapedMap<boolean>();
        let stringIndexInfo: qt.IndexInfo | undefined;
        let numberIndexInfo: qt.IndexInfo | undefined;
        if (left === qu.emptyObjectType) {
          stringIndexInfo = this.indexInfoOfType(right, qt.IndexKind.String);
          numberIndexInfo = this.indexInfoOfType(right, qt.IndexKind.Number);
        } else {
          stringIndexInfo = unionSpreadIndexInfos(this.indexInfoOfType(left, qt.IndexKind.String), this.indexInfoOfType(right, qt.IndexKind.String));
          numberIndexInfo = unionSpreadIndexInfos(this.indexInfoOfType(left, qt.IndexKind.Number), this.indexInfoOfType(right, qt.IndexKind.Number));
        }
        for (const rightProp of this.propertiesOfType(right)) {
          if (rightProp.declarationModifierFlags() & (ModifierFlags.Private | ModifierFlags.Protected)) skippedPrivateMembers.set(rightProp.escName, true);
          else if (qf.is.spreadableProperty(rightProp)) {
            members.set(rightProp.escName, this.spreadSymbol(rightProp, readonly));
          }
        }
        for (const leftProp of this.propertiesOfType(left)) {
          if (skippedPrivateMembers.has(leftProp.escName) || !qf.is.spreadableProperty(leftProp)) continue;
          if (members.has(leftProp.escName)) {
            const rightProp = members.get(leftProp.escName)!;
            const rightType = this.typeOfSymbol(rightProp);
            if (rightProp.flags & SymbolFlags.Optional) {
              const declarations = concatenate(leftProp.declarations, rightProp.declarations);
              const flags = SymbolFlags.Property | (leftProp.flags & SymbolFlags.Optional);
              const result = new qc.Symbol(flags, leftProp.escName);
              result.type = this.unionType([this.typeOfSymbol(leftProp), this.typeWithFacts(rightType, qt.TypeFacts.NEUndefined)]);
              result.leftSpread = leftProp;
              result.rightSpread = rightProp;
              result.declarations = declarations;
              result.nameType = s.this.links(leftProp).nameType;
              members.set(leftProp.escName, result);
            }
          } else {
            members.set(leftProp.escName, this.spreadSymbol(leftProp, readonly));
          }
        }
        const spread = qf.make.anonymousType(s, members, qu.empty, qu.empty, this.indexInfoWithReadonly(stringIndexInfo, readonly), this.indexInfoWithReadonly(numberIndexInfo, readonly));
        spread.objectFlags |= ObjectFlags.ObjectLiteral | ObjectFlags.ContainsObjectOrArrayLiteral | ObjectFlags.ContainsSpread | f;
        return spread;
      }
      freshTypeOfLiteralType(t: Type): Type {
        if (t.flags & TypeFlags.Literal) {
          if (!(<qt.LiteralType>t).freshType) {
            const freshType = qf.make.literalType(t.flags, (<qt.LiteralType>t).value, (<qt.LiteralType>t).symbol);
            freshType.regularType = <qt.LiteralType>t;
            freshType.freshType = freshType;
            (<qt.LiteralType>t).freshType = freshType;
          }
          return (<qt.LiteralType>t).freshType;
        }
        return t;
      }
      regularTypeOfLiteralType(t: Type): Type {
        return t.flags & TypeFlags.Literal
          ? (<qt.LiteralType>t).regularType
          : t.flags & TypeFlags.Union
          ? (<qt.UnionType>t).regularType || ((<qt.UnionType>t).regularType = this.unionType(sameMap((<qt.UnionType>t).types, getRegularTypeOfLiteralType)) as qt.UnionType)
          : t;
      }
      mappedType(t: Type, mapper: qt.TypeMapper): Type | undefined {
        switch (mapper.kind) {
          case qt.TypeMapKind.Simple:
            return t === mapper.source ? mapper.target : t;
          case qt.TypeMapKind.Array:
            const sources = mapper.sources;
            const targets = mapper.targets;
            for (let i = 0; i < sources.length; i++) {
              if (t === sources[i]) return targets ? targets[i] : anyType;
            }
            return t;
          case qt.TypeMapKind.Function:
            return mapper.func(t);
          case qt.TypeMapKind.Composite:
          case qt.TypeMapKind.Merged:
            const t1 = this.mappedType(t, mapper.mapper1);
            return t1 !== t && mapper.kind === qt.TypeMapKind.Composite ? instantiateType(t1, mapper.mapper2) : this.mappedType(t1, mapper.mapper2);
        }
      }
      permissive(t: Type) {
        return t.flags & (TypeFlags.Primitive | TypeFlags.AnyOrUnknown | TypeFlags.Never) ? t : t.permissive || (t.permissive = instantiateType(t, permissiveMapper));
      }
      restrictiveInstantiation(t: Type) {
        if (t.flags & (TypeFlags.Primitive | TypeFlags.AnyOrUnknown | TypeFlags.Never)) return t;
        if (t.restrictive) return t.restrictive;
        t.restrictive = instantiateType(t, restrictiveMapper);
        t.restrictive.restrictive = t.restrictive;
        return t.restrictive;
      }
      typeWithoutSignatures(t: Type): Type {
        if (t.flags & TypeFlags.Object) {
          const resolved = resolveStructuredTypeMembers(<qt.ObjectType>t);
          if (resolved.constructSignatures.length || resolved.callSignatures.length) {
            const r = qf.make.objectType(ObjectFlags.Anonymous, t.symbol);
            r.members = resolved.members;
            r.properties = resolved.properties;
            r.callSignatures = qu.empty;
            r.constructSignatures = qu.empty;
            return r;
          }
        } else if (t.flags & TypeFlags.Intersection) {
          return this.intersectionType(qu.map((<qt.IntersectionType>t).types, getTypeWithoutSignatures));
        }
        return t;
      }
      bestMatchIndexedAccessTypeOrUndefined(t: Type, to: Type, name: Type) {
        const i = this.indexedAccessTypeOrUndefined(to, name);
        if (i) return i;
        if (to.flags & TypeFlags.Union) {
          const best = this.bestMatchingType(t, to as qt.UnionType);
          if (best) return this.indexedAccessTypeOrUndefined(best, name);
        }
      }
      normalizedType(type: Type, writing: boolean): Type {
        while (true) {
          const t = this.is.freshLiteral(type)
            ? (<qt.FreshableType>type).regularType
            : t.objectFlags & ObjectFlags.Reference && (<TypeReference>type).node
            ? qf.make.typeReference((<TypeReference>type).target, this.typeArgs(<TypeReference>type))
            : t.flags & TypeFlags.UnionOrIntersection
            ? this.reducedType(t)
            : t.flags & TypeFlags.Substitution
            ? writing
              ? (<qt.SubstitutionType>type).baseType
              : (<qt.SubstitutionType>type).substitute
            : t.flags & TypeFlags.Simplifiable
            ? this.simplifiedType(t, writing)
            : type;
          if (t === type) break;
          type = t;
        }
        return type;
      }
      bestMatchingType(source: Type, target: qt.UnionOrIntersectionType, isRelatedTo = compareTypesAssignable) {
        return (
          findMatchingDiscriminantType(source, target, isRelatedTo, true) ||
          findMatchingTypeReferenceOrTypeAliasReference(source, target) ||
          findBestTypeForObjectLiteral(source, target) ||
          findBestTypeForInvokable(source, target) ||
          findMostOverlappyType(source, target)
        );
      }
      relationKey(source: Type, target: Type, intersectionState: IntersectionState, relation: qu.QMap<RelationComparisonResult>) {
        if (relation === identityRelation && source.id > target.id) {
          const temp = source;
          source = target;
          target = temp;
        }
        const postFix = intersectionState ? ':' + intersectionState : '';
        if (this.is.referenceWithGenericArgs(source) && this.is.referenceWithGenericArgs(target)) {
          const typeParams: Type[] = [];
          return this.typeReferenceId(<TypeReference>source, typeParams) + ',' + this.typeReferenceId(<TypeReference>target, typeParams) + postFix;
        }
        return source.id + ',' + target.id + postFix;
      }
      rootObjectTypeFromIndexedAccessChain(type: Type) {
        let t = type;
        while (t.flags & TypeFlags.IndexedAccess) {
          t = (t as qt.IndexedAccessType).objectType;
        }
        return t;
      }
      supertypeOrUnion(ts: Type[]): Type {
        return literalTypesWithSameBaseType(ts) ? this.unionType(ts) : reduceLeft(ts, (s, t) => (this.is.subtypeOf(s, t) ? t : s))!;
      }
      commonSupertype(ts: Type[]): Type {
        if (!strictNullChecks) return this.supertypeOrUnion(ts);
        const primaryTypes = qu.filter(ts, (t) => !(t.flags & TypeFlags.Nullable));
        return primaryTypes.length ? this.nullableType(this.supertypeOrUnion(primaryTypes), this.falsyFlagsOfTypes(ts) & TypeFlags.Nullable) : this.unionType(ts, qt.UnionReduction.Subtype);
      }
      commonSubtype(ts: Type[]) {
        return reduceLeft(ts, (s, t) => (this.is.subtypeOf(t, s) ? t : s))!;
      }
      elemTypeOfArrayType(t: Type): Type | undefined {
        return this.is.array(t) ? this.typeArgs(t as TypeReference)[0] : undefined;
      }
      tupleElemType(t: Type, i: number) {
        const propType = this.typeOfPropertyOfType(t, ('' + i) as qu.__String);
        if (propType) return propType;
        if (everyType(t, qf.is.tupleType)) return mapType(t, (t) => this.restTypeOfTupleType(<qt.TupleTypeReference>t) || undefinedType);
        return;
      }
      baseTypeOfLiteralType(t: Type): Type {
        return t.flags & TypeFlags.EnumLiteral
          ? this.baseTypeOfEnumLiteralType(<qt.LiteralType>t)
          : t.flags & TypeFlags.StringLiteral
          ? stringType
          : t.flags & TypeFlags.NumberLiteral
          ? numberType
          : t.flags & TypeFlags.BigIntLiteral
          ? bigintType
          : t.flags & TypeFlags.BooleanLiteral
          ? booleanType
          : t.flags & TypeFlags.Union
          ? this.unionType(sameMap((<qt.UnionType>t).types, getBaseTypeOfLiteralType))
          : t;
      }
      widenedLiteralType(t: Type): Type {
        return t.flags & TypeFlags.EnumLiteral && this.is.freshLiteral(t)
          ? this.baseTypeOfEnumLiteralType(<qt.LiteralType>t)
          : t.flags & TypeFlags.StringLiteral && this.is.freshLiteral(t)
          ? stringType
          : t.flags & TypeFlags.NumberLiteral && this.is.freshLiteral(t)
          ? numberType
          : t.flags & TypeFlags.BigIntLiteral && this.is.freshLiteral(t)
          ? bigintType
          : t.flags & TypeFlags.BooleanLiteral && this.is.freshLiteral(t)
          ? booleanType
          : t.flags & TypeFlags.Union
          ? this.unionType(sameMap((<qt.UnionType>t).types, this.widenedLiteralType))
          : t;
      }
      widenedUniqueESSymbolType(t: Type): Type {
        return t.flags & TypeFlags.UniqueESSymbol ? esSymbolType : t.flags & TypeFlags.Union ? this.unionType(sameMap((<qt.UnionType>t).types, getWidenedUniqueESSymbolType)) : t;
      }
      widenedLiteralLikeTypeForContextualType(t: Type, c?: Type) {
        if (!qf.is.literalOfContextualType(t, c)) t = this.widenedUniqueESSymbolType(this.widenedLiteralType(t));
        return t;
      }
      widenedLiteralLikeTypeForContextualReturnTypeIfNeeded(t: Type | undefined, r: Type | undefined, isAsync: boolean) {
        if (t && this.is.unit(t)) {
          const c = !r ? undefined : isAsync ? this.promisedTypeOfPromise(r) : r;
          t = this.widenedLiteralLikeTypeForContextualType(t, c);
        }
        return t;
      }
      widenedLiteralLikeTypeForContextualIterationTypeIfNeeded(t: Type | undefined, r: Type | undefined, k: qt.IterationTypeKind, isAsync: boolean) {
        if (t && this.is.unit(t)) {
          const c = !r ? undefined : this.iterationTypeOfGeneratorFunctionReturnType(k, r, isAsync);
          t = this.widenedLiteralLikeTypeForContextualType(t, c);
        }
        return t;
      }
      falsyFlagsOfTypes(ts: Type[]): TypeFlags {
        let r: TypeFlags = 0;
        for (const t of ts) {
          r |= this.falsyFlags(t);
        }
        return r;
      }
      falsyFlags(t: Type): TypeFlags {
        return t.flags & TypeFlags.Union
          ? this.falsyFlagsOfTypes((<qt.UnionType>t).types)
          : t.flags & TypeFlags.StringLiteral
          ? (<qt.StringLiteralType>t).value === ''
            ? TypeFlags.StringLiteral
            : 0
          : t.flags & TypeFlags.NumberLiteral
          ? (<qt.NumberLiteralType>t).value === 0
            ? TypeFlags.NumberLiteral
            : 0
          : t.flags & TypeFlags.BigIntLiteral
          ? qf.is.zeroBigInt(<qt.BigIntLiteralType>t)
            ? TypeFlags.BigIntLiteral
            : 0
          : t.flags & TypeFlags.BooleanLiteral
          ? t === falseType || t === regularFalseType
            ? TypeFlags.BooleanLiteral
            : 0
          : t.flags & TypeFlags.PossiblyFalsy;
      }
      definitelyFalsyPartOfType(t: Type): Type {
        return t.flags & TypeFlags.String
          ? qu.emptyStringType
          : t.flags & TypeFlags.Number
          ? zeroType
          : t.flags & TypeFlags.BigInt
          ? zeroBigIntType
          : t === regularFalseType ||
            t === falseType ||
            t.flags & (TypeFlags.Void | TypeFlags.Undefined | TypeFlags.Null) ||
            (t.flags & TypeFlags.StringLiteral && (<qt.StringLiteralType>t).value === '') ||
            (t.flags & TypeFlags.NumberLiteral && (<qt.NumberLiteralType>t).value === 0) ||
            (t.flags & TypeFlags.BigIntLiteral && qf.is.zeroBigInt(<qt.BigIntLiteralType>t))
          ? t
          : neverType;
      }
      nullableType(t: Type, f: TypeFlags): Type {
        const missing = f & ~t.flags & (TypeFlags.Undefined | TypeFlags.Null);
        return missing === 0
          ? t
          : missing === TypeFlags.Undefined
          ? this.unionType([t, undefinedType])
          : missing === TypeFlags.Null
          ? this.unionType([t, nullType])
          : this.unionType([t, undefinedType, nullType]);
      }
      optionalType(t: Type): Type {
        qf.assert.true(strictNullChecks);
        return t.flags & TypeFlags.Undefined ? t : this.unionType([t, undefinedType]);
      }
      globalNonNullableTypeInstantiation(t: Type) {
        if (!deferredGlobalNonNullableTypeAlias) deferredGlobalNonNullableTypeAlias = this.globalSymbol('NonNullable' as qu.__String, SymbolFlags.TypeAlias, undefined) || unknownSymbol;
        if (deferredGlobalNonNullableTypeAlias !== unknownSymbol) return this.typeAliasInstantiation(deferredGlobalNonNullableTypeAlias, [t]);
        return this.typeWithFacts(t, qt.TypeFacts.NEUndefinedOrNull);
      }
      nonNullableType(t: Type): Type {
        return strictNullChecks ? this.globalNonNullableTypeInstantiation(t) : t;
      }
      optionalExpressionType(t: Type, e: qt.Expression) {
        return qf.is.expressionOfOptionalChainRoot(e) ? this.nonNullableType(t) : qf.is.optionalChain(e) ? removeOptionalTypeMarker(t) : t;
      }
      regularTypeOfObjectLiteral(t: Type): Type {
        if (!(qf.type.is.objectLiteral(t) && t.objectFlags & ObjectFlags.FreshLiteral)) return t;
        const regularType = (<qt.FreshObjectLiteralType>t).regularType;
        if (regularType) return regularType;
        const resolved = <qt.ResolvedType>t;
        const members = transformTypeOfMembers(t, getRegularTypeOfObjectLiteral);
        const regularNew = qf.make.anonymousType(resolved.symbol, members, resolved.callSignatures, resolved.constructSignatures, resolved.stringIndexInfo, resolved.numberIndexInfo);
        regularNew.flags = resolved.flags;
        regularNew.objectFlags |= resolved.objectFlags & ~ObjectFlags.FreshLiteral;
        (<qt.FreshObjectLiteralType>t).regularType = regularNew;
        return regularNew;
      }
      widenedTypeOfObjectLiteral(t: Type, context: qt.WideningContext | undefined): Type {
        const members = new qc.SymbolTable();
        for (const prop of this.propertiesOfObjectType(t)) {
          members.set(prop.escName, this.widenedProperty(prop, context));
        }
        if (context) {
          for (const prop of this.propertiesOfContext(context)) {
            if (!members.has(prop.escName)) members.set(prop.escName, this.undefinedProperty(prop));
          }
        }
        const stringIndexInfo = this.indexInfoOfType(t, qt.IndexKind.String);
        const numberIndexInfo = this.indexInfoOfType(t, qt.IndexKind.Number);
        const result = qf.make.anonymousType(
          t.symbol,
          members,
          qu.empty,
          qu.empty,
          stringIndexInfo && qf.make.indexInfo(this.widenedType(stringIndexInfo.type), stringIndexInfo.isReadonly),
          numberIndexInfo && qf.make.indexInfo(this.widenedType(numberIndexInfo.type), numberIndexInfo.isReadonly)
        );
        result.objectFlags |= t.objectFlags & (ObjectFlags.JSLiteral | ObjectFlags.NonInferrableType);
        return result;
      }
      widenedType(t: Type) {
        return this.widenedTypeWithContext(t, undefined);
      }
      widenedTypeWithContext(t: Type, context: qt.WideningContext | undefined): Type {
        if (t.objectFlags & ObjectFlags.RequiresWidening) {
          if (context === undefined && t.widened) return t.widened;
          let result: Type | undefined;
          if (t.flags & (TypeFlags.Any | TypeFlags.Nullable)) result = anyType;
          else if (qf.type.is.objectLiteral(t)) {
            result = this.widenedTypeOfObjectLiteral(t, context);
          } else if (t.flags & TypeFlags.Union) {
            const unionContext = context || qf.make.wideningContext(undefined, (<qt.UnionType>type).types);
            const widenedTypes = sameMap((<qt.UnionType>type).types, (t) => (t.flags & TypeFlags.Nullable ? t : this.widenedTypeWithContext(t, unionContext)));
            result = this.unionType(widenedTypes, qu.some(widenedTypes, qf.type.is.emptyObject) ? qt.UnionReduction.Subtype : qt.UnionReduction.Literal);
          } else if (t.flags & TypeFlags.Intersection) {
            result = this.intersectionType(sameMap((<qt.IntersectionType>type).types, this.widenedType));
          } else if (qf.type.is.array(t) || qf.type.is.tuple(t)) {
            result = qf.make.typeReference((<TypeReference>type).target, sameMap(this.typeArgs(<TypeReference>type), this.widenedType));
          }
          if (result && context === undefined) t.widened = result;
          return result || type;
        }
        return type;
      }
      *unmatchedProperties(source: Type, target: Type, requireOptionalProperties: boolean, matchDiscriminantProperties: boolean): IterableIterator<Symbol> {
        const properties = this.propertiesOfType(target);
        for (const targetProp of properties) {
          if (targetProp.isStaticPrivateIdentifierProperty()) continue;
          if (requireOptionalProperties || !(targetProp.flags & SymbolFlags.Optional || this.checkFlags(targetProp) & qt.CheckFlags.Partial)) {
            const sourceProp = this.propertyOfType(source, targetProp.escName);
            if (!sourceProp) yield targetProp;
            else if (matchDiscriminantProperties) {
              const targetType = this.typeOfSymbol(targetProp);
              if (targetType.flags & TypeFlags.Unit) {
                const sourceType = this.typeOfSymbol(sourceProp);
                if (!(sourceType.flags & TypeFlags.Any || this.regularTypeOfLiteralType(sourceType) === this.regularTypeOfLiteralType(targetType))) yield targetProp;
              }
            }
          }
        }
      }
      unmatchedProperty(source: Type, target: Type, requireOptionalProperties: boolean, matchDiscriminantProperties: boolean): Symbol | undefined {
        const result = this.unmatchedProperties(source, target, requireOptionalProperties, matchDiscriminantProperties).next();
        if (!result.done) return result.value;
      }
      typeFactsOfTypes(ts: Type[]): qt.TypeFacts {
        let r: qt.TypeFacts = qt.TypeFacts.None;
        for (const t of ts) {
          r |= this.typeFacts(t);
        }
        return r;
      }
      typeFacts(t: Type): qt.TypeFacts {
        const flags = t.flags;
        if (flags & TypeFlags.String) return strictNullChecks ? qt.TypeFacts.StringStrictFacts : qt.TypeFacts.StringFacts;
        if (flags & TypeFlags.StringLiteral) {
          const isEmpty = (<qt.StringLiteralType>t).value === '';
          return strictNullChecks
            ? isEmpty
              ? qt.TypeFacts.EmptyStringStrictFacts
              : qt.TypeFacts.NonEmptyStringStrictFacts
            : isEmpty
            ? qt.TypeFacts.EmptyStringFacts
            : qt.TypeFacts.NonEmptyStringFacts;
        }
        if (flags & (TypeFlags.Number | TypeFlags.Enum)) return strictNullChecks ? qt.TypeFacts.NumberStrictFacts : qt.TypeFacts.NumberFacts;
        if (flags & TypeFlags.NumberLiteral) {
          const isZero = (<qt.NumberLiteralType>t).value === 0;
          return strictNullChecks ? (isZero ? qt.TypeFacts.ZeroNumberStrictFacts : qt.TypeFacts.NonZeroNumberStrictFacts) : isZero ? qt.TypeFacts.ZeroNumberFacts : qt.TypeFacts.NonZeroNumberFacts;
        }
        if (flags & TypeFlags.BigInt) return strictNullChecks ? qt.TypeFacts.BigIntStrictFacts : qt.TypeFacts.BigIntFacts;
        if (flags & TypeFlags.BigIntLiteral) {
          const isZero = qf.is.zeroBigInt(<qt.BigIntLiteralType>t);
          return strictNullChecks ? (isZero ? qt.TypeFacts.ZeroBigIntStrictFacts : qt.TypeFacts.NonZeroBigIntStrictFacts) : isZero ? qt.TypeFacts.ZeroBigIntFacts : qt.TypeFacts.NonZeroBigIntFacts;
        }
        if (flags & TypeFlags.Boolean) return strictNullChecks ? qt.TypeFacts.BooleanStrictFacts : qt.TypeFacts.BooleanFacts;
        if (flags & TypeFlags.BooleanLike) {
          return strictNullChecks
            ? t === falseType || t === regularFalseType
              ? qt.TypeFacts.FalseStrictFacts
              : qt.TypeFacts.TrueStrictFacts
            : t === falseType || t === regularFalseType
            ? qt.TypeFacts.FalseFacts
            : qt.TypeFacts.TrueFacts;
        }
        if (flags & TypeFlags.Object) {
          return t.objectFlags & ObjectFlags.Anonymous && qf.type.is.emptyObject(<qt.ObjectType>t)
            ? strictNullChecks
              ? qt.TypeFacts.EmptyObjectStrictFacts
              : qt.TypeFacts.EmptyObjectFacts
            : qf.is.functionObjectType(<qt.ObjectType>t)
            ? strictNullChecks
              ? qt.TypeFacts.FunctionStrictFacts
              : qt.TypeFacts.FunctionFacts
            : strictNullChecks
            ? qt.TypeFacts.ObjectStrictFacts
            : qt.TypeFacts.ObjectFacts;
        }
        if (flags & (TypeFlags.Void | TypeFlags.Undefined)) return qt.TypeFacts.UndefinedFacts;
        if (flags & TypeFlags.Null) return qt.TypeFacts.NullFacts;
        if (flags & TypeFlags.ESSymbolLike) return strictNullChecks ? qt.TypeFacts.SymbolStrictFacts : qt.TypeFacts.SymbolFacts;
        if (flags & TypeFlags.NonPrimitive) return strictNullChecks ? qt.TypeFacts.ObjectStrictFacts : qt.TypeFacts.ObjectFacts;
        if (flags & TypeFlags.Never) return qt.TypeFacts.None;
        if (flags & TypeFlags.Instantiable) return this.typeFacts(this.baseConstraintOfType(t) || unknownType);
        if (flags & TypeFlags.UnionOrIntersection) return this.typeFactsOfTypes((<qt.UnionOrIntersectionType>t).types);
        return qt.TypeFacts.All;
      }
      typeWithFacts(t: Type, include: qt.TypeFacts) {
        return filterType(t, (t) => (this.typeFacts(t) & include) !== 0);
      }
      typeWithDefault(t: Type, e: qt.Expression) {
        if (e) {
          const defaultType = this.typeOfExpression(e);
          return this.unionType([this.typeWithFacts(t, qt.TypeFacts.NEUndefined), defaultType]);
        }
        return t;
      }
      typeOfDestructuredProperty(t: Type, name: qt.PropertyName) {
        const nameType = this.literalTypeFromPropertyName(name);
        if (!qf.type.is.usableAsPropertyName(nameType)) return errorType;
        const text = this.propertyNameFromType(nameType);
        return (
          this.constraintForLocation(this.typeOfPropertyOfType(t, text), name) ||
          (NumericLiteral.name(text) && this.indexTypeOfType(t, qt.IndexKind.Number)) ||
          this.indexTypeOfType(t, qt.IndexKind.String) ||
          errorType
        );
      }
      typeOfDestructuredArrayElem(t: Type, i: number) {
        return (everyType(t, qf.type.is.tupleLike) && this.tupleElemType(t, i)) || qf.check.iteratedTypeOrElemType(IterationUse.Destructuring, t, undefinedType, undefined) || errorType;
      }
      typeOfDestructuredSpreadExpression(t: Type) {
        return qf.make.arrayType(qf.check.iteratedTypeOrElemType(IterationUse.Destructuring, t, undefinedType, undefined) || errorType);
      }
      typeFromFlowType(t: qt.FlowType) {
        return t.flags === 0 ? (<qt.IncompleteType>t).type : <Type>t;
      }
      evolvingArrayType(t: Type): qt.EvolvingArrayType {
        return evolvingArrayTypes[t.id] || (evolvingArrayTypes[t.id] = qf.make.evolvingArrayType(t));
      }
      finalArrayType(t: qt.EvolvingArrayType): Type {
        return t.finalArrayType || (t.finalArrayType = qf.make.finalArrayType(t.elemType));
      }
      elemTypeOfEvolvingArrayType(t: Type) {
        return t.objectFlags & ObjectFlags.EvolvingArray ? (<qt.EvolvingArrayType>t).elemType : neverType;
      }
      unionOrEvolvingArrayType(ts: Type[], r: qt.UnionReduction) {
        return qf.is.evolvingArrayTypeList(ts) ? this.evolvingArrayType(this.unionType(qu.map(ts, getElemTypeOfEvolvingArrayType))) : this.unionType(sameMap(ts, finalizeEvolvingArrayType), r);
      }
      constraintForLocation(t: Type, n: Node): Type;
      constraintForLocation(t: Type | undefined, n: Node): Type | undefined;
      constraintForLocation(t: Type, n: Node): Type | undefined {
        if (t && qf.is.constraintPosition(n) && forEachType(t, typeHasNullableConstraint)) return mapType(this.widenedType(t), this.baseConstraintOrType);
        return t;
      }
      thisTypeArg(t: Type): Type | undefined {
        return t.objectFlags & ObjectFlags.Reference && (<TypeReference>t).target === globalThisType ? this.typeArgs(<TypeReference>t)[0] : undefined;
      }
      thisTypeFromContextualType(t: Type): Type | undefined {
        return mapType(t, (t) => {
          return t.flags & TypeFlags.Intersection ? forEach((<qt.IntersectionType>t).types, getThisTypeArg) : this.thisTypeArg(t);
        });
      }
      typeOfPropertyOfContextualType(type: Type, name: qu.__String) {
        return mapType(
          type,
          (t) => {
            if (qf.type.is.genericMapped(t)) {
              const constraint = this.constraintTypeFromMappedType(t);
              const constraintOfConstraint = this.baseConstraintOfType(constraint) || constraint;
              const propertyNameType = this.literalType(qy.get.unescUnderscores(name));
              if (qf.type.is.assignableTo(propertyNameType, constraintOfConstraint)) return substituteIndexedMappedType(t, propertyNameType);
            } else if (t.flags & TypeFlags.StructuredType) {
              const prop = this.propertyOfType(t, name);
              if (prop) return qf.is.circularMappedProperty(prop) ? undefined : this.typeOfSymbol(prop);
              if (qf.type.is.tuple(t)) {
                const restType = this.restTypeOfTupleType(t);
                if (restType && qt.NumericLiteral.name(name) && +name >= 0) return restType;
              }
              return (NumericLiteral.name(name) && this.indexTypeOfContextualType(t, qt.IndexKind.Number)) || this.indexTypeOfContextualType(t, qt.IndexKind.String);
            }
            return;
          },
          true
        );
      }
      indexTypeOfContextualType(t: Type, k: qt.IndexKind) {
        return mapType(t, (t) => this.indexTypeOfStructuredType(t, k), true);
      }
      nonNullableTypeIfNeeded(t: Type) {
        return qf.type.is.nullable(t) ? this.nonNullableType(t) : t;
      }
      privateIdentifierPropertyOfType(t: Type, s: Symbol): Symbol | undefined {
        return this.propertyOfType(t, s.escName);
      }
      suggestionForNonexistentIndexSignature(o: Type, e: qt.ElemAccessExpression, k: Type): string | undefined {
        const hasProp = (name: 'set' | 'get') => {
          const prop = this.propertyOfObjectType(o, <__String>name);
          if (prop) {
            const s = this.singleCallSignature(this.typeOfSymbol(prop));
            return !!s && this.minArgCount(s) >= 1 && qf.type.is.assignableTo(k, this.typeAtPosition(s, 0));
          }
          return false;
        };
        const suggestedMethod = qf.is.assignmentTarget(e) ? 'set' : 'get';
        if (!hasProp(suggestedMethod)) return;
        let suggestion = this.propertyAccessOrIdentifierToString(e.expression);
        if (suggestion === undefined) suggestion = suggestedMethod;
        else suggestion += '.' + suggestedMethod;

        return suggestion;
      }
      singleCallSignature(t: Type): Signature | undefined {
        return this.singleSignature(t, qt.SignatureKind.Call, false);
      }
      singleCallOrConstructSignature(t: Type): Signature | undefined {
        return this.singleSignature(t, qt.SignatureKind.Call, false);
      }
      singleSignature(t: Type, k: qt.SignatureKind, allowMembers: boolean): Signature | undefined {
        if (t.flags & TypeFlags.Object) {
          const resolved = resolveStructuredTypeMembers(<qt.ObjectType>type);
          if (allowMembers || (resolved.properties.length === 0 && !resolved.stringIndexInfo && !resolved.numberIndexInfo)) {
            if (k === qt.SignatureKind.Call && resolved.callSignatures.length === 1 && resolved.constructSignatures.length === 0) return resolved.callSignatures[0];
            if (k === qt.SignatureKind.Construct && resolved.constructSignatures.length === 1 && resolved.callSignatures.length === 0) return resolved.constructSignatures[0];
          }
        }
        return;
      }
      arrayifiedType(t: Type) {
        return t.flags & TypeFlags.Union
          ? mapType(t, getArrayifiedType)
          : t.flags & (TypeFlags.Any | TypeFlags.Instantiable) || qf.type.is.mutableArrayOrTuple(t)
          ? t
          : qf.type.is.tuple(t)
          ? qf.make.tupleType(this.typeArgs(t), t.target.minLength, t.target.hasRestElem, false, t.target.labeledElemDeclarations)
          : qf.make.arrayType(this.indexedAccessType(t, numberType));
      }
      unaryResultType(t: Type): Type {
        if (maybeTypeOfKind(t, TypeFlags.BigIntLike)) return qf.type.is.assignableToKind(t, TypeFlags.AnyOrUnknown) || maybeTypeOfKind(t, TypeFlags.NumberLike) ? numberOrBigIntType : bigintType;
        return numberType;
      }
      baseTypesIfUnrelated(leftType: Type, rightType: Type, isRelated: (left: Type, right: Type) => boolean): [Type, Type] {
        let effectiveLeft = leftType;
        let effectiveRight = rightType;
        const leftBase = this.baseTypeOfLiteralType(leftType);
        const rightBase = this.baseTypeOfLiteralType(rightType);
        if (!qf.is.related(leftBase, rightBase)) {
          effectiveLeft = leftBase;
          effectiveRight = rightBase;
        }
        return [effectiveLeft, effectiveRight];
      }
      typeWithSyntheticDefaultImportType(t: Type, symbol: Symbol, originalSymbol: Symbol): Type {
        if (allowSyntheticDefaultImports && type && type !== errorType) {
          const synthType = type as qt.SyntheticDefaultModuleType;
          if (!synthType.syntheticType) {
            const file = qf.find.up(originalSymbol.declarations, isSourceFile);
            const hasSyntheticDefault = canHaveSyntheticDefault(file, originalSymbol, false);
            if (hasSyntheticDefault) {
              const memberTable = new qc.SymbolTable();
              const newSymbol = new qc.Symbol(SymbolFlags.Alias, InternalSymbol.Default);
              newSymbol.nameType = this.literalType('default');
              newSymbol.target = symbol.resolveSymbol();
              memberTable.set(InternalSymbol.Default, newSymbol);
              const anonymousSymbol = new qc.Symbol(SymbolFlags.TypeLiteral, InternalSymbol.Type);
              const defaultContainingObject = qf.make.anonymousType(anonymousSymbol, memberTable, qu.empty, qu.empty, undefined);
              anonymousSymbol.type = defaultContainingObject;
              synthType.syntheticType = qf.is.validSpreadType(t) ? this.spreadType(t, defaultContainingObject, anonymousSymbol, false) : defaultContainingObject;
            } else {
              synthType.syntheticType = type;
            }
          }
          return synthType.syntheticType;
        }
        return type;
      }
      awaitedTypeOfPromise(t: Type, errorNode?: Node, diagnosticMessage?: qd.Message, arg0?: string | number): Type | undefined {
        const promisedType = this.promisedTypeOfPromise(t, errorNode);
        return promisedType && this.awaitedType(promisedType, errorNode, diagnosticMessage, arg0);
      }
      promisedTypeOfPromise(t: Type, errorNode?: Node): Type | undefined {
        if (qf.type.is.any(t)) return;
        const typeAsPromise = <qt.PromiseOrAwaitableType>type;
        if (typeAsPromise.promisedTypeOfPromise) return typeAsPromise.promisedTypeOfPromise;
        if (qf.type.is.referenceTo(t, this.globalPromiseType(false))) return (typeAsPromise.promisedTypeOfPromise = this.typeArgs(<qt.GenericType>type)[0]);
        const thenFunction = this.typeOfPropertyOfType(t, 'then' as qu.__String)!;
        if (qf.type.is.any(thenFunction)) return;
        const thenSignatures = thenFunction ? this.signaturesOfType(thenFunction, qt.SignatureKind.Call) : qu.empty;
        if (thenSignatures.length === 0) {
          if (errorNode) error(errorNode, qd.msgs.A_promise_must_have_a_then_method);
          return;
        }
        const onfulfilledParamType = this.typeWithFacts(this.unionType(qu.map(thenSignatures, getTypeOfFirstParamOfSignature)), qt.TypeFacts.NEUndefinedOrNull);
        if (qf.type.is.any(onfulfilledParamType)) return;
        const onfulfilledParamSignatures = this.signaturesOfType(onfulfilledParamType, qt.SignatureKind.Call);
        if (onfulfilledParamSignatures.length === 0) {
          if (errorNode) error(errorNode, qd.msgs.The_first_param_of_the_then_method_of_a_promise_must_be_a_callback);
          return;
        }
        return (typeAsPromise.promisedTypeOfPromise = this.unionType(qu.map(onfulfilledParamSignatures, getTypeOfFirstParamOfSignature), qt.UnionReduction.Subtype));
      }
      awaitedType(t: Type, errorNode?: Node, diagnosticMessage?: qd.Message, arg0?: string | number): Type | undefined {
        if (qf.type.is.any(t)) return type;
        const typeAsAwaitable = <qt.PromiseOrAwaitableType>type;
        if (typeAsAwaitable.awaitedTypeOfType) return typeAsAwaitable.awaitedTypeOfType;
        return (typeAsAwaitable.awaitedTypeOfType = mapType(t, errorNode ? (constituentType) => this.awaitedTypeWorker(constituentType, errorNode, diagnosticMessage, arg0) : getAwaitedTypeWorker));
      }
      awaitedTypeWorker(t: Type, errorNode?: Node, diagnosticMessage?: qd.Message, arg0?: string | number): Type | undefined {
        const typeAsAwaitable = <qt.PromiseOrAwaitableType>type;
        if (typeAsAwaitable.awaitedTypeOfType) return typeAsAwaitable.awaitedTypeOfType;
        const promisedType = this.promisedTypeOfPromise(t);
        if (promisedType) {
          if (t.id === promisedType.id || awaitedTypeStack.lastIndexOf(promisedType.id) >= 0) {
            if (errorNode) error(errorNode, qd.msgs.Type_is_referenced_directly_or_indirectly_in_the_fulfillment_callback_of_its_own_then_method);
            return;
          }
          awaitedTypeStack.push(t.id);
          const awaitedType = this.awaitedType(promisedType, errorNode, diagnosticMessage, arg0);
          awaitedTypeStack.pop();
          if (!awaitedType) return;
          return (typeAsAwaitable.awaitedTypeOfType = awaitedType);
        }
        if (qf.is.thenableType(t)) {
          if (errorNode) {
            if (!diagnosticMessage) return qu.fail();
            error(errorNode, diagnosticMessage, arg0);
          }
          return;
        }
        return (typeAsAwaitable.awaitedTypeOfType = type);
      }
      augmentedPropertiesOfType(t: Type): Symbol[] {
        type = this.apparentType(t);
        const propsByName = new qc.SymbolTable(this.propertiesOfType(t));
        const functionType = this.signaturesOfType(t, qt.SignatureKind.Call).length
          ? globalCallableFunctionType
          : this.signaturesOfType(t, qt.SignatureKind.Construct).length
          ? globalNewableFunctionType
          : undefined;
        if (functionType) {
          forEach(this.propertiesOfType(functionType), (p) => {
            if (!propsByName.has(p.escName)) propsByName.set(p.escName, p);
          });
        }
        return this.namedMembers(propsByName);
      }
      iterationTypesOfIterableWorker(t: Type, use: IterationUse, errorNode: Node | undefined) {
        if (qf.type.is.any(t)) return anyIterationTypes;
        if (use & IterationUse.AllowsAsyncIterablesFlag) {
          const iterationTypes = this.iterationTypesOfIterableCached(t, asyncIterationTypesResolver) || this.iterationTypesOfIterableFast(t, asyncIterationTypesResolver);
          if (iterationTypes) return iterationTypes;
        }
        if (use & IterationUse.AllowsSyncIterablesFlag) {
          const iterationTypes = this.iterationTypesOfIterableCached(t, syncIterationTypesResolver) || this.iterationTypesOfIterableFast(t, syncIterationTypesResolver);
          if (iterationTypes) {
            if (use & IterationUse.AllowsAsyncIterablesFlag) {
              if (iterationTypes !== noIterationTypes) return setCachedIterationTypes(t, 'iterationTypesOfAsyncIterable', this.asyncFromSyncIterationTypes(iterationTypes, errorNode));
            }
            return iterationTypes;
          }
        }
        if (use & IterationUse.AllowsAsyncIterablesFlag) {
          const iterationTypes = this.iterationTypesOfIterableSlow(t, asyncIterationTypesResolver, errorNode);
          if (iterationTypes !== noIterationTypes) return iterationTypes;
        }
        if (use & IterationUse.AllowsSyncIterablesFlag) {
          const iterationTypes = this.iterationTypesOfIterableSlow(t, syncIterationTypesResolver, errorNode);
          if (iterationTypes !== noIterationTypes) {
            if (use & IterationUse.AllowsAsyncIterablesFlag)
              return setCachedIterationTypes(t, 'iterationTypesOfAsyncIterable', iterationTypes ? this.asyncFromSyncIterationTypes(iterationTypes, errorNode) : noIterationTypes);
            return iterationTypes;
          }
        }
        return noIterationTypes;
      }
      iterationTypesOfIterableCached(t: Type, resolver: IterationTypesResolver) {
        return this.cachedIterationTypes(t, resolver.iterableCacheKey);
      }
      iterationTypesOfGlobalIterableType(globalType: Type, resolver: IterationTypesResolver) {
        const globalIterationTypes = this.iterationTypesOfIterableCached(globalType, resolver) || this.iterationTypesOfIterableSlow(globalType, resolver, undefined);
        return globalIterationTypes === noIterationTypes ? defaultIterationTypes : globalIterationTypes;
      }
      iterationTypesOfIterableFast(t: Type, resolver: IterationTypesResolver) {
        let globalType: Type;
        if (qf.type.is.referenceTo(t, (globalType = resolver.this.globalIterableType(false))) || qf.type.is.referenceTo(t, (globalType = resolver.this.globalIterableIteratorType(false)))) {
          const [yieldType] = this.typeArgs(type as qt.GenericType);
          const { returnType, nextType } = this.iterationTypesOfGlobalIterableType(globalType, resolver);
          return setCachedIterationTypes(t, resolver.iterableCacheKey, qf.make.iterationTypes(yieldType, returnType, nextType));
        }
        if (qf.type.is.referenceTo(t, resolver.this.globalGeneratorType(false))) {
          const [yieldType, returnType, nextType] = this.typeArgs(type as qt.GenericType);
          return setCachedIterationTypes(t, resolver.iterableCacheKey, qf.make.iterationTypes(yieldType, returnType, nextType));
        }
      }
      iterationTypesOfIterableSlow(t: Type, resolver: IterationTypesResolver, errorNode: Node | undefined) {
        const method = this.propertyOfType(t, qu.this.propertyNameForKnownSymbolName(resolver.iteratorSymbolName));
        const methodType = method && !(method.flags & SymbolFlags.Optional) ? this.typeOfSymbol(method) : undefined;
        if (qf.type.is.any(methodType)) return setCachedIterationTypes(t, resolver.iterableCacheKey, anyIterationTypes);
        const signatures = methodType ? this.signaturesOfType(methodType, qt.SignatureKind.Call) : undefined;
        if (!some(signatures)) return setCachedIterationTypes(t, resolver.iterableCacheKey, noIterationTypes);
        const iteratorType = this.unionType(qu.map(signatures, this.returnTypeOfSignature), qt.UnionReduction.Subtype);
        const iterationTypes = this.iterationTypesOfIterator(iteratorType, resolver, errorNode) ?? noIterationTypes;
        return setCachedIterationTypes(t, resolver.iterableCacheKey, iterationTypes);
      }
      iterationTypesOfIterator(t: Type, resolver: IterationTypesResolver, errorNode: Node | undefined) {
        if (qf.type.is.any(t)) return anyIterationTypes;
        const iterationTypes = this.iterationTypesOfIteratorCached(t, resolver) || this.iterationTypesOfIteratorFast(t, resolver) || this.iterationTypesOfIteratorSlow(t, resolver, errorNode);
        return iterationTypes === noIterationTypes ? undefined : iterationTypes;
      }
      iterationTypesOfIteratorCached(t: Type, resolver: IterationTypesResolver) {
        return this.cachedIterationTypes(t, resolver.iteratorCacheKey);
      }
      iterationTypesOfIteratorFast(t: Type, resolver: IterationTypesResolver) {
        const globalType = resolver.this.globalIterableIteratorType(false);
        if (qf.type.is.referenceTo(t, globalType)) {
          const [yieldType] = this.typeArgs(type as qt.GenericType);
          const globalIterationTypes = this.iterationTypesOfIteratorCached(globalType, resolver) || this.iterationTypesOfIteratorSlow(globalType, resolver, undefined);
          const { returnType, nextType } = globalIterationTypes === noIterationTypes ? defaultIterationTypes : globalIterationTypes;
          return setCachedIterationTypes(t, resolver.iteratorCacheKey, qf.make.iterationTypes(yieldType, returnType, nextType));
        }
        if (qf.type.is.referenceTo(t, resolver.this.globalIteratorType(false)) || qf.type.is.referenceTo(t, resolver.this.globalGeneratorType(false))) {
          const [yieldType, returnType, nextType] = this.typeArgs(type as qt.GenericType);
          return setCachedIterationTypes(t, resolver.iteratorCacheKey, qf.make.iterationTypes(yieldType, returnType, nextType));
        }
      }
      iterationTypesOfIteratorResult(t: Type) {
        if (qf.type.is.any(t)) return anyIterationTypes;
        const cachedTypes = this.cachedIterationTypes(t, 'iterationTypesOfIteratorResult');
        if (cachedTypes) return cachedTypes;
        if (qf.type.is.referenceTo(t, this.globalIteratorYieldResultType(false))) {
          const yieldType = this.typeArgs(type as qt.GenericType)[0];
          return setCachedIterationTypes(t, 'iterationTypesOfIteratorResult', qf.make.iterationTypes(yieldType, undefined));
        }
        if (qf.type.is.referenceTo(t, this.globalIteratorReturnResultType(false))) {
          const returnType = this.typeArgs(type as qt.GenericType)[0];
          return setCachedIterationTypes(t, 'iterationTypesOfIteratorResult', qf.make.iterationTypes(undefined));
        }
        const yieldIteratorResult = filterType(t, isYieldIteratorResult);
        const yieldType = yieldIteratorResult !== neverType ? this.typeOfPropertyOfType(yieldIteratorResult, 'value' as qu.__String) : undefined;
        const returnIteratorResult = filterType(t, isReturnIteratorResult);
        const returnType = returnIteratorResult !== neverType ? this.typeOfPropertyOfType(returnIteratorResult, 'value' as qu.__String) : undefined;
        if (!yieldType && !returnType) return setCachedIterationTypes(t, 'iterationTypesOfIteratorResult', noIterationTypes);
        return setCachedIterationTypes(t, 'iterationTypesOfIteratorResult', qf.make.iterationTypes(yieldType, returnType || voidType, undefined));
      }
      iterationTypesOfMethod(t: Type, resolver: IterationTypesResolver, methodName: 'next' | 'return' | 'throw', errorNode: Node | undefined): qt.IterationTypes | undefined {
        const method = this.propertyOfType(t, methodName as qu.__String);
        if (!method && methodName !== 'next') return;
        const methodType =
          method && !(methodName === 'next' && method.flags & SymbolFlags.Optional)
            ? methodName === 'next'
              ? this.typeOfSymbol(method)
              : this.typeWithFacts(this.typeOfSymbol(method), qt.TypeFacts.NEUndefinedOrNull)
            : undefined;
        if (qf.type.is.any(methodType)) return methodName === 'next' ? anyIterationTypes : anyIterationTypesExceptNext;
        const methodSignatures = methodType ? this.signaturesOfType(methodType, qt.SignatureKind.Call) : qu.empty;
        if (methodSignatures.length === 0) {
          if (errorNode) {
            const diagnostic = methodName === 'next' ? resolver.mustHaveANextMethodDiagnostic : resolver.mustBeAMethodDiagnostic;
            error(errorNode, diagnostic, methodName);
          }
          return methodName === 'next' ? anyIterationTypes : undefined;
        }
        let methodParamTypes: Type[] | undefined;
        let methodReturnTypes: Type[] | undefined;
        for (const signature of methodSignatures) {
          if (methodName !== 'throw' && qu.some(signature.params)) methodParamTypes = qu.append(methodParamTypes, this.typeAtPosition(signature, 0));
          methodReturnTypes = qu.append(methodReturnTypes, this.returnTypeOfSignature(signature));
        }
        let returnTypes: Type[] | undefined;
        let nextType: Type | undefined;
        if (methodName !== 'throw') {
          const methodParamType = methodParamTypes ? this.unionType(methodParamTypes) : unknownType;
          if (methodName === 'next') nextType = methodParamType;
          else if (methodName === 'return') {
            const resolvedMethodParamType = resolver.resolveIterationType(methodParamType, errorNode) || anyType;
            returnTypes = qu.append(returnTypes, resolvedMethodParamType);
          }
        }
        let yieldType: Type;
        const methodReturnType = methodReturnTypes ? this.unionType(methodReturnTypes, qt.UnionReduction.Subtype) : neverType;
        const resolvedMethodReturnType = resolver.resolveIterationType(methodReturnType, errorNode) || anyType;
        const iterationTypes = this.iterationTypesOfIteratorResult(resolvedMethodReturnType);
        if (iterationTypes === noIterationTypes) {
          if (errorNode) error(errorNode, resolver.mustHaveAValueDiagnostic, methodName);
          yieldType = anyType;
          returnTypes = qu.append(returnTypes, anyType);
        } else {
          yieldType = iterationTypes.yieldType;
          returnTypes = qu.append(returnTypes, iterationTypes.returnType);
        }
        return qf.make.iterationTypes(yieldType, this.unionType(returnTypes), nextType);
      }
      iterationTypesOfIteratorSlow(t: Type, resolver: IterationTypesResolver, errorNode: Node | undefined) {
        const iterationTypes = combineIterationTypes([
          this.iterationTypesOfMethod(t, resolver, 'next', errorNode),
          this.iterationTypesOfMethod(t, resolver, 'return', errorNode),
          this.iterationTypesOfMethod(t, resolver, 'throw', errorNode),
        ]);
        return setCachedIterationTypes(t, resolver.iteratorCacheKey, iterationTypes);
      }
      iterationTypeOfGeneratorFunctionReturnType(kind: qt.IterationTypeKind, returnType: Type, isAsyncGenerator: boolean): Type | undefined {
        if (qf.type.is.any(returnType)) return;
        const iterationTypes = this.iterationTypesOfGeneratorFunctionReturnType(returnType, isAsyncGenerator);
        return iterationTypes && iterationTypes[this.iterationTypesKeyFromIterationTypeKind(kind)];
      }
      iterationTypesOfGeneratorFunctionReturnType(t: Type, isAsyncGenerator: boolean) {
        if (qf.type.is.any(t)) return anyIterationTypes;
        const use = isAsyncGenerator ? IterationUse.AsyncGeneratorReturnType : IterationUse.GeneratorReturnType;
        const resolver = isAsyncGenerator ? asyncIterationTypesResolver : syncIterationTypesResolver;
        return this.iterationTypesOfIterable(t, use, undefined) || this.iterationTypesOfIterator(t, resolver, undefined);
      }
      cachedIterationTypes(t: Type, cacheKey: qt.MatchingKeys<qt.IterableOrIteratorType, qt.IterationTypes | undefined>) {
        return (type as qt.IterableOrIteratorType)[cacheKey];
      }
      iterationTypesOfIterable(t: Type, use: IterationUse, errorNode: Node | undefined) {
        if (qf.type.is.any(t)) return anyIterationTypes;
        if (!(t.flags & TypeFlags.Union)) {
          const iterationTypes = this.iterationTypesOfIterableWorker(t, use, errorNode);
          if (iterationTypes === noIterationTypes) {
            if (errorNode) reportTypeNotIterableError(errorNode, type, !!(use & IterationUse.AllowsAsyncIterablesFlag));
            return;
          }
          return iterationTypes;
        }
        const cacheKey = use & IterationUse.AllowsAsyncIterablesFlag ? 'iterationTypesOfAsyncIterable' : 'iterationTypesOfIterable';
        const cachedTypes = this.cachedIterationTypes(t, cacheKey);
        if (cachedTypes) return cachedTypes === noIterationTypes ? undefined : cachedTypes;
        let allIterationTypes: qt.IterationTypes[] | undefined;
        for (const constituent of (type as qt.UnionType).types) {
          const iterationTypes = this.iterationTypesOfIterableWorker(constituent, use, errorNode);
          if (iterationTypes === noIterationTypes) {
            if (errorNode) {
              reportTypeNotIterableError(errorNode, type, !!(use & IterationUse.AllowsAsyncIterablesFlag));
              errorNode = undefined;
            }
          } else {
            allIterationTypes = qu.append(allIterationTypes, iterationTypes);
          }
        }
        const iterationTypes = allIterationTypes ? combineIterationTypes(allIterationTypes) : noIterationTypes;
        setCachedIterationTypes(t, cacheKey, iterationTypes);
        return iterationTypes === noIterationTypes ? undefined : iterationTypes;
      }
    })();
    new = new (class extends Base {})();
    check = new (class extends Base {})();
  })());
}
export interface Ftype extends ReturnType<typeof newType> {}
export function newSymb(f: qt.Frame) {
  interface Frame extends qt.Frame {
    get: Fget;
    has: Fhas;
    is: Fis;
  }
  const qf = f as Frame;
  return (qf.symb = new (class Fsymbol {
    is = new (class extends Fsymbol {
      anySymbolAccessible(ss: Symbol[] | undefined, enclosingDeclaration: Node | undefined, initialSymbol: Symbol, meaning: SymbolFlags, compute: boolean): SymbolAccessibilityResult | undefined {
        if (!qu.length(ss)) return;
        let hadAccessibleChain: Symbol | undefined;
        let earlyModuleBail = false;
        for (const s of ss!) {
          const c = qf.get.accessibleSymbolChain(s, enclosingDeclaration, meaning, false);
          if (c) {
            hadAccessibleChain = s;
            const hasAccessibleDeclarations = hasVisibleDeclarations(c[0], compute);
            if (hasAccessibleDeclarations) return hasAccessibleDeclarations;
          } else {
            if (qu.some(s.declarations, hasNonGlobalAugmentationExternalModuleSymbol)) {
              if (compute) {
                earlyModuleBail = true;
                continue;
              }
              return { accessibility: SymbolAccessibility.Accessible };
            }
          }
          let cs = getContainersOfSymbol(s, enclosingDeclaration);
          const firstDecl: Node | false = !!qu.length(s.declarations) && first(s.declarations);
          if (!qu.length(cs) && meaning & SymbolFlags.Value && firstDecl && firstDecl.kind === Syntax.ObjectLiteralExpression) {
            if (firstDecl.parent && firstDecl.parent.kind === Syntax.VariableDeclaration && firstDecl === firstDecl.parent.initer) containers = [qf.get.symbolOfNode(firstDecl.parent)];
          }
          const parentResult = this.anySymbolAccessible(cs, enclosingDeclaration, initialSymbol, initialSymbol === s ? getQualifiedLeftMeaning(meaning) : meaning, compute);
          if (parentResult) return parentResult;
        }
        if (earlyModuleBail) {
          return { accessibility: SymbolAccessibility.Accessible };
        }
        if (hadAccessibleChain) {
          return {
            accessibility: SymbolAccessibility.NotAccessible,
            errorSymbolName: initialSymbol.symbolToString(enclosingDeclaration, meaning),
            errorModuleName: hadAccessibleChain !== initialSymbol ? hadAccessibleChain.symbolToString(enclosingDeclaration, SymbolFlags.Namespace) : undefined,
          };
        }
        return;
      }
      isKnown() {
        return qu.startsWith(this.escName as string, '__@');
      }
      isExportDefault() {
        const ds = this.declarations;
        return qu.length(ds) > 0 && qf.has.syntacticModifier(ds![0] as Node, ModifierFlags.Default);
      }
      isTransient(): this is qt.TransientSymbol {
        return (this.flags & SymbolFlags.Transient) !== 0;
      }
      isAbstractConstructor() {
        if (this.flags & SymbolFlags.Class) {
          const d = this.classLikeDeclaration();
          return !!d && qf.has.syntacticModifier(d, ModifierFlags.Abstract);
        }
        return false;
      }
      isShorthandAmbientModule() {
        return qf.is.shorthandAmbientModule(this.valueDeclaration);
      }
      isFunction() {
        if (!this.valueDeclaration) return false;
        const v = this.valueDeclaration;
        return v.kind === Syntax.FunctionDeclaration || (v.kind === Syntax.VariableDeclaration && v.initer && qf.is.functionLike(v.initer));
      }
      isUMDExport() {
        return this.declarations?.[0] && this.declarations[0].kind === Syntax.NamespaceExportDeclaration;
      }
      isNamespaceMember() {
        return !(this.flags & SymbolFlags.Prototype || this.escName === 'prototype' || (this.valueDeclaration?.parent && qf.is.classLike(this.valueDeclaration.parent)));
      }
      isConstEnumSymbol() {
        return (this.flags & SymbolFlags.ConstEnum) !== 0;
      }
      isPropertyOrMethodDeclaration() {
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
      neverReducedProperty(s: Symbol) {
        return this.discriminantWithNeverType(s) || this.conflictingPrivateProperty(s);
      }
      discriminantWithNeverType(s: Symbol) {
        return !(s.flags & SymbolFlags.Optional) && (s.checkFlags() & (CheckFlags.Discriminant | CheckFlags.HasNeverType)) === CheckFlags.Discriminant && !!(s.typeOfSymbol().flags & TypeFlags.Never);
      }
      conflictingPrivateProperty(s: Symbol) {
        return !s.valueDeclaration && !!(s.checkFlags() & CheckFlags.ContainsPrivate);
      }
      spreadableProperty(s: Symbol): boolean {
        return (
          !qu.some(s.declarations, this.privateIdentifierPropertyDeclaration) &&
          (!(s.flags & (SymbolFlags.Method | SymbolFlags.GetAccessor | SymbolFlags.SetAccessor)) || !s.declarations.some((d) => this.classLike(d.parent)))
        );
      }
      enumTypeRelatedTo(s: Symbol, t: Symbol, errorReporter?: qt.ErrorReporter) {
        if (s === t) return true;
        const id = s.getId() + ',' + t.getId();
        const entry = enumRelation.get(id);
        if (entry !== undefined && !(!(entry & qt.RelationComparisonResult.Reported) && entry & qt.RelationComparisonResult.Failed && errorReporter))
          return !!(entry & qt.RelationComparisonResult.Succeeded);
        if (s.escName !== t.escName || !(s.flags & SymbolFlags.RegularEnum) || !(t.flags & SymbolFlags.RegularEnum)) {
          enumRelation.set(id, qt.RelationComparisonResult.Failed | qt.RelationComparisonResult.Reported);
          return false;
        }
        const targetEnumType = t.typeOfSymbol();
        for (const property of qf.get.propertiesOfType(s.typeOfSymbol())) {
          if (property.flags & SymbolFlags.EnumMember) {
            const targetProperty = qf.get.propertyOfType(targetEnumType, property.escName);
            if (!targetProperty || !(targetProperty.flags & SymbolFlags.EnumMember)) {
              if (errorReporter) {
                errorReporter(qd.msgs.Property_0_is_missing_in_type_1, property.name, typeToString(getDeclaredTypeOfSymbol(t), undefined, qt.TypeFormatFlags.UseFullyQualifiedType));
                enumRelation.set(id, qt.RelationComparisonResult.Failed | qt.RelationComparisonResult.Reported);
              } else enumRelation.set(id, qt.RelationComparisonResult.Failed);
              return false;
            }
          }
        }
        enumRelation.set(id, qt.RelationComparisonResult.Succeeded);
        return true;
      }
      propertyInClassDerivedFrom(s: Symbol, baseClass: Type | undefined) {
        return forEachProperty(s, (sp) => {
          const sClass = getDeclaringClass(sp);
          return sClass ? hasBaseType(sClass, baseClass) : false;
        });
      }
      validOverrideOf(sProp: Symbol, tProp: Symbol) {
        return !forEachProperty(tProp, (s) => (s.declarationModifierFlags() & ModifierFlags.Protected ? !isPropertyInClassDerivedFrom(sProp, getDeclaringClass(s)) : false));
      }
      propertyIdenticalTo(sProp: Symbol, tProp: Symbol): boolean {
        return compareProperties(sProp, tProp, compareTypesIdentical) !== qt.Ternary.False;
      }
      propertyDeclaredInAncestorClass(s: Symbol): boolean {
        if (!(s.parent!.flags & SymbolFlags.Class)) return false;
        let classType: qt.InterfaceType | undefined = s.parent!.typeOfSymbol() as qt.InterfaceType;
        while (true) {
          classType = classType.symbol && (getSuperClass(classType) as qt.InterfaceType | undefined);
          if (!classType) return false;
          const superProperty = qf.get.propertyOfType(classType, s.escName);
          if (superProperty && superProperty.valueDeclaration) return true;
        }
      }
    })();
    has = new (class extends Fsymbol {
      exportAssignmentSymbol(moduleSymbol: Symbol): boolean {
        return moduleSymbol.exports!.get(InternalSymbol.ExportEquals) !== undefined;
      }
      exportedMembers(moduleSymbol: Symbol) {
        return forEachEntry(moduleSymbol.exports!, (_, id) => id !== 'export=');
      }
    })();
    get = new (class extends Fsymbol {
      propertyNameForUnique(): qu.__String {
        return `__@${this.id}@${this.escName}` as qu.__String;
      }
      nameForPrivateIdentifier(s: qu.__String): qu.__String {
        return `__#${this.id}@${s}` as qu.__String;
      }
      localForExportDefault() {
        return this.isExportDefault() ? this.declarations![0].localSymbol : undefined;
      }
      nonAugmentationDeclaration() {
        const ds = this.declarations;
        return ds && qf.find.up(ds, (d) => !qf.is.externalModuleAugmentation(d as Node) && !(d.kind === Syntax.ModuleDeclaration && qf.is.globalScopeAugmentation(d as Node)));
      }
      classLikeDeclaration(): qt.ClassLikeDeclaration | undefined {
        const ds = this.declarations;
        return ds && qf.find.up(ds, qf.is.classLike);
      }
      combinedLocalAndExportSymbolFlags(): SymbolFlags {
        return this.exportSymbol ? this.exportSymbol.flags | this.flags : this.flags;
      }
      declarationOfKind<T extends qt.Declaration>(k: T['kind']): T | undefined {
        const ds = this.declarations;
        if (ds) {
          for (const d of ds) {
            if (d.kind === k) return d as T;
          }
        }
        return;
      }
    })();
    new = new (class extends Fsymbol {})();
    check = new (class extends Fsymbol {})();
  })());
}
export interface Fsymb extends ReturnType<typeof newSymb> {}
export function newSign(f: qt.Frame) {
  interface Frame extends qt.Frame {
    get: Fget;
    has: Fhas;
    is: Fis;
  }
  const qf = f as Frame;
  return (qf.sign = new (class Fsignature {
    is = new (class extends Fsignature {
      resolvingReturnTypeOfSignature(signature: Signature) {
        return !signature.resolvedReturn && findResolutionCycleStartIndex(signature, TypeSystemPropertyName.ResolvedReturnType) >= 0;
      }
      signatureAssignableTo(s: Signature, t: Signature, ignoreReturnTypes: boolean): boolean {
        return compareSignaturesRelated(s, t, ignoreReturnTypes ? SignatureCheckMode.IgnoreReturnTypes : 0, false, undefined, undefined, compareTypesAssignable, undefined) !== qt.Ternary.False;
      }
      anySignature(s: Signature) {
        return (
          !s.typeParams &&
          (!s.thisParam || this.any(getTypeOfParam(s.thisParam))) &&
          s.params.length === 1 &&
          s.hasRestParam() &&
          (getTypeOfParam(s.params[0]) === anyArrayType || this.any(getTypeOfParam(s.params[0]))) &&
          this.any(qf.get.returnTypeOfSignature(s))
        );
      }
      implementationCompatibleWithOverload(implementation: Signature, overload: Signature): boolean {
        const erasedSource = getErasedSignature(implementation);
        const erasedTarget = getErasedSignature(overload);
        const sourceReturnType = qf.get.returnTypeOfSignature(erasedSource);
        const targetReturnType = qf.get.returnTypeOfSignature(erasedTarget);
        if (
          targetReturnType === voidType ||
          qf.type.check.relatedTo(targetReturnType, sourceReturnType, assignableRelation) ||
          qf.type.check.relatedTo(sourceReturnType, targetReturnType, assignableRelation)
        )
          return this.signatureAssignableTo(erasedSource, erasedTarget, true);
        return false;
      }
      matchingSignature(s: Signature, t: Signature, partialMatch: boolean) {
        const sParamCount = getParamCount(s);
        const tParamCount = getParamCount(t);
        const sMinArgCount = getMinArgCount(s);
        const tMinArgCount = getMinArgCount(t);
        const sHasRestParam = hasEffectiveRestParam(s);
        const tHasRestParam = hasEffectiveRestParam(t);
        if (sParamCount === tParamCount && sMinArgCount === tMinArgCount && sHasRestParam === tHasRestParam) return true;
        if (partialMatch && sMinArgCount <= tMinArgCount) return true;
        return false;
      }
      aritySmaller(signature: Signature, t: SignatureDeclaration) {
        let tParamCount = 0;
        for (; tParamCount < t.params.length; tParamCount++) {
          const param = t.params[tParamCount];
          if (param.initer || param.questionToken || param.dot3Token || this.docOptionalParam(param)) break;
        }
        if (t.params.length && paramIsThqy.this.keyword(t.params[0])) tParamCount--;
        return !hasEffectiveRestParam(signature) && getParamCount(signature) < tParamCount;
      }
      genericFunctionReturningFunction(s: Signature) {
        return !!(s.typeParams && this.functionType(qf.get.returnTypeOfSignature(s)));
      }
      constructorAccessible(n: qt.NewExpression, signature: Signature) {
        if (!signature || !signature.declaration) return true;
        const d = signature.declaration;
        const modifiers = qf.get.selectedEffectiveModifierFlags(d, ModifierFlags.NonPublicAccessibilityModifier);
        if (!modifiers || d.kind !== Syntax.Constructor) return true;
        const declaringClassDeclaration = d.parent.symbol.classLikeDeclaration()!;
        const declaringClass = getDeclaredTypeOfSymbol(d.parent.symbol);
        if (!isNodeWithinClass(n, declaringClassDeclaration)) {
          const containingClass = qf.get.containingClass(n);
          if (containingClass && modifiers & ModifierFlags.Protected) {
            const containingType = getTypeOfNode(containingClass);
            if (typeHasProtectedAccessibleBase(d.parent.symbol, containingType as qt.InterfaceType)) return true;
          }
          if (modifiers & ModifierFlags.Private) error(n, qd.msgs.Constructor_of_class_0_is_private_and_only_accessible_within_the_class_declaration, typeToString(declaringClass));
          if (modifiers & ModifierFlags.Protected) error(n, qd.msgs.Constructor_of_class_0_is_protected_and_only_accessible_within_the_class_declaration, typeToString(declaringClass));
          return false;
        }
        return true;
      }
    })();
    has = new (class extends Fsignature {
      hasRestParam() {
        return !!(this.flags & SignatureFlags.HasRestParam);
      }
      hasLiteralTypes() {
        return !!(this.flags & SignatureFlags.HasLiteralTypes);
      }
      typePredicateOrNeverReturnType(signature: Signature) {
        return !!(getTypePredicateOfSignature(signature) || (signature.declaration && (getReturnTypeFromAnnotation(signature.declaration) || unknownType).flags & TypeFlags.Never));
      }
      correctTypeArgArity(signature: Signature, typeArgs: Nodes<qt.Typing> | undefined) {
        const numTypeParams = qu.length(signature.typeParams);
        const minTypeArgCount = getMinTypeArgCount(signature.typeParams);
        return !qu.some(typeArgs) || (typeArgs.length >= minTypeArgCount && typeArgs.length <= numTypeParams);
      }
      effectiveRestParam(s: Signature) {
        if (s.hasRestParam()) {
          const restType = s.params[s.params.length - 1].typeOfSymbol();
          return !this.tupleType(restType) || restType.target.hasRestElem;
        }
        return false;
      }
    })();
    get = new (class extends Fsignature {})();
    new = new (class extends Fsignature {})();
    check = new (class extends Fsignature {})();
  })());
}
export interface Fsign extends ReturnType<typeof newSign> {}
export function newDecl(f: qt.Frame) {
  interface Frame extends qt.Frame {
    calc: Fcalc;
    make: Fmake;
    emit: Femit;
    get: Fget;
    has: Fhas;
    is: Fis;
  }
  const qf = f as Frame;
  return (qf.decl = new (class Fdecl {
    is = new (class extends Fdecl {
      //
      blockOrCatchScoped(n: qt.Declaration) {
        return (qf.get.combinedFlagsOf(n) & NodeFlags.BlockScoped) !== 0 || this.catchClauseVariableDeclarationOrBindingElem(n);
      }
      declarationReadonly(n: qt.Declaration) {
        return !!(this.get.combinedModifierFlags(n) & ModifierFlags.Readonly && !qf.is.paramPropertyDeclaration(n, n.parent));
      }
      catchClauseVariableDeclarationOrBindingElem(n: qt.Declaration) {
        const r = qf.get.rootDeclaration(n);
        return r?.kind === Syntax.VariableDeclaration && r?.parent?.kind === Syntax.CatchClause;
      }
      assignmentDeclaration(n: qt.Declaration) {
        if (qf.is.accessExpression(n)) return true;
        switch (n.kind) {
          case Syntax.BinaryExpression:
          case Syntax.CallExpression:
          case Syntax.Identifier:
            return true;
        }
        return false;
      }
      notAccessor(n: qt.Declaration) {
        return !qf.is.accessor(n);
      }
      notOverload(n: qt.Declaration) {
        return (n.kind !== Syntax.FunctionDeclaration && n.kind !== Syntax.MethodDeclaration) || !!(n as qt.FunctionDeclaration).body;
      }
      getOrSetKind(n: qt.Declaration): n is qt.AccessorDeclaration {
        return n.kind === Syntax.SetAccessor || n.kind === Syntax.GetAccessor;
      }
      dynamicName(n: qt.Declaration): n is qt.DynamicNamedDecl | qt.DynamicNamedBinaryExpression {
        const n2 = this.nameOf(n);
        return !!n2 && qf.has.dynamicName(n2);
      }
      variableDeclarationInVariableStatement(n: qt.VariableDeclaration) {
        const p = n.parent;
        return p?.kind === Syntax.VariableDeclarationList && p?.parent?.kind === Syntax.VariableStatement;
      }
      hoistedVariable(n: qt.VariableDeclaration) {
        return n.name.kind === Syntax.Identifier && !n.initer;
      }
      varConst(n: qt.VariableDeclaration | qt.VariableDeclarationList) {
        return !!(qf.get.combinedFlagsOf(n) & NodeFlags.Const);
      }
      enumConst(n: qt.EnumDeclaration) {
        return !!(this.get.combinedModifierFlags(n) & ModifierFlags.Const);
      }
      restParam(n: qt.ParamDeclaration | qt.DocParamTag) {
        const t = n.kind === Syntax.DocParamTag ? n.typeExpression && n.typeExpression.type : n.type;
        return (n as qc.ParamDeclaration).dot3Token !== undefined || (!!t && t.kind === Syntax.DocVariadicTyping);
      }
      paramThisKeyword(n: qt.ParamDeclaration) {
        const n2 = n.name;
        return n2.kind === Syntax.Identifier && n2.originalKeywordKind === Syntax.ThisKeyword;
      }
      paramDeclaration(n: qt.VariableLikeDeclaration) {
        const r = qf.get.rootDeclaration(n);
        return r?.kind === Syntax.Param;
      }
      defaultImport(n: qt.ImportDeclaration | qt.ImportEqualsDeclaration | qt.ExportDeclaration) {
        return n.kind === Syntax.ImportDeclaration && !!n.importClause && !!n.importClause.name;
      }
      moduleAugmentationExternal(n?: qt.AmbientModuleDeclaration) {
        const p = n?.parent;
        switch (p?.kind) {
          case Syntax.SourceFile:
            return qf.is.externalModule(p);
          case Syntax.ModuleBlock:
            return qf.is.ambientModule(p.parent) && p.parent?.parent?.kind === Syntax.SourceFile && !qf.is.externalModule(p.parent.parent);
        }
        return false;
      }
      has_restParam(n: SignatureDeclaration | qt.DocSignature) {
        const l = qu.lastOrUndefined<qt.ParamDeclaration | qt.DocParamTag>(n.params);
        return !!l && this.restParam(l);
      }
    })();
    get = new (class extends Fdecl {
      //
      combinedModifierFlags(n: qt.Declaration): ModifierFlags {
        return qf.get.combinedFlags(n, getEffectiveModifierFlags);
      }
    })();
    getName(d: qt.Declaration, comments?: boolean, sourceMaps?: boolean, f: EmitFlags = 0) {
      const n = this.nameOf(d);
      if (n && n.kind === Syntax.Identifier && !qf.is.generatedIdentifier(n)) {
        const c = qf.make.qf.make.mutableClone(n);
        f |= d.emitFlags(n);
        if (!sourceMaps) f |= EmitFlags.NoSourceMap;
        if (!comments) f |= EmitFlags.NoComments;
        if (f) qf.emit.setFlags(c, f);
        return c;
      }
      return this.generatedNameForNode(d);
    }
    typeParamOwner(d?: qt.Declaration): qt.Declaration | undefined {
      if (d?.kind === Syntax.TypeParam) {
        for (let n = d as Node | undefined; n; n = n.parent) {
          if (qf.is.functionLike(n) || qf.is.classLike(n) || n.kind === Syntax.InterfaceDeclaration) return n as qt.Declaration;
        }
      }
      return;
    }
    members(d?: qt.Declaration): Nodes<qt.ClassElem> | Nodes<TypeElem> | Nodes<qt.ObjectLiteralElem> | undefined {
      switch (d?.kind) {
        case Syntax.InterfaceDeclaration:
        case Syntax.ClassDeclaration:
        case Syntax.ClassExpression:
        case Syntax.TypingLiteral:
          return d.members;
        case Syntax.ObjectLiteralExpression:
          return d.properties;
      }
      return;
    }
    nameOf(d: qt.Declaration | qt.Expression): qt.DeclarationName | undefined {
      if (d) {
        const n = d as Node;
        if (this.nonAssignedNameOfDeclaration(d) || n.kind === Syntax.FunctionExpression || n.kind === Syntax.ClassExpression) return this.assignedName(n);
      }
      return;
    }
    fromName(n: Node): qt.Declaration | undefined {
      const p = n.parent;
      switch (n.kind) {
        case Syntax.StringLiteral:
        case Syntax.NoSubstitutionLiteral:
        case Syntax.NumericLiteral:
          if (p?.kind === Syntax.ComputedPropertyName) return p.parent as qt.Declaration;
        case Syntax.Identifier:
          if (qf.is.declaration(p)) return p.name === n ? (p as qt.Declaration) : undefined;
          else if (p?.kind === Syntax.QualifiedName) {
            const pp = p.parent;
            return pp?.kind === Syntax.DocParamTag && pp.name === p ? pp : undefined;
          } else {
            const pp = p?.parent;
            return pp?.kind === Syntax.BinaryExpression && qf.get.assignmentDeclarationKind(pp) !== qt.AssignmentDeclarationKind.None && (pp.left.symbol || pp.symbol) && this.nameOf(pp) === n
              ? pp
              : undefined;
          }
        case Syntax.PrivateIdentifier:
          return qf.is.declaration(p) && p.name === n ? (p as qt.Declaration) : undefined;
      }
      return;
    }
    nameOfExpando(d: qt.Declaration): qt.DeclarationName | undefined {
      const p = d.parent;
      if (p?.kind === Syntax.BinaryExpression) {
        const p2 = (p.operatorToken.kind === Syntax.Bar2Token || p.operatorToken.kind === Syntax.Question2Token) && p.parent?.kind === Syntax.BinaryExpression ? p.parent : p;
        if (p2.operatorToken.kind === Syntax.EqualsToken && p2.left.kind === Syntax.Identifier) return p2.left as qt.DeclarationName;
      } else if (p?.kind === Syntax.VariableDeclaration) return p.name;
      return;
    }
    internalName(d: qt.Declaration, comments?: boolean, sourceMaps?: boolean) {
      return this.getName(d, comments, sourceMaps, EmitFlags.LocalName | EmitFlags.InternalName);
    }
    localName(d: qt.Declaration, comments?: boolean, sourceMaps?: boolean) {
      return this.getName(d, comments, sourceMaps, EmitFlags.LocalName);
    }
    exportName(d: qt.Declaration, comments?: boolean, sourceMaps?: boolean): qt.Identifier {
      return this.getName(d, comments, sourceMaps, EmitFlags.ExportName);
    }
    name(d: qt.Declaration, comments?: boolean, sourceMaps?: boolean) {
      return this.getName(d, comments, sourceMaps);
    }
    externalModuleOrNamespaceExportName(n: qt.Declaration, s: qt.Identifier | undefined, comments?: boolean, sourceMaps?: boolean): qt.Identifier | qt.PropertyAccessExpression {
      if (s && qf.has.syntacticModifier(n as Node, ModifierFlags.Export)) return this.namespaceMemberName(s, this.name(n), comments, sourceMaps);
      return this.exportName(n, comments, sourceMaps);
    }
    localNameForExternalImport(d: qt.ImportDeclaration | qt.ExportDeclaration | qt.ImportEqualsDeclaration, sourceFile: qt.SourceFile): qc.Identifier | undefined {
      const d2 = this.namespaceDeclarationNode(d);
      if (d2 && !qf.is.defaultImport(d)) {
        const n = d2.name;
        return qf.is.generatedIdentifier(n) ? n : new qc.Identifier(this.sourceTextOfNodeFromSourceFile(sourceFile, n) || qb.idText(n));
      }
      if (d.kind === Syntax.ImportDeclaration && d.importClause) return this.generatedNameForNode(d);
      if (d.kind === Syntax.ExportDeclaration && d.moduleSpecifier) return this.generatedNameForNode(d);
      return;
    }
    declarationNameToString(n?: qt.DeclarationName | qt.QualifiedName) {
      return !n || this.fullWidth(n) === 0 ? '(Missing)' : this.textOf(n);
    }
    //
    get_declarationIdentifier(n: qt.Declaration | qt.Expression): qt.Identifier | undefined {
      const name = this.nameOf(n);
      return name && name.kind === Syntax.Identifier ? name : undefined;
    }
    toExpression(n: qt.FunctionDeclaration) {
      if (!n.body) return qu.fail();
      const e = new qc.FunctionExpression(n.modifiers, n.asteriskToken, n.name, n.typeParams, n.params, n.type, n.body);
      e.setOriginal(n);
      e.setRange(n);
      if (qf.emit.startsOnNewLine(n)) qf.emit.setStartsOnNewLine(e, true);
      qf.calc.aggregate(e);
      return e;
    }
    functionFlags(n?: SignatureDeclaration) {
      if (!n) return FunctionFlags.Invalid;
      let f = FunctionFlags.Normal;
      switch (n.kind) {
        case Syntax.FunctionDeclaration:
        case Syntax.FunctionExpression:
        case Syntax.MethodDeclaration:
          if (n.asteriskToken) f |= FunctionFlags.Generator;
        case Syntax.ArrowFunction:
          if (qf.has.syntacticModifier(n, ModifierFlags.Async)) f |= FunctionFlags.Async;
          break;
      }
      if (!(n as qt.FunctionLikeDeclaration).body) f |= FunctionFlags.Invalid;
      return f;
    }
    initializedVariables(n: qt.VariableDeclarationList) {
      function initialized(n: qt.VariableDeclaration) {
        return n.initer !== undefined;
      }
      return qu.filter(n.declarations, initialized);
    }
    typeParamFromDoc(n: TypeParamDeclaration & { parent: qt.DocTemplateTag }): TypeParamDeclaration | undefined {
      const { typeParams } = n.parent?.parent?.parent as SignatureDeclaration | qt.InterfaceDeclaration | qt.ClassDeclaration;
      const t = n.name.escapedText;
      return typeParams && qf.find.up(typeParams, (p) => p.name.escapedText === t);
    }
    firstConstructorWithBody(n: qt.ClassLikeDeclaration): (qt.ConstructorDeclaration & { body: qt.FunctionBody }) | undefined {
      return qf.find.up(n.members, (m): m is qt.ConstructorDeclaration & { body: qt.FunctionBody } => {
        const n = m as Node;
        return n.kind === Syntax.Constructor && qf.is.present(n.body);
      });
    }
    setAccessorValueParam(a?: qt.SetAccessorDeclaration): qt.ParamDeclaration | undefined {
      const ps = a?.params;
      if (ps?.length) return ps[ps.length === 2 && qf.is.paramThisKeyword(ps[0]) ? 1 : 0];
      return;
    }
    setAccessorTypeAnnotationNode(a: qt.SetAccessorDeclaration): qt.Typing | undefined {
      return this.setAccessorValueParam(a)?.type;
    }
    thisNodeKind(s: SignatureDeclaration | qt.DocSignature): qt.ParamDeclaration | undefined {
      if (s.params.length && s.kind !== Syntax.DocSignature) {
        const p = s.params[0];
        if (qf.is.paramThisKeyword(p)) return p;
      }
      return;
    }
    allAccessorDeclarations(ds: readonly qt.Declaration[], a: qt.AccessorDeclaration): qt.AllAccessorDeclarations {
      let a1!: qt.AccessorDeclaration;
      let a2!: qt.AccessorDeclaration;
      let get!: qt.GetAccessorDeclaration;
      let set!: qt.SetAccessorDeclaration;
      if (qf.has.dynamicName(a)) {
        a1 = a;
        if (a.kind === Syntax.GetAccessor) get = a;
        else if (a.kind === Syntax.SetAccessor) set = a;
        else qu.fail('Accessor has wrong kind');
      } else
        qf.each.up(ds, (d) => {
          if (qf.is.accessor(d) && qf.has.syntacticModifier(d, ModifierFlags.Static) === qf.has.syntacticModifier(a, ModifierFlags.Static)) {
            const memberName = qf.get.propertyNameForPropertyNameNode(d.name);
            const accessorName = qf.get.propertyNameForPropertyNameNode(a.name);
            if (memberName === accessorName) {
              if (!a1) a1 = d;
              else if (!a2) a2 = d;
              if (d.kind === Syntax.GetAccessor && !get) get = d;
              if (d.kind === Syntax.SetAccessor && !set) set = d;
            }
          }
        });
      return { firstAccessor: a1, secondAccessor: a2, getAccessor: get, setAccessor: set };
    }
    effectiveReturnTypeNode(n: SignatureDeclaration | qt.DocSignature): qt.Typing | undefined {
      return n.kind === Syntax.DocSignature ? n.type?.typeExpression?.type : n.type || (qf.is.inJSFile(n) ? qf.get.doc.returnType(n) : undefined);
    }
    effectiveBaseTypeNode(n: qt.ClassLikeDeclaration | qt.InterfaceDeclaration) {
      const b = this.classExtendsHeritageElem(n);
      if (b && qf.is.inJSFile(n)) {
        const t = qf.get.doc.augmentsTag(n);
        if (t) return t.class;
      }
      return b;
    }
    classExtendsHeritageElem(n: qt.ClassLikeDeclaration | qt.InterfaceDeclaration) {
      const c = qf.get.heritageClause(n.heritageClauses, Syntax.ExtendsKeyword);
      return c && c.types.length > 0 ? c.types[0] : undefined;
    }
    effectiveImplementsTypeNodes(n: qt.ClassLikeDeclaration): readonly qt.ExpressionWithTypings[] | undefined {
      if (qf.is.inJSFile(n)) return qf.get.doc.implementsTags(n).map((n) => n.class);
      else {
        const c = qf.get.heritageClause(n.heritageClauses, Syntax.ImplementsKeyword);
        return c?.types;
      }
    }
    interfaceBaseTypeNodes(n: qt.InterfaceDeclaration) {
      const c = qf.get.heritageClause(n.heritageClauses, Syntax.ExtendsKeyword);
      return c ? c.types : undefined;
    }
    namespaceDeclarationNode(n: qt.ImportDeclaration | qt.ImportEqualsDeclaration | qt.ExportDeclaration): qt.ImportEqualsDeclaration | qt.NamespaceImport | qt.NamespaceExport | undefined {
      switch (n.kind) {
        case Syntax.ImportDeclaration:
          return n.importClause && qu.tryCast(n.importClause.namedBindings, qf.is.namespaceImport);
        case Syntax.ImportEqualsDeclaration:
          return n;
        case Syntax.ExportDeclaration:
          return n.exportClause && qu.tryCast(n.exportClause, qf.is.namespaceExport);
      }
    }
    effectiveSetAccessorTypeAnnotationNode(n: qt.SetAccessorDeclaration): qt.Typing | undefined {
      const p = this.setAccessorValueParam(n);
      return p && qf.get.effectiveTypeAnnotationNode(p);
    }
    nonAssignedNameOfDeclaration(n: qt.Declaration | qt.Expression): qt.DeclarationName | undefined {
      switch (n.kind) {
        case Syntax.Identifier:
          return n;
        case Syntax.DocPropertyTag:
        case Syntax.DocParamTag: {
          const { name } = n;
          if (name.kind === Syntax.QualifiedName) return name.right;
          break;
        }
        case Syntax.CallExpression:
        case Syntax.BinaryExpression: {
          switch (qf.get.assignmentDeclarationKind(n)) {
            case qt.AssignmentDeclarationKind.ExportsProperty:
            case qt.AssignmentDeclarationKind.Property:
            case qt.AssignmentDeclarationKind.PrototypeProperty:
            case qt.AssignmentDeclarationKind.ThisProperty:
              return qf.get.elemOrPropertyAccessArgExpressionOrName(n.left);
            case qt.AssignmentDeclarationKind.ObjectDefinePropertyExports:
            case qt.AssignmentDeclarationKind.ObjectDefinePropertyValue:
            case qt.AssignmentDeclarationKind.ObjectDefinePrototypeProperty:
              return n.args[1];
            default:
              return;
          }
        }
        case Syntax.DocTypedefTag:
          return qf.get.doc.nameOfTypedef(n);
        case Syntax.DocEnumTag:
          return qf.get.doc.nameForNamelessTypedef(n);
        case Syntax.ExportAssignment: {
          const { expression } = n;
          return expression.kind === Syntax.Identifier ? expression : undefined;
        }
        case Syntax.ElemAccessExpression:
          if (qf.is.bindableStaticElemAccessExpression(n)) return n.argExpression;
      }
      return n.name;
    }
    effectiveTypeParamDeclarations(n: qt.DeclarationWithTypeParams): readonly qc.TypeParamDeclaration[] {
      if (n.kind === Syntax.DocSignature) return qu.empty;
      if (qf.is.doc.typeAlias(n)) {
        qf.assert.true(n.parent?.kind === Syntax.DocComment);
        return qu.flatMap(n.parent.tags, (t) => (t.kind === Syntax.DocTemplateTag ? t.typeParams : undefined));
      }
      if (n.typeParams) return n.typeParams;
      if (qf.is.inJSFile(n)) {
        const decls = this.typeParamDeclarations(n);
        if (decls.length) return decls;
        const t = qf.get.doc.type(n);
        if (t?.kind === Syntax.FunctionTyping && t.typeParams) return t.typeParams;
      }
      return qu.empty;
    }
    effectiveConstraintOfTypeParam(n: TypeParamDeclaration): qt.Typing | undefined {
      return n.constraint ? n.constraint : n.parent?.kind === Syntax.DocTemplateTag && n === n.parent.typeParams[0] ? n.parent.constraint : undefined;
    }
    //
    doc_typeParamDeclarations(n: qt.DeclarationWithTypeParams): readonly TypeParamDeclaration[] {
      function isNonTypeAliasTemplate(t: qt.DocTag): t is qt.DocTemplateTag {
        const p = t.parent as Node | undefined;
        return t.kind === Syntax.DocTemplateTag && !(p?.kind === Syntax.DocComment && p.tags!.some(isDocTypeAlias));
      }
      return qu.flatMap(qf.get.doc.tags(n), (t) => (isNonTypeAliasTemplate(t) ? t.typeParams : undefined));
    }
    paramTagsWorker(d: qt.ParamDeclaration, noCache?: boolean): readonly qt.DocParamTag[] {
      if (d.name) {
        const n = d.name as Node;
        const p = d.parent as Node | undefined;
        if (n.kind === Syntax.Identifier) {
          const name = n.escapedText;
          return qf.get.doc.tagsWorker(p, noCache).filter((t): t is qt.DocParamTag => t.kind === Syntax.DocParamTag && t.name.kind === Syntax.Identifier && t.name.escapedText === name);
        } else {
          const i = p?.params.indexOf(d);
          qf.assert.true(i > -1, "Params should always be in their parents' param list");
          const ts = qf.get.doc.tagsWorker(p, noCache).filter(qf.is.doc.paramTag);
          if (i < ts.length) return [ts[i]];
        }
      }
      return qu.empty;
    }
    paramTags(n: qt.ParamDeclaration): readonly qt.DocParamTag[] {
      return this.paramTagsWorker(n, false);
    }
    paramTagsNoCache(n: qt.ParamDeclaration): readonly qt.DocParamTag[] {
      return this.paramTagsWorker(n, true);
    }
    typeParamTagsWorker(n: TypeParamDeclaration, noCache?: boolean): readonly qt.DocTemplateTag[] {
      const name = n.name.escapedText;
      return qf.get.doc.tagsWorker(n.parent, noCache).filter((t): t is qt.DocTemplateTag => t.kind === Syntax.DocTemplateTag && t.typeParams.some((p) => p.name.escapedText === name));
    }
    typeParamTags(n: TypeParamDeclaration): readonly qt.DocTemplateTag[] {
      return this.typeParamTagsWorker(n, false);
    }
    typeParamTagsNoCache(n: TypeParamDeclaration): readonly qt.DocTemplateTag[] {
      return this.typeParamTagsWorker(n, true);
    }
    withParamTags(n: qt.FunctionLikeDeclaration | SignatureDeclaration) {
      return !!qf.get.doc.firstTag(n, qf.is.doc.paramTag);
    }
  })());
}
export interface Fdecl extends ReturnType<typeof newDecl> {}
export function newCalc(f: qt.Frame) {
  interface Frame extends qt.Frame {
    get: Fget;
    has: Fhas;
    is: Fis;
    skip: Fskip;
    visit: Fvisit;
  }
  const qf = f as Frame;
  return (qf.calc = new (class {
    aggregate(n: Node): Node {
      const worker = (n?: Node): TrafoFlags => {
        if (!n) return TrafoFlags.None;
        if (n.trafoFlags & TrafoFlags.HasComputedFlags) return n.trafoFlags & ~qy.get.trafoFlagsSubtreeExclusions(n.kind);
        return this.trafoFlags(n, subtree(n));
      };
      const nodes = (ns?: Nodes<Node>): TrafoFlags => {
        if (!ns) return TrafoFlags.None;
        let sub = TrafoFlags.None;
        let f = TrafoFlags.None;
        for (const n of ns) {
          sub |= worker(n);
          f |= n.trafoFlags & ~TrafoFlags.HasComputedFlags;
        }
        ns.trafoFlags = f | TrafoFlags.HasComputedFlags;
        return sub;
      };
      const subtree = (n: Node): TrafoFlags => {
        if (qf.has.syntacticModifier(n, ModifierFlags.Ambient) || (qf.is.typeNode(n) && n.kind !== Syntax.ExpressionWithTypings)) return TrafoFlags.None;
        return qf.visit.reduce(n, TrafoFlags.None, child, children);
      };
      const child = (f: TrafoFlags, n: Node): TrafoFlags => f | worker(n);
      const children = (f: TrafoFlags, ns: Nodes<Node>): TrafoFlags => f | nodes(ns);
      worker(n);
      return n;
    }
    trafoFlags(n: Node, f: TrafoFlags): TrafoFlags {
      switch (n.kind) {
        case Syntax.CallExpression:
          return this.callExpression(n, f);
        case Syntax.NewExpression:
          return this.newExpression(n, f);
        case Syntax.ModuleDeclaration:
          return this.moduleDeclaration(n, f);
        case Syntax.ParenthesizedExpression:
          return this.parenthesizedExpression(n, f);
        case Syntax.BinaryExpression:
          return this.binaryExpression(n, f);
        case Syntax.ExpressionStatement:
          return this.expressionStatement(n, f);
        case Syntax.Param:
          return this.param(n, f);
        case Syntax.ArrowFunction:
          return this.arrowFunction(n, f);
        case Syntax.FunctionExpression:
          return this.functionExpression(n, f);
        case Syntax.FunctionDeclaration:
          return this.functionDeclaration(n, f);
        case Syntax.VariableDeclaration:
          return this.variableDeclaration(n, f);
        case Syntax.VariableDeclarationList:
          return this.variableDeclarationList(n, f);
        case Syntax.VariableStatement:
          return this.variableStatement(n, f);
        case Syntax.LabeledStatement:
          return this.labeledStatement(n, f);
        case Syntax.ClassDeclaration:
          return this.classDeclaration(n, f);
        case Syntax.ClassExpression:
          return this.classExpression(n, f);
        case Syntax.HeritageClause:
          return this.heritageClause(n, f);
        case Syntax.CatchClause:
          return this.catchClause(n, f);
        case Syntax.ExpressionWithTypings:
          return this.expressionWithTypings(n, f);
        case Syntax.Constructor:
          return this.constructorr(n, f);
        case Syntax.PropertyDeclaration:
          return this.propertyDeclaration(n, f);
        case Syntax.MethodDeclaration:
          return this.method(n, f);
        case Syntax.GetAccessor:
        case Syntax.SetAccessor:
          return this.accessor(n, f);
        case Syntax.ImportEqualsDeclaration:
          return this.importEquals(n, f);
        case Syntax.PropertyAccessExpression:
          return this.propertyAccess(n, f);
        case Syntax.ElemAccessExpression:
          return this.elemAccess(n, f);
        case Syntax.JsxSelfClosingElem:
        case Syntax.JsxOpeningElem:
          return this.jsxOpeningLikeElem(n, f);
      }
      return this.other(n, f);
    }
    callExpression(n: qt.CallExpression, f: TrafoFlags) {
      let r = f;
      const callee = qf.skip.outerExpressions(n.expression);
      const e = n.expression;
      if (n.flags & NodeFlags.OptionalChain) r |= TrafoFlags.ContainsES2020;
      if (n.typeArgs) r |= TrafoFlags.AssertTypeScript;
      if (f & TrafoFlags.ContainsRestOrSpread || qf.is.superOrSuperProperty(callee)) {
        r |= TrafoFlags.AssertES2015;
        if (qf.is.superProperty(callee)) r |= TrafoFlags.ContainsLexicalThis;
      }
      if (e.kind === Syntax.ImportKeyword) r |= TrafoFlags.ContainsDynamicImport;
      n.trafoFlags = r | TrafoFlags.HasComputedFlags;
      return r & ~TrafoFlags.ArrayLiteralOrCallOrNewExcludes;
    }
    newExpression(n: qt.NewExpression, f: TrafoFlags) {
      let r = f;
      if (n.typeArgs) r |= TrafoFlags.AssertTypeScript;
      if (f & TrafoFlags.ContainsRestOrSpread) r |= TrafoFlags.AssertES2015;
      n.trafoFlags = r | TrafoFlags.HasComputedFlags;
      return r & ~TrafoFlags.ArrayLiteralOrCallOrNewExcludes;
    }
    jsxOpeningLikeElem(n: qt.JsxOpeningLikeElem, f: TrafoFlags) {
      let r = f | TrafoFlags.AssertJsx;
      if (n.typeArgs) r |= TrafoFlags.AssertTypeScript;
      n.trafoFlags = r | TrafoFlags.HasComputedFlags;
      return r & ~TrafoFlags.NodeExcludes;
    }
    binaryExpression(n: qt.BinaryExpression, f: TrafoFlags) {
      let r = f;
      const k = n.operatorToken.kind;
      const l = n.left.kind;
      if (k === Syntax.Question2Token) r |= TrafoFlags.AssertES2020;
      else if (k === Syntax.EqualsToken && l === Syntax.ObjectLiteralExpression) r |= TrafoFlags.AssertES2018 | TrafoFlags.AssertES2015 | TrafoFlags.AssertDestructuringAssignment;
      else if (k === Syntax.EqualsToken && l === Syntax.ArrayLiteralExpression) r |= TrafoFlags.AssertES2015 | TrafoFlags.AssertDestructuringAssignment;
      else if (k === Syntax.Asterisk2Token || k === Syntax.Asterisk2EqualsToken) r |= TrafoFlags.AssertES2016;
      n.trafoFlags = r | TrafoFlags.HasComputedFlags;
      return r & ~TrafoFlags.NodeExcludes;
    }
    param(n: qt.ParamDeclaration, f: TrafoFlags) {
      let r = f;
      const name = n.name;
      const initer = n.initer;
      const dot3Token = n.dot3Token;
      if (n.questionToken || n.type || (f & TrafoFlags.ContainsTypeScriptClassSyntax && qu.some(n.decorators)) || isThisNode(Identifier, name)) r |= TrafoFlags.AssertTypeScript;
      if (qf.has.syntacticModifier(n, ModifierFlags.ParamPropertyModifier)) r |= TrafoFlags.AssertTypeScript | TrafoFlags.ContainsTypeScriptClassSyntax;
      if (f & TrafoFlags.ContainsObjectRestOrSpread) r |= TrafoFlags.AssertES2018;
      if (f & TrafoFlags.ContainsBindingPattern || initer || dot3Token) r |= TrafoFlags.AssertES2015;
      n.trafoFlags = r | TrafoFlags.HasComputedFlags;
      return r & ~TrafoFlags.ParamExcludes;
    }
    parenthesizedExpression(n: qt.ParenthesizedExpression, f: TrafoFlags) {
      let r = f;
      const k = n.expression.kind;
      if (k === Syntax.AsExpression || k === Syntax.TypeAssertionExpression) r |= TrafoFlags.AssertTypeScript;
      n.trafoFlags = r | TrafoFlags.HasComputedFlags;
      return r & ~TrafoFlags.OuterExpressionExcludes;
    }
    classDeclaration(n: qt.ClassDeclaration, f: TrafoFlags) {
      let r: TrafoFlags;
      if (qf.has.syntacticModifier(n, ModifierFlags.Ambient)) r = TrafoFlags.AssertTypeScript;
      else {
        r = f | TrafoFlags.AssertES2015;
        if (f & TrafoFlags.ContainsTypeScriptClassSyntax || n.typeParams) r |= TrafoFlags.AssertTypeScript;
      }
      n.trafoFlags = r | TrafoFlags.HasComputedFlags;
      return r & ~TrafoFlags.ClassExcludes;
    }
    classExpression(n: qt.ClassExpression, f: TrafoFlags) {
      let r = f | TrafoFlags.AssertES2015;
      if (f & TrafoFlags.ContainsTypeScriptClassSyntax || n.typeParams) r |= TrafoFlags.AssertTypeScript;
      n.trafoFlags = r | TrafoFlags.HasComputedFlags;
      return r & ~TrafoFlags.ClassExcludes;
    }
    heritageClause(n: qt.HeritageClause, f: TrafoFlags) {
      let r = f;
      switch (n.token) {
        case Syntax.ExtendsKeyword:
          r |= TrafoFlags.AssertES2015;
          break;
        case Syntax.ImplementsKeyword:
          r |= TrafoFlags.AssertTypeScript;
          break;
        default:
          qu.fail('Unexpected token for heritage clause');
          break;
      }
      n.trafoFlags = r | TrafoFlags.HasComputedFlags;
      return r & ~TrafoFlags.NodeExcludes;
    }
    catchClause(n: qt.CatchClause, f: TrafoFlags) {
      let r = f;
      if (!n.variableDeclaration) r |= TrafoFlags.AssertES2019;
      else if (n.variableDeclaration.name.kind === Syntax.BindingPattern) r |= TrafoFlags.AssertES2015;
      n.trafoFlags = r | TrafoFlags.HasComputedFlags;
      return r & ~TrafoFlags.CatchClauseExcludes;
    }
    expressionWithTypings(n: qt.ExpressionWithTypings, f: TrafoFlags) {
      let r = f | TrafoFlags.AssertES2015;
      if (n.typeArgs) r |= TrafoFlags.AssertTypeScript;
      n.trafoFlags = r | TrafoFlags.HasComputedFlags;
      return r & ~TrafoFlags.NodeExcludes;
    }
    constructorr(n: qt.ConstructorDeclaration, f: TrafoFlags) {
      let r = f;
      if (qf.has.syntacticModifier(n, ModifierFlags.TypeScriptModifier) || !n.body) r |= TrafoFlags.AssertTypeScript;
      if (f & TrafoFlags.ContainsObjectRestOrSpread) r |= TrafoFlags.AssertES2018;
      n.trafoFlags = r | TrafoFlags.HasComputedFlags;
      return r & ~TrafoFlags.ConstructorExcludes;
    }
    method(n: qt.MethodDeclaration, f: TrafoFlags) {
      let r = f | TrafoFlags.AssertES2015;
      if (n.decorators || qf.has.syntacticModifier(n, ModifierFlags.TypeScriptModifier) || n.typeParams || n.type || !n.body || n.questionToken) r |= TrafoFlags.AssertTypeScript;
      if (f & TrafoFlags.ContainsObjectRestOrSpread) r |= TrafoFlags.AssertES2018;
      if (qf.has.syntacticModifier(n, ModifierFlags.Async)) r |= n.asteriskToken ? TrafoFlags.AssertES2018 : TrafoFlags.AssertES2017;
      if (n.asteriskToken) r |= TrafoFlags.AssertGenerator;
      n.trafoFlags = r | TrafoFlags.HasComputedFlags;
      return this.propagatePropertyNameFlags(n.name, r & ~TrafoFlags.MethodOrAccessorExcludes);
    }
    accessor(n: qt.AccessorDeclaration, f: TrafoFlags) {
      let r = f;
      if (n.decorators || qf.has.syntacticModifier(n, ModifierFlags.TypeScriptModifier) || n.type || !n.body) r |= TrafoFlags.AssertTypeScript;
      if (f & TrafoFlags.ContainsObjectRestOrSpread) r |= TrafoFlags.AssertES2018;
      n.trafoFlags = r | TrafoFlags.HasComputedFlags;
      return this.propagatePropertyNameFlags(n.name, r & ~TrafoFlags.MethodOrAccessorExcludes);
    }
    propertyDeclaration(n: qt.PropertyDeclaration, f: TrafoFlags) {
      let r = f | TrafoFlags.ContainsClassFields;
      if (qu.some(n.decorators) || qf.has.syntacticModifier(n, ModifierFlags.TypeScriptModifier) || n.type || n.questionToken || n.exclamationToken) r |= TrafoFlags.AssertTypeScript;
      if (n.name.kind === Syntax.ComputedPropertyName || (qf.has.staticModifier(n) && n.initer)) r |= TrafoFlags.ContainsTypeScriptClassSyntax;
      n.trafoFlags = r | TrafoFlags.HasComputedFlags;
      return this.propagatePropertyNameFlags(n.name, r & ~TrafoFlags.PropertyExcludes);
    }
    functionDeclaration(n: qt.FunctionDeclaration, f: TrafoFlags) {
      let r: TrafoFlags;
      const m = qf.get.syntacticModifierFlags(n);
      if (!n.body || m & ModifierFlags.Ambient) r = TrafoFlags.AssertTypeScript;
      else {
        r = f | TrafoFlags.ContainsHoistedDeclarationOrCompletion;
        if (m & ModifierFlags.TypeScriptModifier || n.typeParams || n.type) r |= TrafoFlags.AssertTypeScript;
        if (m & ModifierFlags.Async) r |= n.asteriskToken ? TrafoFlags.AssertES2018 : TrafoFlags.AssertES2017;
        if (f & TrafoFlags.ContainsObjectRestOrSpread) r |= TrafoFlags.AssertES2018;
        if (n.asteriskToken) r |= TrafoFlags.AssertGenerator;
      }
      n.trafoFlags = r | TrafoFlags.HasComputedFlags;
      return r & ~TrafoFlags.FunctionExcludes;
    }
    functionExpression(n: qt.FunctionExpression, f: TrafoFlags) {
      let r = f;
      if (qf.has.syntacticModifier(n, ModifierFlags.TypeScriptModifier) || n.typeParams || n.type) r |= TrafoFlags.AssertTypeScript;
      if (qf.has.syntacticModifier(n, ModifierFlags.Async)) r |= n.asteriskToken ? TrafoFlags.AssertES2018 : TrafoFlags.AssertES2017;
      if (f & TrafoFlags.ContainsObjectRestOrSpread) r |= TrafoFlags.AssertES2018;
      if (n.asteriskToken) r |= TrafoFlags.AssertGenerator;
      n.trafoFlags = r | TrafoFlags.HasComputedFlags;
      return r & ~TrafoFlags.FunctionExcludes;
    }
    arrowFunction(n: qt.ArrowFunction, f: TrafoFlags) {
      let r = f | TrafoFlags.AssertES2015;
      if (qf.has.syntacticModifier(n, ModifierFlags.TypeScriptModifier) || n.typeParams || n.type) r |= TrafoFlags.AssertTypeScript;
      if (qf.has.syntacticModifier(n, ModifierFlags.Async)) r |= TrafoFlags.AssertES2017;
      if (f & TrafoFlags.ContainsObjectRestOrSpread) r |= TrafoFlags.AssertES2018;
      n.trafoFlags = r | TrafoFlags.HasComputedFlags;
      return r & ~TrafoFlags.ArrowFunctionExcludes;
    }
    propertyAccess(n: qt.PropertyAccessExpression, f: TrafoFlags) {
      let r = f;
      if (n.flags & NodeFlags.OptionalChain) r |= TrafoFlags.ContainsES2020;
      if (n.expression.kind === Syntax.SuperKeyword) r |= TrafoFlags.ContainsES2017 | TrafoFlags.ContainsES2018;
      n.trafoFlags = r | TrafoFlags.HasComputedFlags;
      return r & ~TrafoFlags.PropertyAccessExcludes;
    }
    elemAccess(n: qt.ElemAccessExpression, f: TrafoFlags) {
      let r = f;
      if (n.flags & NodeFlags.OptionalChain) r |= TrafoFlags.ContainsES2020;
      if (n.expression.kind === Syntax.SuperKeyword) r |= TrafoFlags.ContainsES2017 | TrafoFlags.ContainsES2018;
      n.trafoFlags = r | TrafoFlags.HasComputedFlags;
      return r & ~TrafoFlags.PropertyAccessExcludes;
    }
    variableDeclaration(n: qt.VariableDeclaration, f: TrafoFlags) {
      let r = f;
      r |= TrafoFlags.AssertES2015 | TrafoFlags.ContainsBindingPattern;
      if (f & TrafoFlags.ContainsObjectRestOrSpread) r |= TrafoFlags.AssertES2018;
      if (n.type || n.exclamationToken) r |= TrafoFlags.AssertTypeScript;
      n.trafoFlags = r | TrafoFlags.HasComputedFlags;
      return r & ~TrafoFlags.NodeExcludes;
    }
    variableStatement(n: qt.VariableStatement, f: TrafoFlags) {
      let r: TrafoFlags;
      const d = n.declarationList.trafoFlags;
      if (qf.has.syntacticModifier(n, ModifierFlags.Ambient)) r = TrafoFlags.AssertTypeScript;
      else {
        r = f;
        if (d & TrafoFlags.ContainsBindingPattern) r |= TrafoFlags.AssertES2015;
      }
      n.trafoFlags = r | TrafoFlags.HasComputedFlags;
      return r & ~TrafoFlags.NodeExcludes;
    }
    labeledStatement(n: qt.LabeledStatement, f: TrafoFlags) {
      let r = f;
      if (f & TrafoFlags.ContainsBlockScopedBinding && qf.is.iterationStatement(n, true)) r |= TrafoFlags.AssertES2015;
      n.trafoFlags = r | TrafoFlags.HasComputedFlags;
      return r & ~TrafoFlags.NodeExcludes;
    }
    importEquals(n: qt.ImportEqualsDeclaration, f: TrafoFlags) {
      let r = f;
      if (!qf.is.externalModuleImportEqualsDeclaration(n)) r |= TrafoFlags.AssertTypeScript;
      n.trafoFlags = r | TrafoFlags.HasComputedFlags;
      return r & ~TrafoFlags.NodeExcludes;
    }
    expressionStatement(n: qt.ExpressionStatement, f: TrafoFlags) {
      const r = f;
      n.trafoFlags = r | TrafoFlags.HasComputedFlags;
      return r & ~TrafoFlags.NodeExcludes;
    }
    moduleDeclaration(n: qt.ModuleDeclaration, f: TrafoFlags) {
      let r = TrafoFlags.AssertTypeScript;
      const m = qf.get.syntacticModifierFlags(n);
      if ((m & ModifierFlags.Ambient) === 0) r |= f;
      n.trafoFlags = r | TrafoFlags.HasComputedFlags;
      return r & ~TrafoFlags.ModuleExcludes;
    }
    variableDeclarationList(n: qt.VariableDeclarationList, f: TrafoFlags) {
      let r = f | TrafoFlags.ContainsHoistedDeclarationOrCompletion;
      if (f & TrafoFlags.ContainsBindingPattern) r |= TrafoFlags.AssertES2015;
      if (n.flags & NodeFlags.BlockScoped) r |= TrafoFlags.AssertES2015 | TrafoFlags.ContainsBlockScopedBinding;
      n.trafoFlags = r | TrafoFlags.HasComputedFlags;
      return r & ~TrafoFlags.VariableDeclarationListExcludes;
    }
    other(n: Node, f: TrafoFlags) {
      let r = f;
      let excludeFlags = TrafoFlags.NodeExcludes;
      switch (n.kind) {
        case Syntax.AsyncKeyword:
          r |= TrafoFlags.AssertES2018 | TrafoFlags.AssertES2017;
          break;
        case Syntax.AwaitExpression:
          r |= TrafoFlags.AssertES2018 | TrafoFlags.AssertES2017 | TrafoFlags.ContainsAwait;
          break;
        case Syntax.AsExpression:
        case Syntax.PartiallyEmittedExpression:
        case Syntax.TypeAssertionExpression:
          r |= TrafoFlags.AssertTypeScript;
          excludeFlags = TrafoFlags.OuterExpressionExcludes;
          break;
        case Syntax.AbstractKeyword:
        case Syntax.ConstKeyword:
        case Syntax.DeclareKeyword:
        case Syntax.EnumDeclaration:
        case Syntax.EnumMember:
        case Syntax.NonNullExpression:
        case Syntax.PrivateKeyword:
        case Syntax.ProtectedKeyword:
        case Syntax.PublicKeyword:
        case Syntax.ReadonlyKeyword:
          r |= TrafoFlags.AssertTypeScript;
          break;
        case Syntax.JsxAttribute:
        case Syntax.JsxAttributes:
        case Syntax.JsxClosingElem:
        case Syntax.JsxClosingFragment:
        case Syntax.JsxElem:
        case Syntax.JsxExpression:
        case Syntax.JsxFragment:
        case Syntax.JsxOpeningFragment:
        case Syntax.JsxSpreadAttribute:
        case Syntax.JsxText:
          r |= TrafoFlags.AssertJsx;
          break;
        case Syntax.NoSubstitutionLiteral:
        case Syntax.TemplateHead:
        case Syntax.TemplateMiddle:
        case Syntax.TemplateTail:
          if (n.templateFlags) r |= TrafoFlags.AssertES2018;
          break;
        case Syntax.TaggedTemplateExpression:
          if (qf.has.invalidEscape(n.template)) {
            r |= TrafoFlags.AssertES2018;
            break;
          }
        case Syntax.MetaProperty:
        case Syntax.ShorthandPropertyAssignment:
        case Syntax.StaticKeyword:
        case Syntax.TemplateExpression:
          r |= TrafoFlags.AssertES2015;
          break;
        case Syntax.StringLiteral:
          if (n.hasExtendedEscape) r |= TrafoFlags.AssertES2015;
          break;
        case Syntax.NumericLiteral:
          if (n.numericLiteralFlags & qt.TokenFlags.BinaryOrOctalSpecifier) r |= TrafoFlags.AssertES2015;
          break;
        case Syntax.BigIntLiteral:
          r |= TrafoFlags.AssertESNext;
          break;
        case Syntax.ForOfStatement:
          if (n.awaitModifier) r |= TrafoFlags.AssertES2018;
          r |= TrafoFlags.AssertES2015;
          break;
        case Syntax.YieldExpression:
          r |= TrafoFlags.AssertES2018 | TrafoFlags.AssertES2015 | TrafoFlags.ContainsYield;
          break;
        case Syntax.AnyKeyword:
        case Syntax.ArrayTyping:
        case Syntax.BigIntKeyword:
        case Syntax.BooleanKeyword:
        case Syntax.CallSignature:
        case Syntax.ConditionalTyping:
        case Syntax.ConstructorTyping:
        case Syntax.ConstructSignature:
        case Syntax.FunctionTyping:
        case Syntax.IndexedAccessTyping:
        case Syntax.IndexSignature:
        case Syntax.InferTyping:
        case Syntax.InterfaceDeclaration:
        case Syntax.IntersectionTyping:
        case Syntax.LiteralTyping:
        case Syntax.MappedTyping:
        case Syntax.MethodSignature:
        case Syntax.NamespaceExportDeclaration:
        case Syntax.NeverKeyword:
        case Syntax.NumberKeyword:
        case Syntax.ObjectKeyword:
        case Syntax.OptionalTyping:
        case Syntax.ParenthesizedTyping:
        case Syntax.PropertySignature:
        case Syntax.RestTyping:
        case Syntax.StringKeyword:
        case Syntax.SymbolKeyword:
        case Syntax.ThisTyping:
        case Syntax.TupleTyping:
        case Syntax.TypeAliasDeclaration:
        case Syntax.TypeParam:
        case Syntax.TypingLiteral:
        case Syntax.TypingOperator:
        case Syntax.TypingPredicate:
        case Syntax.TypingQuery:
        case Syntax.TypingReference:
        case Syntax.UnionTyping:
        case Syntax.VoidKeyword:
          r = TrafoFlags.AssertTypeScript;
          excludeFlags = TrafoFlags.TypeExcludes;
          break;
        case Syntax.ComputedPropertyName:
          r |= TrafoFlags.ContainsComputedPropertyName;
          break;
        case Syntax.SpreadElem:
          r |= TrafoFlags.AssertES2015 | TrafoFlags.ContainsRestOrSpread;
          break;
        case Syntax.SpreadAssignment:
          r |= TrafoFlags.AssertES2018 | TrafoFlags.ContainsObjectRestOrSpread;
          break;
        case Syntax.SuperKeyword:
          r |= TrafoFlags.AssertES2015;
          excludeFlags = TrafoFlags.OuterExpressionExcludes;
          break;
        case Syntax.ThisKeyword:
          r |= TrafoFlags.ContainsLexicalThis;
          break;
        case Syntax.ObjectBindingPattern:
          r |= TrafoFlags.AssertES2015 | TrafoFlags.ContainsBindingPattern;
          if (f & TrafoFlags.ContainsRestOrSpread) r |= TrafoFlags.AssertES2018 | TrafoFlags.ContainsObjectRestOrSpread;
          excludeFlags = TrafoFlags.BindingPatternExcludes;
          break;
        case Syntax.ArrayBindingPattern:
          r |= TrafoFlags.AssertES2015 | TrafoFlags.ContainsBindingPattern;
          excludeFlags = TrafoFlags.BindingPatternExcludes;
          break;
        case Syntax.BindingElem:
          r |= TrafoFlags.AssertES2015;
          if (n.dot3Token) r |= TrafoFlags.ContainsRestOrSpread;
          break;
        case Syntax.Decorator:
          r |= TrafoFlags.AssertTypeScript | TrafoFlags.ContainsTypeScriptClassSyntax;
          break;
        case Syntax.ObjectLiteralExpression:
          excludeFlags = TrafoFlags.ObjectLiteralExcludes;
          if (f & TrafoFlags.ContainsComputedPropertyName) r |= TrafoFlags.AssertES2015;
          if (f & TrafoFlags.ContainsObjectRestOrSpread) r |= TrafoFlags.AssertES2018;
          break;
        case Syntax.ArrayLiteralExpression:
          excludeFlags = TrafoFlags.ArrayLiteralOrCallOrNewExcludes;
          break;
        case Syntax.DoStatement:
        case Syntax.ForInStatement:
        case Syntax.ForStatement:
        case Syntax.WhileStatement:
          if (f & TrafoFlags.ContainsBlockScopedBinding) r |= TrafoFlags.AssertES2015;
          break;
        case Syntax.SourceFile:
          break;
        case Syntax.NamespaceExport:
          r |= TrafoFlags.AssertESNext;
          break;
        case Syntax.ReturnStatement:
          r |= TrafoFlags.ContainsHoistedDeclarationOrCompletion | TrafoFlags.AssertES2018;
          break;
        case Syntax.BreakStatement:
        case Syntax.ContinueStatement:
          r |= TrafoFlags.ContainsHoistedDeclarationOrCompletion;
          break;
        case Syntax.PrivateIdentifier:
          r |= TrafoFlags.ContainsClassFields;
          break;
      }
      n.trafoFlags = r | TrafoFlags.HasComputedFlags;
      return r & ~excludeFlags;
    }
    propagatePropertyNameFlags(n: qt.PropertyName, f: TrafoFlags) {
      return f | (n.trafoFlags & TrafoFlags.PropertyNamePropagatingFlags);
    }
  })());
}
export interface Fcalc extends ReturnType<typeof newCalc> {}
export function newStmt(f: qt.Frame) {
  interface Frame extends qt.Frame {
    make: Fmake;
    decl: Fdecl;
    emit: Femit;
    get: Fget;
    has: Fhas;
    is: Fis;
  }
  const qf = f as Frame;
  return (qf.stmt = new (class Fstmt {
    is = new (class extends Fstmt {
      scopeMarkerNeeded(n: qt.Statement) {
        return !qf.is.anyImportOrReExport(n) && n.kind !== Syntax.ExportAssignment && !qf.has.syntacticModifier(n, ModifierFlags.Export) && !qf.is.ambientModule(n);
      }
      hoistedFunction(n: qt.Statement) {
        return this.customPrologue(n) && n.kind === Syntax.FunctionDeclaration;
      }
      hoistedVariableStatement(s: qt.Statement) {
        const n = s as Node;
        if (this.customPrologue(s) && n.kind === Syntax.VariableStatement) return qu.every(n.declarationList.declarations, qf.decl.is.hoistedVariable);
        return false;
      }
      customPrologue(n: qt.Statement) {
        return !!(qf.get.emitFlags(n as Node) & EmitFlags.CustomPrologue);
      }
      externalModuleIndicator(s: qt.Statement) {
        const n = s as Node;
        return qf.is.anyImportOrReExport(n) || n.kind === Syntax.ExportAssignment || qf.has.syntacticModifier(n, ModifierFlags.Export);
      }
    })();
    insertAllAfterPrologue<T extends qt.Statement>(to: T[], from: readonly T[] | undefined, isPrologue: (n: Node) => boolean): T[] {
      if (from?.length) {
        let i = 0;
        for (; i < to.length; ++i) {
          if (!isPrologue(to[i] as Node)) break;
        }
        to.splice(i, 0, ...from);
      }
      return to;
    }
    insertAfterPrologue<T extends qt.Statement>(to: T[], s: T | undefined, isPrologue: (n: Node) => boolean): T[] {
      if (s) {
        let i = 0;
        for (; i < to.length; ++i) {
          if (!isPrologue(to[i] as Node)) break;
        }
        to.splice(i, 0, s);
      }
      return to;
    }
    insertStatementsAfterStandardPrologue<T extends qt.Statement>(to: T[], from: readonly T[] | undefined): T[] {
      return this.insertAllAfterPrologue(to, from, qf.is.prologueDirective);
    }
    insertStatementsAfterCustomPrologue<T extends qt.Statement>(to: T[], from: readonly T[] | undefined): T[] {
      return this.insertAllAfterPrologue(to, from, qf.is.anyPrologueDirective);
    }
    insertStatementAfterStandardPrologue<T extends qt.Statement>(to: T[], s: T | undefined): T[] {
      return this.insertAfterPrologue(to, s, qf.is.prologueDirective);
    }
    insertStatementAfterCustomPrologue<T extends qt.Statement>(to: T[], s: T | undefined): T[] {
      return this.insertAfterPrologue(to, s, qf.is.anyPrologueDirective);
    }
    addStandardPrologue(to: qt.Statement[], from: readonly qt.Statement[], strict?: boolean) {
      qf.assert.true(to.length === 0);
      let useStrict = false;
      let i = 0;
      const l = from.length;
      while (i < l) {
        const s = from[i];
        if (qf.is.prologueDirective(s)) {
          if (qf.is.useStrictPrologue(s)) useStrict = true;
          to.push(s);
        } else break;
        i++;
      }
      if (strict && !useStrict) to.push(qf.emit.setStartsOnNewLine(new qc.ExpressionStatement(asLiteral('use strict'))));
      return i;
    }
    addCustomPrologue(to: qt.Statement[], from: readonly qt.Statement[], i: number, cb?: (n: Node) => VisitResult, filter?: (n: Node) => boolean): number;
    addCustomPrologue(to: qt.Statement[], from: readonly qt.Statement[], i?: number, cb?: (n: Node) => VisitResult, filter?: (n: Node) => boolean): number | undefined;
    addCustomPrologue(to: qt.Statement[], from: readonly qt.Statement[], i?: number, cb?: (n: Node) => VisitResult, filter: (n: Node) => boolean = () => true): number | undefined {
      const l = from.length;
      while (i !== undefined && i < l) {
        const s = from[i];
        if (qf.get.emitFlags(s) & EmitFlags.CustomPrologue && filter(s)) qu.append(to, cb ? qf.visit.node(s, cb, qf.is.statement) : s);
        else break;
        i++;
      }
      return i;
    }
    addPrologue(to: qt.Statement[], from: readonly qt.Statement[], strict?: boolean, cb?: (n: Node) => VisitResult): number {
      const i = this.addStandardPrologue(to, from, strict);
      return this.addCustomPrologue(to, from, i, cb);
    }
    findUseStrictPrologue(ss: readonly qt.Statement[]): qt.Statement | undefined {
      for (const s of ss) {
        if (qf.is.prologueDirective(s)) {
          if (qf.is.useStrictPrologue(s)) return s;
        } else break;
      }
      return;
    }
    startsWithUseStrict(ss: readonly qt.Statement[]) {
      const s = qu.firstOrUndefined(ss);
      return s !== undefined && qf.is.prologueDirective(s) && qf.is.useStrictPrologue(s);
    }
    createForOfBindingStatement(n: qt.ForIniter, e: qt.Expression): qt.Statement {
      if (n.kind === Syntax.VariableDeclarationList) {
        const d = qu.first(n.declarations) as qc.VariableDeclaration;
        const d2 = d.update(d.name, undefined, e);
        return new qc.VariableStatement(undefined, (n as qc.VariableDeclarationList).update([d2])).setRange(n);
      } else {
        const e2 = qf.make.assignment(n, e).setRange(n);
        return new qc.ExpressionStatement(e2).setRange(n);
      }
    }
    insertLeadingStatement(to: qt.Statement, from: qt.Statement) {
      if (to.kind === Syntax.Block) return (to as qc.Block).update(new qb.Nodes([from, ...to.statements]).setRange(to.statements));
      return new qc.Block(new qb.Nodes([to, from]), true);
    }
    restoreEnclosingLabel(n: qt.Statement, l?: qt.LabeledStatement, cb?: (n: qt.LabeledStatement) => void): qt.Statement {
      if (!l) return n;
      const r = updateLabel(l, l.label, l.statement.kind === Syntax.LabeledStatement ? restoreEnclosingLabel(n, l.statement) : n);
      if (cb) cb(l);
      return r;
    }
    canHaveExportModifier(n: qt.Statement) {
      switch (n.kind) {
        case Syntax.EnumDeclaration:
        case Syntax.VariableStatement:
        case Syntax.FunctionDeclaration:
        case Syntax.ClassDeclaration:
        case Syntax.ModuleDeclaration:
          return true;
        case Syntax.InterfaceDeclaration:
          return !qf.is.externalModuleAugmentation(n) && !qf.is.globalScopeAugmentation(n);
      }
      return qf.is.typeDeclaration(n);
    }
  })());
}
export interface Fstmt extends ReturnType<typeof newStmt> {}
export function newNest(f: qt.Frame) {
  interface Frame extends qt.Frame {
    get: Fget;
    is: Fis;
  }
  const qf = f as Frame;
  interface BinaryPlusExpression extends qt.BinaryExpression {
    cachedLiteralKind: Syntax;
  }
  return (qf.nest = new (class {
    getLiteralKindOfBinaryPlusOperand(e: qt.Expression): Syntax {
      e = qf.skip.partiallyEmittedExpressions(e);
      if (qy.is.literal(e.kind)) return e.kind;
      const n = e as Node;
      if (n.kind === Syntax.BinaryExpression && n.operatorToken.kind === Syntax.PlusToken) {
        const p = e as BinaryPlusExpression;
        if (p.cachedLiteralKind) return p.cachedLiteralKind;
        const l = getLiteralKindOfBinaryPlusOperand(n.left);
        const k = qy.is.literal(l) && l === getLiteralKindOfBinaryPlusOperand(n.right) ? l : Syntax.Unknown;
        p.cachedLiteralKind = k;
        return k;
      }
      return Syntax.Unknown;
    }
    binaryOperand(binaryOperator: Syntax, operand: qt.Expression, isLeft: boolean, leftOperand?: qt.Expression) {
      const skipped = qf.skip.partiallyEmittedExpressions(operand);
      if (skipped.kind === Syntax.ParenthesizedExpression) return operand;
      function operatorHasAssociativeProperty(binaryOperator: Syntax) {
        // The following operators are associative in JavaScript:
        //  (a*b)*c     -> a*(b*c)  -> a*b*c
        //  (a|b)|c     -> a|(b|c)  -> a|b|c
        //  (a&b)&c     -> a&(b&c)  -> a&b&c
        //  (a^b)^c     -> a^(b^c)  -> a^b^c
        //
        // While addition is associative in mathematics, JavaScript's `+` is not
        // guaranteed to be associative as it is overloaded with string concatenation.
        return binaryOperator === Syntax.AsteriskToken || binaryOperator === Syntax.BarToken || binaryOperator === Syntax.AmpersandToken || binaryOperator === Syntax.CaretToken;
      }
      function binaryOperandNeedsParentheses(binaryOperator: Syntax, operand: qt.Expression, isLeft: boolean, leftOperand: qt.Expression | undefined) {
        const binaryOperatorPrecedence = qy.get.operatorPrecedence(Syntax.BinaryExpression, binaryOperator);
        const binaryOperatorAssociativity = qy.get.operatorAssociativity(Syntax.BinaryExpression, binaryOperator);
        const emittedOperand = qf.skip.partiallyEmittedExpressions(operand);
        if (!isLeft && operand.kind === Syntax.ArrowFunction && binaryOperatorPrecedence > 3) return true;
        const operandPrecedence = qf.get.expressionPrecedence(emittedOperand);
        switch (qu.compareNumbers(operandPrecedence, binaryOperatorPrecedence)) {
          case qu.Comparison.LessThan:
            if (!isLeft && binaryOperatorAssociativity === qt.Associativity.Right && operand.kind === Syntax.YieldExpression) return false;
            return true;
          case qu.Comparison.GreaterThan:
            return false;
          case qu.Comparison.EqualTo:
            if (isLeft) {
              // No need to parenthesize the left operand when the binary operator is
              // left associative:
              //  (a*b)/x    -> a*b/x
              //  (a**b)/x   -> a**b/x
              //
              // Parentheses are needed for the left operand when the binary operator is
              // right associative:
              //  (a/b)**x   -> (a/b)**x
              //  (a**b)**x  -> (a**b)**x
              return binaryOperatorAssociativity === qt.Associativity.Right;
            } else {
              if (emittedOperand.kind === Syntax.BinaryExpression && emittedOperand.operatorToken.kind === binaryOperator) {
                // No need to parenthesize the right operand when the binary operator and
                // operand are the same and one of the following:
                //  x*(a*b)     => x*a*b
                //  x|(a|b)     => x|a|b
                //  x&(a&b)     => x&a&b
                //  x^(a^b)     => x^a^b
                if (operatorHasAssociativeProperty(binaryOperator)) return false;
                // No need to parenthesize the right operand when the binary operator
                // is plus (+) if both the left and right operands consist solely of either
                // literals of the same kind or binary plus (+) expressions for literals of
                // the same kind (recursively).
                //  "a"+(1+2)       => "a"+(1+2)
                //  "a"+("b"+"c")   => "a"+"b"+"c"
                if (binaryOperator === Syntax.PlusToken) {
                  const leftKind = leftOperand ? getLiteralKindOfBinaryPlusOperand(leftOperand) : Syntax.Unknown;
                  if (qy.is.literal(leftKind) && leftKind === getLiteralKindOfBinaryPlusOperand(emittedOperand)) return false;
                }
              }
              // No need to parenthesize the right operand when the operand is right
              // associative:
              //  x/(a**b)    -> x/a**b
              //  x**(a**b)   -> x**a**b
              //
              // Parentheses are needed for the right operand when the operand is left
              // associative:
              //  x/(a*b)     -> x/(a*b)
              //  x**(a/b)    -> x**(a/b)
              const operandAssociativity = qf.get.expressionAssociativity(emittedOperand);
              return operandAssociativity === qt.Associativity.Left;
            }
        }
      }
      return binaryOperandNeedsParentheses(binaryOperator, operand, isLeft, leftOperand) ? new qc.ParenthesizedExpression(operand) : operand;
    }
    forConditionalHead(c: qt.Expression) {
      const conditionalPrecedence = qy.get.operatorPrecedence(Syntax.ConditionalExpression, Syntax.QuestionToken);
      const emittedCondition = qf.skip.partiallyEmittedExpressions(c);
      const conditionPrecedence = qf.get.expressionPrecedence(emittedCondition);
      if (qu.compareNumbers(conditionPrecedence, conditionalPrecedence) !== qu.Comparison.GreaterThan) return new qc.ParenthesizedExpression(c);
      return c;
    }
    subexpressionOfConditionalExpression(e: qt.Expression): qt.Expression {
      const e2 = qf.skip.partiallyEmittedExpressions(e);
      return qf.is.commaSequence(e2) ? new qc.ParenthesizedExpression(e) : e;
    }
    forAccess(e: qt.Expression): qt.LeftExpression {
      const e2 = qf.skip.partiallyEmittedExpressions(e);
      const n = e2 as Node;
      if (qf.is.leftHandSideExpression(n) && (n.kind !== Syntax.NewExpression || n.args)) return e as qt.LeftExpression;
      return new qc.ParenthesizedExpression(e).setRange(e);
    }
    postfixOperand(e: qt.Expression): qt.LeftExpression {
      return qf.is.leftHandSideExpression(e) ? e : new qc.ParenthesizedExpression(e).setRange(e);
    }
    prefixOperand(e: qt.Expression): qt.UnaryExpression {
      return qf.is.unaryExpression(e) ? e : new qc.ParenthesizedExpression(e).setRange(e);
    }
    listElems(es: Nodes<qt.Expression>) {
      let r: qt.Expression[] | undefined;
      for (let i = 0; i < es.length; i++) {
        const e = this.expressionForList(es[i]);
        if (r || e !== es[i]) {
          if (!r) r = es.slice(0, i);
          r.push(e);
        }
      }
      return r ? new Nodes(r, es.trailingComma).setRange(es) : es;
    }
    expressionForList(e: qt.Expression) {
      const e2 = qf.skip.partiallyEmittedExpressions(e);
      const expressionPrecedence = qf.get.expressionPrecedence(e2);
      const commaPrecedence = qy.get.operatorPrecedence(Syntax.BinaryExpression, Syntax.CommaToken);
      return expressionPrecedence > commaPrecedence ? e : new qc.ParenthesizedExpression(e).setRange(e);
    }
    expressionForExpressionStatement(e: qt.Expression) {
      const e2 = qf.skip.partiallyEmittedExpressions(e);
      const n = e2 as Node;
      if (n.kind === Syntax.CallExpression) {
        const callee = n.expression;
        const k = qf.skip.partiallyEmittedExpressions(callee).kind;
        if (k === Syntax.FunctionExpression || k === Syntax.ArrowFunction) {
          const c = qf.make.mutableClone(e2);
          c.expression = new qc.ParenthesizedExpression(callee).setRange(callee);
          return recreateOuterExpressions(e, c, qt.OuterExpressionKinds.PartiallyEmittedExpressions);
        }
      }
      const k = qf.get.leftmostExpression(e2, false).kind;
      if (k === Syntax.ObjectLiteralExpression || k === Syntax.FunctionExpression) return new qc.ParenthesizedExpression(e).setRange(e);
      return e;
    }
    conditionalTypeMember(n: qt.Typing) {
      return n.kind === Syntax.ConditionalTyping ? new qc.ParenthesizedTyping(n) : n;
    }
    elemTypeMember(n: qt.Typing) {
      switch (n.kind) {
        case Syntax.UnionTyping:
        case Syntax.IntersectionTyping:
        case Syntax.FunctionTyping:
        case Syntax.ConstructorTyping:
          return new qc.ParenthesizedTyping(n);
      }
      return conditionalTypeMember(n);
    }
    arrayTypeMember(n: qt.Typing) {
      switch (n.kind) {
        case Syntax.TypingQuery:
        case Syntax.TypingOperator:
        case Syntax.InferTyping:
          return new qc.ParenthesizedTyping(n);
      }
      return elemTypeMember(n);
    }
    elemTypeMembers(ns: readonly qt.Typing[]) {
      return new Nodes(qu.sameMap(ns, elemTypeMember));
    }
    typeParams(ns?: readonly qt.Typing[]) {
      if (qu.some(ns)) {
        const ps = [] as qt.Typing[];
        for (let i = 0; i < ns.length; ++i) {
          const p = ns[i] as Node;
          ps.push(i === 0 && qf.is.functionOrConstructorTyping(p) && p.typeParams ? new qc.ParenthesizedTyping(p) : (p as qt.Typing));
        }
        return new Nodes(ps);
      }
      return;
    }
    defaultExpression(e: qt.Expression) {
      const check = qf.skip.partiallyEmittedExpressions(e);
      let needsParens = qf.is.commaSequence(check);
      if (!needsParens) {
        switch (qf.get.leftmostExpression(check, false).kind) {
          case Syntax.ClassExpression:
          case Syntax.FunctionExpression:
            needsParens = true;
        }
      }
      return needsParens ? new qc.ParenthesizedExpression(e) : e;
    }
    forNew(e: qt.Expression): qt.LeftExpression {
      const n = qf.get.leftmostExpression(e, true) as Node;
      switch (n.kind) {
        case Syntax.CallExpression:
          return new qc.ParenthesizedExpression(e);
        case Syntax.NewExpression:
          return !n.args ? new qc.ParenthesizedExpression(e) : (e as qt.LeftExpression);
      }
      return forAccess(e);
    }
    conciseBody(b: qt.ConciseBody): qt.ConciseBody {
      if (b.kind !== Syntax.Block && (qf.is.commaSequence(b) || qf.get.leftmostExpression(b, false).kind === Syntax.ObjectLiteralExpression)) return new qc.ParenthesizedExpression(b).setRange(b);
      return b;
    }
  })());
}
export interface Fnest extends ReturnType<typeof newNest> {}
export function newEmit(f: qt.Frame) {
  interface Frame extends qt.Frame {
    get: Fget;
    is: Fis;
  }
  const qf = f as Frame;
  return (qf.emit = new (class {
    disposeEmits(s: qt.SourceFile) {
      s = qf.get.parseTreeOf(s).sourceFile;
      const ns = s?.emitNode?.annotatedNodes;
      if (ns) {
        for (const n of ns) {
          n.emitNode = undefined;
        }
      }
    }
    getOrCreate(n: Node): qt.EmitNode {
      if (!n.emitNode) {
        if (qf.is.parseTreeNode(n)) {
          if (n.kind === Syntax.SourceFile) return (n.emitNode = { annotatedNodes: [n] } as qt.EmitNode);
          const s = qf.get.parseTreeOf(n.sourceFile).sourceFile;
          this.getOrCreate(s).annotatedNodes!.push(n);
        }
        n.emitNode = {} as qt.EmitNode;
      }
      return n.emitNode;
    }
    removeAllComments<T extends Node>(n: T): T {
      const e = this.getOrCreate(n);
      e.flags |= EmitFlags.NoComments;
      e.leadingComments = undefined;
      e.trailingComments = undefined;
      return n;
    }
    setFlags<T extends Node>(n: T, f: EmitFlags) {
      this.getOrCreate(n).flags = f;
      return n;
    }
    addFlags<T extends Node>(n: T, f: EmitFlags) {
      const e = this.getOrCreate(n);
      e.flags = e.flags | f;
      return n;
    }
    sourceMapRange(n: Node): qt.SourceMapRange {
      return n.emitNode?.sourceMapRange || n;
    }
    setSourceMapRange<T extends Node>(n: T, r?: qt.SourceMapRange) {
      this.getOrCreate(n).sourceMapRange = r;
      return n;
    }
    tokenSourceMapRange(n: Node, t: Syntax): qt.SourceMapRange | undefined {
      const rs = n.emitNode?.tokenSourceMapRanges;
      return rs?.[t];
    }
    setTokenSourceMapRange<T extends Node>(n: T, t: Syntax, r?: qt.SourceMapRange) {
      const e = this.getOrCreate(n);
      const rs = e.tokenSourceMapRanges || (e.tokenSourceMapRanges = []);
      rs[t] = r;
      return n;
    }
    startsOnNewLine(n: Node) {
      return n.emitNode?.startsOnNewLine;
    }
    setStartsOnNewLine<T extends Node>(n: T, newLine = true) {
      this.getOrCreate(n).startsOnNewLine = newLine;
      return n;
    }
    commentRange(n: Node) {
      return n.emitNode?.commentRange || n;
    }
    setCommentRange<T extends Node>(n: T, r?: qu.TextRange) {
      this.getOrCreate(n).commentRange = r;
      return n;
    }
    syntheticLeadingComments(n: Node): qt.SynthesizedComment[] | undefined {
      return n.emitNode?.leadingComments;
    }
    setSyntheticLeadingComments<T extends Node>(n: T, cs?: qt.SynthesizedComment[]) {
      this.getOrCreate(n).leadingComments = cs;
      return n;
    }
    addSyntheticLeadingComment<T extends Node>(n: T, kind: Syntax.SingleLineCommentTrivia | Syntax.MultiLineCommentTrivia, text: string, hasTrailingNewLine?: boolean) {
      return this.setSyntheticLeadingComments(
        n,
        qu.append<qt.SynthesizedComment>(this.syntheticLeadingComments(n), { kind, pos: -1, end: -1, hasTrailingNewLine, text })
      );
    }
    syntheticTrailingComments(n: Node): qt.SynthesizedComment[] | undefined {
      return n.emitNode?.trailingComments;
    }
    setSyntheticTrailingComments<T extends Node>(n: T, cs?: qt.SynthesizedComment[]) {
      this.getOrCreate(n).trailingComments = cs;
      return n;
    }
    addSyntheticTrailingComment<T extends Node>(n: T, kind: Syntax.SingleLineCommentTrivia | Syntax.MultiLineCommentTrivia, text: string, hasTrailingNewLine?: boolean) {
      return this.setSyntheticTrailingComments(
        n,
        qu.append<qt.SynthesizedComment>(this.syntheticTrailingComments(n), { kind, pos: -1, end: -1, hasTrailingNewLine, text })
      );
    }
    moveSyntheticComments<T extends Node>(to: T, from: Node): T {
      this.setSyntheticLeadingComments(to, this.syntheticLeadingComments(from));
      this.setSyntheticTrailingComments(to, this.syntheticTrailingComments(from));
      const e = this.getOrCreate(from);
      e.leadingComments = undefined;
      e.trailingComments = undefined;
      return to;
    }
    ignoreSourceNewlines<T extends Node>(n: T): T {
      this.getOrCreate(n).flags |= EmitFlags.IgnoreSourceNewlines;
      return n;
    }
    constantValue(n: qt.PropertyAccessExpression | qt.ElemAccessExpression): string | number | undefined {
      return n.emitNode?.constantValue;
    }
    setConstantValue(n: qt.PropertyAccessExpression | qt.ElemAccessExpression, v: string | number): qt.PropertyAccessExpression | qt.ElemAccessExpression {
      const e = this.getOrCreate(n);
      e.constantValue = v;
      return n;
    }
    addHelper<T extends Node>(n: T, h: qt.EmitHelper): T {
      const e = this.getOrCreate(n);
      e.helpers = qu.append(e.helpers, h);
      return n;
    }
    addHelpers<T extends Node>(n: T, hs?: qt.EmitHelper[]): T {
      if (qu.some(hs)) {
        const e = this.getOrCreate(n);
        for (const h of hs) {
          e.helpers = qu.appendIfUnique(e.helpers, h);
        }
      }
      return n;
    }
    removeHelper(n: Node, h: qt.EmitHelper): boolean {
      const e = n.emitNode;
      if (e) {
        const hs = e.helpers;
        if (hs) return qu.orderedRemoveItem(hs, h);
      }
      return false;
    }
    helpers(n: Node): qt.EmitHelper[] | undefined {
      return n.emitNode?.helpers;
    }
    moveHelpers(from: Node, to: Node, cb: (h: qt.EmitHelper) => boolean) {
      const hs = from.emitNode?.helpers;
      if (!qu.some(hs)) return;
      const t = this.getOrCreate(to);
      let c = 0;
      for (let i = 0; i < hs.length; i++) {
        const h = hs[i];
        if (cb(h)) {
          c++;
          t.helpers = qu.appendIfUnique(t.helpers, h);
        } else if (c > 0) hs[i - c] = h;
      }
      if (c > 0) hs.length -= c;
    }
    compareHelpers(x: qt.EmitHelper, y: qt.EmitHelper) {
      if (x === y) return qu.Comparison.EqualTo;
      if (x.priority === y.priority) return qu.Comparison.EqualTo;
      if (x.priority === undefined) return qu.Comparison.GreaterThan;
      if (y.priority === undefined) return qu.Comparison.LessThan;
      return qu.compareNumbers(x.priority, y.priority);
    }
    merge(from: qt.EmitNode, to?: qt.EmitNode) {
      const { flags, leadingComments, trailingComments, commentRange, sourceMapRange, tokenSourceMapRanges, constantValue, helpers, startsOnNewLine } = from;
      if (!to) to = {} as qt.EmitNode;
      if (leadingComments) to.leadingComments = qu.addRange(leadingComments.slice(), to.leadingComments);
      if (trailingComments) to.trailingComments = qu.addRange(trailingComments.slice(), to.trailingComments);
      if (flags) to.flags = flags;
      if (commentRange) to.commentRange = commentRange;
      if (sourceMapRange) to.sourceMapRange = sourceMapRange;
      if (tokenSourceMapRanges) to.tokenSourceMapRanges = qu.TextRange.merge(tokenSourceMapRanges, to.tokenSourceMapRanges!);
      if (constantValue !== undefined) to.constantValue = constantValue;
      if (helpers) to.helpers = qu.addRange(to.helpers, helpers);
      if (startsOnNewLine !== undefined) to.startsOnNewLine = startsOnNewLine;
      return to;
    }
    externalHelpersModuleName(s: qt.SourceFile) {
      const n = qf.get.originalOf(s, qf.is.sourceFile);
      return n?.emitNode?.externalHelpersModuleName;
    }
    hasRecordedExternalHelpers(s: qt.SourceFile) {
      const n = qf.get.originalOf(s, isSourceFile);
      const e = n?.emitNode;
      return !!e && (!!e.externalHelpersModuleName || !!e.externalHelpers);
    }
  })());
}
export interface Femit extends ReturnType<typeof newEmit> {}
export namespace fixme {
  let SourceMapSource: new (fileName: string, text: string, skipTrivia?: (pos: number) => number) => qt.SourceMapSource;
  export function createSourceMapSource(fileName: string, text: string, skipTrivia?: (pos: number) => number): qt.SourceMapSource {
    return new (SourceMapSource || (SourceMapSource = Node.SourceMapSourceObj))(fileName, text, qy.skipTrivia);
  }
  export function getUnscopedHelperName(name: string) {
    return qf.emit.setFlags(new qc.Identifier(name), EmitFlags.HelperName | EmitFlags.AdviseOnEmitNode);
  }
  export function inlineExpressions(expressions: readonly qt.Expression[]) {
    return expressions.length > 10 ? new qc.CommaListExpression(expressions) : reduceLeft(expressions, qf.make.comma)!;
  }
  export function createExternalHelpersImportDeclarationIfNeeded(
    sourceFile: qt.SourceFile,
    compilerOpts: qt.CompilerOpts,
    hasExportStarsToExportValues?: boolean,
    hasImportStar?: boolean,
    hasImportDefault?: boolean
  ) {
    if (compilerOpts.importHelpers && sourceFile.isEffectiveExternalModule(compilerOpts)) {
      let namedBindings: qt.NamedImportBindings | undefined;
      const moduleKind = getEmitModuleKind(compilerOpts);
      if (moduleKind >= qt.ModuleKind.ES2015 && moduleKind <= qt.ModuleKind.ESNext) {
        const helpers = qf.emit.helpers(sourceFile);
        if (helpers) {
          const helperNames: string[] = [];
          for (const helper of helpers) {
            if (!helper.scoped) {
              const importName = (helper as qt.UnscopedEmitHelper).importName;
              if (importName) {
                qu.pushIfUnique(helperNames, importName);
              }
            }
          }
          if (qu.some(helperNames)) {
            helperNames.sort(compareCaseSensitive);
            namedBindings = new qc.NamedImports(
              qu.map(helperNames, (name) =>
                sourceFile.isFileLevelUniqueName(name) ? new qc.ImportSpecifier(undefined, new qc.Identifier(name)) : new qb.ImportSpecifier(new qc.Identifier(name), getUnscopedHelperName(name))
              )
            );
            const parseNode = qf.get.originalOf(sourceFile, isSourceFile);
            const emitNode = this.getOrCreate(parseNode);
            emitNode.externalHelpers = true;
          }
        }
      } else {
        const externalHelpersModuleName = getOrCreateExternalHelpersModuleNameIfNeeded(sourceFile, compilerOpts, hasExportStarsToExportValues, hasImportStar || hasImportDefault);
        if (externalHelpersModuleName) {
          namedBindings = new qc.NamespaceImport(externalHelpersModuleName);
        }
      }
      if (namedBindings) {
        const externalHelpersImportDeclaration = new qc.ImportDeclaration(undefined, undefined, new qc.ImportClause(undefined, namedBindings), asLiteral(externalHelpersModuleNameText));
        qf.emit.addFlags(externalHelpersImportDeclaration, EmitFlags.NeverApplyImportHelper);
        return externalHelpersImportDeclaration;
      }
    }
    return;
  }
  export function getOrCreateExternalHelpersModuleNameIfNeeded(node: qt.SourceFile, compilerOpts: qt.CompilerOpts, hasExportStarsToExportValues?: boolean, hasImportStarOrImportDefault?: boolean) {
    if (compilerOpts.importHelpers && node.isEffectiveExternalModule(compilerOpts)) {
      const externalHelpersModuleName = qf.emit.externalHelpersModuleName(node);
      if (externalHelpersModuleName) return externalHelpersModuleName;
      const moduleKind = getEmitModuleKind(compilerOpts);
      let create = (hasExportStarsToExportValues || (compilerOpts.esModuleInterop && hasImportStarOrImportDefault)) && moduleKind !== qt.ModuleKind.System && moduleKind < qt.ModuleKind.ES2015;
      if (!create) {
        const helpers = qf.emit.helpers(node);
        if (helpers) {
          for (const helper of helpers) {
            if (!helper.scoped) {
              create = true;
              break;
            }
          }
        }
      }
      if (create) {
        const parseNode = qf.get.originalOf(node, isSourceFile);
        const emitNode = this.getOrCreate(parseNode);
        return emitNode.externalHelpersModuleName || (emitNode.externalHelpersModuleName = qf.make.uniqueName(externalHelpersModuleNameText));
      }
    }
    return;
  }
  export function getExternalModuleNameLiteral(
    importNode: qt.ImportDeclaration | qt.ExportDeclaration | qt.ImportEqualsDeclaration,
    sourceFile: qt.SourceFile,
    host: qt.EmitHost,
    resolver: qt.EmitResolver,
    compilerOpts: qt.CompilerOpts
  ) {
    const moduleName = qf.get.externalModuleName(importNode)!;
    if (moduleName.kind === Syntax.StringLiteral) {
      function tryRenameExternalModule(moduleName: qt.LiteralExpression, sourceFile: qt.SourceFile) {
        const rename = sourceFile.renamedDependencies && sourceFile.renamedDependencies.get(moduleName.text);
        return rename && asLiteral(rename);
      }
      function tryGetModuleNameFromDeclaration(
        declaration: qt.ImportEqualsDeclaration | qt.ImportDeclaration | qt.ExportDeclaration,
        host: qt.EmitHost,
        resolver: qt.EmitResolver,
        compilerOpts: qt.CompilerOpts
      ) {
        return tryGetModuleNameFromFile(resolver.getExternalModuleFileFromDeclaration(declaration), host, compilerOpts);
      }
      return (
        tryGetModuleNameFromDeclaration(importNode, host, resolver, compilerOpts) ||
        tryRenameExternalModule(<qt.StringLiteral>moduleName, sourceFile) ||
        qf.make.synthesizedClone(<qt.StringLiteral>moduleName)
      );
    }
    return;
  }
  export function tryGetModuleNameFromFile(file: qt.SourceFile | undefined, host: qt.EmitHost, opts: qt.CompilerOpts): qt.StringLiteral | undefined {
    if (!file) {
      return;
    }
    if (file.moduleName) return asLiteral(file.moduleName);
    if (!file.isDeclarationFile && (opts.out || opts.outFile)) return asLiteral(qf.get.externalModuleNameFromPath(host, file.fileName));
    return;
  }
}
