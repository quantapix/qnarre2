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
  let previousOnEmitNode: (hint: qt.EmitHint, node: Node, emitCallback: (hint: qt.EmitHint, node: Node) => void) => void;
  let noSubstitution: boolean[];
  if (compilerOpts.jsx === qt.JsxEmit.Preserve || compilerOpts.jsx === qt.JsxEmit.ReactNative) {
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
  function onEmitNode(hint: qt.EmitHint, node: Node, emitCallback: (emitContext: qt.EmitHint, node: Node) => void) {
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
  function onSubstituteNode(hint: qt.EmitHint, node: Node) {
    if (node.id && noSubstitution && noSubstitution[node.id]) return previousOnSubstituteNode(hint, node);
    node = previousOnSubstituteNode(hint, node);
    if (node.kind === Syntax.PropertyAccessExpression) return substitutePropertyAccessExpression(node);
    if (node.kind === Syntax.PropertyAssignment) return substitutePropertyAssignment(node);
    return node;
  }
  function substitutePropertyAccessExpression(node: qt.PropertyAccessExpression): qt.Expression {
    if (node.name.kind === Syntax.PrivateIdentifier) return node;
    const literalName = trySubstituteReservedName(node.name);
    if (literalName) return new qc.ElemAccessExpression(node.expression, literalName).setRange(node);
    return node;
  }
  function substitutePropertyAssignment(node: qt.PropertyAssignment): qt.PropertyAssignment {
    const literalName = node.name.kind === Syntax.Identifier && trySubstituteReservedName(node.name);
    if (literalName) return node.update(literalName, node.initer);
    return node;
  }
  function trySubstituteReservedName(name: qt.Identifier) {
    const token = name.originalKeywordKind || (qf.is.synthesized(name) ? qt.Token.fromString(idText(name)) : undefined);
    if (token !== undefined && token >= Syntax.FirstReservedWord && token <= Syntax.LastReservedWord) return qc.asLiteral(name).setRange(name);
    return;
  }
}
