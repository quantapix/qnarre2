import * as qb from '../base';
import * as qc from '../core';
import { Node, Nodes } from '../core';
import * as qs from '../core3';
import * as qt from '../types';
import * as qy from '../syntax';
import { Modifier, Syntax } from '../syntax';
export function transformES2020(context: TrafoContext) {
  const { hoistVariableDeclaration } = context;
  return chainBundle(transformSourceFile);
  function transformSourceFile(node: SourceFile) {
    if (node.isDeclarationFile) return node;
    return visitEachChild(node, visitor, context);
  }
  function visitor(node: Node): VisitResult<Node> {
    if ((node.trafoFlags & TrafoFlags.ContainsES2020) === 0) return node;
    switch (node.kind) {
      case Syntax.PropertyAccessExpression:
      case Syntax.ElemAccessExpression:
      case Syntax.CallExpression:
        if (node.flags & NodeFlags.OptionalChain) {
          const updated = visitOptionalExpression(node as OptionalChain, false, false);
          qc.assert.notNode(updated, isSyntheticReference);
          return updated;
        }
        return visitEachChild(node, visitor, context);
      case Syntax.BinaryExpression:
        if ((<BinaryExpression>node).operatorToken.kind === Syntax.Question2Token) return transformNullishCoalescingExpression(<BinaryExpression>node);
        return visitEachChild(node, visitor, context);
      case Syntax.DeleteExpression:
        return visitDeleteExpression(node as DeleteExpression);
      default:
        return visitEachChild(node, visitor, context);
    }
  }
  function flattenChain(chain: OptionalChain) {
    qc.assert.notNode(chain, isNonNullChain);
    const links: OptionalChain[] = [chain];
    while (!chain.questionDotToken && !qc.is.kind(qc.TaggedTemplateExpression, chain)) {
      chain = cast(qc.skip.partiallyEmittedExpressions(chain.expression), isOptionalChain);
      qc.assert.notNode(chain, isNonNullChain);
      links.unshift(chain);
    }
    return { expression: chain.expression, chain: links };
  }
  function visitNonOptionalParenthesizedExpression(node: ParenthesizedExpression, captureThisArg: boolean, isDelete: boolean): Expression {
    const expression = visitNonOptionalExpression(node.expression, captureThisArg, isDelete);
    if (qc.is.kind(qc.SyntheticReferenceExpression, expression)) {
      // `(a.b)` -> { expression `((_a = a).b)`, thisArg: `_a` }
      // `(a[b])` -> { expression `((_a = a)[b])`, thisArg: `_a` }
      return new qs.SyntheticReferenceExpression(node.update(expression.expression), expression.thisArg);
    }
    return node.update(expression);
  }
  function visitNonOptionalPropertyOrElemAccessExpression(node: AccessExpression, captureThisArg: boolean, isDelete: boolean): Expression {
    if (qc.is.optionalChain(node)) {
      // If `node` is an optional chain, then it is the outermost chain of an optional expression.
      return visitOptionalExpression(node, captureThisArg, isDelete);
    }
    let expression: Expression = visitNode(node.expression, visitor, isExpression);
    qc.assert.notNode(expression, isSyntheticReference);
    let thisArg: Expression | undefined;
    if (captureThisArg) {
      if (shouldCaptureInTempVariable(expression)) {
        thisArg = createTempVariable(hoistVariableDeclaration);
        expression = qf.create.assignment(thisArg, expression);
        // if (inParamIniter) tempVariableInParam = true;
      } else {
        thisArg = expression;
      }
    }
    expression =
      node.kind === Syntax.PropertyAccessExpression
        ? node.update(expression, visitNode(node.name, visitor, isIdentifier))
        : node.update(expression, visitNode(node.argumentExpression, visitor, isExpression));
    return thisArg ? new qs.SyntheticReferenceExpression(expression, thisArg) : expression;
  }
  function visitNonOptionalCallExpression(node: CallExpression, captureThisArg: boolean): Expression {
    if (qc.is.optionalChain(node)) return visitOptionalExpression(node, captureThisArg, false);
    return visitEachChild(node, visitor, context);
  }
  function visitNonOptionalExpression(node: Expression, captureThisArg: boolean, isDelete: boolean): Expression {
    switch (node.kind) {
      case Syntax.ParenthesizedExpression:
        return visitNonOptionalParenthesizedExpression(node as ParenthesizedExpression, captureThisArg, isDelete);
      case Syntax.PropertyAccessExpression:
      case Syntax.ElemAccessExpression:
        return visitNonOptionalPropertyOrElemAccessExpression(node as AccessExpression, captureThisArg, isDelete);
      case Syntax.CallExpression:
        return visitNonOptionalCallExpression(node as CallExpression, captureThisArg);
      default:
        return visitNode(node, visitor, isExpression);
    }
  }
  function visitOptionalExpression(node: OptionalChain, captureThisArg: boolean, isDelete: boolean): Expression {
    const { expression, chain } = flattenChain(node);
    const left = visitNonOptionalExpression(expression, qc.is.callChain(chain[0]), false);
    const leftThisArg = qc.is.kind(qc.SyntheticReferenceExpression, left) ? left.thisArg : undefined;
    let leftExpression = qc.is.kind(qc.SyntheticReferenceExpression, left) ? left.expression : left;
    let capturedLeft: Expression = leftExpression;
    if (shouldCaptureInTempVariable(leftExpression)) {
      capturedLeft = createTempVariable(hoistVariableDeclaration);
      leftExpression = qf.create.assignment(capturedLeft, leftExpression);
      // if (inParamIniter) tempVariableInParam = true;
    }
    let rightExpression = capturedLeft;
    let thisArg: Expression | undefined;
    for (let i = 0; i < chain.length; i++) {
      const segment = chain[i];
      switch (segment.kind) {
        case Syntax.PropertyAccessExpression:
        case Syntax.ElemAccessExpression:
          if (i === chain.length - 1 && captureThisArg) {
            if (shouldCaptureInTempVariable(rightExpression)) {
              thisArg = createTempVariable(hoistVariableDeclaration);
              rightExpression = qf.create.assignment(thisArg, rightExpression);
              // if (inParamIniter) tempVariableInParam = true;
            } else {
              thisArg = rightExpression;
            }
          }
          rightExpression =
            segment.kind === Syntax.PropertyAccessExpression
              ? new qc.PropertyAccessExpression(rightExpression, visitNode(segment.name, visitor, isIdentifier))
              : new qs.ElemAccessExpression(rightExpression, visitNode(segment.argumentExpression, visitor, isExpression));
          break;
        case Syntax.CallExpression:
          if (i === 0 && leftThisArg) {
            rightExpression = createFunctionCall(
              rightExpression,
              leftThisArg.kind === Syntax.SuperKeyword ? new qc.ThisExpression() : leftThisArg,
              Nodes.visit(segment.arguments, visitor, isExpression)
            );
          } else {
            rightExpression = new qs.CallExpression(rightExpression, undefined, Nodes.visit(segment.arguments, visitor, isExpression));
          }
          break;
      }
      rightExpression.setOriginal(segment);
    }
    const target = isDelete
      ? new qc.ConditionalExpression(createNotNullCondition(leftExpression, capturedLeft, true), new qc.BooleanLiteral(true), new DeleteExpression(rightExpression))
      : new qc.ConditionalExpression(createNotNullCondition(leftExpression, capturedLeft, true), qs.VoidExpression.zero(), rightExpression);
    return thisArg ? new qs.SyntheticReferenceExpression(target, thisArg) : target;
  }
  function createNotNullCondition(left: Expression, right: Expression, invert?: boolean) {
    return new BinaryExpression(
      new BinaryExpression(left, new Token(invert ? Syntax.Equals3Token : Syntax.ExclamationEquals2Token), new qc.NullLiteral()),
      new Token(invert ? Syntax.Bar2Token : Syntax.Ampersand2Token),
      new BinaryExpression(right, new Token(invert ? Syntax.Equals3Token : Syntax.ExclamationEquals2Token), qs.VoidExpression.zero())
    );
  }
  function transformNullishCoalescingExpression(node: BinaryExpression) {
    let left = visitNode(node.left, visitor, isExpression);
    let right = left;
    if (shouldCaptureInTempVariable(left)) {
      right = createTempVariable(hoistVariableDeclaration);
      left = qf.create.assignment(right, left);
      // if (inParamIniter) tempVariableInParam = true;
    }
    return new qc.ConditionalExpression(createNotNullCondition(left, right), right, visitNode(node.right, visitor, isExpression));
  }
  function shouldCaptureInTempVariable(expression: Expression): boolean {
    return !qc.is.kind(qc.Identifier, expression) && expression.kind !== Syntax.ThisKeyword && expression.kind !== Syntax.SuperKeyword;
  }
  function visitDeleteExpression(n: DeleteExpression) {
    return qc.is.optionalChain(qc.skip.parentheses(n.expression)) ? visitNonOptionalExpression(n.expression, false, true).setOriginalNode(n) : n.update(visitNode(n.expression, visitor, isExpression));
  }
}
