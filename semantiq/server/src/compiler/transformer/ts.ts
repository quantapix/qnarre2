import { Node, Modifier, ModifierFlags } from '../types';
import { qf, Nodes } from '../core';
import { Syntax } from '../syntax';
import * as qc from '../core';
import * as qd from '../diags';
import * as qt from '../types';
import * as qu from '../utils';
import * as qy from '../syntax';
const USE_NEW_TYPE_METADATA_FORMAT = false;
const enum TypeScriptSubstitutionFlags {
  ClassAliases = 1 << 0,
  NamespaceExports = 1 << 1,
  NonQualifiedEnumMembers = 1 << 3,
}
const enum ClassFacts {
  None = 0,
  HasStaticInitializedProperties = 1 << 0,
  HasConstructorDecorators = 1 << 1,
  HasMemberDecorators = 1 << 2,
  IsExportOfNamespace = 1 << 3,
  IsNamedExternalExport = 1 << 4,
  IsDefaultExternalExport = 1 << 5,
  IsDerivedClass = 1 << 6,
  UseImmediatelyInvokedFunctionExpression = 1 << 7,
  HasAnyDecorators = HasConstructorDecorators | HasMemberDecorators,
  NeedsName = HasStaticInitializedProperties | HasMemberDecorators,
  MayNeedImmediatelyInvokedFunctionExpression = HasAnyDecorators | HasStaticInitializedProperties,
  IsExported = IsExportOfNamespace | IsDefaultExternalExport | IsNamedExternalExport,
}
export function transformTypeScript(context: qt.TrafoContext) {
  const { startLexicalEnvironment, resumeLexicalEnvironment, endLexicalEnvironment, hoistVariableDeclaration } = context;
  const resolver = context.getEmitResolver();
  const compilerOpts = context.getCompilerOpts();
  const strictNullChecks = getStrictOptionValue(compilerOpts, 'strictNullChecks');
  const languageVersion = getEmitScriptTarget(compilerOpts);
  const moduleKind = getEmitModuleKind(compilerOpts);
  const previousOnEmitNode = context.onEmitNode;
  const previousOnSubstituteNode = context.onSubstituteNode;
  context.onEmitNode = onEmitNode;
  context.onSubstituteNode = onSubstituteNode;
  context.enableSubstitution(Syntax.PropertyAccessExpression);
  context.enableSubstitution(Syntax.ElemAccessExpression);
  let currentSourceFile: qt.SourceFile;
  let currentNamespace: qt.ModuleDeclaration;
  let currentNamespaceContainerName: qt.Identifier;
  let currentLexicalScope: qt.SourceFile | qt.Block | qt.ModuleBlock | qt.CaseBlock;
  let currentNameScope: qt.ClassDeclaration | undefined;
  let currentScopeFirstDeclarationsOfName: EscapedMap<Node> | undefined;
  let currentClassHasParamProperties: boolean | undefined;
  let enabledSubstitutions: TypeScriptSubstitutionFlags;
  let classAliases: qt.Identifier[];
  let applicableSubstitutions: TypeScriptSubstitutionFlags;
  return transformSourceFileOrBundle;
  function transformSourceFileOrBundle(node: qt.SourceFile | qt.Bundle) {
    if (node.kind === Syntax.Bundle) return transformBundle(node);
    return transformSourceFile(node);
  }
  function transformBundle(node: qt.Bundle) {
    return new qc.Bundle(
      node.sourceFiles.map(transformSourceFile),
      mapDefined(node.prepends, (prepend) => {
        if (prepend.kind === Syntax.InputFiles) return createUnparsedSourceFile(prepend, 'js');
        return prepend;
      })
    );
  }
  function transformSourceFile(node: qt.SourceFile) {
    if (node.isDeclarationFile) return node;
    currentSourceFile = node;
    const visited = saveStateAndInvoke(node, visitSourceFile);
    qf.emit.addHelpers(visited, context.readEmitHelpers());
    currentSourceFile = undefined!;
    return visited;
  }
  function saveStateAndInvoke<T>(node: Node, f: (node: Node) => T): T {
    const savedCurrentScope = currentLexicalScope;
    const savedCurrentNameScope = currentNameScope;
    const savedCurrentScopeFirstDeclarationsOfName = currentScopeFirstDeclarationsOfName;
    const savedCurrentClassHasParamProperties = currentClassHasParamProperties;
    onBeforeVisitNode(node);
    const visited = f(node);
    if (currentLexicalScope !== savedCurrentScope) {
      currentScopeFirstDeclarationsOfName = savedCurrentScopeFirstDeclarationsOfName;
    }
    currentLexicalScope = savedCurrentScope;
    currentNameScope = savedCurrentNameScope;
    currentClassHasParamProperties = savedCurrentClassHasParamProperties;
    return visited;
  }
  function onBeforeVisitNode(node: Node) {
    switch (node.kind) {
      case Syntax.SourceFile:
      case Syntax.CaseBlock:
      case Syntax.ModuleBlock:
      case Syntax.Block:
        currentLexicalScope = <qt.SourceFile | qt.CaseBlock | qt.ModuleBlock | qt.Block>node;
        currentNameScope = undefined;
        currentScopeFirstDeclarationsOfName = undefined;
        break;
      case Syntax.ClassDeclaration:
      case Syntax.FunctionDeclaration:
        if (qf.has.syntacticModifier(node, ModifierFlags.Ambient)) {
          break;
        }
        if ((node as qt.ClassDeclaration | qt.FunctionDeclaration).name) {
          recordEmittedDeclarationInScope(node as qt.ClassDeclaration | qt.FunctionDeclaration);
        } else {
          assert(node.kind === Syntax.ClassDeclaration || qf.has.syntacticModifier(node, ModifierFlags.Default));
        }
        if (qf.is.kind(qc.ClassDeclaration, node)) {
          currentNameScope = node;
        }
        break;
    }
  }
  function visitor(node: Node): VisitResult<Node> {
    return saveStateAndInvoke(node, visitorWorker);
  }
  function visitorWorker(node: Node): VisitResult<Node> {
    if (node.trafoFlags & TrafoFlags.ContainsTypeScript) return visitTypeScript(node);
    return node;
  }
  function sourceElemVisitor(node: Node): VisitResult<Node> {
    return saveStateAndInvoke(node, sourceElemVisitorWorker);
  }
  function sourceElemVisitorWorker(node: Node): VisitResult<Node> {
    switch (node.kind) {
      case Syntax.ImportDeclaration:
      case Syntax.ImportEqualsDeclaration:
      case Syntax.ExportAssignment:
      case Syntax.ExportDeclaration:
        return visitEllidableStatement(<qt.ImportDeclaration | qt.ImportEqualsDeclaration | qt.ExportAssignment | qt.ExportDeclaration>node);
      default:
        return visitorWorker(node);
    }
  }
  function visitEllidableStatement(node: qt.ImportDeclaration | qt.ImportEqualsDeclaration | qt.ExportAssignment | qt.ExportDeclaration): VisitResult<Node> {
    const parsed = qf.get.parseTreeOf(node);
    if (parsed !== node) {
      if (node.trafoFlags & TrafoFlags.ContainsTypeScript) return visitEachChild(node, visitor, context);
      return node;
    }
    switch (node.kind) {
      case Syntax.ImportDeclaration:
        return visitImportDeclaration(node);
      case Syntax.ImportEqualsDeclaration:
        return visitImportEqualsDeclaration(node);
      case Syntax.ExportAssignment:
        return visitExportAssignment(node);
      case Syntax.ExportDeclaration:
        return visitExportDeclaration(node);
      default:
        fail('Unhandled ellided statement');
    }
  }
  function namespaceElemVisitor(node: Node): VisitResult<Node> {
    return saveStateAndInvoke(node, namespaceElemVisitorWorker);
  }
  function namespaceElemVisitorWorker(node: Node): VisitResult<Node> {
    if (
      node.kind === Syntax.ExportDeclaration ||
      node.kind === Syntax.ImportDeclaration ||
      node.kind === Syntax.ImportClause ||
      (node.kind === Syntax.ImportEqualsDeclaration && (<qt.ImportEqualsDeclaration>node).moduleReference.kind === Syntax.ExternalModuleReference)
    ) {
      return;
    } else if (node.trafoFlags & TrafoFlags.ContainsTypeScript || qf.has.syntacticModifier(node, ModifierFlags.Export)) {
      return visitTypeScript(node);
    }
    return node;
  }
  function classElemVisitor(node: Node): VisitResult<Node> {
    return saveStateAndInvoke(node, classElemVisitorWorker);
  }
  function classElemVisitorWorker(node: Node): VisitResult<Node> {
    switch (node.kind) {
      case Syntax.Constructor:
        return visitConstructor(node as qt.ConstructorDeclaration);
      case Syntax.PropertyDeclaration:
        return visitPropertyDeclaration(node as qt.PropertyDeclaration);
      case Syntax.IndexSignature:
      case Syntax.GetAccessor:
      case Syntax.SetAccessor:
      case Syntax.MethodDeclaration:
        return visitorWorker(node);
      case Syntax.SemicolonClassElem:
        return node;
      default:
        return Debug.failBadSyntax(node);
    }
  }
  function modifierVisitor(node: Node): VisitResult<Node> {
    if (syntax.get.modifierFlag(node.kind) & ModifierFlags.TypeScriptModifier) {
      return;
    } else if (currentNamespace && node.kind === Syntax.ExportKeyword) {
      return;
    }
    return node;
  }
  function visitTypeScript(node: Node): VisitResult<Node> {
    if (qf.is.statement(node) && qf.has.syntacticModifier(node, ModifierFlags.Ambient)) return new qc.NotEmittedStatement(node);
    switch (node.kind) {
      case Syntax.ExportKeyword:
      case Syntax.DefaultKeyword:
        return currentNamespace ? undefined : node;
      case Syntax.PublicKeyword:
      case Syntax.PrivateKeyword:
      case Syntax.ProtectedKeyword:
      case Syntax.AbstractKeyword:
      case Syntax.ConstKeyword:
      case Syntax.DeclareKeyword:
      case Syntax.ReadonlyKeyword:
      case Syntax.ArrayTyping:
      case Syntax.TupleTyping:
      case Syntax.OptionalTyping:
      case Syntax.RestTyping:
      case Syntax.TypingLiteral:
      case Syntax.TypingPredicate:
      case Syntax.TypeParam:
      case Syntax.AnyKeyword:
      case Syntax.UnknownKeyword:
      case Syntax.BooleanKeyword:
      case Syntax.StringKeyword:
      case Syntax.NumberKeyword:
      case Syntax.NeverKeyword:
      case Syntax.VoidKeyword:
      case Syntax.SymbolKeyword:
      case Syntax.ConstructorTyping:
      case Syntax.FunctionTyping:
      case Syntax.TypingQuery:
      case Syntax.TypingReference:
      case Syntax.UnionTyping:
      case Syntax.IntersectionTyping:
      case Syntax.ConditionalTyping:
      case Syntax.ParenthesizedTyping:
      case Syntax.ThisTyping:
      case Syntax.TypingOperator:
      case Syntax.IndexedAccessTyping:
      case Syntax.MappedTyping:
      case Syntax.LiteralTyping:
      case Syntax.IndexSignature:
      case Syntax.Decorator:
      case Syntax.TypeAliasDeclaration:
        return;
      case Syntax.PropertyDeclaration:
        return visitPropertyDeclaration(node as qt.PropertyDeclaration);
      case Syntax.NamespaceExportDeclaration:
        return;
      case Syntax.Constructor:
        return visitConstructor(<qt.ConstructorDeclaration>node);
      case Syntax.InterfaceDeclaration:
        return new qc.NotEmittedStatement(node);
      case Syntax.ClassDeclaration:
        return visitClassDeclaration(<qt.ClassDeclaration>node);
      case Syntax.ClassExpression:
        return visitClassExpression(<qt.ClassExpression>node);
      case Syntax.HeritageClause:
        return visitHeritageClause(<qt.HeritageClause>node);
      case Syntax.ExpressionWithTypings:
        return visitExpressionWithTypings(<qt.ExpressionWithTypings>node);
      case Syntax.MethodDeclaration:
        return visitMethodDeclaration(<qt.MethodDeclaration>node);
      case Syntax.GetAccessor:
        return visitGetAccessor(<qt.GetAccessorDeclaration>node);
      case Syntax.SetAccessor:
        return visitSetAccessor(<qt.SetAccessorDeclaration>node);
      case Syntax.FunctionDeclaration:
        return visitFunctionDeclaration(<qt.FunctionDeclaration>node);
      case Syntax.FunctionExpression:
        return visitFunctionExpression(<qt.FunctionExpression>node);
      case Syntax.ArrowFunction:
        return visitArrowFunction(<qt.ArrowFunction>node);
      case Syntax.Param:
        return visitParam(<qt.ParamDeclaration>node);
      case Syntax.ParenthesizedExpression:
        return visitParenthesizedExpression(<qt.ParenthesizedExpression>node);
      case Syntax.TypeAssertionExpression:
      case Syntax.AsExpression:
        return visitAssertionExpression(<qt.AssertionExpression>node);
      case Syntax.CallExpression:
        return visitCallExpression(<qt.CallExpression>node);
      case Syntax.NewExpression:
        return visitNewExpression(<qt.NewExpression>node);
      case Syntax.TaggedTemplateExpression:
        return visitTaggedTemplateExpression(<qt.TaggedTemplateExpression>node);
      case Syntax.NonNullExpression:
        return visitNonNullExpression(<qt.NonNullExpression>node);
      case Syntax.EnumDeclaration:
        return visitEnumDeclaration(<qt.EnumDeclaration>node);
      case Syntax.VariableStatement:
        return visitVariableStatement(<qt.VariableStatement>node);
      case Syntax.VariableDeclaration:
        return visitVariableDeclaration(<qt.VariableDeclaration>node);
      case Syntax.ModuleDeclaration:
        return visitModuleDeclaration(<qt.ModuleDeclaration>node);
      case Syntax.ImportEqualsDeclaration:
        return visitImportEqualsDeclaration(<qt.ImportEqualsDeclaration>node);
      case Syntax.JsxSelfClosingElem:
        return visitJsxSelfClosingElem(<qt.JsxSelfClosingElem>node);
      case Syntax.JsxOpeningElem:
        return visitJsxJsxOpeningElem(<qt.JsxOpeningElem>node);
      default:
        return visitEachChild(node, visitor, context);
    }
  }
  function visitSourceFile(node: qt.SourceFile) {
    const alwaysStrict = getStrictOptionValue(compilerOpts, 'alwaysStrict') && !(qf.is.externalModule(node) && moduleKind >= ModuleKind.ES2015) && !qf.is.jsonSourceFile(node);
    return qp_updateSourceNode(node, visitLexicalEnvironment(node.statements, sourceElemVisitor, context, 0, alwaysStrict));
  }
  function shouldEmitDecorateCallForClass(node: qt.ClassDeclaration) {
    if (node.decorators && node.decorators.length > 0) return true;
    const constructor = qf.get.firstConstructorWithBody(node);
    if (constructor) return forEach(constructor.params, shouldEmitDecorateCallForParam);
    return false;
  }
  function shouldEmitDecorateCallForParam(param: qt.ParamDeclaration) {
    return param.decorators !== undefined && param.decorators.length > 0;
  }
  function getClassFacts(node: qt.ClassDeclaration, staticProperties: readonly qt.PropertyDeclaration[]) {
    let facts = ClassFacts.None;
    if (some(staticProperties)) facts |= ClassFacts.HasStaticInitializedProperties;
    const extendsClauseElem = qf.get.effectiveBaseTypeNode(node);
    if (extendsClauseElem && qf.skip.outerExpressions(extendsClauseElem.expression).kind !== Syntax.NullKeyword) facts |= ClassFacts.IsDerivedClass;
    if (shouldEmitDecorateCallForClass(node)) facts |= ClassFacts.HasConstructorDecorators;
    if (childIsDecorated(node)) facts |= ClassFacts.HasMemberDecorators;
    if (isExportOfNamespace(node)) facts |= ClassFacts.IsExportOfNamespace;
    else if (isDefaultExternalModuleExport(node)) facts |= ClassFacts.IsDefaultExternalExport;
    else if (isNamedExternalModuleExport(node)) facts |= ClassFacts.IsNamedExternalExport;
    if (languageVersion <= ScriptTarget.ES5 && facts & ClassFacts.MayNeedImmediatelyInvokedFunctionExpression) facts |= ClassFacts.UseImmediatelyInvokedFunctionExpression;
    return facts;
  }
  function hasTypeScriptClassSyntax(node: Node) {
    return !!(node.trafoFlags & TrafoFlags.ContainsTypeScriptClassSyntax);
  }
  function isClassLikeDeclarationWithTypeScriptSyntax(node: ClassLikeDeclaration) {
    return some(node.decorators) || some(node.typeParams) || some(node.heritageClauses, hasTypeScriptClassSyntax) || some(node.members, hasTypeScriptClassSyntax);
  }
  function visitClassDeclaration(node: qt.ClassDeclaration): VisitResult<Statement> {
    if (!isClassLikeDeclarationWithTypeScriptSyntax(node) && !(currentNamespace && qf.has.syntacticModifier(node, ModifierFlags.Export))) return visitEachChild(node, visitor, context);
    const staticProperties = getProperties(node, true);
    const facts = getClassFacts(node, staticProperties);
    if (facts & ClassFacts.UseImmediatelyInvokedFunctionExpression) {
      context.startLexicalEnvironment();
    }
    const name = node.name || (facts & ClassFacts.NeedsName ? qf.get.generatedNameForNode(node) : undefined);
    const classStatement = facts & ClassFacts.HasConstructorDecorators ? createClassDeclarationHeadWithDecorators(node, name) : createClassDeclarationHeadWithoutDecorators(node, name, facts);
    let statements: Statement[] = [classStatement];
    addClassElemDecorationStatements(statements, node, false);
    addClassElemDecorationStatements(statements, node, true);
    addConstructorDecorationStatement(statements, node);
    if (facts & ClassFacts.UseImmediatelyInvokedFunctionExpression) {
      const closingBraceLocation = qf.create.tokenRange(syntax.skipTrivia(currentSourceFile.text, node.members.end), Syntax.CloseBraceToken);
      const localName = qf.decl.internalName(node);
      const outer = new qc.PartiallyEmittedExpression(localName);
      outer.end = closingBraceLocation.end;
      qf.emit.setFlags(outer, EmitFlags.NoComments);
      const statement = new qc.ReturnStatement(outer);
      statement.pos = closingBraceLocation.pos;
      qf.emit.setFlags(statement, EmitFlags.NoComments | EmitFlags.NoTokenSourceMaps);
      statements.push(statement);
      insertStatementsAfterStandardPrologue(statements, context.endLexicalEnvironment());
      const iife = qf.create.immediateArrowFunction(statements);
      qf.emit.setFlags(iife, EmitFlags.TypeScriptClassWrapper);
      const varStatement = new qc.VariableStatement(undefined, new qc.VariableDeclarationList([new qc.VariableDeclaration(qf.decl.localName(node, false, false), undefined, iife)]));
      varStatement.setOriginal(node);
      qf.emit.setCommentRange(varStatement, node);
      qf.emit.setSourceMapRange(varStatement, node.movePastDecorators());
      qf.emit.setStartsOnNewLine(varStatement);
      statements = [varStatement];
    }
    if (facts & ClassFacts.IsExportOfNamespace) {
      addExportMemberAssignment(statements, node);
    } else if (facts & ClassFacts.UseImmediatelyInvokedFunctionExpression || facts & ClassFacts.HasConstructorDecorators) {
      if (facts & ClassFacts.IsDefaultExternalExport) {
        statements.push(qf.create.exportDefault(qf.decl.localName(node, false, true)));
      } else if (facts & ClassFacts.IsNamedExternalExport) {
        statements.push(qf.create.externalModuleExport(qf.decl.localName(node, false, true)));
      }
    }
    if (statements.length > 1) {
      statements.push(new qt.EndOfDeclarationMarker(node));
      qf.emit.setFlags(classStatement, qf.get.emitFlags(classStatement) | EmitFlags.HasEndOfDeclarationMarker);
    }
    return singleOrMany(statements);
  }
  function createClassDeclarationHeadWithoutDecorators(node: qt.ClassDeclaration, name: qt.Identifier | undefined, facts: ClassFacts) {
    const modifiers = !(facts & ClassFacts.UseImmediatelyInvokedFunctionExpression) ? Nodes.visit(node.modifiers, modifierVisitor, isModifier) : undefined;
    const classDeclaration = new qc.ClassDeclaration(undefined, modifiers, name, undefined, Nodes.visit(node.heritageClauses, visitor, isHeritageClause), transformClassMembers(node));
    let emitFlags = qf.get.emitFlags(node);
    if (facts & ClassFacts.HasStaticInitializedProperties) {
      emitFlags |= EmitFlags.NoTrailingSourceMap;
    }
    qf.calc.aggregate(classDeclaration);
    classDeclaration.setRange(node);
    classDeclaration.setOriginal(node);
    qf.emit.setFlags(classDeclaration, emitFlags);
    return classDeclaration;
  }
  function createClassDeclarationHeadWithDecorators(node: qt.ClassDeclaration, name: qt.Identifier | undefined) {
    const location = node.movePastDecorators();
    const classAlias = getClassAliasIfNeeded(node);
    const declName = qf.decl.localName(node, false, true);
    const heritageClauses = Nodes.visit(node.heritageClauses, visitor, isHeritageClause);
    const members = transformClassMembers(node);
    const classExpression = new qc.ClassExpression(undefined, name, undefined, heritageClauses, members);
    qf.calc.aggregate(classExpression);
    classExpression.setOriginal(node);
    classExpression.setRange(location);
    const statement = new qc.VariableStatement(
      undefined,
      new qc.VariableDeclarationList([new qc.VariableDeclaration(declName, undefined, classAlias ? qf.create.assignment(classAlias, classExpression) : classExpression)], NodeFlags.Let)
    );
    statement.setOriginal(node);
    statement.setRange(location);
    qf.emit.setCommentRange(statement, node);
    return statement;
  }
  function visitClassExpression(node: qt.ClassExpression): Expression {
    if (!isClassLikeDeclarationWithTypeScriptSyntax(node)) return visitEachChild(node, visitor, context);
    const classExpression = new qc.ClassExpression(undefined, node.name, undefined, Nodes.visit(node.heritageClauses, visitor, isHeritageClause), transformClassMembers(node));
    qf.calc.aggregate(classExpression);
    classExpression.setOriginal(node);
    classExpression.setRange(node);
    return classExpression;
  }
  function transformClassMembers(node: qt.ClassDeclaration | qt.ClassExpression) {
    const members: qt.ClassElem[] = [];
    const constructor = qf.get.firstConstructorWithBody(node);
    const paramsWithPropertyAssignments = constructor && filter(constructor.params, (p) => qf.is.paramPropertyDeclaration(p, constructor));
    if (paramsWithPropertyAssignments) {
      for (const param of paramsWithPropertyAssignments) {
        if (qf.is.kind(qc.Identifier, param.name)) {
          members.push(qf.calc.aggregate(PropertyDeclaration.create(undefined, undefined, param.name, undefined, undefined, undefined)).setOriginal(param));
        }
      }
    }
    qu.addRange(members, Nodes.visit(node.members, classElemVisitor, isClassElem));
    return setRange(new Nodes(members), node.members);
  }
  function getDecoratedClassElems(node: qt.ClassExpression | qt.ClassDeclaration, isStatic: boolean): readonly qt.ClassElem[] {
    return filter(node.members, isStatic ? (m) => isStaticDecoratedClassElem(m, node) : (m) => isInstanceDecoratedClassElem(m, node));
  }
  function isStaticDecoratedClassElem(member: qt.ClassElem, parent: ClassLikeDeclaration) {
    return isDecoratedClassElem(member, true, parent);
  }
  function isInstanceDecoratedClassElem(member: qt.ClassElem, parent: ClassLikeDeclaration) {
    return isDecoratedClassElem(member, false, parent);
  }
  function isDecoratedClassElem(member: qt.ClassElem, isStatic: boolean, parent: ClassLikeDeclaration) {
    return nodeOrChildIsDecorated(member, parent) && isStatic === qf.has.syntacticModifier(member, ModifierFlags.Static);
  }
  interface AllDecorators {
    decorators: readonly qt.Decorator[] | undefined;
    params?: readonly (readonly qt.Decorator[] | undefined)[];
  }
  function getDecoratorsOfParams(node: FunctionLikeDeclaration | undefined) {
    let decorators: (readonly qt.Decorator[] | undefined)[] | undefined;
    if (node) {
      const params = node.params;
      const firstParamIsThis = params.length > 0 && paramIsThsyntax.is.keyword(params[0]);
      const firstParamOffset = firstParamIsThis ? 1 : 0;
      const numParams = firstParamIsThis ? params.length - 1 : params.length;
      for (let i = 0; i < numParams; i++) {
        const param = params[i + firstParamOffset];
        if (decorators || param.decorators) {
          if (!decorators) {
            decorators = new Array(numParams);
          }
          decorators[i] = param.decorators;
        }
      }
    }
    return decorators;
  }
  function getAllDecoratorsOfConstructor(node: qt.ClassExpression | qt.ClassDeclaration): AllDecorators | undefined {
    const decorators = node.decorators;
    const params = getDecoratorsOfParams(qf.get.firstConstructorWithBody(node));
    if (!decorators && !params) {
      return;
    }
    return {
      decorators,
      params,
    };
  }
  function getAllDecoratorsOfClassElem(node: qt.ClassExpression | qt.ClassDeclaration, member: qt.ClassElem): AllDecorators | undefined {
    switch (member.kind) {
      case Syntax.GetAccessor:
      case Syntax.SetAccessor:
        return getAllDecoratorsOfAccessors(node, <qt.AccessorDeclaration>member);
      case Syntax.MethodDeclaration:
        return getAllDecoratorsOfMethod(<qt.MethodDeclaration>member);
      case Syntax.PropertyDeclaration:
        return getAllDecoratorsOfProperty(<qt.PropertyDeclaration>member);
      default:
        return;
    }
  }
  function getAllDecoratorsOfAccessors(node: qt.ClassExpression | qt.ClassDeclaration, accessor: qt.AccessorDeclaration): AllDecorators | undefined {
    if (!accessor.body) {
      return;
    }
    const { firstAccessor, secondAccessor, setAccessor } = qf.get.allAccessorDeclarations(node.members, accessor);
    const firstAccessorWithDecorators = firstAccessor.decorators ? firstAccessor : secondAccessor && secondAccessor.decorators ? secondAccessor : undefined;
    if (!firstAccessorWithDecorators || accessor !== firstAccessorWithDecorators) {
      return;
    }
    const decorators = firstAccessorWithDecorators.decorators;
    const params = getDecoratorsOfParams(setAccessor);
    if (!decorators && !params) {
      return;
    }
    return { decorators, params };
  }
  function getAllDecoratorsOfMethod(method: qt.MethodDeclaration): AllDecorators | undefined {
    if (!method.body) {
      return;
    }
    const decorators = method.decorators;
    const params = getDecoratorsOfParams(method);
    if (!decorators && !params) {
      return;
    }
    return { decorators, params };
  }
  function getAllDecoratorsOfProperty(property: qt.PropertyDeclaration): AllDecorators | undefined {
    const decorators = property.decorators;
    if (!decorators) {
      return;
    }
    return { decorators };
  }
  function transformAllDecoratorsOfDeclaration(node: Declaration, container: ClassLikeDeclaration, allDecorators: AllDecorators | undefined) {
    if (!allDecorators) {
      return;
    }
    const decoratorExpressions: Expression[] = [];
    qu.addRange(decoratorExpressions, map(allDecorators.decorators, transformDecorator));
    qu.addRange(decoratorExpressions, flatMap(allDecorators.params, transformDecoratorsOfParam));
    addTypeMetadata(node, container, decoratorExpressions);
    return decoratorExpressions;
  }
  function addClassElemDecorationStatements(statements: Statement[], node: qt.ClassDeclaration, isStatic: boolean) {
    qu.addRange(statements, map(generateClassElemDecorationExpressions(node, isStatic), expressionToStatement));
  }
  function generateClassElemDecorationExpressions(node: qt.ClassExpression | qt.ClassDeclaration, isStatic: boolean) {
    const members = getDecoratedClassElems(node, isStatic);
    let expressions: Expression[] | undefined;
    for (const member of members) {
      const expression = generateClassElemDecorationExpression(node, member);
      if (expression) {
        if (!expressions) {
          expressions = [expression];
        } else {
          expressions.push(expression);
        }
      }
    }
    return expressions;
  }
  function generateClassElemDecorationExpression(node: qt.ClassExpression | qt.ClassDeclaration, member: qt.ClassElem) {
    const allDecorators = getAllDecoratorsOfClassElem(node, member);
    const decoratorExpressions = transformAllDecoratorsOfDeclaration(member, node, allDecorators);
    if (!decoratorExpressions) {
      return;
    }
    const prefix = getClassMemberPrefix(node, member);
    const memberName = getExpressionForPropertyName(member, true);
    const descriptor = languageVersion > ScriptTarget.ES3 ? (member.kind === Syntax.PropertyDeclaration ? qc.VoidExpression.zero() : new qc.NullLiteral()) : undefined;
    const helper = createDecorateHelper(context, decoratorExpressions, prefix, memberName, descriptor, member.movePastDecorators());
    qf.emit.setFlags(helper, EmitFlags.NoComments);
    return helper;
  }
  function addConstructorDecorationStatement(statements: Statement[], node: qt.ClassDeclaration) {
    const expression = generateConstructorDecorationExpression(node);
    if (expression) {
      statements.push(new qc.ExpressionStatement(expression).setOriginal(node));
    }
  }
  function generateConstructorDecorationExpression(node: qt.ClassExpression | qt.ClassDeclaration) {
    const allDecorators = getAllDecoratorsOfConstructor(node);
    const decoratorExpressions = transformAllDecoratorsOfDeclaration(node, node, allDecorators);
    if (!decoratorExpressions) {
      return;
    }
    const classAlias = classAliases && classAliases[getOriginalNodeId(node)];
    const localName = qf.decl.localName(node, false, true);
    const decorate = createDecorateHelper(context, decoratorExpressions, localName);
    const expression = qf.create.assignment(localName, classAlias ? qf.create.assignment(classAlias, decorate) : decorate);
    qf.emit.setFlags(expression, EmitFlags.NoComments);
    qf.emit.setSourceMapRange(expression, node.movePastDecorators());
    return expression;
  }
  function transformDecorator(decorator: qt.Decorator) {
    return visitNode(decorator.expression, visitor, isExpression);
  }
  function transformDecoratorsOfParam(decorators: qt.Decorator[], paramOffset: number) {
    let expressions: Expression[] | undefined;
    if (decorators) {
      expressions = [];
      for (const decorator of decorators) {
        const helper = createParamHelper(context, transformDecorator(decorator), paramOffset, decorator.expression);
        qf.emit.setFlags(helper, EmitFlags.NoComments);
        expressions.push(helper);
      }
    }
    return expressions;
  }
  function addTypeMetadata(node: Declaration, container: ClassLikeDeclaration, decoratorExpressions: Expression[]) {
    if (USE_NEW_TYPE_METADATA_FORMAT) {
      addNewTypeMetadata(node, container, decoratorExpressions);
    } else {
      addOldTypeMetadata(node, container, decoratorExpressions);
    }
  }
  function addOldTypeMetadata(node: Declaration, container: ClassLikeDeclaration, decoratorExpressions: Expression[]) {
    if (compilerOpts.emitDecoratorMetadata) {
      if (shouldAddTypeMetadata(node)) {
        decoratorExpressions.push(createMetadataHelper(context, 'design:type', serializeTypeOfNode(node)));
      }
      if (shouldAddParamTypesMetadata(node)) {
        decoratorExpressions.push(createMetadataHelper(context, 'design:paramtypes', serializeParamTypesOfNode(node, container)));
      }
      if (shouldAddReturnTypeMetadata(node)) {
        decoratorExpressions.push(createMetadataHelper(context, 'design:returntype', serializeReturnTypeOfNode(node)));
      }
    }
  }
  function addNewTypeMetadata(node: Declaration, container: ClassLikeDeclaration, decoratorExpressions: Expression[]) {
    if (compilerOpts.emitDecoratorMetadata) {
      let properties: ObjectLiteralElemLike[] | undefined;
      if (shouldAddTypeMetadata(node)) {
        (properties || (properties = [])).push(
          new qc.PropertyAssignment('type', new qt.ArrowFunction(undefined, undefined, [], undefined, new qt.Token(Syntax.EqualsGreaterThanToken), serializeTypeOfNode(node)))
        );
      }
      if (shouldAddParamTypesMetadata(node)) {
        (properties || (properties = [])).push(
          new qc.PropertyAssignment('paramTypes', new qt.ArrowFunction(undefined, undefined, [], undefined, new qt.Token(Syntax.EqualsGreaterThanToken), serializeParamTypesOfNode(node, container)))
        );
      }
      if (shouldAddReturnTypeMetadata(node)) {
        (properties || (properties = [])).push(
          new qc.PropertyAssignment('returnType', new qt.ArrowFunction(undefined, undefined, [], undefined, new qt.Token(Syntax.EqualsGreaterThanToken), serializeReturnTypeOfNode(node)))
        );
      }
      if (properties) {
        decoratorExpressions.push(createMetadataHelper(context, 'design:typeinfo', new qc.ObjectLiteralExpression(properties, true)));
      }
    }
  }
  function shouldAddTypeMetadata(node: Declaration): boolean {
    const kind = node.kind;
    return kind === Syntax.MethodDeclaration || kind === Syntax.GetAccessor || kind === Syntax.SetAccessor || kind === Syntax.PropertyDeclaration;
  }
  function shouldAddReturnTypeMetadata(node: Declaration): boolean {
    return node.kind === Syntax.MethodDeclaration;
  }
  function shouldAddParamTypesMetadata(node: Declaration): boolean {
    switch (node.kind) {
      case Syntax.ClassDeclaration:
      case Syntax.ClassExpression:
        return qf.get.firstConstructorWithBody(<ClassLikeDeclaration>node) !== undefined;
      case Syntax.MethodDeclaration:
      case Syntax.GetAccessor:
      case Syntax.SetAccessor:
        return true;
    }
    return false;
  }
  type SerializedEntityNameAsExpression = qt.Identifier | qt.BinaryExpression | qt.PropertyAccessExpression;
  type SerializedTypeNode = SerializedEntityNameAsExpression | qt.VoidExpression | qt.ConditionalExpression;
  function getAccessorTypeNode(node: qt.AccessorDeclaration) {
    const accessors = resolver.qf.get.allAccessorDeclarations(node);
    return (accessors.setAccessor && qf.get.setAccessorTypeAnnotationNode(accessors.setAccessor)) || (accessors.getAccessor && qf.get.effectiveReturnTypeNode(accessors.getAccessor));
  }
  function serializeTypeOfNode(node: Node): SerializedTypeNode {
    switch (node.kind) {
      case Syntax.PropertyDeclaration:
      case Syntax.Param:
        return serializeTypeNode((<qt.PropertyDeclaration | qt.ParamDeclaration | qt.GetAccessorDeclaration>node).type);
      case Syntax.SetAccessor:
      case Syntax.GetAccessor:
        return serializeTypeNode(getAccessorTypeNode(node as qt.AccessorDeclaration));
      case Syntax.ClassDeclaration:
      case Syntax.ClassExpression:
      case Syntax.MethodDeclaration:
        return new qt.Identifier('Function');
      default:
        return qc.VoidExpression.zero();
    }
  }
  function serializeParamTypesOfNode(node: Node, container: ClassLikeDeclaration): qt.ArrayLiteralExpression {
    const valueDeclaration = qf.is.classLike(node) ? qf.get.firstConstructorWithBody(node) : qf.is.functionLike(node) && qf.is.present((node as FunctionLikeDeclaration).body) ? node : undefined;
    const expressions: SerializedTypeNode[] = [];
    if (valueDeclaration) {
      const params = getParamsOfDecoratedDeclaration(valueDeclaration, container);
      const numParams = params.length;
      for (let i = 0; i < numParams; i++) {
        const param = params[i];
        if (i === 0 && qf.is.kind(qc.Identifier, param.name) && param.name.escapedText === 'this') {
          continue;
        }
        if (param.dot3Token) {
          expressions.push(serializeTypeNode(qf.get.restParamElemType(param.type)));
        } else {
          expressions.push(serializeTypeOfNode(param));
        }
      }
    }
    return new qt.ArrayLiteralExpression(expressions);
  }
  function getParamsOfDecoratedDeclaration(node: SignatureDeclaration, container: ClassLikeDeclaration) {
    if (container && node.kind === Syntax.GetAccessor) {
      const { setAccessor } = qf.get.allAccessorDeclarations(container.members, <qt.AccessorDeclaration>node);
      if (setAccessor) return setAccessor.params;
    }
    return node.params;
  }
  function serializeReturnTypeOfNode(node: Node): SerializedTypeNode {
    if (qf.is.functionLike(node) && node.type) return serializeTypeNode(node.type);
    else if (qf.is.asyncFunction(node)) return new qt.Identifier('Promise');
    return qc.VoidExpression.zero();
  }
  function serializeTypeNode(node: Typing | undefined): SerializedTypeNode {
    if (node === undefined) return new qt.Identifier('Object');
    switch (node.kind) {
      case Syntax.VoidKeyword:
      case Syntax.UndefinedKeyword:
      case Syntax.NullKeyword:
      case Syntax.NeverKeyword:
        return qc.VoidExpression.zero();
      case Syntax.ParenthesizedTyping:
        return serializeTypeNode((<qt.ParenthesizedTyping>node).type);
      case Syntax.FunctionTyping:
      case Syntax.ConstructorTyping:
        return new qt.Identifier('Function');
      case Syntax.ArrayTyping:
      case Syntax.TupleTyping:
        return new qt.Identifier('Array');
      case Syntax.TypingPredicate:
      case Syntax.BooleanKeyword:
        return new qt.Identifier('Boolean');
      case Syntax.StringKeyword:
        return new qt.Identifier('String');
      case Syntax.ObjectKeyword:
        return new qt.Identifier('Object');
      case Syntax.LiteralTyping:
        switch ((<qt.LiteralTyping>node).literal.kind) {
          case Syntax.StringLiteral:
            return new qt.Identifier('String');
          case Syntax.PrefixUnaryExpression:
          case Syntax.NumericLiteral:
            return new qt.Identifier('Number');
          case Syntax.BigIntLiteral:
            return getGlobalBigIntNameWithFallback();
          case Syntax.TrueKeyword:
          case Syntax.FalseKeyword:
            return new qt.Identifier('Boolean');
          default:
            return Debug.failBadSyntax((<qt.LiteralTyping>node).literal);
        }
      case Syntax.NumberKeyword:
        return new qt.Identifier('Number');
      case Syntax.BigIntKeyword:
        return getGlobalBigIntNameWithFallback();
      case Syntax.SymbolKeyword:
        return languageVersion < ScriptTarget.ES2015 ? getGlobalSymbolNameWithFallback() : new qt.Identifier('Symbol');
      case Syntax.TypingReference:
        return serializeTypingReference(<qt.TypingReference>node);
      case Syntax.IntersectionTyping:
      case Syntax.UnionTyping:
        return serializeTypeList((<UnionOrIntersectionTyping>node).types);
      case Syntax.ConditionalTyping:
        return serializeTypeList([(<qt.ConditionalTyping>node).trueType, (<qt.ConditionalTyping>node).falseType]);
      case Syntax.TypingOperator:
        if ((<qt.TypingOperator>node).operator === Syntax.ReadonlyKeyword) return serializeTypeNode((<qt.TypingOperator>node).type);
        break;
      case Syntax.TypingQuery:
      case Syntax.IndexedAccessTyping:
      case Syntax.MappedTyping:
      case Syntax.TypingLiteral:
      case Syntax.AnyKeyword:
      case Syntax.UnknownKeyword:
      case Syntax.ThisTyping:
      case Syntax.ImportTyping:
        break;
      case Syntax.DocAllTyping:
      case Syntax.DocUnknownTyping:
      case Syntax.DocFunctionTyping:
      case Syntax.DocVariadicTyping:
      case Syntax.DocNamepathTyping:
        break;
      case Syntax.DocNullableTyping:
      case Syntax.DocNonNullableTyping:
      case Syntax.DocOptionalTyping:
        return serializeTypeNode((<qt.DocNullableTyping | qt.DocNonNullableTyping | qt.DocOptionalTyping>node).type);
      default:
        return Debug.failBadSyntax(node);
    }
    return new qt.Identifier('Object');
  }
  function serializeTypeList(types: readonly Typing[]): SerializedTypeNode {
    let serializedUnion: SerializedTypeNode | undefined;
    for (let typeNode of types) {
      while (typeNode.kind === Syntax.ParenthesizedTyping) {
        typeNode = (typeNode as qt.ParenthesizedTyping).type;
      }
      if (typeNode.kind === Syntax.NeverKeyword) {
        continue;
      }
      if (!strictNullChecks && (typeNode.kind === Syntax.NullKeyword || typeNode.kind === Syntax.UndefinedKeyword)) {
        continue;
      }
      const serializedIndividual = serializeTypeNode(typeNode);
      if (qf.is.kind(qc.Identifier, serializedIndividual) && serializedIndividual.escapedText === 'Object') return serializedIndividual;
      else if (serializedUnion) {
        if (!qf.is.kind(qc.Identifier, serializedUnion) || !qf.is.kind(qc.Identifier, serializedIndividual) || serializedUnion.escapedText !== serializedIndividual.escapedText)
          return new qt.Identifier('Object');
      } else {
        serializedUnion = serializedIndividual;
      }
    }
    return serializedUnion || qc.VoidExpression.zero();
  }
  function serializeTypingReference(node: qt.TypingReference): SerializedTypeNode {
    const kind = resolver.getTypeReferenceSerializationKind(node.typeName, currentNameScope || currentLexicalScope);
    switch (kind) {
      case TypeReferenceSerializationKind.Unknown:
        if (qc.findAncestor(node, (n) => n.parent && qf.is.kind(qc.ConditionalTyping, n.parent) && (n.parent.trueType === n || n.parent.falseType === n))) return new qt.Identifier('Object');
        const serialized = serializeEntityNameAsExpressionFallback(node.typeName);
        const temp = createTempVariable(hoistVariableDeclaration);
        return new qc.ConditionalExpression(createTypeCheck(qf.create.assignment(temp, serialized), 'function'), temp, new qt.Identifier('Object'));
      case TypeReferenceSerializationKind.TypeWithConstructSignatureAndValue:
        return serializeEntityNameAsExpression(node.typeName);
      case TypeReferenceSerializationKind.VoidNullableOrNeverType:
        return qc.VoidExpression.zero();
      case TypeReferenceSerializationKind.BigIntLikeType:
        return getGlobalBigIntNameWithFallback();
      case TypeReferenceSerializationKind.BooleanType:
        return new qt.Identifier('Boolean');
      case TypeReferenceSerializationKind.NumberLikeType:
        return new qt.Identifier('Number');
      case TypeReferenceSerializationKind.StringLikeType:
        return new qt.Identifier('String');
      case TypeReferenceSerializationKind.ArrayLikeType:
        return new qt.Identifier('Array');
      case TypeReferenceSerializationKind.ESSymbolType:
        return languageVersion < ScriptTarget.ES2015 ? getGlobalSymbolNameWithFallback() : new qt.Identifier('Symbol');
      case TypeReferenceSerializationKind.TypeWithCallSignature:
        return new qt.Identifier('Function');
      case TypeReferenceSerializationKind.Promise:
        return new qt.Identifier('Promise');
      case TypeReferenceSerializationKind.ObjectType:
        return new qt.Identifier('Object');
      default:
        return qc.assert.never(kind);
    }
  }
  function createCheckedValue(left: Expression, right: Expression) {
    return qf.create.logicalAnd(qf.create.strictInequality(new qt.TypeOfExpression(left), qc.asLiteral('undefined')), right);
  }
  function serializeEntityNameAsExpressionFallback(node: EntityName): qt.BinaryExpression {
    if (node.kind === Syntax.Identifier) {
      const copied = serializeEntityNameAsExpression(node);
      return createCheckedValue(copied, copied);
    }
    if (node.left.kind === Syntax.Identifier) return createCheckedValue(serializeEntityNameAsExpression(node.left), serializeEntityNameAsExpression(node));
    const left = serializeEntityNameAsExpressionFallback(node.left);
    const temp = createTempVariable(hoistVariableDeclaration);
    return qf.create.logicalAnd(
      qf.create.logicalAnd(left.left, qf.create.strictInequality(qf.create.assignment(temp, left.right), qc.VoidExpression.zero())),
      new qc.PropertyAccessExpression(temp, node.right)
    );
  }
  function serializeEntityNameAsExpression(node: EntityName): SerializedEntityNameAsExpression {
    switch (node.kind) {
      case Syntax.Identifier:
        const name = getMutableClone(node);
        name.flags &= ~NodeFlags.Synthesized;
        name.original = undefined;
        name.parent = qf.get.parseTreeOf(currentLexicalScope);
        return name;
      case Syntax.QualifiedName:
        return serializeQualifiedNameAsExpression(node);
    }
  }
  function serializeQualifiedNameAsExpression(node: qt.QualifiedName): SerializedEntityNameAsExpression {
    return new qc.PropertyAccessExpression(serializeEntityNameAsExpression(node.left), node.right);
  }
  function getGlobalSymbolNameWithFallback(): qt.ConditionalExpression {
    return new qc.ConditionalExpression(createTypeCheck(new qt.Identifier('Symbol'), 'function'), new qt.Identifier('Symbol'), new qt.Identifier('Object'));
  }
  function getGlobalBigIntNameWithFallback(): SerializedTypeNode {
    return languageVersion < ScriptTarget.ESNext
      ? new qc.ConditionalExpression(createTypeCheck(new qt.Identifier('BigInt'), 'function'), new qt.Identifier('BigInt'), new qt.Identifier('Object'))
      : new qt.Identifier('BigInt');
  }
  function getExpressionForPropertyName(member: qt.ClassElem | qt.EnumMember, generateNameForComputedPropertyName: boolean): Expression {
    const name = member.name!;
    if (qf.is.kind(qc.PrivateIdentifier, name)) return new qt.Identifier('');
    if (qf.is.kind(qc.ComputedPropertyName, name)) return generateNameForComputedPropertyName && !isSimpleInlineableExpression(name.expression) ? qf.get.generatedNameForNode(name) : name.expression;
    if (qf.is.kind(qc.Identifier, name)) return qc.asLiteral(idText(name));
    return getSynthesizedClone(name);
  }
  function visitPropertyNameOfClassElem(member: qt.ClassElem): PropertyName {
    const name = member.name!;
    if (qf.is.kind(qc.ComputedPropertyName, name) && ((!qf.has.staticModifier(member) && currentClassHasParamProperties) || some(member.decorators))) {
      const expression = visitNode(name.expression, visitor, isExpression);
      const innerExpression = qf.skip.partiallyEmittedExpressions(expression);
      if (!isSimpleInlineableExpression(innerExpression)) {
        const generatedName = qf.get.generatedNameForNode(name);
        hoistVariableDeclaration(generatedName);
        return name.update(qf.create.assignment(generatedName, expression));
      }
    }
    return visitNode(name, visitor, isPropertyName);
  }
  function visitHeritageClause(node: qt.HeritageClause): qt.HeritageClause | undefined {
    if (node.token === Syntax.ImplementsKeyword) {
      return;
    }
    return visitEachChild(node, visitor, context);
  }
  function visitExpressionWithTypings(node: qt.ExpressionWithTypings): qt.ExpressionWithTypings {
    return node.update(undefined, visitNode(node.expression, visitor, isLeftExpression));
  }
  function shouldEmitFunctionLikeDeclaration<T extends FunctionLikeDeclaration>(node: T): node is T & { body: NonNullable<T['body']> } {
    return !qf.is.missing(node.body);
  }
  function visitPropertyDeclaration(node: qt.PropertyDeclaration) {
    if (node.flags & NodeFlags.Ambient) {
      return;
    }
    const updated = node.update(undefined, Nodes.visit(node.modifiers, visitor, isModifier), visitPropertyNameOfClassElem(node), undefined, undefined, visitNode(node.initer, visitor));
    if (updated !== node) {
      qf.emit.setCommentRange(updated, node);
      qf.emit.setSourceMapRange(updated, node.movePastDecorators());
    }
    return updated;
  }
  function visitConstructor(node: qt.ConstructorDeclaration) {
    if (!shouldEmitFunctionLikeDeclaration(node)) {
      return;
    }
    return node.update(undefined, undefined, visitParamList(node.params, visitor, context), transformConstructorBody(node.body, node));
  }
  function transformConstructorBody(body: qt.Block, constructor: qt.ConstructorDeclaration) {
    const paramsWithPropertyAssignments = constructor && filter(constructor.params, (p) => qf.is.paramPropertyDeclaration(p, constructor));
    if (!some(paramsWithPropertyAssignments)) return visitFunctionBody(body, visitor, context);
    let statements: Statement[] = [];
    let indexOfFirstStatement = 0;
    resumeLexicalEnvironment();
    indexOfFirstStatement = addPrologueDirectivesAndInitialSuperCall(constructor, statements, visitor);
    qu.addRange(statements, map(paramsWithPropertyAssignments, transformParamWithPropertyAssignment));
    qu.addRange(statements, Nodes.visit(body.statements, visitor, qf.is.statement, indexOfFirstStatement));
    statements = mergeLexicalEnvironment(statements, endLexicalEnvironment());
    const block = new qt.Block(setRange(new Nodes(statements), body.statements), true);
    block.setRange(body);
    block.setOriginal(body);
    return block;
  }
  function transformParamWithPropertyAssignment(node: ParamPropertyDeclaration) {
    const name = node.name;
    if (!qf.is.kind(qc.Identifier, name)) {
      return;
    }
    const propertyName = getMutableClone(name);
    qf.emit.setFlags(propertyName, EmitFlags.NoComments | EmitFlags.NoSourceMap);
    const localName = getMutableClone(name);
    qf.emit.setFlags(localName, EmitFlags.NoComments);
    return qf.emit.setStartsOnNewLine(
      qf.emit.removeAllComments(
        setRange(new qc.ExpressionStatement(qf.create.assignment(setRange(new qc.PropertyAccessExpression(new qc.ThisExpression(), propertyName), node.name), localName)), node),
        moveRangePos(node.setOriginal(-1))
      )
    );
  }
  function visitMethodDeclaration(node: qt.MethodDeclaration) {
    if (!shouldEmitFunctionLikeDeclaration(node)) {
      return;
    }
    const updated = node.update(
      undefined,
      Nodes.visit(node.modifiers, modifierVisitor, isModifier),
      node.asteriskToken,
      visitPropertyNameOfClassElem(node),
      undefined,
      undefined,
      visitParamList(node.params, visitor, context),
      undefined,
      visitFunctionBody(node.body, visitor, context)
    );
    if (updated !== node) {
      qf.emit.setCommentRange(updated, node);
      qf.emit.setSourceMapRange(updated, node.movePastDecorators());
    }
    return updated;
  }
  function shouldEmitAccessorDeclaration(node: qt.AccessorDeclaration) {
    return !(qf.is.missing(node.body) && qf.has.syntacticModifier(node, ModifierFlags.Abstract));
  }
  function visitGetAccessor(node: qt.GetAccessorDeclaration) {
    if (!shouldEmitAccessorDeclaration(node)) {
      return;
    }
    const updated = node.update(
      undefined,
      Nodes.visit(node.modifiers, modifierVisitor, isModifier),
      visitPropertyNameOfClassElem(node),
      visitParamList(node.params, visitor, context),
      undefined,
      visitFunctionBody(node.body, visitor, context) || new qt.Block([])
    );
    if (updated !== node) {
      qf.emit.setCommentRange(updated, node);
      qf.emit.setSourceMapRange(updated, node.movePastDecorators());
    }
    return updated;
  }
  function visitSetAccessor(node: qt.SetAccessorDeclaration) {
    if (!shouldEmitAccessorDeclaration(node)) {
      return;
    }
    const updated = node.update(
      undefined,
      Nodes.visit(node.modifiers, modifierVisitor, isModifier),
      visitPropertyNameOfClassElem(node),
      visitParamList(node.params, visitor, context),
      visitFunctionBody(node.body, visitor, context) || new qt.Block([])
    );
    if (updated !== node) {
      qf.emit.setCommentRange(updated, node);
      qf.emit.setSourceMapRange(updated, node.movePastDecorators());
    }
    return updated;
  }
  function visitFunctionDeclaration(node: qt.FunctionDeclaration): VisitResult<Statement> {
    if (!shouldEmitFunctionLikeDeclaration(node)) return new qc.NotEmittedStatement(node);
    const updated = node.update(
      undefined,
      Nodes.visit(node.modifiers, modifierVisitor, isModifier),
      node.asteriskToken,
      node.name,
      undefined,
      visitParamList(node.params, visitor, context),
      undefined,
      visitFunctionBody(node.body, visitor, context) || new qt.Block([])
    );
    if (isExportOfNamespace(node)) {
      const statements: Statement[] = [updated];
      addExportMemberAssignment(statements, node);
      return statements;
    }
    return updated;
  }
  function visitFunctionExpression(node: qt.FunctionExpression): Expression {
    if (!shouldEmitFunctionLikeDeclaration(node)) return new qc.OmittedExpression();
    const updated = node.update(
      Nodes.visit(node.modifiers, modifierVisitor, isModifier),
      node.asteriskToken,
      node.name,
      undefined,
      visitParamList(node.params, visitor, context),
      undefined,
      visitFunctionBody(node.body, visitor, context) || new qt.Block([])
    );
    return updated;
  }
  function visitArrowFunction(node: qt.ArrowFunction) {
    const updated = node.update(
      Nodes.visit(node.modifiers, modifierVisitor, isModifier),
      undefined,
      visitParamList(node.params, visitor, context),
      undefined,
      node.equalsGreaterThanToken,
      visitFunctionBody(node.body, visitor, context)
    );
    return updated;
  }
  function visitParam(node: qt.ParamDeclaration) {
    if (paramIsThsyntax.is.keyword(node)) return;

    const updated = node.update(undefined, undefined, node.dot3Token, visitNode(node.name, visitor, isBindingName), undefined, undefined, visitNode(node.initer, visitor, isExpression));
    if (updated !== node) {
      qf.emit.setCommentRange(updated, node);
      updated.setRange(node.movePastModifiers());
      qf.emit.setSourceMapRange(updated, node.movePastModifiers());
      qf.emit.setFlags(updated.name, EmitFlags.NoTrailingSourceMap);
    }
    return updated;
  }
  function visitVariableStatement(node: qt.VariableStatement): Statement | undefined {
    if (isExportOfNamespace(node)) {
      const variables = qf.get.initializedVariables(node.declarationList);
      if (variables.length === 0) return;

      return setRange(new qc.ExpressionStatement(inlineExpressions(map(variables, transformInitializedVariable))), node);
    }
    return visitEachChild(node, visitor, context);
  }
  function transformInitializedVariable(node: qt.VariableDeclaration): Expression {
    const name = node.name;
    if (qf.is.kind(qc.BindingPattern, name)) return flattenDestructuringAssignment(node, visitor, context, FlattenLevel.All, false, createNamespaceExportExpression);
    return setRange(qf.create.assignment(qf.get.namespaceMemberNameWithSourceMapsAndWithoutComments(name), visitNode(node.initer, visitor, isExpression)), node);
  }
  function visitVariableDeclaration(node: qt.VariableDeclaration) {
    return node.update(visitNode(node.name, visitor, isBindingName), undefined, undefined, visitNode(node.initer, visitor, isExpression));
  }
  function visitParenthesizedExpression(node: qt.ParenthesizedExpression): Expression {
    const innerExpression = qf.skip.outerExpressions(node.expression, ~OuterExpressionKinds.Assertions);
    if (qf.is.assertionExpression(innerExpression)) {
      const expression = visitNode(node.expression, visitor, isExpression);
      if (length(syntax.get.leadingCommentRangesOfNode(expression, currentSourceFile))) return node.update(expression);
      return new qc.PartiallyEmittedExpression(expression, node);
    }
    return visitEachChild(node, visitor, context);
  }
  function visitAssertionExpression(node: qt.AssertionExpression): Expression {
    const expression = visitNode(node.expression, visitor, isExpression);
    return new qc.PartiallyEmittedExpression(expression, node);
  }
  function visitNonNullExpression(node: qt.NonNullExpression): Expression {
    const expression = visitNode(node.expression, visitor, isLeftExpression);
    return new qc.PartiallyEmittedExpression(expression, node);
  }
  function visitCallExpression(node: qt.CallExpression) {
    return node.update(visitNode(node.expression, visitor, isExpression), undefined, Nodes.visit(node.args, visitor, isExpression));
  }
  function visitNewExpression(node: qt.NewExpression) {
    return node.update(visitNode(node.expression, visitor, isExpression), undefined, Nodes.visit(node.args, visitor, isExpression));
  }
  function visitTaggedTemplateExpression(node: qt.TaggedTemplateExpression) {
    return node.update(visitNode(node.tag, visitor, isExpression), undefined, visitNode(node.template, visitor, isExpression));
  }
  function visitJsxSelfClosingElem(node: qt.JsxSelfClosingElem) {
    return node.update(visitNode(node.tagName, visitor, isJsxTagNameExpression), undefined, visitNode(node.attributes, visitor, isJsxAttributes));
  }
  function visitJsxJsxOpeningElem(node: qt.JsxOpeningElem) {
    return node.update(visitNode(node.tagName, visitor, isJsxTagNameExpression), undefined, visitNode(node.attributes, visitor, isJsxAttributes));
  }
  function shouldEmitEnumDeclaration(node: qt.EnumDeclaration) {
    return !qf.is.enumConst(node) || compilerOpts.preserveConstEnums || compilerOpts.isolatedModules;
  }
  function visitEnumDeclaration(node: qt.EnumDeclaration): VisitResult<Statement> {
    if (!shouldEmitEnumDeclaration(node)) return new qc.NotEmittedStatement(node);
    const statements: Statement[] = [];
    let emitFlags = EmitFlags.AdviseOnEmitNode;
    const varAdded = addVarForEnumOrModuleDeclaration(statements, node);
    if (varAdded) {
      if (moduleKind !== ModuleKind.System || currentLexicalScope !== currentSourceFile) {
        emitFlags |= EmitFlags.NoLeadingComments;
      }
    }
    const paramName = getNamespaceParamName(node);
    const containerName = getNamespaceContainerName(node);
    const exportName = qf.has.syntacticModifier(node, ModifierFlags.Export)
      ? qf.decl.externalModuleOrNamespaceExportName(currentNamespaceContainerName, node, false, true)
      : qf.decl.localName(node, false, true);
    let moduleArg = qf.create.logicalOr(exportName, qf.create.assignment(exportName, new qc.ObjectLiteralExpression()));
    if (hasNamespaceQualifiedExportName(node)) {
      const localName = qf.decl.localName(node, false, true);
      moduleArg = qf.create.assignment(localName, moduleArg);
    }
    const enumStatement = new qc.ExpressionStatement(
      new qc.CallExpression(
        new qc.FunctionExpression(undefined, undefined, undefined, undefined, [new qc.ParamDeclaration(undefined, undefined, undefined, paramName)], undefined, transformEnumBody(node, containerName)),
        undefined,
        [moduleArg]
      )
    );
    enumStatement.setOriginal(node);
    if (varAdded) {
      qf.emit.setSyntheticLeadingComments(enumStatement, undefined);
      qf.emit.setSyntheticTrailingComments(enumStatement, undefined);
    }
    enumStatement.setRange(node);
    qf.emit.addFlags(enumStatement, emitFlags);
    statements.push(enumStatement);
    statements.push(new qt.EndOfDeclarationMarker(node));
    return statements;
  }
  function transformEnumBody(node: qt.EnumDeclaration, localName: qt.Identifier): qt.Block {
    const savedCurrentNamespaceLocalName = currentNamespaceContainerName;
    currentNamespaceContainerName = localName;
    const statements: Statement[] = [];
    startLexicalEnvironment();
    const members = map(node.members, transformEnumMember);
    insertStatementsAfterStandardPrologue(statements, endLexicalEnvironment());
    qu.addRange(statements, members);
    currentNamespaceContainerName = savedCurrentNamespaceLocalName;
    return new qt.Block(setRange(new Nodes(statements), true));
  }
  function transformEnumMember(member: qt.EnumMember): Statement {
    const name = getExpressionForPropertyName(member, false);
    const valueExpression = transformEnumMemberDeclarationValue(member);
    const innerAssignment = qf.create.assignment(new qc.ElemAccessExpression(currentNamespaceContainerName, name), valueExpression);
    const outerAssignment = valueExpression.kind === Syntax.StringLiteral ? innerAssignment : qf.create.assignment(new qc.ElemAccessExpression(currentNamespaceContainerName, innerAssignment), name);
    return setRange(new qc.ExpressionStatement(outerAssignment.setRange(member)), member);
  }
  function transformEnumMemberDeclarationValue(member: qt.EnumMember): Expression {
    const value = resolver.getConstantValue(member);
    if (value !== undefined) return qc.asLiteral(value);
    else {
      enableSubstitutionForNonQualifiedEnumMembers();
      if (member.initer) return visitNode(member.initer, visitor, isExpression);
      return qc.VoidExpression.zero();
    }
  }
  function shouldEmitModuleDeclaration(nodeIn: qt.ModuleDeclaration) {
    const node = qf.get.parseTreeOf(nodeIn, isModuleDeclaration);
    if (!node) return true;
    return isInstantiatedModule(node, !!compilerOpts.preserveConstEnums || !!compilerOpts.isolatedModules);
  }
  function hasNamespaceQualifiedExportName(node: Node) {
    return (
      isExportOfNamespace(node) ||
      (isExternalModuleExport(node) && moduleKind !== ModuleKind.ES2015 && moduleKind !== ModuleKind.ES2020 && moduleKind !== ModuleKind.ESNext && moduleKind !== ModuleKind.System)
    );
  }
  function recordEmittedDeclarationInScope(node: qt.FunctionDeclaration | qt.ClassDeclaration | qt.ModuleDeclaration | qt.EnumDeclaration) {
    if (!currentScopeFirstDeclarationsOfName) {
      currentScopeFirstDeclarationsOfName = qu.createEscapedMap<Node>();
    }
    const name = declaredNameInScope(node);
    if (!currentScopeFirstDeclarationsOfName.has(name)) {
      currentScopeFirstDeclarationsOfName.set(name, node);
    }
  }
  function isFirstEmittedDeclarationInScope(node: qt.ModuleDeclaration | qt.EnumDeclaration) {
    if (currentScopeFirstDeclarationsOfName) {
      const name = declaredNameInScope(node);
      return currentScopeFirstDeclarationsOfName.get(name) === node;
    }
    return true;
  }
  function declaredNameInScope(node: qt.FunctionDeclaration | qt.ClassDeclaration | qt.ModuleDeclaration | qt.EnumDeclaration): __String {
    qc.assert.node(node.name, isIdentifier);
    return node.name.escapedText;
  }
  function addVarForEnumOrModuleDeclaration(statements: Statement[], node: qt.ModuleDeclaration | qt.EnumDeclaration) {
    const statement = new qc.VariableStatement(
      Nodes.visit(node.modifiers, modifierVisitor, isModifier),
      new qc.VariableDeclarationList([new qc.VariableDeclaration(qf.decl.localName(node, false, true))], currentLexicalScope.kind === Syntax.SourceFile ? NodeFlags.None : NodeFlags.Let)
    );
    statement.setOriginal(node);
    recordEmittedDeclarationInScope(node);
    if (isFirstEmittedDeclarationInScope(node)) {
      if (node.kind === Syntax.EnumDeclaration) {
        qf.emit.setSourceMapRange(statement.declarationList, node);
      } else {
        qf.emit.setSourceMapRange(statement, node);
      }
      qf.emit.setCommentRange(statement, node);
      qf.emit.addFlags(statement, EmitFlags.NoTrailingComments | EmitFlags.HasEndOfDeclarationMarker);
      statements.push(statement);
      return true;
    } else {
      const mergeMarker = new qc.MergeDeclarationMarker(statement);
      qf.emit.setFlags(mergeMarker, EmitFlags.NoComments | EmitFlags.HasEndOfDeclarationMarker);
      statements.push(mergeMarker);
      return false;
    }
  }
  function visitModuleDeclaration(node: qt.ModuleDeclaration): VisitResult<Statement> {
    if (!shouldEmitModuleDeclaration(node)) return new qc.NotEmittedStatement(node);
    qc.assert.node(node.name, isIdentifier, 'A TypeScript namespace should have an qt.Identifier name.');
    enableSubstitutionForNamespaceExports();
    const statements: Statement[] = [];
    let emitFlags = EmitFlags.AdviseOnEmitNode;
    const varAdded = addVarForEnumOrModuleDeclaration(statements, node);
    if (varAdded) {
      if (moduleKind !== ModuleKind.System || currentLexicalScope !== currentSourceFile) {
        emitFlags |= EmitFlags.NoLeadingComments;
      }
    }
    const paramName = getNamespaceParamName(node);
    const containerName = getNamespaceContainerName(node);
    const exportName = qf.has.syntacticModifier(node, ModifierFlags.Export)
      ? qf.decl.externalModuleOrNamespaceExportName(currentNamespaceContainerName, node, false, true)
      : qf.decl.localName(node, false, true);
    let moduleArg = qf.create.logicalOr(exportName, qf.create.assignment(exportName, new qc.ObjectLiteralExpression()));
    if (hasNamespaceQualifiedExportName(node)) {
      const localName = qf.decl.localName(node, false, true);
      moduleArg = qf.create.assignment(localName, moduleArg);
    }
    const moduleStatement = new qc.ExpressionStatement(
      new qc.CallExpression(
        new qc.FunctionExpression(
          undefined,
          undefined,
          undefined,
          undefined,
          [new qc.ParamDeclaration(undefined, undefined, undefined, paramName)],
          undefined,
          transformModuleBody(node, containerName)
        ),
        undefined,
        [moduleArg]
      )
    );
    moduleStatement.setOriginal(node);
    if (varAdded) {
      qf.emit.setSyntheticLeadingComments(moduleStatement, undefined);
      qf.emit.setSyntheticTrailingComments(moduleStatement, undefined);
    }
    moduleStatement.setRange(node);
    qf.emit.addFlags(moduleStatement, emitFlags);
    statements.push(moduleStatement);
    statements.push(new qt.EndOfDeclarationMarker(node));
    return statements;
  }
  function transformModuleBody(node: qt.ModuleDeclaration, namespaceLocalName: qt.Identifier): qt.Block {
    const savedCurrentNamespaceContainerName = currentNamespaceContainerName;
    const savedCurrentNamespace = currentNamespace;
    const savedCurrentScopeFirstDeclarationsOfName = currentScopeFirstDeclarationsOfName;
    currentNamespaceContainerName = namespaceLocalName;
    currentNamespace = node;
    currentScopeFirstDeclarationsOfName = undefined;
    const statements: Statement[] = [];
    startLexicalEnvironment();
    let statementsLocation: TextRange | undefined;
    let blockLocation: TextRange | undefined;
    if (node.body) {
      if (node.body.kind === Syntax.ModuleBlock) {
        saveStateAndInvoke(node.body, (body) => qu.addRange(statements, Nodes.visit((<qt.ModuleBlock>body).statements, namespaceElemVisitor, qf.is.statement)));
        statementsLocation = node.body.statements;
        blockLocation = node.body;
      } else {
        const result = visitModuleDeclaration(<qt.ModuleDeclaration>node.body);
        if (result) {
          if (isArray(result)) {
            qu.addRange(statements, result);
          } else {
            statements.push(result);
          }
        }
        const moduleBlock = <qt.ModuleBlock>getInnerMostModuleDeclarationFromDottedModule(node)!.body;
        statementsLocation = moveRangePos(moduleBlock.statements, -1);
      }
    }
    insertStatementsAfterStandardPrologue(statements, endLexicalEnvironment());
    currentNamespaceContainerName = savedCurrentNamespaceContainerName;
    currentNamespace = savedCurrentNamespace;
    currentScopeFirstDeclarationsOfName = savedCurrentScopeFirstDeclarationsOfName;
    const block = new qt.Block(setRange(new Nodes(statements), true));
    block.setRange(blockLocation);
    if (!node.body || node.body.kind !== Syntax.ModuleBlock) {
      qf.emit.setFlags(block, qf.get.emitFlags(block) | EmitFlags.NoComments);
    }
    return block;
  }
  function getInnerMostModuleDeclarationFromDottedModule(moduleDeclaration: qt.ModuleDeclaration): qt.ModuleDeclaration | undefined {
    if (moduleDeclaration.body!.kind === Syntax.ModuleDeclaration) {
      const recursiveInnerModule = getInnerMostModuleDeclarationFromDottedModule(<qt.ModuleDeclaration>moduleDeclaration.body);
      return recursiveInnerModule || <qt.ModuleDeclaration>moduleDeclaration.body;
    }
  }
  function visitImportDeclaration(node: qt.ImportDeclaration): VisitResult<Statement> {
    if (!node.importClause) return node;
    if (node.importClause.isTypeOnly) {
      return;
    }
    const importClause = visitNode(node.importClause, visitImportClause, isImportClause);
    return importClause || compilerOpts.importsNotUsedAsValues === ImportsNotUsedAsValues.Preserve || compilerOpts.importsNotUsedAsValues === ImportsNotUsedAsValues.Error
      ? node.update(undefined, undefined, importClause, node.moduleSpecifier)
      : undefined;
  }
  function visitImportClause(node: qt.ImportClause): VisitResult<qt.ImportClause> {
    if (node.isTypeOnly) {
      return;
    }
    const name = resolver.referencedAliasDeclaration(node) ? node.name : undefined;
    const namedBindings = visitNode(node.namedBindings, visitNamedImportBindings, isNamedImportBindings);
    return name || namedBindings ? node.update(name, namedBindings, false) : undefined;
  }
  function visitNamedImportBindings(node: NamedImportBindings): VisitResult<NamedImportBindings> {
    if (node.kind === Syntax.NamespaceImport) return resolver.referencedAliasDeclaration(node) ? node : undefined;
    else {
      const elems = Nodes.visit(node.elems, visitImportSpecifier, isImportSpecifier);
      return some(elems) ? node.update(elems) : undefined;
    }
  }
  function visitImportSpecifier(node: qt.ImportSpecifier): VisitResult<qt.ImportSpecifier> {
    return resolver.referencedAliasDeclaration(node) ? node : undefined;
  }
  function visitExportAssignment(node: qt.ExportAssignment): VisitResult<Statement> {
    return resolver.isValueAliasDeclaration(node) ? visitEachChild(node, visitor, context) : undefined;
  }
  function visitExportDeclaration(node: qt.ExportDeclaration): VisitResult<Statement> {
    if (node.isTypeOnly) {
      return;
    }
    if (!node.exportClause || qf.is.kind(qc.NamespaceExport, node.exportClause)) return node;
    if (!resolver.isValueAliasDeclaration(node)) {
      return;
    }
    const exportClause = visitNode(node.exportClause, visitNamedExportBindings, isNamedExportBindings);
    return exportClause ? node.update(undefined, undefined, exportClause, node.moduleSpecifier, node.isTypeOnly) : undefined;
  }
  function visitNamedExports(node: qt.NamedExports): VisitResult<qt.NamedExports> {
    const elems = Nodes.visit(node.elems, visitExportSpecifier, isExportSpecifier);
    return some(elems) ? node.update(elems) : undefined;
  }
  function visitNamespaceExports(node: qt.NamespaceExport): VisitResult<qt.NamespaceExport> {
    return node.update(visitNode(node.name, visitor, isIdentifier));
  }
  function visitNamedExportBindings(node: NamedExportBindings): VisitResult<NamedExportBindings> {
    return qf.is.kind(qc.NamespaceExport, node) ? visitNamespaceExports(node) : visitNamedExports(node);
  }
  function visitExportSpecifier(node: qt.ExportSpecifier): VisitResult<qt.ExportSpecifier> {
    return resolver.isValueAliasDeclaration(node) ? node : undefined;
  }
  function shouldEmitImportEqualsDeclaration(node: qt.ImportEqualsDeclaration) {
    return resolver.referencedAliasDeclaration(node) || (!qf.is.externalModule(currentSourceFile) && resolver.isTopLevelValueImportEqualsWithEntityName(node));
  }
  function visitImportEqualsDeclaration(node: qt.ImportEqualsDeclaration): VisitResult<Statement> {
    if (qf.is.externalModuleImportEqualsDeclaration(node)) {
      const referenced = resolver.referencedAliasDeclaration(node);
      if (!referenced && compilerOpts.importsNotUsedAsValues === ImportsNotUsedAsValues.Preserve)
        return setRange(new qc.ImportDeclaration(undefined, undefined, undefined, node.moduleReference.expression), node).setOriginal(node);
      return referenced ? visitEachChild(node, visitor, context) : undefined;
    }
    if (!shouldEmitImportEqualsDeclaration(node)) {
      return;
    }
    const moduleReference = createExpressionFromEntityName(<EntityName>node.moduleReference);
    qf.emit.setFlags(moduleReference, EmitFlags.NoComments | EmitFlags.NoNestedComments);
    if (isNamedExternalModuleExport(node) || !isExportOfNamespace(node)) {
      return setOriginalNode(
        new qc.VariableStatement(
          Nodes.visit(node.modifiers, modifierVisitor, isModifier),
          new qc.VariableDeclarationList([new qc.VariableDeclaration(node.name, undefined, moduleReference).setOriginal(node)])
        ).setRange(node),
        node
      );
    }
    return new qc.NamespaceExport(node.name, moduleReference, node).setOriginal(node);
  }
  function isExportOfNamespace(node: Node) {
    return currentNamespace !== undefined && qf.has.syntacticModifier(node, ModifierFlags.Export);
  }
  function isExternalModuleExport(node: Node) {
    return currentNamespace === undefined && qf.has.syntacticModifier(node, ModifierFlags.Export);
  }
  function isNamedExternalModuleExport(node: Node) {
    return isExternalModuleExport(node) && !qf.has.syntacticModifier(node, ModifierFlags.Default);
  }
  function isDefaultExternalModuleExport(node: Node) {
    return isExternalModuleExport(node) && qf.has.syntacticModifier(node, ModifierFlags.Default);
  }
  function expressionToStatement(expression: Expression) {
    return new qc.ExpressionStatement(expression);
  }
  function addExportMemberAssignment(statements: Statement[], node: qt.ClassDeclaration | qt.FunctionDeclaration) {
    const expression = qf.create.assignment(qf.decl.externalModuleOrNamespaceExportName(currentNamespaceContainerName, node, false, true), qf.decl.localName(node));
    qf.emit.setSourceMapRange(expression, createRange(node.name ? node.name.pos : node.pos, node.end));
    const statement = new qc.ExpressionStatement(expression);
    qf.emit.setSourceMapRange(statement, createRange(-1, node.end));
    statements.push(statement);
  }
  function createNamespaceExport(exportName: qt.Identifier, exportValue: Expression, location?: TextRange) {
    return setRange(new qc.ExpressionStatement(qf.create.assignment(qf.get.namespaceMemberName(currentNamespaceContainerName, exportName, false, true), exportValue)), location);
  }
  function createNamespaceExportExpression(exportName: qt.Identifier, exportValue: Expression, location?: TextRange) {
    return setRange(qf.create.assignment(qf.get.namespaceMemberNameWithSourceMapsAndWithoutComments(exportName), exportValue), location);
  }
  function getNamespaceMemberNameWithSourceMapsAndWithoutComments(name: qt.Identifier) {
    return qf.get.namespaceMemberName(currentNamespaceContainerName, name, false, true);
  }
  function getNamespaceParamName(node: qt.ModuleDeclaration | qt.EnumDeclaration) {
    const name = qf.get.generatedNameForNode(node);
    qf.emit.setSourceMapRange(name, node.name);
    return name;
  }
  function getNamespaceContainerName(node: qt.ModuleDeclaration | qt.EnumDeclaration) {
    return qf.get.generatedNameForNode(node);
  }
  function getClassAliasIfNeeded(node: qt.ClassDeclaration) {
    if (resolver.getNodeCheckFlags(node) & NodeCheckFlags.ClassWithConstructorReference) {
      enableSubstitutionForClassAliases();
      const classAlias = createUniqueName(node.name && !qf.is.generatedIdentifier(node.name) ? idText(node.name) : 'default');
      classAliases[getOriginalNodeId(node)] = classAlias;
      hoistVariableDeclaration(classAlias);
      return classAlias;
    }
  }
  function getClassPrototype(node: qt.ClassExpression | qt.ClassDeclaration) {
    return new qc.PropertyAccessExpression(qf.decl.name(node), 'prototype');
  }
  function getClassMemberPrefix(node: qt.ClassExpression | qt.ClassDeclaration, member: qt.ClassElem) {
    return qf.has.syntacticModifier(member, ModifierFlags.Static) ? qf.decl.name(node) : getClassPrototype(node);
  }
  function enableSubstitutionForNonQualifiedEnumMembers() {
    if ((enabledSubstitutions & TypeScriptSubstitutionFlags.NonQualifiedEnumMembers) === 0) {
      enabledSubstitutions |= TypeScriptSubstitutionFlags.NonQualifiedEnumMembers;
      context.enableSubstitution(Syntax.Identifier);
    }
  }
  function enableSubstitutionForClassAliases() {
    if ((enabledSubstitutions & TypeScriptSubstitutionFlags.ClassAliases) === 0) {
      enabledSubstitutions |= TypeScriptSubstitutionFlags.ClassAliases;
      context.enableSubstitution(Syntax.Identifier);
      classAliases = [];
    }
  }
  function enableSubstitutionForNamespaceExports() {
    if ((enabledSubstitutions & TypeScriptSubstitutionFlags.NamespaceExports) === 0) {
      enabledSubstitutions |= TypeScriptSubstitutionFlags.NamespaceExports;
      context.enableSubstitution(Syntax.Identifier);
      context.enableSubstitution(Syntax.ShorthandPropertyAssignment);
      context.enableEmitNotification(Syntax.ModuleDeclaration);
    }
  }
  function isTransformedModuleDeclaration(node: Node): boolean {
    return qf.get.originalOf(node).kind === Syntax.ModuleDeclaration;
  }
  function isTransformedEnumDeclaration(node: Node): boolean {
    return qf.get.originalOf(node).kind === Syntax.EnumDeclaration;
  }
  function onEmitNode(hint: EmitHint, node: Node, emitCallback: (hint: EmitHint, node: Node) => void): void {
    const savedApplicableSubstitutions = applicableSubstitutions;
    const savedCurrentSourceFile = currentSourceFile;
    if (qf.is.kind(qc.SourceFile, node)) {
      currentSourceFile = node;
    }
    if (enabledSubstitutions & TypeScriptSubstitutionFlags.NamespaceExports && isTransformedModuleDeclaration(node)) {
      applicableSubstitutions |= TypeScriptSubstitutionFlags.NamespaceExports;
    }
    if (enabledSubstitutions & TypeScriptSubstitutionFlags.NonQualifiedEnumMembers && isTransformedEnumDeclaration(node)) {
      applicableSubstitutions |= TypeScriptSubstitutionFlags.NonQualifiedEnumMembers;
    }
    previousOnEmitNode(hint, node, emitCallback);
    applicableSubstitutions = savedApplicableSubstitutions;
    currentSourceFile = savedCurrentSourceFile;
  }
  function onSubstituteNode(hint: EmitHint, node: Node) {
    node = previousOnSubstituteNode(hint, node);
    if (hint === EmitHint.Expression) return substituteExpression(<Expression>node);
    else if (qf.is.kind(qc.ShorthandPropertyAssignment, node)) return substituteShorthandPropertyAssignment(node);
    return node;
  }
  function substituteShorthandPropertyAssignment(node: qt.ShorthandPropertyAssignment): ObjectLiteralElemLike {
    if (enabledSubstitutions & TypeScriptSubstitutionFlags.NamespaceExports) {
      const name = node.name;
      const exportedName = trySubstituteNamespaceExportedName(name);
      if (exportedName) {
        if (node.objectAssignmentIniter) {
          const initer = qf.create.assignment(exportedName, node.objectAssignmentIniter);
          return setRange(new qc.PropertyAssignment(name, initer), node);
        }
        return setRange(new qc.PropertyAssignment(name, exportedName), node);
      }
    }
    return node;
  }
  function substituteExpression(node: Expression) {
    switch (node.kind) {
      case Syntax.Identifier:
        return substituteExpressionIdentifier(<qt.Identifier>node);
      case Syntax.PropertyAccessExpression:
        return substitutePropertyAccessExpression(<qt.PropertyAccessExpression>node);
      case Syntax.ElemAccessExpression:
        return substituteElemAccessExpression(<qt.ElemAccessExpression>node);
    }
    return node;
  }
  function substituteExpressionIdentifier(node: qt.Identifier): Expression {
    return trySubstituteClassAlias(node) || trySubstituteNamespaceExportedName(node) || node;
  }
  function trySubstituteClassAlias(node: qt.Identifier): Expression | undefined {
    if (enabledSubstitutions & TypeScriptSubstitutionFlags.ClassAliases) {
      if (resolver.getNodeCheckFlags(node) & NodeCheckFlags.ConstructorReferenceInClass) {
        const declaration = resolver.getReferencedValueDeclaration(node);
        if (declaration) {
          const classAlias = classAliases[declaration.id!];
          if (classAlias) {
            const clone = getSynthesizedClone(classAlias);
            qf.emit.setSourceMapRange(clone, node);
            qf.emit.setCommentRange(clone, node);
            return clone;
          }
        }
      }
    }
    return;
  }
  function trySubstituteNamespaceExportedName(node: qt.Identifier): Expression | undefined {
    if (enabledSubstitutions & applicableSubstitutions && !qf.is.generatedIdentifier(node) && !qf.is.localName(node)) {
      const container = resolver.getReferencedExportContainer(node, false);
      if (container && container.kind !== Syntax.SourceFile) {
        const substitute =
          (applicableSubstitutions & TypeScriptSubstitutionFlags.NamespaceExports && container.kind === Syntax.ModuleDeclaration) ||
          (applicableSubstitutions & TypeScriptSubstitutionFlags.NonQualifiedEnumMembers && container.kind === Syntax.EnumDeclaration);
        if (substitute) return setRange(new qc.PropertyAccessExpression(qf.get.generatedNameForNode(container), node), node);
      }
    }
    return;
  }
  function substitutePropertyAccessExpression(node: qt.PropertyAccessExpression) {
    return substituteConstantValue(node);
  }
  function substituteElemAccessExpression(node: qt.ElemAccessExpression) {
    return substituteConstantValue(node);
  }
  function substituteConstantValue(node: qt.PropertyAccessExpression | qt.ElemAccessExpression): LeftExpression {
    const constantValue = tryGetConstEnumValue(node);
    if (constantValue !== undefined) {
      qf.emit.setConstantValue(node, constantValue);
      const substitute = qc.asLiteral(constantValue);
      if (!compilerOpts.removeComments) {
        const originalNode = qf.get.originalOf(node, isAccessExpression);
        const propertyName = qf.is.kind(qc.PropertyAccessExpression, originalNode) ? declarationNameToString(originalNode.name) : qf.get.textOf(originalNode.argExpression);
        qf.emit.addSyntheticTrailingComment(substitute, Syntax.MultiLineCommentTrivia, ` ${propertyName} `);
      }
      return substitute;
    }
    return node;
  }
  function tryGetConstEnumValue(node: Node): string | number | undefined {
    if (compilerOpts.isolatedModules) {
      return;
    }
    return qf.is.kind(qc.PropertyAccessExpression, node) || qf.is.kind(qc.ElemAccessExpression, node) ? resolver.getConstantValue(node) : undefined;
  }
}
function createDecorateHelper(context: qt.TrafoContext, decoratorExpressions: Expression[], target: Expression, memberName?: Expression, descriptor?: Expression, location?: TextRange) {
  const argsArray: Expression[] = [];
  argsArray.push(new qt.ArrayLiteralExpression(decoratorExpressions, true));
  argsArray.push(target);
  if (memberName) {
    argsArray.push(memberName);
    if (descriptor) {
      argsArray.push(descriptor);
    }
  }
  context.requestEmitHelper(decorateHelper);
  return setRange(new qc.CallExpression(getUnscopedHelperName('__decorate'), undefined, argsArray), location);
}
export const decorateHelper: qt.UnscopedEmitHelper = {
  name: 'typescript:decorate',
  importName: '__decorate',
  scoped: false,
  priority: 2,
  text: `
            var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
                var c = args.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
                if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
                else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
                return c > 3 && r && Object.defineProperty(target, key, r), r;
            };`,
};
function createMetadataHelper(context: qt.TrafoContext, metadataKey: string, metadataValue: Expression) {
  context.requestEmitHelper(metadataHelper);
  return new qc.CallExpression(getUnscopedHelperName('__metadata'), undefined, [qc.asLiteral(metadataKey), metadataValue]);
}
export const metadataHelper: qt.UnscopedEmitHelper = {
  name: 'typescript:metadata',
  importName: '__metadata',
  scoped: false,
  priority: 3,
  text: `
            var __metadata = (this && this.__metadata) || function (k, v) {
                if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
            };`,
};
function createParamHelper(context: qt.TrafoContext, expression: Expression, paramOffset: number, location?: TextRange) {
  context.requestEmitHelper(paramHelper);
  return setRange(new qc.CallExpression(getUnscopedHelperName('__param'), undefined, [qc.asLiteral(paramOffset), expression]), location);
}
export const paramHelper: qt.UnscopedEmitHelper = {
  name: 'typescript:param',
  importName: '__param',
  scoped: false,
  priority: 4,
  text: `
            var __param = (this && this.__param) || function (paramIndex, decorator) {
                return function (target, key) { decorator(target, key, paramIndex); }
            };`,
};
export function nodeOrChildIsDecorated(node: qt.ClassDeclaration): boolean;
export function nodeOrChildIsDecorated(node: qt.ClassElem, parent: Node): boolean;
export function nodeOrChildIsDecorated(node: Node, parent: Node, grandparent: Node): boolean;
export function nodeOrChildIsDecorated(node: Node, parent?: Node, grandparent?: Node): boolean {
  return qf.is.decorated(node, parent!, grandparent!) || childIsDecorated(node, parent!);
}
export function childIsDecorated(node: qt.ClassDeclaration): boolean;
export function childIsDecorated(node: Node, parent: Node): boolean;
export function childIsDecorated(node: Node, parent?: Node): boolean {
  switch (node.kind) {
    case Syntax.ClassDeclaration:
      return some((<qt.ClassDeclaration>node).members, (m) => nodeOrChildIsDecorated(m, node, parent!));
    case Syntax.MethodDeclaration:
    case Syntax.SetAccessor:
      return some((<FunctionLikeDeclaration>node).params, (p) => qf.is.decorated(p, node, parent!));
    default:
      return false;
  }
}
