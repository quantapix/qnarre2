import { DocSyntax, JsxTokenSyntax, LanguageVariant, Syntax } from './syntax';
import { Modifier, Node, NodeFlags, TokenFlags } from './types';
import { qf, Nodes } from './core';
import * as qc from './core';
import * as qd from './diags';
import * as qt from './types';
import * as qu from './utils';
import * as qy from './syntax';
interface Parser {
  parseSource(fileName: string, t: string, languageVersion: qt.ScriptTarget, syntaxCursor?: IncrementalParser.SyntaxCursor, setParentNodes?: boolean, scriptKind?: ScriptKind): SourceFile;
  parseJsonText(fileName: string, text: string, lang?: qt.ScriptTarget, syntaxCursor?: IncrementalParser.SyntaxCursor, setParentNodes?: boolean): JsonSourceFile;
  parseIsolatedEntityName(s: string, languageVersion: qt.ScriptTarget): qt.EntityName | undefined;
  parseDocIsolatedComment(t: string, start?: number, length?: number): { doc: Doc; diagnostics: Diagnostic[] } | undefined;
  parseDocTypingExpressionForTests(content: string, start: number | undefined, length: number | undefined): { docTypeExpression: DocTypingExpression; diagnostics: Diagnostic[] } | undefined;
}
const enum PropertyLike {
  Property = 1 << 0,
  Param = 1 << 1,
  CallbackParam = 1 << 2,
}
const enum SignatureFlags {
  None = 0,
  Yield = 1 << 0,
  Await = 1 << 1,
  Type = 1 << 2,
  IgnoreMissingOpenBrace = 1 << 4,
  Doc = 1 << 5,
}
const enum Context {
  SourceElems,
  BlockStatements,
  SwitchClauses,
  SwitchClauseStatements,
  TypeMembers,
  ClassMembers,
  EnumMembers,
  HeritageClauseElem,
  VariableDeclarations,
  ObjectBindingElems,
  ArrayBindingElems,
  ArgExpressions,
  ObjectLiteralMembers,
  JsxAttributes,
  JsxChildren,
  ArrayLiteralMembers,
  Params,
  DocParams,
  RestProperties,
  TypeParams,
  TypeArgs,
  TupleElemTypes,
  HeritageClauses,
  ImportOrExportSpecifiers,
  Count,
}
const enum State {
  BeginningOfLine,
  SawAsterisk,
  SavingComments,
  SavingBackticks,
}
const enum Tristate {
  False,
  True,
  Unknown,
}
interface MissingList<T extends Node> extends Nodes<T> {
  isMissingList: true;
}
function create() {
  const scanner = qs_create(true);
  let currentToken: Syntax;
  let identifiers: qu.QMap<string>;
  let privateIdentifiers: qu.QMap<string>;
  const withDisallowInDecoratorContext = NodeFlags.DisallowInContext | NodeFlags.DecoratorContext;
  let source: SourceFile;
  let diags: DiagnosticWithLocation[];
  let syntaxCursor: IncrementalParser.SyntaxCursor | undefined;
  let sourceText: string;
  let notParenthesizedArrow: qu.QMap<true> | undefined;
  let parseErrorBeforeNextFinishedNode = false;
  const tok = () => currentToken;
  const getNodePos = () => scanner.getStartPos();
  const is = new (class {
    identifier() {
      if (tok() === Syntax.Identifier) return true;
      if (tok() === Syntax.YieldKeyword && flags.inContext(NodeFlags.YieldContext)) return false;
      if (tok() === Syntax.AwaitKeyword && flags.inContext(NodeFlags.AwaitContext)) return false;
      return tok() > Syntax.LastReservedWord;
    }
    identifierOrPrivateIdentifierOrPattern() {
      return tok() === Syntax.OpenBraceToken || tok() === Syntax.OpenBracketToken || tok() === Syntax.PrivateIdentifier || this.identifier();
    }
    literalPropertyName() {
      return qy.is.identifierOrKeyword(tok()) || tok() === Syntax.StringLiteral || tok() === Syntax.NumericLiteral;
    }
    indexSignature() {
      const isUnambiguouslyIndexSignature = () => {
        next.tok();
        if (tok() === Syntax.Dot3Token || tok() === Syntax.CloseBracketToken) return true;
        if (qy.is.modifier(tok())) {
          next.tok();
          if (this.identifier()) return true;
        } else if (!this.identifier()) return false;
        else next.tok();
        if (tok() === Syntax.ColonToken || tok() === Syntax.CommaToken) return true;
        if (tok() !== Syntax.QuestionToken) return false;
        next.tok();
        return tok() === Syntax.ColonToken || tok() === Syntax.CommaToken || tok() === Syntax.CloseBracketToken;
      };
      return tok() === Syntax.OpenBracketToken && lookAhead(isUnambiguouslyIndexSignature);
    }
    declareModifier(modifier: Modifier) {
      return modifier.kind === Syntax.DeclareKeyword;
    }
    heritageClause() {
      return tok() === Syntax.ExtendsKeyword || tok() === Syntax.ImplementsKeyword;
    }
    startOfDeclaration() {
      const isDeclaration = () => {
        while (true) {
          switch (tok()) {
            case Syntax.VarKeyword:
            case Syntax.LetKeyword:
            case Syntax.ConstKeyword:
            case Syntax.FunctionKeyword:
            case Syntax.ClassKeyword:
            case Syntax.EnumKeyword:
              return true;
            case Syntax.InterfaceKeyword:
            case Syntax.TypeKeyword:
              next.tok();
              return !scanner.hasPrecedingLineBreak() && this.identifier();
            case Syntax.ModuleKeyword:
            case Syntax.NamespaceKeyword:
              next.tok();
              return !scanner.hasPrecedingLineBreak() && (this.identifier() || tok() === Syntax.StringLiteral);
            case Syntax.AbstractKeyword:
            case Syntax.AsyncKeyword:
            case Syntax.DeclareKeyword:
            case Syntax.PrivateKeyword:
            case Syntax.ProtectedKeyword:
            case Syntax.PublicKeyword:
            case Syntax.ReadonlyKeyword:
              next.tok();
              if (scanner.hasPrecedingLineBreak()) return false;
              continue;
            case Syntax.GlobalKeyword:
              next.tok();
              return tok() === Syntax.OpenBraceToken || tok() === Syntax.Identifier || tok() === Syntax.ExportKeyword;
            case Syntax.ImportKeyword:
              next.tok();
              return tok() === Syntax.StringLiteral || tok() === Syntax.AsteriskToken || tok() === Syntax.OpenBraceToken || qy.is.identifierOrKeyword(tok());
            case Syntax.ExportKeyword:
              let currentToken = next.tok();
              if (currentToken === Syntax.TypeKeyword) currentToken = lookAhead(next.tok);
              if (
                currentToken === Syntax.EqualsToken ||
                currentToken === Syntax.AsteriskToken ||
                currentToken === Syntax.OpenBraceToken ||
                currentToken === Syntax.DefaultKeyword ||
                currentToken === Syntax.AsKeyword
              ) {
                return true;
              }
              continue;
            case Syntax.StaticKeyword:
              next.tok();
              continue;
            default:
              return false;
          }
        }
      };
      return lookAhead(isDeclaration);
    }
    startOfType(inParam?: boolean) {
      switch (tok()) {
        case Syntax.AnyKeyword:
        case Syntax.UnknownKeyword:
        case Syntax.StringKeyword:
        case Syntax.NumberKeyword:
        case Syntax.BigIntKeyword:
        case Syntax.BooleanKeyword:
        case Syntax.ReadonlyKeyword:
        case Syntax.SymbolKeyword:
        case Syntax.UniqueKeyword:
        case Syntax.VoidKeyword:
        case Syntax.UndefinedKeyword:
        case Syntax.NullKeyword:
        case Syntax.ThisKeyword:
        case Syntax.TypeOfKeyword:
        case Syntax.NeverKeyword:
        case Syntax.OpenBraceToken:
        case Syntax.OpenBracketToken:
        case Syntax.LessThanToken:
        case Syntax.BarToken:
        case Syntax.AmpersandToken:
        case Syntax.NewKeyword:
        case Syntax.StringLiteral:
        case Syntax.NumericLiteral:
        case Syntax.BigIntLiteral:
        case Syntax.TrueKeyword:
        case Syntax.FalseKeyword:
        case Syntax.ObjectKeyword:
        case Syntax.AsteriskToken:
        case Syntax.QuestionToken:
        case Syntax.ExclamationToken:
        case Syntax.Dot3Token:
        case Syntax.InferKeyword:
        case Syntax.ImportKeyword:
        case Syntax.AssertsKeyword:
          return true;
        case Syntax.FunctionKeyword:
          return !inParam;
        case Syntax.MinusToken:
          return !inParam && lookAhead(next.isNumericOrBigIntLiteral);
        case Syntax.OpenParenToken:
          const isParenthesizedOrFunctionType = (): boolean => {
            next.tok();
            return tok() === Syntax.CloseParenToken || this.startOfParam(false) || this.startOfType();
          };
          return !inParam && lookAhead(isParenthesizedOrFunctionType);
        default:
          return this.identifier();
      }
    }
    startOfParam(isDocParam: boolean) {
      return tok() === Syntax.Dot3Token || this.identifierOrPrivateIdentifierOrPattern() || qy.is.modifier(tok()) || tok() === Syntax.AtToken || this.startOfType(!isDocParam);
    }
    startOfStatement() {
      switch (tok()) {
        case Syntax.AtToken:
        case Syntax.SemicolonToken:
        case Syntax.OpenBraceToken:
        case Syntax.VarKeyword:
        case Syntax.LetKeyword:
        case Syntax.FunctionKeyword:
        case Syntax.ClassKeyword:
        case Syntax.EnumKeyword:
        case Syntax.IfKeyword:
        case Syntax.DoKeyword:
        case Syntax.WhileKeyword:
        case Syntax.ForKeyword:
        case Syntax.ContinueKeyword:
        case Syntax.BreakKeyword:
        case Syntax.ReturnKeyword:
        case Syntax.WithKeyword:
        case Syntax.SwitchKeyword:
        case Syntax.ThrowKeyword:
        case Syntax.TryKeyword:
        case Syntax.DebuggerKeyword:
        case Syntax.CatchKeyword:
        case Syntax.FinallyKeyword:
          return true;
        case Syntax.ImportKeyword:
          return this.startOfDeclaration() || lookAhead(next.isOpenParenOrLessThanOrDot);
        case Syntax.ConstKeyword:
        case Syntax.ExportKeyword:
          return this.startOfDeclaration();
        case Syntax.AsyncKeyword:
        case Syntax.DeclareKeyword:
        case Syntax.InterfaceKeyword:
        case Syntax.ModuleKeyword:
        case Syntax.NamespaceKeyword:
        case Syntax.TypeKeyword:
        case Syntax.GlobalKeyword:
          return true;
        case Syntax.PublicKeyword:
        case Syntax.PrivateKeyword:
        case Syntax.ProtectedKeyword:
        case Syntax.StaticKeyword:
        case Syntax.ReadonlyKeyword:
          return this.startOfDeclaration() || !lookAhead(next.isIdentifierOrKeywordOnSameLine);
        default:
          return this.startOfExpression();
      }
    }
    startOfExpression() {
      if (this.startOfLeftExpression()) return true;
      switch (tok()) {
        case Syntax.PlusToken:
        case Syntax.MinusToken:
        case Syntax.TildeToken:
        case Syntax.ExclamationToken:
        case Syntax.DeleteKeyword:
        case Syntax.TypeOfKeyword:
        case Syntax.VoidKeyword:
        case Syntax.Plus2Token:
        case Syntax.Minus2Token:
        case Syntax.LessThanToken:
        case Syntax.AwaitKeyword:
        case Syntax.YieldKeyword:
        case Syntax.PrivateIdentifier:
          return true;
        default:
          const isBinaryOperator = () => {
            if (flags.inContext(NodeFlags.DisallowInContext) && tok() === Syntax.InKeyword) return false;
            return qy.get.binaryOperatorPrecedence(tok()) > 0;
          };
          if (isBinaryOperator()) return true;
          return this.identifier();
      }
    }
    startOfLeftExpression() {
      switch (tok()) {
        case Syntax.ThisKeyword:
        case Syntax.SuperKeyword:
        case Syntax.NullKeyword:
        case Syntax.TrueKeyword:
        case Syntax.FalseKeyword:
        case Syntax.NumericLiteral:
        case Syntax.BigIntLiteral:
        case Syntax.StringLiteral:
        case Syntax.NoSubstitutionLiteral:
        case Syntax.TemplateHead:
        case Syntax.OpenParenToken:
        case Syntax.OpenBracketToken:
        case Syntax.OpenBraceToken:
        case Syntax.FunctionKeyword:
        case Syntax.ClassKeyword:
        case Syntax.NewKeyword:
        case Syntax.SlashToken:
        case Syntax.SlashEqualsToken:
        case Syntax.Identifier:
          return true;
        case Syntax.ImportKeyword:
          return lookAhead(next.isOpenParenOrLessThanOrDot);
        default:
          return this.identifier();
      }
    }
    inOrOfKeyword(t: Syntax) {
      return t === Syntax.InKeyword || t === Syntax.OfKeyword;
    }
    templateStartOfTaggedTemplate() {
      return tok() === Syntax.NoSubstitutionLiteral || tok() === Syntax.TemplateHead;
    }
    objectOrObjectArrayTypeReference(n: qt.Typing): boolean {
      switch (n.kind) {
        case Syntax.ObjectKeyword:
          return true;
        case Syntax.ArrayTyping:
          return this.objectOrObjectArrayTypeReference((n as qc.ArrayTyping).elemType);
        default:
          return n.kind === Syntax.TypingReference && n.typeName.kind === Syntax.Identifier && n.typeName.escapedText === 'Object' && !n.typeArgs;
      }
    }
  })();
  const can = new (class {
    parseSemicolon() {
      if (tok() === Syntax.SemicolonToken) return true;
      return tok() === Syntax.CloseBraceToken || tok() === Syntax.EndOfFileToken || scanner.hasPrecedingLineBreak();
    }
    followModifier() {
      return tok() === Syntax.OpenBracketToken || tok() === Syntax.OpenBraceToken || tok() === Syntax.AsteriskToken || tok() === Syntax.Dot3Token || is.literalPropertyName();
    }
    followExportModifier() {
      return tok() !== Syntax.AsteriskToken && tok() !== Syntax.AsKeyword && tok() !== Syntax.OpenBraceToken && can.followModifier();
    }
    followContextualOfKeyword() {
      return next.isIdentifier() && next.tok() === Syntax.CloseParenToken;
    }
    followTypeArgsInExpression() {
      switch (tok()) {
        case Syntax.OpenParenToken: // foo<x>(
        case Syntax.NoSubstitutionLiteral: // foo<T> `...`
        case Syntax.TemplateHead: // foo<T> `...${100}...`
        case Syntax.DotToken: // foo<x>.
        case Syntax.CloseParenToken: // foo<x>)
        case Syntax.CloseBracketToken: // foo<x>]
        case Syntax.ColonToken: // foo<x>:
        case Syntax.SemicolonToken: // foo<x>;
        case Syntax.QuestionToken: // foo<x>?
        case Syntax.Equals2Token: // foo<x> ==
        case Syntax.Equals3Token: // foo<x> ===
        case Syntax.ExclamationEqualsToken: // foo<x> !=
        case Syntax.ExclamationEquals2Token: // foo<x> !==
        case Syntax.Ampersand2Token: // foo<x> &&
        case Syntax.Bar2Token: // foo<x> ||
        case Syntax.Question2Token: // foo<x> ??
        case Syntax.CaretToken: // foo<x> ^
        case Syntax.AmpersandToken: // foo<x> &
        case Syntax.BarToken: // foo<x> |
        case Syntax.CloseBraceToken: // foo<x> }
        case Syntax.EndOfFileToken: // foo<x>
          return true;
        case Syntax.CommaToken: // foo<x>,
        case Syntax.OpenBraceToken: // foo<x> {
        default:
          return false;
      }
    }
  })();
  const next = new (class {
    tok(check = true): Syntax {
      if (check && qy.is.keyword(currentToken) && (scanner.hasUnicodeEscape() || scanner.hasExtendedEscape())) {
        parse.errorAt(scanner.getTokenPos(), scanner.getTextPos(), qd.msgs.Keywords_cannot_contain_escape_characters);
      }
      return (currentToken = scanner.scan());
    }
    tokDoc(): DocSyntax {
      return (currentToken = scanner.scanDocToken());
    }
    canFollowModifier() {
      switch (tok()) {
        case Syntax.ConstKeyword:
          return this.tok() === Syntax.EnumKeyword;
        case Syntax.ExportKeyword:
          this.tok();
          if (tok() === Syntax.DefaultKeyword) return lookAhead(this.canFollowDefaultKeyword);
          if (tok() === Syntax.TypeKeyword) return lookAhead(this.canFollowExportModifier);
          return can.followExportModifier();
        case Syntax.DefaultKeyword:
          return this.canFollowDefaultKeyword();
        case Syntax.StaticKeyword:
        case Syntax.GetKeyword:
        case Syntax.SetKeyword:
          this.tok();
          return can.followModifier();
        default:
          return this.isOnSameLineAndCanFollowModifier();
      }
    }
    isOnSameLineAndCanFollowModifier() {
      this.tok();
      if (scanner.hasPrecedingLineBreak()) return false;
      return can.followModifier();
    }
    isNonwhitespaceTokenEndOfFile(): boolean {
      while (true) {
        next.tokDoc();
        if (tok() === Syntax.EndOfFileToken) return true;
        if (!(tok() === Syntax.WhitespaceTrivia || tok() === Syntax.NewLineTrivia)) return false;
      }
    }
    private canFollowExportModifier() {
      this.tok();
      return can.followExportModifier();
    }
    private canFollowDefaultKeyword() {
      this.tok();
      return (
        tok() === Syntax.ClassKeyword ||
        tok() === Syntax.FunctionKeyword ||
        tok() === Syntax.InterfaceKeyword ||
        (tok() === Syntax.AbstractKeyword && lookAhead(next.isClassKeywordOnSameLine)) ||
        (tok() === Syntax.AsyncKeyword && lookAhead(next.isFunctionKeywordOnSameLine))
      );
    }
    isIdentifier() {
      this.tok();
      return is.identifier();
    }
    isIdentifierOrKeyword() {
      this.tok();
      return qy.is.identifierOrKeyword(tok());
    }
    isIdentifierOrKeywordOrGreaterThan() {
      this.tok();
      return qy.is.identifierOrKeywordOrGreaterThan(tok());
    }
    isStartOfExpression() {
      this.tok();
      return is.startOfExpression();
    }
    isStartOfType() {
      this.tok();
      return is.startOfType();
    }
    isOpenParenOrLessThan() {
      this.tok();
      return tok() === Syntax.OpenParenToken || tok() === Syntax.LessThanToken;
    }
    isDot() {
      return this.tok() === Syntax.DotToken;
    }
    isOpenParenOrLessThanOrDot() {
      switch (this.tok()) {
        case Syntax.OpenParenToken:
        case Syntax.LessThanToken:
        case Syntax.DotToken:
          return true;
      }
      return false;
    }
    isNumericOrBigIntLiteral() {
      this.tok();
      return tok() === Syntax.NumericLiteral || tok() === Syntax.BigIntLiteral;
    }
    isIdentifierOrKeywordOrOpenBracketOrTemplate() {
      this.tok();
      return qy.is.identifierOrKeyword(tok()) || tok() === Syntax.OpenBracketToken || is.templateStartOfTaggedTemplate();
    }
    isIdentifierOrKeywordOnSameLine() {
      this.tok();
      return qy.is.identifierOrKeyword(tok()) && !scanner.hasPrecedingLineBreak();
    }
    isClassKeywordOnSameLine() {
      this.tok();
      return tok() === Syntax.ClassKeyword && !scanner.hasPrecedingLineBreak();
    }
    isFunctionKeywordOnSameLine() {
      this.tok();
      return tok() === Syntax.FunctionKeyword && !scanner.hasPrecedingLineBreak();
    }
    isIdentifierOrKeywordOrLiteralOnSameLine() {
      this.tok();
      return (qy.is.identifierOrKeyword(tok()) || tok() === Syntax.NumericLiteral || tok() === Syntax.BigIntLiteral || tok() === Syntax.StringLiteral) && !scanner.hasPrecedingLineBreak();
    }
    isIdentifierOrStartOfDestructuring() {
      this.tok();
      return is.identifier() || tok() === Syntax.OpenBraceToken || tok() === Syntax.OpenBracketToken;
    }
    isOpenParen() {
      return this.tok() === Syntax.OpenParenToken;
    }
    isSlash() {
      return this.tok() === Syntax.SlashToken;
    }
    isColonOrQuestionColon() {
      return this.tok() === Syntax.ColonToken || (tok() === Syntax.QuestionToken && this.tok() === Syntax.ColonToken);
    }
  })();
  const flags = new (class {
    value: NodeFlags = NodeFlags.None;
    set(v: boolean, fs: NodeFlags) {
      if (v) this.value |= fs;
      else this.value &= ~fs;
    }
    inContext(f: NodeFlags) {
      return (this.value & f) !== 0;
    }
    withContext<T>(f: NodeFlags, cb: () => T): T {
      const v = f & ~this.value;
      if (v) {
        this.set(true, v);
        const r = cb();
        this.set(false, v);
        return r;
      }
      return cb();
    }
    withoutContext<T>(f: NodeFlags, cb: () => T): T {
      const v = f & this.value;
      if (v) {
        this.set(false, v);
        const r = cb();
        this.set(true, v);
        return r;
      }
      return cb();
    }
    withDisallowIn<T>(cb: () => T): T {
      return this.withContext(NodeFlags.DisallowInContext, cb);
    }
    withoutDisallowIn<T>(cb: () => T): T {
      return this.withoutContext(NodeFlags.DisallowInContext, cb);
    }
    withYield<T>(cb: () => T): T {
      return this.withContext(NodeFlags.YieldContext, cb);
    }
    withDecorator<T>(cb: () => T): T {
      return this.withContext(NodeFlags.DecoratorContext, cb);
    }
    withAwait<T>(cb: () => T): T {
      return this.withContext(NodeFlags.AwaitContext, cb);
    }
    withoutAwait<T>(cb: () => T): T {
      return this.withoutContext(NodeFlags.AwaitContext, cb);
    }
    withYieldAndAwait<T>(cb: () => T): T {
      return this.withContext(NodeFlags.YieldContext | NodeFlags.AwaitContext, cb);
    }
    withoutYieldAndAwait<T>(cb: () => T): T {
      return this.withoutContext(NodeFlags.YieldContext | NodeFlags.AwaitContext, cb);
    }
  })();
  const create = new (class {
    nodeCount = 0;
    identifierCount = 0;
    source(fileName: string, languageVersion: qt.ScriptTarget, scriptKind: ScriptKind, declaration: boolean): SourceFile {
      const s = new SourceFileC(Syntax.SourceFile, 0, sourceText.length) as SourceFile;
      this.nodeCount++;
      s.text = sourceText;
      s.bindDiagnostics = [];
      s.bindSuggestionDiagnostics = undefined;
      s.languageVersion = languageVersion;
      s.fileName = normalizePath(fileName);
      s.languageVariant = getLanguage(scriptKind);
      s.isDeclarationFile = declaration;
      s.scriptKind = scriptKind;
      return s;
    }
    node<T extends Syntax>(k: T, pos?: number): qc.NodeType<T> {
      this.nodeCount++;
      const p = pos! >= 0 ? pos! : scanner.getStartPos();
      return Nobj.create<T>(k, p, p);
    }
    nodes<T extends Nobj>(es: T[], pos: number, end?: number): Nodes<T> {
      const l = es.length;
      const r = (l >= 1 && l <= 4 ? es.slice() : es) as qc.MutableNodes<T>;
      r.pos = pos;
      r.end = end === undefined ? scanner.getStartPos() : end;
      return r;
    }
    missingNode<T extends Nobj>(k: T['kind'], report: false, m?: qd.Message, arg0?: any): T;
    missingNode<T extends Nobj>(k: T['kind'], report: true, m: qd.Message, arg0?: any): T;
    missingNode<T extends Nobj>(k: T['kind'], report: boolean, m?: qd.Message, arg0?: any): T {
      if (report) parse.errorAtPosition(scanner.getStartPos(), 0, m!, arg0);
      else if (m) parse.errorAtToken(m, arg0);
      const r = this.node(k);
      if (k === Syntax.Identifier) (r as qc.Identifier).escapedText = '' as qu.__String;
      else if (qy.is.literal(k) || qy.is.templateLiteral(k)) (r as qc.LiteralLikeNode).text = '';
      return finishNode(r);
    }
    nodeWithDoc<T extends Syntax>(k: T, pos?: number): qc.NodeType<T> {
      const n = this.node(k, pos);
      if (scanner.getTokenFlags() & TokenFlags.PrecedingDocComment && (k !== Syntax.ExpressionStatement || tok() !== Syntax.OpenParenToken)) {
        addDocComment(n);
      }
      return n;
    }
    identifier(isIdentifier: boolean, m?: qd.Message, pm?: qd.Message): qc.Identifier {
      this.identifierCount++;
      if (isIdentifier) {
        const n = this.node(Syntax.Identifier);
        if (tok() !== Syntax.Identifier) n.originalKeywordKind = tok();
        n.escapedText = qy.get.escUnderscores(internIdentifier(scanner.getTokenValue()));
        next.tok(false);
        return finishNode(n);
      }
      if (tok() === Syntax.PrivateIdentifier) {
        parse.errorAtToken(pm || qd.msgs.Private_identifiers_are_not_allowed_outside_class_bodies);
        return this.identifier(true);
      }
      const report = tok() === Syntax.EndOfFileToken;
      const r = scanner.isReservedWord();
      const t = scanner.getTokenText();
      const dm = r ? qd.msgs.Identifier_expected_0_is_a_reserved_word_that_cannot_be_used_here : qd.msgs.Identifier_expected;
      return this.missingNode<qc.Identifier>(Syntax.Identifier, report, m || dm, t);
    }
    missingList<T extends Nobj>(): MissingList<T> {
      const l = this.nodes<T>([], getNodePos()) as MissingList<T>;
      l.isMissingList = true;
      return l;
    }
    qualifiedName(e: qt.EntityName, name: qc.Identifier): qc.QualifiedName {
      const n = this.node(Syntax.QualifiedName, e.pos);
      n.left = e;
      n.right = name;
      return finishNode(n);
    }
    postfixType(k: Syntax, type: qt.Typing) {
      next.tok();
      const n = this.node(k, type.pos) as OptionalTyping | DocOptionalTyping | DocNonNullableTyping | DocNullableTyping;
      n.type = type;
      return finishNode(n);
    }
    binaryExpression(l: qt.Expression, o: qc.BinaryOperatorToken, r: qt.Expression): qc.BinaryExpression {
      const n = this.node(Syntax.BinaryExpression, l.pos);
      n.left = l;
      n.operatorToken = o;
      n.right = r;
      return finishNode(n);
    }
    asExpression(l: qt.Expression, r: qt.Typing): qc.AsExpression {
      const n = this.node(Syntax.AsExpression, l.pos);
      n.expression = l;
      n.type = r;
      return finishNode(n);
    }
    doc(): Doc {
      const n = this.node(Syntax.DocComment, start);
      n.tags = tags && this.nodes(tags, tagsPos, tagsEnd);
      n.comment = comments.length ? comments.join('') : undefined;
      return finishNode(n, end);
    }
  })();
  const ctx = new (class {
    value = 0 as Context;
    init() {
      this.value = 0;
    }
    parseList<T extends Nobj>(c: Context, cb: () => T): Nodes<T> {
      const o = this.value;
      this.value |= 1 << c;
      const es = [] as T[];
      const p = getNodePos();
      while (!this.isListTerminator(c)) {
        if (this.isListElem(c, false)) {
          const e = this.parseListElem(c, cb);
          es.push(e);
          continue;
        }
        if (this.abort(c)) break;
      }
      this.value = o;
      return create.nodes(es, p);
    }
    parseBracketedList<T extends Nobj>(c: Context, cb: () => T, open: Syntax, close: Syntax): Nodes<T> {
      if (parse.expected(open)) {
        const r = this.parseDelimitedList(c, cb);
        parse.expected(close);
        return r;
      }
      return create.missingList<T>();
    }
    parseDelimitedList<T extends Nobj>(c: Context, cb: () => T, semicolon?: boolean): Nodes<T> {
      const o = this.value;
      this.value |= 1 << c;
      const es = [] as T[];
      const p = getNodePos();
      let s = -1;
      const commaDiag = () => {
        return c === Context.EnumMembers ? qd.msgs.An_enum_member_name_must_be_followed_by_a_or : undefined;
      };
      while (true) {
        if (this.isListElem(c, false)) {
          const sp = scanner.getStartPos();
          es.push(this.parseListElem(c, cb));
          s = scanner.getTokenPos();
          if (parse.optional(Syntax.CommaToken)) continue;
          s = -1;
          if (this.isListTerminator(c)) break;
          parse.expected(Syntax.CommaToken, commaDiag());
          if (semicolon && tok() === Syntax.SemicolonToken && !scanner.hasPrecedingLineBreak()) next.tok();
          if (sp === scanner.getStartPos()) next.tok();
          continue;
        }
        if (this.isListTerminator(c)) break;
        if (this.abort(c)) break;
      }
      this.value = o;
      const r = create.nodes(es, p);
      if (s >= 0) r.trailingComma = true;
      return r;
    }
    parseJsxChildren(tag: JsxOpeningElem | JsxOpeningFragment): Nodes<JsxChild> {
      const list = [];
      const listPos = getNodePos();
      const o = this.value;
      this.value |= 1 << Context.JsxChildren;
      while (true) {
        const child = parseJsx.child(tag, (currentToken = scanner.reScanJsxToken()));
        if (!child) break;
        list.push(child);
      }
      this.value = o;
      return create.nodes(list, listPos);
    }
    tryReuseAmbientDeclaration(): qc.Statement | undefined {
      return flags.withContext(NodeFlags.Ambient, () => {
        const n = this.nodeFor(this.value);
        if (n) return this.consumeNode(n) as qc.Statement;
        return;
      });
    }
    private nodeFor(c: Context): Node | undefined {
      const isReusable = () => {
        switch (c) {
          case Context.ClassMembers:
          case Context.SwitchClauses:
          case Context.SourceElems:
          case Context.BlockStatements:
          case Context.SwitchClauseStatements:
          case Context.EnumMembers:
          case Context.TypeMembers:
          case Context.VariableDeclarations:
          case Context.DocParams:
          case Context.Params:
            return true;
        }
        return false;
      };
      if (!syntaxCursor || !isReusable() || parseErrorBeforeNextFinishedNode) return;
      const n = syntaxCursor.currentNode(scanner.getStartPos());
      if (qf.is.missing(n) || n.intersectsChange || qf.has.parseError(n)) return;
      const fs = n.flags & NodeFlags.ContextFlags;
      if (fs !== flags.value) return;
      const canReuse = () => {
        switch (c) {
          case Context.ClassMembers:
            switch (n.kind) {
              case Syntax.Constructor:
              case Syntax.IndexSignature:
              case Syntax.GetAccessor:
              case Syntax.SetAccessor:
              case Syntax.PropertyDeclaration:
              case Syntax.SemicolonClassElem:
                return true;
              case Syntax.MethodDeclaration:
                const n2 = n as qc.MethodDeclaration;
                return !(n2.name.kind === Syntax.Identifier && n2.name.originalKeywordKind === Syntax.ConstructorKeyword);
            }
            break;
          case Context.SwitchClauses:
            switch (n.kind) {
              case Syntax.CaseClause:
              case Syntax.DefaultClause:
                return true;
            }
            break;
          case Context.SourceElems:
          case Context.BlockStatements:
          case Context.SwitchClauseStatements:
            switch (n.kind) {
              case Syntax.FunctionDeclaration:
              case Syntax.VariableStatement:
              case Syntax.Block:
              case Syntax.IfStatement:
              case Syntax.ExpressionStatement:
              case Syntax.ThrowStatement:
              case Syntax.ReturnStatement:
              case Syntax.SwitchStatement:
              case Syntax.BreakStatement:
              case Syntax.ContinueStatement:
              case Syntax.ForInStatement:
              case Syntax.ForOfStatement:
              case Syntax.ForStatement:
              case Syntax.WhileStatement:
              case Syntax.WithStatement:
              case Syntax.EmptyStatement:
              case Syntax.TryStatement:
              case Syntax.LabeledStatement:
              case Syntax.DoStatement:
              case Syntax.DebuggerStatement:
              case Syntax.ImportDeclaration:
              case Syntax.ImportEqualsDeclaration:
              case Syntax.ExportDeclaration:
              case Syntax.ExportAssignment:
              case Syntax.ModuleDeclaration:
              case Syntax.ClassDeclaration:
              case Syntax.InterfaceDeclaration:
              case Syntax.EnumDeclaration:
              case Syntax.TypeAliasDeclaration:
                return true;
            }
            break;
          case Context.EnumMembers:
            return n.kind === Syntax.EnumMember;
          case Context.TypeMembers:
            switch (n.kind) {
              case Syntax.ConstructSignature:
              case Syntax.MethodSignature:
              case Syntax.IndexSignature:
              case Syntax.PropertySignature:
              case Syntax.CallSignature:
                return true;
            }
            break;
          case Context.VariableDeclarations:
            if (n.kind === Syntax.VariableDeclaration) return (n as qc.VariableDeclaration).initer === undefined;
            break;
          case Context.DocParams:
          case Context.Params:
            if (n.kind === Syntax.Param) return (n as qc.ParamDeclaration).initer === undefined;
        }
        return false;
      };
      if (!canReuse()) return;
      if ((n as DocContainer).cache) (n as DocContainer).cache = undefined;
      return n;
    }
    private consumeNode(n: Node) {
      scanner.setTextPos(n.end);
      next.tok();
      return n;
    }
    private isListElem(c: Context, error: boolean) {
      if (this.nodeFor(c)) return true;
      switch (c) {
        case Context.SourceElems:
        case Context.BlockStatements:
        case Context.SwitchClauseStatements:
          return !(tok() === Syntax.SemicolonToken && error) && is.startOfStatement();
        case Context.SwitchClauses:
          return tok() === Syntax.CaseKeyword || tok() === Syntax.DefaultKeyword;
        case Context.TypeMembers:
          const isTypeMemberStart = () => {
            if (tok() === Syntax.OpenParenToken || tok() === Syntax.LessThanToken) return true;
            let idToken = false;
            while (qy.is.modifier(tok())) {
              idToken = true;
              next.tok();
            }
            if (tok() === Syntax.OpenBracketToken) return true;
            if (is.literalPropertyName()) {
              idToken = true;
              next.tok();
            }
            if (idToken) {
              return (
                tok() === Syntax.OpenParenToken ||
                tok() === Syntax.LessThanToken ||
                tok() === Syntax.QuestionToken ||
                tok() === Syntax.ColonToken ||
                tok() === Syntax.CommaToken ||
                can.parseSemicolon()
              );
            }
            return false;
          };
          return lookAhead(isTypeMemberStart);
        case Context.ClassMembers:
          const isClassMemberStart = () => {
            let t: Syntax | undefined;
            if (tok() === Syntax.AtToken) return true;
            while (qy.is.modifier(tok())) {
              t = tok();
              if (qy.is.classMemberModifier(t)) return true;
              next.tok();
            }
            if (tok() === Syntax.AsteriskToken) return true;
            if (is.literalPropertyName()) {
              t = tok();
              next.tok();
            }
            if (tok() === Syntax.OpenBracketToken) return true;
            if (t !== undefined) {
              if (!qy.is.keyword(t) || t === Syntax.SetKeyword || t === Syntax.GetKeyword) return true;
              switch (tok()) {
                case Syntax.OpenParenToken:
                case Syntax.LessThanToken:
                case Syntax.ExclamationToken:
                case Syntax.ColonToken:
                case Syntax.EqualsToken:
                case Syntax.QuestionToken:
                  return true;
                default:
                  return can.parseSemicolon();
              }
            }
            return false;
          };
          return lookAhead(isClassMemberStart) || (tok() === Syntax.SemicolonToken && !error);
        case Context.EnumMembers:
          return tok() === Syntax.OpenBracketToken || is.literalPropertyName();
        case Context.ObjectLiteralMembers:
          switch (tok()) {
            case Syntax.OpenBracketToken:
            case Syntax.AsteriskToken:
            case Syntax.Dot3Token:
            case Syntax.DotToken:
              return true;
            default:
              return is.literalPropertyName();
          }
        case Context.RestProperties:
          return is.literalPropertyName();
        case Context.ObjectBindingElems:
          return tok() === Syntax.OpenBracketToken || tok() === Syntax.Dot3Token || is.literalPropertyName();
        case Context.HeritageClauseElem:
          const isHeritageClauseObjectLiteral = () => {
            qu.assert(tok() === Syntax.OpenBraceToken);
            if (next.tok() === Syntax.CloseBraceToken) {
              const t = next.tok();
              return t === Syntax.CommaToken || t === Syntax.OpenBraceToken || t === Syntax.ExtendsKeyword || t === Syntax.ImplementsKeyword;
            }
            return true;
          };
          if (tok() === Syntax.OpenBraceToken) return lookAhead(isHeritageClauseObjectLiteral);
          const isExtendsOrImplementsKeyword = () => {
            if (tok() === Syntax.ImplementsKeyword || tok() === Syntax.ExtendsKeyword) return lookAhead(next.isStartOfExpression);
            return false;
          };
          if (!error) return is.startOfLeftExpression() && !isExtendsOrImplementsKeyword();
          return is.identifier() && !isExtendsOrImplementsKeyword();
        case Context.VariableDeclarations:
          return is.identifierOrPrivateIdentifierOrPattern();
        case Context.ArrayBindingElems:
          return tok() === Syntax.CommaToken || tok() === Syntax.Dot3Token || is.identifierOrPrivateIdentifierOrPattern();
        case Context.TypeParams:
          return is.identifier();
        case Context.ArrayLiteralMembers:
          switch (tok()) {
            case Syntax.CommaToken:
            case Syntax.DotToken:
              return true;
          }
        case Context.ArgExpressions:
          return tok() === Syntax.Dot3Token || is.startOfExpression();
        case Context.Params:
          return is.startOfParam(false);
        case Context.DocParams:
          return is.startOfParam(true);
        case Context.TypeArgs:
        case Context.TupleElemTypes:
          return tok() === Syntax.CommaToken || is.startOfType();
        case Context.HeritageClauses:
          return is.heritageClause();
        case Context.ImportOrExportSpecifiers:
          return qy.is.identifierOrKeyword(tok());
        case Context.JsxAttributes:
          return qy.is.identifierOrKeyword(tok()) || tok() === Syntax.OpenBraceToken;
        case Context.JsxChildren:
          return true;
      }
      return qu.fail("Non-exhaustive case in 'isListElem'.");
    }
    private isListTerminator(c: Context) {
      if (tok() === Syntax.EndOfFileToken) return true;
      switch (c) {
        case Context.BlockStatements:
        case Context.SwitchClauses:
        case Context.TypeMembers:
        case Context.ClassMembers:
        case Context.EnumMembers:
        case Context.ObjectLiteralMembers:
        case Context.ObjectBindingElems:
        case Context.ImportOrExportSpecifiers:
          return tok() === Syntax.CloseBraceToken;
        case Context.SwitchClauseStatements:
          return tok() === Syntax.CloseBraceToken || tok() === Syntax.CaseKeyword || tok() === Syntax.DefaultKeyword;
        case Context.HeritageClauseElem:
          return tok() === Syntax.OpenBraceToken || tok() === Syntax.ExtendsKeyword || tok() === Syntax.ImplementsKeyword;
        case Context.VariableDeclarations:
          const isTerminator = () => {
            if (can.parseSemicolon()) return true;
            if (is.inOrOfKeyword(tok())) return true;
            if (tok() === Syntax.EqualsGreaterThanToken) return true;
            return false;
          };
          return isTerminator();
        case Context.TypeParams:
          return tok() === Syntax.GreaterThanToken || tok() === Syntax.OpenParenToken || tok() === Syntax.OpenBraceToken || tok() === Syntax.ExtendsKeyword || tok() === Syntax.ImplementsKeyword;
        case Context.ArgExpressions:
          return tok() === Syntax.CloseParenToken || tok() === Syntax.SemicolonToken;
        case Context.ArrayLiteralMembers:
        case Context.TupleElemTypes:
        case Context.ArrayBindingElems:
          return tok() === Syntax.CloseBracketToken;
        case Context.DocParams:
        case Context.Params:
        case Context.RestProperties:
          return tok() === Syntax.CloseParenToken || tok() === Syntax.CloseBracketToken;
        case Context.TypeArgs:
          return tok() !== Syntax.CommaToken;
        case Context.HeritageClauses:
          return tok() === Syntax.OpenBraceToken || tok() === Syntax.CloseBraceToken;
        case Context.JsxAttributes:
          return tok() === Syntax.GreaterThanToken || tok() === Syntax.SlashToken;
        case Context.JsxChildren:
          return tok() === Syntax.LessThanToken && lookAhead(next.isSlash);
        default:
          return false;
      }
    }
    private parseListElem<T extends Node>(c: Context, cb: () => T): T {
      const n = this.nodeFor(c);
      if (n) return this.consumeNode(n) as T;
      return cb();
    }
    private abort(c: Context) {
      const errors = (): qd.Message => {
        switch (c) {
          case Context.SourceElems:
            return qd.msgs.Declaration_or_statement_expected;
          case Context.BlockStatements:
            return qd.msgs.Declaration_or_statement_expected;
          case Context.SwitchClauses:
            return qd.msgs.case_or_default_expected;
          case Context.SwitchClauseStatements:
            return qd.msgs.Statement_expected;
          case Context.RestProperties:
          case Context.TypeMembers:
            return qd.msgs.Property_or_signature_expected;
          case Context.ClassMembers:
            return qd.msgs.Unexpected_token_A_constructor_method_accessor_or_property_was_expected;
          case Context.EnumMembers:
            return qd.msgs.Enum_member_expected;
          case Context.HeritageClauseElem:
            return qd.msgs.Expression_expected;
          case Context.VariableDeclarations:
            return qd.msgs.Variable_declaration_expected;
          case Context.ObjectBindingElems:
            return qd.msgs.Property_destructuring_pattern_expected;
          case Context.ArrayBindingElems:
            return qd.msgs.Array_elem_destructuring_pattern_expected;
          case Context.ArgExpressions:
            return qd.msgs.Arg_expression_expected;
          case Context.ObjectLiteralMembers:
            return qd.msgs.Property_assignment_expected;
          case Context.ArrayLiteralMembers:
            return qd.msgs.Expression_or_comma_expected;
          case Context.DocParams:
            return qd.msgs.Param_declaration_expected;
          case Context.Params:
            return qd.msgs.Param_declaration_expected;
          case Context.TypeParams:
            return qd.msgs.Type_param_declaration_expected;
          case Context.TypeArgs:
            return qd.msgs.Type_arg_expected;
          case Context.TupleElemTypes:
            return qd.msgs.Type_expected;
          case Context.HeritageClauses:
            return qd.msgs.Unexpected_token_expected;
          case Context.ImportOrExportSpecifiers:
            return qd.msgs.Identifier_expected;
          case Context.JsxAttributes:
            return qd.msgs.Identifier_expected;
          case Context.JsxChildren:
            return qd.msgs.Identifier_expected;
          default:
            return undefined!;
        }
      };
      parse.errorAtToken(errors());
      for (let c = 0; c < Context.Count; c++) {
        if (this.value & (1 << c)) {
          if (this.isListElem(c, true) || this.isListTerminator(c)) return true;
        }
      }
      next.tok();
      return false;
    }
  })();
  const parse = new (class {
    source(fileName: string, t: string, languageVersion: qt.ScriptTarget, syntaxCursor?: IncrementalParser.SyntaxCursor, setParentNodes = false, scriptKind?: ScriptKind): SourceFile {
      scriptKind = ensureScriptKind(fileName, scriptKind);
      if (scriptKind === ScriptKind.JSON) {
        const r = this.jsonText(fileName, t, languageVersion, syntaxCursor, setParentNodes);
        convertToObjectWorker(r, r.diags, false, undefined, undefined);
        r.referencedFiles = emptyArray;
        r.typeReferenceDirectives = emptyArray;
        r.libReferenceDirectives = emptyArray;
        r.amdDependencies = emptyArray;
        r.hasNoDefaultLib = false;
        r.pragmas = qu.emptyMap;
        return r;
      }
      initializeState(t, languageVersion, syntaxCursor, scriptKind);
      const declaration = fileExtensionIs(fileName, Extension.Dts);
      if (declaration) flags.value |= NodeFlags.Ambient;
      source = create.source(fileName, languageVersion, scriptKind, declaration);
      source.flags = flags.value;
      next.tok();
      processCommentPragmas((source as {}) as PragmaContext, t);
      const reportPragmaDiagnostic = (pos: number, end: number, diagnostic: qd.Message) => {
        diags.push(qf.create.fileDiagnostic(source, pos, end, diagnostic));
      };
      processPragmasIntoFields((source as {}) as PragmaContext, reportPragmaDiagnostic);
      source.statements = ctx.parseList(Context.SourceElems, parse.statement);
      qu.assert(tok() === Syntax.EndOfFileToken);
      source.endOfFileToken = addDocComment(parse.tokenNode());
      const getImportMetaIfNecessary = () => {
        const isImportMeta = (n: Node): boolean => {
          return n.kind === Syntax.MetaProperty && n.keywordToken === Syntax.ImportKeyword && n.name.escapedText === 'meta';
        };
        const walkTreeForExternalModuleIndicators = (n: Node): Node | undefined => {
          return isImportMeta(n) ? n : qf.each.child(n, walkTreeForExternalModuleIndicators);
        };
        return source.flags & NodeFlags.PossiblyContainsImportMeta ? walkTreeForExternalModuleIndicators(source) : undefined;
      };
      const isAnExternalModuleIndicatorNode = (n: Node) => {
        return hasModifierOfKind(n, Syntax.ExportKeyword) ||
          (n.kind === Syntax.ImportEqualsDeclaration && n.moduleReference.kind === Syntax.ExternalModuleReference) ||
          n.kind === Syntax.ImportDeclaration ||
          n.kind === Syntax.ExportAssignment ||
          n.kind === Syntax.ExportDeclaration
          ? n
          : undefined;
      };
      source.externalModuleIndicator = forEach(source.statements, isAnExternalModuleIndicatorNode) || getImportMetaIfNecessary();
      source.commentDirectives = scanner.getDirectives();
      source.nodeCount = create.nodeCount;
      source.identifierCount = create.identifierCount;
      source.identifiers = identifiers;
      source.parseDiagnostics = diags;
      if (setParentNodes) fixupParentReferences(source);
      const r = source;
      clearState();
      return r;
    }
    jsonText(fileName: string, text: string, lang: qt.ScriptTarget = qt.ScriptTarget.ES2020, syntaxCursor?: IncrementalParser.SyntaxCursor, setParentNodes?: boolean): JsonSourceFile {
      initializeState(text, lang, syntaxCursor, ScriptKind.JSON);
      source = create.source(fileName, qt.ScriptTarget.ES2020, ScriptKind.JSON, false);
      source.flags = flags.value;
      next.tok();
      const p = getNodePos();
      if (tok() === Syntax.EndOfFileToken) {
        source.statements = create.nodes([], p, p);
        source.endOfFileToken = parse.tokenNode<EndOfFileToken>();
      } else {
        const n = create.node(Syntax.ExpressionStatement) as JsonObjectExpressionStatement;
        switch (tok()) {
          case Syntax.OpenBracketToken:
            n.expression = parse.arrayLiteralExpression();
            break;
          case Syntax.TrueKeyword:
          case Syntax.FalseKeyword:
          case Syntax.NullKeyword:
            n.expression = parse.tokenNode<BooleanLiteral | NullLiteral>();
            break;
          case Syntax.MinusToken:
            if (lookAhead(() => next.tok() === Syntax.NumericLiteral && next.tok() !== Syntax.ColonToken)) n.expression = parse.prefixUnaryExpression() as JsonMinusNumericLiteral;
            else n.expression = this.objectLiteralExpression();
            break;
          case Syntax.NumericLiteral:
          case Syntax.StringLiteral:
            if (lookAhead(() => next.tok() !== Syntax.ColonToken)) {
              n.expression = parse.literalNode() as qc.StringLiteral | qc.NumericLiteral;
              break;
            }
          default:
            n.expression = this.objectLiteralExpression();
            break;
        }
        finishNode(n);
        source.statements = create.nodes([n], p);
        source.endOfFileToken = parse.expectedToken(Syntax.EndOfFileToken, qd.msgs.Unexpected_token);
      }
      if (setParentNodes) fixupParentReferences(source);
      source.nodeCount = create.nodeCount;
      source.identifierCount = create.identifierCount;
      source.identifiers = identifiers;
      source.parseDiagnostics = diags;
      const r = source as JsonSourceFile;
      clearState();
      return r;
    }
    isolatedEntityName(s: string, languageVersion: qt.ScriptTarget): qt.EntityName | undefined {
      initializeState(s, languageVersion, undefined, ScriptKind.JS);
      next.tok();
      const n = parse.entityName(true);
      const invalid = tok() === Syntax.EndOfFileToken && !diags.length;
      clearState();
      return invalid ? n : undefined;
    }
    expected(t: Syntax, m?: qd.Message, advance = true): boolean {
      if (tok() === t) {
        if (advance) next.tok();
        return true;
      }
      if (m) this.errorAtToken(m);
      else this.errorAtToken(qd.msgs._0_expected, qy.toString(t));
      return false;
    }
    expectedToken<T extends Syntax>(t: T, m?: qd.Message, arg0?: any): Token<T>;
    expectedToken(t: Syntax, m?: qd.Message, arg0?: any): Node {
      return this.optionalToken(t) || create.missingNode(t, false, m || qd.msgs._0_expected, arg0 || qy.toString(t));
    }
    optional(t: Syntax): boolean {
      if (tok() === t) {
        next.tok();
        return true;
      }
      return false;
    }
    optionalToken<T extends Syntax>(t: T): Token<T>;
    optionalToken(t: Syntax): Node | undefined {
      if (tok() === t) return this.tokenNode();
      return;
    }
    tokenNode<T extends Node>(): T {
      const n = create.node(tok());
      next.tok();
      return finishNode(n);
    }
    semicolon(): boolean {
      if (can.parseSemicolon()) {
        if (tok() === Syntax.SemicolonToken) next.tok();
        return true;
      }
      return this.expected(Syntax.SemicolonToken);
    }
    identifier(m?: qd.Message, pm?: qd.Message): qc.Identifier {
      return create.identifier(is.identifier(), m, pm);
    }
    identifierName(m?: qd.Message): qc.Identifier {
      return create.identifier(qy.is.identifierOrKeyword(tok()), m);
    }
    propertyName(computed = true): qc.PropertyName {
      if (tok() === Syntax.StringLiteral || tok() === Syntax.NumericLiteral) {
        const n = this.literalNode() as qc.StringLiteral | qc.NumericLiteral;
        n.text = internIdentifier(n.text);
        return n;
      }
      if (computed && tok() === Syntax.OpenBracketToken) return this.computedPropertyName();
      if (tok() === Syntax.PrivateIdentifier) return this.privateIdentifier();
      return this.identifierName();
    }
    computedPropertyName(): qc.ComputedPropertyName {
      const n = create.node(Syntax.ComputedPropertyName);
      this.expected(Syntax.OpenBracketToken);
      n.expression = flags.withoutDisallowIn(this.expression);
      this.expected(Syntax.CloseBracketToken);
      return finishNode(n);
    }
    privateIdentifier(): qc.PrivateIdentifier {
      const n = create.node(Syntax.PrivateIdentifier);
      const internPrivateIdentifier = (s: string): string => {
        let i = privateIdentifiers.get(s);
        if (i === undefined) privateIdentifiers.set(s, (i = s));
        return i;
      };
      n.escapedText = qy.get.escUnderscores(internPrivateIdentifier(scanner.getTokenText()));
      next.tok();
      return finishNode(n);
    }
    contextualModifier(t: Syntax): boolean {
      return tok() === t && tryParse(next.canFollowModifier);
    }
    entityName(reserved: boolean, m?: qd.Message): qt.EntityName {
      let e: qt.EntityName = reserved ? this.identifierName(m) : this.identifier(m);
      let p = scanner.getStartPos();
      while (this.optional(Syntax.DotToken)) {
        if (tok() === Syntax.LessThanToken) {
          e.jsdocDotPos = p;
          break;
        }
        p = scanner.getStartPos();
        e = create.qualifiedName(e, this.rightSideOfDot(reserved, false) as qc.Identifier);
      }
      return e;
    }
    rightSideOfDot(allow: boolean, privates: boolean): qc.Identifier | qc.PrivateIdentifier {
      if (scanner.hasPrecedingLineBreak() && qy.is.identifierOrKeyword(tok())) {
        const m = lookAhead(next.isIdentifierOrKeywordOnSameLine);
        if (m) return create.missingNode<qc.Identifier>(Syntax.Identifier, true, qd.msgs.Identifier_expected);
      }
      if (tok() === Syntax.PrivateIdentifier) {
        const n = this.privateIdentifier();
        return privates ? n : create.missingNode<qc.Identifier>(Syntax.Identifier, true, qd.msgs.Identifier_expected);
      }
      return allow ? this.identifierName() : this.identifier();
    }
    templateExpression(tagged: boolean): qc.TemplateExpression {
      const n = create.node(Syntax.TemplateExpression);
      const templateHead = (): qc.TemplateHead => {
        if (tagged) reScanHeadOrNoSubstTemplate();
        const n2 = this.literalLikeNode(tok());
        qu.assert(n2.kind === Syntax.TemplateHead, 'Template head has wrong token kind');
        return n2 as qc.TemplateHead;
      };
      n.head = templateHead();
      qu.assert(n.head.kind === Syntax.TemplateHead, 'Template head has wrong token kind');
      const ss = [];
      const p = getNodePos();
      do {
        ss.push(this.templateSpan(tagged));
      } while (last(ss).literal.kind === Syntax.TemplateMiddle);
      n.templateSpans = create.nodes(ss, p);
      return finishNode(n);
    }
    templateSpan(tagged: boolean): qc.TemplateSpan {
      const n = create.node(Syntax.TemplateSpan);
      n.expression = flags.withoutDisallowIn(this.expression);
      let l: qc.TemplateMiddle | qc.TemplateTail;
      if (tok() === Syntax.CloseBraceToken) {
        reScanTemplateToken(tagged);
        const middleOrTail = (): qc.TemplateMiddle | qc.TemplateTail => {
          const n2 = this.literalLikeNode(tok());
          qu.assert(n2.kind === Syntax.TemplateMiddle || n2.kind === Syntax.TemplateTail, 'Template fragment has wrong token kind');
          return n2 as qc.TemplateMiddle | qc.TemplateTail;
        };
        l = middleOrTail();
      } else {
        l = this.expectedToken(Syntax.TemplateTail, qd.msgs._0_expected, qy.toString(Syntax.CloseBraceToken)) as qc.TemplateTail;
      }
      n.literal = l;
      return finishNode(n);
    }
    literalNode(): qc.LiteralExpression {
      return this.literalLikeNode(tok()) as qc.LiteralExpression;
    }
    literalLikeNode(k: Syntax): qc.LiteralLikeNode {
      const n = create.node(k);
      n.text = scanner.getTokenValue();
      switch (k) {
        case Syntax.NoSubstitutionLiteral:
        case Syntax.TemplateHead:
        case Syntax.TemplateMiddle:
        case Syntax.TemplateTail:
          const last = k === Syntax.NoSubstitutionLiteral || k === Syntax.TemplateTail;
          const t = scanner.getTokenText();
          (<TemplateLiteralLikeNode>n).rawText = t.substring(1, t.length - (scanner.isUnterminated() ? 0 : last ? 1 : 2));
          break;
      }
      if (scanner.hasExtendedEscape()) n.hasExtendedEscape = true;
      if (scanner.isUnterminated()) n.isUnterminated = true;
      if (n.kind === Syntax.NumericLiteral) (<NumericLiteral>n).numericLiteralFlags = scanner.getTokenFlags() & TokenFlags.NumericLiteralFlags;
      if (qy.is.templateLiteral(n.kind)) (<TemplateHead | qc.TemplateMiddle | qc.TemplateTail | NoSubstitutionLiteral>n).templateFlags = scanner.getTokenFlags() & TokenFlags.ContainsInvalidEscape;
      next.tok();
      finishNode(n);
      return n;
    }
    typeReference(): qt.TypingReference {
      const n = create.node(Syntax.TypingReference);
      n.typeName = this.entityName(true, qd.msgs.Type_expected);
      if (!scanner.hasPrecedingLineBreak() && reScanLessToken() === Syntax.LessThanToken) {
        n.typeArgs = ctx.parseBracketedList(Context.TypeArgs, this.type, Syntax.LessThanToken, Syntax.GreaterThanToken);
      }
      return finishNode(n);
    }
    thisTypePredicate(lhs: qc.ThisTyping): qt.TypingPredicate {
      next.tok();
      const n = create.node(Syntax.TypingPredicate, lhs.pos);
      n.paramName = lhs;
      n.type = this.type();
      return finishNode(n);
    }
    thisTypeNode(): qc.ThisTyping {
      const n = create.node(Syntax.ThisTyping);
      next.tok();
      return finishNode(n);
    }
    typeQuery(): qt.TypingQuery {
      const n = create.node(Syntax.TypingQuery);
      this.expected(Syntax.TypeOfKeyword);
      n.exprName = this.entityName(true);
      return finishNode(n);
    }
    typeParam(): qc.TypeParamDeclaration {
      const n = create.node(Syntax.TypeParam);
      n.name = this.identifier();
      if (this.optional(Syntax.ExtendsKeyword)) {
        if (is.startOfType() || !is.startOfExpression()) n.constraint = this.type();
        else n.expression = this.unaryExpressionOrHigher();
      }
      if (this.optional(Syntax.EqualsToken)) n.default = this.type();
      return finishNode(n);
    }
    typeParams(): Nodes<qc.TypeParamDeclaration> | undefined {
      if (tok() === Syntax.LessThanToken) return ctx.parseBracketedList(Context.TypeParams, this.typeParam, Syntax.LessThanToken, Syntax.GreaterThanToken);
      return;
    }
    param(): qc.ParamDeclaration {
      const n = create.nodeWithDoc(Syntax.Param);
      const paramType = (): qt.Typing | undefined => {
        if (this.optional(Syntax.ColonToken)) return this.type();
        return;
      };
      if (tok() === Syntax.ThisKeyword) {
        n.name = create.identifier(true);
        n.type = paramType();
        return finishNode(n);
      }
      n.decorators = this.decorators();
      n.modifiers = this.modifiers();
      n.dot3Token = this.optionalToken(Syntax.Dot3Token);
      n.name = this.identifierOrPattern(qd.msgs.Private_identifiers_cannot_be_used_as_params);
      if (qf.get.fullWidth(n.name) === 0 && !n.modifiers && qy.is.modifier(tok())) next.tok();
      n.questionToken = this.optionalToken(Syntax.QuestionToken);
      n.type = paramType();
      n.initer = this.initer();
      return finishNode(n);
    }
    paramList(s: qc.SignatureDeclaration, f: SignatureFlags): boolean {
      if (!this.expected(Syntax.OpenParenToken)) {
        s.params = create.missingList<qc.ParamDeclaration>();
        return false;
      }
      const yf = flags.inContext(NodeFlags.YieldContext);
      const af = flags.inContext(NodeFlags.AwaitContext);
      flags.set(!!(f & SignatureFlags.Yield), NodeFlags.YieldContext);
      flags.set(!!(f & SignatureFlags.Await), NodeFlags.AwaitContext);
      s.params = f & SignatureFlags.Doc ? ctx.parseDelimitedList(Context.DocParams, this.param) : ctx.parseDelimitedList(Context.Params, this.param);
      flags.set(yf, NodeFlags.YieldContext);
      flags.set(af, NodeFlags.AwaitContext);
      return this.expected(Syntax.CloseParenToken);
    }
    typeMemberSemicolon() {
      if (this.optional(Syntax.CommaToken)) return;
      this.semicolon();
    }
    signatureMember(k: Syntax.CallSignature | Syntax.ConstructSignature): qc.CallSignatureDeclaration | ConstructSignatureDeclaration {
      const n = create.nodeWithDoc(k);
      if (k === Syntax.ConstructSignature) this.expected(Syntax.NewKeyword);
      fillSignature(Syntax.ColonToken, SignatureFlags.Type, n);
      this.typeMemberSemicolon();
      return finishNode(n);
    }
    indexSignatureDeclaration(n: qc.IndexSignatureDeclaration): qc.IndexSignatureDeclaration {
      n.kind = Syntax.IndexSignature;
      n.params = ctx.parseBracketedList(Context.Params, this.param, Syntax.OpenBracketToken, Syntax.CloseBracketToken);
      n.type = this.typeAnnotation();
      this.typeMemberSemicolon();
      return finishNode(n);
    }
    propertyOrMethodSignature(n: PropertySignature | MethodSignature): PropertySignature | MethodSignature {
      n.name = this.propertyName();
      n.questionToken = this.optionalToken(Syntax.QuestionToken);
      if (tok() === Syntax.OpenParenToken || tok() === Syntax.LessThanToken) {
        n.kind = Syntax.MethodSignature;
        fillSignature(Syntax.ColonToken, SignatureFlags.Type, <MethodSignature>n);
      } else {
        n.kind = Syntax.PropertySignature;
        n.type = this.typeAnnotation();
        if (tok() === Syntax.EqualsToken) (<PropertySignature>n).initer = this.initer();
      }
      this.typeMemberSemicolon();
      return finishNode(n);
    }
    typeLiteral(): qt.TypingLiteral {
      const n = create.node(Syntax.TypingLiteral);
      n.members = this.objectTypeMembers();
      return finishNode(n);
    }
    objectTypeMembers(): Nodes<qc.TypeElem> {
      let es: Nodes<qc.TypeElem>;
      if (this.expected(Syntax.OpenBraceToken)) {
        const typeMember = (): qc.TypeElem => {
          if (tok() === Syntax.OpenParenToken || tok() === Syntax.LessThanToken) return this.signatureMember(Syntax.CallSignature);
          if (tok() === Syntax.NewKeyword && lookAhead(next.isOpenParenOrLessThan)) return this.signatureMember(Syntax.ConstructSignature);
          const n = create.nodeWithDoc(Syntax.Unknown);
          n.modifiers = this.modifiers();
          if (is.indexSignature()) return this.indexSignatureDeclaration(<qc.IndexSignatureDeclaration>n);
          return this.propertyOrMethodSignature(<qc.PropertySignature | qc.MethodSignature>n);
        };
        es = ctx.parseList(Context.TypeMembers, typeMember);
        this.expected(Syntax.CloseBraceToken);
      } else es = create.missingList<qc.TypeElem>();
      return es;
    }
    mappedTypeParam() {
      const n = create.node(Syntax.TypeParam);
      n.name = this.identifier();
      this.expected(Syntax.InKeyword);
      n.constraint = this.type();
      return finishNode(n);
    }
    mappedType() {
      const n = create.node(Syntax.MappedTyping);
      this.expected(Syntax.OpenBraceToken);
      if (tok() === Syntax.ReadonlyKeyword || tok() === Syntax.PlusToken || tok() === Syntax.MinusToken) {
        n.readonlyToken = this.tokenNode<qc.ReadonlyToken | qc.PlusToken | qc.MinusToken>();
        if (n.readonlyToken.kind !== Syntax.ReadonlyKeyword) this.expectedToken(Syntax.ReadonlyKeyword);
      }
      this.expected(Syntax.OpenBracketToken);
      n.typeParam = this.mappedTypeParam();
      this.expected(Syntax.CloseBracketToken);
      if (tok() === Syntax.QuestionToken || tok() === Syntax.PlusToken || tok() === Syntax.MinusToken) {
        n.questionToken = this.tokenNode<qc.QuestionToken | qc.PlusToken | qc.MinusToken>();
        if (n.questionToken.kind !== Syntax.QuestionToken) this.expectedToken(Syntax.QuestionToken);
      }
      n.type = this.typeAnnotation();
      this.semicolon();
      this.expected(Syntax.CloseBraceToken);
      return finishNode(n);
    }
    tupleElemType() {
      const p = getNodePos();
      if (this.optional(Syntax.Dot3Token)) {
        const n = create.node(Syntax.RestTyping, p);
        n.type = this.type();
        return finishNode(n);
      }
      const t = this.type();
      if (!(flags.value & NodeFlags.Doc) && t.kind === Syntax.DocNullableTyping && t.pos === (<DocNullableTyping>t).type.pos) t.kind = Syntax.OptionalTyping;
      return t;
    }
    tupleType(): qc.TupleTyping {
      const n = create.node(Syntax.TupleTyping);
      const nameOrType = () => {
        const isTupleElemName = () => {
          if (tok() === Syntax.Dot3Token) return qy.is.identifierOrKeyword(next.tok()) && next.isColonOrQuestionColon();
          return qy.is.identifierOrKeyword(tok()) && next.isColonOrQuestionColon();
        };
        if (lookAhead(isTupleElemName)) {
          const n = create.node(Syntax.NamedTupleMember);
          n.dot3Token = this.optionalToken(Syntax.Dot3Token);
          n.name = this.identifierName();
          n.questionToken = this.optionalToken(Syntax.QuestionToken);
          this.expected(Syntax.ColonToken);
          n.type = this.tupleElemType();
          return addDocComment(finishNode(n));
        }
        return this.tupleElemType();
      };
      n.elems = ctx.parseBracketedList(Context.TupleElemTypes, nameOrType, Syntax.OpenBracketToken, Syntax.CloseBracketToken);
      return finishNode(n);
    }
    parenthesizedType(): qt.Typing {
      const n = create.node(Syntax.ParenthesizedTyping);
      this.expected(Syntax.OpenParenToken);
      n.type = this.type();
      this.expected(Syntax.CloseParenToken);
      return finishNode(n);
    }
    functionOrConstructorType(): qt.Typing {
      const p = getNodePos();
      const k = this.optional(Syntax.NewKeyword) ? Syntax.ConstructorTyping : Syntax.FunctionTyping;
      const n = create.nodeWithDoc(k, p);
      fillSignature(Syntax.EqualsGreaterThanToken, SignatureFlags.Type, n);
      return finishNode(n);
    }
    keywordAndNoDot(): qt.Typing | undefined {
      const n = this.tokenNode<qt.Typing>();
      return tok() === Syntax.DotToken ? undefined : n;
    }
    literalTypeNode(negative?: boolean): qc.LiteralTyping {
      const n = create.node(Syntax.LiteralTyping);
      let m!: qc.PrefixUnaryExpression;
      if (negative) {
        m = create.node(Syntax.PrefixUnaryExpression);
        m.operator = Syntax.MinusToken;
        next.tok();
      }
      let e: BooleanLiteral | qc.LiteralExpression | qc.PrefixUnaryExpression =
        tok() === Syntax.TrueKeyword || tok() === Syntax.FalseKeyword ? this.tokenNode<BooleanLiteral>() : (this.literalLikeNode(tok()) as qc.LiteralExpression);
      if (negative) {
        m.operand = e;
        finishNode(m);
        e = m;
      }
      n.literal = e;
      return finishNode(n);
    }
    importType(): qc.ImportTyping {
      source.flags |= NodeFlags.PossiblyContainsDynamicImport;
      const n = create.node(Syntax.ImportTyping);
      if (this.optional(Syntax.TypeOfKeyword)) n.isTypeOf = true;
      this.expected(Syntax.ImportKeyword);
      this.expected(Syntax.OpenParenToken);
      n.arg = this.type();
      this.expected(Syntax.CloseParenToken);
      if (this.optional(Syntax.DotToken)) n.qualifier = this.entityName(true, qd.msgs.Type_expected);
      if (!scanner.hasPrecedingLineBreak() && reScanLessToken() === Syntax.LessThanToken) {
        n.typeArgs = ctx.parseBracketedList(Context.TypeArgs, this.type, Syntax.LessThanToken, Syntax.GreaterThanToken);
      }
      return finishNode(n);
    }
    nonArrayType(): qt.Typing {
      switch (tok()) {
        case Syntax.AnyKeyword:
        case Syntax.UnknownKeyword:
        case Syntax.StringKeyword:
        case Syntax.NumberKeyword:
        case Syntax.BigIntKeyword:
        case Syntax.SymbolKeyword:
        case Syntax.BooleanKeyword:
        case Syntax.UndefinedKeyword:
        case Syntax.NeverKeyword:
        case Syntax.ObjectKeyword:
          return tryParse(this.keywordAndNoDot) || this.typeReference();
        case Syntax.AsteriskToken:
          return parseDoc.allType(false);
        case Syntax.AsteriskEqualsToken:
          return parseDoc.allType(true);
        case Syntax.Question2Token:
          scanner.reScanQuestionToken();
        case Syntax.QuestionToken:
          return parseDoc.unknownOrNullableType();
        case Syntax.FunctionKeyword:
          return parseDoc.functionType();
        case Syntax.ExclamationToken:
          return parseDoc.nonNullableType();
        case Syntax.NoSubstitutionLiteral:
        case Syntax.StringLiteral:
        case Syntax.NumericLiteral:
        case Syntax.BigIntLiteral:
        case Syntax.TrueKeyword:
        case Syntax.FalseKeyword:
          return this.literalTypeNode();
        case Syntax.MinusToken:
          return lookAhead(next.isNumericOrBigIntLiteral) ? this.literalTypeNode(true) : this.typeReference();
        case Syntax.VoidKeyword:
        case Syntax.NullKeyword:
          return this.tokenNode<qt.Typing>();
        case Syntax.ThisKeyword: {
          const thisKeyword = this.thisTypeNode();
          if (tok() === Syntax.IsKeyword && !scanner.hasPrecedingLineBreak()) return this.thisTypePredicate(thisKeyword);
          return thisKeyword;
        }
        case Syntax.TypeOfKeyword:
          const isStartOfTypeOfImportType = () => {
            next.tok();
            return tok() === Syntax.ImportKeyword;
          };
          return lookAhead(isStartOfTypeOfImportType) ? this.importType() : this.typeQuery();
        case Syntax.OpenBraceToken:
          const isStartOfMappedType = () => {
            next.tok();
            if (tok() === Syntax.PlusToken || tok() === Syntax.MinusToken) return next.tok() === Syntax.ReadonlyKeyword;
            if (tok() === Syntax.ReadonlyKeyword) next.tok();
            return tok() === Syntax.OpenBracketToken && next.isIdentifier() && next.tok() === Syntax.InKeyword;
          };
          return lookAhead(isStartOfMappedType) ? this.mappedType() : this.typeLiteral();
        case Syntax.OpenBracketToken:
          return this.tupleType();
        case Syntax.OpenParenToken:
          return this.parenthesizedType();
        case Syntax.ImportKeyword:
          return this.importType();
        case Syntax.AssertsKeyword:
          return lookAhead(next.isIdentifierOrKeywordOnSameLine) ? this.assertsTypePredicate() : this.typeReference();
        default:
          return this.typeReference();
      }
    }
    postfixTypeOrHigher(): qt.Typing {
      let type = this.nonArrayType();
      while (!scanner.hasPrecedingLineBreak()) {
        switch (tok()) {
          case Syntax.ExclamationToken:
            type = create.postfixType(Syntax.DocNonNullableTyping, type);
            break;
          case Syntax.QuestionToken:
            if (!(flags.value & NodeFlags.Doc) && lookAhead(next.isStartOfType)) return type;
            type = create.postfixType(Syntax.DocNullableTyping, type);
            break;
          case Syntax.OpenBracketToken:
            this.expected(Syntax.OpenBracketToken);
            if (is.startOfType()) {
              const n = create.node(Syntax.IndexedAccessTyping, type.pos);
              n.objectType = type;
              n.indexType = this.type();
              this.expected(Syntax.CloseBracketToken);
              type = finishNode(n);
            } else {
              const n = create.node(Syntax.ArrayTyping, type.pos);
              n.elemType = type;
              this.expected(Syntax.CloseBracketToken);
              type = finishNode(n);
            }
            break;
          default:
            return type;
        }
      }
      return type;
    }
    typeOperator(operator: Syntax.KeyOfKeyword | Syntax.UniqueKeyword | Syntax.ReadonlyKeyword) {
      const n = create.node(Syntax.TypingOperator);
      this.expected(operator);
      n.operator = operator;
      n.type = this.typeOperatorOrHigher();
      return finishNode(n);
    }
    inferType(): qc.InferTyping {
      const n = create.node(Syntax.InferTyping);
      this.expected(Syntax.InferKeyword);
      const p = create.node(Syntax.TypeParam);
      p.name = this.identifier();
      n.typeParam = finishNode(p);
      return finishNode(n);
    }
    typeOperatorOrHigher(): qt.Typing {
      const operator = tok();
      switch (operator) {
        case Syntax.KeyOfKeyword:
        case Syntax.UniqueKeyword:
        case Syntax.ReadonlyKeyword:
          return this.typeOperator(operator);
        case Syntax.InferKeyword:
          return this.inferType();
      }
      return this.postfixTypeOrHigher();
    }
    unionOrIntersectionType(k: Syntax.UnionTyping | Syntax.IntersectionTyping, cb: () => qt.Typing, o: Syntax.BarToken | Syntax.AmpersandToken): qt.Typing {
      const start = scanner.getStartPos();
      const hasLeadingOperator = this.optional(o);
      let type = cb();
      if (tok() === o || hasLeadingOperator) {
        const types = [type];
        while (this.optional(o)) {
          types.push(cb());
        }
        const n = create.node(k, start);
        n.types = create.nodes(types, start);
        type = finishNode(n);
      }
      return type;
    }
    intersectionTypeOrHigher(): qt.Typing {
      return this.unionOrIntersectionType(Syntax.IntersectionTyping, this.typeOperatorOrHigher, Syntax.AmpersandToken);
    }
    unionTypeOrHigher(): qt.Typing {
      return this.unionOrIntersectionType(Syntax.UnionTyping, this.intersectionTypeOrHigher, Syntax.BarToken);
    }
    typeOrTypePredicate(): qt.Typing {
      const typePredicateVariable = is.identifier() && tryParse(this.typePredicatePrefix);
      const type = this.type();
      if (typePredicateVariable) {
        const n = create.node(Syntax.TypingPredicate, typePredicateVariable.pos);
        n.assertsModifier = undefined;
        n.paramName = typePredicateVariable;
        n.type = type;
        return finishNode(n);
      }
      return type;
    }
    typePredicatePrefix() {
      const id = this.identifier();
      if (tok() === Syntax.IsKeyword && !scanner.hasPrecedingLineBreak()) {
        next.tok();
        return id;
      }
      return;
    }
    assertsTypePredicate(): qt.Typing {
      const n = create.node(Syntax.TypingPredicate);
      n.assertsModifier = this.expectedToken(Syntax.AssertsKeyword);
      n.paramName = tok() === Syntax.ThisKeyword ? this.thisTypeNode() : this.identifier();
      n.type = this.optional(Syntax.IsKeyword) ? this.type() : undefined;
      return finishNode(n);
    }
    type(): qt.Typing {
      return flags.withoutContext(NodeFlags.TypeExcludesFlags, this.typeWorker);
    }
    typeWorker(noConditionalTypes?: boolean): qt.Typing {
      const isStartOfFunctionType = () => {
        if (tok() === Syntax.LessThanToken) return true;
        const isUnambiguouslyStartOfFunctionType = () => {
          next.tok();
          if (tok() === Syntax.CloseParenToken || tok() === Syntax.Dot3Token) return true;
          const skipParamStart = () => {
            if (qy.is.modifier(tok())) parse.modifiers();
            if (is.identifier() || tok() === Syntax.ThisKeyword) {
              next.tok();
              return true;
            }
            if (tok() === Syntax.OpenBracketToken || tok() === Syntax.OpenBraceToken) {
              const o = diags.length;
              parse.identifierOrPattern();
              return o === diags.length;
            }
            return false;
          };
          if (skipParamStart()) {
            if (tok() === Syntax.ColonToken || tok() === Syntax.CommaToken || tok() === Syntax.QuestionToken || tok() === Syntax.EqualsToken) return true;
            if (tok() === Syntax.CloseParenToken) {
              next.tok();
              if (tok() === Syntax.EqualsGreaterThanToken) return true;
            }
          }
          return false;
        };
        return tok() === Syntax.OpenParenToken && lookAhead(isUnambiguouslyStartOfFunctionType);
      };
      if (isStartOfFunctionType() || tok() === Syntax.NewKeyword) return this.functionOrConstructorType();
      const type = this.unionTypeOrHigher();
      if (!noConditionalTypes && !scanner.hasPrecedingLineBreak() && this.optional(Syntax.ExtendsKeyword)) {
        const n = create.node(Syntax.ConditionalTyping, type.pos);
        n.checkType = type;
        n.extendsType = this.typeWorker(true);
        this.expected(Syntax.QuestionToken);
        n.trueType = this.typeWorker();
        this.expected(Syntax.ColonToken);
        n.falseType = this.typeWorker();
        return finishNode(n);
      }
      return type;
    }
    typeAnnotation(): qt.Typing | undefined {
      return this.optional(Syntax.ColonToken) ? this.type() : undefined;
    }
    expression(): qt.Expression {
      const dc = flags.inContext(NodeFlags.DecoratorContext);
      if (dc) flags.set(false, NodeFlags.DecoratorContext);
      let expr = this.assignmentExpressionOrHigher();
      let operatorToken: qc.BinaryOperatorToken;
      while ((operatorToken = this.optionalToken(Syntax.CommaToken))) {
        expr = create.binaryExpression(expr, operatorToken, this.assignmentExpressionOrHigher());
      }
      if (dc) flags.set(true, NodeFlags.DecoratorContext);
      return expr;
    }
    initer(): qt.Expression | undefined {
      return this.optional(Syntax.EqualsToken) ? this.assignmentExpressionOrHigher() : undefined;
    }
    assignmentExpressionOrHigher(): qt.Expression {
      const isYieldExpression = () => {
        if (tok() === Syntax.YieldKeyword) {
          if (flags.inContext(NodeFlags.YieldContext)) return true;
          return lookAhead(next.isIdentifierOrKeywordOrLiteralOnSameLine);
        }
        return false;
      };
      if (isYieldExpression()) return this.yieldExpression();
      const tryParenthesizedArrowFunction = () => {
        const isParenthesizedArrowFunction = (): Tristate => {
          if (tok() === Syntax.OpenParenToken || tok() === Syntax.LessThanToken || tok() === Syntax.AsyncKeyword) {
            const worker = (): Tristate => {
              if (tok() === Syntax.AsyncKeyword) {
                next.tok();
                if (scanner.hasPrecedingLineBreak()) return Tristate.False;
                if (tok() !== Syntax.OpenParenToken && tok() !== Syntax.LessThanToken) return Tristate.False;
              }
              const first = tok();
              const second = next.tok();
              if (first === Syntax.OpenParenToken) {
                if (second === Syntax.CloseParenToken) {
                  const third = next.tok();
                  switch (third) {
                    case Syntax.EqualsGreaterThanToken:
                    case Syntax.ColonToken:
                    case Syntax.OpenBraceToken:
                      return Tristate.True;
                    default:
                      return Tristate.False;
                  }
                }
                if (second === Syntax.OpenBracketToken || second === Syntax.OpenBraceToken) return Tristate.Unknown;
                if (second === Syntax.Dot3Token) return Tristate.True;
                if (qy.is.modifier(second) && second !== Syntax.AsyncKeyword && lookAhead(next.isIdentifier)) return Tristate.True;
                if (!is.identifier() && second !== Syntax.ThisKeyword) return Tristate.False;
                switch (next.tok()) {
                  case Syntax.ColonToken:
                    return Tristate.True;
                  case Syntax.QuestionToken:
                    next.tok();
                    if (tok() === Syntax.ColonToken || tok() === Syntax.CommaToken || tok() === Syntax.EqualsToken || tok() === Syntax.CloseParenToken) return Tristate.True;
                    return Tristate.False;
                  case Syntax.CommaToken:
                  case Syntax.EqualsToken:
                  case Syntax.CloseParenToken:
                    return Tristate.Unknown;
                }
                return Tristate.False;
              } else {
                qu.assert(first === Syntax.LessThanToken);
                if (!is.identifier()) return Tristate.False;
                if (source.languageVariant === LanguageVariant.JSX) {
                  const isArrowFunctionInJsx = lookAhead(() => {
                    const third = next.tok();
                    if (third === Syntax.ExtendsKeyword) {
                      const fourth = next.tok();
                      switch (fourth) {
                        case Syntax.EqualsToken:
                        case Syntax.GreaterThanToken:
                          return false;
                        default:
                          return true;
                      }
                    } else if (third === Syntax.CommaToken) return true;
                    return false;
                  });
                  if (isArrowFunctionInJsx) return Tristate.True;
                  return Tristate.False;
                }
                return Tristate.Unknown;
              }
            };
            return lookAhead(worker);
          }
          if (tok() === Syntax.EqualsGreaterThanToken) return Tristate.True;
          return Tristate.False;
        };
        const triState = isParenthesizedArrowFunction();
        if (triState === Tristate.False) return;
        const arrowFunction = triState === Tristate.True ? parse.parenthesizedArrowFunctionExpressionHead(true) : tryParse(parse.possibleParenthesizedArrowFunctionExpressionHead);
        if (!arrowFunction) return;
        const isAsync = hasModifierOfKind(arrowFunction, Syntax.AsyncKeyword);
        const lastToken = tok();
        arrowFunction.equalsGreaterThanToken = parse.expectedToken(Syntax.EqualsGreaterThanToken);
        arrowFunction.body = lastToken === Syntax.EqualsGreaterThanToken || lastToken === Syntax.OpenBraceToken ? parse.arrowFunctionExpressionBody(isAsync) : parse.identifier();
        return finishNode(arrowFunction);
      };
      const tryAsyncArrowFunction = () => {
        if (tok() === Syntax.AsyncKeyword) {
          const worker = (): Tristate => {
            if (tok() === Syntax.AsyncKeyword) {
              next.tok();
              if (scanner.hasPrecedingLineBreak() || tok() === Syntax.EqualsGreaterThanToken) return Tristate.False;
              const e = parse.binaryExpressionOrHigher(0);
              if (!scanner.hasPrecedingLineBreak() && e.kind === Syntax.Identifier && tok() === Syntax.EqualsGreaterThanToken) return Tristate.True;
            }
            return Tristate.False;
          };
          if (lookAhead(worker) === Tristate.True) {
            const m = parse.modifiersForArrowFunction();
            const e = parse.binaryExpressionOrHigher(0);
            return parse.simpleArrowFunctionExpression(e as qc.Identifier, m);
          }
        }
        return;
      };
      const arrow = tryParenthesizedArrowFunction() || tryAsyncArrowFunction();
      if (arrow) return arrow;
      const e = this.binaryExpressionOrHigher(0);
      if (e.kind === Syntax.Identifier && tok() === Syntax.EqualsGreaterThanToken) return this.simpleArrowFunctionExpression(e as qc.Identifier);
      if (qf.is.leftHandSideExpression(e) && qy.is.assignmentOperator(reScanGreaterToken())) return create.binaryExpression(e, this.tokenNode(), this.assignmentExpressionOrHigher());
      return this.conditionalExpressionRest(e);
    }
    yieldExpression(): qc.YieldExpression {
      const n = create.node(Syntax.YieldExpression);
      next.tok();
      if (!scanner.hasPrecedingLineBreak() && (tok() === Syntax.AsteriskToken || is.startOfExpression())) {
        n.asteriskToken = this.optionalToken(Syntax.AsteriskToken);
        n.expression = this.assignmentExpressionOrHigher();
        return finishNode(n);
      }
      return finishNode(n);
    }
    simpleArrowFunctionExpression(identifier: qc.Identifier, asyncModifier?: Nodes<Modifier> | undefined): qc.ArrowFunction {
      qu.assert(tok() === Syntax.EqualsGreaterThanToken, 'this.simpleArrowFunctionExpression should only have been called if we had a =>');
      let n: qc.ArrowFunction;
      if (asyncModifier) {
        n = create.node(Syntax.ArrowFunction, asyncModifier.pos);
        n.modifiers = asyncModifier;
      } else n = create.node(Syntax.ArrowFunction, identifier.pos);
      const n2 = create.node(Syntax.Param, identifier.pos);
      n2.name = identifier;
      finishNode(n);
      n.params = create.nodes<qc.ParamDeclaration>([n2], n2.pos, n2.end);
      n.equalsGreaterThanToken = this.expectedToken(Syntax.EqualsGreaterThanToken);
      n.body = this.arrowFunctionExpressionBody(!!asyncModifier);
      return addDocComment(finishNode(n));
    }
    possibleParenthesizedArrowFunctionExpressionHead(): qc.ArrowFunction | undefined {
      const p = scanner.getTokenPos();
      if (notParenthesizedArrow && notParenthesizedArrow.has(p.toString())) return;
      const result = this.parenthesizedArrowFunctionExpressionHead(false);
      if (!result) (notParenthesizedArrow || (notParenthesizedArrow = new qu.QMap())).set(p.toString(), true);
      return result;
    }
    parenthesizedArrowFunctionExpressionHead(allowAmbiguity: boolean): qc.ArrowFunction | undefined {
      const n = create.nodeWithDoc(Syntax.ArrowFunction);
      n.modifiers = this.modifiersForArrowFunction();
      const isAsync = hasModifierOfKind(n, Syntax.AsyncKeyword) ? SignatureFlags.Await : SignatureFlags.None;
      if (!fillSignature(Syntax.ColonToken, isAsync, n) && !allowAmbiguity) return;
      const hasDocFunctionTyping = n.type && n.type.kind === Syntax.DocFunctionTyping;
      if (!allowAmbiguity && tok() !== Syntax.EqualsGreaterThanToken && (hasDocFunctionTyping || tok() !== Syntax.OpenBraceToken)) return;
      return n;
    }
    arrowFunctionExpressionBody(isAsync: boolean): qt.Block | qt.Expression {
      if (tok() === Syntax.OpenBraceToken) return this.functionBlock(isAsync ? SignatureFlags.Await : SignatureFlags.None);
      const isStartOfExpressionStatement = () => {
        return tok() !== Syntax.OpenBraceToken && tok() !== Syntax.FunctionKeyword && tok() !== Syntax.ClassKeyword && tok() !== Syntax.AtToken && is.startOfExpression();
      };
      if (tok() !== Syntax.SemicolonToken && tok() !== Syntax.FunctionKeyword && tok() !== Syntax.ClassKeyword && is.startOfStatement() && !isStartOfExpressionStatement())
        return this.functionBlock(SignatureFlags.IgnoreMissingOpenBrace | (isAsync ? SignatureFlags.Await : SignatureFlags.None));
      return isAsync ? flags.withAwait(this.assignmentExpressionOrHigher) : flags.withoutAwait(this.assignmentExpressionOrHigher);
    }
    conditionalExpressionRest(leftOperand: qt.Expression): qt.Expression {
      const t = this.optionalToken(Syntax.QuestionToken);
      if (!t) return leftOperand;
      const n = create.node(Syntax.ConditionalExpression, leftOperand.pos);
      n.condition = leftOperand;
      n.questionToken = t;
      n.whenTrue = flags.withoutContext(withDisallowInDecoratorContext, this.assignmentExpressionOrHigher);
      n.colonToken = this.expectedToken(Syntax.ColonToken);
      n.whenFalse = qf.is.present(n.colonToken) ? this.assignmentExpressionOrHigher() : create.missingNode(Syntax.Identifier, false, qd.msgs._0_expected, qy.toString(Syntax.ColonToken));
      return finishNode(n);
    }
    binaryExpressionOrHigher(precedence: number): qt.Expression {
      const leftOperand = this.unaryExpressionOrHigher();
      return this.binaryExpressionRest(precedence, leftOperand);
    }
    binaryExpressionRest(precedence: number, leftOperand: qt.Expression): qt.Expression {
      while (true) {
        reScanGreaterToken();
        const newPrecedence = qy.get.binaryOperatorPrecedence(tok());
        const consumeCurrentOperator = tok() === Syntax.Asterisk2Token ? newPrecedence >= precedence : newPrecedence > precedence;
        if (!consumeCurrentOperator) break;
        if (tok() === Syntax.InKeyword && flags.inContext(NodeFlags.DisallowInContext)) break;
        if (tok() === Syntax.AsKeyword) {
          if (scanner.hasPrecedingLineBreak()) break;
          else {
            next.tok();
            leftOperand = create.asExpression(leftOperand, this.type());
          }
        } else leftOperand = create.binaryExpression(leftOperand, this.tokenNode(), this.binaryExpressionOrHigher(newPrecedence));
      }
      return leftOperand;
    }
    prefixUnaryExpression() {
      const n = create.node(Syntax.PrefixUnaryExpression);
      n.operator = tok() as qc.PrefixUnaryOperator;
      next.tok();
      n.operand = this.simpleUnaryExpression();
      return finishNode(n);
    }
    deleteExpression() {
      const n = create.node(Syntax.DeleteExpression);
      next.tok();
      n.expression = this.simpleUnaryExpression();
      return finishNode(n);
    }
    typeOfExpression() {
      const n = create.node(Syntax.TypeOfExpression);
      next.tok();
      n.expression = this.simpleUnaryExpression();
      return finishNode(n);
    }
    voidExpression() {
      const n = create.node(Syntax.VoidExpression);
      next.tok();
      n.expression = this.simpleUnaryExpression();
      return finishNode(n);
    }
    awaitExpression() {
      const n = create.node(Syntax.AwaitExpression);
      next.tok();
      n.expression = this.simpleUnaryExpression();
      return finishNode(n);
    }
    unaryExpressionOrHigher(): qc.UnaryExpression | qc.BinaryExpression {
      const isUpdateExpression = () => {
        switch (tok()) {
          case Syntax.PlusToken:
          case Syntax.MinusToken:
          case Syntax.TildeToken:
          case Syntax.ExclamationToken:
          case Syntax.DeleteKeyword:
          case Syntax.TypeOfKeyword:
          case Syntax.VoidKeyword:
          case Syntax.AwaitKeyword:
            return false;
          case Syntax.LessThanToken:
            if (source.languageVariant !== LanguageVariant.JSX) return false;
          default:
            return true;
        }
      };
      if (isUpdateExpression()) {
        const e = this.updateExpression();
        return tok() === Syntax.Asterisk2Token ? <BinaryExpression>this.binaryExpressionRest(qy.get.binaryOperatorPrecedence(tok()), e) : e;
      }
      const unaryOperator = tok();
      const e = this.simpleUnaryExpression();
      if (tok() === Syntax.Asterisk2Token) {
        const pos = qy.skipTrivia(sourceText, e.pos);
        const { end } = e;
        if (e.kind === Syntax.TypeAssertionExpression) {
          this.errorAt(pos, end, qd.msgs.A_type_assertion_expression_is_not_allowed_in_the_left_hand_side_of_an_exponentiation_expression_Consider_enclosing_the_expression_in_parentheses);
        } else {
          this.errorAt(
            pos,
            end,
            qd.msgs.An_unary_expression_with_the_0_operator_is_not_allowed_in_the_left_hand_side_of_an_exponentiation_expression_Consider_enclosing_the_expression_in_parentheses,
            qy.toString(unaryOperator)
          );
        }
      }
      return e;
    }
    simpleUnaryExpression(): qc.UnaryExpression {
      switch (tok()) {
        case Syntax.PlusToken:
        case Syntax.MinusToken:
        case Syntax.TildeToken:
        case Syntax.ExclamationToken:
          return this.prefixUnaryExpression();
        case Syntax.DeleteKeyword:
          return this.deleteExpression();
        case Syntax.TypeOfKeyword:
          return this.typeOfExpression();
        case Syntax.VoidKeyword:
          return this.voidExpression();
        case Syntax.LessThanToken:
          return this.typeAssertion();
        case Syntax.AwaitKeyword:
          const isAwaitExpression = () => {
            if (tok() === Syntax.AwaitKeyword) {
              if (flags.inContext(NodeFlags.AwaitContext)) return true;
              return lookAhead(next.isIdentifierOrKeywordOrLiteralOnSameLine);
            }
            return false;
          };
          if (isAwaitExpression()) return this.awaitExpression();
        default:
          return this.updateExpression();
      }
    }
    updateExpression(): UpdateExpression {
      if (tok() === Syntax.Plus2Token || tok() === Syntax.Minus2Token) {
        const n = create.node(Syntax.PrefixUnaryExpression);
        n.operator = <PrefixUnaryOperator>tok();
        next.tok();
        n.operand = this.leftHandSideExpressionOrHigher();
        return finishNode(n);
      } else if (source.languageVariant === LanguageVariant.JSX && tok() === Syntax.LessThanToken && lookAhead(next.isIdentifierOrKeywordOrGreaterThan)) {
        return parseJsx.elemOrSelfClosingElemOrFragment(true);
      }
      const expression = this.leftHandSideExpressionOrHigher();
      qu.assert(qf.is.leftHandSideExpression(expression));
      if ((tok() === Syntax.Plus2Token || tok() === Syntax.Minus2Token) && !scanner.hasPrecedingLineBreak()) {
        const n = create.node(Syntax.PostfixUnaryExpression, expression.pos);
        n.operand = expression;
        n.operator = <PostfixUnaryOperator>tok();
        next.tok();
        return finishNode(n);
      }
      return expression;
    }
    leftHandSideExpressionOrHigher(): qt.LeftExpression {
      let expression: qc.MemberExpression;
      if (tok() === Syntax.ImportKeyword) {
        if (lookAhead(next.isOpenParenOrLessThan)) {
          source.flags |= NodeFlags.PossiblyContainsDynamicImport;
          expression = this.tokenNode<PrimaryExpression>();
        } else if (lookAhead(next.isDot)) {
          const fullStart = scanner.getStartPos();
          next.tok();
          next.tok();
          const n = create.node(Syntax.MetaProperty, fullStart);
          n.keywordToken = Syntax.ImportKeyword;
          n.name = this.identifierName();
          expression = finishNode(n);
          source.flags |= NodeFlags.PossiblyContainsImportMeta;
        } else {
          expression = this.memberExpressionOrHigher();
        }
      } else {
        expression = tok() === Syntax.SuperKeyword ? this.superExpression() : this.memberExpressionOrHigher();
      }
      return this.callExpressionRest(expression);
    }
    memberExpressionOrHigher(): qc.MemberExpression {
      const expression = this.primaryExpression();
      return this.memberExpressionRest(expression, true);
    }
    superExpression(): qc.MemberExpression {
      const expression = this.tokenNode<PrimaryExpression>();
      if (tok() === Syntax.LessThanToken) {
        const startPos = getNodePos();
        const typeArgs = tryParse(this.typeArgsInExpression);
        if (typeArgs !== undefined) this.errorAt(startPos, getNodePos(), qd.msgs.super_may_not_use_type_args);
      }
      if (tok() === Syntax.OpenParenToken || tok() === Syntax.DotToken || tok() === Syntax.OpenBracketToken) return expression;
      const n = create.node(Syntax.PropertyAccessExpression, expression.pos);
      n.expression = expression;
      this.expectedToken(Syntax.DotToken, qd.msgs.super_must_be_followed_by_an_arg_list_or_member_access);
      n.name = this.rightSideOfDot(true, true);
      return finishNode(n);
    }
    typeAssertion(): qc.TypeAssertion {
      const n = create.node(Syntax.TypeAssertionExpression);
      this.expected(Syntax.LessThanToken);
      n.type = this.type();
      this.expected(Syntax.GreaterThanToken);
      n.expression = this.simpleUnaryExpression();
      return finishNode(n);
    }
    propertyAccessExpressionRest(expression: qt.LeftExpression, questionDotToken: qt.QuestionDotToken | undefined) {
      const n = create.node(Syntax.PropertyAccessExpression, expression.pos);
      n.expression = expression;
      n.questionDotToken = questionDotToken;
      n.name = this.rightSideOfDot(true, true);
      if (questionDotToken || parse.reparseOptionalChain(expression)) {
        n.flags |= NodeFlags.OptionalChain;
        if (n.name.kind === Syntax.PrivateIdentifier) this.errorAtRange(n.name, qd.msgs.An_optional_chain_cannot_contain_private_identifiers);
      }
      return finishNode(n);
    }
    elemAccessExpressionRest(expression: qt.LeftExpression, questionDotToken: qt.QuestionDotToken | undefined) {
      const n = create.node(Syntax.ElemAccessExpression, expression.pos);
      n.expression = expression;
      n.questionDotToken = questionDotToken;
      if (tok() === Syntax.CloseBracketToken) {
        n.argExpression = create.missingNode(Syntax.Identifier, true, qd.msgs.An_elem_access_expression_should_take_an_arg);
      } else {
        const arg = flags.withoutDisallowIn(this.expression);
        if (qf.is.stringOrNumericLiteralLike(arg)) arg.text = internIdentifier(arg.text);
        n.argExpression = arg;
      }
      this.expected(Syntax.CloseBracketToken);
      if (questionDotToken || parse.reparseOptionalChain(expression)) n.flags |= NodeFlags.OptionalChain;
      return finishNode(n);
    }
    memberExpressionRest(expression: qt.LeftExpression, allowOptionalChain: boolean): qc.MemberExpression {
      while (true) {
        let questionDotToken: qt.QuestionDotToken | undefined;
        let isPropertyAccess = false;
        const isStartOfChain = () => {
          return tok() === Syntax.QuestionDotToken && lookAhead(next.isIdentifierOrKeywordOrOpenBracketOrTemplate);
        };
        if (allowOptionalChain && isStartOfChain()) {
          questionDotToken = this.expectedToken(Syntax.QuestionDotToken);
          isPropertyAccess = qy.is.identifierOrKeyword(tok());
        } else isPropertyAccess = this.optional(Syntax.DotToken);
        if (isPropertyAccess) {
          expression = this.propertyAccessExpressionRest(expression, questionDotToken);
          continue;
        }
        if (!questionDotToken && tok() === Syntax.ExclamationToken && !scanner.hasPrecedingLineBreak()) {
          next.tok();
          const n = create.node(Syntax.NonNullExpression, expression.pos);
          n.expression = expression;
          expression = finishNode(n);
          continue;
        }
        if ((questionDotToken || !flags.inContext(NodeFlags.DecoratorContext)) && this.optional(Syntax.OpenBracketToken)) {
          expression = this.elemAccessExpressionRest(expression, questionDotToken);
          continue;
        }
        if (is.templateStartOfTaggedTemplate()) {
          expression = this.taggedTemplateRest(expression, questionDotToken, undefined);
          continue;
        }
        return <MemberExpression>expression;
      }
    }
    taggedTemplateRest(tag: qt.LeftExpression, questionDotToken: qt.QuestionDotToken | undefined, typeArgs: Nodes<qt.Typing> | undefined) {
      const n = create.node(Syntax.TaggedTemplateExpression, tag.pos);
      n.tag = tag;
      n.questionDotToken = questionDotToken;
      n.typeArgs = typeArgs;
      n.template = tok() === Syntax.NoSubstitutionLiteral ? (reScanHeadOrNoSubstTemplate(), <NoSubstitutionLiteral>this.literalNode()) : this.templateExpression(true);
      if (questionDotToken || tag.flags & NodeFlags.OptionalChain) n.flags |= NodeFlags.OptionalChain;
      return finishNode(n);
    }
    callExpressionRest(expression: qt.LeftExpression): qt.LeftExpression {
      while (true) {
        expression = this.memberExpressionRest(expression, true);
        const questionDotToken = this.optionalToken(Syntax.QuestionDotToken);
        if (tok() === Syntax.LessThanToken || tok() === Syntax.LessThan2Token) {
          const typeArgs = tryParse(this.typeArgsInExpression);
          if (typeArgs) {
            if (is.templateStartOfTaggedTemplate()) {
              expression = this.taggedTemplateRest(expression, questionDotToken, typeArgs);
              continue;
            }
            const n = create.node(Syntax.CallExpression, expression.pos);
            n.expression = expression;
            n.questionDotToken = questionDotToken;
            n.typeArgs = typeArgs;
            n.args = this.argList();
            if (questionDotToken || parse.reparseOptionalChain(expression)) n.flags |= NodeFlags.OptionalChain;
            expression = finishNode(n);
            continue;
          }
        } else if (tok() === Syntax.OpenParenToken) {
          const n = create.node(Syntax.CallExpression, expression.pos);
          n.expression = expression;
          n.questionDotToken = questionDotToken;
          n.args = this.argList();
          if (questionDotToken || parse.reparseOptionalChain(expression)) n.flags |= NodeFlags.OptionalChain;
          expression = finishNode(n);
          continue;
        }
        if (questionDotToken) {
          const n = create.node(Syntax.PropertyAccessExpression, expression.pos) as PropertyAccessExpression;
          n.expression = expression;
          n.questionDotToken = questionDotToken;
          n.name = create.missingNode(Syntax.Identifier, false, qd.msgs.Identifier_expected);
          n.flags |= NodeFlags.OptionalChain;
          expression = finishNode(n);
        }
        break;
      }
      return expression;
    }
    argList() {
      this.expected(Syntax.OpenParenToken);
      const result = ctx.parseDelimitedList(Context.ArgExpressions, this.argExpression);
      this.expected(Syntax.CloseParenToken);
      return result;
    }
    typeArgsInExpression() {
      if (reScanLessToken() !== Syntax.LessThanToken) return;
      next.tok();
      const typeArgs = ctx.parseDelimitedList(Context.TypeArgs, this.type);
      if (!this.expected(Syntax.GreaterThanToken)) return;
      return typeArgs && can.followTypeArgsInExpression() ? typeArgs : undefined;
    }
    primaryExpression(): qc.PrimaryExpression {
      switch (tok()) {
        case Syntax.NumericLiteral:
        case Syntax.BigIntLiteral:
        case Syntax.StringLiteral:
        case Syntax.NoSubstitutionLiteral:
          return this.literalNode();
        case Syntax.ThisKeyword:
        case Syntax.SuperKeyword:
        case Syntax.NullKeyword:
        case Syntax.TrueKeyword:
        case Syntax.FalseKeyword:
          return this.tokenNode<PrimaryExpression>();
        case Syntax.OpenParenToken:
          return this.parenthesizedExpression();
        case Syntax.OpenBracketToken:
          return this.arrayLiteralExpression();
        case Syntax.OpenBraceToken:
          return this.objectLiteralExpression();
        case Syntax.AsyncKeyword:
          if (!lookAhead(next.isFunctionKeywordOnSameLine)) break;
          return this.functionExpression();
        case Syntax.ClassKeyword:
          return this.classExpression();
        case Syntax.FunctionKeyword:
          return this.functionExpression();
        case Syntax.NewKeyword:
          return this.newExpressionOrNewDotTarget();
        case Syntax.SlashToken:
        case Syntax.SlashEqualsToken:
          if (reScanSlashToken() === Syntax.RegexLiteral) return this.literalNode();
          break;
        case Syntax.TemplateHead:
          return this.templateExpression(false);
      }
      return this.identifier(qd.msgs.Expression_expected);
    }
    parenthesizedExpression(): qc.ParenthesizedExpression {
      const n = create.nodeWithDoc(Syntax.ParenthesizedExpression);
      this.expected(Syntax.OpenParenToken);
      n.expression = flags.withoutDisallowIn(this.expression);
      this.expected(Syntax.CloseParenToken);
      return finishNode(n);
    }
    spreadElem(): qt.Expression {
      const n = create.node(Syntax.SpreadElem);
      this.expected(Syntax.Dot3Token);
      n.expression = this.assignmentExpressionOrHigher();
      return finishNode(n);
    }
    argOrArrayLiteralElem(): qt.Expression {
      return tok() === Syntax.Dot3Token ? this.spreadElem() : tok() === Syntax.CommaToken ? create.node(Syntax.OmittedExpression) : this.assignmentExpressionOrHigher();
    }
    argExpression(): qt.Expression {
      return flags.withoutContext(withDisallowInDecoratorContext, this.argOrArrayLiteralElem);
    }
    arrayLiteralExpression(): qc.ArrayLiteralExpression {
      const n = create.node(Syntax.ArrayLiteralExpression);
      this.expected(Syntax.OpenBracketToken);
      if (scanner.hasPrecedingLineBreak()) n.multiLine = true;
      n.elems = ctx.parseDelimitedList(Context.ArrayLiteralMembers, this.argOrArrayLiteralElem);
      this.expected(Syntax.CloseBracketToken);
      return finishNode(n);
    }
    objectLiteralElem(): qc.ObjectLiteralElemLike {
      const n = create.nodeWithDoc(Syntax.Unknown);
      if (this.optionalToken(Syntax.Dot3Token)) {
        n.kind = Syntax.SpreadAssignment;
        (n as SpreadAssignment).expression = this.assignmentExpressionOrHigher();
        return finishNode(n);
      }
      n.decorators = this.decorators();
      n.modifiers = this.modifiers();
      if (this.contextualModifier(Syntax.GetKeyword)) return this.accessorDeclaration(n as qc.AccessorDeclaration, Syntax.GetAccessor);
      if (this.contextualModifier(Syntax.SetKeyword)) return this.accessorDeclaration(n as qc.AccessorDeclaration, Syntax.SetAccessor);
      const asteriskToken = this.optionalToken(Syntax.AsteriskToken);
      const tokenIsIdentifier = is.identifier();
      n.name = this.propertyName();
      (n as qc.MethodDeclaration).questionToken = this.optionalToken(Syntax.QuestionToken);
      (n as qc.MethodDeclaration).exclamationToken = this.optionalToken(Syntax.ExclamationToken);
      if (asteriskToken || tok() === Syntax.OpenParenToken || tok() === Syntax.LessThanToken) return this.methodDeclaration(<MethodDeclaration>n, asteriskToken);
      const isShorthandPropertyAssignment = tokenIsIdentifier && tok() !== Syntax.ColonToken;
      if (isShorthandPropertyAssignment) {
        n.kind = Syntax.ShorthandPropertyAssignment;
        const equalsToken = this.optionalToken(Syntax.EqualsToken);
        if (equalsToken) {
          (n as qc.ShorthandPropertyAssignment).equalsToken = equalsToken;
          (n as qc.ShorthandPropertyAssignment).objectAssignmentIniter = flags.withoutDisallowIn(this.assignmentExpressionOrHigher);
        }
      } else {
        n.kind = Syntax.PropertyAssignment;
        this.expected(Syntax.ColonToken);
        (n as PropertyAssignment).initer = flags.withoutDisallowIn(this.assignmentExpressionOrHigher);
      }
      return finishNode(n);
    }
    objectLiteralExpression(): qc.ObjectLiteralExpression {
      const n = create.node(Syntax.ObjectLiteralExpression);
      const p = scanner.getTokenPos();
      this.expected(Syntax.OpenBraceToken);
      if (scanner.hasPrecedingLineBreak()) n.multiLine = true;
      n.properties = ctx.parseDelimitedList(Context.ObjectLiteralMembers, this.objectLiteralElem, true);
      if (!this.expected(Syntax.CloseBraceToken)) {
        const e = lastOrUndefined(diags);
        if (e && e.code === qd.msgs._0_expected.code) {
          addRelatedInfo(e, qf.create.fileDiagnostic(source, p, 1, qd.msgs.The_parser_expected_to_find_a_to_match_the_token_here));
        }
      }
      return finishNode(n);
    }
    functionExpression(): qc.FunctionExpression {
      const dc = flags.inContext(NodeFlags.DecoratorContext);
      if (dc) flags.set(false, NodeFlags.DecoratorContext);
      const n = create.nodeWithDoc(Syntax.FunctionExpression);
      n.modifiers = this.modifiers();
      this.expected(Syntax.FunctionKeyword);
      n.asteriskToken = this.optionalToken(Syntax.AsteriskToken);
      const isGenerator = n.asteriskToken ? SignatureFlags.Yield : SignatureFlags.None;
      const isAsync = hasModifierOfKind(n, Syntax.AsyncKeyword) ? SignatureFlags.Await : SignatureFlags.None;
      n.name =
        isGenerator && isAsync
          ? flags.withYieldAndAwait(this.optionalIdentifier)
          : isGenerator
          ? flags.withYield(this.optionalIdentifier)
          : isAsync
          ? flags.withAwait(this.optionalIdentifier)
          : this.optionalIdentifier();
      fillSignature(Syntax.ColonToken, isGenerator | isAsync, n);
      n.body = this.functionBlock(isGenerator | isAsync);
      if (dc) flags.set(true, NodeFlags.DecoratorContext);
      return finishNode(n);
    }
    optionalIdentifier(): qc.Identifier | undefined {
      return is.identifier() ? this.identifier() : undefined;
    }
    newExpressionOrNewDotTarget(): qc.NewExpression | qc.MetaProperty {
      const fullStart = scanner.getStartPos();
      this.expected(Syntax.NewKeyword);
      if (this.optional(Syntax.DotToken)) {
        const n = create.node(Syntax.MetaProperty, fullStart);
        n.keywordToken = Syntax.NewKeyword;
        n.name = this.identifierName();
        return finishNode(n);
      }
      let expression: qc.MemberExpression = this.primaryExpression();
      let typeArgs;
      while (true) {
        expression = this.memberExpressionRest(expression, false);
        typeArgs = tryParse(this.typeArgsInExpression);
        if (is.templateStartOfTaggedTemplate()) {
          qu.assert(!!typeArgs, "Expected a type arg list; all plain tagged template starts should be consumed in 'this.memberExpressionRest'");
          expression = this.taggedTemplateRest(expression, undefined, typeArgs);
          typeArgs = undefined;
        }
        break;
      }
      const n = create.node(Syntax.NewExpression, fullStart);
      n.expression = expression;
      n.typeArgs = typeArgs;
      if (tok() === Syntax.OpenParenToken) n.args = this.argList();
      else if (n.typeArgs) this.errorAt(fullStart, scanner.getStartPos(), qd.msgs.A_new_expression_with_type_args_must_always_be_followed_by_a_parenthesized_arg_list);
      return finishNode(n);
    }
    block(ignoreMissingOpenBrace: boolean, m?: qd.Message): qt.Block {
      const n = create.node(Syntax.Block);
      const openBracePosition = scanner.getTokenPos();
      if (this.expected(Syntax.OpenBraceToken, m) || ignoreMissingOpenBrace) {
        if (scanner.hasPrecedingLineBreak()) n.multiLine = true;
        n.statements = ctx.parseList(Context.BlockStatements, this.statement);
        if (!this.expected(Syntax.CloseBraceToken)) {
          const e = lastOrUndefined(diags);
          if (e && e.code === qd.msgs._0_expected.code) {
            addRelatedInfo(e, qf.create.fileDiagnostic(source, openBracePosition, 1, qd.msgs.The_parser_expected_to_find_a_to_match_the_token_here));
          }
        }
      } else n.statements = create.missingList<Statement>();
      return finishNode(n);
    }
    functionBlock(f: SignatureFlags, m?: qd.Message): qt.Block {
      const yf = flags.inContext(NodeFlags.YieldContext);
      flags.set(!!(f & SignatureFlags.Yield), NodeFlags.YieldContext);
      const af = flags.inContext(NodeFlags.AwaitContext);
      flags.set(!!(f & SignatureFlags.Await), NodeFlags.AwaitContext);
      const dc = flags.inContext(NodeFlags.DecoratorContext);
      if (dc) flags.set(false, NodeFlags.DecoratorContext);
      const block = this.block(!!(f & SignatureFlags.IgnoreMissingOpenBrace), m);
      if (dc) flags.set(true, NodeFlags.DecoratorContext);
      flags.set(yf, NodeFlags.YieldContext);
      flags.set(af, NodeFlags.AwaitContext);
      return block;
    }
    emptyStatement(): qc.Statement {
      const n = create.node(Syntax.EmptyStatement);
      this.expected(Syntax.SemicolonToken);
      return finishNode(n);
    }
    ifStatement(): qc.IfStatement {
      const n = create.node(Syntax.IfStatement);
      this.expected(Syntax.IfKeyword);
      this.expected(Syntax.OpenParenToken);
      n.expression = flags.withoutDisallowIn(this.expression);
      this.expected(Syntax.CloseParenToken);
      n.thenStatement = this.statement();
      n.elseStatement = this.optional(Syntax.ElseKeyword) ? this.statement() : undefined;
      return finishNode(n);
    }
    doStatement(): qc.DoStatement {
      const n = create.node(Syntax.DoStatement);
      this.expected(Syntax.DoKeyword);
      n.statement = this.statement();
      this.expected(Syntax.WhileKeyword);
      this.expected(Syntax.OpenParenToken);
      n.expression = flags.withoutDisallowIn(this.expression);
      this.expected(Syntax.CloseParenToken);
      this.optional(Syntax.SemicolonToken);
      return finishNode(n);
    }
    whileStatement(): qc.WhileStatement {
      const n = create.node(Syntax.WhileStatement);
      this.expected(Syntax.WhileKeyword);
      this.expected(Syntax.OpenParenToken);
      n.expression = flags.withoutDisallowIn(this.expression);
      this.expected(Syntax.CloseParenToken);
      n.statement = this.statement();
      return finishNode(n);
    }
    forOrForInOrForOfStatement(): qc.Statement {
      const pos = getNodePos();
      this.expected(Syntax.ForKeyword);
      const awaitToken = this.optionalToken(Syntax.AwaitKeyword);
      this.expected(Syntax.OpenParenToken);
      let initer!: qc.VariableDeclarationList | qt.Expression;
      if (tok() !== Syntax.SemicolonToken) {
        if (tok() === Syntax.VarKeyword || tok() === Syntax.LetKeyword || tok() === Syntax.ConstKeyword) initer = this.variableDeclarationList(true);
        else initer = flags.withDisallowIn(this.expression);
      }
      let n: qc.IterationStmt;
      if (awaitToken ? this.expected(Syntax.OfKeyword) : this.optional(Syntax.OfKeyword)) {
        const n2 = create.node(Syntax.ForOfStatement, pos);
        n2.awaitModifier = awaitToken;
        n2.initer = initer;
        n2.expression = flags.withoutDisallowIn(this.assignmentExpressionOrHigher);
        this.expected(Syntax.CloseParenToken);
        n = n2;
      } else if (this.optional(Syntax.InKeyword)) {
        const n2 = create.node(Syntax.ForInStatement, pos);
        n2.initer = initer;
        n2.expression = flags.withoutDisallowIn(this.expression);
        this.expected(Syntax.CloseParenToken);
        n = n2;
      } else {
        const n2 = create.node(Syntax.ForStatement, pos);
        n2.initer = initer;
        this.expected(Syntax.SemicolonToken);
        if (tok() !== Syntax.SemicolonToken && tok() !== Syntax.CloseParenToken) n2.condition = flags.withoutDisallowIn(this.expression);
        this.expected(Syntax.SemicolonToken);
        if (tok() !== Syntax.CloseParenToken) n2.incrementor = flags.withoutDisallowIn(this.expression);
        this.expected(Syntax.CloseParenToken);
        n = n2;
      }
      n.statement = this.statement();
      return finishNode(n);
    }
    breakOrContinueStatement(kind: Syntax): qc.BreakOrContinueStatement {
      const n = create.node(kind);
      this.expected(kind === Syntax.BreakStatement ? Syntax.BreakKeyword : Syntax.ContinueKeyword);
      if (!can.parseSemicolon()) n.label = this.identifier();
      this.semicolon();
      return finishNode(n);
    }
    returnStatement(): qc.ReturnStatement {
      const n = create.node(Syntax.ReturnStatement);
      this.expected(Syntax.ReturnKeyword);
      if (!can.parseSemicolon()) n.expression = flags.withoutDisallowIn(this.expression);
      this.semicolon();
      return finishNode(n);
    }
    withStatement(): qc.WithStatement {
      const n = create.node(Syntax.WithStatement);
      this.expected(Syntax.WithKeyword);
      this.expected(Syntax.OpenParenToken);
      n.expression = flags.withoutDisallowIn(this.expression);
      this.expected(Syntax.CloseParenToken);
      n.statement = flags.withContext(NodeFlags.InWithStatement, this.statement);
      return finishNode(n);
    }
    caseClause(): qc.CaseClause {
      const n = create.node(Syntax.CaseClause);
      this.expected(Syntax.CaseKeyword);
      n.expression = flags.withoutDisallowIn(this.expression);
      this.expected(Syntax.ColonToken);
      n.statements = ctx.parseList(Context.SwitchClauseStatements, this.statement);
      return finishNode(n);
    }
    defaultClause(): qc.DefaultClause {
      const n = create.node(Syntax.DefaultClause);
      this.expected(Syntax.DefaultKeyword);
      this.expected(Syntax.ColonToken);
      n.statements = ctx.parseList(Context.SwitchClauseStatements, this.statement);
      return finishNode(n);
    }
    caseOrDefaultClause(): qc.CaseOrDefaultClause {
      return tok() === Syntax.CaseKeyword ? this.caseClause() : this.defaultClause();
    }
    switchStatement(): qc.SwitchStatement {
      const n = create.node(Syntax.SwitchStatement);
      this.expected(Syntax.SwitchKeyword);
      this.expected(Syntax.OpenParenToken);
      n.expression = flags.withoutDisallowIn(this.expression);
      this.expected(Syntax.CloseParenToken);
      const n2 = create.node(Syntax.CaseBlock);
      this.expected(Syntax.OpenBraceToken);
      n2.clauses = ctx.parseList(Context.SwitchClauses, this.caseOrDefaultClause);
      this.expected(Syntax.CloseBraceToken);
      n.caseBlock = finishNode(n2);
      return finishNode(n);
    }
    throwStatement(): qc.ThrowStatement {
      const n = create.node(Syntax.ThrowStatement);
      this.expected(Syntax.ThrowKeyword);
      n.expression = scanner.hasPrecedingLineBreak() ? undefined : flags.withoutDisallowIn(this.expression);
      this.semicolon();
      return finishNode(n);
    }
    tryStatement(): qc.TryStatement {
      const n = create.node(Syntax.TryStatement);
      this.expected(Syntax.TryKeyword);
      n.tryBlock = this.block(false);
      n.catchClause = tok() === Syntax.CatchKeyword ? this.catchClause() : undefined;
      if (!n.catchClause || tok() === Syntax.FinallyKeyword) {
        this.expected(Syntax.FinallyKeyword);
        n.finallyBlock = this.block(false);
      }
      return finishNode(n);
    }
    catchClause(): qc.CatchClause {
      const result = create.node(Syntax.CatchClause);
      this.expected(Syntax.CatchKeyword);
      if (this.optional(Syntax.OpenParenToken)) {
        result.variableDeclaration = this.variableDeclaration();
        this.expected(Syntax.CloseParenToken);
      } else result.variableDeclaration = undefined;
      result.block = this.block(false);
      return finishNode(result);
    }
    debuggerStatement(): qc.Statement {
      const n = create.node(Syntax.DebuggerStatement);
      this.expected(Syntax.DebuggerKeyword);
      this.semicolon();
      return finishNode(n);
    }
    expressionOrLabeledStatement(): qt.ExpressionStatement | qc.LabeledStatement {
      const n = create.nodeWithDoc(tok() === Syntax.Identifier ? Syntax.Unknown : Syntax.ExpressionStatement);
      const expression = flags.withoutDisallowIn(this.expression);
      if (expression.kind === Syntax.Identifier && this.optional(Syntax.ColonToken)) {
        n.kind = Syntax.LabeledStatement;
        (n as qc.LabeledStatement).label = <qc.Identifier>expression;
        (n as qc.LabeledStatement).statement = this.statement();
      } else {
        n.kind = Syntax.ExpressionStatement;
        (n as qt.ExpressionStatement).expression = expression;
        this.semicolon();
      }
      return finishNode(n);
    }
    statement(): qc.Statement {
      switch (tok()) {
        case Syntax.SemicolonToken:
          return this.emptyStatement();
        case Syntax.OpenBraceToken:
          return this.block(false);
        case Syntax.VarKeyword:
          return this.variableStatement(create.nodeWithDoc(Syntax.VariableDeclaration));
        case Syntax.LetKeyword:
          const isLetDeclaration = () => lookAhead(next.isIdentifierOrStartOfDestructuring);
          if (isLetDeclaration()) return this.variableStatement(create.nodeWithDoc(Syntax.VariableDeclaration));
          break;
        case Syntax.FunctionKeyword:
          return this.functionDeclaration(create.nodeWithDoc(Syntax.FunctionDeclaration));
        case Syntax.ClassKeyword:
          return this.classDeclaration(create.nodeWithDoc(Syntax.ClassDeclaration));
        case Syntax.IfKeyword:
          return this.ifStatement();
        case Syntax.DoKeyword:
          return this.doStatement();
        case Syntax.WhileKeyword:
          return this.whileStatement();
        case Syntax.ForKeyword:
          return this.forOrForInOrForOfStatement();
        case Syntax.ContinueKeyword:
          return this.breakOrContinueStatement(Syntax.ContinueStatement);
        case Syntax.BreakKeyword:
          return this.breakOrContinueStatement(Syntax.BreakStatement);
        case Syntax.ReturnKeyword:
          return this.returnStatement();
        case Syntax.WithKeyword:
          return this.withStatement();
        case Syntax.SwitchKeyword:
          return this.switchStatement();
        case Syntax.ThrowKeyword:
          return this.throwStatement();
        case Syntax.TryKeyword:
        case Syntax.CatchKeyword:
        case Syntax.FinallyKeyword:
          return this.tryStatement();
        case Syntax.DebuggerKeyword:
          return this.debuggerStatement();
        case Syntax.AtToken:
          return this.declaration();
        case Syntax.AsyncKeyword:
        case Syntax.InterfaceKeyword:
        case Syntax.TypeKeyword:
        case Syntax.ModuleKeyword:
        case Syntax.NamespaceKeyword:
        case Syntax.DeclareKeyword:
        case Syntax.ConstKeyword:
        case Syntax.EnumKeyword:
        case Syntax.ExportKeyword:
        case Syntax.ImportKeyword:
        case Syntax.PrivateKeyword:
        case Syntax.ProtectedKeyword:
        case Syntax.PublicKeyword:
        case Syntax.AbstractKeyword:
        case Syntax.StaticKeyword:
        case Syntax.ReadonlyKeyword:
        case Syntax.GlobalKeyword:
          if (is.startOfDeclaration()) return this.declaration();
          break;
      }
      return this.expressionOrLabeledStatement();
    }
    declaration(): qc.Statement {
      const modifiers = lookAhead(() => (this.decorators(), this.modifiers()));
      const isAmbient = some(modifiers, is.declareModifier);
      if (isAmbient) {
        const n = ctx.tryReuseAmbientDeclaration();
        if (n) return n;
      }
      const n = create.nodeWithDoc(Syntax.Unknown);
      n.decorators = this.decorators();
      n.modifiers = this.modifiers();
      if (isAmbient) {
        for (const m of n.modifiers!) {
          m.flags |= NodeFlags.Ambient;
        }
        return flags.withContext(NodeFlags.Ambient, () => this.declarationWorker(n));
      } else return this.declarationWorker(n);
    }
    declarationWorker(n: qc.Statement): qc.Statement {
      switch (tok()) {
        case Syntax.VarKeyword:
        case Syntax.LetKeyword:
        case Syntax.ConstKeyword:
          return this.variableStatement(<VariableStatement>n);
        case Syntax.FunctionKeyword:
          return this.functionDeclaration(<FunctionDeclaration>n);
        case Syntax.ClassKeyword:
          return this.classDeclaration(<ClassDeclaration>n);
        case Syntax.InterfaceKeyword:
          return this.interfaceDeclaration(<InterfaceDeclaration>n);
        case Syntax.TypeKeyword:
          return this.typeAliasDeclaration(<TypeAliasDeclaration>n);
        case Syntax.EnumKeyword:
          return this.enumDeclaration(<EnumDeclaration>n);
        case Syntax.GlobalKeyword:
        case Syntax.ModuleKeyword:
        case Syntax.NamespaceKeyword:
          return this.moduleDeclaration(<ModuleDeclaration>n);
        case Syntax.ImportKeyword:
          return this.importDeclarationOrImportEqualsDeclaration(<ImportDeclaration | ImportEqualsDeclaration>n);
        case Syntax.ExportKeyword:
          next.tok();
          switch (tok()) {
            case Syntax.DefaultKeyword:
            case Syntax.EqualsToken:
              return this.exportAssignment(<ExportAssignment>n);
            case Syntax.AsKeyword:
              return this.namespaceExportDeclaration(<NamespaceExportDeclaration>n);
            default:
              return this.exportDeclaration(<ExportDeclaration>n);
          }
        default:
          if (n.decorators || n.modifiers) {
            const missing = create.missingNode<Statement>(Syntax.MissingDeclaration, true, qd.msgs.Declaration_expected);
            missing.pos = n.pos;
            missing.decorators = n.decorators;
            missing.modifiers = n.modifiers;
            return finishNode(missing);
          }
          return undefined!;
      }
    }
    functionBlockOrSemicolon(flags: SignatureFlags, m?: qd.Message): qt.Block | undefined {
      if (tok() !== Syntax.OpenBraceToken && can.parseSemicolon()) {
        this.semicolon();
        return;
      }
      return this.functionBlock(flags, m);
    }
    arrayBindingElem(): qc.ArrayBindingElem {
      if (tok() === Syntax.CommaToken) return create.node(Syntax.OmittedExpression);
      const n = create.node(Syntax.BindingElem);
      n.dot3Token = this.optionalToken(Syntax.Dot3Token);
      n.name = this.identifierOrPattern();
      n.initer = this.initer();
      return finishNode(n);
    }
    objectBindingElem(): qc.BindingElem {
      const n = create.node(Syntax.BindingElem);
      n.dot3Token = this.optionalToken(Syntax.Dot3Token);
      const tokenIsIdentifier = is.identifier();
      const propertyName = this.propertyName();
      if (tokenIsIdentifier && tok() !== Syntax.ColonToken) n.name = <qc.Identifier>propertyName;
      else {
        this.expected(Syntax.ColonToken);
        n.propertyName = propertyName;
        n.name = this.identifierOrPattern();
      }
      n.initer = this.initer();
      return finishNode(n);
    }
    objectBindingPattern(): qc.ObjectBindingPattern {
      const n = create.node(Syntax.ObjectBindingPattern);
      this.expected(Syntax.OpenBraceToken);
      n.elems = ctx.parseDelimitedList(Context.ObjectBindingElems, this.objectBindingElem);
      this.expected(Syntax.CloseBraceToken);
      return finishNode(n);
    }
    arrayBindingPattern(): qc.ArrayBindingPattern {
      const n = create.node(Syntax.ArrayBindingPattern);
      this.expected(Syntax.OpenBracketToken);
      n.elems = ctx.parseDelimitedList(Context.ArrayBindingElems, this.arrayBindingElem);
      this.expected(Syntax.CloseBracketToken);
      return finishNode(n);
    }
    identifierOrPattern(m?: qd.Message): qc.Identifier | qc.BindingPattern {
      if (tok() === Syntax.OpenBracketToken) return this.arrayBindingPattern();
      if (tok() === Syntax.OpenBraceToken) return this.objectBindingPattern();
      return this.identifier(undefined, m);
    }
    variableDeclarationAllowExclamation() {
      return this.variableDeclaration(true);
    }
    variableDeclaration(allowExclamation?: boolean): qc.VariableDeclaration {
      const n = create.node(Syntax.VariableDeclaration);
      n.name = this.identifierOrPattern(qd.msgs.Private_identifiers_are_not_allowed_in_variable_declarations);
      if (allowExclamation && n.name.kind === Syntax.Identifier && tok() === Syntax.ExclamationToken && !scanner.hasPrecedingLineBreak()) {
        n.exclamationToken = this.tokenNode<Token<Syntax.ExclamationToken>>();
      }
      n.type = this.typeAnnotation();
      if (!is.inOrOfKeyword(tok())) n.initer = this.initer();
      return finishNode(n);
    }
    variableDeclarationList(inForStatementIniter: boolean): qc.VariableDeclarationList {
      const n = create.node(Syntax.VariableDeclarationList);
      switch (tok()) {
        case Syntax.VarKeyword:
          break;
        case Syntax.LetKeyword:
          n.flags |= NodeFlags.Let;
          break;
        case Syntax.ConstKeyword:
          n.flags |= NodeFlags.Const;
          break;
        default:
          qu.fail();
      }
      next.tok();
      if (tok() === Syntax.OfKeyword && lookAhead(can.followContextualOfKeyword)) {
        n.declarations = create.missingList<VariableDeclaration>();
      } else {
        const f = flags.inContext(NodeFlags.DisallowInContext);
        flags.set(inForStatementIniter, NodeFlags.DisallowInContext);
        n.declarations = ctx.parseDelimitedList(Context.VariableDeclarations, inForStatementIniter ? this.variableDeclaration : this.variableDeclarationAllowExclamation);
        flags.set(f, NodeFlags.DisallowInContext);
      }
      return finishNode(n);
    }
    variableStatement(n: qc.VariableStatement): qc.VariableStatement {
      n.kind = Syntax.VariableStatement;
      n.declarationList = this.variableDeclarationList(false);
      this.semicolon();
      return finishNode(n);
    }
    functionDeclaration(n: qc.FunctionDeclaration): qc.FunctionDeclaration {
      n.kind = Syntax.FunctionDeclaration;
      this.expected(Syntax.FunctionKeyword);
      n.asteriskToken = this.optionalToken(Syntax.AsteriskToken);
      n.name = hasModifierOfKind(n, Syntax.DefaultKeyword) ? this.optionalIdentifier() : this.identifier();
      const isGenerator = n.asteriskToken ? SignatureFlags.Yield : SignatureFlags.None;
      const isAsync = hasModifierOfKind(n, Syntax.AsyncKeyword) ? SignatureFlags.Await : SignatureFlags.None;
      fillSignature(Syntax.ColonToken, isGenerator | isAsync, n);
      n.body = this.functionBlockOrSemicolon(isGenerator | isAsync, qd.msgs.or_expected);
      return finishNode(n);
    }
    constructorName() {
      if (tok() === Syntax.ConstructorKeyword) return this.expected(Syntax.ConstructorKeyword);
      if (tok() === Syntax.StringLiteral && lookAhead(next.tok) === Syntax.OpenParenToken) {
        return tryParse(() => {
          const literalNode = this.literalNode();
          return literalNode.text === 'constructor' ? literalNode : undefined;
        });
      }
      return;
    }
    methodDeclaration(n: qc.MethodDeclaration, asteriskToken: qc.AsteriskToken, m?: qd.Message): qc.MethodDeclaration {
      n.kind = Syntax.MethodDeclaration;
      n.asteriskToken = asteriskToken;
      const isGenerator = asteriskToken ? SignatureFlags.Yield : SignatureFlags.None;
      const isAsync = hasModifierOfKind(n, Syntax.AsyncKeyword) ? SignatureFlags.Await : SignatureFlags.None;
      fillSignature(Syntax.ColonToken, isGenerator | isAsync, n);
      n.body = this.functionBlockOrSemicolon(isGenerator | isAsync, m);
      return finishNode(n);
    }
    propertyDeclaration(n: qc.PropertyDeclaration): qc.PropertyDeclaration {
      n.kind = Syntax.PropertyDeclaration;
      if (!n.questionToken && tok() === Syntax.ExclamationToken && !scanner.hasPrecedingLineBreak()) {
        n.exclamationToken = this.tokenNode<Token<Syntax.ExclamationToken>>();
      }
      n.type = this.typeAnnotation();
      n.initer = flags.withoutContext(NodeFlags.YieldContext | NodeFlags.AwaitContext | NodeFlags.DisallowInContext, this.initer);
      this.semicolon();
      return finishNode(n);
    }
    propertyOrMethodDeclaration(n: qc.PropertyDeclaration | qc.MethodDeclaration): qc.PropertyDeclaration | qc.MethodDeclaration {
      const asteriskToken = this.optionalToken(Syntax.AsteriskToken);
      n.name = this.propertyName();
      n.questionToken = this.optionalToken(Syntax.QuestionToken);
      if (asteriskToken || tok() === Syntax.OpenParenToken || tok() === Syntax.LessThanToken) return this.methodDeclaration(<MethodDeclaration>n, asteriskToken, qd.msgs.or_expected);
      return this.propertyDeclaration(<PropertyDeclaration>n);
    }
    accessorDeclaration(n: qc.AccessorDeclaration, kind: qc.AccessorDeclaration['kind']): qc.AccessorDeclaration {
      n.kind = kind;
      n.name = this.propertyName();
      fillSignature(Syntax.ColonToken, SignatureFlags.None, n);
      n.body = this.functionBlockOrSemicolon(SignatureFlags.None);
      return finishNode(n);
    }
    decorators(): Nodes<Decorator> | undefined {
      let list: Decorator[] | undefined;
      const listPos = getNodePos();
      while (true) {
        const decoratorStart = getNodePos();
        if (!this.optional(Syntax.AtToken)) break;
        const n = create.node(Syntax.Decorator, decoratorStart);
        n.expression = flags.withDecorator(this.leftHandSideExpressionOrHigher);
        finishNode(n);
        (list || (list = [])).push(n);
      }
      return list && create.nodes(list, listPos);
    }
    modifiers(permitInvalidConstAsModifier?: boolean): Nodes<Modifier> | undefined {
      let list: Modifier[] | undefined;
      const listPos = getNodePos();
      while (true) {
        const modifierStart = scanner.getStartPos();
        const modifierKind = tok();
        if (tok() === Syntax.ConstKeyword && permitInvalidConstAsModifier) {
          if (!tryParse(next.isOnSameLineAndCanFollowModifier)) break;
        } else if (!qy.is.modifier(tok()) || !tryParse(next.canFollowModifier)) break;
        const modifier = finishNode(create.node(modifierKind, modifierStart));
        (list || (list = [])).push(modifier);
      }
      return list && create.nodes(list, listPos);
    }
    modifiersForArrowFunction(): Nodes<Modifier> | undefined {
      let modifiers: Nodes<Modifier> | undefined;
      if (tok() === Syntax.AsyncKeyword) {
        const modifierStart = scanner.getStartPos();
        const modifierKind = tok();
        next.tok();
        const modifier = finishNode(create.node(modifierKind, modifierStart));
        modifiers = create.nodes<Modifier>([modifier], modifierStart);
      }
      return modifiers;
    }
    classElem(): qc.ClassElem {
      if (tok() === Syntax.SemicolonToken) {
        const n = create.node(Syntax.SemicolonClassElem);
        next.tok();
        return finishNode(n);
      }
      const n = create.node(Syntax.Unknown);
      n.decorators = this.decorators();
      n.modifiers = this.modifiers(true);
      if (this.contextualModifier(Syntax.GetKeyword)) return this.accessorDeclaration(<AccessorDeclaration>n, Syntax.GetAccessor);
      if (this.contextualModifier(Syntax.SetKeyword)) return this.accessorDeclaration(<AccessorDeclaration>n, Syntax.SetAccessor);
      if (tok() === Syntax.ConstructorKeyword || tok() === Syntax.StringLiteral) {
        const tryConstructorDeclaration = (n: qc.ConstructorDeclaration) => {
          return tryParse(() => {
            if (parse.constructorName()) {
              n.kind = Syntax.Constructor;
              fillSignature(Syntax.ColonToken, SignatureFlags.None, n);
              n.body = parse.functionBlockOrSemicolon(SignatureFlags.None, qd.msgs.or_expected);
              return finishNode(n);
            }
            return;
          });
        };
        const d = tryConstructorDeclaration(n as qc.ConstructorDeclaration);
        if (d) return d;
      }
      if (is.indexSignature()) return this.indexSignatureDeclaration(<IndexSignatureDeclaration>n);
      if (qy.is.identifierOrKeyword(tok()) || tok() === Syntax.StringLiteral || tok() === Syntax.NumericLiteral || tok() === Syntax.AsteriskToken || tok() === Syntax.OpenBracketToken) {
        const isAmbient = n.modifiers && some(n.modifiers, is.declareModifier);
        if (isAmbient) {
          for (const m of n.modifiers!) {
            m.flags |= NodeFlags.Ambient;
          }
          return flags.withContext(NodeFlags.Ambient, () => this.propertyOrMethodDeclaration(n as qc.PropertyDeclaration | qc.MethodDeclaration));
        }
        return this.propertyOrMethodDeclaration(n as qc.PropertyDeclaration | qc.MethodDeclaration);
      }
      if (n.decorators || n.modifiers) {
        n.name = create.missingNode<qc.Identifier>(Syntax.Identifier, true, qd.msgs.Declaration_expected);
        return this.propertyDeclaration(<PropertyDeclaration>n);
      }
      return qu.fail('Should not have attempted to parse class member declaration.');
    }
    classExpression(): qc.ClassExpression {
      return <ClassExpression>this.classDeclarationOrExpression(create.nodeWithDoc(Syntax.Unknown), Syntax.ClassExpression);
    }
    classDeclaration(n: ClassLikeDeclaration): ClassDeclaration {
      return <ClassDeclaration>this.classDeclarationOrExpression(n, Syntax.ClassDeclaration);
    }
    classDeclarationOrExpression(n: ClassLikeDeclaration, kind: ClassLikeDeclaration['kind']): ClassLikeDeclaration {
      n.kind = kind;
      this.expected(Syntax.ClassKeyword);
      n.name = this.nameOfClassDeclarationOrExpression();
      n.typeParams = this.typeParams();
      n.heritageClauses = this.heritageClauses();
      if (this.expected(Syntax.OpenBraceToken)) {
        n.members = this.classMembers();
        this.expected(Syntax.CloseBraceToken);
      } else n.members = create.missingList<ClassElem>();
      return finishNode(n);
    }
    nameOfClassDeclarationOrExpression(): qc.Identifier | undefined {
      const isImplementsClause = () => tok() === Syntax.ImplementsKeyword && lookAhead(next.isIdentifierOrKeyword);
      return is.identifier() && !isImplementsClause() ? this.identifier() : undefined;
    }
    heritageClauses(): Nodes<HeritageClause> | undefined {
      if (is.heritageClause()) return ctx.parseList(Context.HeritageClauses, this.heritageClause);
      return;
    }
    heritageClause(): qc.HeritageClause {
      const t = tok();
      qu.assert(t === Syntax.ExtendsKeyword || t === Syntax.ImplementsKeyword);
      const n = create.node(Syntax.HeritageClause);
      n.token = t;
      next.tok();
      n.types = ctx.parseDelimitedList(Context.HeritageClauseElem, this.expressionWithTypeArgs);
      return finishNode(n);
    }
    expressionWithTypeArgs(): qt.ExpressionWithTypings {
      const n = create.node(Syntax.ExpressionWithTypings);
      n.expression = this.leftHandSideExpressionOrHigher();
      n.typeArgs = parse.typeArgs();
      return finishNode(n);
    }
    classMembers(): Nodes<ClassElem> {
      return ctx.parseList(Context.ClassMembers, this.classElem);
    }
    interfaceDeclaration(n: InterfaceDeclaration): InterfaceDeclaration {
      n.kind = Syntax.InterfaceDeclaration;
      this.expected(Syntax.InterfaceKeyword);
      n.name = this.identifier();
      n.typeParams = this.typeParams();
      n.heritageClauses = this.heritageClauses();
      n.members = this.objectTypeMembers();
      return finishNode(n);
    }
    typeAliasDeclaration(n: TypeAliasDeclaration): TypeAliasDeclaration {
      n.kind = Syntax.TypeAliasDeclaration;
      this.expected(Syntax.TypeKeyword);
      n.name = this.identifier();
      n.typeParams = this.typeParams();
      this.expected(Syntax.EqualsToken);
      n.type = this.type();
      this.semicolon();
      return finishNode(n);
    }
    enumMember(): EnumMember {
      const n = create.nodeWithDoc(Syntax.EnumMember);
      n.name = this.propertyName();
      n.initer = flags.withoutDisallowIn(this.initer);
      return finishNode(n);
    }
    enumDeclaration(n: EnumDeclaration): EnumDeclaration {
      n.kind = Syntax.EnumDeclaration;
      this.expected(Syntax.EnumKeyword);
      n.name = this.identifier();
      if (this.expected(Syntax.OpenBraceToken)) {
        n.members = flags.withoutYieldAndAwait(() => ctx.parseDelimitedList(Context.EnumMembers, this.enumMember));
        this.expected(Syntax.CloseBraceToken);
      } else {
        n.members = create.missingList<EnumMember>();
      }
      return finishNode(n);
    }
    moduleBlock(): ModuleBlock {
      const n = create.node(Syntax.ModuleBlock);
      if (this.expected(Syntax.OpenBraceToken)) {
        n.statements = ctx.parseList(Context.BlockStatements, this.statement);
        this.expected(Syntax.CloseBraceToken);
      } else n.statements = create.missingList<Statement>();
      return finishNode(n);
    }
    moduleOrNamespaceDeclaration(n: ModuleDeclaration, flags: NodeFlags): ModuleDeclaration {
      n.kind = Syntax.ModuleDeclaration;
      const namespaceFlag = flags & NodeFlags.Namespace;
      n.flags |= flags;
      n.name = this.identifier();
      n.body = this.optional(Syntax.DotToken) ? <NamespaceDeclaration>this.moduleOrNamespaceDeclaration(create.node(Syntax.Unknown), NodeFlags.NestedNamespace | namespaceFlag) : this.moduleBlock();
      return finishNode(n);
    }
    ambientExternalModuleDeclaration(n: ModuleDeclaration): ModuleDeclaration {
      n.kind = Syntax.ModuleDeclaration;
      if (tok() === Syntax.GlobalKeyword) {
        n.name = this.identifier();
        n.flags |= NodeFlags.GlobalAugmentation;
      } else {
        n.name = <StringLiteral>this.literalNode();
        n.name.text = internIdentifier(n.name.text);
      }
      if (tok() === Syntax.OpenBraceToken) n.body = this.moduleBlock();
      else this.semicolon();
      return finishNode(n);
    }
    moduleDeclaration(n: ModuleDeclaration): ModuleDeclaration {
      let flags: NodeFlags = 0;
      if (tok() === Syntax.GlobalKeyword) return this.ambientExternalModuleDeclaration(n);
      else if (this.optional(Syntax.NamespaceKeyword)) flags |= NodeFlags.Namespace;
      else {
        this.expected(Syntax.ModuleKeyword);
        if (tok() === Syntax.StringLiteral) return this.ambientExternalModuleDeclaration(n);
      }
      return this.moduleOrNamespaceDeclaration(n, flags);
    }
    namespaceExportDeclaration(n: NamespaceExportDeclaration): NamespaceExportDeclaration {
      n.kind = Syntax.NamespaceExportDeclaration;
      this.expected(Syntax.AsKeyword);
      this.expected(Syntax.NamespaceKeyword);
      n.name = this.identifier();
      this.semicolon();
      return finishNode(n);
    }
    importDeclarationOrImportEqualsDeclaration(n: ImportEqualsDeclaration | ImportDeclaration): ImportEqualsDeclaration | ImportDeclaration {
      this.expected(Syntax.ImportKeyword);
      const afterImportPos = scanner.getStartPos();
      let identifier: qc.Identifier | undefined;
      if (is.identifier()) identifier = this.identifier();
      let isTypeOnly = false;
      const tokenAfterImportDefinitelyProducesImportDeclaration = () => {
        return tok() === Syntax.AsteriskToken || tok() === Syntax.OpenBraceToken;
      };
      if (tok() !== Syntax.FromKeyword && identifier?.escapedText === 'type' && (is.identifier() || tokenAfterImportDefinitelyProducesImportDeclaration())) {
        isTypeOnly = true;
        identifier = is.identifier() ? this.identifier() : undefined;
      }
      const tokenAfterImportedIdentifierDefinitelyProducesImportDeclaration = () => {
        return tok() === Syntax.CommaToken || tok() === Syntax.FromKeyword;
      };
      if (identifier && !tokenAfterImportedIdentifierDefinitelyProducesImportDeclaration()) return this.importEqualsDeclaration(<ImportEqualsDeclaration>n, identifier, isTypeOnly);
      n.kind = Syntax.ImportDeclaration;
      if (identifier || tok() === Syntax.AsteriskToken || tok() === Syntax.OpenBraceToken) {
        (<ImportDeclaration>n).importClause = this.importClause(identifier, afterImportPos, isTypeOnly);
        this.expected(Syntax.FromKeyword);
      }
      (<ImportDeclaration>n).moduleSpecifier = this.moduleSpecifier();
      this.semicolon();
      return finishNode(n);
    }
    importEqualsDeclaration(n: ImportEqualsDeclaration, identifier: qc.Identifier, isTypeOnly: boolean): ImportEqualsDeclaration {
      n.kind = Syntax.ImportEqualsDeclaration;
      n.name = identifier;
      this.expected(Syntax.EqualsToken);
      n.moduleReference = this.moduleReference();
      this.semicolon();
      const finished = finishNode(n);
      if (isTypeOnly) this.errorAtRange(finished, qd.msgs.Only_ECMAScript_imports_may_use_import_type);
      return finished;
    }
    importClause(identifier: qc.Identifier | undefined, fullStart: number, isTypeOnly: boolean) {
      const n = create.node(Syntax.ImportClause, fullStart);
      n.isTypeOnly = isTypeOnly;
      if (identifier) n.name = identifier;
      if (!n.name || this.optional(Syntax.CommaToken)) n.namedBindings = tok() === Syntax.AsteriskToken ? this.namespaceImport() : this.namedImportsOrExports(Syntax.NamedImports);
      return finishNode(n);
    }
    moduleReference() {
      const isExternalModuleReference = () => tok() === Syntax.RequireKeyword && lookAhead(next.isOpenParen);
      return isExternalModuleReference() ? this.externalModuleReference() : this.entityName(false);
    }
    externalModuleReference() {
      const n = create.node(Syntax.ExternalModuleReference);
      this.expected(Syntax.RequireKeyword);
      this.expected(Syntax.OpenParenToken);
      n.expression = this.moduleSpecifier();
      this.expected(Syntax.CloseParenToken);
      return finishNode(n);
    }
    moduleSpecifier(): qt.Expression {
      if (tok() === Syntax.StringLiteral) {
        const result = this.literalNode();
        result.text = internIdentifier(result.text);
        return result;
      }
      return this.expression();
    }
    namespaceImport(): NamespaceImport {
      const n = create.node(Syntax.NamespaceImport);
      this.expected(Syntax.AsteriskToken);
      this.expected(Syntax.AsKeyword);
      n.name = this.identifier();
      return finishNode(n);
    }
    namedImportsOrExports(kind: Syntax.NamedImports): NamedImports;
    namedImportsOrExports(kind: Syntax.NamedExports): NamedExports;
    namedImportsOrExports(kind: Syntax): NamedImportsOrExports {
      const n = create.node(kind);
      n.elems = <Nodes<ImportSpecifier> | Nodes<ExportSpecifier>>(
        ctx.parseBracketedList(Context.ImportOrExportSpecifiers, kind === Syntax.NamedImports ? this.importSpecifier : this.exportSpecifier, Syntax.OpenBraceToken, Syntax.CloseBraceToken)
      );
      return finishNode(n);
    }
    exportSpecifier() {
      return this.importOrExportSpecifier(Syntax.ExportSpecifier);
    }
    importSpecifier() {
      return this.importOrExportSpecifier(Syntax.ImportSpecifier);
    }
    importOrExportSpecifier(kind: Syntax): ImportOrExportSpecifier {
      const n = create.node(kind);
      let checkIdentifierIsKeyword = qy.is.keyword(tok()) && !is.identifier();
      let checkIdentifierStart = scanner.getTokenPos();
      let checkIdentifierEnd = scanner.getTextPos();
      const identifierName = this.identifierName();
      if (tok() === Syntax.AsKeyword) {
        n.propertyName = identifierName;
        this.expected(Syntax.AsKeyword);
        checkIdentifierIsKeyword = qy.is.keyword(tok()) && !is.identifier();
        checkIdentifierStart = scanner.getTokenPos();
        checkIdentifierEnd = scanner.getTextPos();
        n.name = this.identifierName();
      } else n.name = identifierName;
      if (kind === Syntax.ImportSpecifier && checkIdentifierIsKeyword) this.errorAt(checkIdentifierStart, checkIdentifierEnd, qd.msgs.Identifier_expected);
      return finishNode(n);
    }
    namespaceExport(pos: number): NamespaceExport {
      const n = create.node(Syntax.NamespaceExport, pos);
      n.name = this.identifier();
      return finishNode(n);
    }
    exportDeclaration(n: ExportDeclaration): ExportDeclaration {
      n.kind = Syntax.ExportDeclaration;
      n.isTypeOnly = this.optional(Syntax.TypeKeyword);
      const namespaceExportPos = scanner.getStartPos();
      if (this.optional(Syntax.AsteriskToken)) {
        if (this.optional(Syntax.AsKeyword)) n.exportClause = this.namespaceExport(namespaceExportPos);
        this.expected(Syntax.FromKeyword);
        n.moduleSpecifier = this.moduleSpecifier();
      } else {
        n.exportClause = this.namedImportsOrExports(Syntax.NamedExports);
        if (tok() === Syntax.FromKeyword || (tok() === Syntax.StringLiteral && !scanner.hasPrecedingLineBreak())) {
          this.expected(Syntax.FromKeyword);
          n.moduleSpecifier = this.moduleSpecifier();
        }
      }
      this.semicolon();
      return finishNode(n);
    }
    exportAssignment(n: qt.ExportAssignment): qt.ExportAssignment {
      n.kind = Syntax.ExportAssignment;
      if (this.optional(Syntax.EqualsToken)) n.isExportEquals = true;
      else this.expected(Syntax.DefaultKeyword);
      n.expression = this.assignmentExpressionOrHigher();
      this.semicolon();
      return finishNode(n);
    }
    errorAtToken(m: qd.Message, arg0?: any) {
      this.errorAt(scanner.getTokenPos(), scanner.getTextPos(), m, arg0);
    }
    errorAtPosition(start: number, length: number, m: qd.Message, arg0?: any) {
      const l = lastOrUndefined(diags);
      if (!l || start !== l.start) diags.push(qf.create.fileDiagnostic(source, start, length, m, arg0));
      parseErrorBeforeNextFinishedNode = true;
    }
    errorAt(start: number, end: number, m: qd.Message, arg0?: any) {
      this.errorAtPosition(start, end - start, m, arg0);
    }
    errorAtRange(r: qu.TextRange, m: qd.Message, arg0?: any) {
      this.errorAt(r.pos, r.end, m, arg0);
    }
    scanError(m: qd.Message, length: number) {
      this.errorAtPosition(scanner.getTextPos(), length, m);
    }
    reparseOptionalChain(n: qt.Expression) {
      if (n.flags & NodeFlags.OptionalChain) return true;
      if (n.kind === Syntax.NonNullExpression) {
        let expr = n.expression;
        while (expr.kind === Syntax.NonNullExpression && !(expr.flags & NodeFlags.OptionalChain)) {
          expr = expr.expression;
        }
        if (expr.flags & NodeFlags.OptionalChain) {
          while (n.kind === Syntax.NonNullExpression) {
            n.flags |= NodeFlags.OptionalChain;
            n = n.expression;
          }
          return true;
        }
      }
      return false;
    }
    typeArgs(): Nodes<qt.Typing> | undefined {
      return tok() === Syntax.LessThanToken ? ctx.parseBracketedList(Context.TypeArgs, parse.type, Syntax.LessThanToken, Syntax.GreaterThanToken) : undefined;
    }
  })();
  const parseJsx = new (class {
    scanText(): Syntax {
      return (currentToken = scanner.scanJsxToken());
    }
    scanIdentifier(): Syntax {
      return (currentToken = scanner.scanJsxIdentifier());
    }
    scanAttributeValue(): Syntax {
      return (currentToken = scanner.scanJsxAttributeValue());
    }
    elemOrSelfClosingElemOrFragment(inExpressionContext: boolean): JsxElem | JsxSelfClosingElem | JsxFragment {
      const opening = this.openingOrSelfClosingElemOrOpeningFragment(inExpressionContext);
      let r: JsxElem | JsxSelfClosingElem | JsxFragment;
      if (opening.kind === Syntax.JsxOpeningElem) {
        const n = create.node(Syntax.JsxElem, opening.pos);
        n.opening = opening;
        n.children = ctx.parseJsxChildren(n.opening);
        n.closing = this.closing(inExpressionContext);
        const tagNamesEq = (a: JsxTagNameExpression, b: JsxTagNameExpression): boolean => {
          if (a.kind !== b.kind) return false;
          if (a.kind === Syntax.Identifier) return a.escapedText === (<qc.Identifier>b).escapedText;
          if (a.kind === Syntax.ThisKeyword) return true;
          return (
            (a as PropertyAccessExpression).name.escapedText === (b as PropertyAccessExpression).name.escapedText &&
            tagNamesEq(a.expression as JsxTagNameExpression, (b as PropertyAccessExpression).expression as JsxTagNameExpression)
          );
        };
        if (!tagNamesEq(n.opening.tagName, n.closing.tagName)) {
          parse.errorAtRange(n.closing, qd.msgs.Expected_corresponding_JSX_closing_tag_for_0, qf.get.textOfNodeFromSourceText(sourceText, n.opening.tagName));
        }
        r = finishNode(n);
      } else if (opening.kind === Syntax.JsxOpeningFragment) {
        const n = create.node(Syntax.JsxFragment, opening.pos);
        n.openingFragment = opening;
        n.children = ctx.parseJsxChildren(n.openingFragment);
        n.closingFragment = this.closingFragment(inExpressionContext);
        r = finishNode(n);
      } else {
        qu.assert(opening.kind === Syntax.JsxSelfClosingElem);
        r = opening;
      }
      if (inExpressionContext && tok() === Syntax.LessThanToken) {
        const invalid = tryParse(() => this.elemOrSelfClosingElemOrFragment(true));
        if (invalid) {
          parse.errorAtToken(qd.msgs.JSX_expressions_must_have_one_parent_elem);
          const n2 = create.node(Syntax.BinaryExpression, r.pos);
          n2.end = invalid.end;
          n2.left = r;
          n2.right = invalid;
          n2.operatorToken = create.missingNode(Syntax.CommaToken, false);
          n2.operatorToken.pos = n2.operatorToken.end = n2.right.pos;
          return (n2 as Node) as JsxElem;
        }
      }
      return r;
    }
    text(): JsxText {
      const n = create.node(Syntax.JsxText);
      n.text = scanner.getTokenValue();
      n.onlyTriviaWhitespaces = currentToken === Syntax.JsxTextAllWhiteSpaces;
      currentToken = scanner.scanJsxToken();
      return finishNode(n);
    }
    child(openingTag: JsxOpeningElem | JsxOpeningFragment, token: JsxTokenSyntax): JsxChild | undefined {
      switch (token) {
        case Syntax.EndOfFileToken:
          if (openingTag.kind === Syntax.JsxOpeningFragment) {
            parse.errorAtRange(openingTag, qd.msgs.JSX_fragment_has_no_corresponding_closing_tag);
          } else {
            const tag = openingTag.tagName;
            const start = qy.skipTrivia(sourceText, tag.pos);
            parse.errorAt(start, tag.end, qd.msgs.JSX_elem_0_has_no_corresponding_closing_tag, qf.get.textOfNodeFromSourceText(sourceText, openingTag.tagName));
          }
          return;
        case Syntax.LessThanSlashToken:
        case Syntax.ConflictMarkerTrivia:
          return;
        case Syntax.JsxText:
        case Syntax.JsxTextAllWhiteSpaces:
          return this.text();
        case Syntax.OpenBraceToken:
          return this.expression(false);
        case Syntax.LessThanToken:
          return this.elemOrSelfClosingElemOrFragment(false);
        default:
          return qc.assert.never(token);
      }
    }
    attributes(): JsxAttributes {
      const n = create.node(Syntax.JsxAttributes);
      n.properties = ctx.parseList(Context.JsxAttributes, this.attribute);
      return finishNode(n);
    }
    openingOrSelfClosingElemOrOpeningFragment(inExpressionContext: boolean): JsxOpeningElem | JsxSelfClosingElem | JsxOpeningFragment {
      const fullStart = scanner.getStartPos();
      parse.expected(Syntax.LessThanToken);
      if (tok() === Syntax.GreaterThanToken) {
        const n = create.node(Syntax.JsxOpeningFragment, fullStart);
        this.scanText();
        return finishNode(n);
      }
      const tagName = this.elemName();
      const typeArgs = parse.typeArgs();
      const attributes = this.attributes();
      let n: JsxOpeningLikeElem;
      if (tok() === Syntax.GreaterThanToken) {
        n = create.node(Syntax.JsxOpeningElem, fullStart);
        this.scanText();
      } else {
        parse.expected(Syntax.SlashToken);
        if (inExpressionContext) parse.expected(Syntax.GreaterThanToken);
        else {
          parse.expected(Syntax.GreaterThanToken, undefined, false);
          this.scanText();
        }
        n = create.node(Syntax.JsxSelfClosingElem, fullStart);
      }
      n.tagName = tagName;
      n.typeArgs = typeArgs;
      n.attributes = attributes;
      return finishNode(n);
    }
    elemName(): JsxTagNameExpression {
      this.scanIdentifier();
      let e: JsxTagNameExpression = tok() === Syntax.ThisKeyword ? parse.tokenNode<ThisExpression>() : parse.identifierName();
      while (parse.optional(Syntax.DotToken)) {
        const n = create.node(Syntax.PropertyAccessExpression, e.pos);
        n.expression = e;
        n.name = parse.rightSideOfDot(true, false);
        e = finishNode(n);
      }
      return e;
    }
    expression(inExpressionContext: boolean): JsxExpression | undefined {
      const n = create.node(Syntax.JsxExpression);
      if (!parse.expected(Syntax.OpenBraceToken)) return;
      if (tok() !== Syntax.CloseBraceToken) {
        n.dot3Token = parse.optionalToken(Syntax.Dot3Token);
        n.expression = parse.expression();
      }
      if (inExpressionContext) parse.expected(Syntax.CloseBraceToken);
      else {
        if (parse.expected(Syntax.CloseBraceToken, undefined, false)) this.scanText();
      }
      return finishNode(n);
    }
    attribute(): JsxAttribute | JsxSpreadAttribute {
      if (tok() === Syntax.OpenBraceToken) return this.spreadAttribute();
      this.scanIdentifier();
      const n = create.node(Syntax.JsxAttribute);
      n.name = parse.identifierName();
      if (tok() === Syntax.EqualsToken) {
        switch (this.scanAttributeValue()) {
          case Syntax.StringLiteral:
            n.initer = <StringLiteral>parse.literalNode();
            break;
          default:
            n.initer = this.expression(true);
            break;
        }
      }
      return finishNode(n);
    }
    spreadAttribute(): JsxSpreadAttribute {
      const n = create.node(Syntax.JsxSpreadAttribute);
      parse.expected(Syntax.OpenBraceToken);
      parse.expected(Syntax.Dot3Token);
      n.expression = parse.expression();
      parse.expected(Syntax.CloseBraceToken);
      return finishNode(n);
    }
    closing(inExpressionContext: boolean): JsxClosingElem {
      const n = create.node(Syntax.JsxClosingElem);
      parse.expected(Syntax.LessThanSlashToken);
      n.tagName = this.elemName();
      if (inExpressionContext) parse.expected(Syntax.GreaterThanToken);
      else {
        parse.expected(Syntax.GreaterThanToken, undefined, false);
        this.scanText();
      }
      return finishNode(n);
    }
    closingFragment(inExpressionContext: boolean): JsxClosingFragment {
      const n = create.node(Syntax.JsxClosingFragment);
      parse.expected(Syntax.LessThanSlashToken);
      if (qy.is.identifierOrKeyword(tok())) parse.errorAtRange(this.elemName(), qd.msgs.Expected_corresponding_closing_tag_for_JSX_fragment);
      if (inExpressionContext) parse.expected(Syntax.GreaterThanToken);
      else {
        parse.expected(Syntax.GreaterThanToken, undefined, false);
        this.scanText();
      }
      return finishNode(n);
    }
  })();
  const parseDoc = new (class {
    tags: DocTag[] = [];
    tagsPos = 0;
    tagsEnd = 0;
    comments: string[] = [];
    addTag(tag: DocTag | undefined): void {
      if (!tag) return;
      if (!this.tags) {
        this.tags = [tag];
        this.tagsPos = tag.pos;
      } else this.tags.push(tag);
      this.tagsEnd = tag.end;
    }
    removeLeadingNewlines(ss: string[]) {
      while (ss.length && (ss[0] === '\n' || ss[0] === '\r')) {
        ss.shift();
      }
    }
    removeTrailingWhitespace(ss: string[]) {
      while (ss.length && ss[ss.length - 1].trim() === '') {
        ss.pop();
      }
    }
    comment(start = 0, length: number | undefined): Doc | undefined {
      const content = sourceText;
      const end = length === undefined ? content.length : start + length;
      length = end - start;
      qu.assert(start >= 0);
      qu.assert(start <= end);
      qu.assert(end <= content.length);
      if (!qy.is.docLike(content, start)) return;
      return scanner.scanRange(start + 3, length - 5, () => {
        let state = State.SawAsterisk;
        let margin: number | undefined;
        let indent = start - Math.max(content.lastIndexOf('\n', start), 0) + 4;
        const pushComment = (text: string) => {
          if (!margin) margin = indent;
          this.comments.push(text);
          indent += text.length;
        };
        next.tokDoc();
        while (this.optional(Syntax.WhitespaceTrivia));
        if (this.optional(Syntax.NewLineTrivia)) {
          state = State.BeginningOfLine;
          indent = 0;
        }
        loop: while (true) {
          switch (tok()) {
            case Syntax.AtToken:
              if (state === State.BeginningOfLine || state === State.SawAsterisk) {
                this.removeTrailingWhitespace(this.comments);
                this.addTag(this.tag(indent));
                state = State.BeginningOfLine;
                margin = undefined;
              } else pushComment(scanner.getTokenText());
              break;
            case Syntax.NewLineTrivia:
              this.comments.push(scanner.getTokenText());
              state = State.BeginningOfLine;
              indent = 0;
              break;
            case Syntax.AsteriskToken:
              const asterisk = scanner.getTokenText();
              if (state === State.SawAsterisk || state === State.SavingComments) {
                state = State.SavingComments;
                pushComment(asterisk);
              } else {
                state = State.SawAsterisk;
                indent += asterisk.length;
              }
              break;
            case Syntax.WhitespaceTrivia:
              const whitespace = scanner.getTokenText();
              if (state === State.SavingComments) this.comments.push(whitespace);
              else if (margin !== undefined && indent + whitespace.length > margin) {
                this.comments.push(whitespace.slice(margin - indent - 1));
              }
              indent += whitespace.length;
              break;
            case Syntax.EndOfFileToken:
              break loop;
            default:
              state = State.SavingComments;
              pushComment(scanner.getTokenText());
              break;
          }
          next.tokDoc();
        }
        this.removeLeadingNewlines(this.comments);
        this.removeTrailingWhitespace(this.comments);
        return new qc.Doc();
      });
    }
    expected(t: DocSyntax): boolean {
      if (tok() === t) {
        next.tokDoc();
        return true;
      }
      parse.errorAtToken(qd.msgs._0_expected, qy.toString(t));
      return false;
    }
    expectedToken<T extends DocSyntax>(t: T): Token<T>;
    expectedToken(t: DocSyntax): Node {
      return this.optionalToken(t) || create.missingNode(t, false, qd.msgs._0_expected, qy.toString(t));
    }
    optional(t: DocSyntax): boolean {
      if (tok() === t) {
        next.tokDoc();
        return true;
      }
      return false;
    }
    optionalToken<T extends DocSyntax>(t: T): Token<T>;
    optionalToken(t: DocSyntax): Node | undefined {
      if (tok() === t) {
        const n = create.node(tok());
        next.tokDoc();
        return finishNode(n);
      }
      return;
    }
    allType(postFixEquals: boolean): DocAllTyping | DocOptionalTyping {
      const n = create.node(Syntax.DocAllTyping);
      if (postFixEquals) return create.postfixType(Syntax.DocOptionalTyping, n) as DocOptionalTyping;
      next.tok();
      return finishNode(n);
    }
    nonNullableType(): qt.Typing {
      const n = create.node(Syntax.DocNonNullableTyping);
      next.tok();
      n.type = parse.nonArrayType();
      return finishNode(n);
    }
    unknownOrNullableType(): DocUnknownTyping | DocNullableTyping {
      const p = scanner.getStartPos();
      next.tok();
      if (
        tok() === Syntax.CommaToken ||
        tok() === Syntax.CloseBraceToken ||
        tok() === Syntax.CloseParenToken ||
        tok() === Syntax.GreaterThanToken ||
        tok() === Syntax.EqualsToken ||
        tok() === Syntax.BarToken
      ) {
        const n = create.node(Syntax.DocUnknownTyping, p);
        return finishNode(n);
      }
      const n = create.node(Syntax.DocNullableTyping, p);
      n.type = parse.type();
      return finishNode(n);
    }
    functionType(): DocFunctionTyping | qt.TypingReference {
      if (lookAhead(next.isOpenParen)) {
        const n = create.nodeWithDoc(Syntax.DocFunctionTyping);
        next.tok();
        fillSignature(Syntax.ColonToken, SignatureFlags.Type | SignatureFlags.Doc, n);
        return finishNode(n);
      }
      const n = create.node(Syntax.TypingReference);
      n.typeName = parse.identifierName();
      return finishNode(n);
    }
    param(): qc.ParamDeclaration {
      const n = create.node(Syntax.Param);
      if (tok() === Syntax.ThisKeyword || tok() === Syntax.NewKeyword) {
        n.name = parse.identifierName();
        parse.expected(Syntax.ColonToken);
      }
      n.type = this.type();
      return finishNode(n);
    }
    type(): qt.Typing {
      scanner.setInDocType(true);
      const m = parse.optionalToken(Syntax.ModuleKeyword);
      if (m) {
        const n = create.node(Syntax.DocNamepathTyping, m.pos);
        terminate: while (true) {
          switch (tok()) {
            case Syntax.CloseBraceToken:
            case Syntax.EndOfFileToken:
            case Syntax.CommaToken:
            case Syntax.WhitespaceTrivia:
              break terminate;
            default:
              next.tokDoc();
          }
        }
        scanner.setInDocType(false);
        return finishNode(n);
      }
      const d3 = parse.optionalToken(Syntax.Dot3Token);
      let type = parse.typeOrTypePredicate();
      scanner.setInDocType(false);
      if (d3) {
        const n = create.node(Syntax.DocVariadicTyping, d3.pos);
        n.type = type;
        type = finishNode(n);
      }
      if (tok() === Syntax.EqualsToken) return create.postfixType(Syntax.DocOptionalTyping, type);
      return type;
    }
    typeExpression(mayOmitBraces?: boolean): DocTypingExpression {
      const n = create.node(Syntax.DocTypingExpression);
      const hasBrace = (mayOmitBraces ? parse.optional : parse.expected)(Syntax.OpenBraceToken);
      n.type = flags.withContext(NodeFlags.Doc, this.type);
      if (!mayOmitBraces || hasBrace) this.expected(Syntax.CloseBraceToken);
      fixupParentReferences(n);
      return finishNode(n);
    }
    typeExpressionForTests(content: string, start: number | undefined, length: number | undefined): { docTypeExpression: DocTypingExpression; diagnostics: Diagnostic[] } | undefined {
      initializeState(content, qt.ScriptTarget.ESNext, undefined, ScriptKind.JS);
      source = create.source('file.js', qt.ScriptTarget.ESNext, ScriptKind.JS, false);
      scanner.setText(content, start, length);
      currentToken = scanner.scan();
      const docTypeExpression = this.typeExpression();
      const diagnostics = diags;
      clearState();
      return docTypeExpression ? { docTypeExpression, diagnostics } : undefined;
    }
    tag(margin: number) {
      qu.assert(tok() === Syntax.AtToken);
      const start = scanner.getTokenPos();
      next.tokDoc();
      const tagName = this.identifierName(undefined);
      const indentText = skipWhitespaceOrAsterisk();
      let tag: DocTag | undefined;
      switch (tagName.escapedText) {
        case 'author':
          tag = this.authorTag(start, tagName, margin);
          break;
        case 'implements':
          tag = this.implementsTag(start, tagName);
          break;
        case 'augments':
        case 'extends':
          tag = this.augmentsTag(start, tagName);
          break;
        case 'class':
        case 'constructor':
          tag = this.simpleTag(start, Syntax.DocClassTag, tagName);
          break;
        case 'public':
          tag = this.simpleTag(start, Syntax.DocPublicTag, tagName);
          break;
        case 'private':
          tag = this.simpleTag(start, Syntax.DocPrivateTag, tagName);
          break;
        case 'protected':
          tag = this.simpleTag(start, Syntax.DocProtectedTag, tagName);
          break;
        case 'readonly':
          tag = this.simpleTag(start, Syntax.DocReadonlyTag, tagName);
          break;
        case 'this':
          tag = this.thisTag(start, tagName);
          break;
        case 'enum':
          tag = this.enumTag(start, tagName);
          break;
        case 'arg':
        case 'arg':
        case 'param':
          return this.paramOrPropertyTag(start, tagName, PropertyLike.Param, margin);
        case 'return':
        case 'returns':
          tag = this.returnTag(start, tagName);
          break;
        case 'template':
          tag = this.templateTag(start, tagName);
          break;
        case 'type':
          tag = this.typeTag(start, tagName);
          break;
        case 'typedef':
          tag = this.typedefTag(start, tagName, margin);
          break;
        case 'callback':
          tag = this.callbackTag(start, tagName, margin);
          break;
        default:
          tag = this.unknownTag(start, tagName);
          break;
      }
      if (!tag.comment) {
        if (!indentText) margin += tag.end - tag.pos;
        tag.comment = this.tagComments(margin, indentText.slice(margin));
      }
      return tag;
    }
    tagComments(indent: number, initialMargin?: string): string | undefined {
      const comments: string[] = [];
      let state = State.BeginningOfLine;
      let margin: number | undefined;
      function pushComment(text: string) {
        if (!margin) margin = indent;
        comments.push(text);
        indent += text.length;
      }
      if (initialMargin !== undefined) {
        if (initialMargin !== '') pushComment(initialMargin);
        state = State.SawAsterisk;
      }
      let t = tok() as DocSyntax;
      loop: while (true) {
        switch (t) {
          case Syntax.NewLineTrivia:
            if (state >= State.SawAsterisk) {
              state = State.BeginningOfLine;
              comments.push(scanner.getTokenText());
            }
            indent = 0;
            break;
          case Syntax.AtToken:
            if (state === State.SavingBackticks) {
              comments.push(scanner.getTokenText());
              break;
            }
            scanner.setTextPos(scanner.getTextPos() - 1);
          case Syntax.EndOfFileToken:
            break loop;
          case Syntax.WhitespaceTrivia:
            if (state === State.SavingComments || state === State.SavingBackticks) {
              pushComment(scanner.getTokenText());
            } else {
              const whitespace = scanner.getTokenText();
              if (margin !== undefined && indent + whitespace.length > margin) comments.push(whitespace.slice(margin - indent));
              indent += whitespace.length;
            }
            break;
          case Syntax.OpenBraceToken:
            state = State.SavingComments;
            if (lookAhead(() => next.tokDoc() === Syntax.AtToken && qy.is.identifierOrKeyword(next.tokDoc()) && scanner.getTokenText() === 'link')) {
              pushComment(scanner.getTokenText());
              next.tokDoc();
              pushComment(scanner.getTokenText());
              next.tokDoc();
            }
            pushComment(scanner.getTokenText());
            break;
          case Syntax.BacktickToken:
            if (state === State.SavingBackticks) state = State.SavingComments;
            else state = State.SavingBackticks;
            pushComment(scanner.getTokenText());
            break;
          case Syntax.AsteriskToken:
            if (state === State.BeginningOfLine) {
              state = State.SawAsterisk;
              indent += 1;
              break;
            }
          default:
            if (state !== State.SavingBackticks) state = State.SavingComments;
            pushComment(scanner.getTokenText());
            break;
        }
        t = next.tokDoc();
      }
      this.removeLeadingNewlines(comments);
      this.removeTrailingWhitespace(comments);
      return comments.length === 0 ? undefined : comments.join('');
    }
    unknownTag(start: number, tagName: qc.Identifier) {
      const n = create.node(Syntax.DocUnknownTag, start);
      n.tagName = tagName;
      return finishNode(n);
    }
    tryTypeExpression(): DocTypingExpression | undefined {
      skipWhitespaceOrAsterisk();
      return tok() === Syntax.OpenBraceToken ? this.typeExpression() : undefined;
    }
    bracketNameInPropertyAndParamTag(): { name: qt.EntityName; isBracketed: boolean } {
      const isBracketed = this.optional(Syntax.OpenBracketToken);
      if (isBracketed) skipWhitespace();
      const isBackquoted = this.optional(Syntax.BacktickToken);
      const name = this.entityName();
      if (isBackquoted) this.expectedToken(Syntax.BacktickToken);
      if (isBracketed) {
        skipWhitespace();
        if (this.optionalToken(Syntax.EqualsToken)) parse.expression();
        this.expected(Syntax.CloseBracketToken);
      }
      return { name, isBracketed };
    }
    paramOrPropertyTag(start: number, tagName: qc.Identifier, target: PropertyLike, indent: number): DocParamTag | DocPropertyTag {
      let typeExpression = this.tryTypeExpression();
      let isNameFirst = !typeExpression;
      skipWhitespaceOrAsterisk();
      const { name, isBracketed } = this.bracketNameInPropertyAndParamTag();
      skipWhitespace();
      if (isNameFirst) typeExpression = this.tryTypeExpression();
      const n = target === PropertyLike.Property ? create.node(Syntax.DocPropertyTag, start) : create.node(Syntax.DocParamTag, start);
      const comment = this.tagComments(indent + scanner.getStartPos() - start);
      const nestedTypeLiteral = target !== PropertyLike.CallbackParam && this.nestedTypeLiteral(typeExpression, name, target, indent);
      if (nestedTypeLiteral) {
        typeExpression = nestedTypeLiteral;
        isNameFirst = true;
      }
      n.tagName = tagName;
      n.typeExpression = typeExpression;
      n.name = name;
      n.isNameFirst = isNameFirst;
      n.isBracketed = isBracketed;
      n.comment = comment;
      return finishNode(n);
    }
    nestedTypeLiteral(typeExpression: DocTypingExpression | undefined, name: qt.EntityName, target: PropertyLike, indent: number) {
      if (typeExpression && is.objectOrObjectArrayTypeReference(typeExpression.type)) {
        const n = create.node(Syntax.DocTypingExpression, scanner.getTokenPos());
        let child: DocPropertyLikeTag | DocTypeTag | false;
        let n2: DocTypingLiteral;
        const start = scanner.getStartPos();
        let children: DocPropertyLikeTag[] | undefined;
        while ((child = tryParse(() => this.childParamOrPropertyTag(target, indent, name)))) {
          if (child.kind === Syntax.DocParamTag || child.kind === Syntax.DocPropertyTag) children = append(children, child);
        }
        if (children) {
          n2 = create.node(Syntax.DocTypingLiteral, start);
          n2.docPropertyTags = children;
          if (typeExpression.type.kind === Syntax.ArrayTyping) n2.qf.is.arrayType = true;
          n.type = finishNode(n2);
          return finishNode(n);
        }
      }
      return;
    }
    returnTag(start: number, tagName: qc.Identifier): DocReturnTag {
      if (some(this.tags, isDocReturnTag)) parse.errorAt(tagName.pos, scanner.getTokenPos(), qd.msgs._0_tag_already_specified, tagName.escapedText);
      const n = create.node(Syntax.DocReturnTag, start);
      n.tagName = tagName;
      n.typeExpression = this.tryTypeExpression();
      return finishNode(n);
    }
    typeTag(start: number, tagName: qc.Identifier): DocTypeTag {
      if (some(this.tags, isDocTypeTag)) parse.errorAt(tagName.pos, scanner.getTokenPos(), qd.msgs._0_tag_already_specified, tagName.escapedText);
      const n = create.node(Syntax.DocTypeTag, start);
      n.tagName = tagName;
      n.typeExpression = this.typeExpression(true);
      return finishNode(n);
    }
    authorTag(start: number, tagName: qc.Identifier, indent: number): DocAuthorTag {
      const n = create.node(Syntax.DocAuthorTag, start);
      n.tagName = tagName;
      const authorInfoWithEmail = tryParse(() => this.tryAuthorNameAndEmail());
      if (!authorInfoWithEmail) return finishNode(n);
      n.comment = authorInfoWithEmail;
      if (lookAhead(() => next.tok() !== Syntax.NewLineTrivia)) {
        const comment = this.tagComments(indent);
        if (comment) n.comment += comment;
      }
      return finishNode(n);
    }
    tryAuthorNameAndEmail(): string | undefined {
      const comments: string[] = [];
      let seenLessThan = false;
      let seenGreaterThan = false;
      let token = scanner.getToken();
      loop: while (true) {
        switch (token) {
          case Syntax.Identifier:
          case Syntax.WhitespaceTrivia:
          case Syntax.DotToken:
          case Syntax.AtToken:
            comments.push(scanner.getTokenText());
            break;
          case Syntax.LessThanToken:
            if (seenLessThan || seenGreaterThan) return;
            seenLessThan = true;
            comments.push(scanner.getTokenText());
            break;
          case Syntax.GreaterThanToken:
            if (!seenLessThan || seenGreaterThan) return;
            seenGreaterThan = true;
            comments.push(scanner.getTokenText());
            scanner.setTextPos(scanner.getTokenPos() + 1);
            break loop;
          case Syntax.NewLineTrivia:
          case Syntax.EndOfFileToken:
            break loop;
        }
        token = next.tokDoc();
      }
      if (seenLessThan && seenGreaterThan) return comments.length === 0 ? undefined : comments.join('');
      return;
    }
    implementsTag(start: number, tagName: qc.Identifier): DocImplementsTag {
      const n = create.node(Syntax.DocImplementsTag, start);
      n.tagName = tagName;
      n.class = this.expressionWithTypeArgsForAugments();
      return finishNode(n);
    }
    augmentsTag(start: number, tagName: qc.Identifier): DocAugmentsTag {
      const n = create.node(Syntax.DocAugmentsTag, start);
      n.tagName = tagName;
      n.class = this.expressionWithTypeArgsForAugments();
      return finishNode(n);
    }
    expressionWithTypeArgsForAugments(): qt.ExpressionWithTypings & {
      expression: qc.Identifier | PropertyAccessEntityNameExpression;
    } {
      const usedBrace = parse.optional(Syntax.OpenBraceToken);
      const n = create.node(Syntax.ExpressionWithTypings) as qt.ExpressionWithTypings & {
        expression: qc.Identifier | PropertyAccessEntityNameExpression;
      };
      n.expression = this.propertyAccessEntityNameExpression();
      n.typeArgs = parse.typeArgs();
      const res = finishNode(n);
      if (usedBrace) parse.expected(Syntax.CloseBraceToken);
      return res;
    }
    propertyAccessEntityNameExpression() {
      let n: qc.Identifier | PropertyAccessEntityNameExpression = this.identifierName();
      while (parse.optional(Syntax.DotToken)) {
        const n2: PropertyAccessEntityNameExpression = create.node(Syntax.PropertyAccessExpression, n.pos) as PropertyAccessEntityNameExpression;
        n2.expression = n;
        n2.name = this.identifierName();
        n = finishNode(n2);
      }
      return n;
    }
    simpleTag(start: number, kind: Syntax, tagName: qc.Identifier): DocTag {
      const tag = create.node(kind, start);
      tag.tagName = tagName;
      return finishNode(tag);
    }
    thisTag(start: number, tagName: qc.Identifier): DocThisTag {
      const tag = create.node(Syntax.DocThisTag, start);
      tag.tagName = tagName;
      tag.typeExpression = this.typeExpression(true);
      skipWhitespace();
      return finishNode(tag);
    }
    enumTag(start: number, tagName: qc.Identifier): DocEnumTag {
      const n = create.node(Syntax.DocEnumTag, start);
      n.tagName = tagName;
      n.typeExpression = this.typeExpression(true);
      skipWhitespace();
      return finishNode(n);
    }
    typedefTag(start: number, tagName: qc.Identifier, indent: number): DocTypedefTag {
      const typeExpression = this.tryTypeExpression();
      skipWhitespaceOrAsterisk();
      const n = create.node(Syntax.DocTypedefTag, start);
      n.tagName = tagName;
      n.fullName = this.typeNameWithNamespace();
      n.name = this.getDocTypeAliasName(n.fullName);
      skipWhitespace();
      n.comment = this.tagComments(indent);
      n.typeExpression = typeExpression;
      let end: number | undefined;
      if (!typeExpression || is.objectOrObjectArrayTypeReference(typeExpression.type)) {
        let child: DocTypeTag | DocPropertyTag | false;
        let n2: DocTypingLiteral | undefined;
        let childTypeTag: DocTypeTag | undefined;
        while ((child = tryParse(() => this.childPropertyTag(indent)))) {
          if (!n2) n2 = create.node(Syntax.DocTypingLiteral, start);
          if (child.kind === Syntax.DocTypeTag) {
            if (childTypeTag) {
              parse.errorAtToken(qd.msgs.A_Doc_typedef_comment_may_not_contain_multiple_type_tags);
              const e = lastOrUndefined(diags);
              if (e) addRelatedInfo(e, qf.create.diagnosticForNode(source, qd.msgs.The_tag_was_first_specified_here));
              break;
            } else childTypeTag = child;
          } else n2.docPropertyTags = append(n2.docPropertyTags as MutableNodes<DocPropertyTag>, child);
        }
        if (n2) {
          if (typeExpression && typeExpression.type.kind === Syntax.ArrayTyping) n2.qf.is.arrayType = true;
          n.typeExpression = childTypeTag && childTypeTag.typeExpression && !is.objectOrObjectArrayTypeReference(childTypeTag.typeExpression.type) ? childTypeTag.typeExpression : finishNode(n2);
          end = n.typeExpression.end;
        }
      }
      return finishNode(n, end || n.comment !== undefined ? scanner.getStartPos() : (n.fullName || n.typeExpression || n.tagName).end);
    }
    typeNameWithNamespace(nested?: boolean) {
      const p = scanner.getTokenPos();
      if (!qy.is.identifierOrKeyword(tok())) return;
      const r = this.identifierName();
      if (parse.optional(Syntax.DotToken)) {
        const n = create.node(Syntax.ModuleDeclaration, p);
        if (nested) n.flags |= NodeFlags.NestedNamespace;
        n.name = r;
        n.body = this.typeNameWithNamespace(true);
        return finishNode(n);
      }
      if (nested) r.isInDocNamespace = true;
      return r;
    }
    callbackTag(start: number, tagName: qc.Identifier, indent: number): DocCallbackTag {
      const n = create.node(Syntax.DocCallbackTag, start) as DocCallbackTag;
      n.tagName = tagName;
      n.fullName = this.typeNameWithNamespace();
      n.name = this.getDocTypeAliasName(n.fullName);
      skipWhitespace();
      n.comment = this.tagComments(indent);
      let child: DocParamTag | false;
      const n2 = create.node(Syntax.DocSignature, start) as DocSignature;
      n2.params = [];
      while ((child = tryParse(() => this.childParamOrPropertyTag(PropertyLike.CallbackParam, indent) as DocParamTag))) {
        n2.params = append(n2.params as MutableNodes<DocParamTag>, child);
      }
      const returnTag = tryParse(() => {
        if (this.optional(Syntax.AtToken)) {
          const tag = this.tag(indent);
          if (tag && tag.kind === Syntax.DocReturnTag) return tag as DocReturnTag;
        }
        return;
      });
      if (returnTag) n2.type = returnTag;
      n.typeExpression = finishNode(n2);
      return finishNode(n);
    }
    getDocTypeAliasName(fullName: DocNamespaceBody | undefined) {
      if (fullName) {
        let rightNode = fullName;
        while (true) {
          if (rightNode.kind === Syntax.Identifier || !rightNode.body) return rightNode.kind === Syntax.Identifier ? rightNode : rightNode.name;
          rightNode = rightNode.body;
        }
      }
      return;
    }
    childPropertyTag(indent: number) {
      return this.childParamOrPropertyTag(PropertyLike.Property, indent) as DocTypeTag | DocPropertyTag | false;
    }
    childParamOrPropertyTag(target: PropertyLike, indent: number, name?: qt.EntityName): DocTypeTag | DocPropertyTag | DocParamTag | false {
      let canParseTag = true;
      let seenAsterisk = false;
      while (true) {
        switch (next.tokDoc()) {
          case Syntax.AtToken:
            if (canParseTag) {
              const child = this.tryChildTag(target, indent);
              if (
                child &&
                (child.kind === Syntax.DocParamTag || child.kind === Syntax.DocPropertyTag) &&
                target !== PropertyLike.CallbackParam &&
                name &&
                (child.name.kind === Syntax.Identifier || !escapedTextsEqual(name, child.name.left))
              ) {
                return false;
              }
              return child;
            }
            seenAsterisk = false;
            break;
          case Syntax.NewLineTrivia:
            canParseTag = true;
            seenAsterisk = false;
            break;
          case Syntax.AsteriskToken:
            if (seenAsterisk) canParseTag = false;
            seenAsterisk = true;
            break;
          case Syntax.Identifier:
            canParseTag = false;
            break;
          case Syntax.EndOfFileToken:
            return false;
        }
      }
    }
    tryChildTag(target: PropertyLike, indent: number): DocTypeTag | DocPropertyTag | DocParamTag | false {
      qu.assert(tok() === Syntax.AtToken);
      const start = scanner.getStartPos();
      next.tokDoc();
      const tagName = this.identifierName();
      skipWhitespace();
      let t: PropertyLike;
      switch (tagName.escapedText) {
        case 'type':
          return target === PropertyLike.Property && this.typeTag(start, tagName);
        case 'prop':
        case 'property':
          t = PropertyLike.Property;
          break;
        case 'arg':
        case 'arg':
        case 'param':
          t = PropertyLike.Param | PropertyLike.CallbackParam;
          break;
        default:
          return false;
      }
      if (!(target & t)) return false;
      return this.paramOrPropertyTag(start, tagName, target, indent);
    }
    templateTag(start: number, tagName: qc.Identifier): DocTemplateTag {
      let constraint: DocTypingExpression | undefined;
      if (tok() === Syntax.OpenBraceToken) constraint = this.typeExpression();
      const typeParams = [];
      const typeParamsPos = getNodePos();
      do {
        skipWhitespace();
        const n = create.node(Syntax.TypeParam);
        n.name = this.identifierName(qd.msgs.Unexpected_token_A_type_param_name_was_expected_without_curly_braces);
        finishNode(n);
        skipWhitespaceOrAsterisk();
        typeParams.push(n);
      } while (this.optional(Syntax.CommaToken));
      const n = create.node(Syntax.DocTemplateTag, start);
      n.tagName = tagName;
      n.constraint = constraint;
      n.typeParams = create.nodes(typeParams, typeParamsPos);
      finishNode(n);
      return n;
    }
    entityName(): qt.EntityName {
      let entity: qt.EntityName = this.identifierName();
      if (parse.optional(Syntax.OpenBracketToken)) parse.expected(Syntax.CloseBracketToken);
      while (parse.optional(Syntax.DotToken)) {
        const name = this.identifierName();
        if (parse.optional(Syntax.OpenBracketToken)) parse.expected(Syntax.CloseBracketToken);
        entity = create.qualifiedName(entity, name);
      }
      return entity;
    }
    identifierName(m?: qd.Message): qc.Identifier {
      if (!qy.is.identifierOrKeyword(tok())) return create.missingNode<qc.Identifier>(Syntax.Identifier, !m, m || qd.msgs.Identifier_expected);
      create.identifierCount++;
      const pos = scanner.getTokenPos();
      const end = scanner.getTextPos();
      const n = create.node(Syntax.Identifier, pos);
      if (tok() !== Syntax.Identifier) n.originalKeywordKind = tok();
      n.escapedText = qy.get.escUnderscores(internIdentifier(scanner.getTokenValue()));
      finishNode(n, end);
      next.tokDoc();
      return n;
    }
  })();
  function getLanguage(k: ScriptKind) {
    return k === ScriptKind.TSX || k === ScriptKind.JSX || k === ScriptKind.JS || k === ScriptKind.JSON ? LanguageVariant.TX : LanguageVariant.TS;
  }
  function initializeState(_sourceText: string, languageVersion: qt.ScriptTarget, _syntaxCursor: IncrementalParser.SyntaxCursor | undefined, scriptKind: ScriptKind) {
    sourceText = _sourceText;
    syntaxCursor = _syntaxCursor;
    diags = [];
    ctx.init();
    identifiers = new qu.QMap<string>();
    privateIdentifiers = new qu.QMap<string>();
    create.identifierCount = 0;
    create.nodeCount = 0;
    switch (scriptKind) {
      case ScriptKind.JS:
      case ScriptKind.JSX:
        flags.value = NodeFlags.JavaScriptFile;
        break;
      case ScriptKind.JSON:
        flags.value = NodeFlags.JavaScriptFile | NodeFlags.JsonFile;
        break;
      default:
        flags.value = NodeFlags.None;
        break;
    }
    parseErrorBeforeNextFinishedNode = false;
    scanner.setText(sourceText);
    scanner.setOnError(scanError);
    //scanner.setScriptTarget(languageVersion);
    scanner.setLanguageVariant(getLanguage(scriptKind));
  }
  function clearState() {
    scanner.clearDirectives();
    scanner.setText('');
    scanner.setOnError(undefined);
    diags = undefined!;
    source = undefined!;
    identifiers = undefined!;
    syntaxCursor = undefined;
    sourceText = undefined!;
    notParenthesizedArrow = undefined!;
  }
  function skipWhitespace() {
    if (tok() === Syntax.WhitespaceTrivia || tok() === Syntax.NewLineTrivia) {
      if (lookAhead(next.isNonwhitespaceTokenEndOfFile)) return;
    }
    while (tok() === Syntax.WhitespaceTrivia || tok() === Syntax.NewLineTrivia) {
      next.tokDoc();
    }
  }
  function skipWhitespaceOrAsterisk(): string {
    if (tok() === Syntax.WhitespaceTrivia || tok() === Syntax.NewLineTrivia) {
      if (lookAhead(next.isNonwhitespaceTokenEndOfFile)) return '';
    }
    let precedingLineBreak = scanner.hasPrecedingLineBreak();
    let seenLineBreak = false;
    let indentText = '';
    while ((precedingLineBreak && tok() === Syntax.AsteriskToken) || tok() === Syntax.WhitespaceTrivia || tok() === Syntax.NewLineTrivia) {
      indentText += scanner.getTokenText();
      if (tok() === Syntax.NewLineTrivia) {
        precedingLineBreak = true;
        seenLineBreak = true;
        indentText = '';
      } else if (tok() === Syntax.AsteriskToken) precedingLineBreak = false;
      next.tokDoc();
    }
    return seenLineBreak ? indentText : '';
  }
  function internIdentifier(s: string): string {
    let i = identifiers.get(s);
    if (i === undefined) identifiers.set(s, (i = s));
    return i;
  }
  function fillSignature(t: Syntax.ColonToken | Syntax.EqualsGreaterThanToken, f: SignatureFlags, s: qc.SignatureDeclaration): boolean {
    if (!(f & SignatureFlags.Doc)) s.typeParams = parse.typeParams();
    const r = parse.paramList(s, f);
    const shouldParseReturnType = (isType: boolean) => {
      if (t === Syntax.EqualsGreaterThanToken) {
        parse.expected(t);
        return true;
      } else if (parse.optional(Syntax.ColonToken)) return true;
      else if (isType && tok() === Syntax.EqualsGreaterThanToken) {
        parse.errorAtToken(qd.msgs._0_expected, qy.toString(Syntax.ColonToken));
        next.tok();
        return true;
      }
      return false;
    };
    if (shouldParseReturnType(!!(f & SignatureFlags.Type))) {
      s.type = parse.typeOrTypePredicate();
      const hasArrowFunctionBlockingError = (n: qt.Typing): boolean => {
        switch (n.kind) {
          case Syntax.TypingReference:
            return qf.is.missing((n as qt.TypingReference).typeName);
          case Syntax.FunctionTyping:
          case Syntax.ConstructorTyping: {
            const { params, type } = n as FunctionOrConstructorTyping;
            const isMissingList = (ns: Nodes<Node>) => !!(ns as MissingList<Node>).isMissingList;
            return isMissingList(params) || hasArrowFunctionBlockingError(type);
          }
          case Syntax.ParenthesizedTyping:
            return hasArrowFunctionBlockingError((n as ParenthesizedTyping).type);
          default:
            return false;
        }
      };
      if (hasArrowFunctionBlockingError(s.type)) return false;
    }
    return r;
  }
  function finishNode<T extends Node>(n: T, end?: number): T {
    n.end = end === undefined ? scanner.getStartPos() : end;
    if (flags.value) n.flags |= flags.value;
    if (parseErrorBeforeNextFinishedNode) {
      parseErrorBeforeNextFinishedNode = false;
      n.flags |= NodeFlags.ThisNodeHasError;
    }
    return n;
  }
  function speculate<T>(cb: () => T, isLookAhead: boolean): T {
    const saveToken = currentToken;
    const saveParseDiagnosticsLength = diags.length;
    const saveParseErrorBeforeNextFinishedNode = parseErrorBeforeNextFinishedNode;
    const saveContextFlags = flags.value;
    const r = isLookAhead ? scanner.lookAhead(cb) : scanner.tryScan(cb);
    qu.assert(saveContextFlags === flags.value);
    if (!r || isLookAhead) {
      currentToken = saveToken;
      diags.length = saveParseDiagnosticsLength;
      parseErrorBeforeNextFinishedNode = saveParseErrorBeforeNextFinishedNode;
    }
    return r;
  }
  function lookAhead<T>(cb: () => T): T {
    return speculate(cb, true);
  }
  function tryParse<T>(cb: () => T): T {
    return speculate(cb, false);
  }
  function reScanGreaterToken(): Syntax {
    return (currentToken = scanner.reScanGreaterToken());
  }
  function reScanLessToken(): Syntax {
    return (currentToken = scanner.reScanLessToken());
  }
  function reScanSlashToken(): Syntax {
    return (currentToken = scanner.reScanSlashToken());
  }
  function reScanTemplateToken(tagged: boolean): Syntax {
    return (currentToken = scanner.reScanTemplateToken(tagged));
  }
  function reScanHeadOrNoSubstTemplate(): Syntax {
    return (currentToken = scanner.reScanHeadOrNoSubstTemplate());
  }
  function addDocComment<T extends HasDoc>(n: T): T {
    qu.assert(!n.doc);
    const doc = mapDefined(qc.getDoc.commentRanges(n, source.text), (comment) => parseDoc.comment(n, comment.pos, comment.end - comment.pos));
    if (doc.length) n.doc = doc;
    return n;
  }
  function fixupParentReferences(root: Node) {
    const bindParentToChild = (c: Node, parent: Node) => {
      c.parent = parent;
      if (qf.is.withDocNodes(c)) {
        for (const d of c.doc!) {
          bindParentToChild(d, c);
          qf.each.childRecursively(d, bindParentToChild);
        }
      }
    };
    qf.each.childRecursively(root, bindParentToChild);
  }
  function comment(parent: HasDoc, start: number, length: number): Doc | undefined {
    const saveToken = currentToken;
    const saveParseDiagnosticsLength = diags.length;
    const saveParseErrorBeforeNextFinishedNode = parseErrorBeforeNextFinishedNode;
    const comment = flags.withContext(NodeFlags.Doc, () => parseDoc.comment(start, length));
    if (comment) comment.parent = parent;
    if (flags.value & NodeFlags.JavaScriptFile) {
      if (!source.docDiagnostics) source.docDiagnostics = [];
      source.docqd.msgs.push(...diags);
    }
    currentToken = saveToken;
    diags.length = saveParseDiagnosticsLength;
    parseErrorBeforeNextFinishedNode = saveParseErrorBeforeNextFinishedNode;
    return comment;
  }
  function parseDocIsolatedComment(t: string, start?: number, length?: number): { doc: Doc; diagnostics: Diagnostic[] } | undefined {
    initializeState(t, qt.ScriptTarget.ESNext, undefined, ScriptKind.JS);
    source = { languageVariant: LanguageVariant.TS, text: t } as SourceFile;
    const doc = flags.withContext(NodeFlags.Doc, () => parseDoc.comment(start, length));
    const diagnostics = diags;
    clearState();
    const r = doc ? { doc, diagnostics } : undefined;
    if (r && r.doc) fixupParentReferences(r.doc);
    return r;
  }
  function escapedTextsEqual(a: qt.EntityName, b: qt.EntityName): boolean {
    while (a.kind !== Syntax.Identifier || b.kind !== Syntax.Identifier) {
      if (a.kind !== Syntax.Identifier && b.kind !== Syntax.Identifier && a.right.escapedText === b.right.escapedText) {
        a = a.left;
        b = b.left;
      } else return false;
    }
    return a.escapedText === b.escapedText;
  }
  function hasModifierOfKind(n: Node, k: Syntax) {
    return some(n.modifiers, (m) => m.kind === k);
  }
  return {
    parseSource: parse.source.bind(parse),
    parseJsonText: parse.jsonText.bind(parse),
    parseIsolatedEntityName: parse.isolatedEntityName.bind(parse),
    parseDocIsolatedComment,
    parseDocTypingExpressionForTests: parseDoc.typeExpressionForTests.bind(parseDoc),
  } as Parser;
}
let parser: Parser;
function getParser() {
  return parser || (parser = create());
}
export function qp_createSource(fileName: string, t: string, lang: qt.ScriptTarget, parents = false, script?: ScriptKind): SourceFile {
  performance.mark('beforeParse');
  let r: SourceFile;
  perfLogger.logStartParseSourceFile(fileName);
  if (lang === qt.ScriptTarget.JSON) r = getParser().parseSource(fileName, t, lang, undefined, parents, ScriptKind.JSON);
  else r = getParser().parseSource(fileName, t, lang, undefined, parents, script);
  perfLogger.logStopParseSourceFile();
  performance.mark('afterParse');
  performance.measure('Parse', 'beforeParse', 'afterParse');
  return r;
}
export function qp_updateSource(s: SourceFile, newText: string, r: qu.TextChange, aggressive = false): SourceFile {
  const s2 = IncrementalParser.updateSource(s, newText, r, aggressive);
  s2.flags |= s.flags & NodeFlags.PermanentlySetIncrementalFlags;
  return s2;
}
export function qp_parseIsolatedEntityName(text: string, lang: qt.ScriptTarget): qt.EntityName | undefined {
  return getParser().parseIsolatedEntityName(text, lang);
}
export function qp_parseJsonText(fileName: string, t: string): JsonSourceFile {
  return getParser().parseJsonText(fileName, t);
}
namespace IncrementalParser {
  export function updateSource(source: SourceFile, newText: string, textChangeRange: qu.TextChange, aggressiveChecks: boolean): SourceFile {
    aggressiveChecks = aggressiveChecks || Debug.shouldAssert(AssertionLevel.Aggressive);
    checkChangeRange(source, newText, textChangeRange, aggressiveChecks);
    if (textChangeRangeIsUnchanged(textChangeRange)) return source;
    if (source.statements.length === 0) return Parser.parseSourceFile(source.fileName, newText, source.languageVersion, undefined, true, source.scriptKind);
    const incrementalSourceFile = <IncrementalNode>(<Node>source);
    qu.assert(!incrementalSourceFile.hasBeenIncrementallyParsed);
    incrementalSourceFile.hasBeenIncrementallyParsed = true;
    const oldText = source.text;
    const syntaxCursor = createSyntaxCursor(source);
    const changeRange = extendToAffectedRange(source, textChangeRange);
    checkChangeRange(source, newText, changeRange, aggressiveChecks);
    qu.assert(changeRange.span.start <= textChangeRange.span.start);
    qu.assert(textSpanEnd(changeRange.span) === textSpanEnd(textChangeRange.span));
    qu.assert(textSpanEnd(textChangeRangeNewSpan(changeRange)) === textSpanEnd(textChangeRangeNewSpan(textChangeRange)));
    const delta = textChangeRangeNewSpan(changeRange).length - changeRange.span.length;
    updateTokenPositionsAndMarkElems(
      incrementalSourceFile,
      changeRange.span.start,
      textSpanEnd(changeRange.span),
      textSpanEnd(textChangeRangeNewSpan(changeRange)),
      delta,
      oldText,
      newText,
      aggressiveChecks
    );
    const r = Parser.parseSourceFile(source.fileName, newText, source.languageVersion, syntaxCursor, true, source.scriptKind);
    r.commentDirectives = getNewCommentDirectives(source.commentDirectives, r.commentDirectives, changeRange.span.start, textSpanEnd(changeRange.span), delta, oldText, newText, aggressiveChecks);
    return r;
  }
  function getNewCommentDirectives(
    oldDirectives: CommentDirective[] | undefined,
    newDirectives: CommentDirective[] | undefined,
    changeStart: number,
    changeRangeOldEnd: number,
    delta: number,
    oldText: string,
    newText: string,
    aggressiveChecks: boolean
  ): CommentDirective[] | undefined {
    if (!oldDirectives) return newDirectives;
    let commentDirectives: CommentDirective[] | undefined;
    let addedNewlyScannedDirectives = false;
    for (const directive of oldDirectives) {
      const { range, type } = directive;
      if (range.end < changeStart) {
        commentDirectives = append(commentDirectives, directive);
      } else if (range.pos > changeRangeOldEnd) {
        addNewlyScannedDirectives();
        const updatedDirective: CommentDirective = {
          range: { pos: range.pos + delta, end: range.end + delta },
          type,
        };
        commentDirectives = append(commentDirectives, updatedDirective);
        if (aggressiveChecks) {
          qu.assert(oldText.substring(range.pos, range.end) === newText.substring(updatedDirective.range.pos, updatedDirective.range.end));
        }
      }
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
  function moveElemEntirelyPastChangeRange(elem: IncrementalElem, isArray: boolean, delta: number, oldText: string, newText: string, aggressiveChecks: boolean) {
    const visitArray = (ns: IncrementalNodes) => {
      ns._children = undefined;
      ns.pos += delta;
      ns.end += delta;
      for (const n of ns) {
        visitNode(n);
      }
    };
    const visitNode = (n: IncrementalNode) => {
      let text = '';
      const shouldCheck = (n: Node) => {
        switch (n.kind) {
          case Syntax.StringLiteral:
          case Syntax.NumericLiteral:
          case Syntax.Identifier:
            return true;
        }
        return false;
      };
      if (aggressiveChecks && shouldCheck(n)) text = oldText.substring(n.pos, n.end);
      if (n._children) n._children = undefined;
      n.pos += delta;
      n.end += delta;
      if (aggressiveChecks && shouldCheck(n)) qu.assert(text === newText.substring(n.pos, n.end));
      qf.each.child(n, visitNode, visitArray);
      if (qf.is.withDocNodes(n)) {
        for (const d of n.doc!) {
          visitNode(d);
        }
      }
      checkNodePositions(n, aggressiveChecks);
    };
    if (isArray) visitArray(<IncrementalNodes>elem);
    else visitNode(<IncrementalNode>elem);
    return;
  }
  function adjustIntersectingElem(elem: IncrementalElem, changeStart: number, changeRangeOldEnd: number, changeRangeNewEnd: number, delta: number) {
    qu.assert(elem.end >= changeStart, 'Adjusting an elem that was entirely before the change range');
    qu.assert(elem.pos <= changeRangeOldEnd, 'Adjusting an elem that was entirely after the change range');
    qu.assert(elem.pos <= elem.end);
    elem.pos = Math.min(elem.pos, changeRangeNewEnd);
    if (elem.end >= changeRangeOldEnd) {
      elem.end += delta;
    } else elem.end = Math.min(elem.end, changeRangeNewEnd);
    qu.assert(elem.pos <= elem.end);
    if (elem.parent) {
      qu.assert(elem.pos >= elem.parent.pos);
      qu.assert(elem.end <= elem.parent.end);
    }
  }
  function updateTokenPositionsAndMarkElems(
    source: IncrementalNode,
    changeStart: number,
    changeRangeOldEnd: number,
    changeRangeNewEnd: number,
    delta: number,
    oldText: string,
    newText: string,
    aggressiveChecks: boolean
  ): void {
    const visitArray = (ns: IncrementalNodes) => {
      qu.assert(ns.pos <= ns.end);
      if (ns.pos > changeRangeOldEnd) {
        moveElemEntirelyPastChangeRange(ns, true, delta, oldText, newText, aggressiveChecks);
        return;
      }
      const fullEnd = ns.end;
      if (fullEnd >= changeStart) {
        ns.intersectsChange = true;
        ns._children = undefined;
        adjustIntersectingElem(ns, changeStart, changeRangeOldEnd, changeRangeNewEnd, delta);
        for (const node of ns) {
          visitNode(node);
        }
        return;
      }
      qu.assert(fullEnd < changeStart);
    };

    visitNode(source);
    return;
    function visitNode(child: IncrementalNode) {
      qu.assert(child.pos <= child.end);
      if (child.pos > changeRangeOldEnd) {
        moveElemEntirelyPastChangeRange(child, false, delta, oldText, newText, aggressiveChecks);
        return;
      }
      const fullEnd = child.end;
      if (fullEnd >= changeStart) {
        child.intersectsChange = true;
        child._children = undefined;
        adjustIntersectingElem(child, changeStart, changeRangeOldEnd, changeRangeNewEnd, delta);
        qf.each.child(child, visitNode, visitArray);
        if (qf.is.withDocNodes(child)) {
          for (const d of child.doc!) {
            visitNode(d);
          }
        }
        checkNodePositions(child, aggressiveChecks);
        return;
      }
      qu.assert(fullEnd < changeStart);
    }
  }
  function checkNodePositions(n: Node, aggressive: boolean) {
    if (aggressive) {
      let pos = n.pos;
      const visitNode = (c: Node) => {
        qu.assert(c.pos >= pos);
        pos = c.end;
      };
      if (qf.is.withDocNodes(n)) {
        for (const d of n.doc!) {
          visitNode(d);
        }
      }
      qf.each.child(n, visitNode);
      qu.assert(pos <= n.end);
    }
  }
  function extendToAffectedRange(source: SourceFile, changeRange: qu.TextChange): qu.TextChange {
    const maxLookahead = 1;
    let start = changeRange.span.start;
    for (let i = 0; start > 0 && i <= maxLookahead; i++) {
      const nearestNode = findNearestNodeStartingBeforeOrAtPosition(source, start);
      qu.assert(nearestNode.pos <= start);
      const position = nearestNode.pos;
      start = Math.max(0, position - 1);
    }
    const finalSpan = TextSpan.from(start, textSpanEnd(changeRange.span));
    const finalLength = changeRange.newLength + (changeRange.span.start - start);
    return createqu.TextChange(finalSpan, finalLength);
  }
  function findNearestNodeStartingBeforeOrAtPosition(source: SourceFile, position: number): Node {
    let bestResult: Node = source;
    let lastNodeEntirelyBeforePosition: Node | undefined;
    qf.each.child(source, visit);
    if (lastNodeEntirelyBeforePosition) {
      const lastChildOfLastEntireNodeBeforePosition = getLastDescendant(lastNodeEntirelyBeforePosition);
      if (lastChildOfLastEntireNodeBeforePosition.pos > bestResult.pos) {
        bestResult = lastChildOfLastEntireNodeBeforePosition;
      }
    }
    return bestResult;
    function getLastDescendant(node: Node): Node {
      while (true) {
        const lastChild = getLastChild(node);
        if (lastChild) node = lastChild;
        else return node;
      }
    }
    function visit(child: Node) {
      if (qf.is.missing(child)) return;
      if (child.pos <= position) {
        if (child.pos >= bestResult.pos) bestResult = child;
        if (position < child.end) {
          qf.each.child(child, visit);
          return true;
        } else {
          qu.assert(child.end <= position);
          lastNodeEntirelyBeforePosition = child;
        }
      } else {
        qu.assert(child.pos > position);
        return true;
      }
      return;
    }
  }
  function checkChangeRange(source: SourceFile, newText: string, textChangeRange: qu.TextChange, aggressiveChecks: boolean) {
    const oldText = source.text;
    if (textChangeRange) {
      qu.assert(oldText.length - textChangeRange.span.length + textChangeRange.newLength === newText.length);
      if (aggressiveChecks || Debug.shouldAssert(AssertionLevel.VeryAggressive)) {
        const oldTextPrefix = oldText.substr(0, textChangeRange.span.start);
        const newTextPrefix = newText.substr(0, textChangeRange.span.start);
        qu.assert(oldTextPrefix === newTextPrefix);
        const oldTextSuffix = oldText.substring(textSpanEnd(textChangeRange.span), oldText.length);
        const newTextSuffix = newText.substring(textSpanEnd(textChangeRangeNewSpan(textChangeRange)), newText.length);
        qu.assert(oldTextSuffix === newTextSuffix);
      }
    }
  }
  interface IncrementalElem extends qu.TextRange {
    parent: Node;
    intersectsChange: boolean;
    length?: number;
    _children: Node[] | undefined;
  }
  export interface IncrementalNode extends Node, IncrementalElem {
    hasBeenIncrementallyParsed: boolean;
  }
  interface IncrementalNodes extends Nodes<IncrementalNode>, IncrementalElem {
    length: number;
  }
  export interface SyntaxCursor {
    currentNode(position: number): IncrementalNode;
  }
  function createSyntaxCursor(source: SourceFile): SyntaxCursor {
    let currentArray: Nodes<Node> = source.statements;
    let currentArrayIndex = 0;
    qu.assert(currentArrayIndex < currentArray.length);
    let current = currentArray[currentArrayIndex];
    let lastQueriedPosition = InvalidPosition.Value;
    return {
      currentNode(position: number) {
        if (position !== lastQueriedPosition) {
          if (current && current.end === position && currentArrayIndex < currentArray.length - 1) {
            currentArrayIndex++;
            current = currentArray[currentArrayIndex];
          }
          if (!current || current.pos !== position) findHighestListElemThatStartsAtPosition(position);
        }
        lastQueriedPosition = position;
        qu.assert(!current || current.pos === position);
        return <IncrementalNode>current;
      },
    };
    function findHighestListElemThatStartsAtPosition(position: number) {
      currentArray = undefined!;
      currentArrayIndex = InvalidPosition.Value;
      current = undefined!;
      qf.each.child(source, visitNode, visitArray);
      return;
      function visitNode(n: Node) {
        if (position >= n.pos && position < n.end) {
          qf.each.child(n, visitNode, visitArray);
          return true;
        }
        return false;
      }
      function visitArray(ns: Nodes<Node>) {
        if (position >= ns.pos && position < ns.end) {
          for (let i = 0; i < ns.length; i++) {
            const child = ns[i];
            if (child) {
              if (child.pos === position) {
                currentArray = ns;
                currentArrayIndex = i;
                current = child;
                return true;
              } else {
                if (child.pos < position && position < child.end) {
                  qf.each.child(child, visitNode, visitArray);
                  return true;
                }
              }
            }
          }
        }
        return false;
      }
    }
  }
  const enum InvalidPosition {
    Value = -1,
  }
}
interface PragmaContext {
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
export function processCommentPragmas(ctx: PragmaContext, sourceText: string): void {
  const ps: PragmaPseudoMapEntry[] = [];
  for (const r of qy.get.leadingCommentRanges(sourceText, 0) || emptyArray) {
    const comment = sourceText.substring(r.pos, r.end);
    extractPragmas(ps, r, comment);
  }
  ctx.pragmas = new qu.QMap() as PragmaMap;
  for (const p of ps) {
    if (ctx.pragmas.has(p.name)) {
      const v = ctx.pragmas.get(p.name);
      if (v instanceof Array) v.push(p.args);
      else ctx.pragmas.set(p.name, [v, p.args]);
      continue;
    }
    ctx.pragmas.set(p.name, p.args);
  }
}
type PragmaDiagnosticReporter = (pos: number, length: number, m: qd.Message) => void;
export function processPragmasIntoFields(c: PragmaContext, reporter: PragmaDiagnosticReporter): void {
  c.checkJsDirective = undefined;
  c.referencedFiles = [];
  c.typeReferenceDirectives = [];
  c.libReferenceDirectives = [];
  c.amdDependencies = [];
  c.hasNoDefaultLib = false;
  c.pragmas!.forEach((entryOrList, k) => {
    switch (k) {
      case 'reference': {
        const referencedFiles = c.referencedFiles;
        const typeReferenceDirectives = c.typeReferenceDirectives;
        const libReferenceDirectives = c.libReferenceDirectives;
        forEach(toArray(entryOrList) as PragmaPseudoMap['reference'][], (arg) => {
          const { types, lib, path } = arg.args;
          if (arg.args['no-default-lib']) {
            c.hasNoDefaultLib = true;
          } else if (types) typeReferenceDirectives.push({ pos: types.pos, end: types.end, fileName: types.value });
          else if (lib) libReferenceDirectives.push({ pos: lib.pos, end: lib.end, fileName: lib.value });
          else if (path) referencedFiles.push({ pos: path.pos, end: path.end, fileName: path.value });
          else reporter(arg.range.pos, arg.range.end - arg.range.pos, qd.msgs.Invalid_reference_directive_syntax);
        });
        break;
      }
      case 'amd-dependency': {
        c.amdDependencies = map(toArray(entryOrList) as PragmaPseudoMap['amd-dependency'][], (x) => ({
          name: x.args.name,
          path: x.args.path,
        }));
        break;
      }
      case 'amd-module': {
        if (entryOrList instanceof Array) {
          for (const entry of entryOrList) {
            if (c.moduleName) reporter(entry.range.pos, entry.range.end - entry.range.pos, qd.msgs.An_AMD_module_cannot_have_multiple_name_assignments);
            c.moduleName = (entry as PragmaPseudoMap['amd-module']).args.name;
          }
        } else c.moduleName = (entryOrList as PragmaPseudoMap['amd-module']).args.name;
        break;
      }
      case 'ts-nocheck':
      case 'ts-check': {
        forEach(toArray(entryOrList), (entry) => {
          if (!c.checkJsDirective || entry.range.pos > c.checkJsDirective.pos) {
            c.checkJsDirective = {
              enabled: k === 'ts-check',
              end: entry.range.end,
              pos: entry.range.pos,
            };
          }
        });
        break;
      }
      case 'jsx':
        return;
      default:
        qu.fail('Unhandled pragma kind');
    }
  });
}
const namedArgRegExCache = new qu.QMap<RegExp>();
const tripleSlashXMLCommentStartRegEx = /^\/\/\/\s*<(\S+)\s.*?\/>/im;
const singleLinePragmaRegEx = /^\/\/\/?\s*@(\S+)\s*(.*)\s*$/im;
const multiLinePragmaRegEx = /\s*@(\S+)\s*(.*)\s*$/gim;
function extractPragmas(pragmas: PragmaPseudoMapEntry[], range: CommentRange, text: string) {
  const tripleSlash = range.kind === Syntax.SingleLineCommentTrivia && tripleSlashXMLCommentStartRegEx.exec(text);
  if (tripleSlash) {
    const name = tripleSlash[1].toLowerCase() as keyof PragmaPseudoMap;
    const pragma = commentPragmas[name] as PragmaDefinition;
    if (!pragma || !(pragma.kind! & PragmaKindFlags.TripleSlashXML)) return;
    if (pragma.args) {
      const arg: { [index: string]: string | { value: string; pos: number; end: number } } = {};
      for (const arg of pragma.args) {
        const getNamedArgRegEx = (name: string): RegExp => {
          if (namedArgRegExCache.has(name)) return namedArgRegExCache.get(name)!;
          const r = new RegExp(`(\\s${name}\\s*=\\s*)('|")(.+?)\\2`, 'im');
          namedArgRegExCache.set(name, r);
          return r;
        };
        const matcher = getNamedArgRegEx(arg.name);
        const matchResult = matcher.exec(text);
        if (!matchResult && !arg.optional) return;
        else if (matchResult) {
          if (arg.captureSpan) {
            const startPos = range.pos + matchResult.index + matchResult[1].length + matchResult[2].length;
            arg[arg.name] = {
              value: matchResult[3],
              pos: startPos,
              end: startPos + matchResult[3].length,
            };
          } else arg[arg.name] = matchResult[3];
        }
      }
      pragmas.push({ name, args: { args: arg, range } } as PragmaPseudoMapEntry);
    } else pragmas.push({ name, args: { args: {}, range } } as PragmaPseudoMapEntry);
    return;
  }
  const singleLine = range.kind === Syntax.SingleLineCommentTrivia && singleLinePragmaRegEx.exec(text);
  const addPragmaForMatch = (ps: PragmaPseudoMapEntry[], range: CommentRange, k: PragmaKindFlags, match: RegExpExecArray) => {
    if (!match) return;
    const name = match[1].toLowerCase() as keyof PragmaPseudoMap;
    const p = commentPragmas[name] as PragmaDefinition;
    if (!p || !(p.kind! & k)) return;
    const getNamedPragmaArgs = (text?: string): { [i: string]: string } | 'fail' => {
      if (!text) return {};
      if (!p.args) return {};
      const args = text.split(/\s+/);
      const m: { [i: string]: string } = {};
      for (let i = 0; i < p.args.length; i++) {
        const a = p.args[i];
        if (!args[i] && !a.optional) return 'fail';
        if (a.captureSpan) return qu.fail('Capture spans not yet implemented for non-xml pragmas');
        m[a.name] = args[i];
      }
      return m;
    };
    const args = match[2];
    const a = getNamedPragmaArgs(args);
    if (a === 'fail') return;
    ps.push({ name, args: { args: a, range } } as PragmaPseudoMapEntry);
    return;
  };
  if (singleLine) return addPragmaForMatch(pragmas, range, PragmaKindFlags.SingleLine, singleLine);
  if (range.kind === Syntax.MultiLineCommentTrivia) {
    let m: RegExpExecArray | null;
    while ((m = multiLinePragmaRegEx.exec(text))) {
      addPragmaForMatch(pragmas, range, PragmaKindFlags.MultiLine, m);
    }
  }
}
