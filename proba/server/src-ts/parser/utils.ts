import * as ts from 'typescript';
import { AST_NODE_TYPES, AST_TOKEN_TYPES, TSESTree } from './ts-estree';

const SyntaxKind = ts.SyntaxKind;

const ASSIGNMENT_OPERATORS: ts.AssignmentOperator[] = [
  SyntaxKind.EqualsToken,
  SyntaxKind.PlusEqualsToken,
  SyntaxKind.MinusEqualsToken,
  SyntaxKind.AsteriskEqualsToken,
  SyntaxKind.AsteriskAsteriskEqualsToken,
  SyntaxKind.SlashEqualsToken,
  SyntaxKind.PercentEqualsToken,
  SyntaxKind.LessThanLessThanEqualsToken,
  SyntaxKind.GreaterThanGreaterThanEqualsToken,
  SyntaxKind.GreaterThanGreaterThanGreaterThanEqualsToken,
  SyntaxKind.AmpersandEqualsToken,
  SyntaxKind.BarEqualsToken,
  SyntaxKind.CaretEqualsToken,
];

const LOGICAL_OPERATORS: (ts.LogicalOperator | ts.SyntaxKind.QuestionQuestionToken)[] = [
  SyntaxKind.BarBarToken,
  SyntaxKind.AmpersandAmpersandToken,
  SyntaxKind.QuestionQuestionToken,
];

const TOKEN_TO_TEXT = {
  [SyntaxKind.OpenBraceToken]: '{',
  [SyntaxKind.CloseBraceToken]: '}',
  [SyntaxKind.OpenParenToken]: '(',
  [SyntaxKind.CloseParenToken]: ')',
  [SyntaxKind.OpenBracketToken]: '[',
  [SyntaxKind.CloseBracketToken]: ']',
  [SyntaxKind.DotToken]: '.',
  [SyntaxKind.DotDotDotToken]: '...',
  [SyntaxKind.SemicolonToken]: ';',
  [SyntaxKind.CommaToken]: ',',
  [SyntaxKind.LessThanToken]: '<',
  [SyntaxKind.GreaterThanToken]: '>',
  [SyntaxKind.LessThanEqualsToken]: '<=',
  [SyntaxKind.GreaterThanEqualsToken]: '>=',
  [SyntaxKind.EqualsEqualsToken]: '==',
  [SyntaxKind.ExclamationEqualsToken]: '!=',
  [SyntaxKind.EqualsEqualsEqualsToken]: '===',
  [SyntaxKind.InstanceOfKeyword]: 'instanceof',
  [SyntaxKind.ExclamationEqualsEqualsToken]: '!==',
  [SyntaxKind.EqualsGreaterThanToken]: '=>',
  [SyntaxKind.PlusToken]: '+',
  [SyntaxKind.MinusToken]: '-',
  [SyntaxKind.AsteriskToken]: '*',
  [SyntaxKind.AsteriskAsteriskToken]: '**',
  [SyntaxKind.SlashToken]: '/',
  [SyntaxKind.PercentToken]: '%',
  [SyntaxKind.PlusPlusToken]: '++',
  [SyntaxKind.MinusMinusToken]: '--',
  [SyntaxKind.LessThanLessThanToken]: '<<',
  [SyntaxKind.LessThanSlashToken]: '</',
  [SyntaxKind.GreaterThanGreaterThanToken]: '>>',
  [SyntaxKind.GreaterThanGreaterThanGreaterThanToken]: '>>>',
  [SyntaxKind.AmpersandToken]: '&',
  [SyntaxKind.BarToken]: '|',
  [SyntaxKind.CaretToken]: '^',
  [SyntaxKind.ExclamationToken]: '!',
  [SyntaxKind.TildeToken]: '~',
  [SyntaxKind.AmpersandAmpersandToken]: '&&',
  [SyntaxKind.BarBarToken]: '||',
  [SyntaxKind.QuestionToken]: '?',
  [SyntaxKind.ColonToken]: ':',
  [SyntaxKind.EqualsToken]: '=',
  [SyntaxKind.PlusEqualsToken]: '+=',
  [SyntaxKind.MinusEqualsToken]: '-=',
  [SyntaxKind.AsteriskEqualsToken]: '*=',
  [SyntaxKind.AsteriskAsteriskEqualsToken]: '**=',
  [SyntaxKind.SlashEqualsToken]: '/=',
  [SyntaxKind.PercentEqualsToken]: '%=',
  [SyntaxKind.LessThanLessThanEqualsToken]: '<<=',
  [SyntaxKind.GreaterThanGreaterThanEqualsToken]: '>>=',
  [SyntaxKind.GreaterThanGreaterThanGreaterThanEqualsToken]: '>>>=',
  [SyntaxKind.AmpersandEqualsToken]: '&=',
  [SyntaxKind.BarEqualsToken]: '|=',
  [SyntaxKind.CaretEqualsToken]: '^=',
  [SyntaxKind.AtToken]: '@',
  [SyntaxKind.InKeyword]: 'in',
  [SyntaxKind.UniqueKeyword]: 'unique',
  [SyntaxKind.KeyOfKeyword]: 'keyof',
  [SyntaxKind.NewKeyword]: 'new',
  [SyntaxKind.ImportKeyword]: 'import',
  [SyntaxKind.ReadonlyKeyword]: 'readonly',
  [SyntaxKind.QuestionQuestionToken]: '??',
  [SyntaxKind.QuestionDotToken]: '?.',
} as const;

