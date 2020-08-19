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
  const { resumeLexicalEnv, endLexicalEnv, hoistVariableDeclaration } = context;
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
    const visited = qf.visit.children(node, visitor, context);
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
    return qf.visit.children(node, visitor, context);
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
        if (capturedSuperProperties && node.kind === Syntax.PropertyAccessExpression && node.expression.kind === Syntax.SuperKeyword) {
          capturedSuperProperties.set(node.name.escapedText, true);
        }
        return qf.visit.children(node, visitor, context);
      case Syntax.ElemAccessExpression:
        if (capturedSuperProperties && (<qt.ElemAccessExpression>node).expression.kind === Syntax.SuperKeyword) {
          hasSuperElemAccess = true;
        }
        return qf.visit.children(node, visitor, context);
      case Syntax.GetAccessor:
      case Syntax.SetAccessor:
      case Syntax.Constructor:
      case Syntax.ClassDeclaration:
      case Syntax.ClassExpression:
        return doWithContext(ContextFlags.NonTopLevel | ContextFlags.HasLexicalThis, visitDefault, node);
      default:
        return qf.visit.children(node, visitor, context);
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
          return qf.visit.children(node, asyncBodyVisitor, context);
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
      const result = qf.visit.children(node, asyncBodyVisitor, context);
      enclosingFunctionParamNames = savedEnclosingFunctionParamNames;
      return result;
    }
    return qf.visit.children(node, asyncBodyVisitor, context);
  }
  function visitVariableStatementInAsyncBody(node: qt.VariableStatement) {
    if (isVariableDeclarationListWithCollidingName(node.declarationList)) {
      const expression = visitVariableDeclarationListWithCollidingNames(node.declarationList, false);
      return expression ? new qc.ExpressionStatement(expression) : undefined;
    }
    return qf.visit.children(node, visitor, context);
  }
  function visitForInStatementInAsyncBody(node: qt.ForInStatement) {
    return updateForIn(
      node,
      isVariableDeclarationListWithCollidingName(node.initer) ? visitVariableDeclarationListWithCollidingNames(node.initer, true)! : qf.visit.node(node.initer, visitor, isForIniter),
      qf.visit.node(node.expression, visitor, isExpression),
      qf.visit.node(node.statement, asyncBodyVisitor, qf.is.statement, qc.liftToBlock)
    );
  }
  function visitForOfStatementInAsyncBody(node: qt.ForOfStatement) {
    return updateForOf(
      node,
      qf.visit.node(node.awaitModifier, visitor, isToken),
      isVariableDeclarationListWithCollidingName(node.initer) ? visitVariableDeclarationListWithCollidingNames(node.initer, true)! : qf.visit.node(node.initer, visitor, isForIniter),
      qf.visit.node(node.expression, visitor, isExpression),
      qf.visit.node(node.statement, asyncBodyVisitor, qf.is.statement, qc.liftToBlock)
    );
  }
  function visitForStatementInAsyncBody(node: qt.ForStatement) {
    const initer = node.initer!;
    return updateFor(
      node,
      isVariableDeclarationListWithCollidingName(initer) ? visitVariableDeclarationListWithCollidingNames(initer, false) : qf.visit.node(node.initer, visitor, isForIniter),
      qf.visit.node(node.condition, visitor, isExpression),
      qf.visit.node(node.incrementor, visitor, isExpression),
      qf.visit.node(node.statement, asyncBodyVisitor, qf.is.statement, qc.liftToBlock)
    );
  }
  function visitAwaitExpression(node: qt.AwaitExpression): qt.Expression {
    if (inTopLevelContext()) return qf.visit.children(node, visitor, context);
    return new qc.YieldExpression(undefined, qf.visit.node(node.expression, visitor, isExpression)).setRange(node).setOriginal(node);
  }
  function visitMethodDeclaration(node: qt.MethodDeclaration) {
    return node.update(
      undefined,
      Nodes.visit(node.modifiers, visitor, isModifier),
      node.asteriskToken,
      node.name,
      undefined,
      undefined,
      qf.visit.params(node.params, visitor, context),
      undefined,
      qf.get.functionFlags(node) & FunctionFlags.Async ? transformAsyncFunctionBody(node) : qf.visit.body(node.body, visitor, context)
    );
  }
  function visitFunctionDeclaration(node: qt.FunctionDeclaration): VisitResult<qt.Statement> {
    return node.update(
      undefined,
      Nodes.visit(node.modifiers, visitor, isModifier),
      node.asteriskToken,
      node.name,
      undefined,
      qf.visit.params(node.params, visitor, context),
      undefined,
      qf.get.functionFlags(node) & FunctionFlags.Async ? transformAsyncFunctionBody(node) : qf.visit.body(node.body, visitor, context)
    );
  }
  function visitFunctionExpression(node: qt.FunctionExpression): qt.Expression {
    return node.update(
      Nodes.visit(node.modifiers, visitor, isModifier),
      node.asteriskToken,
      node.name,
      undefined,
      qf.visit.params(node.params, visitor, context),
      undefined,
      qf.get.functionFlags(node) & FunctionFlags.Async ? transformAsyncFunctionBody(node) : qf.visit.body(node.body, visitor, context)
    );
  }
  function visitArrowFunction(node: qt.ArrowFunction) {
    return node.update(
      Nodes.visit(node.modifiers, visitor, isModifier),
      undefined,
      qf.visit.params(node.params, visitor, context),
      undefined,
      node.equalsGreaterThanToken,
      qf.get.functionFlags(node) & FunctionFlags.Async ? transformAsyncFunctionBody(node) : qf.visit.body(node.body, visitor, context)
    );
  }
  function recordDeclarationName({ name }: qt.ParamDeclaration | qt.VariableDeclaration | qt.BindingElem, names: EscapedMap<true>) {
    if (name.kind === Syntax.Identifier) {
      names.set(name.escapedText, true);
    } else {
      for (const elem of name.elems) {
        if (!elem.kind === Syntax.OmittedExpression) {
          recordDeclarationName(elem, names);
        }
      }
    }
  }
  function isVariableDeclarationListWithCollidingName(node: qt.ForIniter): node is qt.VariableDeclarationList {
    return !!node && node.kind === Syntax.VariableDeclarationList && !(node.flags & NodeFlags.BlockScoped) && node.declarations.some(collidesWithParamName);
  }
  function visitVariableDeclarationListWithCollidingNames(node: qt.VariableDeclarationList, hasReceiver: boolean) {
    hoistVariableDeclarationList(node);
    const variables = qf.get.initializedVariables(node);
    if (variables.length === 0) {
      if (hasReceiver) return qf.visit.node(convertToAssignmentElemTarget(node.declarations[0].name), visitor, isExpression);
      return;
    }
    return inlineExpressions(map(variables, transformInitializedVariable));
  }
  function hoistVariableDeclarationList(node: qt.VariableDeclarationList) {
    forEach(node.declarations, hoistVariable);
  }
  function hoistVariable({ name }: qt.VariableDeclaration | qt.BindingElem) {
    if (name.kind === Syntax.Identifier) {
      hoistVariableDeclaration(name);
    } else {
      for (const elem of name.elems) {
        if (!elem.kind === Syntax.OmittedExpression) {
          hoistVariable(elem);
        }
      }
    }
  }
  function transformInitializedVariable(node: qt.VariableDeclaration) {
    const converted = qf.emit.setSourceMapRange(qf.make.assignment(convertToAssignmentElemTarget(node.name), node.initer!), node);
    return qf.visit.node(converted, visitor, isExpression);
  }
  function collidesWithParamName({ name }: qt.VariableDeclaration | qt.BindingElem): boolean {
    if (name.kind === Syntax.Identifier) return enclosingFunctionParamNames.has(name.escapedText);
    else {
      for (const elem of name.elems) {
        if (!elem.kind === Syntax.OmittedExpression && collidesWithParamName(elem)) return true;
      }
    }
    return false;
  }
  function transformAsyncFunctionBody(node: qt.MethodDeclaration | qt.AccessorDeclaration | qt.FunctionDeclaration | qt.FunctionExpression): qt.FunctionBody;
  function transformAsyncFunctionBody(node: qt.ArrowFunction): qt.ConciseBody;
  function transformAsyncFunctionBody(node: qt.FunctionLikeDeclaration): qt.ConciseBody {
    resumeLexicalEnv();
    const original = qf.get.originalOf(node, isFunctionLike);
    const nodeType = original.type;
    const promiseConstructor = languageVersion < qt.ScriptTarget.ES2015 ? getPromiseConstructor(nodeType) : undefined;
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
    let result: qt.ConciseBody;
    if (!isArrowFunction) {
      const statements: qt.Statement[] = [];
      const statementOffset = addPrologue(statements, (<qt.Block>node.body).statements, false, visitor);
      statements.push(
        new qc.ReturnStatement(createAwaiterHelper(context, inHasLexicalThisContext(), hasLexicalArgs, promiseConstructor, transformAsyncFunctionBodyWorker(<qt.Block>node.body, statementOffset)))
      );
      insertStatementsAfterStandardPrologue(statements, endLexicalEnv());
      const emitSuperHelpers = languageVersion >= qt.ScriptTarget.ES2015 && resolver.getNodeCheckFlags(node) & (NodeCheckFlags.AsyncMethodWithSuperBinding | NodeCheckFlags.AsyncMethodWithSuper);
      if (emitSuperHelpers) {
        enableSubstitutionForAsyncMethodsWithSuper();
        if (qc.hasEntries(capturedSuperProperties)) {
          const variableStatement = createSuperAccessVariableStatement(resolver, node, capturedSuperProperties);
          substitutedSuperAccessors[qf.get.nodeId(variableStatement)] = true;
          insertStatementsAfterStandardPrologue(statements, [variableStatement]);
        }
      }
      const block = new qc.Block(statements, true);
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
      const declarations = endLexicalEnv();
      if (qu.some(declarations)) {
        const block = qc.convertToFunctionBody(expression);
        result = block.update(new Nodes(qu.concatenate(declarations, block.statements)).setRange(block.statements));
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
  function transformAsyncFunctionBodyWorker(body: qt.ConciseBody, start?: number) {
    if (body.kind === Syntax.Block) return body.update(Nodes.visit(body.statements, asyncBodyVisitor, qf.is.statement, start));
    return qc.convertToFunctionBody(qf.visit.node(body, asyncBodyVisitor, qf.is.conciseBody));
  }
  function getPromiseConstructor(type: qt.Typing | undefined) {
    const typeName = type && qf.get.entityNameFromTypeNode(type);
    if (typeName && qf.is.entityName(typeName)) {
      const serializationKind = resolver.getTypeReferenceSerializationKind(typeName);
      if (serializationKind === qt.TypeReferenceSerializationKind.TypeWithConstructSignatureAndValue || serializationKind === qt.TypeReferenceSerializationKind.Unknown) return typeName;
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
  function onEmitNode(hint: qt.EmitHint, node: Node, emitCallback: (hint: qt.EmitHint, node: Node) => void): void {
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
  function onSubstituteNode(hint: qt.EmitHint, node: Node) {
    node = previousOnSubstituteNode(hint, node);
    if (hint === qt.EmitHint.Expression && enclosingSuperContainerFlags) return substituteExpression(<qt.Expression>node);
    return node;
  }
  function substituteExpression(node: qt.Expression) {
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
    if (node.expression.kind === Syntax.SuperKeyword) return new qc.PropertyAccessExpression(qf.make.fileLevelUniqueName('_super'), node.name).setRange(node);
    return node;
  }
  function substituteElemAccessExpression(node: qt.ElemAccessExpression) {
    if (node.expression.kind === Syntax.SuperKeyword) return createSuperElemAccessInAsyncMethod(node.argExpression, node);
    return node;
  }
  function substituteCallExpression(node: qt.CallExpression): qt.Expression {
    const expression = node.expression;
    if (qf.is.superProperty(expression)) {
      const argExpression = expression.kind === Syntax.PropertyAccessExpression ? substitutePropertyAccessExpression(expression) : substituteElemAccessExpression(expression);
      return new qc.CallExpression(new qc.PropertyAccessExpression(argExpression, 'call'), undefined, [new qc.ThisExpression(), ...node.args]);
    }
    return node;
  }
  function isSuperContainer(node: Node): node is SuperContainer {
    const kind = node.kind;
    return kind === Syntax.ClassDeclaration || kind === Syntax.Constructor || kind === Syntax.MethodDeclaration || kind === Syntax.GetAccessor || kind === Syntax.SetAccessor;
  }
  function createSuperElemAccessInAsyncMethod(argExpression: qt.Expression, location: TextRange): qt.LeftExpression {
    if (enclosingSuperContainerFlags & NodeCheckFlags.AsyncMethodWithSuperBinding)
      return new qc.PropertyAccessExpression(new qc.CallExpression(qf.make.fileLevelUniqueName('_superIndex'), undefined, [argExpression]), 'value').setRange(location);
    return new qc.CallExpression(qf.make.fileLevelUniqueName('_superIndex'), undefined, [argExpression]).setRange(location);
  }
}
export function createSuperAccessVariableStatement(resolver: qt.EmitResolver, node: qt.FunctionLikeDeclaration, names: EscapedMap<true>) {
  const hasBinding = (resolver.getNodeCheckFlags(node) & NodeCheckFlags.AsyncMethodWithSuperBinding) !== 0;
  const accessors: qt.PropertyAssignment[] = [];
  names.forEach((_, key) => {
    const name = syntax.get.unescUnderscores(key);
    const getterAndSetter: qt.PropertyAssignment[] = [];
    getterAndSetter.push(
      new qc.PropertyAssignment(
        'get',
        new qc.ArrowFunction(
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
          new qc.ArrowFunction(
            undefined,
            undefined,
            [new qc.ParamDeclaration(undefined, undefined, undefined, 'v', undefined, undefined, undefined)],
            undefined,
            undefined,
            qf.make.assignment(
              qf.emit.setFlags(new qc.PropertyAccessExpression(qf.emit.setFlags(new qc.SuperExpression(), EmitFlags.NoSubstitution), name), EmitFlags.NoSubstitution),
              new qc.Identifier('v')
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
      [new qc.VariableDeclaration(qf.make.fileLevelUniqueName('_super'), undefined, new qc.CallExpression(new qc.PropertyAccessExpression(new qc.Identifier('Object'), 'create'), true))],
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
function createAwaiterHelper(context: qt.TrafoContext, hasLexicalThis: boolean, hasLexicalArgs: boolean, promiseConstructor: qt.EntityName | qt.Expression | undefined, body: qt.Block) {
  context.requestEmitHelper(awaiterHelper);
  const generatorFunc = new qc.FunctionExpression([], undefined, body);
  (generatorFunc.emitNode || (generatorFunc.emitNode = {} as qt.EmitNode)).flags |= EmitFlags.AsyncFunctionBody | EmitFlags.ReuseTempVariableScope;
  return new qc.CallExpression(getUnscopedHelperName('__awaiter'), undefined, [
    hasLexicalThis ? new qc.ThisExpression() : qc.VoidExpression.zero(),
    hasLexicalArgs ? new qc.Identifier('args') : qc.VoidExpression.zero(),
    promiseConstructor ? qf.make.expressionFromEntityName(promiseConstructor) : qc.VoidExpression.zero(),
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
