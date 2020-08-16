import { EmitFlags, FunctionFlags, ModifierFlags, Nodes, NodeFlags, ObjectFlags, SymbolFlags, TrafoFlags, TypeFlags } from '../types';
import { Node, Signature, Symbol, Type } from '../types';
import { qf, Fcreate, Fget, Fhas, Fis } from './frame';
import { Syntax } from '../syntax';
import { Fvisit } from './visit';
import * as qb from './bases';
import * as qc from './classes';
import * as qt from '../types';
import * as qu from '../utils';
import * as qy from '../syntax';
const Debug = { f() {} };
type AssertionKeys = qt.MatchingKeys<typeof Debug, qu.AnyFunction>;
export function newAssert(f: qt.Frame) {
  interface Frame extends qt.Frame {
    format: Fformat;
  }
  const qf = f as Frame;
  return (qf.assert = new (class extends qu.Fassert {
    level = qu.AssertionLevel.None;
    cache: Partial<Record<AssertionKeys, { level: qu.AssertionLevel; assertion: qu.AnyFunction }>> = {};
    setLevel(l: qu.AssertionLevel) {
      const old = this.level;
      this.level = l;
      if (l > old) {
        for (const k of qu.getOwnKeys(this.cache) as AssertionKeys[]) {
          const f = this.cache[k];
          if (f !== undefined && Debug[k] !== f.assertion && l >= f.level) {
            (Debug as any)[k] = f;
            this.cache[k] = undefined;
          }
        }
      }
    }
    shouldAssert(l: qu.AssertionLevel) {
      return this.level >= l;
    }
    shouldAssertFunction<K extends AssertionKeys>(l: qu.AssertionLevel, name: K): boolean {
      if (!this.shouldAssert(l)) {
        this.cache[name] = { level: l, assertion: Debug[name] };
        (Debug as any)[name] = qu.noop;
        return false;
      }
      return true;
    }
    never(x: never, m = 'Illegal value:', f?: qu.AnyFunction): never {
      const v = typeof x === 'object' && qu.hasProperty(x, 'kind') && qu.hasProperty(x, 'pos') && qf.format.syntax ? 'SyntaxKind: ' + qf.format.syntax((x as Node).kind) : JSON.stringify(x);
      return qu.fail(`${m} ${v}`, f || this.never);
    }
    eachNode<T extends Node, U extends T>(ns: Nodes<T>, test: (n: T) => n is U, m?: string, f?: qu.AnyFunction): asserts ns is Nodes<U>;
    eachNode<T extends Node, U extends T>(ns: readonly T[], test: (n: T) => n is U, m?: string, f?: qu.AnyFunction): asserts ns is readonly U[];
    eachNode(ns: readonly Node[], test: (n: Node) => boolean, m?: string, f?: qu.AnyFunction): void;
    eachNode(ns: readonly Node[], test: (n: Node) => boolean, m?: string, f?: qu.AnyFunction) {
      if (this.shouldAssertFunction(qu.AssertionLevel.Normal, 'assert.eachNode')) {
        this.true(test === undefined || qu.every(ns, test), m || 'Unexpected node.', () => `Node array did not pass test '${qu.getFunctionName(test)}'.`, f || this.eachNode);
      }
    }
    node<T extends Node, U extends T>(n: T | undefined, test: (n: T) => n is U, m?: string, f?: qu.AnyFunction): asserts n is U;
    node(n?: Node, test?: (n: Node) => boolean, m?: string, f?: qu.AnyFunction): void;
    node(n?: Node, test?: (n: Node) => boolean, m?: string, f?: qu.AnyFunction) {
      if (this.shouldAssertFunction(qu.AssertionLevel.Normal, 'assert.node')) {
        this.true(
          n !== undefined && (test === undefined || test(n)),
          m || 'Unexpected node.',
          () => `Node ${qf.format.syntax(n!.kind)} did not pass test '${qu.getFunctionName(test!)}'.`,
          f || this.node
        );
      }
    }
    notNode<T extends Node, U extends T>(n: T | undefined, test: (n: Node) => n is U, m?: string, f?: qu.AnyFunction): asserts n is Exclude<T, U>;
    notNode(n?: Node, test?: (n: Node) => boolean, m?: string, f?: qu.AnyFunction): void;
    notNode(n?: Node, test?: (n: Node) => boolean, m?: string, f?: qu.AnyFunction) {
      if (this.shouldAssertFunction(qu.AssertionLevel.Normal, 'assert.notNode')) {
        this.true(
          n === undefined || test === undefined || !test(n),
          m || 'Unexpected node.',
          () => `Node ${qf.format.syntax(n!.kind)} should not have passed test '${qu.getFunctionName(test!)}'.`,
          f || this.notNode
        );
      }
    }
    optionalNode<T extends Node, U extends T>(n: T, test: (n: T) => n is U, m?: string, f?: qu.AnyFunction): asserts n is U;
    optionalNode<T extends Node, U extends T>(n: T | undefined, test: (n: T) => n is U, m?: string, f?: qu.AnyFunction): asserts n is U | undefined;
    optionalNode(n?: Node, test?: (n: Node) => boolean, m?: string, f?: qu.AnyFunction): void;
    optionalNode(n?: Node, test?: (n: Node) => boolean, m?: string, f?: qu.AnyFunction) {
      if (this.shouldAssertFunction(qu.AssertionLevel.Normal, 'assert.optionalNode')) {
        this.true(
          test === undefined || n === undefined || test(n),
          m || 'Unexpected node.',
          () => `Node ${qf.format.syntax(n!.kind)} did not pass test '${qu.getFunctionName(test!)}'.`,
          f || this.optionalNode
        );
      }
    }
    optionalToken<T extends Node, K extends Syntax>(n: T, k: K, m?: string, f?: qu.AnyFunction): asserts n is Extract<T, { readonly kind: K }>;
    optionalToken<T extends Node, K extends Syntax>(n: T | undefined, k: K, m?: string, f?: qu.AnyFunction): asserts n is Extract<T, { readonly kind: K }> | undefined;
    optionalToken(n?: Node, k?: Syntax, m?: string, f?: qu.AnyFunction): void;
    optionalToken(n?: Node, k?: Syntax, m?: string, f?: qu.AnyFunction) {
      if (this.shouldAssertFunction(qu.AssertionLevel.Normal, 'assert.optionalToken')) {
        this.true(
          k === undefined || n === undefined || n.kind === k,
          m || 'Unexpected node.',
          () => `Node ${qf.format.syntax(n!.kind)} was not a '${qf.format.syntax(k)}' token.`,
          f || this.optionalToken
        );
      }
    }
    missingNode(n?: Node, m?: string, f?: qu.AnyFunction): asserts n is undefined;
    missingNode(n?: Node, m?: string, f?: qu.AnyFunction) {
      if (this.shouldAssertFunction(qu.AssertionLevel.Normal, 'assert.missingNode')) {
        this.true(n === undefined, m || 'Unexpected node.', () => `Node ${qf.format.syntax(n!.kind)} was unexpected'.`, f || this.missingNode);
      }
    }
  })());
}
export interface Fassert extends ReturnType<typeof newAssert> {}

