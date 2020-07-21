import * as qb from '../base';
import { is, has } from '../core3';
import * as qc from '../core3';
import * as qd from '../diags';
import * as qg from '../debug';
import { ExpandingFlags, Node, ObjectFlags, SymbolFlags, TypeFlags, VarianceFlags } from './types';
import * as qt from './types';
import { ModifierFlags, Syntax } from '../syntax';
import * as qy from '../syntax';
import { Symbol } from './symbol';
export * from '../core3';
export const get = new class {
  function getResolvedSignatureWorker(nodeIn: CallLikeExpression, candidatesOutArray: Signature[] | undefined, argumentCount: number | undefined, checkMode: CheckMode): Signature | undefined {
    const node = get.parseTreeOf(nodeIn, isCallLikeExpression);
    apparentArgumentCount = argumentCount;
    const res = node ? getResolvedSignature(node, candidatesOutArray, checkMode) : undefined;
    apparentArgumentCount = undefined;
    return res;
  }
  getJsxNamespace(location: Node | undefined): qb.__String {
    if (location) {
      const file = get.sourceFileOf(location);
      if (file) {
        if (file.localJsxNamespace) return file.localJsxNamespace;
        const jsxPragma = file.pragmas.get('jsx');
        if (jsxPragma) {
          const chosenpragma = isArray(jsxPragma) ? jsxPragma[0] : jsxPragma;
          file.localJsxFactory = qp_parseIsolatedEntityName(chosenpragma.arguments.factory, languageVersion);
          visitNode(file.localJsxFactory, markAsSynthetic);
          if (file.localJsxFactory) return (file.localJsxNamespace = getFirstIdentifier(file.localJsxFactory).escapedText);
        }
      }
    }
    if (!_jsxNamespace) {
      _jsxNamespace = 'React' as qb.__String;
      if (compilerOptions.jsxFactory) {
        _jsxFactoryEntity = qp_parseIsolatedEntityName(compilerOptions.jsxFactory, languageVersion);
        visitNode(_jsxFactoryEntity, markAsSynthetic);
        if (_jsxFactoryEntity) _jsxNamespace = getFirstIdentifier(_jsxFactoryEntity).escapedText;
      } else if (compilerOptions.reactNamespace) {
        _jsxNamespace = qy.get.escUnderscores(compilerOptions.reactNamespace);
      }
    }
    if (!_jsxFactoryEntity) _jsxFactoryEntity = QualifiedName.create(new Identifier(qy.get.unescUnderscores(_jsxNamespace)), 'createElement');
    return _jsxNamespace;
    function markAsSynthetic(node: Node): VisitResult<Node> {
      node.pos = -1;
      node.end = -1;
      return visitEachChild(node, markAsSynthetic, nullTransformationContext);
    }
  }
  getEmitResolver(sourceFile: SourceFile, cancellationToken: CancellationToken) {
    getDiagnostics(sourceFile, cancellationToken);
    return emitResolver;
  }
  function getSymbolsOfParameterPropertyDeclaration(parameter: ParameterDeclaration, parameterName: qb.__String): [Symbol, Symbol] {
    const constructorDeclaration = parameter.parent;
    const classDeclaration = parameter.parent.parent;
    const parameterSymbol = getSymbol(constructorDeclaration.locals!, parameterName, qt.SymbolFlags.Value);
    const propertySymbol = getSymbol(getMembersOfSymbol(classDeclaration.symbol), parameterName, qt.SymbolFlags.Value);
    if (parameterSymbol && propertySymbol) return [parameterSymbol, propertySymbol];
    return qb.fail('There should exist two symbols, one as property declaration and one as parameter declaration');
  }
  function getIsDeferredContext(location: Node, lastLocation: Node | undefined): boolean {
    if (location.kind !== Syntax.ArrowFunction && location.kind !== Syntax.FunctionExpression) {
      return (
        is.kind(qc.TypeQueryNode, location) ||
        ((is.functionLikeDeclaration(location) || (location.kind === Syntax.PropertyDeclaration && !has.syntacticModifier(location, ModifierFlags.Static))) &&
          (!lastLocation || lastLocation !== (location as FunctionLike | PropertyDeclaration).name))
      );
    }
    if (lastLocation && lastLocation === (location as FunctionExpression | ArrowFunction).name) return false;
    if ((location as FunctionExpression | ArrowFunction).asteriskToken || has.syntacticModifier(location, ModifierFlags.Async)) return true;
    return !get.immediatelyInvokedFunctionExpression(location);
  }
  function getEntityNameForExtendingInterface(node: Node): EntityNameExpression | undefined {
    switch (node.kind) {
      case Syntax.Identifier:
      case Syntax.PropertyAccessExpression:
        return node.parent ? getEntityNameForExtendingInterface(node.parent) : undefined;
      case Syntax.ExpressionWithTypeArguments:
        if (is.entityNameExpression((<ExpressionWithTypeArguments>node).expression)) return <EntityNameExpression>(<ExpressionWithTypeArguments>node).expression;
      default:
        return;
    }
  }
  function getAnyImportSyntax(node: Node): AnyImportSyntax | undefined {
    switch (node.kind) {
      case Syntax.ImportEqualsDeclaration:
        return node as ImportEqualsDeclaration;
      case Syntax.ImportClause:
        return (node as ImportClause).parent;
      case Syntax.NamespaceImport:
        return (node as NamespaceImport).parent.parent;
      case Syntax.ImportSpecifier:
        return (node as ImportSpecifier).parent.parent.parent;
      default:
        return;
    }
  }
  function getTargetOfImportEqualsDeclaration(node: ImportEqualsDeclaration, dontResolveAlias: boolean): Symbol | undefined {
    if (node.moduleReference.kind === Syntax.ExternalModuleReference) {
      const immediate = resolveExternalModuleName(node, get.externalModuleImportEqualsDeclarationExpression(node));
      const resolved = resolveExternalModuleSymbol(immediate);
      markSymbolOfAliasDeclarationIfTypeOnly(node, immediate, resolved, false);
      return resolved;
    }
    const resolved = getSymbolOfPartOfRightHandSideOfImportEquals(node.moduleReference, dontResolveAlias);
    check.andReportErrorForResolvingImportAliasToTypeOnlySymbol(node, resolved);
    return resolved;
  }
  function getTargetOfImportClause(node: ImportClause, dontResolveAlias: boolean): Symbol | undefined {
    const moduleSymbol = resolveExternalModuleName(node, node.parent.moduleSpecifier);
    if (moduleSymbol) {
      let exportDefaultSymbol: Symbol | undefined;
      if (isShorthandAmbientModuleSymbol(moduleSymbol)) exportDefaultSymbol = moduleSymbol;
      else {
        exportDefaultSymbol = resolveExportByName(moduleSymbol, InternalSymbol.Default, node, dontResolveAlias);
      }
      const file = find(moduleSymbol.declarations, isSourceFile);
      const hasSyntheticDefault = canHaveSyntheticDefault(file, moduleSymbol, dontResolveAlias);
      if (!exportDefaultSymbol && !hasSyntheticDefault) {
        if (hasExportAssignmentSymbol(moduleSymbol)) {
          const compilerOptionName = moduleKind >= ModuleKind.ES2015 ? 'allowSyntheticDefaultImports' : 'esModuleInterop';
          const exportEqualsSymbol = moduleSymbol.exports!.get(InternalSymbol.ExportEquals);
          const exportAssignment = exportEqualsSymbol!.valueDeclaration;
          const err = error(node.name, qd.msgs.Module_0_can_only_be_default_imported_using_the_1_flag, moduleSymbol.symbolToString(), compilerOptionName);
          addRelatedInfo(
            err,
            createDiagnosticForNode(exportAssignment, qd.msgs.This_module_is_declared_with_using_export_and_can_only_be_used_with_a_default_import_when_using_the_0_flag, compilerOptionName)
          );
        } else {
          reportNonDefaultExport(moduleSymbol, node);
        }
      } else if (hasSyntheticDefault) {
        const resolved = resolveExternalModuleSymbol(moduleSymbol, dontResolveAlias) || moduleSymbol.resolveSymbol(dontResolveAlias);
        markSymbolOfAliasDeclarationIfTypeOnly(node, moduleSymbol, resolved, false);
        return resolved;
      }
      markSymbolOfAliasDeclarationIfTypeOnly(node, exportDefaultSymbol, false);
      return exportDefaultSymbol;
    }
  }
  function getTargetOfNamespaceImport(node: NamespaceImport, dontResolveAlias: boolean): Symbol | undefined {
    const moduleSpecifier = node.parent.parent.moduleSpecifier;
    const immediate = resolveExternalModuleName(node, moduleSpecifier);
    const resolved = resolveESModuleSymbol(immediate, moduleSpecifier, dontResolveAlias, false);
    markSymbolOfAliasDeclarationIfTypeOnly(node, immediate, resolved, false);
    return resolved;
  }
  function getTargetOfNamespaceExport(node: NamespaceExport, dontResolveAlias: boolean): Symbol | undefined {
    const moduleSpecifier = node.parent.moduleSpecifier;
    const immediate = moduleSpecifier && resolveExternalModuleName(node, moduleSpecifier);
    const resolved = moduleSpecifier && resolveESModuleSymbol(immediate, moduleSpecifier, dontResolveAlias, false);
    markSymbolOfAliasDeclarationIfTypeOnly(node, immediate, resolved, false);
    return resolved;
  }
  function getExternalModuleMember(node: ImportDeclaration | ExportDeclaration, specifier: ImportOrExportSpecifier, dontResolveAlias = false): Symbol | undefined {
    const moduleSymbol = resolveExternalModuleName(node, node.moduleSpecifier!)!;
    const name = specifier.propertyName || specifier.name;
    const suppressInteropError = name.escapedText === InternalSymbol.Default && !!(compilerOptions.allowSyntheticDefaultImports || compilerOptions.esModuleInterop);
    const targetSymbol = resolveESModuleSymbol(moduleSymbol, node.moduleSpecifier!, dontResolveAlias, suppressInteropError);
    if (targetSymbol) {
      if (name.escapedText) {
        if (isShorthandAmbientModuleSymbol(moduleSymbol)) return moduleSymbol;
        let symbolFromVariable: Symbol | undefined;
        if (moduleSymbol && moduleSymbol.exports && moduleSymbol.exports.get(InternalSymbol.ExportEquals)) symbolFromVariable = getPropertyOfType(getTypeOfSymbol(targetSymbol), name.escapedText);
        else {
          symbolFromVariable = getPropertyOfVariable(targetSymbol, name.escapedText);
        }
        symbolFromVariable = symbolFromVariable.resolveSymbol(dontResolveAlias);
        let symbolFromModule = getExportOfModule(targetSymbol, specifier, dontResolveAlias);
        if (symbolFromModule === undefined && name.escapedText === InternalSymbol.Default) {
          const file = find(moduleSymbol.declarations, isSourceFile);
          if (canHaveSyntheticDefault(file, moduleSymbol, dontResolveAlias))
            symbolFromModule = resolveExternalModuleSymbol(moduleSymbol, dontResolveAlias) || moduleSymbol.resolveSymbol(dontResolveAlias);
        }
        const symbol =
          symbolFromModule && symbolFromVariable && symbolFromModule !== symbolFromVariable ? combineValueAndTypeSymbols(symbolFromVariable, symbolFromModule) : symbolFromModule || symbolFromVariable;
        if (!symbol) {
          const moduleName = getFullyQualifiedName(moduleSymbol, node);
          const declarationName = declarationNameToString(name);
          const suggestion = getSuggestedSymbolForNonexistentModule(name, targetSymbol);
          if (suggestion !== undefined) {
            const suggestionName = suggestion.symbolToString();
            const diagnostic = error(name, qd.msgs.Module_0_has_no_exported_member_1_Did_you_mean_2, moduleName, declarationName, suggestionName);
            if (suggestion.valueDeclaration) addRelatedInfo(diagnostic, createDiagnosticForNode(suggestion.valueDeclaration, qd.msgs._0_is_declared_here, suggestionName));
          } else {
            if (moduleSymbol.exports?.has(InternalSymbol.Default)) error(name, qd.msgs.Module_0_has_no_exported_member_1_Did_you_mean_to_use_import_1_from_0_instead, moduleName, declarationName);
            else {
              reportNonExportedMember(node, name, declarationName, moduleSymbol, moduleName);
            }
          }
        }
        return symbol;
      }
    }
  }
  function getTargetOfImportSpecifier(node: ImportSpecifier, dontResolveAlias: boolean): Symbol | undefined {
    const resolved = getExternalModuleMember(node.parent.parent.parent, node, dontResolveAlias);
    markSymbolOfAliasDeclarationIfTypeOnly(node, undefined, resolved, false);
    return resolved;
  }
  function getTargetOfNamespaceExportDeclaration(node: NamespaceExportDeclaration, dontResolveAlias: boolean): Symbol {
    const resolved = resolveExternalModuleSymbol(node.parent.symbol, dontResolveAlias);
    markSymbolOfAliasDeclarationIfTypeOnly(node, undefined, resolved, false);
    return resolved;
  }
  function getTargetOfExportSpecifier(node: ExportSpecifier, meaning: qt.SymbolFlags, dontResolveAlias?: boolean) {
    const resolved = node.parent.parent.moduleSpecifier
      ? getExternalModuleMember(node.parent.parent, node, dontResolveAlias)
      : resolveEntityName(node.propertyName || node.name, meaning, false, dontResolveAlias);
    markSymbolOfAliasDeclarationIfTypeOnly(node, undefined, resolved, false);
    return resolved;
  }
  function getTargetOfExportAssignment(node: ExportAssignment | BinaryExpression, dontResolveAlias: boolean): Symbol | undefined {
    const expression = is.kind(qc.ExportAssignment, node) ? node.expression : node.right;
    const resolved = getTargetOfAliasLikeExpression(expression, dontResolveAlias);
    markSymbolOfAliasDeclarationIfTypeOnly(node, undefined, resolved, false);
    return resolved;
  }
  function getTargetOfAliasLikeExpression(expression: Expression, dontResolveAlias: boolean) {
    if (is.kind(qc.ClassExpression, expression)) return check.expressionCached(expression).symbol;
    if (!is.entityName(expression) && !is.entityNameExpression(expression)) return;
    const aliasLike = resolveEntityName(expression, qt.SymbolFlags.Value | qt.SymbolFlags.Type | qt.SymbolFlags.Namespace, true, dontResolveAlias);
    if (aliasLike) return aliasLike;
    check.expressionCached(expression);
    return getNodeLinks(expression).resolvedSymbol;
  }
  function getTargetOfPropertyAssignment(node: PropertyAssignment, dontRecursivelyResolve: boolean): Symbol | undefined {
    const expression = node.initer;
    return getTargetOfAliasLikeExpression(expression, dontRecursivelyResolve);
  }
  function getTargetOfPropertyAccessExpression(node: PropertyAccessExpression, dontRecursivelyResolve: boolean): Symbol | undefined {
    if (!(is.kind(qc.BinaryExpression, node.parent) && node.parent.left === node && node.parent.operatorToken.kind === Syntax.EqualsToken)) return;
    return getTargetOfAliasLikeExpression(node.parent.right, dontRecursivelyResolve);
  }
  function getTargetOfAliasDeclaration(node: Declaration, dontRecursivelyResolve = false): Symbol | undefined {
    switch (node.kind) {
      case Syntax.ImportEqualsDeclaration:
        return getTargetOfImportEqualsDeclaration(<ImportEqualsDeclaration>node, dontRecursivelyResolve);
      case Syntax.ImportClause:
        return getTargetOfImportClause(<ImportClause>node, dontRecursivelyResolve);
      case Syntax.NamespaceImport:
        return getTargetOfNamespaceImport(<NamespaceImport>node, dontRecursivelyResolve);
      case Syntax.NamespaceExport:
        return getTargetOfNamespaceExport(<NamespaceExport>node, dontRecursivelyResolve);
      case Syntax.ImportSpecifier:
        return getTargetOfImportSpecifier(<ImportSpecifier>node, dontRecursivelyResolve);
      case Syntax.ExportSpecifier:
        return getTargetOfExportSpecifier(<ExportSpecifier>node, qt.SymbolFlags.Value | qt.SymbolFlags.Type | qt.SymbolFlags.Namespace, dontRecursivelyResolve);
      case Syntax.ExportAssignment:
      case Syntax.BinaryExpression:
        return getTargetOfExportAssignment(<ExportAssignment | BinaryExpression>node, dontRecursivelyResolve);
      case Syntax.NamespaceExportDeclaration:
        return getTargetOfNamespaceExportDeclaration(<NamespaceExportDeclaration>node, dontRecursivelyResolve);
      case Syntax.ShorthandPropertyAssignment:
        return resolveEntityName((node as ShorthandPropertyAssignment).name, qt.SymbolFlags.Value | qt.SymbolFlags.Type | qt.SymbolFlags.Namespace, true, dontRecursivelyResolve);
      case Syntax.PropertyAssignment:
        return getTargetOfPropertyAssignment(node as PropertyAssignment, dontRecursivelyResolve);
      case Syntax.PropertyAccessExpression:
        return getTargetOfPropertyAccessExpression(node as PropertyAccessExpression, dontRecursivelyResolve);
      default:
        return qb.fail();
    }
  }
  function getSymbolOfPartOfRightHandSideOfImportEquals(entityName: EntityName, dontResolveAlias?: boolean): Symbol | undefined {
    if (entityName.kind === Syntax.Identifier && is.rightSideOfQualifiedNameOrPropertyAccess(entityName)) entityName = <QualifiedName>entityName.parent;
    if (entityName.kind === Syntax.Identifier || entityName.parent.kind === Syntax.QualifiedName) return resolveEntityName(entityName, qt.SymbolFlags.Namespace, false, dontResolveAlias);
    else {
      assert(entityName.parent.kind === Syntax.ImportEqualsDeclaration);
      return resolveEntityName(entityName, qt.SymbolFlags.Value | qt.SymbolFlags.Type | qt.SymbolFlags.Namespace, false, dontResolveAlias);
    }
  }
  function getAssignmentDeclarationLocation(node: TypeReferenceNode): Node | undefined {
    const typeAlias = qc.findAncestor(node, (node) => (!(qc.isDoc.node(node) || node.flags & NodeFlags.Doc) ? 'quit' : qc.isDoc.typeAlias(node)));
    if (typeAlias) return;
    const host = qc.getDoc.host(node);
    if (is.kind(qc.ExpressionStatement, host) && is.kind(qc.BinaryExpression, host.expression) && getAssignmentDeclarationKind(host.expression) === AssignmentDeclarationKind.PrototypeProperty) {
      const s = getSymbolOfNode(host.expression.left);
      if (s) return s.getDeclarationOfJSPrototypeContainer();
    }
    if (
      (is.objectLiteralMethod(host) || is.kind(qc.PropertyAssignment, host)) &&
      is.kind(qc.BinaryExpression, host.parent.parent) &&
      getAssignmentDeclarationKind(host.parent.parent) === AssignmentDeclarationKind.Prototype
    ) {
      const s = getSymbolOfNode(host.parent.parent.left);
      if (s) return s.getDeclarationOfJSPrototypeContainer();
    }
    const sig = get.effectiveDocHost(node);
    if (sig && is.functionLike(sig)) {
      const s = getSymbolOfNode(sig);
      return s && s.valueDeclaration;
    }
  }
  function getCommonJsExportEquals(exported: Symbol | undefined, moduleSymbol: Symbol): Symbol | undefined {
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
  function getExportsOfModuleAsArray(moduleSymbol: Symbol): Symbol[] {
    return symbolsToArray(getExportsOfModule(moduleSymbol));
  }
  function getExportsAndPropertiesOfModule(moduleSymbol: Symbol): Symbol[] {
    const exports = getExportsOfModuleAsArray(moduleSymbol);
    const exportEquals = resolveExternalModuleSymbol(moduleSymbol);
    if (exportEquals !== moduleSymbol) addRange(exports, getPropertiesOfType(getTypeOfSymbol(exportEquals)));
    return exports;
  }
  function getSymbolOfNode(node: Declaration): Symbol;
  function getSymbolOfNode(node: Node): Symbol | undefined;
  function getSymbolOfNode(node: Node): Symbol | undefined {
    return getMergedSymbol(node.symbol && getLateBoundSymbol(node.symbol));
  }
  function getFileSymbolIfFileSymbolExportEqualsContainer(d: Declaration, container: Symbol) {
    const fileSymbol = getExternalModuleContainer(d);
    const exported = fileSymbol && fileSymbol.exports && fileSymbol.exports.get(InternalSymbol.ExportEquals);
    return exported && getSymbolIfSameReference(exported, container) ? fileSymbol : undefined;
  }
  function getSymbolIfSameReference(s1: Symbol, s2: Symbol) {
    if (getMergedSymbol(getMergedSymbol(s1).resolveSymbol()) === getMergedSymbol(getMergedSymbol(s2).resolveSymbol())) return s1;
  }
  function getNamedMembers(ms: SymbolTable): Symbol[] {
    let r: Symbol[] | undefined;
    ms.forEach((symbol, id) => {
      if (!qy.is.reservedName(id) && symbolIsValue(symbol)) (r || (r = [])).push(symbol);
    });
    return r || empty;
  }
  function getQualifiedLeftMeaning(rightMeaning: qt.SymbolFlags) {
    return rightMeaning === qt.SymbolFlags.Value ? qt.SymbolFlags.Value : qt.SymbolFlags.Namespace;
  }
  function getAccessibleSymbolChain(
    symbol: Symbol | undefined,
    enclosingDeclaration: Node | undefined,
    meaning: qt.SymbolFlags,
    useOnlyExternalAliasing: boolean,
    visitedSymbolTablesMap: qb.QMap<SymbolTable[]> = new qb.QMap()
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
        !!getAccessibleSymbolChain(symbolFromSymbolTable.parent, enclosingDeclaration, getQualifiedLeftMeaning(meaning), useOnlyExternalAliasing, visitedSymbolTablesMap)
      );
    }
    function isAccessible(symbolFromSymbolTable: Symbol, resolvedAliasSymbol?: Symbol, ignoreQualification?: boolean) {
      return (
        (symbol === (resolvedAliasSymbol || symbolFromSymbolTable) || getMergedSymbol(symbol) === getMergedSymbol(resolvedAliasSymbol || symbolFromSymbolTable)) &&
        !some(symbolFromSymbolTable.declarations, hasNonGlobalAugmentationExternalModuleSymbol) &&
        (ignoreQualification || canQualifySymbol(getMergedSymbol(symbolFromSymbolTable), meaning))
      );
    }
    function trySymbolTable(symbols: SymbolTable, ignoreQualification: boolean | undefined): Symbol[] | undefined {
      if (isAccessible(symbols.get(symbol!.escName)!, undefined, ignoreQualification)) return [symbol!];
      const result = forEachEntry(symbols, (symbolFromSymbolTable) => {
        if (
          symbolFromSymbolTable.flags & qt.SymbolFlags.Alias &&
          symbolFromSymbolTable.escName !== InternalSymbol.ExportEquals &&
          symbolFromSymbolTable.escName !== InternalSymbol.Default &&
          !(isUMDExportSymbol(symbolFromSymbolTable) && enclosingDeclaration && is.externalModule(get.sourceFileOf(enclosingDeclaration))) &&
          (!useOnlyExternalAliasing || some(symbolFromSymbolTable.declarations, is.externalModuleImportEqualsDeclaration)) &&
          (ignoreQualification || !getDeclarationOfKind(symbolFromSymbolTable, Syntax.ExportSpecifier))
        ) {
          const resolvedImportedSymbol = symbolFromSymbolTable.resolveAlias();
          const candidate = getCandidateListForSymbol(symbolFromSymbolTable, resolvedImportedSymbol, ignoreQualification);
          if (candidate) return candidate;
        }
        if (symbolFromSymbolTable.escName === symbol!.escName && symbolFromSymbolTable.exportSymbol) {
          if (isAccessible(getMergedSymbol(symbolFromSymbolTable.exportSymbol), undefined, ignoreQualification)) return [symbol!];
        }
      });
      return result || (symbols === globals ? getCandidateListForSymbol(globalThisSymbol, globalThisSymbol, ignoreQualification) : undefined);
    }
    function getCandidateListForSymbol(symbolFromSymbolTable: Symbol, resolvedImportedSymbol: Symbol, ignoreQualification: boolean | undefined) {
      if (isAccessible(symbolFromSymbolTable, resolvedImportedSymbol, ignoreQualification)) return [symbolFromSymbolTable];
      const candidateTable = resolvedImportedSymbol.getExportsOfSymbol();
      const accessibleSymbolsFromExports = candidateTable && getAccessibleSymbolChainFromSymbolTable(candidateTable, true);
      if (accessibleSymbolsFromExports && canQualifySymbol(symbolFromSymbolTable, getQualifiedLeftMeaning(meaning))) return [symbolFromSymbolTable].concat(accessibleSymbolsFromExports);
    }
  }
  function getExternalModuleContainer(declaration: Node) {
    const node = qc.findAncestor(declaration, hasExternalModuleSymbol);
    return node && getSymbolOfNode(node);
  }
  function getTypeNamesForErrorDisplay(left: Type, right: Type): [string, string] {
    let leftStr = symbolValueDeclarationIsContextSensitive(left.symbol) ? typeToString(left, left.symbol.valueDeclaration) : typeToString(left);
    let rightStr = symbolValueDeclarationIsContextSensitive(right.symbol) ? typeToString(right, right.symbol.valueDeclaration) : typeToString(right);
    if (leftStr === rightStr) {
      leftStr = getTypeNameForErrorDisplay(left);
      rightStr = getTypeNameForErrorDisplay(right);
    }
    return [leftStr, rightStr];
  }
  function getTypeNameForErrorDisplay(type: Type) {
    return typeToString(type, undefined, TypeFormatFlags.UseFullyQualifiedType);
  }
  function getTypeAliasForTypeLiteral(type: Type): Symbol | undefined {
    if (type.symbol && type.symbol.flags & qt.SymbolFlags.TypeLiteral) {
      const node = walkUpParenthesizedTypes(type.symbol.declarations[0].parent);
      if (node.kind === Syntax.TypeAliasDeclaration) return getSymbolOfNode(node);
    }
    return;
  }
  function getDeclarationContainer(node: Node): Node {
    return qc.findAncestor(get.rootDeclaration(node), (node) => {
      switch (node.kind) {
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
    })!.parent;
  }
  function getTypeOfPrototypeProperty(prototype: Symbol): Type {
    const classType = <InterfaceType>getDeclaredTypeOfSymbol(getParentOfSymbol(prototype)!);
    return classType.typeParameters
      ? createTypeReference(
          <GenericType>classType,
          map(classType.typeParameters, (_) => anyType)
        )
      : classType;
  }
  function getTypeOfPropertyOfType(type: Type, name: qb.__String): Type | undefined {
    const prop = getPropertyOfType(type, name);
    return prop ? getTypeOfSymbol(prop) : undefined;
  }
  function getTypeOfPropertyOrIndexSignature(type: Type, name: qb.__String): Type {
    return getTypeOfPropertyOfType(type, name) || (NumericLiteral.name(name) && getIndexTypeOfType(type, IndexKind.Number)) || getIndexTypeOfType(type, IndexKind.String) || unknownType;
  }
  function getTypeForBindingElementParent(node: BindingElementGrandparent) {
    const symbol = getSymbolOfNode(node);
    return (symbol && s.getLinks(symbol).type) || getTypeForVariableLikeDeclaration(node, false);
  }
  function getRestType(source: Type, properties: PropertyName[], symbol: Symbol | undefined): Type {
    source = filterType(source, (t) => !(t.flags & qt.TypeFlags.Nullable));
    if (source.flags & qt.TypeFlags.Never) return emptyObjectType;
    if (source.flags & qt.TypeFlags.Union) return mapType(source, (t) => getRestType(t, properties, symbol));
    const omitKeyType = getUnionType(map(properties, getLiteralTypeFromPropertyName));
    if (isGenericObjectType(source) || isGenericIndexType(omitKeyType)) {
      if (omitKeyType.flags & qt.TypeFlags.Never) return source;
      const omitTypeAlias = getGlobalOmitSymbol();
      if (!omitTypeAlias) return errorType;
      return getTypeAliasInstantiation(omitTypeAlias, [source, omitKeyType]);
    }
    const members = new SymbolTable();
    for (const prop of getPropertiesOfType(source)) {
      if (
        !isTypeAssignableTo(getLiteralTypeFromProperty(prop, qt.TypeFlags.StringOrNumberLiteralOrUnique), omitKeyType) &&
        !(getDeclarationModifierFlagsFromSymbol(prop) & (ModifierFlags.Private | ModifierFlags.Protected)) &&
        isSpreadableProperty(prop)
      ) {
        members.set(prop.escName, getSpreadSymbol(prop, false));
      }
    }
    const stringIndexInfo = getIndexInfoOfType(source, IndexKind.String);
    const numberIndexInfo = getIndexInfoOfType(source, IndexKind.Number);
    const result = createAnonymousType(symbol, members, empty, empty, stringIndexInfo, numberIndexInfo);
    result.objectFlags |= ObjectFlags.ObjectRestType;
    return result;
  }
  function getFlowTypeOfDestructuring(node: BindingElement | PropertyAssignment | ShorthandPropertyAssignment | Expression, declaredType: Type) {
    const reference = getSyntheticElementAccess(node);
    return reference ? getFlowTypeOfReference(reference, declaredType) : declaredType;
  }
  function getSyntheticElementAccess(node: BindingElement | PropertyAssignment | ShorthandPropertyAssignment | Expression): ElementAccessExpression | undefined {
    const parentAccess = getParentElementAccess(node);
    if (parentAccess && parentAccess.flowNode) {
      const propName = getDestructuringPropertyName(node);
      if (propName) {
        const result = <ElementAccessExpression>createNode(Syntax.ElementAccessExpression, node.pos, node.end);
        result.parent = node;
        result.expression = <LeftHandSideExpression>parentAccess;
        const literal = <StringLiteral>createNode(Syntax.StringLiteral, node.pos, node.end);
        literal.parent = result;
        literal.text = propName;
        result.argumentExpression = literal;
        result.flowNode = parentAccess.flowNode;
        return result;
      }
    }
  }
  function getParentElementAccess(node: BindingElement | PropertyAssignment | ShorthandPropertyAssignment | Expression) {
    const ancestor = node.parent.parent;
    switch (ancestor.kind) {
      case Syntax.BindingElement:
      case Syntax.PropertyAssignment:
        return getSyntheticElementAccess(<BindingElement | PropertyAssignment>ancestor);
      case Syntax.ArrayLiteralExpression:
        return getSyntheticElementAccess(<Expression>node.parent);
      case Syntax.VariableDeclaration:
        return (<VariableDeclaration>ancestor).initer;
      case Syntax.BinaryExpression:
        return (<BinaryExpression>ancestor).right;
    }
  }
  function getDestructuringPropertyName(node: BindingElement | PropertyAssignment | ShorthandPropertyAssignment | Expression) {
    const parent = node.parent;
    if (node.kind === Syntax.BindingElement && parent.kind === Syntax.ObjectBindingPattern)
      return getLiteralPropertyNameText((<BindingElement>node).propertyName || <Identifier>(<BindingElement>node).name);
    if (node.kind === Syntax.PropertyAssignment || node.kind === Syntax.ShorthandPropertyAssignment) return getLiteralPropertyNameText((<PropertyAssignment | ShorthandPropertyAssignment>node).name);
    return '' + (<Nodes<Node>>(<BindingPattern | ArrayLiteralExpression>parent).elements).indexOf(node);
  }
  function getLiteralPropertyNameText(name: PropertyName) {
    const type = getLiteralTypeFromPropertyName(name);
    return type.flags & (TypeFlags.StringLiteral | qt.TypeFlags.NumberLiteral) ? '' + (<StringLiteralType | NumberLiteralType>type).value : undefined;
  }
  function getTypeForBindingElement(declaration: BindingElement): Type | undefined {
    const pattern = declaration.parent;
    let parentType = getTypeForBindingElementParent(pattern.parent);
    if (!parentType || isTypeAny(parentType)) return parentType;
    if (strictNullChecks && declaration.flags & NodeFlags.Ambient && isParameterDeclaration(declaration)) parentType = getNonNullableType(parentType);
    else if (strictNullChecks && pattern.parent.initer && !(getTypeFacts(getTypeOfIniter(pattern.parent.initer)) & TypeFacts.EQUndefined)) {
      parentType = getTypeWithFacts(parentType, TypeFacts.NEUndefined);
    }
    let type: Type | undefined;
    if (pattern.kind === Syntax.ObjectBindingPattern) {
      if (declaration.dot3Token) {
        parentType = getReducedType(parentType);
        if (parentType.flags & qt.TypeFlags.Unknown || !isValidSpreadType(parentType)) {
          error(declaration, qd.msgs.Rest_types_may_only_be_created_from_object_types);
          return errorType;
        }
        const literalMembers: PropertyName[] = [];
        for (const element of pattern.elements) {
          if (!element.dot3Token) literalMembers.push(element.propertyName || (element.name as Identifier));
        }
        type = getRestType(parentType, literalMembers, declaration.symbol);
      } else {
        const name = declaration.propertyName || <Identifier>declaration.name;
        const indexType = getLiteralTypeFromPropertyName(name);
        const declaredType = getConstraintForLocation(getIndexedAccessType(parentType, indexType, name), declaration.name);
        type = getFlowTypeOfDestructuring(declaration, declaredType);
      }
    } else {
      const elementType = check.iteratedTypeOrElementType(IterationUse.Destructuring, parentType, undefinedType, pattern);
      const index = pattern.elements.indexOf(declaration);
      if (declaration.dot3Token) type = everyType(parentType, isTupleType) ? mapType(parentType, (t) => sliceTupleType(<TupleTypeReference>t, index)) : createArrayType(elementType);
      else if (isArrayLikeType(parentType)) {
        const indexType = getLiteralType(index);
        const accessFlags = hasDefaultValue(declaration) ? AccessFlags.NoTupleBoundsCheck : 0;
        const declaredType = getConstraintForLocation(getIndexedAccessTypeOrUndefined(parentType, indexType, declaration.name, accessFlags) || errorType, declaration.name);
        type = getFlowTypeOfDestructuring(declaration, declaredType);
      } else {
        type = elementType;
      }
    }
    if (!declaration.initer) return type;
    if (get.effectiveTypeAnnotationNode(walkUpBindingElementsAndPatterns(declaration)))
      return strictNullChecks && !(getFalsyFlags(check.declarationIniter(declaration)) & qt.TypeFlags.Undefined) ? getTypeWithFacts(type, TypeFacts.NEUndefined) : type;
    return widenTypeInferredFromIniter(declaration, getUnionType([getTypeWithFacts(type, TypeFacts.NEUndefined), check.declarationIniter(declaration)], UnionReduction.Subtype));
  }
  function getTypeForDeclarationFromDocComment(declaration: Node) {
    const jsdocType = qc.getDoc.type(declaration);
    if (jsdocType) return getTypeFromTypeNode(jsdocType);
    return;
  }
  function getTypeForVariableLikeDeclaration(
    declaration: ParameterDeclaration | PropertyDeclaration | PropertySignature | VariableDeclaration | BindingElement,
    includeOptionality: boolean
  ): Type | undefined {
    if (is.kind(qc.VariableDeclaration, declaration) && declaration.parent.parent.kind === Syntax.ForInStatement) {
      const indexType = getIndexType(getNonNullableTypeIfNeeded(check.expression(declaration.parent.parent.expression)));
      return indexType.flags & (TypeFlags.TypeParameter | qt.TypeFlags.Index) ? getExtractStringType(indexType) : stringType;
    }
    if (is.kind(qc.VariableDeclaration, declaration) && declaration.parent.parent.kind === Syntax.ForOfStatement) {
      const forOfStatement = declaration.parent.parent;
      return check.rightHandSideOfForOf(forOfStatement) || anyType;
    }
    if (is.kind(qc.BindingPattern, declaration.parent)) return getTypeForBindingElement(<BindingElement>declaration);
    const isOptional =
      includeOptionality &&
      ((is.kind(qc.ParameterDeclaration, declaration) && isDocOptionalParameter(declaration)) ||
        (!is.kind(qc.BindingElement, declaration) && !is.kind(qc.VariableDeclaration, declaration) && !!declaration.questionToken));
    const declaredType = tryGetTypeFromEffectiveTypeNode(declaration);
    if (declaredType) return addOptionality(declaredType, isOptional);
    if (
      (noImplicitAny || is.inJSFile(declaration)) &&
      declaration.kind === Syntax.VariableDeclaration &&
      !is.kind(qc.BindingPattern, declaration.name) &&
      !(get.combinedModifierFlags(declaration) & ModifierFlags.Export) &&
      !(declaration.flags & NodeFlags.Ambient)
    ) {
      if (!(get.combinedFlagsOf(declaration) & NodeFlags.Const) && (!declaration.initer || isNullOrUndefined(declaration.initer))) return autoType;
      if (declaration.initer && isEmptyArrayLiteral(declaration.initer)) return autoArrayType;
    }
    if (declaration.kind === Syntax.Parameter) {
      const func = <FunctionLikeDeclaration>declaration.parent;
      if (func.kind === Syntax.SetAccessor && !hasNonBindableDynamicName(func)) {
        const getter = getDeclarationOfKind<AccessorDeclaration>(getSymbolOfNode(declaration.parent), Syntax.GetAccessor);
        if (getter) {
          const getterSignature = getSignatureFromDeclaration(getter);
          const thisParameter = getAccessorThisNodeKind(ParameterDeclaration, func as AccessorDeclaration);
          if (thisParameter && declaration === thisParameter) {
            assert(!thisParameter.type);
            return getTypeOfSymbol(getterSignature.thisParameter!);
          }
          return getReturnTypeOfSignature(getterSignature);
        }
      }
      if (is.inJSFile(declaration)) {
        const typeTag = qc.getDoc.type(func);
        if (typeTag && is.kind(qc.FunctionTypeNode, typeTag)) return getTypeAtPosition(getSignatureFromDeclaration(typeTag), func.parameters.indexOf(declaration));
      }
      const type = declaration.symbol.escName === InternalSymbol.This ? getContextualThisParameterType(func) : getContextuallyTypedParameterType(declaration);
      if (type) return addOptionality(type, isOptional);
    } else if (is.inJSFile(declaration)) {
      const containerObjectType = getJSContainerObjectType(declaration, getSymbolOfNode(declaration), getDeclaredExpandoIniter(declaration));
      if (containerObjectType) return containerObjectType;
    }
    if (declaration.initer) {
      const type = widenTypeInferredFromIniter(declaration, check.declarationIniter(declaration));
      return addOptionality(type, isOptional);
    }
    if (is.kind(qc.PropertyDeclaration, declaration) && (noImplicitAny || is.inJSFile(declaration))) {
      const constructor = findConstructorDeclaration(declaration.parent);
      const type = constructor
        ? getFlowTypeInConstructor(declaration.symbol, constructor)
        : get.effectiveModifierFlags(declaration) & ModifierFlags.Ambient
        ? getTypeOfPropertyInBaseClass(declaration.symbol)
        : undefined;
      return type && addOptionality(type, isOptional);
    }
    if (is.kind(qc.JsxAttribute, declaration)) return trueType;
    if (is.kind(qc.BindingPattern, declaration.name)) return getTypeFromBindingPattern(declaration.name, false, true);
    return;
  }
  function getFlowTypeInConstructor(symbol: Symbol, constructor: ConstructorDeclaration) {
    const reference = new qc.PropertyAccessExpression(new qc.ThisExpression(), qy.get.unescUnderscores(symbol.escName));
    reference.expression.parent = reference;
    reference.parent = constructor;
    reference.flowNode = constructor.returnFlowNode;
    const flowType = getFlowTypeOfProperty(reference, symbol);
    if (noImplicitAny && (flowType === autoType || flowType === autoArrayType)) error(symbol.valueDeclaration, qd.msgs.Member_0_implicitly_has_an_1_type, symbol.symbolToString(), typeToString(flowType));
    return everyType(flowType, isNullableType) ? undefined : convertAutoToAny(flowType);
  }
  function getFlowTypeOfProperty(reference: Node, prop: Symbol | undefined) {
    const initialType = (prop && (!isAutoTypedProperty(prop) || get.effectiveModifierFlags(prop.valueDeclaration) & ModifierFlags.Ambient) && getTypeOfPropertyInBaseClass(prop)) || undefinedType;
    return getFlowTypeOfReference(reference, autoType, initialType);
  }
  function getWidenedTypeForAssignmentDeclaration(symbol: Symbol, resolvedSymbol?: Symbol) {
    const container = getAssignedExpandoIniter(symbol.valueDeclaration);
    if (container) {
      const tag = qc.getDoc.typeTag(container);
      if (tag && tag.typeExpression) return getTypeFromTypeNode(tag.typeExpression);
      const containerObjectType = getJSContainerObjectType(symbol.valueDeclaration, symbol, container);
      return containerObjectType || getWidenedLiteralType(check.expressionCached(container));
    }
    let type;
    let definedInConstructor = false;
    let definedInMethod = false;
    if (isConstructorDeclaredProperty(symbol)) type = getFlowTypeInConstructor(symbol, getDeclaringConstructor(symbol)!);
    if (!type) {
      let jsdocType: Type | undefined;
      let types: Type[] | undefined;
      for (const declaration of symbol.declarations) {
        const expression =
          is.kind(qc.BinaryExpression, declaration) || is.kind(qc.CallExpression, declaration)
            ? declaration
            : is.accessExpression(declaration)
            ? is.kind(qc.BinaryExpression, declaration.parent)
              ? declaration.parent
              : declaration
            : undefined;
        if (!expression) continue;
        const kind = is.accessExpression(expression) ? getAssignmentDeclarationPropertyAccessKind(expression) : getAssignmentDeclarationKind(expression);
        if (kind === AssignmentDeclarationKind.ThisProperty) {
          if (isDeclarationInConstructor(expression)) definedInConstructor = true;
          else {
            definedInMethod = true;
          }
        }
        if (!is.kind(qc.CallExpression, expression)) jsdocType = getAnnotatedTypeForAssignmentDeclaration(jsdocType, expression, symbol, declaration);
        if (!jsdocType) {
          (types || (types = [])).push(
            is.kind(qc.BinaryExpression, expression) || is.kind(qc.CallExpression, expression) ? getIniterTypeFromAssignmentDeclaration(symbol, resolvedSymbol, expression, kind) : neverType
          );
        }
      }
      type = jsdocType;
      if (!type) {
        if (!length(types)) return errorType;
        let constructorTypes = definedInConstructor ? getConstructorDefinedThisAssignmentTypes(types!, symbol.declarations) : undefined;
        if (definedInMethod) {
          const propType = getTypeOfPropertyInBaseClass(symbol);
          if (propType) {
            (constructorTypes || (constructorTypes = [])).push(propType);
            definedInConstructor = true;
          }
        }
        const sourceTypes = some(constructorTypes, (t) => !!(t.flags & ~TypeFlags.Nullable)) ? constructorTypes : types;
        type = getUnionType(sourceTypes!, UnionReduction.Subtype);
      }
    }
    const widened = getWidenedType(addOptionality(type, definedInMethod && !definedInConstructor));
    if (filterType(widened, (t) => !!(t.flags & ~TypeFlags.Nullable)) === neverType) {
      reportImplicitAny(symbol.valueDeclaration, anyType);
      return anyType;
    }
    return widened;
  }
  function getJSContainerObjectType(decl: Node, symbol: Symbol, init: Expression | undefined): Type | undefined {
    if (!is.inJSFile(decl) || !init || !is.kind(qc.ObjectLiteralExpression, init) || init.properties.length) return;
    const exports = new SymbolTable();
    while (is.kind(qc.BinaryExpression, decl) || is.kind(qc.PropertyAccessExpression, decl)) {
      const s = getSymbolOfNode(decl);
      if (s && qb.hasEntries(s.exports)) exports.merge(s.exports);
      decl = is.kind(qc.BinaryExpression, decl) ? decl.parent : decl.parent.parent;
    }
    const s = getSymbolOfNode(decl);
    if (s && qb.hasEntries(s.exports)) exports.merge(s.exports);
    const type = createAnonymousType(symbol, exports, empty, empty, undefined, undefined);
    type.objectFlags |= ObjectFlags.JSLiteral;
    return type;
  }
  function getAnnotatedTypeForAssignmentDeclaration(declaredType: Type | undefined, expression: Expression, symbol: Symbol, declaration: Declaration) {
    const typeNode = get.effectiveTypeAnnotationNode(expression.parent);
    if (typeNode) {
      const type = getWidenedType(getTypeFromTypeNode(typeNode));
      if (!declaredType) return type;
      else if (declaredType !== errorType && type !== errorType && !isTypeIdenticalTo(declaredType, type)) {
        errorNextVariableOrPropertyDeclarationMustHaveSameType(undefined, declaredType, declaration, type);
      }
    }
    if (symbol.parent) {
      const typeNode = get.effectiveTypeAnnotationNode(symbol.parent.valueDeclaration);
      if (typeNode) return getTypeOfPropertyOfType(getTypeFromTypeNode(typeNode), symbol.escName);
    }
    return declaredType;
  }
  function getIniterTypeFromAssignmentDeclaration(symbol: Symbol, resolvedSymbol: Symbol | undefined, expression: BinaryExpression | CallExpression, kind: AssignmentDeclarationKind) {
    if (is.kind(qc.CallExpression, expression)) {
      if (resolvedSymbol) return getTypeOfSymbol(resolvedSymbol);
      const objectLitType = check.expressionCached((expression as BindableObjectDefinePropertyCall).arguments[2]);
      const valueType = getTypeOfPropertyOfType(objectLitType, 'value' as qb.__String);
      if (valueType) return valueType;
      const getFunc = getTypeOfPropertyOfType(objectLitType, 'get' as qb.__String);
      if (getFunc) {
        const getSig = getSingleCallSignature(getFunc);
        if (getSig) return getReturnTypeOfSignature(getSig);
      }
      const setFunc = getTypeOfPropertyOfType(objectLitType, 'set' as qb.__String);
      if (setFunc) {
        const setSig = getSingleCallSignature(setFunc);
        if (setSig) return getTypeOfFirstParameterOfSignature(setSig);
      }
      return anyType;
    }
    if (containsSameNamedThisProperty(expression.left, expression.right)) return anyType;
    const type = resolvedSymbol ? getTypeOfSymbol(resolvedSymbol) : getWidenedLiteralType(check.expressionCached(expression.right));
    if (type.flags & qt.TypeFlags.Object && kind === AssignmentDeclarationKind.ModuleExports && symbol.escName === InternalSymbol.ExportEquals) {
      const exportedType = resolveStructuredTypeMembers(type as ObjectType);
      const members = new SymbolTable();
      copyEntries(exportedType.members, members);
      if (resolvedSymbol && !resolvedSymbol.exports) resolvedSymbol.exports = new SymbolTable();
      (resolvedSymbol || symbol).exports!.forEach((s, name) => {
        const exportedMember = members.get(name)!;
        if (exportedMember && exportedMember !== s) {
          if (s.flags & qt.SymbolFlags.Value) {
            if (get.sourceFileOf(s.valueDeclaration) !== get.sourceFileOf(exportedMember.valueDeclaration)) {
              const unescName = qy.get.unescUnderscores(s.escName);
              const exportedMemberName = tryCast(exportedMember.valueDeclaration, isNamedDeclaration)?.name || exportedMember.valueDeclaration;
              addRelatedInfo(error(s.valueDeclaration, qd.msgs.Duplicate_identifier_0, unescName), createDiagnosticForNode(exportedMemberName, qd.msgs._0_was_also_declared_here, unescName));
              addRelatedInfo(error(exportedMemberName, qd.msgs.Duplicate_identifier_0, unescName), createDiagnosticForNode(s.valueDeclaration, qd.msgs._0_was_also_declared_here, unescName));
            }
            const union = new Symbol(s.flags | exportedMember.flags, name);
            union.type = getUnionType([getTypeOfSymbol(s), getTypeOfSymbol(exportedMember)]);
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
    if (isEmptyArrayLiteralType(type)) {
      reportImplicitAny(expression, anyArrayType);
      return anyArrayType;
    }
    return type;
  }
  function getConstructorDefinedThisAssignmentTypes(types: Type[], declarations: Declaration[]): Type[] | undefined {
    assert(types.length === declarations.length);
    return types.filter((_, i) => {
      const declaration = declarations[i];
      const expression = is.kind(qc.BinaryExpression, declaration) ? declaration : is.kind(qc.BinaryExpression, declaration.parent) ? declaration.parent : undefined;
      return expression && isDeclarationInConstructor(expression);
    });
  }
  function getTypeFromBindingElement(element: BindingElement, includePatternInType?: boolean, reportErrors?: boolean): Type {
    if (element.initer) {
      const contextualType = is.kind(qc.BindingPattern, element.name) ? getTypeFromBindingPattern(element.name, true, false) : unknownType;
      return addOptionality(widenTypeInferredFromIniter(element, check.declarationIniter(element, contextualType)));
    }
    if (is.kind(qc.BindingPattern, element.name)) return getTypeFromBindingPattern(element.name, includePatternInType, reportErrors);
    if (reportErrors && !declarationBelongsToPrivateAmbientMember(element)) reportImplicitAny(element, anyType);
    return includePatternInType ? nonInferrableAnyType : anyType;
  }
  function getTypeFromObjectBindingPattern(pattern: ObjectBindingPattern, includePatternInType: boolean, reportErrors: boolean): Type {
    const members = new SymbolTable();
    let stringIndexInfo: IndexInfo | undefined;
    let objectFlags = ObjectFlags.ObjectLiteral | ObjectFlags.ContainsObjectOrArrayLiteral;
    forEach(pattern.elements, (e) => {
      const name = e.propertyName || <Identifier>e.name;
      if (e.dot3Token) {
        stringIndexInfo = createIndexInfo(anyType, false);
        return;
      }
      const exprType = getLiteralTypeFromPropertyName(name);
      if (!isTypeUsableAsPropertyName(exprType)) {
        objectFlags |= ObjectFlags.ObjectLiteralPatternWithComputedProperties;
        return;
      }
      const text = getPropertyNameFromType(exprType);
      const flags = qt.SymbolFlags.Property | (e.initer ? qt.SymbolFlags.Optional : 0);
      const symbol = new Symbol(flags, text);
      symbol.type = getTypeFromBindingElement(e, includePatternInType, reportErrors);
      symbol.bindingElement = e;
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
  function getTypeFromArrayBindingPattern(pattern: BindingPattern, includePatternInType: boolean, reportErrors: boolean): Type {
    const elements = pattern.elements;
    const lastElement = lastOrUndefined(elements);
    const hasRestElement = !!(lastElement && lastElement.kind === Syntax.BindingElement && lastElement.dot3Token);
    if (elements.length === 0 || (elements.length === 1 && hasRestElement)) return createIterableType(anyType);
    const elementTypes = map(elements, (e) => (is.kind(qc.OmittedExpression, e) ? anyType : getTypeFromBindingElement(e, includePatternInType, reportErrors)));
    const minLength = findLastIndex(elements, (e) => !is.kind(qc.OmittedExpression, e) && !hasDefaultValue(e), elements.length - (hasRestElement ? 2 : 1)) + 1;
    let result = <TypeReference>createTupleType(elementTypes, minLength, hasRestElement);
    if (includePatternInType) {
      result = cloneTypeReference(result);
      result.pattern = pattern;
      result.objectFlags |= ObjectFlags.ContainsObjectOrArrayLiteral;
    }
    return result;
  }
  function getTypeFromBindingPattern(pattern: BindingPattern, includePatternInType = false, reportErrors = false): Type {
    return pattern.kind === Syntax.ObjectBindingPattern
      ? getTypeFromObjectBindingPattern(pattern, includePatternInType, reportErrors)
      : getTypeFromArrayBindingPattern(pattern, includePatternInType, reportErrors);
  }
  function getWidenedTypeForVariableLikeDeclaration(declaration: ParameterDeclaration | PropertyDeclaration | PropertySignature | VariableDeclaration | BindingElement, reportErrors?: boolean): Type {
    return widenTypeForVariableLikeDeclaration(getTypeForVariableLikeDeclaration(declaration, true), declaration, reportErrors);
  }
  function getAnnotatedAccessorTypeNode(accessor: AccessorDeclaration | undefined): TypeNode | undefined {
    if (accessor) {
      if (accessor.kind === Syntax.GetAccessor) {
        const getterTypeAnnotation = getEffectiveReturnTypeNode(accessor);
        return getterTypeAnnotation;
      } else {
        const setterTypeAnnotation = getEffectiveSetAccessorTypeAnnotationNode(accessor);
        return setterTypeAnnotation;
      }
    }
    return;
  }
  function getAnnotatedAccessorType(accessor: AccessorDeclaration | undefined): Type | undefined {
    const node = getAnnotatedAccessorTypeNode(accessor);
    return node && getTypeFromTypeNode(node);
  }
  function getAnnotatedAccessorThisNodeKind(ParameterDeclaration, accessor: AccessorDeclaration): Symbol | undefined {
    const parameter = getAccessorThisNodeKind(ParameterDeclaration, accessor);
    return parameter && parameter.symbol;
  }
  function getThisTypeOfDeclaration(declaration: SignatureDeclaration): Type | undefined {
    return getThisTypeOfSignature(getSignatureFromDeclaration(declaration));
  }
  function getTargetType(type: Type): Type {
    return getObjectFlags(type) & ObjectFlags.Reference ? (<TypeReference>type).target : type;
  }
  function getOuterTypeParameters(node: Node, includeThisTypes?: boolean): TypeParameter[] | undefined {
    while (true) {
      node = node.parent;
      if (node && is.kind(qc.node, BinaryExpression)) {
        const assignmentKind = getAssignmentDeclarationKind(node);
        if (assignmentKind === AssignmentDeclarationKind.Prototype || assignmentKind === AssignmentDeclarationKind.PrototypeProperty) {
          const symbol = getSymbolOfNode(node.left);
          if (symbol && symbol.parent && !qc.findAncestor(symbol.parent.valueDeclaration, (d) => node === d)) node = symbol.parent.valueDeclaration;
        }
      }
      if (!node) return;
      switch (node.kind) {
        case Syntax.VariableStatement:
        case Syntax.ClassDeclaration:
        case Syntax.ClassExpression:
        case Syntax.InterfaceDeclaration:
        case Syntax.CallSignature:
        case Syntax.ConstructSignature:
        case Syntax.MethodSignature:
        case Syntax.FunctionType:
        case Syntax.ConstructorType:
        case Syntax.DocFunctionType:
        case Syntax.FunctionDeclaration:
        case Syntax.MethodDeclaration:
        case Syntax.FunctionExpression:
        case Syntax.ArrowFunction:
        case Syntax.TypeAliasDeclaration:
        case Syntax.DocTemplateTag:
        case Syntax.DocTypedefTag:
        case Syntax.DocEnumTag:
        case Syntax.DocCallbackTag:
        case Syntax.MappedType:
        case Syntax.ConditionalType:
          const outerTypeParameters = getOuterTypeParameters(node, includeThisTypes);
          if (node.kind === Syntax.MappedType) return append(outerTypeParameters, getDeclaredTypeOfTypeParameter(getSymbolOfNode((<MappedTypeNode>node).typeParameter)));
          else if (node.kind === Syntax.ConditionalType) return concatenate(outerTypeParameters, getInferTypeParameters(<ConditionalTypeNode>node));
          else if (node.kind === Syntax.VariableStatement && !is.inJSFile(node)) {
            break;
          }
          const outerAndOwnTypeParameters = appendTypeParameters(outerTypeParameters, get.effectiveTypeParameterDeclarations(<DeclarationWithTypeParameters>node));
          const thisType =
            includeThisTypes &&
            (node.kind === Syntax.ClassDeclaration || node.kind === Syntax.ClassExpression || node.kind === Syntax.InterfaceDeclaration || isJSConstructor(node)) &&
            getDeclaredTypeOfClassOrInterface(getSymbolOfNode(node as ClassLikeDeclaration | InterfaceDeclaration)).thisType;
          return thisType ? append(outerAndOwnTypeParameters, thisType) : outerAndOwnTypeParameters;
      }
    }
  }
  function getBaseTypeNodeOfClass(type: InterfaceType): ExpressionWithTypeArguments | undefined {
    return getEffectiveBaseTypeNode(type.symbol.valueDeclaration as ClassLikeDeclaration);
  }
  function getConstructorsForTypeArguments(type: Type, typeArgumentNodes: readonly TypeNode[] | undefined, location: Node): readonly Signature[] {
    const typeArgCount = length(typeArgumentNodes);
    const isJavascript = is.inJSFile(location);
    return filter(
      getSignaturesOfType(type, SignatureKind.Construct),
      (sig) => (isJavascript || typeArgCount >= getMinTypeArgumentCount(sig.typeParameters)) && typeArgCount <= length(sig.typeParameters)
    );
  }
  function getInstantiatedConstructorsForTypeArguments(type: Type, typeArgumentNodes: readonly TypeNode[] | undefined, location: Node): readonly Signature[] {
    const signatures = getConstructorsForTypeArguments(type, typeArgumentNodes, location);
    const typeArguments = map(typeArgumentNodes, getTypeFromTypeNode);
    return sameMap<Signature>(signatures, (sig) => (some(sig.typeParameters) ? getSignatureInstantiation(sig, typeArguments, is.inJSFile(location)) : sig));
  }
  function getBaseConstructorTypeOfClass(type: InterfaceType): Type {
    if (!type.resolvedBaseConstructorType) {
      const decl = <ClassLikeDeclaration>type.symbol.valueDeclaration;
      const extended = getEffectiveBaseTypeNode(decl);
      const baseTypeNode = getBaseTypeNodeOfClass(type);
      if (!baseTypeNode) return (type.resolvedBaseConstructorType = undefinedType);
      if (!pushTypeResolution(type, TypeSystemPropertyName.ResolvedBaseConstructorType)) return errorType;
      const baseConstructorType = check.expression(baseTypeNode.expression);
      if (extended && baseTypeNode !== extended) {
        assert(!extended.typeArguments);
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
          let ctorReturn: Type = unknownType;
          if (constraint) {
            const ctorSig = getSignaturesOfType(constraint, SignatureKind.Construct);
            if (ctorSig[0]) ctorReturn = getReturnTypeOfSignature(ctorSig[0]);
          }
          addRelatedInfo(
            err,
            createDiagnosticForNode(
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
  function getImplementsTypes(type: InterfaceType): BaseType[] {
    let resolvedImplementsTypes: BaseType[] = empty;
    for (const declaration of type.symbol.declarations) {
      const implementsTypeNodes = getEffectiveImplementsTypeNodes(declaration as ClassLikeDeclaration);
      if (!implementsTypeNodes) continue;
      for (const node of implementsTypeNodes) {
        const implementsType = getTypeFromTypeNode(node);
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
  function getBaseTypes(type: InterfaceType): BaseType[] {
    if (!type.resolvedBaseTypes) {
      if (type.objectFlags & ObjectFlags.Tuple) type.resolvedBaseTypes = [createArrayType(getUnionType(type.typeParameters || empty), (<TupleType>type).readonly)];
      else if (type.symbol.flags & (SymbolFlags.Class | qt.SymbolFlags.Interface)) {
        if (type.symbol.flags & qt.SymbolFlags.Class) resolveBaseTypesOfClass(type);
        if (type.symbol.flags & qt.SymbolFlags.Interface) resolveBaseTypesOfInterface(type);
      } else {
        qb.fail('type must be class or interface');
      }
    }
    return type.resolvedBaseTypes;
  }
  function getBaseTypeOfEnumLiteralType(type: Type) {
    return type.flags & qt.TypeFlags.EnumLiteral && !(type.flags & qt.TypeFlags.Union) ? getDeclaredTypeOfSymbol(getParentOfSymbol(type.symbol)!) : type;
  }
  function getPropertyNameFromType(type: StringLiteralType | NumberLiteralType | UniqueESSymbolType): qb.__String {
    if (type.flags & qt.TypeFlags.UniqueESSymbol) return (<UniqueESSymbolType>type).escName;
    if (type.flags & (TypeFlags.StringLiteral | qt.TypeFlags.NumberLiteral)) return qy.get.escUnderscores('' + (<StringLiteralType | NumberLiteralType>type).value);
    return qb.fail();
  }
  function getResolvedMembersOrExportsOfSymbol(symbol: Symbol, resolutionKind: MembersOrExportsResolutionKind): EscapedMap<Symbol> {
    const ls = symbol.getLinks();
    if (!ls[resolutionKind]) {
      const isStatic = resolutionKind === MembersOrExportsResolutionKind.resolvedExports;
      const earlySymbols = !isStatic ? symbol.members : symbol.flags & qt.SymbolFlags.Module ? symbol.getExportsOfModuleWorker() : symbol.exports;
      ls[resolutionKind] = earlySymbols || emptySymbols;
      const lateSymbols = new SymbolTable<TransientSymbol>();
      for (const decl of symbol.declarations) {
        const members = getMembersOfDeclaration(decl);
        if (members) {
          for (const member of members) {
            if (isStatic === has.staticModifier(member) && hasLateBindableName(member)) lateBindMember(symbol, earlySymbols, lateSymbols, member);
          }
        }
      }
      const assignments = symbol.assignmentDeclarationMembers;
      if (assignments) {
        const decls = arrayFrom(assignments.values());
        for (const member of decls) {
          const assignmentKind = getAssignmentDeclarationKind(member as BinaryExpression | CallExpression);
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
  function getTypeWithThisArgument(type: Type, thisArgument?: Type, needApparentType?: boolean): Type {
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
  function getOptionalCallSignature(signature: Signature, callChainFlags: SignatureFlags): Signature {
    if ((signature.flags & SignatureFlags.CallChainFlags) === callChainFlags) return signature;
    if (!signature.optionalCallSignatureCache) signature.optionalCallSignatureCache = {};
    const key = callChainFlags === SignatureFlags.IsInnerCallChain ? 'inner' : 'outer';
    return signature.optionalCallSignatureCache[key] || (signature.optionalCallSignatureCache[key] = createOptionalCallSignature(signature, callChainFlags));
  }
  function getExpandedParameters(sig: Signature, skipUnionExpanding?: boolean): readonly (readonly Symbol[])[] {
    if (signatureHasRestParameter(sig)) {
      const restIndex = sig.parameters.length - 1;
      const restType = getTypeOfSymbol(sig.parameters[restIndex]);
      if (isTupleType(restType)) return [expandSignatureParametersWithTupleMembers(restType, restIndex)];
      else if (!skipUnionExpanding && restType.flags & qt.TypeFlags.Union && every((restType as UnionType).types, isTupleType))
        return map((restType as UnionType).types, (t) => expandSignatureParametersWithTupleMembers(t as TupleTypeReference, restIndex));
    }
    return [sig.parameters];
    function expandSignatureParametersWithTupleMembers(restType: TupleTypeReference, restIndex: number) {
      const elementTypes = getTypeArguments(restType);
      const minLength = restType.target.minLength;
      const tupleRestIndex = restType.target.hasRestElement ? elementTypes.length - 1 : -1;
      const associatedNames = restType.target.labeledElementDeclarations;
      const restParams = map(elementTypes, (t, i) => {
        const tupleLabelName = !!associatedNames && getTupleElementLabel(associatedNames[i]);
        const name = tupleLabelName || getParameterNameAtPosition(sig, restIndex + i);
        const f = i === tupleRestIndex ? qt.CheckFlags.RestParameter : i >= minLength ? qt.CheckFlags.OptionalParameter : 0;
        const symbol = new Symbol(SymbolFlags.FunctionScopedVariable, name, f);
        symbol.type = i === tupleRestIndex ? createArrayType(t) : t;
        return symbol;
      });
      return concatenate(sig.parameters.slice(0, restIndex), restParams);
    }
  }
  function getDefaultConstructSignatures(classType: InterfaceType): Signature[] {
    const baseConstructorType = getBaseConstructorTypeOfClass(classType);
    const baseSignatures = getSignaturesOfType(baseConstructorType, SignatureKind.Construct);
    if (baseSignatures.length === 0) return [createSignature(undefined, classType.localTypeParameters, undefined, empty, classType, undefined, 0, SignatureFlags.None)];
    const baseTypeNode = getBaseTypeNodeOfClass(classType)!;
    const isJavaScript = is.inJSFile(baseTypeNode);
    const typeArguments = typeArgumentsFromTypeReferenceNode(baseTypeNode);
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
  function getUnionSignatures(signatureLists: readonly (readonly Signature[])[]): Signature[] {
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
                const thisType = getIntersectionType(mapDefined(unionSignatures, (sig) => sig.thisParameter && getTypeOfSymbol(sig.thisParameter)));
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
    if (!length(result) && indexWithLengthOverOne !== -1) {
      const masterList = signatureLists[indexWithLengthOverOne !== undefined ? indexWithLengthOverOne : 0];
      let results: Signature[] | undefined = masterList.slice();
      for (const signatures of signatureLists) {
        if (signatures !== masterList) {
          const signature = signatures[0];
          assert(!!signature, 'getUnionSignatures bails early on empty signature lists and should not have empty lists on second pass');
          results = signature.typeParameters && some(results, (s) => !!s.typeParameters) ? undefined : map(results, (sig) => combineSignaturesOfUnionMembers(sig, signature));
          if (!results) break;
        }
      }
      result = results;
    }
    return result || empty;
  }
  function getUnionIndexInfo(types: readonly Type[], kind: IndexKind): IndexInfo | undefined {
    const indexTypes: Type[] = [];
    let isAnyReadonly = false;
    for (const type of types) {
      const indexInfo = getIndexInfoOfType(getApparentType(type), kind);
      if (!indexInfo) return;
      indexTypes.push(indexInfo.type);
      isAnyReadonly = isAnyReadonly || indexInfo.isReadonly;
    }
    return createIndexInfo(getUnionType(indexTypes, UnionReduction.Subtype), isAnyReadonly);
  }
  function getLowerBoundOfKeyType(type: Type): Type {
    if (type.flags & (TypeFlags.Any | qt.TypeFlags.Primitive)) return type;
    if (type.flags & qt.TypeFlags.Index) return getIndexType(getApparentType((<IndexType>type).type));
    if (type.flags & qt.TypeFlags.Conditional) {
      if ((<ConditionalType>type).root.isDistributive) {
        const checkType = (<ConditionalType>type).checkType;
        const constraint = getLowerBoundOfKeyType(checkType);
        if (constraint !== checkType)
          return getConditionalTypeInstantiation(<ConditionalType>type, prependTypeMapping((<ConditionalType>type).root.checkType, constraint, (<ConditionalType>type).mapper));
      }
      return type;
    }
    if (type.flags & qt.TypeFlags.Union) return getUnionType(sameMap((<UnionType>type).types, getLowerBoundOfKeyType));
    if (type.flags & qt.TypeFlags.Intersection) return getIntersectionType(sameMap((<UnionType>type).types, getLowerBoundOfKeyType));
    return neverType;
  }
  function getTypeOfMappedSymbol(symbol: MappedSymbol) {
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
  function getTypeParameterFromMappedType(type: MappedType) {
    return type.typeParameter || (type.typeParameter = getDeclaredTypeOfTypeParameter(getSymbolOfNode(type.declaration.typeParameter)));
  }
  function getConstraintTypeFromMappedType(type: MappedType) {
    return type.constraintType || (type.constraintType = getConstraintOfTypeParameter(getTypeParameterFromMappedType(type)) || errorType);
  }
  function getTemplateTypeFromMappedType(type: MappedType) {
    return (
      type.templateType ||
      (type.templateType = type.declaration.type
        ? instantiateType(addOptionality(getTypeFromTypeNode(type.declaration.type), !!(getMappedTypeModifiers(type) & MappedTypeModifiers.IncludeOptional)), type.mapper)
        : errorType)
    );
  }
  function getConstraintDeclarationForMappedType(type: MappedType) {
    return get.effectiveConstraintOfTypeParameter(type.declaration.typeParameter);
  }
  function getModifiersTypeFromMappedType(type: MappedType) {
    if (!type.modifiersType) {
      if (isMappedTypeWithKeyofConstraintDeclaration(type))
        type.modifiersType = instantiateType(getTypeFromTypeNode((<TypeOperatorNode>getConstraintDeclarationForMappedType(type)).type), type.mapper);
      else {
        const declaredType = <MappedType>getTypeFromMappedTypeNode(type.declaration);
        const constraint = getConstraintTypeFromMappedType(declaredType);
        const extendedConstraint = constraint && constraint.flags & qt.TypeFlags.TypeParameter ? getConstraintOfTypeParameter(<TypeParameter>constraint) : constraint;
        type.modifiersType = extendedConstraint && extendedConstraint.flags & qt.TypeFlags.Index ? instantiateType((<IndexType>extendedConstraint).type, type.mapper) : unknownType;
      }
    }
    return type.modifiersType;
  }
  function getMappedTypeModifiers(type: MappedType): MappedTypeModifiers {
    const declaration = type.declaration;
    return (
      (declaration.readonlyToken ? (declaration.readonlyToken.kind === Syntax.MinusToken ? MappedTypeModifiers.ExcludeReadonly : MappedTypeModifiers.IncludeReadonly) : 0) |
      (declaration.questionToken ? (declaration.questionToken.kind === Syntax.MinusToken ? MappedTypeModifiers.ExcludeOptional : MappedTypeModifiers.IncludeOptional) : 0)
    );
  }
  function getMappedTypeOptionality(type: MappedType): number {
    const modifiers = getMappedTypeModifiers(type);
    return modifiers & MappedTypeModifiers.ExcludeOptional ? -1 : modifiers & MappedTypeModifiers.IncludeOptional ? 1 : 0;
  }
  function getCombinedMappedTypeOptionality(type: MappedType): number {
    const optionality = getMappedTypeOptionality(type);
    const modifiersType = getModifiersTypeFromMappedType(type);
    return optionality || (isGenericMappedType(modifiersType) ? getMappedTypeOptionality(modifiersType) : 0);
  }
  function getPropertiesOfObjectType(type: Type): Symbol[] {
    if (type.flags & qt.TypeFlags.Object) return resolveStructuredTypeMembers(<ObjectType>type).properties;
    return empty;
  }
  function getPropertyOfObjectType(type: Type, name: qb.__String): Symbol | undefined {
    if (type.flags & qt.TypeFlags.Object) {
      const resolved = resolveStructuredTypeMembers(<ObjectType>type);
      const symbol = resolved.members.get(name);
      if (symbol && symbolIsValue(symbol)) return symbol;
    }
  }
  function getPropertiesOfUnionOrIntersectionType(type: UnionOrIntersectionType): Symbol[] {
    if (!type.resolvedProperties) {
      const members = new SymbolTable();
      for (const current of type.types) {
        for (const prop of getPropertiesOfType(current)) {
          if (!members.has(prop.escName)) {
            const combinedProp = getPropertyOfUnionOrIntersectionType(type, prop.escName);
            if (combinedProp) members.set(prop.escName, combinedProp);
          }
        }
        if (type.flags & qt.TypeFlags.Union && !getIndexInfoOfType(current, IndexKind.String) && !getIndexInfoOfType(current, IndexKind.Number)) break;
      }
      type.resolvedProperties = getNamedMembers(members);
    }
    return type.resolvedProperties;
  }
  function getPropertiesOfType(type: Type): Symbol[] {
    type = getReducedApparentType(type);
    return type.flags & qt.TypeFlags.UnionOrIntersection ? getPropertiesOfUnionOrIntersectionType(<UnionType>type) : getPropertiesOfObjectType(type);
  }
  function getAllPossiblePropertiesOfTypes(types: readonly Type[]): Symbol[] {
    const unionType = getUnionType(types);
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
  function getConstraintOfType(type: InstantiableType | UnionOrIntersectionType): Type | undefined {
    return type.flags & qt.TypeFlags.TypeParameter
      ? getConstraintOfTypeParameter(<TypeParameter>type)
      : type.flags & qt.TypeFlags.IndexedAccess
      ? getConstraintOfIndexedAccess(<IndexedAccessType>type)
      : type.flags & qt.TypeFlags.Conditional
      ? getConstraintOfConditionalType(<ConditionalType>type)
      : getBaseConstraintOfType(type);
  }
  function getConstraintOfTypeParameter(typeParameter: TypeParameter): Type | undefined {
    return hasNonCircularBaseConstraint(typeParameter) ? getConstraintFromTypeParameter(typeParameter) : undefined;
  }
  function getConstraintOfIndexedAccess(type: IndexedAccessType) {
    return hasNonCircularBaseConstraint(type) ? getConstraintFromIndexedAccess(type) : undefined;
  }
  function getSimplifiedTypeOrConstraint(type: Type) {
    const simplified = getSimplifiedType(type, false);
    return simplified !== type ? simplified : getConstraintOfType(type);
  }
  function getConstraintFromIndexedAccess(type: IndexedAccessType) {
    const indexConstraint = getSimplifiedTypeOrConstraint(type.indexType);
    if (indexConstraint && indexConstraint !== type.indexType) {
      const indexedAccess = getIndexedAccessTypeOrUndefined(type.objectType, indexConstraint);
      if (indexedAccess) return indexedAccess;
    }
    const objectConstraint = getSimplifiedTypeOrConstraint(type.objectType);
    if (objectConstraint && objectConstraint !== type.objectType) return getIndexedAccessTypeOrUndefined(objectConstraint, type.indexType);
    return;
  }
  function getDefaultConstraintOfConditionalType(type: ConditionalType) {
    if (!type.resolvedDefaultConstraint) {
      const trueConstraint = getInferredTrueTypeFromConditionalType(type);
      const falseConstraint = getFalseTypeFromConditionalType(type);
      type.resolvedDefaultConstraint = isTypeAny(trueConstraint) ? falseConstraint : isTypeAny(falseConstraint) ? trueConstraint : getUnionType([trueConstraint, falseConstraint]);
    }
    return type.resolvedDefaultConstraint;
  }
  function getConstraintOfDistributiveConditionalType(type: ConditionalType): Type | undefined {
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
  function getConstraintFromConditionalType(type: ConditionalType) {
    return getConstraintOfDistributiveConditionalType(type) || getDefaultConstraintOfConditionalType(type);
  }
  function getConstraintOfConditionalType(type: ConditionalType) {
    return hasNonCircularBaseConstraint(type) ? getConstraintFromConditionalType(type) : undefined;
  }
  function getEffectiveConstraintOfIntersection(types: readonly Type[], targetIsUnion: boolean) {
    let constraints: Type[] | undefined;
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
  function getBaseConstraintOfType(type: Type): Type | undefined {
    if (type.flags & (TypeFlags.InstantiableNonPrimitive | qt.TypeFlags.UnionOrIntersection)) {
      const constraint = getResolvedBaseConstraint(<InstantiableType | UnionOrIntersectionType>type);
      return constraint !== noConstraintType && constraint !== circularConstraintType ? constraint : undefined;
    }
    return type.flags & qt.TypeFlags.Index ? keyofConstraintType : undefined;
  }
  function getBaseConstraintOrType(type: Type) {
    return getBaseConstraintOfType(type) || type;
  }
  function getResolvedBaseConstraint(type: InstantiableType | UnionOrIntersectionType): Type {
    let nonTerminating = false;
    return type.resolvedBaseConstraint || (type.resolvedBaseConstraint = getTypeWithThisArgument(getImmediateBaseConstraint(type), type));
    function getImmediateBaseConstraint(t: Type): Type {
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
              if (currentNode && !is.descendantOf(errorNode, currentNode) && !is.descendantOf(currentNode, errorNode))
                addRelatedInfo(diagnostic, createDiagnosticForNode(currentNode, qd.msgs.Circularity_originates_in_type_at_this_location));
            }
          }
          result = circularConstraintType;
        }
        if (nonTerminating) result = circularConstraintType;
        t.immediateBaseConstraint = result || noConstraintType;
      }
      return t.immediateBaseConstraint;
    }
    function getBaseConstraint(t: Type): Type | undefined {
      const c = getImmediateBaseConstraint(t);
      return c !== noConstraintType && c !== circularConstraintType ? c : undefined;
    }
    function computeBaseConstraint(t: Type): Type | undefined {
      if (t.flags & qt.TypeFlags.TypeParameter) {
        const constraint = getConstraintFromTypeParameter(<TypeParameter>t);
        return (t as TypeParameter).isThisType || !constraint ? constraint : getBaseConstraint(constraint);
      }
      if (t.flags & qt.TypeFlags.UnionOrIntersection) {
        const types = (<UnionOrIntersectionType>t).types;
        const baseTypes: Type[] = [];
        for (const type of types) {
          const baseType = getBaseConstraint(type);
          if (baseType) baseTypes.push(baseType);
        }
        return t.flags & qt.TypeFlags.Union && baseTypes.length === types.length
          ? getUnionType(baseTypes)
          : t.flags & qt.TypeFlags.Intersection && baseTypes.length
          ? getIntersectionType(baseTypes)
          : undefined;
      }
      if (t.flags & qt.TypeFlags.Index) return keyofConstraintType;
      if (t.flags & qt.TypeFlags.IndexedAccess) {
        const baseObjectType = getBaseConstraint((<IndexedAccessType>t).objectType);
        const baseIndexType = getBaseConstraint((<IndexedAccessType>t).indexType);
        const baseIndexedAccess = baseObjectType && baseIndexType && getIndexedAccessTypeOrUndefined(baseObjectType, baseIndexType);
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
  function getApparentTypeOfIntersectionType(type: IntersectionType) {
    return type.resolvedApparentType || (type.resolvedApparentType = getTypeWithThisArgument(type, type, true));
  }
  function getResolvedTypeParameterDefault(typeParameter: TypeParameter): Type | undefined {
    if (!typeParameter.default) {
      if (typeParameter.target) {
        const targetDefault = getResolvedTypeParameterDefault(typeParameter.target);
        typeParameter.default = targetDefault ? instantiateType(targetDefault, typeParameter.mapper) : noConstraintType;
      } else {
        typeParameter.default = resolvingDefaultType;
        const defaultDeclaration = typeParameter.symbol && forEach(typeParameter.symbol.declarations, (decl) => is.kind(qc.TypeParameterDeclaration, decl) && decl.default);
        const defaultType = defaultDeclaration ? getTypeFromTypeNode(defaultDeclaration) : noConstraintType;
        if (typeParameter.default === resolvingDefaultType) typeParameter.default = defaultType;
      }
    } else if (typeParameter.default === resolvingDefaultType) typeParameter.default = circularConstraintType;
    return typeParameter.default;
  }
  function getDefaultFromTypeParameter(typeParameter: TypeParameter): Type | undefined {
    const defaultType = getResolvedTypeParameterDefault(typeParameter);
    return defaultType !== noConstraintType && defaultType !== circularConstraintType ? defaultType : undefined;
  }
  function getApparentTypeOfMappedType(type: MappedType) {
    return type.resolvedApparentType || (type.resolvedApparentType = getResolvedApparentTypeOfMappedType(type));
  }
  function getResolvedApparentTypeOfMappedType(type: MappedType) {
    const typeVariable = getHomomorphicTypeVariable(type);
    if (typeVariable) {
      const constraint = getConstraintOfTypeParameter(typeVariable);
      if (constraint && (isArrayType(constraint) || isTupleType(constraint))) return instantiateType(type, prependTypeMapping(typeVariable, constraint, type.mapper));
    }
    return type;
  }
  function getApparentType(type: Type): Type {
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
  function getReducedApparentType(type: Type): Type {
    return getReducedType(getApparentType(getReducedType(type)));
  }
  function getUnionOrIntersectionProperty(type: UnionOrIntersectionType, name: qb.__String): Symbol | undefined {
    const properties = type.propertyCache || (type.propertyCache = new SymbolTable());
    let property = properties.get(name);
    if (!property) {
      property = createUnionOrIntersectionProperty(type, name);
      if (property) properties.set(name, property);
    }
    return property;
  }
  function getPropertyOfUnionOrIntersectionType(type: UnionOrIntersectionType, name: qb.__String): Symbol | undefined {
    const property = getUnionOrIntersectionProperty(type, name);
    return property && !(getCheckFlags(property) & qt.CheckFlags.ReadPartial) ? property : undefined;
  }
  function getReducedType(type: Type): Type {
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
  function getReducedUnionType(unionType: UnionType) {
    const reducedTypes = sameMap(unionType.types, getReducedType);
    if (reducedTypes === unionType.types) return unionType;
    const reduced = getUnionType(reducedTypes);
    if (reduced.flags & qt.TypeFlags.Union) (<UnionType>reduced).resolvedReducedType = reduced;
    return reduced;
  }
  function getPropertyOfType(type: Type, name: qb.__String): Symbol | undefined {
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
  function getSignaturesOfStructuredType(type: Type, kind: SignatureKind): readonly Signature[] {
    if (type.flags & qt.TypeFlags.StructuredType) {
      const resolved = resolveStructuredTypeMembers(<ObjectType>type);
      return kind === SignatureKind.Call ? resolved.callSignatures : resolved.constructSignatures;
    }
    return empty;
  }
  function getSignaturesOfType(type: Type, kind: SignatureKind): readonly Signature[] {
    return getSignaturesOfStructuredType(getReducedApparentType(type), kind);
  }
  function getIndexInfoOfStructuredType(type: Type, kind: IndexKind): IndexInfo | undefined {
    if (type.flags & qt.TypeFlags.StructuredType) {
      const resolved = resolveStructuredTypeMembers(<ObjectType>type);
      return kind === IndexKind.String ? resolved.stringIndexInfo : resolved.numberIndexInfo;
    }
  }
  function getIndexTypeOfStructuredType(type: Type, kind: IndexKind): Type | undefined {
    const info = getIndexInfoOfStructuredType(type, kind);
    return info && info.type;
  }
  function getIndexInfoOfType(type: Type, kind: IndexKind): IndexInfo | undefined {
    return getIndexInfoOfStructuredType(getReducedApparentType(type), kind);
  }
  function getIndexTypeOfType(type: Type, kind: IndexKind): Type | undefined {
    return getIndexTypeOfStructuredType(getReducedApparentType(type), kind);
  }
  function getImplicitIndexTypeOfType(type: Type, kind: IndexKind): Type | undefined {
    if (isObjectTypeWithInferableIndex(type)) {
      const propTypes: Type[] = [];
      for (const prop of getPropertiesOfType(type)) {
        if (kind === IndexKind.String || NumericLiteral.name(prop.escName)) propTypes.push(getTypeOfSymbol(prop));
      }
      if (kind === IndexKind.String) append(propTypes, getIndexTypeOfType(type, IndexKind.Number));
      if (propTypes.length) return getUnionType(propTypes);
    }
    return;
  }
  function getTypeParametersFromDeclaration(declaration: DeclarationWithTypeParameters): TypeParameter[] | undefined {
    let result: TypeParameter[] | undefined;
    for (const node of get.effectiveTypeParameterDeclarations(declaration)) {
      result = appendIfUnique(result, getDeclaredTypeOfTypeParameter(node.symbol));
    }
    return result;
  }
  function getMinTypeArgumentCount(typeParameters: readonly TypeParameter[] | undefined): number {
    let minTypeArgumentCount = 0;
    if (typeParameters) {
      for (let i = 0; i < typeParameters.length; i++) {
        if (!hasTypeParameterDefault(typeParameters[i])) minTypeArgumentCount = i + 1;
      }
    }
    return minTypeArgumentCount;
  }
  function getSignatureFromDeclaration(declaration: SignatureDeclaration | DocSignature): Signature {
    const links = getNodeLinks(declaration);
    if (!links.resolvedSignature) {
      const parameters: Symbol[] = [];
      let flags = SignatureFlags.None;
      let minArgumentCount = 0;
      let thisParameter: Symbol | undefined;
      let hasThisParameter = false;
      const iife = get.immediatelyInvokedFunctionExpression(declaration);
      const isJSConstructSignature = qc.isDoc.constructSignature(declaration);
      const isUntypedSignatureInJSFile = !iife && is.inJSFile(declaration) && is.valueSignatureDeclaration(declaration) && !qc.getDoc.withParameterTags(declaration) && !qc.getDoc.type(declaration);
      if (isUntypedSignatureInJSFile) flags |= SignatureFlags.IsUntypedSignatureInJSFile;
      for (let i = isJSConstructSignature ? 1 : 0; i < declaration.parameters.length; i++) {
        const param = declaration.parameters[i];
        let paramSymbol = param.symbol;
        const type = is.kind(qc.DocParameterTag, param) ? param.typeExpression && param.typeExpression.type : param.type;
        if (paramSymbol && !!(paramSymbol.flags & qt.SymbolFlags.Property) && !is.kind(qc.BindingPattern, param.name)) {
          const resolvedSymbol = resolveName(param, paramSymbol.escName, qt.SymbolFlags.Value, undefined, undefined, false);
          paramSymbol = resolvedSymbol!;
        }
        if (i === 0 && paramSymbol.escName === InternalSymbol.This) {
          hasThisParameter = true;
          thisParameter = param.symbol;
        } else {
          parameters.push(paramSymbol);
        }
        if (type && type.kind === Syntax.LiteralType) flags |= SignatureFlags.HasLiteralTypes;
        const isOptionalParameter =
          isOptionalDocParameterTag(param) ||
          param.initer ||
          param.questionToken ||
          param.dot3Token ||
          (iife && parameters.length > iife.arguments.length && !type) ||
          isDocOptionalParameter(param);
        if (!isOptionalParameter) minArgumentCount = parameters.length;
      }
      if ((declaration.kind === Syntax.GetAccessor || declaration.kind === Syntax.SetAccessor) && !hasNonBindableDynamicName(declaration) && (!hasThisParameter || !thisParameter)) {
        const otherKind = declaration.kind === Syntax.GetAccessor ? Syntax.SetAccessor : Syntax.GetAccessor;
        const other = getDeclarationOfKind<AccessorDeclaration>(getSymbolOfNode(declaration), otherKind);
        if (other) thisParameter = getAnnotatedAccessorThisNodeKind(ParameterDeclaration, other);
      }
      const classType = declaration.kind === Syntax.Constructor ? getDeclaredTypeOfClassOrInterface(getMergedSymbol((<ClassDeclaration>declaration.parent).symbol)) : undefined;
      const typeParameters = classType ? classType.localTypeParameters : getTypeParametersFromDeclaration(declaration);
      if (has.restParameter(declaration) || (is.inJSFile(declaration) && maybeAddJsSyntheticRestParameter(declaration, parameters))) flags |= SignatureFlags.HasRestParameter;
      links.resolvedSignature = createSignature(declaration, typeParameters, thisParameter, parameters, undefined, undefined, minArgumentCount, flags);
    }
    return links.resolvedSignature;
  }
  function getSignatureOfTypeTag(node: SignatureDeclaration | DocSignature) {
    if (!(is.inJSFile(node) && is.functionLikeDeclaration(node))) return;
    const typeTag = qc.getDoc.typeTag(node);
    const signature = typeTag && typeTag.typeExpression && getSingleCallSignature(getTypeFromTypeNode(typeTag.typeExpression));
    return signature && getErasedSignature(signature);
  }
  function getReturnTypeOfTypeTag(node: SignatureDeclaration | DocSignature) {
    const signature = getSignatureOfTypeTag(node);
    return signature && getReturnTypeOfSignature(signature);
  }
  function getSignaturesOfSymbol(symbol: Symbol | undefined): Signature[] {
    if (!symbol) return empty;
    const result: Signature[] = [];
    for (let i = 0; i < symbol.declarations.length; i++) {
      const decl = symbol.declarations[i];
      if (!is.functionLike(decl)) continue;
      if (i > 0 && (decl as FunctionLikeDeclaration).body) {
        const previous = symbol.declarations[i - 1];
        if (decl.parent === previous.parent && decl.kind === previous.kind && decl.pos === previous.end) continue;
      }
      result.push(getSignatureFromDeclaration(decl));
    }
    return result;
  }
  function getThisTypeOfSignature(signature: Signature): Type | undefined {
    if (signature.thisParameter) return getTypeOfSymbol(signature.thisParameter);
  }
  function getTypePredicateOfSignature(signature: Signature): TypePredicate | undefined {
    if (!signature.resolvedTypePredicate) {
      if (signature.target) {
        const targetTypePredicate = getTypePredicateOfSignature(signature.target);
        signature.resolvedTypePredicate = targetTypePredicate ? instantiateTypePredicate(targetTypePredicate, signature.mapper!) : noTypePredicate;
      } else if (signature.unionSignatures) {
        signature.resolvedTypePredicate = getUnionTypePredicate(signature.unionSignatures) || noTypePredicate;
      } else {
        const type = signature.declaration && getEffectiveReturnTypeNode(signature.declaration);
        let jsdocPredicate: TypePredicate | undefined;
        if (!type && is.inJSFile(signature.declaration)) {
          const jsdocSignature = getSignatureOfTypeTag(signature.declaration!);
          if (jsdocSignature && signature !== jsdocSignature) jsdocPredicate = getTypePredicateOfSignature(jsdocSignature);
        }
        signature.resolvedTypePredicate = type && is.kind(qc.TypePredicateNode, type) ? createTypePredicateFromTypePredicateNode(type, signature) : jsdocPredicate || noTypePredicate;
      }
      assert(!!signature.resolvedTypePredicate);
    }
    return signature.resolvedTypePredicate === noTypePredicate ? undefined : signature.resolvedTypePredicate;
  }
  function getReturnTypeOfSignature(signature: Signature): Type {
    if (!signature.resolvedReturnType) {
      if (!pushTypeResolution(signature, TypeSystemPropertyName.ResolvedReturnType)) return errorType;
      let type = signature.target
        ? instantiateType(getReturnTypeOfSignature(signature.target), signature.mapper)
        : signature.unionSignatures
        ? getUnionType(map(signature.unionSignatures, getReturnTypeOfSignature), UnionReduction.Subtype)
        : getReturnTypeFromAnnotation(signature.declaration!) ||
          (is.missing((<FunctionLikeDeclaration>signature.declaration).body) ? anyType : getReturnTypeFromBody(<FunctionLikeDeclaration>signature.declaration));
      if (signature.flags & SignatureFlags.IsInnerCallChain) type = addOptionalTypeMarker(type);
      else if (signature.flags & SignatureFlags.IsOuterCallChain) {
        type = getOptionalType(type);
      }
      if (!popTypeResolution()) {
        if (signature.declaration) {
          const typeNode = getEffectiveReturnTypeNode(signature.declaration);
          if (typeNode) error(typeNode, qd.msgs.Return_type_annotation_circularly_references_itself);
          else if (noImplicitAny) {
            const declaration = <Declaration>signature.declaration;
            const name = get.nameOfDeclaration(declaration);
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
  function getReturnTypeFromAnnotation(declaration: SignatureDeclaration | DocSignature) {
    if (declaration.kind === Syntax.Constructor) return getDeclaredTypeOfClassOrInterface(getMergedSymbol((<ClassDeclaration>declaration.parent).symbol));
    if (qc.isDoc.constructSignature(declaration)) return getTypeFromTypeNode((declaration.parameters[0] as ParameterDeclaration).type!);
    const typeNode = getEffectiveReturnTypeNode(declaration);
    if (typeNode) return getTypeFromTypeNode(typeNode);
    if (declaration.kind === Syntax.GetAccessor && !hasNonBindableDynamicName(declaration)) {
      const docType = is.inJSFile(declaration) && getTypeForDeclarationFromDocComment(declaration);
      if (docType) return docType;
      const setter = getDeclarationOfKind<AccessorDeclaration>(getSymbolOfNode(declaration), Syntax.SetAccessor);
      const setterType = getAnnotatedAccessorType(setter);
      if (setterType) return setterType;
    }
    return getReturnTypeOfTypeTag(declaration);
  }
  function getRestTypeOfSignature(signature: Signature): Type {
    return tryGetRestTypeOfSignature(signature) || anyType;
  }
  function getSignatureInstantiation(signature: Signature, typeArguments: Type[] | undefined, isJavascript: boolean, inferredTypeParameters?: readonly TypeParameter[]): Signature {
    const instantiatedSignature = getSignatureInstantiationWithoutFillingInTypeArguments(
      signature,
      fillMissingTypeArguments(typeArguments, signature.typeParameters, getMinTypeArgumentCount(signature.typeParameters), isJavascript)
    );
    if (inferredTypeParameters) {
      const returnSignature = getSingleCallOrConstructSignature(getReturnTypeOfSignature(instantiatedSignature));
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
  function getSignatureInstantiationWithoutFillingInTypeArguments(signature: Signature, typeArguments: readonly Type[] | undefined): Signature {
    const instantiations = signature.instantiations || (signature.instantiations = new qb.QMap<Signature>());
    const id = getTypeListId(typeArguments);
    let instantiation = instantiations.get(id);
    if (!instantiation) instantiations.set(id, (instantiation = createSignatureInstantiation(signature, typeArguments)));
    return instantiation;
  }
  function getErasedSignature(signature: Signature): Signature {
    return signature.typeParameters ? signature.erasedSignatureCache || (signature.erasedSignatureCache = createErasedSignature(signature)) : signature;
  }
  function getCanonicalSignature(signature: Signature): Signature {
    return signature.typeParameters ? signature.canonicalSignatureCache || (signature.canonicalSignatureCache = createCanonicalSignature(signature)) : signature;
  }
  function getBaseSignature(signature: Signature) {
    const typeParameters = signature.typeParameters;
    if (typeParameters) {
      const typeEraser = createTypeEraser(typeParameters);
      const baseConstraints = map(typeParameters, (tp) => instantiateType(getBaseConstraintOfType(tp), typeEraser) || unknownType);
      return instantiateSignature(signature, createTypeMapper(typeParameters, baseConstraints), true);
    }
    return signature;
  }
  function getOrCreateTypeFromSignature(signature: Signature): ObjectType {
    if (!signature.isolatedSignatureType) {
      const kind = signature.declaration ? signature.declaration.kind : Syntax.Unknown;
      const isConstructor = kind === Syntax.Constructor || kind === Syntax.ConstructSignature || kind === Syntax.ConstructorType;
      const type = createObjectType(ObjectFlags.Anonymous);
      type.members = emptySymbols;
      type.properties = empty;
      type.callSignatures = !isConstructor ? [signature] : empty;
      type.constructSignatures = isConstructor ? [signature] : empty;
      signature.isolatedSignatureType = type;
    }
    return signature.isolatedSignatureType;
  }
  function getConstraintDeclaration(type: TypeParameter): TypeNode | undefined {
    return mapDefined(filter(type.symbol && type.symbol.declarations, isTypeParameterDeclaration), getEffectiveConstraintOfTypeParameter)[0];
  }
  function getInferredTypeParameterConstraint(typeParameter: TypeParameter) {
    let inferences: Type[] | undefined;
    if (typeParameter.symbol) {
      for (const declaration of typeParameter.symbol.declarations) {
        if (declaration.parent.kind === Syntax.InferType) {
          const grandParent = declaration.parent.parent;
          if (grandParent.kind === Syntax.TypeReference) {
            const typeReference = <TypeReferenceNode>grandParent;
            const typeParameters = getTypeParametersForTypeReference(typeReference);
            if (typeParameters) {
              const index = typeReference.typeArguments!.indexOf(<TypeNode>declaration.parent);
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
  function getConstraintFromTypeParameter(typeParameter: TypeParameter): Type | undefined {
    if (!typeParameter.constraint) {
      if (typeParameter.target) {
        const targetConstraint = getConstraintOfTypeParameter(typeParameter.target);
        typeParameter.constraint = targetConstraint ? instantiateType(targetConstraint, typeParameter.mapper) : noConstraintType;
      } else {
        const constraintDeclaration = getConstraintDeclaration(typeParameter);
        if (!constraintDeclaration) typeParameter.constraint = getInferredTypeParameterConstraint(typeParameter) || noConstraintType;
        else {
          let type = getTypeFromTypeNode(constraintDeclaration);
          if (type.flags & qt.TypeFlags.Any && type !== errorType) type = constraintDeclaration.parent.parent.kind === Syntax.MappedType ? keyofConstraintType : unknownType;
          typeParameter.constraint = type;
        }
      }
    }
    return typeParameter.constraint === noConstraintType ? undefined : typeParameter.constraint;
  }
  function getParentSymbolOfTypeParameter(typeParameter: TypeParameter): Symbol | undefined {
    const tp = getDeclarationOfKind<TypeParameterDeclaration>(typeParameter.symbol, Syntax.TypeParameter)!;
    const host = is.kind(qc.DocTemplateTag, tp.parent) ? get.hostSignatureFromDoc(tp.parent) : tp.parent;
    return host && getSymbolOfNode(host);
  }
  function getTypeListId(types: readonly Type[] | undefined) {
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
  function getPropagatingFlagsOfTypes(types: readonly Type[], excludeKinds: qt.TypeFlags): ObjectFlags {
    let result: ObjectFlags = 0;
    for (const type of types) {
      if (!(type.flags & excludeKinds)) result |= getObjectFlags(type);
    }
    return result & ObjectFlags.PropagatingFlags;
  }
  function getTypeArguments(type: TypeReference): readonly Type[] {
    if (!type.resolvedTypeArguments) {
      if (!pushTypeResolution(type, TypeSystemPropertyName.ResolvedTypeArguments)) return type.target.localTypeParameters?.map(() => errorType) || empty;
      const node = type.node;
      const typeArguments = !node
        ? empty
        : node.kind === Syntax.TypeReference
        ? concatenate(type.target.outerTypeParameters, getEffectiveTypeArguments(node, type.target.localTypeParameters!))
        : node.kind === Syntax.ArrayType
        ? [getTypeFromTypeNode(node.elementType)]
        : map(node.elements, getTypeFromTypeNode);
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
  function getTypeReferenceArity(type: TypeReference): number {
    return length(type.target.typeParameters);
  }
  function getTypeFromClassOrInterfaceReference(node: NodeWithTypeArguments, symbol: Symbol): Type {
    const type = <InterfaceType>getDeclaredTypeOfSymbol(getMergedSymbol(symbol));
    const typeParameters = type.localTypeParameters;
    if (typeParameters) {
      const numTypeArguments = length(node.typeArguments);
      const minTypeArgumentCount = getMinTypeArgumentCount(typeParameters);
      const isJs = is.inJSFile(node);
      const isJsImplicitAny = !noImplicitAny && isJs;
      if (!isJsImplicitAny && (numTypeArguments < minTypeArgumentCount || numTypeArguments > typeParameters.length)) {
        const missingAugmentsTag = isJs && is.kind(qc.ExpressionWithTypeArguments, node) && !is.kind(qc.DocAugmentsTag, node.parent);
        const diag =
          minTypeArgumentCount === typeParameters.length
            ? missingAugmentsTag
              ? qd.msgs.Expected_0_type_arguments_provide_these_with_an_extends_tag
              : qd.msgs.Generic_type_0_requires_1_type_argument_s
            : missingAugmentsTag
            ? qd.msgs.Expected_0_1_type_arguments_provide_these_with_an_extends_tag
            : qd.msgs.Generic_type_0_requires_between_1_and_2_type_arguments;
        const typeStr = typeToString(type, undefined, TypeFormatFlags.WriteArrayAsGenericType);
        error(node, diag, typeStr, minTypeArgumentCount, typeParameters.length);
        if (!isJs) return errorType;
      }
      if (node.kind === Syntax.TypeReference && isDeferredTypeReferenceNode(<TypeReferenceNode>node, length(node.typeArguments) !== typeParameters.length))
        return createDeferredTypeReference(<GenericType>type, <TypeReferenceNode>node, undefined);
      const typeArguments = concatenate(type.outerTypeParameters, fillMissingTypeArguments(typeArgumentsFromTypeReferenceNode(node), typeParameters, minTypeArgumentCount, isJs));
      return createTypeReference(<GenericType>type, typeArguments);
    }
    return check.noTypeArguments(node, symbol) ? type : errorType;
  }
  function getTypeAliasInstantiation(symbol: Symbol, typeArguments: readonly Type[] | undefined): Type {
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
          createTypeMapper(typeParameters, fillMissingTypeArguments(typeArguments, typeParameters, getMinTypeArgumentCount(typeParameters), is.inJSFile(symbol.valueDeclaration)))
        ))
      );
    }
    return instantiation;
  }
  function getTypeFromTypeAliasReference(node: NodeWithTypeArguments, symbol: Symbol): Type {
    const type = getDeclaredTypeOfSymbol(symbol);
    const typeParameters = s.getLinks(symbol).typeParameters;
    if (typeParameters) {
      const numTypeArguments = length(node.typeArguments);
      const minTypeArgumentCount = getMinTypeArgumentCount(typeParameters);
      if (numTypeArguments < minTypeArgumentCount || numTypeArguments > typeParameters.length) {
        error(
          node,
          minTypeArgumentCount === typeParameters.length ? qd.msgs.Generic_type_0_requires_1_type_argument_s : qd.msgs.Generic_type_0_requires_between_1_and_2_type_arguments,
          symbol.symbolToString(),
          minTypeArgumentCount,
          typeParameters.length
        );
        return errorType;
      }
      return getTypeAliasInstantiation(symbol, typeArgumentsFromTypeReferenceNode(node));
    }
    return check.noTypeArguments(node, symbol) ? type : errorType;
  }
  function getTypeReferenceName(node: TypeReferenceType): EntityNameOrEntityNameExpression | undefined {
    switch (node.kind) {
      case Syntax.TypeReference:
        return node.typeName;
      case Syntax.ExpressionWithTypeArguments:
        const expr = node.expression;
        if (is.entityNameExpression(expr)) return expr;
    }
    return;
  }
  function getTypeReferenceType(node: NodeWithTypeArguments, symbol: Symbol): Type {
    if (symbol === unknownSymbol) return errorType;
    symbol = symbol.getExpandoSymbol() || symbol;
    if (symbol.flags & (SymbolFlags.Class | qt.SymbolFlags.Interface)) return getTypeFromClassOrInterfaceReference(node, symbol);
    if (symbol.flags & qt.SymbolFlags.TypeAlias) return getTypeFromTypeAliasReference(node, symbol);
    const res = tryGetDeclaredTypeOfSymbol(symbol);
    if (res) return check.noTypeArguments(node, symbol) ? getRegularTypeOfLiteralType(res) : errorType;
    if (symbol.flags & qt.SymbolFlags.Value && isDocTypeReference(node)) {
      const jsdocType = getTypeFromDocValueReference(node, symbol);
      if (jsdocType) return jsdocType;
      resolveTypeReferenceName(getTypeReferenceName(node), qt.SymbolFlags.Type);
      return this.getTypeOfSymbol();
    }
    return errorType;
  }
  function getTypeFromDocValueReference(node: NodeWithTypeArguments, symbol: Symbol): Type | undefined {
    const links = getNodeLinks(node);
    if (!links.resolvedDocType) {
      const valueType = this.getTypeOfSymbol();
      let typeType = valueType;
      if (symbol.valueDeclaration) {
        const decl = get.rootDeclaration(symbol.valueDeclaration);
        let isRequireAlias = false;
        if (is.kind(qc.VariableDeclaration, decl) && decl.initer) {
          let expr = decl.initer;
          while (is.kind(qc.PropertyAccessExpression, expr)) {
            expr = expr.expression;
          }
          isRequireAlias = is.kind(qc.CallExpression, expr) && isRequireCall(expr, true) && !!valueType.symbol;
        }
        const isImportTypeWithQualifier = node.kind === Syntax.ImportType && (node as ImportTypeNode).qualifier;
        if (valueType.symbol && (isRequireAlias || isImportTypeWithQualifier)) typeType = getTypeReferenceType(node, valueType.symbol);
      }
      links.resolvedDocType = typeType;
    }
    return links.resolvedDocType;
  }
  function getSubstitutionType(baseType: Type, substitute: Type) {
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
  function getImpliedConstraint(type: Type, checkNode: TypeNode, extendsNode: TypeNode): Type | undefined {
    return isUnaryTupleTypeNode(checkNode) && isUnaryTupleTypeNode(extendsNode)
      ? getImpliedConstraint(type, (<TupleTypeNode>checkNode).elements[0], (<TupleTypeNode>extendsNode).elements[0])
      : getActualTypeVariable(getTypeFromTypeNode(checkNode)) === type
      ? getTypeFromTypeNode(extendsNode)
      : undefined;
  }
  function getConditionalFlowTypeOfType(type: Type, node: Node) {
    let constraints: Type[] | undefined;
    while (node && !is.statement(node) && node.kind !== Syntax.DocComment) {
      const parent = node.parent;
      if (parent.kind === Syntax.ConditionalType && node === (<ConditionalTypeNode>parent).trueType) {
        const constraint = getImpliedConstraint(type, (<ConditionalTypeNode>parent).checkType, (<ConditionalTypeNode>parent).extendsType);
        if (constraint) constraints = append(constraints, constraint);
      }
      node = parent;
    }
    return constraints ? getSubstitutionType(type, getIntersectionType(append(constraints, type))) : type;
  }
  function getIntendedTypeFromDocTypeReference(node: TypeReferenceNode): Type | undefined {
    if (is.kind(qc.Identifier, node.typeName)) {
      const typeArgs = node.typeArguments;
      switch (node.typeName.escapedText) {
        case 'String':
          check.noTypeArguments(node);
          return stringType;
        case 'Number':
          check.noTypeArguments(node);
          return numberType;
        case 'Boolean':
          check.noTypeArguments(node);
          return booleanType;
        case 'Void':
          check.noTypeArguments(node);
          return voidType;
        case 'Undefined':
          check.noTypeArguments(node);
          return undefinedType;
        case 'Null':
          check.noTypeArguments(node);
          return nullType;
        case 'Function':
        case 'function':
          check.noTypeArguments(node);
          return globalFunctionType;
        case 'array':
          return (!typeArgs || !typeArgs.length) && !noImplicitAny ? anyArrayType : undefined;
        case 'promise':
          return (!typeArgs || !typeArgs.length) && !noImplicitAny ? createPromiseType(anyType) : undefined;
        case 'Object':
          if (typeArgs && typeArgs.length === 2) {
            if (isDocIndexSignature(node)) {
              const indexed = getTypeFromTypeNode(typeArgs[0]);
              const target = getTypeFromTypeNode(typeArgs[1]);
              const index = createIndexInfo(target, false);
              return createAnonymousType(undefined, emptySymbols, empty, empty, indexed === stringType ? index : undefined, indexed === numberType ? index : undefined);
            }
            return anyType;
          }
          check.noTypeArguments(node);
          return !noImplicitAny ? anyType : undefined;
      }
    }
  }
  function getTypeFromDocNullableTypeNode(node: DocNullableType) {
    const type = getTypeFromTypeNode(node.type);
    return strictNullChecks ? getNullableType(type, qt.TypeFlags.Null) : type;
  }
  function getTypeFromTypeReference(node: TypeReferenceType): Type {
    const links = getNodeLinks(node);
    if (!links.resolvedType) {
      if (is.constTypeReference(node) && is.assertionExpression(node.parent)) {
        links.resolvedSymbol = unknownSymbol;
        return (links.resolvedType = check.expressionCached(node.parent.expression));
      }
      let symbol: Symbol | undefined;
      let type: Type | undefined;
      const meaning = qt.SymbolFlags.Type;
      if (isDocTypeReference(node)) {
        type = getIntendedTypeFromDocTypeReference(node);
        if (!type) {
          symbol = resolveTypeReferenceName(getTypeReferenceName(node), meaning, true);
          if (symbol === unknownSymbol) symbol = resolveTypeReferenceName(getTypeReferenceName(node), meaning | qt.SymbolFlags.Value);
          else {
            resolveTypeReferenceName(getTypeReferenceName(node), meaning);
          }
          type = getTypeReferenceType(node, symbol);
        }
      }
      if (!type) {
        symbol = resolveTypeReferenceName(getTypeReferenceName(node), meaning);
        type = getTypeReferenceType(node, symbol);
      }
      links.resolvedSymbol = symbol;
      links.resolvedType = type;
    }
    return links.resolvedType;
  }
  function getTypeFromTypeQueryNode(node: TypeQueryNode): Type {
    const links = getNodeLinks(node);
    if (!links.resolvedType) links.resolvedType = getRegularTypeOfLiteralType(getWidenedType(check.expression(node.exprName)));
    return links.resolvedType;
  }
  function getTypeOfGlobalSymbol(symbol: Symbol | undefined, arity: number): ObjectType {
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
  function getGlobalValueSymbol(name: qb.__String, reportErrors: boolean): Symbol | undefined {
    return getGlobalSymbol(name, qt.SymbolFlags.Value, reportErrors ? qd.msgs.Cannot_find_global_value_0 : undefined);
  }
  function getGlobalTypeSymbol(name: qb.__String, reportErrors: boolean): Symbol | undefined {
    return getGlobalSymbol(name, qt.SymbolFlags.Type, reportErrors ? qd.msgs.Cannot_find_global_type_0 : undefined);
  }
  function getGlobalSymbol(name: qb.__String, meaning: qt.SymbolFlags, diagnostic: qd.Message | undefined): Symbol | undefined {
    return resolveName(undefined, name, meaning, diagnostic, name, false);
  }
  function getGlobalType(name: qb.__String, arity: 0, reportErrors: boolean): ObjectType;
  function getGlobalType(name: qb.__String, arity: number, reportErrors: boolean): GenericType;
  function getGlobalType(name: qb.__String, arity: number, reportErrors: boolean): ObjectType | undefined {
    const symbol = getGlobalTypeSymbol(name, reportErrors);
    return symbol || reportErrors ? getTypeOfGlobalSymbol(symbol, arity) : undefined;
  }
  function getGlobalTypedPropertyDescriptorType() {
    return deferredGlobalTypedPropertyDescriptorType || (deferredGlobalTypedPropertyDescriptorType = getGlobalType('TypedPropertyDescriptor' as qb.__String, 1, true)) || emptyGenericType;
  }
  function getGlobalTemplateStringsArrayType() {
    return deferredGlobalTemplateStringsArrayType || (deferredGlobalTemplateStringsArrayType = getGlobalType('TemplateStringsArray' as qb.__String, 0, true)) || emptyObjectType;
  }
  function getGlobalImportMetaType() {
    return deferredGlobalImportMetaType || (deferredGlobalImportMetaType = getGlobalType('ImportMeta' as qb.__String, 0, true)) || emptyObjectType;
  }
  function getGlobalESSymbolConstructorSymbol(reportErrors: boolean) {
    return deferredGlobalESSymbolConstructorSymbol || (deferredGlobalESSymbolConstructorSymbol = getGlobalValueSymbol('Symbol' as qb.__String, reportErrors));
  }
  function getGlobalESSymbolType(reportErrors: boolean) {
    return deferredGlobalESSymbolType || (deferredGlobalESSymbolType = getGlobalType('Symbol' as qb.__String, 0, reportErrors)) || emptyObjectType;
  }
  function getGlobalPromiseType(reportErrors: boolean) {
    return deferredGlobalPromiseType || (deferredGlobalPromiseType = getGlobalType('Promise' as qb.__String, 1, reportErrors)) || emptyGenericType;
  }
  function getGlobalPromiseLikeType(reportErrors: boolean) {
    return deferredGlobalPromiseLikeType || (deferredGlobalPromiseLikeType = getGlobalType('PromiseLike' as qb.__String, 1, reportErrors)) || emptyGenericType;
  }
  function getGlobalPromiseConstructorSymbol(reportErrors: boolean): Symbol | undefined {
    return deferredGlobalPromiseConstructorSymbol || (deferredGlobalPromiseConstructorSymbol = getGlobalValueSymbol('Promise' as qb.__String, reportErrors));
  }
  function getGlobalPromiseConstructorLikeType(reportErrors: boolean) {
    return deferredGlobalPromiseConstructorLikeType || (deferredGlobalPromiseConstructorLikeType = getGlobalType('PromiseConstructorLike' as qb.__String, 0, reportErrors)) || emptyObjectType;
  }
  function getGlobalAsyncIterableType(reportErrors: boolean) {
    return deferredGlobalAsyncIterableType || (deferredGlobalAsyncIterableType = getGlobalType('AsyncIterable' as qb.__String, 1, reportErrors)) || emptyGenericType;
  }
  function getGlobalAsyncIteratorType(reportErrors: boolean) {
    return deferredGlobalAsyncIteratorType || (deferredGlobalAsyncIteratorType = getGlobalType('AsyncIterator' as qb.__String, 3, reportErrors)) || emptyGenericType;
  }
  function getGlobalAsyncIterableIteratorType(reportErrors: boolean) {
    return deferredGlobalAsyncIterableIteratorType || (deferredGlobalAsyncIterableIteratorType = getGlobalType('AsyncIterableIterator' as qb.__String, 1, reportErrors)) || emptyGenericType;
  }
  function getGlobalAsyncGeneratorType(reportErrors: boolean) {
    return deferredGlobalAsyncGeneratorType || (deferredGlobalAsyncGeneratorType = getGlobalType('AsyncGenerator' as qb.__String, 3, reportErrors)) || emptyGenericType;
  }
  function getGlobalIterableType(reportErrors: boolean) {
    return deferredGlobalIterableType || (deferredGlobalIterableType = getGlobalType('Iterable' as qb.__String, 1, reportErrors)) || emptyGenericType;
  }
  function getGlobalIteratorType(reportErrors: boolean) {
    return deferredGlobalIteratorType || (deferredGlobalIteratorType = getGlobalType('Iterator' as qb.__String, 3, reportErrors)) || emptyGenericType;
  }
  function getGlobalIterableIteratorType(reportErrors: boolean) {
    return deferredGlobalIterableIteratorType || (deferredGlobalIterableIteratorType = getGlobalType('IterableIterator' as qb.__String, 1, reportErrors)) || emptyGenericType;
  }
  function getGlobalGeneratorType(reportErrors: boolean) {
    return deferredGlobalGeneratorType || (deferredGlobalGeneratorType = getGlobalType('Generator' as qb.__String, 3, reportErrors)) || emptyGenericType;
  }
  function getGlobalIteratorYieldResultType(reportErrors: boolean) {
    return deferredGlobalIteratorYieldResultType || (deferredGlobalIteratorYieldResultType = getGlobalType('IteratorYieldResult' as qb.__String, 1, reportErrors)) || emptyGenericType;
  }
  function getGlobalIteratorReturnResultType(reportErrors: boolean) {
    return deferredGlobalIteratorReturnResultType || (deferredGlobalIteratorReturnResultType = getGlobalType('IteratorReturnResult' as qb.__String, 1, reportErrors)) || emptyGenericType;
  }
  function getGlobalTypeOrUndefined(name: qb.__String, arity = 0): ObjectType | undefined {
    const symbol = getGlobalSymbol(name, qt.SymbolFlags.Type, undefined);
    return symbol && <GenericType>getTypeOfGlobalSymbol(symbol, arity);
  }
  function getGlobalExtractSymbol(): Symbol {
    return deferredGlobalExtractSymbol || (deferredGlobalExtractSymbol = getGlobalSymbol('Extract' as qb.__String, qt.SymbolFlags.TypeAlias, qd.msgs.Cannot_find_global_type_0)!);
  }
  function getGlobalOmitSymbol(): Symbol {
    return deferredGlobalOmitSymbol || (deferredGlobalOmitSymbol = getGlobalSymbol('Omit' as qb.__String, qt.SymbolFlags.TypeAlias, qd.msgs.Cannot_find_global_type_0)!);
  }
  function getGlobalBigIntType(reportErrors: boolean) {
    return deferredGlobalBigIntType || (deferredGlobalBigIntType = getGlobalType('BigInt' as qb.__String, 0, reportErrors)) || emptyObjectType;
  }
  function getArrayOrTupleTargetType(node: ArrayTypeNode | TupleTypeNode): GenericType {
    const readonly = isReadonlyTypeOperator(node.parent);
    if (node.kind === Syntax.ArrayType || (node.elements.length === 1 && isTupleRestElement(node.elements[0]))) return readonly ? globalReadonlyArrayType : globalArrayType;
    const lastElement = lastOrUndefined(node.elements);
    const restElement = lastElement && isTupleRestElement(lastElement) ? lastElement : undefined;
    const minLength = findLastIndex(node.elements, (n) => !isTupleOptionalElement(n) && n !== restElement) + 1;
    const missingName = some(node.elements, (e) => e.kind !== Syntax.NamedTupleMember);
    return getTupleTypeOfArity(node.elements.length, minLength, !!restElement, readonly, missingName ? undefined : (node.elements as readonly NamedTupleMember[]));
  }
  function getTypeFromArrayOrTupleTypeNode(node: ArrayTypeNode | TupleTypeNode): Type {
    const links = getNodeLinks(node);
    if (!links.resolvedType) {
      const target = getArrayOrTupleTargetType(node);
      if (target === emptyGenericType) links.resolvedType = emptyObjectType;
      else if (isDeferredTypeReferenceNode(node)) {
        links.resolvedType = node.kind === Syntax.TupleType && node.elements.length === 0 ? target : createDeferredTypeReference(target, node, undefined);
      } else {
        const elementTypes = node.kind === Syntax.ArrayType ? [getTypeFromTypeNode(node.elementType)] : map(node.elements, getTypeFromTypeNode);
        links.resolvedType = createTypeReference(target, elementTypes);
      }
    }
    return links.resolvedType;
  }
  function getTupleTypeOfArity(
    arity: number,
    minLength: number,
    hasRestElement: boolean,
    readonly: boolean,
    namedMemberDeclarations?: readonly (NamedTupleMember | ParameterDeclaration)[]
  ): GenericType {
    const key =
      arity +
      (hasRestElement ? '+' : ',') +
      minLength +
      (readonly ? 'R' : '') +
      (namedMemberDeclarations && namedMemberDeclarations.length ? ',' + map(namedMemberDeclarations, getNodeId).join(',') : '');
    let type = tupleTypes.get(key);
    if (!type) tupleTypes.set(key, (type = createTupleTypeOfArity(arity, minLength, hasRestElement, readonly, namedMemberDeclarations)));
    return type;
  }
  function getTypeFromOptionalTypeNode(node: OptionalTypeNode): Type {
    const type = getTypeFromTypeNode(node.type);
    return strictNullChecks ? getOptionalType(type) : type;
  }
  function getTypeId(type: Type) {
    return type.id;
  }
  function getUnionType(types: readonly Type[], unionReduction: UnionReduction = UnionReduction.Literal, aliasSymbol?: Symbol, aliasTypeArguments?: readonly Type[]): Type {
    if (types.length === 0) return neverType;
    if (types.length === 1) return types[0];
    const typeSet: Type[] = [];
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
    return getUnionTypeFromSortedList(typeSet, objectFlags, aliasSymbol, aliasTypeArguments);
  }
  function getUnionTypePredicate(signatures: readonly Signature[]): TypePredicate | undefined {
    let first: TypePredicate | undefined;
    const types: Type[] = [];
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
    const unionType = getUnionType(types);
    return createTypePredicate(first.kind, first.parameterName, first.parameterIndex, unionType);
  }
  function getUnionTypeFromSortedList(types: Type[], objectFlags: ObjectFlags, aliasSymbol?: Symbol, aliasTypeArguments?: readonly Type[]): Type {
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
  function getTypeFromUnionTypeNode(node: UnionTypeNode): Type {
    const links = getNodeLinks(node);
    if (!links.resolvedType) {
      const aliasSymbol = getAliasSymbolForTypeNode(node);
      links.resolvedType = getUnionType(map(node.types, getTypeFromTypeNode), UnionReduction.Literal, aliasSymbol, getTypeArgumentsForAliasSymbol(aliasSymbol));
    }
    return links.resolvedType;
  }
  function getIntersectionType(types: readonly Type[], aliasSymbol?: Symbol, aliasTypeArguments?: readonly Type[]): Type {
    const typeMembershipMap: qb.QMap<Type> = new qb.QMap();
    const includes = addTypesToIntersection(typeMembershipMap, 0, types);
    const typeSet: Type[] = arrayFrom(typeMembershipMap.values());
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
          result = getUnionType([getIntersectionType(typeSet), undefinedType], UnionReduction.Literal, aliasSymbol, aliasTypeArguments);
        } else if (extractIrreducible(typeSet, qt.TypeFlags.Null)) {
          result = getUnionType([getIntersectionType(typeSet), nullType], UnionReduction.Literal, aliasSymbol, aliasTypeArguments);
        } else {
          const size = reduceLeft(typeSet, (n, t) => n * (t.flags & qt.TypeFlags.Union ? (<UnionType>t).types.length : 1), 1);
          if (size >= 100000) {
            error(currentNode, qd.msgs.Expression_produces_a_union_type_that_is_too_complex_to_represent);
            return errorType;
          }
          const unionIndex = findIndex(typeSet, (t) => (t.flags & qt.TypeFlags.Union) !== 0);
          const unionType = <UnionType>typeSet[unionIndex];
          result = getUnionType(
            map(unionType.types, (t) => getIntersectionType(replaceElement(typeSet, unionIndex, t))),
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
  function getTypeFromIntersectionTypeNode(node: IntersectionTypeNode): Type {
    const links = getNodeLinks(node);
    if (!links.resolvedType) {
      const aliasSymbol = getAliasSymbolForTypeNode(node);
      links.resolvedType = getIntersectionType(map(node.types, getTypeFromTypeNode), aliasSymbol, getTypeArgumentsForAliasSymbol(aliasSymbol));
    }
    return links.resolvedType;
  }
  function getIndexTypeForGenericType(type: InstantiableType | UnionOrIntersectionType, stringsOnly: boolean) {
    return stringsOnly
      ? type.resolvedStringIndexType || (type.resolvedStringIndexType = createIndexType(type, true))
      : type.resolvedIndexType || (type.resolvedIndexType = createIndexType(type, false));
  }
  function getLiteralTypeFromPropertyName(name: PropertyName) {
    if (is.kind(qc.PrivateIdentifier, name)) return neverType;
    return is.kind(qc.Identifier, name)
      ? getLiteralType(qy.get.unescUnderscores(name.escapedText))
      : getRegularTypeOfLiteralType(is.kind(qc.ComputedPropertyName, name) ? check.computedPropertyName(name) : check.expression(name));
  }
  function getBigIntLiteralType(node: BigIntLiteral): LiteralType {
    return getLiteralType({
      negative: false,
      base10Value: parsePseudoBigInt(node.text),
    });
  }
  function getLiteralTypeFromProperty(prop: Symbol, include: qt.TypeFlags) {
    if (!(getDeclarationModifierFlagsFromSymbol(prop) & ModifierFlags.NonPublicAccessibilityModifier)) {
      let type = s.getLinks(getLateBoundSymbol(prop)).nameType;
      if (!type && !isKnownSymbol(prop)) {
        if (prop.escName === InternalSymbol.Default) type = getLiteralType('default');
        else {
          const name = prop.valueDeclaration && (get.nameOfDeclaration(prop.valueDeclaration) as PropertyName);
          type = (name && getLiteralTypeFromPropertyName(name)) || getLiteralType(prop.name);
        }
      }
      if (type && type.flags & include) return type;
    }
    return neverType;
  }
  function getLiteralTypeFromProperties(type: Type, include: qt.TypeFlags) {
    return getUnionType(map(getPropertiesOfType(type), (p) => getLiteralTypeFromProperty(p, include)));
  }
  function getNonEnumNumberIndexInfo(type: Type) {
    const numberIndexInfo = getIndexInfoOfType(type, IndexKind.Number);
    return numberIndexInfo !== enumNumberIndexInfo ? numberIndexInfo : undefined;
  }
  function getIndexType(type: Type, stringsOnly = keyofStringsOnly, noIndexSignatures?: boolean): Type {
    type = getReducedType(type);
    return type.flags & qt.TypeFlags.Union
      ? getIntersectionType(map((<IntersectionType>type).types, (t) => getIndexType(t, stringsOnly, noIndexSignatures)))
      : type.flags & qt.TypeFlags.Intersection
      ? getUnionType(map((<IntersectionType>type).types, (t) => getIndexType(t, stringsOnly, noIndexSignatures)))
      : maybeTypeOfKind(type, qt.TypeFlags.InstantiableNonPrimitive)
      ? getIndexTypeForGenericType(<InstantiableType | UnionOrIntersectionType>type, stringsOnly)
      : getObjectFlags(type) & ObjectFlags.Mapped
      ? filterType(getConstraintTypeFromMappedType(<MappedType>type), (t) => !(noIndexSignatures && t.flags & (TypeFlags.Any | qt.TypeFlags.String)))
      : type === wildcardType
      ? wildcardType
      : type.flags & qt.TypeFlags.Unknown
      ? neverType
      : type.flags & (TypeFlags.Any | qt.TypeFlags.Never)
      ? keyofConstraintType
      : stringsOnly
      ? !noIndexSignatures && getIndexInfoOfType(type, IndexKind.String)
        ? stringType
        : getLiteralTypeFromProperties(type, qt.TypeFlags.StringLiteral)
      : !noIndexSignatures && getIndexInfoOfType(type, IndexKind.String)
      ? getUnionType([stringType, numberType, getLiteralTypeFromProperties(type, qt.TypeFlags.UniqueESSymbol)])
      : getNonEnumNumberIndexInfo(type)
      ? getUnionType([numberType, getLiteralTypeFromProperties(type, qt.TypeFlags.StringLiteral | qt.TypeFlags.UniqueESSymbol)])
      : getLiteralTypeFromProperties(type, qt.TypeFlags.StringOrNumberLiteralOrUnique);
  }
  function getExtractStringType(type: Type) {
    if (keyofStringsOnly) return type;
    const extractTypeAlias = getGlobalExtractSymbol();
    return extractTypeAlias ? getTypeAliasInstantiation(extractTypeAlias, [type, stringType]) : stringType;
  }
  function getIndexTypeOrString(type: Type): Type {
    const indexType = getExtractStringType(getIndexType(type));
    return indexType.flags & qt.TypeFlags.Never ? stringType : indexType;
  }
  function getTypeFromTypeOperatorNode(node: TypeOperatorNode): Type {
    const links = getNodeLinks(node);
    if (!links.resolvedType) {
      switch (node.operator) {
        case Syntax.KeyOfKeyword:
          links.resolvedType = getIndexType(getTypeFromTypeNode(node.type));
          break;
        case Syntax.UniqueKeyword:
          links.resolvedType = node.type.kind === Syntax.SymbolKeyword ? getESSymbolLikeTypeForNode(walkUpParenthesizedTypes(node.parent)) : errorType;
          break;
        case Syntax.ReadonlyKeyword:
          links.resolvedType = getTypeFromTypeNode(node.type);
          break;
        default:
          throw Debug.assertNever(node.operator);
      }
    }
    return links.resolvedType;
  }
  function getPropertyNameFromIndex(
    indexType: Type,
    accessNode:
      | StringLiteral
      | Identifier
      | qc.PrivateIdentifier
      | ObjectBindingPattern
      | ArrayBindingPattern
      | ComputedPropertyName
      | NumericLiteral
      | IndexedAccessTypeNode
      | ElementAccessExpression
      | SyntheticExpression
      | undefined
  ) {
    const accessExpression = accessNode && accessNode.kind === Syntax.ElementAccessExpression ? accessNode : undefined;
    return isTypeUsableAsPropertyName(indexType)
      ? getPropertyNameFromType(indexType)
      : accessExpression && check.thatExpressionIsProperSymbolReference(accessExpression.argumentExpression, indexType, false)
      ? getPropertyNameForKnownSymbolName(idText((<PropertyAccessExpression>accessExpression.argumentExpression).name))
      : accessNode && is.propertyName(accessNode)
      ? getPropertyNameForPropertyNameNode(accessNode)
      : undefined;
  }
  function getPropertyTypeForIndexType(
    originalObjectType: Type,
    objectType: Type,
    indexType: Type,
    fullIndexType: Type,
    suppressNoImplicitAnyError: boolean,
    accessNode: ElementAccessExpression | IndexedAccessTypeNode | PropertyName | BindingName | SyntheticExpression | undefined,
    accessFlags: AccessFlags
  ) {
    const accessExpression = accessNode && accessNode.kind === Syntax.ElementAccessExpression ? accessNode : undefined;
    const propName = accessNode && is.kind(qc.PrivateIdentifier, accessNode) ? undefined : getPropertyNameFromIndex(indexType, accessNode);
    if (propName !== undefined) {
      const prop = getPropertyOfType(objectType, propName);
      if (prop) {
        if (accessExpression) {
          markPropertyAsReferenced(prop, accessExpression, accessExpression.expression.kind === Syntax.ThisKeyword);
          if (isAssignmentToReadonlyEntity(accessExpression, prop, get.assignmentTargetKind(accessExpression))) {
            error(accessExpression.argumentExpression, qd.msgs.Cannot_assign_to_0_because_it_is_a_read_only_property, prop.symbolToString());
            return;
          }
          if (accessFlags & AccessFlags.CacheSymbol) getNodeLinks(accessNode!).resolvedSymbol = prop;
          if (isThisPropertyAccessInConstructor(accessExpression, prop)) return autoType;
        }
        const propType = getTypeOfSymbol(prop);
        return accessExpression && get.assignmentTargetKind(accessExpression) !== AssignmentKind.Definite ? getFlowTypeOfReference(accessExpression, propType) : propType;
      }
      if (everyType(objectType, isTupleType) && NumericLiteral.name(propName) && +propName >= 0) {
        if (accessNode && everyType(objectType, (t) => !(<TupleTypeReference>t).target.hasRestElement) && !(accessFlags & AccessFlags.NoTupleBoundsCheck)) {
          const indexNode = getIndexNodeForAccessExpression(accessNode);
          if (isTupleType(objectType))
            error(indexNode, qd.msgs.Tuple_type_0_of_length_1_has_no_element_at_index_2, typeToString(objectType), getTypeReferenceArity(objectType), qy.get.unescUnderscores(propName));
          else {
            error(indexNode, qd.msgs.Property_0_does_not_exist_on_type_1, qy.get.unescUnderscores(propName), typeToString(objectType));
          }
        }
        errorIfWritingToReadonlyIndex(getIndexInfoOfType(objectType, IndexKind.Number));
        return mapType(objectType, (t) => getRestTypeOfTupleType(<TupleTypeReference>t) || undefinedType);
      }
    }
    if (!(indexType.flags & qt.TypeFlags.Nullable) && isTypeAssignableToKind(indexType, qt.TypeFlags.StringLike | qt.TypeFlags.NumberLike | qt.TypeFlags.ESSymbolLike)) {
      if (objectType.flags & (TypeFlags.Any | qt.TypeFlags.Never)) return objectType;
      const stringIndexInfo = getIndexInfoOfType(objectType, IndexKind.String);
      const indexInfo = (isTypeAssignableToKind(indexType, qt.TypeFlags.NumberLike) && getIndexInfoOfType(objectType, IndexKind.Number)) || stringIndexInfo;
      if (indexInfo) {
        if (accessFlags & AccessFlags.NoIndexSignatures && indexInfo === stringIndexInfo) {
          if (accessExpression) error(accessExpression, qd.msgs.Type_0_cannot_be_used_to_index_type_1, typeToString(indexType), typeToString(originalObjectType));
          return;
        }
        if (accessNode && !isTypeAssignableToKind(indexType, qt.TypeFlags.String | qt.TypeFlags.Number)) {
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
        if (objectType.symbol === globalThisSymbol && propName !== undefined && globalThisSymbol.exports!.has(propName) && globalThisSymbol.exports!.get(propName)!.flags & qt.SymbolFlags.BlockScoped)
          error(accessExpression, qd.msgs.Property_0_does_not_exist_on_type_1, qy.get.unescUnderscores(propName), typeToString(objectType));
        else if (noImplicitAny && !compilerOptions.suppressImplicitAnyIndexErrors && !suppressNoImplicitAnyError) {
          if (propName !== undefined && typeHasStaticProperty(propName, objectType)) error(accessExpression, qd.msgs.Property_0_is_a_static_member_of_type_1, propName as string, typeToString(objectType));
          else if (getIndexTypeOfType(objectType, IndexKind.Number)) {
            error(accessExpression.argumentExpression, qd.msgs.Element_implicitly_has_an_any_type_because_index_expression_is_not_of_type_number);
          } else {
            let suggestion: string | undefined;
            if (propName !== undefined && (suggestion = getSuggestionForNonexistentProperty(propName as string, objectType))) {
              if (suggestion !== undefined) error(accessExpression.argumentExpression, qd.msgs.Property_0_does_not_exist_on_type_1_Did_you_mean_2, propName as string, typeToString(objectType), suggestion);
            } else {
              const suggestion = getSuggestionForNonexistentIndexSignature(objectType, accessExpression, indexType);
              if (suggestion !== undefined)
                error(accessExpression, qd.msgs.Element_implicitly_has_an_any_type_because_type_0_has_no_index_signature_Did_you_mean_to_call_1, typeToString(objectType), suggestion);
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
                  qd.msgs.Element_implicitly_has_an_any_type_because_expression_of_type_0_can_t_be_used_to_index_type_1,
                  typeToString(fullIndexType),
                  typeToString(objectType)
                );
                diagnostics.add(createDiagnosticForNodeFromMessageChain(accessExpression, errorInfo));
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
    if (isTypeAny(indexType)) return indexType;
    return;
    function errorIfWritingToReadonlyIndex(indexInfo: IndexInfo | undefined): void {
      if (indexInfo && indexInfo.isReadonly && accessExpression && (is.assignmentTarget(accessExpression) || is.deleteTarget(accessExpression)))
        error(accessExpression, qd.msgs.Index_signature_in_type_0_only_permits_reading, typeToString(objectType));
    }
  }
  function getIndexNodeForAccessExpression(accessNode: ElementAccessExpression | IndexedAccessTypeNode | PropertyName | BindingName | SyntheticExpression) {
    return accessNode.kind === Syntax.ElementAccessExpression
      ? accessNode.argumentExpression
      : accessNode.kind === Syntax.IndexedAccessType
      ? accessNode.indexType
      : accessNode.kind === Syntax.ComputedPropertyName
      ? accessNode.expression
      : accessNode;
  }
  function getSimplifiedType(type: Type, writing: boolean): Type {
    return type.flags & qt.TypeFlags.IndexedAccess
      ? getSimplifiedIndexedAccessType(<IndexedAccessType>type, writing)
      : type.flags & qt.TypeFlags.Conditional
      ? getSimplifiedConditionalType(<ConditionalType>type, writing)
      : type;
  }
  function getSimplifiedIndexedAccessType(type: IndexedAccessType, writing: boolean): Type {
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
    if (isGenericMappedType(objectType)) return (type[cache] = mapType(substituteIndexedMappedType(objectType, type.indexType), (t) => getSimplifiedType(t, writing)));
    return (type[cache] = type);
  }
  function getSimplifiedConditionalType(type: ConditionalType, writing: boolean) {
    const checkType = type.checkType;
    const extendsType = type.extendsType;
    const trueType = getTrueTypeFromConditionalType(type);
    const falseType = getFalseTypeFromConditionalType(type);
    if (falseType.flags & qt.TypeFlags.Never && getActualTypeVariable(trueType) === getActualTypeVariable(checkType)) {
      if (checkType.flags & qt.TypeFlags.Any || isTypeAssignableTo(getRestrictiveInstantiation(checkType), getRestrictiveInstantiation(extendsType))) return getSimplifiedType(trueType, writing);
      else if (isIntersectionEmpty(checkType, extendsType)) return neverType;
    } else if (trueType.flags & qt.TypeFlags.Never && getActualTypeVariable(falseType) === getActualTypeVariable(checkType)) {
      if (!(checkType.flags & qt.TypeFlags.Any) && isTypeAssignableTo(getRestrictiveInstantiation(checkType), getRestrictiveInstantiation(extendsType))) return neverType;
      else if (checkType.flags & qt.TypeFlags.Any || isIntersectionEmpty(checkType, extendsType)) return getSimplifiedType(falseType, writing);
    }
    return type;
  }
  function getIndexedAccessType(objectType: Type, indexType: Type, accessNode?: ElementAccessExpression | IndexedAccessTypeNode | PropertyName | BindingName | SyntheticExpression): Type {
    return getIndexedAccessTypeOrUndefined(objectType, indexType, accessNode, AccessFlags.None) || (accessNode ? errorType : unknownType);
  }
  function getIndexedAccessTypeOrUndefined(
    objectType: Type,
    indexType: Type,
    accessNode?: ElementAccessExpression | IndexedAccessTypeNode | PropertyName | BindingName | SyntheticExpression,
    accessFlags = AccessFlags.None
  ): Type | undefined {
    if (objectType === wildcardType || indexType === wildcardType) return wildcardType;
    if (isStringIndexSignatureOnlyType(objectType) && !(indexType.flags & qt.TypeFlags.Nullable) && isTypeAssignableToKind(indexType, qt.TypeFlags.String | qt.TypeFlags.Number)) indexType = stringType;
    if (isGenericIndexType(indexType) || (!(accessNode && accessNode.kind !== Syntax.IndexedAccessType) && isGenericObjectType(objectType))) {
      if (objectType.flags & qt.TypeFlags.AnyOrUnknown) return objectType;
      const id = objectType.id + ',' + indexType.id;
      let type = indexedAccessTypes.get(id);
      if (!type) indexedAccessTypes.set(id, (type = createIndexedAccessType(objectType, indexType)));
      return type;
    }
    const apparentObjectType = getReducedApparentType(objectType);
    if (indexType.flags & qt.TypeFlags.Union && !(indexType.flags & qt.TypeFlags.Boolean)) {
      const propTypes: Type[] = [];
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
      return accessFlags & AccessFlags.Writing ? getIntersectionType(propTypes) : getUnionType(propTypes);
    }
    return getPropertyTypeForIndexType(objectType, apparentObjectType, indexType, indexType, false, accessNode, accessFlags | AccessFlags.CacheSymbol);
  }
  function getTypeFromIndexedAccessTypeNode(node: IndexedAccessTypeNode) {
    const links = getNodeLinks(node);
    if (!links.resolvedType) {
      const objectType = getTypeFromTypeNode(node.objectType);
      const indexType = getTypeFromTypeNode(node.indexType);
      const resolved = getIndexedAccessType(objectType, indexType, node);
      links.resolvedType =
        resolved.flags & qt.TypeFlags.IndexedAccess && (<IndexedAccessType>resolved).objectType === objectType && (<IndexedAccessType>resolved).indexType === indexType
          ? getConditionalFlowTypeOfType(resolved, node)
          : resolved;
    }
    return links.resolvedType;
  }
  function getTypeFromMappedTypeNode(node: MappedTypeNode): Type {
    const links = getNodeLinks(node);
    if (!links.resolvedType) {
      const type = <MappedType>createObjectType(ObjectFlags.Mapped, node.symbol);
      type.declaration = node;
      type.aliasSymbol = getAliasSymbolForTypeNode(node);
      type.aliasTypeArguments = getTypeArgumentsForAliasSymbol(type.aliasSymbol);
      links.resolvedType = type;
      getConstraintTypeFromMappedType(type);
    }
    return links.resolvedType;
  }
  function getActualTypeVariable(type: Type): Type {
    if (type.flags & qt.TypeFlags.Substitution) return (<SubstitutionType>type).baseType;
    if (type.flags & qt.TypeFlags.IndexedAccess && ((<IndexedAccessType>type).objectType.flags & qt.TypeFlags.Substitution || (<IndexedAccessType>type).indexType.flags & qt.TypeFlags.Substitution))
      return getIndexedAccessType(getActualTypeVariable((<IndexedAccessType>type).objectType), getActualTypeVariable((<IndexedAccessType>type).indexType));
    return type;
  }
  function getConditionalType(root: ConditionalRoot, mapper: TypeMapper | undefined): Type {
    let result;
    let extraTypes: Type[] | undefined;
    while (true) {
      const checkType = instantiateType(root.checkType, mapper);
      const checkTypeInstantiable = isGenericObjectType(checkType) || isGenericIndexType(checkType);
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
      if (!checkTypeInstantiable && !isGenericObjectType(inferredExtendsType) && !isGenericIndexType(inferredExtendsType)) {
        if (
          !(inferredExtendsType.flags & qt.TypeFlags.AnyOrUnknown) &&
          (checkType.flags & qt.TypeFlags.Any || !isTypeAssignableTo(getPermissiveInstantiation(checkType), getPermissiveInstantiation(inferredExtendsType)))
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
        if (inferredExtendsType.flags & qt.TypeFlags.AnyOrUnknown || isTypeAssignableTo(getRestrictiveInstantiation(checkType), getRestrictiveInstantiation(inferredExtendsType))) {
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
    return extraTypes ? getUnionType(append(extraTypes, result)) : result;
  }
  function getTrueTypeFromConditionalType(type: ConditionalType) {
    return type.resolvedTrueType || (type.resolvedTrueType = instantiateType(type.root.trueType, type.mapper));
  }
  function getFalseTypeFromConditionalType(type: ConditionalType) {
    return type.resolvedFalseType || (type.resolvedFalseType = instantiateType(type.root.falseType, type.mapper));
  }
  function getInferredTrueTypeFromConditionalType(type: ConditionalType) {
    return type.resolvedInferredTrueType || (type.resolvedInferredTrueType = type.combinedMapper ? instantiateType(type.root.trueType, type.combinedMapper) : getTrueTypeFromConditionalType(type));
  }
  function getInferTypeParameters(node: ConditionalTypeNode): TypeParameter[] | undefined {
    let result: TypeParameter[] | undefined;
    if (node.locals) {
      node.locals.forEach((symbol) => {
        if (symbol.flags & qt.SymbolFlags.TypeParameter) result = append(result, getDeclaredTypeOfSymbol(symbol));
      });
    }
    return result;
  }
  function getTypeFromConditionalTypeNode(node: ConditionalTypeNode): Type {
    const links = getNodeLinks(node);
    if (!links.resolvedType) {
      const checkType = getTypeFromTypeNode(node.checkType);
      const aliasSymbol = getAliasSymbolForTypeNode(node);
      const aliasTypeArguments = getTypeArgumentsForAliasSymbol(aliasSymbol);
      const allOuterTypeParameters = getOuterTypeParameters(node, true);
      const outerTypeParameters = aliasTypeArguments ? allOuterTypeParameters : filter(allOuterTypeParameters, (tp) => isTypeParameterPossiblyReferenced(tp, node));
      const root: ConditionalRoot = {
        node,
        checkType,
        extendsType: getTypeFromTypeNode(node.extendsType),
        trueType: getTypeFromTypeNode(node.trueType),
        falseType: getTypeFromTypeNode(node.falseType),
        isDistributive: !!(checkType.flags & qt.TypeFlags.TypeParameter),
        inferTypeParameters: getInferTypeParameters(node),
        outerTypeParameters,
        instantiations: undefined,
        aliasSymbol,
        aliasTypeArguments,
      };
      links.resolvedType = getConditionalType(root, undefined);
      if (outerTypeParameters) {
        root.instantiations = new qb.QMap<Type>();
        root.instantiations.set(getTypeListId(outerTypeParameters), links.resolvedType);
      }
    }
    return links.resolvedType;
  }
  function getTypeFromInferTypeNode(node: InferTypeNode): Type {
    const links = getNodeLinks(node);
    if (!links.resolvedType) links.resolvedType = getDeclaredTypeOfTypeParameter(getSymbolOfNode(node.typeParameter));
    return links.resolvedType;
  }
  function getIdentifierChain(node: EntityName): Identifier[] {
    if (is.kind(qc.Identifier, node)) return [node];
    return append(getIdentifierChain(node.left), node.right);
  }
  function getTypeFromImportTypeNode(node: ImportTypeNode): Type {
    const links = getNodeLinks(node);
    if (!links.resolvedType) {
      if (node.isTypeOf && node.typeArguments) {
        error(node, qd.msgs.Type_arguments_cannot_be_used_here);
        links.resolvedSymbol = unknownSymbol;
        return (links.resolvedType = errorType);
      }
      if (!is.literalImportTypeNode(node)) {
        error(node.argument, qd.msgs.String_literal_expected);
        links.resolvedSymbol = unknownSymbol;
        return (links.resolvedType = errorType);
      }
      const targetMeaning = node.isTypeOf ? qt.SymbolFlags.Value : node.flags & NodeFlags.Doc ? qt.SymbolFlags.Value | qt.SymbolFlags.Type : qt.SymbolFlags.Type;
      const innerModuleSymbol = resolveExternalModuleName(node, node.argument.literal);
      if (!innerModuleSymbol) {
        links.resolvedSymbol = unknownSymbol;
        return (links.resolvedType = errorType);
      }
      const moduleSymbol = resolveExternalModuleSymbol(innerModuleSymbol, false);
      if (!is.missing(node.qualifier)) {
        const nameStack: Identifier[] = getIdentifierChain(node.qualifier!);
        let currentNamespace = moduleSymbol;
        let current: qc.Identifier | undefined;
        while ((current = nameStack.shift())) {
          const meaning = nameStack.length ? qt.SymbolFlags.Namespace : targetMeaning;
          const next = getSymbol(getMergedSymbol(currentNamespace.resolveSymbol()).getExportsOfSymbol(), current.escapedText, meaning);
          if (!next) {
            error(current, qd.msgs.Namespace_0_has_no_exported_member_1, getFullyQualifiedName(currentNamespace), declarationNameToString(current));
            return (links.resolvedType = errorType);
          }
          getNodeLinks(current).resolvedSymbol = next;
          getNodeLinks(current.parent).resolvedSymbol = next;
          currentNamespace = next;
        }
        links.resolvedType = resolveImportSymbolType(node, links, currentNamespace, targetMeaning);
      } else {
        if (moduleSymbol.flags & targetMeaning) links.resolvedType = resolveImportSymbolType(node, links, moduleSymbol, targetMeaning);
        else {
          const errorMessage =
            targetMeaning === qt.SymbolFlags.Value
              ? qd.msgs.Module_0_does_not_refer_to_a_value_but_is_used_as_a_value_here
              : qd.msgs.Module_0_does_not_refer_to_a_type_but_is_used_as_a_type_here_Did_you_mean_typeof_import_0;
          error(node, errorMessage, node.argument.literal.text);
          links.resolvedSymbol = unknownSymbol;
          links.resolvedType = errorType;
        }
      }
    }
    return links.resolvedType;
  }
  function getTypeFromTypeLiteralOrFunctionOrConstructorTypeNode(node: TypeNode): Type {
    const links = getNodeLinks(node);
    if (!links.resolvedType) {
      const aliasSymbol = getAliasSymbolForTypeNode(node);
      if (getMembersOfSymbol(node.symbol).size === 0 && !aliasSymbol) links.resolvedType = emptyTypeLiteralType;
      else {
        let type = createObjectType(ObjectFlags.Anonymous, node.symbol);
        type.aliasSymbol = aliasSymbol;
        type.aliasTypeArguments = getTypeArgumentsForAliasSymbol(aliasSymbol);
        if (is.kind(qc.DocTypeLiteral, node) && node.isArrayType) type = createArrayType(type);
        links.resolvedType = type;
      }
    }
    return links.resolvedType;
  }
  function getAliasSymbolForTypeNode(node: Node) {
    let host = node.parent;
    while (is.kind(qc.ParenthesizedTypeNode, host) || (is.kind(qc.TypeOperatorNode, host) && host.operator === Syntax.ReadonlyKeyword)) {
      host = host.parent;
    }
    return is.typeAlias(host) ? getSymbolOfNode(host) : undefined;
  }
  function getTypeArgumentsForAliasSymbol(symbol: Symbol | undefined) {
    return symbol ? this.getLocalTypeParametersOfClassOrInterfaceOrTypeAlias() : undefined;
  }
  function getSpreadType(left: Type, right: Type, symbol: Symbol | undefined, objectFlags: ObjectFlags, readonly: boolean): Type {
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
    if (right.flags & (TypeFlags.BooleanLike | qt.TypeFlags.NumberLike | qt.TypeFlags.BigIntLike | qt.TypeFlags.StringLike | qt.TypeFlags.EnumLike | qt.TypeFlags.NonPrimitive | qt.TypeFlags.Index)) return left;
    if (isGenericObjectType(left) || isGenericObjectType(right)) {
      if (isEmptyObjectType(left)) return right;
      if (left.flags & qt.TypeFlags.Intersection) {
        const types = (<IntersectionType>left).types;
        const lastLeft = types[types.length - 1];
        if (isNonGenericObjectType(lastLeft) && isNonGenericObjectType(right))
          return getIntersectionType(concatenate(types.slice(0, types.length - 1), [getSpreadType(lastLeft, right, symbol, objectFlags, readonly)]));
      }
      return getIntersectionType([left, right]);
    }
    const members = new SymbolTable();
    const skippedPrivateMembers = qb.createEscapedMap<boolean>();
    let stringIndexInfo: IndexInfo | undefined;
    let numberIndexInfo: IndexInfo | undefined;
    if (left === emptyObjectType) {
      stringIndexInfo = getIndexInfoOfType(right, IndexKind.String);
      numberIndexInfo = getIndexInfoOfType(right, IndexKind.Number);
    } else {
      stringIndexInfo = unionSpreadIndexInfos(getIndexInfoOfType(left, IndexKind.String), getIndexInfoOfType(right, IndexKind.String));
      numberIndexInfo = unionSpreadIndexInfos(getIndexInfoOfType(left, IndexKind.Number), getIndexInfoOfType(right, IndexKind.Number));
    }
    for (const rightProp of getPropertiesOfType(right)) {
      if (getDeclarationModifierFlagsFromSymbol(rightProp) & (ModifierFlags.Private | ModifierFlags.Protected)) skippedPrivateMembers.set(rightProp.escName, true);
      else if (isSpreadableProperty(rightProp)) {
        members.set(rightProp.escName, getSpreadSymbol(rightProp, readonly));
      }
    }
    for (const leftProp of getPropertiesOfType(left)) {
      if (skippedPrivateMembers.has(leftProp.escName) || !isSpreadableProperty(leftProp)) continue;
      if (members.has(leftProp.escName)) {
        const rightProp = members.get(leftProp.escName)!;
        const rightType = getTypeOfSymbol(rightProp);
        if (rightProp.flags & qt.SymbolFlags.Optional) {
          const declarations = concatenate(leftProp.declarations, rightProp.declarations);
          const flags = qt.SymbolFlags.Property | (leftProp.flags & qt.SymbolFlags.Optional);
          const result = new Symbol(flags, leftProp.escName);
          result.type = getUnionType([getTypeOfSymbol(leftProp), getTypeWithFacts(rightType, TypeFacts.NEUndefined)]);
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
  function getSpreadSymbol(prop: Symbol, readonly: boolean) {
    const isSetonlyAccessor = prop.flags & qt.SymbolFlags.SetAccessor && !(prop.flags & qt.SymbolFlags.GetAccessor);
    if (!isSetonlyAccessor && readonly === isReadonlySymbol(prop)) return prop;
    const flags = qt.SymbolFlags.Property | (prop.flags & qt.SymbolFlags.Optional);
    const result = new Symbol(flags, prop.escName, readonly ? qt.CheckFlags.Readonly : 0);
    result.type = isSetonlyAccessor ? undefinedType : getTypeOfSymbol(prop);
    result.declarations = prop.declarations;
    result.nameType = s.getLinks(prop).nameType;
    result.syntheticOrigin = prop;
    return result;
  }
  function getIndexInfoWithReadonly(info: IndexInfo | undefined, readonly: boolean) {
    return info && info.isReadonly !== readonly ? createIndexInfo(info.type, readonly, info.declaration) : info;
  }
  function getFreshTypeOfLiteralType(type: Type): Type {
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
  function getRegularTypeOfLiteralType(type: Type): Type {
    return type.flags & qt.TypeFlags.Literal
      ? (<LiteralType>type).regularType
      : type.flags & qt.TypeFlags.Union
      ? (<UnionType>type).regularType || ((<UnionType>type).regularType = getUnionType(sameMap((<UnionType>type).types, getRegularTypeOfLiteralType)) as UnionType)
      : type;
  }
  function getLiteralType(value: string | number | PseudoBigInt, enumId?: number, symbol?: Symbol) {
    const qualifier = typeof value === 'number' ? '#' : typeof value === 'string' ? '@' : 'n';
    const key = (enumId ? enumId : '') + qualifier + (typeof value === 'object' ? pseudoBigIntToString(value) : value);
    let type = literalTypes.get(key);
    if (!type) {
      const flags = (typeof value === 'number' ? qt.TypeFlags.NumberLiteral : typeof value === 'string' ? qt.TypeFlags.StringLiteral : qt.TypeFlags.BigIntLiteral) | (enumId ? qt.TypeFlags.EnumLiteral : 0);
      literalTypes.set(key, (type = createLiteralType(flags, value, symbol)));
      type.regularType = type;
    }
    return type;
  }
  function getTypeFromLiteralTypeNode(node: LiteralTypeNode): Type {
    const links = getNodeLinks(node);
    if (!links.resolvedType) links.resolvedType = getRegularTypeOfLiteralType(check.expression(node.literal));
    return links.resolvedType;
  }
  function getESSymbolLikeTypeForNode(node: Node) {
    if (is.validESSymbolDeclaration(node)) {
      const symbol = getSymbolOfNode(node);
      const links = s.getLinks(symbol);
      return links.uniqueESSymbolType || (links.uniqueESSymbolType = createUniqueESSymbolType(symbol));
    }
    return esSymbolType;
  }
  function getThisType(node: Node): Type {
    const container = get.thisContainer(node, false);
    const parent = container && container.parent;
    if (parent && (is.classLike(parent) || parent.kind === Syntax.InterfaceDeclaration)) {
      if (!has.syntacticModifier(container, ModifierFlags.Static) && (!is.kind(qc.ConstructorDeclaration, container) || is.descendantOf(node, container.body)))
        return getDeclaredTypeOfClassOrInterface(getSymbolOfNode(parent as ClassLikeDeclaration | InterfaceDeclaration)).thisType!;
    }
    if (parent && is.kind(qc.ObjectLiteralExpression, parent) && is.kind(qc.BinaryExpression, parent.parent) && getAssignmentDeclarationKind(parent.parent) === AssignmentDeclarationKind.Prototype) {
      return getDeclaredTypeOfClassOrInterface(getSymbolOfNode(parent.parent.left)!.parent!).thisType!;
    }
    const host = node.flags & NodeFlags.Doc ? get.hostSignatureFromDoc(node) : undefined;
    if (host && is.kind(qc.FunctionExpression, host) && is.kind(qc.BinaryExpression, host.parent) && getAssignmentDeclarationKind(host.parent) === AssignmentDeclarationKind.PrototypeProperty)
      return getDeclaredTypeOfClassOrInterface(getSymbolOfNode(host.parent.left)!.parent!).thisType!;
    if (isJSConstructor(container) && is.descendantOf(node, container.body)) return getDeclaredTypeOfClassOrInterface(getSymbolOfNode(container)).thisType!;
    error(node, qd.msgs.A_this_type_is_available_only_in_a_non_static_member_of_a_class_or_interface);
    return errorType;
  }
  function getTypeFromThisNodeTypeNode(node: ThisExpression | ThisTypeNode): Type {
    const links = getNodeLinks(node);
    if (!links.resolvedType) links.resolvedType = getThisType(node);
    return links.resolvedType;
  }
  function getTypeFromNamedTupleTypeNode(node: NamedTupleMember): Type {
    const links = getNodeLinks(node);
    if (!links.resolvedType) {
      let type = getTypeFromTypeNode(node.type);
      if (node.dot3Token) type = getElementTypeOfArrayType(type) || errorType;
      if (node.questionToken && strictNullChecks) type = getOptionalType(type);
      links.resolvedType = type;
    }
    return links.resolvedType;
  }
  function getTypeFromTypeNode(node: TypeNode): Type {
    return getConditionalFlowTypeOfType(getTypeFromTypeNodeWorker(node), node);
  }
  function getTypeFromTypeNodeWorker(node: TypeNode): Type {
    switch (node.kind) {
      case Syntax.AnyKeyword:
      case Syntax.DocAllType:
      case Syntax.DocUnknownType:
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
        return node.flags & NodeFlags.JavaScriptFile && !noImplicitAny ? anyType : nonPrimitiveType;
      case Syntax.ThisType:
      case Syntax.ThisKeyword:
        return getTypeFromThisNodeTypeNode(node as ThisExpression | ThisTypeNode);
      case Syntax.LiteralType:
        return getTypeFromLiteralTypeNode(<LiteralTypeNode>node);
      case Syntax.TypeReference:
        return getTypeFromTypeReference(<TypeReferenceNode>node);
      case Syntax.TypePredicate:
        return (<TypePredicateNode>node).assertsModifier ? voidType : booleanType;
      case Syntax.ExpressionWithTypeArguments:
        return getTypeFromTypeReference(<ExpressionWithTypeArguments>node);
      case Syntax.TypeQuery:
        return getTypeFromTypeQueryNode(<TypeQueryNode>node);
      case Syntax.ArrayType:
      case Syntax.TupleType:
        return getTypeFromArrayOrTupleTypeNode(<ArrayTypeNode | TupleTypeNode>node);
      case Syntax.OptionalType:
        return getTypeFromOptionalTypeNode(<OptionalTypeNode>node);
      case Syntax.UnionType:
        return getTypeFromUnionTypeNode(<UnionTypeNode>node);
      case Syntax.IntersectionType:
        return getTypeFromIntersectionTypeNode(<IntersectionTypeNode>node);
      case Syntax.DocNullableType:
        return getTypeFromDocNullableTypeNode(<DocNullableType>node);
      case Syntax.DocOptionalType:
        return addOptionality(getTypeFromTypeNode((node as DocOptionalType).type));
      case Syntax.NamedTupleMember:
        return getTypeFromNamedTupleTypeNode(node as NamedTupleMember);
      case Syntax.ParenthesizedType:
      case Syntax.DocNonNullableType:
      case Syntax.DocTypeExpression:
        return getTypeFromTypeNode((<ParenthesizedTypeNode | DocTypeReferencingNode | DocTypeExpression | NamedTupleMember>node).type);
      case Syntax.RestType:
        return getElementTypeOfArrayType(getTypeFromTypeNode((<RestTypeNode>node).type)) || errorType;
      case Syntax.DocVariadicType:
        return getTypeFromDocVariadicType(node as DocVariadicType);
      case Syntax.FunctionType:
      case Syntax.ConstructorType:
      case Syntax.TypeLiteral:
      case Syntax.DocTypeLiteral:
      case Syntax.DocFunctionType:
      case Syntax.DocSignature:
        return getTypeFromTypeLiteralOrFunctionOrConstructorTypeNode(node);
      case Syntax.TypeOperator:
        return getTypeFromTypeOperatorNode(<TypeOperatorNode>node);
      case Syntax.IndexedAccessType:
        return getTypeFromIndexedAccessTypeNode(<IndexedAccessTypeNode>node);
      case Syntax.MappedType:
        return getTypeFromMappedTypeNode(<MappedTypeNode>node);
      case Syntax.ConditionalType:
        return getTypeFromConditionalTypeNode(<ConditionalTypeNode>node);
      case Syntax.InferType:
        return getTypeFromInferTypeNode(<InferTypeNode>node);
      case Syntax.ImportType:
        return getTypeFromImportTypeNode(<ImportTypeNode>node);
      case Syntax.Identifier:
      case Syntax.QualifiedName:
        const symbol = getSymbolAtLocation(node);
        return symbol ? getDeclaredTypeOfSymbol(symbol) : errorType;
      default:
        return errorType;
    }
  }
  function getMappedType(type: Type, mapper: TypeMapper): Type {
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
  function getRestrictiveTypeParameter(tp: TypeParameter) {
    return tp.constraint === unknownType
      ? tp
      : tp.restrictiveInstantiation ||
          ((tp.restrictiveInstantiation = createTypeParameter(tp.symbol)), ((tp.restrictiveInstantiation as TypeParameter).constraint = unknownType), tp.restrictiveInstantiation);
  }
  function getObjectTypeInstantiation(type: AnonymousType | DeferredTypeReference, mapper: TypeMapper) {
    const target = type.objectFlags & ObjectFlags.Instantiated ? type.target! : type;
    const node = type.objectFlags & ObjectFlags.Reference ? (<TypeReference>type).node! : type.symbol.declarations[0];
    const links = getNodeLinks(node);
    let typeParameters = links.outerTypeParameters;
    if (!typeParameters) {
      let declaration = node;
      if (is.inJSFile(declaration)) {
        const paramTag = qc.findAncestor(declaration, isDocParameterTag);
        if (paramTag) {
          const paramSymbol = getParameterSymbolFromDoc(paramTag);
          if (paramSymbol) declaration = paramSymbol.valueDeclaration;
        }
      }
      let outerTypeParameters = getOuterTypeParameters(declaration, true);
      if (isJSConstructor(declaration)) {
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
        links.instantiations = new qb.QMap<Type>();
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
  function getHomomorphicTypeVariable(type: MappedType) {
    const constraintType = getConstraintTypeFromMappedType(type);
    if (constraintType.flags & qt.TypeFlags.Index) {
      const typeVariable = getActualTypeVariable((<IndexType>constraintType).type);
      if (typeVariable.flags & qt.TypeFlags.TypeParameter) return <TypeParameter>typeVariable;
    }
    return;
  }
  function getModifiedReadonlyState(state: boolean, modifiers: MappedTypeModifiers) {
    return modifiers & MappedTypeModifiers.IncludeReadonly ? true : modifiers & MappedTypeModifiers.ExcludeReadonly ? false : state;
  }
  function getConditionalTypeInstantiation(type: ConditionalType, mapper: TypeMapper): Type {
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
  function getPermissiveInstantiation(type: Type) {
    return type.flags & (TypeFlags.Primitive | qt.TypeFlags.AnyOrUnknown | qt.TypeFlags.Never)
      ? type
      : type.permissiveInstantiation || (type.permissiveInstantiation = instantiateType(type, permissiveMapper));
  }
  function getRestrictiveInstantiation(type: Type) {
    if (type.flags & (TypeFlags.Primitive | qt.TypeFlags.AnyOrUnknown | qt.TypeFlags.Never)) return type;
    if (type.restrictiveInstantiation) return type.restrictiveInstantiation;
    type.restrictiveInstantiation = instantiateType(type, restrictiveMapper);
    type.restrictiveInstantiation.restrictiveInstantiation = type.restrictiveInstantiation;
    return type.restrictiveInstantiation;
  }
  function getTypeWithoutSignatures(type: Type): Type {
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
  function getBestMatchIndexedAccessTypeOrUndefined(source: Type, target: Type, nameType: Type) {
    const idx = getIndexedAccessTypeOrUndefined(target, nameType);
    if (idx) return idx;
    if (target.flags & qt.TypeFlags.Union) {
      const best = getBestMatchingType(source, target as UnionType);
      if (best) return getIndexedAccessTypeOrUndefined(best, nameType);
    }
  }
  function getElaborationElementForJsxChild(child: JsxChild, nameType: LiteralType, getInvalidTextDiagnostic: () => qd.Message) {
    switch (child.kind) {
      case Syntax.JsxExpression:
        return { errorNode: child, innerExpression: child.expression, nameType };
      case Syntax.JsxText:
        if (child.onlyTriviaWhitespaces) break;
        return { errorNode: child, innerExpression: undefined, nameType, errorMessage: getInvalidTextDiagnostic() };
      case Syntax.JsxElement:
      case Syntax.JsxSelfClosingElement:
      case Syntax.JsxFragment:
        return { errorNode: child, innerExpression: child, nameType };
      default:
        return Debug.assertNever(child, 'Found invalid jsx child');
    }
    return;
  }
  function getSemanticJsxChildren(children: Nodes<JsxChild>) {
    return filter(children, (i) => !is.kind(qc.JsxText, i) || !i.onlyTriviaWhitespaces);
  }
  function getNormalizedType(type: Type, writing: boolean): Type {
    while (true) {
      const t = isFreshLiteralType(type)
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
  function getBestMatchingType(source: Type, target: UnionOrIntersectionType, isRelatedTo = compareTypesAssignable) {
    return (
      findMatchingDiscriminantType(source, target, isRelatedTo, true) ||
      findMatchingTypeReferenceOrTypeAliasReference(source, target) ||
      findBestTypeForObjectLiteral(source, target) ||
      findBestTypeForInvokable(source, target) ||
      findMostOverlappyType(source, target)
    );
  }
  function getMarkerTypeReference(type: GenericType, source: TypeParameter, target: Type) {
    const result = createTypeReference(
      type,
      map(type.typeParameters, (t) => (t === source ? target : t))
    );
    result.objectFlags |= ObjectFlags.MarkerType;
    return result;
  }
  function getVariancesWorker<TCache extends { variances?: VarianceFlags[] }>(
    typeParameters: readonly TypeParameter[] = empty,
    cache: TCache,
    createMarkerType: (input: TCache, param: TypeParameter, marker: Type) => Type
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
        let variance = (isTypeAssignableTo(typeWithSub, typeWithSuper) ? VarianceFlags.Covariant : 0) | (isTypeAssignableTo(typeWithSuper, typeWithSub) ? VarianceFlags.Contravariant : 0);
        if (variance === VarianceFlags.Bivariant && isTypeAssignableTo(createMarkerType(cache, tp, markerOtherType), typeWithSuper)) variance = VarianceFlags.Independent;
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
  function getVariances(type: GenericType): VarianceFlags[] {
    if (type === globalArrayType || type === globalReadonlyArrayType || type.objectFlags & ObjectFlags.Tuple) return arrayVariances;
    return getVariancesWorker(type.typeParameters, type, getMarkerTypeReference);
  }
  function getTypeReferenceId(type: TypeReference, typeParameters: Type[], depth = 0) {
    let result = '' + type.target.id;
    for (const t of getTypeArguments(type)) {
      if (isUnconstrainedTypeParameter(t)) {
        let index = typeParameters.indexOf(t);
        if (index < 0) {
          index = typeParameters.length;
          typeParameters.push(t);
        }
        result += '=' + index;
      } else if (depth < 4 && isTypeReferenceWithGenericArguments(t)) {
        result += '<' + getTypeReferenceId(t as TypeReference, typeParameters, depth + 1) + '>';
      } else {
        result += '-' + t.id;
      }
    }
    return result;
  }
  function getRelationKey(source: Type, target: Type, intersectionState: IntersectionState, relation: qb.QMap<RelationComparisonResult>) {
    if (relation === identityRelation && source.id > target.id) {
      const temp = source;
      source = target;
      target = temp;
    }
    const postFix = intersectionState ? ':' + intersectionState : '';
    if (isTypeReferenceWithGenericArguments(source) && isTypeReferenceWithGenericArguments(target)) {
      const typeParameters: Type[] = [];
      return getTypeReferenceId(<TypeReference>source, typeParameters) + ',' + getTypeReferenceId(<TypeReference>target, typeParameters) + postFix;
    }
    return source.id + ',' + target.id + postFix;
  }
  function getDeclaringClass(prop: Symbol) {
    return prop.parent && prop.parent.flags & qt.SymbolFlags.Class ? <InterfaceType>getDeclaredTypeOfSymbol(getParentOfSymbol(prop)!) : undefined;
  }
  function getTypeOfPropertyInBaseClass(property: Symbol) {
    const classType = getDeclaringClass(property);
    const baseClassType = classType && getBaseTypes(classType)[0];
    return baseClassType && getTypeOfPropertyOfType(baseClassType, property.escName);
  }
  function getRootObjectTypeFromIndexedAccessChain(type: Type) {
    let t = type;
    while (t.flags & qt.TypeFlags.IndexedAccess) {
      t = (t as IndexedAccessType).objectType;
    }
    return t;
  }
  function getSupertypeOrUnion(types: Type[]): Type {
    return literalTypesWithSameBaseType(types) ? getUnionType(types) : reduceLeft(types, (s, t) => (isTypeSubtypeOf(s, t) ? t : s))!;
  }
  function getCommonSupertype(types: Type[]): Type {
    if (!strictNullChecks) return getSupertypeOrUnion(types);
    const primaryTypes = filter(types, (t) => !(t.flags & qt.TypeFlags.Nullable));
    return primaryTypes.length ? getNullableType(getSupertypeOrUnion(primaryTypes), getFalsyFlagsOfTypes(types) & qt.TypeFlags.Nullable) : getUnionType(types, UnionReduction.Subtype);
  }
  function getCommonSubtype(types: Type[]) {
    return reduceLeft(types, (s, t) => (isTypeSubtypeOf(t, s) ? t : s))!;
  }
  function getElementTypeOfArrayType(type: Type): Type | undefined {
    return isArrayType(type) ? getTypeArguments(type as TypeReference)[0] : undefined;
  }
  function getTupleElementType(type: Type, index: number) {
    const propType = getTypeOfPropertyOfType(type, ('' + index) as qb.__String);
    if (propType) return propType;
    if (everyType(type, isTupleType)) return mapType(type, (t) => getRestTypeOfTupleType(<TupleTypeReference>t) || undefinedType);
    return;
  }
  function getBaseTypeOfLiteralType(type: Type): Type {
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
      ? getUnionType(sameMap((<UnionType>type).types, getBaseTypeOfLiteralType))
      : type;
  }
  function getWidenedLiteralType(type: Type): Type {
    return type.flags & qt.TypeFlags.EnumLiteral && isFreshLiteralType(type)
      ? getBaseTypeOfEnumLiteralType(<LiteralType>type)
      : type.flags & qt.TypeFlags.StringLiteral && isFreshLiteralType(type)
      ? stringType
      : type.flags & qt.TypeFlags.NumberLiteral && isFreshLiteralType(type)
      ? numberType
      : type.flags & qt.TypeFlags.BigIntLiteral && isFreshLiteralType(type)
      ? bigintType
      : type.flags & qt.TypeFlags.BooleanLiteral && isFreshLiteralType(type)
      ? booleanType
      : type.flags & qt.TypeFlags.Union
      ? getUnionType(sameMap((<UnionType>type).types, getWidenedLiteralType))
      : type;
  }
  function getWidenedUniqueESSymbolType(type: Type): Type {
    return type.flags & qt.TypeFlags.UniqueESSymbol ? esSymbolType : type.flags & qt.TypeFlags.Union ? getUnionType(sameMap((<UnionType>type).types, getWidenedUniqueESSymbolType)) : type;
  }
  function getWidenedLiteralLikeTypeForContextualType(type: Type, contextualType: Type | undefined) {
    if (!isLiteralOfContextualType(type, contextualType)) type = getWidenedUniqueESSymbolType(getWidenedLiteralType(type));
    return type;
  }
  function getWidenedLiteralLikeTypeForContextualReturnTypeIfNeeded(type: Type | undefined, contextualSignatureReturnType: Type | undefined, isAsync: boolean) {
    if (type && isUnitType(type)) {
      const contextualType = !contextualSignatureReturnType ? undefined : isAsync ? getPromisedTypeOfPromise(contextualSignatureReturnType) : contextualSignatureReturnType;
      type = getWidenedLiteralLikeTypeForContextualType(type, contextualType);
    }
    return type;
  }
  function getWidenedLiteralLikeTypeForContextualIterationTypeIfNeeded(type: Type | undefined, contextualSignatureReturnType: Type | undefined, kind: IterationTypeKind, isAsyncGenerator: boolean) {
    if (type && isUnitType(type)) {
      const contextualType = !contextualSignatureReturnType ? undefined : getIterationTypeOfGeneratorFunctionReturnType(kind, contextualSignatureReturnType, isAsyncGenerator);
      type = getWidenedLiteralLikeTypeForContextualType(type, contextualType);
    }
    return type;
  }
  function getRestTypeOfTupleType(type: TupleTypeReference) {
    return type.target.hasRestElement ? getTypeArguments(type)[type.target.typeParameters!.length - 1] : undefined;
  }
  function getRestArrayTypeOfTupleType(type: TupleTypeReference) {
    const restType = getRestTypeOfTupleType(type);
    return restType && createArrayType(restType);
  }
  function getLengthOfTupleType(type: TupleTypeReference) {
    return getTypeReferenceArity(type) - (type.target.hasRestElement ? 1 : 0);
  }
  function getFalsyFlagsOfTypes(types: Type[]): qt.TypeFlags {
    let result: qt.TypeFlags = 0;
    for (const t of types) {
      result |= getFalsyFlags(t);
    }
    return result;
  }
  function getFalsyFlags(type: Type): qt.TypeFlags {
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
  function getDefinitelyFalsyPartOfType(type: Type): Type {
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
  function getNullableType(type: Type, flags: qt.TypeFlags): Type {
    const missing = flags & ~type.flags & (TypeFlags.Undefined | qt.TypeFlags.Null);
    return missing === 0
      ? type
      : missing === qt.TypeFlags.Undefined
      ? getUnionType([type, undefinedType])
      : missing === qt.TypeFlags.Null
      ? getUnionType([type, nullType])
      : getUnionType([type, undefinedType, nullType]);
  }
  function getOptionalType(type: Type): Type {
    assert(strictNullChecks);
    return type.flags & qt.TypeFlags.Undefined ? type : getUnionType([type, undefinedType]);
  }
  function getGlobalNonNullableTypeInstantiation(type: Type) {
    if (!deferredGlobalNonNullableTypeAlias) deferredGlobalNonNullableTypeAlias = getGlobalSymbol('NonNullable' as qb.__String, qt.SymbolFlags.TypeAlias, undefined) || unknownSymbol;
    if (deferredGlobalNonNullableTypeAlias !== unknownSymbol) return getTypeAliasInstantiation(deferredGlobalNonNullableTypeAlias, [type]);
    return getTypeWithFacts(type, TypeFacts.NEUndefinedOrNull);
  }
  function getNonNullableType(type: Type): Type {
    return strictNullChecks ? getGlobalNonNullableTypeInstantiation(type) : type;
  }
  function getOptionalExpressionType(exprType: Type, expression: Expression) {
    return is.expressionOfOptionalChainRoot(expression) ? getNonNullableType(exprType) : is.optionalChain(expression) ? removeOptionalTypeMarker(exprType) : exprType;
  }
  function getRegularTypeOfObjectLiteral(type: Type): Type {
    if (!(isObjectLiteralType(type) && getObjectFlags(type) & ObjectFlags.FreshLiteral)) return type;
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
  function getSiblingsOfContext(context: WideningContext): Type[] {
    if (!context.siblings) {
      const siblings: Type[] = [];
      for (const type of getSiblingsOfContext(context.parent!)) {
        if (isObjectLiteralType(type)) {
          const prop = getPropertyOfObjectType(type, context.propertyName!);
          if (prop) {
            forEachType(getTypeOfSymbol(prop), (t) => {
              siblings.push(t);
            });
          }
        }
      }
      context.siblings = siblings;
    }
    return context.siblings;
  }
  function getPropertiesOfContext(context: WideningContext): Symbol[] {
    if (!context.resolvedProperties) {
      const names = new qb.QMap<Symbol>() as EscapedMap<Symbol>;
      for (const t of getSiblingsOfContext(context)) {
        if (isObjectLiteralType(t) && !(getObjectFlags(t) & ObjectFlags.ContainsSpread)) {
          for (const prop of getPropertiesOfType(t)) {
            names.set(prop.escName, prop);
          }
        }
      }
      context.resolvedProperties = arrayFrom(names.values());
    }
    return context.resolvedProperties;
  }
  function getWidenedProperty(prop: Symbol, context: WideningContext | undefined): Symbol {
    if (!(prop.flags & qt.SymbolFlags.Property)) return prop;
    const original = getTypeOfSymbol(prop);
    const propContext = context && createWideningContext(context, prop.escName, undefined);
    const widened = getWidenedTypeWithContext(original, propContext);
    return widened === original ? prop : createSymbolWithType(prop, widened);
  }
  function getUndefinedProperty(prop: Symbol) {
    const cached = undefinedProperties.get(prop.escName);
    if (cached) return cached;
    const result = createSymbolWithType(prop, undefinedType);
    result.flags |= qt.SymbolFlags.Optional;
    undefinedProperties.set(prop.escName, result);
    return result;
  }
  function getWidenedTypeOfObjectLiteral(type: Type, context: WideningContext | undefined): Type {
    const members = new SymbolTable();
    for (const prop of getPropertiesOfObjectType(type)) {
      members.set(prop.escName, getWidenedProperty(prop, context));
    }
    if (context) {
      for (const prop of getPropertiesOfContext(context)) {
        if (!members.has(prop.escName)) members.set(prop.escName, getUndefinedProperty(prop));
      }
    }
    const stringIndexInfo = getIndexInfoOfType(type, IndexKind.String);
    const numberIndexInfo = getIndexInfoOfType(type, IndexKind.Number);
    const result = createAnonymousType(
      type.symbol,
      members,
      empty,
      empty,
      stringIndexInfo && createIndexInfo(getWidenedType(stringIndexInfo.type), stringIndexInfo.isReadonly),
      numberIndexInfo && createIndexInfo(getWidenedType(numberIndexInfo.type), numberIndexInfo.isReadonly)
    );
    result.objectFlags |= getObjectFlags(type) & (ObjectFlags.JSLiteral | ObjectFlags.NonInferrableType);
    return result;
  }
  function getWidenedType(type: Type) {
    return getWidenedTypeWithContext(type, undefined);
  }
  function getWidenedTypeWithContext(type: Type, context: WideningContext | undefined): Type {
    if (getObjectFlags(type) & ObjectFlags.RequiresWidening) {
      if (context === undefined && type.widened) return type.widened;
      let result: Type | undefined;
      if (type.flags & (TypeFlags.Any | qt.TypeFlags.Nullable)) result = anyType;
      else if (isObjectLiteralType(type)) {
        result = getWidenedTypeOfObjectLiteral(type, context);
      } else if (type.flags & qt.TypeFlags.Union) {
        const unionContext = context || createWideningContext(undefined, (<UnionType>type).types);
        const widenedTypes = sameMap((<UnionType>type).types, (t) => (t.flags & qt.TypeFlags.Nullable ? t : getWidenedTypeWithContext(t, unionContext)));
        result = getUnionType(widenedTypes, some(widenedTypes, isEmptyObjectType) ? UnionReduction.Subtype : UnionReduction.Literal);
      } else if (type.flags & qt.TypeFlags.Intersection) {
        result = getIntersectionType(sameMap((<IntersectionType>type).types, getWidenedType));
      } else if (isArrayType(type) || isTupleType(type)) {
        result = createTypeReference((<TypeReference>type).target, sameMap(getTypeArguments(<TypeReference>type), getWidenedType));
      }
      if (result && context === undefined) type.widened = result;
      return result || type;
    }
    return type;
  }
  function getMapperFromContext<T extends InferenceContext | undefined>(context: T): TypeMapper | (T & undefined) {
    return context && context.mapper;
  }
  function getTypeOfReverseMappedSymbol(symbol: ReverseMappedSymbol) {
    return inferReverseMappedType(symbol.propertyType, symbol.mappedType, symbol.constraintType);
  }
  function* getUnmatchedProperties(source: Type, target: Type, requireOptionalProperties: boolean, matchDiscriminantProperties: boolean): IterableIterator<Symbol> {
    const properties = getPropertiesOfType(target);
    for (const targetProp of properties) {
      if (isStaticPrivateIdentifierProperty(targetProp)) continue;
      if (requireOptionalProperties || !(targetProp.flags & qt.SymbolFlags.Optional || getCheckFlags(targetProp) & qt.CheckFlags.Partial)) {
        const sourceProp = getPropertyOfType(source, targetProp.escName);
        if (!sourceProp) yield targetProp;
        else if (matchDiscriminantProperties) {
          const targetType = getTypeOfSymbol(targetProp);
          if (targetType.flags & qt.TypeFlags.Unit) {
            const sourceType = getTypeOfSymbol(sourceProp);
            if (!(sourceType.flags & qt.TypeFlags.Any || getRegularTypeOfLiteralType(sourceType) === getRegularTypeOfLiteralType(targetType))) yield targetProp;
          }
        }
      }
    }
  }
  function getUnmatchedProperty(source: Type, target: Type, requireOptionalProperties: boolean, matchDiscriminantProperties: boolean): Symbol | undefined {
    const result = getUnmatchedProperties(source, target, requireOptionalProperties, matchDiscriminantProperties).next();
    if (!result.done) return result.value;
  }
  function getTypeFromInference(inference: InferenceInfo) {
    return inference.candidates ? getUnionType(inference.candidates, UnionReduction.Subtype) : inference.contraCandidates ? getIntersectionType(inference.contraCandidates) : undefined;
  }
  function getContravariantInference(inference: InferenceInfo) {
    return inference.priority! & InferencePriority.PriorityImpliesCombination ? getIntersectionType(inference.contraCandidates!) : getCommonSubtype(inference.contraCandidates!);
  }
  function getCovariantInference(inference: InferenceInfo, signature: Signature) {
    const candidates = unionObjectAndArrayLiteralCandidates(inference.candidates!);
    const primitiveConstraint = hasPrimitiveConstraint(inference.typeParameter);
    const widenLiteralTypes = !primitiveConstraint && inference.topLevel && (inference.isFixed || !isTypeParameterAtTopLevel(getReturnTypeOfSignature(signature), inference.typeParameter));
    const baseCandidates = primitiveConstraint ? sameMap(candidates, getRegularTypeOfLiteralType) : widenLiteralTypes ? sameMap(candidates, getWidenedLiteralType) : candidates;
    const unwidenedType = inference.priority! & InferencePriority.PriorityImpliesCombination ? getUnionType(baseCandidates, UnionReduction.Subtype) : getCommonSupertype(baseCandidates);
    return getWidenedType(unwidenedType);
  }
  function getInferredType(context: InferenceContext, index: number): Type {
    const inference = context.inferences[index];
    if (!inference.inferredType) {
      let inferredType: Type | undefined;
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
  function getDefaultTypeArgumentType(isInJavaScriptFile: boolean): Type {
    return isInJavaScriptFile ? anyType : unknownType;
  }
  function getInferredTypes(context: InferenceContext): Type[] {
    const result: Type[] = [];
    for (let i = 0; i < context.inferences.length; i++) {
      result.push(getInferredType(context, i));
    }
    return result;
  }
  function getCannotFindNameDiagnosticForName(node: Identifier): qd.Message {
    switch (node.escapedText) {
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
          ? qd.msgs.Cannot_find_name_0_Do_you_need_to_install_type_definitions_for_a_test_runner_Try_npm_i_types_Slashjest_or_npm_i_types_Slashmocha_and_then_add_jest_or_mocha_to_the_types_field_in_your_tsconfig
          : qd.msgs.Cannot_find_name_0_Do_you_need_to_install_type_definitions_for_a_test_runner_Try_npm_i_types_Slashjest_or_npm_i_types_Slashmocha;
      case 'process':
      case 'require':
      case 'Buffer':
      case 'module':
        return compilerOptions.types
          ? qd.msgs.Cannot_find_name_0_Do_you_need_to_install_type_definitions_for_node_Try_npm_i_types_Slashnode_and_then_add_node_to_the_types_field_in_your_tsconfig
          : qd.msgs.Cannot_find_name_0_Do_you_need_to_install_type_definitions_for_node_Try_npm_i_types_Slashnode;
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
        if (node.parent.kind === Syntax.ShorthandPropertyAssignment) return qd.msgs.No_value_exists_in_scope_for_the_shorthand_property_0_Either_declare_one_or_provide_an_initer;
        return qd.msgs.Cannot_find_name_0;
    }
  }
  function getResolvedSymbol(node: Identifier): Symbol {
    const links = getNodeLinks(node);
    if (!links.resolvedSymbol) {
      links.resolvedSymbol =
        (!is.missing(node) &&
          resolveName(
            node,
            node.escapedText,
            qt.SymbolFlags.Value | qt.SymbolFlags.ExportValue,
            getCannotFindNameDiagnosticForName(node),
            node,
            !is.writeOnlyAccess(node),
            false,
            qd.msgs.Cannot_find_name_0_Did_you_mean_1
          )) ||
        unknownSymbol;
    }
    return links.resolvedSymbol;
  }
  function getFlowCacheKey(node: Node, declaredType: Type, initialType: Type, flowContainer: Node | undefined): string | undefined {
    switch (node.kind) {
      case Syntax.Identifier:
        const symbol = getResolvedSymbol(<Identifier>node);
        return symbol !== unknownSymbol
          ? `${flowContainer ? getNodeId(flowContainer) : '-1'}|${getTypeId(declaredType)}|${getTypeId(initialType)}|${isConstraintPosition(node) ? '@' : ''}${symbol.getId()}`
          : undefined;
      case Syntax.ThisKeyword:
        return '0';
      case Syntax.NonNullExpression:
      case Syntax.ParenthesizedExpression:
        return getFlowCacheKey((<NonNullExpression | ParenthesizedExpression>node).expression, declaredType, initialType, flowContainer);
      case Syntax.PropertyAccessExpression:
      case Syntax.ElementAccessExpression:
        const propName = getAccessedPropertyName(<AccessExpression>node);
        if (propName !== undefined) {
          const key = getFlowCacheKey((<AccessExpression>node).expression, declaredType, initialType, flowContainer);
          return key && key + '.' + propName;
        }
    }
    return;
  }
  function getAccessedPropertyName(access: AccessExpression): qb.__String | undefined {
    return access.kind === Syntax.PropertyAccessExpression
      ? access.name.escapedText
      : StringLiteral.orNumericLiteralLike(access.argumentExpression)
      ? qy.get.escUnderscores(access.argumentExpression.text)
      : undefined;
  }
  function getFlowNodeId(flow: FlowNode): number {
    if (!flow.id || flow.id < 0) {
      flow.id = nextFlowId;
      nextFlowId++;
    }
    return flow.id;
  }
  function getAssignmentReducedType(declaredType: UnionType, assignedType: Type) {
    if (declaredType !== assignedType) {
      if (assignedType.flags & qt.TypeFlags.Never) return assignedType;
      let reducedType = filterType(declaredType, (t) => typeMaybeAssignableTo(assignedType, t));
      if (assignedType.flags & qt.TypeFlags.BooleanLiteral && isFreshLiteralType(assignedType)) reducedType = mapType(reducedType, getFreshTypeOfLiteralType);
      if (isTypeAssignableTo(assignedType, reducedType)) return reducedType;
    }
    return declaredType;
  }
  function getTypeFactsOfTypes(types: Type[]): TypeFacts {
    let result: TypeFacts = TypeFacts.None;
    for (const t of types) {
      result |= getTypeFacts(t);
    }
    return result;
  }
  function getTypeFacts(type: Type): TypeFacts {
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
      return getObjectFlags(type) & ObjectFlags.Anonymous && isEmptyObjectType(<ObjectType>type)
        ? strictNullChecks
          ? TypeFacts.EmptyObjectStrictFacts
          : TypeFacts.EmptyObjectFacts
        : isFunctionObjectType(<ObjectType>type)
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
  function getTypeWithFacts(type: Type, include: TypeFacts) {
    return filterType(type, (t) => (getTypeFacts(t) & include) !== 0);
  }
  function getTypeWithDefault(type: Type, defaultExpression: Expression) {
    if (defaultExpression) {
      const defaultType = getTypeOfExpression(defaultExpression);
      return getUnionType([getTypeWithFacts(type, TypeFacts.NEUndefined), defaultType]);
    }
    return type;
  }
  function getTypeOfDestructuredProperty(type: Type, name: PropertyName) {
    const nameType = getLiteralTypeFromPropertyName(name);
    if (!isTypeUsableAsPropertyName(nameType)) return errorType;
    const text = getPropertyNameFromType(nameType);
    return (
      getConstraintForLocation(getTypeOfPropertyOfType(type, text), name) ||
      (NumericLiteral.name(text) && getIndexTypeOfType(type, IndexKind.Number)) ||
      getIndexTypeOfType(type, IndexKind.String) ||
      errorType
    );
  }
  function getTypeOfDestructuredArrayElement(type: Type, index: number) {
    return (everyType(type, isTupleLikeType) && getTupleElementType(type, index)) || check.iteratedTypeOrElementType(IterationUse.Destructuring, type, undefinedType, undefined) || errorType;
  }
  function getTypeOfDestructuredSpreadExpression(type: Type) {
    return createArrayType(check.iteratedTypeOrElementType(IterationUse.Destructuring, type, undefinedType, undefined) || errorType);
  }
  function getAssignedTypeOfBinaryExpression(node: BinaryExpression): Type {
    const isDestructuringDefaultAssignment =
      (node.parent.kind === Syntax.ArrayLiteralExpression && isDestructuringAssignmentTarget(node.parent)) ||
      (node.parent.kind === Syntax.PropertyAssignment && isDestructuringAssignmentTarget(node.parent.parent));
    return isDestructuringDefaultAssignment ? getTypeWithDefault(getAssignedType(node), node.right) : getTypeOfExpression(node.right);
  }
  function getAssignedTypeOfArrayLiteralElement(node: ArrayLiteralExpression, element: Expression): Type {
    return getTypeOfDestructuredArrayElement(getAssignedType(node), node.elements.indexOf(element));
  }
  function getAssignedTypeOfSpreadExpression(node: SpreadElement): Type {
    return getTypeOfDestructuredSpreadExpression(getAssignedType(<ArrayLiteralExpression>node.parent));
  }
  function getAssignedTypeOfPropertyAssignment(node: PropertyAssignment | ShorthandPropertyAssignment): Type {
    return getTypeOfDestructuredProperty(getAssignedType(node.parent), node.name);
  }
  function getAssignedTypeOfShorthandPropertyAssignment(node: ShorthandPropertyAssignment): Type {
    return getTypeWithDefault(getAssignedTypeOfPropertyAssignment(node), node.objectAssignmentIniter!);
  }
  function getAssignedType(node: Expression): Type {
    const { parent } = node;
    switch (parent.kind) {
      case Syntax.ForInStatement:
        return stringType;
      case Syntax.ForOfStatement:
        return check.rightHandSideOfForOf(<ForOfStatement>parent) || errorType;
      case Syntax.BinaryExpression:
        return getAssignedTypeOfBinaryExpression(<BinaryExpression>parent);
      case Syntax.DeleteExpression:
        return undefinedType;
      case Syntax.ArrayLiteralExpression:
        return getAssignedTypeOfArrayLiteralElement(<ArrayLiteralExpression>parent, node);
      case Syntax.SpreadElement:
        return getAssignedTypeOfSpreadExpression(<SpreadElement>parent);
      case Syntax.PropertyAssignment:
        return getAssignedTypeOfPropertyAssignment(<PropertyAssignment>parent);
      case Syntax.ShorthandPropertyAssignment:
        return getAssignedTypeOfShorthandPropertyAssignment(<ShorthandPropertyAssignment>parent);
    }
    return errorType;
  }
  function getInitialTypeOfBindingElement(node: BindingElement): Type {
    const pattern = node.parent;
    const parentType = getInitialType(<VariableDeclaration | BindingElement>pattern.parent);
    const type =
      pattern.kind === Syntax.ObjectBindingPattern
        ? getTypeOfDestructuredProperty(parentType, node.propertyName || <Identifier>node.name)
        : !node.dot3Token
        ? getTypeOfDestructuredArrayElement(parentType, pattern.elements.indexOf(node))
        : getTypeOfDestructuredSpreadExpression(parentType);
    return getTypeWithDefault(type, node.initer!);
  }
  function getTypeOfIniter(node: Expression) {
    const links = getNodeLinks(node);
    return links.resolvedType || getTypeOfExpression(node);
  }
  function getInitialTypeOfVariableDeclaration(node: VariableDeclaration) {
    if (node.initer) return getTypeOfIniter(node.initer);
    if (node.parent.parent.kind === Syntax.ForInStatement) return stringType;
    if (node.parent.parent.kind === Syntax.ForOfStatement) return check.rightHandSideOfForOf(node.parent.parent) || errorType;
    return errorType;
  }
  function getInitialType(node: VariableDeclaration | BindingElement) {
    return node.kind === Syntax.VariableDeclaration ? getInitialTypeOfVariableDeclaration(node) : getInitialTypeOfBindingElement(node);
  }
  function getReferenceCandidate(node: Expression): Expression {
    switch (node.kind) {
      case Syntax.ParenthesizedExpression:
        return getReferenceCandidate((<ParenthesizedExpression>node).expression);
      case Syntax.BinaryExpression:
        switch ((<BinaryExpression>node).operatorToken.kind) {
          case Syntax.EqualsToken:
            return getReferenceCandidate((<BinaryExpression>node).left);
          case Syntax.CommaToken:
            return getReferenceCandidate((<BinaryExpression>node).right);
        }
    }
    return node;
  }
  function getReferenceRoot(node: Node): Node {
    const { parent } = node;
    return parent.kind === Syntax.ParenthesizedExpression ||
      (parent.kind === Syntax.BinaryExpression && (<BinaryExpression>parent).operatorToken.kind === Syntax.EqualsToken && (<BinaryExpression>parent).left === node) ||
      (parent.kind === Syntax.BinaryExpression && (<BinaryExpression>parent).operatorToken.kind === Syntax.CommaToken && (<BinaryExpression>parent).right === node)
      ? getReferenceRoot(parent)
      : node;
  }
  function getTypeOfSwitchClause(clause: CaseClause | DefaultClause) {
    if (clause.kind === Syntax.CaseClause) return getRegularTypeOfLiteralType(getTypeOfExpression(clause.expression));
    return neverType;
  }
  function getSwitchClauseTypes(switchStatement: SwitchStatement): Type[] {
    const links = getNodeLinks(switchStatement);
    if (!links.switchTypes) {
      links.switchTypes = [];
      for (const clause of switchStatement.caseBlock.clauses) {
        links.switchTypes.push(getTypeOfSwitchClause(clause));
      }
    }
    return links.switchTypes;
  }
  function getSwitchClauseTypeOfWitnesses(switchStatement: SwitchStatement, retainDefault: false): string[];
  function getSwitchClauseTypeOfWitnesses(switchStatement: SwitchStatement, retainDefault: boolean): (string | undefined)[];
  function getSwitchClauseTypeOfWitnesses(switchStatement: SwitchStatement, retainDefault: boolean): (string | undefined)[] {
    const witnesses: (string | undefined)[] = [];
    for (const clause of switchStatement.caseBlock.clauses) {
      if (clause.kind === Syntax.CaseClause) {
        if (StringLiteral.like(clause.expression)) {
          witnesses.push(clause.expression.text);
          continue;
        }
        return empty;
      }
      if (retainDefault) witnesses.push(undefined);
    }
    return witnesses;
  }
  function getTypeFromFlowType(flowType: FlowType) {
    return flowType.flags === 0 ? (<IncompleteType>flowType).type : <Type>flowType;
  }
  function getEvolvingArrayType(elementType: Type): EvolvingArrayType {
    return evolvingArrayTypes[elementType.id] || (evolvingArrayTypes[elementType.id] = createEvolvingArrayType(elementType));
  }
  function getFinalArrayType(evolvingArrayType: EvolvingArrayType): Type {
    return evolvingArrayType.finalArrayType || (evolvingArrayType.finalArrayType = createFinalArrayType(evolvingArrayType.elementType));
  }
  function getElementTypeOfEvolvingArrayType(type: Type) {
    return getObjectFlags(type) & ObjectFlags.EvolvingArray ? (<EvolvingArrayType>type).elementType : neverType;
  }
  function getUnionOrEvolvingArrayType(types: Type[], subtypeReduction: UnionReduction) {
    return isEvolvingArrayTypeList(types)
      ? getEvolvingArrayType(getUnionType(map(types, getElementTypeOfEvolvingArrayType)))
      : getUnionType(sameMap(types, finalizeEvolvingArrayType), subtypeReduction);
  }
  function getExplicitTypeOfSymbol(symbol: Symbol, diagnostic?: qd.Diagnostic) {
    if (symbol.flags & (SymbolFlags.Function | qt.SymbolFlags.Method | qt.SymbolFlags.Class | qt.SymbolFlags.ValueModule)) return this.getTypeOfSymbol();
    if (symbol.flags & (SymbolFlags.Variable | qt.SymbolFlags.Property)) {
      const declaration = symbol.valueDeclaration;
      if (declaration) {
        if (isDeclarationWithExplicitTypeAnnotation(declaration)) return this.getTypeOfSymbol();
        if (is.kind(qc.VariableDeclaration, declaration) && declaration.parent.parent.kind === Syntax.ForOfStatement) {
          const statement = declaration.parent.parent;
          const expressionType = getTypeOfDottedName(statement.expression, undefined);
          if (expressionType) {
            const use = statement.awaitModifier ? IterationUse.ForAwaitOf : IterationUse.ForOf;
            return check.iteratedTypeOrElementType(use, expressionType, undefinedType, undefined);
          }
        }
        if (diagnostic) addRelatedInfo(diagnostic, createDiagnosticForNode(declaration, qd.msgs._0_needs_an_explicit_type_annotation, symbol.symbolToString()));
      }
    }
  }
  function getTypeOfDottedName(node: Expression, diagnostic: qd.Diagnostic | undefined): Type | undefined {
    if (!(node.flags & NodeFlags.InWithStatement)) {
      switch (node.kind) {
        case Syntax.Identifier:
          const symbol = getExportSymbolOfValueSymbolIfExported(getResolvedSymbol(<Identifier>node));
          return getExplicitTypeOfSymbol(symbol.flags & qt.SymbolFlags.Alias ? this.resolveAlias() : symbol, diagnostic);
        case Syntax.ThisKeyword:
          return getExplicitThisType(node);
        case Syntax.SuperKeyword:
          return check.superExpression(node);
        case Syntax.PropertyAccessExpression:
          const type = getTypeOfDottedName((<PropertyAccessExpression>node).expression, diagnostic);
          const prop = type && getPropertyOfType(type, (<PropertyAccessExpression>node).name.escapedText);
          return prop && getExplicitTypeOfSymbol(prop, diagnostic);
        case Syntax.ParenthesizedExpression:
          return getTypeOfDottedName((<ParenthesizedExpression>node).expression, diagnostic);
      }
    }
  }
  function getEffectsSignature(node: CallExpression) {
    const links = getNodeLinks(node);
    let signature = links.effectsSignature;
    if (signature === undefined) {
      let funcType: Type | undefined;
      if (node.parent.kind === Syntax.ExpressionStatement) funcType = getTypeOfDottedName(node.expression, undefined);
      else if (node.expression.kind !== Syntax.SuperKeyword) {
        if (is.optionalChain(node)) funcType = check.nonNullType(getOptionalExpressionType(check.expression(node.expression), node.expression), node.expression);
        else {
          funcType = check.nonNullExpression(node.expression);
        }
      }
      const signatures = getSignaturesOfType((funcType && getApparentType(funcType)) || unknownType, SignatureKind.Call);
      const candidate = signatures.length === 1 && !signatures[0].typeParameters ? signatures[0] : some(signatures, hasTypePredicateOrNeverReturnType) ? getResolvedSignature(node) : undefined;
      signature = links.effectsSignature = candidate && hasTypePredicateOrNeverReturnType(candidate) ? candidate : unknownSignature;
    }
    return signature === unknownSignature ? undefined : signature;
  }
  function getTypePredicateArgument(predicate: TypePredicate, callExpression: CallExpression) {
    if (predicate.kind === TypePredicateKind.Identifier || predicate.kind === TypePredicateKind.AssertsIdentifier) return callExpression.arguments[predicate.parameterIndex];
    const invokedExpression = skipParentheses(callExpression.expression);
    return is.accessExpression(invokedExpression) ? skipParentheses(invokedExpression.expression) : undefined;
  }
  function getFlowTypeOfReference(reference: Node, declaredType: Type, initialType = declaredType, flowContainer?: Node, couldBeUninitialized?: boolean) {
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
            reference.kind !== Syntax.ElementAccessExpression &&
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
      const node = flow.node;
      return getConstraintForLocation(
        node.kind === Syntax.VariableDeclaration || node.kind === Syntax.BindingElement ? getInitialType(<VariableDeclaration | BindingElement>node) : getAssignedType(node),
        reference
      );
    }
    function getTypeAtFlowAssignment(flow: FlowAssignment) {
      const node = flow.node;
      if (isMatchingReference(reference, node)) {
        if (!isReachableFlowNode(flow)) return unreachableNeverType;
        if (get.assignmentTargetKind(node) === AssignmentKind.Compound) {
          const flowType = getTypeAtFlowNode(flow.antecedent);
          return createFlowType(getBaseTypeOfLiteralType(getTypeFromFlowType(flowType)), isIncomplete(flowType));
        }
        if (declaredType === autoType || declaredType === autoArrayType) {
          if (isEmptyArrayAssignment(node)) return getEvolvingArrayType(neverType);
          const assignedType = getWidenedLiteralType(getInitialOrAssignedType(flow));
          return isTypeAssignableTo(assignedType, declaredType) ? assignedType : anyArrayType;
        }
        if (declaredType.flags & qt.TypeFlags.Union) return getAssignmentReducedType(<UnionType>declaredType, getInitialOrAssignedType(flow));
        return declaredType;
      }
      if (containsMatchingReference(reference, node)) {
        if (!isReachableFlowNode(flow)) return unreachableNeverType;
        if (is.kind(qc.VariableDeclaration, node) && (is.inJSFile(node) || is.varConst(node))) {
          const init = getDeclaredExpandoIniter(node);
          if (init && (init.kind === Syntax.FunctionExpression || init.kind === Syntax.ArrowFunction)) return getTypeAtFlowNode(flow.antecedent);
        }
        return declaredType;
      }
      if (is.kind(qc.VariableDeclaration, node) && node.parent.parent.kind === Syntax.ForInStatement && isMatchingReference(reference, node.parent.parent.expression))
        return getNonNullableTypeIfNeeded(getTypeFromFlowType(getTypeAtFlowNode(flow.antecedent)));
      return;
    }
    function narrowTypeByAssertion(type: Type, expr: Expression): Type {
      const node = skipParentheses(expr);
      if (node.kind === Syntax.FalseKeyword) return unreachableNeverType;
      if (node.kind === Syntax.BinaryExpression) {
        if ((<BinaryExpression>node).operatorToken.kind === Syntax.Ampersand2Token)
          return narrowTypeByAssertion(narrowTypeByAssertion(type, (<BinaryExpression>node).left), (<BinaryExpression>node).right);
        if ((<BinaryExpression>node).operatorToken.kind === Syntax.Bar2Token)
          return getUnionType([narrowTypeByAssertion(type, (<BinaryExpression>node).left), narrowTypeByAssertion(type, (<BinaryExpression>node).right)]);
      }
      return narrowType(type, node, true);
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
        if (getReturnTypeOfSignature(signature).flags & qt.TypeFlags.Never) return unreachableNeverType;
      }
      return;
    }
    function getTypeAtFlowArrayMutation(flow: FlowArrayMutation): FlowType | undefined {
      if (declaredType === autoType || declaredType === autoArrayType) {
        const node = flow.node;
        const expr = node.kind === Syntax.CallExpression ? (<PropertyAccessExpression>node.expression).expression : (<ElementAccessExpression>node.left).expression;
        if (isMatchingReference(reference, getReferenceCandidate(expr))) {
          const flowType = getTypeAtFlowNode(flow.antecedent);
          const type = getTypeFromFlowType(flowType);
          if (getObjectFlags(type) & ObjectFlags.EvolvingArray) {
            let evolvedType = <EvolvingArrayType>type;
            if (node.kind === Syntax.CallExpression) {
              for (const arg of node.arguments) {
                evolvedType = addEvolvingArrayElementType(evolvedType, arg);
              }
            } else {
              const indexType = getContextFreeTypeOfExpression((<ElementAccessExpression>node.left).argumentExpression);
              if (isTypeAssignableToKind(indexType, qt.TypeFlags.NumberLike)) evolvedType = addEvolvingArrayElementType(evolvedType, node.right);
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
      if (isMatchingReference(reference, expr)) type = narrowTypeBySwitchOnDiscriminant(type, flow.switchStatement, flow.clauseStart, flow.clauseEnd);
      else if (expr.kind === Syntax.TypeOfExpression && isMatchingReference(reference, (expr as TypeOfExpression).expression)) {
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
        if (isMatchingReferenceDiscriminant(expr, type))
          type = narrowTypeByDiscriminant(type, expr as AccessExpression, (t) => narrowTypeBySwitchOnDiscriminant(t, flow.switchStatement, flow.clauseStart, flow.clauseEnd));
      }
      return createFlowType(type, isIncomplete(flowType));
    }
    function getTypeAtFlowBranchLabel(flow: FlowLabel): FlowType {
      const antecedentTypes: Type[] = [];
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
      const cache = flowLoopCaches[id] || (flowLoopCaches[id] = new qb.QMap<Type>());
      const key = getOrSetCacheKey();
      if (!key) return declaredType;
      const cached = cache.get(key);
      if (cached) return cached;
      for (let i = flowLoopStart; i < flowLoopCount; i++) {
        if (flowLoopNodes[i] === flow && flowLoopKeys[i] === key && flowLoopTypes[i].length) return createFlowType(getUnionOrEvolvingArrayType(flowLoopTypes[i], UnionReduction.Literal), true);
      }
      const antecedentTypes: Type[] = [];
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
    function isMatchingReferenceDiscriminant(expr: Expression, computedType: Type) {
      const type = declaredType.flags & qt.TypeFlags.Union ? declaredType : computedType;
      if (!(type.flags & qt.TypeFlags.Union) || !is.accessExpression(expr)) return false;
      const name = getAccessedPropertyName(expr);
      if (name === undefined) return false;
      return isMatchingReference(reference, expr.expression) && isDiscriminantProperty(type, name);
    }
    function narrowTypeByDiscriminant(type: Type, access: AccessExpression, narrowType: (t: Type) => Type): Type {
      const propName = getAccessedPropertyName(access);
      if (propName === undefined) return type;
      const propType = getTypeOfPropertyOfType(type, propName);
      if (!propType) return type;
      const narrowedPropType = narrowType(propType);
      return filterType(type, (t) => {
        const discriminantType = getTypeOfPropertyOrIndexSignature(t, propName);
        return !(discriminantType.flags & qt.TypeFlags.Never) && isTypeComparableTo(discriminantType, narrowedPropType);
      });
    }
    function narrowTypeByTruthiness(type: Type, expr: Expression, assumeTrue: boolean): Type {
      if (isMatchingReference(reference, expr)) return getTypeWithFacts(type, assumeTrue ? TypeFacts.Truthy : TypeFacts.Falsy);
      if (strictNullChecks && assumeTrue && optionalChainContainsReference(expr, reference)) type = getTypeWithFacts(type, TypeFacts.NEUndefinedOrNull);
      if (isMatchingReferenceDiscriminant(expr, type)) return narrowTypeByDiscriminant(type, <AccessExpression>expr, (t) => getTypeWithFacts(t, assumeTrue ? TypeFacts.Truthy : TypeFacts.Falsy));
      return type;
    }
    function isTypePresencePossible(type: Type, propName: qb.__String, assumeTrue: boolean) {
      if (getIndexInfoOfType(type, IndexKind.String)) return true;
      const prop = getPropertyOfType(type, propName);
      if (prop) return prop.flags & qt.SymbolFlags.Optional ? true : assumeTrue;
      return !assumeTrue;
    }
    function narrowByInKeyword(type: Type, literal: LiteralExpression, assumeTrue: boolean) {
      if (type.flags & (TypeFlags.Union | qt.TypeFlags.Object) || isThisTypeParameter(type)) {
        const propName = qy.get.escUnderscores(literal.text);
        return filterType(type, (t) => isTypePresencePossible(t, propName, assumeTrue));
      }
      return type;
    }
    function narrowTypeByBinaryExpression(type: Type, expr: BinaryExpression, assumeTrue: boolean): Type {
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
          if (left.kind === Syntax.TypeOfExpression && StringLiteral.like(right)) return narrowTypeByTypeof(type, <TypeOfExpression>left, operator, right, assumeTrue);
          if (right.kind === Syntax.TypeOfExpression && StringLiteral.like(left)) return narrowTypeByTypeof(type, <TypeOfExpression>right, operator, left, assumeTrue);
          if (isMatchingReference(reference, left)) return narrowTypeByEquality(type, operator, right, assumeTrue);
          if (isMatchingReference(reference, right)) return narrowTypeByEquality(type, operator, left, assumeTrue);
          if (strictNullChecks) {
            if (optionalChainContainsReference(left, reference)) type = narrowTypeByOptionalChainContainment(type, operator, right, assumeTrue);
            else if (optionalChainContainsReference(right, reference)) {
              type = narrowTypeByOptionalChainContainment(type, operator, left, assumeTrue);
            }
          }
          if (isMatchingReferenceDiscriminant(left, type)) return narrowTypeByDiscriminant(type, <AccessExpression>left, (t) => narrowTypeByEquality(t, operator, right, assumeTrue));
          if (isMatchingReferenceDiscriminant(right, type)) return narrowTypeByDiscriminant(type, <AccessExpression>right, (t) => narrowTypeByEquality(t, operator, left, assumeTrue));
          if (isMatchingConstructorReference(left)) return narrowTypeByConstructor(type, operator, right, assumeTrue);
          if (isMatchingConstructorReference(right)) return narrowTypeByConstructor(type, operator, left, assumeTrue);
          break;
        case Syntax.InstanceOfKeyword:
          return narrowTypeByInstanceof(type, expr, assumeTrue);
        case Syntax.InKeyword:
          const target = getReferenceCandidate(expr.right);
          if (StringLiteral.like(expr.left) && isMatchingReference(reference, target)) return narrowByInKeyword(type, expr.left, assumeTrue);
          break;
        case Syntax.CommaToken:
          return narrowType(type, expr.right, assumeTrue);
      }
      return type;
    }
    function narrowTypeByOptionalChainContainment(type: Type, operator: Syntax, value: Expression, assumeTrue: boolean): Type {
      const equalsOperator = operator === Syntax.Equals2Token || operator === Syntax.Equals3Token;
      const nullableFlags = operator === Syntax.Equals2Token || operator === Syntax.ExclamationEqualsToken ? qt.TypeFlags.Nullable : qt.TypeFlags.Undefined;
      const valueType = getTypeOfExpression(value);
      const removeNullable =
        (equalsOperator !== assumeTrue && everyType(valueType, (t) => !!(t.flags & nullableFlags))) ||
        (equalsOperator === assumeTrue && everyType(valueType, (t) => !(t.flags & (TypeFlags.AnyOrUnknown | nullableFlags))));
      return removeNullable ? getTypeWithFacts(type, TypeFacts.NEUndefinedOrNull) : type;
    }
    function narrowTypeByEquality(type: Type, operator: Syntax, value: Expression, assumeTrue: boolean): Type {
      if (type.flags & qt.TypeFlags.Any) return type;
      if (operator === Syntax.ExclamationEqualsToken || operator === Syntax.ExclamationEquals2Token) assumeTrue = !assumeTrue;
      const valueType = getTypeOfExpression(value);
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
        const filterFn: (t: Type) => boolean =
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
    function narrowTypeByTypeof(type: Type, typeOfExpr: TypeOfExpression, operator: Syntax, literal: LiteralExpression, assumeTrue: boolean): Type {
      if (operator === Syntax.ExclamationEqualsToken || operator === Syntax.ExclamationEquals2Token) assumeTrue = !assumeTrue;
      const target = getReferenceCandidate(typeOfExpr.expression);
      if (!isMatchingReference(reference, target)) {
        if (strictNullChecks && optionalChainContainsReference(target, reference) && assumeTrue === (literal.text !== 'undefined')) return getTypeWithFacts(type, TypeFacts.NEUndefinedOrNull);
        return type;
      }
      if (type.flags & qt.TypeFlags.Any && literal.text === 'function') return type;
      if (assumeTrue && type.flags & qt.TypeFlags.Unknown && literal.text === 'object') {
        if (typeOfExpr.parent.parent.kind === Syntax.BinaryExpression) {
          const expr = <BinaryExpression>typeOfExpr.parent.parent;
          if (expr.operatorToken.kind === Syntax.Ampersand2Token && expr.right === typeOfExpr.parent && containsTruthyCheck(reference, expr.left)) return nonPrimitiveType;
        }
        return getUnionType([nonPrimitiveType, nullType]);
      }
      const facts = assumeTrue ? typeofEQFacts.get(literal.text) || TypeFacts.TypeofEQHostObject : typeofNEFacts.get(literal.text) || TypeFacts.TypeofNEHostObject;
      const impliedType = getImpliedTypeFromTypeofGuard(type, literal.text);
      return getTypeWithFacts(assumeTrue && impliedType ? mapType(type, narrowUnionMemberByTypeof(impliedType)) : type, facts);
    }
    function narrowTypeBySwitchOptionalChainContainment(type: Type, switchStatement: SwitchStatement, clauseStart: number, clauseEnd: number, clauseCheck: (type: Type) => boolean) {
      const everyClauseChecks = clauseStart !== clauseEnd && every(getSwitchClauseTypes(switchStatement).slice(clauseStart, clauseEnd), clauseCheck);
      return everyClauseChecks ? getTypeWithFacts(type, TypeFacts.NEUndefinedOrNull) : type;
    }
    function narrowTypeBySwitchOnDiscriminant(type: Type, switchStatement: SwitchStatement, clauseStart: number, clauseEnd: number) {
      const switchTypes = getSwitchClauseTypes(switchStatement);
      if (!switchTypes.length) return type;
      const clauseTypes = switchTypes.slice(clauseStart, clauseEnd);
      const hasDefaultClause = clauseStart === clauseEnd || contains(clauseTypes, neverType);
      if (type.flags & qt.TypeFlags.Unknown && !hasDefaultClause) {
        let groundClauseTypes: Type[] | undefined;
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
        return getUnionType(groundClauseTypes === undefined ? clauseTypes : groundClauseTypes);
      }
      const discriminantType = getUnionType(clauseTypes);
      const caseType =
        discriminantType.flags & qt.TypeFlags.Never
          ? neverType
          : replacePrimitivesWithLiterals(
              filterType(type, (t) => areTypesComparable(discriminantType, t)),
              discriminantType
            );
      if (!hasDefaultClause) return caseType;
      const defaultType = filterType(type, (t) => !(isUnitType(t) && contains(switchTypes, getRegularTypeOfLiteralType(t))));
      return caseType.flags & qt.TypeFlags.Never ? defaultType : getUnionType([caseType, defaultType]);
    }
    function getImpliedTypeFromTypeofGuard(type: Type, text: string) {
      switch (text) {
        case 'function':
          return type.flags & qt.TypeFlags.Any ? type : globalFunctionType;
        case 'object':
          return type.flags & qt.TypeFlags.Unknown ? getUnionType([nonPrimitiveType, nullType]) : type;
        default:
          return typeofTypesByName.get(text);
      }
    }
    function narrowUnionMemberByTypeof(candidate: Type) {
      return (type: Type) => {
        if (isTypeSubtypeOf(type, candidate)) return type;
        if (isTypeSubtypeOf(candidate, type)) return candidate;
        if (type.flags & qt.TypeFlags.Instantiable) {
          const constraint = getBaseConstraintOfType(type) || anyType;
          if (isTypeSubtypeOf(candidate, constraint)) return getIntersectionType([type, candidate]);
        }
        return type;
      };
    }
    function narrowBySwitchOnTypeOf(type: Type, switchStatement: SwitchStatement, clauseStart: number, clauseEnd: number): Type {
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
      const impliedType = getTypeWithFacts(getUnionType(clauseWitnesses.map((text) => getImpliedTypeFromTypeofGuard(type, text) || type)), switchFacts);
      return getTypeWithFacts(mapType(type, narrowUnionMemberByTypeof(impliedType)), switchFacts);
    }
    function isMatchingConstructorReference(expr: Expression) {
      return (
        ((is.kind(qc.PropertyAccessExpression, expr) && idText(expr.name) === 'constructor') ||
          (is.kind(qc.ElementAccessExpression, expr) && StringLiteral.like(expr.argumentExpression) && expr.argumentExpression.text === 'constructor')) &&
        isMatchingReference(reference, expr.expression)
      );
    }
    function narrowTypeByConstructor(type: Type, operator: Syntax, identifier: Expression, assumeTrue: boolean): Type {
      if (assumeTrue ? operator !== Syntax.Equals2Token && operator !== Syntax.Equals3Token : operator !== Syntax.ExclamationEqualsToken && operator !== Syntax.ExclamationEquals2Token) return type;
      const identifierType = getTypeOfExpression(identifier);
      if (!isFunctionType(identifierType) && !isConstructorType(identifierType)) return type;
      const prototypeProperty = getPropertyOfType(identifierType, 'prototype' as qb.__String);
      if (!prototypeProperty) return type;
      const prototypeType = getTypeOfSymbol(prototypeProperty);
      const candidate = !isTypeAny(prototypeType) ? prototypeType : undefined;
      if (!candidate || candidate === globalObjectType || candidate === globalFunctionType) return type;
      if (isTypeAny(type)) return candidate;
      return filterType(type, (t) => isConstructedBy(t, candidate));
      function isConstructedBy(source: Type, target: Type) {
        if ((source.flags & qt.TypeFlags.Object && getObjectFlags(source) & ObjectFlags.Class) || (target.flags & qt.TypeFlags.Object && getObjectFlags(target) & ObjectFlags.Class))
          return source.symbol === target.symbol;
        return isTypeSubtypeOf(source, target);
      }
    }
    function narrowTypeByInstanceof(type: Type, expr: BinaryExpression, assumeTrue: boolean): Type {
      const left = getReferenceCandidate(expr.left);
      if (!isMatchingReference(reference, left)) {
        if (assumeTrue && strictNullChecks && optionalChainContainsReference(left, reference)) return getTypeWithFacts(type, TypeFacts.NEUndefinedOrNull);
        return type;
      }
      const rightType = getTypeOfExpression(expr.right);
      if (!isTypeDerivedFrom(rightType, globalFunctionType)) return type;
      let targetType: Type | undefined;
      const prototypeProperty = getPropertyOfType(rightType, 'prototype' as qb.__String);
      if (prototypeProperty) {
        const prototypePropertyType = getTypeOfSymbol(prototypeProperty);
        if (!isTypeAny(prototypePropertyType)) targetType = prototypePropertyType;
      }
      if (isTypeAny(type) && (targetType === globalObjectType || targetType === globalFunctionType)) return type;
      if (!targetType) {
        const constructSignatures = getSignaturesOfType(rightType, SignatureKind.Construct);
        targetType = constructSignatures.length ? getUnionType(map(constructSignatures, (signature) => getReturnTypeOfSignature(getErasedSignature(signature)))) : emptyObjectType;
      }
      return getNarrowedType(type, targetType, assumeTrue, isTypeDerivedFrom);
    }
    function getNarrowedType(type: Type, candidate: Type, assumeTrue: boolean, isRelated: (source: Type, target: Type) => boolean) {
      if (!assumeTrue) return filterType(type, (t) => !isRelated(t, candidate));
      if (type.flags & qt.TypeFlags.Union) {
        const assignableType = filterType(type, (t) => isRelated(t, candidate));
        if (!(assignableType.flags & qt.TypeFlags.Never)) return assignableType;
      }
      return isTypeSubtypeOf(candidate, type) ? candidate : isTypeAssignableTo(type, candidate) ? type : isTypeAssignableTo(candidate, type) ? candidate : getIntersectionType([type, candidate]);
    }
    function narrowTypeByCallExpression(type: Type, callExpression: CallExpression, assumeTrue: boolean): Type {
      if (hasMatchingArgument(callExpression, reference)) {
        const signature = assumeTrue || !is.callChain(callExpression) ? getEffectsSignature(callExpression) : undefined;
        const predicate = signature && getTypePredicateOfSignature(signature);
        if (predicate && (predicate.kind === TypePredicateKind.This || predicate.kind === TypePredicateKind.Identifier)) return narrowTypeByTypePredicate(type, predicate, callExpression, assumeTrue);
      }
      return type;
    }
    function narrowTypeByTypePredicate(type: Type, predicate: TypePredicate, callExpression: CallExpression, assumeTrue: boolean): Type {
      if (predicate.type && !(isTypeAny(type) && (predicate.type === globalObjectType || predicate.type === globalFunctionType))) {
        const predicateArgument = getTypePredicateArgument(predicate, callExpression);
        if (predicateArgument) {
          if (isMatchingReference(reference, predicateArgument)) return getNarrowedType(type, predicate.type, assumeTrue, isTypeSubtypeOf);
          if (strictNullChecks && assumeTrue && optionalChainContainsReference(predicateArgument, reference) && !(getTypeFacts(predicate.type) & TypeFacts.EQUndefined))
            type = getTypeWithFacts(type, TypeFacts.NEUndefinedOrNull);
          if (isMatchingReferenceDiscriminant(predicateArgument, type))
            return narrowTypeByDiscriminant(type, predicateArgument as AccessExpression, (t) => getNarrowedType(t, predicate.type!, assumeTrue, isTypeSubtypeOf));
        }
      }
      return type;
    }
    function narrowType(type: Type, expr: Expression, assumeTrue: boolean): Type {
      if (is.expressionOfOptionalChainRoot(expr) || (is.kind(qc.BinaryExpression, expr.parent) && expr.parent.operatorToken.kind === Syntax.Question2Token && expr.parent.left === expr))
        return narrowTypeByOptionality(type, expr, assumeTrue);
      switch (expr.kind) {
        case Syntax.Identifier:
        case Syntax.ThisKeyword:
        case Syntax.SuperKeyword:
        case Syntax.PropertyAccessExpression:
        case Syntax.ElementAccessExpression:
          return narrowTypeByTruthiness(type, expr, assumeTrue);
        case Syntax.CallExpression:
          return narrowTypeByCallExpression(type, <CallExpression>expr, assumeTrue);
        case Syntax.ParenthesizedExpression:
          return narrowType(type, (<ParenthesizedExpression>expr).expression, assumeTrue);
        case Syntax.BinaryExpression:
          return narrowTypeByBinaryExpression(type, <BinaryExpression>expr, assumeTrue);
        case Syntax.PrefixUnaryExpression:
          if ((<PrefixUnaryExpression>expr).operator === Syntax.ExclamationToken) return narrowType(type, (<PrefixUnaryExpression>expr).operand, !assumeTrue);
          break;
      }
      return type;
    }
    function narrowTypeByOptionality(type: Type, expr: Expression, assumePresent: boolean): Type {
      if (isMatchingReference(reference, expr)) return getTypeWithFacts(type, assumePresent ? TypeFacts.NEUndefinedOrNull : TypeFacts.EQUndefinedOrNull);
      if (isMatchingReferenceDiscriminant(expr, type))
        return narrowTypeByDiscriminant(type, <AccessExpression>expr, (t) => getTypeWithFacts(t, assumePresent ? TypeFacts.NEUndefinedOrNull : TypeFacts.EQUndefinedOrNull));
      return type;
    }
  }
  function getTypeOfSymbolAtLocation(symbol: Symbol, location: Node) {
    symbol = symbol.exportSymbol || symbol;
    if (location.kind === Syntax.Identifier) {
      if (is.rightSideOfQualifiedNameOrPropertyAccess(location)) location = location.parent;
      if (is.expressionNode(location) && !is.assignmentTarget(location)) {
        const type = getTypeOfExpression(<Expression>location);
        if (getExportSymbolOfValueSymbolIfExported(getNodeLinks(location).resolvedSymbol) === symbol) return type;
      }
    }
    return this.getTypeOfSymbol();
  }
  function getControlFlowContainer(node: Node): Node {
    return qc.findAncestor(
      node.parent,
      (node) =>
        (is.functionLike(node) && !get.immediatelyInvokedFunctionExpression(node)) ||
        node.kind === Syntax.ModuleBlock ||
        node.kind === Syntax.SourceFile ||
        node.kind === Syntax.PropertyDeclaration
    )!;
  }
  function getConstraintForLocation(type: Type, node: Node): Type;
  function getConstraintForLocation(type: Type | undefined, node: Node): Type | undefined;
  function getConstraintForLocation(type: Type, node: Node): Type | undefined {
    if (type && isConstraintPosition(node) && forEachType(type, typeHasNullableConstraint)) return mapType(getWidenedType(type), getBaseConstraintOrType);
    return type;
  }
  function getPartOfForStatementContainingNode(node: Node, container: ForStatement) {
    return qc.findAncestor(node, (n) => (n === container ? 'quit' : n === container.initer || n === container.condition || n === container.incrementor || n === container.statement));
  }
  function getExplicitThisType(node: Expression) {
    const container = get.thisContainer(node, false);
    if (is.functionLike(container)) {
      const signature = getSignatureFromDeclaration(container);
      if (signature.thisParameter) return getExplicitTypeOfSymbol(signature.thisParameter);
    }
    if (is.classLike(container.parent)) {
      const symbol = getSymbolOfNode(container.parent);
      return has.syntacticModifier(container, ModifierFlags.Static) ? this.getTypeOfSymbol() : (getDeclaredTypeOfSymbol(symbol) as InterfaceType).thisType!;
    }
  }
  function getClassNameFromPrototypeMethod(container: Node) {
    if (
      container.kind === Syntax.FunctionExpression &&
      is.kind(qc.BinaryExpression, container.parent) &&
      getAssignmentDeclarationKind(container.parent) === AssignmentDeclarationKind.PrototypeProperty
    ) {
      return ((container.parent.left as PropertyAccessExpression).expression as PropertyAccessExpression).expression;
    } else if (
      container.kind === Syntax.MethodDeclaration &&
      container.parent.kind === Syntax.ObjectLiteralExpression &&
      is.kind(qc.BinaryExpression, container.parent.parent) &&
      getAssignmentDeclarationKind(container.parent.parent) === AssignmentDeclarationKind.Prototype
    ) {
      return (container.parent.parent.left as PropertyAccessExpression).expression;
    } else if (
      container.kind === Syntax.FunctionExpression &&
      container.parent.kind === Syntax.PropertyAssignment &&
      container.parent.parent.kind === Syntax.ObjectLiteralExpression &&
      is.kind(qc.BinaryExpression, container.parent.parent.parent) &&
      getAssignmentDeclarationKind(container.parent.parent.parent) === AssignmentDeclarationKind.Prototype
    ) {
      return (container.parent.parent.parent.left as PropertyAccessExpression).expression;
    } else if (
      container.kind === Syntax.FunctionExpression &&
      is.kind(qc.PropertyAssignment, container.parent) &&
      is.kind(qc.Identifier, container.parent.name) &&
      (container.parent.name.escapedText === 'value' || container.parent.name.escapedText === 'get' || container.parent.name.escapedText === 'set') &&
      is.kind(qc.ObjectLiteralExpression, container.parent.parent) &&
      is.kind(qc.CallExpression, container.parent.parent.parent) &&
      container.parent.parent.parent.arguments[2] === container.parent.parent &&
      getAssignmentDeclarationKind(container.parent.parent.parent) === AssignmentDeclarationKind.ObjectDefinePrototypeProperty
    ) {
      return (container.parent.parent.parent.arguments[0] as PropertyAccessExpression).expression;
    } else if (
      is.kind(qc.MethodDeclaration, container) &&
      is.kind(qc.Identifier, container.name) &&
      (container.name.escapedText === 'value' || container.name.escapedText === 'get' || container.name.escapedText === 'set') &&
      is.kind(qc.ObjectLiteralExpression, container.parent) &&
      is.kind(qc.CallExpression, container.parent.parent) &&
      container.parent.parent.arguments[2] === container.parent &&
      getAssignmentDeclarationKind(container.parent.parent) === AssignmentDeclarationKind.ObjectDefinePrototypeProperty
    ) {
      return (container.parent.parent.arguments[0] as PropertyAccessExpression).expression;
    }
  }
  function getTypeForThisExpressionFromDoc(node: Node) {
    const jsdocType = qc.getDoc.type(node);
    if (jsdocType && jsdocType.kind === Syntax.DocFunctionType) {
      const docFunctionType = <DocFunctionType>jsdocType;
      if (docFunctionType.parameters.length > 0 && docFunctionType.parameters[0].name && (docFunctionType.parameters[0].name as Identifier).escapedText === InternalSymbol.This)
        return getTypeFromTypeNode(docFunctionType.parameters[0].type!);
    }
    const thisTag = qc.getDoc.thisTag(node);
    if (thisTag && thisTag.typeExpression) return getTypeFromTypeNode(thisTag.typeExpression);
  }
  function getContainingObjectLiteral(func: SignatureDeclaration): ObjectLiteralExpression | undefined {
    return (func.kind === Syntax.MethodDeclaration || func.kind === Syntax.GetAccessor || func.kind === Syntax.SetAccessor) && func.parent.kind === Syntax.ObjectLiteralExpression
      ? func.parent
      : func.kind === Syntax.FunctionExpression && func.parent.kind === Syntax.PropertyAssignment
      ? <ObjectLiteralExpression>func.parent.parent
      : undefined;
  }
  function getThisTypeArgument(type: Type): Type | undefined {
    return getObjectFlags(type) & ObjectFlags.Reference && (<TypeReference>type).target === globalThisType ? getTypeArguments(<TypeReference>type)[0] : undefined;
  }
  function getThisTypeFromContextualType(type: Type): Type | undefined {
    return mapType(type, (t) => {
      return t.flags & qt.TypeFlags.Intersection ? forEach((<IntersectionType>t).types, getThisTypeArgument) : getThisTypeArgument(t);
    });
  }
  function getContextualThisParameterType(func: SignatureDeclaration): Type | undefined {
    if (func.kind === Syntax.ArrowFunction) return;
    if (isContextSensitiveFunctionOrObjectLiteralMethod(func)) {
      const contextualSignature = getContextualSignature(func);
      if (contextualSignature) {
        const thisParameter = contextualSignature.thisParameter;
        if (thisParameter) return getTypeOfSymbol(thisParameter);
      }
    }
    const inJs = is.inJSFile(func);
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
        return getWidenedType(contextualType ? getNonNullableType(contextualType) : check.expressionCached(containingLiteral));
      }
      const parent = walkUpParenthesizedExpressions(func.parent);
      if (parent.kind === Syntax.BinaryExpression && (<BinaryExpression>parent).operatorToken.kind === Syntax.EqualsToken) {
        const target = (<BinaryExpression>parent).left;
        if (is.accessExpression(target)) {
          const { expression } = target;
          if (inJs && is.kind(qc.Identifier, expression)) {
            const sourceFile = get.sourceFileOf(parent);
            if (sourceFile.commonJsModuleIndicator && getResolvedSymbol(expression) === sourceFile.symbol) return;
          }
          return getWidenedType(check.expressionCached(expression));
        }
      }
    }
    return;
  }
  function getContextuallyTypedParameterType(parameter: ParameterDeclaration): Type | undefined {
    const func = parameter.parent;
    if (!isContextSensitiveFunctionOrObjectLiteralMethod(func)) return;
    const iife = get.immediatelyInvokedFunctionExpression(func);
    if (iife && iife.arguments) {
      const args = getEffectiveCallArguments(iife);
      const indexOfParameter = func.parameters.indexOf(parameter);
      if (parameter.dot3Token) return getSpreadArgumentType(args, indexOfParameter, args.length, anyType, undefined);
      const links = getNodeLinks(iife);
      const cached = links.resolvedSignature;
      links.resolvedSignature = anySignature;
      const type = indexOfParameter < args.length ? getWidenedLiteralType(check.expression(args[indexOfParameter])) : parameter.initer ? undefined : undefinedWideningType;
      links.resolvedSignature = cached;
      return type;
    }
    const contextualSignature = getContextualSignature(func);
    if (contextualSignature) {
      const index = func.parameters.indexOf(parameter) - (getThisNodeKind(ParameterDeclaration, func) ? 1 : 0);
      return parameter.dot3Token && lastOrUndefined(func.parameters) === parameter ? getRestTypeAtPosition(contextualSignature, index) : tryGetTypeAtPosition(contextualSignature, index);
    }
  }
  function getContextualTypeForVariableLikeDeclaration(declaration: VariableLikeDeclaration): Type | undefined {
    const typeNode = get.effectiveTypeAnnotationNode(declaration);
    if (typeNode) return getTypeFromTypeNode(typeNode);
    switch (declaration.kind) {
      case Syntax.Parameter:
        return getContextuallyTypedParameterType(declaration);
      case Syntax.BindingElement:
        return getContextualTypeForBindingElement(declaration);
    }
  }
  function getContextualTypeForBindingElement(declaration: BindingElement): Type | undefined {
    const parent = declaration.parent.parent;
    const name = declaration.propertyName || declaration.name;
    const parentType = getContextualTypeForVariableLikeDeclaration(parent) || (parent.kind !== Syntax.BindingElement && parent.initer && check.declarationIniter(parent));
    if (parentType && !is.kind(qc.BindingPattern, name) && !isComputedNonLiteralName(name)) {
      const nameType = getLiteralTypeFromPropertyName(name);
      if (isTypeUsableAsPropertyName(nameType)) {
        const text = getPropertyNameFromType(nameType);
        return getTypeOfPropertyOfType(parentType, text);
      }
    }
  }
  function getContextualTypeForIniterExpression(node: Expression): Type | undefined {
    const declaration = <VariableLikeDeclaration>node.parent;
    if (is.withIniter(declaration) && node === declaration.initer) {
      const result = getContextualTypeForVariableLikeDeclaration(declaration);
      if (result) return result;
      if (is.kind(qc.BindingPattern, declaration.name)) return getTypeFromBindingPattern(declaration.name, true, false);
    }
    return;
  }
  function getContextualTypeForReturnExpression(node: Expression): Type | undefined {
    const func = get.containingFunction(node);
    if (func) {
      const functionFlags = getFunctionFlags(func);
      if (functionFlags & FunctionFlags.Generator) return;
      const contextualReturnType = getContextualReturnType(func);
      if (contextualReturnType) {
        if (functionFlags & FunctionFlags.Async) {
          const contextualAwaitedType = mapType(contextualReturnType, getAwaitedTypeOfPromise);
          return contextualAwaitedType && getUnionType([contextualAwaitedType, createPromiseLikeType(contextualAwaitedType)]);
        }
        return contextualReturnType;
      }
    }
    return;
  }
  function getContextualTypeForAwaitOperand(node: AwaitExpression): Type | undefined {
    const contextualType = getContextualType(node);
    if (contextualType) {
      const contextualAwaitedType = getAwaitedType(contextualType);
      return contextualAwaitedType && getUnionType([contextualAwaitedType, createPromiseLikeType(contextualAwaitedType)]);
    }
    return;
  }
  function getContextualTypeForYieldOperand(node: YieldExpression): Type | undefined {
    const func = get.containingFunction(node);
    if (func) {
      const functionFlags = getFunctionFlags(func);
      const contextualReturnType = getContextualReturnType(func);
      if (contextualReturnType)
        return node.asteriskToken ? contextualReturnType : getIterationTypeOfGeneratorFunctionReturnType(IterationTypeKind.Yield, contextualReturnType, (functionFlags & FunctionFlags.Async) !== 0);
    }
    return;
  }
  function getContextualIterationType(kind: IterationTypeKind, functionDecl: SignatureDeclaration): Type | undefined {
    const isAsync = !!(getFunctionFlags(functionDecl) & FunctionFlags.Async);
    const contextualReturnType = getContextualReturnType(functionDecl);
    if (contextualReturnType) return getIterationTypeOfGeneratorFunctionReturnType(kind, contextualReturnType, isAsync) || undefined;
    return;
  }
  function getContextualReturnType(functionDecl: SignatureDeclaration): Type | undefined {
    const returnType = getReturnTypeFromAnnotation(functionDecl);
    if (returnType) return returnType;
    const signature = getContextualSignatureForFunctionLikeDeclaration(<FunctionExpression>functionDecl);
    if (signature && !isResolvingReturnTypeOfSignature(signature)) return getReturnTypeOfSignature(signature);
    return;
  }
  function getContextualTypeForArgument(callTarget: CallLikeExpression, arg: Expression): Type | undefined {
    const args = getEffectiveCallArguments(callTarget);
    const argIndex = args.indexOf(arg);
    return argIndex === -1 ? undefined : getContextualTypeForArgumentAtIndex(callTarget, argIndex);
  }
  function getContextualTypeForArgumentAtIndex(callTarget: CallLikeExpression, argIndex: number): Type {
    const signature = getNodeLinks(callTarget).resolvedSignature === resolvingSignature ? resolvingSignature : getResolvedSignature(callTarget);
    if (qc.isJsx.openingLikeElement(callTarget) && argIndex === 0) return getEffectiveFirstArgumentForJsxSignature(signature, callTarget);
    return getTypeAtPosition(signature, argIndex);
  }
  function getContextualTypeForSubstitutionExpression(template: TemplateExpression, substitutionExpression: Expression) {
    if (template.parent.kind === Syntax.TaggedTemplateExpression) return getContextualTypeForArgument(<TaggedTemplateExpression>template.parent, substitutionExpression);
    return;
  }
  function getContextualTypeForBinaryOperand(node: Expression, contextFlags?: ContextFlags): Type | undefined {
    const binaryExpression = <BinaryExpression>node.parent;
    const { left, operatorToken, right } = binaryExpression;
    switch (operatorToken.kind) {
      case Syntax.EqualsToken:
        if (node !== right) return;
        const contextSensitive = getIsContextSensitiveAssignmentOrContextType(binaryExpression);
        if (!contextSensitive) return;
        return contextSensitive === true ? getTypeOfExpression(left) : contextSensitive;
      case Syntax.Bar2Token:
      case Syntax.Question2Token:
        const type = getContextualType(binaryExpression, contextFlags);
        return node === right && ((type && type.pattern) || (!type && !isDefaultedExpandoIniter(binaryExpression))) ? getTypeOfExpression(left) : type;
      case Syntax.Ampersand2Token:
      case Syntax.CommaToken:
        return node === right ? getContextualType(binaryExpression, contextFlags) : undefined;
      default:
        return;
    }
  }
  function getIsContextSensitiveAssignmentOrContextType(binaryExpression: BinaryExpression): boolean | Type {
    const kind = getAssignmentDeclarationKind(binaryExpression);
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
          const overallAnnotation = get.effectiveTypeAnnotationNode(decl);
          if (overallAnnotation) return getTypeFromTypeNode(overallAnnotation);
          else if (is.kind(qc.Identifier, lhs.expression)) {
            const id = lhs.expression;
            const parentSymbol = resolveName(id, id.escapedText, qt.SymbolFlags.Value, undefined, id.escapedText, true);
            if (parentSymbol) {
              const annotated = get.effectiveTypeAnnotationNode(parentSymbol.valueDeclaration);
              if (annotated) {
                const nameStr = getElementOrPropertyAccessName(lhs);
                if (nameStr !== undefined) {
                  const type = getTypeOfPropertyOfContextualType(getTypeFromTypeNode(annotated), nameStr);
                  return type || false;
                }
              }
              return false;
            }
          }
          return !is.inJSFile(decl);
        }
      case AssignmentDeclarationKind.ModuleExports:
      case AssignmentDeclarationKind.ThisProperty:
        if (!binaryExpression.symbol) return true;
        if (binaryExpression.symbol.valueDeclaration) {
          const annotated = get.effectiveTypeAnnotationNode(binaryExpression.symbol.valueDeclaration);
          if (annotated) {
            const type = getTypeFromTypeNode(annotated);
            if (type) return type;
          }
        }
        if (kind === AssignmentDeclarationKind.ModuleExports) return false;
        const thisAccess = cast(binaryExpression.left, isAccessExpression);
        if (!is.objectLiteralMethod(get.thisContainer(thisAccess.expression, false))) return false;
        const thisType = check.thisNodeExpression(thisAccess.expression);
        const nameStr = getElementOrPropertyAccessName(thisAccess);
        return (nameStr !== undefined && thisType && getTypeOfPropertyOfContextualType(thisType, nameStr)) || false;
      case AssignmentDeclarationKind.ObjectDefinePropertyValue:
      case AssignmentDeclarationKind.ObjectDefinePropertyExports:
      case AssignmentDeclarationKind.ObjectDefinePrototypeProperty:
        return qb.fail('Does not apply');
      default:
        return Debug.assertNever(kind);
    }
  }
  function getTypeOfPropertyOfContextualType(type: Type, name: qb.__String) {
    return mapType(
      type,
      (t) => {
        if (isGenericMappedType(t)) {
          const constraint = getConstraintTypeFromMappedType(t);
          const constraintOfConstraint = getBaseConstraintOfType(constraint) || constraint;
          const propertyNameType = getLiteralType(qy.get.unescUnderscores(name));
          if (isTypeAssignableTo(propertyNameType, constraintOfConstraint)) return substituteIndexedMappedType(t, propertyNameType);
        } else if (t.flags & qt.TypeFlags.StructuredType) {
          const prop = getPropertyOfType(t, name);
          if (prop) return isCircularMappedProperty(prop) ? undefined : getTypeOfSymbol(prop);
          if (isTupleType(t)) {
            const restType = getRestTypeOfTupleType(t);
            if (restType && NumericLiteral.name(name) && +name >= 0) return restType;
          }
          return (NumericLiteral.name(name) && getIndexTypeOfContextualType(t, IndexKind.Number)) || getIndexTypeOfContextualType(t, IndexKind.String);
        }
        return;
      },
      true
    );
  }
  function getIndexTypeOfContextualType(type: Type, kind: IndexKind) {
    return mapType(type, (t) => getIndexTypeOfStructuredType(t, kind), true);
  }
  function getContextualTypeForObjectLiteralMethod(node: MethodDeclaration, contextFlags?: ContextFlags): Type | undefined {
    assert(is.objectLiteralMethod(node));
    if (node.flags & NodeFlags.InWithStatement) return;
    return getContextualTypeForObjectLiteralElement(node, contextFlags);
  }
  function getContextualTypeForObjectLiteralElement(element: ObjectLiteralElementLike, contextFlags?: ContextFlags) {
    const objectLiteral = <ObjectLiteralExpression>element.parent;
    const type = getApparentTypeOfContextualType(objectLiteral, contextFlags);
    if (type) {
      if (!hasNonBindableDynamicName(element)) {
        const symbolName = getSymbolOfNode(element).escName;
        const propertyType = getTypeOfPropertyOfContextualType(type, symbolName);
        if (propertyType) return propertyType;
      }
      return (isNumericName(element.name!) && getIndexTypeOfContextualType(type, IndexKind.Number)) || getIndexTypeOfContextualType(type, IndexKind.String);
    }
    return;
  }
  function getContextualTypeForElementExpression(arrayContextualType: Type | undefined, index: number): Type | undefined {
    return (
      arrayContextualType &&
      (getTypeOfPropertyOfContextualType(arrayContextualType, ('' + index) as qb.__String) || getIteratedTypeOrElementType(IterationUse.Element, arrayContextualType, undefinedType, undefined, false))
    );
  }
  function getContextualTypeForConditionalOperand(node: Expression, contextFlags?: ContextFlags): Type | undefined {
    const conditional = <ConditionalExpression>node.parent;
    return node === conditional.whenTrue || node === conditional.whenFalse ? getContextualType(conditional, contextFlags) : undefined;
  }
  function getContextualTypeForChildJsxExpression(node: JsxElement, child: JsxChild) {
    const attributesType = getApparentTypeOfContextualType(node.openingElement.tagName);
    const jsxChildrenPropertyName = getJsxElementChildrenPropertyName(getJsxNamespaceAt(node));
    if (!(attributesType && !isTypeAny(attributesType) && jsxChildrenPropertyName && jsxChildrenPropertyName !== '')) return;
    const realChildren = getSemanticJsxChildren(node.children);
    const childIndex = realChildren.indexOf(child);
    const childFieldType = getTypeOfPropertyOfContextualType(attributesType, jsxChildrenPropertyName);
    return (
      childFieldType &&
      (realChildren.length === 1
        ? childFieldType
        : mapType(
            childFieldType,
            (t) => {
              if (isArrayLikeType(t)) return getIndexedAccessType(t, getLiteralType(childIndex));
              return t;
            },
            true
          ))
    );
  }
  function getContextualTypeForJsxExpression(node: JsxExpression): Type | undefined {
    const exprParent = node.parent;
    return qc.isJsx.attributeLike(exprParent) ? getContextualType(node) : is.kind(qc.JsxElement, exprParent) ? getContextualTypeForChildJsxExpression(exprParent, node) : undefined;
  }
  function getContextualTypeForJsxAttribute(attribute: JsxAttribute | JsxSpreadAttribute): Type | undefined {
    if (is.kind(qc.JsxAttribute, attribute)) {
      const attributesType = getApparentTypeOfContextualType(attribute.parent);
      if (!attributesType || isTypeAny(attributesType)) return;
      return getTypeOfPropertyOfContextualType(attributesType, attribute.name.escapedText);
    }
    return getContextualType(attribute.parent);
  }
  function getApparentTypeOfContextualType(node: Expression | MethodDeclaration, contextFlags?: ContextFlags): Type | undefined {
    const contextualType = is.objectLiteralMethod(node) ? getContextualTypeForObjectLiteralMethod(node, contextFlags) : getContextualType(node, contextFlags);
    const instantiatedType = instantiateContextualType(contextualType, node, contextFlags);
    if (instantiatedType && !(contextFlags && contextFlags & ContextFlags.NoConstraints && instantiatedType.flags & qt.TypeFlags.TypeVariable)) {
      const apparentType = mapType(instantiatedType, getApparentType, true);
      if (apparentType.flags & qt.TypeFlags.Union) {
        if (is.kind(qc.ObjectLiteralExpression, node)) return discriminateContextualTypeByObjectMembers(node, apparentType as UnionType);
        else if (is.kind(qc.JsxAttributes, node)) return discriminateContextualTypeByJSXAttributes(node, apparentType as UnionType);
      }
      return apparentType;
    }
  }
  function getContextualType(node: Expression, contextFlags?: ContextFlags): Type | undefined {
    if (node.flags & NodeFlags.InWithStatement) return;
    if (node.contextualType) return node.contextualType;
    const { parent } = node;
    switch (parent.kind) {
      case Syntax.VariableDeclaration:
      case Syntax.Parameter:
      case Syntax.PropertyDeclaration:
      case Syntax.PropertySignature:
      case Syntax.BindingElement:
        return getContextualTypeForIniterExpression(node);
      case Syntax.ArrowFunction:
      case Syntax.ReturnStatement:
        return getContextualTypeForReturnExpression(node);
      case Syntax.YieldExpression:
        return getContextualTypeForYieldOperand(<YieldExpression>parent);
      case Syntax.AwaitExpression:
        return getContextualTypeForAwaitOperand(<AwaitExpression>parent);
      case Syntax.CallExpression:
        if ((<CallExpression>parent).expression.kind === Syntax.ImportKeyword) return stringType;
      case Syntax.NewExpression:
        return getContextualTypeForArgument(<CallExpression | NewExpression>parent, node);
      case Syntax.TypeAssertionExpression:
      case Syntax.AsExpression:
        return is.constTypeReference((<AssertionExpression>parent).type) ? undefined : getTypeFromTypeNode((<AssertionExpression>parent).type);
      case Syntax.BinaryExpression:
        return getContextualTypeForBinaryOperand(node, contextFlags);
      case Syntax.PropertyAssignment:
      case Syntax.ShorthandPropertyAssignment:
        return getContextualTypeForObjectLiteralElement(<PropertyAssignment | ShorthandPropertyAssignment>parent, contextFlags);
      case Syntax.SpreadAssignment:
        return getApparentTypeOfContextualType(parent.parent as ObjectLiteralExpression, contextFlags);
      case Syntax.ArrayLiteralExpression: {
        const arrayLiteral = <ArrayLiteralExpression>parent;
        const type = getApparentTypeOfContextualType(arrayLiteral, contextFlags);
        return getContextualTypeForElementExpression(type, indexOfNode(arrayLiteral.elements, node));
      }
      case Syntax.ConditionalExpression:
        return getContextualTypeForConditionalOperand(node, contextFlags);
      case Syntax.TemplateSpan:
        assert(parent.parent.kind === Syntax.TemplateExpression);
        return getContextualTypeForSubstitutionExpression(<TemplateExpression>parent.parent, node);
      case Syntax.ParenthesizedExpression: {
        const tag = is.inJSFile(parent) ? qc.getDoc.typeTag(parent) : undefined;
        return tag ? getTypeFromTypeNode(tag.typeExpression.type) : getContextualType(<ParenthesizedExpression>parent, contextFlags);
      }
      case Syntax.JsxExpression:
        return getContextualTypeForJsxExpression(<JsxExpression>parent);
      case Syntax.JsxAttribute:
      case Syntax.JsxSpreadAttribute:
        return getContextualTypeForJsxAttribute(<JsxAttribute | JsxSpreadAttribute>parent);
      case Syntax.JsxOpeningElement:
      case Syntax.JsxSelfClosingElement:
        return getContextualJsxElementAttributesType(<JsxOpeningLikeElement>parent, contextFlags);
    }
    return;
  }
  function getInferenceContext(node: Node) {
    const ancestor = qc.findAncestor(node, (n) => !!n.inferenceContext);
    return ancestor && ancestor.inferenceContext!;
  }
  function getContextualJsxElementAttributesType(node: JsxOpeningLikeElement, contextFlags?: ContextFlags) {
    if (is.kind(qc.JsxOpeningElement, node) && node.parent.contextualType && contextFlags !== ContextFlags.Completions) return node.parent.contextualType;
    return getContextualTypeForArgumentAtIndex(node, 0);
  }
  function getEffectiveFirstArgumentForJsxSignature(signature: Signature, node: JsxOpeningLikeElement) {
    return getJsxReferenceKind(node) !== JsxReferenceKind.Component ? getJsxPropsTypeFromCallSignature(signature, node) : getJsxPropsTypeFromClassType(signature, node);
  }
  function getJsxPropsTypeFromCallSignature(sig: Signature, context: JsxOpeningLikeElement) {
    let propsType = getTypeOfFirstParameterOfSignatureWithFallback(sig, unknownType);
    propsType = getJsxManagedAttributesFromLocatedAttributes(context, getJsxNamespaceAt(context), propsType);
    const intrinsicAttribs = getJsxType(JsxNames.IntrinsicAttributes, context);
    if (intrinsicAttribs !== errorType) propsType = intersectTypes(intrinsicAttribs, propsType);
    return propsType;
  }
  function getJsxPropsTypeForSignatureFromMember(sig: Signature, forcedLookupLocation: qb.__String) {
    if (sig.unionSignatures) {
      const results: Type[] = [];
      for (const signature of sig.unionSignatures) {
        const instance = getReturnTypeOfSignature(signature);
        if (isTypeAny(instance)) return instance;
        const propType = getTypeOfPropertyOfType(instance, forcedLookupLocation);
        if (!propType) return;
        results.push(propType);
      }
      return getIntersectionType(results);
    }
    const instanceType = getReturnTypeOfSignature(sig);
    return isTypeAny(instanceType) ? instanceType : getTypeOfPropertyOfType(instanceType, forcedLookupLocation);
  }
  function getStaticTypeOfReferencedJsxConstructor(context: JsxOpeningLikeElement) {
    if (isJsxIntrinsicIdentifier(context.tagName)) {
      const result = getIntrinsicAttributesTypeFromJsxOpeningLikeElement(context);
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
  function getJsxManagedAttributesFromLocatedAttributes(context: JsxOpeningLikeElement, ns: Symbol, attributesType: Type) {
    const managedSym = getJsxLibraryManagedAttributes(ns);
    if (managedSym) {
      const declaredManagedType = getDeclaredTypeOfSymbol(managedSym);
      const ctorType = getStaticTypeOfReferencedJsxConstructor(context);
      if (length((declaredManagedType as GenericType).typeParameters) >= 2) {
        const args = fillMissingTypeArguments([ctorType, attributesType], (declaredManagedType as GenericType).typeParameters, 2, is.inJSFile(context));
        return createTypeReference(declaredManagedType as GenericType, args);
      } else if (length(declaredManagedType.aliasTypeArguments) >= 2) {
        const args = fillMissingTypeArguments([ctorType, attributesType], declaredManagedType.aliasTypeArguments, 2, is.inJSFile(context));
        return getTypeAliasInstantiation(declaredManagedType.aliasSymbol!, args);
      }
    }
    return attributesType;
  }
  function getJsxPropsTypeFromClassType(sig: Signature, context: JsxOpeningLikeElement) {
    const ns = getJsxNamespaceAt(context);
    const forcedLookupLocation = getJsxElementPropertiesName(ns);
    let attributesType =
      forcedLookupLocation === undefined
        ? getTypeOfFirstParameterOfSignatureWithFallback(sig, unknownType)
        : forcedLookupLocation === ''
        ? getReturnTypeOfSignature(sig)
        : getJsxPropsTypeForSignatureFromMember(sig, forcedLookupLocation);
    if (!attributesType) {
      if (!!forcedLookupLocation && !!length(context.attributes.properties))
        error(context, qd.msgs.JSX_element_class_does_not_support_attributes_because_it_does_not_have_a_0_property, qy.get.unescUnderscores(forcedLookupLocation));
      return unknownType;
    }
    attributesType = getJsxManagedAttributesFromLocatedAttributes(context, ns, attributesType);
    if (isTypeAny(attributesType)) return attributesType;
    else {
      let apparentAttributesType = attributesType;
      const intrinsicClassAttribs = getJsxType(JsxNames.IntrinsicClassAttributes, context);
      if (intrinsicClassAttribs !== errorType) {
        const typeParams = getLocalTypeParametersOfClassOrInterfaceOrTypeAlias(intrinsicClassAttribs.symbol);
        const hostClassType = getReturnTypeOfSignature(sig);
        apparentAttributesType = intersectTypes(
          typeParams
            ? createTypeReference(<GenericType>intrinsicClassAttribs, fillMissingTypeArguments([hostClassType], typeParams, getMinTypeArgumentCount(typeParams), is.inJSFile(context)))
            : intrinsicClassAttribs,
          apparentAttributesType
        );
      }
      const intrinsicAttribs = getJsxType(JsxNames.IntrinsicAttributes, context);
      if (intrinsicAttribs !== errorType) apparentAttributesType = intersectTypes(intrinsicAttribs, apparentAttributesType);
      return apparentAttributesType;
    }
  }
  function getContextualCallSignature(type: Type, node: SignatureDeclaration): Signature | undefined {
    const signatures = getSignaturesOfType(type, SignatureKind.Call);
    if (signatures.length === 1) {
      const signature = signatures[0];
      if (!isAritySmaller(signature, node)) return signature;
    }
  }
  function getContextualSignatureForFunctionLikeDeclaration(node: FunctionLikeDeclaration): Signature | undefined {
    return isFunctionExpressionOrArrowFunction(node) || is.objectLiteralMethod(node) ? getContextualSignature(<FunctionExpression>node) : undefined;
  }
  function getContextualSignature(node: FunctionExpression | ArrowFunction | MethodDeclaration): Signature | undefined {
    assert(node.kind !== Syntax.MethodDeclaration || is.objectLiteralMethod(node));
    const typeTagSignature = getSignatureOfTypeTag(node);
    if (typeTagSignature) return typeTagSignature;
    const type = getApparentTypeOfContextualType(node, ContextFlags.Signature);
    if (!type) return;
    if (!(type.flags & qt.TypeFlags.Union)) return getContextualCallSignature(type, node);
    let signatureList: Signature[] | undefined;
    const types = (<UnionType>type).types;
    for (const current of types) {
      const signature = getContextualCallSignature(current, node);
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
  function getArrayLiteralTupleTypeIfApplicable(elementTypes: Type[], contextualType: Type | undefined, hasRestElement: boolean, elementCount = elementTypes.length, readonly = false) {
    if (readonly || (contextualType && forEachType(contextualType, isTupleLikeType))) return createTupleType(elementTypes, elementCount - (hasRestElement ? 1 : 0), hasRestElement, readonly);
    return;
  }
  function getObjectLiteralIndexInfo(node: ObjectLiteralExpression, offset: number, properties: Symbol[], kind: IndexKind): IndexInfo {
    const propTypes: Type[] = [];
    for (let i = 0; i < properties.length; i++) {
      if (kind === IndexKind.String || isNumericName(node.properties[i + offset].name!)) propTypes.push(getTypeOfSymbol(properties[i]));
    }
    const unionType = propTypes.length ? getUnionType(propTypes, UnionReduction.Subtype) : undefinedType;
    return createIndexInfo(unionType, isConstContext(node));
  }
  function getJsxType(name: qb.__String, location: Node | undefined) {
    const namespace = getJsxNamespaceAt(location);
    const exports = namespace && namespace.getExportsOfSymbol();
    const typeSymbol = exports && getSymbol(exports, name, qt.SymbolFlags.Type);
    return typeSymbol ? getDeclaredTypeOfSymbol(typeSymbol) : errorType;
  }
  function getIntrinsicTagSymbol(node: JsxOpeningLikeElement | JsxClosingElement): Symbol {
    const links = getNodeLinks(node);
    if (!links.resolvedSymbol) {
      const intrinsicElementsType = getJsxType(JsxNames.IntrinsicElements, node);
      if (intrinsicElementsType !== errorType) {
        if (!is.kind(qc.Identifier, node.tagName)) return qb.fail();
        const intrinsicProp = getPropertyOfType(intrinsicElementsType, node.tagName.escapedText);
        if (intrinsicProp) {
          links.jsxFlags |= JsxFlags.IntrinsicNamedElement;
          return (links.resolvedSymbol = intrinsicProp);
        }
        const indexSignatureType = getIndexTypeOfType(intrinsicElementsType, IndexKind.String);
        if (indexSignatureType) {
          links.jsxFlags |= JsxFlags.IntrinsicIndexedElement;
          return (links.resolvedSymbol = intrinsicElementsType.symbol);
        }
        error(node, qd.msgs.Property_0_does_not_exist_on_type_1, idText(node.tagName), 'JSX.' + JsxNames.IntrinsicElements);
        return (links.resolvedSymbol = unknownSymbol);
      } else {
        if (noImplicitAny) error(node, qd.msgs.JSX_element_implicitly_has_type_any_because_no_interface_JSX_0_exists, qy.get.unescUnderscores(JsxNames.IntrinsicElements));
        return (links.resolvedSymbol = unknownSymbol);
      }
    }
    return links.resolvedSymbol;
  }
  function getJsxNamespaceAt(location: Node | undefined): Symbol {
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
  function getNameFromJsxElementAttributesContainer(nameOfAttribPropContainer: qb.__String, jsxNamespace: Symbol): qb.__String | undefined {
    const jsxElementAttribPropInterfaceSym = jsxNamespace && getSymbol(jsxNamespace.exports!, nameOfAttribPropContainer, qt.SymbolFlags.Type);
    const jsxElementAttribPropInterfaceType = jsxElementAttribPropInterfaceSym && getDeclaredTypeOfSymbol(jsxElementAttribPropInterfaceSym);
    const propertiesOfJsxElementAttribPropInterface = jsxElementAttribPropInterfaceType && getPropertiesOfType(jsxElementAttribPropInterfaceType);
    if (propertiesOfJsxElementAttribPropInterface) {
      if (propertiesOfJsxElementAttribPropInterface.length === 0) return '' as qb.__String;
      else if (propertiesOfJsxElementAttribPropInterface.length === 1) return propertiesOfJsxElementAttribPropInterface[0].escName;
      else if (propertiesOfJsxElementAttribPropInterface.length > 1) {
        error(jsxElementAttribPropInterfaceSym!.declarations[0], qd.msgs.The_global_type_JSX_0_may_not_have_more_than_one_property, qy.get.unescUnderscores(nameOfAttribPropContainer));
      }
    }
    return;
  }
  function getJsxLibraryManagedAttributes(jsxNamespace: Symbol) {
    return jsxNamespace && getSymbol(jsxNamespace.exports!, JsxNames.LibraryManagedAttributes, qt.SymbolFlags.Type);
  }
  function getJsxElementPropertiesName(jsxNamespace: Symbol) {
    return getNameFromJsxElementAttributesContainer(JsxNames.ElementAttributesPropertyNameContainer, jsxNamespace);
  }
  function getJsxElementChildrenPropertyName(jsxNamespace: Symbol): qb.__String | undefined {
    return getNameFromJsxElementAttributesContainer(JsxNames.ElementChildrenAttributeNameContainer, jsxNamespace);
  }
  function getUninstantiatedJsxSignaturesOfType(elementType: Type, caller: JsxOpeningLikeElement): readonly Signature[] {
    if (elementType.flags & qt.TypeFlags.String) return [anySignature];
    else if (elementType.flags & qt.TypeFlags.StringLiteral) {
      const intrinsicType = getIntrinsicAttributesTypeFromStringLiteralType(elementType as StringLiteralType, caller);
      if (!intrinsicType) {
        error(caller, qd.msgs.Property_0_does_not_exist_on_type_1, (elementType as StringLiteralType).value, 'JSX.' + JsxNames.IntrinsicElements);
        return empty;
      } else {
        const fakeSignature = createSignatureForJSXIntrinsic(caller, intrinsicType);
        return [fakeSignature];
      }
    }
    const apparentElemType = getApparentType(elementType);
    let signatures = getSignaturesOfType(apparentElemType, SignatureKind.Construct);
    if (signatures.length === 0) signatures = getSignaturesOfType(apparentElemType, SignatureKind.Call);
    if (signatures.length === 0 && apparentElemType.flags & qt.TypeFlags.Union)
      signatures = getUnionSignatures(map((apparentElemType as UnionType).types, (t) => getUninstantiatedJsxSignaturesOfType(t, caller)));
    return signatures;
  }
  function getIntrinsicAttributesTypeFromStringLiteralType(type: StringLiteralType, location: Node): Type | undefined {
    const intrinsicElementsType = getJsxType(JsxNames.IntrinsicElements, location);
    if (intrinsicElementsType !== errorType) {
      const stringLiteralTypeName = type.value;
      const intrinsicProp = getPropertyOfType(intrinsicElementsType, qy.get.escUnderscores(stringLiteralTypeName));
      if (intrinsicProp) return getTypeOfSymbol(intrinsicProp);
      const indexSignatureType = getIndexTypeOfType(intrinsicElementsType, IndexKind.String);
      if (indexSignatureType) return indexSignatureType;
      return;
    }
    return anyType;
  }
  function getIntrinsicAttributesTypeFromJsxOpeningLikeElement(node: JsxOpeningLikeElement): Type {
    assert(isJsxIntrinsicIdentifier(node.tagName));
    const links = getNodeLinks(node);
    if (!links.resolvedJsxElementAttributesType) {
      const symbol = getIntrinsicTagSymbol(node);
      if (links.jsxFlags & JsxFlags.IntrinsicNamedElement) return (links.resolvedJsxElementAttributesType = this.getTypeOfSymbol());
      else if (links.jsxFlags & JsxFlags.IntrinsicIndexedElement) return (links.resolvedJsxElementAttributesType = getIndexTypeOfType(getDeclaredTypeOfSymbol(symbol), IndexKind.String)!);
      return (links.resolvedJsxElementAttributesType = errorType);
    }
    return links.resolvedJsxElementAttributesType;
  }
  function getJsxElementClassTypeAt(location: Node): Type | undefined {
    const type = getJsxType(JsxNames.ElementClass, location);
    if (type === errorType) return;
    return type;
  }
  function getJsxElementTypeAt(location: Node): Type {
    return getJsxType(JsxNames.Element, location);
  }
  function getJsxStatelessElementTypeAt(location: Node): Type | undefined {
    const jsxElementType = getJsxElementTypeAt(location);
    if (jsxElementType) return getUnionType([jsxElementType, nullType]);
  }
  function getJsxIntrinsicTagNamesAt(location: Node): Symbol[] {
    const intrinsics = getJsxType(JsxNames.IntrinsicElements, location);
    return intrinsics ? getPropertiesOfType(intrinsics) : empty;
  }
  function getDeclarationNodeFlagsFromSymbol(s: Symbol): NodeFlags {
    return s.valueDeclaration ? get.combinedFlagsOf(s.valueDeclaration) : 0;
  }
  function getThisParameterFromNodeContext(node: Node) {
    const thisContainer = get.thisContainer(node, false);
    return thisContainer && is.functionLike(thisContainer) ? getThisNodeKind(ParameterDeclaration, thisContainer) : undefined;
  }
  function getNonNullableTypeIfNeeded(type: Type) {
    return isNullableType(type) ? getNonNullableType(type) : type;
  }
  function getPrivateIdentifierPropertyOfType(leftType: Type, lexicallyScopedIdentifier: Symbol): Symbol | undefined {
    return getPropertyOfType(leftType, lexicallyScopedIdentifier.escName);
  }
  function getFlowTypeOfAccessExpression(node: ElementAccessExpression | PropertyAccessExpression | QualifiedName, prop: Symbol | undefined, propType: Type, errorNode: Node) {
    const assignmentKind = get.assignmentTargetKind(node);
    if (
      !is.accessExpression(node) ||
      assignmentKind === AssignmentKind.Definite ||
      (prop && !(prop.flags & (SymbolFlags.Variable | qt.SymbolFlags.Property | qt.SymbolFlags.Accessor)) && !(prop.flags & qt.SymbolFlags.Method && propType.flags & qt.TypeFlags.Union))
    ) {
      return propType;
    }
    if (propType === autoType) return getFlowTypeOfProperty(node, prop);
    let assumeUninitialized = false;
    if (strictNullChecks && strictPropertyInitialization && node.expression.kind === Syntax.ThisKeyword) {
      const declaration = prop && prop.valueDeclaration;
      if (declaration && isInstancePropertyWithoutIniter(declaration)) {
        const flowContainer = getControlFlowContainer(node);
        if (flowContainer.kind === Syntax.Constructor && flowContainer.parent === declaration.parent && !(declaration.flags & NodeFlags.Ambient)) assumeUninitialized = true;
      }
    } else if (
      strictNullChecks &&
      prop &&
      prop.valueDeclaration &&
      is.kind(qc.PropertyAccessExpression, prop.valueDeclaration) &&
      getAssignmentDeclarationPropertyAccessKind(prop.valueDeclaration) &&
      getControlFlowContainer(node) === getControlFlowContainer(prop.valueDeclaration)
    ) {
      assumeUninitialized = true;
    }
    const flowType = getFlowTypeOfReference(node, propType, assumeUninitialized ? getOptionalType(propType) : propType);
    if (assumeUninitialized && !(getFalsyFlags(propType) & qt.TypeFlags.Undefined) && getFalsyFlags(flowType) & qt.TypeFlags.Undefined) {
      error(errorNode, qd.msgs.Property_0_is_used_before_being_assigned, prop!.symbolToString());
      return propType;
    }
    return assignmentKind ? getBaseTypeOfLiteralType(flowType) : flowType;
  }
  function getSuperClass(classType: InterfaceType): Type | undefined {
    const x = getBaseTypes(classType);
    if (x.length === 0) return;
    return getIntersectionType(x);
  }
  function getSuggestedSymbolForNonexistentProperty(name: qc.Identifier | qc.PrivateIdentifier | string, containingType: Type): Symbol | undefined {
    return getSpellingSuggestionForName(isString(name) ? name : idText(name), getPropertiesOfType(containingType), qt.SymbolFlags.Value);
  }
  function getSuggestionForNonexistentProperty(name: qc.Identifier | qc.PrivateIdentifier | string, containingType: Type): string | undefined {
    const suggestion = getSuggestedSymbolForNonexistentProperty(name, containingType);
    return suggestion && suggestion.name;
  }
  function getSuggestedSymbolForNonexistentSymbol(location: Node | undefined, outerName: qb.__String, meaning: qt.SymbolFlags): Symbol | undefined {
    assert(outerName !== undefined, 'outername should always be defined');
    const result = resolveNameHelper(location, outerName, meaning, undefined, outerName, false, false, (symbols, name, meaning) => {
      Debug.assertEqual(outerName, name, 'name should equal outerName');
      const symbol = getSymbol(symbols, name, meaning);
      return symbol || getSpellingSuggestionForName(qy.get.unescUnderscores(name), arrayFrom(symbols.values()), meaning);
    });
    return result;
  }
  function getSuggestionForNonexistentSymbol(location: Node | undefined, outerName: qb.__String, meaning: qt.SymbolFlags): string | undefined {
    const symbolResult = getSuggestedSymbolForNonexistentSymbol(location, outerName, meaning);
    return symbolResult && symbolResult.name;
  }
  function getSuggestedSymbolForNonexistentModule(name: Identifier, targetModule: Symbol): Symbol | undefined {
    return targetModule.exports && getSpellingSuggestionForName(idText(name), getExportsOfModuleAsArray(targetModule), qt.SymbolFlags.ModuleMember);
  }
  function getSuggestionForNonexistentExport(name: Identifier, targetModule: Symbol): string | undefined {
    const suggestion = getSuggestedSymbolForNonexistentModule(name, targetModule);
    return suggestion && suggestion.name;
  }
  function getSuggestionForNonexistentIndexSignature(objectType: Type, expr: ElementAccessExpression, keyedType: Type): string | undefined {
    function hasProp(name: 'set' | 'get') {
      const prop = getPropertyOfObjectType(objectType, <__String>name);
      if (prop) {
        const s = getSingleCallSignature(getTypeOfSymbol(prop));
        return !!s && getMinArgumentCount(s) >= 1 && isTypeAssignableTo(keyedType, getTypeAtPosition(s, 0));
      }
      return false;
    }
    const suggestedMethod = is.assignmentTarget(expr) ? 'set' : 'get';
    if (!hasProp(suggestedMethod)) return;
    let suggestion = tryGetPropertyAccessOrIdentifierToString(expr.expression);
    if (suggestion === undefined) suggestion = suggestedMethod;
    else {
      suggestion += '.' + suggestedMethod;
    }
    return suggestion;
  }
  function getSpellingSuggestionForName(name: string, symbols: Symbol[], meaning: qt.SymbolFlags): Symbol | undefined {
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
  function getForInVariableSymbol(node: ForInStatement): Symbol | undefined {
    const initer = node.initer;
    if (initer.kind === Syntax.VariableDeclarationList) {
      const variable = (<VariableDeclarationList>initer).declarations[0];
      if (variable && !is.kind(qc.BindingPattern, variable.name)) return getSymbolOfNode(variable);
    } else if (initer.kind === Syntax.Identifier) {
      return getResolvedSymbol(<Identifier>initer);
    }
    return;
  }
  function getSpreadArgumentIndex(args: readonly Expression[]): number {
    return findIndex(args, isSpreadArgument);
  }
  function getSingleCallSignature(type: Type): Signature | undefined {
    return getSingleSignature(type, SignatureKind.Call, false);
  }
  function getSingleCallOrConstructSignature(type: Type): Signature | undefined {
    return getSingleSignature(type, SignatureKind.Call, false);
  }
  function getSingleSignature(type: Type, kind: SignatureKind, allowMembers: boolean): Signature | undefined {
    if (type.flags & qt.TypeFlags.Object) {
      const resolved = resolveStructuredTypeMembers(<ObjectType>type);
      if (allowMembers || (resolved.properties.length === 0 && !resolved.stringIndexInfo && !resolved.numberIndexInfo)) {
        if (kind === SignatureKind.Call && resolved.callSignatures.length === 1 && resolved.constructSignatures.length === 0) return resolved.callSignatures[0];
        if (kind === SignatureKind.Construct && resolved.constructSignatures.length === 1 && resolved.callSignatures.length === 0) return resolved.constructSignatures[0];
      }
    }
    return;
  }
  function getArrayifiedType(type: Type) {
    return type.flags & qt.TypeFlags.Union
      ? mapType(type, getArrayifiedType)
      : type.flags & (TypeFlags.Any | qt.TypeFlags.Instantiable) || isMutableArrayOrTuple(type)
      ? type
      : isTupleType(type)
      ? createTupleType(getTypeArguments(type), type.target.minLength, type.target.hasRestElement, false, type.target.labeledElementDeclarations)
      : createArrayType(getIndexedAccessType(type, numberType));
  }
  function getSpreadArgumentType(args: readonly Expression[], index: number, argCount: number, restType: Type, context: InferenceContext | undefined) {
    if (index >= argCount - 1) {
      const arg = args[argCount - 1];
      if (isSpreadArgument(arg)) {
        return arg.kind === Syntax.SyntheticExpression
          ? createArrayType((<SyntheticExpression>arg).type)
          : getArrayifiedType(check.expressionWithContextualType((<SpreadElement>arg).expression, restType, context, CheckMode.Normal));
      }
    }
    const types = [];
    const names: (ParameterDeclaration | NamedTupleMember)[] = [];
    let spreadIndex = -1;
    for (let i = index; i < argCount; i++) {
      const contextualType = getIndexedAccessType(restType, getLiteralType(i - index));
      const argType = check.expressionWithContextualType(args[i], contextualType, context, CheckMode.Normal);
      if (spreadIndex < 0 && isSpreadArgument(args[i])) spreadIndex = i - index;
      if (args[i].kind === Syntax.SyntheticExpression && (args[i] as SyntheticExpression).tupleNameSource) names.push((args[i] as SyntheticExpression).tupleNameSource!);
      const hasPrimitiveContextualType = maybeTypeOfKind(contextualType, qt.TypeFlags.Primitive | qt.TypeFlags.Index);
      types.push(hasPrimitiveContextualType ? getRegularTypeOfLiteralType(argType) : getWidenedLiteralType(argType));
    }
    return spreadIndex < 0
      ? createTupleType(types, undefined, length(names) === length(types) ? names : undefined)
      : createTupleType(append(types.slice(0, spreadIndex), getUnionType(types.slice(spreadIndex))), spreadIndex, undefined);
  }
  function getJsxReferenceKind(node: JsxOpeningLikeElement): JsxReferenceKind {
    if (isJsxIntrinsicIdentifier(node.tagName)) return JsxReferenceKind.Mixed;
    const tagType = getApparentType(check.expression(node.tagName));
    if (length(getSignaturesOfType(tagType, SignatureKind.Construct))) return JsxReferenceKind.Component;
    if (length(getSignaturesOfType(tagType, SignatureKind.Call))) return JsxReferenceKind.Function;
    return JsxReferenceKind.Mixed;
  }
  function getSignatureApplicabilityError(
    node: CallLikeExpression,
    args: readonly Expression[],
    signature: Signature,
    relation: qb.QMap<RelationComparisonResult>,
    checkMode: CheckMode,
    reportErrors: boolean,
    containingMessageChain: (() => qd.MessageChain | undefined) | undefined
  ): readonly qd.Diagnostic[] | undefined {
    const errorOutputContainer: { errors?: qd.Diagnostic[]; skipLogging?: boolean } = { errors: undefined, skipLogging: true };
    if (qc.isJsx.openingLikeElement(node)) {
      if (!check.applicableSignatureForJsxOpeningLikeElement(node, signature, relation, checkMode, reportErrors, containingMessageChain, errorOutputContainer)) {
        assert(!reportErrors || !!errorOutputContainer.errors, 'jsx should have errors when reporting errors');
        return errorOutputContainer.errors || empty;
      }
      return;
    }
    const thisType = getThisTypeOfSignature(signature);
    if (thisType && thisType !== voidType && node.kind !== Syntax.NewExpression) {
      const thisArgumentNode = getThisArgumentOfCall(node);
      let thisArgumentType: Type;
      if (thisArgumentNode) {
        thisArgumentType = check.expression(thisArgumentNode);
        if (is.optionalChainRoot(thisArgumentNode.parent)) thisArgumentType = getNonNullableType(thisArgumentType);
        else if (is.optionalChain(thisArgumentNode.parent)) {
          thisArgumentType = removeOptionalTypeMarker(thisArgumentType);
        }
      } else {
        thisArgumentType = voidType;
      }
      const errorNode = reportErrors ? thisArgumentNode || node : undefined;
      const headMessage = qd.msgs.The_this_context_of_type_0_is_not_assignable_to_method_s_this_of_type_1;
      if (!check.typeRelatedTo(thisArgumentType, thisType, relation, errorNode, headMessage, containingMessageChain, errorOutputContainer)) {
        assert(!reportErrors || !!errorOutputContainer.errors, 'this parameter should have errors when reporting errors');
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
          assert(!reportErrors || !!errorOutputContainer.errors, 'parameter should have errors when reporting errors');
          maybeAddMissingAwaitInfo(arg, checkArgType, paramType);
          return errorOutputContainer.errors || empty;
        }
      }
    }
    if (restType) {
      const spreadType = getSpreadArgumentType(args, argCount, args.length, restType, undefined);
      const errorNode = reportErrors ? (argCount < args.length ? args[argCount] : node) : undefined;
      if (!check.typeRelatedTo(spreadType, restType, relation, errorNode, headMessage, undefined, errorOutputContainer)) {
        assert(!reportErrors || !!errorOutputContainer.errors, 'rest parameter should have errors when reporting errors');
        maybeAddMissingAwaitInfo(errorNode, spreadType, restType);
        return errorOutputContainer.errors || empty;
      }
    }
    return;
    function maybeAddMissingAwaitInfo(errorNode: Node | undefined, source: Type, target: Type) {
      if (errorNode && reportErrors && errorOutputContainer.errors && errorOutputContainer.errors.length) {
        if (getAwaitedTypeOfPromise(target)) return;
        const awaitedTypeOfSource = getAwaitedTypeOfPromise(source);
        if (awaitedTypeOfSource && isTypeRelatedTo(awaitedTypeOfSource, target, relation))
          addRelatedInfo(errorOutputContainer.errors[0], createDiagnosticForNode(errorNode, qd.msgs.Did_you_forget_to_use_await));
      }
    }
  }
  function getThisArgumentOfCall(node: CallLikeExpression): LeftHandSideExpression | undefined {
    if (node.kind === Syntax.CallExpression) {
      const callee = skipOuterExpressions(node.expression);
      if (is.accessExpression(callee)) return callee.expression;
    }
  }
  function getEffectiveCallArguments(node: CallLikeExpression): readonly Expression[] {
    if (node.kind === Syntax.TaggedTemplateExpression) {
      const template = node.template;
      const args: Expression[] = [createSyntheticExpression(template, getGlobalTemplateStringsArrayType())];
      if (template.kind === Syntax.TemplateExpression) {
        forEach(template.templateSpans, (span) => {
          args.push(span.expression);
        });
      }
      return args;
    }
    if (node.kind === Syntax.Decorator) return getEffectiveDecoratorArguments(node);
    if (qc.isJsx.openingLikeElement(node)) return node.attributes.properties.length > 0 || (is.kind(qc.JsxOpeningElement, node) && node.parent.children.length > 0) ? [node.attributes] : empty;
    const args = node.arguments || empty;
    const length = args.length;
    if (length && isSpreadArgument(args[length - 1]) && getSpreadArgumentIndex(args) === length - 1) {
      const spreadArgument = <SpreadElement>args[length - 1];
      const type = flowLoopCount ? check.expression(spreadArgument.expression) : check.expressionCached(spreadArgument.expression);
      if (isTupleType(type)) {
        const typeArguments = getTypeArguments(<TypeReference>type);
        const restIndex = type.target.hasRestElement ? typeArguments.length - 1 : -1;
        const syntheticArgs = map(typeArguments, (t, i) => createSyntheticExpression(spreadArgument, t, i === restIndex, type.target.labeledElementDeclarations?.[i]));
        return concatenate(args.slice(0, length - 1), syntheticArgs);
      }
    }
    return args;
  }
  function getEffectiveDecoratorArguments(node: Decorator): readonly Expression[] {
    const parent = node.parent;
    const expr = node.expression;
    switch (parent.kind) {
      case Syntax.ClassDeclaration:
      case Syntax.ClassExpression:
        return [createSyntheticExpression(expr, getTypeOfSymbol(getSymbolOfNode(parent)))];
      case Syntax.Parameter:
        const func = <FunctionLikeDeclaration>parent.parent;
        return [
          createSyntheticExpression(expr, parent.parent.kind === Syntax.Constructor ? getTypeOfSymbol(getSymbolOfNode(func)) : errorType),
          createSyntheticExpression(expr, anyType),
          createSyntheticExpression(expr, numberType),
        ];
      case Syntax.PropertyDeclaration:
      case Syntax.MethodDeclaration:
      case Syntax.GetAccessor:
      case Syntax.SetAccessor:
        const hasPropDesc = parent.kind !== Syntax.PropertyDeclaration;
        return [
          createSyntheticExpression(expr, getParentTypeOfClassElement(<ClassElement>parent)),
          createSyntheticExpression(expr, getClassElementPropertyKeyType(<ClassElement>parent)),
          createSyntheticExpression(expr, hasPropDesc ? createTypedPropertyDescriptorType(getTypeOfNode(parent)) : anyType),
        ];
    }
    return qb.fail();
  }
  function getDecoratorArgumentCount(node: Decorator, signature: Signature) {
    switch (node.parent.kind) {
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
        return qb.fail();
    }
  }
  function getDiagnosticSpanForCallNode(node: CallExpression, doNotIncludeArguments?: boolean) {
    let start: number;
    let length: number;
    const sourceFile = get.sourceFileOf(node);
    if (is.kind(qc.PropertyAccessExpression, node.expression)) {
      const nameSpan = getErrorSpanForNode(sourceFile, node.expression.name);
      start = nameSpan.start;
      length = doNotIncludeArguments ? nameSpan.length : node.end - start;
    } else {
      const expressionSpan = getErrorSpanForNode(sourceFile, node.expression);
      start = expressionSpan.start;
      length = doNotIncludeArguments ? expressionSpan.length : node.end - start;
    }
    return { start, length, sourceFile };
  }
  function getDiagnosticForCallNode(
    node: CallLikeExpression,
    message: qd.Message,
    arg0?: string | number,
    arg1?: string | number,
    arg2?: string | number,
    arg3?: string | number
  ): qd.DiagnosticWithLocation {
    if (is.kind(qc.CallExpression, node)) {
      const { sourceFile, start, length } = getDiagnosticSpanForCallNode(node);
      return createFileDiagnostic(sourceFile, start, length, message, arg0, arg1, arg2, arg3);
    }
    return createDiagnosticForNode(node, message, arg0, arg1, arg2, arg3);
  }
  function getArgumentArityError(node: CallLikeExpression, signatures: readonly Signature[], args: readonly Expression[]) {
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
    const hasRestParameter = some(signatures, hasEffectiveRestParameter);
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
        related = createDiagnosticForNode(
          paramDecl,
          is.kind(qc.BindingPattern, paramDecl.name) ? qd.msgs.An_argument_matching_this_binding_pattern_was_not_provided : qd.msgs.An_argument_for_0_was_not_provided,
          !paramDecl.name ? argCount : !is.kind(qc.BindingPattern, paramDecl.name) ? idText(getFirstIdentifier(paramDecl.name)) : undefined
        );
      }
    }
    if (min < argCount && argCount < max)
      return getDiagnosticForCallNode(node, qd.msgs.No_overload_expects_0_arguments_but_overloads_do_exist_that_expect_either_1_or_2_arguments, argCount, belowArgCount, aboveArgCount);
    if (!hasSpreadArgument && argCount < min) {
      const diagnostic = getDiagnosticForCallNode(node, error, paramRange, argCount);
      return related ? addRelatedInfo(diagnostic, related) : diagnostic;
    }
    if (hasRestParameter || hasSpreadArgument) {
      spanArray = new Nodes(args);
      if (hasSpreadArgument && argCount) {
        const nextArg = elementAt(args, getSpreadArgumentIndex(args) + 1) || undefined;
        spanArray = new Nodes(args.slice(max > argCount && nextArg ? args.indexOf(nextArg) : Math.min(max, args.length - 1)));
      }
    } else {
      spanArray = new Nodes(args.slice(max));
    }
    spanArray.pos = first(spanArray).pos;
    spanArray.end = last(spanArray).end;
    if (spanArray.end === spanArray.pos) spanArray.end++;
    const diagnostic = createDiagnosticForNodes(get.sourceFileOf(node), spanArray, error, paramRange, argCount);
    return related ? addRelatedInfo(diagnostic, related) : diagnostic;
  }
  function getTypeArgumentArityError(node: Node, signatures: readonly Signature[], typeArguments: Nodes<TypeNode>) {
    const argCount = typeArguments.length;
    if (signatures.length === 1) {
      const sig = signatures[0];
      const min = getMinTypeArgumentCount(sig.typeParameters);
      const max = length(sig.typeParameters);
      return createDiagnosticForNodes(get.sourceFileOf(node), typeArguments, qd.msgs.Expected_0_type_arguments_but_got_1, min < max ? min + '-' + max : min, argCount);
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
      return createDiagnosticForNodes(
        get.sourceFileOf(node),
        typeArguments,
        qd.msgs.No_overload_expects_0_type_arguments_but_overloads_do_exist_that_expect_either_1_or_2_type_arguments,
        argCount,
        belowArgCount,
        aboveArgCount
      );
    }
    return createDiagnosticForNodes(get.sourceFileOf(node), typeArguments, qd.msgs.Expected_0_type_arguments_but_got_1, belowArgCount === -Infinity ? aboveArgCount : belowArgCount, argCount);
  }
  function getCandidateForOverloadFailure(node: CallLikeExpression, candidates: Signature[], args: readonly Expression[], hasCandidatesOutArray: boolean): Signature {
    assert(candidates.length > 0);
    check.nodeDeferred(node);
    return hasCandidatesOutArray || candidates.length === 1 || candidates.some((c) => !!c.typeParameters)
      ? pickLongestCandidateSignature(node, candidates, args)
      : createUnionOfSignaturesForOverloadFailure(candidates);
  }
  function getNumNonRestParameters(signature: Signature): number {
    const numParams = signature.parameters.length;
    return signatureHasRestParameter(signature) ? numParams - 1 : numParams;
  }
  function getTypeArgumentsFromNodes(typeArgumentNodes: readonly TypeNode[], typeParameters: readonly TypeParameter[], isJs: boolean): readonly Type[] {
    const typeArguments = typeArgumentNodes.map(getTypeOfNode);
    while (typeArguments.length > typeParameters.length) {
      typeArguments.pop();
    }
    while (typeArguments.length < typeParameters.length) {
      typeArguments.push(getConstraintOfTypeParameter(typeParameters[typeArguments.length]) || getDefaultTypeArgumentType(isJs));
    }
    return typeArguments;
  }
  function getLongestCandidateIndex(candidates: Signature[], argsCount: number): number {
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
  function getDiagnosticHeadMessageForDecoratorResolution(node: Decorator) {
    switch (node.parent.kind) {
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
        return qb.fail();
    }
  }
  function getResolvedSignature(node: CallLikeExpression, candidatesOutArray?: Signature[] | undefined, checkMode?: CheckMode): Signature {
    const links = getNodeLinks(node);
    const cached = links.resolvedSignature;
    if (cached && cached !== resolvingSignature && !candidatesOutArray) return cached;
    links.resolvedSignature = resolvingSignature;
    const result = resolveSignature(node, candidatesOutArray, checkMode || CheckMode.Normal);
    if (result !== resolvingSignature) links.resolvedSignature = flowLoopStart === flowLoopCount ? result : cached;
    return result;
  }
  function getAssignedClassSymbol(decl: Declaration): Symbol | undefined {
    const assignmentSymbol =
      decl &&
      decl.parent &&
      ((is.kind(qc.FunctionDeclaration, decl) && getSymbolOfNode(decl)) ||
        (is.kind(qc.BinaryExpression, decl.parent) && getSymbolOfNode(decl.parent.left)) ||
        (is.kind(qc.VariableDeclaration, decl.parent) && getSymbolOfNode(decl.parent)));
    const prototype = assignmentSymbol && assignmentSymbol.exports && assignmentSymbol.exports.get('prototype' as qb.__String);
    const init = prototype && prototype.valueDeclaration && getAssignedJSPrototype(prototype.valueDeclaration);
    return init ? getSymbolOfNode(init) : undefined;
  }
  function getAssignedJSPrototype(node: Node) {
    if (!node.parent) return false;
    let parent: Node = node.parent;
    while (parent && parent.kind === Syntax.PropertyAccessExpression) {
      parent = parent.parent;
    }
    if (parent && is.kind(qc.BinaryExpression, parent) && is.prototypeAccess(parent.left) && parent.operatorToken.kind === Syntax.EqualsToken) {
      const right = getIniterOfBinaryExpression(parent);
      return is.kind(qc.ObjectLiteralExpression, right) && right;
    }
  }
  function getTypeWithSyntheticDefaultImportType(type: Type, symbol: Symbol, originalSymbol: Symbol): Type {
    if (allowSyntheticDefaultImports && type && type !== errorType) {
      const synthType = type as SyntheticDefaultModuleType;
      if (!synthType.syntheticType) {
        const file = find(originalSymbol.declarations, isSourceFile);
        const hasSyntheticDefault = canHaveSyntheticDefault(file, originalSymbol, false);
        if (hasSyntheticDefault) {
          const memberTable = new SymbolTable();
          const newSymbol = new Symbol(SymbolFlags.Alias, InternalSymbol.Default);
          newSymbol.nameType = getLiteralType('default');
          newSymbol.target = symbol.resolveSymbol();
          memberTable.set(InternalSymbol.Default, newSymbol);
          const anonymousSymbol = new Symbol(SymbolFlags.TypeLiteral, InternalSymbol.Type);
          const defaultContainingObject = createAnonymousType(anonymousSymbol, memberTable, empty, empty, undefined);
          anonymousSymbol.type = defaultContainingObject;
          synthType.syntheticType = isValidSpreadType(type) ? getSpreadType(type, defaultContainingObject, anonymousSymbol, false) : defaultContainingObject;
        } else {
          synthType.syntheticType = type;
        }
      }
      return synthType.syntheticType;
    }
    return type;
  }
  function getTupleElementLabel(d: ParameterDeclaration | NamedTupleMember) {
    assert(is.kind(qc.Identifier, d.name));
    return d.name.escapedText;
  }
  function getParameterNameAtPosition(signature: Signature, pos: number) {
    const paramCount = signature.parameters.length - (signatureHasRestParameter(signature) ? 1 : 0);
    if (pos < paramCount) return signature.parameters[pos].escName;
    const restParameter = signature.parameters[paramCount] || unknownSymbol;
    const restType = getTypeOfSymbol(restParameter);
    if (isTupleType(restType)) {
      const associatedNames = (<TupleType>(<TypeReference>restType).target).labeledElementDeclarations;
      const index = pos - paramCount;
      return (associatedNames && getTupleElementLabel(associatedNames[index])) || ((restParameter.escName + '_' + index) as qb.__String);
    }
    return restParameter.escName;
  }
  function getNameableDeclarationAtPosition(signature: Signature, pos: number) {
    const paramCount = signature.parameters.length - (signatureHasRestParameter(signature) ? 1 : 0);
    if (pos < paramCount) {
      const decl = signature.parameters[pos].valueDeclaration;
      return decl && isValidDeclarationForTupleLabel(decl) ? decl : undefined;
    }
    const restParameter = signature.parameters[paramCount] || unknownSymbol;
    const restType = getTypeOfSymbol(restParameter);
    if (isTupleType(restType)) {
      const associatedNames = (<TupleType>(<TypeReference>restType).target).labeledElementDeclarations;
      const index = pos - paramCount;
      return associatedNames && associatedNames[index];
    }
    return restParameter.valueDeclaration && isValidDeclarationForTupleLabel(restParameter.valueDeclaration) ? restParameter.valueDeclaration : undefined;
  }
  function getTypeAtPosition(signature: Signature, pos: number): Type {
    return tryGetTypeAtPosition(signature, pos) || anyType;
  }
  function getRestTypeAtPosition(source: Signature, pos: number): Type {
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
      types.push(getIndexedAccessType(restType, numberType));
      const name = getNameableDeclarationAtPosition(source, nonRestCount);
      if (name && names) names.push(name);
      else names = undefined;
    }
    const minArgumentCount = getMinArgumentCount(source);
    const minLength = minArgumentCount < pos ? 0 : minArgumentCount - pos;
    return createTupleType(types, minLength, !!restType, false, names);
  }
  function getParameterCount(signature: Signature) {
    const length = signature.parameters.length;
    if (signatureHasRestParameter(signature)) {
      const restType = getTypeOfSymbol(signature.parameters[length - 1]);
      if (isTupleType(restType)) return length + getTypeArguments(restType).length - 1;
    }
    return length;
  }
  function getMinArgumentCount(signature: Signature, strongArityForUntypedJS?: boolean) {
    if (signatureHasRestParameter(signature)) {
      const restType = getTypeOfSymbol(signature.parameters[signature.parameters.length - 1]);
      if (isTupleType(restType)) {
        const minLength = restType.target.minLength;
        if (minLength > 0) return signature.parameters.length - 1 + minLength;
      }
    }
    if (!strongArityForUntypedJS && signature.flags & SignatureFlags.IsUntypedSignatureInJSFile) return 0;
    return signature.minArgumentCount;
  }
  function getEffectiveRestType(signature: Signature) {
    if (signatureHasRestParameter(signature)) {
      const restType = getTypeOfSymbol(signature.parameters[signature.parameters.length - 1]);
      return isTupleType(restType) ? getRestArrayTypeOfTupleType(restType) : restType;
    }
    return;
  }
  function getNonArrayRestType(signature: Signature) {
    const restType = getEffectiveRestType(signature);
    return restType && !isArrayType(restType) && !isTypeAny(restType) && (getReducedType(restType).flags & qt.TypeFlags.Never) === 0 ? restType : undefined;
  }
  function getTypeOfFirstParameterOfSignature(signature: Signature) {
    return getTypeOfFirstParameterOfSignatureWithFallback(signature, neverType);
  }
  function getTypeOfFirstParameterOfSignatureWithFallback(signature: Signature, fallbackType: Type) {
    return signature.parameters.length > 0 ? getTypeAtPosition(signature, 0) : fallbackType;
  }
  function getReturnTypeFromBody(func: FunctionLikeDeclaration, checkMode?: CheckMode): Type {
    if (!func.body) return errorType;
    const functionFlags = getFunctionFlags(func);
    const isAsync = (functionFlags & FunctionFlags.Async) !== 0;
    const isGenerator = (functionFlags & FunctionFlags.Generator) !== 0;
    let returnType: Type | undefined;
    let yieldType: Type | undefined;
    let nextType: Type | undefined;
    let fallbackReturnType: Type = voidType;
    if (func.body.kind !== Syntax.Block) {
      returnType = check.expressionCached(func.body, checkMode && checkMode & ~CheckMode.SkipGenericFunctions);
      if (isAsync) returnType = check.awaitedType(returnType, func, qd.msgs.The_return_type_of_an_async_function_must_either_be_a_valid_promise_or_must_not_contain_a_callable_then_member);
    } else if (isGenerator) {
      const returnTypes = check.andAggregateReturnExpressionTypes(func, checkMode);
      if (!returnTypes) fallbackReturnType = neverType;
      else if (returnTypes.length > 0) returnType = getUnionType(returnTypes, UnionReduction.Subtype);
      const { yieldTypes, nextTypes } = check.andAggregateYieldOperandTypes(func, checkMode);
      yieldType = some(yieldTypes) ? getUnionType(yieldTypes, UnionReduction.Subtype) : undefined;
      nextType = some(nextTypes) ? getIntersectionType(nextTypes) : undefined;
    } else {
      const types = check.andAggregateReturnExpressionTypes(func, checkMode);
      if (!types) return functionFlags & FunctionFlags.Async ? createPromiseReturnType(func, neverType) : neverType;
      if (types.length === 0) return functionFlags & FunctionFlags.Async ? createPromiseReturnType(func, voidType) : voidType;
      returnType = getUnionType(types, UnionReduction.Subtype);
    }
    if (returnType || yieldType || nextType) {
      if (yieldType) reportErrorsFromWidening(func, yieldType, WideningKind.GeneratorYield);
      if (returnType) reportErrorsFromWidening(func, returnType, WideningKind.FunctionReturn);
      if (nextType) reportErrorsFromWidening(func, nextType, WideningKind.GeneratorNext);
      if ((returnType && isUnitType(returnType)) || (yieldType && isUnitType(yieldType)) || (nextType && isUnitType(nextType))) {
        const contextualSignature = getContextualSignatureForFunctionLikeDeclaration(func);
        const contextualType = !contextualSignature
          ? undefined
          : contextualSignature === getSignatureFromDeclaration(func)
          ? isGenerator
            ? undefined
            : returnType
          : instantiateContextualType(getReturnTypeOfSignature(contextualSignature), func);
        if (isGenerator) {
          yieldType = getWidenedLiteralLikeTypeForContextualIterationTypeIfNeeded(yieldType, contextualType, IterationTypeKind.Yield, isAsync);
          returnType = getWidenedLiteralLikeTypeForContextualIterationTypeIfNeeded(returnType, contextualType, IterationTypeKind.Return, isAsync);
          nextType = getWidenedLiteralLikeTypeForContextualIterationTypeIfNeeded(nextType, contextualType, IterationTypeKind.Next, isAsync);
        } else returnType = getWidenedLiteralLikeTypeForContextualReturnTypeIfNeeded(returnType, contextualType, isAsync);
      }
      if (yieldType) yieldType = getWidenedType(yieldType);
      if (returnType) returnType = getWidenedType(returnType);
      if (nextType) nextType = getWidenedType(nextType);
    }
    if (isGenerator)
      return createGeneratorReturnType(yieldType || neverType, returnType || fallbackReturnType, nextType || getContextualIterationType(IterationTypeKind.Next, func) || unknownType, isAsync);
    return isAsync ? createPromiseType(returnType || fallbackReturnType) : returnType || fallbackReturnType;
  }
  function getYieldedTypeOfYieldExpression(node: YieldExpression, expressionType: Type, sentType: Type, isAsync: boolean): Type | undefined {
    const errorNode = node.expression || node;
    const yieldedType = node.asteriskToken ? check.iteratedTypeOrElementType(isAsync ? IterationUse.AsyncYieldStar : IterationUse.YieldStar, expressionType, sentType, errorNode) : expressionType;
    return !isAsync
      ? yieldedType
      : getAwaitedType(
          yieldedType,
          errorNode,
          node.asteriskToken
            ? qd.msgs.Type_of_iterated_elements_of_a_yield_Asterisk_operand_must_either_be_a_valid_promise_or_must_not_contain_a_callable_then_member
            : qd.msgs.Type_of_yield_operand_in_an_async_generator_must_either_be_a_valid_promise_or_must_not_contain_a_callable_then_member
        );
  }
  function getFactsFromTypeofSwitch(start: number, end: number, witnesses: string[], hasDefault: boolean): TypeFacts {
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
  function getUnaryResultType(operandType: Type): Type {
    if (maybeTypeOfKind(operandType, qt.TypeFlags.BigIntLike))
      return isTypeAssignableToKind(operandType, qt.TypeFlags.AnyOrUnknown) || maybeTypeOfKind(operandType, qt.TypeFlags.NumberLike) ? numberOrBigIntType : bigintType;
    return numberType;
  }
  function getBaseTypesIfUnrelated(leftType: Type, rightType: Type, isRelated: (left: Type, right: Type) => boolean): [Type, Type] {
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
  function getContextNode(node: Expression): Node {
    if (node.kind === Syntax.JsxAttributes && !is.kind(qc.JsxSelfClosingElement, node.parent)) return node.parent.parent;
    return node;
  }
  function getUniqueTypeParameters(context: InferenceContext, typeParameters: readonly TypeParameter[]): readonly TypeParameter[] {
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
  function getUniqueTypeParameterName(typeParameters: readonly TypeParameter[], baseName: qb.__String) {
    let len = (<string>baseName).length;
    while (len > 1 && (<string>baseName).charCodeAt(len - 1) >= Codes._0 && (<string>baseName).charCodeAt(len - 1) <= Codes._9) len--;
    const s = (<string>baseName).slice(0, len);
    for (let index = 1; true; index++) {
      const augmentedName = <__String>(s + index);
      if (!hasTypeParameterByName(typeParameters, augmentedName)) return augmentedName;
    }
  }
  function getReturnTypeOfSingleNonGenericCallSignature(funcType: Type) {
    const signature = getSingleCallSignature(funcType);
    if (signature && !signature.typeParameters) return getReturnTypeOfSignature(signature);
  }
  function getReturnTypeOfSingleNonGenericSignatureOfCallChain(expr: CallChain) {
    const funcType = check.expression(expr.expression);
    const nonOptionalType = getOptionalExpressionType(funcType, expr.expression);
    const returnType = getReturnTypeOfSingleNonGenericCallSignature(funcType);
    return returnType && propagateOptionalTypeMarker(returnType, expr, nonOptionalType !== funcType);
  }
  function getTypeOfExpression(node: Expression) {
    const quickType = getQuickTypeOfExpression(node);
    if (quickType) return quickType;
    if (node.flags & NodeFlags.TypeCached && flowTypeCache) {
      const cachedType = flowTypeCache[getNodeId(node)];
      if (cachedType) return cachedType;
    }
    const startInvocationCount = flowInvocationCount;
    const type = check.expression(node);
    if (flowInvocationCount !== startInvocationCount) {
      const cache = flowTypeCache || (flowTypeCache = []);
      cache[getNodeId(node)] = type;
      node.flags |= NodeFlags.TypeCached;
    }
    return type;
  }
  function getQuickTypeOfExpression(node: Expression) {
    const expr = skipParentheses(node);
    if (is.kind(qc.CallExpression, expr) && expr.expression.kind !== Syntax.SuperKeyword && !isRequireCall(expr, true) && !isSymbolOrSymbolForCall(expr)) {
      const type = is.callChain(expr) ? getReturnTypeOfSingleNonGenericSignatureOfCallChain(expr) : getReturnTypeOfSingleNonGenericCallSignature(check.nonNullExpression(expr.expression));
      if (type) return type;
    } else if (is.assertionExpression(expr) && !is.constTypeReference(expr.type)) {
      return getTypeFromTypeNode((<TypeAssertion>expr).type);
    } else if (node.kind === Syntax.NumericLiteral || node.kind === Syntax.StringLiteral || node.kind === Syntax.TrueKeyword || node.kind === Syntax.FalseKeyword) {
      return check.expression(node);
    }
    return;
  }
  function getContextFreeTypeOfExpression(node: Expression) {
    const links = getNodeLinks(node);
    if (links.contextFreeType) return links.contextFreeType;
    const saveContextualType = node.contextualType;
    node.contextualType = anyType;
    try {
      const type = (links.contextFreeType = check.expression(node, CheckMode.SkipContextSensitive));
      return type;
    } finally {
      node.contextualType = saveContextualType;
    }
  }
  function getTypePredicateParent(node: Node): SignatureDeclaration | undefined {
    switch (node.parent.kind) {
      case Syntax.ArrowFunction:
      case Syntax.CallSignature:
      case Syntax.FunctionDeclaration:
      case Syntax.FunctionExpression:
      case Syntax.FunctionType:
      case Syntax.MethodDeclaration:
      case Syntax.MethodSignature:
        const parent = <SignatureDeclaration>node.parent;
        if (node === parent.type) return parent;
    }
  }
  function getEffectiveTypeArguments(node: TypeReferenceNode | ExpressionWithTypeArguments, typeParameters: readonly TypeParameter[]): Type[] {
    return fillMissingTypeArguments(map(node.typeArguments!, getTypeFromTypeNode), typeParameters, getMinTypeArgumentCount(typeParameters), is.inJSFile(node));
  }
  function getTypeParametersForTypeReference(node: TypeReferenceNode | ExpressionWithTypeArguments) {
    const type = getTypeFromTypeReference(node);
    if (type !== errorType) {
      const symbol = getNodeLinks(node).resolvedSymbol;
      if (symbol) {
        return (
          (symbol.flags & qt.SymbolFlags.TypeAlias && s.getLinks(symbol).typeParameters) || (getObjectFlags(type) & ObjectFlags.Reference ? (<TypeReference>type).target.localTypeParameters : undefined)
        );
      }
    }
    return;
  }
  function getTypeArgumentConstraint(node: TypeNode): Type | undefined {
    const typeReferenceNode = tryCast(node.parent, isTypeReferenceType);
    if (!typeReferenceNode) return;
    const typeParameters = getTypeParametersForTypeReference(typeReferenceNode)!;
    const constraint = getConstraintOfTypeParameter(typeParameters[typeReferenceNode.typeArguments!.indexOf(node)]);
    return constraint && instantiateType(constraint, createTypeMapper(typeParameters, getEffectiveTypeArguments(typeReferenceNode, typeParameters)));
  }
  function getEffectiveDeclarationFlags(n: Declaration, flagsToCheck: ModifierFlags): ModifierFlags {
    let flags = get.combinedModifierFlags(n);
    if (n.parent.kind !== Syntax.InterfaceDeclaration && n.parent.kind !== Syntax.ClassDeclaration && n.parent.kind !== Syntax.ClassExpression && n.flags & NodeFlags.Ambient) {
      if (!(flags & ModifierFlags.Ambient) && !(is.kind(qc.ModuleBlock, n.parent) && is.kind(qc.ModuleDeclaration, n.parent.parent) && isGlobalScopeAugmentation(n.parent.parent)))
        flags |= ModifierFlags.Export;
      flags |= ModifierFlags.Ambient;
    }
    return flags & flagsToCheck;
  }
  function getAwaitedTypeOfPromise(type: Type, errorNode?: Node, diagnosticMessage?: qd.Message, arg0?: string | number): Type | undefined {
    const promisedType = getPromisedTypeOfPromise(type, errorNode);
    return promisedType && getAwaitedType(promisedType, errorNode, diagnosticMessage, arg0);
  }
  function getPromisedTypeOfPromise(type: Type, errorNode?: Node): Type | undefined {
    if (isTypeAny(type)) return;
    const typeAsPromise = <PromiseOrAwaitableType>type;
    if (typeAsPromise.promisedTypeOfPromise) return typeAsPromise.promisedTypeOfPromise;
    if (isReferenceToType(type, getGlobalPromiseType(false))) return (typeAsPromise.promisedTypeOfPromise = getTypeArguments(<GenericType>type)[0]);
    const thenFunction = getTypeOfPropertyOfType(type, 'then' as qb.__String)!;
    if (isTypeAny(thenFunction)) return;
    const thenSignatures = thenFunction ? getSignaturesOfType(thenFunction, SignatureKind.Call) : empty;
    if (thenSignatures.length === 0) {
      if (errorNode) error(errorNode, qd.msgs.A_promise_must_have_a_then_method);
      return;
    }
    const onfulfilledParameterType = getTypeWithFacts(getUnionType(map(thenSignatures, getTypeOfFirstParameterOfSignature)), TypeFacts.NEUndefinedOrNull);
    if (isTypeAny(onfulfilledParameterType)) return;
    const onfulfilledParameterSignatures = getSignaturesOfType(onfulfilledParameterType, SignatureKind.Call);
    if (onfulfilledParameterSignatures.length === 0) {
      if (errorNode) error(errorNode, qd.msgs.The_first_parameter_of_the_then_method_of_a_promise_must_be_a_callback);
      return;
    }
    return (typeAsPromise.promisedTypeOfPromise = getUnionType(map(onfulfilledParameterSignatures, getTypeOfFirstParameterOfSignature), UnionReduction.Subtype));
  }
  function getAwaitedType(type: Type, errorNode?: Node, diagnosticMessage?: qd.Message, arg0?: string | number): Type | undefined {
    if (isTypeAny(type)) return type;
    const typeAsAwaitable = <PromiseOrAwaitableType>type;
    if (typeAsAwaitable.awaitedTypeOfType) return typeAsAwaitable.awaitedTypeOfType;
    return (typeAsAwaitable.awaitedTypeOfType = mapType(type, errorNode ? (constituentType) => getAwaitedTypeWorker(constituentType, errorNode, diagnosticMessage, arg0) : getAwaitedTypeWorker));
  }
  function getAwaitedTypeWorker(type: Type, errorNode?: Node, diagnosticMessage?: qd.Message, arg0?: string | number): Type | undefined {
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
        if (!diagnosticMessage) return qb.fail();
        error(errorNode, diagnosticMessage, arg0);
      }
      return;
    }
    return (typeAsAwaitable.awaitedTypeOfType = type);
  }
  function getEntityNameForDecoratorMetadata(node: TypeNode | undefined): EntityName | undefined {
    if (node) {
      switch (node.kind) {
        case Syntax.IntersectionType:
        case Syntax.UnionType:
          return getEntityNameForDecoratorMetadataFromTypeList((<UnionOrIntersectionTypeNode>node).types);
        case Syntax.ConditionalType:
          return getEntityNameForDecoratorMetadataFromTypeList([(<ConditionalTypeNode>node).trueType, (<ConditionalTypeNode>node).falseType]);
        case Syntax.ParenthesizedType:
        case Syntax.NamedTupleMember:
          return getEntityNameForDecoratorMetadata((<ParenthesizedTypeNode>node).type);
        case Syntax.TypeReference:
          return (<TypeReferenceNode>node).typeName;
      }
    }
  }
  function getEntityNameForDecoratorMetadataFromTypeList(types: readonly TypeNode[]): EntityName | undefined {
    let commonEntityName: EntityName | undefined;
    for (let typeNode of types) {
      while (typeNode.kind === Syntax.ParenthesizedType || typeNode.kind === Syntax.NamedTupleMember) {
        typeNode = (typeNode as ParenthesizedTypeNode | NamedTupleMember).type;
      }
      if (typeNode.kind === Syntax.NeverKeyword) continue;
      if (!strictNullChecks && (typeNode.kind === Syntax.NullKeyword || typeNode.kind === Syntax.UndefinedKeyword)) continue;
      const individualEntityName = getEntityNameForDecoratorMetadata(typeNode);
      if (!individualEntityName) return;
      if (commonEntityName) {
        if (!is.kind(qc.Identifier, commonEntityName) || !is.kind(qc.Identifier, individualEntityName) || commonEntityName.escapedText !== individualEntityName.escapedText) return;
      } else {
        commonEntityName = individualEntityName;
      }
    }
    return commonEntityName;
  }
  function getParameterTypeNodeForDecoratorCheck(node: ParameterDeclaration): TypeNode | undefined {
    const typeNode = get.effectiveTypeAnnotationNode(node);
    return is.restParameter(node) ? getRestParameterElementType(typeNode) : typeNode;
  }
  function getIdentifierFromEntityNameExpression(node: qc.Identifier | PropertyAccessExpression): qc.Identifier | qc.PrivateIdentifier;
  function getIdentifierFromEntityNameExpression(node: Expression): qc.Identifier | qc.PrivateIdentifier | undefined;
  function getIdentifierFromEntityNameExpression(node: Expression): qc.Identifier | qc.PrivateIdentifier | undefined {
    switch (node.kind) {
      case Syntax.Identifier:
        return node as Identifier;
      case Syntax.PropertyAccessExpression:
        return (node as PropertyAccessExpression).name;
      default:
        return;
    }
  }
  function getIteratedTypeOrElementType(use: IterationUse, inputType: Type, sentType: Type, errorNode: Node | undefined, checkAssignability: boolean): Type | undefined {
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
        if (filteredTypes !== arrayTypes) arrayType = getUnionType(filteredTypes, UnionReduction.Subtype);
      } else if (arrayType.flags & qt.TypeFlags.StringLike) {
        arrayType = neverType;
      }
      hasStringConstituent = arrayType !== inputType;
      if (hasStringConstituent) {
        if (arrayType.flags & qt.TypeFlags.Never) return stringType;
      }
    }
    if (!isArrayLikeType(arrayType)) {
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
    const arrayElementType = getIndexTypeOfType(arrayType, IndexKind.Number);
    if (hasStringConstituent && arrayElementType) {
      if (arrayElementType.flags & qt.TypeFlags.StringLike) return stringType;
      return getUnionType([arrayElementType, stringType], UnionReduction.Subtype);
    }
    return arrayElementType;
  }
  function getIterationTypeOfIterable(use: IterationUse, typeKind: IterationTypeKind, inputType: Type, errorNode: Node | undefined): Type | undefined {
    if (isTypeAny(inputType)) return;
    const iterationTypes = getIterationTypesOfIterable(inputType, use, errorNode);
    return iterationTypes && iterationTypes[getIterationTypesKeyFromIterationTypeKind(typeKind)];
  }
  function getCachedIterationTypes(type: Type, cacheKey: MatchingKeys<IterableOrIteratorType, IterationTypes | undefined>) {
    return (type as IterableOrIteratorType)[cacheKey];
  }
  function getIterationTypesOfIterable(type: Type, use: IterationUse, errorNode: Node | undefined) {
    if (isTypeAny(type)) return anyIterationTypes;
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
  function getAsyncFromSyncIterationTypes(iterationTypes: IterationTypes, errorNode: Node | undefined) {
    if (iterationTypes === noIterationTypes) return noIterationTypes;
    if (iterationTypes === anyIterationTypes) return anyIterationTypes;
    const { yieldType, returnType, nextType } = iterationTypes;
    return createIterationTypes(getAwaitedType(yieldType, errorNode) || anyType, getAwaitedType(returnType, errorNode) || anyType, nextType);
  }
  function getIterationTypesOfIterableWorker(type: Type, use: IterationUse, errorNode: Node | undefined) {
    if (isTypeAny(type)) return anyIterationTypes;
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
  function getIterationTypesOfIterableCached(type: Type, resolver: IterationTypesResolver) {
    return getCachedIterationTypes(type, resolver.iterableCacheKey);
  }
  function getIterationTypesOfGlobalIterableType(globalType: Type, resolver: IterationTypesResolver) {
    const globalIterationTypes = getIterationTypesOfIterableCached(globalType, resolver) || getIterationTypesOfIterableSlow(globalType, resolver, undefined);
    return globalIterationTypes === noIterationTypes ? defaultIterationTypes : globalIterationTypes;
  }
  function getIterationTypesOfIterableFast(type: Type, resolver: IterationTypesResolver) {
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
  function getIterationTypesOfIterableSlow(type: Type, resolver: IterationTypesResolver, errorNode: Node | undefined) {
    const method = getPropertyOfType(type, getPropertyNameForKnownSymbolName(resolver.iteratorSymbolName));
    const methodType = method && !(method.flags & qt.SymbolFlags.Optional) ? getTypeOfSymbol(method) : undefined;
    if (isTypeAny(methodType)) return setCachedIterationTypes(type, resolver.iterableCacheKey, anyIterationTypes);
    const signatures = methodType ? getSignaturesOfType(methodType, SignatureKind.Call) : undefined;
    if (!some(signatures)) return setCachedIterationTypes(type, resolver.iterableCacheKey, noIterationTypes);
    const iteratorType = getUnionType(map(signatures, getReturnTypeOfSignature), UnionReduction.Subtype);
    const iterationTypes = getIterationTypesOfIterator(iteratorType, resolver, errorNode) ?? noIterationTypes;
    return setCachedIterationTypes(type, resolver.iterableCacheKey, iterationTypes);
  }
  function getIterationTypesOfIterator(type: Type, resolver: IterationTypesResolver, errorNode: Node | undefined) {
    if (isTypeAny(type)) return anyIterationTypes;
    const iterationTypes = getIterationTypesOfIteratorCached(type, resolver) || getIterationTypesOfIteratorFast(type, resolver) || getIterationTypesOfIteratorSlow(type, resolver, errorNode);
    return iterationTypes === noIterationTypes ? undefined : iterationTypes;
  }
  function getIterationTypesOfIteratorCached(type: Type, resolver: IterationTypesResolver) {
    return getCachedIterationTypes(type, resolver.iteratorCacheKey);
  }
  function getIterationTypesOfIteratorFast(type: Type, resolver: IterationTypesResolver) {
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
  function getIterationTypesOfIteratorResult(type: Type) {
    if (isTypeAny(type)) return anyIterationTypes;
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
    const yieldType = yieldIteratorResult !== neverType ? getTypeOfPropertyOfType(yieldIteratorResult, 'value' as qb.__String) : undefined;
    const returnIteratorResult = filterType(type, isReturnIteratorResult);
    const returnType = returnIteratorResult !== neverType ? getTypeOfPropertyOfType(returnIteratorResult, 'value' as qb.__String) : undefined;
    if (!yieldType && !returnType) return setCachedIterationTypes(type, 'iterationTypesOfIteratorResult', noIterationTypes);
    return setCachedIterationTypes(type, 'iterationTypesOfIteratorResult', createIterationTypes(yieldType, returnType || voidType, undefined));
  }
  function getIterationTypesOfMethod(type: Type, resolver: IterationTypesResolver, methodName: 'next' | 'return' | 'throw', errorNode: Node | undefined): IterationTypes | undefined {
    const method = getPropertyOfType(type, methodName as qb.__String);
    if (!method && methodName !== 'next') return;
    const methodType =
      method && !(methodName === 'next' && method.flags & qt.SymbolFlags.Optional)
        ? methodName === 'next'
          ? getTypeOfSymbol(method)
          : getTypeWithFacts(getTypeOfSymbol(method), TypeFacts.NEUndefinedOrNull)
        : undefined;
    if (isTypeAny(methodType)) return methodName === 'next' ? anyIterationTypes : anyIterationTypesExceptNext;
    const methodSignatures = methodType ? getSignaturesOfType(methodType, SignatureKind.Call) : empty;
    if (methodSignatures.length === 0) {
      if (errorNode) {
        const diagnostic = methodName === 'next' ? resolver.mustHaveANextMethodDiagnostic : resolver.mustBeAMethodDiagnostic;
        error(errorNode, diagnostic, methodName);
      }
      return methodName === 'next' ? anyIterationTypes : undefined;
    }
    let methodParameterTypes: Type[] | undefined;
    let methodReturnTypes: Type[] | undefined;
    for (const signature of methodSignatures) {
      if (methodName !== 'throw' && some(signature.parameters)) methodParameterTypes = append(methodParameterTypes, getTypeAtPosition(signature, 0));
      methodReturnTypes = append(methodReturnTypes, getReturnTypeOfSignature(signature));
    }
    let returnTypes: Type[] | undefined;
    let nextType: Type | undefined;
    if (methodName !== 'throw') {
      const methodParameterType = methodParameterTypes ? getUnionType(methodParameterTypes) : unknownType;
      if (methodName === 'next') nextType = methodParameterType;
      else if (methodName === 'return') {
        const resolvedMethodParameterType = resolver.resolveIterationType(methodParameterType, errorNode) || anyType;
        returnTypes = append(returnTypes, resolvedMethodParameterType);
      }
    }
    let yieldType: Type;
    const methodReturnType = methodReturnTypes ? getUnionType(methodReturnTypes, UnionReduction.Subtype) : neverType;
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
    return createIterationTypes(yieldType, getUnionType(returnTypes), nextType);
  }
  function getIterationTypesOfIteratorSlow(type: Type, resolver: IterationTypesResolver, errorNode: Node | undefined) {
    const iterationTypes = combineIterationTypes([
      getIterationTypesOfMethod(type, resolver, 'next', errorNode),
      getIterationTypesOfMethod(type, resolver, 'return', errorNode),
      getIterationTypesOfMethod(type, resolver, 'throw', errorNode),
    ]);
    return setCachedIterationTypes(type, resolver.iteratorCacheKey, iterationTypes);
  }
  function getIterationTypeOfGeneratorFunctionReturnType(kind: IterationTypeKind, returnType: Type, isAsyncGenerator: boolean): Type | undefined {
    if (isTypeAny(returnType)) return;
    const iterationTypes = getIterationTypesOfGeneratorFunctionReturnType(returnType, isAsyncGenerator);
    return iterationTypes && iterationTypes[getIterationTypesKeyFromIterationTypeKind(kind)];
  }
  function getIterationTypesOfGeneratorFunctionReturnType(type: Type, isAsyncGenerator: boolean) {
    if (isTypeAny(type)) return anyIterationTypes;
    const use = isAsyncGenerator ? IterationUse.AsyncGeneratorReturnType : IterationUse.GeneratorReturnType;
    const resolver = isAsyncGenerator ? asyncIterationTypesResolver : syncIterationTypesResolver;
    return getIterationTypesOfIterable(type, use, undefined) || getIterationTypesOfIterator(type, resolver, undefined);
  }
  function getNonInterhitedProperties(type: InterfaceType, baseTypes: BaseType[], properties: Symbol[]) {
    if (!length(baseTypes)) return properties;
    const seen = qb.createEscapedMap<Symbol>();
    forEach(properties, (p) => {
      seen.set(p.escName, p);
    });
    for (const base of baseTypes) {
      const properties = getPropertiesOfType(getTypeWithThisArgument(base, type.thisType));
      for (const prop of properties) {
        const existing = seen.get(prop.escName);
        if (existing && !isPropertyIdenticalTo(existing, prop)) seen.delete(prop.escName);
      }
    }
    return arrayFrom(seen.values());
  }
  function getFirstNonModuleExportsIdentifier(node: EntityNameOrEntityNameExpression): qc.Identifier {
    switch (node.kind) {
      case Syntax.Identifier:
        return node;
      case Syntax.QualifiedName:
        do {
          node = node.left;
        } while (node.kind !== Syntax.Identifier);
        return node;
      case Syntax.PropertyAccessExpression:
        do {
          if (is.moduleExportsAccessExpression(node.expression) && !is.kind(qc.PrivateIdentifier, node.name)) return node.name;
          node = node.expression;
        } while (node.kind !== Syntax.Identifier);
        return node;
    }
  }
  function getTypeFromDocVariadicType(node: DocVariadicType): Type {
    const type = getTypeFromTypeNode(node.type);
    const { parent } = node;
    const paramTag = node.parent.parent;
    if (is.kind(qc.DocTypeExpression, node.parent) && is.kind(qc.DocParameterTag, paramTag)) {
      const host = get.hostSignatureFromDoc(paramTag);
      if (host) {
        const lastParamDeclaration = lastOrUndefined(host.parameters);
        const symbol = getParameterSymbolFromDoc(paramTag);
        if (!lastParamDeclaration || (symbol && lastParamDeclaration.symbol === symbol && is.restParameter(lastParamDeclaration))) return createArrayType(type);
      }
    }
    if (is.kind(qc.ParameterDeclaration, parent) && is.kind(qc.DocFunctionType, parent.parent)) return createArrayType(type);
    return addOptionality(type);
  }
  function getPotentiallyUnusedIdentifiers(sourceFile: SourceFile): readonly PotentiallyUnusedIdentifier[] {
    return allPotentiallyUnusedIdentifiers.get(sourceFile.path) || empty;
  }
  function getDiagnostics(sourceFile: SourceFile, ct: CancellationToken): qd.Diagnostic[] {
    try {
      cancellationToken = ct;
      return getDiagnosticsWorker(sourceFile);
    } finally {
      cancellationToken = undefined;
    }
  }
  function getDiagnosticsWorker(sourceFile: SourceFile): qd.Diagnostic[] {
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
  function getGlobalDiagnostics(): qd.Diagnostic[] {
    throwIfNonDiagnosticsProducing();
    return diagnostics.getGlobalDiagnostics();
  }
  function getSymbolsInScope(location: Node, meaning: qt.SymbolFlags): Symbol[] {
    if (location.flags & NodeFlags.InWithStatement) return [];
    const symbols = new SymbolTable();
    let isStatic = false;
    populateSymbols();
    symbols.delete(InternalSymbol.This);
    return symbolsToArray(symbols);
    function populateSymbols() {
      while (location) {
        if (location.locals && !isGlobalSourceFile(location)) location.locals.copy(symbols, meaning);
        switch (location.kind) {
          case Syntax.SourceFile:
            if (!is.externalOrCommonJsModule(<SourceFile>location)) break;
          case Syntax.ModuleDeclaration:
            getSymbolOfNode(location as ModuleDeclaration | SourceFile).exports!.copy(symbols, meaning & qt.SymbolFlags.ModuleMember);
            break;
          case Syntax.EnumDeclaration:
            getSymbolOfNode(location as EnumDeclaration).exports!.copy(symbols, meaning & qt.SymbolFlags.EnumMember);
            break;
          case Syntax.ClassExpression:
            const className = (location as ClassExpression).name;
            if (className) copySymbol(location.symbol, symbols, meaning);
          case Syntax.ClassDeclaration:
          case Syntax.InterfaceDeclaration:
            if (!isStatic) getMembersOfSymbol(getSymbolOfNode(location as ClassDeclaration | InterfaceDeclaration)).copy(symbols, meaning & qt.SymbolFlags.Type);
            break;
          case Syntax.FunctionExpression:
            const funcName = (location as FunctionExpression).name;
            if (funcName) copySymbol(location.symbol, symbols, meaning);
            break;
        }
        if (introducesArgumentsExoticObject(location)) copySymbol(argumentsSymbol, symbols, meaning);
        isStatic = has.syntacticModifier(location, ModifierFlags.Static);
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
  function getLeftSideOfImportEqualsOrExportAssignment(nodeOnRightSide: EntityName): ImportEqualsDeclaration | ExportAssignment | undefined {
    while (nodeOnRightSide.parent.kind === Syntax.QualifiedName) {
      nodeOnRightSide = <QualifiedName>nodeOnRightSide.parent;
    }
    if (nodeOnRightSide.parent.kind === Syntax.ImportEqualsDeclaration)
      return (<ImportEqualsDeclaration>nodeOnRightSide.parent).moduleReference === nodeOnRightSide ? <ImportEqualsDeclaration>nodeOnRightSide.parent : undefined;
    if (nodeOnRightSide.parent.kind === Syntax.ExportAssignment)
      return (<ExportAssignment>nodeOnRightSide.parent).expression === <Node>nodeOnRightSide ? <ExportAssignment>nodeOnRightSide.parent : undefined;
    return;
  }
  function getSpecialPropertyAssignmentSymbolFromEntityName(entityName: EntityName | PropertyAccessExpression) {
    const specialPropertyAssignmentKind = getAssignmentDeclarationKind(entityName.parent.parent as BinaryExpression);
    switch (specialPropertyAssignmentKind) {
      case AssignmentDeclarationKind.ExportsProperty:
      case AssignmentDeclarationKind.PrototypeProperty:
        return getSymbolOfNode(entityName.parent);
      case AssignmentDeclarationKind.ThisProperty:
      case AssignmentDeclarationKind.ModuleExports:
      case AssignmentDeclarationKind.Property:
        return getSymbolOfNode(entityName.parent.parent);
    }
  }
  function getSymbolOfNameOrPropertyAccessExpression(name: EntityName | qc.PrivateIdentifier | PropertyAccessExpression): Symbol | undefined {
    if (is.declarationName(name)) return getSymbolOfNode(name.parent);
    if (is.inJSFile(name) && name.parent.kind === Syntax.PropertyAccessExpression && name.parent === (name.parent.parent as BinaryExpression).left) {
      if (!is.kind(qc.PrivateIdentifier, name)) {
        const specialPropertyAssignmentSymbol = getSpecialPropertyAssignmentSymbolFromEntityName(name);
        if (specialPropertyAssignmentSymbol) return specialPropertyAssignmentSymbol;
      }
    }
    if (name.parent.kind === Syntax.ExportAssignment && is.entityNameExpression(name)) {
      const success = resolveEntityName(name, qt.SymbolFlags.Value | qt.SymbolFlags.Type | qt.SymbolFlags.Namespace | qt.SymbolFlags.Alias, true);
      if (success && success !== unknownSymbol) return success;
    } else if (!is.kind(qc.PropertyAccessExpression, name) && !is.kind(qc.PrivateIdentifier, name) && isInRightSideOfImportOrExportAssignment(name)) {
      const importEqualsDeclaration = get.ancestor(name, Syntax.ImportEqualsDeclaration);
      assert(importEqualsDeclaration !== undefined);
      return getSymbolOfPartOfRightHandSideOfImportEquals(name, true);
    }
    if (!is.kind(qc.PropertyAccessExpression, name) && !is.kind(qc.PrivateIdentifier, name)) {
      const possibleImportNode = isImportTypeQualifierPart(name);
      if (possibleImportNode) {
        getTypeFromTypeNode(possibleImportNode);
        const sym = getNodeLinks(name).resolvedSymbol;
        return sym === unknownSymbol ? undefined : sym;
      }
    }
    while (is.rightSideOfQualifiedNameOrPropertyAccess(name)) {
      name = <QualifiedName | PropertyAccessEntityNameExpression>name.parent;
    }
    if (isHeritageClauseElementIdentifier(name)) {
      let meaning = qt.SymbolFlags.None;
      if (name.parent.kind === Syntax.ExpressionWithTypeArguments) {
        meaning = qt.SymbolFlags.Type;
        if (is.expressionWithTypeArgumentsInClassExtendsClause(name.parent)) meaning |= qt.SymbolFlags.Value;
      } else {
        meaning = qt.SymbolFlags.Namespace;
      }
      meaning |= qt.SymbolFlags.Alias;
      const entityNameSymbol = is.entityNameExpression(name) ? resolveEntityName(name, meaning) : undefined;
      if (entityNameSymbol) return entityNameSymbol;
    }
    if (name.parent.kind === Syntax.DocParameterTag) return getParameterSymbolFromDoc(name.parent as DocParameterTag);
    if (name.parent.kind === Syntax.TypeParameter && name.parent.parent.kind === Syntax.DocTemplateTag) {
      assert(!is.inJSFile(name));
      const typeParameter = getTypeParameterFromDoc(name.parent as TypeParameterDeclaration & { parent: DocTemplateTag });
      return typeParameter && typeParameter.symbol;
    }
    if (is.expressionNode(name)) {
      if (is.missing(name)) return;
      if (name.kind === Syntax.Identifier) {
        if (qc.isJsx.tagName(name) && isJsxIntrinsicIdentifier(name)) {
          const symbol = getIntrinsicTagSymbol(<JsxOpeningLikeElement>name.parent);
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
      const meaning = name.parent.kind === Syntax.TypeReference ? qt.SymbolFlags.Type : qt.SymbolFlags.Namespace;
      return resolveEntityName(<EntityName>name, meaning, false, true);
    }
    if (name.parent.kind === Syntax.TypePredicate) return resolveEntityName(<Identifier>name, qt.SymbolFlags.FunctionScopedVariable);
    return;
  }
  function getSymbolAtLocation(node: Node, ignoreErrors?: boolean): Symbol | undefined {
    if (node.kind === Syntax.SourceFile) return is.externalModule(<SourceFile>node) ? getMergedSymbol(node.symbol) : undefined;
    const { parent } = node;
    const grandParent = parent.parent;
    if (node.flags & NodeFlags.InWithStatement) return;
    if (is.declarationNameOrImportPropertyName(node)) {
      const parentSymbol = getSymbolOfNode(parent)!;
      return is.importOrExportSpecifier(node.parent) && node.parent.propertyName === node ? getImmediateAliasedSymbol(parentSymbol) : parentSymbol;
    } else if (is.literalComputedPropertyDeclarationName(node)) {
      return getSymbolOfNode(parent.parent);
    }
    if (node.kind === Syntax.Identifier) {
      if (isInRightSideOfImportOrExportAssignment(<Identifier>node)) return getSymbolOfNameOrPropertyAccessExpression(<Identifier>node);
      else if (parent.kind === Syntax.BindingElement && grandParent.kind === Syntax.ObjectBindingPattern && node === (<BindingElement>parent).propertyName) {
        const typeOfPattern = getTypeOfNode(grandParent);
        const propertyDeclaration = getPropertyOfType(typeOfPattern, (<Identifier>node).escapedText);
        if (propertyDeclaration) return propertyDeclaration;
      }
    }
    switch (node.kind) {
      case Syntax.Identifier:
      case Syntax.PrivateIdentifier:
      case Syntax.PropertyAccessExpression:
      case Syntax.QualifiedName:
        return getSymbolOfNameOrPropertyAccessExpression(<EntityName | qc.PrivateIdentifier | PropertyAccessExpression>node);
      case Syntax.ThisKeyword:
        const container = get.thisContainer(node, false);
        if (is.functionLike(container)) {
          const sig = getSignatureFromDeclaration(container);
          if (sig.thisParameter) return sig.thisParameter;
        }
        if (is.inExpressionContext(node)) return check.expression(node as Expression).symbol;
      case Syntax.ThisType:
        return getTypeFromThisNodeTypeNode(node as ThisExpression | ThisTypeNode).symbol;
      case Syntax.SuperKeyword:
        return check.expression(node as Expression).symbol;
      case Syntax.ConstructorKeyword:
        const constructorDeclaration = node.parent;
        if (constructorDeclaration && constructorDeclaration.kind === Syntax.Constructor) return (<ClassDeclaration>constructorDeclaration.parent).symbol;
        return;
      case Syntax.StringLiteral:
      case Syntax.NoSubstitutionLiteral:
        if (
          (is.externalModuleImportEqualsDeclaration(node.parent.parent) && get.externalModuleImportEqualsDeclarationExpression(node.parent.parent) === node) ||
          ((node.parent.kind === Syntax.ImportDeclaration || node.parent.kind === Syntax.ExportDeclaration) && (<ImportDeclaration>node.parent).moduleSpecifier === node) ||
          (is.inJSFile(node) && isRequireCall(node.parent, false)) ||
          is.importCall(node.parent) ||
          (is.kind(qc.LiteralTypeNode, node.parent) && is.literalImportTypeNode(node.parent.parent) && node.parent.parent.argument === node.parent)
        ) {
          return resolveExternalModuleName(node, <LiteralExpression>node, ignoreErrors);
        }
        if (is.kind(qc.CallExpression, parent) && isBindableObjectDefinePropertyCall(parent) && parent.arguments[1] === node) return getSymbolOfNode(parent);
      case Syntax.NumericLiteral:
        const objectType = is.kind(qc.ElementAccessExpression, parent)
          ? parent.argumentExpression === node
            ? getTypeOfExpression(parent.expression)
            : undefined
          : is.kind(qc.LiteralTypeNode, parent) && is.kind(qc.IndexedAccessTypeNode, grandParent)
          ? getTypeFromTypeNode(grandParent.objectType)
          : undefined;
        return objectType && getPropertyOfType(objectType, qy.get.escUnderscores((node as StringLiteral | NumericLiteral).text));
      case Syntax.DefaultKeyword:
      case Syntax.FunctionKeyword:
      case Syntax.EqualsGreaterThanToken:
      case Syntax.ClassKeyword:
        return getSymbolOfNode(node.parent);
      case Syntax.ImportType:
        return is.literalImportTypeNode(node) ? getSymbolAtLocation(node.argument.literal, ignoreErrors) : undefined;
      case Syntax.ExportKeyword:
        return is.kind(qc.ExportAssignment, node.parent) ? Debug.check.defined(node.parent.symbol) : undefined;
      default:
        return;
    }
  }
  function getShorthandAssignmentValueSymbol(location: Node): Symbol | undefined {
    if (location && location.kind === Syntax.ShorthandPropertyAssignment) return resolveEntityName((<ShorthandPropertyAssignment>location).name, qt.SymbolFlags.Value | qt.SymbolFlags.Alias);
    return;
  }
  function getExportSpecifierLocalTargetSymbol(node: ExportSpecifier): Symbol | undefined {
    return node.parent.parent.moduleSpecifier
      ? getExternalModuleMember(node.parent.parent, node)
      : resolveEntityName(node.propertyName || node.name, qt.SymbolFlags.Value | qt.SymbolFlags.Type | qt.SymbolFlags.Namespace | qt.SymbolFlags.Alias);
  }
  function getTypeOfNode(node: Node): Type {
    if (node.flags & NodeFlags.InWithStatement) return errorType;
    const classDecl = tryGetClassImplementingOrExtendingExpressionWithTypeArguments(node);
    const classType = classDecl && getDeclaredTypeOfClassOrInterface(getSymbolOfNode(classDecl.class));
    if (is.partOfTypeNode(node)) {
      const typeFromTypeNode = getTypeFromTypeNode(<TypeNode>node);
      return classType ? getTypeWithThisArgument(typeFromTypeNode, classType.thisType) : typeFromTypeNode;
    }
    if (is.expressionNode(node)) return getRegularTypeOfExpression(<Expression>node);
    if (classType && !classDecl!.isImplements) {
      const baseType = firstOrUndefined(getBaseTypes(classType));
      return baseType ? getTypeWithThisArgument(baseType, classType.thisType) : errorType;
    }
    if (isTypeDeclaration(node)) {
      const symbol = getSymbolOfNode(node);
      return getDeclaredTypeOfSymbol(symbol);
    }
    if (isTypeDeclarationName(node)) {
      const symbol = getSymbolAtLocation(node);
      return symbol ? getDeclaredTypeOfSymbol(symbol) : errorType;
    }
    if (is.declaration(node)) {
      const symbol = getSymbolOfNode(node);
      return this.getTypeOfSymbol();
    }
    if (is.declarationNameOrImportPropertyName(node)) {
      const symbol = getSymbolAtLocation(node);
      if (symbol) return this.getTypeOfSymbol();
      return errorType;
    }
    if (is.kind(qc.BindingPattern, node)) return getTypeForVariableLikeDeclaration(node.parent, true) || errorType;
    if (isInRightSideOfImportOrExportAssignment(<Identifier>node)) {
      const symbol = getSymbolAtLocation(node);
      if (symbol) {
        const declaredType = getDeclaredTypeOfSymbol(symbol);
        return declaredType !== errorType ? declaredType : this.getTypeOfSymbol();
      }
    }
    return errorType;
  }
  function getTypeOfAssignmentPattern(expr: AssignmentPattern): Type | undefined {
    assert(expr.kind === Syntax.ObjectLiteralExpression || expr.kind === Syntax.ArrayLiteralExpression);
    if (expr.parent.kind === Syntax.ForOfStatement) {
      const iteratedType = check.rightHandSideOfForOf(<ForOfStatement>expr.parent);
      return check.destructuringAssignment(expr, iteratedType || errorType);
    }
    if (expr.parent.kind === Syntax.BinaryExpression) {
      const iteratedType = getTypeOfExpression((<BinaryExpression>expr.parent).right);
      return check.destructuringAssignment(expr, iteratedType || errorType);
    }
    if (expr.parent.kind === Syntax.PropertyAssignment) {
      const node = cast(expr.parent.parent, isObjectLiteralExpression);
      const typeOfParentObjectLiteral = getTypeOfAssignmentPattern(node) || errorType;
      const propertyIndex = indexOfNode(node.properties, expr.parent);
      return check.objectLiteralDestructuringPropertyAssignment(node, typeOfParentObjectLiteral, propertyIndex);
    }
    const node = cast(expr.parent, isArrayLiteralExpression);
    const typeOfArrayLiteral = getTypeOfAssignmentPattern(node) || errorType;
    const elementType = check.iteratedTypeOrElementType(IterationUse.Destructuring, typeOfArrayLiteral, undefinedType, expr.parent) || errorType;
    return check.arrayLiteralDestructuringElementAssignment(node, typeOfArrayLiteral, node.elements.indexOf(expr), elementType);
  }
  function getPropertySymbolOfDestructuringAssignment(location: Identifier) {
    const typeOfObjectLiteral = getTypeOfAssignmentPattern(cast(location.parent.parent, isAssignmentPattern));
    return typeOfObjectLiteral && getPropertyOfType(typeOfObjectLiteral, location.escapedText);
  }
  function getRegularTypeOfExpression(expr: Expression): Type {
    if (is.rightSideOfQualifiedNameOrPropertyAccess(expr)) expr = <Expression>expr.parent;
    return getRegularTypeOfLiteralType(getTypeOfExpression(expr));
  }
  function getParentTypeOfClassElement(node: ClassElement) {
    const classSymbol = getSymbolOfNode(node.parent)!;
    return has.syntacticModifier(node, ModifierFlags.Static) ? getTypeOfSymbol(classSymbol) : getDeclaredTypeOfSymbol(classSymbol);
  }
  function getClassElementPropertyKeyType(element: ClassElement) {
    const name = element.name!;
    switch (name.kind) {
      case Syntax.Identifier:
        return getLiteralType(idText(name));
      case Syntax.NumericLiteral:
      case Syntax.StringLiteral:
        return getLiteralType(name.text);
      case Syntax.ComputedPropertyName:
        const nameType = check.computedPropertyName(name);
        return isTypeAssignableToKind(nameType, qt.TypeFlags.ESSymbolLike) ? nameType : stringType;
      default:
        return qb.fail('Unsupported property name.');
    }
  }
  function getAugmentedPropertiesOfType(type: Type): Symbol[] {
    type = getApparentType(type);
    const propsByName = new SymbolTable(getPropertiesOfType(type));
    const functionType = getSignaturesOfType(type, SignatureKind.Call).length
      ? globalCallableFunctionType
      : getSignaturesOfType(type, SignatureKind.Construct).length
      ? globalNewableFunctionType
      : undefined;
    if (functionType) {
      forEach(getPropertiesOfType(functionType), (p) => {
        if (!propsByName.has(p.escName)) propsByName.set(p.escName, p);
      });
    }
    return getNamedMembers(propsByName);
  }
  function getReferencedExportContainer(nodeIn: Identifier, prefixLocals?: boolean): SourceFile | ModuleDeclaration | EnumDeclaration | undefined {
    const node = get.parseTreeOf(nodeIn, isIdentifier);
    if (node) {
      let symbol = getReferencedValueSymbol(node, isNameOfModuleOrEnumDeclaration(node));
      if (symbol) {
        if (symbol.flags & qt.SymbolFlags.ExportValue) {
          const exportSymbol = getMergedSymbol(symbol.exportSymbol!);
          if (!prefixLocals && exportSymbol.flags & qt.SymbolFlags.ExportHasLocal && !(exportSymbol.flags & qt.SymbolFlags.Variable)) return;
          symbol = exportSymbol;
        }
        const parentSymbol = getParentOfSymbol(symbol);
        if (parentSymbol) {
          if (parentSymbol.flags & qt.SymbolFlags.ValueModule && parentSymbol.valueDeclaration.kind === Syntax.SourceFile) {
            const symbolFile = <SourceFile>parentSymbol.valueDeclaration;
            const referenceFile = get.sourceFileOf(node);
            const symbolIsUmdExport = symbolFile !== referenceFile;
            return symbolIsUmdExport ? undefined : symbolFile;
          }
          return qc.findAncestor(node.parent, (n): n is ModuleDeclaration | EnumDeclaration => is.moduleOrEnumDeclaration(n) && getSymbolOfNode(n) === parentSymbol);
        }
      }
    }
  }
  function getReferencedImportDeclaration(nodeIn: Identifier): Declaration | undefined {
    const node = get.parseTreeOf(nodeIn, isIdentifier);
    if (node) {
      const symbol = getReferencedValueSymbol(node);
      if (symbol.isNonLocalAlias(SymbolFlags.Value) && !this.getTypeOnlyAliasDeclaration()) return symbol.getDeclarationOfAliasSymbol();
    }
    return;
  }
  function getReferencedDeclarationWithCollidingName(nodeIn: Identifier): Declaration | undefined {
    if (!is.generatedIdentifier(nodeIn)) {
      const node = get.parseTreeOf(nodeIn, isIdentifier);
      if (node) {
        const symbol = getReferencedValueSymbol(node);
        if (symbol && isSymbolOfDeclarationWithCollidingName(symbol)) return symbol.valueDeclaration;
      }
    }
    return;
  }
  function getPropertiesOfContainerFunction(node: Declaration): Symbol[] {
    const declaration = get.parseTreeOf(node, isFunctionDeclaration);
    if (!declaration) return empty;
    const symbol = getSymbolOfNode(declaration);
    return (symbol && getPropertiesOfType(this.getTypeOfSymbol())) || empty;
  }
  function getNodeCheckFlags(node: Node): NodeCheckFlags {
    return getNodeLinks(node).flags || 0;
  }
  function getEnumMemberValue(node: EnumMember): string | number | undefined {
    computeEnumMemberValues(node.parent);
    return getNodeLinks(node).enumMemberValue;
  }
  function getConstantValue(node: EnumMember | AccessExpression): string | number | undefined {
    if (node.kind === Syntax.EnumMember) return getEnumMemberValue(node);
    const symbol = getNodeLinks(node).resolvedSymbol;
    if (symbol && symbol.flags & qt.SymbolFlags.EnumMember) {
      const member = symbol.valueDeclaration as EnumMember;
      if (is.enumConst(member.parent)) return getEnumMemberValue(member);
    }
    return;
  }
  function getTypeReferenceSerializationKind(typeNameIn: EntityName, location?: Node): TypeReferenceSerializationKind {
    const typeName = get.parseTreeOf(typeNameIn, isEntityName);
    if (!typeName) return TypeReferenceSerializationKind.Unknown;
    if (location) {
      location = get.parseTreeOf(location);
      if (!location) return TypeReferenceSerializationKind.Unknown;
    }
    const valueSymbol = resolveEntityName(typeName, qt.SymbolFlags.Value, true, false, location);
    const typeSymbol = resolveEntityName(typeName, qt.SymbolFlags.Type, true, false, location);
    if (valueSymbol && valueSymbol === typeSymbol) {
      const globalPromiseSymbol = getGlobalPromiseConstructorSymbol(false);
      if (globalPromiseSymbol && valueSymbol === globalPromiseSymbol) return TypeReferenceSerializationKind.Promise;
      const constructorType = getTypeOfSymbol(valueSymbol);
      if (constructorType && isConstructorType(constructorType)) return TypeReferenceSerializationKind.TypeWithConstructSignatureAndValue;
    }
    if (!typeSymbol) return TypeReferenceSerializationKind.Unknown;
    const type = getDeclaredTypeOfSymbol(typeSymbol);
    if (type === errorType) return TypeReferenceSerializationKind.Unknown;
    if (type.flags & qt.TypeFlags.AnyOrUnknown) return TypeReferenceSerializationKind.ObjectType;
    if (isTypeAssignableToKind(type, qt.TypeFlags.Void | qt.TypeFlags.Nullable | qt.TypeFlags.Never)) return TypeReferenceSerializationKind.VoidNullableOrNeverType;
    if (isTypeAssignableToKind(type, qt.TypeFlags.BooleanLike)) return TypeReferenceSerializationKind.BooleanType;
    if (isTypeAssignableToKind(type, qt.TypeFlags.NumberLike)) return TypeReferenceSerializationKind.NumberLikeType;
    if (isTypeAssignableToKind(type, qt.TypeFlags.BigIntLike)) return TypeReferenceSerializationKind.BigIntLikeType;
    if (isTypeAssignableToKind(type, qt.TypeFlags.StringLike)) return TypeReferenceSerializationKind.StringLikeType;
    if (isTupleType(type)) return TypeReferenceSerializationKind.ArrayLikeType;
    if (isTypeAssignableToKind(type, qt.TypeFlags.ESSymbolLike)) return TypeReferenceSerializationKind.ESSymbolType;
    if (isFunctionType(type)) return TypeReferenceSerializationKind.TypeWithCallSignature;
    if (isArrayType(type)) return TypeReferenceSerializationKind.ArrayLikeType;
    return TypeReferenceSerializationKind.ObjectType;
  }
  function getReferencedValueSymbol(reference: Identifier, startInDeclarationContainer?: boolean): Symbol | undefined {
    const resolvedSymbol = getNodeLinks(reference).resolvedSymbol;
    if (resolvedSymbol) return resolvedSymbol;
    let location: Node = reference;
    if (startInDeclarationContainer) {
      const parent = reference.parent;
      if (is.declaration(parent) && reference === parent.name) location = getDeclarationContainer(parent);
    }
    return resolveName(location, reference.escapedText, qt.SymbolFlags.Value | qt.SymbolFlags.ExportValue | qt.SymbolFlags.Alias, undefined, undefined, true);
  }
  function getReferencedValueDeclaration(referenceIn: Identifier): Declaration | undefined {
    if (!is.generatedIdentifier(referenceIn)) {
      const reference = get.parseTreeOf(referenceIn, isIdentifier);
      if (reference) {
        const symbol = getReferencedValueSymbol(reference);
        if (symbol) return getExportSymbolOfValueSymbolIfExported(symbol).valueDeclaration;
      }
    }
    return;
  }
  function getJsxFactoryEntity(location: Node) {
    return location ? (getJsxNamespace(location), get.sourceFileOf(location).localJsxFactory || _jsxFactoryEntity) : _jsxFactoryEntity;
  }
  function getExternalModuleFileFromDeclaration(declaration: AnyImportOrReExport | ModuleDeclaration | ImportTypeNode): SourceFile | undefined {
    const specifier = declaration.kind === Syntax.ModuleDeclaration ? tryCast(declaration.name, isStringLiteral) : getExternalModuleName(declaration);
    const moduleSymbol = resolveExternalModuleNameWorker(specifier!, specifier!, undefined);
    if (!moduleSymbol) return;
    return getDeclarationOfKind(moduleSymbol, Syntax.SourceFile);
  }
  function getHelperName(helper: ExternalEmitHelpers) {
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
        return qb.fail('Unrecognized helper');
    }
  }
  function getNonSimpleParameters(parameters: readonly ParameterDeclaration[]): readonly ParameterDeclaration[] {
    return filter(parameters, (parameter) => !!parameter.initer || is.kind(qc.BindingPattern, parameter.name) || is.restParameter(parameter));
  }
  function getAccessorThisNodeKind(ParameterDeclaration, accessor: AccessorDeclaration): ParameterDeclaration | undefined {
    if (accessor.parameters.length === (accessor.kind === Syntax.GetAccessor ? 1 : 2)) return getThisNodeKind(ParameterDeclaration, accessor);
  }
  function getAmbientModules(): Symbol[] {
    if (!ambientModulesCache) {
      ambientModulesCache = [];
      globals.forEach((global, sym) => {
        if (ambientModuleSymbolRegex.test(sym as string)) ambientModulesCache!.push(global);
      });
    }
    return ambientModulesCache;
  }

}();