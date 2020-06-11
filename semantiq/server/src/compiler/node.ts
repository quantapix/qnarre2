namespace qnr {
  export function asName<T extends Identifier | BindingName | PropertyName | EntityName | ThisTypeNode | undefined>(n: string | T): T | Identifier {
    return isString(n) ? createIdentifier(n) : n;
  }

  export function asExpression<T extends Expression | undefined>(e: string | number | boolean | T): T | StringLiteral | NumericLiteral | BooleanLiteral {
    return typeof e === 'string' ? StringLiteral.create(e) : typeof e === 'number' ? NumericLiteral.create('' + e) : typeof e === 'boolean' ? (e ? createTrue() : createFalse()) : e;
  }

  export function asNodeArray<T extends Node>(a: readonly T[]): NodeArray<T>;
  export function asNodeArray<T extends Node>(a: readonly T[] | undefined): NodeArray<T> | undefined;
  export function asNodeArray<T extends Node>(a: readonly T[] | undefined): NodeArray<T> | undefined {
    return a ? createNodeArray(a) : undefined;
  }

  export function asToken<TKind extends Syntax>(t: TKind | Token<TKind>): Token<TKind> {
    return typeof t === 'number' ? createToken(t) : t;
  }

  export function asEmbeddedStatement<T extends Node>(statement: T): T | EmptyStatement;
  export function asEmbeddedStatement<T extends Node>(statement: T | undefined): T | EmptyStatement | undefined;
  export function asEmbeddedStatement<T extends Node>(statement: T | undefined): T | EmptyStatement | undefined {
    return statement && isNotEmittedStatement(statement) ? setTextRange(setOriginalNode(createEmptyStatement(), statement), statement) : statement;
  }

  let r = [...Array(5).keys()];
  const enum SymKey {
    AAA,
    BBB,
    CCC,
    End
  }
  r = [...Array(SymKey.End).keys()];
  console.log(r);
  
  type KS = keyof typeof SymKey;
  
  const INTERVALS = ['total', 'weekly', 'biweekly', 'monthly', 'annually'] as const;
  type Interval = typeof INTERVALS[number];
  
  type KS2<T extends Record<string, KS>> = {
    -readonly [K in keyof T]: KS
  }
  let SymNames: { [P in keyof typeof SymKey]: { Name: P, Value: typeof SymKey[P] } } = {
    AAA: { Value: SymKey.AAA, Name: "AAA" },
    BBB: { Value: SymKey.BBB, Name: "BBB" },
    CCC: { Value: SymKey.CCC, Name: "CCC" },
    End: { Value: SymKey.End, Name: "End"}
  }
  
  
  interface QNode {
    kind: SymKey;
  }
  namespace QNode {
    export function create(kind: SymKey) {
      return { kind } as QNode;
    }
    export interface Aaa extends QNode {
      kind: SymKey.AAA;
      aa?: number;
    }
    export namespace Aaa {
      export const kind = SymKey.AAA;
    }
    export interface Bbb extends QNode {
      kind: SymKey.BBB;
      bb?: number;
    }
    export namespace Bbb {
      export const kind = SymKey.BBB;
    }
  }
  type NS<T> = T extends QNode ? T : never;
  const nodes = Object.keys(QNode).map(k => (QNode as any)[k]);
  console.log(nodes);
  /*
  function cNode<C extends SymKey>(cs: C, n: string): { [P in keyof C]: C[P] }[keyof C] {
      return  (cs as any)[n];
  }
  
  type SymType<K extends SymKey> = K extends keyof CMap ? CMap[K] : never;
  
  
  function cNode<C extends SymKey>(cs: C, n: string): { [P in keyof C]: C[P] }[keyof C] {
      return  (cs as any)[n];
  }
  const m = mapEnum(SymKey, "");
  
  type QRecord<C extends keyof typeof SymKey, N extends QNode> = {
    [P in C]: N;
  };
  type QI<T extends QRecord<string, keyof MapSchemaTypes>> = {
    -readonly [K in keyof T]: (typeof nodes)[T[K]]
  }
  */
  interface CMap {
    [SymKey.AAA]: QNode.Aaa;
    [SymKey.BBB]: QNode.Bbb;
  }
  type GN<C extends SymKey> = C extends keyof CMap ? CMap[C] : never;
  function create<C extends SymKey>(c: C): GN<C> {
    return QNode.create(c) as GN<C>;
  }
  function isKind<C extends SymKey, T extends { kind: C }>(n: GN<C>, t: T): n is GN<C> {
    return n.kind === t.kind;
  }
  
  const a = QNode.create(SymKey.AAA) as QNode.Aaa;
  const b = QNode.create(SymKey.BBB) as QNode.Bbb;
  
  const a2 = create(SymKey.AAA);
  const b2 = create(SymKey.BBB);
  
  console.log(isKind(a, QNode.Aaa), '*** true');
  console.log(isKind(a, QNode.Bbb), '*** false');
  console.log(isKind(b, QNode.Aaa), '*** false');
  console.log(isKind(b, QNode.Bbb), '*** true');
  
  interface typeMap {
    string: string;
    number: number;
    boolean: boolean;
  }
  
  type KeysOfUnion<T> = T extends any ? keyof T : never;
  
  type POC =
    | { new(...args: any[]): any }
    | keyof typeMap;
  
  type GuardedType<T extends POC> = T extends { new(...args: any[]): infer U; } ? U : T extends keyof typeMap ? typeMap[T] : never;
  
  function typeGuard<T extends POC>(o, className: T):
    o is GuardedType<T> {
    const poc: POC = className;
    if (typeof poc === 'string') {
      return typeof o === poc;
    }
    return o instanceof poc;
  }
  
  class A {
    a: string = 'a';
  }
  
  class B extends A {
    b: number = 5;
  }
  
  console.log(typeGuard(5, 'number'), 'true'); // typeGuard<"number">(o: any, className: "number"): o is number
  console.log(typeGuard(5, 'string'), 'false'); // typeGuard<"string">(o: any, className: "string"): o is string
  
  console.log(typeGuard(new A(), A), 'true'); // typeGuard<typeof A>(o: any, className: typeof A): o is A
  console.log(typeGuard(new B(), A), 'true');
  
  console.log(typeGuard(new A(), B), 'false'); // typeGuard<typeof B>(o: any, className: typeof B): o is B
  console.log(typeGuard(new B(), B), 'true');
  





  const enum Codes {
    AAA,
    BBB,
  }
  interface QNode {
    kind: Codes;
  }
  namespace QNode {
    export function create(kind: Codes) {
      return { kind } as QNode;
    }
  }
  interface Aaa extends QNode {
    kind: Codes.AAA;
    aa?: number;
  }
  namespace Aaa {
    export const kind = Codes.AAA;
  }
  interface Bbb extends QNode {
    kind: Codes.BBB;
    bb?: number;
  }
  namespace Bbb {
    export const kind = Codes.BBB;
  }
  interface CMap {
    [Codes.AAA]: Aaa;
    [Codes.BBB]: Bbb;
  }
  type GN<C extends Codes> = C extends keyof CMap ? CMap[C] : never;

  function isKind<C extends Codes, T extends { kind: C }>(t: T, n: GN<C>): n is GN<C> {
    return n.kind === t.kind;
  }

  const a = QNode.create(Codes.AAA);
  const b = QNode.create(Codes.BBB);

  console.log(isKind(Aaa, a), '*** true');
  console.log(isKind(Bbb, a), '*** false');
  console.log(isKind(Aaa, b), '*** false');
  console.log(isKind(Bbb, b), '*** true');


  interface Interfaces {
    Syntax.Unknown,
    Syntax.EndOfFileToken,
    Syntax.SingleLineCommentTrivia,
    Syntax.MultiLineCommentTrivia,
    Syntax.NewLineTrivia,
    Syntax.WhitespaceTrivia,

    Syntax.ShebangTrivia,
    Syntax.ConflictMarkerTrivia,
    Syntax.NumericLiteral,
    Syntax.BigIntLiteral,
    Syntax.StringLiteral,
    Syntax.JsxText,
    Syntax.JsxTextAllWhiteSpaces,
    Syntax.RegexLiteral,
    Syntax.NoSubstitutionLiteral,

    Syntax.TemplateHead,
    Syntax.TemplateMiddle,
    Syntax.TemplateTail,

    Syntax.OpenBraceToken,
    Syntax.CloseBraceToken,
    Syntax.OpenParenToken,
    Syntax.CloseParenToken,
    Syntax.OpenBracketToken,
    Syntax.CloseBracketToken,
    Syntax.DotToken,
    Syntax.Dot3Token,
    Syntax.SemicolonToken,
    Syntax.CommaToken,
    Syntax.QuestionDotToken,
    Syntax.LessThanToken,
    Syntax.LessThanSlashToken,
    Syntax.GreaterThanToken,
    Syntax.LessThanEqualsToken,
    Syntax.GreaterThanEqualsToken,
    Syntax.Equals2Token,
    Syntax.ExclamationEqualsToken,
    Syntax.Equals3Token,
    Syntax.ExclamationEquals2Token,
    Syntax.EqualsGreaterThanToken,
    Syntax.PlusToken,
    Syntax.MinusToken,
    Syntax.AsteriskToken,
    Syntax.Asterisk2Token,
    Syntax.SlashToken,
    Syntax.PercentToken,
    Syntax.Plus2Token,
    Syntax.Minus2Token,
    Syntax.LessThan2Token,
    Syntax.GreaterThan2Token,
    Syntax.GreaterThan3Token,
    Syntax.AmpersandToken,
    Syntax.BarToken,
    Syntax.CaretToken,
    Syntax.ExclamationToken,
    Syntax.TildeToken,
    Syntax.Ampersand2Token,
    Syntax.Bar2Token,
    Syntax.QuestionToken,
    Syntax.ColonToken,
    Syntax.AtToken,
    Syntax.Question2Token,
    Syntax.BacktickToken,

    Syntax.EqualsToken,
    Syntax.PlusEqualsToken,
    Syntax.MinusEqualsToken,
    Syntax.AsteriskEqualsToken,
    Syntax.Asterisk2EqualsToken,
    Syntax.SlashEqualsToken,
    Syntax.PercentEqualsToken,
    Syntax.LessThan2EqualsToken,
    Syntax.GreaterThan2EqualsToken,
    Syntax.GreaterThan3EqualsToken,
    Syntax.AmpersandEqualsToken,
    Syntax.BarEqualsToken,
    Syntax.CaretEqualsToken,

    Syntax.Identifier,
    Syntax.PrivateIdentifier,

    Syntax.BreakKeyword,
    Syntax.CaseKeyword,
    Syntax.CatchKeyword,
    Syntax.ClassKeyword,
    Syntax.ConstKeyword,
    Syntax.ContinueKeyword,
    Syntax.DebuggerKeyword,
    Syntax.DefaultKeyword,
    Syntax.DeleteKeyword,
    Syntax.DoKeyword,
    Syntax.ElseKeyword,
    Syntax.EnumKeyword,
    Syntax.ExportKeyword,
    Syntax.ExtendsKeyword,
    Syntax.FalseKeyword,
    Syntax.FinallyKeyword,
    Syntax.ForKeyword,
    Syntax.FunctionKeyword,
    Syntax.IfKeyword,
    Syntax.ImportKeyword,
    Syntax.InKeyword,
    Syntax.InstanceOfKeyword,
    Syntax.NewKeyword,
    Syntax.NullKeyword,
    Syntax.ReturnKeyword,
    Syntax.SuperKeyword,
    Syntax.SwitchKeyword,
    Syntax.ThisKeyword,
    Syntax.ThrowKeyword,
    Syntax.TrueKeyword,
    Syntax.TryKeyword,
    Syntax.TypeOfKeyword,
    Syntax.VarKeyword,
    Syntax.VoidKeyword,
    Syntax.WhileKeyword,
    Syntax.WithKeyword,

    Syntax.ImplementsKeyword,
    Syntax.InterfaceKeyword,
    Syntax.LetKeyword,
    Syntax.PackageKeyword,
    Syntax.PrivateKeyword,
    Syntax.ProtectedKeyword,
    Syntax.PublicKeyword,
    Syntax.StaticKeyword,
    Syntax.YieldKeyword,

    Syntax.AbstractKeyword,
    Syntax.AsKeyword,
    Syntax.AssertsKeyword,
    Syntax.AnyKeyword,
    Syntax.AsyncKeyword,
    Syntax.AwaitKeyword,
    Syntax.BooleanKeyword,
    Syntax.ConstructorKeyword,
    Syntax.DeclareKeyword,
    Syntax.GetKeyword,
    Syntax.InferKeyword,
    Syntax.IsKeyword,
    Syntax.KeyOfKeyword,
    Syntax.ModuleKeyword,
    Syntax.NamespaceKeyword,
    Syntax.NeverKeyword,
    Syntax.ReadonlyKeyword,
    Syntax.RequireKeyword,
    Syntax.NumberKeyword,
    Syntax.ObjectKeyword,
    Syntax.SetKeyword,
    Syntax.StringKeyword,
    Syntax.SymbolKeyword,
    Syntax.TypeKeyword,
    Syntax.UndefinedKeyword,
    Syntax.UniqueKeyword,
    Syntax.UnknownKeyword,
    Syntax.FromKeyword,
    Syntax.GlobalKeyword,
    Syntax.BigIntKeyword,
    Syntax.OfKeyword,

    Syntax.QualifiedName,
    Syntax.ComputedPropertyName,

    Syntax.TypeParameter,
    Syntax.Parameter,
    Syntax.Decorator,

    Syntax.PropertySignature,
    Syntax.PropertyDeclaration,
    Syntax.MethodSignature,
    Syntax.MethodDeclaration,
    Syntax.Constructor,
    Syntax.GetAccessor,
    Syntax.SetAccessor,
    Syntax.CallSignature,
    Syntax.ConstructSignature,
    Syntax.IndexSignature,

    Syntax.TypePredicate,
    Syntax.TypeReference,
    Syntax.FunctionType,
    Syntax.ConstructorType,
    Syntax.TypeQuery,
    Syntax.TypeLiteral,
    Syntax.ArrayType,
    Syntax.TupleType,
    Syntax.OptionalType,
    Syntax.RestType,
    Syntax.UnionType,
    Syntax.IntersectionType,
    Syntax.ConditionalType,
    Syntax.InferType,
    Syntax.ParenthesizedType,
    Syntax.ThisType,
    Syntax.TypeOperator,
    Syntax.IndexedAccessType,
    Syntax.MappedType,
    Syntax.LiteralType,
    Syntax.NamedTupleMember,
    Syntax.ImportType,

    Syntax.ObjectBindingPattern,
    Syntax.ArrayBindingPattern,
    Syntax.BindingElement,

    Syntax.ArrayLiteralExpression,
    Syntax.ObjectLiteralExpression,
    Syntax.PropertyAccessExpression,
    Syntax.ElementAccessExpression,
    Syntax.CallExpression,
    Syntax.NewExpression,
    Syntax.TaggedTemplateExpression,
    Syntax.TypeAssertionExpression,
    Syntax.ParenthesizedExpression,
    Syntax.FunctionExpression,
    Syntax.ArrowFunction,
    Syntax.DeleteExpression,
    Syntax.TypeOfExpression,
    Syntax.VoidExpression,
    Syntax.AwaitExpression,
    Syntax.PrefixUnaryExpression,
    Syntax.PostfixUnaryExpression,
    Syntax.BinaryExpression,
    Syntax.ConditionalExpression,
    Syntax.TemplateExpression,
    Syntax.YieldExpression,
    Syntax.SpreadElement,
    Syntax.ClassExpression,
    Syntax.OmittedExpression,
    Syntax.ExpressionWithTypeArguments,
    Syntax.AsExpression,
    Syntax.NonNullExpression,
    Syntax.MetaProperty,
    Syntax.SyntheticExpression,

    Syntax.TemplateSpan,
    Syntax.SemicolonClassElement,

    Syntax.Block,
    Syntax.EmptyStatement,
    Syntax.VariableStatement,
    Syntax.ExpressionStatement,
    Syntax.IfStatement,
    Syntax.DoStatement,
    Syntax.WhileStatement,
    Syntax.ForStatement,
    Syntax.ForInStatement,
    Syntax.ForOfStatement,
    Syntax.ContinueStatement,
    Syntax.BreakStatement,
    Syntax.ReturnStatement,
    Syntax.WithStatement,
    Syntax.SwitchStatement,
    Syntax.LabeledStatement,
    Syntax.ThrowStatement,
    Syntax.TryStatement,
    Syntax.DebuggerStatement,
    Syntax.VariableDeclaration,
    Syntax.VariableDeclarationList,
    Syntax.FunctionDeclaration,
    Syntax.ClassDeclaration,
    Syntax.InterfaceDeclaration,
    Syntax.TypeAliasDeclaration,
    Syntax.EnumDeclaration,
    Syntax.ModuleDeclaration,
    Syntax.ModuleBlock,
    Syntax.CaseBlock,
    Syntax.NamespaceExportDeclaration,
    Syntax.ImportEqualsDeclaration,
    Syntax.ImportDeclaration,
    Syntax.ImportClause,
    Syntax.NamespaceImport,
    Syntax.NamedImports,
    Syntax.ImportSpecifier,
    Syntax.ExportAssignment,
    Syntax.ExportDeclaration,
    Syntax.NamedExports,
    Syntax.NamespaceExport,
    Syntax.ExportSpecifier,
    Syntax.MissingDeclaration,

    Syntax.ExternalModuleReference,

    Syntax.JsxElement,
    Syntax.JsxSelfClosingElement,
    Syntax.JsxOpeningElement,
    Syntax.JsxClosingElement,
    Syntax.JsxFragment,
    Syntax.JsxOpeningFragment,
    Syntax.JsxClosingFragment,
    Syntax.JsxAttribute,
    Syntax.JsxAttributes,
    Syntax.JsxSpreadAttribute,
    Syntax.JsxExpression,

    Syntax.CaseClause,
    Syntax.DefaultClause,
    Syntax.HeritageClause,
    Syntax.CatchClause,

    Syntax.PropertyAssignment,
    Syntax.ShorthandPropertyAssignment,
    Syntax.SpreadAssignment,

    Syntax.EnumMember,

    Syntax.UnparsedPrologue,
    Syntax.UnparsedPrepend,
    Syntax.UnparsedText,
    Syntax.UnparsedInternalText,
    Syntax.UnparsedSyntheticReference,

    Syntax.SourceFile,
    Syntax.Bundle,
    Syntax.UnparsedSource,
    Syntax.InputFiles,

    Syntax.JSDocTypeExpression,
    Syntax.JSDocAllType,

    Syntax.JSDocUnknownType,
    Syntax.JSDocNullableType,
    Syntax.JSDocNonNullableType,
    Syntax.JSDocOptionalType,
    Syntax.JSDocFunctionType,
    Syntax.JSDocVariadicType,

    Syntax.JSDocNamepathType,
    Syntax.JSDocComment,
    Syntax.JSDocTypeLiteral,
    Syntax.JSDocSignature,
    Syntax.JSDocTag,
    Syntax.JSDocAugmentsTag,
    Syntax.JSDocImplementsTag,
    Syntax.JSDocAuthorTag,
    Syntax.JSDocClassTag,
    Syntax.JSDocPublicTag,
    Syntax.JSDocPrivateTag,
    Syntax.JSDocProtectedTag,
    Syntax.JSDocReadonlyTag,
    Syntax.JSDocCallbackTag,
    Syntax.JSDocEnumTag,
    Syntax.JSDocParameterTag,
    Syntax.JSDocReturnTag,
    Syntax.JSDocThisTag,
    Syntax.JSDocTypeTag,
    Syntax.JSDocTemplateTag,
    Syntax.JSDocTypedefTag,
    Syntax.JSDocPropertyTag,

    Syntax.SyntaxList,

    Syntax.NotEmittedStatement,
    Syntax.PartiallyEmittedExpression,
    Syntax.CommaListExpression,
    Syntax.MergeDeclarationMarker,
    Syntax.EndOfDeclarationMarker,
    Syntax.SyntheticReferenceExpression,

    Syntax.Count,
  }


  export namespace Node {
    const kind = Syntax.Unknown;
    export function createSynthesized(k: Syntax): Node {
      const n = createNode(k, -1, -1);
      n.flags |= NodeFlags.Synthesized;
      return n;
    }
    export function createTemplateLiteralLike(k: TemplateLiteralToken['kind'], t: string, raw?: string) {
      const n = createSynthesized(k) as TemplateLiteralLikeNode;
      n.text = t;
      if (raw === undefined || t === raw) n.rawText = raw;
      else {
        const r = Scanner.process(k, raw);
        if (typeof r === 'object') return fail('Invalid raw text');
        assert(t === r, "Expected 'text' to be the normalized version of 'rawText'");
        n.rawText = raw;
      }
      return n;
    }
  }

  export interface NumericLiteral extends LiteralExpression, Declaration {
    kind: Syntax.NumericLiteral;
    numericLiteralFlags: TokenFlags;
  }
  export namespace NumericLiteral {
    export const kind = Syntax.NumericLiteral;
    export function create(t: string, fs: TokenFlags = TokenFlags.None) {
      const n = Node.createSynthesized(Syntax.NumericLiteral) as NumericLiteral;
      n.text = t;
      n.numericLiteralFlags = fs;
      return n;
    }
    export function kinda(n: Node): n is NumericLiteral {
      return n.kind === Syntax.NumericLiteral;
    }
    export function name(name: string | __String) {
      return (+name).toString() === name;
    }
  }

  export interface BigIntLiteral extends LiteralExpression {
    kind: Syntax.BigIntLiteral;
  }
  export namespace BigIntLiteral {
    export function create(t: string) {
      const n = Node.createSynthesized(Syntax.BigIntLiteral) as BigIntLiteral;
      n.text = t;
      return n;
    }
    export function kind(n: Node): n is BigIntLiteral {
      return n.kind === Syntax.BigIntLiteral;
    }
    export function expression(e: Expression) {
      return (
        e.kind === Syntax.BigIntLiteral ||
        (e.kind === Syntax.PrefixUnaryExpression && (e as PrefixUnaryExpression).operator === Syntax.MinusToken && (e as PrefixUnaryExpression).operand.kind === Syntax.BigIntLiteral)
      );
    }
  }

  export interface StringLiteral extends LiteralExpression, Declaration {
    kind: Syntax.StringLiteral;
    textSourceNode?: Identifier | StringLiteralLike | NumericLiteral;
    singleQuote?: boolean;
  }
  export namespace StringLiteral {
    export function create(t: string) {
      const n = Node.createSynthesized(Syntax.StringLiteral) as StringLiteral;
      n.text = t;
      return n;
    }
    export function kind(n: Node): n is StringLiteral {
      return n.kind === Syntax.StringLiteral;
    }
    export function like(n: Node): n is StringLiteralLike {
      return n.kind === Syntax.StringLiteral || n.kind === Syntax.NoSubstitutionLiteral;
    }
    export function orNumericLiteralLike(n: Node): n is StringLiteralLike | NumericLiteral {
      return like(n) || NumericLiteral.kind(n);
    }
    export function orJsxExpressionKind(n: Node): n is StringLiteral | JsxExpression {
      const k = n.kind;
      return k === Syntax.StringLiteral || k === Syntax.JsxExpression;
    }
    export function orNumberLiteralExpression(e: Expression) {
      return (
        orNumericLiteralLike(e) ||
        (e.kind === Syntax.PrefixUnaryExpression && (e as PrefixUnaryExpression).operator === Syntax.MinusToken && (e as PrefixUnaryExpression).operand.kind === Syntax.NumericLiteral)
      );
    }
  }

  export interface JsxText extends LiteralLikeNode {
    kind: Syntax.JsxText;
    onlyTriviaWhitespaces: boolean;
    parent: JsxElement;
  }
  export namespace JsxText {
    export function create(t: string, onlyTriviaWhitespaces?: boolean) {
      const n = Node.createSynthesized(Syntax.JsxText) as JsxText;
      n.text = t;
      n.onlyTriviaWhitespaces = !!onlyTriviaWhitespaces;
      return n;
    }
    export function kind(n: Node): n is JsxText {
      return n.kind === Syntax.JsxText;
    }
  }

  export interface RegexLiteral extends LiteralExpression {
    kind: Syntax.RegexLiteral;
  }
  export namespace RegexLiteral {
    export function create(t: string) {
      const n = Node.createSynthesized(Syntax.RegexLiteral) as RegexLiteral;
      n.text = t;
      return n;
    }
    export function kind(n: Node): n is RegexLiteral {
      return n.kind === Syntax.RegexLiteral;
    }
  }

  export interface NoSubstitutionLiteral extends LiteralExpression, TemplateLiteralLikeNode, Declaration {
    kind: Syntax.NoSubstitutionLiteral;
    templateFlags?: TokenFlags;
  }
  export namespace NoSubstitutionLiteral {
    export function create(t: string, raw?: string) {
      return Node.createTemplateLiteralLike(Syntax.NoSubstitutionLiteral, t, raw) as NoSubstitutionLiteral;
    }
    export function kind(n: Node): n is NoSubstitutionLiteral {
      return n.kind === Syntax.NoSubstitutionLiteral;
    }
  }

  export interface TemplateHead extends TemplateLiteralLikeNode {
    kind: Syntax.TemplateHead;
    parent: TemplateExpression;
    templateFlags?: TokenFlags;
  }
  export namespace TemplateHead {
    export function create(t: string, raw?: string) {
      return Node.createTemplateLiteralLike(Syntax.TemplateHead, t, raw) as TemplateHead;
    }
    export function kind(n: Node): n is TemplateHead {
      return n.kind === Syntax.TemplateHead;
    }
  }

  export interface TemplateMiddle extends TemplateLiteralLikeNode {
    kind: Syntax.TemplateMiddle;
    parent: TemplateSpan;
    templateFlags?: TokenFlags;
  }
  export namespace TemplateMiddle {
    export function create(t: string, raw?: string) {
      return Node.createTemplateLiteralLike(Syntax.TemplateMiddle, t, raw) as TemplateMiddle;
    }
    export function kind(n: Node): n is TemplateMiddle {
      return n.kind === Syntax.TemplateMiddle;
    }
    export function orTemplateTailKind(n: Node): n is TemplateMiddle | TemplateTail {
      const k = n.kind;
      return k === Syntax.TemplateMiddle || k === Syntax.TemplateTail;
    }
  }

  export interface TemplateTail extends TemplateLiteralLikeNode {
    kind: Syntax.TemplateTail;
    parent: TemplateSpan;
    templateFlags?: TokenFlags;
  }
  export namespace TemplateTail {
    export function create(t: string, raw?: string) {
      return Node.createTemplateLiteralLike(Syntax.TemplateTail, t, raw) as TemplateTail;
    }
    export function kind(n: Node): n is TemplateTail {
      return n.kind === Syntax.TemplateTail;
    }
  }

  export interface QualifiedName extends Node {
    kind: Syntax.QualifiedName;
    left: EntityName;
    right: Identifier;
    jsdocDotPos?: number;
  }
  export namespace QualifiedName {
    export function create(left: EntityName, right: string | Identifier) {
      const n = Node.createSynthesized(Syntax.QualifiedName) as QualifiedName;
      n.left = left;
      n.right = asName(right);
      return n;
    }
    export function kind(n: Node): n is QualifiedName {
      return n.kind === Syntax.QualifiedName;
    }
    export function update(n: QualifiedName, left: EntityName, right: Identifier) {
      return n.left !== left || n.right !== right ? updateNode(create(left, right), n) : n;
    }
  }

  export interface ComputedPropertyName extends Node {
    parent: Declaration;
    kind: Syntax.ComputedPropertyName;
    expression: Expression;
  }
  export namespace ComputedPropertyName {
    export function create(e: Expression) {
      const n = Node.createSynthesized(Syntax.ComputedPropertyName) as ComputedPropertyName;
      n.expression = isCommaSequence(e) ? createParen(e) : e;
      return n;
    }
    export function kind(n: Node): n is ComputedPropertyName {
      return n.kind === Syntax.ComputedPropertyName;
    }
    export function update(n: ComputedPropertyName, e: Expression) {
      return n.expression !== e ? updateNode(create(e), n) : n;
    }
  }

  export interface PropertySignature extends TypeElement, JSDocContainer {
    kind: Syntax.PropertySignature;
    name: PropertyName;
    questionToken?: QuestionToken;
    type?: TypeNode;
    initializer?: Expression;
  }
  export namespace PropertySignature {
    export function create(ms: readonly Modifier[] | undefined, p: PropertyName | string, q?: QuestionToken, t?: TypeNode, i?: Expression) {
      const n = Node.createSynthesized(Syntax.PropertySignature) as PropertySignature;
      n.modifiers = asNodeArray(ms);
      n.name = asName(p);
      n.questionToken = q;
      n.type = t;
      n.initializer = i;
      return n;
    }
    export function update(n: PropertySignature, ms: readonly Modifier[] | undefined, p: PropertyName, q?: QuestionToken, t?: TypeNode, i?: Expression) {
      return n.modifiers !== ms || n.name !== p || n.questionToken !== q || n.type !== t || n.initializer !== i ? updateNode(create(ms, p, q, t, i), n) : n;
    }
    export function kind(n: Node): n is PropertySignature {
      return n.kind === Syntax.PropertySignature;
    }
  }

  export interface PropertyDeclaration extends ClassElement, JSDocContainer {
    kind: Syntax.PropertyDeclaration;
    parent: ClassLikeDeclaration;
    name: PropertyName;
    questionToken?: QuestionToken;
    exclamationToken?: ExclamationToken;
    type?: TypeNode;
    initializer?: Expression;
  }
  export namespace PropertyDeclaration {
    export function create(ds: readonly Decorator[] | undefined, ms: readonly Modifier[] | undefined, p: string | PropertyName, q?: QuestionToken | ExclamationToken, t?: TypeNode, i?: Expression) {
      const n = Node.createSynthesized(Syntax.PropertyDeclaration) as PropertyDeclaration;
      n.decorators = asNodeArray(ds);
      n.modifiers = asNodeArray(ms);
      n.name = asName(p);
      n.questionToken = q !== undefined && q.kind === Syntax.QuestionToken ? q : undefined;
      n.exclamationToken = q !== undefined && q.kind === Syntax.ExclamationToken ? q : undefined;
      n.type = t;
      n.initializer = i;
      return n;
    }
    export function update(
      n: PropertyDeclaration,
      ds: readonly Decorator[] | undefined,
      ms: readonly Modifier[] | undefined,
      p: string | PropertyName,
      q?: QuestionToken | ExclamationToken,
      t?: TypeNode,
      i?: Expression
    ) {
      return n.decorators !== ds ||
        n.modifiers !== ms ||
        n.name !== p ||
        n.questionToken !== (q !== undefined && q.kind === Syntax.QuestionToken ? q : undefined) ||
        n.exclamationToken !== (q !== undefined && q.kind === Syntax.ExclamationToken ? q : undefined) ||
        n.type !== t ||
        n.initializer !== i
        ? updateNode(create(ds, ms, p, q, t, i), n)
        : n;
    }
    export function kind(n: Node): n is PropertyDeclaration {
      return n.kind === Syntax.PropertyDeclaration;
    }
  }

  export interface MethodSignature extends SignatureDeclarationBase, TypeElement {
    kind: Syntax.MethodSignature;
    parent: ObjectTypeDeclaration;
    name: PropertyName;
  }
  export namespace MethodSignature {
    export function create(ts: readonly TypeParameterDeclaration[] | undefined, ps: readonly ParameterDeclaration[], t: TypeNode | undefined, p: string | PropertyName, q?: QuestionToken) {
      const n = SignatureDeclaration.create(Syntax.MethodSignature, ts, ps, t) as MethodSignature;
      n.name = asName(p);
      n.questionToken = q;
      return n;
    }
    export function update(n: MethodSignature, ts: NodeArray<TypeParameterDeclaration> | undefined, ps: NodeArray<ParameterDeclaration>, t: TypeNode | undefined, p: PropertyName, q?: QuestionToken) {
      return n.typeParameters !== ts || n.parameters !== ps || n.type !== t || n.name !== p || n.questionToken !== q ? updateNode(create(ts, ps, t, p, q), n) : n;
    }
    export function kind(n: Node): n is MethodSignature {
      return n.kind === Syntax.MethodSignature;
    }
  }

  export interface MethodDeclaration extends FunctionLikeDeclarationBase, ClassElement, ObjectLiteralElement, JSDocContainer {
    kind: Syntax.MethodDeclaration;
    parent: ClassLikeDeclaration | ObjectLiteralExpression;
    name: PropertyName;
    body?: FunctionBody;
  }
  export namespace MethodDeclaration {
    export function create(
      ds: readonly Decorator[] | undefined,
      ms: readonly Modifier[] | undefined,
      a: AsteriskToken | undefined,
      p: string | PropertyName,
      q: QuestionToken | undefined,
      ts: readonly TypeParameterDeclaration[] | undefined,
      ps: readonly ParameterDeclaration[],
      t?: TypeNode,
      b?: Block
    ) {
      const n = Node.createSynthesized(Syntax.MethodDeclaration) as MethodDeclaration;
      n.decorators = asNodeArray(ds);
      n.modifiers = asNodeArray(ms);
      n.asteriskToken = a;
      n.name = asName(p);
      n.questionToken = q;
      n.typeParameters = asNodeArray(ts);
      n.parameters = createNodeArray(ps);
      n.type = t;
      n.body = b;
      return n;
    }
    export function update(
      n: MethodDeclaration,
      ds: readonly Decorator[] | undefined,
      ms: readonly Modifier[] | undefined,
      a: AsteriskToken | undefined,
      p: PropertyName,
      q: QuestionToken | undefined,
      ts: readonly TypeParameterDeclaration[] | undefined,
      ps: readonly ParameterDeclaration[],
      t?: TypeNode,
      b?: Block
    ) {
      return n.decorators !== ds ||
        n.modifiers !== ms ||
        n.asteriskToken !== a ||
        n.name !== p ||
        n.questionToken !== q ||
        n.typeParameters !== ts ||
        n.parameters !== ps ||
        n.type !== t ||
        n.body !== b
        ? updateNode(create(ds, ms, a, p, q, ts, ps, t, b), n)
        : n;
    }
    export function kind(n: Node): n is MethodDeclaration {
      return n.kind === Syntax.MethodDeclaration;
    }
  }

  export interface ConstructorDeclaration extends FunctionLikeDeclarationBase, ClassElement, JSDocContainer {
    kind: Syntax.Constructor;
    parent: ClassLikeDeclaration;
    body?: FunctionBody;
  }
  export namespace ConstructorDeclaration {
    export function create(ds: readonly Decorator[] | undefined, ms: readonly Modifier[] | undefined, ps: readonly ParameterDeclaration[], b?: Block) {
      const n = Node.createSynthesized(Syntax.Constructor) as ConstructorDeclaration;
      n.decorators = asNodeArray(ds);
      n.modifiers = asNodeArray(ms);
      n.typeParameters = undefined;
      n.parameters = createNodeArray(ps);
      n.type = undefined;
      n.body = b;
      return n;
    }
    export function update(n: ConstructorDeclaration, ds: readonly Decorator[] | undefined, ms: readonly Modifier[] | undefined, ps: readonly ParameterDeclaration[], b?: Block) {
      return n.decorators !== ds || n.modifiers !== ms || n.parameters !== ps || n.body !== b ? updateNode(create(ds, ms, ps, b), n) : n;
    }
    export function kind(n: Node): n is ConstructorDeclaration {
      return n.kind === Syntax.Constructor;
    }
  }

  export interface GetAccessorDeclaration extends FunctionLikeDeclarationBase, ClassElement, ObjectLiteralElement, JSDocContainer {
    kind: Syntax.GetAccessor;
    parent: ClassLikeDeclaration | ObjectLiteralExpression;
    name: PropertyName;
    body?: FunctionBody;
  }
  export namespace GetAccessorDeclaration {
    export function create(ds: readonly Decorator[] | undefined, ms: readonly Modifier[] | undefined, p: string | PropertyName, ps: readonly ParameterDeclaration[], t?: TypeNode, b?: Block) {
      const n = Node.createSynthesized(Syntax.GetAccessor) as GetAccessorDeclaration;
      n.decorators = asNodeArray(ds);
      n.modifiers = asNodeArray(ms);
      n.name = asName(p);
      n.typeParameters = undefined;
      n.parameters = createNodeArray(ps);
      n.type = t;
      n.body = b;
      return n;
    }
    export function update(
      n: GetAccessorDeclaration,
      ds: readonly Decorator[] | undefined,
      ms: readonly Modifier[] | undefined,
      p: PropertyName,
      ps: readonly ParameterDeclaration[],
      t?: TypeNode,
      b?: Block
    ) {
      return n.decorators !== ds || n.modifiers !== ms || n.name !== p || n.parameters !== ps || n.type !== t || n.body !== b ? updateNode(create(ds, ms, p, ps, t, b), n) : n;
    }
    export function kind(n: Node): n is GetAccessorDeclaration {
      return n.kind === Syntax.GetAccessor;
    }
    export function orSetKind(n: Node): n is AccessorDeclaration {
      return n.kind === Syntax.SetAccessor || n.kind === Syntax.GetAccessor;
    }
  }

  export interface SetAccessorDeclaration extends FunctionLikeDeclarationBase, ClassElement, ObjectLiteralElement, JSDocContainer {
    kind: Syntax.SetAccessor;
    parent: ClassLikeDeclaration | ObjectLiteralExpression;
    name: PropertyName;
    body?: FunctionBody;
  }
  export namespace SetAccessorDeclaration {
    export function create(ds: readonly Decorator[] | undefined, ms: readonly Modifier[] | undefined, p: string | PropertyName, ps: readonly ParameterDeclaration[], b?: Block) {
      const n = Node.createSynthesized(Syntax.SetAccessor) as SetAccessorDeclaration;
      n.decorators = asNodeArray(ds);
      n.modifiers = asNodeArray(ms);
      n.name = asName(p);
      n.typeParameters = undefined;
      n.parameters = createNodeArray(ps);
      n.body = b;
      return n;
    }
    export function update(n: SetAccessorDeclaration, ds: readonly Decorator[] | undefined, ms: readonly Modifier[] | undefined, p: PropertyName, ps: readonly ParameterDeclaration[], b?: Block) {
      return n.decorators !== ds || n.modifiers !== ms || n.name !== p || n.parameters !== ps || n.body !== b ? updateNode(create(ds, ms, p, ps, b), n) : n;
    }
    export function kind(n: Node): n is SetAccessorDeclaration {
      return n.kind === Syntax.SetAccessor;
    }
  }

  export interface CallSignatureDeclaration extends SignatureDeclarationBase, TypeElement {
    kind: Syntax.CallSignature;
  }
  export namespace CallSignatureDeclaration {
    export function create(ts: readonly TypeParameterDeclaration[] | undefined, ps: readonly ParameterDeclaration[], t?: TypeNode) {
      return SignatureDeclaration.create(Syntax.CallSignature, ts, ps, t) as CallSignatureDeclaration;
    }
    export function update(n: CallSignatureDeclaration, ts: NodeArray<TypeParameterDeclaration> | undefined, ps: NodeArray<ParameterDeclaration>, t?: TypeNode) {
      return SignatureDeclaration.update(n, ts, ps, t);
    }
    export function kind(n: Node): n is CallSignatureDeclaration {
      return n.kind === Syntax.CallSignature;
    }
  }

  export interface ConstructSignatureDeclaration extends SignatureDeclarationBase, TypeElement {
    kind: Syntax.ConstructSignature;
  }
  export namespace ConstructSignatureDeclaration {
    export function create(ts: readonly TypeParameterDeclaration[] | undefined, ps: readonly ParameterDeclaration[], t?: TypeNode) {
      return SignatureDeclaration.create(Syntax.ConstructSignature, ts, ps, t) as ConstructSignatureDeclaration;
    }
    export function update(n: ConstructSignatureDeclaration, ts: NodeArray<TypeParameterDeclaration> | undefined, ps: NodeArray<ParameterDeclaration>, t?: TypeNode) {
      return SignatureDeclaration.update(n, ts, ps, t);
    }
    export function kind(n: Node): n is ConstructSignatureDeclaration {
      return n.kind === Syntax.ConstructSignature;
    }
  }

  export interface IndexSignatureDeclaration extends SignatureDeclarationBase, ClassElement, TypeElement {
    kind: Syntax.IndexSignature;
    parent: ObjectTypeDeclaration;
  }
  export namespace IndexSignatureDeclaration {
    export function create(ds: readonly Decorator[] | undefined, ms: readonly Modifier[] | undefined, ps: readonly ParameterDeclaration[], t: TypeNode): IndexSignatureDeclaration {
      const n = Node.createSynthesized(Syntax.IndexSignature) as IndexSignatureDeclaration;
      n.decorators = asNodeArray(ds);
      n.modifiers = asNodeArray(ms);
      n.parameters = createNodeArray(ps);
      n.type = t;
      return n;
    }
    export function update(n: IndexSignatureDeclaration, ds: readonly Decorator[] | undefined, ms: readonly Modifier[] | undefined, ps: readonly ParameterDeclaration[], t: TypeNode) {
      return n.parameters !== ps || n.type !== t || n.decorators !== ds || n.modifiers !== ms ? updateNode(create(ds, ms, ps, t), n) : n;
    }
    export function kind(n: Node): n is IndexSignatureDeclaration {
      return n.kind === Syntax.IndexSignature;
    }
  }

  export interface TypeNode extends Node {
    _typeNodeBrand: any;
  }

  export interface KeywordTypeNode extends TypeNode {
    kind:
      | Syntax.AnyKeyword
      | Syntax.UnknownKeyword
      | Syntax.NumberKeyword
      | Syntax.BigIntKeyword
      | Syntax.ObjectKeyword
      | Syntax.BooleanKeyword
      | Syntax.StringKeyword
      | Syntax.SymbolKeyword
      | Syntax.ThisKeyword
      | Syntax.VoidKeyword
      | Syntax.UndefinedKeyword
      | Syntax.NullKeyword
      | Syntax.NeverKeyword;
  }
  export namespace KeywordTypeNode {
    export function create(k: KeywordTypeNode['kind']) {
      return Node.createSynthesized(k) as KeywordTypeNode;
    }
  }

  export interface TypePredicateNode extends TypeNode {
    kind: Syntax.TypePredicate;
    parent: SignatureDeclaration | JSDocTypeExpression;
    assertsModifier?: AssertsToken;
    parameterName: Identifier | ThisTypeNode;
    type?: TypeNode;
  }
  export namespace TypePredicateNode {
    export function create(p: Identifier | ThisTypeNode | string, t: TypeNode) {
      return createWithModifier(undefined, p, t);
    }
    export function createWithModifier(a: AssertsToken | undefined, p: Identifier | ThisTypeNode | string, t?: TypeNode) {
      const n = Node.createSynthesized(Syntax.TypePredicate) as TypePredicateNode;
      n.assertsModifier = a;
      n.parameterName = asName(p);
      n.type = t;
      return n;
    }
    export function update(n: TypePredicateNode, p: Identifier | ThisTypeNode, t: TypeNode) {
      return updateWithModifier(n, n.assertsModifier, p, t);
    }
    export function updateWithModifier(n: TypePredicateNode, a: AssertsToken | undefined, p: Identifier | ThisTypeNode, t?: TypeNode) {
      return n.assertsModifier !== a || n.parameterName !== p || n.type !== t ? updateNode(createWithModifier(a, p, t), n) : n;
    }
    export function kind(n: Node): n is TypePredicateNode {
      return n.kind === Syntax.TypePredicate;
    }
  }

  export interface TypeReferenceNode extends NodeWithTypeArguments {
    kind: Syntax.TypeReference;
    typeName: EntityName;
  }
  export namespace TypeReferenceNode {
    export function create(t: string | EntityName, ts?: readonly TypeNode[]) {
      const n = Node.createSynthesized(Syntax.TypeReference) as TypeReferenceNode;
      n.typeName = asName(t);
      n.typeArguments = ts && parenthesizeTypeParameters(ts);
      return n;
    }
    export function update(n: TypeReferenceNode, t: EntityName, ts?: NodeArray<TypeNode>) {
      return n.typeName !== t || n.typeArguments !== ts ? updateNode(create(t, ts), n) : n;
    }
    export function kind(n: Node): n is TypeReferenceNode {
      return n.kind === Syntax.TypeReference;
    }
  }

  export interface FunctionTypeNode extends FunctionOrConstructorTypeNodeBase {
    kind: Syntax.FunctionType;
  }
  export namespace FunctionTypeNode {
    export function create(ts: readonly TypeParameterDeclaration[] | undefined, ps: readonly ParameterDeclaration[], t?: TypeNode) {
      return SignatureDeclaration.create(Syntax.FunctionType, ts, ps, t) as FunctionTypeNode;
    }
    export function update(n: FunctionTypeNode, ts: NodeArray<TypeParameterDeclaration> | undefined, ps: NodeArray<ParameterDeclaration>, t?: TypeNode) {
      return SignatureDeclaration.update(n, ts, ps, t);
    }
    export function kind(n: Node): n is FunctionTypeNode {
      return n.kind === Syntax.FunctionType;
    }
  }

  export interface ConstructorTypeNode extends FunctionOrConstructorTypeNodeBase {
    kind: Syntax.ConstructorType;
  }
  export namespace ConstructorTypeNode {
    export function create(ts: readonly TypeParameterDeclaration[] | undefined, ps: readonly ParameterDeclaration[], t?: TypeNode) {
      return SignatureDeclaration.create(Syntax.ConstructorType, ts, ps, t) as ConstructorTypeNode;
    }
    export function update(n: ConstructorTypeNode, ts: NodeArray<TypeParameterDeclaration> | undefined, ps: NodeArray<ParameterDeclaration>, t?: TypeNode) {
      return SignatureDeclaration.update(n, ts, ps, t);
    }
    export function kind(n: Node): n is ConstructorTypeNode {
      return n.kind === Syntax.ConstructorType;
    }
  }

  export interface TypeQueryNode extends TypeNode {
    kind: Syntax.TypeQuery;
    exprName: EntityName;
  }
  export namespace TypeQueryNode {
    export function create(e: EntityName) {
      const n = Node.createSynthesized(Syntax.TypeQuery) as TypeQueryNode;
      n.exprName = e;
      return n;
    }
    export function update(n: TypeQueryNode, e: EntityName) {
      return n.exprName !== e ? updateNode(create(e), n) : n;
    }
    export function kind(n: Node): n is TypeQueryNode {
      return n.kind === Syntax.TypeQuery;
    }
  }

  export interface TypeLiteralNode extends TypeNode, Declaration {
    kind: Syntax.TypeLiteral;
    members: NodeArray<TypeElement>;
  }
  export namespace TypeLiteralNode {
    export function create(ms: readonly TypeElement[] | undefined) {
      const n = Node.createSynthesized(Syntax.TypeLiteral) as TypeLiteralNode;
      n.members = createNodeArray(ms);
      return n;
    }
    export function update(n: TypeLiteralNode, ms: NodeArray<TypeElement>) {
      return n.members !== ms ? updateNode(create(ms), n) : n;
    }
    export function kind(n: Node): n is TypeLiteralNode {
      return n.kind === Syntax.TypeLiteral;
    }
  }

  export interface ArrayTypeNode extends TypeNode {
    kind: Syntax.ArrayType;
    elementType: TypeNode;
  }
  export namespace ArrayTypeNode {
    export function create(t: TypeNode) {
      const n = Node.createSynthesized(Syntax.ArrayType) as ArrayTypeNode;
      n.elementType = parenthesizeArrayTypeMember(t);
      return n;
    }
    export function update(n: ArrayTypeNode, t: TypeNode) {
      return n.elementType !== t ? updateNode(create(t), n) : n;
    }
    export function kind(n: Node): n is ArrayTypeNode {
      return n.kind === Syntax.ArrayType;
    }
  }

  export interface TupleTypeNode extends TypeNode {
    kind: Syntax.TupleType;
    elements: NodeArray<TypeNode | NamedTupleMember>;
  }
  export namespace TupleTypeNode {
    export function create(es: readonly (TypeNode | NamedTupleMember)[]) {
      const n = Node.createSynthesized(Syntax.TupleType) as TupleTypeNode;
      n.elements = createNodeArray(es);
      return n;
    }
    export function update(n: TupleTypeNode, es: readonly (TypeNode | NamedTupleMember)[]) {
      return n.elements !== es ? updateNode(create(es), n) : n;
    }
    export function kind(n: Node): n is TupleTypeNode {
      return n.kind === Syntax.TupleType;
    }
  }

  export interface OptionalTypeNode extends TypeNode {
    kind: Syntax.OptionalType;
    type: TypeNode;
  }
  export namespace OptionalTypeNode {
    export function create(t: TypeNode) {
      const n = Node.createSynthesized(Syntax.OptionalType) as OptionalTypeNode;
      n.type = parenthesizeArrayTypeMember(t);
      return n;
    }
    export function update(n: OptionalTypeNode, t: TypeNode): OptionalTypeNode {
      return n.type !== t ? updateNode(create(t), n) : n;
    }
  }

  export interface RestTypeNode extends TypeNode {
    kind: Syntax.RestType;
    type: TypeNode;
  }
  export namespace RestTypeNode {
    export function create(t: TypeNode) {
      const n = Node.createSynthesized(Syntax.RestType) as RestTypeNode;
      n.type = t;
      return n;
    }
    export function update(n: RestTypeNode, t: TypeNode): RestTypeNode {
      return n.type !== t ? updateNode(create(t), n) : n;
    }
  }

  export interface UnionTypeNode extends TypeNode {
    kind: Syntax.UnionType;
    types: NodeArray<TypeNode>;
  }
  export namespace UnionTypeNode {
    export function create(ts: readonly TypeNode[]) {
      return orIntersectionCreate(Syntax.UnionType, ts) as UnionTypeNode;
    }
    export function orIntersectionCreate(k: Syntax.UnionType | Syntax.IntersectionType, ts: readonly TypeNode[]) {
      const n = Node.createSynthesized(k) as UnionTypeNode | IntersectionTypeNode;
      n.types = parenthesizeElementTypeMembers(ts);
      return n;
    }
    export function update(n: UnionTypeNode, ts: NodeArray<TypeNode>) {
      return orIntersectionUpdate(n, ts);
    }
    export function orIntersectionUpdate<T extends UnionOrIntersectionTypeNode>(n: T, ts: NodeArray<TypeNode>): T {
      return n.types !== ts ? updateNode(orIntersectionCreate(n.kind, ts) as T, n) : n;
    }
    export function kind(n: Node): n is UnionTypeNode {
      return n.kind === Syntax.UnionType;
    }
  }

  export interface IntersectionTypeNode extends TypeNode {
    kind: Syntax.IntersectionType;
    types: NodeArray<TypeNode>;
  }
  export namespace IntersectionTypeNode {
    export function create(ts: readonly TypeNode[]) {
      return UnionTypeNode.orIntersectionCreate(Syntax.IntersectionType, ts) as IntersectionTypeNode;
    }
    export function update(n: IntersectionTypeNode, ts: NodeArray<TypeNode>) {
      return UnionTypeNode.orIntersectionUpdate(n, ts);
    }
    export function kind(n: Node): n is IntersectionTypeNode {
      return n.kind === Syntax.IntersectionType;
    }
  }

  export interface ConditionalTypeNode extends TypeNode {
    kind: Syntax.ConditionalType;
    checkType: TypeNode;
    extendsType: TypeNode;
    trueType: TypeNode;
    falseType: TypeNode;
  }
  export namespace ConditionalTypeNode {
    export function create(c: TypeNode, e: TypeNode, t: TypeNode, f: TypeNode) {
      const n = Node.createSynthesized(Syntax.ConditionalType) as ConditionalTypeNode;
      n.checkType = parenthesizeConditionalTypeMember(c);
      n.extendsType = parenthesizeConditionalTypeMember(e);
      n.trueType = t;
      n.falseType = f;
      return n;
    }
    export function update(n: ConditionalTypeNode, c: TypeNode, e: TypeNode, t: TypeNode, f: TypeNode) {
      return n.checkType !== c || n.extendsType !== e || n.trueType !== t || n.falseType !== f ? updateNode(create(c, e, t, f), n) : n;
    }
    export function kind(n: Node): n is ConditionalTypeNode {
      return n.kind === Syntax.ConditionalType;
    }
  }

  export interface InferTypeNode extends TypeNode {
    kind: Syntax.InferType;
    typeParameter: TypeParameterDeclaration;
  }
  export namespace InferTypeNode {
    export function create(p: TypeParameterDeclaration) {
      const n = Node.createSynthesized(Syntax.InferType) as InferTypeNode;
      n.typeParameter = p;
      return n;
    }
    export function update(n: InferTypeNode, p: TypeParameterDeclaration) {
      return n.typeParameter !== p ? updateNode(create(p), n) : n;
    }
    export function kind(n: Node): n is InferTypeNode {
      return n.kind === Syntax.InferType;
    }
  }

  export interface ParenthesizedTypeNode extends TypeNode {
    kind: Syntax.ParenthesizedType;
    type: TypeNode;
  }
  export namespace ParenthesizedTypeNode {
    export function create(t: TypeNode) {
      const n = Node.createSynthesized(Syntax.ParenthesizedType) as ParenthesizedTypeNode;
      n.type = t;
      return n;
    }
    export function update(n: ParenthesizedTypeNode, t: TypeNode) {
      return n.type !== t ? updateNode(create(t), n) : n;
    }
    export function kind(n: Node): n is ParenthesizedTypeNode {
      return n.kind === Syntax.ParenthesizedType;
    }
  }

  export interface ThisTypeNode extends TypeNode {
    kind: Syntax.ThisType;
  }
  export namespace ThisTypeNode {
    export function create() {
      return Node.createSynthesized(Syntax.ThisType) as ThisTypeNode;
    }
    export function kind(n: Node): n is ThisTypeNode {
      return n.kind === Syntax.ThisType;
    }
  }

  export interface TypeOperatorNode extends TypeNode {
    kind: Syntax.TypeOperator;
    operator: Syntax.KeyOfKeyword | Syntax.UniqueKeyword | Syntax.ReadonlyKeyword;
    type: TypeNode;
  }
  export namespace TypeOperatorNode {
    export function create(t: TypeNode): TypeOperatorNode;
    export function create(o: Syntax.KeyOfKeyword | Syntax.UniqueKeyword | Syntax.ReadonlyKeyword, t: TypeNode): TypeOperatorNode;
    export function create(o: Syntax.KeyOfKeyword | Syntax.UniqueKeyword | Syntax.ReadonlyKeyword | TypeNode, t?: TypeNode) {
      const n = Node.createSynthesized(Syntax.TypeOperator) as TypeOperatorNode;
      n.operator = typeof o === 'number' ? o : Syntax.KeyOfKeyword;
      n.type = parenthesizeElementTypeMember(typeof o === 'number' ? t! : o);
      return n;
    }
    export function update(n: TypeOperatorNode, t: TypeNode) {
      return n.type !== t ? updateNode(create(n.operator, t), n) : n;
    }
    export function kind(n: Node): n is TypeOperatorNode {
      return n.kind === Syntax.TypeOperator;
    }
  }

  export interface IndexedAccessTypeNode extends TypeNode {
    kind: Syntax.IndexedAccessType;
    objectType: TypeNode;
    indexType: TypeNode;
  }
  export namespace IndexedAccessTypeNode {
    export function create(o: TypeNode, i: TypeNode) {
      const n = Node.createSynthesized(Syntax.IndexedAccessType) as IndexedAccessTypeNode;
      n.objectType = parenthesizeElementTypeMember(o);
      n.indexType = i;
      return n;
    }
    export function update(n: IndexedAccessTypeNode, o: TypeNode, i: TypeNode) {
      return n.objectType !== o || n.indexType !== i ? updateNode(create(o, i), n) : n;
    }
    export function kind(n: Node): n is IndexedAccessTypeNode {
      return n.kind === Syntax.IndexedAccessType;
    }
  }

  export interface MappedTypeNode extends TypeNode, Declaration {
    kind: Syntax.MappedType;
    readonlyToken?: ReadonlyToken | PlusToken | MinusToken;
    typeParameter: TypeParameterDeclaration;
    questionToken?: QuestionToken | PlusToken | MinusToken;
    type?: TypeNode;
  }
  export namespace MappedTypeNode {
    export function create(r: ReadonlyToken | PlusToken | MinusToken | undefined, p: TypeParameterDeclaration, q?: QuestionToken | PlusToken | MinusToken, t?: TypeNode) {
      const n = Node.createSynthesized(Syntax.MappedType) as MappedTypeNode;
      n.readonlyToken = r;
      n.typeParameter = p;
      n.questionToken = q;
      n.type = t;
      return n;
    }
    export function update(n: MappedTypeNode, r: ReadonlyToken | PlusToken | MinusToken | undefined, p: TypeParameterDeclaration, q?: QuestionToken | PlusToken | MinusToken, t?: TypeNode) {
      return n.readonlyToken !== r || n.typeParameter !== p || n.questionToken !== q || n.type !== t ? updateNode(create(r, p, q, t), n) : n;
    }
    export function kind(n: Node): n is MappedTypeNode {
      return n.kind === Syntax.MappedType;
    }
  }

  export interface LiteralTypeNode extends TypeNode {
    kind: Syntax.LiteralType;
    literal: BooleanLiteral | LiteralExpression | PrefixUnaryExpression;
  }
  export namespace LiteralTypeNode {
    export function create(l: LiteralTypeNode['literal']) {
      const n = Node.createSynthesized(Syntax.LiteralType) as LiteralTypeNode;
      n.literal = l;
      return n;
    }
    export function update(n: LiteralTypeNode, l: LiteralTypeNode['literal']) {
      return n.literal !== l ? updateNode(create(l), n) : n;
    }
    export function kind(n: Node): n is LiteralTypeNode {
      return n.kind === Syntax.LiteralType;
    }
  }

  export interface NamedTupleMember extends TypeNode, JSDocContainer, Declaration {
    kind: Syntax.NamedTupleMember;
    dot3Token?: Token<Syntax.Dot3Token>;
    name: Identifier;
    questionToken?: Token<Syntax.QuestionToken>;
    type: TypeNode;
  }
  export namespace NamedTupleMember {
    export function create(d: Token<Syntax.Dot3Token> | undefined, i: Identifier, q: Token<Syntax.QuestionToken> | undefined, t: TypeNode) {
      const n = Node.createSynthesized(Syntax.NamedTupleMember) as NamedTupleMember;
      n.dot3Token = d;
      n.name = i;
      n.questionToken = q;
      n.type = t;
      return n;
    }
    export function update(n: NamedTupleMember, d: Token<Syntax.Dot3Token> | undefined, i: Identifier, q: Token<Syntax.QuestionToken> | undefined, t: TypeNode) {
      return n.dot3Token !== d || n.name !== i || n.questionToken !== q || n.type !== t ? updateNode(create(d, i, q, t), n) : n;
    }
  }

  export interface ImportTypeNode extends NodeWithTypeArguments {
    kind: Syntax.ImportType;
    isTypeOf?: boolean;
    argument: TypeNode;
    qualifier?: EntityName;
  }
  export namespace ImportTypeNode {
    export function create(a: TypeNode, q?: EntityName, ts?: readonly TypeNode[], tof?: boolean) {
      const n = Node.createSynthesized(Syntax.ImportType) as ImportTypeNode;
      n.argument = a;
      n.qualifier = q;
      n.typeArguments = parenthesizeTypeParameters(ts);
      n.isTypeOf = tof;
      return n;
    }
    export function update(n: ImportTypeNode, a: TypeNode, q?: EntityName, ts?: readonly TypeNode[], tof?: boolean) {
      return n.argument !== a || n.qualifier !== q || n.typeArguments !== ts || n.isTypeOf !== tof ? updateNode(create(a, q, ts, tof), n) : n;
    }
    export function kind(n: Node): n is ImportTypeNode {
      return n.kind === Syntax.ImportType;
    }
  }

  export interface ObjectBindingPattern extends Node {
    kind: Syntax.ObjectBindingPattern;
    parent: VariableDeclaration | ParameterDeclaration | BindingElement;
    elements: NodeArray<BindingElement>;
  }
  export namespace ObjectBindingPattern {
    export function create(es: readonly BindingElement[]) {
      const n = Node.createSynthesized(Syntax.ObjectBindingPattern) as ObjectBindingPattern;
      n.elements = createNodeArray(es);
      return n;
    }
    export function update(n: ObjectBindingPattern, es: readonly BindingElement[]) {
      return n.elements !== es ? updateNode(create(es), n) : n;
    }
    export function kind(n: Node): n is ObjectBindingPattern {
      return n.kind === Syntax.ObjectBindingPattern;
    }
  }

  export interface ArrayBindingPattern extends Node {
    kind: Syntax.ArrayBindingPattern;
    parent: VariableDeclaration | ParameterDeclaration | BindingElement;
    elements: NodeArray<ArrayBindingElement>;
  }
  export namespace ArrayBindingPattern {
    export function create(es: readonly ArrayBindingElement[]) {
      const n = Node.createSynthesized(Syntax.ArrayBindingPattern) as ArrayBindingPattern;
      n.elements = createNodeArray(es);
      return n;
    }
    export function update(n: ArrayBindingPattern, es: readonly ArrayBindingElement[]) {
      return n.elements !== es ? updateNode(create(es), n) : n;
    }
    export function kind(n: Node): n is ArrayBindingPattern {
      return n.kind === Syntax.ArrayBindingPattern;
    }
  }

  export interface BindingElement extends NamedDeclaration {
    kind: Syntax.BindingElement;
    parent: BindingPattern;
    propertyName?: PropertyName;
    dot3Token?: Dot3Token;
    name: BindingName;
    initializer?: Expression;
  }
  export namespace BindingElement {
    export function create(d: Dot3Token | undefined, p: string | PropertyName | undefined, b: string | BindingName, i?: Expression) {
      const n = Node.createSynthesized(Syntax.BindingElement) as BindingElement;
      n.dot3Token = d;
      n.propertyName = asName(p);
      n.name = asName(b);
      n.initializer = i;
      return n;
    }
    export function update(n: BindingElement, d: Dot3Token | undefined, p: PropertyName | undefined, b: BindingName, i?: Expression) {
      return n.propertyName !== p || n.dot3Token !== d || n.name !== b || n.initializer !== i ? updateNode(create(d, p, b, i), n) : n;
    }
    export function kind(n: Node): n is BindingElement {
      return n.kind === Syntax.BindingElement;
    }
  }

  function createMethodCall(object: Expression, methodName: string | Identifier, argumentsList: readonly Expression[]) {
    return createCall(createPropertyAccess(object, asName(methodName)), /*typeArguments*/ undefined, argumentsList);
  }

  function createGlobalMethodCall(globalObjectName: string, methodName: string, argumentsList: readonly Expression[]) {
    return createMethodCall(createIdentifier(globalObjectName), methodName, argumentsList);
  }

  export function createObjectDefinePropertyCall(target: Expression, propertyName: string | Expression, attributes: Expression) {
    return createGlobalMethodCall('Object', 'defineProperty', [target, asExpression(propertyName), attributes]);
  }

  function tryAddPropertyAssignment(ps: Push<PropertyAssignment>, p: string, e?: Expression) {
    if (e) {
      ps.push(createPropertyAssignment(p, e));
      return true;
    }
    return false;
  }

  export function createPropertyDescriptor(attributes: PropertyDescriptorAttributes, singleLine?: boolean) {
    const ps: PropertyAssignment[] = [];
    tryAddPropertyAssignment(ps, 'enumerable', asExpression(attributes.enumerable));
    tryAddPropertyAssignment(ps, 'configurable', asExpression(attributes.configurable));
    let isData = tryAddPropertyAssignment(ps, 'writable', asExpression(attributes.writable));
    isData = tryAddPropertyAssignment(ps, 'value', attributes.value) || isData;
    let isAccessor = tryAddPropertyAssignment(ps, 'get', attributes.get);
    isAccessor = tryAddPropertyAssignment(ps, 'set', attributes.set) || isAccessor;
    assert(!(isData && isAccessor), 'A PropertyDescriptor may not be both an accessor descriptor and a data descriptor.');
    return createObjectLiteral(ps, !singleLine);
  }

  export namespace SignatureDeclaration {
    export function create(k: Syntax, ts: readonly TypeParameterDeclaration[] | undefined, ps: readonly ParameterDeclaration[], t?: TypeNode, ta?: readonly TypeNode[]) {
      const n = Node.createSynthesized(k) as SignatureDeclaration;
      n.typeParameters = asNodeArray(ts);
      n.parameters = asNodeArray(ps);
      n.type = t;
      n.typeArguments = asNodeArray(ta);
      return n;
    }
    export function update<T extends SignatureDeclaration>(n: T, ts: NodeArray<TypeParameterDeclaration> | undefined, ps: NodeArray<ParameterDeclaration>, t?: TypeNode): T {
      return n.typeParameters !== ts || n.parameters !== ps || n.type !== t ? updateNode(create(n.kind, ts, ps, t) as T, n) : n;
    }
  }
}
