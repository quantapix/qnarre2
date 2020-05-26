import * as qpc from './corePublic';
import * as qpu from './utilitiesPublic';
import * as qc from './core';
import * as qt from './types';
import { Debug } from './debug';

function reduceNode<T>(node: qt.Node | undefined, f: (memo: T, node: qt.Node) => T, initial: T) {
  return node ? f(initial, node) : initial;
}

function reduceNodeArray<T>(nodes: qt.NodeArray<Node> | undefined, f: (memo: T, nodes: qt.NodeArray<Node>) => T, initial: T) {
  return nodes ? f(initial, nodes) : initial;
}

/**
 * Similar to `reduceLeft`, performs a reduction against each child of a node.
 * NOTE: Unlike `forEachChild`, this does *not* visit every node.
 *
 * @param node The node containing the children to reduce.
 * @param initial The initial value to supply to the reduction.
 * @param f The callback function
 */
export function reduceEachChild<T>(node: qt.Node | undefined, initial: T, cbNode: (memo: T, node: qt.Node) => T, cbNodeArray?: (memo: T, nodes: qt.NodeArray<Node>) => T): T {
  if (node === undefined) {
    return initial;
  }

  const reduceNodes: (nodes: qt.NodeArray<Node> | undefined, f: ((memo: T, node: qt.Node) => T) | ((memo: T, node: qt.NodeArray<Node>) => T), initial: T) => T = cbNodeArray ? reduceNodeArray : reduceLeft;
  const cbNodes = cbNodeArray || cbNode;
  const kind = node.kind;

  // No need to visit nodes with no children.
  if (kind > qt.SyntaxKind.FirstToken && kind <= qt.SyntaxKind.LastToken) {
    return initial;
  }

  // We do not yet support types.
  if (kind >= qt.SyntaxKind.TypePredicate && kind <= qt.SyntaxKind.LiteralType) {
    return initial;
  }

  let result = initial;
  switch (node.kind) {
    // Leaf nodes
    case qt.SyntaxKind.SemicolonClassElement:
    case qt.SyntaxKind.EmptyStatement:
    case qt.SyntaxKind.OmittedExpression:
    case qt.SyntaxKind.DebuggerStatement:
    case qt.SyntaxKind.NotEmittedStatement:
      // No need to visit nodes with no children.
      break;

    // Names
    case qt.SyntaxKind.QualifiedName:
      result = reduceNode((<QualifiedName>node).left, cbNode, result);
      result = reduceNode((<QualifiedName>node).right, cbNode, result);
      break;

    case qt.SyntaxKind.ComputedPropertyName:
      result = reduceNode((<ComputedPropertyName>node).expression, cbNode, result);
      break;

    // Signature elements
    case qt.SyntaxKind.Parameter:
      result = reduceNodes((<qt.ParameterDeclaration>node).decorators, cbNodes, result);
      result = reduceNodes((<qt.ParameterDeclaration>node).modifiers, cbNodes, result);
      result = reduceNode((<qt.ParameterDeclaration>node).name, cbNode, result);
      result = reduceNode((<qt.ParameterDeclaration>node).type, cbNode, result);
      result = reduceNode((<qt.ParameterDeclaration>node).initializer, cbNode, result);
      break;

    case qt.SyntaxKind.Decorator:
      result = reduceNode((<qt.Decorator>node).expression, cbNode, result);
      break;

    // Type member
    case qt.SyntaxKind.PropertySignature:
      result = reduceNodes((<qt.PropertySignature>node).modifiers, cbNodes, result);
      result = reduceNode((<qt.PropertySignature>node).name, cbNode, result);
      result = reduceNode((<qt.PropertySignature>node).questionToken, cbNode, result);
      result = reduceNode((<qt.PropertySignature>node).type, cbNode, result);
      result = reduceNode((<qt.PropertySignature>node).initializer, cbNode, result);
      break;

    case qt.SyntaxKind.PropertyDeclaration:
      result = reduceNodes((<qt.PropertyDeclaration>node).decorators, cbNodes, result);
      result = reduceNodes((<qt.PropertyDeclaration>node).modifiers, cbNodes, result);
      result = reduceNode((<qt.PropertyDeclaration>node).name, cbNode, result);
      result = reduceNode((<qt.PropertyDeclaration>node).type, cbNode, result);
      result = reduceNode((<qt.PropertyDeclaration>node).initializer, cbNode, result);
      break;

    case qt.SyntaxKind.MethodDeclaration:
      result = reduceNodes((<qt.MethodDeclaration>node).decorators, cbNodes, result);
      result = reduceNodes((<qt.MethodDeclaration>node).modifiers, cbNodes, result);
      result = reduceNode((<qt.MethodDeclaration>node).name, cbNode, result);
      result = reduceNodes((<qt.MethodDeclaration>node).typeParameters, cbNodes, result);
      result = reduceNodes((<qt.MethodDeclaration>node).parameters, cbNodes, result);
      result = reduceNode((<qt.MethodDeclaration>node).type, cbNode, result);
      result = reduceNode((<qt.MethodDeclaration>node).body, cbNode, result);
      break;

    case qt.SyntaxKind.Constructor:
      result = reduceNodes((<qt.ConstructorDeclaration>node).modifiers, cbNodes, result);
      result = reduceNodes((<qt.ConstructorDeclaration>node).parameters, cbNodes, result);
      result = reduceNode((<qt.ConstructorDeclaration>node).body, cbNode, result);
      break;

    case qt.SyntaxKind.GetAccessor:
      result = reduceNodes((<qt.GetAccessorDeclaration>node).decorators, cbNodes, result);
      result = reduceNodes((<qt.GetAccessorDeclaration>node).modifiers, cbNodes, result);
      result = reduceNode((<qt.GetAccessorDeclaration>node).name, cbNode, result);
      result = reduceNodes((<qt.GetAccessorDeclaration>node).parameters, cbNodes, result);
      result = reduceNode((<qt.GetAccessorDeclaration>node).type, cbNode, result);
      result = reduceNode((<qt.GetAccessorDeclaration>node).body, cbNode, result);
      break;

    case qt.SyntaxKind.SetAccessor:
      result = reduceNodes((<qt.GetAccessorDeclaration>node).decorators, cbNodes, result);
      result = reduceNodes((<qt.GetAccessorDeclaration>node).modifiers, cbNodes, result);
      result = reduceNode((<qt.GetAccessorDeclaration>node).name, cbNode, result);
      result = reduceNodes((<qt.GetAccessorDeclaration>node).parameters, cbNodes, result);
      result = reduceNode((<qt.GetAccessorDeclaration>node).body, cbNode, result);
      break;

    // Binding patterns
    case qt.SyntaxKind.ObjectBindingPattern:
    case qt.SyntaxKind.ArrayBindingPattern:
      result = reduceNodes((<BindingPattern>node).elements, cbNodes, result);
      break;

    case qt.SyntaxKind.BindingElement:
      result = reduceNode((<BindingElement>node).propertyName, cbNode, result);
      result = reduceNode((<BindingElement>node).name, cbNode, result);
      result = reduceNode((<BindingElement>node).initializer, cbNode, result);
      break;

    // qt.Expression
    case qt.SyntaxKind.ArrayLiteralExpression:
      result = reduceNodes((<ArrayLiteralExpression>node).elements, cbNodes, result);
      break;

    case qt.SyntaxKind.ObjectLiteralExpression:
      result = reduceNodes((<ObjectLiteralExpression>node).properties, cbNodes, result);
      break;

    case qt.SyntaxKind.PropertyAccessExpression:
      result = reduceNode((<PropertyAccessExpression>node).expression, cbNode, result);
      result = reduceNode((<PropertyAccessExpression>node).name, cbNode, result);
      break;

    case qt.SyntaxKind.ElementAccessExpression:
      result = reduceNode((<ElementAccessExpression>node).expression, cbNode, result);
      result = reduceNode((<ElementAccessExpression>node).argumentExpression, cbNode, result);
      break;

    case qt.SyntaxKind.CallExpression:
      result = reduceNode((<CallExpression>node).expression, cbNode, result);
      result = reduceNodes((<CallExpression>node).typeArguments, cbNodes, result);
      result = reduceNodes((<CallExpression>node).arguments, cbNodes, result);
      break;

    case qt.SyntaxKind.NewExpression:
      result = reduceNode((<NewExpression>node).expression, cbNode, result);
      result = reduceNodes((<NewExpression>node).typeArguments, cbNodes, result);
      result = reduceNodes((<NewExpression>node).arguments, cbNodes, result);
      break;

    case qt.SyntaxKind.TaggedTemplateExpression:
      result = reduceNode((<TaggedTemplateExpression>node).tag, cbNode, result);
      result = reduceNodes((<TaggedTemplateExpression>node).typeArguments, cbNodes, result);
      result = reduceNode((<TaggedTemplateExpression>node).template, cbNode, result);
      break;

    case qt.SyntaxKind.TypeAssertionExpression:
      result = reduceNode((<TypeAssertion>node).type, cbNode, result);
      result = reduceNode((<TypeAssertion>node).expression, cbNode, result);
      break;

    case qt.SyntaxKind.FunctionExpression:
      result = reduceNodes((<qt.FunctionExpression>node).modifiers, cbNodes, result);
      result = reduceNode((<qt.FunctionExpression>node).name, cbNode, result);
      result = reduceNodes((<qt.FunctionExpression>node).typeParameters, cbNodes, result);
      result = reduceNodes((<qt.FunctionExpression>node).parameters, cbNodes, result);
      result = reduceNode((<qt.FunctionExpression>node).type, cbNode, result);
      result = reduceNode((<qt.FunctionExpression>node).body, cbNode, result);
      break;

    case qt.SyntaxKind.ArrowFunction:
      result = reduceNodes((<ArrowFunction>node).modifiers, cbNodes, result);
      result = reduceNodes((<ArrowFunction>node).typeParameters, cbNodes, result);
      result = reduceNodes((<ArrowFunction>node).parameters, cbNodes, result);
      result = reduceNode((<ArrowFunction>node).type, cbNode, result);
      result = reduceNode((<ArrowFunction>node).body, cbNode, result);
      break;

    case qt.SyntaxKind.ParenthesizedExpression:
    case qt.SyntaxKind.DeleteExpression:
    case qt.SyntaxKind.TypeOfExpression:
    case qt.SyntaxKind.VoidExpression:
    case qt.SyntaxKind.AwaitExpression:
    case qt.SyntaxKind.YieldExpression:
    case qt.SyntaxKind.SpreadElement:
    case qt.SyntaxKind.NonNullExpression:
      result = reduceNode(node.expression, cbNode, result);
      break;

    case qt.SyntaxKind.PrefixUnaryExpression:
    case qt.SyntaxKind.PostfixUnaryExpression:
      result = reduceNode(node.operand, cbNode, result);
      break;

    case qt.SyntaxKind.BinaryExpression:
      result = reduceNode((<BinaryExpression>node).left, cbNode, result);
      result = reduceNode((<BinaryExpression>node).right, cbNode, result);
      break;

    case qt.SyntaxKind.ConditionalExpression:
      result = reduceNode((<ConditionalExpression>node).condition, cbNode, result);
      result = reduceNode((<ConditionalExpression>node).whenTrue, cbNode, result);
      result = reduceNode((<ConditionalExpression>node).whenFalse, cbNode, result);
      break;

    case qt.SyntaxKind.TemplateExpression:
      result = reduceNode((<TemplateExpression>node).head, cbNode, result);
      result = reduceNodes((<TemplateExpression>node).templateSpans, cbNodes, result);
      break;

    case qt.SyntaxKind.ClassExpression:
      result = reduceNodes((<ClassExpression>node).modifiers, cbNodes, result);
      result = reduceNode((<ClassExpression>node).name, cbNode, result);
      result = reduceNodes((<ClassExpression>node).typeParameters, cbNodes, result);
      result = reduceNodes((<ClassExpression>node).heritageClauses, cbNodes, result);
      result = reduceNodes((<ClassExpression>node).members, cbNodes, result);
      break;

    case qt.SyntaxKind.ExpressionWithTypeArguments:
      result = reduceNode((<ExpressionWithTypeArguments>node).expression, cbNode, result);
      result = reduceNodes((<ExpressionWithTypeArguments>node).typeArguments, cbNodes, result);
      break;

    case qt.SyntaxKind.AsExpression:
      result = reduceNode((<AsExpression>node).expression, cbNode, result);
      result = reduceNode((<AsExpression>node).type, cbNode, result);
      break;

    // Misc
    case qt.SyntaxKind.TemplateSpan:
      result = reduceNode((<TemplateSpan>node).expression, cbNode, result);
      result = reduceNode((<TemplateSpan>node).literal, cbNode, result);
      break;

    // Element
    case qt.SyntaxKind.Block:
      result = reduceNodes((<Block>node).statements, cbNodes, result);
      break;

    case qt.SyntaxKind.VariableStatement:
      result = reduceNodes((<VariableStatement>node).modifiers, cbNodes, result);
      result = reduceNode((<VariableStatement>node).declarationList, cbNode, result);
      break;

    case qt.SyntaxKind.ExpressionStatement:
      result = reduceNode((<ExpressionStatement>node).expression, cbNode, result);
      break;

    case qt.SyntaxKind.IfStatement:
      result = reduceNode((<IfStatement>node).expression, cbNode, result);
      result = reduceNode((<IfStatement>node).thenStatement, cbNode, result);
      result = reduceNode((<IfStatement>node).elseStatement, cbNode, result);
      break;

    case qt.SyntaxKind.DoStatement:
      result = reduceNode((<DoStatement>node).statement, cbNode, result);
      result = reduceNode((<DoStatement>node).expression, cbNode, result);
      break;

    case qt.SyntaxKind.WhileStatement:
    case qt.SyntaxKind.WithStatement:
      result = reduceNode(node.expression, cbNode, result);
      result = reduceNode(node.statement, cbNode, result);
      break;

    case qt.SyntaxKind.ForStatement:
      result = reduceNode((<ForStatement>node).initializer, cbNode, result);
      result = reduceNode((<ForStatement>node).condition, cbNode, result);
      result = reduceNode((<ForStatement>node).incrementor, cbNode, result);
      result = reduceNode((<ForStatement>node).statement, cbNode, result);
      break;

    case qt.SyntaxKind.ForInStatement:
    case qt.SyntaxKind.ForOfStatement:
      result = reduceNode((<ForInOrOfStatement>node).initializer, cbNode, result);
      result = reduceNode((<ForInOrOfStatement>node).expression, cbNode, result);
      result = reduceNode((<ForInOrOfStatement>node).statement, cbNode, result);
      break;

    case qt.SyntaxKind.ReturnStatement:
    case qt.SyntaxKind.ThrowStatement:
      result = reduceNode((<ReturnStatement>node).expression, cbNode, result);
      break;

    case qt.SyntaxKind.SwitchStatement:
      result = reduceNode((<SwitchStatement>node).expression, cbNode, result);
      result = reduceNode((<SwitchStatement>node).caseBlock, cbNode, result);
      break;

    case qt.SyntaxKind.LabeledStatement:
      result = reduceNode((<LabeledStatement>node).label, cbNode, result);
      result = reduceNode((<LabeledStatement>node).statement, cbNode, result);
      break;

    case qt.SyntaxKind.TryStatement:
      result = reduceNode((<TryStatement>node).tryBlock, cbNode, result);
      result = reduceNode((<TryStatement>node).catchClause, cbNode, result);
      result = reduceNode((<TryStatement>node).finallyBlock, cbNode, result);
      break;

    case qt.SyntaxKind.VariableDeclaration:
      result = reduceNode((<VariableDeclaration>node).name, cbNode, result);
      result = reduceNode((<VariableDeclaration>node).type, cbNode, result);
      result = reduceNode((<VariableDeclaration>node).initializer, cbNode, result);
      break;

    case qt.SyntaxKind.VariableDeclarationList:
      result = reduceNodes((<VariableDeclarationList>node).declarations, cbNodes, result);
      break;

    case qt.SyntaxKind.FunctionDeclaration:
      result = reduceNodes((<qt.FunctionDeclaration>node).decorators, cbNodes, result);
      result = reduceNodes((<qt.FunctionDeclaration>node).modifiers, cbNodes, result);
      result = reduceNode((<qt.FunctionDeclaration>node).name, cbNode, result);
      result = reduceNodes((<qt.FunctionDeclaration>node).typeParameters, cbNodes, result);
      result = reduceNodes((<qt.FunctionDeclaration>node).parameters, cbNodes, result);
      result = reduceNode((<qt.FunctionDeclaration>node).type, cbNode, result);
      result = reduceNode((<qt.FunctionDeclaration>node).body, cbNode, result);
      break;

    case qt.SyntaxKind.ClassDeclaration:
      result = reduceNodes((<ClassDeclaration>node).decorators, cbNodes, result);
      result = reduceNodes((<ClassDeclaration>node).modifiers, cbNodes, result);
      result = reduceNode((<ClassDeclaration>node).name, cbNode, result);
      result = reduceNodes((<ClassDeclaration>node).typeParameters, cbNodes, result);
      result = reduceNodes((<ClassDeclaration>node).heritageClauses, cbNodes, result);
      result = reduceNodes((<ClassDeclaration>node).members, cbNodes, result);
      break;

    case qt.SyntaxKind.EnumDeclaration:
      result = reduceNodes((<EnumDeclaration>node).decorators, cbNodes, result);
      result = reduceNodes((<EnumDeclaration>node).modifiers, cbNodes, result);
      result = reduceNode((<EnumDeclaration>node).name, cbNode, result);
      result = reduceNodes((<EnumDeclaration>node).members, cbNodes, result);
      break;

    case qt.SyntaxKind.ModuleDeclaration:
      result = reduceNodes((<ModuleDeclaration>node).decorators, cbNodes, result);
      result = reduceNodes((<ModuleDeclaration>node).modifiers, cbNodes, result);
      result = reduceNode((<ModuleDeclaration>node).name, cbNode, result);
      result = reduceNode((<ModuleDeclaration>node).body, cbNode, result);
      break;

    case qt.SyntaxKind.ModuleBlock:
      result = reduceNodes((<ModuleBlock>node).statements, cbNodes, result);
      break;

    case qt.SyntaxKind.CaseBlock:
      result = reduceNodes((<CaseBlock>node).clauses, cbNodes, result);
      break;

    case qt.SyntaxKind.ImportEqualsDeclaration:
      result = reduceNodes((<ImportEqualsDeclaration>node).decorators, cbNodes, result);
      result = reduceNodes((<ImportEqualsDeclaration>node).modifiers, cbNodes, result);
      result = reduceNode((<ImportEqualsDeclaration>node).name, cbNode, result);
      result = reduceNode((<ImportEqualsDeclaration>node).moduleReference, cbNode, result);
      break;

    case qt.SyntaxKind.ImportDeclaration:
      result = reduceNodes((<ImportDeclaration>node).decorators, cbNodes, result);
      result = reduceNodes((<ImportDeclaration>node).modifiers, cbNodes, result);
      result = reduceNode((<ImportDeclaration>node).importClause, cbNode, result);
      result = reduceNode((<ImportDeclaration>node).moduleSpecifier, cbNode, result);
      break;

    case qt.SyntaxKind.ImportClause:
      result = reduceNode((<ImportClause>node).name, cbNode, result);
      result = reduceNode((<ImportClause>node).namedBindings, cbNode, result);
      break;

    case qt.SyntaxKind.NamespaceImport:
      result = reduceNode((<NamespaceImport>node).name, cbNode, result);
      break;

    case qt.SyntaxKind.NamespaceExport:
      result = reduceNode((<NamespaceExport>node).name, cbNode, result);
      break;

    case qt.SyntaxKind.NamedImports:
    case qt.SyntaxKind.NamedExports:
      result = reduceNodes(node.elements, cbNodes, result);
      break;

    case qt.SyntaxKind.ImportSpecifier:
    case qt.SyntaxKind.ExportSpecifier:
      result = reduceNode(node.propertyName, cbNode, result);
      result = reduceNode(node.name, cbNode, result);
      break;

    case qt.SyntaxKind.ExportAssignment:
      result = reduceLeft((<ExportAssignment>node).decorators, cbNode, result);
      result = reduceLeft((<ExportAssignment>node).modifiers, cbNode, result);
      result = reduceNode((<ExportAssignment>node).expression, cbNode, result);
      break;

    case qt.SyntaxKind.ExportDeclaration:
      result = reduceLeft((<ExportDeclaration>node).decorators, cbNode, result);
      result = reduceLeft((<ExportDeclaration>node).modifiers, cbNode, result);
      result = reduceNode((<ExportDeclaration>node).exportClause, cbNode, result);
      result = reduceNode((<ExportDeclaration>node).moduleSpecifier, cbNode, result);
      break;

    // Module references
    case qt.SyntaxKind.ExternalModuleReference:
      result = reduceNode((<ExternalModuleReference>node).expression, cbNode, result);
      break;

    // JSX
    case qt.SyntaxKind.JsxElement:
      result = reduceNode((<JsxElement>node).openingElement, cbNode, result);
      result = reduceLeft((<JsxElement>node).children, cbNode, result);
      result = reduceNode((<JsxElement>node).closingElement, cbNode, result);
      break;

    case qt.SyntaxKind.JsxFragment:
      result = reduceNode((<JsxFragment>node).openingFragment, cbNode, result);
      result = reduceLeft((<JsxFragment>node).children, cbNode, result);
      result = reduceNode((<JsxFragment>node).closingFragment, cbNode, result);
      break;

    case qt.SyntaxKind.JsxSelfClosingElement:
    case qt.SyntaxKind.JsxOpeningElement:
      result = reduceNode(node.tagName, cbNode, result);
      result = reduceNodes(node.typeArguments, cbNode, result);
      result = reduceNode(node.attributes, cbNode, result);
      break;

    case qt.SyntaxKind.JsxAttributes:
      result = reduceNodes((<JsxAttributes>node).properties, cbNodes, result);
      break;

    case qt.SyntaxKind.JsxClosingElement:
      result = reduceNode((<JsxClosingElement>node).tagName, cbNode, result);
      break;

    case qt.SyntaxKind.JsxAttribute:
      result = reduceNode((<JsxAttribute>node).name, cbNode, result);
      result = reduceNode((<JsxAttribute>node).initializer, cbNode, result);
      break;

    case qt.SyntaxKind.JsxSpreadAttribute:
      result = reduceNode((<JsxSpreadAttribute>node).expression, cbNode, result);
      break;

    case qt.SyntaxKind.JsxExpression:
      result = reduceNode((<JsxExpression>node).expression, cbNode, result);
      break;

    // Clauses
    case qt.SyntaxKind.CaseClause:
      result = reduceNode((<CaseClause>node).expression, cbNode, result);
    // falls through

    case qt.SyntaxKind.DefaultClause:
      result = reduceNodes(node.statements, cbNodes, result);
      break;

    case qt.SyntaxKind.HeritageClause:
      result = reduceNodes((<HeritageClause>node).types, cbNodes, result);
      break;

    case qt.SyntaxKind.CatchClause:
      result = reduceNode((<CatchClause>node).variableDeclaration, cbNode, result);
      result = reduceNode((<CatchClause>node).block, cbNode, result);
      break;

    // Property assignments
    case qt.SyntaxKind.PropertyAssignment:
      result = reduceNode((<PropertyAssignment>node).name, cbNode, result);
      result = reduceNode((<PropertyAssignment>node).initializer, cbNode, result);
      break;

    case qt.SyntaxKind.ShorthandPropertyAssignment:
      result = reduceNode((<ShorthandPropertyAssignment>node).name, cbNode, result);
      result = reduceNode((<ShorthandPropertyAssignment>node).objectAssignmentInitializer, cbNode, result);
      break;

    case qt.SyntaxKind.SpreadAssignment:
      result = reduceNode((<SpreadAssignment>node).expression, cbNode, result);
      break;

    // Enum
    case qt.SyntaxKind.EnumMember:
      result = reduceNode((<EnumMember>node).name, cbNode, result);
      result = reduceNode((<EnumMember>node).initializer, cbNode, result);
      break;

    // Top-level nodes
    case qt.SyntaxKind.SourceFile:
      result = reduceNodes((<SourceFile>node).statements, cbNodes, result);
      break;

    // Transformation nodes
    case qt.SyntaxKind.PartiallyEmittedExpression:
      result = reduceNode((<PartiallyEmittedExpression>node).expression, cbNode, result);
      break;

    case qt.SyntaxKind.CommaListExpression:
      result = reduceNodes((<CommaListExpression>node).elements, cbNodes, result);
      break;

    default:
      break;
  }

  return result;
}

