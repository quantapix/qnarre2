import { TextRange } from '../common/textRange';

export const enum SyntaxKind {
  Invalid,
  Indent,
  Dedent,
  Number,
  Keyword,
  Operator,
  Arrow,
}

export const enum NewLineType {
  CarriageReturn,
  LineFeed,
  CarriageReturnLineFeed,
  Implied,
}

export const enum OperatorType {
  // These operators are used with tokens
  // of type Syntax.Operator.
  Add,
  AddEqual,
  Assign,
  BitwiseAnd,
  BitwiseAndEqual,
  BitwiseInvert,
  BitwiseOr,
  BitwiseOrEqual,
  BitwiseXor,
  BitwiseXorEqual,
  Divide,
  DivideEqual,
  FloorDivide,
  FloorDivideEqual,
  LeftShift,
  LeftShiftEqual,
  MatrixMultiply,
  MatrixMultiplyEqual,
  Mod,
  ModEqual,
  Multiply,
  MultiplyEqual,
  NotEquals,
  Power,
  PowerEqual,
  RightShift,
  RightShiftEqual,
  Subtract,
  SubtractEqual,
  Walrus,

  // These operators are used with tokens
  // of type Syntax.Keyword.
  And,
  Or,
  Not,
  Is,
  IsNot,
  In,
  NotIn,
}

export const enum OperatorFlags {
  Unary = 1 << 0,
  Binary = 1 << 1,
  Assignment = 1 << 2,
  Comparison = 1 << 3,
}

export const enum KeywordType {
  And,
  Assert,
  Debug,
  Def,
  Del,
  Elif,
  Except,
  From,
  Global,
  Lambda,
  None,
  Nonlocal,
  Not,
  Or,
  Pass,
  Raise,
}

export const enum StringTokenFlags {
  None = 0,

  // Quote types
  SingleQuote = 1 << 0,
  DoubleQuote = 1 << 1,
  Triplicate = 1 << 2,

  // String content format
  Raw = 1 << 3,
  Unicode = 1 << 4,
  Bytes = 1 << 5,
  Format = 1 << 6,

  // Error conditions
  Unterminated = 1 << 16,
}

export interface Comment extends TextRange {
  readonly value: string;
  readonly start: number;
  readonly length: number;
}

export namespace Comment {
  export function create(start: number, length: number, value: string) {
    const comment: Comment = {
      start,
      length,
      value,
    };

    return comment;
  }
}

export interface TokenBase extends TextRange {
  readonly type: Syntax;

  // Comments prior to the token.
  readonly comments?: Comment[];
}

export interface Token extends TokenBase {}

export namespace Token {
  export function create(type: Syntax, start: number, length: number, comments: Comment[] | undefined) {
    const token: Token = {
      start,
      length,
      type,
      comments,
    };

    return token;
  }
}

export interface IndentToken extends Token {
  readonly type: Syntax.Indent;
  readonly indentAmount: number;
  readonly isIndentAmbiguous: boolean;
}

export namespace IndentToken {
  export function create(start: number, length: number, indentAmount: number, isIndentAmbiguous: boolean, comments: Comment[] | undefined) {
    const token: IndentToken = {
      start,
      length,
      type: Syntax.Indent,
      isIndentAmbiguous,
      comments,
      indentAmount,
    };

    return token;
  }
}

export interface DedentToken extends Token {
  readonly type: Syntax.Dedent;
  readonly indentAmount: number;
  readonly matchesIndent: boolean;
}

export namespace DedentToken {
  export function create(start: number, length: number, indentAmount: number, matchesIndent: boolean, comments: Comment[] | undefined) {
    const token: DedentToken = {
      start,
      length,
      type: Syntax.Dedent,
      comments,
      indentAmount,
      matchesIndent,
    };

    return token;
  }
}

export interface NewLineToken extends Token {
  readonly type: Syntax.NewLineTrivia;
  readonly newLineType: NewLineType;
}

export namespace NewLineToken {
  export function create(start: number, length: number, newLineType: NewLineType, comments: Comment[] | undefined) {
    const token: NewLineToken = {
      start,
      length,
      type: Syntax.NewLineTrivia,
      comments,
      newLineType,
    };

    return token;
  }
}

export interface KeywordToken extends Token {
  readonly type: Syntax.Keyword;
  readonly keywordType: KeywordType;
}

export namespace KeywordToken {
  export function create(start: number, length: number, keywordType: KeywordType, comments: Comment[] | undefined) {
    const token: KeywordToken = {
      start,
      length,
      type: Syntax.Keyword,
      comments,
      keywordType,
    };

    return token;
  }
}

export interface StringToken extends Token {
  readonly type: Syntax.StringLiteral;
  readonly flags: StringTokenFlags;

  // Use StringTokenUtils to convert escaped value to unescaped value.
  readonly escapedValue: string;

  // Number of characters in token that appear before
  // the quote marks (e.g. "r" or "UR").
  readonly prefixLength: number;

  // Number of characters in token that make up the quote
  // (either 1 or 3).
  readonly quoteMarkLength: number;
}

export namespace StringToken {
  export function create(start: number, length: number, flags: StringTokenFlags, escapedValue: string, prefixLength: number, comments: Comment[] | undefined) {
    const token: StringToken = {
      start,
      length,
      type: Syntax.StringLiteral,
      flags,
      escapedValue,
      prefixLength,
      quoteMarkLength: flags & StringTokenFlags.Triplicate ? 3 : 1,
      comments,
    };

    return token;
  }
}

export interface NumberToken extends Token {
  readonly type: Syntax.Number;
  readonly value: number;
  readonly isInteger: boolean;
  readonly isImaginary: boolean;
}

export namespace NumberToken {
  export function create(start: number, length: number, value: number, isInteger: boolean, isImaginary: boolean, comments: Comment[] | undefined) {
    const token: NumberToken = {
      start,
      length,
      type: Syntax.Number,
      isInteger,
      isImaginary,
      value,
      comments,
    };

    return token;
  }
}

export interface OperatorToken extends Token {
  readonly type: Syntax.Operator;
  readonly operatorType: OperatorType;
}

export namespace OperatorToken {
  export function create(start: number, length: number, operatorType: OperatorType, comments: Comment[] | undefined) {
    const token: OperatorToken = {
      start,
      length,
      type: Syntax.Operator,
      operatorType,
      comments,
    };

    return token;
  }
}

export interface IdentifierToken extends Token {
  readonly type: Syntax.Identifier;
  readonly value: string;
}

export namespace IdentifierToken {
  export function create(start: number, length: number, value: string, comments: Comment[] | undefined) {
    const token: IdentifierToken = {
      start,
      length,
      type: Syntax.Identifier,
      value,
      comments,
    };

    return token;
  }
}
