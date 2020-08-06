import * as qc from '../core';
import * as qd from '../diagnostic';
import * as qg from '../debug';
import { ExpandingFlags, ModifierFlags, Node, ObjectFlags, SymbolFlags, TypeFlags, VarianceFlags } from './type';
import * as qt from './type';
import * as qu from '../util';
import { Syntax } from '../syntax';
import * as qy from '../syntax';
import { Symbol } from './symbol';
import { Fhas, Fis } from './predicate';
export function newGet(f: qt.Frame) {
  interface Frame extends qt.Frame {
    has: Fhas;
    is: Fis;
  }
  const qf = f as Frame;
  interface Fget extends qc.Fget {}
  return (qf.get = new (class Fget {
    resolvedSignatureWorker(nIn: qt.CallLikeExpression, candidatesOutArray: qt.Signature[] | undefined, argumentCount: number | undefined, checkMode: CheckMode): Signature | undefined {
      const n = this.parseTreeOf(nIn, isCallLikeExpression);
      apparentArgumentCount = argumentCount;
      const res = n ? this.resolvedSignature(n, candidatesOutArray, checkMode) : undefined;
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
            const chosenpragma = isArray(jsxPragma) ? jsxPragma[0] : jsxPragma;
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
      function markAsSynthetic(n: Node): VisitResult<Node> {
        n.pos = -1;
        n.end = -1;
        return visitEachChild(n, markAsSynthetic, nullTrafoContext);
      }
    }
    emitResolver(s: qt.SourceFile, t: qt.CancellationToken) {
      this.diagnostics(s, t);
      return emitResolver;
    }
    symbolsOfParameterPropertyDeclaration(parameter: qt.ParameterDeclaration, parameterName: qu.__String): [Symbol, Symbol] {
      const constructorDeclaration = parameter.parent;
      const classDeclaration = parameter.parent.parent;
      const parameterSymbol = getSymbol(constructorDeclaration.locals!, parameterName, qt.SymbolFlags.Value);
      const propertySymbol = getSymbol(getMembersOfSymbol(classDeclaration.symbol), parameterName, qt.SymbolFlags.Value);
      if (parameterSymbol && propertySymbol) return [parameterSymbol, propertySymbol];
      return qu.fail('There should exist two symbols, one as property declaration and one as parameter declaration');
    }
    isDeferredContext(n: Node, last?: Node): boolean {
      if (n.kind !== Syntax.ArrowFunction && n.kind !== Syntax.FunctionExpression) {
        return (
          n.kind === Syntax.TypingQuery ||
          ((qf.is.functionLikeDeclaration(n) || (n.kind === Syntax.PropertyDeclaration && !qf.has.syntacticModifier(n, ModifierFlags.Static))) &&
            (!last || last !== (n as qt.FunctionLike | qt.PropertyDeclaration).name))
        );
      }
      if (last && last === (n as qt.FunctionExpression | qt.ArrowFunction).name) return false;
      if ((n as qt.FunctionExpression | qt.ArrowFunction).asteriskToken || qf.has.syntacticModifier(n, ModifierFlags.Async)) return true;
      return !this.immediatelyInvokedFunctionExpression(n);
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
    targetOfImportEqualsDeclaration(n: ImportEqualsDeclaration, dontResolveAlias: boolean): Symbol | undefined {
      if (n.moduleReference.kind === Syntax.ExternalModuleReference) {
        const immediate = resolveExternalModuleName(n, this.externalModuleImportEqualsDeclarationExpression(n));
        const resolved = resolveExternalModuleSymbol(immediate);
        markSymbolOfAliasDeclarationIfTypeOnly(n, immediate, resolved, false);
        return resolved;
      }
      const resolved = getSymbolOfPartOfRightHandSideOfImportEquals(n.moduleReference, dontResolveAlias);
      check.andReportErrorForResolvingImportAliasToTypeOnlySymbol(n, resolved);
      return resolved;
    }
    targetOfImportClause(n: ImportClause, dontResolveAlias: boolean): Symbol | undefined {
      const moduleSymbol = resolveExternalModuleName(n, n.parent.moduleSpecifier);
      if (moduleSymbol) {
        let exportDefaultSymbol: Symbol | undefined;
        if (isShorthandAmbientModuleSymbol(moduleSymbol)) exportDefaultSymbol = moduleSymbol;
        else {
          exportDefaultSymbol = resolveExportByName(moduleSymbol, InternalSymbol.Default, n, dontResolveAlias);
        }
        const file = qu.find(moduleSymbol.declarations, isSourceFile);
        const hasSyntheticDefault = canHaveSyntheticDefault(file, moduleSymbol, dontResolveAlias);
        if (!exportDefaultSymbol && !hasSyntheticDefault) {
          if (hasExportAssignmentSymbol(moduleSymbol)) {
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
      const moduleSpecifier = n.parent.parent.moduleSpecifier;
      const immediate = resolveExternalModuleName(n, moduleSpecifier);
      const resolved = resolveESModuleSymbol(immediate, moduleSpecifier, dontResolveAlias, false);
      markSymbolOfAliasDeclarationIfTypeOnly(n, immediate, resolved, false);
      return resolved;
    }
    targetOfNamespaceExport(n: qt.NamespaceExport, dontResolveAlias: boolean): Symbol | undefined {
      const moduleSpecifier = n.parent.moduleSpecifier;
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
          if (isShorthandAmbientModuleSymbol(moduleSymbol)) return moduleSymbol;
          let symbolFromVariable: Symbol | undefined;
          if (moduleSymbol && moduleSymbol.exports && moduleSymbol.exports.get(InternalSymbol.ExportEquals))
            symbolFromVariable = this.propertyOfType(this.typeOfSymbol(targetSymbol), name.escapedText);
          else {
            symbolFromVariable = getPropertyOfVariable(targetSymbol, name.escapedText);
          }
          symbolFromVariable = symbolFromVariable.resolveSymbol(dontResolveAlias);
          let symbolFromModule = getExportOfModule(targetSymbol, specifier, dontResolveAlias);
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
            const moduleName = getFullyQualifiedName(moduleSymbol, n);
            const declarationName = declarationNameToString(name);
            const suggestion = getSuggestedSymbolForNonexistentModule(name, targetSymbol);
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
      const resolved = getExternalModuleMember(n.parent.parent.parent, n, dontResolveAlias);
      markSymbolOfAliasDeclarationIfTypeOnly(n, undefined, resolved, false);
      return resolved;
    }
    targetOfNamespaceExportDeclaration(n: NamespaceExportDeclaration, dontResolveAlias: boolean): Symbol {
      const resolved = resolveExternalModuleSymbol(n.parent.symbol, dontResolveAlias);
      markSymbolOfAliasDeclarationIfTypeOnly(n, undefined, resolved, false);
      return resolved;
    }
    targetOfExportSpecifier(n: qt.ExportSpecifier, meaning: qt.SymbolFlags, dontResolveAlias?: boolean) {
      const resolved = n.parent.parent.moduleSpecifier ? getExternalModuleMember(n.parent.parent, n, dontResolveAlias) : resolveEntityName(n.propertyName || n.name, meaning, false, dontResolveAlias);
      markSymbolOfAliasDeclarationIfTypeOnly(n, undefined, resolved, false);
      return resolved;
    }
    targetOfExportAssignment(n: qt.ExportAssignment | qt.BinaryExpression, dontResolveAlias: boolean): Symbol | undefined {
      const expression = n.kind === Syntax.ExportAssignment ? n.expression : n.right;
      const resolved = getTargetOfAliasLikeExpression(expression, dontResolveAlias);
      markSymbolOfAliasDeclarationIfTypeOnly(n, undefined, resolved, false);
      return resolved;
    }
    targetOfAliasLikeExpression(expression: qt.Expression, dontResolveAlias: boolean) {
      if (expression.kind === Syntax.ClassExpression) return check.expressionCached(expression).symbol;
      if (!qf.is.entityName(expression) && !qf.is.entityNameExpression(expression)) return;
      const aliasLike = resolveEntityName(expression, qt.SymbolFlags.Value | qt.SymbolFlags.Type | qt.SymbolFlags.Namespace, true, dontResolveAlias);
      if (aliasLike) return aliasLike;
      check.expressionCached(expression);
      return getNodeLinks(expression).resolvedSymbol;
    }
    targetOfPropertyAssignment(n: qt.PropertyAssignment, dontRecursivelyResolve: boolean): Symbol | undefined {
      const expression = n.initer;
      return getTargetOfAliasLikeExpression(expression, dontRecursivelyResolve);
    }
    targetOfPropertyAccessExpression(n: qt.PropertyAccessExpression, dontRecursivelyResolve: boolean): Symbol | undefined {
      if (!(n.parent.kind === Syntax.BinaryExpression && n.parent.left === n && n.parent.operatorToken.kind === Syntax.EqualsToken)) return;
      return getTargetOfAliasLikeExpression(n.parent.right, dontRecursivelyResolve);
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
          return this.targetOfExportSpecifier(n, qt.SymbolFlags.Value | qt.SymbolFlags.Type | qt.SymbolFlags.Namespace, dontRecursivelyResolve);
        case Syntax.ExportAssignment:
        case Syntax.BinaryExpression:
          return this.targetOfExportAssignment(<ExportAssignment | BinaryExpression>n, dontRecursivelyResolve);
        case Syntax.NamespaceExportDeclaration:
          return this.targetOfNamespaceExportDeclaration(n, dontRecursivelyResolve);
        case Syntax.ShorthandPropertyAssignment:
          return resolveEntityName(n.name, qt.SymbolFlags.Value | qt.SymbolFlags.Type | qt.SymbolFlags.Namespace, true, dontRecursivelyResolve);
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
      if (entityName.kind === Syntax.Identifier || entityName.parent.kind === Syntax.QualifiedName) return resolveEntityName(entityName, qt.SymbolFlags.Namespace, false, dontResolveAlias);
      else {
        qu.assert(entityName.parent.kind === Syntax.ImportEqualsDeclaration);
        return resolveEntityName(entityName, qt.SymbolFlags.Value | qt.SymbolFlags.Type | qt.SymbolFlags.Namespace, false, dontResolveAlias);
      }
    }
    assignmentDeclarationLocation(n: qt.TypingReference): Node | undefined {
      const typeAlias = qc.findAncestor(n, (n) => (!(qc.isDoc.node(n) || n.flags & NodeFlags.Doc) ? 'quit' : qc.isDoc.typeAlias(n)));
      if (typeAlias) return;
      const host = qc.getDoc.host(n);
      if (
        host.kind === Syntax.ExpressionStatement &&
        host.expression.kind === Syntax.BinaryExpression &&
        this.assignmentDeclarationKind(host.expression) === AssignmentDeclarationKind.PrototypeProperty
      ) {
        const s = this.symbolOfNode(host.expression.left);
        if (s) return s.getDeclarationOfJSPrototypeContainer();
      }
      if (
        (qf.is.objectLiteralMethod(host) || host.kind === Syntax.PropertyAssignment) &&
        host.parent.parent.kind === Syntax.BinaryExpression &&
        this.assignmentDeclarationKind(host.parent.parent) === AssignmentDeclarationKind.Prototype
      ) {
        const s = this.symbolOfNode(host.parent.parent.left);
        if (s) return s.getDeclarationOfJSPrototypeContainer();
      }
      const sig = this.effectiveDocHost(n);
      if (sig && qf.is.functionLike(sig)) {
        const s = this.symbolOfNode(sig);
        return s && s.valueDeclaration;
      }
    }
    commonJsExportEquals(exported: Symbol | undefined, moduleSymbol: Symbol): Symbol | undefined {
      if (!exported || exported === unknownSymbol || exported === moduleSymbol || moduleSymbol.exports!.size === 1 || exported.flags & qt.SymbolFlags.Alias) return exported;
      const ls = exported.getLinks();
      if (ls.cjsExportMerged) return ls.cjsExportMerged;
      const merged = exported.flags & qt.SymbolFlags.Transient ? exported : exported.clone();
      merged.flags = merged.flags | qt.SymbolFlags.ValueModule;
      if (merged.exports === undefined) merged.exports = new SymbolTable();
      moduleSymbol.exports!.forEach((s, name) => {
        if (name === InternalSymbol.ExportEquals) return;
        merged.exports!.set(name, merged.exports!.has(name) ? s.merge(merged.exports!.get(name)!) : s);
      });
      merged.getLinks().cjsExportMerged = merged;
      return (ls.cjsExportMerged = merged);
    }
    exportsOfModuleAsArray(moduleSymbol: Symbol): Symbol[] {
      return symbolsToArray(getExportsOfModule(moduleSymbol));
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
      return exported && getSymbolIfSameReference(exported, container) ? fileSymbol : undefined;
    }
    symbolIfSameReference(s1: Symbol, s2: Symbol) {
      if (this.mergedSymbol(this.mergedSymbol(s1).resolveSymbol()) === this.mergedSymbol(this.mergedSymbol(s2).resolveSymbol())) return s1;
    }
    namedMembers(ms: SymbolTable): Symbol[] {
      let r: Symbol[] | undefined;
      ms.forEach((symbol, id) => {
        if (!qy.is.reservedName(id) && symbolIsValue(symbol)) (r || (r = [])).push(symbol);
      });
      return r || empty;
    }
    qualifiedLeftMeaning(rightMeaning: qt.SymbolFlags) {
      return rightMeaning === qt.SymbolFlags.Value ? qt.SymbolFlags.Value : qt.SymbolFlags.Namespace;
    }
    accessibleSymbolChain(
      symbol: Symbol | undefined,
      enclosingDeclaration: Node | undefined,
      meaning: qt.SymbolFlags,
      useOnlyExternalAliasing: boolean,
      visitedSymbolTablesMap: qu.QMap<SymbolTable[]> = new qu.QMap()
    ): Symbol[] | undefined {
      if (!(symbol && !isPropertyOrMethodDeclarationSymbol(symbol))) return;
      const id = '' + symbol.getId();
      let visitedSymbolTables = visitedSymbolTablesMap.get(id);
      if (!visitedSymbolTables) visitedSymbolTablesMap.set(id, (visitedSymbolTables = []));
      return forEachSymbolTableInScope(enclosingDeclaration, getAccessibleSymbolChainFromSymbolTable);
      function getAccessibleSymbolChainFromSymbolTable(symbols: SymbolTable, ignoreQualification?: boolean): Symbol[] | undefined {
        if (!pushIfUnique(visitedSymbolTables!, symbols)) return;
        const result = trySymbolTable(symbols, ignoreQualification);
        visitedSymbolTables!.pop();
        return result;
      }
      function canQualifySymbol(symbolFromSymbolTable: Symbol, meaning: qt.SymbolFlags) {
        return (
          !needsQualification(symbolFromSymbolTable, enclosingDeclaration, meaning) ||
          !!this.accessibleSymbolChain(symbolFromSymbolTable.parent, enclosingDeclaration, getQualifiedLeftMeaning(meaning), useOnlyExternalAliasing, visitedSymbolTablesMap)
        );
      }
      function isAccessible(symbolFromSymbolTable: Symbol, resolvedAliasSymbol?: Symbol, ignoreQualification?: boolean) {
        return (
          (symbol === (resolvedAliasSymbol || symbolFromSymbolTable) || this.mergedSymbol(symbol) === this.mergedSymbol(resolvedAliasSymbol || symbolFromSymbolTable)) &&
          !some(symbolFromSymbolTable.declarations, hasNonGlobalAugmentationExternalModuleSymbol) &&
          (ignoreQualification || canQualifySymbol(this.mergedSymbol(symbolFromSymbolTable), meaning))
        );
      }
      function trySymbolTable(symbols: SymbolTable, ignoreQualification: boolean | undefined): Symbol[] | undefined {
        if (isAccessible(symbols.get(symbol!.escName)!, undefined, ignoreQualification)) return [symbol!];
        const result = forEachEntry(symbols, (symbolFromSymbolTable) => {
          if (
            symbolFromSymbolTable.flags & qt.SymbolFlags.Alias &&
            symbolFromSymbolTable.escName !== InternalSymbol.ExportEquals &&
            symbolFromSymbolTable.escName !== InternalSymbol.Default &&
            !(isUMDExportSymbol(symbolFromSymbolTable) && enclosingDeclaration && qf.is.externalModule(enclosingDeclaration.sourceFile)) &&
            (!useOnlyExternalAliasing || qu.some(symbolFromSymbolTable.declarations, qf.is.externalModuleImportEqualsDeclaration)) &&
            (ignoreQualification || !getDeclarationOfKind(symbolFromSymbolTable, Syntax.ExportSpecifier))
          ) {
            const resolvedImportedSymbol = symbolFromSymbolTable.resolveAlias();
            const candidate = getCandidateListForSymbol(symbolFromSymbolTable, resolvedImportedSymbol, ignoreQualification);
            if (candidate) return candidate;
          }
          if (symbolFromSymbolTable.escName === symbol!.escName && symbolFromSymbolTable.exportSymbol) {
            if (isAccessible(this.mergedSymbol(symbolFromSymbolTable.exportSymbol), undefined, ignoreQualification)) return [symbol!];
          }
        });
        return result || (symbols === globals ? getCandidateListForSymbol(globalThisSymbol, globalThisSymbol, ignoreQualification) : undefined);
      }
      function getCandidateListForSymbol(symbolFromSymbolTable: Symbol, resolvedImportedSymbol: Symbol, ignoreQualification: boolean | undefined) {
        if (isAccessible(symbolFromSymbolTable, resolvedImportedSymbol, ignoreQualification)) return [symbolFromSymbolTable];
        const candidateTable = resolvedImportedSymbol.getExportsOfSymbol();
        const accessibleSymbolsFromExports = candidateTable && this.accessibleSymbolChainFromSymbolTable(candidateTable, true);
        if (accessibleSymbolsFromExports && canQualifySymbol(symbolFromSymbolTable, getQualifiedLeftMeaning(meaning))) return [symbolFromSymbolTable].concat(accessibleSymbolsFromExports);
      }
    }
    externalModuleContainer(declaration: Node) {
      const n = qc.findAncestor(declaration, hasExternalModuleSymbol);
      return n && this.symbolOfNode(n);
    }
    typeNamesForErrorDisplay(left: qt.Type, right: qt.Type): [string, string] {
      let leftStr = symbolValueDeclarationIsContextSensitive(left.symbol) ? typeToString(left, left.symbol.valueDeclaration) : typeToString(left);
      let rightStr = symbolValueDeclarationIsContextSensitive(right.symbol) ? typeToString(right, right.symbol.valueDeclaration) : typeToString(right);
      if (leftStr === rightStr) {
        leftStr = getTypeNameForErrorDisplay(left);
        rightStr = getTypeNameForErrorDisplay(right);
      }
      return [leftStr, rightStr];
    }
    typeNameForErrorDisplay(type: qt.Type) {
      return typeToString(type, undefined, TypeFormatFlags.UseFullyQualifiedType);
    }
    typeAliasForTypeLiteral(type: qt.Type): Symbol | undefined {
      if (type.symbol && type.symbol.flags & qt.SymbolFlags.TypeLiteral) {
        const n = walkUpParenthesizedTypes(type.symbol.declarations[0].parent);
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
      const classType = <InterfaceType>getDeclaredTypeOfSymbol(getParentOfSymbol(prototype)!);
      return classType.typeParameters
        ? createTypeReference(
            <GenericType>classType,
            map(classType.typeParameters, (_) => anyType)
          )
        : classType;
    }
    typeOfPropertyOfType(type: qt.Type, name: qu.__String): qt.Type | undefined {
      const prop = this.propertyOfType(type, name);
      return prop ? this.typeOfSymbol(prop) : undefined;
    }
    typeOfPropertyOrIndexSignature(type: qt.Type, name: qu.__String): qt.Type {
      return this.typeOfPropertyOfType(type, name) || (NumericLiteral.name(name) && this.indexTypeOfType(type, qt.IndexKind.Number)) || this.indexTypeOfType(type, qt.IndexKind.String) || unknownType;
    }
    typeForBindingElemParent(n: qt.BindingElemGrandparent) {
      const symbol = this.symbolOfNode(n);
      return (symbol && s.getLinks(symbol).type) || this.typeForVariableLikeDeclaration(n, false);
    }
    restType(source: qt.Type, properties: qt.PropertyName[], symbol: Symbol | undefined): qt.Type {
      source = filterType(source, (t) => !(t.flags & qt.TypeFlags.Nullable));
      if (source.flags & qt.TypeFlags.Never) return emptyObjectType;
      if (source.flags & qt.TypeFlags.Union) return mapType(source, (t) => getRestType(t, properties, symbol));
      const omitKeyType = this.unionType(map(properties, this.literalTypeFromPropertyName));
      if (qf.is.genericObjectType(source) || qf.is.genericIndexType(omitKeyType)) {
        if (omitKeyType.flags & qt.TypeFlags.Never) return source;
        const omitTypeAlias = getGlobalOmitSymbol();
        if (!omitTypeAlias) return errorType;
        return this.typeAliasInstantiation(omitTypeAlias, [source, omitKeyType]);
      }
      const members = new SymbolTable();
      for (const prop of this.propertiesOfType(source)) {
        if (
          !qf.is.typeAssignableTo(this.literalTypeFromProperty(prop, qt.TypeFlags.StringOrNumberLiteralOrUnique), omitKeyType) &&
          !(getDeclarationModifierFlagsFromSymbol(prop) & (ModifierFlags.Private | ModifierFlags.Protected)) &&
          isSpreadableProperty(prop)
        ) {
          members.set(prop.escName, getSpreadSymbol(prop, false));
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
      return reference ? this.flowTypeOfReference(reference, declaredType) : declaredType;
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
      if (n.kind === Syntax.BindingElem && parent.kind === Syntax.ObjectBindingPattern) return getLiteralPropertyNameText((<BindingElem>n).propertyName || <Identifier>(<BindingElem>n).name);
      if (n.kind === Syntax.PropertyAssignment || n.kind === Syntax.ShorthandPropertyAssignment) return getLiteralPropertyNameText((<PropertyAssignment | qt.ShorthandPropertyAssignment>n).name);
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
      if (strictNullChecks && declaration.flags & NodeFlags.Ambient && qf.is.parameterDeclaration(declaration)) parentType = getNonNullableType(parentType);
      else if (strictNullChecks && pattern.parent.initer && !(getTypeFacts(getTypeOfIniter(pattern.parent.initer)) & TypeFacts.EQUndefined)) {
        parentType = getTypeWithFacts(parentType, TypeFacts.NEUndefined);
      }
      let type: qt.Type | undefined;
      if (pattern.kind === Syntax.ObjectBindingPattern) {
        if (declaration.dot3Token) {
          parentType = getReducedType(parentType);
          if (parentType.flags & qt.TypeFlags.Unknown || !qf.is.validSpreadType(parentType)) {
            error(declaration, qd.msgs.Rest_types_may_only_be_created_from_object_types);
            return errorType;
          }
          const literalMembers: qt.PropertyName[] = [];
          for (const elem of pattern.elems) {
            if (!elem.dot3Token) literalMembers.push(elem.propertyName || (elem.name as Identifier));
          }
          type = getRestType(parentType, literalMembers, declaration.symbol);
        } else {
          const name = declaration.propertyName || <Identifier>declaration.name;
          const indexType = this.literalTypeFromPropertyName(name);
          const declaredType = this.constraintForLocation(this.indexedAccessType(parentType, indexType, name), declaration.name);
          type = this.flowTypeOfDestructuring(declaration, declaredType);
        }
      } else {
        const elemType = check.iteratedTypeOrElemType(IterationUse.Destructuring, parentType, undefinedType, pattern);
        const index = pattern.elems.indexOf(declaration);
        if (declaration.dot3Token) type = everyType(parentType, qf.is.tupleType) ? mapType(parentType, (t) => sliceTupleType(<TupleTypeReference>t, index)) : createArrayType(elemType);
        else if (qf.is.arrayLikeType(parentType)) {
          const indexType = this.literalType(index);
          const accessFlags = hasDefaultValue(declaration) ? AccessFlags.NoTupleBoundsCheck : 0;
          const declaredType = this.constraintForLocation(this.indexedAccessTypeOrUndefined(parentType, indexType, declaration.name, accessFlags) || errorType, declaration.name);
          type = this.flowTypeOfDestructuring(declaration, declaredType);
        } else {
          type = elemType;
        }
      }
      if (!declaration.initer) return type;
      if (this.effectiveTypeAnnotationNode(walkUpBindingElemsAndPatterns(declaration)))
        return strictNullChecks && !(getFalsyFlags(check.declarationIniter(declaration)) & qt.TypeFlags.Undefined) ? getTypeWithFacts(type, TypeFacts.NEUndefined) : type;
      return widenTypeInferredFromIniter(declaration, this.unionType([getTypeWithFacts(type, TypeFacts.NEUndefined), check.declarationIniter(declaration)], UnionReduction.Subtype));
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
      if (declaration.kind === Syntax.VariableDeclaration && declaration.parent.parent.kind === Syntax.ForInStatement) {
        const indexType = this.indexType(this.nonNullableTypeIfNeeded(check.expression(declaration.parent.parent.expression)));
        return indexType.flags & (TypeFlags.TypeParameter | qt.TypeFlags.Index) ? getExtractStringType(indexType) : stringType;
      }
      if (declaration.kind === Syntax.VariableDeclaration && declaration.parent.parent.kind === Syntax.ForOfStatement) {
        const forOfStatement = declaration.parent.parent;
        return check.rightHandSideOfForOf(forOfStatement) || anyType;
      }
      if (declaration.parent.kind === Syntax.BindingPattern) return this.typeForBindingElem(<BindingElem>declaration);
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
        if (!(this.combinedFlagsOf(declaration) & NodeFlags.Const) && (!declaration.initer || isNullOrUndefined(declaration.initer))) return autoType;
        if (declaration.initer && qf.is.emptyArrayLiteral(declaration.initer)) return autoArrayType;
      }
      if (declaration.kind === Syntax.Parameter) {
        const func = <FunctionLikeDeclaration>declaration.parent;
        if (func.kind === Syntax.SetAccessor && !hasNonBindableDynamicName(func)) {
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
          if (typeTag && typeTag.kind === Syntax.FunctionTyping) return getTypeAtPosition(this.signatureFromDeclaration(typeTag), func.parameters.indexOf(declaration));
        }
        const type = declaration.symbol.escName === InternalSymbol.This ? getContextualThisParameterType(func) : getContextuallyTypedParameterType(declaration);
        if (type) return addOptionality(type, isOptional);
      } else if (qf.is.inJSFile(declaration)) {
        const containerObjectType = getJSContainerObjectType(declaration, this.symbolOfNode(declaration), this.declaredExpandoIniter(declaration));
        if (containerObjectType) return containerObjectType;
      }
      if (declaration.initer) {
        const type = widenTypeInferredFromIniter(declaration, check.declarationIniter(declaration));
        return addOptionality(type, isOptional);
      }
      if (declaration.kind === Syntax.PropertyDeclaration && (noImplicitAny || qf.is.inJSFile(declaration))) {
        const constructor = findConstructorDeclaration(declaration.parent);
        const type = constructor
          ? this.flowTypeInConstructor(declaration.symbol, constructor)
          : this.effectiveModifierFlags(declaration) & ModifierFlags.Ambient
          ? this.typeOfPropertyInBaseClass(declaration.symbol)
          : undefined;
        return type && addOptionality(type, isOptional);
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
      return this.flowTypeOfReference(n, autoType, t);
    }
    widenedTypeForAssignmentDeclaration(symbol: Symbol, resolvedSymbol?: Symbol) {
      const container = this.assignedExpandoIniter(symbol.valueDeclaration);
      if (container) {
        const tag = qc.getDoc.typeTag(container);
        if (tag && tag.typeExpression) return this.typeFromTypeNode(tag.typeExpression);
        const containerObjectType = getJSContainerObjectType(symbol.valueDeclaration, symbol, container);
        return containerObjectType || this.widenedLiteralType(check.expressionCached(container));
      }
      let type;
      let definedInConstructor = false;
      let definedInMethod = false;
      if (qf.is.constructorDeclaredProperty(symbol)) type = this.flowTypeInConstructor(symbol, getDeclaringConstructor(symbol)!);
      if (!type) {
        let jsdocType: qt.Type | undefined;
        let types: qt.Type[] | undefined;
        for (const declaration of symbol.declarations) {
          const expression =
            declaration.kind === Syntax.BinaryExpression || declaration.kind === Syntax.CallExpression
              ? declaration
              : qf.is.accessExpression(declaration)
              ? declaration.parent.kind === Syntax.BinaryExpression
                ? declaration.parent
                : declaration
              : undefined;
          if (!expression) continue;
          const kind = qf.is.accessExpression(expression) ? this.assignmentDeclarationPropertyAccessKind(expression) : this.assignmentDeclarationKind(expression);
          if (kind === AssignmentDeclarationKind.ThisProperty) {
            if (isDeclarationInConstructor(expression)) definedInConstructor = true;
            else {
              definedInMethod = true;
            }
          }
          if (!expression.kind === Syntax.CallExpression) jsdocType = getAnnotatedTypeForAssignmentDeclaration(jsdocType, expression, symbol, declaration);
          if (!jsdocType) {
            (types || (types = [])).push(
              expression.kind === Syntax.BinaryExpression || expression.kind === Syntax.CallExpression ? getIniterTypeFromAssignmentDeclaration(symbol, resolvedSymbol, expression, kind) : neverType
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
      const widened = this.widenedType(addOptionality(type, definedInMethod && !definedInConstructor));
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
        if (s && qu.hasEntries(s.exports)) exports.merge(s.exports);
        decl = decl.kind === Syntax.BinaryExpression ? decl.parent : decl.parent.parent;
      }
      const s = this.symbolOfNode(decl);
      if (s && qu.hasEntries(s.exports)) exports.merge(s.exports);
      const type = createAnonymousType(symbol, exports, empty, empty, undefined, undefined);
      type.objectFlags |= ObjectFlags.JSLiteral;
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
        const typeNode = this.effectiveTypeAnnotationNode(symbol.parent.valueDeclaration);
        if (typeNode) return this.typeOfPropertyOfType(this.typeFromTypeNode(typeNode), symbol.escName);
      }
      return declaredType;
    }
    initerTypeFromAssignmentDeclaration(symbol: Symbol, resolvedSymbol: Symbol | undefined, expression: BinaryExpression | CallExpression, kind: AssignmentDeclarationKind) {
      if (expression.kind === Syntax.CallExpression) {
        if (resolvedSymbol) return this.typeOfSymbol(resolvedSymbol);
        const objectLitType = check.expressionCached((expression as BindableObjectDefinePropertyCall).arguments[2]);
        const valueType = this.typeOfPropertyOfType(objectLitType, 'value' as qu.__String);
        if (valueType) return valueType;
        const getFunc = this.typeOfPropertyOfType(objectLitType, 'get' as qu.__String);
        if (getFunc) {
          const getSig = getSingleCallSignature(getFunc);
          if (getSig) return this.returnTypeOfSignature(getSig);
        }
        const setFunc = this.typeOfPropertyOfType(objectLitType, 'set' as qu.__String);
        if (setFunc) {
          const setSig = getSingleCallSignature(setFunc);
          if (setSig) return getTypeOfFirstParameterOfSignature(setSig);
        }
        return anyType;
      }
      if (containsSameNamedThisProperty(expression.left, expression.right)) return anyType;
      const type = resolvedSymbol ? this.typeOfSymbol(resolvedSymbol) : this.widenedLiteralType(check.expressionCached(expression.right));
      if (type.flags & qt.TypeFlags.Object && kind === AssignmentDeclarationKind.ModuleExports && symbol.escName === InternalSymbol.ExportEquals) {
        const exportedType = resolveStructuredTypeMembers(type as ObjectType);
        const members = new SymbolTable();
        copyEntries(exportedType.members, members);
        if (resolvedSymbol && !resolvedSymbol.exports) resolvedSymbol.exports = new SymbolTable();
        (resolvedSymbol || symbol).exports!.forEach((s, name) => {
          const exportedMember = members.get(name)!;
          if (exportedMember && exportedMember !== s) {
            if (s.flags & qt.SymbolFlags.Value) {
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
        result.objectFlags |= getObjectFlags(type) & ObjectFlags.JSLiteral;
        return result;
      }
      if (qf.is.emptyArrayLiteralType(type)) {
        reportImplicitAny(expression, anyArrayType);
        return anyArrayType;
      }
      return type;
    }
    constructorDefinedThisAssignmentTypes(types: qt.Type[], declarations: Declaration[]): qt.Type[] | undefined {
      qu.assert(types.length === declarations.length);
      return types.filter((_, i) => {
        const declaration = declarations[i];
        const expression = declaration.kind === Syntax.BinaryExpression ? declaration : declaration.parent.kind === Syntax.BinaryExpression ? declaration.parent : undefined;
        return expression && isDeclarationInConstructor(expression);
      });
    }
    typeFromBindingElem(elem: qt.BindingElem, includePatternInType?: boolean, reportErrors?: boolean): qt.Type {
      if (elem.initer) {
        const contextualType = elem.name.kind === Syntax.BindingPattern ? this.typeFromBindingPattern(elem.name, true, false) : unknownType;
        return addOptionality(widenTypeInferredFromIniter(elem, check.declarationIniter(elem, contextualType)));
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
        const text = getPropertyNameFromType(exprType);
        const flags = qt.SymbolFlags.Property | (e.initer ? qt.SymbolFlags.Optional : 0);
        const symbol = new Symbol(flags, text);
        symbol.type = getTypeFromBindingElem(e, includePatternInType, reportErrors);
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
      const elemTypes = map(elems, (e) => (e.kind === Syntax.OmittedExpression ? anyType : getTypeFromBindingElem(e, includePatternInType, reportErrors)));
      const minLength = findLastIndex(elems, (e) => !e.kind === Syntax.OmittedExpression && !hasDefaultValue(e), elems.length - (hasRestElem ? 2 : 1)) + 1;
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
        ? getTypeFromObjectBindingPattern(pattern, includePatternInType, reportErrors)
        : getTypeFromArrayBindingPattern(pattern, includePatternInType, reportErrors);
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
      const n = getAnnotatedAccessorTypeNode(accessor);
      return n && this.typeFromTypeNode(n);
    }
    annotatedAccessorThisNodeKind(ParameterDeclaration, accessor: AccessorDeclaration): Symbol | undefined {
      const parameter = this.accessorThisNodeKind(ParameterDeclaration, accessor);
      return parameter && parameter.symbol;
    }
    thisTypeOfDeclaration(declaration: SignatureDeclaration): qt.Type | undefined {
      return getThisTypeOfSignature(this.signatureFromDeclaration(declaration));
    }
    targetType(type: qt.Type): qt.Type {
      return getObjectFlags(type) & ObjectFlags.Reference ? (<TypeReference>type).target : type;
    }
    outerTypeParameters(n: Node, includeThisTypes?: boolean): TypeParameter[] | undefined {
      while (true) {
        n = n.parent;
        if (n && BinaryExpression.kind === Syntax.node) {
          const assignmentKind = this.assignmentDeclarationKind(n);
          if (assignmentKind === AssignmentDeclarationKind.Prototype || assignmentKind === AssignmentDeclarationKind.PrototypeProperty) {
            const symbol = this.symbolOfNode(n.left);
            if (symbol && symbol.parent && !qc.findAncestor(symbol.parent.valueDeclaration, (d) => n === d)) n = symbol.parent.valueDeclaration;
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
            const outerTypeParameters = getOuterTypeParameters(n, includeThisTypes);
            if (n.kind === Syntax.MappedTyping) return append(outerTypeParameters, getDeclaredTypeOfTypeParameter(this.symbolOfNode((<MappedTyping>n).typeParameter)));
            else if (n.kind === Syntax.ConditionalTyping) return concatenate(outerTypeParameters, getInferTypeParameters(<ConditionalTyping>n));
            else if (n.kind === Syntax.VariableStatement && !qf.is.inJSFile(n)) {
              break;
            }
            const outerAndOwnTypeParameters = appendTypeParameters(outerTypeParameters, this.effectiveTypeParameterDeclarations(<DeclarationWithTypeParameters>n));
            const thisType =
              includeThisTypes &&
              (n.kind === Syntax.ClassDeclaration || n.kind === Syntax.ClassExpression || n.kind === Syntax.InterfaceDeclaration || qf.is.jsConstructor(n)) &&
              getDeclaredTypeOfClassOrInterface(this.symbolOfNode(n as ClassLikeDeclaration | InterfaceDeclaration)).thisType;
            return thisType ? append(outerAndOwnTypeParameters, thisType) : outerAndOwnTypeParameters;
        }
      }
    }
    baseTypeNodeOfClass(type: InterfaceType): ExpressionWithTypings | undefined {
      return this.effectiveBaseTypeNode(type.symbol.valueDeclaration as ClassLikeDeclaration);
    }
    constructorsForTypeArguments(type: qt.Type, typeArgumentNodes: readonly Typing[] | undefined, location: Node): readonly Signature[] {
      const typeArgCount = length(typeArgumentNodes);
      const isJavascript = qf.is.inJSFile(location);
      return filter(
        getSignaturesOfType(type, SignatureKind.Construct),
        (sig) => (isJavascript || typeArgCount >= getMinTypeArgumentCount(sig.typeParameters)) && typeArgCount <= length(sig.typeParameters)
      );
    }
    instantiatedConstructorsForTypeArguments(type: qt.Type, typeArgumentNodes: readonly Typing[] | undefined, location: Node): readonly Signature[] {
      const signatures = getConstructorsForTypeArguments(type, typeArgumentNodes, location);
      const typeArguments = map(typeArgumentNodes, this.typeFromTypeNode);
      return sameMap<Signature>(signatures, (sig) => (some(sig.typeParameters) ? getSignatureInstantiation(sig, typeArguments, qf.is.inJSFile(location)) : sig));
    }
    baseConstructorTypeOfClass(type: InterfaceType): qt.Type {
      if (!type.resolvedBaseConstructorType) {
        const decl = <ClassLikeDeclaration>type.symbol.valueDeclaration;
        const extended = this.effectiveBaseTypeNode(decl);
        const baseTypeNode = getBaseTypeNodeOfClass(type);
        if (!baseTypeNode) return (type.resolvedBaseConstructorType = undefinedType);
        if (!pushTypeResolution(type, TypeSystemPropertyName.ResolvedBaseConstructorType)) return errorType;
        const baseConstructorType = check.expression(baseTypeNode.expression);
        if (extended && baseTypeNode !== extended) {
          qu.assert(!extended.typeArguments);
          check.expression(extended.expression);
        }
        if (baseConstructorType.flags & (TypeFlags.Object | qt.TypeFlags.Intersection)) resolveStructuredTypeMembers(<ObjectType>baseConstructorType);
        if (!popTypeResolution()) {
          error(type.symbol.valueDeclaration, qd.msgs._0_is_referenced_directly_or_indirectly_in_its_own_base_expression, type.symbol.symbolToString());
          return (type.resolvedBaseConstructorType = errorType);
        }
        if (!(baseConstructorType.flags & qt.TypeFlags.Any) && baseConstructorType !== nullWideningType && !isConstructorType(baseConstructorType)) {
          const err = error(baseTypeNode.expression, qd.msgs.Type_0_is_not_a_constructor_function_type, typeToString(baseConstructorType));
          if (baseConstructorType.flags & qt.TypeFlags.TypeParameter) {
            const constraint = getConstraintFromTypeParameter(baseConstructorType);
            let ctorReturn: qt.Type = unknownType;
            if (constraint) {
              const ctorSig = getSignaturesOfType(constraint, SignatureKind.Construct);
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
          return (type.resolvedBaseConstructorType = errorType);
        }
        type.resolvedBaseConstructorType = baseConstructorType;
      }
      return type.resolvedBaseConstructorType;
    }
    implementsTypes(type: InterfaceType): BaseType[] {
      let resolvedImplementsTypes: BaseType[] = empty;
      for (const declaration of type.symbol.declarations) {
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
    baseTypes(type: InterfaceType): BaseType[] {
      if (!type.resolvedBaseTypes) {
        if (type.objectFlags & ObjectFlags.Tuple) type.resolvedBaseTypes = [createArrayType(this.unionType(type.typeParameters || empty), (<TupleType>type).readonly)];
        else if (type.symbol.flags & (SymbolFlags.Class | qt.SymbolFlags.Interface)) {
          if (type.symbol.flags & qt.SymbolFlags.Class) resolveBaseTypesOfClass(type);
          if (type.symbol.flags & qt.SymbolFlags.Interface) resolveBaseTypesOfInterface(type);
        } else {
          qu.fail('type must be class or interface');
        }
      }
      return type.resolvedBaseTypes;
    }
    baseTypeOfEnumLiteralType(type: qt.Type) {
      return type.flags & qt.TypeFlags.EnumLiteral && !(type.flags & qt.TypeFlags.Union) ? getDeclaredTypeOfSymbol(getParentOfSymbol(type.symbol)!) : type;
    }
    propertyNameFromType(type: StringLiteralType | NumberLiteralType | UniqueESSymbolType): qu.__String {
      if (type.flags & qt.TypeFlags.UniqueESSymbol) return (<UniqueESSymbolType>type).escName;
      if (type.flags & (TypeFlags.StringLiteral | qt.TypeFlags.NumberLiteral)) return qy.get.escUnderscores('' + (<StringLiteralType | NumberLiteralType>type).value);
      return qu.fail();
    }
    resolvedMembersOrExportsOfSymbol(symbol: Symbol, resolutionKind: MembersOrExportsResolutionKind): EscapedMap<Symbol> {
      const ls = symbol.getLinks();
      if (!ls[resolutionKind]) {
        const isStatic = resolutionKind === MembersOrExportsResolutionKind.resolvedExports;
        const earlySymbols = !isStatic ? symbol.members : symbol.flags & qt.SymbolFlags.Module ? symbol.getExportsOfModuleWorker() : symbol.exports;
        ls[resolutionKind] = earlySymbols || emptySymbols;
        const lateSymbols = new SymbolTable<TransientSymbol>();
        for (const decl of symbol.declarations) {
          const members = this.declaration.members(decl);
          if (members) {
            for (const member of members) {
              if (isStatic === qf.has.staticModifier(member) && hasLateBindableName(member)) lateBindMember(symbol, earlySymbols, lateSymbols, member);
            }
          }
        }
        const assignments = symbol.assignmentDeclarationMembers;
        if (assignments) {
          const decls = arrayFrom(assignments.values());
          for (const member of decls) {
            const assignmentKind = this.assignmentDeclarationKind(member as BinaryExpression | CallExpression);
            const isInstanceMember =
              assignmentKind === AssignmentDeclarationKind.PrototypeProperty ||
              assignmentKind === AssignmentDeclarationKind.ThisProperty ||
              assignmentKind === AssignmentDeclarationKind.ObjectDefinePrototypeProperty ||
              assignmentKind === AssignmentDeclarationKind.Prototype;
            if (isStatic === !isInstanceMember && hasLateBindableName(member)) lateBindMember(symbol, earlySymbols, lateSymbols, member);
          }
        }
        ls[resolutionKind] = earlySymbols?.combine(lateSymbols) || emptySymbols;
      }
      return ls[resolutionKind]!;
    }
    typeWithThisArgument(type: qt.Type, thisArgument?: qt.Type, needApparentType?: boolean): qt.Type {
      if (getObjectFlags(type) & ObjectFlags.Reference) {
        const target = (<TypeReference>type).target;
        const typeArguments = getTypeArguments(<TypeReference>type);
        if (length(target.typeParameters) === length(typeArguments)) {
          const ref = createTypeReference(target, concatenate(typeArguments, [thisArgument || target.thisType!]));
          return needApparentType ? getApparentType(ref) : ref;
        }
      } else if (type.flags & qt.TypeFlags.Intersection) {
        return getIntersectionType(map((<IntersectionType>type).types, (t) => getTypeWithThisArgument(t, thisArgument, needApparentType)));
      }
      return needApparentType ? getApparentType(type) : type;
    }
    optionalCallSignature(signature: Signature, callChainFlags: SignatureFlags): Signature {
      if ((signature.flags & SignatureFlags.CallChainFlags) === callChainFlags) return signature;
      if (!signature.optionalCallSignatureCache) signature.optionalCallSignatureCache = {};
      const key = callChainFlags === SignatureFlags.IsInnerCallChain ? 'inner' : 'outer';
      return signature.optionalCallSignatureCache[key] || (signature.optionalCallSignatureCache[key] = createOptionalCallSignature(signature, callChainFlags));
    }
    expandedParameters(sig: Signature, skipUnionExpanding?: boolean): readonly (readonly Symbol[])[] {
      if (signatureHasRestParameter(sig)) {
        const restIndex = sig.parameters.length - 1;
        const restType = this.typeOfSymbol(sig.parameters[restIndex]);
        if (qf.is.tupleType(restType)) return [expandSignatureParametersWithTupleMembers(restType, restIndex)];
        else if (!skipUnionExpanding && restType.flags & qt.TypeFlags.Union && every((restType as UnionType).types, qf.is.tupleType))
          return map((restType as UnionType).types, (t) => expandSignatureParametersWithTupleMembers(t as TupleTypeReference, restIndex));
      }
      return [sig.parameters];
      function expandSignatureParametersWithTupleMembers(restType: TupleTypeReference, restIndex: number) {
        const elemTypes = getTypeArguments(restType);
        const minLength = restType.target.minLength;
        const tupleRestIndex = restType.target.hasRestElem ? elemTypes.length - 1 : -1;
        const associatedNames = restType.target.labeledElemDeclarations;
        const restParams = map(elemTypes, (t, i) => {
          const tupleLabelName = !!associatedNames && getTupleElemLabel(associatedNames[i]);
          const name = tupleLabelName || getParameterNameAtPosition(sig, restIndex + i);
          const f = i === tupleRestIndex ? qt.CheckFlags.RestParameter : i >= minLength ? qt.CheckFlags.OptionalParameter : 0;
          const symbol = new Symbol(SymbolFlags.FunctionScopedVariable, name, f);
          symbol.type = i === tupleRestIndex ? createArrayType(t) : t;
          return symbol;
        });
        return concatenate(sig.parameters.slice(0, restIndex), restParams);
      }
    }
    defaultConstructSignatures(classType: InterfaceType): Signature[] {
      const baseConstructorType = getBaseConstructorTypeOfClass(classType);
      const baseSignatures = getSignaturesOfType(baseConstructorType, SignatureKind.Construct);
      if (baseSignatures.length === 0) return [createSignature(undefined, classType.localTypeParameters, undefined, empty, classType, undefined, 0, SignatureFlags.None)];
      const baseTypeNode = getBaseTypeNodeOfClass(classType)!;
      const isJavaScript = qf.is.inJSFile(baseTypeNode);
      const typeArguments = typeArgumentsFromTypingReference(baseTypeNode);
      const typeArgCount = length(typeArguments);
      const result: Signature[] = [];
      for (const baseSig of baseSignatures) {
        const minTypeArgumentCount = getMinTypeArgumentCount(baseSig.typeParameters);
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
    unionSignatures(signatureLists: readonly (readonly Signature[])[]): Signature[] {
      let result: Signature[] | undefined;
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
                  const thisType = getIntersectionType(mapDefined(unionSignatures, (sig) => sig.thisParameter && this.typeOfSymbol(sig.thisParameter)));
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
        let results: Signature[] | undefined = masterList.slice();
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
        const indexInfo = this.indexInfoOfType(getApparentType(type), kind);
        if (!indexInfo) return;
        indexTypes.push(indexInfo.type);
        isAnyReadonly = isAnyReadonly || indexInfo.isReadonly;
      }
      return createIndexInfo(this.unionType(indexTypes, UnionReduction.Subtype), isAnyReadonly);
    }
    lowerBoundOfKeyType(type: qt.Type): qt.Type {
      if (type.flags & (TypeFlags.Any | qt.TypeFlags.Primitive)) return type;
      if (type.flags & qt.TypeFlags.Index) return this.indexType(getApparentType((<IndexType>type).type));
      if (type.flags & qt.TypeFlags.Conditional) {
        if ((<ConditionalType>type).root.isDistributive) {
          const checkType = (<ConditionalType>type).checkType;
          const constraint = getLowerBoundOfKeyType(checkType);
          if (constraint !== checkType)
            return getConditionalTypeInstantiation(<ConditionalType>type, prependTypeMapping((<ConditionalType>type).root.checkType, constraint, (<ConditionalType>type).mapper));
        }
        return type;
      }
      if (type.flags & qt.TypeFlags.Union) return this.unionType(sameMap((<UnionType>type).types, getLowerBoundOfKeyType));
      if (type.flags & qt.TypeFlags.Intersection) return getIntersectionType(sameMap((<UnionType>type).types, getLowerBoundOfKeyType));
      return neverType;
    }
    typeOfMappedSymbol(symbol: MappedSymbol) {
      if (!symbol.type) {
        if (!pushTypeResolution(symbol, TypeSystemPropertyName.Type)) return errorType;
        const templateType = getTemplateTypeFromMappedType(<MappedType>symbol.mappedType.target || symbol.mappedType);
        const propType = instantiateType(templateType, symbol.mapper);
        let type =
          strictNullChecks && symbol.flags & qt.SymbolFlags.Optional && !maybeTypeOfKind(propType, qt.TypeFlags.Undefined | qt.TypeFlags.Void)
            ? getOptionalType(propType)
            : symbol.checkFlags & qt.CheckFlags.StripOptional
            ? getTypeWithFacts(propType, TypeFacts.NEUndefined)
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
    typeParameterFromMappedType(type: MappedType) {
      return type.typeParameter || (type.typeParameter = getDeclaredTypeOfTypeParameter(this.symbolOfNode(type.declaration.typeParameter)));
    }
    constraintTypeFromMappedType(type: MappedType) {
      return type.constraintType || (type.constraintType = getConstraintOfTypeParameter(getTypeParameterFromMappedType(type)) || errorType);
    }
    templateTypeFromMappedType(type: MappedType) {
      return (
        type.templateType ||
        (type.templateType = type.declaration.type
          ? instantiateType(addOptionality(this.typeFromTypeNode(type.declaration.type), !!(getMappedTypeModifiers(type) & MappedTypeModifiers.IncludeOptional)), type.mapper)
          : errorType)
      );
    }
    constraintDeclarationForMappedType(type: MappedType) {
      return this.effectiveConstraintOfTypeParameter(type.declaration.typeParameter);
    }
    modifiersTypeFromMappedType(type: MappedType) {
      if (!type.modifiersType) {
        if (isMappedTypeWithKeyofConstraintDeclaration(type))
          type.modifiersType = instantiateType(this.typeFromTypeNode((<TypingOperator>getConstraintDeclarationForMappedType(type)).type), type.mapper);
        else {
          const declaredType = <MappedType>getTypeFromMappedTyping(type.declaration);
          const constraint = getConstraintTypeFromMappedType(declaredType);
          const extendedConstraint = constraint && constraint.flags & qt.TypeFlags.TypeParameter ? getConstraintOfTypeParameter(<TypeParameter>constraint) : constraint;
          type.modifiersType = extendedConstraint && extendedConstraint.flags & qt.TypeFlags.Index ? instantiateType((<IndexType>extendedConstraint).type, type.mapper) : unknownType;
        }
      }
      return type.modifiersType;
    }
    mappedTypeModifiers(type: MappedType): MappedTypeModifiers {
      const declaration = type.declaration;
      return (
        (declaration.readonlyToken ? (declaration.readonlyToken.kind === Syntax.MinusToken ? MappedTypeModifiers.ExcludeReadonly : MappedTypeModifiers.IncludeReadonly) : 0) |
        (declaration.questionToken ? (declaration.questionToken.kind === Syntax.MinusToken ? MappedTypeModifiers.ExcludeOptional : MappedTypeModifiers.IncludeOptional) : 0)
      );
    }
    mappedTypeOptionality(type: MappedType): number {
      const modifiers = getMappedTypeModifiers(type);
      return modifiers & MappedTypeModifiers.ExcludeOptional ? -1 : modifiers & MappedTypeModifiers.IncludeOptional ? 1 : 0;
    }
    combinedMappedTypeOptionality(type: MappedType): number {
      const optionality = getMappedTypeOptionality(type);
      const modifiersType = getModifiersTypeFromMappedType(type);
      return optionality || (qf.is.genericMappedType(modifiersType) ? getMappedTypeOptionality(modifiersType) : 0);
    }
    propertiesOfObjectType(type: qt.Type): Symbol[] {
      if (type.flags & qt.TypeFlags.Object) return resolveStructuredTypeMembers(<ObjectType>type).properties;
      return empty;
    }
    propertyOfObjectType(type: qt.Type, name: qu.__String): Symbol | undefined {
      if (type.flags & qt.TypeFlags.Object) {
        const resolved = resolveStructuredTypeMembers(<ObjectType>type);
        const symbol = resolved.members.get(name);
        if (symbol && symbolIsValue(symbol)) return symbol;
      }
    }
    propertiesOfUnionOrIntersectionType(type: UnionOrIntersectionType): Symbol[] {
      if (!type.resolvedProperties) {
        const members = new SymbolTable();
        for (const current of type.types) {
          for (const prop of this.propertiesOfType(current)) {
            if (!members.has(prop.escName)) {
              const combinedProp = getPropertyOfUnionOrIntersectionType(type, prop.escName);
              if (combinedProp) members.set(prop.escName, combinedProp);
            }
          }
          if (type.flags & qt.TypeFlags.Union && !this.indexInfoOfType(current, qt.IndexKind.String) && !this.indexInfoOfType(current, qt.IndexKind.Number)) break;
        }
        type.resolvedProperties = getNamedMembers(members);
      }
      return type.resolvedProperties;
    }
    propertiesOfType(type: qt.Type): Symbol[] {
      type = getReducedApparentType(type);
      return type.flags & qt.TypeFlags.UnionOrIntersection ? getPropertiesOfUnionOrIntersectionType(<UnionType>type) : getPropertiesOfObjectType(type);
    }
    allPossiblePropertiesOfTypes(types: readonly qt.Type[]): Symbol[] {
      const unionType = this.unionType(types);
      if (!(unionType.flags & qt.TypeFlags.Union)) return getAugmentedPropertiesOfType(unionType);
      const props = new SymbolTable();
      for (const memberType of types) {
        for (const { escName } of getAugmentedPropertiesOfType(memberType)) {
          if (!props.has(escName)) {
            const prop = createUnionOrIntersectionProperty(unionType as UnionType, escName);
            if (prop) props.set(escName, prop);
          }
        }
      }
      return arrayFrom(props.values());
    }
    constraintOfType(type: InstantiableType | UnionOrIntersectionType): qt.Type | undefined {
      return type.flags & qt.TypeFlags.TypeParameter
        ? getConstraintOfTypeParameter(<TypeParameter>type)
        : type.flags & qt.TypeFlags.IndexedAccess
        ? getConstraintOfIndexedAccess(<IndexedAccessType>type)
        : type.flags & qt.TypeFlags.Conditional
        ? getConstraintOfConditionalType(<ConditionalType>type)
        : getBaseConstraintOfType(type);
    }
    constraintOfTypeParameter(typeParameter: TypeParameter): qt.Type | undefined {
      return hasNonCircularBaseConstraint(typeParameter) ? getConstraintFromTypeParameter(typeParameter) : undefined;
    }
    constraintOfIndexedAccess(type: IndexedAccessType) {
      return hasNonCircularBaseConstraint(type) ? getConstraintFromIndexedAccess(type) : undefined;
    }
    simplifiedTypeOrConstraint(type: qt.Type) {
      const simplified = getSimplifiedType(type, false);
      return simplified !== type ? simplified : getConstraintOfType(type);
    }
    constraintFromIndexedAccess(type: IndexedAccessType) {
      const indexConstraint = getSimplifiedTypeOrConstraint(type.indexType);
      if (indexConstraint && indexConstraint !== type.indexType) {
        const indexedAccess = this.indexedAccessTypeOrUndefined(type.objectType, indexConstraint);
        if (indexedAccess) return indexedAccess;
      }
      const objectConstraint = getSimplifiedTypeOrConstraint(type.objectType);
      if (objectConstraint && objectConstraint !== type.objectType) return this.indexedAccessTypeOrUndefined(objectConstraint, type.indexType);
      return;
    }
    defaultConstraintOfConditionalType(type: ConditionalType) {
      if (!type.resolvedDefaultConstraint) {
        const trueConstraint = getInferredTrueTypeFromConditionalType(type);
        const falseConstraint = getFalseTypeFromConditionalType(type);
        type.resolvedDefaultConstraint = qf.is.typeAny(trueConstraint) ? falseConstraint : qf.is.typeAny(falseConstraint) ? trueConstraint : this.unionType([trueConstraint, falseConstraint]);
      }
      return type.resolvedDefaultConstraint;
    }
    constraintOfDistributiveConditionalType(type: ConditionalType): qt.Type | undefined {
      if (type.root.isDistributive && type.restrictiveInstantiation !== type) {
        const simplified = getSimplifiedType(type.checkType, false);
        const constraint = simplified === type.checkType ? getConstraintOfType(simplified) : simplified;
        if (constraint && constraint !== type.checkType) {
          const instantiated = getConditionalTypeInstantiation(type, prependTypeMapping(type.root.checkType, constraint, type.mapper));
          if (!(instantiated.flags & qt.TypeFlags.Never)) return instantiated;
        }
      }
      return;
    }
    constraintFromConditionalType(type: ConditionalType) {
      return getConstraintOfDistributiveConditionalType(type) || getDefaultConstraintOfConditionalType(type);
    }
    constraintOfConditionalType(type: ConditionalType) {
      return hasNonCircularBaseConstraint(type) ? getConstraintFromConditionalType(type) : undefined;
    }
    effectiveConstraintOfIntersection(types: readonly qt.Type[], targetIsUnion: boolean) {
      let constraints: qt.Type[] | undefined;
      let hasDisjointDomainType = false;
      for (const t of types) {
        if (t.flags & qt.TypeFlags.Instantiable) {
          let constraint = getConstraintOfType(t);
          while (constraint && constraint.flags & (TypeFlags.TypeParameter | qt.TypeFlags.Index | qt.TypeFlags.Conditional)) {
            constraint = getConstraintOfType(constraint);
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
        return getIntersectionType(constraints);
      }
      return;
    }
    baseConstraintOfType(type: qt.Type): qt.Type | undefined {
      if (type.flags & (TypeFlags.InstantiableNonPrimitive | qt.TypeFlags.UnionOrIntersection)) {
        const constraint = getResolvedBaseConstraint(<InstantiableType | UnionOrIntersectionType>type);
        return constraint !== noConstraintType && constraint !== circularConstraintType ? constraint : undefined;
      }
      return type.flags & qt.TypeFlags.Index ? keyofConstraintType : undefined;
    }
    baseConstraintOrType(type: qt.Type) {
      return getBaseConstraintOfType(type) || type;
    }
    resolvedBaseConstraint(type: InstantiableType | UnionOrIntersectionType): qt.Type {
      let nonTerminating = false;
      return type.resolvedBaseConstraint || (type.resolvedBaseConstraint = getTypeWithThisArgument(getImmediateBaseConstraint(type), type));
      function getImmediateBaseConstraint(t: qt.Type): qt.Type {
        if (!t.immediateBaseConstraint) {
          if (!pushTypeResolution(t, TypeSystemPropertyName.ImmediateBaseConstraint)) return circularConstraintType;
          if (constraintDepth >= 50) {
            error(currentNode, qd.msgs.Type_instantiation_is_excessively_deep_and_possibly_infinite);
            nonTerminating = true;
            return (t.immediateBaseConstraint = noConstraintType);
          }
          constraintDepth++;
          let result = computeBaseConstraint(getSimplifiedType(t, false));
          constraintDepth--;
          if (!popTypeResolution()) {
            if (t.flags & qt.TypeFlags.TypeParameter) {
              const errorNode = getConstraintDeclaration(<TypeParameter>t);
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
      }
      function getBaseConstraint(t: qt.Type): qt.Type | undefined {
        const c = getImmediateBaseConstraint(t);
        return c !== noConstraintType && c !== circularConstraintType ? c : undefined;
      }
      function computeBaseConstraint(t: qt.Type): qt.Type | undefined {
        if (t.flags & qt.TypeFlags.TypeParameter) {
          const constraint = getConstraintFromTypeParameter(<TypeParameter>t);
          return (t as TypeParameter).isThisType || !constraint ? constraint : getBaseConstraint(constraint);
        }
        if (t.flags & qt.TypeFlags.UnionOrIntersection) {
          const types = (<UnionOrIntersectionType>t).types;
          const baseTypes: qt.Type[] = [];
          for (const type of types) {
            const baseType = getBaseConstraint(type);
            if (baseType) baseTypes.push(baseType);
          }
          return t.flags & qt.TypeFlags.Union && baseTypes.length === types.length
            ? this.unionType(baseTypes)
            : t.flags & qt.TypeFlags.Intersection && baseTypes.length
            ? getIntersectionType(baseTypes)
            : undefined;
        }
        if (t.flags & qt.TypeFlags.Index) return keyofConstraintType;
        if (t.flags & qt.TypeFlags.IndexedAccess) {
          const baseObjectType = getBaseConstraint((<IndexedAccessType>t).objectType);
          const baseIndexType = getBaseConstraint((<IndexedAccessType>t).indexType);
          const baseIndexedAccess = baseObjectType && baseIndexType && this.indexedAccessTypeOrUndefined(baseObjectType, baseIndexType);
          return baseIndexedAccess && getBaseConstraint(baseIndexedAccess);
        }
        if (t.flags & qt.TypeFlags.Conditional) {
          const constraint = getConstraintFromConditionalType(<ConditionalType>t);
          constraintDepth++;
          const result = constraint && getBaseConstraint(constraint);
          constraintDepth--;
          return result;
        }
        if (t.flags & qt.TypeFlags.Substitution) return getBaseConstraint((<SubstitutionType>t).substitute);
        return t;
      }
    }
    apparentTypeOfIntersectionType(type: IntersectionType) {
      return type.resolvedApparentType || (type.resolvedApparentType = getTypeWithThisArgument(type, type, true));
    }
    resolvedTypeParameterDefault(typeParameter: TypeParameter): qt.Type | undefined {
      if (!typeParameter.default) {
        if (typeParameter.target) {
          const targetDefault = getResolvedTypeParameterDefault(typeParameter.target);
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
    defaultFromTypeParameter(typeParameter: TypeParameter): qt.Type | undefined {
      const defaultType = getResolvedTypeParameterDefault(typeParameter);
      return defaultType !== noConstraintType && defaultType !== circularConstraintType ? defaultType : undefined;
    }
    apparentTypeOfMappedType(type: MappedType) {
      return type.resolvedApparentType || (type.resolvedApparentType = getResolvedApparentTypeOfMappedType(type));
    }
    resolvedApparentTypeOfMappedType(type: MappedType) {
      const typeVariable = getHomomorphicTypeVariable(type);
      if (typeVariable) {
        const constraint = getConstraintOfTypeParameter(typeVariable);
        if (constraint && (qf.is.arrayType(constraint) || qf.is.tupleType(constraint))) return instantiateType(type, prependTypeMapping(typeVariable, constraint, type.mapper));
      }
      return type;
    }
    apparentType(type: qt.Type): qt.Type {
      const t = type.flags & qt.TypeFlags.Instantiable ? getBaseConstraintOfType(type) || unknownType : type;
      return getObjectFlags(t) & ObjectFlags.Mapped
        ? getApparentTypeOfMappedType(<MappedType>t)
        : t.flags & qt.TypeFlags.Intersection
        ? getApparentTypeOfIntersectionType(<IntersectionType>t)
        : t.flags & qt.TypeFlags.StringLike
        ? globalStringType
        : t.flags & qt.TypeFlags.NumberLike
        ? globalNumberType
        : t.flags & qt.TypeFlags.BigIntLike
        ? getGlobalBigIntType(true)
        : t.flags & qt.TypeFlags.BooleanLike
        ? globalBooleanType
        : t.flags & qt.TypeFlags.ESSymbolLike
        ? getGlobalESSymbolType(true)
        : t.flags & qt.TypeFlags.NonPrimitive
        ? emptyObjectType
        : t.flags & qt.TypeFlags.Index
        ? keyofConstraintType
        : t.flags & qt.TypeFlags.Unknown && !strictNullChecks
        ? emptyObjectType
        : t;
    }
    reducedApparentType(type: qt.Type): qt.Type {
      return getReducedType(getApparentType(getReducedType(type)));
    }
    unionOrIntersectionProperty(type: UnionOrIntersectionType, name: qu.__String): Symbol | undefined {
      const properties = type.propertyCache || (type.propertyCache = new SymbolTable());
      let property = properties.get(name);
      if (!property) {
        property = createUnionOrIntersectionProperty(type, name);
        if (property) properties.set(name, property);
      }
      return property;
    }
    propertyOfUnionOrIntersectionType(type: UnionOrIntersectionType, name: qu.__String): Symbol | undefined {
      const property = getUnionOrIntersectionProperty(type, name);
      return property && !(getCheckFlags(property) & qt.CheckFlags.ReadPartial) ? property : undefined;
    }
    reducedType(type: qt.Type): qt.Type {
      if (type.flags & qt.TypeFlags.Union && (<UnionType>type).objectFlags & ObjectFlags.ContainsIntersections)
        return (<UnionType>type).resolvedReducedType || ((<UnionType>type).resolvedReducedType = getReducedUnionType(<UnionType>type));
      else if (type.flags & qt.TypeFlags.Intersection) {
        if (!((<IntersectionType>type).objectFlags & ObjectFlags.IsNeverIntersectionComputed)) {
          (<IntersectionType>type).objectFlags |=
            ObjectFlags.IsNeverIntersectionComputed | (some(getPropertiesOfUnionOrIntersectionType(<IntersectionType>type), isNeverReducedProperty) ? ObjectFlags.IsNeverIntersection : 0);
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
    propertyOfType(type: qt.Type, name: qu.__String): Symbol | undefined {
      type = getReducedApparentType(type);
      if (type.flags & qt.TypeFlags.Object) {
        const resolved = resolveStructuredTypeMembers(<ObjectType>type);
        const symbol = resolved.members.get(name);
        if (symbol && symbolIsValue(symbol)) return symbol;
        const functionType =
          resolved === anyFunctionType ? globalFunctionType : resolved.callSignatures.length ? globalCallableFunctionType : resolved.constructSignatures.length ? globalNewableFunctionType : undefined;
        if (functionType) {
          const symbol = getPropertyOfObjectType(functionType, name);
          if (symbol) return symbol;
        }
        return getPropertyOfObjectType(globalObjectType, name);
      }
      if (type.flags & qt.TypeFlags.UnionOrIntersection) return getPropertyOfUnionOrIntersectionType(<UnionOrIntersectionType>type, name);
      return;
    }
    signaturesOfStructuredType(type: qt.Type, kind: SignatureKind): readonly Signature[] {
      if (type.flags & qt.TypeFlags.StructuredType) {
        const resolved = resolveStructuredTypeMembers(<ObjectType>type);
        return kind === SignatureKind.Call ? resolved.callSignatures : resolved.constructSignatures;
      }
      return empty;
    }
    signaturesOfType(type: qt.Type, kind: SignatureKind): readonly Signature[] {
      return getSignaturesOfStructuredType(getReducedApparentType(type), kind);
    }
    indexInfoOfStructuredType(type: qt.Type, kind: IndexKind): IndexInfo | undefined {
      if (type.flags & qt.TypeFlags.StructuredType) {
        const resolved = resolveStructuredTypeMembers(<ObjectType>type);
        return kind === qt.IndexKind.String ? resolved.stringIndexInfo : resolved.numberIndexInfo;
      }
    }
    indexTypeOfStructuredType(type: qt.Type, kind: IndexKind): qt.Type | undefined {
      const info = getIndexInfoOfStructuredType(type, kind);
      return info && info.type;
    }
    indexInfoOfType(type: qt.Type, kind: IndexKind): IndexInfo | undefined {
      return getIndexInfoOfStructuredType(getReducedApparentType(type), kind);
    }
    indexTypeOfType(type: qt.Type, kind: IndexKind): qt.Type | undefined {
      return this.indexTypeOfStructuredType(getReducedApparentType(type), kind);
    }
    implicitIndexTypeOfType(type: qt.Type, kind: IndexKind): qt.Type | undefined {
      if (qf.is.objectTypeWithInferableIndex(type)) {
        const propTypes: qt.Type[] = [];
        for (const prop of this.propertiesOfType(type)) {
          if (kind === qt.IndexKind.String || NumericLiteral.name(prop.escName)) propTypes.push(this.typeOfSymbol(prop));
        }
        if (kind === qt.IndexKind.String) append(propTypes, this.indexTypeOfType(type, qt.IndexKind.Number));
        if (propTypes.length) return this.unionType(propTypes);
      }
      return;
    }
    typeParametersFromDeclaration(declaration: DeclarationWithTypeParameters): TypeParameter[] | undefined {
      let result: TypeParameter[] | undefined;
      for (const n of this.effectiveTypeParameterDeclarations(declaration)) {
        result = appendIfUnique(result, getDeclaredTypeOfTypeParameter(n.symbol));
      }
      return result;
    }
    minTypeArgumentCount(typeParameters: readonly TypeParameter[] | undefined): number {
      let minTypeArgumentCount = 0;
      if (typeParameters) {
        for (let i = 0; i < typeParameters.length; i++) {
          if (!hasTypeParameterDefault(typeParameters[i])) minTypeArgumentCount = i + 1;
        }
      }
      return minTypeArgumentCount;
    }
    signatureFromDeclaration(declaration: SignatureDeclaration | DocSignature): Signature {
      const links = getNodeLinks(declaration);
      if (!links.resolvedSignature) {
        const parameters: Symbol[] = [];
        let flags = SignatureFlags.None;
        let minArgumentCount = 0;
        let thisParameter: Symbol | undefined;
        let hasThisParameter = false;
        const iife = this.immediatelyInvokedFunctionExpression(declaration);
        const isJSConstructSignature = qc.isDoc.constructSignature(declaration);
        const isUntypedSignatureInJSFile =
          !iife && qf.is.inJSFile(declaration) && qf.is.valueSignatureDeclaration(declaration) && !qc.getDoc.withParameterTags(declaration) && !qc.getDoc.type(declaration);
        if (isUntypedSignatureInJSFile) flags |= SignatureFlags.IsUntypedSignatureInJSFile;
        for (let i = isJSConstructSignature ? 1 : 0; i < declaration.parameters.length; i++) {
          const param = declaration.parameters[i];
          let paramSymbol = param.symbol;
          const type = param.kind === Syntax.DocParameterTag ? param.typeExpression && param.typeExpression.type : param.type;
          if (paramSymbol && !!(paramSymbol.flags & qt.SymbolFlags.Property) && !param.name.kind === Syntax.BindingPattern) {
            const resolvedSymbol = resolveName(param, paramSymbol.escName, qt.SymbolFlags.Value, undefined, undefined, false);
            paramSymbol = resolvedSymbol!;
          }
          if (i === 0 && paramSymbol.escName === InternalSymbol.This) {
            hasThisParameter = true;
            thisParameter = param.symbol;
          } else {
            parameters.push(paramSymbol);
          }
          if (type && type.kind === Syntax.LiteralTyping) flags |= SignatureFlags.HasLiteralTypes;
          const isOptionalParameter =
            qf.is.optionalDocParameterTag(param) ||
            param.initer ||
            param.questionToken ||
            param.dot3Token ||
            (iife && parameters.length > iife.arguments.length && !type) ||
            qf.is.docOptionalParameter(param);
          if (!isOptionalParameter) minArgumentCount = parameters.length;
        }
        if ((declaration.kind === Syntax.GetAccessor || declaration.kind === Syntax.SetAccessor) && !hasNonBindableDynamicName(declaration) && (!hasThisParameter || !thisParameter)) {
          const otherKind = declaration.kind === Syntax.GetAccessor ? Syntax.SetAccessor : Syntax.GetAccessor;
          const other = getDeclarationOfKind<AccessorDeclaration>(this.symbolOfNode(declaration), otherKind);
          if (other) thisParameter = getAnnotatedAccessorThisNodeKind(ParameterDeclaration, other);
        }
        const classType = declaration.kind === Syntax.Constructor ? getDeclaredTypeOfClassOrInterface(this.mergedSymbol((<ClassDeclaration>declaration.parent).symbol)) : undefined;
        const typeParameters = classType ? classType.localTypeParameters : getTypeParametersFromDeclaration(declaration);
        if (qf.has.restParameter(declaration) || (qf.is.inJSFile(declaration) && maybeAddJsSyntheticRestParameter(declaration, parameters))) flags |= SignatureFlags.HasRestParameter;
        links.resolvedSignature = createSignature(declaration, typeParameters, thisParameter, parameters, undefined, undefined, minArgumentCount, flags);
      }
      return links.resolvedSignature;
    }
    signatureOfTypeTag(n: SignatureDeclaration | DocSignature) {
      if (!(qf.is.inJSFile(n) && qf.is.functionLikeDeclaration(n))) return;
      const typeTag = qc.getDoc.typeTag(n);
      const signature = typeTag && typeTag.typeExpression && getSingleCallSignature(this.typeFromTypeNode(typeTag.typeExpression));
      return signature && getErasedSignature(signature);
    }
    returnTypeOfTypeTag(n: SignatureDeclaration | DocSignature) {
      const signature = getSignatureOfTypeTag(n);
      return signature && this.returnTypeOfSignature(signature);
    }
    signaturesOfSymbol(symbol: Symbol | undefined): Signature[] {
      if (!symbol) return empty;
      const result: Signature[] = [];
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
    thisTypeOfSignature(signature: Signature): qt.Type | undefined {
      if (signature.thisParameter) return this.typeOfSymbol(signature.thisParameter);
    }
    typePredicateOfSignature(signature: Signature): TypePredicate | undefined {
      if (!signature.resolvedTypePredicate) {
        if (signature.target) {
          const targetTypePredicate = getTypePredicateOfSignature(signature.target);
          signature.resolvedTypePredicate = targetTypePredicate ? instantiateTypePredicate(targetTypePredicate, signature.mapper!) : noTypePredicate;
        } else if (signature.unionSignatures) {
          signature.resolvedTypePredicate = this.unionTypePredicate(signature.unionSignatures) || noTypePredicate;
        } else {
          const type = signature.declaration && this.effectiveReturnTypeNode(signature.declaration);
          let jsdocPredicate: TypePredicate | undefined;
          if (!type && qf.is.inJSFile(signature.declaration)) {
            const jsdocSignature = getSignatureOfTypeTag(signature.declaration!);
            if (jsdocSignature && signature !== jsdocSignature) jsdocPredicate = getTypePredicateOfSignature(jsdocSignature);
          }
          signature.resolvedTypePredicate = type && type.kind === Syntax.TypingPredicate ? createTypePredicateFromTypingPredicate(type, signature) : jsdocPredicate || noTypePredicate;
        }
        qu.assert(!!signature.resolvedTypePredicate);
      }
      return signature.resolvedTypePredicate === noTypePredicate ? undefined : signature.resolvedTypePredicate;
    }
    returnTypeOfSignature(signature: Signature): qt.Type {
      if (!signature.resolvedReturnType) {
        if (!pushTypeResolution(signature, TypeSystemPropertyName.ResolvedReturnType)) return errorType;
        let type = signature.target
          ? instantiateType(this.returnTypeOfSignature(signature.target), signature.mapper)
          : signature.unionSignatures
          ? this.unionType(map(signature.unionSignatures, this.returnTypeOfSignature), UnionReduction.Subtype)
          : getReturnTypeFromAnnotation(signature.declaration!) ||
            (qf.is.missing((<FunctionLikeDeclaration>signature.declaration).body) ? anyType : getReturnTypeFromBody(<FunctionLikeDeclaration>signature.declaration));
        if (signature.flags & SignatureFlags.IsInnerCallChain) type = addOptionalTypeMarker(type);
        else if (signature.flags & SignatureFlags.IsOuterCallChain) {
          type = getOptionalType(type);
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
    returnTypeFromAnnotation(declaration: SignatureDeclaration | DocSignature) {
      if (declaration.kind === Syntax.Constructor) return getDeclaredTypeOfClassOrInterface(this.mergedSymbol((<ClassDeclaration>declaration.parent).symbol));
      if (qc.isDoc.constructSignature(declaration)) return this.typeFromTypeNode((declaration.parameters[0] as ParameterDeclaration).type!);
      const typeNode = this.effectiveReturnTypeNode(declaration);
      if (typeNode) return this.typeFromTypeNode(typeNode);
      if (declaration.kind === Syntax.GetAccessor && !hasNonBindableDynamicName(declaration)) {
        const docType = qf.is.inJSFile(declaration) && getTypeForDeclarationFromDocComment(declaration);
        if (docType) return docType;
        const setter = getDeclarationOfKind<AccessorDeclaration>(this.symbolOfNode(declaration), Syntax.SetAccessor);
        const setterType = getAnnotatedAccessorType(setter);
        if (setterType) return setterType;
      }
      return getReturnTypeOfTypeTag(declaration);
    }
    restTypeOfSignature(signature: Signature): qt.Type {
      return tryGetRestTypeOfSignature(signature) || anyType;
    }
    signatureInstantiation(signature: Signature, typeArguments: qt.Type[] | undefined, isJavascript: boolean, inferredTypeParameters?: readonly TypeParameter[]): Signature {
      const instantiatedSignature = getSignatureInstantiationWithoutFillingInTypeArguments(
        signature,
        fillMissingTypeArguments(typeArguments, signature.typeParameters, getMinTypeArgumentCount(signature.typeParameters), isJavascript)
      );
      if (inferredTypeParameters) {
        const returnSignature = getSingleCallOrConstructSignature(this.returnTypeOfSignature(instantiatedSignature));
        if (returnSignature) {
          const newReturnSignature = cloneSignature(returnSignature);
          newReturnSignature.typeParameters = inferredTypeParameters;
          const newInstantiatedSignature = cloneSignature(instantiatedSignature);
          newInstantiatedSignature.resolvedReturnType = getOrCreateTypeFromSignature(newReturnSignature);
          return newInstantiatedSignature;
        }
      }
      return instantiatedSignature;
    }
    signatureInstantiationWithoutFillingInTypeArguments(signature: Signature, typeArguments: readonly qt.Type[] | undefined): Signature {
      const instantiations = signature.instantiations || (signature.instantiations = new qu.QMap<Signature>());
      const id = getTypeListId(typeArguments);
      let instantiation = instantiations.get(id);
      if (!instantiation) instantiations.set(id, (instantiation = createSignatureInstantiation(signature, typeArguments)));
      return instantiation;
    }
    erasedSignature(signature: Signature): Signature {
      return signature.typeParameters ? signature.erasedSignatureCache || (signature.erasedSignatureCache = createErasedSignature(signature)) : signature;
    }
    canonicalSignature(signature: Signature): Signature {
      return signature.typeParameters ? signature.canonicalSignatureCache || (signature.canonicalSignatureCache = createCanonicalSignature(signature)) : signature;
    }
    baseSignature(signature: Signature) {
      const typeParameters = signature.typeParameters;
      if (typeParameters) {
        const typeEraser = createTypeEraser(typeParameters);
        const baseConstraints = map(typeParameters, (tp) => instantiateType(getBaseConstraintOfType(tp), typeEraser) || unknownType);
        return instantiateSignature(signature, createTypeMapper(typeParameters, baseConstraints), true);
      }
      return signature;
    }
    orCreateTypeFromSignature(signature: Signature): ObjectType {
      if (!signature.isolatedSignatureType) {
        const kind = signature.declaration ? signature.declaration.kind : Syntax.Unknown;
        const isConstructor = kind === Syntax.Constructor || kind === Syntax.ConstructSignature || kind === Syntax.ConstructorTyping;
        const type = createObjectType(ObjectFlags.Anonymous);
        type.members = emptySymbols;
        type.properties = empty;
        type.callSignatures = !isConstructor ? [signature] : empty;
        type.constructSignatures = isConstructor ? [signature] : empty;
        signature.isolatedSignatureType = type;
      }
      return signature.isolatedSignatureType;
    }
    constraintDeclaration(type: TypeParameter): Typing | undefined {
      return mapDefined(filter(type.symbol && type.symbol.declarations, isTypeParameterDeclaration), getEffectiveConstraintOfTypeParameter)[0];
    }
    inferredTypeParameterConstraint(typeParameter: TypeParameter) {
      let inferences: qt.Type[] | undefined;
      if (typeParameter.symbol) {
        for (const declaration of typeParameter.symbol.declarations) {
          if (declaration.parent.kind === Syntax.InferTyping) {
            const grandParent = declaration.parent.parent;
            if (grandParent.kind === Syntax.TypingReference) {
              const typeReference = <TypingReference>grandParent;
              const typeParameters = getTypeParametersForTypeReference(typeReference);
              if (typeParameters) {
                const index = typeReference.typeArguments!.indexOf(<Typing>declaration.parent);
                if (index < typeParameters.length) {
                  const declaredConstraint = getConstraintOfTypeParameter(typeParameters[index]);
                  if (declaredConstraint) {
                    const mapper = createTypeMapper(typeParameters, getEffectiveTypeArguments(typeReference, typeParameters));
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
      return inferences && getIntersectionType(inferences);
    }
    constraintFromTypeParameter(typeParameter: TypeParameter): qt.Type | undefined {
      if (!typeParameter.constraint) {
        if (typeParameter.target) {
          const targetConstraint = getConstraintOfTypeParameter(typeParameter.target);
          typeParameter.constraint = targetConstraint ? instantiateType(targetConstraint, typeParameter.mapper) : noConstraintType;
        } else {
          const constraintDeclaration = getConstraintDeclaration(typeParameter);
          if (!constraintDeclaration) typeParameter.constraint = getInferredTypeParameterConstraint(typeParameter) || noConstraintType;
          else {
            let type = this.typeFromTypeNode(constraintDeclaration);
            if (type.flags & qt.TypeFlags.Any && type !== errorType) type = constraintDeclaration.parent.parent.kind === Syntax.MappedTyping ? keyofConstraintType : unknownType;
            typeParameter.constraint = type;
          }
        }
      }
      return typeParameter.constraint === noConstraintType ? undefined : typeParameter.constraint;
    }
    parentSymbolOfTypeParameter(typeParameter: TypeParameter): Symbol | undefined {
      const tp = getDeclarationOfKind<TypeParameterDeclaration>(typeParameter.symbol, Syntax.TypeParameter)!;
      const host = tp.parent.kind === Syntax.DocTemplateTag ? this.hostSignatureFromDoc(tp.parent) : tp.parent;
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
        if (!(type.flags & excludeKinds)) result |= getObjectFlags(type);
      }
      return result & ObjectFlags.PropagatingFlags;
    }
    typeArguments(type: TypeReference): readonly qt.Type[] {
      if (!type.resolvedTypeArguments) {
        if (!pushTypeResolution(type, TypeSystemPropertyName.ResolvedTypeArguments)) return type.target.localTypeParameters?.map(() => errorType) || empty;
        const n = type.node;
        const typeArguments = !n
          ? empty
          : n.kind === Syntax.TypingReference
          ? concatenate(type.target.outerTypeParameters, getEffectiveTypeArguments(n, type.target.localTypeParameters!))
          : n.kind === Syntax.ArrayTyping
          ? [this.typeFromTypeNode(n.elemType)]
          : map(n.elems, this.typeFromTypeNode);
        if (popTypeResolution()) type.resolvedTypeArguments = type.mapper ? instantiateTypes(typeArguments, type.mapper) : typeArguments;
        else {
          type.resolvedTypeArguments = type.target.localTypeParameters?.map(() => errorType) || empty;
          error(
            type.node || currentNode,
            type.target.symbol ? qd.msgs.Type_arguments_for_0_circularly_reference_themselves : qd.msgs.Tuple_type_arguments_circularly_reference_themselves,
            type.target.symbol && type.target.symbol.symbolToString()
          );
        }
      }
      return type.resolvedTypeArguments;
    }
    typeReferenceArity(type: TypeReference): number {
      return length(type.target.typeParameters);
    }
    typeFromClassOrInterfaceReference(n: WithArgumentsTobj, symbol: Symbol): qt.Type {
      const type = <InterfaceType>getDeclaredTypeOfSymbol(this.mergedSymbol(symbol));
      const typeParameters = type.localTypeParameters;
      if (typeParameters) {
        const numTypeArguments = length(n.typeArguments);
        const minTypeArgumentCount = getMinTypeArgumentCount(typeParameters);
        const isJs = qf.is.inJSFile(n);
        const isJsImplicitAny = !noImplicitAny && isJs;
        if (!isJsImplicitAny && (numTypeArguments < minTypeArgumentCount || numTypeArguments > typeParameters.length)) {
          const missingAugmentsTag = isJs && n.kind === Syntax.ExpressionWithTypings && !n.parent.kind === Syntax.DocAugmentsTag;
          const diag =
            minTypeArgumentCount === typeParameters.length
              ? missingAugmentsTag
                ? qd.msgs.Expected_0_type_arguments_provide_these_with_an_extends_tag
                : qd.msgs.Generic_type_0_requires_1_type_argument_s
              : missingAugmentsTag
              ? qd.msgs.Expected_0_1_type_arguments_provide_these_with_an_extends_tag
              : qd.msgs.Generic_type_0_requires_between_1_and_2_type_arguments;
          const typeStr = typeToString(type, undefined, TypeFormatFlags.WriteArrayAsGenericType);
          error(n, diag, typeStr, minTypeArgumentCount, typeParameters.length);
          if (!isJs) return errorType;
        }
        if (n.kind === Syntax.TypingReference && isDeferredTypingReference(<TypingReference>n, length(n.typeArguments) !== typeParameters.length))
          return createDeferredTypeReference(<GenericType>type, <TypingReference>n, undefined);
        const typeArguments = concatenate(type.outerTypeParameters, fillMissingTypeArguments(typeArgumentsFromTypingReference(n), typeParameters, minTypeArgumentCount, isJs));
        return createTypeReference(<GenericType>type, typeArguments);
      }
      return check.noTypeArguments(n, symbol) ? type : errorType;
    }
    typeAliasInstantiation(symbol: Symbol, typeArguments: readonly qt.Type[] | undefined): qt.Type {
      const type = getDeclaredTypeOfSymbol(symbol);
      const links = s.getLinks(symbol);
      const typeParameters = links.typeParameters!;
      const id = getTypeListId(typeArguments);
      let instantiation = links.instantiations!.get(id);
      if (!instantiation) {
        links.instantiations!.set(
          id,
          (instantiation = instantiateType(
            type,
            createTypeMapper(typeParameters, fillMissingTypeArguments(typeArguments, typeParameters, getMinTypeArgumentCount(typeParameters), qf.is.inJSFile(symbol.valueDeclaration)))
          ))
        );
      }
      return instantiation;
    }
    typeFromTypeAliasReference(n: WithArgumentsTobj, symbol: Symbol): qt.Type {
      const type = getDeclaredTypeOfSymbol(symbol);
      const typeParameters = s.getLinks(symbol).typeParameters;
      if (typeParameters) {
        const numTypeArguments = length(n.typeArguments);
        const minTypeArgumentCount = getMinTypeArgumentCount(typeParameters);
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
      return check.noTypeArguments(n, symbol) ? type : errorType;
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
      symbol = symbol.getExpandoSymbol() || symbol;
      if (symbol.flags & (SymbolFlags.Class | qt.SymbolFlags.Interface)) return getTypeFromClassOrInterfaceReference(n, symbol);
      if (symbol.flags & qt.SymbolFlags.TypeAlias) return getTypeFromTypeAliasReference(n, symbol);
      const res = tryGetDeclaredTypeOfSymbol(symbol);
      if (res) return check.noTypeArguments(n, symbol) ? getRegularTypeOfLiteralType(res) : errorType;
      if (symbol.flags & qt.SymbolFlags.Value && isDocTypeReference(n)) {
        const jsdocType = getTypeFromDocValueReference(n, symbol);
        if (jsdocType) return jsdocType;
        resolveTypeReferenceName(getTypeReferenceName(n), qt.SymbolFlags.Type);
        return this.this.typeOfSymbol();
      }
      return errorType;
    }
    typeFromDocValueReference(n: WithArgumentsTobj, symbol: Symbol): qt.Type | undefined {
      const links = getNodeLinks(n);
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
          if (valueType.symbol && (isRequireAlias || isImportTypeWithQualifier)) typeType = getTypeReferenceType(n, valueType.symbol);
        }
        links.resolvedDocType = typeType;
      }
      return links.resolvedDocType;
    }
    substitutionType(baseType: qt.Type, substitute: qt.Type) {
      if (substitute.flags & qt.TypeFlags.AnyOrUnknown || substitute === baseType) return baseType;
      const id = `${getTypeId(baseType)}>${getTypeId(substitute)}`;
      const cached = substitutionTypes.get(id);
      if (cached) return cached;
      const result = <SubstitutionType>createType(TypeFlags.Substitution);
      result.baseType = baseType;
      result.substitute = substitute;
      substitutionTypes.set(id, result);
      return result;
    }
    impliedConstraint(type: qt.Type, checkNode: Typing, extendsNode: Typing): qt.Type | undefined {
      return isUnaryTupleTyping(checkNode) && isUnaryTupleTyping(extendsNode)
        ? getImpliedConstraint(type, (<TupleTyping>checkNode).elems[0], (<TupleTyping>extendsNode).elems[0])
        : getActualTypeVariable(this.typeFromTypeNode(checkNode)) === type
        ? this.typeFromTypeNode(extendsNode)
        : undefined;
    }
    conditionalFlowTypeOfType(type: qt.Type, n: Node) {
      let constraints: qt.Type[] | undefined;
      while (n && !qf.is.statement(n) && n.kind !== Syntax.DocComment) {
        const parent = n.parent;
        if (parent.kind === Syntax.ConditionalTyping && n === (<ConditionalTyping>parent).trueType) {
          const constraint = getImpliedConstraint(type, (<ConditionalTyping>parent).checkType, (<ConditionalTyping>parent).extendsType);
          if (constraint) constraints = append(constraints, constraint);
        }
        n = parent;
      }
      return constraints ? getSubstitutionType(type, getIntersectionType(append(constraints, type))) : type;
    }
    intendedTypeFromDocTypeReference(n: qt.TypingReference): qt.Type | undefined {
      if (n.typeName.kind === Syntax.Identifier) {
        const typeArgs = n.typeArguments;
        switch (n.typeName.escapedText) {
          case 'String':
            check.noTypeArguments(n);
            return stringType;
          case 'Number':
            check.noTypeArguments(n);
            return numberType;
          case 'Boolean':
            check.noTypeArguments(n);
            return booleanType;
          case 'Void':
            check.noTypeArguments(n);
            return voidType;
          case 'Undefined':
            check.noTypeArguments(n);
            return undefinedType;
          case 'Null':
            check.noTypeArguments(n);
            return nullType;
          case 'Function':
          case 'function':
            check.noTypeArguments(n);
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
            check.noTypeArguments(n);
            return !noImplicitAny ? anyType : undefined;
        }
      }
    }
    typeFromDocNullableTypingNode(n: DocNullableTyping) {
      const type = this.typeFromTypeNode(n.type);
      return strictNullChecks ? getNullableType(type, qt.TypeFlags.Null) : type;
    }
    typeFromTypeReference(n: TypeReferenceType): qt.Type {
      const links = getNodeLinks(n);
      if (!links.resolvedType) {
        if (qf.is.constTypeReference(n) && qf.is.assertionExpression(n.parent)) {
          links.resolvedSymbol = unknownSymbol;
          return (links.resolvedType = check.expressionCached(n.parent.expression));
        }
        let symbol: Symbol | undefined;
        let type: qt.Type | undefined;
        const meaning = qt.SymbolFlags.Type;
        if (isDocTypeReference(n)) {
          type = getIntendedTypeFromDocTypeReference(n);
          if (!type) {
            symbol = resolveTypeReferenceName(getTypeReferenceName(n), meaning, true);
            if (symbol === unknownSymbol) symbol = resolveTypeReferenceName(getTypeReferenceName(n), meaning | qt.SymbolFlags.Value);
            else {
              resolveTypeReferenceName(getTypeReferenceName(n), meaning);
            }
            type = getTypeReferenceType(n, symbol);
          }
        }
        if (!type) {
          symbol = resolveTypeReferenceName(getTypeReferenceName(n), meaning);
          type = getTypeReferenceType(n, symbol);
        }
        links.resolvedSymbol = symbol;
        links.resolvedType = type;
      }
      return links.resolvedType;
    }
    typeFromTypingQuery(n: TypingQuery): qt.Type {
      const links = getNodeLinks(n);
      if (!links.resolvedType) links.resolvedType = getRegularTypeOfLiteralType(this.widenedType(check.expression(n.exprName)));
      return links.resolvedType;
    }
    typeOfGlobalSymbol(symbol: Symbol | undefined, arity: number): ObjectType {
      function getTypeDeclaration(symbol: Symbol): Declaration | undefined {
        const declarations = symbol.declarations;
        for (const declaration of declarations) {
          switch (declaration.kind) {
            case Syntax.ClassDeclaration:
            case Syntax.InterfaceDeclaration:
            case Syntax.EnumDeclaration:
              return declaration;
          }
        }
      }
      if (!symbol) return arity ? emptyGenericType : emptyObjectType;
      const type = getDeclaredTypeOfSymbol(symbol);
      if (!(type.flags & qt.TypeFlags.Object)) {
        error(getTypeDeclaration(symbol), qd.msgs.Global_type_0_must_be_a_class_or_interface_type, symbol.name);
        return arity ? emptyGenericType : emptyObjectType;
      }
      if (length((<InterfaceType>type).typeParameters) !== arity) {
        error(getTypeDeclaration(symbol), qd.msgs.Global_type_0_must_have_1_type_parameter_s, symbol.name, arity);
        return arity ? emptyGenericType : emptyObjectType;
      }
      return <ObjectType>type;
    }
    globalValueSymbol(name: qu.__String, reportErrors: boolean): Symbol | undefined {
      return getGlobalSymbol(name, qt.SymbolFlags.Value, reportErrors ? qd.msgs.Cannot_find_global_value_0 : undefined);
    }
    globalTypeSymbol(name: qu.__String, reportErrors: boolean): Symbol | undefined {
      return getGlobalSymbol(name, qt.SymbolFlags.Type, reportErrors ? qd.msgs.Cannot_find_global_type_0 : undefined);
    }
    globalSymbol(name: qu.__String, meaning: qt.SymbolFlags, diagnostic: qd.Message | undefined): Symbol | undefined {
      return resolveName(undefined, name, meaning, diagnostic, name, false);
    }
    globalType(name: qu.__String, arity: 0, reportErrors: boolean): ObjectType;
    globalType(name: qu.__String, arity: number, reportErrors: boolean): GenericType;
    globalType(name: qu.__String, arity: number, reportErrors: boolean): ObjectType | undefined {
      const symbol = getGlobalTypeSymbol(name, reportErrors);
      return symbol || reportErrors ? getTypeOfGlobalSymbol(symbol, arity) : undefined;
    }
    globalTypedPropertyDescriptorType() {
      return deferredGlobalTypedPropertyDescriptorType || (deferredGlobalTypedPropertyDescriptorType = getGlobalType('TypedPropertyDescriptor' as qu.__String, 1, true)) || emptyGenericType;
    }
    globalTemplateStringsArrayType() {
      return deferredGlobalTemplateStringsArrayType || (deferredGlobalTemplateStringsArrayType = getGlobalType('TemplateStringsArray' as qu.__String, 0, true)) || emptyObjectType;
    }
    globalImportMetaType() {
      return deferredGlobalImportMetaType || (deferredGlobalImportMetaType = getGlobalType('ImportMeta' as qu.__String, 0, true)) || emptyObjectType;
    }
    globalESSymbolConstructorSymbol(reportErrors: boolean) {
      return deferredGlobalESSymbolConstructorSymbol || (deferredGlobalESSymbolConstructorSymbol = getGlobalValueSymbol('Symbol' as qu.__String, reportErrors));
    }
    globalESSymbolType(reportErrors: boolean) {
      return deferredGlobalESSymbolType || (deferredGlobalESSymbolType = getGlobalType('Symbol' as qu.__String, 0, reportErrors)) || emptyObjectType;
    }
    globalPromiseType(reportErrors: boolean) {
      return deferredGlobalPromiseType || (deferredGlobalPromiseType = getGlobalType('Promise' as qu.__String, 1, reportErrors)) || emptyGenericType;
    }
    globalPromiseLikeType(reportErrors: boolean) {
      return deferredGlobalPromiseLikeType || (deferredGlobalPromiseLikeType = getGlobalType('PromiseLike' as qu.__String, 1, reportErrors)) || emptyGenericType;
    }
    globalPromiseConstructorSymbol(reportErrors: boolean): Symbol | undefined {
      return deferredGlobalPromiseConstructorSymbol || (deferredGlobalPromiseConstructorSymbol = getGlobalValueSymbol('Promise' as qu.__String, reportErrors));
    }
    globalPromiseConstructorLikeType(reportErrors: boolean) {
      return deferredGlobalPromiseConstructorLikeType || (deferredGlobalPromiseConstructorLikeType = getGlobalType('PromiseConstructorLike' as qu.__String, 0, reportErrors)) || emptyObjectType;
    }
    globalAsyncIterableType(reportErrors: boolean) {
      return deferredGlobalAsyncIterableType || (deferredGlobalAsyncIterableType = getGlobalType('AsyncIterable' as qu.__String, 1, reportErrors)) || emptyGenericType;
    }
    globalAsyncIteratorType(reportErrors: boolean) {
      return deferredGlobalAsyncIteratorType || (deferredGlobalAsyncIteratorType = getGlobalType('AsyncIterator' as qu.__String, 3, reportErrors)) || emptyGenericType;
    }
    globalAsyncIterableIteratorType(reportErrors: boolean) {
      return deferredGlobalAsyncIterableIteratorType || (deferredGlobalAsyncIterableIteratorType = getGlobalType('AsyncIterableIterator' as qu.__String, 1, reportErrors)) || emptyGenericType;
    }
    globalAsyncGeneratorType(reportErrors: boolean) {
      return deferredGlobalAsyncGeneratorType || (deferredGlobalAsyncGeneratorType = getGlobalType('AsyncGenerator' as qu.__String, 3, reportErrors)) || emptyGenericType;
    }
    globalIterableType(reportErrors: boolean) {
      return deferredGlobalIterableType || (deferredGlobalIterableType = getGlobalType('Iterable' as qu.__String, 1, reportErrors)) || emptyGenericType;
    }
    globalIteratorType(reportErrors: boolean) {
      return deferredGlobalIteratorType || (deferredGlobalIteratorType = getGlobalType('Iterator' as qu.__String, 3, reportErrors)) || emptyGenericType;
    }
    globalIterableIteratorType(reportErrors: boolean) {
      return deferredGlobalIterableIteratorType || (deferredGlobalIterableIteratorType = getGlobalType('IterableIterator' as qu.__String, 1, reportErrors)) || emptyGenericType;
    }
    globalGeneratorType(reportErrors: boolean) {
      return deferredGlobalGeneratorType || (deferredGlobalGeneratorType = getGlobalType('Generator' as qu.__String, 3, reportErrors)) || emptyGenericType;
    }
    globalIteratorYieldResultType(reportErrors: boolean) {
      return deferredGlobalIteratorYieldResultType || (deferredGlobalIteratorYieldResultType = getGlobalType('IteratorYieldResult' as qu.__String, 1, reportErrors)) || emptyGenericType;
    }
    globalIteratorReturnResultType(reportErrors: boolean) {
      return deferredGlobalIteratorReturnResultType || (deferredGlobalIteratorReturnResultType = getGlobalType('IteratorReturnResult' as qu.__String, 1, reportErrors)) || emptyGenericType;
    }
    globalTypeOrUndefined(name: qu.__String, arity = 0): ObjectType | undefined {
      const symbol = getGlobalSymbol(name, qt.SymbolFlags.Type, undefined);
      return symbol && <GenericType>getTypeOfGlobalSymbol(symbol, arity);
    }
    globalExtractSymbol(): Symbol {
      return deferredGlobalExtractSymbol || (deferredGlobalExtractSymbol = getGlobalSymbol('Extract' as qu.__String, qt.SymbolFlags.TypeAlias, qd.msgs.Cannot_find_global_type_0)!);
    }
    globalOmitSymbol(): Symbol {
      return deferredGlobalOmitSymbol || (deferredGlobalOmitSymbol = getGlobalSymbol('Omit' as qu.__String, qt.SymbolFlags.TypeAlias, qd.msgs.Cannot_find_global_type_0)!);
    }
    globalBigIntType(reportErrors: boolean) {
      return deferredGlobalBigIntType || (deferredGlobalBigIntType = getGlobalType('BigInt' as qu.__String, 0, reportErrors)) || emptyObjectType;
    }
    arrayOrTupleTargetType(n: ArrayTyping | TupleTyping): GenericType {
      const readonly = isReadonlyTypeOperator(n.parent);
      if (n.kind === Syntax.ArrayTyping || (n.elems.length === 1 && isTupleRestElem(n.elems[0]))) return readonly ? globalReadonlyArrayType : globalArrayType;
      const lastElem = lastOrUndefined(n.elems);
      const restElem = lastElem && isTupleRestElem(lastElem) ? lastElem : undefined;
      const minLength = findLastIndex(n.elems, (n) => !isTupleOptionalElem(n) && n !== restElem) + 1;
      const missingName = qu.some(n.elems, (e) => e.kind !== Syntax.NamedTupleMember);
      return getTupleTypeOfArity(n.elems.length, minLength, !!restElem, readonly, missingName ? undefined : (n.elems as readonly NamedTupleMember[]));
    }
    typeFromArrayOrTupleTyping(n: ArrayTyping | TupleTyping): qt.Type {
      const links = getNodeLinks(n);
      if (!links.resolvedType) {
        const target = getArrayOrTupleTargetType(n);
        if (target === emptyGenericType) links.resolvedType = emptyObjectType;
        else if (isDeferredTypingReference(n)) {
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
      return strictNullChecks ? getOptionalType(type) : type;
    }
    typeId(type: qt.Type) {
      return type.id;
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
    unionTypePredicate(signatures: readonly Signature[]): TypePredicate | undefined {
      let first: TypePredicate | undefined;
      const types: qt.Type[] = [];
      for (const sig of signatures) {
        const pred = getTypePredicateOfSignature(sig);
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
      const id = getTypeListId(types);
      let type = unionTypes.get(id);
      if (!type) {
        type = <UnionType>createType(TypeFlags.Union);
        unionTypes.set(id, type);
        type.objectFlags = objectFlags | getPropagatingFlagsOfTypes(types, qt.TypeFlags.Nullable);
        type.types = types;
        type.aliasSymbol = aliasSymbol;
        type.aliasTypeArguments = aliasTypeArguments;
      }
      return type;
    }
    typeFromUnionTyping(n: UnionTyping): qt.Type {
      const links = getNodeLinks(n);
      if (!links.resolvedType) {
        const aliasSymbol = getAliasSymbolForTypeNode(n);
        links.resolvedType = this.unionType(map(n.types, this.typeFromTypeNode), UnionReduction.Literal, aliasSymbol, getTypeArgumentsForAliasSymbol(aliasSymbol));
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
      const id = getTypeListId(typeSet);
      let result = intersectionTypes.get(id);
      if (!result) {
        if (includes & qt.TypeFlags.Union) {
          if (intersectUnionsOfPrimitiveTypes(typeSet)) result = getIntersectionType(typeSet, aliasSymbol, aliasTypeArguments);
          else if (extractIrreducible(typeSet, qt.TypeFlags.Undefined)) {
            result = this.unionType([getIntersectionType(typeSet), undefinedType], UnionReduction.Literal, aliasSymbol, aliasTypeArguments);
          } else if (extractIrreducible(typeSet, qt.TypeFlags.Null)) {
            result = this.unionType([getIntersectionType(typeSet), nullType], UnionReduction.Literal, aliasSymbol, aliasTypeArguments);
          } else {
            const size = reduceLeft(typeSet, (n, t) => n * (t.flags & qt.TypeFlags.Union ? (<UnionType>t).types.length : 1), 1);
            if (size >= 100000) {
              error(currentNode, qd.msgs.Expression_produces_a_union_type_that_is_too_complex_to_represent);
              return errorType;
            }
            const unionIndex = findIndex(typeSet, (t) => (t.flags & qt.TypeFlags.Union) !== 0);
            const unionType = <UnionType>typeSet[unionIndex];
            result = this.unionType(
              map(unionType.types, (t) => getIntersectionType(replaceElem(typeSet, unionIndex, t))),
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
      const links = getNodeLinks(n);
      if (!links.resolvedType) {
        const aliasSymbol = getAliasSymbolForTypeNode(n);
        links.resolvedType = getIntersectionType(map(n.types, this.typeFromTypeNode), aliasSymbol, getTypeArgumentsForAliasSymbol(aliasSymbol));
      }
      return links.resolvedType;
    }
    indexTypeForGenericType(type: InstantiableType | UnionOrIntersectionType, stringsOnly: boolean) {
      return stringsOnly
        ? type.resolvedStringIndexType || (type.resolvedStringIndexType = createIndexType(type, true))
        : type.resolvedIndexType || (type.resolvedIndexType = createIndexType(type, false));
    }
    literalTypeFromPropertyName(name: qt.PropertyName) {
      if (name.kind === Syntax.PrivateIdentifier) return neverType;
      return name.kind === Syntax.Identifier
        ? this.literalType(qy.get.unescUnderscores(name.escapedText))
        : getRegularTypeOfLiteralType(name.kind === Syntax.ComputedPropertyName ? check.computedPropertyName(name) : check.expression(name));
    }
    bigIntLiteralType(n: BigIntLiteral): LiteralType {
      return this.literalType({
        negative: false,
        base10Value: parsePseudoBigInt(n.text),
      });
    }
    literalTypeFromProperty(prop: Symbol, include: qt.TypeFlags) {
      if (!(getDeclarationModifierFlagsFromSymbol(prop) & ModifierFlags.NonPublicAccessibilityModifier)) {
        let type = s.getLinks(this.lateBoundSymbol(prop)).nameType;
        if (!type && !isKnownSymbol(prop)) {
          if (prop.escName === InternalSymbol.Default) type = this.literalType('default');
          else {
            const name = prop.valueDeclaration && (this.declaration.nameOf(prop.valueDeclaration) as qt.PropertyName);
            type = (name && this.literalTypeFromPropertyName(name)) || this.literalType(prop.name);
          }
        }
        if (type && type.flags & include) return type;
      }
      return neverType;
    }
    literalTypeFromProperties(type: qt.Type, include: qt.TypeFlags) {
      return this.unionType(map(this.propertiesOfType(type), (p) => this.literalTypeFromProperty(p, include)));
    }
    nonEnumNumberIndexInfo(type: qt.Type) {
      const numberIndexInfo = this.indexInfoOfType(type, qt.IndexKind.Number);
      return numberIndexInfo !== enumNumberIndexInfo ? numberIndexInfo : undefined;
    }
    indexType(type: qt.Type, stringsOnly = keyofStringsOnly, noIndexSignatures?: boolean): qt.Type {
      type = getReducedType(type);
      return type.flags & qt.TypeFlags.Union
        ? getIntersectionType(map((<IntersectionType>type).types, (t) => this.indexType(t, stringsOnly, noIndexSignatures)))
        : type.flags & qt.TypeFlags.Intersection
        ? this.unionType(map((<IntersectionType>type).types, (t) => this.indexType(t, stringsOnly, noIndexSignatures)))
        : maybeTypeOfKind(type, qt.TypeFlags.InstantiableNonPrimitive)
        ? this.indexTypeForGenericType(<InstantiableType | UnionOrIntersectionType>type, stringsOnly)
        : getObjectFlags(type) & ObjectFlags.Mapped
        ? filterType(getConstraintTypeFromMappedType(<MappedType>type), (t) => !(noIndexSignatures && t.flags & (TypeFlags.Any | qt.TypeFlags.String)))
        : type === wildcardType
        ? wildcardType
        : type.flags & qt.TypeFlags.Unknown
        ? neverType
        : type.flags & (TypeFlags.Any | qt.TypeFlags.Never)
        ? keyofConstraintType
        : stringsOnly
        ? !noIndexSignatures && this.indexInfoOfType(type, qt.IndexKind.String)
          ? stringType
          : this.literalTypeFromProperties(type, qt.TypeFlags.StringLiteral)
        : !noIndexSignatures && this.indexInfoOfType(type, qt.IndexKind.String)
        ? this.unionType([stringType, numberType, this.literalTypeFromProperties(type, qt.TypeFlags.UniqueESSymbol)])
        : getNonEnumNumberIndexInfo(type)
        ? this.unionType([numberType, this.literalTypeFromProperties(type, qt.TypeFlags.StringLiteral | qt.TypeFlags.UniqueESSymbol)])
        : this.literalTypeFromProperties(type, qt.TypeFlags.StringOrNumberLiteralOrUnique);
    }
    extractStringType(type: qt.Type) {
      if (keyofStringsOnly) return type;
      const extractTypeAlias = getGlobalExtractSymbol();
      return extractTypeAlias ? this.typeAliasInstantiation(extractTypeAlias, [type, stringType]) : stringType;
    }
    indexTypeOrString(type: qt.Type): qt.Type {
      const indexType = getExtractStringType(this.indexType(type));
      return indexType.flags & qt.TypeFlags.Never ? stringType : indexType;
    }
    typeFromTypingOperator(n: TypingOperator): qt.Type {
      const links = getNodeLinks(n);
      if (!links.resolvedType) {
        switch (n.operator) {
          case Syntax.KeyOfKeyword:
            links.resolvedType = this.indexType(this.typeFromTypeNode(n.type));
            break;
          case Syntax.UniqueKeyword:
            links.resolvedType = n.type.kind === Syntax.SymbolKeyword ? getESSymbolLikeTypeForNode(walkUpParenthesizedTypes(n.parent)) : errorType;
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
        ? getPropertyNameFromType(indexType)
        : accessExpression && check.thatExpressionIsProperSymbolReference(accessExpression.argumentExpression, indexType, false)
        ? qu.getPropertyNameForKnownSymbolName(idText((<PropertyAccessExpression>accessExpression.argumentExpression).name))
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
      const propName = accessNode && accessNode.kind === Syntax.PrivateIdentifier ? undefined : getPropertyNameFromIndex(indexType, accessNode);
      if (propName !== undefined) {
        const prop = this.propertyOfType(objectType, propName);
        if (prop) {
          if (accessExpression) {
            markPropertyAsReferenced(prop, accessExpression, accessExpression.expression.kind === Syntax.ThisKeyword);
            if (isAssignmentToReadonlyEntity(accessExpression, prop, this.assignmentTargetKind(accessExpression))) {
              error(accessExpression.argumentExpression, qd.msgs.Cannot_assign_to_0_because_it_is_a_read_only_property, prop.symbolToString());
              return;
            }
            if (accessFlags & AccessFlags.CacheSymbol) getNodeLinks(accessNode!).resolvedSymbol = prop;
            if (isThisPropertyAccessInConstructor(accessExpression, prop)) return autoType;
          }
          const propType = this.typeOfSymbol(prop);
          return accessExpression && this.assignmentTargetKind(accessExpression) !== AssignmentKind.Definite ? this.flowTypeOfReference(accessExpression, propType) : propType;
        }
        if (everyType(objectType, qf.is.tupleType) && NumericLiteral.name(propName) && +propName >= 0) {
          if (accessNode && everyType(objectType, (t) => !(<TupleTypeReference>t).target.hasRestElem) && !(accessFlags & AccessFlags.NoTupleBoundsCheck)) {
            const indexNode = getIndexNodeForAccessExpression(accessNode);
            if (qf.is.tupleType(objectType))
              error(indexNode, qd.msgs.Tuple_type_0_of_length_1_has_no_elem_at_index_2, typeToString(objectType), getTypeReferenceArity(objectType), qy.get.unescUnderscores(propName));
            else {
              error(indexNode, qd.msgs.Property_0_does_not_exist_on_type_1, qy.get.unescUnderscores(propName), typeToString(objectType));
            }
          }
          errorIfWritingToReadonlyIndex(this.indexInfoOfType(objectType, qt.IndexKind.Number));
          return mapType(objectType, (t) => getRestTypeOfTupleType(<TupleTypeReference>t) || undefinedType);
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
            const indexNode = getIndexNodeForAccessExpression(accessNode);
            error(indexNode, qd.msgs.Type_0_cannot_be_used_as_an_index_type, typeToString(indexType));
            return indexInfo.type;
          }
          errorIfWritingToReadonlyIndex(indexInfo);
          return indexInfo.type;
        }
        if (indexType.flags & qt.TypeFlags.Never) return neverType;
        if (isJSLiteralType(objectType)) return anyType;
        if (accessExpression && !isConstEnumObjectType(objectType)) {
          if (
            objectType.symbol === globalThisSymbol &&
            propName !== undefined &&
            globalThisSymbol.exports!.has(propName) &&
            globalThisSymbol.exports!.get(propName)!.flags & qt.SymbolFlags.BlockScoped
          )
            error(accessExpression, qd.msgs.Property_0_does_not_exist_on_type_1, qy.get.unescUnderscores(propName), typeToString(objectType));
          else if (noImplicitAny && !compilerOptions.suppressImplicitAnyIndexErrors && !suppressNoImplicitAnyError) {
            if (propName !== undefined && typeHasStaticProperty(propName, objectType))
              error(accessExpression, qd.msgs.Property_0_is_a_static_member_of_type_1, propName as string, typeToString(objectType));
            else if (this.indexTypeOfType(objectType, qt.IndexKind.Number)) {
              error(accessExpression.argumentExpression, qd.msgs.Elem_implicitly_has_an_any_type_because_index_expression_is_not_of_type_number);
            } else {
              let suggestion: string | undefined;
              if (propName !== undefined && (suggestion = getSuggestionForNonexistentProperty(propName as string, objectType))) {
                if (suggestion !== undefined)
                  error(accessExpression.argumentExpression, qd.msgs.Property_0_does_not_exist_on_type_1_Did_you_mean_2, propName as string, typeToString(objectType), suggestion);
              } else {
                const suggestion = getSuggestionForNonexistentIndexSignature(objectType, accessExpression, indexType);
                if (suggestion !== undefined)
                  error(accessExpression, qd.msgs.Elem_implicitly_has_an_any_type_because_type_0_has_no_index_signature_Did_you_mean_to_call_1, typeToString(objectType), suggestion);
                else {
                  let errorInfo: qd.MessageChain | undefined;
                  if (indexType.flags & qt.TypeFlags.EnumLiteral)
                    errorInfo = chainqd.Messages(undefined, qd.msgs.Property_0_does_not_exist_on_type_1, '[' + typeToString(indexType) + ']', typeToString(objectType));
                  else if (indexType.flags & qt.TypeFlags.UniqueESSymbol) {
                    const symbolName = getFullyQualifiedName((indexType as UniqueESSymbolType).symbol, accessExpression);
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
      if (isJSLiteralType(objectType)) return anyType;
      if (accessNode) {
        const indexNode = getIndexNodeForAccessExpression(accessNode);
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
      function errorIfWritingToReadonlyIndex(indexInfo: IndexInfo | undefined): void {
        if (indexInfo && indexInfo.isReadonly && accessExpression && (qf.is.assignmentTarget(accessExpression) || qf.is.deleteTarget(accessExpression)))
          error(accessExpression, qd.msgs.Index_signature_in_type_0_only_permits_reading, typeToString(objectType));
      }
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
    simplifiedType(type: qt.Type, writing: boolean): qt.Type {
      return type.flags & qt.TypeFlags.IndexedAccess
        ? getSimplifiedIndexedAccessType(<IndexedAccessType>type, writing)
        : type.flags & qt.TypeFlags.Conditional
        ? getSimplifiedConditionalType(<ConditionalType>type, writing)
        : type;
    }
    simplifiedIndexedAccessType(type: IndexedAccessType, writing: boolean): qt.Type {
      const cache = writing ? 'simplifiedForWriting' : 'simplifiedForReading';
      if (type[cache]) return type[cache] === circularConstraintType ? type : type[cache]!;
      type[cache] = circularConstraintType;
      const objectType = unwrapSubstitution(getSimplifiedType(type.objectType, writing));
      const indexType = getSimplifiedType(type.indexType, writing);
      const distributedOverIndex = distributeObjectOverIndexType(objectType, indexType, writing);
      if (distributedOverIndex) return (type[cache] = distributedOverIndex);
      if (!(indexType.flags & qt.TypeFlags.Instantiable)) {
        const distributedOverObject = distributeIndexOverObjectType(objectType, indexType, writing);
        if (distributedOverObject) return (type[cache] = distributedOverObject);
      }
      if (qf.is.genericMappedType(objectType)) return (type[cache] = mapType(substituteIndexedMappedType(objectType, type.indexType), (t) => getSimplifiedType(t, writing)));
      return (type[cache] = type);
    }
    simplifiedConditionalType(type: ConditionalType, writing: boolean) {
      const checkType = type.checkType;
      const extendsType = type.extendsType;
      const trueType = getTrueTypeFromConditionalType(type);
      const falseType = getFalseTypeFromConditionalType(type);
      if (falseType.flags & qt.TypeFlags.Never && getActualTypeVariable(trueType) === getActualTypeVariable(checkType)) {
        if (checkType.flags & qt.TypeFlags.Any || qf.is.typeAssignableTo(getRestrictiveInstantiation(checkType), getRestrictiveInstantiation(extendsType))) return getSimplifiedType(trueType, writing);
        else if (isIntersectionEmpty(checkType, extendsType)) return neverType;
      } else if (trueType.flags & qt.TypeFlags.Never && getActualTypeVariable(falseType) === getActualTypeVariable(checkType)) {
        if (!(checkType.flags & qt.TypeFlags.Any) && qf.is.typeAssignableTo(getRestrictiveInstantiation(checkType), getRestrictiveInstantiation(extendsType))) return neverType;
        else if (checkType.flags & qt.TypeFlags.Any || isIntersectionEmpty(checkType, extendsType)) return getSimplifiedType(falseType, writing);
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
      if (isStringIndexSignatureOnlyType(objectType) && !(indexType.flags & qt.TypeFlags.Nullable) && qf.is.typeAssignableToKind(indexType, qt.TypeFlags.String | qt.TypeFlags.Number))
        indexType = stringType;
      if (qf.is.genericIndexType(indexType) || (!(accessNode && accessNode.kind !== Syntax.IndexedAccessTyping) && qf.is.genericObjectType(objectType))) {
        if (objectType.flags & qt.TypeFlags.AnyOrUnknown) return objectType;
        const id = objectType.id + ',' + indexType.id;
        let type = indexedAccessTypes.get(id);
        if (!type) indexedAccessTypes.set(id, (type = createIndexedAccessType(objectType, indexType)));
        return type;
      }
      const apparentObjectType = getReducedApparentType(objectType);
      if (indexType.flags & qt.TypeFlags.Union && !(indexType.flags & qt.TypeFlags.Boolean)) {
        const propTypes: qt.Type[] = [];
        let wasMissingProp = false;
        for (const t of (<UnionType>indexType).types) {
          const propType = getPropertyTypeForIndexType(objectType, apparentObjectType, t, indexType, wasMissingProp, accessNode, accessFlags);
          if (propType) propTypes.push(propType);
          else if (!accessNode) {
            return;
          } else {
            wasMissingProp = true;
          }
        }
        if (wasMissingProp) return;
        return accessFlags & AccessFlags.Writing ? getIntersectionType(propTypes) : this.unionType(propTypes);
      }
      return getPropertyTypeForIndexType(objectType, apparentObjectType, indexType, indexType, false, accessNode, accessFlags | AccessFlags.CacheSymbol);
    }
    typeFromIndexedAccessTyping(n: IndexedAccessTyping) {
      const links = getNodeLinks(n);
      if (!links.resolvedType) {
        const objectType = this.typeFromTypeNode(n.objectType);
        const indexType = this.typeFromTypeNode(n.indexType);
        const resolved = this.indexedAccessType(objectType, indexType, n);
        links.resolvedType =
          resolved.flags & qt.TypeFlags.IndexedAccess && (<IndexedAccessType>resolved).objectType === objectType && (<IndexedAccessType>resolved).indexType === indexType
            ? getConditionalFlowTypeOfType(resolved, n)
            : resolved;
      }
      return links.resolvedType;
    }
    typeFromMappedTyping(n: MappedTyping): qt.Type {
      const links = getNodeLinks(n);
      if (!links.resolvedType) {
        const type = <MappedType>createObjectType(ObjectFlags.Mapped, n.symbol);
        type.declaration = n;
        type.aliasSymbol = getAliasSymbolForTypeNode(n);
        type.aliasTypeArguments = getTypeArgumentsForAliasSymbol(type.aliasSymbol);
        links.resolvedType = type;
        getConstraintTypeFromMappedType(type);
      }
      return links.resolvedType;
    }
    actualTypeVariable(type: qt.Type): qt.Type {
      if (type.flags & qt.TypeFlags.Substitution) return (<SubstitutionType>type).baseType;
      if (type.flags & qt.TypeFlags.IndexedAccess && ((<IndexedAccessType>type).objectType.flags & qt.TypeFlags.Substitution || (<IndexedAccessType>type).indexType.flags & qt.TypeFlags.Substitution))
        return this.indexedAccessType(getActualTypeVariable((<IndexedAccessType>type).objectType), getActualTypeVariable((<IndexedAccessType>type).indexType));
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
            (checkType.flags & qt.TypeFlags.Any || !qf.is.typeAssignableTo(getPermissiveInstantiation(checkType), getPermissiveInstantiation(inferredExtendsType)))
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
          if (inferredExtendsType.flags & qt.TypeFlags.AnyOrUnknown || qf.is.typeAssignableTo(getRestrictiveInstantiation(checkType), getRestrictiveInstantiation(inferredExtendsType))) {
            result = instantiateTypeWithoutDepthIncrease(root.trueType, combinedMapper || mapper);
            break;
          }
        }
        const erasedCheckType = getActualTypeVariable(checkType);
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
    trueTypeFromConditionalType(type: ConditionalType) {
      return type.resolvedTrueType || (type.resolvedTrueType = instantiateType(type.root.trueType, type.mapper));
    }
    falseTypeFromConditionalType(type: ConditionalType) {
      return type.resolvedFalseType || (type.resolvedFalseType = instantiateType(type.root.falseType, type.mapper));
    }
    inferredTrueTypeFromConditionalType(type: ConditionalType) {
      return type.resolvedInferredTrueType || (type.resolvedInferredTrueType = type.combinedMapper ? instantiateType(type.root.trueType, type.combinedMapper) : getTrueTypeFromConditionalType(type));
    }
    inferTypeParameters(n: ConditionalTyping): TypeParameter[] | undefined {
      let result: TypeParameter[] | undefined;
      if (n.locals) {
        n.locals.forEach((symbol) => {
          if (symbol.flags & qt.SymbolFlags.TypeParameter) result = append(result, getDeclaredTypeOfSymbol(symbol));
        });
      }
      return result;
    }
    typeFromConditionalTyping(n: ConditionalTyping): qt.Type {
      const links = getNodeLinks(n);
      if (!links.resolvedType) {
        const checkType = this.typeFromTypeNode(n.checkType);
        const aliasSymbol = getAliasSymbolForTypeNode(n);
        const aliasTypeArguments = getTypeArgumentsForAliasSymbol(aliasSymbol);
        const allOuterTypeParameters = getOuterTypeParameters(n, true);
        const outerTypeParameters = aliasTypeArguments ? allOuterTypeParameters : filter(allOuterTypeParameters, (tp) => isTypeParameterPossiblyReferenced(tp, n));
        const root: ConditionalRoot = {
          n: n,
          checkType,
          extendsType: this.typeFromTypeNode(n.extendsType),
          trueType: this.typeFromTypeNode(n.trueType),
          falseType: this.typeFromTypeNode(n.falseType),
          isDistributive: !!(checkType.flags & qt.TypeFlags.TypeParameter),
          inferTypeParameters: getInferTypeParameters(n),
          outerTypeParameters,
          instantiations: undefined,
          aliasSymbol,
          aliasTypeArguments,
        };
        links.resolvedType = getConditionalType(root, undefined);
        if (outerTypeParameters) {
          root.instantiations = new qu.QMap<Type>();
          root.instantiations.set(getTypeListId(outerTypeParameters), links.resolvedType);
        }
      }
      return links.resolvedType;
    }
    typeFromInferTyping(n: InferTyping): qt.Type {
      const links = getNodeLinks(n);
      if (!links.resolvedType) links.resolvedType = getDeclaredTypeOfTypeParameter(this.symbolOfNode(n.typeParameter));
      return links.resolvedType;
    }
    identifierChain(n: qt.EntityName): Identifier[] {
      if (n.kind === Syntax.Identifier) return [n];
      return append(getIdentifierChain(n.left), n.right);
    }
    typeFromImportTyping(n: ImportTyping): qt.Type {
      const links = getNodeLinks(n);
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
        const targetMeaning = n.isTypeOf ? qt.SymbolFlags.Value : n.flags & NodeFlags.Doc ? qt.SymbolFlags.Value | qt.SymbolFlags.Type : qt.SymbolFlags.Type;
        const innerModuleSymbol = resolveExternalModuleName(n, n.argument.literal);
        if (!innerModuleSymbol) {
          links.resolvedSymbol = unknownSymbol;
          return (links.resolvedType = errorType);
        }
        const moduleSymbol = resolveExternalModuleSymbol(innerModuleSymbol, false);
        if (!qf.is.missing(n.qualifier)) {
          const nameStack: Identifier[] = getIdentifierChain(n.qualifier!);
          let currentNamespace = moduleSymbol;
          let current: qc.Identifier | undefined;
          while ((current = nameStack.shift())) {
            const meaning = nameStack.length ? qt.SymbolFlags.Namespace : targetMeaning;
            const next = getSymbol(this.mergedSymbol(currentNamespace.resolveSymbol()).getExportsOfSymbol(), current.escapedText, meaning);
            if (!next) {
              error(current, qd.msgs.Namespace_0_has_no_exported_member_1, getFullyQualifiedName(currentNamespace), declarationNameToString(current));
              return (links.resolvedType = errorType);
            }
            getNodeLinks(current).resolvedSymbol = next;
            getNodeLinks(current.parent).resolvedSymbol = next;
            currentNamespace = next;
          }
          links.resolvedType = resolveImportSymbolType(n, links, currentNamespace, targetMeaning);
        } else {
          if (moduleSymbol.flags & targetMeaning) links.resolvedType = resolveImportSymbolType(n, links, moduleSymbol, targetMeaning);
          else {
            const errorMessage =
              targetMeaning === qt.SymbolFlags.Value
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
      const links = getNodeLinks(n);
      if (!links.resolvedType) {
        const aliasSymbol = getAliasSymbolForTypeNode(n);
        if (getMembersOfSymbol(n.symbol).size === 0 && !aliasSymbol) links.resolvedType = emptyTypeLiteralType;
        else {
          let type = createObjectType(ObjectFlags.Anonymous, n.symbol);
          type.aliasSymbol = aliasSymbol;
          type.aliasTypeArguments = getTypeArgumentsForAliasSymbol(aliasSymbol);
          if (n.kind === Syntax.DocTypingLiteral && n.qf.is.arrayType) type = createArrayType(type);
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
      return symbol ? this.getLocalTypeParametersOfClassOrInterfaceOrTypeAlias() : undefined;
    }
    spreadType(left: qt.Type, right: qt.Type, symbol: Symbol | undefined, objectFlags: ObjectFlags, readonly: boolean): qt.Type {
      if (left.flags & qt.TypeFlags.Any || right.flags & qt.TypeFlags.Any) return anyType;
      if (left.flags & qt.TypeFlags.Unknown || right.flags & qt.TypeFlags.Unknown) return unknownType;
      if (left.flags & qt.TypeFlags.Never) return right;
      if (right.flags & qt.TypeFlags.Never) return left;
      if (left.flags & qt.TypeFlags.Union) {
        const merged = tryMergeUnionOfObjectTypeAndEmptyObject(left as UnionType, readonly);
        if (merged) return getSpreadType(merged, right, symbol, objectFlags, readonly);
        return mapType(left, (t) => getSpreadType(t, right, symbol, objectFlags, readonly));
      }
      if (right.flags & qt.TypeFlags.Union) {
        const merged = tryMergeUnionOfObjectTypeAndEmptyObject(right as UnionType, readonly);
        if (merged) return getSpreadType(left, merged, symbol, objectFlags, readonly);
        return mapType(right, (t) => getSpreadType(left, t, symbol, objectFlags, readonly));
      }
      if (right.flags & (TypeFlags.BooleanLike | qt.TypeFlags.NumberLike | qt.TypeFlags.BigIntLike | qt.TypeFlags.StringLike | qt.TypeFlags.EnumLike | qt.TypeFlags.NonPrimitive | qt.TypeFlags.Index))
        return left;
      if (qf.is.genericObjectType(left) || qf.is.genericObjectType(right)) {
        if (qf.is.emptyObjectType(left)) return right;
        if (left.flags & qt.TypeFlags.Intersection) {
          const types = (<IntersectionType>left).types;
          const lastLeft = types[types.length - 1];
          if (isNonGenericObjectType(lastLeft) && isNonGenericObjectType(right))
            return getIntersectionType(concatenate(types.slice(0, types.length - 1), [getSpreadType(lastLeft, right, symbol, objectFlags, readonly)]));
        }
        return getIntersectionType([left, right]);
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
        if (getDeclarationModifierFlagsFromSymbol(rightProp) & (ModifierFlags.Private | ModifierFlags.Protected)) skippedPrivateMembers.set(rightProp.escName, true);
        else if (isSpreadableProperty(rightProp)) {
          members.set(rightProp.escName, getSpreadSymbol(rightProp, readonly));
        }
      }
      for (const leftProp of this.propertiesOfType(left)) {
        if (skippedPrivateMembers.has(leftProp.escName) || !isSpreadableProperty(leftProp)) continue;
        if (members.has(leftProp.escName)) {
          const rightProp = members.get(leftProp.escName)!;
          const rightType = this.typeOfSymbol(rightProp);
          if (rightProp.flags & qt.SymbolFlags.Optional) {
            const declarations = concatenate(leftProp.declarations, rightProp.declarations);
            const flags = qt.SymbolFlags.Property | (leftProp.flags & qt.SymbolFlags.Optional);
            const result = new Symbol(flags, leftProp.escName);
            result.type = this.unionType([this.typeOfSymbol(leftProp), getTypeWithFacts(rightType, TypeFacts.NEUndefined)]);
            result.leftSpread = leftProp;
            result.rightSpread = rightProp;
            result.declarations = declarations;
            result.nameType = s.getLinks(leftProp).nameType;
            members.set(leftProp.escName, result);
          }
        } else {
          members.set(leftProp.escName, getSpreadSymbol(leftProp, readonly));
        }
      }
      const spread = createAnonymousType(symbol, members, empty, empty, getIndexInfoWithReadonly(stringIndexInfo, readonly), getIndexInfoWithReadonly(numberIndexInfo, readonly));
      spread.objectFlags |= ObjectFlags.ObjectLiteral | ObjectFlags.ContainsObjectOrArrayLiteral | ObjectFlags.ContainsSpread | objectFlags;
      return spread;
    }
    spreadSymbol(prop: Symbol, readonly: boolean) {
      const isSetonlyAccessor = prop.flags & qt.SymbolFlags.SetAccessor && !(prop.flags & qt.SymbolFlags.GetAccessor);
      if (!isSetonlyAccessor && readonly === isReadonlySymbol(prop)) return prop;
      const flags = qt.SymbolFlags.Property | (prop.flags & qt.SymbolFlags.Optional);
      const result = new Symbol(flags, prop.escName, readonly ? qt.CheckFlags.Readonly : 0);
      result.type = isSetonlyAccessor ? undefinedType : this.typeOfSymbol(prop);
      result.declarations = prop.declarations;
      result.nameType = s.getLinks(prop).nameType;
      result.syntheticOrigin = prop;
      return result;
    }
    indexInfoWithReadonly(info: IndexInfo | undefined, readonly: boolean) {
      return info && info.isReadonly !== readonly ? createIndexInfo(info.type, readonly, info.declaration) : info;
    }
    freshTypeOfLiteralType(type: qt.Type): qt.Type {
      if (type.flags & qt.TypeFlags.Literal) {
        if (!(<LiteralType>type).freshType) {
          const freshType = createLiteralType(type.flags, (<LiteralType>type).value, (<LiteralType>type).symbol);
          freshType.regularType = <LiteralType>type;
          freshType.freshType = freshType;
          (<LiteralType>type).freshType = freshType;
        }
        return (<LiteralType>type).freshType;
      }
      return type;
    }
    regularTypeOfLiteralType(type: qt.Type): qt.Type {
      return type.flags & qt.TypeFlags.Literal
        ? (<LiteralType>type).regularType
        : type.flags & qt.TypeFlags.Union
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
        type.regularType = type;
      }
      return type;
    }
    typeFromLiteralTyping(n: LiteralTyping): qt.Type {
      const links = getNodeLinks(n);
      if (!links.resolvedType) links.resolvedType = getRegularTypeOfLiteralType(check.expression(n.literal));
      return links.resolvedType;
    }
    eSSymbolLikeTypeForNode(n: Node) {
      if (qf.is.validESSymbolDeclaration(n)) {
        const symbol = this.symbolOfNode(n);
        const links = s.getLinks(symbol);
        return links.uniqueESSymbolType || (links.uniqueESSymbolType = createUniqueESSymbolType(symbol));
      }
      return esSymbolType;
    }
    thisType(n: Node): qt.Type {
      const container = this.thisContainer(n, false);
      const parent = container && container.parent;
      if (parent && (qf.is.classLike(parent) || parent.kind === Syntax.InterfaceDeclaration)) {
        if (!qf.has.syntacticModifier(container, ModifierFlags.Static) && (!container.kind === Syntax.ConstructorDeclaration || qf.is.descendantOf(n, container.body)))
          return getDeclaredTypeOfClassOrInterface(this.symbolOfNode(parent as ClassLikeDeclaration | InterfaceDeclaration)).thisType!;
      }
      if (
        parent &&
        parent.kind === Syntax.ObjectLiteralExpression &&
        parent.parent.kind === Syntax.BinaryExpression &&
        this.assignmentDeclarationKind(parent.parent) === AssignmentDeclarationKind.Prototype
      ) {
        return getDeclaredTypeOfClassOrInterface(this.symbolOfNode(parent.parent.left)!.parent!).thisType!;
      }
      const host = n.flags & NodeFlags.Doc ? this.hostSignatureFromDoc(n) : undefined;
      if (
        host &&
        host.kind === Syntax.FunctionExpression &&
        host.parent.kind === Syntax.BinaryExpression &&
        this.assignmentDeclarationKind(host.parent) === AssignmentDeclarationKind.PrototypeProperty
      )
        return getDeclaredTypeOfClassOrInterface(this.symbolOfNode(host.parent.left)!.parent!).thisType!;
      if (qf.is.jsConstructor(container) && qf.is.descendantOf(n, container.body)) return getDeclaredTypeOfClassOrInterface(this.symbolOfNode(container)).thisType!;
      error(n, qd.msgs.A_this_type_is_available_only_in_a_non_static_member_of_a_class_or_interface);
      return errorType;
    }
    typeFromThisNodeTypeNode(n: ThisExpression | ThisTyping): qt.Type {
      const links = getNodeLinks(n);
      if (!links.resolvedType) links.resolvedType = getThisType(n);
      return links.resolvedType;
    }
    typeFromNamedTupleTyping(n: NamedTupleMember): qt.Type {
      const links = getNodeLinks(n);
      if (!links.resolvedType) {
        let type = this.typeFromTypeNode(n.type);
        if (n.dot3Token) type = getElemTypeOfArrayType(type) || errorType;
        if (n.questionToken && strictNullChecks) type = getOptionalType(type);
        links.resolvedType = type;
      }
      return links.resolvedType;
    }
    typeFromTypeNode(n: Typing): qt.Type {
      return getConditionalFlowTypeOfType(this.typeFromTypeNodeWorker(n), n);
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
          return getTypeFromThisNodeTypeNode(n as ThisExpression | ThisTyping);
        case Syntax.LiteralTyping:
          return getTypeFromLiteralTyping(<LiteralTyping>n);
        case Syntax.TypingReference:
          return getTypeFromTypeReference(<TypingReference>n);
        case Syntax.TypingPredicate:
          return (<TypingPredicate>n).assertsModifier ? voidType : booleanType;
        case Syntax.ExpressionWithTypings:
          return getTypeFromTypeReference(<ExpressionWithTypings>n);
        case Syntax.TypingQuery:
          return getTypeFromTypingQuery(<TypingQuery>n);
        case Syntax.ArrayTyping:
        case Syntax.TupleTyping:
          return getTypeFromArrayOrTupleTyping(<ArrayTyping | TupleTyping>n);
        case Syntax.OptionalTyping:
          return getTypeFromOptionalTyping(<OptionalTyping>n);
        case Syntax.UnionTyping:
          return getTypeFromUnionTyping(<UnionTyping>n);
        case Syntax.IntersectionTyping:
          return getTypeFromIntersectionTyping(<IntersectionTyping>n);
        case Syntax.DocNullableTyping:
          return getTypeFromDocNullableTypingNode(<DocNullableTyping>n);
        case Syntax.DocOptionalTyping:
          return addOptionality(this.typeFromTypeNode((n as DocOptionalTyping).type));
        case Syntax.NamedTupleMember:
          return getTypeFromNamedTupleTyping(n as NamedTupleMember);
        case Syntax.ParenthesizedTyping:
        case Syntax.DocNonNullableTyping:
        case Syntax.DocTypingExpression:
          return this.typeFromTypeNode((<ParenthesizedTyping | DocTypeReferencingNode | DocTypingExpression | NamedTupleMember>n).type);
        case Syntax.RestTyping:
          return getElemTypeOfArrayType(this.typeFromTypeNode((<RestTyping>n).type)) || errorType;
        case Syntax.DocVariadicTyping:
          return getTypeFromDocVariadicTyping(n as DocVariadicTyping);
        case Syntax.FunctionTyping:
        case Syntax.ConstructorTyping:
        case Syntax.TypingLiteral:
        case Syntax.DocTypingLiteral:
        case Syntax.DocFunctionTyping:
        case Syntax.DocSignature:
          return getTypeFromTypeLiteralOrFunctionOrConstructorTyping(n);
        case Syntax.TypingOperator:
          return getTypeFromTypingOperator(<TypingOperator>n);
        case Syntax.IndexedAccessTyping:
          return getTypeFromIndexedAccessTyping(<IndexedAccessTyping>n);
        case Syntax.MappedTyping:
          return getTypeFromMappedTyping(<MappedTyping>n);
        case Syntax.ConditionalTyping:
          return getTypeFromConditionalTyping(<ConditionalTyping>n);
        case Syntax.InferTyping:
          return getTypeFromInferTyping(<InferTyping>n);
        case Syntax.ImportTyping:
          return getTypeFromImportTyping(<ImportTyping>n);
        case Syntax.Identifier:
        case Syntax.QualifiedName:
          const symbol = getSymbolAtLocation(n);
          return symbol ? getDeclaredTypeOfSymbol(symbol) : errorType;
        default:
          return errorType;
      }
    }
    mappedType(type: qt.Type, mapper: TypeMapper): qt.Type {
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
          return mapper.func(type);
        case TypeMapKind.Composite:
        case TypeMapKind.Merged:
          const t1 = getMappedType(type, mapper.mapper1);
          return t1 !== type && mapper.kind === TypeMapKind.Composite ? instantiateType(t1, mapper.mapper2) : getMappedType(t1, mapper.mapper2);
      }
    }
    restrictiveTypeParameter(tp: TypeParameter) {
      return tp.constraint === unknownType
        ? tp
        : tp.restrictiveInstantiation ||
            ((tp.restrictiveInstantiation = createTypeParameter(tp.symbol)), ((tp.restrictiveInstantiation as TypeParameter).constraint = unknownType), tp.restrictiveInstantiation);
    }
    objectTypeInstantiation(type: AnonymousType | DeferredTypeReference, mapper: TypeMapper) {
      const target = type.objectFlags & ObjectFlags.Instantiated ? type.target! : type;
      const n = type.objectFlags & ObjectFlags.Reference ? (<TypeReference>type).node! : type.symbol.declarations[0];
      const links = getNodeLinks(n);
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
        let outerTypeParameters = getOuterTypeParameters(declaration, true);
        if (qf.is.jsConstructor(declaration)) {
          const templateTagParameters = getTypeParametersFromDeclaration(declaration as DeclarationWithTypeParameters);
          outerTypeParameters = addRange(outerTypeParameters, templateTagParameters);
        }
        typeParameters = outerTypeParameters || empty;
        typeParameters =
          (target.objectFlags & ObjectFlags.Reference || target.symbol.flags & qt.SymbolFlags.TypeLiteral) && !target.aliasTypeArguments
            ? filter(typeParameters, (tp) => isTypeParameterPossiblyReferenced(tp, declaration))
            : typeParameters;
        links.outerTypeParameters = typeParameters;
        if (typeParameters.length) {
          links.instantiations = new qu.QMap<Type>();
          links.instantiations.set(getTypeListId(typeParameters), target);
        }
      }
      if (typeParameters.length) {
        const combinedMapper = combineTypeMappers(type.mapper, mapper);
        const typeArguments = map(typeParameters, (t) => getMappedType(t, combinedMapper));
        const id = getTypeListId(typeArguments);
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
    homomorphicTypeVariable(type: MappedType) {
      const constraintType = getConstraintTypeFromMappedType(type);
      if (constraintType.flags & qt.TypeFlags.Index) {
        const typeVariable = getActualTypeVariable((<IndexType>constraintType).type);
        if (typeVariable.flags & qt.TypeFlags.TypeParameter) return <TypeParameter>typeVariable;
      }
      return;
    }
    modifiedReadonlyState(state: boolean, modifiers: MappedTypeModifiers) {
      return modifiers & MappedTypeModifiers.IncludeReadonly ? true : modifiers & MappedTypeModifiers.ExcludeReadonly ? false : state;
    }
    conditionalTypeInstantiation(type: ConditionalType, mapper: TypeMapper): qt.Type {
      const root = type.root;
      if (root.outerTypeParameters) {
        const typeArguments = map(root.outerTypeParameters, (t) => getMappedType(t, mapper));
        const id = getTypeListId(typeArguments);
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
    permissiveInstantiation(type: qt.Type) {
      return type.flags & (TypeFlags.Primitive | qt.TypeFlags.AnyOrUnknown | qt.TypeFlags.Never)
        ? type
        : type.permissiveInstantiation || (type.permissiveInstantiation = instantiateType(type, permissiveMapper));
    }
    restrictiveInstantiation(type: qt.Type) {
      if (type.flags & (TypeFlags.Primitive | qt.TypeFlags.AnyOrUnknown | qt.TypeFlags.Never)) return type;
      if (type.restrictiveInstantiation) return type.restrictiveInstantiation;
      type.restrictiveInstantiation = instantiateType(type, restrictiveMapper);
      type.restrictiveInstantiation.restrictiveInstantiation = type.restrictiveInstantiation;
      return type.restrictiveInstantiation;
    }
    typeWithoutSignatures(type: qt.Type): qt.Type {
      if (type.flags & qt.TypeFlags.Object) {
        const resolved = resolveStructuredTypeMembers(<ObjectType>type);
        if (resolved.constructSignatures.length || resolved.callSignatures.length) {
          const result = createObjectType(ObjectFlags.Anonymous, type.symbol);
          result.members = resolved.members;
          result.properties = resolved.properties;
          result.callSignatures = empty;
          result.constructSignatures = empty;
          return result;
        }
      } else if (type.flags & qt.TypeFlags.Intersection) {
        return getIntersectionType(map((<IntersectionType>type).types, getTypeWithoutSignatures));
      }
      return type;
    }
    bestMatchIndexedAccessTypeOrUndefined(source: qt.Type, target: qt.Type, nameType: qt.Type) {
      const idx = this.indexedAccessTypeOrUndefined(target, nameType);
      if (idx) return idx;
      if (target.flags & qt.TypeFlags.Union) {
        const best = getBestMatchingType(source, target as UnionType);
        if (best) return this.indexedAccessTypeOrUndefined(best, nameType);
      }
    }
    elaborationElemForJsxChild(child: JsxChild, nameType: LiteralType, getInvalidTextDiagnostic: () => qd.Message) {
      switch (child.kind) {
        case Syntax.JsxExpression:
          return { errorNode: child, innerExpression: child.expression, nameType };
        case Syntax.JsxText:
          if (child.onlyTriviaWhitespaces) break;
          return { errorNode: child, innerExpression: undefined, nameType, errorMessage: getInvalidTextDiagnostic() };
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
    normalizedType(type: qt.Type, writing: boolean): qt.Type {
      while (true) {
        const t = qf.is.freshLiteralType(type)
          ? (<FreshableType>type).regularType
          : getObjectFlags(type) & ObjectFlags.Reference && (<TypeReference>type).node
          ? createTypeReference((<TypeReference>type).target, getTypeArguments(<TypeReference>type))
          : type.flags & qt.TypeFlags.UnionOrIntersection
          ? getReducedType(type)
          : type.flags & qt.TypeFlags.Substitution
          ? writing
            ? (<SubstitutionType>type).baseType
            : (<SubstitutionType>type).substitute
          : type.flags & qt.TypeFlags.Simplifiable
          ? getSimplifiedType(type, writing)
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
    markerTypeReference(type: GenericType, source: TypeParameter, target: qt.Type) {
      const result = createTypeReference(
        type,
        map(type.typeParameters, (t) => (t === source ? target : t))
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
    variances(type: GenericType): VarianceFlags[] {
      if (type === globalArrayType || type === globalReadonlyArrayType || type.objectFlags & ObjectFlags.Tuple) return arrayVariances;
      return getVariancesWorker(type.typeParameters, type, getMarkerTypeReference);
    }
    typeReferenceId(type: TypeReference, typeParameters: qt.Type[], depth = 0) {
      let result = '' + type.target.id;
      for (const t of getTypeArguments(type)) {
        if (qf.is.unconstrainedTypeParameter(t)) {
          let index = typeParameters.indexOf(t);
          if (index < 0) {
            index = typeParameters.length;
            typeParameters.push(t);
          }
          result += '=' + index;
        } else if (depth < 4 && qf.is.typeReferenceWithGenericArguments(t)) {
          result += '<' + getTypeReferenceId(t as TypeReference, typeParameters, depth + 1) + '>';
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
        return getTypeReferenceId(<TypeReference>source, typeParameters) + ',' + getTypeReferenceId(<TypeReference>target, typeParameters) + postFix;
      }
      return source.id + ',' + target.id + postFix;
    }
    declaringClass(prop: Symbol) {
      return prop.parent && prop.parent.flags & qt.SymbolFlags.Class ? <InterfaceType>getDeclaredTypeOfSymbol(getParentOfSymbol(prop)!) : undefined;
    }
    typeOfPropertyInBaseClass(property: Symbol) {
      const classType = getDeclaringClass(property);
      const baseClassType = classType && getBaseTypes(classType)[0];
      return baseClassType && this.typeOfPropertyOfType(baseClassType, property.escName);
    }
    rootObjectTypeFromIndexedAccessChain(type: qt.Type) {
      let t = type;
      while (t.flags & qt.TypeFlags.IndexedAccess) {
        t = (t as IndexedAccessType).objectType;
      }
      return t;
    }
    supertypeOrUnion(types: qt.Type[]): qt.Type {
      return literalTypesWithSameBaseType(types) ? this.unionType(types) : reduceLeft(types, (s, t) => (isTypeSubtypeOf(s, t) ? t : s))!;
    }
    commonSupertype(types: qt.Type[]): qt.Type {
      if (!strictNullChecks) return getSupertypeOrUnion(types);
      const primaryTypes = filter(types, (t) => !(t.flags & qt.TypeFlags.Nullable));
      return primaryTypes.length ? getNullableType(getSupertypeOrUnion(primaryTypes), getFalsyFlagsOfTypes(types) & qt.TypeFlags.Nullable) : this.unionType(types, UnionReduction.Subtype);
    }
    commonSubtype(types: qt.Type[]) {
      return reduceLeft(types, (s, t) => (isTypeSubtypeOf(t, s) ? t : s))!;
    }
    elemTypeOfArrayType(type: qt.Type): qt.Type | undefined {
      return qf.is.arrayType(type) ? getTypeArguments(type as TypeReference)[0] : undefined;
    }
    tupleElemType(type: qt.Type, index: number) {
      const propType = this.typeOfPropertyOfType(type, ('' + index) as qu.__String);
      if (propType) return propType;
      if (everyType(type, qf.is.tupleType)) return mapType(type, (t) => getRestTypeOfTupleType(<TupleTypeReference>t) || undefinedType);
      return;
    }
    baseTypeOfLiteralType(type: qt.Type): qt.Type {
      return type.flags & qt.TypeFlags.EnumLiteral
        ? getBaseTypeOfEnumLiteralType(<LiteralType>type)
        : type.flags & qt.TypeFlags.StringLiteral
        ? stringType
        : type.flags & qt.TypeFlags.NumberLiteral
        ? numberType
        : type.flags & qt.TypeFlags.BigIntLiteral
        ? bigintType
        : type.flags & qt.TypeFlags.BooleanLiteral
        ? booleanType
        : type.flags & qt.TypeFlags.Union
        ? this.unionType(sameMap((<UnionType>type).types, getBaseTypeOfLiteralType))
        : type;
    }
    widenedLiteralType(type: qt.Type): qt.Type {
      return type.flags & qt.TypeFlags.EnumLiteral && qf.is.freshLiteralType(type)
        ? getBaseTypeOfEnumLiteralType(<LiteralType>type)
        : type.flags & qt.TypeFlags.StringLiteral && qf.is.freshLiteralType(type)
        ? stringType
        : type.flags & qt.TypeFlags.NumberLiteral && qf.is.freshLiteralType(type)
        ? numberType
        : type.flags & qt.TypeFlags.BigIntLiteral && qf.is.freshLiteralType(type)
        ? bigintType
        : type.flags & qt.TypeFlags.BooleanLiteral && qf.is.freshLiteralType(type)
        ? booleanType
        : type.flags & qt.TypeFlags.Union
        ? this.unionType(sameMap((<UnionType>type).types, this.widenedLiteralType))
        : type;
    }
    widenedUniqueESSymbolType(type: qt.Type): qt.Type {
      return type.flags & qt.TypeFlags.UniqueESSymbol ? esSymbolType : type.flags & qt.TypeFlags.Union ? this.unionType(sameMap((<UnionType>type).types, getWidenedUniqueESSymbolType)) : type;
    }
    widenedLiteralLikeTypeForContextualType(type: qt.Type, contextualType: qt.Type | undefined) {
      if (!isLiteralOfContextualType(type, contextualType)) type = getWidenedUniqueESSymbolType(this.widenedLiteralType(type));
      return type;
    }
    widenedLiteralLikeTypeForContextualReturnTypeIfNeeded(type: qt.Type | undefined, contextualSignatureReturnType: qt.Type | undefined, isAsync: boolean) {
      if (type && isUnitType(type)) {
        const contextualType = !contextualSignatureReturnType ? undefined : isAsync ? getPromisedTypeOfPromise(contextualSignatureReturnType) : contextualSignatureReturnType;
        type = getWidenedLiteralLikeTypeForContextualType(type, contextualType);
      }
      return type;
    }
    widenedLiteralLikeTypeForContextualIterationTypeIfNeeded(type: qt.Type | undefined, contextualSignatureReturnType: qt.Type | undefined, kind: IterationTypeKind, isAsyncGenerator: boolean) {
      if (type && isUnitType(type)) {
        const contextualType = !contextualSignatureReturnType ? undefined : getIterationTypeOfGeneratorFunctionReturnType(kind, contextualSignatureReturnType, isAsyncGenerator);
        type = getWidenedLiteralLikeTypeForContextualType(type, contextualType);
      }
      return type;
    }
    restTypeOfTupleType(type: TupleTypeReference) {
      return type.target.hasRestElem ? getTypeArguments(type)[type.target.typeParameters!.length - 1] : undefined;
    }
    restArrayTypeOfTupleType(type: TupleTypeReference) {
      const restType = getRestTypeOfTupleType(type);
      return restType && createArrayType(restType);
    }
    lengthOfTupleType(type: TupleTypeReference) {
      return getTypeReferenceArity(type) - (type.target.hasRestElem ? 1 : 0);
    }
    falsyFlagsOfTypes(types: qt.Type[]): qt.TypeFlags {
      let result: qt.TypeFlags = 0;
      for (const t of types) {
        result |= getFalsyFlags(t);
      }
      return result;
    }
    falsyFlags(type: qt.Type): qt.TypeFlags {
      return type.flags & qt.TypeFlags.Union
        ? getFalsyFlagsOfTypes((<UnionType>type).types)
        : type.flags & qt.TypeFlags.StringLiteral
        ? (<StringLiteralType>type).value === ''
          ? qt.TypeFlags.StringLiteral
          : 0
        : type.flags & qt.TypeFlags.NumberLiteral
        ? (<NumberLiteralType>type).value === 0
          ? qt.TypeFlags.NumberLiteral
          : 0
        : type.flags & qt.TypeFlags.BigIntLiteral
        ? isZeroBigInt(<BigIntLiteralType>type)
          ? qt.TypeFlags.BigIntLiteral
          : 0
        : type.flags & qt.TypeFlags.BooleanLiteral
        ? type === falseType || type === regularFalseType
          ? qt.TypeFlags.BooleanLiteral
          : 0
        : type.flags & qt.TypeFlags.PossiblyFalsy;
    }
    definitelyFalsyPartOfType(type: qt.Type): qt.Type {
      return type.flags & qt.TypeFlags.String
        ? emptyStringType
        : type.flags & qt.TypeFlags.Number
        ? zeroType
        : type.flags & qt.TypeFlags.BigInt
        ? zeroBigIntType
        : type === regularFalseType ||
          type === falseType ||
          type.flags & (TypeFlags.Void | qt.TypeFlags.Undefined | qt.TypeFlags.Null) ||
          (type.flags & qt.TypeFlags.StringLiteral && (<StringLiteralType>type).value === '') ||
          (type.flags & qt.TypeFlags.NumberLiteral && (<NumberLiteralType>type).value === 0) ||
          (type.flags & qt.TypeFlags.BigIntLiteral && isZeroBigInt(<BigIntLiteralType>type))
        ? type
        : neverType;
    }
    nullableType(type: qt.Type, flags: qt.TypeFlags): qt.Type {
      const missing = flags & ~type.flags & (TypeFlags.Undefined | qt.TypeFlags.Null);
      return missing === 0
        ? type
        : missing === qt.TypeFlags.Undefined
        ? this.unionType([type, undefinedType])
        : missing === qt.TypeFlags.Null
        ? this.unionType([type, nullType])
        : this.unionType([type, undefinedType, nullType]);
    }
    optionalType(type: qt.Type): qt.Type {
      qu.assert(strictNullChecks);
      return type.flags & qt.TypeFlags.Undefined ? type : this.unionType([type, undefinedType]);
    }
    globalNonNullableTypeInstantiation(type: qt.Type) {
      if (!deferredGlobalNonNullableTypeAlias) deferredGlobalNonNullableTypeAlias = getGlobalSymbol('NonNullable' as qu.__String, qt.SymbolFlags.TypeAlias, undefined) || unknownSymbol;
      if (deferredGlobalNonNullableTypeAlias !== unknownSymbol) return this.typeAliasInstantiation(deferredGlobalNonNullableTypeAlias, [type]);
      return getTypeWithFacts(type, TypeFacts.NEUndefinedOrNull);
    }
    nonNullableType(type: qt.Type): qt.Type {
      return strictNullChecks ? getGlobalNonNullableTypeInstantiation(type) : type;
    }
    optionalExpressionType(exprType: qt.Type, expression: qt.Expression) {
      return qf.is.expressionOfOptionalChainRoot(expression) ? getNonNullableType(exprType) : qf.is.optionalChain(expression) ? removeOptionalTypeMarker(exprType) : exprType;
    }
    regularTypeOfObjectLiteral(type: qt.Type): qt.Type {
      if (!(qf.is.objectLiteralType(type) && getObjectFlags(type) & ObjectFlags.FreshLiteral)) return type;
      const regularType = (<FreshObjectLiteralType>type).regularType;
      if (regularType) return regularType;
      const resolved = <ResolvedType>type;
      const members = transformTypeOfMembers(type, getRegularTypeOfObjectLiteral);
      const regularNew = createAnonymousType(resolved.symbol, members, resolved.callSignatures, resolved.constructSignatures, resolved.stringIndexInfo, resolved.numberIndexInfo);
      regularNew.flags = resolved.flags;
      regularNew.objectFlags |= resolved.objectFlags & ~ObjectFlags.FreshLiteral;
      (<FreshObjectLiteralType>type).regularType = regularNew;
      return regularNew;
    }
    siblingsOfContext(context: WideningContext): qt.Type[] {
      if (!context.siblings) {
        const siblings: qt.Type[] = [];
        for (const type of getSiblingsOfContext(context.parent!)) {
          if (qf.is.objectLiteralType(type)) {
            const prop = getPropertyOfObjectType(type, context.propertyName!);
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
        for (const t of getSiblingsOfContext(context)) {
          if (qf.is.objectLiteralType(t) && !(getObjectFlags(t) & ObjectFlags.ContainsSpread)) {
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
      if (!(prop.flags & qt.SymbolFlags.Property)) return prop;
      const original = this.typeOfSymbol(prop);
      const propContext = context && createWideningContext(context, prop.escName, undefined);
      const widened = this.widenedTypeWithContext(original, propContext);
      return widened === original ? prop : createSymbolWithType(prop, widened);
    }
    undefinedProperty(prop: Symbol) {
      const cached = undefinedProperties.get(prop.escName);
      if (cached) return cached;
      const result = createSymbolWithType(prop, undefinedType);
      result.flags |= qt.SymbolFlags.Optional;
      undefinedProperties.set(prop.escName, result);
      return result;
    }
    widenedTypeOfObjectLiteral(type: qt.Type, context: WideningContext | undefined): qt.Type {
      const members = new SymbolTable();
      for (const prop of getPropertiesOfObjectType(type)) {
        members.set(prop.escName, getWidenedProperty(prop, context));
      }
      if (context) {
        for (const prop of getPropertiesOfContext(context)) {
          if (!members.has(prop.escName)) members.set(prop.escName, getUndefinedProperty(prop));
        }
      }
      const stringIndexInfo = this.indexInfoOfType(type, qt.IndexKind.String);
      const numberIndexInfo = this.indexInfoOfType(type, qt.IndexKind.Number);
      const result = createAnonymousType(
        type.symbol,
        members,
        empty,
        empty,
        stringIndexInfo && createIndexInfo(this.widenedType(stringIndexInfo.type), stringIndexInfo.isReadonly),
        numberIndexInfo && createIndexInfo(this.widenedType(numberIndexInfo.type), numberIndexInfo.isReadonly)
      );
      result.objectFlags |= getObjectFlags(type) & (ObjectFlags.JSLiteral | ObjectFlags.NonInferrableType);
      return result;
    }
    widenedType(type: qt.Type) {
      return this.widenedTypeWithContext(type, undefined);
    }
    widenedTypeWithContext(type: qt.Type, context: WideningContext | undefined): qt.Type {
      if (getObjectFlags(type) & ObjectFlags.RequiresWidening) {
        if (context === undefined && type.widened) return type.widened;
        let result: qt.Type | undefined;
        if (type.flags & (TypeFlags.Any | qt.TypeFlags.Nullable)) result = anyType;
        else if (qf.is.objectLiteralType(type)) {
          result = this.widenedTypeOfObjectLiteral(type, context);
        } else if (type.flags & qt.TypeFlags.Union) {
          const unionContext = context || createWideningContext(undefined, (<UnionType>type).types);
          const widenedTypes = sameMap((<UnionType>type).types, (t) => (t.flags & qt.TypeFlags.Nullable ? t : this.widenedTypeWithContext(t, unionContext)));
          result = this.unionType(widenedTypes, qu.some(widenedTypes, qf.is.emptyObjectType) ? UnionReduction.Subtype : UnionReduction.Literal);
        } else if (type.flags & qt.TypeFlags.Intersection) {
          result = getIntersectionType(sameMap((<IntersectionType>type).types, this.widenedType));
        } else if (qf.is.arrayType(type) || qf.is.tupleType(type)) {
          result = createTypeReference((<TypeReference>type).target, sameMap(getTypeArguments(<TypeReference>type), this.widenedType));
        }
        if (result && context === undefined) type.widened = result;
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
        if (isStaticPrivateIdentifierProperty(targetProp)) continue;
        if (requireOptionalProperties || !(targetProp.flags & qt.SymbolFlags.Optional || getCheckFlags(targetProp) & qt.CheckFlags.Partial)) {
          const sourceProp = this.propertyOfType(source, targetProp.escName);
          if (!sourceProp) yield targetProp;
          else if (matchDiscriminantProperties) {
            const targetType = this.typeOfSymbol(targetProp);
            if (targetType.flags & qt.TypeFlags.Unit) {
              const sourceType = this.typeOfSymbol(sourceProp);
              if (!(sourceType.flags & qt.TypeFlags.Any || getRegularTypeOfLiteralType(sourceType) === getRegularTypeOfLiteralType(targetType))) yield targetProp;
            }
          }
        }
      }
    }
    unmatchedProperty(source: qt.Type, target: qt.Type, requireOptionalProperties: boolean, matchDiscriminantProperties: boolean): Symbol | undefined {
      const result = getUnmatchedProperties(source, target, requireOptionalProperties, matchDiscriminantProperties).next();
      if (!result.done) return result.value;
    }
    typeFromInference(inference: InferenceInfo) {
      return inference.candidates ? this.unionType(inference.candidates, UnionReduction.Subtype) : inference.contraCandidates ? getIntersectionType(inference.contraCandidates) : undefined;
    }
    contravariantInference(inference: InferenceInfo) {
      return inference.priority! & InferencePriority.PriorityImpliesCombination ? getIntersectionType(inference.contraCandidates!) : getCommonSubtype(inference.contraCandidates!);
    }
    covariantInference(inference: InferenceInfo, signature: Signature) {
      const candidates = unionObjectAndArrayLiteralCandidates(inference.candidates!);
      const primitiveConstraint = hasPrimitiveConstraint(inference.typeParameter);
      const widenLiteralTypes = !primitiveConstraint && inference.topLevel && (inference.isFixed || !qf.is.typeParameterAtTopLevel(this.returnTypeOfSignature(signature), inference.typeParameter));
      const baseCandidates = primitiveConstraint ? sameMap(candidates, getRegularTypeOfLiteralType) : widenLiteralTypes ? sameMap(candidates, this.widenedLiteralType) : candidates;
      const unwidenedType = inference.priority! & InferencePriority.PriorityImpliesCombination ? this.unionType(baseCandidates, UnionReduction.Subtype) : getCommonSupertype(baseCandidates);
      return this.widenedType(unwidenedType);
    }
    inferredType(context: InferenceContext, index: number): qt.Type {
      const inference = context.inferences[index];
      if (!inference.inferredType) {
        let inferredType: qt.Type | undefined;
        const signature = context.signature;
        if (signature) {
          const inferredCovariantType = inference.candidates ? getCovariantInference(inference, signature) : undefined;
          if (inference.contraCandidates) {
            const inferredContravariantType = getContravariantInference(inference);
            inferredType =
              inferredCovariantType && !(inferredCovariantType.flags & qt.TypeFlags.Never) && isTypeSubtypeOf(inferredCovariantType, inferredContravariantType)
                ? inferredCovariantType
                : inferredContravariantType;
          } else if (inferredCovariantType) {
            inferredType = inferredCovariantType;
          } else if (context.flags & InferenceFlags.NoDefault) {
            inferredType = silentNeverType;
          } else {
            const defaultType = getDefaultFromTypeParameter(inference.typeParameter);
            if (defaultType) inferredType = instantiateType(defaultType, mergeTypeMappers(createBackreferenceMapper(context, index), context.nonFixingMapper));
          }
        } else {
          inferredType = getTypeFromInference(inference);
        }
        inference.inferredType = inferredType || getDefaultTypeArgumentType(!!(context.flags & InferenceFlags.AnyDefault));
        const constraint = getConstraintOfTypeParameter(inference.typeParameter);
        if (constraint) {
          const instantiatedConstraint = instantiateType(constraint, context.nonFixingMapper);
          if (!inferredType || !context.compareTypes(inferredType, getTypeWithThisArgument(instantiatedConstraint, inferredType))) inference.inferredType = inferredType = instantiatedConstraint;
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
        result.push(getInferredType(context, i));
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
          if (n.parent.kind === Syntax.ShorthandPropertyAssignment) return qd.msgs.No_value_exists_in_scope_for_the_shorthand_property_0_Either_declare_one_or_provide_an_initer;
          return qd.msgs.Cannot_find_name_0;
      }
    }
    resolvedSymbol(n: Identifier): Symbol {
      const links = getNodeLinks(n);
      if (!links.resolvedSymbol) {
        links.resolvedSymbol =
          (!qf.is.missing(n) &&
            resolveName(
              n,
              n.escapedText,
              qt.SymbolFlags.Value | qt.SymbolFlags.ExportValue,
              getCannotFindNameDiagnosticForName(n),
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
          const symbol = getResolvedSymbol(<Identifier>n);
          return symbol !== unknownSymbol
            ? `${flowContainer ? this.nodeId(flowContainer) : '-1'}|${getTypeId(declaredType)}|${getTypeId(initialType)}|${isConstraintPosition(n) ? '@' : ''}${symbol.getId()}`
            : undefined;
        case Syntax.ThisKeyword:
          return '0';
        case Syntax.NonNullExpression:
        case Syntax.ParenthesizedExpression:
          return getFlowCacheKey((<NonNullExpression | ParenthesizedExpression>n).expression, declaredType, initialType, flowContainer);
        case Syntax.PropertyAccessExpression:
        case Syntax.ElemAccessExpression:
          const propName = getAccessedPropertyName(<AccessExpression>n);
          if (propName !== undefined) {
            const key = getFlowCacheKey((<AccessExpression>n).expression, declaredType, initialType, flowContainer);
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
        result |= getTypeFacts(t);
      }
      return result;
    }
    typeFacts(type: qt.Type): TypeFacts {
      const flags = type.flags;
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
        const isZero = isZeroBigInt(<BigIntLiteralType>type);
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
        return getObjectFlags(type) & ObjectFlags.Anonymous && qf.is.emptyObjectType(<ObjectType>type)
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
      if (flags & qt.TypeFlags.Instantiable) return getTypeFacts(getBaseConstraintOfType(type) || unknownType);
      if (flags & qt.TypeFlags.UnionOrIntersection) return getTypeFactsOfTypes((<UnionOrIntersectionType>type).types);
      return TypeFacts.All;
    }
    typeWithFacts(type: qt.Type, include: TypeFacts) {
      return filterType(type, (t) => (getTypeFacts(t) & include) !== 0);
    }
    typeWithDefault(type: qt.Type, defaultExpression: qt.Expression) {
      if (defaultExpression) {
        const defaultType = this.typeOfExpression(defaultExpression);
        return this.unionType([getTypeWithFacts(type, TypeFacts.NEUndefined), defaultType]);
      }
      return type;
    }
    typeOfDestructuredProperty(type: qt.Type, name: qt.PropertyName) {
      const nameType = this.literalTypeFromPropertyName(name);
      if (!qf.is.typeUsableAsPropertyName(nameType)) return errorType;
      const text = getPropertyNameFromType(nameType);
      return (
        this.constraintForLocation(this.typeOfPropertyOfType(type, text), name) ||
        (NumericLiteral.name(text) && this.indexTypeOfType(type, qt.IndexKind.Number)) ||
        this.indexTypeOfType(type, qt.IndexKind.String) ||
        errorType
      );
    }
    typeOfDestructuredArrayElem(type: qt.Type, index: number) {
      return (everyType(type, qf.is.tupleLikeType) && getTupleElemType(type, index)) || check.iteratedTypeOrElemType(IterationUse.Destructuring, type, undefinedType, undefined) || errorType;
    }
    typeOfDestructuredSpreadExpression(type: qt.Type) {
      return createArrayType(check.iteratedTypeOrElemType(IterationUse.Destructuring, type, undefinedType, undefined) || errorType);
    }
    assignedTypeOfBinaryExpression(n: BinaryExpression): qt.Type {
      const isDestructuringDefaultAssignment =
        (n.parent.kind === Syntax.ArrayLiteralExpression && isDestructuringAssignmentTarget(n.parent)) ||
        (n.parent.kind === Syntax.PropertyAssignment && isDestructuringAssignmentTarget(n.parent.parent));
      return isDestructuringDefaultAssignment ? getTypeWithDefault(getAssignedType(n), n.right) : this.typeOfExpression(n.right);
    }
    assignedTypeOfArrayLiteralElem(n: ArrayLiteralExpression, elem: qt.Expression): qt.Type {
      return getTypeOfDestructuredArrayElem(getAssignedType(n), n.elems.indexOf(elem));
    }
    assignedTypeOfSpreadExpression(n: SpreadElem): qt.Type {
      return getTypeOfDestructuredSpreadExpression(getAssignedType(<ArrayLiteralExpression>n.parent));
    }
    assignedTypeOfPropertyAssignment(n: qt.PropertyAssignment | qt.ShorthandPropertyAssignment): qt.Type {
      return getTypeOfDestructuredProperty(getAssignedType(n.parent), n.name);
    }
    assignedTypeOfShorthandPropertyAssignment(n: qt.ShorthandPropertyAssignment): qt.Type {
      return getTypeWithDefault(getAssignedTypeOfPropertyAssignment(n), n.objectAssignmentIniter!);
    }
    assignedType(n: qt.Expression): qt.Type {
      const { parent } = n;
      switch (parent.kind) {
        case Syntax.ForInStatement:
          return stringType;
        case Syntax.ForOfStatement:
          return check.rightHandSideOfForOf(<ForOfStatement>parent) || errorType;
        case Syntax.BinaryExpression:
          return getAssignedTypeOfBinaryExpression(parent);
        case Syntax.DeleteExpression:
          return undefinedType;
        case Syntax.ArrayLiteralExpression:
          return getAssignedTypeOfArrayLiteralElem(<ArrayLiteralExpression>parent, n);
        case Syntax.SpreadElem:
          return getAssignedTypeOfSpreadExpression(<SpreadElem>parent);
        case Syntax.PropertyAssignment:
          return getAssignedTypeOfPropertyAssignment(<PropertyAssignment>parent);
        case Syntax.ShorthandPropertyAssignment:
          return getAssignedTypeOfShorthandPropertyAssignment(<ShorthandPropertyAssignment>parent);
      }
      return errorType;
    }
    initialTypeOfBindingElem(n: qt.BindingElem): qt.Type {
      const pattern = n.parent;
      const parentType = getInitialType(<VariableDeclaration | qt.BindingElem>pattern.parent);
      const type =
        pattern.kind === Syntax.ObjectBindingPattern
          ? getTypeOfDestructuredProperty(parentType, n.propertyName || <Identifier>n.name)
          : !n.dot3Token
          ? getTypeOfDestructuredArrayElem(parentType, pattern.elems.indexOf(n))
          : getTypeOfDestructuredSpreadExpression(parentType);
      return getTypeWithDefault(type, n.initer!);
    }
    typeOfIniter(n: qt.Expression) {
      const links = getNodeLinks(n);
      return links.resolvedType || this.typeOfExpression(n);
    }
    initialTypeOfVariableDeclaration(n: VariableDeclaration) {
      if (n.initer) return getTypeOfIniter(n.initer);
      if (n.parent.parent.kind === Syntax.ForInStatement) return stringType;
      if (n.parent.parent.kind === Syntax.ForOfStatement) return check.rightHandSideOfForOf(n.parent.parent) || errorType;
      return errorType;
    }
    initialType(n: VariableDeclaration | qt.BindingElem) {
      return n.kind === Syntax.VariableDeclaration ? getInitialTypeOfVariableDeclaration(n) : getInitialTypeOfBindingElem(n);
    }
    referenceCandidate(n: qt.Expression): Expression {
      switch (n.kind) {
        case Syntax.ParenthesizedExpression:
          return getReferenceCandidate((<ParenthesizedExpression>n).expression);
        case Syntax.BinaryExpression:
          switch (n.operatorToken.kind) {
            case Syntax.EqualsToken:
              return getReferenceCandidate(n.left);
            case Syntax.CommaToken:
              return getReferenceCandidate(n.right);
          }
      }
      return n;
    }
    referenceRoot(n: Node): Node {
      const { parent } = n;
      return parent.kind === Syntax.ParenthesizedExpression ||
        (parent.kind === Syntax.BinaryExpression && parent.operatorToken.kind === Syntax.EqualsToken && parent.left === n) ||
        (parent.kind === Syntax.BinaryExpression && parent.operatorToken.kind === Syntax.CommaToken && parent.right === n)
        ? getReferenceRoot(parent)
        : n;
    }
    typeOfSwitchClause(clause: CaseClause | DefaultClause) {
      if (clause.kind === Syntax.CaseClause) return getRegularTypeOfLiteralType(this.typeOfExpression(clause.expression));
      return neverType;
    }
    switchClauseTypes(switchStatement: SwitchStatement): qt.Type[] {
      const links = getNodeLinks(switchStatement);
      if (!links.switchTypes) {
        links.switchTypes = [];
        for (const clause of switchStatement.caseBlock.clauses) {
          links.switchTypes.push(getTypeOfSwitchClause(clause));
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
    elemTypeOfEvolvingArrayType(type: qt.Type) {
      return getObjectFlags(type) & ObjectFlags.EvolvingArray ? (<EvolvingArrayType>type).elemType : neverType;
    }
    unionOrEvolvingArrayType(types: qt.Type[], subtypeReduction: UnionReduction) {
      return isEvolvingArrayTypeList(types)
        ? getEvolvingArrayType(this.unionType(map(types, getElemTypeOfEvolvingArrayType)))
        : this.unionType(sameMap(types, finalizeEvolvingArrayType), subtypeReduction);
    }
    explicitTypeOfSymbol(symbol: Symbol, diagnostic?: qd.Diagnostic) {
      if (symbol.flags & (SymbolFlags.Function | qt.SymbolFlags.Method | qt.SymbolFlags.Class | qt.SymbolFlags.ValueModule)) return this.this.typeOfSymbol();
      if (symbol.flags & (SymbolFlags.Variable | qt.SymbolFlags.Property)) {
        const declaration = symbol.valueDeclaration;
        if (declaration) {
          if (isDeclarationWithExplicitTypeAnnotation(declaration)) return this.this.typeOfSymbol();
          if (declaration.kind === Syntax.VariableDeclaration && declaration.parent.parent.kind === Syntax.ForOfStatement) {
            const statement = declaration.parent.parent;
            const expressionType = getTypeOfDottedName(statement.expression, undefined);
            if (expressionType) {
              const use = statement.awaitModifier ? IterationUse.ForAwaitOf : IterationUse.ForOf;
              return check.iteratedTypeOrElemType(use, expressionType, undefinedType, undefined);
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
            const symbol = getExportSymbolOfValueSymbolIfExported(getResolvedSymbol(<Identifier>n));
            return getExplicitTypeOfSymbol(symbol.flags & qt.SymbolFlags.Alias ? this.resolveAlias() : symbol, diagnostic);
          case Syntax.ThisKeyword:
            return getExplicitThisType(n);
          case Syntax.SuperKeyword:
            return check.superExpression(n);
          case Syntax.PropertyAccessExpression:
            const type = getTypeOfDottedName((<PropertyAccessExpression>n).expression, diagnostic);
            const prop = type && this.propertyOfType(type, (<PropertyAccessExpression>n).name.escapedText);
            return prop && getExplicitTypeOfSymbol(prop, diagnostic);
          case Syntax.ParenthesizedExpression:
            return getTypeOfDottedName((<ParenthesizedExpression>n).expression, diagnostic);
        }
      }
    }
    effectsSignature(n: CallExpression) {
      const links = getNodeLinks(n);
      let signature = links.effectsSignature;
      if (signature === undefined) {
        let funcType: qt.Type | undefined;
        if (n.parent.kind === Syntax.ExpressionStatement) funcType = getTypeOfDottedName(n.expression, undefined);
        else if (n.expression.kind !== Syntax.SuperKeyword) {
          if (qf.is.optionalChain(n)) funcType = check.nonNullType(getOptionalExpressionType(check.expression(n.expression), n.expression), n.expression);
          else {
            funcType = check.nonNullExpression(n.expression);
          }
        }
        const signatures = getSignaturesOfType((funcType && getApparentType(funcType)) || unknownType, SignatureKind.Call);
        const candidate = signatures.length === 1 && !signatures[0].typeParameters ? signatures[0] : qu.some(signatures, hasTypePredicateOrNeverReturnType) ? getResolvedSignature(n) : undefined;
        signature = links.effectsSignature = candidate && hasTypePredicateOrNeverReturnType(candidate) ? candidate : unknownSignature;
      }
      return signature === unknownSignature ? undefined : signature;
    }
    typePredicateArgument(predicate: TypePredicate, callExpression: CallExpression) {
      if (predicate.kind === TypePredicateKind.Identifier || predicate.kind === TypePredicateKind.AssertsIdentifier) return callExpression.arguments[predicate.parameterIndex];
      const invokedExpression = qc.skip.parentheses(callExpression.expression);
      return qf.is.accessExpression(invokedExpression) ? qc.skip.parentheses(invokedExpression.expression) : undefined;
    }
    flowTypeOfReference(reference: Node, declaredType: qt.Type, initialType = declaredType, flowContainer?: Node, couldBeUninitialized?: boolean) {
      let key: string | undefined;
      let keySet = false;
      let flowDepth = 0;
      if (flowAnalysisDisabled) return errorType;
      if (!reference.flowNode || (!couldBeUninitialized && !(declaredType.flags & qt.TypeFlags.Narrowable))) return declaredType;
      flowInvocationCount++;
      const sharedFlowStart = sharedFlowCount;
      const evolvedType = getTypeFromFlowType(getTypeAtFlowNode(reference.flowNode));
      sharedFlowCount = sharedFlowStart;
      const resultType = getObjectFlags(evolvedType) & ObjectFlags.EvolvingArray && isEvolvingArrayOperationTarget(reference) ? autoArrayType : finalizeEvolvingArrayType(evolvedType);
      if (
        resultType === unreachableNeverType ||
        (reference.parent && reference.parent.kind === Syntax.NonNullExpression && getTypeWithFacts(resultType, TypeFacts.NEUndefinedOrNull).flags & qt.TypeFlags.Never)
      ) {
        return declaredType;
      }
      return resultType;
      function getOrSetCacheKey() {
        if (keySet) return key;
        keySet = true;
        return (key = getFlowCacheKey(reference, declaredType, initialType, flowContainer));
      }
      function getTypeAtFlowNode(flow: FlowNode): FlowType {
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
            type = getTypeAtFlowAssignment(<FlowAssignment>flow);
            if (!type) {
              flow = (<FlowAssignment>flow).antecedent;
              continue;
            }
          } else if (flags & FlowFlags.Call) {
            type = getTypeAtFlowCall(<FlowCall>flow);
            if (!type) {
              flow = (<FlowCall>flow).antecedent;
              continue;
            }
          } else if (flags & FlowFlags.Condition) {
            type = getTypeAtFlowCondition(<FlowCondition>flow);
          } else if (flags & FlowFlags.SwitchClause) {
            type = getTypeAtSwitchClause(<FlowSwitchClause>flow);
          } else if (flags & FlowFlags.Label) {
            if ((<FlowLabel>flow).antecedents!.length === 1) {
              flow = (<FlowLabel>flow).antecedents![0];
              continue;
            }
            type = flags & FlowFlags.BranchLabel ? getTypeAtFlowBranchLabel(<FlowLabel>flow) : getTypeAtFlowLoopLabel(<FlowLabel>flow);
          } else if (flags & FlowFlags.ArrayMutation) {
            type = getTypeAtFlowArrayMutation(<FlowArrayMutation>flow);
            if (!type) {
              flow = (<FlowArrayMutation>flow).antecedent;
              continue;
            }
          } else if (flags & FlowFlags.ReduceLabel) {
            const target = (<FlowReduceLabel>flow).target;
            const saveAntecedents = target.antecedents;
            target.antecedents = (<FlowReduceLabel>flow).antecedents;
            type = getTypeAtFlowNode((<FlowReduceLabel>flow).antecedent);
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
      function getInitialOrAssignedType(flow: FlowAssignment) {
        const n = flow.node;
        return this.constraintForLocation(
          n.kind === Syntax.VariableDeclaration || n.kind === Syntax.BindingElem ? getInitialType(<VariableDeclaration | qt.BindingElem>n) : getAssignedType(n),
          reference
        );
      }
      function getTypeAtFlowAssignment(flow: FlowAssignment) {
        const n = flow.node;
        if (qf.is.matchingReference(reference, n)) {
          if (!isReachableFlowNode(flow)) return unreachableNeverType;
          if (this.assignmentTargetKind(n) === AssignmentKind.Compound) {
            const flowType = getTypeAtFlowNode(flow.antecedent);
            return createFlowType(getBaseTypeOfLiteralType(getTypeFromFlowType(flowType)), isIncomplete(flowType));
          }
          if (declaredType === autoType || declaredType === autoArrayType) {
            if (isEmptyArrayAssignment(n)) return getEvolvingArrayType(neverType);
            const assignedType = this.widenedLiteralType(getInitialOrAssignedType(flow));
            return qf.is.typeAssignableTo(assignedType, declaredType) ? assignedType : anyArrayType;
          }
          if (declaredType.flags & qt.TypeFlags.Union) return getAssignmentReducedType(<UnionType>declaredType, getInitialOrAssignedType(flow));
          return declaredType;
        }
        if (containsMatchingReference(reference, n)) {
          if (!isReachableFlowNode(flow)) return unreachableNeverType;
          if (n.kind === Syntax.VariableDeclaration && (qf.is.inJSFile(n) || qf.is.varConst(n))) {
            const init = this.declaredExpandoIniter(n);
            if (init && (init.kind === Syntax.FunctionExpression || init.kind === Syntax.ArrowFunction)) return getTypeAtFlowNode(flow.antecedent);
          }
          return declaredType;
        }
        if (n.kind === Syntax.VariableDeclaration && n.parent.parent.kind === Syntax.ForInStatement && qf.is.matchingReference(reference, n.parent.parent.expression))
          return this.nonNullableTypeIfNeeded(getTypeFromFlowType(getTypeAtFlowNode(flow.antecedent)));
        return;
      }
      function narrowTypeByAssertion(type: qt.Type, expr: qt.Expression): qt.Type {
        const n = qc.skip.parentheses(expr);
        if (n.kind === Syntax.FalseKeyword) return unreachableNeverType;
        if (n.kind === Syntax.BinaryExpression) {
          if (n.operatorToken.kind === Syntax.Ampersand2Token) return narrowTypeByAssertion(narrowTypeByAssertion(type, n.left), n.right);
          if (n.operatorToken.kind === Syntax.Bar2Token) return this.unionType([narrowTypeByAssertion(type, n.left), narrowTypeByAssertion(type, n.right)]);
        }
        return narrowType(type, n, true);
      }
      function getTypeAtFlowCall(flow: FlowCall): FlowType | undefined {
        const signature = getEffectsSignature(flow.node);
        if (signature) {
          const predicate = getTypePredicateOfSignature(signature);
          if (predicate && (predicate.kind === TypePredicateKind.AssertsThis || predicate.kind === TypePredicateKind.AssertsIdentifier)) {
            const flowType = getTypeAtFlowNode(flow.antecedent);
            const type = finalizeEvolvingArrayType(getTypeFromFlowType(flowType));
            const narrowedType = predicate.type
              ? narrowTypeByTypePredicate(type, predicate, flow.node, true)
              : predicate.kind === TypePredicateKind.AssertsIdentifier && predicate.parameterIndex >= 0 && predicate.parameterIndex < flow.node.arguments.length
              ? narrowTypeByAssertion(type, flow.node.arguments[predicate.parameterIndex])
              : type;
            return narrowedType === type ? flowType : createFlowType(narrowedType, isIncomplete(flowType));
          }
          if (this.returnTypeOfSignature(signature).flags & qt.TypeFlags.Never) return unreachableNeverType;
        }
        return;
      }
      function getTypeAtFlowArrayMutation(flow: FlowArrayMutation): FlowType | undefined {
        if (declaredType === autoType || declaredType === autoArrayType) {
          const n = flow.node;
          const expr = n.kind === Syntax.CallExpression ? (<PropertyAccessExpression>n.expression).expression : (<ElemAccessExpression>n.left).expression;
          if (qf.is.matchingReference(reference, getReferenceCandidate(expr))) {
            const flowType = getTypeAtFlowNode(flow.antecedent);
            const type = getTypeFromFlowType(flowType);
            if (getObjectFlags(type) & ObjectFlags.EvolvingArray) {
              let evolvedType = <EvolvingArrayType>type;
              if (n.kind === Syntax.CallExpression) {
                for (const arg of n.arguments) {
                  evolvedType = addEvolvingArrayElemType(evolvedType, arg);
                }
              } else {
                const indexType = getContextFreeTypeOfExpression((<ElemAccessExpression>n.left).argumentExpression);
                if (qf.is.typeAssignableToKind(indexType, qt.TypeFlags.NumberLike)) evolvedType = addEvolvingArrayElemType(evolvedType, n.right);
              }
              return evolvedType === type ? flowType : createFlowType(evolvedType, isIncomplete(flowType));
            }
            return flowType;
          }
        }
        return;
      }
      function getTypeAtFlowCondition(flow: FlowCondition): FlowType {
        const flowType = getTypeAtFlowNode(flow.antecedent);
        const type = getTypeFromFlowType(flowType);
        if (type.flags & qt.TypeFlags.Never) return flowType;
        const assumeTrue = (flow.flags & FlowFlags.TrueCondition) !== 0;
        const nonEvolvingType = finalizeEvolvingArrayType(type);
        const narrowedType = narrowType(nonEvolvingType, flow.node, assumeTrue);
        if (narrowedType === nonEvolvingType) return flowType;
        const incomplete = isIncomplete(flowType);
        const resultType = incomplete && narrowedType.flags & qt.TypeFlags.Never ? silentNeverType : narrowedType;
        return createFlowType(resultType, incomplete);
      }
      function getTypeAtSwitchClause(flow: FlowSwitchClause): FlowType {
        const expr = flow.switchStatement.expression;
        const flowType = getTypeAtFlowNode(flow.antecedent);
        let type = getTypeFromFlowType(flowType);
        if (qf.is.matchingReference(reference, expr)) type = narrowTypeBySwitchOnDiscriminant(type, flow.switchStatement, flow.clauseStart, flow.clauseEnd);
        else if (expr.kind === Syntax.TypeOfExpression && qf.is.matchingReference(reference, (expr as TypeOfExpression).expression)) {
          type = narrowBySwitchOnTypeOf(type, flow.switchStatement, flow.clauseStart, flow.clauseEnd);
        } else {
          if (strictNullChecks) {
            if (optionalChainContainsReference(expr, reference))
              type = narrowTypeBySwitchOptionalChainContainment(type, flow.switchStatement, flow.clauseStart, flow.clauseEnd, (t) => !(t.flags & (TypeFlags.Undefined | qt.TypeFlags.Never)));
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
            type = narrowTypeByDiscriminant(type, expr as AccessExpression, (t) => narrowTypeBySwitchOnDiscriminant(t, flow.switchStatement, flow.clauseStart, flow.clauseEnd));
        }
        return createFlowType(type, isIncomplete(flowType));
      }
      function getTypeAtFlowBranchLabel(flow: FlowLabel): FlowType {
        const antecedentTypes: qt.Type[] = [];
        let subtypeReduction = false;
        let seenIncomplete = false;
        let bypassFlow: FlowSwitchClause | undefined;
        for (const antecedent of flow.antecedents!) {
          if (!bypassFlow && antecedent.flags & FlowFlags.SwitchClause && (<FlowSwitchClause>antecedent).clauseStart === (<FlowSwitchClause>antecedent).clauseEnd) {
            bypassFlow = <FlowSwitchClause>antecedent;
            continue;
          }
          const flowType = getTypeAtFlowNode(antecedent);
          const type = getTypeFromFlowType(flowType);
          if (type === declaredType && declaredType === initialType) return type;
          pushIfUnique(antecedentTypes, type);
          if (!isTypeSubsetOf(type, declaredType)) subtypeReduction = true;
          if (isIncomplete(flowType)) seenIncomplete = true;
        }
        if (bypassFlow) {
          const flowType = getTypeAtFlowNode(bypassFlow);
          const type = getTypeFromFlowType(flowType);
          if (!contains(antecedentTypes, type) && !isExhaustiveSwitchStatement(bypassFlow.switchStatement)) {
            if (type === declaredType && declaredType === initialType) return type;
            antecedentTypes.push(type);
            if (!isTypeSubsetOf(type, declaredType)) subtypeReduction = true;
            if (isIncomplete(flowType)) seenIncomplete = true;
          }
        }
        return createFlowType(getUnionOrEvolvingArrayType(antecedentTypes, subtypeReduction ? UnionReduction.Subtype : UnionReduction.Literal), seenIncomplete);
      }
      function getTypeAtFlowLoopLabel(flow: FlowLabel): FlowType {
        const id = getFlowNodeId(flow);
        const cache = flowLoopCaches[id] || (flowLoopCaches[id] = new qu.QMap<Type>());
        const key = getOrSetCacheKey();
        if (!key) return declaredType;
        const cached = cache.get(key);
        if (cached) return cached;
        for (let i = flowLoopStart; i < flowLoopCount; i++) {
          if (flowLoopNodes[i] === flow && flowLoopKeys[i] === key && flowLoopTypes[i].length) return createFlowType(getUnionOrEvolvingArrayType(flowLoopTypes[i], UnionReduction.Literal), true);
        }
        const antecedentTypes: qt.Type[] = [];
        let subtypeReduction = false;
        let firstAntecedentType: FlowType | undefined;
        for (const antecedent of flow.antecedents!) {
          let flowType;
          if (!firstAntecedentType) flowType = firstAntecedentType = getTypeAtFlowNode(antecedent);
          else {
            flowLoopNodes[flowLoopCount] = flow;
            flowLoopKeys[flowLoopCount] = key;
            flowLoopTypes[flowLoopCount] = antecedentTypes;
            flowLoopCount++;
            const saveFlowTypeCache = flowTypeCache;
            flowTypeCache = undefined;
            flowType = getTypeAtFlowNode(antecedent);
            flowTypeCache = saveFlowTypeCache;
            flowLoopCount--;
            const cached = cache.get(key);
            if (cached) return cached;
          }
          const type = getTypeFromFlowType(flowType);
          pushIfUnique(antecedentTypes, type);
          if (!isTypeSubsetOf(type, declaredType)) subtypeReduction = true;
          if (type === declaredType) break;
        }
        const result = getUnionOrEvolvingArrayType(antecedentTypes, subtypeReduction ? UnionReduction.Subtype : UnionReduction.Literal);
        if (isIncomplete(firstAntecedentType!)) return createFlowType(result, true);
        cache.set(key, result);
        return result;
      }
      function isMatchingReferenceDiscriminant(expr: Expression, computedType: qt.Type) {
        const type = declaredType.flags & qt.TypeFlags.Union ? declaredType : computedType;
        if (!(type.flags & qt.TypeFlags.Union) || !qf.is.accessExpression(expr)) return false;
        const name = getAccessedPropertyName(expr);
        if (name === undefined) return false;
        return qf.is.matchingReference(reference, expr.expression) && isDiscriminantProperty(type, name);
      }
      function narrowTypeByDiscriminant(type: qt.Type, access: AccessExpression, narrowType: (t: qt.Type) => qt.Type): qt.Type {
        const propName = getAccessedPropertyName(access);
        if (propName === undefined) return type;
        const propType = this.typeOfPropertyOfType(type, propName);
        if (!propType) return type;
        const narrowedPropType = narrowType(propType);
        return filterType(type, (t) => {
          const discriminantType = getTypeOfPropertyOrIndexSignature(t, propName);
          return !(discriminantType.flags & qt.TypeFlags.Never) && isTypeComparableTo(discriminantType, narrowedPropType);
        });
      }
      function narrowTypeByTruthiness(type: qt.Type, expr: Expression, assumeTrue: boolean): qt.Type {
        if (qf.is.matchingReference(reference, expr)) return getTypeWithFacts(type, assumeTrue ? TypeFacts.Truthy : TypeFacts.Falsy);
        if (strictNullChecks && assumeTrue && optionalChainContainsReference(expr, reference)) type = getTypeWithFacts(type, TypeFacts.NEUndefinedOrNull);
        if (qf.is.matchingReferenceDiscriminant(expr, type)) return narrowTypeByDiscriminant(type, <AccessExpression>expr, (t) => getTypeWithFacts(t, assumeTrue ? TypeFacts.Truthy : TypeFacts.Falsy));
        return type;
      }
      function isTypePresencePossible(type: qt.Type, propName: qu.__String, assumeTrue: boolean) {
        if (this.indexInfoOfType(type, qt.IndexKind.String)) return true;
        const prop = this.propertyOfType(type, propName);
        if (prop) return prop.flags & qt.SymbolFlags.Optional ? true : assumeTrue;
        return !assumeTrue;
      }
      function narrowByInKeyword(type: qt.Type, literal: LiteralExpression, assumeTrue: boolean) {
        if (type.flags & (TypeFlags.Union | qt.TypeFlags.Object) || isThisTypeParameter(type)) {
          const propName = qy.get.escUnderscores(literal.text);
          return filterType(type, (t) => isTypePresencePossible(t, propName, assumeTrue));
        }
        return type;
      }
      function narrowTypeByBinaryExpression(type: qt.Type, expr: BinaryExpression, assumeTrue: boolean): qt.Type {
        switch (expr.operatorToken.kind) {
          case Syntax.EqualsToken:
            return narrowTypeByTruthiness(narrowType(type, expr.right, assumeTrue), expr.left, assumeTrue);
          case Syntax.Equals2Token:
          case Syntax.ExclamationEqualsToken:
          case Syntax.Equals3Token:
          case Syntax.ExclamationEquals2Token:
            const operator = expr.operatorToken.kind;
            const left = getReferenceCandidate(expr.left);
            const right = getReferenceCandidate(expr.right);
            if (left.kind === Syntax.TypeOfExpression && qf.is.stringLiteralLike(right)) return narrowTypeByTypeof(type, <TypeOfExpression>left, operator, right, assumeTrue);
            if (right.kind === Syntax.TypeOfExpression && qf.is.stringLiteralLike(left)) return narrowTypeByTypeof(type, <TypeOfExpression>right, operator, left, assumeTrue);
            if (qf.is.matchingReference(reference, left)) return narrowTypeByEquality(type, operator, right, assumeTrue);
            if (qf.is.matchingReference(reference, right)) return narrowTypeByEquality(type, operator, left, assumeTrue);
            if (strictNullChecks) {
              if (optionalChainContainsReference(left, reference)) type = narrowTypeByOptionalChainContainment(type, operator, right, assumeTrue);
              else if (optionalChainContainsReference(right, reference)) {
                type = narrowTypeByOptionalChainContainment(type, operator, left, assumeTrue);
              }
            }
            if (qf.is.matchingReferenceDiscriminant(left, type)) return narrowTypeByDiscriminant(type, <AccessExpression>left, (t) => narrowTypeByEquality(t, operator, right, assumeTrue));
            if (qf.is.matchingReferenceDiscriminant(right, type)) return narrowTypeByDiscriminant(type, <AccessExpression>right, (t) => narrowTypeByEquality(t, operator, left, assumeTrue));
            if (isMatchingConstructorReference(left)) return narrowTypeByConstructor(type, operator, right, assumeTrue);
            if (isMatchingConstructorReference(right)) return narrowTypeByConstructor(type, operator, left, assumeTrue);
            break;
          case Syntax.InstanceOfKeyword:
            return narrowTypeByInstanceof(type, expr, assumeTrue);
          case Syntax.InKeyword:
            const target = getReferenceCandidate(expr.right);
            if (qf.is.stringLiteralLike(expr.left) && qf.is.matchingReference(reference, target)) return narrowByInKeyword(type, expr.left, assumeTrue);
            break;
          case Syntax.CommaToken:
            return narrowType(type, expr.right, assumeTrue);
        }
        return type;
      }
      function narrowTypeByOptionalChainContainment(type: qt.Type, operator: Syntax, value: Expression, assumeTrue: boolean): qt.Type {
        const equalsOperator = operator === Syntax.Equals2Token || operator === Syntax.Equals3Token;
        const nullableFlags = operator === Syntax.Equals2Token || operator === Syntax.ExclamationEqualsToken ? qt.TypeFlags.Nullable : qt.TypeFlags.Undefined;
        const valueType = this.typeOfExpression(value);
        const removeNullable =
          (equalsOperator !== assumeTrue && everyType(valueType, (t) => !!(t.flags & nullableFlags))) ||
          (equalsOperator === assumeTrue && everyType(valueType, (t) => !(t.flags & (TypeFlags.AnyOrUnknown | nullableFlags))));
        return removeNullable ? getTypeWithFacts(type, TypeFacts.NEUndefinedOrNull) : type;
      }
      function narrowTypeByEquality(type: qt.Type, operator: Syntax, value: Expression, assumeTrue: boolean): qt.Type {
        if (type.flags & qt.TypeFlags.Any) return type;
        if (operator === Syntax.ExclamationEqualsToken || operator === Syntax.ExclamationEquals2Token) assumeTrue = !assumeTrue;
        const valueType = this.typeOfExpression(value);
        if (type.flags & qt.TypeFlags.Unknown && assumeTrue && (operator === Syntax.Equals3Token || operator === Syntax.ExclamationEquals2Token)) {
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
          return getTypeWithFacts(type, facts);
        }
        if (type.flags & qt.TypeFlags.NotUnionOrUnit) return type;
        if (assumeTrue) {
          const filterFn: (t: qt.Type) => boolean =
            operator === Syntax.Equals2Token ? (t) => areTypesComparable(t, valueType) || isCoercibleUnderDoubleEquals(t, valueType) : (t) => areTypesComparable(t, valueType);
          const narrowedType = filterType(type, filterFn);
          return narrowedType.flags & qt.TypeFlags.Never ? type : replacePrimitivesWithLiterals(narrowedType, valueType);
        }
        if (isUnitType(valueType)) {
          const regularType = getRegularTypeOfLiteralType(valueType);
          return filterType(type, (t) => (isUnitType(t) ? !areTypesComparable(t, valueType) : getRegularTypeOfLiteralType(t) !== regularType));
        }
        return type;
      }
      function narrowTypeByTypeof(type: qt.Type, typeOfExpr: TypeOfExpression, operator: Syntax, literal: LiteralExpression, assumeTrue: boolean): qt.Type {
        if (operator === Syntax.ExclamationEqualsToken || operator === Syntax.ExclamationEquals2Token) assumeTrue = !assumeTrue;
        const target = getReferenceCandidate(typeOfExpr.expression);
        if (!qf.is.matchingReference(reference, target)) {
          if (strictNullChecks && optionalChainContainsReference(target, reference) && assumeTrue === (literal.text !== 'undefined')) return getTypeWithFacts(type, TypeFacts.NEUndefinedOrNull);
          return type;
        }
        if (type.flags & qt.TypeFlags.Any && literal.text === 'function') return type;
        if (assumeTrue && type.flags & qt.TypeFlags.Unknown && literal.text === 'object') {
          if (typeOfExpr.parent.parent.kind === Syntax.BinaryExpression) {
            const expr = typeOfExpr.parent.parent;
            if (expr.operatorToken.kind === Syntax.Ampersand2Token && expr.right === typeOfExpr.parent && containsTruthyCheck(reference, expr.left)) return nonPrimitiveType;
          }
          return this.unionType([nonPrimitiveType, nullType]);
        }
        const facts = assumeTrue ? typeofEQFacts.get(literal.text) || TypeFacts.TypeofEQHostObject : typeofNEFacts.get(literal.text) || TypeFacts.TypeofNEHostObject;
        const impliedType = getImpliedTypeFromTypeofGuard(type, literal.text);
        return getTypeWithFacts(assumeTrue && impliedType ? mapType(type, narrowUnionMemberByTypeof(impliedType)) : type, facts);
      }
      function narrowTypeBySwitchOptionalChainContainment(type: qt.Type, switchStatement: SwitchStatement, clauseStart: number, clauseEnd: number, clauseCheck: (type: qt.Type) => boolean) {
        const everyClauseChecks = clauseStart !== clauseEnd && every(getSwitchClauseTypes(switchStatement).slice(clauseStart, clauseEnd), clauseCheck);
        return everyClauseChecks ? getTypeWithFacts(type, TypeFacts.NEUndefinedOrNull) : type;
      }
      function narrowTypeBySwitchOnDiscriminant(type: qt.Type, switchStatement: SwitchStatement, clauseStart: number, clauseEnd: number) {
        const switchTypes = getSwitchClauseTypes(switchStatement);
        if (!switchTypes.length) return type;
        const clauseTypes = switchTypes.slice(clauseStart, clauseEnd);
        const hasDefaultClause = clauseStart === clauseEnd || contains(clauseTypes, neverType);
        if (type.flags & qt.TypeFlags.Unknown && !hasDefaultClause) {
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
                filterType(type, (t) => areTypesComparable(discriminantType, t)),
                discriminantType
              );
        if (!hasDefaultClause) return caseType;
        const defaultType = filterType(type, (t) => !(isUnitType(t) && contains(switchTypes, getRegularTypeOfLiteralType(t))));
        return caseType.flags & qt.TypeFlags.Never ? defaultType : this.unionType([caseType, defaultType]);
      }
      function getImpliedTypeFromTypeofGuard(type: qt.Type, text: string) {
        switch (text) {
          case 'function':
            return type.flags & qt.TypeFlags.Any ? type : globalFunctionType;
          case 'object':
            return type.flags & qt.TypeFlags.Unknown ? this.unionType([nonPrimitiveType, nullType]) : type;
          default:
            return typeofTypesByName.get(text);
        }
      }
      function narrowUnionMemberByTypeof(candidate: qt.Type) {
        return (type: qt.Type) => {
          if (isTypeSubtypeOf(type, candidate)) return type;
          if (isTypeSubtypeOf(candidate, type)) return candidate;
          if (type.flags & qt.TypeFlags.Instantiable) {
            const constraint = getBaseConstraintOfType(type) || anyType;
            if (isTypeSubtypeOf(candidate, constraint)) return getIntersectionType([type, candidate]);
          }
          return type;
        };
      }
      function narrowBySwitchOnTypeOf(type: qt.Type, switchStatement: SwitchStatement, clauseStart: number, clauseEnd: number): qt.Type {
        const switchWitnesses = getSwitchClauseTypeOfWitnesses(switchStatement, true);
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
          switchFacts = getFactsFromTypeofSwitch(fixedClauseStart, fixedClauseEnd, witnesses, hasDefaultClause);
        } else {
          clauseWitnesses = <string[]>switchWitnesses.slice(clauseStart, clauseEnd);
          switchFacts = getFactsFromTypeofSwitch(clauseStart, clauseEnd, <string[]>switchWitnesses, hasDefaultClause);
        }
        if (hasDefaultClause) return filterType(type, (t) => (getTypeFacts(t) & switchFacts) === switchFacts);
        const impliedType = getTypeWithFacts(this.unionType(clauseWitnesses.map((text) => getImpliedTypeFromTypeofGuard(type, text) || type)), switchFacts);
        return getTypeWithFacts(mapType(type, narrowUnionMemberByTypeof(impliedType)), switchFacts);
      }
      function isMatchingConstructorReference(expr: qt.Expression) {
        return (
          ((expr.kind === Syntax.PropertyAccessExpression && idText(expr.name) === 'constructor') ||
            (expr.kind === Syntax.ElemAccessExpression && qf.is.stringLiteralLike(expr.argumentExpression) && expr.argumentExpression.text === 'constructor')) &&
          qf.is.matchingReference(reference, expr.expression)
        );
      }
      function narrowTypeByConstructor(type: qt.Type, operator: Syntax, identifier: Expression, assumeTrue: boolean): qt.Type {
        if (assumeTrue ? operator !== Syntax.Equals2Token && operator !== Syntax.Equals3Token : operator !== Syntax.ExclamationEqualsToken && operator !== Syntax.ExclamationEquals2Token) return type;
        const identifierType = this.typeOfExpression(identifier);
        if (!qf.is.functionType(identifierType) && !isConstructorType(identifierType)) return type;
        const prototypeProperty = this.propertyOfType(identifierType, 'prototype' as qu.__String);
        if (!prototypeProperty) return type;
        const prototypeType = this.typeOfSymbol(prototypeProperty);
        const candidate = !qf.is.typeAny(prototypeType) ? prototypeType : undefined;
        if (!candidate || candidate === globalObjectType || candidate === globalFunctionType) return type;
        if (qf.is.typeAny(type)) return candidate;
        return filterType(type, (t) => isConstructedBy(t, candidate));
        function isConstructedBy(source: qt.Type, target: qt.Type) {
          if ((source.flags & qt.TypeFlags.Object && getObjectFlags(source) & ObjectFlags.Class) || (target.flags & qt.TypeFlags.Object && getObjectFlags(target) & ObjectFlags.Class))
            return source.symbol === target.symbol;
          return isTypeSubtypeOf(source, target);
        }
      }
      function narrowTypeByInstanceof(type: qt.Type, expr: BinaryExpression, assumeTrue: boolean): qt.Type {
        const left = getReferenceCandidate(expr.left);
        if (!qf.is.matchingReference(reference, left)) {
          if (assumeTrue && strictNullChecks && optionalChainContainsReference(left, reference)) return getTypeWithFacts(type, TypeFacts.NEUndefinedOrNull);
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
        if (qf.is.typeAny(type) && (targetType === globalObjectType || targetType === globalFunctionType)) return type;
        if (!targetType) {
          const constructSignatures = getSignaturesOfType(rightType, SignatureKind.Construct);
          targetType = constructSignatures.length ? this.unionType(map(constructSignatures, (signature) => this.returnTypeOfSignature(getErasedSignature(signature)))) : emptyObjectType;
        }
        return getNarrowedType(type, targetType, assumeTrue, qf.is.typeDerivedFrom);
      }
      function getNarrowedType(type: qt.Type, candidate: qt.Type, assumeTrue: boolean, isRelated: (source: qt.Type, target: qt.Type) => boolean) {
        if (!assumeTrue) return filterType(type, (t) => !isRelated(t, candidate));
        if (type.flags & qt.TypeFlags.Union) {
          const assignableType = filterType(type, (t) => isRelated(t, candidate));
          if (!(assignableType.flags & qt.TypeFlags.Never)) return assignableType;
        }
        return isTypeSubtypeOf(candidate, type)
          ? candidate
          : qf.is.typeAssignableTo(type, candidate)
          ? type
          : qf.is.typeAssignableTo(candidate, type)
          ? candidate
          : getIntersectionType([type, candidate]);
      }
      function narrowTypeByCallExpression(type: qt.Type, callExpression: CallExpression, assumeTrue: boolean): qt.Type {
        if (hasMatchingArgument(callExpression, reference)) {
          const signature = assumeTrue || !qf.is.callChain(callExpression) ? getEffectsSignature(callExpression) : undefined;
          const predicate = signature && getTypePredicateOfSignature(signature);
          if (predicate && (predicate.kind === TypePredicateKind.This || predicate.kind === TypePredicateKind.Identifier))
            return narrowTypeByTypePredicate(type, predicate, callExpression, assumeTrue);
        }
        return type;
      }
      function narrowTypeByTypePredicate(type: qt.Type, predicate: TypePredicate, callExpression: CallExpression, assumeTrue: boolean): qt.Type {
        if (predicate.type && !(qf.is.typeAny(type) && (predicate.type === globalObjectType || predicate.type === globalFunctionType))) {
          const predicateArgument = getTypePredicateArgument(predicate, callExpression);
          if (predicateArgument) {
            if (qf.is.matchingReference(reference, predicateArgument)) return getNarrowedType(type, predicate.type, assumeTrue, isTypeSubtypeOf);
            if (strictNullChecks && assumeTrue && optionalChainContainsReference(predicateArgument, reference) && !(getTypeFacts(predicate.type) & TypeFacts.EQUndefined))
              type = getTypeWithFacts(type, TypeFacts.NEUndefinedOrNull);
            if (qf.is.matchingReferenceDiscriminant(predicateArgument, type))
              return narrowTypeByDiscriminant(type, predicateArgument as AccessExpression, (t) => getNarrowedType(t, predicate.type!, assumeTrue, isTypeSubtypeOf));
          }
        }
        return type;
      }
      function narrowType(type: qt.Type, expr: Expression, assumeTrue: boolean): qt.Type {
        if (qf.is.expressionOfOptionalChainRoot(expr) || (expr.parent.kind === Syntax.BinaryExpression && expr.parent.operatorToken.kind === Syntax.Question2Token && expr.parent.left === expr))
          return narrowTypeByOptionality(type, expr, assumeTrue);
        switch (expr.kind) {
          case Syntax.Identifier:
          case Syntax.ThisKeyword:
          case Syntax.SuperKeyword:
          case Syntax.PropertyAccessExpression:
          case Syntax.ElemAccessExpression:
            return narrowTypeByTruthiness(type, expr, assumeTrue);
          case Syntax.CallExpression:
            return narrowTypeByCallExpression(type, <CallExpression>expr, assumeTrue);
          case Syntax.ParenthesizedExpression:
            return narrowType(type, (<ParenthesizedExpression>expr).expression, assumeTrue);
          case Syntax.BinaryExpression:
            return narrowTypeByBinaryExpression(type, expr, assumeTrue);
          case Syntax.PrefixUnaryExpression:
            if ((<PrefixUnaryExpression>expr).operator === Syntax.ExclamationToken) return narrowType(type, (<PrefixUnaryExpression>expr).operand, !assumeTrue);
            break;
        }
        return type;
      }
      function narrowTypeByOptionality(type: qt.Type, expr: Expression, assumePresent: boolean): qt.Type {
        if (qf.is.matchingReference(reference, expr)) return getTypeWithFacts(type, assumePresent ? TypeFacts.NEUndefinedOrNull : TypeFacts.EQUndefinedOrNull);
        if (qf.is.matchingReferenceDiscriminant(expr, type))
          return narrowTypeByDiscriminant(type, <AccessExpression>expr, (t) => getTypeWithFacts(t, assumePresent ? TypeFacts.NEUndefinedOrNull : TypeFacts.EQUndefinedOrNull));
        return type;
      }
    }
    typeOfSymbolAtLocation(symbol: Symbol, location: Node) {
      symbol = symbol.exportSymbol || symbol;
      if (location.kind === Syntax.Identifier) {
        if (qf.is.rightSideOfQualifiedNameOrPropertyAccess(location)) location = location.parent;
        if (qf.is.expressionNode(location) && !qf.is.assignmentTarget(location)) {
          const type = this.typeOfExpression(location);
          if (getExportSymbolOfValueSymbolIfExported(getNodeLinks(location).resolvedSymbol) === symbol) return type;
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
    constraintForLocation(type: qt.Type, n: Node): Type;
    constraintForLocation(type: qt.Type | undefined, n: Node): qt.Type | undefined;
    constraintForLocation(type: qt.Type, n: Node): qt.Type | undefined {
      if (type && isConstraintPosition(n) && forEachType(type, typeHasNullableConstraint)) return mapType(this.widenedType(type), getBaseConstraintOrType);
      return type;
    }
    partOfForStatementContainingNode(n: Node, container: ForStatement) {
      return qc.findAncestor(n, (n) => (n === container ? 'quit' : n === container.initer || n === container.condition || n === container.incrementor || n === container.statement));
    }
    explicitThisType(n: qt.Expression) {
      const container = this.thisContainer(n, false);
      if (qf.is.functionLike(container)) {
        const signature = this.signatureFromDeclaration(container);
        if (signature.thisParameter) return getExplicitTypeOfSymbol(signature.thisParameter);
      }
      if (qf.is.classLike(container.parent)) {
        const symbol = this.symbolOfNode(container.parent);
        return qf.has.syntacticModifier(container, ModifierFlags.Static) ? this.this.typeOfSymbol() : (getDeclaredTypeOfSymbol(symbol) as InterfaceType).thisType!;
      }
    }
    classNameFromPrototypeMethod(container: Node) {
      if (
        container.kind === Syntax.FunctionExpression &&
        container.parent.kind === Syntax.BinaryExpression &&
        this.assignmentDeclarationKind(container.parent) === AssignmentDeclarationKind.PrototypeProperty
      ) {
        return ((container.parent.left as PropertyAccessExpression).expression as PropertyAccessExpression).expression;
      } else if (
        container.kind === Syntax.MethodDeclaration &&
        container.parent.kind === Syntax.ObjectLiteralExpression &&
        container.parent.parent.kind === Syntax.BinaryExpression &&
        this.assignmentDeclarationKind(container.parent.parent) === AssignmentDeclarationKind.Prototype
      ) {
        return (container.parent.parent.left as PropertyAccessExpression).expression;
      } else if (
        container.kind === Syntax.FunctionExpression &&
        container.parent.kind === Syntax.PropertyAssignment &&
        container.parent.parent.kind === Syntax.ObjectLiteralExpression &&
        qf.is.kind(qc.BinaryExpression, container.parent.parent.parent) &&
        this.assignmentDeclarationKind(container.parent.parent.parent) === AssignmentDeclarationKind.Prototype
      ) {
        return (container.parent.parent.parent.left as PropertyAccessExpression).expression;
      } else if (
        container.kind === Syntax.FunctionExpression &&
        container.parent.kind === Syntax.PropertyAssignment &&
        container.parent.name.kind === Syntax.Identifier &&
        (container.parent.name.escapedText === 'value' || container.parent.name.escapedText === 'get' || container.parent.name.escapedText === 'set') &&
        container.parent.parent.kind === Syntax.ObjectLiteralExpression &&
        qf.is.kind(qc.CallExpression, container.parent.parent.parent) &&
        container.parent.parent.parent.arguments[2] === container.parent.parent &&
        this.assignmentDeclarationKind(container.parent.parent.parent) === AssignmentDeclarationKind.ObjectDefinePrototypeProperty
      ) {
        return (container.parent.parent.parent.arguments[0] as PropertyAccessExpression).expression;
      } else if (
        container.kind === Syntax.MethodDeclaration &&
        container.name.kind === Syntax.Identifier &&
        (container.name.escapedText === 'value' || container.name.escapedText === 'get' || container.name.escapedText === 'set') &&
        container.parent.kind === Syntax.ObjectLiteralExpression &&
        container.parent.parent.kind === Syntax.CallExpression &&
        container.parent.parent.arguments[2] === container.parent &&
        this.assignmentDeclarationKind(container.parent.parent) === AssignmentDeclarationKind.ObjectDefinePrototypeProperty
      ) {
        return (container.parent.parent.arguments[0] as PropertyAccessExpression).expression;
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
    containingObjectLiteral(func: SignatureDeclaration): ObjectLiteralExpression | undefined {
      return (func.kind === Syntax.MethodDeclaration || func.kind === Syntax.GetAccessor || func.kind === Syntax.SetAccessor) && func.parent.kind === Syntax.ObjectLiteralExpression
        ? func.parent
        : func.kind === Syntax.FunctionExpression && func.parent.kind === Syntax.PropertyAssignment
        ? <ObjectLiteralExpression>func.parent.parent
        : undefined;
    }
    thisTypeArgument(type: qt.Type): qt.Type | undefined {
      return getObjectFlags(type) & ObjectFlags.Reference && (<TypeReference>type).target === globalThisType ? getTypeArguments(<TypeReference>type)[0] : undefined;
    }
    thisTypeFromContextualType(type: qt.Type): qt.Type | undefined {
      return mapType(type, (t) => {
        return t.flags & qt.TypeFlags.Intersection ? forEach((<IntersectionType>t).types, getThisTypeArgument) : getThisTypeArgument(t);
      });
    }
    contextualThisParameterType(func: SignatureDeclaration): qt.Type | undefined {
      if (func.kind === Syntax.ArrowFunction) return;
      if (qf.is.contextSensitiveFunctionOrObjectLiteralMethod(func)) {
        const contextualSignature = getContextualSignature(func);
        if (contextualSignature) {
          const thisParameter = contextualSignature.thisParameter;
          if (thisParameter) return this.typeOfSymbol(thisParameter);
        }
      }
      const inJs = qf.is.inJSFile(func);
      if (noImplicitThis || inJs) {
        const containingLiteral = getContainingObjectLiteral(func);
        if (containingLiteral) {
          const contextualType = getApparentTypeOfContextualType(containingLiteral);
          let literal = containingLiteral;
          let type = contextualType;
          while (type) {
            const thisType = getThisTypeFromContextualType(type);
            if (thisType) return instantiateType(thisType, getMapperFromContext(getInferenceContext(containingLiteral)));
            if (literal.parent.kind !== Syntax.PropertyAssignment) break;
            literal = <ObjectLiteralExpression>literal.parent.parent;
            type = getApparentTypeOfContextualType(literal);
          }
          return this.widenedType(contextualType ? getNonNullableType(contextualType) : check.expressionCached(containingLiteral));
        }
        const parent = walkUpParenthesizedExpressions(func.parent);
        if (parent.kind === Syntax.BinaryExpression && parent.operatorToken.kind === Syntax.EqualsToken) {
          const target = parent.left;
          if (qf.is.accessExpression(target)) {
            const { expression } = target;
            if (inJs && expression.kind === Syntax.Identifier) {
              const sourceFile = parent.sourceFile;
              if (sourceFile.commonJsModuleIndicator && getResolvedSymbol(expression) === sourceFile.symbol) return;
            }
            return this.widenedType(check.expressionCached(expression));
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
        const args = getEffectiveCallArguments(iife);
        const indexOfParameter = func.parameters.indexOf(parameter);
        if (parameter.dot3Token) return getSpreadArgumentType(args, indexOfParameter, args.length, anyType, undefined);
        const links = getNodeLinks(iife);
        const cached = links.resolvedSignature;
        links.resolvedSignature = anySignature;
        const type = indexOfParameter < args.length ? this.widenedLiteralType(check.expression(args[indexOfParameter])) : parameter.initer ? undefined : undefinedWideningType;
        links.resolvedSignature = cached;
        return type;
      }
      const contextualSignature = getContextualSignature(func);
      if (contextualSignature) {
        const index = func.parameters.indexOf(parameter) - (this.thisNodeKind(ParameterDeclaration, func) ? 1 : 0);
        return parameter.dot3Token && lastOrUndefined(func.parameters) === parameter ? getRestTypeAtPosition(contextualSignature, index) : tryGetTypeAtPosition(contextualSignature, index);
      }
    }
    contextualTypeForVariableLikeDeclaration(declaration: VariableLikeDeclaration): qt.Type | undefined {
      const typeNode = this.effectiveTypeAnnotationNode(declaration);
      if (typeNode) return this.typeFromTypeNode(typeNode);
      switch (declaration.kind) {
        case Syntax.Parameter:
          return getContextuallyTypedParameterType(declaration);
        case Syntax.BindingElem:
          return getContextualTypeForBindingElem(declaration);
      }
    }
    contextualTypeForBindingElem(declaration: qt.BindingElem): qt.Type | undefined {
      const parent = declaration.parent.parent;
      const name = declaration.propertyName || declaration.name;
      const parentType = getContextualTypeForVariableLikeDeclaration(parent) || (parent.kind !== Syntax.BindingElem && parent.initer && check.declarationIniter(parent));
      if (parentType && !name.kind === Syntax.BindingPattern && !qf.is.computedNonLiteralName(name)) {
        const nameType = this.literalTypeFromPropertyName(name);
        if (qf.is.typeUsableAsPropertyName(nameType)) {
          const text = getPropertyNameFromType(nameType);
          return this.typeOfPropertyOfType(parentType, text);
        }
      }
    }
    contextualTypeForIniterExpression(n: qt.Expression): qt.Type | undefined {
      const declaration = <VariableLikeDeclaration>n.parent;
      if (qf.is.withIniter(declaration) && n === declaration.initer) {
        const result = getContextualTypeForVariableLikeDeclaration(declaration);
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
        const contextualReturnType = getContextualReturnType(func);
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
      const contextualType = getContextualType(n);
      if (contextualType) {
        const contextualAwaitedType = getAwaitedType(contextualType);
        return contextualAwaitedType && this.unionType([contextualAwaitedType, createPromiseLikeType(contextualAwaitedType)]);
      }
      return;
    }
    contextualTypeForYieldOperand(n: YieldExpression): qt.Type | undefined {
      const func = this.containingFunction(n);
      if (func) {
        const functionFlags = this.functionFlags(func);
        const contextualReturnType = getContextualReturnType(func);
        if (contextualReturnType)
          return n.asteriskToken ? contextualReturnType : getIterationTypeOfGeneratorFunctionReturnType(IterationTypeKind.Yield, contextualReturnType, (functionFlags & FunctionFlags.Async) !== 0);
      }
      return;
    }
    contextualIterationType(kind: IterationTypeKind, functionDecl: SignatureDeclaration): qt.Type | undefined {
      const isAsync = !!(this.functionFlags(functionDecl) & FunctionFlags.Async);
      const contextualReturnType = getContextualReturnType(functionDecl);
      if (contextualReturnType) return getIterationTypeOfGeneratorFunctionReturnType(kind, contextualReturnType, isAsync) || undefined;
      return;
    }
    contextualReturnType(functionDecl: SignatureDeclaration): qt.Type | undefined {
      const returnType = getReturnTypeFromAnnotation(functionDecl);
      if (returnType) return returnType;
      const signature = getContextualSignatureForFunctionLikeDeclaration(<FunctionExpression>functionDecl);
      if (signature && !isResolvingReturnTypeOfSignature(signature)) return this.returnTypeOfSignature(signature);
      return;
    }
    contextualTypeForArgument(callTarget: CallLikeExpression, arg: qt.Expression): qt.Type | undefined {
      const args = getEffectiveCallArguments(callTarget);
      const argIndex = args.indexOf(arg);
      return argIndex === -1 ? undefined : getContextualTypeForArgumentAtIndex(callTarget, argIndex);
    }
    contextualTypeForArgumentAtIndex(callTarget: CallLikeExpression, argIndex: number): qt.Type {
      const signature = getNodeLinks(callTarget).resolvedSignature === resolvingSignature ? resolvingSignature : getResolvedSignature(callTarget);
      if (qc.isJsx.openingLikeElem(callTarget) && argIndex === 0) return getEffectiveFirstArgumentForJsxSignature(signature, callTarget);
      return getTypeAtPosition(signature, argIndex);
    }
    contextualTypeForSubstitutionExpression(template: TemplateExpression, substitutionExpression: qt.Expression) {
      if (template.parent.kind === Syntax.TaggedTemplateExpression) return getContextualTypeForArgument(<TaggedTemplateExpression>template.parent, substitutionExpression);
      return;
    }
    contextualTypeForBinaryOperand(n: Expression, contextFlags?: ContextFlags): qt.Type | undefined {
      const binaryExpression = n.parent;
      const { left, operatorToken, right } = binaryExpression;
      switch (operatorToken.kind) {
        case Syntax.EqualsToken:
          if (n !== right) return;
          const contextSensitive = getIsContextSensitiveAssignmentOrContextType(binaryExpression);
          if (!contextSensitive) return;
          return contextSensitive === true ? this.typeOfExpression(left) : contextSensitive;
        case Syntax.Bar2Token:
        case Syntax.Question2Token:
          const type = getContextualType(binaryExpression, contextFlags);
          return n === right && ((type && type.pattern) || (!type && !qf.is.defaultedExpandoIniter(binaryExpression))) ? this.typeOfExpression(left) : type;
        case Syntax.Ampersand2Token:
        case Syntax.CommaToken:
          return n === right ? getContextualType(binaryExpression, contextFlags) : undefined;
        default:
          return;
      }
    }
    isContextSensitiveAssignmentOrContextType(binaryExpression: BinaryExpression): boolean | qt.Type {
      const kind = this.assignmentDeclarationKind(binaryExpression);
      switch (kind) {
        case AssignmentDeclarationKind.None:
          return true;
        case AssignmentDeclarationKind.Property:
        case AssignmentDeclarationKind.ExportsProperty:
        case AssignmentDeclarationKind.Prototype:
        case AssignmentDeclarationKind.PrototypeProperty:
          if (!binaryExpression.left.symbol) return true;
          else {
            const decl = binaryExpression.left.symbol.valueDeclaration;
            if (!decl) return false;
            const lhs = cast(binaryExpression.left, isAccessExpression);
            const overallAnnotation = this.effectiveTypeAnnotationNode(decl);
            if (overallAnnotation) return this.typeFromTypeNode(overallAnnotation);
            else if (lhs.expression.kind === Syntax.Identifier) {
              const id = lhs.expression;
              const parentSymbol = resolveName(id, id.escapedText, qt.SymbolFlags.Value, undefined, id.escapedText, true);
              if (parentSymbol) {
                const annotated = this.effectiveTypeAnnotationNode(parentSymbol.valueDeclaration);
                if (annotated) {
                  const nameStr = this.elemOrPropertyAccessName(lhs);
                  if (nameStr !== undefined) {
                    const type = getTypeOfPropertyOfContextualType(this.typeFromTypeNode(annotated), nameStr);
                    return type || false;
                  }
                }
                return false;
              }
            }
            return !qf.is.inJSFile(decl);
          }
        case AssignmentDeclarationKind.ModuleExports:
        case AssignmentDeclarationKind.ThisProperty:
          if (!binaryExpression.symbol) return true;
          if (binaryExpression.symbol.valueDeclaration) {
            const annotated = this.effectiveTypeAnnotationNode(binaryExpression.symbol.valueDeclaration);
            if (annotated) {
              const type = this.typeFromTypeNode(annotated);
              if (type) return type;
            }
          }
          if (kind === AssignmentDeclarationKind.ModuleExports) return false;
          const thisAccess = cast(binaryExpression.left, isAccessExpression);
          if (!qf.is.objectLiteralMethod(this.thisContainer(thisAccess.expression, false))) return false;
          const thisType = check.thisNodeExpression(thisAccess.expression);
          const nameStr = this.elemOrPropertyAccessName(thisAccess);
          return (nameStr !== undefined && thisType && getTypeOfPropertyOfContextualType(thisType, nameStr)) || false;
        case AssignmentDeclarationKind.ObjectDefinePropertyValue:
        case AssignmentDeclarationKind.ObjectDefinePropertyExports:
        case AssignmentDeclarationKind.ObjectDefinePrototypeProperty:
          return qu.fail('Does not apply');
        default:
          return qc.assert.never(kind);
      }
    }
    typeOfPropertyOfContextualType(type: qt.Type, name: qu.__String) {
      return mapType(
        type,
        (t) => {
          if (qf.is.genericMappedType(t)) {
            const constraint = getConstraintTypeFromMappedType(t);
            const constraintOfConstraint = getBaseConstraintOfType(constraint) || constraint;
            const propertyNameType = this.literalType(qy.get.unescUnderscores(name));
            if (qf.is.typeAssignableTo(propertyNameType, constraintOfConstraint)) return substituteIndexedMappedType(t, propertyNameType);
          } else if (t.flags & qt.TypeFlags.StructuredType) {
            const prop = this.propertyOfType(t, name);
            if (prop) return isCircularMappedProperty(prop) ? undefined : this.typeOfSymbol(prop);
            if (qf.is.tupleType(t)) {
              const restType = getRestTypeOfTupleType(t);
              if (restType && NumericLiteral.name(name) && +name >= 0) return restType;
            }
            return (NumericLiteral.name(name) && this.indexTypeOfContextualType(t, qt.IndexKind.Number)) || this.indexTypeOfContextualType(t, qt.IndexKind.String);
          }
          return;
        },
        true
      );
    }
    indexTypeOfContextualType(type: qt.Type, kind: IndexKind) {
      return mapType(type, (t) => this.indexTypeOfStructuredType(t, kind), true);
    }
    contextualTypeForObjectLiteralMethod(n: MethodDeclaration, contextFlags?: ContextFlags): qt.Type | undefined {
      qu.assert(qf.is.objectLiteralMethod(n));
      if (n.flags & NodeFlags.InWithStatement) return;
      return getContextualTypeForObjectLiteralElem(n, contextFlags);
    }
    contextualTypeForObjectLiteralElem(elem: ObjectLiteralElemLike, contextFlags?: ContextFlags) {
      const objectLiteral = <ObjectLiteralExpression>elem.parent;
      const type = getApparentTypeOfContextualType(objectLiteral, contextFlags);
      if (type) {
        if (!hasNonBindableDynamicName(elem)) {
          const symbolName = this.symbolOfNode(elem).escName;
          const propertyType = getTypeOfPropertyOfContextualType(type, symbolName);
          if (propertyType) return propertyType;
        }
        return (isNumericName(elem.name!) && this.indexTypeOfContextualType(type, qt.IndexKind.Number)) || this.indexTypeOfContextualType(type, qt.IndexKind.String);
      }
      return;
    }
    contextualTypeForElemExpression(arrayContextualType: qt.Type | undefined, index: number): qt.Type | undefined {
      return (
        arrayContextualType &&
        (getTypeOfPropertyOfContextualType(arrayContextualType, ('' + index) as qu.__String) || getIteratedTypeOrElemType(IterationUse.Elem, arrayContextualType, undefinedType, undefined, false))
      );
    }
    contextualTypeForConditionalOperand(n: Expression, contextFlags?: ContextFlags): qt.Type | undefined {
      const conditional = <ConditionalExpression>n.parent;
      return n === conditional.whenTrue || n === conditional.whenFalse ? getContextualType(conditional, contextFlags) : undefined;
    }
    contextualTypeForChildJsxExpression(n: JsxElem, child: JsxChild) {
      const attributesType = getApparentTypeOfContextualType(n.openingElem.tagName);
      const jsxChildrenPropertyName = getJsxElemChildrenPropertyName(getJsxNamespaceAt(n));
      if (!(attributesType && !qf.is.typeAny(attributesType) && jsxChildrenPropertyName && jsxChildrenPropertyName !== '')) return;
      const realChildren = getSemanticJsxChildren(n.children);
      const childIndex = realChildren.indexOf(child);
      const childFieldType = getTypeOfPropertyOfContextualType(attributesType, jsxChildrenPropertyName);
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
      return qc.isJsx.attributeLike(exprParent) ? getContextualType(n) : exprParent.kind === Syntax.JsxElem ? getContextualTypeForChildJsxExpression(exprParent, n) : undefined;
    }
    contextualTypeForJsxAttribute(attribute: JsxAttribute | JsxSpreadAttribute): qt.Type | undefined {
      if (attribute.kind === Syntax.JsxAttribute) {
        const attributesType = getApparentTypeOfContextualType(attribute.parent);
        if (!attributesType || qf.is.typeAny(attributesType)) return;
        return getTypeOfPropertyOfContextualType(attributesType, attribute.name.escapedText);
      }
      return getContextualType(attribute.parent);
    }
    apparentTypeOfContextualType(n: Expression | MethodDeclaration, contextFlags?: ContextFlags): qt.Type | undefined {
      const contextualType = qf.is.objectLiteralMethod(n) ? getContextualTypeForObjectLiteralMethod(n, contextFlags) : getContextualType(n, contextFlags);
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
      switch (parent.kind) {
        case Syntax.VariableDeclaration:
        case Syntax.Parameter:
        case Syntax.PropertyDeclaration:
        case Syntax.PropertySignature:
        case Syntax.BindingElem:
          return getContextualTypeForIniterExpression(n);
        case Syntax.ArrowFunction:
        case Syntax.ReturnStatement:
          return getContextualTypeForReturnExpression(n);
        case Syntax.YieldExpression:
          return getContextualTypeForYieldOperand(<YieldExpression>parent);
        case Syntax.AwaitExpression:
          return getContextualTypeForAwaitOperand(<AwaitExpression>parent);
        case Syntax.CallExpression:
          if ((<CallExpression>parent).expression.kind === Syntax.ImportKeyword) return stringType;
        case Syntax.NewExpression:
          return getContextualTypeForArgument(<CallExpression | NewExpression>parent, n);
        case Syntax.TypeAssertionExpression:
        case Syntax.AsExpression:
          return qf.is.constTypeReference((<AssertionExpression>parent).type) ? undefined : this.typeFromTypeNode((<AssertionExpression>parent).type);
        case Syntax.BinaryExpression:
          return getContextualTypeForBinaryOperand(n, contextFlags);
        case Syntax.PropertyAssignment:
        case Syntax.ShorthandPropertyAssignment:
          return getContextualTypeForObjectLiteralElem(<PropertyAssignment | qt.ShorthandPropertyAssignment>parent, contextFlags);
        case Syntax.SpreadAssignment:
          return getApparentTypeOfContextualType(parent.parent as ObjectLiteralExpression, contextFlags);
        case Syntax.ArrayLiteralExpression: {
          const arrayLiteral = <ArrayLiteralExpression>parent;
          const type = getApparentTypeOfContextualType(arrayLiteral, contextFlags);
          return getContextualTypeForElemExpression(type, indexOfNode(arrayLiteral.elems, n));
        }
        case Syntax.ConditionalExpression:
          return getContextualTypeForConditionalOperand(n, contextFlags);
        case Syntax.TemplateSpan:
          qu.assert(parent.parent.kind === Syntax.TemplateExpression);
          return getContextualTypeForSubstitutionExpression(<TemplateExpression>parent.parent, n);
        case Syntax.ParenthesizedExpression: {
          const tag = qf.is.inJSFile(parent) ? qc.getDoc.typeTag(parent) : undefined;
          return tag ? this.typeFromTypeNode(tag.typeExpression.type) : getContextualType(<ParenthesizedExpression>parent, contextFlags);
        }
        case Syntax.JsxExpression:
          return getContextualTypeForJsxExpression(<JsxExpression>parent);
        case Syntax.JsxAttribute:
        case Syntax.JsxSpreadAttribute:
          return getContextualTypeForJsxAttribute(<JsxAttribute | JsxSpreadAttribute>parent);
        case Syntax.JsxOpeningElem:
        case Syntax.JsxSelfClosingElem:
          return getContextualJsxElemAttributesType(<JsxOpeningLikeElem>parent, contextFlags);
      }
      return;
    }
    inferenceContext(n: Node) {
      const ancestor = qc.findAncestor(n, (n) => !!n.inferenceContext);
      return ancestor && ancestor.inferenceContext!;
    }
    contextualJsxElemAttributesType(n: JsxOpeningLikeElem, contextFlags?: ContextFlags) {
      if (n.kind === Syntax.JsxOpeningElem && n.parent.contextualType && contextFlags !== ContextFlags.Completions) return n.parent.contextualType;
      return getContextualTypeForArgumentAtIndex(n, 0);
    }
    effectiveFirstArgumentForJsxSignature(signature: Signature, n: JsxOpeningLikeElem) {
      return getJsxReferenceKind(n) !== JsxReferenceKind.Component ? getJsxPropsTypeFromCallSignature(signature, n) : getJsxPropsTypeFromClassType(signature, n);
    }
    jsxPropsTypeFromCallSignature(sig: Signature, context: JsxOpeningLikeElem) {
      let propsType = getTypeOfFirstParameterOfSignatureWithFallback(sig, unknownType);
      propsType = getJsxManagedAttributesFromLocatedAttributes(context, getJsxNamespaceAt(context), propsType);
      const intrinsicAttribs = getJsxType(JsxNames.IntrinsicAttributes, context);
      if (intrinsicAttribs !== errorType) propsType = intersectTypes(intrinsicAttribs, propsType);
      return propsType;
    }
    jsxPropsTypeForSignatureFromMember(sig: Signature, forcedLookupLocation: qu.__String) {
      if (sig.unionSignatures) {
        const results: qt.Type[] = [];
        for (const signature of sig.unionSignatures) {
          const instance = this.returnTypeOfSignature(signature);
          if (qf.is.typeAny(instance)) return instance;
          const propType = this.typeOfPropertyOfType(instance, forcedLookupLocation);
          if (!propType) return;
          results.push(propType);
        }
        return getIntersectionType(results);
      }
      const instanceType = this.returnTypeOfSignature(sig);
      return qf.is.typeAny(instanceType) ? instanceType : this.typeOfPropertyOfType(instanceType, forcedLookupLocation);
    }
    staticTypeOfReferencedJsxConstructor(context: JsxOpeningLikeElem) {
      if (isJsxIntrinsicIdentifier(context.tagName)) {
        const result = getIntrinsicAttributesTypeFromJsxOpeningLikeElem(context);
        const fakeSignature = createSignatureForJSXIntrinsic(context, result);
        return getOrCreateTypeFromSignature(fakeSignature);
      }
      const tagType = check.expressionCached(context.tagName);
      if (tagType.flags & qt.TypeFlags.StringLiteral) {
        const result = getIntrinsicAttributesTypeFromStringLiteralType(tagType as StringLiteralType, context);
        if (!result) return errorType;
        const fakeSignature = createSignatureForJSXIntrinsic(context, result);
        return getOrCreateTypeFromSignature(fakeSignature);
      }
      return tagType;
    }
    jsxManagedAttributesFromLocatedAttributes(context: JsxOpeningLikeElem, ns: Symbol, attributesType: qt.Type) {
      const managedSym = getJsxLibraryManagedAttributes(ns);
      if (managedSym) {
        const declaredManagedType = getDeclaredTypeOfSymbol(managedSym);
        const ctorType = getStaticTypeOfReferencedJsxConstructor(context);
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
    jsxPropsTypeFromClassType(sig: Signature, context: JsxOpeningLikeElem) {
      const ns = getJsxNamespaceAt(context);
      const forcedLookupLocation = getJsxElemPropertiesName(ns);
      let attributesType =
        forcedLookupLocation === undefined
          ? getTypeOfFirstParameterOfSignatureWithFallback(sig, unknownType)
          : forcedLookupLocation === ''
          ? this.returnTypeOfSignature(sig)
          : getJsxPropsTypeForSignatureFromMember(sig, forcedLookupLocation);
      if (!attributesType) {
        if (!!forcedLookupLocation && !!qu.length(context.attributes.properties))
          error(context, qd.msgs.JSX_elem_class_does_not_support_attributes_because_it_does_not_have_a_0_property, qy.get.unescUnderscores(forcedLookupLocation));
        return unknownType;
      }
      attributesType = getJsxManagedAttributesFromLocatedAttributes(context, ns, attributesType);
      if (qf.is.typeAny(attributesType)) return attributesType;
      else {
        let apparentAttributesType = attributesType;
        const intrinsicClassAttribs = getJsxType(JsxNames.IntrinsicClassAttributes, context);
        if (intrinsicClassAttribs !== errorType) {
          const typeParams = getLocalTypeParametersOfClassOrInterfaceOrTypeAlias(intrinsicClassAttribs.symbol);
          const hostClassType = this.returnTypeOfSignature(sig);
          apparentAttributesType = intersectTypes(
            typeParams
              ? createTypeReference(<GenericType>intrinsicClassAttribs, fillMissingTypeArguments([hostClassType], typeParams, getMinTypeArgumentCount(typeParams), qf.is.inJSFile(context)))
              : intrinsicClassAttribs,
            apparentAttributesType
          );
        }
        const intrinsicAttribs = getJsxType(JsxNames.IntrinsicAttributes, context);
        if (intrinsicAttribs !== errorType) apparentAttributesType = intersectTypes(intrinsicAttribs, apparentAttributesType);
        return apparentAttributesType;
      }
    }
    contextualCallSignature(type: qt.Type, n: SignatureDeclaration): Signature | undefined {
      const signatures = getSignaturesOfType(type, SignatureKind.Call);
      if (signatures.length === 1) {
        const signature = signatures[0];
        if (!isAritySmaller(signature, n)) return signature;
      }
    }
    contextualSignatureForFunctionLikeDeclaration(n: qt.FunctionLikeDeclaration): Signature | undefined {
      return isFunctionExpressionOrArrowFunction(n) || qf.is.objectLiteralMethod(n) ? getContextualSignature(<FunctionExpression>n) : undefined;
    }
    contextualSignature(n: qt.FunctionExpression | qt.ArrowFunction | MethodDeclaration): Signature | undefined {
      qu.assert(n.kind !== Syntax.MethodDeclaration || qf.is.objectLiteralMethod(n));
      const typeTagSignature = getSignatureOfTypeTag(n);
      if (typeTagSignature) return typeTagSignature;
      const type = getApparentTypeOfContextualType(n, ContextFlags.Signature);
      if (!type) return;
      if (!(type.flags & qt.TypeFlags.Union)) return getContextualCallSignature(type, n);
      let signatureList: Signature[] | undefined;
      const types = (<UnionType>type).types;
      for (const current of types) {
        const signature = getContextualCallSignature(current, n);
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
        if (kind === qt.IndexKind.String || isNumericName(n.properties[i + offset].name!)) propTypes.push(this.typeOfSymbol(properties[i]));
      }
      const unionType = propTypes.length ? this.unionType(propTypes, UnionReduction.Subtype) : undefinedType;
      return createIndexInfo(unionType, isConstContext(n));
    }
    jsxType(name: qu.__String, location: Node | undefined) {
      const namespace = getJsxNamespaceAt(location);
      const exports = namespace && namespace.getExportsOfSymbol();
      const typeSymbol = exports && getSymbol(exports, name, qt.SymbolFlags.Type);
      return typeSymbol ? getDeclaredTypeOfSymbol(typeSymbol) : errorType;
    }
    intrinsicTagSymbol(n: JsxOpeningLikeElem | JsxClosingElem): Symbol {
      const links = getNodeLinks(n);
      if (!links.resolvedSymbol) {
        const intrinsicElemsType = getJsxType(JsxNames.IntrinsicElems, n);
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
      const links = location && getNodeLinks(location);
      if (links && links.jsxNamespace) return links.jsxNamespace;
      if (!links || links.jsxNamespace !== false) {
        const namespaceName = getJsxNamespace(location);
        const resolvedNamespace = resolveName(location, namespaceName, qt.SymbolFlags.Namespace, undefined, namespaceName, false);
        if (resolvedNamespace) {
          const s = getSymbol(resolvedNamespace.resolveSymbol().getExportsOfSymbol(), JsxNames.JSX, qt.SymbolFlags.Namespace);
          const candidate = resolveSymbol(s);
          if (candidate) {
            if (links) links.jsxNamespace = candidate;
            return candidate;
          }
          if (links) links.jsxNamespace = false;
        }
      }
      return getGlobalSymbol(JsxNames.JSX, qt.SymbolFlags.Namespace, undefined)!;
    }
    nameFromJsxElemAttributesContainer(nameOfAttribPropContainer: qu.__String, jsxNamespace: Symbol): qu.__String | undefined {
      const jsxElemAttribPropInterfaceSym = jsxNamespace && getSymbol(jsxNamespace.exports!, nameOfAttribPropContainer, qt.SymbolFlags.Type);
      const jsxElemAttribPropInterfaceType = jsxElemAttribPropInterfaceSym && getDeclaredTypeOfSymbol(jsxElemAttribPropInterfaceSym);
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
      return jsxNamespace && getSymbol(jsxNamespace.exports!, JsxNames.LibraryManagedAttributes, qt.SymbolFlags.Type);
    }
    jsxElemPropertiesName(jsxNamespace: Symbol) {
      return getNameFromJsxElemAttributesContainer(JsxNames.ElemAttributesPropertyNameContainer, jsxNamespace);
    }
    jsxElemChildrenPropertyName(jsxNamespace: Symbol): qu.__String | undefined {
      return getNameFromJsxElemAttributesContainer(JsxNames.ElemChildrenAttributeNameContainer, jsxNamespace);
    }
    uninstantiatedJsxSignaturesOfType(elemType: qt.Type, caller: JsxOpeningLikeElem): readonly Signature[] {
      if (elemType.flags & qt.TypeFlags.String) return [anySignature];
      else if (elemType.flags & qt.TypeFlags.StringLiteral) {
        const intrinsicType = getIntrinsicAttributesTypeFromStringLiteralType(elemType as StringLiteralType, caller);
        if (!intrinsicType) {
          error(caller, qd.msgs.Property_0_does_not_exist_on_type_1, (elemType as StringLiteralType).value, 'JSX.' + JsxNames.IntrinsicElems);
          return empty;
        } else {
          const fakeSignature = createSignatureForJSXIntrinsic(caller, intrinsicType);
          return [fakeSignature];
        }
      }
      const apparentElemType = getApparentType(elemType);
      let signatures = getSignaturesOfType(apparentElemType, SignatureKind.Construct);
      if (signatures.length === 0) signatures = getSignaturesOfType(apparentElemType, SignatureKind.Call);
      if (signatures.length === 0 && apparentElemType.flags & qt.TypeFlags.Union)
        signatures = getUnionSignatures(map((apparentElemType as UnionType).types, (t) => getUninstantiatedJsxSignaturesOfType(t, caller)));
      return signatures;
    }
    intrinsicAttributesTypeFromStringLiteralType(type: StringLiteralType, location: Node): qt.Type | undefined {
      const intrinsicElemsType = getJsxType(JsxNames.IntrinsicElems, location);
      if (intrinsicElemsType !== errorType) {
        const stringLiteralTypeName = type.value;
        const intrinsicProp = this.propertyOfType(intrinsicElemsType, qy.get.escUnderscores(stringLiteralTypeName));
        if (intrinsicProp) return this.typeOfSymbol(intrinsicProp);
        const indexSignatureType = this.indexTypeOfType(intrinsicElemsType, qt.IndexKind.String);
        if (indexSignatureType) return indexSignatureType;
        return;
      }
      return anyType;
    }
    intrinsicAttributesTypeFromJsxOpeningLikeElem(n: JsxOpeningLikeElem): qt.Type {
      qu.assert(isJsxIntrinsicIdentifier(n.tagName));
      const links = getNodeLinks(n);
      if (!links.resolvedJsxElemAttributesType) {
        const symbol = getIntrinsicTagSymbol(n);
        if (links.jsxFlags & JsxFlags.IntrinsicNamedElem) return (links.resolvedJsxElemAttributesType = this.this.typeOfSymbol());
        else if (links.jsxFlags & JsxFlags.IntrinsicIndexedElem) return (links.resolvedJsxElemAttributesType = this.indexTypeOfType(getDeclaredTypeOfSymbol(symbol), qt.IndexKind.String)!);
        return (links.resolvedJsxElemAttributesType = errorType);
      }
      return links.resolvedJsxElemAttributesType;
    }
    jsxElemClassTypeAt(location: Node): qt.Type | undefined {
      const type = getJsxType(JsxNames.ElemClass, location);
      if (type === errorType) return;
      return type;
    }
    jsxElemTypeAt(location: Node): qt.Type {
      return getJsxType(JsxNames.Elem, location);
    }
    jsxStatelessElemTypeAt(location: Node): qt.Type | undefined {
      const jsxElemType = getJsxElemTypeAt(location);
      if (jsxElemType) return this.unionType([jsxElemType, nullType]);
    }
    jsxIntrinsicTagNamesAt(location: Node): Symbol[] {
      const intrinsics = getJsxType(JsxNames.IntrinsicElems, location);
      return intrinsics ? this.propertiesOfType(intrinsics) : empty;
    }
    declarationNodeFlagsFromSymbol(s: Symbol): NodeFlags {
      return s.valueDeclaration ? this.combinedFlagsOf(s.valueDeclaration) : 0;
    }
    thisParameterFromNodeContext(n: Node) {
      const thisContainer = this.thisContainer(n, false);
      return thisContainer && qf.is.functionLike(thisContainer) ? this.thisNodeKind(ParameterDeclaration, thisContainer) : undefined;
    }
    nonNullableTypeIfNeeded(type: qt.Type) {
      return isNullableType(type) ? getNonNullableType(type) : type;
    }
    privateIdentifierPropertyOfType(leftType: qt.Type, lexicallyScopedIdentifier: Symbol): Symbol | undefined {
      return this.propertyOfType(leftType, lexicallyScopedIdentifier.escName);
    }
    flowTypeOfAccessExpression(n: ElemAccessExpression | PropertyAccessExpression | QualifiedName, prop: Symbol | undefined, propType: qt.Type, errorNode: Node) {
      const assignmentKind = this.assignmentTargetKind(n);
      if (
        !qf.is.accessExpression(n) ||
        assignmentKind === AssignmentKind.Definite ||
        (prop && !(prop.flags & (SymbolFlags.Variable | qt.SymbolFlags.Property | qt.SymbolFlags.Accessor)) && !(prop.flags & qt.SymbolFlags.Method && propType.flags & qt.TypeFlags.Union))
      ) {
        return propType;
      }
      if (propType === autoType) return this.flowTypeOfProperty(n, prop);
      let assumeUninitialized = false;
      if (strictNullChecks && strictPropertyInitialization && n.expression.kind === Syntax.ThisKeyword) {
        const declaration = prop && prop.valueDeclaration;
        if (declaration && isInstancePropertyWithoutIniter(declaration)) {
          const flowContainer = getControlFlowContainer(n);
          if (flowContainer.kind === Syntax.Constructor && flowContainer.parent === declaration.parent && !(declaration.flags & NodeFlags.Ambient)) assumeUninitialized = true;
        }
      } else if (
        strictNullChecks &&
        prop &&
        prop.valueDeclaration &&
        prop.valueDeclaration.kind === Syntax.PropertyAccessExpression &&
        this.assignmentDeclarationPropertyAccessKind(prop.valueDeclaration) &&
        getControlFlowContainer(n) === getControlFlowContainer(prop.valueDeclaration)
      ) {
        assumeUninitialized = true;
      }
      const flowType = this.flowTypeOfReference(n, propType, assumeUninitialized ? getOptionalType(propType) : propType);
      if (assumeUninitialized && !(getFalsyFlags(propType) & qt.TypeFlags.Undefined) && getFalsyFlags(flowType) & qt.TypeFlags.Undefined) {
        error(errorNode, qd.msgs.Property_0_is_used_before_being_assigned, prop!.symbolToString());
        return propType;
      }
      return assignmentKind ? getBaseTypeOfLiteralType(flowType) : flowType;
    }
    superClass(classType: InterfaceType): qt.Type | undefined {
      const x = getBaseTypes(classType);
      if (x.length === 0) return;
      return getIntersectionType(x);
    }
    suggestedSymbolForNonexistentProperty(name: qc.Identifier | qc.PrivateIdentifier | string, containingType: qt.Type): Symbol | undefined {
      return getSpellingSuggestionForName(isString(name) ? name : idText(name), this.propertiesOfType(containingType), qt.SymbolFlags.Value);
    }
    suggestionForNonexistentProperty(name: qc.Identifier | qc.PrivateIdentifier | string, containingType: qt.Type): string | undefined {
      const suggestion = getSuggestedSymbolForNonexistentProperty(name, containingType);
      return suggestion && suggestion.name;
    }
    suggestedSymbolForNonexistentSymbol(location: Node | undefined, outerName: qu.__String, meaning: qt.SymbolFlags): Symbol | undefined {
      qu.assert(outerName !== undefined, 'outername should always be defined');
      const result = resolveNameHelper(location, outerName, meaning, undefined, outerName, false, false, (symbols, name, meaning) => {
        Debug.assertEqual(outerName, name, 'name should equal outerName');
        const symbol = getSymbol(symbols, name, meaning);
        return symbol || getSpellingSuggestionForName(qy.get.unescUnderscores(name), arrayFrom(symbols.values()), meaning);
      });
      return result;
    }
    suggestionForNonexistentSymbol(location: Node | undefined, outerName: qu.__String, meaning: qt.SymbolFlags): string | undefined {
      const symbolResult = getSuggestedSymbolForNonexistentSymbol(location, outerName, meaning);
      return symbolResult && symbolResult.name;
    }
    suggestedSymbolForNonexistentModule(name: Identifier, targetModule: Symbol): Symbol | undefined {
      return targetModule.exports && getSpellingSuggestionForName(idText(name), this.exportsOfModuleAsArray(targetModule), qt.SymbolFlags.ModuleMember);
    }
    suggestionForNonexistentExport(name: Identifier, targetModule: Symbol): string | undefined {
      const suggestion = getSuggestedSymbolForNonexistentModule(name, targetModule);
      return suggestion && suggestion.name;
    }
    suggestionForNonexistentIndexSignature(objectType: qt.Type, expr: ElemAccessExpression, keyedType: qt.Type): string | undefined {
      function hasProp(name: 'set' | 'get') {
        const prop = getPropertyOfObjectType(objectType, <__String>name);
        if (prop) {
          const s = getSingleCallSignature(this.typeOfSymbol(prop));
          return !!s && getMinArgumentCount(s) >= 1 && qf.is.typeAssignableTo(keyedType, getTypeAtPosition(s, 0));
        }
        return false;
      }
      const suggestedMethod = qf.is.assignmentTarget(expr) ? 'set' : 'get';
      if (!hasProp(suggestedMethod)) return;
      let suggestion = this.propertyAccessOrIdentifierToString(expr.expression);
      if (suggestion === undefined) suggestion = suggestedMethod;
      else {
        suggestion += '.' + suggestedMethod;
      }
      return suggestion;
    }
    spellingSuggestionForName(name: string, symbols: Symbol[], meaning: qt.SymbolFlags): Symbol | undefined {
      return getSpellingSuggestion(name, symbols, getCandidateName);
      function getCandidateName(candidate: Symbol) {
        const candidateName = candidate.name;
        if (startsWith(candidateName, '"')) return;
        if (candidate.flags & meaning) return candidateName;
        if (candidate.flags & qt.SymbolFlags.Alias) {
          const alias = candidate.tryResolveAlias();
          if (alias && alias.flags & meaning) return candidateName;
        }
        return;
      }
    }
    forInVariableSymbol(n: ForInStatement): Symbol | undefined {
      const initer = n.initer;
      if (initer.kind === Syntax.VariableDeclarationList) {
        const variable = (<VariableDeclarationList>initer).declarations[0];
        if (variable && !variable.name.kind === Syntax.BindingPattern) return this.symbolOfNode(variable);
      } else if (initer.kind === Syntax.Identifier) {
        return getResolvedSymbol(<Identifier>initer);
      }
      return;
    }
    spreadArgumentIndex(args: readonly Expression[]): number {
      return findIndex(args, isSpreadArgument);
    }
    singleCallSignature(type: qt.Type): Signature | undefined {
      return getSingleSignature(type, SignatureKind.Call, false);
    }
    singleCallOrConstructSignature(type: qt.Type): Signature | undefined {
      return getSingleSignature(type, SignatureKind.Call, false);
    }
    singleSignature(type: qt.Type, kind: SignatureKind, allowMembers: boolean): Signature | undefined {
      if (type.flags & qt.TypeFlags.Object) {
        const resolved = resolveStructuredTypeMembers(<ObjectType>type);
        if (allowMembers || (resolved.properties.length === 0 && !resolved.stringIndexInfo && !resolved.numberIndexInfo)) {
          if (kind === SignatureKind.Call && resolved.callSignatures.length === 1 && resolved.constructSignatures.length === 0) return resolved.callSignatures[0];
          if (kind === SignatureKind.Construct && resolved.constructSignatures.length === 1 && resolved.callSignatures.length === 0) return resolved.constructSignatures[0];
        }
      }
      return;
    }
    arrayifiedType(type: qt.Type) {
      return type.flags & qt.TypeFlags.Union
        ? mapType(type, getArrayifiedType)
        : type.flags & (TypeFlags.Any | qt.TypeFlags.Instantiable) || isMutableArrayOrTuple(type)
        ? type
        : qf.is.tupleType(type)
        ? createTupleType(getTypeArguments(type), type.target.minLength, type.target.hasRestElem, false, type.target.labeledElemDeclarations)
        : createArrayType(this.indexedAccessType(type, numberType));
    }
    spreadArgumentType(args: readonly Expression[], index: number, argCount: number, restType: qt.Type, context: InferenceContext | undefined) {
      if (index >= argCount - 1) {
        const arg = args[argCount - 1];
        if (isSpreadArgument(arg)) {
          return arg.kind === Syntax.SyntheticExpression
            ? createArrayType((<SyntheticExpression>arg).type)
            : getArrayifiedType(check.expressionWithContextualType((<SpreadElem>arg).expression, restType, context, CheckMode.Normal));
        }
      }
      const types = [];
      const names: (ParameterDeclaration | NamedTupleMember)[] = [];
      let spreadIndex = -1;
      for (let i = index; i < argCount; i++) {
        const contextualType = this.indexedAccessType(restType, this.literalType(i - index));
        const argType = check.expressionWithContextualType(args[i], contextualType, context, CheckMode.Normal);
        if (spreadIndex < 0 && isSpreadArgument(args[i])) spreadIndex = i - index;
        if (args[i].kind === Syntax.SyntheticExpression && (args[i] as SyntheticExpression).tupleNameSource) names.push((args[i] as SyntheticExpression).tupleNameSource!);
        const hasPrimitiveContextualType = maybeTypeOfKind(contextualType, qt.TypeFlags.Primitive | qt.TypeFlags.Index);
        types.push(hasPrimitiveContextualType ? getRegularTypeOfLiteralType(argType) : this.widenedLiteralType(argType));
      }
      return spreadIndex < 0
        ? createTupleType(types, undefined, length(names) === length(types) ? names : undefined)
        : createTupleType(append(types.slice(0, spreadIndex), this.unionType(types.slice(spreadIndex))), spreadIndex, undefined);
    }
    jsxReferenceKind(n: JsxOpeningLikeElem): JsxReferenceKind {
      if (isJsxIntrinsicIdentifier(n.tagName)) return JsxReferenceKind.Mixed;
      const tagType = getApparentType(check.expression(n.tagName));
      if (length(getSignaturesOfType(tagType, SignatureKind.Construct))) return JsxReferenceKind.Component;
      if (length(getSignaturesOfType(tagType, SignatureKind.Call))) return JsxReferenceKind.Function;
      return JsxReferenceKind.Mixed;
    }
    signatureApplicabilityError(
      n: CallLikeExpression,
      args: readonly Expression[],
      signature: Signature,
      relation: qu.QMap<RelationComparisonResult>,
      checkMode: CheckMode,
      reportErrors: boolean,
      containingMessageChain: (() => qd.MessageChain | undefined) | undefined
    ): readonly qd.Diagnostic[] | undefined {
      const errorOutputContainer: { errors?: qd.Diagnostic[]; skipLogging?: boolean } = { errors: undefined, skipLogging: true };
      if (qc.isJsx.openingLikeElem(n)) {
        if (!check.applicableSignatureForJsxOpeningLikeElem(n, signature, relation, checkMode, reportErrors, containingMessageChain, errorOutputContainer)) {
          qu.assert(!reportErrors || !!errorOutputContainer.errors, 'jsx should have errors when reporting errors');
          return errorOutputContainer.errors || empty;
        }
        return;
      }
      const thisType = getThisTypeOfSignature(signature);
      if (thisType && thisType !== voidType && n.kind !== Syntax.NewExpression) {
        const thisArgumentNode = getThisArgumentOfCall(n);
        let thisArgumentType: Type;
        if (thisArgumentNode) {
          thisArgumentType = check.expression(thisArgumentNode);
          if (qf.is.optionalChainRoot(thisArgumentNode.parent)) thisArgumentType = getNonNullableType(thisArgumentType);
          else if (qf.is.optionalChain(thisArgumentNode.parent)) {
            thisArgumentType = removeOptionalTypeMarker(thisArgumentType);
          }
        } else {
          thisArgumentType = voidType;
        }
        const errorNode = reportErrors ? thisArgumentNode || n : undefined;
        const headMessage = qd.msgs.The_this_context_of_type_0_is_not_assignable_to_method_s_this_of_type_1;
        if (!check.typeRelatedTo(thisArgumentType, thisType, relation, errorNode, headMessage, containingMessageChain, errorOutputContainer)) {
          qu.assert(!reportErrors || !!errorOutputContainer.errors, 'this parameter should have errors when reporting errors');
          return errorOutputContainer.errors || empty;
        }
      }
      const headMessage = qd.msgs.Argument_of_type_0_is_not_assignable_to_parameter_of_type_1;
      const restType = getNonArrayRestType(signature);
      const argCount = restType ? Math.min(getParameterCount(signature) - 1, args.length) : args.length;
      for (let i = 0; i < argCount; i++) {
        const arg = args[i];
        if (arg.kind !== Syntax.OmittedExpression) {
          const paramType = getTypeAtPosition(signature, i);
          const argType = check.expressionWithContextualType(arg, paramType, undefined, checkMode);
          const checkArgType = checkMode & CheckMode.SkipContextSensitive ? getRegularTypeOfObjectLiteral(argType) : argType;
          if (!check.typeRelatedToAndOptionallyElaborate(checkArgType, paramType, relation, reportErrors ? arg : undefined, arg, headMessage, containingMessageChain, errorOutputContainer)) {
            qu.assert(!reportErrors || !!errorOutputContainer.errors, 'parameter should have errors when reporting errors');
            maybeAddMissingAwaitInfo(arg, checkArgType, paramType);
            return errorOutputContainer.errors || empty;
          }
        }
      }
      if (restType) {
        const spreadType = getSpreadArgumentType(args, argCount, args.length, restType, undefined);
        const errorNode = reportErrors ? (argCount < args.length ? args[argCount] : n) : undefined;
        if (!check.typeRelatedTo(spreadType, restType, relation, errorNode, headMessage, undefined, errorOutputContainer)) {
          qu.assert(!reportErrors || !!errorOutputContainer.errors, 'rest parameter should have errors when reporting errors');
          maybeAddMissingAwaitInfo(errorNode, spreadType, restType);
          return errorOutputContainer.errors || empty;
        }
      }
      return;
      function maybeAddMissingAwaitInfo(errorNode: Node | undefined, source: qt.Type, target: qt.Type) {
        if (errorNode && reportErrors && errorOutputContainer.errors && errorOutputContainer.errors.length) {
          if (getAwaitedTypeOfPromise(target)) return;
          const awaitedTypeOfSource = getAwaitedTypeOfPromise(source);
          if (awaitedTypeOfSource && qf.is.typeRelatedTo(awaitedTypeOfSource, target, relation))
            addRelatedInfo(errorOutputContainer.errors[0], qf.create.diagnosticForNode(errorNode, qd.msgs.Did_you_forget_to_use_await));
        }
      }
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
        const args: Expression[] = [createSyntheticExpression(template, getGlobalTemplateStringsArrayType())];
        if (template.kind === Syntax.TemplateExpression) {
          forEach(template.templateSpans, (span) => {
            args.push(span.expression);
          });
        }
        return args;
      }
      if (n.kind === Syntax.Decorator) return getEffectiveDecoratorArguments(n);
      if (qc.isJsx.openingLikeElem(n)) return n.attributes.properties.length > 0 || (n.kind === Syntax.JsxOpeningElem && n.parent.children.length > 0) ? [n.attributes] : empty;
      const args = n.arguments || empty;
      const length = args.length;
      if (length && isSpreadArgument(args[length - 1]) && getSpreadArgumentIndex(args) === length - 1) {
        const spreadArgument = <SpreadElem>args[length - 1];
        const type = flowLoopCount ? check.expression(spreadArgument.expression) : check.expressionCached(spreadArgument.expression);
        if (qf.is.tupleType(type)) {
          const typeArguments = getTypeArguments(<TypeReference>type);
          const restIndex = type.target.hasRestElem ? typeArguments.length - 1 : -1;
          const syntheticArgs = map(typeArguments, (t, i) => createSyntheticExpression(spreadArgument, t, i === restIndex, type.target.labeledElemDeclarations?.[i]));
          return concatenate(args.slice(0, length - 1), syntheticArgs);
        }
      }
      return args;
    }
    effectiveDecoratorArguments(n: Decorator): readonly Expression[] {
      const parent = n.parent;
      const expr = n.expression;
      switch (parent.kind) {
        case Syntax.ClassDeclaration:
        case Syntax.ClassExpression:
          return [createSyntheticExpression(expr, this.typeOfSymbol(this.symbolOfNode(parent)))];
        case Syntax.Parameter:
          const func = <FunctionLikeDeclaration>parent.parent;
          return [
            createSyntheticExpression(expr, parent.parent.kind === Syntax.Constructor ? this.typeOfSymbol(this.symbolOfNode(func)) : errorType),
            createSyntheticExpression(expr, anyType),
            createSyntheticExpression(expr, numberType),
          ];
        case Syntax.PropertyDeclaration:
        case Syntax.MethodDeclaration:
        case Syntax.GetAccessor:
        case Syntax.SetAccessor:
          const hasPropDesc = parent.kind !== Syntax.PropertyDeclaration;
          return [
            createSyntheticExpression(expr, getParentTypeOfClassElem(<ClassElem>parent)),
            createSyntheticExpression(expr, getClassElemPropertyKeyType(<ClassElem>parent)),
            createSyntheticExpression(expr, hasPropDesc ? createTypedPropertyDescriptorType(getTypeOfNode(parent)) : anyType),
          ];
      }
      return qu.fail();
    }
    decoratorArgumentCount(n: Decorator, signature: Signature) {
      switch (n.parent.kind) {
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
        const { sourceFile, start, length } = getDiagnosticSpanForCallNode(n);
        return qf.create.fileDiagnostic(sourceFile, start, length, message, arg0, arg1, arg2, arg3);
      }
      return qf.create.diagnosticForNode(n, message, arg0, arg1, arg2, arg3);
    }
    argumentArityError(n: CallLikeExpression, signatures: readonly Signature[], args: readonly Expression[]) {
      let min = Number.POSITIVE_INFINITY;
      let max = Number.NEGATIVE_INFINITY;
      let belowArgCount = Number.NEGATIVE_INFINITY;
      let aboveArgCount = Number.POSITIVE_INFINITY;
      let argCount = args.length;
      let closestSignature: Signature | undefined;
      for (const sig of signatures) {
        const minCount = getMinArgumentCount(sig);
        const maxCount = getParameterCount(sig);
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
      const hasSpreadArgument = getSpreadArgumentIndex(args) > -1;
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
      if (closestSignature && getMinArgumentCount(closestSignature) > argCount && closestSignature.declaration) {
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
        return getDiagnosticForCallNode(n, qd.msgs.No_overload_expects_0_arguments_but_overloads_do_exist_that_expect_either_1_or_2_arguments, argCount, belowArgCount, aboveArgCount);
      if (!hasSpreadArgument && argCount < min) {
        const diagnostic = getDiagnosticForCallNode(n, error, paramRange, argCount);
        return related ? addRelatedInfo(diagnostic, related) : diagnostic;
      }
      if (hasRestParameter || hasSpreadArgument) {
        spanArray = new Nodes(args);
        if (hasSpreadArgument && argCount) {
          const nextArg = elemAt(args, getSpreadArgumentIndex(args) + 1) || undefined;
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
    typeArgumentArityError(n: Node, signatures: readonly Signature[], typeArguments: Nodes<Typing>) {
      const argCount = typeArguments.length;
      if (signatures.length === 1) {
        const sig = signatures[0];
        const min = getMinTypeArgumentCount(sig.typeParameters);
        const max = length(sig.typeParameters);
        return qf.create.diagnosticForNodes(n.sourceFile, typeArguments, qd.msgs.Expected_0_type_arguments_but_got_1, min < max ? min + '-' + max : min, argCount);
      }
      let belowArgCount = -Infinity;
      let aboveArgCount = Infinity;
      for (const sig of signatures) {
        const min = getMinTypeArgumentCount(sig.typeParameters);
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
    candidateForOverloadFailure(n: CallLikeExpression, candidates: Signature[], args: readonly Expression[], hasCandidatesOutArray: boolean): Signature {
      qu.assert(candidates.length > 0);
      check.nodeDeferred(n);
      return hasCandidatesOutArray || candidates.length === 1 || candidates.some((c) => !!c.typeParameters)
        ? pickLongestCandidateSignature(n, candidates, args)
        : createUnionOfSignaturesForOverloadFailure(candidates);
    }
    numNonRestParameters(signature: Signature): number {
      const numParams = signature.parameters.length;
      return signatureHasRestParameter(signature) ? numParams - 1 : numParams;
    }
    typeArgumentsFromNodes(typeArgumentNodes: readonly Typing[], typeParameters: readonly TypeParameter[], isJs: boolean): readonly qt.Type[] {
      const typeArguments = typeArgumentNodes.map(getTypeOfNode);
      while (typeArguments.length > typeParameters.length) {
        typeArguments.pop();
      }
      while (typeArguments.length < typeParameters.length) {
        typeArguments.push(getConstraintOfTypeParameter(typeParameters[typeArguments.length]) || getDefaultTypeArgumentType(isJs));
      }
      return typeArguments;
    }
    longestCandidateIndex(candidates: Signature[], argsCount: number): number {
      let maxParamsIndex = -1;
      let maxParams = -1;
      for (let i = 0; i < candidates.length; i++) {
        const candidate = candidates[i];
        const paramCount = getParameterCount(candidate);
        if (hasEffectiveRestParameter(candidate) || paramCount >= argsCount) return i;
        if (paramCount > maxParams) {
          maxParams = paramCount;
          maxParamsIndex = i;
        }
      }
      return maxParamsIndex;
    }
    diagnosticHeadMessageForDecoratorResolution(n: Decorator) {
      switch (n.parent.kind) {
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
    resolvedSignature(n: CallLikeExpression, candidatesOutArray?: Signature[] | undefined, checkMode?: CheckMode): Signature {
      const links = getNodeLinks(n);
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
          (decl.parent.kind === Syntax.BinaryExpression && this.symbolOfNode(decl.parent.left)) ||
          (decl.parent.kind === Syntax.VariableDeclaration && this.symbolOfNode(decl.parent)));
      const prototype = assignmentSymbol && assignmentSymbol.exports && assignmentSymbol.exports.get('prototype' as qu.__String);
      const init = prototype && prototype.valueDeclaration && getAssignedJSPrototype(prototype.valueDeclaration);
      return init ? this.symbolOfNode(init) : undefined;
    }
    assignedJSPrototype(n: Node) {
      if (!n.parent) return false;
      let parent: Node = n.parent;
      while (parent && parent.kind === Syntax.PropertyAccessExpression) {
        parent = parent.parent;
      }
      if (parent && parent.kind === Syntax.BinaryExpression && qf.is.prototypeAccess(parent.left) && parent.operatorToken.kind === Syntax.EqualsToken) {
        const right = this.initerOfBinaryExpression(parent);
        return right.kind === Syntax.ObjectLiteralExpression && right;
      }
    }
    typeWithSyntheticDefaultImportType(type: qt.Type, symbol: Symbol, originalSymbol: Symbol): qt.Type {
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
            synthType.syntheticType = qf.is.validSpreadType(type) ? getSpreadType(type, defaultContainingObject, anonymousSymbol, false) : defaultContainingObject;
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
    parameterNameAtPosition(signature: Signature, pos: number) {
      const paramCount = signature.parameters.length - (signatureHasRestParameter(signature) ? 1 : 0);
      if (pos < paramCount) return signature.parameters[pos].escName;
      const restParameter = signature.parameters[paramCount] || unknownSymbol;
      const restType = this.typeOfSymbol(restParameter);
      if (qf.is.tupleType(restType)) {
        const associatedNames = (<TupleType>(<TypeReference>restType).target).labeledElemDeclarations;
        const index = pos - paramCount;
        return (associatedNames && getTupleElemLabel(associatedNames[index])) || ((restParameter.escName + '_' + index) as qu.__String);
      }
      return restParameter.escName;
    }
    nameableDeclarationAtPosition(signature: Signature, pos: number) {
      const paramCount = signature.parameters.length - (signatureHasRestParameter(signature) ? 1 : 0);
      if (pos < paramCount) {
        const decl = signature.parameters[pos].valueDeclaration;
        return decl && isValidDeclarationForTupleLabel(decl) ? decl : undefined;
      }
      const restParameter = signature.parameters[paramCount] || unknownSymbol;
      const restType = this.typeOfSymbol(restParameter);
      if (qf.is.tupleType(restType)) {
        const associatedNames = (<TupleType>(<TypeReference>restType).target).labeledElemDeclarations;
        const index = pos - paramCount;
        return associatedNames && associatedNames[index];
      }
      return restParameter.valueDeclaration && isValidDeclarationForTupleLabel(restParameter.valueDeclaration) ? restParameter.valueDeclaration : undefined;
    }
    typeAtPosition(signature: Signature, pos: number): qt.Type {
      return tryGetTypeAtPosition(signature, pos) || anyType;
    }
    restTypeAtPosition(source: Signature, pos: number): qt.Type {
      const paramCount = getParameterCount(source);
      const restType = getEffectiveRestType(source);
      const nonRestCount = paramCount - (restType ? 1 : 0);
      if (restType && pos === nonRestCount) return restType;
      const types = [];
      let names: (NamedTupleMember | ParameterDeclaration)[] | undefined = [];
      for (let i = pos; i < nonRestCount; i++) {
        types.push(getTypeAtPosition(source, i));
        const name = getNameableDeclarationAtPosition(source, i);
        if (name && names) names.push(name);
        else names = undefined;
      }
      if (restType) {
        types.push(this.indexedAccessType(restType, numberType));
        const name = getNameableDeclarationAtPosition(source, nonRestCount);
        if (name && names) names.push(name);
        else names = undefined;
      }
      const minArgumentCount = getMinArgumentCount(source);
      const minLength = minArgumentCount < pos ? 0 : minArgumentCount - pos;
      return createTupleType(types, minLength, !!restType, false, names);
    }
    parameterCount(signature: Signature) {
      const length = signature.parameters.length;
      if (signatureHasRestParameter(signature)) {
        const restType = this.typeOfSymbol(signature.parameters[length - 1]);
        if (qf.is.tupleType(restType)) return length + getTypeArguments(restType).length - 1;
      }
      return length;
    }
    minArgumentCount(signature: Signature, strongArityForUntypedJS?: boolean) {
      if (signatureHasRestParameter(signature)) {
        const restType = this.typeOfSymbol(signature.parameters[signature.parameters.length - 1]);
        if (qf.is.tupleType(restType)) {
          const minLength = restType.target.minLength;
          if (minLength > 0) return signature.parameters.length - 1 + minLength;
        }
      }
      if (!strongArityForUntypedJS && signature.flags & SignatureFlags.IsUntypedSignatureInJSFile) return 0;
      return signature.minArgumentCount;
    }
    effectiveRestType(signature: Signature) {
      if (signatureHasRestParameter(signature)) {
        const restType = this.typeOfSymbol(signature.parameters[signature.parameters.length - 1]);
        return qf.is.tupleType(restType) ? getRestArrayTypeOfTupleType(restType) : restType;
      }
      return;
    }
    nonArrayRestType(signature: Signature) {
      const restType = getEffectiveRestType(signature);
      return restType && !qf.is.arrayType(restType) && !qf.is.typeAny(restType) && (getReducedType(restType).flags & qt.TypeFlags.Never) === 0 ? restType : undefined;
    }
    typeOfFirstParameterOfSignature(signature: Signature) {
      return getTypeOfFirstParameterOfSignatureWithFallback(signature, neverType);
    }
    typeOfFirstParameterOfSignatureWithFallback(signature: Signature, fallbackType: qt.Type) {
      return signature.parameters.length > 0 ? getTypeAtPosition(signature, 0) : fallbackType;
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
        returnType = check.expressionCached(func.body, checkMode && checkMode & ~CheckMode.SkipGenericFunctions);
        if (isAsync) returnType = check.awaitedType(returnType, func, qd.msgs.The_return_type_of_an_async_function_must_either_be_a_valid_promise_or_must_not_contain_a_callable_then_member);
      } else if (isGenerator) {
        const returnTypes = check.andAggregateReturnExpressionTypes(func, checkMode);
        if (!returnTypes) fallbackReturnType = neverType;
        else if (returnTypes.length > 0) returnType = this.unionType(returnTypes, UnionReduction.Subtype);
        const { yieldTypes, nextTypes } = check.andAggregateYieldOperandTypes(func, checkMode);
        yieldType = qu.some(yieldTypes) ? this.unionType(yieldTypes, UnionReduction.Subtype) : undefined;
        nextType = qu.some(nextTypes) ? getIntersectionType(nextTypes) : undefined;
      } else {
        const types = check.andAggregateReturnExpressionTypes(func, checkMode);
        if (!types) return functionFlags & FunctionFlags.Async ? createPromiseReturnType(func, neverType) : neverType;
        if (types.length === 0) return functionFlags & FunctionFlags.Async ? createPromiseReturnType(func, voidType) : voidType;
        returnType = this.unionType(types, UnionReduction.Subtype);
      }
      if (returnType || yieldType || nextType) {
        if (yieldType) reportErrorsFromWidening(func, yieldType, WideningKind.GeneratorYield);
        if (returnType) reportErrorsFromWidening(func, returnType, WideningKind.FunctionReturn);
        if (nextType) reportErrorsFromWidening(func, nextType, WideningKind.GeneratorNext);
        if ((returnType && isUnitType(returnType)) || (yieldType && isUnitType(yieldType)) || (nextType && isUnitType(nextType))) {
          const contextualSignature = getContextualSignatureForFunctionLikeDeclaration(func);
          const contextualType = !contextualSignature
            ? undefined
            : contextualSignature === this.signatureFromDeclaration(func)
            ? isGenerator
              ? undefined
              : returnType
            : instantiateContextualType(this.returnTypeOfSignature(contextualSignature), func);
          if (isGenerator) {
            yieldType = getWidenedLiteralLikeTypeForContextualIterationTypeIfNeeded(yieldType, contextualType, IterationTypeKind.Yield, isAsync);
            returnType = getWidenedLiteralLikeTypeForContextualIterationTypeIfNeeded(returnType, contextualType, IterationTypeKind.Return, isAsync);
            nextType = getWidenedLiteralLikeTypeForContextualIterationTypeIfNeeded(nextType, contextualType, IterationTypeKind.Next, isAsync);
          } else returnType = getWidenedLiteralLikeTypeForContextualReturnTypeIfNeeded(returnType, contextualType, isAsync);
        }
        if (yieldType) yieldType = this.widenedType(yieldType);
        if (returnType) returnType = this.widenedType(returnType);
        if (nextType) nextType = this.widenedType(nextType);
      }
      if (isGenerator)
        return createGeneratorReturnType(yieldType || neverType, returnType || fallbackReturnType, nextType || getContextualIterationType(IterationTypeKind.Next, func) || unknownType, isAsync);
      return isAsync ? createPromiseType(returnType || fallbackReturnType) : returnType || fallbackReturnType;
    }
    yieldedTypeOfYieldExpression(n: YieldExpression, expressionType: qt.Type, sentType: qt.Type, isAsync: boolean): qt.Type | undefined {
      const errorNode = n.expression || n;
      const yieldedType = n.asteriskToken ? check.iteratedTypeOrElemType(isAsync ? IterationUse.AsyncYieldStar : IterationUse.YieldStar, expressionType, sentType, errorNode) : expressionType;
      return !isAsync
        ? yieldedType
        : getAwaitedType(
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
      const leftBase = getBaseTypeOfLiteralType(leftType);
      const rightBase = getBaseTypeOfLiteralType(rightType);
      if (!isRelated(leftBase, rightBase)) {
        effectiveLeft = leftBase;
        effectiveRight = rightBase;
      }
      return [effectiveLeft, effectiveRight];
    }
    contextNode(n: qt.Expression): Node {
      if (n.kind === Syntax.JsxAttributes && !n.parent.kind === Syntax.JsxSelfClosingElem) return n.parent.parent;
      return n;
    }
    uniqueTypeParameters(context: InferenceContext, typeParameters: readonly TypeParameter[]): readonly TypeParameter[] {
      const result: TypeParameter[] = [];
      let oldTypeParameters: TypeParameter[] | undefined;
      let newTypeParameters: TypeParameter[] | undefined;
      for (const tp of typeParameters) {
        const name = tp.symbol.escName;
        if (hasTypeParameterByName(context.inferredTypeParameters, name) || hasTypeParameterByName(result, name)) {
          const newName = getUniqueTypeParameterName(concatenate(context.inferredTypeParameters, result), name);
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
        if (!hasTypeParameterByName(typeParameters, augmentedName)) return augmentedName;
      }
    }
    returnTypeOfSingleNonGenericCallSignature(funcType: qt.Type) {
      const signature = getSingleCallSignature(funcType);
      if (signature && !signature.typeParameters) return this.returnTypeOfSignature(signature);
    }
    returnTypeOfSingleNonGenericSignatureOfCallChain(expr: CallChain) {
      const funcType = check.expression(expr.expression);
      const nonOptionalType = getOptionalExpressionType(funcType, expr.expression);
      const returnType = getReturnTypeOfSingleNonGenericCallSignature(funcType);
      return returnType && propagateOptionalTypeMarker(returnType, expr, nonOptionalType !== funcType);
    }
    typeOfExpression(n: qt.Expression) {
      const quickType = getQuickTypeOfExpression(n);
      if (quickType) return quickType;
      if (n.flags & NodeFlags.TypeCached && flowTypeCache) {
        const cachedType = flowTypeCache[this.nodeId(n)];
        if (cachedType) return cachedType;
      }
      const startInvocationCount = flowInvocationCount;
      const type = check.expression(n);
      if (flowInvocationCount !== startInvocationCount) {
        const cache = flowTypeCache || (flowTypeCache = []);
        cache[this.nodeId(n)] = type;
        n.flags |= NodeFlags.TypeCached;
      }
      return type;
    }
    quickTypeOfExpression(n: qt.Expression) {
      const expr = qc.skip.parentheses(n);
      if (expr.kind === Syntax.CallExpression && expr.expression.kind !== Syntax.SuperKeyword && !qf.is.requireCall(expr, true) && !isSymbolOrSymbolForCall(expr)) {
        const type = qf.is.callChain(expr) ? getReturnTypeOfSingleNonGenericSignatureOfCallChain(expr) : getReturnTypeOfSingleNonGenericCallSignature(check.nonNullExpression(expr.expression));
        if (type) return type;
      } else if (qf.is.assertionExpression(expr) && !qf.is.constTypeReference(expr.type)) {
        return this.typeFromTypeNode((<TypeAssertion>expr).type);
      } else if (n.kind === Syntax.NumericLiteral || n.kind === Syntax.StringLiteral || n.kind === Syntax.TrueKeyword || n.kind === Syntax.FalseKeyword) {
        return check.expression(n);
      }
      return;
    }
    contextFreeTypeOfExpression(n: qt.Expression) {
      const links = getNodeLinks(n);
      if (links.contextFreeType) return links.contextFreeType;
      const saveContextualType = n.contextualType;
      n.contextualType = anyType;
      try {
        const type = (links.contextFreeType = check.expression(n, CheckMode.SkipContextSensitive));
        return type;
      } finally {
        n.contextualType = saveContextualType;
      }
    }
    typePredicateParent(n: Node): SignatureDeclaration | undefined {
      switch (n.parent.kind) {
        case Syntax.ArrowFunction:
        case Syntax.CallSignature:
        case Syntax.FunctionDeclaration:
        case Syntax.FunctionExpression:
        case Syntax.FunctionTyping:
        case Syntax.MethodDeclaration:
        case Syntax.MethodSignature:
          const parent = <SignatureDeclaration>n.parent;
          if (n === parent.type) return parent;
      }
    }
    effectiveTypeArguments(n: qt.TypingReference | ExpressionWithTypings, typeParameters: readonly TypeParameter[]): qt.Type[] {
      return fillMissingTypeArguments(map(n.typeArguments!, this.typeFromTypeNode), typeParameters, getMinTypeArgumentCount(typeParameters), qf.is.inJSFile(n));
    }
    typeParametersForTypeReference(n: qt.TypingReference | ExpressionWithTypings) {
      const type = getTypeFromTypeReference(n);
      if (type !== errorType) {
        const symbol = getNodeLinks(n).resolvedSymbol;
        if (symbol) {
          return (
            (symbol.flags & qt.SymbolFlags.TypeAlias && s.getLinks(symbol).typeParameters) ||
            (getObjectFlags(type) & ObjectFlags.Reference ? (<TypeReference>type).target.localTypeParameters : undefined)
          );
        }
      }
      return;
    }
    typeArgumentConstraint(n: Typing): qt.Type | undefined {
      const typeReferenceNode = qu.tryCast(n.parent, isTypeReferenceType);
      if (!typeReferenceNode) return;
      const typeParameters = getTypeParametersForTypeReference(typeReferenceNode)!;
      const constraint = getConstraintOfTypeParameter(typeParameters[typeReferenceNode.typeArguments!.indexOf(n)]);
      return constraint && instantiateType(constraint, createTypeMapper(typeParameters, getEffectiveTypeArguments(typeReferenceNode, typeParameters)));
    }
    effectiveDeclarationFlags(n: qt.Declaration, flagsToCheck: ModifierFlags): ModifierFlags {
      let flags = this.combinedModifierFlags(n);
      if (n.parent.kind !== Syntax.InterfaceDeclaration && n.parent.kind !== Syntax.ClassDeclaration && n.parent.kind !== Syntax.ClassExpression && n.flags & NodeFlags.Ambient) {
        if (!(flags & ModifierFlags.Ambient) && !(n.parent.kind === Syntax.ModuleBlock && n.parent.parent.kind === Syntax.ModuleDeclaration && qf.is.globalScopeAugmentation(n.parent.parent)))
          flags |= ModifierFlags.Export;
        flags |= ModifierFlags.Ambient;
      }
      return flags & flagsToCheck;
    }
    awaitedTypeOfPromise(type: qt.Type, errorNode?: Node, diagnosticMessage?: qd.Message, arg0?: string | number): qt.Type | undefined {
      const promisedType = getPromisedTypeOfPromise(type, errorNode);
      return promisedType && getAwaitedType(promisedType, errorNode, diagnosticMessage, arg0);
    }
    promisedTypeOfPromise(type: qt.Type, errorNode?: Node): qt.Type | undefined {
      if (qf.is.typeAny(type)) return;
      const typeAsPromise = <PromiseOrAwaitableType>type;
      if (typeAsPromise.promisedTypeOfPromise) return typeAsPromise.promisedTypeOfPromise;
      if (isReferenceToType(type, getGlobalPromiseType(false))) return (typeAsPromise.promisedTypeOfPromise = getTypeArguments(<GenericType>type)[0]);
      const thenFunction = this.typeOfPropertyOfType(type, 'then' as qu.__String)!;
      if (qf.is.typeAny(thenFunction)) return;
      const thenSignatures = thenFunction ? getSignaturesOfType(thenFunction, SignatureKind.Call) : empty;
      if (thenSignatures.length === 0) {
        if (errorNode) error(errorNode, qd.msgs.A_promise_must_have_a_then_method);
        return;
      }
      const onfulfilledParameterType = getTypeWithFacts(this.unionType(map(thenSignatures, getTypeOfFirstParameterOfSignature)), TypeFacts.NEUndefinedOrNull);
      if (qf.is.typeAny(onfulfilledParameterType)) return;
      const onfulfilledParameterSignatures = getSignaturesOfType(onfulfilledParameterType, SignatureKind.Call);
      if (onfulfilledParameterSignatures.length === 0) {
        if (errorNode) error(errorNode, qd.msgs.The_first_parameter_of_the_then_method_of_a_promise_must_be_a_callback);
        return;
      }
      return (typeAsPromise.promisedTypeOfPromise = this.unionType(map(onfulfilledParameterSignatures, getTypeOfFirstParameterOfSignature), UnionReduction.Subtype));
    }
    awaitedType(type: qt.Type, errorNode?: Node, diagnosticMessage?: qd.Message, arg0?: string | number): qt.Type | undefined {
      if (qf.is.typeAny(type)) return type;
      const typeAsAwaitable = <PromiseOrAwaitableType>type;
      if (typeAsAwaitable.awaitedTypeOfType) return typeAsAwaitable.awaitedTypeOfType;
      return (typeAsAwaitable.awaitedTypeOfType = mapType(type, errorNode ? (constituentType) => getAwaitedTypeWorker(constituentType, errorNode, diagnosticMessage, arg0) : getAwaitedTypeWorker));
    }
    awaitedTypeWorker(type: qt.Type, errorNode?: Node, diagnosticMessage?: qd.Message, arg0?: string | number): qt.Type | undefined {
      const typeAsAwaitable = <PromiseOrAwaitableType>type;
      if (typeAsAwaitable.awaitedTypeOfType) return typeAsAwaitable.awaitedTypeOfType;
      const promisedType = getPromisedTypeOfPromise(type);
      if (promisedType) {
        if (type.id === promisedType.id || awaitedTypeStack.lastIndexOf(promisedType.id) >= 0) {
          if (errorNode) error(errorNode, qd.msgs.Type_is_referenced_directly_or_indirectly_in_the_fulfillment_callback_of_its_own_then_method);
          return;
        }
        awaitedTypeStack.push(type.id);
        const awaitedType = getAwaitedType(promisedType, errorNode, diagnosticMessage, arg0);
        awaitedTypeStack.pop();
        if (!awaitedType) return;
        return (typeAsAwaitable.awaitedTypeOfType = awaitedType);
      }
      if (isThenableType(type)) {
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
            return getEntityNameForDecoratorMetadataFromTypeList((<UnionOrIntersectionTyping>n).types);
          case Syntax.ConditionalTyping:
            return getEntityNameForDecoratorMetadataFromTypeList([(<ConditionalTyping>n).trueType, (<ConditionalTyping>n).falseType]);
          case Syntax.ParenthesizedTyping:
          case Syntax.NamedTupleMember:
            return getEntityNameForDecoratorMetadata((<ParenthesizedTyping>n).type);
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
        const individualEntityName = getEntityNameForDecoratorMetadata(typeNode);
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
        const iterationTypes = getIterationTypesOfIterable(inputType, use, uplevelIteration ? errorNode : undefined);
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
            if (diagnostic) check.typeAssignableTo(sentType, iterationTypes.nextType, errorNode, diagnostic);
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
          const yieldType = getIterationTypeOfIterable(use, IterationTypeKind.Yield, inputType, undefined);
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
          errorAndMaybeSuggestAwait(errorNode, maybeMissingAwait && !!getAwaitedTypeOfPromise(arrayType), defaultDiagnostic, typeToString(arrayType));
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
      const iterationTypes = getIterationTypesOfIterable(inputType, use, errorNode);
      return iterationTypes && iterationTypes[getIterationTypesKeyFromIterationTypeKind(typeKind)];
    }
    cachedIterationTypes(type: qt.Type, cacheKey: MatchingKeys<IterableOrIteratorType, IterationTypes | undefined>) {
      return (type as IterableOrIteratorType)[cacheKey];
    }
    iterationTypesOfIterable(type: qt.Type, use: IterationUse, errorNode: Node | undefined) {
      if (qf.is.typeAny(type)) return anyIterationTypes;
      if (!(type.flags & qt.TypeFlags.Union)) {
        const iterationTypes = getIterationTypesOfIterableWorker(type, use, errorNode);
        if (iterationTypes === noIterationTypes) {
          if (errorNode) reportTypeNotIterableError(errorNode, type, !!(use & IterationUse.AllowsAsyncIterablesFlag));
          return;
        }
        return iterationTypes;
      }
      const cacheKey = use & IterationUse.AllowsAsyncIterablesFlag ? 'iterationTypesOfAsyncIterable' : 'iterationTypesOfIterable';
      const cachedTypes = getCachedIterationTypes(type, cacheKey);
      if (cachedTypes) return cachedTypes === noIterationTypes ? undefined : cachedTypes;
      let allIterationTypes: IterationTypes[] | undefined;
      for (const constituent of (type as UnionType).types) {
        const iterationTypes = getIterationTypesOfIterableWorker(constituent, use, errorNode);
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
      setCachedIterationTypes(type, cacheKey, iterationTypes);
      return iterationTypes === noIterationTypes ? undefined : iterationTypes;
    }
    asyncFromSyncIterationTypes(iterationTypes: IterationTypes, errorNode: Node | undefined) {
      if (iterationTypes === noIterationTypes) return noIterationTypes;
      if (iterationTypes === anyIterationTypes) return anyIterationTypes;
      const { yieldType, returnType, nextType } = iterationTypes;
      return createIterationTypes(getAwaitedType(yieldType, errorNode) || anyType, getAwaitedType(returnType, errorNode) || anyType, nextType);
    }
    iterationTypesOfIterableWorker(type: qt.Type, use: IterationUse, errorNode: Node | undefined) {
      if (qf.is.typeAny(type)) return anyIterationTypes;
      if (use & IterationUse.AllowsAsyncIterablesFlag) {
        const iterationTypes = getIterationTypesOfIterableCached(type, asyncIterationTypesResolver) || getIterationTypesOfIterableFast(type, asyncIterationTypesResolver);
        if (iterationTypes) return iterationTypes;
      }
      if (use & IterationUse.AllowsSyncIterablesFlag) {
        const iterationTypes = getIterationTypesOfIterableCached(type, syncIterationTypesResolver) || getIterationTypesOfIterableFast(type, syncIterationTypesResolver);
        if (iterationTypes) {
          if (use & IterationUse.AllowsAsyncIterablesFlag) {
            if (iterationTypes !== noIterationTypes) return setCachedIterationTypes(type, 'iterationTypesOfAsyncIterable', getAsyncFromSyncIterationTypes(iterationTypes, errorNode));
          }
          return iterationTypes;
        }
      }
      if (use & IterationUse.AllowsAsyncIterablesFlag) {
        const iterationTypes = getIterationTypesOfIterableSlow(type, asyncIterationTypesResolver, errorNode);
        if (iterationTypes !== noIterationTypes) return iterationTypes;
      }
      if (use & IterationUse.AllowsSyncIterablesFlag) {
        const iterationTypes = getIterationTypesOfIterableSlow(type, syncIterationTypesResolver, errorNode);
        if (iterationTypes !== noIterationTypes) {
          if (use & IterationUse.AllowsAsyncIterablesFlag)
            return setCachedIterationTypes(type, 'iterationTypesOfAsyncIterable', iterationTypes ? getAsyncFromSyncIterationTypes(iterationTypes, errorNode) : noIterationTypes);
          return iterationTypes;
        }
      }
      return noIterationTypes;
    }
    iterationTypesOfIterableCached(type: qt.Type, resolver: IterationTypesResolver) {
      return getCachedIterationTypes(type, resolver.iterableCacheKey);
    }
    iterationTypesOfGlobalIterableType(globalType: qt.Type, resolver: IterationTypesResolver) {
      const globalIterationTypes = getIterationTypesOfIterableCached(globalType, resolver) || getIterationTypesOfIterableSlow(globalType, resolver, undefined);
      return globalIterationTypes === noIterationTypes ? defaultIterationTypes : globalIterationTypes;
    }
    iterationTypesOfIterableFast(type: qt.Type, resolver: IterationTypesResolver) {
      let globalType: Type;
      if (isReferenceToType(type, (globalType = resolver.getGlobalIterableType(false))) || isReferenceToType(type, (globalType = resolver.getGlobalIterableIteratorType(false)))) {
        const [yieldType] = getTypeArguments(type as GenericType);
        const { returnType, nextType } = getIterationTypesOfGlobalIterableType(globalType, resolver);
        return setCachedIterationTypes(type, resolver.iterableCacheKey, createIterationTypes(yieldType, returnType, nextType));
      }
      if (isReferenceToType(type, resolver.getGlobalGeneratorType(false))) {
        const [yieldType, returnType, nextType] = getTypeArguments(type as GenericType);
        return setCachedIterationTypes(type, resolver.iterableCacheKey, createIterationTypes(yieldType, returnType, nextType));
      }
    }
    iterationTypesOfIterableSlow(type: qt.Type, resolver: IterationTypesResolver, errorNode: Node | undefined) {
      const method = this.propertyOfType(type, qu.getPropertyNameForKnownSymbolName(resolver.iteratorSymbolName));
      const methodType = method && !(method.flags & qt.SymbolFlags.Optional) ? this.typeOfSymbol(method) : undefined;
      if (qf.is.typeAny(methodType)) return setCachedIterationTypes(type, resolver.iterableCacheKey, anyIterationTypes);
      const signatures = methodType ? getSignaturesOfType(methodType, SignatureKind.Call) : undefined;
      if (!some(signatures)) return setCachedIterationTypes(type, resolver.iterableCacheKey, noIterationTypes);
      const iteratorType = this.unionType(map(signatures, this.returnTypeOfSignature), UnionReduction.Subtype);
      const iterationTypes = getIterationTypesOfIterator(iteratorType, resolver, errorNode) ?? noIterationTypes;
      return setCachedIterationTypes(type, resolver.iterableCacheKey, iterationTypes);
    }
    iterationTypesOfIterator(type: qt.Type, resolver: IterationTypesResolver, errorNode: Node | undefined) {
      if (qf.is.typeAny(type)) return anyIterationTypes;
      const iterationTypes = getIterationTypesOfIteratorCached(type, resolver) || getIterationTypesOfIteratorFast(type, resolver) || getIterationTypesOfIteratorSlow(type, resolver, errorNode);
      return iterationTypes === noIterationTypes ? undefined : iterationTypes;
    }
    iterationTypesOfIteratorCached(type: qt.Type, resolver: IterationTypesResolver) {
      return getCachedIterationTypes(type, resolver.iteratorCacheKey);
    }
    iterationTypesOfIteratorFast(type: qt.Type, resolver: IterationTypesResolver) {
      const globalType = resolver.getGlobalIterableIteratorType(false);
      if (isReferenceToType(type, globalType)) {
        const [yieldType] = getTypeArguments(type as GenericType);
        const globalIterationTypes = getIterationTypesOfIteratorCached(globalType, resolver) || getIterationTypesOfIteratorSlow(globalType, resolver, undefined);
        const { returnType, nextType } = globalIterationTypes === noIterationTypes ? defaultIterationTypes : globalIterationTypes;
        return setCachedIterationTypes(type, resolver.iteratorCacheKey, createIterationTypes(yieldType, returnType, nextType));
      }
      if (isReferenceToType(type, resolver.getGlobalIteratorType(false)) || isReferenceToType(type, resolver.getGlobalGeneratorType(false))) {
        const [yieldType, returnType, nextType] = getTypeArguments(type as GenericType);
        return setCachedIterationTypes(type, resolver.iteratorCacheKey, createIterationTypes(yieldType, returnType, nextType));
      }
    }
    iterationTypesOfIteratorResult(type: qt.Type) {
      if (qf.is.typeAny(type)) return anyIterationTypes;
      const cachedTypes = getCachedIterationTypes(type, 'iterationTypesOfIteratorResult');
      if (cachedTypes) return cachedTypes;
      if (isReferenceToType(type, getGlobalIteratorYieldResultType(false))) {
        const yieldType = getTypeArguments(type as GenericType)[0];
        return setCachedIterationTypes(type, 'iterationTypesOfIteratorResult', createIterationTypes(yieldType, undefined));
      }
      if (isReferenceToType(type, getGlobalIteratorReturnResultType(false))) {
        const returnType = getTypeArguments(type as GenericType)[0];
        return setCachedIterationTypes(type, 'iterationTypesOfIteratorResult', createIterationTypes(undefined));
      }
      const yieldIteratorResult = filterType(type, isYieldIteratorResult);
      const yieldType = yieldIteratorResult !== neverType ? this.typeOfPropertyOfType(yieldIteratorResult, 'value' as qu.__String) : undefined;
      const returnIteratorResult = filterType(type, isReturnIteratorResult);
      const returnType = returnIteratorResult !== neverType ? this.typeOfPropertyOfType(returnIteratorResult, 'value' as qu.__String) : undefined;
      if (!yieldType && !returnType) return setCachedIterationTypes(type, 'iterationTypesOfIteratorResult', noIterationTypes);
      return setCachedIterationTypes(type, 'iterationTypesOfIteratorResult', createIterationTypes(yieldType, returnType || voidType, undefined));
    }
    iterationTypesOfMethod(type: qt.Type, resolver: IterationTypesResolver, methodName: 'next' | 'return' | 'throw', errorNode: Node | undefined): IterationTypes | undefined {
      const method = this.propertyOfType(type, methodName as qu.__String);
      if (!method && methodName !== 'next') return;
      const methodType =
        method && !(methodName === 'next' && method.flags & qt.SymbolFlags.Optional)
          ? methodName === 'next'
            ? this.typeOfSymbol(method)
            : getTypeWithFacts(this.typeOfSymbol(method), TypeFacts.NEUndefinedOrNull)
          : undefined;
      if (qf.is.typeAny(methodType)) return methodName === 'next' ? anyIterationTypes : anyIterationTypesExceptNext;
      const methodSignatures = methodType ? getSignaturesOfType(methodType, SignatureKind.Call) : empty;
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
        if (methodName !== 'throw' && qu.some(signature.parameters)) methodParameterTypes = append(methodParameterTypes, getTypeAtPosition(signature, 0));
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
      const iterationTypes = getIterationTypesOfIteratorResult(resolvedMethodReturnType);
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
    iterationTypesOfIteratorSlow(type: qt.Type, resolver: IterationTypesResolver, errorNode: Node | undefined) {
      const iterationTypes = combineIterationTypes([
        getIterationTypesOfMethod(type, resolver, 'next', errorNode),
        getIterationTypesOfMethod(type, resolver, 'return', errorNode),
        getIterationTypesOfMethod(type, resolver, 'throw', errorNode),
      ]);
      return setCachedIterationTypes(type, resolver.iteratorCacheKey, iterationTypes);
    }
    iterationTypeOfGeneratorFunctionReturnType(kind: IterationTypeKind, returnType: qt.Type, isAsyncGenerator: boolean): qt.Type | undefined {
      if (qf.is.typeAny(returnType)) return;
      const iterationTypes = getIterationTypesOfGeneratorFunctionReturnType(returnType, isAsyncGenerator);
      return iterationTypes && iterationTypes[getIterationTypesKeyFromIterationTypeKind(kind)];
    }
    iterationTypesOfGeneratorFunctionReturnType(type: qt.Type, isAsyncGenerator: boolean) {
      if (qf.is.typeAny(type)) return anyIterationTypes;
      const use = isAsyncGenerator ? IterationUse.AsyncGeneratorReturnType : IterationUse.GeneratorReturnType;
      const resolver = isAsyncGenerator ? asyncIterationTypesResolver : syncIterationTypesResolver;
      return getIterationTypesOfIterable(type, use, undefined) || getIterationTypesOfIterator(type, resolver, undefined);
    }
    nonInterhitedProperties(type: InterfaceType, baseTypes: BaseType[], properties: Symbol[]) {
      if (!qu.length(baseTypes)) return properties;
      const seen = qu.createEscapedMap<Symbol>();
      forEach(properties, (p) => {
        seen.set(p.escName, p);
      });
      for (const base of baseTypes) {
        const properties = this.propertiesOfType(getTypeWithThisArgument(base, type.thisType));
        for (const prop of properties) {
          const existing = seen.get(prop.escName);
          if (existing && !isPropertyIdenticalTo(existing, prop)) seen.delete(prop.escName);
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
      const paramTag = n.parent.parent;
      if (n.parent.kind === Syntax.DocTypingExpression && paramTag.kind === Syntax.DocParameterTag) {
        const host = this.hostSignatureFromDoc(paramTag);
        if (host) {
          const lastParamDeclaration = lastOrUndefined(host.parameters);
          const symbol = this.parameterSymbolFromDoc(paramTag);
          if (!lastParamDeclaration || (symbol && lastParamDeclaration.symbol === symbol && qf.is.restParameter(lastParamDeclaration))) return createArrayType(type);
        }
      }
      if (parent.kind === Syntax.ParameterDeclaration && parent.parent.kind === Syntax.DocFunctionTyping) return createArrayType(type);
      return addOptionality(type);
    }
    potentiallyUnusedIdentifiers(sourceFile: SourceFile): readonly PotentiallyUnusedIdentifier[] {
      return allPotentiallyUnusedIdentifiers.get(sourceFile.path) || empty;
    }
    diagnostics(sourceFile: SourceFile, ct: CancellationToken): qd.Diagnostic[] {
      try {
        cancellationToken = ct;
        return getDiagnosticsWorker(sourceFile);
      } finally {
        cancellationToken = undefined;
      }
    }
    diagnosticsWorker(sourceFile: SourceFile): qd.Diagnostic[] {
      throwIfNonDiagnosticsProducing();
      if (sourceFile) {
        const previousGlobalDiagnostics = diagnostics.getGlobalDiagnostics();
        const previousGlobalDiagnosticsSize = previousGlobalqd.msgs.length;
        check.sourceFile(sourceFile);
        const semanticDiagnostics = diagnostics.getDiagnostics(sourceFile.fileName);
        const currentGlobalDiagnostics = diagnostics.getGlobalDiagnostics();
        if (currentGlobalDiagnostics !== previousGlobalDiagnostics) {
          const deferredGlobalDiagnostics = relativeComplement(previousGlobalDiagnostics, currentGlobalDiagnostics, compareDiagnostics);
          return concatenate(deferredGlobalDiagnostics, semanticDiagnostics);
        } else if (previousGlobalDiagnosticsSize === 0 && currentGlobalqd.msgs.length > 0) {
          return concatenate(currentGlobalDiagnostics, semanticDiagnostics);
        }
        return semanticDiagnostics;
      }
      forEach(host.getSourceFiles(), checkSourceFile);
      return diagnostics.getDiagnostics();
    }
    globalDiagnostics(): qd.Diagnostic[] {
      throwIfNonDiagnosticsProducing();
      return diagnostics.getGlobalDiagnostics();
    }
    symbolsInScope(location: Node, meaning: qt.SymbolFlags): Symbol[] {
      if (location.flags & NodeFlags.InWithStatement) return [];
      const symbols = new SymbolTable();
      let isStatic = false;
      populateSymbols();
      symbols.delete(InternalSymbol.This);
      return symbolsToArray(symbols);
      function populateSymbols() {
        while (location) {
          if (location.locals && !qf.is.globalSourceFile(location)) location.locals.copy(symbols, meaning);
          switch (location.kind) {
            case Syntax.SourceFile:
              if (!qf.is.externalOrCommonJsModule(<SourceFile>location)) break;
            case Syntax.ModuleDeclaration:
              this.symbolOfNode(location as ModuleDeclaration | SourceFile).exports!.copy(symbols, meaning & qt.SymbolFlags.ModuleMember);
              break;
            case Syntax.EnumDeclaration:
              this.symbolOfNode(location as EnumDeclaration).exports!.copy(symbols, meaning & qt.SymbolFlags.EnumMember);
              break;
            case Syntax.ClassExpression:
              const className = (location as ClassExpression).name;
              if (className) copySymbol(location.symbol, symbols, meaning);
            case Syntax.ClassDeclaration:
            case Syntax.InterfaceDeclaration:
              if (!isStatic) getMembersOfSymbol(this.symbolOfNode(location as ClassDeclaration | InterfaceDeclaration)).copy(symbols, meaning & qt.SymbolFlags.Type);
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
      }
      function copySymbol(symbol: Symbol, to: SymbolTable, meaning: qt.SymbolFlags) {
        if (getCombinedLocalAndExportSymbolFlags(symbol) & meaning) {
          const id = symbol.escName;
          if (!to.has(id)) to.set(id, symbol);
        }
      }
    }
    leftSideOfImportEqualsOrExportAssignment(nOnRightSide: qt.EntityName): ImportEqualsDeclaration | ExportAssignment | undefined {
      while (nOnRightSide.parent.kind === Syntax.QualifiedName) {
        nOnRightSide = <QualifiedName>nOnRightSide.parent;
      }
      if (nOnRightSide.parent.kind === Syntax.ImportEqualsDeclaration) return nOnRightSide.parent.moduleReference === nOnRightSide ? nOnRightSide.parent : undefined;
      if (nOnRightSide.parent.kind === Syntax.ExportAssignment) return (<ExportAssignment>nOnRightSide.parent).expression === <Node>nOnRightSide ? <ExportAssignment>nOnRightSide.parent : undefined;
      return;
    }
    specialPropertyAssignmentSymbolFromEntityName(entityName: qt.EntityName | PropertyAccessExpression) {
      const specialPropertyAssignmentKind = this.assignmentDeclarationKind(entityName.parent.parent as BinaryExpression);
      switch (specialPropertyAssignmentKind) {
        case AssignmentDeclarationKind.ExportsProperty:
        case AssignmentDeclarationKind.PrototypeProperty:
          return this.symbolOfNode(entityName.parent);
        case AssignmentDeclarationKind.ThisProperty:
        case AssignmentDeclarationKind.ModuleExports:
        case AssignmentDeclarationKind.Property:
          return this.symbolOfNode(entityName.parent.parent);
      }
    }
    symbolOfNameOrPropertyAccessExpression(name: qt.EntityName | qc.PrivateIdentifier | PropertyAccessExpression): Symbol | undefined {
      if (qf.is.declarationName(name)) return this.symbolOfNode(name.parent);
      if (qf.is.inJSFile(name) && name.parent.kind === Syntax.PropertyAccessExpression && name.parent === (name.parent.parent as BinaryExpression).left) {
        if (!name.kind === Syntax.PrivateIdentifier) {
          const specialPropertyAssignmentSymbol = getSpecialPropertyAssignmentSymbolFromEntityName(name);
          if (specialPropertyAssignmentSymbol) return specialPropertyAssignmentSymbol;
        }
      }
      if (name.parent.kind === Syntax.ExportAssignment && qf.is.entityNameExpression(name)) {
        const success = resolveEntityName(name, qt.SymbolFlags.Value | qt.SymbolFlags.Type | qt.SymbolFlags.Namespace | qt.SymbolFlags.Alias, true);
        if (success && success !== unknownSymbol) return success;
      } else if (!name.kind === Syntax.PropertyAccessExpression && !name.kind === Syntax.PrivateIdentifier && isInRightSideOfImportOrExportAssignment(name)) {
        const importEqualsDeclaration = this.ancestor(name, Syntax.ImportEqualsDeclaration);
        qu.assert(importEqualsDeclaration !== undefined);
        return getSymbolOfPartOfRightHandSideOfImportEquals(name, true);
      }
      if (!name.kind === Syntax.PropertyAccessExpression && !name.kind === Syntax.PrivateIdentifier) {
        const possibleImportNode = isImportTypeQualifierPart(name);
        if (possibleImportNode) {
          this.typeFromTypeNode(possibleImportNode);
          const sym = getNodeLinks(name).resolvedSymbol;
          return sym === unknownSymbol ? undefined : sym;
        }
      }
      while (qf.is.rightSideOfQualifiedNameOrPropertyAccess(name)) {
        name = <QualifiedName | PropertyAccessEntityNameExpression>name.parent;
      }
      if (isHeritageClauseElemIdentifier(name)) {
        let meaning = qt.SymbolFlags.None;
        if (name.parent.kind === Syntax.ExpressionWithTypings) {
          meaning = qt.SymbolFlags.Type;
          if (qf.is.expressionWithTypeArgumentsInClassExtendsClause(name.parent)) meaning |= qt.SymbolFlags.Value;
        } else {
          meaning = qt.SymbolFlags.Namespace;
        }
        meaning |= qt.SymbolFlags.Alias;
        const entityNameSymbol = qf.is.entityNameExpression(name) ? resolveEntityName(name, meaning) : undefined;
        if (entityNameSymbol) return entityNameSymbol;
      }
      if (name.parent.kind === Syntax.DocParameterTag) return this.parameterSymbolFromDoc(name.parent as DocParameterTag);
      if (name.parent.kind === Syntax.TypeParameter && name.parent.parent.kind === Syntax.DocTemplateTag) {
        qu.assert(!qf.is.inJSFile(name));
        const typeParameter = this.typeParameterFromDoc(name.parent as TypeParameterDeclaration & { parent: DocTemplateTag });
        return typeParameter && typeParameter.symbol;
      }
      if (qf.is.expressionNode(name)) {
        if (qf.is.missing(name)) return;
        if (name.kind === Syntax.Identifier) {
          if (qc.isJsx.tagName(name) && isJsxIntrinsicIdentifier(name)) {
            const symbol = getIntrinsicTagSymbol(<JsxOpeningLikeElem>name.parent);
            return symbol === unknownSymbol ? undefined : symbol;
          }
          return resolveEntityName(name, qt.SymbolFlags.Value, false, true);
        } else if (name.kind === Syntax.PropertyAccessExpression || name.kind === Syntax.QualifiedName) {
          const links = getNodeLinks(name);
          if (links.resolvedSymbol) return links.resolvedSymbol;
          if (name.kind === Syntax.PropertyAccessExpression) check.propertyAccessExpression(name);
          else {
            check.qualifiedName(name);
          }
          return links.resolvedSymbol;
        }
      } else if (isTypeReferenceIdentifier(<EntityName>name)) {
        const meaning = name.parent.kind === Syntax.TypingReference ? qt.SymbolFlags.Type : qt.SymbolFlags.Namespace;
        return resolveEntityName(<EntityName>name, meaning, false, true);
      }
      if (name.parent.kind === Syntax.TypingPredicate) return resolveEntityName(<Identifier>name, qt.SymbolFlags.FunctionScopedVariable);
      return;
    }
    symbolAtLocation(n: Node, ignoreErrors?: boolean): Symbol | undefined {
      if (n.kind === Syntax.SourceFile) return qf.is.externalModule(<SourceFile>n) ? this.mergedSymbol(n.symbol) : undefined;
      const { parent } = n;
      const grandParent = parent.parent;
      if (n.flags & NodeFlags.InWithStatement) return;
      if (qf.is.declarationNameOrImportPropertyName(n)) {
        const parentSymbol = this.symbolOfNode(parent)!;
        return qf.is.importOrExportSpecifier(n.parent) && n.parent.propertyName === n ? getImmediateAliasedSymbol(parentSymbol) : parentSymbol;
      } else if (qf.is.literalComputedPropertyDeclarationName(n)) {
        return this.symbolOfNode(parent.parent);
      }
      if (n.kind === Syntax.Identifier) {
        if (isInRightSideOfImportOrExportAssignment(<Identifier>n)) return getSymbolOfNameOrPropertyAccessExpression(<Identifier>n);
        else if (parent.kind === Syntax.BindingElem && grandParent.kind === Syntax.ObjectBindingPattern && n === (<BindingElem>parent).propertyName) {
          const typeOfPattern = getTypeOfNode(grandParent);
          const propertyDeclaration = this.propertyOfType(typeOfPattern, (<Identifier>n).escapedText);
          if (propertyDeclaration) return propertyDeclaration;
        }
      }
      switch (n.kind) {
        case Syntax.Identifier:
        case Syntax.PrivateIdentifier:
        case Syntax.PropertyAccessExpression:
        case Syntax.QualifiedName:
          return getSymbolOfNameOrPropertyAccessExpression(<EntityName | qc.PrivateIdentifier | PropertyAccessExpression>n);
        case Syntax.ThisKeyword:
          const container = this.thisContainer(n, false);
          if (qf.is.functionLike(container)) {
            const sig = this.signatureFromDeclaration(container);
            if (sig.thisParameter) return sig.thisParameter;
          }
          if (qf.is.inExpressionContext(n)) return check.expression(n as qt.Expression).symbol;
        case Syntax.ThisTyping:
          return getTypeFromThisNodeTypeNode(n as ThisExpression | ThisTyping).symbol;
        case Syntax.SuperKeyword:
          return check.expression(n as qt.Expression).symbol;
        case Syntax.ConstructorKeyword:
          const constructorDeclaration = n.parent;
          if (constructorDeclaration && constructorDeclaration.kind === Syntax.Constructor) return (<ClassDeclaration>constructorDeclaration.parent).symbol;
          return;
        case Syntax.StringLiteral:
        case Syntax.NoSubstitutionLiteral:
          if (
            (qf.is.externalModuleImportEqualsDeclaration(n.parent.parent) && this.externalModuleImportEqualsDeclarationExpression(n.parent.parent) === n) ||
            ((n.parent.kind === Syntax.ImportDeclaration || n.parent.kind === Syntax.ExportDeclaration) && (<ImportDeclaration>n.parent).moduleSpecifier === n) ||
            (qf.is.inJSFile(n) && qf.is.requireCall(n.parent, false)) ||
            qf.is.importCall(n.parent) ||
            (n.parent.kind === Syntax.LiteralTyping && qf.is.literalImportTyping(n.parent.parent) && n.parent.parent.argument === n.parent)
          ) {
            return resolveExternalModuleName(n, <LiteralExpression>n, ignoreErrors);
          }
          if (parent.kind === Syntax.CallExpression && qf.is.bindableObjectDefinePropertyCall(parent) && parent.arguments[1] === n) return this.symbolOfNode(parent);
        case Syntax.NumericLiteral:
          const objectType =
            parent.kind === Syntax.ElemAccessExpression
              ? parent.argumentExpression === n
                ? this.typeOfExpression(parent.expression)
                : undefined
              : parent.kind === Syntax.LiteralTyping && grandParent.kind === Syntax.IndexedAccessTyping
              ? this.typeFromTypeNode(grandParent.objectType)
              : undefined;
          return objectType && this.propertyOfType(objectType, qy.get.escUnderscores((n as StringLiteral | NumericLiteral).text));
        case Syntax.DefaultKeyword:
        case Syntax.FunctionKeyword:
        case Syntax.EqualsGreaterThanToken:
        case Syntax.ClassKeyword:
          return this.symbolOfNode(n.parent);
        case Syntax.ImportTyping:
          return qf.is.literalImportTyping(n) ? getSymbolAtLocation(n.argument.literal, ignoreErrors) : undefined;
        case Syntax.ExportKeyword:
          return n.parent.kind === Syntax.ExportAssignment ? Debug.check.defined(n.parent.symbol) : undefined;
        default:
          return;
      }
    }
    shorthandAssignmentValueSymbol(location: Node): Symbol | undefined {
      if (location && location.kind === Syntax.ShorthandPropertyAssignment) return resolveEntityName((<ShorthandPropertyAssignment>location).name, qt.SymbolFlags.Value | qt.SymbolFlags.Alias);
      return;
    }
    exportSpecifierLocalTargetSymbol(n: ExportSpecifier): Symbol | undefined {
      return n.parent.parent.moduleSpecifier
        ? getExternalModuleMember(n.parent.parent, n)
        : resolveEntityName(n.propertyName || n.name, qt.SymbolFlags.Value | qt.SymbolFlags.Type | qt.SymbolFlags.Namespace | qt.SymbolFlags.Alias);
    }
    typeOfNode(n: Node): qt.Type {
      if (n.flags & NodeFlags.InWithStatement) return errorType;
      const classDecl = tryGetClassImplementingOrExtendingExpressionWithTypings(n);
      const classType = classDecl && getDeclaredTypeOfClassOrInterface(this.symbolOfNode(classDecl.class));
      if (qf.is.partOfTypeNode(n)) {
        const typeFromTypeNode = this.typeFromTypeNode(<Typing>n);
        return classType ? getTypeWithThisArgument(typeFromTypeNode, classType.thisType) : typeFromTypeNode;
      }
      if (qf.is.expressionNode(n)) return getRegularTypeOfExpression(n);
      if (classType && !classDecl!.isImplements) {
        const baseType = firstOrUndefined(getBaseTypes(classType));
        return baseType ? getTypeWithThisArgument(baseType, classType.thisType) : errorType;
      }
      if (qf.is.typeDeclaration(n)) {
        const symbol = this.symbolOfNode(n);
        return getDeclaredTypeOfSymbol(symbol);
      }
      if (qf.is.typeDeclarationName(n)) {
        const symbol = getSymbolAtLocation(n);
        return symbol ? getDeclaredTypeOfSymbol(symbol) : errorType;
      }
      if (qf.is.declaration(n)) {
        const symbol = this.symbolOfNode(n);
        return this.this.typeOfSymbol();
      }
      if (qf.is.declarationNameOrImportPropertyName(n)) {
        const symbol = getSymbolAtLocation(n);
        if (symbol) return this.this.typeOfSymbol();
        return errorType;
      }
      if (n.kind === Syntax.BindingPattern) return this.typeForVariableLikeDeclaration(n.parent, true) || errorType;
      if (isInRightSideOfImportOrExportAssignment(<Identifier>n)) {
        const symbol = getSymbolAtLocation(n);
        if (symbol) {
          const declaredType = getDeclaredTypeOfSymbol(symbol);
          return declaredType !== errorType ? declaredType : this.this.typeOfSymbol();
        }
      }
      return errorType;
    }
    typeOfAssignmentPattern(expr: AssignmentPattern): qt.Type | undefined {
      qu.assert(expr.kind === Syntax.ObjectLiteralExpression || expr.kind === Syntax.ArrayLiteralExpression);
      if (expr.parent.kind === Syntax.ForOfStatement) {
        const iteratedType = check.rightHandSideOfForOf(<ForOfStatement>expr.parent);
        return check.destructuringAssignment(expr, iteratedType || errorType);
      }
      if (expr.parent.kind === Syntax.BinaryExpression) {
        const iteratedType = this.typeOfExpression(expr.parent.right);
        return check.destructuringAssignment(expr, iteratedType || errorType);
      }
      if (expr.parent.kind === Syntax.PropertyAssignment) {
        const n = cast(expr.parent.parent, isObjectLiteralExpression);
        const typeOfParentObjectLiteral = getTypeOfAssignmentPattern(n) || errorType;
        const propertyIndex = indexOfNode(n.properties, expr.parent);
        return check.objectLiteralDestructuringPropertyAssignment(n, typeOfParentObjectLiteral, propertyIndex);
      }
      const n = cast(expr.parent, isArrayLiteralExpression);
      const typeOfArrayLiteral = getTypeOfAssignmentPattern(n) || errorType;
      const elemType = check.iteratedTypeOrElemType(IterationUse.Destructuring, typeOfArrayLiteral, undefinedType, expr.parent) || errorType;
      return check.arrayLiteralDestructuringElemAssignment(n, typeOfArrayLiteral, n.elems.indexOf(expr), elemType);
    }
    propertySymbolOfDestructuringAssignment(location: Identifier) {
      const typeOfObjectLiteral = getTypeOfAssignmentPattern(cast(location.parent.parent, isAssignmentPattern));
      return typeOfObjectLiteral && this.propertyOfType(typeOfObjectLiteral, location.escapedText);
    }
    regularTypeOfExpression(expr: qt.Expression): qt.Type {
      if (qf.is.rightSideOfQualifiedNameOrPropertyAccess(expr)) expr = expr.parent;
      return getRegularTypeOfLiteralType(this.typeOfExpression(expr));
    }
    parentTypeOfClassElem(n: ClassElem) {
      const classSymbol = this.symbolOfNode(n.parent)!;
      return qf.has.syntacticModifier(n, ModifierFlags.Static) ? this.typeOfSymbol(classSymbol) : getDeclaredTypeOfSymbol(classSymbol);
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
          const nameType = check.computedPropertyName(name);
          return qf.is.typeAssignableToKind(nameType, qt.TypeFlags.ESSymbolLike) ? nameType : stringType;
        default:
          return qu.fail('Unsupported property name.');
      }
    }
    augmentedPropertiesOfType(type: qt.Type): Symbol[] {
      type = getApparentType(type);
      const propsByName = new SymbolTable(this.propertiesOfType(type));
      const functionType = getSignaturesOfType(type, SignatureKind.Call).length
        ? globalCallableFunctionType
        : getSignaturesOfType(type, SignatureKind.Construct).length
        ? globalNewableFunctionType
        : undefined;
      if (functionType) {
        forEach(this.propertiesOfType(functionType), (p) => {
          if (!propsByName.has(p.escName)) propsByName.set(p.escName, p);
        });
      }
      return getNamedMembers(propsByName);
    }
    referencedExportContainer(nIn: Identifier, prefixLocals?: boolean): SourceFile | ModuleDeclaration | EnumDeclaration | undefined {
      const n = this.parseTreeOf(nIn, isIdentifier);
      if (n) {
        let symbol = getReferencedValueSymbol(n, isNameOfModuleOrEnumDeclaration(n));
        if (symbol) {
          if (symbol.flags & qt.SymbolFlags.ExportValue) {
            const exportSymbol = this.mergedSymbol(symbol.exportSymbol!);
            if (!prefixLocals && exportSymbol.flags & qt.SymbolFlags.ExportHasLocal && !(exportSymbol.flags & qt.SymbolFlags.Variable)) return;
            symbol = exportSymbol;
          }
          const parentSymbol = getParentOfSymbol(symbol);
          if (parentSymbol) {
            if (parentSymbol.flags & qt.SymbolFlags.ValueModule && parentSymbol.valueDeclaration.kind === Syntax.SourceFile) {
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
        const symbol = getReferencedValueSymbol(n);
        if (symbol.isNonLocalAlias(SymbolFlags.Value) && !this.getTypeOnlyAliasDeclaration()) return symbol.getDeclarationOfAliasSymbol();
      }
      return;
    }
    referencedDeclarationWithCollidingName(nIn: Identifier): Declaration | undefined {
      if (!qf.is.generatedIdentifier(nIn)) {
        const n = this.parseTreeOf(nIn, isIdentifier);
        if (n) {
          const symbol = getReferencedValueSymbol(n);
          if (symbol && isSymbolOfDeclarationWithCollidingName(symbol)) return symbol.valueDeclaration;
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
      return getNodeLinks(n).flags || 0;
    }
    enumMemberValue(n: EnumMember): string | number | undefined {
      computeEnumMemberValues(n.parent);
      return getNodeLinks(n).enumMemberValue;
    }
    constantValue(n: EnumMember | AccessExpression): string | number | undefined {
      if (n.kind === Syntax.EnumMember) return getEnumMemberValue(n);
      const symbol = getNodeLinks(n).resolvedSymbol;
      if (symbol && symbol.flags & qt.SymbolFlags.EnumMember) {
        const member = symbol.valueDeclaration as EnumMember;
        if (qf.is.enumConst(member.parent)) return getEnumMemberValue(member);
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
      const valueSymbol = resolveEntityName(typeName, qt.SymbolFlags.Value, true, false, location);
      const typeSymbol = resolveEntityName(typeName, qt.SymbolFlags.Type, true, false, location);
      if (valueSymbol && valueSymbol === typeSymbol) {
        const globalPromiseSymbol = getGlobalPromiseConstructorSymbol(false);
        if (globalPromiseSymbol && valueSymbol === globalPromiseSymbol) return TypeReferenceSerializationKind.Promise;
        const constructorType = this.typeOfSymbol(valueSymbol);
        if (constructorType && isConstructorType(constructorType)) return TypeReferenceSerializationKind.TypeWithConstructSignatureAndValue;
      }
      if (!typeSymbol) return TypeReferenceSerializationKind.Unknown;
      const type = getDeclaredTypeOfSymbol(typeSymbol);
      if (type === errorType) return TypeReferenceSerializationKind.Unknown;
      if (type.flags & qt.TypeFlags.AnyOrUnknown) return TypeReferenceSerializationKind.ObjectType;
      if (qf.is.typeAssignableToKind(type, qt.TypeFlags.Void | qt.TypeFlags.Nullable | qt.TypeFlags.Never)) return TypeReferenceSerializationKind.VoidNullableOrNeverType;
      if (qf.is.typeAssignableToKind(type, qt.TypeFlags.BooleanLike)) return TypeReferenceSerializationKind.BooleanType;
      if (qf.is.typeAssignableToKind(type, qt.TypeFlags.NumberLike)) return TypeReferenceSerializationKind.NumberLikeType;
      if (qf.is.typeAssignableToKind(type, qt.TypeFlags.BigIntLike)) return TypeReferenceSerializationKind.BigIntLikeType;
      if (qf.is.typeAssignableToKind(type, qt.TypeFlags.StringLike)) return TypeReferenceSerializationKind.StringLikeType;
      if (qf.is.tupleType(type)) return TypeReferenceSerializationKind.ArrayLikeType;
      if (qf.is.typeAssignableToKind(type, qt.TypeFlags.ESSymbolLike)) return TypeReferenceSerializationKind.ESSymbolType;
      if (qf.is.functionType(type)) return TypeReferenceSerializationKind.TypeWithCallSignature;
      if (qf.is.arrayType(type)) return TypeReferenceSerializationKind.ArrayLikeType;
      return TypeReferenceSerializationKind.ObjectType;
    }
    referencedValueSymbol(reference: Identifier, startInDeclarationContainer?: boolean): Symbol | undefined {
      const resolvedSymbol = getNodeLinks(reference).resolvedSymbol;
      if (resolvedSymbol) return resolvedSymbol;
      let location: Node = reference;
      if (startInDeclarationContainer) {
        const parent = reference.parent;
        if (qf.is.declaration(parent) && reference === parent.name) location = getDeclarationContainer(parent);
      }
      return resolveName(location, reference.escapedText, qt.SymbolFlags.Value | qt.SymbolFlags.ExportValue | qt.SymbolFlags.Alias, undefined, undefined, true);
    }
    referencedValueDeclaration(referenceIn: Identifier): Declaration | undefined {
      if (!qf.is.generatedIdentifier(referenceIn)) {
        const reference = this.parseTreeOf(referenceIn, isIdentifier);
        if (reference) {
          const symbol = getReferencedValueSymbol(reference);
          if (symbol) return getExportSymbolOfValueSymbolIfExported(symbol).valueDeclaration;
        }
      }
      return;
    }
    jsxFactoryEntity(location: Node) {
      return location ? (getJsxNamespace(location), location.sourceFile.localJsxFactory || _jsxFactoryEntity) : _jsxFactoryEntity;
    }
    externalModuleFileFromDeclaration(declaration: AnyImportOrReExport | ModuleDeclaration | ImportTyping): SourceFile | undefined {
      const specifier = declaration.kind === Syntax.ModuleDeclaration ? qu.tryCast(declaration.name, isStringLiteral) : this.externalModuleName(declaration);
      const moduleSymbol = resolveExternalModuleNameWorker(specifier!, specifier!, undefined);
      if (!moduleSymbol) return;
      return getDeclarationOfKind(moduleSymbol, Syntax.SourceFile);
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
  })());
}
export interface Fget extends ReturnType<typeof newGet> {}
