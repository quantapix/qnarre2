import * as qb from '../base';
import * as qc from '../core';
import { Node, Nodes } from '../core';
import * as qs from '../core3';
import * as qt from '../types';
import * as qy from '../syntax';
import { Modifier, Syntax } from '../syntax';
export function transformES2019(context: TransformationContext) {
  return chainBundle(transformSourceFile);
  function transformSourceFile(node: SourceFile) {
    if (node.isDeclarationFile) return node;
    return visitEachChild(node, visitor, context);
  }
  function visitor(node: Node): VisitResult<Node> {
    if ((node.transformFlags & TransformFlags.ContainsES2019) === 0) return node;
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
