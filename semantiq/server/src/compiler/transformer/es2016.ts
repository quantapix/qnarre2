import * as qb from '../base';
import * as qc from '../core';
import { Node, Nodes } from '../core';
import * as qs from '../core3';
import * as qt from '../types';
import * as qy from '../syntax';
import { Modifier, Syntax } from '../syntax';
export function transformES2016(context: TrafoContext) {
  const { hoistVariableDeclaration } = context;
  return chainBundle(transformSourceFile);
  function transformSourceFile(node: SourceFile) {
    if (node.isDeclarationFile) return node;
    return visitEachChild(node, visitor, context);
  }
  function visitor(node: Node): VisitResult<Node> {
    if ((node.trafoFlags & TrafoFlags.ContainsES2016) === 0) return node;
    switch (node.kind) {
      case Syntax.BinaryExpression:
        return visitBinaryExpression(<BinaryExpression>node);
      default:
        return visitEachChild(node, visitor, context);
    }
  }
  function visitBinaryExpression(node: BinaryExpression): Expression {
    switch (node.operatorToken.kind) {
      case Syntax.Asterisk2EqualsToken:
        return visitExponentiationAssignmentExpression(node);
      case Syntax.Asterisk2Token:
        return visitExponentiationExpression(node);
      default:
        return visitEachChild(node, visitor, context);
    }
  }
  function visitExponentiationAssignmentExpression(node: BinaryExpression) {
    let target: Expression;
    let value: Expression;
    const left = visitNode(node.left, visitor, isExpression);
    const right = visitNode(node.right, visitor, isExpression);
    if (qc.is.kind(qc.ElemAccessExpression, left)) {
      // Transforms `a[x] **= b` into `(_a = a)[_x = x] = Math.pow(_a[_x], b)`
      const expressionTemp = createTempVariable(hoistVariableDeclaration);
      const argExpressionTemp = createTempVariable(hoistVariableDeclaration);
      target = new qs.ElemAccessExpression(
        qf.create.assignment(expressionTemp, left.expression).setRange(left.expression),
        qf.create.assignment(argExpressionTemp, left.argExpression).setRange(left.argExpression)
      ).setRange(left);
      value = new qs.ElemAccessExpression(expressionTemp, argExpressionTemp).setRange(left);
    } else if (qc.is.kind(qc.PropertyAccessExpression, left)) {
      // Transforms `a.x **= b` into `(_a = a).x = Math.pow(_a.x, b)`
      const expressionTemp = createTempVariable(hoistVariableDeclaration);
      target = new qc.PropertyAccessExpression(qf.create.assignment(expressionTemp, left.expression).setRange(left.expression), left.name).setRange(left);
      value = new qc.PropertyAccessExpression(expressionTemp, left.name).setRange(left);
    } else {
      // Transforms `a **= b` into `a = Math.pow(a, b)`
      target = left;
      value = left;
    }
    return qf.create.assignment(target, createMathPow(value, right, node)).setRange(node);
  }
  function visitExponentiationExpression(node: BinaryExpression) {
    // Transforms `a ** b` into `Math.pow(a, b)`
    const left = visitNode(node.left, visitor, isExpression);
    const right = visitNode(node.right, visitor, isExpression);
    return createMathPow(left, right, node);
  }
}
