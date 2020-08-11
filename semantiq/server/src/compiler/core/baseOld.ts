import * as qc from './index';
import * as qd from '../diagnostic';
import { qf } from './frame';
import { Node } from '../type';
import { CheckFlags, EmitFlags, ModifierFlags, NodeFlags, ObjectFlags, SignatureFlags, SymbolFlags, TrafoFlags, TypeFlags } from '../type';
import * as qt from '../type';
import * as qu from '../util';
import { Syntax } from '../syntax';
import * as qy from '../syntax';
export abstract class Symbol implements qt.Symbol {
  assigned?: boolean;
  assignmentDeclarations?: qu.QMap<qt.Declaration>;
  constEnumOnlyModule?: boolean;
  declarations?: qt.Declaration[];
  docComment?: qt.SymbolDisplayPart[];
  exports?: SymbolTable;
  exportSymbol?: Symbol;
  getComment?: qt.SymbolDisplayPart[];
  globalExports?: SymbolTable;
  id?: number;
  members?: SymbolTable;
  mergeId?: number;
  parent?: Symbol;
  referenced?: SymbolFlags;
  replaceable?: boolean;
  setComment?: qt.SymbolDisplayPart[];
  tags?: qt.DocTagInfo[];
  valueDeclaration?: qt.Declaration;
  constructor(public flags: SymbolFlags, public escName: qu.__String) {}
  get name() {
    const n = this.valueDeclaration;
    if (qf.is.privateIdentifierPropertyDeclaration(n)) return idText(n.name);
    return qy.get.unescUnderscores(this.escName);
  }
  abstract getId(): number;
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
    return v.kind === Syntax.FunctionDeclaration || (qf.is.kind(qc.VariableDeclaration, v) && v.initer && qf.is.functionLike(v.initer));
  }
  isUMDExport() {
    return this.declarations?.[0] && qf.is.kind(qc.NamespaceExportDeclaration, this.declarations[0]);
  }
  skipAlias(c: qt.TypeChecker) {
    return this.flags & SymbolFlags.Alias ? c.get.aliasedSymbol(this) : this;
  }
  propertyNameForUnique(): qu.__String {
    return `__@${this.getId()}@${this.escName}` as qu.__String;
  }
  nameForPrivateIdentifier(s: qu.__String): qu.__String {
    return `__#${this.getId()}@${s}` as qu.__String;
  }
  localForExportDefault() {
    return this.isExportDefault() ? this.declarations![0].localSymbol : undefined;
  }
  nonAugmentationDeclaration() {
    const ds = this.declarations;
    return ds && qu.find(ds, (d) => !qf.is.externalModuleAugmentation(d as Node) && !(d.kind === Syntax.ModuleDeclaration && qf.is.globalScopeAugmentation(d as Node)));
  }
  setValueDeclaration(d: qt.Declaration) {
    const v = this.valueDeclaration;
    if (
      !v ||
      (!(d.flags & NodeFlags.Ambient && !(v.flags & NodeFlags.Ambient)) && qf.is.assignmentDeclaration(v) && !qf.is.assignmentDeclaration(d)) ||
      (v.kind !== d.kind && qf.is.effectiveModuleDeclaration(v))
    ) {
      this.valueDeclaration = d;
    }
  }
  declarationModifierFlags(): ModifierFlags {
    if (this.valueDeclaration) {
      const f = qf.get.combinedModifierFlags(this.valueDeclaration);
      return this.parent && this.parent.flags & SymbolFlags.Class ? f : f & ~ModifierFlags.AccessibilityModifier;
    }
    if (this.isTransient() && this.checkFlags() & CheckFlags.Synthetic) {
      const f = this.checkFlags;
      const a = f & CheckFlags.ContainsPrivate ? ModifierFlags.Private : f & CheckFlags.ContainsPublic ? ModifierFlags.Public : ModifierFlags.Protected;
      const s = f & CheckFlags.ContainsStatic ? ModifierFlags.Static : 0;
      return a | s;
    }
    if (this.flags & SymbolFlags.Prototype) return ModifierFlags.Public | ModifierFlags.Static;
    return 0;
  }
  classLikeDeclaration(): qt.ClassLikeDeclaration | undefined {
    const ds = this.declarations;
    return ds && qu.find(ds, qf.is.classLike);
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
  comment(c?: qt.TypeChecker): qt.SymbolDisplayPart[] {
    if (!this.docComment) {
      this.docComment = qu.empty;
      if (!this.declarations && this.isTransient()) {
        const t = this.target as Symbol | undefined;
        if (t?.isTransient() && t.tupleLabelDeclaration) return (this.docComment = getDocComment([t.tupleLabelDeclaration], c));
      }
      this.docComment = getDocComment(this.declarations, c);
    }
    return this.docComment;
  }
  commentFor(n?: Node, c?: qt.TypeChecker): qt.SymbolDisplayPart[] {
    switch (n?.kind) {
      case Syntax.GetAccessor:
        if (!this.getComment) {
          this.getComment = qu.empty;
          this.getComment = getDocComment(qu.filter(this.declarations, qf.is.getAccessor), c);
        }
        return this.getComment!;
      case Syntax.SetAccessor:
        if (!this.setComment) {
          this.setComment = qu.empty;
          this.setComment = getDocComment(qu.filter(this.declarations, isSetAccessor), c);
        }
        return this.setComment!;
    }
    return this.comment(c);
  }
  docTags(): qt.DocTagInfo[] {
    if (!this.tags) this.tags = Doc.getDocTagsFromDeclarations(this.declarations);
    return this.tags!;
  }
  abstract merge(t: Symbol, unidir?: boolean): this;
  copy(to: SymbolTable, f: SymbolFlags) {
    if (this.combinedLocalAndExportSymbolFlags() & f) {
      const n = this.escName;
      if (!to.has(n)) to.set(n, this);
    }
  }
}
export class SymbolTable<S extends Symbol = Symbol> extends Map<qu.__String, S> implements qu.EscapedMap<S>, qt.SymbolTable<S> {
  constructor(ss?: readonly S[]) {
    super();
    if (ss) {
      for (const s of ss) {
        this.set(s.escName, s);
      }
    }
  }
  add(ss: SymbolTable<S>, m: qd.Message) {
    const addDiagnostic = (n: string, m: qd.Message) => {
      return (d: qt.Declaration) => diagnostics.add(qf.create.diagnosticForNode(d, m, n));
    };
    ss.forEach((s, n) => {
      const t = this.get(n);
      if (t) qu.each(t.declarations, addDiagnostic(qy.get.unescUnderscores(n), m));
      else this.set(n, s);
    });
  }
  merge(ss: SymbolTable<S>, unidir = false) {
    ss.forEach((s, n) => {
      const t = this.get(n);
      this.set(n, t ? s.merge(t, unidir) : s);
    });
  }
  combine(ss?: SymbolTable<S>): SymbolTable<S> | undefined {
    if (!qu.hasEntries(this)) return ss;
    if (!qu.hasEntries(ss)) return this;
    const r = new SymbolTable<S>();
    r.merge(this);
    r.merge(ss!);
    return r;
  }
  copy(to: SymbolTable<S>, f: SymbolFlags) {
    if (f) this.forEach((s) => s.copy(to, f));
  }
}
export class Type implements qt.Type {
  _objectFlags!: ObjectFlags;
  aliasSymbol?: Symbol;
  aliasTypeArgs?: readonly Type[];
  aliasTypeArgsContainsMarker?: boolean;
  id!: number;
  immediateBaseConstraint?: Type;
  pattern?: qt.DestructuringPattern;
  permissive?: Type;
  restrictive?: Type;
  symbol?: Symbol;
  widened?: Type;
  constructor(public checker: qt.TypeChecker, public flags: TypeFlags) {}
  get typeArgs() {
    if (this.objectFlags & ObjectFlags.Reference) return this.checker.get.typeArgs((this as qt.Type) as qt.TypeReference);
    return;
  }
  get objectFlags(): ObjectFlags {
    return this.flags & TypeFlags.ObjectFlagsType ? this._objectFlags : 0;
  }
  isUnion(): this is qt.UnionType {
    return !!(this.flags & TypeFlags.Union);
  }
  isIntersection(): this is qt.IntersectionType {
    return !!(this.flags & TypeFlags.Intersection);
  }
  isUnionOrIntersection(): this is qt.UnionOrIntersectionType {
    return !!(this.flags & TypeFlags.UnionOrIntersection);
  }
  isLiteral(): this is qt.LiteralType {
    return !!(this.flags & TypeFlags.StringOrNumberLiteral);
  }
  isStringLiteral(): this is qt.StringLiteralType {
    return !!(this.flags & TypeFlags.StringLiteral);
  }
  isNumberLiteral(): this is qt.NumberLiteralType {
    return !!(this.flags & TypeFlags.NumberLiteral);
  }
  isTypeParam(): this is qt.TypeParam {
    return !!(this.flags & TypeFlags.TypeParam);
  }
  isClassOrInterface(): this is qt.InterfaceType {
    return !!(this.objectFlags & ObjectFlags.ClassOrInterface);
  }
  isClass(): this is qt.InterfaceType {
    return !!(this.objectFlags & ObjectFlags.Class);
  }
  isNullableType() {
    return this.checker.is.nullableType(this);
  }
  hasCallOrConstructSignatures() {
    return this.checker.get.signaturesOfType(this, qt.SignatureKind.Call).length !== 0 || this.checker.get.signaturesOfType(this, qt.SignatureKind.Construct).length !== 0;
  }
  isAbstractConstructorType() {
    return !!(this.objectFlags & ObjectFlags.Anonymous) && !!this.symbol?.isAbstractConstructor();
  }
  properties(): qt.Symbol[] {
    return this.checker.get.propertiesOfType(this);
  }
  property(n: string): qt.Symbol | undefined {
    return this.checker.get.propertyOfType(this, n);
  }
  apparentProperties(): qt.Symbol[] {
    return this.checker.get.augmentedPropertiesOfType(this);
  }
  callSignatures(): readonly qt.Signature[] {
    return this.checker.get.signaturesOfType(this, qt.SignatureKind.Call);
  }
  constructSignatures(): readonly qt.Signature[] {
    return this.checker.get.signaturesOfType(this, qt.SignatureKind.Construct);
  }
  stringIndexType(): qt.Type | undefined {
    return this.checker.get.indexTypeOfType(this, qt.IndexKind.String);
  }
  numberIndexType(): qt.Type | undefined {
    return this.checker.get.indexTypeOfType(this, qt.IndexKind.Number);
  }
  baseTypes(): qt.BaseType[] | undefined {
    return this.isClassOrInterface() ? this.checker.get.baseTypes(this) : undefined;
  }
  nonNullableType(): qt.Type {
    return this.checker.get.nonNullableType(this);
  }
  nonOptionalType(): qt.Type {
    return this.checker.get.nonOptionalType(this);
  }
  constraint(): qt.Type | undefined {
    return this.checker.get.baseConstraintOfType(this);
  }
  default(): qt.Type | undefined {
    return this.checker.get.defaultFromTypeParam(this);
  }
}
export class Signature implements qt.Signature {
  canonicalCache?: Signature;
  declaration?: qt.SignatureDeclaration | qt.DocSignature;
  docComment?: qt.SymbolDisplayPart[];
  docTags?: qt.DocTagInfo[];
  erasedCache?: Signature;
  instantiations?: qu.QMap<Signature>;
  isolatedSignatureType?: qt.ObjectType;
  mapper?: qt.TypeMapper;
  minArgCount!: number;
  minTypeArgCount!: number;
  optionalCallCache?: { inner?: Signature; outer?: Signature };
  params!: readonly Symbol[];
  resolvedPredicate?: qt.TypePredicate;
  resolvedReturn?: Type;
  target?: Signature;
  thisParam?: Symbol;
  typeParams?: readonly qt.TypeParam[];
  unions?: Signature[];
  constructor(public checker: qt.TypeChecker, public flags: SignatureFlags) {}
  hasRestParam() {
    return !!(this.flags & SignatureFlags.HasRestParam);
  }
  hasLiteralTypes() {
    return !!(this.flags & SignatureFlags.HasLiteralTypes);
  }
  getReturnType(): qt.Type {
    return this.checker.get.returnTypeOfSignature(this);
  }
  getDocComment(): qt.SymbolDisplayPart[] {
    return this.docComment || (this.docComment = getDocComment(qu.singleElemArray(this.declaration), this.checker));
  }
  getDocTags(): qt.DocTagInfo[] | undefined {
    if (this.docTags === undefined) {
      this.docTags = this.declaration ? Doc.getDocTagsFromDeclarations([this.declaration]) : [];
    }
    return this.docTags;
  }
  restTypeOfSignature(s: qt.Signature): qt.Type {
    return tryGetRestTypeOfSignature(signature) || anyType;
  }
  erased(): this {
    return this.typeParams ? this.erasedCache || (this.erasedCache = qf.create.erasedSignature(this)) : this;
  }
  canonicalSignature(): this {
    return this.typeParams ? this.canonicalCache || (this.canonicalCache = qf.create.canonicalSignature(this)) : this;
  }
  baseSignature(): this {
    const ps = this.typeParams;
    if (ps) {
      const typeEraser = qf.create.typeEraser(ps);
      const baseConstraints = qu.map(ps, (p) => instantiateType(this.baseConstraintOfType(p), typeEraser) || unknownType);
      return instantiateSignature(this, qf.create.typeMapper(ps, baseConstraints), true);
    }
    return this;
  }
  numNonRestParams() {
    const l = this.params.length;
    return this.hasRestParam() ? l - 1 : l;
  }
  thisTypeOfSignature(): qt.Type | undefined {
    if (this.thisParam) return qf.get.typeOfSymbol(this.thisParam);
    return;
  }
  typePredicateOfSignature(): qt.TypePredicate | undefined {
    if (!this.resolvedPredicate) {
      if (this.target) {
        const targetTypePredicate = this.typePredicateOfSignature(this.target);
        this.resolvedPredicate = targetTypePredicate ? instantiateTypePredicate(targetTypePredicate, this.mapper!) : noTypePredicate;
      } else if (this.unions) {
        this.resolvedPredicate = qf.get.unionTypePredicate(this.unions) || noTypePredicate;
      } else {
        const type = this.declaration && this.effectiveReturnTypeNode(this.declaration);
        let jsdocPredicate: TypePredicate | undefined;
        if (!type && qf.is.inJSFile(this.declaration)) {
          const jsdocSignature = this.thisOfTypeTag(this.declaration!);
          if (jsdocSignature && this !== jsdocSignature) jsdocPredicate = this.typePredicateOfSignature(jsdocSignature);
        }
        this.resolvedPredicate = type && t.kind === Syntax.TypingPredicate ? qf.create.typePredicateFromTypingPredicate(t, this) : jsdocPredicate || noTypePredicate;
      }
      qu.assert(!!this.resolvedPredicate);
    }
    return this.resolvedPredicate === noTypePredicate ? undefined : this.resolvedPredicate;
  }
  returnTypeOfSignature(): qt.Type {
    if (!this.resolvedReturn) {
      if (!pushTypeResolution(this, TypeSystemPropertyName.ResolvedReturnType)) return errorType;
      let type = this.target
        ? instantiateType(this.returnTypeOfSignature(this.target), this.mapper)
        : this.unions
        ? this.unionType(map(this.unions, this.returnTypeOfSignature), UnionReduction.Subtype)
        : this.returnTypeFromAnnotation(this.declaration!) ||
          (qf.is.missing((<FunctionLikeDeclaration>this.declaration).body) ? anyType : this.returnTypeFromBody(<FunctionLikeDeclaration>this.declaration));
      if (this.flags & qt.SignatureFlags.IsInnerCallChain) type = addOptionalTypeMarker(t);
      else if (this.flags & qt.SignatureFlags.IsOuterCallChain) {
        type = this.optionalType(t);
      }
      if (!popTypeResolution()) {
        if (this.declaration) {
          const typeNode = this.effectiveReturnTypeNode(this.declaration);
          if (typeNode) error(typeNode, qd.msgs.Return_type_annotation_circularly_references_itself);
          else if (noImplicitAny) {
            const declaration = <Declaration>this.declaration;
            const name = this.declaration.nameOf(declaration);
            if (name) {
              error(
                name,
                qd.msgs._0_implicitly_has_return_type_any_because_it_does_not_have_a_return_type_annotation_and_is_referenced_directly_or_indirectly_in_one_of_its_return_expressions,
                declarationNameToString(name)
              );
            } else {
              error(
                declaration,
                qd.msgs.Function_implicitly_has_return_type_any_because_it_does_not_have_a_return_type_annotation_and_is_referenced_directly_or_indirectly_in_one_of_its_return_expressions
              );
            }
          }
        }
        type = anyType;
      }
      this.resolvedReturn = type;
    }
    return this.resolvedReturn;
  }

