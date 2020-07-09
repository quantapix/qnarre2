import * as qb from '../base';
import * as qc from '../core';
import { Node, Nodes } from '../core';
import * as qs from '../classes';
import * as qt from '../types';
import * as qy from '../syntax';
import { Modifier, Syntax } from '../syntax';
export function transformES5(context: TransformationContext) {
  const compilerOptions = context.getCompilerOptions();
  let previousOnEmitNode: (hint: EmitHint, node: Node, emitCallback: (hint: EmitHint, node: Node) => void) => void;
  let noSubstitution: boolean[];
  if (compilerOptions.jsx === JsxEmit.Preserve || compilerOptions.jsx === JsxEmit.ReactNative) {
    previousOnEmitNode = context.onEmitNode;
    context.onEmitNode = onEmitNode;
    context.enableEmitNotification(Syntax.JsxOpeningElement);
    context.enableEmitNotification(Syntax.JsxClosingElement);
    context.enableEmitNotification(Syntax.JsxSelfClosingElement);
    noSubstitution = [];
  }
  const previousOnSubstituteNode = context.onSubstituteNode;
  context.onSubstituteNode = onSubstituteNode;
  context.enableSubstitution(Syntax.PropertyAccessExpression);
  context.enableSubstitution(Syntax.PropertyAssignment);
  return chainBundle(transformSourceFile);
  function transformSourceFile(node: SourceFile) {
    return node;
  }
  function onEmitNode(hint: EmitHint, node: Node, emitCallback: (emitContext: EmitHint, node: Node) => void) {
    switch (node.kind) {
      case Syntax.JsxOpeningElement:
      case Syntax.JsxClosingElement:
      case Syntax.JsxSelfClosingElement:
        const tagName = (<JsxOpeningElement | JsxClosingElement | JsxSelfClosingElement>node).tagName;
        noSubstitution[getOriginalNodeId(tagName)] = true;
        break;
    }
    previousOnEmitNode(hint, node, emitCallback);
  }
  function onSubstituteNode(hint: EmitHint, node: Node) {
    if (node.id && noSubstitution && noSubstitution[node.id]) return previousOnSubstituteNode(hint, node);
    node = previousOnSubstituteNode(hint, node);
    if (Node.is.kind(PropertyAccessExpression, node)) return substitutePropertyAccessExpression(node);
    if (Node.is.kind(PropertyAssignment, node)) return substitutePropertyAssignment(node);
    return node;
  }
  function substitutePropertyAccessExpression(node: PropertyAccessExpression): Expression {
    if (Node.is.kind(PrivateIdentifier, node.name)) return node;
    const literalName = trySubstituteReservedName(node.name);
    if (literalName) return setRange(new qs.ElementAccessExpression(node.expression, literalName), node);
    return node;
  }
  function substitutePropertyAssignment(node: PropertyAssignment): PropertyAssignment {
    const literalName = Node.is.kind(Identifier, node.name) && trySubstituteReservedName(node.name);
    if (literalName) return node.update(literalName, node.initializer);
    return node;
  }
  function trySubstituteReservedName(name: Identifier) {
    const token = name.originalKeywordKind || (isSynthesized(name) ? Token.fromString(idText(name)) : undefined);
    if (token !== undefined && token >= Syntax.FirstReservedWord && token <= Syntax.LastReservedWord) return setRange(qc.asLiteral(name), name);
    return;
  }
}