export function newType(f: qt.Frame) {
  interface Frame extends qt.Frame {
    get: Fget;
    has: Fhas;
    is: Fis;
  }
  const qf = f as Frame;
  return (qf.type = new (class Ftype {
    is = new (class extends Ftype {
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
      param(t: Type): t is qt.TypeParam {
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
          (qu.length(qf.get.propertiesOfType(t)) === 1 || qu.every(qf.get.propertiesOfType(t), (s) => !!(s.flags & qt.SymbolFlags.Optional)))
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
          : !!(
              t.symbol &&
              (t.symbol.flags & (SymbolFlags.ObjectLiteral | qt.SymbolFlags.TypeLiteral | qt.SymbolFlags.Enum | qt.SymbolFlags.ValueModule)) !== 0 &&
              !this.withCallOrConstructSignatures(t)
            ) || !!(t.objectFlags & ObjectFlags.ReverseMapped && this.withInferableIndex((t as qt.ReverseMappedType).source));
      }
      nonGenericTopLevel(t: Type) {
        if (t.aliasSymbol && !t.aliasTypeArgs) {
          const d = t.aliasSymbol.declarationOfKind(Syntax.TypeAliasDeclaration);
          return !!(d && qc.findAncestor(d.parent, (n) => (n.kind === Syntax.SourceFile ? true : n.kind === Syntax.ModuleDeclaration ? false : 'quit')));
        }
        return false;
      }
      paramAtTopLevel(t: Type, p: qt.TypeParam): boolean {
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
          ((t.members && this.emptyResolvedType(t)) || (t.symbol && t.symbol.flags & qt.SymbolFlags.TypeLiteral && qf.get.membersOfSymbol(t.symbol).size === 0))
        );
      }
      stringIndexSignatureOnly(t: Type): boolean {
        return (
          (t.flags & TypeFlags.Object &&
            !this.genericMapped(t) &&
            qf.get.propertiesOfType(t).length === 0 &&
            qf.get.indexInfoOfType(t, IndexKind.String) &&
            !qf.get.indexInfoOfType(t, IndexKind.Number)) ||
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
        if (t.flags & TypeFlags.StructuredOrInstantiable || to.flags & TypeFlags.StructuredOrInstantiable) return check.typeRelatedTo(t, to, r, undefined);
        return false;
      }
      ignoredJsxProperty(t: Type, s: qt.Symbol) {
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
            qu.every(r.properties, (p) => !!(p.flags & qt.SymbolFlags.Optional))
          );
        }
        if (t.flags & TypeFlags.Intersection) return qu.every(t.types, qf.type.is.weak);
        return false;
      }
      unconstrainedParam(t: Type) {
        return t.flags & TypeFlags.TypeParam && !qf.get.constraintOfTypeParam(t);
      }
      nonDeferredReference(t: Type): t is qt.TypeReference {
        return !!(t.objectFlags & ObjectFlags.Reference) && !t.node;
      }
      referenceWithGenericArgs(t: Type): boolean {
        return this.nonDeferredReference(t) && qu.some(getTypeArgs(t), (a) => this.unconstrainedParam(a) || this.referenceWithGenericArgs(a));
      }
    })();
  })());
}
export interface Ftype extends ReturnType<typeof newType> {}

