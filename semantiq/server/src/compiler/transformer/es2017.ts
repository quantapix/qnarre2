import { Node, Modifier, ModifierFlags } from '../types';
import { qf, Nodes } from '../core';
import { Syntax } from '../syntax';
import * as qc from '../core';
import * as qd from '../diags';
import * as qt from '../types';
import * as qu from '../utils';
import * as qy from '../syntax';
type SuperContainer = qt.ClassDeclaration | qt.MethodDeclaration | qt.GetAccessorDeclaration | qt.SetAccessorDeclaration | qt.ConstructorDeclaration;
const enum ES2017SubstitutionFlags {
  AsyncMethodsWithSuper = 1 << 0,
}
const enum ContextFlags {
  NonTopLevel = 1 << 0,
  HasLexicalThis = 1 << 1,
}
export function transformES2017(context: qt.TrafoContext) {
  const { resumeLexicalEnvironment, endLexicalEnvironment, hoistVariableDeclaration } = context;
  const resolver = context.getEmitResolver();
  const compilerOpts = context.getCompilerOpts();
  const languageVersion = getEmitScriptTarget(compilerOpts);
  let enabledSubstitutions: ES2017SubstitutionFlags;
  let enclosingSuperContainerFlags: NodeCheckFlags = 0;
  let enclosingFunctionParamNames: EscapedMap<true>;
  let capturedSuperProperties: EscapedMap<true>;
  let hasSuperElemAccess: boolean;
  const substitutedSuperAccessors: boolean[] = [];
  let contextFlags: ContextFlags = 0;
  const previousOnEmitNode = context.onEmitNode;
  const previousOnSubstituteNode = context.onSubstituteNode;
  context.onEmitNode = onEmitNode;
  context.onSubstituteNode = onSubstituteNode;
  return chainBundle(transformSourceFile);
  function transformSourceFile(node: qt.SourceFile) {
    if (node.isDeclarationFile) return node;
    setContextFlag(ContextFlags.NonTopLevel, false);
    setContextFlag(ContextFlags.HasLexicalThis, !node.isEffectiveStrictMode(compilerOpts));
    const visited = visitEachChild(node, visitor, context);
    qf.emit.addHelpers(visited, context.readEmitHelpers());
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
    if ((node.trafoFlags & TrafoFlags.ContainsES2017) === 0) return node;
    switch (node.kind) {
      case Syntax.AsyncKeyword:
        return;
      case Syntax.AwaitExpression:
        return visitAwaitExpression(<qt.AwaitExpression>node);
      case Syntax.MethodDeclaration:
        return doWithContext(ContextFlags.NonTopLevel | ContextFlags.HasLexicalThis, visitMethodDeclaration, <qt.MethodDeclaration>node);
      case Syntax.FunctionDeclaration:
        return doWithContext(ContextFlags.NonTopLevel | ContextFlags.HasLexicalThis, visitFunctionDeclaration, <qt.FunctionDeclaration>node);
      case Syntax.FunctionExpression:
        return doWithContext(ContextFlags.NonTopLevel | ContextFlags.HasLexicalThis, visitFunctionExpression, <qt.FunctionExpression>node);
      case Syntax.ArrowFunction:
        return doWithContext(ContextFlags.NonTopLevel, visitArrowFunction, <qt.ArrowFunction>node);
      case Syntax.PropertyAccessExpression:
        if (capturedSuperProperties && qf.is.kind(qc.PropertyAccessExpression, node) && node.expression.kind === Syntax.SuperKeyword) {
          capturedSuperProperties.set(node.name.escapedText, true);
        }
        return visitEachChild(node, visitor, context);
      case Syntax.ElemAccessExpression:
        if (capturedSuperProperties && (<qt.ElemAccessExpression>node).expression.kind === Syntax.SuperKeyword) {
          hasSuperElemAccess = true;
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
    if (qf.is.nodeWithPossibleHoistedDeclaration(node)) {
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
          return qc.assert.never(node, 'Unhandled node.');
      }
    }
    return visitor(node);
  }
  function visitCatchClauseInAsyncBody(node: qt.CatchClause) {
    const catchClauseNames = qc.createEscapedMap<true>();
    recordDeclarationName(node.variableDeclaration!, catchClauseNames);
    let catchClauseUnshadowedNames: EscapedMap<true> | undefined;
    catchClauseNames.forEach((_, escName) => {
      if (enclosingFunctionParamNames.has(escName)) {
        if (!catchClauseUnshadowedNames) {
          catchClauseUnshadowedNames = cloneMap(enclosingFunctionParamNames);
        }
        catchClauseUnshadowedNames.delete(escName);
      }
    });
    if (catchClauseUnshadowedNames) {
      const savedEnclosingFunctionParamNames = enclosingFunctionParamNames;
      enclosingFunctionParamNames = catchClauseUnshadowedNames;
      const result = visitEachChild(node, asyncBodyVisitor, context);
      enclosingFunctionParamNames = savedEnclosingFunctionParamNames;
      return result;
    }
    return visitEachChild(node, asyncBodyVisitor, context);
  }
  function visitVariableStatementInAsyncBody(node: qt.VariableStatement) {
    if (isVariableDeclarationListWithCollidingName(node.declarationList)) {
      const expression = visitVariableDeclarationListWithCollidingNames(node.declarationList, false);
      return expression ? new qc.ExpressionStatement(expression) : undefined;
    }
    return visitEachChild(node, visitor, context);
  }
  function visitForInStatementInAsyncBody(node: qt.ForInStatement) {
    return updateForIn(
      node,
      isVariableDeclarationListWithCollidingName(node.initer) ? visitVariableDeclarationListWithCollidingNames(node.initer, true)! : visitNode(node.initer, visitor, isForIniter),
      visitNode(node.expression, visitor, isExpression),
      visitNode(node.statement, asyncBodyVisitor, qf.is.statement, liftToBlock)
    );
  }
  function visitForOfStatementInAsyncBody(node: qt.ForOfStatement) {
    return updateForOf(
      node,
      visitNode(node.awaitModifier, visitor, isToken),
      isVariableDeclarationListWithCollidingName(node.initer) ? visitVariableDeclarationListWithCollidingNames(node.initer, true)! : visitNode(node.initer, visitor, isForIniter),
      visitNode(node.expression, visitor, isExpression),
      visitNode(node.statement, asyncBodyVisitor, qf.is.statement, liftToBlock)
    );
  }
  function visitForStatementInAsyncBody(node: qt.ForStatement) {
    const initer = node.initer!;
    return updateFor(
      node,
      isVariableDeclarationListWithCollidingName(initer) ? visitVariableDeclarationListWithCollidingNames(initer, false) : visitNode(node.initer, visitor, isForIniter),
      visitNode(node.condition, visitor, isExpression),
      visitNode(node.incrementor, visitor, isExpression),
      visitNode(node.statement, asyncBodyVisitor, qf.is.statement, liftToBlock)
    );
  }
  function visitAwaitExpression(node: qt.AwaitExpression): Expression {
    if (inTopLevelContext()) return visitEachChild(node, visitor, context);
    return new qc.YieldExpression(undefined, visitNode(node.expression, visitor, isExpression)).setRange(node).setOriginal(node);
  }
  function visitMethodDeclaration(node: qt.MethodDeclaration) {
    return node.update(
      undefined,
      Nodes.visit(node.modifiers, visitor, isModifier),
      node.asteriskToken,
      node.name,
      undefined,
      undefined,
      visitParamList(node.params, visitor, context),
      undefined,
      qf.get.functionFlags(node) & FunctionFlags.Async ? transformAsyncFunctionBody(node) : visitFunctionBody(node.body, visitor, context)
    );
  }
  function visitFunctionDeclaration(node: qt.FunctionDeclaration): VisitResult<Statement> {
    return node.update(
      undefined,
      Nodes.visit(node.modifiers, visitor, isModifier),
      node.asteriskToken,
      node.name,
      undefined,
      visitParamList(node.params, visitor, context),
      undefined,
      qf.get.functionFlags(node) & FunctionFlags.Async ? transformAsyncFunctionBody(node) : visitFunctionBody(node.body, visitor, context)
    );
  }
  function visitFunctionExpression(node: qt.FunctionExpression): Expression {
    return node.update(
      Nodes.visit(node.modifiers, visitor, isModifier),
      node.asteriskToken,
      node.name,
      undefined,
      visitParamList(node.params, visitor, context),
      undefined,
      qf.get.functionFlags(node) & FunctionFlags.Async ? transformAsyncFunctionBody(node) : visitFunctionBody(node.body, visitor, context)
    );
  }
  function visitArrowFunction(node: qt.ArrowFunction) {
    return node.update(
      Nodes.visit(node.modifiers, visitor, isModifier),
      undefined,
      visitParamList(node.params, visitor, context),
      undefined,
      node.equalsGreaterThanToken,
      qf.get.functionFlags(node) & FunctionFlags.Async ? transformAsyncFunctionBody(node) : visitFunctionBody(node.body, visitor, context)
    );
  }
  function recordDeclarationName({ name }: qt.ParamDeclaration | qt.VariableDeclaration | qt.BindingElem, names: EscapedMap<true>) {
    if (qf.is.kind(qc.Identifier, name)) {
      names.set(name.escapedText, true);
    } else {
      for (const elem of name.elems) {
        if (!qf.is.kind(qc.OmittedExpression, elem)) {
          recordDeclarationName(elem, names);
        }
      }
    }
  }
  function isVariableDeclarationListWithCollidingName(node: ForIniter): node is qt.VariableDeclarationList {
    return !!node && qf.is.kind(qc.VariableDeclarationList, node) && !(node.flags & NodeFlags.BlockScoped) && node.declarations.some(collidesWithParamName);
  }
  function visitVariableDeclarationListWithCollidingNames(node: qt.VariableDeclarationList, hasReceiver: boolean) {
    hoistVariableDeclarationList(node);
    const variables = qf.get.initializedVariables(node);
    if (variables.length === 0) {
      if (hasReceiver) return visitNode(convertToAssignmentElemTarget(node.declarations[0].name), visitor, isExpression);
      return;
    }
    return inlineExpressions(map(variables, transformInitializedVariable));
  }
  function hoistVariableDeclarationList(node: qt.VariableDeclarationList) {
    forEach(node.declarations, hoistVariable);
  }
  function hoistVariable({ name }: qt.VariableDeclaration | qt.BindingElem) {
    if (qf.is.kind(qc.Identifier, name)) {
      hoistVariableDeclaration(name);
    } else {
      for (const elem of name.elems) {
        if (!qf.is.kind(qc.OmittedExpression, elem)) {
          hoistVariable(elem);
        }
      }
    }
  }
  function transformInitializedVariable(node: qt.VariableDeclaration) {
    const converted = qf.emit.setSourceMapRange(qf.create.assignment(convertToAssignmentElemTarget(node.name), node.initer!), node);
    return visitNode(converted, visitor, isExpression);
  }
  function collidesWithParamName({ name }: qt.VariableDeclaration | qt.BindingElem): boolean {
    if (qf.is.kind(qc.Identifier, name)) return enclosingFunctionParamNames.has(name.escapedText);
    else {
      for (const elem of name.elems) {
        if (!qf.is.kind(qc.OmittedExpression, elem) && collidesWithParamName(elem)) return true;
      }
    }
    return false;
  }
  function transformAsyncFunctionBody(node: qt.MethodDeclaration | qt.AccessorDeclaration | qt.FunctionDeclaration | qt.FunctionExpression): FunctionBody;
  function transformAsyncFunctionBody(node: qt.ArrowFunction): ConciseBody;
  function transformAsyncFunctionBody(node: FunctionLikeDeclaration): ConciseBody {
    resumeLexicalEnvironment();
    const original = qf.get.originalOf(node, isFunctionLike);
    const nodeType = original.type;
    const promiseConstructor = languageVersion < ScriptTarget.ES2015 ? getPromiseConstructor(nodeType) : undefined;
    const isArrowFunction = node.kind === Syntax.ArrowFunction;
    const hasLexicalArgs = (resolver.getNodeCheckFlags(node) & NodeCheckFlags.CaptureArgs) !== 0;
    const savedEnclosingFunctionParamNames = enclosingFunctionParamNames;
    enclosingFunctionParamNames = qc.createEscapedMap<true>();
    for (const param of node.params) {
      recordDeclarationName(param, enclosingFunctionParamNames);
    }
    const savedCapturedSuperProperties = capturedSuperProperties;
    const savedHasSuperElemAccess = hasSuperElemAccess;
    if (!isArrowFunction) {
      capturedSuperProperties = qc.createEscapedMap<true>();
      hasSuperElemAccess = false;
    }
    let result: ConciseBody;
    if (!isArrowFunction) {
      const statements: Statement[] = [];
      const statementOffset = addPrologue(statements, (<qt.Block>node.body).statements, false, visitor);
      statements.push(
        new qc.ReturnStatement(createAwaiterHelper(context, inHasLexicalThisContext(), hasLexicalArgs, promiseConstructor, transformAsyncFunctionBodyWorker(<qt.Block>node.body, statementOffset)))
      );
      insertStatementsAfterStandardPrologue(statements, endLexicalEnvironment());
      const emitSuperHelpers = languageVersion >= ScriptTarget.ES2015 && resolver.getNodeCheckFlags(node) & (NodeCheckFlags.AsyncMethodWithSuperBinding | NodeCheckFlags.AsyncMethodWithSuper);
      if (emitSuperHelpers) {
        enableSubstitutionForAsyncMethodsWithSuper();
        if (qc.hasEntries(capturedSuperProperties)) {
          const variableStatement = createSuperAccessVariableStatement(resolver, node, capturedSuperProperties);
          substitutedSuperAccessors[qf.get.nodeId(variableStatement)] = true;
          insertStatementsAfterStandardPrologue(statements, [variableStatement]);
        }
      }
      const block = new qt.Block(statements, true);
      block.setRange(node.body);
      if (emitSuperHelpers && hasSuperElemAccess) {
        if (resolver.getNodeCheckFlags(node) & NodeCheckFlags.AsyncMethodWithSuperBinding) {
          qf.emit.addHelper(block, advancedAsyncSuperHelper);
        } else if (resolver.getNodeCheckFlags(node) & NodeCheckFlags.AsyncMethodWithSuper) {
          qf.emit.addHelper(block, asyncSuperHelper);
        }
      }
      result = block;
    } else {
      const expression = createAwaiterHelper(context, inHasLexicalThisContext(), hasLexicalArgs, promiseConstructor, transformAsyncFunctionBodyWorker(node.body!));
      const declarations = endLexicalEnvironment();
      if (some(declarations)) {
        const block = convertToFunctionBody(expression);
        result = block.update(new Nodes(concatenate(declarations, block.statements)).setRange(block.statements));
      } else {
        result = expression;
      }
    }
    enclosingFunctionParamNames = savedEnclosingFunctionParamNames;
    if (!isArrowFunction) {
      capturedSuperProperties = savedCapturedSuperProperties;
      hasSuperElemAccess = savedHasSuperElemAccess;
    }
    return result;
  }
  function transformAsyncFunctionBodyWorker(body: ConciseBody, start?: number) {
    if (qf.is.kind(qc.Block, body)) return body.update(Nodes.visit(body.statements, asyncBodyVisitor, qf.is.statement, start));
    return convertToFunctionBody(visitNode(body, asyncBodyVisitor, isConciseBody));
  }
  function getPromiseConstructor(type: Typing | undefined) {
    const typeName = type && qf.get.entityNameFromTypeNode(type);
    if (typeName && qf.is.entityName(typeName)) {
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
      context.enableSubstitution(Syntax.ElemAccessExpression);
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
        return substitutePropertyAccessExpression(<qt.PropertyAccessExpression>node);
      case Syntax.ElemAccessExpression:
        return substituteElemAccessExpression(<qt.ElemAccessExpression>node);
      case Syntax.CallExpression:
        return substituteCallExpression(<qt.CallExpression>node);
    }
    return node;
  }
  function substitutePropertyAccessExpression(node: qt.PropertyAccessExpression) {
    if (node.expression.kind === Syntax.SuperKeyword) return new qc.PropertyAccessExpression(createFileLevelUniqueName('_super'), node.name).setRange(node);
    return node;
  }
  function substituteElemAccessExpression(node: qt.ElemAccessExpression) {
    if (node.expression.kind === Syntax.SuperKeyword) return createSuperElemAccessInAsyncMethod(node.argExpression, node);
    return node;
  }
  function substituteCallExpression(node: qt.CallExpression): Expression {
    const expression = node.expression;
    if (qf.is.superProperty(expression)) {
      const argExpression = qf.is.kind(qc.PropertyAccessExpression, expression) ? substitutePropertyAccessExpression(expression) : substituteElemAccessExpression(expression);
      return new qc.CallExpression(new qc.PropertyAccessExpression(argExpression, 'call'), undefined, [new qc.ThisExpression(), ...node.args]);
    }
    return node;
  }
  function isSuperContainer(node: Node): node is SuperContainer {
    const kind = node.kind;
    return kind === Syntax.ClassDeclaration || kind === Syntax.Constructor || kind === Syntax.MethodDeclaration || kind === Syntax.GetAccessor || kind === Syntax.SetAccessor;
  }
  function createSuperElemAccessInAsyncMethod(argExpression: Expression, location: TextRange): LeftExpression {
    if (enclosingSuperContainerFlags & NodeCheckFlags.AsyncMethodWithSuperBinding)
      return new qc.PropertyAccessExpression(new qc.CallExpression(createFileLevelUniqueName('_superIndex'), undefined, [argExpression]), 'value').setRange(location);
    return new qc.CallExpression(createFileLevelUniqueName('_superIndex'), undefined, [argExpression]).setRange(location);
  }
}
export function createSuperAccessVariableStatement(resolver: qt.EmitResolver, node: FunctionLikeDeclaration, names: EscapedMap<true>) {
  const hasBinding = (resolver.getNodeCheckFlags(node) & NodeCheckFlags.AsyncMethodWithSuperBinding) !== 0;
  const accessors: qt.PropertyAssignment[] = [];
  names.forEach((_, key) => {
    const name = syntax.get.unescUnderscores(key);
    const getterAndSetter: qt.PropertyAssignment[] = [];
    getterAndSetter.push(
      new qc.PropertyAssignment(
        'get',
        new qt.ArrowFunction(
          undefined,
          undefined,
          [],
          undefined,
          undefined,
          qf.emit.setFlags(new qc.PropertyAccessExpression(qf.emit.setFlags(new qc.SuperExpression(), EmitFlags.NoSubstitution), name), EmitFlags.NoSubstitution)
        )
      )
    );
    if (hasBinding) {
      getterAndSetter.push(
        new qc.PropertyAssignment(
          'set',
          new qt.ArrowFunction(
            undefined,
            undefined,
            [new qc.ParamDeclaration(undefined, undefined, undefined, 'v', undefined, undefined, undefined)],
            undefined,
            undefined,
            qf.create.assignment(
              qf.emit.setFlags(new qc.PropertyAccessExpression(qf.emit.setFlags(new qc.SuperExpression(), EmitFlags.NoSubstitution), name), EmitFlags.NoSubstitution),
              new qt.Identifier('v')
            )
          )
        )
      );
    }
    accessors.push(new qc.PropertyAssignment(name, new qc.ObjectLiteralExpression(getterAndSetter)));
  });
  return new qc.VariableStatement(
    undefined,
    new qc.VariableDeclarationList(
      [new qc.VariableDeclaration(createFileLevelUniqueName('_super'), undefined, new qc.CallExpression(new qc.PropertyAccessExpression(new qt.Identifier('Object'), 'create'), true))],
      NodeFlags.Const
    )
  );
}
export const awaiterHelper: qt.UnscopedEmitHelper = {
  name: 'typescript:awaiter',
  importName: '__awaiter',
  scoped: false,
  priority: 5,
  text: `
            var __awaiter = (this && this.__awaiter) || function (thisArg, _args, P, generator) {
                function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
                return new (P || (P = Promise))(function (resolve, reject) {
                    function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
                    function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
                    function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
                    step((generator = generator.apply(thisArg, _args || [])).next());
                });
            };`,
};
function createAwaiterHelper(context: qt.TrafoContext, hasLexicalThis: boolean, hasLexicalArgs: boolean, promiseConstructor: EntityName | Expression | undefined, body: qt.Block) {
  context.requestEmitHelper(awaiterHelper);
  const generatorFunc = new qc.FunctionExpression([], undefined, body);
  (generatorFunc.emitNode || (generatorFunc.emitNode = {} as qt.EmitNode)).flags |= EmitFlags.AsyncFunctionBody | EmitFlags.ReuseTempVariableScope;
  return new qc.CallExpression(getUnscopedHelperName('__awaiter'), undefined, [
    hasLexicalThis ? new qc.ThisExpression() : qc.VoidExpression.zero(),
    hasLexicalArgs ? new qt.Identifier('args') : qc.VoidExpression.zero(),
    promiseConstructor ? createExpressionFromEntityName(promiseConstructor) : qc.VoidExpression.zero(),
    generatorFunc,
  ]);
}
export const asyncSuperHelper: qt.EmitHelper = {
  name: 'typescript:async-super',
  scoped: true,
  text: helperString`
            const ${'_superIndex'} = name => super[name];`,
};
export const advancedAsyncSuperHelper: qt.EmitHelper = {
  name: 'typescript:advanced-async-super',
  scoped: true,
  text: helperString`
            const ${'_superIndex'} = (function (geti, seti) {
                const cache = Object.create(null);
                return name => cache[name] || (cache[name] = { get value() { return geti(name); }, set value(v) { seti(name, v); } });
            })(name => super[name], (name, value) => super[name] = value);`,
};
