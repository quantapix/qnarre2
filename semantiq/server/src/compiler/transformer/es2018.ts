import { FunctionFlags, ModifierFlags, Node, NodeCheckFlags, TrafoFlags } from '../types';
import { qf, Nodes } from '../core';
import { Syntax } from '../syntax';
import * as qc from '../core';
import * as qd from '../diags';
import * as qt from '../types';
import * as qu from '../utils';
import * as qy from '../syntax';
const enum ESNextSubstitutionFlags {
  AsyncMethodsWithSuper = 1 << 0,
}
const enum HierarchyFacts {
  None = 0,
  HasLexicalThis = 1 << 0,
  IterationContainer = 1 << 1,
  AncestorFactsMask = (IterationContainer << 1) - 1,
  SourceFileIncludes = HasLexicalThis,
  SourceFileExcludes = IterationContainer,
  StrictModeSourceFileIncludes = None,
  ClassOrFunctionIncludes = HasLexicalThis,
  ClassOrFunctionExcludes = IterationContainer,
  ArrowFunctionIncludes = None,
  ArrowFunctionExcludes = ClassOrFunctionExcludes,
  IterationStmtIncludes = IterationContainer,
  IterationStmtExcludes = None,
}
export function transformES2018(context: qt.TrafoContext) {
  const { resumeLexicalEnv, endLexicalEnv, hoistVariableDeclaration } = context;
  const resolver = context.getEmitResolver();
  const compilerOpts = context.getCompilerOpts();
  const languageVersion = getEmitScriptTarget(compilerOpts);
  const previousOnEmitNode = context.onEmitNode;
  context.onEmitNode = onEmitNode;
  const previousOnSubstituteNode = context.onSubstituteNode;
  context.onSubstituteNode = onSubstituteNode;
  let exportedVariableStatement = false;
  let enabledSubstitutions: ESNextSubstitutionFlags;
  let enclosingFunctionFlags: FunctionFlags;
  let enclosingSuperContainerFlags: NodeCheckFlags = 0;
  let hierarchyFacts: HierarchyFacts = 0;
  let currentSourceFile: qt.SourceFile;
  let taggedTemplateStringDeclarations: qt.VariableDeclaration[];
  let capturedSuperProperties: EscapedMap<true>;
  let hasSuperElemAccess: boolean;
  const substitutedSuperAccessors: boolean[] = [];
  return chainBundle(transformSourceFile);
  function affectsSubtree(excludeFacts: HierarchyFacts, includeFacts: HierarchyFacts) {
    return hierarchyFacts !== ((hierarchyFacts & ~excludeFacts) | includeFacts);
  }
  function enterSubtree(excludeFacts: HierarchyFacts, includeFacts: HierarchyFacts) {
    const ancestorFacts = hierarchyFacts;
    hierarchyFacts = ((hierarchyFacts & ~excludeFacts) | includeFacts) & HierarchyFacts.AncestorFactsMask;
    return ancestorFacts;
  }
  function exitSubtree(ancestorFacts: HierarchyFacts) {
    hierarchyFacts = ancestorFacts;
  }
  function recordTaggedTemplateString(temp: qt.Identifier) {
    taggedTemplateStringDeclarations = append(taggedTemplateStringDeclarations, new qc.VariableDeclaration(temp));
  }
  function transformSourceFile(node: qt.SourceFile) {
    if (node.isDeclarationFile) return node;
    currentSourceFile = node;
    const visited = visitSourceFile(node);
    qf.emit.addHelpers(visited, context.readEmitHelpers());
    currentSourceFile = undefined!;
    taggedTemplateStringDeclarations = undefined!;
    return visited;
  }
  function visitor(node: Node): VisitResult<Node> {
    return visitorWorker(node, false);
  }
  function visitorNoDestructuringValue(node: Node): VisitResult<Node> {
    return visitorWorker(node, true);
  }
  function visitorNoAsyncModifier(node: Node): VisitResult<Node> {
    if (node.kind === Syntax.AsyncKeyword) {
      return;
    }
    return node;
  }
  function doWithHierarchyFacts<T, U>(cb: (value: T) => U, value: T, excludeFacts: HierarchyFacts, includeFacts: HierarchyFacts) {
    if (affectsSubtree(excludeFacts, includeFacts)) {
      const ancestorFacts = enterSubtree(excludeFacts, includeFacts);
      const result = cb(value);
      exitSubtree(ancestorFacts);
      return result;
    }
    return cb(value);
  }
  function visitDefault(node: Node): VisitResult<Node> {
    return qf.visit.children(node, visitor, context);
  }
  function visitorWorker(node: Node, noDestructuringValue: boolean): VisitResult<Node> {
    if ((node.trafoFlags & TrafoFlags.ContainsES2018) === 0) return node;
    switch (node.kind) {
      case Syntax.AwaitExpression:
        return visitAwaitExpression(node as qt.AwaitExpression);
      case Syntax.YieldExpression:
        return visitYieldExpression(node as qt.YieldExpression);
      case Syntax.ReturnStatement:
        return visitReturnStatement(node as qt.ReturnStatement);
      case Syntax.LabeledStatement:
        return visitLabeledStatement(node as qt.LabeledStatement);
      case Syntax.ObjectLiteralExpression:
        return visitObjectLiteralExpression(node as qt.ObjectLiteralExpression);
      case Syntax.BinaryExpression:
        return visitBinaryExpression(node as qt.BinaryExpression, noDestructuringValue);
      case Syntax.CatchClause:
        return visitCatchClause(node as qt.CatchClause);
      case Syntax.VariableStatement:
        return visitVariableStatement(node as qt.VariableStatement);
      case Syntax.VariableDeclaration:
        return visitVariableDeclaration(node as qt.VariableDeclaration);
      case Syntax.DoStatement:
      case Syntax.WhileStatement:
      case Syntax.ForInStatement:
        return doWithHierarchyFacts(visitDefault, node, HierarchyFacts.IterationStmtExcludes, HierarchyFacts.IterationStmtIncludes);
      case Syntax.ForOfStatement:
        return visitForOfStatement(node as qt.ForOfStatement, undefined);
      case Syntax.ForStatement:
        return doWithHierarchyFacts(visitForStatement, node as qt.ForStatement, HierarchyFacts.IterationStmtExcludes, HierarchyFacts.IterationStmtIncludes);
      case Syntax.VoidExpression:
        return visitVoidExpression(node as qt.VoidExpression);
      case Syntax.Constructor:
        return doWithHierarchyFacts(visitConstructorDeclaration, node as qt.ConstructorDeclaration, HierarchyFacts.ClassOrFunctionExcludes, HierarchyFacts.ClassOrFunctionIncludes);
      case Syntax.MethodDeclaration:
        return doWithHierarchyFacts(visitMethodDeclaration, node as qt.MethodDeclaration, HierarchyFacts.ClassOrFunctionExcludes, HierarchyFacts.ClassOrFunctionIncludes);
      case Syntax.GetAccessor:
        return doWithHierarchyFacts(visitGetAccessorDeclaration, node as qt.GetAccessorDeclaration, HierarchyFacts.ClassOrFunctionExcludes, HierarchyFacts.ClassOrFunctionIncludes);
      case Syntax.SetAccessor:
        return doWithHierarchyFacts(visitSetAccessorDeclaration, node as qt.SetAccessorDeclaration, HierarchyFacts.ClassOrFunctionExcludes, HierarchyFacts.ClassOrFunctionIncludes);
      case Syntax.FunctionDeclaration:
        return doWithHierarchyFacts(visitFunctionDeclaration, node as qt.FunctionDeclaration, HierarchyFacts.ClassOrFunctionExcludes, HierarchyFacts.ClassOrFunctionIncludes);
      case Syntax.FunctionExpression:
        return doWithHierarchyFacts(visitFunctionExpression, node as qt.FunctionExpression, HierarchyFacts.ClassOrFunctionExcludes, HierarchyFacts.ClassOrFunctionIncludes);
      case Syntax.ArrowFunction:
        return doWithHierarchyFacts(visitArrowFunction, node as qt.ArrowFunction, HierarchyFacts.ArrowFunctionExcludes, HierarchyFacts.ArrowFunctionIncludes);
      case Syntax.Param:
        return visitParam(node as qt.ParamDeclaration);
      case Syntax.ExpressionStatement:
        return visitExpressionStatement(node as qt.ExpressionStatement);
      case Syntax.ParenthesizedExpression:
        return visitParenthesizedExpression(node as qt.ParenthesizedExpression, noDestructuringValue);
      case Syntax.TaggedTemplateExpression:
        return visitTaggedTemplateExpression(node as qt.TaggedTemplateExpression);
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
      case Syntax.ClassDeclaration:
      case Syntax.ClassExpression:
        return doWithHierarchyFacts(visitDefault, node, HierarchyFacts.ClassOrFunctionExcludes, HierarchyFacts.ClassOrFunctionIncludes);
      default:
        return qf.visit.children(node, visitor, context);
    }
  }
  function visitAwaitExpression(node: qt.AwaitExpression): qt.Expression {
    if (enclosingFunctionFlags & FunctionFlags.Async && enclosingFunctionFlags & FunctionFlags.Generator)
      return new qc.YieldExpression(createAwaitHelper(context, qf.visit.node(node.expression, visitor, isExpression))).setRange(node).setOriginal(node);
    return qf.visit.children(node, visitor, context);
  }
  function visitYieldExpression(node: qt.YieldExpression) {
    if (enclosingFunctionFlags & FunctionFlags.Async && enclosingFunctionFlags & FunctionFlags.Generator) {
      if (node.asteriskToken) {
        const expression = qf.visit.node(node.expression, visitor, isExpression);
        return setOriginalNode(
          new qc.YieldExpression(
            createAwaitHelper(context, node.update(node.asteriskToken, createAsyncDelegatorHelper(context, createAsyncValuesHelper(context, expression, expression), expression)))
          ).setRange(node),
          node
        );
      }
      return new qc.YieldExpression(createDownlevelAwait(node.expression ? qf.visit.node(node.expression, visitor, isExpression) : qc.VoidExpression.zero())).setRange(node).setOriginal(node);
    }
    return qf.visit.children(node, visitor, context);
  }
  function visitReturnStatement(node: qt.ReturnStatement) {
    if (enclosingFunctionFlags & FunctionFlags.Async && enclosingFunctionFlags & FunctionFlags.Generator)
      return node.update(createDownlevelAwait(node.expression ? qf.visit.node(node.expression, visitor, isExpression) : qc.VoidExpression.zero()));
    return qf.visit.children(node, visitor, context);
  }
  function visitLabeledStatement(node: qt.LabeledStatement) {
    if (enclosingFunctionFlags & FunctionFlags.Async) {
      const statement = unwrapInnermostStatementOfLabel(node);
      if (statement.kind === Syntax.ForOfStatement && (<qt.ForOfStatement>statement).awaitModifier) return visitForOfStatement(<qt.ForOfStatement>statement, node);
      return restoreEnclosingLabel(qf.visit.node(statement, visitor, qf.is.statement, qc.liftToBlock), node);
    }
    return qf.visit.children(node, visitor, context);
  }
  function chunkObjectLiteralElems(elems: readonly qt.ObjectLiteralElemLike[]): qt.Expression[] {
    let chunkObject: qt.ObjectLiteralElemLike[] | undefined;
    const objects: qt.Expression[] = [];
    for (const e of elems) {
      if (e.kind === Syntax.SpreadAssignment) {
        if (chunkObject) {
          objects.push(new qc.ObjectLiteralExpression(chunkObject));
          chunkObject = undefined;
        }
        const target = e.expression;
        objects.push(qf.visit.node(target, visitor, isExpression));
      } else {
        chunkObject = append(
          chunkObject,
          e.kind === Syntax.PropertyAssignment ? new qc.PropertyAssignment(e.name, qf.visit.node(e.initer, visitor, isExpression)) : qf.visit.node(e, visitor, isObjectLiteralElemLike)
        );
      }
    }
    if (chunkObject) {
      objects.push(new qc.ObjectLiteralExpression(chunkObject));
    }
    return objects;
  }
  function visitObjectLiteralExpression(node: qt.ObjectLiteralExpression): qt.Expression {
    if (node.trafoFlags & TrafoFlags.ContainsObjectRestOrSpread) {
      const objects = chunkObjectLiteralElems(node.properties);
      if (objects.length && objects[0].kind !== Syntax.ObjectLiteralExpression) {
        objects.unshift(new qc.ObjectLiteralExpression());
      }
      let expression: qt.Expression = objects[0];
      if (objects.length > 1) {
        for (let i = 1; i < objects.length; i++) {
          expression = createAssignHelper(context, [expression, objects[i]]);
        }
        return expression;
      }
      return createAssignHelper(context, objects);
    }
    return qf.visit.children(node, visitor, context);
  }
  function visitExpressionStatement(node: qt.ExpressionStatement): qt.ExpressionStatement {
    return qf.visit.children(node, visitorNoDestructuringValue, context);
  }
  function visitParenthesizedExpression(node: qt.ParenthesizedExpression, noDestructuringValue: boolean): qt.ParenthesizedExpression {
    return qf.visit.children(node, noDestructuringValue ? visitorNoDestructuringValue : visitor, context);
  }
  function visitSourceFile(node: qt.SourceFile): qt.SourceFile {
    const ancestorFacts = enterSubtree(HierarchyFacts.SourceFileExcludes, node.isEffectiveStrictMode(compilerOpts) ? HierarchyFacts.StrictModeSourceFileIncludes : HierarchyFacts.SourceFileIncludes);
    exportedVariableStatement = false;
    const visited = qf.visit.children(node, visitor, context);
    const statement = qu.concatenate(visited.statements, taggedTemplateStringDeclarations && [new qc.VariableStatement(undefined, new qc.VariableDeclarationList(taggedTemplateStringDeclarations))]);
    const result = qp_updateSourceNode(visited, setRange(new Nodes(statement), node.statements));
    exitSubtree(ancestorFacts);
    return result;
  }
  function visitTaggedTemplateExpression(node: qt.TaggedTemplateExpression) {
    return processTaggedTemplateExpression(context, node, visitor, currentSourceFile, recordTaggedTemplateString, ProcessLevel.LiftRestriction);
  }
  function visitBinaryExpression(node: qt.BinaryExpression, noDestructuringValue: boolean): qt.Expression {
    if (qf.is.destructuringAssignment(node) && node.left.trafoFlags & TrafoFlags.ContainsObjectRestOrSpread)
      return flattenDestructuringAssignment(node, visitor, context, FlattenLevel.ObjectRest, !noDestructuringValue);
    if (node.operatorToken.kind === Syntax.CommaToken)
      return node.update(qf.visit.node(node.left, visitorNoDestructuringValue, isExpression), qf.visit.node(node.right, noDestructuringValue ? visitorNoDestructuringValue : visitor, isExpression));
    return qf.visit.children(node, visitor, context);
  }
  function visitCatchClause(node: qt.CatchClause) {
    if (node.variableDeclaration && node.variableDeclaration.name.kind === Syntax.BindingPattern && node.variableDeclaration.name.trafoFlags & TrafoFlags.ContainsObjectRestOrSpread) {
      const name = qf.get.generatedNameForNode(node.variableDeclaration.name);
      const updatedDecl = updateVariableDeclaration(node.variableDeclaration, node.variableDeclaration.name, undefined, name);
      const visitedBindings = flattenDestructuringBinding(updatedDecl, visitor, context, FlattenLevel.ObjectRest);
      let block = qf.visit.node(node.block, visitor, isBlock);
      if (qu.some(visitedBindings)) {
        block = block.update([new qc.VariableStatement(undefined, visitedBindings), ...block.statements]);
      }
      return node.update(updateVariableDeclaration(node.variableDeclaration, name, undefined, undefined), block);
    }
    return qf.visit.children(node, visitor, context);
  }
  function visitVariableStatement(node: qt.VariableStatement): VisitResult<qt.VariableStatement> {
    if (qf.has.syntacticModifier(node, ModifierFlags.Export)) {
      const savedExportedVariableStatement = exportedVariableStatement;
      exportedVariableStatement = true;
      const visited = qf.visit.children(node, visitor, context);
      exportedVariableStatement = savedExportedVariableStatement;
      return visited;
    }
    return qf.visit.children(node, visitor, context);
  }
  function visitVariableDeclaration(node: qt.VariableDeclaration): VisitResult<qt.VariableDeclaration> {
    if (exportedVariableStatement) {
      const savedExportedVariableStatement = exportedVariableStatement;
      exportedVariableStatement = false;
      const visited = visitVariableDeclarationWorker(node, true);
      exportedVariableStatement = savedExportedVariableStatement;
      return visited;
    }
    return visitVariableDeclarationWorker(node, false);
  }
  function visitVariableDeclarationWorker(node: qt.VariableDeclaration, exportedVariableStatement: boolean): VisitResult<qt.VariableDeclaration> {
    if (node.name.kind === Syntax.BindingPattern && node.name.trafoFlags & TrafoFlags.ContainsObjectRestOrSpread)
      return flattenDestructuringBinding(node, visitor, context, FlattenLevel.ObjectRest, undefined, exportedVariableStatement);
    return qf.visit.children(node, visitor, context);
  }
  function visitForStatement(node: qt.ForStatement): VisitResult<qt.Statement> {
    return updateFor(
      node,
      qf.visit.node(node.initer, visitorNoDestructuringValue, isForIniter),
      qf.visit.node(node.condition, visitor, isExpression),
      qf.visit.node(node.incrementor, visitor, isExpression),
      qf.visit.node(node.statement, visitor, qf.is.statement)
    );
  }
  function visitVoidExpression(node: qt.VoidExpression) {
    return qf.visit.children(node, visitorNoDestructuringValue, context);
  }
  function visitForOfStatement(node: qt.ForOfStatement, outermostLabeledStatement: qt.LabeledStatement | undefined): VisitResult<qt.Statement> {
    const ancestorFacts = enterSubtree(HierarchyFacts.IterationStmtExcludes, HierarchyFacts.IterationStmtIncludes);
    if (node.initer.trafoFlags & TrafoFlags.ContainsObjectRestOrSpread) {
      node = transformForOfStatementWithObjectRest(node);
    }
    const result = node.awaitModifier
      ? transformForAwaitOfStatement(node, outermostLabeledStatement, ancestorFacts)
      : restoreEnclosingLabel(qf.visit.children(node, visitor, context), outermostLabeledStatement);
    exitSubtree(ancestorFacts);
    return result;
  }
  function transformForOfStatementWithObjectRest(node: qt.ForOfStatement) {
    const initerWithoutParens = qf.skip.parentheses(node.initer) as qt.ForIniter;
    if (initerWithoutParens.kind === Syntax.VariableDeclarationList || initerWithoutParens.kind === Syntax.AssignmentPattern) {
      let bodyLocation: TextRange | undefined;
      let statementsLocation: TextRange | undefined;
      const temp = qf.make.tempVariable(undefined);
      const statements: qt.Statement[] = [createForOfBindingStatement(initerWithoutParens, temp)];
      if (node.statement.kind === Syntax.Block) {
        qu.addRange(statements, node.statement.statements);
        bodyLocation = node.statement;
        statementsLocation = node.statement.statements;
      } else if (node.statement) {
        append(statements, node.statement);
        bodyLocation = node.statement;
        statementsLocation = node.statement;
      }
      return updateForOf(
        node,
        node.awaitModifier,
        setRange(new qc.VariableDeclarationList([setRange(new qc.VariableDeclaration(temp), node.initer)], NodeFlags.Let), node.initer),
        node.expression,
        setRange(new qc.Block(setRange(new Nodes(statements), statementsLocation), true), bodyLocation)
      );
    }
    return node;
  }
  function convertForOfStatementHead(node: qt.ForOfStatement, boundValue: qt.Expression) {
    const binding = createForOfBindingStatement(node.initer, boundValue);
    let bodyLocation: TextRange | undefined;
    let statementsLocation: TextRange | undefined;
    const statements: qt.Statement[] = [qf.visit.node(binding, visitor, qf.is.statement)];
    const statement = qf.visit.node(node.statement, visitor, qf.is.statement);
    if (statement.kind === Syntax.Block) {
      qu.addRange(statements, statement.statements);
      bodyLocation = statement;
      statementsLocation = statement.statements;
    } else {
      statements.push(statement);
    }
    return qf.emit.setFlags(setRange(new qc.Block(setRange(new Nodes(statements), statementsLocation), true), bodyLocation), EmitFlags.NoSourceMap | EmitFlags.NoTokenSourceMaps);
  }
  function createDownlevelAwait(expression: qt.Expression) {
    return enclosingFunctionFlags & FunctionFlags.Generator ? new qc.YieldExpression(undefined, createAwaitHelper(context, expression)) : new qc.AwaitExpression(expression);
  }
  function transformForAwaitOfStatement(node: qt.ForOfStatement, outermostLabeledStatement: qt.LabeledStatement | undefined, ancestorFacts: HierarchyFacts) {
    const expression = qf.visit.node(node.expression, visitor, isExpression);
    const iterator = expression.kind === Syntax.Identifier ? qf.get.generatedNameForNode(expression) : qf.make.tempVariable(undefined);
    const result = expression.kind === Syntax.Identifier ? qf.get.generatedNameForNode(iterator) : qf.make.tempVariable(undefined);
    const errorRecord = qf.make.uniqueName('e');
    const catchVariable = qf.get.generatedNameForNode(errorRecord);
    const returnMethod = qf.make.tempVariable(undefined);
    const callValues = createAsyncValuesHelper(context, expression, node.expression);
    const callNext = new qc.CallExpression(new qc.PropertyAccessExpression(iterator, 'next'), undefined, []);
    const getDone = new qc.PropertyAccessExpression(result, 'done');
    const getValue = new qc.PropertyAccessExpression(result, 'value');
    const callReturn = qf.make.functionCall(returnMethod, iterator, []);
    hoistVariableDeclaration(errorRecord);
    hoistVariableDeclaration(returnMethod);
    const initer = ancestorFacts & HierarchyFacts.IterationContainer ? inlineExpressions([qf.make.assignment(errorRecord, qc.VoidExpression.zero()), callValues]) : callValues;
    const forStatement = qf.emit.setFlags(
      setRange(
        new qc.ForStatement(
          qf.emit.setFlags(
            setRange(new qc.VariableDeclarationList([setRange(new qc.VariableDeclaration(iterator, undefined, initer), node.expression), new qc.VariableDeclaration(result)]), node.expression),
            EmitFlags.NoHoisting
          ),
          qf.make.comma(qf.make.assignment(result, createDownlevelAwait(callNext)), qf.make.logicalNot(getDone)),
          undefined,
          convertForOfStatementHead(node, getValue)
        ),
        node
      ),
      EmitFlags.NoTokenTrailingSourceMaps
    );
    return new qc.TryStatement(
      new qc.Block([restoreEnclosingLabel(forStatement, outermostLabeledStatement)]),
      new qc.CatchClause(
        new qc.VariableDeclaration(catchVariable),
        qf.emit.setFlags(
          new qc.Block([new qc.ExpressionStatement(qf.make.assignment(errorRecord, new qc.ObjectLiteralExpression([new qc.PropertyAssignment('error', catchVariable)])))]),
          EmitFlags.SingleLine
        )
      ),
      new qc.Block([
        new qc.TryStatement(
          new qc.Block([
            qf.emit.setFlags(
              new qc.IfStatement(
                qf.make.logicalAnd(qf.make.logicalAnd(result, qf.make.logicalNot(getDone)), qf.make.assignment(returnMethod, new qc.PropertyAccessExpression(iterator, 'return'))),
                new qc.ExpressionStatement(createDownlevelAwait(callReturn))
              ),
              EmitFlags.SingleLine
            ),
          ]),
          undefined,
          qf.emit.setFlags(
            new qc.Block([qf.emit.setFlags(new qc.IfStatement(errorRecord, new qc.ThrowStatement(new qc.PropertyAccessExpression(errorRecord, 'error'))), EmitFlags.SingleLine)]),
            EmitFlags.SingleLine
          )
        ),
      ])
    );
  }
  function visitParam(node: qt.ParamDeclaration): qt.ParamDeclaration {
    if (node.trafoFlags & TrafoFlags.ContainsObjectRestOrSpread)
      return node.update(undefined, undefined, node.dot3Token, qf.get.generatedNameForNode(node), undefined, undefined, qf.visit.node(node.initer, visitor, isExpression));
    return qf.visit.children(node, visitor, context);
  }
  function visitConstructorDeclaration(node: qt.ConstructorDeclaration) {
    const savedEnclosingFunctionFlags = enclosingFunctionFlags;
    enclosingFunctionFlags = FunctionFlags.Normal;
    const updated = node.update(undefined, node.modifiers, qf.visit.params(node.params, visitor, context), transformFunctionBody(node));
    enclosingFunctionFlags = savedEnclosingFunctionFlags;
    return updated;
  }
  function visitGetAccessorDeclaration(node: qt.GetAccessorDeclaration) {
    const savedEnclosingFunctionFlags = enclosingFunctionFlags;
    enclosingFunctionFlags = FunctionFlags.Normal;
    const updated = node.update(
      undefined,
      node.modifiers,
      qf.visit.node(node.name, visitor, qf.is.propertyName),
      qf.visit.params(node.params, visitor, context),
      undefined,
      transformFunctionBody(node)
    );
    enclosingFunctionFlags = savedEnclosingFunctionFlags;
    return updated;
  }
  function visitSetAccessorDeclaration(node: qt.SetAccessorDeclaration) {
    const savedEnclosingFunctionFlags = enclosingFunctionFlags;
    enclosingFunctionFlags = FunctionFlags.Normal;
    const updated = node.update(undefined, node.modifiers, qf.visit.node(node.name, visitor, qf.is.propertyName), qf.visit.params(node.params, visitor, context), transformFunctionBody(node));
    enclosingFunctionFlags = savedEnclosingFunctionFlags;
    return updated;
  }
  function visitMethodDeclaration(node: qt.MethodDeclaration) {
    const savedEnclosingFunctionFlags = enclosingFunctionFlags;
    enclosingFunctionFlags = qf.get.functionFlags(node);
    const updated = node.update(
      undefined,
      enclosingFunctionFlags & FunctionFlags.Generator ? Nodes.visit(node.modifiers, visitorNoAsyncModifier, isModifier) : node.modifiers,
      enclosingFunctionFlags & FunctionFlags.Async ? undefined : node.asteriskToken,
      qf.visit.node(node.name, visitor, qf.is.propertyName),
      visitNode<qt.Token<Syntax.QuestionToken>>(undefined, visitor, isToken),
      undefined,
      qf.visit.params(node.params, visitor, context),
      undefined,
      enclosingFunctionFlags & FunctionFlags.Async && enclosingFunctionFlags & FunctionFlags.Generator ? transformAsyncGeneratorFunctionBody(node) : transformFunctionBody(node)
    );
    enclosingFunctionFlags = savedEnclosingFunctionFlags;
    return updated;
  }
  function visitFunctionDeclaration(node: qt.FunctionDeclaration) {
    const savedEnclosingFunctionFlags = enclosingFunctionFlags;
    enclosingFunctionFlags = qf.get.functionFlags(node);
    const updated = node.update(
      undefined,
      enclosingFunctionFlags & FunctionFlags.Generator ? Nodes.visit(node.modifiers, visitorNoAsyncModifier, isModifier) : node.modifiers,
      enclosingFunctionFlags & FunctionFlags.Async ? undefined : node.asteriskToken,
      node.name,
      undefined,
      qf.visit.params(node.params, visitor, context),
      undefined,
      enclosingFunctionFlags & FunctionFlags.Async && enclosingFunctionFlags & FunctionFlags.Generator ? transformAsyncGeneratorFunctionBody(node) : transformFunctionBody(node)
    );
    enclosingFunctionFlags = savedEnclosingFunctionFlags;
    return updated;
  }
  function visitArrowFunction(node: qt.ArrowFunction) {
    const savedEnclosingFunctionFlags = enclosingFunctionFlags;
    enclosingFunctionFlags = qf.get.functionFlags(node);
    const updated = node.update(node.modifiers, undefined, qf.visit.params(node.params, visitor, context), undefined, node.equalsGreaterThanToken, transformFunctionBody(node));
    enclosingFunctionFlags = savedEnclosingFunctionFlags;
    return updated;
  }
  function visitFunctionExpression(node: qt.FunctionExpression) {
    const savedEnclosingFunctionFlags = enclosingFunctionFlags;
    enclosingFunctionFlags = qf.get.functionFlags(node);
    const updated = node.update(
      enclosingFunctionFlags & FunctionFlags.Generator ? Nodes.visit(node.modifiers, visitorNoAsyncModifier, isModifier) : node.modifiers,
      enclosingFunctionFlags & FunctionFlags.Async ? undefined : node.asteriskToken,
      node.name,
      undefined,
      qf.visit.params(node.params, visitor, context),
      undefined,
      enclosingFunctionFlags & FunctionFlags.Async && enclosingFunctionFlags & FunctionFlags.Generator ? transformAsyncGeneratorFunctionBody(node) : transformFunctionBody(node)
    );
    enclosingFunctionFlags = savedEnclosingFunctionFlags;
    return updated;
  }
  function transformAsyncGeneratorFunctionBody(node: qt.MethodDeclaration | qt.AccessorDeclaration | qt.FunctionDeclaration | qt.FunctionExpression): qt.FunctionBody {
    resumeLexicalEnv();
    const statements: qt.Statement[] = [];
    const statementOffset = addPrologue(statements, node.body!.statements, false, visitor);
    appendObjectRestAssignmentsIfNeeded(statements, node);
    const savedCapturedSuperProperties = capturedSuperProperties;
    const savedHasSuperElemAccess = hasSuperElemAccess;
    capturedSuperProperties = qu.createEscapedMap<true>();
    hasSuperElemAccess = false;
    const returnStatement = new qc.ReturnStatement(
      createAsyncGeneratorHelper(
        context,
        new qc.FunctionExpression(
          undefined,
          new qc.Token(Syntax.AsteriskToken),
          node.name && qf.get.generatedNameForNode(node.name),
          undefined,
          [],
          undefined,
          node.body!.update(qf.visit.lexicalEnv(node.body!.statements, visitor, context, statementOffset))
        ),
        !!(hierarchyFacts & HierarchyFacts.HasLexicalThis)
      )
    );
    const emitSuperHelpers = languageVersion >= qt.ScriptTarget.ES2015 && resolver.getNodeCheckFlags(node) & (NodeCheckFlags.AsyncMethodWithSuperBinding | NodeCheckFlags.AsyncMethodWithSuper);
    if (emitSuperHelpers) {
      enableSubstitutionForAsyncMethodsWithSuper();
      const variableStatement = createSuperAccessVariableStatement(resolver, node, capturedSuperProperties);
      substitutedSuperAccessors[qf.get.nodeId(variableStatement)] = true;
      insertStatementsAfterStandardPrologue(statements, [variableStatement]);
    }
    statements.push(returnStatement);
    insertStatementsAfterStandardPrologue(statements, endLexicalEnv());
    const block = node.body!.update(statements);
    if (emitSuperHelpers && hasSuperElemAccess) {
      if (resolver.getNodeCheckFlags(node) & NodeCheckFlags.AsyncMethodWithSuperBinding) {
        qf.emit.addHelper(block, advancedAsyncSuperHelper);
      } else if (resolver.getNodeCheckFlags(node) & NodeCheckFlags.AsyncMethodWithSuper) {
        qf.emit.addHelper(block, asyncSuperHelper);
      }
    }
    capturedSuperProperties = savedCapturedSuperProperties;
    hasSuperElemAccess = savedHasSuperElemAccess;
    return block;
  }
  function transformFunctionBody(node: qt.FunctionDeclaration | qt.FunctionExpression | qt.ConstructorDeclaration | qt.MethodDeclaration | qt.AccessorDeclaration): qt.FunctionBody;
  function transformFunctionBody(node: qt.ArrowFunction): qt.ConciseBody;
  function transformFunctionBody(node: qt.FunctionLikeDeclaration): qt.ConciseBody {
    resumeLexicalEnv();
    let statementOffset = 0;
    const statements: qt.Statement[] = [];
    const body = qf.visit.node(node.body, visitor, qf.is.conciseBody);
    if (body.kind === Syntax.Block) {
      statementOffset = addPrologue(statements, body.statements, false, visitor);
    }
    qu.addRange(statements, appendObjectRestAssignmentsIfNeeded(undefined, node));
    const leadingStatements = endLexicalEnv();
    if (statementOffset > 0 || qu.some(statements) || qu.some(leadingStatements)) {
      const block = qc.convertToFunctionBody(body, true);
      insertStatementsAfterStandardPrologue(statements, leadingStatements);
      qu.addRange(statements, block.statements.slice(statementOffset));
      return block.update(new Nodes(statements).setRange(block.statements));
    }
    return body;
  }
  function appendObjectRestAssignmentsIfNeeded(statements: qt.Statement[] | undefined, node: qt.FunctionLikeDeclaration): qt.Statement[] | undefined {
    for (const param of node.params) {
      if (param.trafoFlags & TrafoFlags.ContainsObjectRestOrSpread) {
        const temp = qf.get.generatedNameForNode(param);
        const declarations = flattenDestructuringBinding(param, visitor, context, FlattenLevel.ObjectRest, temp, true);
        if (qu.some(declarations)) {
          const statement = new qc.VariableStatement(undefined, new qc.VariableDeclarationList(declarations));
          qf.emit.setFlags(statement, EmitFlags.CustomPrologue);
          statements = append(statements, statement);
        }
      }
    }
    return statements;
  }
  function enableSubstitutionForAsyncMethodsWithSuper() {
    if ((enabledSubstitutions & ESNextSubstitutionFlags.AsyncMethodsWithSuper) === 0) {
      enabledSubstitutions |= ESNextSubstitutionFlags.AsyncMethodsWithSuper;
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
  function onEmitNode(hint: qt.EmitHint, node: Node, emitCallback: (hint: qt.EmitHint, node: Node) => void) {
    if (enabledSubstitutions & ESNextSubstitutionFlags.AsyncMethodsWithSuper && isSuperContainer(node)) {
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
      enclosingSuperContainerFlags = 0 as NodeCheckFlags;
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
    if (node.expression.kind === Syntax.SuperKeyword) return setRange(new qc.PropertyAccessExpression(qf.make.fileLevelUniqueName('_super'), node.name), node);
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
  function isSuperContainer(node: Node) {
    const kind = node.kind;
    return kind === Syntax.ClassDeclaration || kind === Syntax.Constructor || kind === Syntax.MethodDeclaration || kind === Syntax.GetAccessor || kind === Syntax.SetAccessor;
  }
  function createSuperElemAccessInAsyncMethod(argExpression: qt.Expression, location: TextRange): qt.LeftExpression {
    if (enclosingSuperContainerFlags & NodeCheckFlags.AsyncMethodWithSuperBinding)
      return setRange(new qc.PropertyAccessExpression(new qc.CallExpression(new qc.Identifier('_superIndex'), undefined, [argExpression]), 'value'), location);
    return setRange(new qc.CallExpression(new qc.Identifier('_superIndex'), undefined, [argExpression]), location);
  }
}
export const assignHelper: qt.UnscopedEmitHelper = {
  name: 'typescript:assign',
  importName: '__assign',
  scoped: false,
  priority: 1,
  text: `
            var __assign = (this && this.__assign) || function () {
                __assign = Object.assign || function(t) {
                    for (var s, i = 1, n = args.length; i < n; i++) {
                        s = args[i];
                        for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                            t[p] = s[p];
                    }
                    return t;
                };
                return __assign.apply(this, args);
            };`,
};
export function createAssignHelper(context: qt.TrafoContext, attributesSegments: qt.Expression[]) {
  if (context.getCompilerOpts().target! >= qt.ScriptTarget.ES2015) return new qc.CallExpression(new qc.PropertyAccessExpression(new qc.Identifier('Object'), 'assign'), undefined, attributesSegments);
  context.requestEmitHelper(assignHelper);
  return new qc.CallExpression(getUnscopedHelperName('__assign'), undefined, attributesSegments);
}
export const awaitHelper: qt.UnscopedEmitHelper = {
  name: 'typescript:await',
  importName: '__await',
  scoped: false,
  text: `
            var __await = (this && this.__await) || function (v) { return this instanceof __await ? (this.v = v, this) : new __await(v); }`,
};
function createAwaitHelper(context: qt.TrafoContext, expression: qt.Expression) {
  context.requestEmitHelper(awaitHelper);
  return new qc.CallExpression(getUnscopedHelperName('__await'), undefined, [expression]);
}
export const asyncGeneratorHelper: qt.UnscopedEmitHelper = {
  name: 'typescript:asyncGenerator',
  importName: '__asyncGenerator',
  scoped: false,
  dependencies: [awaitHelper],
  text: `
            var __asyncGenerator = (this && this.__asyncGenerator) || function (thisArg, _args, generator) {
                if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
                var g = generator.apply(thisArg, _args || []), i, q = [];
                return i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i;
                function verb(n) { if (g[n]) i[n] = function (v) { return new Promise(function (a, b) { q.push([n, v, a, b]) > 1 || resume(n, v); }); }; }
                function resume(n, v) { try { step(g[n](v)); } catch (e) { settle(q[0][3], e); } }
                function step(r) { r.value instanceof __await ? Promise.resolve(r.value.v).then(fulfill, reject) : settle(q[0][2], r); }
                function fulfill(value) { resume("next", value); }
                function reject(value) { resume("throw", value); }
                function settle(f, v) { if (f(v), q.shift(), q.length) resume(q[0][0], q[0][1]); }
            };`,
};
function createAsyncGeneratorHelper(context: qt.TrafoContext, generatorFunc: qt.FunctionExpression, hasLexicalThis: boolean) {
  context.requestEmitHelper(asyncGeneratorHelper);
  (generatorFunc.emitNode || (generatorFunc.emitNode = {} as qt.EmitNode)).flags |= EmitFlags.AsyncFunctionBody | EmitFlags.ReuseTempVariableScope;
  return new qc.CallExpression(getUnscopedHelperName('__asyncGenerator'), undefined, [hasLexicalThis ? new qc.ThisExpression() : qc.VoidExpression.zero(), new qc.Identifier('args'), generatorFunc]);
}
export const asyncDelegator: qt.UnscopedEmitHelper = {
  name: 'typescript:asyncDelegator',
  importName: '__asyncDelegator',
  scoped: false,
  dependencies: [awaitHelper],
  text: `
            var __asyncDelegator = (this && this.__asyncDelegator) || function (o) {
                var i, p;
                return i = {}, verb("next"), verb("throw", function (e) { throw e; }), verb("return"), i[Symbol.iterator] = function () { return this; }, i;
                function verb(n, f) { i[n] = o[n] ? function (v) { return (p = !p) ? { value: __await(o[n](v)), done: n === "return" } : f ? f(v) : v; } : f; }
            };`,
};
function createAsyncDelegatorHelper(context: qt.TrafoContext, expression: qt.Expression, location?: TextRange) {
  context.requestEmitHelper(asyncDelegator);
  return setRange(new qc.CallExpression(getUnscopedHelperName('__asyncDelegator'), undefined, [expression]), location);
}
export const asyncValues: qt.UnscopedEmitHelper = {
  name: 'typescript:asyncValues',
  importName: '__asyncValues',
  scoped: false,
  text: `
            var __asyncValues = (this && this.__asyncValues) || function (o) {
                if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
                var m = o[Symbol.asyncIterator], i;
                return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
                function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
                function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
            };`,
};
function createAsyncValuesHelper(context: qt.TrafoContext, expression: qt.Expression, location?: TextRange) {
  context.requestEmitHelper(asyncValues);
  return setRange(new qc.CallExpression(getUnscopedHelperName('__asyncValues'), undefined, [expression]), location);
}
