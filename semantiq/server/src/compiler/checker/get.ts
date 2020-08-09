import * as qc from '../core';
import * as qd from '../diagnostic';
import * as qg from '../debug';
import { ExpandingFlags, ModifierFlags, Node, NodeFlags, ObjectFlags, SymbolFlags, TypeFlags, VarianceFlags } from './type';
import * as qt from './type';
import * as qu from '../util';
import { Syntax } from '../syntax';
import * as qy from '../syntax';
import { Symbol } from './symbol';
import { Fhas, Fis } from './predicate';
import { Fcheck } from './check';
export function newGet(f: qt.Frame) {
  interface Frame extends qt.Frame {
    host: qt.TypeCheckerHost;
    typeCount: number;
    totalInstantiationCount: number;
    mergedSymbols: Symbol[];
    check: Fcheck;
    has: Fhas;
    is: Fis;
  }
  const qf = f as Frame;
  interface Fget extends qc.Fget {}
  class Fget implements qt.CheckerGet {
    links = [] as qt.NodeLinks[];
    get nodeCount() {
      return qu.sum(qf.host.this.sourceFiles(), 'nodeCount');
    }
    get identifierCount() {
      return qu.sum(qf.host.this.sourceFiles(), 'identifierCount');
    }
    get symbolCount() {
      return qu.sum(qf.host.this.sourceFiles(), 'symbolCount') + Symbol.count;
    }
    get typeCount() {
      return qf.typeCount;
    }
    get instantiationCount() {
      return qf.totalInstantiationCount;
    }
    mergedSymbol(s: Symbol): Symbol | undefined {
      let r: Symbol;
      return s.mergeId && (r = qf.mergedSymbols[s.mergeId]) ? r : s;
    }
    nodeLinks(n: Node): qt.NodeLinks {
      const i = this.nodeId(n);
      return this.links[i] || (this.links[i] = { flags: 0 } as qt.NodeLinks);
    }
    resolvedSignatureWorker(nIn: qt.CallLikeExpression, nOut: qt.Signature[] | undefined, argc: number | undefined, c: qt.CheckMode): qt.Signature | undefined {
      const n = this.parseTreeOf(nIn, isCallLikeExpression);
      apparentArgumentCount = argc;
      const res = n ? this.resolvedSignature(n, nOut, c) : undefined;
      apparentArgumentCount = undefined;
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
            file.localJsxFactory = qp_parseIsolatedEntityName(chosenpragma.arguments.factory, languageVersion);
            visitNode(file.localJsxFactory, markAsSynthetic);
            if (file.localJsxFactory) return (file.localJsxNamespace = this.firstIdentifier(file.localJsxFactory).escapedText);
          }
        }
      }
      if (!_jsxNamespace) {
        _jsxNamespace = 'React' as qu.__String;
        if (compilerOptions.jsxFactory) {
          _jsxFactoryEntity = qp_parseIsolatedEntityName(compilerOptions.jsxFactory, languageVersion);
          visitNode(_jsxFactoryEntity, markAsSynthetic);
          if (_jsxFactoryEntity) _jsxNamespace = this.firstIdentifier(_jsxFactoryEntity).escapedText;
        } else if (compilerOptions.reactNamespace) {
          _jsxNamespace = qy.get.escUnderscores(compilerOptions.reactNamespace);
        }
      }
      if (!_jsxFactoryEntity) _jsxFactoryEntity = QualifiedName.create(new Identifier(qy.get.unescUnderscores(_jsxNamespace)), 'createElem');
      return _jsxNamespace;
      const markAsSynthetic = (n: Node): VisitResult<Node> => {
        n.pos = -1;
        n.end = -1;
        return visitEachChild(n, markAsSynthetic, nullTrafoContext);
      };
    }
    emitResolver(s: qt.SourceFile, t: qt.CancellationToken) {
      this.diagnostics(s, t);
      return emitResolver;
    }
    symbolsOfParameterPropertyDeclaration(d: qt.ParameterDeclaration, n: qu.__String): [Symbol, Symbol] {
      const constructorDeclaration = d.parent;
      const classDeclaration = d.parent?.parent;
      const parameterSymbol = this.symbol(constructorDeclaration.locals!, n, SymbolFlags.Value);
      const propertySymbol = this.symbol(this.membersOfSymbol(classDeclaration.symbol), n, SymbolFlags.Value);
      if (parameterSymbol && propertySymbol) return [parameterSymbol, propertySymbol];
      return qu.fail('There should exist two symbols, one as property declaration and one as parameter declaration');
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
    targetOfImportEqualsDeclaration(n: qt.ImportEqualsDeclaration, dontResolveAlias: boolean): Symbol | undefined {
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
    targetOfImportClause(n: qt.ImportClause, dontResolveAlias: boolean): Symbol | undefined {
      const moduleSymbol = resolveExternalModuleName(n, n.parent?.moduleSpecifier);
      if (moduleSymbol) {
        let exportDefaultSymbol: Symbol | undefined;
        if (qf.is.shorthandAmbientModuleSymbol(moduleSymbol)) exportDefaultSymbol = moduleSymbol;
        else {
          exportDefaultSymbol = resolveExportByName(moduleSymbol, InternalSymbol.Default, n, dontResolveAlias);
        }
        const file = qu.find(moduleSymbol.declarations, isSourceFile);
        const hasSyntheticDefault = canHaveSyntheticDefault(file, moduleSymbol, dontResolveAlias);
        if (!exportDefaultSymbol && !hasSyntheticDefault) {
          if (qf.has.exportAssignmentSymbol(moduleSymbol)) {
            const compilerOptionName = moduleKind >= ModuleKind.ES2015 ? 'allowSyntheticDefaultImports' : 'esModuleInterop';
            const exportEqualsSymbol = moduleSymbol.exports!.get(InternalSymbol.ExportEquals);
            const exportAssignment = exportEqualsSymbol!.valueDeclaration;
            const err = error(n.name, qd.msgs.Module_0_can_only_be_default_imported_using_the_1_flag, moduleSymbol.symbolToString(), compilerOptionName);
            addRelatedInfo(
              err,
              qf.create.diagnosticForNode(exportAssignment, qd.msgs.This_module_is_declared_with_using_export_and_can_only_be_used_with_a_default_import_when_using_the_0_flag, compilerOptionName)
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
    targetOfNamespaceImport(n: qt.NamespaceImport, dontResolveAlias: boolean): Symbol | undefined {
      const moduleSpecifier = n.parent?.parent?.moduleSpecifier;
      const immediate = resolveExternalModuleName(n, moduleSpecifier);
      const resolved = resolveESModuleSymbol(immediate, moduleSpecifier, dontResolveAlias, false);
      markSymbolOfAliasDeclarationIfTypeOnly(n, immediate, resolved, false);
      return resolved;
    }
    targetOfNamespaceExport(n: qt.NamespaceExport, dontResolveAlias: boolean): Symbol | undefined {
      const moduleSpecifier = n.parent?.moduleSpecifier;
      const immediate = moduleSpecifier && resolveExternalModuleName(n, moduleSpecifier);
      const resolved = moduleSpecifier && resolveESModuleSymbol(immediate, moduleSpecifier, dontResolveAlias, false);
      markSymbolOfAliasDeclarationIfTypeOnly(n, immediate, resolved, false);
      return resolved;
    }
    externalModuleMember(n: qt.ImportDeclaration | qt.ExportDeclaration, specifier: ImportOrExportSpecifier, dontResolveAlias = false): Symbol | undefined {
      const moduleSymbol = resolveExternalModuleName(n, n.moduleSpecifier!)!;
      const name = specifier.propertyName || specifier.name;
      const suppressInteropError = name.escapedText === InternalSymbol.Default && !!(compilerOptions.allowSyntheticDefaultImports || compilerOptions.esModuleInterop);
      const targetSymbol = resolveESModuleSymbol(moduleSymbol, n.moduleSpecifier!, dontResolveAlias, suppressInteropError);
      if (targetSymbol) {
        if (name.escapedText) {
          if (qf.is.shorthandAmbientModuleSymbol(moduleSymbol)) return moduleSymbol;
          let symbolFromVariable: Symbol | undefined;
          if (moduleSymbol && moduleSymbol.exports && moduleSymbol.exports.get(InternalSymbol.ExportEquals))
            symbolFromVariable = this.propertyOfType(this.typeOfSymbol(targetSymbol), name.escapedText);
          else {
            symbolFromVariable = qf.get.propertyOfVariable(targetSymbol, name.escapedText);
          }
          symbolFromVariable = symbolFromVariable.resolveSymbol(dontResolveAlias);
          let symbolFromModule = qf.get.exportOfModule(targetSymbol, specifier, dontResolveAlias);
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
              if (suggestion.valueDeclaration) addRelatedInfo(diagnostic, qf.create.diagnosticForNode(suggestion.valueDeclaration, qd.msgs._0_is_declared_here, suggestionName));
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
    targetOfImportSpecifier(n: qt.ImportSpecifier, dontResolveAlias: boolean): Symbol | undefined {
      const resolved = this.externalModuleMember(n.parent?.parent?.parent, n, dontResolveAlias);
      markSymbolOfAliasDeclarationIfTypeOnly(n, undefined, resolved, false);
      return resolved;
    }
    targetOfNamespaceExportDeclaration(n: NamespaceExportDeclaration, dontResolveAlias: boolean): Symbol {
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
    targetOfExportAssignment(n: qt.ExportAssignment | qt.BinaryExpression, dontResolveAlias: boolean): Symbol | undefined {
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
    targetOfPropertyAssignment(n: qt.PropertyAssignment, dontRecursivelyResolve: boolean): Symbol | undefined {
      const expression = n.initer;
      return this.targetOfAliasLikeExpression(expression, dontRecursivelyResolve);
    }
    targetOfPropertyAccessExpression(n: qt.PropertyAccessExpression, dontRecursivelyResolve: boolean): Symbol | undefined {
      if (!(n.parent?.kind === Syntax.BinaryExpression && n.parent?.left === n && n.parent?.operatorToken.kind === Syntax.EqualsToken)) return;
      return this.targetOfAliasLikeExpression(n.parent?.right, dontRecursivelyResolve);
    }
    targetOfAliasDeclaration(n: qt.Declaration, dontRecursivelyResolve = false): Symbol | undefined {
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
    symbolOfPartOfRightHandSideOfImportEquals(entityName: qt.EntityName, dontResolveAlias?: boolean): Symbol | undefined {
      if (entityName.kind === Syntax.Identifier && qf.is.rightSideOfQualifiedNameOrPropertyAccess(entityName)) entityName = <QualifiedName>entityName.parent;
      if (entityName.kind === Syntax.Identifier || entityName.parent?.kind === Syntax.QualifiedName) return resolveEntityName(entityName, SymbolFlags.Namespace, false, dontResolveAlias);
      else {
        qu.assert(entityName.parent?.kind === Syntax.ImportEqualsDeclaration);
        return resolveEntityName(entityName, SymbolFlags.Value | SymbolFlags.Type | SymbolFlags.Namespace, false, dontResolveAlias);
      }
    }
    assignmentDeclarationLocation(n: qt.TypingReference): Node | undefined {
      const typeAlias = qc.findAncestor(n, (n) => (!(qc.isDoc.node(n) || n.flags & NodeFlags.Doc) ? 'quit' : qc.isDoc.typeAlias(n)));
      if (typeAlias) return;
      const host = qc.getDoc.host(n);
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
    commonJsExportEquals(exported: Symbol | undefined, moduleSymbol: Symbol): Symbol | undefined {
      if (!exported || exported === unknownSymbol || exported === moduleSymbol || moduleSymbol.exports!.size === 1 || exported.flags & SymbolFlags.Alias) return exported;
      const ls = exported.this.links();
      if (ls.cjsExportMerged) return ls.cjsExportMerged;
      const merged = exported.flags & SymbolFlags.Transient ? exported : exported.clone();
      merged.flags = merged.flags | SymbolFlags.ValueModule;
      if (merged.exports === undefined) merged.exports = new SymbolTable();
      moduleSymbol.exports!.forEach((s, name) => {
        if (name === InternalSymbol.ExportEquals) return;
        merged.exports!.set(name, merged.exports!.has(name) ? s.merge(merged.exports!.get(name)!) : s);
      });
      merged.this.links().cjsExportMerged = merged;
      return (ls.cjsExportMerged = merged);
    }
    exportsOfModuleAsArray(moduleSymbol: Symbol): Symbol[] {
      return symbolsToArray(this.exportsOfModule(moduleSymbol));
    }
    exportsAndPropertiesOfModule(moduleSymbol: Symbol): Symbol[] {
      const exports = this.exportsOfModuleAsArray(moduleSymbol);
      const exportEquals = resolveExternalModuleSymbol(moduleSymbol);
      if (exportEquals !== moduleSymbol) addRange(exports, this.propertiesOfType(this.typeOfSymbol(exportEquals)));
      return exports;
    }
    symbolOfNode(n: qt.Declaration): Symbol;
    symbolOfNode(n: Node): Symbol | undefined;
    symbolOfNode(n: Node): Symbol | undefined {
      return this.mergedSymbol(n.symbol && this.lateBoundSymbol(n.symbol));
    }
    fileSymbolIfFileSymbolExportEqualsContainer(d: qt.Declaration, container: Symbol) {
      const fileSymbol = this.externalModuleContainer(d);
      const exported = fileSymbol && fileSymbol.exports && fileSymbol.exports.get(InternalSymbol.ExportEquals);
      return exported && this.symbolIfSameReference(exported, container) ? fileSymbol : undefined;
    }
    symbolIfSameReference(s1: Symbol, s2: Symbol) {
      if (this.mergedSymbol(this.mergedSymbol(s1)?.resolveSymbol()) === this.mergedSymbol(this.mergedSymbol(s2)?.resolveSymbol())) return s1;
    }
    namedMembers(ms: SymbolTable): Symbol[] {
      let r: Symbol[] | undefined;
      ms.forEach((symbol, id) => {
        if (!qy.is.reservedName(id) && symbolIsValue(symbol)) (r || (r = [])).push(symbol);
      });
      return r || empty;
    }
    qualifiedLeftMeaning(rightMeaning: SymbolFlags) {
      return rightMeaning === SymbolFlags.Value ? SymbolFlags.Value : SymbolFlags.Namespace;
    }
    accessibleSymbolChain(
      symbol: Symbol | undefined,
      enclosingDeclaration: Node | undefined,
      meaning: SymbolFlags,
      useOnlyExternalAliasing: boolean,
      visitedSymbolTablesMap: qu.QMap<SymbolTable[]> = new qu.QMap()
    ): Symbol[] | undefined {
      if (!(symbol && !qf.is.propertyOrMethodDeclarationSymbol(symbol))) return;
      const id = '' + symbol.this.id();
      let visitedSymbolTables = visitedSymbolTablesMap.get(id);
      if (!visitedSymbolTables) visitedSymbolTablesMap.set(id, (visitedSymbolTables = []));
      return forEachSymbolTableInScope(enclosingDeclaration, getAccessibleSymbolChainFromSymbolTable);
      const accessibleSymbolChainFromSymbolTable = (symbols: SymbolTable, ignoreQualification?: boolean): Symbol[] | undefined => {
        if (!pushIfUnique(visitedSymbolTables!, symbols)) return;
        const result = trySymbolTable(symbols, ignoreQualification);
        visitedSymbolTables!.pop();
        return result;
      };
      const canQualifySymbol = (symbolFromSymbolTable: Symbol, meaning: SymbolFlags) => {
        return (
          !needsQualification(symbolFromSymbolTable, enclosingDeclaration, meaning) ||
          !!this.accessibleSymbolChain(symbolFromSymbolTable.parent, enclosingDeclaration, this.qualifiedLeftMeaning(meaning), useOnlyExternalAliasing, visitedSymbolTablesMap)
        );
      };
      const isAccessible = (symbolFromSymbolTable: Symbol, resolvedAliasSymbol?: Symbol, ignoreQualification?: boolean) => {
        return (
          (symbol === (resolvedAliasSymbol || symbolFromSymbolTable) || this.mergedSymbol(symbol) === this.mergedSymbol(resolvedAliasSymbol || symbolFromSymbolTable)) &&
          !some(symbolFromSymbolTable.declarations, hasNonGlobalAugmentationExternalModuleSymbol) &&
          (ignoreQualification || canQualifySymbol(this.mergedSymbol(symbolFromSymbolTable), meaning))
        );
      };
      const trySymbolTable = (symbols: SymbolTable, ignoreQualification: boolean | undefined): Symbol[] | undefined => {
        if (isAccessible(symbols.get(symbol!.escName)!, undefined, ignoreQualification)) return [symbol!];
        const result = forEachEntry(symbols, (symbolFromSymbolTable) => {
          if (
            symbolFromSymbolTable.flags & SymbolFlags.Alias &&
            symbolFromSymbolTable.escName !== InternalSymbol.ExportEquals &&
            symbolFromSymbolTable.escName !== InternalSymbol.Default &&
            !(qf.is.uMDExportSymbol(symbolFromSymbolTable) && enclosingDeclaration && qf.is.externalModule(enclosingDeclaration.sourceFile)) &&
            (!useOnlyExternalAliasing || qu.some(symbolFromSymbolTable.declarations, qf.is.externalModuleImportEqualsDeclaration)) &&
            (ignoreQualification || !this.declarationOfKind(symbolFromSymbolTable, Syntax.ExportSpecifier))
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
      const candidateListForSymbol = (symbolFromSymbolTable: Symbol, resolvedImportedSymbol: Symbol, ignoreQualification: boolean | undefined) => {
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
    typeAliasForTypeLiteral(t: qt.Type): Symbol | undefined {
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
    typeOfPrototypeProperty(prototype: Symbol): qt.Type {
      const classType = <InterfaceType>this.declaredTypeOfSymbol(this.parentOfSymbol(prototype)!);
      return classType.typeParameters
        ? createTypeReference(
            <GenericType>classType,
            map(classType.typeParameters, (_) => anyType)
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
    restType(source: qt.Type, properties: qt.PropertyName[], symbol: Symbol | undefined): qt.Type {
      source = filterType(source, (t) => !(t.flags & qt.TypeFlags.Nullable));
      if (source.flags & qt.TypeFlags.Never) return emptyObjectType;
      if (source.flags & qt.TypeFlags.Union) return mapType(source, (t) => this.restType(t, properties, symbol));
      const omitKeyType = this.unionType(map(properties, this.literalTypeFromPropertyName));
      if (qf.is.genericObjectType(source) || qf.is.genericIndexType(omitKeyType)) {
        if (omitKeyType.flags & qt.TypeFlags.Never) return source;
        const omitTypeAlias = this.globalOmitSymbol();
        if (!omitTypeAlias) return errorType;
        return this.typeAliasInstantiation(omitTypeAlias, [source, omitKeyType]);
      }
      const members = new SymbolTable();
      for (const prop of this.propertiesOfType(source)) {
        if (
          !qf.is.typeAssignableTo(this.literalTypeFromProperty(prop, qt.TypeFlags.StringOrNumberLiteralOrUnique), omitKeyType) &&
          !(this.declarationModifierFlagsFromSymbol(prop) & (ModifierFlags.Private | ModifierFlags.Protected)) &&
          qf.is.spreadableProperty(prop)
        ) {
          members.set(prop.escName, this.spreadSymbol(prop, false));
        }
      }
      const stringIndexInfo = this.indexInfoOfType(source, qt.IndexKind.String);
      const numberIndexInfo = this.indexInfoOfType(source, qt.IndexKind.Number);
      const result = createAnonymousType(symbol, members, empty, empty, stringIndexInfo, numberIndexInfo);
      result.objectFlags |= ObjectFlags.ObjectRestType;
      return result;
    }
    flowTypeOfDestructuring(n: qt.BindingElem | qt.PropertyAssignment | qt.ShorthandPropertyAssignment | Expression, declaredType: qt.Type) {
      const reference = this.syntheticElemAccess(n);
      return reference ? this.flow.typeOfReference(reference, declaredType) : declaredType;
    }
    syntheticElemAccess(n: qt.BindingElem | qt.PropertyAssignment | qt.ShorthandPropertyAssignment | qt.Expression): ElemAccessExpression | undefined {
      const parentAccess = this.parentElemAccess(n);
      if (parentAccess && parentAccess.flowNode) {
        const propName = this.destructuringPropertyName(n);
        if (propName) {
          const result = <ElemAccessExpression>createNode(Syntax.ElemAccessExpression, n.pos, n.end);
          result.parent = n;
          result.expression = <LeftExpression>parentAccess;
          const literal = <StringLiteral>createNode(Syntax.StringLiteral, n.pos, n.end);
          literal.parent = result;
          literal.text = propName;
          result.argumentExpression = literal;
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
      if (n.kind === Syntax.BindingElem && parent?.kind === Syntax.ObjectBindingPattern) return this.literalPropertyNameText((<BindingElem>n).propertyName || <Identifier>(<BindingElem>n).name);
      if (n.kind === Syntax.PropertyAssignment || n.kind === Syntax.ShorthandPropertyAssignment) return this.literalPropertyNameText((<PropertyAssignment | qt.ShorthandPropertyAssignment>n).name);
      return '' + (<Nodes<Node>>(<BindingPattern | ArrayLiteralExpression>parent).elems).indexOf(n);
    }
    literalPropertyNameText(n: qt.PropertyName) {
      const t = this.literalTypeFromPropertyName(n);
      return t.flags & (TypeFlags.StringLiteral | qt.TypeFlags.NumberLiteral) ? '' + t.value : undefined;
    }
    typeForBindingElem(declaration: qt.BindingElem): qt.Type | undefined {
      const pattern = declaration.parent;
      let parentType = this.typeForBindingElemParent(pattern.parent);
      if (!parentType || qf.is.typeAny(parentType)) return parentType;
      if (strictNullChecks && declaration.flags & NodeFlags.Ambient && qf.is.parameterDeclaration(declaration)) parentType = this.nonNullableType(parentType);
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
            if (!elem.dot3Token) literalMembers.push(elem.propertyName || (elem.name as Identifier));
          }
          type = this.restType(parentType, literalMembers, declaration.symbol);
        } else {
          const name = declaration.propertyName || <Identifier>declaration.name;
          const indexType = this.literalTypeFromPropertyName(name);
          const declaredType = this.constraintForLocation(this.indexedAccessType(parentType, indexType, name), declaration.name);
          type = this.flowTypeOfDestructuring(declaration, declaredType);
        }
      } else {
        const elemType = qf.check.iteratedTypeOrElemType(IterationUse.Destructuring, parentType, undefinedType, pattern);
        const index = pattern.elems.indexOf(declaration);
        if (declaration.dot3Token) type = everyType(parentType, qf.is.tupleType) ? mapType(parentType, (t) => sliceTupleType(<TupleTypeReference>t, index)) : createArrayType(elemType);
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
      const jsdocType = qc.getDoc.type(declaration);
      if (jsdocType) return this.typeFromTypeNode(jsdocType);
      return;
    }
    typeForVariableLikeDeclaration(
      declaration: ParameterDeclaration | qt.PropertyDeclaration | PropertySignature | VariableDeclaration | qt.BindingElem,
      includeOptionality: boolean
    ): qt.Type | undefined {
      if (declaration.kind === Syntax.VariableDeclaration && declaration.parent?.parent?.kind === Syntax.ForInStatement) {
        const indexType = this.indexType(this.nonNullableTypeIfNeeded(qf.check.expression(declaration.parent?.parent?.expression)));
        return indexType.flags & (TypeFlags.TypeParameter | qt.TypeFlags.Index) ? this.extractStringType(indexType) : stringType;
      }
      if (declaration.kind === Syntax.VariableDeclaration && declaration.parent?.parent?.kind === Syntax.ForOfStatement) {
        const forOfStatement = declaration.parent?.parent;
        return qf.check.rightHandSideOfForOf(forOfStatement) || anyType;
      }
      if (declaration.parent?.kind === Syntax.BindingPattern) return this.typeForBindingElem(<BindingElem>declaration);
      const isOptional =
        includeOptionality &&
        ((declaration.kind === Syntax.ParameterDeclaration && qf.is.docOptionalParameter(declaration)) ||
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
      if (declaration.kind === Syntax.Parameter) {
        const func = <FunctionLikeDeclaration>declaration.parent;
        if (func.kind === Syntax.SetAccessor && !qf.has.nonBindableDynamicName(func)) {
          const getter = getDeclarationOfKind<AccessorDeclaration>(this.symbolOfNode(declaration.parent), Syntax.GetAccessor);
          if (getter) {
            const getterSignature = this.signatureFromDeclaration(getter);
            const thisParameter = this.accessorThisNodeKind(ParameterDeclaration, func as AccessorDeclaration);
            if (thisParameter && declaration === thisParameter) {
              qu.assert(!thisParameter.type);
              return this.typeOfSymbol(getterSignature.thisParameter!);
            }
            return this.returnTypeOfSignature(getterSignature);
          }
        }
        if (qf.is.inJSFile(declaration)) {
          const typeTag = qc.getDoc.type(func);
          if (typeTag && typeTag.kind === Syntax.FunctionTyping) return this.typeAtPosition(this.signatureFromDeclaration(typeTag), func.parameters.indexOf(declaration));
        }
        const type = declaration.symbol.escName === InternalSymbol.This ? this.contextualThisParameterType(func) : this.contextuallyTypedParameterType(declaration);
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
    flowTypeInConstructor(symbol: Symbol, constructor: ConstructorDeclaration) {
      const reference = new qc.PropertyAccessExpression(new qc.ThisExpression(), qy.get.unescUnderscores(symbol.escName));
      reference.expression.parent = reference;
      reference.parent = constructor;
      reference.flowNode = constructor.returnFlowNode;
      const flowType = this.flowTypeOfProperty(reference, symbol);
      if (noImplicitAny && (flowType === autoType || flowType === autoArrayType))
        error(symbol.valueDeclaration, qd.msgs.Member_0_implicitly_has_an_1_type, symbol.symbolToString(), typeToString(flowType));
      return everyType(flowType, isNullableType) ? undefined : convertAutoToAny(flowType);
    }
    flowTypeOfProperty(n: Node, s?: Symbol) {
      const t = (s && (!qf.is.autoTypedProperty(s) || this.effectiveModifierFlags(s.valueDeclaration) & ModifierFlags.Ambient) && this.typeOfPropertyInBaseClass(s)) || undefinedType;
      return this.flow.typeOfReference(n, autoType, t);
    }
    widenedTypeForAssignmentDeclaration(symbol: Symbol, resolvedSymbol?: Symbol) {
      const container = this.assignedExpandoIniter(symbol.valueDeclaration);
      if (container) {
        const tag = qc.getDoc.typeTag(container);
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
    jSContainerObjectType(decl: Node, symbol: Symbol, init: Expression | undefined): qt.Type | undefined {
      if (!qf.is.inJSFile(decl) || !init || !init.kind === Syntax.ObjectLiteralExpression || init.properties.length) return;
      const exports = new SymbolTable();
      while (decl.kind === Syntax.BinaryExpression || decl.kind === Syntax.PropertyAccessExpression) {
        const s = this.symbolOfNode(decl);
        if (s && qu.qf.has.entries(s.exports)) exports.merge(s.exports);
        decl = decl.kind === Syntax.BinaryExpression ? decl.parent : decl.parent?.parent;
      }
      const s = this.symbolOfNode(decl);
      if (s && qu.qf.has.entries(s.exports)) exports.merge(s.exports);
      const type = createAnonymousType(symbol, exports, empty, empty, undefined, undefined);
      t.objectFlags |= ObjectFlags.JSLiteral;
      return type;
    }
    annotatedTypeForAssignmentDeclaration(declaredType: qt.Type | undefined, expression: Expression, symbol: Symbol, declaration: qt.Declaration) {
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
    initerTypeFromAssignmentDeclaration(symbol: Symbol, resolvedSymbol: Symbol | undefined, expression: BinaryExpression | CallExpression, kind: qt.AssignmentDeclarationKind) {
      if (expression.kind === Syntax.CallExpression) {
        if (resolvedSymbol) return this.typeOfSymbol(resolvedSymbol);
        const objectLitType = qf.check.expressionCached((expression as BindableObjectDefinePropertyCall).arguments[2]);
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
          if (setSig) return this.typeOfFirstParameterOfSignature(setSig);
        }
        return anyType;
      }
      if (containsSameNamedThisProperty(expression.left, expression.right)) return anyType;
      const type = resolvedSymbol ? this.typeOfSymbol(resolvedSymbol) : this.widenedLiteralType(qf.check.expressionCached(expression.right));
      if (t.flags & qt.TypeFlags.Object && kind === qt.AssignmentDeclarationKind.ModuleExports && symbol.escName === InternalSymbol.ExportEquals) {
        const exportedType = resolveStructuredTypeMembers(type as ObjectType);
        const members = new SymbolTable();
        copyEntries(exportedType.members, members);
        if (resolvedSymbol && !resolvedSymbol.exports) resolvedSymbol.exports = new SymbolTable();
        (resolvedSymbol || symbol).exports!.forEach((s, name) => {
          const exportedMember = members.get(name)!;
          if (exportedMember && exportedMember !== s) {
            if (s.flags & SymbolFlags.Value) {
              if (s.valueDeclaration.sourceFile !== exportedMember.valueDeclaration.sourceFile) {
                const unescName = qy.get.unescUnderscores(s.escName);
                const exportedMemberName = qu.tryCast(exportedMember.valueDeclaration, isNamedDecl)?.name || exportedMember.valueDeclaration;
                addRelatedInfo(error(s.valueDeclaration, qd.msgs.Duplicate_identifier_0, unescName), qf.create.diagnosticForNode(exportedMemberName, qd.msgs._0_was_also_declared_here, unescName));
                addRelatedInfo(error(exportedMemberName, qd.msgs.Duplicate_identifier_0, unescName), qf.create.diagnosticForNode(s.valueDeclaration, qd.msgs._0_was_also_declared_here, unescName));
              }
              const union = new Symbol(s.flags | exportedMember.flags, name);
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
        const result = createAnonymousType(exportedType.symbol, members, exportedType.callSignatures, exportedType.constructSignatures, exportedType.stringIndexInfo, exportedType.numberIndexInfo);
        result.objectFlags |= this.objectFlags(t) & ObjectFlags.JSLiteral;
        return result;
      }
      if (qf.is.emptyArrayLiteralType(t)) {
        reportImplicitAny(expression, anyArrayType);
        return anyArrayType;
      }
      return type;
    }
    constructorDefinedThisAssignmentTypes(types: qt.Type[], declarations: Declaration[]): qt.Type[] | undefined {
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
    typeFromObjectBindingPattern(pattern: ObjectBindingPattern, includePatternInType: boolean, reportErrors: boolean): qt.Type {
      const members = new SymbolTable();
      let stringIndexInfo: IndexInfo | undefined;
      let objectFlags = ObjectFlags.ObjectLiteral | ObjectFlags.ContainsObjectOrArrayLiteral;
      forEach(pattern.elems, (e) => {
        const name = e.propertyName || <Identifier>e.name;
        if (e.dot3Token) {
          stringIndexInfo = createIndexInfo(anyType, false);
          return;
        }
        const exprType = this.literalTypeFromPropertyName(name);
        if (!qf.is.typeUsableAsPropertyName(exprType)) {
          objectFlags |= ObjectFlags.ObjectLiteralPatternWithComputedProperties;
          return;
        }
        const text = this.propertyNameFromType(exprType);
        const flags = SymbolFlags.Property | (e.initer ? SymbolFlags.Optional : 0);
        const symbol = new Symbol(flags, text);
        symbol.type = this.typeFromBindingElem(e, includePatternInType, reportErrors);
        symbol.bindingElem = e;
        members.set(symbol.escName, symbol);
      });
      const result = createAnonymousType(undefined, members, empty, empty, stringIndexInfo, undefined);
      result.objectFlags |= objectFlags;
      if (includePatternInType) {
        result.pattern = pattern;
        result.objectFlags |= ObjectFlags.ContainsObjectOrArrayLiteral;
      }
      return result;
    }
    typeFromArrayBindingPattern(pattern: BindingPattern, includePatternInType: boolean, reportErrors: boolean): qt.Type {
      const elems = pattern.elems;
      const lastElem = lastOrUndefined(elems);
      const hasRestElem = !!(lastElem && lastElem.kind === Syntax.BindingElem && lastElem.dot3Token);
      if (elems.length === 0 || (elems.length === 1 && hasRestElem)) return createIterableType(anyType);
      const elemTypes = map(elems, (e) => (e.kind === Syntax.OmittedExpression ? anyType : this.typeFromBindingElem(e, includePatternInType, reportErrors)));
      const minLength = findLastIndex(elems, (e) => !e.kind === Syntax.OmittedExpression && !qf.has.defaultValue(e), elems.length - (hasRestElem ? 2 : 1)) + 1;
      let result = <TypeReference>createTupleType(elemTypes, minLength, hasRestElem);
      if (includePatternInType) {
        result = cloneTypeReference(result);
        result.pattern = pattern;
        result.objectFlags |= ObjectFlags.ContainsObjectOrArrayLiteral;
      }
      return result;
    }
    typeFromBindingPattern(pattern: BindingPattern, includePatternInType = false, reportErrors = false): qt.Type {
      return pattern.kind === Syntax.ObjectBindingPattern
        ? this.typeFromObjectBindingPattern(pattern, includePatternInType, reportErrors)
        : this.typeFromArrayBindingPattern(pattern, includePatternInType, reportErrors);
    }
    widenedTypeForVariableLikeDeclaration(declaration: ParameterDeclaration | qt.PropertyDeclaration | PropertySignature | VariableDeclaration | qt.BindingElem, reportErrors?: boolean): qt.Type {
      return widenTypeForVariableLikeDeclaration(this.typeForVariableLikeDeclaration(declaration, true), declaration, reportErrors);
    }
    annotatedAccessorTypeNode(accessor: AccessorDeclaration | undefined): Typing | undefined {
      if (accessor) {
        if (accessor.kind === Syntax.GetAccessor) {
          const getterTypeAnnotation = this.effectiveReturnTypeNode(accessor);
          return getterTypeAnnotation;
        } else {
          const setterTypeAnnotation = this.effectiveSetAccessorTypeAnnotationNode(accessor);
          return setterTypeAnnotation;
        }
      }
      return;
    }
    annotatedAccessorType(accessor: AccessorDeclaration | undefined): qt.Type | undefined {
      const n = this.annotatedAccessorTypeNode(accessor);
      return n && this.typeFromTypeNode(n);
    }
    annotatedAccessorThisNodeKind(ParameterDeclaration, accessor: AccessorDeclaration): Symbol | undefined {
      const parameter = this.accessorThisNodeKind(ParameterDeclaration, accessor);
      return parameter && parameter.symbol;
    }
    thisTypeOfDeclaration(declaration: qt.SignatureDeclaration): qt.Type | undefined {
      return this.thisTypeOfSignature(this.signatureFromDeclaration(declaration));
    }
    targetType(t: qt.Type): qt.Type {
      return this.objectFlags(t) & ObjectFlags.Reference ? (<TypeReference>type).target : type;
    }
    outerTypeParameters(n: Node, includeThisTypes?: boolean): TypeParameter[] | undefined {
      while (true) {
        n = n.parent;
        if (n && BinaryExpression.kind === Syntax.node) {
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
            const outerTypeParameters = this.outerTypeParameters(n, includeThisTypes);
            if (n.kind === Syntax.MappedTyping) return append(outerTypeParameters, this.declaredTypeOfTypeParameter(this.symbolOfNode((<MappedTyping>n).typeParameter)));
            else if (n.kind === Syntax.ConditionalTyping) return concatenate(outerTypeParameters, this.inferTypeParameters(<ConditionalTyping>n));
            else if (n.kind === Syntax.VariableStatement && !qf.is.inJSFile(n)) {
              break;
            }
            const outerAndOwnTypeParameters = appendTypeParameters(outerTypeParameters, this.effectiveTypeParameterDeclarations(<DeclarationWithTypeParameters>n));
            const thisType =
              includeThisTypes &&
              (n.kind === Syntax.ClassDeclaration || n.kind === Syntax.ClassExpression || n.kind === Syntax.InterfaceDeclaration || qf.is.jsConstructor(n)) &&
              this.declaredTypeOfClassOrInterface(this.symbolOfNode(n as ClassLikeDeclaration | InterfaceDeclaration)).thisType;
            return thisType ? append(outerAndOwnTypeParameters, thisType) : outerAndOwnTypeParameters;
        }
      }
    }
    baseTypeNodeOfClass(t: InterfaceType): ExpressionWithTypings | undefined {
      return this.effectiveBaseTypeNode(t.symbol.valueDeclaration as ClassLikeDeclaration);
    }
    constructorsForTypeArguments(t: qt.Type, typeArgumentNodes: readonly Typing[] | undefined, location: Node): readonly qt.Signature[] {
      const typeArgCount = length(typeArgumentNodes);
      const isJavascript = qf.is.inJSFile(location);
      return filter(
        this.signaturesOfType(t, qt.SignatureKind.Construct),
        (sig) => (isJavascript || typeArgCount >= this.minTypeArgumentCount(sig.typeParameters)) && typeArgCount <= length(sig.typeParameters)
      );
    }
    instantiatedConstructorsForTypeArguments(t: qt.Type, typeArgumentNodes: readonly Typing[] | undefined, location: Node): readonly qt.Signature[] {
      const signatures = this.constructorsForTypeArguments(t, typeArgumentNodes, location);
      const typeArguments = map(typeArgumentNodes, this.typeFromTypeNode);
      return sameMap<Signature>(signatures, (sig) => (some(sig.typeParameters) ? this.signatureInstantiation(sig, typeArguments, qf.is.inJSFile(location)) : sig));
    }
    baseConstructorTypeOfClass(t: InterfaceType): qt.Type {
      if (!type.resolvedBaseConstructorType) {
        const decl = <ClassLikeDeclaration>type.symbol.valueDeclaration;
        const extended = this.effectiveBaseTypeNode(decl);
        const baseTypeNode = this.baseTypeNodeOfClass(t);
        if (!baseTypeNode) return (t.resolvedBaseConstructorType = undefinedType);
        if (!pushTypeResolution(t, TypeSystemPropertyName.ResolvedBaseConstructorType)) return errorType;
        const baseConstructorType = qf.check.expression(baseTypeNode.expression);
        if (extended && baseTypeNode !== extended) {
          qu.assert(!extended.typeArguments);
          qf.check.expression(extended.expression);
        }
        if (baseConstructorType.flags & (TypeFlags.Object | qt.TypeFlags.Intersection)) resolveStructuredTypeMembers(<ObjectType>baseConstructorType);
        if (!popTypeResolution()) {
          error(t.symbol.valueDeclaration, qd.msgs._0_is_referenced_directly_or_indirectly_in_its_own_base_expression, t.symbol.symbolToString());
          return (t.resolvedBaseConstructorType = errorType);
        }
        if (!(baseConstructorType.flags & qt.TypeFlags.Any) && baseConstructorType !== nullWideningType && !qf.is.constructorType(baseConstructorType)) {
          const err = error(baseTypeNode.expression, qd.msgs.Type_0_is_not_a_constructor_function_type, typeToString(baseConstructorType));
          if (baseConstructorType.flags & qt.TypeFlags.TypeParameter) {
            const constraint = this.constraintFromTypeParameter(baseConstructorType);
            let ctorReturn: qt.Type = unknownType;
            if (constraint) {
              const ctorSig = this.signaturesOfType(constraint, qt.SignatureKind.Construct);
              if (ctorSig[0]) ctorReturn = this.returnTypeOfSignature(ctorSig[0]);
            }
            addRelatedInfo(
              err,
              qf.create.diagnosticForNode(
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
    implementsTypes(t: InterfaceType): BaseType[] {
      let resolvedImplementsTypes: BaseType[] = empty;
      for (const declaration of t.symbol.declarations) {
        const implementsTypeNodes = this.effectiveImplementsTypeNodes(declaration as ClassLikeDeclaration);
        if (!implementsTypeNodes) continue;
        for (const n of implementsTypeNodes) {
          const implementsType = this.typeFromTypeNode(n);
          if (implementsType !== errorType) {
            if (resolvedImplementsTypes === empty) resolvedImplementsTypes = [<ObjectType>implementsType];
            else {
              resolvedImplementsTypes.push(implementsType);
            }
          }
        }
      }
      return resolvedImplementsTypes;
    }
    baseTypes(t: InterfaceType): BaseType[] {
      if (!type.resolvedBaseTypes) {
        if (t.objectFlags & ObjectFlags.Tuple) t.resolvedBaseTypes = [createArrayType(this.unionType(t.typeParameters || empty), (<TupleType>type).readonly)];
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
    propertyNameFromType(t: StringLiteralType | NumberLiteralType | UniqueESSymbolType): qu.__String {
      if (t.flags & qt.TypeFlags.UniqueESSymbol) return (<UniqueESSymbolType>type).escName;
      if (t.flags & (TypeFlags.StringLiteral | qt.TypeFlags.NumberLiteral)) return qy.get.escUnderscores('' + (<StringLiteralType | NumberLiteralType>type).value);
      return qu.fail();
    }
    resolvedMembersOrExportsOfSymbol(symbol: Symbol, resolutionKind: MembersOrExportsResolutionKind): EscapedMap<Symbol> {
      const ls = symbol.this.links();
      if (!ls[resolutionKind]) {
        const isStatic = resolutionKind === MembersOrExportsResolutionKind.resolvedExports;
        const earlySymbols = !isStatic ? symbol.members : symbol.flags & SymbolFlags.Module ? symbol.this.exportsOfModuleWorker() : symbol.exports;
        ls[resolutionKind] = earlySymbols || emptySymbols;
        const lateSymbols = new SymbolTable<TransientSymbol>();
        for (const decl of symbol.declarations) {
          const members = this.declaration.members(decl);
          if (members) {
            for (const member of members) {
              if (isStatic === qf.has.staticModifier(member) && qf.has.lateBindableName(member)) lateBindMember(symbol, earlySymbols, lateSymbols, member);
            }
          }
        }
        const assignments = symbol.assignmentDeclarationMembers;
        if (assignments) {
          const decls = arrayFrom(assignments.values());
          for (const member of decls) {
            const assignmentKind = this.assignmentDeclarationKind(member as BinaryExpression | CallExpression);
            const isInstanceMember =
              assignmentKind === qt.AssignmentDeclarationKind.PrototypeProperty ||
              assignmentKind === qt.AssignmentDeclarationKind.ThisProperty ||
              assignmentKind === qt.AssignmentDeclarationKind.ObjectDefinePrototypeProperty ||
              assignmentKind === qt.AssignmentDeclarationKind.Prototype;
            if (isStatic === !isInstanceMember && qf.has.lateBindableName(member)) lateBindMember(symbol, earlySymbols, lateSymbols, member);
          }
        }
        ls[resolutionKind] = earlySymbols?.combine(lateSymbols) || emptySymbols;
      }
      return ls[resolutionKind]!;
    }
    typeWithThisArgument(t: qt.Type, thisArgument?: qt.Type, needApparentType?: boolean): qt.Type {
      if (this.objectFlags(t) & ObjectFlags.Reference) {
        const target = (<TypeReference>type).target;
        const typeArguments = this.typeArguments(<TypeReference>type);
        if (length(target.typeParameters) === length(typeArguments)) {
          const ref = createTypeReference(target, concatenate(typeArguments, [thisArgument || target.thisType!]));
          return needApparentType ? this.apparentType(ref) : ref;
        }
      } else if (t.flags & qt.TypeFlags.Intersection) {
        return this.intersectionType(map((<IntersectionType>type).types, (t) => this.typeWithThisArgument(t, thisArgument, needApparentType)));
      }
      return needApparentType ? this.apparentType(t) : type;
    }
    optionalCallSignature(s: qt.Signature, callChainFlags: qt.SignatureFlags): qt.Signature {
      if ((signature.flags & qt.SignatureFlags.CallChainFlags) === callChainFlags) return signature;
      if (!signature.optionalCallSignatureCache) signature.optionalCallSignatureCache = {};
      const key = callChainFlags === qt.SignatureFlags.IsInnerCallChain ? 'inner' : 'outer';
      return signature.optionalCallSignatureCache[key] || (signature.optionalCallSignatureCache[key] = createOptionalCallSignature(signature, callChainFlags));
    }
    expandedParameters(sig: qt.Signature, skipUnionExpanding?: boolean): readonly (readonly Symbol[])[] {
      if (signatureHasRestParameter(sig)) {
        const restIndex = sig.parameters.length - 1;
        const restType = this.typeOfSymbol(sig.parameters[restIndex]);
        if (qf.is.tupleType(restType)) return [expandSignatureParametersWithTupleMembers(restType, restIndex)];
        else if (!skipUnionExpanding && restType.flags & qt.TypeFlags.Union && every((restType as UnionType).types, qf.is.tupleType))
          return map((restType as UnionType).types, (t) => expandSignatureParametersWithTupleMembers(t as TupleTypeReference, restIndex));
      }
      return [sig.parameters];
      const expandSignatureParametersWithTupleMembers = (restType: TupleTypeReference, restIndex: number) => {
        const elemTypes = this.typeArguments(restType);
        const minLength = restType.target.minLength;
        const tupleRestIndex = restType.target.hasRestElem ? elemTypes.length - 1 : -1;
        const associatedNames = restType.target.labeledElemDeclarations;
        const restParams = map(elemTypes, (t, i) => {
          const tupleLabelName = !!associatedNames && this.tupleElemLabel(associatedNames[i]);
          const name = tupleLabelName || this.parameterNameAtPosition(sig, restIndex + i);
          const f = i === tupleRestIndex ? qt.CheckFlags.RestParameter : i >= minLength ? qt.CheckFlags.OptionalParameter : 0;
          const symbol = new Symbol(SymbolFlags.FunctionScopedVariable, name, f);
          symbol.type = i === tupleRestIndex ? createArrayType(t) : t;
          return symbol;
        });
        return concatenate(sig.parameters.slice(0, restIndex), restParams);
      };
    }
    defaultConstructSignatures(classType: InterfaceType): qt.Signature[] {
      const baseConstructorType = this.baseConstructorTypeOfClass(classType);
      const baseSignatures = this.signaturesOfType(baseConstructorType, qt.SignatureKind.Construct);
      if (baseSignatures.length === 0) return [createSignature(undefined, classType.localTypeParameters, undefined, empty, classType, undefined, 0, qt.SignatureFlags.None)];
      const baseTypeNode = this.baseTypeNodeOfClass(classType)!;
      const isJavaScript = qf.is.inJSFile(baseTypeNode);
      const typeArguments = typeArgumentsFromTypingReference(baseTypeNode);
      const typeArgCount = length(typeArguments);
      const result: qt.Signature[] = [];
      for (const baseSig of baseSignatures) {
        const minTypeArgumentCount = this.minTypeArgumentCount(baseSig.typeParameters);
        const typeParamCount = length(baseSig.typeParameters);
        if (isJavaScript || (typeArgCount >= minTypeArgumentCount && typeArgCount <= typeParamCount)) {
          const sig = typeParamCount
            ? createSignatureInstantiation(baseSig, fillMissingTypeArguments(typeArguments, baseSig.typeParameters, minTypeArgumentCount, isJavaScript))
            : cloneSignature(baseSig);
          sig.typeParameters = classType.localTypeParameters;
          sig.resolvedReturnType = classType;
          result.push(sig);
        }
      }
      return result;
    }
    unionSignatures(signatureLists: readonly (readonly qt.Signature[])[]): qt.Signature[] {
      let result: qt.Signature[] | undefined;
      let indexWithLengthOverOne: number | undefined;
      for (let i = 0; i < signatureLists.length; i++) {
        if (signatureLists[i].length === 0) return empty;
        if (signatureLists[i].length > 1) indexWithLengthOverOne = indexWithLengthOverOne === undefined ? i : -1;
        for (const signature of signatureLists[i]) {
          if (!result || !findMatchingSignature(result, signature, true)) {
            const unionSignatures = findMatchingSignatures(signatureLists, signature, i);
            if (unionSignatures) {
              let s = signature;
              if (unionSignatures.length > 1) {
                let thisParameter = signature.thisParameter;
                const firstThisParameterOfUnionSignatures = forEach(unionSignatures, (sig) => sig.thisParameter);
                if (firstThisParameterOfUnionSignatures) {
                  const thisType = this.intersectionType(mapDefined(unionSignatures, (sig) => sig.thisParameter && this.typeOfSymbol(sig.thisParameter)));
                  thisParameter = createSymbolWithType(firstThisParameterOfUnionSignatures, thisType);
                }
                s = createUnionSignature(signature, unionSignatures);
                s.thisParameter = thisParameter;
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
            qu.assert(!!signature, 'getUnionSignatures bails early on empty signature lists and should not have empty lists on second pass');
            results = signature.typeParameters && qu.some(results, (s) => !!s.typeParameters) ? undefined : map(results, (sig) => combineSignaturesOfUnionMembers(sig, signature));
            if (!results) break;
          }
        }
        result = results;
      }
      return result || empty;
    }
    unionIndexInfo(types: readonly qt.Type[], kind: IndexKind): IndexInfo | undefined {
      const indexTypes: qt.Type[] = [];
      let isAnyReadonly = false;
      for (const type of types) {
        const indexInfo = this.indexInfoOfType(this.apparentType(t), kind);
        if (!indexInfo) return;
        indexTypes.push(indexInfo.type);
        isAnyReadonly = isAnyReadonly || indexInfo.isReadonly;
      }
      return createIndexInfo(this.unionType(indexTypes, UnionReduction.Subtype), isAnyReadonly);
    }
    lowerBoundOfKeyType(t: qt.Type): qt.Type {
      if (t.flags & (TypeFlags.Any | qt.TypeFlags.Primitive)) return type;
      if (t.flags & qt.TypeFlags.Index) return this.indexType(this.apparentType((<IndexType>type).type));
      if (t.flags & qt.TypeFlags.Conditional) {
        if ((<ConditionalType>type).root.isDistributive) {
          const checkType = (<ConditionalType>type).checkType;
          const constraint = this.lowerBoundOfKeyType(checkType);
          if (constraint !== checkType)
            return this.conditionalTypeInstantiation(<ConditionalType>type, prependTypeMapping((<ConditionalType>type).root.checkType, constraint, (<ConditionalType>type).mapper));
        }
        return type;
      }
      if (t.flags & qt.TypeFlags.Union) return this.unionType(sameMap((<UnionType>type).types, getLowerBoundOfKeyType));
      if (t.flags & qt.TypeFlags.Intersection) return this.intersectionType(sameMap((<UnionType>type).types, getLowerBoundOfKeyType));
      return neverType;
    }
    typeOfMappedSymbol(symbol: MappedSymbol) {
      if (!symbol.type) {
        if (!pushTypeResolution(symbol, TypeSystemPropertyName.Type)) return errorType;
        const templateType = this.templateTypeFromMappedType(<MappedType>symbol.mappedType.target || symbol.mappedType);
        const propType = instantiateType(templateType, symbol.mapper);
        let type =
          strictNullChecks && symbol.flags & SymbolFlags.Optional && !maybeTypeOfKind(propType, qt.TypeFlags.Undefined | qt.TypeFlags.Void)
            ? this.optionalType(propType)
            : symbol.checkFlags & qt.CheckFlags.StripOptional
            ? this.typeWithFacts(propType, TypeFacts.NEUndefined)
            : propType;
        if (!popTypeResolution()) {
          error(currentNode, qd.msgs.Type_of_property_0_circularly_references_itself_in_mapped_type_1, symbol.symbolToString(), typeToString(symbol.mappedType));
          type = errorType;
        }
        symbol.type = type;
        symbol.mapper = undefined!;
      }
      return symbol.type;
    }
    typeParameterFromMappedType(t: MappedType) {
      return t.typeParameter || (t.typeParameter = this.declaredTypeOfTypeParameter(this.symbolOfNode(t.declaration.typeParameter)));
    }
    constraintTypeFromMappedType(t: MappedType) {
      return t.constraintType || (t.constraintType = this.constraintOfTypeParameter(this.typeParameterFromMappedType(t)) || errorType);
    }
    templateTypeFromMappedType(t: MappedType) {
      return (
        t.templateType ||
        (t.templateType = t.declaration.type
          ? instantiateType(addOptionality(this.typeFromTypeNode(t.declaration.type), !!(this.mappedTypeModifiers(t) & MappedTypeModifiers.IncludeOptional)), t.mapper)
          : errorType)
      );
    }
    constraintDeclarationForMappedType(t: MappedType) {
      return this.effectiveConstraintOfTypeParameter(t.declaration.typeParameter);
    }
    modifiersTypeFromMappedType(t: MappedType) {
      if (!type.modifiersType) {
        if (qf.is.mappedTypeWithKeyofConstraintDeclaration(t)) t.modifiersType = instantiateType(this.typeFromTypeNode((<TypingOperator>this.constraintDeclarationForMappedType(t)).type), t.mapper);
        else {
          const declaredType = <MappedType>this.typeFromMappedTyping(t.declaration);
          const constraint = this.constraintTypeFromMappedType(declaredType);
          const extendedConstraint = constraint && constraint.flags & qt.TypeFlags.TypeParameter ? this.constraintOfTypeParameter(<TypeParameter>constraint) : constraint;
          t.modifiersType = extendedConstraint && extendedConstraint.flags & qt.TypeFlags.Index ? instantiateType((<IndexType>extendedConstraint).type, t.mapper) : unknownType;
        }
      }
      return t.modifiersType;
    }
    mappedTypeModifiers(t: MappedType): MappedTypeModifiers {
      const declaration = t.declaration;
      return (
        (declaration.readonlyToken ? (declaration.readonlyToken.kind === Syntax.MinusToken ? MappedTypeModifiers.ExcludeReadonly : MappedTypeModifiers.IncludeReadonly) : 0) |
        (declaration.questionToken ? (declaration.questionToken.kind === Syntax.MinusToken ? MappedTypeModifiers.ExcludeOptional : MappedTypeModifiers.IncludeOptional) : 0)
      );
    }
    mappedTypeOptionality(t: MappedType): number {
      const modifiers = this.mappedTypeModifiers(t);
      return modifiers & MappedTypeModifiers.ExcludeOptional ? -1 : modifiers & MappedTypeModifiers.IncludeOptional ? 1 : 0;
    }
    combinedMappedTypeOptionality(t: MappedType): number {
      const optionality = this.mappedTypeOptionality(t);
      const modifiersType = this.modifiersTypeFromMappedType(t);
      return optionality || (qf.is.genericMappedType(modifiersType) ? this.mappedTypeOptionality(modifiersType) : 0);
    }
    propertiesOfObjectType(t: qt.Type): Symbol[] {
      if (t.flags & qt.TypeFlags.Object) return resolveStructuredTypeMembers(<ObjectType>type).properties;
      return empty;
    }
    propertyOfObjectType(t: qt.Type, name: qu.__String): Symbol | undefined {
      if (t.flags & qt.TypeFlags.Object) {
        const resolved = resolveStructuredTypeMembers(<ObjectType>type);
        const symbol = resolved.members.get(name);
        if (symbol && symbolIsValue(symbol)) return symbol;
      }
    }
    propertiesOfUnionOrIntersectionType(t: UnionOrIntersectionType): Symbol[] {
      if (!type.resolvedProperties) {
        const members = new SymbolTable();
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
    propertiesOfType(t: qt.Type): Symbol[] {
      t = this.reducedApparentType(t);
      return t.flags & qt.TypeFlags.UnionOrIntersection ? this.propertiesOfUnionOrIntersectionType(<UnionType>t) : this.propertiesOfObjectType(t);
    }
    allPossiblePropertiesOfTypes(types: readonly qt.Type[]): Symbol[] {
      const unionType = this.unionType(types);
      if (!(unionType.flags & qt.TypeFlags.Union)) return this.augmentedPropertiesOfType(unionType);
      const props = new SymbolTable();
      for (const memberType of types) {
        for (const { escName } of this.augmentedPropertiesOfType(memberType)) {
          if (!props.has(escName)) {
            const prop = createUnionOrIntersectionProperty(unionType as UnionType, escName);
            if (prop) props.set(escName, prop);
          }
        }
      }
      return arrayFrom(props.values());
    }
    constraintOfType(t: InstantiableType | UnionOrIntersectionType): qt.Type | undefined {
      return t.flags & qt.TypeFlags.TypeParameter
        ? this.constraintOfTypeParameter(<TypeParameter>type)
        : t.flags & qt.TypeFlags.IndexedAccess
        ? this.constraintOfIndexedAccess(<IndexedAccessType>type)
        : t.flags & qt.TypeFlags.Conditional
        ? this.constraintOfConditionalType(<ConditionalType>type)
        : this.baseConstraintOfType(t);
    }
    constraintOfTypeParameter(t: TypeParameter): qt.Type | undefined {
      return qf.has.nonCircularBaseConstraint(typeParameter) ? this.constraintFromTypeParameter(typeParameter) : undefined;
    }
    constraintOfIndexedAccess(t: IndexedAccessType) {
      return qf.has.nonCircularBaseConstraint(t) ? this.constraintFromIndexedAccess(t) : undefined;
    }
    simplifiedTypeOrConstraint(t: qt.Type) {
      const simplified = this.simplifiedType(t, false);
      return simplified !== type ? simplified : this.constraintOfType(t);
    }
    constraintFromIndexedAccess(t: IndexedAccessType) {
      const indexConstraint = this.simplifiedTypeOrConstraint(t.indexType);
      if (indexConstraint && indexConstraint !== t.indexType) {
        const indexedAccess = this.indexedAccessTypeOrUndefined(t.objectType, indexConstraint);
        if (indexedAccess) return indexedAccess;
      }
      const objectConstraint = this.simplifiedTypeOrConstraint(t.objectType);
      if (objectConstraint && objectConstraint !== t.objectType) return this.indexedAccessTypeOrUndefined(objectConstraint, t.indexType);
      return;
    }
    defaultConstraintOfConditionalType(t: ConditionalType) {
      if (!type.resolvedDefaultConstraint) {
        const trueConstraint = this.inferredTrueTypeFromConditionalType(t);
        const falseConstraint = this.falseTypeFromConditionalType(t);
        t.resolvedDefaultConstraint = qf.is.typeAny(trueConstraint) ? falseConstraint : qf.is.typeAny(falseConstraint) ? trueConstraint : this.unionType([trueConstraint, falseConstraint]);
      }
      return t.resolvedDefaultConstraint;
    }
    constraintOfDistributiveConditionalType(t: ConditionalType): qt.Type | undefined {
      if (t.root.isDistributive && t.restrictiveInstantiation !== type) {
        const simplified = this.simplifiedType(t.checkType, false);
        const constraint = simplified === t.checkType ? this.constraintOfType(simplified) : simplified;
        if (constraint && constraint !== t.checkType) {
          const instantiated = this.conditionalTypeInstantiation(t, prependTypeMapping(t.root.checkType, constraint, t.mapper));
          if (!(instantiated.flags & qt.TypeFlags.Never)) return instantiated;
        }
      }
      return;
    }
    constraintFromConditionalType(t: ConditionalType) {
      return this.constraintOfDistributiveConditionalType(t) || this.defaultConstraintOfConditionalType(t);
    }
    constraintOfConditionalType(t: ConditionalType) {
      return qf.has.nonCircularBaseConstraint(t) ? this.constraintFromConditionalType(t) : undefined;
    }
    effectiveConstraintOfIntersection(types: readonly qt.Type[], targetIsUnion: boolean) {
      let constraints: qt.Type[] | undefined;
      let hasDisjointDomainType = false;
      for (const t of types) {
        if (t.flags & qt.TypeFlags.Instantiable) {
          let constraint = this.constraintOfType(t);
          while (constraint && constraint.flags & (TypeFlags.TypeParameter | qt.TypeFlags.Index | qt.TypeFlags.Conditional)) {
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
        const constraint = this.resolvedBaseConstraint(<InstantiableType | UnionOrIntersectionType>type);
        return constraint !== noConstraintType && constraint !== circularConstraintType ? constraint : undefined;
      }
      return t.flags & qt.TypeFlags.Index ? keyofConstraintType : undefined;
    }
    baseConstraintOrType(t: qt.Type) {
      return this.baseConstraintOfType(t) || type;
    }
    resolvedBaseConstraint(t: InstantiableType | UnionOrIntersectionType): qt.Type {
      let nonTerminating = false;
      return t.resolvedBaseConstraint || (t.resolvedBaseConstraint = this.typeWithThisArgument(this.immediateBaseConstraint(t), type));
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
            if (t.flags & qt.TypeFlags.TypeParameter) {
              const errorNode = this.constraintDeclaration(<TypeParameter>t);
              if (errorNode) {
                const diagnostic = error(errorNode, qd.msgs.Type_parameter_0_has_a_circular_constraint, typeToString(t));
                if (currentNode && !qf.is.descendantOf(errorNode, currentNode) && !qf.is.descendantOf(currentNode, errorNode))
                  addRelatedInfo(diagnostic, qf.create.diagnosticForNode(currentNode, qd.msgs.Circularity_originates_in_type_at_this_location));
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
        if (t.flags & qt.TypeFlags.TypeParameter) {
          const constraint = this.constraintFromTypeParameter(<TypeParameter>t);
          return (t as TypeParameter).isThisType || !constraint ? constraint : this.baseConstraint(constraint);
        }
        if (t.flags & qt.TypeFlags.UnionOrIntersection) {
          const types = (<UnionOrIntersectionType>t).types;
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
          const baseObjectType = this.baseConstraint((<IndexedAccessType>t).objectType);
          const baseIndexType = this.baseConstraint((<IndexedAccessType>t).indexType);
          const baseIndexedAccess = baseObjectType && baseIndexType && this.indexedAccessTypeOrUndefined(baseObjectType, baseIndexType);
          return baseIndexedAccess && this.baseConstraint(baseIndexedAccess);
        }
        if (t.flags & qt.TypeFlags.Conditional) {
          const constraint = this.constraintFromConditionalType(<ConditionalType>t);
          constraintDepth++;
          const result = constraint && this.baseConstraint(constraint);
          constraintDepth--;
          return result;
        }
        if (t.flags & qt.TypeFlags.Substitution) return this.baseConstraint((<SubstitutionType>t).substitute);
        return t;
      };
    }
    apparentTypeOfIntersectionType(t: IntersectionType) {
      return t.resolvedApparentType || (t.resolvedApparentType = this.typeWithThisArgument(t, type, true));
    }
    resolvedTypeParameterDefault(t: TypeParameter): qt.Type | undefined {
      if (!typeParameter.default) {
        if (typeParameter.target) {
          const targetDefault = this.resolvedTypeParameterDefault(typeParameter.target);
          typeParameter.default = targetDefault ? instantiateType(targetDefault, typeParameter.mapper) : noConstraintType;
        } else {
          typeParameter.default = resolvingDefaultType;
          const defaultDeclaration = typeParameter.symbol && forEach(typeParameter.symbol.declarations, (decl) => decl.kind === Syntax.TypeParameterDeclaration && decl.default);
          const defaultType = defaultDeclaration ? this.typeFromTypeNode(defaultDeclaration) : noConstraintType;
          if (typeParameter.default === resolvingDefaultType) typeParameter.default = defaultType;
        }
      } else if (typeParameter.default === resolvingDefaultType) typeParameter.default = circularConstraintType;
      return typeParameter.default;
    }
    defaultFromTypeParameter(t: TypeParameter): qt.Type | undefined {
      const r = this.resolvedTypeParameterDefault(t);
      return r !== noConstraintType && r !== circularConstraintType ? r : undefined;
    }
    apparentTypeOfMappedType(t: MappedType) {
      return t.resolvedApparentType || (t.resolvedApparentType = this.resolvedApparentTypeOfMappedType(t));
    }
    resolvedApparentTypeOfMappedType(t: MappedType) {
      const r = this.homomorphicTypeVariable(t);
      if (r) {
        const c = this.constraintOfTypeParameter(r);
        if (c && (qf.is.arrayType(c) || qf.is.tupleType(c))) return instantiateType(t, prependTypeMapping(r, c, t.mapper));
      }
      return t;
    }
    apparentType(t: qt.Type): qt.Type {
      const t = t.flags & qt.TypeFlags.Instantiable ? this.baseConstraintOfType(t) || unknownType : type;
      return this.objectFlags(t) & ObjectFlags.Mapped
        ? this.apparentTypeOfMappedType(<MappedType>t)
        : t.flags & qt.TypeFlags.Intersection
        ? this.apparentTypeOfIntersectionType(<IntersectionType>t)
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
        ? emptyObjectType
        : t.flags & qt.TypeFlags.Index
        ? keyofConstraintType
        : t.flags & qt.TypeFlags.Unknown && !strictNullChecks
        ? emptyObjectType
        : t;
    }
    reducedApparentType(t: qt.Type): qt.Type {
      return this.reducedType(this.apparentType(this.reducedType(t)));
    }
    unionOrIntersectionProperty(t: UnionOrIntersectionType, name: qu.__String): Symbol | undefined {
      const properties = t.propertyCache || (t.propertyCache = new SymbolTable());
      let property = properties.get(name);
      if (!property) {
        property = createUnionOrIntersectionProperty(t, name);
        if (property) properties.set(name, property);
      }
      return property;
    }
    propertyOfUnionOrIntersectionType(t: UnionOrIntersectionType, name: qu.__String): Symbol | undefined {
      const property = this.unionOrIntersectionProperty(t, name);
      return property && !(this.checkFlags(property) & qt.CheckFlags.ReadPartial) ? property : undefined;
    }
    reducedType(t: qt.Type): qt.Type {
      if (t.flags & qt.TypeFlags.Union && (<UnionType>type).objectFlags & ObjectFlags.ContainsIntersections)
        return (<UnionType>type).resolvedReducedType || ((<UnionType>type).resolvedReducedType = this.reducedUnionType(<UnionType>type));
      else if (t.flags & qt.TypeFlags.Intersection) {
        if (!((<IntersectionType>type).objectFlags & ObjectFlags.IsNeverIntersectionComputed)) {
          (<IntersectionType>type).objectFlags |=
            ObjectFlags.IsNeverIntersectionComputed | (some(this.propertiesOfUnionOrIntersectionType(<IntersectionType>type), isNeverReducedProperty) ? ObjectFlags.IsNeverIntersection : 0);
        }
        return (<IntersectionType>type).objectFlags & ObjectFlags.IsNeverIntersection ? neverType : type;
      }
      return type;
    }
    reducedUnionType(unionType: UnionType) {
      const reducedTypes = sameMap(unionType.types, getReducedType);
      if (reducedTypes === unionType.types) return unionType;
      const reduced = this.unionType(reducedTypes);
      if (reduced.flags & qt.TypeFlags.Union) (<UnionType>reduced).resolvedReducedType = reduced;
      return reduced;
    }
    propertyOfType(t: qt.Type, name: qu.__String): Symbol | undefined {
      type = this.reducedApparentType(t);
      if (t.flags & qt.TypeFlags.Object) {
        const resolved = resolveStructuredTypeMembers(<ObjectType>type);
        const symbol = resolved.members.get(name);
        if (symbol && symbolIsValue(symbol)) return symbol;
        const functionType =
          resolved === anyFunctionType ? globalFunctionType : resolved.callSignatures.length ? globalCallableFunctionType : resolved.constructSignatures.length ? globalNewableFunctionType : undefined;
        if (functionType) {
          const symbol = this.propertyOfObjectType(functionType, name);
          if (symbol) return symbol;
        }
        return this.propertyOfObjectType(globalObjectType, name);
      }
      if (t.flags & qt.TypeFlags.UnionOrIntersection) return this.propertyOfUnionOrIntersectionType(<UnionOrIntersectionType>type, name);
      return;
    }
    signaturesOfStructuredType(t: qt.Type, kind: qt.SignatureKind): readonly qt.Signature[] {
      if (t.flags & qt.TypeFlags.StructuredType) {
        const resolved = resolveStructuredTypeMembers(<ObjectType>type);
        return kind === qt.SignatureKind.Call ? resolved.callSignatures : resolved.constructSignatures;
      }
      return empty;
    }
    signaturesOfType(t: qt.Type, kind: qt.SignatureKind): readonly qt.Signature[] {
      return this.signaturesOfStructuredType(this.reducedApparentType(t), kind);
    }
    indexInfoOfStructuredType(t: qt.Type, kind: IndexKind): IndexInfo | undefined {
      if (t.flags & qt.TypeFlags.StructuredType) {
        const resolved = resolveStructuredTypeMembers(<ObjectType>type);
        return kind === qt.IndexKind.String ? resolved.stringIndexInfo : resolved.numberIndexInfo;
      }
    }
    indexTypeOfStructuredType(t: qt.Type, kind: IndexKind): qt.Type | undefined {
      const info = this.indexInfoOfStructuredType(t, kind);
      return info && info.type;
    }
    indexInfoOfType(t: qt.Type, kind: IndexKind): IndexInfo | undefined {
      return this.indexInfoOfStructuredType(this.reducedApparentType(t), kind);
    }
    indexTypeOfType(t: qt.Type, kind: IndexKind): qt.Type | undefined {
      return this.indexTypeOfStructuredType(this.reducedApparentType(t), kind);
    }
    implicitIndexTypeOfType(t: qt.Type, kind: IndexKind): qt.Type | undefined {
      if (qf.is.objectTypeWithInferableIndex(t)) {
        const propTypes: qt.Type[] = [];
        for (const prop of this.propertiesOfType(t)) {
          if (kind === qt.IndexKind.String || NumericLiteral.name(prop.escName)) propTypes.push(this.typeOfSymbol(prop));
        }
        if (kind === qt.IndexKind.String) append(propTypes, this.indexTypeOfType(t, qt.IndexKind.Number));
        if (propTypes.length) return this.unionType(propTypes);
      }
      return;
    }
    typeParametersFromDeclaration(declaration: DeclarationWithTypeParameters): TypeParameter[] | undefined {
      let result: TypeParameter[] | undefined;
      for (const n of this.effectiveTypeParameterDeclarations(declaration)) {
        result = appendIfUnique(result, this.declaredTypeOfTypeParameter(n.symbol));
      }
      return result;
    }
    minTypeArgumentCount(typeParameters: readonly TypeParameter[] | undefined): number {
      let minTypeArgumentCount = 0;
      if (typeParameters) {
        for (let i = 0; i < typeParameters.length; i++) {
          if (!qf.has.typeParameterDefault(typeParameters[i])) minTypeArgumentCount = i + 1;
        }
      }
      return minTypeArgumentCount;
    }
    signatureFromDeclaration(declaration: qt.SignatureDeclaration | DocSignature): qt.Signature {
      const links = this.nodeLinks(declaration);
      if (!links.resolvedSignature) {
        const parameters: Symbol[] = [];
        let flags = qt.SignatureFlags.None;
        let minArgumentCount = 0;
        let thisParameter: Symbol | undefined;
        let hasThisParameter = false;
        const iife = this.immediatelyInvokedFunctionExpression(declaration);
        const isJSConstructSignature = qc.isDoc.constructSignature(declaration);
        const isUntypedSignatureInJSFile =
          !iife && qf.is.inJSFile(declaration) && qf.is.valueSignatureDeclaration(declaration) && !qc.getDoc.withParameterTags(declaration) && !qc.getDoc.type(declaration);
        if (isUntypedSignatureInJSFile) flags |= qt.SignatureFlags.IsUntypedSignatureInJSFile;
        for (let i = isJSConstructSignature ? 1 : 0; i < declaration.parameters.length; i++) {
          const param = declaration.parameters[i];
          let paramSymbol = param.symbol;
          const type = param.kind === Syntax.DocParameterTag ? param.typeExpression && param.typeExpression.type : param.type;
          if (paramSymbol && !!(paramSymbol.flags & SymbolFlags.Property) && !param.name.kind === Syntax.BindingPattern) {
            const resolvedSymbol = resolveName(param, paramSymbol.escName, SymbolFlags.Value, undefined, undefined, false);
            paramSymbol = resolvedSymbol!;
          }
          if (i === 0 && paramSymbol.escName === InternalSymbol.This) {
            hasThisParameter = true;
            thisParameter = param.symbol;
          } else {
            parameters.push(paramSymbol);
          }
          if (type && t.kind === Syntax.LiteralTyping) flags |= qt.SignatureFlags.HasLiteralTypes;
          const isOptionalParameter =
            qf.is.optionalDocParameterTag(param) ||
            param.initer ||
            param.questionToken ||
            param.dot3Token ||
            (iife && parameters.length > iife.arguments.length && !type) ||
            qf.is.docOptionalParameter(param);
          if (!isOptionalParameter) minArgumentCount = parameters.length;
        }
        if ((declaration.kind === Syntax.GetAccessor || declaration.kind === Syntax.SetAccessor) && !qf.has.nonBindableDynamicName(declaration) && (!hasThisParameter || !thisParameter)) {
          const otherKind = declaration.kind === Syntax.GetAccessor ? Syntax.SetAccessor : Syntax.GetAccessor;
          const other = getDeclarationOfKind<AccessorDeclaration>(this.symbolOfNode(declaration), otherKind);
          if (other) thisParameter = this.annotatedAccessorThisNodeKind(ParameterDeclaration, other);
        }
        const classType = declaration.kind === Syntax.Constructor ? this.declaredTypeOfClassOrInterface(this.mergedSymbol((<ClassDeclaration>declaration.parent).symbol)) : undefined;
        const typeParameters = classType ? classType.localTypeParameters : this.typeParametersFromDeclaration(declaration);
        if (qf.has.restParameter(declaration) || (qf.is.inJSFile(declaration) && maybeAddJsSyntheticRestParameter(declaration, parameters))) flags |= qt.SignatureFlags.HasRestParameter;
        links.resolvedSignature = createSignature(declaration, typeParameters, thisParameter, parameters, undefined, undefined, minArgumentCount, flags);
      }
      return links.resolvedSignature;
    }
    signatureOfTypeTag(n: qt.SignatureDeclaration | DocSignature) {
      if (!(qf.is.inJSFile(n) && qf.is.functionLikeDeclaration(n))) return;
      const typeTag = qc.getDoc.typeTag(n);
      const signature = typeTag && typeTag.typeExpression && this.singleCallSignature(this.typeFromTypeNode(typeTag.typeExpression));
      return signature && this.erasedSignature(signature);
    }
    returnTypeOfTypeTag(n: qt.SignatureDeclaration | DocSignature) {
      const signature = this.signatureOfTypeTag(n);
      return signature && this.returnTypeOfSignature(signature);
    }
    signaturesOfSymbol(symbol: Symbol | undefined): qt.Signature[] {
      if (!symbol) return empty;
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
    thisTypeOfSignature(s: qt.Signature): qt.Type | undefined {
      if (signature.thisParameter) return this.typeOfSymbol(signature.thisParameter);
    }
    typePredicateOfSignature(s: qt.Signature): TypePredicate | undefined {
      if (!signature.resolvedTypePredicate) {
        if (signature.target) {
          const targetTypePredicate = this.typePredicateOfSignature(signature.target);
          signature.resolvedTypePredicate = targetTypePredicate ? instantiateTypePredicate(targetTypePredicate, signature.mapper!) : noTypePredicate;
        } else if (signature.unionSignatures) {
          signature.resolvedTypePredicate = this.unionTypePredicate(signature.unionSignatures) || noTypePredicate;
        } else {
          const type = signature.declaration && this.effectiveReturnTypeNode(signature.declaration);
          let jsdocPredicate: TypePredicate | undefined;
          if (!type && qf.is.inJSFile(signature.declaration)) {
            const jsdocSignature = this.signatureOfTypeTag(signature.declaration!);
            if (jsdocSignature && signature !== jsdocSignature) jsdocPredicate = this.typePredicateOfSignature(jsdocSignature);
          }
          signature.resolvedTypePredicate = type && t.kind === Syntax.TypingPredicate ? createTypePredicateFromTypingPredicate(t, signature) : jsdocPredicate || noTypePredicate;
        }
        qu.assert(!!signature.resolvedTypePredicate);
      }
      return signature.resolvedTypePredicate === noTypePredicate ? undefined : signature.resolvedTypePredicate;
    }
    returnTypeOfSignature(s: qt.Signature): qt.Type {
      if (!signature.resolvedReturnType) {
        if (!pushTypeResolution(signature, TypeSystemPropertyName.ResolvedReturnType)) return errorType;
        let type = signature.target
          ? instantiateType(this.returnTypeOfSignature(signature.target), signature.mapper)
          : signature.unionSignatures
          ? this.unionType(map(signature.unionSignatures, this.returnTypeOfSignature), UnionReduction.Subtype)
          : this.returnTypeFromAnnotation(signature.declaration!) ||
            (qf.is.missing((<FunctionLikeDeclaration>signature.declaration).body) ? anyType : this.returnTypeFromBody(<FunctionLikeDeclaration>signature.declaration));
        if (signature.flags & qt.SignatureFlags.IsInnerCallChain) type = addOptionalTypeMarker(t);
        else if (signature.flags & qt.SignatureFlags.IsOuterCallChain) {
          type = this.optionalType(t);
        }
        if (!popTypeResolution()) {
          if (signature.declaration) {
            const typeNode = this.effectiveReturnTypeNode(signature.declaration);
            if (typeNode) error(typeNode, qd.msgs.Return_type_annotation_circularly_references_itself);
            else if (noImplicitAny) {
              const declaration = <Declaration>signature.declaration;
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
        signature.resolvedReturnType = type;
      }
      return signature.resolvedReturnType;
    }
    returnTypeFromAnnotation(declaration: qt.SignatureDeclaration | DocSignature) {
      if (declaration.kind === Syntax.Constructor) return this.declaredTypeOfClassOrInterface(this.mergedSymbol((<ClassDeclaration>declaration.parent).symbol));
      if (qc.isDoc.constructSignature(declaration)) return this.typeFromTypeNode((declaration.parameters[0] as ParameterDeclaration).type!);
      const typeNode = this.effectiveReturnTypeNode(declaration);
      if (typeNode) return this.typeFromTypeNode(typeNode);
      if (declaration.kind === Syntax.GetAccessor && !qf.has.nonBindableDynamicName(declaration)) {
        const docType = qf.is.inJSFile(declaration) && this.typeForDeclarationFromDocComment(declaration);
        if (docType) return docType;
        const setter = getDeclarationOfKind<AccessorDeclaration>(this.symbolOfNode(declaration), Syntax.SetAccessor);
        const setterType = this.annotatedAccessorType(setter);
        if (setterType) return setterType;
      }
      return this.returnTypeOfTypeTag(declaration);
    }
    restTypeOfSignature(s: qt.Signature): qt.Type {
      return tryGetRestTypeOfSignature(signature) || anyType;
    }
    signatureInstantiation(s: qt.Signature, typeArguments: qt.Type[] | undefined, isJavascript: boolean, inferredTypeParameters?: readonly TypeParameter[]): qt.Signature {
      const instantiatedSignature = this.signatureInstantiationWithoutFillingInTypeArguments(
        signature,
        fillMissingTypeArguments(typeArguments, signature.typeParameters, this.minTypeArgumentCount(signature.typeParameters), isJavascript)
      );
      if (inferredTypeParameters) {
        const returnSignature = this.singleCallOrConstructSignature(this.returnTypeOfSignature(instantiatedSignature));
        if (returnSignature) {
          const newReturnSignature = cloneSignature(returnSignature);
          newReturnSignature.typeParameters = inferredTypeParameters;
          const newInstantiatedSignature = cloneSignature(instantiatedSignature);
          newInstantiatedSignature.resolvedReturnType = this.orCreateTypeFromSignature(newReturnSignature);
          return newInstantiatedSignature;
        }
      }
      return instantiatedSignature;
    }
    signatureInstantiationWithoutFillingInTypeArguments(s: qt.Signature, typeArguments: readonly qt.Type[] | undefined): qt.Signature {
      const instantiations = signature.instantiations || (signature.instantiations = new qu.QMap<Signature>());
      const id = this.typeListId(typeArguments);
      let instantiation = instantiations.get(id);
      if (!instantiation) instantiations.set(id, (instantiation = createSignatureInstantiation(signature, typeArguments)));
      return instantiation;
    }
    erasedSignature(s: qt.Signature): qt.Signature {
      return signature.typeParameters ? signature.erasedSignatureCache || (signature.erasedSignatureCache = createErasedSignature(signature)) : signature;
    }
    canonicalSignature(s: qt.Signature): qt.Signature {
      return signature.typeParameters ? signature.canonicalSignatureCache || (signature.canonicalSignatureCache = createCanonicalSignature(signature)) : signature;
    }
    baseSignature(s: qt.Signature) {
      const typeParameters = signature.typeParameters;
      if (typeParameters) {
        const typeEraser = createTypeEraser(typeParameters);
        const baseConstraints = map(typeParameters, (tp) => instantiateType(this.baseConstraintOfType(tp), typeEraser) || unknownType);
        return instantiateSignature(signature, createTypeMapper(typeParameters, baseConstraints), true);
      }
      return signature;
    }
    orCreateTypeFromSignature(s: qt.Signature): ObjectType {
      if (!signature.isolatedSignatureType) {
        const kind = signature.declaration ? signature.declaration.kind : Syntax.Unknown;
        const isConstructor = kind === Syntax.Constructor || kind === Syntax.ConstructSignature || kind === Syntax.ConstructorTyping;
        const type = createObjectType(ObjectFlags.Anonymous);
        t.members = emptySymbols;
        t.properties = empty;
        t.callSignatures = !isConstructor ? [signature] : empty;
        t.constructSignatures = isConstructor ? [signature] : empty;
        signature.isolatedSignatureType = type;
      }
      return signature.isolatedSignatureType;
    }
    constraintDeclaration(t: TypeParameter): Typing | undefined {
      return mapDefined(filter(t.symbol && t.symbol.declarations, isTypeParameterDeclaration), getEffectiveConstraintOfTypeParameter)[0];
    }
    inferredTypeParameterConstraint(t: TypeParameter) {
      let inferences: qt.Type[] | undefined;
      if (typeParameter.symbol) {
        for (const declaration of typeParameter.symbol.declarations) {
          if (declaration.parent?.kind === Syntax.InferTyping) {
            const grandParent = declaration.parent?.parent;
            if (grandParent.kind === Syntax.TypingReference) {
              const typeReference = <TypingReference>grandParent;
              const typeParameters = this.typeParametersForTypeReference(typeReference);
              if (typeParameters) {
                const index = typeReference.typeArguments!.indexOf(<Typing>declaration.parent);
                if (index < typeParameters.length) {
                  const declaredConstraint = this.constraintOfTypeParameter(typeParameters[index]);
                  if (declaredConstraint) {
                    const mapper = createTypeMapper(typeParameters, this.effectiveTypeArguments(typeReference, typeParameters));
                    const constraint = instantiateType(declaredConstraint, mapper);
                    if (constraint !== typeParameter) inferences = append(inferences, constraint);
                  }
                }
              }
            } else if (grandParent.kind === Syntax.Parameter && (<ParameterDeclaration>grandParent).dot3Token) {
              inferences = append(inferences, createArrayType(unknownType));
            }
          }
        }
      }
      return inferences && this.intersectionType(inferences);
    }
    constraintFromTypeParameter(t: TypeParameter): qt.Type | undefined {
      if (!typeParameter.constraint) {
        if (typeParameter.target) {
          const targetConstraint = this.constraintOfTypeParameter(typeParameter.target);
          typeParameter.constraint = targetConstraint ? instantiateType(targetConstraint, typeParameter.mapper) : noConstraintType;
        } else {
          const constraintDeclaration = this.constraintDeclaration(typeParameter);
          if (!constraintDeclaration) typeParameter.constraint = this.inferredTypeParameterConstraint(typeParameter) || noConstraintType;
          else {
            let type = this.typeFromTypeNode(constraintDeclaration);
            if (t.flags & qt.TypeFlags.Any && type !== errorType) type = constraintDeclaration.parent?.parent?.kind === Syntax.MappedTyping ? keyofConstraintType : unknownType;
            typeParameter.constraint = type;
          }
        }
      }
      return typeParameter.constraint === noConstraintType ? undefined : typeParameter.constraint;
    }
    parentSymbolOfTypeParameter(t: TypeParameter): Symbol | undefined {
      const tp = getDeclarationOfKind<TypeParameterDeclaration>(typeParameter.symbol, Syntax.TypeParameter)!;
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
    typeArguments(t: TypeReference): readonly qt.Type[] {
      if (!type.resolvedTypeArguments) {
        if (!pushTypeResolution(t, TypeSystemPropertyName.ResolvedTypeArguments)) return t.target.localTypeParameters?.map(() => errorType) || empty;
        const n = t.node;
        const typeArguments = !n
          ? empty
          : n.kind === Syntax.TypingReference
          ? concatenate(t.target.outerTypeParameters, this.effectiveTypeArguments(n, t.target.localTypeParameters!))
          : n.kind === Syntax.ArrayTyping
          ? [this.typeFromTypeNode(n.elemType)]
          : map(n.elems, this.typeFromTypeNode);
        if (popTypeResolution()) t.resolvedTypeArguments = t.mapper ? instantiateTypes(typeArguments, t.mapper) : typeArguments;
        else {
          t.resolvedTypeArguments = t.target.localTypeParameters?.map(() => errorType) || empty;
          error(
            t.node || currentNode,
            t.target.symbol ? qd.msgs.Type_arguments_for_0_circularly_reference_themselves : qd.msgs.Tuple_type_arguments_circularly_reference_themselves,
            t.target.symbol && t.target.symbol.symbolToString()
          );
        }
      }
      return t.resolvedTypeArguments;
    }
    typeReferenceArity(t: TypeReference): number {
      return length(t.target.typeParameters);
    }
    typeFromClassOrInterfaceReference(n: WithArgumentsTobj, symbol: Symbol): qt.Type {
      const type = <InterfaceType>this.declaredTypeOfSymbol(this.mergedSymbol(symbol));
      const typeParameters = t.localTypeParameters;
      if (typeParameters) {
        const numTypeArguments = length(n.typeArguments);
        const minTypeArgumentCount = this.minTypeArgumentCount(typeParameters);
        const isJs = qf.is.inJSFile(n);
        const isJsImplicitAny = !noImplicitAny && isJs;
        if (!isJsImplicitAny && (numTypeArguments < minTypeArgumentCount || numTypeArguments > typeParameters.length)) {
          const missingAugmentsTag = isJs && n.kind === Syntax.ExpressionWithTypings && !n.parent?.kind === Syntax.DocAugmentsTag;
          const diag =
            minTypeArgumentCount === typeParameters.length
              ? missingAugmentsTag
                ? qd.msgs.Expected_0_type_arguments_provide_these_with_an_extends_tag
                : qd.msgs.Generic_type_0_requires_1_type_argument_s
              : missingAugmentsTag
              ? qd.msgs.Expected_0_1_type_arguments_provide_these_with_an_extends_tag
              : qd.msgs.Generic_type_0_requires_between_1_and_2_type_arguments;
          const typeStr = typeToString(t, undefined, qt.TypeFormatFlags.WriteArrayAsGenericType);
          error(n, diag, typeStr, minTypeArgumentCount, typeParameters.length);
          if (!isJs) return errorType;
        }
        if (n.kind === Syntax.TypingReference && qf.is.deferredTypingReference(<TypingReference>n, length(n.typeArguments) !== typeParameters.length))
          return createDeferredTypeReference(<GenericType>type, <TypingReference>n, undefined);
        const typeArguments = concatenate(t.outerTypeParameters, fillMissingTypeArguments(typeArgumentsFromTypingReference(n), typeParameters, minTypeArgumentCount, isJs));
        return createTypeReference(<GenericType>type, typeArguments);
      }
      return qf.check.noTypeArguments(n, symbol) ? type : errorType;
    }
    typeAliasInstantiation(symbol: Symbol, typeArguments: readonly qt.Type[] | undefined): qt.Type {
      const type = this.declaredTypeOfSymbol(symbol);
      const links = s.this.links(symbol);
      const typeParameters = links.typeParameters!;
      const id = this.typeListId(typeArguments);
      let instantiation = links.instantiations!.get(id);
      if (!instantiation) {
        links.instantiations!.set(
          id,
          (instantiation = instantiateType(
            type,
            createTypeMapper(typeParameters, fillMissingTypeArguments(typeArguments, typeParameters, this.minTypeArgumentCount(typeParameters), qf.is.inJSFile(symbol.valueDeclaration)))
          ))
        );
      }
      return instantiation;
    }
    typeFromTypeAliasReference(n: WithArgumentsTobj, symbol: Symbol): qt.Type {
      const type = this.declaredTypeOfSymbol(symbol);
      const typeParameters = s.this.links(symbol).typeParameters;
      if (typeParameters) {
        const numTypeArguments = length(n.typeArguments);
        const minTypeArgumentCount = this.minTypeArgumentCount(typeParameters);
        if (numTypeArguments < minTypeArgumentCount || numTypeArguments > typeParameters.length) {
          error(
            n,
            minTypeArgumentCount === typeParameters.length ? qd.msgs.Generic_type_0_requires_1_type_argument_s : qd.msgs.Generic_type_0_requires_between_1_and_2_type_arguments,
            symbol.symbolToString(),
            minTypeArgumentCount,
            typeParameters.length
          );
          return errorType;
        }
        return this.typeAliasInstantiation(symbol, typeArgumentsFromTypingReference(n));
      }
      return qf.check.noTypeArguments(n, symbol) ? type : errorType;
    }
    typeReferenceName(n: TypeReferenceType): qt.EntityNameOrEntityNameExpression | undefined {
      switch (n.kind) {
        case Syntax.TypingReference:
          return n.typeName;
        case Syntax.ExpressionWithTypings:
          const expr = n.expression;
          if (qf.is.entityNameExpression(expr)) return expr;
      }
      return;
    }
    typeReferenceType(n: WithArgumentsTobj, symbol: Symbol): qt.Type {
      if (symbol === unknownSymbol) return errorType;
      symbol = symbol.this.expandoSymbol() || symbol;
      if (symbol.flags & (SymbolFlags.Class | SymbolFlags.Interface)) return this.typeFromClassOrInterfaceReference(n, symbol);
      if (symbol.flags & SymbolFlags.TypeAlias) return this.typeFromTypeAliasReference(n, symbol);
      const res = tryGetDeclaredTypeOfSymbol(symbol);
      if (res) return qf.check.noTypeArguments(n, symbol) ? this.regularTypeOfLiteralType(res) : errorType;
      if (symbol.flags & SymbolFlags.Value && qf.is.docTypeReference(n)) {
        const jsdocType = this.typeFromDocValueReference(n, symbol);
        if (jsdocType) return jsdocType;
        resolveTypeReferenceName(this.typeReferenceName(n), SymbolFlags.Type);
        return this.this.typeOfSymbol();
      }
      return errorType;
    }
    typeFromDocValueReference(n: WithArgumentsTobj, symbol: Symbol): qt.Type | undefined {
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
          const isImportTypeWithQualifier = n.kind === Syntax.ImportTyping && (n as ImportTyping).qualifier;
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
      const result = <SubstitutionType>createType(TypeFlags.Substitution);
      result.baseType = baseType;
      result.substitute = substitute;
      substitutionTypes.set(id, result);
      return result;
    }
    impliedConstraint(t: qt.Type, checkNode: Typing, extendsNode: Typing): qt.Type | undefined {
      return qf.is.unaryTupleTyping(checkNode) && qf.is.unaryTupleTyping(extendsNode)
        ? this.impliedConstraint(t, (<TupleTyping>checkNode).elems[0], (<TupleTyping>extendsNode).elems[0])
        : this.actualTypeVariable(this.typeFromTypeNode(checkNode)) === type
        ? this.typeFromTypeNode(extendsNode)
        : undefined;
    }
    conditionalFlowTypeOfType(t: qt.Type, n: Node) {
      let constraints: qt.Type[] | undefined;
      while (n && !qf.is.statement(n) && n.kind !== Syntax.DocComment) {
        const parent = n.parent;
        if (parent?.kind === Syntax.ConditionalTyping && n === (<ConditionalTyping>parent).trueType) {
          const constraint = this.impliedConstraint(t, (<ConditionalTyping>parent).checkType, (<ConditionalTyping>parent).extendsType);
          if (constraint) constraints = append(constraints, constraint);
        }
        n = parent;
      }
      return constraints ? this.substitutionType(t, this.intersectionType(append(constraints, type))) : type;
    }
    intendedTypeFromDocTypeReference(n: qt.TypingReference): qt.Type | undefined {
      if (n.typeName.kind === Syntax.Identifier) {
        const typeArgs = n.typeArguments;
        switch (n.typeName.escapedText) {
          case 'String':
            qf.check.noTypeArguments(n);
            return stringType;
          case 'Number':
            qf.check.noTypeArguments(n);
            return numberType;
          case 'Boolean':
            qf.check.noTypeArguments(n);
            return booleanType;
          case 'Void':
            qf.check.noTypeArguments(n);
            return voidType;
          case 'Undefined':
            qf.check.noTypeArguments(n);
            return undefinedType;
          case 'Null':
            qf.check.noTypeArguments(n);
            return nullType;
          case 'Function':
          case 'function':
            qf.check.noTypeArguments(n);
            return globalFunctionType;
          case 'array':
            return (!typeArgs || !typeArgs.length) && !noImplicitAny ? anyArrayType : undefined;
          case 'promise':
            return (!typeArgs || !typeArgs.length) && !noImplicitAny ? createPromiseType(anyType) : undefined;
          case 'Object':
            if (typeArgs && typeArgs.length === 2) {
              if (qf.is.docIndexSignature(n)) {
                const indexed = this.typeFromTypeNode(typeArgs[0]);
                const target = this.typeFromTypeNode(typeArgs[1]);
                const index = createIndexInfo(target, false);
                return createAnonymousType(undefined, emptySymbols, empty, empty, indexed === stringType ? index : undefined, indexed === numberType ? index : undefined);
              }
              return anyType;
            }
            qf.check.noTypeArguments(n);
            return !noImplicitAny ? anyType : undefined;
        }
      }
    }
    typeFromDocNullableTypingNode(n: DocNullableTyping) {
      const type = this.typeFromTypeNode(n.type);
      return strictNullChecks ? this.nullableType(t, qt.TypeFlags.Null) : type;
    }
    typeFromTypeReference(n: TypeReferenceType): qt.Type {
      const links = this.nodeLinks(n);
      if (!links.resolvedType) {
        if (qf.is.constTypeReference(n) && qf.is.assertionExpression(n.parent)) {
          links.resolvedSymbol = unknownSymbol;
          return (links.resolvedType = qf.check.expressionCached(n.parent?.expression));
        }
        let symbol: Symbol | undefined;
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
    typeFromTypingQuery(n: TypingQuery): qt.Type {
      const links = this.nodeLinks(n);
      if (!links.resolvedType) links.resolvedType = this.regularTypeOfLiteralType(this.widenedType(qf.check.expression(n.exprName)));
      return links.resolvedType;
    }
    typeOfGlobalSymbol(s: Symbol | undefined, arity: number): ObjectType {
      const typeDeclaration = (s: Symbol): Declaration | undefined => {
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
      if (!s) return arity ? emptyGenericType : emptyObjectType;
      const type = this.declaredTypeOfSymbol(s);
      if (!(t.flags & qt.TypeFlags.Object)) {
        error(typeDeclaration(s), qd.msgs.Global_type_0_must_be_a_class_or_interface_type, s.name);
        return arity ? emptyGenericType : emptyObjectType;
      }
      if (length((<InterfaceType>type).typeParameters) !== arity) {
        error(typeDeclaration(s), qd.msgs.Global_type_0_must_have_1_type_parameter_s, s.name, arity);
        return arity ? emptyGenericType : emptyObjectType;
      }
      return <ObjectType>type;
    }
    globalValueSymbol(name: qu.__String, reportErrors: boolean): Symbol | undefined {
      return this.globalSymbol(name, SymbolFlags.Value, reportErrors ? qd.msgs.Cannot_find_global_value_0 : undefined);
    }
    globalTypeSymbol(name: qu.__String, reportErrors: boolean): Symbol | undefined {
      return this.globalSymbol(name, SymbolFlags.Type, reportErrors ? qd.msgs.Cannot_find_global_type_0 : undefined);
    }
    globalSymbol(name: qu.__String, meaning: SymbolFlags, diagnostic: qd.Message | undefined): Symbol | undefined {
      return resolveName(undefined, name, meaning, diagnostic, name, false);
    }
    globalType(name: qu.__String, arity: 0, reportErrors: boolean): ObjectType;
    globalType(name: qu.__String, arity: number, reportErrors: boolean): GenericType;
    globalType(name: qu.__String, arity: number, reportErrors: boolean): ObjectType | undefined {
      const symbol = this.globalTypeSymbol(name, reportErrors);
      return symbol || reportErrors ? this.typeOfGlobalSymbol(symbol, arity) : undefined;
    }
    globalTypedPropertyDescriptorType() {
      return deferredGlobalTypedPropertyDescriptorType || (deferredGlobalTypedPropertyDescriptorType = this.globalType('TypedPropertyDescriptor' as qu.__String, 1, true)) || emptyGenericType;
    }
    globalTemplateStringsArrayType() {
      return deferredGlobalTemplateStringsArrayType || (deferredGlobalTemplateStringsArrayType = this.globalType('TemplateStringsArray' as qu.__String, 0, true)) || emptyObjectType;
    }
    globalImportMetaType() {
      return deferredGlobalImportMetaType || (deferredGlobalImportMetaType = this.globalType('ImportMeta' as qu.__String, 0, true)) || emptyObjectType;
    }
    globalESSymbolConstructorSymbol(reportErrors: boolean) {
      return deferredGlobalESSymbolConstructorSymbol || (deferredGlobalESSymbolConstructorSymbol = this.globalValueSymbol('Symbol' as qu.__String, reportErrors));
    }
    globalESSymbolType(reportErrors: boolean) {
      return deferredGlobalESSymbolType || (deferredGlobalESSymbolType = this.globalType('Symbol' as qu.__String, 0, reportErrors)) || emptyObjectType;
    }
    globalPromiseType(reportErrors: boolean) {
      return deferredGlobalPromiseType || (deferredGlobalPromiseType = this.globalType('Promise' as qu.__String, 1, reportErrors)) || emptyGenericType;
    }
    globalPromiseLikeType(reportErrors: boolean) {
      return deferredGlobalPromiseLikeType || (deferredGlobalPromiseLikeType = this.globalType('PromiseLike' as qu.__String, 1, reportErrors)) || emptyGenericType;
    }
    globalPromiseConstructorSymbol(reportErrors: boolean): Symbol | undefined {
      return deferredGlobalPromiseConstructorSymbol || (deferredGlobalPromiseConstructorSymbol = this.globalValueSymbol('Promise' as qu.__String, reportErrors));
    }
    globalPromiseConstructorLikeType(reportErrors: boolean) {
      return deferredGlobalPromiseConstructorLikeType || (deferredGlobalPromiseConstructorLikeType = this.globalType('PromiseConstructorLike' as qu.__String, 0, reportErrors)) || emptyObjectType;
    }
    globalAsyncIterableType(reportErrors: boolean) {
      return deferredGlobalAsyncIterableType || (deferredGlobalAsyncIterableType = this.globalType('AsyncIterable' as qu.__String, 1, reportErrors)) || emptyGenericType;
    }
    globalAsyncIteratorType(reportErrors: boolean) {
      return deferredGlobalAsyncIteratorType || (deferredGlobalAsyncIteratorType = this.globalType('AsyncIterator' as qu.__String, 3, reportErrors)) || emptyGenericType;
    }
    globalAsyncIterableIteratorType(reportErrors: boolean) {
      return deferredGlobalAsyncIterableIteratorType || (deferredGlobalAsyncIterableIteratorType = this.globalType('AsyncIterableIterator' as qu.__String, 1, reportErrors)) || emptyGenericType;
    }
    globalAsyncGeneratorType(reportErrors: boolean) {
      return deferredGlobalAsyncGeneratorType || (deferredGlobalAsyncGeneratorType = this.globalType('AsyncGenerator' as qu.__String, 3, reportErrors)) || emptyGenericType;
    }
    globalIterableType(reportErrors: boolean) {
      return deferredGlobalIterableType || (deferredGlobalIterableType = this.globalType('Iterable' as qu.__String, 1, reportErrors)) || emptyGenericType;
    }
    globalIteratorType(reportErrors: boolean) {
      return deferredGlobalIteratorType || (deferredGlobalIteratorType = this.globalType('Iterator' as qu.__String, 3, reportErrors)) || emptyGenericType;
    }
    globalIterableIteratorType(reportErrors: boolean) {
      return deferredGlobalIterableIteratorType || (deferredGlobalIterableIteratorType = this.globalType('IterableIterator' as qu.__String, 1, reportErrors)) || emptyGenericType;
    }
    globalGeneratorType(reportErrors: boolean) {
      return deferredGlobalGeneratorType || (deferredGlobalGeneratorType = this.globalType('Generator' as qu.__String, 3, reportErrors)) || emptyGenericType;
    }
    globalIteratorYieldResultType(reportErrors: boolean) {
      return deferredGlobalIteratorYieldResultType || (deferredGlobalIteratorYieldResultType = this.globalType('IteratorYieldResult' as qu.__String, 1, reportErrors)) || emptyGenericType;
    }
    globalIteratorReturnResultType(reportErrors: boolean) {
      return deferredGlobalIteratorReturnResultType || (deferredGlobalIteratorReturnResultType = this.globalType('IteratorReturnResult' as qu.__String, 1, reportErrors)) || emptyGenericType;
    }
    globalTypeOrUndefined(name: qu.__String, arity = 0): ObjectType | undefined {
      const symbol = this.globalSymbol(name, SymbolFlags.Type, undefined);
      return symbol && <GenericType>this.typeOfGlobalSymbol(symbol, arity);
    }
    globalExtractSymbol(): Symbol {
      return deferredGlobalExtractSymbol || (deferredGlobalExtractSymbol = this.globalSymbol('Extract' as qu.__String, SymbolFlags.TypeAlias, qd.msgs.Cannot_find_global_type_0)!);
    }
    globalOmitSymbol(): Symbol {
      return deferredGlobalOmitSymbol || (deferredGlobalOmitSymbol = this.globalSymbol('Omit' as qu.__String, SymbolFlags.TypeAlias, qd.msgs.Cannot_find_global_type_0)!);
    }
    globalBigIntType(reportErrors: boolean) {
      return deferredGlobalBigIntType || (deferredGlobalBigIntType = this.globalType('BigInt' as qu.__String, 0, reportErrors)) || emptyObjectType;
    }
    arrayOrTupleTargetType(n: ArrayTyping | TupleTyping): GenericType {
      const readonly = qf.is.readonlyTypeOperator(n.parent);
      if (n.kind === Syntax.ArrayTyping || (n.elems.length === 1 && qf.is.tupleRestElem(n.elems[0]))) return readonly ? globalReadonlyArrayType : globalArrayType;
      const lastElem = lastOrUndefined(n.elems);
      const restElem = lastElem && qf.is.tupleRestElem(lastElem) ? lastElem : undefined;
      const minLength = findLastIndex(n.elems, (n) => !qf.is.tupleOptionalElem(n) && n !== restElem) + 1;
      const missingName = qu.some(n.elems, (e) => e.kind !== Syntax.NamedTupleMember);
      return this.tupleTypeOfArity(n.elems.length, minLength, !!restElem, readonly, missingName ? undefined : (n.elems as readonly NamedTupleMember[]));
    }
    typeFromArrayOrTupleTyping(n: ArrayTyping | TupleTyping): qt.Type {
      const links = this.nodeLinks(n);
      if (!links.resolvedType) {
        const target = this.arrayOrTupleTargetType(n);
        if (target === emptyGenericType) links.resolvedType = emptyObjectType;
        else if (qf.is.deferredTypingReference(n)) {
          links.resolvedType = n.kind === Syntax.TupleTyping && n.elems.length === 0 ? target : createDeferredTypeReference(target, n, undefined);
        } else {
          const elemTypes = n.kind === Syntax.ArrayTyping ? [this.typeFromTypeNode(n.elemType)] : map(n.elems, this.typeFromTypeNode);
          links.resolvedType = createTypeReference(target, elemTypes);
        }
      }
      return links.resolvedType;
    }
    tupleTypeOfArity(arity: number, minLength: number, hasRestElem: boolean, readonly: boolean, namedMemberDeclarations?: readonly (NamedTupleMember | ParameterDeclaration)[]): GenericType {
      const key =
        arity +
        (hasRestElem ? '+' : ',') +
        minLength +
        (readonly ? 'R' : '') +
        (namedMemberDeclarations && namedMemberDeclarations.length ? ',' + map(namedMemberDeclarations, this.nodeId).join(',') : '');
      let type = tupleTypes.get(key);
      if (!type) tupleTypes.set(key, (type = createTupleTypeOfArity(arity, minLength, hasRestElem, readonly, namedMemberDeclarations)));
      return type;
    }
    typeFromOptionalTyping(n: OptionalTyping): qt.Type {
      const type = this.typeFromTypeNode(n.type);
      return strictNullChecks ? this.optionalType(t) : type;
    }
    typeId(t: qt.Type) {
      return t.id;
    }
    unionType(types: readonly qt.Type[], unionReduction: UnionReduction = UnionReduction.Literal, aliasSymbol?: Symbol, aliasTypeArguments?: readonly qt.Type[]): qt.Type {
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
      return this.unionTypeFromSortedList(typeSet, objectFlags, aliasSymbol, aliasTypeArguments);
    }
    unionTypePredicate(signatures: readonly qt.Signature[]): TypePredicate | undefined {
      let first: TypePredicate | undefined;
      const types: qt.Type[] = [];
      for (const sig of signatures) {
        const pred = this.typePredicateOfSignature(sig);
        if (!pred || pred.kind === TypePredicateKind.AssertsThis || pred.kind === TypePredicateKind.AssertsIdentifier) continue;
        if (first) {
          if (!typePredicateKindsMatch(first, pred)) return;
        } else {
          first = pred;
        }
        types.push(pred.type);
      }
      if (!first) return;
      const unionType = this.unionType(types);
      return createTypePredicate(first.kind, first.parameterName, first.parameterIndex, unionType);
    }
    unionTypeFromSortedList(types: qt.Type[], objectFlags: ObjectFlags, aliasSymbol?: Symbol, aliasTypeArguments?: readonly qt.Type[]): qt.Type {
      if (types.length === 0) return neverType;
      if (types.length === 1) return types[0];
      const id = this.typeListId(types);
      let type = unionTypes.get(id);
      if (!type) {
        type = <UnionType>createType(TypeFlags.Union);
        unionTypes.set(id, type);
        t.objectFlags = objectFlags | this.propagatingFlagsOfTypes(types, qt.TypeFlags.Nullable);
        t.types = types;
        t.aliasSymbol = aliasSymbol;
        t.aliasTypeArguments = aliasTypeArguments;
      }
      return type;
    }
    typeFromUnionTyping(n: UnionTyping): qt.Type {
      const links = this.nodeLinks(n);
      if (!links.resolvedType) {
        const aliasSymbol = this.aliasSymbolForTypeNode(n);
        links.resolvedType = this.unionType(map(n.types, this.typeFromTypeNode), UnionReduction.Literal, aliasSymbol, this.typeArgumentsForAliasSymbol(aliasSymbol));
      }
      return links.resolvedType;
    }
    intersectionType(types: readonly qt.Type[], aliasSymbol?: Symbol, aliasTypeArguments?: readonly qt.Type[]): qt.Type {
      const typeMembershipMap: qu.QMap<Type> = new qu.QMap();
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
          if (intersectUnionsOfPrimitiveTypes(typeSet)) result = this.intersectionType(typeSet, aliasSymbol, aliasTypeArguments);
          else if (extractIrreducible(typeSet, qt.TypeFlags.Undefined)) {
            result = this.unionType([this.intersectionType(typeSet), undefinedType], UnionReduction.Literal, aliasSymbol, aliasTypeArguments);
          } else if (extractIrreducible(typeSet, qt.TypeFlags.Null)) {
            result = this.unionType([this.intersectionType(typeSet), nullType], UnionReduction.Literal, aliasSymbol, aliasTypeArguments);
          } else {
            const size = reduceLeft(typeSet, (n, t) => n * (t.flags & qt.TypeFlags.Union ? (<UnionType>t).types.length : 1), 1);
            if (size >= 100000) {
              error(currentNode, qd.msgs.Expression_produces_a_union_type_that_is_too_complex_to_represent);
              return errorType;
            }
            const unionIndex = findIndex(typeSet, (t) => (t.flags & qt.TypeFlags.Union) !== 0);
            const unionType = <UnionType>typeSet[unionIndex];
            result = this.unionType(
              map(unionType.types, (t) => this.intersectionType(replaceElem(typeSet, unionIndex, t))),
              UnionReduction.Literal,
              aliasSymbol,
              aliasTypeArguments
            );
          }
        } else {
          result = createIntersectionType(typeSet, aliasSymbol, aliasTypeArguments);
        }
        intersectionTypes.set(id, result);
      }
      return result;
    }
    typeFromIntersectionTyping(n: IntersectionTyping): qt.Type {
      const links = this.nodeLinks(n);
      if (!links.resolvedType) {
        const aliasSymbol = this.aliasSymbolForTypeNode(n);
        links.resolvedType = this.intersectionType(map(n.types, this.typeFromTypeNode), aliasSymbol, this.typeArgumentsForAliasSymbol(aliasSymbol));
      }
      return links.resolvedType;
    }
    indexTypeForGenericType(t: InstantiableType | UnionOrIntersectionType, stringsOnly: boolean) {
      return stringsOnly ? t.resolvedStringIndexType || (t.resolvedStringIndexType = createIndexType(t, true)) : t.resolvedIndexType || (t.resolvedIndexType = createIndexType(t, false));
    }
    literalTypeFromPropertyName(name: qt.PropertyName) {
      if (name.kind === Syntax.PrivateIdentifier) return neverType;
      return name.kind === Syntax.Identifier
        ? this.literalType(qy.get.unescUnderscores(name.escapedText))
        : this.regularTypeOfLiteralType(name.kind === Syntax.ComputedPropertyName ? qf.check.computedPropertyName(name) : qf.check.expression(name));
    }
    bigIntLiteralType(n: BigIntLiteral): LiteralType {
      return this.literalType({
        negative: false,
        base10Value: parsePseudoBigInt(n.text),
      });
    }
    literalTypeFromProperty(prop: Symbol, include: qt.TypeFlags) {
      if (!(this.declarationModifierFlagsFromSymbol(prop) & ModifierFlags.NonPublicAccessibilityModifier)) {
        let type = s.this.links(this.lateBoundSymbol(prop)).nameType;
        if (!type && !qf.is.knownSymbol(prop)) {
          if (prop.escName === InternalSymbol.Default) type = this.literalType('default');
          else {
            const name = prop.valueDeclaration && (this.declaration.nameOf(prop.valueDeclaration) as qt.PropertyName);
            type = (name && this.literalTypeFromPropertyName(name)) || this.literalType(prop.name);
          }
        }
        if (type && t.flags & include) return type;
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
        ? this.intersectionType(map((<IntersectionType>type).types, (t) => this.indexType(t, stringsOnly, noIndexSignatures)))
        : t.flags & qt.TypeFlags.Intersection
        ? this.unionType(map((<IntersectionType>type).types, (t) => this.indexType(t, stringsOnly, noIndexSignatures)))
        : maybeTypeOfKind(t, qt.TypeFlags.InstantiableNonPrimitive)
        ? this.indexTypeForGenericType(<InstantiableType | UnionOrIntersectionType>type, stringsOnly)
        : this.objectFlags(t) & ObjectFlags.Mapped
        ? filterType(this.constraintTypeFromMappedType(<MappedType>type), (t) => !(noIndexSignatures && t.flags & (TypeFlags.Any | qt.TypeFlags.String)))
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
    typeFromTypingOperator(n: TypingOperator): qt.Type {
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
        | StringLiteral
        | Identifier
        | qc.PrivateIdentifier
        | ObjectBindingPattern
        | ArrayBindingPattern
        | ComputedPropertyName
        | NumericLiteral
        | IndexedAccessTyping
        | ElemAccessExpression
        | SyntheticExpression
        | undefined
    ) {
      const accessExpression = accessNode && accessNode.kind === Syntax.ElemAccessExpression ? accessNode : undefined;
      return qf.is.typeUsableAsPropertyName(indexType)
        ? this.propertyNameFromType(indexType)
        : accessExpression && qf.check.thatExpressionIsProperSymbolReference(accessExpression.argumentExpression, indexType, false)
        ? qu.this.propertyNameForKnownSymbolName(idText((<PropertyAccessExpression>accessExpression.argumentExpression).name))
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
      accessNode: ElemAccessExpression | IndexedAccessTyping | qt.PropertyName | BindingName | SyntheticExpression | undefined,
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
              error(accessExpression.argumentExpression, qd.msgs.Cannot_assign_to_0_because_it_is_a_read_only_property, prop.symbolToString());
              return;
            }
            if (accessFlags & AccessFlags.CacheSymbol) this.nodeLinks(accessNode!).resolvedSymbol = prop;
            if (qf.is.thisPropertyAccessInConstructor(accessExpression, prop)) return autoType;
          }
          const propType = this.typeOfSymbol(prop);
          return accessExpression && this.assignmentTargetKind(accessExpression) !== AssignmentKind.Definite ? this.flow.typeOfReference(accessExpression, propType) : propType;
        }
        if (everyType(objectType, qf.is.tupleType) && NumericLiteral.name(propName) && +propName >= 0) {
          if (accessNode && everyType(objectType, (t) => !(<TupleTypeReference>t).target.hasRestElem) && !(accessFlags & AccessFlags.NoTupleBoundsCheck)) {
            const indexNode = this.indexNodeForAccessExpression(accessNode);
            if (qf.is.tupleType(objectType))
              error(indexNode, qd.msgs.Tuple_type_0_of_length_1_has_no_elem_at_index_2, typeToString(objectType), this.typeReferenceArity(objectType), qy.get.unescUnderscores(propName));
            else {
              error(indexNode, qd.msgs.Property_0_does_not_exist_on_type_1, qy.get.unescUnderscores(propName), typeToString(objectType));
            }
          }
          errorIfWritingToReadonlyIndex(this.indexInfoOfType(objectType, qt.IndexKind.Number));
          return mapType(objectType, (t) => this.restTypeOfTupleType(<TupleTypeReference>t) || undefinedType);
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
          else if (noImplicitAny && !compilerOptions.suppressImplicitAnyIndexErrors && !suppressNoImplicitAnyError) {
            if (propName !== undefined && typeHasStaticProperty(propName, objectType))
              error(accessExpression, qd.msgs.Property_0_is_a_static_member_of_type_1, propName as string, typeToString(objectType));
            else if (this.indexTypeOfType(objectType, qt.IndexKind.Number)) {
              error(accessExpression.argumentExpression, qd.msgs.Elem_implicitly_has_an_any_type_because_index_expression_is_not_of_type_number);
            } else {
              let suggestion: string | undefined;
              if (propName !== undefined && (suggestion = this.suggestionForNonexistentProperty(propName as string, objectType))) {
                if (suggestion !== undefined)
                  error(accessExpression.argumentExpression, qd.msgs.Property_0_does_not_exist_on_type_1_Did_you_mean_2, propName as string, typeToString(objectType), suggestion);
              } else {
                const suggestion = this.suggestionForNonexistentIndexSignature(objectType, accessExpression, indexType);
                if (suggestion !== undefined)
                  error(accessExpression, qd.msgs.Elem_implicitly_has_an_any_type_because_type_0_has_no_index_signature_Did_you_mean_to_call_1, typeToString(objectType), suggestion);
                else {
                  let errorInfo: qd.MessageChain | undefined;
                  if (indexType.flags & qt.TypeFlags.EnumLiteral)
                    errorInfo = chainqd.Messages(undefined, qd.msgs.Property_0_does_not_exist_on_type_1, '[' + typeToString(indexType) + ']', typeToString(objectType));
                  else if (indexType.flags & qt.TypeFlags.UniqueESSymbol) {
                    const symbolName = this.fullyQualifiedName((indexType as UniqueESSymbolType).symbol, accessExpression);
                    errorInfo = chainqd.Messages(undefined, qd.msgs.Property_0_does_not_exist_on_type_1, '[' + symbolName + ']', typeToString(objectType));
                  } else if (indexType.flags & qt.TypeFlags.StringLiteral) {
                    errorInfo = chainqd.Messages(undefined, qd.msgs.Property_0_does_not_exist_on_type_1, (indexType as StringLiteralType).value, typeToString(objectType));
                  } else if (indexType.flags & qt.TypeFlags.NumberLiteral) {
                    errorInfo = chainqd.Messages(undefined, qd.msgs.Property_0_does_not_exist_on_type_1, (indexType as NumberLiteralType).value, typeToString(objectType));
                  } else if (indexType.flags & (TypeFlags.Number | qt.TypeFlags.String)) {
                    errorInfo = chainqd.Messages(undefined, qd.msgs.No_index_signature_with_a_parameter_of_type_0_was_found_on_type_1, typeToString(indexType), typeToString(objectType));
                  }
                  errorInfo = chainqd.Messages(
                    errorInfo,
                    qd.msgs.Elem_implicitly_has_an_any_type_because_expression_of_type_0_can_t_be_used_to_index_type_1,
                    typeToString(fullIndexType),
                    typeToString(objectType)
                  );
                  diagnostics.add(qf.create.diagnosticForNodeFromMessageChain(accessExpression, errorInfo));
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
          error(indexNode, qd.msgs.Property_0_does_not_exist_on_type_1, '' + (<StringLiteralType | NumberLiteralType>indexType).value, typeToString(objectType));
        else if (indexType.flags & (TypeFlags.String | qt.TypeFlags.Number)) {
          error(indexNode, qd.msgs.Type_0_has_no_matching_index_signature_for_type_1, typeToString(objectType), typeToString(indexType));
        } else {
          error(indexNode, qd.msgs.Type_0_cannot_be_used_as_an_index_type, typeToString(indexType));
        }
      }
      if (qf.is.typeAny(indexType)) return indexType;
      return;
      const errorIfWritingToReadonlyIndex = (indexInfo: IndexInfo | undefined) => {
        if (indexInfo && indexInfo.isReadonly && accessExpression && (qf.is.assignmentTarget(accessExpression) || qf.is.deleteTarget(accessExpression)))
          error(accessExpression, qd.msgs.Index_signature_in_type_0_only_permits_reading, typeToString(objectType));
      };
    }
    indexNodeForAccessExpression(accessNode: ElemAccessExpression | IndexedAccessTyping | qt.PropertyName | BindingName | SyntheticExpression) {
      return accessNode.kind === Syntax.ElemAccessExpression
        ? accessNode.argumentExpression
        : accessNode.kind === Syntax.IndexedAccessTyping
        ? accessNode.indexType
        : accessNode.kind === Syntax.ComputedPropertyName
        ? accessNode.expression
        : accessNode;
    }
    simplifiedType(t: qt.Type, writing: boolean): qt.Type {
      return t.flags & qt.TypeFlags.IndexedAccess
        ? this.simplifiedIndexedAccessType(<IndexedAccessType>type, writing)
        : t.flags & qt.TypeFlags.Conditional
        ? this.simplifiedConditionalType(<ConditionalType>type, writing)
        : type;
    }
    simplifiedIndexedAccessType(t: IndexedAccessType, writing: boolean): qt.Type {
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
    simplifiedConditionalType(t: ConditionalType, writing: boolean) {
      const checkType = t.checkType;
      const extendsType = t.extendsType;
      const trueType = this.trueTypeFromConditionalType(t);
      const falseType = this.falseTypeFromConditionalType(t);
      if (falseType.flags & qt.TypeFlags.Never && this.actualTypeVariable(trueType) === this.actualTypeVariable(checkType)) {
        if (checkType.flags & qt.TypeFlags.Any || qf.is.typeAssignableTo(this.restrictiveInstantiation(checkType), this.restrictiveInstantiation(extendsType)))
          return this.simplifiedType(trueType, writing);
        else if (qf.is.intersectionEmpty(checkType, extendsType)) return neverType;
      } else if (trueType.flags & qt.TypeFlags.Never && this.actualTypeVariable(falseType) === this.actualTypeVariable(checkType)) {
        if (!(checkType.flags & qt.TypeFlags.Any) && qf.is.typeAssignableTo(this.restrictiveInstantiation(checkType), this.restrictiveInstantiation(extendsType))) return neverType;
        else if (checkType.flags & qt.TypeFlags.Any || qf.is.intersectionEmpty(checkType, extendsType)) return this.simplifiedType(falseType, writing);
      }
      return type;
    }
    indexedAccessType(objectType: qt.Type, indexType: qt.Type, accessNode?: ElemAccessExpression | IndexedAccessTyping | qt.PropertyName | BindingName | SyntheticExpression): qt.Type {
      return this.indexedAccessTypeOrUndefined(objectType, indexType, accessNode, AccessFlags.None) || (accessNode ? errorType : unknownType);
    }
    indexedAccessTypeOrUndefined(
      objectType: qt.Type,
      indexType: qt.Type,
      accessNode?: ElemAccessExpression | IndexedAccessTyping | qt.PropertyName | BindingName | SyntheticExpression,
      accessFlags = AccessFlags.None
    ): qt.Type | undefined {
      if (objectType === wildcardType || indexType === wildcardType) return wildcardType;
      if (qf.is.stringIndexSignatureOnlyType(objectType) && !(indexType.flags & qt.TypeFlags.Nullable) && qf.is.typeAssignableToKind(indexType, qt.TypeFlags.String | qt.TypeFlags.Number))
        indexType = stringType;
      if (qf.is.genericIndexType(indexType) || (!(accessNode && accessNode.kind !== Syntax.IndexedAccessTyping) && qf.is.genericObjectType(objectType))) {
        if (objectType.flags & qt.TypeFlags.AnyOrUnknown) return objectType;
        const id = objectType.id + ',' + indexType.id;
        let type = indexedAccessTypes.get(id);
        if (!type) indexedAccessTypes.set(id, (type = createIndexedAccessType(objectType, indexType)));
        return type;
      }
      const apparentObjectType = this.reducedApparentType(objectType);
      if (indexType.flags & qt.TypeFlags.Union && !(indexType.flags & qt.TypeFlags.Boolean)) {
        const propTypes: qt.Type[] = [];
        let wasMissingProp = false;
        for (const t of (<UnionType>indexType).types) {
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
    typeFromIndexedAccessTyping(n: IndexedAccessTyping) {
      const links = this.nodeLinks(n);
      if (!links.resolvedType) {
        const objectType = this.typeFromTypeNode(n.objectType);
        const indexType = this.typeFromTypeNode(n.indexType);
        const resolved = this.indexedAccessType(objectType, indexType, n);
        links.resolvedType =
          resolved.flags & qt.TypeFlags.IndexedAccess && (<IndexedAccessType>resolved).objectType === objectType && (<IndexedAccessType>resolved).indexType === indexType
            ? this.conditionalFlowTypeOfType(resolved, n)
            : resolved;
      }
      return links.resolvedType;
    }
    typeFromMappedTyping(n: MappedTyping): qt.Type {
      const links = this.nodeLinks(n);
      if (!links.resolvedType) {
        const type = <MappedType>createObjectType(ObjectFlags.Mapped, n.symbol);
        t.declaration = n;
        t.aliasSymbol = this.aliasSymbolForTypeNode(n);
        t.aliasTypeArguments = this.typeArgumentsForAliasSymbol(t.aliasSymbol);
        links.resolvedType = type;
        this.constraintTypeFromMappedType(t);
      }
      return links.resolvedType;
    }
    actualTypeVariable(t: qt.Type): qt.Type {
      if (t.flags & qt.TypeFlags.Substitution) return (<SubstitutionType>type).baseType;
      if (t.flags & qt.TypeFlags.IndexedAccess && ((<IndexedAccessType>type).objectType.flags & qt.TypeFlags.Substitution || (<IndexedAccessType>type).indexType.flags & qt.TypeFlags.Substitution))
        return this.indexedAccessType(this.actualTypeVariable((<IndexedAccessType>type).objectType), this.actualTypeVariable((<IndexedAccessType>type).indexType));
      return type;
    }
    conditionalType(root: ConditionalRoot, mapper: TypeMapper | undefined): qt.Type {
      let result;
      let extraTypes: qt.Type[] | undefined;
      while (true) {
        const checkType = instantiateType(root.checkType, mapper);
        const checkTypeInstantiable = qf.is.genericObjectType(checkType) || qf.is.genericIndexType(checkType);
        const extendsType = instantiateType(root.extendsType, mapper);
        if (checkType === wildcardType || extendsType === wildcardType) return wildcardType;
        let combinedMapper: TypeMapper | undefined;
        if (root.inferTypeParameters) {
          const context = createInferenceContext(root.inferTypeParameters, undefined, InferenceFlags.None);
          if (!checkTypeInstantiable || !some(root.inferTypeParameters, (t) => t === extendsType))
            inferTypes(context.inferences, checkType, extendsType, InferencePriority.NoConstraints | InferencePriority.AlwaysStrict);
          combinedMapper = mergeTypeMappers(mapper, context.mapper);
        }
        const inferredExtendsType = combinedMapper ? instantiateType(root.extendsType, combinedMapper) : extendsType;
        if (!checkTypeInstantiable && !qf.is.genericObjectType(inferredExtendsType) && !qf.is.genericIndexType(inferredExtendsType)) {
          if (
            !(inferredExtendsType.flags & qt.TypeFlags.AnyOrUnknown) &&
            (checkType.flags & qt.TypeFlags.Any || !qf.is.typeAssignableTo(this.permissiveInstantiation(checkType), this.permissiveInstantiation(inferredExtendsType)))
          ) {
            if (checkType.flags & qt.TypeFlags.Any) (extraTypes || (extraTypes = [])).push(instantiateTypeWithoutDepthIncrease(root.trueType, combinedMapper || mapper));
            const falseType = root.falseType;
            if (falseType.flags & qt.TypeFlags.Conditional) {
              const newRoot = (<ConditionalType>falseType).root;
              if (newRoot.node.parent === root.node && (!newRoot.isDistributive || newRoot.checkType === root.checkType)) {
                root = newRoot;
                continue;
              }
            }
            result = instantiateTypeWithoutDepthIncrease(falseType, mapper);
            break;
          }
          if (inferredExtendsType.flags & qt.TypeFlags.AnyOrUnknown || qf.is.typeAssignableTo(this.restrictiveInstantiation(checkType), this.restrictiveInstantiation(inferredExtendsType))) {
            result = instantiateTypeWithoutDepthIncrease(root.trueType, combinedMapper || mapper);
            break;
          }
        }
        const erasedCheckType = this.actualTypeVariable(checkType);
        result = <ConditionalType>createType(TypeFlags.Conditional);
        result.root = root;
        result.checkType = erasedCheckType;
        result.extendsType = extendsType;
        result.mapper = mapper;
        result.combinedMapper = combinedMapper;
        result.aliasSymbol = root.aliasSymbol;
        result.aliasTypeArguments = instantiateTypes(root.aliasTypeArguments, mapper!);
        break;
      }
      return extraTypes ? this.unionType(append(extraTypes, result)) : result;
    }
    trueTypeFromConditionalType(t: ConditionalType) {
      return t.resolvedTrueType || (t.resolvedTrueType = instantiateType(t.root.trueType, t.mapper));
    }
    falseTypeFromConditionalType(t: ConditionalType) {
      return t.resolvedFalseType || (t.resolvedFalseType = instantiateType(t.root.falseType, t.mapper));
    }
    inferredTrueTypeFromConditionalType(t: ConditionalType) {
      return t.resolvedInferredTrueType || (t.resolvedInferredTrueType = t.combinedMapper ? instantiateType(t.root.trueType, t.combinedMapper) : this.trueTypeFromConditionalType(t));
    }
    inferTypeParameters(n: ConditionalTyping): TypeParameter[] | undefined {
      let result: TypeParameter[] | undefined;
      if (n.locals) {
        n.locals.forEach((symbol) => {
          if (symbol.flags & SymbolFlags.TypeParameter) result = append(result, this.declaredTypeOfSymbol(symbol));
        });
      }
      return result;
    }
    typeFromConditionalTyping(n: ConditionalTyping): qt.Type {
      const links = this.nodeLinks(n);
      if (!links.resolvedType) {
        const checkType = this.typeFromTypeNode(n.checkType);
        const aliasSymbol = this.aliasSymbolForTypeNode(n);
        const aliasTypeArguments = this.typeArgumentsForAliasSymbol(aliasSymbol);
        const allOuterTypeParameters = this.outerTypeParameters(n, true);
        const outerTypeParameters = aliasTypeArguments ? allOuterTypeParameters : filter(allOuterTypeParameters, (tp) => qf.is.typeParameterPossiblyReferenced(tp, n));
        const root: ConditionalRoot = {
          n: n,
          checkType,
          extendsType: this.typeFromTypeNode(n.extendsType),
          trueType: this.typeFromTypeNode(n.trueType),
          falseType: this.typeFromTypeNode(n.falseType),
          isDistributive: !!(checkType.flags & qt.TypeFlags.TypeParameter),
          inferTypeParameters: this.inferTypeParameters(n),
          outerTypeParameters,
          instantiations: undefined,
          aliasSymbol,
          aliasTypeArguments,
        };
        links.resolvedType = this.conditionalType(root, undefined);
        if (outerTypeParameters) {
          root.instantiations = new qu.QMap<Type>();
          root.instantiations.set(this.typeListId(outerTypeParameters), links.resolvedType);
        }
      }
      return links.resolvedType;
    }
    typeFromInferTyping(n: InferTyping): qt.Type {
      const links = this.nodeLinks(n);
      if (!links.resolvedType) links.resolvedType = this.declaredTypeOfTypeParameter(this.symbolOfNode(n.typeParameter));
      return links.resolvedType;
    }
    identifierChain(n: qt.EntityName): Identifier[] {
      if (n.kind === Syntax.Identifier) return [n];
      return append(this.identifierChain(n.left), n.right);
    }
    typeFromImportTyping(n: ImportTyping): qt.Type {
      const links = this.nodeLinks(n);
      if (!links.resolvedType) {
        if (n.isTypeOf && n.typeArguments) {
          error(n, qd.msgs.Type_arguments_cannot_be_used_here);
          links.resolvedSymbol = unknownSymbol;
          return (links.resolvedType = errorType);
        }
        if (!qf.is.literalImportTyping(n)) {
          error(n.argument, qd.msgs.String_literal_expected);
          links.resolvedSymbol = unknownSymbol;
          return (links.resolvedType = errorType);
        }
        const targetMeaning = n.isTypeOf ? SymbolFlags.Value : n.flags & NodeFlags.Doc ? SymbolFlags.Value | SymbolFlags.Type : SymbolFlags.Type;
        const innerModuleSymbol = resolveExternalModuleName(n, n.argument.literal);
        if (!innerModuleSymbol) {
          links.resolvedSymbol = unknownSymbol;
          return (links.resolvedType = errorType);
        }
        const moduleSymbol = resolveExternalModuleSymbol(innerModuleSymbol, false);
        if (!qf.is.missing(n.qualifier)) {
          const nameStack: Identifier[] = this.identifierChain(n.qualifier!);
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
            error(n, errorMessage, n.argument.literal.text);
            links.resolvedSymbol = unknownSymbol;
            links.resolvedType = errorType;
          }
        }
      }
      return links.resolvedType;
    }
    typeFromTypeLiteralOrFunctionOrConstructorTyping(n: Typing): qt.Type {
      const links = this.nodeLinks(n);
      if (!links.resolvedType) {
        const aliasSymbol = this.aliasSymbolForTypeNode(n);
        if (this.membersOfSymbol(n.symbol).size === 0 && !aliasSymbol) links.resolvedType = emptyTypeLiteralType;
        else {
          let type = createObjectType(ObjectFlags.Anonymous, n.symbol);
          t.aliasSymbol = aliasSymbol;
          t.aliasTypeArguments = this.typeArgumentsForAliasSymbol(aliasSymbol);
          if (n.kind === Syntax.DocTypingLiteral && n.qf.is.arrayType) type = createArrayType(t);
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
    typeArgumentsForAliasSymbol(symbol: Symbol | undefined) {
      return symbol ? this.this.localTypeParametersOfClassOrInterfaceOrTypeAlias() : undefined;
    }
    spreadType(left: qt.Type, right: qt.Type, symbol: Symbol | undefined, objectFlags: ObjectFlags, readonly: boolean): qt.Type {
      if (left.flags & qt.TypeFlags.Any || right.flags & qt.TypeFlags.Any) return anyType;
      if (left.flags & qt.TypeFlags.Unknown || right.flags & qt.TypeFlags.Unknown) return unknownType;
      if (left.flags & qt.TypeFlags.Never) return right;
      if (right.flags & qt.TypeFlags.Never) return left;
      if (left.flags & qt.TypeFlags.Union) {
        const merged = tryMergeUnionOfObjectTypeAndEmptyObject(left as UnionType, readonly);
        if (merged) return this.spreadType(merged, right, symbol, objectFlags, readonly);
        return mapType(left, (t) => this.spreadType(t, right, symbol, objectFlags, readonly));
      }
      if (right.flags & qt.TypeFlags.Union) {
        const merged = tryMergeUnionOfObjectTypeAndEmptyObject(right as UnionType, readonly);
        if (merged) return this.spreadType(left, merged, symbol, objectFlags, readonly);
        return mapType(right, (t) => this.spreadType(left, t, symbol, objectFlags, readonly));
      }
      if (right.flags & (TypeFlags.BooleanLike | qt.TypeFlags.NumberLike | qt.TypeFlags.BigIntLike | qt.TypeFlags.StringLike | qt.TypeFlags.EnumLike | qt.TypeFlags.NonPrimitive | qt.TypeFlags.Index))
        return left;
      if (qf.is.genericObjectType(left) || qf.is.genericObjectType(right)) {
        if (qf.is.emptyObjectType(left)) return right;
        if (left.flags & qt.TypeFlags.Intersection) {
          const types = (<IntersectionType>left).types;
          const lastLeft = types[types.length - 1];
          if (qf.is.nonGenericObjectType(lastLeft) && qf.is.nonGenericObjectType(right))
            return this.intersectionType(concatenate(types.slice(0, types.length - 1), [this.spreadType(lastLeft, right, symbol, objectFlags, readonly)]));
        }
        return this.intersectionType([left, right]);
      }
      const members = new SymbolTable();
      const skippedPrivateMembers = qu.createEscapedMap<boolean>();
      let stringIndexInfo: IndexInfo | undefined;
      let numberIndexInfo: IndexInfo | undefined;
      if (left === emptyObjectType) {
        stringIndexInfo = this.indexInfoOfType(right, qt.IndexKind.String);
        numberIndexInfo = this.indexInfoOfType(right, qt.IndexKind.Number);
      } else {
        stringIndexInfo = unionSpreadIndexInfos(this.indexInfoOfType(left, qt.IndexKind.String), this.indexInfoOfType(right, qt.IndexKind.String));
        numberIndexInfo = unionSpreadIndexInfos(this.indexInfoOfType(left, qt.IndexKind.Number), this.indexInfoOfType(right, qt.IndexKind.Number));
      }
      for (const rightProp of this.propertiesOfType(right)) {
        if (this.declarationModifierFlagsFromSymbol(rightProp) & (ModifierFlags.Private | ModifierFlags.Protected)) skippedPrivateMembers.set(rightProp.escName, true);
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
            const result = new Symbol(flags, leftProp.escName);
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
      const spread = createAnonymousType(symbol, members, empty, empty, this.indexInfoWithReadonly(stringIndexInfo, readonly), this.indexInfoWithReadonly(numberIndexInfo, readonly));
      spread.objectFlags |= ObjectFlags.ObjectLiteral | ObjectFlags.ContainsObjectOrArrayLiteral | ObjectFlags.ContainsSpread | objectFlags;
      return spread;
    }
    spreadSymbol(prop: Symbol, readonly: boolean) {
      const isSetonlyAccessor = prop.flags & SymbolFlags.SetAccessor && !(prop.flags & SymbolFlags.GetAccessor);
      if (!isSetonlyAccessor && readonly === qf.is.readonlySymbol(prop)) return prop;
      const flags = SymbolFlags.Property | (prop.flags & SymbolFlags.Optional);
      const result = new Symbol(flags, prop.escName, readonly ? qt.CheckFlags.Readonly : 0);
      result.type = isSetonlyAccessor ? undefinedType : this.typeOfSymbol(prop);
      result.declarations = prop.declarations;
      result.nameType = s.this.links(prop).nameType;
      result.syntheticOrigin = prop;
      return result;
    }
    indexInfoWithReadonly(info: IndexInfo | undefined, readonly: boolean) {
      return info && info.isReadonly !== readonly ? createIndexInfo(info.type, readonly, info.declaration) : info;
    }
    freshTypeOfLiteralType(t: qt.Type): qt.Type {
      if (t.flags & qt.TypeFlags.Literal) {
        if (!(<LiteralType>type).freshType) {
          const freshType = createLiteralType(t.flags, (<LiteralType>type).value, (<LiteralType>type).symbol);
          freshType.regularType = <LiteralType>type;
          freshType.freshType = freshType;
          (<LiteralType>type).freshType = freshType;
        }
        return (<LiteralType>type).freshType;
      }
      return type;
    }
    regularTypeOfLiteralType(t: qt.Type): qt.Type {
      return t.flags & qt.TypeFlags.Literal
        ? (<LiteralType>type).regularType
        : t.flags & qt.TypeFlags.Union
        ? (<UnionType>type).regularType || ((<UnionType>type).regularType = this.unionType(sameMap((<UnionType>type).types, getRegularTypeOfLiteralType)) as UnionType)
        : type;
    }
    literalType(value: string | number | PseudoBigInt, enumId?: number, symbol?: Symbol) {
      const qualifier = typeof value === 'number' ? '#' : typeof value === 'string' ? '@' : 'n';
      const key = (enumId ? enumId : '') + qualifier + (typeof value === 'object' ? pseudoBigIntToString(value) : value);
      let type = literalTypes.get(key);
      if (!type) {
        const flags =
          (typeof value === 'number' ? qt.TypeFlags.NumberLiteral : typeof value === 'string' ? qt.TypeFlags.StringLiteral : qt.TypeFlags.BigIntLiteral) | (enumId ? qt.TypeFlags.EnumLiteral : 0);
        literalTypes.set(key, (type = createLiteralType(flags, value, symbol)));
        t.regularType = type;
      }
      return type;
    }
    typeFromLiteralTyping(n: LiteralTyping): qt.Type {
      const links = this.nodeLinks(n);
      if (!links.resolvedType) links.resolvedType = this.regularTypeOfLiteralType(qf.check.expression(n.literal));
      return links.resolvedType;
    }
    eSSymbolLikeTypeForNode(n: Node) {
      if (qf.is.validESSymbolDeclaration(n)) {
        const symbol = this.symbolOfNode(n);
        const links = s.this.links(symbol);
        return links.uniqueESSymbolType || (links.uniqueESSymbolType = createUniqueESSymbolType(symbol));
      }
      return esSymbolType;
    }
    thisType(n: Node): qt.Type {
      const container = this.thisContainer(n, false);
      const parent = container && container.parent;
      if (parent && (qf.is.classLike(parent) || parent?.kind === Syntax.InterfaceDeclaration)) {
        if (!qf.has.syntacticModifier(container, ModifierFlags.Static) && (!container.kind === Syntax.ConstructorDeclaration || qf.is.descendantOf(n, container.body)))
          return this.declaredTypeOfClassOrInterface(this.symbolOfNode(parent as ClassLikeDeclaration | InterfaceDeclaration)).thisType!;
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
    typeFromThisNodeTypeNode(n: ThisExpression | ThisTyping): qt.Type {
      const links = this.nodeLinks(n);
      if (!links.resolvedType) links.resolvedType = this.thisType(n);
      return links.resolvedType;
    }
    typeFromNamedTupleTyping(n: NamedTupleMember): qt.Type {
      const links = this.nodeLinks(n);
      if (!links.resolvedType) {
        let type = this.typeFromTypeNode(n.type);
        if (n.dot3Token) type = this.elemTypeOfArrayType(t) || errorType;
        if (n.questionToken && strictNullChecks) type = this.optionalType(t);
        links.resolvedType = type;
      }
      return links.resolvedType;
    }
    typeFromTypeNode(n: Typing): qt.Type {
      return this.conditionalFlowTypeOfType(this.typeFromTypeNodeWorker(n), n);
    }
    typeFromTypeNodeWorker(n: Typing): qt.Type {
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
          return this.typeFromThisNodeTypeNode(n as ThisExpression | ThisTyping);
        case Syntax.LiteralTyping:
          return this.typeFromLiteralTyping(<LiteralTyping>n);
        case Syntax.TypingReference:
          return this.typeFromTypeReference(<TypingReference>n);
        case Syntax.TypingPredicate:
          return (<TypingPredicate>n).assertsModifier ? voidType : booleanType;
        case Syntax.ExpressionWithTypings:
          return this.typeFromTypeReference(<ExpressionWithTypings>n);
        case Syntax.TypingQuery:
          return this.typeFromTypingQuery(<TypingQuery>n);
        case Syntax.ArrayTyping:
        case Syntax.TupleTyping:
          return this.typeFromArrayOrTupleTyping(<ArrayTyping | TupleTyping>n);
        case Syntax.OptionalTyping:
          return this.typeFromOptionalTyping(<OptionalTyping>n);
        case Syntax.UnionTyping:
          return this.typeFromUnionTyping(<UnionTyping>n);
        case Syntax.IntersectionTyping:
          return this.typeFromIntersectionTyping(<IntersectionTyping>n);
        case Syntax.DocNullableTyping:
          return this.typeFromDocNullableTypingNode(<DocNullableTyping>n);
        case Syntax.DocOptionalTyping:
          return addOptionality(this.typeFromTypeNode((n as DocOptionalTyping).type));
        case Syntax.NamedTupleMember:
          return this.typeFromNamedTupleTyping(n as NamedTupleMember);
        case Syntax.ParenthesizedTyping:
        case Syntax.DocNonNullableTyping:
        case Syntax.DocTypingExpression:
          return this.typeFromTypeNode((<ParenthesizedTyping | DocTypeReferencingNode | DocTypingExpression | NamedTupleMember>n).type);
        case Syntax.RestTyping:
          return this.elemTypeOfArrayType(this.typeFromTypeNode((<RestTyping>n).type)) || errorType;
        case Syntax.DocVariadicTyping:
          return this.typeFromDocVariadicTyping(n as DocVariadicTyping);
        case Syntax.FunctionTyping:
        case Syntax.ConstructorTyping:
        case Syntax.TypingLiteral:
        case Syntax.DocTypingLiteral:
        case Syntax.DocFunctionTyping:
        case Syntax.DocSignature:
          return this.typeFromTypeLiteralOrFunctionOrConstructorTyping(n);
        case Syntax.TypingOperator:
          return this.typeFromTypingOperator(<TypingOperator>n);
        case Syntax.IndexedAccessTyping:
          return this.typeFromIndexedAccessTyping(<IndexedAccessTyping>n);
        case Syntax.MappedTyping:
          return this.typeFromMappedTyping(<MappedTyping>n);
        case Syntax.ConditionalTyping:
          return this.typeFromConditionalTyping(<ConditionalTyping>n);
        case Syntax.InferTyping:
          return this.typeFromInferTyping(<InferTyping>n);
        case Syntax.ImportTyping:
          return this.typeFromImportTyping(<ImportTyping>n);
        case Syntax.Identifier:
        case Syntax.QualifiedName:
          const symbol = this.symbolAtLocation(n);
          return symbol ? this.declaredTypeOfSymbol(symbol) : errorType;
        default:
          return errorType;
      }
    }
    mappedType(t: qt.Type, mapper: TypeMapper): qt.Type {
      switch (mapper.kind) {
        case TypeMapKind.Simple:
          return type === mapper.source ? mapper.target : type;
        case TypeMapKind.Array:
          const sources = mapper.sources;
          const targets = mapper.targets;
          for (let i = 0; i < sources.length; i++) {
            if (type === sources[i]) return targets ? targets[i] : anyType;
          }
          return type;
        case TypeMapKind.Function:
          return mapper.func(t);
        case TypeMapKind.Composite:
        case TypeMapKind.Merged:
          const t1 = this.mappedType(t, mapper.mapper1);
          return t1 !== type && mapper.kind === TypeMapKind.Composite ? instantiateType(t1, mapper.mapper2) : this.mappedType(t1, mapper.mapper2);
      }
    }
    restrictiveTypeParameter(tp: TypeParameter) {
      return tp.constraint === unknownType
        ? tp
        : tp.restrictiveInstantiation ||
            ((tp.restrictiveInstantiation = createTypeParameter(tp.symbol)), ((tp.restrictiveInstantiation as TypeParameter).constraint = unknownType), tp.restrictiveInstantiation);
    }
    objectTypeInstantiation(t: AnonymousType | DeferredTypeReference, mapper: TypeMapper) {
      const target = t.objectFlags & ObjectFlags.Instantiated ? t.target! : type;
      const n = t.objectFlags & ObjectFlags.Reference ? (<TypeReference>type).node! : t.symbol.declarations[0];
      const links = this.nodeLinks(n);
      let typeParameters = links.outerTypeParameters;
      if (!typeParameters) {
        let declaration = n;
        if (qf.is.inJSFile(declaration)) {
          const paramTag = qc.findAncestor(declaration, isDocParameterTag);
          if (paramTag) {
            const paramSymbol = this.parameterSymbolFromDoc(paramTag);
            if (paramSymbol) declaration = paramSymbol.valueDeclaration;
          }
        }
        let outerTypeParameters = this.outerTypeParameters(declaration, true);
        if (qf.is.jsConstructor(declaration)) {
          const templateTagParameters = this.typeParametersFromDeclaration(declaration as DeclarationWithTypeParameters);
          outerTypeParameters = addRange(outerTypeParameters, templateTagParameters);
        }
        typeParameters = outerTypeParameters || empty;
        typeParameters =
          (target.objectFlags & ObjectFlags.Reference || target.symbol.flags & SymbolFlags.TypeLiteral) && !target.aliasTypeArguments
            ? filter(typeParameters, (tp) => qf.is.typeParameterPossiblyReferenced(tp, declaration))
            : typeParameters;
        links.outerTypeParameters = typeParameters;
        if (typeParameters.length) {
          links.instantiations = new qu.QMap<Type>();
          links.instantiations.set(this.typeListId(typeParameters), target);
        }
      }
      if (typeParameters.length) {
        const combinedMapper = combineTypeMappers(t.mapper, mapper);
        const typeArguments = map(typeParameters, (t) => this.mappedType(t, combinedMapper));
        const id = this.typeListId(typeArguments);
        let result = links.instantiations!.get(id);
        if (!result) {
          const newMapper = createTypeMapper(typeParameters, typeArguments);
          result =
            target.objectFlags & ObjectFlags.Reference
              ? createDeferredTypeReference((<DeferredTypeReference>type).target, (<DeferredTypeReference>type).node, newMapper)
              : target.objectFlags & ObjectFlags.Mapped
              ? instantiateMappedType(<MappedType>target, newMapper)
              : instantiateAnonymousType(target, newMapper);
          links.instantiations!.set(id, result);
        }
        return result;
      }
      return type;
    }
    homomorphicTypeVariable(t: MappedType) {
      const constraintType = this.constraintTypeFromMappedType(t);
      if (constraintType.flags & qt.TypeFlags.Index) {
        const typeVariable = this.actualTypeVariable((<IndexType>constraintType).type);
        if (typeVariable.flags & qt.TypeFlags.TypeParameter) return <TypeParameter>typeVariable;
      }
      return;
    }
    modifiedReadonlyState(state: boolean, modifiers: MappedTypeModifiers) {
      return modifiers & MappedTypeModifiers.IncludeReadonly ? true : modifiers & MappedTypeModifiers.ExcludeReadonly ? false : state;
    }
    conditionalTypeInstantiation(t: ConditionalType, mapper: TypeMapper): qt.Type {
      const root = t.root;
      if (root.outerTypeParameters) {
        const typeArguments = map(root.outerTypeParameters, (t) => this.mappedType(t, mapper));
        const id = this.typeListId(typeArguments);
        let result = root.instantiations!.get(id);
        if (!result) {
          const newMapper = createTypeMapper(root.outerTypeParameters, typeArguments);
          result = instantiateConditionalType(root, newMapper);
          root.instantiations!.set(id, result);
        }
        return result;
      }
      return type;
    }
    permissiveInstantiation(t: qt.Type) {
      return t.flags & (TypeFlags.Primitive | qt.TypeFlags.AnyOrUnknown | qt.TypeFlags.Never) ? type : t.permissiveInstantiation || (t.permissiveInstantiation = instantiateType(t, permissiveMapper));
    }
    restrictiveInstantiation(t: qt.Type) {
      if (t.flags & (TypeFlags.Primitive | qt.TypeFlags.AnyOrUnknown | qt.TypeFlags.Never)) return type;
      if (t.restrictiveInstantiation) return t.restrictiveInstantiation;
      t.restrictiveInstantiation = instantiateType(t, restrictiveMapper);
      t.restrictiveInstantiation.restrictiveInstantiation = t.restrictiveInstantiation;
      return t.restrictiveInstantiation;
    }
    typeWithoutSignatures(t: qt.Type): qt.Type {
      if (t.flags & qt.TypeFlags.Object) {
        const resolved = resolveStructuredTypeMembers(<ObjectType>type);
        if (resolved.constructSignatures.length || resolved.callSignatures.length) {
          const result = createObjectType(ObjectFlags.Anonymous, t.symbol);
          result.members = resolved.members;
          result.properties = resolved.properties;
          result.callSignatures = empty;
          result.constructSignatures = empty;
          return result;
        }
      } else if (t.flags & qt.TypeFlags.Intersection) {
        return this.intersectionType(map((<IntersectionType>type).types, getTypeWithoutSignatures));
      }
      return type;
    }
    bestMatchIndexedAccessTypeOrUndefined(source: qt.Type, target: qt.Type, nameType: qt.Type) {
      const idx = this.indexedAccessTypeOrUndefined(target, nameType);
      if (idx) return idx;
      if (target.flags & qt.TypeFlags.Union) {
        const best = this.bestMatchingType(source, target as UnionType);
        if (best) return this.indexedAccessTypeOrUndefined(best, nameType);
      }
    }
    elaborationElemForJsxChild(child: JsxChild, nameType: LiteralType, getInvalidTextDiagnostic: () => qd.Message) {
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
    semanticJsxChildren(children: Nodes<JsxChild>) {
      return filter(children, (i) => !i.kind === Syntax.JsxText || !i.onlyTriviaWhitespaces);
    }
    normalizedType(t: qt.Type, writing: boolean): qt.Type {
      while (true) {
        const t = qf.is.freshLiteralType(t)
          ? (<FreshableType>type).regularType
          : this.objectFlags(t) & ObjectFlags.Reference && (<TypeReference>type).node
          ? createTypeReference((<TypeReference>type).target, this.typeArguments(<TypeReference>type))
          : t.flags & qt.TypeFlags.UnionOrIntersection
          ? this.reducedType(t)
          : t.flags & qt.TypeFlags.Substitution
          ? writing
            ? (<SubstitutionType>type).baseType
            : (<SubstitutionType>type).substitute
          : t.flags & qt.TypeFlags.Simplifiable
          ? this.simplifiedType(t, writing)
          : type;
        if (t === type) break;
        type = t;
      }
      return type;
    }
    bestMatchingType(source: qt.Type, target: UnionOrIntersectionType, isRelatedTo = compareTypesAssignable) {
      return (
        findMatchingDiscriminantType(source, target, isRelatedTo, true) ||
        findMatchingTypeReferenceOrTypeAliasReference(source, target) ||
        findBestTypeForObjectLiteral(source, target) ||
        findBestTypeForInvokable(source, target) ||
        findMostOverlappyType(source, target)
      );
    }
    markerTypeReference(t: GenericType, source: TypeParameter, target: qt.Type) {
      const result = createTypeReference(
        type,
        map(t.typeParameters, (t) => (t === source ? target : t))
      );
      result.objectFlags |= ObjectFlags.MarkerType;
      return result;
    }
    variancesWorker<TCache extends { variances?: VarianceFlags[] }>(
      typeParameters: readonly TypeParameter[] = empty,
      cache: TCache,
      createMarkerType: (input: TCache, param: TypeParameter, marker: qt.Type) => Type
    ): VarianceFlags[] {
      let variances = cache.variances;
      if (!variances) {
        cache.variances = empty;
        variances = [];
        for (const tp of typeParameters) {
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
    variances(t: GenericType): VarianceFlags[] {
      if (type === globalArrayType || type === globalReadonlyArrayType || t.objectFlags & ObjectFlags.Tuple) return arrayVariances;
      return this.variancesWorker(t.typeParameters, type, getMarkerTypeReference);
    }
    typeReferenceId(t: TypeReference, typeParameters: qt.Type[], depth = 0) {
      let result = '' + t.target.id;
      for (const t of this.typeArguments(t)) {
        if (qf.is.unconstrainedTypeParameter(t)) {
          let index = typeParameters.indexOf(t);
          if (index < 0) {
            index = typeParameters.length;
            typeParameters.push(t);
          }
          result += '=' + index;
        } else if (depth < 4 && qf.is.typeReferenceWithGenericArguments(t)) {
          result += '<' + this.typeReferenceId(t as TypeReference, typeParameters, depth + 1) + '>';
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
      if (qf.is.typeReferenceWithGenericArguments(source) && qf.is.typeReferenceWithGenericArguments(target)) {
        const typeParameters: qt.Type[] = [];
        return this.typeReferenceId(<TypeReference>source, typeParameters) + ',' + this.typeReferenceId(<TypeReference>target, typeParameters) + postFix;
      }
      return source.id + ',' + target.id + postFix;
    }
    declaringClass(prop: Symbol) {
      return prop.parent && prop.parent?.flags & SymbolFlags.Class ? <InterfaceType>this.declaredTypeOfSymbol(this.parentOfSymbol(prop)!) : undefined;
    }
    typeOfPropertyInBaseClass(property: Symbol) {
      const classType = this.declaringClass(property);
      const baseClassType = classType && this.baseTypes(classType)[0];
      return baseClassType && this.typeOfPropertyOfType(baseClassType, property.escName);
    }
    rootObjectTypeFromIndexedAccessChain(t: qt.Type) {
      let t = type;
      while (t.flags & qt.TypeFlags.IndexedAccess) {
        t = (t as IndexedAccessType).objectType;
      }
      return t;
    }
    supertypeOrUnion(types: qt.Type[]): qt.Type {
      return literalTypesWithSameBaseType(types) ? this.unionType(types) : reduceLeft(types, (s, t) => (qf.is.typeSubtypeOf(s, t) ? t : s))!;
    }
    commonSupertype(types: qt.Type[]): qt.Type {
      if (!strictNullChecks) return this.supertypeOrUnion(types);
      const primaryTypes = filter(types, (t) => !(t.flags & qt.TypeFlags.Nullable));
      return primaryTypes.length ? this.nullableType(this.supertypeOrUnion(primaryTypes), this.falsyFlagsOfTypes(types) & qt.TypeFlags.Nullable) : this.unionType(types, UnionReduction.Subtype);
    }
    commonSubtype(types: qt.Type[]) {
      return reduceLeft(types, (s, t) => (qf.is.typeSubtypeOf(t, s) ? t : s))!;
    }
    elemTypeOfArrayType(t: qt.Type): qt.Type | undefined {
      return qf.is.arrayType(t) ? this.typeArguments(type as TypeReference)[0] : undefined;
    }
    tupleElemType(t: qt.Type, index: number) {
      const propType = this.typeOfPropertyOfType(t, ('' + index) as qu.__String);
      if (propType) return propType;
      if (everyType(t, qf.is.tupleType)) return mapType(t, (t) => this.restTypeOfTupleType(<TupleTypeReference>t) || undefinedType);
      return;
    }
    baseTypeOfLiteralType(t: qt.Type): qt.Type {
      return t.flags & qt.TypeFlags.EnumLiteral
        ? this.baseTypeOfEnumLiteralType(<LiteralType>type)
        : t.flags & qt.TypeFlags.StringLiteral
        ? stringType
        : t.flags & qt.TypeFlags.NumberLiteral
        ? numberType
        : t.flags & qt.TypeFlags.BigIntLiteral
        ? bigintType
        : t.flags & qt.TypeFlags.BooleanLiteral
        ? booleanType
        : t.flags & qt.TypeFlags.Union
        ? this.unionType(sameMap((<UnionType>type).types, getBaseTypeOfLiteralType))
        : type;
    }
    widenedLiteralType(t: qt.Type): qt.Type {
      return t.flags & qt.TypeFlags.EnumLiteral && qf.is.freshLiteralType(t)
        ? this.baseTypeOfEnumLiteralType(<LiteralType>type)
        : t.flags & qt.TypeFlags.StringLiteral && qf.is.freshLiteralType(t)
        ? stringType
        : t.flags & qt.TypeFlags.NumberLiteral && qf.is.freshLiteralType(t)
        ? numberType
        : t.flags & qt.TypeFlags.BigIntLiteral && qf.is.freshLiteralType(t)
        ? bigintType
        : t.flags & qt.TypeFlags.BooleanLiteral && qf.is.freshLiteralType(t)
        ? booleanType
        : t.flags & qt.TypeFlags.Union
        ? this.unionType(sameMap((<UnionType>type).types, this.widenedLiteralType))
        : type;
    }
    widenedUniqueESSymbolType(t: qt.Type): qt.Type {
      return t.flags & qt.TypeFlags.UniqueESSymbol ? esSymbolType : t.flags & qt.TypeFlags.Union ? this.unionType(sameMap((<UnionType>type).types, getWidenedUniqueESSymbolType)) : type;
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
    restTypeOfTupleType(t: TupleTypeReference) {
      return t.target.hasRestElem ? this.typeArguments(t)[type.target.typeParameters!.length - 1] : undefined;
    }
    restArrayTypeOfTupleType(t: TupleTypeReference) {
      const restType = this.restTypeOfTupleType(t);
      return restType && createArrayType(restType);
    }
    lengthOfTupleType(t: TupleTypeReference) {
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
        ? this.falsyFlagsOfTypes((<UnionType>type).types)
        : t.flags & qt.TypeFlags.StringLiteral
        ? (<StringLiteralType>type).value === ''
          ? qt.TypeFlags.StringLiteral
          : 0
        : t.flags & qt.TypeFlags.NumberLiteral
        ? (<NumberLiteralType>type).value === 0
          ? qt.TypeFlags.NumberLiteral
          : 0
        : t.flags & qt.TypeFlags.BigIntLiteral
        ? qf.is.zeroBigInt(<BigIntLiteralType>type)
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
        ? emptyStringType
        : t.flags & qt.TypeFlags.Number
        ? zeroType
        : t.flags & qt.TypeFlags.BigInt
        ? zeroBigIntType
        : type === regularFalseType ||
          type === falseType ||
          t.flags & (TypeFlags.Void | qt.TypeFlags.Undefined | qt.TypeFlags.Null) ||
          (t.flags & qt.TypeFlags.StringLiteral && (<StringLiteralType>type).value === '') ||
          (t.flags & qt.TypeFlags.NumberLiteral && (<NumberLiteralType>type).value === 0) ||
          (t.flags & qt.TypeFlags.BigIntLiteral && qf.is.zeroBigInt(<BigIntLiteralType>type))
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
      const regularType = (<FreshObjectLiteralType>type).regularType;
      if (regularType) return regularType;
      const resolved = <ResolvedType>type;
      const members = transformTypeOfMembers(t, getRegularTypeOfObjectLiteral);
      const regularNew = createAnonymousType(resolved.symbol, members, resolved.callSignatures, resolved.constructSignatures, resolved.stringIndexInfo, resolved.numberIndexInfo);
      regularNew.flags = resolved.flags;
      regularNew.objectFlags |= resolved.objectFlags & ~ObjectFlags.FreshLiteral;
      (<FreshObjectLiteralType>type).regularType = regularNew;
      return regularNew;
    }
    siblingsOfContext(context: WideningContext): qt.Type[] {
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
    propertiesOfContext(context: WideningContext): Symbol[] {
      if (!context.resolvedProperties) {
        const names = new qu.QMap<Symbol>() as EscapedMap<Symbol>;
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
    widenedProperty(prop: Symbol, context: WideningContext | undefined): Symbol {
      if (!(prop.flags & SymbolFlags.Property)) return prop;
      const original = this.typeOfSymbol(prop);
      const propContext = context && createWideningContext(context, prop.escName, undefined);
      const widened = this.widenedTypeWithContext(original, propContext);
      return widened === original ? prop : createSymbolWithType(prop, widened);
    }
    undefinedProperty(prop: Symbol) {
      const cached = undefinedProperties.get(prop.escName);
      if (cached) return cached;
      const result = createSymbolWithType(prop, undefinedType);
      result.flags |= SymbolFlags.Optional;
      undefinedProperties.set(prop.escName, result);
      return result;
    }
    widenedTypeOfObjectLiteral(t: qt.Type, context: WideningContext | undefined): qt.Type {
      const members = new SymbolTable();
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
      const result = createAnonymousType(
        t.symbol,
        members,
        empty,
        empty,
        stringIndexInfo && createIndexInfo(this.widenedType(stringIndexInfo.type), stringIndexInfo.isReadonly),
        numberIndexInfo && createIndexInfo(this.widenedType(numberIndexInfo.type), numberIndexInfo.isReadonly)
      );
      result.objectFlags |= this.objectFlags(t) & (ObjectFlags.JSLiteral | ObjectFlags.NonInferrableType);
      return result;
    }
    widenedType(t: qt.Type) {
      return this.widenedTypeWithContext(t, undefined);
    }
    widenedTypeWithContext(t: qt.Type, context: WideningContext | undefined): qt.Type {
      if (this.objectFlags(t) & ObjectFlags.RequiresWidening) {
        if (context === undefined && t.widened) return t.widened;
        let result: qt.Type | undefined;
        if (t.flags & (TypeFlags.Any | qt.TypeFlags.Nullable)) result = anyType;
        else if (qf.is.objectLiteralType(t)) {
          result = this.widenedTypeOfObjectLiteral(t, context);
        } else if (t.flags & qt.TypeFlags.Union) {
          const unionContext = context || createWideningContext(undefined, (<UnionType>type).types);
          const widenedTypes = sameMap((<UnionType>type).types, (t) => (t.flags & qt.TypeFlags.Nullable ? t : this.widenedTypeWithContext(t, unionContext)));
          result = this.unionType(widenedTypes, qu.some(widenedTypes, qf.is.emptyObjectType) ? UnionReduction.Subtype : UnionReduction.Literal);
        } else if (t.flags & qt.TypeFlags.Intersection) {
          result = this.intersectionType(sameMap((<IntersectionType>type).types, this.widenedType));
        } else if (qf.is.arrayType(t) || qf.is.tupleType(t)) {
          result = createTypeReference((<TypeReference>type).target, sameMap(this.typeArguments(<TypeReference>type), this.widenedType));
        }
        if (result && context === undefined) t.widened = result;
        return result || type;
      }
      return type;
    }
    mapperFromContext<T extends InferenceContext | undefined>(context: T): TypeMapper | (T & undefined) {
      return context && context.mapper;
    }
    typeOfReverseMappedSymbol(symbol: ReverseMappedSymbol) {
      return inferReverseMappedType(symbol.propertyType, symbol.mappedType, symbol.constraintType);
    }
    *unmatchedProperties(source: qt.Type, target: qt.Type, requireOptionalProperties: boolean, matchDiscriminantProperties: boolean): IterableIterator<Symbol> {
      const properties = this.propertiesOfType(target);
      for (const targetProp of properties) {
        if (qf.is.staticPrivateIdentifierProperty(targetProp)) continue;
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
    unmatchedProperty(source: qt.Type, target: qt.Type, requireOptionalProperties: boolean, matchDiscriminantProperties: boolean): Symbol | undefined {
      const result = this.unmatchedProperties(source, target, requireOptionalProperties, matchDiscriminantProperties).next();
      if (!result.done) return result.value;
    }
    typeFromInference(inference: InferenceInfo) {
      return inference.candidates ? this.unionType(inference.candidates, UnionReduction.Subtype) : inference.contraCandidates ? this.intersectionType(inference.contraCandidates) : undefined;
    }
    contravariantInference(inference: InferenceInfo) {
      return inference.priority! & InferencePriority.PriorityImpliesCombination ? this.intersectionType(inference.contraCandidates!) : this.commonSubtype(inference.contraCandidates!);
    }
    covariantInference(inference: InferenceInfo, signature: qt.Signature) {
      const candidates = unionObjectAndArrayLiteralCandidates(inference.candidates!);
      const primitiveConstraint = qf.has.primitiveConstraint(inference.typeParameter);
      const widenLiteralTypes = !primitiveConstraint && inference.topLevel && (inference.isFixed || !qf.is.typeParameterAtTopLevel(this.returnTypeOfSignature(signature), inference.typeParameter));
      const baseCandidates = primitiveConstraint ? sameMap(candidates, getRegularTypeOfLiteralType) : widenLiteralTypes ? sameMap(candidates, this.widenedLiteralType) : candidates;
      const unwidenedType = inference.priority! & InferencePriority.PriorityImpliesCombination ? this.unionType(baseCandidates, UnionReduction.Subtype) : this.commonSupertype(baseCandidates);
      return this.widenedType(unwidenedType);
    }
    inferredType(context: InferenceContext, index: number): qt.Type {
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
            const defaultType = this.defaultFromTypeParameter(inference.typeParameter);
            if (defaultType) inferredType = instantiateType(defaultType, mergeTypeMappers(createBackreferenceMapper(context, index), context.nonFixingMapper));
          }
        } else {
          inferredType = this.typeFromInference(inference);
        }
        inference.inferredType = inferredType || this.defaultTypeArgumentType(!!(context.flags & InferenceFlags.AnyDefault));
        const constraint = this.constraintOfTypeParameter(inference.typeParameter);
        if (constraint) {
          const instantiatedConstraint = instantiateType(constraint, context.nonFixingMapper);
          if (!inferredType || !context.compareTypes(inferredType, this.typeWithThisArgument(instantiatedConstraint, inferredType))) inference.inferredType = inferredType = instantiatedConstraint;
        }
      }
      return inference.inferredType;
    }
    defaultTypeArgumentType(isInJavaScriptFile: boolean): qt.Type {
      return isInJavaScriptFile ? anyType : unknownType;
    }
    inferredTypes(context: InferenceContext): qt.Type[] {
      const result: qt.Type[] = [];
      for (let i = 0; i < context.inferences.length; i++) {
        result.push(this.inferredType(context, i));
      }
      return result;
    }
    cannotFindNameDiagnosticForName(n: Identifier): qd.Message {
      switch (n.escapedText) {
        case 'document':
        case 'console':
          return qd.msgs.Cannot_find_name_0_Do_you_need_to_change_your_target_library_Try_changing_the_lib_compiler_option_to_include_dom;
        case '$':
          return compilerOptions.types
            ? qd.msgs.Cannot_find_name_0_Do_you_need_to_install_type_definitions_for_jQuery_Try_npm_i_types_Slashjquery_and_then_add_jquery_to_the_types_field_in_your_tsconfig
            : qd.msgs.Cannot_find_name_0_Do_you_need_to_install_type_definitions_for_jQuery_Try_npm_i_types_Slashjquery;
        case 'describe':
        case 'suite':
        case 'it':
        case 'test':
          return compilerOptions.types
            ? qd.msgs
                .Cannot_find_name_0_Do_you_need_to_install_type_definitions_for_a_test_runner_Try_npm_i_types_Slashjest_or_npm_i_types_Slashmocha_and_then_add_jest_or_mocha_to_the_types_field_in_your_tsconfig
            : qd.msgs.Cannot_find_name_0_Do_you_need_to_install_type_definitions_for_a_test_runner_Try_npm_i_types_Slashjest_or_npm_i_types_Slashmocha;
        case 'process':
        case 'require':
        case 'Buffer':
        case 'module':
          return compilerOptions.types
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
    resolvedSymbol(n: Identifier): Symbol {
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
          const symbol = this.resolvedSymbol(<Identifier>n);
          return symbol !== unknownSymbol
            ? `${flowContainer ? this.nodeId(flowContainer) : '-1'}|${this.typeId(declaredType)}|${this.typeId(initialType)}|${qf.is.constraintPosition(n) ? '@' : ''}${symbol.this.id()}`
            : undefined;
        case Syntax.ThisKeyword:
          return '0';
        case Syntax.NonNullExpression:
        case Syntax.ParenthesizedExpression:
          return this.flowCacheKey((<NonNullExpression | ParenthesizedExpression>n).expression, declaredType, initialType, flowContainer);
        case Syntax.PropertyAccessExpression:
        case Syntax.ElemAccessExpression:
          const propName = this.accessedPropertyName(<AccessExpression>n);
          if (propName !== undefined) {
            const key = this.flowCacheKey((<AccessExpression>n).expression, declaredType, initialType, flowContainer);
            return key && key + '.' + propName;
          }
      }
      return;
    }
    accessedPropertyName(access: AccessExpression): qu.__String | undefined {
      return access.kind === Syntax.PropertyAccessExpression
        ? access.name.escapedText
        : qf.is.stringOrNumericLiteralLike(access.argumentExpression)
        ? qy.get.escUnderscores(access.argumentExpression.text)
        : undefined;
    }
    flowNodeId(flow: FlowNode): number {
      if (!flow.id || flow.id < 0) {
        flow.id = nextFlowId;
        nextFlowId++;
      }
      return flow.id;
    }
    assignmentReducedType(declaredType: UnionType, assignedType: qt.Type) {
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
        const isEmpty = (<StringLiteralType>type).value === '';
        return strictNullChecks ? (isEmpty ? TypeFacts.EmptyStringStrictFacts : TypeFacts.NonEmptyStringStrictFacts) : isEmpty ? TypeFacts.EmptyStringFacts : TypeFacts.NonEmptyStringFacts;
      }
      if (flags & (TypeFlags.Number | qt.TypeFlags.Enum)) return strictNullChecks ? TypeFacts.NumberStrictFacts : TypeFacts.NumberFacts;
      if (flags & qt.TypeFlags.NumberLiteral) {
        const isZero = (<NumberLiteralType>type).value === 0;
        return strictNullChecks ? (isZero ? TypeFacts.ZeroNumberStrictFacts : TypeFacts.NonZeroNumberStrictFacts) : isZero ? TypeFacts.ZeroNumberFacts : TypeFacts.NonZeroNumberFacts;
      }
      if (flags & qt.TypeFlags.BigInt) return strictNullChecks ? TypeFacts.BigIntStrictFacts : TypeFacts.BigIntFacts;
      if (flags & qt.TypeFlags.BigIntLiteral) {
        const isZero = qf.is.zeroBigInt(<BigIntLiteralType>type);
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
        return this.objectFlags(t) & ObjectFlags.Anonymous && qf.is.emptyObjectType(<ObjectType>type)
          ? strictNullChecks
            ? TypeFacts.EmptyObjectStrictFacts
            : TypeFacts.EmptyObjectFacts
          : qf.is.functionObjectType(<ObjectType>type)
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
      if (flags & qt.TypeFlags.UnionOrIntersection) return this.typeFactsOfTypes((<UnionOrIntersectionType>type).types);
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
      return createArrayType(qf.check.iteratedTypeOrElemType(IterationUse.Destructuring, type, undefinedType, undefined) || errorType);
    }
    assignedTypeOfBinaryExpression(n: BinaryExpression): qt.Type {
      const isDestructuringDefaultAssignment =
        (n.parent?.kind === Syntax.ArrayLiteralExpression && qf.is.destructuringAssignmentTarget(n.parent)) ||
        (n.parent?.kind === Syntax.PropertyAssignment && qf.is.destructuringAssignmentTarget(n.parent?.parent));
      return isDestructuringDefaultAssignment ? this.typeWithDefault(this.assignedType(n), n.right) : this.typeOfExpression(n.right);
    }
    assignedTypeOfArrayLiteralElem(n: ArrayLiteralExpression, elem: qt.Expression): qt.Type {
      return this.typeOfDestructuredArrayElem(this.assignedType(n), n.elems.indexOf(elem));
    }
    assignedTypeOfSpreadExpression(n: SpreadElem): qt.Type {
      return this.typeOfDestructuredSpreadExpression(this.assignedType(<ArrayLiteralExpression>n.parent));
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
          return qf.check.rightHandSideOfForOf(<ForOfStatement>parent) || errorType;
        case Syntax.BinaryExpression:
          return this.assignedTypeOfBinaryExpression(parent);
        case Syntax.DeleteExpression:
          return undefinedType;
        case Syntax.ArrayLiteralExpression:
          return this.assignedTypeOfArrayLiteralElem(<ArrayLiteralExpression>parent, n);
        case Syntax.SpreadElem:
          return this.assignedTypeOfSpreadExpression(<SpreadElem>parent);
        case Syntax.PropertyAssignment:
          return this.assignedTypeOfPropertyAssignment(<PropertyAssignment>parent);
        case Syntax.ShorthandPropertyAssignment:
          return this.assignedTypeOfShorthandPropertyAssignment(<ShorthandPropertyAssignment>parent);
      }
      return errorType;
    }
    initialTypeOfBindingElem(n: qt.BindingElem): qt.Type {
      const pattern = n.parent;
      const parentType = this.initialType(<VariableDeclaration | qt.BindingElem>pattern.parent);
      const type =
        pattern.kind === Syntax.ObjectBindingPattern
          ? this.typeOfDestructuredProperty(parentType, n.propertyName || <Identifier>n.name)
          : !n.dot3Token
          ? this.typeOfDestructuredArrayElem(parentType, pattern.elems.indexOf(n))
          : this.typeOfDestructuredSpreadExpression(parentType);
      return this.typeWithDefault(t, n.initer!);
    }
    typeOfIniter(n: qt.Expression) {
      const links = this.nodeLinks(n);
      return links.resolvedType || this.typeOfExpression(n);
    }
    initialTypeOfVariableDeclaration(n: VariableDeclaration) {
      if (n.initer) return this.typeOfIniter(n.initer);
      if (n.parent?.parent?.kind === Syntax.ForInStatement) return stringType;
      if (n.parent?.parent?.kind === Syntax.ForOfStatement) return qf.check.rightHandSideOfForOf(n.parent?.parent) || errorType;
      return errorType;
    }
    initialType(n: VariableDeclaration | qt.BindingElem) {
      return n.kind === Syntax.VariableDeclaration ? this.initialTypeOfVariableDeclaration(n) : this.initialTypeOfBindingElem(n);
    }
    referenceCandidate(n: qt.Expression): Expression {
      switch (n.kind) {
        case Syntax.ParenthesizedExpression:
          return this.referenceCandidate((<ParenthesizedExpression>n).expression);
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
    typeOfSwitchClause(clause: CaseClause | DefaultClause) {
      if (clause.kind === Syntax.CaseClause) return this.regularTypeOfLiteralType(this.typeOfExpression(clause.expression));
      return neverType;
    }
    switchClauseTypes(switchStatement: SwitchStatement): qt.Type[] {
      const links = this.nodeLinks(switchStatement);
      if (!links.switchTypes) {
        links.switchTypes = [];
        for (const clause of switchStatement.caseBlock.clauses) {
          links.switchTypes.push(this.typeOfSwitchClause(clause));
        }
      }
      return links.switchTypes;
    }
    switchClauseTypeOfWitnesses(switchStatement: SwitchStatement, retainDefault: false): string[];
    switchClauseTypeOfWitnesses(switchStatement: SwitchStatement, retainDefault: boolean): (string | undefined)[];
    switchClauseTypeOfWitnesses(switchStatement: SwitchStatement, retainDefault: boolean): (string | undefined)[] {
      const witnesses: (string | undefined)[] = [];
      for (const clause of switchStatement.caseBlock.clauses) {
        if (clause.kind === Syntax.CaseClause) {
          if (qf.is.stringLiteralLike(clause.expression)) {
            witnesses.push(clause.expression.text);
            continue;
          }
          return empty;
        }
        if (retainDefault) witnesses.push(undefined);
      }
      return witnesses;
    }
    typeFromFlowType(flowType: FlowType) {
      return flowType.flags === 0 ? (<IncompleteType>flowType).type : <Type>flowType;
    }
    evolvingArrayType(elemType: qt.Type): EvolvingArrayType {
      return evolvingArrayTypes[elemType.id] || (evolvingArrayTypes[elemType.id] = createEvolvingArrayType(elemType));
    }
    finalArrayType(evolvingArrayType: EvolvingArrayType): qt.Type {
      return evolvingArrayType.finalArrayType || (evolvingArrayType.finalArrayType = createFinalArrayType(evolvingArrayType.elemType));
    }
    elemTypeOfEvolvingArrayType(t: qt.Type) {
      return this.objectFlags(t) & ObjectFlags.EvolvingArray ? (<EvolvingArrayType>type).elemType : neverType;
    }
    unionOrEvolvingArrayType(types: qt.Type[], subtypeReduction: UnionReduction) {
      return qf.is.evolvingArrayTypeList(types)
        ? this.evolvingArrayType(this.unionType(map(types, getElemTypeOfEvolvingArrayType)))
        : this.unionType(sameMap(types, finalizeEvolvingArrayType), subtypeReduction);
    }
    explicitTypeOfSymbol(symbol: Symbol, diagnostic?: qd.Diagnostic) {
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
          if (diagnostic) addRelatedInfo(diagnostic, qf.create.diagnosticForNode(declaration, qd.msgs._0_needs_an_explicit_type_annotation, symbol.symbolToString()));
        }
      }
    }
    typeOfDottedName(n: Expression, diagnostic: qd.Diagnostic | undefined): qt.Type | undefined {
      if (!(n.flags & NodeFlags.InWithStatement)) {
        switch (n.kind) {
          case Syntax.Identifier:
            const symbol = this.exportSymbolOfValueSymbolIfExported(this.resolvedSymbol(<Identifier>n));
            return this.explicitTypeOfSymbol(symbol.flags & SymbolFlags.Alias ? this.resolveAlias() : symbol, diagnostic);
          case Syntax.ThisKeyword:
            return this.explicitThisType(n);
          case Syntax.SuperKeyword:
            return qf.check.superExpression(n);
          case Syntax.PropertyAccessExpression:
            const type = this.typeOfDottedName((<PropertyAccessExpression>n).expression, diagnostic);
            const prop = type && this.propertyOfType(t, (<PropertyAccessExpression>n).name.escapedText);
            return prop && this.explicitTypeOfSymbol(prop, diagnostic);
          case Syntax.ParenthesizedExpression:
            return this.typeOfDottedName((<ParenthesizedExpression>n).expression, diagnostic);
        }
      }
    }
    effectsSignature(n: CallExpression) {
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
        const candidate = signatures.length === 1 && !signatures[0].typeParameters ? signatures[0] : qu.some(signatures, hasTypePredicateOrNeverReturnType) ? this.resolvedSignature(n) : undefined;
        signature = links.effectsSignature = candidate && qf.has.typePredicateOrNeverReturnType(candidate) ? candidate : unknownSignature;
      }
      return signature === unknownSignature ? undefined : signature;
    }
    typePredicateArgument(predicate: TypePredicate, callExpression: CallExpression) {
      if (predicate.kind === TypePredicateKind.Identifier || predicate.kind === TypePredicateKind.AssertsIdentifier) return callExpression.arguments[predicate.parameterIndex];
      const invokedExpression = qc.skip.parentheses(callExpression.expression);
      return qf.is.accessExpression(invokedExpression) ? qc.skip.parentheses(invokedExpression.expression) : undefined;
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
      typeAtFlowNode(flow: FlowNode): FlowType {
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
          let type: FlowType | undefined;
          if (flags & FlowFlags.Assignment) {
            type = this.typeAtFlowAssignment(<FlowAssignment>flow);
            if (!type) {
              flow = (<FlowAssignment>flow).antecedent;
              continue;
            }
          } else if (flags & FlowFlags.Call) {
            type = this.typeAtFlowCall(<FlowCall>flow);
            if (!type) {
              flow = (<FlowCall>flow).antecedent;
              continue;
            }
          } else if (flags & FlowFlags.Condition) {
            type = this.typeAtFlowCondition(<FlowCondition>flow);
          } else if (flags & FlowFlags.SwitchClause) {
            type = this.typeAtSwitchClause(<FlowSwitchClause>flow);
          } else if (flags & FlowFlags.Label) {
            if ((<FlowLabel>flow).antecedents!.length === 1) {
              flow = (<FlowLabel>flow).antecedents![0];
              continue;
            }
            type = flags & FlowFlags.BranchLabel ? this.typeAtFlowBranchLabel(<FlowLabel>flow) : this.typeAtFlowLoopLabel(<FlowLabel>flow);
          } else if (flags & FlowFlags.ArrayMutation) {
            type = this.typeAtFlowArrayMutation(<FlowArrayMutation>flow);
            if (!type) {
              flow = (<FlowArrayMutation>flow).antecedent;
              continue;
            }
          } else if (flags & FlowFlags.ReduceLabel) {
            const target = (<FlowReduceLabel>flow).target;
            const saveAntecedents = target.antecedents;
            target.antecedents = (<FlowReduceLabel>flow).antecedents;
            type = this.typeAtFlowNode((<FlowReduceLabel>flow).antecedent);
            target.antecedents = saveAntecedents;
          } else if (flags & FlowFlags.Start) {
            const container = (<FlowStart>flow).node;
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
      initialOrAssignedType(flow: FlowAssignment) {
        const n = flow.node;
        return this.constraintForLocation(
          n.kind === Syntax.VariableDeclaration || n.kind === Syntax.BindingElem ? this.initialType(<VariableDeclaration | qt.BindingElem>n) : this.assignedType(n),
          reference
        );
      }
      typeAtFlowAssignment(flow: FlowAssignment) {
        const n = flow.node;
        if (qf.is.matchingReference(reference, n)) {
          if (!qf.is.reachableFlowNode(flow)) return unreachableNeverType;
          if (this.assignmentTargetKind(n) === AssignmentKind.Compound) {
            const flowType = this.typeAtFlowNode(flow.antecedent);
            return createFlowType(this.baseTypeOfLiteralType(this.typeFromFlowType(flowType)), qf.is.incomplete(flowType));
          }
          if (declaredType === autoType || declaredType === autoArrayType) {
            if (qf.is.emptyArrayAssignment(n)) return this.evolvingArrayType(neverType);
            const assignedType = this.widenedLiteralType(this.initialOrAssignedType(flow));
            return qf.is.typeAssignableTo(assignedType, declaredType) ? assignedType : anyArrayType;
          }
          if (declaredType.flags & qt.TypeFlags.Union) return this.assignmentReducedType(<UnionType>declaredType, this.initialOrAssignedType(flow));
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
        const n = qc.skip.parentheses(expr);
        if (n.kind === Syntax.FalseKeyword) return unreachableNeverType;
        if (n.kind === Syntax.BinaryExpression) {
          if (n.operatorToken.kind === Syntax.Ampersand2Token) return narrowTypeByAssertion(narrowTypeByAssertion(t, n.left), n.right);
          if (n.operatorToken.kind === Syntax.Bar2Token) return this.unionType([narrowTypeByAssertion(t, n.left), narrowTypeByAssertion(t, n.right)]);
        }
        return narrowType(t, n, true);
      }
      typeAtFlowCall(flow: FlowCall): FlowType | undefined {
        const signature = this.effectsSignature(flow.node);
        if (signature) {
          const predicate = this.typePredicateOfSignature(signature);
          if (predicate && (predicate.kind === TypePredicateKind.AssertsThis || predicate.kind === TypePredicateKind.AssertsIdentifier)) {
            const flowType = this.typeAtFlowNode(flow.antecedent);
            const type = finalizeEvolvingArrayType(this.typeFromFlowType(flowType));
            const narrowedType = predicate.type
              ? narrowTypeByTypePredicate(t, predicate, flow.node, true)
              : predicate.kind === TypePredicateKind.AssertsIdentifier && predicate.parameterIndex >= 0 && predicate.parameterIndex < flow.node.arguments.length
              ? narrowTypeByAssertion(t, flow.node.arguments[predicate.parameterIndex])
              : type;
            return narrowedType === type ? flowType : createFlowType(narrowedType, qf.is.incomplete(flowType));
          }
          if (this.returnTypeOfSignature(signature).flags & qt.TypeFlags.Never) return unreachableNeverType;
        }
        return;
      }
      typeAtFlowArrayMutation(flow: FlowArrayMutation): FlowType | undefined {
        if (declaredType === autoType || declaredType === autoArrayType) {
          const n = flow.node;
          const expr = n.kind === Syntax.CallExpression ? (<PropertyAccessExpression>n.expression).expression : (<ElemAccessExpression>n.left).expression;
          if (qf.is.matchingReference(reference, this.referenceCandidate(expr))) {
            const flowType = this.typeAtFlowNode(flow.antecedent);
            const type = this.typeFromFlowType(flowType);
            if (this.objectFlags(t) & ObjectFlags.EvolvingArray) {
              let evolvedType = <EvolvingArrayType>type;
              if (n.kind === Syntax.CallExpression) {
                for (const arg of n.arguments) {
                  evolvedType = addEvolvingArrayElemType(evolvedType, arg);
                }
              } else {
                const indexType = this.contextFreeTypeOfExpression((<ElemAccessExpression>n.left).argumentExpression);
                if (qf.is.typeAssignableToKind(indexType, qt.TypeFlags.NumberLike)) evolvedType = addEvolvingArrayElemType(evolvedType, n.right);
              }
              return evolvedType === type ? flowType : createFlowType(evolvedType, qf.is.incomplete(flowType));
            }
            return flowType;
          }
        }
        return;
      }
      typeAtFlowCondition(flow: FlowCondition): FlowType {
        const flowType = this.typeAtFlowNode(flow.antecedent);
        const type = this.typeFromFlowType(flowType);
        if (t.flags & qt.TypeFlags.Never) return flowType;
        const assumeTrue = (flow.flags & FlowFlags.TrueCondition) !== 0;
        const nonEvolvingType = finalizeEvolvingArrayType(t);
        const narrowedType = narrowType(nonEvolvingType, flow.node, assumeTrue);
        if (narrowedType === nonEvolvingType) return flowType;
        const incomplete = qf.is.incomplete(flowType);
        const resultType = incomplete && narrowedType.flags & qt.TypeFlags.Never ? silentNeverType : narrowedType;
        return createFlowType(resultType, incomplete);
      }
      typeAtSwitchClause(flow: FlowSwitchClause): FlowType {
        const expr = flow.switchStatement.expression;
        const flowType = this.typeAtFlowNode(flow.antecedent);
        let type = this.typeFromFlowType(flowType);
        if (qf.is.matchingReference(reference, expr)) type = narrowTypeBySwitchOnDiscriminant(t, flow.switchStatement, flow.clauseStart, flow.clauseEnd);
        else if (expr.kind === Syntax.TypeOfExpression && qf.is.matchingReference(reference, (expr as TypeOfExpression).expression)) {
          type = narrowBySwitchOnTypeOf(t, flow.switchStatement, flow.clauseStart, flow.clauseEnd);
        } else {
          if (strictNullChecks) {
            if (optionalChainContainsReference(expr, reference))
              type = narrowTypeBySwitchOptionalChainContainment(t, flow.switchStatement, flow.clauseStart, flow.clauseEnd, (t) => !(t.flags & (TypeFlags.Undefined | qt.TypeFlags.Never)));
            else if (expr.kind === Syntax.TypeOfExpression && optionalChainContainsReference((expr as TypeOfExpression).expression, reference)) {
              type = narrowTypeBySwitchOptionalChainContainment(
                type,
                flow.switchStatement,
                flow.clauseStart,
                flow.clauseEnd,
                (t) => !(t.flags & qt.TypeFlags.Never || (t.flags & qt.TypeFlags.StringLiteral && (<StringLiteralType>t).value === 'undefined'))
              );
            }
          }
          if (qf.is.matchingReferenceDiscriminant(expr, type))
            type = narrowTypeByDiscriminant(t, expr as AccessExpression, (t) => narrowTypeBySwitchOnDiscriminant(t, flow.switchStatement, flow.clauseStart, flow.clauseEnd));
        }
        return createFlowType(t, qf.is.incomplete(flowType));
      }
      typeAtFlowBranchLabel(flow: FlowLabel): FlowType {
        const antecedentTypes: qt.Type[] = [];
        let subtypeReduction = false;
        let seenIncomplete = false;
        let bypassFlow: FlowSwitchClause | undefined;
        for (const antecedent of flow.antecedents!) {
          if (!bypassFlow && antecedent.flags & FlowFlags.SwitchClause && (<FlowSwitchClause>antecedent).clauseStart === (<FlowSwitchClause>antecedent).clauseEnd) {
            bypassFlow = <FlowSwitchClause>antecedent;
            continue;
          }
          const flowType = this.typeAtFlowNode(antecedent);
          const type = this.typeFromFlowType(flowType);
          if (type === declaredType && declaredType === initialType) return type;
          pushIfUnique(antecedentTypes, type);
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
        return createFlowType(this.unionOrEvolvingArrayType(antecedentTypes, subtypeReduction ? UnionReduction.Subtype : UnionReduction.Literal), seenIncomplete);
      }
      typeAtFlowLoopLabel(flow: FlowLabel): FlowType {
        const id = this.flowNodeId(flow);
        const cache = flowLoopCaches[id] || (flowLoopCaches[id] = new qu.QMap<Type>());
        const key = this.orSetCacheKey();
        if (!key) return declaredType;
        const cached = cache.get(key);
        if (cached) return cached;
        for (let i = flowLoopStart; i < flowLoopCount; i++) {
          if (flowLoopNodes[i] === flow && flowLoopKeys[i] === key && flowLoopTypes[i].length) return createFlowType(this.unionOrEvolvingArrayType(flowLoopTypes[i], UnionReduction.Literal), true);
        }
        const antecedentTypes: qt.Type[] = [];
        let subtypeReduction = false;
        let firstAntecedentType: FlowType | undefined;
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
          pushIfUnique(antecedentTypes, type);
          if (!qf.is.typeSubsetOf(t, declaredType)) subtypeReduction = true;
          if (type === declaredType) break;
        }
        const result = this.unionOrEvolvingArrayType(antecedentTypes, subtypeReduction ? UnionReduction.Subtype : UnionReduction.Literal);
        if (qf.is.incomplete(firstAntecedentType!)) return createFlowType(result, true);
        cache.set(key, result);
        return result;
      }
      isMatchingReferenceDiscriminant(expr: Expression, computedType: qt.Type) {
        const type = declaredType.flags & qt.TypeFlags.Union ? declaredType : computedType;
        if (!(t.flags & qt.TypeFlags.Union) || !qf.is.accessExpression(expr)) return false;
        const name = this.accessedPropertyName(expr);
        if (name === undefined) return false;
        return qf.is.matchingReference(reference, expr.expression) && qf.is.discriminantProperty(t, name);
      }
      narrowTypeByDiscriminant(t: qt.Type, access: AccessExpression, narrowType: (t: qt.Type) => qt.Type): qt.Type {
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
      narrowTypeByTruthiness(t: qt.Type, expr: Expression, assumeTrue: boolean): qt.Type {
        if (qf.is.matchingReference(reference, expr)) return this.typeWithFacts(t, assumeTrue ? TypeFacts.Truthy : TypeFacts.Falsy);
        if (strictNullChecks && assumeTrue && optionalChainContainsReference(expr, reference)) type = this.typeWithFacts(t, TypeFacts.NEUndefinedOrNull);
        if (qf.is.matchingReferenceDiscriminant(expr, type)) return narrowTypeByDiscriminant(t, <AccessExpression>expr, (t) => this.typeWithFacts(t, assumeTrue ? TypeFacts.Truthy : TypeFacts.Falsy));
        return type;
      }
      isTypePresencePossible(t: qt.Type, propName: qu.__String, assumeTrue: boolean) {
        if (this.indexInfoOfType(t, qt.IndexKind.String)) return true;
        const prop = this.propertyOfType(t, propName);
        if (prop) return prop.flags & SymbolFlags.Optional ? true : assumeTrue;
        return !assumeTrue;
      }
      narrowByInKeyword(t: qt.Type, literal: LiteralExpression, assumeTrue: boolean) {
        if (t.flags & (TypeFlags.Union | qt.TypeFlags.Object) || qf.is.thisTypeParameter(t)) {
          const propName = qy.get.escUnderscores(literal.text);
          return filterType(t, (t) => qf.is.typePresencePossible(t, propName, assumeTrue));
        }
        return type;
      }
      narrowTypeByBinaryExpression(t: qt.Type, expr: BinaryExpression, assumeTrue: boolean): qt.Type {
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
            if (left.kind === Syntax.TypeOfExpression && qf.is.stringLiteralLike(right)) return narrowTypeByTypeof(t, <TypeOfExpression>left, operator, right, assumeTrue);
            if (right.kind === Syntax.TypeOfExpression && qf.is.stringLiteralLike(left)) return narrowTypeByTypeof(t, <TypeOfExpression>right, operator, left, assumeTrue);
            if (qf.is.matchingReference(reference, left)) return narrowTypeByEquality(t, operator, right, assumeTrue);
            if (qf.is.matchingReference(reference, right)) return narrowTypeByEquality(t, operator, left, assumeTrue);
            if (strictNullChecks) {
              if (optionalChainContainsReference(left, reference)) type = narrowTypeByOptionalChainContainment(t, operator, right, assumeTrue);
              else if (optionalChainContainsReference(right, reference)) {
                type = narrowTypeByOptionalChainContainment(t, operator, left, assumeTrue);
              }
            }
            if (qf.is.matchingReferenceDiscriminant(left, type)) return narrowTypeByDiscriminant(t, <AccessExpression>left, (t) => narrowTypeByEquality(t, operator, right, assumeTrue));
            if (qf.is.matchingReferenceDiscriminant(right, type)) return narrowTypeByDiscriminant(t, <AccessExpression>right, (t) => narrowTypeByEquality(t, operator, left, assumeTrue));
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
      narrowTypeByOptionalChainContainment(t: qt.Type, operator: Syntax, value: Expression, assumeTrue: boolean): qt.Type {
        const equalsOperator = operator === Syntax.Equals2Token || operator === Syntax.Equals3Token;
        const nullableFlags = operator === Syntax.Equals2Token || operator === Syntax.ExclamationEqualsToken ? qt.TypeFlags.Nullable : qt.TypeFlags.Undefined;
        const valueType = this.typeOfExpression(value);
        const removeNullable =
          (equalsOperator !== assumeTrue && everyType(valueType, (t) => !!(t.flags & nullableFlags))) ||
          (equalsOperator === assumeTrue && everyType(valueType, (t) => !(t.flags & (TypeFlags.AnyOrUnknown | nullableFlags))));
        return removeNullable ? this.typeWithFacts(t, TypeFacts.NEUndefinedOrNull) : type;
      }
      narrowTypeByEquality(t: qt.Type, operator: Syntax, value: Expression, assumeTrue: boolean): qt.Type {
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
      narrowTypeByTypeof(t: qt.Type, typeOfExpr: TypeOfExpression, operator: Syntax, literal: LiteralExpression, assumeTrue: boolean): qt.Type {
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
      narrowTypeBySwitchOptionalChainContainment(t: qt.Type, switchStatement: SwitchStatement, clauseStart: number, clauseEnd: number, clauseCheck: (t: qt.Type) => boolean) {
        const everyClauseChecks = clauseStart !== clauseEnd && every(this.switchClauseTypes(switchStatement).slice(clauseStart, clauseEnd), clauseCheck);
        return everyClauseChecks ? this.typeWithFacts(t, TypeFacts.NEUndefinedOrNull) : type;
      }
      narrowTypeBySwitchOnDiscriminant(t: qt.Type, switchStatement: SwitchStatement, clauseStart: number, clauseEnd: number) {
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
      narrowBySwitchOnTypeOf(t: qt.Type, switchStatement: SwitchStatement, clauseStart: number, clauseEnd: number): qt.Type {
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
            (expr.kind === Syntax.ElemAccessExpression && qf.is.stringLiteralLike(expr.argumentExpression) && expr.argumentExpression.text === 'constructor')) &&
          qf.is.matchingReference(reference, expr.expression)
        );
      }
      narrowTypeByConstructor(t: qt.Type, operator: Syntax, identifier: Expression, assumeTrue: boolean): qt.Type {
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
      narrowTypeByInstanceof(t: qt.Type, expr: BinaryExpression, assumeTrue: boolean): qt.Type {
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
          targetType = constructSignatures.length ? this.unionType(map(constructSignatures, (signature) => this.returnTypeOfSignature(this.erasedSignature(signature)))) : emptyObjectType;
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
      narrowTypeByCallExpression(t: qt.Type, callExpression: CallExpression, assumeTrue: boolean): qt.Type {
        if (qf.has.matchingArgument(callExpression, reference)) {
          const signature = assumeTrue || !qf.is.callChain(callExpression) ? this.effectsSignature(callExpression) : undefined;
          const predicate = signature && this.typePredicateOfSignature(signature);
          if (predicate && (predicate.kind === TypePredicateKind.This || predicate.kind === TypePredicateKind.Identifier)) return narrowTypeByTypePredicate(t, predicate, callExpression, assumeTrue);
        }
        return type;
      }
      narrowTypeByTypePredicate(t: qt.Type, predicate: TypePredicate, callExpression: CallExpression, assumeTrue: boolean): qt.Type {
        if (predicate.type && !(qf.is.typeAny(t) && (predicate.type === globalObjectType || predicate.type === globalFunctionType))) {
          const predicateArgument = this.typePredicateArgument(predicate, callExpression);
          if (predicateArgument) {
            if (qf.is.matchingReference(reference, predicateArgument)) return this.narrowedType(t, predicate.type, assumeTrue, isTypeSubtypeOf);
            if (strictNullChecks && assumeTrue && optionalChainContainsReference(predicateArgument, reference) && !(this.typeFacts(predicate.type) & TypeFacts.EQUndefined))
              type = this.typeWithFacts(t, TypeFacts.NEUndefinedOrNull);
            if (qf.is.matchingReferenceDiscriminant(predicateArgument, type))
              return narrowTypeByDiscriminant(t, predicateArgument as AccessExpression, (t) => this.narrowedType(t, predicate.type!, assumeTrue, isTypeSubtypeOf));
          }
        }
        return type;
      }
      narrowType(t: qt.Type, expr: Expression, assumeTrue: boolean): qt.Type {
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
            return narrowTypeByCallExpression(t, <CallExpression>expr, assumeTrue);
          case Syntax.ParenthesizedExpression:
            return narrowType(t, (<ParenthesizedExpression>expr).expression, assumeTrue);
          case Syntax.BinaryExpression:
            return narrowTypeByBinaryExpression(t, expr, assumeTrue);
          case Syntax.PrefixUnaryExpression:
            if ((<PrefixUnaryExpression>expr).operator === Syntax.ExclamationToken) return narrowType(t, (<PrefixUnaryExpression>expr).operand, !assumeTrue);
            break;
        }
        return type;
      }
      narrowTypeByOptionality(t: qt.Type, expr: Expression, assumePresent: boolean): qt.Type {
        if (qf.is.matchingReference(reference, expr)) return this.typeWithFacts(t, assumePresent ? TypeFacts.NEUndefinedOrNull : TypeFacts.EQUndefinedOrNull);
        if (qf.is.matchingReferenceDiscriminant(expr, type))
          return narrowTypeByDiscriminant(t, <AccessExpression>expr, (t) => this.typeWithFacts(t, assumePresent ? TypeFacts.NEUndefinedOrNull : TypeFacts.EQUndefinedOrNull));
        return type;
      }
    })();
    typeOfSymbolAtLocation(symbol: Symbol, location: Node) {
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
    constraintForLocation(t: qt.Type, n: Node): Type;
    constraintForLocation(t: qt.Type | undefined, n: Node): qt.Type | undefined;
    constraintForLocation(t: qt.Type, n: Node): qt.Type | undefined {
      if (type && qf.is.constraintPosition(n) && forEachType(t, typeHasNullableConstraint)) return mapType(this.widenedType(t), this.baseConstraintOrType);
      return type;
    }
    partOfForStatementContainingNode(n: Node, container: ForStatement) {
      return qc.findAncestor(n, (n) => (n === container ? 'quit' : n === container.initer || n === container.condition || n === container.incrementor || n === container.statement));
    }
    explicitThisType(n: qt.Expression) {
      const container = this.thisContainer(n, false);
      if (qf.is.functionLike(container)) {
        const signature = this.signatureFromDeclaration(container);
        if (signature.thisParameter) return this.explicitTypeOfSymbol(signature.thisParameter);
      }
      if (qf.is.classLike(container.parent)) {
        const symbol = this.symbolOfNode(container.parent);
        return qf.has.syntacticModifier(container, ModifierFlags.Static) ? this.this.typeOfSymbol() : (this.declaredTypeOfSymbol(symbol) as InterfaceType).thisType!;
      }
    }
    classNameFromPrototypeMethod(container: Node) {
      if (
        container.kind === Syntax.FunctionExpression &&
        container.parent?.kind === Syntax.BinaryExpression &&
        this.assignmentDeclarationKind(container.parent) === qt.AssignmentDeclarationKind.PrototypeProperty
      ) {
        return ((container.parent?.left as PropertyAccessExpression).expression as PropertyAccessExpression).expression;
      } else if (
        container.kind === Syntax.MethodDeclaration &&
        container.parent?.kind === Syntax.ObjectLiteralExpression &&
        container.parent?.parent?.kind === Syntax.BinaryExpression &&
        this.assignmentDeclarationKind(container.parent?.parent) === qt.AssignmentDeclarationKind.Prototype
      ) {
        return (container.parent?.parent?.left as PropertyAccessExpression).expression;
      } else if (
        container.kind === Syntax.FunctionExpression &&
        container.parent?.kind === Syntax.PropertyAssignment &&
        container.parent?.parent?.kind === Syntax.ObjectLiteralExpression &&
        qf.is.kind(qc.BinaryExpression, container.parent?.parent?.parent) &&
        this.assignmentDeclarationKind(container.parent?.parent?.parent) === qt.AssignmentDeclarationKind.Prototype
      ) {
        return (container.parent?.parent?.parent?.left as PropertyAccessExpression).expression;
      } else if (
        container.kind === Syntax.FunctionExpression &&
        container.parent?.kind === Syntax.PropertyAssignment &&
        container.parent?.name.kind === Syntax.Identifier &&
        (container.parent?.name.escapedText === 'value' || container.parent?.name.escapedText === 'get' || container.parent?.name.escapedText === 'set') &&
        container.parent?.parent?.kind === Syntax.ObjectLiteralExpression &&
        qf.is.kind(qc.CallExpression, container.parent?.parent?.parent) &&
        container.parent?.parent?.parent?.arguments[2] === container.parent?.parent &&
        this.assignmentDeclarationKind(container.parent?.parent?.parent) === qt.AssignmentDeclarationKind.ObjectDefinePrototypeProperty
      ) {
        return (container.parent?.parent?.parent?.arguments[0] as PropertyAccessExpression).expression;
      } else if (
        container.kind === Syntax.MethodDeclaration &&
        container.name.kind === Syntax.Identifier &&
        (container.name.escapedText === 'value' || container.name.escapedText === 'get' || container.name.escapedText === 'set') &&
        container.parent?.kind === Syntax.ObjectLiteralExpression &&
        container.parent?.parent?.kind === Syntax.CallExpression &&
        container.parent?.parent?.arguments[2] === container.parent &&
        this.assignmentDeclarationKind(container.parent?.parent) === qt.AssignmentDeclarationKind.ObjectDefinePrototypeProperty
      ) {
        return (container.parent?.parent?.arguments[0] as PropertyAccessExpression).expression;
      }
    }
    typeForThisExpressionFromDoc(n: Node) {
      const jsdocType = qc.getDoc.type(n);
      if (jsdocType && jsdocType.kind === Syntax.DocFunctionTyping) {
        const docFunctionType = <DocFunctionTyping>jsdocType;
        if (docFunctionType.parameters.length > 0 && docFunctionType.parameters[0].name && (docFunctionType.parameters[0].name as Identifier).escapedText === InternalSymbol.This)
          return this.typeFromTypeNode(docFunctionType.parameters[0].type!);
      }
      const thisTag = qc.getDoc.thisTag(n);
      if (thisTag && thisTag.typeExpression) return this.typeFromTypeNode(thisTag.typeExpression);
    }
    containingObjectLiteral(func: qt.SignatureDeclaration): ObjectLiteralExpression | undefined {
      return (func.kind === Syntax.MethodDeclaration || func.kind === Syntax.GetAccessor || func.kind === Syntax.SetAccessor) && func.parent?.kind === Syntax.ObjectLiteralExpression
        ? func.parent
        : func.kind === Syntax.FunctionExpression && func.parent?.kind === Syntax.PropertyAssignment
        ? <ObjectLiteralExpression>func.parent?.parent
        : undefined;
    }
    thisTypeArgument(t: qt.Type): qt.Type | undefined {
      return this.objectFlags(t) & ObjectFlags.Reference && (<TypeReference>type).target === globalThisType ? this.typeArguments(<TypeReference>type)[0] : undefined;
    }
    thisTypeFromContextualType(t: qt.Type): qt.Type | undefined {
      return mapType(t, (t) => {
        return t.flags & qt.TypeFlags.Intersection ? forEach((<IntersectionType>t).types, getThisTypeArgument) : this.thisTypeArgument(t);
      });
    }
    contextualThisParameterType(func: qt.SignatureDeclaration): qt.Type | undefined {
      if (func.kind === Syntax.ArrowFunction) return;
      if (qf.is.contextSensitiveFunctionOrObjectLiteralMethod(func)) {
        const contextualSignature = this.contextualSignature(func);
        if (contextualSignature) {
          const thisParameter = contextualSignature.thisParameter;
          if (thisParameter) return this.typeOfSymbol(thisParameter);
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
            literal = <ObjectLiteralExpression>literal.parent?.parent;
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
    contextuallyTypedParameterType(parameter: ParameterDeclaration): qt.Type | undefined {
      const func = parameter.parent;
      if (!qf.is.contextSensitiveFunctionOrObjectLiteralMethod(func)) return;
      const iife = this.immediatelyInvokedFunctionExpression(func);
      if (iife && iife.arguments) {
        const args = this.effectiveCallArguments(iife);
        const indexOfParameter = func.parameters.indexOf(parameter);
        if (parameter.dot3Token) return this.spreadArgumentType(args, indexOfParameter, args.length, anyType, undefined);
        const links = this.nodeLinks(iife);
        const cached = links.resolvedSignature;
        links.resolvedSignature = anySignature;
        const type = indexOfParameter < args.length ? this.widenedLiteralType(qf.check.expression(args[indexOfParameter])) : parameter.initer ? undefined : undefinedWideningType;
        links.resolvedSignature = cached;
        return type;
      }
      const contextualSignature = this.contextualSignature(func);
      if (contextualSignature) {
        const index = func.parameters.indexOf(parameter) - (this.thisNodeKind(ParameterDeclaration, func) ? 1 : 0);
        return parameter.dot3Token && lastOrUndefined(func.parameters) === parameter ? this.restTypeAtPosition(contextualSignature, index) : tryGetTypeAtPosition(contextualSignature, index);
      }
    }
    contextualTypeForVariableLikeDeclaration(declaration: VariableLikeDeclaration): qt.Type | undefined {
      const typeNode = this.effectiveTypeAnnotationNode(declaration);
      if (typeNode) return this.typeFromTypeNode(typeNode);
      switch (declaration.kind) {
        case Syntax.Parameter:
          return this.contextuallyTypedParameterType(declaration);
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
      const declaration = <VariableLikeDeclaration>n.parent;
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
            return contextualAwaitedType && this.unionType([contextualAwaitedType, createPromiseLikeType(contextualAwaitedType)]);
          }
          return contextualReturnType;
        }
      }
      return;
    }
    contextualTypeForAwaitOperand(n: AwaitExpression): qt.Type | undefined {
      const contextualType = this.contextualType(n);
      if (contextualType) {
        const contextualAwaitedType = this.awaitedType(contextualType);
        return contextualAwaitedType && this.unionType([contextualAwaitedType, createPromiseLikeType(contextualAwaitedType)]);
      }
      return;
    }
    contextualTypeForYieldOperand(n: YieldExpression): qt.Type | undefined {
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
      const signature = this.contextualSignatureForFunctionLikeDeclaration(<FunctionExpression>functionDecl);
      if (signature && !qf.is.resolvingReturnTypeOfSignature(signature)) return this.returnTypeOfSignature(signature);
      return;
    }
    contextualTypeForArgument(callTarget: CallLikeExpression, arg: qt.Expression): qt.Type | undefined {
      const args = this.effectiveCallArguments(callTarget);
      const argIndex = args.indexOf(arg);
      return argIndex === -1 ? undefined : this.contextualTypeForArgumentAtIndex(callTarget, argIndex);
    }
    contextualTypeForArgumentAtIndex(callTarget: CallLikeExpression, argIndex: number): qt.Type {
      const signature = this.nodeLinks(callTarget).resolvedSignature === resolvingSignature ? resolvingSignature : this.resolvedSignature(callTarget);
      if (qc.isJsx.openingLikeElem(callTarget) && argIndex === 0) return this.effectiveFirstArgumentForJsxSignature(signature, callTarget);
      return this.typeAtPosition(signature, argIndex);
    }
    contextualTypeForSubstitutionExpression(template: TemplateExpression, substitutionExpression: qt.Expression) {
      if (template.parent?.kind === Syntax.TaggedTemplateExpression) return this.contextualTypeForArgument(<TaggedTemplateExpression>template.parent, substitutionExpression);
      return;
    }
    contextualTypeForBinaryOperand(n: Expression, contextFlags?: ContextFlags): qt.Type | undefined {
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
    isContextSensitiveAssignmentOrContextType(binaryExpression: BinaryExpression): boolean | qt.Type {
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
              if (restType && NumericLiteral.name(name) && +name >= 0) return restType;
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
    contextualTypeForObjectLiteralMethod(n: MethodDeclaration, contextFlags?: ContextFlags): qt.Type | undefined {
      qu.assert(qf.is.objectLiteralMethod(n));
      if (n.flags & NodeFlags.InWithStatement) return;
      return this.contextualTypeForObjectLiteralElem(n, contextFlags);
    }
    contextualTypeForObjectLiteralElem(elem: ObjectLiteralElemLike, contextFlags?: ContextFlags) {
      const objectLiteral = <ObjectLiteralExpression>elem.parent;
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
    contextualTypeForConditionalOperand(n: Expression, contextFlags?: ContextFlags): qt.Type | undefined {
      const conditional = <ConditionalExpression>n.parent;
      return n === conditional.whenTrue || n === conditional.whenFalse ? this.contextualType(conditional, contextFlags) : undefined;
    }
    contextualTypeForChildJsxExpression(n: JsxElem, child: JsxChild) {
      const attributesType = this.apparentTypeOfContextualType(n.openingElem.tagName);
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
    contextualTypeForJsxExpression(n: JsxExpression): qt.Type | undefined {
      const exprParent = n.parent;
      return qc.isJsx.attributeLike(exprParent) ? this.contextualType(n) : exprParent.kind === Syntax.JsxElem ? this.contextualTypeForChildJsxExpression(exprParent, n) : undefined;
    }
    contextualTypeForJsxAttribute(attribute: JsxAttribute | JsxSpreadAttribute): qt.Type | undefined {
      if (attribute.kind === Syntax.JsxAttribute) {
        const attributesType = this.apparentTypeOfContextualType(attribute.parent);
        if (!attributesType || qf.is.typeAny(attributesType)) return;
        return this.typeOfPropertyOfContextualType(attributesType, attribute.name.escapedText);
      }
      return this.contextualType(attribute.parent);
    }
    apparentTypeOfContextualType(n: Expression | MethodDeclaration, contextFlags?: ContextFlags): qt.Type | undefined {
      const contextualType = qf.is.objectLiteralMethod(n) ? this.contextualTypeForObjectLiteralMethod(n, contextFlags) : this.contextualType(n, contextFlags);
      const instantiatedType = instantiateContextualType(contextualType, n, contextFlags);
      if (instantiatedType && !(contextFlags && contextFlags & ContextFlags.NoConstraints && instantiatedType.flags & qt.TypeFlags.TypeVariable)) {
        const apparentType = mapType(instantiatedType, getApparentType, true);
        if (apparentType.flags & qt.TypeFlags.Union) {
          if (n.kind === Syntax.ObjectLiteralExpression) return discriminateContextualTypeByObjectMembers(n, apparentType as UnionType);
          else if (n.kind === Syntax.JsxAttributes) return discriminateContextualTypeByJSXAttributes(n, apparentType as UnionType);
        }
        return apparentType;
      }
    }
    contextualType(n: Expression, contextFlags?: ContextFlags): qt.Type | undefined {
      if (n.flags & NodeFlags.InWithStatement) return;
      if (n.contextualType) return n.contextualType;
      const { parent } = n;
      switch (parent?.kind) {
        case Syntax.VariableDeclaration:
        case Syntax.Parameter:
        case Syntax.PropertyDeclaration:
        case Syntax.PropertySignature:
        case Syntax.BindingElem:
          return this.contextualTypeForIniterExpression(n);
        case Syntax.ArrowFunction:
        case Syntax.ReturnStatement:
          return this.contextualTypeForReturnExpression(n);
        case Syntax.YieldExpression:
          return this.contextualTypeForYieldOperand(<YieldExpression>parent);
        case Syntax.AwaitExpression:
          return this.contextualTypeForAwaitOperand(<AwaitExpression>parent);
        case Syntax.CallExpression:
          if ((<CallExpression>parent).expression.kind === Syntax.ImportKeyword) return stringType;
        case Syntax.NewExpression:
          return this.contextualTypeForArgument(<CallExpression | NewExpression>parent, n);
        case Syntax.TypeAssertionExpression:
        case Syntax.AsExpression:
          return qf.is.constTypeReference((<AssertionExpression>parent).type) ? undefined : this.typeFromTypeNode((<AssertionExpression>parent).type);
        case Syntax.BinaryExpression:
          return this.contextualTypeForBinaryOperand(n, contextFlags);
        case Syntax.PropertyAssignment:
        case Syntax.ShorthandPropertyAssignment:
          return this.contextualTypeForObjectLiteralElem(<PropertyAssignment | qt.ShorthandPropertyAssignment>parent, contextFlags);
        case Syntax.SpreadAssignment:
          return this.apparentTypeOfContextualType(parent?.parent as ObjectLiteralExpression, contextFlags);
        case Syntax.ArrayLiteralExpression: {
          const arrayLiteral = <ArrayLiteralExpression>parent;
          const type = this.apparentTypeOfContextualType(arrayLiteral, contextFlags);
          return this.contextualTypeForElemExpression(t, indexOfNode(arrayLiteral.elems, n));
        }
        case Syntax.ConditionalExpression:
          return this.contextualTypeForConditionalOperand(n, contextFlags);
        case Syntax.TemplateSpan:
          qu.assert(parent?.parent?.kind === Syntax.TemplateExpression);
          return this.contextualTypeForSubstitutionExpression(<TemplateExpression>parent?.parent, n);
        case Syntax.ParenthesizedExpression: {
          const tag = qf.is.inJSFile(parent) ? qc.getDoc.typeTag(parent) : undefined;
          return tag ? this.typeFromTypeNode(tag.typeExpression.type) : this.contextualType(<ParenthesizedExpression>parent, contextFlags);
        }
        case Syntax.JsxExpression:
          return this.contextualTypeForJsxExpression(<JsxExpression>parent);
        case Syntax.JsxAttribute:
        case Syntax.JsxSpreadAttribute:
          return this.contextualTypeForJsxAttribute(<JsxAttribute | JsxSpreadAttribute>parent);
        case Syntax.JsxOpeningElem:
        case Syntax.JsxSelfClosingElem:
          return this.contextualJsxElemAttributesType(<JsxOpeningLikeElem>parent, contextFlags);
      }
      return;
    }
    inferenceContext(n: Node) {
      const ancestor = qc.findAncestor(n, (n) => !!n.inferenceContext);
      return ancestor && ancestor.inferenceContext!;
    }
    contextualJsxElemAttributesType(n: JsxOpeningLikeElem, contextFlags?: ContextFlags) {
      if (n.kind === Syntax.JsxOpeningElem && n.parent?.contextualType && contextFlags !== ContextFlags.Completions) return n.parent?.contextualType;
      return this.contextualTypeForArgumentAtIndex(n, 0);
    }
    effectiveFirstArgumentForJsxSignature(s: qt.Signature, n: JsxOpeningLikeElem) {
      return this.jsxReferenceKind(n) !== JsxReferenceKind.Component ? this.jsxPropsTypeFromCallSignature(signature, n) : this.jsxPropsTypeFromClassType(signature, n);
    }
    jsxPropsTypeFromCallSignature(sig: qt.Signature, context: JsxOpeningLikeElem) {
      let propsType = this.typeOfFirstParameterOfSignatureWithFallback(sig, unknownType);
      propsType = this.jsxManagedAttributesFromLocatedAttributes(context, this.jsxNamespaceAt(context), propsType);
      const intrinsicAttribs = this.jsxType(JsxNames.IntrinsicAttributes, context);
      if (intrinsicAttribs !== errorType) propsType = intersectTypes(intrinsicAttribs, propsType);
      return propsType;
    }
    jsxPropsTypeForSignatureFromMember(sig: qt.Signature, forcedLookupLocation: qu.__String) {
      if (sig.unionSignatures) {
        const results: qt.Type[] = [];
        for (const signature of sig.unionSignatures) {
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
    staticTypeOfReferencedJsxConstructor(context: JsxOpeningLikeElem) {
      if (qf.is.jsxIntrinsicIdentifier(context.tagName)) {
        const result = this.intrinsicAttributesTypeFromJsxOpeningLikeElem(context);
        const fakeSignature = createSignatureForJSXIntrinsic(context, result);
        return this.orCreateTypeFromSignature(fakeSignature);
      }
      const tagType = qf.check.expressionCached(context.tagName);
      if (tagType.flags & qt.TypeFlags.StringLiteral) {
        const result = this.intrinsicAttributesTypeFromStringLiteralType(tagType as StringLiteralType, context);
        if (!result) return errorType;
        const fakeSignature = createSignatureForJSXIntrinsic(context, result);
        return this.orCreateTypeFromSignature(fakeSignature);
      }
      return tagType;
    }
    jsxManagedAttributesFromLocatedAttributes(context: JsxOpeningLikeElem, ns: Symbol, attributesType: qt.Type) {
      const managedSym = this.jsxLibraryManagedAttributes(ns);
      if (managedSym) {
        const declaredManagedType = this.declaredTypeOfSymbol(managedSym);
        const ctorType = this.staticTypeOfReferencedJsxConstructor(context);
        if (length((declaredManagedType as GenericType).typeParameters) >= 2) {
          const args = fillMissingTypeArguments([ctorType, attributesType], (declaredManagedType as GenericType).typeParameters, 2, qf.is.inJSFile(context));
          return createTypeReference(declaredManagedType as GenericType, args);
        } else if (length(declaredManagedType.aliasTypeArguments) >= 2) {
          const args = fillMissingTypeArguments([ctorType, attributesType], declaredManagedType.aliasTypeArguments, 2, qf.is.inJSFile(context));
          return this.typeAliasInstantiation(declaredManagedType.aliasSymbol!, args);
        }
      }
      return attributesType;
    }
    jsxPropsTypeFromClassType(sig: qt.Signature, context: JsxOpeningLikeElem) {
      const ns = this.jsxNamespaceAt(context);
      const forcedLookupLocation = this.jsxElemPropertiesName(ns);
      let attributesType =
        forcedLookupLocation === undefined
          ? this.typeOfFirstParameterOfSignatureWithFallback(sig, unknownType)
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
          const typeParams = this.localTypeParametersOfClassOrInterfaceOrTypeAlias(intrinsicClassAttribs.symbol);
          const hostClassType = this.returnTypeOfSignature(sig);
          apparentAttributesType = intersectTypes(
            typeParams
              ? createTypeReference(<GenericType>intrinsicClassAttribs, fillMissingTypeArguments([hostClassType], typeParams, this.minTypeArgumentCount(typeParams), qf.is.inJSFile(context)))
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
      return qf.is.functionExpressionOrArrowFunction(n) || qf.is.objectLiteralMethod(n) ? this.contextualSignature(<FunctionExpression>n) : undefined;
    }
    contextualSignature(n: qt.FunctionExpression | qt.ArrowFunction | MethodDeclaration): qt.Signature | undefined {
      qu.assert(n.kind !== Syntax.MethodDeclaration || qf.is.objectLiteralMethod(n));
      const typeTagSignature = this.signatureOfTypeTag(n);
      if (typeTagSignature) return typeTagSignature;
      const type = this.apparentTypeOfContextualType(n, ContextFlags.Signature);
      if (!type) return;
      if (!(t.flags & qt.TypeFlags.Union)) return this.contextualCallSignature(t, n);
      let signatureList: qt.Signature[] | undefined;
      const types = (<UnionType>type).types;
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
      if (signatureList) return signatureList.length === 1 ? signatureList[0] : createUnionSignature(signatureList[0], signatureList);
    }
    arrayLiteralTupleTypeIfApplicable(elemTypes: qt.Type[], contextualType: qt.Type | undefined, hasRestElem: boolean, elemCount = elemTypes.length, readonly = false) {
      if (readonly || (contextualType && forEachType(contextualType, qf.is.tupleLikeType))) return createTupleType(elemTypes, elemCount - (hasRestElem ? 1 : 0), hasRestElem, readonly);
      return;
    }
    objectLiteralIndexInfo(n: ObjectLiteralExpression, offset: number, properties: Symbol[], kind: IndexKind): IndexInfo {
      const propTypes: qt.Type[] = [];
      for (let i = 0; i < properties.length; i++) {
        if (kind === qt.IndexKind.String || qf.is.numericName(n.properties[i + offset].name!)) propTypes.push(this.typeOfSymbol(properties[i]));
      }
      const unionType = propTypes.length ? this.unionType(propTypes, UnionReduction.Subtype) : undefinedType;
      return createIndexInfo(unionType, qf.is.constContext(n));
    }
    jsxType(name: qu.__String, location: Node | undefined) {
      const namespace = this.jsxNamespaceAt(location);
      const exports = namespace && namespace.this.exportsOfSymbol();
      const typeSymbol = exports && this.symbol(exports, name, SymbolFlags.Type);
      return typeSymbol ? this.declaredTypeOfSymbol(typeSymbol) : errorType;
    }
    intrinsicTagSymbol(n: JsxOpeningLikeElem | JsxClosingElem): Symbol {
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
    jsxNamespaceAt(location: Node | undefined): Symbol {
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
    nameFromJsxElemAttributesContainer(nameOfAttribPropContainer: qu.__String, jsxNamespace: Symbol): qu.__String | undefined {
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
    jsxLibraryManagedAttributes(jsxNamespace: Symbol) {
      return jsxNamespace && this.symbol(jsxNamespace.exports!, JsxNames.LibraryManagedAttributes, SymbolFlags.Type);
    }
    jsxElemPropertiesName(jsxNamespace: Symbol) {
      return this.nameFromJsxElemAttributesContainer(JsxNames.ElemAttributesPropertyNameContainer, jsxNamespace);
    }
    jsxElemChildrenPropertyName(jsxNamespace: Symbol): qu.__String | undefined {
      return this.nameFromJsxElemAttributesContainer(JsxNames.ElemChildrenAttributeNameContainer, jsxNamespace);
    }
    uninstantiatedJsxSignaturesOfType(elemType: qt.Type, caller: JsxOpeningLikeElem): readonly qt.Signature[] {
      if (elemType.flags & qt.TypeFlags.String) return [anySignature];
      else if (elemType.flags & qt.TypeFlags.StringLiteral) {
        const intrinsicType = this.intrinsicAttributesTypeFromStringLiteralType(elemType as StringLiteralType, caller);
        if (!intrinsicType) {
          error(caller, qd.msgs.Property_0_does_not_exist_on_type_1, (elemType as StringLiteralType).value, 'JSX.' + JsxNames.IntrinsicElems);
          return empty;
        } else {
          const fakeSignature = createSignatureForJSXIntrinsic(caller, intrinsicType);
          return [fakeSignature];
        }
      }
      const apparentElemType = this.apparentType(elemType);
      let signatures = this.signaturesOfType(apparentElemType, qt.SignatureKind.Construct);
      if (signatures.length === 0) signatures = this.signaturesOfType(apparentElemType, qt.SignatureKind.Call);
      if (signatures.length === 0 && apparentElemType.flags & qt.TypeFlags.Union)
        signatures = this.unionSignatures(map((apparentElemType as UnionType).types, (t) => this.uninstantiatedJsxSignaturesOfType(t, caller)));
      return signatures;
    }
    intrinsicAttributesTypeFromStringLiteralType(t: StringLiteralType, location: Node): qt.Type | undefined {
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
    intrinsicAttributesTypeFromJsxOpeningLikeElem(n: JsxOpeningLikeElem): qt.Type {
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
    jsxIntrinsicTagNamesAt(location: Node): Symbol[] {
      const intrinsics = this.jsxType(JsxNames.IntrinsicElems, location);
      return intrinsics ? this.propertiesOfType(intrinsics) : empty;
    }
    declarationNodeFlagsFromSymbol(s: Symbol): NodeFlags {
      return s.valueDeclaration ? this.combinedFlagsOf(s.valueDeclaration) : 0;
    }
    thisParameterFromNodeContext(n: Node) {
      const thisContainer = this.thisContainer(n, false);
      return thisContainer && qf.is.functionLike(thisContainer) ? this.thisNodeKind(ParameterDeclaration, thisContainer) : undefined;
    }
    nonNullableTypeIfNeeded(t: qt.Type) {
      return qf.is.nullableType(t) ? this.nonNullableType(t) : type;
    }
    privateIdentifierPropertyOfType(leftType: qt.Type, lexicallyScopedIdentifier: Symbol): Symbol | undefined {
      return this.propertyOfType(leftType, lexicallyScopedIdentifier.escName);
    }
    flowTypeOfAccessExpression(n: ElemAccessExpression | PropertyAccessExpression | QualifiedName, prop: Symbol | undefined, propType: qt.Type, errorNode: Node) {
      const assignmentKind = this.assignmentTargetKind(n);
      if (
        !qf.is.accessExpression(n) ||
        assignmentKind === AssignmentKind.Definite ||
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
    superClass(classType: InterfaceType): qt.Type | undefined {
      const x = this.baseTypes(classType);
      if (x.length === 0) return;
      return this.intersectionType(x);
    }
    suggestedSymbolForNonexistentProperty(name: qc.Identifier | qc.PrivateIdentifier | string, containingType: qt.Type): Symbol | undefined {
      return this.spellingSuggestionForName(qf.is.string(name) ? name : idText(name), this.propertiesOfType(containingType), SymbolFlags.Value);
    }
    suggestionForNonexistentProperty(name: qc.Identifier | qc.PrivateIdentifier | string, containingType: qt.Type): string | undefined {
      const suggestion = this.suggestedSymbolForNonexistentProperty(name, containingType);
      return suggestion && suggestion.name;
    }
    suggestedSymbolForNonexistentSymbol(location: Node | undefined, outerName: qu.__String, meaning: SymbolFlags): Symbol | undefined {
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
    suggestedSymbolForNonexistentModule(name: Identifier, targetModule: Symbol): Symbol | undefined {
      return targetModule.exports && this.spellingSuggestionForName(idText(name), this.exportsOfModuleAsArray(targetModule), SymbolFlags.ModuleMember);
    }
    suggestionForNonexistentExport(name: Identifier, targetModule: Symbol): string | undefined {
      const suggestion = this.suggestedSymbolForNonexistentModule(name, targetModule);
      return suggestion && suggestion.name;
    }
    suggestionForNonexistentIndexSignature(objectType: qt.Type, expr: ElemAccessExpression, keyedType: qt.Type): string | undefined {
      const hasProp = (name: 'set' | 'get') => {
        const prop = this.propertyOfObjectType(objectType, <__String>name);
        if (prop) {
          const s = this.singleCallSignature(this.typeOfSymbol(prop));
          return !!s && this.minArgumentCount(s) >= 1 && qf.is.typeAssignableTo(keyedType, this.typeAtPosition(s, 0));
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
    spellingSuggestionForName(name: string, symbols: Symbol[], meaning: SymbolFlags): Symbol | undefined {
      const candidateName = (candidate: Symbol) => {
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
    forInVariableSymbol(n: ForInStatement): Symbol | undefined {
      const initer = n.initer;
      if (initer.kind === Syntax.VariableDeclarationList) {
        const variable = (<VariableDeclarationList>initer).declarations[0];
        if (variable && !variable.name.kind === Syntax.BindingPattern) return this.symbolOfNode(variable);
      } else if (initer.kind === Syntax.Identifier) {
        return this.resolvedSymbol(<Identifier>initer);
      }
      return;
    }
    spreadArgumentIndex(args: readonly Expression[]): number {
      return findIndex(args, isSpreadArgument);
    }
    singleCallSignature(t: qt.Type): qt.Signature | undefined {
      return this.singleSignature(t, qt.SignatureKind.Call, false);
    }
    singleCallOrConstructSignature(t: qt.Type): qt.Signature | undefined {
      return this.singleSignature(t, qt.SignatureKind.Call, false);
    }
    singleSignature(t: qt.Type, kind: qt.SignatureKind, allowMembers: boolean): qt.Signature | undefined {
      if (t.flags & qt.TypeFlags.Object) {
        const resolved = resolveStructuredTypeMembers(<ObjectType>type);
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
        ? createTupleType(this.typeArguments(t), t.target.minLength, t.target.hasRestElem, false, t.target.labeledElemDeclarations)
        : createArrayType(this.indexedAccessType(t, numberType));
    }
    spreadArgumentType(args: readonly Expression[], index: number, argCount: number, restType: qt.Type, context: InferenceContext | undefined) {
      if (index >= argCount - 1) {
        const arg = args[argCount - 1];
        if (qf.is.spreadArgument(arg)) {
          return arg.kind === Syntax.SyntheticExpression
            ? createArrayType((<SyntheticExpression>arg).type)
            : this.arrayifiedType(qf.check.expressionWithContextualType((<SpreadElem>arg).expression, restType, context, CheckMode.Normal));
        }
      }
      const types = [];
      const names: (ParameterDeclaration | NamedTupleMember)[] = [];
      let spreadIndex = -1;
      for (let i = index; i < argCount; i++) {
        const contextualType = this.indexedAccessType(restType, this.literalType(i - index));
        const argType = qf.check.expressionWithContextualType(args[i], contextualType, context, CheckMode.Normal);
        if (spreadIndex < 0 && qf.is.spreadArgument(args[i])) spreadIndex = i - index;
        if (args[i].kind === Syntax.SyntheticExpression && (args[i] as SyntheticExpression).tupleNameSource) names.push((args[i] as SyntheticExpression).tupleNameSource!);
        const hasPrimitiveContextualType = maybeTypeOfKind(contextualType, qt.TypeFlags.Primitive | qt.TypeFlags.Index);
        types.push(hasPrimitiveContextualType ? this.regularTypeOfLiteralType(argType) : this.widenedLiteralType(argType));
      }
      return spreadIndex < 0
        ? createTupleType(types, undefined, length(names) === length(types) ? names : undefined)
        : createTupleType(append(types.slice(0, spreadIndex), this.unionType(types.slice(spreadIndex))), spreadIndex, undefined);
    }
    jsxReferenceKind(n: JsxOpeningLikeElem): JsxReferenceKind {
      if (qf.is.jsxIntrinsicIdentifier(n.tagName)) return JsxReferenceKind.Mixed;
      const tagType = this.apparentType(qf.check.expression(n.tagName));
      if (length(this.signaturesOfType(tagType, qt.SignatureKind.Construct))) return JsxReferenceKind.Component;
      if (length(this.signaturesOfType(tagType, qt.SignatureKind.Call))) return JsxReferenceKind.Function;
      return JsxReferenceKind.Mixed;
    }
    signatureApplicabilityError(
      n: CallLikeExpression,
      args: readonly Expression[],
      signature: qt.Signature,
      relation: qu.QMap<RelationComparisonResult>,
      checkMode: CheckMode,
      reportErrors: boolean,
      containingMessageChain: (() => qd.MessageChain | undefined) | undefined
    ): readonly qd.Diagnostic[] | undefined {
      const errorOutputContainer: { errors?: qd.Diagnostic[]; skipLogging?: boolean } = { errors: undefined, skipLogging: true };
      if (qc.isJsx.openingLikeElem(n)) {
        if (!qf.check.applicableSignatureForJsxOpeningLikeElem(n, signature, relation, checkMode, reportErrors, containingMessageChain, errorOutputContainer)) {
          qu.assert(!reportErrors || !!errorOutputContainer.errors, 'jsx should have errors when reporting errors');
          return errorOutputContainer.errors || empty;
        }
        return;
      }
      const thisType = this.thisTypeOfSignature(signature);
      if (thisType && thisType !== voidType && n.kind !== Syntax.NewExpression) {
        const thisArgumentNode = this.thisArgumentOfCall(n);
        let thisArgumentType: Type;
        if (thisArgumentNode) {
          thisArgumentType = qf.check.expression(thisArgumentNode);
          if (qf.is.optionalChainRoot(thisArgumentNode.parent)) thisArgumentType = this.nonNullableType(thisArgumentType);
          else if (qf.is.optionalChain(thisArgumentNode.parent)) {
            thisArgumentType = removeOptionalTypeMarker(thisArgumentType);
          }
        } else {
          thisArgumentType = voidType;
        }
        const errorNode = reportErrors ? thisArgumentNode || n : undefined;
        const headMessage = qd.msgs.The_this_context_of_type_0_is_not_assignable_to_method_s_this_of_type_1;
        if (!qf.check.typeRelatedTo(thisArgumentType, thisType, relation, errorNode, headMessage, containingMessageChain, errorOutputContainer)) {
          qu.assert(!reportErrors || !!errorOutputContainer.errors, 'this parameter should have errors when reporting errors');
          return errorOutputContainer.errors || empty;
        }
      }
      const headMessage = qd.msgs.Argument_of_type_0_is_not_assignable_to_parameter_of_type_1;
      const restType = this.nonArrayRestType(signature);
      const argCount = restType ? Math.min(this.parameterCount(signature) - 1, args.length) : args.length;
      for (let i = 0; i < argCount; i++) {
        const arg = args[i];
        if (arg.kind !== Syntax.OmittedExpression) {
          const paramType = this.typeAtPosition(signature, i);
          const argType = qf.check.expressionWithContextualType(arg, paramType, undefined, checkMode);
          const checkArgType = checkMode & CheckMode.SkipContextSensitive ? this.regularTypeOfObjectLiteral(argType) : argType;
          if (!qf.check.typeRelatedToAndOptionallyElaborate(checkArgType, paramType, relation, reportErrors ? arg : undefined, arg, headMessage, containingMessageChain, errorOutputContainer)) {
            qu.assert(!reportErrors || !!errorOutputContainer.errors, 'parameter should have errors when reporting errors');
            maybeAddMissingAwaitInfo(arg, checkArgType, paramType);
            return errorOutputContainer.errors || empty;
          }
        }
      }
      if (restType) {
        const spreadType = this.spreadArgumentType(args, argCount, args.length, restType, undefined);
        const errorNode = reportErrors ? (argCount < args.length ? args[argCount] : n) : undefined;
        if (!qf.check.typeRelatedTo(spreadType, restType, relation, errorNode, headMessage, undefined, errorOutputContainer)) {
          qu.assert(!reportErrors || !!errorOutputContainer.errors, 'rest parameter should have errors when reporting errors');
          maybeAddMissingAwaitInfo(errorNode, spreadType, restType);
          return errorOutputContainer.errors || empty;
        }
      }
      return;
      const maybeAddMissingAwaitInfo = (errorNode: Node | undefined, source: qt.Type, target: qt.Type) => {
        if (errorNode && reportErrors && errorOutputContainer.errors && errorOutputContainer.errors.length) {
          if (this.awaitedTypeOfPromise(target)) return;
          const awaitedTypeOfSource = this.awaitedTypeOfPromise(source);
          if (awaitedTypeOfSource && qf.is.typeRelatedTo(awaitedTypeOfSource, target, relation))
            addRelatedInfo(errorOutputContainer.errors[0], qf.create.diagnosticForNode(errorNode, qd.msgs.Did_you_forget_to_use_await));
        }
      };
    }
    thisArgumentOfCall(n: CallLikeExpression): LeftExpression | undefined {
      if (n.kind === Syntax.CallExpression) {
        const callee = qc.skip.outerExpressions(n.expression);
        if (qf.is.accessExpression(callee)) return callee.expression;
      }
    }
    effectiveCallArguments(n: CallLikeExpression): readonly Expression[] {
      if (n.kind === Syntax.TaggedTemplateExpression) {
        const template = n.template;
        const args: Expression[] = [createSyntheticExpression(template, this.globalTemplateStringsArrayType())];
        if (template.kind === Syntax.TemplateExpression) {
          forEach(template.templateSpans, (span) => {
            args.push(span.expression);
          });
        }
        return args;
      }
      if (n.kind === Syntax.Decorator) return this.effectiveDecoratorArguments(n);
      if (qc.isJsx.openingLikeElem(n)) return n.attributes.properties.length > 0 || (n.kind === Syntax.JsxOpeningElem && n.parent?.children.length > 0) ? [n.attributes] : empty;
      const args = n.arguments || empty;
      const length = args.length;
      if (length && qf.is.spreadArgument(args[length - 1]) && this.spreadArgumentIndex(args) === length - 1) {
        const spreadArgument = <SpreadElem>args[length - 1];
        const type = flowLoopCount ? qf.check.expression(spreadArgument.expression) : qf.check.expressionCached(spreadArgument.expression);
        if (qf.is.tupleType(t)) {
          const typeArguments = this.typeArguments(<TypeReference>type);
          const restIndex = t.target.hasRestElem ? typeArguments.length - 1 : -1;
          const syntheticArgs = map(typeArguments, (t, i) => createSyntheticExpression(spreadArgument, t, i === restIndex, t.target.labeledElemDeclarations?.[i]));
          return concatenate(args.slice(0, length - 1), syntheticArgs);
        }
      }
      return args;
    }
    effectiveDecoratorArguments(n: Decorator): readonly Expression[] {
      const parent = n.parent;
      const expr = n.expression;
      switch (parent?.kind) {
        case Syntax.ClassDeclaration:
        case Syntax.ClassExpression:
          return [createSyntheticExpression(expr, this.typeOfSymbol(this.symbolOfNode(parent)))];
        case Syntax.Parameter:
          const func = <FunctionLikeDeclaration>parent?.parent;
          return [
            createSyntheticExpression(expr, parent?.parent?.kind === Syntax.Constructor ? this.typeOfSymbol(this.symbolOfNode(func)) : errorType),
            createSyntheticExpression(expr, anyType),
            createSyntheticExpression(expr, numberType),
          ];
        case Syntax.PropertyDeclaration:
        case Syntax.MethodDeclaration:
        case Syntax.GetAccessor:
        case Syntax.SetAccessor:
          const hasPropDesc = parent?.kind !== Syntax.PropertyDeclaration;
          return [
            createSyntheticExpression(expr, this.parentTypeOfClassElem(<ClassElem>parent)),
            createSyntheticExpression(expr, this.classElemPropertyKeyType(<ClassElem>parent)),
            createSyntheticExpression(expr, hasPropDesc ? createTypedPropertyDescriptorType(this.typeOfNode(parent)) : anyType),
          ];
      }
      return qu.fail();
    }
    decoratorArgumentCount(n: Decorator, signature: qt.Signature) {
      switch (n.parent?.kind) {
        case Syntax.ClassDeclaration:
        case Syntax.ClassExpression:
          return 1;
        case Syntax.PropertyDeclaration:
          return 2;
        case Syntax.MethodDeclaration:
        case Syntax.GetAccessor:
        case Syntax.SetAccessor:
          return signature.parameters.length <= 2 ? 2 : 3;
        case Syntax.Parameter:
          return 3;
        default:
          return qu.fail();
      }
    }
    diagnosticSpanForCallNode(n: CallExpression, doNotIncludeArguments?: boolean) {
      let start: number;
      let length: number;
      const sourceFile = n.sourceFile;
      if (n.expression.kind === Syntax.PropertyAccessExpression) {
        const nameSpan = this.errorSpanForNode(sourceFile, n.expression.name);
        start = nameSpan.start;
        length = doNotIncludeArguments ? nameSpan.length : n.end - start;
      } else {
        const expressionSpan = this.errorSpanForNode(sourceFile, n.expression);
        start = expressionSpan.start;
        length = doNotIncludeArguments ? expressionSpan.length : n.end - start;
      }
      return { start, length, sourceFile };
    }
    diagnosticForCallNode(n: CallLikeExpression, message: qd.Message, arg0?: string | number, arg1?: string | number, arg2?: string | number, arg3?: string | number): qd.DiagnosticWithLocation {
      if (n.kind === Syntax.CallExpression) {
        const { sourceFile, start, length } = this.diagnosticSpanForCallNode(n);
        return qf.create.fileDiagnostic(sourceFile, start, length, message, arg0, arg1, arg2, arg3);
      }
      return qf.create.diagnosticForNode(n, message, arg0, arg1, arg2, arg3);
    }
    argumentArityError(n: CallLikeExpression, signatures: readonly qt.Signature[], args: readonly Expression[]) {
      let min = Number.POSITIVE_INFINITY;
      let max = Number.NEGATIVE_INFINITY;
      let belowArgCount = Number.NEGATIVE_INFINITY;
      let aboveArgCount = Number.POSITIVE_INFINITY;
      let argCount = args.length;
      let closestSignature: qt.Signature | undefined;
      for (const sig of signatures) {
        const minCount = this.minArgumentCount(sig);
        const maxCount = this.parameterCount(sig);
        if (minCount < argCount && minCount > belowArgCount) belowArgCount = minCount;
        if (argCount < maxCount && maxCount < aboveArgCount) aboveArgCount = maxCount;
        if (minCount < min) {
          min = minCount;
          closestSignature = sig;
        }
        max = Math.max(max, maxCount);
      }
      const hasRestParameter = qu.some(signatures, hasEffectiveRestParameter);
      const paramRange = hasRestParameter ? min : min < max ? min + '-' + max : min;
      const hasSpreadArgument = this.spreadArgumentIndex(args) > -1;
      if (argCount <= max && hasSpreadArgument) argCount--;
      let spanArray: Nodes<Node>;
      let related: qd.DiagnosticWithLocation | undefined;
      const error =
        hasRestParameter || hasSpreadArgument
          ? hasRestParameter && hasSpreadArgument
            ? qd.msgs.Expected_at_least_0_arguments_but_got_1_or_more
            : hasRestParameter
            ? qd.msgs.Expected_at_least_0_arguments_but_got_1
            : qd.msgs.Expected_0_arguments_but_got_1_or_more
          : qd.msgs.Expected_0_arguments_but_got_1;
      if (closestSignature && this.minArgumentCount(closestSignature) > argCount && closestSignature.declaration) {
        const paramDecl = closestSignature.declaration.parameters[closestSignature.thisParameter ? argCount + 1 : argCount];
        if (paramDecl) {
          related = qf.create.diagnosticForNode(
            paramDecl,
            paramDecl.name.kind === Syntax.BindingPattern ? qd.msgs.An_argument_matching_this_binding_pattern_was_not_provided : qd.msgs.An_argument_for_0_was_not_provided,
            !paramDecl.name ? argCount : !paramDecl.name.kind === Syntax.BindingPattern ? idText(this.firstIdentifier(paramDecl.name)) : undefined
          );
        }
      }
      if (min < argCount && argCount < max)
        return this.diagnosticForCallNode(n, qd.msgs.No_overload_expects_0_arguments_but_overloads_do_exist_that_expect_either_1_or_2_arguments, argCount, belowArgCount, aboveArgCount);
      if (!hasSpreadArgument && argCount < min) {
        const diagnostic = this.diagnosticForCallNode(n, error, paramRange, argCount);
        return related ? addRelatedInfo(diagnostic, related) : diagnostic;
      }
      if (hasRestParameter || hasSpreadArgument) {
        spanArray = new Nodes(args);
        if (hasSpreadArgument && argCount) {
          const nextArg = elemAt(args, this.spreadArgumentIndex(args) + 1) || undefined;
          spanArray = new Nodes(args.slice(max > argCount && nextArg ? args.indexOf(nextArg) : Math.min(max, args.length - 1)));
        }
      } else {
        spanArray = new Nodes(args.slice(max));
      }
      spanArray.pos = first(spanArray).pos;
      spanArray.end = last(spanArray).end;
      if (spanArray.end === spanArray.pos) spanArray.end++;
      const diagnostic = qf.create.diagnosticForNodes(n.sourceFile, spanArray, error, paramRange, argCount);
      return related ? addRelatedInfo(diagnostic, related) : diagnostic;
    }
    typeArgumentArityError(n: Node, signatures: readonly qt.Signature[], typeArguments: Nodes<Typing>) {
      const argCount = typeArguments.length;
      if (signatures.length === 1) {
        const sig = signatures[0];
        const min = this.minTypeArgumentCount(sig.typeParameters);
        const max = length(sig.typeParameters);
        return qf.create.diagnosticForNodes(n.sourceFile, typeArguments, qd.msgs.Expected_0_type_arguments_but_got_1, min < max ? min + '-' + max : min, argCount);
      }
      let belowArgCount = -Infinity;
      let aboveArgCount = Infinity;
      for (const sig of signatures) {
        const min = this.minTypeArgumentCount(sig.typeParameters);
        const max = length(sig.typeParameters);
        if (min > argCount) aboveArgCount = Math.min(aboveArgCount, min);
        else if (max < argCount) {
          belowArgCount = Math.max(belowArgCount, max);
        }
      }
      if (belowArgCount !== -Infinity && aboveArgCount !== Infinity) {
        return qf.create.diagnosticForNodes(
          n.sourceFile,
          typeArguments,
          qd.msgs.No_overload_expects_0_type_arguments_but_overloads_do_exist_that_expect_either_1_or_2_type_arguments,
          argCount,
          belowArgCount,
          aboveArgCount
        );
      }
      return qf.create.diagnosticForNodes(n.sourceFile, typeArguments, qd.msgs.Expected_0_type_arguments_but_got_1, belowArgCount === -Infinity ? aboveArgCount : belowArgCount, argCount);
    }
    candidateForOverloadFailure(n: CallLikeExpression, candidates: qt.Signature[], args: readonly Expression[], hasCandidatesOutArray: boolean): qt.Signature {
      qu.assert(candidates.length > 0);
      qf.check.nodeDeferred(n);
      return hasCandidatesOutArray || candidates.length === 1 || candidates.some((c) => !!c.typeParameters)
        ? pickLongestCandidateSignature(n, candidates, args)
        : createUnionOfSignaturesForOverloadFailure(candidates);
    }
    numNonRestParameters(s: qt.Signature): number {
      const numParams = signature.parameters.length;
      return signatureHasRestParameter(signature) ? numParams - 1 : numParams;
    }
    typeArgumentsFromNodes(typeArgumentNodes: readonly Typing[], typeParameters: readonly TypeParameter[], isJs: boolean): readonly qt.Type[] {
      const typeArguments = typeArgumentNodes.map(getTypeOfNode);
      while (typeArguments.length > typeParameters.length) {
        typeArguments.pop();
      }
      while (typeArguments.length < typeParameters.length) {
        typeArguments.push(this.constraintOfTypeParameter(typeParameters[typeArguments.length]) || this.defaultTypeArgumentType(isJs));
      }
      return typeArguments;
    }
    longestCandidateIndex(candidates: qt.Signature[], argsCount: number): number {
      let maxParamsIndex = -1;
      let maxParams = -1;
      for (let i = 0; i < candidates.length; i++) {
        const candidate = candidates[i];
        const paramCount = this.parameterCount(candidate);
        if (qf.has.effectiveRestParameter(candidate) || paramCount >= argsCount) return i;
        if (paramCount > maxParams) {
          maxParams = paramCount;
          maxParamsIndex = i;
        }
      }
      return maxParamsIndex;
    }
    diagnosticHeadMessageForDecoratorResolution(n: Decorator) {
      switch (n.parent?.kind) {
        case Syntax.ClassDeclaration:
        case Syntax.ClassExpression:
          return qd.msgs.Unable_to_resolve_signature_of_class_decorator_when_called_as_an_expression;
        case Syntax.Parameter:
          return qd.msgs.Unable_to_resolve_signature_of_parameter_decorator_when_called_as_an_expression;
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
    resolvedSignature(n: CallLikeExpression, candidatesOutArray?: qt.Signature[] | undefined, checkMode?: CheckMode): qt.Signature {
      const links = this.nodeLinks(n);
      const cached = links.resolvedSignature;
      if (cached && cached !== resolvingSignature && !candidatesOutArray) return cached;
      links.resolvedSignature = resolvingSignature;
      const result = resolveSignature(n, candidatesOutArray, checkMode || CheckMode.Normal);
      if (result !== resolvingSignature) links.resolvedSignature = flowLoopStart === flowLoopCount ? result : cached;
      return result;
    }
    assignedClassSymbol(decl: qt.Declaration): Symbol | undefined {
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
    typeWithSyntheticDefaultImportType(t: qt.Type, symbol: Symbol, originalSymbol: Symbol): qt.Type {
      if (allowSyntheticDefaultImports && type && type !== errorType) {
        const synthType = type as SyntheticDefaultModuleType;
        if (!synthType.syntheticType) {
          const file = qu.find(originalSymbol.declarations, isSourceFile);
          const hasSyntheticDefault = canHaveSyntheticDefault(file, originalSymbol, false);
          if (hasSyntheticDefault) {
            const memberTable = new SymbolTable();
            const newSymbol = new Symbol(SymbolFlags.Alias, InternalSymbol.Default);
            newSymbol.nameType = this.literalType('default');
            newSymbol.target = symbol.resolveSymbol();
            memberTable.set(InternalSymbol.Default, newSymbol);
            const anonymousSymbol = new Symbol(SymbolFlags.TypeLiteral, InternalSymbol.Type);
            const defaultContainingObject = createAnonymousType(anonymousSymbol, memberTable, empty, empty, undefined);
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
    tupleElemLabel(d: ParameterDeclaration | NamedTupleMember) {
      qu.assert(d.name.kind === Syntax.Identifier);
      return d.name.escapedText;
    }
    parameterNameAtPosition(s: qt.Signature, pos: number) {
      const paramCount = signature.parameters.length - (signatureHasRestParameter(signature) ? 1 : 0);
      if (pos < paramCount) return signature.parameters[pos].escName;
      const restParameter = signature.parameters[paramCount] || unknownSymbol;
      const restType = this.typeOfSymbol(restParameter);
      if (qf.is.tupleType(restType)) {
        const associatedNames = (<TupleType>(<TypeReference>restType).target).labeledElemDeclarations;
        const index = pos - paramCount;
        return (associatedNames && this.tupleElemLabel(associatedNames[index])) || ((restParameter.escName + '_' + index) as qu.__String);
      }
      return restParameter.escName;
    }
    nameableDeclarationAtPosition(s: qt.Signature, pos: number) {
      const paramCount = signature.parameters.length - (signatureHasRestParameter(signature) ? 1 : 0);
      if (pos < paramCount) {
        const decl = signature.parameters[pos].valueDeclaration;
        return decl && qf.is.validDeclarationForTupleLabel(decl) ? decl : undefined;
      }
      const restParameter = signature.parameters[paramCount] || unknownSymbol;
      const restType = this.typeOfSymbol(restParameter);
      if (qf.is.tupleType(restType)) {
        const associatedNames = (<TupleType>(<TypeReference>restType).target).labeledElemDeclarations;
        const index = pos - paramCount;
        return associatedNames && associatedNames[index];
      }
      return restParameter.valueDeclaration && qf.is.validDeclarationForTupleLabel(restParameter.valueDeclaration) ? restParameter.valueDeclaration : undefined;
    }
    typeAtPosition(s: qt.Signature, pos: number): qt.Type {
      return tryGetTypeAtPosition(signature, pos) || anyType;
    }
    restTypeAtPosition(source: qt.Signature, pos: number): qt.Type {
      const paramCount = this.parameterCount(source);
      const restType = this.effectiveRestType(source);
      const nonRestCount = paramCount - (restType ? 1 : 0);
      if (restType && pos === nonRestCount) return restType;
      const types = [];
      let names: (NamedTupleMember | ParameterDeclaration)[] | undefined = [];
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
      const minArgumentCount = this.minArgumentCount(source);
      const minLength = minArgumentCount < pos ? 0 : minArgumentCount - pos;
      return createTupleType(types, minLength, !!restType, false, names);
    }
    parameterCount(s: qt.Signature) {
      const length = signature.parameters.length;
      if (signatureHasRestParameter(signature)) {
        const restType = this.typeOfSymbol(signature.parameters[length - 1]);
        if (qf.is.tupleType(restType)) return length + this.typeArguments(restType).length - 1;
      }
      return length;
    }
    minArgumentCount(s: qt.Signature, strongArityForUntypedJS?: boolean) {
      if (signatureHasRestParameter(signature)) {
        const restType = this.typeOfSymbol(signature.parameters[signature.parameters.length - 1]);
        if (qf.is.tupleType(restType)) {
          const minLength = restType.target.minLength;
          if (minLength > 0) return signature.parameters.length - 1 + minLength;
        }
      }
      if (!strongArityForUntypedJS && signature.flags & qt.SignatureFlags.IsUntypedSignatureInJSFile) return 0;
      return signature.minArgumentCount;
    }
    effectiveRestType(s: qt.Signature) {
      if (signatureHasRestParameter(signature)) {
        const restType = this.typeOfSymbol(signature.parameters[signature.parameters.length - 1]);
        return qf.is.tupleType(restType) ? this.restArrayTypeOfTupleType(restType) : restType;
      }
      return;
    }
    nonArrayRestType(s: qt.Signature) {
      const restType = this.effectiveRestType(signature);
      return restType && !qf.is.arrayType(restType) && !qf.is.typeAny(restType) && (this.reducedType(restType).flags & qt.TypeFlags.Never) === 0 ? restType : undefined;
    }
    typeOfFirstParameterOfSignature(s: qt.Signature) {
      return this.typeOfFirstParameterOfSignatureWithFallback(signature, neverType);
    }
    typeOfFirstParameterOfSignatureWithFallback(s: qt.Signature, fallbackType: qt.Type) {
      return signature.parameters.length > 0 ? this.typeAtPosition(signature, 0) : fallbackType;
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
        if (!types) return functionFlags & FunctionFlags.Async ? createPromiseReturnType(func, neverType) : neverType;
        if (types.length === 0) return functionFlags & FunctionFlags.Async ? createPromiseReturnType(func, voidType) : voidType;
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
        return createGeneratorReturnType(yieldType || neverType, returnType || fallbackReturnType, nextType || this.contextualIterationType(IterationTypeKind.Next, func) || unknownType, isAsync);
      return isAsync ? createPromiseType(returnType || fallbackReturnType) : returnType || fallbackReturnType;
    }
    yieldedTypeOfYieldExpression(n: YieldExpression, expressionType: qt.Type, sentType: qt.Type, isAsync: boolean): qt.Type | undefined {
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
    baseTypesIfUnrelated(leftType: qt.Type, rightType: qt.Type, isRelated: (left: qt.Type, right: qt.Type) => boolean): [Type, Type] {
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
    uniqueTypeParameters(context: InferenceContext, typeParameters: readonly TypeParameter[]): readonly TypeParameter[] {
      const result: TypeParameter[] = [];
      let oldTypeParameters: TypeParameter[] | undefined;
      let newTypeParameters: TypeParameter[] | undefined;
      for (const tp of typeParameters) {
        const name = tp.symbol.escName;
        if (qf.has.typeParameterByName(context.inferredTypeParameters, name) || qf.has.typeParameterByName(result, name)) {
          const newName = this.uniqueTypeParameterName(concatenate(context.inferredTypeParameters, result), name);
          const symbol = new Symbol(SymbolFlags.TypeParameter, newName);
          const newTypeParameter = createTypeParameter(symbol);
          newTypeParameter.target = tp;
          oldTypeParameters = append(oldTypeParameters, tp);
          newTypeParameters = append(newTypeParameters, newTypeParameter);
          result.push(newTypeParameter);
        } else {
          result.push(tp);
        }
      }
      if (newTypeParameters) {
        const mapper = createTypeMapper(oldTypeParameters!, newTypeParameters);
        for (const tp of newTypeParameters) {
          tp.mapper = mapper;
        }
      }
      return result;
    }
    uniqueTypeParameterName(typeParameters: readonly TypeParameter[], baseName: qu.__String) {
      let len = (<string>baseName).length;
      while (len > 1 && (<string>baseName).charCodeAt(len - 1) >= Codes._0 && (<string>baseName).charCodeAt(len - 1) <= Codes._9) len--;
      const s = (<string>baseName).slice(0, len);
      for (let index = 1; true; index++) {
        const augmentedName = <__String>(s + index);
        if (!qf.has.typeParameterByName(typeParameters, augmentedName)) return augmentedName;
      }
    }
    returnTypeOfSingleNonGenericCallSignature(funcType: qt.Type) {
      const signature = this.singleCallSignature(funcType);
      if (signature && !signature.typeParameters) return this.returnTypeOfSignature(signature);
    }
    returnTypeOfSingleNonGenericSignatureOfCallChain(expr: CallChain) {
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
      const expr = qc.skip.parentheses(n);
      if (expr.kind === Syntax.CallExpression && expr.expression.kind !== Syntax.SuperKeyword && !qf.is.requireCall(expr, true) && !qf.is.symbolOrSymbolForCall(expr)) {
        const type = qf.is.callChain(expr) ? this.returnTypeOfSingleNonGenericSignatureOfCallChain(expr) : this.returnTypeOfSingleNonGenericCallSignature(qf.check.nonNullExpression(expr.expression));
        if (t) return type;
      } else if (qf.is.assertionExpression(expr) && !qf.is.constTypeReference(expr.type)) {
        return this.typeFromTypeNode((<TypeAssertion>expr).type);
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
          const parent = <SignatureDeclaration>n.parent;
          if (n === parent?.type) return parent;
      }
    }
    effectiveTypeArguments(n: qt.TypingReference | ExpressionWithTypings, typeParameters: readonly TypeParameter[]): qt.Type[] {
      return fillMissingTypeArguments(map(n.typeArguments!, this.typeFromTypeNode), typeParameters, this.minTypeArgumentCount(typeParameters), qf.is.inJSFile(n));
    }
    typeParametersForTypeReference(n: qt.TypingReference | ExpressionWithTypings) {
      const type = this.typeFromTypeReference(n);
      if (type !== errorType) {
        const symbol = this.nodeLinks(n).resolvedSymbol;
        if (symbol) {
          return (
            (symbol.flags & SymbolFlags.TypeAlias && s.this.links(symbol).typeParameters) ||
            (this.objectFlags(t) & ObjectFlags.Reference ? (<TypeReference>type).target.localTypeParameters : undefined)
          );
        }
      }
      return;
    }
    typeArgumentConstraint(n: Typing): qt.Type | undefined {
      const typeReferenceNode = qu.tryCast(n.parent, isTypeReferenceType);
      if (!typeReferenceNode) return;
      const typeParameters = this.typeParametersForTypeReference(typeReferenceNode)!;
      const constraint = this.constraintOfTypeParameter(typeParameters[typeReferenceNode.typeArguments!.indexOf(n)]);
      return constraint && instantiateType(constraint, createTypeMapper(typeParameters, this.effectiveTypeArguments(typeReferenceNode, typeParameters)));
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
      const typeAsPromise = <PromiseOrAwaitableType>type;
      if (typeAsPromise.promisedTypeOfPromise) return typeAsPromise.promisedTypeOfPromise;
      if (qf.is.referenceToType(t, this.globalPromiseType(false))) return (typeAsPromise.promisedTypeOfPromise = this.typeArguments(<GenericType>type)[0]);
      const thenFunction = this.typeOfPropertyOfType(t, 'then' as qu.__String)!;
      if (qf.is.typeAny(thenFunction)) return;
      const thenSignatures = thenFunction ? this.signaturesOfType(thenFunction, qt.SignatureKind.Call) : empty;
      if (thenSignatures.length === 0) {
        if (errorNode) error(errorNode, qd.msgs.A_promise_must_have_a_then_method);
        return;
      }
      const onfulfilledParameterType = this.typeWithFacts(this.unionType(map(thenSignatures, getTypeOfFirstParameterOfSignature)), TypeFacts.NEUndefinedOrNull);
      if (qf.is.typeAny(onfulfilledParameterType)) return;
      const onfulfilledParameterSignatures = this.signaturesOfType(onfulfilledParameterType, qt.SignatureKind.Call);
      if (onfulfilledParameterSignatures.length === 0) {
        if (errorNode) error(errorNode, qd.msgs.The_first_parameter_of_the_then_method_of_a_promise_must_be_a_callback);
        return;
      }
      return (typeAsPromise.promisedTypeOfPromise = this.unionType(map(onfulfilledParameterSignatures, getTypeOfFirstParameterOfSignature), UnionReduction.Subtype));
    }
    awaitedType(t: qt.Type, errorNode?: Node, diagnosticMessage?: qd.Message, arg0?: string | number): qt.Type | undefined {
      if (qf.is.typeAny(t)) return type;
      const typeAsAwaitable = <PromiseOrAwaitableType>type;
      if (typeAsAwaitable.awaitedTypeOfType) return typeAsAwaitable.awaitedTypeOfType;
      return (typeAsAwaitable.awaitedTypeOfType = mapType(t, errorNode ? (constituentType) => this.awaitedTypeWorker(constituentType, errorNode, diagnosticMessage, arg0) : getAwaitedTypeWorker));
    }
    awaitedTypeWorker(t: qt.Type, errorNode?: Node, diagnosticMessage?: qd.Message, arg0?: string | number): qt.Type | undefined {
      const typeAsAwaitable = <PromiseOrAwaitableType>type;
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
    entityNameForDecoratorMetadata(n: Typing | undefined): qt.EntityName | undefined {
      if (n) {
        switch (n.kind) {
          case Syntax.IntersectionTyping:
          case Syntax.UnionTyping:
            return this.entityNameForDecoratorMetadataFromTypeList((<UnionOrIntersectionTyping>n).types);
          case Syntax.ConditionalTyping:
            return this.entityNameForDecoratorMetadataFromTypeList([(<ConditionalTyping>n).trueType, (<ConditionalTyping>n).falseType]);
          case Syntax.ParenthesizedTyping:
          case Syntax.NamedTupleMember:
            return this.entityNameForDecoratorMetadata((<ParenthesizedTyping>n).type);
          case Syntax.TypingReference:
            return (<TypingReference>n).typeName;
        }
      }
    }
    entityNameForDecoratorMetadataFromTypeList(types: readonly Typing[]): qt.EntityName | undefined {
      let commonEntityName: qt.EntityName | undefined;
      for (let typeNode of types) {
        while (typeNode.kind === Syntax.ParenthesizedTyping || typeNode.kind === Syntax.NamedTupleMember) {
          typeNode = (typeNode as ParenthesizedTyping | NamedTupleMember).type;
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
    parameterTypeNodeForDecoratorCheck(n: ParameterDeclaration): Typing | undefined {
      const typeNode = this.effectiveTypeAnnotationNode(n);
      return qf.is.restParameter(n) ? this.restParameterElemType(typeNode) : typeNode;
    }
    identifierFromEntityNameExpression(n: qc.Identifier | PropertyAccessExpression): qc.Identifier | qc.PrivateIdentifier;
    identifierFromEntityNameExpression(n: qt.Expression): qc.Identifier | qc.PrivateIdentifier | undefined;
    identifierFromEntityNameExpression(n: qt.Expression): qc.Identifier | qc.PrivateIdentifier | undefined {
      switch (n.kind) {
        case Syntax.Identifier:
          return n as Identifier;
        case Syntax.PropertyAccessExpression:
          return (n as PropertyAccessExpression).name;
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
      const downlevelIteration = !uplevelIteration && compilerOptions.downlevelIteration;
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
          const arrayTypes = (<UnionType>inputType).types;
          const filteredTypes = filter(arrayTypes, (t) => !(t.flags & qt.TypeFlags.StringLike));
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
    cachedIterationTypes(t: qt.Type, cacheKey: MatchingKeys<IterableOrIteratorType, IterationTypes | undefined>) {
      return (type as IterableOrIteratorType)[cacheKey];
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
      let allIterationTypes: IterationTypes[] | undefined;
      for (const constituent of (type as UnionType).types) {
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
    asyncFromSyncIterationTypes(iterationTypes: IterationTypes, errorNode: Node | undefined) {
      if (iterationTypes === noIterationTypes) return noIterationTypes;
      if (iterationTypes === anyIterationTypes) return anyIterationTypes;
      const { yieldType, returnType, nextType } = iterationTypes;
      return createIterationTypes(this.awaitedType(yieldType, errorNode) || anyType, this.awaitedType(returnType, errorNode) || anyType, nextType);
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
      let globalType: Type;
      if (qf.is.referenceToType(t, (globalType = resolver.this.globalIterableType(false))) || qf.is.referenceToType(t, (globalType = resolver.this.globalIterableIteratorType(false)))) {
        const [yieldType] = this.typeArguments(type as GenericType);
        const { returnType, nextType } = this.iterationTypesOfGlobalIterableType(globalType, resolver);
        return setCachedIterationTypes(t, resolver.iterableCacheKey, createIterationTypes(yieldType, returnType, nextType));
      }
      if (qf.is.referenceToType(t, resolver.this.globalGeneratorType(false))) {
        const [yieldType, returnType, nextType] = this.typeArguments(type as GenericType);
        return setCachedIterationTypes(t, resolver.iterableCacheKey, createIterationTypes(yieldType, returnType, nextType));
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
        const [yieldType] = this.typeArguments(type as GenericType);
        const globalIterationTypes = this.iterationTypesOfIteratorCached(globalType, resolver) || this.iterationTypesOfIteratorSlow(globalType, resolver, undefined);
        const { returnType, nextType } = globalIterationTypes === noIterationTypes ? defaultIterationTypes : globalIterationTypes;
        return setCachedIterationTypes(t, resolver.iteratorCacheKey, createIterationTypes(yieldType, returnType, nextType));
      }
      if (qf.is.referenceToType(t, resolver.this.globalIteratorType(false)) || qf.is.referenceToType(t, resolver.this.globalGeneratorType(false))) {
        const [yieldType, returnType, nextType] = this.typeArguments(type as GenericType);
        return setCachedIterationTypes(t, resolver.iteratorCacheKey, createIterationTypes(yieldType, returnType, nextType));
      }
    }
    iterationTypesOfIteratorResult(t: qt.Type) {
      if (qf.is.typeAny(t)) return anyIterationTypes;
      const cachedTypes = this.cachedIterationTypes(t, 'iterationTypesOfIteratorResult');
      if (cachedTypes) return cachedTypes;
      if (qf.is.referenceToType(t, this.globalIteratorYieldResultType(false))) {
        const yieldType = this.typeArguments(type as GenericType)[0];
        return setCachedIterationTypes(t, 'iterationTypesOfIteratorResult', createIterationTypes(yieldType, undefined));
      }
      if (qf.is.referenceToType(t, this.globalIteratorReturnResultType(false))) {
        const returnType = this.typeArguments(type as GenericType)[0];
        return setCachedIterationTypes(t, 'iterationTypesOfIteratorResult', createIterationTypes(undefined));
      }
      const yieldIteratorResult = filterType(t, isYieldIteratorResult);
      const yieldType = yieldIteratorResult !== neverType ? this.typeOfPropertyOfType(yieldIteratorResult, 'value' as qu.__String) : undefined;
      const returnIteratorResult = filterType(t, isReturnIteratorResult);
      const returnType = returnIteratorResult !== neverType ? this.typeOfPropertyOfType(returnIteratorResult, 'value' as qu.__String) : undefined;
      if (!yieldType && !returnType) return setCachedIterationTypes(t, 'iterationTypesOfIteratorResult', noIterationTypes);
      return setCachedIterationTypes(t, 'iterationTypesOfIteratorResult', createIterationTypes(yieldType, returnType || voidType, undefined));
    }
    iterationTypesOfMethod(t: qt.Type, resolver: IterationTypesResolver, methodName: 'next' | 'return' | 'throw', errorNode: Node | undefined): IterationTypes | undefined {
      const method = this.propertyOfType(t, methodName as qu.__String);
      if (!method && methodName !== 'next') return;
      const methodType =
        method && !(methodName === 'next' && method.flags & SymbolFlags.Optional)
          ? methodName === 'next'
            ? this.typeOfSymbol(method)
            : this.typeWithFacts(this.typeOfSymbol(method), TypeFacts.NEUndefinedOrNull)
          : undefined;
      if (qf.is.typeAny(methodType)) return methodName === 'next' ? anyIterationTypes : anyIterationTypesExceptNext;
      const methodSignatures = methodType ? this.signaturesOfType(methodType, qt.SignatureKind.Call) : empty;
      if (methodSignatures.length === 0) {
        if (errorNode) {
          const diagnostic = methodName === 'next' ? resolver.mustHaveANextMethodDiagnostic : resolver.mustBeAMethodDiagnostic;
          error(errorNode, diagnostic, methodName);
        }
        return methodName === 'next' ? anyIterationTypes : undefined;
      }
      let methodParameterTypes: qt.Type[] | undefined;
      let methodReturnTypes: qt.Type[] | undefined;
      for (const signature of methodSignatures) {
        if (methodName !== 'throw' && qu.some(signature.parameters)) methodParameterTypes = append(methodParameterTypes, this.typeAtPosition(signature, 0));
        methodReturnTypes = append(methodReturnTypes, this.returnTypeOfSignature(signature));
      }
      let returnTypes: qt.Type[] | undefined;
      let nextType: qt.Type | undefined;
      if (methodName !== 'throw') {
        const methodParameterType = methodParameterTypes ? this.unionType(methodParameterTypes) : unknownType;
        if (methodName === 'next') nextType = methodParameterType;
        else if (methodName === 'return') {
          const resolvedMethodParameterType = resolver.resolveIterationType(methodParameterType, errorNode) || anyType;
          returnTypes = append(returnTypes, resolvedMethodParameterType);
        }
      }
      let yieldType: Type;
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
      return createIterationTypes(yieldType, this.unionType(returnTypes), nextType);
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
    nonInterhitedProperties(t: InterfaceType, baseTypes: BaseType[], properties: Symbol[]) {
      if (!qu.length(baseTypes)) return properties;
      const seen = qu.createEscapedMap<Symbol>();
      forEach(properties, (p) => {
        seen.set(p.escName, p);
      });
      for (const base of baseTypes) {
        const properties = this.propertiesOfType(this.typeWithThisArgument(base, t.thisType));
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
    typeFromDocVariadicTyping(n: DocVariadicTyping): qt.Type {
      const type = this.typeFromTypeNode(n.type);
      const { parent } = n;
      const paramTag = n.parent?.parent;
      if (n.parent?.kind === Syntax.DocTypingExpression && paramTag.kind === Syntax.DocParameterTag) {
        const host = this.hostSignatureFromDoc(paramTag);
        if (host) {
          const lastParamDeclaration = lastOrUndefined(host.parameters);
          const symbol = this.parameterSymbolFromDoc(paramTag);
          if (!lastParamDeclaration || (symbol && lastParamDeclaration.symbol === symbol && qf.is.restParameter(lastParamDeclaration))) return createArrayType(t);
        }
      }
      if (parent?.kind === Syntax.ParameterDeclaration && parent?.parent?.kind === Syntax.DocFunctionTyping) return createArrayType(t);
      return addOptionality(t);
    }
    potentiallyUnusedIdentifiers(sourceFile: SourceFile): readonly PotentiallyUnusedIdentifier[] {
      return allPotentiallyUnusedIdentifiers.get(sourceFile.path) || empty;
    }
    diagnostics(sourceFile: SourceFile, ct: CancellationToken): qd.Diagnostic[] {
      try {
        cancellationToken = ct;
        return this.diagnosticsWorker(sourceFile);
      } finally {
        cancellationToken = undefined;
      }
    }
    diagnosticsWorker(sourceFile: SourceFile): qd.Diagnostic[] {
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
    symbolsInScope(location: Node, meaning: SymbolFlags): Symbol[] {
      if (location.flags & NodeFlags.InWithStatement) return [];
      const symbols = new SymbolTable();
      let isStatic = false;
      populateSymbols();
      symbols.delete(InternalSymbol.This);
      return symbolsToArray(symbols);
      const populateSymbols = () => {
        while (location) {
          if (location.locals && !qf.is.globalSourceFile(location)) location.locals.copy(symbols, meaning);
          switch (location.kind) {
            case Syntax.SourceFile:
              if (!qf.is.externalOrCommonJsModule(<SourceFile>location)) break;
            case Syntax.ModuleDeclaration:
              this.symbolOfNode(location as ModuleDeclaration | SourceFile).exports!.copy(symbols, meaning & SymbolFlags.ModuleMember);
              break;
            case Syntax.EnumDeclaration:
              this.symbolOfNode(location as EnumDeclaration).exports!.copy(symbols, meaning & SymbolFlags.EnumMember);
              break;
            case Syntax.ClassExpression:
              const className = (location as ClassExpression).name;
              if (className) copySymbol(location.symbol, symbols, meaning);
            case Syntax.ClassDeclaration:
            case Syntax.InterfaceDeclaration:
              if (!isStatic) this.membersOfSymbol(this.symbolOfNode(location as ClassDeclaration | InterfaceDeclaration)).copy(symbols, meaning & SymbolFlags.Type);
              break;
            case Syntax.FunctionExpression:
              const funcName = (location as qt.FunctionExpression).name;
              if (funcName) copySymbol(location.symbol, symbols, meaning);
              break;
          }
          if (introducesArgumentsExoticObject(location)) copySymbol(argumentsSymbol, symbols, meaning);
          isStatic = qf.has.syntacticModifier(location, ModifierFlags.Static);
          location = location.parent;
        }
        globals.copy(symbols, meaning);
      };
      const copySymbol = (symbol: Symbol, to: SymbolTable, meaning: SymbolFlags) => {
        if (this.combinedLocalAndExportSymbolFlags(symbol) & meaning) {
          const id = symbol.escName;
          if (!to.has(id)) to.set(id, symbol);
        }
      };
    }
    leftSideOfImportEqualsOrExportAssignment(nOnRightSide: qt.EntityName): qt.ImportEqualsDeclaration | ExportAssignment | undefined {
      while (nOnRightSide.parent?.kind === Syntax.QualifiedName) {
        nOnRightSide = <QualifiedName>nOnRightSide.parent;
      }
      if (nOnRightSide.parent?.kind === Syntax.ImportEqualsDeclaration) return nOnRightSide.parent?.moduleReference === nOnRightSide ? nOnRightSide.parent : undefined;
      if (nOnRightSide.parent?.kind === Syntax.ExportAssignment) return (<ExportAssignment>nOnRightSide.parent).expression === <Node>nOnRightSide ? <ExportAssignment>nOnRightSide.parent : undefined;
      return;
    }
    specialPropertyAssignmentSymbolFromEntityName(entityName: qt.EntityName | PropertyAccessExpression) {
      const specialPropertyAssignmentKind = this.assignmentDeclarationKind(entityName.parent?.parent as BinaryExpression);
      switch (specialPropertyAssignmentKind) {
        case qt.AssignmentDeclarationKind.ExportsProperty:
        case qt.AssignmentDeclarationKind.PrototypeProperty:
          return this.symbolOfNode(entityName.parent);
        case qt.AssignmentDeclarationKind.ThisProperty:
        case qt.AssignmentDeclarationKind.ModuleExports:
        case qt.AssignmentDeclarationKind.Property:
          return this.symbolOfNode(entityName.parent?.parent);
      }
    }
    symbolOfNameOrPropertyAccessExpression(name: qt.EntityName | qc.PrivateIdentifier | PropertyAccessExpression): Symbol | undefined {
      if (qf.is.declarationName(name)) return this.symbolOfNode(name.parent);
      if (qf.is.inJSFile(name) && name.parent?.kind === Syntax.PropertyAccessExpression && name.parent === (name.parent?.parent as BinaryExpression).left) {
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
        name = <QualifiedName | PropertyAccessEntityNameExpression>name.parent;
      }
      if (qf.is.heritageClauseElemIdentifier(name)) {
        let meaning = SymbolFlags.None;
        if (name.parent?.kind === Syntax.ExpressionWithTypings) {
          meaning = SymbolFlags.Type;
          if (qf.is.expressionWithTypeArgumentsInClassExtendsClause(name.parent)) meaning |= SymbolFlags.Value;
        } else {
          meaning = SymbolFlags.Namespace;
        }
        meaning |= SymbolFlags.Alias;
        const entityNameSymbol = qf.is.entityNameExpression(name) ? resolveEntityName(name, meaning) : undefined;
        if (entityNameSymbol) return entityNameSymbol;
      }
      if (name.parent?.kind === Syntax.DocParameterTag) return this.parameterSymbolFromDoc(name.parent as DocParameterTag);
      if (name.parent?.kind === Syntax.TypeParameter && name.parent?.parent?.kind === Syntax.DocTemplateTag) {
        qu.assert(!qf.is.inJSFile(name));
        const typeParameter = this.typeParameterFromDoc(name.parent as TypeParameterDeclaration & { parent: DocTemplateTag });
        return typeParameter && typeParameter.symbol;
      }
      if (qf.is.expressionNode(name)) {
        if (qf.is.missing(name)) return;
        if (name.kind === Syntax.Identifier) {
          if (qc.isJsx.tagName(name) && qf.is.jsxIntrinsicIdentifier(name)) {
            const symbol = this.intrinsicTagSymbol(<JsxOpeningLikeElem>name.parent);
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
      } else if (qf.is.typeReferenceIdentifier(<EntityName>name)) {
        const meaning = name.parent?.kind === Syntax.TypingReference ? SymbolFlags.Type : SymbolFlags.Namespace;
        return resolveEntityName(<EntityName>name, meaning, false, true);
      }
      if (name.parent?.kind === Syntax.TypingPredicate) return resolveEntityName(<Identifier>name, SymbolFlags.FunctionScopedVariable);
      return;
    }
    symbolAtLocation(n: Node, ignoreErrors?: boolean): Symbol | undefined {
      if (n.kind === Syntax.SourceFile) return qf.is.externalModule(<SourceFile>n) ? this.mergedSymbol(n.symbol) : undefined;
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
        if (qf.is.inRightSideOfImportOrExportAssignment(<Identifier>n)) return this.symbolOfNameOrPropertyAccessExpression(<Identifier>n);
        else if (parent?.kind === Syntax.BindingElem && grandParent.kind === Syntax.ObjectBindingPattern && n === (<BindingElem>parent).propertyName) {
          const typeOfPattern = this.typeOfNode(grandParent);
          const propertyDeclaration = this.propertyOfType(typeOfPattern, (<Identifier>n).escapedText);
          if (propertyDeclaration) return propertyDeclaration;
        }
      }
      switch (n.kind) {
        case Syntax.Identifier:
        case Syntax.PrivateIdentifier:
        case Syntax.PropertyAccessExpression:
        case Syntax.QualifiedName:
          return this.symbolOfNameOrPropertyAccessExpression(<EntityName | qc.PrivateIdentifier | PropertyAccessExpression>n);
        case Syntax.ThisKeyword:
          const container = this.thisContainer(n, false);
          if (qf.is.functionLike(container)) {
            const sig = this.signatureFromDeclaration(container);
            if (sig.thisParameter) return sig.thisParameter;
          }
          if (qf.is.inExpressionContext(n)) return qf.check.expression(n as qt.Expression).symbol;
        case Syntax.ThisTyping:
          return this.typeFromThisNodeTypeNode(n as ThisExpression | ThisTyping).symbol;
        case Syntax.SuperKeyword:
          return qf.check.expression(n as qt.Expression).symbol;
        case Syntax.ConstructorKeyword:
          const constructorDeclaration = n.parent;
          if (constructorDeclaration && constructorDeclaration.kind === Syntax.Constructor) return (<ClassDeclaration>constructorDeclaration.parent).symbol;
          return;
        case Syntax.StringLiteral:
        case Syntax.NoSubstitutionLiteral:
          if (
            (qf.is.externalModuleImportEqualsDeclaration(n.parent?.parent) && this.externalModuleImportEqualsDeclarationExpression(n.parent?.parent) === n) ||
            ((n.parent?.kind === Syntax.ImportDeclaration || n.parent?.kind === Syntax.ExportDeclaration) && (<ImportDeclaration>n.parent).moduleSpecifier === n) ||
            (qf.is.inJSFile(n) && qf.is.requireCall(n.parent, false)) ||
            qf.is.importCall(n.parent) ||
            (n.parent?.kind === Syntax.LiteralTyping && qf.is.literalImportTyping(n.parent?.parent) && n.parent?.parent?.argument === n.parent)
          ) {
            return resolveExternalModuleName(n, <LiteralExpression>n, ignoreErrors);
          }
          if (parent?.kind === Syntax.CallExpression && qf.is.bindableObjectDefinePropertyCall(parent) && parent?.arguments[1] === n) return this.symbolOfNode(parent);
        case Syntax.NumericLiteral:
          const objectType =
            parent?.kind === Syntax.ElemAccessExpression
              ? parent?.argumentExpression === n
                ? this.typeOfExpression(parent?.expression)
                : undefined
              : parent?.kind === Syntax.LiteralTyping && grandParent.kind === Syntax.IndexedAccessTyping
              ? this.typeFromTypeNode(grandParent.objectType)
              : undefined;
          return objectType && this.propertyOfType(objectType, qy.get.escUnderscores((n as StringLiteral | NumericLiteral).text));
        case Syntax.DefaultKeyword:
        case Syntax.FunctionKeyword:
        case Syntax.EqualsGreaterThanToken:
        case Syntax.ClassKeyword:
          return this.symbolOfNode(n.parent);
        case Syntax.ImportTyping:
          return qf.is.literalImportTyping(n) ? this.symbolAtLocation(n.argument.literal, ignoreErrors) : undefined;
        case Syntax.ExportKeyword:
          return n.parent?.kind === Syntax.ExportAssignment ? Debug.qf.check.defined(n.parent?.symbol) : undefined;
        default:
          return;
      }
    }
    shorthandAssignmentValueSymbol(location: Node): Symbol | undefined {
      if (location && location.kind === Syntax.ShorthandPropertyAssignment) return resolveEntityName((<ShorthandPropertyAssignment>location).name, SymbolFlags.Value | SymbolFlags.Alias);
      return;
    }
    exportSpecifierLocalTargetSymbol(n: ExportSpecifier): Symbol | undefined {
      return n.parent?.parent?.moduleSpecifier
        ? this.externalModuleMember(n.parent?.parent, n)
        : resolveEntityName(n.propertyName || n.name, SymbolFlags.Value | SymbolFlags.Type | SymbolFlags.Namespace | SymbolFlags.Alias);
    }
    typeOfNode(n: Node): qt.Type {
      if (n.flags & NodeFlags.InWithStatement) return errorType;
      const classDecl = tryGetClassImplementingOrExtendingExpressionWithTypings(n);
      const classType = classDecl && this.declaredTypeOfClassOrInterface(this.symbolOfNode(classDecl.class));
      if (qf.is.partOfTypeNode(n)) {
        const typeFromTypeNode = this.typeFromTypeNode(<Typing>n);
        return classType ? this.typeWithThisArgument(typeFromTypeNode, classType.thisType) : typeFromTypeNode;
      }
      if (qf.is.expressionNode(n)) return this.regularTypeOfExpression(n);
      if (classType && !classDecl!.isImplements) {
        const baseType = firstOrUndefined(this.baseTypes(classType));
        return baseType ? this.typeWithThisArgument(baseType, classType.thisType) : errorType;
      }
      if (qf.is.typeDeclaration(n)) {
        const symbol = this.symbolOfNode(n);
        return this.declaredTypeOfSymbol(symbol);
      }
      if (qf.is.typeDeclarationName(n)) {
        const symbol = this.symbolAtLocation(n);
        return symbol ? this.declaredTypeOfSymbol(symbol) : errorType;
      }
      if (qf.is.declaration(n)) {
        const symbol = this.symbolOfNode(n);
        return this.this.typeOfSymbol();
      }
      if (qf.is.declarationNameOrImportPropertyName(n)) {
        const symbol = this.symbolAtLocation(n);
        if (symbol) return this.this.typeOfSymbol();
        return errorType;
      }
      if (n.kind === Syntax.BindingPattern) return this.typeForVariableLikeDeclaration(n.parent, true) || errorType;
      if (qf.is.inRightSideOfImportOrExportAssignment(<Identifier>n)) {
        const symbol = this.symbolAtLocation(n);
        if (symbol) {
          const declaredType = this.declaredTypeOfSymbol(symbol);
          return declaredType !== errorType ? declaredType : this.this.typeOfSymbol();
        }
      }
      return errorType;
    }
    typeOfAssignmentPattern(expr: AssignmentPattern): qt.Type | undefined {
      qu.assert(expr.kind === Syntax.ObjectLiteralExpression || expr.kind === Syntax.ArrayLiteralExpression);
      if (expr.parent?.kind === Syntax.ForOfStatement) {
        const iteratedType = qf.check.rightHandSideOfForOf(<ForOfStatement>expr.parent);
        return qf.check.destructuringAssignment(expr, iteratedType || errorType);
      }
      if (expr.parent?.kind === Syntax.BinaryExpression) {
        const iteratedType = this.typeOfExpression(expr.parent?.right);
        return qf.check.destructuringAssignment(expr, iteratedType || errorType);
      }
      if (expr.parent?.kind === Syntax.PropertyAssignment) {
        const n = cast(expr.parent?.parent, isObjectLiteralExpression);
        const typeOfParentObjectLiteral = this.typeOfAssignmentPattern(n) || errorType;
        const propertyIndex = indexOfNode(n.properties, expr.parent);
        return qf.check.objectLiteralDestructuringPropertyAssignment(n, typeOfParentObjectLiteral, propertyIndex);
      }
      const n = cast(expr.parent, isArrayLiteralExpression);
      const typeOfArrayLiteral = this.typeOfAssignmentPattern(n) || errorType;
      const elemType = qf.check.iteratedTypeOrElemType(IterationUse.Destructuring, typeOfArrayLiteral, undefinedType, expr.parent) || errorType;
      return qf.check.arrayLiteralDestructuringElemAssignment(n, typeOfArrayLiteral, n.elems.indexOf(expr), elemType);
    }
    propertySymbolOfDestructuringAssignment(location: Identifier) {
      const typeOfObjectLiteral = this.typeOfAssignmentPattern(cast(location.parent?.parent, isAssignmentPattern));
      return typeOfObjectLiteral && this.propertyOfType(typeOfObjectLiteral, location.escapedText);
    }
    regularTypeOfExpression(expr: qt.Expression): qt.Type {
      if (qf.is.rightSideOfQualifiedNameOrPropertyAccess(expr)) expr = expr.parent;
      return this.regularTypeOfLiteralType(this.typeOfExpression(expr));
    }
    parentTypeOfClassElem(n: ClassElem) {
      const classSymbol = this.symbolOfNode(n.parent)!;
      return qf.has.syntacticModifier(n, ModifierFlags.Static) ? this.typeOfSymbol(classSymbol) : this.declaredTypeOfSymbol(classSymbol);
    }
    classElemPropertyKeyType(elem: ClassElem) {
      const name = elem.name!;
      switch (name.kind) {
        case Syntax.Identifier:
          return this.literalType(idText(name));
        case Syntax.NumericLiteral:
        case Syntax.StringLiteral:
          return this.literalType(name.text);
        case Syntax.ComputedPropertyName:
          const nameType = qf.check.computedPropertyName(name);
          return qf.is.typeAssignableToKind(nameType, qt.TypeFlags.ESSymbolLike) ? nameType : stringType;
        default:
          return qu.fail('Unsupported property name.');
      }
    }
    augmentedPropertiesOfType(t: qt.Type): Symbol[] {
      type = this.apparentType(t);
      const propsByName = new SymbolTable(this.propertiesOfType(t));
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
    referencedExportContainer(nIn: Identifier, prefixLocals?: boolean): SourceFile | ModuleDeclaration | EnumDeclaration | undefined {
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
              const symbolFile = <SourceFile>parentSymbol.valueDeclaration;
              const referenceFile = n.sourceFile;
              const symbolIsUmdExport = symbolFile !== referenceFile;
              return symbolIsUmdExport ? undefined : symbolFile;
            }
            return qc.findAncestor(n.parent, (n): n is ModuleDeclaration | EnumDeclaration => qf.is.moduleOrEnumDeclaration(n) && this.symbolOfNode(n) === parentSymbol);
          }
        }
      }
    }
    referencedImportDeclaration(nIn: Identifier): Declaration | undefined {
      const n = this.parseTreeOf(nIn, isIdentifier);
      if (n) {
        const symbol = this.referencedValueSymbol(n);
        if (symbol.qf.is.nonLocalAlias(SymbolFlags.Value) && !this.this.typeOnlyAliasDeclaration()) return symbol.this.declarationOfAliasSymbol();
      }
      return;
    }
    referencedDeclarationWithCollidingName(nIn: Identifier): Declaration | undefined {
      if (!qf.is.generatedIdentifier(nIn)) {
        const n = this.parseTreeOf(nIn, isIdentifier);
        if (n) {
          const symbol = this.referencedValueSymbol(n);
          if (symbol && qf.is.symbolOfDeclarationWithCollidingName(symbol)) return symbol.valueDeclaration;
        }
      }
      return;
    }
    propertiesOfContainerFunction(n: qt.Declaration): Symbol[] {
      const declaration = this.parseTreeOf(n, isFunctionDeclaration);
      if (!declaration) return empty;
      const symbol = this.symbolOfNode(declaration);
      return (symbol && this.propertiesOfType(this.this.typeOfSymbol())) || empty;
    }
    nCheckFlags(n: Node): NodeCheckFlags {
      return this.nodeLinks(n).flags || 0;
    }
    enumMemberValue(n: EnumMember): string | number | undefined {
      computeEnumMemberValues(n.parent);
      return this.nodeLinks(n).enumMemberValue;
    }
    constantValue(n: EnumMember | AccessExpression): string | number | undefined {
      if (n.kind === Syntax.EnumMember) return this.enumMemberValue(n);
      const symbol = this.nodeLinks(n).resolvedSymbol;
      if (symbol && symbol.flags & SymbolFlags.EnumMember) {
        const member = symbol.valueDeclaration as EnumMember;
        if (qf.is.enumConst(member.parent)) return this.enumMemberValue(member);
      }
      return;
    }
    typeReferenceSerializationKind(typeNameIn: qt.EntityName, location?: Node): TypeReferenceSerializationKind {
      const typeName = this.parseTreeOf(typeNameIn, isEntityName);
      if (!typeName) return TypeReferenceSerializationKind.Unknown;
      if (location) {
        location = this.parseTreeOf(location);
        if (!location) return TypeReferenceSerializationKind.Unknown;
      }
      const valueSymbol = resolveEntityName(typeName, SymbolFlags.Value, true, false, location);
      const typeSymbol = resolveEntityName(typeName, SymbolFlags.Type, true, false, location);
      if (valueSymbol && valueSymbol === typeSymbol) {
        const globalPromiseSymbol = this.globalPromiseConstructorSymbol(false);
        if (globalPromiseSymbol && valueSymbol === globalPromiseSymbol) return TypeReferenceSerializationKind.Promise;
        const constructorType = this.typeOfSymbol(valueSymbol);
        if (constructorType && qf.is.constructorType(constructorType)) return TypeReferenceSerializationKind.TypeWithConstructSignatureAndValue;
      }
      if (!typeSymbol) return TypeReferenceSerializationKind.Unknown;
      const type = this.declaredTypeOfSymbol(typeSymbol);
      if (type === errorType) return TypeReferenceSerializationKind.Unknown;
      if (t.flags & qt.TypeFlags.AnyOrUnknown) return TypeReferenceSerializationKind.ObjectType;
      if (qf.is.typeAssignableToKind(t, qt.TypeFlags.Void | qt.TypeFlags.Nullable | qt.TypeFlags.Never)) return TypeReferenceSerializationKind.VoidNullableOrNeverType;
      if (qf.is.typeAssignableToKind(t, qt.TypeFlags.BooleanLike)) return TypeReferenceSerializationKind.BooleanType;
      if (qf.is.typeAssignableToKind(t, qt.TypeFlags.NumberLike)) return TypeReferenceSerializationKind.NumberLikeType;
      if (qf.is.typeAssignableToKind(t, qt.TypeFlags.BigIntLike)) return TypeReferenceSerializationKind.BigIntLikeType;
      if (qf.is.typeAssignableToKind(t, qt.TypeFlags.StringLike)) return TypeReferenceSerializationKind.StringLikeType;
      if (qf.is.tupleType(t)) return TypeReferenceSerializationKind.ArrayLikeType;
      if (qf.is.typeAssignableToKind(t, qt.TypeFlags.ESSymbolLike)) return TypeReferenceSerializationKind.ESSymbolType;
      if (qf.is.functionType(t)) return TypeReferenceSerializationKind.TypeWithCallSignature;
      if (qf.is.arrayType(t)) return TypeReferenceSerializationKind.ArrayLikeType;
      return TypeReferenceSerializationKind.ObjectType;
    }
    referencedValueSymbol(reference: Identifier, startInDeclarationContainer?: boolean): Symbol | undefined {
      const resolvedSymbol = this.nodeLinks(reference).resolvedSymbol;
      if (resolvedSymbol) return resolvedSymbol;
      let location: Node = reference;
      if (startInDeclarationContainer) {
        const parent = reference.parent;
        if (qf.is.declaration(parent) && reference === parent?.name) location = this.declarationContainer(parent);
      }
      return resolveName(location, reference.escapedText, SymbolFlags.Value | SymbolFlags.ExportValue | SymbolFlags.Alias, undefined, undefined, true);
    }
    referencedValueDeclaration(referenceIn: Identifier): Declaration | undefined {
      if (!qf.is.generatedIdentifier(referenceIn)) {
        const reference = this.parseTreeOf(referenceIn, isIdentifier);
        if (reference) {
          const symbol = this.referencedValueSymbol(reference);
          if (symbol) return this.exportSymbolOfValueSymbolIfExported(symbol).valueDeclaration;
        }
      }
      return;
    }
    jsxFactoryEntity(location: Node) {
      return location ? (this.jsxNamespace(location), location.sourceFile.localJsxFactory || _jsxFactoryEntity) : _jsxFactoryEntity;
    }
    externalModuleFileFromDeclaration(declaration: AnyImportOrReExport | ModuleDeclaration | ImportTyping): SourceFile | undefined {
      const specifier = declaration.kind === Syntax.ModuleDeclaration ? qu.tryCast(declaration.name, isStringLiteral) : this.externalModuleName(declaration);
      const moduleSymbol = resolveExternalModuleNameWorker(specifier!, specifier!, undefined);
      if (!moduleSymbol) return;
      return this.declarationOfKind(moduleSymbol, Syntax.SourceFile);
    }
    helperName(helper: ExternalEmitHelpers) {
      switch (helper) {
        case ExternalEmitHelpers.Extends:
          return '__extends';
        case ExternalEmitHelpers.Assign:
          return '__assign';
        case ExternalEmitHelpers.Rest:
          return '__rest';
        case ExternalEmitHelpers.Decorate:
          return '__decorate';
        case ExternalEmitHelpers.Metadata:
          return '__metadata';
        case ExternalEmitHelpers.Param:
          return '__param';
        case ExternalEmitHelpers.Awaiter:
          return '__awaiter';
        case ExternalEmitHelpers.Generator:
          return '__generator';
        case ExternalEmitHelpers.Values:
          return '__values';
        case ExternalEmitHelpers.Read:
          return '__read';
        case ExternalEmitHelpers.Spread:
          return '__spread';
        case ExternalEmitHelpers.SpreadArrays:
          return '__spreadArrays';
        case ExternalEmitHelpers.Await:
          return '__await';
        case ExternalEmitHelpers.AsyncGenerator:
          return '__asyncGenerator';
        case ExternalEmitHelpers.AsyncDelegator:
          return '__asyncDelegator';
        case ExternalEmitHelpers.AsyncValues:
          return '__asyncValues';
        case ExternalEmitHelpers.ExportStar:
          return '__exportStar';
        case ExternalEmitHelpers.MakeTemplateObject:
          return '__makeTemplateObject';
        case ExternalEmitHelpers.ClassPrivateFieldGet:
          return '__classPrivateFieldGet';
        case ExternalEmitHelpers.ClassPrivateFieldSet:
          return '__classPrivateFieldSet';
        case ExternalEmitHelpers.CreateBinding:
          return '__createBinding';
        default:
          return qu.fail('Unrecognized helper');
      }
    }
    nonSimpleParameters(parameters: readonly ParameterDeclaration[]): readonly ParameterDeclaration[] {
      return filter(parameters, (parameter) => !!parameter.initer || parameter.name.kind === Syntax.BindingPattern || qf.is.restParameter(parameter));
    }
    accessorThisNodeKind(ParameterDeclaration, accessor: AccessorDeclaration): ParameterDeclaration | undefined {
      if (accessor.parameters.length === (accessor.kind === Syntax.GetAccessor ? 1 : 2)) return this.thisNodeKind(ParameterDeclaration, accessor);
    }
    ambientModules(): Symbol[] {
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
