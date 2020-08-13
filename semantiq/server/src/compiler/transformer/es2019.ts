import { Node, Modifier, ModifierFlags } from '../types';
import { qf, Nodes } from '../core';
import { Syntax } from '../syntax';
import * as qc from '../core';
import * as qd from '../diags';
import * as qt from '../types';
import * as qu from '../utils';
import * as qy from '../syntax';
export function transformES2019(context: TrafoContext) {
  return chainBundle(transformSourceFile);
  function transformSourceFile(node: SourceFile) {
    if (node.isDeclarationFile) return node;
    return visitEachChild(node, visitor, context);
  }
  function visitor(node: Node): VisitResult<Node> {
    if ((node.trafoFlags & TrafoFlags.ContainsES2019) === 0) return node;
    switch (node.kind) {
      case Syntax.CatchClause:
        return visitCatchClause(node as CatchClause);
      default:
        return visitEachChild(node, visitor, context);
    }
  }
  function visitCatchClause(node: CatchClause): CatchClause {
    if (!node.variableDeclaration) return node.update(new qc.VariableDeclaration(createTempVariable(undefined)), visitNode(node.block, visitor, isBlock));
    return visitEachChild(node, visitor, context);
  }
}
