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

  /*
  let SymNames: { [P in keyof typeof SymKey]: { Name: P, Value: typeof SymKey[P] } } = {
    AAA: { Value: SymKey.AAA, Name: "AAA" },
    BBB: { Value: SymKey.BBB, Name: "BBB" },
    CCC: { Value: SymKey.CCC, Name: "CCC" },
    End: { Value: SymKey.End, Name: "End"}
  }
  type GN<C extends SymKey> = C extends keyof CMap ? CMap[C] : never;
  function create<C extends SymKey>(c: C): GN<C> {
    return QNode.create(c) as GN<C>;
  }
  function isKind<C extends SymKey, T extends { kind: C }>(n: GN<C>, t: T): n is GN<C> {
    return n.kind === t.kind;
  }
*/

  interface SynMap {
    [Syntax.Unknown]: Unknown;
    [Syntax.EndOfFileToken]: EndOfFileToken;
    [Syntax.SingleLineCommentTrivia]: SingleLineCommentTrivia;
    [Syntax.MultiLineCommentTrivia]: MultiLineCommentTrivia;
    [Syntax.NewLineTrivia]: NewLineTrivia;
    [Syntax.WhitespaceTrivia]: WhitespaceTrivia;

    [Syntax.ShebangTrivia]: ShebangTrivia;
    [Syntax.ConflictMarkerTrivia]: ConflictMarkerTrivia;
    [Syntax.NumericLiteral]: NumericLiteral;
    [Syntax.BigIntLiteral]: BigIntLiteral;
    [Syntax.StringLiteral]: StringLiteral;
    [Syntax.JsxText]: JsxText;
    [Syntax.JsxTextAllWhiteSpaces]: JsxTextAllWhiteSpaces;
    [Syntax.RegexLiteral]: RegexLiteral;
    [Syntax.NoSubstitutionLiteral]: NoSubstitutionLiteral;

    [Syntax.TemplateHead]: TemplateHead;
    [Syntax.TemplateMiddle]: TemplateMiddle;
    [Syntax.TemplateTail]: TemplateTail;

    [Syntax.OpenBraceToken]: OpenBraceToken;
    [Syntax.CloseBraceToken]: CloseBraceToken;
    [Syntax.OpenParenToken]: OpenParenToken;
    [Syntax.CloseParenToken]: CloseParenToken;
    [Syntax.OpenBracketToken]: OpenBracketToken;
    [Syntax.CloseBracketToken]: CloseBracketToken;
    [Syntax.DotToken]: DotToken;
    [Syntax.Dot3Token]: Dot3Token;
    [Syntax.SemicolonToken]: SemicolonToken;
    [Syntax.CommaToken]: CommaToken;
    [Syntax.QuestionDotToken]: QuestionDotToken;
    [Syntax.LessThanToken]: LessThanToken;
    [Syntax.LessThanSlashToken]: LessThanSlashToken;
    [Syntax.GreaterThanToken]: GreaterThanToken;
    [Syntax.LessThanEqualsToken]: LessThanEqualsToken;
    [Syntax.GreaterThanEqualsToken]: GreaterThanEqualsToken;
    [Syntax.Equals2Token]: Equals2Token;
    [Syntax.ExclamationEqualsToken]: ExclamationEqualsToken;
    [Syntax.Equals3Token]: Equals3Token;
    [Syntax.ExclamationEquals2Token]: ExclamationEquals2Token;
    [Syntax.EqualsGreaterThanToken]: EqualsGreaterThanToken;
    [Syntax.PlusToken]: PlusToken;
    [Syntax.MinusToken]: MinusToken;
    [Syntax.AsteriskToken]: AsteriskToken;
    [Syntax.Asterisk2Token]: Asterisk2Token;
    [Syntax.SlashToken]: SlashToken;
    [Syntax.PercentToken]: PercentToken;
    [Syntax.Plus2Token]: Plus2Token;
    [Syntax.Minus2Token]: Minus2Token;
    [Syntax.LessThan2Token]: LessThan2Token;
    [Syntax.GreaterThan2Token]: GreaterThan2Token;
    [Syntax.GreaterThan3Token]: GreaterThan3Token;
    [Syntax.AmpersandToken]: AmpersandToken;
    [Syntax.BarToken]: BarToken;
    [Syntax.CaretToken]: CaretToken;
    [Syntax.ExclamationToken]: ExclamationToken;
    [Syntax.TildeToken]: TildeToken;
    [Syntax.Ampersand2Token]: Ampersand2Token;
    [Syntax.Bar2Token]: Bar2Token;
    [Syntax.QuestionToken]: QuestionToken;
    [Syntax.ColonToken]: ColonToken;
    [Syntax.AtToken]: AtToken;
    [Syntax.Question2Token]: Question2Token;
    [Syntax.BacktickToken]: BacktickToken;

    [Syntax.EqualsToken]: EqualsToken;
    [Syntax.PlusEqualsToken]: PlusEqualsToken;
    [Syntax.MinusEqualsToken]: MinusEqualsToken;
    [Syntax.AsteriskEqualsToken]: AsteriskEqualsToken;
    [Syntax.Asterisk2EqualsToken]: Asterisk2EqualsToken;
    [Syntax.SlashEqualsToken]: SlashEqualsToken;
    [Syntax.PercentEqualsToken]: PercentEqualsToken;
    [Syntax.LessThan2EqualsToken]: LessThan2EqualsToken;
    [Syntax.GreaterThan2EqualsToken]: GreaterThan2EqualsToken;
    [Syntax.GreaterThan3EqualsToken]: GreaterThan3EqualsToken;
    [Syntax.AmpersandEqualsToken]: AmpersandEqualsToken;
    [Syntax.BarEqualsToken]: BarEqualsToken;
    [Syntax.CaretEqualsToken]: CaretEqualsToken;

    [Syntax.Identifier]: Identifier;
    [Syntax.PrivateIdentifier]: PrivateIdentifier;

    [Syntax.BreakKeyword]: BreakKeyword;
    [Syntax.CaseKeyword]: CaseKeyword;
    [Syntax.CatchKeyword]: CatchKeyword;
    [Syntax.ClassKeyword]: ClassKeyword;
    [Syntax.ConstKeyword]: ConstKeyword;
    [Syntax.ContinueKeyword]: ContinueKeyword;
    [Syntax.DebuggerKeyword]: DebuggerKeyword;
    [Syntax.DefaultKeyword]: DefaultKeyword;
    [Syntax.DeleteKeyword]: DeleteKeyword;
    [Syntax.DoKeyword]: DoKeyword;
    [Syntax.ElseKeyword]: ElseKeyword;
    [Syntax.EnumKeyword]: EnumKeyword;
    [Syntax.ExportKeyword]: ExportKeyword;
    [Syntax.ExtendsKeyword]: ExtendsKeyword;
    [Syntax.FalseKeyword]: FalseKeyword;
    [Syntax.FinallyKeyword]: FinallyKeyword;
    [Syntax.ForKeyword]: ForKeyword;
    [Syntax.FunctionKeyword]: FunctionKeyword;
    [Syntax.IfKeyword]: IfKeyword;
    [Syntax.ImportKeyword]: ImportKeyword;
    [Syntax.InKeyword]: InKeyword;
    [Syntax.InstanceOfKeyword]: InstanceOfKeyword;
    [Syntax.NewKeyword]: NewKeyword;
    [Syntax.NullKeyword]: NullKeyword;
    [Syntax.ReturnKeyword]: ReturnKeyword;
    [Syntax.SuperKeyword]: SuperKeyword;
    [Syntax.SwitchKeyword]: SwitchKeyword;
    [Syntax.ThisKeyword]: ThisKeyword;
    [Syntax.ThrowKeyword]: ThrowKeyword;
    [Syntax.TrueKeyword]: TrueKeyword;
    [Syntax.TryKeyword]: TryKeyword;
    [Syntax.TypeOfKeyword]: TypeOfKeyword;
    [Syntax.VarKeyword]: VarKeyword;
    [Syntax.VoidKeyword]: VoidKeyword;
    [Syntax.WhileKeyword]: WhileKeyword;
    [Syntax.WithKeyword]: WithKeyword;

    [Syntax.ImplementsKeyword]: ImplementsKeyword;
    [Syntax.InterfaceKeyword]: InterfaceKeyword;
    [Syntax.LetKeyword]: LetKeyword;
    [Syntax.PackageKeyword]: PackageKeyword;
    [Syntax.PrivateKeyword]: PrivateKeyword;
    [Syntax.ProtectedKeyword]: ProtectedKeyword;
    [Syntax.PublicKeyword]: PublicKeyword;
    [Syntax.StaticKeyword]: StaticKeyword;
    [Syntax.YieldKeyword]: YieldKeyword;

    [Syntax.AbstractKeyword]: AbstractKeyword;
    [Syntax.AsKeyword]: AsKeyword;
    [Syntax.AssertsKeyword]: AssertsKeyword;
    [Syntax.AnyKeyword]: AnyKeyword;
    [Syntax.AsyncKeyword]: AsyncKeyword;
    [Syntax.AwaitKeyword]: AwaitKeyword;
    [Syntax.BooleanKeyword]: BooleanKeyword;
    [Syntax.ConstructorKeyword]: ConstructorKeyword;
    [Syntax.DeclareKeyword]: DeclareKeyword;
    [Syntax.GetKeyword]: GetKeyword;
    [Syntax.InferKeyword]: InferKeyword;
    [Syntax.IsKeyword]: IsKeyword;
    [Syntax.KeyOfKeyword]: KeyOfKeyword;
    [Syntax.ModuleKeyword]: ModuleKeyword;
    [Syntax.NamespaceKeyword]: NamespaceKeyword;
    [Syntax.NeverKeyword]: NeverKeyword;
    [Syntax.ReadonlyKeyword]: ReadonlyKeyword;
    [Syntax.RequireKeyword]: RequireKeyword;
    [Syntax.NumberKeyword]: NumberKeyword;
    [Syntax.ObjectKeyword]: ObjectKeyword;
    [Syntax.SetKeyword]: SetKeyword;
    [Syntax.StringKeyword]: StringKeyword;
    [Syntax.SymbolKeyword]: SymbolKeyword;
    [Syntax.TypeKeyword]: TypeKeyword;
    [Syntax.UndefinedKeyword]: UndefinedKeyword;
    [Syntax.UniqueKeyword]: UniqueKeyword;
    [Syntax.UnknownKeyword]: UnknownKeyword;
    [Syntax.FromKeyword]: FromKeyword;
    [Syntax.GlobalKeyword]: GlobalKeyword;
    [Syntax.BigIntKeyword]: BigIntKeyword;
    [Syntax.OfKeyword]: OfKeyword;

    [Syntax.QualifiedName]: QualifiedName;
    [Syntax.ComputedPropertyName]: ComputedPropertyName;

    [Syntax.TypeParameter]: TypeParameter;
    [Syntax.Parameter]: Parameter;
    [Syntax.Decorator]: Decorator;

    [Syntax.PropertySignature]: PropertySignature;
    [Syntax.PropertyDeclaration]: PropertyDeclaration;
    [Syntax.MethodSignature]: MethodSignature;
    [Syntax.MethodDeclaration]: MethodDeclaration;
    [Syntax.Constructor]: Constructor;
    [Syntax.GetAccessor]: GetAccessor;
    [Syntax.SetAccessor]: SetAccessor;
    [Syntax.CallSignature]: CallSignature;
    [Syntax.ConstructSignature]: ConstructSignature;
    [Syntax.IndexSignature]: IndexSignature;

    [Syntax.TypePredicate]: TypePredicate;
    [Syntax.TypeReference]: TypeReference;
    [Syntax.FunctionType]: FunctionType;
    [Syntax.ConstructorType]: ConstructorType;
    [Syntax.TypeQuery]: TypeQuery;
    [Syntax.TypeLiteral]: TypeLiteral;
    [Syntax.ArrayType]: ArrayType;
    [Syntax.TupleType]: TupleType;
    [Syntax.OptionalType]: OptionalType;
    [Syntax.RestType]: RestType;
    [Syntax.UnionType]: UnionType;
    [Syntax.IntersectionType]: IntersectionType;
    [Syntax.ConditionalType]: ConditionalType;
    [Syntax.InferType]: InferType;
    [Syntax.ParenthesizedType]: ParenthesizedType;
    [Syntax.ThisType]: ThisType;
    [Syntax.TypeOperator]: TypeOperator;
    [Syntax.IndexedAccessType]: IndexedAccessType;
    [Syntax.MappedType]: MappedType;
    [Syntax.LiteralType]: LiteralType;
    [Syntax.NamedTupleMember]: NamedTupleMember;
    [Syntax.ImportType]: ImportType;

    [Syntax.ObjectBindingPattern]: ObjectBindingPattern;
    [Syntax.ArrayBindingPattern]: ArrayBindingPattern;
    [Syntax.BindingElement]: BindingElement;

    [Syntax.ArrayLiteralExpression]: ArrayLiteralExpression;
    [Syntax.ObjectLiteralExpression]: ObjectLiteralExpression;
    [Syntax.PropertyAccessExpression]: PropertyAccessExpression;
    [Syntax.ElementAccessExpression]: ElementAccessExpression;
    [Syntax.CallExpression]: CallExpression;
    [Syntax.NewExpression]: NewExpression;
    [Syntax.TaggedTemplateExpression]: TaggedTemplateExpression;
    [Syntax.TypeAssertionExpression]: TypeAssertionExpression;
    [Syntax.ParenthesizedExpression]: ParenthesizedExpression;
    [Syntax.FunctionExpression]: FunctionExpression;
    [Syntax.ArrowFunction]: ArrowFunction;
    [Syntax.DeleteExpression]: DeleteExpression;
    [Syntax.TypeOfExpression]: TypeOfExpression;
    [Syntax.VoidExpression]: VoidExpression;
    [Syntax.AwaitExpression]: AwaitExpression;
    [Syntax.PrefixUnaryExpression]: PrefixUnaryExpression;
    [Syntax.PostfixUnaryExpression]: PostfixUnaryExpression;
    [Syntax.BinaryExpression]: BinaryExpression;
    [Syntax.ConditionalExpression]: ConditionalExpression;
    [Syntax.TemplateExpression]: TemplateExpression;
    [Syntax.YieldExpression]: YieldExpression;
    [Syntax.SpreadElement]: SpreadElement;
    [Syntax.ClassExpression]: ClassExpression;
    [Syntax.OmittedExpression]: OmittedExpression;
    [Syntax.ExpressionWithTypeArguments]: ExpressionWithTypeArguments;
    [Syntax.AsExpression]: AsExpression;
    [Syntax.NonNullExpression]: NonNullExpression;
    [Syntax.MetaProperty]: MetaProperty;
    [Syntax.SyntheticExpression]: SyntheticExpression;

    [Syntax.TemplateSpan]: TemplateSpan;
    [Syntax.SemicolonClassElement]: SemicolonClassElement;

    [Syntax.Block]: Block;
    [Syntax.EmptyStatement]: EmptyStatement;
    [Syntax.VariableStatement]: VariableStatement;
    [Syntax.ExpressionStatement]: ExpressionStatement;
    [Syntax.IfStatement]: IfStatement;
    [Syntax.DoStatement]: DoStatement;
    [Syntax.WhileStatement]: WhileStatement;
    [Syntax.ForStatement]: ForStatement;
    [Syntax.ForInStatement]: ForInStatement;
    [Syntax.ForOfStatement]: ForOfStatement;
    [Syntax.ContinueStatement]: ContinueStatement;
    [Syntax.BreakStatement]: BreakStatement;
    [Syntax.ReturnStatement]: ReturnStatement;
    [Syntax.WithStatement]: WithStatement;
    [Syntax.SwitchStatement]: SwitchStatement;
    [Syntax.LabeledStatement]: LabeledStatement;
    [Syntax.ThrowStatement]: ThrowStatement;
    [Syntax.TryStatement]: TryStatement;
    [Syntax.DebuggerStatement]: DebuggerStatement;
    [Syntax.VariableDeclaration]: VariableDeclaration;
    [Syntax.VariableDeclarationList]: VariableDeclarationList;
    [Syntax.FunctionDeclaration]: FunctionDeclaration;
    [Syntax.ClassDeclaration]: ClassDeclaration;
    [Syntax.InterfaceDeclaration]: InterfaceDeclaration;
    [Syntax.TypeAliasDeclaration]: TypeAliasDeclaration;
    [Syntax.EnumDeclaration]: EnumDeclaration;
    [Syntax.ModuleDeclaration]: ModuleDeclaration;
    [Syntax.ModuleBlock]: ModuleBlock;
    [Syntax.CaseBlock]: CaseBlock;
    [Syntax.NamespaceExportDeclaration]: NamespaceExportDeclaration;
    [Syntax.ImportEqualsDeclaration]: ImportEqualsDeclaration;
    [Syntax.ImportDeclaration]: ImportDeclaration;
    [Syntax.ImportClause]: ImportClause;
    [Syntax.NamespaceImport]: NamespaceImport;
    [Syntax.NamedImports]: NamedImports;
    [Syntax.ImportSpecifier]: ImportSpecifier;
    [Syntax.ExportAssignment]: ExportAssignment;
    [Syntax.ExportDeclaration]: ExportDeclaration;
    [Syntax.NamedExports]: NamedExports;
    [Syntax.NamespaceExport]: NamespaceExport;
    [Syntax.ExportSpecifier]: ExportSpecifier;
    [Syntax.MissingDeclaration]: MissingDeclaration;

    [Syntax.ExternalModuleReference]: ExternalModuleReference;

    [Syntax.JsxElement]: JsxElement;
    [Syntax.JsxSelfClosingElement]: JsxSelfClosingElement;
    [Syntax.JsxOpeningElement]: JsxOpeningElement;
    [Syntax.JsxClosingElement]: JsxClosingElement;
    [Syntax.JsxFragment]: JsxFragment;
    [Syntax.JsxOpeningFragment]: JsxOpeningFragment;
    [Syntax.JsxClosingFragment]: JsxClosingFragment;
    [Syntax.JsxAttribute]: JsxAttribute;
    [Syntax.JsxAttributes]: JsxAttributes;
    [Syntax.JsxSpreadAttribute]: JsxSpreadAttribute;
    [Syntax.JsxExpression]: JsxExpression;

    [Syntax.CaseClause]: CaseClause;
    [Syntax.DefaultClause]: DefaultClause;
    [Syntax.HeritageClause]: HeritageClause;
    [Syntax.CatchClause]: CatchClause;

    [Syntax.PropertyAssignment]: PropertyAssignment;
    [Syntax.ShorthandPropertyAssignment]: ShorthandPropertyAssignment;
    [Syntax.SpreadAssignment]: SpreadAssignment;

    [Syntax.EnumMember]: EnumMember;

    [Syntax.UnparsedPrologue]: UnparsedPrologue;
    [Syntax.UnparsedPrepend]: UnparsedPrepend;
    [Syntax.UnparsedText]: UnparsedText;
    [Syntax.UnparsedInternalText]: UnparsedInternalText;
    [Syntax.UnparsedSyntheticReference]: UnparsedSyntheticReference;

    [Syntax.SourceFile]: SourceFile;
    [Syntax.Bundle]: Bundle;
    [Syntax.UnparsedSource]: UnparsedSource;
    [Syntax.InputFiles]: InputFiles;

    [Syntax.JSDocTypeExpression]: JSDocTypeExpression;
    [Syntax.JSDocAllType]: JSDocAllType;

    [Syntax.JSDocUnknownType]: JSDocUnknownType;
    [Syntax.JSDocNullableType]: JSDocNullableType;
    [Syntax.JSDocNonNullableType]: JSDocNonNullableType;
    [Syntax.JSDocOptionalType]: JSDocOptionalType;
    [Syntax.JSDocFunctionType]: JSDocFunctionType;
    [Syntax.JSDocVariadicType]: JSDocVariadicType;

    [Syntax.JSDocNamepathType]: JSDocNamepathType;
    [Syntax.JSDocComment]: JSDocComment;
    [Syntax.JSDocTypeLiteral]: JSDocTypeLiteral;
    [Syntax.JSDocSignature]: JSDocSignature;
    [Syntax.JSDocTag]: JSDocTag;
    [Syntax.JSDocAugmentsTag]: JSDocAugmentsTag;
    [Syntax.JSDocImplementsTag]: JSDocImplementsTag;
    [Syntax.JSDocAuthorTag]: JSDocAuthorTag;
    [Syntax.JSDocClassTag]: JSDocClassTag;
    [Syntax.JSDocPublicTag]: JSDocPublicTag;
    [Syntax.JSDocPrivateTag]: JSDocPrivateTag;
    [Syntax.JSDocProtectedTag]: JSDocProtectedTag;
    [Syntax.JSDocReadonlyTag]: JSDocReadonlyTag;
    [Syntax.JSDocCallbackTag]: JSDocCallbackTag;
    [Syntax.JSDocEnumTag]: JSDocEnumTag;
    [Syntax.JSDocParameterTag]: JSDocParameterTag;
    [Syntax.JSDocReturnTag]: JSDocReturnTag;
    [Syntax.JSDocThisTag]: JSDocThisTag;
    [Syntax.JSDocTypeTag]: JSDocTypeTag;
    [Syntax.JSDocTemplateTag]: JSDocTemplateTag;
    [Syntax.JSDocTypedefTag]: JSDocTypedefTag;
    [Syntax.JSDocPropertyTag]: JSDocPropertyTag;

    [Syntax.SyntaxList]: SyntaxList;

    [Syntax.NotEmittedStatement]: NotEmittedStatement;
    [Syntax.PartiallyEmittedExpression]: PartiallyEmittedExpression;
    [Syntax.CommaListExpression]: CommaListExpression;
    [Syntax.MergeDeclarationMarker]: MergeDeclarationMarker;
    [Syntax.EndOfDeclarationMarker]: EndOfDeclarationMarker;
    [Syntax.SyntheticReferenceExpression]: SyntheticReferenceExpression;

    [Syntax.Count]: Count;
  }

  export namespace Node {
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

    function isNode(n: Node) {
      return isNodeKind(n.kind);
    }
    function isNodeKind(k: Syntax) {
      return k >= Syntax.FirstNode;
    }

    export function createNode(k: Syntax, pos?: number, end?: number): Node {
      if (k === Syntax.SourceFile) return new (SourceFileC || (SourceFileC = objectAllocator.getSourceFileConstructor()))(k, pos, end);
      if (k === Syntax.Identifier) return new (IdentifierC || (IdentifierC = objectAllocator.getIdentifierConstructor()))(k, pos, end);
      if (k === Syntax.PrivateIdentifier) return new (PrivateIdentifierC || (PrivateIdentifierC = objectAllocator.getPrivateIdentifierConstructor()))(k, pos, end);
      if (!isNodeKind(k)) return new (TokenC || (TokenC = objectAllocator.getTokenConstructor()))(k, pos, end);
      return new (NodeC || (NodeC = objectAllocator.getNodeConstructor()))(k, pos, end);
    }

    let NodeC: new <T extends Node>(k: Syntax, pos: number, end: number) => T;
    let TokenC: new <T extends Node>(k: Syntax, pos: number, end: number) => T;
    let IdentifierC: new <T extends Node>(k: Syntax.Identifier, pos: number, end: number) => T;
    let PrivateIdentifierC: new <T extends Node>(k: Syntax.PrivateIdentifier, pos: number, end: number) => T;
    let SourceFileC: new (kind: Syntax.SourceFile, pos: number, end: number) => Node;

    const kind = Syntax.Unknown;

    export function createNode(k: Syntax, pos?: number, end?: number): Node {
      return isNodeKind(k) || k === Syntax.Unknown
        ? new NodeC<T>(k, p, p)
        : k === Syntax.Identifier
        ? new IdentifierC<T>(k, p, p)
        : k === Syntax.PrivateIdentifier
        ? new PrivateIdentifierC<T>(k, p, p)
        : new TokenC<T>(k, p, p);
    }

    function createNode<TKind extends Syntax>(kind: TKind, pos: number, end: number, parent: Node): NodeObj | TokenObj<TKind> | IdentifierObj | PrivateIdentifierObj {
      const node = isNodeKind(kind)
        ? new NodeObj(kind, pos, end)
        : kind === Syntax.Identifier
        ? new IdentifierObj(Syntax.Identifier, pos, end)
        : kind === Syntax.PrivateIdentifier
        ? new PrivateIdentifierObj(Syntax.PrivateIdentifier, pos, end)
        : new TokenObj(kind, pos, end);
      node.parent = parent;
      node.flags = parent.flags & NodeFlags.ContextFlags;
      return node;
    }

    export class NodeObj implements Node {
      id = 0;
      flags = NodeFlags.None;
      modifierFlagsCache = ModifierFlags.None;
      transformFlags = TransformFlags.None;
      parent!: Node;
      symbol!: Symbol;
      jsDoc?: JSDoc[];
      original?: Node;
      private _children: Node[] | undefined;

      constructor(public kind: Syntax, public pos: number, public end: number) {}

      private assertHasRealPosition(message?: string) {
        assert(!positionIsSynthesized(this.pos) && !positionIsSynthesized(this.end), message || 'Node must have a real position for this operation');
      }
      getSourceFile(): SourceFile {
        return getSourceFileOfNode(this);
      }
      public getStart(s?: SourceFileLike, includeJsDocComment?: boolean): number {
        this.assertHasRealPosition();
        return getTokenPosOfNode(this, s, includeJsDocComment);
      }
      public getFullStart(): number {
        this.assertHasRealPosition();
        return this.pos;
      }
      public getEnd(): number {
        this.assertHasRealPosition();
        return this.end;
      }
      public getWidth(s?: SourceFile): number {
        this.assertHasRealPosition();
        return this.getEnd() - this.getStart(s);
      }
      public getFullWidth(): number {
        this.assertHasRealPosition();
        return this.end - this.pos;
      }
      public getLeadingTriviaWidth(s?: SourceFile): number {
        this.assertHasRealPosition();
        return this.getStart(s) - this.pos;
      }
      public getFullText(s?: SourceFile): string {
        this.assertHasRealPosition();
        return (s || this.getSourceFile()).text.substring(this.pos, this.end);
      }
      public getText(s?: SourceFile): string {
        this.assertHasRealPosition();
        if (!s) s = this.getSourceFile();
        return s.text.substring(this.getStart(s), this.getEnd());
      }
      public getChildCount(s?: SourceFile): number {
        return this.getChildren(s).length;
      }
      public getChildAt(i: number, s?: SourceFile): Node {
        return this.getChildren(s)[i];
      }
      public getChildren(s?: SourceFileLike): Node[] {
        this.assertHasRealPosition("Node without a real position cannot be scanned and thus has no token nodes - use forEachChild and collect the result if that's fine");
        return this._children || (this._children = createChildren(this, s));
      }
      public getFirstToken(s?: SourceFileLike): Node | undefined {
        this.assertHasRealPosition();
        const cs = this.getChildren(s);
        if (!cs.length) return;
        const c = find(cs, (c) => c.kind < Syntax.FirstJSDocNode || c.kind > Syntax.LastJSDocNode)!;
        return c.kind < Syntax.FirstNode ? c : c.getFirstToken(s);
      }
      public getLastToken(s?: SourceFileLike): Node | undefined {
        this.assertHasRealPosition();
        const cs = this.getChildren(s);
        const c = lastOrUndefined(cs);
        if (!c) return;
        return c.kind < Syntax.FirstNode ? c : c.getLastToken(s);
      }

      public forEachChild<T>(cbNode: (n: Node) => T, cbNodeArray?: (ns: NodeArray<Node>) => T): T | undefined {
        return forEachChild(this, cbNode, cbNodeArray);
      }
    }

    function createChildren(n: Node, s: SourceFileLike | undefined): Node[] {
      if (!isNodeKind(n.kind)) return emptyArray;
      const cs: Node[] = [];
      if (isJSDocCommentContainingNode(n)) {
        n.forEachChild((c) => {
          cs.push(c);
        });
        return cs;
      }
      scanner.setText((s || n.getSourceFile()).text);
      let pos = n.pos;
      const processNode = (c: Node) => {
        addSyntheticNodes(cs, pos, c.pos, n);
        cs.push(c);
        pos = c.end;
      };
      const processNodes = (ns: NodeArray<Node>) => {
        addSyntheticNodes(cs, pos, ns.pos, n);
        cs.push(createSyntaxList(ns, n));
        pos = ns.end;
      };
      forEach((n as JSDocContainer).jsDoc, processNode);
      pos = n.pos;
      n.forEachChild(processNode, processNodes);
      addSyntheticNodes(cs, pos, n.end, n);
      scanner.setText(undefined);
      return cs;
    }

    function addSyntheticNodes(ns: Push<Node>, pos: number, end: number, parent: Node): void {
      scanner.setTextPos(pos);
      while (pos < end) {
        const token = scanner.scan();
        const textPos = scanner.getTextPos();
        if (textPos <= end) {
          if (token === Syntax.Identifier) fail(`Did not expect ${Debug.formatSyntaxKind(parent.kind)} to have an Identifier in its trivia`);
          ns.push(createNode(token, pos, textPos, parent));
        }
        pos = textPos;
        if (token === Syntax.EndOfFileToken) break;
      }
    }

    function createSyntaxList(ns: NodeArray<Node>, parent: Node): Node {
      const list = (createNode(Syntax.SyntaxList, ns.pos, ns.end, parent) as any) as SyntaxList;
      list._children = [];
      let pos = ns.pos;
      for (const n of ns) {
        addSyntheticNodes(list._children, pos, n.pos, parent);
        list._children.push(n);
        pos = n.end;
      }
      addSyntheticNodes(list._children, pos, ns.end, parent);
      return list;
    }

    class TokenOrIdentifierObj implements Node {
      id = 0;
      kind!: Syntax;
      flags = NodeFlags.None;
      modifierFlagsCache = ModifierFlags.None;
      transformFlags = TransformFlags.None;
      parent!: Node;
      symbol!: Symbol;
      jsDocComments?: JSDoc[];

      constructor(public pos: number, public end: number) {}

      public getSourceFile(): SourceFile {
        return getSourceFileOfNode(this);
      }
      public getStart(s?: SourceFileLike, includeJsDocComment?: boolean): number {
        return getTokenPosOfNode(this, s, includeJsDocComment);
      }

      public getFullStart(): number {
        return this.pos;
      }

      public getEnd(): number {
        return this.end;
      }

      public getWidth(s?: SourceFile): number {
        return this.getEnd() - this.getStart(s);
      }

      public getFullWidth(): number {
        return this.end - this.pos;
      }

      public getLeadingTriviaWidth(s?: SourceFile): number {
        return this.getStart(s) - this.pos;
      }

      public getFullText(s?: SourceFile): string {
        return (s || this.getSourceFile()).text.substring(this.pos, this.end);
      }

      public getText(s?: SourceFile): string {
        if (!s) {
          s = this.getSourceFile();
        }
        return s.text.substring(this.getStart(s), this.getEnd());
      }

      public getChildCount(): number {
        return 0;
      }

      public getChildAt(): Node {
        return undefined!; // TODO: GH#18217
      }

      public getChildren(): Node[] {
        return this.kind === Syntax.EndOfFileToken ? (this as EndOfFileToken).jsDoc || emptyArray : emptyArray;
      }

      public getFirstToken(): Node | undefined {
        return undefined;
      }

      public getLastToken(): Node | undefined {
        return undefined;
      }

      public forEachChild<T>(): T | undefined {
        return undefined;
      }
    }

    export class SymbolObj implements Symbol {
      declarations!: Declaration[];
      valueDeclaration!: Declaration;
      documentationComment?: SymbolDisplayPart[];
      contextualGetAccessorDocumentationComment?: SymbolDisplayPart[];
      contextualSetAccessorDocumentationComment?: SymbolDisplayPart[];
      tags?: JSDocTagInfo[];

      constructor(public flags: SymbolFlags, public escapedName: __String) {}

      getFlags(): SymbolFlags {
        return this.flags;
      }
      get name(): string {
        return symbolName(this);
      }
      getEscapedName(): __String {
        return this.escapedName;
      }
      getName(): string {
        return this.name;
      }
      getDeclarations(): Declaration[] | undefined {
        return this.declarations;
      }
      getDocumentationComment(checker: TypeChecker | undefined): SymbolDisplayPart[] {
        if (!this.documentationComment) {
          this.documentationComment = emptyArray; // Set temporarily to avoid an infinite loop finding inherited docs

          if (!this.declarations && ((this as Symbol) as TransientSymbol).target && (((this as Symbol) as TransientSymbol).target as TransientSymbol).tupleLabelDeclaration) {
            const labelDecl = (((this as Symbol) as TransientSymbol).target as TransientSymbol).tupleLabelDeclaration!;
            this.documentationComment = getDocumentationComment([labelDecl], checker);
          } else {
            this.documentationComment = getDocumentationComment(this.declarations, checker);
          }
        }
        return this.documentationComment;
      }
      getContextualDocumentationComment(context: Node | undefined, checker: TypeChecker | undefined): SymbolDisplayPart[] {
        switch (context?.kind) {
          case Syntax.GetAccessor:
            if (!this.contextualGetAccessorDocumentationComment) {
              this.contextualGetAccessorDocumentationComment = emptyArray;
              this.contextualGetAccessorDocumentationComment = getDocumentationComment(filter(this.declarations, isGetAccessor), checker);
            }
            return this.contextualGetAccessorDocumentationComment;
          case Syntax.SetAccessor:
            if (!this.contextualSetAccessorDocumentationComment) {
              this.contextualSetAccessorDocumentationComment = emptyArray;
              this.contextualSetAccessorDocumentationComment = getDocumentationComment(filter(this.declarations, isSetAccessor), checker);
            }
            return this.contextualSetAccessorDocumentationComment;
          default:
            return this.getDocumentationComment(checker);
        }
      }
      getJsDocTags(): JSDocTagInfo[] {
        if (this.tags === undefined) this.tags = JsDoc.getJsDocTagsFromDeclarations(this.declarations);
        return this.tags;
      }
    }

    export class TokenObj<TKind extends Syntax> extends TokenOrIdentifierObj implements Token<TKind> {
      constructor(public kind: TKind, pos: number, end: number) {
        super(pos, end);
      }
    }

    export class IdentifierObj extends TokenOrIdentifierObj implements Identifier {
      kind: Syntax.Identifier = Syntax.Identifier;
      escapedText!: __String;
      autoGenerateFlags!: GeneratedIdentifierFlags;
      _primaryExpressionBrand: any;
      _memberExpressionBrand: any;
      _leftHandSideExpressionBrand: any;
      _updateExpressionBrand: any;
      _unaryExpressionBrand: any;
      _expressionBrand: any;
      _declarationBrand: any;
      typeArguments!: NodeArray<TypeNode>;
      original = undefined;
      flowNode = undefined;
      constructor(_: Syntax.Identifier, pos: number, end: number) {
        super(pos, end);
      }
      get text(): string {
        return idText(this);
      }
    }
    IdentifierObj.prototype.kind = Syntax.Identifier;

    export class PrivateIdentifierObj extends TokenOrIdentifierObj implements PrivateIdentifier {
      kind: Syntax.PrivateIdentifier = Syntax.PrivateIdentifier;
      escapedText!: __String;
      symbol!: Symbol;
      constructor(_: Syntax.PrivateIdentifier, pos: number, end: number) {
        super(pos, end);
      }
      get text(): string {
        return idText(this);
      }
    }
    PrivateIdentifierObj.prototype.kind = Syntax.PrivateIdentifier;

    export class TypeObj implements Type {
      objectFlags?: ObjectFlags;
      id!: number;
      symbol!: Symbol;
      constructor(public checker: TypeChecker, public flags: TypeFlags) {}
      getFlags(): TypeFlags {
        return this.flags;
      }
      getSymbol(): Symbol | undefined {
        return this.symbol;
      }
      getProperties(): Symbol[] {
        return this.checker.getPropertiesOfType(this);
      }
      getProperty(propertyName: string): Symbol | undefined {
        return this.checker.getPropertyOfType(this, propertyName);
      }
      getApparentProperties(): Symbol[] {
        return this.checker.getAugmentedPropertiesOfType(this);
      }
      getCallSignatures(): readonly Signature[] {
        return this.checker.getSignaturesOfType(this, SignatureKind.Call);
      }
      getConstructSignatures(): readonly Signature[] {
        return this.checker.getSignaturesOfType(this, SignatureKind.Construct);
      }
      getStringIndexType(): Type | undefined {
        return this.checker.getIndexTypeOfType(this, IndexKind.String);
      }
      getNumberIndexType(): Type | undefined {
        return this.checker.getIndexTypeOfType(this, IndexKind.Number);
      }
      getBaseTypes(): BaseType[] | undefined {
        return this.isClassOrInterface() ? this.checker.getBaseTypes(this) : undefined;
      }
      isNullableType(): boolean {
        return this.checker.isNullableType(this);
      }
      getNonNullableType(): Type {
        return this.checker.getNonNullableType(this);
      }
      getNonOptionalType(): Type {
        return this.checker.getNonOptionalType(this);
      }
      getConstraint(): Type | undefined {
        return this.checker.getBaseConstraintOfType(this);
      }
      getDefault(): Type | undefined {
        return this.checker.getDefaultFromTypeParameter(this);
      }
      isUnion(): this is UnionType {
        return !!(this.flags & TypeFlags.Union);
      }
      isIntersection(): this is IntersectionType {
        return !!(this.flags & TypeFlags.Intersection);
      }
      isUnionOrIntersection(): this is UnionOrIntersectionType {
        return !!(this.flags & TypeFlags.UnionOrIntersection);
      }
      isLiteral(): this is LiteralType {
        return !!(this.flags & TypeFlags.StringOrNumberLiteral);
      }
      isStringLiteral(): this is StringLiteralType {
        return !!(this.flags & TypeFlags.StringLiteral);
      }
      isNumberLiteral(): this is NumberLiteralType {
        return !!(this.flags & TypeFlags.NumberLiteral);
      }
      isTypeParameter(): this is TypeParameter {
        return !!(this.flags & TypeFlags.TypeParameter);
      }
      isClassOrInterface(): this is InterfaceType {
        return !!(getObjectFlags(this) & ObjectFlags.ClassOrInterface);
      }
      isClass(): this is InterfaceType {
        return !!(getObjectFlags(this) & ObjectFlags.Class);
      }
      /**
       * This polyfills `referenceType.typeArguments` for API consumers
       */
      get typeArguments() {
        if (getObjectFlags(this) & ObjectFlags.Reference) {
          return this.checker.getTypeArguments((this as Type) as TypeReference);
        }
        return undefined;
      }
    }

    export class SignatureObj implements Signature {
      declaration!: SignatureDeclaration;
      typeParameters?: TypeParameter[];
      parameters!: Symbol[];
      thisParameter!: Symbol;
      resolvedReturnType!: Type;
      resolvedTypePredicate: TypePredicate | undefined;
      minTypeArgumentCount!: number;
      minArgumentCount!: number;
      documentationComment?: SymbolDisplayPart[];
      jsDocTags?: JSDocTagInfo[];

      constructor(public checker: TypeChecker, public flags: SignatureFlags) {}
      getDeclaration(): SignatureDeclaration {
        return this.declaration;
      }
      getTypeParameters(): TypeParameter[] | undefined {
        return this.typeParameters;
      }
      getParameters(): Symbol[] {
        return this.parameters;
      }
      getReturnType(): Type {
        return this.checker.getReturnTypeOfSignature(this);
      }
      getDocumentationComment(): SymbolDisplayPart[] {
        return this.documentationComment || (this.documentationComment = getDocumentationComment(singleElementArray(this.declaration), this.checker));
      }
      getJsDocTags(): JSDocTagInfo[] {
        if (this.jsDocTags === undefined) {
          this.jsDocTags = this.declaration ? JsDoc.getJsDocTagsFromDeclarations([this.declaration]) : [];
        }
        return this.jsDocTags;
      }
    }

    function hasJSDocInheritDocTag(node: Node) {
      return getJSDocTags(node).some((tag) => tag.tagName.text === 'inheritDoc');
    }

    function getDocumentationComment(declarations: readonly Declaration[] | undefined, checker: TypeChecker | undefined): SymbolDisplayPart[] {
      if (!declarations) return emptyArray;

      let doc = JsDoc.getJsDocCommentsFromDeclarations(declarations);
      if (doc.length === 0 || declarations.some(hasJSDocInheritDocTag)) {
        forEachUnique(declarations, (declaration) => {
          const inheritedDocs = findInheritedJSDocComments(declaration, declaration.symbol.name, checker!); // TODO: GH#18217
          // TODO: GH#16312 Return a ReadonlyArray, avoid copying inheritedDocs
          if (inheritedDocs) doc = doc.length === 0 ? inheritedDocs.slice() : inheritedDocs.concat(lineBreakPart(), doc);
        });
      }
      return doc;
    }

    function findInheritedJSDocComments(declaration: Declaration, propertyName: string, typeChecker: TypeChecker): readonly SymbolDisplayPart[] | undefined {
      return firstDefined(declaration.parent ? getAllSuperTypeNodes(declaration.parent) : emptyArray, (superTypeNode) => {
        const superType = typeChecker.getTypeAtLocation(superTypeNode);
        const baseProperty = superType && typeChecker.getPropertyOfType(superType, propertyName);
        const inheritedDocs = baseProperty && baseProperty.getDocumentationComment(typeChecker);
        return inheritedDocs && inheritedDocs.length ? inheritedDocs : undefined;
      });
    }

    export class SourceFileObj extends NodeObj implements SourceFile {
      public kind: Syntax.SourceFile = Syntax.SourceFile;
      public _declarationBrand: any;
      public fileName!: string;
      public path!: Path;
      public resolvedPath!: Path;
      public originalFileName!: string;
      public text!: string;
      public scriptSnapshot!: IScriptSnapshot;
      public lineMap!: readonly number[];

      public statements!: NodeArray<Statement>;
      public endOfFileToken!: Token<Syntax.EndOfFileToken>;

      public amdDependencies!: { name: string; path: string }[];
      public moduleName!: string;
      public referencedFiles!: FileReference[];
      public typeReferenceDirectives!: FileReference[];
      public libReferenceDirectives!: FileReference[];

      public syntacticDiagnostics!: DiagnosticWithLocation[];
      public parseDiagnostics!: DiagnosticWithLocation[];
      public bindDiagnostics!: DiagnosticWithLocation[];
      public bindSuggestionDiagnostics?: DiagnosticWithLocation[];

      public isDeclarationFile!: boolean;
      public isDefaultLib!: boolean;
      public hasNoDefaultLib!: boolean;
      public externalModuleIndicator!: Node; // The first node that causes this file to be an external module
      public commonJsModuleIndicator!: Node; // The first node that causes this file to be a CommonJS module
      public nodeCount!: number;
      public identifierCount!: number;
      public symbolCount!: number;
      public version!: string;
      public scriptKind!: ScriptKind;
      public languageVersion!: ScriptTarget;
      public languageVariant!: LanguageVariant;
      public identifiers!: QMap<string>;
      public nameTable: UnderscoreEscapedMap<number> | undefined;
      public resolvedModules: QMap<ResolvedModuleFull> | undefined;
      public resolvedTypeReferenceDirectiveNames!: QMap<ResolvedTypeReferenceDirective>;
      public imports!: readonly StringLiteralLike[];
      public moduleAugmentations!: StringLiteral[];
      private namedDeclarations: QMap<Declaration[]> | undefined;
      public ambientModuleNames!: string[];
      public checkJsDirective: CheckJsDirective | undefined;
      public errorExpectations: TextRange[] | undefined;
      public possiblyContainDynamicImport?: boolean;
      public pragmas!: PragmaMap;
      public localJsxFactory: EntityName | undefined;
      public localJsxNamespace: __String | undefined;

      constructor(kind: Syntax, pos: number, end: number) {
        super(kind, pos, end);
      }
      public update(newText: string, textChangeRange: TextChangeRange): SourceFile {
        return updateSourceFile(this, newText, textChangeRange);
      }
      public getLineAndCharacterOfPosition(position: number): LineAndCharacter {
        return getLineAndCharacterOfPosition(this, position);
      }
      public getLineStarts(): readonly number[] {
        return getLineStarts(this);
      }
      public getPositionOfLineAndCharacter(line: number, character: number, allowEdits?: true): number {
        return computePositionOfLineAndCharacter(getLineStarts(this), line, character, this.text, allowEdits);
      }
      public getLineEndOfPosition(pos: number): number {
        const { line } = this.getLineAndCharacterOfPosition(pos);
        const lineStarts = this.getLineStarts();

        let lastCharPos: number | undefined;
        if (line + 1 >= lineStarts.length) {
          lastCharPos = this.getEnd();
        }
        if (!lastCharPos) {
          lastCharPos = lineStarts[line + 1] - 1;
        }

        const fullText = this.getFullText();
        // if the new line is "\r\n", we should return the last non-new-line-character position
        return fullText[lastCharPos] === '\n' && fullText[lastCharPos - 1] === '\r' ? lastCharPos - 1 : lastCharPos;
      }

      public getNamedDeclarations(): QMap<Declaration[]> {
        if (!this.namedDeclarations) {
          this.namedDeclarations = this.computeNamedDeclarations();
        }

        return this.namedDeclarations;
      }

      private computeNamedDeclarations(): QMap<Declaration[]> {
        const result = createMultiMap<Declaration>();

        this.forEachChild(visit);

        return result;

        function addDeclaration(declaration: Declaration) {
          const name = getDeclarationName(declaration);
          if (name) {
            result.add(name, declaration);
          }
        }

        function getDeclarations(name: string) {
          let declarations = result.get(name);
          if (!declarations) {
            result.set(name, (declarations = []));
          }
          return declarations;
        }

        function getDeclarationName(declaration: Declaration) {
          const name = getNonAssignedNameOfDeclaration(declaration);
          return name && (isComputedPropertyName(name) && isPropertyAccessExpression(name.expression) ? name.expression.name.text : isPropertyName(name) ? getNameFromPropertyName(name) : undefined);
        }

        function visit(node: Node): void {
          switch (node.kind) {
            case Syntax.FunctionDeclaration:
            case Syntax.FunctionExpression:
            case Syntax.MethodDeclaration:
            case Syntax.MethodSignature:
              const functionDeclaration = <FunctionLikeDeclaration>node;
              const declarationName = getDeclarationName(functionDeclaration);

              if (declarationName) {
                const declarations = getDeclarations(declarationName);
                const lastDeclaration = lastOrUndefined(declarations);

                // Check whether this declaration belongs to an "overload group".
                if (lastDeclaration && functionDeclaration.parent === lastDeclaration.parent && functionDeclaration.symbol === lastDeclaration.symbol) {
                  // Overwrite the last declaration if it was an overload
                  // and this one is an implementation.
                  if (functionDeclaration.body && !(<FunctionLikeDeclaration>lastDeclaration).body) {
                    declarations[declarations.length - 1] = functionDeclaration;
                  }
                } else {
                  declarations.push(functionDeclaration);
                }
              }
              forEachChild(node, visit);
              break;

            case Syntax.ClassDeclaration:
            case Syntax.ClassExpression:
            case Syntax.InterfaceDeclaration:
            case Syntax.TypeAliasDeclaration:
            case Syntax.EnumDeclaration:
            case Syntax.ModuleDeclaration:
            case Syntax.ImportEqualsDeclaration:
            case Syntax.ExportSpecifier:
            case Syntax.ImportSpecifier:
            case Syntax.ImportClause:
            case Syntax.NamespaceImport:
            case Syntax.GetAccessor:
            case Syntax.SetAccessor:
            case Syntax.TypeLiteral:
              addDeclaration(<Declaration>node);
              forEachChild(node, visit);
              break;

            case Syntax.Parameter:
              // Only consider parameter properties
              if (!hasSyntacticModifier(node, ModifierFlags.ParameterPropertyModifier)) {
                break;
              }
            // falls through

            case Syntax.VariableDeclaration:
            case Syntax.BindingElement: {
              const decl = <VariableDeclaration>node;
              if (isBindingPattern(decl.name)) {
                forEachChild(decl.name, visit);
                break;
              }
              if (decl.initializer) {
                visit(decl.initializer);
              }
            }
            // falls through
            case Syntax.EnumMember:
            case Syntax.PropertyDeclaration:
            case Syntax.PropertySignature:
              addDeclaration(<Declaration>node);
              break;

            case Syntax.ExportDeclaration:
              // Handle named exports case e.g.:
              //    export {a, b as B} from "mod";
              const exportDeclaration = <ExportDeclaration>node;
              if (exportDeclaration.exportClause) {
                if (isNamedExports(exportDeclaration.exportClause)) {
                  forEach(exportDeclaration.exportClause.elements, visit);
                } else {
                  visit(exportDeclaration.exportClause.name);
                }
              }
              break;

            case Syntax.ImportDeclaration:
              const importClause = (<ImportDeclaration>node).importClause;
              if (importClause) {
                // Handle default import case e.g.:
                //    import d from "mod";
                if (importClause.name) {
                  addDeclaration(importClause.name);
                }

                // Handle named bindings in imports e.g.:
                //    import * as NS from "mod";
                //    import {a, b as B} from "mod";
                if (importClause.namedBindings) {
                  if (importClause.namedBindings.kind === Syntax.NamespaceImport) {
                    addDeclaration(importClause.namedBindings);
                  } else {
                    forEach(importClause.namedBindings.elements, visit);
                  }
                }
              }
              break;

            case Syntax.BinaryExpression:
              if (getAssignmentDeclarationKind(node as BinaryExpression) !== AssignmentDeclarationKind.None) {
                addDeclaration(node as BinaryExpression);
              }
            // falls through

            default:
              forEachChild(node, visit);
          }
        }
      }
    }

    export class SourceMapSourceObj implements SourceMapSource {
      lineMap!: number[];
      constructor(public fileName: string, public text: string, public skipTrivia = (pos: number) => pos) {}
      public getLineAndCharacterOfPosition(pos: number): LineAndCharacter {
        return getLineAndCharacterOfPosition(this, pos);
      }
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
