/* eslint-disable no-inner-declarations */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import * as qpc from './corePublic';
import * as qc from './core';

import * as qt from './types';
import { Debug } from './debug';

const enum SignatureFlags {
  None = 0,
  Yield = 1 << 0,
  Await = 1 << 1,
  Type = 1 << 2,
  IgnoreMissingOpenBrace = 1 << 4,
  JSDoc = 1 << 5,
}

let NodeConstructor: new (kind: qt.SyntaxKind, pos?: number, end?: number) => qt.Node;
let TokenConstructor: new (kind: qt.SyntaxKind, pos?: number, end?: number) => qt.Node;
let IdentifierConstructor: new (kind: qt.SyntaxKind, pos?: number, end?: number) => qt.Node;
let PrivateIdentifierConstructor: new (kind: qt.SyntaxKind, pos?: number, end?: number) => qt.Node;
let SourceFileConstructor: new (kind: qt.SyntaxKind, pos?: number, end?: number) => qt.Node;

export function createNode(kind: qt.SyntaxKind, pos?: number, end?: number): qt.Node {
  if (kind === qt.SyntaxKind.SourceFile) {
    return new (SourceFileConstructor || (SourceFileConstructor = objectAllocator.getSourceFileConstructor()))(kind, pos, end);
  } else if (kind === qt.SyntaxKind.Identifier) {
    return new (IdentifierConstructor || (IdentifierConstructor = objectAllocator.getIdentifierConstructor()))(kind, pos, end);
  } else if (kind === qt.SyntaxKind.PrivateIdentifier) {
    return new (PrivateIdentifierConstructor || (PrivateIdentifierConstructor = objectAllocator.getPrivateIdentifierConstructor()))(kind, pos, end);
  } else if (!isNodeKind(kind)) {
    return new (TokenConstructor || (TokenConstructor = objectAllocator.getTokenConstructor()))(kind, pos, end);
  } else {
    return new (NodeConstructor || (NodeConstructor = objectAllocator.getNodeConstructor()))(kind, pos, end);
  }
}

function visitNode<T>(cbNode: (node: qt.Node) => T, node: qt.Node | undefined): T | undefined {
  return node && cbNode(node);
}

function visitNodes<T>(cbNode: (node: qt.Node) => T, cbNodes: ((node: qt.NodeArray<qt.Node>) => T | undefined) | undefined, nodes: qt.NodeArray<qt.Node> | undefined): T | undefined {
  if (nodes) {
    if (cbNodes) {
      return cbNodes(nodes);
    }
    for (const node of nodes) {
      const result = cbNode(node);
      if (result) {
        return result;
      }
    }
  }
}

export function isJSDocLikeText(text: string, start: number) {
  return text.charCodeAt(start + 1) === qt.CharacterCodes.asterisk && text.charCodeAt(start + 2) === qt.CharacterCodes.asterisk && text.charCodeAt(start + 3) !== qt.CharacterCodes.slash;
}

/**
 * Invokes a callback for each child of the given node. The 'cbNode' callback is invoked for all child nodes
 * stored in properties. If a 'cbNodes' callback is specified, it is invoked for embedded arrays; otherwise,
 * embedded arrays are flattened and the 'cbNode' callback is invoked for each element. If a callback returns
 * a truthy value, iteration stops and that value is returned. Otherwise, undefined is returned.
 *
 * @param node a given node to visit its children
 * @param cbNode a callback to be invoked for all child nodes
 * @param cbNodes a callback to be invoked for embedded array
 *
 * @remarks `forEachChild` must visit the children of a node in the order
 * that they appear in the source code. The language service depends on this property to locate nodes by position.
 */
export function forEachChild<T>(node: qt.Node, cbNode: (_: qt.Node) => T | undefined, cbNodes?: (_: qt.NodeArray<qt.Node>) => T | undefined): T | undefined {
  if (!node || node.kind <= qt.SyntaxKind.LastToken) {
    return;
  }
  switch (node.kind) {
    case qt.SyntaxKind.QualifiedName:
      return visitNode(cbNode, node.left) || visitNode(cbNode, node.right);
    case qt.SyntaxKind.TypeParameter:
      return visitNode(cbNode, node.name) || visitNode(cbNode, node.constraint) || visitNode(cbNode, node.default) || visitNode(cbNode, node.expression);
    case qt.SyntaxKind.ShorthandPropertyAssignment:
      return visitNodes(cbNode, cbNodes, node.decorators) || visitNodes(cbNode, cbNodes, node.modifiers) || visitNode(cbNode, node.name) || visitNode(cbNode, node.questionToken) || visitNode(cbNode, node.exclamationToken) || visitNode(cbNode, node.equalsToken) || visitNode(cbNode, node.objectAssignmentInitializer);
    case qt.SyntaxKind.SpreadAssignment:
      return visitNode(cbNode, node.expression);
    case qt.SyntaxKind.Parameter:
      return visitNodes(cbNode, cbNodes, node.decorators) || visitNodes(cbNode, cbNodes, node.modifiers) || visitNode(cbNode, node.dotDotDotToken) || visitNode(cbNode, node.name) || visitNode(cbNode, node.questionToken) || visitNode(cbNode, node.type) || visitNode(cbNode, node.initializer);
    case qt.SyntaxKind.PropertyDeclaration:
      return visitNodes(cbNode, cbNodes, node.decorators) || visitNodes(cbNode, cbNodes, node.modifiers) || visitNode(cbNode, node.name) || visitNode(cbNode, node.questionToken) || visitNode(cbNode, node.exclamationToken) || visitNode(cbNode, node.type) || visitNode(cbNode, node.initializer);
    case qt.SyntaxKind.PropertySignature:
      return visitNodes(cbNode, cbNodes, node.decorators) || visitNodes(cbNode, cbNodes, node.modifiers) || visitNode(cbNode, node.name) || visitNode(cbNode, node.questionToken) || visitNode(cbNode, node.type) || visitNode(cbNode, node.initializer);
    case qt.SyntaxKind.PropertyAssignment:
      return visitNodes(cbNode, cbNodes, node.decorators) || visitNodes(cbNode, cbNodes, node.modifiers) || visitNode(cbNode, node.name) || visitNode(cbNode, node.questionToken) || visitNode(cbNode, node.initializer);
    case qt.SyntaxKind.VariableDeclaration:
      return visitNodes(cbNode, cbNodes, node.decorators) || visitNodes(cbNode, cbNodes, node.modifiers) || visitNode(cbNode, node.name) || visitNode(cbNode, node.exclamationToken) || visitNode(cbNode, node.type) || visitNode(cbNode, node.initializer);
    case qt.SyntaxKind.BindingElement:
      return visitNodes(cbNode, cbNodes, node.decorators) || visitNodes(cbNode, cbNodes, node.modifiers) || visitNode(cbNode, node.dotDotDotToken) || visitNode(cbNode, node.propertyName) || visitNode(cbNode, node.name) || visitNode(cbNode, node.initializer);
    case qt.SyntaxKind.FunctionType:
    case qt.SyntaxKind.ConstructorType:
    case qt.SyntaxKind.CallSignature:
    case qt.SyntaxKind.ConstructSignature:
    case qt.SyntaxKind.IndexSignature:
      return visitNodes(cbNode, cbNodes, node.decorators) || visitNodes(cbNode, cbNodes, node.modifiers) || visitNodes(cbNode, cbNodes, node.typeParameters) || visitNodes(cbNode, cbNodes, node.parameters) || visitNode(cbNode, node.type);
    case qt.SyntaxKind.MethodDeclaration:
    case qt.SyntaxKind.MethodSignature:
    case qt.SyntaxKind.Constructor:
    case qt.SyntaxKind.GetAccessor:
    case qt.SyntaxKind.SetAccessor:
    case qt.SyntaxKind.FunctionExpression:
    case qt.SyntaxKind.FunctionDeclaration:
    case qt.SyntaxKind.ArrowFunction:
      return visitNodes(cbNode, cbNodes, node.decorators) || visitNodes(cbNode, cbNodes, node.modifiers) || visitNode(cbNode, node.asteriskToken) || visitNode(cbNode, node.name) || visitNode(cbNode, node.questionToken) || visitNode(cbNode, node.exclamationToken) || visitNodes(cbNode, cbNodes, node.typeParameters) || visitNodes(cbNode, cbNodes, node.parameters) || visitNode(cbNode, node.type) || visitNode(cbNode, node.equalsGreaterThanToken) || visitNode(cbNode, node.body);
    case qt.SyntaxKind.TypeReference:
      return visitNode(cbNode, node.typeName) || visitNodes(cbNode, cbNodes, node.typeArguments);
    case qt.SyntaxKind.TypePredicate:
      return visitNode(cbNode, node.assertsModifier) || visitNode(cbNode, node.parameterName) || visitNode(cbNode, node.type);
    case qt.SyntaxKind.TypeQuery:
      return visitNode(cbNode, node.exprName);
    case qt.SyntaxKind.TypeLiteral:
      return visitNodes(cbNode, cbNodes, node.members);
    case qt.SyntaxKind.ArrayType:
      return visitNode(cbNode, node.elementType);
    case qt.SyntaxKind.TupleType:
      return visitNodes(cbNode, cbNodes, node.elements);
    case qt.SyntaxKind.UnionType:
    case qt.SyntaxKind.IntersectionType:
      return visitNodes(cbNode, cbNodes, node.types);
    case qt.SyntaxKind.ConditionalType:
      return visitNode(cbNode, node.checkType) || visitNode(cbNode, node.extendsType) || visitNode(cbNode, node.trueType) || visitNode(cbNode, node.falseType);
    case qt.SyntaxKind.InferType:
      return visitNode(cbNode, node.typeParameter);
    case qt.SyntaxKind.ImportType:
      return visitNode(cbNode, node.argument) || visitNode(cbNode, node.qualifier) || visitNodes(cbNode, cbNodes, node.typeArguments);
    case qt.SyntaxKind.ParenthesizedType:
    case qt.SyntaxKind.TypeOperator:
      return visitNode(cbNode, (<ParenthesizedTypeNode | TypeOperatorNode>node).type);
    case qt.SyntaxKind.IndexedAccessType:
      return visitNode(cbNode, node.objectType) || visitNode(cbNode, node.indexType);
    case qt.SyntaxKind.MappedType:
      return visitNode(cbNode, node.readonlyToken) || visitNode(cbNode, node.typeParameter) || visitNode(cbNode, node.questionToken) || visitNode(cbNode, node.type);
    case qt.SyntaxKind.LiteralType:
      return visitNode(cbNode, node.literal);
    case qt.SyntaxKind.NamedTupleMember:
      return visitNode(cbNode, node.dotDotDotToken) || visitNode(cbNode, node.name) || visitNode(cbNode, node.questionToken) || visitNode(cbNode, node.type);
    case qt.SyntaxKind.ObjectBindingPattern:
    case qt.SyntaxKind.ArrayBindingPattern:
      return visitNodes(cbNode, cbNodes, node.elements);
    case qt.SyntaxKind.ArrayLiteralExpression:
      return visitNodes(cbNode, cbNodes, node.elements);
    case qt.SyntaxKind.ObjectLiteralExpression:
      return visitNodes(cbNode, cbNodes, node.properties);
    case qt.SyntaxKind.PropertyAccessExpression:
      return visitNode(cbNode, node.expression) || visitNode(cbNode, node.questionDotToken) || visitNode(cbNode, node.name);
    case qt.SyntaxKind.ElementAccessExpression:
      return visitNode(cbNode, node.expression) || visitNode(cbNode, node.questionDotToken) || visitNode(cbNode, node.argumentExpression);
    case qt.SyntaxKind.CallExpression:
    case qt.SyntaxKind.NewExpression:
      return visitNode(cbNode, node.expression) || visitNode(cbNode, node.questionDotToken) || visitNodes(cbNode, cbNodes, node.typeArguments) || visitNodes(cbNode, cbNodes, node.arguments);
    case qt.SyntaxKind.TaggedTemplateExpression:
      return visitNode(cbNode, node.tag) || visitNode(cbNode, node.questionDotToken) || visitNodes(cbNode, cbNodes, node.typeArguments) || visitNode(cbNode, node.template);
    case qt.SyntaxKind.TypeAssertionExpression:
      return visitNode(cbNode, node.type) || visitNode(cbNode, node.expression);
    case qt.SyntaxKind.ParenthesizedExpression:
      return visitNode(cbNode, node.expression);
    case qt.SyntaxKind.DeleteExpression:
      return visitNode(cbNode, node.expression);
    case qt.SyntaxKind.TypeOfExpression:
      return visitNode(cbNode, node.expression);
    case qt.SyntaxKind.VoidExpression:
      return visitNode(cbNode, node.expression);
    case qt.SyntaxKind.PrefixUnaryExpression:
      return visitNode(cbNode, node.operand);
    case qt.SyntaxKind.YieldExpression:
      return visitNode(cbNode, node.asteriskToken) || visitNode(cbNode, node.expression);
    case qt.SyntaxKind.AwaitExpression:
      return visitNode(cbNode, node.expression);
    case qt.SyntaxKind.PostfixUnaryExpression:
      return visitNode(cbNode, node.operand);
    case qt.SyntaxKind.BinaryExpression:
      return visitNode(cbNode, node.left) || visitNode(cbNode, node.operatorToken) || visitNode(cbNode, node.right);
    case qt.SyntaxKind.AsExpression:
      return visitNode(cbNode, node.expression) || visitNode(cbNode, node.type);
    case qt.SyntaxKind.NonNullExpression:
      return visitNode(cbNode, node.expression);
    case qt.SyntaxKind.MetaProperty:
      return visitNode(cbNode, node.name);
    case qt.SyntaxKind.ConditionalExpression:
      return visitNode(cbNode, node.condition) || visitNode(cbNode, node.questionToken) || visitNode(cbNode, node.whenTrue) || visitNode(cbNode, node.colonToken) || visitNode(cbNode, node.whenFalse);
    case qt.SyntaxKind.SpreadElement:
      return visitNode(cbNode, node.expression);
    case qt.SyntaxKind.Block:
    case qt.SyntaxKind.ModuleBlock:
      return visitNodes(cbNode, cbNodes, node.statements);
    case qt.SyntaxKind.SourceFile:
      return visitNodes(cbNode, cbNodes, node.statements) || visitNode(cbNode, node.endOfFileToken);
    case qt.SyntaxKind.VariableStatement:
      return visitNodes(cbNode, cbNodes, node.decorators) || visitNodes(cbNode, cbNodes, node.modifiers) || visitNode(cbNode, node.declarationList);
    case qt.SyntaxKind.VariableDeclarationList:
      return visitNodes(cbNode, cbNodes, node.declarations);
    case qt.SyntaxKind.ExpressionStatement:
      return visitNode(cbNode, node.expression);
    case qt.SyntaxKind.IfStatement:
      return visitNode(cbNode, node.expression) || visitNode(cbNode, node.thenStatement) || visitNode(cbNode, node.elseStatement);
    case qt.SyntaxKind.DoStatement:
      return visitNode(cbNode, node.statement) || visitNode(cbNode, node.expression);
    case qt.SyntaxKind.WhileStatement:
      return visitNode(cbNode, node.expression) || visitNode(cbNode, node.statement);
    case qt.SyntaxKind.ForStatement:
      return visitNode(cbNode, node.initializer) || visitNode(cbNode, node.condition) || visitNode(cbNode, node.incrementor) || visitNode(cbNode, node.statement);
    case qt.SyntaxKind.ForInStatement:
      return visitNode(cbNode, node.initializer) || visitNode(cbNode, node.expression) || visitNode(cbNode, node.statement);
    case qt.SyntaxKind.ForOfStatement:
      return visitNode(cbNode, node.awaitModifier) || visitNode(cbNode, node.initializer) || visitNode(cbNode, node.expression) || visitNode(cbNode, node.statement);
    case qt.SyntaxKind.ContinueStatement:
    case qt.SyntaxKind.BreakStatement:
      return visitNode(cbNode, node.label);
    case qt.SyntaxKind.ReturnStatement:
      return visitNode(cbNode, node.expression);
    case qt.SyntaxKind.WithStatement:
      return visitNode(cbNode, node.expression) || visitNode(cbNode, node.statement);
    case qt.SyntaxKind.SwitchStatement:
      return visitNode(cbNode, node.expression) || visitNode(cbNode, node.caseBlock);
    case qt.SyntaxKind.CaseBlock:
      return visitNodes(cbNode, cbNodes, node.clauses);
    case qt.SyntaxKind.CaseClause:
      return visitNode(cbNode, node.expression) || visitNodes(cbNode, cbNodes, node.statements);
    case qt.SyntaxKind.DefaultClause:
      return visitNodes(cbNode, cbNodes, node.statements);
    case qt.SyntaxKind.LabeledStatement:
      return visitNode(cbNode, node.label) || visitNode(cbNode, node.statement);
    case qt.SyntaxKind.ThrowStatement:
      return visitNode(cbNode, node.expression);
    case qt.SyntaxKind.TryStatement:
      return visitNode(cbNode, node.tryBlock) || visitNode(cbNode, node.catchClause) || visitNode(cbNode, node.finallyBlock);
    case qt.SyntaxKind.CatchClause:
      return visitNode(cbNode, node.variableDeclaration) || visitNode(cbNode, node.block);
    case qt.SyntaxKind.Decorator:
      return visitNode(cbNode, node.expression);
    case qt.SyntaxKind.ClassDeclaration:
    case qt.SyntaxKind.ClassExpression:
      return visitNodes(cbNode, cbNodes, node.decorators) || visitNodes(cbNode, cbNodes, node.modifiers) || visitNode(cbNode, node.name) || visitNodes(cbNode, cbNodes, node.typeParameters) || visitNodes(cbNode, cbNodes, node.heritageClauses) || visitNodes(cbNode, cbNodes, node.members);
    case qt.SyntaxKind.InterfaceDeclaration:
      return visitNodes(cbNode, cbNodes, node.decorators) || visitNodes(cbNode, cbNodes, node.modifiers) || visitNode(cbNode, node.name) || visitNodes(cbNode, cbNodes, node.typeParameters) || visitNodes(cbNode, cbNodes, node.heritageClauses) || visitNodes(cbNode, cbNodes, node.members);
    case qt.SyntaxKind.TypeAliasDeclaration:
      return visitNodes(cbNode, cbNodes, node.decorators) || visitNodes(cbNode, cbNodes, node.modifiers) || visitNode(cbNode, node.name) || visitNodes(cbNode, cbNodes, node.typeParameters) || visitNode(cbNode, node.type);
    case qt.SyntaxKind.EnumDeclaration:
      return visitNodes(cbNode, cbNodes, node.decorators) || visitNodes(cbNode, cbNodes, node.modifiers) || visitNode(cbNode, node.name) || visitNodes(cbNode, cbNodes, node.members);
    case qt.SyntaxKind.EnumMember:
      return visitNode(cbNode, node.name) || visitNode(cbNode, node.initializer);
    case qt.SyntaxKind.ModuleDeclaration:
      return visitNodes(cbNode, cbNodes, node.decorators) || visitNodes(cbNode, cbNodes, node.modifiers) || visitNode(cbNode, node.name) || visitNode(cbNode, node.body);
    case qt.SyntaxKind.ImportEqualsDeclaration:
      return visitNodes(cbNode, cbNodes, node.decorators) || visitNodes(cbNode, cbNodes, node.modifiers) || visitNode(cbNode, node.name) || visitNode(cbNode, node.moduleReference);
    case qt.SyntaxKind.ImportDeclaration:
      return visitNodes(cbNode, cbNodes, node.decorators) || visitNodes(cbNode, cbNodes, node.modifiers) || visitNode(cbNode, node.importClause) || visitNode(cbNode, node.moduleSpecifier);
    case qt.SyntaxKind.ImportClause:
      return visitNode(cbNode, node.name) || visitNode(cbNode, node.namedBindings);
    case qt.SyntaxKind.NamespaceExportDeclaration:
      return visitNode(cbNode, node.name);

    case qt.SyntaxKind.NamespaceImport:
      return visitNode(cbNode, node.name);
    case qt.SyntaxKind.NamespaceExport:
      return visitNode(cbNode, node.name);
    case qt.SyntaxKind.NamedImports:
    case qt.SyntaxKind.NamedExports:
      return visitNodes(cbNode, cbNodes, node.elements);
    case qt.SyntaxKind.ExportDeclaration:
      return visitNodes(cbNode, cbNodes, node.decorators) || visitNodes(cbNode, cbNodes, node.modifiers) || visitNode(cbNode, node.exportClause) || visitNode(cbNode, node.moduleSpecifier);
    case qt.SyntaxKind.ImportSpecifier:
    case qt.SyntaxKind.ExportSpecifier:
      return visitNode(cbNode, node.propertyName) || visitNode(cbNode, node.name);
    case qt.SyntaxKind.ExportAssignment:
      return visitNodes(cbNode, cbNodes, node.decorators) || visitNodes(cbNode, cbNodes, node.modifiers) || visitNode(cbNode, node.expression);
    case qt.SyntaxKind.TemplateExpression:
      return visitNode(cbNode, node.head) || visitNodes(cbNode, cbNodes, node.templateSpans);
    case qt.SyntaxKind.TemplateSpan:
      return visitNode(cbNode, node.expression) || visitNode(cbNode, node.literal);
    case qt.SyntaxKind.ComputedPropertyName:
      return visitNode(cbNode, node.expression);
    case qt.SyntaxKind.HeritageClause:
      return visitNodes(cbNode, cbNodes, node.types);
    case qt.SyntaxKind.ExpressionWithTypeArguments:
      return visitNode(cbNode, node.expression) || visitNodes(cbNode, cbNodes, node.typeArguments);
    case qt.SyntaxKind.ExternalModuleReference:
      return visitNode(cbNode, node.expression);
    case qt.SyntaxKind.MissingDeclaration:
      return visitNodes(cbNode, cbNodes, node.decorators);
    case qt.SyntaxKind.CommaListExpression:
      return visitNodes(cbNode, cbNodes, node.elements);

    case qt.SyntaxKind.JsxElement:
      return visitNode(cbNode, node.openingElement) || visitNodes(cbNode, cbNodes, node.children) || visitNode(cbNode, node.closingElement);
    case qt.SyntaxKind.JsxFragment:
      return visitNode(cbNode, node.openingFragment) || visitNodes(cbNode, cbNodes, node.children) || visitNode(cbNode, node.closingFragment);
    case qt.SyntaxKind.JsxSelfClosingElement:
    case qt.SyntaxKind.JsxOpeningElement:
      return visitNode(cbNode, node.tagName) || visitNodes(cbNode, cbNodes, node.typeArguments) || visitNode(cbNode, node.attributes);
    case qt.SyntaxKind.JsxAttributes:
      return visitNodes(cbNode, cbNodes, node.properties);
    case qt.SyntaxKind.JsxAttribute:
      return visitNode(cbNode, node.name) || visitNode(cbNode, node.initializer);
    case qt.SyntaxKind.JsxSpreadAttribute:
      return visitNode(cbNode, node.expression);
    case qt.SyntaxKind.JsxExpression:
      return visitNode(cbNode, node.dotDotDotToken) || visitNode(cbNode, node.expression);
    case qt.SyntaxKind.JsxClosingElement:
      return visitNode(cbNode, node.tagName);

    case qt.SyntaxKind.OptionalType:
    case qt.SyntaxKind.RestType:
    case qt.SyntaxKind.JSDocTypeExpression:
    case qt.SyntaxKind.JSDocNonNullableType:
    case qt.SyntaxKind.JSDocNullableType:
    case qt.SyntaxKind.JSDocOptionalType:
    case qt.SyntaxKind.JSDocVariadicType:
      return visitNode(cbNode, (<OptionalTypeNode | RestTypeNode | JSDocTypeExpression | JSDocTypeReferencingNode>node).type);
    case qt.SyntaxKind.JSDocFunctionType:
      return visitNodes(cbNode, cbNodes, node.parameters) || visitNode(cbNode, node.type);
    case qt.SyntaxKind.JSDocComment:
      return visitNodes(cbNode, cbNodes, node.tags);
    case qt.SyntaxKind.JSDocParameterTag:
    case qt.SyntaxKind.JSDocPropertyTag:
      return visitNode(cbNode, node.tagName) || (node.isNameFirst ? visitNode(cbNode, node.name) || visitNode(cbNode, node.typeExpression) : visitNode(cbNode, node.typeExpression) || visitNode(cbNode, node.name));
    case qt.SyntaxKind.JSDocAuthorTag:
      return visitNode(cbNode, node.tagName);
    case qt.SyntaxKind.JSDocImplementsTag:
      return visitNode(cbNode, node.tagName) || visitNode(cbNode, node.class);
    case qt.SyntaxKind.JSDocAugmentsTag:
      return visitNode(cbNode, node.tagName) || visitNode(cbNode, node.class);
    case qt.SyntaxKind.JSDocTemplateTag:
      return visitNode(cbNode, node.tagName) || visitNode(cbNode, node.constraint) || visitNodes(cbNode, cbNodes, node.typeParameters);
    case qt.SyntaxKind.JSDocTypedefTag:
      return visitNode(cbNode, node.tagName) || (node.typeExpression && node.typeExpression!.kind === qt.SyntaxKind.JSDocTypeExpression ? visitNode(cbNode, node.typeExpression) || visitNode(cbNode, node.fullName) : visitNode(cbNode, node.fullName) || visitNode(cbNode, node.typeExpression));
    case qt.SyntaxKind.JSDocCallbackTag:
      return visitNode(cbNode, node.tagName) || visitNode(cbNode, node.fullName) || visitNode(cbNode, node.typeExpression);
    case qt.SyntaxKind.JSDocReturnTag:
    case qt.SyntaxKind.JSDocTypeTag:
    case qt.SyntaxKind.JSDocThisTag:
    case qt.SyntaxKind.JSDocEnumTag:
      return visitNode(cbNode, node.tagName) || visitNode(cbNode, (node as JSDocReturnTag | JSDocTypeTag | JSDocThisTag | JSDocEnumTag).typeExpression);
    case qt.SyntaxKind.JSDocSignature:
      return forEach(node.typeParameters, cbNode) || forEach(node.parameters, cbNode) || visitNode(cbNode, node.type);
    case qt.SyntaxKind.JSDocTypeLiteral:
      return forEach(node.jsDocPropertyTags, cbNode);
    case qt.SyntaxKind.JSDocTag:
    case qt.SyntaxKind.JSDocClassTag:
    case qt.SyntaxKind.JSDocPublicTag:
    case qt.SyntaxKind.JSDocPrivateTag:
    case qt.SyntaxKind.JSDocProtectedTag:
    case qt.SyntaxKind.JSDocReadonlyTag:
      return visitNode(cbNode, node.tagName);
    case qt.SyntaxKind.PartiallyEmittedExpression:
      return visitNode(cbNode, node.expression);
  }
}

/**
 * Invokes a callback for each child of the given node. The 'cbNode' callback is invoked for all child nodes
 * stored in properties. If a 'cbNodes' callback is specified, it is invoked for embedded arrays; additionally,
 * unlike `forEachChild`, embedded arrays are flattened and the 'cbNode' callback is invoked for each element.
 *  If a callback returns a truthy value, iteration stops and that value is returned. Otherwise, undefined is returned.
 *
 * @param node a given node to visit its children
 * @param cbNode a callback to be invoked for all child nodes
 * @param cbNodes a callback to be invoked for embedded array
 *
 * @remarks Unlike `forEachChild`, `forEachChildRecursively` handles recursively invoking the traversal on each child node found,
 * and while doing so, handles traversing the structure without relying on the callstack to encode the tree structure.
 */
export function forEachChildRecursively<T>(rootNode: qt.Node, cbNode: (node: qt.Node, parent: qt.Node) => T | 'skip' | undefined, cbNodes?: (nodes: qt.NodeArray<qt.Node>, parent: qt.Node) => T | 'skip' | undefined): T | undefined {
  const stack: qt.Node[] = [rootNode];
  while (stack.length) {
    const parent = stack.pop()!;
    const res = visitAllPossibleChildren(parent, gatherPossibleChildren(parent));
    if (res) {
      return res;
    }
  }

  return;

  function gatherPossibleChildren(node: qt.Node) {
    const children: (qt.Node | qt.NodeArray<qt.Node>)[] = [];
    forEachChild(node, addWorkItem, addWorkItem); // By using a stack above and `unshift` here, we emulate a depth-first preorder traversal
    return children;

    function addWorkItem(n: qt.Node | qt.NodeArray<qt.Node>) {
      children.unshift(n);
    }
  }

  function visitAllPossibleChildren(parent: qt.Node, children: readonly (qt.Node | qt.NodeArray<qt.Node>)[]) {
    for (const child of children) {
      if (isArray(child)) {
        if (cbNodes) {
          const res = cbNodes(child, parent);
          if (res) {
            if (res === 'skip') continue;
            return res;
          }
        }

        for (let i = child.length - 1; i >= 0; i--) {
          const realChild = child[i];
          const res = cbNode(realChild, parent);
          if (res) {
            if (res === 'skip') continue;
            return res;
          }
          stack.push(realChild);
        }
      } else {
        stack.push(child);
        const res = cbNode(child, parent);
        if (res) {
          if (res === 'skip') continue;
          return res;
        }
      }
    }
  }
}

export function createSourceFile(fileName: string, sourceText: string, languageVersion: qt.ScriptTarget, setParentNodes = false, scriptKind?: ScriptKind): SourceFile {
  performance.mark('beforeParse');
  let result: SourceFile;

  perfLogger.logStartParseSourceFile(fileName);
  if (languageVersion === qt.ScriptTarget.JSON) {
    result = Parser.parseSourceFile(fileName, sourceText, languageVersion, /*syntaxCursor*/ undefined, setParentNodes, qt.ScriptKind.JSON);
  } else {
    result = Parser.parseSourceFile(fileName, sourceText, languageVersion, /*syntaxCursor*/ undefined, setParentNodes, scriptKind);
  }
  perfLogger.logStopParseSourceFile();

  performance.mark('afterParse');
  performance.measure('Parse', 'beforeParse', 'afterParse');
  return result;
}

export function parseIsolatedEntityName(text: string, languageVersion: qt.ScriptTarget): EntityName | undefined {
  return Parser.parseIsolatedEntityName(text, languageVersion);
}

/**
 * Parse json text into SyntaxTree and return node and parse errors if any
 * @param fileName
 * @param sourceText
 */
export function parseJsonText(fileName: string, sourceText: string): JsonSourceFile {
  return Parser.parseJsonText(fileName, sourceText);
}

// See also `isExternalOrCommonJsModule` in utilities.ts
export function isExternalModule(file: SourceFile): boolean {
  return file.externalModuleIndicator !== undefined;
}

// Produces a new SourceFile for the 'newText' provided. The 'textChangeRange' parameter
// indicates what changed between the 'text' that this SourceFile has and the 'newText'.
// The SourceFile will be created with the compiler attempting to reuse as many nodes from
// this file as possible.
//
// Note: this function mutates nodes from this SourceFile. That means any existing nodes
// from this SourceFile that are being held onto may change as a result (including
// becoming detached from any SourceFile).  It is recommended that this SourceFile not
// be used once 'update' is called on it.
export function updateSourceFile(sourceFile: SourceFile, newText: string, textChangeRange: qt.TextChangeRange, aggressiveChecks = false): SourceFile {
  const newSourceFile = IncrementalParser.updateSourceFile(sourceFile, newText, textChangeRange, aggressiveChecks);
  // Because new source file node is created, it may not have the flag PossiblyContainDynamicImport. This is the case if there is no new edit to add dynamic import.
  // We will manually port the flag to the new source file.
  newSourceFile.flags |= sourceFile.flags & qt.NodeFlags.PermanentlySetIncrementalFlags;
  return newSourceFile;
}

export function parseIsolatedJSDocComment(content: string, start?: number, length?: number) {
  const result = Parser.JSDocParser.parseIsolatedJSDocComment(content, start, length);
  if (result && result.jsDoc) {
    // because the jsDocComment was parsed out of the source file, it might
    // not be covered by the fixupParentReferences.
    Parser.fixupParentReferences(result.jsDoc);
  }

  return result;
}

// Exposed only for testing.
export function parseJSDocTypeExpressionForTests(content: string, start?: number, length?: number) {
  return Parser.JSDocParser.parseJSDocTypeExpressionForTests(content, start, length);
}

// Implement the parser as a singleton module.  We do this for perf reasons because creating
// parser instances can actually be expensive enough to impact us on projects with many source
// files.
export namespace Parser {
  // Share a single scanner across all calls to parse a source file.  This helps speed things
  // up by avoiding the cost of creating/compiling scanners over and over again.
  const scanner = createScanner(ScriptTarget.Latest, /*skipTrivia*/ true);
  const disallowInAndDecoratorContext = qt.NodeFlags.DisallowInContext | qt.NodeFlags.DecoratorContext;

  // capture constructors in 'initializeState' to avoid null checks
  let NodeConstructor: new (kind: qt.SyntaxKind, pos: number, end: number) => qt.Node;
  let TokenConstructor: new (kind: qt.SyntaxKind, pos: number, end: number) => qt.Node;
  let IdentifierConstructor: new (kind: qt.SyntaxKind, pos: number, end: number) => qt.Node;
  let PrivateIdentifierConstructor: new (kind: qt.SyntaxKind, pos: number, end: number) => qt.Node;
  let SourceFileConstructor: new (kind: qt.SyntaxKind, pos: number, end: number) => qt.Node;

  let sourceFile: SourceFile;
  let parseDiagnostics: qt.DiagnosticWithLocation[];
  let syntaxCursor: IncrementalParser.SyntaxCursor | undefined;

  let currentToken: qt.SyntaxKind;
  let sourceText: string;
  let nodeCount: number;
  let identifiers: Map<string>;
  let privateIdentifiers: Map<string>;
  let identifierCount: number;

  let parsingContext: ParsingContext;

  let notParenthesizedArrow: Map<true> | undefined;

  // Flags that dictate what parsing context we're in.  For example:
  // Whether or not we are in strict parsing mode.  All that changes in strict parsing mode is
  // that some tokens that would be considered identifiers may be considered keywords.
  //
  // When adding more parser context flags, consider which is the more common case that the
  // flag will be in.  This should be the 'false' state for that flag.  The reason for this is
  // that we don't store data in our nodes unless the value is in the *non-default* state.  So,
  // for example, more often than code 'allows-in' (or doesn't 'disallow-in').  We opt for
  // 'disallow-in' set to 'false'.  Otherwise, if we had 'allowsIn' set to 'true', then almost
  // all nodes would need extra state on them to store this info.
  //
  // Note: 'allowIn' and 'allowYield' track 1:1 with the [in] and [yield] concepts in the ES6
  // grammar specification.
  //
  // An important thing about these context concepts.  By default they are effectively inherited
  // while parsing through every grammar production.  i.e. if you don't change them, then when
  // you parse a sub-production, it will have the same context values as the parent production.
  // This is great most of the time.  After all, consider all the 'expression' grammar productions
  // and how nearly all of them pass along the 'in' and 'yield' context values:
  //
  // EqualityExpression[In, Yield] :
  //      RelationalExpression[?In, ?Yield]
  //      EqualityExpression[?In, ?Yield] == RelationalExpression[?In, ?Yield]
  //      EqualityExpression[?In, ?Yield] != RelationalExpression[?In, ?Yield]
  //      EqualityExpression[?In, ?Yield] === RelationalExpression[?In, ?Yield]
  //      EqualityExpression[?In, ?Yield] !== RelationalExpression[?In, ?Yield]
  //
  // Where you have to be careful is then understanding what the points are in the grammar
  // where the values are *not* passed along.  For example:
  //
  // SingleNameBinding[Yield,GeneratorParameter]
  //      [+GeneratorParameter]BindingIdentifier[Yield] Initializer[In]opt
  //      [~GeneratorParameter]BindingIdentifier[?Yield]Initializer[In, ?Yield]opt
  //
  // Here this is saying that if the GeneratorParameter context flag is set, that we should
  // explicitly set the 'yield' context flag to false before calling into the BindingIdentifier
  // and we should explicitly unset the 'yield' context flag before calling into the Initializer.
  // production.  Conversely, if the GeneratorParameter context flag is not set, then we
  // should leave the 'yield' context flag alone.
  //
  // Getting this all correct is tricky and requires careful reading of the grammar to
  // understand when these values should be changed versus when they should be inherited.
  //
  // Note: it should not be necessary to save/restore these flags during speculative/lookahead
  // parsing.  These context flags are naturally stored and restored through normal recursive
  // descent parsing and unwinding.
  let contextFlags: qt.NodeFlags;

  // Whether or not we've had a parse error since creating the last AST node.  If we have
  // encountered an error, it will be stored on the next AST node we create.  Parse errors
  // can be broken down into three categories:
  //
  // 1) An error that occurred during scanning.  For example, an unterminated literal, or a
  //    character that was completely not understood.
  //
  // 2) A token was expected, but was not present.  This type of error is commonly produced
  //    by the 'parseExpected' function.
  //
  // 3) A token was present that no parsing function was able to consume.  This type of error
  //    only occurs in the 'abortParsingListOrMoveToNextToken' function when the parser
  //    decides to skip the token.
  //
  // In all of these cases, we want to mark the next node as having had an error before it.
  // With this mark, we can know in incremental settings if this node can be reused, or if
  // we have to reparse it.  If we don't keep this information around, we may just reuse the
  // node.  in that event we would then not produce the same errors as we did before, causing
  // significant confusion problems.
  //
  // Note: it is necessary that this value be saved/restored during speculative/lookahead
  // parsing.  During lookahead parsing, we will often create a node.  That node will have
  // this value attached, and then this value will be set back to 'false'.  If we decide to
  // rewind, we must get back to the same value we had prior to the lookahead.
  //
  // Note: any errors at the end of the file that do not precede a regular node, should get
  // attached to the EOF token.
  let parseErrorBeforeNextFinishedNode = false;

  export function parseSourceFile(fileName: string, sourceText: string, languageVersion: qt.ScriptTarget, syntaxCursor: IncrementalParser.SyntaxCursor | undefined, setParentNodes = false, scriptKind?: ScriptKind): SourceFile {
    scriptKind = ensureScriptKind(fileName, scriptKind);
    if (scriptKind === qt.ScriptKind.JSON) {
      const result = parseJsonText(fileName, sourceText, languageVersion, syntaxCursor, setParentNodes);
      convertToObjectWorker(result, result.parseDiagnostics, /*returnValue*/ false, /*knownRootOptions*/ undefined, /*jsonConversionNotifier*/ undefined);
      result.referencedFiles = emptyArray;
      result.typeReferenceDirectives = emptyArray;
      result.libReferenceDirectives = emptyArray;
      result.amdDependencies = emptyArray;
      result.hasNoDefaultLib = false;
      result.pragmas = emptyMap;
      return result;
    }

    initializeState(sourceText, languageVersion, syntaxCursor, scriptKind);

    const result = parseSourceFileWorker(fileName, languageVersion, setParentNodes, scriptKind);

    clearState();

    return result;
  }

  export function parseIsolatedEntityName(content: string, languageVersion: qt.ScriptTarget): EntityName | undefined {
    // Choice of `isDeclarationFile` should be arbitrary
    initializeState(content, languageVersion, /*syntaxCursor*/ undefined, qt.ScriptKind.JS);
    // Prime the scanner.
    nextToken();
    const entityName = parseEntityName(/*allowReservedWords*/ true);
    const isInvalid = token() === qt.SyntaxKind.EndOfFileToken && !parseDiagnostics.length;
    clearState();
    return isInvalid ? entityName : undefined;
  }

  export function parseJsonText(fileName: string, sourceText: string, languageVersion: qt.ScriptTarget = qt.ScriptTarget.ES2015, syntaxCursor?: IncrementalParser.SyntaxCursor, setParentNodes?: boolean): JsonSourceFile {
    initializeState(sourceText, languageVersion, syntaxCursor, qt.ScriptKind.JSON);
    // Set source file so that errors will be reported with this file name
    sourceFile = createSourceFile(fileName, qt.ScriptTarget.ES2015, qt.ScriptKind.JSON, /*isDeclaration*/ false);
    sourceFile.flags = contextFlags;

    // Prime the scanner.
    nextToken();
    const pos = getNodePos();
    if (token() === qt.SyntaxKind.EndOfFileToken) {
      sourceFile.statements = createNodeArray([], pos, pos);
      sourceFile.endOfFileToken = parseTokenNode<EndOfFileToken>();
    } else {
      const statement = createNode(qt.SyntaxKind.ExpressionStatement) as JsonObjectExpressionStatement;
      switch (token()) {
        case qt.SyntaxKind.OpenBracketToken:
          statement.expression = parseArrayLiteralExpression();
          break;
        case qt.SyntaxKind.TrueKeyword:
        case qt.SyntaxKind.FalseKeyword:
        case qt.SyntaxKind.NullKeyword:
          statement.expression = parseTokenNode<BooleanLiteral | NullLiteral>();
          break;
        case qt.SyntaxKind.MinusToken:
          if (lookAhead(() => nextToken() === qt.SyntaxKind.NumericLiteral && nextToken() !== qt.SyntaxKind.ColonToken)) {
            statement.expression = parsePrefixUnaryExpression();
          } else {
            statement.expression = parseObjectLiteralExpression();
          }
          break;
        case qt.SyntaxKind.NumericLiteral:
        case qt.SyntaxKind.StringLiteral:
          if (lookAhead(() => nextToken() !== qt.SyntaxKind.ColonToken)) {
            statement.expression = parseLiteralNode() as StringLiteral | NumericLiteral;
            break;
          }
        // falls through
        default:
          statement.expression = parseObjectLiteralExpression();
          break;
      }
      finishNode(statement);
      sourceFile.statements = createNodeArray([statement], pos);
      sourceFile.endOfFileToken = parseExpectedToken(qt.SyntaxKind.EndOfFileToken, Diagnostics.Unexpected_token);
    }

    if (setParentNodes) {
      fixupParentReferences(sourceFile);
    }

    sourceFile.nodeCount = nodeCount;
    sourceFile.identifierCount = identifierCount;
    sourceFile.identifiers = identifiers;
    sourceFile.parseDiagnostics = parseDiagnostics;

    const result = sourceFile;
    clearState();
    return result;
  }

  function getLanguageVariant(scriptKind: ScriptKind) {
    // .tsx and .jsx files are treated as jsx language variant.
    return scriptKind === qt.ScriptKind.TSX || scriptKind === qt.ScriptKind.JSX || scriptKind === qt.ScriptKind.JS || scriptKind === qt.ScriptKind.JSON ? LanguageVariant.JSX : LanguageVariant.Standard;
  }

  function initializeState(_sourceText: string, languageVersion: qt.ScriptTarget, _syntaxCursor: IncrementalParser.SyntaxCursor | undefined, scriptKind: ScriptKind) {
    NodeConstructor = objectAllocator.getNodeConstructor();
    TokenConstructor = objectAllocator.getTokenConstructor();
    qt.IdentifierConstructor = objectAllocator.getIdentifierConstructor();
    PrivateIdentifierConstructor = objectAllocator.getPrivateIdentifierConstructor();
    SourceFileConstructor = objectAllocator.getSourceFileConstructor();

    sourceText = _sourceText;
    syntaxCursor = _syntaxCursor;

    parseDiagnostics = [];
    parsingContext = 0;
    identifiers = qc.createMap<string>();
    privateIdentifiers = qc.createMap<string>();
    identifierCount = 0;
    nodeCount = 0;

    switch (scriptKind) {
      case qt.ScriptKind.JS:
      case qt.ScriptKind.JSX:
        contextFlags = qt.NodeFlags.JavaScriptFile;
        break;
      case qt.ScriptKind.JSON:
        contextFlags = qt.NodeFlags.JavaScriptFile | qt.NodeFlags.JsonFile;
        break;
      default:
        contextFlags = qt.NodeFlags.None;
        break;
    }
    parseErrorBeforeNextFinishedNode = false;

    // Initialize and prime the scanner before parsing the source elements.
    scanner.setText(sourceText);
    scanner.setOnError(scanError);
    scanner.setScriptTarget(languageVersion);
    scanner.setLanguageVariant(getLanguageVariant(scriptKind));
  }

  function clearState() {
    // Clear out the text the scanner is pointing at, so it doesn't keep anything alive unnecessarily.
    scanner.clearCommentDirectives();
    scanner.setText('');
    scanner.setOnError(undefined);

    // Clear any data.  We don't want to accidentally hold onto it for too long.
    parseDiagnostics = undefined!;
    sourceFile = undefined!;
    identifiers = undefined!;
    syntaxCursor = undefined;
    sourceText = undefined!;
    notParenthesizedArrow = undefined!;
  }

  function parseSourceFileWorker(fileName: string, languageVersion: qt.ScriptTarget, setParentNodes: boolean, scriptKind: ScriptKind): SourceFile {
    const isDeclarationFile = isDeclarationFileName(fileName);
    if (isDeclarationFile) {
      contextFlags |= qt.NodeFlags.Ambient;
    }

    sourceFile = createSourceFile(fileName, languageVersion, scriptKind, isDeclarationFile);
    sourceFile.flags = contextFlags;

    // Prime the scanner.
    nextToken();
    // A member of ReadonlyArray<T> isn't assignable to a member of T[] (and prevents a direct cast) - but this is where we set up those members so they can be readonly in the future
    processCommentPragmas((sourceFile as {}) as PragmaContext, sourceText);
    processPragmasIntoFields((sourceFile as {}) as PragmaContext, reportPragmaDiagnostic);

    sourceFile.statements = parseList(ParsingContext.SourceElements, parseStatement);
    Debug.assert(token() === qt.SyntaxKind.EndOfFileToken);
    sourceFile.endOfFileToken = addJSDocComment(parseTokenNode());

    setExternalModuleIndicator(sourceFile);

    sourceFile.commentDirectives = scanner.getCommentDirectives();
    sourceFile.nodeCount = nodeCount;
    sourceFile.identifierCount = identifierCount;
    sourceFile.identifiers = identifiers;
    sourceFile.parseDiagnostics = parseDiagnostics;

    if (setParentNodes) {
      fixupParentReferences(sourceFile);
    }

    return sourceFile;

    function reportPragmaDiagnostic(pos: number, end: number, diagnostic: qt.DiagnosticMessage) {
      parseDiagnostics.push(createFileDiagnostic(sourceFile, pos, end, diagnostic));
    }
  }

  function addJSDocComment<T extends HasJSDoc>(node: T): T {
    Debug.assert(!node.jsDoc); // Should only be called once per node
    const jsDoc = mapDefined(getJSDocCommentRanges(node, sourceFile.text), (comment) => JSDocParser.parseJSDocComment(node, comment.pos, comment.end - comment.pos));
    if (jsDoc.length) node.jsDoc = jsDoc;
    return node;
  }

  export function fixupParentReferences(rootNode: qt.Node) {
    // normally parent references are set during binding. However, for clients that only need
    // a syntax tree, and no semantic features, then the binding process is an unnecessary
    // overhead.  This functions allows us to set all the parents, without all the expense of
    // binding.
    forEachChildRecursively(rootNode, bindParentToChild);

    function bindParentToChild(child: qt.Node, parent: qt.Node) {
      child.parent = parent;
      if (hasJSDocNodes(child)) {
        for (const doc of child.jsDoc!) {
          bindParentToChild(doc, child);
          forEachChildRecursively(doc, bindParentToChild);
        }
      }
    }
  }

  function createSourceFile(fileName: string, languageVersion: qt.ScriptTarget, scriptKind: ScriptKind, isDeclarationFile: boolean): SourceFile {
    // code from createNode is inlined here so createNode won't have to deal with special case of creating source files
    // this is quite rare comparing to other nodes and createNode should be as fast as possible
    const sourceFile = <SourceFile>new SourceFileConstructor(qt.SyntaxKind.SourceFile, /*pos*/ 0, /* end */ sourceText.length);
    nodeCount++;

    sourceFile.text = sourceText;
    sourceFile.bindDiagnostics = [];
    sourceFile.bindSuggestionDiagnostics = undefined;
    sourceFile.languageVersion = languageVersion;
    sourceFile.fileName = normalizePath(fileName);
    sourceFile.languageVariant = getLanguageVariant(scriptKind);
    sourceFile.isDeclarationFile = isDeclarationFile;
    sourceFile.scriptKind = scriptKind;

    return sourceFile;
  }

  function setContextFlag(val: boolean, flag: qt.NodeFlags) {
    if (val) {
      contextFlags |= flag;
    } else {
      contextFlags &= ~flag;
    }
  }

  function setDisallowInContext(val: boolean) {
    setContextFlag(val, qt.NodeFlags.DisallowInContext);
  }

  function setYieldContext(val: boolean) {
    setContextFlag(val, qt.NodeFlags.YieldContext);
  }

  function setDecoratorContext(val: boolean) {
    setContextFlag(val, qt.NodeFlags.DecoratorContext);
  }

  function setAwaitContext(val: boolean) {
    setContextFlag(val, qt.NodeFlags.AwaitContext);
  }

  function doOutsideOfContext<T>(context: qt.NodeFlags, func: () => T): T {
    // contextFlagsToClear will contain only the context flags that are
    // currently set that we need to temporarily clear
    // We don't just blindly reset to the previous flags to ensure
    // that we do not mutate cached flags for the incremental
    // parser (ThisNodeHasError, ThisNodeOrAnySubNodesHasError, and
    // HasAggregatedChildData).
    const contextFlagsToClear = context & contextFlags;
    if (contextFlagsToClear) {
      // clear the requested context flags
      setContextFlag(/*val*/ false, contextFlagsToClear);
      const result = func();
      // restore the context flags we just cleared
      setContextFlag(/*val*/ true, contextFlagsToClear);
      return result;
    }

    // no need to do anything special as we are not in any of the requested contexts
    return func();
  }

  function doInsideOfContext<T>(context: qt.NodeFlags, func: () => T): T {
    // contextFlagsToSet will contain only the context flags that
    // are not currently set that we need to temporarily enable.
    // We don't just blindly reset to the previous flags to ensure
    // that we do not mutate cached flags for the incremental
    // parser (ThisNodeHasError, ThisNodeOrAnySubNodesHasError, and
    // HasAggregatedChildData).
    const contextFlagsToSet = context & ~contextFlags;
    if (contextFlagsToSet) {
      // set the requested context flags
      setContextFlag(/*val*/ true, contextFlagsToSet);
      const result = func();
      // reset the context flags we just set
      setContextFlag(/*val*/ false, contextFlagsToSet);
      return result;
    }

    // no need to do anything special as we are already in all of the requested contexts
    return func();
  }

  function allowInAnd<T>(func: () => T): T {
    return doOutsideOfContext(qt.NodeFlags.DisallowInContext, func);
  }

  function disallowInAnd<T>(func: () => T): T {
    return doInsideOfContext(qt.NodeFlags.DisallowInContext, func);
  }

  function doInYieldContext<T>(func: () => T): T {
    return doInsideOfContext(qt.NodeFlags.YieldContext, func);
  }

  function doInDecoratorContext<T>(func: () => T): T {
    return doInsideOfContext(qt.NodeFlags.DecoratorContext, func);
  }

  function doInAwaitContext<T>(func: () => T): T {
    return doInsideOfContext(qt.NodeFlags.AwaitContext, func);
  }

  function doOutsideOfAwaitContext<T>(func: () => T): T {
    return doOutsideOfContext(qt.NodeFlags.AwaitContext, func);
  }

  function doInYieldAndAwaitContext<T>(func: () => T): T {
    return doInsideOfContext(qt.NodeFlags.YieldContext | qt.NodeFlags.AwaitContext, func);
  }

  function doOutsideOfYieldAndAwaitContext<T>(func: () => T): T {
    return doOutsideOfContext(qt.NodeFlags.YieldContext | qt.NodeFlags.AwaitContext, func);
  }

  function inContext(flags: qt.NodeFlags) {
    return (contextFlags & flags) !== 0;
  }

  function inYieldContext() {
    return inContext(qt.NodeFlags.YieldContext);
  }

  function inDisallowInContext() {
    return inContext(qt.NodeFlags.DisallowInContext);
  }

  function inDecoratorContext() {
    return inContext(qt.NodeFlags.DecoratorContext);
  }

  function inAwaitContext() {
    return inContext(qt.NodeFlags.AwaitContext);
  }

  function parseErrorAtCurrentToken(message: qt.DiagnosticMessage, arg0?: any): void {
    parseErrorAt(scanner.getTokenPos(), scanner.getTextPos(), message, arg0);
  }

  function parseErrorAtPosition(start: number, length: number, message: qt.DiagnosticMessage, arg0?: any): void {
    // Don't report another error if it would just be at the same position as the last error.
    const lastError = qc.lastOrUndefined(parseDiagnostics);
    if (!lastError || start !== lastError.start) {
      parseDiagnostics.push(createFileDiagnostic(sourceFile, start, length, message, arg0));
    }

    // Mark that we've encountered an error.  We'll set an appropriate bit on the next
    // node we finish so that it can't be reused incrementally.
    parseErrorBeforeNextFinishedNode = true;
  }

  function parseErrorAt(start: number, end: number, message: qt.DiagnosticMessage, arg0?: any): void {
    parseErrorAtPosition(start, end - start, message, arg0);
  }

  function parseErrorAtRange(range: qt.TextRange, message: qt.DiagnosticMessage, arg0?: any): void {
    parseErrorAt(range.pos, range.end, message, arg0);
  }

  function scanError(message: qt.DiagnosticMessage, length: number): void {
    parseErrorAtPosition(scanner.getTextPos(), length, message);
  }

  function getNodePos(): number {
    return scanner.getStartPos();
  }

  // Use this function to access the current token instead of reading the currentToken
  // variable. Since function results aren't narrowed in control flow analysis, this ensures
  // that the type checker doesn't make wrong assumptions about the type of the current
  // token (e.g. a call to nextToken() changes the current token but the checker doesn't
  // reason about this side effect).  Mainstream VMs inline simple functions like this, so
  // there is no performance penalty.
  function token(): qt.SyntaxKind {
    return currentToken;
  }

  function nextTokenWithoutCheck() {
    return (currentToken = scanner.scan());
  }

  function nextToken(): qt.SyntaxKind {
    // if the keyword had an escape
    if (isKeyword(currentToken) && (scanner.hasUnicodeEscape() || scanner.hasExtendedUnicodeEscape())) {
      // issue a parse error for the escape
      parseErrorAt(scanner.getTokenPos(), scanner.getTextPos(), Diagnostics.Keywords_cannot_contain_escape_characters);
    }
    return nextTokenWithoutCheck();
  }

  function nextTokenJSDoc(): qt.JSDocSyntaxKind {
    return (currentToken = scanner.scanJsDocToken());
  }

  function reScanGreaterToken(): qt.SyntaxKind {
    return (currentToken = scanner.reScanGreaterToken());
  }

  function reScanSlashToken(): qt.SyntaxKind {
    return (currentToken = scanner.reScanSlashToken());
  }

  function reScanTemplateToken(isTaggedTemplate: boolean): qt.SyntaxKind {
    return (currentToken = scanner.reScanTemplateToken(isTaggedTemplate));
  }

  function reScanTemplateHeadOrNoSubstitutionTemplate(): qt.SyntaxKind {
    return (currentToken = scanner.reScanTemplateHeadOrNoSubstitutionTemplate());
  }

  function reScanLessThanToken(): qt.SyntaxKind {
    return (currentToken = scanner.reScanLessThanToken());
  }

  function scanJsxIdentifier(): qt.SyntaxKind {
    return (currentToken = scanner.scanJsxIdentifier());
  }

  function scanJsxText(): qt.SyntaxKind {
    return (currentToken = scanner.scanJsxToken());
  }

  function scanJsxAttributeValue(): qt.SyntaxKind {
    return (currentToken = scanner.scanJsxAttributeValue());
  }

  function speculationHelper<T>(callback: () => T, isLookAhead: boolean): T {
    // Keep track of the state we'll need to rollback to if lookahead fails (or if the
    // caller asked us to always reset our state).
    const saveToken = currentToken;
    const saveParseDiagnosticsLength = parseDiagnostics.length;
    const saveParseErrorBeforeNextFinishedNode = parseErrorBeforeNextFinishedNode;

    // Note: it is not actually necessary to save/restore the context flags here.  That's
    // because the saving/restoring of these flags happens naturally through the recursive
    // descent nature of our parser.  However, we still store this here just so we can
    // assert that invariant holds.
    const saveContextFlags = contextFlags;

    // If we're only looking ahead, then tell the scanner to only lookahead as well.
    // Otherwise, if we're actually speculatively parsing, then tell the scanner to do the
    // same.
    const result = isLookAhead ? scanner.lookAhead(callback) : scanner.tryScan(callback);

    Debug.assert(saveContextFlags === contextFlags);

    // If our callback returned something 'falsy' or we're just looking ahead,
    // then unconditionally restore us to where we were.
    if (!result || isLookAhead) {
      currentToken = saveToken;
      parseDiagnostics.length = saveParseDiagnosticsLength;
      parseErrorBeforeNextFinishedNode = saveParseErrorBeforeNextFinishedNode;
    }

    return result;
  }

  /** Invokes the provided callback then unconditionally restores the parser to the state it
   * was in immediately prior to invoking the callback.  The result of invoking the callback
   * is returned from this function.
   */
  function lookAhead<T>(callback: () => T): T {
    return speculationHelper(callback, /*isLookAhead*/ true);
  }

  /** Invokes the provided callback.  If the callback returns something falsy, then it restores
   * the parser to the state it was in immediately prior to invoking the callback.  If the
   * callback returns something truthy, then the parser state is not rolled back.  The result
   * of invoking the callback is returned from this function.
   */
  function tryParse<T>(callback: () => T): T {
    return speculationHelper(callback, /*isLookAhead*/ false);
  }

  // Ignore strict mode flag because we will report an error in type checker instead.
  function isIdentifier(): boolean {
    if (token() === qt.SyntaxKind.Identifier) {
      return true;
    }

    // If we have a 'yield' keyword, and we're in the [yield] context, then 'yield' is
    // considered a keyword and is not an identifier.
    if (token() === qt.SyntaxKind.YieldKeyword && inYieldContext()) {
      return false;
    }

    // If we have a 'await' keyword, and we're in the [Await] context, then 'await' is
    // considered a keyword and is not an identifier.
    if (token() === qt.SyntaxKind.AwaitKeyword && inAwaitContext()) {
      return false;
    }

    return token() > qt.SyntaxKind.LastReservedWord;
  }

  function parseExpected(kind: qt.SyntaxKind, diagnosticMessage?: qt.DiagnosticMessage, shouldAdvance = true): boolean {
    if (token() === kind) {
      if (shouldAdvance) {
        nextToken();
      }
      return true;
    }

    // Report specific message if provided with one.  Otherwise, report generic fallback message.
    if (diagnosticMessage) {
      parseErrorAtCurrentToken(diagnosticMessage);
    } else {
      parseErrorAtCurrentToken(Diagnostics._0_expected, tokenToString(kind));
    }
    return false;
  }

  function parseExpectedJSDoc(kind: qt.JSDocSyntaxKind) {
    if (token() === kind) {
      nextTokenJSDoc();
      return true;
    }
    parseErrorAtCurrentToken(Diagnostics._0_expected, tokenToString(kind));
    return false;
  }

  function parseOptional(t: qt.SyntaxKind): boolean {
    if (token() === t) {
      nextToken();
      return true;
    }
    return false;
  }

  function parseOptionalToken<TKind extends qt.SyntaxKind>(t: TKind): qt.Token<TKind>;
  function parseOptionalToken(t: qt.SyntaxKind): qt.Node | undefined {
    if (token() === t) {
      return parseTokenNode();
    }
    return undefined;
  }

  function parseOptionalTokenJSDoc<TKind extends qt.JSDocSyntaxKind>(t: TKind): qt.Token<TKind>;
  function parseOptionalTokenJSDoc(t: qt.JSDocSyntaxKind): qt.Node | undefined {
    if (token() === t) {
      return parseTokenNodeJSDoc();
    }
    return undefined;
  }

  function parseExpectedToken<TKind extends qt.SyntaxKind>(t: TKind, diagnosticMessage?: qt.DiagnosticMessage, arg0?: any): qt.Token<TKind>;
  function parseExpectedToken(t: qt.SyntaxKind, diagnosticMessage?: qt.DiagnosticMessage, arg0?: any): qt.Node {
    return parseOptionalToken(t) || createMissingNode(t, /*reportAtCurrentPosition*/ false, diagnosticMessage || Diagnostics._0_expected, arg0 || tokenToString(t));
  }

  function parseExpectedTokenJSDoc<TKind extends qt.JSDocSyntaxKind>(t: TKind): qt.Token<TKind>;
  function parseExpectedTokenJSDoc(t: qt.JSDocSyntaxKind): qt.Node {
    return parseOptionalTokenJSDoc(t) || createMissingNode(t, /*reportAtCurrentPosition*/ false, Diagnostics._0_expected, tokenToString(t));
  }

  function parseTokenNode<T extends qt.Node>(): T {
    const node = <T>createNode(token());
    nextToken();
    return finishNode(node);
  }

  function parseTokenNodeJSDoc<T extends qt.Node>(): T {
    const node = <T>createNode(token());
    nextTokenJSDoc();
    return finishNode(node);
  }

  function canParseSemicolon() {
    // If there's a real semicolon, then we can always parse it out.
    if (token() === qt.SyntaxKind.SemicolonToken) {
      return true;
    }

    // We can parse out an optional semicolon in ASI cases in the following cases.
    return token() === qt.SyntaxKind.CloseBraceToken || token() === qt.SyntaxKind.EndOfFileToken || scanner.hasPrecedingLineBreak();
  }

  function parseSemicolon(): boolean {
    if (canParseSemicolon()) {
      if (token() === qt.SyntaxKind.SemicolonToken) {
        // consume the semicolon if it was explicitly provided.
        nextToken();
      }

      return true;
    } else {
      return parseExpected(qt.SyntaxKind.SemicolonToken);
    }
  }

  function createNode(kind: qt.SyntaxKind, pos?: number): qt.Node {
    nodeCount++;
    const p = pos! >= 0 ? pos! : scanner.getStartPos();
    return isNodeKind(kind) || kind === qt.SyntaxKind.Unknown ? new NodeConstructor(kind, p, p) : kind === qt.SyntaxKind.Identifier ? new qt.IdentifierConstructor(kind, p, p) : kind === qt.SyntaxKind.PrivateIdentifier ? new PrivateIdentifierConstructor(kind, p, p) : new TokenConstructor(kind, p, p);
  }

  function createNodeWithJSDoc(kind: qt.SyntaxKind, pos?: number): qt.Node {
    const node = createNode(kind, pos);
    if (scanner.getTokenFlags() & TokenFlags.PrecedingJSDocComment && (kind !== qt.SyntaxKind.ExpressionStatement || token() !== qt.SyntaxKind.OpenParenToken)) {
      addJSDocComment(<HasJSDoc>node);
    }
    return node;
  }

  function createNodeArray<T extends qt.Node>(elements: T[], pos: number, end?: number): qt.NodeArray<T> {
    // Since the element list of a node array is typically created by starting with an empty array and
    // repeatedly calling push(), the list may not have the optimal memory layout. We invoke slice() for
    // small arrays (1 to 4 elements) to give the VM a chance to allocate an optimal representation.
    const length = elements.length;
    const array = <MutableNodeArray<T>>(length >= 1 && length <= 4 ? elements.slice() : elements);
    array.pos = pos;
    array.end = end === undefined ? scanner.getStartPos() : end;
    return array;
  }

  function finishNode<T extends qt.Node>(node: T, end?: number): T {
    node.end = end === undefined ? scanner.getStartPos() : end;

    if (contextFlags) {
      node.flags |= contextFlags;
    }

    // Keep track on the node if we encountered an error while parsing it.  If we did, then
    // we cannot reuse the node incrementally.  Once we've marked this node, clear out the
    // flag so that we don't mark any subsequent nodes.
    if (parseErrorBeforeNextFinishedNode) {
      parseErrorBeforeNextFinishedNode = false;
      node.flags |= qt.NodeFlags.ThisNodeHasError;
    }

    return node;
  }

  function createMissingNode<T extends qt.Node>(kind: T['kind'], reportAtCurrentPosition: false, diagnosticMessage?: qt.DiagnosticMessage, arg0?: any): T;
  function createMissingNode<T extends qt.Node>(kind: T['kind'], reportAtCurrentPosition: boolean, diagnosticMessage: qt.DiagnosticMessage, arg0?: any): T;
  function createMissingNode<T extends qt.Node>(kind: T['kind'], reportAtCurrentPosition: boolean, diagnosticMessage: qt.DiagnosticMessage, arg0?: any): T {
    if (reportAtCurrentPosition) {
      parseErrorAtPosition(scanner.getStartPos(), 0, diagnosticMessage, arg0);
    } else if (diagnosticMessage) {
      parseErrorAtCurrentToken(diagnosticMessage, arg0);
    }

    const result = createNode(kind);

    if (kind === qt.SyntaxKind.Identifier) {
      (result as qt.Identifier).escapedText = '' as qt.__String;
    } else if (isLiteralKind(kind) || isTemplateLiteralKind(kind)) {
      (result as LiteralLikeNode).text = '';
    }

    return finishNode(result) as T;
  }

  function internIdentifier(text: string): string {
    let identifier = identifiers.get(text);
    if (identifier === undefined) {
      identifiers.set(text, (identifier = text));
    }
    return identifier;
  }

  // An identifier that starts with two underscores has an extra underscore character prepended to it to avoid issues
  // with magic property names like '__proto__'. The 'identifiers' object is used to share a single string instance for
  // each identifier in order to reduce memory consumption.
  function createIdentifier(isIdentifier: boolean, diagnosticMessage?: qt.DiagnosticMessage, privateIdentifierDiagnosticMessage?: qt.DiagnosticMessage): qt.Identifier {
    identifierCount++;
    if (isIdentifier) {
      const node = <qt.Identifier>createNode(qt.SyntaxKind.Identifier);

      // Store original token kind if it is not just an qt.Identifier so we can report appropriate error later in type checker
      if (token() !== qt.SyntaxKind.Identifier) {
        node.originalKeywordKind = token();
      }
      node.escapedText = escapeLeadingUnderscores(internIdentifier(scanner.getTokenValue()));
      nextTokenWithoutCheck();
      return finishNode(node);
    }

    if (token() === qt.SyntaxKind.PrivateIdentifier) {
      parseErrorAtCurrentToken(privateIdentifierDiagnosticMessage || Diagnostics.Private_identifiers_are_not_allowed_outside_class_bodies);
      return createIdentifier(/*isIdentifier*/ true);
    }

    // Only for end of file because the error gets reported incorrectly on embedded script tags.
    const reportAtCurrentPosition = token() === qt.SyntaxKind.EndOfFileToken;

    const isReservedWord = scanner.isReservedWord();
    const msgArg = scanner.getTokenText();

    const defaultMessage = isReservedWord ? Diagnostics.Identifier_expected_0_is_a_reserved_word_that_cannot_be_used_here : Diagnostics.Identifier_expected;

    return createMissingNode<qt.Identifier>(qt.SyntaxKind.Identifier, reportAtCurrentPosition, diagnosticMessage || defaultMessage, msgArg);
  }

  function parseIdentifier(diagnosticMessage?: qt.DiagnosticMessage, privateIdentifierDiagnosticMessage?: qt.DiagnosticMessage): qt.Identifier {
    return createIdentifier(isIdentifier(), diagnosticMessage, privateIdentifierDiagnosticMessage);
  }

  function parseIdentifierName(diagnosticMessage?: qt.DiagnosticMessage): qt.Identifier {
    return createIdentifier(tokenIsIdentifierOrKeyword(token()), diagnosticMessage);
  }

  function isLiteralPropertyName(): boolean {
    return tokenIsIdentifierOrKeyword(token()) || token() === qt.SyntaxKind.StringLiteral || token() === qt.SyntaxKind.NumericLiteral;
  }

  function parsePropertyNameWorker(allowComputedPropertyNames: boolean): PropertyName {
    if (token() === qt.SyntaxKind.StringLiteral || token() === qt.SyntaxKind.NumericLiteral) {
      const node = <StringLiteral | NumericLiteral>parseLiteralNode();
      node.text = internIdentifier(node.text);
      return node;
    }
    if (allowComputedPropertyNames && token() === qt.SyntaxKind.OpenBracketToken) {
      return parseComputedPropertyName();
    }
    if (token() === qt.SyntaxKind.PrivateIdentifier) {
      return parsePrivateIdentifier();
    }
    return parseIdentifierName();
  }

  function parsePropertyName(): PropertyName {
    return parsePropertyNameWorker(/*allowComputedPropertyNames*/ true);
  }

  function parseComputedPropertyName(): ComputedPropertyName {
    // PropertyName [Yield]:
    //      LiteralPropertyName
    //      ComputedPropertyName[?Yield]
    const node = <ComputedPropertyName>createNode(qt.SyntaxKind.ComputedPropertyName);
    parseExpected(qt.SyntaxKind.OpenBracketToken);

    // We parse any expression (including a comma expression). But the grammar
    // says that only an assignment expression is allowed, so the grammar checker
    // will error if it sees a comma expression.
    node.expression = allowInAnd(parseExpression);

    parseExpected(qt.SyntaxKind.CloseBracketToken);
    return finishNode(node);
  }

  function internPrivateIdentifier(text: string): string {
    let privateIdentifier = privateIdentifiers.get(text);
    if (privateIdentifier === undefined) {
      privateIdentifiers.set(text, (privateIdentifier = text));
    }
    return privateIdentifier;
  }

  function parsePrivateIdentifier(): PrivateIdentifier {
    const node = createNode(qt.SyntaxKind.PrivateIdentifier) as PrivateIdentifier;
    node.escapedText = escapeLeadingUnderscores(internPrivateIdentifier(scanner.getTokenText()));
    nextToken();
    return finishNode(node);
  }

  function parseContextualModifier(t: qt.SyntaxKind): boolean {
    return token() === t && tryParse(nextTokenCanFollowModifier);
  }

  function nextTokenIsOnSameLineAndCanFollowModifier() {
    nextToken();
    if (scanner.hasPrecedingLineBreak()) {
      return false;
    }
    return canFollowModifier();
  }

  function nextTokenCanFollowModifier() {
    switch (token()) {
      case qt.SyntaxKind.ConstKeyword:
        // 'const' is only a modifier if followed by 'enum'.
        return nextToken() === qt.SyntaxKind.EnumKeyword;
      case qt.SyntaxKind.ExportKeyword:
        nextToken();
        if (token() === qt.SyntaxKind.DefaultKeyword) {
          return lookAhead(nextTokenCanFollowDefaultKeyword);
        }
        if (token() === qt.SyntaxKind.TypeKeyword) {
          return lookAhead(nextTokenCanFollowExportModifier);
        }
        return canFollowExportModifier();
      case qt.SyntaxKind.DefaultKeyword:
        return nextTokenCanFollowDefaultKeyword();
      case qt.SyntaxKind.StaticKeyword:
      case qt.SyntaxKind.GetKeyword:
      case qt.SyntaxKind.SetKeyword:
        nextToken();
        return canFollowModifier();
      default:
        return nextTokenIsOnSameLineAndCanFollowModifier();
    }
  }

  function canFollowExportModifier(): boolean {
    return token() !== qt.SyntaxKind.AsteriskToken && token() !== qt.SyntaxKind.AsKeyword && token() !== qt.SyntaxKind.OpenBraceToken && canFollowModifier();
  }

  function nextTokenCanFollowExportModifier(): boolean {
    nextToken();
    return canFollowExportModifier();
  }

  function parseAnyContextualModifier(): boolean {
    return isModifierKind(token()) && tryParse(nextTokenCanFollowModifier);
  }

  function canFollowModifier(): boolean {
    return token() === qt.SyntaxKind.OpenBracketToken || token() === qt.SyntaxKind.OpenBraceToken || token() === qt.SyntaxKind.AsteriskToken || token() === qt.SyntaxKind.DotDotDotToken || isLiteralPropertyName();
  }

  function nextTokenCanFollowDefaultKeyword(): boolean {
    nextToken();
    return token() === qt.SyntaxKind.ClassKeyword || token() === qt.SyntaxKind.FunctionKeyword || token() === qt.SyntaxKind.InterfaceKeyword || (token() === qt.SyntaxKind.AbstractKeyword && lookAhead(nextTokenIsClassKeywordOnSameLine)) || (token() === qt.SyntaxKind.AsyncKeyword && lookAhead(nextTokenIsFunctionKeywordOnSameLine));
  }

  // True if positioned at the start of a list element
  function isListElement(parsingContext: ParsingContext, inErrorRecovery: boolean): boolean {
    const node = currentNode(parsingContext);
    if (node) {
      return true;
    }

    switch (parsingContext) {
      case ParsingContext.SourceElements:
      case ParsingContext.BlockStatements:
      case ParsingContext.SwitchClauseStatements:
        // If we're in error recovery, then we don't want to treat ';' as an empty statement.
        // The problem is that ';' can show up in far too many contexts, and if we see one
        // and assume it's a statement, then we may bail out inappropriately from whatever
        // we're parsing.  For example, if we have a semicolon in the middle of a class, then
        // we really don't want to assume the class is over and we're on a statement in the
        // outer module.  We just want to consume and move on.
        return !(token() === qt.SyntaxKind.SemicolonToken && inErrorRecovery) && isStartOfStatement();
      case ParsingContext.SwitchClauses:
        return token() === qt.SyntaxKind.CaseKeyword || token() === qt.SyntaxKind.DefaultKeyword;
      case ParsingContext.TypeMembers:
        return lookAhead(isTypeMemberStart);
      case ParsingContext.ClassMembers:
        // We allow semicolons as class elements (as specified by ES6) as long as we're
        // not in error recovery.  If we're in error recovery, we don't want an errant
        // semicolon to be treated as a class member (since they're almost always used
        // for statements.
        return lookAhead(isClassMemberStart) || (token() === qt.SyntaxKind.SemicolonToken && !inErrorRecovery);
      case ParsingContext.EnumMembers:
        // Include open bracket computed properties. This technically also lets in indexers,
        // which would be a candidate for improved error reporting.
        return token() === qt.SyntaxKind.OpenBracketToken || isLiteralPropertyName();
      case ParsingContext.ObjectLiteralMembers:
        switch (token()) {
          case qt.SyntaxKind.OpenBracketToken:
          case qt.SyntaxKind.AsteriskToken:
          case qt.SyntaxKind.DotDotDotToken:
          case qt.SyntaxKind.DotToken: // Not an object literal member, but don't want to close the object (see `tests/cases/fourslash/completionsDotInObjectLiteral.ts`)
            return true;
          default:
            return isLiteralPropertyName();
        }
      case ParsingContext.RestProperties:
        return isLiteralPropertyName();
      case ParsingContext.ObjectBindingElements:
        return token() === qt.SyntaxKind.OpenBracketToken || token() === qt.SyntaxKind.DotDotDotToken || isLiteralPropertyName();
      case ParsingContext.HeritageClauseElement:
        // If we see `{ ... }` then only consume it as an expression if it is followed by `,` or `{`
        // That way we won't consume the body of a class in its heritage clause.
        if (token() === qt.SyntaxKind.OpenBraceToken) {
          return lookAhead(isValidHeritageClauseObjectLiteral);
        }

        if (!inErrorRecovery) {
          return isStartOfLeftHandSideExpression() && !isHeritageClauseExtendsOrImplementsKeyword();
        } else {
          // If we're in error recovery we tighten up what we're willing to match.
          // That way we don't treat something like "this" as a valid heritage clause
          // element during recovery.
          return isIdentifier() && !isHeritageClauseExtendsOrImplementsKeyword();
        }
      case ParsingContext.VariableDeclarations:
        return isIdentifierOrPrivateIdentifierOrPattern();
      case ParsingContext.ArrayBindingElements:
        return token() === qt.SyntaxKind.CommaToken || token() === qt.SyntaxKind.DotDotDotToken || isIdentifierOrPrivateIdentifierOrPattern();
      case ParsingContext.TypeParameters:
        return isIdentifier();
      case ParsingContext.ArrayLiteralMembers:
        switch (token()) {
          case qt.SyntaxKind.CommaToken:
          case qt.SyntaxKind.DotToken: // Not an array literal member, but don't want to close the array (see `tests/cases/fourslash/completionsDotInArrayLiteralInObjectLiteral.ts`)
            return true;
        }
      // falls through
      case ParsingContext.ArgumentExpressions:
        return token() === qt.SyntaxKind.DotDotDotToken || isStartOfExpression();
      case ParsingContext.Parameters:
        return isStartOfParameter(/*isJSDocParameter*/ false);
      case ParsingContext.JSDocParameters:
        return isStartOfParameter(/*isJSDocParameter*/ true);
      case ParsingContext.TypeArguments:
      case ParsingContext.TupleElementTypes:
        return token() === qt.SyntaxKind.CommaToken || isStartOfType();
      case ParsingContext.HeritageClauses:
        return isHeritageClause();
      case ParsingContext.ImportOrExportSpecifiers:
        return tokenIsIdentifierOrKeyword(token());
      case ParsingContext.JsxAttributes:
        return tokenIsIdentifierOrKeyword(token()) || token() === qt.SyntaxKind.OpenBraceToken;
      case ParsingContext.JsxChildren:
        return true;
    }

    return Debug.fail("Non-exhaustive case in 'isListElement'.");
  }

  function isValidHeritageClauseObjectLiteral() {
    Debug.assert(token() === qt.SyntaxKind.OpenBraceToken);
    if (nextToken() === qt.SyntaxKind.CloseBraceToken) {
      // if we see "extends {}" then only treat the {} as what we're extending (and not
      // the class body) if we have:
      //
      //      extends {} {
      //      extends {},
      //      extends {} extends
      //      extends {} implements

      const next = nextToken();
      return next === qt.SyntaxKind.CommaToken || next === qt.SyntaxKind.OpenBraceToken || next === qt.SyntaxKind.ExtendsKeyword || next === qt.SyntaxKind.ImplementsKeyword;
    }

    return true;
  }

  function nextTokenIsIdentifier() {
    nextToken();
    return isIdentifier();
  }

  function nextTokenIsIdentifierOrKeyword() {
    nextToken();
    return tokenIsIdentifierOrKeyword(token());
  }

  function nextTokenIsIdentifierOrKeywordOrGreaterThan() {
    nextToken();
    return tokenIsIdentifierOrKeywordOrGreaterThan(token());
  }

  function isHeritageClauseExtendsOrImplementsKeyword(): boolean {
    if (token() === qt.SyntaxKind.ImplementsKeyword || token() === qt.SyntaxKind.ExtendsKeyword) {
      return lookAhead(nextTokenIsStartOfExpression);
    }

    return false;
  }

  function nextTokenIsStartOfExpression() {
    nextToken();
    return isStartOfExpression();
  }

  function nextTokenIsStartOfType() {
    nextToken();
    return isStartOfType();
  }

  // True if positioned at a list terminator
  function isListTerminator(kind: ParsingContext): boolean {
    if (token() === qt.SyntaxKind.EndOfFileToken) {
      // Being at the end of the file ends all lists.
      return true;
    }

    switch (kind) {
      case ParsingContext.BlockStatements:
      case ParsingContext.SwitchClauses:
      case ParsingContext.TypeMembers:
      case ParsingContext.ClassMembers:
      case ParsingContext.EnumMembers:
      case ParsingContext.ObjectLiteralMembers:
      case ParsingContext.ObjectBindingElements:
      case ParsingContext.ImportOrExportSpecifiers:
        return token() === qt.SyntaxKind.CloseBraceToken;
      case ParsingContext.SwitchClauseStatements:
        return token() === qt.SyntaxKind.CloseBraceToken || token() === qt.SyntaxKind.CaseKeyword || token() === qt.SyntaxKind.DefaultKeyword;
      case ParsingContext.HeritageClauseElement:
        return token() === qt.SyntaxKind.OpenBraceToken || token() === qt.SyntaxKind.ExtendsKeyword || token() === qt.SyntaxKind.ImplementsKeyword;
      case ParsingContext.VariableDeclarations:
        return isVariableDeclaratorListTerminator();
      case ParsingContext.TypeParameters:
        // Tokens other than '>' are here for better error recovery
        return token() === qt.SyntaxKind.GreaterThanToken || token() === qt.SyntaxKind.OpenParenToken || token() === qt.SyntaxKind.OpenBraceToken || token() === qt.SyntaxKind.ExtendsKeyword || token() === qt.SyntaxKind.ImplementsKeyword;
      case ParsingContext.ArgumentExpressions:
        // Tokens other than ')' are here for better error recovery
        return token() === qt.SyntaxKind.CloseParenToken || token() === qt.SyntaxKind.SemicolonToken;
      case ParsingContext.ArrayLiteralMembers:
      case ParsingContext.TupleElementTypes:
      case ParsingContext.ArrayBindingElements:
        return token() === qt.SyntaxKind.CloseBracketToken;
      case ParsingContext.JSDocParameters:
      case ParsingContext.Parameters:
      case ParsingContext.RestProperties:
        // Tokens other than ')' and ']' (the latter for index signatures) are here for better error recovery
        return token() === qt.SyntaxKind.CloseParenToken || token() === qt.SyntaxKind.CloseBracketToken /*|| token === qt.SyntaxKind.OpenBraceToken*/;
      case ParsingContext.TypeArguments:
        // All other tokens should cause the type-argument to terminate except comma token
        return token() !== qt.SyntaxKind.CommaToken;
      case ParsingContext.HeritageClauses:
        return token() === qt.SyntaxKind.OpenBraceToken || token() === qt.SyntaxKind.CloseBraceToken;
      case ParsingContext.JsxAttributes:
        return token() === qt.SyntaxKind.GreaterThanToken || token() === qt.SyntaxKind.SlashToken;
      case ParsingContext.JsxChildren:
        return token() === qt.SyntaxKind.LessThanToken && lookAhead(nextTokenIsSlash);
      default:
        return false;
    }
  }

  function isVariableDeclaratorListTerminator(): boolean {
    // If we can consume a semicolon (either explicitly, or with ASI), then consider us done
    // with parsing the list of variable declarators.
    if (canParseSemicolon()) {
      return true;
    }

    // in the case where we're parsing the variable declarator of a 'for-in' statement, we
    // are done if we see an 'in' keyword in front of us. Same with for-of
    if (isInOrOfKeyword(token())) {
      return true;
    }

    // ERROR RECOVERY TWEAK:
    // For better error recovery, if we see an '=>' then we just stop immediately.  We've got an
    // arrow function here and it's going to be very unlikely that we'll resynchronize and get
    // another variable declaration.
    if (token() === qt.SyntaxKind.EqualsGreaterThanToken) {
      return true;
    }

    // Keep trying to parse out variable declarators.
    return false;
  }

  // True if positioned at element or terminator of the current list or any enclosing list
  function isInSomeParsingContext(): boolean {
    for (let kind = 0; kind < ParsingContext.Count; kind++) {
      if (parsingContext & (1 << kind)) {
        if (isListElement(kind, /*inErrorRecovery*/ true) || isListTerminator(kind)) {
          return true;
        }
      }
    }

    return false;
  }

  // Parses a list of elements
  function parseList<T extends qt.Node>(kind: ParsingContext, parseElement: () => T): qt.NodeArray<T> {
    const saveParsingContext = parsingContext;
    parsingContext |= 1 << kind;
    const list = [];
    const listPos = getNodePos();

    while (!isListTerminator(kind)) {
      if (isListElement(kind, /*inErrorRecovery*/ false)) {
        const element = parseListElement(kind, parseElement);
        list.push(element);

        continue;
      }

      if (abortParsingListOrMoveToNextToken(kind)) {
        break;
      }
    }

    parsingContext = saveParsingContext;
    return createNodeArray(list, listPos);
  }

  function parseListElement<T extends qt.Node>(parsingContext: ParsingContext, parseElement: () => T): T {
    const node = currentNode(parsingContext);
    if (node) {
      return <T>consumeNode(node);
    }

    return parseElement();
  }

  function currentNode(parsingContext: ParsingContext): qt.Node | undefined {
    // If we don't have a cursor or the parsing context isn't reusable, there's nothing to reuse.
    //
    // If there is an outstanding parse error that we've encountered, but not attached to
    // some node, then we cannot get a node from the old source tree.  This is because we
    // want to mark the next node we encounter as being unusable.
    //
    // Note: This may be too conservative.  Perhaps we could reuse the node and set the bit
    // on it (or its leftmost child) as having the error.  For now though, being conservative
    // is nice and likely won't ever affect perf.
    if (!syntaxCursor || !isReusableParsingContext(parsingContext) || parseErrorBeforeNextFinishedNode) {
      return undefined;
    }

    const node = syntaxCursor.currentNode(scanner.getStartPos());

    // Can't reuse a missing node.
    // Can't reuse a node that intersected the change range.
    // Can't reuse a node that contains a parse error.  This is necessary so that we
    // produce the same set of errors again.
    if (nodeIsMissing(node) || node.intersectsChange || containsParseError(node)) {
      return undefined;
    }

    // We can only reuse a node if it was parsed under the same strict mode that we're
    // currently in.  i.e. if we originally parsed a node in non-strict mode, but then
    // the user added 'using strict' at the top of the file, then we can't use that node
    // again as the presence of strict mode may cause us to parse the tokens in the file
    // differently.
    //
    // Note: we *can* reuse tokens when the strict mode changes.  That's because tokens
    // are unaffected by strict mode.  It's just the parser will decide what to do with it
    // differently depending on what mode it is in.
    //
    // This also applies to all our other context flags as well.
    const nodeContextFlags = node.flags & qt.NodeFlags.ContextFlags;
    if (nodeContextFlags !== contextFlags) {
      return undefined;
    }

    // Ok, we have a node that looks like it could be reused.  Now verify that it is valid
    // in the current list parsing context that we're currently at.
    if (!canReuseNode(node, parsingContext)) {
      return undefined;
    }

    if ((node as JSDocContainer).jsDocCache) {
      // jsDocCache may include tags from parent nodes, which might have been modified.
      (node as JSDocContainer).jsDocCache = undefined;
    }

    return node;
  }

  function consumeNode(node: qt.Node) {
    // Move the scanner so it is after the node we just consumed.
    scanner.setTextPos(node.end);
    nextToken();
    return node;
  }

  function isReusableParsingContext(parsingContext: ParsingContext): boolean {
    switch (parsingContext) {
      case ParsingContext.ClassMembers:
      case ParsingContext.SwitchClauses:
      case ParsingContext.SourceElements:
      case ParsingContext.BlockStatements:
      case ParsingContext.SwitchClauseStatements:
      case ParsingContext.EnumMembers:
      case ParsingContext.TypeMembers:
      case ParsingContext.VariableDeclarations:
      case ParsingContext.JSDocParameters:
      case ParsingContext.Parameters:
        return true;
    }
    return false;
  }

  function canReuseNode(node: qt.Node, parsingContext: ParsingContext): boolean {
    switch (parsingContext) {
      case ParsingContext.ClassMembers:
        return isReusableClassMember(node);

      case ParsingContext.SwitchClauses:
        return isReusableSwitchClause(node);

      case ParsingContext.SourceElements:
      case ParsingContext.BlockStatements:
      case ParsingContext.SwitchClauseStatements:
        return isReusableStatement(node);

      case ParsingContext.EnumMembers:
        return isReusableEnumMember(node);

      case ParsingContext.TypeMembers:
        return isReusableTypeMember(node);

      case ParsingContext.VariableDeclarations:
        return isReusableVariableDeclaration(node);

      case ParsingContext.JSDocParameters:
      case ParsingContext.Parameters:
        return isReusableParameter(node);

      // Any other lists we do not care about reusing nodes in.  But feel free to add if
      // you can do so safely.  Danger areas involve nodes that may involve speculative
      // parsing.  If speculative parsing is involved with the node, then the range the
      // parser reached while looking ahead might be in the edited range (see the example
      // in canReuseVariableDeclaratorNode for a good case of this).

      // case ParsingContext.HeritageClauses:
      // This would probably be safe to reuse.  There is no speculative parsing with
      // heritage clauses.

      // case ParsingContext.TypeParameters:
      // This would probably be safe to reuse.  There is no speculative parsing with
      // type parameters.  Note that that's because type *parameters* only occur in
      // unambiguous *type* contexts.  While type *arguments* occur in very ambiguous
      // *expression* contexts.

      // case ParsingContext.TupleElementTypes:
      // This would probably be safe to reuse.  There is no speculative parsing with
      // tuple types.

      // Technically, type argument list types are probably safe to reuse.  While
      // speculative parsing is involved with them (since type argument lists are only
      // produced from speculative parsing a < as a type argument list), we only have
      // the types because speculative parsing succeeded.  Thus, the lookahead never
      // went past the end of the list and rewound.
      // case ParsingContext.TypeArguments:

      // Note: these are almost certainly not safe to ever reuse.  Expressions commonly
      // need a large amount of lookahead, and we should not reuse them as they may
      // have actually intersected the edit.
      // case ParsingContext.ArgumentExpressions:

      // This is not safe to reuse for the same reason as the 'AssignmentExpression'
      // cases.  i.e. a property assignment may end with an expression, and thus might
      // have lookahead far beyond it's old node.
      // case ParsingContext.ObjectLiteralMembers:

      // This is probably not safe to reuse.  There can be speculative parsing with
      // type names in a heritage clause.  There can be generic names in the type
      // name list, and there can be left hand side expressions (which can have type
      // arguments.)
      // case ParsingContext.HeritageClauseElement:

      // Perhaps safe to reuse, but it's unlikely we'd see more than a dozen attributes
      // on any given element. Same for children.
      // case ParsingContext.JsxAttributes:
      // case ParsingContext.JsxChildren:
    }

    return false;
  }

  function isReusableClassMember(node: qt.Node) {
    if (node) {
      switch (node.kind) {
        case qt.SyntaxKind.Constructor:
        case qt.SyntaxKind.IndexSignature:
        case qt.SyntaxKind.GetAccessor:
        case qt.SyntaxKind.SetAccessor:
        case qt.SyntaxKind.PropertyDeclaration:
        case qt.SyntaxKind.SemicolonClassElement:
          return true;
        case qt.SyntaxKind.MethodDeclaration:
          // Method declarations are not necessarily reusable.  An object-literal
          // may have a method calls "constructor(...)" and we must reparse that
          // into an actual .ConstructorDeclaration.
          const methodDeclaration = node;
          const nameIsConstructor = methodDeclaration.name.kind === qt.SyntaxKind.Identifier && methodDeclaration.name.originalKeywordKind === qt.SyntaxKind.ConstructorKeyword;

          return !nameIsConstructor;
      }
    }

    return false;
  }

  function isReusableSwitchClause(node: qt.Node) {
    if (node) {
      switch (node.kind) {
        case qt.SyntaxKind.CaseClause:
        case qt.SyntaxKind.DefaultClause:
          return true;
      }
    }

    return false;
  }

  function isReusableStatement(node: qt.Node) {
    if (node) {
      switch (node.kind) {
        case qt.SyntaxKind.FunctionDeclaration:
        case qt.SyntaxKind.VariableStatement:
        case qt.SyntaxKind.Block:
        case qt.SyntaxKind.IfStatement:
        case qt.SyntaxKind.ExpressionStatement:
        case qt.SyntaxKind.ThrowStatement:
        case qt.SyntaxKind.ReturnStatement:
        case qt.SyntaxKind.SwitchStatement:
        case qt.SyntaxKind.BreakStatement:
        case qt.SyntaxKind.ContinueStatement:
        case qt.SyntaxKind.ForInStatement:
        case qt.SyntaxKind.ForOfStatement:
        case qt.SyntaxKind.ForStatement:
        case qt.SyntaxKind.WhileStatement:
        case qt.SyntaxKind.WithStatement:
        case qt.SyntaxKind.EmptyStatement:
        case qt.SyntaxKind.TryStatement:
        case qt.SyntaxKind.LabeledStatement:
        case qt.SyntaxKind.DoStatement:
        case qt.SyntaxKind.DebuggerStatement:
        case qt.SyntaxKind.ImportDeclaration:
        case qt.SyntaxKind.ImportEqualsDeclaration:
        case qt.SyntaxKind.ExportDeclaration:
        case qt.SyntaxKind.ExportAssignment:
        case qt.SyntaxKind.ModuleDeclaration:
        case qt.SyntaxKind.ClassDeclaration:
        case qt.SyntaxKind.InterfaceDeclaration:
        case qt.SyntaxKind.EnumDeclaration:
        case qt.SyntaxKind.TypeAliasDeclaration:
          return true;
      }
    }

    return false;
  }

  function isReusableEnumMember(node: qt.Node) {
    return node.kind === qt.SyntaxKind.EnumMember;
  }

  function isReusableTypeMember(node: qt.Node) {
    if (node) {
      switch (node.kind) {
        case qt.SyntaxKind.ConstructSignature:
        case qt.SyntaxKind.MethodSignature:
        case qt.SyntaxKind.IndexSignature:
        case qt.SyntaxKind.PropertySignature:
        case qt.SyntaxKind.CallSignature:
          return true;
      }
    }

    return false;
  }

  function isReusableVariableDeclaration(node: qt.Node) {
    if (node.kind !== qt.SyntaxKind.VariableDeclaration) {
      return false;
    }

    // Very subtle incremental parsing bug.  Consider the following code:
    //
    //      let v = new List < A, B
    //
    // This is actually legal code.  It's a list of variable declarators "v = new List<A"
    // on one side and "B" on the other. If you then change that to:
    //
    //      let v = new List < A, B >()
    //
    // then we have a problem.  "v = new List<A" doesn't intersect the change range, so we
    // start reparsing at "B" and we completely fail to handle this properly.
    //
    // In order to prevent this, we do not allow a variable declarator to be reused if it
    // has an initializer.
    const variableDeclarator = node;
    return variableDeclarator.initializer === undefined;
  }

  function isReusableParameter(node: qt.Node) {
    if (node.kind !== qt.SyntaxKind.Parameter) {
      return false;
    }

    // See the comment in isReusableVariableDeclaration for why we do this.
    const parameter = node;
    return parameter.initializer === undefined;
  }

  // Returns true if we should abort parsing.
  function abortParsingListOrMoveToNextToken(kind: ParsingContext) {
    parseErrorAtCurrentToken(parsingContextErrors(kind));
    if (isInSomeParsingContext()) {
      return true;
    }

    nextToken();
    return false;
  }

  function parsingContextErrors(context: ParsingContext): qt.DiagnosticMessage {
    switch (context) {
      case ParsingContext.SourceElements:
        return Diagnostics.Declaration_or_statement_expected;
      case ParsingContext.BlockStatements:
        return Diagnostics.Declaration_or_statement_expected;
      case ParsingContext.SwitchClauses:
        return Diagnostics.case_or_default_expected;
      case ParsingContext.SwitchClauseStatements:
        return Diagnostics.Statement_expected;
      case ParsingContext.RestProperties: // fallthrough
      case ParsingContext.TypeMembers:
        return Diagnostics.Property_or_signature_expected;
      case ParsingContext.ClassMembers:
        return Diagnostics.Unexpected_token_A_constructor_method_accessor_or_property_was_expected;
      case ParsingContext.EnumMembers:
        return Diagnostics.Enum_member_expected;
      case ParsingContext.HeritageClauseElement:
        return Diagnostics.Expression_expected;
      case ParsingContext.VariableDeclarations:
        return Diagnostics.Variable_declaration_expected;
      case ParsingContext.ObjectBindingElements:
        return Diagnostics.Property_destructuring_pattern_expected;
      case ParsingContext.ArrayBindingElements:
        return Diagnostics.Array_element_destructuring_pattern_expected;
      case ParsingContext.ArgumentExpressions:
        return Diagnostics.Argument_expression_expected;
      case ParsingContext.ObjectLiteralMembers:
        return Diagnostics.Property_assignment_expected;
      case ParsingContext.ArrayLiteralMembers:
        return Diagnostics.Expression_or_comma_expected;
      case ParsingContext.JSDocParameters:
        return Diagnostics.Parameter_declaration_expected;
      case ParsingContext.Parameters:
        return Diagnostics.Parameter_declaration_expected;
      case ParsingContext.TypeParameters:
        return Diagnostics.Type_parameter_declaration_expected;
      case ParsingContext.TypeArguments:
        return Diagnostics.Type_argument_expected;
      case ParsingContext.TupleElementTypes:
        return Diagnostics.Type_expected;
      case ParsingContext.HeritageClauses:
        return Diagnostics.Unexpected_token_expected;
      case ParsingContext.ImportOrExportSpecifiers:
        return Diagnostics.Identifier_expected;
      case ParsingContext.JsxAttributes:
        return Diagnostics.Identifier_expected;
      case ParsingContext.JsxChildren:
        return Diagnostics.Identifier_expected;
      default:
        return undefined!; // TODO: GH#18217 `default: Debug.assertNever(context);`
    }
  }

  // Parses a comma-delimited list of elements
  function parseDelimitedList<T extends qt.Node>(kind: ParsingContext, parseElement: () => T, considerSemicolonAsDelimiter?: boolean): qt.NodeArray<T> {
    const saveParsingContext = parsingContext;
    parsingContext |= 1 << kind;
    const list = [];
    const listPos = getNodePos();

    let commaStart = -1; // Meaning the previous token was not a comma
    while (true) {
      if (isListElement(kind, /*inErrorRecovery*/ false)) {
        const startPos = scanner.getStartPos();
        list.push(parseListElement(kind, parseElement));
        commaStart = scanner.getTokenPos();

        if (parseOptional(qt.SyntaxKind.CommaToken)) {
          // No need to check for a zero length node since we know we parsed a comma
          continue;
        }

        commaStart = -1; // Back to the state where the last token was not a comma
        if (isListTerminator(kind)) {
          break;
        }

        // We didn't get a comma, and the list wasn't terminated, explicitly parse
        // out a comma so we give a good error message.
        parseExpected(qt.SyntaxKind.CommaToken, getExpectedCommaDiagnostic(kind));

        // If the token was a semicolon, and the caller allows that, then skip it and
        // continue.  This ensures we get back on track and don't result in tons of
        // parse errors.  For example, this can happen when people do things like use
        // a semicolon to delimit object literal members.   Note: we'll have already
        // reported an error when we called parseExpected above.
        if (considerSemicolonAsDelimiter && token() === qt.SyntaxKind.SemicolonToken && !scanner.hasPrecedingLineBreak()) {
          nextToken();
        }
        if (startPos === scanner.getStartPos()) {
          // What we're parsing isn't actually remotely recognizable as a element and we've consumed no tokens whatsoever
          // Consume a token to advance the parser in some way and avoid an infinite loop
          // This can happen when we're speculatively parsing parenthesized expressions which we think may be arrow functions,
          // or when a modifier keyword which is disallowed as a parameter name (ie, `static` in strict mode) is supplied
          nextToken();
        }
        continue;
      }

      if (isListTerminator(kind)) {
        break;
      }

      if (abortParsingListOrMoveToNextToken(kind)) {
        break;
      }
    }

    parsingContext = saveParsingContext;
    const result = createNodeArray(list, listPos);
    // Recording the trailing comma is deliberately done after the previous
    // loop, and not just if we see a list terminator. This is because the list
    // may have ended incorrectly, but it is still important to know if there
    // was a trailing comma.
    // Check if the last token was a comma.
    if (commaStart >= 0) {
      // Always preserve a trailing comma by marking it on the NodeArray
      result.hasTrailingComma = true;
    }
    return result;
  }

  function getExpectedCommaDiagnostic(kind: ParsingContext) {
    return kind === ParsingContext.EnumMembers ? Diagnostics.An_enum_member_name_must_be_followed_by_a_or : undefined;
  }

  interface MissingList<T extends qt.Node> extends qt.NodeArray<T> {
    isMissingList: true;
  }

  function createMissingList<T extends qt.Node>(): MissingList<T> {
    const list = createNodeArray<T>([], getNodePos()) as MissingList<T>;
    list.isMissingList = true;
    return list;
  }

  function isMissingList(arr: qt.NodeArray<qt.Node>): boolean {
    return !!(arr as MissingList<qt.Node>).isMissingList;
  }

  function parseBracketedList<T extends qt.Node>(kind: ParsingContext, parseElement: () => T, open: qt.SyntaxKind, close: qt.SyntaxKind): qt.NodeArray<T> {
    if (parseExpected(open)) {
      const result = parseDelimitedList(kind, parseElement);
      parseExpected(close);
      return result;
    }

    return createMissingList<T>();
  }

  function parseEntityName(allowReservedWords: boolean, diagnosticMessage?: qt.DiagnosticMessage): EntityName {
    let entity: EntityName = allowReservedWords ? parseIdentifierName(diagnosticMessage) : parseIdentifier(diagnosticMessage);
    let dotPos = scanner.getStartPos();
    while (parseOptional(qt.SyntaxKind.DotToken)) {
      if (token() === qt.SyntaxKind.LessThanToken) {
        // the entity is part of a JSDoc-style generic, so record the trailing dot for later error reporting
        entity.jsdocDotPos = dotPos;
        break;
      }
      dotPos = scanner.getStartPos();
      entity = createQualifiedName(entity, parseRightSideOfDot(allowReservedWords, /* allowPrivateIdentifiers */ false) as qt.Identifier);
    }
    return entity;
  }

  function createQualifiedName(entity: EntityName, name: qt.Identifier): QualifiedName {
    const node = createNode(qt.SyntaxKind.QualifiedName, entity.pos) as QualifiedName;
    node.left = entity;
    node.right = name;
    return finishNode(node);
  }

  function parseRightSideOfDot(allowIdentifierNames: boolean, allowPrivateIdentifiers: boolean): qt.Identifier | PrivateIdentifier {
    // Technically a keyword is valid here as all identifiers and keywords are identifier names.
    // However, often we'll encounter this in error situations when the identifier or keyword
    // is actually starting another valid construct.
    //
    // So, we check for the following specific case:
    //
    //      name.
    //      identifierOrKeyword identifierNameOrKeyword
    //
    // Note: the newlines are important here.  For example, if that above code
    // were rewritten into:
    //
    //      name.identifierOrKeyword
    //      identifierNameOrKeyword
    //
    // Then we would consider it valid.  That's because ASI would take effect and
    // the code would be implicitly: "name.identifierOrKeyword; identifierNameOrKeyword".
    // In the first case though, ASI will not take effect because there is not a
    // line terminator after the identifier or keyword.
    if (scanner.hasPrecedingLineBreak() && tokenIsIdentifierOrKeyword(token())) {
      const matchesPattern = lookAhead(nextTokenIsIdentifierOrKeywordOnSameLine);

      if (matchesPattern) {
        // Report that we need an identifier.  However, report it right after the dot,
        // and not on the next token.  This is because the next token might actually
        // be an identifier and the error would be quite confusing.
        return createMissingNode<qt.Identifier>(qt.SyntaxKind.Identifier, /*reportAtCurrentPosition*/ true, Diagnostics.Identifier_expected);
      }
    }

    if (token() === qt.SyntaxKind.PrivateIdentifier) {
      const node = parsePrivateIdentifier();
      return allowPrivateIdentifiers ? node : createMissingNode<qt.Identifier>(qt.SyntaxKind.Identifier, /*reportAtCurrentPosition*/ true, Diagnostics.Identifier_expected);
    }

    return allowIdentifierNames ? parseIdentifierName() : parseIdentifier();
  }

  function parseTemplateExpression(isTaggedTemplate: boolean): TemplateExpression {
    const template = <TemplateExpression>createNode(qt.SyntaxKind.TemplateExpression);

    template.head = parseTemplateHead(isTaggedTemplate);
    Debug.assert(template.head.kind === qt.SyntaxKind.TemplateHead, 'Template head has wrong token kind');

    const list = [];
    const listPos = getNodePos();

    do {
      list.push(parseTemplateSpan(isTaggedTemplate));
    } while (last(list).literal.kind === qt.SyntaxKind.TemplateMiddle);

    template.templateSpans = createNodeArray(list, listPos);

    return finishNode(template);
  }

  function parseTemplateSpan(isTaggedTemplate: boolean): TemplateSpan {
    const span = <TemplateSpan>createNode(qt.SyntaxKind.TemplateSpan);
    span.expression = allowInAnd(parseExpression);

    let literal: TemplateMiddle | TemplateTail;
    if (token() === qt.SyntaxKind.CloseBraceToken) {
      reScanTemplateToken(isTaggedTemplate);
      literal = parseTemplateMiddleOrTemplateTail();
    } else {
      literal = parseExpectedToken(qt.SyntaxKind.TemplateTail, Diagnostics._0_expected, tokenToString(qt.SyntaxKind.CloseBraceToken));
    }

    span.literal = literal;
    return finishNode(span);
  }

  function parseLiteralNode(): LiteralExpression {
    return parseLiteralLikeNode(token());
  }

  function parseTemplateHead(isTaggedTemplate: boolean): TemplateHead {
    if (isTaggedTemplate) {
      reScanTemplateHeadOrNoSubstitutionTemplate();
    }
    const fragment = parseLiteralLikeNode(token());
    Debug.assert(fragment.kind === qt.SyntaxKind.TemplateHead, 'Template head has wrong token kind');
    return fragment;
  }

  function parseTemplateMiddleOrTemplateTail(): TemplateMiddle | TemplateTail {
    const fragment = parseLiteralLikeNode(token());
    Debug.assert(fragment.kind === qt.SyntaxKind.TemplateMiddle || fragment.kind === qt.SyntaxKind.TemplateTail, 'Template fragment has wrong token kind');
    return fragment;
  }

  function parseLiteralLikeNode(kind: qt.SyntaxKind): LiteralLikeNode {
    const node = <LiteralLikeNode>createNode(kind);
    node.text = scanner.getTokenValue();
    switch (kind) {
      case qt.SyntaxKind.NoSubstitutionTemplateLiteral:
      case qt.SyntaxKind.TemplateHead:
      case qt.SyntaxKind.TemplateMiddle:
      case qt.SyntaxKind.TemplateTail:
        const isLast = kind === qt.SyntaxKind.NoSubstitutionTemplateLiteral || kind === qt.SyntaxKind.TemplateTail;
        const tokenText = scanner.getTokenText();
        node.rawText = tokenText.substring(1, tokenText.length - (scanner.isUnterminated() ? 0 : isLast ? 1 : 2));
        break;
    }

    if (scanner.hasExtendedUnicodeEscape()) {
      node.hasExtendedUnicodeEscape = true;
    }

    if (scanner.isUnterminated()) {
      node.isUnterminated = true;
    }

    // Octal literals are not allowed in strict mode or ES5
    // Note that theoretically the following condition would hold true literals like 009,
    // which is not octal.But because of how the scanner separates the tokens, we would
    // never get a token like this. Instead, we would get 00 and 9 as two separate tokens.
    // We also do not need to check for negatives because any prefix operator would be part of a
    // parent unary expression.
    if (node.kind === qt.SyntaxKind.NumericLiteral) {
      node.numericLiteralFlags = scanner.getTokenFlags() & TokenFlags.NumericLiteralFlags;
    }

    if (isTemplateLiteralKind(node.kind)) {
      (<TemplateHead | TemplateMiddle | TemplateTail | NoSubstitutionTemplateLiteral>node).templateFlags = scanner.getTokenFlags() & TokenFlags.ContainsInvalidEscape;
    }

    nextToken();
    finishNode(node);

    return node;
  }

  // TYPES

  function parseTypeReference(): TypeReferenceNode {
    const node = <TypeReferenceNode>createNode(qt.SyntaxKind.TypeReference);
    node.typeName = parseEntityName(/*allowReservedWords*/ true, Diagnostics.Type_expected);
    if (!scanner.hasPrecedingLineBreak() && reScanLessThanToken() === qt.SyntaxKind.LessThanToken) {
      node.typeArguments = parseBracketedList(ParsingContext.TypeArguments, parseType, qt.SyntaxKind.LessThanToken, qt.SyntaxKind.GreaterThanToken);
    }
    return finishNode(node);
  }

  // If true, we should abort parsing an error function.
  function typeHasArrowFunctionBlockingParseError(node: TypeNode): boolean {
    switch (node.kind) {
      case qt.SyntaxKind.TypeReference:
        return nodeIsMissing(node.typeName);
      case qt.SyntaxKind.FunctionType:
      case qt.SyntaxKind.ConstructorType: {
        const { parameters, type } = node;
        return isMissingList(parameters) || typeHasArrowFunctionBlockingParseError(type);
      }
      case qt.SyntaxKind.ParenthesizedType:
        return typeHasArrowFunctionBlockingParseError(node.type);
      default:
        return false;
    }
  }

  function parseThisTypePredicate(lhs: ThisTypeNode): TypePredicateNode {
    nextToken();
    const node = createNode(qt.SyntaxKind.TypePredicate, lhs.pos) as TypePredicateNode;
    node.parameterName = lhs;
    node.type = parseType();
    return finishNode(node);
  }

  function parseThisTypeNode(): ThisTypeNode {
    const node = createNode(qt.SyntaxKind.ThisType) as ThisTypeNode;
    nextToken();
    return finishNode(node);
  }

  function parseJSDocAllType(postFixEquals: boolean): JSDocAllType | JSDocOptionalType {
    const result = createNode(qt.SyntaxKind.JSDocAllType) as JSDocAllType;
    if (postFixEquals) {
      return createPostfixType(qt.SyntaxKind.JSDocOptionalType, result) as JSDocOptionalType;
    } else {
      nextToken();
    }
    return finishNode(result);
  }

  function parseJSDocNonNullableType(): TypeNode {
    const result = createNode(qt.SyntaxKind.JSDocNonNullableType) as JSDocNonNullableType;
    nextToken();
    result.type = parseNonArrayType();
    return finishNode(result);
  }

  function parseJSDocUnknownOrNullableType(): JSDocUnknownType | JSDocNullableType {
    const pos = scanner.getStartPos();
    // skip the ?
    nextToken();

    // Need to lookahead to decide if this is a nullable or unknown type.

    // Here are cases where we'll pick the unknown type:
    //
    //      Foo(?,
    //      { a: ? }
    //      Foo(?)
    //      Foo<?>
    //      Foo(?=
    //      (?|
    if (token() === qt.SyntaxKind.CommaToken || token() === qt.SyntaxKind.CloseBraceToken || token() === qt.SyntaxKind.CloseParenToken || token() === qt.SyntaxKind.GreaterThanToken || token() === qt.SyntaxKind.EqualsToken || token() === qt.SyntaxKind.BarToken) {
      const result = <JSDocUnknownType>createNode(qt.SyntaxKind.JSDocUnknownType, pos);
      return finishNode(result);
    } else {
      const result = <JSDocNullableType>createNode(qt.SyntaxKind.JSDocNullableType, pos);
      result.type = parseType();
      return finishNode(result);
    }
  }

  function parseJSDocFunctionType(): JSDocFunctionType | TypeReferenceNode {
    if (lookAhead(nextTokenIsOpenParen)) {
      const result = <JSDocFunctionType>createNodeWithJSDoc(qt.SyntaxKind.JSDocFunctionType);
      nextToken();
      fillSignature(qt.SyntaxKind.ColonToken, SignatureFlags.Type | SignatureFlags.JSDoc, result);
      return finishNode(result);
    }
    const node = <TypeReferenceNode>createNode(qt.SyntaxKind.TypeReference);
    node.typeName = parseIdentifierName();
    return finishNode(node);
  }

  function parseJSDocParameter(): ParameterDeclaration {
    const parameter = createNode(qt.SyntaxKind.Parameter) as ParameterDeclaration;
    if (token() === qt.SyntaxKind.ThisKeyword || token() === qt.SyntaxKind.NewKeyword) {
      parameter.name = parseIdentifierName();
      parseExpected(qt.SyntaxKind.ColonToken);
    }
    parameter.type = parseJSDocType();
    return finishNode(parameter);
  }

  function parseJSDocType(): TypeNode {
    scanner.setInJSDocType(true);
    const moduleSpecifier = parseOptionalToken(qt.SyntaxKind.ModuleKeyword);
    if (moduleSpecifier) {
      const moduleTag = createNode(qt.SyntaxKind.JSDocNamepathType, moduleSpecifier.pos) as JSDocNamepathType;
      terminate: while (true) {
        switch (token()) {
          case qt.SyntaxKind.CloseBraceToken:
          case qt.SyntaxKind.EndOfFileToken:
          case qt.SyntaxKind.CommaToken:
          case qt.SyntaxKind.WhitespaceTrivia:
            break terminate;
          default:
            nextTokenJSDoc();
        }
      }

      scanner.setInJSDocType(false);
      return finishNode(moduleTag);
    }

    const dotdotdot = parseOptionalToken(qt.SyntaxKind.DotDotDotToken);
    let type = parseTypeOrTypePredicate();
    scanner.setInJSDocType(false);
    if (dotdotdot) {
      const variadic = createNode(qt.SyntaxKind.JSDocVariadicType, dotdotdot.pos) as JSDocVariadicType;
      variadic.type = type;
      type = finishNode(variadic);
    }
    if (token() === qt.SyntaxKind.EqualsToken) {
      return createPostfixType(qt.SyntaxKind.JSDocOptionalType, type);
    }
    return type;
  }

  function parseTypeQuery(): TypeQueryNode {
    const node = <TypeQueryNode>createNode(qt.SyntaxKind.TypeQuery);
    parseExpected(qt.SyntaxKind.TypeOfKeyword);
    node.exprName = parseEntityName(/*allowReservedWords*/ true);
    return finishNode(node);
  }

  function parseTypeParameter(): TypeParameterDeclaration {
    const node = <TypeParameterDeclaration>createNode(qt.SyntaxKind.TypeParameter);
    node.name = parseIdentifier();
    if (parseOptional(qt.SyntaxKind.ExtendsKeyword)) {
      // It's not uncommon for people to write improper constraints to a generic.  If the
      // user writes a constraint that is an expression and not an actual type, then parse
      // it out as an expression (so we can recover well), but report that a type is needed
      // instead.
      if (isStartOfType() || !isStartOfExpression()) {
        node.constraint = parseType();
      } else {
        // It was not a type, and it looked like an expression.  Parse out an expression
        // here so we recover well.  Note: it is important that we call parseUnaryExpression
        // and not parseExpression here.  If the user has:
        //
        //      <T extends "">
        //
        // We do *not* want to consume the `>` as we're consuming the expression for "".
        node.expression = parseUnaryExpressionOrHigher();
      }
    }

    if (parseOptional(qt.SyntaxKind.EqualsToken)) {
      node.default = parseType();
    }

    return finishNode(node);
  }

  function parseTypeParameters(): qt.NodeArray<TypeParameterDeclaration> | undefined {
    if (token() === qt.SyntaxKind.LessThanToken) {
      return parseBracketedList(ParsingContext.TypeParameters, parseTypeParameter, qt.SyntaxKind.LessThanToken, qt.SyntaxKind.GreaterThanToken);
    }
  }

  function parseParameterType(): TypeNode | undefined {
    if (parseOptional(qt.SyntaxKind.ColonToken)) {
      return parseType();
    }

    return undefined;
  }

  function isStartOfParameter(isJSDocParameter: boolean): boolean {
    return token() === qt.SyntaxKind.DotDotDotToken || isIdentifierOrPrivateIdentifierOrPattern() || isModifierKind(token()) || token() === qt.SyntaxKind.AtToken || isStartOfType(/*inStartOfParameter*/ !isJSDocParameter);
  }

  function parseParameter(): ParameterDeclaration {
    const node = <qt.ParameterDeclaration>createNodeWithJSDoc(qt.SyntaxKind.Parameter);
    if (token() === qt.SyntaxKind.ThisKeyword) {
      node.name = createIdentifier(/*isIdentifier*/ true);
      node.type = parseParameterType();
      return finishNode(node);
    }

    node.decorators = parseDecorators();
    node.modifiers = parseModifiers();
    node.dotDotDotToken = parseOptionalToken(qt.SyntaxKind.DotDotDotToken);

    // FormalParameter [Yield,Await]:
    //      qt.BindingElement[?Yield,?Await]
    node.name = parseIdentifierOrPattern(Diagnostics.Private_identifiers_cannot_be_used_as_parameters);
    if (getFullWidth(node.name) === 0 && !node.modifiers && isModifierKind(token())) {
      // in cases like
      // 'use strict'
      // function foo(static)
      // isParameter('static') === true, because of isModifier('static')
      // however 'static' is not a legal identifier in a strict mode.
      // so result of this function will be ParameterDeclaration (flags = 0, name = missing, type = undefined, initializer = undefined)
      // and current token will not change => parsing of the enclosing parameter list will last till the end of time (or OOM)
      // to avoid this we'll advance cursor to the next token.
      nextToken();
    }

    node.questionToken = parseOptionalToken(qt.SyntaxKind.QuestionToken);
    node.type = parseParameterType();
    node.initializer = parseInitializer();

    return finishNode(node);
  }

  /**
   * Note: If returnToken is EqualsGreaterThanToken, `signature.type` will always be defined.
   * @returns If return type parsing succeeds
   */
  function fillSignature(returnToken: qt.SyntaxKind.ColonToken | qt.SyntaxKind.EqualsGreaterThanToken, flags: SignatureFlags, signature: SignatureDeclaration): boolean {
    if (!(flags & SignatureFlags.JSDoc)) {
      signature.typeParameters = parseTypeParameters();
    }
    const parametersParsedSuccessfully = parseParameterList(signature, flags);
    if (shouldParseReturnType(returnToken, !!(flags & SignatureFlags.Type))) {
      signature.type = parseTypeOrTypePredicate();
      if (typeHasArrowFunctionBlockingParseError(signature.type)) return false;
    }
    return parametersParsedSuccessfully;
  }

  function shouldParseReturnType(returnToken: qt.SyntaxKind.ColonToken | qt.SyntaxKind.EqualsGreaterThanToken, isType: boolean): boolean {
    if (returnToken === qt.SyntaxKind.EqualsGreaterThanToken) {
      parseExpected(returnToken);
      return true;
    } else if (parseOptional(qt.SyntaxKind.ColonToken)) {
      return true;
    } else if (isType && token() === qt.SyntaxKind.EqualsGreaterThanToken) {
      // This is easy to get backward, especially in type contexts, so parse the type anyway
      parseErrorAtCurrentToken(Diagnostics._0_expected, tokenToString(qt.SyntaxKind.ColonToken));
      nextToken();
      return true;
    }
    return false;
  }

  // Returns true on success.
  function parseParameterList(signature: SignatureDeclaration, flags: SignatureFlags): boolean {
    // FormalParameters [Yield,Await]: (modified)
    //      [empty]
    //      FormalParameterList[?Yield,Await]
    //
    // FormalParameter[Yield,Await]: (modified)
    //      qt.BindingElement[?Yield,Await]
    //
    // qt.BindingElement [Yield,Await]: (modified)
    //      SingleNameBinding[?Yield,?Await]
    //      qt.BindingPattern[?Yield,?Await]Initializer [In, ?Yield,?Await] opt
    //
    // SingleNameBinding [Yield,Await]:
    //      BindingIdentifier[?Yield,?Await]Initializer [In, ?Yield,?Await] opt
    if (!parseExpected(qt.SyntaxKind.OpenParenToken)) {
      signature.parameters = createMissingList<qt.ParameterDeclaration>();
      return false;
    }

    const savedYieldContext = inYieldContext();
    const savedAwaitContext = inAwaitContext();

    setYieldContext(!!(flags & SignatureFlags.Yield));
    setAwaitContext(!!(flags & SignatureFlags.Await));

    signature.parameters = flags & SignatureFlags.JSDoc ? parseDelimitedList(ParsingContext.JSDocParameters, parseJSDocParameter) : parseDelimitedList(ParsingContext.Parameters, parseParameter);

    setYieldContext(savedYieldContext);
    setAwaitContext(savedAwaitContext);

    return parseExpected(qt.SyntaxKind.CloseParenToken);
  }

  function parseTypeMemberSemicolon() {
    // We allow type members to be separated by commas or (possibly ASI) semicolons.
    // First check if it was a comma.  If so, we're done with the member.
    if (parseOptional(qt.SyntaxKind.CommaToken)) {
      return;
    }

    // Didn't have a comma.  We must have a (possible ASI) semicolon.
    parseSemicolon();
  }

  function parseSignatureMember(kind: qt.SyntaxKind.CallSignature | qt.SyntaxKind.ConstructSignature): CallSignatureDeclaration | ConstructSignatureDeclaration {
    const node = <CallSignatureDeclaration | ConstructSignatureDeclaration>createNodeWithJSDoc(kind);
    if (kind === qt.SyntaxKind.ConstructSignature) {
      parseExpected(qt.SyntaxKind.NewKeyword);
    }
    fillSignature(qt.SyntaxKind.ColonToken, SignatureFlags.Type, node);
    parseTypeMemberSemicolon();
    return finishNode(node);
  }

  function isIndexSignature(): boolean {
    return token() === qt.SyntaxKind.OpenBracketToken && lookAhead(isUnambiguouslyIndexSignature);
  }

  function isUnambiguouslyIndexSignature() {
    // The only allowed sequence is:
    //
    //   [id:
    //
    // However, for error recovery, we also check the following cases:
    //
    //   [...
    //   [id,
    //   [id?,
    //   [id?:
    //   [id?]
    //   [public id
    //   [private id
    //   [protected id
    //   []
    //
    nextToken();
    if (token() === qt.SyntaxKind.DotDotDotToken || token() === qt.SyntaxKind.CloseBracketToken) {
      return true;
    }

    if (isModifierKind(token())) {
      nextToken();
      if (isIdentifier()) {
        return true;
      }
    } else if (!isIdentifier()) {
      return false;
    } else {
      // Skip the identifier
      nextToken();
    }

    // A colon signifies a well formed indexer
    // A comma should be a badly formed indexer because comma expressions are not allowed
    // in computed properties.
    if (token() === qt.SyntaxKind.ColonToken || token() === qt.SyntaxKind.CommaToken) {
      return true;
    }

    // Question mark could be an indexer with an optional property,
    // or it could be a conditional expression in a computed property.
    if (token() !== qt.SyntaxKind.QuestionToken) {
      return false;
    }

    // If any of the following tokens are after the question mark, it cannot
    // be a conditional expression, so treat it as an indexer.
    nextToken();
    return token() === qt.SyntaxKind.ColonToken || token() === qt.SyntaxKind.CommaToken || token() === qt.SyntaxKind.CloseBracketToken;
  }

  function parseIndexSignatureDeclaration(node: IndexSignatureDeclaration): IndexSignatureDeclaration {
    node.kind = qt.SyntaxKind.IndexSignature;
    node.parameters = parseBracketedList(ParsingContext.Parameters, parseParameter, qt.SyntaxKind.OpenBracketToken, qt.SyntaxKind.CloseBracketToken);
    node.type = parseTypeAnnotation();
    parseTypeMemberSemicolon();
    return finishNode(node);
  }

  function parsePropertyOrMethodSignature(node: PropertySignature | MethodSignature): PropertySignature | MethodSignature {
    node.name = parsePropertyName();
    node.questionToken = parseOptionalToken(qt.SyntaxKind.QuestionToken);
    if (token() === qt.SyntaxKind.OpenParenToken || token() === qt.SyntaxKind.LessThanToken) {
      node.kind = qt.SyntaxKind.MethodSignature;
      // Method signatures don't exist in expression contexts.  So they have neither
      // [Yield] nor [Await]
      fillSignature(qt.SyntaxKind.ColonToken, SignatureFlags.Type, <MethodSignature>node);
    } else {
      node.kind = qt.SyntaxKind.PropertySignature;
      node.type = parseTypeAnnotation();
      if (token() === qt.SyntaxKind.EqualsToken) {
        // Although type literal properties cannot not have initializers, we attempt
        // to parse an initializer so we can report in the checker that an interface
        // property or type literal property cannot have an initializer.
        (<qt.PropertySignature>node).initializer = parseInitializer();
      }
    }
    parseTypeMemberSemicolon();
    return finishNode(node);
  }

  function isTypeMemberStart(): boolean {
    // Return true if we have the start of a signature member
    if (token() === qt.SyntaxKind.OpenParenToken || token() === qt.SyntaxKind.LessThanToken) {
      return true;
    }
    let idToken = false;
    // Eat up all modifiers, but hold on to the last one in case it is actually an identifier
    while (isModifierKind(token())) {
      idToken = true;
      nextToken();
    }
    // Index signatures and computed property names are type members
    if (token() === qt.SyntaxKind.OpenBracketToken) {
      return true;
    }
    // Try to get the first property-like token following all modifiers
    if (isLiteralPropertyName()) {
      idToken = true;
      nextToken();
    }
    // If we were able to get any potential identifier, check that it is
    // the start of a member declaration
    if (idToken) {
      return token() === qt.SyntaxKind.OpenParenToken || token() === qt.SyntaxKind.LessThanToken || token() === qt.SyntaxKind.QuestionToken || token() === qt.SyntaxKind.ColonToken || token() === qt.SyntaxKind.CommaToken || canParseSemicolon();
    }
    return false;
  }

  function parseTypeMember(): TypeElement {
    if (token() === qt.SyntaxKind.OpenParenToken || token() === qt.SyntaxKind.LessThanToken) {
      return parseSignatureMember(qt.SyntaxKind.CallSignature);
    }
    if (token() === qt.SyntaxKind.NewKeyword && lookAhead(nextTokenIsOpenParenOrLessThan)) {
      return parseSignatureMember(qt.SyntaxKind.ConstructSignature);
    }
    const node = <TypeElement>createNodeWithJSDoc(qt.SyntaxKind.Unknown);
    node.modifiers = parseModifiers();
    if (isIndexSignature()) {
      return parseIndexSignatureDeclaration(node);
    }
    return parsePropertyOrMethodSignature(<PropertySignature | MethodSignature>node);
  }

  function nextTokenIsOpenParenOrLessThan() {
    nextToken();
    return token() === qt.SyntaxKind.OpenParenToken || token() === qt.SyntaxKind.LessThanToken;
  }

  function nextTokenIsDot() {
    return nextToken() === qt.SyntaxKind.DotToken;
  }

  function nextTokenIsOpenParenOrLessThanOrDot() {
    switch (nextToken()) {
      case qt.SyntaxKind.OpenParenToken:
      case qt.SyntaxKind.LessThanToken:
      case qt.SyntaxKind.DotToken:
        return true;
    }
    return false;
  }

  function parseTypeLiteral(): TypeLiteralNode {
    const node = <TypeLiteralNode>createNode(qt.SyntaxKind.TypeLiteral);
    node.members = parseObjectTypeMembers();
    return finishNode(node);
  }

  function parseObjectTypeMembers(): qt.NodeArray<TypeElement> {
    let members: qt.NodeArray<TypeElement>;
    if (parseExpected(qt.SyntaxKind.OpenBraceToken)) {
      members = parseList(ParsingContext.TypeMembers, parseTypeMember);
      parseExpected(qt.SyntaxKind.CloseBraceToken);
    } else {
      members = createMissingList<TypeElement>();
    }

    return members;
  }

  function isStartOfMappedType() {
    nextToken();
    if (token() === qt.SyntaxKind.PlusToken || token() === qt.SyntaxKind.MinusToken) {
      return nextToken() === qt.SyntaxKind.ReadonlyKeyword;
    }
    if (token() === qt.SyntaxKind.ReadonlyKeyword) {
      nextToken();
    }
    return token() === qt.SyntaxKind.OpenBracketToken && nextTokenIsIdentifier() && nextToken() === qt.SyntaxKind.InKeyword;
  }

  function parseMappedTypeParameter() {
    const node = <TypeParameterDeclaration>createNode(qt.SyntaxKind.TypeParameter);
    node.name = parseIdentifier();
    parseExpected(qt.SyntaxKind.InKeyword);
    node.constraint = parseType();
    return finishNode(node);
  }

  function parseMappedType() {
    const node = <MappedTypeNode>createNode(qt.SyntaxKind.MappedType);
    parseExpected(qt.SyntaxKind.OpenBraceToken);
    if (token() === qt.SyntaxKind.ReadonlyKeyword || token() === qt.SyntaxKind.PlusToken || token() === qt.SyntaxKind.MinusToken) {
      node.readonlyToken = parseTokenNode<ReadonlyToken | PlusToken | MinusToken>();
      if (node.readonlyToken.kind !== qt.SyntaxKind.ReadonlyKeyword) {
        parseExpectedToken(qt.SyntaxKind.ReadonlyKeyword);
      }
    }
    parseExpected(qt.SyntaxKind.OpenBracketToken);
    node.typeParameter = parseMappedTypeParameter();
    parseExpected(qt.SyntaxKind.CloseBracketToken);
    if (token() === qt.SyntaxKind.QuestionToken || token() === qt.SyntaxKind.PlusToken || token() === qt.SyntaxKind.MinusToken) {
      node.questionToken = parseTokenNode<QuestionToken | PlusToken | MinusToken>();
      if (node.questionToken.kind !== qt.SyntaxKind.QuestionToken) {
        parseExpectedToken(qt.SyntaxKind.QuestionToken);
      }
    }
    node.type = parseTypeAnnotation();
    parseSemicolon();
    parseExpected(qt.SyntaxKind.CloseBraceToken);
    return finishNode(node);
  }

  function parseTupleElementType() {
    const pos = getNodePos();
    if (parseOptional(qt.SyntaxKind.DotDotDotToken)) {
      const node = <RestTypeNode>createNode(qt.SyntaxKind.RestType, pos);
      node.type = parseType();
      return finishNode(node);
    }
    const type = parseType();
    if (!(contextFlags & qt.NodeFlags.JSDoc) && type.kind === qt.SyntaxKind.JSDocNullableType && type.pos === type.type.pos) {
      type.kind = qt.SyntaxKind.OptionalType;
    }
    return type;
  }

  function isNextTokenColonOrQuestionColon() {
    return nextToken() === qt.SyntaxKind.ColonToken || (token() === qt.SyntaxKind.QuestionToken && nextToken() === qt.SyntaxKind.ColonToken);
  }

  function isTupleElementName() {
    if (token() === qt.SyntaxKind.DotDotDotToken) {
      return tokenIsIdentifierOrKeyword(nextToken()) && isNextTokenColonOrQuestionColon();
    }
    return tokenIsIdentifierOrKeyword(token()) && isNextTokenColonOrQuestionColon();
  }

  function parseTupleElementNameOrTupleElementType() {
    if (lookAhead(isTupleElementName)) {
      const node = <NamedTupleMember>createNode(qt.SyntaxKind.NamedTupleMember);
      node.dotDotDotToken = parseOptionalToken(qt.SyntaxKind.DotDotDotToken);
      node.name = parseIdentifierName();
      node.questionToken = parseOptionalToken(qt.SyntaxKind.QuestionToken);
      parseExpected(qt.SyntaxKind.ColonToken);
      node.type = parseTupleElementType();
      return addJSDocComment(finishNode(node));
    }
    return parseTupleElementType();
  }

  function parseTupleType(): TupleTypeNode {
    const node = <TupleTypeNode>createNode(qt.SyntaxKind.TupleType);
    node.elements = parseBracketedList(ParsingContext.TupleElementTypes, parseTupleElementNameOrTupleElementType, qt.SyntaxKind.OpenBracketToken, qt.SyntaxKind.CloseBracketToken);
    return finishNode(node);
  }

  function parseParenthesizedType(): TypeNode {
    const node = <ParenthesizedTypeNode>createNode(qt.SyntaxKind.ParenthesizedType);
    parseExpected(qt.SyntaxKind.OpenParenToken);
    node.type = parseType();
    parseExpected(qt.SyntaxKind.CloseParenToken);
    return finishNode(node);
  }

  function parseFunctionOrConstructorType(): TypeNode {
    const pos = getNodePos();
    const kind = parseOptional(qt.SyntaxKind.NewKeyword) ? qt.SyntaxKind.ConstructorType : qt.SyntaxKind.FunctionType;
    const node = <FunctionOrConstructorTypeNode>createNodeWithJSDoc(kind, pos);
    fillSignature(qt.SyntaxKind.EqualsGreaterThanToken, SignatureFlags.Type, node);
    return finishNode(node);
  }

  function parseKeywordAndNoDot(): TypeNode | undefined {
    const node = parseTokenNode<TypeNode>();
    return token() === qt.SyntaxKind.DotToken ? undefined : node;
  }

  function parseLiteralTypeNode(negative?: boolean): LiteralTypeNode {
    const node = createNode(qt.SyntaxKind.LiteralType) as LiteralTypeNode;
    let unaryMinusExpression!: PrefixUnaryExpression;
    if (negative) {
      unaryMinusExpression = createNode(qt.SyntaxKind.PrefixUnaryExpression) as PrefixUnaryExpression;
      unaryMinusExpression.operator = qt.SyntaxKind.MinusToken;
      nextToken();
    }
    let expression: BooleanLiteral | LiteralExpression | PrefixUnaryExpression = token() === qt.SyntaxKind.TrueKeyword || token() === qt.SyntaxKind.FalseKeyword ? parseTokenNode<BooleanLiteral>() : parseLiteralLikeNode(token());
    if (negative) {
      unaryMinusExpression.operand = expression;
      finishNode(unaryMinusExpression);
      expression = unaryMinusExpression;
    }
    node.literal = expression;
    return finishNode(node);
  }

  function isStartOfTypeOfImportType() {
    nextToken();
    return token() === qt.SyntaxKind.ImportKeyword;
  }

  function parseImportType(): ImportTypeNode {
    sourceFile.flags |= qt.NodeFlags.PossiblyContainsDynamicImport;
    const node = createNode(qt.SyntaxKind.ImportType) as ImportTypeNode;
    if (parseOptional(qt.SyntaxKind.TypeOfKeyword)) {
      node.isTypeOf = true;
    }
    parseExpected(qt.SyntaxKind.ImportKeyword);
    parseExpected(qt.SyntaxKind.OpenParenToken);
    node.argument = parseType();
    parseExpected(qt.SyntaxKind.CloseParenToken);
    if (parseOptional(qt.SyntaxKind.DotToken)) {
      node.qualifier = parseEntityName(/*allowReservedWords*/ true, Diagnostics.Type_expected);
    }
    if (!scanner.hasPrecedingLineBreak() && reScanLessThanToken() === qt.SyntaxKind.LessThanToken) {
      node.typeArguments = parseBracketedList(ParsingContext.TypeArguments, parseType, qt.SyntaxKind.LessThanToken, qt.SyntaxKind.GreaterThanToken);
    }
    return finishNode(node);
  }

  function nextTokenIsNumericOrBigIntLiteral() {
    nextToken();
    return token() === qt.SyntaxKind.NumericLiteral || token() === qt.SyntaxKind.BigIntLiteral;
  }

  function parseNonArrayType(): TypeNode {
    switch (token()) {
      case qt.SyntaxKind.AnyKeyword:
      case qt.SyntaxKind.UnknownKeyword:
      case qt.SyntaxKind.StringKeyword:
      case qt.SyntaxKind.NumberKeyword:
      case qt.SyntaxKind.BigIntKeyword:
      case qt.SyntaxKind.SymbolKeyword:
      case qt.SyntaxKind.BooleanKeyword:
      case qt.SyntaxKind.UndefinedKeyword:
      case qt.SyntaxKind.NeverKeyword:
      case qt.SyntaxKind.ObjectKeyword:
        // If these are followed by a dot, then parse these out as a dotted type reference instead.
        return tryParse(parseKeywordAndNoDot) || parseTypeReference();
      case qt.SyntaxKind.AsteriskToken:
        return parseJSDocAllType(/*postfixEquals*/ false);
      case qt.SyntaxKind.AsteriskEqualsToken:
        return parseJSDocAllType(/*postfixEquals*/ true);
      case qt.SyntaxKind.QuestionQuestionToken:
        // If there is '??', consider that is prefix '?' in JSDoc type.
        scanner.reScanQuestionToken();
      // falls through
      case qt.SyntaxKind.QuestionToken:
        return parseJSDocUnknownOrNullableType();
      case qt.SyntaxKind.FunctionKeyword:
        return parseJSDocFunctionType();
      case qt.SyntaxKind.ExclamationToken:
        return parseJSDocNonNullableType();
      case qt.SyntaxKind.NoSubstitutionTemplateLiteral:
      case qt.SyntaxKind.StringLiteral:
      case qt.SyntaxKind.NumericLiteral:
      case qt.SyntaxKind.BigIntLiteral:
      case qt.SyntaxKind.TrueKeyword:
      case qt.SyntaxKind.FalseKeyword:
        return parseLiteralTypeNode();
      case qt.SyntaxKind.MinusToken:
        return lookAhead(nextTokenIsNumericOrBigIntLiteral) ? parseLiteralTypeNode(/*negative*/ true) : parseTypeReference();
      case qt.SyntaxKind.VoidKeyword:
      case qt.SyntaxKind.NullKeyword:
        return parseTokenNode<TypeNode>();
      case qt.SyntaxKind.ThisKeyword: {
        const thisKeyword = parseThisTypeNode();
        if (token() === qt.SyntaxKind.IsKeyword && !scanner.hasPrecedingLineBreak()) {
          return parseThisTypePredicate(thisKeyword);
        } else {
          return thisKeyword;
        }
      }
      case qt.SyntaxKind.TypeOfKeyword:
        return lookAhead(isStartOfTypeOfImportType) ? parseImportType() : parseTypeQuery();
      case qt.SyntaxKind.OpenBraceToken:
        return lookAhead(isStartOfMappedType) ? parseMappedType() : parseTypeLiteral();
      case qt.SyntaxKind.OpenBracketToken:
        return parseTupleType();
      case qt.SyntaxKind.OpenParenToken:
        return parseParenthesizedType();
      case qt.SyntaxKind.ImportKeyword:
        return parseImportType();
      case qt.SyntaxKind.AssertsKeyword:
        return lookAhead(nextTokenIsIdentifierOrKeywordOnSameLine) ? parseAssertsTypePredicate() : parseTypeReference();
      default:
        return parseTypeReference();
    }
  }

  function isStartOfType(inStartOfParameter?: boolean): boolean {
    switch (token()) {
      case qt.SyntaxKind.AnyKeyword:
      case qt.SyntaxKind.UnknownKeyword:
      case qt.SyntaxKind.StringKeyword:
      case qt.SyntaxKind.NumberKeyword:
      case qt.SyntaxKind.BigIntKeyword:
      case qt.SyntaxKind.BooleanKeyword:
      case qt.SyntaxKind.ReadonlyKeyword:
      case qt.SyntaxKind.SymbolKeyword:
      case qt.SyntaxKind.UniqueKeyword:
      case qt.SyntaxKind.VoidKeyword:
      case qt.SyntaxKind.UndefinedKeyword:
      case qt.SyntaxKind.NullKeyword:
      case qt.SyntaxKind.ThisKeyword:
      case qt.SyntaxKind.TypeOfKeyword:
      case qt.SyntaxKind.NeverKeyword:
      case qt.SyntaxKind.OpenBraceToken:
      case qt.SyntaxKind.OpenBracketToken:
      case qt.SyntaxKind.LessThanToken:
      case qt.SyntaxKind.BarToken:
      case qt.SyntaxKind.AmpersandToken:
      case qt.SyntaxKind.NewKeyword:
      case qt.SyntaxKind.StringLiteral:
      case qt.SyntaxKind.NumericLiteral:
      case qt.SyntaxKind.BigIntLiteral:
      case qt.SyntaxKind.TrueKeyword:
      case qt.SyntaxKind.FalseKeyword:
      case qt.SyntaxKind.ObjectKeyword:
      case qt.SyntaxKind.AsteriskToken:
      case qt.SyntaxKind.QuestionToken:
      case qt.SyntaxKind.ExclamationToken:
      case qt.SyntaxKind.DotDotDotToken:
      case qt.SyntaxKind.InferKeyword:
      case qt.SyntaxKind.ImportKeyword:
      case qt.SyntaxKind.AssertsKeyword:
        return true;
      case qt.SyntaxKind.FunctionKeyword:
        return !inStartOfParameter;
      case qt.SyntaxKind.MinusToken:
        return !inStartOfParameter && lookAhead(nextTokenIsNumericOrBigIntLiteral);
      case qt.SyntaxKind.OpenParenToken:
        // Only consider '(' the start of a type if followed by ')', '...', an identifier, a modifier,
        // or something that starts a type. We don't want to consider things like '(1)' a type.
        return !inStartOfParameter && lookAhead(isStartOfParenthesizedOrFunctionType);
      default:
        return isIdentifier();
    }
  }

  function isStartOfParenthesizedOrFunctionType() {
    nextToken();
    return token() === qt.SyntaxKind.CloseParenToken || isStartOfParameter(/*isJSDocParameter*/ false) || isStartOfType();
  }

  function parsePostfixTypeOrHigher(): TypeNode {
    let type = parseNonArrayType();
    while (!scanner.hasPrecedingLineBreak()) {
      switch (token()) {
        case qt.SyntaxKind.ExclamationToken:
          type = createPostfixType(qt.SyntaxKind.JSDocNonNullableType, type);
          break;
        case qt.SyntaxKind.QuestionToken:
          // If not in JSDoc and next token is start of a type we have a conditional type
          if (!(contextFlags & qt.NodeFlags.JSDoc) && lookAhead(nextTokenIsStartOfType)) {
            return type;
          }
          type = createPostfixType(qt.SyntaxKind.JSDocNullableType, type);
          break;
        case qt.SyntaxKind.OpenBracketToken:
          parseExpected(qt.SyntaxKind.OpenBracketToken);
          if (isStartOfType()) {
            const node = createNode(qt.SyntaxKind.IndexedAccessType, type.pos) as IndexedAccessTypeNode;
            node.objectType = type;
            node.indexType = parseType();
            parseExpected(qt.SyntaxKind.CloseBracketToken);
            type = finishNode(node);
          } else {
            const node = createNode(qt.SyntaxKind.ArrayType, type.pos) as ArrayTypeNode;
            node.elementType = type;
            parseExpected(qt.SyntaxKind.CloseBracketToken);
            type = finishNode(node);
          }
          break;
        default:
          return type;
      }
    }
    return type;
  }

  function createPostfixType(kind: qt.SyntaxKind, type: TypeNode) {
    nextToken();
    const postfix = createNode(kind, type.pos) as OptionalTypeNode | JSDocOptionalType | JSDocNonNullableType | JSDocNullableType;
    postfix.type = type;
    return finishNode(postfix);
  }

  function parseTypeOperator(operator: qt.SyntaxKind.KeyOfKeyword | qt.SyntaxKind.UniqueKeyword | qt.SyntaxKind.ReadonlyKeyword) {
    const node = <TypeOperatorNode>createNode(qt.SyntaxKind.TypeOperator);
    parseExpected(operator);
    node.operator = operator;
    node.type = parseTypeOperatorOrHigher();
    return finishNode(node);
  }

  function parseInferType(): InferTypeNode {
    const node = <InferTypeNode>createNode(qt.SyntaxKind.InferType);
    parseExpected(qt.SyntaxKind.InferKeyword);
    const typeParameter = <TypeParameterDeclaration>createNode(qt.SyntaxKind.TypeParameter);
    typeParameter.name = parseIdentifier();
    node.typeParameter = finishNode(typeParameter);
    return finishNode(node);
  }

  function parseTypeOperatorOrHigher(): TypeNode {
    const operator = token();
    switch (operator) {
      case qt.SyntaxKind.KeyOfKeyword:
      case qt.SyntaxKind.UniqueKeyword:
      case qt.SyntaxKind.ReadonlyKeyword:
        return parseTypeOperator(operator);
      case qt.SyntaxKind.InferKeyword:
        return parseInferType();
    }
    return parsePostfixTypeOrHigher();
  }

  function parseUnionOrIntersectionType(kind: qt.SyntaxKind.UnionType | qt.SyntaxKind.IntersectionType, parseConstituentType: () => TypeNode, operator: qt.SyntaxKind.BarToken | qt.SyntaxKind.AmpersandToken): TypeNode {
    const start = scanner.getStartPos();
    const hasLeadingOperator = parseOptional(operator);
    let type = parseConstituentType();
    if (token() === operator || hasLeadingOperator) {
      const types = [type];
      while (parseOptional(operator)) {
        types.push(parseConstituentType());
      }
      const node = <UnionOrIntersectionTypeNode>createNode(kind, start);
      node.types = createNodeArray(types, start);
      type = finishNode(node);
    }
    return type;
  }

  function parseIntersectionTypeOrHigher(): TypeNode {
    return parseUnionOrIntersectionType(qt.SyntaxKind.IntersectionType, parseTypeOperatorOrHigher, qt.SyntaxKind.AmpersandToken);
  }

  function parseUnionTypeOrHigher(): TypeNode {
    return parseUnionOrIntersectionType(qt.SyntaxKind.UnionType, parseIntersectionTypeOrHigher, qt.SyntaxKind.BarToken);
  }

  function isStartOfFunctionType(): boolean {
    if (token() === qt.SyntaxKind.LessThanToken) {
      return true;
    }
    return token() === qt.SyntaxKind.OpenParenToken && lookAhead(isUnambiguouslyStartOfFunctionType);
  }

  function skipParameterStart(): boolean {
    if (isModifierKind(token())) {
      // Skip modifiers
      parseModifiers();
    }
    if (isIdentifier() || token() === qt.SyntaxKind.ThisKeyword) {
      nextToken();
      return true;
    }
    if (token() === qt.SyntaxKind.OpenBracketToken || token() === qt.SyntaxKind.OpenBraceToken) {
      // Return true if we can parse an array or object binding pattern with no errors
      const previousErrorCount = parseDiagnostics.length;
      parseIdentifierOrPattern();
      return previousErrorCount === parseDiagnostics.length;
    }
    return false;
  }

  function isUnambiguouslyStartOfFunctionType() {
    nextToken();
    if (token() === qt.SyntaxKind.CloseParenToken || token() === qt.SyntaxKind.DotDotDotToken) {
      // ( )
      // ( ...
      return true;
    }
    if (skipParameterStart()) {
      // We successfully skipped modifiers (if any) and an identifier or binding pattern,
      // now see if we have something that indicates a parameter declaration
      if (token() === qt.SyntaxKind.ColonToken || token() === qt.SyntaxKind.CommaToken || token() === qt.SyntaxKind.QuestionToken || token() === qt.SyntaxKind.EqualsToken) {
        // ( xxx :
        // ( xxx ,
        // ( xxx ?
        // ( xxx =
        return true;
      }
      if (token() === qt.SyntaxKind.CloseParenToken) {
        nextToken();
        if (token() === qt.SyntaxKind.EqualsGreaterThanToken) {
          // ( xxx ) =>
          return true;
        }
      }
    }
    return false;
  }

  function parseTypeOrTypePredicate(): TypeNode {
    const typePredicateVariable = isIdentifier() && tryParse(parseTypePredicatePrefix);
    const type = parseType();
    if (typePredicateVariable) {
      const node = <TypePredicateNode>createNode(qt.SyntaxKind.TypePredicate, typePredicateVariable.pos);
      node.assertsModifier = undefined;
      node.parameterName = typePredicateVariable;
      node.type = type;
      return finishNode(node);
    } else {
      return type;
    }
  }

  function parseTypePredicatePrefix() {
    const id = parseIdentifier();
    if (token() === qt.SyntaxKind.IsKeyword && !scanner.hasPrecedingLineBreak()) {
      nextToken();
      return id;
    }
  }

  function parseAssertsTypePredicate(): TypeNode {
    const node = <TypePredicateNode>createNode(qt.SyntaxKind.TypePredicate);
    node.assertsModifier = parseExpectedToken(qt.SyntaxKind.AssertsKeyword);
    node.parameterName = token() === qt.SyntaxKind.ThisKeyword ? parseThisTypeNode() : parseIdentifier();
    node.type = parseOptional(qt.SyntaxKind.IsKeyword) ? parseType() : undefined;
    return finishNode(node);
  }

  function parseType(): TypeNode {
    // The rules about 'yield' only apply to actual code/expression contexts.  They don't
    // apply to 'type' contexts.  So we disable these parameters here before moving on.
    return doOutsideOfContext(qt.NodeFlags.TypeExcludesFlags, parseTypeWorker);
  }

  function parseTypeWorker(noConditionalTypes?: boolean): TypeNode {
    if (isStartOfFunctionType() || token() === qt.SyntaxKind.NewKeyword) {
      return parseFunctionOrConstructorType();
    }
    const type = parseUnionTypeOrHigher();
    if (!noConditionalTypes && !scanner.hasPrecedingLineBreak() && parseOptional(qt.SyntaxKind.ExtendsKeyword)) {
      const node = <ConditionalTypeNode>createNode(qt.SyntaxKind.ConditionalType, type.pos);
      node.checkType = type;
      // The type following 'extends' is not permitted to be another conditional type
      node.extendsType = parseTypeWorker(/*noConditionalTypes*/ true);
      parseExpected(qt.SyntaxKind.QuestionToken);
      node.trueType = parseTypeWorker();
      parseExpected(qt.SyntaxKind.ColonToken);
      node.falseType = parseTypeWorker();
      return finishNode(node);
    }
    return type;
  }

  function parseTypeAnnotation(): TypeNode | undefined {
    return parseOptional(qt.SyntaxKind.ColonToken) ? parseType() : undefined;
  }

  // EXPRESSIONS
  function isStartOfLeftHandSideExpression(): boolean {
    switch (token()) {
      case qt.SyntaxKind.ThisKeyword:
      case qt.SyntaxKind.SuperKeyword:
      case qt.SyntaxKind.NullKeyword:
      case qt.SyntaxKind.TrueKeyword:
      case qt.SyntaxKind.FalseKeyword:
      case qt.SyntaxKind.NumericLiteral:
      case qt.SyntaxKind.BigIntLiteral:
      case qt.SyntaxKind.StringLiteral:
      case qt.SyntaxKind.NoSubstitutionTemplateLiteral:
      case qt.SyntaxKind.TemplateHead:
      case qt.SyntaxKind.OpenParenToken:
      case qt.SyntaxKind.OpenBracketToken:
      case qt.SyntaxKind.OpenBraceToken:
      case qt.SyntaxKind.FunctionKeyword:
      case qt.SyntaxKind.ClassKeyword:
      case qt.SyntaxKind.NewKeyword:
      case qt.SyntaxKind.SlashToken:
      case qt.SyntaxKind.SlashEqualsToken:
      case qt.SyntaxKind.Identifier:
        return true;
      case qt.SyntaxKind.ImportKeyword:
        return lookAhead(nextTokenIsOpenParenOrLessThanOrDot);
      default:
        return isIdentifier();
    }
  }

  function isStartOfExpression(): boolean {
    if (isStartOfLeftHandSideExpression()) {
      return true;
    }

    switch (token()) {
      case qt.SyntaxKind.PlusToken:
      case qt.SyntaxKind.MinusToken:
      case qt.SyntaxKind.TildeToken:
      case qt.SyntaxKind.ExclamationToken:
      case qt.SyntaxKind.DeleteKeyword:
      case qt.SyntaxKind.TypeOfKeyword:
      case qt.SyntaxKind.VoidKeyword:
      case qt.SyntaxKind.PlusPlusToken:
      case qt.SyntaxKind.MinusMinusToken:
      case qt.SyntaxKind.LessThanToken:
      case qt.SyntaxKind.AwaitKeyword:
      case qt.SyntaxKind.YieldKeyword:
      case qt.SyntaxKind.PrivateIdentifier:
        // Yield/await always starts an expression.  Either it is an identifier (in which case
        // it is definitely an expression).  Or it's a keyword (either because we're in
        // a generator or async function, or in strict mode (or both)) and it started a yield or await expression.
        return true;
      default:
        // Error tolerance.  If we see the start of some binary operator, we consider
        // that the start of an expression.  That way we'll parse out a missing identifier,
        // give a good message about an identifier being missing, and then consume the
        // rest of the binary expression.
        if (isBinaryOperator()) {
          return true;
        }

        return isIdentifier();
    }
  }

  function isStartOfExpressionStatement(): boolean {
    // As per the grammar, none of '{' or 'function' or 'class' can start an expression statement.
    return token() !== qt.SyntaxKind.OpenBraceToken && token() !== qt.SyntaxKind.FunctionKeyword && token() !== qt.SyntaxKind.ClassKeyword && token() !== qt.SyntaxKind.AtToken && isStartOfExpression();
  }

  function parseExpression(): Expression {
    // Expression[in]:
    //      AssignmentExpression[in]
    //      Expression[in] , AssignmentExpression[in]

    // clear the decorator context when parsing Expression, as it should be unambiguous when parsing a decorator
    const saveDecoratorContext = inDecoratorContext();
    if (saveDecoratorContext) {
      setDecoratorContext(/*val*/ false);
    }

    let expr = parseAssignmentExpressionOrHigher();
    let operatorToken: BinaryOperatorToken;
    while ((operatorToken = parseOptionalToken(qt.SyntaxKind.CommaToken))) {
      expr = makeBinaryExpression(expr, operatorToken, parseAssignmentExpressionOrHigher());
    }

    if (saveDecoratorContext) {
      setDecoratorContext(/*val*/ true);
    }
    return expr;
  }

  function parseInitializer(): Expression | undefined {
    return parseOptional(qt.SyntaxKind.EqualsToken) ? parseAssignmentExpressionOrHigher() : undefined;
  }

  function parseAssignmentExpressionOrHigher(): Expression {
    //  AssignmentExpression[in,yield]:
    //      1) ConditionalExpression[?in,?yield]
    //      2) LeftHandSideExpression = AssignmentExpression[?in,?yield]
    //      3) LeftHandSideExpression AssignmentOperator AssignmentExpression[?in,?yield]
    //      4) ArrowFunctionExpression[?in,?yield]
    //      5) AsyncArrowFunctionExpression[in,yield,await]
    //      6) [+Yield] YieldExpression[?In]
    //
    // Note: for ease of implementation we treat productions '2' and '3' as the same thing.
    // (i.e. they're both BinaryExpressions with an assignment operator in it).

    // First, do the simple check if we have a YieldExpression (production '6').
    if (isYieldExpression()) {
      return parseYieldExpression();
    }

    // Then, check if we have an arrow function (production '4' and '5') that starts with a parenthesized
    // parameter list or is an async arrow function.
    // AsyncArrowFunctionExpression:
    //      1) async[no LineTerminator here]AsyncArrowBindingIdentifier[?Yield][no LineTerminator here]=>AsyncConciseBody[?In]
    //      2) CoverCallExpressionAndAsyncArrowHead[?Yield, ?Await][no LineTerminator here]=>AsyncConciseBody[?In]
    // Production (1) of AsyncArrowFunctionExpression is parsed in "tryParseAsyncSimpleArrowFunctionExpression".
    // And production (2) is parsed in "tryParseParenthesizedArrowFunctionExpression".
    //
    // If we do successfully parse arrow-function, we must *not* recurse for productions 1, 2 or 3. An ArrowFunction is
    // not a LeftHandSideExpression, nor does it start a ConditionalExpression.  So we are done
    // with AssignmentExpression if we see one.
    const arrowExpression = tryParseParenthesizedArrowFunctionExpression() || tryParseAsyncSimpleArrowFunctionExpression();
    if (arrowExpression) {
      return arrowExpression;
    }

    // Now try to see if we're in production '1', '2' or '3'.  A conditional expression can
    // start with a LogicalOrExpression, while the assignment productions can only start with
    // LeftHandSideExpressions.
    //
    // So, first, we try to just parse out a BinaryExpression.  If we get something that is a
    // LeftHandSide or higher, then we can try to parse out the assignment expression part.
    // Otherwise, we try to parse out the conditional expression bit.  We want to allow any
    // binary expression here, so we pass in the 'lowest' precedence here so that it matches
    // and consumes anything.
    const expr = parseBinaryExpressionOrHigher(/*precedence*/ 0);

    // To avoid a look-ahead, we did not handle the case of an arrow function with a single un-parenthesized
    // parameter ('x => ...') above. We handle it here by checking if the parsed expression was a single
    // identifier and the current token is an arrow.
    if (expr.kind === qt.SyntaxKind.Identifier && token() === qt.SyntaxKind.EqualsGreaterThanToken) {
      return parseSimpleArrowFunctionExpression(expr);
    }

    // Now see if we might be in cases '2' or '3'.
    // If the expression was a LHS expression, and we have an assignment operator, then
    // we're in '2' or '3'. Consume the assignment and return.
    //
    // Note: we call reScanGreaterToken so that we get an appropriately merged token
    // for cases like `> > =` becoming `>>=`
    if (isLeftHandSideExpression(expr) && isAssignmentOperator(reScanGreaterToken())) {
      return makeBinaryExpression(expr, parseTokenNode(), parseAssignmentExpressionOrHigher());
    }

    // It wasn't an assignment or a lambda.  This is a conditional expression:
    return parseConditionalExpressionRest(expr);
  }

  function isYieldExpression(): boolean {
    if (token() === qt.SyntaxKind.YieldKeyword) {
      // If we have a 'yield' keyword, and this is a context where yield expressions are
      // allowed, then definitely parse out a yield expression.
      if (inYieldContext()) {
        return true;
      }

      // We're in a context where 'yield expr' is not allowed.  However, if we can
      // definitely tell that the user was trying to parse a 'yield expr' and not
      // just a normal expr that start with a 'yield' identifier, then parse out
      // a 'yield expr'.  We can then report an error later that they are only
      // allowed in generator expressions.
      //
      // for example, if we see 'yield(foo)', then we'll have to treat that as an
      // invocation expression of something called 'yield'.  However, if we have
      // 'yield foo' then that is not legal as a normal expression, so we can
      // definitely recognize this as a yield expression.
      //
      // for now we just check if the next token is an identifier.  More heuristics
      // can be added here later as necessary.  We just need to make sure that we
      // don't accidentally consume something legal.
      return lookAhead(nextTokenIsIdentifierOrKeywordOrLiteralOnSameLine);
    }

    return false;
  }

  function nextTokenIsIdentifierOnSameLine() {
    nextToken();
    return !scanner.hasPrecedingLineBreak() && isIdentifier();
  }

  function parseYieldExpression(): YieldExpression {
    const node = <YieldExpression>createNode(qt.SyntaxKind.YieldExpression);

    // YieldExpression[In] :
    //      yield
    //      yield [no LineTerminator here] [Lexical goal InputElementRegExp]AssignmentExpression[?In, Yield]
    //      yield [no LineTerminator here] * [Lexical goal InputElementRegExp]AssignmentExpression[?In, Yield]
    nextToken();

    if (!scanner.hasPrecedingLineBreak() && (token() === qt.SyntaxKind.AsteriskToken || isStartOfExpression())) {
      node.asteriskToken = parseOptionalToken(qt.SyntaxKind.AsteriskToken);
      node.expression = parseAssignmentExpressionOrHigher();
      return finishNode(node);
    } else {
      // if the next token is not on the same line as yield.  or we don't have an '*' or
      // the start of an expression, then this is just a simple "yield" expression.
      return finishNode(node);
    }
  }

  function parseSimpleArrowFunctionExpression(identifier: qt.Identifier, asyncModifier?: qt.NodeArray<Modifier> | undefined): ArrowFunction {
    Debug.assert(token() === qt.SyntaxKind.EqualsGreaterThanToken, 'parseSimpleArrowFunctionExpression should only have been called if we had a =>');

    let node: ArrowFunction;
    if (asyncModifier) {
      node = <ArrowFunction>createNode(qt.SyntaxKind.ArrowFunction, asyncModifier.pos);
      node.modifiers = asyncModifier;
    } else {
      node = <ArrowFunction>createNode(qt.SyntaxKind.ArrowFunction, identifier.pos);
    }

    const parameter = <qt.ParameterDeclaration>createNode(qt.SyntaxKind.Parameter, identifier.pos);
    parameter.name = identifier;
    finishNode(parameter);

    node.parameters = createNodeArray<qt.ParameterDeclaration>([parameter], parameter.pos, parameter.end);

    node.equalsGreaterThanToken = parseExpectedToken(qt.SyntaxKind.EqualsGreaterThanToken);
    node.body = parseArrowFunctionExpressionBody(/*isAsync*/ !!asyncModifier);

    return addJSDocComment(finishNode(node));
  }

  function tryParseParenthesizedArrowFunctionExpression(): Expression | undefined {
    const triState = isParenthesizedArrowFunctionExpression();
    if (triState === Tristate.False) {
      // It's definitely not a parenthesized arrow function expression.
      return undefined;
    }

    // If we definitely have an arrow function, then we can just parse one, not requiring a
    // following => or { token. Otherwise, we *might* have an arrow function.  Try to parse
    // it out, but don't allow any ambiguity, and return 'undefined' if this could be an
    // expression instead.
    const arrowFunction = triState === Tristate.True ? parseParenthesizedArrowFunctionExpressionHead(/*allowAmbiguity*/ true) : tryParse(parsePossibleParenthesizedArrowFunctionExpressionHead);

    if (!arrowFunction) {
      // Didn't appear to actually be a parenthesized arrow function.  Just bail out.
      return undefined;
    }

    const isAsync = hasModifierOfKind(arrowFunction, qt.SyntaxKind.AsyncKeyword);

    // If we have an arrow, then try to parse the body. Even if not, try to parse if we
    // have an opening brace, just in case we're in an error state.
    const lastToken = token();
    arrowFunction.equalsGreaterThanToken = parseExpectedToken(qt.SyntaxKind.EqualsGreaterThanToken);
    arrowFunction.body = lastToken === qt.SyntaxKind.EqualsGreaterThanToken || lastToken === qt.SyntaxKind.OpenBraceToken ? parseArrowFunctionExpressionBody(isAsync) : parseIdentifier();

    return finishNode(arrowFunction);
  }

  //  True        -> We definitely expect a parenthesized arrow function here.
  //  False       -> There *cannot* be a parenthesized arrow function here.
  //  Unknown     -> There *might* be a parenthesized arrow function here.
  //                 Speculatively look ahead to be sure, and rollback if not.
  function isParenthesizedArrowFunctionExpression(): Tristate {
    if (token() === qt.SyntaxKind.OpenParenToken || token() === qt.SyntaxKind.LessThanToken || token() === qt.SyntaxKind.AsyncKeyword) {
      return lookAhead(isParenthesizedArrowFunctionExpressionWorker);
    }

    if (token() === qt.SyntaxKind.EqualsGreaterThanToken) {
      // ERROR RECOVERY TWEAK:
      // If we see a standalone => try to parse it as an arrow function expression as that's
      // likely what the user intended to write.
      return Tristate.True;
    }
    // Definitely not a parenthesized arrow function.
    return Tristate.False;
  }

  function isParenthesizedArrowFunctionExpressionWorker() {
    if (token() === qt.SyntaxKind.AsyncKeyword) {
      nextToken();
      if (scanner.hasPrecedingLineBreak()) {
        return Tristate.False;
      }
      if (token() !== qt.SyntaxKind.OpenParenToken && token() !== qt.SyntaxKind.LessThanToken) {
        return Tristate.False;
      }
    }

    const first = token();
    const second = nextToken();

    if (first === qt.SyntaxKind.OpenParenToken) {
      if (second === qt.SyntaxKind.CloseParenToken) {
        // Simple cases: "() =>", "(): ", and "() {".
        // This is an arrow function with no parameters.
        // The last one is not actually an arrow function,
        // but this is probably what the user intended.
        const third = nextToken();
        switch (third) {
          case qt.SyntaxKind.EqualsGreaterThanToken:
          case qt.SyntaxKind.ColonToken:
          case qt.SyntaxKind.OpenBraceToken:
            return Tristate.True;
          default:
            return Tristate.False;
        }
      }

      // If encounter "([" or "({", this could be the start of a binding pattern.
      // Examples:
      //      ([ x ]) => { }
      //      ({ x }) => { }
      //      ([ x ])
      //      ({ x })
      if (second === qt.SyntaxKind.OpenBracketToken || second === qt.SyntaxKind.OpenBraceToken) {
        return Tristate.Unknown;
      }

      // Simple case: "(..."
      // This is an arrow function with a rest parameter.
      if (second === qt.SyntaxKind.DotDotDotToken) {
        return Tristate.True;
      }

      // Check for "(xxx yyy", where xxx is a modifier and yyy is an identifier. This
      // isn't actually allowed, but we want to treat it as a lambda so we can provide
      // a good error message.
      if (isModifierKind(second) && second !== qt.SyntaxKind.AsyncKeyword && lookAhead(nextTokenIsIdentifier)) {
        return Tristate.True;
      }

      // If we had "(" followed by something that's not an identifier,
      // then this definitely doesn't look like a lambda.  "this" is not
      // valid, but we want to parse it and then give a semantic error.
      if (!isIdentifier() && second !== qt.SyntaxKind.ThisKeyword) {
        return Tristate.False;
      }

      switch (nextToken()) {
        case qt.SyntaxKind.ColonToken:
          // If we have something like "(a:", then we must have a
          // type-annotated parameter in an arrow function expression.
          return Tristate.True;
        case qt.SyntaxKind.QuestionToken:
          nextToken();
          // If we have "(a?:" or "(a?," or "(a?=" or "(a?)" then it is definitely a lambda.
          if (token() === qt.SyntaxKind.ColonToken || token() === qt.SyntaxKind.CommaToken || token() === qt.SyntaxKind.EqualsToken || token() === qt.SyntaxKind.CloseParenToken) {
            return Tristate.True;
          }
          // Otherwise it is definitely not a lambda.
          return Tristate.False;
        case qt.SyntaxKind.CommaToken:
        case qt.SyntaxKind.EqualsToken:
        case qt.SyntaxKind.CloseParenToken:
          // If we have "(a," or "(a=" or "(a)" this *could* be an arrow function
          return Tristate.Unknown;
      }
      // It is definitely not an arrow function
      return Tristate.False;
    } else {
      Debug.assert(first === qt.SyntaxKind.LessThanToken);

      // If we have "<" not followed by an identifier,
      // then this definitely is not an arrow function.
      if (!isIdentifier()) {
        return Tristate.False;
      }

      // JSX overrides
      if (sourceFile.languageVariant === LanguageVariant.JSX) {
        const isArrowFunctionInJsx = lookAhead(() => {
          const third = nextToken();
          if (third === qt.SyntaxKind.ExtendsKeyword) {
            const fourth = nextToken();
            switch (fourth) {
              case qt.SyntaxKind.EqualsToken:
              case qt.SyntaxKind.GreaterThanToken:
                return false;
              default:
                return true;
            }
          } else if (third === qt.SyntaxKind.CommaToken) {
            return true;
          }
          return false;
        });

        if (isArrowFunctionInJsx) {
          return Tristate.True;
        }

        return Tristate.False;
      }

      // This *could* be a parenthesized arrow function.
      return Tristate.Unknown;
    }
  }

  function parsePossibleParenthesizedArrowFunctionExpressionHead(): ArrowFunction | undefined {
    const tokenPos = scanner.getTokenPos();
    if (notParenthesizedArrow && notParenthesizedArrow.has(tokenPos.toString())) {
      return undefined;
    }

    const result = parseParenthesizedArrowFunctionExpressionHead(/*allowAmbiguity*/ false);
    if (!result) {
      (notParenthesizedArrow || (notParenthesizedArrow = createMap())).set(tokenPos.toString(), true);
    }

    return result;
  }

  function tryParseAsyncSimpleArrowFunctionExpression(): ArrowFunction | undefined {
    // We do a check here so that we won't be doing unnecessarily call to "lookAhead"
    if (token() === qt.SyntaxKind.AsyncKeyword) {
      if (lookAhead(isUnParenthesizedAsyncArrowFunctionWorker) === Tristate.True) {
        const asyncModifier = parseModifiersForArrowFunction();
        const expr = parseBinaryExpressionOrHigher(/*precedence*/ 0);
        return parseSimpleArrowFunctionExpression(expr, asyncModifier);
      }
    }
    return undefined;
  }

  function isUnParenthesizedAsyncArrowFunctionWorker(): Tristate {
    // AsyncArrowFunctionExpression:
    //      1) async[no LineTerminator here]AsyncArrowBindingIdentifier[?Yield][no LineTerminator here]=>AsyncConciseBody[?In]
    //      2) CoverCallExpressionAndAsyncArrowHead[?Yield, ?Await][no LineTerminator here]=>AsyncConciseBody[?In]
    if (token() === qt.SyntaxKind.AsyncKeyword) {
      nextToken();
      // If the "async" is followed by "=>" token then it is not a beginning of an async arrow-function
      // but instead a simple arrow-function which will be parsed inside "parseAssignmentExpressionOrHigher"
      if (scanner.hasPrecedingLineBreak() || token() === qt.SyntaxKind.EqualsGreaterThanToken) {
        return Tristate.False;
      }
      // Check for un-parenthesized AsyncArrowFunction
      const expr = parseBinaryExpressionOrHigher(/*precedence*/ 0);
      if (!scanner.hasPrecedingLineBreak() && expr.kind === qt.SyntaxKind.Identifier && token() === qt.SyntaxKind.EqualsGreaterThanToken) {
        return Tristate.True;
      }
    }

    return Tristate.False;
  }

  function parseParenthesizedArrowFunctionExpressionHead(allowAmbiguity: boolean): ArrowFunction | undefined {
    const node = <ArrowFunction>createNodeWithJSDoc(qt.SyntaxKind.ArrowFunction);
    node.modifiers = parseModifiersForArrowFunction();
    const isAsync = hasModifierOfKind(node, qt.SyntaxKind.AsyncKeyword) ? SignatureFlags.Await : SignatureFlags.None;
    // Arrow functions are never generators.
    //
    // If we're speculatively parsing a signature for a parenthesized arrow function, then
    // we have to have a complete parameter list.  Otherwise we might see something like
    // a => (b => c)
    // And think that "(b =>" was actually a parenthesized arrow function with a missing
    // close paren.
    if (!fillSignature(qt.SyntaxKind.ColonToken, isAsync, node) && !allowAmbiguity) {
      return undefined;
    }

    // Parsing a signature isn't enough.
    // Parenthesized arrow signatures often look like other valid expressions.
    // For instance:
    //  - "(x = 10)" is an assignment expression parsed as a signature with a default parameter value.
    //  - "(x,y)" is a comma expression parsed as a signature with two parameters.
    //  - "a ? (b): c" will have "(b):" parsed as a signature with a return type annotation.
    //  - "a ? (b): function() {}" will too, since function() is a valid JSDoc function type.
    //
    // So we need just a bit of lookahead to ensure that it can only be a signature.
    const hasJSDocFunctionType = node.type && isJSDocFunctionType(node.type);
    if (!allowAmbiguity && token() !== qt.SyntaxKind.EqualsGreaterThanToken && (hasJSDocFunctionType || token() !== qt.SyntaxKind.OpenBraceToken)) {
      // Returning undefined here will cause our caller to rewind to where we started from.
      return undefined;
    }

    return node;
  }

  function parseArrowFunctionExpressionBody(isAsync: boolean): Block | Expression {
    if (token() === qt.SyntaxKind.OpenBraceToken) {
      return parseFunctionBlock(isAsync ? SignatureFlags.Await : SignatureFlags.None);
    }

    if (token() !== qt.SyntaxKind.SemicolonToken && token() !== qt.SyntaxKind.FunctionKeyword && token() !== qt.SyntaxKind.ClassKeyword && isStartOfStatement() && !isStartOfExpressionStatement()) {
      // Check if we got a plain statement (i.e. no expression-statements, no function/class expressions/declarations)
      //
      // Here we try to recover from a potential error situation in the case where the
      // user meant to supply a block. For example, if the user wrote:
      //
      //  a =>
      //      let v = 0;
      //  }
      //
      // they may be missing an open brace.  Check to see if that's the case so we can
      // try to recover better.  If we don't do this, then the next close curly we see may end
      // up preemptively closing the containing construct.
      //
      // Note: even when 'IgnoreMissingOpenBrace' is passed, parseBody will still error.
      return parseFunctionBlock(SignatureFlags.IgnoreMissingOpenBrace | (isAsync ? SignatureFlags.Await : SignatureFlags.None));
    }

    return isAsync ? doInAwaitContext(parseAssignmentExpressionOrHigher) : doOutsideOfAwaitContext(parseAssignmentExpressionOrHigher);
  }

  function parseConditionalExpressionRest(leftOperand: Expression): Expression {
    // Note: we are passed in an expression which was produced from parseBinaryExpressionOrHigher.
    const questionToken = parseOptionalToken(qt.SyntaxKind.QuestionToken);
    if (!questionToken) {
      return leftOperand;
    }

    // Note: we explicitly 'allowIn' in the whenTrue part of the condition expression, and
    // we do not that for the 'whenFalse' part.
    const node = <ConditionalExpression>createNode(qt.SyntaxKind.ConditionalExpression, leftOperand.pos);
    node.condition = leftOperand;
    node.questionToken = questionToken;
    node.whenTrue = doOutsideOfContext(disallowInAndDecoratorContext, parseAssignmentExpressionOrHigher);
    node.colonToken = parseExpectedToken(qt.SyntaxKind.ColonToken);
    node.whenFalse = nodeIsPresent(node.colonToken) ? parseAssignmentExpressionOrHigher() : createMissingNode(qt.SyntaxKind.Identifier, /*reportAtCurrentPosition*/ false, Diagnostics._0_expected, tokenToString(qt.SyntaxKind.ColonToken));
    return finishNode(node);
  }

  function parseBinaryExpressionOrHigher(precedence: number): Expression {
    const leftOperand = parseUnaryExpressionOrHigher();
    return parseBinaryExpressionRest(precedence, leftOperand);
  }

  function isInOrOfKeyword(t: qt.SyntaxKind) {
    return t === qt.SyntaxKind.InKeyword || t === qt.SyntaxKind.OfKeyword;
  }

  function parseBinaryExpressionRest(precedence: number, leftOperand: Expression): Expression {
    while (true) {
      // We either have a binary operator here, or we're finished.  We call
      // reScanGreaterToken so that we merge token sequences like > and = into >=

      reScanGreaterToken();
      const newPrecedence = getBinaryOperatorPrecedence(token());

      // Check the precedence to see if we should "take" this operator
      // - For left associative operator (all operator but **), consume the operator,
      //   recursively call the function below, and parse binaryExpression as a rightOperand
      //   of the caller if the new precedence of the operator is greater then or equal to the current precedence.
      //   For example:
      //      a - b - c;
      //            ^token; leftOperand = b. Return b to the caller as a rightOperand
      //      a * b - c
      //            ^token; leftOperand = b. Return b to the caller as a rightOperand
      //      a - b * c;
      //            ^token; leftOperand = b. Return b * c to the caller as a rightOperand
      // - For right associative operator (**), consume the operator, recursively call the function
      //   and parse binaryExpression as a rightOperand of the caller if the new precedence of
      //   the operator is strictly grater than the current precedence
      //   For example:
      //      a ** b ** c;
      //             ^^token; leftOperand = b. Return b ** c to the caller as a rightOperand
      //      a - b ** c;
      //            ^^token; leftOperand = b. Return b ** c to the caller as a rightOperand
      //      a ** b - c
      //             ^token; leftOperand = b. Return b to the caller as a rightOperand
      const consumeCurrentOperator = token() === qt.SyntaxKind.AsteriskAsteriskToken ? newPrecedence >= precedence : newPrecedence > precedence;

      if (!consumeCurrentOperator) {
        break;
      }

      if (token() === qt.SyntaxKind.InKeyword && inDisallowInContext()) {
        break;
      }

      if (token() === qt.SyntaxKind.AsKeyword) {
        // Make sure we *do* perform ASI for constructs like this:
        //    var x = foo
        //    as (Bar)
        // This should be parsed as an initialized variable, followed
        // by a function call to 'as' with the argument 'Bar'
        if (scanner.hasPrecedingLineBreak()) {
          break;
        } else {
          nextToken();
          leftOperand = makeAsExpression(leftOperand, parseType());
        }
      } else {
        leftOperand = makeBinaryExpression(leftOperand, parseTokenNode(), parseBinaryExpressionOrHigher(newPrecedence));
      }
    }

    return leftOperand;
  }

  function isBinaryOperator() {
    if (inDisallowInContext() && token() === qt.SyntaxKind.InKeyword) {
      return false;
    }

    return getBinaryOperatorPrecedence(token()) > 0;
  }

  function makeBinaryExpression(left: Expression, operatorToken: BinaryOperatorToken, right: Expression): BinaryExpression {
    const node = <BinaryExpression>createNode(qt.SyntaxKind.BinaryExpression, left.pos);
    node.left = left;
    node.operatorToken = operatorToken;
    node.right = right;
    return finishNode(node);
  }

  function makeAsExpression(left: Expression, right: TypeNode): AsExpression {
    const node = <AsExpression>createNode(qt.SyntaxKind.AsExpression, left.pos);
    node.expression = left;
    node.type = right;
    return finishNode(node);
  }

  function parsePrefixUnaryExpression() {
    const node = <PrefixUnaryExpression>createNode(qt.SyntaxKind.PrefixUnaryExpression);
    node.operator = token();
    nextToken();
    node.operand = parseSimpleUnaryExpression();

    return finishNode(node);
  }

  function parseDeleteExpression() {
    const node = <DeleteExpression>createNode(qt.SyntaxKind.DeleteExpression);
    nextToken();
    node.expression = parseSimpleUnaryExpression();
    return finishNode(node);
  }

  function parseTypeOfExpression() {
    const node = <TypeOfExpression>createNode(qt.SyntaxKind.TypeOfExpression);
    nextToken();
    node.expression = parseSimpleUnaryExpression();
    return finishNode(node);
  }

  function parseVoidExpression() {
    const node = <VoidExpression>createNode(qt.SyntaxKind.VoidExpression);
    nextToken();
    node.expression = parseSimpleUnaryExpression();
    return finishNode(node);
  }

  function isAwaitExpression(): boolean {
    if (token() === qt.SyntaxKind.AwaitKeyword) {
      if (inAwaitContext()) {
        return true;
      }

      // here we are using similar heuristics as 'isYieldExpression'
      return lookAhead(nextTokenIsIdentifierOrKeywordOrLiteralOnSameLine);
    }

    return false;
  }

  function parseAwaitExpression() {
    const node = <AwaitExpression>createNode(qt.SyntaxKind.AwaitExpression);
    nextToken();
    node.expression = parseSimpleUnaryExpression();
    return finishNode(node);
  }

  /**
   * Parse ES7 exponential expression and await expression
   *
   * ES7 ExponentiationExpression:
   *      1) UnaryExpression[?Yield]
   *      2) UpdateExpression[?Yield] ** ExponentiationExpression[?Yield]
   *
   */
  function parseUnaryExpressionOrHigher(): UnaryExpression | BinaryExpression {
    /**
     * ES7 UpdateExpression:
     *      1) LeftHandSideExpression[?Yield]
     *      2) LeftHandSideExpression[?Yield][no LineTerminator here]++
     *      3) LeftHandSideExpression[?Yield][no LineTerminator here]--
     *      4) ++UnaryExpression[?Yield]
     *      5) --UnaryExpression[?Yield]
     */
    if (isUpdateExpression()) {
      const updateExpression = parseUpdateExpression();
      return token() === qt.SyntaxKind.AsteriskAsteriskToken ? parseBinaryExpressionRest(getBinaryOperatorPrecedence(token()), updateExpression) : updateExpression;
    }

    /**
     * ES7 UnaryExpression:
     *      1) UpdateExpression[?yield]
     *      2) delete UpdateExpression[?yield]
     *      3) void UpdateExpression[?yield]
     *      4) typeof UpdateExpression[?yield]
     *      5) + UpdateExpression[?yield]
     *      6) - UpdateExpression[?yield]
     *      7) ~ UpdateExpression[?yield]
     *      8) ! UpdateExpression[?yield]
     */
    const unaryOperator = token();
    const simpleUnaryExpression = parseSimpleUnaryExpression();
    if (token() === qt.SyntaxKind.AsteriskAsteriskToken) {
      const pos = skipTrivia(sourceText, simpleUnaryExpression.pos);
      const { end } = simpleUnaryExpression;
      if (simpleUnaryExpression.kind === qt.SyntaxKind.TypeAssertionExpression) {
        parseErrorAt(pos, end, Diagnostics.A_type_assertion_expression_is_not_allowed_in_the_left_hand_side_of_an_exponentiation_expression_Consider_enclosing_the_expression_in_parentheses);
      } else {
        parseErrorAt(pos, end, Diagnostics.An_unary_expression_with_the_0_operator_is_not_allowed_in_the_left_hand_side_of_an_exponentiation_expression_Consider_enclosing_the_expression_in_parentheses, tokenToString(unaryOperator));
      }
    }
    return simpleUnaryExpression;
  }

  /**
   * Parse ES7 simple-unary expression or higher:
   *
   * ES7 UnaryExpression:
   *      1) UpdateExpression[?yield]
   *      2) delete UnaryExpression[?yield]
   *      3) void UnaryExpression[?yield]
   *      4) typeof UnaryExpression[?yield]
   *      5) + UnaryExpression[?yield]
   *      6) - UnaryExpression[?yield]
   *      7) ~ UnaryExpression[?yield]
   *      8) ! UnaryExpression[?yield]
   *      9) [+Await] await UnaryExpression[?yield]
   */
  function parseSimpleUnaryExpression(): UnaryExpression {
    switch (token()) {
      case qt.SyntaxKind.PlusToken:
      case qt.SyntaxKind.MinusToken:
      case qt.SyntaxKind.TildeToken:
      case qt.SyntaxKind.ExclamationToken:
        return parsePrefixUnaryExpression();
      case qt.SyntaxKind.DeleteKeyword:
        return parseDeleteExpression();
      case qt.SyntaxKind.TypeOfKeyword:
        return parseTypeOfExpression();
      case qt.SyntaxKind.VoidKeyword:
        return parseVoidExpression();
      case qt.SyntaxKind.LessThanToken:
        // This is modified UnaryExpression grammar in TypeScript
        //  UnaryExpression (modified):
        //      < type > UnaryExpression
        return parseTypeAssertion();
      case qt.SyntaxKind.AwaitKeyword:
        if (isAwaitExpression()) {
          return parseAwaitExpression();
        }
      // falls through
      default:
        return parseUpdateExpression();
    }
  }

  /**
   * Check if the current token can possibly be an ES7 increment expression.
   *
   * ES7 UpdateExpression:
   *      LeftHandSideExpression[?Yield]
   *      LeftHandSideExpression[?Yield][no LineTerminator here]++
   *      LeftHandSideExpression[?Yield][no LineTerminator here]--
   *      ++LeftHandSideExpression[?Yield]
   *      --LeftHandSideExpression[?Yield]
   */
  function isUpdateExpression(): boolean {
    // This function is called inside parseUnaryExpression to decide
    // whether to call parseSimpleUnaryExpression or call parseUpdateExpression directly
    switch (token()) {
      case qt.SyntaxKind.PlusToken:
      case qt.SyntaxKind.MinusToken:
      case qt.SyntaxKind.TildeToken:
      case qt.SyntaxKind.ExclamationToken:
      case qt.SyntaxKind.DeleteKeyword:
      case qt.SyntaxKind.TypeOfKeyword:
      case qt.SyntaxKind.VoidKeyword:
      case qt.SyntaxKind.AwaitKeyword:
        return false;
      case qt.SyntaxKind.LessThanToken:
        // If we are not in JSX context, we are parsing TypeAssertion which is an UnaryExpression
        if (sourceFile.languageVariant !== LanguageVariant.JSX) {
          return false;
        }
      // We are in JSX context and the token is part of JSXElement.
      // falls through
      default:
        return true;
    }
  }

  /**
   * Parse ES7 UpdateExpression. UpdateExpression is used instead of ES6's PostFixExpression.
   *
   * ES7 UpdateExpression[yield]:
   *      1) LeftHandSideExpression[?yield]
   *      2) LeftHandSideExpression[?yield] [[no LineTerminator here]]++
   *      3) LeftHandSideExpression[?yield] [[no LineTerminator here]]--
   *      4) ++LeftHandSideExpression[?yield]
   *      5) --LeftHandSideExpression[?yield]
   * In TypeScript (2), (3) are parsed as PostfixUnaryExpression. (4), (5) are parsed as PrefixUnaryExpression
   */
  function parseUpdateExpression(): UpdateExpression {
    if (token() === qt.SyntaxKind.PlusPlusToken || token() === qt.SyntaxKind.MinusMinusToken) {
      const node = <PrefixUnaryExpression>createNode(qt.SyntaxKind.PrefixUnaryExpression);
      node.operator = token();
      nextToken();
      node.operand = parseLeftHandSideExpressionOrHigher();
      return finishNode(node);
    } else if (sourceFile.languageVariant === LanguageVariant.JSX && token() === qt.SyntaxKind.LessThanToken && lookAhead(nextTokenIsIdentifierOrKeywordOrGreaterThan)) {
      // JSXElement is part of primaryExpression
      return parseJsxElementOrSelfClosingElementOrFragment(/*inExpressionContext*/ true);
    }

    const expression = parseLeftHandSideExpressionOrHigher();

    Debug.assert(isLeftHandSideExpression(expression));
    if ((token() === qt.SyntaxKind.PlusPlusToken || token() === qt.SyntaxKind.MinusMinusToken) && !scanner.hasPrecedingLineBreak()) {
      const node = <PostfixUnaryExpression>createNode(qt.SyntaxKind.PostfixUnaryExpression, expression.pos);
      node.operand = expression;
      node.operator = token();
      nextToken();
      return finishNode(node);
    }

    return expression;
  }

  function parseLeftHandSideExpressionOrHigher(): LeftHandSideExpression {
    // Original Ecma:
    // LeftHandSideExpression: See 11.2
    //      NewExpression
    //      CallExpression
    //
    // Our simplification:
    //
    // LeftHandSideExpression: See 11.2
    //      MemberExpression
    //      CallExpression
    //
    // See comment in parseMemberExpressionOrHigher on how we replaced NewExpression with
    // MemberExpression to make our lives easier.
    //
    // to best understand the below code, it's important to see how CallExpression expands
    // out into its own productions:
    //
    // CallExpression:
    //      MemberExpression Arguments
    //      CallExpression Arguments
    //      CallExpression[Expression]
    //      CallExpression.IdentifierName
    //      import (AssignmentExpression)
    //      super Arguments
    //      super.IdentifierName
    //
    // Because of the recursion in these calls, we need to bottom out first. There are three
    // bottom out states we can run into: 1) We see 'super' which must start either of
    // the last two CallExpression productions. 2) We see 'import' which must start import call.
    // 3)we have a MemberExpression which either completes the LeftHandSideExpression,
    // or starts the beginning of the first four CallExpression productions.
    let expression: MemberExpression;
    if (token() === qt.SyntaxKind.ImportKeyword) {
      if (lookAhead(nextTokenIsOpenParenOrLessThan)) {
        // We don't want to eagerly consume all import keyword as import call expression so we look ahead to find "("
        // For example:
        //      var foo3 = require("subfolder
        //      import * as foo1 from "module-from-node
        // We want this import to be a statement rather than import call expression
        sourceFile.flags |= qt.NodeFlags.PossiblyContainsDynamicImport;
        expression = parseTokenNode<PrimaryExpression>();
      } else if (lookAhead(nextTokenIsDot)) {
        // This is an 'import.*' metaproperty (i.e. 'import.meta')
        const fullStart = scanner.getStartPos();
        nextToken(); // advance past the 'import'
        nextToken(); // advance past the dot
        const node = createNode(qt.SyntaxKind.MetaProperty, fullStart) as MetaProperty;
        node.keywordToken = qt.SyntaxKind.ImportKeyword;
        node.name = parseIdentifierName();
        expression = finishNode(node);

        sourceFile.flags |= qt.NodeFlags.PossiblyContainsImportMeta;
      } else {
        expression = parseMemberExpressionOrHigher();
      }
    } else {
      expression = token() === qt.SyntaxKind.SuperKeyword ? parseSuperExpression() : parseMemberExpressionOrHigher();
    }

    // Now, we *may* be complete.  However, we might have consumed the start of a
    // CallExpression or OptionalExpression.  As such, we need to consume the rest
    // of it here to be complete.
    return parseCallExpressionRest(expression);
  }

  function parseMemberExpressionOrHigher(): MemberExpression {
    // Note: to make our lives simpler, we decompose the NewExpression productions and
    // place ObjectCreationExpression and FunctionExpression into PrimaryExpression.
    // like so:
    //
    //   PrimaryExpression : See 11.1
    //      this
    //      qt.Identifier
    //      Literal
    //      ArrayLiteral
    //      ObjectLiteral
    //      (Expression)
    //      FunctionExpression
    //      new MemberExpression Arguments?
    //
    //   MemberExpression : See 11.2
    //      PrimaryExpression
    //      MemberExpression[Expression]
    //      MemberExpression.IdentifierName
    //
    //   CallExpression : See 11.2
    //      MemberExpression
    //      CallExpression Arguments
    //      CallExpression[Expression]
    //      CallExpression.IdentifierName
    //
    // Technically this is ambiguous.  i.e. CallExpression defines:
    //
    //   CallExpression:
    //      CallExpression Arguments
    //
    // If you see: "new Foo()"
    //
    // Then that could be treated as a single ObjectCreationExpression, or it could be
    // treated as the invocation of "new Foo".  We disambiguate that in code (to match
    // the original grammar) by making sure that if we see an ObjectCreationExpression
    // we always consume arguments if they are there. So we treat "new Foo()" as an
    // object creation only, and not at all as an invocation.  Another way to think
    // about this is that for every "new" that we see, we will consume an argument list if
    // it is there as part of the *associated* object creation node.  Any additional
    // argument lists we see, will become invocation expressions.
    //
    // Because there are no other places in the grammar now that refer to FunctionExpression
    // or ObjectCreationExpression, it is safe to push down into the PrimaryExpression
    // production.
    //
    // Because CallExpression and MemberExpression are left recursive, we need to bottom out
    // of the recursion immediately.  So we parse out a primary expression to start with.
    const expression = parsePrimaryExpression();
    return parseMemberExpressionRest(expression, /*allowOptionalChain*/ true);
  }

  function parseSuperExpression(): MemberExpression {
    const expression = parseTokenNode<PrimaryExpression>();
    if (token() === qt.SyntaxKind.LessThanToken) {
      const startPos = getNodePos();
      const typeArguments = tryParse(parseTypeArgumentsInExpression);
      if (typeArguments !== undefined) {
        parseErrorAt(startPos, getNodePos(), Diagnostics.super_may_not_use_type_arguments);
      }
    }

    if (token() === qt.SyntaxKind.OpenParenToken || token() === qt.SyntaxKind.DotToken || token() === qt.SyntaxKind.OpenBracketToken) {
      return expression;
    }

    // If we have seen "super" it must be followed by '(' or '.'.
    // If it wasn't then just try to parse out a '.' and report an error.
    const node = <PropertyAccessExpression>createNode(qt.SyntaxKind.PropertyAccessExpression, expression.pos);
    node.expression = expression;
    parseExpectedToken(qt.SyntaxKind.DotToken, Diagnostics.super_must_be_followed_by_an_argument_list_or_member_access);
    // private names will never work with `super` (`super.#foo`), but that's a semantic error, not syntactic
    node.name = parseRightSideOfDot(/*allowIdentifierNames*/ true, /*allowPrivateIdentifiers*/ true);
    return finishNode(node);
  }

  function parseJsxElementOrSelfClosingElementOrFragment(inExpressionContext: boolean): JsxElement | JsxSelfClosingElement | JsxFragment {
    const opening = parseJsxOpeningOrSelfClosingElementOrOpeningFragment(inExpressionContext);
    let result: JsxElement | JsxSelfClosingElement | JsxFragment;
    if (opening.kind === qt.SyntaxKind.JsxOpeningElement) {
      const node = <JsxElement>createNode(qt.SyntaxKind.JsxElement, opening.pos);
      node.openingElement = opening;

      node.children = parseJsxChildren(node.openingElement);
      node.closingElement = parseJsxClosingElement(inExpressionContext);

      if (!tagNamesAreEquivalent(node.openingElement.tagName, node.closingElement.tagName)) {
        parseErrorAtRange(node.closingElement, Diagnostics.Expected_corresponding_JSX_closing_tag_for_0, getTextOfNodeFromSourceText(sourceText, node.openingElement.tagName));
      }

      result = finishNode(node);
    } else if (opening.kind === qt.SyntaxKind.JsxOpeningFragment) {
      const node = <JsxFragment>createNode(qt.SyntaxKind.JsxFragment, opening.pos);
      node.openingFragment = opening;
      node.children = parseJsxChildren(node.openingFragment);
      node.closingFragment = parseJsxClosingFragment(inExpressionContext);

      result = finishNode(node);
    } else {
      Debug.assert(opening.kind === qt.SyntaxKind.JsxSelfClosingElement);
      // Nothing else to do for self-closing elements
      result = opening;
    }

    // If the user writes the invalid code '<div></div><div></div>' in an expression context (i.e. not wrapped in
    // an enclosing tag), we'll naively try to parse   ^ this as a 'less than' operator and the remainder of the tag
    // as garbage, which will cause the formatter to badly mangle the JSX. Perform a speculative parse of a JSX
    // element if we see a < token so that we can wrap it in a synthetic binary expression so the formatter
    // does less damage and we can report a better error.
    // Since JSX elements are invalid < operands anyway, this lookahead parse will only occur in error scenarios
    // of one sort or another.
    if (inExpressionContext && token() === qt.SyntaxKind.LessThanToken) {
      const invalidElement = tryParse(() => parseJsxElementOrSelfClosingElementOrFragment(/*inExpressionContext*/ true));
      if (invalidElement) {
        parseErrorAtCurrentToken(Diagnostics.JSX_expressions_must_have_one_parent_element);
        const badNode = <BinaryExpression>createNode(qt.SyntaxKind.BinaryExpression, result.pos);
        badNode.end = invalidElement.end;
        badNode.left = result;
        badNode.right = invalidElement;
        badNode.operatorToken = createMissingNode(qt.SyntaxKind.CommaToken, /*reportAtCurrentPosition*/ false);
        badNode.operatorToken.pos = badNode.operatorToken.end = badNode.right.pos;
        return <JsxElement>(<qt.Node>badNode);
      }
    }

    return result;
  }

  function parseJsxText(): JsxText {
    const node = <JsxText>createNode(qt.SyntaxKind.JsxText);
    node.text = scanner.getTokenValue();
    node.containsOnlyTriviaWhiteSpaces = currentToken === qt.SyntaxKind.JsxTextAllWhiteSpaces;
    currentToken = scanner.scanJsxToken();
    return finishNode(node);
  }

  function parseJsxChild(openingTag: JsxOpeningElement | JsxOpeningFragment, token: JsxTokenSyntaxKind): JsxChild | undefined {
    switch (token) {
      case qt.SyntaxKind.EndOfFileToken:
        // If we hit EOF, issue the error at the tag that lacks the closing element
        // rather than at the end of the file (which is useless)
        if (isJsxOpeningFragment(openingTag)) {
          parseErrorAtRange(openingTag, Diagnostics.JSX_fragment_has_no_corresponding_closing_tag);
        } else {
          // We want the error span to cover only 'Foo.Bar' in < Foo.Bar >
          // or to cover only 'Foo' in < Foo >
          const tag = openingTag.tagName;
          const start = skipTrivia(sourceText, tag.pos);
          parseErrorAt(start, tag.end, Diagnostics.JSX_element_0_has_no_corresponding_closing_tag, getTextOfNodeFromSourceText(sourceText, openingTag.tagName));
        }
        return undefined;
      case qt.SyntaxKind.LessThanSlashToken:
      case qt.SyntaxKind.ConflictMarkerTrivia:
        return undefined;
      case qt.SyntaxKind.JsxText:
      case qt.SyntaxKind.JsxTextAllWhiteSpaces:
        return parseJsxText();
      case qt.SyntaxKind.OpenBraceToken:
        return parseJsxExpression(/*inExpressionContext*/ false);
      case qt.SyntaxKind.LessThanToken:
        return parseJsxElementOrSelfClosingElementOrFragment(/*inExpressionContext*/ false);
      default:
        return Debug.assertNever(token);
    }
  }

  function parseJsxChildren(openingTag: JsxOpeningElement | JsxOpeningFragment): qt.NodeArray<JsxChild> {
    const list = [];
    const listPos = getNodePos();
    const saveParsingContext = parsingContext;
    parsingContext |= 1 << ParsingContext.JsxChildren;

    while (true) {
      const child = parseJsxChild(openingTag, (currentToken = scanner.reScanJsxToken()));
      if (!child) break;
      list.push(child);
    }

    parsingContext = saveParsingContext;
    return createNodeArray(list, listPos);
  }

  function parseJsxAttributes(): JsxAttributes {
    const jsxAttributes = <JsxAttributes>createNode(qt.SyntaxKind.JsxAttributes);
    jsxAttributes.properties = parseList(ParsingContext.JsxAttributes, parseJsxAttribute);
    return finishNode(jsxAttributes);
  }

  function parseJsxOpeningOrSelfClosingElementOrOpeningFragment(inExpressionContext: boolean): JsxOpeningElement | JsxSelfClosingElement | JsxOpeningFragment {
    const fullStart = scanner.getStartPos();

    parseExpected(qt.SyntaxKind.LessThanToken);

    if (token() === qt.SyntaxKind.GreaterThanToken) {
      // See below for explanation of scanJsxText
      const node: JsxOpeningFragment = <JsxOpeningFragment>createNode(qt.SyntaxKind.JsxOpeningFragment, fullStart);
      scanJsxText();
      return finishNode(node);
    }

    const tagName = parseJsxElementName();
    const typeArguments = tryParseTypeArguments();
    const attributes = parseJsxAttributes();

    let node: JsxOpeningLikeElement;

    if (token() === qt.SyntaxKind.GreaterThanToken) {
      // Closing tag, so scan the immediately-following text with the JSX scanning instead
      // of regular scanning to avoid treating illegal characters (e.g. '#') as immediate
      // scanning errors
      node = <JsxOpeningElement>createNode(qt.SyntaxKind.JsxOpeningElement, fullStart);
      scanJsxText();
    } else {
      parseExpected(qt.SyntaxKind.SlashToken);
      if (inExpressionContext) {
        parseExpected(qt.SyntaxKind.GreaterThanToken);
      } else {
        parseExpected(qt.SyntaxKind.GreaterThanToken, /*diagnostic*/ undefined, /*shouldAdvance*/ false);
        scanJsxText();
      }
      node = <JsxSelfClosingElement>createNode(qt.SyntaxKind.JsxSelfClosingElement, fullStart);
    }

    node.tagName = tagName;
    node.typeArguments = typeArguments;
    node.attributes = attributes;

    return finishNode(node);
  }

  function parseJsxElementName(): JsxTagNameExpression {
    scanJsxIdentifier();
    // JsxElement can have name in the form of
    //      propertyAccessExpression
    //      primaryExpression in the form of an identifier and "this" keyword
    // We can't just simply use parseLeftHandSideExpressionOrHigher because then we will start consider class,function etc as a keyword
    // We only want to consider "this" as a primaryExpression
    let expression: JsxTagNameExpression = token() === qt.SyntaxKind.ThisKeyword ? parseTokenNode<ThisExpression>() : parseIdentifierName();
    while (parseOptional(qt.SyntaxKind.DotToken)) {
      const propertyAccess: JsxTagNamePropertyAccess = <JsxTagNamePropertyAccess>createNode(qt.SyntaxKind.PropertyAccessExpression, expression.pos);
      propertyAccess.expression = expression;
      propertyAccess.name = parseRightSideOfDot(/*allowIdentifierNames*/ true, /*allowPrivateIdentifiers*/ false);
      expression = finishNode(propertyAccess);
    }
    return expression;
  }

  function parseJsxExpression(inExpressionContext: boolean): JsxExpression | undefined {
    const node = <JsxExpression>createNode(qt.SyntaxKind.JsxExpression);

    if (!parseExpected(qt.SyntaxKind.OpenBraceToken)) {
      return undefined;
    }

    if (token() !== qt.SyntaxKind.CloseBraceToken) {
      node.dotDotDotToken = parseOptionalToken(qt.SyntaxKind.DotDotDotToken);
      // Only an AssignmentExpression is valid here per the JSX spec,
      // but we can unambiguously parse a comma sequence and provide
      // a better error message in grammar checking.
      node.expression = parseExpression();
    }
    if (inExpressionContext) {
      parseExpected(qt.SyntaxKind.CloseBraceToken);
    } else {
      if (parseExpected(qt.SyntaxKind.CloseBraceToken, /*message*/ undefined, /*shouldAdvance*/ false)) {
        scanJsxText();
      }
    }

    return finishNode(node);
  }

  function parseJsxAttribute(): JsxAttribute | JsxSpreadAttribute {
    if (token() === qt.SyntaxKind.OpenBraceToken) {
      return parseJsxSpreadAttribute();
    }

    scanJsxIdentifier();
    const node = <JsxAttribute>createNode(qt.SyntaxKind.JsxAttribute);
    node.name = parseIdentifierName();
    if (token() === qt.SyntaxKind.EqualsToken) {
      switch (scanJsxAttributeValue()) {
        case qt.SyntaxKind.StringLiteral:
          node.initializer = parseLiteralNode();
          break;
        default:
          node.initializer = parseJsxExpression(/*inExpressionContext*/ true);
          break;
      }
    }
    return finishNode(node);
  }

  function parseJsxSpreadAttribute(): JsxSpreadAttribute {
    const node = <JsxSpreadAttribute>createNode(qt.SyntaxKind.JsxSpreadAttribute);
    parseExpected(qt.SyntaxKind.OpenBraceToken);
    parseExpected(qt.SyntaxKind.DotDotDotToken);
    node.expression = parseExpression();
    parseExpected(qt.SyntaxKind.CloseBraceToken);
    return finishNode(node);
  }

  function parseJsxClosingElement(inExpressionContext: boolean): JsxClosingElement {
    const node = <JsxClosingElement>createNode(qt.SyntaxKind.JsxClosingElement);
    parseExpected(qt.SyntaxKind.LessThanSlashToken);
    node.tagName = parseJsxElementName();
    if (inExpressionContext) {
      parseExpected(qt.SyntaxKind.GreaterThanToken);
    } else {
      parseExpected(qt.SyntaxKind.GreaterThanToken, /*diagnostic*/ undefined, /*shouldAdvance*/ false);
      scanJsxText();
    }
    return finishNode(node);
  }

  function parseJsxClosingFragment(inExpressionContext: boolean): JsxClosingFragment {
    const node = <JsxClosingFragment>createNode(qt.SyntaxKind.JsxClosingFragment);
    parseExpected(qt.SyntaxKind.LessThanSlashToken);
    if (tokenIsIdentifierOrKeyword(token())) {
      parseErrorAtRange(parseJsxElementName(), Diagnostics.Expected_corresponding_closing_tag_for_JSX_fragment);
    }
    if (inExpressionContext) {
      parseExpected(qt.SyntaxKind.GreaterThanToken);
    } else {
      parseExpected(qt.SyntaxKind.GreaterThanToken, /*diagnostic*/ undefined, /*shouldAdvance*/ false);
      scanJsxText();
    }
    return finishNode(node);
  }

  function parseTypeAssertion(): TypeAssertion {
    const node = <TypeAssertion>createNode(qt.SyntaxKind.TypeAssertionExpression);
    parseExpected(qt.SyntaxKind.LessThanToken);
    node.type = parseType();
    parseExpected(qt.SyntaxKind.GreaterThanToken);
    node.expression = parseSimpleUnaryExpression();
    return finishNode(node);
  }

  function nextTokenIsIdentifierOrKeywordOrOpenBracketOrTemplate() {
    nextToken();
    return tokenIsIdentifierOrKeyword(token()) || token() === qt.SyntaxKind.OpenBracketToken || isTemplateStartOfTaggedTemplate();
  }

  function isStartOfOptionalPropertyOrElementAccessChain() {
    return token() === qt.SyntaxKind.QuestionDotToken && lookAhead(nextTokenIsIdentifierOrKeywordOrOpenBracketOrTemplate);
  }

  function tryReparseOptionalChain(node: Expression) {
    if (node.flags & qt.NodeFlags.OptionalChain) {
      return true;
    }
    // check for an optional chain in a non-null expression
    if (isNonNullExpression(node)) {
      let expr = node.expression;
      while (isNonNullExpression(expr) && !(expr.flags & qt.NodeFlags.OptionalChain)) {
        expr = expr.expression;
      }
      if (expr.flags & qt.NodeFlags.OptionalChain) {
        // this is part of an optional chain. Walk down from `node` to `expression` and set the flag.
        while (isNonNullExpression(node)) {
          node.flags |= qt.NodeFlags.OptionalChain;
          node = node.expression;
        }
        return true;
      }
    }
    return false;
  }

  function parsePropertyAccessExpressionRest(expression: LeftHandSideExpression, questionDotToken: QuestionDotToken | undefined) {
    const propertyAccess = <PropertyAccessExpression>createNode(qt.SyntaxKind.PropertyAccessExpression, expression.pos);
    propertyAccess.expression = expression;
    propertyAccess.questionDotToken = questionDotToken;
    propertyAccess.name = parseRightSideOfDot(/*allowIdentifierNames*/ true, /*allowPrivateIdentifiers*/ true);
    if (questionDotToken || tryReparseOptionalChain(expression)) {
      propertyAccess.flags |= qt.NodeFlags.OptionalChain;
      if (isPrivateIdentifier(propertyAccess.name)) {
        parseErrorAtRange(propertyAccess.name, Diagnostics.An_optional_chain_cannot_contain_private_identifiers);
      }
    }
    return finishNode(propertyAccess);
  }

  function parseElementAccessExpressionRest(expression: LeftHandSideExpression, questionDotToken: QuestionDotToken | undefined) {
    const indexedAccess = <ElementAccessExpression>createNode(qt.SyntaxKind.ElementAccessExpression, expression.pos);
    indexedAccess.expression = expression;
    indexedAccess.questionDotToken = questionDotToken;

    if (token() === qt.SyntaxKind.CloseBracketToken) {
      indexedAccess.argumentExpression = createMissingNode(qt.SyntaxKind.Identifier, /*reportAtCurrentPosition*/ true, Diagnostics.An_element_access_expression_should_take_an_argument);
    } else {
      const argument = allowInAnd(parseExpression);
      if (isStringOrNumericLiteralLike(argument)) {
        argument.text = internIdentifier(argument.text);
      }
      indexedAccess.argumentExpression = argument;
    }

    parseExpected(qt.SyntaxKind.CloseBracketToken);
    if (questionDotToken || tryReparseOptionalChain(expression)) {
      indexedAccess.flags |= qt.NodeFlags.OptionalChain;
    }
    return finishNode(indexedAccess);
  }

  function parseMemberExpressionRest(expression: LeftHandSideExpression, allowOptionalChain: boolean): MemberExpression {
    while (true) {
      let questionDotToken: QuestionDotToken | undefined;
      let isPropertyAccess = false;
      if (allowOptionalChain && isStartOfOptionalPropertyOrElementAccessChain()) {
        questionDotToken = parseExpectedToken(qt.SyntaxKind.QuestionDotToken);
        isPropertyAccess = tokenIsIdentifierOrKeyword(token());
      } else {
        isPropertyAccess = parseOptional(qt.SyntaxKind.DotToken);
      }

      if (isPropertyAccess) {
        expression = parsePropertyAccessExpressionRest(expression, questionDotToken);
        continue;
      }

      if (!questionDotToken && token() === qt.SyntaxKind.ExclamationToken && !scanner.hasPrecedingLineBreak()) {
        nextToken();
        const nonNullExpression = <NonNullExpression>createNode(qt.SyntaxKind.NonNullExpression, expression.pos);
        nonNullExpression.expression = expression;
        expression = finishNode(nonNullExpression);
        continue;
      }

      // when in the [Decorator] context, we do not parse ElementAccess as it could be part of a ComputedPropertyName
      if ((questionDotToken || !inDecoratorContext()) && parseOptional(qt.SyntaxKind.OpenBracketToken)) {
        expression = parseElementAccessExpressionRest(expression, questionDotToken);
        continue;
      }

      if (isTemplateStartOfTaggedTemplate()) {
        expression = parseTaggedTemplateRest(expression, questionDotToken, /*typeArguments*/ undefined);
        continue;
      }

      return expression;
    }
  }

  function isTemplateStartOfTaggedTemplate() {
    return token() === qt.SyntaxKind.NoSubstitutionTemplateLiteral || token() === qt.SyntaxKind.TemplateHead;
  }

  function parseTaggedTemplateRest(tag: LeftHandSideExpression, questionDotToken: QuestionDotToken | undefined, typeArguments: qt.NodeArray<TypeNode> | undefined) {
    const tagExpression = <TaggedTemplateExpression>createNode(qt.SyntaxKind.TaggedTemplateExpression, tag.pos);
    tagExpression.tag = tag;
    tagExpression.questionDotToken = questionDotToken;
    tagExpression.typeArguments = typeArguments;
    tagExpression.template = token() === qt.SyntaxKind.NoSubstitutionTemplateLiteral ? (reScanTemplateHeadOrNoSubstitutionTemplate(), parseLiteralNode()) : parseTemplateExpression(/*isTaggedTemplate*/ true);
    if (questionDotToken || tag.flags & qt.NodeFlags.OptionalChain) {
      tagExpression.flags |= qt.NodeFlags.OptionalChain;
    }
    return finishNode(tagExpression);
  }

  function parseCallExpressionRest(expression: LeftHandSideExpression): LeftHandSideExpression {
    while (true) {
      expression = parseMemberExpressionRest(expression, /*allowOptionalChain*/ true);
      const questionDotToken = parseOptionalToken(qt.SyntaxKind.QuestionDotToken);

      // handle 'foo<<T>()'
      if (token() === qt.SyntaxKind.LessThanToken || token() === qt.SyntaxKind.LessThanLessThanToken) {
        // See if this is the start of a generic invocation.  If so, consume it and
        // keep checking for postfix expressions.  Otherwise, it's just a '<' that's
        // part of an arithmetic expression.  Break out so we consume it higher in the
        // stack.
        const typeArguments = tryParse(parseTypeArgumentsInExpression);
        if (typeArguments) {
          if (isTemplateStartOfTaggedTemplate()) {
            expression = parseTaggedTemplateRest(expression, questionDotToken, typeArguments);
            continue;
          }

          const callExpr = <CallExpression>createNode(qt.SyntaxKind.CallExpression, expression.pos);
          callExpr.expression = expression;
          callExpr.questionDotToken = questionDotToken;
          callExpr.typeArguments = typeArguments;
          callExpr.arguments = parseArgumentList();
          if (questionDotToken || tryReparseOptionalChain(expression)) {
            callExpr.flags |= qt.NodeFlags.OptionalChain;
          }
          expression = finishNode(callExpr);
          continue;
        }
      } else if (token() === qt.SyntaxKind.OpenParenToken) {
        const callExpr = <CallExpression>createNode(qt.SyntaxKind.CallExpression, expression.pos);
        callExpr.expression = expression;
        callExpr.questionDotToken = questionDotToken;
        callExpr.arguments = parseArgumentList();
        if (questionDotToken || tryReparseOptionalChain(expression)) {
          callExpr.flags |= qt.NodeFlags.OptionalChain;
        }
        expression = finishNode(callExpr);
        continue;
      }
      if (questionDotToken) {
        // We failed to parse anything, so report a missing identifier here.
        const propertyAccess = createNode(qt.SyntaxKind.PropertyAccessExpression, expression.pos) as PropertyAccessExpression;
        propertyAccess.expression = expression;
        propertyAccess.questionDotToken = questionDotToken;
        propertyAccess.name = createMissingNode(qt.SyntaxKind.Identifier, /*reportAtCurrentPosition*/ false, Diagnostics.Identifier_expected);
        propertyAccess.flags |= qt.NodeFlags.OptionalChain;
        expression = finishNode(propertyAccess);
      }
      break;
    }
    return expression;
  }

  function parseArgumentList() {
    parseExpected(qt.SyntaxKind.OpenParenToken);
    const result = parseDelimitedList(ParsingContext.ArgumentExpressions, parseArgumentExpression);
    parseExpected(qt.SyntaxKind.CloseParenToken);
    return result;
  }

  function parseTypeArgumentsInExpression() {
    if (reScanLessThanToken() !== qt.SyntaxKind.LessThanToken) {
      return undefined;
    }
    nextToken();

    const typeArguments = parseDelimitedList(ParsingContext.TypeArguments, parseType);
    if (!parseExpected(qt.SyntaxKind.GreaterThanToken)) {
      // If it doesn't have the closing `>` then it's definitely not an type argument list.
      return undefined;
    }

    // If we have a '<', then only parse this as a argument list if the type arguments
    // are complete and we have an open paren.  if we don't, rewind and return nothing.
    return typeArguments && canFollowTypeArgumentsInExpression() ? typeArguments : undefined;
  }

  function canFollowTypeArgumentsInExpression(): boolean {
    switch (token()) {
      case qt.SyntaxKind.OpenParenToken: // foo<x>(
      case qt.SyntaxKind.NoSubstitutionTemplateLiteral: // foo<T> `...`
      case qt.SyntaxKind.TemplateHead: // foo<T> `...${100}...`
      // these are the only tokens can legally follow a type argument
      // list. So we definitely want to treat them as type arg lists.
      // falls through
      case qt.SyntaxKind.DotToken: // foo<x>.
      case qt.SyntaxKind.CloseParenToken: // foo<x>)
      case qt.SyntaxKind.CloseBracketToken: // foo<x>]
      case qt.SyntaxKind.ColonToken: // foo<x>:
      case qt.SyntaxKind.SemicolonToken: // foo<x>;
      case qt.SyntaxKind.QuestionToken: // foo<x>?
      case qt.SyntaxKind.EqualsEqualsToken: // foo<x> ==
      case qt.SyntaxKind.EqualsEqualsEqualsToken: // foo<x> ===
      case qt.SyntaxKind.ExclamationEqualsToken: // foo<x> !=
      case qt.SyntaxKind.ExclamationEqualsEqualsToken: // foo<x> !==
      case qt.SyntaxKind.AmpersandAmpersandToken: // foo<x> &&
      case qt.SyntaxKind.BarBarToken: // foo<x> ||
      case qt.SyntaxKind.QuestionQuestionToken: // foo<x> ??
      case qt.SyntaxKind.CaretToken: // foo<x> ^
      case qt.SyntaxKind.AmpersandToken: // foo<x> &
      case qt.SyntaxKind.BarToken: // foo<x> |
      case qt.SyntaxKind.CloseBraceToken: // foo<x> }
      case qt.SyntaxKind.EndOfFileToken: // foo<x>
        // these cases can't legally follow a type arg list.  However, they're not legal
        // expressions either.  The user is probably in the middle of a generic type. So
        // treat it as such.
        return true;

      case qt.SyntaxKind.CommaToken: // foo<x>,
      case qt.SyntaxKind.OpenBraceToken: // foo<x> {
      // We don't want to treat these as type arguments.  Otherwise we'll parse this
      // as an invocation expression.  Instead, we want to parse out the expression
      // in isolation from the type arguments.
      // falls through
      default:
        // Anything else treat as an expression.
        return false;
    }
  }

  function parsePrimaryExpression(): PrimaryExpression {
    switch (token()) {
      case qt.SyntaxKind.NumericLiteral:
      case qt.SyntaxKind.BigIntLiteral:
      case qt.SyntaxKind.StringLiteral:
      case qt.SyntaxKind.NoSubstitutionTemplateLiteral:
        return parseLiteralNode();
      case qt.SyntaxKind.ThisKeyword:
      case qt.SyntaxKind.SuperKeyword:
      case qt.SyntaxKind.NullKeyword:
      case qt.SyntaxKind.TrueKeyword:
      case qt.SyntaxKind.FalseKeyword:
        return parseTokenNode<PrimaryExpression>();
      case qt.SyntaxKind.OpenParenToken:
        return parseParenthesizedExpression();
      case qt.SyntaxKind.OpenBracketToken:
        return parseArrayLiteralExpression();
      case qt.SyntaxKind.OpenBraceToken:
        return parseObjectLiteralExpression();
      case qt.SyntaxKind.AsyncKeyword:
        // Async arrow functions are parsed earlier in parseAssignmentExpressionOrHigher.
        // If we encounter `async [no LineTerminator here] function` then this is an async
        // function; otherwise, its an identifier.
        if (!lookAhead(nextTokenIsFunctionKeywordOnSameLine)) {
          break;
        }

        return parseFunctionExpression();
      case qt.SyntaxKind.ClassKeyword:
        return parseClassExpression();
      case qt.SyntaxKind.FunctionKeyword:
        return parseFunctionExpression();
      case qt.SyntaxKind.NewKeyword:
        return parseNewExpressionOrNewDotTarget();
      case qt.SyntaxKind.SlashToken:
      case qt.SyntaxKind.SlashEqualsToken:
        if (reScanSlashToken() === qt.SyntaxKind.RegularExpressionLiteral) {
          return parseLiteralNode();
        }
        break;
      case qt.SyntaxKind.TemplateHead:
        return parseTemplateExpression(/* isTaggedTemplate */ false);
    }

    return parseIdentifier(Diagnostics.Expression_expected);
  }

  function parseParenthesizedExpression(): ParenthesizedExpression {
    const node = <ParenthesizedExpression>createNodeWithJSDoc(qt.SyntaxKind.ParenthesizedExpression);
    parseExpected(qt.SyntaxKind.OpenParenToken);
    node.expression = allowInAnd(parseExpression);
    parseExpected(qt.SyntaxKind.CloseParenToken);
    return finishNode(node);
  }

  function parseSpreadElement(): Expression {
    const node = <SpreadElement>createNode(qt.SyntaxKind.SpreadElement);
    parseExpected(qt.SyntaxKind.DotDotDotToken);
    node.expression = parseAssignmentExpressionOrHigher();
    return finishNode(node);
  }

  function parseArgumentOrArrayLiteralElement(): Expression {
    return token() === qt.SyntaxKind.DotDotDotToken ? parseSpreadElement() : token() === qt.SyntaxKind.CommaToken ? <Expression>createNode(qt.SyntaxKind.OmittedExpression) : parseAssignmentExpressionOrHigher();
  }

  function parseArgumentExpression(): Expression {
    return doOutsideOfContext(disallowInAndDecoratorContext, parseArgumentOrArrayLiteralElement);
  }

  function parseArrayLiteralExpression(): ArrayLiteralExpression {
    const node = <ArrayLiteralExpression>createNode(qt.SyntaxKind.ArrayLiteralExpression);
    parseExpected(qt.SyntaxKind.OpenBracketToken);
    if (scanner.hasPrecedingLineBreak()) {
      node.multiLine = true;
    }
    node.elements = parseDelimitedList(ParsingContext.ArrayLiteralMembers, parseArgumentOrArrayLiteralElement);
    parseExpected(qt.SyntaxKind.CloseBracketToken);
    return finishNode(node);
  }

  function parseObjectLiteralElement(): ObjectLiteralElementLike {
    const node = <ObjectLiteralElementLike>createNodeWithJSDoc(qt.SyntaxKind.Unknown);

    if (parseOptionalToken(qt.SyntaxKind.DotDotDotToken)) {
      node.kind = qt.SyntaxKind.SpreadAssignment;
      node.expression = parseAssignmentExpressionOrHigher();
      return finishNode(node);
    }

    node.decorators = parseDecorators();
    node.modifiers = parseModifiers();

    if (parseContextualModifier(qt.SyntaxKind.GetKeyword)) {
      return parseAccessorDeclaration(node, qt.SyntaxKind.GetAccessor);
    }
    if (parseContextualModifier(qt.SyntaxKind.SetKeyword)) {
      return parseAccessorDeclaration(node, qt.SyntaxKind.SetAccessor);
    }

    const asteriskToken = parseOptionalToken(qt.SyntaxKind.AsteriskToken);
    const tokenIsIdentifier = isIdentifier();
    node.name = parsePropertyName();
    // Disallowing of optional property assignments and definite assignment assertion happens in the grammar checker.
    node.questionToken = parseOptionalToken(qt.SyntaxKind.QuestionToken);
    node.exclamationToken = parseOptionalToken(qt.SyntaxKind.ExclamationToken);

    if (asteriskToken || token() === qt.SyntaxKind.OpenParenToken || token() === qt.SyntaxKind.LessThanToken) {
      return parseMethodDeclaration(node, asteriskToken);
    }

    // check if it is short-hand property assignment or normal property assignment
    // NOTE: if token is EqualsToken it is interpreted as CoverInitializedName production
    // CoverInitializedName[Yield] :
    //     qt.IdentifierReference[?Yield] Initializer[In, ?Yield]
    // this is necessary because ObjectLiteral productions are also used to cover grammar for ObjectAssignmentPattern
    const isShorthandPropertyAssignment = tokenIsIdentifier && token() !== qt.SyntaxKind.ColonToken;
    if (isShorthandPropertyAssignment) {
      node.kind = qt.SyntaxKind.ShorthandPropertyAssignment;
      const equalsToken = parseOptionalToken(qt.SyntaxKind.EqualsToken);
      if (equalsToken) {
        node.equalsToken = equalsToken;
        node.objectAssignmentInitializer = allowInAnd(parseAssignmentExpressionOrHigher);
      }
    } else {
      node.kind = qt.SyntaxKind.PropertyAssignment;
      parseExpected(qt.SyntaxKind.ColonToken);
      node.initializer = allowInAnd(parseAssignmentExpressionOrHigher);
    }
    return finishNode(node);
  }

  function parseObjectLiteralExpression(): ObjectLiteralExpression {
    const node = <ObjectLiteralExpression>createNode(qt.SyntaxKind.ObjectLiteralExpression);
    const openBracePosition = scanner.getTokenPos();
    parseExpected(qt.SyntaxKind.OpenBraceToken);
    if (scanner.hasPrecedingLineBreak()) {
      node.multiLine = true;
    }

    node.properties = parseDelimitedList(ParsingContext.ObjectLiteralMembers, parseObjectLiteralElement, /*considerSemicolonAsDelimiter*/ true);
    if (!parseExpected(qt.SyntaxKind.CloseBraceToken)) {
      const lastError = qc.lastOrUndefined(parseDiagnostics);
      if (lastError && lastError.code === Diagnostics._0_expected.code) {
        addRelatedInfo(lastError, createFileDiagnostic(sourceFile, openBracePosition, 1, Diagnostics.The_parser_expected_to_find_a_to_match_the_token_here));
      }
    }
    return finishNode(node);
  }

  function parseFunctionExpression(): FunctionExpression {
    // GeneratorExpression:
    //      function* BindingIdentifier [Yield][opt](FormalParameters[Yield]){ GeneratorBody }
    //
    // FunctionExpression:
    //      function BindingIdentifier[opt](FormalParameters){ FunctionBody }
    const saveDecoratorContext = inDecoratorContext();
    if (saveDecoratorContext) {
      setDecoratorContext(/*val*/ false);
    }

    const node = <qt.FunctionExpression>createNodeWithJSDoc(qt.SyntaxKind.FunctionExpression);
    node.modifiers = parseModifiers();
    parseExpected(qt.SyntaxKind.FunctionKeyword);
    node.asteriskToken = parseOptionalToken(qt.SyntaxKind.AsteriskToken);

    const isGenerator = node.asteriskToken ? SignatureFlags.Yield : SignatureFlags.None;
    const isAsync = hasModifierOfKind(node, qt.SyntaxKind.AsyncKeyword) ? SignatureFlags.Await : SignatureFlags.None;
    node.name = isGenerator && isAsync ? doInYieldAndAwaitContext(parseOptionalIdentifier) : isGenerator ? doInYieldContext(parseOptionalIdentifier) : isAsync ? doInAwaitContext(parseOptionalIdentifier) : parseOptionalIdentifier();

    fillSignature(qt.SyntaxKind.ColonToken, isGenerator | isAsync, node);
    node.body = parseFunctionBlock(isGenerator | isAsync);

    if (saveDecoratorContext) {
      setDecoratorContext(/*val*/ true);
    }

    return finishNode(node);
  }

  function parseOptionalIdentifier(): qt.Identifier | undefined {
    return isIdentifier() ? parseIdentifier() : undefined;
  }

  function parseNewExpressionOrNewDotTarget(): NewExpression | MetaProperty {
    const fullStart = scanner.getStartPos();
    parseExpected(qt.SyntaxKind.NewKeyword);
    if (parseOptional(qt.SyntaxKind.DotToken)) {
      const node = <MetaProperty>createNode(qt.SyntaxKind.MetaProperty, fullStart);
      node.keywordToken = qt.SyntaxKind.NewKeyword;
      node.name = parseIdentifierName();
      return finishNode(node);
    }

    let expression: MemberExpression = parsePrimaryExpression();
    let typeArguments;
    while (true) {
      expression = parseMemberExpressionRest(expression, /*allowOptionalChain*/ false);
      typeArguments = tryParse(parseTypeArgumentsInExpression);
      if (isTemplateStartOfTaggedTemplate()) {
        Debug.assert(!!typeArguments, "Expected a type argument list; all plain tagged template starts should be consumed in 'parseMemberExpressionRest'");
        expression = parseTaggedTemplateRest(expression, /*optionalChain*/ undefined, typeArguments);
        typeArguments = undefined;
      }
      break;
    }

    const node = <NewExpression>createNode(qt.SyntaxKind.NewExpression, fullStart);
    node.expression = expression;
    node.typeArguments = typeArguments;
    if (token() === qt.SyntaxKind.OpenParenToken) {
      node.arguments = parseArgumentList();
    } else if (node.typeArguments) {
      parseErrorAt(fullStart, scanner.getStartPos(), Diagnostics.A_new_expression_with_type_arguments_must_always_be_followed_by_a_parenthesized_argument_list);
    }
    return finishNode(node);
  }

  // STATEMENTS
  function parseBlock(ignoreMissingOpenBrace: boolean, diagnosticMessage?: qt.DiagnosticMessage): Block {
    const node = <Block>createNode(qt.SyntaxKind.Block);
    const openBracePosition = scanner.getTokenPos();
    if (parseExpected(qt.SyntaxKind.OpenBraceToken, diagnosticMessage) || ignoreMissingOpenBrace) {
      if (scanner.hasPrecedingLineBreak()) {
        node.multiLine = true;
      }

      node.statements = parseList(ParsingContext.BlockStatements, parseStatement);
      if (!parseExpected(qt.SyntaxKind.CloseBraceToken)) {
        const lastError = qc.lastOrUndefined(parseDiagnostics);
        if (lastError && lastError.code === Diagnostics._0_expected.code) {
          addRelatedInfo(lastError, createFileDiagnostic(sourceFile, openBracePosition, 1, Diagnostics.The_parser_expected_to_find_a_to_match_the_token_here));
        }
      }
    } else {
      node.statements = createMissingList<Statement>();
    }
    return finishNode(node);
  }

  function parseFunctionBlock(flags: SignatureFlags, diagnosticMessage?: qt.DiagnosticMessage): Block {
    const savedYieldContext = inYieldContext();
    setYieldContext(!!(flags & SignatureFlags.Yield));

    const savedAwaitContext = inAwaitContext();
    setAwaitContext(!!(flags & SignatureFlags.Await));

    // We may be in a [Decorator] context when parsing a function expression or
    // arrow function. The body of the function is not in [Decorator] context.
    const saveDecoratorContext = inDecoratorContext();
    if (saveDecoratorContext) {
      setDecoratorContext(/*val*/ false);
    }

    const block = parseBlock(!!(flags & SignatureFlags.IgnoreMissingOpenBrace), diagnosticMessage);

    if (saveDecoratorContext) {
      setDecoratorContext(/*val*/ true);
    }

    setYieldContext(savedYieldContext);
    setAwaitContext(savedAwaitContext);

    return block;
  }

  function parseEmptyStatement(): Statement {
    const node = <Statement>createNode(qt.SyntaxKind.EmptyStatement);
    parseExpected(qt.SyntaxKind.SemicolonToken);
    return finishNode(node);
  }

  function parseIfStatement(): IfStatement {
    const node = <IfStatement>createNode(qt.SyntaxKind.IfStatement);
    parseExpected(qt.SyntaxKind.IfKeyword);
    parseExpected(qt.SyntaxKind.OpenParenToken);
    node.expression = allowInAnd(parseExpression);
    parseExpected(qt.SyntaxKind.CloseParenToken);
    node.thenStatement = parseStatement();
    node.elseStatement = parseOptional(qt.SyntaxKind.ElseKeyword) ? parseStatement() : undefined;
    return finishNode(node);
  }

  function parseDoStatement(): DoStatement {
    const node = <DoStatement>createNode(qt.SyntaxKind.DoStatement);
    parseExpected(qt.SyntaxKind.DoKeyword);
    node.statement = parseStatement();
    parseExpected(qt.SyntaxKind.WhileKeyword);
    parseExpected(qt.SyntaxKind.OpenParenToken);
    node.expression = allowInAnd(parseExpression);
    parseExpected(qt.SyntaxKind.CloseParenToken);

    // From: https://mail.mozilla.org/pipermail/es-discuss/2011-August/016188.html
    // 157 min --- All allen at wirfs-brock.com CONF --- "do{;}while(false)false" prohibited in
    // spec but allowed in consensus reality. Approved -- this is the de-facto standard whereby
    //  do;while(0)x will have a semicolon inserted before x.
    parseOptional(qt.SyntaxKind.SemicolonToken);
    return finishNode(node);
  }

  function parseWhileStatement(): WhileStatement {
    const node = <WhileStatement>createNode(qt.SyntaxKind.WhileStatement);
    parseExpected(qt.SyntaxKind.WhileKeyword);
    parseExpected(qt.SyntaxKind.OpenParenToken);
    node.expression = allowInAnd(parseExpression);
    parseExpected(qt.SyntaxKind.CloseParenToken);
    node.statement = parseStatement();
    return finishNode(node);
  }

  function parseForOrForInOrForOfStatement(): Statement {
    const pos = getNodePos();
    parseExpected(qt.SyntaxKind.ForKeyword);
    const awaitToken = parseOptionalToken(qt.SyntaxKind.AwaitKeyword);
    parseExpected(qt.SyntaxKind.OpenParenToken);

    let initializer!: qt.VariableDeclarationList | Expression;
    if (token() !== qt.SyntaxKind.SemicolonToken) {
      if (token() === qt.SyntaxKind.VarKeyword || token() === qt.SyntaxKind.LetKeyword || token() === qt.SyntaxKind.ConstKeyword) {
        initializer = parseVariableDeclarationList(/*inForStatementInitializer*/ true);
      } else {
        initializer = disallowInAnd(parseExpression);
      }
    }
    let forOrForInOrForOfStatement: IterationStatement;
    if (awaitToken ? parseExpected(qt.SyntaxKind.OfKeyword) : parseOptional(qt.SyntaxKind.OfKeyword)) {
      const forOfStatement = <ForOfStatement>createNode(qt.SyntaxKind.ForOfStatement, pos);
      forOfStatement.awaitModifier = awaitToken;
      forOfStatement.initializer = initializer;
      forOfStatement.expression = allowInAnd(parseAssignmentExpressionOrHigher);
      parseExpected(qt.SyntaxKind.CloseParenToken);
      forOrForInOrForOfStatement = forOfStatement;
    } else if (parseOptional(qt.SyntaxKind.InKeyword)) {
      const forInStatement = <ForInStatement>createNode(qt.SyntaxKind.ForInStatement, pos);
      forInStatement.initializer = initializer;
      forInStatement.expression = allowInAnd(parseExpression);
      parseExpected(qt.SyntaxKind.CloseParenToken);
      forOrForInOrForOfStatement = forInStatement;
    } else {
      const forStatement = <ForStatement>createNode(qt.SyntaxKind.ForStatement, pos);
      forStatement.initializer = initializer;
      parseExpected(qt.SyntaxKind.SemicolonToken);
      if (token() !== qt.SyntaxKind.SemicolonToken && token() !== qt.SyntaxKind.CloseParenToken) {
        forStatement.condition = allowInAnd(parseExpression);
      }
      parseExpected(qt.SyntaxKind.SemicolonToken);
      if (token() !== qt.SyntaxKind.CloseParenToken) {
        forStatement.incrementor = allowInAnd(parseExpression);
      }
      parseExpected(qt.SyntaxKind.CloseParenToken);
      forOrForInOrForOfStatement = forStatement;
    }

    forOrForInOrForOfStatement.statement = parseStatement();

    return finishNode(forOrForInOrForOfStatement);
  }

  function parseBreakOrContinueStatement(kind: qt.SyntaxKind): BreakOrContinueStatement {
    const node = <BreakOrContinueStatement>createNode(kind);

    parseExpected(kind === qt.SyntaxKind.BreakStatement ? qt.SyntaxKind.BreakKeyword : qt.SyntaxKind.ContinueKeyword);
    if (!canParseSemicolon()) {
      node.label = parseIdentifier();
    }

    parseSemicolon();
    return finishNode(node);
  }

  function parseReturnStatement(): ReturnStatement {
    const node = <ReturnStatement>createNode(qt.SyntaxKind.ReturnStatement);

    parseExpected(qt.SyntaxKind.ReturnKeyword);
    if (!canParseSemicolon()) {
      node.expression = allowInAnd(parseExpression);
    }

    parseSemicolon();
    return finishNode(node);
  }

  function parseWithStatement(): WithStatement {
    const node = <WithStatement>createNode(qt.SyntaxKind.WithStatement);
    parseExpected(qt.SyntaxKind.WithKeyword);
    parseExpected(qt.SyntaxKind.OpenParenToken);
    node.expression = allowInAnd(parseExpression);
    parseExpected(qt.SyntaxKind.CloseParenToken);
    node.statement = doInsideOfContext(qt.NodeFlags.InWithStatement, parseStatement);
    return finishNode(node);
  }

  function parseCaseClause(): CaseClause {
    const node = <CaseClause>createNode(qt.SyntaxKind.CaseClause);
    parseExpected(qt.SyntaxKind.CaseKeyword);
    node.expression = allowInAnd(parseExpression);
    parseExpected(qt.SyntaxKind.ColonToken);
    node.statements = parseList(ParsingContext.SwitchClauseStatements, parseStatement);
    return finishNode(node);
  }

  function parseDefaultClause(): DefaultClause {
    const node = <DefaultClause>createNode(qt.SyntaxKind.DefaultClause);
    parseExpected(qt.SyntaxKind.DefaultKeyword);
    parseExpected(qt.SyntaxKind.ColonToken);
    node.statements = parseList(ParsingContext.SwitchClauseStatements, parseStatement);
    return finishNode(node);
  }

  function parseCaseOrDefaultClause(): CaseOrDefaultClause {
    return token() === qt.SyntaxKind.CaseKeyword ? parseCaseClause() : parseDefaultClause();
  }

  function parseSwitchStatement(): SwitchStatement {
    const node = <SwitchStatement>createNode(qt.SyntaxKind.SwitchStatement);
    parseExpected(qt.SyntaxKind.SwitchKeyword);
    parseExpected(qt.SyntaxKind.OpenParenToken);
    node.expression = allowInAnd(parseExpression);
    parseExpected(qt.SyntaxKind.CloseParenToken);
    const caseBlock = <CaseBlock>createNode(qt.SyntaxKind.CaseBlock);
    parseExpected(qt.SyntaxKind.OpenBraceToken);
    caseBlock.clauses = parseList(ParsingContext.SwitchClauses, parseCaseOrDefaultClause);
    parseExpected(qt.SyntaxKind.CloseBraceToken);
    node.caseBlock = finishNode(caseBlock);
    return finishNode(node);
  }

  function parseThrowStatement(): ThrowStatement {
    // ThrowStatement[Yield] :
    //      throw [no LineTerminator here]Expression[In, ?Yield];

    // Because of automatic semicolon insertion, we need to report error if this
    // throw could be terminated with a semicolon.  Note: we can't call 'parseExpression'
    // directly as that might consume an expression on the following line.
    // We just return 'undefined' in that case.  The actual error will be reported in the
    // grammar walker.
    const node = <ThrowStatement>createNode(qt.SyntaxKind.ThrowStatement);
    parseExpected(qt.SyntaxKind.ThrowKeyword);
    node.expression = scanner.hasPrecedingLineBreak() ? undefined : allowInAnd(parseExpression);
    parseSemicolon();
    return finishNode(node);
  }

  // TODO: Review for error recovery
  function parseTryStatement(): TryStatement {
    const node = <TryStatement>createNode(qt.SyntaxKind.TryStatement);

    parseExpected(qt.SyntaxKind.TryKeyword);
    node.tryBlock = parseBlock(/*ignoreMissingOpenBrace*/ false);
    node.catchClause = token() === qt.SyntaxKind.CatchKeyword ? parseCatchClause() : undefined;

    // If we don't have a catch clause, then we must have a finally clause.  Try to parse
    // one out no matter what.
    if (!node.catchClause || token() === qt.SyntaxKind.FinallyKeyword) {
      parseExpected(qt.SyntaxKind.FinallyKeyword);
      node.finallyBlock = parseBlock(/*ignoreMissingOpenBrace*/ false);
    }

    return finishNode(node);
  }

  function parseCatchClause(): CatchClause {
    const result = <CatchClause>createNode(qt.SyntaxKind.CatchClause);
    parseExpected(qt.SyntaxKind.CatchKeyword);

    if (parseOptional(qt.SyntaxKind.OpenParenToken)) {
      result.variableDeclaration = parseVariableDeclaration();
      parseExpected(qt.SyntaxKind.CloseParenToken);
    } else {
      // Keep shape of node to avoid degrading performance.
      result.variableDeclaration = undefined;
    }

    result.block = parseBlock(/*ignoreMissingOpenBrace*/ false);
    return finishNode(result);
  }

  function parseDebuggerStatement(): Statement {
    const node = <Statement>createNode(qt.SyntaxKind.DebuggerStatement);
    parseExpected(qt.SyntaxKind.DebuggerKeyword);
    parseSemicolon();
    return finishNode(node);
  }

  function parseExpressionOrLabeledStatement(): ExpressionStatement | LabeledStatement {
    // Avoiding having to do the lookahead for a labeled statement by just trying to parse
    // out an expression, seeing if it is identifier and then seeing if it is followed by
    // a colon.
    const node = <ExpressionStatement | LabeledStatement>createNodeWithJSDoc(token() === qt.SyntaxKind.Identifier ? qt.SyntaxKind.Unknown : qt.SyntaxKind.ExpressionStatement);
    const expression = allowInAnd(parseExpression);
    if (expression.kind === qt.SyntaxKind.Identifier && parseOptional(qt.SyntaxKind.ColonToken)) {
      node.kind = qt.SyntaxKind.LabeledStatement;
      (<LabeledStatement>node).label = expression;
      (<LabeledStatement>node).statement = parseStatement();
    } else {
      node.kind = qt.SyntaxKind.ExpressionStatement;
      (<ExpressionStatement>node).expression = expression;
      parseSemicolon();
    }
    return finishNode(node);
  }

  function nextTokenIsIdentifierOrKeywordOnSameLine() {
    nextToken();
    return tokenIsIdentifierOrKeyword(token()) && !scanner.hasPrecedingLineBreak();
  }

  function nextTokenIsClassKeywordOnSameLine() {
    nextToken();
    return token() === qt.SyntaxKind.ClassKeyword && !scanner.hasPrecedingLineBreak();
  }

  function nextTokenIsFunctionKeywordOnSameLine() {
    nextToken();
    return token() === qt.SyntaxKind.FunctionKeyword && !scanner.hasPrecedingLineBreak();
  }

  function nextTokenIsIdentifierOrKeywordOrLiteralOnSameLine() {
    nextToken();
    return (tokenIsIdentifierOrKeyword(token()) || token() === qt.SyntaxKind.NumericLiteral || token() === qt.SyntaxKind.BigIntLiteral || token() === qt.SyntaxKind.StringLiteral) && !scanner.hasPrecedingLineBreak();
  }

  function isDeclaration(): boolean {
    while (true) {
      switch (token()) {
        case qt.SyntaxKind.VarKeyword:
        case qt.SyntaxKind.LetKeyword:
        case qt.SyntaxKind.ConstKeyword:
        case qt.SyntaxKind.FunctionKeyword:
        case qt.SyntaxKind.ClassKeyword:
        case qt.SyntaxKind.EnumKeyword:
          return true;

        // 'declare', 'module', 'namespace', 'interface'* and 'type' are all legal JavaScript identifiers;
        // however, an identifier cannot be followed by another identifier on the same line. This is what we
        // count on to parse out the respective declarations. For instance, we exploit this to say that
        //
        //    namespace n
        //
        // can be none other than the beginning of a namespace declaration, but need to respect that JavaScript sees
        //
        //    namespace
        //    n
        //
        // as the identifier 'namespace' on one line followed by the identifier 'n' on another.
        // We need to look one token ahead to see if it permissible to try parsing a declaration.
        //
        // *Note*: 'interface' is actually a strict mode reserved word. So while
        //
        //   "use strict"
        //   interface
        //   I {}
        //
        // could be legal, it would add complexity for very little gain.
        case qt.SyntaxKind.InterfaceKeyword:
        case qt.SyntaxKind.TypeKeyword:
          return nextTokenIsIdentifierOnSameLine();
        case qt.SyntaxKind.ModuleKeyword:
        case qt.SyntaxKind.NamespaceKeyword:
          return nextTokenIsIdentifierOrStringLiteralOnSameLine();
        case qt.SyntaxKind.AbstractKeyword:
        case qt.SyntaxKind.AsyncKeyword:
        case qt.SyntaxKind.DeclareKeyword:
        case qt.SyntaxKind.PrivateKeyword:
        case qt.SyntaxKind.ProtectedKeyword:
        case qt.SyntaxKind.PublicKeyword:
        case qt.SyntaxKind.ReadonlyKeyword:
          nextToken();
          // ASI takes effect for this modifier.
          if (scanner.hasPrecedingLineBreak()) {
            return false;
          }
          continue;

        case qt.SyntaxKind.GlobalKeyword:
          nextToken();
          return token() === qt.SyntaxKind.OpenBraceToken || token() === qt.SyntaxKind.Identifier || token() === qt.SyntaxKind.ExportKeyword;

        case qt.SyntaxKind.ImportKeyword:
          nextToken();
          return token() === qt.SyntaxKind.StringLiteral || token() === qt.SyntaxKind.AsteriskToken || token() === qt.SyntaxKind.OpenBraceToken || tokenIsIdentifierOrKeyword(token());
        case qt.SyntaxKind.ExportKeyword:
          let currentToken = nextToken();
          if (currentToken === qt.SyntaxKind.TypeKeyword) {
            currentToken = lookAhead(nextToken);
          }
          if (currentToken === qt.SyntaxKind.EqualsToken || currentToken === qt.SyntaxKind.AsteriskToken || currentToken === qt.SyntaxKind.OpenBraceToken || currentToken === qt.SyntaxKind.DefaultKeyword || currentToken === qt.SyntaxKind.AsKeyword) {
            return true;
          }
          continue;

        case qt.SyntaxKind.StaticKeyword:
          nextToken();
          continue;
        default:
          return false;
      }
    }
  }

  function isStartOfDeclaration(): boolean {
    return lookAhead(isDeclaration);
  }

  function isStartOfStatement(): boolean {
    switch (token()) {
      case qt.SyntaxKind.AtToken:
      case qt.SyntaxKind.SemicolonToken:
      case qt.SyntaxKind.OpenBraceToken:
      case qt.SyntaxKind.VarKeyword:
      case qt.SyntaxKind.LetKeyword:
      case qt.SyntaxKind.FunctionKeyword:
      case qt.SyntaxKind.ClassKeyword:
      case qt.SyntaxKind.EnumKeyword:
      case qt.SyntaxKind.IfKeyword:
      case qt.SyntaxKind.DoKeyword:
      case qt.SyntaxKind.WhileKeyword:
      case qt.SyntaxKind.ForKeyword:
      case qt.SyntaxKind.ContinueKeyword:
      case qt.SyntaxKind.BreakKeyword:
      case qt.SyntaxKind.ReturnKeyword:
      case qt.SyntaxKind.WithKeyword:
      case qt.SyntaxKind.SwitchKeyword:
      case qt.SyntaxKind.ThrowKeyword:
      case qt.SyntaxKind.TryKeyword:
      case qt.SyntaxKind.DebuggerKeyword:
      // 'catch' and 'finally' do not actually indicate that the code is part of a statement,
      // however, we say they are here so that we may gracefully parse them and error later.
      // falls through
      case qt.SyntaxKind.CatchKeyword:
      case qt.SyntaxKind.FinallyKeyword:
        return true;

      case qt.SyntaxKind.ImportKeyword:
        return isStartOfDeclaration() || lookAhead(nextTokenIsOpenParenOrLessThanOrDot);

      case qt.SyntaxKind.ConstKeyword:
      case qt.SyntaxKind.ExportKeyword:
        return isStartOfDeclaration();

      case qt.SyntaxKind.AsyncKeyword:
      case qt.SyntaxKind.DeclareKeyword:
      case qt.SyntaxKind.InterfaceKeyword:
      case qt.SyntaxKind.ModuleKeyword:
      case qt.SyntaxKind.NamespaceKeyword:
      case qt.SyntaxKind.TypeKeyword:
      case qt.SyntaxKind.GlobalKeyword:
        // When these don't start a declaration, they're an identifier in an expression statement
        return true;

      case qt.SyntaxKind.PublicKeyword:
      case qt.SyntaxKind.PrivateKeyword:
      case qt.SyntaxKind.ProtectedKeyword:
      case qt.SyntaxKind.StaticKeyword:
      case qt.SyntaxKind.ReadonlyKeyword:
        // When these don't start a declaration, they may be the start of a class member if an identifier
        // immediately follows. Otherwise they're an identifier in an expression statement.
        return isStartOfDeclaration() || !lookAhead(nextTokenIsIdentifierOrKeywordOnSameLine);

      default:
        return isStartOfExpression();
    }
  }

  function nextTokenIsIdentifierOrStartOfDestructuring() {
    nextToken();
    return isIdentifier() || token() === qt.SyntaxKind.OpenBraceToken || token() === qt.SyntaxKind.OpenBracketToken;
  }

  function isLetDeclaration() {
    // In ES6 'let' always starts a lexical declaration if followed by an identifier or {
    // or [.
    return lookAhead(nextTokenIsIdentifierOrStartOfDestructuring);
  }

  function parseStatement(): Statement {
    switch (token()) {
      case qt.SyntaxKind.SemicolonToken:
        return parseEmptyStatement();
      case qt.SyntaxKind.OpenBraceToken:
        return parseBlock(/*ignoreMissingOpenBrace*/ false);
      case qt.SyntaxKind.VarKeyword:
        return parseVariableStatement(<VariableStatement>createNodeWithJSDoc(qt.SyntaxKind.VariableDeclaration));
      case qt.SyntaxKind.LetKeyword:
        if (isLetDeclaration()) {
          return parseVariableStatement(<VariableStatement>createNodeWithJSDoc(qt.SyntaxKind.VariableDeclaration));
        }
        break;
      case qt.SyntaxKind.FunctionKeyword:
        return parseFunctionDeclaration(<qt.FunctionDeclaration>createNodeWithJSDoc(qt.SyntaxKind.FunctionDeclaration));
      case qt.SyntaxKind.ClassKeyword:
        return parseClassDeclaration(<ClassDeclaration>createNodeWithJSDoc(qt.SyntaxKind.ClassDeclaration));
      case qt.SyntaxKind.IfKeyword:
        return parseIfStatement();
      case qt.SyntaxKind.DoKeyword:
        return parseDoStatement();
      case qt.SyntaxKind.WhileKeyword:
        return parseWhileStatement();
      case qt.SyntaxKind.ForKeyword:
        return parseForOrForInOrForOfStatement();
      case qt.SyntaxKind.ContinueKeyword:
        return parseBreakOrContinueStatement(qt.SyntaxKind.ContinueStatement);
      case qt.SyntaxKind.BreakKeyword:
        return parseBreakOrContinueStatement(qt.SyntaxKind.BreakStatement);
      case qt.SyntaxKind.ReturnKeyword:
        return parseReturnStatement();
      case qt.SyntaxKind.WithKeyword:
        return parseWithStatement();
      case qt.SyntaxKind.SwitchKeyword:
        return parseSwitchStatement();
      case qt.SyntaxKind.ThrowKeyword:
        return parseThrowStatement();
      case qt.SyntaxKind.TryKeyword:
      // Include 'catch' and 'finally' for error recovery.
      // falls through
      case qt.SyntaxKind.CatchKeyword:
      case qt.SyntaxKind.FinallyKeyword:
        return parseTryStatement();
      case qt.SyntaxKind.DebuggerKeyword:
        return parseDebuggerStatement();
      case qt.SyntaxKind.AtToken:
        return parseDeclaration();
      case qt.SyntaxKind.AsyncKeyword:
      case qt.SyntaxKind.InterfaceKeyword:
      case qt.SyntaxKind.TypeKeyword:
      case qt.SyntaxKind.ModuleKeyword:
      case qt.SyntaxKind.NamespaceKeyword:
      case qt.SyntaxKind.DeclareKeyword:
      case qt.SyntaxKind.ConstKeyword:
      case qt.SyntaxKind.EnumKeyword:
      case qt.SyntaxKind.ExportKeyword:
      case qt.SyntaxKind.ImportKeyword:
      case qt.SyntaxKind.PrivateKeyword:
      case qt.SyntaxKind.ProtectedKeyword:
      case qt.SyntaxKind.PublicKeyword:
      case qt.SyntaxKind.AbstractKeyword:
      case qt.SyntaxKind.StaticKeyword:
      case qt.SyntaxKind.ReadonlyKeyword:
      case qt.SyntaxKind.GlobalKeyword:
        if (isStartOfDeclaration()) {
          return parseDeclaration();
        }
        break;
    }
    return parseExpressionOrLabeledStatement();
  }

  function isDeclareModifier(modifier: Modifier) {
    return modifier.kind === qt.SyntaxKind.DeclareKeyword;
  }

  function parseDeclaration(): Statement {
    const modifiers = lookAhead(() => (parseDecorators(), parseModifiers()));
    // `parseListElement` attempted to get the reused node at this position,
    // but the ambient context flag was not yet set, so the node appeared
    // not reusable in that context.
    const isAmbient = some(modifiers, isDeclareModifier);
    if (isAmbient) {
      const node = tryReuseAmbientDeclaration();
      if (node) {
        return node;
      }
    }

    const node = <Statement>createNodeWithJSDoc(qt.SyntaxKind.Unknown);
    node.decorators = parseDecorators();
    node.modifiers = parseModifiers();
    if (isAmbient) {
      for (const m of node.modifiers!) {
        m.flags |= qt.NodeFlags.Ambient;
      }
      return doInsideOfContext(qt.NodeFlags.Ambient, () => parseDeclarationWorker(node));
    } else {
      return parseDeclarationWorker(node);
    }
  }

  function tryReuseAmbientDeclaration(): Statement | undefined {
    return doInsideOfContext(qt.NodeFlags.Ambient, () => {
      const node = currentNode(parsingContext);
      if (node) {
        return consumeNode(node);
      }
    });
  }

  function parseDeclarationWorker(node: Statement): Statement {
    switch (token()) {
      case qt.SyntaxKind.VarKeyword:
      case qt.SyntaxKind.LetKeyword:
      case qt.SyntaxKind.ConstKeyword:
        return parseVariableStatement(node);
      case qt.SyntaxKind.FunctionKeyword:
        return parseFunctionDeclaration(node);
      case qt.SyntaxKind.ClassKeyword:
        return parseClassDeclaration(node);
      case qt.SyntaxKind.InterfaceKeyword:
        return parseInterfaceDeclaration(node);
      case qt.SyntaxKind.TypeKeyword:
        return parseTypeAliasDeclaration(node);
      case qt.SyntaxKind.EnumKeyword:
        return parseEnumDeclaration(node);
      case qt.SyntaxKind.GlobalKeyword:
      case qt.SyntaxKind.ModuleKeyword:
      case qt.SyntaxKind.NamespaceKeyword:
        return parseModuleDeclaration(node);
      case qt.SyntaxKind.ImportKeyword:
        return parseImportDeclarationOrImportEqualsDeclaration(<ImportDeclaration | ImportEqualsDeclaration>node);
      case qt.SyntaxKind.ExportKeyword:
        nextToken();
        switch (token()) {
          case qt.SyntaxKind.DefaultKeyword:
          case qt.SyntaxKind.EqualsToken:
            return parseExportAssignment(node);
          case qt.SyntaxKind.AsKeyword:
            return parseNamespaceExportDeclaration(node);
          default:
            return parseExportDeclaration(node);
        }
      default:
        if (node.decorators || node.modifiers) {
          // We reached this point because we encountered decorators and/or modifiers and assumed a declaration
          // would follow. For recovery and error reporting purposes, return an incomplete declaration.
          const missing = createMissingNode<Statement>(qt.SyntaxKind.MissingDeclaration, /*reportAtCurrentPosition*/ true, Diagnostics.Declaration_expected);
          missing.pos = node.pos;
          missing.decorators = node.decorators;
          missing.modifiers = node.modifiers;
          return finishNode(missing);
        }
        return undefined!; // TODO: GH#18217
    }
  }

  function nextTokenIsIdentifierOrStringLiteralOnSameLine() {
    nextToken();
    return !scanner.hasPrecedingLineBreak() && (isIdentifier() || token() === qt.SyntaxKind.StringLiteral);
  }

  function parseFunctionBlockOrSemicolon(flags: SignatureFlags, diagnosticMessage?: qt.DiagnosticMessage): Block | undefined {
    if (token() !== qt.SyntaxKind.OpenBraceToken && canParseSemicolon()) {
      parseSemicolon();
      return;
    }

    return parseFunctionBlock(flags, diagnosticMessage);
  }

  // DECLARATIONS

  function parseArrayBindingElement(): ArrayBindingElement {
    if (token() === qt.SyntaxKind.CommaToken) {
      return <OmittedExpression>createNode(qt.SyntaxKind.OmittedExpression);
    }
    const node = <BindingElement>createNode(qt.SyntaxKind.BindingElement);
    node.dotDotDotToken = parseOptionalToken(qt.SyntaxKind.DotDotDotToken);
    node.name = parseIdentifierOrPattern();
    node.initializer = parseInitializer();
    return finishNode(node);
  }

  function parseObjectBindingElement(): qt.BindingElement {
    const node = <BindingElement>createNode(qt.SyntaxKind.BindingElement);
    node.dotDotDotToken = parseOptionalToken(qt.SyntaxKind.DotDotDotToken);
    const tokenIsIdentifier = isIdentifier();
    const propertyName = parsePropertyName();
    if (tokenIsIdentifier && token() !== qt.SyntaxKind.ColonToken) {
      node.name = propertyName;
    } else {
      parseExpected(qt.SyntaxKind.ColonToken);
      node.propertyName = propertyName;
      node.name = parseIdentifierOrPattern();
    }
    node.initializer = parseInitializer();
    return finishNode(node);
  }

  function parseObjectBindingPattern(): ObjectBindingPattern {
    const node = <ObjectBindingPattern>createNode(qt.SyntaxKind.ObjectBindingPattern);
    parseExpected(qt.SyntaxKind.OpenBraceToken);
    node.elements = parseDelimitedList(ParsingContext.ObjectBindingElements, parseObjectBindingElement);
    parseExpected(qt.SyntaxKind.CloseBraceToken);
    return finishNode(node);
  }

  function parseArrayBindingPattern(): ArrayBindingPattern {
    const node = <ArrayBindingPattern>createNode(qt.SyntaxKind.ArrayBindingPattern);
    parseExpected(qt.SyntaxKind.OpenBracketToken);
    node.elements = parseDelimitedList(ParsingContext.ArrayBindingElements, parseArrayBindingElement);
    parseExpected(qt.SyntaxKind.CloseBracketToken);
    return finishNode(node);
  }

  function isIdentifierOrPrivateIdentifierOrPattern() {
    return token() === qt.SyntaxKind.OpenBraceToken || token() === qt.SyntaxKind.OpenBracketToken || token() === qt.SyntaxKind.PrivateIdentifier || isIdentifier();
  }

  function parseIdentifierOrPattern(privateIdentifierDiagnosticMessage?: qt.DiagnosticMessage): qt.Identifier | qt.BindingPattern {
    if (token() === qt.SyntaxKind.OpenBracketToken) {
      return parseArrayBindingPattern();
    }
    if (token() === qt.SyntaxKind.OpenBraceToken) {
      return parseObjectBindingPattern();
    }
    return parseIdentifier(/*diagnosticMessage*/ undefined, privateIdentifierDiagnosticMessage);
  }

  function parseVariableDeclarationAllowExclamation() {
    return parseVariableDeclaration(/*allowExclamation*/ true);
  }

  function parseVariableDeclaration(allowExclamation?: boolean): qt.VariableDeclaration {
    const node = <VariableDeclaration>createNode(qt.SyntaxKind.VariableDeclaration);
    node.name = parseIdentifierOrPattern(Diagnostics.Private_identifiers_are_not_allowed_in_variable_declarations);
    if (allowExclamation && node.name.kind === qt.SyntaxKind.Identifier && token() === qt.SyntaxKind.ExclamationToken && !scanner.hasPrecedingLineBreak()) {
      node.exclamationToken = parseTokenNode<Token<SyntaxKind.ExclamationToken>>();
    }
    node.type = parseTypeAnnotation();
    if (!isInOrOfKeyword(token())) {
      node.initializer = parseInitializer();
    }
    return finishNode(node);
  }

  function parseVariableDeclarationList(inForStatementInitializer: boolean): qt.VariableDeclarationList {
    const node = <VariableDeclarationList>createNode(qt.SyntaxKind.VariableDeclarationList);

    switch (token()) {
      case qt.SyntaxKind.VarKeyword:
        break;
      case qt.SyntaxKind.LetKeyword:
        node.flags |= qt.NodeFlags.Let;
        break;
      case qt.SyntaxKind.ConstKeyword:
        node.flags |= qt.NodeFlags.Const;
        break;
      default:
        Debug.fail();
    }

    nextToken();

    // The user may have written the following:
    //
    //    for (let of X) { }
    //
    // In this case, we want to parse an empty declaration list, and then parse 'of'
    // as a keyword. The reason this is not automatic is that 'of' is a valid identifier.
    // So we need to look ahead to determine if 'of' should be treated as a keyword in
    // this context.
    // The checker will then give an error that there is an empty declaration list.
    if (token() === qt.SyntaxKind.OfKeyword && lookAhead(canFollowContextualOfKeyword)) {
      node.declarations = createMissingList<VariableDeclaration>();
    } else {
      const savedDisallowIn = inDisallowInContext();
      setDisallowInContext(inForStatementInitializer);

      node.declarations = parseDelimitedList(ParsingContext.VariableDeclarations, inForStatementInitializer ? parseVariableDeclaration : parseVariableDeclarationAllowExclamation);

      setDisallowInContext(savedDisallowIn);
    }

    return finishNode(node);
  }

  function canFollowContextualOfKeyword(): boolean {
    return nextTokenIsIdentifier() && nextToken() === qt.SyntaxKind.CloseParenToken;
  }

  function parseVariableStatement(node: VariableStatement): VariableStatement {
    node.kind = qt.SyntaxKind.VariableStatement;
    node.declarationList = parseVariableDeclarationList(/*inForStatementInitializer*/ false);
    parseSemicolon();
    return finishNode(node);
  }

  function parseFunctionDeclaration(node: FunctionDeclaration): FunctionDeclaration {
    node.kind = qt.SyntaxKind.FunctionDeclaration;
    parseExpected(qt.SyntaxKind.FunctionKeyword);
    node.asteriskToken = parseOptionalToken(qt.SyntaxKind.AsteriskToken);
    node.name = hasModifierOfKind(node, qt.SyntaxKind.DefaultKeyword) ? parseOptionalIdentifier() : parseIdentifier();
    const isGenerator = node.asteriskToken ? SignatureFlags.Yield : SignatureFlags.None;
    const isAsync = hasModifierOfKind(node, qt.SyntaxKind.AsyncKeyword) ? SignatureFlags.Await : SignatureFlags.None;
    fillSignature(qt.SyntaxKind.ColonToken, isGenerator | isAsync, node);
    node.body = parseFunctionBlockOrSemicolon(isGenerator | isAsync, Diagnostics.or_expected);
    return finishNode(node);
  }

  function parseConstructorName() {
    if (token() === qt.SyntaxKind.ConstructorKeyword) {
      return parseExpected(qt.SyntaxKind.ConstructorKeyword);
    }
    if (token() === qt.SyntaxKind.StringLiteral && lookAhead(nextToken) === qt.SyntaxKind.OpenParenToken) {
      return tryParse(() => {
        const literalNode = parseLiteralNode();
        return literalNode.text === 'constructor' ? literalNode : undefined;
      });
    }
  }

  function tryParseConstructorDeclaration(node: qt.ConstructorDeclaration): qt.ConstructorDeclaration | undefined {
    return tryParse(() => {
      if (parseConstructorName()) {
        node.kind = qt.SyntaxKind.Constructor;
        fillSignature(qt.SyntaxKind.ColonToken, SignatureFlags.None, node);
        node.body = parseFunctionBlockOrSemicolon(SignatureFlags.None, Diagnostics.or_expected);
        return finishNode(node);
      }
    });
  }

  function parseMethodDeclaration(node: MethodDeclaration, asteriskToken: AsteriskToken, diagnosticMessage?: qt.DiagnosticMessage): MethodDeclaration {
    node.kind = qt.SyntaxKind.MethodDeclaration;
    node.asteriskToken = asteriskToken;
    const isGenerator = asteriskToken ? SignatureFlags.Yield : SignatureFlags.None;
    const isAsync = hasModifierOfKind(node, qt.SyntaxKind.AsyncKeyword) ? SignatureFlags.Await : SignatureFlags.None;
    fillSignature(qt.SyntaxKind.ColonToken, isGenerator | isAsync, node);
    node.body = parseFunctionBlockOrSemicolon(isGenerator | isAsync, diagnosticMessage);
    return finishNode(node);
  }

  function parsePropertyDeclaration(node: PropertyDeclaration): PropertyDeclaration {
    node.kind = qt.SyntaxKind.PropertyDeclaration;
    if (!node.questionToken && token() === qt.SyntaxKind.ExclamationToken && !scanner.hasPrecedingLineBreak()) {
      node.exclamationToken = parseTokenNode<Token<SyntaxKind.ExclamationToken>>();
    }
    node.type = parseTypeAnnotation();
    node.initializer = doOutsideOfContext(qt.NodeFlags.YieldContext | qt.NodeFlags.AwaitContext | qt.NodeFlags.DisallowInContext, parseInitializer);

    parseSemicolon();
    return finishNode(node);
  }

  function parsePropertyOrMethodDeclaration(node: PropertyDeclaration | MethodDeclaration): PropertyDeclaration | MethodDeclaration {
    const asteriskToken = parseOptionalToken(qt.SyntaxKind.AsteriskToken);
    node.name = parsePropertyName();
    // Note: this is not legal as per the grammar.  But we allow it in the parser and
    // report an error in the grammar checker.
    node.questionToken = parseOptionalToken(qt.SyntaxKind.QuestionToken);
    if (asteriskToken || token() === qt.SyntaxKind.OpenParenToken || token() === qt.SyntaxKind.LessThanToken) {
      return parseMethodDeclaration(<qt.MethodDeclaration>node, asteriskToken, Diagnostics.or_expected);
    }
    return parsePropertyDeclaration(<qt.PropertyDeclaration>node);
  }

  function parseAccessorDeclaration(node: AccessorDeclaration, kind: AccessorDeclaration['kind']): AccessorDeclaration {
    node.kind = kind;
    node.name = parsePropertyName();
    fillSignature(qt.SyntaxKind.ColonToken, SignatureFlags.None, node);
    node.body = parseFunctionBlockOrSemicolon(SignatureFlags.None);
    return finishNode(node);
  }

  function isClassMemberStart(): boolean {
    let idToken: qt.SyntaxKind | undefined;

    if (token() === qt.SyntaxKind.AtToken) {
      return true;
    }

    // Eat up all modifiers, but hold on to the last one in case it is actually an identifier.
    while (isModifierKind(token())) {
      idToken = token();
      // If the idToken is a class modifier (protected, private, public, and static), it is
      // certain that we are starting to parse class member. This allows better error recovery
      // Example:
      //      public foo() ...     // true
      //      public @dec blah ... // true; we will then report an error later
      //      export public ...    // true; we will then report an error later
      if (isClassMemberModifier(idToken)) {
        return true;
      }

      nextToken();
    }

    if (token() === qt.SyntaxKind.AsteriskToken) {
      return true;
    }

    // Try to get the first property-like token following all modifiers.
    // This can either be an identifier or the 'get' or 'set' keywords.
    if (isLiteralPropertyName()) {
      idToken = token();
      nextToken();
    }

    // Index signatures and computed properties are class members; we can parse.
    if (token() === qt.SyntaxKind.OpenBracketToken) {
      return true;
    }

    // If we were able to get any potential identifier...
    if (idToken !== undefined) {
      // If we have a non-keyword identifier, or if we have an accessor, then it's safe to parse.
      if (!isKeyword(idToken) || idToken === qt.SyntaxKind.SetKeyword || idToken === qt.SyntaxKind.GetKeyword) {
        return true;
      }

      // If it *is* a keyword, but not an accessor, check a little farther along
      // to see if it should actually be parsed as a class member.
      switch (token()) {
        case qt.SyntaxKind.OpenParenToken: // Method declaration
        case qt.SyntaxKind.LessThanToken: // Generic Method declaration
        case qt.SyntaxKind.ExclamationToken: // Non-null assertion on property name
        case qt.SyntaxKind.ColonToken: // Type Annotation for declaration
        case qt.SyntaxKind.EqualsToken: // Initializer for declaration
        case qt.SyntaxKind.QuestionToken: // Not valid, but permitted so that it gets caught later on.
          return true;
        default:
          // Covers
          //  - Semicolons     (declaration termination)
          //  - Closing braces (end-of-class, must be declaration)
          //  - End-of-files   (not valid, but permitted so that it gets caught later on)
          //  - Line-breaks    (enabling *automatic semicolon insertion*)
          return canParseSemicolon();
      }
    }

    return false;
  }

  function parseDecorators(): qt.NodeArray<qt.Decorator> | undefined {
    let list: Decorator[] | undefined;
    const listPos = getNodePos();
    while (true) {
      const decoratorStart = getNodePos();
      if (!parseOptional(qt.SyntaxKind.AtToken)) {
        break;
      }
      const decorator = <qt.Decorator>createNode(qt.SyntaxKind.Decorator, decoratorStart);
      decorator.expression = doInDecoratorContext(parseLeftHandSideExpressionOrHigher);
      finishNode(decorator);
      (list || (list = [])).push(decorator);
    }
    return list && createNodeArray(list, listPos);
  }

  /*
   * There are situations in which a modifier like 'const' will appear unexpectedly, such as on a class member.
   * In those situations, if we are entirely sure that 'const' is not valid on its own (such as when ASI takes effect
   * and turns it into a standalone declaration), then it is better to parse it and report an error later.
   *
   * In such situations, 'permitInvalidConstAsModifier' should be set to true.
   */
  function parseModifiers(permitInvalidConstAsModifier?: boolean): qt.NodeArray<Modifier> | undefined {
    let list: Modifier[] | undefined;
    const listPos = getNodePos();
    while (true) {
      const modifierStart = scanner.getStartPos();
      const modifierKind = token();

      if (token() === qt.SyntaxKind.ConstKeyword && permitInvalidConstAsModifier) {
        // We need to ensure that any subsequent modifiers appear on the same line
        // so that when 'const' is a standalone declaration, we don't issue an error.
        if (!tryParse(nextTokenIsOnSameLineAndCanFollowModifier)) {
          break;
        }
      } else {
        if (!parseAnyContextualModifier()) {
          break;
        }
      }

      const modifier = finishNode(<Modifier>createNode(modifierKind, modifierStart));
      (list || (list = [])).push(modifier);
    }
    return list && createNodeArray(list, listPos);
  }

  function parseModifiersForArrowFunction(): qt.NodeArray<Modifier> | undefined {
    let modifiers: qt.NodeArray<Modifier> | undefined;
    if (token() === qt.SyntaxKind.AsyncKeyword) {
      const modifierStart = scanner.getStartPos();
      const modifierKind = token();
      nextToken();
      const modifier = finishNode(<Modifier>createNode(modifierKind, modifierStart));
      modifiers = createNodeArray<Modifier>([modifier], modifierStart);
    }
    return modifiers;
  }

  function parseClassElement(): ClassElement {
    if (token() === qt.SyntaxKind.SemicolonToken) {
      const result = <SemicolonClassElement>createNode(qt.SyntaxKind.SemicolonClassElement);
      nextToken();
      return finishNode(result);
    }

    const node = <ClassElement>createNodeWithJSDoc(qt.SyntaxKind.Unknown);
    node.decorators = parseDecorators();
    node.modifiers = parseModifiers(/*permitInvalidConstAsModifier*/ true);

    if (parseContextualModifier(qt.SyntaxKind.GetKeyword)) {
      return parseAccessorDeclaration(node, qt.SyntaxKind.GetAccessor);
    }

    if (parseContextualModifier(qt.SyntaxKind.SetKeyword)) {
      return parseAccessorDeclaration(node, qt.SyntaxKind.SetAccessor);
    }

    if (token() === qt.SyntaxKind.ConstructorKeyword || token() === qt.SyntaxKind.StringLiteral) {
      const constructorDeclaration = tryParseConstructorDeclaration(node);
      if (constructorDeclaration) {
        return constructorDeclaration;
      }
    }

    if (isIndexSignature()) {
      return parseIndexSignatureDeclaration(node);
    }

    // It is very important that we check this *after* checking indexers because
    // the [ token can start an index signature or a computed property name
    if (tokenIsIdentifierOrKeyword(token()) || token() === qt.SyntaxKind.StringLiteral || token() === qt.SyntaxKind.NumericLiteral || token() === qt.SyntaxKind.AsteriskToken || token() === qt.SyntaxKind.OpenBracketToken) {
      const isAmbient = node.modifiers && some(node.modifiers, isDeclareModifier);
      if (isAmbient) {
        for (const m of node.modifiers!) {
          m.flags |= qt.NodeFlags.Ambient;
        }
        return doInsideOfContext(qt.NodeFlags.Ambient, () => parsePropertyOrMethodDeclaration(node as PropertyDeclaration | MethodDeclaration));
      } else {
        return parsePropertyOrMethodDeclaration(node as PropertyDeclaration | MethodDeclaration);
      }
    }

    if (node.decorators || node.modifiers) {
      // treat this as a property declaration with a missing name.
      node.name = createMissingNode<qt.Identifier>(qt.SyntaxKind.Identifier, /*reportAtCurrentPosition*/ true, Diagnostics.Declaration_expected);
      return parsePropertyDeclaration(node);
    }

    // 'isClassMemberStart' should have hinted not to attempt parsing.
    return Debug.fail('Should not have attempted to parse class member declaration.');
  }

  function parseClassExpression(): ClassExpression {
    return parseClassDeclarationOrExpression(<ClassLikeDeclaration>createNodeWithJSDoc(qt.SyntaxKind.Unknown), qt.SyntaxKind.ClassExpression);
  }

  function parseClassDeclaration(node: ClassLikeDeclaration): ClassDeclaration {
    return parseClassDeclarationOrExpression(node, qt.SyntaxKind.ClassDeclaration);
  }

  function parseClassDeclarationOrExpression(node: ClassLikeDeclaration, kind: ClassLikeDeclaration['kind']): ClassLikeDeclaration {
    node.kind = kind;
    parseExpected(qt.SyntaxKind.ClassKeyword);
    node.name = parseNameOfClassDeclarationOrExpression();
    node.typeParameters = parseTypeParameters();
    node.heritageClauses = parseHeritageClauses();

    if (parseExpected(qt.SyntaxKind.OpenBraceToken)) {
      // ClassTail[Yield,Await] : (Modified) See 14.5
      //      ClassHeritage[?Yield,?Await]opt { ClassBody[?Yield,?Await]opt }
      node.members = parseClassMembers();
      parseExpected(qt.SyntaxKind.CloseBraceToken);
    } else {
      node.members = createMissingList<ClassElement>();
    }

    return finishNode(node);
  }

  function parseNameOfClassDeclarationOrExpression(): qt.Identifier | undefined {
    // implements is a future reserved word so
    // 'class implements' might mean either
    // - class expression with omitted name, 'implements' starts heritage clause
    // - class with name 'implements'
    // 'isImplementsClause' helps to disambiguate between these two cases
    return isIdentifier() && !isImplementsClause() ? parseIdentifier() : undefined;
  }

  function isImplementsClause() {
    return token() === qt.SyntaxKind.ImplementsKeyword && lookAhead(nextTokenIsIdentifierOrKeyword);
  }

  function parseHeritageClauses(): qt.NodeArray<HeritageClause> | undefined {
    // ClassTail[Yield,Await] : (Modified) See 14.5
    //      ClassHeritage[?Yield,?Await]opt { ClassBody[?Yield,?Await]opt }

    if (isHeritageClause()) {
      return parseList(ParsingContext.HeritageClauses, parseHeritageClause);
    }

    return undefined;
  }

  function parseHeritageClause(): HeritageClause {
    const tok = token();
    Debug.assert(tok === qt.SyntaxKind.ExtendsKeyword || tok === qt.SyntaxKind.ImplementsKeyword); // isListElement() should ensure this.
    const node = <HeritageClause>createNode(qt.SyntaxKind.HeritageClause);
    node.token = tok;
    nextToken();
    node.types = parseDelimitedList(ParsingContext.HeritageClauseElement, parseExpressionWithTypeArguments);
    return finishNode(node);
  }

  function parseExpressionWithTypeArguments(): ExpressionWithTypeArguments {
    const node = <ExpressionWithTypeArguments>createNode(qt.SyntaxKind.ExpressionWithTypeArguments);
    node.expression = parseLeftHandSideExpressionOrHigher();
    node.typeArguments = tryParseTypeArguments();
    return finishNode(node);
  }

  function tryParseTypeArguments(): qt.NodeArray<TypeNode> | undefined {
    return token() === qt.SyntaxKind.LessThanToken ? parseBracketedList(ParsingContext.TypeArguments, parseType, qt.SyntaxKind.LessThanToken, qt.SyntaxKind.GreaterThanToken) : undefined;
  }

  function isHeritageClause(): boolean {
    return token() === qt.SyntaxKind.ExtendsKeyword || token() === qt.SyntaxKind.ImplementsKeyword;
  }

  function parseClassMembers(): qt.NodeArray<ClassElement> {
    return parseList(ParsingContext.ClassMembers, parseClassElement);
  }

  function parseInterfaceDeclaration(node: InterfaceDeclaration): InterfaceDeclaration {
    node.kind = qt.SyntaxKind.InterfaceDeclaration;
    parseExpected(qt.SyntaxKind.InterfaceKeyword);
    node.name = parseIdentifier();
    node.typeParameters = parseTypeParameters();
    node.heritageClauses = parseHeritageClauses();
    node.members = parseObjectTypeMembers();
    return finishNode(node);
  }

  function parseTypeAliasDeclaration(node: TypeAliasDeclaration): TypeAliasDeclaration {
    node.kind = qt.SyntaxKind.TypeAliasDeclaration;
    parseExpected(qt.SyntaxKind.TypeKeyword);
    node.name = parseIdentifier();
    node.typeParameters = parseTypeParameters();
    parseExpected(qt.SyntaxKind.EqualsToken);
    node.type = parseType();
    parseSemicolon();
    return finishNode(node);
  }

  // In an ambient declaration, the grammar only allows integer literals as initializers.
  // In a non-ambient declaration, the grammar allows uninitialized members only in a
  // ConstantEnumMemberSection, which starts at the beginning of an enum declaration
  // or any time an integer literal initializer is encountered.
  function parseEnumMember(): EnumMember {
    const node = <EnumMember>createNodeWithJSDoc(qt.SyntaxKind.EnumMember);
    node.name = parsePropertyName();
    node.initializer = allowInAnd(parseInitializer);
    return finishNode(node);
  }

  function parseEnumDeclaration(node: EnumDeclaration): EnumDeclaration {
    node.kind = qt.SyntaxKind.EnumDeclaration;
    parseExpected(qt.SyntaxKind.EnumKeyword);
    node.name = parseIdentifier();
    if (parseExpected(qt.SyntaxKind.OpenBraceToken)) {
      node.members = doOutsideOfYieldAndAwaitContext(() => parseDelimitedList(ParsingContext.EnumMembers, parseEnumMember));
      parseExpected(qt.SyntaxKind.CloseBraceToken);
    } else {
      node.members = createMissingList<EnumMember>();
    }
    return finishNode(node);
  }

  function parseModuleBlock(): ModuleBlock {
    const node = <ModuleBlock>createNode(qt.SyntaxKind.ModuleBlock);
    if (parseExpected(qt.SyntaxKind.OpenBraceToken)) {
      node.statements = parseList(ParsingContext.BlockStatements, parseStatement);
      parseExpected(qt.SyntaxKind.CloseBraceToken);
    } else {
      node.statements = createMissingList<Statement>();
    }
    return finishNode(node);
  }

  function parseModuleOrNamespaceDeclaration(node: ModuleDeclaration, flags: qt.NodeFlags): ModuleDeclaration {
    node.kind = qt.SyntaxKind.ModuleDeclaration;
    // If we are parsing a dotted namespace name, we want to
    // propagate the 'Namespace' flag across the names if set.
    const namespaceFlag = flags & qt.NodeFlags.Namespace;
    node.flags |= flags;
    node.name = parseIdentifier();
    node.body = parseOptional(qt.SyntaxKind.DotToken) ? parseModuleOrNamespaceDeclaration(<ModuleDeclaration>createNode(qt.SyntaxKind.Unknown), qt.NodeFlags.NestedNamespace | namespaceFlag) : parseModuleBlock();
    return finishNode(node);
  }

  function parseAmbientExternalModuleDeclaration(node: ModuleDeclaration): ModuleDeclaration {
    node.kind = qt.SyntaxKind.ModuleDeclaration;
    if (token() === qt.SyntaxKind.GlobalKeyword) {
      // parse 'global' as name of global scope augmentation
      node.name = parseIdentifier();
      node.flags |= qt.NodeFlags.GlobalAugmentation;
    } else {
      node.name = parseLiteralNode();
      node.name.text = internIdentifier(node.name.text);
    }
    if (token() === qt.SyntaxKind.OpenBraceToken) {
      node.body = parseModuleBlock();
    } else {
      parseSemicolon();
    }
    return finishNode(node);
  }

  function parseModuleDeclaration(node: ModuleDeclaration): ModuleDeclaration {
    let flags: qt.NodeFlags = 0;
    if (token() === qt.SyntaxKind.GlobalKeyword) {
      // global augmentation
      return parseAmbientExternalModuleDeclaration(node);
    } else if (parseOptional(qt.SyntaxKind.NamespaceKeyword)) {
      flags |= qt.NodeFlags.Namespace;
    } else {
      parseExpected(qt.SyntaxKind.ModuleKeyword);
      if (token() === qt.SyntaxKind.StringLiteral) {
        return parseAmbientExternalModuleDeclaration(node);
      }
    }
    return parseModuleOrNamespaceDeclaration(node, flags);
  }

  function isExternalModuleReference() {
    return token() === qt.SyntaxKind.RequireKeyword && lookAhead(nextTokenIsOpenParen);
  }

  function nextTokenIsOpenParen() {
    return nextToken() === qt.SyntaxKind.OpenParenToken;
  }

  function nextTokenIsSlash() {
    return nextToken() === qt.SyntaxKind.SlashToken;
  }

  function parseNamespaceExportDeclaration(node: NamespaceExportDeclaration): NamespaceExportDeclaration {
    node.kind = qt.SyntaxKind.NamespaceExportDeclaration;
    parseExpected(qt.SyntaxKind.AsKeyword);
    parseExpected(qt.SyntaxKind.NamespaceKeyword);
    node.name = parseIdentifier();
    parseSemicolon();
    return finishNode(node);
  }

  function parseImportDeclarationOrImportEqualsDeclaration(node: ImportEqualsDeclaration | ImportDeclaration): ImportEqualsDeclaration | ImportDeclaration {
    parseExpected(qt.SyntaxKind.ImportKeyword);
    const afterImportPos = scanner.getStartPos();

    let identifier: qt.Identifier | undefined;
    if (isIdentifier()) {
      identifier = parseIdentifier();
    }

    let isTypeOnly = false;
    if (token() !== qt.SyntaxKind.FromKeyword && identifier?.escapedText === 'type' && (isIdentifier() || tokenAfterImportDefinitelyProducesImportDeclaration())) {
      isTypeOnly = true;
      identifier = isIdentifier() ? parseIdentifier() : undefined;
    }

    if (identifier && !tokenAfterImportedIdentifierDefinitelyProducesImportDeclaration()) {
      return parseImportEqualsDeclaration(<ImportEqualsDeclaration>node, identifier, isTypeOnly);
    }

    // Import statement
    node.kind = qt.SyntaxKind.ImportDeclaration;
    // ImportDeclaration:
    //  import ImportClause from ModuleSpecifier ;
    //  import ModuleSpecifier;
    if (
      identifier || // import id
      token() === qt.SyntaxKind.AsteriskToken || // import *
      token() === qt.SyntaxKind.OpenBraceToken // import {
    ) {
      (<ImportDeclaration>node).importClause = parseImportClause(identifier, afterImportPos, isTypeOnly);
      parseExpected(qt.SyntaxKind.FromKeyword);
    }

    (<ImportDeclaration>node).moduleSpecifier = parseModuleSpecifier();
    parseSemicolon();
    return finishNode(node);
  }

  function tokenAfterImportDefinitelyProducesImportDeclaration() {
    return token() === qt.SyntaxKind.AsteriskToken || token() === qt.SyntaxKind.OpenBraceToken;
  }

  function tokenAfterImportedIdentifierDefinitelyProducesImportDeclaration() {
    // In `import id ___`, the current token decides whether to produce
    // an ImportDeclaration or ImportEqualsDeclaration.
    return token() === qt.SyntaxKind.CommaToken || token() === qt.SyntaxKind.FromKeyword;
  }

  function parseImportEqualsDeclaration(node: ImportEqualsDeclaration, identifier: qt.Identifier, isTypeOnly: boolean): ImportEqualsDeclaration {
    node.kind = qt.SyntaxKind.ImportEqualsDeclaration;
    node.name = identifier;
    parseExpected(qt.SyntaxKind.EqualsToken);
    node.moduleReference = parseModuleReference();
    parseSemicolon();
    const finished = finishNode(node);
    if (isTypeOnly) {
      parseErrorAtRange(finished, Diagnostics.Only_ECMAScript_imports_may_use_import_type);
    }
    return finished;
  }

  function parseImportClause(identifier: qt.Identifier | undefined, fullStart: number, isTypeOnly: boolean) {
    // ImportClause:
    //  ImportedDefaultBinding
    //  NameSpaceImport
    //  NamedImports
    //  ImportedDefaultBinding, NameSpaceImport
    //  ImportedDefaultBinding, NamedImports

    const importClause = <ImportClause>createNode(qt.SyntaxKind.ImportClause, fullStart);
    importClause.isTypeOnly = isTypeOnly;

    if (identifier) {
      // ImportedDefaultBinding:
      //  ImportedBinding
      importClause.name = identifier;
    }

    // If there was no default import or if there is comma token after default import
    // parse namespace or named imports
    if (!importClause.name || parseOptional(qt.SyntaxKind.CommaToken)) {
      importClause.namedBindings = token() === qt.SyntaxKind.AsteriskToken ? parseNamespaceImport() : parseNamedImportsOrExports(qt.SyntaxKind.NamedImports);
    }

    return finishNode(importClause);
  }

  function parseModuleReference() {
    return isExternalModuleReference() ? parseExternalModuleReference() : parseEntityName(/*allowReservedWords*/ false);
  }

  function parseExternalModuleReference() {
    const node = <ExternalModuleReference>createNode(qt.SyntaxKind.ExternalModuleReference);
    parseExpected(qt.SyntaxKind.RequireKeyword);
    parseExpected(qt.SyntaxKind.OpenParenToken);
    node.expression = parseModuleSpecifier();
    parseExpected(qt.SyntaxKind.CloseParenToken);
    return finishNode(node);
  }

  function parseModuleSpecifier(): Expression {
    if (token() === qt.SyntaxKind.StringLiteral) {
      const result = parseLiteralNode();
      result.text = internIdentifier(result.text);
      return result;
    } else {
      // We allow arbitrary expressions here, even though the grammar only allows string
      // literals.  We check to ensure that it is only a string literal later in the grammar
      // check pass.
      return parseExpression();
    }
  }

  function parseNamespaceImport(): NamespaceImport {
    // NameSpaceImport:
    //  * as ImportedBinding
    const namespaceImport = <NamespaceImport>createNode(qt.SyntaxKind.NamespaceImport);
    parseExpected(qt.SyntaxKind.AsteriskToken);
    parseExpected(qt.SyntaxKind.AsKeyword);
    namespaceImport.name = parseIdentifier();
    return finishNode(namespaceImport);
  }

  function parseNamedImportsOrExports(kind: qt.SyntaxKind.NamedImports): NamedImports;
  function parseNamedImportsOrExports(kind: qt.SyntaxKind.NamedExports): NamedExports;
  function parseNamedImportsOrExports(kind: qt.SyntaxKind): NamedImportsOrExports {
    const node = <NamedImports | NamedExports>createNode(kind);

    // NamedImports:
    //  { }
    //  { ImportsList }
    //  { ImportsList, }

    // ImportsList:
    //  ImportSpecifier
    //  ImportsList, ImportSpecifier
    node.elements = <NodeArray<ImportSpecifier> | qt.NodeArray<ExportSpecifier>>parseBracketedList(ParsingContext.ImportOrExportSpecifiers, kind === qt.SyntaxKind.NamedImports ? parseImportSpecifier : parseExportSpecifier, qt.SyntaxKind.OpenBraceToken, qt.SyntaxKind.CloseBraceToken);
    return finishNode(node);
  }

  function parseExportSpecifier() {
    return parseImportOrExportSpecifier(qt.SyntaxKind.ExportSpecifier);
  }

  function parseImportSpecifier() {
    return parseImportOrExportSpecifier(qt.SyntaxKind.ImportSpecifier);
  }

  function parseImportOrExportSpecifier(kind: qt.SyntaxKind): ImportOrExportSpecifier {
    const node = <ImportSpecifier>createNode(kind);
    // ImportSpecifier:
    //   BindingIdentifier
    //   qt.IdentifierName as BindingIdentifier
    // ExportSpecifier:
    //   qt.IdentifierName
    //   qt.IdentifierName as qt.IdentifierName
    let checkIdentifierIsKeyword = isKeyword(token()) && !isIdentifier();
    let checkIdentifierStart = scanner.getTokenPos();
    let checkIdentifierEnd = scanner.getTextPos();
    const identifierName = parseIdentifierName();
    if (token() === qt.SyntaxKind.AsKeyword) {
      node.propertyName = identifierName;
      parseExpected(qt.SyntaxKind.AsKeyword);
      checkIdentifierIsKeyword = isKeyword(token()) && !isIdentifier();
      checkIdentifierStart = scanner.getTokenPos();
      checkIdentifierEnd = scanner.getTextPos();
      node.name = parseIdentifierName();
    } else {
      node.name = identifierName;
    }
    if (kind === qt.SyntaxKind.ImportSpecifier && checkIdentifierIsKeyword) {
      parseErrorAt(checkIdentifierStart, checkIdentifierEnd, Diagnostics.Identifier_expected);
    }
    return finishNode(node);
  }

  function parseNamespaceExport(pos: number): NamespaceExport {
    const node = <NamespaceExport>createNode(qt.SyntaxKind.NamespaceExport, pos);
    node.name = parseIdentifier();
    return finishNode(node);
  }

  function parseExportDeclaration(node: ExportDeclaration): ExportDeclaration {
    node.kind = qt.SyntaxKind.ExportDeclaration;
    node.isTypeOnly = parseOptional(qt.SyntaxKind.TypeKeyword);
    const namespaceExportPos = scanner.getStartPos();
    if (parseOptional(qt.SyntaxKind.AsteriskToken)) {
      if (parseOptional(qt.SyntaxKind.AsKeyword)) {
        node.exportClause = parseNamespaceExport(namespaceExportPos);
      }
      parseExpected(qt.SyntaxKind.FromKeyword);
      node.moduleSpecifier = parseModuleSpecifier();
    } else {
      node.exportClause = parseNamedImportsOrExports(qt.SyntaxKind.NamedExports);
      // It is not uncommon to accidentally omit the 'from' keyword. Additionally, in editing scenarios,
      // the 'from' keyword can be parsed as a named export when the export clause is unterminated (i.e. `export { from "moduleName";`)
      // If we don't have a 'from' keyword, see if we have a string literal such that ASI won't take effect.
      if (token() === qt.SyntaxKind.FromKeyword || (token() === qt.SyntaxKind.StringLiteral && !scanner.hasPrecedingLineBreak())) {
        parseExpected(qt.SyntaxKind.FromKeyword);
        node.moduleSpecifier = parseModuleSpecifier();
      }
    }
    parseSemicolon();
    return finishNode(node);
  }

  function parseExportAssignment(node: ExportAssignment): ExportAssignment {
    node.kind = qt.SyntaxKind.ExportAssignment;
    if (parseOptional(qt.SyntaxKind.EqualsToken)) {
      node.isExportEquals = true;
    } else {
      parseExpected(qt.SyntaxKind.DefaultKeyword);
    }
    node.expression = parseAssignmentExpressionOrHigher();
    parseSemicolon();
    return finishNode(node);
  }

  function setExternalModuleIndicator(sourceFile: SourceFile) {
    // Try to use the first top-level import/export when available, then
    // fall back to looking for an 'import.meta' somewhere in the tree if necessary.
    sourceFile.externalModuleIndicator = forEach(sourceFile.statements, isAnExternalModuleIndicatorNode) || getImportMetaIfNecessary(sourceFile);
  }

  function isAnExternalModuleIndicatorNode(node: qt.Node) {
    return hasModifierOfKind(node, qt.SyntaxKind.ExportKeyword) || (node.kind === qt.SyntaxKind.ImportEqualsDeclaration && node.moduleReference.kind === qt.SyntaxKind.ExternalModuleReference) || node.kind === qt.SyntaxKind.ImportDeclaration || node.kind === qt.SyntaxKind.ExportAssignment || node.kind === qt.SyntaxKind.ExportDeclaration ? node : undefined;
  }

  function getImportMetaIfNecessary(sourceFile: SourceFile) {
    return sourceFile.flags & qt.NodeFlags.PossiblyContainsImportMeta ? walkTreeForExternalModuleIndicators(sourceFile) : undefined;
  }

  function walkTreeForExternalModuleIndicators(node: qt.Node): qt.Node | undefined {
    return isImportMeta(node) ? node : forEachChild(node, walkTreeForExternalModuleIndicators);
  }

  /** Do not use hasModifier inside the parser; it relies on parent pointers. Use this instead. */
  function hasModifierOfKind(node: qt.Node, kind: qt.SyntaxKind) {
    return some(node.modifiers, (m) => m.kind === kind);
  }

  function isImportMeta(node: qt.Node): boolean {
    return isMetaProperty(node) && node.keywordToken === qt.SyntaxKind.ImportKeyword && node.name.escapedText === 'meta';
  }

  const enum ParsingContext {
    SourceElements, // Elements in source file
    BlockStatements, // Statements in block
    SwitchClauses, // Clauses in switch statement
    SwitchClauseStatements, // Statements in switch clause
    TypeMembers, // Members in interface or type literal
    ClassMembers, // Members in class declaration
    EnumMembers, // Members in enum declaration
    HeritageClauseElement, // Elements in a heritage clause
    VariableDeclarations, // Variable declarations in variable statement
    ObjectBindingElements, // Binding elements in object binding list
    ArrayBindingElements, // Binding elements in array binding list
    ArgumentExpressions, // Expressions in argument list
    ObjectLiteralMembers, // Members in object literal
    JsxAttributes, // Attributes in jsx element
    JsxChildren, // Things between opening and closing JSX tags
    ArrayLiteralMembers, // Members in array literal
    Parameters, // Parameters in parameter list
    JSDocParameters, // JSDoc parameters in parameter list of JSDoc function type
    RestProperties, // Property names in a rest type list
    TypeParameters, // Type parameters in type parameter list
    TypeArguments, // Type arguments in type argument list
    TupleElementTypes, // Element types in tuple element type list
    HeritageClauses, // Heritage clauses for a class or interface declaration.
    ImportOrExportSpecifiers, // Named import clause's import specifier list
    Count, // Number of parsing contexts
  }

  const enum Tristate {
    False,
    True,
    Unknown,
  }

  export namespace JSDocParser {
    export function parseJSDocTypeExpressionForTests(content: string, start: number | undefined, length: number | undefined): { jsDocTypeExpression: JSDocTypeExpression; diagnostics: Diagnostic[] } | undefined {
      initializeState(content, qt.ScriptTarget.Latest, /*_syntaxCursor:*/ undefined, qt.ScriptKind.JS);
      sourceFile = createSourceFile('file.js', qt.ScriptTarget.Latest, qt.ScriptKind.JS, /*isDeclarationFile*/ false);
      scanner.setText(content, start, length);
      currentToken = scanner.scan();
      const jsDocTypeExpression = parseJSDocTypeExpression();
      const diagnostics = parseDiagnostics;
      clearState();

      return jsDocTypeExpression ? { jsDocTypeExpression, diagnostics } : undefined;
    }

    // Parses out a JSDoc type expression.
    export function parseJSDocTypeExpression(mayOmitBraces?: boolean): JSDocTypeExpression {
      const result = <JSDocTypeExpression>createNode(qt.SyntaxKind.JSDocTypeExpression);

      const hasBrace = (mayOmitBraces ? parseOptional : parseExpected)(qt.SyntaxKind.OpenBraceToken);
      result.type = doInsideOfContext(qt.NodeFlags.JSDoc, parseJSDocType);
      if (!mayOmitBraces || hasBrace) {
        parseExpectedJSDoc(qt.SyntaxKind.CloseBraceToken);
      }

      fixupParentReferences(result);
      return finishNode(result);
    }

    export function parseIsolatedJSDocComment(content: string, start: number | undefined, length: number | undefined): { jsDoc: JSDoc; diagnostics: Diagnostic[] } | undefined {
      initializeState(content, qt.ScriptTarget.Latest, /*_syntaxCursor:*/ undefined, qt.ScriptKind.JS);
      sourceFile = <SourceFile>{ languageVariant: LanguageVariant.Standard, text: content };
      const jsDoc = doInsideOfContext(qt.NodeFlags.JSDoc, () => parseJSDocCommentWorker(start, length));
      const diagnostics = parseDiagnostics;
      clearState();

      return jsDoc ? { jsDoc, diagnostics } : undefined;
    }

    export function parseJSDocComment(parent: HasJSDoc, start: number, length: number): JSDoc | undefined {
      const saveToken = currentToken;
      const saveParseDiagnosticsLength = parseDiagnostics.length;
      const saveParseErrorBeforeNextFinishedNode = parseErrorBeforeNextFinishedNode;

      const comment = doInsideOfContext(qt.NodeFlags.JSDoc, () => parseJSDocCommentWorker(start, length));
      if (comment) {
        comment.parent = parent;
      }

      if (contextFlags & qt.NodeFlags.JavaScriptFile) {
        if (!sourceFile.jsDocDiagnostics) {
          sourceFile.jsDocDiagnostics = [];
        }
        sourceFile.jsDocDiagnostics.push(...parseDiagnostics);
      }
      currentToken = saveToken;
      parseDiagnostics.length = saveParseDiagnosticsLength;
      parseErrorBeforeNextFinishedNode = saveParseErrorBeforeNextFinishedNode;

      return comment;
    }

    const enum JSDocState {
      BeginningOfLine,
      SawAsterisk,
      SavingComments,
      SavingBackticks, // NOTE: Only used when parsing tag comments
    }

    const enum PropertyLikeParse {
      Property = 1 << 0,
      Parameter = 1 << 1,
      CallbackParameter = 1 << 2,
    }

    function parseJSDocCommentWorker(start = 0, length: number | undefined): JSDoc | undefined {
      const content = sourceText;
      const end = length === undefined ? content.length : start + length;
      length = end - start;

      Debug.assert(start >= 0);
      Debug.assert(start <= end);
      Debug.assert(end <= content.length);

      // Check for /** (JSDoc opening part)
      if (!isJSDocLikeText(content, start)) {
        return undefined;
      }

      let tags: JSDocTag[];
      let tagsPos: number;
      let tagsEnd: number;
      const comments: string[] = [];

      // + 3 for leading /**, - 5 in total for /** */
      return scanner.scanRange(start + 3, length - 5, () => {
        // Initially we can parse out a tag.  We also have seen a starting asterisk.
        // This is so that /** * @type */ doesn't parse.
        let state = JSDocState.SawAsterisk;
        let margin: number | undefined;
        // + 4 for leading '/** '
        let indent = start - Math.max(content.lastIndexOf('\n', start), 0) + 4;
        function pushComment(text: string) {
          if (!margin) {
            margin = indent;
          }
          comments.push(text);
          indent += text.length;
        }

        nextTokenJSDoc();
        while (parseOptionalJsdoc(qt.SyntaxKind.WhitespaceTrivia));
        if (parseOptionalJsdoc(qt.SyntaxKind.NewLineTrivia)) {
          state = JSDocState.BeginningOfLine;
          indent = 0;
        }
        loop: while (true) {
          switch (token()) {
            case qt.SyntaxKind.AtToken:
              if (state === JSDocState.BeginningOfLine || state === JSDocState.SawAsterisk) {
                removeTrailingWhitespace(comments);
                addTag(parseTag(indent));
                // NOTE: According to usejsdoc.org, a tag goes to end of line, except the last tag.
                // Real-world comments may break this rule, so "BeginningOfLine" will not be a real line beginning
                // for malformed examples like `/** @param {string} x @returns {number} the length */`
                state = JSDocState.BeginningOfLine;
                margin = undefined;
              } else {
                pushComment(scanner.getTokenText());
              }
              break;
            case qt.SyntaxKind.NewLineTrivia:
              comments.push(scanner.getTokenText());
              state = JSDocState.BeginningOfLine;
              indent = 0;
              break;
            case qt.SyntaxKind.AsteriskToken:
              const asterisk = scanner.getTokenText();
              if (state === JSDocState.SawAsterisk || state === JSDocState.SavingComments) {
                // If we've already seen an asterisk, then we can no longer parse a tag on this line
                state = JSDocState.SavingComments;
                pushComment(asterisk);
              } else {
                // Ignore the first asterisk on a line
                state = JSDocState.SawAsterisk;
                indent += asterisk.length;
              }
              break;
            case qt.SyntaxKind.WhitespaceTrivia:
              // only collect whitespace if we're already saving comments or have just crossed the comment indent margin
              const whitespace = scanner.getTokenText();
              if (state === JSDocState.SavingComments) {
                comments.push(whitespace);
              } else if (margin !== undefined && indent + whitespace.length > margin) {
                comments.push(whitespace.slice(margin - indent - 1));
              }
              indent += whitespace.length;
              break;
            case qt.SyntaxKind.EndOfFileToken:
              break loop;
            default:
              // Anything else is doc comment text. We just save it. Because it
              // wasn't a tag, we can no longer parse a tag on this line until we hit the next
              // line break.
              state = JSDocState.SavingComments;
              pushComment(scanner.getTokenText());
              break;
          }
          nextTokenJSDoc();
        }
        removeLeadingNewlines(comments);
        removeTrailingWhitespace(comments);
        return createJSDocComment();
      });

      function removeLeadingNewlines(comments: string[]) {
        while (comments.length && (comments[0] === '\n' || comments[0] === '\r')) {
          comments.shift();
        }
      }

      function removeTrailingWhitespace(comments: string[]) {
        while (comments.length && comments[comments.length - 1].trim() === '') {
          comments.pop();
        }
      }

      function createJSDocComment(): JSDoc {
        const result = <JSDoc>createNode(qt.SyntaxKind.JSDocComment, start);
        result.tags = tags && createNodeArray(tags, tagsPos, tagsEnd);
        result.comment = comments.length ? comments.join('') : undefined;
        return finishNode(result, end);
      }

      function isNextNonwhitespaceTokenEndOfFile(): boolean {
        // We must use infinite lookahead, as there could be any number of newlines :(
        while (true) {
          nextTokenJSDoc();
          if (token() === qt.SyntaxKind.EndOfFileToken) {
            return true;
          }
          if (!(token() === qt.SyntaxKind.WhitespaceTrivia || token() === qt.SyntaxKind.NewLineTrivia)) {
            return false;
          }
        }
      }

      function skipWhitespace(): void {
        if (token() === qt.SyntaxKind.WhitespaceTrivia || token() === qt.SyntaxKind.NewLineTrivia) {
          if (lookAhead(isNextNonwhitespaceTokenEndOfFile)) {
            return; // Don't skip whitespace prior to EoF (or end of comment) - that shouldn't be included in any node's range
          }
        }
        while (token() === qt.SyntaxKind.WhitespaceTrivia || token() === qt.SyntaxKind.NewLineTrivia) {
          nextTokenJSDoc();
        }
      }

      function skipWhitespaceOrAsterisk(): string {
        if (token() === qt.SyntaxKind.WhitespaceTrivia || token() === qt.SyntaxKind.NewLineTrivia) {
          if (lookAhead(isNextNonwhitespaceTokenEndOfFile)) {
            return ''; // Don't skip whitespace prior to EoF (or end of comment) - that shouldn't be included in any node's range
          }
        }

        let precedingLineBreak = scanner.hasPrecedingLineBreak();
        let seenLineBreak = false;
        let indentText = '';
        while ((precedingLineBreak && token() === qt.SyntaxKind.AsteriskToken) || token() === qt.SyntaxKind.WhitespaceTrivia || token() === qt.SyntaxKind.NewLineTrivia) {
          indentText += scanner.getTokenText();
          if (token() === qt.SyntaxKind.NewLineTrivia) {
            precedingLineBreak = true;
            seenLineBreak = true;
            indentText = '';
          } else if (token() === qt.SyntaxKind.AsteriskToken) {
            precedingLineBreak = false;
          }
          nextTokenJSDoc();
        }
        return seenLineBreak ? indentText : '';
      }

      function parseTag(margin: number) {
        Debug.assert(token() === qt.SyntaxKind.AtToken);
        const start = scanner.getTokenPos();
        nextTokenJSDoc();

        const tagName = parseJSDocIdentifierName(/*message*/ undefined);
        const indentText = skipWhitespaceOrAsterisk();

        let tag: JSDocTag | undefined;
        switch (tagName.escapedText) {
          case 'author':
            tag = parseAuthorTag(start, tagName, margin);
            break;
          case 'implements':
            tag = parseImplementsTag(start, tagName);
            break;
          case 'augments':
          case 'extends':
            tag = parseAugmentsTag(start, tagName);
            break;
          case 'class':
          case 'constructor':
            tag = parseSimpleTag(start, qt.SyntaxKind.JSDocClassTag, tagName);
            break;
          case 'public':
            tag = parseSimpleTag(start, qt.SyntaxKind.JSDocPublicTag, tagName);
            break;
          case 'private':
            tag = parseSimpleTag(start, qt.SyntaxKind.JSDocPrivateTag, tagName);
            break;
          case 'protected':
            tag = parseSimpleTag(start, qt.SyntaxKind.JSDocProtectedTag, tagName);
            break;
          case 'readonly':
            tag = parseSimpleTag(start, qt.SyntaxKind.JSDocReadonlyTag, tagName);
            break;
          case 'this':
            tag = parseThisTag(start, tagName);
            break;
          case 'enum':
            tag = parseEnumTag(start, tagName);
            break;
          case 'arg':
          case 'argument':
          case 'param':
            return parseParameterOrPropertyTag(start, tagName, PropertyLikeParse.Parameter, margin);
          case 'return':
          case 'returns':
            tag = parseReturnTag(start, tagName);
            break;
          case 'template':
            tag = parseTemplateTag(start, tagName);
            break;
          case 'type':
            tag = parseTypeTag(start, tagName);
            break;
          case 'typedef':
            tag = parseTypedefTag(start, tagName, margin);
            break;
          case 'callback':
            tag = parseCallbackTag(start, tagName, margin);
            break;
          default:
            tag = parseUnknownTag(start, tagName);
            break;
        }

        if (!tag.comment) {
          // some tags, like typedef and callback, have already parsed their comments earlier
          if (!indentText) {
            margin += tag.end - tag.pos;
          }
          tag.comment = parseTagComments(margin, indentText.slice(margin));
        }
        return tag;
      }

      function parseTagComments(indent: number, initialMargin?: string): string | undefined {
        const comments: string[] = [];
        let state = JSDocState.BeginningOfLine;
        let margin: number | undefined;
        function pushComment(text: string) {
          if (!margin) {
            margin = indent;
          }
          comments.push(text);
          indent += text.length;
        }
        if (initialMargin !== undefined) {
          // jump straight to saving comments if there is some initial indentation
          if (initialMargin !== '') {
            pushComment(initialMargin);
          }
          state = JSDocState.SawAsterisk;
        }
        let tok = token();
        loop: while (true) {
          switch (tok) {
            case qt.SyntaxKind.NewLineTrivia:
              if (state >= JSDocState.SawAsterisk) {
                state = JSDocState.BeginningOfLine;
                // don't use pushComment here because we want to keep the margin unchanged
                comments.push(scanner.getTokenText());
              }
              indent = 0;
              break;
            case qt.SyntaxKind.AtToken:
              if (state === JSDocState.SavingBackticks) {
                comments.push(scanner.getTokenText());
                break;
              }
              scanner.setTextPos(scanner.getTextPos() - 1);
            // falls through
            case qt.SyntaxKind.EndOfFileToken:
              // Done
              break loop;
            case qt.SyntaxKind.WhitespaceTrivia:
              if (state === JSDocState.SavingComments || state === JSDocState.SavingBackticks) {
                pushComment(scanner.getTokenText());
              } else {
                const whitespace = scanner.getTokenText();
                // if the whitespace crosses the margin, take only the whitespace that passes the margin
                if (margin !== undefined && indent + whitespace.length > margin) {
                  comments.push(whitespace.slice(margin - indent));
                }
                indent += whitespace.length;
              }
              break;
            case qt.SyntaxKind.OpenBraceToken:
              state = JSDocState.SavingComments;
              if (lookAhead(() => nextTokenJSDoc() === qt.SyntaxKind.AtToken && tokenIsIdentifierOrKeyword(nextTokenJSDoc()) && scanner.getTokenText() === 'link')) {
                pushComment(scanner.getTokenText());
                nextTokenJSDoc();
                pushComment(scanner.getTokenText());
                nextTokenJSDoc();
              }
              pushComment(scanner.getTokenText());
              break;
            case qt.SyntaxKind.BacktickToken:
              if (state === JSDocState.SavingBackticks) {
                state = JSDocState.SavingComments;
              } else {
                state = JSDocState.SavingBackticks;
              }
              pushComment(scanner.getTokenText());
              break;
            case qt.SyntaxKind.AsteriskToken:
              if (state === JSDocState.BeginningOfLine) {
                // leading asterisks start recording on the *next* (non-whitespace) token
                state = JSDocState.SawAsterisk;
                indent += 1;
                break;
              }
            // record the * as a comment
            // falls through
            default:
              if (state !== JSDocState.SavingBackticks) {
                state = JSDocState.SavingComments; // leading identifiers start recording as well
              }
              pushComment(scanner.getTokenText());
              break;
          }
          tok = nextTokenJSDoc();
        }

        removeLeadingNewlines(comments);
        removeTrailingWhitespace(comments);
        return comments.length === 0 ? undefined : comments.join('');
      }

      function parseUnknownTag(start: number, tagName: qt.Identifier) {
        const result = <JSDocTag>createNode(qt.SyntaxKind.JSDocTag, start);
        result.tagName = tagName;
        return finishNode(result);
      }

      function addTag(tag: JSDocTag | undefined): void {
        if (!tag) {
          return;
        }
        if (!tags) {
          tags = [tag];
          tagsPos = tag.pos;
        } else {
          tags.push(tag);
        }
        tagsEnd = tag.end;
      }

      function tryParseTypeExpression(): JSDocTypeExpression | undefined {
        skipWhitespaceOrAsterisk();
        return token() === qt.SyntaxKind.OpenBraceToken ? parseJSDocTypeExpression() : undefined;
      }

      function parseBracketNameInPropertyAndParamTag(): { name: EntityName; isBracketed: boolean } {
        // Looking for something like '[foo]', 'foo', '[foo.bar]' or 'foo.bar'
        const isBracketed = parseOptionalJsdoc(qt.SyntaxKind.OpenBracketToken);
        if (isBracketed) {
          skipWhitespace();
        }
        // a markdown-quoted name: `arg` is not legal jsdoc, but occurs in the wild
        const isBackquoted = parseOptionalJsdoc(qt.SyntaxKind.BacktickToken);
        const name = parseJSDocEntityName();
        if (isBackquoted) {
          parseExpectedTokenJSDoc(qt.SyntaxKind.BacktickToken);
        }
        if (isBracketed) {
          skipWhitespace();
          // May have an optional default, e.g. '[foo = 42]'
          if (parseOptionalToken(qt.SyntaxKind.EqualsToken)) {
            parseExpression();
          }

          parseExpected(qt.SyntaxKind.CloseBracketToken);
        }

        return { name, isBracketed };
      }

      function isObjectOrObjectArrayTypeReference(node: TypeNode): boolean {
        switch (node.kind) {
          case qt.SyntaxKind.ObjectKeyword:
            return true;
          case qt.SyntaxKind.ArrayType:
            return isObjectOrObjectArrayTypeReference(node.elementType);
          default:
            return isTypeReferenceNode(node) && ts.isIdentifier(node.typeName) && node.typeName.escapedText === 'Object' && !node.typeArguments;
        }
      }

      function parseParameterOrPropertyTag(start: number, tagName: qt.Identifier, target: PropertyLikeParse, indent: number): JSDocParameterTag | JSDocPropertyTag {
        let typeExpression = tryParseTypeExpression();
        let isNameFirst = !typeExpression;
        skipWhitespaceOrAsterisk();

        const { name, isBracketed } = parseBracketNameInPropertyAndParamTag();
        skipWhitespace();

        if (isNameFirst) {
          typeExpression = tryParseTypeExpression();
        }

        const result = target === PropertyLikeParse.Property ? <JSDocPropertyTag>createNode(qt.SyntaxKind.JSDocPropertyTag, start) : <JSDocParameterTag>createNode(qt.SyntaxKind.JSDocParameterTag, start);
        const comment = parseTagComments(indent + scanner.getStartPos() - start);
        const nestedTypeLiteral = target !== PropertyLikeParse.CallbackParameter && parseNestedTypeLiteral(typeExpression, name, target, indent);
        if (nestedTypeLiteral) {
          typeExpression = nestedTypeLiteral;
          isNameFirst = true;
        }
        result.tagName = tagName;
        result.typeExpression = typeExpression;
        result.name = name;
        result.isNameFirst = isNameFirst;
        result.isBracketed = isBracketed;
        result.comment = comment;
        return finishNode(result);
      }

      function parseNestedTypeLiteral(typeExpression: JSDocTypeExpression | undefined, name: EntityName, target: PropertyLikeParse, indent: number) {
        if (typeExpression && isObjectOrObjectArrayTypeReference(typeExpression.type)) {
          const typeLiteralExpression = <JSDocTypeExpression>createNode(qt.SyntaxKind.JSDocTypeExpression, scanner.getTokenPos());
          let child: JSDocPropertyLikeTag | JSDocTypeTag | false;
          let jsdocTypeLiteral: JSDocTypeLiteral;
          const start = scanner.getStartPos();
          let children: JSDocPropertyLikeTag[] | undefined;
          while ((child = tryParse(() => parseChildParameterOrPropertyTag(target, indent, name)))) {
            if (child.kind === qt.SyntaxKind.JSDocParameterTag || child.kind === qt.SyntaxKind.JSDocPropertyTag) {
              children = append(children, child);
            }
          }
          if (children) {
            jsdocTypeLiteral = <JSDocTypeLiteral>createNode(qt.SyntaxKind.JSDocTypeLiteral, start);
            jsdocTypeLiteral.jsDocPropertyTags = children;
            if (typeExpression.type.kind === qt.SyntaxKind.ArrayType) {
              jsdocTypeLiteral.isArrayType = true;
            }
            typeLiteralExpression.type = finishNode(jsdocTypeLiteral);
            return finishNode(typeLiteralExpression);
          }
        }
      }

      function parseReturnTag(start: number, tagName: qt.Identifier): JSDocReturnTag {
        if (some(tags, isJSDocReturnTag)) {
          parseErrorAt(tagName.pos, scanner.getTokenPos(), Diagnostics._0_tag_already_specified, tagName.escapedText);
        }

        const result = <JSDocReturnTag>createNode(qt.SyntaxKind.JSDocReturnTag, start);
        result.tagName = tagName;
        result.typeExpression = tryParseTypeExpression();
        return finishNode(result);
      }

      function parseTypeTag(start: number, tagName: qt.Identifier): JSDocTypeTag {
        if (some(tags, isJSDocTypeTag)) {
          parseErrorAt(tagName.pos, scanner.getTokenPos(), Diagnostics._0_tag_already_specified, tagName.escapedText);
        }

        const result = <JSDocTypeTag>createNode(qt.SyntaxKind.JSDocTypeTag, start);
        result.tagName = tagName;
        result.typeExpression = parseJSDocTypeExpression(/*mayOmitBraces*/ true);
        return finishNode(result);
      }

      function parseAuthorTag(start: number, tagName: qt.Identifier, indent: number): JSDocAuthorTag {
        const result = <JSDocAuthorTag>createNode(qt.SyntaxKind.JSDocAuthorTag, start);
        result.tagName = tagName;

        const authorInfoWithEmail = tryParse(() => tryParseAuthorNameAndEmail());
        if (!authorInfoWithEmail) {
          return finishNode(result);
        }

        result.comment = authorInfoWithEmail;

        if (lookAhead(() => nextToken() !== qt.SyntaxKind.NewLineTrivia)) {
          const comment = parseTagComments(indent);
          if (comment) {
            result.comment += comment;
          }
        }

        return finishNode(result);
      }

      function tryParseAuthorNameAndEmail(): string | undefined {
        const comments: string[] = [];
        let seenLessThan = false;
        let seenGreaterThan = false;
        let token = scanner.getToken();

        loop: while (true) {
          switch (token) {
            case qt.SyntaxKind.Identifier:
            case qt.SyntaxKind.WhitespaceTrivia:
            case qt.SyntaxKind.DotToken:
            case qt.SyntaxKind.AtToken:
              comments.push(scanner.getTokenText());
              break;
            case qt.SyntaxKind.LessThanToken:
              if (seenLessThan || seenGreaterThan) {
                return;
              }
              seenLessThan = true;
              comments.push(scanner.getTokenText());
              break;
            case qt.SyntaxKind.GreaterThanToken:
              if (!seenLessThan || seenGreaterThan) {
                return;
              }
              seenGreaterThan = true;
              comments.push(scanner.getTokenText());
              scanner.setTextPos(scanner.getTokenPos() + 1);
              break loop;
            case qt.SyntaxKind.NewLineTrivia:
            case qt.SyntaxKind.EndOfFileToken:
              break loop;
          }

          token = nextTokenJSDoc();
        }

        if (seenLessThan && seenGreaterThan) {
          return comments.length === 0 ? undefined : comments.join('');
        }
      }

      function parseImplementsTag(start: number, tagName: qt.Identifier): JSDocImplementsTag {
        const result = <JSDocImplementsTag>createNode(qt.SyntaxKind.JSDocImplementsTag, start);
        result.tagName = tagName;
        result.class = parseExpressionWithTypeArgumentsForAugments();
        return finishNode(result);
      }

      function parseAugmentsTag(start: number, tagName: qt.Identifier): JSDocAugmentsTag {
        const result = <JSDocAugmentsTag>createNode(qt.SyntaxKind.JSDocAugmentsTag, start);
        result.tagName = tagName;
        result.class = parseExpressionWithTypeArgumentsForAugments();
        return finishNode(result);
      }

      function parseExpressionWithTypeArgumentsForAugments(): ExpressionWithTypeArguments & { expression: qt.Identifier | PropertyAccessEntityNameExpression } {
        const usedBrace = parseOptional(qt.SyntaxKind.OpenBraceToken);
        const node = createNode(qt.SyntaxKind.ExpressionWithTypeArguments) as ExpressionWithTypeArguments & { expression: qt.Identifier | PropertyAccessEntityNameExpression };
        node.expression = parsePropertyAccessEntityNameExpression();
        node.typeArguments = tryParseTypeArguments();
        const res = finishNode(node);
        if (usedBrace) {
          parseExpected(qt.SyntaxKind.CloseBraceToken);
        }
        return res;
      }

      function parsePropertyAccessEntityNameExpression() {
        let node: qt.Identifier | PropertyAccessEntityNameExpression = parseJSDocIdentifierName();
        while (parseOptional(qt.SyntaxKind.DotToken)) {
          const prop: PropertyAccessEntityNameExpression = createNode(qt.SyntaxKind.PropertyAccessExpression, node.pos) as PropertyAccessEntityNameExpression;
          prop.expression = node;
          prop.name = parseJSDocIdentifierName();
          node = finishNode(prop);
        }
        return node;
      }

      function parseSimpleTag(start: number, kind: qt.SyntaxKind, tagName: qt.Identifier): JSDocTag {
        const tag = <JSDocTag>createNode(kind, start);
        tag.tagName = tagName;
        return finishNode(tag);
      }

      function parseThisTag(start: number, tagName: qt.Identifier): JSDocThisTag {
        const tag = <JSDocThisTag>createNode(qt.SyntaxKind.JSDocThisTag, start);
        tag.tagName = tagName;
        tag.typeExpression = parseJSDocTypeExpression(/*mayOmitBraces*/ true);
        skipWhitespace();
        return finishNode(tag);
      }

      function parseEnumTag(start: number, tagName: qt.Identifier): JSDocEnumTag {
        const tag = <JSDocEnumTag>createNode(qt.SyntaxKind.JSDocEnumTag, start);
        tag.tagName = tagName;
        tag.typeExpression = parseJSDocTypeExpression(/*mayOmitBraces*/ true);
        skipWhitespace();
        return finishNode(tag);
      }

      function parseTypedefTag(start: number, tagName: qt.Identifier, indent: number): JSDocTypedefTag {
        const typeExpression = tryParseTypeExpression();
        skipWhitespaceOrAsterisk();

        const typedefTag = <JSDocTypedefTag>createNode(qt.SyntaxKind.JSDocTypedefTag, start);
        typedefTag.tagName = tagName;
        typedefTag.fullName = parseJSDocTypeNameWithNamespace();
        typedefTag.name = getJSDocTypeAliasName(typedefTag.fullName);
        skipWhitespace();
        typedefTag.comment = parseTagComments(indent);

        typedefTag.typeExpression = typeExpression;
        let end: number | undefined;
        if (!typeExpression || isObjectOrObjectArrayTypeReference(typeExpression.type)) {
          let child: JSDocTypeTag | JSDocPropertyTag | false;
          let jsdocTypeLiteral: JSDocTypeLiteral | undefined;
          let childTypeTag: JSDocTypeTag | undefined;
          while ((child = tryParse(() => parseChildPropertyTag(indent)))) {
            if (!jsdocTypeLiteral) {
              jsdocTypeLiteral = <JSDocTypeLiteral>createNode(qt.SyntaxKind.JSDocTypeLiteral, start);
            }
            if (child.kind === qt.SyntaxKind.JSDocTypeTag) {
              if (childTypeTag) {
                parseErrorAtCurrentToken(Diagnostics.A_JSDoc_typedef_comment_may_not_contain_multiple_type_tags);
                const lastError = qc.lastOrUndefined(parseDiagnostics);
                if (lastError) {
                  addRelatedInfo(lastError, createDiagnosticForNode(sourceFile, Diagnostics.The_tag_was_first_specified_here));
                }
                break;
              } else {
                childTypeTag = child;
              }
            } else {
              jsdocTypeLiteral.jsDocPropertyTags = append(jsdocTypeLiteral.jsDocPropertyTags as MutableNodeArray<JSDocPropertyTag>, child);
            }
          }
          if (jsdocTypeLiteral) {
            if (typeExpression && typeExpression.type.kind === qt.SyntaxKind.ArrayType) {
              jsdocTypeLiteral.isArrayType = true;
            }
            typedefTag.typeExpression = childTypeTag && childTypeTag.typeExpression && !isObjectOrObjectArrayTypeReference(childTypeTag.typeExpression.type) ? childTypeTag.typeExpression : finishNode(jsdocTypeLiteral);
            end = typedefTag.typeExpression.end;
          }
        }

        // Only include the characters between the name end and the next token if a comment was actually parsed out - otherwise it's just whitespace
        return finishNode(typedefTag, end || typedefTag.comment !== undefined ? scanner.getStartPos() : (typedefTag.fullName || typedefTag.typeExpression || typedefTag.tagName).end);
      }

      function parseJSDocTypeNameWithNamespace(nested?: boolean) {
        const pos = scanner.getTokenPos();
        if (!tokenIsIdentifierOrKeyword(token())) {
          return undefined;
        }
        const typeNameOrNamespaceName = parseJSDocIdentifierName();
        if (parseOptional(qt.SyntaxKind.DotToken)) {
          const jsDocNamespaceNode = <JSDocNamespaceDeclaration>createNode(qt.SyntaxKind.ModuleDeclaration, pos);
          if (nested) {
            jsDocNamespaceNode.flags |= qt.NodeFlags.NestedNamespace;
          }
          jsDocNamespaceNode.name = typeNameOrNamespaceName;
          jsDocNamespaceNode.body = parseJSDocTypeNameWithNamespace(/*nested*/ true);
          return finishNode(jsDocNamespaceNode);
        }

        if (nested) {
          typeNameOrNamespaceName.isInJSDocNamespace = true;
        }
        return typeNameOrNamespaceName;
      }

      function parseCallbackTag(start: number, tagName: qt.Identifier, indent: number): JSDocCallbackTag {
        const callbackTag = createNode(qt.SyntaxKind.JSDocCallbackTag, start) as JSDocCallbackTag;
        callbackTag.tagName = tagName;
        callbackTag.fullName = parseJSDocTypeNameWithNamespace();
        callbackTag.name = getJSDocTypeAliasName(callbackTag.fullName);
        skipWhitespace();
        callbackTag.comment = parseTagComments(indent);

        let child: JSDocParameterTag | false;
        const jsdocSignature = createNode(qt.SyntaxKind.JSDocSignature, start) as JSDocSignature;
        jsdocSignature.parameters = [];
        while ((child = tryParse(() => parseChildParameterOrPropertyTag(PropertyLikeParse.CallbackParameter, indent) as JSDocParameterTag))) {
          jsdocSignature.parameters = append(jsdocSignature.parameters, child);
        }
        const returnTag = tryParse(() => {
          if (parseOptionalJsdoc(qt.SyntaxKind.AtToken)) {
            const tag = parseTag(indent);
            if (tag && tag.kind === qt.SyntaxKind.JSDocReturnTag) {
              return tag as JSDocReturnTag;
            }
          }
        });
        if (returnTag) {
          jsdocSignature.type = returnTag;
        }
        callbackTag.typeExpression = finishNode(jsdocSignature);
        return finishNode(callbackTag);
      }

      function getJSDocTypeAliasName(fullName: JSDocNamespaceBody | undefined) {
        if (fullName) {
          let rightNode = fullName;
          while (true) {
            if (ts.isIdentifier(rightNode) || !rightNode.body) {
              return ts.isIdentifier(rightNode) ? rightNode : rightNode.name;
            }
            rightNode = rightNode.body;
          }
        }
      }

      function escapedTextsEqual(a: EntityName, b: EntityName): boolean {
        while (!ts.isIdentifier(a) || !ts.isIdentifier(b)) {
          if (!ts.isIdentifier(a) && !ts.isIdentifier(b) && a.right.escapedText === b.right.escapedText) {
            a = a.left;
            b = b.left;
          } else {
            return false;
          }
        }
        return a.escapedText === b.escapedText;
      }

      function parseChildPropertyTag(indent: number) {
        return parseChildParameterOrPropertyTag(PropertyLikeParse.Property, indent);
      }

      function parseChildParameterOrPropertyTag(target: PropertyLikeParse, indent: number, name?: EntityName): JSDocTypeTag | JSDocPropertyTag | JSDocParameterTag | false {
        let canParseTag = true;
        let seenAsterisk = false;
        while (true) {
          switch (nextTokenJSDoc()) {
            case qt.SyntaxKind.AtToken:
              if (canParseTag) {
                const child = tryParseChildTag(target, indent);
                if (child && (child.kind === qt.SyntaxKind.JSDocParameterTag || child.kind === qt.SyntaxKind.JSDocPropertyTag) && target !== PropertyLikeParse.CallbackParameter && name && (ts.isIdentifier(child.name) || !escapedTextsEqual(name, child.name.left))) {
                  return false;
                }
                return child;
              }
              seenAsterisk = false;
              break;
            case qt.SyntaxKind.NewLineTrivia:
              canParseTag = true;
              seenAsterisk = false;
              break;
            case qt.SyntaxKind.AsteriskToken:
              if (seenAsterisk) {
                canParseTag = false;
              }
              seenAsterisk = true;
              break;
            case qt.SyntaxKind.Identifier:
              canParseTag = false;
              break;
            case qt.SyntaxKind.EndOfFileToken:
              return false;
          }
        }
      }

      function tryParseChildTag(target: PropertyLikeParse, indent: number): JSDocTypeTag | JSDocPropertyTag | JSDocParameterTag | false {
        Debug.assert(token() === qt.SyntaxKind.AtToken);
        const start = scanner.getStartPos();
        nextTokenJSDoc();

        const tagName = parseJSDocIdentifierName();
        skipWhitespace();
        let t: PropertyLikeParse;
        switch (tagName.escapedText) {
          case 'type':
            return target === PropertyLikeParse.Property && parseTypeTag(start, tagName);
          case 'prop':
          case 'property':
            t = PropertyLikeParse.Property;
            break;
          case 'arg':
          case 'argument':
          case 'param':
            t = PropertyLikeParse.Parameter | PropertyLikeParse.CallbackParameter;
            break;
          default:
            return false;
        }
        if (!(target & t)) {
          return false;
        }
        return parseParameterOrPropertyTag(start, tagName, target, indent);
      }

      function parseTemplateTag(start: number, tagName: qt.Identifier): JSDocTemplateTag {
        // the template tag looks like '@template {Constraint} T,U,V'
        let constraint: JSDocTypeExpression | undefined;
        if (token() === qt.SyntaxKind.OpenBraceToken) {
          constraint = parseJSDocTypeExpression();
        }

        const typeParameters = [];
        const typeParametersPos = getNodePos();
        do {
          skipWhitespace();
          const typeParameter = <TypeParameterDeclaration>createNode(qt.SyntaxKind.TypeParameter);
          typeParameter.name = parseJSDocIdentifierName(Diagnostics.Unexpected_token_A_type_parameter_name_was_expected_without_curly_braces);
          finishNode(typeParameter);
          skipWhitespaceOrAsterisk();
          typeParameters.push(typeParameter);
        } while (parseOptionalJsdoc(qt.SyntaxKind.CommaToken));

        const result = <JSDocTemplateTag>createNode(qt.SyntaxKind.JSDocTemplateTag, start);
        result.tagName = tagName;
        result.constraint = constraint;
        result.typeParameters = createNodeArray(typeParameters, typeParametersPos);
        finishNode(result);
        return result;
      }

      function parseOptionalJsdoc(t: qt.JSDocSyntaxKind): boolean {
        if (token() === t) {
          nextTokenJSDoc();
          return true;
        }
        return false;
      }

      function parseJSDocEntityName(): EntityName {
        let entity: EntityName = parseJSDocIdentifierName();
        if (parseOptional(qt.SyntaxKind.OpenBracketToken)) {
          parseExpected(qt.SyntaxKind.CloseBracketToken);
          // Note that y[] is accepted as an entity name, but the postfix brackets are not saved for checking.
          // Technically usejsdoc.org requires them for specifying a property of a type equivalent to Array<{ x: ...}>
          // but it's not worth it to enforce that restriction.
        }
        while (parseOptional(qt.SyntaxKind.DotToken)) {
          const name = parseJSDocIdentifierName();
          if (parseOptional(qt.SyntaxKind.OpenBracketToken)) {
            parseExpected(qt.SyntaxKind.CloseBracketToken);
          }
          entity = createQualifiedName(entity, name);
        }
        return entity;
      }

      function parseJSDocIdentifierName(message?: qt.DiagnosticMessage): qt.Identifier {
        if (!tokenIsIdentifierOrKeyword(token())) {
          return createMissingNode<qt.Identifier>(qt.SyntaxKind.Identifier, /*reportAtCurrentPosition*/ !message, message || Diagnostics.Identifier_expected);
        }

        identifierCount++;
        const pos = scanner.getTokenPos();
        const end = scanner.getTextPos();
        const result = <qt.Identifier>createNode(qt.SyntaxKind.Identifier, pos);
        if (token() !== qt.SyntaxKind.Identifier) {
          result.originalKeywordKind = token();
        }
        result.escapedText = escapeLeadingUnderscores(internIdentifier(scanner.getTokenValue()));
        finishNode(result, end);

        nextTokenJSDoc();
        return result;
      }
    }
  }
}

namespace IncrementalParser {
  export function updateSourceFile(sourceFile: SourceFile, newText: string, textChangeRange: qt.TextChangeRange, aggressiveChecks: boolean): SourceFile {
    aggressiveChecks = aggressiveChecks || Debug.shouldAssert(AssertionLevel.Aggressive);

    checkChangeRange(sourceFile, newText, textChangeRange, aggressiveChecks);
    if (textChangeRangeIsUnchanged(textChangeRange)) {
      // if the text didn't change, then we can just return our current source file as-is.
      return sourceFile;
    }

    if (sourceFile.statements.length === 0) {
      // If we don't have any statements in the current source file, then there's no real
      // way to incrementally parse.  So just do a full parse instead.
      return Parser.parseSourceFile(sourceFile.fileName, newText, sourceFile.languageVersion, /*syntaxCursor*/ undefined, /*setParentNodes*/ true, sourceFile.scriptKind);
    }

    // Make sure we're not trying to incrementally update a source file more than once.  Once
    // we do an update the original source file is considered unusable from that point onwards.
    //
    // This is because we do incremental parsing in-place.  i.e. we take nodes from the old
    // tree and give them new positions and parents.  From that point on, trusting the old
    // tree at all is not possible as far too much of it may violate invariants.
    const incrementalSourceFile = <IncrementalNode>(<qt.Node>sourceFile);
    Debug.assert(!incrementalSourceFile.hasBeenIncrementallyParsed);
    incrementalSourceFile.hasBeenIncrementallyParsed = true;
    const oldText = sourceFile.text;
    const syntaxCursor = createSyntaxCursor(sourceFile);

    // Make the actual change larger so that we know to reparse anything whose lookahead
    // might have intersected the change.
    const changeRange = extendToAffectedRange(sourceFile, textChangeRange);
    checkChangeRange(sourceFile, newText, changeRange, aggressiveChecks);

    // Ensure that extending the affected range only moved the start of the change range
    // earlier in the file.
    Debug.assert(changeRange.span.start <= textChangeRange.span.start);
    Debug.assert(textSpanEnd(changeRange.span) === textSpanEnd(textChangeRange.span));
    Debug.assert(textSpanEnd(textChangeRangeNewSpan(changeRange)) === textSpanEnd(textChangeRangeNewSpan(textChangeRange)));

    // The is the amount the nodes after the edit range need to be adjusted.  It can be
    // positive (if the edit added characters), negative (if the edit deleted characters)
    // or zero (if this was a pure overwrite with nothing added/removed).
    const delta = textChangeRangeNewSpan(changeRange).length - changeRange.span.length;

    // If we added or removed characters during the edit, then we need to go and adjust all
    // the nodes after the edit.  Those nodes may move forward (if we inserted chars) or they
    // may move backward (if we deleted chars).
    //
    // Doing this helps us out in two ways.  First, it means that any nodes/tokens we want
    // to reuse are already at the appropriate position in the new text.  That way when we
    // reuse them, we don't have to figure out if they need to be adjusted.  Second, it makes
    // it very easy to determine if we can reuse a node.  If the node's position is at where
    // we are in the text, then we can reuse it.  Otherwise we can't.  If the node's position
    // is ahead of us, then we'll need to rescan tokens.  If the node's position is behind
    // us, then we'll need to skip it or crumble it as appropriate
    //
    // We will also adjust the positions of nodes that intersect the change range as well.
    // By doing this, we ensure that all the positions in the old tree are consistent, not
    // just the positions of nodes entirely before/after the change range.  By being
    // consistent, we can then easily map from positions to nodes in the old tree easily.
    //
    // Also, mark any syntax elements that intersect the changed span.  We know, up front,
    // that we cannot reuse these elements.
    updateTokenPositionsAndMarkElements(incrementalSourceFile, changeRange.span.start, textSpanEnd(changeRange.span), textSpanEnd(textChangeRangeNewSpan(changeRange)), delta, oldText, newText, aggressiveChecks);

    // Now that we've set up our internal incremental state just proceed and parse the
    // source file in the normal fashion.  When possible the parser will retrieve and
    // reuse nodes from the old tree.
    //
    // Note: passing in 'true' for setNodeParents is very important.  When incrementally
    // parsing, we will be reusing nodes from the old tree, and placing it into new
    // parents.  If we don't set the parents now, we'll end up with an observably
    // inconsistent tree.  Setting the parents on the new tree should be very fast.  We
    // will immediately bail out of walking any subtrees when we can see that their parents
    // are already correct.
    const result = Parser.parseSourceFile(sourceFile.fileName, newText, sourceFile.languageVersion, syntaxCursor, /*setParentNodes*/ true, sourceFile.scriptKind);
    result.commentDirectives = getNewCommentDirectives(sourceFile.commentDirectives, result.commentDirectives, changeRange.span.start, textSpanEnd(changeRange.span), delta, oldText, newText, aggressiveChecks);
    return result;
  }

  function getNewCommentDirectives(oldDirectives: CommentDirective[] | undefined, newDirectives: CommentDirective[] | undefined, changeStart: number, changeRangeOldEnd: number, delta: number, oldText: string, newText: string, aggressiveChecks: boolean): CommentDirective[] | undefined {
    if (!oldDirectives) return newDirectives;
    let commentDirectives: CommentDirective[] | undefined;
    let addedNewlyScannedDirectives = false;
    for (const directive of oldDirectives) {
      const { range, type } = directive;
      // Range before the change
      if (range.end < changeStart) {
        commentDirectives = append(commentDirectives, directive);
      } else if (range.pos > changeRangeOldEnd) {
        addNewlyScannedDirectives();
        // Node is entirely past the change range.  We need to move both its pos and
        // end, forward or backward appropriately.
        const updatedDirective: CommentDirective = {
          range: { pos: range.pos + delta, end: range.end + delta },
          type,
        };
        commentDirectives = append(commentDirectives, updatedDirective);
        if (aggressiveChecks) {
          Debug.assert(oldText.substring(range.pos, range.end) === newText.substring(updatedDirective.range.pos, updatedDirective.range.end));
        }
      }
      // Ignore ranges that fall in change range
    }
    addNewlyScannedDirectives();
    return commentDirectives;

    function addNewlyScannedDirectives() {
      if (addedNewlyScannedDirectives) return;
      addedNewlyScannedDirectives = true;
      if (!commentDirectives) {
        commentDirectives = newDirectives;
      } else if (newDirectives) {
        commentDirectives.push(...newDirectives);
      }
    }
  }

  function moveElementEntirelyPastChangeRange(element: IncrementalElement, isArray: boolean, delta: number, oldText: string, newText: string, aggressiveChecks: boolean) {
    if (isArray) {
      visitArray(<IncrementalNodeArray>element);
    } else {
      visitNode(<IncrementalNode>element);
    }
    return;

    function visitNode(node: IncrementalNode) {
      let text = '';
      if (aggressiveChecks && shouldCheckNode(node)) {
        text = oldText.substring(node.pos, node.end);
      }

      // Ditch any existing LS children we may have created.  This way we can avoid
      // moving them forward.
      if (node._children) {
        node._children = undefined;
      }

      node.pos += delta;
      node.end += delta;

      if (aggressiveChecks && shouldCheckNode(node)) {
        Debug.assert(text === newText.substring(node.pos, node.end));
      }

      forEachChild(node, visitNode, visitArray);
      if (hasJSDocNodes(node)) {
        for (const jsDocComment of node.jsDoc!) {
          visitNode(<IncrementalNode>(<qt.Node>jsDocComment));
        }
      }
      checkNodePositions(node, aggressiveChecks);
    }

    function visitArray(array: IncrementalNodeArray) {
      array._children = undefined;
      array.pos += delta;
      array.end += delta;

      for (const node of array) {
        visitNode(node);
      }
    }
  }

  function shouldCheckNode(node: qt.Node) {
    switch (node.kind) {
      case qt.SyntaxKind.StringLiteral:
      case qt.SyntaxKind.NumericLiteral:
      case qt.SyntaxKind.Identifier:
        return true;
    }

    return false;
  }

  function adjustIntersectingElement(element: IncrementalElement, changeStart: number, changeRangeOldEnd: number, changeRangeNewEnd: number, delta: number) {
    Debug.assert(element.end >= changeStart, 'Adjusting an element that was entirely before the change range');
    Debug.assert(element.pos <= changeRangeOldEnd, 'Adjusting an element that was entirely after the change range');
    Debug.assert(element.pos <= element.end);

    // We have an element that intersects the change range in some way.  It may have its
    // start, or its end (or both) in the changed range.  We want to adjust any part
    // that intersects such that the final tree is in a consistent state.  i.e. all
    // children have spans within the span of their parent, and all siblings are ordered
    // properly.

    // We may need to update both the 'pos' and the 'end' of the element.

    // If the 'pos' is before the start of the change, then we don't need to touch it.
    // If it isn't, then the 'pos' must be inside the change.  How we update it will
    // depend if delta is positive or negative. If delta is positive then we have
    // something like:
    //
    //  -------------------AAA-----------------
    //  -------------------BBBCCCCCCC-----------------
    //
    // In this case, we consider any node that started in the change range to still be
    // starting at the same position.
    //
    // however, if the delta is negative, then we instead have something like this:
    //
    //  -------------------XXXYYYYYYY-----------------
    //  -------------------ZZZ-----------------
    //
    // In this case, any element that started in the 'X' range will keep its position.
    // However any element that started after that will have their pos adjusted to be
    // at the end of the new range.  i.e. any node that started in the 'Y' range will
    // be adjusted to have their start at the end of the 'Z' range.
    //
    // The element will keep its position if possible.  Or Move backward to the new-end
    // if it's in the 'Y' range.
    element.pos = Math.min(element.pos, changeRangeNewEnd);

    // If the 'end' is after the change range, then we always adjust it by the delta
    // amount.  However, if the end is in the change range, then how we adjust it
    // will depend on if delta is positive or negative.  If delta is positive then we
    // have something like:
    //
    //  -------------------AAA-----------------
    //  -------------------BBBCCCCCCC-----------------
    //
    // In this case, we consider any node that ended inside the change range to keep its
    // end position.
    //
    // however, if the delta is negative, then we instead have something like this:
    //
    //  -------------------XXXYYYYYYY-----------------
    //  -------------------ZZZ-----------------
    //
    // In this case, any element that ended in the 'X' range will keep its position.
    // However any element that ended after that will have their pos adjusted to be
    // at the end of the new range.  i.e. any node that ended in the 'Y' range will
    // be adjusted to have their end at the end of the 'Z' range.
    if (element.end >= changeRangeOldEnd) {
      // Element ends after the change range.  Always adjust the end pos.
      element.end += delta;
    } else {
      // Element ends in the change range.  The element will keep its position if
      // possible. Or Move backward to the new-end if it's in the 'Y' range.
      element.end = Math.min(element.end, changeRangeNewEnd);
    }

    Debug.assert(element.pos <= element.end);
    if (element.parent) {
      Debug.assert(element.pos >= element.parent.pos);
      Debug.assert(element.end <= element.parent.end);
    }
  }

  function checkNodePositions(node: qt.Node, aggressiveChecks: boolean) {
    if (aggressiveChecks) {
      let pos = node.pos;
      const visitNode = (child: qt.Node) => {
        Debug.assert(child.pos >= pos);
        pos = child.end;
      };
      if (hasJSDocNodes(node)) {
        for (const jsDocComment of node.jsDoc!) {
          visitNode(jsDocComment);
        }
      }
      forEachChild(node, visitNode);
      Debug.assert(pos <= node.end);
    }
  }

  function updateTokenPositionsAndMarkElements(sourceFile: IncrementalNode, changeStart: number, changeRangeOldEnd: number, changeRangeNewEnd: number, delta: number, oldText: string, newText: string, aggressiveChecks: boolean): void {
    visitNode(sourceFile);
    return;

    function visitNode(child: IncrementalNode) {
      Debug.assert(child.pos <= child.end);
      if (child.pos > changeRangeOldEnd) {
        // Node is entirely past the change range.  We need to move both its pos and
        // end, forward or backward appropriately.
        moveElementEntirelyPastChangeRange(child, /*isArray*/ false, delta, oldText, newText, aggressiveChecks);
        return;
      }

      // Check if the element intersects the change range.  If it does, then it is not
      // reusable.  Also, we'll need to recurse to see what constituent portions we may
      // be able to use.
      const fullEnd = child.end;
      if (fullEnd >= changeStart) {
        child.intersectsChange = true;
        child._children = undefined;

        // Adjust the pos or end (or both) of the intersecting element accordingly.
        adjustIntersectingElement(child, changeStart, changeRangeOldEnd, changeRangeNewEnd, delta);
        forEachChild(child, visitNode, visitArray);
        if (hasJSDocNodes(child)) {
          for (const jsDocComment of child.jsDoc!) {
            visitNode(<IncrementalNode>(<qt.Node>jsDocComment));
          }
        }
        checkNodePositions(child, aggressiveChecks);
        return;
      }

      // Otherwise, the node is entirely before the change range.  No need to do anything with it.
      Debug.assert(fullEnd < changeStart);
    }

    function visitArray(array: IncrementalNodeArray) {
      Debug.assert(array.pos <= array.end);
      if (array.pos > changeRangeOldEnd) {
        // Array is entirely after the change range.  We need to move it, and move any of
        // its children.
        moveElementEntirelyPastChangeRange(array, /*isArray*/ true, delta, oldText, newText, aggressiveChecks);
        return;
      }

      // Check if the element intersects the change range.  If it does, then it is not
      // reusable.  Also, we'll need to recurse to see what constituent portions we may
      // be able to use.
      const fullEnd = array.end;
      if (fullEnd >= changeStart) {
        array.intersectsChange = true;
        array._children = undefined;

        // Adjust the pos or end (or both) of the intersecting array accordingly.
        adjustIntersectingElement(array, changeStart, changeRangeOldEnd, changeRangeNewEnd, delta);
        for (const node of array) {
          visitNode(node);
        }
        return;
      }

      // Otherwise, the array is entirely before the change range.  No need to do anything with it.
      Debug.assert(fullEnd < changeStart);
    }
  }

  function extendToAffectedRange(sourceFile: SourceFile, changeRange: qt.TextChangeRange): qt.TextChangeRange {
    // Consider the following code:
    //      void foo() { /; }
    //
    // If the text changes with an insertion of / just before the semicolon then we end up with:
    //      void foo() { //; }
    //
    // If we were to just use the changeRange a is, then we would not rescan the { token
    // (as it does not intersect the actual original change range).  Because an edit may
    // change the token touching it, we actually need to look back *at least* one token so
    // that the prior token sees that change.
    const maxLookahead = 1;

    let start = changeRange.span.start;

    // the first iteration aligns us with the change start. subsequent iteration move us to
    // the left by maxLookahead tokens.  We only need to do this as long as we're not at the
    // start of the tree.
    for (let i = 0; start > 0 && i <= maxLookahead; i++) {
      const nearestNode = findNearestNodeStartingBeforeOrAtPosition(sourceFile, start);
      Debug.assert(nearestNode.pos <= start);
      const position = nearestNode.pos;

      start = Math.max(0, position - 1);
    }

    const finalSpan = createTextSpanFromBounds(start, textSpanEnd(changeRange.span));
    const finalLength = changeRange.newLength + (changeRange.span.start - start);

    return createTextChangeRange(finalSpan, finalLength);
  }

  function findNearestNodeStartingBeforeOrAtPosition(sourceFile: SourceFile, position: number): qt.Node {
    let bestResult: qt.Node = sourceFile;
    let lastNodeEntirelyBeforePosition: qt.Node | undefined;

    forEachChild(sourceFile, visit);

    if (lastNodeEntirelyBeforePosition) {
      const lastChildOfLastEntireNodeBeforePosition = getLastDescendant(lastNodeEntirelyBeforePosition);
      if (lastChildOfLastEntireNodeBeforePosition.pos > bestResult.pos) {
        bestResult = lastChildOfLastEntireNodeBeforePosition;
      }
    }

    return bestResult;

    function getLastDescendant(node: qt.Node): qt.Node {
      while (true) {
        const lastChild = getLastChild(node);
        if (lastChild) {
          node = lastChild;
        } else {
          return node;
        }
      }
    }

    function visit(child: qt.Node) {
      if (nodeIsMissing(child)) {
        // Missing nodes are effectively invisible to us.  We never even consider them
        // When trying to find the nearest node before us.
        return;
      }

      // If the child intersects this position, then this node is currently the nearest
      // node that starts before the position.
      if (child.pos <= position) {
        if (child.pos >= bestResult.pos) {
          // This node starts before the position, and is closer to the position than
          // the previous best node we found.  It is now the new best node.
          bestResult = child;
        }

        // Now, the node may overlap the position, or it may end entirely before the
        // position.  If it overlaps with the position, then either it, or one of its
        // children must be the nearest node before the position.  So we can just
        // recurse into this child to see if we can find something better.
        if (position < child.end) {
          // The nearest node is either this child, or one of the children inside
          // of it.  We've already marked this child as the best so far.  Recurse
          // in case one of the children is better.
          forEachChild(child, visit);

          // Once we look at the children of this node, then there's no need to
          // continue any further.
          return true;
        } else {
          Debug.assert(child.end <= position);
          // The child ends entirely before this position.  Say you have the following
          // (where $ is the position)
          //
          //      <complex expr 1> ? <complex expr 2> $ : <...> <...>
          //
          // We would want to find the nearest preceding node in "complex expr 2".
          // To support that, we keep track of this node, and once we're done searching
          // for a best node, we recurse down this node to see if we can find a good
          // result in it.
          //
          // This approach allows us to quickly skip over nodes that are entirely
          // before the position, while still allowing us to find any nodes in the
          // last one that might be what we want.
          lastNodeEntirelyBeforePosition = child;
        }
      } else {
        Debug.assert(child.pos > position);
        // We're now at a node that is entirely past the position we're searching for.
        // This node (and all following nodes) could never contribute to the result,
        // so just skip them by returning 'true' here.
        return true;
      }
    }
  }

  function checkChangeRange(sourceFile: SourceFile, newText: string, textChangeRange: qt.TextChangeRange, aggressiveChecks: boolean) {
    const oldText = sourceFile.text;
    if (textChangeRange) {
      Debug.assert(oldText.length - textChangeRange.span.length + textChangeRange.newLength === newText.length);

      if (aggressiveChecks || Debug.shouldAssert(AssertionLevel.VeryAggressive)) {
        const oldTextPrefix = oldText.substr(0, textChangeRange.span.start);
        const newTextPrefix = newText.substr(0, textChangeRange.span.start);
        Debug.assert(oldTextPrefix === newTextPrefix);

        const oldTextSuffix = oldText.substring(textSpanEnd(textChangeRange.span), oldText.length);
        const newTextSuffix = newText.substring(textSpanEnd(textChangeRangeNewSpan(textChangeRange)), newText.length);
        Debug.assert(oldTextSuffix === newTextSuffix);
      }
    }
  }

  interface IncrementalElement extends qt.TextRange {
    parent: qt.Node;
    intersectsChange: boolean;
    length?: number;
    _children: qt.Node[] | undefined;
  }

  export interface IncrementalNode extends qt.Node, IncrementalElement {
    hasBeenIncrementallyParsed: boolean;
  }

  interface IncrementalNodeArray extends qt.NodeArray<IncrementalNode>, IncrementalElement {
    length: number;
  }

  // Allows finding nodes in the source file at a certain position in an efficient manner.
  // The implementation takes advantage of the calling pattern it knows the parser will
  // make in order to optimize finding nodes as quickly as possible.
  export interface SyntaxCursor {
    currentNode(position: number): IncrementalNode;
  }

  function createSyntaxCursor(sourceFile: SourceFile): SyntaxCursor {
    let currentArray: qt.NodeArray<qt.Node> = sourceFile.statements;
    let currentArrayIndex = 0;

    Debug.assert(currentArrayIndex < currentArray.length);
    let current = currentArray[currentArrayIndex];
    let lastQueriedPosition = InvalidPosition.Value;

    return {
      currentNode(position: number) {
        // Only compute the current node if the position is different than the last time
        // we were asked.  The parser commonly asks for the node at the same position
        // twice.  Once to know if can read an appropriate list element at a certain point,
        // and then to actually read and consume the node.
        if (position !== lastQueriedPosition) {
          // Much of the time the parser will need the very next node in the array that
          // we just returned a node from.So just simply check for that case and move
          // forward in the array instead of searching for the node again.
          if (current && current.end === position && currentArrayIndex < currentArray.length - 1) {
            currentArrayIndex++;
            current = currentArray[currentArrayIndex];
          }

          // If we don't have a node, or the node we have isn't in the right position,
          // then try to find a viable node at the position requested.
          if (!current || current.pos !== position) {
            findHighestListElementThatStartsAtPosition(position);
          }
        }

        // Cache this query so that we don't do any extra work if the parser calls back
        // into us.  Note: this is very common as the parser will make pairs of calls like
        // 'isListElement -> parseListElement'.  If we were unable to find a node when
        // called with 'isListElement', we don't want to redo the work when parseListElement
        // is called immediately after.
        lastQueriedPosition = position;

        // Either we don'd have a node, or we have a node at the position being asked for.
        Debug.assert(!current || current.pos === position);
        return <IncrementalNode>current;
      },
    };

    // Finds the highest element in the tree we can find that starts at the provided position.
    // The element must be a direct child of some node list in the tree.  This way after we
    // return it, we can easily return its next sibling in the list.
    function findHighestListElementThatStartsAtPosition(position: number) {
      // Clear out any cached state about the last node we found.
      currentArray = undefined!;
      currentArrayIndex = InvalidPosition.Value;
      current = undefined!;

      // Recurse into the source file to find the highest node at this position.
      forEachChild(sourceFile, visitNode, visitArray);
      return;

      function visitNode(node: qt.Node) {
        if (position >= node.pos && position < node.end) {
          // Position was within this node.  Keep searching deeper to find the node.
          forEachChild(node, visitNode, visitArray);

          // don't proceed any further in the search.
          return true;
        }

        // position wasn't in this node, have to keep searching.
        return false;
      }

      function visitArray(array: qt.NodeArray<qt.Node>) {
        if (position >= array.pos && position < array.end) {
          // position was in this array.  Search through this array to see if we find a
          // viable element.
          for (let i = 0; i < array.length; i++) {
            const child = array[i];
            if (child) {
              if (child.pos === position) {
                // Found the right node.  We're done.
                currentArray = array;
                currentArrayIndex = i;
                current = child;
                return true;
              } else {
                if (child.pos < position && position < child.end) {
                  // Position in somewhere within this child.  Search in it and
                  // stop searching in this array.
                  forEachChild(child, visitNode, visitArray);
                  return true;
                }
              }
            }
          }
        }

        // position wasn't in this array, have to keep searching.
        return false;
      }
    }
  }

  const enum InvalidPosition {
    Value = -1,
  }
}

export function isDeclarationFileName(fileName: string): boolean {
  return fileExtensionIs(fileName, Extension.Dts);
}

export interface PragmaContext {
  languageVersion: qt.ScriptTarget;
  pragmas?: PragmaMap;
  checkJsDirective?: CheckJsDirective;
  referencedFiles: FileReference[];
  typeReferenceDirectives: FileReference[];
  libReferenceDirectives: FileReference[];
  amdDependencies: AmdDependency[];
  hasNoDefaultLib?: boolean;
  moduleName?: string;
}

export function processCommentPragmas(context: PragmaContext, sourceText: string): void {
  const pragmas: PragmaPseudoMapEntry[] = [];

  for (const range of getLeadingCommentRanges(sourceText, 0) || emptyArray) {
    const comment = sourceText.substring(range.pos, range.end);
    extractPragmas(pragmas, range, comment);
  }

  context.pragmas = createMap();
  for (const pragma of pragmas) {
    if (context.pragmas.has(pragma.name)) {
      const currentValue = context.pragmas.get(pragma.name);
      if (currentValue instanceof Array) {
        currentValue.push(pragma.args);
      } else {
        context.pragmas.set(pragma.name, [currentValue, pragma.args]);
      }
      continue;
    }
    context.pragmas.set(pragma.name, pragma.args);
  }
}

type PragmaDiagnosticReporter = (pos: number, length: number, message: qt.DiagnosticMessage) => void;

export function processPragmasIntoFields(context: PragmaContext, reportDiagnostic: PragmaDiagnosticReporter): void {
  context.checkJsDirective = undefined;
  context.referencedFiles = [];
  context.typeReferenceDirectives = [];
  context.libReferenceDirectives = [];
  context.amdDependencies = [];
  context.hasNoDefaultLib = false;
  context.pragmas.forEach((entryOrList, key) => {
    // TODO: GH#18217
    // TODO: The below should be strongly type-guarded and not need casts/explicit annotations, since entryOrList is related to
    // key and key is constrained to a union; but it's not (see GH#21483 for at least partial fix) :(
    switch (key) {
      case 'reference': {
        const referencedFiles = context.referencedFiles;
        const typeReferenceDirectives = context.typeReferenceDirectives;
        const libReferenceDirectives = context.libReferenceDirectives;
        forEach(toArray(entryOrList) as PragmaPseudoMap['reference'][], (arg) => {
          const { types, lib, path } = arg.arguments;
          if (arg.arguments['no-default-lib']) {
            context.hasNoDefaultLib = true;
          } else if (types) {
            typeReferenceDirectives.push({ pos: types.pos, end: types.end, fileName: types.value });
          } else if (lib) {
            libReferenceDirectives.push({ pos: lib.pos, end: lib.end, fileName: lib.value });
          } else if (path) {
            referencedFiles.push({ pos: path.pos, end: path.end, fileName: path.value });
          } else {
            reportDiagnostic(arg.range.pos, arg.range.end - arg.range.pos, Diagnostics.Invalid_reference_directive_syntax);
          }
        });
        break;
      }
      case 'amd-dependency': {
        context.amdDependencies = map(toArray(entryOrList) as PragmaPseudoMap['amd-dependency'][], (x) => ({ name: x.arguments.name, path: x.arguments.path }));
        break;
      }
      case 'amd-module': {
        if (entryOrList instanceof Array) {
          for (const entry of entryOrList) {
            if (context.moduleName) {
              // TODO: It's probably fine to issue this diagnostic on all instances of the pragma
              reportDiagnostic(entry.range.pos, entry.range.end - entry.range.pos, Diagnostics.An_AMD_module_cannot_have_multiple_name_assignments);
            }
            context.moduleName = (entry as PragmaPseudoMap['amd-module']).arguments.name;
          }
        } else {
          context.moduleName = (entryOrList as PragmaPseudoMap['amd-module']).arguments.name;
        }
        break;
      }
      case 'ts-nocheck':
      case 'ts-check': {
        // _last_ of either nocheck or check in a file is the "winner"
        forEach(toArray(entryOrList), (entry) => {
          if (!context.checkJsDirective || entry.range.pos > context.checkJsDirective.pos) {
            context.checkJsDirective = {
              enabled: key === 'ts-check',
              end: entry.range.end,
              pos: entry.range.pos,
            };
          }
        });
        break;
      }
      case 'jsx':
        return; // Accessed directly
      default:
        Debug.fail('Unhandled pragma kind'); // Can this be made into an assertNever in the future?
    }
  });
}

const namedArgRegExCache = qc.createMap<RegExp>();
function getNamedArgRegEx(name: string): RegExp {
  if (namedArgRegExCache.has(name)) {
    return namedArgRegExCache.get(name)!;
  }
  const result = new RegExp(`(\\s${name}\\s*=\\s*)('|")(.+?)\\2`, 'im');
  namedArgRegExCache.set(name, result);
  return result;
}

const tripleSlashXMLCommentStartRegEx = /^\/\/\/\s*<(\S+)\s.*?\/>/im;
const singleLinePragmaRegEx = /^\/\/\/?\s*@(\S+)\s*(.*)\s*$/im;
function extractPragmas(pragmas: PragmaPseudoMapEntry[], range: CommentRange, text: string) {
  const tripleSlash = range.kind === qt.SyntaxKind.SingleLineCommentTrivia && tripleSlashXMLCommentStartRegEx.exec(text);
  if (tripleSlash) {
    const name = tripleSlash[1].toLowerCase() as keyof PragmaPseudoMap; // Technically unsafe cast, but we do it so the below check to make it safe typechecks
    const pragma = commentPragmas[name];
    if (!pragma || !(pragma.kind! & PragmaKindFlags.TripleSlashXML)) {
      return;
    }
    if (pragma.args) {
      const argument: { [index: string]: string | { value: string; pos: number; end: number } } = {};
      for (const arg of pragma.args) {
        const matcher = getNamedArgRegEx(arg.name);
        const matchResult = matcher.exec(text);
        if (!matchResult && !arg.optional) {
          return; // Missing required argument, don't parse
        } else if (matchResult) {
          if (arg.captureSpan) {
            const startPos = range.pos + matchResult.index + matchResult[1].length + matchResult[2].length;
            argument[arg.name] = {
              value: matchResult[3],
              pos: startPos,
              end: startPos + matchResult[3].length,
            };
          } else {
            argument[arg.name] = matchResult[3];
          }
        }
      }
      pragmas.push({ name, args: { arguments: argument, range } } as PragmaPseudoMapEntry);
    } else {
      pragmas.push({ name, args: { arguments: {}, range } } as PragmaPseudoMapEntry);
    }
    return;
  }

  const singleLine = range.kind === qt.SyntaxKind.SingleLineCommentTrivia && singleLinePragmaRegEx.exec(text);
  if (singleLine) {
    return addPragmaForMatch(pragmas, range, PragmaKindFlags.SingleLine, singleLine);
  }

  if (range.kind === qt.SyntaxKind.MultiLineCommentTrivia) {
    const multiLinePragmaRegEx = /\s*@(\S+)\s*(.*)\s*$/gim; // Defined inline since it uses the "g" flag, which keeps a persistent index (for iterating)
    let multiLineMatch: RegExpExecArray | null;
    while ((multiLineMatch = multiLinePragmaRegEx.exec(text))) {
      addPragmaForMatch(pragmas, range, PragmaKindFlags.MultiLine, multiLineMatch);
    }
  }
}

function addPragmaForMatch(pragmas: PragmaPseudoMapEntry[], range: CommentRange, kind: PragmaKindFlags, match: RegExpExecArray) {
  if (!match) return;
  const name = match[1].toLowerCase() as keyof PragmaPseudoMap; // Technically unsafe cast, but we do it so they below check to make it safe typechecks
  const pragma = commentPragmas[name];
  if (!pragma || !(pragma.kind! & kind)) {
    return;
  }
  const args = match[2]; // Split on spaces and match up positionally with definition
  const argument = getNamedPragmaArguments(pragma, args);
  if (argument === 'fail') return; // Missing required argument, fail to parse it
  pragmas.push({ name, args: { arguments: argument, range } } as PragmaPseudoMapEntry);
  return;
}

function getNamedPragmaArguments(pragma: PragmaDefinition, text: string | undefined): { [index: string]: string } | 'fail' {
  if (!text) return {};
  if (!pragma.args) return {};
  const args = text.split(/\s+/);
  const argMap: { [index: string]: string } = {};
  for (let i = 0; i < pragma.args.length; i++) {
    const argument = pragma.args[i];
    if (!args[i] && !argument.optional) {
      return 'fail';
    }
    if (argument.captureSpan) {
      return Debug.fail('Capture spans not yet implemented for non-xml pragmas');
    }
    argMap[argument.name] = args[i];
  }
  return argMap;
}

export function tagNamesAreEquivalent(lhs: JsxTagNameExpression, rhs: JsxTagNameExpression): boolean {
  if (lhs.kind !== rhs.kind) {
    return false;
  }

  if (lhs.kind === qt.SyntaxKind.Identifier) {
    return lhs.escapedText === rhs.escapedText;
  }

  if (lhs.kind === qt.SyntaxKind.ThisKeyword) {
    return true;
  }

  // If we are at this statement then we must have PropertyAccessExpression and because tag name in Jsx element can only
  // take forms of JsxTagNameExpression which includes an identifier, "this" expression, or another propertyAccessExpression
  // it is safe to case the expression property as such. See parseJsxElementName for how we parse tag name in Jsx element
  return lhs.name.escapedText === rhs.name.escapedText && tagNamesAreEquivalent(lhs.expression, rhs.expression);
}