  optionalCallSignature(f: qt.SignatureFlags): qt.Signature {
    if ((this.flags & qt.SignatureFlags.CallChainFlags) === f) return this;
    if (!this.optionalCallCache) this.optionalCallCache = {};
    const key = f === qt.SignatureFlags.IsInnerCallChain ? 'inner' : 'outer';
    return this.optionalCallCache[key] || (this.optionalCallCache[key] = qf.create.optionalCallSignature(this, f));
  }

  expandedParams(skipUnionExpanding?: boolean): readonly (readonly Symbol[])[] {
    if (this.hasRestParam()) {
      const restIndex = this.params.length - 1;
      const restType = this.typeOfSymbol(this.params[restIndex]);
      if (qf.is.tupleType(restType)) return [expandSignatureParamsWithTupleMembers(restType, restIndex)];
      else if (!skipUnionExpanding && restType.flags & qt.TypeFlags.Union && every((restType as UnionType).types, qf.is.tupleType))
        return map((restType as UnionType).types, (t) => expandSignatureParamsWithTupleMembers(t as TupleTypeReference, restIndex));
    }
    return [this.params];
    const expandSignatureParamsWithTupleMembers = (restType: TupleTypeReference, restIndex: number) => {
      const elemTypes = this.typeArgs(restType);
      const minLength = restType.target.minLength;
      const tupleRestIndex = restType.target.hasRestElem ? elemTypes.length - 1 : -1;
      const associatedNames = restType.target.labeledElemDeclarations;
      const restParams = map(elemTypes, (t, i) => {
        const tupleLabelName = !!associatedNames && this.tupleElemLabel(associatedNames[i]);
        const name = tupleLabelName || this.paramNameAtPosition(sig, restIndex + i);
        const f = i === tupleRestIndex ? qt.CheckFlags.RestParam : i >= minLength ? qt.CheckFlags.OptionalParam : 0;
        const symbol = new Symbol(SymbolFlags.FunctionScopedVariable, name, f);
        symbol.type = i === tupleRestIndex ? qf.create.arrayType(t) : t;
        return symbol;
      });
      return concatenate(this.params.slice(0, restIndex), restParams);
    };
  }

