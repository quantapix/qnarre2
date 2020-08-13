import { Node, Modifier, ModifierFlags } from '../types';
import { qf, Nodes } from '../core';
import { Syntax } from '../syntax';
import * as qc from '../core';
import * as qd from '../diags';
import * as qt from '../types';
import * as qu from '../utils';
import * as qy from '../syntax';
export function transformESNext(context: TrafoContext) {
  return chainBundle(transformSourceFile);
  function transformSourceFile(node: SourceFile) {
    if (node.isDeclarationFile) return node;
    return visitEachChild(node, visitor, context);
  }
  function visitor(node: Node): VisitResult<Node> {
    if ((node.trafoFlags & TrafoFlags.ContainsESNext) === 0) return node;
    switch (node.kind) {
      default:
        return visitEachChild(node, visitor, context);
    }
  }
}
