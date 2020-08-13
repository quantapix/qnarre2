import { Node, Modifier, ModifierFlags } from '../types';
import { qf, Nodes } from '../core';
import { Syntax } from '../syntax';
import * as qc from '../core';
import * as qd from '../diags';
import * as qt from '../types';
import * as qu from '../utils';
import * as qy from '../syntax';
export function transformES5(context: qt.TrafoContext) {
  const compilerOpts = context.getCompilerOpts();
  let previousOnEmitNode: (hint: EmitHint, node: Node, emitCallback: (hint: EmitHint, node: Node) => void) => void;
  let noSubstitution: boolean[];
  if (compilerOpts.jsx === JsxEmit.Preserve || compilerOpts.jsx === JsxEmit.ReactNative) {
    previousOnEmitNode = context.onEmitNode;
    context.onEmitNode = onEmitNode;
    context.enableEmitNotification(Syntax.JsxOpeningElem);
    context.enableEmitNotification(Syntax.JsxClosingElem);
    context.enableEmitNotification(Syntax.JsxSelfClosingElem);
    noSubstitution = [];
  }
  const previousOnSubstituteNode = context.onSubstituteNode;
  context.onSubstituteNode = onSubstituteNode;
  context.enableSubstitution(Syntax.PropertyAccessExpression);
  context.enableSubstitution(Syntax.PropertyAssignment);
  return chainBundle(transformSourceFile);
  function transformSourceFile(node: qt.SourceFile) {
    return node;
  }
  function onEmitNode(hint: EmitHint, node: Node, emitCallback: (emitContext: EmitHint, node: Node) => void) {
    switch (node.kind) {
      case Syntax.JsxOpeningElem:
      case Syntax.JsxClosingElem:
      case Syntax.JsxSelfClosingElem:
        const tagName = (<qt.JsxOpeningElem | qt.JsxClosingElem | qt.JsxSelfClosingElem>node).tagName;
        noSubstitution[getOriginalNodeId(tagName)] = true;
        break;
    }
    previousOnEmitNode(hint, node, emitCallback);
  }
  function onSubstituteNode(hint: EmitHint, node: Node) {
    if (node.id && noSubstitution && noSubstitution[node.id]) return previousOnSubstituteNode(hint, node);
    node = previousOnSubstituteNode(hint, node);
    if (qf.is.kind(qc.PropertyAccessExpression, node)) return substitutePropertyAccessExpression(node);
    if (qf.is.kind(qc.PropertyAssignment, node)) return substitutePropertyAssignment(node);
    return node;
  }
  function substitutePropertyAccessExpression(node: qt.PropertyAccessExpression): qt.Expression {
    if (qf.is.kind(qc.PrivateIdentifier, node.name)) return node;
    const literalName = trySubstituteReservedName(node.name);
    if (literalName) return new qc.ElemAccessExpression(node.expression, literalName).setRange(node);
    return node;
  }
  function substitutePropertyAssignment(node: qt.PropertyAssignment): qt.PropertyAssignment {
    const literalName = qf.is.kind(qc.Identifier, node.name) && trySubstituteReservedName(node.name);
    if (literalName) return node.update(literalName, node.initer);
    return node;
  }
  function trySubstituteReservedName(name: qt.Identifier) {
    const token = name.originalKeywordKind || (isSynthesized(name) ? qt.Token.fromString(idText(name)) : undefined);
    if (token !== undefined && token >= Syntax.FirstReservedWord && token <= Syntax.LastReservedWord) return qc.asLiteral(name).setRange(name);
    return;
  }
}