function findSpanEnd<T>(array: readonly T[], test: (value: T) => boolean, start: number) {
  let i = start;
  while (i < array.length && test(array[i])) {
    i++;
  }
  return i;
}

/**
 * Merges generated lexical declarations into a new statement list.
 */
export function mergeLexicalEnvironment(statements: qt.NodeArray<Statement>, declarations: readonly qt.Statement[] | undefined): qt.NodeArray<Statement>;
/**
 * Appends generated lexical declarations to an array of statements.
 */
export function mergeLexicalEnvironment(statements: qt.Statement[], declarations: readonly qt.Statement[] | undefined): qt.Statement[];
export function mergeLexicalEnvironment(statements: qt.Statement[] | qt.NodeArray<Statement>, declarations: readonly qt.Statement[] | undefined) {
  if (!some(declarations)) {
    return statements;
  }

  // When we merge new lexical statements into an existing statement list, we merge them in the following manner:
  //
  // Given:
  //
  // | Left                               | Right                               |
  // |------------------------------------|-------------------------------------|
  // | [standard prologues (left)]        | [standard prologues (right)]        |
  // | [hoisted functions (left)]         | [hoisted functions (right)]         |
  // | [hoisted variables (left)]         | [hoisted variables (right)]         |
  // | [lexical init statements (left)]   | [lexical init statements (right)]   |
  // | [other statements (left)]          |                                     |
  //
  // The resulting statement list will be:
  //
  // | Result                              |
  // |-------------------------------------|
  // | [standard prologues (right)]        |
  // | [standard prologues (left)]         |
  // | [hoisted functions (right)]         |
  // | [hoisted functions (left)]          |
  // | [hoisted variables (right)]         |
  // | [hoisted variables (left)]          |
  // | [lexical init statements (right)]   |
  // | [lexical init statements (left)]    |
  // | [other statements (left)]           |
  //
  // NOTE: It is expected that new lexical init statements must be evaluated before existing lexical init statements,
  // as the prior transformation may depend on the evaluation of the lexical init statements to be in the correct state.

  // find standard prologues on left in the following order: standard directives, hoisted functions, hoisted variables, other custom
  const leftStandardPrologueEnd = findSpanEnd(statements, isPrologueDirective, 0);
  const leftHoistedFunctionsEnd = findSpanEnd(statements, isHoistedFunction, leftStandardPrologueEnd);
  const leftHoistedVariablesEnd = findSpanEnd(statements, isHoistedVariableStatement, leftHoistedFunctionsEnd);

  // find standard prologues on right in the following order: standard directives, hoisted functions, hoisted variables, other custom
  const rightStandardPrologueEnd = findSpanEnd(declarations, isPrologueDirective, 0);
  const rightHoistedFunctionsEnd = findSpanEnd(declarations, isHoistedFunction, rightStandardPrologueEnd);
  const rightHoistedVariablesEnd = findSpanEnd(declarations, isHoistedVariableStatement, rightHoistedFunctionsEnd);
  const rightCustomPrologueEnd = findSpanEnd(declarations, isCustomPrologue, rightHoistedVariablesEnd);
  Debug.assert(rightCustomPrologueEnd === declarations.length, 'Expected declarations to be valid standard or custom prologues');

  // splice prologues from the right into the left. We do this in reverse order
  // so that we don't need to recompute the index on the left when we insert items.
  const left = isNodeArray(statements) ? statements.slice() : statements;

  // splice other custom prologues from right into left
  if (rightCustomPrologueEnd > rightHoistedVariablesEnd) {
    left.splice(leftHoistedVariablesEnd, 0, ...declarations.slice(rightHoistedVariablesEnd, rightCustomPrologueEnd));
  }

  // splice hoisted variables from right into left
  if (rightHoistedVariablesEnd > rightHoistedFunctionsEnd) {
    left.splice(leftHoistedFunctionsEnd, 0, ...declarations.slice(rightHoistedFunctionsEnd, rightHoistedVariablesEnd));
  }

  // splice hoisted functions from right into left
  if (rightHoistedFunctionsEnd > rightStandardPrologueEnd) {
    left.splice(leftStandardPrologueEnd, 0, ...declarations.slice(rightStandardPrologueEnd, rightHoistedFunctionsEnd));
  }

  // splice standard prologues from right into left (that are not already in left)
  if (rightStandardPrologueEnd > 0) {
    if (leftStandardPrologueEnd === 0) {
      left.splice(0, 0, ...declarations.slice(0, rightStandardPrologueEnd));
    } else {
      const leftPrologues = qc.createMap<boolean>();
      for (let i = 0; i < leftStandardPrologueEnd; i++) {
        const leftPrologue = statements[i] as PrologueDirective;
        leftPrologues.set(leftPrologue.expression.text, true);
      }
      for (let i = rightStandardPrologueEnd - 1; i >= 0; i--) {
        const rightPrologue = declarations[i];
        if (!leftPrologues.has(rightPrologue.expression.text)) {
          left.unshift(rightPrologue);
        }
      }
    }
  }

  if (isNodeArray(statements)) {
    return setTextRange(createNodeArray(left, statements.hasTrailingComma), statements);
  }

  return statements;
}

