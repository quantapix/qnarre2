import * as ts from 'typescript';
import { AST_NODE_TYPES, AST_TOKEN_TYPES, TSESTree } from './ts-estree';

const SyntaxKind = ts.SyntaxKind;

const ASSIGN_OPS: ts.AssignmentOperator[] = [
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

const LOGICAL_OPS: (ts.LogicalOperator | ts.SyntaxKind.QuestionQuestionToken)[] = [
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

export function isAssignmentOperator<T extends ts.SyntaxKind>(o: ts.Token<T>) {
  return (ASSIGN_OPS as ts.SyntaxKind[]).includes(o.kind);
}

export function isLogicalOperator<T extends ts.SyntaxKind>(o: ts.Token<T>) {
  return (LOGICAL_OPS as ts.SyntaxKind[]).includes(o.kind);
}

export function getTextForTokenKind<T extends ts.SyntaxKind>(
  k: T
): T extends keyof typeof TOKEN_TO_TEXT ? typeof TOKEN_TO_TEXT[T] : undefined {
  return k in TOKEN_TO_TEXT ? (TOKEN_TO_TEXT as any)[k] : undefined;
}

export function isESTreeClassMember(n: ts.Node) {
  return n.kind !== SyntaxKind.SemicolonClassElement;
}

export function hasModifier(k: ts.KeywordSyntaxKind, n: ts.Node) {
  return !!n.modifiers && !!n.modifiers.length && n.modifiers.some((m) => m.kind === k);
}

export function getLastModifier(n: ts.Node): ts.Modifier | undefined {
  return (
    (!!n.modifiers && !!n.modifiers.length && n.modifiers[n.modifiers.length - 1]) ||
    undefined
  );
}

export function isComma(n: ts.Node) {
  return n.kind === SyntaxKind.CommaToken;
}

export function isComment(n: ts.Node) {
  return (
    n.kind === SyntaxKind.SingleLineCommentTrivia ||
    n.kind === SyntaxKind.MultiLineCommentTrivia
  );
}

export function isJSDocComment(n: ts.Node): boolean {
  return n.kind === SyntaxKind.JSDocComment;
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
  n: ts.SourceFile | ts.Block | ts.ModuleBlock
): boolean {
  if (n.kind === ts.SyntaxKind.Block) {
    switch (n.parent.kind) {
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

export function getRange(n: ts.Node, ast: ts.SourceFile): [number, number] {
  return [n.getStart(ast), n.getEnd()];
}

export function isToken(n: ts.Node): boolean {
  return n.kind >= SyntaxKind.FirstToken && n.kind <= SyntaxKind.LastToken;
}

export function isJSXToken(n: ts.Node): boolean {
  return n.kind >= SyntaxKind.JsxElement && n.kind <= SyntaxKind.JsxAttribute;
}

export function getDeclarationKind(
  n: ts.VariableDeclarationList
): 'let' | 'const' | 'var' {
  if (n.flags & ts.NodeFlags.Let) return 'let';
  if (n.flags & ts.NodeFlags.Const) return 'const';
  return 'var';
}

export function getTSNodeAccessibility(
  n: ts.Node
): 'public' | 'protected' | 'private' | undefined {
  const modifiers = n.modifiers;
  if (!modifiers) return;
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
  return;
}

export function findNextToken(
  previousToken: ts.TextRange,
  parent: ts.Node,
  ast: ts.SourceFile
): ts.Node | undefined {
  return find(parent);
  function find(n: ts.Node): ts.Node | undefined {
    if (ts.isToken(n) && n.pos === previousToken.end) return n;
    return firstDefined(n.getChildren(ast), (child: ts.Node) => {
      const shouldDiveInChildNode =
        (child.pos <= previousToken.pos && child.end > previousToken.end) ||
        child.pos === previousToken.end;
      return shouldDiveInChildNode && nodeHasTokens(child, ast) ? find(child) : undefined;
    });
  }
}

export function findFirstMatchingAncestor(
  n: ts.Node,
  predicate: (n: ts.Node) => boolean
): ts.Node | undefined {
  while (n) {
    if (predicate(n)) return n;
    n = n.parent;
  }
  return;
}

export function hasJSXAncestor(n: ts.Node): boolean {
  return !!findFirstMatchingAncestor(n, isJSXToken);
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

export function isComputedProperty(n: ts.Node): boolean {
  return n.kind === SyntaxKind.ComputedPropertyName;
}

export function isOptional(n: { questionToken?: ts.QuestionToken }): boolean {
  return n.questionToken ? n.questionToken.kind === SyntaxKind.QuestionToken : false;
}

export function isOptionalChain(
  n: TSESTree.Node
): n is TSESTree.OptionalCallExpression | TSESTree.OptionalMemberExpression {
  return (
    n.type === AST_NODE_TYPES.OptionalCallExpression ||
    n.type == AST_NODE_TYPES.OptionalMemberExpression
  );
}

export function isChildOptionalChain(
  n: ts.PropertyAccessExpression | ts.ElementAccessExpression | ts.CallExpression,
  o: TSESTree.LeftHandSideExpression
): boolean {
  if (isOptionalChain(o) && n.expression.kind !== ts.SyntaxKind.ParenthesizedExpression) {
    return true;
  }
  if (o.type !== AST_NODE_TYPES.TSNonNullExpression || !isOptionalChain(o.expression)) {
    return false;
  }
  if (
    n.expression.kind === ts.SyntaxKind.NonNullExpression &&
    (n.expression as ts.NonNullExpression).expression.kind !==
      ts.SyntaxKind.ParenthesizedExpression
  ) {
    return true;
  }
  return false;
}

export function getTokenType(
  t: ts.Identifier | ts.Token<ts.SyntaxKind>
): Exclude<AST_TOKEN_TYPES, AST_TOKEN_TYPES.Line | AST_TOKEN_TYPES.Block> {
  if ('originalKeywordKind' in t && t.originalKeywordKind) {
    if (t.originalKeywordKind === SyntaxKind.NullKeyword) return AST_TOKEN_TYPES.Null;
    else if (
      t.originalKeywordKind >= SyntaxKind.FirstFutureReservedWord &&
      t.originalKeywordKind <= SyntaxKind.LastKeyword
    ) {
      return AST_TOKEN_TYPES.Identifier;
    }
    return AST_TOKEN_TYPES.Keyword;
  }
  if (t.kind >= SyntaxKind.FirstKeyword && t.kind <= SyntaxKind.LastFutureReservedWord) {
    if (t.kind === SyntaxKind.FalseKeyword || t.kind === SyntaxKind.TrueKeyword) {
      return AST_TOKEN_TYPES.Boolean;
    }
    return AST_TOKEN_TYPES.Keyword;
  }
  if (t.kind >= SyntaxKind.FirstPunctuation && t.kind <= SyntaxKind.LastBinaryOperator) {
    return AST_TOKEN_TYPES.Punctuator;
  }
  if (
    t.kind >= SyntaxKind.NoSubstitutionTemplateLiteral &&
    t.kind <= SyntaxKind.TemplateTail
  ) {
    return AST_TOKEN_TYPES.Template;
  }
  switch (t.kind) {
    case SyntaxKind.NumericLiteral:
      return AST_TOKEN_TYPES.Numeric;
    case SyntaxKind.JsxText:
      return AST_TOKEN_TYPES.JSXText;
    case SyntaxKind.StringLiteral:
      if (
        t.parent &&
        (t.parent.kind === SyntaxKind.JsxAttribute ||
          t.parent.kind === SyntaxKind.JsxElement)
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
  if (t.parent && t.kind === SyntaxKind.Identifier) {
    if (isJSXToken(t.parent)) return AST_TOKEN_TYPES.JSXIdentifier;
    if (t.parent.kind === SyntaxKind.PropertyAccessExpression && hasJSXAncestor(t)) {
      return AST_TOKEN_TYPES.JSXIdentifier;
    }
  }
  return AST_TOKEN_TYPES.Identifier;
}

export function convertToken(n: ts.Node, ast: ts.SourceFile): TSESTree.Token {
  const start = n.kind === SyntaxKind.JsxText ? n.getFullStart() : n.getStart(ast);
  const end = n.getEnd();
  const value = ast.text.slice(start, end);
  const tokenType = getTokenType(n);
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
  function walk(n: ts.Node): void {
    if (isComment(n) || isJSDocComment(n)) return;
    if (isToken(n) && n.kind !== SyntaxKind.EndOfFileToken) {
      const converted = convertToken(n, ast);
      if (converted) result.push(converted);
    } else n.getChildren(ast).forEach(walk);
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
  return n.kind === SyntaxKind.EndOfFileToken
    ? !!(n as any).jsDoc
    : n.getWidth(ast) !== 0;
}

export function firstDefined<T, U>(a?: readonly T[], cb?: (e: T, i: number) => U) {
  if (a) {
    for (let i = 0; i < a.length; i++) {
      const r = cb?.(a[i], i);
      if (r !== undefined) return r;
    }
  }
  return;
}
