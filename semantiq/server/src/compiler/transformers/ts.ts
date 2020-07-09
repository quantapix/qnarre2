import * as qb from '../base';
import * as qc from '../core';
import { Node, Nodes } from '../core';
import * as qs from '../classes';
import * as qt from '../types';
import * as qy from '../syntax';
import { Modifier, Syntax } from '../syntax';
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
export function transformTypeScript(context: TransformationContext) {
  const { startLexicalEnvironment, resumeLexicalEnvironment, endLexicalEnvironment, hoistVariableDeclaration } = context;
  const resolver = context.getEmitResolver();
  const compilerOptions = context.getCompilerOptions();
  const strictNullChecks = getStrictOptionValue(compilerOptions, 'strictNullChecks');
  const languageVersion = getEmitScriptTarget(compilerOptions);
  const moduleKind = getEmitModuleKind(compilerOptions);
  const previousOnEmitNode = context.onEmitNode;
  const previousOnSubstituteNode = context.onSubstituteNode;
  context.onEmitNode = onEmitNode;
  context.onSubstituteNode = onSubstituteNode;
  context.enableSubstitution(Syntax.PropertyAccessExpression);
  context.enableSubstitution(Syntax.ElementAccessExpression);
  let currentSourceFile: SourceFile;
  let currentNamespace: ModuleDeclaration;
  let currentNamespaceContainerName: Identifier;
  let currentLexicalScope: SourceFile | Block | ModuleBlock | CaseBlock;
  let currentNameScope: ClassDeclaration | undefined;
  let currentScopeFirstDeclarationsOfName: UnderscoreEscapedMap<Node> | undefined;
  let currentClassHasParameterProperties: boolean | undefined;
  let enabledSubstitutions: TypeScriptSubstitutionFlags;
  let classAliases: Identifier[];
  let applicableSubstitutions: TypeScriptSubstitutionFlags;
  return transformSourceFileOrBundle;
  function transformSourceFileOrBundle(node: SourceFile | Bundle) {
    if (node.kind === Syntax.Bundle) return transformBundle(node);
    return transformSourceFile(node);
  }
  function transformBundle(node: Bundle) {
    return new qc.Bundle(
      node.sourceFiles.map(transformSourceFile),
      mapDefined(node.prepends, (prepend) => {
        if (prepend.kind === Syntax.InputFiles) return createUnparsedSourceFile(prepend, 'js');
        return prepend;
      })
    );
  }
  function transformSourceFile(node: SourceFile) {
    if (node.isDeclarationFile) return node;
    currentSourceFile = node;
    const visited = saveStateAndInvoke(node, visitSourceFile);
    addEmitHelpers(visited, context.readEmitHelpers());
    currentSourceFile = undefined!;
    return visited;
  }
  function saveStateAndInvoke<T>(node: Node, f: (node: Node) => T): T {
    const savedCurrentScope = currentLexicalScope;
    const savedCurrentNameScope = currentNameScope;
    const savedCurrentScopeFirstDeclarationsOfName = currentScopeFirstDeclarationsOfName;
    const savedCurrentClassHasParameterProperties = currentClassHasParameterProperties;
    onBeforeVisitNode(node);
    const visited = f(node);
    if (currentLexicalScope !== savedCurrentScope) {
      currentScopeFirstDeclarationsOfName = savedCurrentScopeFirstDeclarationsOfName;
    }
    currentLexicalScope = savedCurrentScope;
    currentNameScope = savedCurrentNameScope;
    currentClassHasParameterProperties = savedCurrentClassHasParameterProperties;
    return visited;
  }
  function onBeforeVisitNode(node: Node) {
    switch (node.kind) {
      case Syntax.SourceFile:
      case Syntax.CaseBlock:
      case Syntax.ModuleBlock:
      case Syntax.Block:
        currentLexicalScope = <SourceFile | CaseBlock | ModuleBlock | Block>node;
        currentNameScope = undefined;
        currentScopeFirstDeclarationsOfName = undefined;
        break;
      case Syntax.ClassDeclaration:
      case Syntax.FunctionDeclaration:
        if (hasSyntacticModifier(node, ModifierFlags.Ambient)) {
          break;
        }
        if ((node as ClassDeclaration | FunctionDeclaration).name) {
          recordEmittedDeclarationInScope(node as ClassDeclaration | FunctionDeclaration);
        } else {
          assert(node.kind === Syntax.ClassDeclaration || hasSyntacticModifier(node, ModifierFlags.Default));
        }
        if (Node.is.kind(ClassDeclaration, node)) {
          currentNameScope = node;
        }
        break;
    }
  }
  function visitor(node: Node): VisitResult<Node> {
    return saveStateAndInvoke(node, visitorWorker);
  }
  function visitorWorker(node: Node): VisitResult<Node> {
    if (node.transformFlags & TransformFlags.ContainsTypeScript) return visitTypeScript(node);
    return node;
  }
  function sourceElementVisitor(node: Node): VisitResult<Node> {
    return saveStateAndInvoke(node, sourceElementVisitorWorker);
  }
  function sourceElementVisitorWorker(node: Node): VisitResult<Node> {
    switch (node.kind) {
      case Syntax.ImportDeclaration:
      case Syntax.ImportEqualsDeclaration:
      case Syntax.ExportAssignment:
      case Syntax.ExportDeclaration:
        return visitEllidableStatement(<ImportDeclaration | ImportEqualsDeclaration | ExportAssignment | ExportDeclaration>node);
      default:
        return visitorWorker(node);
    }
  }
  function visitEllidableStatement(node: ImportDeclaration | ImportEqualsDeclaration | ExportAssignment | ExportDeclaration): VisitResult<Node> {
    const parsed = Node.get.parseTreeOf(node);
    if (parsed !== node) {
      if (node.transformFlags & TransformFlags.ContainsTypeScript) return visitEachChild(node, visitor, context);
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
  function namespaceElementVisitor(node: Node): VisitResult<Node> {
    return saveStateAndInvoke(node, namespaceElementVisitorWorker);
  }
  function namespaceElementVisitorWorker(node: Node): VisitResult<Node> {
    if (
      node.kind === Syntax.ExportDeclaration ||
      node.kind === Syntax.ImportDeclaration ||
      node.kind === Syntax.ImportClause ||
      (node.kind === Syntax.ImportEqualsDeclaration && (<ImportEqualsDeclaration>node).moduleReference.kind === Syntax.ExternalModuleReference)
    ) {
      return;
    } else if (node.transformFlags & TransformFlags.ContainsTypeScript || hasSyntacticModifier(node, ModifierFlags.Export)) {
      return visitTypeScript(node);
    }
    return node;
  }
  function classElementVisitor(node: Node): VisitResult<Node> {
    return saveStateAndInvoke(node, classElementVisitorWorker);
  }
  function classElementVisitorWorker(node: Node): VisitResult<Node> {
    switch (node.kind) {
      case Syntax.Constructor:
        return visitConstructor(node as ConstructorDeclaration);
      case Syntax.PropertyDeclaration:
        return visitPropertyDeclaration(node as PropertyDeclaration);
      case Syntax.IndexSignature:
      case Syntax.GetAccessor:
      case Syntax.SetAccessor:
      case Syntax.MethodDeclaration:
        return visitorWorker(node);
      case Syntax.SemicolonClassElement:
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
    if (Node.is.statement(node) && hasSyntacticModifier(node, ModifierFlags.Ambient)) return createNotEmittedStatement(node);
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
      case Syntax.ArrayType:
      case Syntax.TupleType:
      case Syntax.OptionalType:
      case Syntax.RestType:
      case Syntax.TypeLiteral:
      case Syntax.TypePredicate:
      case Syntax.TypeParameter:
      case Syntax.AnyKeyword:
      case Syntax.UnknownKeyword:
      case Syntax.BooleanKeyword:
      case Syntax.StringKeyword:
      case Syntax.NumberKeyword:
      case Syntax.NeverKeyword:
      case Syntax.VoidKeyword:
      case Syntax.SymbolKeyword:
      case Syntax.ConstructorType:
      case Syntax.FunctionType:
      case Syntax.TypeQuery:
      case Syntax.TypeReference:
      case Syntax.UnionType:
      case Syntax.IntersectionType:
      case Syntax.ConditionalType:
      case Syntax.ParenthesizedType:
      case Syntax.ThisType:
      case Syntax.TypeOperator:
      case Syntax.IndexedAccessType:
      case Syntax.MappedType:
      case Syntax.LiteralType:
      case Syntax.IndexSignature:
      case Syntax.Decorator:
      case Syntax.TypeAliasDeclaration:
        return;
      case Syntax.PropertyDeclaration:
        return visitPropertyDeclaration(node as PropertyDeclaration);
      case Syntax.NamespaceExportDeclaration:
        return;
      case Syntax.Constructor:
        return visitConstructor(<ConstructorDeclaration>node);
      case Syntax.InterfaceDeclaration:
        return createNotEmittedStatement(node);
      case Syntax.ClassDeclaration:
        return visitClassDeclaration(<ClassDeclaration>node);
      case Syntax.ClassExpression:
        return visitClassExpression(<ClassExpression>node);
      case Syntax.HeritageClause:
        return visitHeritageClause(<HeritageClause>node);
      case Syntax.ExpressionWithTypeArguments:
        return visitExpressionWithTypeArguments(<ExpressionWithTypeArguments>node);
      case Syntax.MethodDeclaration:
        return visitMethodDeclaration(<MethodDeclaration>node);
      case Syntax.GetAccessor:
        return visitGetAccessor(<GetAccessorDeclaration>node);
      case Syntax.SetAccessor:
        return visitSetAccessor(<SetAccessorDeclaration>node);
      case Syntax.FunctionDeclaration:
        return visitFunctionDeclaration(<FunctionDeclaration>node);
      case Syntax.FunctionExpression:
        return visitFunctionExpression(<FunctionExpression>node);
      case Syntax.ArrowFunction:
        return visitArrowFunction(<ArrowFunction>node);
      case Syntax.Parameter:
        return visitParameter(<ParameterDeclaration>node);
      case Syntax.ParenthesizedExpression:
        return visitParenthesizedExpression(<ParenthesizedExpression>node);
      case Syntax.TypeAssertionExpression:
      case Syntax.AsExpression:
        return visitAssertionExpression(<AssertionExpression>node);
      case Syntax.CallExpression:
        return visitCallExpression(<CallExpression>node);
      case Syntax.NewExpression:
        return visitNewExpression(<NewExpression>node);
      case Syntax.TaggedTemplateExpression:
        return visitTaggedTemplateExpression(<TaggedTemplateExpression>node);
      case Syntax.NonNullExpression:
        return visitNonNullExpression(<NonNullExpression>node);
      case Syntax.EnumDeclaration:
        return visitEnumDeclaration(<EnumDeclaration>node);
      case Syntax.VariableStatement:
        return visitVariableStatement(<VariableStatement>node);
      case Syntax.VariableDeclaration:
        return visitVariableDeclaration(<VariableDeclaration>node);
      case Syntax.ModuleDeclaration:
        return visitModuleDeclaration(<ModuleDeclaration>node);
      case Syntax.ImportEqualsDeclaration:
        return visitImportEqualsDeclaration(<ImportEqualsDeclaration>node);
      case Syntax.JsxSelfClosingElement:
        return visitJsxSelfClosingElement(<JsxSelfClosingElement>node);
      case Syntax.JsxOpeningElement:
        return visitJsxJsxOpeningElement(<JsxOpeningElement>node);
      default:
        return visitEachChild(node, visitor, context);
    }
  }
  function visitSourceFile(node: SourceFile) {
    const alwaysStrict = getStrictOptionValue(compilerOptions, 'alwaysStrict') && !(qp_isExternalModule(node) && moduleKind >= ModuleKind.ES2015) && !isJsonSourceFile(node);
    return qp_updateSourceNode(node, visitLexicalEnvironment(node.statements, sourceElementVisitor, context, 0, alwaysStrict));
  }
  function shouldEmitDecorateCallForClass(node: ClassDeclaration) {
    if (node.decorators && node.decorators.length > 0) return true;
    const constructor = getFirstConstructorWithBody(node);
    if (constructor) return forEach(constructor.parameters, shouldEmitDecorateCallForParameter);
    return false;
  }
  function shouldEmitDecorateCallForParameter(parameter: ParameterDeclaration) {
    return parameter.decorators !== undefined && parameter.decorators.length > 0;
  }
  function getClassFacts(node: ClassDeclaration, staticProperties: readonly PropertyDeclaration[]) {
    let facts = ClassFacts.None;
    if (some(staticProperties)) facts |= ClassFacts.HasStaticInitializedProperties;
    const extendsClauseElement = getEffectiveBaseTypeNode(node);
    if (extendsClauseElement && skipOuterExpressions(extendsClauseElement.expression).kind !== Syntax.NullKeyword) facts |= ClassFacts.IsDerivedClass;
    if (shouldEmitDecorateCallForClass(node)) facts |= ClassFacts.HasConstructorDecorators;
    if (childIsDecorated(node)) facts |= ClassFacts.HasMemberDecorators;
    if (isExportOfNamespace(node)) facts |= ClassFacts.IsExportOfNamespace;
    else if (isDefaultExternalModuleExport(node)) facts |= ClassFacts.IsDefaultExternalExport;
    else if (isNamedExternalModuleExport(node)) facts |= ClassFacts.IsNamedExternalExport;
    if (languageVersion <= ScriptTarget.ES5 && facts & ClassFacts.MayNeedImmediatelyInvokedFunctionExpression) facts |= ClassFacts.UseImmediatelyInvokedFunctionExpression;
    return facts;
  }
  function hasTypeScriptClassSyntax(node: Node) {
    return !!(node.transformFlags & TransformFlags.ContainsTypeScriptClassSyntax);
  }
  function isClassLikeDeclarationWithTypeScriptSyntax(node: ClassLikeDeclaration) {
    return some(node.decorators) || some(node.typeParameters) || some(node.heritageClauses, hasTypeScriptClassSyntax) || some(node.members, hasTypeScriptClassSyntax);
  }
  function visitClassDeclaration(node: ClassDeclaration): VisitResult<Statement> {
    if (!isClassLikeDeclarationWithTypeScriptSyntax(node) && !(currentNamespace && hasSyntacticModifier(node, ModifierFlags.Export))) return visitEachChild(node, visitor, context);
    const staticProperties = getProperties(node, true);
    const facts = getClassFacts(node, staticProperties);
    if (facts & ClassFacts.UseImmediatelyInvokedFunctionExpression) {
      context.startLexicalEnvironment();
    }
    const name = node.name || (facts & ClassFacts.NeedsName ? getGeneratedNameForNode(node) : undefined);
    const classStatement = facts & ClassFacts.HasConstructorDecorators ? createClassDeclarationHeadWithDecorators(node, name) : createClassDeclarationHeadWithoutDecorators(node, name, facts);
    let statements: Statement[] = [classStatement];
    addClassElementDecorationStatements(statements, node, false);
    addClassElementDecorationStatements(statements, node, true);
    addConstructorDecorationStatement(statements, node);
    if (facts & ClassFacts.UseImmediatelyInvokedFunctionExpression) {
      const closingBraceLocation = createTokenRange(syntax.skipTrivia(currentSourceFile.text, node.members.end), Syntax.CloseBraceToken);
      const localName = getInternalName(node);
      const outer = new qs.PartiallyEmittedExpression(localName);
      outer.end = closingBraceLocation.end;
      setEmitFlags(outer, EmitFlags.NoComments);
      const statement = new qc.ReturnStatement(outer);
      statement.pos = closingBraceLocation.pos;
      setEmitFlags(statement, EmitFlags.NoComments | EmitFlags.NoTokenSourceMaps);
      statements.push(statement);
      insertStatementsAfterStandardPrologue(statements, context.endLexicalEnvironment());
      const iife = qs.CallExpression.immediateArrowFunction(statements);
      setEmitFlags(iife, EmitFlags.TypeScriptClassWrapper);
      const varStatement = new qc.VariableStatement(undefined, new qc.VariableDeclarationList([new qc.VariableDeclaration(getLocalName(node, false, false), undefined, iife)]));
      setOriginalNode(varStatement, node);
      setCommentRange(varStatement, node);
      setSourceMapRange(varStatement, moveRangePastDecorators(node));
      startOnNewLine(varStatement);
      statements = [varStatement];
    }
    if (facts & ClassFacts.IsExportOfNamespace) {
      addExportMemberAssignment(statements, node);
    } else if (facts & ClassFacts.UseImmediatelyInvokedFunctionExpression || facts & ClassFacts.HasConstructorDecorators) {
      if (facts & ClassFacts.IsDefaultExternalExport) {
        statements.push(createExportDefault(getLocalName(node, false, true)));
      } else if (facts & ClassFacts.IsNamedExternalExport) {
        statements.push(createExternalModuleExport(getLocalName(node, false, true)));
      }
    }
    if (statements.length > 1) {
      statements.push(new EndOfDeclarationMarker(node));
      setEmitFlags(classStatement, Node.get.emitFlags(classStatement) | EmitFlags.HasEndOfDeclarationMarker);
    }
    return singleOrMany(statements);
  }
  function createClassDeclarationHeadWithoutDecorators(node: ClassDeclaration, name: Identifier | undefined, facts: ClassFacts) {
    const modifiers = !(facts & ClassFacts.UseImmediatelyInvokedFunctionExpression) ? Nodes.visit(node.modifiers, modifierVisitor, isModifier) : undefined;
    const classDeclaration = new qc.ClassDeclaration(undefined, modifiers, name, undefined, Nodes.visit(node.heritageClauses, visitor, isHeritageClause), transformClassMembers(node));
    let emitFlags = Node.get.emitFlags(node);
    if (facts & ClassFacts.HasStaticInitializedProperties) {
      emitFlags |= EmitFlags.NoTrailingSourceMap;
    }
    aggregateTransformFlags(classDeclaration);
    setRange(classDeclaration, node);
    setOriginalNode(classDeclaration, node);
    setEmitFlags(classDeclaration, emitFlags);
    return classDeclaration;
  }
  function createClassDeclarationHeadWithDecorators(node: ClassDeclaration, name: Identifier | undefined) {
    const location = moveRangePastDecorators(node);
    const classAlias = getClassAliasIfNeeded(node);
    const declName = getLocalName(node, false, true);
    const heritageClauses = Nodes.visit(node.heritageClauses, visitor, isHeritageClause);
    const members = transformClassMembers(node);
    const classExpression = new qc.ClassExpression(undefined, name, undefined, heritageClauses, members);
    aggregateTransformFlags(classExpression);
    setOriginalNode(classExpression, node);
    setRange(classExpression, location);
    const statement = new qc.VariableStatement(
      undefined,
      new qc.VariableDeclarationList([new qc.VariableDeclaration(declName, undefined, classAlias ? createAssignment(classAlias, classExpression) : classExpression)], NodeFlags.Let)
    );
    setOriginalNode(statement, node);
    setRange(statement, location);
    setCommentRange(statement, node);
    return statement;
  }
  function visitClassExpression(node: ClassExpression): Expression {
    if (!isClassLikeDeclarationWithTypeScriptSyntax(node)) return visitEachChild(node, visitor, context);
    const classExpression = new qc.ClassExpression(undefined, node.name, undefined, Nodes.visit(node.heritageClauses, visitor, isHeritageClause), transformClassMembers(node));
    aggregateTransformFlags(classExpression);
    setOriginalNode(classExpression, node);
    setRange(classExpression, node);
    return classExpression;
  }
  function transformClassMembers(node: ClassDeclaration | ClassExpression) {
    const members: ClassElement[] = [];
    const constructor = getFirstConstructorWithBody(node);
    const parametersWithPropertyAssignments = constructor && filter(constructor.parameters, (p) => Node.is.parameterPropertyDeclaration(p, constructor));
    if (parametersWithPropertyAssignments) {
      for (const parameter of parametersWithPropertyAssignments) {
        if (Node.is.kind(Identifier, parameter.name)) {
          members.push(setOriginalNode(aggregateTransformFlags(PropertyDeclaration.create(undefined, undefined, parameter.name, undefined, undefined, undefined)), parameter));
        }
      }
    }
    addRange(members, Nodes.visit(node.members, classElementVisitor, isClassElement));
    return setRange(new Nodes(members), node.members);
  }
  function getDecoratedClassElements(node: ClassExpression | ClassDeclaration, isStatic: boolean): readonly ClassElement[] {
    return filter(node.members, isStatic ? (m) => isStaticDecoratedClassElement(m, node) : (m) => isInstanceDecoratedClassElement(m, node));
  }
  function isStaticDecoratedClassElement(member: ClassElement, parent: ClassLikeDeclaration) {
    return isDecoratedClassElement(member, true, parent);
  }
  function isInstanceDecoratedClassElement(member: ClassElement, parent: ClassLikeDeclaration) {
    return isDecoratedClassElement(member, false, parent);
  }
  function isDecoratedClassElement(member: ClassElement, isStatic: boolean, parent: ClassLikeDeclaration) {
    return nodeOrChildIsDecorated(member, parent) && isStatic === hasSyntacticModifier(member, ModifierFlags.Static);
  }
  interface AllDecorators {
    decorators: readonly Decorator[] | undefined;
    parameters?: readonly (readonly Decorator[] | undefined)[];
  }
  function getDecoratorsOfParameters(node: FunctionLikeDeclaration | undefined) {
    let decorators: (readonly Decorator[] | undefined)[] | undefined;
    if (node) {
      const parameters = node.parameters;
      const firstParameterIsThis = parameters.length > 0 && parameterIsThsyntax.is.keyword(parameters[0]);
      const firstParameterOffset = firstParameterIsThis ? 1 : 0;
      const numParameters = firstParameterIsThis ? parameters.length - 1 : parameters.length;
      for (let i = 0; i < numParameters; i++) {
        const parameter = parameters[i + firstParameterOffset];
        if (decorators || parameter.decorators) {
          if (!decorators) {
            decorators = new Array(numParameters);
          }
          decorators[i] = parameter.decorators;
        }
      }
    }
    return decorators;
  }
  function getAllDecoratorsOfConstructor(node: ClassExpression | ClassDeclaration): AllDecorators | undefined {
    const decorators = node.decorators;
    const parameters = getDecoratorsOfParameters(getFirstConstructorWithBody(node));
    if (!decorators && !parameters) {
      return;
    }
    return {
      decorators,
      parameters,
    };
  }
  function getAllDecoratorsOfClassElement(node: ClassExpression | ClassDeclaration, member: ClassElement): AllDecorators | undefined {
    switch (member.kind) {
      case Syntax.GetAccessor:
      case Syntax.SetAccessor:
        return getAllDecoratorsOfAccessors(node, <AccessorDeclaration>member);
      case Syntax.MethodDeclaration:
        return getAllDecoratorsOfMethod(<MethodDeclaration>member);
      case Syntax.PropertyDeclaration:
        return getAllDecoratorsOfProperty(<PropertyDeclaration>member);
      default:
        return;
    }
  }
  function getAllDecoratorsOfAccessors(node: ClassExpression | ClassDeclaration, accessor: AccessorDeclaration): AllDecorators | undefined {
    if (!accessor.body) {
      return;
    }
    const { firstAccessor, secondAccessor, setAccessor } = getAllAccessorDeclarations(node.members, accessor);
    const firstAccessorWithDecorators = firstAccessor.decorators ? firstAccessor : secondAccessor && secondAccessor.decorators ? secondAccessor : undefined;
    if (!firstAccessorWithDecorators || accessor !== firstAccessorWithDecorators) {
      return;
    }
    const decorators = firstAccessorWithDecorators.decorators;
    const parameters = getDecoratorsOfParameters(setAccessor);
    if (!decorators && !parameters) {
      return;
    }
    return { decorators, parameters };
  }
  function getAllDecoratorsOfMethod(method: MethodDeclaration): AllDecorators | undefined {
    if (!method.body) {
      return;
    }
    const decorators = method.decorators;
    const parameters = getDecoratorsOfParameters(method);
    if (!decorators && !parameters) {
      return;
    }
    return { decorators, parameters };
  }
  function getAllDecoratorsOfProperty(property: PropertyDeclaration): AllDecorators | undefined {
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
    addRange(decoratorExpressions, map(allDecorators.decorators, transformDecorator));
    addRange(decoratorExpressions, flatMap(allDecorators.parameters, transformDecoratorsOfParameter));
    addTypeMetadata(node, container, decoratorExpressions);
    return decoratorExpressions;
  }
  function addClassElementDecorationStatements(statements: Statement[], node: ClassDeclaration, isStatic: boolean) {
    addRange(statements, map(generateClassElementDecorationExpressions(node, isStatic), expressionToStatement));
  }
  function generateClassElementDecorationExpressions(node: ClassExpression | ClassDeclaration, isStatic: boolean) {
    const members = getDecoratedClassElements(node, isStatic);
    let expressions: Expression[] | undefined;
    for (const member of members) {
      const expression = generateClassElementDecorationExpression(node, member);
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
  function generateClassElementDecorationExpression(node: ClassExpression | ClassDeclaration, member: ClassElement) {
    const allDecorators = getAllDecoratorsOfClassElement(node, member);
    const decoratorExpressions = transformAllDecoratorsOfDeclaration(member, node, allDecorators);
    if (!decoratorExpressions) {
      return;
    }
    const prefix = getClassMemberPrefix(node, member);
    const memberName = getExpressionForPropertyName(member, true);
    const descriptor = languageVersion > ScriptTarget.ES3 ? (member.kind === Syntax.PropertyDeclaration ? qs.VoidExpression.zero() : new qc.NullLiteral()) : undefined;
    const helper = createDecorateHelper(context, decoratorExpressions, prefix, memberName, descriptor, moveRangePastDecorators(member));
    setEmitFlags(helper, EmitFlags.NoComments);
    return helper;
  }
  function addConstructorDecorationStatement(statements: Statement[], node: ClassDeclaration) {
    const expression = generateConstructorDecorationExpression(node);
    if (expression) {
      statements.push(setOriginalNode(new qc.ExpressionStatement(expression), node));
    }
  }
  function generateConstructorDecorationExpression(node: ClassExpression | ClassDeclaration) {
    const allDecorators = getAllDecoratorsOfConstructor(node);
    const decoratorExpressions = transformAllDecoratorsOfDeclaration(node, node, allDecorators);
    if (!decoratorExpressions) {
      return;
    }
    const classAlias = classAliases && classAliases[getOriginalNodeId(node)];
    const localName = getLocalName(node, false, true);
    const decorate = createDecorateHelper(context, decoratorExpressions, localName);
    const expression = createAssignment(localName, classAlias ? createAssignment(classAlias, decorate) : decorate);
    setEmitFlags(expression, EmitFlags.NoComments);
    setSourceMapRange(expression, moveRangePastDecorators(node));
    return expression;
  }
  function transformDecorator(decorator: Decorator) {
    return visitNode(decorator.expression, visitor, isExpression);
  }
  function transformDecoratorsOfParameter(decorators: Decorator[], parameterOffset: number) {
    let expressions: Expression[] | undefined;
    if (decorators) {
      expressions = [];
      for (const decorator of decorators) {
        const helper = createParamHelper(context, transformDecorator(decorator), parameterOffset, decorator.expression);
        setEmitFlags(helper, EmitFlags.NoComments);
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
    if (compilerOptions.emitDecoratorMetadata) {
      if (shouldAddTypeMetadata(node)) {
        decoratorExpressions.push(createMetadataHelper(context, 'design:type', serializeTypeOfNode(node)));
      }
      if (shouldAddParamTypesMetadata(node)) {
        decoratorExpressions.push(createMetadataHelper(context, 'design:paramtypes', serializeParameterTypesOfNode(node, container)));
      }
      if (shouldAddReturnTypeMetadata(node)) {
        decoratorExpressions.push(createMetadataHelper(context, 'design:returntype', serializeReturnTypeOfNode(node)));
      }
    }
  }
  function addNewTypeMetadata(node: Declaration, container: ClassLikeDeclaration, decoratorExpressions: Expression[]) {
    if (compilerOptions.emitDecoratorMetadata) {
      let properties: ObjectLiteralElementLike[] | undefined;
      if (shouldAddTypeMetadata(node)) {
        (properties || (properties = [])).push(
          new qc.PropertyAssignment('type', new ArrowFunction(undefined, undefined, [], undefined, new Token(Syntax.EqualsGreaterThanToken), serializeTypeOfNode(node)))
        );
      }
      if (shouldAddParamTypesMetadata(node)) {
        (properties || (properties = [])).push(
          new qc.PropertyAssignment('paramTypes', new ArrowFunction(undefined, undefined, [], undefined, new Token(Syntax.EqualsGreaterThanToken), serializeParameterTypesOfNode(node, container)))
        );
      }
      if (shouldAddReturnTypeMetadata(node)) {
        (properties || (properties = [])).push(
          new qc.PropertyAssignment('returnType', new ArrowFunction(undefined, undefined, [], undefined, new Token(Syntax.EqualsGreaterThanToken), serializeReturnTypeOfNode(node)))
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
        return getFirstConstructorWithBody(<ClassLikeDeclaration>node) !== undefined;
      case Syntax.MethodDeclaration:
      case Syntax.GetAccessor:
      case Syntax.SetAccessor:
        return true;
    }
    return false;
  }
  type SerializedEntityNameAsExpression = Identifier | BinaryExpression | PropertyAccessExpression;
  type SerializedTypeNode = SerializedEntityNameAsExpression | VoidExpression | ConditionalExpression;
  function getAccessorTypeNode(node: AccessorDeclaration) {
    const accessors = resolver.getAllAccessorDeclarations(node);
    return (accessors.setAccessor && getSetAccessorTypeAnnotationNode(accessors.setAccessor)) || (accessors.getAccessor && getEffectiveReturnTypeNode(accessors.getAccessor));
  }
  function serializeTypeOfNode(node: Node): SerializedTypeNode {
    switch (node.kind) {
      case Syntax.PropertyDeclaration:
      case Syntax.Parameter:
        return serializeTypeNode((<PropertyDeclaration | ParameterDeclaration | GetAccessorDeclaration>node).type);
      case Syntax.SetAccessor:
      case Syntax.GetAccessor:
        return serializeTypeNode(getAccessorTypeNode(node as AccessorDeclaration));
      case Syntax.ClassDeclaration:
      case Syntax.ClassExpression:
      case Syntax.MethodDeclaration:
        return new Identifier('Function');
      default:
        return qs.VoidExpression.zero();
    }
  }
  function serializeParameterTypesOfNode(node: Node, container: ClassLikeDeclaration): ArrayLiteralExpression {
    const valueDeclaration = Node.is.classLike(node) ? getFirstConstructorWithBody(node) : Node.is.functionLike(node) && Node.is.present((node as FunctionLikeDeclaration).body) ? node : undefined;
    const expressions: SerializedTypeNode[] = [];
    if (valueDeclaration) {
      const parameters = getParametersOfDecoratedDeclaration(valueDeclaration, container);
      const numParameters = parameters.length;
      for (let i = 0; i < numParameters; i++) {
        const parameter = parameters[i];
        if (i === 0 && Node.is.kind(Identifier, parameter.name) && parameter.name.escapedText === 'this') {
          continue;
        }
        if (parameter.dot3Token) {
          expressions.push(serializeTypeNode(getRestParameterElementType(parameter.type)));
        } else {
          expressions.push(serializeTypeOfNode(parameter));
        }
      }
    }
    return new ArrayLiteralExpression(expressions);
  }
  function getParametersOfDecoratedDeclaration(node: SignatureDeclaration, container: ClassLikeDeclaration) {
    if (container && node.kind === Syntax.GetAccessor) {
      const { setAccessor } = getAllAccessorDeclarations(container.members, <AccessorDeclaration>node);
      if (setAccessor) return setAccessor.parameters;
    }
    return node.parameters;
  }
  function serializeReturnTypeOfNode(node: Node): SerializedTypeNode {
    if (Node.is.functionLike(node) && node.type) return serializeTypeNode(node.type);
    else if (Node.is.asyncFunction(node)) return new Identifier('Promise');
    return qs.VoidExpression.zero();
  }
  function serializeTypeNode(node: TypeNode | undefined): SerializedTypeNode {
    if (node === undefined) return new Identifier('Object');
    switch (node.kind) {
      case Syntax.VoidKeyword:
      case Syntax.UndefinedKeyword:
      case Syntax.NullKeyword:
      case Syntax.NeverKeyword:
        return qs.VoidExpression.zero();
      case Syntax.ParenthesizedType:
        return serializeTypeNode((<ParenthesizedTypeNode>node).type);
      case Syntax.FunctionType:
      case Syntax.ConstructorType:
        return new Identifier('Function');
      case Syntax.ArrayType:
      case Syntax.TupleType:
        return new Identifier('Array');
      case Syntax.TypePredicate:
      case Syntax.BooleanKeyword:
        return new Identifier('Boolean');
      case Syntax.StringKeyword:
        return new Identifier('String');
      case Syntax.ObjectKeyword:
        return new Identifier('Object');
      case Syntax.LiteralType:
        switch ((<LiteralTypeNode>node).literal.kind) {
          case Syntax.StringLiteral:
            return new Identifier('String');
          case Syntax.PrefixUnaryExpression:
          case Syntax.NumericLiteral:
            return new Identifier('Number');
          case Syntax.BigIntLiteral:
            return getGlobalBigIntNameWithFallback();
          case Syntax.TrueKeyword:
          case Syntax.FalseKeyword:
            return new Identifier('Boolean');
          default:
            return Debug.failBadSyntax((<LiteralTypeNode>node).literal);
        }
      case Syntax.NumberKeyword:
        return new Identifier('Number');
      case Syntax.BigIntKeyword:
        return getGlobalBigIntNameWithFallback();
      case Syntax.SymbolKeyword:
        return languageVersion < ScriptTarget.ES2015 ? getGlobalSymbolNameWithFallback() : new Identifier('Symbol');
      case Syntax.TypeReference:
        return serializeTypeReferenceNode(<TypeReferenceNode>node);
      case Syntax.IntersectionType:
      case Syntax.UnionType:
        return serializeTypeList((<UnionOrIntersectionTypeNode>node).types);
      case Syntax.ConditionalType:
        return serializeTypeList([(<ConditionalTypeNode>node).trueType, (<ConditionalTypeNode>node).falseType]);
      case Syntax.TypeOperator:
        if ((<TypeOperatorNode>node).operator === Syntax.ReadonlyKeyword) return serializeTypeNode((<TypeOperatorNode>node).type);
        break;
      case Syntax.TypeQuery:
      case Syntax.IndexedAccessType:
      case Syntax.MappedType:
      case Syntax.TypeLiteral:
      case Syntax.AnyKeyword:
      case Syntax.UnknownKeyword:
      case Syntax.ThisType:
      case Syntax.ImportType:
        break;
      case Syntax.JSDocAllType:
      case Syntax.JSDocUnknownType:
      case Syntax.JSDocFunctionType:
      case Syntax.JSDocVariadicType:
      case Syntax.JSDocNamepathType:
        break;
      case Syntax.JSDocNullableType:
      case Syntax.JSDocNonNullableType:
      case Syntax.JSDocOptionalType:
        return serializeTypeNode((<JSDocNullableType | JSDocNonNullableType | JSDocOptionalType>node).type);
      default:
        return Debug.failBadSyntax(node);
    }
    return new Identifier('Object');
  }
  function serializeTypeList(types: readonly TypeNode[]): SerializedTypeNode {
    let serializedUnion: SerializedTypeNode | undefined;
    for (let typeNode of types) {
      while (typeNode.kind === Syntax.ParenthesizedType) {
        typeNode = (typeNode as ParenthesizedTypeNode).type;
      }
      if (typeNode.kind === Syntax.NeverKeyword) {
        continue;
      }
      if (!strictNullChecks && (typeNode.kind === Syntax.NullKeyword || typeNode.kind === Syntax.UndefinedKeyword)) {
        continue;
      }
      const serializedIndividual = serializeTypeNode(typeNode);
      if (Node.is.kind(Identifier, serializedIndividual) && serializedIndividual.escapedText === 'Object') return serializedIndividual;
      else if (serializedUnion) {
        if (!Node.is.kind(Identifier, serializedUnion) || !Node.is.kind(Identifier, serializedIndividual) || serializedUnion.escapedText !== serializedIndividual.escapedText)
          return new Identifier('Object');
      } else {
        serializedUnion = serializedIndividual;
      }
    }
    return serializedUnion || qs.VoidExpression.zero();
  }
  function serializeTypeReferenceNode(node: TypeReferenceNode): SerializedTypeNode {
    const kind = resolver.getTypeReferenceSerializationKind(node.typeName, currentNameScope || currentLexicalScope);
    switch (kind) {
      case TypeReferenceSerializationKind.Unknown:
        if (Node.findAncestor(node, (n) => n.parent && Node.is.kind(ConditionalTypeNode, n.parent) && (n.parent.trueType === n || n.parent.falseType === n))) return new Identifier('Object');
        const serialized = serializeEntityNameAsExpressionFallback(node.typeName);
        const temp = createTempVariable(hoistVariableDeclaration);
        return new qc.ConditionalExpression(createTypeCheck(createAssignment(temp, serialized), 'function'), temp, new Identifier('Object'));
      case TypeReferenceSerializationKind.TypeWithConstructSignatureAndValue:
        return serializeEntityNameAsExpression(node.typeName);
      case TypeReferenceSerializationKind.VoidNullableOrNeverType:
        return qs.VoidExpression.zero();
      case TypeReferenceSerializationKind.BigIntLikeType:
        return getGlobalBigIntNameWithFallback();
      case TypeReferenceSerializationKind.BooleanType:
        return new Identifier('Boolean');
      case TypeReferenceSerializationKind.NumberLikeType:
        return new Identifier('Number');
      case TypeReferenceSerializationKind.StringLikeType:
        return new Identifier('String');
      case TypeReferenceSerializationKind.ArrayLikeType:
        return new Identifier('Array');
      case TypeReferenceSerializationKind.ESSymbolType:
        return languageVersion < ScriptTarget.ES2015 ? getGlobalSymbolNameWithFallback() : new Identifier('Symbol');
      case TypeReferenceSerializationKind.TypeWithCallSignature:
        return new Identifier('Function');
      case TypeReferenceSerializationKind.Promise:
        return new Identifier('Promise');
      case TypeReferenceSerializationKind.ObjectType:
        return new Identifier('Object');
      default:
        return Debug.assertNever(kind);
    }
  }
  function createCheckedValue(left: Expression, right: Expression) {
    return createLogicalAnd(createStrictInequality(new TypeOfExpression(left), createLiteral('undefined')), right);
  }
  function serializeEntityNameAsExpressionFallback(node: EntityName): BinaryExpression {
    if (node.kind === Syntax.Identifier) {
      const copied = serializeEntityNameAsExpression(node);
      return createCheckedValue(copied, copied);
    }
    if (node.left.kind === Syntax.Identifier) return createCheckedValue(serializeEntityNameAsExpression(node.left), serializeEntityNameAsExpression(node));
    const left = serializeEntityNameAsExpressionFallback(node.left);
    const temp = createTempVariable(hoistVariableDeclaration);
    return createLogicalAnd(createLogicalAnd(left.left, createStrictInequality(createAssignment(temp, left.right), qs.VoidExpression.zero())), new qc.PropertyAccessExpression(temp, node.right));
  }
  function serializeEntityNameAsExpression(node: EntityName): SerializedEntityNameAsExpression {
    switch (node.kind) {
      case Syntax.Identifier:
        const name = getMutableClone(node);
        name.flags &= ~NodeFlags.Synthesized;
        name.original = undefined;
        name.parent = Node.get.parseTreeOf(currentLexicalScope);
        return name;
      case Syntax.QualifiedName:
        return serializeQualifiedNameAsExpression(node);
    }
  }
  function serializeQualifiedNameAsExpression(node: QualifiedName): SerializedEntityNameAsExpression {
    return new qc.PropertyAccessExpression(serializeEntityNameAsExpression(node.left), node.right);
  }
  function getGlobalSymbolNameWithFallback(): ConditionalExpression {
    return new qc.ConditionalExpression(createTypeCheck(new Identifier('Symbol'), 'function'), new Identifier('Symbol'), new Identifier('Object'));
  }
  function getGlobalBigIntNameWithFallback(): SerializedTypeNode {
    return languageVersion < ScriptTarget.ESNext
      ? new qc.ConditionalExpression(createTypeCheck(new Identifier('BigInt'), 'function'), new Identifier('BigInt'), new Identifier('Object'))
      : new Identifier('BigInt');
  }
  function getExpressionForPropertyName(member: ClassElement | EnumMember, generateNameForComputedPropertyName: boolean): Expression {
    const name = member.name!;
    if (Node.is.kind(PrivateIdentifier, name)) return new Identifier('');
    if (Node.is.kind(ComputedPropertyName, name)) return generateNameForComputedPropertyName && !isSimpleInlineableExpression(name.expression) ? getGeneratedNameForNode(name) : name.expression;
    if (Node.is.kind(Identifier, name)) return createLiteral(idText(name));
    return getSynthesizedClone(name);
  }
  function visitPropertyNameOfClassElement(member: ClassElement): PropertyName {
    const name = member.name!;
    if (Node.is.kind(ComputedPropertyName, name) && ((!hasStaticModifier(member) && currentClassHasParameterProperties) || some(member.decorators))) {
      const expression = visitNode(name.expression, visitor, isExpression);
      const innerExpression = skipPartiallyEmittedExpressions(expression);
      if (!isSimpleInlineableExpression(innerExpression)) {
        const generatedName = getGeneratedNameForNode(name);
        hoistVariableDeclaration(generatedName);
        return name.update(createAssignment(generatedName, expression));
      }
    }
    return visitNode(name, visitor, isPropertyName);
  }
  function visitHeritageClause(node: HeritageClause): HeritageClause | undefined {
    if (node.token === Syntax.ImplementsKeyword) {
      return;
    }
    return visitEachChild(node, visitor, context);
  }
  function visitExpressionWithTypeArguments(node: ExpressionWithTypeArguments): ExpressionWithTypeArguments {
    return node.update(undefined, visitNode(node.expression, visitor, isLeftHandSideExpression));
  }
  function shouldEmitFunctionLikeDeclaration<T extends FunctionLikeDeclaration>(node: T): node is T & { body: NonNullable<T['body']> } {
    return !Node.is.missing(node.body);
  }
  function visitPropertyDeclaration(node: PropertyDeclaration) {
    if (node.flags & NodeFlags.Ambient) {
      return;
    }
    const updated = node.update(undefined, Nodes.visit(node.modifiers, visitor, isModifier), visitPropertyNameOfClassElement(node), undefined, undefined, visitNode(node.initializer, visitor));
    if (updated !== node) {
      setCommentRange(updated, node);
      setSourceMapRange(updated, moveRangePastDecorators(node));
    }
    return updated;
  }
  function visitConstructor(node: ConstructorDeclaration) {
    if (!shouldEmitFunctionLikeDeclaration(node)) {
      return;
    }
    return node.update(undefined, undefined, visitParameterList(node.parameters, visitor, context), transformConstructorBody(node.body, node));
  }
  function transformConstructorBody(body: Block, constructor: ConstructorDeclaration) {
    const parametersWithPropertyAssignments = constructor && filter(constructor.parameters, (p) => Node.is.parameterPropertyDeclaration(p, constructor));
    if (!some(parametersWithPropertyAssignments)) return visitFunctionBody(body, visitor, context);
    let statements: Statement[] = [];
    let indexOfFirstStatement = 0;
    resumeLexicalEnvironment();
    indexOfFirstStatement = addPrologueDirectivesAndInitialSuperCall(constructor, statements, visitor);
    addRange(statements, map(parametersWithPropertyAssignments, transformParameterWithPropertyAssignment));
    addRange(statements, Nodes.visit(body.statements, visitor, isStatement, indexOfFirstStatement));
    statements = mergeLexicalEnvironment(statements, endLexicalEnvironment());
    const block = new Block(setRange(new Nodes(statements), body.statements), true);
    setRange(block, body);
    setOriginalNode(block, body);
    return block;
  }
  function transformParameterWithPropertyAssignment(node: ParameterPropertyDeclaration) {
    const name = node.name;
    if (!Node.is.kind(Identifier, name)) {
      return;
    }
    const propertyName = getMutableClone(name);
    setEmitFlags(propertyName, EmitFlags.NoComments | EmitFlags.NoSourceMap);
    const localName = getMutableClone(name);
    setEmitFlags(localName, EmitFlags.NoComments);
    return startOnNewLine(
      removeAllComments(
        setRange(setOriginalNode(new qc.ExpressionStatement(createAssignment(setRange(new qc.PropertyAccessExpression(new qc.ThisExpression(), propertyName), node.name), localName)), node), moveRangePos(node, -1))
      )
    );
  }
  function visitMethodDeclaration(node: MethodDeclaration) {
    if (!shouldEmitFunctionLikeDeclaration(node)) {
      return;
    }
    const updated = node.update(
      undefined,
      Nodes.visit(node.modifiers, modifierVisitor, isModifier),
      node.asteriskToken,
      visitPropertyNameOfClassElement(node),
      undefined,
      undefined,
      visitParameterList(node.parameters, visitor, context),
      undefined,
      visitFunctionBody(node.body, visitor, context)
    );
    if (updated !== node) {
      setCommentRange(updated, node);
      setSourceMapRange(updated, moveRangePastDecorators(node));
    }
    return updated;
  }
  function shouldEmitAccessorDeclaration(node: AccessorDeclaration) {
    return !(Node.is.missing(node.body) && hasSyntacticModifier(node, ModifierFlags.Abstract));
  }
  function visitGetAccessor(node: GetAccessorDeclaration) {
    if (!shouldEmitAccessorDeclaration(node)) {
      return;
    }
    const updated = node.update(
      undefined,
      Nodes.visit(node.modifiers, modifierVisitor, isModifier),
      visitPropertyNameOfClassElement(node),
      visitParameterList(node.parameters, visitor, context),
      undefined,
      visitFunctionBody(node.body, visitor, context) || new Block([])
    );
    if (updated !== node) {
      setCommentRange(updated, node);
      setSourceMapRange(updated, moveRangePastDecorators(node));
    }
    return updated;
  }
  function visitSetAccessor(node: SetAccessorDeclaration) {
    if (!shouldEmitAccessorDeclaration(node)) {
      return;
    }
    const updated = node.update(
      undefined,
      Nodes.visit(node.modifiers, modifierVisitor, isModifier),
      visitPropertyNameOfClassElement(node),
      visitParameterList(node.parameters, visitor, context),
      visitFunctionBody(node.body, visitor, context) || new Block([])
    );
    if (updated !== node) {
      setCommentRange(updated, node);
      setSourceMapRange(updated, moveRangePastDecorators(node));
    }
    return updated;
  }
  function visitFunctionDeclaration(node: FunctionDeclaration): VisitResult<Statement> {
    if (!shouldEmitFunctionLikeDeclaration(node)) return createNotEmittedStatement(node);
    const updated = node.update(
      undefined,
      Nodes.visit(node.modifiers, modifierVisitor, isModifier),
      node.asteriskToken,
      node.name,
      undefined,
      visitParameterList(node.parameters, visitor, context),
      undefined,
      visitFunctionBody(node.body, visitor, context) || new Block([])
    );
    if (isExportOfNamespace(node)) {
      const statements: Statement[] = [updated];
      addExportMemberAssignment(statements, node);
      return statements;
    }
    return updated;
  }
  function visitFunctionExpression(node: FunctionExpression): Expression {
    if (!shouldEmitFunctionLikeDeclaration(node)) return new qc.OmittedExpression();
    const updated = node.update(
      Nodes.visit(node.modifiers, modifierVisitor, isModifier),
      node.asteriskToken,
      node.name,
      undefined,
      visitParameterList(node.parameters, visitor, context),
      undefined,
      visitFunctionBody(node.body, visitor, context) || new Block([])
    );
    return updated;
  }
  function visitArrowFunction(node: ArrowFunction) {
    const updated = node.update(
      Nodes.visit(node.modifiers, modifierVisitor, isModifier),
      undefined,
      visitParameterList(node.parameters, visitor, context),
      undefined,
      node.equalsGreaterThanToken,
      visitFunctionBody(node.body, visitor, context)
    );
    return updated;
  }
  function visitParameter(node: ParameterDeclaration) {
    if (parameterIsThsyntax.is.keyword(node)) {
      return;
    }
    const updated = node.update(undefined, undefined, node.dot3Token, visitNode(node.name, visitor, isBindingName), undefined, undefined, visitNode(node.initializer, visitor, isExpression));
    if (updated !== node) {
      setCommentRange(updated, node);
      setRange(updated, moveRangePastModifiers(node));
      setSourceMapRange(updated, moveRangePastModifiers(node));
      setEmitFlags(updated.name, EmitFlags.NoTrailingSourceMap);
    }
    return updated;
  }
  function visitVariableStatement(node: VariableStatement): Statement | undefined {
    if (isExportOfNamespace(node)) {
      const variables = getInitializedVariables(node.declarationList);
      if (variables.length === 0) {
        return;
      }
      return setRange(new qc.ExpressionStatement(inlineExpressions(map(variables, transformInitializedVariable))), node);
    }
    return visitEachChild(node, visitor, context);
  }
  function transformInitializedVariable(node: VariableDeclaration): Expression {
    const name = node.name;
    if (Node.is.kind(BindingPattern, name)) return flattenDestructuringAssignment(node, visitor, context, FlattenLevel.All, false, createNamespaceExportExpression);
    return setRange(createAssignment(getNamespaceMemberNameWithSourceMapsAndWithoutComments(name), visitNode(node.initializer, visitor, isExpression)), node);
  }
  function visitVariableDeclaration(node: VariableDeclaration) {
    return node.update(visitNode(node.name, visitor, isBindingName), undefined, undefined, visitNode(node.initializer, visitor, isExpression));
  }
  function visitParenthesizedExpression(node: ParenthesizedExpression): Expression {
    const innerExpression = skipOuterExpressions(node.expression, ~OuterExpressionKinds.Assertions);
    if (Node.is.assertionExpression(innerExpression)) {
      const expression = visitNode(node.expression, visitor, isExpression);
      if (length(syntax.get.leadingCommentRangesOfNode(expression, currentSourceFile))) return node.update(expression);
      return new qs.PartiallyEmittedExpression(expression, node);
    }
    return visitEachChild(node, visitor, context);
  }
  function visitAssertionExpression(node: AssertionExpression): Expression {
    const expression = visitNode(node.expression, visitor, isExpression);
    return new qs.PartiallyEmittedExpression(expression, node);
  }
  function visitNonNullExpression(node: NonNullExpression): Expression {
    const expression = visitNode(node.expression, visitor, isLeftHandSideExpression);
    return new qs.PartiallyEmittedExpression(expression, node);
  }
  function visitCallExpression(node: CallExpression) {
    return node.update(visitNode(node.expression, visitor, isExpression), undefined, Nodes.visit(node.arguments, visitor, isExpression));
  }
  function visitNewExpression(node: NewExpression) {
    return node.update(visitNode(node.expression, visitor, isExpression), undefined, Nodes.visit(node.arguments, visitor, isExpression));
  }
  function visitTaggedTemplateExpression(node: TaggedTemplateExpression) {
    return node.update(visitNode(node.tag, visitor, isExpression), undefined, visitNode(node.template, visitor, isExpression));
  }
  function visitJsxSelfClosingElement(node: JsxSelfClosingElement) {
    return node.update(visitNode(node.tagName, visitor, isJsxTagNameExpression), undefined, visitNode(node.attributes, visitor, isJsxAttributes));
  }
  function visitJsxJsxOpeningElement(node: JsxOpeningElement) {
    return node.update(visitNode(node.tagName, visitor, isJsxTagNameExpression), undefined, visitNode(node.attributes, visitor, isJsxAttributes));
  }
  function shouldEmitEnumDeclaration(node: EnumDeclaration) {
    return !isEnumConst(node) || compilerOptions.preserveConstEnums || compilerOptions.isolatedModules;
  }
  function visitEnumDeclaration(node: EnumDeclaration): VisitResult<Statement> {
    if (!shouldEmitEnumDeclaration(node)) return createNotEmittedStatement(node);
    const statements: Statement[] = [];
    let emitFlags = EmitFlags.AdviseOnEmitNode;
    const varAdded = addVarForEnumOrModuleDeclaration(statements, node);
    if (varAdded) {
      if (moduleKind !== ModuleKind.System || currentLexicalScope !== currentSourceFile) {
        emitFlags |= EmitFlags.NoLeadingComments;
      }
    }
    const parameterName = getNamespaceParameterName(node);
    const containerName = getNamespaceContainerName(node);
    const exportName = hasSyntacticModifier(node, ModifierFlags.Export) ? getExternalModuleOrNamespaceExportName(currentNamespaceContainerName, node, false, true) : getLocalName(node, false, true);
    let moduleArg = createLogicalOr(exportName, createAssignment(exportName, new qc.ObjectLiteralExpression()));
    if (hasNamespaceQualifiedExportName(node)) {
      const localName = getLocalName(node, false, true);
      moduleArg = createAssignment(localName, moduleArg);
    }
    const enumStatement = new qc.ExpressionStatement(
      new qs.CallExpression(
        new qs.FunctionExpression(undefined, undefined, undefined, undefined, [new qc.ParameterDeclaration(undefined, undefined, undefined, parameterName)], undefined, transformEnumBody(node, containerName)),
        undefined,
        [moduleArg]
      )
    );
    setOriginalNode(enumStatement, node);
    if (varAdded) {
      setSyntheticLeadingComments(enumStatement, undefined);
      setSyntheticTrailingComments(enumStatement, undefined);
    }
    setRange(enumStatement, node);
    addEmitFlags(enumStatement, emitFlags);
    statements.push(enumStatement);
    statements.push(new EndOfDeclarationMarker(node));
    return statements;
  }
  function transformEnumBody(node: EnumDeclaration, localName: Identifier): Block {
    const savedCurrentNamespaceLocalName = currentNamespaceContainerName;
    currentNamespaceContainerName = localName;
    const statements: Statement[] = [];
    startLexicalEnvironment();
    const members = map(node.members, transformEnumMember);
    insertStatementsAfterStandardPrologue(statements, endLexicalEnvironment());
    addRange(statements, members);
    currentNamespaceContainerName = savedCurrentNamespaceLocalName;
    return new Block(setRange(new Nodes(statements), true));
  }
  function transformEnumMember(member: EnumMember): Statement {
    const name = getExpressionForPropertyName(member, false);
    const valueExpression = transformEnumMemberDeclarationValue(member);
    const innerAssignment = createAssignment(new qs.ElementAccessExpression(currentNamespaceContainerName, name), valueExpression);
    const outerAssignment = valueExpression.kind === Syntax.StringLiteral ? innerAssignment : createAssignment(new qs.ElementAccessExpression(currentNamespaceContainerName, innerAssignment), name);
    return setRange(new qc.ExpressionStatement(setRange(outerAssignment, member)), member);
  }
  function transformEnumMemberDeclarationValue(member: EnumMember): Expression {
    const value = resolver.getConstantValue(member);
    if (value !== undefined) return createLiteral(value);
    else {
      enableSubstitutionForNonQualifiedEnumMembers();
      if (member.initializer) return visitNode(member.initializer, visitor, isExpression);
      return qs.VoidExpression.zero();
    }
  }
  function shouldEmitModuleDeclaration(nodeIn: ModuleDeclaration) {
    const node = Node.get.parseTreeOf(nodeIn, isModuleDeclaration);
    if (!node) return true;
    return isInstantiatedModule(node, !!compilerOptions.preserveConstEnums || !!compilerOptions.isolatedModules);
  }
  function hasNamespaceQualifiedExportName(node: Node) {
    return (
      isExportOfNamespace(node) ||
      (qp_isExternalModuleExport(node) && moduleKind !== ModuleKind.ES2015 && moduleKind !== ModuleKind.ES2020 && moduleKind !== ModuleKind.ESNext && moduleKind !== ModuleKind.System)
    );
  }
  function recordEmittedDeclarationInScope(node: FunctionDeclaration | ClassDeclaration | ModuleDeclaration | EnumDeclaration) {
    if (!currentScopeFirstDeclarationsOfName) {
      currentScopeFirstDeclarationsOfName = createUnderscoreEscapedMap<Node>();
    }
    const name = declaredNameInScope(node);
    if (!currentScopeFirstDeclarationsOfName.has(name)) {
      currentScopeFirstDeclarationsOfName.set(name, node);
    }
  }
  function isFirstEmittedDeclarationInScope(node: ModuleDeclaration | EnumDeclaration) {
    if (currentScopeFirstDeclarationsOfName) {
      const name = declaredNameInScope(node);
      return currentScopeFirstDeclarationsOfName.get(name) === node;
    }
    return true;
  }
  function declaredNameInScope(node: FunctionDeclaration | ClassDeclaration | ModuleDeclaration | EnumDeclaration): __String {
    Debug.assertNode(node.name, isIdentifier);
    return node.name.escapedText;
  }
  function addVarForEnumOrModuleDeclaration(statements: Statement[], node: ModuleDeclaration | EnumDeclaration) {
    const statement = new qc.VariableStatement(
      Nodes.visit(node.modifiers, modifierVisitor, isModifier),
      new qc.VariableDeclarationList([new qc.VariableDeclaration(getLocalName(node, false, true))], currentLexicalScope.kind === Syntax.SourceFile ? NodeFlags.None : NodeFlags.Let)
    );
    setOriginalNode(statement, node);
    recordEmittedDeclarationInScope(node);
    if (isFirstEmittedDeclarationInScope(node)) {
      if (node.kind === Syntax.EnumDeclaration) {
        setSourceMapRange(statement.declarationList, node);
      } else {
        setSourceMapRange(statement, node);
      }
      setCommentRange(statement, node);
      addEmitFlags(statement, EmitFlags.NoTrailingComments | EmitFlags.HasEndOfDeclarationMarker);
      statements.push(statement);
      return true;
    } else {
      const mergeMarker = new qc.MergeDeclarationMarker(statement);
      setEmitFlags(mergeMarker, EmitFlags.NoComments | EmitFlags.HasEndOfDeclarationMarker);
      statements.push(mergeMarker);
      return false;
    }
  }
  function visitModuleDeclaration(node: ModuleDeclaration): VisitResult<Statement> {
    if (!shouldEmitModuleDeclaration(node)) return createNotEmittedStatement(node);
    Debug.assertNode(node.name, isIdentifier, 'A TypeScript namespace should have an Identifier name.');
    enableSubstitutionForNamespaceExports();
    const statements: Statement[] = [];
    let emitFlags = EmitFlags.AdviseOnEmitNode;
    const varAdded = addVarForEnumOrModuleDeclaration(statements, node);
    if (varAdded) {
      if (moduleKind !== ModuleKind.System || currentLexicalScope !== currentSourceFile) {
        emitFlags |= EmitFlags.NoLeadingComments;
      }
    }
    const parameterName = getNamespaceParameterName(node);
    const containerName = getNamespaceContainerName(node);
    const exportName = hasSyntacticModifier(node, ModifierFlags.Export) ? getExternalModuleOrNamespaceExportName(currentNamespaceContainerName, node, false, true) : getLocalName(node, false, true);
    let moduleArg = createLogicalOr(exportName, createAssignment(exportName, new qc.ObjectLiteralExpression()));
    if (hasNamespaceQualifiedExportName(node)) {
      const localName = getLocalName(node, false, true);
      moduleArg = createAssignment(localName, moduleArg);
    }
    const moduleStatement = new qc.ExpressionStatement(
      new qs.CallExpression(
        new qs.FunctionExpression(undefined, undefined, undefined, undefined, [new qc.ParameterDeclaration(undefined, undefined, undefined, parameterName)], undefined, transformModuleBody(node, containerName)),
        undefined,
        [moduleArg]
      )
    );
    setOriginalNode(moduleStatement, node);
    if (varAdded) {
      setSyntheticLeadingComments(moduleStatement, undefined);
      setSyntheticTrailingComments(moduleStatement, undefined);
    }
    setRange(moduleStatement, node);
    addEmitFlags(moduleStatement, emitFlags);
    statements.push(moduleStatement);
    statements.push(new EndOfDeclarationMarker(node));
    return statements;
  }
  function transformModuleBody(node: ModuleDeclaration, namespaceLocalName: Identifier): Block {
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
        saveStateAndInvoke(node.body, (body) => addRange(statements, Nodes.visit((<ModuleBlock>body).statements, namespaceElementVisitor, isStatement)));
        statementsLocation = node.body.statements;
        blockLocation = node.body;
      } else {
        const result = visitModuleDeclaration(<ModuleDeclaration>node.body);
        if (result) {
          if (isArray(result)) {
            addRange(statements, result);
          } else {
            statements.push(result);
          }
        }
        const moduleBlock = <ModuleBlock>getInnerMostModuleDeclarationFromDottedModule(node)!.body;
        statementsLocation = moveRangePos(moduleBlock.statements, -1);
      }
    }
    insertStatementsAfterStandardPrologue(statements, endLexicalEnvironment());
    currentNamespaceContainerName = savedCurrentNamespaceContainerName;
    currentNamespace = savedCurrentNamespace;
    currentScopeFirstDeclarationsOfName = savedCurrentScopeFirstDeclarationsOfName;
    const block = new Block(setRange(new Nodes(statements), true));
    setRange(block, blockLocation);
    if (!node.body || node.body.kind !== Syntax.ModuleBlock) {
      setEmitFlags(block, Node.get.emitFlags(block) | EmitFlags.NoComments);
    }
    return block;
  }
  function getInnerMostModuleDeclarationFromDottedModule(moduleDeclaration: ModuleDeclaration): ModuleDeclaration | undefined {
    if (moduleDeclaration.body!.kind === Syntax.ModuleDeclaration) {
      const recursiveInnerModule = getInnerMostModuleDeclarationFromDottedModule(<ModuleDeclaration>moduleDeclaration.body);
      return recursiveInnerModule || <ModuleDeclaration>moduleDeclaration.body;
    }
  }
  function visitImportDeclaration(node: ImportDeclaration): VisitResult<Statement> {
    if (!node.importClause) return node;
    if (node.importClause.isTypeOnly) {
      return;
    }
    const importClause = visitNode(node.importClause, visitImportClause, isImportClause);
    return importClause || compilerOptions.importsNotUsedAsValues === ImportsNotUsedAsValues.Preserve || compilerOptions.importsNotUsedAsValues === ImportsNotUsedAsValues.Error
      ? node.update(undefined, undefined, importClause, node.moduleSpecifier)
      : undefined;
  }
  function visitImportClause(node: ImportClause): VisitResult<ImportClause> {
    if (node.isTypeOnly) {
      return;
    }
    const name = resolver.isReferencedAliasDeclaration(node) ? node.name : undefined;
    const namedBindings = visitNode(node.namedBindings, visitNamedImportBindings, isNamedImportBindings);
    return name || namedBindings ? node.update(name, namedBindings, false) : undefined;
  }
  function visitNamedImportBindings(node: NamedImportBindings): VisitResult<NamedImportBindings> {
    if (node.kind === Syntax.NamespaceImport) return resolver.isReferencedAliasDeclaration(node) ? node : undefined;
    else {
      const elements = Nodes.visit(node.elements, visitImportSpecifier, isImportSpecifier);
      return some(elements) ? node.update(elements) : undefined;
    }
  }
  function visitImportSpecifier(node: ImportSpecifier): VisitResult<ImportSpecifier> {
    return resolver.isReferencedAliasDeclaration(node) ? node : undefined;
  }
  function visitExportAssignment(node: ExportAssignment): VisitResult<Statement> {
    return resolver.isValueAliasDeclaration(node) ? visitEachChild(node, visitor, context) : undefined;
  }
  function visitExportDeclaration(node: ExportDeclaration): VisitResult<Statement> {
    if (node.isTypeOnly) {
      return;
    }
    if (!node.exportClause || Node.is.kind(NamespaceExport, node.exportClause)) return node;
    if (!resolver.isValueAliasDeclaration(node)) {
      return;
    }
    const exportClause = visitNode(node.exportClause, visitNamedExportBindings, isNamedExportBindings);
    return exportClause ? node.update(undefined, undefined, exportClause, node.moduleSpecifier, node.isTypeOnly) : undefined;
  }
  function visitNamedExports(node: NamedExports): VisitResult<NamedExports> {
    const elements = Nodes.visit(node.elements, visitExportSpecifier, isExportSpecifier);
    return some(elements) ? node.update(elements) : undefined;
  }
  function visitNamespaceExports(node: NamespaceExport): VisitResult<NamespaceExport> {
    return node.update(visitNode(node.name, visitor, isIdentifier));
  }
  function visitNamedExportBindings(node: NamedExportBindings): VisitResult<NamedExportBindings> {
    return Node.is.kind(NamespaceExport, node) ? visitNamespaceExports(node) : visitNamedExports(node);
  }
  function visitExportSpecifier(node: ExportSpecifier): VisitResult<ExportSpecifier> {
    return resolver.isValueAliasDeclaration(node) ? node : undefined;
  }
  function shouldEmitImportEqualsDeclaration(node: ImportEqualsDeclaration) {
    return resolver.isReferencedAliasDeclaration(node) || (!qp_isExternalModule(currentSourceFile) && resolver.isTopLevelValueImportEqualsWithEntityName(node));
  }
  function visitImportEqualsDeclaration(node: ImportEqualsDeclaration): VisitResult<Statement> {
    if (Node.is.externalModuleImportEqualsDeclaration(node)) {
      const isReferenced = resolver.isReferencedAliasDeclaration(node);
      if (!isReferenced && compilerOptions.importsNotUsedAsValues === ImportsNotUsedAsValues.Preserve)
        return setOriginalNode(setRange(new qc.ImportDeclaration(undefined, undefined, undefined, node.moduleReference.expression), node), node);
      return isReferenced ? visitEachChild(node, visitor, context) : undefined;
    }
    if (!shouldEmitImportEqualsDeclaration(node)) {
      return;
    }
    const moduleReference = createExpressionFromEntityName(<EntityName>node.moduleReference);
    setEmitFlags(moduleReference, EmitFlags.NoComments | EmitFlags.NoNestedComments);
    if (isNamedExternalModuleExport(node) || !isExportOfNamespace(node)) {
      return setOriginalNode(
        setRange(
          new qc.VariableStatement(
            Nodes.visit(node.modifiers, modifierVisitor, isModifier),
            new qc.VariableDeclarationList([setOriginalNode(new qc.VariableDeclaration(node.name, undefined, moduleReference), node)])
          ),
          node
        ),
        node
      );
    }
    return setOriginalNode(new qc.NamespaceExport(node.name, moduleReference, node), node);
  }
  function isExportOfNamespace(node: Node) {
    return currentNamespace !== undefined && hasSyntacticModifier(node, ModifierFlags.Export);
  }
  function qp_isExternalModuleExport(node: Node) {
    return currentNamespace === undefined && hasSyntacticModifier(node, ModifierFlags.Export);
  }
  function isNamedExternalModuleExport(node: Node) {
    return qp_isExternalModuleExport(node) && !hasSyntacticModifier(node, ModifierFlags.Default);
  }
  function isDefaultExternalModuleExport(node: Node) {
    return qp_isExternalModuleExport(node) && hasSyntacticModifier(node, ModifierFlags.Default);
  }
  function expressionToStatement(expression: Expression) {
    return new qc.ExpressionStatement(expression);
  }
  function addExportMemberAssignment(statements: Statement[], node: ClassDeclaration | FunctionDeclaration) {
    const expression = createAssignment(getExternalModuleOrNamespaceExportName(currentNamespaceContainerName, node, false, true), getLocalName(node));
    setSourceMapRange(expression, createRange(node.name ? node.name.pos : node.pos, node.end));
    const statement = new qc.ExpressionStatement(expression);
    setSourceMapRange(statement, createRange(-1, node.end));
    statements.push(statement);
  }
  function new qc.NamespaceExport(exportName: Identifier, exportValue: Expression, location?: TextRange) {
    return setRange(new qc.ExpressionStatement(createAssignment(getNamespaceMemberName(currentNamespaceContainerName, exportName, false, true), exportValue)), location);
  }
  function createNamespaceExportExpression(exportName: Identifier, exportValue: Expression, location?: TextRange) {
    return setRange(createAssignment(getNamespaceMemberNameWithSourceMapsAndWithoutComments(exportName), exportValue), location);
  }
  function getNamespaceMemberNameWithSourceMapsAndWithoutComments(name: Identifier) {
    return getNamespaceMemberName(currentNamespaceContainerName, name, false, true);
  }
  function getNamespaceParameterName(node: ModuleDeclaration | EnumDeclaration) {
    const name = getGeneratedNameForNode(node);
    setSourceMapRange(name, node.name);
    return name;
  }
  function getNamespaceContainerName(node: ModuleDeclaration | EnumDeclaration) {
    return getGeneratedNameForNode(node);
  }
  function getClassAliasIfNeeded(node: ClassDeclaration) {
    if (resolver.getNodeCheckFlags(node) & NodeCheckFlags.ClassWithConstructorReference) {
      enableSubstitutionForClassAliases();
      const classAlias = createUniqueName(node.name && !Node.is.generatedIdentifier(node.name) ? idText(node.name) : 'default');
      classAliases[getOriginalNodeId(node)] = classAlias;
      hoistVariableDeclaration(classAlias);
      return classAlias;
    }
  }
  function getClassPrototype(node: ClassExpression | ClassDeclaration) {
    return new qc.PropertyAccessExpression(getDeclarationName(node), 'prototype');
  }
  function getClassMemberPrefix(node: ClassExpression | ClassDeclaration, member: ClassElement) {
    return hasSyntacticModifier(member, ModifierFlags.Static) ? getDeclarationName(node) : getClassPrototype(node);
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
    return Node.get.originalOf(node).kind === Syntax.ModuleDeclaration;
  }
  function isTransformedEnumDeclaration(node: Node): boolean {
    return Node.get.originalOf(node).kind === Syntax.EnumDeclaration;
  }
  function onEmitNode(hint: EmitHint, node: Node, emitCallback: (hint: EmitHint, node: Node) => void): void {
    const savedApplicableSubstitutions = applicableSubstitutions;
    const savedCurrentSourceFile = currentSourceFile;
    if (Node.is.kind(SourceFile, node)) {
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
    else if (Node.is.kind(ShorthandPropertyAssignment, node)) return substituteShorthandPropertyAssignment(node);
    return node;
  }
  function substituteShorthandPropertyAssignment(node: ShorthandPropertyAssignment): ObjectLiteralElementLike {
    if (enabledSubstitutions & TypeScriptSubstitutionFlags.NamespaceExports) {
      const name = node.name;
      const exportedName = trySubstituteNamespaceExportedName(name);
      if (exportedName) {
        if (node.objectAssignmentInitializer) {
          const initializer = createAssignment(exportedName, node.objectAssignmentInitializer);
          return setRange(new qc.PropertyAssignment(name, initializer), node);
        }
        return setRange(new qc.PropertyAssignment(name, exportedName), node);
      }
    }
    return node;
  }
  function substituteExpression(node: Expression) {
    switch (node.kind) {
      case Syntax.Identifier:
        return substituteExpressionIdentifier(<Identifier>node);
      case Syntax.PropertyAccessExpression:
        return substitutePropertyAccessExpression(<PropertyAccessExpression>node);
      case Syntax.ElementAccessExpression:
        return substituteElementAccessExpression(<ElementAccessExpression>node);
    }
    return node;
  }
  function substituteExpressionIdentifier(node: Identifier): Expression {
    return trySubstituteClassAlias(node) || trySubstituteNamespaceExportedName(node) || node;
  }
  function trySubstituteClassAlias(node: Identifier): Expression | undefined {
    if (enabledSubstitutions & TypeScriptSubstitutionFlags.ClassAliases) {
      if (resolver.getNodeCheckFlags(node) & NodeCheckFlags.ConstructorReferenceInClass) {
        const declaration = resolver.getReferencedValueDeclaration(node);
        if (declaration) {
          const classAlias = classAliases[declaration.id!];
          if (classAlias) {
            const clone = getSynthesizedClone(classAlias);
            setSourceMapRange(clone, node);
            setCommentRange(clone, node);
            return clone;
          }
        }
      }
    }
    return;
  }
  function trySubstituteNamespaceExportedName(node: Identifier): Expression | undefined {
    if (enabledSubstitutions & applicableSubstitutions && !Node.is.generatedIdentifier(node) && !isLocalName(node)) {
      const container = resolver.getReferencedExportContainer(node, false);
      if (container && container.kind !== Syntax.SourceFile) {
        const substitute =
          (applicableSubstitutions & TypeScriptSubstitutionFlags.NamespaceExports && container.kind === Syntax.ModuleDeclaration) ||
          (applicableSubstitutions & TypeScriptSubstitutionFlags.NonQualifiedEnumMembers && container.kind === Syntax.EnumDeclaration);
        if (substitute) return setRange(new qc.PropertyAccessExpression(getGeneratedNameForNode(container), node), node);
      }
    }
    return;
  }
  function substitutePropertyAccessExpression(node: PropertyAccessExpression) {
    return substituteConstantValue(node);
  }
  function substituteElementAccessExpression(node: ElementAccessExpression) {
    return substituteConstantValue(node);
  }
  function substituteConstantValue(node: PropertyAccessExpression | ElementAccessExpression): LeftHandSideExpression {
    const constantValue = tryGetConstEnumValue(node);
    if (constantValue !== undefined) {
      setConstantValue(node, constantValue);
      const substitute = createLiteral(constantValue);
      if (!compilerOptions.removeComments) {
        const originalNode = Node.get.originalOf(node, isAccessExpression);
        const propertyName = Node.is.kind(PropertyAccessExpression, originalNode) ? declarationNameToString(originalNode.name) : Node.get.textOf(originalNode.argumentExpression);
        addSyntheticTrailingComment(substitute, Syntax.MultiLineCommentTrivia, ` ${propertyName} `);
      }
      return substitute;
    }
    return node;
  }
  function tryGetConstEnumValue(node: Node): string | number | undefined {
    if (compilerOptions.isolatedModules) {
      return;
    }
    return Node.is.kind(PropertyAccessExpression, node) || Node.is.kind(ElementAccessExpression, node) ? resolver.getConstantValue(node) : undefined;
  }
}
function createDecorateHelper(context: TransformationContext, decoratorExpressions: Expression[], target: Expression, memberName?: Expression, descriptor?: Expression, location?: TextRange) {
  const argumentsArray: Expression[] = [];
  argumentsArray.push(new ArrayLiteralExpression(decoratorExpressions, true));
  argumentsArray.push(target);
  if (memberName) {
    argumentsArray.push(memberName);
    if (descriptor) {
      argumentsArray.push(descriptor);
    }
  }
  context.requestEmitHelper(decorateHelper);
  return setRange(new qs.CallExpression(getUnscopedHelperName('__decorate'), undefined, argumentsArray), location);
}
export const decorateHelper: UnscopedEmitHelper = {
  name: 'typescript:decorate',
  importName: '__decorate',
  scoped: false,
  priority: 2,
  text: `
            var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
                var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
                if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
                else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
                return c > 3 && r && Object.defineProperty(target, key, r), r;
            };`,
};
function createMetadataHelper(context: TransformationContext, metadataKey: string, metadataValue: Expression) {
  context.requestEmitHelper(metadataHelper);
  return new qs.CallExpression(getUnscopedHelperName('__metadata'), undefined, [createLiteral(metadataKey), metadataValue]);
}
export const metadataHelper: UnscopedEmitHelper = {
  name: 'typescript:metadata',
  importName: '__metadata',
  scoped: false,
  priority: 3,
  text: `
            var __metadata = (this && this.__metadata) || function (k, v) {
                if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
            };`,
};
function createParamHelper(context: TransformationContext, expression: Expression, parameterOffset: number, location?: TextRange) {
  context.requestEmitHelper(paramHelper);
  return setRange(new qs.CallExpression(getUnscopedHelperName('__param'), undefined, [createLiteral(parameterOffset), expression]), location);
}
export const paramHelper: UnscopedEmitHelper = {
  name: 'typescript:param',
  importName: '__param',
  scoped: false,
  priority: 4,
  text: `
            var __param = (this && this.__param) || function (paramIndex, decorator) {
                return function (target, key) { decorator(target, key, paramIndex); }
            };`,
};