/**
 * Lifts a NodeArray containing only qt.Statement nodes to a block.
 *
 * @param nodes The NodeArray.
 */
export function liftToBlock(nodes: readonly Node[]): qt.Statement {
  Debug.assert(every(nodes, isStatement), 'Cannot lift nodes to a Block.');
  return singleOrUndefined(nodes) || createBlock(<NodeArray<Statement>>nodes);
}

/**
 * Aggregates the TransformFlags for a Node and its subtree.
 */
export function aggregateTransformFlags<T extends Node>(node: T): T {
  aggregateTransformFlagsForNode(node);
  return node;
}

/**
 * Aggregates the TransformFlags for a Node and its subtree. The flags for the subtree are
 * computed first, then the transform flags for the current node are computed from the subtree
 * flags and the state of the current node. Finally, the transform flags of the node are
 * returned, excluding any flags that should not be included in its parent node's subtree
 * flags.
 */
function aggregateTransformFlagsForNode(node: qt.Node): TransformFlags {
  if (node === undefined) {
    return TransformFlags.None;
  }
  if (node.transformFlags & TransformFlags.HasComputedFlags) {
    return node.transformFlags & ~getTransformFlagsSubtreeExclusions(node.kind);
  }
  const subtreeFlags = aggregateTransformFlagsForSubtree(node);
  return computeTransformFlagsForNode(node, subtreeFlags);
}

