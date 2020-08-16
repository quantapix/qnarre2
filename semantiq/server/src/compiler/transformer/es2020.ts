import { Node, Modifier, ModifierFlags } from '../types';
import { qf, Nodes } from '../core';
import { Syntax } from '../syntax';
import * as qc from '../core';
import * as qd from '../diags';
import * as qt from '../types';
import * as qu from '../utils';
import * as qy from '../syntax';
export function transformES2020(context: qt.TrafoContext) {
  const { hoistVariableDeclaration } = context;
  return chainBundle(transformSourceFile);
  function transformSourceFile(node: qt.SourceFile) {
    if (node.isDeclarationFile) return node;
    return qf.visit.children(node, visitor, context);
  }
  function visitor(node: Node): VisitResult<Node> {
    if ((node.trafoFlags & TrafoFlags.ContainsES2020) === 0) return node;
    switch (node.kind) {
      case Syntax.PropertyAccessExpression:
      case Syntax.ElemAccessExpression:
      case Syntax.CallExpression:
        if (node.flags & NodeFlags.OptionalChain) {
          const updated = visitOptionalExpression(node as qt.OptionalChain, false, false);
          qc.assert.notNode(updated, isSyntheticReference);
          return updated;
        }
        return qf.visit.children(node, visitor, context);
      case Syntax.BinaryExpression:
        if ((<qt.BinaryExpression>node).operatorToken.kind === Syntax.Question2Token) return transformNullishCoalescingExpression(<qt.BinaryExpression>node);
        return qf.visit.children(node, visitor, context);
      case Syntax.DeleteExpression:
        return visitDeleteExpression(node as qt.DeleteExpression);
      default:
        return qf.visit.children(node, visitor, context);
    }
  }
  function flattenChain(chain: qt.OptionalChain) {
    qc.assert.notNode(chain, isNonNullChain);
    const links: qt.OptionalChain[] = [chain];
    while (!chain.questionDotToken && !chain.kind === Syntax.TaggedTemplateExpression) {
      chain = cast(qf.skip.partiallyEmittedExpressions(chain.expression), isOptionalChain);
      qc.assert.notNode(chain, isNonNullChain);
      links.unshift(chain);
    }
    return { expression: chain.expression, chain: links };
  }
  function visitNonOptionalParenthesizedExpression(node: qt.ParenthesizedExpression, captureThisArg: boolean, isDelete: boolean): qt.Expression {
    const expression = visitNonOptionalExpression(node.expression, captureThisArg, isDelete);
    if (expression.kind === Syntax.SyntheticReferenceExpression) {
      // `(a.b)` -> { expression `((_a = a).b)`, thisArg: `_a` }
      // `(a[b])` -> { expression `((_a = a)[b])`, thisArg: `_a` }
      return new qc.SyntheticReferenceExpression(node.update(expression.expression), expression.thisArg);
    }
    return node.update(expression);
  }
  function visitNonOptionalPropertyOrElemAccessExpression(node: qt.AccessExpression, captureThisArg: boolean, isDelete: boolean): qt.Expression {
    if (qf.is.optionalChain(node)) {
      // If `node` is an optional chain, then it is the outermost chain of an optional expression.
      return visitOptionalExpression(node, captureThisArg, isDelete);
    }
    let expression: qt.Expression = qf.visit.node(node.expression, visitor, isExpression);
    qc.assert.notNode(expression, isSyntheticReference);
    let thisArg: qt.Expression | undefined;
    if (captureThisArg) {
      if (shouldCaptureInTempVariable(expression)) {
        thisArg = qf.create.tempVariable(hoistVariableDeclaration);
        expression = qf.create.assignment(thisArg, expression);
        // if (inParamIniter) tempVariableInParam = true;
      } else {
        thisArg = expression;
      }
    }
    expression =
      node.kind === Syntax.PropertyAccessExpression
        ? node.update(expression, qf.visit.node(node.name, visitor, qf.is.identifier))
        : node.update(expression, qf.visit.node(node.argExpression, visitor, isExpression));
    return thisArg ? new qc.SyntheticReferenceExpression(expression, thisArg) : expression;
  }
  function visitNonOptionalCallExpression(node: qt.CallExpression, captureThisArg: boolean): qt.Expression {
    if (qf.is.optionalChain(node)) return visitOptionalExpression(node, captureThisArg, false);
    return qf.visit.children(node, visitor, context);
  }
  function visitNonOptionalExpression(node: qt.Expression, captureThisArg: boolean, isDelete: boolean): qt.Expression {
    switch (node.kind) {
      case Syntax.ParenthesizedExpression:
        return visitNonOptionalParenthesizedExpression(node as qt.ParenthesizedExpression, captureThisArg, isDelete);
      case Syntax.PropertyAccessExpression:
      case Syntax.ElemAccessExpression:
        return visitNonOptionalPropertyOrElemAccessExpression(node as qt.AccessExpression, captureThisArg, isDelete);
      case Syntax.CallExpression:
        return visitNonOptionalCallExpression(node as qt.CallExpression, captureThisArg);
      default:
        return qf.visit.node(node, visitor, isExpression);
    }
  }
  function visitOptionalExpression(node: qt.OptionalChain, captureThisArg: boolean, isDelete: boolean): qt.Expression {
    const { expression, chain } = flattenChain(node);
    const left = visitNonOptionalExpression(expression, qf.is.callChain(chain[0]), false);
    const leftThisArg = left.kind === Syntax.SyntheticReferenceExpression ? left.thisArg : undefined;
    let leftExpression = left.kind === Syntax.SyntheticReferenceExpression ? left.expression : left;
    let capturedLeft: qt.Expression = leftExpression;
    if (shouldCaptureInTempVariable(leftExpression)) {
      capturedLeft = qf.create.tempVariable(hoistVariableDeclaration);
      leftExpression = qf.create.assignment(capturedLeft, leftExpression);
      // if (inParamIniter) tempVariableInParam = true;
    }
    let rightExpression = capturedLeft;
    let thisArg: qt.Expression | undefined;
    for (let i = 0; i < chain.length; i++) {
      const segment = chain[i];
      switch (segment.kind) {
        case Syntax.PropertyAccessExpression:
        case Syntax.ElemAccessExpression:
          if (i === chain.length - 1 && captureThisArg) {
            if (shouldCaptureInTempVariable(rightExpression)) {
              thisArg = qf.create.tempVariable(hoistVariableDeclaration);
              rightExpression = qf.create.assignment(thisArg, rightExpression);
              // if (inParamIniter) tempVariableInParam = true;
            } else {
              thisArg = rightExpression;
            }
          }
          rightExpression =
            segment.kind === Syntax.PropertyAccessExpression
              ? new qc.PropertyAccessExpression(rightExpression, qf.visit.node(segment.name, visitor, qf.is.identifier))
              : new qc.ElemAccessExpression(rightExpression, qf.visit.node(segment.argExpression, visitor, isExpression));
          break;
        case Syntax.CallExpression:
          if (i === 0 && leftThisArg) {
            rightExpression = qf.create.functionCall(
              rightExpression,
              leftThisArg.kind === Syntax.SuperKeyword ? new qc.ThisExpression() : leftThisArg,
              Nodes.visit(segment.args, visitor, isExpression)
            );
          } else {
            rightExpression = new qc.CallExpression(rightExpression, undefined, Nodes.visit(segment.args, visitor, isExpression));
          }
          break;
      }
      rightExpression.setOriginal(segment);
    }
    const target = isDelete
      ? new qc.ConditionalExpression(createNotNullCondition(leftExpression, capturedLeft, true), new qc.BooleanLiteral(true), new qc.DeleteExpression(rightExpression))
      : new qc.ConditionalExpression(createNotNullCondition(leftExpression, capturedLeft, true), qc.VoidExpression.zero(), rightExpression);
    return thisArg ? new qc.SyntheticReferenceExpression(target, thisArg) : target;
  }
  function createNotNullCondition(left: qt.Expression, right: qt.Expression, invert?: boolean) {
    return new qc.BinaryExpression(
      new qc.BinaryExpression(left, new qc.Token(invert ? Syntax.Equals3Token : Syntax.ExclamationEquals2Token), new qc.NullLiteral()),
      new qc.Token(invert ? Syntax.Bar2Token : Syntax.Ampersand2Token),
      new qc.BinaryExpression(right, new qc.Token(invert ? Syntax.Equals3Token : Syntax.ExclamationEquals2Token), qc.VoidExpression.zero())
    );
  }
  function transformNullishCoalescingExpression(node: qt.BinaryExpression) {
    let left = qf.visit.node(node.left, visitor, isExpression);
    let right = left;
    if (shouldCaptureInTempVariable(left)) {
      right = qf.create.tempVariable(hoistVariableDeclaration);
      left = qf.create.assignment(right, left);
      // if (inParamIniter) tempVariableInParam = true;
    }
    return new qc.ConditionalExpression(createNotNullCondition(left, right), right, qf.visit.node(node.right, visitor, isExpression));
  }
  function shouldCaptureInTempVariable(expression: qt.Expression): boolean {
    return !expression.kind === Syntax.Identifier && expression.kind !== Syntax.ThisKeyword && expression.kind !== Syntax.SuperKeyword;
  }
  function visitDeleteExpression(n: qt.DeleteExpression) {
    return qf.is.optionalChain(qf.skip.parentheses(n.expression))
      ? visitNonOptionalExpression(n.expression, false, true).setOriginalNode(n)
      : n.update(qf.visit.node(n.expression, visitor, isExpression));
  }
}
