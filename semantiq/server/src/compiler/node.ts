namespace qnr {
  export function asName<T extends Identifier | BindingName | PropertyName | EntityName | ThisTypeNode | undefined>(n: string | T): T | Identifier {
    return isString(n) ? createIdentifier(n) : n;
  }

  export function asExpression<T extends Expression | undefined>(e: string | number | boolean | T): T | StringLiteral | NumericLiteral | BooleanLiteral {
    return typeof e === 'string' ? StringLiteral.create(e) : typeof e === 'number' ? NumericLiteral.create('' + e) : typeof e === 'boolean' ? (e ? createTrue() : createFalse()) : e;
  }

  export function asToken<TKind extends Syntax>(t: TKind | Token<TKind>): Token<TKind> {
    return typeof t === 'number' ? createToken(t) : t;
  }

  export function asEmbeddedStatement<T extends Node>(statement: T): T | EmptyStatement;
  export function asEmbeddedStatement<T extends Node>(statement: T | undefined): T | EmptyStatement | undefined;
  export function asEmbeddedStatement<T extends Node>(statement: T | undefined): T | EmptyStatement | undefined {
    return statement && isNotEmittedStatement(statement) ? setTextRange(setOriginalNode(createEmptyStatement(), statement), statement) : statement;
  }

  export namespace NodeArray {
    export function create<T extends Node>(es?: T[], hasTrailingComma?: boolean): MutableNodeArray<T>;
    export function create<T extends Node>(es?: readonly T[], hasTrailingComma?: boolean): NodeArray<T>;
    export function create<T extends Node>(es?: readonly T[], hasTrailingComma?: boolean): NodeArray<T> {
      if (!es || es === emptyArray) es = [];
      else if (isNodeArray(es)) return es;
      const a = es as NodeArray<T>;
      a.pos = -1;
      a.end = -1;
      a.hasTrailingComma = hasTrailingComma;
      return a;
    }
    export function from<T extends Node>(a: readonly T[]): NodeArray<T>;
    export function from<T extends Node>(a: readonly T[] | undefined): NodeArray<T> | undefined;
    export function from<T extends Node>(a: readonly T[] | undefined): NodeArray<T> | undefined {
      return a ? create(a) : undefined;
    }
    export function visit<T>(cb: (n: Node) => T, cbs?: (ns: NodeArray<Node>) => T | undefined, ns?: NodeArray<Node>): T | undefined {
      if (ns) {
        if (cbs) return cbs(ns);
        for (const n of ns) {
          const r = cb(n);
          if (r) return r;
        }
      }
      return;
    }
  }

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

  type NodeType<T extends Syntax> = T extends keyof SynMap ? SynMap[T] : never;

  export namespace Node {
    // const kind = Syntax.Unknown;

    export function create<T extends Syntax>(k: T, pos: number, end: number, parent?: Node): NodeType<T> {
      const n =
        isNodeKind(k) || k === Syntax.Unknown
          ? new NodeObj(k, pos, end)
          : k === Syntax.SourceFile
          ? new SourceFileObj(Syntax.SourceFile, pos, end)
          : k === Syntax.Identifier
          ? new IdentifierObj(Syntax.Identifier, pos, end)
          : k === Syntax.PrivateIdentifier
          ? new PrivateIdentifierObj(Syntax.PrivateIdentifier, pos, end)
          : new TokenObj<T>(k, pos, end);
      if (parent) {
        n.parent = parent;
        n.flags = parent.flags & NodeFlags.ContextFlags;
      }
      return n as NodeType<T>;
    }

    export function createSynthesized<T extends Syntax>(k: T): NodeType<T> {
      const n = create<T>(k, -1, -1);
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

    function isNodeKind(k: Syntax) {
      return k >= Syntax.FirstNode;
    }

    export function isKind<S extends Syntax, T extends { kind: S }>(n: NodeType<S>, t: T): n is NodeType<S> {
      return n.kind === t.kind;
    }

    export class NodeObj extends TextRange implements Node {
      id = 0;
      flags = NodeFlags.None;
      modifierFlagsCache = ModifierFlags.None;
      transformFlags = TransformFlags.None;
      parent!: Node;
      symbol!: Symbol;
      jsDoc?: JSDoc[];
      original?: Node;
      private _children?: Node[];

      constructor(public kind: Syntax, pos: number, end: number) {
        super(pos, end);
      }
      getSourceFile(): SourceFile {
        return getSourceFileOfNode(this);
      }
      getStart(s?: SourceFileLike, includeJsDocComment?: boolean) {
        assert(!isSynthesized(this.pos) && !isSynthesized(this.end));
        return getTokenPosOfNode(this, s, includeJsDocComment);
      }
      getFullStart() {
        assert(!isSynthesized(this.pos) && !isSynthesized(this.end));
        return this.pos;
      }
      getEnd() {
        assert(!isSynthesized(this.pos) && !isSynthesized(this.end));
        return this.end;
      }
      getWidth(s?: SourceFile) {
        assert(!isSynthesized(this.pos) && !isSynthesized(this.end));
        return this.getEnd() - this.getStart(s);
      }
      getFullWidth() {
        assert(!isSynthesized(this.pos) && !isSynthesized(this.end));
        return this.end - this.pos;
      }
      getLeadingTriviaWidth(s?: SourceFile) {
        assert(!isSynthesized(this.pos) && !isSynthesized(this.end));
        return this.getStart(s) - this.pos;
      }
      getFullText(s?: SourceFile) {
        assert(!isSynthesized(this.pos) && !isSynthesized(this.end));
        return (s || this.getSourceFile()).text.substring(this.pos, this.end);
      }
      getText(s?: SourceFile) {
        assert(!isSynthesized(this.pos) && !isSynthesized(this.end));
        if (!s) s = this.getSourceFile();
        return s.text.substring(this.getStart(s), this.getEnd());
      }
      getChildCount(s?: SourceFile) {
        return this.getChildren(s).length;
      }
      getChildAt(i: number, s?: SourceFile) {
        return this.getChildren(s)[i];
      }
      getChildren(s?: SourceFileLike) {
        assert(!isSynthesized(this.pos) && !isSynthesized(this.end));
        const scanner = Scanner.getRaw();
        const addSynthetics = (ns: Push<Node>, pos: number, end: number) => {
          scanner.setTextPos(pos);
          while (pos < end) {
            const t = scanner.scan();
            const p = scanner.getTextPos();
            if (p <= end) {
              if (t === Syntax.Identifier) fail(`Did not expect ${Debug.formatSyntax(this.kind)} to have an Identifier in its trivia`);
              ns.push(Node.create(t, pos, p, this));
            }
            pos = p;
            if (t === Syntax.EndOfFileToken) break;
          }
        };
        const createSyntaxList = (ns: NodeArray<Node>) => {
          const list = Node.create(Syntax.SyntaxList, ns.pos, ns.end, this);
          list._children = [];
          let p = ns.pos;
          for (const n of ns) {
            addSynthetics(list._children, p, n.pos);
            list._children.push(n);
            p = n.end;
          }
          addSynthetics(list._children, p, ns.end);
          return list;
        };
        const createChildren = () => {
          const cs = [] as Node[];
          if (isNodeKind(this.kind)) {
            if (isJSDocCommentContainingNode(this)) {
              this.forEachChild((c) => {
                cs.push(c);
              });
              return cs;
            }
            scanner.setText((s || this.getSourceFile()).text);
            let p = this.pos;
            const processNode = (c: Node) => {
              addSynthetics(cs, p, c.pos);
              cs.push(c);
              p = c.end;
            };
            const processNodes = (ns: NodeArray<Node>) => {
              addSynthetics(cs, p, ns.pos);
              cs.push(createSyntaxList(ns));
              p = ns.end;
            };
            forEach((this as JSDocContainer).jsDoc, processNode);
            p = this.pos;
            this.forEachChild(processNode, processNodes);
            addSynthetics(cs, p, this.end);
            scanner.setText(undefined);
          }
          return cs;
        };
        return this._children || (this._children = createChildren());
      }
      getFirstToken(s?: SourceFileLike): Node | undefined {
        assert(!isSynthesized(this.pos) && !isSynthesized(this.end));
        const cs = this.getChildren(s);
        if (!cs.length) return;
        const c = find(cs, (c) => c.kind < Syntax.FirstJSDocNode || c.kind > Syntax.LastJSDocNode)!;
        return c.kind < Syntax.FirstNode ? c : c.getFirstToken(s);
      }
      getLastToken(s?: SourceFileLike): Node | undefined {
        assert(!isSynthesized(this.pos) && !isSynthesized(this.end));
        const cs = this.getChildren(s);
        const c = lastOrUndefined(cs);
        if (!c) return;
        return c.kind < Syntax.FirstNode ? c : c.getLastToken(s);
      }
      visit<T>(cb: (n: Node) => T): T | undefined {
        return cb(this);
      }
      forEachChild<T extends Node>(cb: (n: Node) => T, cbs?: (ns: NodeArray<Node>) => T): T | undefined {
        if (this.kind <= Syntax.LastToken) return;
        const n = (this as unknown) as
          | QualifiedName
          | JSDocTypeLiteral
          | JSDocSignature
          | PartiallyEmittedExpression
          | JSDocAuthorTag
          | JSDocTypedefTag
          | JSDocAugmentsTag
          | JSDocImplementsTag
          | JSDocTemplateTag
          | JSDoc
          | JSDocFunctionType
          | OptionalTypeNode
          | RestTypeNode
          | JSDocTypeExpression
          | JSDocTypeReferencingNode
          | JsxClosingElement
          | JsxExpression
          | JsxSpreadAttribute
          | JsxAttribute
          | JsxAttributes
          | JsxOpeningLikeElement
          | JsxFragment
          | JsxElement
          | CommaListExpression
          | MissingDeclaration
          | ExternalModuleReference
          | ExpressionWithTypeArguments
          | HeritageClause
          | ComputedPropertyName
          | TemplateSpan
          | TemplateExpression
          | ExportAssignment
          | ImportOrExportSpecifier
          | ExportDeclaration
          | NamedImportsOrExports
          | NamespaceExport
          | NamespaceImport
          | NamespaceExportDeclaration
          | ImportClause
          | ImportDeclaration
          | ImportEqualsDeclaration
          | ModuleDeclaration
          | EnumMember
          | EnumDeclaration
          | TypeAliasDeclaration
          | InterfaceDeclaration
          | ClassLikeDeclaration
          | Decorator
          | CatchClause
          | TryStatement
          | ThrowStatement
          | LabeledStatement
          | DefaultClause
          | CaseClause
          | CaseBlock
          | SwitchStatement
          | WithStatement
          | ReturnStatement
          | BreakOrContinueStatement
          | ForOfStatement
          | ForInStatement
          | ForStatement
          | WhileStatement
          | DoStatement
          | IfStatement
          | ExpressionStatement
          | VariableDeclarationList
          | VariableStatement
          | SourceFile
          | Block
          | SpreadElement
          | ConditionalExpression
          | MetaProperty
          | NonNullExpression
          | AsExpression
          | BinaryExpression
          | PostfixUnaryExpression
          | AwaitExpression
          | YieldExpression
          | PrefixUnaryExpression
          | DeleteExpression
          | VoidExpression
          | TypeOfExpression
          | DeleteExpression
          | ParenthesizedExpression
          | TypeAssertion
          | TaggedTemplateExpression
          | CallExpression
          | ElementAccessExpression
          | PropertyAccessExpression
          | ObjectLiteralExpression
          | ArrayLiteralExpression
          | BindingPattern
          | NamedTupleMember
          | LiteralTypeNode
          | MappedTypeNode
          | IndexedAccessTypeNode
          | TypeOperatorNode
          | ParenthesizedTypeNode
          | ImportTypeNode
          | InferTypeNode
          | ConditionalTypeNode
          | UnionOrIntersectionTypeNode
          | TupleTypeNode
          | ArrayTypeNode
          | TypeLiteralNode
          | TypeQueryNode
          | TypeReferenceNode
          | TypePredicateNode
          | FunctionLikeDeclaration
          | SignatureDeclaration
          | BindingElement
          | VariableDeclaration
          | PropertyAssignment
          | PropertySignature
          | PropertyDeclaration
          | ParameterDeclaration
          | TypeParameterDeclaration
          | ShorthandPropertyAssignment
          | SpreadAssignment;
        switch (n.kind) {
          case Syntax.QualifiedName:
            return n.left.visit(cb) || n.right.visit(cb);
          case Syntax.TypeParameter:
            return n.name.visit(cb) || n.constraint?.visit(cb) || n.default?.visit(cb) || n.expression?.visit(cb);
          case Syntax.ShorthandPropertyAssignment:
            return (
              NodeArray.visit(cb, cbs, n.decorators) ||
              NodeArray.visit(cb, cbs, n.modifiers) ||
              n.name.visit(cb) ||
              n.questionToken?.visit(cb) ||
              n.exclamationToken?.visit(cb) ||
              n.equalsToken?.visit(cb) ||
              n.objectAssignmentInitializer?.visit(cb)
            );
          case Syntax.SpreadAssignment:
            return n.expression.visit(cb);
          case Syntax.Parameter:
            return (
              NodeArray.visit(cb, cbs, n.decorators) ||
              NodeArray.visit(cb, cbs, n.modifiers) ||
              n.dot3Token?.visit(cb) ||
              n.name.visit(cb) ||
              n.questionToken?.visit(cb) ||
              n.type?.visit(cb) ||
              n.initializer?.visit(cb)
            );
          case Syntax.PropertyDeclaration:
            return (
              NodeArray.visit(cb, cbs, n.decorators) ||
              NodeArray.visit(cb, cbs, n.modifiers) ||
              n.name.visit(cb) ||
              n.questionToken?.visit(cb) ||
              n.exclamationToken?.visit(cb) ||
              n.type?.visit(cb) ||
              n.initializer?.visit(cb)
            );
          case Syntax.PropertySignature:
            return NodeArray.visit(cb, cbs, n.decorators) || NodeArray.visit(cb, cbs, n.modifiers) || n.name.visit(cb) || n.questionToken?.visit(cb) || n.type?.visit(cb) || n.initializer?.visit(cb);
          case Syntax.PropertyAssignment:
            return NodeArray.visit(cb, cbs, n.decorators) || NodeArray.visit(cb, cbs, n.modifiers) || n.name.visit(cb) || n.questionToken?.visit(cb) || n.initializer.visit(cb);
          case Syntax.VariableDeclaration:
            return (
              NodeArray.visit(cb, cbs, n.decorators) || NodeArray.visit(cb, cbs, n.modifiers) || n.name.visit(cb) || n.exclamationToken?.visit(cb) || n.type?.visit(cb) || n.initializer?.visit(cb)
            );
          case Syntax.BindingElement:
            return (
              NodeArray.visit(cb, cbs, n.decorators) || NodeArray.visit(cb, cbs, n.modifiers) || n.dot3Token?.visit(cb) || n.propertyName?.visit(cb) || n.name.visit(cb) || n.initializer?.visit(cb)
            );
          case Syntax.FunctionType:
          case Syntax.ConstructorType:
          case Syntax.CallSignature:
          case Syntax.ConstructSignature:
          case Syntax.IndexSignature:
            return (
              NodeArray.visit(cb, cbs, n.decorators) ||
              NodeArray.visit(cb, cbs, n.modifiers) ||
              NodeArray.visit(cb, cbs, n.typeParameters) ||
              NodeArray.visit(cb, cbs, n.parameters) ||
              n.type?.visit(cb)
            );
          case Syntax.MethodDeclaration:
          case Syntax.MethodSignature:
          case Syntax.Constructor:
          case Syntax.GetAccessor:
          case Syntax.SetAccessor:
          case Syntax.FunctionExpression:
          case Syntax.FunctionDeclaration:
          case Syntax.ArrowFunction:
            return (
              NodeArray.visit(cb, cbs, n.decorators) ||
              NodeArray.visit(cb, cbs, n.modifiers) ||
              n.asteriskToken?.visit(cb) ||
              n.name?.visit(cb) ||
              n.questionToken?.visit(cb) ||
              n.exclamationToken.visit(cb) ||
              NodeArray.visit(cb, cbs, n.typeParameters) ||
              NodeArray.visit(cb, cbs, n.parameters) ||
              n.type?.visit(cb) ||
              (n as ArrowFunction).equalsGreaterThanToken.visit(cb) ||
              n.body.visit(cb)
            );
          case Syntax.TypeReference:
            return n.typeName.visit(cb) || NodeArray.visit(cb, cbs, n.typeArguments);
          case Syntax.TypePredicate:
            return n.assertsModifier?.visit(cb) || n.parameterName.visit(cb) || n.type?.visit(cb);
          case Syntax.TypeQuery:
            return n.exprName.visit(cb);
          case Syntax.TypeLiteral:
            return NodeArray.visit(cb, cbs, n.members);
          case Syntax.ArrayType:
            return n.elementType.visit(cb);
          case Syntax.TupleType:
            return NodeArray.visit(cb, cbs, n.elements);
          case Syntax.UnionType:
          case Syntax.IntersectionType:
            return NodeArray.visit(cb, cbs, n.types);
          case Syntax.ConditionalType:
            return n.checkType.visit(cb) || n.extendsType.visit(cb) || n.trueType.visit(cb) || n.falseType.visit(cb);
          case Syntax.InferType:
            return n.typeParameter.visit(cb);
          case Syntax.ImportType:
            return n.argument.visit(cb) || n.qualifier?.visit(cb) || NodeArray.visit(cb, cbs, n.typeArguments);
          case Syntax.ParenthesizedType:
          case Syntax.TypeOperator:
            return n.type.visit(cb);
          case Syntax.IndexedAccessType:
            return n.objectType.visit(cb) || n.indexType.visit(cb);
          case Syntax.MappedType:
            return n.readonlyToken?.visit(cb) || n.typeParameter.visit(cb) || n.questionToken?.visit(cb) || n.type?.visit(cb);
          case Syntax.LiteralType:
            return n.literal.visit(cb);
          case Syntax.NamedTupleMember:
            return n.dot3Token?.visit(cb) || n.name.visit(cb) || n.questionToken?.visit(cb) || n.type.visit(cb);
          case Syntax.ObjectBindingPattern:
          case Syntax.ArrayBindingPattern:
            return NodeArray.visit(cb, cbs, n.elements);
          case Syntax.ArrayLiteralExpression:
            return NodeArray.visit(cb, cbs, n.elements);
          case Syntax.ObjectLiteralExpression:
            return NodeArray.visit(cb, cbs, n.properties);
          case Syntax.PropertyAccessExpression:
            return n.expression.visit(cb) || n.questionDotToken?.visit(cb) || n.name.visit(cb);
          case Syntax.ElementAccessExpression:
            return n.expression.visit(cb) || n.questionDotToken?.visit(cb) || n.argumentExpression.visit(cb);
          case Syntax.CallExpression:
          case Syntax.NewExpression:
            return n.expression.visit(cb) || n.questionDotToken?.visit(cb) || NodeArray.visit(cb, cbs, n.typeArguments) || NodeArray.visit(cb, cbs, n.arguments);
          case Syntax.TaggedTemplateExpression:
            return n.tag.visit(cb) || n.questionDotToken?.visit(cb) || NodeArray.visit(cb, cbs, n.typeArguments) || n.template.visit(cb);
          case Syntax.TypeAssertionExpression:
            return n.type.visit(cb) || n.expression.visit(cb);
          case Syntax.ParenthesizedExpression:
            return n.expression.visit(cb);
          case Syntax.DeleteExpression:
            return n.expression.visit(cb);
          case Syntax.TypeOfExpression:
            return n.expression.visit(cb);
          case Syntax.VoidExpression:
            return n.expression.visit(cb);
          case Syntax.PrefixUnaryExpression:
            return n.operand.visit(cb);
          case Syntax.YieldExpression:
            return n.asteriskToken?.visit(cb) || n.expression?.visit(cb);
          case Syntax.AwaitExpression:
            return n.expression.visit(cb);
          case Syntax.PostfixUnaryExpression:
            return n.operand.visit(cb);
          case Syntax.BinaryExpression:
            return n.left.visit(cb) || n.operatorToken.visit(cb) || n.right.visit(cb);
          case Syntax.AsExpression:
            return n.expression.visit(cb) || n.type.visit(cb);
          case Syntax.NonNullExpression:
            return n.expression.visit(cb);
          case Syntax.MetaProperty:
            return n.name.visit(cb);
          case Syntax.ConditionalExpression:
            return n.condition.visit(cb) || n.questionToken.visit(cb) || n.whenTrue.visit(cb) || n.colonToken.visit(cb) || n.whenFalse.visit(cb);
          case Syntax.SpreadElement:
            return n.expression.visit(cb);
          case Syntax.Block:
          case Syntax.ModuleBlock:
            return NodeArray.visit(cb, cbs, n.statements);
          case Syntax.SourceFile:
            return NodeArray.visit(cb, cbs, n.statements) || n.endOfFileToken.visit(cb);
          case Syntax.VariableStatement:
            return NodeArray.visit(cb, cbs, n.decorators) || NodeArray.visit(cb, cbs, n.modifiers) || n.declarationList.visit(cb);
          case Syntax.VariableDeclarationList:
            return NodeArray.visit(cb, cbs, n.declarations);
          case Syntax.ExpressionStatement:
            return n.expression.visit(cb);
          case Syntax.IfStatement:
            return n.expression.visit(cb) || n.thenStatement.visit(cb) || n.elseStatement?.visit(cb);
          case Syntax.DoStatement:
            return n.statement.visit(cb) || n.expression.visit(cb);
          case Syntax.WhileStatement:
            return n.expression.visit(cb) || n.statement.visit(cb);
          case Syntax.ForStatement:
            return n.initializer?.visit(cb) || n.condition?.visit(cb) || n.incrementor?.visit(cb) || n.statement.visit(cb);
          case Syntax.ForInStatement:
            return n.initializer.visit(cb) || n.expression.visit(cb) || n.statement.visit(cb);
          case Syntax.ForOfStatement:
            return n.awaitModifier?.visit(cb) || n.initializer.visit(cb) || n.expression.visit(cb) || n.statement.visit(cb);
          case Syntax.ContinueStatement:
          case Syntax.BreakStatement:
            return n.label?.visit(cb);
          case Syntax.ReturnStatement:
            return n.expression?.visit(cb);
          case Syntax.WithStatement:
            return n.expression.visit(cb) || n.statement.visit(cb);
          case Syntax.SwitchStatement:
            return n.expression.visit(cb) || n.caseBlock.visit(cb);
          case Syntax.CaseBlock:
            return NodeArray.visit(cb, cbs, n.clauses);
          case Syntax.CaseClause:
            return n.expression.visit(cb) || NodeArray.visit(cb, cbs, n.statements);
          case Syntax.DefaultClause:
            return NodeArray.visit(cb, cbs, n.statements);
          case Syntax.LabeledStatement:
            return n.label.visit(cb) || n.statement.visit(cb);
          case Syntax.ThrowStatement:
            return n.expression?.visit(cb);
          case Syntax.TryStatement:
            return n.tryBlock.visit(cb) || n.catchClause?.visit(cb) || n.finallyBlock?.visit(cb);
          case Syntax.CatchClause:
            return n.variableDeclaration?.visit(cb) || n.block.visit(cb);
          case Syntax.Decorator:
            return n.expression.visit(cb);
          case Syntax.ClassDeclaration:
          case Syntax.ClassExpression:
            return (
              NodeArray.visit(cb, cbs, n.decorators) ||
              NodeArray.visit(cb, cbs, n.modifiers) ||
              n.name?.visit(cb) ||
              NodeArray.visit(cb, cbs, n.typeParameters) ||
              NodeArray.visit(cb, cbs, n.heritageClauses) ||
              NodeArray.visit(cb, cbs, n.members)
            );
          case Syntax.InterfaceDeclaration:
            return (
              NodeArray.visit(cb, cbs, n.decorators) ||
              NodeArray.visit(cb, cbs, n.modifiers) ||
              n.name.visit(cb) ||
              NodeArray.visit(cb, cbs, n.typeParameters) ||
              NodeArray.visit(cb, cbs, (n as ClassDeclaration).heritageClauses) ||
              NodeArray.visit(cb, cbs, n.members)
            );
          case Syntax.TypeAliasDeclaration:
            return NodeArray.visit(cb, cbs, n.decorators) || NodeArray.visit(cb, cbs, n.modifiers) || n.name.visit(cb) || NodeArray.visit(cb, cbs, n.typeParameters) || n.type.visit(cb);
          case Syntax.EnumDeclaration:
            return NodeArray.visit(cb, cbs, n.decorators) || NodeArray.visit(cb, cbs, n.modifiers) || n.name.visit(cb) || NodeArray.visit(cb, cbs, n.members);
          case Syntax.EnumMember:
            return n.name.visit(cb) || n.initializer?.visit(cb);
          case Syntax.ModuleDeclaration:
            return NodeArray.visit(cb, cbs, n.decorators) || NodeArray.visit(cb, cbs, n.modifiers) || n.name.visit(cb) || n.body?.visit(cb);
          case Syntax.ImportEqualsDeclaration:
            return NodeArray.visit(cb, cbs, n.decorators) || NodeArray.visit(cb, cbs, n.modifiers) || n.name.visit(cb) || n.moduleReference.visit(cb);
          case Syntax.ImportDeclaration:
            return NodeArray.visit(cb, cbs, n.decorators) || NodeArray.visit(cb, cbs, n.modifiers) || n.importClause?.visit(cb) || n.moduleSpecifier.visit(cb);
          case Syntax.ImportClause:
            return n.name?.visit(cb) || n.namedBindings?.visit(cb);
          case Syntax.NamespaceExportDeclaration:
            return n.name.visit(cb);
          case Syntax.NamespaceImport:
            return n.name.visit(cb);
          case Syntax.NamespaceExport:
            return n.name.visit(cb);
          case Syntax.NamedImports:
          case Syntax.NamedExports:
            return NodeArray.visit(cb, cbs, n.elements);
          case Syntax.ExportDeclaration:
            return NodeArray.visit(cb, cbs, n.decorators) || NodeArray.visit(cb, cbs, n.modifiers) || n.exportClause?.visit(cb) || n.moduleSpecifier?.visit(cb);
          case Syntax.ImportSpecifier:
          case Syntax.ExportSpecifier:
            return n.propertyName?.visit(cb) || n.name.visit(cb);
          case Syntax.ExportAssignment:
            return NodeArray.visit(cb, cbs, n.decorators) || NodeArray.visit(cb, cbs, n.modifiers) || n.expression.visit(cb);
          case Syntax.TemplateExpression:
            return n.head.visit(cb) || NodeArray.visit(cb, cbs, n.templateSpans);
          case Syntax.TemplateSpan:
            return n.expression.visit(cb) || n.literal.visit(cb);
          case Syntax.ComputedPropertyName:
            return n.expression.visit(cb);
          case Syntax.HeritageClause:
            return NodeArray.visit(cb, cbs, n.types);
          case Syntax.ExpressionWithTypeArguments:
            return n.expression.visit(cb) || NodeArray.visit(cb, cbs, n.typeArguments);
          case Syntax.ExternalModuleReference:
            return n.expression.visit(cb);
          case Syntax.MissingDeclaration:
            return NodeArray.visit(cb, cbs, n.decorators);
          case Syntax.CommaListExpression:
            return NodeArray.visit(cb, cbs, n.elements);
          case Syntax.JsxElement:
            return n.openingElement.visit(cb) || NodeArray.visit(cb, cbs, n.children) || n.closingElement.visit(cb);
          case Syntax.JsxFragment:
            return n.openingFragment.visit(cb) || NodeArray.visit(cb, cbs, n.children) || n.closingFragment.visit(cb);
          case Syntax.JsxSelfClosingElement:
          case Syntax.JsxOpeningElement:
            return n.tagName.visit(cb) || NodeArray.visit(cb, cbs, n.typeArguments) || n.attributes.visit(cb);
          case Syntax.JsxAttributes:
            return NodeArray.visit(cb, cbs, n.properties);
          case Syntax.JsxAttribute:
            return n.name.visit(cb) || n.initializer?.visit(cb);
          case Syntax.JsxSpreadAttribute:
            return n.expression.visit(cb);
          case Syntax.JsxExpression:
            return n.dot3Token?.visit(cb) || n.expression?.visit(cb);
          case Syntax.JsxClosingElement:
            return n.tagName.visit(cb);
          case Syntax.OptionalType:
          case Syntax.RestType:
          case Syntax.JSDocTypeExpression:
          case Syntax.JSDocNonNullableType:
          case Syntax.JSDocNullableType:
          case Syntax.JSDocOptionalType:
          case Syntax.JSDocVariadicType:
            return n.type.visit(cb);
          case Syntax.JSDocFunctionType:
            return NodeArray.visit(cb, cbs, n.parameters) || n.type?.visit(cb);
          case Syntax.JSDocComment:
            return NodeArray.visit(cb, cbs, n.tags);
          case Syntax.JSDocParameterTag:
          case Syntax.JSDocPropertyTag:
            return n.tagName.visit(cb) || (n.isNameFirst ? n.name.visit(cb) || n.typeExpression?.visit(cb) : n.typeExpression?.visit(cb) || n.name.visit(cb));
          case Syntax.JSDocAuthorTag:
            return n.tagName.visit(cb);
          case Syntax.JSDocImplementsTag:
            return n.tagName.visit(cb) || n.class.visit(cb);
          case Syntax.JSDocAugmentsTag:
            return n.tagName.visit(cb) || n.class.visit(cb);
          case Syntax.JSDocTemplateTag:
            return n.tagName.visit(cb) || n.constraint?.visit(cb) || NodeArray.visit(cb, cbs, n.typeParameters);
          case Syntax.JSDocTypedefTag:
            return (
              n.tagName.visit(cb) ||
              (n.typeExpression && n.typeExpression!.kind === Syntax.JSDocTypeExpression ? n.typeExpression.visit(cb) || n.fullName?.visit(cb) : n.fullName?.visit(cb) || n.typeExpression?.visit(cb))
            );
          case Syntax.JSDocCallbackTag:
            const n2 = n as JSDocCallbackTag;
            return n2.tagName.visit(cb) || n2.fullName?.visit(cb) || n2.typeExpression?.visit(cb);
          case Syntax.JSDocReturnTag:
          case Syntax.JSDocTypeTag:
          case Syntax.JSDocThisTag:
          case Syntax.JSDocEnumTag:
            const n3 = n as JSDocReturnTag | JSDocTypeTag | JSDocThisTag | JSDocEnumTag;
            return n3.tagName.visit(cb) || n3.typeExpression?.visit(cb);
          case Syntax.JSDocSignature:
            return forEach(n.typeParameters, cb) || forEach(n.parameters, cb) || n.type?.visit(cb);
          case Syntax.JSDocTypeLiteral:
            return forEach(n.jsDocPropertyTags, cb);
          case Syntax.JSDocTag:
          case Syntax.JSDocClassTag:
          case Syntax.JSDocPublicTag:
          case Syntax.JSDocPrivateTag:
          case Syntax.JSDocProtectedTag:
          case Syntax.JSDocReadonlyTag:
            return n.tagName.visit(cb);
          case Syntax.PartiallyEmittedExpression:
            return n.expression.visit(cb);
        }
        return;
      }
      forEachChildRecursively<T>(rootNode: Node, cb: (node: Node, parent: Node) => T | 'skip' | undefined, cbs?: (nodes: NodeArray<Node>, parent: Node) => T | 'skip' | undefined): T | undefined {
        const stack: Node[] = [rootNode];
        while (stack.length) {
          const parent = stack.pop()!;
          const res = visitAllPossibleChildren(parent, gatherPossibleChildren(parent));
          if (res) return res;
        }
        return;
        function gatherPossibleChildren(node: Node) {
          const children: (Node | NodeArray<Node>)[] = [];
          forEachChild(node, addWorkItem, addWorkItem); // By using a stack above and `unshift` here, we emulate a depth-first preorder traversal
          return children;
          function addWorkItem(n: Node | NodeArray<Node>) {
            children.unshift(n);
          }
        }
        function visitAllPossibleChildren(parent: Node, children: readonly (Node | NodeArray<Node>)[]) {
          for (const child of children) {
            if (isArray(child)) {
              if (cbs) {
                const res = cbs(child, parent);
                if (res) {
                  if (res === 'skip') continue;
                  return res;
                }
              }
              for (let i = child.length - 1; i >= 0; i--) {
                const realChild = child[i];
                const res = cb(realChild, parent);
                if (res) {
                  if (res === 'skip') continue;
                  return res;
                }
                stack.push(realChild);
              }
            } else {
              stack.push(child);
              const res = cb(child, parent);
              if (res) {
                if (res === 'skip') continue;
                return res;
              }
            }
          }
          return;
        }
      }
    }

    class TokenOrIdentifierObj extends NodeObj {
      getChildren(): Node[] {
        return this.kind === Syntax.EndOfFileToken ? (this as EndOfFileToken).jsDoc || emptyArray : emptyArray;
      }
    }

    export class TokenObj<T extends Syntax> extends TokenOrIdentifierObj implements Token<T> {}

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
      flowNode = undefined;
      constructor(kind: Syntax.Identifier, pos: number, end: number) {
        super(kind, pos, end);
      }
      get text(): string {
        return idText(this);
      }
    }
    IdentifierObj.prototype.kind = Syntax.Identifier;

    export class PrivateIdentifierObj extends TokenOrIdentifierObj implements PrivateIdentifier {
      kind: Syntax.PrivateIdentifier = Syntax.PrivateIdentifier;
      escapedText!: __String;
      constructor(kind: Syntax.PrivateIdentifier, pos: number, end: number) {
        super(kind, pos, end);
      }
      get text(): string {
        return idText(this);
      }
    }
    PrivateIdentifierObj.prototype.kind = Syntax.PrivateIdentifier;

    interface SymbolDisplayPart {}
    interface JSDocTagInfo {}

    export class SymbolObj implements Symbol {
      declarations!: Declaration[];
      valueDeclaration!: Declaration;
      docComment?: SymbolDisplayPart[];
      getComment?: SymbolDisplayPart[];
      setComment?: SymbolDisplayPart[];
      tags?: JSDocTagInfo[];

      constructor(public flags: SymbolFlags, public escName: __String) {}

      get name(): string {
        return symbolName(this);
      }
      getName(): string {
        return this.name;
      }
      getEscName(): __String {
        return this.escName;
      }
      getFlags(): SymbolFlags {
        return this.flags;
      }
      getDeclarations(): Declaration[] | undefined {
        return this.declarations;
      }
      getDocComment(checker: TypeChecker | undefined): SymbolDisplayPart[] {
        if (!this.docComment) {
          this.docComment = emptyArray;
          if (!this.declarations && ((this as Symbol) as TransientSymbol).target && (((this as Symbol) as TransientSymbol).target as TransientSymbol).tupleLabelDeclaration) {
            const labelDecl = (((this as Symbol) as TransientSymbol).target as TransientSymbol).tupleLabelDeclaration!;
            this.docComment = getDocComment([labelDecl], checker);
          } else {
            this.docComment = getDocComment(this.declarations, checker);
          }
        }
        return this.docComment;
      }
      getCtxComment(context: Node | undefined, checker: TypeChecker | undefined): SymbolDisplayPart[] {
        switch (context?.kind) {
          case Syntax.GetAccessor:
            if (!this.getComment) {
              this.getComment = emptyArray;
              this.getComment = getDocComment(filter(this.declarations, isGetAccessor), checker);
            }
            return this.getComment;
          case Syntax.SetAccessor:
            if (!this.setComment) {
              this.setComment = emptyArray;
              this.setComment = getDocComment(filter(this.declarations, isSetAccessor), checker);
            }
            return this.setComment;
          default:
            return this.getDocComment(checker);
        }
      }
      getJsDocTags(): JSDocTagInfo[] {
        if (this.tags === undefined) this.tags = JsDoc.getJsDocTagsFromDeclarations(this.declarations);
        return this.tags;
      }
    }

    export class TypeObj implements Type {
      id!: number;
      symbol!: Symbol;
      objectFlags?: ObjectFlags;
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
      get typeArguments() {
        if (getObjectFlags(this) & ObjectFlags.Reference) return this.checker.getTypeArguments((this as Type) as TypeReference);
        return;
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
      docComment?: SymbolDisplayPart[];
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
      getDocComment(): SymbolDisplayPart[] {
        return this.docComment || (this.docComment = getDocComment(singleElementArray(this.declaration), this.checker));
      }
      getJsDocTags(): JSDocTagInfo[] {
        if (this.jsDocTags === undefined) {
          this.jsDocTags = this.declaration ? JsDoc.getJsDocTagsFromDeclarations([this.declaration]) : [];
        }
        return this.jsDocTags;
      }
    }

    export class SourceFileObj extends NodeObj implements SourceFile {
      kind: Syntax.SourceFile = Syntax.SourceFile;
      _declarationBrand: any;
      fileName!: string;
      path!: Path;
      resolvedPath!: Path;
      originalFileName!: string;
      text!: string;
      scriptSnapshot!: IScriptSnapshot;
      lineMap!: readonly number[];

      statements!: NodeArray<Statement>;
      endOfFileToken!: Token<Syntax.EndOfFileToken>;

      amdDependencies!: { name: string; path: string }[];
      moduleName!: string;
      referencedFiles!: FileReference[];
      typeReferenceDirectives!: FileReference[];
      libReferenceDirectives!: FileReference[];

      syntacticDiagnostics!: DiagnosticWithLocation[];
      parseDiagnostics!: DiagnosticWithLocation[];
      bindDiagnostics!: DiagnosticWithLocation[];
      bindSuggestionDiagnostics?: DiagnosticWithLocation[];

      isDeclarationFile!: boolean;
      isDefaultLib!: boolean;
      hasNoDefaultLib!: boolean;
      externalModuleIndicator!: Node; // The first node that causes this file to be an external module
      commonJsModuleIndicator!: Node; // The first node that causes this file to be a CommonJS module
      nodeCount!: number;
      identifierCount!: number;
      symbolCount!: number;
      version!: string;
      scriptKind!: ScriptKind;
      languageVersion!: ScriptTarget;
      languageVariant!: LanguageVariant;
      identifiers!: QMap<string>;
      nameTable: UnderscoreEscapedMap<number> | undefined;
      resolvedModules: QMap<ResolvedModuleFull> | undefined;
      resolvedTypeReferenceDirectiveNames!: QMap<ResolvedTypeReferenceDirective>;
      imports!: readonly StringLiteralLike[];
      moduleAugmentations!: StringLiteral[];
      private namedDeclarations: QMap<Declaration[]> | undefined;
      ambientModuleNames!: string[];
      checkJsDirective: CheckJsDirective | undefined;
      errorExpectations: TextRange[] | undefined;
      possiblyContainDynamicImport?: boolean;
      pragmas!: PragmaMap;
      localJsxFactory: EntityName | undefined;
      localJsxNamespace: __String | undefined;

      constructor(kind: Syntax, pos: number, end: number) {
        super(kind, pos, end);
      }
      update(newText: string, textChangeRange: TextChangeRange): SourceFile {
        return updateSourceFile(this, newText, textChangeRange);
      }
      getLineAndCharacterOfPosition(position: number): LineAndCharacter {
        return getLineAndCharacterOfPosition(this, position);
      }
      getLineStarts(): readonly number[] {
        return getLineStarts(this);
      }
      getPositionOfLineAndCharacter(line: number, character: number, allowEdits?: true): number {
        return computePositionOfLineAndCharacter(getLineStarts(this), line, character, this.text, allowEdits);
      }
      getLineEndOfPosition(pos: number): number {
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

      getNamedDeclarations(): QMap<Declaration[]> {
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
                if (lastDeclaration && functionDeclaration.parent === lastDeclaration.parent && functionDeclaration.symbol === lastDeclaration.symbol) {
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
              if (decl.initializer) visit(decl.initializer);
            }
            // falls through
            case Syntax.EnumMember:
            case Syntax.PropertyDeclaration:
            case Syntax.PropertySignature:
              addDeclaration(<Declaration>node);
              break;
            case Syntax.ExportDeclaration:
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
                if (importClause.name) {
                  addDeclaration(importClause.name);
                }
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
      getLineAndCharacterOfPosition(pos: number): LineAndCharacter {
        return getLineAndCharacterOfPosition(this, pos);
      }
    }

    function hasJSDocInheritDocTag(node: Node) {
      return getJSDocTags(node).some((tag) => tag.tagName.text === 'inheritDoc');
    }

    function getDocComment(declarations: readonly Declaration[] | undefined, checker: TypeChecker | undefined): SymbolDisplayPart[] {
      if (!declarations) return emptyArray;
      let doc = JsDoc.getJsDocCommentsFromDeclarations(declarations);
      if (doc.length === 0 || declarations.some(hasJSDocInheritDocTag)) {
        forEachUnique(declarations, (declaration) => {
          const inheritedDocs = findInheritedJSDocComments(declaration, declaration.symbol.name, checker!); // TODO: GH#18217
          if (inheritedDocs) doc = doc.length === 0 ? inheritedDocs.slice() : inheritedDocs.concat(lineBreakPart(), doc);
        });
      }
      return doc;
    }

    function findInheritedJSDocComments(declaration: Declaration, propertyName: string, typeChecker: TypeChecker): readonly SymbolDisplayPart[] | undefined {
      return firstDefined(declaration.parent ? getAllSuperTypeNodes(declaration.parent) : emptyArray, (superTypeNode) => {
        const superType = typeChecker.getTypeAtLocation(superTypeNode);
        const baseProperty = superType && typeChecker.getPropertyOfType(superType, propertyName);
        const inheritedDocs = baseProperty && baseProperty.getDocComment(typeChecker);
        return inheritedDocs && inheritedDocs.length ? inheritedDocs : undefined;
      });
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
      n.modifiers = NodeArray.from(ms);
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
      n.decorators = NodeArray.from(ds);
      n.modifiers = NodeArray.from(ms);
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
      n.decorators = NodeArray.from(ds);
      n.modifiers = NodeArray.from(ms);
      n.asteriskToken = a;
      n.name = asName(p);
      n.questionToken = q;
      n.typeParameters = NodeArray.from(ts);
      n.parameters = NodeArray.create(ps);
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
      n.decorators = NodeArray.from(ds);
      n.modifiers = NodeArray.from(ms);
      n.typeParameters = undefined;
      n.parameters = NodeArray.create(ps);
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
      n.decorators = NodeArray.from(ds);
      n.modifiers = NodeArray.from(ms);
      n.name = asName(p);
      n.typeParameters = undefined;
      n.parameters = NodeArray.create(ps);
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
      n.decorators = NodeArray.from(ds);
      n.modifiers = NodeArray.from(ms);
      n.name = asName(p);
      n.typeParameters = undefined;
      n.parameters = NodeArray.create(ps);
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
      n.decorators = NodeArray.from(ds);
      n.modifiers = NodeArray.from(ms);
      n.parameters = NodeArray.create(ps);
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
      n.members = NodeArray.create(ms);
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
      n.elements = NodeArray.create(es);
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
      n.elements = NodeArray.create(es);
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
      n.elements = NodeArray.create(es);
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
      n.typeParameters = NodeArray.from(ts);
      n.parameters = NodeArray.from(ps);
      n.type = t;
      n.typeArguments = NodeArray.from(ta);
      return n;
    }
    export function update<T extends SignatureDeclaration>(n: T, ts: NodeArray<TypeParameterDeclaration> | undefined, ps: NodeArray<ParameterDeclaration>, t?: TypeNode): T {
      return n.typeParameters !== ts || n.parameters !== ps || n.type !== t ? updateNode(create(n.kind, ts, ps, t) as T, n) : n;
    }
  }
}
