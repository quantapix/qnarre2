import { ExpandingFlags, ModifierFlags, Node, NodeFlags, ObjectFlags, SymbolFlags, TypeFlags, VarianceFlags } from './types';
import { Fcheck } from './check';
import { Fhas, Fis } from './groups';
import { Symbol } from './bases';
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
      if (!_jsxFactoryEntity) _jsxFactoryEntity = qt.QualifiedName.create(new qc.Identifier(qy.get.unescUnderscores(_jsxNamespace)), 'qf.make.elem');
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
        const file = qf.find.up(moduleSymbol.declarations, isSourceFile);
        const hasSyntheticDefault = canHaveSyntheticDefault(file, moduleSymbol, dontResolveAlias);
        if (!exportDefaultSymbol && !hasSyntheticDefault) {
          if (qf.has.exportAssignmentSymbol(moduleSymbol)) {
            const compilerOptionName = moduleKind >= qt.ModuleKind.ES2015 ? 'allowSyntheticDefaultImports' : 'esModuleInterop';
            const exportEqualsSymbol = moduleSymbol.exports!.get(InternalSymbol.ExportEquals);
            const exportAssignment = exportEqualsSymbol!.valueDeclaration;
            const err = error(n.name, qd.msgs.Module_0_can_only_be_default_imported_using_the_1_flag, moduleSymbol.symbolToString(), compilerOptionName);
            addRelatedInfo(
              err,
              qf.make.diagForNode(exportAssignment, qd.msgs.This_module_is_declared_with_using_export_and_can_only_be_used_with_a_default_import_when_using_the_0_flag, compilerOptionName)
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
            symbolFromVariable = qf.type.get.property(this.typeOfSymbol(targetSymbol), name.escapedText);
          else {
            symbolFromVariable = qf.get.propertyOfVariable(targetSymbol, name.escapedText);
          }
          symbolFromVariable = symbolFromVariable.resolveSymbol(dontResolveAlias);
          let symbolFromModule = qf.get.exportOfModule(targetSymbol, spec, dontResolveAlias);
          if (symbolFromModule === undefined && name.escapedText === InternalSymbol.Default) {
            const file = qf.find.up(moduleSymbol.declarations, isSourceFile);
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
              if (suggestion.valueDeclaration) addRelatedInfo(diagnostic, qf.make.diagForNode(suggestion.valueDeclaration, qd.msgs._0_is_declared_here, suggestionName));
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
        qf.assert.true(entityName.parent?.kind === Syntax.ImportEqualsDeclaration);
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
    externalModuleContainer(n: Node) {
      const p = qc.findAncestor(n, hasExternalModuleSymbol);
      return p && this.symbolOfNode(p);
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
    typeForBindingElemParent(n: qt.BindingElemGrandparent) {
      const symbol = this.symbolOfNode(n);
      return (symbol && s.this.links(symbol).type) || this.typeForVariableLikeDeclaration(n, false);
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
          const result = <qt.ElemAccessExpression>qf.make.node(Syntax.ElemAccessExpression, n.pos, n.end);
          result.parent = n;
          result.expression = <qt.LeftExpression>parentAccess;
          const literal = <qt.StringLiteral>qf.make.node(Syntax.StringLiteral, n.pos, n.end);
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
      if (!parentType || qf.type.is.any(parentType)) return parentType;
      if (strictNullChecks && declaration.flags & NodeFlags.Ambient && qf.is.paramDeclaration(declaration)) parentType = qf.type.get.nonNullable(parentType);
      else if (strictNullChecks && pattern.parent?.initer && !(this.typeFacts(this.typeOfIniter(pattern.parent?.initer)) & TypeFacts.EQUndefined)) {
        parentType = this.typeWithFacts(parentType, TypeFacts.NEUndefined);
      }
      let type: qt.Type | undefined;
      if (pattern.kind === Syntax.ObjectBindingPattern) {
        if (declaration.dot3Token) {
          parentType = this.reducedType(parentType);
          if (parentType.isa(qt.TypeFlags.Unknown) || !qf.type.is.validSpread(parentType)) {
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
        if (declaration.dot3Token) type = everyType(parentType, qf.is.tupleType) ? mapType(parentType, (t) => sliceTupleType(<qt.TupleTypeReference>t, index)) : qf.make.arrayType(elemType);
        else if (qf.type.is.arrayLike(parentType)) {
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
              qf.assert.true(!thisParam.type);
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
    flowTypeOfProperty(n: Node, s?: qt.Symbol) {
      const t = (s && (!qf.is.autoTypedProperty(s) || this.effectiveModifierFlags(s.valueDeclaration) & ModifierFlags.Ambient) && this.typeOfPropertyInBaseClass(s)) || undefinedType;
      return this.flow.typeOfReference(n, autoType, t);
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
      const type = qf.make.anonymousType(symbol, exports, qu.empty, qu.empty, undefined, undefined);
      t.objectFlags |= ObjectFlags.JSLiteral;
      return type;
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
          stringIndexInfo = qf.make.indexInfo(anyType, false);
          return;
        }
        const exprType = this.literalTypeFromPropertyName(name);
        if (!qf.type.is.usableAsPropertyName(exprType)) {
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
      const result = qf.make.anonymousType(undefined, members, qu.empty, qu.empty, stringIndexInfo, undefined);
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
      if (elems.length === 0 || (elems.length === 1 && hasRestElem)) return qf.make.iterableType(anyType);
      const elemTypes = map(elems, (e) => (e.kind === Syntax.OmittedExpression ? anyType : this.typeFromBindingElem(e, includePatternInType, reportErrors)));
      const minLength = qf.find.indexDown(elems, (e) => !e.kind === Syntax.OmittedExpression && !qf.has.defaultValue(e), elems.length - (hasRestElem ? 2 : 1)) + 1;
      let result = <qt.TypeReference>qf.make.tupleType(elemTypes, minLength, hasRestElem);
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
                  thisParam = qf.make.symbolWithType(firstThisParamOfUnionSignatures, thisType);
                }
                s = qf.make.unionSignature(signature, unions);
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
            qf.assert.true(!!signature, 'getUnionSignatures bails early on qu.empty signature lists and should not have qu.empty lists on second pass');
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
      return qf.make.indexInfo(this.unionType(indexTypes, UnionReduction.Subtype), isAnyReadonly);
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
        links.resolvedSignature = qf.make.signature(declaration, typeParams, thisParam, params, undefined, undefined, minArgCount, flags);
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
          return qf.make.deferredTypeReference(<qt.GenericType>type, <qt.TypingReference>n, undefined);
        const typeArgs = concatenate(t.outerTypeParams, fillMissingTypeArgs(typeArgsFromTypingReference(n), typeParams, minTypeArgCount, isJs));
        return qf.make.typeReference(<qt.GenericType>type, typeArgs);
      }
      return qf.check.noTypeArgs(n, symbol) ? type : errorType;
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
            return (!typeArgs || !typeArgs.length) && !noImplicitAny ? qf.make.promiseType(anyType) : undefined;
          case 'Object':
            if (typeArgs && typeArgs.length === 2) {
              if (qf.is.docIndexSignature(n)) {
                const indexed = this.typeFromTypeNode(typeArgs[0]);
                const target = this.typeFromTypeNode(typeArgs[1]);
                const index = qf.make.indexInfo(target, false);
                return qf.make.anonymousType(undefined, qu.emptySymbols, qu.empty, qu.empty, indexed === stringType ? index : undefined, indexed === numberType ? index : undefined);
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
    typeFromTypingQuery(n: qt.TypingQuery): qt.Type {
      const links = this.nodeLinks(n);
      if (!links.resolvedType) links.resolvedType = this.regularTypeOfLiteralType(this.widenedType(qf.check.expression(n.exprName)));
      return links.resolvedType;
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
      const minLength = qf.find.indexDown(n.elems, (n) => !qf.is.tupleOptionalElem(n) && n !== restElem) + 1;
      const missingName = qu.some(n.elems, (e) => e.kind !== Syntax.NamedTupleMember);
      return this.tupleTypeOfArity(n.elems.length, minLength, !!restElem, readonly, missingName ? undefined : (n.elems as readonly qt.NamedTupleMember[]));
    }
    typeFromArrayOrTupleTyping(n: qt.ArrayTyping | qt.TupleTyping): qt.Type {
      const links = this.nodeLinks(n);
      if (!links.resolvedType) {
        const target = this.arrayOrTupleTargetType(n);
        if (target === qu.emptyGenericType) links.resolvedType = qu.emptyObjectType;
        else if (qf.is.deferredTypingReference(n)) {
          links.resolvedType = n.kind === Syntax.TupleTyping && n.elems.length === 0 ? target : qf.make.deferredTypeReference(target, n, undefined);
        } else {
          const elemTypes = n.kind === Syntax.ArrayTyping ? [this.typeFromTypeNode(n.elemType)] : map(n.elems, this.typeFromTypeNode);
          links.resolvedType = qf.make.typeReference(target, elemTypes);
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
      if (!type) tupleTypes.set(key, (type = qf.make.tupleTypeOfArity(arity, minLength, hasRestElem, readonly, namedMemberDeclarations)));
      return type;
    }
    typeFromOptionalTyping(n: qt.OptionalTyping): qt.Type {
      const type = this.typeFromTypeNode(n.type);
      return strictNullChecks ? this.optionalType(t) : type;
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
      return qf.make.typePredicate(first.kind, first.paramName, first.paramIndex, unionType);
    }
    typeFromUnionTyping(n: qt.UnionTyping): qt.Type {
      const links = this.nodeLinks(n);
      if (!links.resolvedType) {
        const aliasSymbol = this.aliasSymbolForTypeNode(n);
        links.resolvedType = this.unionType(map(n.types, this.typeFromTypeNode), UnionReduction.Literal, aliasSymbol, this.typeArgsForAliasSymbol(aliasSymbol));
      }
      return links.resolvedType;
    }
    typeFromIntersectionTyping(n: qt.IntersectionTyping): qt.Type {
      const links = this.nodeLinks(n);
      if (!links.resolvedType) {
        const aliasSymbol = this.aliasSymbolForTypeNode(n);
        links.resolvedType = this.intersectionType(map(n.types, this.typeFromTypeNode), aliasSymbol, this.typeArgsForAliasSymbol(aliasSymbol));
      }
      return links.resolvedType;
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
    indexNodeForAccessExpression(accessNode: qt.ElemAccessExpression | qt.IndexedAccessTyping | qt.PropertyName | qt.BindingName | qt.SyntheticExpression) {
      return accessNode.kind === Syntax.ElemAccessExpression
        ? accessNode.argExpression
        : accessNode.kind === Syntax.IndexedAccessTyping
        ? accessNode.indexType
        : accessNode.kind === Syntax.ComputedPropertyName
        ? accessNode.expression
        : accessNode;
    }
    typeFromIndexedAccessTyping(n: qt.IndexedAccessTyping) {
      const links = this.nodeLinks(n);
      if (!links.resolvedType) {
        const objectType = this.typeFromTypeNode(n.objectType);
        const indexType = this.typeFromTypeNode(n.indexType);
        const resolved = this.indexedAccessType(objectType, indexType, n);
        links.resolvedType =
          resolved.isa(qt.TypeFlags.IndexedAccess) && (<qt.IndexedAccessType>resolved).objectType === objectType && (<qt.IndexedAccessType>resolved).indexType === indexType
            ? this.conditionalFlowTypeOfType(resolved, n)
            : resolved;
      }
      return links.resolvedType;
    }
    typeFromMappedTyping(n: qt.MappedTyping): qt.Type {
      const links = this.nodeLinks(n);
      if (!links.resolvedType) {
        const type = <qt.MappedType>qf.make.objectType(ObjectFlags.Mapped, n.symbol);
        t.declaration = n;
        t.aliasSymbol = this.aliasSymbolForTypeNode(n);
        t.aliasTypeArgs = this.typeArgsForAliasSymbol(t.aliasSymbol);
        links.resolvedType = type;
        this.constraintTypeFromMappedType(t);
      }
      return links.resolvedType;
    }
    conditionalType(root: qt.ConditionalRoot, mapper: qt.TypeMapper | undefined): qt.Type {
      let result;
      let extraTypes: qt.Type[] | undefined;
      while (true) {
        const checkType = instantiateType(root.checkType, mapper);
        const checkTypeInstantiable = qf.type.is.genericObject(checkType) || qf.type.is.genericIndex(checkType);
        const extendsType = instantiateType(root.extendsType, mapper);
        if (checkType === wildcardType || extendsType === wildcardType) return wildcardType;
        let combinedMapper: qt.TypeMapper | undefined;
        if (root.inferTypeParams) {
          const context = qf.make.inferenceContext(root.inferTypeParams, undefined, InferenceFlags.None);
          if (!checkTypeInstantiable || !some(root.inferTypeParams, (t) => t === extendsType))
            inferTypes(context.inferences, checkType, extendsType, qt.InferencePriority.NoConstraints | qt.InferencePriority.AlwaysStrict);
          combinedMapper = mergeTypeMappers(mapper, context.mapper);
        }
        const inferredExtendsType = combinedMapper ? instantiateType(root.extendsType, combinedMapper) : extendsType;
        if (!checkTypeInstantiable && !qf.type.is.genericObject(inferredExtendsType) && !qf.type.is.genericIndex(inferredExtendsType)) {
          if (!inferredExtendsType.isa(qt.TypeFlags.AnyOrUnknown) && (checkType.isa(qt.TypeFlags.Any) || !qf.type.is.assignableTo(this.permissive(checkType), this.permissive(inferredExtendsType)))) {
            if (checkType.isa(qt.TypeFlags.Any)) (extraTypes || (extraTypes = [])).push(instantiateTypeWithoutDepthIncrease(root.trueType, combinedMapper || mapper));
            const falseType = root.falseType;
            if (falseType.isa(qt.TypeFlags.Conditional)) {
              const newRoot = (<qt.ConditionalType>falseType).root;
              if (newRoot.node.parent === root.node && (!newRoot.isDistributive || newRoot.checkType === root.checkType)) {
                root = newRoot;
                continue;
              }
            }
            result = instantiateTypeWithoutDepthIncrease(falseType, mapper);
            break;
          }
          if (inferredExtendsType.isa(qt.TypeFlags.AnyOrUnknown) || qf.type.is.assignableTo(this.restrictive(checkType), this.restrictive(inferredExtendsType))) {
            result = instantiateTypeWithoutDepthIncrease(root.trueType, combinedMapper || mapper);
            break;
          }
        }
        const erasedCheckType = this.actualTypeVariable(checkType);
        result = <qt.ConditionalType>qf.make.type(TypeFlags.Conditional);
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
          isDistributive: !!checkType.isa(qt.TypeFlags.TypeParam),
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
          let type = qf.make.objectType(ObjectFlags.Anonymous, n.symbol);
          t.aliasSymbol = aliasSymbol;
          t.aliasTypeArgs = this.typeArgsForAliasSymbol(aliasSymbol);
          if (n.kind === Syntax.DocTypingLiteral && n.qf.type.is.array) type = qf.make.arrayType(t);
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
    indexInfoWithReadonly(info: qt.IndexInfo | undefined, readonly: boolean) {
      return info && info.isReadonly !== readonly ? qf.make.indexInfo(info.type, readonly, info.declaration) : info;
    }
    literalType(value: string | number | qt.PseudoBigInt, enumId?: number, symbol?: qt.Symbol) {
      const qualifier = typeof value === 'number' ? '#' : typeof value === 'string' ? '@' : 'n';
      const key = (enumId ? enumId : '') + qualifier + (typeof value === 'object' ? pseudoBigIntToString(value) : value);
      let type = literalTypes.get(key);
      if (!type) {
        const flags =
          (typeof value === 'number' ? qt.TypeFlags.NumberLiteral : typeof value === 'string' ? qt.TypeFlags.StringLiteral : qt.TypeFlags.BigIntLiteral) | (enumId ? qt.TypeFlags.EnumLiteral : 0);
        literalTypes.set(key, (type = qf.make.literalType(flags, value, symbol)));
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
        return links.uniqueESSymbolType || (links.uniqueESSymbolType = qf.make.uniqueESSymbolType(symbol));
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
    modifiedReadonlyState(state: boolean, modifiers: MappedTypeModifiers) {
      return modifiers & MappedTypeModifiers.IncludeReadonly ? true : modifiers & MappedTypeModifiers.ExcludeReadonly ? false : state;
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
          let variance = (qf.type.is.assignableTo(typeWithSub, typeWithSuper) ? VarianceFlags.Covariant : 0) | (qf.type.is.assignableTo(typeWithSuper, typeWithSub) ? VarianceFlags.Contravariant : 0);
          if (variance === VarianceFlags.Bivariant && qf.type.is.assignableTo(createMarkerType(cache, tp, markerOtherType), typeWithSuper)) variance = VarianceFlags.Independent;
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
    siblingsOfContext(context: qt.WideningContext): qt.Type[] {
      if (!context.siblings) {
        const siblings: qt.Type[] = [];
        for (const type of this.siblingsOfContext(context.parent!)) {
          if (t.isobj(ObjectFlags.ObjectLiteral)) {
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
          if (t.isobj(ObjectFlags.ObjectLiteral) && !(this.objectFlags(t) & ObjectFlags.ContainsSpread)) {
            for (const prop of qf.type.get.properties(t)) {
              names.set(prop.escName, prop);
            }
          }
        }
        context.resolvedProperties = arrayFrom(names.values());
      }
      return context.resolvedProperties;
    }
    mapperFromContext<T extends qt.InferenceContext | undefined>(context: T): qt.TypeMapper | (T & undefined) {
      return context && context.mapper;
    }
    typeFromInference(inference: qt.InferenceInfo) {
      return inference.candidates ? this.unionType(inference.candidates, UnionReduction.Subtype) : inference.contraCandidates ? this.intersectionType(inference.contraCandidates) : undefined;
    }
    contravariantInference(inference: qt.InferenceInfo) {
      return inference.priority! & qt.InferencePriority.PriorityImpliesCombination ? this.intersectionType(inference.contraCandidates!) : this.commonSubtype(inference.contraCandidates!);
    }
    covariantInference(inference: qt.InferenceInfo, signature: qt.Signature) {
      const candidates = unionObjectAndArrayLiteralCandidates(inference.candidates!);
      const primitiveConstraint = qf.type.has.primitiveConstraint(inference.typeParam);
      const widenLiteralTypes = !primitiveConstraint && inference.topLevel && (inference.isFixed || !qf.type.is.paramAtTopLevel(this.returnTypeOfSignature(signature), inference.typeParam));
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
              inferredCovariantType && !inferredCovariantType.isa(qt.TypeFlags.Never) && qf.type.is.subtypeOf(inferredCovariantType, inferredContravariantType)
                ? inferredCovariantType
                : inferredContravariantType;
          } else if (inferredCovariantType) {
            inferredType = inferredCovariantType;
          } else if (context.flags & InferenceFlags.NoDefault) {
            inferredType = silentNeverType;
          } else {
            const defaultType = this.defaultFromTypeParam(inference.typeParam);
            if (defaultType) inferredType = instantiateType(defaultType, mergeTypeMappers(qf.make.backreferenceMapper(context, index), context.nonFixingMapper));
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
            const prop = type && qf.type.get.property(t, (<qt.PropertyAccessExpression>n).name.escapedText);
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
          if (qf.is.optionalChain(n)) funcType = qf.type.check.nonNull(this.optionalExpressionType(qf.check.expression(n.expression), n.expression), n.expression);
          else {
            funcType = qf.check.nonNullExpression(n.expression);
          }
        }
        const signatures = qf.type.get.signatures((funcType && this.apparentType(funcType)) || unknownType, qt.SignatureKind.Call);
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
        if (!reference.flowNode || (!couldBeUninitialized && !declaredType.isa(qt.TypeFlags.Narrowable))) return declaredType;
        flowInvocationCount++;
        const sharedFlowStart = sharedFlowCount;
        const evolvedType = this.typeFromFlowType(this.typeAtFlowNode(reference.flowNode));
        sharedFlowCount = sharedFlowStart;
        const resultType = this.objectFlags(evolvedType) & ObjectFlags.EvolvingArray && qf.is.evolvingArrayOperationTarget(reference) ? autoArrayType : finalizeEvolvingArrayType(evolvedType);
        if (
          resultType === unreachableNeverType ||
          (reference.parent && reference.parent?.kind === Syntax.NonNullExpression && this.typeWithFacts(resultType, TypeFacts.NEUndefinedOrNull).isa(qt.TypeFlags.Never))
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
            return qf.make.flowType(this.baseTypeOfLiteralType(this.typeFromFlowType(flowType)), qf.is.incomplete(flowType));
          }
          if (declaredType === autoType || declaredType === autoArrayType) {
            if (qf.is.emptyArrayAssignment(n)) return this.evolvingArrayType(neverType);
            const assignedType = this.widenedLiteralType(this.initialOrAssignedType(flow));
            return qf.type.is.assignableTo(assignedType, declaredType) ? assignedType : anyArrayType;
          }
          if (declaredType.isa(qt.TypeFlags.Union)) return this.assignmentReducedType(<qt.UnionType>declaredType, this.initialOrAssignedType(flow));
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
            return narrowedType === type ? flowType : qf.make.flowType(narrowedType, qf.is.incomplete(flowType));
          }
          if (this.returnTypeOfSignature(signature).isa(qt.TypeFlags.Never)) return unreachableNeverType;
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
                if (qf.type.is.assignableToKind(indexType, qt.TypeFlags.NumberLike)) evolvedType = addEvolvingArrayElemType(evolvedType, n.right);
              }
              return evolvedType === type ? flowType : qf.make.flowType(evolvedType, qf.is.incomplete(flowType));
            }
            return flowType;
          }
        }
        return;
      }
      typeAtFlowCondition(flow: qt.FlowCondition): qt.FlowType {
        const flowType = this.typeAtFlowNode(flow.antecedent);
        const type = this.typeFromFlowType(flowType);
        if (t.isa(qt.TypeFlags.Never)) return flowType;
        const assumeTrue = (flow.flags & FlowFlags.TrueCondition) !== 0;
        const nonEvolvingType = finalizeEvolvingArrayType(t);
        const narrowedType = narrowType(nonEvolvingType, flow.node, assumeTrue);
        if (narrowedType === nonEvolvingType) return flowType;
        const incomplete = qf.is.incomplete(flowType);
        const resultType = incomplete && narrowedType.isa(qt.TypeFlags.Never) ? silentNeverType : narrowedType;
        return qf.make.flowType(resultType, incomplete);
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
                (t) => !(t.isa(qt.TypeFlags.Never) || (t.isa(qt.TypeFlags.StringLiteral) && (<qt.StringLiteralType>t).value === 'undefined'))
              );
            }
          }
          if (qf.is.matchingReferenceDiscriminant(expr, type))
            type = narrowTypeByDiscriminant(t, expr as qt.AccessExpression, (t) => narrowTypeBySwitchOnDiscriminant(t, flow.switchStatement, flow.clauseStart, flow.clauseEnd));
        }
        return qf.make.flowType(t, qf.is.incomplete(flowType));
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
          if (!qf.type.is.subsetOf(t, declaredType)) subtypeReduction = true;
          if (qf.is.incomplete(flowType)) seenIncomplete = true;
        }
        if (bypassFlow) {
          const flowType = this.typeAtFlowNode(bypassFlow);
          const type = this.typeFromFlowType(flowType);
          if (!contains(antecedentTypes, type) && !qf.is.exhaustiveSwitchStatement(bypassFlow.switchStatement)) {
            if (type === declaredType && declaredType === initialType) return type;
            antecedentTypes.push(t);
            if (!qf.type.is.subsetOf(t, declaredType)) subtypeReduction = true;
            if (qf.is.incomplete(flowType)) seenIncomplete = true;
          }
        }
        return qf.make.flowType(this.unionOrEvolvingArrayType(antecedentTypes, subtypeReduction ? UnionReduction.Subtype : UnionReduction.Literal), seenIncomplete);
      }
      typeAtFlowLoopLabel(flow: qt.FlowLabel): qt.FlowType {
        const id = this.flowNodeId(flow);
        const cache = flowLoopCaches[id] || (flowLoopCaches[id] = new qu.QMap<qt.Type>());
        const key = this.orSetCacheKey();
        if (!key) return declaredType;
        const cached = cache.get(key);
        if (cached) return cached;
        for (let i = flowLoopStart; i < flowLoopCount; i++) {
          if (flowLoopNodes[i] === flow && flowLoopKeys[i] === key && flowLoopTypes[i].length) return qf.make.flowType(this.unionOrEvolvingArrayType(flowLoopTypes[i], UnionReduction.Literal), true);
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
          if (!qf.type.is.subsetOf(t, declaredType)) subtypeReduction = true;
          if (type === declaredType) break;
        }
        const result = this.unionOrEvolvingArrayType(antecedentTypes, subtypeReduction ? UnionReduction.Subtype : UnionReduction.Literal);
        if (qf.is.incomplete(firstAntecedentType!)) return qf.make.flowType(result, true);
        cache.set(key, result);
        return result;
      }
      isMatchingReferenceDiscriminant(expr: qt.Expression, computedType: qt.Type) {
        const type = declaredType.isa(qt.TypeFlags.Union) ? declaredType : computedType;
        if (!t.isa(qt.TypeFlags.Union) || !qf.is.accessExpression(expr)) return false;
        const name = this.accessedPropertyName(expr);
        if (name === undefined) return false;
        return qf.is.matchingReference(reference, expr.expression) && qf.type.is.discriminantProp(t, name);
      }
      isMatchingConstructorReference(expr: qt.Expression) {
        return (
          ((expr.kind === Syntax.PropertyAccessExpression && idText(expr.name) === 'constructor') ||
            (expr.kind === Syntax.ElemAccessExpression && qf.is.stringLiteralLike(expr.argExpression) && expr.argExpression.text === 'constructor')) &&
          qf.is.matchingReference(reference, expr.expression)
        );
      }
    })();
    controlFlowContainer(n: Node): Node {
      return qc.findAncestor(
        n.parent,
        (n) => (qf.is.functionLike(n) && !this.immediatelyInvokedFunctionExpression(n)) || n.kind === Syntax.ModuleBlock || n.kind === Syntax.SourceFile || n.kind === Syntax.PropertyDeclaration
      )!;
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
          return this.widenedType(contextualType ? qf.type.get.nonNullable(contextualType) : qf.check.expressionCached(containingLiteral));
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
        if (qf.type.is.usableAsPropertyName(nameType)) {
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
            return contextualAwaitedType && this.unionType([contextualAwaitedType, qf.make.promiseLikeType(contextualAwaitedType)]);
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
        return contextualAwaitedType && this.unionType([contextualAwaitedType, qf.make.promiseLikeType(contextualAwaitedType)]);
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
    contextualTypeForObjectLiteralMethod(n: qt.MethodDeclaration, contextFlags?: ContextFlags): qt.Type | undefined {
      qf.assert.true(qf.is.objectLiteralMethod(n));
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
    contextualTypeForConditionalOperand(n: qt.Expression, contextFlags?: ContextFlags): qt.Type | undefined {
      const conditional = <qt.ConditionalExpression>n.parent;
      return n === conditional.whenTrue || n === conditional.whenFalse ? this.contextualType(conditional, contextFlags) : undefined;
    }
    contextualTypeForChildJsxExpression(n: qt.JsxElem, child: qt.JsxChild) {
      const attributesType = this.apparentTypeOfContextualType(n.opening.tagName);
      const jsxChildrenPropertyName = this.jsxElemChildrenPropertyName(this.jsxNamespaceAt(n));
      if (!(attributesType && !qf.type.is.any(attributesType) && jsxChildrenPropertyName && jsxChildrenPropertyName !== '')) return;
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
                if (qf.type.is.arrayLike(t)) return this.indexedAccessType(t, this.literalType(childIndex));
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
        if (!attributesType || qf.type.is.any(attributesType)) return;
        return this.typeOfPropertyOfContextualType(attributesType, attribute.name.escapedText);
      }
      return this.contextualType(attribute.parent);
    }
    apparentTypeOfContextualType(n: qt.Expression | qt.MethodDeclaration, contextFlags?: ContextFlags): qt.Type | undefined {
      const contextualType = qf.is.objectLiteralMethod(n) ? this.contextualTypeForObjectLiteralMethod(n, contextFlags) : this.contextualType(n, contextFlags);
      const instantiatedType = instantiateContextualType(contextualType, n, contextFlags);
      if (instantiatedType && !(contextFlags && contextFlags & ContextFlags.NoConstraints && instantiatedType.isa(qt.TypeFlags.TypeVariable))) {
        const apparentType = mapType(instantiatedType, getApparentType, true);
        if (apparentType.isa(qt.TypeFlags.Union)) {
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
          qf.assert.true(parent?.parent?.kind === Syntax.TemplateExpression);
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
    staticTypeOfReferencedJsxConstructor(context: qt.JsxOpeningLikeElem) {
      if (qf.is.jsxIntrinsicIdentifier(context.tagName)) {
        const result = this.intrinsicAttributesTypeFromJsxOpeningLikeElem(context);
        const fakeSignature = qf.make.signatureForJSXIntrinsic(context, result);
        return this.orCreateTypeFromSignature(fakeSignature);
      }
      const tagType = qf.check.expressionCached(context.tagName);
      if (tagType.isa(qt.TypeFlags.StringLiteral)) {
        const result = this.intrinsicAttributesTypeFromStringLiteralType(tagType as qt.StringLiteralType, context);
        if (!result) return errorType;
        const fakeSignature = qf.make.signatureForJSXIntrinsic(context, result);
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
          return qf.make.typeReference(declaredManagedType as qt.GenericType, args);
        } else if (length(declaredManagedType.aliasTypeArgs) >= 2) {
          const args = fillMissingTypeArgs([ctorType, attributesType], declaredManagedType.aliasTypeArgs, 2, qf.is.inJSFile(context));
          return this.typeAliasInstantiation(declaredManagedType.aliasSymbol!, args);
        }
      }
      return attributesType;
    }
    contextualSignatureForFunctionLikeDeclaration(n: qt.FunctionLikeDeclaration): qt.Signature | undefined {
      return qf.is.functionExpressionOrArrowFunction(n) || qf.is.objectLiteralMethod(n) ? this.contextualSignature(<qt.FunctionExpression>n) : undefined;
    }
    contextualSignature(n: qt.FunctionExpression | qt.ArrowFunction | qt.MethodDeclaration): qt.Signature | undefined {
      qf.assert.true(n.kind !== Syntax.MethodDeclaration || qf.is.objectLiteralMethod(n));
      const typeTagSignature = this.signatureOfTypeTag(n);
      if (typeTagSignature) return typeTagSignature;
      const type = this.apparentTypeOfContextualType(n, ContextFlags.Signature);
      if (!type) return;
      if (!t.isa(qt.TypeFlags.Union)) return this.contextualCallSignature(t, n);
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
      if (signatureList) return signatureList.length === 1 ? signatureList[0] : qf.make.unionSignature(signatureList[0], signatureList);
    }
    objectLiteralIndexInfo(n: qt.ObjectLiteralExpression, offset: number, properties: qt.Symbol[], kind: IndexKind): qt.IndexInfo {
      const propTypes: qt.Type[] = [];
      for (let i = 0; i < properties.length; i++) {
        if (kind === qt.IndexKind.String || qf.is.numericName(n.properties[i + offset].name!)) propTypes.push(this.typeOfSymbol(properties[i]));
      }
      const unionType = propTypes.length ? this.unionType(propTypes, UnionReduction.Subtype) : undefinedType;
      return qf.make.indexInfo(unionType, qf.is.constContext(n));
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
          const intrinsicProp = qf.type.get.property(intrinsicElemsType, n.tagName.escapedText);
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
      const propertiesOfJsxElemAttribPropInterface = jsxElemAttribPropInterfaceType && qf.type.get.properties(jsxElemAttribPropInterfaceType);
      if (propertiesOfJsxElemAttribPropInterface) {
        if (propertiesOfJsxElemAttribPropInterface.length === 0) return '' as qu.__String;
        else if (propertiesOfJsxElemAttribPropInterface.length === 1) return propertiesOfJsxElemAttribPropInterface[0].escName;
        else if (propertiesOfJsxElemAttribPropInterface.length > 1) {
          error(jsxElemAttribPropInterfaceSym!.declarations[0], qd.msgs.The_global_type_JSX_0_may_not_have_more_than_one_property, qy.get.unescUnderscores(nameOfAttribPropContainer));
        }
      }
      return;
    }
    intrinsicAttributesTypeFromJsxOpeningLikeElem(n: qt.JsxOpeningLikeElem): qt.Type {
      qf.assert.true(qf.is.jsxIntrinsicIdentifier(n.tagName));
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
      return intrinsics ? qf.type.get.properties(intrinsics) : qu.empty;
    }
    thisParamFromNodeContext(n: Node) {
      const thisContainer = this.thisContainer(n, false);
      return thisContainer && qf.is.functionLike(thisContainer) ? this.thisNodeKind(ParamDeclaration, thisContainer) : undefined;
    }
    flowTypeOfAccessExpression(n: qt.ElemAccessExpression | qt.PropertyAccessExpression | qt.QualifiedName, prop: qt.Symbol | undefined, propType: qt.Type, errorNode: Node) {
      const assignmentKind = this.assignmentTargetKind(n);
      if (
        !qf.is.accessExpression(n) ||
        assignmentKind === qt.AssignmentKind.Definite ||
        (prop && !(prop.flags & (SymbolFlags.Variable | SymbolFlags.Property | SymbolFlags.Accessor)) && !(prop.flags & SymbolFlags.Method && propType.isa(qt.TypeFlags.Union)))
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
    suggestedSymbolForNonexistentProperty(name: qc.Identifier | qc.PrivateIdentifier | string, containingType: qt.Type): qt.Symbol | undefined {
      return this.spellingSuggestionForName(qf.is.string(name) ? name : idText(name), qf.type.get.properties(containingType), SymbolFlags.Value);
    }
    suggestionForNonexistentProperty(name: qc.Identifier | qc.PrivateIdentifier | string, containingType: qt.Type): string | undefined {
      const suggestion = this.suggestedSymbolForNonexistentProperty(name, containingType);
      return suggestion && suggestion.name;
    }
    suggestedSymbolForNonexistentSymbol(location: Node | undefined, outerName: qu.__String, meaning: SymbolFlags): qt.Symbol | undefined {
      qf.assert.true(outerName !== undefined, 'outername should always be defined');
      const result = resolveNameHelper(location, outerName, meaning, undefined, outerName, false, false, (symbols, name, meaning) => {
        qf.assert.equal(outerName, name, 'name should equal outerName');
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
      return qf.find.index(args, isSpreadArg);
    }
    spreadArgType(args: readonly qt.Expression[], index: number, argCount: number, restType: qt.Type, context: qt.InferenceContext | undefined) {
      if (index >= argCount - 1) {
        const arg = args[argCount - 1];
        if (qf.is.spreadArg(arg)) {
          return arg.kind === Syntax.SyntheticExpression
            ? qf.make.arrayType((<qt.SyntheticExpression>arg).type)
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
        ? qf.make.tupleType(types, undefined, length(names) === length(types) ? names : undefined)
        : qf.make.tupleType(append(types.slice(0, spreadIndex), this.unionType(types.slice(spreadIndex))), spreadIndex, undefined);
    }
    jsxReferenceKind(n: qt.JsxOpeningLikeElem): qt.JsxReferenceKind {
      if (qf.is.jsxIntrinsicIdentifier(n.tagName)) return qt.JsxReferenceKind.Mixed;
      const tagType = this.apparentType(qf.check.expression(n.tagName));
      if (length(qf.type.get.signatures(tagType, qt.SignatureKind.Construct))) return qt.JsxReferenceKind.Component;
      if (length(qf.type.get.signatures(tagType, qt.SignatureKind.Call))) return qt.JsxReferenceKind.Function;
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
          qf.assert.true(!reportErrors || !!errorOutputContainer.errors, 'jsx should have errors when reporting errors');
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
          if (qf.is.optionalChainRoot(thisArgNode.parent)) thisArgType = qf.type.get.nonNullable(thisArgType);
          else if (qf.is.optionalChain(thisArgNode.parent)) {
            thisArgType = qf.type.get.nonOptional(thisArgType);
          }
        } else {
          thisArgType = voidType;
        }
        const errorNode = reportErrors ? thisArgNode || n : undefined;
        const headMessage = qd.msgs.The_this_context_of_type_0_is_not_assignable_to_method_s_this_of_type_1;
        if (!qf.type.check.relatedTo(thisArgType, thisType, relation, errorNode, headMessage, containingMessageChain, errorOutputContainer)) {
          qf.assert.true(!reportErrors || !!errorOutputContainer.errors, 'this param should have errors when reporting errors');
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
          if (!qf.type.check.relatedToAndOptionallyElaborate(checkArgType, paramType, relation, reportErrors ? arg : undefined, arg, headMessage, containingMessageChain, errorOutputContainer)) {
            qf.assert.true(!reportErrors || !!errorOutputContainer.errors, 'param should have errors when reporting errors');
            maybeAddMissingAwaitInfo(arg, checkArgType, paramType);
            return errorOutputContainer.errors || qu.empty;
          }
        }
      }
      if (restType) {
        const spreadType = this.spreadArgType(args, argCount, args.length, restType, undefined);
        const errorNode = reportErrors ? (argCount < args.length ? args[argCount] : n) : undefined;
        if (!qf.type.check.relatedTo(spreadType, restType, relation, errorNode, headMessage, undefined, errorOutputContainer)) {
          qf.assert.true(!reportErrors || !!errorOutputContainer.errors, 'rest param should have errors when reporting errors');
          maybeAddMissingAwaitInfo(errorNode, spreadType, restType);
          return errorOutputContainer.errors || qu.empty;
        }
      }
      return;
      const maybeAddMissingAwaitInfo = (errorNode: Node | undefined, source: qt.Type, target: qt.Type) => {
        if (errorNode && reportErrors && errorOutputContainer.errors && errorOutputContainer.errors.length) {
          if (this.awaitedTypeOfPromise(target)) return;
          const awaitedTypeOfSource = this.awaitedTypeOfPromise(source);
          if (awaitedTypeOfSource && qf.type.is.relatedTo(awaitedTypeOfSource, target, relation))
            addRelatedInfo(errorOutputContainer.errors[0], qf.make.diagForNode(errorNode, qd.msgs.Did_you_forget_to_use_await));
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
        const args: qt.Expression[] = [qf.make.syntheticExpression(template, this.globalTemplateStringsArrayType())];
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
        if (qf.type.is.tuple(t)) {
          const typeArgs = this.typeArgs(<qt.TypeReference>type);
          const restIndex = t.target.hasRestElem ? typeArgs.length - 1 : -1;
          const syntheticArgs = map(typeArgs, (t, i) => qf.make.syntheticExpression(spreadArg, t, i === restIndex, t.target.labeledElemDeclarations?.[i]));
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
          return [qf.make.syntheticExpression(expr, this.typeOfSymbol(this.symbolOfNode(parent)))];
        case Syntax.Param:
          const func = <qt.FunctionLikeDeclaration>parent?.parent;
          return [
            qf.make.syntheticExpression(expr, parent?.parent?.kind === Syntax.Constructor ? this.typeOfSymbol(this.symbolOfNode(func)) : errorType),
            qf.make.syntheticExpression(expr, anyType),
            qf.make.syntheticExpression(expr, numberType),
          ];
        case Syntax.PropertyDeclaration:
        case Syntax.MethodDeclaration:
        case Syntax.GetAccessor:
        case Syntax.SetAccessor:
          const hasPropDesc = parent?.kind !== Syntax.PropertyDeclaration;
          return [
            qf.make.syntheticExpression(expr, this.parentTypeOfClassElem(<qt.ClassElem>parent)),
            qf.make.syntheticExpression(expr, this.classElemPropertyKeyType(<qt.ClassElem>parent)),
            qf.make.syntheticExpression(expr, hasPropDesc ? qf.make.typedPropertyDescriptorType(this.typeOfNode(parent)) : anyType),
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
        return qf.make.fileDiag(sourceFile, start, length, message, arg0, arg1, arg2, arg3);
      }
      return qf.make.diagForNode(n, message, arg0, arg1, arg2, arg3);
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
          related = qf.make.diagForNode(
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
      const diagnostic = qf.make.diagForNodes(n.sourceFile, spanArray, error, paramRange, argCount);
      return related ? addRelatedInfo(diagnostic, related) : diagnostic;
    }
    typeArgArityError(n: Node, signatures: readonly qt.Signature[], typeArgs: Nodes<qt.Typing>) {
      const argCount = typeArgs.length;
      if (signatures.length === 1) {
        const sig = signatures[0];
        const min = this.minTypeArgCount(sig.typeParams);
        const max = length(sig.typeParams);
        return qf.make.diagForNodes(n.sourceFile, typeArgs, qd.msgs.Expected_0_type_args_but_got_1, min < max ? min + '-' + max : min, argCount);
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
        return qf.make.diagForNodes(n.sourceFile, typeArgs, qd.msgs.No_overload_expects_0_type_args_but_overloads_do_exist_that_expect_either_1_or_2_type_args, argCount, belowArgCount, aboveArgCount);
      }
      return qf.make.diagForNodes(n.sourceFile, typeArgs, qd.msgs.Expected_0_type_args_but_got_1, belowArgCount === -Infinity ? aboveArgCount : belowArgCount, argCount);
    }
    candidateForOverloadFailure(n: qt.CallLikeExpression, candidates: qt.Signature[], args: readonly qt.Expression[], hasCandidatesOutArray: boolean): qt.Signature {
      qf.assert.true(candidates.length > 0);
      qf.check.nodeDeferred(n);
      return hasCandidatesOutArray || candidates.length === 1 || candidates.some((c) => !!c.typeParams)
        ? pickLongestCandidateSignature(n, candidates, args)
        : qf.make.unionOfSignaturesForOverloadFailure(candidates);
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
    tupleElemLabel(d: qt.ParamDeclaration | qt.NamedTupleMember) {
      qf.assert.true(d.name.kind === Syntax.Identifier);
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
        if (isAsync) returnType = qf.type.check.awaited(returnType, func, qd.msgs.The_return_type_of_an_async_function_must_either_be_a_valid_promise_or_must_not_contain_a_callable_then_member);
      } else if (isGenerator) {
        const returnTypes = qf.check.andAggregateReturnExpressionTypes(func, checkMode);
        if (!returnTypes) fallbackReturnType = neverType;
        else if (returnTypes.length > 0) returnType = this.unionType(returnTypes, UnionReduction.Subtype);
        const { yieldTypes, nextTypes } = qf.check.andAggregateYieldOperandTypes(func, checkMode);
        yieldType = qu.some(yieldTypes) ? this.unionType(yieldTypes, UnionReduction.Subtype) : undefined;
        nextType = qu.some(nextTypes) ? this.intersectionType(nextTypes) : undefined;
      } else {
        const types = qf.check.andAggregateReturnExpressionTypes(func, checkMode);
        if (!types) return functionFlags & FunctionFlags.Async ? qf.make.promiseReturnType(func, neverType) : neverType;
        if (types.length === 0) return functionFlags & FunctionFlags.Async ? qf.make.promiseReturnType(func, voidType) : voidType;
        returnType = this.unionType(types, UnionReduction.Subtype);
      }
      if (returnType || yieldType || nextType) {
        if (yieldType) reportErrorsFromWidening(func, yieldType, WideningKind.GeneratorYield);
        if (returnType) reportErrorsFromWidening(func, returnType, WideningKind.FunctionReturn);
        if (nextType) reportErrorsFromWidening(func, nextType, WideningKind.GeneratorNext);
        if (returnType.isa(TypeFlags.Unit) || yieldType.isa(TypeFlags.Unit) || nextType.isa(TypeFlags.Unit)) {
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
        return qf.make.generatorReturnType(yieldType || neverType, returnType || fallbackReturnType, nextType || this.contextualIterationType(IterationTypeKind.Next, func) || unknownType, isAsync);
      return isAsync ? qf.make.promiseType(returnType || fallbackReturnType) : returnType || fallbackReturnType;
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
          const newTypeParam = qf.make.typeParam(symbol);
          newTypeParam.target = tp;
          oldTypeParams = append(oldTypeParams, tp);
          newTypeParams = append(newTypeParams, newTypeParam);
          result.push(newTypeParam);
        } else {
          result.push(tp);
        }
      }
      if (newTypeParams) {
        const mapper = qf.make.typeMapper(oldTypeParams!, newTypeParams);
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
          return (
            (symbol.flags & SymbolFlags.TypeAlias && s.this.links(symbol).typeParams) || (this.objectFlags(t) & ObjectFlags.Reference ? (<qt.TypeReference>type).target.localTypeParams : undefined)
          );
        }
      }
      return;
    }
    typeArgConstraint(n: qt.Typing): qt.Type | undefined {
      const typeReferenceNode = qu.tryCast(n.parent, isTypeReferenceType);
      if (!typeReferenceNode) return;
      const typeParams = this.typeParamsForTypeReference(typeReferenceNode)!;
      const constraint = this.constraintOfTypeParam(typeParams[typeReferenceNode.typeArgs!.indexOf(n)]);
      return constraint && instantiateType(constraint, qf.make.typeMapper(typeParams, this.effectiveTypeArgs(typeReferenceNode, typeParams)));
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
          if (!lastParamDeclaration || (symbol && lastParamDeclaration.symbol === symbol && qf.is.restParam(lastParamDeclaration))) return qf.make.arrayType(t);
        }
      }
      if (parent?.kind === Syntax.ParamDeclaration && parent?.parent?.kind === Syntax.DocFunctionTyping) return qf.make.arrayType(t);
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
        qf.assert.true(importEqualsDeclaration !== undefined);
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
        qf.assert.true(!qf.is.inJSFile(name));
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
          const propertyDeclaration = qf.type.get.property(typeOfPattern, (<qt.Identifier>n).escapedText);
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
          return objectType && qf.type.get.property(objectType, qy.get.escUnderscores((n as qt.StringLiteral | qt.NumericLiteral).text));
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
    typeOfAssignmentPattern(e: qt.AssignmentPattern): qt.Type | undefined {
      qf.assert.true(e.kind === Syntax.ObjectLiteralExpression || e.kind === Syntax.ArrayLiteralExpression);
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
      return t && qf.type.get.property(t, n.escapedText);
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
          return qf.type.is.assignableToKind(t, qt.TypeFlags.ESSymbolLike) ? t : stringType;
        default:
          return qu.fail('Unsupported property name.');
      }
    }
    referencedExportContainer(nIn: qt.Identifier, prefixLocals?: boolean): qt.SourceFile | qt.ModuleDeclaration | qt.EnumDeclaration | undefined {
      const n = this.parseTreeOf(nIn, qf.is.identifier);
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
      const n = this.parseTreeOf(i, qf.is.identifier);
      if (n) {
        const s = this.referencedValueSymbol(n);
        if (symbol.qf.is.nonLocalAlias(SymbolFlags.Value) && !this.this.typeOnlyAliasDeclaration()) return symbol.this.declarationOfAliasSymbol();
      }
      return;
    }
    referencedDeclarationWithCollidingName(i: qt.Identifier): qt.Declaration | undefined {
      if (!qf.is.generatedIdentifier(i)) {
        const n = this.parseTreeOf(i, qf.is.identifier);
        if (n) {
          const s = this.referencedValueSymbol(n);
          if (s && qf.is.symbolOfDeclarationWithCollidingName(s)) return s.valueDeclaration;
        }
      }
      return;
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
        const baseType = firstOrUndefined(qf.type.get.bases(classType));
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
    propertiesOfContainerFunction(n: qt.Declaration): qt.Symbol[] {
      const d = this.parseTreeOf(n, isFunctionDeclaration);
      if (!d) return qu.empty;
      const s = this.symbolOfNode(d);
      return (s && qf.type.get.properties(this.this.typeOfSymbol())) || qu.empty;
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
        if (constructorType && qf.type.is.constructr(constructorType)) return qt.TypeReferenceSerializationKind.TypeWithConstructSignatureAndValue;
      }
      if (!typeSymbol) return qt.TypeReferenceSerializationKind.Unknown;
      const type = this.declaredTypeOfSymbol(typeSymbol);
      if (type === errorType) return qt.TypeReferenceSerializationKind.Unknown;
      if (t.isa(qt.TypeFlags.AnyOrUnknown)) return qt.TypeReferenceSerializationKind.ObjectType;
      if (qf.type.is.assignableToKind(t, qt.TypeFlags.Void | qt.TypeFlags.Nullable | qt.TypeFlags.Never)) return qt.TypeReferenceSerializationKind.VoidNullableOrNeverType;
      if (qf.type.is.assignableToKind(t, qt.TypeFlags.BooleanLike)) return qt.TypeReferenceSerializationKind.BooleanType;
      if (qf.type.is.assignableToKind(t, qt.TypeFlags.NumberLike)) return qt.TypeReferenceSerializationKind.NumberLikeType;
      if (qf.type.is.assignableToKind(t, qt.TypeFlags.BigIntLike)) return qt.TypeReferenceSerializationKind.BigIntLikeType;
      if (qf.type.is.assignableToKind(t, qt.TypeFlags.StringLike)) return qt.TypeReferenceSerializationKind.StringLikeType;
      if (qf.type.is.tuple(t)) return qt.TypeReferenceSerializationKind.ArrayLikeType;
      if (qf.type.is.assignableToKind(t, qt.TypeFlags.ESSymbolLike)) return qt.TypeReferenceSerializationKind.ESSymbolType;
      if (qf.type.is.function(t)) return qt.TypeReferenceSerializationKind.TypeWithCallSignature;
      if (qf.type.is.array(t)) return qt.TypeReferenceSerializationKind.ArrayLikeType;
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
        const r = this.parseTreeOf(n, qf.is.identifier);
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
      const spec = d.kind === Syntax.ModuleDeclaration ? qu.tryCast(d.name, qf.is.stringLiteral) : this.externalModuleName(d);
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