  paramNameAtPosition(pos: number) {
    const l = s.params.length - (this.hasRestParam() ? 1 : 0);
    if (pos < l) return this.params[pos].escName;
    const rest = this.params[l] || unknownSymbol;
    const t = qf.get.typeOfSymbol(rest);
    if (qf.is.tupleType(t)) {
      const ds = (<TupleType>(<TypeReference>t).target).labeledElemDeclarations;
      const i = pos - l;
      return (ds && this.tupleElemLabel(ds[i])) || ((rest.escName + '_' + i) as qu.__String);
    }
    return rest.escName;
  }
  nameableDeclarationAtPosition(pos: number) {
    const l = this.params.length - (this.hasRestParam() ? 1 : 0);
    if (pos < l) {
      const d = this.params[pos].valueDeclaration;
      return d && qf.is.validDeclarationForTupleLabel(d) ? d : undefined;
    }
    const rest = this.params[l] || unknownSymbol;
    const t = this.typeOfSymbol(restParam);
    if (qf.is.tupleType(t)) {
      const ds = (<TupleType>(<TypeReference>t).target).labeledElemDeclarations;
      const i = pos - l;
      return ds && ds[index];
    }
    return rest.valueDeclaration && qf.is.validDeclarationForTupleLabel(rest.valueDeclaration) ? rest.valueDeclaration : undefined;
  }
  typeAtPosition(pos: number): qt.Type {
    return this.tryGetTypeAtPosition(pos) || anyType;
  }
  restTypeAtPosition(source: qt.Signature, pos: number): qt.Type {
    const paramCount = this.paramCount(source);
    const restType = this.effectiveRestType(source);
    const nonRestCount = paramCount - (restType ? 1 : 0);
    if (restType && pos === nonRestCount) return restType;
    const types = [];
    let names: (NamedTupleMember | qt.ParamDeclaration)[] | undefined = [];
    for (let i = pos; i < nonRestCount; i++) {
      types.push(this.typeAtPosition(source, i));
      const name = this.nameableDeclarationAtPosition(source, i);
      if (name && names) names.push(name);
      else names = undefined;
    }
    if (restType) {
      types.push(this.indexedAccessType(restType, numberType));
      const name = this.nameableDeclarationAtPosition(source, nonRestCount);
      if (name && names) names.push(name);
      else names = undefined;
    }
    const minArgCount = this.minArgCount(source);
    const minLength = minArgCount < pos ? 0 : minArgCount - pos;
    return qf.create.tupleType(types, minLength, !!restType, false, names);
  }
  paramCount() {
    const length = s.params.length;
    if (this.hasRestParam()) {
      const t = this.typeOfSymbol(s.params[length - 1]);
      if (qf.is.tupleType(t)) return length + this.typeArgs(t).length - 1;
    }
    return length;
  }
  minArgCount(strongArityForUntypedJS?: boolean) {
    if (this.hasRestParam()) {
      const t = this.typeOfSymbol(s.params[s.params.length - 1]);
      if (qf.is.tupleType(t)) {
        const l = t.target.minLength;
        if (l > 0) return s.params.length - 1 + l;
      }
    }
    if (!strongArityForUntypedJS && s.flags & qt.SignatureFlags.IsUntypedSignatureInJSFile) return 0;
    return s.minArgCount;
  }
  effectiveRestType() {
    if (this.hasRestParam()) {
      const t = this.typeOfSymbol(this.params[this.params.length - 1]);
      return qf.is.tupleType(t) ? this.restArrayTypeOfTupleType(t) : t;
    }
    return;
  }
  nonArrayRestType() {
    const t = this.effectiveRestType(this);
    return t && !qu.isArrayType(t) && !qf.is.typeAny(t) && (qf.get.reducedType(t).flags & qt.TypeFlags.Never) === 0 ? t : undefined;
  }
  typeOfFirstParamOfSignature() {
    return this.typeOfFirstParamOfSignatureWithFallback(neverType);
  }
  typeOfFirstParamOfSignatureWithFallback(fallback: qt.Type) {
    return this.params.length > 0 ? qf.get.typeAtPosition(this, 0) : fallback;
  }
}
export class SourceFile extends Decl implements qy.SourceFile, qt.SourceFile {
  static readonly kind = Syntax.SourceFile;
  kind: Syntax.SourceFile;
  statements: Nodes<qt.Statement>;
  endOfFileToken: Token<Syntax.EndOfFileToken>;
  fileName: string;
  path: Path;
  text: string;
  resolvedPath: Path;
  originalFileName: string;
  redirectInfo?: RedirectInfo;
  amdDependencies: readonly AmdDependency[];
  moduleName?: string;
  referencedFiles: readonly FileReference[];
  typeReferenceDirectives: readonly FileReference[];
  libReferenceDirectives: readonly FileReference[];
  languageVariant: LanguageVariant;
  isDeclarationFile: boolean;
  renamedDependencies?: qu.QReadonlyMap<string>;
  hasNoDefaultLib: boolean;
  languageVersion: ScriptTarget;
  externalModuleIndicator?: Nobj;
  scriptKind: ScriptKind;
  commonJsModuleIndicator?: Nobj;
  jsGlobalAugmentations?: SymbolTable;
  identifiers: qu.QMap<string>;
  nodeCount: number;
  identifierCount: number;
  symbolCount: number;
  parseDiagnostics: qd.DiagnosticWithLocation[];
  bindDiagnostics: qd.DiagnosticWithLocation[];
  bindSuggestionDiagnostics?: qd.DiagnosticWithLocation[];
  docDiagnostics?: qd.DiagnosticWithLocation[];
  additionalSyntacticDiagnostics?: readonly qd.DiagnosticWithLocation[];
  lineMap: readonly number[];
  classifiableNames?: qu.ReadonlyEscapedMap<true>;
  commentDirectives?: qt.CommentDirective[];
  resolvedModules?: qu.QMap<ResolvedModuleFull | undefined>;
  resolvedTypeReferenceDirectiveNames: qu.QMap<ResolvedTypeReferenceDirective | undefined>;
  imports: readonly StringLiteralLike[];
  moduleAugmentations: readonly (StringLiteral | Identifier)[];
  patternAmbientModules?: PatternAmbientModule[];
  ambientModuleNames: readonly string[];
  checkJsDirective?: CheckJsDirective;
  version: string;
  pragmas: ReadonlyPragmaMap;
  localJsxNamespace?: qu.__String;
  localJsxFactory?: EntityName;
  exportedModulesFromDeclarationEmit?: ExportedModulesFromDeclarationEmit;
  kind: Syntax.SourceFile = Syntax.SourceFile;
  _declarationBrand: any;
  fileName!: string;
  path!: Path;
  resolvedPath!: Path;
  originalFileName!: string;
  text!: string;
  scriptSnapshot!: IScriptSnapshot;
  lineMap!: readonly number[];
  statements!: Nodes<qt.Statement>;
  endOfFileToken!: Token<Syntax.EndOfFileToken>;
  amdDependencies!: { name: string; path: string }[];
  moduleName!: string;
  referencedFiles!: FileReference[];
  typeReferenceDirectives!: FileReference[];
  libReferenceDirectives!: FileReference[];
  syntacticDiagnostics!: qd.DiagnosticWithLocation[];
  parseDiagnostics!: qd.DiagnosticWithLocation[];
  bindDiagnostics!: qd.DiagnosticWithLocation[];
  bindSuggestionDiagnostics?: qd.DiagnosticWithLocation[];
  isDeclarationFile!: boolean;
  isDefaultLib!: boolean;
  hasNoDefaultLib!: boolean;
  externalModuleIndicator!: Nobj;
  commonJsModuleIndicator!: Nobj;
  nodeCount!: number;
  identifierCount!: number;
  symbolCount!: number;
  version!: string;
  scriptKind!: ScriptKind;
  languageVersion!: ScriptTarget;
  languageVariant!: LanguageVariant;
  identifiers!: qu.QMap<string>;
  nameTable: qu.EscapedMap<number> | undefined;
  resolvedModules: qu.QMap<ResolvedModuleFull> | undefined;
  resolvedTypeReferenceDirectiveNames!: qu.QMap<ResolvedTypeReferenceDirective>;
  imports!: readonly StringLiteralLike[];
  moduleAugmentations!: StringLiteral[];
  private namedDeclarations: qu.QMap<qt.Declaration[]> | undefined;
  ambientModuleNames!: string[];
  checkJsDirective: CheckJsDirective | undefined;
  errorExpectations: qu.TextRange[] | undefined;
  possiblyContainDynamicImport?: boolean;
  pragmas!: PragmaMap;
  localJsxFactory: EntityName | undefined;
  localJsxNamespace: qu.__String | undefined;
  constructor(kind: Syntax, pos: number, end: number) {
    super(kind, pos, end);
  }
  redirectInfo?: RedirectInfo | undefined;
  renamedDependencies?: qu.QReadonlyMap<string> | undefined;
  jsGlobalAugmentations?: SymbolTable<Symbol> | undefined;
  docDiagnostics?: qd.DiagnosticWithLocation[] | undefined;
  additionalSyntacticDiagnostics?: readonly qd.DiagnosticWithLocation[] | undefined;
  classifiableNames?: qu.ReadonlyEscapedMap<true> | undefined;
  commentDirectives?: qt.CommentDirective[] | undefined;
  patternAmbientModules?: PatternAmbientModule[] | undefined;
  exportedModulesFromDeclarationEmit?: ExportedModulesFromDeclarationEmit | undefined;
  id: number;
  flags: NodeFlags;
  modifierFlagsCache: ModifierFlags;
  trafoFlags: TrafoFlags;
  decorators?: Nodes<Decorator> | undefined;
  modifiers?: qt.Modifiers | undefined;
  original?: Nobj | undefined;
  symbol: Symbol;
  localSymbol?: Symbol | undefined;
  locals?: SymbolTable<Symbol> | undefined;
  nextContainer?: Nobj | undefined;
  flowNode?: FlowStart | FlowLabel | FlowAssignment | FlowCall | FlowCondition | FlowSwitchClause | FlowArrayMutation | FlowReduceLabel | undefined;
  emitNode?: qt.EmitNode | undefined;
  contextualType?: Type | undefined;
  inferenceContext?: qt.InferenceContext | undefined;
  doc?: qt.Doc[] | undefined;
  is<S extends Syntax, T extends { kind: S; also?: Syntax[] | undefined }>(t: T): this is qt.NodeType<T['kind']> {
    throw new Error('Method not implemented.');
  }
  getLeadingCommentRangesOfNode(n: Node) {
    return n.kind !== Syntax.JsxText ? qy.get.leadingCommentRanges(this.text, n.pos) : undefined;
  }
  isStringDoubleQuoted(s: qt.StringLiteralLike) {
    return this.qf.get.sourceTextOfNodeFromSourceFile(s).charCodeAt(0) === qy.Codes.doubleQuote;
  }
  getResolvedExternalModuleName(host: ResolveModuleNameResolutionHost, file: SourceFile, referenceFile?: SourceFile): string {
    return file.moduleName || qf.get.externalModuleNameFromPath(host, file.fileName, referenceFile && referenceFile.fileName);
  }
  getSourceFilesToEmit(host: EmitHost, targetSourceFile?: SourceFile, forceDtsEmit?: boolean): readonly SourceFile[] {
    const opts = host.getCompilerOpts();
    if (opts.outFile || opts.out) {
      const moduleKind = getEmitModuleKind(opts);
      const moduleEmitEnabled = opts.emitDeclarationOnly || moduleKind === ModuleKind.AMD || moduleKind === ModuleKind.System;
      return qu.filter(host.getSourceFiles(), (sourceFile) => (moduleEmitEnabled || !qf.is.externalModule(sourceFile)) && sourceFileMayBeEmitted(sourceFile, host, forceDtsEmit));
    } else {
      const sourceFiles = targetSourceFile === undefined ? host.getSourceFiles() : [targetSourceFile];
      return qu.filter(sourceFiles, (sourceFile) => sourceFileMayBeEmitted(sourceFile, host, forceDtsEmit));
    }
  }
  sourceFileMayBeEmitted(sourceFile: SourceFile, host: SourceFileMayBeEmittedHost, forceDtsEmit?: boolean) {
    const opts = host.getCompilerOpts();
    return (
      !(opts.noEmitForJsFiles && isSourceFileJS(sourceFile)) &&
      !sourceFile.isDeclarationFile &&
      !host.isSourceFileFromExternalLibrary(sourceFile) &&
      !(qf.is.jsonSourceFile(sourceFile) && host.getResolvedProjectReferenceToRedirect(sourceFile.fileName)) &&
      (forceDtsEmit || !host.isSourceOfProjectReferenceRedirect(sourceFile.fileName))
    );
  }
  getLineOfLocalPosition(sourceFile: SourceFile, pos: number) {
    const s = qy.get.lineStarts(sourceFile);
    return Scanner.lineOf(s, pos);
  }
  update(t: string, c: qu.TextChange): SourceFile {
    return qp_updateSource(this, t, c);
  }
  getLineAndCharacterOfPosition(pos: number): qy.LineAndChar {
    return getLineAndCharacterOfPosition(this, pos);
  }
  getLineStarts(): readonly number[] {
    return getLineStarts(this);
  }
  getPositionOfLineAndCharacter(line: number, character: number, allowEdits?: true): number {
    return computePositionOfLineAndCharacter(getLineStarts(this), line, character, this.text, allowEdits);
  }
  getLineEndOfPosition(pos: number): number {
    const { line } = this.getLineAndCharacterOfPosition(pos);
    const lineStarts = this.getLineStarts();
    let lastCharPos: number | undefined;
    if (line + 1 >= lineStarts.length) {
      lastCharPos = this.end;
    }
    if (!lastCharPos) {
      lastCharPos = lineStarts[line + 1] - 1;
    }
    const fullText = this.fullText();
    return fullText[lastCharPos] === '\n' && fullText[lastCharPos - 1] === '\r' ? lastCharPos - 1 : lastCharPos;
  }
  getNamedDecls(): qu.QMap<qt.Declaration[]> {
    if (!this.namedDeclarations) {
      this.namedDeclarations = this.computeNamedDecls();
    }
    return this.namedDeclarations;
  }
  getResolvedModule(sourceFile: SourceFile | undefined, moduleNameText: string): ResolvedModuleFull | undefined {
    return sourceFile && sourceFile.resolvedModules && sourceFile.resolvedModules.get(moduleNameText);
  }
  setResolvedModule(sourceFile: SourceFile, moduleNameText: string, resolvedModule: ResolvedModuleFull): void {
    if (!sourceFile.resolvedModules) {
      sourceFile.resolvedModules = new qu.QMap<ResolvedModuleFull>();
    }
    sourceFile.resolvedModules.set(moduleNameText, resolvedModule);
  }
  setResolvedTypeReferenceDirective(sourceFile: SourceFile, typeReferenceDirectiveName: string, resolvedTypeReferenceDirective?: ResolvedTypeReferenceDirective): void {
    if (!sourceFile.resolvedTypeReferenceDirectiveNames) {
      sourceFile.resolvedTypeReferenceDirectiveNames = new qu.QMap<ResolvedTypeReferenceDirective | undefined>();
    }
    sourceFile.resolvedTypeReferenceDirectiveNames.set(typeReferenceDirectiveName, resolvedTypeReferenceDirective);
  }
  isFileLevelUniqueName(sourceFile: SourceFile, name: string, hasGlobalName?: PrintHandlers['hasGlobalName']): boolean {
    return !(hasGlobalName && hasGlobalName(name)) && !sourceFile.identifiers.has(name);
  }
  isEffectiveExternalModule(node: SourceFile, compilerOpts: qt.CompilerOpts) {
    return qf.is.externalModule(node) || compilerOpts.isolatedModules || (getEmitModuleKind(compilerOpts) === ModuleKind.CommonJS && !!node.commonJsModuleIndicator);
  }
  isEffectiveStrictModeSourceFile(node: SourceFile, compilerOpts: qt.CompilerOpts) {
    switch (node.scriptKind) {
      case ScriptKind.JS:
      case ScriptKind.TS:
      case ScriptKind.JSX:
      case ScriptKind.TSX:
        break;
      default:
        return false;
    }
    if (node.isDeclarationFile) return false;
    if (getStrictOptionValue(compilerOpts, 'alwaysStrict')) return true;
    if (startsWithUseStrict(node.statements)) return true;
    if (qf.is.externalModule(node) || compilerOpts.isolatedModules) {
      if (getEmitModuleKind(compilerOpts) >= ModuleKind.ES2015) return true;
      return !compilerOpts.noImplicitUseStrict;
    }
    return false;
  }
  getSpanOfTokenAtPosition(s: SourceFile, pos: number): qu.TextSpan {
    const scanner = qs_create(true, s.languageVariant);
    scanner.setText(s.text, pos);
    scanner.scan();
    const start = scanner.getTokenPos();
    return qu.TextSpan.from(start, scanner.getTextPos());
  }
  isSourceFileJS(file: SourceFile) {
    return qf.is.inJSFile(file);
  }
  isSourceFileNotJS(file: SourceFile) {
    return !qf.is.inJSFile(file);
  }
  isSourceFileNotJson(file: SourceFile) {
    return !qf.is.jsonSourceFile(file);
  }
  getOriginalSourceFile(sourceFile: SourceFile) {
    return qf.get.parseTreeOf(sourceFile, isSourceFile) || sourceFile;
  }
  isCheckJsEnabledForFile(sourceFile: SourceFile, compilerOpts: qt.CompilerOpts) {
    return sourceFile.checkJsDirective ? sourceFile.checkJsDirective.enabled : compilerOpts.checkJs;
  }
  skipTypeChecking(sourceFile: SourceFile, opts: qt.CompilerOpts, host: HostWithIsSourceOfProjectReferenceRedirect) {
    return (opts.skipLibCheck && sourceFile.isDeclarationFile) || (opts.skipDefaultLibCheck && sourceFile.hasNoDefaultLib) || host.isSourceOfProjectReferenceRedirect(sourceFile.fileName);
  }
  qp_updateSourceNode(
    node: SourceFile,
    statements: readonly qt.Statement[],
    isDeclarationFile?: boolean,
    referencedFiles?: SourceFile['referencedFiles'],
    typeReferences?: SourceFile['typeReferenceDirectives'],
    hasNoDefaultLib?: boolean,
    libReferences?: SourceFile['libReferenceDirectives']
  ) {
    if (
      node.statements !== statements ||
      (isDeclarationFile !== undefined && node.isDeclarationFile !== isDeclarationFile) ||
      (referencedFiles !== undefined && node.referencedFiles !== referencedFiles) ||
      (typeReferences !== undefined && node.typeReferenceDirectives !== typeReferences) ||
      (libReferences !== undefined && node.libReferenceDirectives !== libReferences) ||
      (hasNoDefaultLib !== undefined && node.hasNoDefaultLib !== hasNoDefaultLib)
    ) {
      const updated = <SourceFile>Node.createSynthesized(Syntax.SourceFile);
      updated.flags |= node.flags;
      updated.statements = new Nodes(statements);
      updated.endOfFileToken = node.endOfFileToken;
      updated.fileName = node.fileName;
      updated.path = node.path;
      updated.text = node.text;
      updated.isDeclarationFile = isDeclarationFile === undefined ? node.isDeclarationFile : isDeclarationFile;
      updated.referencedFiles = referencedFiles === undefined ? node.referencedFiles : referencedFiles;
      updated.typeReferenceDirectives = typeReferences === undefined ? node.typeReferenceDirectives : typeReferences;
      updated.hasNoDefaultLib = hasNoDefaultLib === undefined ? node.hasNoDefaultLib : hasNoDefaultLib;
      updated.libReferenceDirectives = libReferences === undefined ? node.libReferenceDirectives : libReferences;
      if (node.amdDependencies !== undefined) updated.amdDependencies = node.amdDependencies;
      if (node.moduleName !== undefined) updated.moduleName = node.moduleName;
      if (node.languageVariant !== undefined) updated.languageVariant = node.languageVariant;
      if (node.renamedDependencies !== undefined) updated.renamedDependencies = node.renamedDependencies;
      if (node.languageVersion !== undefined) updated.languageVersion = node.languageVersion;
      if (node.scriptKind !== undefined) updated.scriptKind = node.scriptKind;
      if (node.externalModuleIndicator !== undefined) updated.externalModuleIndicator = node.externalModuleIndicator;
      if (node.commonJsModuleIndicator !== undefined) updated.commonJsModuleIndicator = node.commonJsModuleIndicator;
      if (node.identifiers !== undefined) updated.identifiers = node.identifiers;
      if (node.nodeCount !== undefined) updated.nodeCount = node.nodeCount;
      if (node.identifierCount !== undefined) updated.identifierCount = node.identifierCount;
      if (node.symbolCount !== undefined) updated.symbolCount = node.symbolCount;
      if (node.parseDiagnostics !== undefined) updated.parseDiagnostics = node.parseDiagnostics;
      if (node.bindDiagnostics !== undefined) updated.bindDiagnostics = node.bindDiagnostics;
      if (node.bindSuggestionDiagnostics !== undefined) updated.bindSuggestionDiagnostics = node.bindSuggestionDiagnostics;
      if (node.lineMap !== undefined) updated.lineMap = node.lineMap;
      if (node.classifiableNames !== undefined) updated.classifiableNames = node.classifiableNames;
      if (node.resolvedModules !== undefined) updated.resolvedModules = node.resolvedModules;
      if (node.resolvedTypeReferenceDirectiveNames !== undefined) updated.resolvedTypeReferenceDirectiveNames = node.resolvedTypeReferenceDirectiveNames;
      if (node.imports !== undefined) updated.imports = node.imports;
      if (node.moduleAugmentations !== undefined) updated.moduleAugmentations = node.moduleAugmentations;
      if (node.pragmas !== undefined) updated.pragmas = node.pragmas;
      if (node.localJsxFactory !== undefined) updated.localJsxFactory = node.localJsxFactory;
      if (node.localJsxNamespace !== undefined) updated.localJsxNamespace = node.localJsxNamespace;
      return updated.updateFrom(node);
    }
    return node;
  }
  private computeNamedDecls(): qu.QMap<qt.Declaration[]> {
    const r = new qu.MultiMap<qt.Declaration>();
    qf.each.child(visit);
    return r;
    function addDeclaration(declaration: qt.Declaration) {
      const name = qf.get.declaration.name(declaration);
      if (name) r.add(name, declaration);
    }
    function getDeclarations(name: string) {
      let declarations = r.get(name);
      if (!declarations) r.set(name, (declarations = []));
      return declarations;
    }
    function getDeclarationName(declaration: qt.Declaration) {
      const name = qf.get.nonAssignedNameOfDeclaration(declaration);
      return (
        name &&
        (isComputedPropertyName(name) && qf.is.kind(qc.PropertyAccessExpression, name.expression) ? name.expression.name.text : qf.is.propertyName(name) ? getNameFromPropertyName(name) : undefined)
      );
    }
    function visit(n: Node) {
      switch (n.kind) {
        case Syntax.FunctionDeclaration:
        case Syntax.FunctionExpression:
        case Syntax.MethodDeclaration:
        case Syntax.MethodSignature:
          const functionDeclaration = n;
          const declarationName = qf.get.declaration.name(functionDeclaration);
          if (declarationName) {
            const declarations = getDeclarations(declarationName);
            const lastDeclaration = qu.lastOrUndefined(declarations);
            if (lastDeclaration && functionDeclaration.parent === lastDeclaration.parent && functionDeclaration.symbol === lastDeclaration.symbol) {
              if (functionDeclaration.body && !(<FunctionLikeDeclaration>lastDeclaration).body) declarations[declarations.length - 1] = functionDeclaration;
            } else declarations.push(functionDeclaration);
          }
          qf.each.child(n, visit);
          break;
        case Syntax.ClassDeclaration:
        case Syntax.ClassExpression:
        case Syntax.InterfaceDeclaration:
        case Syntax.TypeAliasDeclaration:
        case Syntax.EnumDeclaration:
        case Syntax.ModuleDeclaration:
        case Syntax.ImportEqualsDeclaration:
        case Syntax.ExportSpecifier:
        case Syntax.ImportSpecifier:
        case Syntax.ImportClause:
        case Syntax.NamespaceImport:
        case Syntax.GetAccessor:
        case Syntax.SetAccessor:
        case Syntax.TypingLiteral:
          addDeclaration(n);
          qf.each.child(n, visit);
          break;
        case Syntax.Param:
          if (!qf.has.syntacticModifier(n, ModifierFlags.ParamPropertyModifier)) break;
        case Syntax.VariableDeclaration:
        case Syntax.BindingElem: {
          const decl = n;
          if (qf.is.kind(qc.BindingPattern, decl.name)) {
            qf.each.child(decl.name, visit);
            break;
          }
          if (decl.initer) visit(decl.initer);
        }
        case Syntax.EnumMember:
        case Syntax.PropertyDeclaration:
        case Syntax.PropertySignature:
          addDeclaration(<qt.Declaration>n);
          break;
        case Syntax.ExportDeclaration:
          const exportDeclaration = n;
          if (exportDeclaration.exportClause) {
            if (qf.is.kind(qc.NamedExports, exportDeclaration.exportClause)) qu.each(exportDeclaration.exportClause.elems, visit);
            else visit(exportDeclaration.exportClause.name);
          }
          break;
        case Syntax.ImportDeclaration:
          const importClause = n.importClause;
          if (importClause) {
            if (importClause.name) addDeclaration(importClause.name);
            if (importClause.namedBindings) {
              if (importClause.namedBindings.kind === Syntax.NamespaceImport) addDeclaration(importClause.namedBindings);
              else qu.each(importClause.namedBindings.elems, visit);
            }
          }
          break;
        case Syntax.BinaryExpression:
          if (qf.get.assignmentDeclarationKind(n as BinaryExpression) !== qt.AssignmentDeclarationKind.None) addDeclaration(n as BinaryExpression);
        default:
          qf.each.child(n, visit);
      }
    }
  }
  static discoverProbableSymlinks(files: readonly SourceFile[], getCanonicalFileName: GetCanonicalFileName, cwd: string): QReadonlyMap<string> {
    const result = new qu.QMap<string>();
    const symlinks = qu.flatten<readonly [string, string]>(
      mapDefined(
        files,
        (sf) =>
          sf.resolvedModules &&
          compact(
            arrayFrom(
              mapIterator(sf.resolvedModules.values(), (res) =>
                res && res.originalPath && res.resolvedFileName !== res.originalPath ? ([res.resolvedFileName, res.originalPath] as const) : undefined
              )
            )
          )
      )
    );
    for (const [resolvedPath, originalPath] of symlinks) {
      const [commonResolved, commonOriginal] = guessDirectorySymlink(resolvedPath, originalPath, cwd, getCanonicalFileName);
      result.set(commonOriginal, commonResolved);
    }
    return result;
  }
}
export class SourceMapSource implements qt.SourceMapSource {
  lineMap!: number[];
  constructor(public fileName: string, public text: string, public skipTrivia = (pos: number) => pos) {}
  getLineAndCharacterOfPosition(pos: number): qy.LineAndChar {
    return getLineAndCharacterOfPosition(this, pos);
  }
}
let allUnscopedEmitHelpers: qu.QReadonlyMap<UnscopedEmitHelper> | undefined;
export class UnparsedSource extends Nobj implements qt.UnparsedSource {
  static readonly kind = Syntax.UnparsedSource;
  fileName: string;
  text: string;
  prologues: readonly UnparsedPrologue[];
  helpers: readonly UnscopedEmitHelper[] | undefined;
  referencedFiles: readonly qt.FileReference[];
  typeReferenceDirectives: readonly string[] | undefined;
  libReferenceDirectives: readonly qt.FileReference[];
  hasNoDefaultLib?: boolean;
  sourceMapPath?: string;
  sourceMapText?: string;
  syntheticReferences?: readonly UnparsedSyntheticReference[];
  texts: readonly UnparsedSourceText[];
  oldFileOfCurrentEmit?: boolean;
  parsedSourceMap?: RawSourceMap | false | undefined;
  lineAndCharOf(pos: number): LineAndChar;
  createUnparsedSource() {
    super();
    this.prologues = empty;
    this.referencedFiles = empty;
    this.libReferenceDirectives = empty;
    this.lineAndCharOf = (pos) => qy.get.lineAndCharOf(this, pos);
  }
  createUnparsedSourceFile(text: string): UnparsedSource;
  createUnparsedSourceFile(inputFile: InputFiles, type: 'js' | 'dts', stripInternal?: boolean): UnparsedSource;
  createUnparsedSourceFile(text: string, mapPath: string | undefined, map: string | undefined): UnparsedSource;
  createUnparsedSourceFile(textOrInputFiles: string | InputFiles, mapPathOrType?: string, mapTextOrStripInternal?: string | boolean): UnparsedSource {
    const r = createUnparsedSource();
    let stripInternal: boolean | undefined;
    let bundleFileInfo: BundleFileInfo | undefined;
    if (!isString(textOrInputFiles)) {
      qu.assert(mapPathOrType === 'js' || mapPathOrType === 'dts');
      r.fileName = (mapPathOrType === 'js' ? textOrInputFiles.javascriptPath : textOrInputFiles.declarationPath) || '';
      r.sourceMapPath = mapPathOrType === 'js' ? textOrInputFiles.javascriptMapPath : textOrInputFiles.declarationMapPath;
      Object.defineProperties(r, {
        text: {
          get() {
            return mapPathOrType === 'js' ? textOrInputFiles.javascriptText : textOrInputFiles.declarationText;
          },
        },
        sourceMapText: {
          get() {
            return mapPathOrType === 'js' ? textOrInputFiles.javascriptMapText : textOrInputFiles.declarationMapText;
          },
        },
      });
      if (textOrInputFiles.buildInfo && textOrInputFiles.buildInfo.bundle) {
        r.oldFileOfCurrentEmit = textOrInputFiles.oldFileOfCurrentEmit;
        qu.assert(mapTextOrStripInternal === undefined || typeof mapTextOrStripInternal === 'boolean');
        stripInternal = mapTextOrStripInternal;
        bundleFileInfo = mapPathOrType === 'js' ? textOrInputFiles.buildInfo.bundle.js : textOrInputFiles.buildInfo.bundle.dts;
        if (r.oldFileOfCurrentEmit) {
          parseOldFileOfCurrentEmit(r, qu.checkDefined(bundleFileInfo));
          return r;
        }
      }
    } else {
      r.fileName = '';
      r.text = textOrInputFiles;
      r.sourceMapPath = mapPathOrType;
      r.sourceMapText = mapTextOrStripInternal as string;
    }
    qu.assert(!r.oldFileOfCurrentEmit);
    parseUnparsedSourceFile(r, bundleFileInfo, stripInternal);
    return r;
  }
  getAllUnscopedEmitHelpers() {
    return (
      allUnscopedEmitHelpers ||
      (allUnscopedEmitHelpers = arrayToMap(
        [
          valuesHelper,
          readHelper,
          spreadHelper,
          spreadArraysHelper,
          restHelper,
          decorateHelper,
          metadataHelper,
          paramHelper,
          awaiterHelper,
          assignHelper,
          awaitHelper,
          asyncGeneratorHelper,
          asyncDelegator,
          asyncValues,
          extendsHelper,
          templateObjectHelper,
          generatorHelper,
          importStarHelper,
          importDefaultHelper,
          classPrivateFieldGetHelper,
          classPrivateFieldSetHelper,
          createBindingHelper,
          setModuleDefaultHelper,
        ],
        (helper) => helper.name
      ))
    );
  }
  parseUnparsedSourceFile(this: UnparsedSource, bundleFileInfo: BundleFileInfo | undefined, stripInternal: boolean | undefined) {
    let prologues: UnparsedPrologue[] | undefined;
    let helpers: UnscopedEmitHelper[] | undefined;
    let referencedFiles: qc.FileReference[] | undefined;
    let typeReferenceDirectives: string[] | undefined;
    let libReferenceDirectives: qc.FileReference[] | undefined;
    let texts: UnparsedSourceText[] | undefined;
    for (const section of bundleFileInfo ? bundleFileInfo.sections : empty) {
      switch (section.kind) {
        case BundleFileSectionKind.Prologue:
          (prologues || (prologues = [])).push(createUnparsedNode(section, this) as UnparsedPrologue);
          break;
        case BundleFileSectionKind.EmitHelpers:
          (helpers || (helpers = [])).push(getAllUnscopedEmitHelpers().get(section.data)!);
          break;
        case BundleFileSectionKind.NoDefaultLib:
          this.hasNoDefaultLib = true;
          break;
        case BundleFileSectionKind.Reference:
          (referencedFiles || (referencedFiles = [])).push({ pos: -1, end: -1, fileName: section.data });
          break;
        case BundleFileSectionKind.Type:
          (typeReferenceDirectives || (typeReferenceDirectives = [])).push(section.data);
          break;
        case BundleFileSectionKind.Lib:
          (libReferenceDirectives || (libReferenceDirectives = [])).push({ pos: -1, end: -1, fileName: section.data });
          break;
        case BundleFileSectionKind.Prepend:
          const prependNode = createUnparsedNode(section, this) as UnparsedPrepend;
          let prependTexts: UnparsedTextLike[] | undefined;
          for (const text of section.texts) {
            if (!stripInternal || text.kind !== BundleFileSectionKind.Internal) {
              (prependTexts || (prependTexts = [])).push(createUnparsedNode(text, this) as UnparsedTextLike);
            }
          }
          prependNode.texts = prependTexts || empty;
          (texts || (texts = [])).push(prependNode);
          break;
        case BundleFileSectionKind.Internal:
          if (stripInternal) {
            if (!texts) texts = [];
            break;
          }
        case BundleFileSectionKind.Text:
          (texts || (texts = [])).push(createUnparsedNode(section, this) as UnparsedTextLike);
          break;
        default:
          qc.assert.never(section);
      }
    }
    this.prologues = prologues || empty;
    this.helpers = helpers;
    this.referencedFiles = referencedFiles || empty;
    this.typeReferenceDirectives = typeReferenceDirectives;
    this.libReferenceDirectives = libReferenceDirectives || empty;
    this.texts = texts || [<UnparsedTextLike>createUnparsedNode({ kind: BundleFileSectionKind.Text, pos: 0, end: this.text.length }, this)];
  }
  parseOldFileOfCurrentEmit(this: UnparsedSource, bundleFileInfo: BundleFileInfo) {
    qu.assert(!!this.oldFileOfCurrentEmit);
    let texts: UnparsedTextLike[] | undefined;
    let syntheticReferences: UnparsedSyntheticReference[] | undefined;
    for (const section of bundleFileInfo.sections) {
      switch (section.kind) {
        case BundleFileSectionKind.Internal:
        case BundleFileSectionKind.Text:
          (texts || (texts = [])).push(createUnparsedNode(section, this) as UnparsedTextLike);
          break;
        case BundleFileSectionKind.NoDefaultLib:
        case BundleFileSectionKind.Reference:
        case BundleFileSectionKind.Type:
        case BundleFileSectionKind.Lib:
          (syntheticReferences || (syntheticReferences = [])).push(new qc.UnparsedSyntheticReference(section, this));
          break;
        // Ignore
        case BundleFileSectionKind.Prologue:
        case BundleFileSectionKind.EmitHelpers:
        case BundleFileSectionKind.Prepend:
          break;
        default:
          qc.assert.never(section);
      }
    }
    this.texts = texts || empty;
    this.helpers = map(bundleFileInfo.sources && bundleFileInfo.sources.helpers, (name) => getAllUnscopedEmitHelpers().get(name)!);
    this.syntheticReferences = syntheticReferences;
    return this;
  }
}
UnparsedSource.prototype.kind = UnparsedSource.kind;
export function failBadSyntax(n: Node, msg?: string, mark?: qu.AnyFunction): never {
  return qu.fail(`${msg || 'Unexpected node.'}\r\nNode ${format.syntax(n.kind)} was unexpected.`, mark || failBadSyntaxKind);
}
