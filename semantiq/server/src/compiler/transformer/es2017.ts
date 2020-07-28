import * as qb from '../base';
import * as qc from '../core';
import { Node, Nodes } from '../core';
import * as qs from '../core3';
import * as qt from '../types';
import * as qy from '../syntax';
import { Modifier, Syntax } from '../syntax';
type SuperContainer = ClassDeclaration | MethodDeclaration | GetAccessorDeclaration | SetAccessorDeclaration | ConstructorDeclaration;
const enum ES2017SubstitutionFlags {
  AsyncMethodsWithSuper = 1 << 0,
}
const enum ContextFlags {
  NonTopLevel = 1 << 0,
  HasLexicalThis = 1 << 1,
}
export function transformES2017(context: TransformationContext) {
  const { resumeLexicalEnvironment, endLexicalEnvironment, hoistVariableDeclaration } = context;
  const resolver = context.getEmitResolver();
  const compilerOptions = context.getCompilerOptions();
  const languageVersion = getEmitScriptTarget(compilerOptions);
  let enabledSubstitutions: ES2017SubstitutionFlags;
  let enclosingSuperContainerFlags: NodeCheckFlags = 0;
  let enclosingFunctionParameterNames: EscapedMap<true>;
  let capturedSuperProperties: EscapedMap<true>;
  let hasSuperElementAccess: boolean;
  const substitutedSuperAccessors: boolean[] = [];
  let contextFlags: ContextFlags = 0;
  const previousOnEmitNode = context.onEmitNode;
  const previousOnSubstituteNode = context.onSubstituteNode;
  context.onEmitNode = onEmitNode;
  context.onSubstituteNode = onSubstituteNode;
  return chainBundle(transformSourceFile);
  function transformSourceFile(node: SourceFile) {
    if (node.isDeclarationFile) return node;
    setContextFlag(ContextFlags.NonTopLevel, false);
    setContextFlag(ContextFlags.HasLexicalThis, !isEffectiveStrictModeSourceFile(node, compilerOptions));
    const visited = visitEachChild(node, visitor, context);
    addEmitHelpers(visited, context.readEmitHelpers());
    return visited;
  }
  function setContextFlag(flag: ContextFlags, val: boolean) {
    contextFlags = val ? contextFlags | flag : contextFlags & ~flag;
  }
  function inContext(flags: ContextFlags) {
    return (contextFlags & flags) !== 0;
  }
  function inTopLevelContext() {
    return !inContext(ContextFlags.NonTopLevel);
  }
  function inHasLexicalThisContext() {
    return inContext(ContextFlags.HasLexicalThis);
  }
  function doWithContext<T, U>(flags: ContextFlags, cb: (value: T) => U, value: T) {
    const contextFlagsToSet = flags & ~contextFlags;
    if (contextFlagsToSet) {
      setContextFlag(contextFlagsToSet, true);
      const result = cb(value);
      setContextFlag(contextFlagsToSet, false);
      return result;
    }
    return cb(value);
  }
  function visitDefault(node: Node): VisitResult<Node> {
    return visitEachChild(node, visitor, context);
  }
  function visitor(node: Node): VisitResult<Node> {
    if ((node.transformFlags & TransformFlags.ContainsES2017) === 0) return node;
    switch (node.kind) {
      case Syntax.AsyncKeyword:
        return;
      case Syntax.AwaitExpression:
        return visitAwaitExpression(<AwaitExpression>node);
      case Syntax.MethodDeclaration:
        return doWithContext(ContextFlags.NonTopLevel | ContextFlags.HasLexicalThis, visitMethodDeclaration, <MethodDeclaration>node);
      case Syntax.FunctionDeclaration:
        return doWithContext(ContextFlags.NonTopLevel | ContextFlags.HasLexicalThis, visitFunctionDeclaration, <FunctionDeclaration>node);
      case Syntax.FunctionExpression:
        return doWithContext(ContextFlags.NonTopLevel | ContextFlags.HasLexicalThis, visitFunctionExpression, <FunctionExpression>node);
      case Syntax.ArrowFunction:
        return doWithContext(ContextFlags.NonTopLevel, visitArrowFunction, <ArrowFunction>node);
      case Syntax.PropertyAccessExpression:
        if (capturedSuperProperties && qc.is.kind(qc.PropertyAccessExpression, node) && node.expression.kind === Syntax.SuperKeyword) {
          capturedSuperProperties.set(node.name.escapedText, true);
        }
        return visitEachChild(node, visitor, context);
      case Syntax.ElementAccessExpression:
        if (capturedSuperProperties && (<ElementAccessExpression>node).expression.kind === Syntax.SuperKeyword) {
          hasSuperElementAccess = true;
        }
        return visitEachChild(node, visitor, context);
      case Syntax.GetAccessor:
      case Syntax.SetAccessor:
      case Syntax.Constructor:
      case Syntax.ClassDeclaration:
      case Syntax.ClassExpression:
        return doWithContext(ContextFlags.NonTopLevel | ContextFlags.HasLexicalThis, visitDefault, node);
      default:
        return visitEachChild(node, visitor, context);
    }
  }
  function asyncBodyVisitor(node: Node): VisitResult<Node> {
    if (qc.is.nodeWithPossibleHoistedDeclaration(node)) {
      switch (node.kind) {
        case Syntax.VariableStatement:
          return visitVariableStatementInAsyncBody(node);
        case Syntax.ForStatement:
          return visitForStatementInAsyncBody(node);
        case Syntax.ForInStatement:
          return visitForInStatementInAsyncBody(node);
        case Syntax.ForOfStatement:
          return visitForOfStatementInAsyncBody(node);
        case Syntax.CatchClause:
          return visitCatchClauseInAsyncBody(node);
        case Syntax.Block:
        case Syntax.SwitchStatement:
        case Syntax.CaseBlock:
        case Syntax.CaseClause:
        case Syntax.DefaultClause:
        case Syntax.TryStatement:
        case Syntax.DoStatement:
        case Syntax.WhileStatement:
        case Syntax.IfStatement:
        case Syntax.WithStatement:
        case Syntax.LabeledStatement:
          return visitEachChild(node, asyncBodyVisitor, context);
        default:
          return Debug.assertNever(node, 'Unhandled node.');
      }
    }
    return visitor(node);
  }
  function visitCatchClauseInAsyncBody(node: CatchClause) {
    const catchClauseNames = qb.createEscapedMap<true>();
    recordDeclarationName(node.variableDeclaration!, catchClauseNames);
    let catchClauseUnshadowedNames: EscapedMap<true> | undefined;
    catchClauseNames.forEach((_, escName) => {
      if (enclosingFunctionParameterNames.has(escName)) {
        if (!catchClauseUnshadowedNames) {
          catchClauseUnshadowedNames = cloneMap(enclosingFunctionParameterNames);
        }
        catchClauseUnshadowedNames.delete(escName);
      }
    });
    if (catchClauseUnshadowedNames) {
      const savedEnclosingFunctionParameterNames = enclosingFunctionParameterNames;
      enclosingFunctionParameterNames = catchClauseUnshadowedNames;
      const result = visitEachChild(node, asyncBodyVisitor, context);
      enclosingFunctionParameterNames = savedEnclosingFunctionParameterNames;
      return result;
    }
    return visitEachChild(node, asyncBodyVisitor, context);
  }
  function visitVariableStatementInAsyncBody(node: VariableStatement) {
    if (isVariableDeclarationListWithCollidingName(node.declarationList)) {
      const expression = visitVariableDeclarationListWithCollidingNames(node.declarationList, false);
      return expression ? new qc.ExpressionStatement(expression) : undefined;
    }
    return visitEachChild(node, visitor, context);
  }
  function visitForInStatementInAsyncBody(node: ForInStatement) {
    return updateForIn(
      node,
      isVariableDeclarationListWithCollidingName(node.initer) ? visitVariableDeclarationListWithCollidingNames(node.initer, true)! : visitNode(node.initer, visitor, isForIniter),
      visitNode(node.expression, visitor, isExpression),
      visitNode(node.statement, asyncBodyVisitor, isStatement, liftToBlock)
    );
  }
  function visitForOfStatementInAsyncBody(node: ForOfStatement) {
    return updateForOf(
      node,
      visitNode(node.awaitModifier, visitor, isToken),
      isVariableDeclarationListWithCollidingName(node.initer) ? visitVariableDeclarationListWithCollidingNames(node.initer, true)! : visitNode(node.initer, visitor, isForIniter),
      visitNode(node.expression, visitor, isExpression),
      visitNode(node.statement, asyncBodyVisitor, isStatement, liftToBlock)
    );
  }
  function visitForStatementInAsyncBody(node: ForStatement) {
    const initer = node.initer!;
    return updateFor(
      node,
      isVariableDeclarationListWithCollidingName(initer) ? visitVariableDeclarationListWithCollidingNames(initer, false) : visitNode(node.initer, visitor, isForIniter),
      visitNode(node.condition, visitor, isExpression),
      visitNode(node.incrementor, visitor, isExpression),
      visitNode(node.statement, asyncBodyVisitor, isStatement, liftToBlock)
    );
  }
  function visitAwaitExpression(node: AwaitExpression): Expression {
    if (inTopLevelContext()) return visitEachChild(node, visitor, context);
    return setRange(new qc.YieldExpression(undefined, visitNode(node.expression, visitor, isExpression)), node).setOriginal(node);
  }
  function visitMethodDeclaration(node: MethodDeclaration) {
    return node.update(
      undefined,
      Nodes.visit(node.modifiers, visitor, isModifier),
      node.asteriskToken,
      node.name,
      undefined,
      undefined,
      visitParameterList(node.parameters, visitor, context),
      undefined,
      qf.get.functionFlags(node) & FunctionFlags.Async ? transformAsyncFunctionBody(node) : visitFunctionBody(node.body, visitor, context)
    );
  }
  function visitFunctionDeclaration(node: FunctionDeclaration): VisitResult<Statement> {
    return node.update(
      undefined,
      Nodes.visit(node.modifiers, visitor, isModifier),
      node.asteriskToken,
      node.name,
      undefined,
      visitParameterList(node.parameters, visitor, context),
      undefined,
      qf.get.functionFlags(node) & FunctionFlags.Async ? transformAsyncFunctionBody(node) : visitFunctionBody(node.body, visitor, context)
    );
  }
  function visitFunctionExpression(node: FunctionExpression): Expression {
    return node.update(
      Nodes.visit(node.modifiers, visitor, isModifier),
      node.asteriskToken,
      node.name,
      undefined,
      visitParameterList(node.parameters, visitor, context),
      undefined,
      qf.get.functionFlags(node) & FunctionFlags.Async ? transformAsyncFunctionBody(node) : visitFunctionBody(node.body, visitor, context)
    );
  }
  function visitArrowFunction(node: ArrowFunction) {
    return node.update(
      Nodes.visit(node.modifiers, visitor, isModifier),
      undefined,
      visitParameterList(node.parameters, visitor, context),
      undefined,
      node.equalsGreaterThanToken,
      qf.get.functionFlags(node) & FunctionFlags.Async ? transformAsyncFunctionBody(node) : visitFunctionBody(node.body, visitor, context)
    );
  }
  function recordDeclarationName({ name }: ParameterDeclaration | VariableDeclaration | BindingElement, names: EscapedMap<true>) {
    if (qc.is.kind(qc.Identifier, name)) {
      names.set(name.escapedText, true);
    } else {
      for (const element of name.elements) {
        if (!qc.is.kind(qc.OmittedExpression, element)) {
          recordDeclarationName(element, names);
        }
      }
    }
  }
  function isVariableDeclarationListWithCollidingName(node: ForIniter): node is VariableDeclarationList {
    return !!node && qc.is.kind(qc.VariableDeclarationList, node) && !(node.flags & NodeFlags.BlockScoped) && node.declarations.some(collidesWithParameterName);
  }
  function visitVariableDeclarationListWithCollidingNames(node: VariableDeclarationList, hasReceiver: boolean) {
    hoistVariableDeclarationList(node);
    const variables = qf.get.initializedVariables(node);
    if (variables.length === 0) {
      if (hasReceiver) return visitNode(convertToAssignmentElementTarget(node.declarations[0].name), visitor, isExpression);
      return;
    }
    return inlineExpressions(map(variables, transformInitializedVariable));
  }
  function hoistVariableDeclarationList(node: VariableDeclarationList) {
    forEach(node.declarations, hoistVariable);
  }
  function hoistVariable({ name }: VariableDeclaration | BindingElement) {
    if (qc.is.kind(qc.Identifier, name)) {
      hoistVariableDeclaration(name);
    } else {
      for (const element of name.elements) {
        if (!qc.is.kind(qc.OmittedExpression, element)) {
          hoistVariable(element);
        }
      }
    }
  }
  function transformInitializedVariable(node: VariableDeclaration) {
    const converted = setSourceMapRange(createAssignment(convertToAssignmentElementTarget(node.name), node.initer!), node);
    return visitNode(converted, visitor, isExpression);
  }
  function collidesWithParameterName({ name }: VariableDeclaration | BindingElement): boolean {
    if (qc.is.kind(qc.Identifier, name)) return enclosingFunctionParameterNames.has(name.escapedText);
    else {
      for (const element of name.elements) {
        if (!qc.is.kind(qc.OmittedExpression, element) && collidesWithParameterName(element)) return true;
      }
    }
    return false;
  }
  function transformAsyncFunctionBody(node: MethodDeclaration | AccessorDeclaration | FunctionDeclaration | FunctionExpression): FunctionBody;
  function transformAsyncFunctionBody(node: ArrowFunction): ConciseBody;
  function transformAsyncFunctionBody(node: FunctionLikeDeclaration): ConciseBody {
    resumeLexicalEnvironment();
    const original = qc.get.originalOf(node, isFunctionLike);
    const nodeType = original.type;
    const promiseConstructor = languageVersion < ScriptTarget.ES2015 ? getPromiseConstructor(nodeType) : undefined;
    const isArrowFunction = node.kind === Syntax.ArrowFunction;
    const hasLexicalArguments = (resolver.getNodeCheckFlags(node) & NodeCheckFlags.CaptureArguments) !== 0;
    const savedEnclosingFunctionParameterNames = enclosingFunctionParameterNames;
    enclosingFunctionParameterNames = qb.createEscapedMap<true>();
    for (const parameter of node.parameters) {
      recordDeclarationName(parameter, enclosingFunctionParameterNames);
    }
    const savedCapturedSuperProperties = capturedSuperProperties;
    const savedHasSuperElementAccess = hasSuperElementAccess;
    if (!isArrowFunction) {
      capturedSuperProperties = qb.createEscapedMap<true>();
      hasSuperElementAccess = false;
    }
    let result: ConciseBody;
    if (!isArrowFunction) {
      const statements: Statement[] = [];
      const statementOffset = addPrologue(statements, (<Block>node.body).statements, false, visitor);
      statements.push(
        new qc.ReturnStatement(createAwaiterHelper(context, inHasLexicalThisContext(), hasLexicalArguments, promiseConstructor, transformAsyncFunctionBodyWorker(<Block>node.body, statementOffset)))
      );
      insertStatementsAfterStandardPrologue(statements, endLexicalEnvironment());
      const emitSuperHelpers = languageVersion >= ScriptTarget.ES2015 && resolver.getNodeCheckFlags(node) & (NodeCheckFlags.AsyncMethodWithSuperBinding | NodeCheckFlags.AsyncMethodWithSuper);
      if (emitSuperHelpers) {
        enableSubstitutionForAsyncMethodsWithSuper();
        if (qb.hasEntries(capturedSuperProperties)) {
          const variableStatement = createSuperAccessVariableStatement(resolver, node, capturedSuperProperties);
          substitutedSuperAccessors[qf.get.nodeId(variableStatement)] = true;
          insertStatementsAfterStandardPrologue(statements, [variableStatement]);
        }
      }
      const block = new Block(statements, true);
      setRange(block, node.body);
      if (emitSuperHelpers && hasSuperElementAccess) {
        if (resolver.getNodeCheckFlags(node) & NodeCheckFlags.AsyncMethodWithSuperBinding) {
          addEmitHelper(block, advancedAsyncSuperHelper);
        } else if (resolver.getNodeCheckFlags(node) & NodeCheckFlags.AsyncMethodWithSuper) {
          addEmitHelper(block, asyncSuperHelper);
        }
      }
      result = block;
    } else {
      const expression = createAwaiterHelper(context, inHasLexicalThisContext(), hasLexicalArguments, promiseConstructor, transformAsyncFunctionBodyWorker(node.body!));
      const declarations = endLexicalEnvironment();
      if (some(declarations)) {
        const block = convertToFunctionBody(expression);
        result = block.update(setRange(new Nodes(concatenate(declarations, block.statements)), block.statements));
      } else {
        result = expression;
      }
    }
    enclosingFunctionParameterNames = savedEnclosingFunctionParameterNames;
    if (!isArrowFunction) {
      capturedSuperProperties = savedCapturedSuperProperties;
      hasSuperElementAccess = savedHasSuperElementAccess;
    }
    return result;
  }
  function transformAsyncFunctionBodyWorker(body: ConciseBody, start?: number) {
    if (qc.is.kind(qc.Block, body)) return body.update(Nodes.visit(body.statements, asyncBodyVisitor, isStatement, start));
    return convertToFunctionBody(visitNode(body, asyncBodyVisitor, isConciseBody));
  }
  function getPromiseConstructor(type: TypeNode | undefined) {
    const typeName = type && qf.get.entityNameFromTypeNode(type);
    if (typeName && qc.is.entityName(typeName)) {
      const serializationKind = resolver.getTypeReferenceSerializationKind(typeName);
      if (serializationKind === TypeReferenceSerializationKind.TypeWithConstructSignatureAndValue || serializationKind === TypeReferenceSerializationKind.Unknown) return typeName;
    }
    return;
  }
  function enableSubstitutionForAsyncMethodsWithSuper() {
    if ((enabledSubstitutions & ES2017SubstitutionFlags.AsyncMethodsWithSuper) === 0) {
      enabledSubstitutions |= ES2017SubstitutionFlags.AsyncMethodsWithSuper;
      context.enableSubstitution(Syntax.CallExpression);
      context.enableSubstitution(Syntax.PropertyAccessExpression);
      context.enableSubstitution(Syntax.ElementAccessExpression);
      context.enableEmitNotification(Syntax.ClassDeclaration);
      context.enableEmitNotification(Syntax.MethodDeclaration);
      context.enableEmitNotification(Syntax.GetAccessor);
      context.enableEmitNotification(Syntax.SetAccessor);
      context.enableEmitNotification(Syntax.Constructor);
      context.enableEmitNotification(Syntax.VariableStatement);
    }
  }
  function onEmitNode(hint: EmitHint, node: Node, emitCallback: (hint: EmitHint, node: Node) => void): void {
    if (enabledSubstitutions & ES2017SubstitutionFlags.AsyncMethodsWithSuper && isSuperContainer(node)) {
      const superContainerFlags = resolver.getNodeCheckFlags(node) & (NodeCheckFlags.AsyncMethodWithSuper | NodeCheckFlags.AsyncMethodWithSuperBinding);
      if (superContainerFlags !== enclosingSuperContainerFlags) {
        const savedEnclosingSuperContainerFlags = enclosingSuperContainerFlags;
        enclosingSuperContainerFlags = superContainerFlags;
        previousOnEmitNode(hint, node, emitCallback);
        enclosingSuperContainerFlags = savedEnclosingSuperContainerFlags;
        return;
      }
    } else if (enabledSubstitutions && substitutedSuperAccessors[qf.get.nodeId(node)]) {
      const savedEnclosingSuperContainerFlags = enclosingSuperContainerFlags;
      enclosingSuperContainerFlags = 0;
      previousOnEmitNode(hint, node, emitCallback);
      enclosingSuperContainerFlags = savedEnclosingSuperContainerFlags;
      return;
    }
    previousOnEmitNode(hint, node, emitCallback);
  }
  function onSubstituteNode(hint: EmitHint, node: Node) {
    node = previousOnSubstituteNode(hint, node);
    if (hint === EmitHint.Expression && enclosingSuperContainerFlags) return substituteExpression(<Expression>node);
    return node;
  }
  function substituteExpression(node: Expression) {
    switch (node.kind) {
      case Syntax.PropertyAccessExpression:
        return substitutePropertyAccessExpression(<PropertyAccessExpression>node);
      case Syntax.ElementAccessExpression:
        return substituteElementAccessExpression(<ElementAccessExpression>node);
      case Syntax.CallExpression:
        return substituteCallExpression(<CallExpression>node);
    }
    return node;
  }
  function substitutePropertyAccessExpression(node: PropertyAccessExpression) {
    if (node.expression.kind === Syntax.SuperKeyword) return setRange(new qc.PropertyAccessExpression(createFileLevelUniqueName('_super'), node.name), node);
    return node;
  }
  function substituteElementAccessExpression(node: ElementAccessExpression) {
    if (node.expression.kind === Syntax.SuperKeyword) return createSuperElementAccessInAsyncMethod(node.argumentExpression, node);
    return node;
  }
  function substituteCallExpression(node: CallExpression): Expression {
    const expression = node.expression;
    if (qc.is.superProperty(expression)) {
      const argumentExpression = qc.is.kind(qc.PropertyAccessExpression, expression) ? substitutePropertyAccessExpression(expression) : substituteElementAccessExpression(expression);
      return new qs.CallExpression(new qc.PropertyAccessExpression(argumentExpression, 'call'), undefined, [new qc.ThisExpression(), ...node.arguments]);
    }
    return node;
  }
  function isSuperContainer(node: Node): node is SuperContainer {
    const kind = node.kind;
    return kind === Syntax.ClassDeclaration || kind === Syntax.Constructor || kind === Syntax.MethodDeclaration || kind === Syntax.GetAccessor || kind === Syntax.SetAccessor;
  }
  function createSuperElementAccessInAsyncMethod(argumentExpression: Expression, location: TextRange): LeftHandSideExpression {
    if (enclosingSuperContainerFlags & NodeCheckFlags.AsyncMethodWithSuperBinding)
      return setRange(new qc.PropertyAccessExpression(new qs.CallExpression(createFileLevelUniqueName('_superIndex'), undefined, [argumentExpression]), 'value'), location);
    return setRange(new qs.CallExpression(createFileLevelUniqueName('_superIndex'), undefined, [argumentExpression]), location);
  }
}
export function createSuperAccessVariableStatement(resolver: EmitResolver, node: FunctionLikeDeclaration, names: EscapedMap<true>) {
  const hasBinding = (resolver.getNodeCheckFlags(node) & NodeCheckFlags.AsyncMethodWithSuperBinding) !== 0;
  const accessors: PropertyAssignment[] = [];
  names.forEach((_, key) => {
    const name = syntax.get.unescUnderscores(key);
    const getterAndSetter: PropertyAssignment[] = [];
    getterAndSetter.push(
      new qc.PropertyAssignment(
        'get',
        new ArrowFunction(
          undefined,
          undefined,
          [],
          undefined,
          undefined,
          setEmitFlags(new qc.PropertyAccessExpression(setEmitFlags(new qc.SuperExpression(), EmitFlags.NoSubstitution), name), EmitFlags.NoSubstitution)
        )
      )
    );
    if (hasBinding) {
      getterAndSetter.push(
        new qc.PropertyAssignment(
          'set',
          new ArrowFunction(
            undefined,
            undefined,
            [new qc.ParameterDeclaration(undefined, undefined, undefined, 'v', undefined, undefined, undefined)],
            undefined,
            undefined,
            createAssignment(setEmitFlags(new qc.PropertyAccessExpression(setEmitFlags(new qc.SuperExpression(), EmitFlags.NoSubstitution), name), EmitFlags.NoSubstitution), new Identifier('v'))
          )
        )
      );
    }
    accessors.push(new qc.PropertyAssignment(name, new qc.ObjectLiteralExpression(getterAndSetter)));
  });
  return new qc.VariableStatement(
    undefined,
    new qc.VariableDeclarationList(
      [new qc.VariableDeclaration(createFileLevelUniqueName('_super'), undefined, new qs.CallExpression(new qc.PropertyAccessExpression(new Identifier('Object'), 'create'), true))],
      NodeFlags.Const
    )
  );
}
export const awaiterHelper: UnscopedEmitHelper = {
  name: 'typescript:awaiter',
  importName: '__awaiter',
  scoped: false,
  priority: 5,
  text: `
            var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
                function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
                return new (P || (P = Promise))(function (resolve, reject) {
                    function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
                    function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
                    function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
                    step((generator = generator.apply(thisArg, _arguments || [])).next());
                });
            };`,
};
function createAwaiterHelper(context: TransformationContext, hasLexicalThis: boolean, hasLexicalArguments: boolean, promiseConstructor: EntityName | Expression | undefined, body: Block) {
  context.requestEmitHelper(awaiterHelper);
  const generatorFunc = new qs.FunctionExpression([], undefined, body);
  (generatorFunc.emitNode || (generatorFunc.emitNode = {} as EmitNode)).flags |= EmitFlags.AsyncFunctionBody | EmitFlags.ReuseTempVariableScope;
  return new qs.CallExpression(getUnscopedHelperName('__awaiter'), undefined, [
    hasLexicalThis ? new qc.ThisExpression() : qs.VoidExpression.zero(),
    hasLexicalArguments ? new Identifier('arguments') : qs.VoidExpression.zero(),
    promiseConstructor ? createExpressionFromEntityName(promiseConstructor) : qs.VoidExpression.zero(),
    generatorFunc,
  ]);
}
export const asyncSuperHelper: EmitHelper = {
  name: 'typescript:async-super',
  scoped: true,
  text: helperString`
            const ${'_superIndex'} = name => super[name];`,
};
export const advancedAsyncSuperHelper: EmitHelper = {
  name: 'typescript:advanced-async-super',
  scoped: true,
  text: helperString`
            const ${'_superIndex'} = (function (geti, seti) {
                const cache = Object.create(null);
                return name => cache[name] || (cache[name] = { get value() { return geti(name); }, set value(v) { seti(name, v); } });
            })(name => super[name], (name, value) => super[name] = value);`,
};
