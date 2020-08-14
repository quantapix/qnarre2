import { Node, Modifier, ModifierFlags } from '../types';
import { qf, Nodes } from '../core';
import { Syntax } from '../syntax';
import * as qc from '../core';
import * as qd from '../diags';
import * as qt from '../types';
import * as qu from '../utils';
import * as qy from '../syntax';
export function transformES2016(context: qt.TrafoContext) {
  const { hoistVariableDeclaration } = context;
  return chainBundle(transformSourceFile);
  function transformSourceFile(node: qt.SourceFile) {
    if (node.isDeclarationFile) return node;
    return qf.visit.eachChild(node, visitor, context);
  }
  function visitor(node: Node): VisitResult<Node> {
    if ((node.trafoFlags & TrafoFlags.ContainsES2016) === 0) return node;
    switch (node.kind) {
      case Syntax.BinaryExpression:
        return visitBinaryExpression(<qt.BinaryExpression>node);
      default:
        return qf.visit.eachChild(node, visitor, context);
    }
  }
  function visitBinaryExpression(node: qt.BinaryExpression): qt.Expression {
    switch (node.operatorToken.kind) {
      case Syntax.Asterisk2EqualsToken:
        return visitExponentiationAssignmentExpression(node);
      case Syntax.Asterisk2Token:
        return visitExponentiationExpression(node);
      default:
        return qf.visit.eachChild(node, visitor, context);
    }
  }
  function visitExponentiationAssignmentExpression(node: qt.BinaryExpression) {
    let target: qt.Expression;
    let value: qt.Expression;
    const left = qf.visit.node(node.left, visitor, isExpression);
    const right = qf.visit.node(node.right, visitor, isExpression);
    if (left.kind === Syntax.ElemAccessExpression) {
      // Transforms `a[x] **= b` into `(_a = a)[_x = x] = Math.pow(_a[_x], b)`
      const expressionTemp = qf.create.tempVariable(hoistVariableDeclaration);
      const argExpressionTemp = qf.create.tempVariable(hoistVariableDeclaration);
      target = new qc.ElemAccessExpression(
        qf.create.assignment(expressionTemp, left.expression).setRange(left.expression),
        qf.create.assignment(argExpressionTemp, left.argExpression).setRange(left.argExpression)
      ).setRange(left);
      value = new qc.ElemAccessExpression(expressionTemp, argExpressionTemp).setRange(left);
    } else if (left.kind === Syntax.PropertyAccessExpression) {
      // Transforms `a.x **= b` into `(_a = a).x = Math.pow(_a.x, b)`
      const expressionTemp = qf.create.tempVariable(hoistVariableDeclaration);
      target = new qc.PropertyAccessExpression(qf.create.assignment(expressionTemp, left.expression).setRange(left.expression), left.name).setRange(left);
      value = new qc.PropertyAccessExpression(expressionTemp, left.name).setRange(left);
    } else {
      // Transforms `a **= b` into `a = Math.pow(a, b)`
      target = left;
      value = left;
    }
    return qf.create.assignment(target, qf.create.mathPow(value, right, node)).setRange(node);
  }
  function visitExponentiationExpression(node: qt.BinaryExpression) {
    // Transforms `a ** b` into `Math.pow(a, b)`
    const left = qf.visit.node(node.left, visitor, isExpression);
    const right = qf.visit.node(node.right, visitor, isExpression);
    return qf.create.mathPow(left, right, node);
  }
}
