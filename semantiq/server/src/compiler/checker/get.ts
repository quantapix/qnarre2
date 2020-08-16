import { ExpandingFlags, ModifierFlags, Node, NodeFlags, ObjectFlags, SymbolFlags, TypeFlags, VarianceFlags } from './types';
import { Fcheck } from './check';
import { Fhas, Fis } from './groups';
import { qt.Symbol } from './bases';
import { Syntax } from '../syntax';
import * as qc from '../core';
import * as qd from '../diags';
import * as qg from '../debug';
import * as qt from './types';
import * as qu from '../utils';
import * as qy from '../syntax';
export function newGet(f: qt.Frame) {
  interface Frame extends qt.Frame {
    host: qt.TypeCheckerHost;
    typeCount: number;
    totalInstantiationCount: number;
    mergedSymbols: qt.Symbol[];
    check: Fcheck;
    has: Fhas;
    is: Fis;
  }
  const qf = f as Frame;
  interface Fget extends qc.Fget {}
  class Fget {
    //implements qt.CheckerGet {
    links = [] as qt.NodeLinks[];
    get nodeCount() {
      return qu.sum(qf.host.this.sourceFiles(), 'nodeCount');
    }
    get identifierCount() {
      return qu.sum(qf.host.this.sourceFiles(), 'identifierCount');
    }
    get symbolCount() {
      return qu.sum(qf.host.this.sourceFiles(), 'symbolCount') + qt.Symbol.count;
    }
    get typeCount() {
      return qf.typeCount;
    }
    get instantiationCount() {
      return qf.totalInstantiationCount;
    }
    excluded(f: SymbolFlags): SymbolFlags {
      let r: SymbolFlags = 0;
      if (f & SymbolFlags.Alias) r |= SymbolFlags.AliasExcludes;
      if (f & SymbolFlags.BlockScopedVariable) r |= SymbolFlags.BlockScopedVariableExcludes;
      if (f & SymbolFlags.Class) r |= SymbolFlags.ClassExcludes;
      if (f & SymbolFlags.ConstEnum) r |= SymbolFlags.ConstEnumExcludes;
      if (f & SymbolFlags.EnumMember) r |= SymbolFlags.EnumMemberExcludes;
      if (f & SymbolFlags.Function) r |= SymbolFlags.FunctionExcludes;
      if (f & SymbolFlags.FunctionScopedVariable) r |= SymbolFlags.FunctionScopedVariableExcludes;
      if (f & SymbolFlags.GetAccessor) r |= SymbolFlags.GetAccessorExcludes;
      if (f & SymbolFlags.Interface) r |= SymbolFlags.InterfaceExcludes;
      if (f & SymbolFlags.Method) r |= SymbolFlags.MethodExcludes;
      if (f & SymbolFlags.Property) r |= SymbolFlags.PropertyExcludes;
      if (f & SymbolFlags.RegularEnum) r |= SymbolFlags.RegularEnumExcludes;
      if (f & SymbolFlags.SetAccessor) r |= SymbolFlags.SetAccessorExcludes;
      if (f & SymbolFlags.TypeAlias) r |= SymbolFlags.TypeAliasExcludes;
      if (f & SymbolFlags.TypeParam) r |= SymbolFlags.TypeParamExcludes;
      if (f & SymbolFlags.ValueModule) r |= SymbolFlags.ValueModuleExcludes;
      return r;
    }
    mergedSymbol(s: qt.Symbol): qt.Symbol | undefined {
      let r: qt.Symbol;
      return s.mergeId && (r = qf.mergedSymbols[s.mergeId]) ? r : s;
    }
    nodeLinks(n: Node): qt.NodeLinks {
      const i = this.nodeId(n);
      return this.links[i] || (this.links[i] = { flags: 0 } as qt.NodeLinks);
    }
    resolvedSignatureWorker(nIn: qt.CallLikeExpression, nOut: qt.Signature[] | undefined, argc: number | undefined, c: qt.CheckMode): qt.Signature | undefined {
      const n = this.parseTreeOf(nIn, isCallLikeExpression);
      apparentArgCount = argc;
      const res = n ? this.resolvedSignature(n, nOut, c) : undefined;
      apparentArgCount = undefined;
      return res;
    }
    jsxNamespace(location: Node | undefined): qu.__String {
      if (location) {
        const file = location.sourceFile;
        if (file) {
          if (file.localJsxNamespace) return file.localJsxNamespace;
          const jsxPragma = file.pragmas.get('jsx');
          if (jsxPragma) {
            const chosenpragma = qu.qf.is.array(jsxPragma) ? jsxPragma[0] : jsxPragma;
            file.localJsxFactory = qp_parseIsolatedEntityName(chosenpragma.args.factory, languageVersion);
            qf.visit.node(file.localJsxFactory, markAsSynthetic);
            if (file.localJsxFactory) return (file.localJsxNamespace = this.firstIdentifier(file.localJsxFactory).escapedText);
          }
        }
      }
      if (!_jsxNamespace) {
        _jsxNamespace = 'React' as qu.__String;
        if (compilerOpts.jsxFactory) {
          _jsxFactoryEntity = qp_parseIsolatedEntityName(compilerOpts.jsxFactory, languageVersion);
          qf.visit.node(_jsxFactoryEntity, markAsSynthetic);
          if (_jsxFactoryEntity) _jsxNamespace = this.firstIdentifier(_jsxFactoryEntity).escapedText;
        } else if (compilerOpts.reactNamespace) {
          _jsxNamespace = qy.get.escUnderscores(compilerOpts.reactNamespace);
        }
      }
      if (!_jsxFactoryEntity) _jsxFactoryEntity = qt.QualifiedName.create(new qc.Identifier(qy.get.unescUnderscores(_jsxNamespace)), 'qf.create.elem');
      return _jsxNamespace;
      const markAsSynthetic = (n: Node): VisitResult<Node> => {
        n.pos = -1;
        n.end = -1;
        return qf.visit.children(n, markAsSynthetic, nullTrafoContext);
      };
    }
    emitResolver(s: qt.SourceFile, t: qt.CancellationToken) {
      this.diagnostics(s, t);
      return emitResolver;
    }
    symbolsOfParamPropertyDeclaration(d: qt.ParamDeclaration, n: qu.__String): [Symbol, qt.Symbol] {
      const constructorDeclaration = d.parent;
      const classDeclaration = d.parent?.parent;
      const paramSymbol = this.symbol(constructorDeclaration.locals!, n, SymbolFlags.Value);
      const propertySymbol = this.symbol(this.membersOfSymbol(classDeclaration.symbol), n, SymbolFlags.Value);
      if (paramSymbol && propertySymbol) return [paramSymbol, propertySymbol];
      return qu.fail('There should exist two symbols, one as property declaration and one as param declaration');
    }
    entityNameForExtendingInterface(n: Node): qt.EntityNameExpression | undefined {
      switch (n.kind) {
        case Syntax.Identifier:
        case Syntax.PropertyAccessExpression:
          return n.parent ? this.entityNameForExtendingInterface(n.parent) : undefined;
        case Syntax.ExpressionWithTypings:
          if (qf.is.entityNameExpression(n.expression)) return n.expression;
      }
      return;
    }
    anyImportSyntax(n: Node): qt.AnyImportSyntax | undefined {
      switch (n.kind) {
        case Syntax.ImportEqualsDeclaration:
          return n;
        case Syntax.ImportClause:
          return n.parent;
        case Syntax.NamespaceImport:
          return n.parent?.parent;
        case Syntax.ImportSpecifier:
          return n.parent?.parent?.parent;
      }
      return;
    }
    targetOfImportEqualsDeclaration(n: qt.ImportEqualsDeclaration, dontResolveAlias: boolean): qt.Symbol | undefined {
      if (n.moduleReference.kind === Syntax.ExternalModuleReference) {
        const immediate = resolveExternalModuleName(n, this.externalModuleImportEqualsDeclarationExpression(n));
        const resolved = resolveExternalModuleSymbol(immediate);
        markSymbolOfAliasDeclarationIfTypeOnly(n, immediate, resolved, false);
        return resolved;
      }
      const resolved = this.symbolOfPartOfRightHandSideOfImportEquals(n.moduleReference, dontResolveAlias);
      qf.check.andReportErrorForResolvingImportAliasToTypeOnlySymbol(n, resolved);
      return resolved;
    }
    targetOfImportClause(n: qt.ImportClause, dontResolveAlias: boolean): qt.Symbol | undefined {
      const moduleSymbol = resolveExternalModuleName(n, n.parent?.moduleSpecifier);
      if (moduleSymbol) {
        let exportDefaultSymbol: qt.Symbol | undefined;
        if (qf.is.shorthandAmbientModuleSymbol(moduleSymbol)) exportDefaultSymbol = moduleSymbol;
        else {
          exportDefaultSymbol = resolveExportByName(moduleSymbol, InternalSymbol.Default, n, dontResolveAlias);
        }
        const file = qu.find(moduleSymbol.declarations, isSourceFile);
        const hasSyntheticDefault = canHaveSyntheticDefault(file, moduleSymbol, dontResolveAlias);
        if (!exportDefaultSymbol && !hasSyntheticDefault) {
          if (qf.has.exportAssignmentSymbol(moduleSymbol)) {
            const compilerOptionName = moduleKind >= qt.ModuleKind.ES2015 ? 'allowSyntheticDefaultImports' : 'esModuleInterop';
            const exportEqualsSymbol = moduleSymbol.exports!.get(InternalSymbol.ExportEquals);
            const exportAssignment = exportEqualsSymbol!.valueDeclaration;
            const err = error(n.name, qd.msgs.Module_0_can_only_be_default_imported_using_the_1_flag, moduleSymbol.symbolToString(), compilerOptionName);
            addRelatedInfo(
              err,
              qf.create.diagForNode(exportAssignment, qd.msgs.This_module_is_declared_with_using_export_and_can_only_be_used_with_a_default_import_when_using_the_0_flag, compilerOptionName)
            );
          } else {
            reportNonDefaultExport(moduleSymbol, n);
          }
        } else if (hasSyntheticDefault) {
          const resolved = resolveExternalModuleSymbol(moduleSymbol, dontResolveAlias) || moduleSymbol.resolveSymbol(dontResolveAlias);
          markSymbolOfAliasDeclarationIfTypeOnly(n, moduleSymbol, resolved, false);
          return resolved;
        }
        markSymbolOfAliasDeclarationIfTypeOnly(n, exportDefaultSymbol, false);
        return exportDefaultSymbol;
      }
    }
    targetOfNamespaceImport(n: qt.NamespaceImport, dontResolveAlias: boolean): qt.Symbol | undefined {
      const moduleSpecifier = n.parent?.parent?.moduleSpecifier;
      const immediate = resolveExternalModuleName(n, moduleSpecifier);
      const resolved = resolveESModuleSymbol(immediate, moduleSpecifier, dontResolveAlias, false);
      markSymbolOfAliasDeclarationIfTypeOnly(n, immediate, resolved, false);
      return resolved;
    }
    targetOfNamespaceExport(n: qt.NamespaceExport, dontResolveAlias: boolean): qt.Symbol | undefined {
      const moduleSpecifier = n.parent?.moduleSpecifier;
      const immediate = moduleSpecifier && resolveExternalModuleName(n, moduleSpecifier);
      const resolved = moduleSpecifier && resolveESModuleSymbol(immediate, moduleSpecifier, dontResolveAlias, false);
      markSymbolOfAliasDeclarationIfTypeOnly(n, immediate, resolved, false);
      return resolved;
    }
    externalModuleMember(n: qt.ImportDeclaration | qt.ExportDeclaration, spec: qt.ImportOrExportSpecifier, dontResolveAlias = false): qt.Symbol | undefined {
      const moduleSymbol = resolveExternalModuleName(n, n.moduleSpecifier!)!;
      const name = spec.propertyName || spec.name;
      const suppressInteropError = name.escapedText === InternalSymbol.Default && !!(compilerOpts.allowSyntheticDefaultImports || compilerOpts.esModuleInterop);
      const targetSymbol = resolveESModuleSymbol(moduleSymbol, n.moduleSpecifier!, dontResolveAlias, suppressInteropError);
      if (targetSymbol) {
        if (name.escapedText) {
          if (qf.is.shorthandAmbientModuleSymbol(moduleSymbol)) return moduleSymbol;
          let symbolFromVariable: qt.Symbol | undefined;
          if (moduleSymbol && moduleSymbol.exports && moduleSymbol.exports.get(InternalSymbol.ExportEquals))
            symbolFromVariable = this.propertyOfType(this.typeOfSymbol(targetSymbol), name.escapedText);
          else {
            symbolFromVariable = qf.get.propertyOfVariable(targetSymbol, name.escapedText);
          }
          symbolFromVariable = symbolFromVariable.resolveSymbol(dontResolveAlias);
          let symbolFromModule = qf.get.exportOfModule(targetSymbol, spec, dontResolveAlias);
          if (symbolFromModule === undefined && name.escapedText === InternalSymbol.Default) {
            const file = qu.find(moduleSymbol.declarations, isSourceFile);
            if (canHaveSyntheticDefault(file, moduleSymbol, dontResolveAlias))
              symbolFromModule = resolveExternalModuleSymbol(moduleSymbol, dontResolveAlias) || moduleSymbol.resolveSymbol(dontResolveAlias);
          }
          const symbol =
            symbolFromModule && symbolFromVariable && symbolFromModule !== symbolFromVariable
              ? combineValueAndTypeSymbols(symbolFromVariable, symbolFromModule)
              : symbolFromModule || symbolFromVariable;
          if (!symbol) {
            const moduleName = this.fullyQualifiedName(moduleSymbol, n);
            const declarationName = declarationNameToString(name);
            const suggestion = this.suggestedSymbolForNonexistentModule(name, targetSymbol);
            if (suggestion !== undefined) {
              const suggestionName = suggestion.symbolToString();
              const diagnostic = error(name, qd.msgs.Module_0_has_no_exported_member_1_Did_you_mean_2, moduleName, declarationName, suggestionName);
              if (suggestion.valueDeclaration) addRelatedInfo(diagnostic, qf.create.diagForNode(suggestion.valueDeclaration, qd.msgs._0_is_declared_here, suggestionName));
            } else {
              if (moduleSymbol.exports?.has(InternalSymbol.Default)) error(name, qd.msgs.Module_0_has_no_exported_member_1_Did_you_mean_to_use_import_1_from_0_instead, moduleName, declarationName);
              else {
                reportNonExportedMember(n, name, declarationName, moduleSymbol, moduleName);
              }
            }
          }
          return symbol;
        }
      }
    }
    targetOfImportSpecifier(n: qt.ImportSpecifier, dontResolveAlias: boolean): qt.Symbol | undefined {
      const resolved = this.externalModuleMember(n.parent?.parent?.parent, n, dontResolveAlias);
      markSymbolOfAliasDeclarationIfTypeOnly(n, undefined, resolved, false);
      return resolved;
    }
    targetOfNamespaceExportDeclaration(n: qt.NamespaceExportDeclaration, dontResolveAlias: boolean): qt.Symbol {
      const resolved = resolveExternalModuleSymbol(n.parent?.symbol, dontResolveAlias);
      markSymbolOfAliasDeclarationIfTypeOnly(n, undefined, resolved, false);
      return resolved;
    }
    targetOfExportSpecifier(n: qt.ExportSpecifier, meaning: SymbolFlags, dontResolveAlias?: boolean) {
      const resolved = n.parent?.parent?.moduleSpecifier
        ? this.externalModuleMember(n.parent?.parent, n, dontResolveAlias)
        : resolveEntityName(n.propertyName || n.name, meaning, false, dontResolveAlias);
      markSymbolOfAliasDeclarationIfTypeOnly(n, undefined, resolved, false);
      return resolved;
    }
    targetOfExportAssignment(n: qt.ExportAssignment | qt.BinaryExpression, dontResolveAlias: boolean): qt.Symbol | undefined {
      const expression = n.kind === Syntax.ExportAssignment ? n.expression : n.right;
      const resolved = this.targetOfAliasLikeExpression(expression, dontResolveAlias);
      markSymbolOfAliasDeclarationIfTypeOnly(n, undefined, resolved, false);
      return resolved;
    }
    targetOfAliasLikeExpression(expression: qt.Expression, dontResolveAlias: boolean) {
      if (expression.kind === Syntax.ClassExpression) return qf.check.expressionCached(expression).symbol;
      if (!qf.is.entityName(expression) && !qf.is.entityNameExpression(expression)) return;
      const aliasLike = resolveEntityName(expression, SymbolFlags.Value | SymbolFlags.Type | SymbolFlags.Namespace, true, dontResolveAlias);
      if (aliasLike) return aliasLike;
      qf.check.expressionCached(expression);
      return this.nodeLinks(expression).resolvedSymbol;
    }
    targetOfPropertyAssignment(n: qt.PropertyAssignment, dontRecursivelyResolve: boolean): qt.Symbol | undefined {
      const expression = n.initer;
      return this.targetOfAliasLikeExpression(expression, dontRecursivelyResolve);
    }
    targetOfPropertyAccessExpression(n: qt.PropertyAccessExpression, dontRecursivelyResolve: boolean): qt.Symbol | undefined {
      if (!(n.parent?.kind === Syntax.BinaryExpression && n.parent?.left === n && n.parent?.operatorToken.kind === Syntax.EqualsToken)) return;
      return this.targetOfAliasLikeExpression(n.parent?.right, dontRecursivelyResolve);
    }
    targetOfAliasDeclaration(n: qt.Declaration, dontRecursivelyResolve = false): qt.Symbol | undefined {
      switch (n.kind) {
        case Syntax.ImportEqualsDeclaration:
          return this.targetOfImportEqualsDeclaration(n, dontRecursivelyResolve);
        case Syntax.ImportClause:
          return this.targetOfImportClause(n, dontRecursivelyResolve);
        case Syntax.NamespaceImport:
          return this.targetOfNamespaceImport(n, dontRecursivelyResolve);
        case Syntax.NamespaceExport:
          return this.targetOfNamespaceExport(n, dontRecursivelyResolve);
        case Syntax.ImportSpecifier:
          return this.targetOfImportSpecifier(n, dontRecursivelyResolve);
        case Syntax.ExportSpecifier:
          return this.targetOfExportSpecifier(n, SymbolFlags.Value | SymbolFlags.Type | SymbolFlags.Namespace, dontRecursivelyResolve);
        case Syntax.ExportAssignment:
        case Syntax.BinaryExpression:
          return this.targetOfExportAssignment(n, dontRecursivelyResolve);
        case Syntax.NamespaceExportDeclaration:
          return this.targetOfNamespaceExportDeclaration(n, dontRecursivelyResolve);
        case Syntax.ShorthandPropertyAssignment:
          return resolveEntityName(n.name, SymbolFlags.Value | SymbolFlags.Type | SymbolFlags.Namespace, true, dontRecursivelyResolve);
        case Syntax.PropertyAssignment:
          return this.targetOfPropertyAssignment(n as qt.PropertyAssignment, dontRecursivelyResolve);
        case Syntax.PropertyAccessExpression:
          return this.targetOfPropertyAccessExpression(n as qt.PropertyAccessExpression, dontRecursivelyResolve);
        default:
          return qu.fail();
      }
    }
    symbolOfPartOfRightHandSideOfImportEquals(entityName: qt.EntityName, dontResolveAlias?: boolean): qt.Symbol | undefined {
      if (entityName.kind === Syntax.Identifier && qf.is.rightSideOfQualifiedNameOrPropertyAccess(entityName)) entityName = <qt.QualifiedName>entityName.parent;
      if (entityName.kind === Syntax.Identifier || entityName.parent?.kind === Syntax.QualifiedName) return resolveEntityName(entityName, SymbolFlags.Namespace, false, dontResolveAlias);
      else {
        qu.assert(entityName.parent?.kind === Syntax.ImportEqualsDeclaration);
        return resolveEntityName(entityName, SymbolFlags.Value | SymbolFlags.Type | SymbolFlags.Namespace, false, dontResolveAlias);
      }
    }
    assignmentDeclarationLocation(n: qt.TypingReference): Node | undefined {
      const typeAlias = qc.findAncestor(n, (n) => (!(qf.is.doc.node(n) || n.flags & NodeFlags.Doc) ? 'quit' : qf.is.doc.typeAlias(n)));
      if (typeAlias) return;
      const host = qf.get.doc.host(n);
      if (
        host.kind === Syntax.ExpressionStatement &&
        host.expression.kind === Syntax.BinaryExpression &&
        this.assignmentDeclarationKind(host.expression) === qt.AssignmentDeclarationKind.PrototypeProperty
      ) {
        const s = this.symbolOfNode(host.expression.left);
        if (s) return s.this.declarationOfJSPrototypeContainer();
      }
      if (
        (qf.is.objectLiteralMethod(host) || host.kind === Syntax.PropertyAssignment) &&
        host.parent?.parent?.kind === Syntax.BinaryExpression &&
        this.assignmentDeclarationKind(host.parent?.parent) === qt.AssignmentDeclarationKind.Prototype
      ) {
        const s = this.symbolOfNode(host.parent?.parent?.left);
        if (s) return s.this.declarationOfJSPrototypeContainer();
      }
      const sig = this.effectiveDocHost(n);
      if (sig && qf.is.functionLike(sig)) {
        const s = this.symbolOfNode(sig);
        return s && s.valueDeclaration;
      }
    }
    commonJsExportEquals(exported: qt.Symbol | undefined, moduleSymbol: qt.Symbol): qt.Symbol | undefined {
      if (!exported || exported === unknownSymbol || exported === moduleSymbol || moduleSymbol.exports!.size === 1 || exported.flags & SymbolFlags.Alias) return exported;
      const ls = exported.this.links();
      if (ls.cjsExportMerged) return ls.cjsExportMerged;
      const merged = exported.flags & SymbolFlags.Transient ? exported : exported.clone();
      merged.flags = merged.flags | SymbolFlags.ValueModule;
      if (merged.exports === undefined) merged.exports = new qc.SymbolTable();
      moduleSymbol.exports!.forEach((s, name) => {
        if (name === InternalSymbol.ExportEquals) return;
        merged.exports!.set(name, merged.exports!.has(name) ? s.merge(merged.exports!.get(name)!) : s);
      });
      merged.this.links().cjsExportMerged = merged;
      return (ls.cjsExportMerged = merged);
    }
    exportsOfModuleAsArray(s: qt.Symbol): qt.Symbol[] {
      return this.exportsOfModule(s).toArray();
    }
    exportsAndPropertiesOfModule(moduleSymbol: qt.Symbol): qt.Symbol[] {
      const exports = this.exportsOfModuleAsArray(moduleSymbol);
      const exportEquals = resolveExternalModuleSymbol(moduleSymbol);
      if (exportEquals !== moduleSymbol) qu.addRange(exports, this.propertiesOfType(this.typeOfSymbol(exportEquals)));
      return exports;
    }
    symbolOfNode(n: qt.Declaration): qt.Symbol;
    symbolOfNode(n: Node): qt.Symbol | undefined;
    symbolOfNode(n: Node): qt.Symbol | undefined {
      return this.mergedSymbol(n.symbol && this.lateBoundSymbol(n.symbol));
    }
    fileSymbolIfFileSymbolExportEqualsContainer(d: qt.Declaration, container: qt.Symbol) {
      const fileSymbol = this.externalModuleContainer(d);
      const exported = fileSymbol && fileSymbol.exports && fileSymbol.exports.get(InternalSymbol.ExportEquals);
      return exported && this.symbolIfSameReference(exported, container) ? fileSymbol : undefined;
    }
    symbolIfSameReference(s1: qt.Symbol, s2: qt.Symbol) {
      if (this.mergedSymbol(this.mergedSymbol(s1)?.resolveSymbol()) === this.mergedSymbol(this.mergedSymbol(s2)?.resolveSymbol())) return s1;
    }
    qualifiedLeftMeaning(rightMeaning: SymbolFlags) {
      return rightMeaning === SymbolFlags.Value ? SymbolFlags.Value : SymbolFlags.Namespace;
    }
    accessibleSymbolChain(
      symbol: qt.Symbol | undefined,
      enclosingDeclaration: Node | undefined,
      meaning: SymbolFlags,
      useOnlyExternalAliasing: boolean,
      visitedSymbolTablesMap: qu.QMap<qt.SymbolTable[]> = new qu.QMap()
    ): qt.Symbol[] | undefined {
      if (!(symbol && !qf.is.propertyOrMethodDeclarationSymbol(symbol))) return;
      const id = '' + symbol.this.id();
      let visitedSymbolTables = visitedSymbolTablesMap.get(id);
      if (!visitedSymbolTables) visitedSymbolTablesMap.set(id, (visitedSymbolTables = []));
      return forEachSymbolTableInScope(enclosingDeclaration, getAccessibleSymbolChainFromSymbolTable);
      const accessibleSymbolChainFromSymbolTable = (symbols: qt.SymbolTable, ignoreQualification?: boolean): qt.Symbol[] | undefined => {
        if (!pushIfUnique(visitedSymbolTables!, symbols)) return;
        const result = trySymbolTable(symbols, ignoreQualification);
        visitedSymbolTables!.pop();
        return result;
      };
      const canQualifySymbol = (symbolFromSymbolTable: qt.Symbol, meaning: SymbolFlags) => {
        return (
          !needsQualification(symbolFromSymbolTable, enclosingDeclaration, meaning) ||
          !!this.accessibleSymbolChain(symbolFromSymbolTable.parent, enclosingDeclaration, this.qualifiedLeftMeaning(meaning), useOnlyExternalAliasing, visitedSymbolTablesMap)
        );
      };
      const isAccessible = (symbolFromSymbolTable: qt.Symbol, resolvedAliasSymbol?: qt.Symbol, ignoreQualification?: boolean) => {
        return (
          (symbol === (resolvedAliasSymbol || symbolFromSymbolTable) || this.mergedSymbol(symbol) === this.mergedSymbol(resolvedAliasSymbol || symbolFromSymbolTable)) &&
          !some(symbolFromSymbolTable.declarations, hasNonGlobalAugmentationExternalModuleSymbol) &&
          (ignoreQualification || canQualifySymbol(this.mergedSymbol(symbolFromSymbolTable), meaning))
        );
      };
      const trySymbolTable = (symbols: qt.SymbolTable, ignoreQualification: boolean | undefined): qt.Symbol[] | undefined => {
        if (isAccessible(symbols.get(symbol!.escName)!, undefined, ignoreQualification)) return [symbol!];
        const result = forEachEntry(symbols, (symbolFromSymbolTable) => {
          if (
            symbolFromSymbolTable.flags & SymbolFlags.Alias &&
            symbolFromSymbolTable.escName !== InternalSymbol.ExportEquals &&
            symbolFromSymbolTable.escName !== InternalSymbol.Default &&
            !(qf.is.uMDExportSymbol(symbolFromSymbolTable) && enclosingDeclaration && qf.is.externalModule(enclosingDeclaration.sourceFile)) &&
            (!useOnlyExternalAliasing || qu.some(symbolFromSymbolTable.declarations, qf.is.externalModuleImportEqualsDeclaration)) &&
            (ignoreQualification || !symbolFromSymbolTable.declarationOfKind(Syntax.ExportSpecifier))
          ) {
            const resolvedImportedSymbol = symbolFromSymbolTable.resolveAlias();
            const candidate = this.candidateListForSymbol(symbolFromSymbolTable, resolvedImportedSymbol, ignoreQualification);
            if (candidate) return candidate;
          }
          if (symbolFromSymbolTable.escName === symbol!.escName && symbolFromSymbolTable.exportSymbol) {
            if (isAccessible(this.mergedSymbol(symbolFromSymbolTable.exportSymbol), undefined, ignoreQualification)) return [symbol!];
          }
        });
        return result || (symbols === globals ? this.candidateListForSymbol(globalThisSymbol, globalThisSymbol, ignoreQualification) : undefined);
      };
      const candidateListForSymbol = (symbolFromSymbolTable: qt.Symbol, resolvedImportedSymbol: qt.Symbol, ignoreQualification: boolean | undefined) => {
        if (isAccessible(symbolFromSymbolTable, resolvedImportedSymbol, ignoreQualification)) return [symbolFromSymbolTable];
        const candidateTable = resolvedImportedSymbol.this.exportsOfSymbol();
        const accessibleSymbolsFromExports = candidateTable && this.accessibleSymbolChainFromSymbolTable(candidateTable, true);
        if (accessibleSymbolsFromExports && canQualifySymbol(symbolFromSymbolTable, this.qualifiedLeftMeaning(meaning))) return [symbolFromSymbolTable].concat(accessibleSymbolsFromExports);
      };
    }
    externalModuleContainer(n: Node) {
      const p = qc.findAncestor(n, hasExternalModuleSymbol);
      return p && this.symbolOfNode(p);
    }
    typeNamesForErrorDisplay(left: qt.Type, right: qt.Type): [string, string] {
      let leftStr = symbolValueDeclarationIsContextSensitive(left.symbol) ? typeToString(left, left.symbol.valueDeclaration) : typeToString(left);
      let rightStr = symbolValueDeclarationIsContextSensitive(right.symbol) ? typeToString(right, right.symbol.valueDeclaration) : typeToString(right);
      if (leftStr === rightStr) {
        leftStr = this.typeNameForErrorDisplay(left);
        rightStr = this.typeNameForErrorDisplay(right);
      }
      return [leftStr, rightStr];
    }
    typeNameForErrorDisplay(t: qt.Type) {
      return typeToString(t, undefined, qt.TypeFormatFlags.UseFullyQualifiedType);
    }
    typeAliasForTypeLiteral(t: qt.Type): qt.Symbol | undefined {
      if (t.symbol && t.symbol.flags & SymbolFlags.TypeLiteral) {
        const n = walkUpParenthesizedTypes(t.symbol.declarations[0].parent);
        if (n.kind === Syntax.TypeAliasDeclaration) return this.symbolOfNode(n);
      }
      return;
    }
    declarationContainer(n: Node): Node | undefined {
      return qc.findAncestor(this.rootDeclaration(n), (n) => {
        switch (n.kind) {
          case Syntax.VariableDeclaration:
          case Syntax.VariableDeclarationList:
          case Syntax.ImportSpecifier:
          case Syntax.NamedImports:
          case Syntax.NamespaceImport:
          case Syntax.ImportClause:
            return false;
          default:
            return true;
        }
      })?.parent;
    }
    typeOfPrototypeProperty(prototype: qt.Symbol): qt.Type {
      const classType = <qt.InterfaceType>this.declaredTypeOfSymbol(this.parentOfSymbol(prototype)!);
      return classType.typeParams
        ? qf.create.typeReference(
            <qt.GenericType>classType,
            map(classType.typeParams, (_) => anyType)
          )
        : classType;
    }
    typeOfPropertyOfType(t: qt.Type, name: qu.__String): qt.Type | undefined {
      const prop = this.propertyOfType(t, name);
      return prop ? this.typeOfSymbol(prop) : undefined;
    }
    typeOfPropertyOrIndexSignature(t: qt.Type, name: qu.__String): qt.Type {
      return this.typeOfPropertyOfType(t, name) || (NumericLiteral.name(name) && this.indexTypeOfType(t, qt.IndexKind.Number)) || this.indexTypeOfType(t, qt.IndexKind.String) || unknownType;
    }
    typeForBindingElemParent(n: qt.BindingElemGrandparent) {
      const symbol = this.symbolOfNode(n);
      return (symbol && s.this.links(symbol).type) || this.typeForVariableLikeDeclaration(n, false);
    }
    restType(source: qt.Type, properties: qt.PropertyName[], symbol: qt.Symbol | undefined): qt.Type {
      source = filterType(source, (t) => !(t.flags & qt.TypeFlags.Nullable));
      if (source.flags & qt.TypeFlags.Never) return qu.emptyObjectType;
      if (source.flags & qt.TypeFlags.Union) return mapType(source, (t) => this.restType(t, properties, symbol));
      const omitKeyType = this.unionType(map(properties, this.literalTypeFromPropertyName));
      if (qf.is.genericObjectType(source) || qf.is.genericIndexType(omitKeyType)) {
        if (omitKeyType.flags & qt.TypeFlags.Never) return source;
        const omitTypeAlias = this.globalOmitSymbol();
        if (!omitTypeAlias) return errorType;
        return this.typeAliasInstantiation(omitTypeAlias, [source, omitKeyType]);
      }
      const members = new qc.SymbolTable();
      for (const prop of this.propertiesOfType(source)) {
        if (
          !qf.is.typeAssignableTo(this.literalTypeFromProperty(prop, qt.TypeFlags.StringOrNumberLiteralOrUnique), omitKeyType) &&
          !(prop.declarationModifierFlags() & (ModifierFlags.Private | ModifierFlags.Protected)) &&
          qf.is.spreadableProperty(prop)
        ) {
          members.set(prop.escName, this.spreadSymbol(prop, false));
        }
      }
      const stringIndexInfo = this.indexInfoOfType(source, qt.IndexKind.String);
      const numberIndexInfo = this.indexInfoOfType(source, qt.IndexKind.Number);
      const result = create.anonymousType(symbol, members, qu.empty, qu.empty, stringIndexInfo, numberIndexInfo);
      result.objectFlags |= ObjectFlags.ObjectRestType;
      return result;
    }
    flowTypeOfDestructuring(n: qt.BindingElem | qt.PropertyAssignment | qt.ShorthandPropertyAssignment | qt.Expression, declared: qt.Type) {
      const r = this.syntheticElemAccess(n);
      return r ? this.flow.typeOfReference(r, declared) : declared;
    }
    syntheticElemAccess(n: qt.BindingElem | qt.PropertyAssignment | qt.ShorthandPropertyAssignment | qt.Expression): qt.ElemAccessExpression | undefined {
      const parentAccess = this.parentElemAccess(n);
      if (parentAccess && parentAccess.flowNode) {
        const propName = this.destructuringPropertyName(n);
        if (propName) {
          const result = <qt.ElemAccessExpression>qf.create.node(Syntax.ElemAccessExpression, n.pos, n.end);
          result.parent = n;
          result.expression = <qt.LeftExpression>parentAccess;
          const literal = <qt.StringLiteral>qf.create.node(Syntax.StringLiteral, n.pos, n.end);
          literal.parent = result;
          literal.text = propName;
          result.argExpression = literal;
          result.flowNode = parentAccess.flowNode;
          return result;
        }
      }
    }
    parentElemAccess(n: qt.BindingElem | qt.PropertyAssignment | qt.ShorthandPropertyAssignment | qt.Expression) {
      const p = n.parent?.parent;
      switch (p?.kind) {
        case Syntax.BindingElem:
        case Syntax.PropertyAssignment:
          return this.syntheticElemAccess(p);
        case Syntax.ArrayLiteralExpression:
          return this.syntheticElemAccess(n.parent);
        case Syntax.VariableDeclaration:
          return p.initer;
        case Syntax.BinaryExpression:
          return p.right;
      }
    }
    destructuringPropertyName(n: qt.BindingElem | qt.PropertyAssignment | qt.ShorthandPropertyAssignment | qt.Expression) {
      const parent = n.parent;
      if (n.kind === Syntax.BindingElem && parent?.kind === Syntax.ObjectBindingPattern)
        return this.literalPropertyNameText((<qt.BindingElem>n).propertyName || <qt.Identifier>(<qt.BindingElem>n).name);
      if (n.kind === Syntax.PropertyAssignment || n.kind === Syntax.ShorthandPropertyAssignment) return this.literalPropertyNameText((<qt.PropertyAssignment | qt.ShorthandPropertyAssignment>n).name);
      return '' + (<Nodes<Node>>(<qt.BindingPattern | qt.ArrayLiteralExpression>parent).elems).indexOf(n);
    }
    literalPropertyNameText(n: qt.PropertyName) {
      const t = this.literalTypeFromPropertyName(n);
      return t.flags & (TypeFlags.StringLiteral | qt.TypeFlags.NumberLiteral) ? '' + t.value : undefined;
    }
    typeForBindingElem(declaration: qt.BindingElem): qt.Type | undefined {
      const pattern = declaration.parent;
      let parentType = this.typeForBindingElemParent(pattern.parent);
      if (!parentType || qf.is.typeAny(parentType)) return parentType;
      if (strictNullChecks && declaration.flags & NodeFlags.Ambient && qf.is.paramDeclaration(declaration)) parentType = this.nonNullableType(parentType);
      else if (strictNullChecks && pattern.parent?.initer && !(this.typeFacts(this.typeOfIniter(pattern.parent?.initer)) & TypeFacts.EQUndefined)) {
        parentType = this.typeWithFacts(parentType, TypeFacts.NEUndefined);
      }
      let type: qt.Type | undefined;
      if (pattern.kind === Syntax.ObjectBindingPattern) {
        if (declaration.dot3Token) {
          parentType = this.reducedType(parentType);
          if (parentType.flags & qt.TypeFlags.Unknown || !qf.is.validSpreadType(parentType)) {
            error(declaration, qd.msgs.Rest_types_may_only_be_created_from_object_types);
            return errorType;
          }
          const literalMembers: qt.PropertyName[] = [];
          for (const elem of pattern.elems) {
            if (!elem.dot3Token) literalMembers.push(elem.propertyName || (elem.name as qt.Identifier));
          }
          type = this.restType(parentType, literalMembers, declaration.symbol);
        } else {
          const name = declaration.propertyName || <qt.Identifier>declaration.name;
          const indexType = this.literalTypeFromPropertyName(name);
          const declaredType = this.constraintForLocation(this.indexedAccessType(parentType, indexType, name), declaration.name);
          type = this.flowTypeOfDestructuring(declaration, declaredType);
        }
      } else {
        const elemType = qf.check.iteratedTypeOrElemType(IterationUse.Destructuring, parentType, undefinedType, pattern);
        const index = pattern.elems.indexOf(declaration);
        if (declaration.dot3Token) type = everyType(parentType, qf.is.tupleType) ? mapType(parentType, (t) => sliceTupleType(<qt.TupleTypeReference>t, index)) : qf.create.arrayType(elemType);
        else if (qf.is.arrayLikeType(parentType)) {
          const indexType = this.literalType(index);
          const accessFlags = qf.has.defaultValue(declaration) ? AccessFlags.NoTupleBoundsCheck : 0;
          const declaredType = this.constraintForLocation(this.indexedAccessTypeOrUndefined(parentType, indexType, declaration.name, accessFlags) || errorType, declaration.name);
          type = this.flowTypeOfDestructuring(declaration, declaredType);
        } else {
          type = elemType;
        }
      }
      if (!declaration.initer) return type;
      if (this.effectiveTypeAnnotationNode(walkUpBindingElemsAndPatterns(declaration)))
        return strictNullChecks && !(this.falsyFlags(qf.check.declarationIniter(declaration)) & qt.TypeFlags.Undefined) ? this.typeWithFacts(t, TypeFacts.NEUndefined) : type;
      return widenTypeInferredFromIniter(declaration, this.unionType([this.typeWithFacts(t, TypeFacts.NEUndefined), qf.check.declarationIniter(declaration)], UnionReduction.Subtype));
    }
    typeForDeclarationFromDocComment(declaration: Node) {
      const jsdocType = qf.get.doc.type(declaration);
      if (jsdocType) return this.typeFromTypeNode(jsdocType);
      return;
    }
    typeForVariableLikeDeclaration(
      declaration: qt.ParamDeclaration | qt.PropertyDeclaration | qt.PropertySignature | qt.VariableDeclaration | qt.BindingElem,
      includeOptionality: boolean
    ): qt.Type | undefined {
      if (declaration.kind === Syntax.VariableDeclaration && declaration.parent?.parent?.kind === Syntax.ForInStatement) {
        const indexType = this.indexType(this.nonNullableTypeIfNeeded(qf.check.expression(declaration.parent?.parent?.expression)));
        return indexType.flags & (TypeFlags.TypeParam | qt.TypeFlags.Index) ? this.extractStringType(indexType) : stringType;
      }
      if (declaration.kind === Syntax.VariableDeclaration && declaration.parent?.parent?.kind === Syntax.ForOfStatement) {
        const forOfStatement = declaration.parent?.parent;
        return qf.check.rightHandSideOfForOf(forOfStatement) || anyType;
      }
      if (declaration.parent?.kind === Syntax.BindingPattern) return this.typeForBindingElem(<qt.BindingElem>declaration);
      const isOptional =
        includeOptionality &&
        ((declaration.kind === Syntax.ParamDeclaration && qf.is.docOptionalParam(declaration)) ||
          (!declaration.kind === Syntax.BindingElem && !declaration.kind === Syntax.VariableDeclaration && !!declaration.questionToken));
      const declaredType = tryGetTypeFromEffectiveTypeNode(declaration);
      if (declaredType) return addOptionality(declaredType, isOptional);
      if (
        (noImplicitAny || qf.is.inJSFile(declaration)) &&
        declaration.kind === Syntax.VariableDeclaration &&
        !declaration.name.kind === Syntax.BindingPattern &&
        !(this.combinedModifierFlags(declaration) & ModifierFlags.Export) &&
        !(declaration.flags & NodeFlags.Ambient)
      ) {
        if (!(this.combinedFlagsOf(declaration) & NodeFlags.Const) && (!declaration.initer || qf.is.nullOrUndefined(declaration.initer))) return autoType;
        if (declaration.initer && qf.is.emptyArrayLiteral(declaration.initer)) return autoArrayType;
      }
      if (declaration.kind === Syntax.Param) {
        const func = <qt.FunctionLikeDeclaration>declaration.parent;
        if (func.kind === Syntax.SetAccessor && !qf.has.nonBindableDynamicName(func)) {
          const getter = this.symbolOfNode(declaration.parent).declarationOfKind<qt.AccessorDeclaration>(Syntax.GetAccessor);
          if (getter) {
            const getterSignature = this.signatureFromDeclaration(getter);
            const thisParam = this.accessorThisNodeKind(ParamDeclaration, func as qt.AccessorDeclaration);
            if (thisParam && declaration === thisParam) {
              qu.assert(!thisParam.type);
              return this.typeOfSymbol(getterSignature.thisParam!);
            }
            return this.returnTypeOfSignature(getterSignature);
          }
        }
        if (qf.is.inJSFile(declaration)) {
          const typeTag = qf.get.doc.type(func);
          if (typeTag && typeTag.kind === Syntax.FunctionTyping) return this.typeAtPosition(this.signatureFromDeclaration(typeTag), func.params.indexOf(declaration));
        }
        const type = declaration.symbol.escName === InternalSymbol.This ? this.contextualThisParamType(func) : this.contextuallyTypedParamType(declaration);
        if (t) return addOptionality(t, isOptional);
      } else if (qf.is.inJSFile(declaration)) {
        const containerObjectType = this.jSContainerObjectType(declaration, this.symbolOfNode(declaration), this.declaredExpandoIniter(declaration));
        if (containerObjectType) return containerObjectType;
      }
      if (declaration.initer) {
        const type = widenTypeInferredFromIniter(declaration, qf.check.declarationIniter(declaration));
        return addOptionality(t, isOptional);
      }
      if (declaration.kind === Syntax.PropertyDeclaration && (noImplicitAny || qf.is.inJSFile(declaration))) {
        const constructor = findConstructorDeclaration(declaration.parent);
        const type = constructor
          ? this.flowTypeInConstructor(declaration.symbol, constructor)
          : this.effectiveModifierFlags(declaration) & ModifierFlags.Ambient
          ? this.typeOfPropertyInBaseClass(declaration.symbol)
          : undefined;
        return type && addOptionality(t, isOptional);
      }
      if (declaration.kind === Syntax.JsxAttribute) return trueType;
      if (declaration.name.kind === Syntax.BindingPattern) return this.typeFromBindingPattern(declaration.name, false, true);
      return;
    }
    flowTypeInConstructor(symbol: qt.Symbol, constructor: qt.ConstructorDeclaration) {
      const reference = new qc.PropertyAccessExpression(new qc.ThisExpression(), qy.get.unescUnderscores(symbol.escName));
      reference.expression.parent = reference;
      reference.parent = constructor;
      reference.flowNode = constructor.returnFlowNode;
      const flowType = this.flowTypeOfProperty(reference, symbol);
      if (noImplicitAny && (flowType === autoType || flowType === autoArrayType))
        error(symbol.valueDeclaration, qd.msgs.Member_0_implicitly_has_an_1_type, symbol.symbolToString(), typeToString(flowType));
      return everyType(flowType, isNullableType) ? undefined : convertAutoToAny(flowType);
    }
    flowTypeOfProperty(n: Node, s?: qt.Symbol) {
      const t = (s && (!qf.is.autoTypedProperty(s) || this.effectiveModifierFlags(s.valueDeclaration) & ModifierFlags.Ambient) && this.typeOfPropertyInBaseClass(s)) || undefinedType;
      return this.flow.typeOfReference(n, autoType, t);
    }
    widenedTypeForAssignmentDeclaration(symbol: qt.Symbol, resolvedSymbol?: qt.Symbol) {
      const container = this.assignedExpandoIniter(symbol.valueDeclaration);
      if (container) {
        const tag = qf.get.doc.typeTag(container);
        if (tag && tag.typeExpression) return this.typeFromTypeNode(tag.typeExpression);
        const containerObjectType = this.jSContainerObjectType(symbol.valueDeclaration, symbol, container);
        return containerObjectType || this.widenedLiteralType(qf.check.expressionCached(container));
      }
      let type;
      let definedInConstructor = false;
      let definedInMethod = false;
      if (qf.is.constructorDeclaredProperty(symbol)) type = this.flowTypeInConstructor(symbol, this.declaringConstructor(symbol)!);
      if (!type) {
        let jsdocType: qt.Type | undefined;
        let types: qt.Type[] | undefined;
        for (const declaration of symbol.declarations) {
          const expression =
            declaration.kind === Syntax.BinaryExpression || declaration.kind === Syntax.CallExpression
              ? declaration
              : qf.is.accessExpression(declaration)
              ? declaration.parent?.kind === Syntax.BinaryExpression
                ? declaration.parent
                : declaration
              : undefined;
          if (!expression) continue;
          const kind = qf.is.accessExpression(expression) ? this.assignmentDeclarationPropertyAccessKind(expression) : this.assignmentDeclarationKind(expression);
          if (kind === qt.AssignmentDeclarationKind.ThisProperty) {
            if (qf.is.declarationInConstructor(expression)) definedInConstructor = true;
            else {
              definedInMethod = true;
            }
          }
          if (!expression.kind === Syntax.CallExpression) jsdocType = this.annotatedTypeForAssignmentDeclaration(jsdocType, expression, symbol, declaration);
          if (!jsdocType) {
            (types || (types = [])).push(
              expression.kind === Syntax.BinaryExpression || expression.kind === Syntax.CallExpression ? this.initerTypeFromAssignmentDeclaration(symbol, resolvedSymbol, expression, kind) : neverType
            );
          }
        }
        type = jsdocType;
        if (!type) {
          if (!qu.length(types)) return errorType;
          let constructorTypes = definedInConstructor ? this.constructorDefinedThisAssignmentTypes(types!, symbol.declarations) : undefined;
          if (definedInMethod) {
            const propType = this.typeOfPropertyInBaseClass(symbol);
            if (propType) {
              (constructorTypes || (constructorTypes = [])).push(propType);
              definedInConstructor = true;
            }
          }
          const sourceTypes = qu.some(constructorTypes, (t) => !!(t.flags & ~TypeFlags.Nullable)) ? constructorTypes : types;
          type = this.unionType(sourceTypes!, UnionReduction.Subtype);
        }
      }
      const widened = this.widenedType(addOptionality(t, definedInMethod && !definedInConstructor));
      if (filterType(widened, (t) => !!(t.flags & ~TypeFlags.Nullable)) === neverType) {
        reportImplicitAny(symbol.valueDeclaration, anyType);
        return anyType;
      }
      return widened;
    }
    jSContainerObjectType(decl: Node, symbol: qt.Symbol, init: qt.Expression | undefined): qt.Type | undefined {
      if (!qf.is.inJSFile(decl) || !init || !init.kind === Syntax.ObjectLiteralExpression || init.properties.length) return;
      const exports = new qc.SymbolTable();
      while (decl.kind === Syntax.BinaryExpression || decl.kind === Syntax.PropertyAccessExpression) {
        const s = this.symbolOfNode(decl);
        if (s && qu.qf.has.entries(s.exports)) exports.merge(s.exports);
        decl = decl.kind === Syntax.BinaryExpression ? decl.parent : decl.parent?.parent;
      }
      const s = this.symbolOfNode(decl);
      if (s && qu.qf.has.entries(s.exports)) exports.merge(s.exports);
      const type = qf.create.anonymousType(symbol, exports, qu.empty, qu.empty, undefined, undefined);
      t.objectFlags |= ObjectFlags.JSLiteral;
      return type;
    }
    annotatedTypeForAssignmentDeclaration(declaredType: qt.Type | undefined, expression: qt.Expression, symbol: qt.Symbol, declaration: qt.Declaration) {
      const typeNode = this.effectiveTypeAnnotationNode(expression.parent);
      if (typeNode) {
        const type = this.widenedType(this.typeFromTypeNode(typeNode));
        if (!declaredType) return type;
        else if (declaredType !== errorType && type !== errorType && !qf.is.typeIdenticalTo(declaredType, type)) {
          errorNextVariableOrPropertyDeclarationMustHaveSameType(undefined, declaredType, declaration, type);
        }
      }
      if (symbol.parent) {
        const typeNode = this.effectiveTypeAnnotationNode(symbol.parent?.valueDeclaration);
        if (typeNode) return this.typeOfPropertyOfType(this.typeFromTypeNode(typeNode), symbol.escName);
      }
      return declaredType;
    }
    initerTypeFromAssignmentDeclaration(symbol: qt.Symbol, resolvedSymbol: qt.Symbol | undefined, expression: qt.BinaryExpression | qt.CallExpression, kind: qt.AssignmentDeclarationKind) {
      if (expression.kind === Syntax.CallExpression) {
        if (resolvedSymbol) return this.typeOfSymbol(resolvedSymbol);
        const objectLitType = qf.check.expressionCached((expression as qt.BindableObjectDefinePropertyCall).args[2]);
        const valueType = this.typeOfPropertyOfType(objectLitType, 'value' as qu.__String);
        if (valueType) return valueType;
        const getFunc = this.typeOfPropertyOfType(objectLitType, 'get' as qu.__String);
        if (getFunc) {
          const getSig = this.singleCallSignature(getFunc);
          if (getSig) return this.returnTypeOfSignature(getSig);
        }
        const setFunc = this.typeOfPropertyOfType(objectLitType, 'set' as qu.__String);
        if (setFunc) {
          const setSig = this.singleCallSignature(setFunc);
          if (setSig) return this.typeOfFirstParamOfSignature(setSig);
        }
        return anyType;
      }
      if (containsSameNamedThisProperty(expression.left, expression.right)) return anyType;
      const type = resolvedSymbol ? this.typeOfSymbol(resolvedSymbol) : this.widenedLiteralType(qf.check.expressionCached(expression.right));
      if (t.flags & qt.TypeFlags.Object && kind === qt.AssignmentDeclarationKind.ModuleExports && symbol.escName === InternalSymbol.ExportEquals) {
        const exportedType = resolveStructuredTypeMembers(type as qt.ObjectType);
        const members = new qc.SymbolTable();
        copyEntries(exportedType.members, members);
        if (resolvedSymbol && !resolvedSymbol.exports) resolvedSymbol.exports = new qc.SymbolTable();
        (resolvedSymbol || symbol).exports!.forEach((s, name) => {
          const exportedMember = members.get(name)!;
          if (exportedMember && exportedMember !== s) {
            if (s.flags & SymbolFlags.Value) {
              if (s.valueDeclaration.sourceFile !== exportedMember.valueDeclaration.sourceFile) {
                const unescName = qy.get.unescUnderscores(s.escName);
                const exportedMemberName = qu.tryCast(exportedMember.valueDeclaration, isNamedDecl)?.name || exportedMember.valueDeclaration;
                addRelatedInfo(error(s.valueDeclaration, qd.msgs.Duplicate_identifier_0, unescName), qf.create.diagForNode(exportedMemberName, qd.msgs._0_was_also_declared_here, unescName));
                addRelatedInfo(error(exportedMemberName, qd.msgs.Duplicate_identifier_0, unescName), qf.create.diagForNode(s.valueDeclaration, qd.msgs._0_was_also_declared_here, unescName));
              }
              const union = new qc.Symbol(s.flags | exportedMember.flags, name);
              union.type = this.unionType([this.typeOfSymbol(s), this.typeOfSymbol(exportedMember)]);
              union.valueDeclaration = exportedMember.valueDeclaration;
              union.declarations = concatenate(exportedMember.declarations, s.declarations);
              members.set(name, union);
            } else {
              members.set(name, exportedMember.merge(s));
            }
          } else {
            members.set(name, s);
          }
        });
        const result = qf.create.anonymousType(exportedType.symbol, members, exportedType.callSignatures, exportedType.constructSignatures, exportedType.stringIndexInfo, exportedType.numberIndexInfo);
        result.objectFlags |= this.objectFlags(t) & ObjectFlags.JSLiteral;
        return result;
      }
      if (qf.is.emptyArrayLiteralType(t)) {
        reportImplicitAny(expression, anyArrayType);
        return anyArrayType;
      }
      return type;
    }
    constructorDefinedThisAssignmentTypes(types: qt.Type[], declarations: qt.Declaration[]): qt.Type[] | undefined {
      qu.assert(types.length === declarations.length);
      return types.filter((_, i) => {
        const declaration = declarations[i];
        const expression = declaration.kind === Syntax.BinaryExpression ? declaration : declaration.parent?.kind === Syntax.BinaryExpression ? declaration.parent : undefined;
        return expression && qf.is.declarationInConstructor(expression);
      });
    }
    typeFromBindingElem(elem: qt.BindingElem, includePatternInType?: boolean, reportErrors?: boolean): qt.Type {
      if (elem.initer) {
        const contextualType = elem.name.kind === Syntax.BindingPattern ? this.typeFromBindingPattern(elem.name, true, false) : unknownType;
        return addOptionality(widenTypeInferredFromIniter(elem, qf.check.declarationIniter(elem, contextualType)));
      }
      if (elem.name.kind === Syntax.BindingPattern) return this.typeFromBindingPattern(elem.name, includePatternInType, reportErrors);
      if (reportErrors && !declarationBelongsToPrivateAmbientMember(elem)) reportImplicitAny(elem, anyType);
      return includePatternInType ? nonInferrableAnyType : anyType;
    }
    typeFromObjectBindingPattern(pattern: qt.ObjectBindingPattern, includePatternInType: boolean, reportErrors: boolean): qt.Type {
      const members = new qc.SymbolTable();
      let stringIndexInfo: qt.IndexInfo | undefined;
      let objectFlags = ObjectFlags.ObjectLiteral | ObjectFlags.ContainsObjectOrArrayLiteral;
      forEach(pattern.elems, (e) => {
        const name = e.propertyName || <qt.Identifier>e.name;
        if (e.dot3Token) {
          stringIndexInfo = qf.create.indexInfo(anyType, false);
          return;
        }
        const exprType = this.literalTypeFromPropertyName(name);
        if (!qf.is.typeUsableAsPropertyName(exprType)) {
          objectFlags |= ObjectFlags.ObjectLiteralPatternWithComputedProperties;
          return;
        }
        const text = this.propertyNameFromType(exprType);
        const flags = SymbolFlags.Property | (e.initer ? SymbolFlags.Optional : 0);
        const symbol = new qc.Symbol(flags, text);
        symbol.type = this.typeFromBindingElem(e, includePatternInType, reportErrors);
        symbol.bindingElem = e;
        members.set(symbol.escName, symbol);
      });
      const result = qf.create.anonymousType(undefined, members, qu.empty, qu.empty, stringIndexInfo, undefined);
      result.objectFlags |= objectFlags;
      if (includePatternInType) {
        result.pattern = pattern;
        result.objectFlags |= ObjectFlags.ContainsObjectOrArrayLiteral;
      }
      return result;
    }
    typeFromArrayBindingPattern(pattern: qt.BindingPattern, includePatternInType: boolean, reportErrors: boolean): qt.Type {
      const elems = pattern.elems;
      const lastElem = lastOrUndefined(elems);
      const hasRestElem = !!(lastElem && lastElem.kind === Syntax.BindingElem && lastElem.dot3Token);
      if (elems.length === 0 || (elems.length === 1 && hasRestElem)) return qf.create.iterableType(anyType);
      const elemTypes = map(elems, (e) => (e.kind === Syntax.OmittedExpression ? anyType : this.typeFromBindingElem(e, includePatternInType, reportErrors)));
      const minLength = findLastIndex(elems, (e) => !e.kind === Syntax.OmittedExpression && !qf.has.defaultValue(e), elems.length - (hasRestElem ? 2 : 1)) + 1;
      let result = <qt.TypeReference>qf.create.tupleType(elemTypes, minLength, hasRestElem);
      if (includePatternInType) {
        result = cloneTypeReference(result);
        result.pattern = pattern;
        result.objectFlags |= ObjectFlags.ContainsObjectOrArrayLiteral;
      }
      return result;
    }
    typeFromBindingPattern(pattern: qt.BindingPattern, includePatternInType = false, reportErrors = false): qt.Type {
      return pattern.kind === Syntax.ObjectBindingPattern
        ? this.typeFromObjectBindingPattern(pattern, includePatternInType, reportErrors)
        : this.typeFromArrayBindingPattern(pattern, includePatternInType, reportErrors);
    }
    widenedTypeForVariableLikeDeclaration(declaration: qt.ParamDeclaration | qt.PropertyDeclaration | qt.PropertySignature | qt.VariableDeclaration | qt.BindingElem, reportErrors?: boolean): qt.Type {
      return widenTypeForVariableLikeDeclaration(this.typeForVariableLikeDeclaration(declaration, true), declaration, reportErrors);
    }
    annotatedAccessorTypeNode(d?: qt.AccessorDeclaration): qt.Typing | undefined {
      if (d) {
        if (d.kind === Syntax.GetAccessor) return this.effectiveReturnTypeNode(d);
        else return this.effectiveSetAccessorTypeAnnotationNode(d);
      }
      return;
    }
    annotatedAccessorType(d?: qt.AccessorDeclaration): qt.Type | undefined {
      const n = this.annotatedAccessorTypeNode(d);
      return n && this.typeFromTypeNode(n);
    }
    annotatedAccessorThisNodeKind(ParamDeclaration, d: qt.AccessorDeclaration): qt.Symbol | undefined {
      const param = this.accessorThisNodeKind(ParamDeclaration, d);
      return param && param.symbol;
    }
    thisTypeOfDeclaration(declaration: qt.SignatureDeclaration): qt.Type | undefined {
      return this.thisTypeOfSignature(this.signatureFromDeclaration(declaration));
    }
    targetType(t: qt.Type): qt.Type {
      return this.objectFlags(t) & ObjectFlags.Reference ? (<qt.TypeReference>type).target : type;
    }
    outerTypeParams(n: Node, includeThisTypes?: boolean): qt.TypeParam[] | undefined {
      while (true) {
        n = n.parent;
        if (n && qt.BinaryExpression.kind === Syntax.node) {
          const assignmentKind = this.assignmentDeclarationKind(n);
          if (assignmentKind === qt.AssignmentDeclarationKind.Prototype || assignmentKind === qt.AssignmentDeclarationKind.PrototypeProperty) {
            const symbol = this.symbolOfNode(n.left);
            if (symbol && symbol.parent && !qc.findAncestor(symbol.parent?.valueDeclaration, (d) => n === d)) n = symbol.parent?.valueDeclaration;
          }
        }
        if (!n) return;
        switch (n.kind) {
          case Syntax.VariableStatement:
          case Syntax.ClassDeclaration:
          case Syntax.ClassExpression:
          case Syntax.InterfaceDeclaration:
          case Syntax.CallSignature:
          case Syntax.ConstructSignature:
          case Syntax.MethodSignature:
          case Syntax.FunctionTyping:
          case Syntax.ConstructorTyping:
          case Syntax.DocFunctionTyping:
          case Syntax.FunctionDeclaration:
          case Syntax.MethodDeclaration:
          case Syntax.FunctionExpression:
          case Syntax.ArrowFunction:
          case Syntax.TypeAliasDeclaration:
          case Syntax.DocTemplateTag:
          case Syntax.DocTypedefTag:
          case Syntax.DocEnumTag:
          case Syntax.DocCallbackTag:
          case Syntax.MappedTyping:
          case Syntax.ConditionalTyping:
            const outerTypeParams = this.outerTypeParams(n, includeThisTypes);
            if (n.kind === Syntax.MappedTyping) return append(outerTypeParams, this.declaredTypeOfTypeParam(this.symbolOfNode((<qt.MappedTyping>n).typeParam)));
            else if (n.kind === Syntax.ConditionalTyping) return concatenate(outerTypeParams, this.inferTypeParams(<qt.ConditionalTyping>n));
            else if (n.kind === Syntax.VariableStatement && !qf.is.inJSFile(n)) {
              break;
            }
            const outerAndOwnTypeParams = appendTypeParams(outerTypeParams, this.effectiveTypeParamDeclarations(<qt.DeclarationWithTypeParams>n));
            const thisType =
              includeThisTypes &&
              (n.kind === Syntax.ClassDeclaration || n.kind === Syntax.ClassExpression || n.kind === Syntax.InterfaceDeclaration || qf.is.jsConstructor(n)) &&
              this.declaredTypeOfClassOrInterface(this.symbolOfNode(n as qt.ClassLikeDeclaration | qt.InterfaceDeclaration)).thisType;
            return thisType ? append(outerAndOwnTypeParams, thisType) : outerAndOwnTypeParams;
        }
      }
    }
    baseTypeNodeOfClass(t: qt.InterfaceType): qt.ExpressionWithTypings | undefined {
      return this.effectiveBaseTypeNode(t.symbol.valueDeclaration as qt.ClassLikeDeclaration);
    }
    constructorsForTypeArgs(t: qt.Type, typeArgNodes: readonly qt.Typing[] | undefined, location: Node): readonly qt.Signature[] {
      const typeArgCount = length(typeArgNodes);
      const isJavascript = qf.is.inJSFile(location);
      return qu.filter(this.signaturesOfType(t, qt.SignatureKind.Construct), (sig) => (isJavascript || typeArgCount >= this.minTypeArgCount(sig.typeParams)) && typeArgCount <= length(sig.typeParams));
    }
    instantiatedConstructorsForTypeArgs(t: qt.Type, typeArgNodes: readonly qt.Typing[] | undefined, location: Node): readonly qt.Signature[] {
      const signatures = this.constructorsForTypeArgs(t, typeArgNodes, location);
      const typeArgs = map(typeArgNodes, this.typeFromTypeNode);
      return sameMap<qt.Signature>(signatures, (sig) => (some(sig.typeParams) ? this.signatureInstantiation(sig, typeArgs, qf.is.inJSFile(location)) : sig));
    }
    baseConstructorTypeOfClass(t: qt.InterfaceType): qt.Type {
      if (!type.resolvedBaseConstructorType) {
        const decl = <qt.ClassLikeDeclaration>type.symbol.valueDeclaration;
        const extended = this.effectiveBaseTypeNode(decl);
        const baseTypeNode = this.baseTypeNodeOfClass(t);
        if (!baseTypeNode) return (t.resolvedBaseConstructorType = undefinedType);
        if (!pushTypeResolution(t, TypeSystemPropertyName.ResolvedBaseConstructorType)) return errorType;
        const baseConstructorType = qf.check.expression(baseTypeNode.expression);
        if (extended && baseTypeNode !== extended) {
          qu.assert(!extended.typeArgs);
          qf.check.expression(extended.expression);
        }
        if (baseConstructorType.flags & (TypeFlags.Object | qt.TypeFlags.Intersection)) resolveStructuredTypeMembers(<qt.ObjectType>baseConstructorType);
        if (!popTypeResolution()) {
          error(t.symbol.valueDeclaration, qd.msgs._0_is_referenced_directly_or_indirectly_in_its_own_base_expression, t.symbol.symbolToString());
          return (t.resolvedBaseConstructorType = errorType);
        }
        if (!(baseConstructorType.flags & qt.TypeFlags.Any) && baseConstructorType !== nullWideningType && !qf.is.constructorType(baseConstructorType)) {
          const err = error(baseTypeNode.expression, qd.msgs.Type_0_is_not_a_constructor_function_type, typeToString(baseConstructorType));
          if (baseConstructorType.flags & qt.TypeFlags.TypeParam) {
            const constraint = this.constraintFromTypeParam(baseConstructorType);
            let ctorReturn: qt.Type = unknownType;
            if (constraint) {
              const ctorSig = this.signaturesOfType(constraint, qt.SignatureKind.Construct);
              if (ctorSig[0]) ctorReturn = this.returnTypeOfSignature(ctorSig[0]);
            }
            addRelatedInfo(
              err,
              qf.create.diagForNode(
                baseConstructorType.symbol.declarations[0],
                qd.msgs.Did_you_mean_for_0_to_be_constrained_to_type_new_args_Colon_any_1,
                baseConstructorType.symbol.symbolToString(),
                typeToString(ctorReturn)
              )
            );
          }
          return (t.resolvedBaseConstructorType = errorType);
        }
        t.resolvedBaseConstructorType = baseConstructorType;
      }
      return t.resolvedBaseConstructorType;
    }
    implementsTypes(t: qt.InterfaceType): qt.BaseType[] {
      let resolvedImplementsTypes: qt.BaseType[] = qu.empty;
      for (const declaration of t.symbol.declarations) {
        const implementsTypeNodes = this.effectiveImplementsTypeNodes(declaration as qt.ClassLikeDeclaration);
        if (!implementsTypeNodes) continue;
        for (const n of implementsTypeNodes) {
          const implementsType = this.typeFromTypeNode(n);
          if (implementsType !== errorType) {
            if (resolvedImplementsTypes === qu.empty) resolvedImplementsTypes = [<qt.ObjectType>implementsType];
            else {
              resolvedImplementsTypes.push(implementsType);
            }
          }
        }
      }
      return resolvedImplementsTypes;
    }
    baseTypes(t: qt.InterfaceType): qt.BaseType[] {
      if (!type.resolvedBaseTypes) {
        if (t.objectFlags & ObjectFlags.Tuple) t.resolvedBaseTypes = [qf.create.arrayType(this.unionType(t.typeParams || qu.empty), (<qt.TupleType>type).readonly)];
        else if (t.symbol.flags & (SymbolFlags.Class | SymbolFlags.Interface)) {
          if (t.symbol.flags & SymbolFlags.Class) resolveBaseTypesOfClass(t);
          if (t.symbol.flags & SymbolFlags.Interface) resolveBaseTypesOfInterface(t);
        } else {
          qu.fail('type must be class or interface');
        }
      }
      return t.resolvedBaseTypes;
    }
    baseTypeOfEnumLiteralType(t: qt.Type) {
      return t.flags & qt.TypeFlags.EnumLiteral && !(t.flags & qt.TypeFlags.Union) ? this.declaredTypeOfSymbol(this.parentOfSymbol(t.symbol)!) : type;
    }
    propertyNameFromType(t: qt.StringLiteralType | qt.NumberLiteralType | qt.UniqueESSymbolType): qu.__String {
      if (t.flags & qt.TypeFlags.UniqueESSymbol) return (<qt.UniqueESSymbolType>type).escName;
      if (t.flags & (TypeFlags.StringLiteral | qt.TypeFlags.NumberLiteral)) return qy.get.escUnderscores('' + (<qt.StringLiteralType | qt.NumberLiteralType>type).value);
      return qu.fail();
    }
    resolvedMembersOrExportsOfSymbol(symbol: qt.Symbol, resolutionKind: MembersOrExportsResolutionKind): EscapedMap<qt.Symbol> {
      const ls = symbol.this.links();
      if (!ls[resolutionKind]) {
        const isStatic = resolutionKind === MembersOrExportsResolutionKind.resolvedExports;
        const earlySymbols = !isStatic ? symbol.members : symbol.flags & SymbolFlags.Module ? symbol.this.exportsOfModuleWorker() : symbol.exports;
        ls[resolutionKind] = earlySymbols || qu.emptySymbols;
        const lateSymbols = new qc.SymbolTable<qt.TransientSymbol>();
        for (const decl of symbol.declarations) {
          const members = this.declaration.members(decl);
          if (members) {
            for (const member of members) {
              if (isStatic === qf.has.staticModifier(member) && qf.has.lateBindableName(member)) lateBindMember(symbol, earlySymbols, lateSymbols, member);
            }
          }
        }
        const assignments = symbol.assignmentDeclarations;
        if (assignments) {
          const decls = arrayFrom(assignments.values());
          for (const member of decls) {
            const assignmentKind = this.assignmentDeclarationKind(member as qt.BinaryExpression | qt.CallExpression);
            const isInstanceMember =
              assignmentKind === qt.AssignmentDeclarationKind.PrototypeProperty ||
              assignmentKind === qt.AssignmentDeclarationKind.ThisProperty ||
              assignmentKind === qt.AssignmentDeclarationKind.ObjectDefinePrototypeProperty ||
              assignmentKind === qt.AssignmentDeclarationKind.Prototype;
            if (isStatic === !isInstanceMember && qf.has.lateBindableName(member)) lateBindMember(symbol, earlySymbols, lateSymbols, member);
          }
        }
        ls[resolutionKind] = earlySymbols?.combine(lateSymbols) || qu.emptySymbols;
      }
      return ls[resolutionKind]!;
    }
    typeWithThisArg(t: qt.Type, thisArg?: qt.Type, needApparentType?: boolean): qt.Type {
      if (this.objectFlags(t) & ObjectFlags.Reference) {
        const target = (<qt.TypeReference>type).target;
        const typeArgs = this.typeArgs(<qt.TypeReference>type);
        if (length(target.typeParams) === length(typeArgs)) {
          const ref = qf.create.typeReference(target, concatenate(typeArgs, [thisArg || target.thisType!]));
          return needApparentType ? this.apparentType(ref) : ref;
        }
      } else if (t.flags & qt.TypeFlags.Intersection) {
        return this.intersectionType(map((<qt.IntersectionType>type).types, (t) => this.typeWithThisArg(t, thisArg, needApparentType)));
      }
      return needApparentType ? this.apparentType(t) : type;
    }
    defaultConstructSignatures(classType: qt.InterfaceType): qt.Signature[] {
      const baseConstructorType = this.baseConstructorTypeOfClass(classType);
      const baseSignatures = this.signaturesOfType(baseConstructorType, qt.SignatureKind.Construct);
      if (baseSignatures.length === 0) return [qf.create.signature(undefined, classType.localTypeParams, undefined, qu.empty, classType, undefined, 0, qt.SignatureFlags.None)];
      const baseTypeNode = this.baseTypeNodeOfClass(classType)!;
      const isJavaScript = qf.is.inJSFile(baseTypeNode);
      const typeArgs = typeArgsFromTypingReference(baseTypeNode);
      const typeArgCount = length(typeArgs);
      const result: qt.Signature[] = [];
      for (const baseSig of baseSignatures) {
        const minTypeArgCount = this.minTypeArgCount(baseSig.typeParams);
        const typeParamCount = length(baseSig.typeParams);
        if (isJavaScript || (typeArgCount >= minTypeArgCount && typeArgCount <= typeParamCount)) {
          const sig = typeParamCount ? qf.create.signatureInstantiation(baseSig, fillMissingTypeArgs(typeArgs, baseSig.typeParams, minTypeArgCount, isJavaScript)) : cloneSignature(baseSig);
          sig.typeParams = classType.localTypeParams;
          sig.resolvedReturn = classType;
          result.push(sig);
        }
      }
      return result;
    }
    unions(signatureLists: readonly (readonly qt.Signature[])[]): qt.Signature[] {
      let result: qt.Signature[] | undefined;
      let indexWithLengthOverOne: number | undefined;
      for (let i = 0; i < signatureLists.length; i++) {
        if (signatureLists[i].length === 0) return qu.empty;
        if (signatureLists[i].length > 1) indexWithLengthOverOne = indexWithLengthOverOne === undefined ? i : -1;
        for (const signature of signatureLists[i]) {
          if (!result || !findMatchingSignature(result, signature, true)) {
            const unions = findMatchingSignatures(signatureLists, signature, i);
            if (unions) {
              let s = signature;
              if (unions.length > 1) {
                let thisParam = signature.thisParam;
                const firstThisParamOfUnionSignatures = forEach(unions, (sig) => sig.thisParam);
                if (firstThisParamOfUnionSignatures) {
                  const thisType = this.intersectionType(mapDefined(unions, (sig) => sig.thisParam && this.typeOfSymbol(sig.thisParam)));
                  thisParam = qf.create.symbolWithType(firstThisParamOfUnionSignatures, thisType);
                }
                s = qf.create.unionSignature(signature, unions);
                s.thisParam = thisParam;
              }
              (result || (result = [])).push(s);
            }
          }
        }
      }
      if (!qu.length(result) && indexWithLengthOverOne !== -1) {
        const masterList = signatureLists[indexWithLengthOverOne !== undefined ? indexWithLengthOverOne : 0];
        let results: qt.Signature[] | undefined = masterList.slice();
        for (const signatures of signatureLists) {
          if (signatures !== masterList) {
            const signature = signatures[0];
            qu.assert(!!signature, 'getUnionSignatures bails early on qu.empty signature lists and should not have qu.empty lists on second pass');
            results = signature.typeParams && qu.some(results, (s) => !!s.typeParams) ? undefined : map(results, (sig) => combineSignaturesOfUnionMembers(sig, signature));
            if (!results) break;
          }
        }
        result = results;
      }
      return result || qu.empty;
    }
    unionIndexInfo(types: readonly qt.Type[], kind: IndexKind): qt.IndexInfo | undefined {
      const indexTypes: qt.Type[] = [];
      let isAnyReadonly = false;
      for (const type of types) {
        const indexInfo = this.indexInfoOfType(this.apparentType(t), kind);
        if (!indexInfo) return;
        indexTypes.push(indexInfo.type);
        isAnyReadonly = isAnyReadonly || indexInfo.isReadonly;
      }
      return qf.create.indexInfo(this.unionType(indexTypes, UnionReduction.Subtype), isAnyReadonly);
    }
    lowerBoundOfKeyType(t: qt.Type): qt.Type {
      if (t.flags & (TypeFlags.Any | qt.TypeFlags.Primitive)) return type;
      if (t.flags & qt.TypeFlags.Index) return this.indexType(this.apparentType((<qt.IndexType>type).type));
      if (t.flags & qt.TypeFlags.Conditional) {
        if ((<qt.ConditionalType>type).root.isDistributive) {
          const checkType = (<qt.ConditionalType>type).checkType;
          const constraint = this.lowerBoundOfKeyType(checkType);
          if (constraint !== checkType)
            return this.conditionalTypeInstantiation(<qt.ConditionalType>type, prependTypeMapping((<qt.ConditionalType>type).root.checkType, constraint, (<qt.ConditionalType>type).mapper));
        }
        return type;
      }
      if (t.flags & qt.TypeFlags.Union) return this.unionType(sameMap((<qt.UnionType>type).types, getLowerBoundOfKeyType));
      if (t.flags & qt.TypeFlags.Intersection) return this.intersectionType(sameMap((<qt.UnionType>type).types, getLowerBoundOfKeyType));
      return neverType;
    }
    typeOfMappedSymbol(s: qt.MappedSymbol) {
      if (!s.type) {
        if (!pushTypeResolution(s, TypeSystemPropertyName.Type)) return errorType;
        const templateType = this.templateTypeFromMappedType(<qt.MappedType>s.mappedType.target || s.mappedType);
        const propType = instantiateType(templateType, s.mapper);
        let type =
          strictNullChecks && s.flags & SymbolFlags.Optional && !maybeTypeOfKind(propType, qt.TypeFlags.Undefined | qt.TypeFlags.Void)
            ? this.optionalType(propType)
            : s.checkFlags & qt.CheckFlags.StripOptional
            ? this.typeWithFacts(propType, TypeFacts.NEUndefined)
            : propType;
        if (!popTypeResolution()) {
          error(currentNode, qd.msgs.Type_of_property_0_circularly_references_itself_in_mapped_type_1, s.sToString(), typeToString(s.mappedType));
          type = errorType;
        }
        s.type = type;
        s.mapper = undefined!;
      }
      return s.type;
    }
    typeParamFromMappedType(t: qt.MappedType) {
      return t.typeParam || (t.typeParam = this.declaredTypeOfTypeParam(this.symbolOfNode(t.declaration.typeParam)));
    }
    constraintTypeFromMappedType(t: qt.MappedType) {
      return t.constraintType || (t.constraintType = this.constraintOfTypeParam(this.typeParamFromMappedType(t)) || errorType);
    }
    templateTypeFromMappedType(t: qt.MappedType) {
      return (
        t.templateType ||
        (t.templateType = t.declaration.type
          ? instantiateType(addOptionality(this.typeFromTypeNode(t.declaration.type), !!(this.mappedTypeModifiers(t) & MappedTypeModifiers.IncludeOptional)), t.mapper)
          : errorType)
      );
    }
    constraintDeclarationForMappedType(t: qt.MappedType) {
      return this.effectiveConstraintOfTypeParam(t.declaration.typeParam);
    }
    modifiersTypeFromMappedType(t: qt.MappedType) {
      if (!type.modifiersType) {
        if (qf.is.mappedTypeWithKeyofConstraintDeclaration(t)) t.modifiersType = instantiateType(this.typeFromTypeNode((<qt.TypingOperator>this.constraintDeclarationForMappedType(t)).type), t.mapper);
        else {
          const declaredType = <qt.MappedType>this.typeFromMappedTyping(t.declaration);
          const constraint = this.constraintTypeFromMappedType(declaredType);
          const extendedConstraint = constraint && constraint.flags & qt.TypeFlags.TypeParam ? this.constraintOfTypeParam(<qt.TypeParam>constraint) : constraint;
          t.modifiersType = extendedConstraint && extendedConstraint.flags & qt.TypeFlags.Index ? instantiateType((<qt.IndexType>extendedConstraint).type, t.mapper) : unknownType;
        }
      }
      return t.modifiersType;
    }
    mappedTypeModifiers(t: qt.MappedType): MappedTypeModifiers {
      const declaration = t.declaration;
      return (
        (declaration.readonlyToken ? (declaration.readonlyToken.kind === Syntax.MinusToken ? MappedTypeModifiers.ExcludeReadonly : MappedTypeModifiers.IncludeReadonly) : 0) |
        (declaration.questionToken ? (declaration.questionToken.kind === Syntax.MinusToken ? MappedTypeModifiers.ExcludeOptional : MappedTypeModifiers.IncludeOptional) : 0)
      );
    }
    mappedTypeOptionality(t: qt.MappedType): number {
      const modifiers = this.mappedTypeModifiers(t);
      return modifiers & MappedTypeModifiers.ExcludeOptional ? -1 : modifiers & MappedTypeModifiers.IncludeOptional ? 1 : 0;
    }
    combinedMappedTypeOptionality(t: qt.MappedType): number {
      const optionality = this.mappedTypeOptionality(t);
      const modifiersType = this.modifiersTypeFromMappedType(t);
      return optionality || (qf.is.genericMappedType(modifiersType) ? this.mappedTypeOptionality(modifiersType) : 0);
    }
    propertiesOfObjectType(t: qt.Type): qt.Symbol[] {
      if (t.flags & qt.TypeFlags.Object) return resolveStructuredTypeMembers(<qt.ObjectType>type).properties;
      return qu.empty;
    }
    propertyOfObjectType(t: qt.Type, name: qu.__String): qt.Symbol | undefined {
      if (t.flags & qt.TypeFlags.Object) {
        const resolved = resolveStructuredTypeMembers(<qt.ObjectType>type);
        const symbol = resolved.members.get(name);
        if (symbol && symbol.isValue()) return symbol;
      }
    }
    propertiesOfUnionOrIntersectionType(t: qt.UnionOrIntersectionType): qt.Symbol[] {
      if (!type.resolvedProperties) {
        const members = new qc.SymbolTable();
        for (const current of t.types) {
          for (const prop of this.propertiesOfType(current)) {
            if (!members.has(prop.escName)) {
              const combinedProp = this.propertyOfUnionOrIntersectionType(t, prop.escName);
              if (combinedProp) members.set(prop.escName, combinedProp);
            }
          }
          if (t.flags & qt.TypeFlags.Union && !this.indexInfoOfType(current, qt.IndexKind.String) && !this.indexInfoOfType(current, qt.IndexKind.Number)) break;
        }
        t.resolvedProperties = this.namedMembers(members);
      }
      return t.resolvedProperties;
    }
    propertiesOfType(t: qt.Type): qt.Symbol[] {
      t = this.reducedApparentType(t);
      return t.flags & qt.TypeFlags.UnionOrIntersection ? this.propertiesOfUnionOrIntersectionType(<qt.UnionType>t) : this.propertiesOfObjectType(t);
    }
    allPossiblePropertiesOfTypes(types: readonly qt.Type[]): qt.Symbol[] {
      const unionType = this.unionType(types);
      if (!(unionType.flags & qt.TypeFlags.Union)) return this.augmentedPropertiesOfType(unionType);
      const props = new qc.SymbolTable();
      for (const memberType of types) {
        for (const { escName } of this.augmentedPropertiesOfType(memberType)) {
          if (!props.has(escName)) {
            const prop = qf.create.unionOrIntersectionProperty(unionType as qt.UnionType, escName);
            if (prop) props.set(escName, prop);
          }
        }
      }
      return arrayFrom(props.values());
    }
    constraintOfType(t: qt.InstantiableType | qt.UnionOrIntersectionType): qt.Type | undefined {
      return t.flags & qt.TypeFlags.TypeParam
        ? this.constraintOfTypeParam(<qt.TypeParam>type)
        : t.flags & qt.TypeFlags.IndexedAccess
        ? this.constraintOfIndexedAccess(<qt.IndexedAccessType>type)
        : t.flags & qt.TypeFlags.Conditional
        ? this.constraintOfConditionalType(<qt.ConditionalType>type)
        : this.baseConstraintOfType(t);
    }
    constraintOfTypeParam(t: qt.TypeParam): qt.Type | undefined {
      return qf.has.nonCircularBaseConstraint(typeParam) ? this.constraintFromTypeParam(typeParam) : undefined;
    }
    constraintOfIndexedAccess(t: qt.IndexedAccessType) {
      return qf.has.nonCircularBaseConstraint(t) ? this.constraintFromIndexedAccess(t) : undefined;
    }
    simplifiedTypeOrConstraint(t: qt.Type) {
      const simplified = this.simplifiedType(t, false);
      return simplified !== type ? simplified : this.constraintOfType(t);
    }
    constraintFromIndexedAccess(t: qt.IndexedAccessType) {
      const indexConstraint = this.simplifiedTypeOrConstraint(t.indexType);
      if (indexConstraint && indexConstraint !== t.indexType) {
        const indexedAccess = this.indexedAccessTypeOrUndefined(t.objectType, indexConstraint);
        if (indexedAccess) return indexedAccess;
      }
      const objectConstraint = this.simplifiedTypeOrConstraint(t.objectType);
      if (objectConstraint && objectConstraint !== t.objectType) return this.indexedAccessTypeOrUndefined(objectConstraint, t.indexType);
      return;
    }
    defaultConstraintOfConditionalType(t: qt.ConditionalType) {
      if (!type.resolvedDefaultConstraint) {
        const trueConstraint = this.inferredTrueTypeFromConditionalType(t);
        const falseConstraint = this.falseTypeFromConditionalType(t);
        t.resolvedDefaultConstraint = qf.is.typeAny(trueConstraint) ? falseConstraint : qf.is.typeAny(falseConstraint) ? trueConstraint : this.unionType([trueConstraint, falseConstraint]);
      }
      return t.resolvedDefaultConstraint;
    }
    constraintOfDistributiveConditionalType(t: qt.ConditionalType): qt.Type | undefined {
      if (t.root.isDistributive && t.restrictive !== type) {
        const simplified = this.simplifiedType(t.checkType, false);
        const constraint = simplified === t.checkType ? this.constraintOfType(simplified) : simplified;
        if (constraint && constraint !== t.checkType) {
          const instantiated = this.conditionalTypeInstantiation(t, prependTypeMapping(t.root.checkType, constraint, t.mapper));
          if (!(instantiated.flags & qt.TypeFlags.Never)) return instantiated;
        }
      }
      return;
    }
    constraintFromConditionalType(t: qt.ConditionalType) {
      return this.constraintOfDistributiveConditionalType(t) || this.defaultConstraintOfConditionalType(t);
    }
    constraintOfConditionalType(t: qt.ConditionalType) {
      return qf.has.nonCircularBaseConstraint(t) ? this.constraintFromConditionalType(t) : undefined;
    }
    effectiveConstraintOfIntersection(types: readonly qt.Type[], targetIsUnion: boolean) {
      let constraints: qt.Type[] | undefined;
      let hasDisjointDomainType = false;
      for (const t of types) {
        if (t.flags & qt.TypeFlags.Instantiable) {
          let constraint = this.constraintOfType(t);
          while (constraint && constraint.flags & (TypeFlags.TypeParam | qt.TypeFlags.Index | qt.TypeFlags.Conditional)) {
            constraint = this.constraintOfType(constraint);
          }
          if (constraint) {
            constraints = append(constraints, constraint);
            if (targetIsUnion) constraints = append(constraints, t);
          }
        } else if (t.flags & qt.TypeFlags.DisjointDomains) hasDisjointDomainType = true;
      }
      if (constraints && (targetIsUnion || hasDisjointDomainType)) {
        if (hasDisjointDomainType) {
          for (const t of types) {
            if (t.flags & qt.TypeFlags.DisjointDomains) constraints = append(constraints, t);
          }
        }
        return this.intersectionType(constraints);
      }
      return;
    }
    baseConstraintOfType(t: qt.Type): qt.Type | undefined {
      if (t.flags & (TypeFlags.InstantiableNonPrimitive | qt.TypeFlags.UnionOrIntersection)) {
        const constraint = this.resolvedBaseConstraint(<qt.InstantiableType | qt.UnionOrIntersectionType>type);
        return constraint !== noConstraintType && constraint !== circularConstraintType ? constraint : undefined;
      }
      return t.flags & qt.TypeFlags.Index ? keyofConstraintType : undefined;
    }
    baseConstraintOrType(t: qt.Type) {
      return this.baseConstraintOfType(t) || type;
    }
    resolvedBaseConstraint(t: qt.InstantiableType | qt.UnionOrIntersectionType): qt.Type {
      let nonTerminating = false;
      return t.resolvedBaseConstraint || (t.resolvedBaseConstraint = this.typeWithThisArg(this.immediateBaseConstraint(t), type));
      const immediateBaseConstraint = (t: qt.Type): qt.Type => {
        if (!t.immediateBaseConstraint) {
          if (!pushTypeResolution(t, TypeSystemPropertyName.ImmediateBaseConstraint)) return circularConstraintType;
          if (constraintDepth >= 50) {
            error(currentNode, qd.msgs.Type_instantiation_is_excessively_deep_and_possibly_infinite);
            nonTerminating = true;
            return (t.immediateBaseConstraint = noConstraintType);
          }
          constraintDepth++;
          let result = computeBaseConstraint(this.simplifiedType(t, false));
          constraintDepth--;
          if (!popTypeResolution()) {
            if (t.flags & qt.TypeFlags.TypeParam) {
              const errorNode = this.constraintDeclaration(<qt.TypeParam>t);
              if (errorNode) {
                const diagnostic = error(errorNode, qd.msgs.Type_param_0_has_a_circular_constraint, typeToString(t));
                if (currentNode && !qf.is.descendantOf(errorNode, currentNode) && !qf.is.descendantOf(currentNode, errorNode))
                  addRelatedInfo(diagnostic, qf.create.diagForNode(currentNode, qd.msgs.Circularity_originates_in_type_at_this_location));
              }
            }
            result = circularConstraintType;
          }
          if (nonTerminating) result = circularConstraintType;
          t.immediateBaseConstraint = result || noConstraintType;
        }
        return t.immediateBaseConstraint;
      };
      const baseConstraint = (t: qt.Type): qt.Type | undefined => {
        const c = this.immediateBaseConstraint(t);
        return c !== noConstraintType && c !== circularConstraintType ? c : undefined;
      };
      const computeBaseConstraint = (t: qt.Type): qt.Type | undefined => {
        if (t.flags & qt.TypeFlags.TypeParam) {
          const constraint = this.constraintFromTypeParam(<qt.TypeParam>t);
          return (t as qt.TypeParam).isThisType || !constraint ? constraint : this.baseConstraint(constraint);
        }
        if (t.flags & qt.TypeFlags.UnionOrIntersection) {
          const types = (<qt.UnionOrIntersectionType>t).types;
          const baseTypes: qt.Type[] = [];
          for (const type of types) {
            const baseType = this.baseConstraint(t);
            if (baseType) baseTypes.push(baseType);
          }
          return t.flags & qt.TypeFlags.Union && baseTypes.length === types.length
            ? this.unionType(baseTypes)
            : t.flags & qt.TypeFlags.Intersection && baseTypes.length
            ? this.intersectionType(baseTypes)
            : undefined;
        }
        if (t.flags & qt.TypeFlags.Index) return keyofConstraintType;
        if (t.flags & qt.TypeFlags.IndexedAccess) {
          const baseObjectType = this.baseConstraint((<qt.IndexedAccessType>t).objectType);
          const baseIndexType = this.baseConstraint((<qt.IndexedAccessType>t).indexType);
          const baseIndexedAccess = baseObjectType && baseIndexType && this.indexedAccessTypeOrUndefined(baseObjectType, baseIndexType);
          return baseIndexedAccess && this.baseConstraint(baseIndexedAccess);
        }
        if (t.flags & qt.TypeFlags.Conditional) {
          const constraint = this.constraintFromConditionalType(<qt.ConditionalType>t);
          constraintDepth++;
          const result = constraint && this.baseConstraint(constraint);
          constraintDepth--;
          return result;
        }
        if (t.flags & qt.TypeFlags.Substitution) return this.baseConstraint((<qt.SubstitutionType>t).substitute);
        return t;
      };
    }
    apparentTypeOfIntersectionType(t: qt.IntersectionType) {
      return t.resolvedApparentType || (t.resolvedApparentType = this.typeWithThisArg(t, type, true));
    }
    resolvedTypeParamDefault(t: qt.TypeParam): qt.Type | undefined {
      if (!typeParam.default) {
        if (typeParam.target) {
          const targetDefault = this.resolvedTypeParamDefault(typeParam.target);
          typeParam.default = targetDefault ? instantiateType(targetDefault, typeParam.mapper) : noConstraintType;
        } else {
          typeParam.default = resolvingDefaultType;
          const defaultDeclaration = typeParam.symbol && forEach(typeParam.symbol.declarations, (decl) => decl.kind === Syntax.TypeParamDeclaration && decl.default);
          const defaultType = defaultDeclaration ? this.typeFromTypeNode(defaultDeclaration) : noConstraintType;
          if (typeParam.default === resolvingDefaultType) typeParam.default = defaultType;
        }
      } else if (typeParam.default === resolvingDefaultType) typeParam.default = circularConstraintType;
      return typeParam.default;
    }
    defaultFromTypeParam(t: qt.TypeParam): qt.Type | undefined {
      const r = this.resolvedTypeParamDefault(t);
      return r !== noConstraintType && r !== circularConstraintType ? r : undefined;
    }
    apparentTypeOfMappedType(t: qt.MappedType) {
      return t.resolvedApparentType || (t.resolvedApparentType = this.resolvedApparentTypeOfMappedType(t));
    }
    resolvedApparentTypeOfMappedType(t: qt.MappedType) {
      const r = this.homomorphicTypeVariable(t);
      if (r) {
        const c = this.constraintOfTypeParam(r);
        if (c && (qf.is.arrayType(c) || qf.is.tupleType(c))) return instantiateType(t, prependTypeMapping(r, c, t.mapper));
      }
      return t;
    }
    apparentType(t: qt.Type): qt.Type {
      const t = t.flags & qt.TypeFlags.Instantiable ? this.baseConstraintOfType(t) || unknownType : type;
      return this.objectFlags(t) & ObjectFlags.Mapped
        ? this.apparentTypeOfMappedType(<qt.MappedType>t)
        : t.flags & qt.TypeFlags.Intersection
        ? this.apparentTypeOfIntersectionType(<qt.IntersectionType>t)
        : t.flags & qt.TypeFlags.StringLike
        ? globalStringType
        : t.flags & qt.TypeFlags.NumberLike
        ? globalNumberType
        : t.flags & qt.TypeFlags.BigIntLike
        ? this.globalBigIntType(true)
        : t.flags & qt.TypeFlags.BooleanLike
        ? globalBooleanType
        : t.flags & qt.TypeFlags.ESSymbolLike
        ? this.globalESSymbolType(true)
        : t.flags & qt.TypeFlags.NonPrimitive
        ? qu.emptyObjectType
        : t.flags & qt.TypeFlags.Index
        ? keyofConstraintType
        : t.flags & qt.TypeFlags.Unknown && !strictNullChecks
        ? qu.emptyObjectType
        : t;
    }
    reducedApparentType(t: qt.Type): qt.Type {
      return this.reducedType(this.apparentType(this.reducedType(t)));
    }
    unionOrIntersectionProperty(t: qt.UnionOrIntersectionType, name: qu.__String): qt.Symbol | undefined {
      const properties = t.propertyCache || (t.propertyCache = new qc.SymbolTable());
      let property = properties.get(name);
      if (!property) {
        property = qf.create.unionOrIntersectionProperty(t, name);
        if (property) properties.set(name, property);
      }
      return property;
    }
    propertyOfUnionOrIntersectionType(t: qt.UnionOrIntersectionType, name: qu.__String): qt.Symbol | undefined {
      const property = this.unionOrIntersectionProperty(t, name);
      return property && !(this.checkFlags(property) & qt.CheckFlags.ReadPartial) ? property : undefined;
    }
    reducedType(t: qt.Type): qt.Type {
      if (t.flags & qt.TypeFlags.Union && (<qt.UnionType>type).objectFlags & ObjectFlags.ContainsIntersections)
        return (<qt.UnionType>type).resolvedReducedType || ((<qt.UnionType>type).resolvedReducedType = this.reducedUnionType(<qt.UnionType>type));
      else if (t.flags & qt.TypeFlags.Intersection) {
        if (!((<qt.IntersectionType>type).objectFlags & ObjectFlags.IsNeverIntersectionComputed)) {
          (<qt.IntersectionType>type).objectFlags |=
            ObjectFlags.IsNeverIntersectionComputed | (some(this.propertiesOfUnionOrIntersectionType(<qt.IntersectionType>type), isNeverReducedProperty) ? ObjectFlags.IsNeverIntersection : 0);
        }
        return (<qt.IntersectionType>type).objectFlags & ObjectFlags.IsNeverIntersection ? neverType : type;
      }
      return type;
    }
    reducedUnionType(unionType: qt.UnionType) {
      const reducedTypes = sameMap(unionType.types, getReducedType);
      if (reducedTypes === unionType.types) return unionType;
      const reduced = this.unionType(reducedTypes);
      if (reduced.flags & qt.TypeFlags.Union) (<qt.UnionType>reduced).resolvedReducedType = reduced;
      return reduced;
    }
    propertyOfType(t: qt.Type, name: qu.__String): qt.Symbol | undefined {
      type = this.reducedApparentType(t);
      if (t.flags & qt.TypeFlags.Object) {
        const resolved = resolveStructuredTypeMembers(<qt.ObjectType>type);
        const s = resolved.members.get(name);
        if (s && s.isValue()) return s;
        const functionType =
          resolved === anyFunctionType ? globalFunctionType : resolved.callSignatures.length ? globalCallableFunctionType : resolved.constructSignatures.length ? globalNewableFunctionType : undefined;
        if (functionType) {
          const s = this.propertyOfObjectType(functionType, name);
          if (s) return s;
        }
        return this.propertyOfObjectType(globalObjectType, name);
      }
      if (t.flags & qt.TypeFlags.UnionOrIntersection) return this.propertyOfUnionOrIntersectionType(<qt.UnionOrIntersectionType>type, name);
      return;
    }
    signaturesOfStructuredType(t: qt.Type, kind: qt.SignatureKind): readonly qt.Signature[] {
      if (t.flags & qt.TypeFlags.StructuredType) {
        const resolved = resolveStructuredTypeMembers(<qt.ObjectType>type);
        return kind === qt.SignatureKind.Call ? resolved.callSignatures : resolved.constructSignatures;
      }
      return qu.empty;
    }
    signaturesOfType(t: qt.Type, kind: qt.SignatureKind): readonly qt.Signature[] {
      return this.signaturesOfStructuredType(this.reducedApparentType(t), kind);
    }
    indexInfoOfStructuredType(t: qt.Type, kind: IndexKind): qt.IndexInfo | undefined {
      if (t.flags & qt.TypeFlags.StructuredType) {
        const resolved = resolveStructuredTypeMembers(<qt.ObjectType>type);
        return kind === qt.IndexKind.String ? resolved.stringIndexInfo : resolved.numberIndexInfo;
      }
    }
    indexTypeOfStructuredType(t: qt.Type, kind: IndexKind): qt.Type | undefined {
      const info = this.indexInfoOfStructuredType(t, kind);
      return info && info.type;
    }
    indexInfoOfType(t: qt.Type, kind: IndexKind): qt.IndexInfo | undefined {
      return this.indexInfoOfStructuredType(this.reducedApparentType(t), kind);
    }
    indexTypeOfType(t: qt.Type, kind: IndexKind): qt.Type | undefined {
      return this.indexTypeOfStructuredType(this.reducedApparentType(t), kind);
    }
    implicitIndexTypeOfType(t: qt.Type, kind: IndexKind): qt.Type | undefined {
      if (qf.is.objectTypeWithInferableIndex(t)) {
        const propTypes: qt.Type[] = [];
        for (const prop of this.propertiesOfType(t)) {
          if (kind === qt.IndexKind.String || qt.NumericLiteral.name(prop.escName)) propTypes.push(this.typeOfSymbol(prop));
        }
        if (kind === qt.IndexKind.String) append(propTypes, this.indexTypeOfType(t, qt.IndexKind.Number));
        if (propTypes.length) return this.unionType(propTypes);
      }
      return;
    }
    typeParamsFromDeclaration(declaration: qt.DeclarationWithTypeParams): qt.TypeParam[] | undefined {
      let result: qt.TypeParam[] | undefined;
      for (const n of this.effectiveTypeParamDeclarations(declaration)) {
        result = appendIfUnique(result, this.declaredTypeOfTypeParam(n.symbol));
      }
      return result;
    }
    minTypeArgCount(typeParams: readonly qt.TypeParam[] | undefined): number {
      let minTypeArgCount = 0;
      if (typeParams) {
        for (let i = 0; i < typeParams.length; i++) {
          if (!qf.has.typeParamDefault(typeParams[i])) minTypeArgCount = i + 1;
        }
      }
      return minTypeArgCount;
    }
    signatureFromDeclaration(declaration: qt.SignatureDeclaration | qt.DocSignature): qt.Signature {
      const links = this.nodeLinks(declaration);
      if (!links.resolvedSignature) {
        const params: qt.Symbol[] = [];
        let flags = qt.SignatureFlags.None;
        let minArgCount = 0;
        let thisParam: qt.Symbol | undefined;
        let hasThisParam = false;
        const iife = this.immediatelyInvokedFunctionExpression(declaration);
        const isJSConstructSignature = qf.is.doc.constructSignature(declaration);
        const isUntypedSignatureInJSFile =
          !iife && qf.is.inJSFile(declaration) && qf.is.valueSignatureDeclaration(declaration) && !qf.get.doc.withParamTags(declaration) && !qf.get.doc.type(declaration);
        if (isUntypedSignatureInJSFile) flags |= qt.SignatureFlags.IsUntypedSignatureInJSFile;
        for (let i = isJSConstructSignature ? 1 : 0; i < declaration.params.length; i++) {
          const param = declaration.params[i];
          let paramSymbol = param.symbol;
          const type = param.kind === Syntax.DocParamTag ? param.typeExpression && param.typeExpression.type : param.type;
          if (paramSymbol && !!(paramSymbol.flags & SymbolFlags.Property) && !param.name.kind === Syntax.BindingPattern) {
            const resolvedSymbol = resolveName(param, paramSymbol.escName, SymbolFlags.Value, undefined, undefined, false);
            paramSymbol = resolvedSymbol!;
          }
          if (i === 0 && paramSymbol.escName === InternalSymbol.This) {
            hasThisParam = true;
            thisParam = param.symbol;
          } else {
            params.push(paramSymbol);
          }
          if (type && t.kind === Syntax.LiteralTyping) flags |= qt.SignatureFlags.HasLiteralTypes;
          const isOptionalParam =
            qf.is.optionalDocParamTag(param) || param.initer || param.questionToken || param.dot3Token || (iife && params.length > iife.args.length && !type) || qf.is.docOptionalParam(param);
          if (!isOptionalParam) minArgCount = params.length;
        }
        if ((declaration.kind === Syntax.GetAccessor || declaration.kind === Syntax.SetAccessor) && !qf.has.nonBindableDynamicName(declaration) && (!hasThisParam || !thisParam)) {
          const otherKind = declaration.kind === Syntax.GetAccessor ? Syntax.SetAccessor : Syntax.GetAccessor;
          const other = this.symbolOfNode(declaration).declarationOfKind<qt.AccessorDeclaration>(otherKind);
          if (other) thisParam = this.annotatedAccessorThisNodeKind(ParamDeclaration, other);
        }
        const classType = declaration.kind === Syntax.Constructor ? this.declaredTypeOfClassOrInterface(this.mergedSymbol((<qt.ClassDeclaration>declaration.parent).symbol)) : undefined;
        const typeParams = classType ? classType.localTypeParams : this.typeParamsFromDeclaration(declaration);
        if (qf.has.restParam(declaration) || (qf.is.inJSFile(declaration) && maybeAddJsSyntheticRestParam(declaration, params))) flags |= qt.SignatureFlags.HasRestParam;
        links.resolvedSignature = qf.create.signature(declaration, typeParams, thisParam, params, undefined, undefined, minArgCount, flags);
      }
      return links.resolvedSignature;
    }
    signatureOfTypeTag(n: qt.SignatureDeclaration | qt.DocSignature) {
      if (!(qf.is.inJSFile(n) && qf.is.functionLikeDeclaration(n))) return;
      const typeTag = qf.get.doc.typeTag(n);
      const s = typeTag && typeTag.typeExpression && this.singleCallSignature(this.typeFromTypeNode(typeTag.typeExpression));
      return s && s.erased();
    }
    returnTypeOfTypeTag(n: qt.SignatureDeclaration | qt.DocSignature) {
      const signature = this.signatureOfTypeTag(n);
      return signature && this.returnTypeOfSignature(signature);
    }
    signaturesOfSymbol(symbol: qt.Symbol | undefined): qt.Signature[] {
      if (!symbol) return qu.empty;
      const result: qt.Signature[] = [];
      for (let i = 0; i < symbol.declarations.length; i++) {
        const decl = symbol.declarations[i];
        if (!qf.is.functionLike(decl)) continue;
        if (i > 0 && (decl as qt.FunctionLikeDeclaration).body) {
          const previous = symbol.declarations[i - 1];
          if (decl.parent === previous.parent && decl.kind === previous.kind && decl.pos === previous.end) continue;
        }
        result.push(this.signatureFromDeclaration(decl));
      }
      return result;
    }
    returnTypeFromAnnotation(declaration: qt.SignatureDeclaration | qt.DocSignature) {
      if (declaration.kind === Syntax.Constructor) return this.declaredTypeOfClassOrInterface(this.mergedSymbol((<qt.ClassDeclaration>declaration.parent).symbol));
      if (qf.is.doc.constructSignature(declaration)) return this.typeFromTypeNode((declaration.params[0] as qt.ParamDeclaration).type!);
      const typeNode = this.effectiveReturnTypeNode(declaration);
      if (typeNode) return this.typeFromTypeNode(typeNode);
      if (declaration.kind === Syntax.GetAccessor && !qf.has.nonBindableDynamicName(declaration)) {
        const docType = qf.is.inJSFile(declaration) && this.typeForDeclarationFromDocComment(declaration);
        if (docType) return docType;
        const setter = this.symbolOfNode(declaration).declarationOfKind<qt.AccessorDeclaration>(Syntax.SetAccessor);
        const setterType = this.annotatedAccessorType(setter);
        if (setterType) return setterType;
      }
      return this.returnTypeOfTypeTag(declaration);
    }
    signatureInstantiation(s: qt.Signature, typeArgs: qt.Type[] | undefined, isJavascript: boolean, inferredTypeParams?: readonly qt.TypeParam[]): qt.Signature {
      const instantiatedSignature = this.signatureInstantiationWithoutFillingInTypeArgs(
        signature,
        fillMissingTypeArgs(typeArgs, signature.typeParams, this.minTypeArgCount(signature.typeParams), isJavascript)
      );
      if (inferredTypeParams) {
        const returnSignature = this.singleCallOrConstructSignature(this.returnTypeOfSignature(instantiatedSignature));
        if (returnSignature) {
          const newReturnSignature = cloneSignature(returnSignature);
          newReturnSignature.typeParams = inferredTypeParams;
          const newInstantiatedSignature = cloneSignature(instantiatedSignature);
          newInstantiatedSignature.resolvedReturn = this.orCreateTypeFromSignature(newReturnSignature);
          return newInstantiatedSignature;
        }
      }
      return instantiatedSignature;
    }
    signatureInstantiationWithoutFillingInTypeArgs(s: qt.Signature, typeArgs: readonly qt.Type[] | undefined): qt.Signature {
      const instantiations = signature.instantiations || (signature.instantiations = new qu.QMap<qt.Signature>());
      const id = this.typeListId(typeArgs);
      let instantiation = instantiations.get(id);
      if (!instantiation) instantiations.set(id, (instantiation = qf.create.signatureInstantiation(signature, typeArgs)));
      return instantiation;
    }
    orCreateTypeFromSignature(s: qt.Signature): qt.ObjectType {
      if (!signature.isolatedSignatureType) {
        const kind = signature.declaration ? signature.declaration.kind : Syntax.Unknown;
        const isConstructor = kind === Syntax.Constructor || kind === Syntax.ConstructSignature || kind === Syntax.ConstructorTyping;
        const type = qf.create.objectType(ObjectFlags.Anonymous);
        t.members = qu.emptySymbols;
        t.properties = qu.empty;
        t.callSignatures = !isConstructor ? [signature] : qu.empty;
        t.constructSignatures = isConstructor ? [signature] : qu.empty;
        signature.isolatedSignatureType = type;
      }
      return signature.isolatedSignatureType;
    }
    constraintDeclaration(t: qt.TypeParam): qt.Typing | undefined {
      return mapDefined(filter(t.symbol && t.symbol.declarations, isTypeParamDeclaration), getEffectiveConstraintOfTypeParam)[0];
    }
    inferredTypeParamConstraint(t: qt.TypeParam) {
      let inferences: qt.Type[] | undefined;
      if (typeParam.symbol) {
        for (const declaration of typeParam.symbol.declarations) {
          if (declaration.parent?.kind === Syntax.InferTyping) {
            const grandParent = declaration.parent?.parent;
            if (grandParent.kind === Syntax.TypingReference) {
              const typeReference = <qt.TypingReference>grandParent;
              const typeParams = this.typeParamsForTypeReference(typeReference);
              if (typeParams) {
                const index = typeReference.typeArgs!.indexOf(<qt.Typing>declaration.parent);
                if (index < typeParams.length) {
                  const declaredConstraint = this.constraintOfTypeParam(typeParams[index]);
                  if (declaredConstraint) {
                    const mapper = qf.create.typeMapper(typeParams, this.effectiveTypeArgs(typeReference, typeParams));
                    const constraint = instantiateType(declaredConstraint, mapper);
                    if (constraint !== typeParam) inferences = append(inferences, constraint);
                  }
                }
              }
            } else if (grandParent.kind === Syntax.Param && (<qt.ParamDeclaration>grandParent).dot3Token) {
              inferences = append(inferences, qf.create.arrayType(unknownType));
            }
          }
        }
      }
      return inferences && this.intersectionType(inferences);
    }
    constraintFromTypeParam(t: qt.TypeParam): qt.Type | undefined {
      if (!typeParam.constraint) {
        if (typeParam.target) {
          const targetConstraint = this.constraintOfTypeParam(typeParam.target);
          typeParam.constraint = targetConstraint ? instantiateType(targetConstraint, typeParam.mapper) : noConstraintType;
        } else {
          const constraintDeclaration = this.constraintDeclaration(typeParam);
          if (!constraintDeclaration) typeParam.constraint = this.inferredTypeParamConstraint(typeParam) || noConstraintType;
          else {
            let type = this.typeFromTypeNode(constraintDeclaration);
            if (t.flags & qt.TypeFlags.Any && type !== errorType) type = constraintDeclaration.parent?.parent?.kind === Syntax.MappedTyping ? keyofConstraintType : unknownType;
            typeParam.constraint = type;
          }
        }
      }
      return typeParam.constraint === noConstraintType ? undefined : typeParam.constraint;
    }
    parentSymbolOfTypeParam(t: qt.TypeParam): qt.Symbol | undefined {
      const tp = typeParam.symbol.declarationOfKind<qt.TypeParamDeclaration>(Syntax.TypeParam)!;
      const host = tp.parent?.kind === Syntax.DocTemplateTag ? this.hostSignatureFromDoc(tp.parent) : tp.parent;
      return host && this.symbolOfNode(host);
    }
    typeListId(types: readonly qt.Type[] | undefined) {
      let result = '';
      if (types) {
        const length = types.length;
        let i = 0;
        while (i < length) {
          const startId = types[i].id;
          let count = 1;
          while (i + count < length && types[i + count].id === startId + count) {
            count++;
          }
          if (result.length) result += ',';
          result += startId;
          if (count > 1) result += ':' + count;
          i += count;
        }
      }
      return result;
    }
    propagatingFlagsOfTypes(types: readonly qt.Type[], excludeKinds: qt.TypeFlags): ObjectFlags {
      let result: ObjectFlags = 0;
      for (const type of types) {
        if (!(t.flags & excludeKinds)) result |= this.objectFlags(t);
      }
      return result & ObjectFlags.PropagatingFlags;
    }
    typeArgs(t: qt.TypeReference): readonly qt.Type[] {
      if (!type.resolvedTypeArgs) {
        if (!pushTypeResolution(t, TypeSystemPropertyName.ResolvedTypeArgs)) return t.target.localTypeParams?.map(() => errorType) || qu.empty;
        const n = t.node;
        const typeArgs = !n
          ? qu.empty
          : n.kind === Syntax.TypingReference
          ? concatenate(t.target.outerTypeParams, this.effectiveTypeArgs(n, t.target.localTypeParams!))
          : n.kind === Syntax.ArrayTyping
          ? [this.typeFromTypeNode(n.elemType)]
          : map(n.elems, this.typeFromTypeNode);
        if (popTypeResolution()) t.resolvedTypeArgs = t.mapper ? instantiateTypes(typeArgs, t.mapper) : typeArgs;
        else {
          t.resolvedTypeArgs = t.target.localTypeParams?.map(() => errorType) || qu.empty;
          error(
            t.node || currentNode,
            t.target.symbol ? qd.msgs.Type_args_for_0_circularly_reference_themselves : qd.msgs.Tuple_type_args_circularly_reference_themselves,
            t.target.symbol && t.target.symbol.symbolToString()
          );
        }
      }
      return t.resolvedTypeArgs;
    }
    typeReferenceArity(t: qt.TypeReference): number {
      return length(t.target.typeParams);
    }
    typeFromClassOrInterfaceReference(n: qt.WithArgsTobj, symbol: qt.Symbol): qt.Type {
      const type = <qt.InterfaceType>this.declaredTypeOfSymbol(this.mergedSymbol(symbol));
      const typeParams = t.localTypeParams;
      if (typeParams) {
        const numTypeArgs = length(n.typeArgs);
        const minTypeArgCount = this.minTypeArgCount(typeParams);
        const isJs = qf.is.inJSFile(n);
        const isJsImplicitAny = !noImplicitAny && isJs;
        if (!isJsImplicitAny && (numTypeArgs < minTypeArgCount || numTypeArgs > typeParams.length)) {
          const missingAugmentsTag = isJs && n.kind === Syntax.ExpressionWithTypings && !n.parent?.kind === Syntax.DocAugmentsTag;
          const diag =
            minTypeArgCount === typeParams.length
              ? missingAugmentsTag
                ? qd.msgs.Expected_0_type_args_provide_these_with_an_extends_tag
                : qd.msgs.Generic_type_0_requires_1_type_arg_s
              : missingAugmentsTag
              ? qd.msgs.Expected_0_1_type_args_provide_these_with_an_extends_tag
              : qd.msgs.Generic_type_0_requires_between_1_and_2_type_args;
          const typeStr = typeToString(t, undefined, qt.TypeFormatFlags.WriteArrayAsGenericType);
          error(n, diag, typeStr, minTypeArgCount, typeParams.length);
          if (!isJs) return errorType;
        }
        if (n.kind === Syntax.TypingReference && qf.is.deferredTypingReference(<qt.TypingReference>n, length(n.typeArgs) !== typeParams.length))
          return qf.create.deferredTypeReference(<qt.GenericType>type, <qt.TypingReference>n, undefined);
        const typeArgs = concatenate(t.outerTypeParams, fillMissingTypeArgs(typeArgsFromTypingReference(n), typeParams, minTypeArgCount, isJs));
        return qf.create.typeReference(<qt.GenericType>type, typeArgs);
      }
      return qf.check.noTypeArgs(n, symbol) ? type : errorType;
    }
    typeAliasInstantiation(symbol: qt.Symbol, typeArgs: readonly qt.Type[] | undefined): qt.Type {
      const type = this.declaredTypeOfSymbol(symbol);
      const links = s.this.links(symbol);
      const typeParams = links.typeParams!;
      const id = this.typeListId(typeArgs);
      let instantiation = links.instantiations!.get(id);
      if (!instantiation) {
        links.instantiations!.set(
          id,
          (instantiation = instantiateType(
            type,
            qf.create.typeMapper(typeParams, fillMissingTypeArgs(typeArgs, typeParams, this.minTypeArgCount(typeParams), qf.is.inJSFile(symbol.valueDeclaration)))
          ))
        );
      }
      return instantiation;
    }
    typeFromTypeAliasReference(n: qt.WithArgsTobj, symbol: qt.Symbol): qt.Type {
      const type = this.declaredTypeOfSymbol(symbol);
      const typeParams = s.this.links(symbol).typeParams;
      if (typeParams) {
        const numTypeArgs = length(n.typeArgs);
        const minTypeArgCount = this.minTypeArgCount(typeParams);
        if (numTypeArgs < minTypeArgCount || numTypeArgs > typeParams.length) {
          error(
            n,
            minTypeArgCount === typeParams.length ? qd.msgs.Generic_type_0_requires_1_type_arg_s : qd.msgs.Generic_type_0_requires_between_1_and_2_type_args,
            symbol.symbolToString(),
            minTypeArgCount,
            typeParams.length
          );
          return errorType;
        }
        return this.typeAliasInstantiation(symbol, typeArgsFromTypingReference(n));
      }
      return qf.check.noTypeArgs(n, symbol) ? type : errorType;
    }
    typeReferenceName(n: qt.TypeReferenceType): qt.EntityNameOrEntityNameExpression | undefined {
      switch (n.kind) {
        case Syntax.TypingReference:
          return n.typeName;
        case Syntax.ExpressionWithTypings:
          const expr = n.expression;
          if (qf.is.entityNameExpression(expr)) return expr;
      }
      return;
    }
    typeReferenceType(n: qt.WithArgsTobj, symbol: qt.Symbol): qt.Type {
      if (symbol === unknownSymbol) return errorType;
      symbol = symbol.this.expandoSymbol() || symbol;
      if (symbol.flags & (SymbolFlags.Class | SymbolFlags.Interface)) return this.typeFromClassOrInterfaceReference(n, symbol);
      if (symbol.flags & SymbolFlags.TypeAlias) return this.typeFromTypeAliasReference(n, symbol);
      const res = tryGetDeclaredTypeOfSymbol(symbol);
      if (res) return qf.check.noTypeArgs(n, symbol) ? this.regularTypeOfLiteralType(res) : errorType;
      if (symbol.flags & SymbolFlags.Value && qf.is.docTypeReference(n)) {
        const jsdocType = this.typeFromDocValueReference(n, symbol);
        if (jsdocType) return jsdocType;
        resolveTypeReferenceName(this.typeReferenceName(n), SymbolFlags.Type);
        return this.this.typeOfSymbol();
      }
      return errorType;
    }
    typeFromDocValueReference(n: qt.WithArgsTobj, symbol: qt.Symbol): qt.Type | undefined {
      const links = this.nodeLinks(n);
      if (!links.resolvedDocType) {
        const valueType = this.this.typeOfSymbol();
        let typeType = valueType;
        if (symbol.valueDeclaration) {
          const decl = this.rootDeclaration(symbol.valueDeclaration);
          let isRequireAlias = false;
          if (decl.kind === Syntax.VariableDeclaration && decl.initer) {
            let expr = decl.initer;
            while (expr.kind === Syntax.PropertyAccessExpression) {
              expr = expr.expression;
            }
            isRequireAlias = expr.kind === Syntax.CallExpression && qf.is.requireCall(expr, true) && !!valueType.symbol;
          }
          const isImportTypeWithQualifier = n.kind === Syntax.ImportTyping && (n as qt.ImportTyping).qualifier;
          if (valueType.symbol && (isRequireAlias || isImportTypeWithQualifier)) typeType = this.typeReferenceType(n, valueType.symbol);
        }
        links.resolvedDocType = typeType;
      }
      return links.resolvedDocType;
    }
    substitutionType(baseType: qt.Type, substitute: qt.Type) {
      if (substitute.flags & qt.TypeFlags.AnyOrUnknown || substitute === baseType) return baseType;
      const id = `${this.typeId(baseType)}>${this.typeId(substitute)}`;
      const cached = substitutionTypes.get(id);
      if (cached) return cached;
      const result = <qt.SubstitutionType>qf.create.type(TypeFlags.Substitution);
      result.baseType = baseType;
      result.substitute = substitute;
      substitutionTypes.set(id, result);
      return result;
    }
    impliedConstraint(t: qt.Type, checkNode: qt.Typing, extendsNode: qt.Typing): qt.Type | undefined {
      return qf.is.unaryTupleTyping(checkNode) && qf.is.unaryTupleTyping(extendsNode)
        ? this.impliedConstraint(t, (<qt.TupleTyping>checkNode).elems[0], (<qt.TupleTyping>extendsNode).elems[0])
        : this.actualTypeVariable(this.typeFromTypeNode(checkNode)) === type
        ? this.typeFromTypeNode(extendsNode)
        : undefined;
    }
    conditionalFlowTypeOfType(t: qt.Type, n: Node) {
      let constraints: qt.Type[] | undefined;
      while (n && !qf.is.statement(n) && n.kind !== Syntax.DocComment) {
        const parent = n.parent;
        if (parent?.kind === Syntax.ConditionalTyping && n === (<qt.ConditionalTyping>parent).trueType) {
          const constraint = this.impliedConstraint(t, (<qt.ConditionalTyping>parent).checkType, (<qt.ConditionalTyping>parent).extendsType);
          if (constraint) constraints = append(constraints, constraint);
        }
        n = parent;
      }
      return constraints ? this.substitutionType(t, this.intersectionType(append(constraints, type))) : type;
    }
    intendedTypeFromDocTypeReference(n: qt.TypingReference): qt.Type | undefined {
      if (n.typeName.kind === Syntax.Identifier) {
        const typeArgs = n.typeArgs;
        switch (n.typeName.escapedText) {
          case 'String':
            qf.check.noTypeArgs(n);
            return stringType;
          case 'Number':
            qf.check.noTypeArgs(n);
            return numberType;
          case 'Boolean':
            qf.check.noTypeArgs(n);
            return booleanType;
          case 'Void':
            qf.check.noTypeArgs(n);
            return voidType;
          case 'Undefined':
            qf.check.noTypeArgs(n);
            return undefinedType;
          case 'Null':
            qf.check.noTypeArgs(n);
            return nullType;
          case 'Function':
          case 'function':
            qf.check.noTypeArgs(n);
            return globalFunctionType;
          case 'array':
            return (!typeArgs || !typeArgs.length) && !noImplicitAny ? anyArrayType : undefined;
          case 'promise':
            return (!typeArgs || !typeArgs.length) && !noImplicitAny ? qf.create.promiseType(anyType) : undefined;
          case 'Object':
            if (typeArgs && typeArgs.length === 2) {
              if (qf.is.docIndexSignature(n)) {
                const indexed = this.typeFromTypeNode(typeArgs[0]);
                const target = this.typeFromTypeNode(typeArgs[1]);
                const index = qf.create.indexInfo(target, false);
                return qf.create.anonymousType(undefined, qu.emptySymbols, qu.empty, qu.empty, indexed === stringType ? index : undefined, indexed === numberType ? index : undefined);
              }
              return anyType;
            }
            qf.check.noTypeArgs(n);
            return !noImplicitAny ? anyType : undefined;
        }
      }
    }
    typeFromDocNullableTypingNode(n: qt.DocNullableTyping) {
      const type = this.typeFromTypeNode(n.type);
      return strictNullChecks ? this.nullableType(t, qt.TypeFlags.Null) : type;
    }
    typeFromTypeReference(n: qt.TypeReferenceType): qt.Type {
      const links = this.nodeLinks(n);
      if (!links.resolvedType) {
        if (qf.is.constTypeReference(n) && qf.is.assertionExpression(n.parent)) {
          links.resolvedSymbol = unknownSymbol;
          return (links.resolvedType = qf.check.expressionCached(n.parent?.expression));
        }
        let symbol: qt.Symbol | undefined;
        let type: qt.Type | undefined;
        const meaning = SymbolFlags.Type;
        if (qf.is.docTypeReference(n)) {
          type = this.intendedTypeFromDocTypeReference(n);
          if (!type) {
            symbol = resolveTypeReferenceName(this.typeReferenceName(n), meaning, true);
            if (symbol === unknownSymbol) symbol = resolveTypeReferenceName(this.typeReferenceName(n), meaning | SymbolFlags.Value);
            else {
              resolveTypeReferenceName(this.typeReferenceName(n), meaning);
            }
            type = this.typeReferenceType(n, symbol);
          }
        }
        if (!type) {
          symbol = resolveTypeReferenceName(this.typeReferenceName(n), meaning);
          type = this.typeReferenceType(n, symbol);
        }
        links.resolvedSymbol = symbol;
        links.resolvedType = type;
      }
      return links.resolvedType;
    }
    typeFromTypingQuery(n: qt.TypingQuery): qt.Type {
      const links = this.nodeLinks(n);
      if (!links.resolvedType) links.resolvedType = this.regularTypeOfLiteralType(this.widenedType(qf.check.expression(n.exprName)));
      return links.resolvedType;
    }
    typeOfGlobalSymbol(s: qt.Symbol | undefined, arity: number): qt.ObjectType {
      const typeDeclaration = (s: qt.Symbol): qt.Declaration | undefined => {
        const ds = s.declarations;
        for (const d of ds) {
          switch (d.kind) {
            case Syntax.ClassDeclaration:
            case Syntax.InterfaceDeclaration:
            case Syntax.EnumDeclaration:
              return d;
          }
        }
        return;
      };
      if (!s) return arity ? qu.emptyGenericType : qu.emptyObjectType;
      const type = this.declaredTypeOfSymbol(s);
      if (!(t.flags & qt.TypeFlags.Object)) {
        error(typeDeclaration(s), qd.msgs.Global_type_0_must_be_a_class_or_interface_type, s.name);
        return arity ? qu.emptyGenericType : qu.emptyObjectType;
      }
      if (length((<qt.InterfaceType>type).typeParams) !== arity) {
        error(typeDeclaration(s), qd.msgs.Global_type_0_must_have_1_type_param_s, s.name, arity);
        return arity ? qu.emptyGenericType : qu.emptyObjectType;
      }
      return <qt.ObjectType>type;
    }
    globalValueSymbol(name: qu.__String, reportErrors: boolean): qt.Symbol | undefined {
      return this.globalSymbol(name, SymbolFlags.Value, reportErrors ? qd.msgs.Cannot_find_global_value_0 : undefined);
    }
    globalTypeSymbol(name: qu.__String, reportErrors: boolean): qt.Symbol | undefined {
      return this.globalSymbol(name, SymbolFlags.Type, reportErrors ? qd.msgs.Cannot_find_global_type_0 : undefined);
    }
    globalSymbol(name: qu.__String, meaning: SymbolFlags, diagnostic: qd.Message | undefined): qt.Symbol | undefined {
      return resolveName(undefined, name, meaning, diagnostic, name, false);
    }
    globalType(name: qu.__String, arity: 0, reportErrors: boolean): qt.ObjectType;
    globalType(name: qu.__String, arity: number, reportErrors: boolean): qt.GenericType;
    globalType(name: qu.__String, arity: number, reportErrors: boolean): qt.ObjectType | undefined {
      const symbol = this.globalTypeSymbol(name, reportErrors);
      return symbol || reportErrors ? this.typeOfGlobalSymbol(symbol, arity) : undefined;
    }
    globalTypedPropertyDescriptorType() {
      return deferredGlobalTypedPropertyDescriptorType || (deferredGlobalTypedPropertyDescriptorType = this.globalType('TypedPropertyDescriptor' as qu.__String, 1, true)) || qu.emptyGenericType;
    }
    globalTemplateStringsArrayType() {
      return deferredGlobalTemplateStringsArrayType || (deferredGlobalTemplateStringsArrayType = this.globalType('TemplateStringsArray' as qu.__String, 0, true)) || qu.emptyObjectType;
    }
    globalImportMetaType() {
      return deferredGlobalImportMetaType || (deferredGlobalImportMetaType = this.globalType('ImportMeta' as qu.__String, 0, true)) || qu.emptyObjectType;
    }
    globalESSymbolConstructorSymbol(reportErrors: boolean) {
      return deferredGlobalESSymbolConstructorSymbol || (deferredGlobalESSymbolConstructorSymbol = this.globalValueSymbol('Symbol' as qu.__String, reportErrors));
    }
    globalESSymbolType(reportErrors: boolean) {
      return deferredGlobalESSymbolType || (deferredGlobalESSymbolType = this.globalType('Symbol' as qu.__String, 0, reportErrors)) || qu.emptyObjectType;
    }
    globalPromiseType(reportErrors: boolean) {
      return deferredGlobalPromiseType || (deferredGlobalPromiseType = this.globalType('Promise' as qu.__String, 1, reportErrors)) || qu.emptyGenericType;
    }
    globalPromiseLikeType(reportErrors: boolean) {
      return deferredGlobalPromiseLikeType || (deferredGlobalPromiseLikeType = this.globalType('PromiseLike' as qu.__String, 1, reportErrors)) || qu.emptyGenericType;
    }
    globalPromiseConstructorSymbol(reportErrors: boolean): qt.Symbol | undefined {
      return deferredGlobalPromiseConstructorSymbol || (deferredGlobalPromiseConstructorSymbol = this.globalValueSymbol('Promise' as qu.__String, reportErrors));
    }
    globalPromiseConstructorLikeType(reportErrors: boolean) {
      return deferredGlobalPromiseConstructorLikeType || (deferredGlobalPromiseConstructorLikeType = this.globalType('PromiseConstructorLike' as qu.__String, 0, reportErrors)) || qu.emptyObjectType;
    }
    globalAsyncIterableType(reportErrors: boolean) {
      return deferredGlobalAsyncIterableType || (deferredGlobalAsyncIterableType = this.globalType('AsyncIterable' as qu.__String, 1, reportErrors)) || qu.emptyGenericType;
    }
    globalAsyncIteratorType(reportErrors: boolean) {
      return deferredGlobalAsyncIteratorType || (deferredGlobalAsyncIteratorType = this.globalType('AsyncIterator' as qu.__String, 3, reportErrors)) || qu.emptyGenericType;
    }
    globalAsyncIterableIteratorType(reportErrors: boolean) {
      return deferredGlobalAsyncIterableIteratorType || (deferredGlobalAsyncIterableIteratorType = this.globalType('AsyncIterableIterator' as qu.__String, 1, reportErrors)) || qu.emptyGenericType;
    }
    globalAsyncGeneratorType(reportErrors: boolean) {
      return deferredGlobalAsyncGeneratorType || (deferredGlobalAsyncGeneratorType = this.globalType('AsyncGenerator' as qu.__String, 3, reportErrors)) || qu.emptyGenericType;
    }
    globalIterableType(reportErrors: boolean) {
      return deferredGlobalIterableType || (deferredGlobalIterableType = this.globalType('Iterable' as qu.__String, 1, reportErrors)) || qu.emptyGenericType;
    }
    globalIteratorType(reportErrors: boolean) {
      return deferredGlobalIteratorType || (deferredGlobalIteratorType = this.globalType('Iterator' as qu.__String, 3, reportErrors)) || qu.emptyGenericType;
    }
    globalIterableIteratorType(reportErrors: boolean) {
      return deferredGlobalIterableIteratorType || (deferredGlobalIterableIteratorType = this.globalType('IterableIterator' as qu.__String, 1, reportErrors)) || qu.emptyGenericType;
    }
    globalGeneratorType(reportErrors: boolean) {
      return deferredGlobalGeneratorType || (deferredGlobalGeneratorType = this.globalType('Generator' as qu.__String, 3, reportErrors)) || qu.emptyGenericType;
    }
    globalIteratorYieldResultType(reportErrors: boolean) {
      return deferredGlobalIteratorYieldResultType || (deferredGlobalIteratorYieldResultType = this.globalType('IteratorYieldResult' as qu.__String, 1, reportErrors)) || qu.emptyGenericType;
    }
    globalIteratorReturnResultType(reportErrors: boolean) {
      return deferredGlobalIteratorReturnResultType || (deferredGlobalIteratorReturnResultType = this.globalType('IteratorReturnResult' as qu.__String, 1, reportErrors)) || qu.emptyGenericType;
    }
    globalTypeOrUndefined(name: qu.__String, arity = 0): qt.ObjectType | undefined {
      const symbol = this.globalSymbol(name, SymbolFlags.Type, undefined);
      return symbol && <qt.GenericType>this.typeOfGlobalSymbol(symbol, arity);
    }
    globalExtractSymbol(): qt.Symbol {
      return deferredGlobalExtractSymbol || (deferredGlobalExtractSymbol = this.globalSymbol('Extract' as qu.__String, SymbolFlags.TypeAlias, qd.msgs.Cannot_find_global_type_0)!);
    }
    globalOmitSymbol(): qt.Symbol {
      return deferredGlobalOmitSymbol || (deferredGlobalOmitSymbol = this.globalSymbol('Omit' as qu.__String, SymbolFlags.TypeAlias, qd.msgs.Cannot_find_global_type_0)!);
    }
    globalBigIntType(reportErrors: boolean) {
      return deferredGlobalBigIntType || (deferredGlobalBigIntType = this.globalType('BigInt' as qu.__String, 0, reportErrors)) || qu.emptyObjectType;
    }
    arrayOrTupleTargetType(n: qt.ArrayTyping | qt.TupleTyping): qt.GenericType {
      const readonly = qf.is.readonlyTypeOperator(n.parent);
      if (n.kind === Syntax.ArrayTyping || (n.elems.length === 1 && qf.is.tupleRestElem(n.elems[0]))) return readonly ? globalReadonlyArrayType : globalArrayType;
      const lastElem = lastOrUndefined(n.elems);
      const restElem = lastElem && qf.is.tupleRestElem(lastElem) ? lastElem : undefined;
      const minLength = findLastIndex(n.elems, (n) => !qf.is.tupleOptionalElem(n) && n !== restElem) + 1;
      const missingName = qu.some(n.elems, (e) => e.kind !== Syntax.NamedTupleMember);
      return this.tupleTypeOfArity(n.elems.length, minLength, !!restElem, readonly, missingName ? undefined : (n.elems as readonly qt.NamedTupleMember[]));
    }
    typeFromArrayOrTupleTyping(n: qt.ArrayTyping | qt.TupleTyping): qt.Type {
      const links = this.nodeLinks(n);
      if (!links.resolvedType) {
        const target = this.arrayOrTupleTargetType(n);
        if (target === qu.emptyGenericType) links.resolvedType = qu.emptyObjectType;
        else if (qf.is.deferredTypingReference(n)) {
          links.resolvedType = n.kind === Syntax.TupleTyping && n.elems.length === 0 ? target : qf.create.deferredTypeReference(target, n, undefined);
        } else {
          const elemTypes = n.kind === Syntax.ArrayTyping ? [this.typeFromTypeNode(n.elemType)] : map(n.elems, this.typeFromTypeNode);
          links.resolvedType = qf.create.typeReference(target, elemTypes);
        }
      }
      return links.resolvedType;
    }
    tupleTypeOfArity(arity: number, minLength: number, hasRestElem: boolean, readonly: boolean, namedMemberDeclarations?: readonly (NamedTupleMember | qt.ParamDeclaration)[]): qt.GenericType {
      const key =
        arity +
        (hasRestElem ? '+' : ',') +
        minLength +
        (readonly ? 'R' : '') +
        (namedMemberDeclarations && namedMemberDeclarations.length ? ',' + map(namedMemberDeclarations, this.nodeId).join(',') : '');
      let type = tupleTypes.get(key);
      if (!type) tupleTypes.set(key, (type = qf.create.tupleTypeOfArity(arity, minLength, hasRestElem, readonly, namedMemberDeclarations)));
      return type;
    }
    typeFromOptionalTyping(n: qt.OptionalTyping): qt.Type {
      const type = this.typeFromTypeNode(n.type);
      return strictNullChecks ? this.optionalType(t) : type;
    }
    typeId(t: qt.Type) {
      return t.id;
    }
    unionType(types: readonly qt.Type[], unionReduction: UnionReduction = UnionReduction.Literal, aliasSymbol?: qt.Symbol, aliasTypeArgs?: readonly qt.Type[]): qt.Type {
      if (types.length === 0) return neverType;
      if (types.length === 1) return types[0];
      const typeSet: qt.Type[] = [];
      const includes = addTypesToUnion(typeSet, 0, types);
      if (unionReduction !== UnionReduction.None) {
        if (includes & qt.TypeFlags.AnyOrUnknown) return includes & qt.TypeFlags.Any ? (includes & qt.TypeFlags.IncludesWildcard ? wildcardType : anyType) : unknownType;
        switch (unionReduction) {
          case UnionReduction.Literal:
            if (includes & (TypeFlags.Literal | qt.TypeFlags.UniqueESSymbol)) removeRedundantLiteralTypes(typeSet, includes);
            break;
          case UnionReduction.Subtype:
            if (!removeSubtypes(typeSet, !(includes & qt.TypeFlags.IncludesStructuredOrInstantiable))) return errorType;
            break;
        }
        if (typeSet.length === 0) {
          return includes & qt.TypeFlags.Null
            ? includes & qt.TypeFlags.IncludesNonWideningType
              ? nullType
              : nullWideningType
            : includes & qt.TypeFlags.Undefined
            ? includes & qt.TypeFlags.IncludesNonWideningType
              ? undefinedType
              : undefinedWideningType
            : neverType;
        }
      }
      const objectFlags = (includes & qt.TypeFlags.NotPrimitiveUnion ? 0 : ObjectFlags.PrimitiveUnion) | (includes & qt.TypeFlags.Intersection ? ObjectFlags.ContainsIntersections : 0);
      return this.unionTypeFromSortedList(typeSet, objectFlags, aliasSymbol, aliasTypeArgs);
    }
    unionTypePredicate(signatures: readonly qt.Signature[]): qt.TypePredicate | undefined {
      let first: qt.TypePredicate | undefined;
      const types: qt.Type[] = [];
      for (const sig of signatures) {
        const pred = this.typePredicateOfSignature(sig);
        if (!pred || pred.kind === qt.TypePredicateKind.AssertsThis || pred.kind === qt.TypePredicateKind.AssertsIdentifier) continue;
        if (first) {
          if (!typePredicateKindsMatch(first, pred)) return;
        } else {
          first = pred;
        }
        types.push(pred.type);
      }
      if (!first) return;
      const unionType = this.unionType(types);
      return qf.create.typePredicate(first.kind, first.paramName, first.paramIndex, unionType);
    }
    unionTypeFromSortedList(types: qt.Type[], objectFlags: ObjectFlags, aliasSymbol?: qt.Symbol, aliasTypeArgs?: readonly qt.Type[]): qt.Type {
      if (types.length === 0) return neverType;
      if (types.length === 1) return types[0];
      const id = this.typeListId(types);
      let type = unionTypes.get(id);
      if (!type) {
        type = <qt.UnionType>qf.create.type(TypeFlags.Union);
        unionTypes.set(id, type);
        t.objectFlags = objectFlags | this.propagatingFlagsOfTypes(types, qt.TypeFlags.Nullable);
        t.types = types;
        t.aliasSymbol = aliasSymbol;
        t.aliasTypeArgs = aliasTypeArgs;
      }
      return type;
    }
    typeFromUnionTyping(n: qt.UnionTyping): qt.Type {
      const links = this.nodeLinks(n);
      if (!links.resolvedType) {
        const aliasSymbol = this.aliasSymbolForTypeNode(n);
        links.resolvedType = this.unionType(map(n.types, this.typeFromTypeNode), UnionReduction.Literal, aliasSymbol, this.typeArgsForAliasSymbol(aliasSymbol));
      }
      return links.resolvedType;
    }
    intersectionType(types: readonly qt.Type[], aliasSymbol?: qt.Symbol, aliasTypeArgs?: readonly qt.Type[]): qt.Type {
      const typeMembershipMap: qu.QMap<qt.Type> = new qu.QMap();
      const includes = addTypesToIntersection(typeMembershipMap, 0, types);
      const typeSet: qt.Type[] = arrayFrom(typeMembershipMap.values());
      if (
        includes & qt.TypeFlags.Never ||
        (strictNullChecks && includes & qt.TypeFlags.Nullable && includes & (TypeFlags.Object | qt.TypeFlags.NonPrimitive | qt.TypeFlags.IncludesEmptyObject)) ||
        (includes & qt.TypeFlags.NonPrimitive && includes & (TypeFlags.DisjointDomains & ~TypeFlags.NonPrimitive)) ||
        (includes & qt.TypeFlags.StringLike && includes & (TypeFlags.DisjointDomains & ~TypeFlags.StringLike)) ||
        (includes & qt.TypeFlags.NumberLike && includes & (TypeFlags.DisjointDomains & ~TypeFlags.NumberLike)) ||
        (includes & qt.TypeFlags.BigIntLike && includes & (TypeFlags.DisjointDomains & ~TypeFlags.BigIntLike)) ||
        (includes & qt.TypeFlags.ESSymbolLike && includes & (TypeFlags.DisjointDomains & ~TypeFlags.ESSymbolLike)) ||
        (includes & qt.TypeFlags.VoidLike && includes & (TypeFlags.DisjointDomains & ~TypeFlags.VoidLike))
      ) {
        return neverType;
      }
      if (includes & qt.TypeFlags.Any) return includes & qt.TypeFlags.IncludesWildcard ? wildcardType : anyType;
      if (!strictNullChecks && includes & qt.TypeFlags.Nullable) return includes & qt.TypeFlags.Undefined ? undefinedType : nullType;
      if (
        (includes & qt.TypeFlags.String && includes & qt.TypeFlags.StringLiteral) ||
        (includes & qt.TypeFlags.Number && includes & qt.TypeFlags.NumberLiteral) ||
        (includes & qt.TypeFlags.BigInt && includes & qt.TypeFlags.BigIntLiteral) ||
        (includes & qt.TypeFlags.ESSymbol && includes & qt.TypeFlags.UniqueESSymbol)
      ) {
        removeRedundantPrimitiveTypes(typeSet, includes);
      }
      if (includes & qt.TypeFlags.IncludesEmptyObject && includes & qt.TypeFlags.Object) orderedRemoveItemAt(typeSet, findIndex(typeSet, isEmptyAnonymousObjectType));
      if (typeSet.length === 0) return unknownType;
      if (typeSet.length === 1) return typeSet[0];
      const id = this.typeListId(typeSet);
      let result = intersectionTypes.get(id);
      if (!result) {
        if (includes & qt.TypeFlags.Union) {
          if (intersectUnionsOfPrimitiveTypes(typeSet)) result = this.intersectionType(typeSet, aliasSymbol, aliasTypeArgs);
          else if (extractIrreducible(typeSet, qt.TypeFlags.Undefined)) {
            result = this.unionType([this.intersectionType(typeSet), undefinedType], UnionReduction.Literal, aliasSymbol, aliasTypeArgs);
          } else if (extractIrreducible(typeSet, qt.TypeFlags.Null)) {
            result = this.unionType([this.intersectionType(typeSet), nullType], UnionReduction.Literal, aliasSymbol, aliasTypeArgs);
          } else {
            const size = reduceLeft(typeSet, (n, t) => n * (t.flags & qt.TypeFlags.Union ? (<qt.UnionType>t).types.length : 1), 1);
            if (size >= 100000) {
              error(currentNode, qd.msgs.Expression_produces_a_union_type_that_is_too_complex_to_represent);
              return errorType;
            }
            const unionIndex = findIndex(typeSet, (t) => (t.flags & qt.TypeFlags.Union) !== 0);
            const unionType = <qt.UnionType>typeSet[unionIndex];
            result = this.unionType(
              map(unionType.types, (t) => this.intersectionType(replaceElem(typeSet, unionIndex, t))),
              UnionReduction.Literal,
              aliasSymbol,
              aliasTypeArgs
            );
          }
        } else {
          result = qf.create.intersectionType(typeSet, aliasSymbol, aliasTypeArgs);
        }
        intersectionTypes.set(id, result);
      }
      return result;
    }
    typeFromIntersectionTyping(n: qt.IntersectionTyping): qt.Type {
      const links = this.nodeLinks(n);
      if (!links.resolvedType) {
        const aliasSymbol = this.aliasSymbolForTypeNode(n);
        links.resolvedType = this.intersectionType(map(n.types, this.typeFromTypeNode), aliasSymbol, this.typeArgsForAliasSymbol(aliasSymbol));
      }
      return links.resolvedType;
    }
    indexTypeForGenericType(t: qt.InstantiableType | qt.UnionOrIntersectionType, stringsOnly: boolean) {
      return stringsOnly ? t.resolvedStringIndexType || (t.resolvedStringIndexType = qf.create.indexType(t, true)) : t.resolvedIndexType || (t.resolvedIndexType = qf.create.indexType(t, false));
    }
    literalTypeFromPropertyName(name: qt.PropertyName) {
      if (name.kind === Syntax.PrivateIdentifier) return neverType;
      return name.kind === Syntax.Identifier
        ? this.literalType(qy.get.unescUnderscores(name.escapedText))
        : this.regularTypeOfLiteralType(name.kind === Syntax.ComputedPropertyName ? qf.check.computedPropertyName(name) : qf.check.expression(name));
    }
    bigIntLiteralType(n: qt.BigIntLiteral): qt.LiteralType {
      return this.literalType({
        negative: false,
        base10Value: parsePseudoBigInt(n.text),
      });
    }
    literalTypeFromProperty(s: qt.Symbol, include: qt.TypeFlags) {
      if (!(s.declarationModifierFlags() & ModifierFlags.NonPublicAccessibilityModifier)) {
        let t = s.this.links(this.lateBoundSymbol(s)).nameType;
        if (!t && !s.isKnown()) {
          if (s.escName === InternalSymbol.Default) t = this.literalType('default');
          else {
            const n = s.valueDeclaration && (this.declaration.nameOf(s.valueDeclaration) as qt.PropertyName);
            t = (n && this.literalTypeFromPropertyName(n)) || this.literalType(s.name);
          }
        }
        if (t && t.flags & include) return t;
      }
      return neverType;
    }
    literalTypeFromProperties(t: qt.Type, include: qt.TypeFlags) {
      return this.unionType(map(this.propertiesOfType(t), (p) => this.literalTypeFromProperty(p, include)));
    }
    nonEnumNumberIndexInfo(t: qt.Type) {
      const numberIndexInfo = this.indexInfoOfType(t, qt.IndexKind.Number);
      return numberIndexInfo !== enumNumberIndexInfo ? numberIndexInfo : undefined;
    }
    indexType(t: qt.Type, stringsOnly = keyofStringsOnly, noIndexSignatures?: boolean): qt.Type {
      type = this.reducedType(t);
      return t.flags & qt.TypeFlags.Union
        ? this.intersectionType(map((<qt.IntersectionType>type).types, (t) => this.indexType(t, stringsOnly, noIndexSignatures)))
        : t.flags & qt.TypeFlags.Intersection
        ? this.unionType(map((<qt.IntersectionType>type).types, (t) => this.indexType(t, stringsOnly, noIndexSignatures)))
        : maybeTypeOfKind(t, qt.TypeFlags.InstantiableNonPrimitive)
        ? this.indexTypeForGenericType(<qt.InstantiableType | qt.UnionOrIntersectionType>type, stringsOnly)
        : this.objectFlags(t) & ObjectFlags.Mapped
        ? filterType(this.constraintTypeFromMappedType(<qt.MappedType>type), (t) => !(noIndexSignatures && t.flags & (TypeFlags.Any | qt.TypeFlags.String)))
        : type === wildcardType
        ? wildcardType
        : t.flags & qt.TypeFlags.Unknown
        ? neverType
        : t.flags & (TypeFlags.Any | qt.TypeFlags.Never)
        ? keyofConstraintType
        : stringsOnly
        ? !noIndexSignatures && this.indexInfoOfType(t, qt.IndexKind.String)
          ? stringType
          : this.literalTypeFromProperties(t, qt.TypeFlags.StringLiteral)
        : !noIndexSignatures && this.indexInfoOfType(t, qt.IndexKind.String)
        ? this.unionType([stringType, numberType, this.literalTypeFromProperties(t, qt.TypeFlags.UniqueESSymbol)])
        : this.nonEnumNumberIndexInfo(t)
        ? this.unionType([numberType, this.literalTypeFromProperties(t, qt.TypeFlags.StringLiteral | qt.TypeFlags.UniqueESSymbol)])
        : this.literalTypeFromProperties(t, qt.TypeFlags.StringOrNumberLiteralOrUnique);
    }
    extractStringType(t: qt.Type) {
      if (keyofStringsOnly) return type;
      const extractTypeAlias = this.globalExtractSymbol();
      return extractTypeAlias ? this.typeAliasInstantiation(extractTypeAlias, [type, stringType]) : stringType;
    }
    indexTypeOrString(t: qt.Type): qt.Type {
      const indexType = this.extractStringType(this.indexType(t));
      return indexType.flags & qt.TypeFlags.Never ? stringType : indexType;
    }
    typeFromTypingOperator(n: qt.TypingOperator): qt.Type {
      const links = this.nodeLinks(n);
      if (!links.resolvedType) {
        switch (n.operator) {
          case Syntax.KeyOfKeyword:
            links.resolvedType = this.indexType(this.typeFromTypeNode(n.type));
            break;
          case Syntax.UniqueKeyword:
            links.resolvedType = n.type.kind === Syntax.SymbolKeyword ? this.eSSymbolLikeTypeForNode(walkUpParenthesizedTypes(n.parent)) : errorType;
            break;
          case Syntax.ReadonlyKeyword:
            links.resolvedType = this.typeFromTypeNode(n.type);
            break;
          default:
            throw qc.assert.never(n.operator);
        }
      }
      return links.resolvedType;
    }
    propertyNameFromIndex(
      indexType: qt.Type,
      accessNode:
        | qt.StringLiteral
        | qt.Identifier
        | qc.PrivateIdentifier
        | qt.ObjectBindingPattern
        | qt.ArrayBindingPattern
        | qt.ComputedPropertyName
        | qt.NumericLiteral
        | qt.IndexedAccessTyping
        | qt.ElemAccessExpression
        | qt.SyntheticExpression
        | undefined
    ) {
      const accessExpression = accessNode && accessNode.kind === Syntax.ElemAccessExpression ? accessNode : undefined;
      return qf.is.typeUsableAsPropertyName(indexType)
        ? this.propertyNameFromType(indexType)
        : accessExpression && qf.check.thatExpressionIsProperSymbolReference(accessExpression.argExpression, indexType, false)
        ? qu.this.propertyNameForKnownSymbolName(idText((<qt.PropertyAccessExpression>accessExpression.argExpression).name))
        : accessNode && qf.is.propertyName(accessNode)
        ? this.propertyNameForPropertyNameNode(accessNode)
        : undefined;
    }
    propertyTypeForIndexType(
      originalObjectType: qt.Type,
      objectType: qt.Type,
      indexType: qt.Type,
      fullIndexType: qt.Type,
      suppressNoImplicitAnyError: boolean,
      accessNode: qt.ElemAccessExpression | qt.IndexedAccessTyping | qt.PropertyName | qt.BindingName | qt.SyntheticExpression | undefined,
      accessFlags: AccessFlags
    ) {
      const accessExpression = accessNode && accessNode.kind === Syntax.ElemAccessExpression ? accessNode : undefined;
      const propName = accessNode && accessNode.kind === Syntax.PrivateIdentifier ? undefined : this.propertyNameFromIndex(indexType, accessNode);
      if (propName !== undefined) {
        const prop = this.propertyOfType(objectType, propName);
        if (prop) {
          if (accessExpression) {
            markPropertyAsReferenced(prop, accessExpression, accessExpression.expression.kind === Syntax.ThisKeyword);
            if (qf.is.assignmentToReadonlyEntity(accessExpression, prop, this.assignmentTargetKind(accessExpression))) {
              error(accessExpression.argExpression, qd.msgs.Cannot_assign_to_0_because_it_is_a_read_only_property, prop.symbolToString());
              return;
            }
            if (accessFlags & AccessFlags.CacheSymbol) this.nodeLinks(accessNode!).resolvedSymbol = prop;
            if (qf.is.thisPropertyAccessInConstructor(accessExpression, prop)) return autoType;
          }
          const propType = this.typeOfSymbol(prop);
          return accessExpression && this.assignmentTargetKind(accessExpression) !== qt.AssignmentKind.Definite ? this.flow.typeOfReference(accessExpression, propType) : propType;
        }
        if (everyType(objectType, qf.is.tupleType) && qt.NumericLiteral.name(propName) && +propName >= 0) {
          if (accessNode && everyType(objectType, (t) => !(<qt.TupleTypeReference>t).target.hasRestElem) && !(accessFlags & AccessFlags.NoTupleBoundsCheck)) {
            const indexNode = this.indexNodeForAccessExpression(accessNode);
            if (qf.is.tupleType(objectType))
              error(indexNode, qd.msgs.Tuple_type_0_of_length_1_has_no_elem_at_index_2, typeToString(objectType), this.typeReferenceArity(objectType), qy.get.unescUnderscores(propName));
            else {
              error(indexNode, qd.msgs.Property_0_does_not_exist_on_type_1, qy.get.unescUnderscores(propName), typeToString(objectType));
            }
          }
          errorIfWritingToReadonlyIndex(this.indexInfoOfType(objectType, qt.IndexKind.Number));
          return mapType(objectType, (t) => this.restTypeOfTupleType(<qt.TupleTypeReference>t) || undefinedType);
        }
      }
      if (!(indexType.flags & qt.TypeFlags.Nullable) && qf.is.typeAssignableToKind(indexType, qt.TypeFlags.StringLike | qt.TypeFlags.NumberLike | qt.TypeFlags.ESSymbolLike)) {
        if (objectType.flags & (TypeFlags.Any | qt.TypeFlags.Never)) return objectType;
        const stringIndexInfo = this.indexInfoOfType(objectType, qt.IndexKind.String);
        const indexInfo = (qf.is.typeAssignableToKind(indexType, qt.TypeFlags.NumberLike) && this.indexInfoOfType(objectType, qt.IndexKind.Number)) || stringIndexInfo;
        if (indexInfo) {
          if (accessFlags & AccessFlags.NoIndexSignatures && indexInfo === stringIndexInfo) {
            if (accessExpression) error(accessExpression, qd.msgs.Type_0_cannot_be_used_to_index_type_1, typeToString(indexType), typeToString(originalObjectType));
            return;
          }
          if (accessNode && !qf.is.typeAssignableToKind(indexType, qt.TypeFlags.String | qt.TypeFlags.Number)) {
            const indexNode = this.indexNodeForAccessExpression(accessNode);
            error(indexNode, qd.msgs.Type_0_cannot_be_used_as_an_index_type, typeToString(indexType));
            return indexInfo.type;
          }
          errorIfWritingToReadonlyIndex(indexInfo);
          return indexInfo.type;
        }
        if (indexType.flags & qt.TypeFlags.Never) return neverType;
        if (qf.is.jSLiteralType(objectType)) return anyType;
        if (accessExpression && !qf.is.constEnumObjectType(objectType)) {
          if (objectType.symbol === globalThisSymbol && propName !== undefined && globalThisSymbol.exports!.has(propName) && globalThisSymbol.exports!.get(propName)!.flags & SymbolFlags.BlockScoped)
            error(accessExpression, qd.msgs.Property_0_does_not_exist_on_type_1, qy.get.unescUnderscores(propName), typeToString(objectType));
          else if (noImplicitAny && !compilerOpts.suppressImplicitAnyIndexErrors && !suppressNoImplicitAnyError) {
            if (propName !== undefined && typeHasStaticProperty(propName, objectType))
              error(accessExpression, qd.msgs.Property_0_is_a_static_member_of_type_1, propName as string, typeToString(objectType));
            else if (this.indexTypeOfType(objectType, qt.IndexKind.Number)) {
              error(accessExpression.argExpression, qd.msgs.Elem_implicitly_has_an_any_type_because_index_expression_is_not_of_type_number);
            } else {
              let suggestion: string | undefined;
              if (propName !== undefined && (suggestion = this.suggestionForNonexistentProperty(propName as string, objectType))) {
                if (suggestion !== undefined)
                  error(accessExpression.argExpression, qd.msgs.Property_0_does_not_exist_on_type_1_Did_you_mean_2, propName as string, typeToString(objectType), suggestion);
              } else {
                const suggestion = this.suggestionForNonexistentIndexSignature(objectType, accessExpression, indexType);
                if (suggestion !== undefined)
                  error(accessExpression, qd.msgs.Elem_implicitly_has_an_any_type_because_type_0_has_no_index_signature_Did_you_mean_to_call_1, typeToString(objectType), suggestion);
                else {
                  let errorInfo: qd.MessageChain | undefined;
                  if (indexType.flags & qt.TypeFlags.EnumLiteral)
                    errorInfo = chainqd.Messages(undefined, qd.msgs.Property_0_does_not_exist_on_type_1, '[' + typeToString(indexType) + ']', typeToString(objectType));
                  else if (indexType.flags & qt.TypeFlags.UniqueESSymbol) {
                    const symbolName = this.fullyQualifiedName((indexType as qt.UniqueESSymbolType).symbol, accessExpression);
                    errorInfo = chainqd.Messages(undefined, qd.msgs.Property_0_does_not_exist_on_type_1, '[' + symbolName + ']', typeToString(objectType));
                  } else if (indexType.flags & qt.TypeFlags.StringLiteral) {
                    errorInfo = chainqd.Messages(undefined, qd.msgs.Property_0_does_not_exist_on_type_1, (indexType as qt.StringLiteralType).value, typeToString(objectType));
                  } else if (indexType.flags & qt.TypeFlags.NumberLiteral) {
                    errorInfo = chainqd.Messages(undefined, qd.msgs.Property_0_does_not_exist_on_type_1, (indexType as qt.NumberLiteralType).value, typeToString(objectType));
                  } else if (indexType.flags & (TypeFlags.Number | qt.TypeFlags.String)) {
                    errorInfo = chainqd.Messages(undefined, qd.msgs.No_index_signature_with_a_param_of_type_0_was_found_on_type_1, typeToString(indexType), typeToString(objectType));
                  }
                  errorInfo = chainqd.Messages(
                    errorInfo,
                    qd.msgs.Elem_implicitly_has_an_any_type_because_expression_of_type_0_can_t_be_used_to_index_type_1,
                    typeToString(fullIndexType),
                    typeToString(objectType)
                  );
                  diagnostics.add(qf.create.diagForNodeFromMessageChain(accessExpression, errorInfo));
                }
              }
            }
          }
          return;
        }
      }
      if (qf.is.jSLiteralType(objectType)) return anyType;
      if (accessNode) {
        const indexNode = this.indexNodeForAccessExpression(accessNode);
        if (indexType.flags & (TypeFlags.StringLiteral | qt.TypeFlags.NumberLiteral))
          error(indexNode, qd.msgs.Property_0_does_not_exist_on_type_1, '' + (<qt.StringLiteralType | qt.NumberLiteralType>indexType).value, typeToString(objectType));
        else if (indexType.flags & (TypeFlags.String | qt.TypeFlags.Number)) {
          error(indexNode, qd.msgs.Type_0_has_no_matching_index_signature_for_type_1, typeToString(objectType), typeToString(indexType));
        } else {
          error(indexNode, qd.msgs.Type_0_cannot_be_used_as_an_index_type, typeToString(indexType));
        }
      }
      if (qf.is.typeAny(indexType)) return indexType;
      return;
      const errorIfWritingToReadonlyIndex = (indexInfo: qt.IndexInfo | undefined) => {
        if (indexInfo && indexInfo.isReadonly && accessExpression && (qf.is.assignmentTarget(accessExpression) || qf.is.deleteTarget(accessExpression)))
          error(accessExpression, qd.msgs.Index_signature_in_type_0_only_permits_reading, typeToString(objectType));
      };
    }
    indexNodeForAccessExpression(accessNode: qt.ElemAccessExpression | qt.IndexedAccessTyping | qt.PropertyName | qt.BindingName | qt.SyntheticExpression) {
      return accessNode.kind === Syntax.ElemAccessExpression
        ? accessNode.argExpression
        : accessNode.kind === Syntax.IndexedAccessTyping
        ? accessNode.indexType
        : accessNode.kind === Syntax.ComputedPropertyName
        ? accessNode.expression
        : accessNode;
    }
    simplifiedType(t: qt.Type, writing: boolean): qt.Type {
      return t.flags & qt.TypeFlags.IndexedAccess
        ? this.simplifiedIndexedAccessType(<qt.IndexedAccessType>type, writing)
        : t.flags & qt.TypeFlags.Conditional
        ? this.simplifiedConditionalType(<qt.ConditionalType>type, writing)
        : type;
    }
    simplifiedIndexedAccessType(t: qt.IndexedAccessType, writing: boolean): qt.Type {
      const cache = writing ? 'simplifiedForWriting' : 'simplifiedForReading';
      if (type[cache]) return type[cache] === circularConstraintType ? type : type[cache]!;
      type[cache] = circularConstraintType;
      const objectType = unwrapSubstitution(this.simplifiedType(t.objectType, writing));
      const indexType = this.simplifiedType(t.indexType, writing);
      const distributedOverIndex = distributeObjectOverIndexType(objectType, indexType, writing);
      if (distributedOverIndex) return (type[cache] = distributedOverIndex);
      if (!(indexType.flags & qt.TypeFlags.Instantiable)) {
        const distributedOverObject = distributeIndexOverObjectType(objectType, indexType, writing);
        if (distributedOverObject) return (type[cache] = distributedOverObject);
      }
      if (qf.is.genericMappedType(objectType)) return (type[cache] = mapType(substituteIndexedMappedType(objectType, t.indexType), (t) => this.simplifiedType(t, writing)));
      return (type[cache] = type);
    }
    simplifiedConditionalType(t: qt.ConditionalType, writing: boolean) {
      const checkType = t.checkType;
      const extendsType = t.extendsType;
      const trueType = this.trueTypeFromConditionalType(t);
      const falseType = this.falseTypeFromConditionalType(t);
      if (falseType.flags & qt.TypeFlags.Never && this.actualTypeVariable(trueType) === this.actualTypeVariable(checkType)) {
        if (checkType.flags & qt.TypeFlags.Any || qf.is.typeAssignableTo(this.restrictive(checkType), this.restrictive(extendsType))) return this.simplifiedType(trueType, writing);
        else if (qf.is.intersectionEmpty(checkType, extendsType)) return neverType;
      } else if (trueType.flags & qt.TypeFlags.Never && this.actualTypeVariable(falseType) === this.actualTypeVariable(checkType)) {
        if (!(checkType.flags & qt.TypeFlags.Any) && qf.is.typeAssignableTo(this.restrictive(checkType), this.restrictive(extendsType))) return neverType;
        else if (checkType.flags & qt.TypeFlags.Any || qf.is.intersectionEmpty(checkType, extendsType)) return this.simplifiedType(falseType, writing);
      }
      return type;
    }
    indexedAccessType(objectType: qt.Type, indexType: qt.Type, accessNode?: qt.ElemAccessExpression | qt.IndexedAccessTyping | qt.PropertyName | qt.BindingName | qt.SyntheticExpression): qt.Type {
      return this.indexedAccessTypeOrUndefined(objectType, indexType, accessNode, AccessFlags.None) || (accessNode ? errorType : unknownType);
    }
    indexedAccessTypeOrUndefined(
      objectType: qt.Type,
      indexType: qt.Type,
      accessNode?: qt.ElemAccessExpression | qt.IndexedAccessTyping | qt.PropertyName | qt.BindingName | qt.SyntheticExpression,
      accessFlags = AccessFlags.None
    ): qt.Type | undefined {
      if (objectType === wildcardType || indexType === wildcardType) return wildcardType;
      if (qf.is.stringIndexSignatureOnlyType(objectType) && !(indexType.flags & qt.TypeFlags.Nullable) && qf.is.typeAssignableToKind(indexType, qt.TypeFlags.String | qt.TypeFlags.Number))
        indexType = stringType;
      if (qf.is.genericIndexType(indexType) || (!(accessNode && accessNode.kind !== Syntax.IndexedAccessTyping) && qf.is.genericObjectType(objectType))) {
        if (objectType.flags & qt.TypeFlags.AnyOrUnknown) return objectType;
        const id = objectType.id + ',' + indexType.id;
        let type = indexedAccessTypes.get(id);
        if (!type) indexedAccessTypes.set(id, (type = qf.create.indexedAccessType(objectType, indexType)));
        return type;
      }
      const apparentObjectType = this.reducedApparentType(objectType);
      if (indexType.flags & qt.TypeFlags.Union && !(indexType.flags & qt.TypeFlags.Boolean)) {
        const propTypes: qt.Type[] = [];
        let wasMissingProp = false;
        for (const t of (<qt.UnionType>indexType).types) {
          const propType = this.propertyTypeForIndexType(objectType, apparentObjectType, t, indexType, wasMissingProp, accessNode, accessFlags);
          if (propType) propTypes.push(propType);
          else if (!accessNode) {
            return;
          } else {
            wasMissingProp = true;
          }
        }
        if (wasMissingProp) return;
        return accessFlags & AccessFlags.Writing ? this.intersectionType(propTypes) : this.unionType(propTypes);
      }
      return this.propertyTypeForIndexType(objectType, apparentObjectType, indexType, indexType, false, accessNode, accessFlags | AccessFlags.CacheSymbol);
    }
    typeFromIndexedAccessTyping(n: qt.IndexedAccessTyping) {
      const links = this.nodeLinks(n);
      if (!links.resolvedType) {
        const objectType = this.typeFromTypeNode(n.objectType);
        const indexType = this.typeFromTypeNode(n.indexType);
        const resolved = this.indexedAccessType(objectType, indexType, n);
        links.resolvedType =
          resolved.flags & qt.TypeFlags.IndexedAccess && (<qt.IndexedAccessType>resolved).objectType === objectType && (<qt.IndexedAccessType>resolved).indexType === indexType
            ? this.conditionalFlowTypeOfType(resolved, n)
            : resolved;
      }
      return links.resolvedType;
    }
    typeFromMappedTyping(n: qt.MappedTyping): qt.Type {
      const links = this.nodeLinks(n);
      if (!links.resolvedType) {
        const type = <qt.MappedType>qf.create.objectType(ObjectFlags.Mapped, n.symbol);
        t.declaration = n;
        t.aliasSymbol = this.aliasSymbolForTypeNode(n);
        t.aliasTypeArgs = this.typeArgsForAliasSymbol(t.aliasSymbol);
        links.resolvedType = type;
        this.constraintTypeFromMappedType(t);
      }
      return links.resolvedType;
    }
    actualTypeVariable(t: qt.Type): qt.Type {
      if (t.flags & qt.TypeFlags.Substitution) return (<qt.SubstitutionType>type).baseType;
      if (
        t.flags & qt.TypeFlags.IndexedAccess &&
        ((<qt.IndexedAccessType>type).objectType.flags & qt.TypeFlags.Substitution || (<qt.IndexedAccessType>type).indexType.flags & qt.TypeFlags.Substitution)
      )
        return this.indexedAccessType(this.actualTypeVariable((<qt.IndexedAccessType>type).objectType), this.actualTypeVariable((<qt.IndexedAccessType>type).indexType));
      return type;
    }
    conditionalType(root: qt.ConditionalRoot, mapper: qt.TypeMapper | undefined): qt.Type {
      let result;
      let extraTypes: qt.Type[] | undefined;
      while (true) {
        const checkType = instantiateType(root.checkType, mapper);
        const checkTypeInstantiable = qf.is.genericObjectType(checkType) || qf.is.genericIndexType(checkType);
        const extendsType = instantiateType(root.extendsType, mapper);
        if (checkType === wildcardType || extendsType === wildcardType) return wildcardType;
        let combinedMapper: qt.TypeMapper | undefined;
        if (root.inferTypeParams) {
          const context = qf.create.inferenceContext(root.inferTypeParams, undefined, InferenceFlags.None);
          if (!checkTypeInstantiable || !some(root.inferTypeParams, (t) => t === extendsType))
            inferTypes(context.inferences, checkType, extendsType, qt.InferencePriority.NoConstraints | qt.InferencePriority.AlwaysStrict);
          combinedMapper = mergeTypeMappers(mapper, context.mapper);
        }
        const inferredExtendsType = combinedMapper ? instantiateType(root.extendsType, combinedMapper) : extendsType;
        if (!checkTypeInstantiable && !qf.is.genericObjectType(inferredExtendsType) && !qf.is.genericIndexType(inferredExtendsType)) {
          if (
            !(inferredExtendsType.flags & qt.TypeFlags.AnyOrUnknown) &&
            (checkType.flags & qt.TypeFlags.Any || !qf.is.typeAssignableTo(this.permissive(checkType), this.permissive(inferredExtendsType)))
          ) {
            if (checkType.flags & qt.TypeFlags.Any) (extraTypes || (extraTypes = [])).push(instantiateTypeWithoutDepthIncrease(root.trueType, combinedMapper || mapper));
            const falseType = root.falseType;
            if (falseType.flags & qt.TypeFlags.Conditional) {
              const newRoot = (<qt.ConditionalType>falseType).root;
              if (newRoot.node.parent === root.node && (!newRoot.isDistributive || newRoot.checkType === root.checkType)) {
                root = newRoot;
                continue;
              }
            }
            result = instantiateTypeWithoutDepthIncrease(falseType, mapper);
            break;
          }
          if (inferredExtendsType.flags & qt.TypeFlags.AnyOrUnknown || qf.is.typeAssignableTo(this.restrictive(checkType), this.restrictive(inferredExtendsType))) {
            result = instantiateTypeWithoutDepthIncrease(root.trueType, combinedMapper || mapper);
            break;
          }
        }
        const erasedCheckType = this.actualTypeVariable(checkType);
        result = <qt.ConditionalType>qf.create.type(TypeFlags.Conditional);
        result.root = root;
        result.checkType = erasedCheckType;
        result.extendsType = extendsType;
        result.mapper = mapper;
        result.combinedMapper = combinedMapper;
        result.aliasSymbol = root.aliasSymbol;
        result.aliasTypeArgs = instantiateTypes(root.aliasTypeArgs, mapper!);
        break;
      }
      return extraTypes ? this.unionType(append(extraTypes, result)) : result;
    }
    trueTypeFromConditionalType(t: qt.ConditionalType) {
      return t.resolvedTrueType || (t.resolvedTrueType = instantiateType(t.root.trueType, t.mapper));
    }
    falseTypeFromConditionalType(t: qt.ConditionalType) {
      return t.resolvedFalseType || (t.resolvedFalseType = instantiateType(t.root.falseType, t.mapper));
    }
    inferredTrueTypeFromConditionalType(t: qt.ConditionalType) {
      return t.resolvedInferredTrueType || (t.resolvedInferredTrueType = t.combinedMapper ? instantiateType(t.root.trueType, t.combinedMapper) : this.trueTypeFromConditionalType(t));
    }
    inferTypeParams(n: qt.ConditionalTyping): qt.TypeParam[] | undefined {
      let result: qt.TypeParam[] | undefined;
      if (n.locals) {
        n.locals.forEach((symbol) => {
          if (symbol.flags & SymbolFlags.TypeParam) result = append(result, this.declaredTypeOfSymbol(symbol));
        });
      }
      return result;
    }
    typeFromConditionalTyping(n: qt.ConditionalTyping): qt.Type {
      const links = this.nodeLinks(n);
      if (!links.resolvedType) {
        const checkType = this.typeFromTypeNode(n.checkType);
        const aliasSymbol = this.aliasSymbolForTypeNode(n);
        const aliasTypeArgs = this.typeArgsForAliasSymbol(aliasSymbol);
        const allOuterTypeParams = this.outerTypeParams(n, true);
        const outerTypeParams = aliasTypeArgs ? allOuterTypeParams : qu.filter(allOuterTypeParams, (tp) => qf.is.typeParamPossiblyReferenced(tp, n));
        const root: qt.ConditionalRoot = {
          n: n,
          checkType,
          extendsType: this.typeFromTypeNode(n.extendsType),
          trueType: this.typeFromTypeNode(n.trueType),
          falseType: this.typeFromTypeNode(n.falseType),
          isDistributive: !!(checkType.flags & qt.TypeFlags.TypeParam),
          inferTypeParams: this.inferTypeParams(n),
          outerTypeParams,
          instantiations: undefined,
          aliasSymbol,
          aliasTypeArgs,
        };
        links.resolvedType = this.conditionalType(root, undefined);
        if (outerTypeParams) {
          root.instantiations = new qu.QMap<qt.Type>();
          root.instantiations.set(this.typeListId(outerTypeParams), links.resolvedType);
        }
      }
      return links.resolvedType;
    }
    typeFromInferTyping(n: qt.InferTyping): qt.Type {
      const links = this.nodeLinks(n);
      if (!links.resolvedType) links.resolvedType = this.declaredTypeOfTypeParam(this.symbolOfNode(n.typeParam));
      return links.resolvedType;
    }
    identifierChain(n: qt.EntityName): qt.Identifier[] {
      if (n.kind === Syntax.Identifier) return [n];
      return append(this.identifierChain(n.left), n.right);
    }
    typeFromImportTyping(n: qt.ImportTyping): qt.Type {
      const links = this.nodeLinks(n);
      if (!links.resolvedType) {
        if (n.isTypeOf && n.typeArgs) {
          error(n, qd.msgs.Type_args_cannot_be_used_here);
          links.resolvedSymbol = unknownSymbol;
          return (links.resolvedType = errorType);
        }
        if (!qf.is.literalImportTyping(n)) {
          error(n.arg, qd.msgs.String_literal_expected);
          links.resolvedSymbol = unknownSymbol;
          return (links.resolvedType = errorType);
        }
        const targetMeaning = n.isTypeOf ? SymbolFlags.Value : n.flags & NodeFlags.Doc ? SymbolFlags.Value | SymbolFlags.Type : SymbolFlags.Type;
        const innerModuleSymbol = resolveExternalModuleName(n, n.arg.literal);
        if (!innerModuleSymbol) {
          links.resolvedSymbol = unknownSymbol;
          return (links.resolvedType = errorType);
        }
        const moduleSymbol = resolveExternalModuleSymbol(innerModuleSymbol, false);
        if (!qf.is.missing(n.qualifier)) {
          const nameStack: qt.Identifier[] = this.identifierChain(n.qualifier!);
          let currentNamespace = moduleSymbol;
          let current: qc.Identifier | undefined;
          while ((current = nameStack.shift())) {
            const meaning = nameStack.length ? SymbolFlags.Namespace : targetMeaning;
            const next = this.symbol(this.mergedSymbol(currentNamespace.resolveSymbol()).this.exportsOfSymbol(), current.escapedText, meaning);
            if (!next) {
              error(current, qd.msgs.Namespace_0_has_no_exported_member_1, this.fullyQualifiedName(currentNamespace), declarationNameToString(current));
              return (links.resolvedType = errorType);
            }
            this.nodeLinks(current).resolvedSymbol = next;
            this.nodeLinks(current.parent).resolvedSymbol = next;
            currentNamespace = next;
          }
          links.resolvedType = resolveImportSymbolType(n, links, currentNamespace, targetMeaning);
        } else {
          if (moduleSymbol.flags & targetMeaning) links.resolvedType = resolveImportSymbolType(n, links, moduleSymbol, targetMeaning);
          else {
            const errorMessage =
              targetMeaning === SymbolFlags.Value
                ? qd.msgs.Module_0_does_not_refer_to_a_value_but_is_used_as_a_value_here
                : qd.msgs.Module_0_does_not_refer_to_a_type_but_is_used_as_a_type_here_Did_you_mean_typeof_import_0;
            error(n, errorMessage, n.arg.literal.text);
            links.resolvedSymbol = unknownSymbol;
            links.resolvedType = errorType;
          }
        }
      }
      return links.resolvedType;
    }
    typeFromTypeLiteralOrFunctionOrConstructorTyping(n: qt.Typing): qt.Type {
      const links = this.nodeLinks(n);
      if (!links.resolvedType) {
        const aliasSymbol = this.aliasSymbolForTypeNode(n);
        if (this.membersOfSymbol(n.symbol).size === 0 && !aliasSymbol) links.resolvedType = qu.emptyTypeLiteralType;
        else {
          let type = qf.create.objectType(ObjectFlags.Anonymous, n.symbol);
          t.aliasSymbol = aliasSymbol;
          t.aliasTypeArgs = this.typeArgsForAliasSymbol(aliasSymbol);
          if (n.kind === Syntax.DocTypingLiteral && n.qf.is.arrayType) type = qf.create.arrayType(t);
          links.resolvedType = type;
        }
      }
      return links.resolvedType;
    }
    aliasSymbolForTypeNode(n: Node) {
      let host = n.parent;
      while (host.kind === Syntax.ParenthesizedTyping || (host.kind === Syntax.TypingOperator && host.operator === Syntax.ReadonlyKeyword)) {
        host = host.parent;
      }
      return qf.is.typeAlias(host) ? this.symbolOfNode(host) : undefined;
    }
    typeArgsForAliasSymbol(symbol: qt.Symbol | undefined) {
      return symbol ? this.this.localTypeParamsOfClassOrInterfaceOrTypeAlias() : undefined;
    }
    spreadType(left: qt.Type, right: qt.Type, symbol: qt.Symbol | undefined, objectFlags: ObjectFlags, readonly: boolean): qt.Type {
      if (left.flags & qt.TypeFlags.Any || right.flags & qt.TypeFlags.Any) return anyType;
      if (left.flags & qt.TypeFlags.Unknown || right.flags & qt.TypeFlags.Unknown) return unknownType;
      if (left.flags & qt.TypeFlags.Never) return right;
      if (right.flags & qt.TypeFlags.Never) return left;
      if (left.flags & qt.TypeFlags.Union) {
        const merged = tryMergeUnionOfObjectTypeAndEmptyObject(left as qt.UnionType, readonly);
        if (merged) return this.spreadType(merged, right, symbol, objectFlags, readonly);
        return mapType(left, (t) => this.spreadType(t, right, symbol, objectFlags, readonly));
      }
      if (right.flags & qt.TypeFlags.Union) {
        const merged = tryMergeUnionOfObjectTypeAndEmptyObject(right as qt.UnionType, readonly);
        if (merged) return this.spreadType(left, merged, symbol, objectFlags, readonly);
        return mapType(right, (t) => this.spreadType(left, t, symbol, objectFlags, readonly));
      }
      if (right.flags & (TypeFlags.BooleanLike | qt.TypeFlags.NumberLike | qt.TypeFlags.BigIntLike | qt.TypeFlags.StringLike | qt.TypeFlags.EnumLike | qt.TypeFlags.NonPrimitive | qt.TypeFlags.Index))
        return left;
      if (qf.is.genericObjectType(left) || qf.is.genericObjectType(right)) {
        if (qf.is.emptyObjectType(left)) return right;
        if (left.flags & qt.TypeFlags.Intersection) {
          const types = (<qt.IntersectionType>left).types;
          const lastLeft = types[types.length - 1];
          if (qf.is.nonGenericObjectType(lastLeft) && qf.is.nonGenericObjectType(right))
            return this.intersectionType(concatenate(types.slice(0, types.length - 1), [this.spreadType(lastLeft, right, symbol, objectFlags, readonly)]));
        }
        return this.intersectionType([left, right]);
      }
      const members = new qc.SymbolTable();
      const skippedPrivateMembers = qu.qf.create.escapedMap<boolean>();
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
            result.type = this.unionType([this.typeOfSymbol(leftProp), this.typeWithFacts(rightType, TypeFacts.NEUndefined)]);
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
      const spread = qf.create.anonymousType(symbol, members, qu.empty, qu.empty, this.indexInfoWithReadonly(stringIndexInfo, readonly), this.indexInfoWithReadonly(numberIndexInfo, readonly));
      spread.objectFlags |= ObjectFlags.ObjectLiteral | ObjectFlags.ContainsObjectOrArrayLiteral | ObjectFlags.ContainsSpread | objectFlags;
      return spread;
    }
    spreadSymbol(prop: qt.Symbol, readonly: boolean) {
      const isSetonlyAccessor = prop.flags & SymbolFlags.SetAccessor && !(prop.flags & SymbolFlags.GetAccessor);
      if (!isSetonlyAccessor && readonly === qf.is.readonlySymbol(prop)) return prop;
      const flags = SymbolFlags.Property | (prop.flags & SymbolFlags.Optional);
      const result = new qc.Symbol(flags, prop.escName, readonly ? qt.CheckFlags.Readonly : 0);
      result.type = isSetonlyAccessor ? undefinedType : this.typeOfSymbol(prop);
      result.declarations = prop.declarations;
      result.nameType = s.this.links(prop).nameType;
      result.syntheticOrigin = prop;
      return result;
    }
    indexInfoWithReadonly(info: qt.IndexInfo | undefined, readonly: boolean) {
      return info && info.isReadonly !== readonly ? qf.create.indexInfo(info.type, readonly, info.declaration) : info;
    }
    freshTypeOfLiteralType(t: qt.Type): qt.Type {
      if (t.flags & qt.TypeFlags.Literal) {
        if (!(<qt.LiteralType>type).freshType) {
          const freshType = qf.create.literalType(t.flags, (<qt.LiteralType>type).value, (<qt.LiteralType>type).symbol);
          freshType.regularType = <qt.LiteralType>type;
          freshType.freshType = freshType;
          (<qt.LiteralType>type).freshType = freshType;
        }
        return (<qt.LiteralType>type).freshType;
      }
      return type;
    }
    regularTypeOfLiteralType(t: qt.Type): qt.Type {
      return t.flags & qt.TypeFlags.Literal
        ? (<qt.LiteralType>type).regularType
        : t.flags & qt.TypeFlags.Union
        ? (<qt.UnionType>type).regularType || ((<qt.UnionType>type).regularType = this.unionType(sameMap((<qt.UnionType>type).types, getRegularTypeOfLiteralType)) as qt.UnionType)
        : type;
    }
    literalType(value: string | number | qt.PseudoBigInt, enumId?: number, symbol?: qt.Symbol) {
      const qualifier = typeof value === 'number' ? '#' : typeof value === 'string' ? '@' : 'n';
      const key = (enumId ? enumId : '') + qualifier + (typeof value === 'object' ? pseudoBigIntToString(value) : value);
      let type = literalTypes.get(key);
      if (!type) {
        const flags =
          (typeof value === 'number' ? qt.TypeFlags.NumberLiteral : typeof value === 'string' ? qt.TypeFlags.StringLiteral : qt.TypeFlags.BigIntLiteral) | (enumId ? qt.TypeFlags.EnumLiteral : 0);
        literalTypes.set(key, (type = qf.create.literalType(flags, value, symbol)));
        t.regularType = type;
      }
      return type;
    }
    typeFromLiteralTyping(n: qt.LiteralTyping): qt.Type {
      const links = this.nodeLinks(n);
      if (!links.resolvedType) links.resolvedType = this.regularTypeOfLiteralType(qf.check.expression(n.literal));
      return links.resolvedType;
    }
    eSSymbolLikeTypeForNode(n: Node) {
      if (qf.is.validESSymbolDeclaration(n)) {
        const symbol = this.symbolOfNode(n);
        const links = s.this.links(symbol);
        return links.uniqueESSymbolType || (links.uniqueESSymbolType = qf.create.uniqueESSymbolType(symbol));
      }
      return esSymbolType;
    }
    thisType(n: Node): qt.Type {
      const container = this.thisContainer(n, false);
      const parent = container && container.parent;
      if (parent && (qf.is.classLike(parent) || parent?.kind === Syntax.InterfaceDeclaration)) {
        if (!qf.has.syntacticModifier(container, ModifierFlags.Static) && (!container.kind === Syntax.ConstructorDeclaration || qf.is.descendantOf(n, container.body)))
          return this.declaredTypeOfClassOrInterface(this.symbolOfNode(parent as qt.ClassLikeDeclaration | qt.InterfaceDeclaration)).thisType!;
      }
      if (
        parent &&
        parent?.kind === Syntax.ObjectLiteralExpression &&
        parent?.parent?.kind === Syntax.BinaryExpression &&
        this.assignmentDeclarationKind(parent?.parent) === qt.AssignmentDeclarationKind.Prototype
      ) {
        return this.declaredTypeOfClassOrInterface(this.symbolOfNode(parent?.parent?.left)!.parent!).thisType!;
      }
      const host = n.flags & NodeFlags.Doc ? this.hostSignatureFromDoc(n) : undefined;
      if (
        host &&
        host.kind === Syntax.FunctionExpression &&
        host.parent?.kind === Syntax.BinaryExpression &&
        this.assignmentDeclarationKind(host.parent) === qt.AssignmentDeclarationKind.PrototypeProperty
      )
        return this.declaredTypeOfClassOrInterface(this.symbolOfNode(host.parent?.left)!.parent!).thisType!;
      if (qf.is.jsConstructor(container) && qf.is.descendantOf(n, container.body)) return this.declaredTypeOfClassOrInterface(this.symbolOfNode(container)).thisType!;
      error(n, qd.msgs.A_this_type_is_available_only_in_a_non_static_member_of_a_class_or_interface);
      return errorType;
    }
    typeFromThisNodeTypeNode(n: qt.ThisExpression | qt.ThisTyping): qt.Type {
      const links = this.nodeLinks(n);
      if (!links.resolvedType) links.resolvedType = this.thisType(n);
      return links.resolvedType;
    }
    typeFromNamedTupleTyping(n: qt.NamedTupleMember): qt.Type {
      const links = this.nodeLinks(n);
      if (!links.resolvedType) {
        let type = this.typeFromTypeNode(n.type);
        if (n.dot3Token) type = this.elemTypeOfArrayType(t) || errorType;
        if (n.questionToken && strictNullChecks) type = this.optionalType(t);
        links.resolvedType = type;
      }
      return links.resolvedType;
    }
    typeFromTypeNode(n: qt.Typing): qt.Type {
      return this.conditionalFlowTypeOfType(this.typeFromTypeNodeWorker(n), n);
    }
    typeFromTypeNodeWorker(n: qt.Typing): qt.Type {
      switch (n.kind) {
        case Syntax.AnyKeyword:
        case Syntax.DocAllTyping:
        case Syntax.DocUnknownTyping:
          return anyType;
        case Syntax.UnknownKeyword:
          return unknownType;
        case Syntax.StringKeyword:
          return stringType;
        case Syntax.NumberKeyword:
          return numberType;
        case Syntax.BigIntKeyword:
          return bigintType;
        case Syntax.BooleanKeyword:
          return booleanType;
        case Syntax.SymbolKeyword:
          return esSymbolType;
        case Syntax.VoidKeyword:
          return voidType;
        case Syntax.UndefinedKeyword:
          return undefinedType;
        case Syntax.NullKeyword:
          return nullType;
        case Syntax.NeverKeyword:
          return neverType;
        case Syntax.ObjectKeyword:
          return n.flags & NodeFlags.JavaScriptFile && !noImplicitAny ? anyType : nonPrimitiveType;
        case Syntax.ThisTyping:
        case Syntax.ThisKeyword:
          return this.typeFromThisNodeTypeNode(n as qt.ThisExpression | qt.ThisTyping);
        case Syntax.LiteralTyping:
          return this.typeFromLiteralTyping(<qt.LiteralTyping>n);
        case Syntax.TypingReference:
          return this.typeFromTypeReference(<qt.TypingReference>n);
        case Syntax.TypingPredicate:
          return (<qt.TypingPredicate>n).assertsModifier ? voidType : booleanType;
        case Syntax.ExpressionWithTypings:
          return this.typeFromTypeReference(<qt.ExpressionWithTypings>n);
        case Syntax.TypingQuery:
          return this.typeFromTypingQuery(<qt.TypingQuery>n);
        case Syntax.ArrayTyping:
        case Syntax.TupleTyping:
          return this.typeFromArrayOrTupleTyping(<qt.ArrayTyping | qt.TupleTyping>n);
        case Syntax.OptionalTyping:
          return this.typeFromOptionalTyping(<qt.OptionalTyping>n);
        case Syntax.UnionTyping:
          return this.typeFromUnionTyping(<qt.UnionTyping>n);
        case Syntax.IntersectionTyping:
          return this.typeFromIntersectionTyping(<qt.IntersectionTyping>n);
        case Syntax.DocNullableTyping:
          return this.typeFromDocNullableTypingNode(<qt.DocNullableTyping>n);
        case Syntax.DocOptionalTyping:
          return addOptionality(this.typeFromTypeNode((n as qt.DocOptionalTyping).type));
        case Syntax.NamedTupleMember:
          return this.typeFromNamedTupleTyping(n as qt.NamedTupleMember);
        case Syntax.ParenthesizedTyping:
        case Syntax.DocNonNullableTyping:
        case Syntax.DocTypingExpression:
          return this.typeFromTypeNode((<qt.ParenthesizedTyping | qt.DocTypeReferencingNode | qt.DocTypingExpression | qt.NamedTupleMember>n).type);
        case Syntax.RestTyping:
          return this.elemTypeOfArrayType(this.typeFromTypeNode((<qt.RestTyping>n).type)) || errorType;
        case Syntax.DocVariadicTyping:
          return this.typeFromDocVariadicTyping(n as qt.DocVariadicTyping);
        case Syntax.FunctionTyping:
        case Syntax.ConstructorTyping:
        case Syntax.TypingLiteral:
        case Syntax.DocTypingLiteral:
        case Syntax.DocFunctionTyping:
        case Syntax.DocSignature:
          return this.typeFromTypeLiteralOrFunctionOrConstructorTyping(n);
        case Syntax.TypingOperator:
          return this.typeFromTypingOperator(<qt.TypingOperator>n);
        case Syntax.IndexedAccessTyping:
          return this.typeFromIndexedAccessTyping(<qt.IndexedAccessTyping>n);
        case Syntax.MappedTyping:
          return this.typeFromMappedTyping(<qt.MappedTyping>n);
        case Syntax.ConditionalTyping:
          return this.typeFromConditionalTyping(<qt.ConditionalTyping>n);
        case Syntax.InferTyping:
          return this.typeFromInferTyping(<qt.InferTyping>n);
        case Syntax.ImportTyping:
          return this.typeFromImportTyping(<qt.ImportTyping>n);
        case Syntax.Identifier:
        case Syntax.QualifiedName:
          const symbol = this.symbolAtLocation(n);
          return symbol ? this.declaredTypeOfSymbol(symbol) : errorType;
        default:
          return errorType;
      }
    }
    mappedType(t: qt.Type, mapper: qt.TypeMapper): qt.Type {
      switch (mapper.kind) {
        case qt.TypeMapKind.Simple:
          return type === mapper.source ? mapper.target : type;
        case qt.TypeMapKind.Array:
          const sources = mapper.sources;
          const targets = mapper.targets;
          for (let i = 0; i < sources.length; i++) {
            if (type === sources[i]) return targets ? targets[i] : anyType;
          }
          return type;
        case qt.TypeMapKind.Function:
          return mapper.func(t);
        case qt.TypeMapKind.Composite:
        case qt.TypeMapKind.Merged:
          const t1 = this.mappedType(t, mapper.mapper1);
          return t1 !== type && mapper.kind === qt.TypeMapKind.Composite ? instantiateType(t1, mapper.mapper2) : this.mappedType(t1, mapper.mapper2);
      }
    }
    restrictiveTypeParam(tp: qt.TypeParam) {
      return tp.constraint === unknownType ? tp : tp.restrictive || ((tp.restrictive = qf.create.typeParam(tp.symbol)), ((tp.restrictive as qt.TypeParam).constraint = unknownType), tp.restrictive);
    }
    objectTypeInstantiation(t: qt.AnonymousType | qt.DeferredTypeReference, mapper: qt.TypeMapper) {
      const target = t.objectFlags & ObjectFlags.Instantiated ? t.target! : type;
      const n = t.objectFlags & ObjectFlags.Reference ? (<qt.TypeReference>type).node! : t.symbol.declarations[0];
      const links = this.nodeLinks(n);
      let typeParams = links.outerTypeParams;
      if (!typeParams) {
        let declaration = n;
        if (qf.is.inJSFile(declaration)) {
          const paramTag = qc.findAncestor(declaration, isDocParamTag);
          if (paramTag) {
            const paramSymbol = this.paramSymbolFromDoc(paramTag);
            if (paramSymbol) declaration = paramSymbol.valueDeclaration;
          }
        }
        let outerTypeParams = this.outerTypeParams(declaration, true);
        if (qf.is.jsConstructor(declaration)) {
          const templateTagParams = this.typeParamsFromDeclaration(declaration as qt.DeclarationWithTypeParams);
          outerTypeParams = qu.addRange(outerTypeParams, templateTagParams);
        }
        typeParams = outerTypeParams || qu.empty;
        typeParams =
          (target.objectFlags & ObjectFlags.Reference || target.symbol.flags & SymbolFlags.TypeLiteral) && !target.aliasTypeArgs
            ? qu.filter(typeParams, (tp) => qf.is.typeParamPossiblyReferenced(tp, declaration))
            : typeParams;
        links.outerTypeParams = typeParams;
        if (typeParams.length) {
          links.instantiations = new qu.QMap<qt.Type>();
          links.instantiations.set(this.typeListId(typeParams), target);
        }
      }
      if (typeParams.length) {
        const combinedMapper = combineTypeMappers(t.mapper, mapper);
        const typeArgs = map(typeParams, (t) => this.mappedType(t, combinedMapper));
        const id = this.typeListId(typeArgs);
        let result = links.instantiations!.get(id);
        if (!result) {
          const newMapper = qf.create.typeMapper(typeParams, typeArgs);
          result =
            target.objectFlags & ObjectFlags.Reference
              ? qf.create.deferredTypeReference((<qt.DeferredTypeReference>type).target, (<qt.DeferredTypeReference>type).node, newMapper)
              : target.objectFlags & ObjectFlags.Mapped
              ? instantiateMappedType(<qt.MappedType>target, newMapper)
              : instantiateAnonymousType(target, newMapper);
          links.instantiations!.set(id, result);
        }
        return result;
      }
      return type;
    }
    homomorphicTypeVariable(t: qt.MappedType) {
      const constraintType = this.constraintTypeFromMappedType(t);
      if (constraintType.flags & qt.TypeFlags.Index) {
        const typeVariable = this.actualTypeVariable((<qt.IndexType>constraintType).type);
        if (typeVariable.flags & qt.TypeFlags.TypeParam) return <qt.TypeParam>typeVariable;
      }
      return;
    }
    modifiedReadonlyState(state: boolean, modifiers: MappedTypeModifiers) {
      return modifiers & MappedTypeModifiers.IncludeReadonly ? true : modifiers & MappedTypeModifiers.ExcludeReadonly ? false : state;
    }
    conditionalTypeInstantiation(t: qt.ConditionalType, mapper: qt.TypeMapper): qt.Type {
      const root = t.root;
      if (root.outerTypeParams) {
        const typeArgs = map(root.outerTypeParams, (t) => this.mappedType(t, mapper));
        const id = this.typeListId(typeArgs);
        let result = root.instantiations!.get(id);
        if (!result) {
          const newMapper = qf.create.typeMapper(root.outerTypeParams, typeArgs);
          result = instantiateConditionalType(root, newMapper);
          root.instantiations!.set(id, result);
        }
        return result;
      }
      return type;
    }
    permissive(t: qt.Type) {
      return t.flags & (TypeFlags.Primitive | qt.TypeFlags.AnyOrUnknown | qt.TypeFlags.Never) ? type : t.permissive || (t.permissive = instantiateType(t, permissiveMapper));
    }
    restrictiveInstantiation(t: qt.Type) {
      if (t.flags & (TypeFlags.Primitive | qt.TypeFlags.AnyOrUnknown | qt.TypeFlags.Never)) return type;
      if (t.restrictive) return t.restrictive;
      t.restrictive = instantiateType(t, restrictiveMapper);
      t.restrictive.restrictive = t.restrictive;
      return t.restrictive;
    }
    typeWithoutSignatures(t: qt.Type): qt.Type {
      if (t.flags & qt.TypeFlags.Object) {
        const resolved = resolveStructuredTypeMembers(<qt.ObjectType>type);
        if (resolved.constructSignatures.length || resolved.callSignatures.length) {
          const result = qf.create.objectType(ObjectFlags.Anonymous, t.symbol);
          result.members = resolved.members;
          result.properties = resolved.properties;
          result.callSignatures = qu.empty;
          result.constructSignatures = qu.empty;
          return result;
        }
      } else if (t.flags & qt.TypeFlags.Intersection) {
        return this.intersectionType(map((<qt.IntersectionType>type).types, getTypeWithoutSignatures));
      }
      return type;
    }
    bestMatchIndexedAccessTypeOrUndefined(source: qt.Type, target: qt.Type, nameType: qt.Type) {
      const idx = this.indexedAccessTypeOrUndefined(target, nameType);
      if (idx) return idx;
      if (target.flags & qt.TypeFlags.Union) {
        const best = this.bestMatchingType(source, target as qt.UnionType);
        if (best) return this.indexedAccessTypeOrUndefined(best, nameType);
      }
    }
    elaborationElemForJsxChild(child: qt.JsxChild, nameType: qt.LiteralType, getInvalidTextDiagnostic: () => qd.Message) {
      switch (child.kind) {
        case Syntax.JsxExpression:
          return { errorNode: child, innerExpression: child.expression, nameType };
        case Syntax.JsxText:
          if (child.onlyTriviaWhitespaces) break;
          return { errorNode: child, innerExpression: undefined, nameType, errorMessage: this.invalidTextDiagnostic() };
        case Syntax.JsxElem:
        case Syntax.JsxSelfClosingElem:
        case Syntax.JsxFragment:
          return { errorNode: child, innerExpression: child, nameType };
        default:
          return qc.assert.never(child, 'Found invalid jsx child');
      }
      return;
    }
    semanticJsxChildren(children: Nodes<qt.JsxChild>) {
      return qu.filter(children, (i) => !i.kind === Syntax.JsxText || !i.onlyTriviaWhitespaces);
    }
    normalizedType(t: qt.Type, writing: boolean): qt.Type {
      while (true) {
        const t = qf.is.freshLiteralType(t)
          ? (<qt.FreshableType>type).regularType
          : this.objectFlags(t) & ObjectFlags.Reference && (<qt.TypeReference>type).node
          ? qf.create.typeReference((<qt.TypeReference>type).target, this.typeArgs(<qt.TypeReference>type))
          : t.flags & qt.TypeFlags.UnionOrIntersection
          ? this.reducedType(t)
          : t.flags & qt.TypeFlags.Substitution
          ? writing
            ? (<qt.SubstitutionType>type).baseType
            : (<qt.SubstitutionType>type).substitute
          : t.flags & qt.TypeFlags.Simplifiable
          ? this.simplifiedType(t, writing)
          : type;
        if (t === type) break;
        type = t;
      }
      return type;
    }
    bestMatchingType(source: qt.Type, target: qt.UnionOrIntersectionType, isRelatedTo = compareTypesAssignable) {
      return (
        findMatchingDiscriminantType(source, target, isRelatedTo, true) ||
        findMatchingTypeReferenceOrTypeAliasReference(source, target) ||
        findBestTypeForObjectLiteral(source, target) ||
        findBestTypeForInvokable(source, target) ||
        findMostOverlappyType(source, target)
      );
    }
    markerTypeReference(t: qt.GenericType, source: qt.TypeParam, target: qt.Type) {
      const result = qf.create.typeReference(
        type,
        map(t.typeParams, (t) => (t === source ? target : t))
      );
      result.objectFlags |= ObjectFlags.MarkerType;
      return result;
    }
    variancesWorker<TCache extends { variances?: VarianceFlags[] }>(
      typeParams: readonly qt.TypeParam[] = qu.empty,
      cache: TCache,
      createMarkerType: (input: TCache, param: qt.TypeParam, marker: qt.Type) => qt.Type
    ): VarianceFlags[] {
      let variances = cache.variances;
      if (!variances) {
        cache.variances = qu.empty;
        variances = [];
        for (const tp of typeParams) {
          let unmeasurable = false;
          let unreliable = false;
          const oldHandler = outofbandVarianceMarkerHandler;
          outofbandVarianceMarkerHandler = (onlyUnreliable) => (onlyUnreliable ? (unreliable = true) : (unmeasurable = true));
          const typeWithSuper = createMarkerType(cache, tp, markerSuperType);
          const typeWithSub = createMarkerType(cache, tp, markerSubType);
          let variance = (qf.is.typeAssignableTo(typeWithSub, typeWithSuper) ? VarianceFlags.Covariant : 0) | (qf.is.typeAssignableTo(typeWithSuper, typeWithSub) ? VarianceFlags.Contravariant : 0);
          if (variance === VarianceFlags.Bivariant && qf.is.typeAssignableTo(createMarkerType(cache, tp, markerOtherType), typeWithSuper)) variance = VarianceFlags.Independent;
          outofbandVarianceMarkerHandler = oldHandler;
          if (unmeasurable || unreliable) {
            if (unmeasurable) variance |= VarianceFlags.Unmeasurable;
            if (unreliable) variance |= VarianceFlags.Unreliable;
          }
          variances.push(variance);
        }
        cache.variances = variances;
      }
      return variances;
    }
    variances(t: qt.GenericType): VarianceFlags[] {
      if (type === globalArrayType || type === globalReadonlyArrayType || t.objectFlags & ObjectFlags.Tuple) return arrayVariances;
      return this.variancesWorker(t.typeParams, type, getMarkerTypeReference);
    }
    typeReferenceId(t: qt.TypeReference, typeParams: qt.Type[], depth = 0) {
      let result = '' + t.target.id;
      for (const t of this.typeArgs(t)) {
        if (qf.is.unconstrainedTypeParam(t)) {
          let index = typeParams.indexOf(t);
          if (index < 0) {
            index = typeParams.length;
            typeParams.push(t);
          }
          result += '=' + index;
        } else if (depth < 4 && qf.is.typeReferenceWithGenericArgs(t)) {
          result += '<' + this.typeReferenceId(t as qt.TypeReference, typeParams, depth + 1) + '>';
        } else {
          result += '-' + t.id;
        }
      }
      return result;
    }
    relationKey(source: qt.Type, target: qt.Type, intersectionState: IntersectionState, relation: qu.QMap<RelationComparisonResult>) {
      if (relation === identityRelation && source.id > target.id) {
        const temp = source;
        source = target;
        target = temp;
      }
      const postFix = intersectionState ? ':' + intersectionState : '';
      if (qf.is.typeReferenceWithGenericArgs(source) && qf.is.typeReferenceWithGenericArgs(target)) {
        const typeParams: qt.Type[] = [];
        return this.typeReferenceId(<qt.TypeReference>source, typeParams) + ',' + this.typeReferenceId(<qt.TypeReference>target, typeParams) + postFix;
      }
      return source.id + ',' + target.id + postFix;
    }
    declaringClass(prop: qt.Symbol) {
      return prop.parent && prop.parent?.flags & SymbolFlags.Class ? <qt.InterfaceType>this.declaredTypeOfSymbol(this.parentOfSymbol(prop)!) : undefined;
    }
    typeOfPropertyInBaseClass(property: qt.Symbol) {
      const classType = this.declaringClass(property);
      const baseClassType = classType && this.baseTypes(classType)[0];
      return baseClassType && this.typeOfPropertyOfType(baseClassType, property.escName);
    }
    rootObjectTypeFromIndexedAccessChain(t: qt.Type) {
      let t = type;
      while (t.flags & qt.TypeFlags.IndexedAccess) {
        t = (t as qt.IndexedAccessType).objectType;
      }
      return t;
    }
    supertypeOrUnion(types: qt.Type[]): qt.Type {
      return literalTypesWithSameBaseType(types) ? this.unionType(types) : reduceLeft(types, (s, t) => (qf.is.typeSubtypeOf(s, t) ? t : s))!;
    }
    commonSupertype(types: qt.Type[]): qt.Type {
      if (!strictNullChecks) return this.supertypeOrUnion(types);
      const primaryTypes = qu.filter(types, (t) => !(t.flags & qt.TypeFlags.Nullable));
      return primaryTypes.length ? this.nullableType(this.supertypeOrUnion(primaryTypes), this.falsyFlagsOfTypes(types) & qt.TypeFlags.Nullable) : this.unionType(types, UnionReduction.Subtype);
    }
    commonSubtype(types: qt.Type[]) {
      return reduceLeft(types, (s, t) => (qf.is.typeSubtypeOf(t, s) ? t : s))!;
    }
    elemTypeOfArrayType(t: qt.Type): qt.Type | undefined {
      return qf.is.arrayType(t) ? this.typeArgs(type as qt.TypeReference)[0] : undefined;
    }
    tupleElemType(t: qt.Type, index: number) {
      const propType = this.typeOfPropertyOfType(t, ('' + index) as qu.__String);
      if (propType) return propType;
      if (everyType(t, qf.is.tupleType)) return mapType(t, (t) => this.restTypeOfTupleType(<qt.TupleTypeReference>t) || undefinedType);
      return;
    }
    baseTypeOfLiteralType(t: qt.Type): qt.Type {
      return t.flags & qt.TypeFlags.EnumLiteral
        ? this.baseTypeOfEnumLiteralType(<qt.LiteralType>type)
        : t.flags & qt.TypeFlags.StringLiteral
        ? stringType
        : t.flags & qt.TypeFlags.NumberLiteral
        ? numberType
        : t.flags & qt.TypeFlags.BigIntLiteral
        ? bigintType
        : t.flags & qt.TypeFlags.BooleanLiteral
        ? booleanType
        : t.flags & qt.TypeFlags.Union
        ? this.unionType(sameMap((<qt.UnionType>type).types, getBaseTypeOfLiteralType))
        : type;
    }
    widenedLiteralType(t: qt.Type): qt.Type {
      return t.flags & qt.TypeFlags.EnumLiteral && qf.is.freshLiteralType(t)
        ? this.baseTypeOfEnumLiteralType(<qt.LiteralType>type)
        : t.flags & qt.TypeFlags.StringLiteral && qf.is.freshLiteralType(t)
        ? stringType
        : t.flags & qt.TypeFlags.NumberLiteral && qf.is.freshLiteralType(t)
        ? numberType
        : t.flags & qt.TypeFlags.BigIntLiteral && qf.is.freshLiteralType(t)
        ? bigintType
        : t.flags & qt.TypeFlags.BooleanLiteral && qf.is.freshLiteralType(t)
        ? booleanType
        : t.flags & qt.TypeFlags.Union
        ? this.unionType(sameMap((<qt.UnionType>type).types, this.widenedLiteralType))
        : type;
    }
    widenedUniqueESSymbolType(t: qt.Type): qt.Type {
      return t.flags & qt.TypeFlags.UniqueESSymbol ? esSymbolType : t.flags & qt.TypeFlags.Union ? this.unionType(sameMap((<qt.UnionType>type).types, getWidenedUniqueESSymbolType)) : type;
    }
    widenedLiteralLikeTypeForContextualType(t: qt.Type, contextualType: qt.Type | undefined) {
      if (!qf.is.literalOfContextualType(t, contextualType)) type = this.widenedUniqueESSymbolType(this.widenedLiteralType(t));
      return type;
    }
    widenedLiteralLikeTypeForContextualReturnTypeIfNeeded(t: qt.Type | undefined, contextualSignatureReturnType: qt.Type | undefined, isAsync: boolean) {
      if (type && qf.is.unitType(t)) {
        const contextualType = !contextualSignatureReturnType ? undefined : isAsync ? this.promisedTypeOfPromise(contextualSignatureReturnType) : contextualSignatureReturnType;
        type = this.widenedLiteralLikeTypeForContextualType(t, contextualType);
      }
      return type;
    }
    widenedLiteralLikeTypeForContextualIterationTypeIfNeeded(t: qt.Type | undefined, contextualSignatureReturnType: qt.Type | undefined, kind: IterationTypeKind, isAsyncGenerator: boolean) {
      if (type && qf.is.unitType(t)) {
        const contextualType = !contextualSignatureReturnType ? undefined : this.iterationTypeOfGeneratorFunctionReturnType(kind, contextualSignatureReturnType, isAsyncGenerator);
        type = this.widenedLiteralLikeTypeForContextualType(t, contextualType);
      }
      return type;
    }
    restTypeOfTupleType(t: qt.TupleTypeReference) {
      return t.target.hasRestElem ? this.typeArgs(t)[type.target.typeParams!.length - 1] : undefined;
    }
    restArrayTypeOfTupleType(t: qt.TupleTypeReference) {
      const restType = this.restTypeOfTupleType(t);
      return restType && qf.create.arrayType(restType);
    }
    lengthOfTupleType(t: qt.TupleTypeReference) {
      return this.typeReferenceArity(t) - (t.target.hasRestElem ? 1 : 0);
    }
    falsyFlagsOfTypes(types: qt.Type[]): qt.TypeFlags {
      let result: qt.TypeFlags = 0;
      for (const t of types) {
        result |= this.falsyFlags(t);
      }
      return result;
    }
    falsyFlags(t: qt.Type): qt.TypeFlags {
      return t.flags & qt.TypeFlags.Union
        ? this.falsyFlagsOfTypes((<qt.UnionType>type).types)
        : t.flags & qt.TypeFlags.StringLiteral
        ? (<qt.StringLiteralType>type).value === ''
          ? qt.TypeFlags.StringLiteral
          : 0
        : t.flags & qt.TypeFlags.NumberLiteral
        ? (<qt.NumberLiteralType>type).value === 0
          ? qt.TypeFlags.NumberLiteral
          : 0
        : t.flags & qt.TypeFlags.BigIntLiteral
        ? qf.is.zeroBigInt(<qt.BigIntLiteralType>type)
          ? qt.TypeFlags.BigIntLiteral
          : 0
        : t.flags & qt.TypeFlags.BooleanLiteral
        ? type === falseType || type === regularFalseType
          ? qt.TypeFlags.BooleanLiteral
          : 0
        : t.flags & qt.TypeFlags.PossiblyFalsy;
    }
    definitelyFalsyPartOfType(t: qt.Type): qt.Type {
      return t.flags & qt.TypeFlags.String
        ? qu.emptyStringType
        : t.flags & qt.TypeFlags.Number
        ? zeroType
        : t.flags & qt.TypeFlags.BigInt
        ? zeroBigIntType
        : type === regularFalseType ||
          type === falseType ||
          t.flags & (TypeFlags.Void | qt.TypeFlags.Undefined | qt.TypeFlags.Null) ||
          (t.flags & qt.TypeFlags.StringLiteral && (<qt.StringLiteralType>type).value === '') ||
          (t.flags & qt.TypeFlags.NumberLiteral && (<qt.NumberLiteralType>type).value === 0) ||
          (t.flags & qt.TypeFlags.BigIntLiteral && qf.is.zeroBigInt(<qt.BigIntLiteralType>type))
        ? type
        : neverType;
    }
    nullableType(t: qt.Type, flags: qt.TypeFlags): qt.Type {
      const missing = flags & ~type.flags & (TypeFlags.Undefined | qt.TypeFlags.Null);
      return missing === 0
        ? type
        : missing === qt.TypeFlags.Undefined
        ? this.unionType([type, undefinedType])
        : missing === qt.TypeFlags.Null
        ? this.unionType([type, nullType])
        : this.unionType([type, undefinedType, nullType]);
    }
    optionalType(t: qt.Type): qt.Type {
      qu.assert(strictNullChecks);
      return t.flags & qt.TypeFlags.Undefined ? type : this.unionType([type, undefinedType]);
    }
    globalNonNullableTypeInstantiation(t: qt.Type) {
      if (!deferredGlobalNonNullableTypeAlias) deferredGlobalNonNullableTypeAlias = this.globalSymbol('NonNullable' as qu.__String, SymbolFlags.TypeAlias, undefined) || unknownSymbol;
      if (deferredGlobalNonNullableTypeAlias !== unknownSymbol) return this.typeAliasInstantiation(deferredGlobalNonNullableTypeAlias, [type]);
      return this.typeWithFacts(t, TypeFacts.NEUndefinedOrNull);
    }
    nonNullableType(t: qt.Type): qt.Type {
      return strictNullChecks ? this.globalNonNullableTypeInstantiation(t) : type;
    }
    optionalExpressionType(exprType: qt.Type, expression: qt.Expression) {
      return qf.is.expressionOfOptionalChainRoot(expression) ? this.nonNullableType(exprType) : qf.is.optionalChain(expression) ? removeOptionalTypeMarker(exprType) : exprType;
    }
    regularTypeOfObjectLiteral(t: qt.Type): qt.Type {
      if (!(qf.is.objectLiteralType(t) && this.objectFlags(t) & ObjectFlags.FreshLiteral)) return type;
      const regularType = (<qt.FreshObjectLiteralType>type).regularType;
      if (regularType) return regularType;
      const resolved = <qt.ResolvedType>type;
      const members = transformTypeOfMembers(t, getRegularTypeOfObjectLiteral);
      const regularNew = qf.create.anonymousType(resolved.symbol, members, resolved.callSignatures, resolved.constructSignatures, resolved.stringIndexInfo, resolved.numberIndexInfo);
      regularNew.flags = resolved.flags;
      regularNew.objectFlags |= resolved.objectFlags & ~ObjectFlags.FreshLiteral;
      (<qt.FreshObjectLiteralType>type).regularType = regularNew;
      return regularNew;
    }
    siblingsOfContext(context: qt.WideningContext): qt.Type[] {
      if (!context.siblings) {
        const siblings: qt.Type[] = [];
        for (const type of this.siblingsOfContext(context.parent!)) {
          if (qf.is.objectLiteralType(t)) {
            const prop = this.propertyOfObjectType(t, context.propertyName!);
            if (prop) {
              forEachType(this.typeOfSymbol(prop), (t) => {
                siblings.push(t);
              });
            }
          }
        }
        context.siblings = siblings;
      }
      return context.siblings;
    }
    propertiesOfContext(context: qt.WideningContext): qt.Symbol[] {
      if (!context.resolvedProperties) {
        const names = new qu.QMap<qt.Symbol>() as EscapedMap<qt.Symbol>;
        for (const t of this.siblingsOfContext(context)) {
          if (qf.is.objectLiteralType(t) && !(this.objectFlags(t) & ObjectFlags.ContainsSpread)) {
            for (const prop of this.propertiesOfType(t)) {
              names.set(prop.escName, prop);
            }
          }
        }
        context.resolvedProperties = arrayFrom(names.values());
      }
      return context.resolvedProperties;
    }
    widenedProperty(prop: qt.Symbol, context: qt.WideningContext | undefined): qt.Symbol {
      if (!(prop.flags & SymbolFlags.Property)) return prop;
      const original = this.typeOfSymbol(prop);
      const propContext = context && qf.create.wideningContext(context, prop.escName, undefined);
      const widened = this.widenedTypeWithContext(original, propContext);
      return widened === original ? prop : qf.create.symbolWithType(prop, widened);
    }
    undefinedProperty(prop: qt.Symbol) {
      const cached = undefinedProperties.get(prop.escName);
      if (cached) return cached;
      const result = qf.create.symbolWithType(prop, undefinedType);
      result.flags |= SymbolFlags.Optional;
      undefinedProperties.set(prop.escName, result);
      return result;
    }
    widenedTypeOfObjectLiteral(t: qt.Type, context: qt.WideningContext | undefined): qt.Type {
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
      const result = qf.create.anonymousType(
        t.symbol,
        members,
        qu.empty,
        qu.empty,
        stringIndexInfo && qf.create.indexInfo(this.widenedType(stringIndexInfo.type), stringIndexInfo.isReadonly),
        numberIndexInfo && qf.create.indexInfo(this.widenedType(numberIndexInfo.type), numberIndexInfo.isReadonly)
      );
      result.objectFlags |= this.objectFlags(t) & (ObjectFlags.JSLiteral | ObjectFlags.NonInferrableType);
      return result;
    }
    widenedType(t: qt.Type) {
      return this.widenedTypeWithContext(t, undefined);
    }
    widenedTypeWithContext(t: qt.Type, context: qt.WideningContext | undefined): qt.Type {
      if (this.objectFlags(t) & ObjectFlags.RequiresWidening) {
        if (context === undefined && t.widened) return t.widened;
        let result: qt.Type | undefined;
        if (t.flags & (TypeFlags.Any | qt.TypeFlags.Nullable)) result = anyType;
        else if (qf.is.objectLiteralType(t)) {
          result = this.widenedTypeOfObjectLiteral(t, context);
        } else if (t.flags & qt.TypeFlags.Union) {
          const unionContext = context || qf.create.wideningContext(undefined, (<qt.UnionType>type).types);
          const widenedTypes = sameMap((<qt.UnionType>type).types, (t) => (t.flags & qt.TypeFlags.Nullable ? t : this.widenedTypeWithContext(t, unionContext)));
          result = this.unionType(widenedTypes, qu.some(widenedTypes, qf.is.emptyObjectType) ? UnionReduction.Subtype : UnionReduction.Literal);
        } else if (t.flags & qt.TypeFlags.Intersection) {
          result = this.intersectionType(sameMap((<qt.IntersectionType>type).types, this.widenedType));
        } else if (qf.is.arrayType(t) || qf.is.tupleType(t)) {
          result = qf.create.typeReference((<qt.TypeReference>type).target, sameMap(this.typeArgs(<qt.TypeReference>type), this.widenedType));
        }
        if (result && context === undefined) t.widened = result;
        return result || type;
      }
      return type;
    }
    mapperFromContext<T extends qt.InferenceContext | undefined>(context: T): qt.TypeMapper | (T & undefined) {
      return context && context.mapper;
    }
    typeOfReverseMappedSymbol(s: qt.ReverseMappedSymbol) {
      return inferReverseMappedType(s.propertyType, s.mappedType, s.constraintType);
    }
    *unmatchedProperties(source: qt.Type, target: qt.Type, requireOptionalProperties: boolean, matchDiscriminantProperties: boolean): IterableIterator<qt.Symbol> {
      const properties = this.propertiesOfType(target);
      for (const targetProp of properties) {
        if (targetProp.isStaticPrivateIdentifierProperty()) continue;
        if (requireOptionalProperties || !(targetProp.flags & SymbolFlags.Optional || this.checkFlags(targetProp) & qt.CheckFlags.Partial)) {
          const sourceProp = this.propertyOfType(source, targetProp.escName);
          if (!sourceProp) yield targetProp;
          else if (matchDiscriminantProperties) {
            const targetType = this.typeOfSymbol(targetProp);
            if (targetType.flags & qt.TypeFlags.Unit) {
              const sourceType = this.typeOfSymbol(sourceProp);
              if (!(sourceType.flags & qt.TypeFlags.Any || this.regularTypeOfLiteralType(sourceType) === this.regularTypeOfLiteralType(targetType))) yield targetProp;
            }
          }
        }
      }
    }
    unmatchedProperty(source: qt.Type, target: qt.Type, requireOptionalProperties: boolean, matchDiscriminantProperties: boolean): qt.Symbol | undefined {
      const result = this.unmatchedProperties(source, target, requireOptionalProperties, matchDiscriminantProperties).next();
      if (!result.done) return result.value;
    }
    typeFromInference(inference: qt.InferenceInfo) {
      return inference.candidates ? this.unionType(inference.candidates, UnionReduction.Subtype) : inference.contraCandidates ? this.intersectionType(inference.contraCandidates) : undefined;
    }
    contravariantInference(inference: qt.InferenceInfo) {
      return inference.priority! & qt.InferencePriority.PriorityImpliesCombination ? this.intersectionType(inference.contraCandidates!) : this.commonSubtype(inference.contraCandidates!);
    }
    covariantInference(inference: qt.InferenceInfo, signature: qt.Signature) {
      const candidates = unionObjectAndArrayLiteralCandidates(inference.candidates!);
      const primitiveConstraint = qf.has.primitiveConstraint(inference.typeParam);
      const widenLiteralTypes = !primitiveConstraint && inference.topLevel && (inference.isFixed || !qf.is.typeParamAtTopLevel(this.returnTypeOfSignature(signature), inference.typeParam));
      const baseCandidates = primitiveConstraint ? sameMap(candidates, getRegularTypeOfLiteralType) : widenLiteralTypes ? sameMap(candidates, this.widenedLiteralType) : candidates;
      const unwidenedType = inference.priority! & qt.InferencePriority.PriorityImpliesCombination ? this.unionType(baseCandidates, UnionReduction.Subtype) : this.commonSupertype(baseCandidates);
      return this.widenedType(unwidenedType);
    }
    inferredType(context: qt.InferenceContext, index: number): qt.Type {
      const inference = context.inferences[index];
      if (!inference.inferredType) {
        let inferredType: qt.Type | undefined;
        const signature = context.signature;
        if (signature) {
          const inferredCovariantType = inference.candidates ? this.covariantInference(inference, signature) : undefined;
          if (inference.contraCandidates) {
            const inferredContravariantType = this.contravariantInference(inference);
            inferredType =
              inferredCovariantType && !(inferredCovariantType.flags & qt.TypeFlags.Never) && qf.is.typeSubtypeOf(inferredCovariantType, inferredContravariantType)
                ? inferredCovariantType
                : inferredContravariantType;
          } else if (inferredCovariantType) {
            inferredType = inferredCovariantType;
          } else if (context.flags & InferenceFlags.NoDefault) {
            inferredType = silentNeverType;
          } else {
            const defaultType = this.defaultFromTypeParam(inference.typeParam);
            if (defaultType) inferredType = instantiateType(defaultType, mergeTypeMappers(qf.create.backreferenceMapper(context, index), context.nonFixingMapper));
          }
        } else {
          inferredType = this.typeFromInference(inference);
        }
        inference.inferredType = inferredType || this.defaultTypeArgType(!!(context.flags & InferenceFlags.AnyDefault));
        const constraint = this.constraintOfTypeParam(inference.typeParam);
        if (constraint) {
          const instantiatedConstraint = instantiateType(constraint, context.nonFixingMapper);
          if (!inferredType || !context.compareTypes(inferredType, this.typeWithThisArg(instantiatedConstraint, inferredType))) inference.inferredType = inferredType = instantiatedConstraint;
        }
      }
      return inference.inferredType;
    }
    defaultTypeArgType(isInJavaScriptFile: boolean): qt.Type {
      return isInJavaScriptFile ? anyType : unknownType;
    }
    inferredTypes(context: qt.InferenceContext): qt.Type[] {
      const result: qt.Type[] = [];
      for (let i = 0; i < context.inferences.length; i++) {
        result.push(this.inferredType(context, i));
      }
      return result;
    }
    cannotFindNameDiagnosticForName(n: qt.Identifier): qd.Message {
      switch (n.escapedText) {
        case 'document':
        case 'console':
          return qd.msgs.Cannot_find_name_0_Do_you_need_to_change_your_target_library_Try_changing_the_lib_compiler_option_to_include_dom;
        case '$':
          return compilerOpts.types
            ? qd.msgs.Cannot_find_name_0_Do_you_need_to_install_type_definitions_for_jQuery_Try_npm_i_types_Slashjquery_and_then_add_jquery_to_the_types_field_in_your_tsconfig
            : qd.msgs.Cannot_find_name_0_Do_you_need_to_install_type_definitions_for_jQuery_Try_npm_i_types_Slashjquery;
        case 'describe':
        case 'suite':
        case 'it':
        case 'test':
          return compilerOpts.types
            ? qd.msgs
                .Cannot_find_name_0_Do_you_need_to_install_type_definitions_for_a_test_runner_Try_npm_i_types_Slashjest_or_npm_i_types_Slashmocha_and_then_add_jest_or_mocha_to_the_types_field_in_your_tsconfig
            : qd.msgs.Cannot_find_name_0_Do_you_need_to_install_type_definitions_for_a_test_runner_Try_npm_i_types_Slashjest_or_npm_i_types_Slashmocha;
        case 'process':
        case 'require':
        case 'Buffer':
        case 'module':
          return compilerOpts.types
            ? qd.msgs.Cannot_find_name_0_Do_you_need_to_install_type_definitions_for_node_Try_npm_i_types_Slashn_and_then_add_node_to_the_types_field_in_your_tsconfig
            : qd.msgs.Cannot_find_name_0_Do_you_need_to_install_type_definitions_for_node_Try_npm_i_types_Slashn;
        case 'Map':
        case 'Set':
        case 'Promise':
        case 'Symbol':
        case 'WeakMap':
        case 'WeakSet':
        case 'Iterator':
        case 'AsyncIterator':
          return qd.msgs.Cannot_find_name_0_Do_you_need_to_change_your_target_library_Try_changing_the_lib_compiler_option_to_es2015_or_later;
        default:
          if (n.parent?.kind === Syntax.ShorthandPropertyAssignment) return qd.msgs.No_value_exists_in_scope_for_the_shorthand_property_0_Either_declare_one_or_provide_an_initer;
          return qd.msgs.Cannot_find_name_0;
      }
    }
    resolvedSymbol(n: qt.Identifier): qt.Symbol {
      const links = this.nodeLinks(n);
      if (!links.resolvedSymbol) {
        links.resolvedSymbol =
          (!qf.is.missing(n) &&
            resolveName(
              n,
              n.escapedText,
              SymbolFlags.Value | SymbolFlags.ExportValue,
              this.cannotFindNameDiagnosticForName(n),
              n,
              !qf.is.writeOnlyAccess(n),
              false,
              qd.msgs.Cannot_find_name_0_Did_you_mean_1
            )) ||
          unknownSymbol;
      }
      return links.resolvedSymbol;
    }
    flowCacheKey(n: Node, declaredType: qt.Type, initialType: qt.Type, flowContainer: Node | undefined): string | undefined {
      switch (n.kind) {
        case Syntax.Identifier:
          const symbol = this.resolvedSymbol(<qt.Identifier>n);
          return symbol !== unknownSymbol
            ? `${flowContainer ? this.nodeId(flowContainer) : '-1'}|${this.typeId(declaredType)}|${this.typeId(initialType)}|${qf.is.constraintPosition(n) ? '@' : ''}${symbol.this.id()}`
            : undefined;
        case Syntax.ThisKeyword:
          return '0';
        case Syntax.NonNullExpression:
        case Syntax.ParenthesizedExpression:
          return this.flowCacheKey((<qt.NonNullExpression | qt.ParenthesizedExpression>n).expression, declaredType, initialType, flowContainer);
        case Syntax.PropertyAccessExpression:
        case Syntax.ElemAccessExpression:
          const propName = this.accessedPropertyName(<qt.AccessExpression>n);
          if (propName !== undefined) {
            const key = this.flowCacheKey((<qt.AccessExpression>n).expression, declaredType, initialType, flowContainer);
            return key && key + '.' + propName;
          }
      }
      return;
    }
    accessedPropertyName(access: qt.AccessExpression): qu.__String | undefined {
      return access.kind === Syntax.PropertyAccessExpression
        ? access.name.escapedText
        : qf.is.stringOrNumericLiteralLike(access.argExpression)
        ? qy.get.escUnderscores(access.argExpression.text)
        : undefined;
    }
    flowNodeId(flow: qt.FlowNode): number {
      if (!flow.id || flow.id < 0) {
        flow.id = nextFlowId;
        nextFlowId++;
      }
      return flow.id;
    }
    assignmentReducedType(declaredType: qt.UnionType, assignedType: qt.Type) {
      if (declaredType !== assignedType) {
        if (assignedType.flags & qt.TypeFlags.Never) return assignedType;
        let reducedType = filterType(declaredType, (t) => typeMaybeAssignableTo(assignedType, t));
        if (assignedType.flags & qt.TypeFlags.BooleanLiteral && qf.is.freshLiteralType(assignedType)) reducedType = mapType(reducedType, getFreshTypeOfLiteralType);
        if (qf.is.typeAssignableTo(assignedType, reducedType)) return reducedType;
      }
      return declaredType;
    }
    typeFactsOfTypes(types: qt.Type[]): TypeFacts {
      let result: TypeFacts = TypeFacts.None;
      for (const t of types) {
        result |= this.typeFacts(t);
      }
      return result;
    }
    typeFacts(t: qt.Type): TypeFacts {
      const flags = t.flags;
      if (flags & qt.TypeFlags.String) return strictNullChecks ? TypeFacts.StringStrictFacts : TypeFacts.StringFacts;
      if (flags & qt.TypeFlags.StringLiteral) {
        const isEmpty = (<qt.StringLiteralType>type).value === '';
        return strictNullChecks ? (isEmpty ? TypeFacts.EmptyStringStrictFacts : TypeFacts.NonEmptyStringStrictFacts) : isEmpty ? TypeFacts.EmptyStringFacts : TypeFacts.NonEmptyStringFacts;
      }
      if (flags & (TypeFlags.Number | qt.TypeFlags.Enum)) return strictNullChecks ? TypeFacts.NumberStrictFacts : TypeFacts.NumberFacts;
      if (flags & qt.TypeFlags.NumberLiteral) {
        const isZero = (<qt.NumberLiteralType>type).value === 0;
        return strictNullChecks ? (isZero ? TypeFacts.ZeroNumberStrictFacts : TypeFacts.NonZeroNumberStrictFacts) : isZero ? TypeFacts.ZeroNumberFacts : TypeFacts.NonZeroNumberFacts;
      }
      if (flags & qt.TypeFlags.BigInt) return strictNullChecks ? TypeFacts.BigIntStrictFacts : TypeFacts.BigIntFacts;
      if (flags & qt.TypeFlags.BigIntLiteral) {
        const isZero = qf.is.zeroBigInt(<qt.BigIntLiteralType>type);
        return strictNullChecks ? (isZero ? TypeFacts.ZeroBigIntStrictFacts : TypeFacts.NonZeroBigIntStrictFacts) : isZero ? TypeFacts.ZeroBigIntFacts : TypeFacts.NonZeroBigIntFacts;
      }
      if (flags & qt.TypeFlags.Boolean) return strictNullChecks ? TypeFacts.BooleanStrictFacts : TypeFacts.BooleanFacts;
      if (flags & qt.TypeFlags.BooleanLike) {
        return strictNullChecks
          ? type === falseType || type === regularFalseType
            ? TypeFacts.FalseStrictFacts
            : TypeFacts.TrueStrictFacts
          : type === falseType || type === regularFalseType
          ? TypeFacts.FalseFacts
          : TypeFacts.TrueFacts;
      }
      if (flags & qt.TypeFlags.Object) {
        return this.objectFlags(t) & ObjectFlags.Anonymous && qf.is.emptyObjectType(<qt.ObjectType>type)
          ? strictNullChecks
            ? TypeFacts.EmptyObjectStrictFacts
            : TypeFacts.EmptyObjectFacts
          : qf.is.functionObjectType(<qt.ObjectType>type)
          ? strictNullChecks
            ? TypeFacts.FunctionStrictFacts
            : TypeFacts.FunctionFacts
          : strictNullChecks
          ? TypeFacts.ObjectStrictFacts
          : TypeFacts.ObjectFacts;
      }
      if (flags & (TypeFlags.Void | qt.TypeFlags.Undefined)) return TypeFacts.UndefinedFacts;
      if (flags & qt.TypeFlags.Null) return TypeFacts.NullFacts;
      if (flags & qt.TypeFlags.ESSymbolLike) return strictNullChecks ? TypeFacts.SymbolStrictFacts : TypeFacts.SymbolFacts;
      if (flags & qt.TypeFlags.NonPrimitive) return strictNullChecks ? TypeFacts.ObjectStrictFacts : TypeFacts.ObjectFacts;
      if (flags & qt.TypeFlags.Never) return TypeFacts.None;
      if (flags & qt.TypeFlags.Instantiable) return this.typeFacts(this.baseConstraintOfType(t) || unknownType);
      if (flags & qt.TypeFlags.UnionOrIntersection) return this.typeFactsOfTypes((<qt.UnionOrIntersectionType>type).types);
      return TypeFacts.All;
    }
    typeWithFacts(t: qt.Type, include: TypeFacts) {
      return filterType(t, (t) => (this.typeFacts(t) & include) !== 0);
    }
    typeWithDefault(t: qt.Type, defaultExpression: qt.Expression) {
      if (defaultExpression) {
        const defaultType = this.typeOfExpression(defaultExpression);
        return this.unionType([this.typeWithFacts(t, TypeFacts.NEUndefined), defaultType]);
      }
      return type;
    }
    typeOfDestructuredProperty(t: qt.Type, name: qt.PropertyName) {
      const nameType = this.literalTypeFromPropertyName(name);
      if (!qf.is.typeUsableAsPropertyName(nameType)) return errorType;
      const text = this.propertyNameFromType(nameType);
      return (
        this.constraintForLocation(this.typeOfPropertyOfType(t, text), name) ||
        (NumericLiteral.name(text) && this.indexTypeOfType(t, qt.IndexKind.Number)) ||
        this.indexTypeOfType(t, qt.IndexKind.String) ||
        errorType
      );
    }
    typeOfDestructuredArrayElem(t: qt.Type, index: number) {
      return (everyType(t, qf.is.tupleLikeType) && this.tupleElemType(t, index)) || qf.check.iteratedTypeOrElemType(IterationUse.Destructuring, type, undefinedType, undefined) || errorType;
    }
    typeOfDestructuredSpreadExpression(t: qt.Type) {
      return qf.create.arrayType(qf.check.iteratedTypeOrElemType(IterationUse.Destructuring, type, undefinedType, undefined) || errorType);
    }
    assignedTypeOfBinaryExpression(n: qt.BinaryExpression): qt.Type {
      const isDestructuringDefaultAssignment =
        (n.parent?.kind === Syntax.ArrayLiteralExpression && qf.is.destructuringAssignmentTarget(n.parent)) ||
        (n.parent?.kind === Syntax.PropertyAssignment && qf.is.destructuringAssignmentTarget(n.parent?.parent));
      return isDestructuringDefaultAssignment ? this.typeWithDefault(this.assignedType(n), n.right) : this.typeOfExpression(n.right);
    }
    assignedTypeOfArrayLiteralElem(n: qt.ArrayLiteralExpression, elem: qt.Expression): qt.Type {
      return this.typeOfDestructuredArrayElem(this.assignedType(n), n.elems.indexOf(elem));
    }
    assignedTypeOfSpreadExpression(n: qt.SpreadElem): qt.Type {
      return this.typeOfDestructuredSpreadExpression(this.assignedType(<qt.ArrayLiteralExpression>n.parent));
    }
    assignedTypeOfPropertyAssignment(n: qt.PropertyAssignment | qt.ShorthandPropertyAssignment): qt.Type {
      return this.typeOfDestructuredProperty(this.assignedType(n.parent), n.name);
    }
    assignedTypeOfShorthandPropertyAssignment(n: qt.ShorthandPropertyAssignment): qt.Type {
      return this.typeWithDefault(this.assignedTypeOfPropertyAssignment(n), n.objectAssignmentIniter!);
    }
    assignedType(n: qt.Expression): qt.Type {
      const { parent } = n;
      switch (parent?.kind) {
        case Syntax.ForInStatement:
          return stringType;
        case Syntax.ForOfStatement:
          return qf.check.rightHandSideOfForOf(<qt.ForOfStatement>parent) || errorType;
        case Syntax.BinaryExpression:
          return this.assignedTypeOfBinaryExpression(parent);
        case Syntax.DeleteExpression:
          return undefinedType;
        case Syntax.ArrayLiteralExpression:
          return this.assignedTypeOfArrayLiteralElem(<qt.ArrayLiteralExpression>parent, n);
        case Syntax.SpreadElem:
          return this.assignedTypeOfSpreadExpression(<qt.SpreadElem>parent);
        case Syntax.PropertyAssignment:
          return this.assignedTypeOfPropertyAssignment(<qt.PropertyAssignment>parent);
        case Syntax.ShorthandPropertyAssignment:
          return this.assignedTypeOfShorthandPropertyAssignment(<qt.ShorthandPropertyAssignment>parent);
      }
      return errorType;
    }
    initialTypeOfBindingElem(n: qt.BindingElem): qt.Type {
      const pattern = n.parent;
      const parentType = this.initialType(<qt.VariableDeclaration | qt.BindingElem>pattern.parent);
      const type =
        pattern.kind === Syntax.ObjectBindingPattern
          ? this.typeOfDestructuredProperty(parentType, n.propertyName || <qt.Identifier>n.name)
          : !n.dot3Token
          ? this.typeOfDestructuredArrayElem(parentType, pattern.elems.indexOf(n))
          : this.typeOfDestructuredSpreadExpression(parentType);
      return this.typeWithDefault(t, n.initer!);
    }
    typeOfIniter(n: qt.Expression) {
      const links = this.nodeLinks(n);
      return links.resolvedType || this.typeOfExpression(n);
    }
    initialTypeOfVariableDeclaration(n: qt.VariableDeclaration) {
      if (n.initer) return this.typeOfIniter(n.initer);
      if (n.parent?.parent?.kind === Syntax.ForInStatement) return stringType;
      if (n.parent?.parent?.kind === Syntax.ForOfStatement) return qf.check.rightHandSideOfForOf(n.parent?.parent) || errorType;
      return errorType;
    }
    initialType(n: qt.VariableDeclaration | qt.BindingElem) {
      return n.kind === Syntax.VariableDeclaration ? this.initialTypeOfVariableDeclaration(n) : this.initialTypeOfBindingElem(n);
    }
    referenceCandidate(n: qt.Expression): qt.Expression {
      switch (n.kind) {
        case Syntax.ParenthesizedExpression:
          return this.referenceCandidate((<qt.ParenthesizedExpression>n).expression);
        case Syntax.BinaryExpression:
          switch (n.operatorToken.kind) {
            case Syntax.EqualsToken:
              return this.referenceCandidate(n.left);
            case Syntax.CommaToken:
              return this.referenceCandidate(n.right);
          }
      }
      return n;
    }
    referenceRoot(n: Node): Node {
      const { parent } = n;
      return parent?.kind === Syntax.ParenthesizedExpression ||
        (parent?.kind === Syntax.BinaryExpression && parent?.operatorToken.kind === Syntax.EqualsToken && parent?.left === n) ||
        (parent?.kind === Syntax.BinaryExpression && parent?.operatorToken.kind === Syntax.CommaToken && parent?.right === n)
        ? this.referenceRoot(parent)
        : n;
    }
    typeOfSwitchClause(clause: qt.CaseClause | qt.DefaultClause) {
      if (clause.kind === Syntax.CaseClause) return this.regularTypeOfLiteralType(this.typeOfExpression(clause.expression));
      return neverType;
    }
    switchClauseTypes(switchStatement: qt.SwitchStatement): qt.Type[] {
      const links = this.nodeLinks(switchStatement);
      if (!links.switchTypes) {
        links.switchTypes = [];
        for (const clause of switchStatement.caseBlock.clauses) {
          links.switchTypes.push(this.typeOfSwitchClause(clause));
        }
      }
      return links.switchTypes;
    }
    switchClauseTypeOfWitnesses(switchStatement: qt.SwitchStatement, retainDefault: false): string[];
    switchClauseTypeOfWitnesses(switchStatement: qt.SwitchStatement, retainDefault: boolean): (string | undefined)[];
    switchClauseTypeOfWitnesses(switchStatement: qt.SwitchStatement, retainDefault: boolean): (string | undefined)[] {
      const witnesses: (string | undefined)[] = [];
      for (const clause of switchStatement.caseBlock.clauses) {
        if (clause.kind === Syntax.CaseClause) {
          if (qf.is.stringLiteralLike(clause.expression)) {
            witnesses.push(clause.expression.text);
            continue;
          }
          return qu.empty;
        }
        if (retainDefault) witnesses.push(undefined);
      }
      return witnesses;
    }
    typeFromFlowType(flowType: qt.FlowType) {
      return flowType.flags === 0 ? (<qt.IncompleteType>flowType).type : <qt.Type>flowType;
    }
    evolvingArrayType(elemType: qt.Type): qt.EvolvingArrayType {
      return evolvingArrayTypes[elemType.id] || (evolvingArrayTypes[elemType.id] = qf.create.evolvingArrayType(elemType));
    }
    finalArrayType(evolvingArrayType: qt.EvolvingArrayType): qt.Type {
      return evolvingArrayType.finalArrayType || (evolvingArrayType.finalArrayType = qf.create.finalArrayType(evolvingArrayType.elemType));
    }
    elemTypeOfEvolvingArrayType(t: qt.Type) {
      return this.objectFlags(t) & ObjectFlags.EvolvingArray ? (<qt.EvolvingArrayType>type).elemType : neverType;
    }
    unionOrEvolvingArrayType(types: qt.Type[], subtypeReduction: UnionReduction) {
      return qf.is.evolvingArrayTypeList(types)
        ? this.evolvingArrayType(this.unionType(map(types, getElemTypeOfEvolvingArrayType)))
        : this.unionType(sameMap(types, finalizeEvolvingArrayType), subtypeReduction);
    }
    explicitTypeOfSymbol(symbol: qt.Symbol, diagnostic?: qd.Diagnostic) {
      if (symbol.flags & (SymbolFlags.Function | SymbolFlags.Method | SymbolFlags.Class | SymbolFlags.ValueModule)) return this.this.typeOfSymbol();
      if (symbol.flags & (SymbolFlags.Variable | SymbolFlags.Property)) {
        const declaration = symbol.valueDeclaration;
        if (declaration) {
          if (qf.is.declarationWithExplicitTypeAnnotation(declaration)) return this.this.typeOfSymbol();
          if (declaration.kind === Syntax.VariableDeclaration && declaration.parent?.parent?.kind === Syntax.ForOfStatement) {
            const statement = declaration.parent?.parent;
            const expressionType = this.typeOfDottedName(statement.expression, undefined);
            if (expressionType) {
              const use = statement.awaitModifier ? IterationUse.ForAwaitOf : IterationUse.ForOf;
              return qf.check.iteratedTypeOrElemType(use, expressionType, undefinedType, undefined);
            }
          }
          if (diagnostic) addRelatedInfo(diagnostic, qf.create.diagForNode(declaration, qd.msgs._0_needs_an_explicit_type_annotation, symbol.symbolToString()));
        }
      }
    }
    typeOfDottedName(n: qt.Expression, diagnostic: qd.Diagnostic | undefined): qt.Type | undefined {
      if (!(n.flags & NodeFlags.InWithStatement)) {
        switch (n.kind) {
          case Syntax.Identifier:
            const symbol = this.exportSymbolOfValueSymbolIfExported(this.resolvedSymbol(<qt.Identifier>n));
            return this.explicitTypeOfSymbol(symbol.flags & SymbolFlags.Alias ? this.resolveAlias() : symbol, diagnostic);
          case Syntax.ThisKeyword:
            return this.explicitThisType(n);
          case Syntax.SuperKeyword:
            return qf.check.superExpression(n);
          case Syntax.PropertyAccessExpression:
            const type = this.typeOfDottedName((<qt.PropertyAccessExpression>n).expression, diagnostic);
            const prop = type && this.propertyOfType(t, (<qt.PropertyAccessExpression>n).name.escapedText);
            return prop && this.explicitTypeOfSymbol(prop, diagnostic);
          case Syntax.ParenthesizedExpression:
            return this.typeOfDottedName((<qt.ParenthesizedExpression>n).expression, diagnostic);
        }
      }
    }
    effectsSignature(n: qt.CallExpression) {
      const links = this.nodeLinks(n);
      let signature = links.effectsSignature;
      if (signature === undefined) {
        let funcType: qt.Type | undefined;
        if (n.parent?.kind === Syntax.ExpressionStatement) funcType = this.typeOfDottedName(n.expression, undefined);
        else if (n.expression.kind !== Syntax.SuperKeyword) {
          if (qf.is.optionalChain(n)) funcType = qf.check.nonNullType(this.optionalExpressionType(qf.check.expression(n.expression), n.expression), n.expression);
          else {
            funcType = qf.check.nonNullExpression(n.expression);
          }
        }
        const signatures = this.signaturesOfType((funcType && this.apparentType(funcType)) || unknownType, qt.SignatureKind.Call);
        const candidate = signatures.length === 1 && !signatures[0].typeParams ? signatures[0] : qu.some(signatures, hasTypePredicateOrNeverReturnType) ? this.resolvedSignature(n) : undefined;
        signature = links.effectsSignature = candidate && qf.has.typePredicateOrNeverReturnType(candidate) ? candidate : unknownSignature;
      }
      return signature === unknownSignature ? undefined : signature;
    }
    typePredicateArg(predicate: qt.TypePredicate, callExpression: qt.CallExpression) {
      if (predicate.kind === qt.TypePredicateKind.Identifier || predicate.kind === qt.TypePredicateKind.AssertsIdentifier) return callExpression.args[predicate.paramIndex];
      const invokedExpression = qf.skip.parentheses(callExpression.expression);
      return qf.is.accessExpression(invokedExpression) ? qf.skip.parentheses(invokedExpression.expression) : undefined;
    }
    flow = new (class {
      typeOfReference(reference: Node, declaredType: qt.Type, initialType = declaredType, flowContainer?: Node, couldBeUninitialized?: boolean) {
        let key: string | undefined;
        let keySet = false;
        let flowDepth = 0;
        if (flowAnalysisDisabled) return errorType;
        if (!reference.flowNode || (!couldBeUninitialized && !(declaredType.flags & qt.TypeFlags.Narrowable))) return declaredType;
        flowInvocationCount++;
        const sharedFlowStart = sharedFlowCount;
        const evolvedType = this.typeFromFlowType(this.typeAtFlowNode(reference.flowNode));
        sharedFlowCount = sharedFlowStart;
        const resultType = this.objectFlags(evolvedType) & ObjectFlags.EvolvingArray && qf.is.evolvingArrayOperationTarget(reference) ? autoArrayType : finalizeEvolvingArrayType(evolvedType);
        if (
          resultType === unreachableNeverType ||
          (reference.parent && reference.parent?.kind === Syntax.NonNullExpression && this.typeWithFacts(resultType, TypeFacts.NEUndefinedOrNull).flags & qt.TypeFlags.Never)
        ) {
          return declaredType;
        }
        return resultType;
      }
      orSetCacheKey() {
        if (keySet) return key;
        keySet = true;
        return (key = this.flowCacheKey(reference, declaredType, initialType, flowContainer));
      }
      typeAtFlowNode(flow: qt.FlowNode): qt.FlowType {
        if (flowDepth === 2000) {
          flowAnalysisDisabled = true;
          reportFlowControlError(reference);
          return errorType;
        }
        flowDepth++;
        while (true) {
          const flags = flow.flags;
          if (flags & FlowFlags.Shared) {
            for (let i = sharedFlowStart; i < sharedFlowCount; i++) {
              if (sharedFlowNodes[i] === flow) {
                flowDepth--;
                return sharedFlowTypes[i];
              }
            }
          }
          let type: qt.FlowType | undefined;
          if (flags & FlowFlags.Assignment) {
            type = this.typeAtFlowAssignment(<qt.FlowAssignment>flow);
            if (!type) {
              flow = (<qt.FlowAssignment>flow).antecedent;
              continue;
            }
          } else if (flags & FlowFlags.Call) {
            type = this.typeAtFlowCall(<qt.FlowCall>flow);
            if (!type) {
              flow = (<qt.FlowCall>flow).antecedent;
              continue;
            }
          } else if (flags & FlowFlags.Condition) {
            type = this.typeAtFlowCondition(<qt.FlowCondition>flow);
          } else if (flags & FlowFlags.SwitchClause) {
            type = this.typeAtSwitchClause(<qt.FlowSwitchClause>flow);
          } else if (flags & FlowFlags.Label) {
            if ((<qt.FlowLabel>flow).antecedents!.length === 1) {
              flow = (<qt.FlowLabel>flow).antecedents![0];
              continue;
            }
            type = flags & FlowFlags.BranchLabel ? this.typeAtFlowBranchLabel(<qt.FlowLabel>flow) : this.typeAtFlowLoopLabel(<qt.FlowLabel>flow);
          } else if (flags & FlowFlags.ArrayMutation) {
            type = this.typeAtFlowArrayMutation(<qt.FlowArrayMutation>flow);
            if (!type) {
              flow = (<qt.FlowArrayMutation>flow).antecedent;
              continue;
            }
          } else if (flags & FlowFlags.ReduceLabel) {
            const target = (<qt.FlowReduceLabel>flow).target;
            const saveAntecedents = target.antecedents;
            target.antecedents = (<qt.FlowReduceLabel>flow).antecedents;
            type = this.typeAtFlowNode((<qt.FlowReduceLabel>flow).antecedent);
            target.antecedents = saveAntecedents;
          } else if (flags & FlowFlags.Start) {
            const container = (<qt.FlowStart>flow).node;
            if (
              container &&
              container !== flowContainer &&
              reference.kind !== Syntax.PropertyAccessExpression &&
              reference.kind !== Syntax.ElemAccessExpression &&
              reference.kind !== Syntax.ThisKeyword
            ) {
              flow = container.flowNode!;
              continue;
            }
            type = initialType;
          } else {
            type = convertAutoToAny(declaredType);
          }
          if (flags & FlowFlags.Shared) {
            sharedFlowNodes[sharedFlowCount] = flow;
            sharedFlowTypes[sharedFlowCount] = type;
            sharedFlowCount++;
          }
          flowDepth--;
          return type;
        }
      }
      initialOrAssignedType(flow: qt.FlowAssignment) {
        const n = flow.node;
        return this.constraintForLocation(
          n.kind === Syntax.VariableDeclaration || n.kind === Syntax.BindingElem ? this.initialType(<qt.VariableDeclaration | qt.BindingElem>n) : this.assignedType(n),
          reference
        );
      }
      typeAtFlowAssignment(flow: qt.FlowAssignment) {
        const n = flow.node;
        if (qf.is.matchingReference(reference, n)) {
          if (!qf.is.reachableFlowNode(flow)) return unreachableNeverType;
          if (this.assignmentTargetKind(n) === qt.AssignmentKind.Compound) {
            const flowType = this.typeAtFlowNode(flow.antecedent);
            return qf.create.flowType(this.baseTypeOfLiteralType(this.typeFromFlowType(flowType)), qf.is.incomplete(flowType));
          }
          if (declaredType === autoType || declaredType === autoArrayType) {
            if (qf.is.emptyArrayAssignment(n)) return this.evolvingArrayType(neverType);
            const assignedType = this.widenedLiteralType(this.initialOrAssignedType(flow));
            return qf.is.typeAssignableTo(assignedType, declaredType) ? assignedType : anyArrayType;
          }
          if (declaredType.flags & qt.TypeFlags.Union) return this.assignmentReducedType(<qt.UnionType>declaredType, this.initialOrAssignedType(flow));
          return declaredType;
        }
        if (containsMatchingReference(reference, n)) {
          if (!qf.is.reachableFlowNode(flow)) return unreachableNeverType;
          if (n.kind === Syntax.VariableDeclaration && (qf.is.inJSFile(n) || qf.is.varConst(n))) {
            const init = this.declaredExpandoIniter(n);
            if (init && (init.kind === Syntax.FunctionExpression || init.kind === Syntax.ArrowFunction)) return this.typeAtFlowNode(flow.antecedent);
          }
          return declaredType;
        }
        if (n.kind === Syntax.VariableDeclaration && n.parent?.parent?.kind === Syntax.ForInStatement && qf.is.matchingReference(reference, n.parent?.parent?.expression))
          return this.nonNullableTypeIfNeeded(this.typeFromFlowType(this.typeAtFlowNode(flow.antecedent)));
        return;
      }
      narrowTypeByAssertion(t: qt.Type, expr: qt.Expression): qt.Type {
        const n = qf.skip.parentheses(expr);
        if (n.kind === Syntax.FalseKeyword) return unreachableNeverType;
        if (n.kind === Syntax.BinaryExpression) {
          if (n.operatorToken.kind === Syntax.Ampersand2Token) return narrowTypeByAssertion(narrowTypeByAssertion(t, n.left), n.right);
          if (n.operatorToken.kind === Syntax.Bar2Token) return this.unionType([narrowTypeByAssertion(t, n.left), narrowTypeByAssertion(t, n.right)]);
        }
        return narrowType(t, n, true);
      }
      typeAtFlowCall(flow: qt.FlowCall): qt.FlowType | undefined {
        const signature = this.effectsSignature(flow.node);
        if (signature) {
          const predicate = this.typePredicateOfSignature(signature);
          if (predicate && (predicate.kind === qt.TypePredicateKind.AssertsThis || predicate.kind === qt.TypePredicateKind.AssertsIdentifier)) {
            const flowType = this.typeAtFlowNode(flow.antecedent);
            const type = finalizeEvolvingArrayType(this.typeFromFlowType(flowType));
            const narrowedType = predicate.type
              ? narrowTypeByTypePredicate(t, predicate, flow.node, true)
              : predicate.kind === qt.TypePredicateKind.AssertsIdentifier && predicate.paramIndex >= 0 && predicate.paramIndex < flow.node.args.length
              ? narrowTypeByAssertion(t, flow.node.args[predicate.paramIndex])
              : type;
            return narrowedType === type ? flowType : qf.create.flowType(narrowedType, qf.is.incomplete(flowType));
          }
          if (this.returnTypeOfSignature(signature).flags & qt.TypeFlags.Never) return unreachableNeverType;
        }
        return;
      }
      typeAtFlowArrayMutation(flow: qt.FlowArrayMutation): qt.FlowType | undefined {
        if (declaredType === autoType || declaredType === autoArrayType) {
          const n = flow.node;
          const expr = n.kind === Syntax.CallExpression ? (<qt.PropertyAccessExpression>n.expression).expression : (<qt.ElemAccessExpression>n.left).expression;
          if (qf.is.matchingReference(reference, this.referenceCandidate(expr))) {
            const flowType = this.typeAtFlowNode(flow.antecedent);
            const type = this.typeFromFlowType(flowType);
            if (this.objectFlags(t) & ObjectFlags.EvolvingArray) {
              let evolvedType = <qt.EvolvingArrayType>type;
              if (n.kind === Syntax.CallExpression) {
                for (const arg of n.args) {
                  evolvedType = addEvolvingArrayElemType(evolvedType, arg);
                }
              } else {
                const indexType = this.contextFreeTypeOfExpression((<qt.ElemAccessExpression>n.left).argExpression);
                if (qf.is.typeAssignableToKind(indexType, qt.TypeFlags.NumberLike)) evolvedType = addEvolvingArrayElemType(evolvedType, n.right);
              }
              return evolvedType === type ? flowType : qf.create.flowType(evolvedType, qf.is.incomplete(flowType));
            }
            return flowType;
          }
        }
        return;
      }
      typeAtFlowCondition(flow: qt.FlowCondition): qt.FlowType {
        const flowType = this.typeAtFlowNode(flow.antecedent);
        const type = this.typeFromFlowType(flowType);
        if (t.flags & qt.TypeFlags.Never) return flowType;
        const assumeTrue = (flow.flags & FlowFlags.TrueCondition) !== 0;
        const nonEvolvingType = finalizeEvolvingArrayType(t);
        const narrowedType = narrowType(nonEvolvingType, flow.node, assumeTrue);
        if (narrowedType === nonEvolvingType) return flowType;
        const incomplete = qf.is.incomplete(flowType);
        const resultType = incomplete && narrowedType.flags & qt.TypeFlags.Never ? silentNeverType : narrowedType;
        return qf.create.flowType(resultType, incomplete);
      }
      typeAtSwitchClause(flow: qt.FlowSwitchClause): qt.FlowType {
        const expr = flow.switchStatement.expression;
        const flowType = this.typeAtFlowNode(flow.antecedent);
        let type = this.typeFromFlowType(flowType);
        if (qf.is.matchingReference(reference, expr)) type = narrowTypeBySwitchOnDiscriminant(t, flow.switchStatement, flow.clauseStart, flow.clauseEnd);
        else if (expr.kind === Syntax.TypeOfExpression && qf.is.matchingReference(reference, (expr as qt.TypeOfExpression).expression)) {
          type = narrowBySwitchOnTypeOf(t, flow.switchStatement, flow.clauseStart, flow.clauseEnd);
        } else {
          if (strictNullChecks) {
            if (optionalChainContainsReference(expr, reference))
              type = narrowTypeBySwitchOptionalChainContainment(t, flow.switchStatement, flow.clauseStart, flow.clauseEnd, (t) => !(t.flags & (TypeFlags.Undefined | qt.TypeFlags.Never)));
            else if (expr.kind === Syntax.TypeOfExpression && optionalChainContainsReference((expr as qt.TypeOfExpression).expression, reference)) {
              type = narrowTypeBySwitchOptionalChainContainment(
                type,
                flow.switchStatement,
                flow.clauseStart,
                flow.clauseEnd,
                (t) => !(t.flags & qt.TypeFlags.Never || (t.flags & qt.TypeFlags.StringLiteral && (<qt.StringLiteralType>t).value === 'undefined'))
              );
            }
          }
          if (qf.is.matchingReferenceDiscriminant(expr, type))
            type = narrowTypeByDiscriminant(t, expr as qt.AccessExpression, (t) => narrowTypeBySwitchOnDiscriminant(t, flow.switchStatement, flow.clauseStart, flow.clauseEnd));
        }
        return qf.create.flowType(t, qf.is.incomplete(flowType));
      }
      typeAtFlowBranchLabel(flow: qt.FlowLabel): qt.FlowType {
        const antecedentTypes: qt.Type[] = [];
        let subtypeReduction = false;
        let seenIncomplete = false;
        let bypassFlow: qt.FlowSwitchClause | undefined;
        for (const antecedent of flow.antecedents!) {
          if (!bypassFlow && antecedent.flags & FlowFlags.SwitchClause && (<qt.FlowSwitchClause>antecedent).clauseStart === (<qt.FlowSwitchClause>antecedent).clauseEnd) {
            bypassFlow = <qt.FlowSwitchClause>antecedent;
            continue;
          }
          const flowType = this.typeAtFlowNode(antecedent);
          const type = this.typeFromFlowType(flowType);
          if (type === declaredType && declaredType === initialType) return type;
          qu.pushIfUnique(antecedentTypes, type);
          if (!qf.is.typeSubsetOf(t, declaredType)) subtypeReduction = true;
          if (qf.is.incomplete(flowType)) seenIncomplete = true;
        }
        if (bypassFlow) {
          const flowType = this.typeAtFlowNode(bypassFlow);
          const type = this.typeFromFlowType(flowType);
          if (!contains(antecedentTypes, type) && !qf.is.exhaustiveSwitchStatement(bypassFlow.switchStatement)) {
            if (type === declaredType && declaredType === initialType) return type;
            antecedentTypes.push(t);
            if (!qf.is.typeSubsetOf(t, declaredType)) subtypeReduction = true;
            if (qf.is.incomplete(flowType)) seenIncomplete = true;
          }
        }
        return qf.create.flowType(this.unionOrEvolvingArrayType(antecedentTypes, subtypeReduction ? UnionReduction.Subtype : UnionReduction.Literal), seenIncomplete);
      }
      typeAtFlowLoopLabel(flow: qt.FlowLabel): qt.FlowType {
        const id = this.flowNodeId(flow);
        const cache = flowLoopCaches[id] || (flowLoopCaches[id] = new qu.QMap<qt.Type>());
        const key = this.orSetCacheKey();
        if (!key) return declaredType;
        const cached = cache.get(key);
        if (cached) return cached;
        for (let i = flowLoopStart; i < flowLoopCount; i++) {
          if (flowLoopNodes[i] === flow && flowLoopKeys[i] === key && flowLoopTypes[i].length) return qf.create.flowType(this.unionOrEvolvingArrayType(flowLoopTypes[i], UnionReduction.Literal), true);
        }
        const antecedentTypes: qt.Type[] = [];
        let subtypeReduction = false;
        let firstAntecedentType: qt.FlowType | undefined;
        for (const antecedent of flow.antecedents!) {
          let flowType;
          if (!firstAntecedentType) flowType = firstAntecedentType = this.typeAtFlowNode(antecedent);
          else {
            flowLoopNodes[flowLoopCount] = flow;
            flowLoopKeys[flowLoopCount] = key;
            flowLoopTypes[flowLoopCount] = antecedentTypes;
            flowLoopCount++;
            const saveFlowTypeCache = flowTypeCache;
            flowTypeCache = undefined;
            flowType = this.typeAtFlowNode(antecedent);
            flowTypeCache = saveFlowTypeCache;
            flowLoopCount--;
            const cached = cache.get(key);
            if (cached) return cached;
          }
          const type = this.typeFromFlowType(flowType);
          qu.pushIfUnique(antecedentTypes, type);
          if (!qf.is.typeSubsetOf(t, declaredType)) subtypeReduction = true;
          if (type === declaredType) break;
        }
        const result = this.unionOrEvolvingArrayType(antecedentTypes, subtypeReduction ? UnionReduction.Subtype : UnionReduction.Literal);
        if (qf.is.incomplete(firstAntecedentType!)) return qf.create.flowType(result, true);
        cache.set(key, result);
        return result;
      }
      isMatchingReferenceDiscriminant(expr: qt.Expression, computedType: qt.Type) {
        const type = declaredType.flags & qt.TypeFlags.Union ? declaredType : computedType;
        if (!(t.flags & qt.TypeFlags.Union) || !qf.is.accessExpression(expr)) return false;
        const name = this.accessedPropertyName(expr);
        if (name === undefined) return false;
        return qf.is.matchingReference(reference, expr.expression) && qf.is.discriminantProperty(t, name);
      }
      narrowTypeByDiscriminant(t: qt.Type, access: qt.AccessExpression, narrowType: (t: qt.Type) => qt.Type): qt.Type {
        const propName = this.accessedPropertyName(access);
        if (propName === undefined) return type;
        const propType = this.typeOfPropertyOfType(t, propName);
        if (!propType) return type;
        const narrowedPropType = narrowType(propType);
        return filterType(t, (t) => {
          const discriminantType = this.typeOfPropertyOrIndexSignature(t, propName);
          return !(discriminantType.flags & qt.TypeFlags.Never) && qf.is.typeComparableTo(discriminantType, narrowedPropType);
        });
      }
      narrowTypeByTruthiness(t: qt.Type, expr: qt.Expression, assumeTrue: boolean): qt.Type {
        if (qf.is.matchingReference(reference, expr)) return this.typeWithFacts(t, assumeTrue ? TypeFacts.Truthy : TypeFacts.Falsy);
        if (strictNullChecks && assumeTrue && optionalChainContainsReference(expr, reference)) type = this.typeWithFacts(t, TypeFacts.NEUndefinedOrNull);
        if (qf.is.matchingReferenceDiscriminant(expr, type)) return narrowTypeByDiscriminant(t, <qt.AccessExpression>expr, (t) => this.typeWithFacts(t, assumeTrue ? TypeFacts.Truthy : TypeFacts.Falsy));
        return type;
      }
      isTypePresencePossible(t: qt.Type, propName: qu.__String, assumeTrue: boolean) {
        if (this.indexInfoOfType(t, qt.IndexKind.String)) return true;
        const prop = this.propertyOfType(t, propName);
        if (prop) return prop.flags & SymbolFlags.Optional ? true : assumeTrue;
        return !assumeTrue;
      }
      narrowByInKeyword(t: qt.Type, literal: qt.LiteralExpression, assumeTrue: boolean) {
        if (t.flags & (TypeFlags.Union | qt.TypeFlags.Object) || qf.is.thisTypeParam(t)) {
          const propName = qy.get.escUnderscores(literal.text);
          return filterType(t, (t) => qf.is.typePresencePossible(t, propName, assumeTrue));
        }
        return type;
      }
      narrowTypeByBinaryExpression(t: qt.Type, expr: qt.BinaryExpression, assumeTrue: boolean): qt.Type {
        switch (expr.operatorToken.kind) {
          case Syntax.EqualsToken:
            return narrowTypeByTruthiness(narrowType(t, expr.right, assumeTrue), expr.left, assumeTrue);
          case Syntax.Equals2Token:
          case Syntax.ExclamationEqualsToken:
          case Syntax.Equals3Token:
          case Syntax.ExclamationEquals2Token:
            const operator = expr.operatorToken.kind;
            const left = this.referenceCandidate(expr.left);
            const right = this.referenceCandidate(expr.right);
            if (left.kind === Syntax.TypeOfExpression && qf.is.stringLiteralLike(right)) return narrowTypeByTypeof(t, <qt.TypeOfExpression>left, operator, right, assumeTrue);
            if (right.kind === Syntax.TypeOfExpression && qf.is.stringLiteralLike(left)) return narrowTypeByTypeof(t, <qt.TypeOfExpression>right, operator, left, assumeTrue);
            if (qf.is.matchingReference(reference, left)) return narrowTypeByEquality(t, operator, right, assumeTrue);
            if (qf.is.matchingReference(reference, right)) return narrowTypeByEquality(t, operator, left, assumeTrue);
            if (strictNullChecks) {
              if (optionalChainContainsReference(left, reference)) type = narrowTypeByOptionalChainContainment(t, operator, right, assumeTrue);
              else if (optionalChainContainsReference(right, reference)) {
                type = narrowTypeByOptionalChainContainment(t, operator, left, assumeTrue);
              }
            }
            if (qf.is.matchingReferenceDiscriminant(left, type)) return narrowTypeByDiscriminant(t, <qt.AccessExpression>left, (t) => narrowTypeByEquality(t, operator, right, assumeTrue));
            if (qf.is.matchingReferenceDiscriminant(right, type)) return narrowTypeByDiscriminant(t, <qt.AccessExpression>right, (t) => narrowTypeByEquality(t, operator, left, assumeTrue));
            if (qf.is.matchingConstructorReference(left)) return narrowTypeByConstructor(t, operator, right, assumeTrue);
            if (qf.is.matchingConstructorReference(right)) return narrowTypeByConstructor(t, operator, left, assumeTrue);
            break;
          case Syntax.InstanceOfKeyword:
            return narrowTypeByInstanceof(t, expr, assumeTrue);
          case Syntax.InKeyword:
            const target = this.referenceCandidate(expr.right);
            if (qf.is.stringLiteralLike(expr.left) && qf.is.matchingReference(reference, target)) return narrowByInKeyword(t, expr.left, assumeTrue);
            break;
          case Syntax.CommaToken:
            return narrowType(t, expr.right, assumeTrue);
        }
        return type;
      }
      narrowTypeByOptionalChainContainment(t: qt.Type, operator: Syntax, value: qt.Expression, assumeTrue: boolean): qt.Type {
        const equalsOperator = operator === Syntax.Equals2Token || operator === Syntax.Equals3Token;
        const nullableFlags = operator === Syntax.Equals2Token || operator === Syntax.ExclamationEqualsToken ? qt.TypeFlags.Nullable : qt.TypeFlags.Undefined;
        const valueType = this.typeOfExpression(value);
        const removeNullable =
          (equalsOperator !== assumeTrue && everyType(valueType, (t) => !!(t.flags & nullableFlags))) ||
          (equalsOperator === assumeTrue && everyType(valueType, (t) => !(t.flags & (TypeFlags.AnyOrUnknown | nullableFlags))));
        return removeNullable ? this.typeWithFacts(t, TypeFacts.NEUndefinedOrNull) : type;
      }
      narrowTypeByEquality(t: qt.Type, operator: Syntax, value: qt.Expression, assumeTrue: boolean): qt.Type {
        if (t.flags & qt.TypeFlags.Any) return type;
        if (operator === Syntax.ExclamationEqualsToken || operator === Syntax.ExclamationEquals2Token) assumeTrue = !assumeTrue;
        const valueType = this.typeOfExpression(value);
        if (t.flags & qt.TypeFlags.Unknown && assumeTrue && (operator === Syntax.Equals3Token || operator === Syntax.ExclamationEquals2Token)) {
          if (valueType.flags & (TypeFlags.Primitive | qt.TypeFlags.NonPrimitive)) return valueType;
          if (valueType.flags & qt.TypeFlags.Object) return nonPrimitiveType;
          return type;
        }
        if (valueType.flags & qt.TypeFlags.Nullable) {
          if (!strictNullChecks) return type;
          const doubleEquals = operator === Syntax.Equals2Token || operator === Syntax.ExclamationEqualsToken;
          const facts = doubleEquals
            ? assumeTrue
              ? TypeFacts.EQUndefinedOrNull
              : TypeFacts.NEUndefinedOrNull
            : valueType.flags & qt.TypeFlags.Null
            ? assumeTrue
              ? TypeFacts.EQNull
              : TypeFacts.NENull
            : assumeTrue
            ? TypeFacts.EQUndefined
            : TypeFacts.NEUndefined;
          return this.typeWithFacts(t, facts);
        }
        if (t.flags & qt.TypeFlags.NotUnionOrUnit) return type;
        if (assumeTrue) {
          const filterFn: (t: qt.Type) => boolean =
            operator === Syntax.Equals2Token ? (t) => areTypesComparable(t, valueType) || qf.is.coercibleUnderDoubleEquals(t, valueType) : (t) => areTypesComparable(t, valueType);
          const narrowedType = filterType(t, filterFn);
          return narrowedType.flags & qt.TypeFlags.Never ? type : replacePrimitivesWithLiterals(narrowedType, valueType);
        }
        if (qf.is.unitType(valueType)) {
          const regularType = this.regularTypeOfLiteralType(valueType);
          return filterType(t, (t) => (qf.is.unitType(t) ? !areTypesComparable(t, valueType) : this.regularTypeOfLiteralType(t) !== regularType));
        }
        return type;
      }
      narrowTypeByTypeof(t: qt.Type, typeOfExpr: qt.TypeOfExpression, operator: Syntax, literal: qt.LiteralExpression, assumeTrue: boolean): qt.Type {
        if (operator === Syntax.ExclamationEqualsToken || operator === Syntax.ExclamationEquals2Token) assumeTrue = !assumeTrue;
        const target = this.referenceCandidate(typeOfExpr.expression);
        if (!qf.is.matchingReference(reference, target)) {
          if (strictNullChecks && optionalChainContainsReference(target, reference) && assumeTrue === (literal.text !== 'undefined')) return this.typeWithFacts(t, TypeFacts.NEUndefinedOrNull);
          return type;
        }
        if (t.flags & qt.TypeFlags.Any && literal.text === 'function') return type;
        if (assumeTrue && t.flags & qt.TypeFlags.Unknown && literal.text === 'object') {
          if (typeOfExpr.parent?.parent?.kind === Syntax.BinaryExpression) {
            const expr = typeOfExpr.parent?.parent;
            if (expr.operatorToken.kind === Syntax.Ampersand2Token && expr.right === typeOfExpr.parent && containsTruthyCheck(reference, expr.left)) return nonPrimitiveType;
          }
          return this.unionType([nonPrimitiveType, nullType]);
        }
        const facts = assumeTrue ? typeofEQFacts.get(literal.text) || TypeFacts.TypeofEQHostObject : typeofNEFacts.get(literal.text) || TypeFacts.TypeofNEHostObject;
        const impliedType = this.impliedTypeFromTypeofGuard(t, literal.text);
        return this.typeWithFacts(assumeTrue && impliedType ? mapType(t, narrowUnionMemberByTypeof(impliedType)) : type, facts);
      }
      narrowTypeBySwitchOptionalChainContainment(t: qt.Type, switchStatement: qt.SwitchStatement, clauseStart: number, clauseEnd: number, clauseCheck: (t: qt.Type) => boolean) {
        const everyClauseChecks = clauseStart !== clauseEnd && every(this.switchClauseTypes(switchStatement).slice(clauseStart, clauseEnd), clauseCheck);
        return everyClauseChecks ? this.typeWithFacts(t, TypeFacts.NEUndefinedOrNull) : type;
      }
      narrowTypeBySwitchOnDiscriminant(t: qt.Type, switchStatement: qt.SwitchStatement, clauseStart: number, clauseEnd: number) {
        const switchTypes = this.switchClauseTypes(switchStatement);
        if (!switchTypes.length) return type;
        const clauseTypes = switchTypes.slice(clauseStart, clauseEnd);
        const hasDefaultClause = clauseStart === clauseEnd || contains(clauseTypes, neverType);
        if (t.flags & qt.TypeFlags.Unknown && !hasDefaultClause) {
          let groundClauseTypes: qt.Type[] | undefined;
          for (let i = 0; i < clauseTypes.length; i += 1) {
            const t = clauseTypes[i];
            if (t.flags & (TypeFlags.Primitive | qt.TypeFlags.NonPrimitive)) {
              if (groundClauseTypes !== undefined) groundClauseTypes.push(t);
            } else if (t.flags & qt.TypeFlags.Object) {
              if (groundClauseTypes === undefined) groundClauseTypes = clauseTypes.slice(0, i);
              groundClauseTypes.push(nonPrimitiveType);
            }
            return type;
          }
          return this.unionType(groundClauseTypes === undefined ? clauseTypes : groundClauseTypes);
        }
        const discriminantType = this.unionType(clauseTypes);
        const caseType =
          discriminantType.flags & qt.TypeFlags.Never
            ? neverType
            : replacePrimitivesWithLiterals(
                filterType(t, (t) => areTypesComparable(discriminantType, t)),
                discriminantType
              );
        if (!hasDefaultClause) return caseType;
        const defaultType = filterType(t, (t) => !(qf.is.unitType(t) && contains(switchTypes, this.regularTypeOfLiteralType(t))));
        return caseType.flags & qt.TypeFlags.Never ? defaultType : this.unionType([caseType, defaultType]);
      }
      impliedTypeFromTypeofGuard(t: qt.Type, text: string) {
        switch (text) {
          case 'function':
            return t.flags & qt.TypeFlags.Any ? type : globalFunctionType;
          case 'object':
            return t.flags & qt.TypeFlags.Unknown ? this.unionType([nonPrimitiveType, nullType]) : type;
          default:
            return typeofTypesByName.get(text);
        }
      }
      narrowUnionMemberByTypeof(candidate: qt.Type) {
        return (t: qt.Type) => {
          if (qf.is.typeSubtypeOf(t, candidate)) return type;
          if (qf.is.typeSubtypeOf(candidate, type)) return candidate;
          if (t.flags & qt.TypeFlags.Instantiable) {
            const constraint = this.baseConstraintOfType(t) || anyType;
            if (qf.is.typeSubtypeOf(candidate, constraint)) return this.intersectionType([type, candidate]);
          }
          return type;
        };
      }
      narrowBySwitchOnTypeOf(t: qt.Type, switchStatement: qt.SwitchStatement, clauseStart: number, clauseEnd: number): qt.Type {
        const switchWitnesses = this.switchClauseTypeOfWitnesses(switchStatement, true);
        if (!switchWitnesses.length) return type;
        const defaultCaseLocation = findIndex(switchWitnesses, (elem) => elem === undefined);
        const hasDefaultClause = clauseStart === clauseEnd || (defaultCaseLocation >= clauseStart && defaultCaseLocation < clauseEnd);
        let clauseWitnesses: string[];
        let switchFacts: TypeFacts;
        if (defaultCaseLocation > -1) {
          const witnesses = <string[]>switchWitnesses.filter((witness) => witness !== undefined);
          const fixedClauseStart = defaultCaseLocation < clauseStart ? clauseStart - 1 : clauseStart;
          const fixedClauseEnd = defaultCaseLocation < clauseEnd ? clauseEnd - 1 : clauseEnd;
          clauseWitnesses = witnesses.slice(fixedClauseStart, fixedClauseEnd);
          switchFacts = this.factsFromTypeofSwitch(fixedClauseStart, fixedClauseEnd, witnesses, hasDefaultClause);
        } else {
          clauseWitnesses = <string[]>switchWitnesses.slice(clauseStart, clauseEnd);
          switchFacts = this.factsFromTypeofSwitch(clauseStart, clauseEnd, <string[]>switchWitnesses, hasDefaultClause);
        }
        if (hasDefaultClause) return filterType(t, (t) => (this.typeFacts(t) & switchFacts) === switchFacts);
        const impliedType = this.typeWithFacts(this.unionType(clauseWitnesses.map((text) => this.impliedTypeFromTypeofGuard(t, text) || type)), switchFacts);
        return this.typeWithFacts(mapType(t, narrowUnionMemberByTypeof(impliedType)), switchFacts);
      }
      isMatchingConstructorReference(expr: qt.Expression) {
        return (
          ((expr.kind === Syntax.PropertyAccessExpression && idText(expr.name) === 'constructor') ||
            (expr.kind === Syntax.ElemAccessExpression && qf.is.stringLiteralLike(expr.argExpression) && expr.argExpression.text === 'constructor')) &&
          qf.is.matchingReference(reference, expr.expression)
        );
      }
      narrowTypeByConstructor(t: qt.Type, operator: Syntax, identifier: qt.Expression, assumeTrue: boolean): qt.Type {
        if (assumeTrue ? operator !== Syntax.Equals2Token && operator !== Syntax.Equals3Token : operator !== Syntax.ExclamationEqualsToken && operator !== Syntax.ExclamationEquals2Token) return type;
        const identifierType = this.typeOfExpression(identifier);
        if (!qf.is.functionType(identifierType) && !qf.is.constructorType(identifierType)) return type;
        const prototypeProperty = this.propertyOfType(identifierType, 'prototype' as qu.__String);
        if (!prototypeProperty) return type;
        const prototypeType = this.typeOfSymbol(prototypeProperty);
        const candidate = !qf.is.typeAny(prototypeType) ? prototypeType : undefined;
        if (!candidate || candidate === globalObjectType || candidate === globalFunctionType) return type;
        if (qf.is.typeAny(t)) return candidate;
        return filterType(t, (t) => qf.is.constructedBy(t, candidate));
        const isConstructedBy = (source: qt.Type, target: qt.Type) => {
          if ((source.flags & qt.TypeFlags.Object && this.objectFlags(source) & ObjectFlags.Class) || (target.flags & qt.TypeFlags.Object && this.objectFlags(target) & ObjectFlags.Class))
            return source.symbol === target.symbol;
          return qf.is.typeSubtypeOf(source, target);
        };
      }
      narrowTypeByInstanceof(t: qt.Type, expr: qt.BinaryExpression, assumeTrue: boolean): qt.Type {
        const left = this.referenceCandidate(expr.left);
        if (!qf.is.matchingReference(reference, left)) {
          if (assumeTrue && strictNullChecks && optionalChainContainsReference(left, reference)) return this.typeWithFacts(t, TypeFacts.NEUndefinedOrNull);
          return type;
        }
        const rightType = this.typeOfExpression(expr.right);
        if (!qf.is.typeDerivedFrom(rightType, globalFunctionType)) return type;
        let targetType: qt.Type | undefined;
        const prototypeProperty = this.propertyOfType(rightType, 'prototype' as qu.__String);
        if (prototypeProperty) {
          const prototypePropertyType = this.typeOfSymbol(prototypeProperty);
          if (!qf.is.typeAny(prototypePropertyType)) targetType = prototypePropertyType;
        }
        if (qf.is.typeAny(t) && (targetType === globalObjectType || targetType === globalFunctionType)) return type;
        if (!targetType) {
          const constructSignatures = this.signaturesOfType(rightType, qt.SignatureKind.Construct);
          targetType = constructSignatures.length ? this.unionType(map(constructSignatures, (s) => this.returnTypeOfSignature(s.erased()))) : qu.emptyObjectType;
        }
        return this.narrowedType(t, targetType, assumeTrue, qf.is.typeDerivedFrom);
      }
      narrowedType(t: qt.Type, candidate: qt.Type, assumeTrue: boolean, isRelated: (source: qt.Type, target: qt.Type) => boolean) {
        if (!assumeTrue) return filterType(t, (t) => !qf.is.related(t, candidate));
        if (t.flags & qt.TypeFlags.Union) {
          const assignableType = filterType(t, (t) => qf.is.related(t, candidate));
          if (!(assignableType.flags & qt.TypeFlags.Never)) return assignableType;
        }
        return qf.is.typeSubtypeOf(candidate, type)
          ? candidate
          : qf.is.typeAssignableTo(t, candidate)
          ? type
          : qf.is.typeAssignableTo(candidate, type)
          ? candidate
          : this.intersectionType([type, candidate]);
      }
      narrowTypeByCallExpression(t: qt.Type, callExpression: qt.CallExpression, assumeTrue: boolean): qt.Type {
        if (qf.has.matchingArg(callExpression, reference)) {
          const signature = assumeTrue || !qf.is.callChain(callExpression) ? this.effectsSignature(callExpression) : undefined;
          const predicate = signature && this.typePredicateOfSignature(signature);
          if (predicate && (predicate.kind === qt.TypePredicateKind.This || predicate.kind === qt.TypePredicateKind.Identifier)) return narrowTypeByTypePredicate(t, predicate, callExpression, assumeTrue);
        }
        return type;
      }
      narrowTypeByTypePredicate(t: qt.Type, predicate: qt.TypePredicate, callExpression: qt.CallExpression, assumeTrue: boolean): qt.Type {
        if (predicate.type && !(qf.is.typeAny(t) && (predicate.type === globalObjectType || predicate.type === globalFunctionType))) {
          const predicateArg = this.typePredicateArg(predicate, callExpression);
          if (predicateArg) {
            if (qf.is.matchingReference(reference, predicateArg)) return this.narrowedType(t, predicate.type, assumeTrue, isTypeSubtypeOf);
            if (strictNullChecks && assumeTrue && optionalChainContainsReference(predicateArg, reference) && !(this.typeFacts(predicate.type) & TypeFacts.EQUndefined))
              type = this.typeWithFacts(t, TypeFacts.NEUndefinedOrNull);
            if (qf.is.matchingReferenceDiscriminant(predicateArg, type))
              return narrowTypeByDiscriminant(t, predicateArg as qt.AccessExpression, (t) => this.narrowedType(t, predicate.type!, assumeTrue, isTypeSubtypeOf));
          }
        }
        return type;
      }
      narrowType(t: qt.Type, expr: qt.Expression, assumeTrue: boolean): qt.Type {
        if (qf.is.expressionOfOptionalChainRoot(expr) || (expr.parent?.kind === Syntax.BinaryExpression && expr.parent?.operatorToken.kind === Syntax.Question2Token && expr.parent?.left === expr))
          return narrowTypeByOptionality(t, expr, assumeTrue);
        switch (expr.kind) {
          case Syntax.Identifier:
          case Syntax.ThisKeyword:
          case Syntax.SuperKeyword:
          case Syntax.PropertyAccessExpression:
          case Syntax.ElemAccessExpression:
            return narrowTypeByTruthiness(t, expr, assumeTrue);
          case Syntax.CallExpression:
            return narrowTypeByCallExpression(t, <qt.CallExpression>expr, assumeTrue);
          case Syntax.ParenthesizedExpression:
            return narrowType(t, (<qt.ParenthesizedExpression>expr).expression, assumeTrue);
          case Syntax.BinaryExpression:
            return narrowTypeByBinaryExpression(t, expr, assumeTrue);
          case Syntax.PrefixUnaryExpression:
            if ((<qt.PrefixUnaryExpression>expr).operator === Syntax.ExclamationToken) return narrowType(t, (<qt.PrefixUnaryExpression>expr).operand, !assumeTrue);
            break;
        }
        return type;
      }
      narrowTypeByOptionality(t: qt.Type, expr: qt.Expression, assumePresent: boolean): qt.Type {
        if (qf.is.matchingReference(reference, expr)) return this.typeWithFacts(t, assumePresent ? TypeFacts.NEUndefinedOrNull : TypeFacts.EQUndefinedOrNull);
        if (qf.is.matchingReferenceDiscriminant(expr, type))
          return narrowTypeByDiscriminant(t, <qt.AccessExpression>expr, (t) => this.typeWithFacts(t, assumePresent ? TypeFacts.NEUndefinedOrNull : TypeFacts.EQUndefinedOrNull));
        return type;
      }
    })();
    typeOfSymbolAtLocation(symbol: qt.Symbol, location: Node) {
      symbol = symbol.exportSymbol || symbol;
      if (location.kind === Syntax.Identifier) {
        if (qf.is.rightSideOfQualifiedNameOrPropertyAccess(location)) location = location.parent;
        if (qf.is.expressionNode(location) && !qf.is.assignmentTarget(location)) {
          const type = this.typeOfExpression(location);
          if (this.exportSymbolOfValueSymbolIfExported(this.nodeLinks(location).resolvedSymbol) === symbol) return type;
        }
      }
      return this.this.typeOfSymbol();
    }
    controlFlowContainer(n: Node): Node {
      return qc.findAncestor(
        n.parent,
        (n) => (qf.is.functionLike(n) && !this.immediatelyInvokedFunctionExpression(n)) || n.kind === Syntax.ModuleBlock || n.kind === Syntax.SourceFile || n.kind === Syntax.PropertyDeclaration
      )!;
    }
    constraintForLocation(t: qt.Type, n: Node): qt.Type;
    constraintForLocation(t: qt.Type | undefined, n: Node): qt.Type | undefined;
    constraintForLocation(t: qt.Type, n: Node): qt.Type | undefined {
      if (type && qf.is.constraintPosition(n) && forEachType(t, typeHasNullableConstraint)) return mapType(this.widenedType(t), this.baseConstraintOrType);
      return type;
    }
    partOfForStatementContainingNode(n: Node, container: qt.ForStatement) {
      return qc.findAncestor(n, (n) => (n === container ? 'quit' : n === container.initer || n === container.condition || n === container.incrementor || n === container.statement));
    }
    explicitThisType(n: qt.Expression) {
      const container = this.thisContainer(n, false);
      if (qf.is.functionLike(container)) {
        const signature = this.signatureFromDeclaration(container);
        if (signature.thisParam) return this.explicitTypeOfSymbol(signature.thisParam);
      }
      if (qf.is.classLike(container.parent)) {
        const symbol = this.symbolOfNode(container.parent);
        return qf.has.syntacticModifier(container, ModifierFlags.Static) ? this.this.typeOfSymbol() : (this.declaredTypeOfSymbol(symbol) as qt.InterfaceType).thisType!;
      }
    }
    classNameFromPrototypeMethod(container: Node) {
      if (
        container.kind === Syntax.FunctionExpression &&
        container.parent?.kind === Syntax.BinaryExpression &&
        this.assignmentDeclarationKind(container.parent) === qt.AssignmentDeclarationKind.PrototypeProperty
      ) {
        return ((container.parent?.left as qt.PropertyAccessExpression).expression as qt.PropertyAccessExpression).expression;
      } else if (
        container.kind === Syntax.MethodDeclaration &&
        container.parent?.kind === Syntax.ObjectLiteralExpression &&
        container.parent?.parent?.kind === Syntax.BinaryExpression &&
        this.assignmentDeclarationKind(container.parent?.parent) === qt.AssignmentDeclarationKind.Prototype
      ) {
        return (container.parent?.parent?.left as qt.PropertyAccessExpression).expression;
      } else if (
        container.kind === Syntax.FunctionExpression &&
        container.parent?.kind === Syntax.PropertyAssignment &&
        container.parent?.parent?.kind === Syntax.ObjectLiteralExpression &&
        container.parent?.parent?.parent?.kind === Syntax.BinaryExpression &&
        this.assignmentDeclarationKind(container.parent?.parent?.parent) === qt.AssignmentDeclarationKind.Prototype
      ) {
        return (container.parent?.parent?.parent?.left as qt.PropertyAccessExpression).expression;
      } else if (
        container.kind === Syntax.FunctionExpression &&
        container.parent?.kind === Syntax.PropertyAssignment &&
        container.parent?.name.kind === Syntax.Identifier &&
        (container.parent?.name.escapedText === 'value' || container.parent?.name.escapedText === 'get' || container.parent?.name.escapedText === 'set') &&
        container.parent?.parent?.kind === Syntax.ObjectLiteralExpression &&
        container.parent?.parent?.parent?.kind === Syntax.CallExpression &&
        container.parent?.parent?.parent?.args[2] === container.parent?.parent &&
        this.assignmentDeclarationKind(container.parent?.parent?.parent) === qt.AssignmentDeclarationKind.ObjectDefinePrototypeProperty
      ) {
        return (container.parent?.parent?.parent?.args[0] as qt.PropertyAccessExpression).expression;
      } else if (
        container.kind === Syntax.MethodDeclaration &&
        container.name.kind === Syntax.Identifier &&
        (container.name.escapedText === 'value' || container.name.escapedText === 'get' || container.name.escapedText === 'set') &&
        container.parent?.kind === Syntax.ObjectLiteralExpression &&
        container.parent?.parent?.kind === Syntax.CallExpression &&
        container.parent?.parent?.args[2] === container.parent &&
        this.assignmentDeclarationKind(container.parent?.parent) === qt.AssignmentDeclarationKind.ObjectDefinePrototypeProperty
      ) {
        return (container.parent?.parent?.args[0] as qt.PropertyAccessExpression).expression;
      }
    }
    typeForThisExpressionFromDoc(n: Node) {
      const jsdocType = qf.get.doc.type(n);
      if (jsdocType && jsdocType.kind === Syntax.DocFunctionTyping) {
        const docFunctionType = <qt.DocFunctionTyping>jsdocType;
        if (docFunctionType.params.length > 0 && docFunctionType.params[0].name && (docFunctionType.params[0].name as qt.Identifier).escapedText === InternalSymbol.This)
          return this.typeFromTypeNode(docFunctionType.params[0].type!);
      }
      const thisTag = qf.get.doc.thisTag(n);
      if (thisTag && thisTag.typeExpression) return this.typeFromTypeNode(thisTag.typeExpression);
    }
    containingObjectLiteral(func: qt.SignatureDeclaration): qt.ObjectLiteralExpression | undefined {
      return (func.kind === Syntax.MethodDeclaration || func.kind === Syntax.GetAccessor || func.kind === Syntax.SetAccessor) && func.parent?.kind === Syntax.ObjectLiteralExpression
        ? func.parent
        : func.kind === Syntax.FunctionExpression && func.parent?.kind === Syntax.PropertyAssignment
        ? <qt.ObjectLiteralExpression>func.parent?.parent
        : undefined;
    }
    thisTypeArg(t: qt.Type): qt.Type | undefined {
      return this.objectFlags(t) & ObjectFlags.Reference && (<qt.TypeReference>type).target === globalThisType ? this.typeArgs(<qt.TypeReference>type)[0] : undefined;
    }
    thisTypeFromContextualType(t: qt.Type): qt.Type | undefined {
      return mapType(t, (t) => {
        return t.flags & qt.TypeFlags.Intersection ? forEach((<qt.IntersectionType>t).types, getThisTypeArg) : this.thisTypeArg(t);
      });
    }
    contextualThisParamType(func: qt.SignatureDeclaration): qt.Type | undefined {
      if (func.kind === Syntax.ArrowFunction) return;
      if (qf.is.contextSensitiveFunctionOrObjectLiteralMethod(func)) {
        const contextualSignature = this.contextualSignature(func);
        if (contextualSignature) {
          const thisParam = contextualSignature.thisParam;
          if (thisParam) return this.typeOfSymbol(thisParam);
        }
      }
      const inJs = qf.is.inJSFile(func);
      if (noImplicitThis || inJs) {
        const containingLiteral = this.containingObjectLiteral(func);
        if (containingLiteral) {
          const contextualType = this.apparentTypeOfContextualType(containingLiteral);
          let literal = containingLiteral;
          let type = contextualType;
          while (t) {
            const thisType = this.thisTypeFromContextualType(t);
            if (thisType) return instantiateType(thisType, this.mapperFromContext(this.inferenceContext(containingLiteral)));
            if (literal.parent?.kind !== Syntax.PropertyAssignment) break;
            literal = <qt.ObjectLiteralExpression>literal.parent?.parent;
            type = this.apparentTypeOfContextualType(literal);
          }
          return this.widenedType(contextualType ? this.nonNullableType(contextualType) : qf.check.expressionCached(containingLiteral));
        }
        const parent = walkUpParenthesizedExpressions(func.parent);
        if (parent?.kind === Syntax.BinaryExpression && parent?.operatorToken.kind === Syntax.EqualsToken) {
          const target = parent?.left;
          if (qf.is.accessExpression(target)) {
            const { expression } = target;
            if (inJs && expression.kind === Syntax.Identifier) {
              const sourceFile = parent?.sourceFile;
              if (sourceFile.commonJsModuleIndicator && this.resolvedSymbol(expression) === sourceFile.symbol) return;
            }
            return this.widenedType(qf.check.expressionCached(expression));
          }
        }
      }
      return;
    }
    contextuallyTypedParamType(param: qt.ParamDeclaration): qt.Type | undefined {
      const func = param.parent;
      if (!qf.is.contextSensitiveFunctionOrObjectLiteralMethod(func)) return;
      const iife = this.immediatelyInvokedFunctionExpression(func);
      if (iife && iife.args) {
        const args = this.effectiveCallArgs(iife);
        const indexOfParam = func.params.indexOf(param);
        if (param.dot3Token) return this.spreadArgType(args, indexOfParam, args.length, anyType, undefined);
        const links = this.nodeLinks(iife);
        const cached = links.resolvedSignature;
        links.resolvedSignature = anySignature;
        const type = indexOfParam < args.length ? this.widenedLiteralType(qf.check.expression(args[indexOfParam])) : param.initer ? undefined : undefinedWideningType;
        links.resolvedSignature = cached;
        return type;
      }
      const contextualSignature = this.contextualSignature(func);
      if (contextualSignature) {
        const index = func.params.indexOf(param) - (this.thisNodeKind(ParamDeclaration, func) ? 1 : 0);
        return param.dot3Token && lastOrUndefined(func.params) === param ? this.restTypeAtPosition(contextualSignature, index) : tryGetTypeAtPosition(contextualSignature, index);
      }
    }
    contextualTypeForVariableLikeDeclaration(declaration: qt.VariableLikeDeclaration): qt.Type | undefined {
      const typeNode = this.effectiveTypeAnnotationNode(declaration);
      if (typeNode) return this.typeFromTypeNode(typeNode);
      switch (declaration.kind) {
        case Syntax.Param:
          return this.contextuallyTypedParamType(declaration);
        case Syntax.BindingElem:
          return this.contextualTypeForBindingElem(declaration);
      }
    }
    contextualTypeForBindingElem(declaration: qt.BindingElem): qt.Type | undefined {
      const parent = declaration.parent?.parent;
      const name = declaration.propertyName || declaration.name;
      const parentType = this.contextualTypeForVariableLikeDeclaration(parent) || (parent?.kind !== Syntax.BindingElem && parent?.initer && qf.check.declarationIniter(parent));
      if (parentType && !name.kind === Syntax.BindingPattern && !qf.is.computedNonLiteralName(name)) {
        const nameType = this.literalTypeFromPropertyName(name);
        if (qf.is.typeUsableAsPropertyName(nameType)) {
          const text = this.propertyNameFromType(nameType);
          return this.typeOfPropertyOfType(parentType, text);
        }
      }
    }
    contextualTypeForIniterExpression(n: qt.Expression): qt.Type | undefined {
      const declaration = <qt.VariableLikeDeclaration>n.parent;
      if (qf.is.withIniter(declaration) && n === declaration.initer) {
        const result = this.contextualTypeForVariableLikeDeclaration(declaration);
        if (result) return result;
        if (declaration.name.kind === Syntax.BindingPattern) return this.typeFromBindingPattern(declaration.name, true, false);
      }
      return;
    }
    contextualTypeForReturnExpression(n: qt.Expression): qt.Type | undefined {
      const func = this.containingFunction(n);
      if (func) {
        const functionFlags = this.functionFlags(func);
        if (functionFlags & FunctionFlags.Generator) return;
        const contextualReturnType = this.contextualReturnType(func);
        if (contextualReturnType) {
          if (functionFlags & FunctionFlags.Async) {
            const contextualAwaitedType = mapType(contextualReturnType, getAwaitedTypeOfPromise);
            return contextualAwaitedType && this.unionType([contextualAwaitedType, qf.create.promiseLikeType(contextualAwaitedType)]);
          }
          return contextualReturnType;
        }
      }
      return;
    }
    contextualTypeForAwaitOperand(n: qt.AwaitExpression): qt.Type | undefined {
      const contextualType = this.contextualType(n);
      if (contextualType) {
        const contextualAwaitedType = this.awaitedType(contextualType);
        return contextualAwaitedType && this.unionType([contextualAwaitedType, qf.create.promiseLikeType(contextualAwaitedType)]);
      }
      return;
    }
    contextualTypeForYieldOperand(n: qt.YieldExpression): qt.Type | undefined {
      const func = this.containingFunction(n);
      if (func) {
        const functionFlags = this.functionFlags(func);
        const contextualReturnType = this.contextualReturnType(func);
        if (contextualReturnType)
          return n.asteriskToken ? contextualReturnType : this.iterationTypeOfGeneratorFunctionReturnType(IterationTypeKind.Yield, contextualReturnType, (functionFlags & FunctionFlags.Async) !== 0);
      }
      return;
    }
    contextualIterationType(kind: IterationTypeKind, functionDecl: qt.SignatureDeclaration): qt.Type | undefined {
      const isAsync = !!(this.functionFlags(functionDecl) & FunctionFlags.Async);
      const contextualReturnType = this.contextualReturnType(functionDecl);
      if (contextualReturnType) return this.iterationTypeOfGeneratorFunctionReturnType(kind, contextualReturnType, isAsync) || undefined;
      return;
    }
    contextualReturnType(functionDecl: qt.SignatureDeclaration): qt.Type | undefined {
      const returnType = this.returnTypeFromAnnotation(functionDecl);
      if (returnType) return returnType;
      const signature = this.contextualSignatureForFunctionLikeDeclaration(<qt.FunctionExpression>functionDecl);
      if (signature && !qf.is.resolvingReturnTypeOfSignature(signature)) return this.returnTypeOfSignature(signature);
      return;
    }
    contextualTypeForArg(callTarget: qt.CallLikeExpression, arg: qt.Expression): qt.Type | undefined {
      const args = this.effectiveCallArgs(callTarget);
      const argIndex = args.indexOf(arg);
      return argIndex === -1 ? undefined : this.contextualTypeForArgAtIndex(callTarget, argIndex);
    }
    contextualTypeForArgAtIndex(callTarget: qt.CallLikeExpression, argIndex: number): qt.Type {
      const signature = this.nodeLinks(callTarget).resolvedSignature === resolvingSignature ? resolvingSignature : this.resolvedSignature(callTarget);
      if (qf.is.jsx.openingLikeElem(callTarget) && argIndex === 0) return this.effectiveFirstArgForJsxSignature(signature, callTarget);
      return this.typeAtPosition(signature, argIndex);
    }
    contextualTypeForSubstitutionExpression(template: qt.TemplateExpression, substitutionExpression: qt.Expression) {
      if (template.parent?.kind === Syntax.TaggedTemplateExpression) return this.contextualTypeForArg(<qt.TaggedTemplateExpression>template.parent, substitutionExpression);
      return;
    }
    contextualTypeForBinaryOperand(n: qt.Expression, contextFlags?: ContextFlags): qt.Type | undefined {
      const binaryExpression = n.parent;
      const { left, operatorToken, right } = binaryExpression;
      switch (operatorToken.kind) {
        case Syntax.EqualsToken:
          if (n !== right) return;
          const contextSensitive = this.qf.is.contextSensitiveAssignmentOrContextType(binaryExpression);
          if (!contextSensitive) return;
          return contextSensitive === true ? this.typeOfExpression(left) : contextSensitive;
        case Syntax.Bar2Token:
        case Syntax.Question2Token:
          const type = this.contextualType(binaryExpression, contextFlags);
          return n === right && ((type && t.pattern) || (!type && !qf.is.defaultedExpandoIniter(binaryExpression))) ? this.typeOfExpression(left) : type;
        case Syntax.Ampersand2Token:
        case Syntax.CommaToken:
          return n === right ? this.contextualType(binaryExpression, contextFlags) : undefined;
        default:
          return;
      }
    }
    isContextSensitiveAssignmentOrContextType(binaryExpression: qt.BinaryExpression): boolean | qt.Type {
      const kind = this.assignmentDeclarationKind(binaryExpression);
      switch (kind) {
        case qt.AssignmentDeclarationKind.None:
          return true;
        case qt.AssignmentDeclarationKind.Property:
        case qt.AssignmentDeclarationKind.ExportsProperty:
        case qt.AssignmentDeclarationKind.Prototype:
        case qt.AssignmentDeclarationKind.PrototypeProperty:
          if (!binaryExpression.left.symbol) return true;
          else {
            const decl = binaryExpression.left.symbol.valueDeclaration;
            if (!decl) return false;
            const lhs = cast(binaryExpression.left, isAccessExpression);
            const overallAnnotation = this.effectiveTypeAnnotationNode(decl);
            if (overallAnnotation) return this.typeFromTypeNode(overallAnnotation);
            else if (lhs.expression.kind === Syntax.Identifier) {
              const id = lhs.expression;
              const parentSymbol = resolveName(id, id.escapedText, SymbolFlags.Value, undefined, id.escapedText, true);
              if (parentSymbol) {
                const annotated = this.effectiveTypeAnnotationNode(parentSymbol.valueDeclaration);
                if (annotated) {
                  const nameStr = this.elemOrPropertyAccessName(lhs);
                  if (nameStr !== undefined) {
                    const type = this.typeOfPropertyOfContextualType(this.typeFromTypeNode(annotated), nameStr);
                    return type || false;
                  }
                }
                return false;
              }
            }
            return !qf.is.inJSFile(decl);
          }
        case qt.AssignmentDeclarationKind.ModuleExports:
        case qt.AssignmentDeclarationKind.ThisProperty:
          if (!binaryExpression.symbol) return true;
          if (binaryExpression.symbol.valueDeclaration) {
            const annotated = this.effectiveTypeAnnotationNode(binaryExpression.symbol.valueDeclaration);
            if (annotated) {
              const type = this.typeFromTypeNode(annotated);
              if (t) return type;
            }
          }
          if (kind === qt.AssignmentDeclarationKind.ModuleExports) return false;
          const thisAccess = cast(binaryExpression.left, isAccessExpression);
          if (!qf.is.objectLiteralMethod(this.thisContainer(thisAccess.expression, false))) return false;
          const thisType = qf.check.thisNodeExpression(thisAccess.expression);
          const nameStr = this.elemOrPropertyAccessName(thisAccess);
          return (nameStr !== undefined && thisType && this.typeOfPropertyOfContextualType(thisType, nameStr)) || false;
        case qt.AssignmentDeclarationKind.ObjectDefinePropertyValue:
        case qt.AssignmentDeclarationKind.ObjectDefinePropertyExports:
        case qt.AssignmentDeclarationKind.ObjectDefinePrototypeProperty:
          return qu.fail('Does not apply');
        default:
          return qc.assert.never(kind);
      }
    }
    typeOfPropertyOfContextualType(t: qt.Type, name: qu.__String) {
      return mapType(
        type,
        (t) => {
          if (qf.is.genericMappedType(t)) {
            const constraint = this.constraintTypeFromMappedType(t);
            const constraintOfConstraint = this.baseConstraintOfType(constraint) || constraint;
            const propertyNameType = this.literalType(qy.get.unescUnderscores(name));
            if (qf.is.typeAssignableTo(propertyNameType, constraintOfConstraint)) return substituteIndexedMappedType(t, propertyNameType);
          } else if (t.flags & qt.TypeFlags.StructuredType) {
            const prop = this.propertyOfType(t, name);
            if (prop) return qf.is.circularMappedProperty(prop) ? undefined : this.typeOfSymbol(prop);
            if (qf.is.tupleType(t)) {
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
    indexTypeOfContextualType(t: qt.Type, kind: IndexKind) {
      return mapType(t, (t) => this.indexTypeOfStructuredType(t, kind), true);
    }
    contextualTypeForObjectLiteralMethod(n: qt.MethodDeclaration, contextFlags?: ContextFlags): qt.Type | undefined {
      qu.assert(qf.is.objectLiteralMethod(n));
      if (n.flags & NodeFlags.InWithStatement) return;
      return this.contextualTypeForObjectLiteralElem(n, contextFlags);
    }
    contextualTypeForObjectLiteralElem(elem: qt.ObjectLiteralElemLike, contextFlags?: ContextFlags) {
      const objectLiteral = <qt.ObjectLiteralExpression>elem.parent;
      const type = this.apparentTypeOfContextualType(objectLiteral, contextFlags);
      if (t) {
        if (!qf.has.nonBindableDynamicName(elem)) {
          const symbolName = this.symbolOfNode(elem).escName;
          const propertyType = this.typeOfPropertyOfContextualType(t, symbolName);
          if (propertyType) return propertyType;
        }
        return (qf.is.numericName(elem.name!) && this.indexTypeOfContextualType(t, qt.IndexKind.Number)) || this.indexTypeOfContextualType(t, qt.IndexKind.String);
      }
      return;
    }
    contextualTypeForElemExpression(arrayContextualType: qt.Type | undefined, index: number): qt.Type | undefined {
      return (
        arrayContextualType &&
        (this.typeOfPropertyOfContextualType(arrayContextualType, ('' + index) as qu.__String) || this.iteratedTypeOrElemType(IterationUse.Elem, arrayContextualType, undefinedType, undefined, false))
      );
    }
    contextualTypeForConditionalOperand(n: qt.Expression, contextFlags?: ContextFlags): qt.Type | undefined {
      const conditional = <qt.ConditionalExpression>n.parent;
      return n === conditional.whenTrue || n === conditional.whenFalse ? this.contextualType(conditional, contextFlags) : undefined;
    }
    contextualTypeForChildJsxExpression(n: qt.JsxElem, child: qt.JsxChild) {
      const attributesType = this.apparentTypeOfContextualType(n.opening.tagName);
      const jsxChildrenPropertyName = this.jsxElemChildrenPropertyName(this.jsxNamespaceAt(n));
      if (!(attributesType && !qf.is.typeAny(attributesType) && jsxChildrenPropertyName && jsxChildrenPropertyName !== '')) return;
      const realChildren = this.semanticJsxChildren(n.children);
      const childIndex = realChildren.indexOf(child);
      const childFieldType = this.typeOfPropertyOfContextualType(attributesType, jsxChildrenPropertyName);
      return (
        childFieldType &&
        (realChildren.length === 1
          ? childFieldType
          : mapType(
              childFieldType,
              (t) => {
                if (qf.is.arrayLikeType(t)) return this.indexedAccessType(t, this.literalType(childIndex));
                return t;
              },
              true
            ))
      );
    }
    contextualTypeForJsxExpression(n: qt.JsxExpression): qt.Type | undefined {
      const exprParent = n.parent;
      return qf.is.jsx.attributeLike(exprParent) ? this.contextualType(n) : exprParent.kind === Syntax.JsxElem ? this.contextualTypeForChildJsxExpression(exprParent, n) : undefined;
    }
    contextualTypeForJsxAttribute(attribute: qt.JsxAttribute | qt.JsxSpreadAttribute): qt.Type | undefined {
      if (attribute.kind === Syntax.JsxAttribute) {
        const attributesType = this.apparentTypeOfContextualType(attribute.parent);
        if (!attributesType || qf.is.typeAny(attributesType)) return;
        return this.typeOfPropertyOfContextualType(attributesType, attribute.name.escapedText);
      }
      return this.contextualType(attribute.parent);
    }
    apparentTypeOfContextualType(n: qt.Expression | qt.MethodDeclaration, contextFlags?: ContextFlags): qt.Type | undefined {
      const contextualType = qf.is.objectLiteralMethod(n) ? this.contextualTypeForObjectLiteralMethod(n, contextFlags) : this.contextualType(n, contextFlags);
      const instantiatedType = instantiateContextualType(contextualType, n, contextFlags);
      if (instantiatedType && !(contextFlags && contextFlags & ContextFlags.NoConstraints && instantiatedType.flags & qt.TypeFlags.TypeVariable)) {
        const apparentType = mapType(instantiatedType, getApparentType, true);
        if (apparentType.flags & qt.TypeFlags.Union) {
          if (n.kind === Syntax.ObjectLiteralExpression) return discriminateContextualTypeByObjectMembers(n, apparentType as qt.UnionType);
          else if (n.kind === Syntax.JsxAttributes) return discriminateContextualTypeByJSXAttributes(n, apparentType as qt.UnionType);
        }
        return apparentType;
      }
    }
    contextualType(n: qt.Expression, contextFlags?: ContextFlags): qt.Type | undefined {
      if (n.flags & NodeFlags.InWithStatement) return;
      if (n.contextualType) return n.contextualType;
      const { parent } = n;
      switch (parent?.kind) {
        case Syntax.VariableDeclaration:
        case Syntax.Param:
        case Syntax.PropertyDeclaration:
        case Syntax.PropertySignature:
        case Syntax.BindingElem:
          return this.contextualTypeForIniterExpression(n);
        case Syntax.ArrowFunction:
        case Syntax.ReturnStatement:
          return this.contextualTypeForReturnExpression(n);
        case Syntax.YieldExpression:
          return this.contextualTypeForYieldOperand(<qt.YieldExpression>parent);
        case Syntax.AwaitExpression:
          return this.contextualTypeForAwaitOperand(<qt.AwaitExpression>parent);
        case Syntax.CallExpression:
          if ((<qt.CallExpression>parent).expression.kind === Syntax.ImportKeyword) return stringType;
        case Syntax.NewExpression:
          return this.contextualTypeForArg(<qt.CallExpression | qt.NewExpression>parent, n);
        case Syntax.TypeAssertionExpression:
        case Syntax.AsExpression:
          return qf.is.constTypeReference((<qt.AssertionExpression>parent).type) ? undefined : this.typeFromTypeNode((<qt.AssertionExpression>parent).type);
        case Syntax.BinaryExpression:
          return this.contextualTypeForBinaryOperand(n, contextFlags);
        case Syntax.PropertyAssignment:
        case Syntax.ShorthandPropertyAssignment:
          return this.contextualTypeForObjectLiteralElem(<qt.PropertyAssignment | qt.ShorthandPropertyAssignment>parent, contextFlags);
        case Syntax.SpreadAssignment:
          return this.apparentTypeOfContextualType(parent?.parent as qt.ObjectLiteralExpression, contextFlags);
        case Syntax.ArrayLiteralExpression: {
          const arrayLiteral = <qt.ArrayLiteralExpression>parent;
          const type = this.apparentTypeOfContextualType(arrayLiteral, contextFlags);
          return this.contextualTypeForElemExpression(t, n.indexIn(arrayLiteral.elems));
        }
        case Syntax.ConditionalExpression:
          return this.contextualTypeForConditionalOperand(n, contextFlags);
        case Syntax.TemplateSpan:
          qu.assert(parent?.parent?.kind === Syntax.TemplateExpression);
          return this.contextualTypeForSubstitutionExpression(<qt.TemplateExpression>parent?.parent, n);
        case Syntax.ParenthesizedExpression: {
          const tag = qf.is.inJSFile(parent) ? qf.get.doc.typeTag(parent) : undefined;
          return tag ? this.typeFromTypeNode(tag.typeExpression.type) : this.contextualType(<qt.ParenthesizedExpression>parent, contextFlags);
        }
        case Syntax.JsxExpression:
          return this.contextualTypeForJsxExpression(<qt.JsxExpression>parent);
        case Syntax.JsxAttribute:
        case Syntax.JsxSpreadAttribute:
          return this.contextualTypeForJsxAttribute(<qt.JsxAttribute | qt.JsxSpreadAttribute>parent);
        case Syntax.JsxOpeningElem:
        case Syntax.JsxSelfClosingElem:
          return this.contextualJsxElemAttributesType(<qt.JsxOpeningLikeElem>parent, contextFlags);
      }
      return;
    }
    inferenceContext(n: Node) {
      const ancestor = qc.findAncestor(n, (n) => !!n.inferenceContext);
      return ancestor && ancestor.inferenceContext!;
    }
    contextualJsxElemAttributesType(n: qt.JsxOpeningLikeElem, contextFlags?: ContextFlags) {
      if (n.kind === Syntax.JsxOpeningElem && n.parent?.contextualType && contextFlags !== ContextFlags.Completions) return n.parent?.contextualType;
      return this.contextualTypeForArgAtIndex(n, 0);
    }
    effectiveFirstArgForJsxSignature(s: qt.Signature, n: qt.JsxOpeningLikeElem) {
      return this.jsxReferenceKind(n) !== qt.JsxReferenceKind.Component ? this.jsxPropsTypeFromCallSignature(signature, n) : this.jsxPropsTypeFromClassType(signature, n);
    }
    jsxPropsTypeFromCallSignature(sig: qt.Signature, context: qt.JsxOpeningLikeElem) {
      let propsType = this.typeOfFirstParamOfSignatureWithFallback(sig, unknownType);
      propsType = this.jsxManagedAttributesFromLocatedAttributes(context, this.jsxNamespaceAt(context), propsType);
      const intrinsicAttribs = this.jsxType(JsxNames.IntrinsicAttributes, context);
      if (intrinsicAttribs !== errorType) propsType = intersectTypes(intrinsicAttribs, propsType);
      return propsType;
    }
    jsxPropsTypeForSignatureFromMember(sig: qt.Signature, forcedLookupLocation: qu.__String) {
      if (sig.unions) {
        const results: qt.Type[] = [];
        for (const signature of sig.unions) {
          const instance = this.returnTypeOfSignature(signature);
          if (qf.is.typeAny(instance)) return instance;
          const propType = this.typeOfPropertyOfType(instance, forcedLookupLocation);
          if (!propType) return;
          results.push(propType);
        }
        return this.intersectionType(results);
      }
      const instanceType = this.returnTypeOfSignature(sig);
      return qf.is.typeAny(instanceType) ? instanceType : this.typeOfPropertyOfType(instanceType, forcedLookupLocation);
    }
    staticTypeOfReferencedJsxConstructor(context: qt.JsxOpeningLikeElem) {
      if (qf.is.jsxIntrinsicIdentifier(context.tagName)) {
        const result = this.intrinsicAttributesTypeFromJsxOpeningLikeElem(context);
        const fakeSignature = qf.create.signatureForJSXIntrinsic(context, result);
        return this.orCreateTypeFromSignature(fakeSignature);
      }
      const tagType = qf.check.expressionCached(context.tagName);
      if (tagType.flags & qt.TypeFlags.StringLiteral) {
        const result = this.intrinsicAttributesTypeFromStringLiteralType(tagType as qt.StringLiteralType, context);
        if (!result) return errorType;
        const fakeSignature = qf.create.signatureForJSXIntrinsic(context, result);
        return this.orCreateTypeFromSignature(fakeSignature);
      }
      return tagType;
    }
    jsxManagedAttributesFromLocatedAttributes(context: qt.JsxOpeningLikeElem, ns: qt.Symbol, attributesType: qt.Type) {
      const managedSym = this.jsxLibraryManagedAttributes(ns);
      if (managedSym) {
        const declaredManagedType = this.declaredTypeOfSymbol(managedSym);
        const ctorType = this.staticTypeOfReferencedJsxConstructor(context);
        if (length((declaredManagedType as qt.GenericType).typeParams) >= 2) {
          const args = fillMissingTypeArgs([ctorType, attributesType], (declaredManagedType as qt.GenericType).typeParams, 2, qf.is.inJSFile(context));
          return qf.create.typeReference(declaredManagedType as qt.GenericType, args);
        } else if (length(declaredManagedType.aliasTypeArgs) >= 2) {
          const args = fillMissingTypeArgs([ctorType, attributesType], declaredManagedType.aliasTypeArgs, 2, qf.is.inJSFile(context));
          return this.typeAliasInstantiation(declaredManagedType.aliasSymbol!, args);
        }
      }
      return attributesType;
    }
    jsxPropsTypeFromClassType(sig: qt.Signature, context: qt.JsxOpeningLikeElem) {
      const ns = this.jsxNamespaceAt(context);
      const forcedLookupLocation = this.jsxElemPropertiesName(ns);
      let attributesType =
        forcedLookupLocation === undefined
          ? this.typeOfFirstParamOfSignatureWithFallback(sig, unknownType)
          : forcedLookupLocation === ''
          ? this.returnTypeOfSignature(sig)
          : this.jsxPropsTypeForSignatureFromMember(sig, forcedLookupLocation);
      if (!attributesType) {
        if (!!forcedLookupLocation && !!qu.length(context.attributes.properties))
          error(context, qd.msgs.JSX_elem_class_does_not_support_attributes_because_it_does_not_have_a_0_property, qy.get.unescUnderscores(forcedLookupLocation));
        return unknownType;
      }
      attributesType = this.jsxManagedAttributesFromLocatedAttributes(context, ns, attributesType);
      if (qf.is.typeAny(attributesType)) return attributesType;
      else {
        let apparentAttributesType = attributesType;
        const intrinsicClassAttribs = this.jsxType(JsxNames.IntrinsicClassAttributes, context);
        if (intrinsicClassAttribs !== errorType) {
          const typeParams = this.localTypeParamsOfClassOrInterfaceOrTypeAlias(intrinsicClassAttribs.symbol);
          const hostClassType = this.returnTypeOfSignature(sig);
          apparentAttributesType = intersectTypes(
            typeParams
              ? qf.create.typeReference(<qt.GenericType>intrinsicClassAttribs, fillMissingTypeArgs([hostClassType], typeParams, this.minTypeArgCount(typeParams), qf.is.inJSFile(context)))
              : intrinsicClassAttribs,
            apparentAttributesType
          );
        }
        const intrinsicAttribs = this.jsxType(JsxNames.IntrinsicAttributes, context);
        if (intrinsicAttribs !== errorType) apparentAttributesType = intersectTypes(intrinsicAttribs, apparentAttributesType);
        return apparentAttributesType;
      }
    }
    contextualCallSignature(t: qt.Type, n: qt.SignatureDeclaration): qt.Signature | undefined {
      const signatures = this.signaturesOfType(t, qt.SignatureKind.Call);
      if (signatures.length === 1) {
        const signature = signatures[0];
        if (!qf.is.aritySmaller(signature, n)) return signature;
      }
    }
    contextualSignatureForFunctionLikeDeclaration(n: qt.FunctionLikeDeclaration): qt.Signature | undefined {
      return qf.is.functionExpressionOrArrowFunction(n) || qf.is.objectLiteralMethod(n) ? this.contextualSignature(<qt.FunctionExpression>n) : undefined;
    }
    contextualSignature(n: qt.FunctionExpression | qt.ArrowFunction | qt.MethodDeclaration): qt.Signature | undefined {
      qu.assert(n.kind !== Syntax.MethodDeclaration || qf.is.objectLiteralMethod(n));
      const typeTagSignature = this.signatureOfTypeTag(n);
      if (typeTagSignature) return typeTagSignature;
      const type = this.apparentTypeOfContextualType(n, ContextFlags.Signature);
      if (!type) return;
      if (!(t.flags & qt.TypeFlags.Union)) return this.contextualCallSignature(t, n);
      let signatureList: qt.Signature[] | undefined;
      const types = (<qt.UnionType>type).types;
      for (const current of types) {
        const signature = this.contextualCallSignature(current, n);
        if (signature) {
          if (!signatureList) signatureList = [signature];
          else if (!compareSignaturesIdentical(signatureList[0], signature, true, compareTypesIdentical)) {
            return;
          } else {
            signatureList.push(signature);
          }
        }
      }
      if (signatureList) return signatureList.length === 1 ? signatureList[0] : qf.create.unionSignature(signatureList[0], signatureList);
    }
    arrayLiteralTupleTypeIfApplicable(elemTypes: qt.Type[], contextualType: qt.Type | undefined, hasRestElem: boolean, elemCount = elemTypes.length, readonly = false) {
      if (readonly || (contextualType && forEachType(contextualType, qf.is.tupleLikeType))) return qf.create.tupleType(elemTypes, elemCount - (hasRestElem ? 1 : 0), hasRestElem, readonly);
      return;
    }
    objectLiteralIndexInfo(n: qt.ObjectLiteralExpression, offset: number, properties: qt.Symbol[], kind: IndexKind): qt.IndexInfo {
      const propTypes: qt.Type[] = [];
      for (let i = 0; i < properties.length; i++) {
        if (kind === qt.IndexKind.String || qf.is.numericName(n.properties[i + offset].name!)) propTypes.push(this.typeOfSymbol(properties[i]));
      }
      const unionType = propTypes.length ? this.unionType(propTypes, UnionReduction.Subtype) : undefinedType;
      return qf.create.indexInfo(unionType, qf.is.constContext(n));
    }
    jsxType(name: qu.__String, location: Node | undefined) {
      const namespace = this.jsxNamespaceAt(location);
      const exports = namespace && namespace.this.exportsOfSymbol();
      const typeSymbol = exports && this.symbol(exports, name, SymbolFlags.Type);
      return typeSymbol ? this.declaredTypeOfSymbol(typeSymbol) : errorType;
    }
    intrinsicTagSymbol(n: qt.JsxOpeningLikeElem | qt.JsxClosingElem): qt.Symbol {
      const links = this.nodeLinks(n);
      if (!links.resolvedSymbol) {
        const intrinsicElemsType = this.jsxType(JsxNames.IntrinsicElems, n);
        if (intrinsicElemsType !== errorType) {
          if (!n.tagName.kind === Syntax.Identifier) return qu.fail();
          const intrinsicProp = this.propertyOfType(intrinsicElemsType, n.tagName.escapedText);
          if (intrinsicProp) {
            links.jsxFlags |= JsxFlags.IntrinsicNamedElem;
            return (links.resolvedSymbol = intrinsicProp);
          }
          const indexSignatureType = this.indexTypeOfType(intrinsicElemsType, qt.IndexKind.String);
          if (indexSignatureType) {
            links.jsxFlags |= JsxFlags.IntrinsicIndexedElem;
            return (links.resolvedSymbol = intrinsicElemsType.symbol);
          }
          error(n, qd.msgs.Property_0_does_not_exist_on_type_1, idText(n.tagName), 'JSX.' + JsxNames.IntrinsicElems);
          return (links.resolvedSymbol = unknownSymbol);
        } else {
          if (noImplicitAny) error(n, qd.msgs.JSX_elem_implicitly_has_type_any_because_no_interface_JSX_0_exists, qy.get.unescUnderscores(JsxNames.IntrinsicElems));
          return (links.resolvedSymbol = unknownSymbol);
        }
      }
      return links.resolvedSymbol;
    }
    jsxNamespaceAt(location: Node | undefined): qt.Symbol {
      const links = location && this.nodeLinks(location);
      if (links && links.jsxNamespace) return links.jsxNamespace;
      if (!links || links.jsxNamespace !== false) {
        const namespaceName = this.jsxNamespace(location);
        const resolvedNamespace = resolveName(location, namespaceName, SymbolFlags.Namespace, undefined, namespaceName, false);
        if (resolvedNamespace) {
          const s = this.symbol(resolvedNamespace.resolveSymbol().this.exportsOfSymbol(), JsxNames.JSX, SymbolFlags.Namespace);
          const candidate = resolveSymbol(s);
          if (candidate) {
            if (links) links.jsxNamespace = candidate;
            return candidate;
          }
          if (links) links.jsxNamespace = false;
        }
      }
      return this.globalSymbol(JsxNames.JSX, SymbolFlags.Namespace, undefined)!;
    }
    nameFromJsxElemAttributesContainer(nameOfAttribPropContainer: qu.__String, jsxNamespace: qt.Symbol): qu.__String | undefined {
      const jsxElemAttribPropInterfaceSym = jsxNamespace && this.symbol(jsxNamespace.exports!, nameOfAttribPropContainer, SymbolFlags.Type);
      const jsxElemAttribPropInterfaceType = jsxElemAttribPropInterfaceSym && this.declaredTypeOfSymbol(jsxElemAttribPropInterfaceSym);
      const propertiesOfJsxElemAttribPropInterface = jsxElemAttribPropInterfaceType && this.propertiesOfType(jsxElemAttribPropInterfaceType);
      if (propertiesOfJsxElemAttribPropInterface) {
        if (propertiesOfJsxElemAttribPropInterface.length === 0) return '' as qu.__String;
        else if (propertiesOfJsxElemAttribPropInterface.length === 1) return propertiesOfJsxElemAttribPropInterface[0].escName;
        else if (propertiesOfJsxElemAttribPropInterface.length > 1) {
          error(jsxElemAttribPropInterfaceSym!.declarations[0], qd.msgs.The_global_type_JSX_0_may_not_have_more_than_one_property, qy.get.unescUnderscores(nameOfAttribPropContainer));
        }
      }
      return;
    }
    jsxLibraryManagedAttributes(jsxNamespace: qt.Symbol) {
      return jsxNamespace && this.symbol(jsxNamespace.exports!, JsxNames.LibraryManagedAttributes, SymbolFlags.Type);
    }
    jsxElemPropertiesName(jsxNamespace: qt.Symbol) {
      return this.nameFromJsxElemAttributesContainer(JsxNames.ElemAttributesPropertyNameContainer, jsxNamespace);
    }
    jsxElemChildrenPropertyName(jsxNamespace: qt.Symbol): qu.__String | undefined {
      return this.nameFromJsxElemAttributesContainer(JsxNames.ElemChildrenAttributeNameContainer, jsxNamespace);
    }
    uninstantiatedJsxSignaturesOfType(elemType: qt.Type, caller: qt.JsxOpeningLikeElem): readonly qt.Signature[] {
      if (elemType.flags & qt.TypeFlags.String) return [anySignature];
      else if (elemType.flags & qt.TypeFlags.StringLiteral) {
        const intrinsicType = this.intrinsicAttributesTypeFromStringLiteralType(elemType as qt.StringLiteralType, caller);
        if (!intrinsicType) {
          error(caller, qd.msgs.Property_0_does_not_exist_on_type_1, (elemType as qt.StringLiteralType).value, 'JSX.' + JsxNames.IntrinsicElems);
          return qu.empty;
        } else {
          const fakeSignature = qf.create.signatureForJSXIntrinsic(caller, intrinsicType);
          return [fakeSignature];
        }
      }
      const apparentElemType = this.apparentType(elemType);
      let signatures = this.signaturesOfType(apparentElemType, qt.SignatureKind.Construct);
      if (signatures.length === 0) signatures = this.signaturesOfType(apparentElemType, qt.SignatureKind.Call);
      if (signatures.length === 0 && apparentElemType.flags & qt.TypeFlags.Union)
        signatures = this.unions(map((apparentElemType as qt.UnionType).types, (t) => this.uninstantiatedJsxSignaturesOfType(t, caller)));
      return signatures;
    }
    intrinsicAttributesTypeFromStringLiteralType(t: qt.StringLiteralType, location: Node): qt.Type | undefined {
      const intrinsicElemsType = this.jsxType(JsxNames.IntrinsicElems, location);
      if (intrinsicElemsType !== errorType) {
        const stringLiteralTypeName = t.value;
        const intrinsicProp = this.propertyOfType(intrinsicElemsType, qy.get.escUnderscores(stringLiteralTypeName));
        if (intrinsicProp) return this.typeOfSymbol(intrinsicProp);
        const indexSignatureType = this.indexTypeOfType(intrinsicElemsType, qt.IndexKind.String);
        if (indexSignatureType) return indexSignatureType;
        return;
      }
      return anyType;
    }
    intrinsicAttributesTypeFromJsxOpeningLikeElem(n: qt.JsxOpeningLikeElem): qt.Type {
      qu.assert(qf.is.jsxIntrinsicIdentifier(n.tagName));
      const links = this.nodeLinks(n);
      if (!links.resolvedJsxElemAttributesType) {
        const symbol = this.intrinsicTagSymbol(n);
        if (links.jsxFlags & JsxFlags.IntrinsicNamedElem) return (links.resolvedJsxElemAttributesType = this.this.typeOfSymbol());
        else if (links.jsxFlags & JsxFlags.IntrinsicIndexedElem) return (links.resolvedJsxElemAttributesType = this.indexTypeOfType(this.declaredTypeOfSymbol(symbol), qt.IndexKind.String)!);
        return (links.resolvedJsxElemAttributesType = errorType);
      }
      return links.resolvedJsxElemAttributesType;
    }
    jsxElemClassTypeAt(location: Node): qt.Type | undefined {
      const type = this.jsxType(JsxNames.ElemClass, location);
      if (type === errorType) return;
      return type;
    }
    jsxElemTypeAt(location: Node): qt.Type {
      return this.jsxType(JsxNames.Elem, location);
    }
    jsxStatelessElemTypeAt(location: Node): qt.Type | undefined {
      const jsxElemType = this.jsxElemTypeAt(location);
      if (jsxElemType) return this.unionType([jsxElemType, nullType]);
    }
    jsxIntrinsicTagNamesAt(location: Node): qt.Symbol[] {
      const intrinsics = this.jsxType(JsxNames.IntrinsicElems, location);
      return intrinsics ? this.propertiesOfType(intrinsics) : qu.empty;
    }
    declarationNodeFlagsFromSymbol(s: qt.Symbol): NodeFlags {
      return s.valueDeclaration ? this.combinedFlagsOf(s.valueDeclaration) : 0;
    }
    thisParamFromNodeContext(n: Node) {
      const thisContainer = this.thisContainer(n, false);
      return thisContainer && qf.is.functionLike(thisContainer) ? this.thisNodeKind(ParamDeclaration, thisContainer) : undefined;
    }
    nonNullableTypeIfNeeded(t: qt.Type) {
      return qf.is.nullableType(t) ? this.nonNullableType(t) : type;
    }
    privateIdentifierPropertyOfType(leftType: qt.Type, lexicallyScopedIdentifier: qt.Symbol): qt.Symbol | undefined {
      return this.propertyOfType(leftType, lexicallyScopedIdentifier.escName);
    }
    flowTypeOfAccessExpression(n: qt.ElemAccessExpression | qt.PropertyAccessExpression | qt.QualifiedName, prop: qt.Symbol | undefined, propType: qt.Type, errorNode: Node) {
      const assignmentKind = this.assignmentTargetKind(n);
      if (
        !qf.is.accessExpression(n) ||
        assignmentKind === qt.AssignmentKind.Definite ||
        (prop && !(prop.flags & (SymbolFlags.Variable | SymbolFlags.Property | SymbolFlags.Accessor)) && !(prop.flags & SymbolFlags.Method && propType.flags & qt.TypeFlags.Union))
      ) {
        return propType;
      }
      if (propType === autoType) return this.flowTypeOfProperty(n, prop);
      let assumeUninitialized = false;
      if (strictNullChecks && strictPropertyInitialization && n.expression.kind === Syntax.ThisKeyword) {
        const declaration = prop && prop.valueDeclaration;
        if (declaration && qf.is.instancePropertyWithoutIniter(declaration)) {
          const flowContainer = this.controlFlowContainer(n);
          if (flowContainer.kind === Syntax.Constructor && flowContainer.parent === declaration.parent && !(declaration.flags & NodeFlags.Ambient)) assumeUninitialized = true;
        }
      } else if (
        strictNullChecks &&
        prop &&
        prop.valueDeclaration &&
        prop.valueDeclaration.kind === Syntax.PropertyAccessExpression &&
        this.assignmentDeclarationPropertyAccessKind(prop.valueDeclaration) &&
        this.controlFlowContainer(n) === this.controlFlowContainer(prop.valueDeclaration)
      ) {
        assumeUninitialized = true;
      }
      const flowType = this.flow.typeOfReference(n, propType, assumeUninitialized ? this.optionalType(propType) : propType);
      if (assumeUninitialized && !(this.falsyFlags(propType) & qt.TypeFlags.Undefined) && this.falsyFlags(flowType) & qt.TypeFlags.Undefined) {
        error(errorNode, qd.msgs.Property_0_is_used_before_being_assigned, prop!.symbolToString());
        return propType;
      }
      return assignmentKind ? this.baseTypeOfLiteralType(flowType) : flowType;
    }
    superClass(classType: qt.InterfaceType): qt.Type | undefined {
      const x = this.baseTypes(classType);
      if (x.length === 0) return;
      return this.intersectionType(x);
    }
    suggestedSymbolForNonexistentProperty(name: qc.Identifier | qc.PrivateIdentifier | string, containingType: qt.Type): qt.Symbol | undefined {
      return this.spellingSuggestionForName(qf.is.string(name) ? name : idText(name), this.propertiesOfType(containingType), SymbolFlags.Value);
    }
    suggestionForNonexistentProperty(name: qc.Identifier | qc.PrivateIdentifier | string, containingType: qt.Type): string | undefined {
      const suggestion = this.suggestedSymbolForNonexistentProperty(name, containingType);
      return suggestion && suggestion.name;
    }
    suggestedSymbolForNonexistentSymbol(location: Node | undefined, outerName: qu.__String, meaning: SymbolFlags): qt.Symbol | undefined {
      qu.assert(outerName !== undefined, 'outername should always be defined');
      const result = resolveNameHelper(location, outerName, meaning, undefined, outerName, false, false, (symbols, name, meaning) => {
        Debug.assertEqual(outerName, name, 'name should equal outerName');
        const symbol = this.symbol(symbols, name, meaning);
        return symbol || this.spellingSuggestionForName(qy.get.unescUnderscores(name), arrayFrom(symbols.values()), meaning);
      });
      return result;
    }
    suggestionForNonexistentSymbol(location: Node | undefined, outerName: qu.__String, meaning: SymbolFlags): string | undefined {
      const symbolResult = this.suggestedSymbolForNonexistentSymbol(location, outerName, meaning);
      return symbolResult && symbolResult.name;
    }
    suggestedSymbolForNonexistentModule(name: qt.Identifier, targetModule: qt.Symbol): qt.Symbol | undefined {
      return targetModule.exports && this.spellingSuggestionForName(idText(name), this.exportsOfModuleAsArray(targetModule), SymbolFlags.ModuleMember);
    }
    suggestionForNonexistentExport(name: qt.Identifier, targetModule: qt.Symbol): string | undefined {
      const suggestion = this.suggestedSymbolForNonexistentModule(name, targetModule);
      return suggestion && suggestion.name;
    }
    suggestionForNonexistentIndexSignature(objectType: qt.Type, expr: qt.ElemAccessExpression, keyedType: qt.Type): string | undefined {
      const hasProp = (name: 'set' | 'get') => {
        const prop = this.propertyOfObjectType(objectType, <__String>name);
        if (prop) {
          const s = this.singleCallSignature(this.typeOfSymbol(prop));
          return !!s && this.minArgCount(s) >= 1 && qf.is.typeAssignableTo(keyedType, this.typeAtPosition(s, 0));
        }
        return false;
      };
      const suggestedMethod = qf.is.assignmentTarget(expr) ? 'set' : 'get';
      if (!hasProp(suggestedMethod)) return;
      let suggestion = this.propertyAccessOrIdentifierToString(expr.expression);
      if (suggestion === undefined) suggestion = suggestedMethod;
      else suggestion += '.' + suggestedMethod;

      return suggestion;
    }
    spellingSuggestionForName(name: string, symbols: qt.Symbol[], meaning: SymbolFlags): qt.Symbol | undefined {
      const candidateName = (candidate: qt.Symbol) => {
        const candidateName = candidate.name;
        if (startsWith(candidateName, '"')) return;
        if (candidate.flags & meaning) return candidateName;
        if (candidate.flags & SymbolFlags.Alias) {
          const alias = candidate.tryResolveAlias();
          if (alias && alias.flags & meaning) return candidateName;
        }
        return;
      };
      return this.spellingSuggestion(name, symbols, candidateName);
    }
    forInVariableSymbol(n: qt.ForInStatement): qt.Symbol | undefined {
      const initer = n.initer;
      if (initer.kind === Syntax.VariableDeclarationList) {
        const variable = (<qt.VariableDeclarationList>initer).declarations[0];
        if (variable && !variable.name.kind === Syntax.BindingPattern) return this.symbolOfNode(variable);
      } else if (initer.kind === Syntax.Identifier) {
        return this.resolvedSymbol(<qt.Identifier>initer);
      }
      return;
    }
    spreadArgIndex(args: readonly qt.Expression[]): number {
      return findIndex(args, isSpreadArg);
    }
    singleCallSignature(t: qt.Type): qt.Signature | undefined {
      return this.singleSignature(t, qt.SignatureKind.Call, false);
    }
    singleCallOrConstructSignature(t: qt.Type): qt.Signature | undefined {
      return this.singleSignature(t, qt.SignatureKind.Call, false);
    }
    singleSignature(t: qt.Type, kind: qt.SignatureKind, allowMembers: boolean): qt.Signature | undefined {
      if (t.flags & qt.TypeFlags.Object) {
        const resolved = resolveStructuredTypeMembers(<qt.ObjectType>type);
        if (allowMembers || (resolved.properties.length === 0 && !resolved.stringIndexInfo && !resolved.numberIndexInfo)) {
          if (kind === qt.SignatureKind.Call && resolved.callSignatures.length === 1 && resolved.constructSignatures.length === 0) return resolved.callSignatures[0];
          if (kind === qt.SignatureKind.Construct && resolved.constructSignatures.length === 1 && resolved.callSignatures.length === 0) return resolved.constructSignatures[0];
        }
      }
      return;
    }
    arrayifiedType(t: qt.Type) {
      return t.flags & qt.TypeFlags.Union
        ? mapType(t, getArrayifiedType)
        : t.flags & (TypeFlags.Any | qt.TypeFlags.Instantiable) || qf.is.mutableArrayOrTuple(t)
        ? type
        : qf.is.tupleType(t)
        ? qf.create.tupleType(this.typeArgs(t), t.target.minLength, t.target.hasRestElem, false, t.target.labeledElemDeclarations)
        : qf.create.arrayType(this.indexedAccessType(t, numberType));
    }
    spreadArgType(args: readonly qt.Expression[], index: number, argCount: number, restType: qt.Type, context: qt.InferenceContext | undefined) {
      if (index >= argCount - 1) {
        const arg = args[argCount - 1];
        if (qf.is.spreadArg(arg)) {
          return arg.kind === Syntax.SyntheticExpression
            ? qf.create.arrayType((<qt.SyntheticExpression>arg).type)
            : this.arrayifiedType(qf.check.expressionWithContextualType((<qt.SpreadElem>arg).expression, restType, context, CheckMode.Normal));
        }
      }
      const types = [];
      const names: (ParamDeclaration | qt.NamedTupleMember)[] = [];
      let spreadIndex = -1;
      for (let i = index; i < argCount; i++) {
        const contextualType = this.indexedAccessType(restType, this.literalType(i - index));
        const argType = qf.check.expressionWithContextualType(args[i], contextualType, context, CheckMode.Normal);
        if (spreadIndex < 0 && qf.is.spreadArg(args[i])) spreadIndex = i - index;
        if (args[i].kind === Syntax.SyntheticExpression && (args[i] as qt.SyntheticExpression).tupleNameSource) names.push((args[i] as qt.SyntheticExpression).tupleNameSource!);
        const hasPrimitiveContextualType = maybeTypeOfKind(contextualType, qt.TypeFlags.Primitive | qt.TypeFlags.Index);
        types.push(hasPrimitiveContextualType ? this.regularTypeOfLiteralType(argType) : this.widenedLiteralType(argType));
      }
      return spreadIndex < 0
        ? qf.create.tupleType(types, undefined, length(names) === length(types) ? names : undefined)
        : qf.create.tupleType(append(types.slice(0, spreadIndex), this.unionType(types.slice(spreadIndex))), spreadIndex, undefined);
    }
    jsxReferenceKind(n: qt.JsxOpeningLikeElem): qt.JsxReferenceKind {
      if (qf.is.jsxIntrinsicIdentifier(n.tagName)) return qt.JsxReferenceKind.Mixed;
      const tagType = this.apparentType(qf.check.expression(n.tagName));
      if (length(this.signaturesOfType(tagType, qt.SignatureKind.Construct))) return qt.JsxReferenceKind.Component;
      if (length(this.signaturesOfType(tagType, qt.SignatureKind.Call))) return qt.JsxReferenceKind.Function;
      return qt.JsxReferenceKind.Mixed;
    }
    signatureApplicabilityError(
      n: qt.CallLikeExpression,
      args: readonly qt.Expression[],
      signature: qt.Signature,
      relation: qu.QMap<RelationComparisonResult>,
      checkMode: CheckMode,
      reportErrors: boolean,
      containingMessageChain: (() => qd.MessageChain | undefined) | undefined
    ): readonly qd.Diagnostic[] | undefined {
      const errorOutputContainer: { errors?: qd.Diagnostic[]; skipLogging?: boolean } = { errors: undefined, skipLogging: true };
      if (qf.is.jsx.openingLikeElem(n)) {
        if (!qf.check.applicableSignatureForJsxOpeningLikeElem(n, signature, relation, checkMode, reportErrors, containingMessageChain, errorOutputContainer)) {
          qu.assert(!reportErrors || !!errorOutputContainer.errors, 'jsx should have errors when reporting errors');
          return errorOutputContainer.errors || qu.empty;
        }
        return;
      }
      const thisType = this.thisTypeOfSignature(signature);
      if (thisType && thisType !== voidType && n.kind !== Syntax.NewExpression) {
        const thisArgNode = this.thisArgOfCall(n);
        let thisArgType: qt.Type;
        if (thisArgNode) {
          thisArgType = qf.check.expression(thisArgNode);
          if (qf.is.optionalChainRoot(thisArgNode.parent)) thisArgType = this.nonNullableType(thisArgType);
          else if (qf.is.optionalChain(thisArgNode.parent)) {
            thisArgType = removeOptionalTypeMarker(thisArgType);
          }
        } else {
          thisArgType = voidType;
        }
        const errorNode = reportErrors ? thisArgNode || n : undefined;
        const headMessage = qd.msgs.The_this_context_of_type_0_is_not_assignable_to_method_s_this_of_type_1;
        if (!qf.check.typeRelatedTo(thisArgType, thisType, relation, errorNode, headMessage, containingMessageChain, errorOutputContainer)) {
          qu.assert(!reportErrors || !!errorOutputContainer.errors, 'this param should have errors when reporting errors');
          return errorOutputContainer.errors || qu.empty;
        }
      }
      const headMessage = qd.msgs.Arg_of_type_0_is_not_assignable_to_param_of_type_1;
      const restType = this.nonArrayRestType(signature);
      const argCount = restType ? Math.min(this.paramCount(signature) - 1, args.length) : args.length;
      for (let i = 0; i < argCount; i++) {
        const arg = args[i];
        if (arg.kind !== Syntax.OmittedExpression) {
          const paramType = this.typeAtPosition(signature, i);
          const argType = qf.check.expressionWithContextualType(arg, paramType, undefined, checkMode);
          const checkArgType = checkMode & CheckMode.SkipContextSensitive ? this.regularTypeOfObjectLiteral(argType) : argType;
          if (!qf.check.typeRelatedToAndOptionallyElaborate(checkArgType, paramType, relation, reportErrors ? arg : undefined, arg, headMessage, containingMessageChain, errorOutputContainer)) {
            qu.assert(!reportErrors || !!errorOutputContainer.errors, 'param should have errors when reporting errors');
            maybeAddMissingAwaitInfo(arg, checkArgType, paramType);
            return errorOutputContainer.errors || qu.empty;
          }
        }
      }
      if (restType) {
        const spreadType = this.spreadArgType(args, argCount, args.length, restType, undefined);
        const errorNode = reportErrors ? (argCount < args.length ? args[argCount] : n) : undefined;
        if (!qf.check.typeRelatedTo(spreadType, restType, relation, errorNode, headMessage, undefined, errorOutputContainer)) {
          qu.assert(!reportErrors || !!errorOutputContainer.errors, 'rest param should have errors when reporting errors');
          maybeAddMissingAwaitInfo(errorNode, spreadType, restType);
          return errorOutputContainer.errors || qu.empty;
        }
      }
      return;
      const maybeAddMissingAwaitInfo = (errorNode: Node | undefined, source: qt.Type, target: qt.Type) => {
        if (errorNode && reportErrors && errorOutputContainer.errors && errorOutputContainer.errors.length) {
          if (this.awaitedTypeOfPromise(target)) return;
          const awaitedTypeOfSource = this.awaitedTypeOfPromise(source);
          if (awaitedTypeOfSource && qf.is.typeRelatedTo(awaitedTypeOfSource, target, relation))
            addRelatedInfo(errorOutputContainer.errors[0], qf.create.diagForNode(errorNode, qd.msgs.Did_you_forget_to_use_await));
        }
      };
    }
    thisArgOfCall(n: qt.CallLikeExpression): qt.LeftExpression | undefined {
      if (n.kind === Syntax.CallExpression) {
        const callee = qf.skip.outerExpressions(n.expression);
        if (qf.is.accessExpression(callee)) return callee.expression;
      }
    }
    effectiveCallArgs(n: qt.CallLikeExpression): readonly qt.Expression[] {
      if (n.kind === Syntax.TaggedTemplateExpression) {
        const template = n.template;
        const args: qt.Expression[] = [qf.create.syntheticExpression(template, this.globalTemplateStringsArrayType())];
        if (template.kind === Syntax.TemplateExpression) {
          forEach(template.templateSpans, (span) => {
            args.push(span.expression);
          });
        }
        return args;
      }
      if (n.kind === Syntax.Decorator) return this.effectiveDecoratorArgs(n);
      if (qf.is.jsx.openingLikeElem(n)) return n.attributes.properties.length > 0 || (n.kind === Syntax.JsxOpeningElem && n.parent?.children.length > 0) ? [n.attributes] : qu.empty;
      const args = n.args || qu.empty;
      const length = args.length;
      if (length && qf.is.spreadArg(args[length - 1]) && this.spreadArgIndex(args) === length - 1) {
        const spreadArg = <qt.SpreadElem>args[length - 1];
        const type = flowLoopCount ? qf.check.expression(spreadArg.expression) : qf.check.expressionCached(spreadArg.expression);
        if (qf.is.tupleType(t)) {
          const typeArgs = this.typeArgs(<qt.TypeReference>type);
          const restIndex = t.target.hasRestElem ? typeArgs.length - 1 : -1;
          const syntheticArgs = map(typeArgs, (t, i) => qf.create.syntheticExpression(spreadArg, t, i === restIndex, t.target.labeledElemDeclarations?.[i]));
          return concatenate(args.slice(0, length - 1), syntheticArgs);
        }
      }
      return args;
    }
    effectiveDecoratorArgs(n: qt.Decorator): readonly qt.Expression[] {
      const parent = n.parent;
      const expr = n.expression;
      switch (parent?.kind) {
        case Syntax.ClassDeclaration:
        case Syntax.ClassExpression:
          return [qf.create.syntheticExpression(expr, this.typeOfSymbol(this.symbolOfNode(parent)))];
        case Syntax.Param:
          const func = <qt.FunctionLikeDeclaration>parent?.parent;
          return [
            qf.create.syntheticExpression(expr, parent?.parent?.kind === Syntax.Constructor ? this.typeOfSymbol(this.symbolOfNode(func)) : errorType),
            qf.create.syntheticExpression(expr, anyType),
            qf.create.syntheticExpression(expr, numberType),
          ];
        case Syntax.PropertyDeclaration:
        case Syntax.MethodDeclaration:
        case Syntax.GetAccessor:
        case Syntax.SetAccessor:
          const hasPropDesc = parent?.kind !== Syntax.PropertyDeclaration;
          return [
            qf.create.syntheticExpression(expr, this.parentTypeOfClassElem(<qt.ClassElem>parent)),
            qf.create.syntheticExpression(expr, this.classElemPropertyKeyType(<qt.ClassElem>parent)),
            qf.create.syntheticExpression(expr, hasPropDesc ? qf.create.typedPropertyDescriptorType(this.typeOfNode(parent)) : anyType),
          ];
      }
      return qu.fail();
    }
    decoratorArgCount(n: qt.Decorator, signature: qt.Signature) {
      switch (n.parent?.kind) {
        case Syntax.ClassDeclaration:
        case Syntax.ClassExpression:
          return 1;
        case Syntax.PropertyDeclaration:
          return 2;
        case Syntax.MethodDeclaration:
        case Syntax.GetAccessor:
        case Syntax.SetAccessor:
          return signature.params.length <= 2 ? 2 : 3;
        case Syntax.Param:
          return 3;
        default:
          return qu.fail();
      }
    }
    diagnosticSpanForCallNode(n: qt.CallExpression, doNotIncludeArgs?: boolean) {
      let start: number;
      let length: number;
      const sourceFile = n.sourceFile;
      if (n.expression.kind === Syntax.PropertyAccessExpression) {
        const nameSpan = this.errorSpanForNode(sourceFile, n.expression.name);
        start = nameSpan.start;
        length = doNotIncludeArgs ? nameSpan.length : n.end - start;
      } else {
        const expressionSpan = this.errorSpanForNode(sourceFile, n.expression);
        start = expressionSpan.start;
        length = doNotIncludeArgs ? expressionSpan.length : n.end - start;
      }
      return { start, length, sourceFile };
    }
    diagForCallNode(n: qt.CallLikeExpression, message: qd.Message, arg0?: string | number, arg1?: string | number, arg2?: string | number, arg3?: string | number): qd.DiagnosticWithLocation {
      if (n.kind === Syntax.CallExpression) {
        const { sourceFile, start, length } = this.diagnosticSpanForCallNode(n);
        return qf.create.fileDiag(sourceFile, start, length, message, arg0, arg1, arg2, arg3);
      }
      return qf.create.diagForNode(n, message, arg0, arg1, arg2, arg3);
    }
    argArityError(n: qt.CallLikeExpression, signatures: readonly qt.Signature[], args: readonly qt.Expression[]) {
      let min = Number.POSITIVE_INFINITY;
      let max = Number.NEGATIVE_INFINITY;
      let belowArgCount = Number.NEGATIVE_INFINITY;
      let aboveArgCount = Number.POSITIVE_INFINITY;
      let argCount = args.length;
      let closestSignature: qt.Signature | undefined;
      for (const sig of signatures) {
        const minCount = this.minArgCount(sig);
        const maxCount = this.paramCount(sig);
        if (minCount < argCount && minCount > belowArgCount) belowArgCount = minCount;
        if (argCount < maxCount && maxCount < aboveArgCount) aboveArgCount = maxCount;
        if (minCount < min) {
          min = minCount;
          closestSignature = sig;
        }
        max = Math.max(max, maxCount);
      }
      const hasRestParam = qu.some(signatures, hasEffectiveRestParam);
      const paramRange = hasRestParam ? min : min < max ? min + '-' + max : min;
      const hasSpreadArg = this.spreadArgIndex(args) > -1;
      if (argCount <= max && hasSpreadArg) argCount--;
      let spanArray: Nodes<Node>;
      let related: qd.DiagnosticWithLocation | undefined;
      const error =
        hasRestParam || hasSpreadArg
          ? hasRestParam && hasSpreadArg
            ? qd.msgs.Expected_at_least_0_args_but_got_1_or_more
            : hasRestParam
            ? qd.msgs.Expected_at_least_0_args_but_got_1
            : qd.msgs.Expected_0_args_but_got_1_or_more
          : qd.msgs.Expected_0_args_but_got_1;
      if (closestSignature && this.minArgCount(closestSignature) > argCount && closestSignature.declaration) {
        const paramDecl = closestSignature.declaration.params[closestSignature.thisParam ? argCount + 1 : argCount];
        if (paramDecl) {
          related = qf.create.diagForNode(
            paramDecl,
            paramDecl.name.kind === Syntax.BindingPattern ? qd.msgs.An_arg_matching_this_binding_pattern_was_not_provided : qd.msgs.An_arg_for_0_was_not_provided,
            !paramDecl.name ? argCount : !paramDecl.name.kind === Syntax.BindingPattern ? idText(this.firstIdentifier(paramDecl.name)) : undefined
          );
        }
      }
      if (min < argCount && argCount < max)
        return this.diagForCallNode(n, qd.msgs.No_overload_expects_0_args_but_overloads_do_exist_that_expect_either_1_or_2_args, argCount, belowArgCount, aboveArgCount);
      if (!hasSpreadArg && argCount < min) {
        const diagnostic = this.diagForCallNode(n, error, paramRange, argCount);
        return related ? addRelatedInfo(diagnostic, related) : diagnostic;
      }
      if (hasRestParam || hasSpreadArg) {
        spanArray = new Nodes(args);
        if (hasSpreadArg && argCount) {
          const nextArg = elemAt(args, this.spreadArgIndex(args) + 1) || undefined;
          spanArray = new Nodes(args.slice(max > argCount && nextArg ? args.indexOf(nextArg) : Math.min(max, args.length - 1)));
        }
      } else {
        spanArray = new Nodes(args.slice(max));
      }
      spanArray.pos = first(spanArray).pos;
      spanArray.end = last(spanArray).end;
      if (spanArray.end === spanArray.pos) spanArray.end++;
      const diagnostic = qf.create.diagForNodes(n.sourceFile, spanArray, error, paramRange, argCount);
      return related ? addRelatedInfo(diagnostic, related) : diagnostic;
    }
    typeArgArityError(n: Node, signatures: readonly qt.Signature[], typeArgs: Nodes<qt.Typing>) {
      const argCount = typeArgs.length;
      if (signatures.length === 1) {
        const sig = signatures[0];
        const min = this.minTypeArgCount(sig.typeParams);
        const max = length(sig.typeParams);
        return qf.create.diagForNodes(n.sourceFile, typeArgs, qd.msgs.Expected_0_type_args_but_got_1, min < max ? min + '-' + max : min, argCount);
      }
      let belowArgCount = -Infinity;
      let aboveArgCount = Infinity;
      for (const sig of signatures) {
        const min = this.minTypeArgCount(sig.typeParams);
        const max = length(sig.typeParams);
        if (min > argCount) aboveArgCount = Math.min(aboveArgCount, min);
        else if (max < argCount) {
          belowArgCount = Math.max(belowArgCount, max);
        }
      }
      if (belowArgCount !== -Infinity && aboveArgCount !== Infinity) {
        return qf.create.diagForNodes(
          n.sourceFile,
          typeArgs,
          qd.msgs.No_overload_expects_0_type_args_but_overloads_do_exist_that_expect_either_1_or_2_type_args,
          argCount,
          belowArgCount,
          aboveArgCount
        );
      }
      return qf.create.diagForNodes(n.sourceFile, typeArgs, qd.msgs.Expected_0_type_args_but_got_1, belowArgCount === -Infinity ? aboveArgCount : belowArgCount, argCount);
    }
    candidateForOverloadFailure(n: qt.CallLikeExpression, candidates: qt.Signature[], args: readonly qt.Expression[], hasCandidatesOutArray: boolean): qt.Signature {
      qu.assert(candidates.length > 0);
      qf.check.nodeDeferred(n);
      return hasCandidatesOutArray || candidates.length === 1 || candidates.some((c) => !!c.typeParams)
        ? pickLongestCandidateSignature(n, candidates, args)
        : qf.create.unionOfSignaturesForOverloadFailure(candidates);
    }
    typeArgsFromNodes(typeArgNodes: readonly qt.Typing[], typeParams: readonly qt.TypeParam[], isJs: boolean): readonly qt.Type[] {
      const typeArgs = typeArgNodes.map(getTypeOfNode);
      while (typeArgs.length > typeParams.length) {
        typeArgs.pop();
      }
      while (typeArgs.length < typeParams.length) {
        typeArgs.push(this.constraintOfTypeParam(typeParams[typeArgs.length]) || this.defaultTypeArgType(isJs));
      }
      return typeArgs;
    }
    longestCandidateIndex(candidates: qt.Signature[], argsCount: number): number {
      let maxParamsIndex = -1;
      let maxParams = -1;
      for (let i = 0; i < candidates.length; i++) {
        const candidate = candidates[i];
        const paramCount = this.paramCount(candidate);
        if (qf.has.effectiveRestParam(candidate) || paramCount >= argsCount) return i;
        if (paramCount > maxParams) {
          maxParams = paramCount;
          maxParamsIndex = i;
        }
      }
      return maxParamsIndex;
    }
    diagnosticHeadMessageForDecoratorResolution(n: qt.Decorator) {
      switch (n.parent?.kind) {
        case Syntax.ClassDeclaration:
        case Syntax.ClassExpression:
          return qd.msgs.Unable_to_resolve_signature_of_class_decorator_when_called_as_an_expression;
        case Syntax.Param:
          return qd.msgs.Unable_to_resolve_signature_of_param_decorator_when_called_as_an_expression;
        case Syntax.PropertyDeclaration:
          return qd.msgs.Unable_to_resolve_signature_of_property_decorator_when_called_as_an_expression;
        case Syntax.MethodDeclaration:
        case Syntax.GetAccessor:
        case Syntax.SetAccessor:
          return qd.msgs.Unable_to_resolve_signature_of_method_decorator_when_called_as_an_expression;
        default:
          return qu.fail();
      }
    }
    resolvedSignature(n: qt.CallLikeExpression, candidatesOutArray?: qt.Signature[] | undefined, checkMode?: CheckMode): qt.Signature {
      const links = this.nodeLinks(n);
      const cached = links.resolvedSignature;
      if (cached && cached !== resolvingSignature && !candidatesOutArray) return cached;
      links.resolvedSignature = resolvingSignature;
      const result = resolveSignature(n, candidatesOutArray, checkMode || CheckMode.Normal);
      if (result !== resolvingSignature) links.resolvedSignature = flowLoopStart === flowLoopCount ? result : cached;
      return result;
    }
    assignedClassSymbol(decl: qt.Declaration): qt.Symbol | undefined {
      const assignmentSymbol =
        decl &&
        decl.parent &&
        ((decl.kind === Syntax.FunctionDeclaration && this.symbolOfNode(decl)) ||
          (decl.parent?.kind === Syntax.BinaryExpression && this.symbolOfNode(decl.parent?.left)) ||
          (decl.parent?.kind === Syntax.VariableDeclaration && this.symbolOfNode(decl.parent)));
      const prototype = assignmentSymbol && assignmentSymbol.exports && assignmentSymbol.exports.get('prototype' as qu.__String);
      const init = prototype && prototype.valueDeclaration && this.assignedJSPrototype(prototype.valueDeclaration);
      return init ? this.symbolOfNode(init) : undefined;
    }
    assignedJSPrototype(n: Node) {
      if (!n.parent) return false;
      let parent: Node = n.parent;
      while (parent && parent?.kind === Syntax.PropertyAccessExpression) {
        parent = parent?.parent;
      }
      if (parent && parent?.kind === Syntax.BinaryExpression && qf.is.prototypeAccess(parent?.left) && parent?.operatorToken.kind === Syntax.EqualsToken) {
        const right = this.initerOfBinaryExpression(parent);
        return right.kind === Syntax.ObjectLiteralExpression && right;
      }
    }
    typeWithSyntheticDefaultImportType(t: qt.Type, symbol: qt.Symbol, originalSymbol: qt.Symbol): qt.Type {
      if (allowSyntheticDefaultImports && type && type !== errorType) {
        const synthType = type as qt.SyntheticDefaultModuleType;
        if (!synthType.syntheticType) {
          const file = qu.find(originalSymbol.declarations, isSourceFile);
          const hasSyntheticDefault = canHaveSyntheticDefault(file, originalSymbol, false);
          if (hasSyntheticDefault) {
            const memberTable = new qc.SymbolTable();
            const newSymbol = new qc.Symbol(SymbolFlags.Alias, InternalSymbol.Default);
            newSymbol.nameType = this.literalType('default');
            newSymbol.target = symbol.resolveSymbol();
            memberTable.set(InternalSymbol.Default, newSymbol);
            const anonymousSymbol = new qc.Symbol(SymbolFlags.TypeLiteral, InternalSymbol.Type);
            const defaultContainingObject = qf.create.anonymousType(anonymousSymbol, memberTable, qu.empty, qu.empty, undefined);
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
    tupleElemLabel(d: qt.ParamDeclaration | qt.NamedTupleMember) {
      qu.assert(d.name.kind === Syntax.Identifier);
      return d.name.escapedText;
    }
    returnTypeFromBody(func: qt.FunctionLikeDeclaration, checkMode?: CheckMode): qt.Type {
      if (!func.body) return errorType;
      const functionFlags = this.functionFlags(func);
      const isAsync = (functionFlags & FunctionFlags.Async) !== 0;
      const isGenerator = (functionFlags & FunctionFlags.Generator) !== 0;
      let returnType: qt.Type | undefined;
      let yieldType: qt.Type | undefined;
      let nextType: qt.Type | undefined;
      let fallbackReturnType: qt.Type = voidType;
      if (func.body.kind !== Syntax.Block) {
        returnType = qf.check.expressionCached(func.body, checkMode && checkMode & ~CheckMode.SkipGenericFunctions);
        if (isAsync) returnType = qf.check.awaitedType(returnType, func, qd.msgs.The_return_type_of_an_async_function_must_either_be_a_valid_promise_or_must_not_contain_a_callable_then_member);
      } else if (isGenerator) {
        const returnTypes = qf.check.andAggregateReturnExpressionTypes(func, checkMode);
        if (!returnTypes) fallbackReturnType = neverType;
        else if (returnTypes.length > 0) returnType = this.unionType(returnTypes, UnionReduction.Subtype);
        const { yieldTypes, nextTypes } = qf.check.andAggregateYieldOperandTypes(func, checkMode);
        yieldType = qu.some(yieldTypes) ? this.unionType(yieldTypes, UnionReduction.Subtype) : undefined;
        nextType = qu.some(nextTypes) ? this.intersectionType(nextTypes) : undefined;
      } else {
        const types = qf.check.andAggregateReturnExpressionTypes(func, checkMode);
        if (!types) return functionFlags & FunctionFlags.Async ? qf.create.promiseReturnType(func, neverType) : neverType;
        if (types.length === 0) return functionFlags & FunctionFlags.Async ? qf.create.promiseReturnType(func, voidType) : voidType;
        returnType = this.unionType(types, UnionReduction.Subtype);
      }
      if (returnType || yieldType || nextType) {
        if (yieldType) reportErrorsFromWidening(func, yieldType, WideningKind.GeneratorYield);
        if (returnType) reportErrorsFromWidening(func, returnType, WideningKind.FunctionReturn);
        if (nextType) reportErrorsFromWidening(func, nextType, WideningKind.GeneratorNext);
        if ((returnType && qf.is.unitType(returnType)) || (yieldType && qf.is.unitType(yieldType)) || (nextType && qf.is.unitType(nextType))) {
          const contextualSignature = this.contextualSignatureForFunctionLikeDeclaration(func);
          const contextualType = !contextualSignature
            ? undefined
            : contextualSignature === this.signatureFromDeclaration(func)
            ? isGenerator
              ? undefined
              : returnType
            : instantiateContextualType(this.returnTypeOfSignature(contextualSignature), func);
          if (isGenerator) {
            yieldType = this.widenedLiteralLikeTypeForContextualIterationTypeIfNeeded(yieldType, contextualType, IterationTypeKind.Yield, isAsync);
            returnType = this.widenedLiteralLikeTypeForContextualIterationTypeIfNeeded(returnType, contextualType, IterationTypeKind.Return, isAsync);
            nextType = this.widenedLiteralLikeTypeForContextualIterationTypeIfNeeded(nextType, contextualType, IterationTypeKind.Next, isAsync);
          } else returnType = this.widenedLiteralLikeTypeForContextualReturnTypeIfNeeded(returnType, contextualType, isAsync);
        }
        if (yieldType) yieldType = this.widenedType(yieldType);
        if (returnType) returnType = this.widenedType(returnType);
        if (nextType) nextType = this.widenedType(nextType);
      }
      if (isGenerator)
        return qf.create.generatorReturnType(yieldType || neverType, returnType || fallbackReturnType, nextType || this.contextualIterationType(IterationTypeKind.Next, func) || unknownType, isAsync);
      return isAsync ? qf.create.promiseType(returnType || fallbackReturnType) : returnType || fallbackReturnType;
    }
    yieldedTypeOfYieldExpression(n: qt.YieldExpression, expressionType: qt.Type, sentType: qt.Type, isAsync: boolean): qt.Type | undefined {
      const errorNode = n.expression || n;
      const yieldedType = n.asteriskToken ? qf.check.iteratedTypeOrElemType(isAsync ? IterationUse.AsyncYieldStar : IterationUse.YieldStar, expressionType, sentType, errorNode) : expressionType;
      return !isAsync
        ? yieldedType
        : this.awaitedType(
            yieldedType,
            errorNode,
            n.asteriskToken
              ? qd.msgs.Type_of_iterated_elems_of_a_yield_Asterisk_operand_must_either_be_a_valid_promise_or_must_not_contain_a_callable_then_member
              : qd.msgs.Type_of_yield_operand_in_an_async_generator_must_either_be_a_valid_promise_or_must_not_contain_a_callable_then_member
          );
    }
    factsFromTypeofSwitch(start: number, end: number, witnesses: string[], hasDefault: boolean): TypeFacts {
      let facts: TypeFacts = TypeFacts.None;
      if (hasDefault) {
        for (let i = end; i < witnesses.length; i++) {
          facts |= typeofNEFacts.get(witnesses[i]) || TypeFacts.TypeofNEHostObject;
        }
        for (let i = start; i < end; i++) {
          facts &= ~(typeofNEFacts.get(witnesses[i]) || 0);
        }
        for (let i = 0; i < start; i++) {
          facts |= typeofNEFacts.get(witnesses[i]) || TypeFacts.TypeofNEHostObject;
        }
      } else {
        for (let i = start; i < end; i++) {
          facts |= typeofEQFacts.get(witnesses[i]) || TypeFacts.TypeofEQHostObject;
        }
        for (let i = 0; i < start; i++) {
          facts &= ~(typeofEQFacts.get(witnesses[i]) || 0);
        }
      }
      return facts;
    }
    unaryResultType(operandType: qt.Type): qt.Type {
      if (maybeTypeOfKind(operandType, qt.TypeFlags.BigIntLike))
        return qf.is.typeAssignableToKind(operandType, qt.TypeFlags.AnyOrUnknown) || maybeTypeOfKind(operandType, qt.TypeFlags.NumberLike) ? numberOrBigIntType : bigintType;
      return numberType;
    }
    baseTypesIfUnrelated(leftType: qt.Type, rightType: qt.Type, isRelated: (left: qt.Type, right: qt.Type) => boolean): [Type, qt.Type] {
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
    contextNode(n: qt.Expression): Node {
      if (n.kind === Syntax.JsxAttributes && !n.parent?.kind === Syntax.JsxSelfClosingElem) return n.parent?.parent;
      return n;
    }
    uniqueTypeParams(context: qt.InferenceContext, typeParams: readonly qt.TypeParam[]): readonly qt.TypeParam[] {
      const result: qt.TypeParam[] = [];
      let oldTypeParams: qt.TypeParam[] | undefined;
      let newTypeParams: qt.TypeParam[] | undefined;
      for (const tp of typeParams) {
        const name = tp.symbol.escName;
        if (qf.has.typeParamByName(context.inferredTypeParams, name) || qf.has.typeParamByName(result, name)) {
          const newName = this.uniqueTypeParamName(concatenate(context.inferredTypeParams, result), name);
          const symbol = new qc.Symbol(SymbolFlags.TypeParam, newName);
          const newTypeParam = qf.create.typeParam(symbol);
          newTypeParam.target = tp;
          oldTypeParams = append(oldTypeParams, tp);
          newTypeParams = append(newTypeParams, newTypeParam);
          result.push(newTypeParam);
        } else {
          result.push(tp);
        }
      }
      if (newTypeParams) {
        const mapper = qf.create.typeMapper(oldTypeParams!, newTypeParams);
        for (const tp of newTypeParams) {
          tp.mapper = mapper;
        }
      }
      return result;
    }
    uniqueTypeParamName(typeParams: readonly qt.TypeParam[], baseName: qu.__String) {
      let len = (<string>baseName).length;
      while (len > 1 && (<string>baseName).charCodeAt(len - 1) >= Codes._0 && (<string>baseName).charCodeAt(len - 1) <= Codes._9) len--;
      const s = (<string>baseName).slice(0, len);
      for (let index = 1; true; index++) {
        const augmentedName = <__String>(s + index);
        if (!qf.has.typeParamByName(typeParams, augmentedName)) return augmentedName;
      }
    }
    returnTypeOfSingleNonGenericCallSignature(funcType: qt.Type) {
      const signature = this.singleCallSignature(funcType);
      if (signature && !signature.typeParams) return this.returnTypeOfSignature(signature);
    }
    returnTypeOfSingleNonGenericSignatureOfCallChain(expr: qt.CallChain) {
      const funcType = qf.check.expression(expr.expression);
      const nonOptionalType = this.optionalExpressionType(funcType, expr.expression);
      const returnType = this.returnTypeOfSingleNonGenericCallSignature(funcType);
      return returnType && propagateOptionalTypeMarker(returnType, expr, nonOptionalType !== funcType);
    }
    typeOfExpression(n: qt.Expression) {
      const quickType = this.quickTypeOfExpression(n);
      if (quickType) return quickType;
      if (n.flags & NodeFlags.TypeCached && flowTypeCache) {
        const cachedType = flowTypeCache[this.nodeId(n)];
        if (cachedType) return cachedType;
      }
      const startInvocationCount = flowInvocationCount;
      const type = qf.check.expression(n);
      if (flowInvocationCount !== startInvocationCount) {
        const cache = flowTypeCache || (flowTypeCache = []);
        cache[this.nodeId(n)] = type;
        n.flags |= NodeFlags.TypeCached;
      }
      return type;
    }
    quickTypeOfExpression(n: qt.Expression) {
      const expr = qf.skip.parentheses(n);
      if (expr.kind === Syntax.CallExpression && expr.expression.kind !== Syntax.SuperKeyword && !qf.is.requireCall(expr, true) && !qf.is.symbolOrSymbolForCall(expr)) {
        const type = qf.is.callChain(expr) ? this.returnTypeOfSingleNonGenericSignatureOfCallChain(expr) : this.returnTypeOfSingleNonGenericCallSignature(qf.check.nonNullExpression(expr.expression));
        if (t) return type;
      } else if (qf.is.assertionExpression(expr) && !qf.is.constTypeReference(expr.type)) {
        return this.typeFromTypeNode((<qt.TypeAssertion>expr).type);
      } else if (n.kind === Syntax.NumericLiteral || n.kind === Syntax.StringLiteral || n.kind === Syntax.TrueKeyword || n.kind === Syntax.FalseKeyword) {
        return qf.check.expression(n);
      }
      return;
    }
    contextFreeTypeOfExpression(n: qt.Expression) {
      const links = this.nodeLinks(n);
      if (links.contextFreeType) return links.contextFreeType;
      const saveContextualType = n.contextualType;
      n.contextualType = anyType;
      try {
        const type = (links.contextFreeType = qf.check.expression(n, CheckMode.SkipContextSensitive));
        return type;
      } finally {
        n.contextualType = saveContextualType;
      }
    }
    typePredicateParent(n: Node): qt.SignatureDeclaration | undefined {
      switch (n.parent?.kind) {
        case Syntax.ArrowFunction:
        case Syntax.CallSignature:
        case Syntax.FunctionDeclaration:
        case Syntax.FunctionExpression:
        case Syntax.FunctionTyping:
        case Syntax.MethodDeclaration:
        case Syntax.MethodSignature:
          const parent = <qt.SignatureDeclaration>n.parent;
          if (n === parent?.type) return parent;
      }
    }
    effectiveTypeArgs(n: qt.TypingReference | qt.ExpressionWithTypings, typeParams: readonly qt.TypeParam[]): qt.Type[] {
      return fillMissingTypeArgs(map(n.typeArgs!, this.typeFromTypeNode), typeParams, this.minTypeArgCount(typeParams), qf.is.inJSFile(n));
    }
    typeParamsForTypeReference(n: qt.TypingReference | qt.ExpressionWithTypings) {
      const type = this.typeFromTypeReference(n);
      if (type !== errorType) {
        const symbol = this.nodeLinks(n).resolvedSymbol;
        if (symbol) {
          return (symbol.flags & SymbolFlags.TypeAlias && s.this.links(symbol).typeParams) || (this.objectFlags(t) & ObjectFlags.Reference ? (<qt.TypeReference>type).target.localTypeParams : undefined);
        }
      }
      return;
    }
    typeArgConstraint(n: qt.Typing): qt.Type | undefined {
      const typeReferenceNode = qu.tryCast(n.parent, isTypeReferenceType);
      if (!typeReferenceNode) return;
      const typeParams = this.typeParamsForTypeReference(typeReferenceNode)!;
      const constraint = this.constraintOfTypeParam(typeParams[typeReferenceNode.typeArgs!.indexOf(n)]);
      return constraint && instantiateType(constraint, qf.create.typeMapper(typeParams, this.effectiveTypeArgs(typeReferenceNode, typeParams)));
    }
    effectiveDeclarationFlags(n: qt.Declaration, flagsToCheck: ModifierFlags): ModifierFlags {
      let flags = this.combinedModifierFlags(n);
      if (n.parent?.kind !== Syntax.InterfaceDeclaration && n.parent?.kind !== Syntax.ClassDeclaration && n.parent?.kind !== Syntax.ClassExpression && n.flags & NodeFlags.Ambient) {
        if (!(flags & ModifierFlags.Ambient) && !(n.parent?.kind === Syntax.ModuleBlock && n.parent?.parent?.kind === Syntax.ModuleDeclaration && qf.is.globalScopeAugmentation(n.parent?.parent)))
          flags |= ModifierFlags.Export;
        flags |= ModifierFlags.Ambient;
      }
      return flags & flagsToCheck;
    }
    awaitedTypeOfPromise(t: qt.Type, errorNode?: Node, diagnosticMessage?: qd.Message, arg0?: string | number): qt.Type | undefined {
      const promisedType = this.promisedTypeOfPromise(t, errorNode);
      return promisedType && this.awaitedType(promisedType, errorNode, diagnosticMessage, arg0);
    }
    promisedTypeOfPromise(t: qt.Type, errorNode?: Node): qt.Type | undefined {
      if (qf.is.typeAny(t)) return;
      const typeAsPromise = <qt.PromiseOrAwaitableType>type;
      if (typeAsPromise.promisedTypeOfPromise) return typeAsPromise.promisedTypeOfPromise;
      if (qf.is.referenceToType(t, this.globalPromiseType(false))) return (typeAsPromise.promisedTypeOfPromise = this.typeArgs(<qt.GenericType>type)[0]);
      const thenFunction = this.typeOfPropertyOfType(t, 'then' as qu.__String)!;
      if (qf.is.typeAny(thenFunction)) return;
      const thenSignatures = thenFunction ? this.signaturesOfType(thenFunction, qt.SignatureKind.Call) : qu.empty;
      if (thenSignatures.length === 0) {
        if (errorNode) error(errorNode, qd.msgs.A_promise_must_have_a_then_method);
        return;
      }
      const onfulfilledParamType = this.typeWithFacts(this.unionType(map(thenSignatures, getTypeOfFirstParamOfSignature)), TypeFacts.NEUndefinedOrNull);
      if (qf.is.typeAny(onfulfilledParamType)) return;
      const onfulfilledParamSignatures = this.signaturesOfType(onfulfilledParamType, qt.SignatureKind.Call);
      if (onfulfilledParamSignatures.length === 0) {
        if (errorNode) error(errorNode, qd.msgs.The_first_param_of_the_then_method_of_a_promise_must_be_a_callback);
        return;
      }
      return (typeAsPromise.promisedTypeOfPromise = this.unionType(map(onfulfilledParamSignatures, getTypeOfFirstParamOfSignature), UnionReduction.Subtype));
    }
    awaitedType(t: qt.Type, errorNode?: Node, diagnosticMessage?: qd.Message, arg0?: string | number): qt.Type | undefined {
      if (qf.is.typeAny(t)) return type;
      const typeAsAwaitable = <qt.PromiseOrAwaitableType>type;
      if (typeAsAwaitable.awaitedTypeOfType) return typeAsAwaitable.awaitedTypeOfType;
      return (typeAsAwaitable.awaitedTypeOfType = mapType(t, errorNode ? (constituentType) => this.awaitedTypeWorker(constituentType, errorNode, diagnosticMessage, arg0) : getAwaitedTypeWorker));
    }
    awaitedTypeWorker(t: qt.Type, errorNode?: Node, diagnosticMessage?: qd.Message, arg0?: string | number): qt.Type | undefined {
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
    entityNameForDecoratorMetadata(n: qt.Typing | undefined): qt.EntityName | undefined {
      if (n) {
        switch (n.kind) {
          case Syntax.IntersectionTyping:
          case Syntax.UnionTyping:
            return this.entityNameForDecoratorMetadataFromTypeList((<qt.UnionOrIntersectionTyping>n).types);
          case Syntax.ConditionalTyping:
            return this.entityNameForDecoratorMetadataFromTypeList([(<qt.ConditionalTyping>n).trueType, (<qt.ConditionalTyping>n).falseType]);
          case Syntax.ParenthesizedTyping:
          case Syntax.NamedTupleMember:
            return this.entityNameForDecoratorMetadata((<qt.ParenthesizedTyping>n).type);
          case Syntax.TypingReference:
            return (<qt.TypingReference>n).typeName;
        }
      }
    }
    entityNameForDecoratorMetadataFromTypeList(types: readonly qt.Typing[]): qt.EntityName | undefined {
      let commonEntityName: qt.EntityName | undefined;
      for (let typeNode of types) {
        while (typeNode.kind === Syntax.ParenthesizedTyping || typeNode.kind === Syntax.NamedTupleMember) {
          typeNode = (typeNode as qt.ParenthesizedTyping | qt.NamedTupleMember).type;
        }
        if (typeNode.kind === Syntax.NeverKeyword) continue;
        if (!strictNullChecks && (typeNode.kind === Syntax.NullKeyword || typeNode.kind === Syntax.UndefinedKeyword)) continue;
        const individualEntityName = this.entityNameForDecoratorMetadata(typeNode);
        if (!individualEntityName) return;
        if (commonEntityName) {
          if (!commonEntityName.kind === Syntax.Identifier || !individualEntityName.kind === Syntax.Identifier || commonEntityName.escapedText !== individualEntityName.escapedText) return;
        } else {
          commonEntityName = individualEntityName;
        }
      }
      return commonEntityName;
    }
    paramTypeNodeForDecoratorCheck(n: qt.ParamDeclaration): qt.Typing | undefined {
      const typeNode = this.effectiveTypeAnnotationNode(n);
      return qf.is.restParam(n) ? this.restParamElemType(typeNode) : typeNode;
    }
    identifierFromEntityNameExpression(n: qc.Identifier | qt.PropertyAccessExpression): qc.Identifier | qc.PrivateIdentifier;
    identifierFromEntityNameExpression(n: qt.Expression): qc.Identifier | qc.PrivateIdentifier | undefined;
    identifierFromEntityNameExpression(n: qt.Expression): qc.Identifier | qc.PrivateIdentifier | undefined {
      switch (n.kind) {
        case Syntax.Identifier:
          return n as qt.Identifier;
        case Syntax.PropertyAccessExpression:
          return (n as qt.PropertyAccessExpression).name;
        default:
          return;
      }
    }
    iteratedTypeOrElemType(use: IterationUse, inputType: qt.Type, sentType: qt.Type, errorNode: Node | undefined, checkAssignability: boolean): qt.Type | undefined {
      const allowAsyncIterables = (use & IterationUse.AllowsAsyncIterablesFlag) !== 0;
      if (inputType === neverType) {
        reportTypeNotIterableError(errorNode!, inputType, allowAsyncIterables);
        return;
      }
      const uplevelIteration = true;
      const downlevelIteration = !uplevelIteration && compilerOpts.downlevelIteration;
      if (uplevelIteration || downlevelIteration || allowAsyncIterables) {
        const iterationTypes = this.iterationTypesOfIterable(inputType, use, uplevelIteration ? errorNode : undefined);
        if (checkAssignability) {
          if (iterationTypes) {
            const diagnostic =
              use & IterationUse.ForOfFlag
                ? qd.msgs.Cannot_iterate_value_because_the_next_method_of_its_iterator_expects_type_1_but_for_of_will_always_send_0
                : use & IterationUse.SpreadFlag
                ? qd.msgs.Cannot_iterate_value_because_the_next_method_of_its_iterator_expects_type_1_but_array_spread_will_always_send_0
                : use & IterationUse.DestructuringFlag
                ? qd.msgs.Cannot_iterate_value_because_the_next_method_of_its_iterator_expects_type_1_but_array_destructuring_will_always_send_0
                : use & IterationUse.YieldStarFlag
                ? qd.msgs.Cannot_delegate_iteration_to_value_because_the_next_method_of_its_iterator_expects_type_1_but_the_containing_generator_will_always_send_0
                : undefined;
            if (diagnostic) qf.check.typeAssignableTo(sentType, iterationTypes.nextType, errorNode, diagnostic);
          }
        }
        if (iterationTypes || uplevelIteration) return iterationTypes && iterationTypes.yieldType;
      }
      let arrayType = inputType;
      let reportedError = false;
      let hasStringConstituent = false;
      if (use & IterationUse.AllowsStringInputFlag) {
        if (arrayType.flags & qt.TypeFlags.Union) {
          const arrayTypes = (<qt.UnionType>inputType).types;
          const filteredTypes = qu.filter(arrayTypes, (t) => !(t.flags & qt.TypeFlags.StringLike));
          if (filteredTypes !== arrayTypes) arrayType = this.unionType(filteredTypes, UnionReduction.Subtype);
        } else if (arrayType.flags & qt.TypeFlags.StringLike) {
          arrayType = neverType;
        }
        hasStringConstituent = arrayType !== inputType;
        if (hasStringConstituent) {
          if (arrayType.flags & qt.TypeFlags.Never) return stringType;
        }
      }
      if (!qf.is.arrayLikeType(arrayType)) {
        if (errorNode && !reportedError) {
          const yieldType = this.iterationTypeOfIterable(use, IterationTypeKind.Yield, inputType, undefined);
          const [defaultDiagnostic, maybeMissingAwait]: [qd.Message, boolean] =
            !(use & IterationUse.AllowsStringInputFlag) || hasStringConstituent
              ? downlevelIteration
                ? [qd.msgs.Type_0_is_not_an_array_type_or_does_not_have_a_Symbol_iterator_method_that_returns_an_iterator, true]
                : yieldType
                ? [qd.msgs.Type_0_is_not_an_array_type_or_a_string_type_Use_compiler_option_downlevelIteration_to_allow_iterating_of_iterators, false]
                : [qd.msgs.Type_0_is_not_an_array_type, true]
              : downlevelIteration
              ? [qd.msgs.Type_0_is_not_an_array_type_or_a_string_type_or_does_not_have_a_Symbol_iterator_method_that_returns_an_iterator, true]
              : yieldType
              ? [qd.msgs.Type_0_is_not_an_array_type_or_a_string_type_Use_compiler_option_downlevelIteration_to_allow_iterating_of_iterators, false]
              : [qd.msgs.Type_0_is_not_an_array_type_or_a_string_type, true];
          errorAndMaybeSuggestAwait(errorNode, maybeMissingAwait && !!this.awaitedTypeOfPromise(arrayType), defaultDiagnostic, typeToString(arrayType));
        }
        return hasStringConstituent ? stringType : undefined;
      }
      const arrayElemType = this.indexTypeOfType(arrayType, qt.IndexKind.Number);
      if (hasStringConstituent && arrayElemType) {
        if (arrayElemType.flags & qt.TypeFlags.StringLike) return stringType;
        return this.unionType([arrayElemType, stringType], UnionReduction.Subtype);
      }
      return arrayElemType;
    }
    iterationTypeOfIterable(use: IterationUse, typeKind: IterationTypeKind, inputType: qt.Type, errorNode: Node | undefined): qt.Type | undefined {
      if (qf.is.typeAny(inputType)) return;
      const iterationTypes = this.iterationTypesOfIterable(inputType, use, errorNode);
      return iterationTypes && iterationTypes[this.iterationTypesKeyFromIterationTypeKind(typeKind)];
    }
    cachedIterationTypes(t: qt.Type, cacheKey: qt.MatchingKeys<qt.IterableOrIteratorType, qt.IterationTypes | undefined>) {
      return (type as qt.IterableOrIteratorType)[cacheKey];
    }
    iterationTypesOfIterable(t: qt.Type, use: IterationUse, errorNode: Node | undefined) {
      if (qf.is.typeAny(t)) return anyIterationTypes;
      if (!(t.flags & qt.TypeFlags.Union)) {
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
          allIterationTypes = append(allIterationTypes, iterationTypes);
        }
      }
      const iterationTypes = allIterationTypes ? combineIterationTypes(allIterationTypes) : noIterationTypes;
      setCachedIterationTypes(t, cacheKey, iterationTypes);
      return iterationTypes === noIterationTypes ? undefined : iterationTypes;
    }
    asyncFromSyncIterationTypes(iterationTypes: qt.IterationTypes, errorNode: Node | undefined) {
      if (iterationTypes === noIterationTypes) return noIterationTypes;
      if (iterationTypes === anyIterationTypes) return anyIterationTypes;
      const { yieldType, returnType, nextType } = iterationTypes;
      return qf.create.iterationTypes(this.awaitedType(yieldType, errorNode) || anyType, this.awaitedType(returnType, errorNode) || anyType, nextType);
    }
    iterationTypesOfIterableWorker(t: qt.Type, use: IterationUse, errorNode: Node | undefined) {
      if (qf.is.typeAny(t)) return anyIterationTypes;
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
    iterationTypesOfIterableCached(t: qt.Type, resolver: IterationTypesResolver) {
      return this.cachedIterationTypes(t, resolver.iterableCacheKey);
    }
    iterationTypesOfGlobalIterableType(globalType: qt.Type, resolver: IterationTypesResolver) {
      const globalIterationTypes = this.iterationTypesOfIterableCached(globalType, resolver) || this.iterationTypesOfIterableSlow(globalType, resolver, undefined);
      return globalIterationTypes === noIterationTypes ? defaultIterationTypes : globalIterationTypes;
    }
    iterationTypesOfIterableFast(t: qt.Type, resolver: IterationTypesResolver) {
      let globalType: qt.Type;
      if (qf.is.referenceToType(t, (globalType = resolver.this.globalIterableType(false))) || qf.is.referenceToType(t, (globalType = resolver.this.globalIterableIteratorType(false)))) {
        const [yieldType] = this.typeArgs(type as qt.GenericType);
        const { returnType, nextType } = this.iterationTypesOfGlobalIterableType(globalType, resolver);
        return setCachedIterationTypes(t, resolver.iterableCacheKey, qf.create.iterationTypes(yieldType, returnType, nextType));
      }
      if (qf.is.referenceToType(t, resolver.this.globalGeneratorType(false))) {
        const [yieldType, returnType, nextType] = this.typeArgs(type as qt.GenericType);
        return setCachedIterationTypes(t, resolver.iterableCacheKey, qf.create.iterationTypes(yieldType, returnType, nextType));
      }
    }
    iterationTypesOfIterableSlow(t: qt.Type, resolver: IterationTypesResolver, errorNode: Node | undefined) {
      const method = this.propertyOfType(t, qu.this.propertyNameForKnownSymbolName(resolver.iteratorSymbolName));
      const methodType = method && !(method.flags & SymbolFlags.Optional) ? this.typeOfSymbol(method) : undefined;
      if (qf.is.typeAny(methodType)) return setCachedIterationTypes(t, resolver.iterableCacheKey, anyIterationTypes);
      const signatures = methodType ? this.signaturesOfType(methodType, qt.SignatureKind.Call) : undefined;
      if (!some(signatures)) return setCachedIterationTypes(t, resolver.iterableCacheKey, noIterationTypes);
      const iteratorType = this.unionType(map(signatures, this.returnTypeOfSignature), UnionReduction.Subtype);
      const iterationTypes = this.iterationTypesOfIterator(iteratorType, resolver, errorNode) ?? noIterationTypes;
      return setCachedIterationTypes(t, resolver.iterableCacheKey, iterationTypes);
    }
    iterationTypesOfIterator(t: qt.Type, resolver: IterationTypesResolver, errorNode: Node | undefined) {
      if (qf.is.typeAny(t)) return anyIterationTypes;
      const iterationTypes = this.iterationTypesOfIteratorCached(t, resolver) || this.iterationTypesOfIteratorFast(t, resolver) || this.iterationTypesOfIteratorSlow(t, resolver, errorNode);
      return iterationTypes === noIterationTypes ? undefined : iterationTypes;
    }
    iterationTypesOfIteratorCached(t: qt.Type, resolver: IterationTypesResolver) {
      return this.cachedIterationTypes(t, resolver.iteratorCacheKey);
    }
    iterationTypesOfIteratorFast(t: qt.Type, resolver: IterationTypesResolver) {
      const globalType = resolver.this.globalIterableIteratorType(false);
      if (qf.is.referenceToType(t, globalType)) {
        const [yieldType] = this.typeArgs(type as qt.GenericType);
        const globalIterationTypes = this.iterationTypesOfIteratorCached(globalType, resolver) || this.iterationTypesOfIteratorSlow(globalType, resolver, undefined);
        const { returnType, nextType } = globalIterationTypes === noIterationTypes ? defaultIterationTypes : globalIterationTypes;
        return setCachedIterationTypes(t, resolver.iteratorCacheKey, qf.create.iterationTypes(yieldType, returnType, nextType));
      }
      if (qf.is.referenceToType(t, resolver.this.globalIteratorType(false)) || qf.is.referenceToType(t, resolver.this.globalGeneratorType(false))) {
        const [yieldType, returnType, nextType] = this.typeArgs(type as qt.GenericType);
        return setCachedIterationTypes(t, resolver.iteratorCacheKey, qf.create.iterationTypes(yieldType, returnType, nextType));
      }
    }
    iterationTypesOfIteratorResult(t: qt.Type) {
      if (qf.is.typeAny(t)) return anyIterationTypes;
      const cachedTypes = this.cachedIterationTypes(t, 'iterationTypesOfIteratorResult');
      if (cachedTypes) return cachedTypes;
      if (qf.is.referenceToType(t, this.globalIteratorYieldResultType(false))) {
        const yieldType = this.typeArgs(type as qt.GenericType)[0];
        return setCachedIterationTypes(t, 'iterationTypesOfIteratorResult', qf.create.iterationTypes(yieldType, undefined));
      }
      if (qf.is.referenceToType(t, this.globalIteratorReturnResultType(false))) {
        const returnType = this.typeArgs(type as qt.GenericType)[0];
        return setCachedIterationTypes(t, 'iterationTypesOfIteratorResult', qf.create.iterationTypes(undefined));
      }
      const yieldIteratorResult = filterType(t, isYieldIteratorResult);
      const yieldType = yieldIteratorResult !== neverType ? this.typeOfPropertyOfType(yieldIteratorResult, 'value' as qu.__String) : undefined;
      const returnIteratorResult = filterType(t, isReturnIteratorResult);
      const returnType = returnIteratorResult !== neverType ? this.typeOfPropertyOfType(returnIteratorResult, 'value' as qu.__String) : undefined;
      if (!yieldType && !returnType) return setCachedIterationTypes(t, 'iterationTypesOfIteratorResult', noIterationTypes);
      return setCachedIterationTypes(t, 'iterationTypesOfIteratorResult', qf.create.iterationTypes(yieldType, returnType || voidType, undefined));
    }
    iterationTypesOfMethod(t: qt.Type, resolver: IterationTypesResolver, methodName: 'next' | 'return' | 'throw', errorNode: Node | undefined): qt.IterationTypes | undefined {
      const method = this.propertyOfType(t, methodName as qu.__String);
      if (!method && methodName !== 'next') return;
      const methodType =
        method && !(methodName === 'next' && method.flags & SymbolFlags.Optional)
          ? methodName === 'next'
            ? this.typeOfSymbol(method)
            : this.typeWithFacts(this.typeOfSymbol(method), TypeFacts.NEUndefinedOrNull)
          : undefined;
      if (qf.is.typeAny(methodType)) return methodName === 'next' ? anyIterationTypes : anyIterationTypesExceptNext;
      const methodSignatures = methodType ? this.signaturesOfType(methodType, qt.SignatureKind.Call) : qu.empty;
      if (methodSignatures.length === 0) {
        if (errorNode) {
          const diagnostic = methodName === 'next' ? resolver.mustHaveANextMethodDiagnostic : resolver.mustBeAMethodDiagnostic;
          error(errorNode, diagnostic, methodName);
        }
        return methodName === 'next' ? anyIterationTypes : undefined;
      }
      let methodParamTypes: qt.Type[] | undefined;
      let methodReturnTypes: qt.Type[] | undefined;
      for (const signature of methodSignatures) {
        if (methodName !== 'throw' && qu.some(signature.params)) methodParamTypes = append(methodParamTypes, this.typeAtPosition(signature, 0));
        methodReturnTypes = append(methodReturnTypes, this.returnTypeOfSignature(signature));
      }
      let returnTypes: qt.Type[] | undefined;
      let nextType: qt.Type | undefined;
      if (methodName !== 'throw') {
        const methodParamType = methodParamTypes ? this.unionType(methodParamTypes) : unknownType;
        if (methodName === 'next') nextType = methodParamType;
        else if (methodName === 'return') {
          const resolvedMethodParamType = resolver.resolveIterationType(methodParamType, errorNode) || anyType;
          returnTypes = append(returnTypes, resolvedMethodParamType);
        }
      }
      let yieldType: qt.Type;
      const methodReturnType = methodReturnTypes ? this.unionType(methodReturnTypes, UnionReduction.Subtype) : neverType;
      const resolvedMethodReturnType = resolver.resolveIterationType(methodReturnType, errorNode) || anyType;
      const iterationTypes = this.iterationTypesOfIteratorResult(resolvedMethodReturnType);
      if (iterationTypes === noIterationTypes) {
        if (errorNode) error(errorNode, resolver.mustHaveAValueDiagnostic, methodName);
        yieldType = anyType;
        returnTypes = append(returnTypes, anyType);
      } else {
        yieldType = iterationTypes.yieldType;
        returnTypes = append(returnTypes, iterationTypes.returnType);
      }
      return qf.create.iterationTypes(yieldType, this.unionType(returnTypes), nextType);
    }
    iterationTypesOfIteratorSlow(t: qt.Type, resolver: IterationTypesResolver, errorNode: Node | undefined) {
      const iterationTypes = combineIterationTypes([
        this.iterationTypesOfMethod(t, resolver, 'next', errorNode),
        this.iterationTypesOfMethod(t, resolver, 'return', errorNode),
        this.iterationTypesOfMethod(t, resolver, 'throw', errorNode),
      ]);
      return setCachedIterationTypes(t, resolver.iteratorCacheKey, iterationTypes);
    }
    iterationTypeOfGeneratorFunctionReturnType(kind: IterationTypeKind, returnType: qt.Type, isAsyncGenerator: boolean): qt.Type | undefined {
      if (qf.is.typeAny(returnType)) return;
      const iterationTypes = this.iterationTypesOfGeneratorFunctionReturnType(returnType, isAsyncGenerator);
      return iterationTypes && iterationTypes[this.iterationTypesKeyFromIterationTypeKind(kind)];
    }
    iterationTypesOfGeneratorFunctionReturnType(t: qt.Type, isAsyncGenerator: boolean) {
      if (qf.is.typeAny(t)) return anyIterationTypes;
      const use = isAsyncGenerator ? IterationUse.AsyncGeneratorReturnType : IterationUse.GeneratorReturnType;
      const resolver = isAsyncGenerator ? asyncIterationTypesResolver : syncIterationTypesResolver;
      return this.iterationTypesOfIterable(t, use, undefined) || this.iterationTypesOfIterator(t, resolver, undefined);
    }
    nonInterhitedProperties(t: qt.InterfaceType, baseTypes: qt.BaseType[], properties: qt.Symbol[]) {
      if (!qu.length(baseTypes)) return properties;
      const seen = qu.qf.create.escapedMap<qt.Symbol>();
      forEach(properties, (p) => {
        seen.set(p.escName, p);
      });
      for (const base of baseTypes) {
        const properties = this.propertiesOfType(this.typeWithThisArg(base, t.thisType));
        for (const prop of properties) {
          const existing = seen.get(prop.escName);
          if (existing && !qf.is.propertyIdenticalTo(existing, prop)) seen.delete(prop.escName);
        }
      }
      return arrayFrom(seen.values());
    }
    firstNonModuleExportsIdentifier(n: qt.EntityNameOrEntityNameExpression): qc.Identifier {
      switch (n.kind) {
        case Syntax.Identifier:
          return n;
        case Syntax.QualifiedName:
          do {
            n = n.left;
          } while (n.kind !== Syntax.Identifier);
          return n;
        case Syntax.PropertyAccessExpression:
          do {
            if (qf.is.moduleExportsAccessExpression(n.expression) && !n.name.kind === Syntax.PrivateIdentifier) return n.name;
            n = n.expression;
          } while (n.kind !== Syntax.Identifier);
          return n;
      }
    }
    typeFromDocVariadicTyping(n: qt.DocVariadicTyping): qt.Type {
      const type = this.typeFromTypeNode(n.type);
      const { parent } = n;
      const paramTag = n.parent?.parent;
      if (n.parent?.kind === Syntax.DocTypingExpression && paramTag.kind === Syntax.DocParamTag) {
        const host = this.hostSignatureFromDoc(paramTag);
        if (host) {
          const lastParamDeclaration = lastOrUndefined(host.params);
          const symbol = this.paramSymbolFromDoc(paramTag);
          if (!lastParamDeclaration || (symbol && lastParamDeclaration.symbol === symbol && qf.is.restParam(lastParamDeclaration))) return qf.create.arrayType(t);
        }
      }
      if (parent?.kind === Syntax.ParamDeclaration && parent?.parent?.kind === Syntax.DocFunctionTyping) return qf.create.arrayType(t);
      return addOptionality(t);
    }
    potentiallyUnusedIdentifiers(sourceFile: qt.SourceFile): readonly PotentiallyUnusedIdentifier[] {
      return allPotentiallyUnusedIdentifiers.get(sourceFile.path) || qu.empty;
    }
    diagnostics(sourceFile: qt.SourceFile, ct: qt.CancellationToken): qd.Diagnostic[] {
      try {
        cancellationToken = ct;
        return this.diagnosticsWorker(sourceFile);
      } finally {
        cancellationToken = undefined;
      }
    }
    diagnosticsWorker(sourceFile: qt.SourceFile): qd.Diagnostic[] {
      throwIfNonDiagnosticsProducing();
      if (sourceFile) {
        const previousGlobalDiagnostics = diagnostics.this.globalDiagnostics();
        const previousGlobalDiagnosticsSize = previousGlobalqd.msgs.length;
        qf.check.sourceFile(sourceFile);
        const semanticDiagnostics = diagnostics.this.diagnostics(sourceFile.fileName);
        const currentGlobalDiagnostics = diagnostics.this.globalDiagnostics();
        if (currentGlobalDiagnostics !== previousGlobalDiagnostics) {
          const deferredGlobalDiagnostics = relativeComplement(previousGlobalDiagnostics, currentGlobalDiagnostics, compareDiagnostics);
          return concatenate(deferredGlobalDiagnostics, semanticDiagnostics);
        } else if (previousGlobalDiagnosticsSize === 0 && currentGlobalqd.msgs.length > 0) {
          return concatenate(currentGlobalDiagnostics, semanticDiagnostics);
        }
        return semanticDiagnostics;
      }
      forEach(host.this.sourceFiles(), checkSourceFile);
      return diagnostics.this.diagnostics();
    }
    globalDiagnostics(): qd.Diagnostic[] {
      throwIfNonDiagnosticsProducing();
      return diagnostics.this.globalDiagnostics();
    }
    symbolsInScope(n: Node, f: SymbolFlags): qt.Symbol[] {
      if (n.flags & NodeFlags.InWithStatement) return [];
      const ss = new qc.SymbolTable();
      let isStatic = false;
      const populate = () => {
        while (n) {
          if (n.locals && !qf.is.globalSourceFile(n)) n.locals.copy(ss, f);
          switch (n.kind) {
            case Syntax.SourceFile:
              if (!qf.is.externalOrCommonJsModule(n)) break;
            case Syntax.ModuleDeclaration:
              this.symbolOfNode(n as qt.ModuleDeclaration | qt.SourceFile).exports!.copy(ss, f & SymbolFlags.ModuleMember);
              break;
            case Syntax.EnumDeclaration:
              this.symbolOfNode(n as qt.EnumDeclaration).exports!.copy(ss, f & SymbolFlags.EnumMember);
              break;
            case Syntax.ClassExpression:
              if (n.name) n.symbol.copy(ss, f);
            case Syntax.ClassDeclaration:
            case Syntax.InterfaceDeclaration:
              if (!isStatic) this.membersOfSymbol(this.symbolOfNode(n)).copy(ss, f & SymbolFlags.Type);
              break;
            case Syntax.FunctionExpression:
              if (n.name) n.symbol.copy(ss, f);
              break;
          }
          if (introducesArgsExoticObject(n)) argsSymbol.copy(ss, f);
          isStatic = qf.has.syntacticModifier(n, ModifierFlags.Static);
          n = n.parent;
        }
        globals.copy(ss, f);
      };
      populate();
      ss.delete(InternalSymbol.This);
      return ss.toArray();
    }
    leftSideOfImportEqualsOrExportAssignment(n: qt.EntityName): qt.ImportEqualsDeclaration | qt.ExportAssignment | undefined {
      while (n.parent?.kind === Syntax.QualifiedName) {
        n = n.parent;
      }
      if (n.parent?.kind === Syntax.ImportEqualsDeclaration) return n.parent?.moduleReference === n ? n.parent : undefined;
      if (n.parent?.kind === Syntax.ExportAssignment) return n.parent.expression === n ? n.parent : undefined;
      return;
    }
    specialPropertyAssignmentSymbolFromEntityName(n: qt.EntityName | qt.PropertyAccessExpression) {
      const k = this.assignmentDeclarationKind(n.parent?.parent as qt.BinaryExpression);
      switch (k) {
        case qt.AssignmentDeclarationKind.ExportsProperty:
        case qt.AssignmentDeclarationKind.PrototypeProperty:
          return this.symbolOfNode(n.parent);
        case qt.AssignmentDeclarationKind.ThisProperty:
        case qt.AssignmentDeclarationKind.ModuleExports:
        case qt.AssignmentDeclarationKind.Property:
          return this.symbolOfNode(n.parent?.parent);
      }
      return;
    }
    symbolOfNameOrPropertyAccessExpression(name: qt.EntityName | qc.PrivateIdentifier | qt.PropertyAccessExpression): qt.Symbol | undefined {
      if (qf.is.declarationName(name)) return this.symbolOfNode(name.parent);
      if (qf.is.inJSFile(name) && name.parent?.kind === Syntax.PropertyAccessExpression && name.parent === (name.parent?.parent as qt.BinaryExpression).left) {
        if (!name.kind === Syntax.PrivateIdentifier) {
          const specialPropertyAssignmentSymbol = this.specialPropertyAssignmentSymbolFromEntityName(name);
          if (specialPropertyAssignmentSymbol) return specialPropertyAssignmentSymbol;
        }
      }
      if (name.parent?.kind === Syntax.ExportAssignment && qf.is.entityNameExpression(name)) {
        const success = resolveEntityName(name, SymbolFlags.Value | SymbolFlags.Type | SymbolFlags.Namespace | SymbolFlags.Alias, true);
        if (success && success !== unknownSymbol) return success;
      } else if (!name.kind === Syntax.PropertyAccessExpression && !name.kind === Syntax.PrivateIdentifier && qf.is.inRightSideOfImportOrExportAssignment(name)) {
        const importEqualsDeclaration = this.ancestor(name, Syntax.ImportEqualsDeclaration);
        qu.assert(importEqualsDeclaration !== undefined);
        return this.symbolOfPartOfRightHandSideOfImportEquals(name, true);
      }
      if (!name.kind === Syntax.PropertyAccessExpression && !name.kind === Syntax.PrivateIdentifier) {
        const possibleImportNode = qf.is.importTypeQualifierPart(name);
        if (possibleImportNode) {
          this.typeFromTypeNode(possibleImportNode);
          const sym = this.nodeLinks(name).resolvedSymbol;
          return sym === unknownSymbol ? undefined : sym;
        }
      }
      while (qf.is.rightSideOfQualifiedNameOrPropertyAccess(name)) {
        name = <qt.QualifiedName | qt.PropertyAccessEntityNameExpression>name.parent;
      }
      if (qf.is.heritageClauseElemIdentifier(name)) {
        let meaning = SymbolFlags.None;
        if (name.parent?.kind === Syntax.ExpressionWithTypings) {
          meaning = SymbolFlags.Type;
          if (qf.is.expressionWithTypeArgsInClassExtendsClause(name.parent)) meaning |= SymbolFlags.Value;
        } else {
          meaning = SymbolFlags.Namespace;
        }
        meaning |= SymbolFlags.Alias;
        const entityNameSymbol = qf.is.entityNameExpression(name) ? resolveEntityName(name, meaning) : undefined;
        if (entityNameSymbol) return entityNameSymbol;
      }
      if (name.parent?.kind === Syntax.DocParamTag) return this.paramSymbolFromDoc(name.parent as qt.DocParamTag);
      if (name.parent?.kind === Syntax.TypeParam && name.parent?.parent?.kind === Syntax.DocTemplateTag) {
        qu.assert(!qf.is.inJSFile(name));
        const typeParam = this.typeParamFromDoc(name.parent as qt.TypeParamDeclaration & { parent: qt.DocTemplateTag });
        return typeParam && typeParam.symbol;
      }
      if (qf.is.expressionNode(name)) {
        if (qf.is.missing(name)) return;
        if (name.kind === Syntax.Identifier) {
          if (qf.is.jsx.tagName(name) && qf.is.jsxIntrinsicIdentifier(name)) {
            const symbol = this.intrinsicTagSymbol(<qt.JsxOpeningLikeElem>name.parent);
            return symbol === unknownSymbol ? undefined : symbol;
          }
          return resolveEntityName(name, SymbolFlags.Value, false, true);
        } else if (name.kind === Syntax.PropertyAccessExpression || name.kind === Syntax.QualifiedName) {
          const links = this.nodeLinks(name);
          if (links.resolvedSymbol) return links.resolvedSymbol;
          if (name.kind === Syntax.PropertyAccessExpression) qf.check.propertyAccessExpression(name);
          else {
            qf.check.qualifiedName(name);
          }
          return links.resolvedSymbol;
        }
      } else if (qf.is.typeReferenceIdentifier(<qt.EntityName>name)) {
        const meaning = name.parent?.kind === Syntax.TypingReference ? SymbolFlags.Type : SymbolFlags.Namespace;
        return resolveEntityName(<qt.EntityName>name, meaning, false, true);
      }
      if (name.parent?.kind === Syntax.TypingPredicate) return resolveEntityName(<qt.Identifier>name, SymbolFlags.FunctionScopedVariable);
      return;
    }
    symbolAtLocation(n: Node, ignoreErrors?: boolean): qt.Symbol | undefined {
      if (n.kind === Syntax.SourceFile) return qf.is.externalModule(<qt.SourceFile>n) ? this.mergedSymbol(n.symbol) : undefined;
      const { parent } = n;
      const grandParent = parent?.parent;
      if (n.flags & NodeFlags.InWithStatement) return;
      if (qf.is.declarationNameOrImportPropertyName(n)) {
        const parentSymbol = this.symbolOfNode(parent)!;
        return qf.is.importOrExportSpecifier(n.parent) && n.parent?.propertyName === n ? this.immediateAliasedSymbol(parentSymbol) : parentSymbol;
      } else if (qf.is.literalComputedPropertyDeclarationName(n)) {
        return this.symbolOfNode(parent?.parent);
      }
      if (n.kind === Syntax.Identifier) {
        if (qf.is.inRightSideOfImportOrExportAssignment(<qt.Identifier>n)) return this.symbolOfNameOrPropertyAccessExpression(<qt.Identifier>n);
        else if (parent?.kind === Syntax.BindingElem && grandParent.kind === Syntax.ObjectBindingPattern && n === (<qt.BindingElem>parent).propertyName) {
          const typeOfPattern = this.typeOfNode(grandParent);
          const propertyDeclaration = this.propertyOfType(typeOfPattern, (<qt.Identifier>n).escapedText);
          if (propertyDeclaration) return propertyDeclaration;
        }
      }
      switch (n.kind) {
        case Syntax.Identifier:
        case Syntax.PrivateIdentifier:
        case Syntax.PropertyAccessExpression:
        case Syntax.QualifiedName:
          return this.symbolOfNameOrPropertyAccessExpression(<qt.EntityName | qc.PrivateIdentifier | qt.PropertyAccessExpression>n);
        case Syntax.ThisKeyword:
          const container = this.thisContainer(n, false);
          if (qf.is.functionLike(container)) {
            const sig = this.signatureFromDeclaration(container);
            if (sig.thisParam) return sig.thisParam;
          }
          if (qf.is.inExpressionContext(n)) return qf.check.expression(n as qt.Expression).symbol;
        case Syntax.ThisTyping:
          return this.typeFromThisNodeTypeNode(n as qt.ThisExpression | qt.ThisTyping).symbol;
        case Syntax.SuperKeyword:
          return qf.check.expression(n as qt.Expression).symbol;
        case Syntax.ConstructorKeyword:
          const constructorDeclaration = n.parent;
          if (constructorDeclaration && constructorDeclaration.kind === Syntax.Constructor) return (<qt.ClassDeclaration>constructorDeclaration.parent).symbol;
          return;
        case Syntax.StringLiteral:
        case Syntax.NoSubstitutionLiteral:
          if (
            (qf.is.externalModuleImportEqualsDeclaration(n.parent?.parent) && this.externalModuleImportEqualsDeclarationExpression(n.parent?.parent) === n) ||
            ((n.parent?.kind === Syntax.ImportDeclaration || n.parent?.kind === Syntax.ExportDeclaration) && (<qt.ImportDeclaration>n.parent).moduleSpecifier === n) ||
            (qf.is.inJSFile(n) && qf.is.requireCall(n.parent, false)) ||
            qf.is.importCall(n.parent) ||
            (n.parent?.kind === Syntax.LiteralTyping && qf.is.literalImportTyping(n.parent?.parent) && n.parent?.parent?.arg === n.parent)
          ) {
            return resolveExternalModuleName(n, <qt.LiteralExpression>n, ignoreErrors);
          }
          if (parent?.kind === Syntax.CallExpression && qf.is.bindableObjectDefinePropertyCall(parent) && parent?.args[1] === n) return this.symbolOfNode(parent);
        case Syntax.NumericLiteral:
          const objectType =
            parent?.kind === Syntax.ElemAccessExpression
              ? parent?.argExpression === n
                ? this.typeOfExpression(parent?.expression)
                : undefined
              : parent?.kind === Syntax.LiteralTyping && grandParent.kind === Syntax.IndexedAccessTyping
              ? this.typeFromTypeNode(grandParent.objectType)
              : undefined;
          return objectType && this.propertyOfType(objectType, qy.get.escUnderscores((n as qt.StringLiteral | qt.NumericLiteral).text));
        case Syntax.DefaultKeyword:
        case Syntax.FunctionKeyword:
        case Syntax.EqualsGreaterThanToken:
        case Syntax.ClassKeyword:
          return this.symbolOfNode(n.parent);
        case Syntax.ImportTyping:
          return qf.is.literalImportTyping(n) ? this.symbolAtLocation(n.arg.literal, ignoreErrors) : undefined;
        case Syntax.ExportKeyword:
          return n.parent?.kind === Syntax.ExportAssignment ? Debug.qf.check.defined(n.parent?.symbol) : undefined;
        default:
          return;
      }
    }
    shorthandAssignmentValueSymbol(n: Node): qt.Symbol | undefined {
      if (n && n.kind === Syntax.ShorthandPropertyAssignment) return resolveEntityName(n.name, SymbolFlags.Value | SymbolFlags.Alias);
      return;
    }
    exportSpecifierLocalTargetSymbol(n: qt.ExportSpecifier): qt.Symbol | undefined {
      return n.parent?.parent?.moduleSpecifier
        ? this.externalModuleMember(n.parent?.parent, n)
        : resolveEntityName(n.propertyName || n.name, SymbolFlags.Value | SymbolFlags.Type | SymbolFlags.Namespace | SymbolFlags.Alias);
    }
    typeOfNode(n: Node): qt.Type {
      if (n.flags & NodeFlags.InWithStatement) return errorType;
      const classDecl = tryGetClassImplementingOrExtendingExpressionWithTypings(n);
      const classType = classDecl && this.declaredTypeOfClassOrInterface(this.symbolOfNode(classDecl.class));
      if (qf.is.partOfTypeNode(n)) {
        const typeFromTypeNode = this.typeFromTypeNode(<qt.Typing>n);
        return classType ? this.typeWithThisArg(typeFromTypeNode, classType.thisType) : typeFromTypeNode;
      }
      if (qf.is.expressionNode(n)) return this.regularTypeOfExpression(n);
      if (classType && !classDecl!.isImplements) {
        const baseType = firstOrUndefined(this.baseTypes(classType));
        return baseType ? this.typeWithThisArg(baseType, classType.thisType) : errorType;
      }
      if (qf.is.typeDeclaration(n)) {
        const s = this.symbolOfNode(n);
        return this.declaredTypeOfSymbol(s);
      }
      if (qf.is.typeDeclarationName(n)) {
        const s = this.symbolAtLocation(n);
        return s ? this.declaredTypeOfSymbol(s) : errorType;
      }
      if (qf.is.declaration(n)) {
        const s = this.symbolOfNode(n);
        return this.this.typeOfSymbol();
      }
      if (qf.is.declarationNameOrImportPropertyName(n)) {
        const s = this.symbolAtLocation(n);
        if (s) return this.this.typeOfSymbol();
        return errorType;
      }
      if (n.kind === Syntax.BindingPattern) return this.typeForVariableLikeDeclaration(n.parent, true) || errorType;
      if (qf.is.inRightSideOfImportOrExportAssignment(n)) {
        const s = this.symbolAtLocation(n);
        if (s) {
          const t = this.declaredTypeOfSymbol(s);
          return t !== errorType ? t : this.this.typeOfSymbol();
        }
      }
      return errorType;
    }
    typeOfAssignmentPattern(e: qt.AssignmentPattern): qt.Type | undefined {
      qu.assert(e.kind === Syntax.ObjectLiteralExpression || e.kind === Syntax.ArrayLiteralExpression);
      if (e.parent?.kind === Syntax.ForOfStatement) {
        const t = qf.check.rightHandSideOfForOf(e.parent);
        return qf.check.destructuringAssignment(e, t || errorType);
      }
      if (e.parent?.kind === Syntax.BinaryExpression) {
        const t = this.typeOfExpression(e.parent?.right);
        return qf.check.destructuringAssignment(e, t || errorType);
      }
      if (e.parent?.kind === Syntax.PropertyAssignment) {
        const n = cast(e.parent?.parent, isObjectLiteralExpression);
        const t = this.typeOfAssignmentPattern(n) || errorType;
        const i = e.parent.indexIn(n.properties);
        return qf.check.objectLiteralDestructuringPropertyAssignment(n, t, i);
      }
      const n = cast(e.parent, isArrayLiteralExpression);
      const t = this.typeOfAssignmentPattern(n) || errorType;
      const elemType = qf.check.iteratedTypeOrElemType(IterationUse.Destructuring, t, undefinedType, e.parent) || errorType;
      return qf.check.arrayLiteralDestructuringElemAssignment(n, t, n.elems.indexOf(e), elemType);
    }
    propertySymbolOfDestructuringAssignment(n: qt.Identifier) {
      const t = this.typeOfAssignmentPattern(cast(n.parent?.parent, isAssignmentPattern));
      return t && this.propertyOfType(t, n.escapedText);
    }
    regularTypeOfExpression(e: qt.Expression): qt.Type {
      if (qf.is.rightSideOfQualifiedNameOrPropertyAccess(e)) e = e.parent;
      return this.regularTypeOfLiteralType(this.typeOfExpression(e));
    }
    parentTypeOfClassElem(n: qt.ClassElem) {
      const s = this.symbolOfNode(n.parent)!;
      return qf.has.syntacticModifier(n, ModifierFlags.Static) ? this.typeOfSymbol(s) : this.declaredTypeOfSymbol(s);
    }
    classElemPropertyKeyType(e: qt.ClassElem) {
      const n = e.name!;
      switch (n.kind) {
        case Syntax.Identifier:
          return this.literalType(idText(n));
        case Syntax.NumericLiteral:
        case Syntax.StringLiteral:
          return this.literalType(n.text);
        case Syntax.ComputedPropertyName:
          const t = qf.check.computedPropertyName(n);
          return qf.is.typeAssignableToKind(t, qt.TypeFlags.ESSymbolLike) ? t : stringType;
        default:
          return qu.fail('Unsupported property name.');
      }
    }
    augmentedPropertiesOfType(t: qt.Type): qt.Symbol[] {
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
    referencedExportContainer(nIn: qt.Identifier, prefixLocals?: boolean): qt.SourceFile | qt.ModuleDeclaration | qt.EnumDeclaration | undefined {
      const n = this.parseTreeOf(nIn, isIdentifier);
      if (n) {
        let symbol = this.referencedValueSymbol(n, qf.is.nameOfModuleOrEnumDeclaration(n));
        if (symbol) {
          if (symbol.flags & SymbolFlags.ExportValue) {
            const exportSymbol = this.mergedSymbol(symbol.exportSymbol!);
            if (!prefixLocals && exportSymbol.flags & SymbolFlags.ExportHasLocal && !(exportSymbol.flags & SymbolFlags.Variable)) return;
            symbol = exportSymbol;
          }
          const parentSymbol = this.parentOfSymbol(symbol);
          if (parentSymbol) {
            if (parentSymbol.flags & SymbolFlags.ValueModule && parentSymbol.valueDeclaration.kind === Syntax.SourceFile) {
              const symbolFile = <qt.SourceFile>parentSymbol.valueDeclaration;
              const referenceFile = n.sourceFile;
              const symbolIsUmdExport = symbolFile !== referenceFile;
              return symbolIsUmdExport ? undefined : symbolFile;
            }
            return qc.findAncestor(n.parent, (n): n is qt.ModuleDeclaration | qt.EnumDeclaration => qf.is.moduleOrEnumDeclaration(n) && this.symbolOfNode(n) === parentSymbol);
          }
        }
      }
    }
    referencedImportDeclaration(i: qt.Identifier): qt.Declaration | undefined {
      const n = this.parseTreeOf(i, isIdentifier);
      if (n) {
        const s = this.referencedValueSymbol(n);
        if (symbol.qf.is.nonLocalAlias(SymbolFlags.Value) && !this.this.typeOnlyAliasDeclaration()) return symbol.this.declarationOfAliasSymbol();
      }
      return;
    }
    referencedDeclarationWithCollidingName(i: qt.Identifier): qt.Declaration | undefined {
      if (!qf.is.generatedIdentifier(i)) {
        const n = this.parseTreeOf(i, isIdentifier);
        if (n) {
          const s = this.referencedValueSymbol(n);
          if (s && qf.is.symbolOfDeclarationWithCollidingName(s)) return s.valueDeclaration;
        }
      }
      return;
    }
    propertiesOfContainerFunction(n: qt.Declaration): qt.Symbol[] {
      const d = this.parseTreeOf(n, isFunctionDeclaration);
      if (!d) return qu.empty;
      const s = this.symbolOfNode(d);
      return (s && this.propertiesOfType(this.this.typeOfSymbol())) || qu.empty;
    }
    nCheckFlags(n: Node): qt.NodeCheckFlags {
      return this.nodeLinks(n).flags || 0;
    }
    enumMemberValue(n: qt.EnumMember): string | number | undefined {
      computeEnumMemberValues(n.parent);
      return this.nodeLinks(n).enumMemberValue;
    }
    constantValue(n: qt.EnumMember | qt.AccessExpression): string | number | undefined {
      if (n.kind === Syntax.EnumMember) return this.enumMemberValue(n);
      const s = this.nodeLinks(n).resolvedSymbol;
      if (s && s.flags & SymbolFlags.EnumMember) {
        const m = s.valueDeclaration as qt.EnumMember;
        if (qf.is.enumConst(m.parent)) return this.enumMemberValue(m);
      }
      return;
    }
    typeReferenceSerializationKind(typeNameIn: qt.EntityName, location?: Node): qt.TypeReferenceSerializationKind {
      const typeName = this.parseTreeOf(typeNameIn, isEntityName);
      if (!typeName) return qt.TypeReferenceSerializationKind.Unknown;
      if (location) {
        location = this.parseTreeOf(location);
        if (!location) return qt.TypeReferenceSerializationKind.Unknown;
      }
      const valueSymbol = resolveEntityName(typeName, SymbolFlags.Value, true, false, location);
      const typeSymbol = resolveEntityName(typeName, SymbolFlags.Type, true, false, location);
      if (valueSymbol && valueSymbol === typeSymbol) {
        const globalPromiseSymbol = this.globalPromiseConstructorSymbol(false);
        if (globalPromiseSymbol && valueSymbol === globalPromiseSymbol) return qt.TypeReferenceSerializationKind.Promise;
        const constructorType = this.typeOfSymbol(valueSymbol);
        if (constructorType && qf.is.constructorType(constructorType)) return qt.TypeReferenceSerializationKind.TypeWithConstructSignatureAndValue;
      }
      if (!typeSymbol) return qt.TypeReferenceSerializationKind.Unknown;
      const type = this.declaredTypeOfSymbol(typeSymbol);
      if (type === errorType) return qt.TypeReferenceSerializationKind.Unknown;
      if (t.flags & qt.TypeFlags.AnyOrUnknown) return qt.TypeReferenceSerializationKind.ObjectType;
      if (qf.is.typeAssignableToKind(t, qt.TypeFlags.Void | qt.TypeFlags.Nullable | qt.TypeFlags.Never)) return qt.TypeReferenceSerializationKind.VoidNullableOrNeverType;
      if (qf.is.typeAssignableToKind(t, qt.TypeFlags.BooleanLike)) return qt.TypeReferenceSerializationKind.BooleanType;
      if (qf.is.typeAssignableToKind(t, qt.TypeFlags.NumberLike)) return qt.TypeReferenceSerializationKind.NumberLikeType;
      if (qf.is.typeAssignableToKind(t, qt.TypeFlags.BigIntLike)) return qt.TypeReferenceSerializationKind.BigIntLikeType;
      if (qf.is.typeAssignableToKind(t, qt.TypeFlags.StringLike)) return qt.TypeReferenceSerializationKind.StringLikeType;
      if (qf.is.tupleType(t)) return qt.TypeReferenceSerializationKind.ArrayLikeType;
      if (qf.is.typeAssignableToKind(t, qt.TypeFlags.ESSymbolLike)) return qt.TypeReferenceSerializationKind.ESSymbolType;
      if (qf.is.functionType(t)) return qt.TypeReferenceSerializationKind.TypeWithCallSignature;
      if (qf.is.arrayType(t)) return qt.TypeReferenceSerializationKind.ArrayLikeType;
      return qt.TypeReferenceSerializationKind.ObjectType;
    }
    referencedValueSymbol(n: qt.Identifier, startInDeclarationContainer?: boolean): qt.Symbol | undefined {
      const s = this.nodeLinks(n).resolvedSymbol;
      if (s) return s;
      let loc: Node = n;
      if (startInDeclarationContainer) {
        const p = n.parent;
        if (qf.is.declaration(p) && n === p?.name) loc = this.declarationContainer(p);
      }
      return resolveName(loc, n.escapedText, SymbolFlags.Value | SymbolFlags.ExportValue | SymbolFlags.Alias, undefined, undefined, true);
    }
    referencedValueDeclaration(n: qt.Identifier): qt.Declaration | undefined {
      if (!qf.is.generatedIdentifier(n)) {
        const r = this.parseTreeOf(n, isIdentifier);
        if (r) {
          const s = this.referencedValueSymbol(r);
          if (s) return this.exportSymbolOfValueSymbolIfExported(s).valueDeclaration;
        }
      }
      return;
    }
    jsxFactoryEntity(n: Node) {
      return n ? (this.jsxNamespace(n), n.sourceFile.localJsxFactory || _jsxFactoryEntity) : _jsxFactoryEntity;
    }
    externalModuleFileFromDeclaration(d: qt.AnyImportOrReExport | qt.ModuleDeclaration | qt.ImportTyping): qt.SourceFile | undefined {
      const spec = d.kind === Syntax.ModuleDeclaration ? qu.tryCast(d.name, isStringLiteral) : this.externalModuleName(d);
      const s = resolveExternalModuleNameWorker(spec!, spec!, undefined);
      if (!s) return;
      return s.declarationOfKind(Syntax.SourceFile);
    }
    helperName(helper: qt.ExternalEmitHelpers) {
      switch (helper) {
        case qt.ExternalEmitHelpers.Extends:
          return '__extends';
        case qt.ExternalEmitHelpers.Assign:
          return '__assign';
        case qt.ExternalEmitHelpers.Rest:
          return '__rest';
        case qt.ExternalEmitHelpers.Decorate:
          return '__decorate';
        case qt.ExternalEmitHelpers.Metadata:
          return '__metadata';
        case qt.ExternalEmitHelpers.Param:
          return '__param';
        case qt.ExternalEmitHelpers.Awaiter:
          return '__awaiter';
        case qt.ExternalEmitHelpers.Generator:
          return '__generator';
        case qt.ExternalEmitHelpers.Values:
          return '__values';
        case qt.ExternalEmitHelpers.Read:
          return '__read';
        case qt.ExternalEmitHelpers.Spread:
          return '__spread';
        case qt.ExternalEmitHelpers.SpreadArrays:
          return '__spreadArrays';
        case qt.ExternalEmitHelpers.Await:
          return '__await';
        case qt.ExternalEmitHelpers.AsyncGenerator:
          return '__asyncGenerator';
        case qt.ExternalEmitHelpers.AsyncDelegator:
          return '__asyncDelegator';
        case qt.ExternalEmitHelpers.AsyncValues:
          return '__asyncValues';
        case qt.ExternalEmitHelpers.ExportStar:
          return '__exportStar';
        case qt.ExternalEmitHelpers.MakeTemplateObject:
          return '__makeTemplateObject';
        case qt.ExternalEmitHelpers.ClassPrivateFieldGet:
          return '__classPrivateFieldGet';
        case qt.ExternalEmitHelpers.ClassPrivateFieldSet:
          return '__classPrivateFieldSet';
        case qt.ExternalEmitHelpers.CreateBinding:
          return '__createBinding';
        default:
          return qu.fail('Unrecognized helper');
      }
    }
    nonSimpleParams(ps: readonly qt.ParamDeclaration[]): readonly qt.ParamDeclaration[] {
      return qu.filter(ps, (p) => !!p.initer || p.name.kind === Syntax.BindingPattern || qf.is.restParam(p));
    }
    accessorThisNodeKind(ParamDeclaration, d: qt.AccessorDeclaration): qt.ParamDeclaration | undefined {
      if (d.params.length === (d.kind === Syntax.GetAccessor ? 1 : 2)) return this.thisNodeKind(ParamDeclaration, d);
      return;
    }
    ambientModules(): qt.Symbol[] {
      if (!ambientModulesCache) {
        ambientModulesCache = [];
        globals.forEach((global, sym) => {
          if (ambientModuleSymbolRegex.test(sym as string)) ambientModulesCache!.push(global);
        });
      }
      return ambientModulesCache;
    }
  }
  return (qf.get = new Fget());
}
export interface Fget extends ReturnType<typeof newGet> {}
