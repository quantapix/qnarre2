import * as qb from '../base';
import { Node, Nodes } from '../core3';
import * as qc from '../core3';
import * as qt from '../types';
import * as qy from '../syntax';
import { Modifier, ModifierFlags, Syntax } from '../syntax';
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
  IterationStatementIncludes = IterationContainer,
  IterationStatementExcludes = None,
}
export function transformES2018(context: TransformationContext) {
  const { resumeLexicalEnvironment, endLexicalEnvironment, hoistVariableDeclaration } = context;
  const resolver = context.getEmitResolver();
  const compilerOptions = context.getCompilerOptions();
  const languageVersion = getEmitScriptTarget(compilerOptions);
  const previousOnEmitNode = context.onEmitNode;
  context.onEmitNode = onEmitNode;
  const previousOnSubstituteNode = context.onSubstituteNode;
  context.onSubstituteNode = onSubstituteNode;
  let exportedVariableStatement = false;
  let enabledSubstitutions: ESNextSubstitutionFlags;
  let enclosingFunctionFlags: FunctionFlags;
  let enclosingSuperContainerFlags: NodeCheckFlags = 0;
  let hierarchyFacts: HierarchyFacts = 0;
  let currentSourceFile: SourceFile;
  let taggedTemplateStringDeclarations: VariableDeclaration[];
  let capturedSuperProperties: EscapedMap<true>;
  let hasSuperElementAccess: boolean;
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
  function recordTaggedTemplateString(temp: Identifier) {
    taggedTemplateStringDeclarations = append(taggedTemplateStringDeclarations, new qc.VariableDeclaration(temp));
  }
  function transformSourceFile(node: SourceFile) {
    if (node.isDeclarationFile) return node;
    currentSourceFile = node;
    const visited = visitSourceFile(node);
    addEmitHelpers(visited, context.readEmitHelpers());
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
    return visitEachChild(node, visitor, context);
  }
  function visitorWorker(node: Node, noDestructuringValue: boolean): VisitResult<Node> {
    if ((node.transformFlags & TransformFlags.ContainsES2018) === 0) return node;
    switch (node.kind) {
      case Syntax.AwaitExpression:
        return visitAwaitExpression(node as AwaitExpression);
      case Syntax.YieldExpression:
        return visitYieldExpression(node as YieldExpression);
      case Syntax.ReturnStatement:
        return visitReturnStatement(node as ReturnStatement);
      case Syntax.LabeledStatement:
        return visitLabeledStatement(node as LabeledStatement);
      case Syntax.ObjectLiteralExpression:
        return visitObjectLiteralExpression(node as ObjectLiteralExpression);
      case Syntax.BinaryExpression:
        return visitBinaryExpression(node as BinaryExpression, noDestructuringValue);
      case Syntax.CatchClause:
        return visitCatchClause(node as CatchClause);
      case Syntax.VariableStatement:
        return visitVariableStatement(node as VariableStatement);
      case Syntax.VariableDeclaration:
        return visitVariableDeclaration(node as VariableDeclaration);
      case Syntax.DoStatement:
      case Syntax.WhileStatement:
      case Syntax.ForInStatement:
        return doWithHierarchyFacts(visitDefault, node, HierarchyFacts.IterationStatementExcludes, HierarchyFacts.IterationStatementIncludes);
      case Syntax.ForOfStatement:
        return visitForOfStatement(node as ForOfStatement, undefined);
      case Syntax.ForStatement:
        return doWithHierarchyFacts(visitForStatement, node as ForStatement, HierarchyFacts.IterationStatementExcludes, HierarchyFacts.IterationStatementIncludes);
      case Syntax.VoidExpression:
        return visitVoidExpression(node as VoidExpression);
      case Syntax.Constructor:
        return doWithHierarchyFacts(visitConstructorDeclaration, node as ConstructorDeclaration, HierarchyFacts.ClassOrFunctionExcludes, HierarchyFacts.ClassOrFunctionIncludes);
      case Syntax.MethodDeclaration:
        return doWithHierarchyFacts(visitMethodDeclaration, node as MethodDeclaration, HierarchyFacts.ClassOrFunctionExcludes, HierarchyFacts.ClassOrFunctionIncludes);
      case Syntax.GetAccessor:
        return doWithHierarchyFacts(visitGetAccessorDeclaration, node as GetAccessorDeclaration, HierarchyFacts.ClassOrFunctionExcludes, HierarchyFacts.ClassOrFunctionIncludes);
      case Syntax.SetAccessor:
        return doWithHierarchyFacts(visitSetAccessorDeclaration, node as SetAccessorDeclaration, HierarchyFacts.ClassOrFunctionExcludes, HierarchyFacts.ClassOrFunctionIncludes);
      case Syntax.FunctionDeclaration:
        return doWithHierarchyFacts(visitFunctionDeclaration, node as FunctionDeclaration, HierarchyFacts.ClassOrFunctionExcludes, HierarchyFacts.ClassOrFunctionIncludes);
      case Syntax.FunctionExpression:
        return doWithHierarchyFacts(visitFunctionExpression, node as FunctionExpression, HierarchyFacts.ClassOrFunctionExcludes, HierarchyFacts.ClassOrFunctionIncludes);
      case Syntax.ArrowFunction:
        return doWithHierarchyFacts(visitArrowFunction, node as ArrowFunction, HierarchyFacts.ArrowFunctionExcludes, HierarchyFacts.ArrowFunctionIncludes);
      case Syntax.Parameter:
        return visitParameter(node as ParameterDeclaration);
      case Syntax.ExpressionStatement:
        return visitExpressionStatement(node as ExpressionStatement);
      case Syntax.ParenthesizedExpression:
        return visitParenthesizedExpression(node as ParenthesizedExpression, noDestructuringValue);
      case Syntax.TaggedTemplateExpression:
        return visitTaggedTemplateExpression(node as TaggedTemplateExpression);
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
      case Syntax.ClassDeclaration:
      case Syntax.ClassExpression:
        return doWithHierarchyFacts(visitDefault, node, HierarchyFacts.ClassOrFunctionExcludes, HierarchyFacts.ClassOrFunctionIncludes);
      default:
        return visitEachChild(node, visitor, context);
    }
  }
  function visitAwaitExpression(node: AwaitExpression): Expression {
    if (enclosingFunctionFlags & FunctionFlags.Async && enclosingFunctionFlags & FunctionFlags.Generator)
      return setRange(new qc.YieldExpression(createAwaitHelper(context, visitNode(node.expression, visitor, isExpression))), node).setOriginal(node);
    return visitEachChild(node, visitor, context);
  }
  function visitYieldExpression(node: YieldExpression) {
    if (enclosingFunctionFlags & FunctionFlags.Async && enclosingFunctionFlags & FunctionFlags.Generator) {
      if (node.asteriskToken) {
        const expression = visitNode(node.expression, visitor, isExpression);
        return setOriginalNode(
          setRange(
            new qc.YieldExpression(
              createAwaitHelper(context, node.update(node.asteriskToken, createAsyncDelegatorHelper(context, createAsyncValuesHelper(context, expression, expression), expression)))
            ),
            node
          ),
          node
        );
      }
      return setRange(new qc.YieldExpression(createDownlevelAwait(node.expression ? visitNode(node.expression, visitor, isExpression) : qs.VoidExpression.zero())), node).setOriginal(node);
    }
    return visitEachChild(node, visitor, context);
  }
  function visitReturnStatement(node: ReturnStatement) {
    if (enclosingFunctionFlags & FunctionFlags.Async && enclosingFunctionFlags & FunctionFlags.Generator)
      return node.update(createDownlevelAwait(node.expression ? visitNode(node.expression, visitor, isExpression) : qs.VoidExpression.zero()));
    return visitEachChild(node, visitor, context);
  }
  function visitLabeledStatement(node: LabeledStatement) {
    if (enclosingFunctionFlags & FunctionFlags.Async) {
      const statement = unwrapInnermostStatementOfLabel(node);
      if (statement.kind === Syntax.ForOfStatement && (<ForOfStatement>statement).awaitModifier) return visitForOfStatement(<ForOfStatement>statement, node);
      return restoreEnclosingLabel(visitNode(statement, visitor, isStatement, liftToBlock), node);
    }
    return visitEachChild(node, visitor, context);
  }
  function chunkObjectLiteralElements(elements: readonly ObjectLiteralElementLike[]): Expression[] {
    let chunkObject: ObjectLiteralElementLike[] | undefined;
    const objects: Expression[] = [];
    for (const e of elements) {
      if (e.kind === Syntax.SpreadAssignment) {
        if (chunkObject) {
          objects.push(new qc.ObjectLiteralExpression(chunkObject));
          chunkObject = undefined;
        }
        const target = e.expression;
        objects.push(visitNode(target, visitor, isExpression));
      } else {
        chunkObject = append(
          chunkObject,
          e.kind === Syntax.PropertyAssignment ? new qc.PropertyAssignment(e.name, visitNode(e.initer, visitor, isExpression)) : visitNode(e, visitor, isObjectLiteralElementLike)
        );
      }
    }
    if (chunkObject) {
      objects.push(new qc.ObjectLiteralExpression(chunkObject));
    }
    return objects;
  }
  function visitObjectLiteralExpression(node: ObjectLiteralExpression): Expression {
    if (node.transformFlags & TransformFlags.ContainsObjectRestOrSpread) {
      const objects = chunkObjectLiteralElements(node.properties);
      if (objects.length && objects[0].kind !== Syntax.ObjectLiteralExpression) {
        objects.unshift(new qc.ObjectLiteralExpression());
      }
      let expression: Expression = objects[0];
      if (objects.length > 1) {
        for (let i = 1; i < objects.length; i++) {
          expression = createAssignHelper(context, [expression, objects[i]]);
        }
        return expression;
      }
      return createAssignHelper(context, objects);
    }
    return visitEachChild(node, visitor, context);
  }
  function visitExpressionStatement(node: ExpressionStatement): ExpressionStatement {
    return visitEachChild(node, visitorNoDestructuringValue, context);
  }
  function visitParenthesizedExpression(node: ParenthesizedExpression, noDestructuringValue: boolean): ParenthesizedExpression {
    return visitEachChild(node, noDestructuringValue ? visitorNoDestructuringValue : visitor, context);
  }
  function visitSourceFile(node: SourceFile): SourceFile {
    const ancestorFacts = enterSubtree(
      HierarchyFacts.SourceFileExcludes,
      isEffectiveStrictModeSourceFile(node, compilerOptions) ? HierarchyFacts.StrictModeSourceFileIncludes : HierarchyFacts.SourceFileIncludes
    );
    exportedVariableStatement = false;
    const visited = visitEachChild(node, visitor, context);
    const statement = concatenate(visited.statements, taggedTemplateStringDeclarations && [new qc.VariableStatement(undefined, new qc.VariableDeclarationList(taggedTemplateStringDeclarations))]);
    const result = qp_updateSourceNode(visited, setRange(new Nodes(statement), node.statements));
    exitSubtree(ancestorFacts);
    return result;
  }
  function visitTaggedTemplateExpression(node: TaggedTemplateExpression) {
    return processTaggedTemplateExpression(context, node, visitor, currentSourceFile, recordTaggedTemplateString, ProcessLevel.LiftRestriction);
  }
  function visitBinaryExpression(node: BinaryExpression, noDestructuringValue: boolean): Expression {
    if (qc.is.destructuringAssignment(node) && node.left.transformFlags & TransformFlags.ContainsObjectRestOrSpread)
      return flattenDestructuringAssignment(node, visitor, context, FlattenLevel.ObjectRest, !noDestructuringValue);
    if (node.operatorToken.kind === Syntax.CommaToken)
      return node.update(visitNode(node.left, visitorNoDestructuringValue, isExpression), visitNode(node.right, noDestructuringValue ? visitorNoDestructuringValue : visitor, isExpression));
    return visitEachChild(node, visitor, context);
  }
  function visitCatchClause(node: CatchClause) {
    if (node.variableDeclaration && qc.is.kind(qc.BindingPattern, node.variableDeclaration.name) && node.variableDeclaration.name.transformFlags & TransformFlags.ContainsObjectRestOrSpread) {
      const name = getGeneratedNameForNode(node.variableDeclaration.name);
      const updatedDecl = updateVariableDeclaration(node.variableDeclaration, node.variableDeclaration.name, undefined, name);
      const visitedBindings = flattenDestructuringBinding(updatedDecl, visitor, context, FlattenLevel.ObjectRest);
      let block = visitNode(node.block, visitor, isBlock);
      if (some(visitedBindings)) {
        block = block.update([new qc.VariableStatement(undefined, visitedBindings), ...block.statements]);
      }
      return node.update(updateVariableDeclaration(node.variableDeclaration, name, undefined, undefined), block);
    }
    return visitEachChild(node, visitor, context);
  }
  function visitVariableStatement(node: VariableStatement): VisitResult<VariableStatement> {
    if (qc.has.syntacticModifier(node, ModifierFlags.Export)) {
      const savedExportedVariableStatement = exportedVariableStatement;
      exportedVariableStatement = true;
      const visited = visitEachChild(node, visitor, context);
      exportedVariableStatement = savedExportedVariableStatement;
      return visited;
    }
    return visitEachChild(node, visitor, context);
  }
  function visitVariableDeclaration(node: VariableDeclaration): VisitResult<VariableDeclaration> {
    if (exportedVariableStatement) {
      const savedExportedVariableStatement = exportedVariableStatement;
      exportedVariableStatement = false;
      const visited = visitVariableDeclarationWorker(node, true);
      exportedVariableStatement = savedExportedVariableStatement;
      return visited;
    }
    return visitVariableDeclarationWorker(node, false);
  }
  function visitVariableDeclarationWorker(node: VariableDeclaration, exportedVariableStatement: boolean): VisitResult<VariableDeclaration> {
    if (qc.is.kind(qc.BindingPattern, node.name) && node.name.transformFlags & TransformFlags.ContainsObjectRestOrSpread)
      return flattenDestructuringBinding(node, visitor, context, FlattenLevel.ObjectRest, undefined, exportedVariableStatement);
    return visitEachChild(node, visitor, context);
  }
  function visitForStatement(node: ForStatement): VisitResult<Statement> {
    return updateFor(
      node,
      visitNode(node.initer, visitorNoDestructuringValue, isForIniter),
      visitNode(node.condition, visitor, isExpression),
      visitNode(node.incrementor, visitor, isExpression),
      visitNode(node.statement, visitor, isStatement)
    );
  }
  function visitVoidExpression(node: VoidExpression) {
    return visitEachChild(node, visitorNoDestructuringValue, context);
  }
  function visitForOfStatement(node: ForOfStatement, outermostLabeledStatement: LabeledStatement | undefined): VisitResult<Statement> {
    const ancestorFacts = enterSubtree(HierarchyFacts.IterationStatementExcludes, HierarchyFacts.IterationStatementIncludes);
    if (node.initer.transformFlags & TransformFlags.ContainsObjectRestOrSpread) {
      node = transformForOfStatementWithObjectRest(node);
    }
    const result = node.awaitModifier
      ? transformForAwaitOfStatement(node, outermostLabeledStatement, ancestorFacts)
      : restoreEnclosingLabel(visitEachChild(node, visitor, context), outermostLabeledStatement);
    exitSubtree(ancestorFacts);
    return result;
  }
  function transformForOfStatementWithObjectRest(node: ForOfStatement) {
    const initerWithoutParens = skipParentheses(node.initer) as ForIniter;
    if (qc.is.kind(qc.VariableDeclarationList, initerWithoutParens) || qc.is.kind(qc.AssignmentPattern, initerWithoutParens)) {
      let bodyLocation: TextRange | undefined;
      let statementsLocation: TextRange | undefined;
      const temp = createTempVariable(undefined);
      const statements: Statement[] = [createForOfBindingStatement(initerWithoutParens, temp)];
      if (qc.is.kind(qc.Block, node.statement)) {
        addRange(statements, node.statement.statements);
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
        setRange(new Block(setRange(new Nodes(statements), statementsLocation), true), bodyLocation)
      );
    }
    return node;
  }
  function convertForOfStatementHead(node: ForOfStatement, boundValue: Expression) {
    const binding = createForOfBindingStatement(node.initer, boundValue);
    let bodyLocation: TextRange | undefined;
    let statementsLocation: TextRange | undefined;
    const statements: Statement[] = [visitNode(binding, visitor, isStatement)];
    const statement = visitNode(node.statement, visitor, isStatement);
    if (qc.is.kind(qc.Block, statement)) {
      addRange(statements, statement.statements);
      bodyLocation = statement;
      statementsLocation = statement.statements;
    } else {
      statements.push(statement);
    }
    return setEmitFlags(setRange(new Block(setRange(new Nodes(statements), statementsLocation), true), bodyLocation), EmitFlags.NoSourceMap | EmitFlags.NoTokenSourceMaps);
  }
  function createDownlevelAwait(expression: Expression) {
    return enclosingFunctionFlags & FunctionFlags.Generator ? new qc.YieldExpression(undefined, createAwaitHelper(context, expression)) : new AwaitExpression(expression);
  }
  function transformForAwaitOfStatement(node: ForOfStatement, outermostLabeledStatement: LabeledStatement | undefined, ancestorFacts: HierarchyFacts) {
    const expression = visitNode(node.expression, visitor, isExpression);
    const iterator = qc.is.kind(qc.Identifier, expression) ? getGeneratedNameForNode(expression) : createTempVariable(undefined);
    const result = qc.is.kind(qc.Identifier, expression) ? getGeneratedNameForNode(iterator) : createTempVariable(undefined);
    const errorRecord = createUniqueName('e');
    const catchVariable = getGeneratedNameForNode(errorRecord);
    const returnMethod = createTempVariable(undefined);
    const callValues = createAsyncValuesHelper(context, expression, node.expression);
    const callNext = new qs.CallExpression(new qc.PropertyAccessExpression(iterator, 'next'), undefined, []);
    const getDone = new qc.PropertyAccessExpression(result, 'done');
    const getValue = new qc.PropertyAccessExpression(result, 'value');
    const callReturn = createFunctionCall(returnMethod, iterator, []);
    hoistVariableDeclaration(errorRecord);
    hoistVariableDeclaration(returnMethod);
    const initer = ancestorFacts & HierarchyFacts.IterationContainer ? inlineExpressions([createAssignment(errorRecord, qs.VoidExpression.zero()), callValues]) : callValues;
    const forStatement = setEmitFlags(
      setRange(
        new qc.ForStatement(
          setEmitFlags(
            setRange(new qc.VariableDeclarationList([setRange(new qc.VariableDeclaration(iterator, undefined, initer), node.expression), new qc.VariableDeclaration(result)]), node.expression),
            EmitFlags.NoHoisting
          ),
          createComma(createAssignment(result, createDownlevelAwait(callNext)), qs.PrefixUnaryExpression.logicalNot(getDone)),
          undefined,
          convertForOfStatementHead(node, getValue)
        ),
        node
      ),
      EmitFlags.NoTokenTrailingSourceMaps
    );
    return new qc.TryStatement(
      new Block([restoreEnclosingLabel(forStatement, outermostLabeledStatement)]),
      new qc.CatchClause(
        new qc.VariableDeclaration(catchVariable),
        setEmitFlags(new Block([new qc.ExpressionStatement(createAssignment(errorRecord, new qc.ObjectLiteralExpression([new qc.PropertyAssignment('error', catchVariable)])))]), EmitFlags.SingleLine)
      ),
      new Block([
        new qc.TryStatement(
          new Block([
            setEmitFlags(
              new qc.IfStatement(
                createLogicalAnd(createLogicalAnd(result, qs.PrefixUnaryExpression.logicalNot(getDone)), createAssignment(returnMethod, new qc.PropertyAccessExpression(iterator, 'return'))),
                new qc.ExpressionStatement(createDownlevelAwait(callReturn))
              ),
              EmitFlags.SingleLine
            ),
          ]),
          undefined,
          setEmitFlags(
            new Block([setEmitFlags(new qc.IfStatement(errorRecord, new qc.ThrowStatement(new qc.PropertyAccessExpression(errorRecord, 'error'))), EmitFlags.SingleLine)]),
            EmitFlags.SingleLine
          )
        ),
      ])
    );
  }
  function visitParameter(node: ParameterDeclaration): ParameterDeclaration {
    if (node.transformFlags & TransformFlags.ContainsObjectRestOrSpread)
      return node.update(undefined, undefined, node.dot3Token, getGeneratedNameForNode(node), undefined, undefined, visitNode(node.initer, visitor, isExpression));
    return visitEachChild(node, visitor, context);
  }
  function visitConstructorDeclaration(node: ConstructorDeclaration) {
    const savedEnclosingFunctionFlags = enclosingFunctionFlags;
    enclosingFunctionFlags = FunctionFlags.Normal;
    const updated = node.update(undefined, node.modifiers, visitParameterList(node.parameters, visitor, context), transformFunctionBody(node));
    enclosingFunctionFlags = savedEnclosingFunctionFlags;
    return updated;
  }
  function visitGetAccessorDeclaration(node: GetAccessorDeclaration) {
    const savedEnclosingFunctionFlags = enclosingFunctionFlags;
    enclosingFunctionFlags = FunctionFlags.Normal;
    const updated = node.update(
      undefined,
      node.modifiers,
      visitNode(node.name, visitor, isPropertyName),
      visitParameterList(node.parameters, visitor, context),
      undefined,
      transformFunctionBody(node)
    );
    enclosingFunctionFlags = savedEnclosingFunctionFlags;
    return updated;
  }
  function visitSetAccessorDeclaration(node: SetAccessorDeclaration) {
    const savedEnclosingFunctionFlags = enclosingFunctionFlags;
    enclosingFunctionFlags = FunctionFlags.Normal;
    const updated = node.update(undefined, node.modifiers, visitNode(node.name, visitor, isPropertyName), visitParameterList(node.parameters, visitor, context), transformFunctionBody(node));
    enclosingFunctionFlags = savedEnclosingFunctionFlags;
    return updated;
  }
  function visitMethodDeclaration(node: MethodDeclaration) {
    const savedEnclosingFunctionFlags = enclosingFunctionFlags;
    enclosingFunctionFlags = getFunctionFlags(node);
    const updated = node.update(
      undefined,
      enclosingFunctionFlags & FunctionFlags.Generator ? Nodes.visit(node.modifiers, visitorNoAsyncModifier, isModifier) : node.modifiers,
      enclosingFunctionFlags & FunctionFlags.Async ? undefined : node.asteriskToken,
      visitNode(node.name, visitor, isPropertyName),
      visitNode<Token<Syntax.QuestionToken>>(undefined, visitor, isToken),
      undefined,
      visitParameterList(node.parameters, visitor, context),
      undefined,
      enclosingFunctionFlags & FunctionFlags.Async && enclosingFunctionFlags & FunctionFlags.Generator ? transformAsyncGeneratorFunctionBody(node) : transformFunctionBody(node)
    );
    enclosingFunctionFlags = savedEnclosingFunctionFlags;
    return updated;
  }
  function visitFunctionDeclaration(node: FunctionDeclaration) {
    const savedEnclosingFunctionFlags = enclosingFunctionFlags;
    enclosingFunctionFlags = getFunctionFlags(node);
    const updated = node.update(
      undefined,
      enclosingFunctionFlags & FunctionFlags.Generator ? Nodes.visit(node.modifiers, visitorNoAsyncModifier, isModifier) : node.modifiers,
      enclosingFunctionFlags & FunctionFlags.Async ? undefined : node.asteriskToken,
      node.name,
      undefined,
      visitParameterList(node.parameters, visitor, context),
      undefined,
      enclosingFunctionFlags & FunctionFlags.Async && enclosingFunctionFlags & FunctionFlags.Generator ? transformAsyncGeneratorFunctionBody(node) : transformFunctionBody(node)
    );
    enclosingFunctionFlags = savedEnclosingFunctionFlags;
    return updated;
  }
  function visitArrowFunction(node: ArrowFunction) {
    const savedEnclosingFunctionFlags = enclosingFunctionFlags;
    enclosingFunctionFlags = getFunctionFlags(node);
    const updated = node.update(node.modifiers, undefined, visitParameterList(node.parameters, visitor, context), undefined, node.equalsGreaterThanToken, transformFunctionBody(node));
    enclosingFunctionFlags = savedEnclosingFunctionFlags;
    return updated;
  }
  function visitFunctionExpression(node: FunctionExpression) {
    const savedEnclosingFunctionFlags = enclosingFunctionFlags;
    enclosingFunctionFlags = getFunctionFlags(node);
    const updated = node.update(
      enclosingFunctionFlags & FunctionFlags.Generator ? Nodes.visit(node.modifiers, visitorNoAsyncModifier, isModifier) : node.modifiers,
      enclosingFunctionFlags & FunctionFlags.Async ? undefined : node.asteriskToken,
      node.name,
      undefined,
      visitParameterList(node.parameters, visitor, context),
      undefined,
      enclosingFunctionFlags & FunctionFlags.Async && enclosingFunctionFlags & FunctionFlags.Generator ? transformAsyncGeneratorFunctionBody(node) : transformFunctionBody(node)
    );
    enclosingFunctionFlags = savedEnclosingFunctionFlags;
    return updated;
  }
  function transformAsyncGeneratorFunctionBody(node: MethodDeclaration | AccessorDeclaration | FunctionDeclaration | FunctionExpression): FunctionBody {
    resumeLexicalEnvironment();
    const statements: Statement[] = [];
    const statementOffset = addPrologue(statements, node.body!.statements, false, visitor);
    appendObjectRestAssignmentsIfNeeded(statements, node);
    const savedCapturedSuperProperties = capturedSuperProperties;
    const savedHasSuperElementAccess = hasSuperElementAccess;
    capturedSuperProperties = qb.createEscapedMap<true>();
    hasSuperElementAccess = false;
    const returnStatement = new qc.ReturnStatement(
      createAsyncGeneratorHelper(
        context,
        new qs.FunctionExpression(
          undefined,
          new Token(Syntax.AsteriskToken),
          node.name && getGeneratedNameForNode(node.name),
          undefined,
          [],
          undefined,
          node.body!.update(visitLexicalEnvironment(node.body!.statements, visitor, context, statementOffset))
        ),
        !!(hierarchyFacts & HierarchyFacts.HasLexicalThis)
      )
    );
    const emitSuperHelpers = languageVersion >= ScriptTarget.ES2015 && resolver.getNodeCheckFlags(node) & (NodeCheckFlags.AsyncMethodWithSuperBinding | NodeCheckFlags.AsyncMethodWithSuper);
    if (emitSuperHelpers) {
      enableSubstitutionForAsyncMethodsWithSuper();
      const variableStatement = createSuperAccessVariableStatement(resolver, node, capturedSuperProperties);
      substitutedSuperAccessors[qf.get.nodeId(variableStatement)] = true;
      insertStatementsAfterStandardPrologue(statements, [variableStatement]);
    }
    statements.push(returnStatement);
    insertStatementsAfterStandardPrologue(statements, endLexicalEnvironment());
    const block = node.body!.update(statements);
    if (emitSuperHelpers && hasSuperElementAccess) {
      if (resolver.getNodeCheckFlags(node) & NodeCheckFlags.AsyncMethodWithSuperBinding) {
        addEmitHelper(block, advancedAsyncSuperHelper);
      } else if (resolver.getNodeCheckFlags(node) & NodeCheckFlags.AsyncMethodWithSuper) {
        addEmitHelper(block, asyncSuperHelper);
      }
    }
    capturedSuperProperties = savedCapturedSuperProperties;
    hasSuperElementAccess = savedHasSuperElementAccess;
    return block;
  }
  function transformFunctionBody(node: FunctionDeclaration | FunctionExpression | ConstructorDeclaration | MethodDeclaration | AccessorDeclaration): FunctionBody;
  function transformFunctionBody(node: ArrowFunction): ConciseBody;
  function transformFunctionBody(node: FunctionLikeDeclaration): ConciseBody {
    resumeLexicalEnvironment();
    let statementOffset = 0;
    const statements: Statement[] = [];
    const body = visitNode(node.body, visitor, isConciseBody);
    if (qc.is.kind(qc.Block, body)) {
      statementOffset = addPrologue(statements, body.statements, false, visitor);
    }
    addRange(statements, appendObjectRestAssignmentsIfNeeded(undefined, node));
    const leadingStatements = endLexicalEnvironment();
    if (statementOffset > 0 || some(statements) || some(leadingStatements)) {
      const block = convertToFunctionBody(body, true);
      insertStatementsAfterStandardPrologue(statements, leadingStatements);
      addRange(statements, block.statements.slice(statementOffset));
      return block.update(setRange(new Nodes(statements), block.statements));
    }
    return body;
  }
  function appendObjectRestAssignmentsIfNeeded(statements: Statement[] | undefined, node: FunctionLikeDeclaration): Statement[] | undefined {
    for (const parameter of node.parameters) {
      if (parameter.transformFlags & TransformFlags.ContainsObjectRestOrSpread) {
        const temp = getGeneratedNameForNode(parameter);
        const declarations = flattenDestructuringBinding(parameter, visitor, context, FlattenLevel.ObjectRest, temp, true);
        if (some(declarations)) {
          const statement = new qc.VariableStatement(undefined, new qc.VariableDeclarationList(declarations));
          setEmitFlags(statement, EmitFlags.CustomPrologue);
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
      context.enableSubstitution(Syntax.ElementAccessExpression);
      context.enableEmitNotification(Syntax.ClassDeclaration);
      context.enableEmitNotification(Syntax.MethodDeclaration);
      context.enableEmitNotification(Syntax.GetAccessor);
      context.enableEmitNotification(Syntax.SetAccessor);
      context.enableEmitNotification(Syntax.Constructor);
      context.enableEmitNotification(Syntax.VariableStatement);
    }
  }
  function onEmitNode(hint: EmitHint, node: Node, emitCallback: (hint: EmitHint, node: Node) => void) {
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
  function isSuperContainer(node: Node) {
    const kind = node.kind;
    return kind === Syntax.ClassDeclaration || kind === Syntax.Constructor || kind === Syntax.MethodDeclaration || kind === Syntax.GetAccessor || kind === Syntax.SetAccessor;
  }
  function createSuperElementAccessInAsyncMethod(argumentExpression: Expression, location: TextRange): LeftHandSideExpression {
    if (enclosingSuperContainerFlags & NodeCheckFlags.AsyncMethodWithSuperBinding)
      return setRange(new qc.PropertyAccessExpression(new qs.CallExpression(new Identifier('_superIndex'), undefined, [argumentExpression]), 'value'), location);
    return setRange(new qs.CallExpression(new Identifier('_superIndex'), undefined, [argumentExpression]), location);
  }
}
export const assignHelper: UnscopedEmitHelper = {
  name: 'typescript:assign',
  importName: '__assign',
  scoped: false,
  priority: 1,
  text: `
            var __assign = (this && this.__assign) || function () {
                __assign = Object.assign || function(t) {
                    for (var s, i = 1, n = arguments.length; i < n; i++) {
                        s = arguments[i];
                        for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                            t[p] = s[p];
                    }
                    return t;
                };
                return __assign.apply(this, arguments);
            };`,
};
export function createAssignHelper(context: TransformationContext, attributesSegments: Expression[]) {
  if (context.getCompilerOptions().target! >= ScriptTarget.ES2015) return new qs.CallExpression(new qc.PropertyAccessExpression(new Identifier('Object'), 'assign'), undefined, attributesSegments);
  context.requestEmitHelper(assignHelper);
  return new qs.CallExpression(getUnscopedHelperName('__assign'), undefined, attributesSegments);
}
export const awaitHelper: UnscopedEmitHelper = {
  name: 'typescript:await',
  importName: '__await',
  scoped: false,
  text: `
            var __await = (this && this.__await) || function (v) { return this instanceof __await ? (this.v = v, this) : new __await(v); }`,
};
function createAwaitHelper(context: TransformationContext, expression: Expression) {
  context.requestEmitHelper(awaitHelper);
  return new qs.CallExpression(getUnscopedHelperName('__await'), undefined, [expression]);
}
export const asyncGeneratorHelper: UnscopedEmitHelper = {
  name: 'typescript:asyncGenerator',
  importName: '__asyncGenerator',
  scoped: false,
  dependencies: [awaitHelper],
  text: `
            var __asyncGenerator = (this && this.__asyncGenerator) || function (thisArg, _arguments, generator) {
                if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
                var g = generator.apply(thisArg, _arguments || []), i, q = [];
                return i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i;
                function verb(n) { if (g[n]) i[n] = function (v) { return new Promise(function (a, b) { q.push([n, v, a, b]) > 1 || resume(n, v); }); }; }
                function resume(n, v) { try { step(g[n](v)); } catch (e) { settle(q[0][3], e); } }
                function step(r) { r.value instanceof __await ? Promise.resolve(r.value.v).then(fulfill, reject) : settle(q[0][2], r); }
                function fulfill(value) { resume("next", value); }
                function reject(value) { resume("throw", value); }
                function settle(f, v) { if (f(v), q.shift(), q.length) resume(q[0][0], q[0][1]); }
            };`,
};
function createAsyncGeneratorHelper(context: TransformationContext, generatorFunc: FunctionExpression, hasLexicalThis: boolean) {
  context.requestEmitHelper(asyncGeneratorHelper);
  (generatorFunc.emitNode || (generatorFunc.emitNode = {} as EmitNode)).flags |= EmitFlags.AsyncFunctionBody | EmitFlags.ReuseTempVariableScope;
  return new qs.CallExpression(getUnscopedHelperName('__asyncGenerator'), undefined, [hasLexicalThis ? new qc.ThisExpression() : qs.VoidExpression.zero(), new Identifier('arguments'), generatorFunc]);
}
export const asyncDelegator: UnscopedEmitHelper = {
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
function createAsyncDelegatorHelper(context: TransformationContext, expression: Expression, location?: TextRange) {
  context.requestEmitHelper(asyncDelegator);
  return setRange(new qs.CallExpression(getUnscopedHelperName('__asyncDelegator'), undefined, [expression]), location);
}
export const asyncValues: UnscopedEmitHelper = {
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
function createAsyncValuesHelper(context: TransformationContext, expression: Expression, location?: TextRange) {
  context.requestEmitHelper(asyncValues);
  return setRange(new qs.CallExpression(getUnscopedHelperName('__asyncValues'), undefined, [expression]), location);
}