export function newSymbol(f: qt.Frame) {
  interface Frame extends qt.Frame {
    get: Fget;
    has: Fhas;
    is: Fis;
  }
  const qf = f as Frame;
  return (qf.symbol = new (class {})());
}
export interface Fsymbol extends ReturnType<typeof newSymbol> {}
export function newSignature(f: qt.Frame) {
  interface Frame extends qt.Frame {
    get: Fget;
    has: Fhas;
    is: Fis;
  }
  const qf = f as Frame;
  return (qf.signature = new (class {})());
}
export interface Fsignature extends ReturnType<typeof newSignature> {}

export function newDecl(f: qt.Frame) {
  interface Frame extends qt.Frame {
    calc: Fcalc;
    create: Fcreate;
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
      has_restParam(n: qt.SignatureDeclaration | qt.DocSignature) {
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
        const c = qf.create.qf.create.mutableClone(n);
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
    members(d?: qt.Declaration): Nodes<qt.ClassElem> | Nodes<qt.TypeElem> | Nodes<qt.ObjectLiteralElem> | undefined {
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
    functionFlags(n?: qt.SignatureDeclaration) {
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
      const { typeParams } = n.parent?.parent?.parent as qt.SignatureDeclaration | qt.InterfaceDeclaration | qt.ClassDeclaration;
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
    thisNodeKind(s: qt.SignatureDeclaration | qt.DocSignature): qt.ParamDeclaration | undefined {
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
    effectiveReturnTypeNode(n: qt.SignatureDeclaration | qt.DocSignature): qt.Typing | undefined {
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
    doc_typeParamDeclarations(n: qt.DeclarationWithTypeParams): readonly qt.TypeParamDeclaration[] {
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
    withParamTags(n: qt.FunctionLikeDeclaration | qt.SignatureDeclaration) {
      return !!qf.get.doc.firstTag(n, qf.is.doc.paramTag);
    }
  })());
}
export interface Fdecl extends ReturnType<typeof newDecl> {}
export function newFormat(f: qt.Frame) {
  interface Frame extends qt.Frame {}
  const qf = f as Frame;
  return (qf.format = new (class {
    emitFlags(f?: qt.EmitFlags): string {
      return qu.formatEnum(f, (qt as any).EmitFlags, true);
    }
    modifierFlags(f?: ModifierFlags): string {
      return qu.formatEnum(f, (qt as any).ModifierFlags, true);
    }
    nodeFlags(f?: NodeFlags): string {
      return qu.formatEnum(f, (qt as any).NodeFlags, true);
    }
    objectFlags(f?: ObjectFlags): string {
      return qu.formatEnum(f, (qt as any).ObjectFlags, true);
    }
    symbol(s: qt.Symbol): string {
      return `{ name: ${qy.get.unescUnderscores(s.escName)}; flags: ${this.symbolFlags(s.flags)}; declarations: ${qu.map(s.declarations, (n) => this.syntax(n.kind))} }`;
    }
    symbolFlags(f?: SymbolFlags): string {
      return qu.formatEnum(f, (qt as any).SymbolFlags, true);
    }
    syntax(k?: Syntax): string {
      return qu.formatEnum(k, (qt as any).SyntaxKind, false);
    }
    trafoFlags(f?: TrafoFlags): string {
      return qu.formatEnum(f, (qt as any).TrafoFlags, true);
    }
    typeFlags(f?: TypeFlags): string {
      return qu.formatEnum(f, (qt as any).TypeFlags, true);
    }
  })());
}
export interface Fformat extends ReturnType<typeof newFormat> {}
export function newSkip(f: qt.Frame) {
  interface Frame extends qt.Frame {
    is: Fis;
  }
  const qf = f as Frame;
  return (qf.skip = new (class {
    outerExpressions(n: qt.Expression, ks?: qt.OuterExpressionKinds): qt.Expression;
    outerExpressions(n: Node, ks?: qt.OuterExpressionKinds): Node;
    outerExpressions(n: Node | qt.Expression, ks = qt.OuterExpressionKinds.All): Node | qt.Expression {
      while (qf.is.outerExpression(n, ks)) {
        n = n.expression;
      }
      return n;
    }
    assertions(n: qt.Expression): qt.Expression;
    assertions(n: Node): Node;
    assertions(n: Node | qt.Expression) {
      return this.outerExpressions(n, qt.OuterExpressionKinds.Assertions);
    }
    parentheses(n: qt.Expression): qt.Expression;
    parentheses(n: Node): Node;
    parentheses(n: Node | qt.Expression) {
      return this.outerExpressions(n, qt.OuterExpressionKinds.Parentheses);
    }
    partiallyEmittedExpressions(n: qt.Expression): qt.Expression;
    partiallyEmittedExpressions(n: Node): Node;
    partiallyEmittedExpressions(n: Node | qt.Expression) {
      return this.outerExpressions(n, qt.OuterExpressionKinds.PartiallyEmittedExpressions);
    }
  })());
}
export interface Fskip extends ReturnType<typeof newSkip> {}
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
    create: Fcreate;
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
        const e2 = qf.create.assignment(n, e).setRange(n);
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
          const c = qf.create.mutableClone(e2);
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
    return expressions.length > 10 ? new qc.CommaListExpression(expressions) : reduceLeft(expressions, qf.create.comma)!;
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
        return emitNode.externalHelpersModuleName || (emitNode.externalHelpersModuleName = qf.create.uniqueName(externalHelpersModuleNameText));
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
        qf.create.synthesizedClone(<qt.StringLiteral>moduleName)
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