function aggregateTransformFlagsForNodeArray(nodes: qt.NodeArray<Node>): TransformFlags {
  if (nodes === undefined) {
    return TransformFlags.None;
  }
  let subtreeFlags = TransformFlags.None;
  let nodeArrayFlags = TransformFlags.None;
  for (const node of nodes) {
    subtreeFlags |= aggregateTransformFlagsForNode(node);
    nodeArrayFlags |= node.transformFlags & ~TransformFlags.HasComputedFlags;
  }
  nodes.transformFlags = nodeArrayFlags | TransformFlags.HasComputedFlags;
  return subtreeFlags;
}

/**
 * Aggregates the transform flags for the subtree of a node.
 */
function aggregateTransformFlagsForSubtree(node: qt.Node): TransformFlags {
  // We do not transform ambient declarations or types, so there is no need to
  // recursively aggregate transform flags.
  if (hasSyntacticModifier(node, qt.ModifierFlags.Ambient) || (isTypeNode(node) && node.kind !== qt.SyntaxKind.ExpressionWithTypeArguments)) {
    return TransformFlags.None;
  }

  // Aggregate the transform flags of each child.
  return reduceEachChild(node, TransformFlags.None, aggregateTransformFlagsForChildNode, aggregateTransformFlagsForChildNodes);
}

/**
 * Aggregates the TransformFlags of a child node with the TransformFlags of its
 * siblings.
 */
function aggregateTransformFlagsForChildNode(transformFlags: TransformFlags, node: qt.Node): TransformFlags {
  return transformFlags | aggregateTransformFlagsForNode(node);
}

function aggregateTransformFlagsForChildNodes(transformFlags: TransformFlags, nodes: qt.NodeArray<Node>): TransformFlags {
  return transformFlags | aggregateTransformFlagsForNodeArray(nodes);
}