export function isAssignmentOperator<T extends ts.SyntaxKind>(
  operator: ts.Token<T>
): boolean {
  return (ASSIGNMENT_OPERATORS as ts.SyntaxKind[]).includes(operator.kind);
}

export function isLogicalOperator<T extends ts.SyntaxKind>(
  operator: ts.Token<T>
): boolean {
  return (LOGICAL_OPERATORS as ts.SyntaxKind[]).includes(operator.kind);
}

export function getTextForTokenKind<T extends ts.SyntaxKind>(
  kind: T
): T extends keyof typeof TOKEN_TO_TEXT ? typeof TOKEN_TO_TEXT[T] : undefined {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return kind in TOKEN_TO_TEXT ? (TOKEN_TO_TEXT as any)[kind] : undefined;
}

export function isESTreeClassMember(node: ts.Node): boolean {
  return node.kind !== SyntaxKind.SemicolonClassElement;
}

export function hasModifier(modifierKind: ts.KeywordSyntaxKind, node: ts.Node): boolean {
  return (
    !!node.modifiers &&
    !!node.modifiers.length &&
    node.modifiers.some((modifier) => modifier.kind === modifierKind)
  );
}

export function getLastModifier(node: ts.Node): ts.Modifier | null {
  return (
    (!!node.modifiers &&
      !!node.modifiers.length &&
      node.modifiers[node.modifiers.length - 1]) ||
    null
  );
}

export function isComma(token: ts.Node): boolean {
  return token.kind === SyntaxKind.CommaToken;
}

export function isComment(node: ts.Node): boolean {
  return (
    node.kind === SyntaxKind.SingleLineCommentTrivia ||
    node.kind === SyntaxKind.MultiLineCommentTrivia
  );
}

export function isJSDocComment(node: ts.Node): boolean {
  return node.kind === SyntaxKind.JSDocComment;
}

export function getBinaryExpressionType<T extends ts.SyntaxKind>(
  operator: ts.Token<T>
):
  | AST_NODE_TYPES.AssignmentExpression
  | AST_NODE_TYPES.LogicalExpression
  | AST_NODE_TYPES.BinaryExpression {
  if (isAssignmentOperator(operator)) {
    return AST_NODE_TYPES.AssignmentExpression;
  } else if (isLogicalOperator(operator)) {
    return AST_NODE_TYPES.LogicalExpression;
  }
  return AST_NODE_TYPES.BinaryExpression;
}

export function getLineAndCharacterFor(
  pos: number,
  ast: ts.SourceFile
): TSESTree.LineAndColumnData {
  const loc = ast.getLineAndCharacterOfPosition(pos);
  return {
    line: loc.line + 1,
    column: loc.character,
  };
}

export function getLocFor(
  start: number,
  end: number,
  ast: ts.SourceFile
): TSESTree.SourceLocation {
  return {
    start: getLineAndCharacterFor(start, ast),
    end: getLineAndCharacterFor(end, ast),
  };
}

export function canContainDirective(
  node: ts.SourceFile | ts.Block | ts.ModuleBlock
): boolean {
  if (node.kind === ts.SyntaxKind.Block) {
    switch (node.parent.kind) {
      case ts.SyntaxKind.Constructor:
      case ts.SyntaxKind.GetAccessor:
      case ts.SyntaxKind.SetAccessor:
      case ts.SyntaxKind.ArrowFunction:
      case ts.SyntaxKind.FunctionExpression:
      case ts.SyntaxKind.FunctionDeclaration:
      case ts.SyntaxKind.MethodDeclaration:
        return true;
      default:
        return false;
    }
  }
  return true;
}

export function getRange(node: ts.Node, ast: ts.SourceFile): [number, number] {
  return [node.getStart(ast), node.getEnd()];
}

export function isToken(node: ts.Node): boolean {
  return node.kind >= SyntaxKind.FirstToken && node.kind <= SyntaxKind.LastToken;
}

export function isJSXToken(node: ts.Node): boolean {
  return node.kind >= SyntaxKind.JsxElement && node.kind <= SyntaxKind.JsxAttribute;
}

