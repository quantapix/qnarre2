import * as qc from '../core';
import * as qd from '../diagnostic';
import { InternalSymbol, ModifierFlags, Node, NodeFlags, SymbolFlags } from '../type';
import * as qt from '../type';
import * as qu from '../util';
import { Syntax } from '../syntax';
import * as qy from '../syntax';
import { qf } from './index';
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
        qu.assert((s.checkFlags() & qt.CheckFlags.Instantiated) === 0);
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
export class Symbol extends qc.Symbol implements qt.TransientSymbol {
  static nextId = 1;
  static count = 0;
  _checkFlags: qt.CheckFlags;
  constructor(f: SymbolFlags, name: qu.__String, c?: qt.CheckFlags) {
    super(f | SymbolFlags.Transient, name);
    Symbol.count++;
    this._checkFlags = c || 0;
  }
  get checkFlags(): qt.CheckFlags {
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
    if (this.members) r.members = cloneMap(this.members);
    if (this.exports) r.exports = cloneMap(this.exports);
    this.recordMerged(r);
    return r;
  }
  merge(t: Symbol, unidirectional = false): this {
    if (!(t.flags & getExcludedSymbolFlags(this.flags)) || (this.flags | t.flags) & SymbolFlags.Assignment) {
      if (this === t) return t;
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
      if (t !== globalThisSymbol) error(qf.get.declaration.nameOf(this.declarations[0]), qd.Cannot_augment_module_0_with_value_exports_because_it_resolves_to_a_non_module_entity, t.symbolToString());
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
      !!(this.flags & SymbolFlags.ExportDoesNotSupportDefaultModifier || (this.flags & SymbolFlags.Function && qu.length(qf.get.propertiesOfType(this.qf.get.typeOfSymbol())))) &&
      !(this.flags & SymbolFlags.Alias);
    if (needsPostExportDefault) isPrivate = true;
    const modifierFlags = (!isPrivate ? ModifierFlags.Export : 0) | (isDefault && !needsPostExportDefault ? ModifierFlags.Default : 0);
    const isConstMergedWithNS =
      this.flags & SymbolFlags.Module && this.flags & (SymbolFlags.BlockScopedVariable | SymbolFlags.FunctionScopedVariable | SymbolFlags.Property) && this.escName !== InternalSymbol.ExportEquals;
    const isConstMergedWithNSPrintableAsSignatureMerge = isConstMergedWithNS && isTypeRepresentableAsFunctionNamespaceMerge(this.qf.get.typeOfSymbol(), this);
    if (this.flags & (SymbolFlags.Function | SymbolFlags.Method) || isConstMergedWithNSPrintableAsSignatureMerge)
      serializeAsFunctionNamespaceMerge(this.qf.get.typeOfSymbol(), this, getInternalSymbol(symbolName), modifierFlags);
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
          qu.filter(qf.get.propertiesOfType(this.qf.get.typeOfSymbol()), (p) => !!(p.flags & SymbolFlags.EnumMember)),
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
      const type = qf.get.typeOfSymbol(this);
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
      const typeToSerialize = qf.get.widenedType(qf.get.typeOfSymbol(qf.get.mergedSymbol(this)));
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
    return strictNullChecks && this.flags & SymbolFlags.Optional ? getOptionalType(type) : type;
  }
  getTypeOfEnumMember(): Type {
    const ls = this.getLinks();
    return ls.type || (ls.type = getDeclaredTypeOfEnumMember(this));
  }
  getTypeOfAlias(): Type {
    const ls = this.getLinks();
    if (!ls.type) {
      const targetSymbol = this.resolveAlias();
      ls.type = targetSymbol.flags & SymbolFlags.Value ? qf.get.typeOfSymbol(targetSymbol) : errorType;
    }
    return ls.type;
  }
  getTypeOfInstantiatedSymbol(): Type {
    const ls = this.getLinks();
    if (!ls.type) {
      if (!pushTypeResolution(this, TypeSystemPropertyName.Type)) return (ls.type = errorType);
      let type = instantiateType(qf.get.typeOfSymbol(ls.target!), ls.mapper);
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
  getTypeOfSymbolWithDeferredType() {
    const ls = this.getLinks();
    if (!ls.type) {
      Debug.assertIsDefined(ls.deferralParent);
      Debug.assertIsDefined(ls.deferralConstituents);
      ls.type = ls.deferralParent.flags & qt.TypeFlags.Union ? qf.get.unionType(ls.deferralConstituents) : qf.get.intersectionType(ls.deferralConstituents);
    }
    return ls.type;
  }
  getTypeOfSymbol(): Type {
    const f = this.checkFlags();
    if (f & qt.CheckFlags.DeferredType) return this.qf.get.typeOfSymbolWithDeferredType();
    if (f & qt.CheckFlags.Instantiated) return this.getTypeOfInstantiatedSymbol();
    if (f & qt.CheckFlags.Mapped) return getTypeOfMappedSymbol(this as MappedSymbol);
    if (f & qt.CheckFlags.ReverseMapped) return getTypeOfReverseMappedSymbol(this as ReverseMappedSymbol);
    if (this.flags & (SymbolFlags.Variable | SymbolFlags.Property)) return this.getTypeOfVariableOrParamOrProperty();
    if (this.flags & (SymbolFlags.Function | SymbolFlags.Method | SymbolFlags.Class | SymbolFlags.Enum | SymbolFlags.ValueModule)) return this.getTypeOfFuncClassEnumModule();
    if (this.flags & SymbolFlags.EnumMember) return this.getTypeOfEnumMember();
    if (this.flags & SymbolFlags.Accessor) return this.getTypeOfAccessors();
    if (this.flags & SymbolFlags.Alias) return this.getTypeOfAlias();
    return errorType;
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
    return this.flags & SymbolFlags.Variable && (getDeclarationNodeFlagsFromSymbol(this) & NodeFlags.Const) !== 0 && this.qf.get.typeOfSymbol() !== autoArrayType;
  }
  isCircularMappedProperty() {
    return !!(this.checkFlags() & qt.CheckFlags.Mapped && !(this as MappedType).type && findResolutionCycleStartIndex(this, TypeSystemPropertyName.Type) >= 0);
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
    if (this.flags & SymbolFlags.Method || this.checkFlags() & qt.CheckFlags.SyntheticMethod) return true;
    if (qf.is.inJSFile(this.valueDeclaration)) {
      const p = this.valueDeclaration?.parent;
      return p && p.kind === Syntax.BinaryExpression && qf.get.assignmentDeclarationKind(p) === qt.AssignmentDeclarationKind.PrototypeProperty;
    }
  }
  symbolHasNonMethodDeclaration() {
    return !!forEachProperty(this, (p) => !(p.flags & SymbolFlags.Method));
  }
  getTypeOfParam() {
    const t = this.qf.get.typeOfSymbol();
    if (strictNullChecks) {
      const d = this.valueDeclaration;
      if (d && qf.is.withIniter(d)) return getOptionalType(t);
    }
    return t;
  }
  isReadonlySymbol() {
    return !!(
      this.checkFlags() & qt.CheckFlags.Readonly ||
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
          if (deviation & ModifierFlags.Export) error(qf.get.declaration.nameOf(o), qd.Overload_signatures_must_all_be_exported_or_non_exported);
          else if (deviation & ModifierFlags.Ambient) {
            error(qf.get.declaration.nameOf(o), qd.Overload_signatures_must_all_be_ambient_or_non_ambient);
          } else if (deviation & (ModifierFlags.Private | ModifierFlags.Protected)) {
            error(qf.get.declaration.nameOf(o) || o, qd.Overload_signatures_must_all_be_public_private_or_protected);
          } else if (deviation & ModifierFlags.Abstract) {
            error(qf.get.declaration.nameOf(o), qd.Overload_signatures_must_all_be_abstract_or_non_abstract);
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
          if (deviation) error(qf.get.declaration.nameOf(o), qd.Overload_signatures_must_all_be_optional_or_required);
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
        error(qf.get.declaration.nameOf(declaration), qd.Duplicate_function_implementation);
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
    return this.checkFlags() & qt.CheckFlags.Instantiated ? this.target! : this;
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
    if (this.checkFlags() & qt.CheckFlags.Synthetic) return mapDefined(this.getLinks().containingType!.types, (t) => qf.get.propertyOfType(t, this.escName));
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
      let d = firstDefined(this.declarations, (d) => (qf.get.declaration.nameOf(d) ? d : undefined));
      const name = d && qf.get.declaration.nameOf(d);
      if (d && name) {
        if (d.kind === Syntax.CallExpression && qf.is.bindableObjectDefinePropertyCall(d)) return this.name;
        if (name.kind === Syntax.ComputedPropertyName && !(this.checkFlags() & qt.CheckFlags.Late)) {
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
