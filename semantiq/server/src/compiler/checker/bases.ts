import { CheckFlags, InternalSymbol, ModifierFlags, Node, NodeFlags, ObjectFlags, SymbolFlags, Ternary } from '../types';
import { qf } from './frame';
import { Syntax } from '../syntax';
import * as qc from '../core';
import * as qd from '../diags';
import * as qt from './types';
import * as qu from '../utils';
import * as qy from '../syntax';
export class Type extends qc.Type {}
export interface Ftype extends qc.Ftype {}
export class Ftype {
  unwrapReturnType(t: qt.Type, f: qt.FunctionFlags) {
    const isGenerator = !!(f & qt.FunctionFlags.Generator);
    const isAsync = !!(f & qt.FunctionFlags.Async);
    return isGenerator ? qf.type.get.iterOfGeneratorFunctionReturn(qt.IterationTypeKind.Return, t, isAsync) ?? errorType : isAsync ? getAwaitedType(t) ?? errorType : t;
  }
}
export abstract class Symbol extends qc.Symbol implements qt.TransientSymbol {
  _checkFlags: CheckFlags;
  constructor(f: SymbolFlags, name: qu.__String, c?: CheckFlags) {
    super(f | SymbolFlags.Transient, name);
    this._checkFlags = c || 0;
  }
  get checkFlags(): CheckFlags {
    return this.isTransient() ? this._checkFlags : 0;
  }
  typeOfSymbolWithDeferredType() {
    const ls = this.links;
    if (!ls.type) {
      qf.assert.defined(ls.deferralParent);
      qf.assert.defined(ls.deferralConstituents);
      ls.type = ls.deferralParent.isa(qt.TypeFlags.Union) ? qf.type.get.union(ls.deferralConstituents!) : qf.get.intersectionType(ls.deferralConstituents);
    }
    return ls.type!;
  }
  typeOfSymbol(): qt.Type {
    const f = this.checkFlags;
    if (f & CheckFlags.DeferredType) return this.typeOfSymbolWithDeferredType();
    if (f & CheckFlags.Instantiated) return this.getTypeOfInstantiatedSymbol();
    if (f & CheckFlags.Mapped) return qf.get.typeOfMappedSymbol(this as qt.MappedSymbol);
    if (f & CheckFlags.ReverseMapped) return qf.get.typeOfReverseMappedSymbol(this as qt.ReverseMappedSymbol);
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
  addDuplicates(ds: qt.Declaration[]) {
    if (this.declarations) {
      for (const d of this.declarations) {
        qu.pushIfUnique(ds, d);
      }
    }
  }
  isNonLocalAlias(exclude = SymbolFlags.Value | SymbolFlags.Type | SymbolFlags.Namespace): this is Symbol {
    const f = this.flags;
    return (f & (SymbolFlags.Alias | exclude)) === SymbolFlags.Alias || !!(f & SymbolFlags.Alias && f & SymbolFlags.Assignment);
  }
  tryResolveAlias() {
    const ls = this.links;
    if (ls.target !== resolvingSymbol) return this.resolveAlias();
    return;
  }
  getDeclarationOfAliasSymbol() {
    const ds = this.declarations;
    return ds && qf.find.up(ds, qf.is.aliasSymbolDeclaration);
  }
  getTypeOnlyAliasDeclaration(): qt.TypeOnlyCompatibleAliasDeclaration | undefined {
    if (!(this.flags & SymbolFlags.Alias)) return;
    return this.links.typeOnlyDeclaration || undefined;
  }
  forEachProperty<T>(cb: (p: Symbol) => T): T | undefined {
    if (this.checkFlags & qt.CheckFlags.Synthetic) {
      for (const t of this.containingType!.types) {
        const p = qf.type.get.property(t, this.escName);
        const r = p && p.forEachProperty(cb);
        if (r) return r;
      }
      return;
    }
    return cb(this);
  }
  compareProperties(this: Symbol, targetProp: Symbol, compareTypes: (source: qt.Type, target: qt.Type) => Ternary): Ternary {
    if (this === targetProp) return Ternary.True;
    const sourcePropAccessibility = this.declarationModifierFlags() & ModifierFlags.NonPublicAccessibilityModifier;
    const targetPropAccessibility = targetProp.declarationModifierFlags() & ModifierFlags.NonPublicAccessibilityModifier;
    if (sourcePropAccessibility !== targetPropAccessibility) return Ternary.False;
    if (sourcePropAccessibility) {
      if (getTargetSymbol(this) !== getTargetSymbol(targetProp)) return Ternary.False;
    } else {
      if ((this.flags & qt.SymbolFlags.Optional) !== (targetProp.flags & qt.SymbolFlags.Optional)) return Ternary.False;
    }
    if (isReadonlySymbol(this) !== isReadonlySymbol(targetProp)) return Ternary.False;
    return compareTypes(this.typeOfSymbol(), targetProp.typeOfSymbol());
  }
  merge(t: Symbol, unidir = false): this {
    if (!(t.flags & qf.get.excluded(this.flags)) || (this.flags | t.flags) & SymbolFlags.Assignment) {
      if (this === t) return this;
      if (!(t.flags & SymbolFlags.Transient)) {
        const r = t.resolveSymbol();
        if (r === unknownSymbol) return this;
        t = r?.clone();
      }
      if (this.flags & SymbolFlags.ValueModule && t.flags & SymbolFlags.ValueModule && t.constEnumOnlyModule && !this.constEnumOnlyModule) t.constEnumOnlyModule = false;
      t.flags |= this.flags;
      if (this.valueDeclaration) t.setValueDeclaration(this.valueDeclaration);
      qu.addRange(t.declarations, this.declarations);
      if (this.members) {
        if (!t.members) t.members = new SymbolTable();
        t.members.merge(this.members, unidir);
      }
      if (this.exports) {
        if (!t.exports) t.exports = new SymbolTable();
        t.exports.merge(this.exports, unidir);
      }
      if (!unidir) this.recordMerged(t);
    } else if (t.flags & SymbolFlags.NamespaceModule) {
      if (t !== globalThisSymbol) error(qf.decl.nameOf(this.declarations[0]), qd.msgs.Cannot_augment_module_0_with_value_exports_because_it_resolves_to_a_non_module_entity, t.symbolToString());
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
        const firstFile = comparePaths(sourceSymbolFile.path, targetSymbolFile.path) === qu.Comparison.LessThan ? sourceSymbolFile : targetSymbolFile;
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
          qf.each.up(s.declarations, (d) => {
            addDuplicateDeclarationError(d, m, n, this.declarations);
          });
        };
        t.addDuplicateErrors(this, message, symbolName);
        this.addDuplicateErrors(t, message, symbolName);
      }
    }
    return t;
  }
  symbolToString(decl?: Node, meaning?: SymbolFlags, flags: qt.SymbolFormatFlags = qt.SymbolFormatFlags.AllowAnyNodeKind, w?: qt.EmitTextWriter): string {
    let f = qt.NodeBuilderFlags.IgnoreErrors;
    if (flags & qt.SymbolFormatFlags.UseOnlyExternalAliasing) f |= qt.NodeBuilderFlags.UseOnlyExternalAliasing;
    if (flags & qt.SymbolFormatFlags.WriteTypeParamsOrArgs) f |= qt.NodeBuilderFlags.WriteTypeParamsInQualifiedName;
    if (flags & qt.SymbolFormatFlags.UseAliasDefinedOutsideCurrentScope) f |= qt.NodeBuilderFlags.UseAliasDefinedOutsideCurrentScope;
    if (flags & qt.SymbolFormatFlags.DoNotIncludeSymbolChain) f |= qt.NodeBuilderFlags.DoNotIncludeSymbolChain;
    const builder = flags & qt.SymbolFormatFlags.AllowAnyNodeKind ? nodeBuilder.symbolToExpression : nodeBuilder.symbolToEntityName;
    const worker = (w: qt.EmitTextWriter) => {
      const b = builder(this, meaning!, decl, f)!;
      const p = createPrinter({ removeComments: true });
      const s = decl && decl.sourceFile;
      p.writeNode(qt.EmitHint.Unspecified, b, s, w);
      return w;
    };
    return w ? worker(w).getText() : usingSingleLineStringWriter(worker);
  }
  resolveSymbol(noAlias?: boolean) {
    return !noAlias && this.isNonLocalAlias() ? this.resolveAlias() : this;
  }
  resolveAlias() {
    qf.assert.true((this.flags & SymbolFlags.Alias) !== 0);
    const ls = this.links;
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
  markConstEnumAliasAsReferenced() {
    const ls = this.links;
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
    const ls = this.links;
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
                qf.make.diagForNode(
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
  getAlternativeContainingModules(n: Node): Symbol[] {
    const containingFile = n.sourceFile;
    const id = '' + containingFile.qf.get.nodeId();
    const ls = this.links;
    let results: Symbol[] | undefined;
    if (ls.extendedContainersByFile && (results = ls.extendedContainersByFile.get(id))) return results;
    if (containingFile && containingFile.imports) {
      for (const importRef of containingFile.imports) {
        if (qf.is.synthesized(importRef)) continue;
        const m = resolveExternalModuleName(n, importRef, true);
        if (!m) continue;
        const ref = this.getAliasForSymbolInContainer(m);
        if (!ref) continue;
        results = qu.append(results, m);
      }
      if (qu.length(results)) {
        (ls.extendedContainersByFile || (ls.extendedContainersByFile = new qu.QMap())).set(id, results!);
        return results!;
      }
    }
    if (ls.extendedContainers) return ls.extendedContainers;
    const fs = host.getSourceFiles();
    for (const f of fs) {
      if (!qf.is.externalModule(f)) continue;
      const s = qf.get.symbolOfNode(f);
      const ref = this.getAliasForSymbolInContainer(s);
      if (!ref) continue;
      results = qu.append(results, s);
    }
    return (ls.extendedContainers = results || qu.empty);
  }
  getContainersOfSymbol(n: Node | undefined): Symbol[] | undefined {
    const container = this.qf.symb.get.parent();
    if (container && !(this.flags & SymbolFlags.TypeParam)) {
      const additionalContainers = mapDefined(container.declarations, fileSymbolIfFileSymbolExportEqualsContainer);
      const reexportContainers = n && this.getAlternativeContainingModules(n);
      if (n && qf.get.accessibleSymbolChain(container, n, SymbolFlags.Namespace, false)) return concatenate(concatenate([container], additionalContainers), reexportContainers);
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
    function fileSymbolIfFileSymbolExportEqualsContainer(d: qt.Declaration) {
      return container && getFileSymbolIfFileSymbolExportEqualsContainer(d, container);
    }
  }
  getExportSymbolOfValueSymbolIfExported(): Symbol;
  getExportSymbolOfValueSymbolIfExported(): Symbol | undefined;
  getExportSymbolOfValueSymbolIfExported(): Symbol | undefined {
    return ((this.flags & SymbolFlags.ExportValue) !== 0 ? this.exportSymbol : this)?.qf.get.mergedSymbol();
  }
  isValue() {
    return !!(this.flags & SymbolFlags.Value || (this.flags & SymbolFlags.Alias && this.resolveAlias().flags & SymbolFlags.Value && !this.getTypeOnlyAliasDeclaration()));
  }
  needsQualification(n: Node | undefined, f: SymbolFlags) {
    let qualify = false;
    forEachSymbolTableInScope(n, (t) => {
      let s = t.get(this.escName)?.qf.get.mergedSymbol();
      if (!s) return false;
      if (s === this) return true;
      s = s.flags & SymbolFlags.Alias && !s.declarationOfKind(Syntax.ExportSpecifier) ? s.resolveAlias() : s;
      if (s.flags & f) {
        qualify = true;
        return true;
      }
      return false;
    });
    return qualify;
  }
  isAccessible(n: Node | undefined, f: qt.SymbolFlags, compute: boolean): qt.SymbolAccessibilityResult {
    if (n) {
      const r = qf.is.anySymbolAccessible([this], n, this, f, compute);
      if (r) return r;
      const m = qf.each.up(this.declarations, qf.get.externalModuleContainer);
      if (m) {
        const c = qf.get.externalModuleContainer(n);
        if (m !== c) {
          return {
            accessibility: qt.SymbolAccessibility.CannotBeNamed,
            errorSymbolName: this.symbolToString(n, f),
            errorModuleName: m.symbolToString(),
          };
        }
      }
      return {
        accessibility: qt.SymbolAccessibility.NotAccessible,
        errorSymbolName: this.symbolToString(n, f),
      };
    }
    return { accessibility: qt.SymbolAccessibility.Accessible };
  }
  isTypeAccessible(n?: Node) {
    const a = this.isAccessible(n, SymbolFlags.Type, false);
    return a.accessibility === qt.SymbolAccessibility.Accessible;
  }
  isValueAccessible(n?: Node) {
    const a = this.isAccessible(n, SymbolFlags.Value, false);
    return a.accessibility === qt.SymbolAccessibility.Accessible;
  }
  symbolValueDeclarationIsContextSensitive() {
    const v = this.valueDeclaration;
    return v && qf.is.expression(v) && !qf.is.contextSensitive(v);
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
      !!(this.flags & SymbolFlags.ExportDoesNotSupportDefaultModifier || (this.flags & SymbolFlags.Function && qu.length(qf.type.get.properties(this.typeOfSymbol())))) &&
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
      if (this.flags & SymbolFlags.Property && this.valueDeclaration.parent.kind === Syntax.BinaryExpression && this.valueDeclaration.parent.right.kind === Syntax.ClassExpression)
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
    if (needsPostExportDefault) addResult(new qc.ExportAssignment(undefined, undefined, false, new qc.Identifier(this.getInternalSymbol(symbolName))), ModifierFlags.None);
  }
  includePrivateSymbol() {
    if (qu.some(this.declarations, qf.is.paramDeclaration)) return;
    qf.assert.defined(deferredPrivates);
    getUnusedName(qy.get.unescUnderscores(this.escName), this);
    deferredPrivates.set('' + this.id, this);
  }
  serializeSymbol(isPrivate: boolean, propertyAsAlias: boolean) {
    const s = qf.get.mergedSymbol();
    if (visitedSymbols.has('' + s.id)) return;
    visitedSymbols.set('' + s.id, true);
    const skip = !isPrivate;
    if (skip || (!!qu.length(this.declarations) && qu.some(this.declarations, (d) => !!qc.findAncestor(d, (n) => n === enclosingDeclaration)))) {
      const o = context;
      context = cloneQContext(context);
      const r = serializeSymbolWorker(this, isPrivate, propertyAsAlias);
      context = o;
      return r;
    }
  }
  serializeTypeAlias(symbolName: string, modifierFlags: ModifierFlags) {
    const aliasType = this.getDeclaredTypeOfTypeAlias();
    const typeParams = this.links.typeParams;
    const typeParamDecls = map(typeParams, (p) => typeParamToDeclaration(p, context));
    const jsdocAliasDecl = qf.find.up(this.declarations, isDocTypeAlias);
    const commentText = jsdocAliasDecl ? jsdocAliasDecl.comment || jsdocAliasDecl.parent.comment : undefined;
    const oldFlags = context.flags;
    context.flags |= qt.NodeBuilderFlags.InTypeAlias;
    addResult(
      qf.emit.setSyntheticLeadingComments(
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
    const baseTypes = qf.type.get.bases(interfaceType);
    const baseType = qu.length(baseTypes) ? qf.get.intersectionType(baseTypes) : undefined;
    const members = flatMap<Symbol, qt.TypeElem>(qf.type.get.properties(interfaceType), (p) => serializePropertySymbolForInterface(p, baseType));
    const callSignatures = serializeSignatures(SignatureKind.Call, interfaceType, baseType, Syntax.CallSignature) as qt.CallSignatureDeclaration[];
    const constructSignatures = serializeSignatures(SignatureKind.Construct, interfaceType, baseType, Syntax.ConstructSignature) as qt.ConstructSignatureDeclaration[];
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
      addResult(new qc.ModuleDeclaration(undefined, undefined, new qc.Identifier(localName), nsBody, NodeFlags.Namespace), ModifierFlags.None);
    }
  }
  serializeEnum(symbolName: string, modifierFlags: ModifierFlags) {
    addResult(
      new qc.EnumDeclaration(
        undefined,
        qf.make.modifiersFromFlags(this.isConstEnumSymbol() ? ModifierFlags.Const : 0),
        this.getInternalSymbol(symbolName),
        map(
          qu.filter(qf.type.get.properties(this.typeOfSymbol()), (p) => !!(p.flags & SymbolFlags.EnumMember)),
          (p) => {
            const initializedValue = p.declarations && p.declarations[0] && p.declarations[0].kind === Syntax.EnumMember && getConstantValue(p.declarations[0] as qt.EnumMember);
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
        let textRange: Node | undefined = this.declarations && qf.find.up(this.declarations, (d) => d.kind === Syntax.VariableDeclaration);
        if (textRange && textRange.parent.kind === Syntax.VariableDeclarationList && textRange.parent.declarations.length === 1) textRange = textRange.parent.parent;
        const statement = new qc.VariableStatement(
          undefined,
          new qc.VariableDeclarationList([new qc.VariableDeclaration(name, serializeTypeForDeclaration(context, type, this, enclosingDeclaration, includePrivateSymbol, bundled))], flags)
        ).setRange(textRange);
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
            new qc.Identifier(localName),
            isLocalImport ? symbolToName(target, context, SymbolFlags.All, false) : new qc.ExternalModuleReference(qc.asLiteral(getSpecifierForModuleSymbol(this, context)))
          ),
          isLocalImport ? modifierFlags : ModifierFlags.None
        );
        break;
      case Syntax.NamespaceExportDeclaration:
        addResult(new qc.NamespaceExportDeclaration(idText((node as qt.NamespaceExportDeclaration).name)), ModifierFlags.None);
        break;
      case Syntax.ImportClause:
        addResult(
          new qc.ImportDeclaration(undefined, undefined, new qc.ImportClause(new qc.Identifier(localName), undefined), qc.asLiteral(getSpecifierForModuleSymbol(target.parent || target, context))),
          ModifierFlags.None
        );
        break;
      case Syntax.NamespaceImport:
        addResult(
          new qc.ImportDeclaration(
            undefined,
            undefined,
            new qc.ImportClause(undefined, new qc.NamespaceImport(new qc.Identifier(localName))),
            qc.asLiteral(getSpecifierForModuleSymbol(target, context))
          ),
          ModifierFlags.None
        );
        break;
      case Syntax.NamespaceExport:
        addResult(new qc.ExportDeclaration(undefined, undefined, new qc.NamespaceExport(new qc.Identifier(localName)), qc.asLiteral(getSpecifierForModuleSymbol(target, context))), ModifierFlags.None);
        break;
      case Syntax.ImportSpecifier:
        addResult(
          new qc.ImportDeclaration(
            undefined,
            undefined,
            new qc.ImportClause(
              undefined,
              new qc.NamedImports([new qc.ImportSpecifier(localName !== verbatimTargetName ? new qc.Identifier(verbatimTargetName) : undefined, new qc.Identifier(localName))])
            ),
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
        ? qf.get.exportAssignmentExpression(aliasDecl as qt.ExportAssignment | qt.BinaryExpression)
        : qf.get.propertyAssignmentAliasLikeExpression(aliasDecl as qt.ShorthandPropertyAssignment | qt.PropertyAssignment | qt.PropertyAccessExpression);
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
          addResult(new qc.ImportEqualsDeclaration(undefined, undefined, new qc.Identifier(varName), symbolToName(target, context, SymbolFlags.All, false)), ModifierFlags.None);
          serializeExportSpecifier(name, varName);
        }
      }
      context.tracker.trackSymbol = oldTrack;
    } else {
      const varName = getUnusedName(name, this);
      const typeToSerialize = qf.type.get.widened(qf.get.mergedSymbol(this).typeOfSymbol());
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
      if (isExportAssignment) results.push(new qc.ExportAssignment(undefined, undefined, isExportEquals, new qc.Identifier(varName)));
      else if (name !== varName) {
        serializeExportSpecifier(name, varName);
      }
    }
  }
  isConstructorDeclaredProperty() {
    if (this.valueDeclaration && this.valueDeclaration.kind === Syntax.BinaryExpression) {
      const ls = this.links;
      if (ls.qf.is.constructorDeclaredProperty === undefined) {
        ls.qf.is.constructorDeclaredProperty =
          !!getDeclaringConstructor(this) &&
          qu.every(
            this.declarations,
            (d) =>
              d.kind === Syntax.BinaryExpression &&
              qf.get.assignmentDeclarationKind(d) === qt.AssignmentDeclarationKind.ThisProperty &&
              (d.left.kind !== Syntax.ElemAccessExpression || qf.is.stringOrNumericLiteralLike((<qt.ElemAccessExpression>d.left).argExpression)) &&
              !qf.type.get.annotatedForAssignmentDeclaration(undefined, d, this, d)
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
        if (c && (c.kind === Syntax.Constructor || qf.is.jsConstructor(c))) return c as qt.ConstructorDeclaration;
      }
    }
    return;
  }
  getTypeOfVariableOrParamOrProperty(): qt.Type {
    const ls = this.links;
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
          return qf.type.get.widened(qf.type.get.widenedLiteral(qf.check.expression(d.statements[0].expression)));
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
          qf.is.doc.propertyLikeTag(d) ||
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
        } else return qu.fail('Unhandled declaration kind! ' + qf.format.syntax(d.kind) + ' for ' + qf.format.symbol(this));
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
    const ls = this.links;
    const worker = (): qt.Type => {
      if (!pushTypeResolution(this, TypeSystemPropertyName.Type)) return errorType;
      let t = resolveTypeOfAccessors(this);
      if (!popTypeResolution()) {
        t = anyType;
        if (noImplicitAny) {
          const getter = this.declarationOfKind<qt.AccessorDeclaration>(Syntax.GetAccessor);
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
    const getter = this.declarationOfKind<qt.AccessorDeclaration>(Syntax.GetAccessor);
    const setter = this.declarationOfKind<qt.AccessorDeclaration>(Syntax.SetAccessor);
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
      qf.assert.true(!!getter, 'there must exist a getter as we are current checking either setter or getter in this function');
      if (!isPrivateWithinAmbient(getter))
        errorOrSuggestion(noImplicitAny, getter, qd.Property_0_implicitly_has_type_any_because_its_get_accessor_lacks_a_return_type_annotation, this.symbolToString());
    }
    return anyType;
  }
  getBaseTypeVariableOfClass() {
    const t = getBaseConstructorTypeOfClass(this.getDeclaredTypeOfClassOrInterface());
    return t.isa(qt.TypeFlags.TypeVariable) ? t : t.isa(qt.TypeFlags.Intersection) ? qf.find.up((t as qt.IntersectionType).types, (t) => !!t.isa(qt.TypeFlags.TypeVariable)) : undefined;
  }
  getTypeOfFuncClassEnumModule(): qt.Type {
    let ls = this.links;
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
  getTypeOfFuncClassEnumModuleWorker(): qt.Type {
    const d = this.valueDeclaration;
    if (this.flags & SymbolFlags.Module && this.isShorthandAmbientModule()) return anyType;
    else if (d && (d.kind === Syntax.BinaryExpression || (qf.is.accessExpression(d) && d.parent.kind === Syntax.BinaryExpression))) return qf.get.widenedTypeForAssignmentDeclaration(this);
    else if (this.flags & SymbolFlags.ValueModule && d && d.kind === Syntax.SourceFile && d.commonJsModuleIndicator) {
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
    return strictNullChecks && this.flags & SymbolFlags.Optional ? qf.type.get.optional(type) : type;
  }
  getTypeOfEnumMember(): qt.Type {
    const ls = this.links;
    return ls.type || (ls.type = getDeclaredTypeOfEnumMember(this));
  }
  getTypeOfAlias(): qt.Type {
    const ls = this.links;
    if (!ls.type) {
      const targetSymbol = this.resolveAlias();
      ls.type = targetSymbol.flags & SymbolFlags.Value ? targetSymbol.typeOfSymbol() : errorType;
    }
    return ls.type;
  }
  getTypeOfInstantiatedSymbol(): qt.Type {
    const ls = this.links;
    if (!ls.type) {
      if (!pushTypeResolution(this, TypeSystemPropertyName.Type)) return (ls.type = errorType);
      let type = instantiateType(ls.target!.typeOfSymbol(), ls.mapper);
      if (!popTypeResolution()) type = reportCircularityError(this);
      ls.type = type;
    }
    return ls.type;
  }
  reportCircularityError() {
    const d = <qt.VariableLikeDeclaration>this.valueDeclaration;
    if (qf.get.effectiveTypeAnnotationNode(d)) {
      error(this.valueDeclaration, qd._0_is_referenced_directly_or_indirectly_in_its_own_type_annotation, this.symbolToString());
      return errorType;
    }
    if (noImplicitAny && (d.kind !== Syntax.Param || (<qt.HasIniter>d).initer)) {
      error(this.valueDeclaration, qd._0_implicitly_has_type_any_because_it_does_not_have_a_type_annotation_and_is_referenced_directly_or_indirectly_in_its_own_initer, this.symbolToString());
    }
    return anyType;
  }
  getOuterTypeParamsOfClassOrInterface(): qt.TypeParam[] | undefined {
    const d = this.flags & SymbolFlags.Class ? this.valueDeclaration : this.declarationOfKind(Syntax.InterfaceDeclaration)!;
    qf.assert.true(!!d, 'Class was missing valueDeclaration -OR- non-class had no interface declarations');
    return getOuterTypeParams(d);
  }
  getLocalTypeParamsOfClassOrInterfaceOrTypeAlias(): qt.TypeParam[] | undefined {
    let r: qt.TypeParam[] | undefined;
    for (const d of this.declarations ?? []) {
      if (d.kind === Syntax.InterfaceDeclaration || d.kind === Syntax.ClassDeclaration || d.kind === Syntax.ClassExpression || qf.is.jsConstructor(d) || qf.is.typeAlias(d)) {
        const d2 = d as qt.InterfaceDeclaration | qt.TypeAliasDeclaration | qt.DocTypedefTag | qt.DocCallbackTag;
        r = appendTypeParams(r, qf.get.effectiveTypeParamDeclarations(d2));
      }
    }
    return r;
  }
  getTypeParamsOfClassOrInterface(): qt.TypeParam[] | undefined {
    return concatenate(this.getOuterTypeParamsOfClassOrInterface(), this.getLocalTypeParamsOfClassOrInterfaceOrTypeAlias());
  }
  isThislessInterface() {
    const ds = this.declarations;
    if (ds) {
      for (const d of ds) {
        if (d.kind === Syntax.InterfaceDeclaration) {
          if (d.flags & NodeFlags.ContainsThis) return false;
          const ns = qf.get.interfaceBaseTypeNodes(<qt.InterfaceDeclaration>d);
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
  getDeclaredTypeOfClassOrInterface(): qt.InterfaceType {
    let ls = this.links;
    const originalLinks = ls;
    if (!ls.declaredType) {
      const kind = this.flags & SymbolFlags.Class ? ObjectFlags.Class : ObjectFlags.Interface;
      const merged = mergeJSSymbols(this, getAssignedClassSymbol(this.valueDeclaration));
      if (merged) symbol = ls = merged;
      const type = (originalLinks.declaredType = ls.declaredType = <qt.InterfaceType>createObjectType(kind, this));
      const outerTypeParams = this.getOuterTypeParamsOfClassOrInterface();
      const localTypeParams = this.getLocalTypeParamsOfClassOrInterfaceOrTypeAlias();
      if (outerTypeParams || localTypeParams || kind === ObjectFlags.Class || !isThislessInterface(this)) {
        type.objectFlags |= ObjectFlags.Reference;
        type.typeParams = concatenate(outerTypeParams, localTypeParams);
        type.outerTypeParams = outerTypeParams;
        type.localTypeParams = localTypeParams;
        (<qt.GenericType>type).instantiations = new qu.QMap<qt.TypeReference>();
        (<qt.GenericType>type).instantiations.set(qf.type.get.listId(type.typeParams), <qt.GenericType>type);
        (<qt.GenericType>type).target = <qt.GenericType>type;
        (<qt.GenericType>type).resolvedTypeArgs = type.typeParams;
        type.thisType = createTypeParam(this);
        type.thisType.isThisType = true;
        type.thisType.constraint = type;
      }
    }
    return <qt.InterfaceType>ls.declaredType;
  }
  getDeclaredTypeOfTypeAlias(): qt.Type {
    const ls = this.links;
    if (!ls.declaredType) {
      if (!pushTypeResolution(this, TypeSystemPropertyName.DeclaredType)) return errorType;
      const d = Debug.check.defined(qf.find.up(this.declarations, isTypeAlias), 'Type alias symbol with no valid declaration found');
      const typeNode = qf.is.doc.typeAlias(d) ? d.typeExpression : d.type;
      let type = typeNode ? qf.get.typeFromTypeNode(typeNode) : errorType;
      if (popTypeResolution()) {
        const ps = this.getLocalTypeParamsOfClassOrInterfaceOrTypeAlias();
        if (ps) {
          ls.typeParams = ps;
          ls.instantiations = new qu.QMap<Type>();
          ls.instantiations.set(qf.type.get.listId(ps), type);
        }
      } else {
        type = errorType;
        error(qf.is.namedDeclaration(d) ? d.name : d || d, qd.Type_alias_0_circularly_references_itself, this.symbolToString());
      }
      ls.declaredType = type;
    }
    return ls.declaredType;
  }
  getEnumKind(): qt.EnumKind {
    const ls = this.links;
    if (ls.enumKind !== undefined) return ls.enumKind;
    let hasNonLiteralMember = false;
    for (const d of this.declarations ?? []) {
      if (d.kind === Syntax.EnumDeclaration) {
        for (const m of (<qt.EnumDeclaration>d).members) {
          if (m.initer && qf.is.stringLiteralLike(m.initer)) return (ls.enumKind = qt.EnumKind.Literal);
          if (!isLiteralEnumMember(m)) hasNonLiteralMember = true;
        }
      }
    }
    return (ls.enumKind = hasNonLiteralMember ? qt.EnumKind.Numeric : qt.EnumKind.Literal);
  }
  getDeclaredTypeOfEnum(): qt.Type {
    const ls = this.links;
    if (ls.declaredType) return ls.declaredType;
    if (this.getEnumKind() === qt.EnumKind.Literal) {
      enumCount++;
      const memberTypeList: qt.Type[] = [];
      for (const d of this.declarations ?? []) {
        if (d.kind === Syntax.EnumDeclaration) {
          for (const m of (<qt.EnumDeclaration>d).members) {
            const v = getEnumMemberValue(m);
            const t = qf.type.get.freshOfLiteral(qf.get.literalType(v !== undefined ? v : 0, enumCount, qf.get.symbolOfNode(m)));
            qf.get.symbolOfNode(m).links.declaredType = t;
            memberTypeList.push(qf.type.get.regularOfLiteral(t));
          }
        }
      }
      if (memberTypeList.length) {
        const e = qf.type.get.union(memberTypeList, qt.UnionReduction.Literal, this, undefined);
        if (e.isa(qt.TypeFlags.Union)) {
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
  getDeclaredTypeOfEnumMember(): qt.Type {
    const ls = this.links;
    if (!ls.declaredType) {
      const e = this.qf.symb.get.parent()!.getDeclaredTypeOfEnum();
      if (!ls.declaredType) ls.declaredType = e;
    }
    return ls.declaredType;
  }
  getDeclaredTypeOfTypeParam(): qt.TypeParam {
    const ls = this.links;
    return ls.declaredType || (ls.declaredType = createTypeParam(this));
  }
  getDeclaredTypeOfAlias(): qt.Type {
    const ls = this.links;
    return ls.declaredType || (ls.declaredType = this.resolveAlias().getDeclaredTypeOfSymbol());
  }
  getDeclaredTypeOfSymbol(): qt.Type {
    return this.tryGetDeclaredTypeOfSymbol() || errorType;
  }
  tryGetDeclaredTypeOfSymbol(): qt.Type | undefined {
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
      const d = this.declarations[0];
      if (d) {
        switch (d.kind) {
          case Syntax.PropertyDeclaration:
          case Syntax.PropertySignature:
            return qf.is.thislessVariableLikeDeclaration(<qt.VariableLikeDeclaration>d);
          case Syntax.MethodDeclaration:
          case Syntax.MethodSignature:
          case Syntax.Constructor:
          case Syntax.GetAccessor:
          case Syntax.SetAccessor:
            return isThislessFunctionLikeDeclaration(<qt.FunctionLikeDeclaration | qt.AccessorDeclaration>d);
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
      const ls = this.links;
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
  getIndexDeclarationOfSymbol(k: IndexKind): qt.IndexSignatureDeclaration | undefined {
    const syntaxKind = k === qt.IndexKind.Number ? Syntax.NumberKeyword : Syntax.StringKeyword;
    const s = this.getIndexSymbol();
    if (s) {
      for (const d of s.declarations ?? []) {
        const n = cast(d, qt.IndexSignatureDeclaration.kind);
        if (n.params.length === 1) {
          const p = n.params[0];
          if (p.type && p.type.kind === syntaxKind) return n;
        }
      }
    }
    return;
  }
  getIndexInfoOfSymbol(k: IndexKind): qt.IndexInfo | undefined {
    const d = this.getIndexDeclarationOfSymbol(k);
    if (d) return createIndexInfo(d.type ? qf.get.typeFromTypeNode(d.type) : anyType, qf.has.effectiveModifier(d, ModifierFlags.Readonly), d);
    return;
  }
  createUniqueESSymbolType() {
    const type = <qt.UniqueESSymbolType>createType(TypeFlags.UniqueESSymbol);
    type.symbol = this;
    type.escName = `__@${this.escName}@${this.id}` as qu.__String;
    return type;
  }
  getAliasVariances() {
    const ls = this.links;
    return getVariancesWorker(ls.typeParams, ls, (_links, param, marker) => {
      const type = qf.get.typeAliasInstantiation(this, instantiateTypes(ls.typeParams!, makeUnaryTypeMapper(param, marker)));
      type.aliasTypeArgsContainsMarker = true;
      return type;
    });
  }
  isParamAssigned() {
    const f = qf.get.rootDeclaration(this.valueDeclaration).parent as qt.FunctionLikeDeclaration;
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
    return !!(this.checkFlags & CheckFlags.Mapped && !(this as qt.MappedType).type && findResolutionCycleStartIndex(this, TypeSystemPropertyName.Type) >= 0);
  }
  getImmediateAliasedSymbol(): Symbol | undefined {
    qf.assert.true((this.flags & SymbolFlags.Alias) !== 0, 'Should only get Alias here.');
    const ls = this.links;
    if (!ls.immediateTarget) {
      const node = this.getDeclarationOfAliasSymbol();
      if (!node) return qu.fail();
      ls.immediateTarget = getTargetOfAliasDeclaration(node, true);
    }
    return ls.immediateTarget;
  }
  isPrototypeProperty() {
    if (this.flags & SymbolFlags.Method || this.checkFlags & CheckFlags.SyntheticMethod) return true;
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
      if (d && qf.is.withIniter(d)) return qf.type.get.optional(t);
    }
    return t;
  }
  isReadonlySymbol() {
    return !!(
      this.checkFlags & CheckFlags.Readonly ||
      (this.flags & SymbolFlags.Property && this.declarationModifierFlags() & ModifierFlags.Readonly) ||
      (this.flags & SymbolFlags.Variable && this.getDeclarationNodeFlagsFromSymbol() & NodeFlags.Const) ||
      (this.flags & SymbolFlags.Accessor && !(this.flags & SymbolFlags.SetAccessor)) ||
      this.flags & SymbolFlags.EnumMember ||
      qu.some(this.declarations, isReadonlyAssignmentDeclaration)
    );
  }
  checkFunctionOrConstructorSymbol(): void {
    if (!produceDiagnostics) return;
    function getCanonicalOverload(overloads: qt.Declaration[], implementation: qt.FunctionLikeDeclaration | undefined): qt.Declaration {
      const implementationSharesContainerWithFirstOverload = implementation !== undefined && implementation.parent === overloads[0].parent;
      return implementationSharesContainerWithFirstOverload ? implementation! : overloads[0];
    }
    function checkFlagAgreementBetweenOverloads(
      overloads: qt.Declaration[],
      implementation: qt.FunctionLikeDeclaration | undefined,
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
      overloads: qt.Declaration[],
      implementation: qt.FunctionLikeDeclaration | undefined,
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
    let bodyDeclaration: qt.FunctionLikeDeclaration | undefined;
    let lastSeenNonAmbientDeclaration: qt.FunctionLikeDeclaration | undefined;
    let previousDeclaration: qt.SignatureDeclaration | undefined;
    const declarations = this.declarations;
    const isConstructor = (this.flags & SymbolFlags.Constructor) !== 0;
    function reportImplementationExpectedError(node: qt.SignatureDeclaration): void {
      if (node.name && qf.is.missing(node.name)) return;
      let seen = false;
      const subsequentNode = qf.each.child(node.parent, (c) => {
        if (seen) return c;
        seen = c === node;
      });
      if (subsequentNode && subsequentNode.pos === node.end) {
        if (subsequentNode.kind === node.kind) {
          const errorNode: Node = (<qt.FunctionLikeDeclaration>subsequentNode).name || subsequentNode;
          const subsequentName = (<qt.FunctionLikeDeclaration>subsequentNode).name;
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
          if (qf.is.present((<qt.FunctionLikeDeclaration>subsequentNode).body)) {
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
      const node = <qt.SignatureDeclaration | qt.ClassDeclaration | qt.ClassExpression>current;
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
        if (qf.is.present((node as qt.FunctionLikeDeclaration).body) && bodyDeclaration) {
          if (isConstructor) multipleConstructorImplementation = true;
          else duplicateFunctionDeclaration = true;
        } else if (previousDeclaration && previousDeclaration.parent === node.parent && previousDeclaration.end !== node.pos) {
          reportImplementationExpectedError(previousDeclaration);
        }
        if (qf.is.present((node as qt.FunctionLikeDeclaration).body))
          if (!bodyDeclaration) bodyDeclaration = node as qt.FunctionLikeDeclaration;
          else hasOverloads = true;
        previousDeclaration = node;
        if (!inAmbientContextOrInterface) lastSeenNonAmbientDeclaration = node as qt.FunctionLikeDeclaration;
      }
    }
    if (multipleConstructorImplementation) {
      forEach(declarations, (d) => {
        error(d, qd.Multiple_constructor_implementations_are_not_allowed);
      });
    }
    if (duplicateFunctionDeclaration) {
      forEach(declarations, (d) => {
        error(qf.decl.nameOf(d), qd.Duplicate_function_implementation);
      });
    }
    if (hasNonAmbientClass && !isConstructor && this.flags & SymbolFlags.Function) {
      forEach(declarations, (d) => {
        addDuplicateDeclarationError(d, qd.Duplicate_identifier_0, this.name, declarations);
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
              qf.make.diagForNode(bodyDeclaration, qd.The_implementation_signature_is_declared_here)
            );
            break;
          }
        }
      }
    }
  }
  checkTypeParamListsIdentical() {
    if (this.declarations?.length === 1) return;
    const ls = this.links;
    if (!ls.typeParamsChecked) {
      ls.typeParamsChecked = true;
      const ds = this.getClassOrInterfaceDeclarationsOfSymbol();
      if (!ds || ds.length <= 1) return;
      const t = this.getDeclaredTypeOfSymbol() as qt.InterfaceType;
      if (!areTypeParamsIdentical(ds, t.localTypeParams!)) {
        const n = this.symbolToString();
        for (const d of ds) {
          error(d.name, qd.All_declarations_of_0_must_have_identical_type_params, n);
        }
      }
    }
  }
  getTargetSymbol() {
    return this.checkFlags & CheckFlags.Instantiated ? this.target! : this;
  }
  getClassOrInterfaceDeclarationsOfSymbol() {
    return qu.filter(this.declarations, (d: qt.Declaration): d is qt.ClassDeclaration | qt.InterfaceDeclaration => d.kind === Syntax.ClassDeclaration || d.kind === Syntax.InterfaceDeclaration);
  }
  getFirstNonAmbientClassOrFunctionDeclaration(): qt.Declaration | undefined {
    for (const d of this.declarations ?? []) {
      if ((d.kind === Syntax.ClassDeclaration || (d.kind === Syntax.FunctionDeclaration && qf.is.present((<qt.FunctionLikeDeclaration>d).body))) && !(d.flags & NodeFlags.Ambient)) return d;
    }
    return;
  }
  getRootSymbols(): readonly Symbol[] {
    const rs = this.getImmediateRootSymbols();
    return rs ? flatMap(rs, this.getRootSymbols) : [this];
  }
  getImmediateRootSymbols(): readonly Symbol[] | undefined {
    if (this.checkFlags & CheckFlags.Synthetic) return mapDefined(this.links.containingType!.types, (t) => qf.type.get.property(t, this.escName));
    if (this.flags & SymbolFlags.Transient) {
      const { leftSpread, rightSpread, syntheticOrigin } = this as qt.TransientSymbol;
      return leftSpread ? [leftSpread, rightSpread!] : syntheticOrigin ? [syntheticOrigin] : singleElemArray(this.tryGetAliasTarget());
    }
    return;
  }
  tryGetAliasTarget(): Symbol | undefined {
    let target: Symbol | undefined;
    let next: Symbol | undefined = this;
    while ((next = next.links.target)) {
      target = next;
    }
    return target;
  }
  isSymbolOfDestructuredElemOfCatchBinding() {
    return this.valueDeclaration.kind === Syntax.BindingElem && walkUpBindingElemsAndPatterns(this.valueDeclaration).parent.kind === Syntax.CatchClause;
  }
  isSymbolOfDeclarationWithCollidingName() {
    if (this.flags & SymbolFlags.BlockScoped && this.valueDeclaration.kind !== Syntax.SourceFile) {
      const ls = this.links;
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
      const p = current.qf.symb.get.parent();
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
        addRelatedInfo(error(useSite, message, unescName), qf.make.diagForNode(typeOnlyDeclaration, relatedMessage, unescName));
      }
    }
  }
  isTypeParamSymbolDeclaredInContainer(container: Node) {
    for (const d of this.declarations) {
      if (d.kind === Syntax.TypeParam) {
        const p = d.parent.kind === Syntax.DocTemplateTag ? qf.get.doc.host(d.parent) : d.parent;
        if (p === container) return !(d.parent.kind === Syntax.DocTemplateTag && qf.find.up((d.parent.parent as qt.Doc).tags!, isDocTypeAlias));
      }
    }
    return false;
  }
  getExportOfModule(spec: qt.ImportOrExportSpecifier, dontResolveAlias: boolean): Symbol | undefined {
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
      const typeAnnotation = (<qt.VariableDeclaration>this.valueDeclaration).type;
      if (typeAnnotation) return qf.type.get.property(qf.get.typeFromTypeNode(typeAnnotation), name)?.resolveSymbol();
    }
    return;
  }
  getFullyQualifiedName(containingLocation?: Node): string {
    return this.parent
      ? qf.get.fullyQualifiedName(this.parent, containingLocation) + '.' + this.symbolToString()
      : this.symbolToString(containingLocation, undefined, qt.SymbolFormatFlags.DoNotIncludeSymbolChain | qt.SymbolFormatFlags.AllowAnyNodeKind);
  }
  getAliasForSymbolInContainer(container: Symbol) {
    if (container === this.qf.symb.get.parent()) return this;
    const exportEquals = container.exports && container.exports.get(InternalSymbol.ExportEquals);
    if (exportEquals && qf.get.symbolIfSameReference(exportEquals, this)) return container;
    const exports = container.getExportsOfSymbol();
    const quick = exports.get(this.escName);
    if (quick && qf.get.symbolIfSameReference(quick, this)) return quick;
    return forEachEntry(exports, (exported) => {
      if (qf.get.symbolIfSameReference(exported, this)) return exported;
    });
  }
  hasVisibleDeclarations(shouldComputeAliasToMakeVisible: boolean): qt.SymbolVisibilityResult | undefined {
    let aliasesToMakeVisible: qt.LateVisibilityPaintedStatement[] | undefined;
    if (
      !every(
        qu.filter(this.declarations, (d) => d.kind !== Syntax.Identifier),
        getIsDeclarationVisible
      )
    ) {
      return;
    }
    return { accessibility: qt.SymbolAccessibility.Accessible, aliasesToMakeVisible };
    function getIsDeclarationVisible(d: qt.Declaration) {
      if (!qf.is.declarationVisible(d)) {
        const anyImportSyntax = getAnyImportSyntax(d);
        if (anyImportSyntax && !has.syntacticModifier(anyImportSyntax, ModifierFlags.Export) && qf.is.declarationVisible(anyImportSyntax.parent)) return addVisibleAlias(d, anyImportSyntax);
        else if (
          d.kind === Syntax.VariableDeclaration &&
          d.parent.parent.kind === Syntax.VariableStatement &&
          !has.syntacticModifier(d.parent.parent, ModifierFlags.Export) &&
          qf.is.declarationVisible(d.parent.parent.parent)
        ) {
          return addVisibleAlias(d, d.parent.parent);
        } else if (qf.is.lateVisibilityPaintedStatement(d) && !has.syntacticModifier(d, ModifierFlags.Export) && qf.is.declarationVisible(d.parent)) {
          return addVisibleAlias(d, d);
        }
        return false;
      }
      return true;
    }
    function addVisibleAlias(d: qt.Declaration, aliasingStatement: qt.LateVisibilityPaintedStatement) {
      if (shouldComputeAliasToMakeVisible) {
        qf.get.nodeLinks(d).isVisible = true;
        aliasesToMakeVisible = appendIfUnique(aliasesToMakeVisible, aliasingStatement);
      }
      return true;
    }
  }
  getDeclarationWithTypeAnnotation(n?: Node) {
    return this.declarations && qf.find.up(this.declarations, (d) => !!qf.get.effectiveTypeAnnotationNode(d) && (!n || !!qc.findAncestor(d, (a) => a === n)));
  }
  getNameOfSymbolFromNameType(c?: QContext) {
    const t = this.links.nameType;
    if (t) {
      if (t.isa(qt.TypeFlags.StringOrNumberLiteral)) {
        const n = '' + (<qt.StringLiteralType | qt.NumberLiteralType>t).value;
        if (!qy.is.identifierText(n) && !NumericLiteral.name(n)) return `"${escapeString(n, Codes.doubleQuote)}"`;
        if (NumericLiteral.name(n) && startsWith(n, '-')) return `[${n}]`;
        return n;
      }
      if (t.isa(qt.TypeFlags.UniqueESSymbol)) return `[${getNameOfSymbolAsWritten((<qt.UniqueESSymbolType>t).symbol, c)}]`;
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
      let d = qf.find.defined(this.declarations, (d) => (qf.decl.nameOf(d) ? d : undefined));
      const name = d && qf.decl.nameOf(d);
      if (d && name) {
        if (d.kind === Syntax.CallExpression && qf.is.bindableObjectDefinePropertyCall(d)) return this.name;
        if (name.kind === Syntax.ComputedPropertyName && !(this.checkFlags & CheckFlags.Late)) {
          const nameType = this.links.nameType;
          if (nameType && nameType.isa(qt.TypeFlags.StringOrNumberLiteral)) {
            const result = getNameOfSymbolFromNameType(this, c);
            if (result !== undefined) return result;
          }
        }
        return declarationNameToString(name);
      }
      if (!d) d = this.declarations[0];
      if (d.parent && d.parent.kind === Syntax.VariableDeclaration) return declarationNameToString((<qt.VariableDeclaration>d.parent).name);
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
}
export class SymbolTable extends qc.SymbolTable<Symbol> {
  addInheritedMembers(ss: Symbol[]) {
    for (const s of ss) {
      if (!this.has(s.escName) && !s.isStaticPrivateIdentifierProperty()) this.set(s.escName, s);
    }
  }
  fetch(n: qu.__String, f: SymbolFlags): Symbol | undefined {
    if (f) {
      const s = qf.get.mergedSymbol(this.get(n));
      if (s) {
        qf.assert.true((s.checkFlags() & CheckFlags.Instantiated) === 0);
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
      if (!qy.is.reservedName(n) && s.isValue()) (r || (r = [])).push(s);
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
    const d = left.declaration;
    const params = combineUnionParams(left, right);
    const thisParam = combineUnionThisParam(left.thisParam, right.thisParam);
    const minArgCount = Math.max(left.minArgCount, right.minArgCount);
    const result = qf.make.signature(d, left.typeParams || right.typeParams, thisParam, params, undefined, undefined, minArgCount, (left.flags | right.flags) & SignatureFlags.PropagatingFlags);
    result.unions = concatenate(left.unions || [left], [right]);
    return result;
  }
  compareSignaturesRelated(
    source: Signature,
    target: Signature,
    checkMode: SignatureCheckMode,
    reportErrors: boolean,
    errorReporter: ErrorReporter | undefined,
    incompatibleErrorReporter: ((source: qt.Type, target: qt.Type) => void) | undefined,
    compareTypes: qt.TypeComparer,
    reportUnreliableMarkers: qt.TypeMapper | undefined
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
      const sourceSig = checkMode & SignatureCheckMode.Callback ? undefined : getSingleCallSignature(qf.type.get.nonNullable(sourceType));
      const targetSig = checkMode & SignatureCheckMode.Callback ? undefined : getSingleCallSignature(qf.type.get.nonNullable(targetType));
      const callbacks =
        sourceSig &&
        targetSig &&
        !getTypePredicateOfSignature(sourceSig) &&
        !getTypePredicateOfSignature(targetSig) &&
        (qf.type.get.falsyFlags(sourceType) & qt.TypeFlags.Nullable) === (qf.type.get.falsyFlags(targetType) & qt.TypeFlags.Nullable);
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
  compareSignaturesIdentical(
    source: Signature,
    target: Signature,
    partialMatch: boolean,
    ignoreThisTypes: boolean,
    ignoreReturnTypes: boolean,
    compareTypes: (s: qt.Type, t: qt.Type) => Ternary
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
            (compareTypes(instantiateType(qf.type.get.constraintFromParam(s), mapper) || unknownType, qf.type.get.constraintFromParam(t) || unknownType) &&
              compareTypes(instantiateType(qf.type.get.defaultFromParam(s), mapper) || unknownType, qf.type.get.defaultFromParam(t) || unknownType))
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
  tryGetTypeAtPosition(signature: Signature, pos: number): qt.Type | undefined {
    const paramCount = signature.params.length - (signature.hasRestParam() ? 1 : 0);
    if (pos < paramCount) return getTypeOfParam(signature.params[pos]);
    if (signature.hasRestParam()) {
      const restType = signature.params[paramCount].typeOfSymbol();
      const index = pos - paramCount;
      if (!qf.type.is.tuple(restType) || restType.target.hasRestElem || index < getTypeArgs(restType).length) return qf.type.get.indexedAccess(restType, qf.get.literalType(index));
    }
    return;
  }
  inferFromAnnotatedParams(signature: Signature, context: Signature, inferenceContext: qt.InferenceContext) {
    const len = signature.params.length - (signature.hasRestParam() ? 1 : 0);
    for (let i = 0; i < len; i++) {
      const d = <qt.ParamDeclaration>signature.params[i].valueDeclaration;
      if (d.type) {
        const typeNode = qf.get.effectiveTypeAnnotationNode(d);
        if (typeNode) inferTypes(inferenceContext.inferences, qf.get.typeFromTypeNode(typeNode), getTypeAtPosition(context, i));
      }
    }
    const restType = getEffectiveRestType(context);
    if (restType && restType.isa(qt.TypeFlags.TypeParam)) {
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
      if (!param || (param.valueDeclaration && !(<qt.ParamDeclaration>param.valueDeclaration).type)) {
        if (!param) signature.thisParam = createSymbolWithType(context.thisParam, undefined);
        assignParamType(signature.thisParam!, context.thisParam.typeOfSymbol());
      }
    }
    const len = signature.params.length - (signature.hasRestParam() ? 1 : 0);
    for (let i = 0; i < len; i++) {
      const param = signature.params[i];
      if (!get.effectiveTypeAnnotationNode(<qt.ParamDeclaration>param.valueDeclaration)) {
        const contextualParamType = tryGetTypeAtPosition(context, i);
        assignParamType(param, contextualParamType);
      }
    }
    if (signature.hasRestParam()) {
      const param = last(signature.params);
      if (param.isTransient() || !get.effectiveTypeAnnotationNode(<qt.ParamDeclaration>param.valueDeclaration)) {
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
  applyToParamTypes(source: Signature, target: Signature, callback: (s: qt.Type, t: qt.Type) => void) {
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
  applyToReturnTypes(source: Signature, target: Signature, callback: (s: qt.Type, t: qt.Type) => void) {
    const sourceTypePredicate = getTypePredicateOfSignature(source);
    const targetTypePredicate = getTypePredicateOfSignature(target);
    if (sourceTypePredicate && targetTypePredicate && typePredicateKindsMatch(sourceTypePredicate, targetTypePredicate) && sourceTypePredicate.type && targetTypePredicate.type)
      callback(sourceTypePredicate.type, targetTypePredicate.type);
    else {
      callback(qf.get.returnTypeOfSignature(source), qf.get.returnTypeOfSignature(target));
    }
  }
  restTypeOfSignature(): qt.Type {
    return this.tryRestType() || anyType;
  }
  tryRestType(): qt.Type | undefined {
    if (this.hasRestParam()) {
      const t = this.params[this.params.length - 1].typeOfSymbol();
      const r = qf.type.is.tuple(t) ? getRestTypeOfTupleType(t) : t;
      return r && qf.get.indexTypeOfType(r, qt.IndexKind.Number);
    }
    return;
  }
  cloneSignature(sig: Signature): Signature {
    const result = qf.make.signature(sig.declaration, sig.typeParams, sig.thisParam, sig.params, undefined, undefined, sig.minArgCount, sig.flags & SignatureFlags.PropagatingFlags);
    result.target = sig.target;
    result.mapper = sig.mapper;
    result.unions = sig.unions;
    return result;
  }
  signatureToString(signature: Signature, enclosingDeclaration?: Node, flags = TypeFormatFlags.None, kind?: qt.SignatureKind, writer?: qt.EmitTextWriter): string {
    return writer ? signatureToStringWorker(writer).getText() : usingSingleLineStringWriter(signatureToStringWorker);
    function signatureToStringWorker(writer: qt.EmitTextWriter) {
      let sigOutput: Syntax;
      if (flags & TypeFormatFlags.WriteArrowStyleSignature) sigOutput = kind === qt.SignatureKind.Construct ? Syntax.ConstructorTyping : Syntax.FunctionTyping;
      else {
        sigOutput = kind === qt.SignatureKind.Construct ? Syntax.ConstructSignature : Syntax.CallSignature;
      }
      const sig = nodeBuilder.signatureToSignatureDeclaration(
        signature,
        sigOutput,
        enclosingDeclaration,
        toNodeBuilderFlags(flags) | NodeBuilderFlags.IgnoreErrors | NodeBuilderFlags.WriteTypeParamsInQualifiedName
      );
      const printer = createPrinter({ removeComments: true, omitTrailingSemicolon: true });
      const sourceFile = enclosingDeclaration && enclosingDeclaration.sourceFile;
      printer.writeNode(qt.EmitHint.Unspecified, sig!, sourceFile, getTrailingSemicolonDeferringWriter(writer));
      return writer;
    }
  }
}