export function getDeclarationKind(
  node: ts.VariableDeclarationList
): 'let' | 'const' | 'var' {
  if (node.flags & ts.NodeFlags.Let) {
    return 'let';
  }
  if (node.flags & ts.NodeFlags.Const) {
    return 'const';
  }
  return 'var';
}

export function getTSNodeAccessibility(
  node: ts.Node
): 'public' | 'protected' | 'private' | null {
  const modifiers = node.modifiers;
  if (!modifiers) {
    return null;
  }
  for (let i = 0; i < modifiers.length; i++) {
    const modifier = modifiers[i];
    switch (modifier.kind) {
      case SyntaxKind.PublicKeyword:
        return 'public';
      case SyntaxKind.ProtectedKeyword:
        return 'protected';
      case SyntaxKind.PrivateKeyword:
        return 'private';
      default:
        break;
    }
  }
  return null;
}

export function findNextToken(
  previousToken: ts.TextRange,
  parent: ts.Node,
  ast: ts.SourceFile
): ts.Node | undefined {
  return find(parent);

  function find(n: ts.Node): ts.Node | undefined {
    if (ts.isToken(n) && n.pos === previousToken.end) {
      // this is token that starts at the end of previous token - return it
      return n;
    }
    return firstDefined(n.getChildren(ast), (child: ts.Node) => {
      const shouldDiveInChildNode =
        // previous token is enclosed somewhere in the child
        (child.pos <= previousToken.pos && child.end > previousToken.end) ||
        // previous token ends exactly at the beginning of child
        child.pos === previousToken.end;
      return shouldDiveInChildNode && nodeHasTokens(child, ast) ? find(child) : undefined;
    });
  }
}

export function findFirstMatchingAncestor(
  node: ts.Node,
  predicate: (node: ts.Node) => boolean
): ts.Node | undefined {
  while (node) {
    if (predicate(node)) {
      return node;
    }
    node = node.parent;
  }
  return undefined;
}

export function hasJSXAncestor(node: ts.Node): boolean {
  return !!findFirstMatchingAncestor(node, isJSXToken);
}

const unescapes = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
};

