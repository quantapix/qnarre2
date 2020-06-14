namespace qnr {
  const keywords: MapLike<KeywordSyntax> = {
    abstract: Syntax.AbstractKeyword,
    any: Syntax.AnyKeyword,
    as: Syntax.AsKeyword,
    asserts: Syntax.AssertsKeyword,
    bigint: Syntax.BigIntKeyword,
    boolean: Syntax.BooleanKeyword,
    break: Syntax.BreakKeyword,
    case: Syntax.CaseKeyword,
    catch: Syntax.CatchKeyword,
    class: Syntax.ClassKeyword,
    continue: Syntax.ContinueKeyword,
    const: Syntax.ConstKeyword,
    ['' + 'constructor']: Syntax.ConstructorKeyword,
    debugger: Syntax.DebuggerKeyword,
    declare: Syntax.DeclareKeyword,
    default: Syntax.DefaultKeyword,
    delete: Syntax.DeleteKeyword,
    do: Syntax.DoKeyword,
    else: Syntax.ElseKeyword,
    enum: Syntax.EnumKeyword,
    export: Syntax.ExportKeyword,
    extends: Syntax.ExtendsKeyword,
    false: Syntax.FalseKeyword,
    finally: Syntax.FinallyKeyword,
    for: Syntax.ForKeyword,
    from: Syntax.FromKeyword,
    function: Syntax.FunctionKeyword,
    get: Syntax.GetKeyword,
    if: Syntax.IfKeyword,
    implements: Syntax.ImplementsKeyword,
    import: Syntax.ImportKeyword,
    in: Syntax.InKeyword,
    infer: Syntax.InferKeyword,
    instanceof: Syntax.InstanceOfKeyword,
    interface: Syntax.InterfaceKeyword,
    is: Syntax.IsKeyword,
    keyof: Syntax.KeyOfKeyword,
    let: Syntax.LetKeyword,
    module: Syntax.ModuleKeyword,
    namespace: Syntax.NamespaceKeyword,
    never: Syntax.NeverKeyword,
    new: Syntax.NewKeyword,
    null: Syntax.NullKeyword,
    number: Syntax.NumberKeyword,
    object: Syntax.ObjectKeyword,
    package: Syntax.PackageKeyword,
    private: Syntax.PrivateKeyword,
    protected: Syntax.ProtectedKeyword,
    public: Syntax.PublicKeyword,
    readonly: Syntax.ReadonlyKeyword,
    require: Syntax.RequireKeyword,
    global: Syntax.GlobalKeyword,
    return: Syntax.ReturnKeyword,
    set: Syntax.SetKeyword,
    static: Syntax.StaticKeyword,
    string: Syntax.StringKeyword,
    super: Syntax.SuperKeyword,
    switch: Syntax.SwitchKeyword,
    symbol: Syntax.SymbolKeyword,
    this: Syntax.ThisKeyword,
    throw: Syntax.ThrowKeyword,
    true: Syntax.TrueKeyword,
    try: Syntax.TryKeyword,
    type: Syntax.TypeKeyword,
    typeof: Syntax.TypeOfKeyword,
    undefined: Syntax.UndefinedKeyword,
    unique: Syntax.UniqueKeyword,
    unknown: Syntax.UnknownKeyword,
    var: Syntax.VarKeyword,
    void: Syntax.VoidKeyword,
    while: Syntax.WhileKeyword,
    with: Syntax.WithKeyword,
    yield: Syntax.YieldKeyword,
    async: Syntax.AsyncKeyword,
    await: Syntax.AwaitKeyword,
    of: Syntax.OfKeyword,
  };
  export const strToKey = QMap.create(keywords);
  const strToTok = QMap.create<Syntax>({
    ...keywords,
    '{': Syntax.OpenBraceToken,
    '}': Syntax.CloseBraceToken,
    '(': Syntax.OpenParenToken,
    ')': Syntax.CloseParenToken,
    '[': Syntax.OpenBracketToken,
    ']': Syntax.CloseBracketToken,
    '.': Syntax.DotToken,
    '...': Syntax.Dot3Token,
    ';': Syntax.SemicolonToken,
    ',': Syntax.CommaToken,
    '<': Syntax.LessThanToken,
    '>': Syntax.GreaterThanToken,
    '<=': Syntax.LessThanEqualsToken,
    '>=': Syntax.GreaterThanEqualsToken,
    '==': Syntax.Equals2Token,
    '!=': Syntax.ExclamationEqualsToken,
    '===': Syntax.Equals3Token,
    '!==': Syntax.ExclamationEquals2Token,
    '=>': Syntax.EqualsGreaterThanToken,
    '+': Syntax.PlusToken,
    '-': Syntax.MinusToken,
    '**': Syntax.Asterisk2Token,
    '*': Syntax.AsteriskToken,
    '/': Syntax.SlashToken,
    '%': Syntax.PercentToken,
    '++': Syntax.Plus2Token,
    '--': Syntax.Minus2Token,
    '<<': Syntax.LessThan2Token,
    '</': Syntax.LessThanSlashToken,
    '>>': Syntax.GreaterThan2Token,
    '>>>': Syntax.GreaterThan3Token,
    '&': Syntax.AmpersandToken,
    '|': Syntax.BarToken,
    '^': Syntax.CaretToken,
    '!': Syntax.ExclamationToken,
    '~': Syntax.TildeToken,
    '&&': Syntax.Ampersand2Token,
    '||': Syntax.Bar2Token,
    '?': Syntax.QuestionToken,
    '??': Syntax.Question2Token,
    '?.': Syntax.QuestionDotToken,
    ':': Syntax.ColonToken,
    '=': Syntax.EqualsToken,
    '+=': Syntax.PlusEqualsToken,
    '-=': Syntax.MinusEqualsToken,
    '*=': Syntax.AsteriskEqualsToken,
    '**=': Syntax.Asterisk2EqualsToken,
    '/=': Syntax.SlashEqualsToken,
    '%=': Syntax.PercentEqualsToken,
    '<<=': Syntax.LessThan2EqualsToken,
    '>>=': Syntax.GreaterThan2EqualsToken,
    '>>>=': Syntax.GreaterThan3EqualsToken,
    '&=': Syntax.AmpersandEqualsToken,
    '|=': Syntax.BarEqualsToken,
    '^=': Syntax.CaretEqualsToken,
    '@': Syntax.AtToken,
    '`': Syntax.BacktickToken,
  });
  const tokStrings = strToTok.reverse();

  export interface Parser {}
  function parser() {
    const scanner = Scanner.create(true);
    let currentToken: Syntax;
    let identifiers: QMap<string>;
    let privateIdentifiers: QMap<string>;

    const withDisallowInDecoratorContext = NodeFlags.DisallowInContext | NodeFlags.DecoratorContext;
    let sourceFile: SourceFile;
    let parseDiagnostics: DiagnosticWithLocation[];
    let syntaxCursor: IncrementalParser.SyntaxCursor | undefined;
    let sourceText: string;
    let notParenthesizedArrow: QMap<true> | undefined;
    let parseErrorBeforeNextFinishedNode = false;

    const tok = () => currentToken;
    const getNodePos = () => scanner.getStartPos();

    const is = new (class {
      isIdentifier() {
        if (tok() === Syntax.Identifier) return true;
        if (tok() === Syntax.YieldKeyword && flags.inContext(NodeFlags.YieldContext)) return false;
        if (tok() === Syntax.AwaitKeyword && flags.inContext(NodeFlags.AwaitContext)) return false;
        return tok() > Syntax.LastReservedWord;
      }
      isLiteralPropertyName(): boolean {
        return identifierOrKeyword(tok()) || tok() === Syntax.StringLiteral || tok() === Syntax.NumericLiteral;
      }
      isValidHeritageClauseObjectLiteral() {
        assert(tok() === Syntax.OpenBraceToken);
        if (next.tok() === Syntax.CloseBraceToken) {
          const t = next.tok();
          return t === Syntax.CommaToken || t === Syntax.OpenBraceToken || t === Syntax.ExtendsKeyword || t === Syntax.ImplementsKeyword;
        }
        return true;
      }
      isHeritageClauseExtendsOrImplementsKeyword(): boolean {
        if (tok() === Syntax.ImplementsKeyword || tok() === Syntax.ExtendsKeyword) return lookAhead(next.isStartOfExpression);
        return false;
      }
      isVariableDeclaratorListTerminator(): boolean {
        if (can.parseSemicolon()) return true;
        if (isInOrOfKeyword(tok())) return true;
        if (tok() === Syntax.EqualsGreaterThanToken) return true;
        return false;
      }
      isStartOfParameter(isJSDocParameter: boolean): boolean {
        return tok() === Syntax.Dot3Token || isIdentifierOrPrivateIdentifierOrPattern() || isModifierKind(tok()) || tok() === Syntax.AtToken || isStartOfType(!isJSDocParameter);
      }
      isIndexSignature(): boolean {
        return tok() === Syntax.OpenBracketToken && lookAhead(isUnambiguouslyIndexSignature);
      }
      isUnambiguouslyIndexSignature() {
        next.tok();
        if (tok() === Syntax.Dot3Token || tok() === Syntax.CloseBracketToken) return true;
        if (isModifierKind(tok())) {
          next.tok();
          if (isIdentifier()) return true;
        } else if (!isIdentifier()) return false;
        else next.tok();
        if (tok() === Syntax.ColonToken || tok() === Syntax.CommaToken) return true;
        if (tok() !== Syntax.QuestionToken) return false;
        next.tok();
        return tok() === Syntax.ColonToken || tok() === Syntax.CommaToken || tok() === Syntax.CloseBracketToken;
      }
      isTypeMemberStart(): boolean {
        if (tok() === Syntax.OpenParenToken || tok() === Syntax.LessThanToken) return true;
        let idToken = false;
        while (isModifierKind(tok())) {
          idToken = true;
          next.tok();
        }
        if (tok() === Syntax.OpenBracketToken) return true;
        if (isLiteralPropertyName()) {
          idToken = true;
          next.tok();
        }
        if (idToken) {
          return (
            tok() === Syntax.OpenParenToken || tok() === Syntax.LessThanToken || tok() === Syntax.QuestionToken || tok() === Syntax.ColonToken || tok() === Syntax.CommaToken || can.parseSemicolon()
          );
        }
        return false;
      }
      isStartOfMappedType() {
        next.tok();
        if (tok() === Syntax.PlusToken || tok() === Syntax.MinusToken) return next.tok() === Syntax.ReadonlyKeyword;
        if (tok() === Syntax.ReadonlyKeyword) next.tok();
        return tok() === Syntax.OpenBracketToken && next.isIdentifier() && next.tok() === Syntax.InKeyword;
      }
      isTupleElementName() {
        if (tok() === Syntax.Dot3Token) return identifierOrKeyword(next.tok()) && next.isColonOrQuestionColon();
        return identifierOrKeyword(tok()) && next.isColonOrQuestionColon();
      }
      isStartOfTypeOfImportType() {
        next.tok();
        return tok() === Syntax.ImportKeyword;
      }
      isStartOfType(inStartOfParameter?: boolean): boolean {
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
            return !inStartOfParameter;
          case Syntax.MinusToken:
            return !inStartOfParameter && lookAhead(next.isNumericOrBigIntLiteral);
          case Syntax.OpenParenToken:
            // Only consider '(' the start of a type if followed by ')', '...', an identifier, a modifier,
            // or something that starts a type. We don't want to consider things like '(1)' a type.
            return !inStartOfParameter && lookAhead(isStartOfParenthesizedOrFunctionType);
          default:
            return isIdentifier();
        }
      }
      isStartOfParenthesizedOrFunctionType() {
        next.tok();
        return tok() === Syntax.CloseParenToken || isStartOfParameter(/*isJSDocParameter*/ false) || isStartOfType();
      }
      isStartOfFunctionType(): boolean {
        if (tok() === Syntax.LessThanToken) return true;
        return tok() === Syntax.OpenParenToken && lookAhead(isUnambiguouslyStartOfFunctionType);
      }
      isUnambiguouslyStartOfFunctionType() {
        next.tok();
        if (tok() === Syntax.CloseParenToken || tok() === Syntax.Dot3Token) return true;
        if (skipParameterStart()) {
          if (tok() === Syntax.ColonToken || tok() === Syntax.CommaToken || tok() === Syntax.QuestionToken || tok() === Syntax.EqualsToken) return true;
          if (tok() === Syntax.CloseParenToken) {
            next.tok();
            if (tok() === Syntax.EqualsGreaterThanToken) return true;
          }
        }
        return false;
      }
      isStartOfLeftHandSideExpression() {
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
            return isIdentifier();
        }
      }
      isStartOfExpression() {
        if (isStartOfLeftHandSideExpression()) return true;
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
            if (isBinaryOperator()) return true;
            return isIdentifier();
        }
      }
      isStartOfExpressionStatement() {
        return tok() !== Syntax.OpenBraceToken && tok() !== Syntax.FunctionKeyword && tok() !== Syntax.ClassKeyword && tok() !== Syntax.AtToken && isStartOfExpression();
      }
      isYieldExpression() {
        if (tok() === Syntax.YieldKeyword) {
          if (flags.inContext(NodeFlags.YieldContext)) return true;
          return lookAhead(next.isIdentifierOrKeywordOrLiteralOnSameLine);
        }
        return false;
      }
      isParenthesizedArrowFunctionExpression(): Tristate {
        if (tok() === Syntax.OpenParenToken || tok() === Syntax.LessThanToken || tok() === Syntax.AsyncKeyword) {
          return lookAhead(isParenthesizedArrowFunctionExpressionWorker);
        }
        if (tok() === Syntax.EqualsGreaterThanToken) return Tristate.True;
        return Tristate.False;
      }
      isParenthesizedArrowFunctionExpressionWorker(): Tristate {
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
          if (isModifierKind(second) && second !== Syntax.AsyncKeyword && lookAhead(nextTokenIsIdentifier)) return Tristate.True;
          if (!isIdentifier() && second !== Syntax.ThisKeyword) return Tristate.False;
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
          assert(first === Syntax.LessThanToken);
          if (!isIdentifier()) return Tristate.False;
          if (sourceFile.languageVariant === LanguageVariant.JSX) {
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
      }
      isUnParenthesizedAsyncArrowFunctionWorker(): Tristate {
        if (tok() === Syntax.AsyncKeyword) {
          next.tok();
          if (scanner.hasPrecedingLineBreak() || tok() === Syntax.EqualsGreaterThanToken) return Tristate.False;
          const expr = parse.binaryExpressionOrHigher(/*precedence*/ 0);
          if (!scanner.hasPrecedingLineBreak() && expr.kind === Syntax.Identifier && tok() === Syntax.EqualsGreaterThanToken) return Tristate.True;
        }
        return Tristate.False;
      }
      isInOrOfKeyword(t: Syntax) {
        return t === Syntax.InKeyword || t === Syntax.OfKeyword;
      }
      isBinaryOperator() {
        if (flags.inContext(NodeFlags.DisallowInContext) && tok() === Syntax.InKeyword) return false;

        return getBinaryOperatorPrecedence(tok()) > 0;
      }
      isAwaitExpression() {
        if (tok() === Syntax.AwaitKeyword) {
          if (flags.inContext(NodeFlags.AwaitContext)) return true;
          return lookAhead(next.isIdentifierOrKeywordOrLiteralOnSameLine);
        }
        return false;
      }
      isUpdateExpression() {
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
            if (sourceFile.languageVariant !== LanguageVariant.JSX) return false;
          default:
            return true;
        }
      }
      isStartOfOptionalPropertyOrElementAccessChain() {
        return tok() === Syntax.QuestionDotToken && lookAhead(next.isIdentifierOrKeywordOrOpenBracketOrTemplate);
      }
      isTemplateStartOfTaggedTemplate() {
        return tok() === Syntax.NoSubstitutionLiteral || tok() === Syntax.TemplateHead;
      }
      isDeclaration() {
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
              return !scanner.hasPrecedingLineBreak() && isIdentifier();
            case Syntax.ModuleKeyword:
            case Syntax.NamespaceKeyword:
              next.tok();
              return !scanner.hasPrecedingLineBreak() && (isIdentifier() || tok() === Syntax.StringLiteral);
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
              return tok() === Syntax.StringLiteral || tok() === Syntax.AsteriskToken || tok() === Syntax.OpenBraceToken || identifierOrKeyword(tok());
            case Syntax.ExportKeyword:
              let currentToken = next.tok();
              if (currentToken === Syntax.TypeKeyword) currentToken = lookAhead(nextToken);
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
      }
      isStartOfDeclaration() {
        return lookAhead(isDeclaration);
      }
      isStartOfStatement() {
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
            return isStartOfDeclaration() || lookAhead(next.isOpenParenOrLessThanOrDot);
          case Syntax.ConstKeyword:
          case Syntax.ExportKeyword:
            return isStartOfDeclaration();
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
            return isStartOfDeclaration() || !lookAhead(next.isIdentifierOrKeywordOnSameLine);
          default:
            return isStartOfExpression();
        }
      }
      isLetDeclaration() {
        return lookAhead(next.isIdentifierOrStartOfDestructuring);
      }
      isDeclareModifier(modifier: Modifier) {
        return modifier.kind === Syntax.DeclareKeyword;
      }
      isIdentifierOrPrivateIdentifierOrPattern() {
        return tok() === Syntax.OpenBraceToken || tok() === Syntax.OpenBracketToken || tok() === Syntax.PrivateIdentifier || isIdentifier();
      }
      isClassMemberStart() {
        let idToken: Syntax | undefined;
        if (tok() === Syntax.AtToken) return true;
        while (isModifierKind(tok())) {
          idToken = tok();
          if (isClassMemberModifier(idToken)) return true;
          next.tok();
        }
        if (tok() === Syntax.AsteriskToken) return true;
        if (isLiteralPropertyName()) {
          idToken = tok();
          next.tok();
        }
        if (tok() === Syntax.OpenBracketToken) return true;
        if (idToken !== undefined) {
          if (!isKeyword(idToken) || idToken === Syntax.SetKeyword || idToken === Syntax.GetKeyword) return true;
          switch (tok()) {
            case Syntax.OpenParenToken: // Method declaration
            case Syntax.LessThanToken: // Generic Method declaration
            case Syntax.ExclamationToken: // Non-null assertion on property name
            case Syntax.ColonToken: // Type Annotation for declaration
            case Syntax.EqualsToken: // Initializer for declaration
            case Syntax.QuestionToken: // Not valid, but permitted so that it gets caught later on.
              return true;
            default:
              return can.parseSemicolon();
          }
        }
        return false;
      }
      isImplementsClause() {
        return tok() === Syntax.ImplementsKeyword && lookAhead(next.isIdentifierOrKeyword);
      }
      isHeritageClause() {
        return tok() === Syntax.ExtendsKeyword || tok() === Syntax.ImplementsKeyword;
      }
      isExternalModuleReference() {
        return tok() === Syntax.RequireKeyword && lookAhead(next.isOpenParen);
      }
      isAnExternalModuleIndicatorNode(n: Node) {
        return hasModifierOfKind(n, Syntax.ExportKeyword) ||
          (n.kind === Syntax.ImportEqualsDeclaration && (<ImportEqualsDeclaration>n).moduleReference.kind === Syntax.ExternalModuleReference) ||
          n.kind === Syntax.ImportDeclaration ||
          n.kind === Syntax.ExportAssignment ||
          n.kind === Syntax.ExportDeclaration
          ? n
          : undefined;
      }
      isImportMeta(n: Node): boolean {
        return isMetaProperty(n) && n.keywordToken === Syntax.ImportKeyword && n.name.escapedText === 'meta';
      }
      isObjectOrObjectArrayTypeReference(n: TypeNode): boolean {
        switch (n.kind) {
          case Syntax.ObjectKeyword:
            return true;
          case Syntax.ArrayType:
            return isObjectOrObjectArrayTypeReference((n as ArrayTypeNode).elementType);
          default:
            return TypeReferenceNode.kind(n) && isIdentifier(n.typeName) && n.typeName.escapedText === 'Object' && !n.typeArguments;
        }
      }
      isNextNonwhitespaceTokenEndOfFile(): boolean {
        while (true) {
          next.tokJSDoc();
          if (tok() === Syntax.EndOfFileToken) return true;
          if (!(tok() === Syntax.WhitespaceTrivia || tok() === Syntax.NewLineTrivia)) return false;
        }
      }
      isMissingList(ns: NodeArray<Node>): boolean {
        return !!(ns as MissingList<Node>).isMissingList;
      }
    })();
    const can = new (class {
      parseSemicolon() {
        if (tok() === Syntax.SemicolonToken) return true;
        return tok() === Syntax.CloseBraceToken || tok() === Syntax.EndOfFileToken || scanner.hasPrecedingLineBreak();
      }
      followModifier() {
        return tok() === Syntax.OpenBracketToken || tok() === Syntax.OpenBraceToken || tok() === Syntax.AsteriskToken || tok() === Syntax.Dot3Token || isLiteralPropertyName();
      }
      followExportModifier() {
        return tok() !== Syntax.AsteriskToken && tok() !== Syntax.AsKeyword && tok() !== Syntax.OpenBraceToken && can.followModifier();
      }
      followContextualOfKeyword() {
        return next.isIdentifier() && next.tok() === Syntax.CloseParenToken;
      }
      followTypeArgumentsInExpression() {
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
        if (check && isKeyword(currentToken) && (scanner.hasUnicodeEscape() || scanner.hasExtendedEscape())) {
          parse.errorAt(scanner.getTokenPos(), scanner.getTextPos(), Diagnostics.Keywords_cannot_contain_escape_characters);
        }
        return (currentToken = scanner.scan());
      }
      tokJSDoc(): JSDocSyntax {
        return (currentToken = scanner.scanJsDocToken());
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
        return isIdentifier();
      }
      isIdentifierOrKeyword() {
        this.tok();
        return identifierOrKeyword(tok());
      }
      isIdentifierOrKeywordOrGreaterThan() {
        this.tok();
        return identifierOrKeywordOrGreaterThan(tok());
      }
      isStartOfExpression() {
        this.tok();
        return isStartOfExpression();
      }
      isStartOfType() {
        this.tok();
        return isStartOfType();
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
        return identifierOrKeyword(tok()) || tok() === Syntax.OpenBracketToken || isTemplateStartOfTaggedTemplate();
      }
      isIdentifierOrKeywordOnSameLine() {
        this.tok();
        return identifierOrKeyword(tok()) && !scanner.hasPrecedingLineBreak();
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
        return (identifierOrKeyword(tok()) || tok() === Syntax.NumericLiteral || tok() === Syntax.BigIntLiteral || tok() === Syntax.StringLiteral) && !scanner.hasPrecedingLineBreak();
      }
      isIdentifierOrStartOfDestructuring() {
        this.tok();
        return isIdentifier() || tok() === Syntax.OpenBraceToken || tok() === Syntax.OpenBracketToken;
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
    interface MissingList<T extends Node> extends NodeArray<T> {
      isMissingList: true;
    }
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
      createSourceFile(fileName: string, languageVersion: ScriptTarget, scriptKind: ScriptKind, isDeclarationFile: boolean): SourceFile {
        const s = <SourceFile>new SourceFileC(Syntax.SourceFile, /*pos*/ 0, /* end */ sourceText.length);
        this.nodeCount++;
        s.text = sourceText;
        s.bindDiagnostics = [];
        s.bindSuggestionDiagnostics = undefined;
        s.languageVersion = languageVersion;
        s.fileName = normalizePath(fileName);
        s.languageVariant = getLanguageVariant(scriptKind);
        s.isDeclarationFile = isDeclarationFile;
        s.scriptKind = scriptKind;
        return s;
      }
      node<T extends Syntax>(k: T, pos?: number): NodeType<T> {
        this.nodeCount++;
        const p = pos! >= 0 ? pos! : scanner.getStartPos();
        return Node.create<T>(k, p, p);
      }
      nodeArray<T extends Node>(es: T[], pos: number, end?: number): NodeArray<T> {
        const l = es.length;
        const r = (l >= 1 && l <= 4 ? es.slice() : es) as MutableNodeArray<T>;
        r.pos = pos;
        r.end = end === undefined ? scanner.getStartPos() : end;
        return r;
      }
      missingNode<T extends Node>(k: T['kind'], report: false, m?: DiagnosticMessage, arg0?: any): T;
      missingNode<T extends Node>(k: T['kind'], report: true, m: DiagnosticMessage, arg0?: any): T;
      missingNode<T extends Node>(k: T['kind'], report: boolean, m?: DiagnosticMessage, arg0?: any): T {
        if (report) parse.errorAtPosition(scanner.getStartPos(), 0, m!, arg0);
        else if (m) parse.errorAtToken(m, arg0);
        const r = create.node(k);
        if (k === Syntax.Identifier) (r as Identifier).escapedText = '' as __String;
        else if (isLiteralKind(k) || isTemplateLiteralKind(k)) (r as LiteralLikeNode).text = '';
        return finishNode(r);
      }
      nodeWithJSDoc<T extends Syntax>(k: T, pos?: number): NodeType<T> {
        const n = create.node(k, pos);
        if (scanner.getTokenFlags() & TokenFlags.PrecedingJSDocComment && (k !== Syntax.ExpressionStatement || tok() !== Syntax.OpenParenToken)) {
          addJSDocComment(n);
        }
        return n;
      }
      identifier(isIdentifier: boolean, m?: DiagnosticMessage, pm?: DiagnosticMessage): Identifier {
        this.identifierCount++;
        if (isIdentifier) {
          const n = create.node(Syntax.Identifier);
          if (tok() !== Syntax.Identifier) n.originalKeywordKind = tok();
          n.escapedText = Scanner.escUnderscores(internIdentifier(scanner.getTokenValue()));
          next.tok(false);
          return finishNode(n);
        }
        if (tok() === Syntax.PrivateIdentifier) {
          parse.errorAtToken(pm || Diagnostics.Private_identifiers_are_not_allowed_outside_class_bodies);
          return create.identifier(true);
        }
        const report = tok() === Syntax.EndOfFileToken;
        const r = scanner.isReservedWord();
        const t = scanner.getTokenText();
        const dm = r ? Diagnostics.Identifier_expected_0_is_a_reserved_word_that_cannot_be_used_here : Diagnostics.Identifier_expected;
        return create.missingNode<Identifier>(Syntax.Identifier, report, m || dm, t);
      }
      missingList<T extends Node>(): MissingList<T> {
        const l = create.nodeArray<T>([], getNodePos()) as MissingList<T>;
        l.isMissingList = true;
        return l;
      }
      qualifiedName(e: EntityName, name: Identifier): QualifiedName {
        const n = create.node(Syntax.QualifiedName, e.pos);
        n.left = e;
        n.right = name;
        return finishNode(n);
      }
      postfixType(k: Syntax, type: TypeNode) {
        next.tok();
        const n = create.node(k, type.pos) as OptionalTypeNode | JSDocOptionalType | JSDocNonNullableType | JSDocNullableType;
        n.type = type;
        return finishNode(n);
      }
      createJSDocComment(): JSDoc {
        const n = create.node(Syntax.JSDocComment, start);
        n.tags = tags && create.nodeArray(tags, tagsPos, tagsEnd);
        n.comment = comments.length ? comments.join('') : undefined;
        return finishNode(n, end);
      }
    })();
    const ctx = new (class {
      value = 0 as Parser.Context;
      init() {
        this.value = 0;
      }
      parseList<T extends Node>(c: Parser.Context, cb: () => T): NodeArray<T> {
        const o = this.value;
        this.value |= 1 << c;
        const es = [] as T[];
        const p = getNodePos();
        while (!this.isListTerminator(c)) {
          if (isListElement(c, false)) {
            const e = this.parseListElement(c, cb);
            es.push(e);
            continue;
          }
          if (this.abort(c)) break;
        }
        this.value = o;
        return create.nodeArray(es, p);
      }
      parseBracketedList<T extends Node>(c: Parser.Context, cb: () => T, open: Syntax, close: Syntax): NodeArray<T> {
        if (parse.expected(open)) {
          const r = this.parseDelimitedList(c, cb);
          parse.expected(close);
          return r;
        }
        return create.missingList<T>();
      }
      parseDelimitedList<T extends Node>(c: Parser.Context, cb: () => T, semicolon?: boolean): NodeArray<T> {
        const o = this.value;
        this.value |= 1 << c;
        const es = [] as T[];
        const p = getNodePos();
        let s = -1;
        const commaDiag = () => {
          return c === Parser.Context.EnumMembers ? Diagnostics.An_enum_member_name_must_be_followed_by_a_or : undefined;
        };
        while (true) {
          if (this.isListElement(c, false)) {
            const sp = scanner.getStartPos();
            es.push(this.parseListElement(c, cb));
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
        const r = create.nodeArray(es, p);
        if (s >= 0) r.hasTrailingComma = true;
        return r;
      }
      parseJsxChildren(tag: JsxOpeningElement | JsxOpeningFragment): NodeArray<JsxChild> {
        const list = [];
        const listPos = getNodePos();
        const o = this.value;
        this.value |= 1 << Parser.Context.JsxChildren;
        while (true) {
          const child = parseJsx.child(tag, (currentToken = scanner.reScanJsxToken()));
          if (!child) break;
          list.push(child);
        }
        this.value = o;
        return create.nodeArray(list, listPos);
      }
      tryReuseAmbientDeclaration(): Statement | undefined {
        return flags.withContext(NodeFlags.Ambient, () => {
          const n = this.nodeFor(this.value);
          if (n) return consumeNode(n) as Statement;
          return;
        });
      }
      private nodeFor(c: Parser.Context): Node | undefined {
        const isReusable = () => {
          switch (c) {
            case Parser.Context.ClassMembers:
            case Parser.Context.SwitchClauses:
            case Parser.Context.SourceElements:
            case Parser.Context.BlockStatements:
            case Parser.Context.SwitchClauseStatements:
            case Parser.Context.EnumMembers:
            case Parser.Context.TypeMembers:
            case Parser.Context.VariableDeclarations:
            case Parser.Context.JSDocParameters:
            case Parser.Context.Parameters:
              return true;
          }
          return false;
        };
        if (!syntaxCursor || !isReusable() || parseErrorBeforeNextFinishedNode) return;
        const n = syntaxCursor.currentNode(scanner.getStartPos());
        if (nodeIsMissing(n) || n.intersectsChange || containsParseError(n)) return;
        const fs = n.flags & NodeFlags.ContextFlags;
        if (fs !== flags.value) return;
        const canReuse = () => {
          switch (c) {
            case Parser.Context.ClassMembers:
              switch (n.kind) {
                case Syntax.Constructor:
                case Syntax.IndexSignature:
                case Syntax.GetAccessor:
                case Syntax.SetAccessor:
                case Syntax.PropertyDeclaration:
                case Syntax.SemicolonClassElement:
                  return true;
                case Syntax.MethodDeclaration:
                  const n2 = n as MethodDeclaration;
                  return !(n2.name.kind === Syntax.Identifier && n2.name.originalKeywordKind === Syntax.ConstructorKeyword);
              }
              break;
            case Parser.Context.SwitchClauses:
              switch (n.kind) {
                case Syntax.CaseClause:
                case Syntax.DefaultClause:
                  return true;
              }
              break;
            case Parser.Context.SourceElements:
            case Parser.Context.BlockStatements:
            case Parser.Context.SwitchClauseStatements:
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
            case Parser.Context.EnumMembers:
              return n.kind === Syntax.EnumMember;
            case Parser.Context.TypeMembers:
              switch (n.kind) {
                case Syntax.ConstructSignature:
                case Syntax.MethodSignature:
                case Syntax.IndexSignature:
                case Syntax.PropertySignature:
                case Syntax.CallSignature:
                  return true;
              }
              break;
            case Parser.Context.VariableDeclarations:
              if (n.kind === Syntax.VariableDeclaration) return (n as VariableDeclaration).initializer === undefined;
              break;
            case Parser.Context.JSDocParameters:
            case Parser.Context.Parameters:
              if (n.kind === Syntax.Parameter) return (n as ParameterDeclaration).initializer === undefined;
          }
          return false;
        };
        if (!canReuse()) return;
        if ((n as JSDocContainer).jsDocCache) (n as JSDocContainer).jsDocCache = undefined;
        return n;
      }
      private isListElement(c: Parser.Context, error: boolean) {
        if (this.nodeFor(c)) return true;
        switch (c) {
          case Parser.Context.SourceElements:
          case Parser.Context.BlockStatements:
          case Parser.Context.SwitchClauseStatements:
            return !(tok() === Syntax.SemicolonToken && error) && isStartOfStatement();
          case Parser.Context.SwitchClauses:
            return tok() === Syntax.CaseKeyword || tok() === Syntax.DefaultKeyword;
          case Parser.Context.TypeMembers:
            return lookAhead(isTypeMemberStart);
          case Parser.Context.ClassMembers:
            return lookAhead(isClassMemberStart) || (tok() === Syntax.SemicolonToken && !error);
          case Parser.Context.EnumMembers:
            return tok() === Syntax.OpenBracketToken || isLiteralPropertyName();
          case Parser.Context.ObjectLiteralMembers:
            switch (tok()) {
              case Syntax.OpenBracketToken:
              case Syntax.AsteriskToken:
              case Syntax.Dot3Token:
              case Syntax.DotToken:
                return true;
              default:
                return isLiteralPropertyName();
            }
          case Parser.Context.RestProperties:
            return isLiteralPropertyName();
          case Parser.Context.ObjectBindingElements:
            return tok() === Syntax.OpenBracketToken || tok() === Syntax.Dot3Token || isLiteralPropertyName();
          case Parser.Context.HeritageClauseElement:
            if (tok() === Syntax.OpenBraceToken) return lookAhead(isValidHeritageClauseObjectLiteral);
            if (!error) return isStartOfLeftHandSideExpression() && !isHeritageClauseExtendsOrImplementsKeyword();
            return isIdentifier() && !isHeritageClauseExtendsOrImplementsKeyword();
          case Parser.Context.VariableDeclarations:
            return isIdentifierOrPrivateIdentifierOrPattern();
          case Parser.Context.ArrayBindingElements:
            return tok() === Syntax.CommaToken || tok() === Syntax.Dot3Token || isIdentifierOrPrivateIdentifierOrPattern();
          case Parser.Context.TypeParameters:
            return isIdentifier();
          case Parser.Context.ArrayLiteralMembers:
            switch (tok()) {
              case Syntax.CommaToken:
              case Syntax.DotToken:
                return true;
            }
          case Parser.Context.ArgumentExpressions:
            return tok() === Syntax.Dot3Token || isStartOfExpression();
          case Parser.Context.Parameters:
            return isStartOfParameter(false);
          case Parser.Context.JSDocParameters:
            return isStartOfParameter(true);
          case Parser.Context.TypeArguments:
          case Parser.Context.TupleElementTypes:
            return tok() === Syntax.CommaToken || isStartOfType();
          case Parser.Context.HeritageClauses:
            return isHeritageClause();
          case Parser.Context.ImportOrExportSpecifiers:
            return identifierOrKeyword(tok());
          case Parser.Context.JsxAttributes:
            return identifierOrKeyword(tok()) || tok() === Syntax.OpenBraceToken;
          case Parser.Context.JsxChildren:
            return true;
        }
        return fail("Non-exhaustive case in 'isListElement'.");
      }
      private isListTerminator(c: Parser.Context) {
        if (tok() === Syntax.EndOfFileToken) return true;
        switch (c) {
          case Parser.Context.BlockStatements:
          case Parser.Context.SwitchClauses:
          case Parser.Context.TypeMembers:
          case Parser.Context.ClassMembers:
          case Parser.Context.EnumMembers:
          case Parser.Context.ObjectLiteralMembers:
          case Parser.Context.ObjectBindingElements:
          case Parser.Context.ImportOrExportSpecifiers:
            return tok() === Syntax.CloseBraceToken;
          case Parser.Context.SwitchClauseStatements:
            return tok() === Syntax.CloseBraceToken || tok() === Syntax.CaseKeyword || tok() === Syntax.DefaultKeyword;
          case Parser.Context.HeritageClauseElement:
            return tok() === Syntax.OpenBraceToken || tok() === Syntax.ExtendsKeyword || tok() === Syntax.ImplementsKeyword;
          case Parser.Context.VariableDeclarations:
            return isVariableDeclaratorListTerminator();
          case Parser.Context.TypeParameters:
            return tok() === Syntax.GreaterThanToken || tok() === Syntax.OpenParenToken || tok() === Syntax.OpenBraceToken || tok() === Syntax.ExtendsKeyword || tok() === Syntax.ImplementsKeyword;
          case Parser.Context.ArgumentExpressions:
            return tok() === Syntax.CloseParenToken || tok() === Syntax.SemicolonToken;
          case Parser.Context.ArrayLiteralMembers:
          case Parser.Context.TupleElementTypes:
          case Parser.Context.ArrayBindingElements:
            return tok() === Syntax.CloseBracketToken;
          case Parser.Context.JSDocParameters:
          case Parser.Context.Parameters:
          case Parser.Context.RestProperties:
            return tok() === Syntax.CloseParenToken || tok() === Syntax.CloseBracketToken /*|| token === Syntax.OpenBraceToken*/;
          case Parser.Context.TypeArguments:
            return tok() !== Syntax.CommaToken;
          case Parser.Context.HeritageClauses:
            return tok() === Syntax.OpenBraceToken || tok() === Syntax.CloseBraceToken;
          case Parser.Context.JsxAttributes:
            return tok() === Syntax.GreaterThanToken || tok() === Syntax.SlashToken;
          case Parser.Context.JsxChildren:
            return tok() === Syntax.LessThanToken && lookAhead(next.isSlash);
          default:
            return false;
        }
      }
      private parseListElement<T extends Node>(c: Parser.Context, cb: () => T): T {
        const n = this.nodeFor(c);
        if (n) return <T>consumeNode(n);
        return cb();
      }
      private abort(c: Parser.Context) {
        const errors = (): DiagnosticMessage => {
          switch (c) {
            case Parser.Context.SourceElements:
              return Diagnostics.Declaration_or_statement_expected;
            case Parser.Context.BlockStatements:
              return Diagnostics.Declaration_or_statement_expected;
            case Parser.Context.SwitchClauses:
              return Diagnostics.case_or_default_expected;
            case Parser.Context.SwitchClauseStatements:
              return Diagnostics.Statement_expected;
            case Parser.Context.RestProperties:
            case Parser.Context.TypeMembers:
              return Diagnostics.Property_or_signature_expected;
            case Parser.Context.ClassMembers:
              return Diagnostics.Unexpected_token_A_constructor_method_accessor_or_property_was_expected;
            case Parser.Context.EnumMembers:
              return Diagnostics.Enum_member_expected;
            case Parser.Context.HeritageClauseElement:
              return Diagnostics.Expression_expected;
            case Parser.Context.VariableDeclarations:
              return Diagnostics.Variable_declaration_expected;
            case Parser.Context.ObjectBindingElements:
              return Diagnostics.Property_destructuring_pattern_expected;
            case Parser.Context.ArrayBindingElements:
              return Diagnostics.Array_element_destructuring_pattern_expected;
            case Parser.Context.ArgumentExpressions:
              return Diagnostics.Argument_expression_expected;
            case Parser.Context.ObjectLiteralMembers:
              return Diagnostics.Property_assignment_expected;
            case Parser.Context.ArrayLiteralMembers:
              return Diagnostics.Expression_or_comma_expected;
            case Parser.Context.JSDocParameters:
              return Diagnostics.Parameter_declaration_expected;
            case Parser.Context.Parameters:
              return Diagnostics.Parameter_declaration_expected;
            case Parser.Context.TypeParameters:
              return Diagnostics.Type_parameter_declaration_expected;
            case Parser.Context.TypeArguments:
              return Diagnostics.Type_argument_expected;
            case Parser.Context.TupleElementTypes:
              return Diagnostics.Type_expected;
            case Parser.Context.HeritageClauses:
              return Diagnostics.Unexpected_token_expected;
            case Parser.Context.ImportOrExportSpecifiers:
              return Diagnostics.Identifier_expected;
            case Parser.Context.JsxAttributes:
              return Diagnostics.Identifier_expected;
            case Parser.Context.JsxChildren:
              return Diagnostics.Identifier_expected;
            default:
              return undefined!;
          }
        };
        parse.errorAtToken(errors());
        for (let c = 0; c < Parser.Context.Count; c++) {
          if (this.value & (1 << c)) {
            if (this.isListElement(c, true) || this.isListTerminator(c)) return true;
          }
        }
        next.tok();
        return false;
      }
    })();
    const parse = new (class {
      expected(t: Syntax, m?: DiagnosticMessage, advance = true): boolean {
        if (tok() === t) {
          if (advance) next.tok();
          return true;
        }
        if (m) this.errorAtToken(m);
        else this.errorAtToken(Diagnostics._0_expected, toString(t));
        return false;
      }
      expectedToken<T extends Syntax>(t: T, m?: DiagnosticMessage, arg0?: any): Token<T>;
      expectedToken(t: Syntax, m?: DiagnosticMessage, arg0?: any): Node {
        return this.optionalToken(t) || create.missingNode(t, false, m || Diagnostics._0_expected, arg0 || toString(t));
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
      identifier(m?: DiagnosticMessage, pm?: DiagnosticMessage): Identifier {
        return create.identifier(isIdentifier(), m, pm);
      }
      identifierName(m?: DiagnosticMessage): Identifier {
        return create.identifier(identifierOrKeyword(tok()), m);
      }
      propertyName(computed = true): PropertyName {
        if (tok() === Syntax.StringLiteral || tok() === Syntax.NumericLiteral) {
          const n = this.literalNode() as StringLiteral | NumericLiteral;
          n.text = internIdentifier(n.text);
          return n;
        }
        if (computed && tok() === Syntax.OpenBracketToken) return this.computedPropertyName();
        if (tok() === Syntax.PrivateIdentifier) return this.privateIdentifier();
        return this.identifierName();
      }
      computedPropertyName(): ComputedPropertyName {
        const n = create.node(Syntax.ComputedPropertyName);
        this.expected(Syntax.OpenBracketToken);
        n.expression = flags.withoutDisallowIn(this.expression);
        this.expected(Syntax.CloseBracketToken);
        return finishNode(n);
      }
      privateIdentifier(): PrivateIdentifier {
        const n = create.node(Syntax.PrivateIdentifier);
        n.escapedText = Scanner.escUnderscores(internPrivateIdentifier(scanner.getTokenText()));
        next.tok();
        return finishNode(n);
      }
      contextualModifier(t: Syntax): boolean {
        return tok() === t && tryParse(next.canFollowModifier);
      }
      entityName(reserved: boolean, m?: DiagnosticMessage): EntityName {
        let e: EntityName = reserved ? this.identifierName(m) : this.identifier(m);
        let p = scanner.getStartPos();
        while (this.optional(Syntax.DotToken)) {
          if (tok() === Syntax.LessThanToken) {
            e.jsdocDotPos = p;
            break;
          }
          p = scanner.getStartPos();
          e = create.qualifiedName(e, this.rightSideOfDot(reserved, false) as Identifier);
        }
        return e;
      }
      rightSideOfDot(allow: boolean, privates: boolean): Identifier | PrivateIdentifier {
        if (scanner.hasPrecedingLineBreak() && identifierOrKeyword(tok())) {
          const m = lookAhead(next.isIdentifierOrKeywordOnSameLine);
          if (m) return create.missingNode<Identifier>(Syntax.Identifier, true, Diagnostics.Identifier_expected);
        }
        if (tok() === Syntax.PrivateIdentifier) {
          const n = this.privateIdentifier();
          return privates ? n : create.missingNode<Identifier>(Syntax.Identifier, true, Diagnostics.Identifier_expected);
        }
        return allow ? this.identifierName() : this.identifier();
      }
      templateExpression(tagged: boolean): TemplateExpression {
        const n = create.node(Syntax.TemplateExpression);
        const templateHead = (): TemplateHead => {
          if (tagged) reScanHeadOrNoSubstTemplate();
          const n2 = this.literalLikeNode(tok());
          assert(n2.kind === Syntax.TemplateHead, 'Template head has wrong token kind');
          return n2 as TemplateHead;
        };
        n.head = templateHead();
        assert(n.head.kind === Syntax.TemplateHead, 'Template head has wrong token kind');
        const ss = [];
        const p = getNodePos();
        do {
          ss.push(this.templateSpan(tagged));
        } while (last(ss).literal.kind === Syntax.TemplateMiddle);
        n.templateSpans = create.nodeArray(ss, p);
        return finishNode(n);
      }
      templateSpan(tagged: boolean): TemplateSpan {
        const n = create.node(Syntax.TemplateSpan);
        n.expression = flags.withoutDisallowIn(this.expression);
        let l: TemplateMiddle | TemplateTail;
        if (tok() === Syntax.CloseBraceToken) {
          reScanTemplateToken(tagged);
          const middleOrTail = (): TemplateMiddle | TemplateTail => {
            const n2 = this.literalLikeNode(tok());
            assert(n2.kind === Syntax.TemplateMiddle || n2.kind === Syntax.TemplateTail, 'Template fragment has wrong token kind');
            return n2 as TemplateMiddle | TemplateTail;
          };
          l = middleOrTail();
        } else {
          l = this.expectedToken(Syntax.TemplateTail, Diagnostics._0_expected, toString(Syntax.CloseBraceToken)) as TemplateTail;
        }
        n.literal = l;
        return finishNode(n);
      }
      literalNode(): LiteralExpression {
        return this.literalLikeNode(tok()) as LiteralExpression;
      }
      literalLikeNode(k: Syntax): LiteralLikeNode {
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
        if (isTemplateLiteralKind(n.kind)) (<TemplateHead | TemplateMiddle | TemplateTail | NoSubstitutionLiteral>n).templateFlags = scanner.getTokenFlags() & TokenFlags.ContainsInvalidEscape;
        next.tok();
        finishNode(n);
        return n;
      }
      typeReference(): TypeReferenceNode {
        const n = create.node(Syntax.TypeReference);
        n.typeName = this.entityName(true, Diagnostics.Type_expected);
        if (!scanner.hasPrecedingLineBreak() && reScanLessToken() === Syntax.LessThanToken) {
          n.typeArguments = ctx.parseBracketedList(Parser.Context.TypeArguments, this.type, Syntax.LessThanToken, Syntax.GreaterThanToken);
        }
        return finishNode(n);
      }
      thisTypePredicate(lhs: ThisTypeNode): TypePredicateNode {
        next.tok();
        const n = create.node(Syntax.TypePredicate, lhs.pos);
        n.parameterName = lhs;
        n.type = this.type();
        return finishNode(n);
      }
      thisTypeNode(): ThisTypeNode {
        const n = create.node(Syntax.ThisType);
        next.tok();
        return finishNode(n);
      }
      typeQuery(): TypeQueryNode {
        const n = create.node(Syntax.TypeQuery);
        this.expected(Syntax.TypeOfKeyword);
        n.exprName = this.entityName(true);
        return finishNode(n);
      }
      typeParameter(): TypeParameterDeclaration {
        const n = create.node(Syntax.TypeParameter);
        n.name = this.identifier();
        if (this.optional(Syntax.ExtendsKeyword)) {
          if (isStartOfType() || !isStartOfExpression()) n.constraint = this.type();
          else n.expression = this.unaryExpressionOrHigher();
        }
        if (this.optional(Syntax.EqualsToken)) n.default = this.type();
        return finishNode(n);
      }
      typeParameters(): NodeArray<TypeParameterDeclaration> | undefined {
        if (tok() === Syntax.LessThanToken) {
          return ctx.parseBracketedList(Parser.Context.TypeParameters, this.typeParameter, Syntax.LessThanToken, Syntax.GreaterThanToken);
        }
        return;
      }
      parameter(): ParameterDeclaration {
        const n = create.nodeWithJSDoc(Syntax.Parameter);
        const parameterType = (): TypeNode | undefined => {
          if (this.optional(Syntax.ColonToken)) return this.type();
          return;
        };
        if (tok() === Syntax.ThisKeyword) {
          n.name = create.identifier(true);
          n.type = parameterType();
          return finishNode(n);
        }
        n.decorators = this.decorators();
        n.modifiers = this.modifiers();
        n.dot3Token = this.optionalToken(Syntax.Dot3Token);
        n.name = this.identifierOrPattern(Diagnostics.Private_identifiers_cannot_be_used_as_parameters);
        if (getFullWidth(n.name) === 0 && !n.modifiers && isModifierKind(tok())) next.tok();
        n.questionToken = this.optionalToken(Syntax.QuestionToken);
        n.type = parameterType();
        n.initializer = this.initializer();
        return finishNode(n);
      }
      parameterList(s: SignatureDeclaration, f: SignatureFlags): boolean {
        if (!this.expected(Syntax.OpenParenToken)) {
          s.parameters = create.missingList<ParameterDeclaration>();
          return false;
        }
        const yf = flags.inContext(NodeFlags.YieldContext);
        const af = flags.inContext(NodeFlags.AwaitContext);
        flags.set(!!(f & SignatureFlags.Yield), NodeFlags.YieldContext);
        flags.set(!!(f & SignatureFlags.Await), NodeFlags.AwaitContext);
        s.parameters = f & SignatureFlags.JSDoc ? ctx.parseDelimitedList(Parser.Context.JSDocParameters, this.parameter) : ctx.parseDelimitedList(Parser.Context.Parameters, this.parameter);
        flags.set(yf, NodeFlags.YieldContext);
        flags.set(af, NodeFlags.AwaitContext);
        return this.expected(Syntax.CloseParenToken);
      }
      typeMemberSemicolon() {
        if (this.optional(Syntax.CommaToken)) return;
        this.semicolon();
      }
      signatureMember(k: Syntax.CallSignature | Syntax.ConstructSignature): CallSignatureDeclaration | ConstructSignatureDeclaration {
        const n = create.nodeWithJSDoc(k);
        if (k === Syntax.ConstructSignature) this.expected(Syntax.NewKeyword);
        fillSignature(Syntax.ColonToken, SignatureFlags.Type, n);
        this.typeMemberSemicolon();
        return finishNode(n);
      }
      indexSignatureDeclaration(n: IndexSignatureDeclaration): IndexSignatureDeclaration {
        n.kind = Syntax.IndexSignature;
        n.parameters = ctx.parseBracketedList(Parser.Context.Parameters, this.parameter, Syntax.OpenBracketToken, Syntax.CloseBracketToken);
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
          if (tok() === Syntax.EqualsToken) (<PropertySignature>n).initializer = this.initializer();
        }
        this.typeMemberSemicolon();
        return finishNode(n);
      }
      typeLiteral(): TypeLiteralNode {
        const n = create.node(Syntax.TypeLiteral);
        n.members = this.objectTypeMembers();
        return finishNode(n);
      }
      objectTypeMembers(): NodeArray<TypeElement> {
        let es: NodeArray<TypeElement>;
        if (this.expected(Syntax.OpenBraceToken)) {
          const typeMember = (): TypeElement => {
            if (tok() === Syntax.OpenParenToken || tok() === Syntax.LessThanToken) return this.signatureMember(Syntax.CallSignature);
            if (tok() === Syntax.NewKeyword && lookAhead(next.isOpenParenOrLessThan)) return this.signatureMember(Syntax.ConstructSignature);
            const n = create.nodeWithJSDoc(Syntax.Unknown);
            n.modifiers = this.modifiers();
            if (isIndexSignature()) return this.indexSignatureDeclaration(<IndexSignatureDeclaration>n);
            return this.propertyOrMethodSignature(<PropertySignature | MethodSignature>n);
          };
          es = ctx.parseList(Parser.Context.TypeMembers, typeMember);
          this.expected(Syntax.CloseBraceToken);
        } else es = create.missingList<TypeElement>();

        return es;
      }
      mappedTypeParameter() {
        const n = create.node(Syntax.TypeParameter);
        n.name = this.identifier();
        this.expected(Syntax.InKeyword);
        n.constraint = this.type();
        return finishNode(n);
      }
      mappedType() {
        const n = create.node(Syntax.MappedType);
        this.expected(Syntax.OpenBraceToken);
        if (tok() === Syntax.ReadonlyKeyword || tok() === Syntax.PlusToken || tok() === Syntax.MinusToken) {
          n.readonlyToken = this.tokenNode<ReadonlyToken | PlusToken | MinusToken>();
          if (n.readonlyToken.kind !== Syntax.ReadonlyKeyword) this.expectedToken(Syntax.ReadonlyKeyword);
        }
        this.expected(Syntax.OpenBracketToken);
        n.typeParameter = this.mappedTypeParameter();
        this.expected(Syntax.CloseBracketToken);
        if (tok() === Syntax.QuestionToken || tok() === Syntax.PlusToken || tok() === Syntax.MinusToken) {
          n.questionToken = this.tokenNode<QuestionToken | PlusToken | MinusToken>();
          if (n.questionToken.kind !== Syntax.QuestionToken) this.expectedToken(Syntax.QuestionToken);
        }
        n.type = this.typeAnnotation();
        this.semicolon();
        this.expected(Syntax.CloseBraceToken);
        return finishNode(n);
      }
      tupleElementType() {
        const p = getNodePos();
        if (this.optional(Syntax.Dot3Token)) {
          const n = create.node(Syntax.RestType, p);
          n.type = this.type();
          return finishNode(n);
        }
        const t = this.type();
        if (!(flags.value & NodeFlags.JSDoc) && t.kind === Syntax.JSDocNullableType && t.pos === (<JSDocNullableType>t).type.pos) t.kind = Syntax.OptionalType;
        return t;
      }
      tupleType(): TupleTypeNode {
        const n = create.node(Syntax.TupleType);
        const nameOrType = () => {
          if (lookAhead(isTupleElementName)) {
            const n = create.node(Syntax.NamedTupleMember);
            n.dot3Token = this.optionalToken(Syntax.Dot3Token);
            n.name = this.identifierName();
            n.questionToken = this.optionalToken(Syntax.QuestionToken);
            this.expected(Syntax.ColonToken);
            n.type = this.tupleElementType();
            return addJSDocComment(finishNode(n));
          }
          return this.tupleElementType();
        };
        n.elements = ctx.parseBracketedList(Parser.Context.TupleElementTypes, nameOrType, Syntax.OpenBracketToken, Syntax.CloseBracketToken);
        return finishNode(n);
      }
      parenthesizedType(): TypeNode {
        const n = create.node(Syntax.ParenthesizedType);
        this.expected(Syntax.OpenParenToken);
        n.type = this.type();
        this.expected(Syntax.CloseParenToken);
        return finishNode(n);
      }
      functionOrConstructorType(): TypeNode {
        const p = getNodePos();
        const k = this.optional(Syntax.NewKeyword) ? Syntax.ConstructorType : Syntax.FunctionType;
        const n = create.nodeWithJSDoc(k, p);
        fillSignature(Syntax.EqualsGreaterThanToken, SignatureFlags.Type, n);
        return finishNode(n);
      }
      keywordAndNoDot(): TypeNode | undefined {
        const n = this.tokenNode<TypeNode>();
        return tok() === Syntax.DotToken ? undefined : n;
      }
      literalTypeNode(negative?: boolean): LiteralTypeNode {
        const n = create.node(Syntax.LiteralType);
        let m!: PrefixUnaryExpression;
        if (negative) {
          m = create.node(Syntax.PrefixUnaryExpression);
          m.operator = Syntax.MinusToken;
          next.tok();
        }
        let e: BooleanLiteral | LiteralExpression | PrefixUnaryExpression =
          tok() === Syntax.TrueKeyword || tok() === Syntax.FalseKeyword ? this.tokenNode<BooleanLiteral>() : (this.literalLikeNode(tok()) as LiteralExpression);
        if (negative) {
          m.operand = e;
          finishNode(m);
          e = m;
        }
        n.literal = e;
        return finishNode(n);
      }
      importType(): ImportTypeNode {
        sourceFile.flags |= NodeFlags.PossiblyContainsDynamicImport;
        const n = create.node(Syntax.ImportType);
        if (this.optional(Syntax.TypeOfKeyword)) n.isTypeOf = true;
        this.expected(Syntax.ImportKeyword);
        this.expected(Syntax.OpenParenToken);
        n.argument = this.type();
        this.expected(Syntax.CloseParenToken);
        if (this.optional(Syntax.DotToken)) n.qualifier = this.entityName(true, Diagnostics.Type_expected);
        if (!scanner.hasPrecedingLineBreak() && reScanLessToken() === Syntax.LessThanToken) {
          n.typeArguments = ctx.parseBracketedList(Parser.Context.TypeArguments, this.type, Syntax.LessThanToken, Syntax.GreaterThanToken);
        }
        return finishNode(n);
      }
      nonArrayType(): TypeNode {
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
            return parseJSDoc.allType(/*postfixEquals*/ false);
          case Syntax.AsteriskEqualsToken:
            return parseJSDoc.allType(/*postfixEquals*/ true);
          case Syntax.Question2Token:
            // If there is '??', consider that is prefix '?' in JSDoc type.
            scanner.reScanQuestionToken();
          // falls through
          case Syntax.QuestionToken:
            return parseJSDoc.unknownOrNullableType();
          case Syntax.FunctionKeyword:
            return parseJSDoc.functionType();
          case Syntax.ExclamationToken:
            return parseJSDoc.nonNullableType();
          case Syntax.NoSubstitutionLiteral:
          case Syntax.StringLiteral:
          case Syntax.NumericLiteral:
          case Syntax.BigIntLiteral:
          case Syntax.TrueKeyword:
          case Syntax.FalseKeyword:
            return this.literalTypeNode();
          case Syntax.MinusToken:
            return lookAhead(next.isNumericOrBigIntLiteral) ? this.literalTypeNode(/*negative*/ true) : this.typeReference();
          case Syntax.VoidKeyword:
          case Syntax.NullKeyword:
            return this.tokenNode<TypeNode>();
          case Syntax.ThisKeyword: {
            const thisKeyword = this.thisTypeNode();
            if (tok() === Syntax.IsKeyword && !scanner.hasPrecedingLineBreak()) {
              return this.thisTypePredicate(thisKeyword);
            } else {
              return thisKeyword;
            }
          }
          case Syntax.TypeOfKeyword:
            return lookAhead(isStartOfTypeOfImportType) ? this.importType() : this.typeQuery();
          case Syntax.OpenBraceToken:
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
      postfixTypeOrHigher(): TypeNode {
        let type = this.nonArrayType();
        while (!scanner.hasPrecedingLineBreak()) {
          switch (tok()) {
            case Syntax.ExclamationToken:
              type = create.postfixType(Syntax.JSDocNonNullableType, type);
              break;
            case Syntax.QuestionToken:
              if (!(flags.value & NodeFlags.JSDoc) && lookAhead(next.isStartOfType)) return type;
              type = create.postfixType(Syntax.JSDocNullableType, type);
              break;
            case Syntax.OpenBracketToken:
              this.expected(Syntax.OpenBracketToken);
              if (isStartOfType()) {
                const n = create.node(Syntax.IndexedAccessType, type.pos);
                n.objectType = type;
                n.indexType = this.type();
                this.expected(Syntax.CloseBracketToken);
                type = finishNode(n);
              } else {
                const n = create.node(Syntax.ArrayType, type.pos);
                n.elementType = type;
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
        const n = create.node(Syntax.TypeOperator);
        this.expected(operator);
        n.operator = operator;
        n.type = this.typeOperatorOrHigher();
        return finishNode(n);
      }
      inferType(): InferTypeNode {
        const n = create.node(Syntax.InferType);
        this.expected(Syntax.InferKeyword);
        const p = create.node(Syntax.TypeParameter);
        p.name = this.identifier();
        n.typeParameter = finishNode(p);
        return finishNode(n);
      }
      typeOperatorOrHigher(): TypeNode {
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
      unionOrIntersectionType(k: Syntax.UnionType | Syntax.IntersectionType, cb: () => TypeNode, o: Syntax.BarToken | Syntax.AmpersandToken): TypeNode {
        const start = scanner.getStartPos();
        const hasLeadingOperator = this.optional(o);
        let type = cb();
        if (tok() === o || hasLeadingOperator) {
          const types = [type];
          while (this.optional(o)) {
            types.push(cb());
          }
          const n = create.node(k, start);
          n.types = create.nodeArray(types, start);
          type = finishNode(n);
        }
        return type;
      }
      intersectionTypeOrHigher(): TypeNode {
        return this.unionOrIntersectionType(Syntax.IntersectionType, this.typeOperatorOrHigher, Syntax.AmpersandToken);
      }
      unionTypeOrHigher(): TypeNode {
        return this.unionOrIntersectionType(Syntax.UnionType, this.intersectionTypeOrHigher, Syntax.BarToken);
      }
      typeOrTypePredicate(): TypeNode {
        const typePredicateVariable = isIdentifier() && tryParse(this.typePredicatePrefix);
        const type = this.type();
        if (typePredicateVariable) {
          const n = create.node(Syntax.TypePredicate, typePredicateVariable.pos);
          n.assertsModifier = undefined;
          n.parameterName = typePredicateVariable;
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
      assertsTypePredicate(): TypeNode {
        const n = create.node(Syntax.TypePredicate);
        n.assertsModifier = this.expectedToken(Syntax.AssertsKeyword);
        n.parameterName = tok() === Syntax.ThisKeyword ? this.thisTypeNode() : this.identifier();
        n.type = this.optional(Syntax.IsKeyword) ? this.type() : undefined;
        return finishNode(n);
      }
      type(): TypeNode {
        return flags.withoutContext(NodeFlags.TypeExcludesFlags, this.typeWorker);
      }
      typeWorker(noConditionalTypes?: boolean): TypeNode {
        if (isStartOfFunctionType() || tok() === Syntax.NewKeyword) return this.functionOrConstructorType();
        const type = this.unionTypeOrHigher();
        if (!noConditionalTypes && !scanner.hasPrecedingLineBreak() && this.optional(Syntax.ExtendsKeyword)) {
          const n = create.node(Syntax.ConditionalType, type.pos);
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
      typeAnnotation(): TypeNode | undefined {
        return this.optional(Syntax.ColonToken) ? this.type() : undefined;
      }
      expression(): Expression {
        const dc = flags.inContext(NodeFlags.DecoratorContext);
        if (dc) flags.set(false, NodeFlags.DecoratorContext);
        let expr = this.assignmentExpressionOrHigher();
        let operatorToken: BinaryOperatorToken;
        while ((operatorToken = this.optionalToken(Syntax.CommaToken))) {
          expr = makeBinaryExpression(expr, operatorToken, this.assignmentExpressionOrHigher());
        }
        if (dc) flags.set(true, NodeFlags.DecoratorContext);
        return expr;
      }
      initializer(): Expression | undefined {
        return this.optional(Syntax.EqualsToken) ? this.assignmentExpressionOrHigher() : undefined;
      }
      assignmentExpressionOrHigher(): Expression {
        if (isYieldExpression()) return this.yieldExpression();
        const arrowExpression = tryParseParenthesizedArrowFunctionExpression() || tryParseAsyncSimpleArrowFunctionExpression();
        if (arrowExpression) return arrowExpression;
        const expr = this.binaryExpressionOrHigher(/*precedence*/ 0);
        if (expr.kind === Syntax.Identifier && tok() === Syntax.EqualsGreaterThanToken) return this.simpleArrowFunctionExpression(<Identifier>expr);
        if (isLeftHandSideExpression(expr) && isAssignmentOperator(reScanGreaterToken())) return makeBinaryExpression(expr, this.tokenNode(), this.assignmentExpressionOrHigher());
        return this.conditionalExpressionRest(expr);
      }
      yieldExpression(): YieldExpression {
        const n = create.node(Syntax.YieldExpression);
        next.tok();
        if (!scanner.hasPrecedingLineBreak() && (tok() === Syntax.AsteriskToken || isStartOfExpression())) {
          n.asteriskToken = this.optionalToken(Syntax.AsteriskToken);
          n.expression = this.assignmentExpressionOrHigher();
          return finishNode(n);
        }
        return finishNode(n);
      }
      simpleArrowFunctionExpression(identifier: Identifier, asyncModifier?: NodeArray<Modifier> | undefined): ArrowFunction {
        assert(tok() === Syntax.EqualsGreaterThanToken, 'this.simpleArrowFunctionExpression should only have been called if we had a =>');
        let n: ArrowFunction;
        if (asyncModifier) {
          n = create.node(Syntax.ArrowFunction, asyncModifier.pos);
          n.modifiers = asyncModifier;
        } else n = create.node(Syntax.ArrowFunction, identifier.pos);
        const n2 = create.node(Syntax.Parameter, identifier.pos);
        n2.name = identifier;
        finishNode(n);
        n.parameters = create.nodeArray<ParameterDeclaration>([n2], n2.pos, n2.end);
        n.equalsGreaterThanToken = this.expectedToken(Syntax.EqualsGreaterThanToken);
        n.body = this.arrowFunctionExpressionBody(!!asyncModifier);
        return addJSDocComment(finishNode(n));
      }
      possibleParenthesizedArrowFunctionExpressionHead(): ArrowFunction | undefined {
        const tokenPos = scanner.getTokenPos();
        if (notParenthesizedArrow && notParenthesizedArrow.has(tokenPos.toString())) return;
        const result = this.parenthesizedArrowFunctionExpressionHead(/*allowAmbiguity*/ false);
        if (!result) (notParenthesizedArrow || (notParenthesizedArrow = createMap())).set(tokenPos.toString(), true);
        return result;
      }
      parenthesizedArrowFunctionExpressionHead(allowAmbiguity: boolean): ArrowFunction | undefined {
        const n = create.nodeWithJSDoc(Syntax.ArrowFunction);
        n.modifiers = this.modifiersForArrowFunction();
        const isAsync = hasModifierOfKind(n, Syntax.AsyncKeyword) ? SignatureFlags.Await : SignatureFlags.None;
        if (!fillSignature(Syntax.ColonToken, isAsync, n) && !allowAmbiguity) return;
        const hasJSDocFunctionType = n.type && isJSDocFunctionType(n.type);
        if (!allowAmbiguity && tok() !== Syntax.EqualsGreaterThanToken && (hasJSDocFunctionType || tok() !== Syntax.OpenBraceToken)) return;
        return n;
      }
      arrowFunctionExpressionBody(isAsync: boolean): Block | Expression {
        if (tok() === Syntax.OpenBraceToken) {
          return this.functionBlock(isAsync ? SignatureFlags.Await : SignatureFlags.None);
        }
        if (tok() !== Syntax.SemicolonToken && tok() !== Syntax.FunctionKeyword && tok() !== Syntax.ClassKeyword && isStartOfStatement() && !isStartOfExpressionStatement()) {
          return this.functionBlock(SignatureFlags.IgnoreMissingOpenBrace | (isAsync ? SignatureFlags.Await : SignatureFlags.None));
        }
        return isAsync ? flags.withAwait(this.assignmentExpressionOrHigher) : flags.withoutAwait(this.assignmentExpressionOrHigher);
      }
      conditionalExpressionRest(leftOperand: Expression): Expression {
        const questionToken = this.optionalToken(Syntax.QuestionToken);
        if (!questionToken) return leftOperand;
        const n = create.node(Syntax.ConditionalExpression, leftOperand.pos);
        n.condition = leftOperand;
        n.questionToken = questionToken;
        n.whenTrue = flags.withoutContext(withDisallowInDecoratorContext, this.assignmentExpressionOrHigher);
        n.colonToken = this.expectedToken(Syntax.ColonToken);
        n.whenFalse = nodeIsPresent(n.colonToken) ? this.assignmentExpressionOrHigher() : create.missingNode(Syntax.Identifier, false, Diagnostics._0_expected, toString(Syntax.ColonToken));
        return finishNode(n);
      }
      binaryExpressionOrHigher(precedence: number): Expression {
        const leftOperand = this.unaryExpressionOrHigher();
        return this.binaryExpressionRest(precedence, leftOperand);
      }
      binaryExpressionRest(precedence: number, leftOperand: Expression): Expression {
        while (true) {
          reScanGreaterToken();
          const newPrecedence = getBinaryOperatorPrecedence(tok());
          const consumeCurrentOperator = tok() === Syntax.Asterisk2Token ? newPrecedence >= precedence : newPrecedence > precedence;
          if (!consumeCurrentOperator) break;
          if (tok() === Syntax.InKeyword && flags.inContext(NodeFlags.DisallowInContext)) break;
          if (tok() === Syntax.AsKeyword) {
            if (scanner.hasPrecedingLineBreak()) break;
            else {
              next.tok();
              leftOperand = makeAsExpression(leftOperand, this.type());
            }
          } else leftOperand = makeBinaryExpression(leftOperand, this.tokenNode(), this.binaryExpressionOrHigher(newPrecedence));
        }
        return leftOperand;
      }
      prefixUnaryExpression() {
        const n = create.node(Syntax.PrefixUnaryExpression);
        n.operator = <PrefixUnaryOperator>tok();
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
      unaryExpressionOrHigher(): UnaryExpression | BinaryExpression {
        if (isUpdateExpression()) {
          const updateExpression = this.updateExpression();
          return tok() === Syntax.Asterisk2Token ? <BinaryExpression>this.binaryExpressionRest(getBinaryOperatorPrecedence(tok()), updateExpression) : updateExpression;
        }
        const unaryOperator = tok();
        const simpleUnaryExpression = this.simpleUnaryExpression();
        if (tok() === Syntax.Asterisk2Token) {
          const pos = Scanner.skipTrivia(sourceText, simpleUnaryExpression.pos);
          const { end } = simpleUnaryExpression;
          if (simpleUnaryExpression.kind === Syntax.TypeAssertionExpression) {
            this.errorAt(pos, end, Diagnostics.A_type_assertion_expression_is_not_allowed_in_the_left_hand_side_of_an_exponentiation_expression_Consider_enclosing_the_expression_in_parentheses);
          } else {
            this.errorAt(
              pos,
              end,
              Diagnostics.An_unary_expression_with_the_0_operator_is_not_allowed_in_the_left_hand_side_of_an_exponentiation_expression_Consider_enclosing_the_expression_in_parentheses,
              toString(unaryOperator)
            );
          }
        }
        return simpleUnaryExpression;
      }
      simpleUnaryExpression(): UnaryExpression {
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
        } else if (sourceFile.languageVariant === LanguageVariant.JSX && tok() === Syntax.LessThanToken && lookAhead(next.isIdentifierOrKeywordOrGreaterThan)) {
          return parseJsx.elementOrSelfClosingElementOrFragment(true);
        }
        const expression = this.leftHandSideExpressionOrHigher();
        assert(isLeftHandSideExpression(expression));
        if ((tok() === Syntax.Plus2Token || tok() === Syntax.Minus2Token) && !scanner.hasPrecedingLineBreak()) {
          const n = create.node(Syntax.PostfixUnaryExpression, expression.pos);
          n.operand = expression;
          n.operator = <PostfixUnaryOperator>tok();
          next.tok();
          return finishNode(n);
        }
        return expression;
      }
      leftHandSideExpressionOrHigher(): LeftHandSideExpression {
        let expression: MemberExpression;
        if (tok() === Syntax.ImportKeyword) {
          if (lookAhead(next.isOpenParenOrLessThan)) {
            sourceFile.flags |= NodeFlags.PossiblyContainsDynamicImport;
            expression = this.tokenNode<PrimaryExpression>();
          } else if (lookAhead(next.isDot)) {
            const fullStart = scanner.getStartPos();
            next.tok();
            next.tok();
            const n = create.node(Syntax.MetaProperty, fullStart);
            n.keywordToken = Syntax.ImportKeyword;
            n.name = this.identifierName();
            expression = finishNode(n);
            sourceFile.flags |= NodeFlags.PossiblyContainsImportMeta;
          } else {
            expression = this.memberExpressionOrHigher();
          }
        } else {
          expression = tok() === Syntax.SuperKeyword ? this.superExpression() : this.memberExpressionOrHigher();
        }
        return this.callExpressionRest(expression);
      }
      memberExpressionOrHigher(): MemberExpression {
        const expression = this.primaryExpression();
        return this.memberExpressionRest(expression, /*allowOptionalChain*/ true);
      }
      superExpression(): MemberExpression {
        const expression = this.tokenNode<PrimaryExpression>();
        if (tok() === Syntax.LessThanToken) {
          const startPos = getNodePos();
          const typeArguments = tryParse(this.typeArgumentsInExpression);
          if (typeArguments !== undefined) this.errorAt(startPos, getNodePos(), Diagnostics.super_may_not_use_type_arguments);
        }
        if (tok() === Syntax.OpenParenToken || tok() === Syntax.DotToken || tok() === Syntax.OpenBracketToken) return expression;
        const n = create.node(Syntax.PropertyAccessExpression, expression.pos);
        n.expression = expression;
        this.expectedToken(Syntax.DotToken, Diagnostics.super_must_be_followed_by_an_argument_list_or_member_access);
        n.name = this.rightSideOfDot(true, true);
        return finishNode(n);
      }
      typeAssertion(): TypeAssertion {
        const n = create.node(Syntax.TypeAssertionExpression);
        this.expected(Syntax.LessThanToken);
        n.type = this.type();
        this.expected(Syntax.GreaterThanToken);
        n.expression = this.simpleUnaryExpression();
        return finishNode(n);
      }
      propertyAccessExpressionRest(expression: LeftHandSideExpression, questionDotToken: QuestionDotToken | undefined) {
        const n = create.node(Syntax.PropertyAccessExpression, expression.pos);
        n.expression = expression;
        n.questionDotToken = questionDotToken;
        n.name = this.rightSideOfDot(true, true);
        if (questionDotToken || tryReparseOptionalChain(expression)) {
          n.flags |= NodeFlags.OptionalChain;
          if (isPrivateIdentifier(n.name)) this.errorAtRange(n.name, Diagnostics.An_optional_chain_cannot_contain_private_identifiers);
        }
        return finishNode(n);
      }
      elementAccessExpressionRest(expression: LeftHandSideExpression, questionDotToken: QuestionDotToken | undefined) {
        const n = create.node(Syntax.ElementAccessExpression, expression.pos);
        n.expression = expression;
        n.questionDotToken = questionDotToken;
        if (tok() === Syntax.CloseBracketToken) {
          n.argumentExpression = create.missingNode(Syntax.Identifier, true, Diagnostics.An_element_access_expression_should_take_an_argument);
        } else {
          const argument = flags.withoutDisallowIn(this.expression);
          if (StringLiteral.orNumericLiteralLike(argument)) argument.text = internIdentifier(argument.text);
          n.argumentExpression = argument;
        }
        this.expected(Syntax.CloseBracketToken);
        if (questionDotToken || tryReparseOptionalChain(expression)) n.flags |= NodeFlags.OptionalChain;
        return finishNode(n);
      }
      memberExpressionRest(expression: LeftHandSideExpression, allowOptionalChain: boolean): MemberExpression {
        while (true) {
          let questionDotToken: QuestionDotToken | undefined;
          let isPropertyAccess = false;
          if (allowOptionalChain && isStartOfOptionalPropertyOrElementAccessChain()) {
            questionDotToken = this.expectedToken(Syntax.QuestionDotToken);
            isPropertyAccess = identifierOrKeyword(tok());
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
            expression = this.elementAccessExpressionRest(expression, questionDotToken);
            continue;
          }
          if (isTemplateStartOfTaggedTemplate()) {
            expression = this.taggedTemplateRest(expression, questionDotToken, undefined);
            continue;
          }
          return <MemberExpression>expression;
        }
      }
      taggedTemplateRest(tag: LeftHandSideExpression, questionDotToken: QuestionDotToken | undefined, typeArguments: NodeArray<TypeNode> | undefined) {
        const n = create.node(Syntax.TaggedTemplateExpression, tag.pos);
        n.tag = tag;
        n.questionDotToken = questionDotToken;
        n.typeArguments = typeArguments;
        n.template = tok() === Syntax.NoSubstitutionLiteral ? (reScanHeadOrNoSubstTemplate(), <NoSubstitutionLiteral>this.literalNode()) : this.templateExpression(/*tagged*/ true);
        if (questionDotToken || tag.flags & NodeFlags.OptionalChain) n.flags |= NodeFlags.OptionalChain;
        return finishNode(n);
      }
      callExpressionRest(expression: LeftHandSideExpression): LeftHandSideExpression {
        while (true) {
          expression = this.memberExpressionRest(expression, /*allowOptionalChain*/ true);
          const questionDotToken = this.optionalToken(Syntax.QuestionDotToken);
          if (tok() === Syntax.LessThanToken || tok() === Syntax.LessThan2Token) {
            const typeArguments = tryParse(this.typeArgumentsInExpression);
            if (typeArguments) {
              if (isTemplateStartOfTaggedTemplate()) {
                expression = this.taggedTemplateRest(expression, questionDotToken, typeArguments);
                continue;
              }
              const n = create.node(Syntax.CallExpression, expression.pos);
              n.expression = expression;
              n.questionDotToken = questionDotToken;
              n.typeArguments = typeArguments;
              n.arguments = this.argumentList();
              if (questionDotToken || tryReparseOptionalChain(expression)) n.flags |= NodeFlags.OptionalChain;
              expression = finishNode(n);
              continue;
            }
          } else if (tok() === Syntax.OpenParenToken) {
            const n = create.node(Syntax.CallExpression, expression.pos);
            n.expression = expression;
            n.questionDotToken = questionDotToken;
            n.arguments = this.argumentList();
            if (questionDotToken || tryReparseOptionalChain(expression)) n.flags |= NodeFlags.OptionalChain;
            expression = finishNode(n);
            continue;
          }
          if (questionDotToken) {
            const n = create.node(Syntax.PropertyAccessExpression, expression.pos) as PropertyAccessExpression;
            n.expression = expression;
            n.questionDotToken = questionDotToken;
            n.name = create.missingNode(Syntax.Identifier, false, Diagnostics.Identifier_expected);
            n.flags |= NodeFlags.OptionalChain;
            expression = finishNode(n);
          }
          break;
        }
        return expression;
      }
      argumentList() {
        this.expected(Syntax.OpenParenToken);
        const result = ctx.parseDelimitedList(Parser.Context.ArgumentExpressions, this.argumentExpression);
        this.expected(Syntax.CloseParenToken);
        return result;
      }
      typeArgumentsInExpression() {
        if (reScanLessToken() !== Syntax.LessThanToken) return;
        next.tok();
        const typeArguments = ctx.parseDelimitedList(Parser.Context.TypeArguments, this.type);
        if (!this.expected(Syntax.GreaterThanToken)) return;
        return typeArguments && can.followTypeArgumentsInExpression() ? typeArguments : undefined;
      }
      primaryExpression(): PrimaryExpression {
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
            return objectLiteralExpression();
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
        return this.identifier(Diagnostics.Expression_expected);
      }
      parenthesizedExpression(): ParenthesizedExpression {
        const n = create.nodeWithJSDoc(Syntax.ParenthesizedExpression);
        this.expected(Syntax.OpenParenToken);
        n.expression = flags.withoutDisallowIn(this.expression);
        this.expected(Syntax.CloseParenToken);
        return finishNode(n);
      }
      spreadElement(): Expression {
        const n = create.node(Syntax.SpreadElement);
        this.expected(Syntax.Dot3Token);
        n.expression = this.assignmentExpressionOrHigher();
        return finishNode(n);
      }
      argumentOrArrayLiteralElement(): Expression {
        return tok() === Syntax.Dot3Token ? this.spreadElement() : tok() === Syntax.CommaToken ? create.node(Syntax.OmittedExpression) : this.assignmentExpressionOrHigher();
      }
      argumentExpression(): Expression {
        return flags.withoutContext(withDisallowInDecoratorContext, this.argumentOrArrayLiteralElement);
      }
      arrayLiteralExpression(): ArrayLiteralExpression {
        const n = create.node(Syntax.ArrayLiteralExpression);
        this.expected(Syntax.OpenBracketToken);
        if (scanner.hasPrecedingLineBreak()) n.multiLine = true;
        n.elements = ctx.parseDelimitedList(Parser.Context.ArrayLiteralMembers, this.argumentOrArrayLiteralElement);
        this.expected(Syntax.CloseBracketToken);
        return finishNode(n);
      }
      objectLiteralElement(): ObjectLiteralElementLike {
        const n = create.nodeWithJSDoc(Syntax.Unknown);
        if (this.optionalToken(Syntax.Dot3Token)) {
          n.kind = Syntax.SpreadAssignment;
          (n as SpreadAssignment).expression = this.assignmentExpressionOrHigher();
          return finishNode(n);
        }
        n.decorators = this.decorators();
        n.modifiers = this.modifiers();
        if (this.contextualModifier(Syntax.GetKeyword)) {
          return this.accessorDeclaration(n as AccessorDeclaration, Syntax.GetAccessor);
        }
        if (this.contextualModifier(Syntax.SetKeyword)) {
          return this.accessorDeclaration(n as AccessorDeclaration, Syntax.SetAccessor);
        }
        const asteriskToken = this.optionalToken(Syntax.AsteriskToken);
        const tokenIsIdentifier = isIdentifier();
        n.name = this.propertyName();
        (n as MethodDeclaration).questionToken = this.optionalToken(Syntax.QuestionToken);
        (n as MethodDeclaration).exclamationToken = this.optionalToken(Syntax.ExclamationToken);
        if (asteriskToken || tok() === Syntax.OpenParenToken || tok() === Syntax.LessThanToken) {
          return this.methodDeclaration(<MethodDeclaration>n, asteriskToken);
        }
        const isShorthandPropertyAssignment = tokenIsIdentifier && tok() !== Syntax.ColonToken;
        if (isShorthandPropertyAssignment) {
          n.kind = Syntax.ShorthandPropertyAssignment;
          const equalsToken = this.optionalToken(Syntax.EqualsToken);
          if (equalsToken) {
            (n as ShorthandPropertyAssignment).equalsToken = equalsToken;
            (n as ShorthandPropertyAssignment).objectAssignmentInitializer = flags.withoutDisallowIn(this.assignmentExpressionOrHigher);
          }
        } else {
          n.kind = Syntax.PropertyAssignment;
          this.expected(Syntax.ColonToken);
          (n as PropertyAssignment).initializer = flags.withoutDisallowIn(this.assignmentExpressionOrHigher);
        }
        return finishNode(n);
      }
      objectLiteralExpression(): ObjectLiteralExpression {
        const n = create.node(Syntax.ObjectLiteralExpression);
        const openBracePosition = scanner.getTokenPos();
        this.expected(Syntax.OpenBraceToken);
        if (scanner.hasPrecedingLineBreak()) n.multiLine = true;
        n.properties = ctx.parseDelimitedList(Parser.Context.ObjectLiteralMembers, this.objectLiteralElement, /*considerSemicolonAsDelimiter*/ true);
        if (!this.expected(Syntax.CloseBraceToken)) {
          const lastError = lastOrUndefined(parseDiagnostics);
          if (lastError && lastError.code === Diagnostics._0_expected.code) {
            addRelatedInfo(lastError, createFileDiagnostic(sourceFile, openBracePosition, 1, Diagnostics.The_parser_expected_to_find_a_to_match_the_token_here));
          }
        }
        return finishNode(n);
      }
      functionExpression(): FunctionExpression {
        const dc = flags.inContext(NodeFlags.DecoratorContext);
        if (dc) flags.set(false, NodeFlags.DecoratorContext);
        const n = create.nodeWithJSDoc(Syntax.FunctionExpression);
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
      optionalIdentifier(): Identifier | undefined {
        return isIdentifier() ? this.identifier() : undefined;
      }
      newExpressionOrNewDotTarget(): NewExpression | MetaProperty {
        const fullStart = scanner.getStartPos();
        this.expected(Syntax.NewKeyword);
        if (this.optional(Syntax.DotToken)) {
          const n = create.node(Syntax.MetaProperty, fullStart);
          n.keywordToken = Syntax.NewKeyword;
          n.name = this.identifierName();
          return finishNode(n);
        }
        let expression: MemberExpression = this.primaryExpression();
        let typeArguments;
        while (true) {
          expression = this.memberExpressionRest(expression, /*allowOptionalChain*/ false);
          typeArguments = tryParse(this.typeArgumentsInExpression);
          if (isTemplateStartOfTaggedTemplate()) {
            assert(!!typeArguments, "Expected a type argument list; all plain tagged template starts should be consumed in 'this.memberExpressionRest'");
            expression = this.taggedTemplateRest(expression, /*optionalChain*/ undefined, typeArguments);
            typeArguments = undefined;
          }
          break;
        }
        const n = create.node(Syntax.NewExpression, fullStart);
        n.expression = expression;
        n.typeArguments = typeArguments;
        if (tok() === Syntax.OpenParenToken) n.arguments = this.argumentList();
        else if (n.typeArguments) this.errorAt(fullStart, scanner.getStartPos(), Diagnostics.A_new_expression_with_type_arguments_must_always_be_followed_by_a_parenthesized_argument_list);

        return finishNode(n);
      }
      block(ignoreMissingOpenBrace: boolean, m?: DiagnosticMessage): Block {
        const n = create.node(Syntax.Block);
        const openBracePosition = scanner.getTokenPos();
        if (this.expected(Syntax.OpenBraceToken, m) || ignoreMissingOpenBrace) {
          if (scanner.hasPrecedingLineBreak()) n.multiLine = true;
          n.statements = ctx.parseList(Parser.Context.BlockStatements, this.statement);
          if (!this.expected(Syntax.CloseBraceToken)) {
            const lastError = lastOrUndefined(parseDiagnostics);
            if (lastError && lastError.code === Diagnostics._0_expected.code) {
              addRelatedInfo(lastError, createFileDiagnostic(sourceFile, openBracePosition, 1, Diagnostics.The_parser_expected_to_find_a_to_match_the_token_here));
            }
          }
        } else n.statements = create.missingList<Statement>();
        return finishNode(n);
      }
      functionBlock(f: SignatureFlags, m?: DiagnosticMessage): Block {
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
      emptyStatement(): Statement {
        const n = create.node(Syntax.EmptyStatement);
        this.expected(Syntax.SemicolonToken);
        return finishNode(n);
      }
      ifStatement(): IfStatement {
        const n = create.node(Syntax.IfStatement);
        this.expected(Syntax.IfKeyword);
        this.expected(Syntax.OpenParenToken);
        n.expression = flags.withoutDisallowIn(this.expression);
        this.expected(Syntax.CloseParenToken);
        n.thenStatement = this.statement();
        n.elseStatement = this.optional(Syntax.ElseKeyword) ? this.statement() : undefined;
        return finishNode(n);
      }
      doStatement(): DoStatement {
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
      whileStatement(): WhileStatement {
        const n = create.node(Syntax.WhileStatement);
        this.expected(Syntax.WhileKeyword);
        this.expected(Syntax.OpenParenToken);
        n.expression = flags.withoutDisallowIn(this.expression);
        this.expected(Syntax.CloseParenToken);
        n.statement = this.statement();
        return finishNode(n);
      }
      forOrForInOrForOfStatement(): Statement {
        const pos = getNodePos();
        this.expected(Syntax.ForKeyword);
        const awaitToken = this.optionalToken(Syntax.AwaitKeyword);
        this.expected(Syntax.OpenParenToken);
        let initializer!: VariableDeclarationList | Expression;
        if (tok() !== Syntax.SemicolonToken) {
          if (tok() === Syntax.VarKeyword || tok() === Syntax.LetKeyword || tok() === Syntax.ConstKeyword) {
            initializer = this.variableDeclarationList(true);
          } else {
            initializer = flags.withDisallowIn(this.expression);
          }
        }
        let n: IterationStatement;
        if (awaitToken ? this.expected(Syntax.OfKeyword) : this.optional(Syntax.OfKeyword)) {
          const n2 = create.node(Syntax.ForOfStatement, pos);
          n2.awaitModifier = awaitToken;
          n2.initializer = initializer;
          n2.expression = flags.withoutDisallowIn(this.assignmentExpressionOrHigher);
          this.expected(Syntax.CloseParenToken);
          n = n2;
        } else if (this.optional(Syntax.InKeyword)) {
          const n2 = create.node(Syntax.ForInStatement, pos);
          n2.initializer = initializer;
          n2.expression = flags.withoutDisallowIn(this.expression);
          this.expected(Syntax.CloseParenToken);
          n = n2;
        } else {
          const n2 = create.node(Syntax.ForStatement, pos);
          n2.initializer = initializer;
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
      breakOrContinueStatement(kind: Syntax): BreakOrContinueStatement {
        const n = create.node(kind);
        this.expected(kind === Syntax.BreakStatement ? Syntax.BreakKeyword : Syntax.ContinueKeyword);
        if (!can.parseSemicolon()) n.label = this.identifier();
        this.semicolon();
        return finishNode(n);
      }
      returnStatement(): ReturnStatement {
        const n = create.node(Syntax.ReturnStatement);
        this.expected(Syntax.ReturnKeyword);
        if (!can.parseSemicolon()) n.expression = flags.withoutDisallowIn(this.expression);
        this.semicolon();
        return finishNode(n);
      }
      withStatement(): WithStatement {
        const n = create.node(Syntax.WithStatement);
        this.expected(Syntax.WithKeyword);
        this.expected(Syntax.OpenParenToken);
        n.expression = flags.withoutDisallowIn(this.expression);
        this.expected(Syntax.CloseParenToken);
        n.statement = flags.withContext(NodeFlags.InWithStatement, this.statement);
        return finishNode(n);
      }
      caseClause(): CaseClause {
        const n = create.node(Syntax.CaseClause);
        this.expected(Syntax.CaseKeyword);
        n.expression = flags.withoutDisallowIn(this.expression);
        this.expected(Syntax.ColonToken);
        n.statements = ctx.parseList(Parser.Context.SwitchClauseStatements, this.statement);
        return finishNode(n);
      }
      defaultClause(): DefaultClause {
        const n = create.node(Syntax.DefaultClause);
        this.expected(Syntax.DefaultKeyword);
        this.expected(Syntax.ColonToken);
        n.statements = ctx.parseList(Parser.Context.SwitchClauseStatements, this.statement);
        return finishNode(n);
      }
      caseOrDefaultClause(): CaseOrDefaultClause {
        return tok() === Syntax.CaseKeyword ? this.caseClause() : this.defaultClause();
      }
      switchStatement(): SwitchStatement {
        const n = create.node(Syntax.SwitchStatement);
        this.expected(Syntax.SwitchKeyword);
        this.expected(Syntax.OpenParenToken);
        n.expression = flags.withoutDisallowIn(this.expression);
        this.expected(Syntax.CloseParenToken);
        const n2 = create.node(Syntax.CaseBlock);
        this.expected(Syntax.OpenBraceToken);
        n2.clauses = ctx.parseList(Parser.Context.SwitchClauses, this.caseOrDefaultClause);
        this.expected(Syntax.CloseBraceToken);
        n.caseBlock = finishNode(n2);
        return finishNode(n);
      }
      throwStatement(): ThrowStatement {
        const n = create.node(Syntax.ThrowStatement);
        this.expected(Syntax.ThrowKeyword);
        n.expression = scanner.hasPrecedingLineBreak() ? undefined : flags.withoutDisallowIn(this.expression);
        this.semicolon();
        return finishNode(n);
      }
      tryStatement(): TryStatement {
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
      catchClause(): CatchClause {
        const result = create.node(Syntax.CatchClause);
        this.expected(Syntax.CatchKeyword);
        if (this.optional(Syntax.OpenParenToken)) {
          result.variableDeclaration = this.variableDeclaration();
          this.expected(Syntax.CloseParenToken);
        } else result.variableDeclaration = undefined;
        result.block = this.block(false);
        return finishNode(result);
      }
      debuggerStatement(): Statement {
        const n = create.node(Syntax.DebuggerStatement);
        this.expected(Syntax.DebuggerKeyword);
        this.semicolon();
        return finishNode(n);
      }
      expressionOrLabeledStatement(): ExpressionStatement | LabeledStatement {
        const n = create.nodeWithJSDoc(tok() === Syntax.Identifier ? Syntax.Unknown : Syntax.ExpressionStatement);
        const expression = flags.withoutDisallowIn(this.expression);
        if (expression.kind === Syntax.Identifier && this.optional(Syntax.ColonToken)) {
          n.kind = Syntax.LabeledStatement;
          (n as LabeledStatement).label = <Identifier>expression;
          (n as LabeledStatement).statement = this.statement();
        } else {
          n.kind = Syntax.ExpressionStatement;
          (n as ExpressionStatement).expression = expression;
          this.semicolon();
        }
        return finishNode(n);
      }
      statement(): Statement {
        switch (tok()) {
          case Syntax.SemicolonToken:
            return this.emptyStatement();
          case Syntax.OpenBraceToken:
            return this.block(false);
          case Syntax.VarKeyword:
            return this.variableStatement(create.nodeWithJSDoc(Syntax.VariableDeclaration));
          case Syntax.LetKeyword:
            if (isLetDeclaration()) return this.variableStatement(create.nodeWithJSDoc(Syntax.VariableDeclaration));
            break;
          case Syntax.FunctionKeyword:
            return this.functionDeclaration(create.nodeWithJSDoc(Syntax.FunctionDeclaration));
          case Syntax.ClassKeyword:
            return this.classDeclaration(create.nodeWithJSDoc(Syntax.ClassDeclaration));
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
            if (isStartOfDeclaration()) return this.declaration();
            break;
        }
        return this.expressionOrLabeledStatement();
      }
      declaration(): Statement {
        const modifiers = lookAhead(() => (this.decorators(), this.modifiers()));
        const isAmbient = some(modifiers, isDeclareModifier);
        if (isAmbient) {
          const n = ctx.tryReuseAmbientDeclaration();
          if (n) return n;
        }
        const n = create.nodeWithJSDoc(Syntax.Unknown);
        n.decorators = this.decorators();
        n.modifiers = this.modifiers();
        if (isAmbient) {
          for (const m of n.modifiers!) {
            m.flags |= NodeFlags.Ambient;
          }
          return flags.withContext(NodeFlags.Ambient, () => this.declarationWorker(n));
        } else return this.declarationWorker(n);
      }
      declarationWorker(n: Statement): Statement {
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
              // We reached this point because we encountered decorators and/or modifiers and assumed a declaration
              // would follow. For recovery and error reporting purposes, return an incomplete declaration.
              const missing = create.missingNode<Statement>(Syntax.MissingDeclaration, true, Diagnostics.Declaration_expected);
              missing.pos = n.pos;
              missing.decorators = n.decorators;
              missing.modifiers = n.modifiers;
              return finishNode(missing);
            }
            return undefined!; // TODO: GH#18217
        }
      }
      functionBlockOrSemicolon(flags: SignatureFlags, m?: DiagnosticMessage): Block | undefined {
        if (tok() !== Syntax.OpenBraceToken && can.parseSemicolon()) {
          this.semicolon();
          return;
        }
        return this.functionBlock(flags, m);
      }
      arrayBindingElement(): ArrayBindingElement {
        if (tok() === Syntax.CommaToken) return create.node(Syntax.OmittedExpression);
        const n = create.node(Syntax.BindingElement);
        n.dot3Token = this.optionalToken(Syntax.Dot3Token);
        n.name = this.identifierOrPattern();
        n.initializer = this.initializer();
        return finishNode(n);
      }
      objectBindingElement(): BindingElement {
        const n = create.node(Syntax.BindingElement);
        n.dot3Token = this.optionalToken(Syntax.Dot3Token);
        const tokenIsIdentifier = isIdentifier();
        const propertyName = this.propertyName();
        if (tokenIsIdentifier && tok() !== Syntax.ColonToken) n.name = <Identifier>propertyName;
        else {
          this.expected(Syntax.ColonToken);
          n.propertyName = propertyName;
          n.name = this.identifierOrPattern();
        }
        n.initializer = this.initializer();
        return finishNode(n);
      }
      objectBindingPattern(): ObjectBindingPattern {
        const n = create.node(Syntax.ObjectBindingPattern);
        this.expected(Syntax.OpenBraceToken);
        n.elements = ctx.parseDelimitedList(Parser.Context.ObjectBindingElements, this.objectBindingElement);
        this.expected(Syntax.CloseBraceToken);
        return finishNode(n);
      }
      arrayBindingPattern(): ArrayBindingPattern {
        const n = create.node(Syntax.ArrayBindingPattern);
        this.expected(Syntax.OpenBracketToken);
        n.elements = ctx.parseDelimitedList(Parser.Context.ArrayBindingElements, this.arrayBindingElement);
        this.expected(Syntax.CloseBracketToken);
        return finishNode(n);
      }
      identifierOrPattern(privateIdentifierDiagnosticMessage?: DiagnosticMessage): Identifier | BindingPattern {
        if (tok() === Syntax.OpenBracketToken) return this.arrayBindingPattern();
        if (tok() === Syntax.OpenBraceToken) return this.objectBindingPattern();
        return this.identifier(undefined, privateIdentifierDiagnosticMessage);
      }
      variableDeclarationAllowExclamation() {
        return this.variableDeclaration(true);
      }
      variableDeclaration(allowExclamation?: boolean): VariableDeclaration {
        const n = create.node(Syntax.VariableDeclaration);
        n.name = this.identifierOrPattern(Diagnostics.Private_identifiers_are_not_allowed_in_variable_declarations);
        if (allowExclamation && n.name.kind === Syntax.Identifier && tok() === Syntax.ExclamationToken && !scanner.hasPrecedingLineBreak()) {
          n.exclamationToken = this.tokenNode<Token<Syntax.ExclamationToken>>();
        }
        n.type = this.typeAnnotation();
        if (!isInOrOfKeyword(tok())) n.initializer = this.initializer();
        return finishNode(n);
      }
      variableDeclarationList(inForStatementInitializer: boolean): VariableDeclarationList {
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
            fail();
        }
        next.tok();
        if (tok() === Syntax.OfKeyword && lookAhead(can.followContextualOfKeyword)) {
          n.declarations = create.missingList<VariableDeclaration>();
        } else {
          const f = flags.inContext(NodeFlags.DisallowInContext);
          flags.set(inForStatementInitializer, NodeFlags.DisallowInContext);
          n.declarations = ctx.parseDelimitedList(Parser.Context.VariableDeclarations, inForStatementInitializer ? this.variableDeclaration : this.variableDeclarationAllowExclamation);
          flags.set(f, NodeFlags.DisallowInContext);
        }
        return finishNode(n);
      }
      variableStatement(n: VariableStatement): VariableStatement {
        n.kind = Syntax.VariableStatement;
        n.declarationList = this.variableDeclarationList(false);
        this.semicolon();
        return finishNode(n);
      }
      functionDeclaration(n: FunctionDeclaration): FunctionDeclaration {
        n.kind = Syntax.FunctionDeclaration;
        this.expected(Syntax.FunctionKeyword);
        n.asteriskToken = this.optionalToken(Syntax.AsteriskToken);
        n.name = hasModifierOfKind(n, Syntax.DefaultKeyword) ? this.optionalIdentifier() : this.identifier();
        const isGenerator = n.asteriskToken ? SignatureFlags.Yield : SignatureFlags.None;
        const isAsync = hasModifierOfKind(n, Syntax.AsyncKeyword) ? SignatureFlags.Await : SignatureFlags.None;
        fillSignature(Syntax.ColonToken, isGenerator | isAsync, n);
        n.body = this.functionBlockOrSemicolon(isGenerator | isAsync, Diagnostics.or_expected);
        return finishNode(n);
      }
      constructorName() {
        if (tok() === Syntax.ConstructorKeyword) return this.expected(Syntax.ConstructorKeyword);
        if (tok() === Syntax.StringLiteral && lookAhead(nextToken) === Syntax.OpenParenToken) {
          return tryParse(() => {
            const literalNode = this.literalNode();
            return literalNode.text === 'constructor' ? literalNode : undefined;
          });
        }
        return;
      }
      methodDeclaration(n: MethodDeclaration, asteriskToken: AsteriskToken, m?: DiagnosticMessage): MethodDeclaration {
        n.kind = Syntax.MethodDeclaration;
        n.asteriskToken = asteriskToken;
        const isGenerator = asteriskToken ? SignatureFlags.Yield : SignatureFlags.None;
        const isAsync = hasModifierOfKind(n, Syntax.AsyncKeyword) ? SignatureFlags.Await : SignatureFlags.None;
        fillSignature(Syntax.ColonToken, isGenerator | isAsync, n);
        n.body = this.functionBlockOrSemicolon(isGenerator | isAsync, m);
        return finishNode(n);
      }
      propertyDeclaration(n: PropertyDeclaration): PropertyDeclaration {
        n.kind = Syntax.PropertyDeclaration;
        if (!n.questionToken && tok() === Syntax.ExclamationToken && !scanner.hasPrecedingLineBreak()) {
          n.exclamationToken = this.tokenNode<Token<Syntax.ExclamationToken>>();
        }
        n.type = this.typeAnnotation();
        n.initializer = flags.withoutContext(NodeFlags.YieldContext | NodeFlags.AwaitContext | NodeFlags.DisallowInContext, this.initializer);
        this.semicolon();
        return finishNode(n);
      }
      propertyOrMethodDeclaration(n: PropertyDeclaration | MethodDeclaration): PropertyDeclaration | MethodDeclaration {
        const asteriskToken = this.optionalToken(Syntax.AsteriskToken);
        n.name = this.propertyName();
        n.questionToken = this.optionalToken(Syntax.QuestionToken);
        if (asteriskToken || tok() === Syntax.OpenParenToken || tok() === Syntax.LessThanToken) {
          return this.methodDeclaration(<MethodDeclaration>n, asteriskToken, Diagnostics.or_expected);
        }
        return this.propertyDeclaration(<PropertyDeclaration>n);
      }
      accessorDeclaration(n: AccessorDeclaration, kind: AccessorDeclaration['kind']): AccessorDeclaration {
        n.kind = kind;
        n.name = this.propertyName();
        fillSignature(Syntax.ColonToken, SignatureFlags.None, n);
        n.body = this.functionBlockOrSemicolon(SignatureFlags.None);
        return finishNode(n);
      }
      decorators(): NodeArray<Decorator> | undefined {
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
        return list && create.nodeArray(list, listPos);
      }
      modifiers(permitInvalidConstAsModifier?: boolean): NodeArray<Modifier> | undefined {
        let list: Modifier[] | undefined;
        const listPos = getNodePos();
        while (true) {
          const modifierStart = scanner.getStartPos();
          const modifierKind = tok();
          if (tok() === Syntax.ConstKeyword && permitInvalidConstAsModifier) {
            if (!tryParse(next.isOnSameLineAndCanFollowModifier)) break;
          } else if (!isModifierKind(tok()) || !tryParse(next.canFollowModifier)) break;
          const modifier = finishNode(create.node(modifierKind, modifierStart));
          (list || (list = [])).push(modifier);
        }
        return list && create.nodeArray(list, listPos);
      }
      modifiersForArrowFunction(): NodeArray<Modifier> | undefined {
        let modifiers: NodeArray<Modifier> | undefined;
        if (tok() === Syntax.AsyncKeyword) {
          const modifierStart = scanner.getStartPos();
          const modifierKind = tok();
          next.tok();
          const modifier = finishNode(create.node(modifierKind, modifierStart));
          modifiers = create.nodeArray<Modifier>([modifier], modifierStart);
        }
        return modifiers;
      }
      classElement(): ClassElement {
        if (tok() === Syntax.SemicolonToken) {
          const n = create.node(Syntax.SemicolonClassElement);
          next.tok();
          return finishNode(n);
        }
        const n = create.node(Syntax.Unknown);
        n.decorators = this.decorators();
        n.modifiers = this.modifiers(true);
        if (this.contextualModifier(Syntax.GetKeyword)) return this.accessorDeclaration(<AccessorDeclaration>n, Syntax.GetAccessor);
        if (this.contextualModifier(Syntax.SetKeyword)) return this.accessorDeclaration(<AccessorDeclaration>n, Syntax.SetAccessor);
        if (tok() === Syntax.ConstructorKeyword || tok() === Syntax.StringLiteral) {
          const d = tryParseConstructorDeclaration(<ConstructorDeclaration>n);
          if (d) return d;
        }
        if (isIndexSignature()) return this.indexSignatureDeclaration(<IndexSignatureDeclaration>n);
        if (identifierOrKeyword(tok()) || tok() === Syntax.StringLiteral || tok() === Syntax.NumericLiteral || tok() === Syntax.AsteriskToken || tok() === Syntax.OpenBracketToken) {
          const isAmbient = n.modifiers && some(n.modifiers, isDeclareModifier);
          if (isAmbient) {
            for (const m of n.modifiers!) {
              m.flags |= NodeFlags.Ambient;
            }
            return flags.withContext(NodeFlags.Ambient, () => this.propertyOrMethodDeclaration(n as PropertyDeclaration | MethodDeclaration));
          }
          return this.propertyOrMethodDeclaration(n as PropertyDeclaration | MethodDeclaration);
        }
        if (n.decorators || n.modifiers) {
          n.name = create.missingNode<Identifier>(Syntax.Identifier, true, Diagnostics.Declaration_expected);
          return this.propertyDeclaration(<PropertyDeclaration>n);
        }
        return fail('Should not have attempted to parse class member declaration.');
      }
      classExpression(): ClassExpression {
        return <ClassExpression>this.classDeclarationOrExpression(create.nodeWithJSDoc(Syntax.Unknown), Syntax.ClassExpression);
      }
      classDeclaration(n: ClassLikeDeclaration): ClassDeclaration {
        return <ClassDeclaration>this.classDeclarationOrExpression(n, Syntax.ClassDeclaration);
      }
      classDeclarationOrExpression(n: ClassLikeDeclaration, kind: ClassLikeDeclaration['kind']): ClassLikeDeclaration {
        n.kind = kind;
        this.expected(Syntax.ClassKeyword);
        n.name = this.nameOfClassDeclarationOrExpression();
        n.typeParameters = this.typeParameters();
        n.heritageClauses = this.heritageClauses();
        if (this.expected(Syntax.OpenBraceToken)) {
          n.members = this.classMembers();
          this.expected(Syntax.CloseBraceToken);
        } else n.members = create.missingList<ClassElement>();
        return finishNode(n);
      }
      nameOfClassDeclarationOrExpression(): Identifier | undefined {
        return isIdentifier() && !isImplementsClause() ? this.identifier() : undefined;
      }
      heritageClauses(): NodeArray<HeritageClause> | undefined {
        if (isHeritageClause()) return ctx.parseList(Parser.Context.HeritageClauses, this.heritageClause);
        return;
      }
      heritageClause(): HeritageClause {
        const tok = tok();
        assert(tok === Syntax.ExtendsKeyword || tok === Syntax.ImplementsKeyword);
        const n = create.node(Syntax.HeritageClause);
        n.token = tok;
        next.tok();
        n.types = ctx.parseDelimitedList(Parser.Context.HeritageClauseElement, this.expressionWithTypeArguments);
        return finishNode(n);
      }
      expressionWithTypeArguments(): ExpressionWithTypeArguments {
        const n = create.node(Syntax.ExpressionWithTypeArguments);
        n.expression = this.leftHandSideExpressionOrHigher();
        n.typeArguments = tryParseTypeArguments();
        return finishNode(n);
      }
      classMembers(): NodeArray<ClassElement> {
        return ctx.parseList(Parser.Context.ClassMembers, this.classElement);
      }
      interfaceDeclaration(n: InterfaceDeclaration): InterfaceDeclaration {
        n.kind = Syntax.InterfaceDeclaration;
        this.expected(Syntax.InterfaceKeyword);
        n.name = this.identifier();
        n.typeParameters = this.typeParameters();
        n.heritageClauses = this.heritageClauses();
        n.members = this.objectTypeMembers();
        return finishNode(n);
      }
      typeAliasDeclaration(n: TypeAliasDeclaration): TypeAliasDeclaration {
        n.kind = Syntax.TypeAliasDeclaration;
        this.expected(Syntax.TypeKeyword);
        n.name = this.identifier();
        n.typeParameters = this.typeParameters();
        this.expected(Syntax.EqualsToken);
        n.type = this.type();
        this.semicolon();
        return finishNode(n);
      }
      enumMember(): EnumMember {
        const n = create.nodeWithJSDoc(Syntax.EnumMember);
        n.name = this.propertyName();
        n.initializer = flags.withoutDisallowIn(this.initializer);
        return finishNode(n);
      }
      enumDeclaration(n: EnumDeclaration): EnumDeclaration {
        n.kind = Syntax.EnumDeclaration;
        this.expected(Syntax.EnumKeyword);
        n.name = this.identifier();
        if (this.expected(Syntax.OpenBraceToken)) {
          n.members = flags.withoutYieldAndAwait(() => ctx.parseDelimitedList(Parser.Context.EnumMembers, this.enumMember));
          this.expected(Syntax.CloseBraceToken);
        } else {
          n.members = create.missingList<EnumMember>();
        }
        return finishNode(n);
      }
      moduleBlock(): ModuleBlock {
        const n = create.node(Syntax.ModuleBlock);
        if (this.expected(Syntax.OpenBraceToken)) {
          n.statements = ctx.parseList(Parser.Context.BlockStatements, this.statement);
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
        if (tok() === Syntax.GlobalKeyword) {
          return this.ambientExternalModuleDeclaration(n);
        } else if (this.optional(Syntax.NamespaceKeyword)) flags |= NodeFlags.Namespace;
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
        let identifier: Identifier | undefined;
        if (isIdentifier()) identifier = this.identifier();
        let isTypeOnly = false;
        if (tok() !== Syntax.FromKeyword && identifier?.escapedText === 'type' && (isIdentifier() || tokenAfterImportDefinitelyProducesImportDeclaration())) {
          isTypeOnly = true;
          identifier = isIdentifier() ? this.identifier() : undefined;
        }
        if (identifier && !tokenAfterImportedIdentifierDefinitelyProducesImportDeclaration()) {
          return this.importEqualsDeclaration(<ImportEqualsDeclaration>n, identifier, isTypeOnly);
        }
        n.kind = Syntax.ImportDeclaration;
        if (
          identifier || // import id
          tok() === Syntax.AsteriskToken || // import *
          tok() === Syntax.OpenBraceToken // import {
        ) {
          (<ImportDeclaration>n).importClause = this.importClause(identifier, afterImportPos, isTypeOnly);
          this.expected(Syntax.FromKeyword);
        }
        (<ImportDeclaration>n).moduleSpecifier = this.moduleSpecifier();
        this.semicolon();
        return finishNode(n);
      }
      importEqualsDeclaration(n: ImportEqualsDeclaration, identifier: Identifier, isTypeOnly: boolean): ImportEqualsDeclaration {
        n.kind = Syntax.ImportEqualsDeclaration;
        n.name = identifier;
        this.expected(Syntax.EqualsToken);
        n.moduleReference = this.moduleReference();
        this.semicolon();
        const finished = finishNode(n);
        if (isTypeOnly) this.errorAtRange(finished, Diagnostics.Only_ECMAScript_imports_may_use_import_type);
        return finished;
      }
      importClause(identifier: Identifier | undefined, fullStart: number, isTypeOnly: boolean) {
        const n = create.node(Syntax.ImportClause, fullStart);
        n.isTypeOnly = isTypeOnly;
        if (identifier) n.name = identifier;
        if (!n.name || this.optional(Syntax.CommaToken)) n.namedBindings = tok() === Syntax.AsteriskToken ? this.namespaceImport() : this.namedImportsOrExports(Syntax.NamedImports);
        return finishNode(n);
      }
      moduleReference() {
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
      moduleSpecifier(): Expression {
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
        n.elements = <NodeArray<ImportSpecifier> | NodeArray<ExportSpecifier>>(
          ctx.parseBracketedList(Parser.Context.ImportOrExportSpecifiers, kind === Syntax.NamedImports ? this.importSpecifier : this.exportSpecifier, Syntax.OpenBraceToken, Syntax.CloseBraceToken)
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
        let checkIdentifierIsKeyword = isKeyword(tok()) && !isIdentifier();
        let checkIdentifierStart = scanner.getTokenPos();
        let checkIdentifierEnd = scanner.getTextPos();
        const identifierName = this.identifierName();
        if (tok() === Syntax.AsKeyword) {
          n.propertyName = identifierName;
          this.expected(Syntax.AsKeyword);
          checkIdentifierIsKeyword = isKeyword(tok()) && !isIdentifier();
          checkIdentifierStart = scanner.getTokenPos();
          checkIdentifierEnd = scanner.getTextPos();
          n.name = this.identifierName();
        } else n.name = identifierName;
        if (kind === Syntax.ImportSpecifier && checkIdentifierIsKeyword) this.errorAt(checkIdentifierStart, checkIdentifierEnd, Diagnostics.Identifier_expected);
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
      exportAssignment(n: ExportAssignment): ExportAssignment {
        n.kind = Syntax.ExportAssignment;
        if (this.optional(Syntax.EqualsToken)) n.isExportEquals = true;
        else this.expected(Syntax.DefaultKeyword);
        n.expression = this.assignmentExpressionOrHigher();
        this.semicolon();
        return finishNode(n);
      }

      errorAtToken(m: DiagnosticMessage, arg0?: any) {
        this.errorAt(scanner.getTokenPos(), scanner.getTextPos(), m, arg0);
      }
      errorAtPosition(start: number, length: number, m: DiagnosticMessage, arg0?: any) {
        const l = lastOrUndefined(parseDiagnostics);
        if (!l || start !== l.start) parseDiagnostics.push(createFileDiagnostic(sourceFile, start, length, m, arg0));
        parseErrorBeforeNextFinishedNode = true;
      }
      errorAt(start: number, end: number, m: DiagnosticMessage, arg0?: any) {
        this.errorAtPosition(start, end - start, m, arg0);
      }
      errorAtRange(r: TextRange, m: DiagnosticMessage, arg0?: any) {
        this.errorAt(r.pos, r.end, m, arg0);
      }
      scanError(m: DiagnosticMessage, length: number) {
        this.errorAtPosition(scanner.getTextPos(), length, m);
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
      elementOrSelfClosingElementOrFragment(inExpressionContext: boolean): JsxElement | JsxSelfClosingElement | JsxFragment {
        const opening = this.openingOrSelfClosingElementOrOpeningFragment(inExpressionContext);
        let result: JsxElement | JsxSelfClosingElement | JsxFragment;
        if (opening.kind === Syntax.JsxOpeningElement) {
          const n = create.node(Syntax.JsxElement, opening.pos);
          n.openingElement = opening;
          n.children = ctx.parseJsxChildren(n.openingElement);
          n.closingElement = this.closingElement(inExpressionContext);
          if (!tagNamesAreEquivalent(n.openingElement.tagName, n.closingElement.tagName)) {
            parse.errorAtRange(n.closingElement, Diagnostics.Expected_corresponding_JSX_closing_tag_for_0, getTextOfNodeFromSourceText(sourceText, n.openingElement.tagName));
          }
          result = finishNode(n);
        } else if (opening.kind === Syntax.JsxOpeningFragment) {
          const n = create.node(Syntax.JsxFragment, opening.pos);
          n.openingFragment = opening;
          n.children = ctx.parseJsxChildren(n.openingFragment);
          n.closingFragment = this.closingFragment(inExpressionContext);
          result = finishNode(n);
        } else {
          assert(opening.kind === Syntax.JsxSelfClosingElement);
          result = opening;
        }
        if (inExpressionContext && tok() === Syntax.LessThanToken) {
          const invalidElement = tryParse(() => this.elementOrSelfClosingElementOrFragment(true));
          if (invalidElement) {
            parse.errorAtToken(Diagnostics.JSX_expressions_must_have_one_parent_element);
            const n2 = create.node(Syntax.BinaryExpression, result.pos);
            n2.end = invalidElement.end;
            n2.left = result;
            n2.right = invalidElement;
            n2.operatorToken = create.missingNode(Syntax.CommaToken, false);
            n2.operatorToken.pos = n2.operatorToken.end = n2.right.pos;
            return (n2 as Node) as JsxElement;
          }
        }
        return result;
      }
      text(): JsxText {
        const n = create.node(Syntax.JsxText);
        n.text = scanner.getTokenValue();
        n.onlyTriviaWhitespaces = currentToken === Syntax.JsxTextAllWhiteSpaces;
        currentToken = scanner.scanJsxToken();
        return finishNode(n);
      }
      child(openingTag: JsxOpeningElement | JsxOpeningFragment, token: JsxTokenSyntax): JsxChild | undefined {
        switch (token) {
          case Syntax.EndOfFileToken:
            if (isJsxOpeningFragment(openingTag)) {
              parse.errorAtRange(openingTag, Diagnostics.JSX_fragment_has_no_corresponding_closing_tag);
            } else {
              const tag = openingTag.tagName;
              const start = Scanner.skipTrivia(sourceText, tag.pos);
              parse.errorAt(start, tag.end, Diagnostics.JSX_element_0_has_no_corresponding_closing_tag, getTextOfNodeFromSourceText(sourceText, openingTag.tagName));
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
            return this.elementOrSelfClosingElementOrFragment(false);
          default:
            return Debug.assertNever(token);
        }
      }
      attributes(): JsxAttributes {
        const n = create.node(Syntax.JsxAttributes);
        n.properties = ctx.parseList(Parser.Context.JsxAttributes, this.attribute);
        return finishNode(n);
      }
      openingOrSelfClosingElementOrOpeningFragment(inExpressionContext: boolean): JsxOpeningElement | JsxSelfClosingElement | JsxOpeningFragment {
        const fullStart = scanner.getStartPos();
        parse.expected(Syntax.LessThanToken);
        if (tok() === Syntax.GreaterThanToken) {
          const n = create.node(Syntax.JsxOpeningFragment, fullStart);
          this.scanText();
          return finishNode(n);
        }
        const tagName = this.elementName();
        const typeArguments = tryParseTypeArguments();
        const attributes = this.attributes();
        let n: JsxOpeningLikeElement;
        if (tok() === Syntax.GreaterThanToken) {
          n = create.node(Syntax.JsxOpeningElement, fullStart);
          this.scanText();
        } else {
          parse.expected(Syntax.SlashToken);
          if (inExpressionContext) parse.expected(Syntax.GreaterThanToken);
          else {
            parse.expected(Syntax.GreaterThanToken, undefined, false);
            this.scanText();
          }
          n = create.node(Syntax.JsxSelfClosingElement, fullStart);
        }
        n.tagName = tagName;
        n.typeArguments = typeArguments;
        n.attributes = attributes;
        return finishNode(n);
      }
      elementName(): JsxTagNameExpression {
        this.scanIdentifier();
        let expression: JsxTagNameExpression = tok() === Syntax.ThisKeyword ? parse.tokenNode<ThisExpression>() : parse.identifierName();
        while (parse.optional(Syntax.DotToken)) {
          const n = create.node(Syntax.PropertyAccessExpression, expression.pos);
          n.expression = expression;
          n.name = parse.rightSideOfDot(true, false);
          expression = finishNode(n);
        }
        return expression;
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
              n.initializer = <StringLiteral>parse.literalNode();
              break;
            default:
              n.initializer = this.expression(true);
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
      closingElement(inExpressionContext: boolean): JsxClosingElement {
        const n = create.node(Syntax.JsxClosingElement);
        parse.expected(Syntax.LessThanSlashToken);
        n.tagName = this.elementName();
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
        if (identifierOrKeyword(tok())) parse.errorAtRange(this.elementName(), Diagnostics.Expected_corresponding_closing_tag_for_JSX_fragment);
        if (inExpressionContext) parse.expected(Syntax.GreaterThanToken);
        else {
          parse.expected(Syntax.GreaterThanToken, undefined, false);
          this.scanText();
        }
        return finishNode(n);
      }
    })();
    const parseJSDoc = new (class {
      tags: JSDocTag[] = [];
      tagsPos = 0;
      tagsEnd = 0;
      comments: string[] = [];

      addTag(tag: JSDocTag | undefined): void {
        if (!tag) return;
        if (!this.tags) {
          this.tags = [tag];
          this.tagsPos = tag.pos;
        } else this.tags.push(tag);
        this.tagsEnd = tag.end;
      }
      comment(start = 0, length: number | undefined): JSDoc | undefined {
        const content = sourceText;
        const end = length === undefined ? content.length : start + length;
        length = end - start;
        assert(start >= 0);
        assert(start <= end);
        assert(end <= content.length);
        if (!Scanner.isJSDocLike(content, start)) return;
        return scanner.scanRange(start + 3, length - 5, () => {
          let state = Parser.State.SawAsterisk;
          let margin: number | undefined;
          let indent = start - Math.max(content.lastIndexOf('\n', start), 0) + 4;
          const pushComment = (text: string) => {
            if (!margin) margin = indent;

            this.comments.push(text);
            indent += text.length;
          };
          next.tokJSDoc();
          while (this.optional(Syntax.WhitespaceTrivia));
          if (this.optional(Syntax.NewLineTrivia)) {
            state = Parser.State.BeginningOfLine;
            indent = 0;
          }
          loop: while (true) {
            switch (tok()) {
              case Syntax.AtToken:
                if (state === Parser.State.BeginningOfLine || state === Parser.State.SawAsterisk) {
                  removeTrailingWhitespace(this.comments);
                  this.addTag(this.tag(indent));
                  state = Parser.State.BeginningOfLine;
                  margin = undefined;
                } else pushComment(scanner.getTokenText());

                break;
              case Syntax.NewLineTrivia:
                this.comments.push(scanner.getTokenText());
                state = Parser.State.BeginningOfLine;
                indent = 0;
                break;
              case Syntax.AsteriskToken:
                const asterisk = scanner.getTokenText();
                if (state === Parser.State.SawAsterisk || state === Parser.State.SavingComments) {
                  state = Parser.State.SavingComments;
                  pushComment(asterisk);
                } else {
                  state = Parser.State.SawAsterisk;
                  indent += asterisk.length;
                }
                break;
              case Syntax.WhitespaceTrivia:
                const whitespace = scanner.getTokenText();
                if (state === Parser.State.SavingComments) this.comments.push(whitespace);
                else if (margin !== undefined && indent + whitespace.length > margin) {
                  this.comments.push(whitespace.slice(margin - indent - 1));
                }
                indent += whitespace.length;
                break;
              case Syntax.EndOfFileToken:
                break loop;
              default:
                state = Parser.State.SavingComments;
                pushComment(scanner.getTokenText());
                break;
            }
            next.tokJSDoc();
          }
          removeLeadingNewlines(this.comments);
          removeTrailingWhitespace(this.comments);
          return createJSDocComment();
        });
      }
      expected(t: JSDocSyntax): boolean {
        if (tok() === t) {
          next.tokJSDoc();
          return true;
        }
        parse.errorAtToken(Diagnostics._0_expected, toString(t));
        return false;
      }
      expectedToken<T extends JSDocSyntax>(t: T): Token<T>;
      expectedToken(t: JSDocSyntax): Node {
        return this.optionalToken(t) || create.missingNode(t, false, Diagnostics._0_expected, toString(t));
      }
      optional(t: JSDocSyntax): boolean {
        if (tok() === t) {
          next.tokJSDoc();
          return true;
        }
        return false;
      }
      optionalToken<T extends JSDocSyntax>(t: T): Token<T>;
      optionalToken(t: JSDocSyntax): Node | undefined {
        if (tok() === t) {
          const n = create.node(tok());
          next.tokJSDoc();
          return finishNode(n);
        }
        return;
      }
      allType(postFixEquals: boolean): JSDocAllType | JSDocOptionalType {
        const n = create.node(Syntax.JSDocAllType);
        if (postFixEquals) return create.postfixType(Syntax.JSDocOptionalType, n) as JSDocOptionalType;
        next.tok();
        return finishNode(n);
      }
      nonNullableType(): TypeNode {
        const n = create.node(Syntax.JSDocNonNullableType);
        next.tok();
        n.type = parse.nonArrayType();
        return finishNode(n);
      }
      unknownOrNullableType(): JSDocUnknownType | JSDocNullableType {
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
          const n = create.node(Syntax.JSDocUnknownType, p);
          return finishNode(n);
        }
        const n = create.node(Syntax.JSDocNullableType, p);
        n.type = parse.type();
        return finishNode(n);
      }
      functionType(): JSDocFunctionType | TypeReferenceNode {
        if (lookAhead(next.isOpenParen)) {
          const n = create.nodeWithJSDoc(Syntax.JSDocFunctionType);
          next.tok();
          fillSignature(Syntax.ColonToken, SignatureFlags.Type | SignatureFlags.JSDoc, n);
          return finishNode(n);
        }
        const n = create.node(Syntax.TypeReference);
        n.typeName = parse.identifierName();
        return finishNode(n);
      }
      parameter(): ParameterDeclaration {
        const n = create.node(Syntax.Parameter);
        if (tok() === Syntax.ThisKeyword || tok() === Syntax.NewKeyword) {
          n.name = parse.identifierName();
          parse.expected(Syntax.ColonToken);
        }
        n.type = this.type();
        return finishNode(n);
      }
      type(): TypeNode {
        scanner.setInJSDocType(true);
        const m = parse.optionalToken(Syntax.ModuleKeyword);
        if (m) {
          const n = create.node(Syntax.JSDocNamepathType, m.pos);
          terminate: while (true) {
            switch (tok()) {
              case Syntax.CloseBraceToken:
              case Syntax.EndOfFileToken:
              case Syntax.CommaToken:
              case Syntax.WhitespaceTrivia:
                break terminate;
              default:
                next.tokJSDoc();
            }
          }
          scanner.setInJSDocType(false);
          return finishNode(n);
        }
        const d3 = parse.optionalToken(Syntax.Dot3Token);
        let type = parse.typeOrTypePredicate();
        scanner.setInJSDocType(false);
        if (d3) {
          const n = create.node(Syntax.JSDocVariadicType, d3.pos);
          n.type = type;
          type = finishNode(n);
        }
        if (tok() === Syntax.EqualsToken) return create.postfixType(Syntax.JSDocOptionalType, type);
        return type;
      }
      typeExpression(mayOmitBraces?: boolean): JSDocTypeExpression {
        const n = create.node(Syntax.JSDocTypeExpression);
        const hasBrace = (mayOmitBraces ? parse.optional : parse.expected)(Syntax.OpenBraceToken);
        n.type = flags.withContext(NodeFlags.JSDoc, this.type);
        if (!mayOmitBraces || hasBrace) this.expected(Syntax.CloseBraceToken);
        fixupParentReferences(n);
        return finishNode(n);
      }
      typeExpressionForTests(content: string, start: number | undefined, length: number | undefined): { jsDocTypeExpression: JSDocTypeExpression; diagnostics: Diagnostic[] } | undefined {
        initializeState(content, ScriptTarget.ESNext, undefined, ScriptKind.JS);
        sourceFile = createSourceFile('file.js', ScriptTarget.ESNext, ScriptKind.JS, false);
        scanner.setText(content, start, length);
        currentToken = scanner.scan();
        const jsDocTypeExpression = this.typeExpression();
        const diagnostics = parseDiagnostics;
        clearState();
        return jsDocTypeExpression ? { jsDocTypeExpression, diagnostics } : undefined;
      }
      tag(margin: number) {
        assert(tok() === Syntax.AtToken);
        const start = scanner.getTokenPos();
        next.tokJSDoc();
        const tagName = this.identifierName(undefined);
        const indentText = skipWhitespaceOrAsterisk();
        let tag: JSDocTag | undefined;
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
            tag = this.simpleTag(start, Syntax.JSDocClassTag, tagName);
            break;
          case 'public':
            tag = this.simpleTag(start, Syntax.JSDocPublicTag, tagName);
            break;
          case 'private':
            tag = this.simpleTag(start, Syntax.JSDocPrivateTag, tagName);
            break;
          case 'protected':
            tag = this.simpleTag(start, Syntax.JSDocProtectedTag, tagName);
            break;
          case 'readonly':
            tag = this.simpleTag(start, Syntax.JSDocReadonlyTag, tagName);
            break;
          case 'this':
            tag = this.thisTag(start, tagName);
            break;
          case 'enum':
            tag = this.enumTag(start, tagName);
            break;
          case 'arg':
          case 'argument':
          case 'param':
            return this.parameterOrPropertyTag(start, tagName, Parser.PropertyLike.Parameter, margin);
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
        let state = Parser.State.BeginningOfLine;
        let margin: number | undefined;
        function pushComment(text: string) {
          if (!margin) margin = indent;
          comments.push(text);
          indent += text.length;
        }
        if (initialMargin !== undefined) {
          if (initialMargin !== '') pushComment(initialMargin);
          state = Parser.State.SawAsterisk;
        }
        let tok = tok() as JSDocSyntax;
        loop: while (true) {
          switch (tok) {
            case Syntax.NewLineTrivia:
              if (state >= Parser.State.SawAsterisk) {
                state = Parser.State.BeginningOfLine;
                comments.push(scanner.getTokenText());
              }
              indent = 0;
              break;
            case Syntax.AtToken:
              if (state === Parser.State.SavingBackticks) {
                comments.push(scanner.getTokenText());
                break;
              }
              scanner.setTextPos(scanner.getTextPos() - 1);
            case Syntax.EndOfFileToken:
              break loop;
            case Syntax.WhitespaceTrivia:
              if (state === Parser.State.SavingComments || state === Parser.State.SavingBackticks) {
                pushComment(scanner.getTokenText());
              } else {
                const whitespace = scanner.getTokenText();
                if (margin !== undefined && indent + whitespace.length > margin) comments.push(whitespace.slice(margin - indent));
                indent += whitespace.length;
              }
              break;
            case Syntax.OpenBraceToken:
              state = Parser.State.SavingComments;
              if (lookAhead(() => next.tokJSDoc() === Syntax.AtToken && identifierOrKeyword(next.tokJSDoc()) && scanner.getTokenText() === 'link')) {
                pushComment(scanner.getTokenText());
                next.tokJSDoc();
                pushComment(scanner.getTokenText());
                next.tokJSDoc();
              }
              pushComment(scanner.getTokenText());
              break;
            case Syntax.BacktickToken:
              if (state === Parser.State.SavingBackticks) state = Parser.State.SavingComments;
              else state = Parser.State.SavingBackticks;
              pushComment(scanner.getTokenText());
              break;
            case Syntax.AsteriskToken:
              if (state === Parser.State.BeginningOfLine) {
                state = Parser.State.SawAsterisk;
                indent += 1;
                break;
              }
            default:
              if (state !== Parser.State.SavingBackticks) state = Parser.State.SavingComments;
              pushComment(scanner.getTokenText());
              break;
          }
          tok = next.tokJSDoc();
        }
        removeLeadingNewlines(comments);
        removeTrailingWhitespace(comments);
        return comments.length === 0 ? undefined : comments.join('');
      }
      unknownTag(start: number, tagName: Identifier) {
        const n = create.node(Syntax.JSDocTag, start);
        n.tagName = tagName;
        return finishNode(n);
      }
      tryTypeExpression(): JSDocTypeExpression | undefined {
        skipWhitespaceOrAsterisk();
        return tok() === Syntax.OpenBraceToken ? this.typeExpression() : undefined;
      }
      bracketNameInPropertyAndParamTag(): { name: EntityName; isBracketed: boolean } {
        const isBracketed = this.optional(Syntax.OpenBracketToken);
        if (isBracketed) skipWhitespace();
        const isBackquoted = this.optional(Syntax.BacktickToken);
        const name = this.entityName();
        if (isBackquoted) this.expectedToken(Syntax.BacktickToken);
        if (isBracketed) {
          skipWhitespace();
          if (this.optionalToken(Syntax.EqualsToken)) this.expression();
          this.expected(Syntax.CloseBracketToken);
        }
        return { name, isBracketed };
      }
      parameterOrPropertyTag(start: number, tagName: Identifier, target: Parser.PropertyLike, indent: number): JSDocParameterTag | JSDocPropertyTag {
        let typeExpression = this.tryTypeExpression();
        let isNameFirst = !typeExpression;
        skipWhitespaceOrAsterisk();
        const { name, isBracketed } = this.bracketNameInPropertyAndParamTag();
        skipWhitespace();
        if (isNameFirst) typeExpression = this.tryTypeExpression();
        const n = target === Parser.PropertyLike.Property ? create.node(Syntax.JSDocPropertyTag, start) : create.node(Syntax.JSDocParameterTag, start);
        const comment = this.tagComments(indent + scanner.getStartPos() - start);
        const nestedTypeLiteral = target !== Parser.PropertyLike.CallbackParameter && this.nestedTypeLiteral(typeExpression, name, target, indent);
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
      nestedTypeLiteral(typeExpression: JSDocTypeExpression | undefined, name: EntityName, target: Parser.PropertyLike, indent: number) {
        if (typeExpression && isObjectOrObjectArrayTypeReference(typeExpression.type)) {
          const n = create.node(Syntax.JSDocTypeExpression, scanner.getTokenPos());
          let child: JSDocPropertyLikeTag | JSDocTypeTag | false;
          let n2: JSDocTypeLiteral;
          const start = scanner.getStartPos();
          let children: JSDocPropertyLikeTag[] | undefined;
          while ((child = tryParse(() => this.childParameterOrPropertyTag(target, indent, name)))) {
            if (child.kind === Syntax.JSDocParameterTag || child.kind === Syntax.JSDocPropertyTag) children = append(children, child);
          }
          if (children) {
            n2 = create.node(Syntax.JSDocTypeLiteral, start);
            n2.jsDocPropertyTags = children;
            if (typeExpression.type.kind === Syntax.ArrayType) n2.isArrayType = true;
            n.type = finishNode(n2);
            return finishNode(n);
          }
        }
        return;
      }
      returnTag(start: number, tagName: Identifier): JSDocReturnTag {
        if (some(this.tags, isJSDocReturnTag)) parse.errorAt(tagName.pos, scanner.getTokenPos(), Diagnostics._0_tag_already_specified, tagName.escapedText);
        const n = create.node(Syntax.JSDocReturnTag, start);
        n.tagName = tagName;
        n.typeExpression = this.tryTypeExpression();
        return finishNode(n);
      }
      typeTag(start: number, tagName: Identifier): JSDocTypeTag {
        if (some(this.tags, isJSDocTypeTag)) parse.errorAt(tagName.pos, scanner.getTokenPos(), Diagnostics._0_tag_already_specified, tagName.escapedText);
        const n = create.node(Syntax.JSDocTypeTag, start);
        n.tagName = tagName;
        n.typeExpression = this.typeExpression(true);
        return finishNode(n);
      }
      authorTag(start: number, tagName: Identifier, indent: number): JSDocAuthorTag {
        const n = create.node(Syntax.JSDocAuthorTag, start);
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
          token = next.tokJSDoc();
        }
        if (seenLessThan && seenGreaterThan) return comments.length === 0 ? undefined : comments.join('');
        return;
      }
      implementsTag(start: number, tagName: Identifier): JSDocImplementsTag {
        const n = create.node(Syntax.JSDocImplementsTag, start);
        n.tagName = tagName;
        n.class = this.expressionWithTypeArgumentsForAugments();
        return finishNode(n);
      }
      augmentsTag(start: number, tagName: Identifier): JSDocAugmentsTag {
        const n = create.node(Syntax.JSDocAugmentsTag, start);
        n.tagName = tagName;
        n.class = this.expressionWithTypeArgumentsForAugments();
        return finishNode(n);
      }
      expressionWithTypeArgumentsForAugments(): ExpressionWithTypeArguments & {
        expression: Identifier | PropertyAccessEntityNameExpression;
      } {
        const usedBrace = parse.optional(Syntax.OpenBraceToken);
        const n = create.node(Syntax.ExpressionWithTypeArguments) as ExpressionWithTypeArguments & {
          expression: Identifier | PropertyAccessEntityNameExpression;
        };
        n.expression = this.propertyAccessEntityNameExpression();
        n.typeArguments = tryParseTypeArguments();
        const res = finishNode(n);
        if (usedBrace) parse.expected(Syntax.CloseBraceToken);
        return res;
      }
      propertyAccessEntityNameExpression() {
        let n: Identifier | PropertyAccessEntityNameExpression = this.identifierName();
        while (parse.optional(Syntax.DotToken)) {
          const n2: PropertyAccessEntityNameExpression = create.node(Syntax.PropertyAccessExpression, n.pos) as PropertyAccessEntityNameExpression;
          n2.expression = n;
          n2.name = this.identifierName();
          n = finishNode(n2);
        }
        return n;
      }
      simpleTag(start: number, kind: Syntax, tagName: Identifier): JSDocTag {
        const tag = create.node(kind, start);
        tag.tagName = tagName;
        return finishNode(tag);
      }
      thisTag(start: number, tagName: Identifier): JSDocThisTag {
        const tag = create.node(Syntax.JSDocThisTag, start);
        tag.tagName = tagName;
        tag.typeExpression = this.typeExpression(true);
        skipWhitespace();
        return finishNode(tag);
      }
      enumTag(start: number, tagName: Identifier): JSDocEnumTag {
        const n = create.node(Syntax.JSDocEnumTag, start);
        n.tagName = tagName;
        n.typeExpression = this.typeExpression(true);
        skipWhitespace();
        return finishNode(n);
      }
      typedefTag(start: number, tagName: Identifier, indent: number): JSDocTypedefTag {
        const typeExpression = this.tryTypeExpression();
        skipWhitespaceOrAsterisk();
        const n = create.node(Syntax.JSDocTypedefTag, start);
        n.tagName = tagName;
        n.fullName = this.typeNameWithNamespace();
        n.name = getJSDocTypeAliasName(n.fullName);
        skipWhitespace();
        n.comment = this.tagComments(indent);
        n.typeExpression = typeExpression;
        let end: number | undefined;
        if (!typeExpression || isObjectOrObjectArrayTypeReference(typeExpression.type)) {
          let child: JSDocTypeTag | JSDocPropertyTag | false;
          let n2: JSDocTypeLiteral | undefined;
          let childTypeTag: JSDocTypeTag | undefined;
          while ((child = tryParse(() => this.childPropertyTag(indent)))) {
            if (!n2) n2 = create.node(Syntax.JSDocTypeLiteral, start);
            if (child.kind === Syntax.JSDocTypeTag) {
              if (childTypeTag) {
                parse.errorAtToken(Diagnostics.A_JSDoc_typedef_comment_may_not_contain_multiple_type_tags);
                const lastError = lastOrUndefined(parseDiagnostics);
                if (lastError) addRelatedInfo(lastError, createDiagnosticForNode(sourceFile, Diagnostics.The_tag_was_first_specified_here));
                break;
              } else childTypeTag = child;
            } else n2.jsDocPropertyTags = append(n2.jsDocPropertyTags as MutableNodeArray<JSDocPropertyTag>, child);
          }
          if (n2) {
            if (typeExpression && typeExpression.type.kind === Syntax.ArrayType) n2.isArrayType = true;
            n.typeExpression = childTypeTag && childTypeTag.typeExpression && !isObjectOrObjectArrayTypeReference(childTypeTag.typeExpression.type) ? childTypeTag.typeExpression : finishNode(n2);
            end = n.typeExpression.end;
          }
        }
        return finishNode(n, end || n.comment !== undefined ? scanner.getStartPos() : (n.fullName || n.typeExpression || n.tagName).end);
      }
      typeNameWithNamespace(nested?: boolean) {
        const pos = scanner.getTokenPos();
        if (!identifierOrKeyword(tok())) return;
        const typeNameOrNamespaceName = this.identifierName();
        if (parse.optional(Syntax.DotToken)) {
          const n = create.node(Syntax.ModuleDeclaration, pos);
          if (nested) n.flags |= NodeFlags.NestedNamespace;
          n.name = typeNameOrNamespaceName;
          n.body = this.typeNameWithNamespace(true);
          return finishNode(n);
        }
        if (nested) typeNameOrNamespaceName.isInJSDocNamespace = true;
        return typeNameOrNamespaceName;
      }
      callbackTag(start: number, tagName: Identifier, indent: number): JSDocCallbackTag {
        const n = create.node(Syntax.JSDocCallbackTag, start) as JSDocCallbackTag;
        n.tagName = tagName;
        n.fullName = this.typeNameWithNamespace();
        n.name = getJSDocTypeAliasName(n.fullName);
        skipWhitespace();
        n.comment = this.tagComments(indent);
        let child: JSDocParameterTag | false;
        const n2 = create.node(Syntax.JSDocSignature, start) as JSDocSignature;
        n2.parameters = [];
        while ((child = tryParse(() => this.childParameterOrPropertyTag(Parser.PropertyLike.CallbackParameter, indent) as JSDocParameterTag))) {
          n2.parameters = append(n2.parameters as MutableNodeArray<JSDocParameterTag>, child);
        }
        const returnTag = tryParse(() => {
          if (this.optional(Syntax.AtToken)) {
            const tag = this.tag(indent);
            if (tag && tag.kind === Syntax.JSDocReturnTag) return tag as JSDocReturnTag;
          }
          return;
        });
        if (returnTag) n2.type = returnTag;
        n.typeExpression = finishNode(n2);
        return finishNode(n);
      }
      getJSDocTypeAliasName(fullName: JSDocNamespaceBody | undefined) {
        if (fullName) {
          let rightNode = fullName;
          while (true) {
            if (isIdentifier(rightNode) || !rightNode.body) return isIdentifier(rightNode) ? rightNode : rightNode.name;
            rightNode = rightNode.body;
          }
        }
        return;
      }
      childPropertyTag(indent: number) {
        return this.childParameterOrPropertyTag(Parser.PropertyLike.Property, indent) as JSDocTypeTag | JSDocPropertyTag | false;
      }
      childParameterOrPropertyTag(target: Parser.PropertyLike, indent: number, name?: EntityName): JSDocTypeTag | JSDocPropertyTag | JSDocParameterTag | false {
        let canParseTag = true;
        let seenAsterisk = false;
        while (true) {
          switch (next.tokJSDoc()) {
            case Syntax.AtToken:
              if (canParseTag) {
                const child = this.tryChildTag(target, indent);
                if (
                  child &&
                  (child.kind === Syntax.JSDocParameterTag || child.kind === Syntax.JSDocPropertyTag) &&
                  target !== Parser.PropertyLike.CallbackParameter &&
                  name &&
                  (isIdentifier(child.name) || !escapedTextsEqual(name, child.name.left))
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
      tryChildTag(target: Parser.PropertyLike, indent: number): JSDocTypeTag | JSDocPropertyTag | JSDocParameterTag | false {
        assert(tok() === Syntax.AtToken);
        const start = scanner.getStartPos();
        next.tokJSDoc();
        const tagName = this.identifierName();
        skipWhitespace();
        let t: Parser.PropertyLike;
        switch (tagName.escapedText) {
          case 'type':
            return target === Parser.PropertyLike.Property && this.typeTag(start, tagName);
          case 'prop':
          case 'property':
            t = Parser.PropertyLike.Property;
            break;
          case 'arg':
          case 'argument':
          case 'param':
            t = Parser.PropertyLike.Parameter | Parser.PropertyLike.CallbackParameter;
            break;
          default:
            return false;
        }
        if (!(target & t)) return false;
        return this.parameterOrPropertyTag(start, tagName, target, indent);
      }
      templateTag(start: number, tagName: Identifier): JSDocTemplateTag {
        let constraint: JSDocTypeExpression | undefined;
        if (tok() === Syntax.OpenBraceToken) constraint = this.typeExpression();
        const typeParameters = [];
        const typeParametersPos = getNodePos();
        do {
          skipWhitespace();
          const n = create.node(Syntax.TypeParameter);
          n.name = this.identifierName(Diagnostics.Unexpected_token_A_type_parameter_name_was_expected_without_curly_braces);
          finishNode(n);
          skipWhitespaceOrAsterisk();
          typeParameters.push(n);
        } while (this.optional(Syntax.CommaToken));

        const n = create.node(Syntax.JSDocTemplateTag, start);
        n.tagName = tagName;
        n.constraint = constraint;
        n.typeParameters = create.nodeArray(typeParameters, typeParametersPos);
        finishNode(n);
        return n;
      }
      entityName(): EntityName {
        let entity: EntityName = this.identifierName();
        if (parse.optional(Syntax.OpenBracketToken)) parse.expected(Syntax.CloseBracketToken);
        while (parse.optional(Syntax.DotToken)) {
          const name = this.identifierName();
          if (parse.optional(Syntax.OpenBracketToken)) parse.expected(Syntax.CloseBracketToken);
          entity = create.qualifiedName(entity, name);
        }
        return entity;
      }
      identifierName(m?: DiagnosticMessage): Identifier {
        if (!identifierOrKeyword(tok())) return create.missingNode<Identifier>(Syntax.Identifier, !m, m || Diagnostics.Identifier_expected);
        create.identifierCount++;
        const pos = scanner.getTokenPos();
        const end = scanner.getTextPos();
        const n = create.node(Syntax.Identifier, pos);
        if (tok() !== Syntax.Identifier) n.originalKeywordKind = tok();
        n.escapedText = Scanner.escUnderscores(internIdentifier(scanner.getTokenValue()));
        finishNode(n, end);
        next.tokJSDoc();
        return n;
      }
    })();

    function initializeState(_sourceText: string, languageVersion: ScriptTarget, _syntaxCursor: IncrementalParser.SyntaxCursor | undefined, scriptKind: ScriptKind) {
      sourceText = _sourceText;
      syntaxCursor = _syntaxCursor;
      parseDiagnostics = [];
      ctx.init();
      identifiers = QMap.create<string>();
      privateIdentifiers = QMap.create<string>();
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
      scanner.setLanguageVariant(getLanguageVariant(scriptKind));
    }
    function clearState() {
      scanner.clearDirectives();
      scanner.setText('');
      scanner.setOnError(undefined);
      parseDiagnostics = undefined!;
      sourceFile = undefined!;
      identifiers = undefined!;
      syntaxCursor = undefined;
      sourceText = undefined!;
      notParenthesizedArrow = undefined!;
    }
    function consumeNode(n: Node) {
      scanner.setTextPos(n.end);
      next.tok();
      return n;
    }
    function skipWhitespace(): void {
      if (tok() === Syntax.WhitespaceTrivia || tok() === Syntax.NewLineTrivia) {
        if (lookAhead(isNextNonwhitespaceTokenEndOfFile)) return;
      }
      while (tok() === Syntax.WhitespaceTrivia || tok() === Syntax.NewLineTrivia) {
        next.tokJSDoc();
      }
    }
    function skipWhitespaceOrAsterisk(): string {
      if (tok() === Syntax.WhitespaceTrivia || tok() === Syntax.NewLineTrivia) {
        if (lookAhead(isNextNonwhitespaceTokenEndOfFile)) return '';
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
        next.tokJSDoc();
      }
      return seenLineBreak ? indentText : '';
    }
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

    function internIdentifier(s: string): string {
      let i = identifiers.get(s);
      if (i === undefined) identifiers.set(s, (i = s));
      return i;
    }
    function internPrivateIdentifier(s: string): string {
      let i = privateIdentifiers.get(s);
      if (i === undefined) privateIdentifiers.set(s, (i = s));
      return i;
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
      const saveParseDiagnosticsLength = parseDiagnostics.length;
      const saveParseErrorBeforeNextFinishedNode = parseErrorBeforeNextFinishedNode;
      const saveContextFlags = flags.value;
      const r = isLookAhead ? scanner.lookAhead(cb) : scanner.tryScan(cb);
      assert(saveContextFlags === flags.value);
      if (!r || isLookAhead) {
        currentToken = saveToken;
        parseDiagnostics.length = saveParseDiagnosticsLength;
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
    function comment(parent: HasJSDoc, start: number, length: number): JSDoc | undefined {
      const saveToken = currentToken;
      const saveParseDiagnosticsLength = parseDiagnostics.length;
      const saveParseErrorBeforeNextFinishedNode = parseErrorBeforeNextFinishedNode;
      const comment = flags.withContext(NodeFlags.JSDoc, () => parseJSDoc.comment(start, length));
      if (comment) comment.parent = parent;
      if (flags.value & NodeFlags.JavaScriptFile) {
        if (!sourceFile.jsDocDiagnostics) sourceFile.jsDocDiagnostics = [];
        sourceFile.jsDocDiagnostics.push(...parseDiagnostics);
      }
      currentToken = saveToken;
      parseDiagnostics.length = saveParseDiagnosticsLength;
      parseErrorBeforeNextFinishedNode = saveParseErrorBeforeNextFinishedNode;
      return comment;
    }
    function isolatedComment(content: string, start: number | undefined, length: number | undefined): { jsDoc: JSDoc; diagnostics: Diagnostic[] } | undefined {
      initializeState(content, ScriptTarget.ESNext, undefined, ScriptKind.JS);
      sourceFile = <SourceFile>{ languageVariant: LanguageVariant.TS, text: content };
      const jsDoc = flags.withContext(NodeFlags.JSDoc, () => parseJSDoc.comment(start, length));
      const diagnostics = parseDiagnostics;
      clearState();
      return jsDoc ? { jsDoc, diagnostics } : undefined;
    }

    function escapedTextsEqual(a: EntityName, b: EntityName): boolean {
      while (!isIdentifier(a) || !isIdentifier(b)) {
        if (!isIdentifier(a) && !isIdentifier(b) && a.right.escapedText === b.right.escapedText) {
          a = a.left;
          b = b.left;
        } else return false;
      }
      return a.escapedText === b.escapedText;
    }
    return;
  }
  namespace Parser {
    export const enum Context {
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
    export const enum State {
      BeginningOfLine,
      SawAsterisk,
      SavingComments,
      SavingBackticks,
    }
    export const enum PropertyLike {
      Property = 1 << 0,
      Parameter = 1 << 1,
      CallbackParameter = 1 << 2,
    }
  }

  const enum SignatureFlags {
    None = 0,
    Yield = 1 << 0,
    Await = 1 << 1,
    Type = 1 << 2,
    IgnoreMissingOpenBrace = 1 << 4,
    JSDoc = 1 << 5,
  }
  const enum Tristate {
    False,
    True,
    Unknown,
  }

  export function toString(t: Syntax) {
    return tokStrings[t];
  }
  export function fromString(s: string) {
    return strToTok.get(s);
  }
  export function identifierOrKeyword(t: Syntax) {
    return t >= Syntax.Identifier;
  }
  export function identifierOrKeywordOrGreaterThan(t: Syntax) {
    return t === Syntax.GreaterThanToken || identifierOrKeyword(t);
  }

  export function createSourceFile(fileName: string, sourceText: string, languageVersion: ScriptTarget, setParentNodes = false, scriptKind?: ScriptKind): SourceFile {
    performance.mark('beforeParse');
    let result: SourceFile;
    perfLogger.logStartParseSourceFile(fileName);
    if (languageVersion === ScriptTarget.JSON) {
      result = Parser.parseSourceFile(fileName, sourceText, languageVersion, undefined, setParentNodes, ScriptKind.JSON);
    } else {
      result = Parser.parseSourceFile(fileName, sourceText, languageVersion, undefined, setParentNodes, scriptKind);
    }
    perfLogger.logStopParseSourceFile();
    performance.mark('afterParse');
    performance.measure('Parse', 'beforeParse', 'afterParse');
    return result;
  }
  export function parseIsolatedEntityName(text: string, languageVersion: ScriptTarget): EntityName | undefined {
    return Parser.parseIsolatedEntityName(text, languageVersion);
  }
  export function parseJsonText(fileName: string, sourceText: string): JsonSourceFile {
    return Parser.parseJsonText(fileName, sourceText);
  }
  export function isExternalModule(file: SourceFile): boolean {
    return file.externalModuleIndicator !== undefined;
  }
  export function updateSourceFile(sourceFile: SourceFile, newText: string, textChangeRange: TextChangeRange, aggressiveChecks = false): SourceFile {
    const newSourceFile = IncrementalParser.updateSourceFile(sourceFile, newText, textChangeRange, aggressiveChecks);
    // Because new source file node is created, it may not have the flag PossiblyContainDynamicImport. This is the case if there is no new edit to add dynamic import.
    // We will manually port the flag to the new source file.
    newSourceFile.flags |= sourceFile.flags & NodeFlags.PermanentlySetIncrementalFlags;
    return newSourceFile;
  }
  export function parseJSDocIsolatedComment(content: string, start?: number, length?: number) {
    const result = Parser.parseJSDoc.isolatedComment(content, start, length);
    if (result && result.jsDoc) {
      // because the jsDocComment was parsed out of the source file, it might
      // not be covered by the fixupParentReferences.
      Parser.fixupParentReferences(result.jsDoc);
    }

    return result;
  }
  export function parseJSDocTypeExpressionForTests(content: string, start?: number, length?: number) {
    return Parser.JSDocParser.parseJSDoc.typeExpressionForTests(content, start, length);
  }

  namespace Parser {
    export function parseSourceFile(
      fileName: string,
      sourceText: string,
      languageVersion: ScriptTarget,
      syntaxCursor: IncrementalParser.SyntaxCursor | undefined,
      setParentNodes = false,
      scriptKind?: ScriptKind
    ): SourceFile {
      scriptKind = ensureScriptKind(fileName, scriptKind);
      if (scriptKind === ScriptKind.JSON) {
        const r = parseJsonText(fileName, sourceText, languageVersion, syntaxCursor, setParentNodes);
        convertToObjectWorker(r, r.parseDiagnostics, false, undefined, undefined);
        r.referencedFiles = emptyArray;
        r.typeReferenceDirectives = emptyArray;
        r.libReferenceDirectives = emptyArray;
        r.amdDependencies = emptyArray;
        r.hasNoDefaultLib = false;
        r.pragmas = emptyMap;
        return r;
      }
      initializeState(sourceText, languageVersion, syntaxCursor, scriptKind);
      const r = parseSourceFileWorker(fileName, languageVersion, setParentNodes, scriptKind);
      clearState();
      return r;
    }
    export function parseIsolatedEntityName(content: string, languageVersion: ScriptTarget): EntityName | undefined {
      initializeState(content, languageVersion, undefined, ScriptKind.JS);
      next.tok();
      const entityName = parse.entityName(true);
      const isInvalid = tok() === Syntax.EndOfFileToken && !parseDiagnostics.length;
      clearState();
      return isInvalid ? entityName : undefined;
    }
    export function parseJsonText(
      fileName: string,
      sourceText: string,
      languageVersion: ScriptTarget = ScriptTarget.ES2020,
      syntaxCursor?: IncrementalParser.SyntaxCursor,
      setParentNodes?: boolean
    ): JsonSourceFile {
      initializeState(sourceText, languageVersion, syntaxCursor, ScriptKind.JSON);
      sourceFile = createSourceFile(fileName, ScriptTarget.ES2020, ScriptKind.JSON, /*isDeclaration*/ false);
      sourceFile.flags = flags.value;
      next.tok();
      const pos = getNodePos();
      if (tok() === Syntax.EndOfFileToken) {
        sourceFile.statements = create.nodeArray([], pos, pos);
        sourceFile.endOfFileToken = parse.tokenNode<EndOfFileToken>();
      } else {
        const statement = create.node(Syntax.ExpressionStatement) as JsonObjectExpressionStatement;
        switch (tok()) {
          case Syntax.OpenBracketToken:
            statement.expression = parse.arrayLiteralExpression();
            break;
          case Syntax.TrueKeyword:
          case Syntax.FalseKeyword:
          case Syntax.NullKeyword:
            statement.expression = parse.tokenNode<BooleanLiteral | NullLiteral>();
            break;
          case Syntax.MinusToken:
            if (lookAhead(() => next.tok() === Syntax.NumericLiteral && next.tok() !== Syntax.ColonToken)) {
              statement.expression = parse.prefixUnaryExpression() as JsonMinusNumericLiteral;
            } else {
              statement.expression = objectLiteralExpression();
            }
            break;
          case Syntax.NumericLiteral:
          case Syntax.StringLiteral:
            if (lookAhead(() => next.tok() !== Syntax.ColonToken)) {
              statement.expression = parse.literalNode() as StringLiteral | NumericLiteral;
              break;
            }
          default:
            statement.expression = objectLiteralExpression();
            break;
        }
        finishNode(statement);
        sourceFile.statements = create.nodeArray([statement], pos);
        sourceFile.endOfFileToken = parse.expectedToken(Syntax.EndOfFileToken, Diagnostics.Unexpected_token);
      }
      if (setParentNodes) fixupParentReferences(sourceFile);
      sourceFile.nodeCount = create.nodeCount;
      sourceFile.identifierCount = create.identifierCount;
      sourceFile.identifiers = identifiers;
      sourceFile.parseDiagnostics = parseDiagnostics;
      const r = sourceFile as JsonSourceFile;
      clearState();
      return r;
    }
    function getLanguageVariant(scriptKind: ScriptKind) {
      return scriptKind === ScriptKind.TSX || scriptKind === ScriptKind.JSX || scriptKind === ScriptKind.JS || scriptKind === ScriptKind.JSON ? LanguageVariant.TX : LanguageVariant.TS;
    }
    function parseSourceFileWorker(fileName: string, languageVersion: ScriptTarget, setParentNodes: boolean, scriptKind: ScriptKind): SourceFile {
      const isDeclarationFile = isDeclarationFileName(fileName);
      if (isDeclarationFile) flags.value |= NodeFlags.Ambient;
      sourceFile = createSourceFile(fileName, languageVersion, scriptKind, isDeclarationFile);
      sourceFile.flags = flags.value;
      next.tok();
      processCommentPragmas((sourceFile as {}) as PragmaContext, sourceText);
      processPragmasIntoFields((sourceFile as {}) as PragmaContext, reportPragmaDiagnostic);
      sourceFile.statements = ctx.parseList(Parser.Context.SourceElements, parse.statement);
      assert(tok() === Syntax.EndOfFileToken);
      sourceFile.endOfFileToken = addJSDocComment(parse.tokenNode());
      setExternalModuleIndicator(sourceFile);
      sourceFile.commentDirectives = scanner.getDirectives();
      sourceFile.nodeCount = create.nodeCount;
      sourceFile.identifierCount = create.identifierCount;
      sourceFile.identifiers = identifiers;
      sourceFile.parseDiagnostics = parseDiagnostics;
      if (setParentNodes) fixupParentReferences(sourceFile);
      return sourceFile;
      function reportPragmaDiagnostic(pos: number, end: number, diagnostic: DiagnosticMessage) {
        parseDiagnostics.push(createFileDiagnostic(sourceFile, pos, end, diagnostic));
      }
    }
    function addJSDocComment<T extends HasJSDoc>(n: T): T {
      assert(!n.jsDoc); // Should only be called once per node
      const jsDoc = mapDefined(getJSDocCommentRanges(node, sourceFile.text), (comment) => JSDocParser.parseJSDoc.comment(node, comment.pos, comment.end - comment.pos));
      if (jsDoc.length) n.jsDoc = jsDoc;
      return node;
    }
    export function fixupParentReferences(rootNode: Node) {
      forEachChildRecursively(rootNode, bindParentToChild);
      function bindParentToChild(child: Node, parent: Node) {
        child.parent = parent;
        if (hasJSDocNodes(child)) {
          for (const doc of child.jsDoc!) {
            bindParentToChild(doc, child);
            forEachChildRecursively(doc, bindParentToChild);
          }
        }
      }
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
    function tokenAfterImportDefinitelyProducesImportDeclaration() {
      return tok() === Syntax.AsteriskToken || tok() === Syntax.OpenBraceToken;
    }

    function tokenAfterImportedIdentifierDefinitelyProducesImportDeclaration() {
      return tok() === Syntax.CommaToken || tok() === Syntax.FromKeyword;
    }
    function hasModifierOfKind(n: Node, kind: Syntax) {
      return some(n.modifiers, (m) => m.kind === kind);
    }
    function typeHasArrowFunctionBlockingParseError(n: TypeNode): boolean {
      switch (n.kind) {
        case Syntax.TypeReference:
          return nodeIsMissing((n as TypeReferenceNode).typeName);
        case Syntax.FunctionType:
        case Syntax.ConstructorType: {
          const { parameters, type } = n as FunctionOrConstructorTypeNode;
          return isMissingList(parameters) || typeHasArrowFunctionBlockingParseError(type);
        }
        case Syntax.ParenthesizedType:
          return typeHasArrowFunctionBlockingParseError((n as ParenthesizedTypeNode).type);
        default:
          return false;
      }
    }

    function fillSignature(returnToken: Syntax.ColonToken | Syntax.EqualsGreaterThanToken, flags: SignatureFlags, signature: SignatureDeclaration): boolean {
      if (!(flags & SignatureFlags.JSDoc)) signature.typeParameters = parse.typeParameters();
      const parametersParsedSuccessfully = parse.parameterList(signature, flags);
      if (shouldParseReturnType(returnToken, !!(flags & SignatureFlags.Type))) {
        signature.type = parse.typeOrTypePredicate();
        if (typeHasArrowFunctionBlockingParseError(signature.type)) return false;
      }
      return parametersParsedSuccessfully;
    }
    function shouldParseReturnType(returnToken: Syntax.ColonToken | Syntax.EqualsGreaterThanToken, isType: boolean): boolean {
      if (returnToken === Syntax.EqualsGreaterThanToken) {
        parse.expected(returnToken);
        return true;
      } else if (parse.optional(Syntax.ColonToken)) {
        return true;
      } else if (isType && tok() === Syntax.EqualsGreaterThanToken) {
        parse.errorAtToken(Diagnostics._0_expected, toString(Syntax.ColonToken));
        next.tok();
        return true;
      }
      return false;
    }
    function skipParameterStart(): boolean {
      if (isModifierKind(tok())) parse.modifiers();
      if (isIdentifier() || tok() === Syntax.ThisKeyword) {
        next.tok();
        return true;
      }
      if (tok() === Syntax.OpenBracketToken || tok() === Syntax.OpenBraceToken) {
        const previousErrorCount = parseDiagnostics.length;
        parse.identifierOrPattern();
        return previousErrorCount === parseDiagnostics.length;
      }
      return false;
    }
    function tryParseParenthesizedArrowFunctionExpression(): Expression | undefined {
      const triState = isParenthesizedArrowFunctionExpression();
      if (triState === Tristate.False) return;
      const arrowFunction = triState === Tristate.True ? parse.parenthesizedArrowFunctionExpressionHead(true) : tryParse(parse.possibleParenthesizedArrowFunctionExpressionHead);
      if (!arrowFunction) return;
      const isAsync = hasModifierOfKind(arrowFunction, Syntax.AsyncKeyword);
      const lastToken = tok();
      arrowFunction.equalsGreaterThanToken = parse.expectedToken(Syntax.EqualsGreaterThanToken);
      arrowFunction.body = lastToken === Syntax.EqualsGreaterThanToken || lastToken === Syntax.OpenBraceToken ? parse.arrowFunctionExpressionBody(isAsync) : parse.identifier();
      return finishNode(arrowFunction);
    }
    function tryParseAsyncSimpleArrowFunctionExpression(): ArrowFunction | undefined {
      if (tok() === Syntax.AsyncKeyword) {
        if (lookAhead(isUnParenthesizedAsyncArrowFunctionWorker) === Tristate.True) {
          const asyncModifier = parse.modifiersForArrowFunction();
          const expr = parse.binaryExpressionOrHigher(/*precedence*/ 0);
          return parse.simpleArrowFunctionExpression(<Identifier>expr, asyncModifier);
        }
      }
      return;
    }
    function makeBinaryExpression(left: Expression, operatorToken: BinaryOperatorToken, right: Expression): BinaryExpression {
      const n = create.node(Syntax.BinaryExpression, left.pos);
      n.left = left;
      n.operatorToken = operatorToken;
      n.right = right;
      return finishNode(n);
    }
    function makeAsExpression(left: Expression, right: TypeNode): AsExpression {
      const n = create.node(Syntax.AsExpression, left.pos);
      n.expression = left;
      n.type = right;
      return finishNode(n);
    }
    function tryReparseOptionalChain(n: Expression) {
      if (n.flags & NodeFlags.OptionalChain) return true;
      if (isNonNullExpression(n)) {
        let expr = n.expression;
        while (isNonNullExpression(expr) && !(expr.flags & NodeFlags.OptionalChain)) {
          expr = expr.expression;
        }
        if (expr.flags & NodeFlags.OptionalChain) {
          while (isNonNullExpression(n)) {
            n.flags |= NodeFlags.OptionalChain;
            n = n.expression;
          }
          return true;
        }
      }
      return false;
    }
    function tryParseConstructorDeclaration(n: ConstructorDeclaration): ConstructorDeclaration | undefined {
      return tryParse(() => {
        if (parse.constructorName()) {
          n.kind = Syntax.Constructor;
          fillSignature(Syntax.ColonToken, SignatureFlags.None, n);
          n.body = parse.functionBlockOrSemicolon(SignatureFlags.None, Diagnostics.or_expected);
          return finishNode(n);
        }
        return;
      });
    }
    function tryParseTypeArguments(): NodeArray<TypeNode> | undefined {
      return tok() === Syntax.LessThanToken ? ctx.parseBracketedList(Parser.Context.TypeArguments, parse.type, Syntax.LessThanToken, Syntax.GreaterThanToken) : undefined;
    }
    function setExternalModuleIndicator(sourceFile: SourceFile) {
      sourceFile.externalModuleIndicator = forEach(sourceFile.statements, isAnExternalModuleIndicatorNode) || getImportMetaIfNecessary(sourceFile);
    }
    function getImportMetaIfNecessary(sourceFile: SourceFile) {
      return sourceFile.flags & NodeFlags.PossiblyContainsImportMeta ? walkTreeForExternalModuleIndicators(sourceFile) : undefined;
    }
    function walkTreeForExternalModuleIndicators(n: Node): Node | undefined {
      return isImportMeta(n) ? n : forEachChild(n, walkTreeForExternalModuleIndicators);
    }
  }

  namespace IncrementalParser {
    export function updateSourceFile(sourceFile: SourceFile, newText: string, textChangeRange: TextChangeRange, aggressiveChecks: boolean): SourceFile {
      aggressiveChecks = aggressiveChecks || Debug.shouldAssert(AssertionLevel.Aggressive);
      checkChangeRange(sourceFile, newText, textChangeRange, aggressiveChecks);
      if (textChangeRangeIsUnchanged(textChangeRange)) return sourceFile;
      if (sourceFile.statements.length === 0) {
        return Parser.parseSourceFile(sourceFile.fileName, newText, sourceFile.languageVersion, undefined, /*setParentNodes*/ true, sourceFile.scriptKind);
      }
      const incrementalSourceFile = <IncrementalNode>(<Node>sourceFile);
      assert(!incrementalSourceFile.hasBeenIncrementallyParsed);
      incrementalSourceFile.hasBeenIncrementallyParsed = true;
      const oldText = sourceFile.text;
      const syntaxCursor = createSyntaxCursor(sourceFile);
      const changeRange = extendToAffectedRange(sourceFile, textChangeRange);
      checkChangeRange(sourceFile, newText, changeRange, aggressiveChecks);
      assert(changeRange.span.start <= textChangeRange.span.start);
      assert(textSpanEnd(changeRange.span) === textSpanEnd(textChangeRange.span));
      assert(textSpanEnd(textChangeRangeNewSpan(changeRange)) === textSpanEnd(textChangeRangeNewSpan(textChangeRange)));
      const delta = textChangeRangeNewSpan(changeRange).length - changeRange.span.length;
      updateTokenPositionsAndMarkElements(
        incrementalSourceFile,
        changeRange.span.start,
        textSpanEnd(changeRange.span),
        textSpanEnd(textChangeRangeNewSpan(changeRange)),
        delta,
        oldText,
        newText,
        aggressiveChecks
      );
      const result = Parser.parseSourceFile(sourceFile.fileName, newText, sourceFile.languageVersion, syntaxCursor, /*setParentNodes*/ true, sourceFile.scriptKind);
      result.commentDirectives = getNewCommentDirectives(
        sourceFile.commentDirectives,
        result.commentDirectives,
        changeRange.span.start,
        textSpanEnd(changeRange.span),
        delta,
        oldText,
        newText,
        aggressiveChecks
      );
      return result;
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
            assert(oldText.substring(range.pos, range.end) === newText.substring(updatedDirective.range.pos, updatedDirective.range.end));
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

    function moveElementEntirelyPastChangeRange(element: IncrementalElement, isArray: boolean, delta: number, oldText: string, newText: string, aggressiveChecks: boolean) {
      if (isArray) visitArray(<IncrementalNodeArray>element);
      else visitNode(<IncrementalNode>element);
      return;
      function visitNode(n: IncrementalNode) {
        let text = '';
        if (aggressiveChecks && shouldCheckNode(n)) text = oldText.substring(n.pos, n.end);
        if (n._children) n._children = undefined;
        n.pos += delta;
        n.end += delta;
        if (aggressiveChecks && shouldCheckNode(n)) assert(text === newText.substring(n.pos, n.end));
        forEachChild(n, visitNode, visitArray);
        if (hasJSDocNodes(n)) {
          for (const jsDocComment of n.jsDoc!) {
            visitNode(<IncrementalNode>(<Node>jsDocComment));
          }
        }
        checkNodePositions(n, aggressiveChecks);
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

    function shouldCheckNode(n: Node) {
      switch (n.kind) {
        case Syntax.StringLiteral:
        case Syntax.NumericLiteral:
        case Syntax.Identifier:
          return true;
      }
      return false;
    }

    function adjustIntersectingElement(element: IncrementalElement, changeStart: number, changeRangeOldEnd: number, changeRangeNewEnd: number, delta: number) {
      assert(element.end >= changeStart, 'Adjusting an element that was entirely before the change range');
      assert(element.pos <= changeRangeOldEnd, 'Adjusting an element that was entirely after the change range');
      assert(element.pos <= element.end);
      element.pos = Math.min(element.pos, changeRangeNewEnd);
      if (element.end >= changeRangeOldEnd) {
        element.end += delta;
      } else element.end = Math.min(element.end, changeRangeNewEnd);
      assert(element.pos <= element.end);
      if (element.parent) {
        assert(element.pos >= element.parent.pos);
        assert(element.end <= element.parent.end);
      }
    }

    function checkNodePositions(n: Node, aggressiveChecks: boolean) {
      if (aggressiveChecks) {
        let pos = n.pos;
        const visitNode = (child: Node) => {
          assert(child.pos >= pos);
          pos = child.end;
        };
        if (hasJSDocNodes(n)) {
          for (const jsDocComment of n.jsDoc!) {
            visitNode(jsDocComment);
          }
        }
        forEachChild(n, visitNode);
        assert(pos <= n.end);
      }
    }

    function updateTokenPositionsAndMarkElements(
      sourceFile: IncrementalNode,
      changeStart: number,
      changeRangeOldEnd: number,
      changeRangeNewEnd: number,
      delta: number,
      oldText: string,
      newText: string,
      aggressiveChecks: boolean
    ): void {
      visitNode(sourceFile);
      return;
      function visitNode(child: IncrementalNode) {
        assert(child.pos <= child.end);
        if (child.pos > changeRangeOldEnd) {
          moveElementEntirelyPastChangeRange(child, /*isArray*/ false, delta, oldText, newText, aggressiveChecks);
          return;
        }
        const fullEnd = child.end;
        if (fullEnd >= changeStart) {
          child.intersectsChange = true;
          child._children = undefined;
          adjustIntersectingElement(child, changeStart, changeRangeOldEnd, changeRangeNewEnd, delta);
          forEachChild(child, visitNode, visitArray);
          if (hasJSDocNodes(child)) {
            for (const jsDocComment of child.jsDoc!) {
              visitNode(<IncrementalNode>(<Node>jsDocComment));
            }
          }
          checkNodePositions(child, aggressiveChecks);
          return;
        }
        assert(fullEnd < changeStart);
      }

      function visitArray(array: IncrementalNodeArray) {
        assert(array.pos <= array.end);
        if (array.pos > changeRangeOldEnd) {
          moveElementEntirelyPastChangeRange(array, /*isArray*/ true, delta, oldText, newText, aggressiveChecks);
          return;
        }
        const fullEnd = array.end;
        if (fullEnd >= changeStart) {
          array.intersectsChange = true;
          array._children = undefined;
          adjustIntersectingElement(array, changeStart, changeRangeOldEnd, changeRangeNewEnd, delta);
          for (const node of array) {
            visitNode(node);
          }
          return;
        }
        assert(fullEnd < changeStart);
      }
    }

    function extendToAffectedRange(sourceFile: SourceFile, changeRange: TextChangeRange): TextChangeRange {
      const maxLookahead = 1;
      let start = changeRange.span.start;
      for (let i = 0; start > 0 && i <= maxLookahead; i++) {
        const nearestNode = findNearestNodeStartingBeforeOrAtPosition(sourceFile, start);
        assert(nearestNode.pos <= start);
        const position = nearestNode.pos;
        start = Math.max(0, position - 1);
      }
      const finalSpan = TextSpan.from(start, textSpanEnd(changeRange.span));
      const finalLength = changeRange.newLength + (changeRange.span.start - start);
      return createTextChangeRange(finalSpan, finalLength);
    }

    function findNearestNodeStartingBeforeOrAtPosition(sourceFile: SourceFile, position: number): Node {
      let bestResult: Node = sourceFile;
      let lastNodeEntirelyBeforePosition: Node | undefined;
      forEachChild(sourceFile, visit);
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
        if (nodeIsMissing(child)) return;
        if (child.pos <= position) {
          if (child.pos >= bestResult.pos) bestResult = child;
          if (position < child.end) {
            forEachChild(child, visit);
            return true;
          } else {
            assert(child.end <= position);
            lastNodeEntirelyBeforePosition = child;
          }
        } else {
          assert(child.pos > position);
          return true;
        }
        return;
      }
    }

    function checkChangeRange(sourceFile: SourceFile, newText: string, textChangeRange: TextChangeRange, aggressiveChecks: boolean) {
      const oldText = sourceFile.text;
      if (textChangeRange) {
        assert(oldText.length - textChangeRange.span.length + textChangeRange.newLength === newText.length);
        if (aggressiveChecks || Debug.shouldAssert(AssertionLevel.VeryAggressive)) {
          const oldTextPrefix = oldText.substr(0, textChangeRange.span.start);
          const newTextPrefix = newText.substr(0, textChangeRange.span.start);
          assert(oldTextPrefix === newTextPrefix);
          const oldTextSuffix = oldText.substring(textSpanEnd(textChangeRange.span), oldText.length);
          const newTextSuffix = newText.substring(textSpanEnd(textChangeRangeNewSpan(textChangeRange)), newText.length);
          assert(oldTextSuffix === newTextSuffix);
        }
      }
    }

    interface IncrementalElement extends TextRange {
      parent: Node;
      intersectsChange: boolean;
      length?: number;
      _children: Node[] | undefined;
    }

    export interface IncrementalNode extends Node, IncrementalElement {
      hasBeenIncrementallyParsed: boolean;
    }

    interface IncrementalNodeArray extends NodeArray<IncrementalNode>, IncrementalElement {
      length: number;
    }

    export interface SyntaxCursor {
      currentNode(position: number): IncrementalNode;
    }

    function createSyntaxCursor(sourceFile: SourceFile): SyntaxCursor {
      let currentArray: NodeArray<Node> = sourceFile.statements;
      let currentArrayIndex = 0;
      assert(currentArrayIndex < currentArray.length);
      let current = currentArray[currentArrayIndex];
      let lastQueriedPosition = InvalidPosition.Value;
      return {
        currentNode(position: number) {
          if (position !== lastQueriedPosition) {
            if (current && current.end === position && currentArrayIndex < currentArray.length - 1) {
              currentArrayIndex++;
              current = currentArray[currentArrayIndex];
            }
            if (!current || current.pos !== position) findHighestListElementThatStartsAtPosition(position);
          }
          lastQueriedPosition = position;
          assert(!current || current.pos === position);
          return <IncrementalNode>current;
        },
      };
      function findHighestListElementThatStartsAtPosition(position: number) {
        currentArray = undefined!;
        currentArrayIndex = InvalidPosition.Value;
        current = undefined!;
        forEachChild(sourceFile, visitNode, visitArray);
        return;
        function visitNode(n: Node) {
          if (position >= n.pos && position < n.end) {
            forEachChild(n, visitNode, visitArray);
            return true;
          }
          return false;
        }

        function visitArray(array: NodeArray<Node>) {
          if (position >= array.pos && position < array.end) {
            for (let i = 0; i < array.length; i++) {
              const child = array[i];
              if (child) {
                if (child.pos === position) {
                  currentArray = array;
                  currentArrayIndex = i;
                  current = child;
                  return true;
                } else {
                  if (child.pos < position && position < child.end) {
                    forEachChild(child, visitNode, visitArray);
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

  export function isDeclarationFileName(fileName: string): boolean {
    return fileExtensionIs(fileName, Extension.Dts);
  }

  export interface PragmaContext {
    languageVersion: ScriptTarget;
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
    context.pragmas = createMap() as PragmaMap;
    for (const pragma of pragmas) {
      if (context.pragmas.has(pragma.name)) {
        const currentValue = context.pragmas.get(pragma.name);
        if (currentValue instanceof Array) currentValue.push(pragma.args);
        else context.pragmas.set(pragma.name, [currentValue, pragma.args]);
        continue;
      }
      context.pragmas.set(pragma.name, pragma.args);
    }
  }

  type PragmaDiagnosticReporter = (pos: number, length: number, m: DiagnosticMessage) => void;

  export function processPragmasIntoFields(context: PragmaContext, reportDiagnostic: PragmaDiagnosticReporter): void {
    context.checkJsDirective = undefined;
    context.referencedFiles = [];
    context.typeReferenceDirectives = [];
    context.libReferenceDirectives = [];
    context.amdDependencies = [];
    context.hasNoDefaultLib = false;
    context.pragmas!.forEach((entryOrList, key) => {
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
          context.amdDependencies = map(toArray(entryOrList) as PragmaPseudoMap['amd-dependency'][], (x) => ({
            name: x.arguments.name,
            path: x.arguments.path,
          }));
          break;
        }
        case 'amd-module': {
          if (entryOrList instanceof Array) {
            for (const entry of entryOrList) {
              if (context.moduleName) {
                reportDiagnostic(entry.range.pos, entry.range.end - entry.range.pos, Diagnostics.An_AMD_module_cannot_have_multiple_name_assignments);
              }
              context.moduleName = (entry as PragmaPseudoMap['amd-module']).arguments.name;
            }
          } else context.moduleName = (entryOrList as PragmaPseudoMap['amd-module']).arguments.name;
          break;
        }
        case 'ts-nocheck':
        case 'ts-check': {
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
          return;
        default:
          fail('Unhandled pragma kind');
      }
    });
  }

  const namedArgRegExCache = QMap.create<RegExp>();
  function getNamedArgRegEx(name: string): RegExp {
    if (namedArgRegExCache.has(name)) return namedArgRegExCache.get(name)!;
    const result = new RegExp(`(\\s${name}\\s*=\\s*)('|")(.+?)\\2`, 'im');
    namedArgRegExCache.set(name, result);
    return result;
  }

  const tripleSlashXMLCommentStartRegEx = /^\/\/\/\s*<(\S+)\s.*?\/>/im;
  const singleLinePragmaRegEx = /^\/\/\/?\s*@(\S+)\s*(.*)\s*$/im;
  function extractPragmas(pragmas: PragmaPseudoMapEntry[], range: CommentRange, text: string) {
    const tripleSlash = range.kind === Syntax.SingleLineCommentTrivia && tripleSlashXMLCommentStartRegEx.exec(text);
    if (tripleSlash) {
      const name = tripleSlash[1].toLowerCase() as keyof PragmaPseudoMap;
      const pragma = commentPragmas[name] as PragmaDefinition;
      if (!pragma || !(pragma.kind! & PragmaKindFlags.TripleSlashXML)) return;
      if (pragma.args) {
        const argument: { [index: string]: string | { value: string; pos: number; end: number } } = {};
        for (const arg of pragma.args) {
          const matcher = getNamedArgRegEx(arg.name);
          const matchResult = matcher.exec(text);
          if (!matchResult && !arg.optional) return;
          else if (matchResult) {
            if (arg.captureSpan) {
              const startPos = range.pos + matchResult.index + matchResult[1].length + matchResult[2].length;
              argument[arg.name] = {
                value: matchResult[3],
                pos: startPos,
                end: startPos + matchResult[3].length,
              };
            } else argument[arg.name] = matchResult[3];
          }
        }
        pragmas.push({ name, args: { arguments: argument, range } } as PragmaPseudoMapEntry);
      } else pragmas.push({ name, args: { arguments: {}, range } } as PragmaPseudoMapEntry);
      return;
    }
    const singleLine = range.kind === Syntax.SingleLineCommentTrivia && singleLinePragmaRegEx.exec(text);
    if (singleLine) return addPragmaForMatch(pragmas, range, PragmaKindFlags.SingleLine, singleLine);
    if (range.kind === Syntax.MultiLineCommentTrivia) {
      const multiLinePragmaRegEx = /\s*@(\S+)\s*(.*)\s*$/gim;
      let multiLineMatch: RegExpExecArray | null;
      while ((multiLineMatch = multiLinePragmaRegEx.exec(text))) {
        addPragmaForMatch(pragmas, range, PragmaKindFlags.MultiLine, multiLineMatch);
      }
    }
  }

  function addPragmaForMatch(pragmas: PragmaPseudoMapEntry[], range: CommentRange, kind: PragmaKindFlags, match: RegExpExecArray) {
    if (!match) return;
    const name = match[1].toLowerCase() as keyof PragmaPseudoMap;
    const pragma = commentPragmas[name] as PragmaDefinition;
    if (!pragma || !(pragma.kind! & kind)) return;
    const args = match[2];
    const argument = getNamedPragmaArguments(pragma, args);
    if (argument === 'fail') return;
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
      if (!args[i] && !argument.optional) return 'fail';
      if (argument.captureSpan) return fail('Capture spans not yet implemented for non-xml pragmas');
      argMap[argument.name] = args[i];
    }
    return argMap;
  }

  export function tagNamesAreEquivalent(lhs: JsxTagNameExpression, rhs: JsxTagNameExpression): boolean {
    if (lhs.kind !== rhs.kind) return false;
    if (lhs.kind === Syntax.Identifier) return lhs.escapedText === (<Identifier>rhs).escapedText;
    if (lhs.kind === Syntax.ThisKeyword) return true;
    return (
      (<PropertyAccessExpression>lhs).name.escapedText === (<PropertyAccessExpression>rhs).name.escapedText &&
      tagNamesAreEquivalent((<PropertyAccessExpression>lhs).expression as JsxTagNameExpression, (<PropertyAccessExpression>rhs).expression as JsxTagNameExpression)
    );
  }
}
