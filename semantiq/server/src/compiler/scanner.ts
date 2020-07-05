import * as qb from './base';
import * as qt from './types';
import { diags as qd } from './diags';
import * as syntax from './syntax';
import { Codes, JSDocSyntax, JsxTokenSyntax, KeywordSyntax, LanguageVariant, Syntax } from './syntax';
export interface Scanner {
  setLanguageVariant(l: LanguageVariant): void;
  setOnError(cb?: qt.ErrorCallback): void;
  getText(): string;
  setText(t?: string, start?: number, length?: number): void;
  getTextPos(): number;
  setTextPos(p: number): void;
  getStartPos(): number;
  getToken(): Syntax;
  getTokenPos(): number;
  getTokenText(): string;
  getTokenValue(): string;
  getTokenFlags(): qt.TokenFlags;
  getDirectives(): qt.CommentDirective[] | undefined;
  clearDirectives(): void;
  hasUnicodeEscape(): boolean;
  hasExtendedEscape(): boolean;
  hasPrecedingLineBreak(): boolean;
  isIdentifier(): boolean;
  isReservedWord(): boolean;
  isUnterminated(): boolean;
  scan(): Syntax;
  scanJsDocToken(): JSDocSyntax;
  scanJsxAttributeValue(): Syntax;
  scanJsxIdentifier(): Syntax;
  scanJsxToken(): JsxTokenSyntax;
  scanRange<T>(start: number, length: number, cb: () => T): T;
  reScanGreaterToken(): Syntax;
  reScanJsxAttributeValue(): Syntax;
  reScanJsxToken(): JsxTokenSyntax;
  reScanLessToken(): Syntax;
  reScanQuestionToken(): Syntax;
  reScanSlashToken(): Syntax;
  reScanHeadOrNoSubstTemplate(): Syntax;
  reScanTemplateToken(tagged: boolean): Syntax;
  tryScan<T>(cb: () => T): T;
  setInJSDocType(inType: boolean): void;
  lookAhead<T>(cb: () => T): T;
}
const directiveRegExSingleLine = /^\s*\/\/\/?\s*@(ts-expect-error|ts-ignore)/;
const directiveRegExMultiLine = /^\s*(?:\/|\*)*\s*@(ts-expect-error|ts-ignore)/;
export function qs_create(skipTrivia = false, lang = LanguageVariant.TS, onError?: qt.ErrorCallback): Scanner {
  let pos: number; // Current position (end position of text of current token)
  let end: number; // end of text
  let text: string;
  let token: Syntax;
  let tokPos: number; // Start position of text of current token
  let startPos: number; // Start position of whitespace before current token
  let tokValue: string;
  let tokFlags: qt.TokenFlags;
  let directives: qt.CommentDirective[] | undefined;
  let inJSDocType = 0;
  const scanner: Scanner = {
    setLanguageVariant: (l) => {
      lang = l;
    },
    setOnError: (cb) => {
      onError = cb;
    },
    setInJSDocType: (t) => {
      inJSDocType += t ? 1 : -1;
    },
    getText: () => text,
    setText,
    getTextPos: () => pos,
    setTextPos,
    getStartPos: () => startPos,
    getToken: () => token,
    getTokenPos: () => tokPos,
    getTokenText: () => text.substring(tokPos, pos),
    getTokenValue: () => tokValue,
    getTokenFlags: () => tokFlags,
    getDirectives: () => directives,
    clearDirectives: () => {
      directives = undefined;
    },
    hasUnicodeEscape: () => (tokFlags & qt.TokenFlags.UnicodeEscape) !== 0,
    hasExtendedEscape: () => (tokFlags & qt.TokenFlags.ExtendedEscape) !== 0,
    hasPrecedingLineBreak: () => (tokFlags & qt.TokenFlags.PrecedingLineBreak) !== 0,
    isIdentifier: () => token === Syntax.Identifier || token > Syntax.LastReservedWord,
    isReservedWord: () => token >= Syntax.FirstReservedWord && token <= Syntax.LastReservedWord,
    isUnterminated: () => (tokFlags & qt.TokenFlags.Unterminated) !== 0,
    scan,
    scanRange,
    tryScan: <T>(cb: () => T): T => {
      return speculate(cb, false);
    },
    lookAhead: <T>(cb: () => T): T => {
      return speculate(cb, true);
    },
    scanJsDocToken,
    scanJsxAttributeValue,
    scanJsxIdentifier,
    scanJsxToken,
    reScanGreaterToken,
    reScanJsxAttributeValue,
    reScanJsxToken,
    reScanLessToken,
    reScanQuestionToken,
    reScanSlashToken,
    reScanHeadOrNoSubstTemplate,
    reScanTemplateToken,
  };
  if (Debug.isDebugging) {
    Object.defineProperty(scanner, '__debugShowCurrentPositionInText', {
      get: () => {
        const t = scanner.getText();
        return t.slice(0, scanner.getStartPos()) + '║' + t.slice(scanner.getStartPos());
      },
    });
  }
  return scanner;
  function setText(t?: string, start?: number, length?: number) {
    text = t ?? '';
    end = length === undefined ? text.length : start! + length;
    setTextPos(start ?? 0);
  }
  function setTextPos(p: number) {
    qb.assert(p >= 0);
    pos = p;
    startPos = p;
    tokPos = p;
    token = Syntax.Unknown;
    tokValue = undefined!;
    tokFlags = qt.TokenFlags.None;
  }
  function scan(): Syntax {
    startPos = pos;
    tokFlags = qt.TokenFlags.None;
    let asterisk = false;
    while (true) {
      tokPos = pos;
      if (pos >= end) return (token = Syntax.EndOfFileToken);
      let c = text.codePointAt(pos)!;
      if (c === Codes.hash && pos === 0 && syntax.is.shebangTrivia(text, pos)) {
        pos = syntax.shebangTrivia(text, pos);
        if (skipTrivia) continue;
        else return (token = Syntax.ShebangTrivia);
      }
      switch (c) {
        case Codes.lineFeed:
        case Codes.carriageReturn:
          tokFlags |= qt.TokenFlags.PrecedingLineBreak;
          if (skipTrivia) {
            pos++;
            continue;
          } else {
            if (c === Codes.carriageReturn && pos + 1 < end && text.charCodeAt(pos + 1) === Codes.lineFeed) pos += 2;
            else pos++;
            return (token = Syntax.NewLineTrivia);
          }
        case Codes.tab:
        case Codes.verticalTab:
        case Codes.formFeed:
        case Codes.space:
        case Codes.nonBreakingSpace:
        case Codes.ogham:
        case Codes.enQuad:
        case Codes.emQuad:
        case Codes.enSpace:
        case Codes.emSpace:
        case Codes.threePerEmSpace:
        case Codes.fourPerEmSpace:
        case Codes.sixPerEmSpace:
        case Codes.figureSpace:
        case Codes.punctuationSpace:
        case Codes.thinSpace:
        case Codes.hairSpace:
        case Codes.zeroWidthSpace:
        case Codes.narrowNoBreakSpace:
        case Codes.mathematicalSpace:
        case Codes.ideographicSpace:
        case Codes.byteOrderMark:
          if (skipTrivia) {
            pos++;
            continue;
          } else {
            while (pos < end && syntax.is.whiteSpaceSingleLine(text.charCodeAt(pos))) {
              pos++;
            }
            return (token = Syntax.WhitespaceTrivia);
          }
        case Codes.exclamation:
          if (text.charCodeAt(pos + 1) === Codes.equals) {
            if (text.charCodeAt(pos + 2) === Codes.equals) return (pos += 3), (token = Syntax.ExclamationEquals2Token);
            return (pos += 2), (token = Syntax.ExclamationEqualsToken);
          }
          pos++;
          return (token = Syntax.ExclamationToken);
        case Codes.doubleQuote:
        case Codes.singleQuote:
          tokValue = scanString();
          return (token = Syntax.StringLiteral);
        case Codes.backtick:
          return (token = scanTemplateAndSetTokenValue(false));
        case Codes.percent:
          if (text.charCodeAt(pos + 1) === Codes.equals) return (pos += 2), (token = Syntax.PercentEqualsToken);
          pos++;
          return (token = Syntax.PercentToken);
        case Codes.ampersand:
          if (text.charCodeAt(pos + 1) === Codes.ampersand) return (pos += 2), (token = Syntax.Ampersand2Token);
          if (text.charCodeAt(pos + 1) === Codes.equals) return (pos += 2), (token = Syntax.AmpersandEqualsToken);
          pos++;
          return (token = Syntax.AmpersandToken);
        case Codes.openParen:
          pos++;
          return (token = Syntax.OpenParenToken);
        case Codes.closeParen:
          pos++;
          return (token = Syntax.CloseParenToken);
        case Codes.asterisk:
          if (text.charCodeAt(pos + 1) === Codes.equals) return (pos += 2), (token = Syntax.AsteriskEqualsToken);
          if (text.charCodeAt(pos + 1) === Codes.asterisk) {
            if (text.charCodeAt(pos + 2) === Codes.equals) return (pos += 3), (token = Syntax.Asterisk2EqualsToken);
            return (pos += 2), (token = Syntax.Asterisk2Token);
          }
          pos++;
          if (inJSDocType && !asterisk && tokFlags & qt.TokenFlags.PrecedingLineBreak) {
            asterisk = true;
            continue;
          }
          return (token = Syntax.AsteriskToken);
        case Codes.plus:
          if (text.charCodeAt(pos + 1) === Codes.plus) return (pos += 2), (token = Syntax.Plus2Token);
          if (text.charCodeAt(pos + 1) === Codes.equals) return (pos += 2), (token = Syntax.PlusEqualsToken);
          pos++;
          return (token = Syntax.PlusToken);
        case Codes.comma:
          pos++;
          return (token = Syntax.CommaToken);
        case Codes.minus:
          if (text.charCodeAt(pos + 1) === Codes.minus) return (pos += 2), (token = Syntax.Minus2Token);
          if (text.charCodeAt(pos + 1) === Codes.equals) return (pos += 2), (token = Syntax.MinusEqualsToken);
          pos++;
          return (token = Syntax.MinusToken);
        case Codes.dot:
          if (syntax.is.digit(text.charCodeAt(pos + 1))) {
            tokValue = scanNumber().value;
            return (token = Syntax.NumericLiteral);
          }
          if (text.charCodeAt(pos + 1) === Codes.dot && text.charCodeAt(pos + 2) === Codes.dot) return (pos += 3), (token = Syntax.Dot3Token);
          pos++;
          return (token = Syntax.DotToken);
        case Codes.slash:
          if (text.charCodeAt(pos + 1) === Codes.slash) {
            pos += 2;
            while (pos < end) {
              if (syntax.is.lineBreak(text.charCodeAt(pos))) break;
              pos++;
            }
            directives = appendIfDirective(directives, text.slice(tokPos, pos), directiveRegExSingleLine, tokPos);
            if (skipTrivia) continue;
            else return (token = Syntax.SingleLineCommentTrivia);
          }
          if (text.charCodeAt(pos + 1) === Codes.asterisk) {
            pos += 2;
            if (text.charCodeAt(pos) === Codes.asterisk && text.charCodeAt(pos + 1) !== Codes.slash) {
              tokFlags |= qt.TokenFlags.PrecedingJSDocComment;
            }
            let closed = false;
            let last = tokPos;
            while (pos < end) {
              const c2 = text.charCodeAt(pos);
              if (c2 === Codes.asterisk && text.charCodeAt(pos + 1) === Codes.slash) {
                pos += 2;
                closed = true;
                break;
              }
              pos++;
              if (syntax.is.lineBreak(c2)) {
                last = pos;
                tokFlags |= qt.TokenFlags.PrecedingLineBreak;
              }
            }
            directives = appendIfDirective(directives, text.slice(last, pos), directiveRegExMultiLine, last);
            if (!closed) error(qd.Asterisk_Slash_expected);
            if (skipTrivia) continue;
            else {
              if (!closed) tokFlags |= qt.TokenFlags.Unterminated;
              return (token = Syntax.MultiLineCommentTrivia);
            }
          }
          if (text.charCodeAt(pos + 1) === Codes.equals) return (pos += 2), (token = Syntax.SlashEqualsToken);
          pos++;
          return (token = Syntax.SlashToken);
        case Codes._0:
          if (pos + 2 < end && (text.charCodeAt(pos + 1) === Codes.X || text.charCodeAt(pos + 1) === Codes.x)) {
            pos += 2;
            tokValue = scanHexDigits(1, true, true);
            if (!tokValue) {
              error(qd.Hexadecimal_digit_expected);
              tokValue = '0';
            }
            tokValue = '0x' + tokValue;
            tokFlags |= qt.TokenFlags.HexSpecifier;
            return (token = parseNumber());
          } else if (pos + 2 < end && (text.charCodeAt(pos + 1) === Codes.B || text.charCodeAt(pos + 1) === Codes.b)) {
            pos += 2;
            tokValue = scanBinOrOctDigits(2);
            if (!tokValue) {
              error(qd.Binary_digit_expected);
              tokValue = '0';
            }
            tokValue = '0b' + tokValue;
            tokFlags |= qt.TokenFlags.BinarySpecifier;
            return (token = parseNumber());
          } else if (pos + 2 < end && (text.charCodeAt(pos + 1) === Codes.O || text.charCodeAt(pos + 1) === Codes.o)) {
            pos += 2;
            tokValue = scanBinOrOctDigits(8);
            if (!tokValue) {
              error(qd.Octal_digit_expected);
              tokValue = '0';
            }
            tokValue = '0o' + tokValue;
            tokFlags |= qt.TokenFlags.OctalSpecifier;
            return (token = parseNumber());
          }
          if (pos + 1 < end && syntax.is.octalDigit(text.charCodeAt(pos + 1))) {
            tokValue = '' + scanOctDigits();
            tokFlags |= qt.TokenFlags.Octal;
            return (token = Syntax.NumericLiteral);
          }
        case Codes._1:
        case Codes._2:
        case Codes._3:
        case Codes._4:
        case Codes._5:
        case Codes._6:
        case Codes._7:
        case Codes._8:
        case Codes._9:
          ({ type: token, value: tokValue } = scanNumber());
          return token;
        case Codes.colon:
          pos++;
          return (token = Syntax.ColonToken);
        case Codes.semicolon:
          pos++;
          return (token = Syntax.SemicolonToken);
        case Codes.lessThan:
          if (syntax.is.markerTrivia(text, pos)) {
            pos = syntax.markerTrivia(text, pos, error);
            if (skipTrivia) continue;
            else return (token = Syntax.ConflictMarkerTrivia);
          }
          if (text.charCodeAt(pos + 1) === Codes.lessThan) {
            if (text.charCodeAt(pos + 2) === Codes.equals) return (pos += 3), (token = Syntax.LessThan2EqualsToken);
            return (pos += 2), (token = Syntax.LessThan2Token);
          }
          if (text.charCodeAt(pos + 1) === Codes.equals) return (pos += 2), (token = Syntax.LessThanEqualsToken);
          if (lang === LanguageVariant.TX && text.charCodeAt(pos + 1) === Codes.slash && text.charCodeAt(pos + 2) !== Codes.asterisk) return (pos += 2), (token = Syntax.LessThanSlashToken);
          pos++;
          return (token = Syntax.LessThanToken);
        case Codes.equals:
          if (syntax.is.markerTrivia(text, pos)) {
            pos = syntax.markerTrivia(text, pos, error);
            if (skipTrivia) continue;
            else return (token = Syntax.ConflictMarkerTrivia);
          }
          if (text.charCodeAt(pos + 1) === Codes.equals) {
            if (text.charCodeAt(pos + 2) === Codes.equals) return (pos += 3), (token = Syntax.Equals3Token);
            return (pos += 2), (token = Syntax.Equals2Token);
          }
          if (text.charCodeAt(pos + 1) === Codes.greaterThan) return (pos += 2), (token = Syntax.EqualsGreaterThanToken);
          pos++;
          return (token = Syntax.EqualsToken);
        case Codes.greaterThan:
          if (syntax.is.markerTrivia(text, pos)) {
            pos = syntax.markerTrivia(text, pos, error);
            if (skipTrivia) continue;
            else return (token = Syntax.ConflictMarkerTrivia);
          }
          pos++;
          return (token = Syntax.GreaterThanToken);
        case Codes.question:
          pos++;
          if (text.charCodeAt(pos) === Codes.dot && !syntax.is.digit(text.charCodeAt(pos + 1))) {
            pos++;
            return (token = Syntax.QuestionDotToken);
          }
          if (text.charCodeAt(pos) === Codes.question) {
            pos++;
            return (token = Syntax.Question2Token);
          }
          return (token = Syntax.QuestionToken);
        case Codes.openBracket:
          pos++;
          return (token = Syntax.OpenBracketToken);
        case Codes.closeBracket:
          pos++;
          return (token = Syntax.CloseBracketToken);
        case Codes.caret:
          if (text.charCodeAt(pos + 1) === Codes.equals) return (pos += 2), (token = Syntax.CaretEqualsToken);
          pos++;
          return (token = Syntax.CaretToken);
        case Codes.openBrace:
          pos++;
          return (token = Syntax.OpenBraceToken);
        case Codes.bar:
          if (syntax.is.markerTrivia(text, pos)) {
            pos = syntax.markerTrivia(text, pos, error);
            if (skipTrivia) continue;
            else return (token = Syntax.ConflictMarkerTrivia);
          }
          if (text.charCodeAt(pos + 1) === Codes.bar) return (pos += 2), (token = Syntax.Bar2Token);
          if (text.charCodeAt(pos + 1) === Codes.equals) return (pos += 2), (token = Syntax.BarEqualsToken);
          pos++;
          return (token = Syntax.BarToken);
        case Codes.closeBrace:
          pos++;
          return (token = Syntax.CloseBraceToken);
        case Codes.tilde:
          pos++;
          return (token = Syntax.TildeToken);
        case Codes.at:
          pos++;
          return (token = Syntax.AtToken);
        case Codes.backslash:
          const c2 = peekExtEscape();
          if (c2 >= 0 && syntax.is.identifierStart(c2)) {
            pos += 3;
            tokFlags |= qt.TokenFlags.ExtendedEscape;
            tokValue = scanExtEscape() + scanIdentifierParts();
            return (token = scanIdentifier());
          }
          const c3 = peekUniEscape();
          if (c3 >= 0 && syntax.is.identifierStart(c3)) {
            pos += 6;
            tokFlags |= qt.TokenFlags.UnicodeEscape;
            tokValue = String.fromCharCode(c3) + scanIdentifierParts();
            return (token = scanIdentifier());
          }
          error(qd.Invalid_character);
          pos++;
          return (token = Syntax.Unknown);
        case Codes.hash:
          if (pos !== 0 && text[pos + 1] === '!') {
            error(qd.can_only_be_used_at_the_start_of_a_file);
            pos++;
            return (token = Syntax.Unknown);
          }
          pos++;
          if (syntax.is.identifierStart((c = text.charCodeAt(pos)))) {
            pos++;
            while (pos < end && syntax.is.identifierPart((c = text.charCodeAt(pos)))) pos++;
            tokValue = text.substring(tokPos, pos);
            if (c === Codes.backslash) tokValue += scanIdentifierParts();
          } else {
            tokValue = '#';
            error(qd.Invalid_character);
          }
          return (token = Syntax.PrivateIdentifier);
        default:
          if (syntax.is.identifierStart(c)) {
            pos += syntax.get.charSize(c);
            while (pos < end && syntax.is.identifierPart((c = text.codePointAt(pos)!))) pos += syntax.get.charSize(c);
            tokValue = text.substring(tokPos, pos);
            if (c === Codes.backslash) tokValue += scanIdentifierParts();
            return (token = scanIdentifier());
          } else if (syntax.is.whiteSpaceSingleLine(c)) {
            pos += syntax.get.charSize(c);
            continue;
          } else if (syntax.is.lineBreak(c)) {
            tokFlags |= qt.TokenFlags.PrecedingLineBreak;
            pos += syntax.get.charSize(c);
            continue;
          }
          error(qd.Invalid_character);
          pos += syntax.get.charSize(c);
          return (token = Syntax.Unknown);
      }
    }
  }
  function scanRange<T>(start: number, length: number, cb: () => T): T {
    const e = end;
    const p = pos;
    const sp = startPos;
    const tp = tokPos;
    const t = token;
    const v = tokValue;
    const f = tokFlags;
    const d = directives;
    setText(text, start, length);
    const r = cb();
    end = e;
    pos = p;
    startPos = sp;
    tokPos = tp;
    token = t;
    tokValue = v;
    tokFlags = f;
    directives = d;
    return r;
  }
  function reScanGreaterToken(): Syntax {
    if (token === Syntax.GreaterThanToken) {
      if (text.charCodeAt(pos) === Codes.greaterThan) {
        if (text.charCodeAt(pos + 1) === Codes.greaterThan) {
          if (text.charCodeAt(pos + 2) === Codes.equals) return (pos += 3), (token = Syntax.GreaterThan3EqualsToken);
          return (pos += 2), (token = Syntax.GreaterThan3Token);
        }
        if (text.charCodeAt(pos + 1) === Codes.equals) return (pos += 2), (token = Syntax.GreaterThan2EqualsToken);
        pos++;
        return (token = Syntax.GreaterThan2Token);
      }
      if (text.charCodeAt(pos) === Codes.equals) {
        pos++;
        return (token = Syntax.GreaterThanEqualsToken);
      }
    }
    return token;
  }
  function reScanLessToken(): Syntax {
    if (token === Syntax.LessThan2Token) {
      pos = tokPos + 1;
      return (token = Syntax.LessThanToken);
    }
    return token;
  }
  function reScanSlashToken(): Syntax {
    if (token === Syntax.SlashToken || token === Syntax.SlashEqualsToken) {
      let p = tokPos + 1;
      let esc = false;
      let cls = false;
      while (true) {
        if (p >= end) {
          tokFlags |= qt.TokenFlags.Unterminated;
          error(qd.Unterminated_regular_expression_literal);
          break;
        }
        const c = text.charCodeAt(p);
        if (syntax.is.lineBreak(c)) {
          tokFlags |= qt.TokenFlags.Unterminated;
          error(qd.Unterminated_regular_expression_literal);
          break;
        }
        if (esc) esc = false;
        else if (c === Codes.slash && !cls) {
          p++;
          break;
        } else if (c === Codes.openBracket) cls = true;
        else if (c === Codes.backslash) esc = true;
        else if (c === Codes.closeBracket) cls = false;
        p++;
      }
      while (p < end && syntax.is.identifierPart(text.charCodeAt(p))) {
        p++;
      }
      pos = p;
      tokValue = text.substring(tokPos, pos);
      token = Syntax.RegexLiteral;
    }
    return token;
  }
  function reScanQuestionToken(): Syntax {
    qb.assert(token === Syntax.Question2Token, "'reScanQuestionToken' should only be called on a '??'");
    pos = tokPos + 1;
    return (token = Syntax.QuestionToken);
  }
  function reScanTemplateToken(tagged: boolean): Syntax {
    qb.assert(token === Syntax.CloseBraceToken, "'reScanTemplateToken' should only be called on a '}'");
    pos = tokPos;
    return (token = scanTemplateAndSetTokenValue(tagged));
  }
  function reScanHeadOrNoSubstTemplate(): Syntax {
    pos = tokPos;
    return (token = scanTemplateAndSetTokenValue(true));
  }
  function reScanJsxToken(): JsxTokenSyntax {
    pos = tokPos = startPos;
    return (token = scanJsxToken());
  }
  function reScanJsxAttributeValue(): Syntax {
    pos = tokPos = startPos;
    return scanJsxAttributeValue();
  }
  function error(m: qt.DiagnosticMessage): void;
  function error(m: qt.DiagnosticMessage, errPos: number, length: number): void;
  function error(m: qt.DiagnosticMessage, errPos: number = pos, length?: number): void {
    if (onError) {
      const p = pos;
      pos = errPos;
      onError(m, length ?? 0);
      pos = p;
    }
  }
  function speculate<T>(cb: () => T, isLookahead: boolean): T {
    const p = pos;
    const sp = startPos;
    const tp = tokPos;
    const t = token;
    const v = tokValue;
    const f = tokFlags;
    const r = cb();
    if (!r || isLookahead) {
      pos = p;
      startPos = sp;
      tokPos = tp;
      token = t;
      tokValue = v;
      tokFlags = f;
    }
    return r;
  }
  function scanIdentifier(): Syntax.Identifier | KeywordSyntax {
    const l = tokValue.length;
    if (l >= 2 && l <= 11) {
      const c = tokValue.charCodeAt(0);
      if (c >= Codes.a && c <= Codes.z) {
        const w = syntax.strToKey.get(tokValue);
        if (w !== undefined) return (token = w);
      }
    }
    return (token = Syntax.Identifier);
  }
  function peekUniEscape(): number {
    if (pos + 5 < end && text.charCodeAt(pos + 1) === Codes.u) {
      const s = pos;
      pos += 2;
      const vs = scanHexDigits(4, false);
      const v = vs ? parseInt(vs, 16) : -1;
      pos = s;
      return v;
    }
    return -1;
  }
  function peekExtEscape(): number {
    if (text.codePointAt(pos + 1) === Codes.u && text.codePointAt(pos + 2) === Codes.openBrace) {
      const s = pos;
      pos += 3;
      const vs = scanHexDigits(1);
      const v = vs ? parseInt(vs, 16) : -1;
      pos = s;
      return v;
    }
    return -1;
  }
  function scanIdentifierParts(): string {
    let r = '';
    let s = pos;
    while (pos < end) {
      let c = text.codePointAt(pos)!;
      if (syntax.is.identifierPart(c)) {
        pos += syntax.get.charSize(c);
      } else if (c === Codes.backslash) {
        c = peekExtEscape();
        if (c >= 0 && syntax.is.identifierPart(c)) {
          pos += 3;
          tokFlags |= qt.TokenFlags.ExtendedEscape;
          r += scanExtEscape();
          s = pos;
          continue;
        }
        c = peekUniEscape();
        if (!(c >= 0 && syntax.is.identifierPart(c))) break;
        tokFlags |= qt.TokenFlags.UnicodeEscape;
        r += text.substring(s, pos);
        r += String.fromCodePoint(c);
        pos += 6;
        s = pos;
      } else break;
    }
    r += text.substring(s, pos);
    return r;
  }
  function scanNumber(): { type: Syntax; value: string } {
    const s = pos;
    function scanFragment() {
      let r = '';
      let s = pos;
      let sep = false;
      let prev = false;
      while (true) {
        const c = text.charCodeAt(pos);
        if (c === Codes._) {
          tokFlags |= qt.TokenFlags.ContainsSeparator;
          if (sep) {
            sep = false;
            prev = true;
            r += text.substring(s, pos);
          } else if (prev) error(qd.Multiple_consecutive_numeric_separators_are_not_permitted, pos, 1);
          else error(qd.Numeric_separators_are_not_allowed_here, pos, 1);
          pos++;
          s = pos;
          continue;
        }
        if (syntax.is.digit(c)) {
          sep = true;
          prev = false;
          pos++;
          continue;
        }
        break;
      }
      if (text.charCodeAt(pos - 1) === Codes._) error(qd.Numeric_separators_are_not_allowed_here, pos - 1, 1);
      return r + text.substring(s, pos);
    }
    let r = scanFragment();
    let decimal: string | undefined;
    let scientific: string | undefined;
    if (text.charCodeAt(pos) === Codes.dot) {
      pos++;
      decimal = scanFragment();
    }
    let e = pos;
    if (text.charCodeAt(pos) === Codes.E || text.charCodeAt(pos) === Codes.e) {
      pos++;
      tokFlags |= qt.TokenFlags.Scientific;
      if (text.charCodeAt(pos) === Codes.plus || text.charCodeAt(pos) === Codes.minus) pos++;
      const p = pos;
      const f = scanFragment();
      if (!f) error(qd.Digit_expected);
      else {
        scientific = text.substring(e, p) + f;
        e = pos;
      }
    }
    if (tokFlags & qt.TokenFlags.ContainsSeparator) {
      if (decimal) r += '.' + decimal;
      if (scientific) r += scientific;
    } else r = text.substring(s, e);
    function checkForIdentifier(scientific = false) {
      if (!syntax.is.identifierStart(text.codePointAt(pos)!)) return;
      const p = pos;
      const l = scanIdentifierParts().length;
      if (l === 1 && text[p] === 'n') {
        if (scientific) error(qd.A_bigint_literal_cannot_use_exponential_notation, s, p - s + 1);
        else error(qd.A_bigint_literal_must_be_an_integer, s, p - s + 1);
      } else {
        error(qd.An_identifier_or_keyword_cannot_immediately_follow_a_numeric_literal, p, l);
        pos = p;
      }
    }
    if (decimal !== undefined || tokFlags & qt.TokenFlags.Scientific) {
      checkForIdentifier(decimal === undefined && !!(tokFlags & qt.TokenFlags.Scientific));
      return {
        type: Syntax.NumericLiteral,
        value: '' + +r,
      };
    } else {
      tokValue = r;
      const type = parseNumber();
      checkForIdentifier();
      return { type, value: tokValue };
    }
  }
  function parseNumber(): Syntax {
    if (text.charCodeAt(pos) === Codes.n) {
      tokValue += 'n';
      if (tokFlags & qt.TokenFlags.BinaryOrOctalSpecifier) tokValue = parsePseudoBigInt(tokValue) + 'n';
      pos++;
      return Syntax.BigIntLiteral;
    } else {
      const v =
        tokFlags & qt.TokenFlags.BinarySpecifier
          ? parseInt(tokValue.slice(2), 2) // skip "0b"
          : tokFlags & qt.TokenFlags.OctalSpecifier
          ? parseInt(tokValue.slice(2), 8) // skip "0o"
          : +tokValue;
      tokValue = '' + v;
      return Syntax.NumericLiteral;
    }
  }
  function scanOctDigits(): number {
    const s = pos;
    while (syntax.is.octalDigit(text.charCodeAt(pos))) {
      pos++;
    }
    return +text.substring(s, pos);
  }
  function scanHexDigits(min: number, greedy = true, seps = false): string {
    let ds = [] as number[];
    let sep = false;
    let prev = false;
    while (ds.length < min || greedy) {
      let d = text.charCodeAt(pos);
      if (seps && d === Codes._) {
        tokFlags |= qt.TokenFlags.ContainsSeparator;
        if (sep) {
          sep = false;
          prev = true;
        } else if (prev) error(qd.Multiple_consecutive_numeric_separators_are_not_permitted, pos, 1);
        else error(qd.Numeric_separators_are_not_allowed_here, pos, 1);
        pos++;
        continue;
      }
      sep = seps;
      if (d >= Codes.A && d <= Codes.F) d += Codes.a - Codes.A;
      else if (!((d >= Codes._0 && d <= Codes._9) || (d >= Codes.a && d <= Codes.f))) break;
      ds.push(d);
      pos++;
      prev = false;
    }
    if (ds.length < min) ds = [];
    if (text.charCodeAt(pos - 1) === Codes._) error(qd.Numeric_separators_are_not_allowed_here, pos - 1, 1);
    return String.fromCharCode(...ds);
  }
  function scanBinOrOctDigits(base: 2 | 8): string {
    let r = '';
    let sep = false;
    let prev = false;
    while (true) {
      const c = text.charCodeAt(pos);
      if (c === Codes._) {
        tokFlags |= qt.TokenFlags.ContainsSeparator;
        if (sep) {
          sep = false;
          prev = true;
        } else if (prev) error(qd.Multiple_consecutive_numeric_separators_are_not_permitted, pos, 1);
        else error(qd.Numeric_separators_are_not_allowed_here, pos, 1);
        pos++;
        continue;
      }
      sep = true;
      if (!syntax.is.digit(c) || c - Codes._0 >= base) break;
      r += text[pos];
      pos++;
      prev = false;
    }
    if (text.charCodeAt(pos - 1) === Codes._) error(qd.Numeric_separators_are_not_allowed_here, pos - 1, 1);
    return r;
  }
  function scanExtEscape(): string {
    const vs = scanHexDigits(1);
    const v = vs ? parseInt(vs, 16) : -1;
    let e = false;
    if (v < 0) {
      error(qd.Hexadecimal_digit_expected);
      e = true;
    } else if (v > 0x10ffff) {
      error(qd.An_extended_Unicode_escape_value_must_be_between_0x0_and_0x10FFFF_inclusive);
      e = true;
    }
    if (pos >= end) {
      error(qd.Unexpected_end_of_text);
      e = true;
    } else if (text.charCodeAt(pos) === Codes.closeBrace) {
      pos++;
    } else {
      error(qd.Unterminated_Unicode_escape_sequence);
      e = true;
    }
    if (e) return '';
    return String.fromCodePoint(v);
  }
  function scanEscSequence(tagged?: boolean): string {
    const s = pos;
    pos++;
    if (pos >= end) {
      error(qd.Unexpected_end_of_text);
      return '';
    }
    const c = text.charCodeAt(pos);
    pos++;
    function scanHexEscape(count: number) {
      const vs = scanHexDigits(count, false);
      const v = vs ? parseInt(vs, 16) : -1;
      if (v >= 0) return String.fromCharCode(v);
      error(qd.Hexadecimal_digit_expected);
      return '';
    }
    switch (c) {
      case Codes._0:
        // '\01'
        if (tagged && pos < end && syntax.is.digit(text.charCodeAt(pos))) {
          pos++;
          tokFlags |= qt.TokenFlags.ContainsInvalidEscape;
          return text.substring(s, pos);
        }
        return '\0';
      case Codes.b:
        return '\b';
      case Codes.t:
        return '\t';
      case Codes.n:
        return '\n';
      case Codes.v:
        return '\v';
      case Codes.f:
        return '\f';
      case Codes.r:
        return '\r';
      case Codes.singleQuote:
        return "'";
      case Codes.doubleQuote:
        return '"';
      case Codes.u:
        if (tagged) {
          // '\u' or '\u0' or '\u00' or '\u000'
          for (let p = pos; p < pos + 4; p++) {
            if (p < end && !syntax.is.hexDigit(text.charCodeAt(p)) && text.charCodeAt(p) !== Codes.openBrace) {
              pos = p;
              tokFlags |= qt.TokenFlags.ContainsInvalidEscape;
              return text.substring(s, pos);
            }
          }
        }
        // '\u{DDDDDDDD}'
        if (pos < end && text.charCodeAt(pos) === Codes.openBrace) {
          pos++;
          // '\u{'
          if (tagged && !syntax.is.hexDigit(text.charCodeAt(pos))) {
            tokFlags |= qt.TokenFlags.ContainsInvalidEscape;
            return text.substring(s, pos);
          }
          if (tagged) {
            const p = pos;
            const vs = scanHexDigits(1);
            const v = vs ? parseInt(vs, 16) : -1;
            // '\u{Not Code Point' or '\u{CodePoint'
            if (!syntax.is.codePoint(v) || text.charCodeAt(pos) !== Codes.closeBrace) {
              tokFlags |= qt.TokenFlags.ContainsInvalidEscape;
              return text.substring(s, pos);
            } else pos = p;
          }
          tokFlags |= qt.TokenFlags.ExtendedEscape;
          return scanExtEscape();
        }
        tokFlags |= qt.TokenFlags.UnicodeEscape;
        // '\uDDDD'
        return scanHexEscape(4);
      case Codes.x:
        if (tagged) {
          if (!syntax.is.hexDigit(text.charCodeAt(pos))) {
            tokFlags |= qt.TokenFlags.ContainsInvalidEscape;
            return text.substring(s, pos);
          } else if (!syntax.is.hexDigit(text.charCodeAt(pos + 1))) {
            pos++;
            tokFlags |= qt.TokenFlags.ContainsInvalidEscape;
            return text.substring(s, pos);
          }
        }
        // '\xDD'
        return scanHexEscape(2);
      case Codes.carriageReturn:
        if (pos < end && text.charCodeAt(pos) === Codes.lineFeed) pos++;
      case Codes.lineFeed:
      case Codes.lineSeparator:
      case Codes.paragraphSeparator:
        return '';
      default:
        return String.fromCharCode(c);
    }
  }
  function scanString(jsxAttr = false): string {
    let r = '';
    const quote = text.charCodeAt(pos);
    pos++;
    let s = pos;
    while (true) {
      if (pos >= end) {
        r += text.substring(s, pos);
        tokFlags |= qt.TokenFlags.Unterminated;
        error(qd.Unterminated_string_literal);
        break;
      }
      const c = text.charCodeAt(pos);
      if (c === quote) {
        r += text.substring(s, pos);
        pos++;
        break;
      }
      if (c === Codes.backslash && !jsxAttr) {
        r += text.substring(s, pos);
        r += scanEscSequence();
        s = pos;
        continue;
      }
      if (syntax.is.lineBreak(c) && !jsxAttr) {
        r += text.substring(s, pos);
        tokFlags |= qt.TokenFlags.Unterminated;
        error(qd.Unterminated_string_literal);
        break;
      }
      pos++;
    }
    return r;
  }
  function scanTemplateAndSetTokenValue(tagged: boolean): Syntax {
    const backtick = text.charCodeAt(pos) === Codes.backtick;
    pos++;
    let s = pos;
    let v = '';
    let r: Syntax;
    while (true) {
      if (pos >= end) {
        v += text.substring(s, pos);
        tokFlags |= qt.TokenFlags.Unterminated;
        error(qd.Unterminated_template_literal);
        r = backtick ? Syntax.NoSubstitutionLiteral : Syntax.TemplateTail;
        break;
      }
      const c = text.charCodeAt(pos);
      // '`'
      if (c === Codes.backtick) {
        v += text.substring(s, pos);
        pos++;
        r = backtick ? Syntax.NoSubstitutionLiteral : Syntax.TemplateTail;
        break;
      }
      // '${'
      if (c === Codes.$ && pos + 1 < end && text.charCodeAt(pos + 1) === Codes.openBrace) {
        v += text.substring(s, pos);
        pos += 2;
        r = backtick ? Syntax.TemplateHead : Syntax.TemplateMiddle;
        break;
      }
      // Escape character
      if (c === Codes.backslash) {
        v += text.substring(s, pos);
        v += scanEscSequence(tagged);
        s = pos;
        continue;
      }
      // <CR><LF> and <CR> LineTerminatorSequences are normalized to <LF> for Template Values
      if (c === Codes.carriageReturn) {
        v += text.substring(s, pos);
        pos++;
        if (pos < end && text.charCodeAt(pos) === Codes.lineFeed) pos++;
        v += '\n';
        s = pos;
        continue;
      }
      pos++;
    }
    qb.assert(r !== undefined);
    tokValue = v;
    return r;
  }
  function appendIfDirective(ds: qt.CommentDirective[] | undefined, t: string, re: RegExp, line: number) {
    const d = directiveFrom(t, re);
    if (d === undefined) return ds;
    return qb.append(ds, { range: { pos: line, end: pos }, type: d });
  }
  function directiveFrom(t: string, re: RegExp) {
    const m = re.exec(t);
    if (!m) return;
    switch (m[1]) {
      case 'ts-expect-error':
        return qt.CommentDirectiveType.ExpectError;
      case 'ts-ignore':
        return qt.CommentDirectiveType.Ignore;
    }
    return;
  }
  function scanJsxToken(): JsxTokenSyntax {
    startPos = tokPos = pos;
    if (pos >= end) return (token = Syntax.EndOfFileToken);
    let c = text.charCodeAt(pos);
    if (c === Codes.lessThan) {
      if (text.charCodeAt(pos + 1) === Codes.slash) {
        pos += 2;
        return (token = Syntax.LessThanSlashToken);
      }
      pos++;
      return (token = Syntax.LessThanToken);
    }
    if (c === Codes.openBrace) {
      pos++;
      return (token = Syntax.OpenBraceToken);
    }
    let first = 0;
    let last = -1;
    while (pos < end) {
      if (!syntax.is.whiteSpaceSingleLine(c)) last = pos;
      c = text.charCodeAt(pos);
      if (c === Codes.openBrace) break;
      if (c === Codes.lessThan) {
        if (syntax.is.markerTrivia(text, pos)) {
          pos = syntax.markerTrivia(text, pos, error);
          return (token = Syntax.ConflictMarkerTrivia);
        }
        break;
      }
      if (c === Codes.greaterThan) error(qd.Unexpected_token_Did_you_mean_or_gt, pos, 1);
      if (c === Codes.closeBrace) error(qd.Unexpected_token_Did_you_mean_or_rbrace, pos, 1);
      if (last > 0) last++;
      if (syntax.is.lineBreak(c) && first === 0) first = -1;
      else if (!syntax.is.whiteSpaceLike(c)) first = pos;
      pos++;
    }
    const p = last === -1 ? pos : last;
    tokValue = text.substring(startPos, p);
    return first === -1 ? Syntax.JsxTextAllWhiteSpaces : Syntax.JsxText;
  }
  function scanJsxIdentifier(): Syntax {
    if (syntax.is.identifierOrKeyword(token)) {
      while (pos < end) {
        const c = text.charCodeAt(pos);
        if (c === Codes.minus) {
          tokValue += '-';
          pos++;
          continue;
        }
        const p = pos;
        tokValue += scanIdentifierParts();
        if (pos === p) break;
      }
    }
    return token;
  }
  function scanJsxAttributeValue(): Syntax {
    startPos = pos;
    switch (text.charCodeAt(pos)) {
      case Codes.doubleQuote:
      case Codes.singleQuote:
        tokValue = scanString(true);
        return (token = Syntax.StringLiteral);
      default:
        return scan();
    }
  }
  function scanJsDocToken(): JSDocSyntax {
    startPos = tokPos = pos;
    tokFlags = qt.TokenFlags.None;
    if (pos >= end) return (token = Syntax.EndOfFileToken);
    const c = text.codePointAt(pos)!;
    pos += syntax.get.charSize(c);
    switch (c) {
      case Codes.tab:
      case Codes.verticalTab:
      case Codes.formFeed:
      case Codes.space:
        while (pos < end && syntax.is.whiteSpaceSingleLine(text.charCodeAt(pos))) {
          pos++;
        }
        return (token = Syntax.WhitespaceTrivia);
      case Codes.at:
        return (token = Syntax.AtToken);
      case Codes.lineFeed:
      case Codes.carriageReturn:
        tokFlags |= qt.TokenFlags.PrecedingLineBreak;
        return (token = Syntax.NewLineTrivia);
      case Codes.asterisk:
        return (token = Syntax.AsteriskToken);
      case Codes.openBrace:
        return (token = Syntax.OpenBraceToken);
      case Codes.closeBrace:
        return (token = Syntax.CloseBraceToken);
      case Codes.openBracket:
        return (token = Syntax.OpenBracketToken);
      case Codes.closeBracket:
        return (token = Syntax.CloseBracketToken);
      case Codes.lessThan:
        return (token = Syntax.LessThanToken);
      case Codes.greaterThan:
        return (token = Syntax.GreaterThanToken);
      case Codes.equals:
        return (token = Syntax.EqualsToken);
      case Codes.comma:
        return (token = Syntax.CommaToken);
      case Codes.dot:
        return (token = Syntax.DotToken);
      case Codes.backtick:
        return (token = Syntax.BacktickToken);
      case Codes.backslash:
        pos--;
        const c2 = peekExtEscape();
        if (c2 >= 0 && syntax.is.identifierStart(c2)) {
          pos += 3;
          tokFlags |= qt.TokenFlags.ExtendedEscape;
          tokValue = scanExtEscape() + scanIdentifierParts();
          return (token = scanIdentifier());
        }
        const c3 = peekUniEscape();
        if (c3 >= 0 && syntax.is.identifierStart(c3)) {
          pos += 6;
          tokFlags |= qt.TokenFlags.UnicodeEscape;
          tokValue = String.fromCharCode(c3) + scanIdentifierParts();
          return (token = scanIdentifier());
        }
        pos++;
        return (token = Syntax.Unknown);
    }
    if (syntax.is.identifierStart(c)) {
      let c2 = c;
      while ((pos < end && syntax.is.identifierPart((c2 = text.codePointAt(pos)!))) || text.charCodeAt(pos) === Codes.minus) pos += syntax.get.charSize(c2);
      tokValue = text.substring(tokPos, pos);
      if (c2 === Codes.backslash) tokValue += scanIdentifierParts();
      return (token = scanIdentifier());
    }
    return (token = Syntax.Unknown);
  }
}
let raw: Scanner | undefined;
export function qs_getRaw() {
  return raw || (raw = qs_create(true));
}
const sentinel: object = {};
export function qs_process(k: qt.TemplateLiteralToken['kind'], s: string) {
  const r = qs_getRaw();
  switch (k) {
    case Syntax.NoSubstitutionLiteral:
      r.setText('`' + s + '`');
      break;
    case Syntax.TemplateHead:
      r.setText('`' + s + '${');
      break;
    case Syntax.TemplateMiddle:
      r.setText('}' + s + '${');
      break;
    case Syntax.TemplateTail:
      r.setText('}' + s + '`');
      break;
  }
  let t = r.scan();
  if (t === Syntax.CloseBracketToken) t = r.reScanTemplateToken(false);
  if (r.isUnterminated()) {
    r.setText();
    return sentinel;
  }
  let v: string | undefined;
  switch (t) {
    case Syntax.NoSubstitutionLiteral:
    case Syntax.TemplateHead:
    case Syntax.TemplateMiddle:
    case Syntax.TemplateTail:
      v = r.getTokenValue();
      break;
  }
  if (r.scan() !== Syntax.EndOfFileToken) {
    r.setText();
    return sentinel;
  }
  r.setText();
  return v;
}