const reEsc = /&(?:amp|lt|gt|quot|#(0+)?39);/g;
const reHasEsc = RegExp(reEsc.source);

function unescape(s: string) {
  return s && reHasEsc.test(s) ? s.replace(reEsc, (e) => unescapes[e] || "'") : s || '';
}
export function unescapeStringLiteralText(text: string): string {
  return unescape(text);
}

export function isComputedProperty(node: ts.Node): boolean {
  return node.kind === SyntaxKind.ComputedPropertyName;
}

export function isOptional(node: { questionToken?: ts.QuestionToken }): boolean {
  return node.questionToken
    ? node.questionToken.kind === SyntaxKind.QuestionToken
    : false;
}

export function isOptionalChain(
  node: TSESTree.Node
): node is TSESTree.OptionalCallExpression | TSESTree.OptionalMemberExpression {
  return (
    node.type === AST_NODE_TYPES.OptionalCallExpression ||
    node.type == AST_NODE_TYPES.OptionalMemberExpression
  );
}

export function isChildOptionalChain(
  node: ts.PropertyAccessExpression | ts.ElementAccessExpression | ts.CallExpression,
  object: TSESTree.LeftHandSideExpression
): boolean {
  if (
    isOptionalChain(object) &&
    node.expression.kind !== ts.SyntaxKind.ParenthesizedExpression
  ) {
    return true;
  }
  if (
    object.type !== AST_NODE_TYPES.TSNonNullExpression ||
    !isOptionalChain(object.expression)
  ) {
    return false;
  }
  if (
    node.expression.kind === ts.SyntaxKind.NonNullExpression &&
    (node.expression as ts.NonNullExpression).expression.kind !==
      ts.SyntaxKind.ParenthesizedExpression
  ) {
    return true;
  }
  return false;
}

export function getTokenType(
  token: ts.Identifier | ts.Token<ts.SyntaxKind>
): Exclude<AST_TOKEN_TYPES, AST_TOKEN_TYPES.Line | AST_TOKEN_TYPES.Block> {
  if ('originalKeywordKind' in token && token.originalKeywordKind) {
    if (token.originalKeywordKind === SyntaxKind.NullKeyword) {
      return AST_TOKEN_TYPES.Null;
    } else if (
      token.originalKeywordKind >= SyntaxKind.FirstFutureReservedWord &&
      token.originalKeywordKind <= SyntaxKind.LastKeyword
    ) {
      return AST_TOKEN_TYPES.Identifier;
    }
    return AST_TOKEN_TYPES.Keyword;
  }

  if (
    token.kind >= SyntaxKind.FirstKeyword &&
    token.kind <= SyntaxKind.LastFutureReservedWord
  ) {
    if (token.kind === SyntaxKind.FalseKeyword || token.kind === SyntaxKind.TrueKeyword) {
      return AST_TOKEN_TYPES.Boolean;
    }

    return AST_TOKEN_TYPES.Keyword;
  }

  if (
    token.kind >= SyntaxKind.FirstPunctuation &&
    token.kind <= SyntaxKind.LastBinaryOperator
  ) {
    return AST_TOKEN_TYPES.Punctuator;
  }

  if (
    token.kind >= SyntaxKind.NoSubstitutionTemplateLiteral &&
    token.kind <= SyntaxKind.TemplateTail
  ) {
    return AST_TOKEN_TYPES.Template;
  }

  switch (token.kind) {
    case SyntaxKind.NumericLiteral:
      return AST_TOKEN_TYPES.Numeric;

    case SyntaxKind.JsxText:
      return AST_TOKEN_TYPES.JSXText;

    case SyntaxKind.StringLiteral:
      // A TypeScript-StringLiteral token with a TypeScript-JsxAttribute or TypeScript-JsxElement parent,
      // must actually be an ESTree-JSXText token
      if (
        token.parent &&
        (token.parent.kind === SyntaxKind.JsxAttribute ||
          token.parent.kind === SyntaxKind.JsxElement)
      ) {
        return AST_TOKEN_TYPES.JSXText;
      }

      return AST_TOKEN_TYPES.String;

    case SyntaxKind.RegularExpressionLiteral:
      return AST_TOKEN_TYPES.RegularExpression;

    case SyntaxKind.Identifier:
    case SyntaxKind.ConstructorKeyword:
    case SyntaxKind.GetKeyword:
    case SyntaxKind.SetKeyword:

    // falls through
    default:
  }

  // Some JSX tokens have to be determined based on their parent
  if (token.parent && token.kind === SyntaxKind.Identifier) {
    if (isJSXToken(token.parent)) {
      return AST_TOKEN_TYPES.JSXIdentifier;
    }

    if (
      token.parent.kind === SyntaxKind.PropertyAccessExpression &&
      hasJSXAncestor(token)
    ) {
      return AST_TOKEN_TYPES.JSXIdentifier;
    }
  }

  return AST_TOKEN_TYPES.Identifier;
}

export function convertToken(token: ts.Node, ast: ts.SourceFile): TSESTree.Token {
  const start =
    token.kind === SyntaxKind.JsxText ? token.getFullStart() : token.getStart(ast);
  const end = token.getEnd();
  const value = ast.text.slice(start, end);
  const tokenType = getTokenType(token);

  if (tokenType === AST_TOKEN_TYPES.RegularExpression) {
    return {
      type: tokenType,
      value,
      range: [start, end],
      loc: getLocFor(start, end, ast),
      regex: {
        pattern: value.slice(1, value.lastIndexOf('/')),
        flags: value.slice(value.lastIndexOf('/') + 1),
      },
    };
  } else {
    return {
      type: tokenType,
      value,
      range: [start, end],
      loc: getLocFor(start, end, ast),
    };
  }
}

export function convertTokens(ast: ts.SourceFile): TSESTree.Token[] {
  const result: TSESTree.Token[] = [];
  /**
   * @param node the ts.Node
   */
  function walk(node: ts.Node): void {
    // TypeScript generates tokens for types in JSDoc blocks. Comment tokens
    // and their children should not be walked or added to the resulting tokens list.
    if (isComment(node) || isJSDocComment(node)) {
      return;
    }

    if (isToken(node) && node.kind !== SyntaxKind.EndOfFileToken) {
      const converted = convertToken(node, ast);

      if (converted) {
        result.push(converted);
      }
    } else {
      node.getChildren(ast).forEach(walk);
    }
  }
  walk(ast);
  return result;
}

export interface TSError {
  index: number;
  lineNumber: number;
  column: number;
  message: string;
}

export function createError(ast: ts.SourceFile, start: number, message: string): TSError {
  const loc = ast.getLineAndCharacterOfPosition(start);
  return {
    index: start,
    lineNumber: loc.line + 1,
    column: loc.character,
    message,
  };
}

export function nodeHasTokens(n: ts.Node, ast: ts.SourceFile): boolean {
  // If we have a token or node that has a non-zero width, it must have tokens.
  // Note: getWidth() does not take trivia into account.
  return n.kind === SyntaxKind.EndOfFileToken
    ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
      !!(n as any).jsDoc
    : n.getWidth(ast) !== 0;
}

export function firstDefined<T, U>(
  array: readonly T[] | undefined,
  callback: (element: T, index: number) => U | undefined
): U | undefined {
  if (array === undefined) {
    return undefined;
  }

  for (let i = 0; i < array.length; i++) {
    const result = callback(array[i], i);
    if (result !== undefined) {
      return result;
    }
  }
  return undefined;
}
