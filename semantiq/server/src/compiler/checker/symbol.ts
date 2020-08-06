import * as qc from '../core';
import * as qd from '../diagnostic';
import { ModifierFlags, Node } from '../type';
import * as qt from '../type';
import * as qu from '../util';
import { Syntax } from '../syntax';
import * as qy from '../syntax';
import { qf } from '../core';
export class Symbol extends qc.Symbol implements TransientSymbol {
  static nextId = 1;
  static count = 0;
  checkFlags: qt.CheckFlags;
  constructor(f: qt.SymbolFlags, name: qu.__String, c?: qt.CheckFlags) {
    super(f | qt.SymbolFlags.Transient, name);
    Symbol.count++;
    this.checkFlags = c || 0;
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
  merge(t: Symbol, unidirectional = false): Symbol {
    if (!(t.flags & getExcludedSymbolFlags(this.flags)) || (this.flags | t.flags) & qt.SymbolFlags.Assignment) {
      if (this === t) return t;
      if (!(t.flags & qt.SymbolFlags.Transient)) {
        const r = t.resolveSymbol();
        if (r === unknownSymbol) return this;
        t = r?.clone();
      }
      if (this.flags & qt.SymbolFlags.ValueModule && t.flags & qt.SymbolFlags.ValueModule && t.constEnumOnlyModule && !this.constEnumOnlyModule) t.constEnumOnlyModule = false;
      t.flags |= this.flags;
      if (this.valueDeclaration) setValueDeclaration(t, this.valueDeclaration);
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
    } else if (t.flags & qt.SymbolFlags.NamespaceModule) {
      if (t !== globalThisSymbol) error(qf.get.declaration.nameOf(this.declarations[0]), qd.Cannot_augment_module_0_with_value_exports_because_it_resolves_to_a_non_module_entity, t.symbolToString());
    } else {
      const isEitherEnum = !!(t.flags & qt.SymbolFlags.Enum || this.flags & qt.SymbolFlags.Enum);
      const isEitherBlockScoped = !!(t.flags & qt.SymbolFlags.BlockScopedVariable || this.flags & qt.SymbolFlags.BlockScopedVariable);
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
        t.addDuplicateErrors(this, message, symbolName);
        this.addDuplicateErrors(t, message, symbolName);
      }
    }
    return t;
  }
  symbolToString(decl?: Node, meaning?: qt.SymbolFlags, flags: qt.SymbolFormatFlags = qt.SymbolFormatFlags.AllowAnyNodeKind, w?: EmitTextWriter): string {
    let f = qt.NodeBuilderFlags.IgnoreErrors;
    if (flags & qt.SymbolFormatFlags.UseOnlyExternalAliasing) f |= qt.NodeBuilderFlags.UseOnlyExternalAliasing;
    if (flags & qt.SymbolFormatFlags.WriteTypeParametersOrArguments) f |= qt.NodeBuilderFlags.WriteTypeParametersInQualifiedName;
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
  getLinks(): SymbolLinks {
    if (this.flags & qt.SymbolFlags.Transient) return this;
    const i = this.getId();
    return symbolLinks[i] || (symbolLinks[i] = new (<any>SymbolLinks)());
  }
  resolveAlias() {
    qu.assert((this.flags & qt.SymbolFlags.Alias) !== 0);
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
  private addDuplicates(locs: Declaration[]) {
    if (this.declarations) {
      for (const d of this.declarations) {
        pushIfUnique(locs, d);
      }
    }
  }
  private addDuplicateErrors(t: Symbol, m: qd.Message, name: string) {
    forEach(t.declarations, (n) => {
      addDuplicateDeclarationError(n, m, name, this.declarations);
    });
  }
  isNonLocalAlias(excludes = qt.SymbolFlags.Value | qt.SymbolFlags.Type | qt.SymbolFlags.Namespace): this is Symbol {
    const f = this.flags;
    return (f & (qt.SymbolFlags.Alias | excludes)) === qt.SymbolFlags.Alias || !!(f & qt.SymbolFlags.Alias && f & qt.SymbolFlags.Assignment);
  }
  tryResolveAlias() {
    const ls = this.getLinks();
    if (ls.target !== resolvingSymbol) return this.resolveAlias();
    return;
  }
  getDeclarationOfAliasSymbol() {
    const ds = this.declarations;
    return ds && find<Declaration>(ds, isAliasSymbolDeclaration);
  }
  getTypeOnlyAliasDeclaration(): TypeOnlyCompatibleAliasDeclaration | undefined {
    if (!(this.flags & qt.SymbolFlags.Alias)) return;
    return this.getLinks().typeOnlyDeclaration || undefined;
  }
  markAliasSymbolAsReferenced(): void {
    const ls = this.getLinks();
    if (!ls.referenced) {
      ls.referenced = true;
      const d = this.getDeclarationOfAliasSymbol();
      if (!d) return qu.fail();
      if (qf.is.internalModuleImportEqualsDeclaration(d)) {
        const t = this.resolveSymbol();
        if (t === unknownSymbol || (t && t.flags & qt.SymbolFlags.Value)) check.expressionCached(<Expression>d.moduleReference);
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
    if (!v || !is.inJSFile(v) || this.flags & qt.SymbolFlags.TypeAlias || qf.get.expandoIniter(v, false)) return;
    const i = v.kind === Syntax.VariableDeclaration ? qf.get.declaredExpandoIniter(v) : qf.get.assignedExpandoIniter(v);
    if (i) {
      const s = qf.get.symbolOfNode(i);
      if (s) return mergeJSSymbols(s, this);
    }
    return;
  }
  getExportsOfSymbol(): SymbolTable {
    return this.flags & qt.SymbolFlags.LateBindingContainer
      ? (getResolvedMembersOrExportsOfSymbol(this, MembersOrExportsResolutionKind.resolvedExports) as SymbolTable)
      : this.flags & qt.SymbolFlags.Module
      ? this.getExportsOfModule()
      : this.exports || emptySymbols;
  }
  getExportsOfModule(): SymbolTable {
    const ls = this.getLinks();
    return ls.resolvedExports || (ls.resolvedExports = this.getExportsOfModuleWorker());
  }
  getExportsOfModuleWorker(moduleSymbol: Symbol): SymbolTable {
    const visitedSymbols: Symbol[] = [];
    moduleSymbol = resolveExternalModuleSymbol(moduleSymbol);
    return visit(moduleSymbol) || emptySymbols;
    function visit(s: Symbol | undefined): SymbolTable | undefined {
      if (!(s && s.exports && pushIfUnique(visitedSymbols, s))) return;
      const symbols = cloneMap(s.exports);
      const exportStars = s.exports.get(InternalSymbol.ExportStar);
      if (exportStars) {
        const nestedSymbols = new SymbolTable();
        const lookupTable = new qu.QMap<ExportCollisionTracker>() as ExportCollisionTrackerTable;
        for (const node of exportStars.declarations) {
          const resolvedModule = resolveExternalModuleName(node, (node as ExportDeclaration).moduleSpecifier!);
          const exportedSymbols = visit(resolvedModule);
          extendExportSymbols(nestedSymbols, exportedSymbols, lookupTable, node as ExportDeclaration);
        }
        lookupTable.forEach(({ exportsWithDuplicate }, id) => {
          if (id === 'export=' || !(exportsWithDuplicate && exportsWithDuplicate.length) || symbols.has(id)) return;
          for (const node of exportsWithDuplicate) {
            diagnostics.add(
              qf.create.diagnosticForNode(
                node,
                qd.Module_0_has_already_exported_a_member_named_1_Consider_explicitly_re_exporting_to_resolve_the_ambiguity,
                lookupTable.get(id)!.specifierText,
                qy.get.unescUnderscores(id)
              )
            );
          }
        });
        extendExportSymbols(symbols, nestedSymbols);
      }
      return symbols;
    }
  }
  qf.get.mergedSymbol(): Symbol;
  qf.get.mergedSymbol(): Symbol | undefined;
  qf.get.mergedSymbol(): Symbol | undefined {
    let merged: Symbol;
    return this.mergeId && (merged = mergedSymbols[this.mergeId]) ? merged : this;
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
        results = append(results, resolvedModule);
      }
      if (length(results)) {
        (ls.extendedContainersByFile || (ls.extendedContainersByFile = new qu.QMap())).set(id, results!);
        return results!;
      }
    }
    if (ls.extendedContainers) return ls.extendedContainers;
    const otherFiles = host.getSourceFiles();
    for (const file of otherFiles) {
      if (!is.externalModule(file)) continue;
      const sym = qf.get.symbolOfNode(file);
      const ref = this.getAliasForSymbolInContainer(sym);
      if (!ref) continue;
      results = append(results, sym);
    }
    return (ls.extendedContainers = results || empty);
  }
  getContainersOfSymbol(enclosingDeclaration: Node | undefined): Symbol[] | undefined {
    const container = this.getParentOfSymbol();
    if (container && !(this.flags & qt.SymbolFlags.TypeParameter)) {
      const additionalContainers = mapDefined(container.declarations, fileSymbolIfFileSymbolExportEqualsContainer);
      const reexportContainers = enclosingDeclaration && this.getAlternativeContainingModules(enclosingDeclaration);
      if (enclosingDeclaration && qf.get.accessibleSymbolChain(container, enclosingDeclaration, qt.SymbolFlags.Namespace, false))
        return concatenate(concatenate([container], additionalContainers), reexportContainers);
      const res = append(additionalContainers, container);
      return concatenate(res, reexportContainers);
    }
    const candidates = mapDefined(this.declarations, (d) => {
      if (!is.ambientModule(d) && d.parent && hasNonGlobalAugmentationExternalModuleSymbol(d.parent)) return qf.get.symbolOfNode(d.parent);
      if (
        d.kind === Syntax.ClassExpression &&
        d.parent.kind === Syntax.BinaryExpression &&
        d.parent.operatorToken.kind === Syntax.EqualsToken &&
        qf.is.accessExpression(d.parent.left) &&
        qf.is.entityNameExpression(d.parent.left.expression)
      ) {
        if (qf.is.moduleExportsAccessExpression(d.parent.left) || qf.is.exportsIdentifier(d.parent.left.expression)) return qf.get.symbolOfNode(d.sourceFile);
        check.expressionCached(d.parent.left.expression);
        return getNodeLinks(d.parent.left.expression).resolvedSymbol;
      }
    });
    if (!length(candidates)) return;
    return mapDefined(candidates, (candidate) => (this.getAliasForSymbolInContainer(candidate) ? candidate : undefined));
    function fileSymbolIfFileSymbolExportEqualsContainer(d: Declaration) {
      return container && getFileSymbolIfFileSymbolExportEqualsContainer(d, container);
    }
  }
  getExportSymbolOfValueSymbolIfExported(): Symbol;
  getExportSymbolOfValueSymbolIfExported(): Symbol | undefined;
  getExportSymbolOfValueSymbolIfExported(): Symbol | undefined {
    return ((this.flags & qt.SymbolFlags.ExportValue) !== 0 ? this.exportSymbol : this)?.qf.get.mergedSymbol();
  }
  symbolIsValue() {
    return !!(this.flags & qt.SymbolFlags.Value || (this.flags & qt.SymbolFlags.Alias && this.resolveAlias().flags & qt.SymbolFlags.Value && !this.getTypeOnlyAliasDeclaration()));
  }
  isPropertyOrMethodDeclarationSymbol() {
    if (this.declarations && this.declarations.length) {
      for (const declaration of this.declarations) {
        switch (declaration.kind) {
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
  needsQualification(enclosingDeclaration: Node | undefined, meaning: qt.SymbolFlags) {
    let qualify = false;
    forEachSymbolTableInScope(enclosingDeclaration, (symbolTable) => {
      let symbolFromSymbolTable = symbolTable.get(this.escName)?.qf.get.mergedSymbol();
      if (!symbolFromSymbolTable) return false;
      if (symbolFromSymbolTable === this) return true;
      symbolFromSymbolTable =
        symbolFromSymbolTable.flags & qt.SymbolFlags.Alias && !getDeclarationOfKind(symbolFromSymbolTable, Syntax.ExportSpecifier) ? symbolFromSymbolTable.resolveAlias() : symbolFromSymbolTable;
      if (symbolFromSymbolTable.flags & meaning) {
        qualify = true;
        return true;
      }
      return false;
    });
    return qualify;
  }
  isTypeSymbolAccessible(enclosingDeclaration?: Node) {
    const a = this.isSymbolAccessible(enclosingDeclaration, qt.SymbolFlags.Type, false);
    return a.accessibility === SymbolAccessibility.Accessible;
  }
  isValueSymbolAccessible(enclosingDeclaration?: Node) {
    const a = this.isSymbolAccessible(enclosingDeclaration, qt.SymbolFlags.Value, false);
    return a.accessibility === SymbolAccessibility.Accessible;
  }
  symbolValueDeclarationIsContextSensitive() {
    const v = this.valueDeclaration;
    return v && qf.is.expression(v) && !qf.is.contextSensitive(v);
  }
  serializeSymbol(isPrivate: boolean, propertyAsAlias: boolean) {
    const s = this.qf.get.mergedSymbol();
    if (visitedSymbols.has('' + s.getId())) return;
    visitedSymbols.set('' + s.getId(), true);
    const skip = !isPrivate;
    if (skip || (!!length(this.declarations) && some(this.declarations, (d) => !!qc.findAncestor(d, (n) => n === enclosingDeclaration)))) {
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
      !!(this.flags & qt.SymbolFlags.ExportDoesNotSupportDefaultModifier || (this.flags & qt.SymbolFlags.Function && length(qf.get.propertiesOfType(this.qf.get.typeOfSymbol())))) &&
      !(this.flags & qt.SymbolFlags.Alias);
    if (needsPostExportDefault) isPrivate = true;
    const modifierFlags = (!isPrivate ? ModifierFlags.Export : 0) | (isDefault && !needsPostExportDefault ? ModifierFlags.Default : 0);
    const isConstMergedWithNS =
      this.flags & qt.SymbolFlags.Module &&
      this.flags & (qt.SymbolFlags.BlockScopedVariable | qt.SymbolFlags.FunctionScopedVariable | qt.SymbolFlags.Property) &&
      this.escName !== InternalSymbol.ExportEquals;
    const isConstMergedWithNSPrintableAsSignatureMerge = isConstMergedWithNS && isTypeRepresentableAsFunctionNamespaceMerge(this.qf.get.typeOfSymbol(), this);
    if (this.flags & (qt.SymbolFlags.Function | qt.SymbolFlags.Method) || isConstMergedWithNSPrintableAsSignatureMerge)
      serializeAsFunctionNamespaceMerge(this.qf.get.typeOfSymbol(), this, getInternalSymbol(symbolName), modifierFlags);
    if (this.flags & qt.SymbolFlags.TypeAlias) this.serializeTypeAlias(symbolName, modifierFlags);
    if (
      this.flags & (qt.SymbolFlags.BlockScopedVariable | qt.SymbolFlags.FunctionScopedVariable | qt.SymbolFlags.Property) &&
      this.escName !== InternalSymbol.ExportEquals &&
      !(this.flags & qt.SymbolFlags.Prototype) &&
      !(this.flags & qt.SymbolFlags.Class) &&
      !isConstMergedWithNSPrintableAsSignatureMerge
    ) {
      this.serializeVariableOrProperty(symbolName, isPrivate, needsPostExportDefault, propertyAsAlias, modifierFlags);
    }
    if (this.flags & qt.SymbolFlags.Enum) this.serializeEnum(symbolName, modifierFlags);
    if (this.flags & qt.SymbolFlags.Class) {
      if (this.flags & qt.SymbolFlags.Property && this.valueDeclaration.parent.kind === Syntax.BinaryExpression && qf.is.kind(qc.ClassExpression, this.valueDeclaration.parent.right))
        this.serializeAsAlias(this.getInternalSymbol(symbolName), modifierFlags);
      else {
        this.serializeAsClass(this.getInternalSymbol(symbolName), modifierFlags);
      }
    }
    if ((this.flags & (qt.SymbolFlags.ValueModule | qt.SymbolFlags.NamespaceModule) && (!isConstMergedWithNS || isTypeOnlyNamespace(symbol))) || isConstMergedWithNSPrintableAsSignatureMerge)
      this.serializeModule(symbolName, modifierFlags);
    if (this.flags & qt.SymbolFlags.Interface) this.serializeInterface(symbolName, modifierFlags);
    if (this.flags & qt.SymbolFlags.Alias) this.serializeAsAlias(this.getInternalSymbol(symbolName), modifierFlags);
    if (this.flags & qt.SymbolFlags.Property && this.escName === InternalSymbol.ExportEquals) serializeMaybeAliasAssignment(symbol);
    if (this.flags & qt.SymbolFlags.ExportStar) {
      for (const node of this.declarations) {
        const resolvedModule = resolveExternalModuleName(node, (node as ExportDeclaration).moduleSpecifier!);
        if (!resolvedModule) continue;
        addResult(new qc.ExportDeclaration(undefined, undefined, undefined, qc.asLiteral(getSpecifierForModuleSymbol(resolvedModule, context))), ModifierFlags.None);
      }
    }
    if (needsPostExportDefault) addResult(new qc.ExportAssignment(undefined, undefined, false, new Identifier(this.getInternalSymbol(symbolName))), ModifierFlags.None);
  }
  includePrivateSymbol() {
    if (some(this.declarations, qf.is.parameterDeclaration)) return;
    Debug.assertIsDefined(deferredPrivates);
    getUnusedName(qy.get.unescUnderscores(this.escName), this);
    deferredPrivates.set('' + this.getId(), this);
  }
  serializeTypeAlias(symbolName: string, modifierFlags: ModifierFlags) {
    const aliasType = this.getDeclaredTypeOfTypeAlias();
    const typeParams = this.getLinks().typeParameters;
    const typeParamDecls = map(typeParams, (p) => typeParameterToDeclaration(p, context));
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
    const localParams = this.getLocalTypeParametersOfClassOrInterfaceOrTypeAlias();
    const typeParamDecls = map(localParams, (p) => typeParameterToDeclaration(p, context));
    const baseTypes = getBaseTypes(interfaceType);
    const baseType = length(baseTypes) ? getIntersectionType(baseTypes) : undefined;
    const members = flatMap<Symbol, TypeElem>(qf.get.propertiesOfType(interfaceType), (p) => serializePropertySymbolForInterface(p, baseType));
    const callSignatures = serializeSignatures(SignatureKind.Call, interfaceType, baseType, Syntax.CallSignature) as CallSignatureDeclaration[];
    const constructSignatures = serializeSignatures(SignatureKind.Construct, interfaceType, baseType, Syntax.ConstructSignature) as ConstructSignatureDeclaration[];
    const indexSignatures = serializeIndexSignatures(interfaceType, baseType);
    const heritageClauses = !length(baseTypes)
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
    return !this.exports ? [] : filter(arrayFrom(this.exports.values()), isNamespaceMember);
  }
  isTypeOnlyNamespace() {
    return every(this.getNamespaceMembersForSerialization(), (m) => !(m.resolveSymbol().flags & qt.SymbolFlags.Value));
  }
  serializeModule(symbolName: string, modifierFlags: ModifierFlags) {
    const members = this.getNamespaceMembersForSerialization();
    const locationMap = arrayToMultiMap(members, (m) => (m.parent && m.parent === this ? 'real' : 'merged'));
    const realMembers = locationMap.get('real') || empty;
    const mergedMembers = locationMap.get('merged') || empty;
    if (length(realMembers)) {
      const localName = this.getInternalSymbol(symbolName);
      serializeAsNamespaceDeclaration(realMembers, localName, modifierFlags, !!(this.flags & (qt.SymbolFlags.Function | qt.SymbolFlags.Assignment)));
    }
    if (length(mergedMembers)) {
      const containingFile = context.enclosingDeclaration.sourceFile;
      const localName = this.getInternalSymbol(symbolName);
      const nsBody = new qc.ModuleBlock([
        new qc.ExportDeclaration(
          undefined,
          undefined,
          new qc.NamedExports(
            mapDefined(
              filter(mergedMembers, (n) => n.escName !== InternalSymbol.ExportEquals),
              (s) => {
                const name = qy.get.unescUnderscores(s.escName);
                const localName = getInternalSymbol(s, name);
                const aliasDecl = s.declarations && s.getDeclarationOfAliasSymbol();
                if (containingFile && (aliasDecl ? containingFile !== aliasDecl.sourceFile : !some(s.declarations, (d) => d.sourceFile === containingFile))) {
                  context.tracker?.reportNonlocalAugmentation?.(containingFile, symbol, s);
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
          filter(qf.get.propertiesOfType(this.qf.get.typeOfSymbol()), (p) => !!(p.flags & qt.SymbolFlags.EnumMember)),
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
      if (!(this.flags & qt.SymbolFlags.Function) && isTypeRepresentableAsFunctionNamespaceMerge(type, symbol)) serializeAsFunctionNamespaceMerge(type, symbol, localName, modifierFlags);
      else {
        const flags = !(this.flags & qt.SymbolFlags.BlockScopedVariable) ? undefined : isConstVariable(symbol) ? NodeFlags.Const : NodeFlags.Let;
        const name = needsPostExportDefault || !(this.flags & qt.SymbolFlags.Property) ? localName : getUnusedName(localName, symbol);
        let textRange: Node | undefined = this.declarations && find(this.declarations, (d) => d.kind === Syntax.VariableDeclaration);
        if (textRange && textRange.parent.kind === Syntax.VariableDeclarationList && textRange.parent.declarations.length === 1) textRange = textRange.parent.parent;
        const statement = setRange(
          new qc.VariableStatement(
            undefined,
            new qc.VariableDeclarationList([new qc.VariableDeclaration(name, serializeTypeForDeclaration(context, type, symbol, enclosingDeclaration, includePrivateSymbol, bundled))], flags)
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
    if (verbatimTargetName === InternalSymbol.ExportEquals && (compilerOptions.esModuleInterop || compilerOptions.allowSyntheticDefaultImports)) verbatimTargetName = InternalSymbol.Default;
    const targetName = getInternalSymbol(target, verbatimTargetName);
    includePrivateSymbol(target);
    switch (node.kind) {
      case Syntax.ImportEqualsDeclaration:
        const isLocalImport = !(target.flags & qt.SymbolFlags.ValueModule);
        addResult(
          new qc.ImportEqualsDeclaration(
            undefined,
            undefined,
            new Identifier(localName),
            isLocalImport ? symbolToName(target, context, qt.SymbolFlags.All, false) : new qc.ExternalModuleReference(qc.asLiteral(getSpecifierForModuleSymbol(symbol, context)))
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
        const specifier = (node.parent.parent as ExportDeclaration).moduleSpecifier;
        serializeExportSpecifier(
          qy.get.unescUnderscores(this.escName),
          specifier ? verbatimTargetName : targetName,
          specifier && qf.is.stringLiteralLike(specifier) ? qc.asLiteral(specifier.text) : undefined
        );
        break;
      case Syntax.ExportAssignment:
        serializeMaybeAliasAssignment(symbol);
        break;
      case Syntax.BinaryExpression:
      case Syntax.PropertyAccessExpression:
        if (this.escName === InternalSymbol.Default || this.escName === InternalSymbol.ExportEquals) serializeMaybeAliasAssignment(symbol);
        else {
          serializeExportSpecifier(localName, targetName);
        }
        break;
      default:
        return Debug.failBadSyntax(node, 'Unhandled alias declaration kind in symbol serializer!');
    }
  }
  serializeMaybeAliasAssignment() {
    if (this.flags & qt.SymbolFlags.Prototype) return;
    const name = qy.get.unescUnderscores(this.escName);
    const isExportEquals = name === InternalSymbol.ExportEquals;
    const isDefault = name === InternalSymbol.Default;
    const isExportAssignment = isExportEquals || isDefault;
    const aliasDecl = this.declarations && this.getDeclarationOfAliasSymbol();
    const target = aliasDecl && getTargetOfAliasDeclaration(aliasDecl, true);
    if (target && length(target.declarations) && some(target.declarations, (d) => d.sourceFile === enclosingDeclaration.sourceFile)) {
      const expr = isExportAssignment
        ? qf.get.exportAssignmentExpression(aliasDecl as ExportAssignment | BinaryExpression)
        : qf.get.propertyAssignmentAliasLikeExpression(aliasDecl as ShorthandPropertyAssignment | PropertyAssignment | PropertyAccessExpression);
      const first = qf.is.entityNameExpression(expr) ? getFirstNonModuleExportsIdentifier(expr) : undefined;
      const referenced = first && resolveEntityName(first, qt.SymbolFlags.All, true, true, enclosingDeclaration);
      if (referenced || target) includePrivateSymbol(referenced || target);
      const oldTrack = context.tracker.trackSymbol;
      context.tracker.trackSymbol = noop;
      if (isExportAssignment) results.push(new qc.ExportAssignment(undefined, undefined, isExportEquals, symbolToExpression(target, context, qt.SymbolFlags.All)));
      else {
        if (first === expr) serializeExportSpecifier(name, idText(first));
        else if (expr.kind === Syntax.ClassExpression) {
          serializeExportSpecifier(name, getInternalSymbol(target, target.name));
        } else {
          const varName = getUnusedName(name, symbol);
          addResult(new qc.ImportEqualsDeclaration(undefined, undefined, new Identifier(varName), symbolToName(target, context, qt.SymbolFlags.All, false)), ModifierFlags.None);
          serializeExportSpecifier(name, varName);
        }
      }
      context.tracker.trackSymbol = oldTrack;
    } else {
      const varName = getUnusedName(name, symbol);
      const typeToSerialize = qf.get.widenedType(qf.get.typeOfSymbol(qf.get.mergedSymbol(symbol)));
      if (isTypeRepresentableAsFunctionNamespaceMerge(typeToSerialize, symbol))
        serializeAsFunctionNamespaceMerge(typeToSerialize, symbol, varName, isExportAssignment ? ModifierFlags.None : ModifierFlags.Export);
      else {
        const statement = new qc.VariableStatement(
          undefined,
          new qc.VariableDeclarationList(
            [new qc.VariableDeclaration(varName, serializeTypeForDeclaration(context, typeToSerialize, symbol, enclosingDeclaration, includePrivateSymbol, bundled))],
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
  qf.is.constructorDeclaredProperty() {
    if (this.valueDeclaration && this.valueDeclaration.kind === Syntax.BinaryExpression) {
      const ls = this.getLinks();
      if (ls.qf.is.constructorDeclaredProperty === undefined) {
        ls.qf.is.constructorDeclaredProperty =
          !!getDeclaringConstructor(symbol) &&
          every(
            this.declarations,
            (declaration) =>
              declaration.kind === Syntax.BinaryExpression &&
              qf.get.assignmentDeclarationKind(declaration) === AssignmentDeclarationKind.ThisProperty &&
              (declaration.left.kind !== Syntax.ElemAccessExpression || qf.is.stringOrNumericLiteralLike((<ElemAccessExpression>declaration.left).argumentExpression)) &&
              !getAnnotatedTypeForAssignmentDeclaration(undefined, declaration, symbol, declaration)
          );
      }
      return ls.qf.is.constructorDeclaredProperty;
    }
    return false;
  }
  qf.is.autoTypedProperty() {
    const v = this.valueDeclaration;
    return v && v.kind === Syntax.PropertyDeclaration && !get.effectiveTypeAnnotationNode(v) && !v.initer && (noImplicitAny || qf.is.inJSFile(v));
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
  getTypeOfVariableOrParameterOrProperty(): Type {
    const ls = this.getLinks();
    if (!ls.type) {
      const t = getTypeOfVariableOrParameterOrPropertyWorker(symbol);
      if (!ls.type) ls.type = t;
    }
    return ls.type;
  }
  getTypeOfVariableOrParameterOrPropertyWorker() {
    if (symbol.flags & qt.SymbolFlags.Prototype) return getTypeOfPrototypeProperty(symbol);
    if (symbol === requireSymbol) return anyType;
    if (symbol.flags & qt.SymbolFlags.ModuleExports) {
      const fileSymbol = qf.get.symbolOfNode(symbol.valueDeclaration.sourceFile);
      const members = new SymbolTable();
      members.set('exports' as qu.__String, fileSymbol);
      return createAnonymousType(symbol, members, empty, empty, undefined, undefined);
    }
    const declaration = symbol.valueDeclaration;
    if (qf.is.catchClauseVariableDeclarationOrBindingElem(declaration)) return anyType;
    if (declaration.kind === Syntax.SourceFile && qf.is.jsonSourceFile(declaration)) {
      if (!declaration.statements.length) return emptyObjectType;
      return qf.get.widenedType(qf.get.widenedLiteralType(check.expression(declaration.statements[0].expression)));
    }
    if (!pushTypeResolution(symbol, TypeSystemPropertyName.Type)) {
      if (symbol.flags & qt.SymbolFlags.ValueModule && !(symbol.flags & qt.SymbolFlags.Assignment)) return this.getTypeOfFuncClassEnumModule();
      return reportCircularityError(symbol);
    }
    let type: Type | undefined;
    if (declaration.kind === Syntax.ExportAssignment) type = widenTypeForVariableLikeDeclaration(check.expressionCached((<ExportAssignment>declaration).expression), declaration);
    else if (
      declaration.kind === Syntax.BinaryExpression ||
      (qf.is.inJSFile(declaration) &&
        (declaration.kind === Syntax.CallExpression ||
          ((declaration.kind === Syntax.PropertyAccessExpression || qf.is.bindableStaticElemAccessExpression(declaration)) && declaration.parent.kind === Syntax.BinaryExpression)))
    ) {
      type = qf.get.widenedTypeForAssignmentDeclaration(symbol);
    } else if (
      qc.isDoc.propertyLikeTag(declaration) ||
      declaration.kind === Syntax.PropertyAccessExpression ||
      declaration.kind === Syntax.ElemAccessExpression ||
      declaration.kind === Syntax.Identifier ||
      qf.is.stringLiteralLike(declaration) ||
      declaration.kind === Syntax.NumericLiteral ||
      declaration.kind === Syntax.ClassDeclaration ||
      declaration.kind === Syntax.FunctionDeclaration ||
      (declaration.kind === Syntax.MethodDeclaration && !is.objectLiteralMethod(declaration)) ||
      declaration.kind === Syntax.MethodSignature ||
      declaration.kind === Syntax.SourceFile
    ) {
      if (symbol.flags & (qt.SymbolFlags.Function | qt.SymbolFlags.Method | qt.SymbolFlags.Class | qt.SymbolFlags.Enum | qt.SymbolFlags.ValueModule)) return this.getTypeOfFuncClassEnumModule();
      type = declaration.parent.kind === Syntax.BinaryExpression ? qf.get.widenedTypeForAssignmentDeclaration(symbol) : tryGetTypeFromEffectiveTypeNode(declaration) || anyType;
    } else if (declaration.kind === Syntax.PropertyAssignment) {
      type = tryGetTypeFromEffectiveTypeNode(declaration) || check.propertyAssignment(declaration);
    } else if (declaration.kind === Syntax.JsxAttribute) {
      type = tryGetTypeFromEffectiveTypeNode(declaration) || check.jsxAttribute(declaration);
    } else if (declaration.kind === Syntax.ShorthandPropertyAssignment) {
      type = tryGetTypeFromEffectiveTypeNode(declaration) || check.expressionForMutableLocation(declaration.name, CheckMode.Normal);
    } else if (qf.is.objectLiteralMethod(declaration)) {
      type = tryGetTypeFromEffectiveTypeNode(declaration) || check.objectLiteralMethod(declaration, CheckMode.Normal);
    } else if (
      declaration.kind === Syntax.ParameterDeclaration ||
      declaration.kind === Syntax.PropertyDeclaration ||
      declaration.kind === Syntax.PropertySignature ||
      declaration.kind === Syntax.VariableDeclaration ||
      declaration.kind === Syntax.BindingElem
    ) {
      type = qf.get.widenedTypeForVariableLikeDeclaration(declaration, true);
    } else if (declaration.kind === Syntax.EnumDeclaration) {
      type = this.getTypeOfFuncClassEnumModule();
    } else if (declaration.kind === Syntax.EnumMember) {
      type = this.getTypeOfEnumMember();
    } else if (qf.is.accessor(declaration)) {
      type = resolveTypeOfAccessors(symbol);
    } else return qu.fail('Unhandled declaration kind! ' + qc.format.syntax(declaration.kind) + ' for ' + qc.format.symbol(symbol));
    if (!popTypeResolution()) {
      if (symbol.flags & qt.SymbolFlags.ValueModule && !(symbol.flags & qt.SymbolFlags.Assignment)) return this.getTypeOfFuncClassEnumModule();
      return reportCircularityError(symbol);
    }
    return type;
  }
  getTypeOfAccessors(): Type {
    const ls = this.getLinks();
    return ls.type || (ls.type = getTypeOfAccessorsWorker(symbol));
  }
  getTypeOfAccessorsWorker(): Type {
    if (!pushTypeResolution(this, TypeSystemPropertyName.Type)) return errorType;
    let type = resolveTypeOfAccessors(this);
    if (!popTypeResolution()) {
      type = anyType;
      if (noImplicitAny) {
        const getter = getDeclarationOfKind<AccessorDeclaration>(this, Syntax.GetAccessor);
        error(
          getter,
          qd._0_implicitly_has_return_type_any_because_it_does_not_have_a_return_type_annotation_and_is_referenced_directly_or_indirectly_in_one_of_its_return_expressions,
          this.symbolToString()
        );
      }
    }
    return type;
  }
  resolveTypeOfAccessors() {
    const getter = getDeclarationOfKind<AccessorDeclaration>(this, Syntax.GetAccessor);
    const setter = getDeclarationOfKind<AccessorDeclaration>(this, Syntax.SetAccessor);
    if (getter && qf.is.inJSFile(getter)) {
      const docType = getTypeForDeclarationFromDocComment(getter);
      if (docType) return docType;
    }
    const getterReturnType = getAnnotatedAccessorType(getter);
    if (getterReturnType) return getterReturnType;
    const setterParameterType = getAnnotatedAccessorType(setter);
    if (setterParameterType) return setterParameterType;
    if (getter && getter.body) return getReturnTypeFromBody(getter);
    if (setter) {
      if (!isPrivateWithinAmbient(setter))
        errorOrSuggestion(noImplicitAny, setter, qd.Property_0_implicitly_has_type_any_because_its_set_accessor_lacks_a_parameter_type_annotation, this.symbolToString());
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
    const declaration = symbol.valueDeclaration;
    if (symbol.flags & qt.SymbolFlags.Module && isShorthandAmbientModuleSymbol(symbol)) return anyType;
    else if (declaration && (declaration.kind === Syntax.BinaryExpression || (qf.is.accessExpression(declaration) && declaration.parent.kind === Syntax.BinaryExpression)))
      return qf.get.widenedTypeForAssignmentDeclaration(symbol);
    else if (symbol.flags & qt.SymbolFlags.ValueModule && declaration && declaration.kind === Syntax.SourceFile && declaration.commonJsModuleIndicator) {
      const resolvedModule = resolveExternalModuleSymbol(symbol);
      if (resolvedModule !== symbol) {
        if (!pushTypeResolution(symbol, TypeSystemPropertyName.Type)) return errorType;
        const exportEquals = qf.get.mergedSymbol(symbol.exports!.get(InternalSymbol.ExportEquals)!);
        const type = qf.get.widenedTypeForAssignmentDeclaration(exportEquals, exportEquals === resolvedModule ? undefined : resolvedModule);
        if (!popTypeResolution()) return reportCircularityError(symbol);
        return type;
      }
    }
    const type = createObjectType(ObjectFlags.Anonymous, symbol);
    if (symbol.flags & qt.SymbolFlags.Class) {
      const baseTypeVariable = getBaseTypeVariableOfClass(symbol);
      return baseTypeVariable ? getIntersectionType([type, baseTypeVariable]) : type;
    }
    return strictNullChecks && symbol.flags & qt.SymbolFlags.Optional ? getOptionalType(type) : type;
  }
  getTypeOfEnumMember(): Type {
    const ls = this.getLinks();
    return ls.type || (ls.type = getDeclaredTypeOfEnumMember(symbol));
  }
  getTypeOfAlias(): Type {
    const ls = this.getLinks();
    if (!ls.type) {
      const targetSymbol = this.resolveAlias();
      ls.type = targetSymbol.flags & qt.SymbolFlags.Value ? qf.get.typeOfSymbol(targetSymbol) : errorType;
    }
    return ls.type;
  }
  getTypeOfInstantiatedSymbol(): Type {
    const ls = this.getLinks();
    if (!ls.type) {
      if (!pushTypeResolution(symbol, TypeSystemPropertyName.Type)) return (ls.type = errorType);
      let type = instantiateType(qf.get.typeOfSymbol(ls.target!), ls.mapper);
      if (!popTypeResolution()) type = reportCircularityError(symbol);
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
    if (noImplicitAny && (declaration.kind !== Syntax.Parameter || (<HasIniter>declaration).initer)) {
      error(this.valueDeclaration, qd._0_implicitly_has_type_any_because_it_does_not_have_a_type_annotation_and_is_referenced_directly_or_indirectly_in_its_own_initer, this.symbolToString());
    }
    return anyType;
  }
  qf.get.typeOfSymbolWithDeferredType() {
    const ls = this.getLinks();
    if (!ls.type) {
      Debug.assertIsDefined(ls.deferralParent);
      Debug.assertIsDefined(ls.deferralConstituents);
      ls.type = ls.deferralParent.flags & qt.TypeFlags.Union ? qf.get.unionType(ls.deferralConstituents) : getIntersectionType(ls.deferralConstituents);
    }
    return ls.type;
  }
  qf.get.typeOfSymbol(): Type {
    const f = this.getCheckFlags();
    if (f & qt.CheckFlags.DeferredType) return this.qf.get.typeOfSymbolWithDeferredType();
    if (f & qt.CheckFlags.Instantiated) return this.getTypeOfInstantiatedSymbol();
    if (f & qt.CheckFlags.Mapped) return getTypeOfMappedSymbol(this as MappedSymbol);
    if (f & qt.CheckFlags.ReverseMapped) return getTypeOfReverseMappedSymbol(this as ReverseMappedSymbol);
    if (this.flags & (qt.SymbolFlags.Variable | qt.SymbolFlags.Property)) return this.getTypeOfVariableOrParameterOrProperty();
    if (this.flags & (qt.SymbolFlags.Function | qt.SymbolFlags.Method | qt.SymbolFlags.Class | qt.SymbolFlags.Enum | qt.SymbolFlags.ValueModule)) return this.getTypeOfFuncClassEnumModule();
    if (this.flags & qt.SymbolFlags.EnumMember) return this.getTypeOfEnumMember();
    if (this.flags & qt.SymbolFlags.Accessor) return this.getTypeOfAccessors();
    if (this.flags & qt.SymbolFlags.Alias) return this.getTypeOfAlias();
    return errorType;
  }
  getOuterTypeParametersOfClassOrInterface(): TypeParameter[] | undefined {
    const d = this.flags & qt.SymbolFlags.Class ? this.valueDeclaration : this.getDeclarationOfKind(Syntax.InterfaceDeclaration)!;
    qu.assert(!!d, 'Class was missing valueDeclaration -OR- non-class had no interface declarations');
    return getOuterTypeParameters(d);
  }
  getLocalTypeParametersOfClassOrInterfaceOrTypeAlias(): TypeParameter[] | undefined {
    let r: TypeParameter[] | undefined;
    for (const d of this.declarations ?? []) {
      if (d.kind === Syntax.InterfaceDeclaration || d.kind === Syntax.ClassDeclaration || d.kind === Syntax.ClassExpression || qf.is.jsConstructor(d) || qf.is.typeAlias(d)) {
        const d2 = d as InterfaceDeclaration | TypeAliasDeclaration | DocTypedefTag | DocCallbackTag;
        r = appendTypeParameters(r, qf.get.effectiveTypeParameterDeclarations(d2));
      }
    }
    return r;
  }
  getTypeParametersOfClassOrInterface(): TypeParameter[] | undefined {
    return concatenate(this.getOuterTypeParametersOfClassOrInterface(), this.getLocalTypeParametersOfClassOrInterfaceOrTypeAlias());
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
                const s = resolveEntityName(n.expression, qt.SymbolFlags.Type, true);
                if (!s || !(s.flags & qt.SymbolFlags.Interface) || s.getDeclaredTypeOfClassOrInterface().thisType) return false;
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
      const kind = this.flags & qt.SymbolFlags.Class ? ObjectFlags.Class : ObjectFlags.Interface;
      const merged = mergeJSSymbols(this, getAssignedClassSymbol(this.valueDeclaration));
      if (merged) symbol = ls = merged;
      const type = (originalLinks.declaredType = ls.declaredType = <InterfaceType>createObjectType(kind, this));
      const outerTypeParameters = this.getOuterTypeParametersOfClassOrInterface();
      const localTypeParameters = this.getLocalTypeParametersOfClassOrInterfaceOrTypeAlias();
      if (outerTypeParameters || localTypeParameters || kind === ObjectFlags.Class || !isThislessInterface(this)) {
        type.objectFlags |= ObjectFlags.Reference;
        type.typeParameters = concatenate(outerTypeParameters, localTypeParameters);
        type.outerTypeParameters = outerTypeParameters;
        type.localTypeParameters = localTypeParameters;
        (<GenericType>type).instantiations = new qu.QMap<TypeReference>();
        (<GenericType>type).instantiations.set(getTypeListId(type.typeParameters), <GenericType>type);
        (<GenericType>type).target = <GenericType>type;
        (<GenericType>type).resolvedTypeArguments = type.typeParameters;
        type.thisType = createTypeParameter(this);
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
        const ps = this.getLocalTypeParametersOfClassOrInterfaceOrTypeAlias();
        if (ps) {
          ls.typeParameters = ps;
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
  getDeclaredTypeOfTypeParameter(): TypeParameter {
    const ls = this.getLinks();
    return ls.declaredType || (ls.declaredType = createTypeParameter(this));
  }
  getDeclaredTypeOfAlias(): Type {
    const ls = this.getLinks();
    return ls.declaredType || (ls.declaredType = this.resolveAlias().getDeclaredTypeOfSymbol());
  }
  getDeclaredTypeOfSymbol(): Type {
    return this.tryGetDeclaredTypeOfSymbol() || errorType;
  }
  tryGetDeclaredTypeOfSymbol(): Type | undefined {
    if (this.flags & (qt.SymbolFlags.Class | qt.SymbolFlags.Interface)) return this.getDeclaredTypeOfClassOrInterface();
    if (this.flags & qt.SymbolFlags.TypeAlias) return this.getDeclaredTypeOfTypeAlias();
    if (this.flags & qt.SymbolFlags.TypeParameter) return this.getDeclaredTypeOfTypeParameter();
    if (this.flags & qt.SymbolFlags.Enum) return this.getDeclaredTypeOfEnum();
    if (this.flags & qt.SymbolFlags.EnumMember) return this.getDeclaredTypeOfEnumMember();
    if (this.flags & qt.SymbolFlags.Alias) return this.getDeclaredTypeOfAlias();
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
    return this.flags & qt.SymbolFlags.LateBindingContainer ? getResolvedMembersOrExportsOfSymbol(this, MembersOrExportsResolutionKind.resolvedMembers) : this.members || emptySymbols;
  }
  qf.get.lateBoundSymbol(): Symbol {
    if (this.flags & qt.SymbolFlags.ClassMember && this.escName === InternalSymbol.Computed) {
      const ls = this.getLinks();
      if (!ls.lateSymbol && some(this.declarations, hasLateBindableName)) {
        const parent = this.parent?.qf.get.mergedSymbol()!;
        if (some(this.declarations, hasStaticModifier)) parent.getExportsOfSymbol();
        else parent.getMembersOfSymbol();
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
        if (n.parameters.length === 1) {
          const p = n.parameters[0];
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
    return getVariancesWorker(ls.typeParameters, ls, (_links, param, marker) => {
      const type = qf.get.typeAliasInstantiation(this, instantiateTypes(ls.typeParameters!, makeUnaryTypeMapper(param, marker)));
      type.aliasTypeArgumentsContainsMarker = true;
      return type;
    });
  }
  isParameterAssigned() {
    const f = qf.get.rootDeclaration(this.valueDeclaration).parent as FunctionLikeDeclaration;
    const ls = getNodeLinks(f);
    if (!(ls.flags & NodeCheckFlags.AssignmentsMarked)) {
      ls.flags |= NodeCheckFlags.AssignmentsMarked;
      if (!hasParentWithAssignmentsMarked(f)) markParameterAssignments(f);
    }
    return this.isAssigned || false;
  }
  isConstVariable() {
    return this.flags & qt.SymbolFlags.Variable && (getDeclarationNodeFlagsFromSymbol(this) & NodeFlags.Const) !== 0 && this.qf.get.typeOfSymbol() !== autoArrayType;
  }
  isCircularMappedProperty() {
    return !!(this.getCheckFlags() & qt.CheckFlags.Mapped && !(this as MappedType).type && findResolutionCycleStartIndex(this, TypeSystemPropertyName.Type) >= 0);
  }
  getImmediateAliasedSymbol(): Symbol | undefined {
    qu.assert((this.flags & qt.SymbolFlags.Alias) !== 0, 'Should only get Alias here.');
    const ls = this.getLinks();
    if (!ls.immediateTarget) {
      const node = this.getDeclarationOfAliasSymbol();
      if (!node) return qu.fail();
      ls.immediateTarget = getTargetOfAliasDeclaration(node, true);
    }
    return ls.immediateTarget;
  }
  isPrototypeProperty() {
    if (this.flags & qt.SymbolFlags.Method || this.getCheckFlags() & qt.CheckFlags.SyntheticMethod) return true;
    if (qf.is.inJSFile(this.valueDeclaration)) {
      const p = this.valueDeclaration?.parent;
      return p && p.kind === Syntax.BinaryExpression && qf.get.assignmentDeclarationKind(p) === AssignmentDeclarationKind.PrototypeProperty;
    }
  }
  symbolHasNonMethodDeclaration() {
    return !!forEachProperty(this, (p) => !(p.flags & qt.SymbolFlags.Method));
  }
  getTypeOfParameter() {
    const t = this.qf.get.typeOfSymbol();
    if (strictNullChecks) {
      const d = this.valueDeclaration;
      if (d && qf.is.withIniter(d)) return getOptionalType(t);
    }
    return t;
  }
  isReadonlySymbol() {
    return !!(
      this.getCheckFlags() & qt.CheckFlags.Readonly ||
      (this.flags & qt.SymbolFlags.Property && this.getDeclarationModifierFlagsFromSymbol() & ModifierFlags.Readonly) ||
      (this.flags & qt.SymbolFlags.Variable && this.getDeclarationNodeFlagsFromSymbol() & NodeFlags.Const) ||
      (this.flags & qt.SymbolFlags.Accessor && !(this.flags & qt.SymbolFlags.SetAccessor)) ||
      this.flags & qt.SymbolFlags.EnumMember ||
      some(this.declarations, isReadonlyAssignmentDeclaration)
    );
  }
  isConstEnumSymbol() {
    return (this.flags & qt.SymbolFlags.ConstEnum) !== 0;
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
    const isConstructor = (this.flags & qt.SymbolFlags.Constructor) !== 0;
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
    if (hasNonAmbientClass && !isConstructor && this.flags & qt.SymbolFlags.Function) {
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
      check.flagAgreementBetweenOverloads(declarations, bodyDeclaration, flagsToCheck, someNodeFlags, allNodeFlags);
      check.questionTokenAgreementBetweenOverloads(declarations, bodyDeclaration, someHaveQuestionToken, allHaveQuestionToken);
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
  checkTypeParameterListsIdentical() {
    if (this.declarations?.length === 1) return;
    const ls = this.getLinks();
    if (!ls.typeParametersChecked) {
      ls.typeParametersChecked = true;
      const ds = this.getClassOrInterfaceDeclarationsOfSymbol();
      if (!ds || ds.length <= 1) return;
      const t = this.getDeclaredTypeOfSymbol() as InterfaceType;
      if (!areTypeParametersIdentical(ds, t.localTypeParameters!)) {
        const n = this.symbolToString();
        for (const d of ds) {
          error(d.name, qd.All_declarations_of_0_must_have_identical_type_parameters, n);
        }
      }
    }
  }
  getTargetSymbol() {
    return this.getCheckFlags() & qt.CheckFlags.Instantiated ? this.target! : this;
  }
  getClassOrInterfaceDeclarationsOfSymbol() {
    return filter(this.declarations, (d: Declaration): d is ClassDeclaration | InterfaceDeclaration => d.kind === Syntax.ClassDeclaration || d.kind === Syntax.InterfaceDeclaration);
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
    if (this.getCheckFlags() & qt.CheckFlags.Synthetic) return mapDefined(this.getLinks().containingType!.types, (t) => qf.get.propertyOfType(t, this.escName));
    if (this.flags & qt.SymbolFlags.Transient) {
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
    if (this.flags & qt.SymbolFlags.BlockScoped && !is.kind(qc.SourceFile, this.valueDeclaration)) {
      const ls = this.getLinks();
      if (ls.isDeclarationWithCollidingName === undefined) {
        const container = qf.get.enclosingBlockScopeContainer(this.valueDeclaration);
        if (qf.is.statementWithLocals(container) || this.isSymbolOfDestructuredElemOfCatchBinding()) {
          const nodeLinks = getNodeLinks(this.valueDeclaration);
          if (resolveName(container.parent, this.escName, qt.SymbolFlags.Value, undefined, undefined, false)) ls.isDeclarationWithCollidingName = true;
          else if (nodeLinks.flags & NodeCheckFlags.CapturedBlockScopedBinding) {
            const isDeclaredInLoop = nodeLinks.flags & NodeCheckFlags.BlockScopedBindingInLoop;
            const inLoopIniter = qf.is.iterationStatement(container, false);
            const inLoopBodyBlock = container.kind === Syntax.Block && qf.is.iterationStatement(container.parent, false);
            ls.isDeclarationWithCollidingName = !is.blockScopedContainerTopLevel(container) && (!isDeclaredInLoop || (!inLoopIniter && !inLoopBodyBlock));
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
    return !!(target.flags & qt.SymbolFlags.Value) && (compilerOptions.preserveConstEnums || !isConstEnumOrConstEnumOnlyModule(target));
  }
  isConstEnumOrConstEnumOnlyModule() {
    return this.isConstEnumSymbol() || !!this.constEnumOnlyModule;
  }
  getTypeReferenceDirectivesForSymbol(meaning?: qt.SymbolFlags): string[] | undefined {
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
    if (current.valueDeclaration && current.valueDeclaration.kind === Syntax.SourceFile && current.flags & qt.SymbolFlags.ValueModule) return false;
    for (const d of this.declarations) {
      const f = d.sourceFile;
      if (fileToDirective.has(f.path)) return true;
    }
    return false;
  }
  checkSymbolUsageInExpressionContext(name: qu.__String, useSite: Node) {
    if (!is.validTypeOnlyAliasUseSite(useSite)) {
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
  isTypeParameterSymbolDeclaredInContainer(container: Node) {
    for (const d of this.declarations) {
      if (d.kind === Syntax.TypeParameter) {
        const p = d.parent.kind === Syntax.DocTemplateTag ? qc.getDoc.host(d.parent) : d.parent;
        if (p === container) return !(d.parent.kind === Syntax.DocTemplateTag && find((d.parent.parent as Doc).tags!, isDocTypeAlias));
      }
    }
    return false;
  }
  getExportOfModule(specifier: ImportOrExportSpecifier, dontResolveAlias: boolean): Symbol | undefined {
    if (this.flags & qt.SymbolFlags.Module) {
      const name = (specifier.propertyName ?? specifier.name).escapedText;
      const exportSymbol = this.getExportsOfSymbol().get(name);
      const resolved = exportSymbol.resolveSymbol(dontResolveAlias);
      markSymbolOfAliasDeclarationIfTypeOnly(specifier, exportSymbol, resolved, false);
      return resolved;
    }
    return;
  }
  getPropertyOfVariable(name: qu.__String): Symbol | undefined {
    if (this.flags & qt.SymbolFlags.Variable) {
      const typeAnnotation = (<VariableDeclaration>this.valueDeclaration).type;
      if (typeAnnotation) return qf.get.propertyOfType(qf.get.typeFromTypeNode(typeAnnotation), name)?.resolveSymbol();
    }
    return;
  }
  getFullyQualifiedName(containingLocation?: Node): string {
    return this.parent
      ? getFullyQualifiedName(this.parent, containingLocation) + '.' + this.symbolToString()
      : this.symbolToString(containingLocation, undefined, qt.SymbolFormatFlags.DoNotIncludeSymbolChain | qt.SymbolFormatFlags.AllowAnyNodeKind);
  }
  getAliasForSymbolInContainer(container: Symbol) {
    if (container === this.getParentOfSymbol()) return this;
    const exportEquals = container.exports && container.exports.get(InternalSymbol.ExportEquals);
    if (exportEquals && getSymbolIfSameReference(exportEquals, this)) return container;
    const exports = container.getExportsOfSymbol();
    const quick = exports.get(this.escName);
    if (quick && getSymbolIfSameReference(quick, this)) return quick;
    return forEachEntry(exports, (exported) => {
      if (getSymbolIfSameReference(exported, this)) return exported;
    });
  }
  hasVisibleDeclarations(shouldComputeAliasToMakeVisible: boolean): SymbolVisibilityResult | undefined {
    let aliasesToMakeVisible: LateVisibilityPaintedStatement[] | undefined;
    if (
      !every(
        filter(this.declarations, (d) => d.kind !== Syntax.Identifier),
        getIsDeclarationVisible
      )
    ) {
      return;
    }
    return { accessibility: SymbolAccessibility.Accessible, aliasesToMakeVisible };
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
        getNodeLinks(declaration).isVisible = true;
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
        if (name.kind === Syntax.ComputedPropertyName && !(this.getCheckFlags() & qt.CheckFlags.Late)) {
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
class SymbolTable extends SymbolTable<Symbol> {
  getSymbol(symbols: SymbolTable, name: qu.__String, meaning: qt.SymbolFlags): Symbol | undefined {
    if (meaning) {
      const symbol = qf.get.mergedSymbol(symbols.get(name));
      if (symbol) {
        qu.assert((this.getCheckFlags() & qt.CheckFlags.Instantiated) === 0, 'Should never get an instantiated symbol here.');
        if (symbol.flags & meaning) return symbol;
        if (symbol.flags & qt.SymbolFlags.Alias) {
          const target = this.resolveAlias();
          if (target === unknownSymbol || target.flags & meaning) return symbol;
        }
      }
    }
  }
  visitSymbolTable(symbolTable: SymbolTable, suppressNewPrivateContext?: boolean, propertyAsAlias?: boolean) {
    const oldDeferredPrivates = deferredPrivates;
    if (!suppressNewPrivateContext) deferredPrivates = new qu.QMap();
    symbolTable.forEach((s: Symbol) => {
      serializeSymbol(symbol, false, !!propertyAsAlias);
    });
    if (!suppressNewPrivateContext) {
      deferredPrivates!.forEach((s: Symbol) => {
        serializeSymbol(symbol, true, !!propertyAsAlias);
      });
    }
    deferredPrivates = oldDeferredPrivates;
  }
}
