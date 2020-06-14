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
    const tok = () => currentToken;

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
        if (canParseSemicolon()) return true;
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
            tok() === Syntax.OpenParenToken || tok() === Syntax.LessThanToken || tok() === Syntax.QuestionToken || tok() === Syntax.ColonToken || tok() === Syntax.CommaToken || canParseSemicolon()
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
          const expr = parseBinaryExpressionOrHigher(/*precedence*/ 0);
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
              return canParseSemicolon();
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
      canFollowModifier() {
        return tok() === Syntax.OpenBracketToken || tok() === Syntax.OpenBraceToken || tok() === Syntax.AsteriskToken || tok() === Syntax.Dot3Token || isLiteralPropertyName();
      }
      canFollowExportModifier() {
        return tok() !== Syntax.AsteriskToken && tok() !== Syntax.AsKeyword && tok() !== Syntax.OpenBraceToken && canFollowModifier();
      }
      canParseSemicolon() {
        if (tok() === Syntax.SemicolonToken) return true;
        return tok() === Syntax.CloseBraceToken || tok() === Syntax.EndOfFileToken || scanner.hasPrecedingLineBreak();
      }
      canFollowContextualOfKeyword() {
        return next.isIdentifier() && next.tok() === Syntax.CloseParenToken;
      }
      canFollowTypeArgumentsInExpression() {
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
      tok(): Syntax {
        if (isKeyword(currentToken) && (scanner.hasUnicodeEscape() || scanner.hasExtendedEscape())) {
          parse.errorAt(scanner.getTokenPos(), scanner.getTextPos(), Diagnostics.Keywords_cannot_contain_escape_characters);
        }
        return this.withoutCheck();
      }
      tokJSDoc(): JSDocSyntax {
        return (currentToken = scanner.scanJsDocToken());
      }
      withoutCheck(): Syntax {
        return (currentToken = scanner.scan());
      }
      canFollowModifier() {
        switch (tok()) {
          case Syntax.ConstKeyword:
            return next.tok() === Syntax.EnumKeyword;
          case Syntax.ExportKeyword:
            next.tok();
            if (tok() === Syntax.DefaultKeyword) return lookAhead(this.canFollowDefaultKeyword);
            if (tok() === Syntax.TypeKeyword) return lookAhead(this.canFollowExportModifier);
            return canFollowExportModifier();
          case Syntax.DefaultKeyword:
            return this.canFollowDefaultKeyword();
          case Syntax.StaticKeyword:
          case Syntax.GetKeyword:
          case Syntax.SetKeyword:
            next.tok();
            return canFollowModifier();
          default:
            return this.isOnSameLineAndCanFollowModifier();
        }
      }
      isOnSameLineAndCanFollowModifier() {
        next.tok();
        if (scanner.hasPrecedingLineBreak()) return false;
        return canFollowModifier();
      }
      private canFollowExportModifier() {
        next.tok();
        return canFollowExportModifier();
      }
      private canFollowDefaultKeyword() {
        next.tok();
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
        next.tok();
        return identifierOrKeyword(tok());
      }
      isIdentifierOrKeywordOrGreaterThan() {
        next.tok();
        return identifierOrKeywordOrGreaterThan(tok());
      }
      isStartOfExpression() {
        next.tok();
        return isStartOfExpression();
      }
      isStartOfType() {
        next.tok();
        return isStartOfType();
      }
      isOpenParenOrLessThan() {
        next.tok();
        return tok() === Syntax.OpenParenToken || tok() === Syntax.LessThanToken;
      }
      isDot() {
        return next.tok() === Syntax.DotToken;
      }
      isOpenParenOrLessThanOrDot() {
        switch (next.tok()) {
          case Syntax.OpenParenToken:
          case Syntax.LessThanToken:
          case Syntax.DotToken:
            return true;
        }
        return false;
      }
      isNumericOrBigIntLiteral() {
        next.tok();
        return tok() === Syntax.NumericLiteral || tok() === Syntax.BigIntLiteral;
      }
      isIdentifierOrKeywordOrOpenBracketOrTemplate() {
        next.tok();
        return identifierOrKeyword(tok()) || tok() === Syntax.OpenBracketToken || isTemplateStartOfTaggedTemplate();
      }
      isIdentifierOrKeywordOnSameLine() {
        next.tok();
        return identifierOrKeyword(tok()) && !scanner.hasPrecedingLineBreak();
      }
      isClassKeywordOnSameLine() {
        next.tok();
        return tok() === Syntax.ClassKeyword && !scanner.hasPrecedingLineBreak();
      }
      isFunctionKeywordOnSameLine() {
        next.tok();
        return tok() === Syntax.FunctionKeyword && !scanner.hasPrecedingLineBreak();
      }
      isIdentifierOrKeywordOrLiteralOnSameLine() {
        next.tok();
        return (identifierOrKeyword(tok()) || tok() === Syntax.NumericLiteral || tok() === Syntax.BigIntLiteral || tok() === Syntax.StringLiteral) && !scanner.hasPrecedingLineBreak();
      }
      isIdentifierOrStartOfDestructuring() {
        next.tok();
        return isIdentifier() || tok() === Syntax.OpenBraceToken || tok() === Syntax.OpenBracketToken;
      }
      isOpenParen() {
        return next.tok() === Syntax.OpenParenToken;
      }
      isSlash() {
        return next.tok() === Syntax.SlashToken;
      }
      isColonOrQuestionColon() {
        return next.tok() === Syntax.ColonToken || (tok() === Syntax.QuestionToken && next.tok() === Syntax.ColonToken);
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
      createNode<T extends Syntax>(k: T, pos?: number): NodeType<T> {
        this.nodeCount++;
        const p = pos! >= 0 ? pos! : scanner.getStartPos();
        return Node.create<T>(k, p, p);
      }
      createMissingNode<T extends Node>(k: T['kind'], report: false, m?: DiagnosticMessage, arg0?: any): T;
      createMissingNode<T extends Node>(k: T['kind'], report: true, m: DiagnosticMessage, arg0?: any): T;
      createMissingNode<T extends Node>(k: T['kind'], report: boolean, m?: DiagnosticMessage, arg0?: any): T {
        if (report) parse.errorAtPosition(scanner.getStartPos(), 0, m!, arg0);
        else if (m) parse.errorAtToken(m, arg0);
        const r = createNode(k);
        if (k === Syntax.Identifier) (r as Identifier).escapedText = '' as __String;
        else if (isLiteralKind(k) || isTemplateLiteralKind(k)) (r as LiteralLikeNode).text = '';
        return finishNode(r);
      }
      createNodeArray<T extends Node>(es: T[], pos: number, end?: number): NodeArray<T> {
        const l = es.length;
        const r = (l >= 1 && l <= 4 ? es.slice() : es) as MutableNodeArray<T>;
        r.pos = pos;
        r.end = end === undefined ? scanner.getStartPos() : end;
        return r;
      }
      createNodeWithJSDoc<T extends Syntax>(k: T, pos?: number): NodeType<T> {
        const n = createNode(k, pos);
        if (scanner.getTokenFlags() & TokenFlags.PrecedingJSDocComment && (k !== Syntax.ExpressionStatement || tok() !== Syntax.OpenParenToken)) {
          addJSDocComment(n);
        }
        return n;
      }
      createIdentifier(isIdentifier: boolean, m?: DiagnosticMessage, pm?: DiagnosticMessage): Identifier {
        identifierCount++;
        if (isIdentifier) {
          const n = createNode(Syntax.Identifier);
          if (tok() !== Syntax.Identifier) n.originalKeywordKind = tok();
          n.escapedText = Scanner.escUnderscores(internIdentifier(scanner.getTokenValue()));
          next.withoutCheck();
          return finishNode(n);
        }
        if (tok() === Syntax.PrivateIdentifier) {
          parse.errorAtToken(pm || Diagnostics.Private_identifiers_are_not_allowed_outside_class_bodies);
          return createIdentifier(true);
        }
        const report = tok() === Syntax.EndOfFileToken;
        const r = scanner.isReservedWord();
        const t = scanner.getTokenText();
        const dm = r ? Diagnostics.Identifier_expected_0_is_a_reserved_word_that_cannot_be_used_here : Diagnostics.Identifier_expected;
        return createMissingNode<Identifier>(Syntax.Identifier, report, m || dm, t);
      }
      createMissingList<T extends Node>(): MissingList<T> {
        const l = createNodeArray<T>([], getNodePos()) as MissingList<T>;
        l.isMissingList = true;
        return l;
      }
      createQualifiedName(e: EntityName, name: Identifier): QualifiedName {
        const n = createNode(Syntax.QualifiedName, e.pos);
        n.left = e;
        n.right = name;
        return finishNode(n);
      }
      createPostfixType(k: Syntax, type: TypeNode) {
        next.tok();
        const n = createNode(k, type.pos) as OptionalTypeNode | JSDocOptionalType | JSDocNonNullableType | JSDocNullableType;
        n.type = type;
        return finishNode(n);
      }
      createJSDocComment(): JSDoc {
        const n = createNode(Syntax.JSDocComment, start);
        n.tags = tags && createNodeArray(tags, tagsPos, tagsEnd);
        n.comment = comments.length ? comments.join('') : undefined;
        return finishNode(n, end);
      }
    })();
    const ctx = new (class {
      code = 0 as Parser.Context;
      init() {
        this.code = 0;
      }
      parseList<T extends Node>(c: Parser.Context, cb: () => T): NodeArray<T> {
        const o = this.code;
        this.code |= 1 << c;
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
        this.code = o;
        return createNodeArray(es, p);
      }
      parseBracketedList<T extends Node>(c: Parser.Context, cb: () => T, open: Syntax, close: Syntax): NodeArray<T> {
        if (parseExpected(open)) {
          const r = this.parseDelimitedList(c, cb);
          parseExpected(close);
          return r;
        }
        return createMissingList<T>();
      }
      parseDelimitedList<T extends Node>(c: Parser.Context, cb: () => T, semicolon?: boolean): NodeArray<T> {
        const o = this.code;
        this.code |= 1 << c;
        const es = [] as T[];
        const p = getNodePos();
        let s = -1;
        while (true) {
          if (this.isListElement(c, false)) {
            const sp = scanner.getStartPos();
            es.push(this.parseListElement(c, cb));
            s = scanner.getTokenPos();
            if (parseOptional(Syntax.CommaToken)) continue;
            s = -1;
            if (this.isListTerminator(c)) break;
            parseExpected(Syntax.CommaToken, this.commaDiag(c));
            if (semicolon && tok() === Syntax.SemicolonToken && !scanner.hasPrecedingLineBreak()) next.tok();
            if (sp === scanner.getStartPos()) next.tok();
            continue;
          }
          if (this.isListTerminator(c)) break;
          if (this.abort(c)) break;
        }
        this.code = o;
        const r = createNodeArray(es, p);
        if (s >= 0) r.hasTrailingComma = true;
        return r;
      }
      parseJsxChildren(tag: JsxOpeningElement | JsxOpeningFragment): NodeArray<JsxChild> {
        const list = [];
        const listPos = getNodePos();
        const c = this.code;
        this.code |= 1 << Parser.Context.JsxChildren;
        while (true) {
          const child = parseJsxChild(tag, (currentToken = scanner.reScanJsxToken()));
          if (!child) break;
          list.push(child);
        }
        this.code = c;
        return createNodeArray(list, listPos);
      }
      tryReuseAmbientDeclaration(): Statement | undefined {
        return flags.withContext(NodeFlags.Ambient, () => {
          const n = this.nodeFor(this.code);
          if (n) return consumeNode(n) as Statement;
          return;
        });
      }
      private nodeFor(c: Parser.Context): Node | undefined {
        if (!syntaxCursor || !this.isReusable(c) || parseErrorBeforeNextFinishedNode) return;
        const n = syntaxCursor.currentNode(scanner.getStartPos());
        if (nodeIsMissing(n) || n.intersectsChange || containsParseError(n)) return;
        const fs = n.flags & NodeFlags.ContextFlags;
        if (fs !== flags.value) return;
        if (!this.canReuse(c, n)) return;
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
      private commaDiag(c: Parser.Context) {
        return c === Parser.Context.EnumMembers ? Diagnostics.An_enum_member_name_must_be_followed_by_a_or : undefined;
      }
      private abort(c: Parser.Context) {
        parse.errorAtToken(this.errors(c));
        for (let c = 0; c < Parser.Context.Count; c++) {
          if (this.code & (1 << c)) {
            if (this.isListElement(c, true) || this.isListTerminator(c)) return true;
          }
        }
        next.tok();
        return false;
      }
      private errors(c: Parser.Context): DiagnosticMessage {
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
      }
      private isReusable(c: Parser.Context) {
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
      }
      private canReuse(c: Parser.Context, n?: Node) {
        if (!n) return false;
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
      }
    })();
    const parse = new (class {
      parseExpected(t: Syntax, m?: DiagnosticMessage, advance = true): boolean {
        if (tok() === t) {
          if (advance) next.tok();
          return true;
        }
        if (m) parse.errorAtToken(m);
        else parse.errorAtToken(Diagnostics._0_expected, toString(t));
        return false;
      }
      parseExpectedJSDoc(t: JSDocSyntax): boolean {
        if (tok() === t) {
          next.tokJSDoc();
          return true;
        }
        parse.errorAtToken(Diagnostics._0_expected, toString(t));
        return false;
      }
      parseOptional(t: Syntax): boolean {
        if (tok() === t) {
          next.tok();
          return true;
        }
        return false;
      }
      parseOptionalToken<T extends Syntax>(t: T): Token<T>;
      parseOptionalToken(t: Syntax): Node | undefined {
        if (tok() === t) return parseTokenNode();
        return;
      }
      parseOptionalTokenJSDoc<T extends JSDocSyntax>(t: T): Token<T>;
      parseOptionalTokenJSDoc(t: JSDocSyntax): Node | undefined {
        if (tok() === t) return parseTokenNodeJSDoc();
        return;
      }
      parseExpectedToken<T extends Syntax>(t: T, m?: DiagnosticMessage, arg0?: any): Token<T>;
      parseExpectedToken(t: Syntax, m?: DiagnosticMessage, arg0?: any): Node {
        return parseOptionalToken(t) || createMissingNode(t, false, m || Diagnostics._0_expected, arg0 || toString(t));
      }
      parseExpectedTokenJSDoc<T extends JSDocSyntax>(t: T): Token<T>;
      parseExpectedTokenJSDoc(t: JSDocSyntax): Node {
        return parseOptionalTokenJSDoc(t) || createMissingNode(t, false, Diagnostics._0_expected, toString(t));
      }
      parseTokenNode<T extends Node>(): T {
        const n = createNode(tok());
        next.tok();
        return finishNode(n);
      }
      parseTokenNodeJSDoc<T extends Node>(): T {
        const n = createNode(tok());
        next.tokJSDoc();
        return finishNode(n);
      }
      parseSemicolon(): boolean {
        if (canParseSemicolon()) {
          if (tok() === Syntax.SemicolonToken) next.tok();
          return true;
        }
        return parseExpected(Syntax.SemicolonToken);
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

    function finishNode<T extends Node>(n: T, end?: number): T {
      n.end = end === undefined ? scanner.getStartPos() : end;
      if (flags.value) n.flags |= flags.value;
      if (parseErrorBeforeNextFinishedNode) {
        parseErrorBeforeNextFinishedNode = false;
        n.flags |= NodeFlags.ThisNodeHasError;
      }
      return n;
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
  export function parseIsolatedJSDocComment(content: string, start?: number, length?: number) {
    const result = Parser.JSDocParser.parseIsolatedJSDocComment(content, start, length);
    if (result && result.jsDoc) {
      // because the jsDocComment was parsed out of the source file, it might
      // not be covered by the fixupParentReferences.
      Parser.fixupParentReferences(result.jsDoc);
    }

    return result;
  }
  export function parseJSDocTypeExpressionForTests(content: string, start?: number, length?: number) {
    return Parser.JSDocParser.parseJSDocTypeExpressionForTests(content, start, length);
  }

  namespace Parser {
    const withDisallowInDecoratorContext = NodeFlags.DisallowInContext | NodeFlags.DecoratorContext;

    let sourceFile: SourceFile;
    let parseDiagnostics: DiagnosticWithLocation[];

    let syntaxCursor: IncrementalParser.SyntaxCursor | undefined;

    let sourceText: string;
    let identifiers: QMap<string>;
    let privateIdentifiers: QMap<string>;
    let identifierCount: number;

    let notParenthesizedArrow: QMap<true> | undefined;

    let parseErrorBeforeNextFinishedNode = false;

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
      const entityName = parseEntityName(true);
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
        sourceFile.statements = createNodeArray([], pos, pos);
        sourceFile.endOfFileToken = parseTokenNode<EndOfFileToken>();
      } else {
        const statement = createNode(Syntax.ExpressionStatement) as JsonObjectExpressionStatement;
        switch (tok()) {
          case Syntax.OpenBracketToken:
            statement.expression = parseArrayLiteralExpression();
            break;
          case Syntax.TrueKeyword:
          case Syntax.FalseKeyword:
          case Syntax.NullKeyword:
            statement.expression = parseTokenNode<BooleanLiteral | NullLiteral>();
            break;
          case Syntax.MinusToken:
            if (lookAhead(() => next.tok() === Syntax.NumericLiteral && next.tok() !== Syntax.ColonToken)) {
              statement.expression = parsePrefixUnaryExpression() as JsonMinusNumericLiteral;
            } else {
              statement.expression = parseObjectLiteralExpression();
            }
            break;
          case Syntax.NumericLiteral:
          case Syntax.StringLiteral:
            if (lookAhead(() => next.tok() !== Syntax.ColonToken)) {
              statement.expression = parseLiteralNode() as StringLiteral | NumericLiteral;
              break;
            }
          default:
            statement.expression = parseObjectLiteralExpression();
            break;
        }
        finishNode(statement);
        sourceFile.statements = createNodeArray([statement], pos);
        sourceFile.endOfFileToken = parseExpectedToken(Syntax.EndOfFileToken, Diagnostics.Unexpected_token);
      }
      if (setParentNodes) fixupParentReferences(sourceFile);
      sourceFile.nodeCount = create.nodeCount;
      sourceFile.identifierCount = identifierCount;
      sourceFile.identifiers = identifiers;
      sourceFile.parseDiagnostics = parseDiagnostics;
      const r = sourceFile as JsonSourceFile;
      clearState();
      return r;
    }
    function getLanguageVariant(scriptKind: ScriptKind) {
      return scriptKind === ScriptKind.TSX || scriptKind === ScriptKind.JSX || scriptKind === ScriptKind.JS || scriptKind === ScriptKind.JSON ? LanguageVariant.TX : LanguageVariant.TS;
    }
    function initializeState(_sourceText: string, languageVersion: ScriptTarget, _syntaxCursor: IncrementalParser.SyntaxCursor | undefined, scriptKind: ScriptKind) {
      sourceText = _sourceText;
      syntaxCursor = _syntaxCursor;
      parseDiagnostics = [];
      ctx.init();
      identifiers = QMap.create<string>();
      privateIdentifiers = QMap.create<string>();
      identifierCount = 0;
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
    function parseSourceFileWorker(fileName: string, languageVersion: ScriptTarget, setParentNodes: boolean, scriptKind: ScriptKind): SourceFile {
      const isDeclarationFile = isDeclarationFileName(fileName);
      if (isDeclarationFile) flags.value |= NodeFlags.Ambient;
      sourceFile = createSourceFile(fileName, languageVersion, scriptKind, isDeclarationFile);
      sourceFile.flags = flags.value;
      next.tok();
      processCommentPragmas((sourceFile as {}) as PragmaContext, sourceText);
      processPragmasIntoFields((sourceFile as {}) as PragmaContext, reportPragmaDiagnostic);
      sourceFile.statements = ctx.parseList(Parser.Context.SourceElements, parseStatement);
      assert(tok() === Syntax.EndOfFileToken);
      sourceFile.endOfFileToken = addJSDocComment(parseTokenNode());
      setExternalModuleIndicator(sourceFile);
      sourceFile.commentDirectives = scanner.getDirectives();
      sourceFile.nodeCount = create.nodeCount;
      sourceFile.identifierCount = identifierCount;
      sourceFile.identifiers = identifiers;
      sourceFile.parseDiagnostics = parseDiagnostics;
      if (setParentNodes) fixupParentReferences(sourceFile);
      return sourceFile;
      function reportPragmaDiagnostic(pos: number, end: number, diagnostic: DiagnosticMessage) {
        parseDiagnostics.push(createFileDiagnostic(sourceFile, pos, end, diagnostic));
      }
    }
    function addJSDocComment<T extends HasJSDoc>(node: T): T {
      assert(!n.jsDoc); // Should only be called once per node
      const jsDoc = mapDefined(getJSDocCommentRanges(node, sourceFile.text), (comment) => JSDocParser.parseJSDocComment(node, comment.pos, comment.end - comment.pos));
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
    function getNodePos(): number {
      return scanner.getStartPos();
    }
    function consumeNode(n: Node) {
      scanner.setTextPos(n.end);
      next.tok();
      return n;
    }
    function scanJsxText(): Syntax {
      return (currentToken = scanner.scanJsxToken());
    }
    function scanJsxIdentifier(): Syntax {
      return (currentToken = scanner.scanJsxIdentifier());
    }
    function scanJsxAttributeValue(): Syntax {
      return (currentToken = scanner.scanJsxAttributeValue());
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
    function tokenAfterImportDefinitelyProducesImportDeclaration() {
      return tok() === Syntax.AsteriskToken || tok() === Syntax.OpenBraceToken;
    }

    function tokenAfterImportedIdentifierDefinitelyProducesImportDeclaration() {
      return tok() === Syntax.CommaToken || tok() === Syntax.FromKeyword;
    }
    function hasModifierOfKind(n: Node, kind: Syntax) {
      return some(n.modifiers, (m) => m.kind === kind);
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
    function parseIdentifier(m?: DiagnosticMessage, pm?: DiagnosticMessage): Identifier {
      return createIdentifier(isIdentifier(), m, pm);
    }
    function parseIdentifierName(m?: DiagnosticMessage): Identifier {
      return createIdentifier(identifierOrKeyword(tok()), m);
    }
    function parsePropertyNameWorker(computed: boolean): PropertyName {
      if (tok() === Syntax.StringLiteral || tok() === Syntax.NumericLiteral) {
        const n = parseLiteralNode() as StringLiteral | NumericLiteral;
        n.text = internIdentifier(n.text);
        return n;
      }
      if (computed && tok() === Syntax.OpenBracketToken) return parseComputedPropertyName();
      if (tok() === Syntax.PrivateIdentifier) return parsePrivateIdentifier();
      return parseIdentifierName();
    }
    function parsePropertyName(): PropertyName {
      return parsePropertyNameWorker(true);
    }
    function parseComputedPropertyName(): ComputedPropertyName {
      const n = createNode(Syntax.ComputedPropertyName);
      parseExpected(Syntax.OpenBracketToken);
      n.expression = flags.withoutDisallowIn(parseExpression);
      parseExpected(Syntax.CloseBracketToken);
      return finishNode(n);
    }
    function internPrivateIdentifier(s: string): string {
      let i = privateIdentifiers.get(s);
      if (i === undefined) privateIdentifiers.set(s, (i = s));
      return i;
    }
    function parsePrivateIdentifier(): PrivateIdentifier {
      const n = createNode(Syntax.PrivateIdentifier);
      n.escapedText = Scanner.escUnderscores(internPrivateIdentifier(scanner.getTokenText()));
      next.tok();
      return finishNode(n);
    }
    function parseContextualModifier(t: Syntax): boolean {
      return tok() === t && tryParse(next.canFollowModifier);
    }
    function parseAnyContextualModifier() {
      return isModifierKind(tok()) && tryParse(next.canFollowModifier);
    }
    function parseEntityName(reserved: boolean, m?: DiagnosticMessage): EntityName {
      let e: EntityName = reserved ? parseIdentifierName(m) : parseIdentifier(m);
      let p = scanner.getStartPos();
      while (parseOptional(Syntax.DotToken)) {
        if (tok() === Syntax.LessThanToken) {
          e.jsdocDotPos = p;
          break;
        }
        p = scanner.getStartPos();
        e = createQualifiedName(e, parseRightSideOfDot(reserved, false) as Identifier);
      }
      return e;
    }
    function parseRightSideOfDot(allow: boolean, privates: boolean): Identifier | PrivateIdentifier {
      if (scanner.hasPrecedingLineBreak() && identifierOrKeyword(tok())) {
        const m = lookAhead(next.isIdentifierOrKeywordOnSameLine);
        if (m) return createMissingNode<Identifier>(Syntax.Identifier, true, Diagnostics.Identifier_expected);
      }
      if (tok() === Syntax.PrivateIdentifier) {
        const n = parsePrivateIdentifier();
        return privates ? n : createMissingNode<Identifier>(Syntax.Identifier, true, Diagnostics.Identifier_expected);
      }
      return allow ? parseIdentifierName() : parseIdentifier();
    }
    function parseTemplateExpression(tagged: boolean): TemplateExpression {
      const n = createNode(Syntax.TemplateExpression);
      n.head = parseTemplateHead(tagged);
      assert(n.head.kind === Syntax.TemplateHead, 'Template head has wrong token kind');
      const ss = [];
      const p = getNodePos();
      do {
        ss.push(parseTemplateSpan(tagged));
      } while (last(ss).literal.kind === Syntax.TemplateMiddle);
      n.templateSpans = createNodeArray(ss, p);
      return finishNode(n);
    }
    function parseTemplateSpan(tagged: boolean): TemplateSpan {
      const n = createNode(Syntax.TemplateSpan);
      n.expression = flags.withoutDisallowIn(parseExpression);
      let l: TemplateMiddle | TemplateTail;
      if (tok() === Syntax.CloseBraceToken) {
        reScanTemplateToken(tagged);
        l = parseTemplateMiddleOrTemplateTail();
      } else {
        l = <TemplateTail>parseExpectedToken(Syntax.TemplateTail, Diagnostics._0_expected, toString(Syntax.CloseBraceToken));
      }
      n.literal = l;
      return finishNode(n);
    }
    function parseLiteralNode(): LiteralExpression {
      return <LiteralExpression>parseLiteralLikeNode(tok());
    }
    function parseTemplateHead(tagged: boolean): TemplateHead {
      if (tagged) reScanHeadOrNoSubstTemplate();
      const fragment = parseLiteralLikeNode(tok());
      assert(fragment.kind === Syntax.TemplateHead, 'Template head has wrong token kind');
      return <TemplateHead>fragment;
    }
    function parseTemplateMiddleOrTemplateTail(): TemplateMiddle | TemplateTail {
      const fragment = parseLiteralLikeNode(tok());
      assert(fragment.kind === Syntax.TemplateMiddle || fragment.kind === Syntax.TemplateTail, 'Template fragment has wrong token kind');
      return <TemplateMiddle | TemplateTail>fragment;
    }
    function parseLiteralLikeNode(k: Syntax): LiteralLikeNode {
      const n = createNode(k);
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
    function parseTypeReference(): TypeReferenceNode {
      const n = createNode(Syntax.TypeReference);
      n.typeName = parseEntityName(true, Diagnostics.Type_expected);
      if (!scanner.hasPrecedingLineBreak() && reScanLessToken() === Syntax.LessThanToken) {
        n.typeArguments = ctx.parseBracketedList(Parser.Context.TypeArguments, parseType, Syntax.LessThanToken, Syntax.GreaterThanToken);
      }
      return finishNode(n);
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
    function parseThisTypePredicate(lhs: ThisTypeNode): TypePredicateNode {
      next.tok();
      const n = createNode(Syntax.TypePredicate, lhs.pos);
      n.parameterName = lhs;
      n.type = parseType();
      return finishNode(n);
    }
    function parseThisTypeNode(): ThisTypeNode {
      const n = createNode(Syntax.ThisType);
      next.tok();
      return finishNode(n);
    }
    function parseJSDocAllType(postFixEquals: boolean): JSDocAllType | JSDocOptionalType {
      const n = createNode(Syntax.JSDocAllType);
      if (postFixEquals) return createPostfixType(Syntax.JSDocOptionalType, n) as JSDocOptionalType;
      next.tok();
      return finishNode(n);
    }
    function parseJSDocNonNullableType(): TypeNode {
      const n = createNode(Syntax.JSDocNonNullableType);
      next.tok();
      n.type = parseNonArrayType();
      return finishNode(n);
    }
    function parseJSDocUnknownOrNullableType(): JSDocUnknownType | JSDocNullableType {
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
        const n = createNode(Syntax.JSDocUnknownType, p);
        return finishNode(n);
      }
      const n = createNode(Syntax.JSDocNullableType, p);
      n.type = parseType();
      return finishNode(n);
    }
    function parseJSDocFunctionType(): JSDocFunctionType | TypeReferenceNode {
      if (lookAhead(next.isOpenParen)) {
        const n = createNodeWithJSDoc(Syntax.JSDocFunctionType);
        next.tok();
        fillSignature(Syntax.ColonToken, SignatureFlags.Type | SignatureFlags.JSDoc, n);
        return finishNode(n);
      }
      const n = createNode(Syntax.TypeReference);
      n.typeName = parseIdentifierName();
      return finishNode(n);
    }
    function parseJSDocParameter(): ParameterDeclaration {
      const n = createNode(Syntax.Parameter);
      if (tok() === Syntax.ThisKeyword || tok() === Syntax.NewKeyword) {
        n.name = parseIdentifierName();
        parseExpected(Syntax.ColonToken);
      }
      n.type = parseJSDocType();
      return finishNode(n);
    }
    function parseJSDocType(): TypeNode {
      scanner.setInJSDocType(true);
      const m = parseOptionalToken(Syntax.ModuleKeyword);
      if (m) {
        const n = createNode(Syntax.JSDocNamepathType, m.pos);
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
      const d3 = parseOptionalToken(Syntax.Dot3Token);
      let type = parseTypeOrTypePredicate();
      scanner.setInJSDocType(false);
      if (d3) {
        const n = createNode(Syntax.JSDocVariadicType, d3.pos);
        n.type = type;
        type = finishNode(n);
      }
      if (tok() === Syntax.EqualsToken) return createPostfixType(Syntax.JSDocOptionalType, type);
      return type;
    }
    function parseTypeQuery(): TypeQueryNode {
      const n = createNode(Syntax.TypeQuery);
      parseExpected(Syntax.TypeOfKeyword);
      n.exprName = parseEntityName(true);
      return finishNode(n);
    }
    function parseTypeParameter(): TypeParameterDeclaration {
      const n = createNode(Syntax.TypeParameter);
      n.name = parseIdentifier();
      if (parseOptional(Syntax.ExtendsKeyword)) {
        if (isStartOfType() || !isStartOfExpression()) n.constraint = parseType();
        else n.expression = parseUnaryExpressionOrHigher();
      }
      if (parseOptional(Syntax.EqualsToken)) n.default = parseType();
      return finishNode(n);
    }
    function parseTypeParameters(): NodeArray<TypeParameterDeclaration> | undefined {
      if (tok() === Syntax.LessThanToken) {
        return ctx.parseBracketedList(Parser.Context.TypeParameters, parseTypeParameter, Syntax.LessThanToken, Syntax.GreaterThanToken);
      }
      return;
    }
    function parseParameterType(): TypeNode | undefined {
      if (parseOptional(Syntax.ColonToken)) return parseType();
      return;
    }
    function parseParameter(): ParameterDeclaration {
      const n = createNodeWithJSDoc(Syntax.Parameter);
      if (tok() === Syntax.ThisKeyword) {
        n.name = createIdentifier(true);
        n.type = parseParameterType();
        return finishNode(n);
      }
      n.decorators = parseDecorators();
      n.modifiers = parseModifiers();
      n.dot3Token = parseOptionalToken(Syntax.Dot3Token);
      // FormalParameter [Yield,Await]:
      //      BindingElement[?Yield,?Await]
      n.name = parseIdentifierOrPattern(Diagnostics.Private_identifiers_cannot_be_used_as_parameters);
      if (getFullWidth(n.name) === 0 && !n.modifiers && isModifierKind(tok())) next.tok();
      n.questionToken = parseOptionalToken(Syntax.QuestionToken);
      n.type = parseParameterType();
      n.initializer = parseInitializer();
      return finishNode(n);
    }
    function fillSignature(returnToken: Syntax.ColonToken | Syntax.EqualsGreaterThanToken, flags: SignatureFlags, signature: SignatureDeclaration): boolean {
      if (!(flags & SignatureFlags.JSDoc)) signature.typeParameters = parseTypeParameters();
      const parametersParsedSuccessfully = parseParameterList(signature, flags);
      if (shouldParseReturnType(returnToken, !!(flags & SignatureFlags.Type))) {
        signature.type = parseTypeOrTypePredicate();
        if (typeHasArrowFunctionBlockingParseError(signature.type)) return false;
      }
      return parametersParsedSuccessfully;
    }
    function shouldParseReturnType(returnToken: Syntax.ColonToken | Syntax.EqualsGreaterThanToken, isType: boolean): boolean {
      if (returnToken === Syntax.EqualsGreaterThanToken) {
        parseExpected(returnToken);
        return true;
      } else if (parseOptional(Syntax.ColonToken)) {
        return true;
      } else if (isType && tok() === Syntax.EqualsGreaterThanToken) {
        parse.errorAtToken(Diagnostics._0_expected, toString(Syntax.ColonToken));
        next.tok();
        return true;
      }
      return false;
    }
    function parseParameterList(signature: SignatureDeclaration, flags: SignatureFlags): boolean {
      if (!parseExpected(Syntax.OpenParenToken)) {
        signature.parameters = createMissingList<ParameterDeclaration>();
        return false;
      }
      const yf = flags.inContext(NodeFlags.YieldContext);
      const af = flags.inContext(NodeFlags.AwaitContext);
      flags.set(!!(flags & SignatureFlags.Yield), NodeFlags.YieldContext);
      flags.set(!!(flags & SignatureFlags.Await), NodeFlags.AwaitContext);
      signature.parameters =
        flags & SignatureFlags.JSDoc ? ctx.parseDelimitedList(Parser.Context.JSDocParameters, parseJSDocParameter) : ctx.parseDelimitedList(Parser.Context.Parameters, parseParameter);
      flags.set(yf, NodeFlags.YieldContext);
      flags.set(af, NodeFlags.AwaitContext);
      return parseExpected(Syntax.CloseParenToken);
    }
    function parseTypeMemberSemicolon() {
      if (parseOptional(Syntax.CommaToken)) return;
      parseSemicolon();
    }
    function parseSignatureMember(k: Syntax.CallSignature | Syntax.ConstructSignature): CallSignatureDeclaration | ConstructSignatureDeclaration {
      const n = createNodeWithJSDoc(k);
      if (k === Syntax.ConstructSignature) parseExpected(Syntax.NewKeyword);
      fillSignature(Syntax.ColonToken, SignatureFlags.Type, n);
      parseTypeMemberSemicolon();
      return finishNode(n);
    }
    function parseIndexSignatureDeclaration(n: IndexSignatureDeclaration): IndexSignatureDeclaration {
      n.kind = Syntax.IndexSignature;
      n.parameters = ctx.parseBracketedList(Parser.Context.Parameters, parseParameter, Syntax.OpenBracketToken, Syntax.CloseBracketToken);
      n.type = parseTypeAnnotation();
      parseTypeMemberSemicolon();
      return finishNode(n);
    }
    function parsePropertyOrMethodSignature(n: PropertySignature | MethodSignature): PropertySignature | MethodSignature {
      n.name = parsePropertyName();
      n.questionToken = parseOptionalToken(Syntax.QuestionToken);
      if (tok() === Syntax.OpenParenToken || tok() === Syntax.LessThanToken) {
        n.kind = Syntax.MethodSignature;
        fillSignature(Syntax.ColonToken, SignatureFlags.Type, <MethodSignature>n);
      } else {
        n.kind = Syntax.PropertySignature;
        n.type = parseTypeAnnotation();
        if (tok() === Syntax.EqualsToken) (<PropertySignature>n).initializer = parseInitializer();
      }
      parseTypeMemberSemicolon();
      return finishNode(n);
    }
    function parseTypeMember(): TypeElement {
      if (tok() === Syntax.OpenParenToken || tok() === Syntax.LessThanToken) return parseSignatureMember(Syntax.CallSignature);
      if (tok() === Syntax.NewKeyword && lookAhead(next.isOpenParenOrLessThan)) return parseSignatureMember(Syntax.ConstructSignature);
      const n = createNodeWithJSDoc(Syntax.Unknown);
      n.modifiers = parseModifiers();
      if (isIndexSignature()) return parseIndexSignatureDeclaration(<IndexSignatureDeclaration>n);
      return parsePropertyOrMethodSignature(<PropertySignature | MethodSignature>n);
    }
    function parseTypeLiteral(): TypeLiteralNode {
      const n = createNode(Syntax.TypeLiteral);
      n.members = parseObjectTypeMembers();
      return finishNode(n);
    }
    function parseObjectTypeMembers(): NodeArray<TypeElement> {
      let members: NodeArray<TypeElement>;
      if (parseExpected(Syntax.OpenBraceToken)) {
        members = ctx.parseList(Parser.Context.TypeMembers, parseTypeMember);
        parseExpected(Syntax.CloseBraceToken);
      } else {
        members = createMissingList<TypeElement>();
      }
      return members;
    }
    function parseMappedTypeParameter() {
      const n = createNode(Syntax.TypeParameter);
      n.name = parseIdentifier();
      parseExpected(Syntax.InKeyword);
      n.constraint = parseType();
      return finishNode(n);
    }
    function parseMappedType() {
      const n = createNode(Syntax.MappedType);
      parseExpected(Syntax.OpenBraceToken);
      if (tok() === Syntax.ReadonlyKeyword || tok() === Syntax.PlusToken || tok() === Syntax.MinusToken) {
        n.readonlyToken = parseTokenNode<ReadonlyToken | PlusToken | MinusToken>();
        if (n.readonlyToken.kind !== Syntax.ReadonlyKeyword) parseExpectedToken(Syntax.ReadonlyKeyword);
      }
      parseExpected(Syntax.OpenBracketToken);
      n.typeParameter = parseMappedTypeParameter();
      parseExpected(Syntax.CloseBracketToken);
      if (tok() === Syntax.QuestionToken || tok() === Syntax.PlusToken || tok() === Syntax.MinusToken) {
        n.questionToken = parseTokenNode<QuestionToken | PlusToken | MinusToken>();
        if (n.questionToken.kind !== Syntax.QuestionToken) parseExpectedToken(Syntax.QuestionToken);
      }
      n.type = parseTypeAnnotation();
      parseSemicolon();
      parseExpected(Syntax.CloseBraceToken);
      return finishNode(n);
    }
    function parseTupleElementType() {
      const p = getNodePos();
      if (parseOptional(Syntax.Dot3Token)) {
        const n = createNode(Syntax.RestType, p);
        n.type = parseType();
        return finishNode(n);
      }
      const t = parseType();
      if (!(flags.value & NodeFlags.JSDoc) && t.kind === Syntax.JSDocNullableType && t.pos === (<JSDocNullableType>t).type.pos) t.kind = Syntax.OptionalType;
      return t;
    }
    function parseTupleElementNameOrTupleElementType() {
      if (lookAhead(isTupleElementName)) {
        const n = createNode(Syntax.NamedTupleMember);
        n.dot3Token = parseOptionalToken(Syntax.Dot3Token);
        n.name = parseIdentifierName();
        n.questionToken = parseOptionalToken(Syntax.QuestionToken);
        parseExpected(Syntax.ColonToken);
        n.type = parseTupleElementType();
        return addJSDocComment(finishNode(n));
      }
      return parseTupleElementType();
    }
    function parseTupleType(): TupleTypeNode {
      const n = createNode(Syntax.TupleType);
      n.elements = ctx.parseBracketedList(Parser.Context.TupleElementTypes, parseTupleElementNameOrTupleElementType, Syntax.OpenBracketToken, Syntax.CloseBracketToken);
      return finishNode(n);
    }
    function parseParenthesizedType(): TypeNode {
      const n = createNode(Syntax.ParenthesizedType);
      parseExpected(Syntax.OpenParenToken);
      n.type = parseType();
      parseExpected(Syntax.CloseParenToken);
      return finishNode(n);
    }
    function parseFunctionOrConstructorType(): TypeNode {
      const p = getNodePos();
      const k = parseOptional(Syntax.NewKeyword) ? Syntax.ConstructorType : Syntax.FunctionType;
      const n = createNodeWithJSDoc(k, p);
      fillSignature(Syntax.EqualsGreaterThanToken, SignatureFlags.Type, n);
      return finishNode(n);
    }
    function parseKeywordAndNoDot(): TypeNode | undefined {
      const n = parseTokenNode<TypeNode>();
      return tok() === Syntax.DotToken ? undefined : n;
    }
    function parseLiteralTypeNode(negative?: boolean): LiteralTypeNode {
      const n = createNode(Syntax.LiteralType);
      let m!: PrefixUnaryExpression;
      if (negative) {
        m = createNode(Syntax.PrefixUnaryExpression);
        m.operator = Syntax.MinusToken;
        next.tok();
      }
      let e: BooleanLiteral | LiteralExpression | PrefixUnaryExpression =
        tok() === Syntax.TrueKeyword || tok() === Syntax.FalseKeyword ? parseTokenNode<BooleanLiteral>() : (parseLiteralLikeNode(tok()) as LiteralExpression);
      if (negative) {
        m.operand = e;
        finishNode(m);
        e = m;
      }
      n.literal = e;
      return finishNode(n);
    }
    function parseImportType(): ImportTypeNode {
      sourceFile.flags |= NodeFlags.PossiblyContainsDynamicImport;
      const n = createNode(Syntax.ImportType);
      if (parseOptional(Syntax.TypeOfKeyword)) n.isTypeOf = true;
      parseExpected(Syntax.ImportKeyword);
      parseExpected(Syntax.OpenParenToken);
      n.argument = parseType();
      parseExpected(Syntax.CloseParenToken);
      if (parseOptional(Syntax.DotToken)) n.qualifier = parseEntityName(true, Diagnostics.Type_expected);
      if (!scanner.hasPrecedingLineBreak() && reScanLessToken() === Syntax.LessThanToken) {
        n.typeArguments = ctx.parseBracketedList(Parser.Context.TypeArguments, parseType, Syntax.LessThanToken, Syntax.GreaterThanToken);
      }
      return finishNode(n);
    }
    function parseNonArrayType(): TypeNode {
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
          return tryParse(parseKeywordAndNoDot) || parseTypeReference();
        case Syntax.AsteriskToken:
          return parseJSDocAllType(/*postfixEquals*/ false);
        case Syntax.AsteriskEqualsToken:
          return parseJSDocAllType(/*postfixEquals*/ true);
        case Syntax.Question2Token:
          // If there is '??', consider that is prefix '?' in JSDoc type.
          scanner.reScanQuestionToken();
        // falls through
        case Syntax.QuestionToken:
          return parseJSDocUnknownOrNullableType();
        case Syntax.FunctionKeyword:
          return parseJSDocFunctionType();
        case Syntax.ExclamationToken:
          return parseJSDocNonNullableType();
        case Syntax.NoSubstitutionLiteral:
        case Syntax.StringLiteral:
        case Syntax.NumericLiteral:
        case Syntax.BigIntLiteral:
        case Syntax.TrueKeyword:
        case Syntax.FalseKeyword:
          return parseLiteralTypeNode();
        case Syntax.MinusToken:
          return lookAhead(next.isNumericOrBigIntLiteral) ? parseLiteralTypeNode(/*negative*/ true) : parseTypeReference();
        case Syntax.VoidKeyword:
        case Syntax.NullKeyword:
          return parseTokenNode<TypeNode>();
        case Syntax.ThisKeyword: {
          const thisKeyword = parseThisTypeNode();
          if (tok() === Syntax.IsKeyword && !scanner.hasPrecedingLineBreak()) {
            return parseThisTypePredicate(thisKeyword);
          } else {
            return thisKeyword;
          }
        }
        case Syntax.TypeOfKeyword:
          return lookAhead(isStartOfTypeOfImportType) ? parseImportType() : parseTypeQuery();
        case Syntax.OpenBraceToken:
          return lookAhead(isStartOfMappedType) ? parseMappedType() : parseTypeLiteral();
        case Syntax.OpenBracketToken:
          return parseTupleType();
        case Syntax.OpenParenToken:
          return parseParenthesizedType();
        case Syntax.ImportKeyword:
          return parseImportType();
        case Syntax.AssertsKeyword:
          return lookAhead(next.isIdentifierOrKeywordOnSameLine) ? parseAssertsTypePredicate() : parseTypeReference();
        default:
          return parseTypeReference();
      }
    }
    function parsePostfixTypeOrHigher(): TypeNode {
      let type = parseNonArrayType();
      while (!scanner.hasPrecedingLineBreak()) {
        switch (tok()) {
          case Syntax.ExclamationToken:
            type = createPostfixType(Syntax.JSDocNonNullableType, type);
            break;
          case Syntax.QuestionToken:
            if (!(flags.value & NodeFlags.JSDoc) && lookAhead(next.isStartOfType)) return type;
            type = createPostfixType(Syntax.JSDocNullableType, type);
            break;
          case Syntax.OpenBracketToken:
            parseExpected(Syntax.OpenBracketToken);
            if (isStartOfType()) {
              const n = createNode(Syntax.IndexedAccessType, type.pos);
              n.objectType = type;
              n.indexType = parseType();
              parseExpected(Syntax.CloseBracketToken);
              type = finishNode(n);
            } else {
              const n = createNode(Syntax.ArrayType, type.pos);
              n.elementType = type;
              parseExpected(Syntax.CloseBracketToken);
              type = finishNode(n);
            }
            break;
          default:
            return type;
        }
      }
      return type;
    }
    function parseTypeOperator(operator: Syntax.KeyOfKeyword | Syntax.UniqueKeyword | Syntax.ReadonlyKeyword) {
      const n = createNode(Syntax.TypeOperator);
      parseExpected(operator);
      n.operator = operator;
      n.type = parseTypeOperatorOrHigher();
      return finishNode(n);
    }
    function parseInferType(): InferTypeNode {
      const n = createNode(Syntax.InferType);
      parseExpected(Syntax.InferKeyword);
      const p = createNode(Syntax.TypeParameter);
      p.name = parseIdentifier();
      n.typeParameter = finishNode(p);
      return finishNode(n);
    }
    function parseTypeOperatorOrHigher(): TypeNode {
      const operator = tok();
      switch (operator) {
        case Syntax.KeyOfKeyword:
        case Syntax.UniqueKeyword:
        case Syntax.ReadonlyKeyword:
          return parseTypeOperator(operator);
        case Syntax.InferKeyword:
          return parseInferType();
      }
      return parsePostfixTypeOrHigher();
    }
    function parseUnionOrIntersectionType(k: Syntax.UnionType | Syntax.IntersectionType, cb: () => TypeNode, o: Syntax.BarToken | Syntax.AmpersandToken): TypeNode {
      const start = scanner.getStartPos();
      const hasLeadingOperator = parseOptional(o);
      let type = cb();
      if (tok() === o || hasLeadingOperator) {
        const types = [type];
        while (parseOptional(o)) {
          types.push(cb());
        }
        const n = createNode(k, start);
        n.types = createNodeArray(types, start);
        type = finishNode(n);
      }
      return type;
    }
    function parseIntersectionTypeOrHigher(): TypeNode {
      return parseUnionOrIntersectionType(Syntax.IntersectionType, parseTypeOperatorOrHigher, Syntax.AmpersandToken);
    }
    function parseUnionTypeOrHigher(): TypeNode {
      return parseUnionOrIntersectionType(Syntax.UnionType, parseIntersectionTypeOrHigher, Syntax.BarToken);
    }
    function skipParameterStart(): boolean {
      if (isModifierKind(tok())) parseModifiers();
      if (isIdentifier() || tok() === Syntax.ThisKeyword) {
        next.tok();
        return true;
      }
      if (tok() === Syntax.OpenBracketToken || tok() === Syntax.OpenBraceToken) {
        const previousErrorCount = parseDiagnostics.length;
        parseIdentifierOrPattern();
        return previousErrorCount === parseDiagnostics.length;
      }
      return false;
    }
    function parseTypeOrTypePredicate(): TypeNode {
      const typePredicateVariable = isIdentifier() && tryParse(parseTypePredicatePrefix);
      const type = parseType();
      if (typePredicateVariable) {
        const n = createNode(Syntax.TypePredicate, typePredicateVariable.pos);
        n.assertsModifier = undefined;
        n.parameterName = typePredicateVariable;
        n.type = type;
        return finishNode(n);
      }
      return type;
    }
    function parseTypePredicatePrefix() {
      const id = parseIdentifier();
      if (tok() === Syntax.IsKeyword && !scanner.hasPrecedingLineBreak()) {
        next.tok();
        return id;
      }
      return;
    }
    function parseAssertsTypePredicate(): TypeNode {
      const n = createNode(Syntax.TypePredicate);
      n.assertsModifier = parseExpectedToken(Syntax.AssertsKeyword);
      n.parameterName = tok() === Syntax.ThisKeyword ? parseThisTypeNode() : parseIdentifier();
      n.type = parseOptional(Syntax.IsKeyword) ? parseType() : undefined;
      return finishNode(n);
    }
    function parseType(): TypeNode {
      return flags.withoutContext(NodeFlags.TypeExcludesFlags, parseTypeWorker);
    }
    function parseTypeWorker(noConditionalTypes?: boolean): TypeNode {
      if (isStartOfFunctionType() || tok() === Syntax.NewKeyword) return parseFunctionOrConstructorType();
      const type = parseUnionTypeOrHigher();
      if (!noConditionalTypes && !scanner.hasPrecedingLineBreak() && parseOptional(Syntax.ExtendsKeyword)) {
        const n = createNode(Syntax.ConditionalType, type.pos);
        n.checkType = type;
        n.extendsType = parseTypeWorker(true);
        parseExpected(Syntax.QuestionToken);
        n.trueType = parseTypeWorker();
        parseExpected(Syntax.ColonToken);
        n.falseType = parseTypeWorker();
        return finishNode(n);
      }
      return type;
    }
    function parseTypeAnnotation(): TypeNode | undefined {
      return parseOptional(Syntax.ColonToken) ? parseType() : undefined;
    }
    function parseExpression(): Expression {
      const dc = flags.inContext(NodeFlags.DecoratorContext);
      if (dc) flags.set(false, NodeFlags.DecoratorContext);
      let expr = parseAssignmentExpressionOrHigher();
      let operatorToken: BinaryOperatorToken;
      while ((operatorToken = parseOptionalToken(Syntax.CommaToken))) {
        expr = makeBinaryExpression(expr, operatorToken, parseAssignmentExpressionOrHigher());
      }
      if (dc) flags.set(true, NodeFlags.DecoratorContext);
      return expr;
    }
    function parseInitializer(): Expression | undefined {
      return parseOptional(Syntax.EqualsToken) ? parseAssignmentExpressionOrHigher() : undefined;
    }
    function parseAssignmentExpressionOrHigher(): Expression {
      if (isYieldExpression()) return parseYieldExpression();
      const arrowExpression = tryParseParenthesizedArrowFunctionExpression() || tryParseAsyncSimpleArrowFunctionExpression();
      if (arrowExpression) return arrowExpression;
      const expr = parseBinaryExpressionOrHigher(/*precedence*/ 0);
      if (expr.kind === Syntax.Identifier && tok() === Syntax.EqualsGreaterThanToken) return parseSimpleArrowFunctionExpression(<Identifier>expr);
      if (isLeftHandSideExpression(expr) && isAssignmentOperator(reScanGreaterToken())) return makeBinaryExpression(expr, parseTokenNode(), parseAssignmentExpressionOrHigher());
      return parseConditionalExpressionRest(expr);
    }
    function parseYieldExpression(): YieldExpression {
      const n = createNode(Syntax.YieldExpression);
      next.tok();
      if (!scanner.hasPrecedingLineBreak() && (tok() === Syntax.AsteriskToken || isStartOfExpression())) {
        n.asteriskToken = parseOptionalToken(Syntax.AsteriskToken);
        n.expression = parseAssignmentExpressionOrHigher();
        return finishNode(n);
      }
      return finishNode(n);
    }
    function parseSimpleArrowFunctionExpression(identifier: Identifier, asyncModifier?: NodeArray<Modifier> | undefined): ArrowFunction {
      assert(tok() === Syntax.EqualsGreaterThanToken, 'parseSimpleArrowFunctionExpression should only have been called if we had a =>');
      let n: ArrowFunction;
      if (asyncModifier) {
        n = createNode(Syntax.ArrowFunction, asyncModifier.pos);
        n.modifiers = asyncModifier;
      } else n = createNode(Syntax.ArrowFunction, identifier.pos);
      const n2 = createNode(Syntax.Parameter, identifier.pos);
      n2.name = identifier;
      finishNode(n);
      n.parameters = createNodeArray<ParameterDeclaration>([n2], n2.pos, n2.end);
      n.equalsGreaterThanToken = parseExpectedToken(Syntax.EqualsGreaterThanToken);
      n.body = parseArrowFunctionExpressionBody(!!asyncModifier);
      return addJSDocComment(finishNode(n));
    }
    function tryParseParenthesizedArrowFunctionExpression(): Expression | undefined {
      const triState = isParenthesizedArrowFunctionExpression();
      if (triState === Tristate.False) return;
      const arrowFunction = triState === Tristate.True ? parseParenthesizedArrowFunctionExpressionHead(true) : tryParse(parsePossibleParenthesizedArrowFunctionExpressionHead);
      if (!arrowFunction) return;
      const isAsync = hasModifierOfKind(arrowFunction, Syntax.AsyncKeyword);
      const lastToken = tok();
      arrowFunction.equalsGreaterThanToken = parseExpectedToken(Syntax.EqualsGreaterThanToken);
      arrowFunction.body = lastToken === Syntax.EqualsGreaterThanToken || lastToken === Syntax.OpenBraceToken ? parseArrowFunctionExpressionBody(isAsync) : parseIdentifier();
      return finishNode(arrowFunction);
    }
    function parsePossibleParenthesizedArrowFunctionExpressionHead(): ArrowFunction | undefined {
      const tokenPos = scanner.getTokenPos();
      if (notParenthesizedArrow && notParenthesizedArrow.has(tokenPos.toString())) return;
      const result = parseParenthesizedArrowFunctionExpressionHead(/*allowAmbiguity*/ false);
      if (!result) (notParenthesizedArrow || (notParenthesizedArrow = createMap())).set(tokenPos.toString(), true);
      return result;
    }
    function tryParseAsyncSimpleArrowFunctionExpression(): ArrowFunction | undefined {
      if (tok() === Syntax.AsyncKeyword) {
        if (lookAhead(isUnParenthesizedAsyncArrowFunctionWorker) === Tristate.True) {
          const asyncModifier = parseModifiersForArrowFunction();
          const expr = parseBinaryExpressionOrHigher(/*precedence*/ 0);
          return parseSimpleArrowFunctionExpression(<Identifier>expr, asyncModifier);
        }
      }
      return;
    }
    function parseParenthesizedArrowFunctionExpressionHead(allowAmbiguity: boolean): ArrowFunction | undefined {
      const n = createNodeWithJSDoc(Syntax.ArrowFunction);
      n.modifiers = parseModifiersForArrowFunction();
      const isAsync = hasModifierOfKind(n, Syntax.AsyncKeyword) ? SignatureFlags.Await : SignatureFlags.None;
      if (!fillSignature(Syntax.ColonToken, isAsync, n) && !allowAmbiguity) return;
      const hasJSDocFunctionType = n.type && isJSDocFunctionType(n.type);
      if (!allowAmbiguity && tok() !== Syntax.EqualsGreaterThanToken && (hasJSDocFunctionType || tok() !== Syntax.OpenBraceToken)) return;
      return n;
    }
    function parseArrowFunctionExpressionBody(isAsync: boolean): Block | Expression {
      if (tok() === Syntax.OpenBraceToken) {
        return parseFunctionBlock(isAsync ? SignatureFlags.Await : SignatureFlags.None);
      }
      if (tok() !== Syntax.SemicolonToken && tok() !== Syntax.FunctionKeyword && tok() !== Syntax.ClassKeyword && isStartOfStatement() && !isStartOfExpressionStatement()) {
        return parseFunctionBlock(SignatureFlags.IgnoreMissingOpenBrace | (isAsync ? SignatureFlags.Await : SignatureFlags.None));
      }
      return isAsync ? flags.withAwait(parseAssignmentExpressionOrHigher) : flags.withoutAwait(parseAssignmentExpressionOrHigher);
    }
    function parseConditionalExpressionRest(leftOperand: Expression): Expression {
      const questionToken = parseOptionalToken(Syntax.QuestionToken);
      if (!questionToken) return leftOperand;
      const n = createNode(Syntax.ConditionalExpression, leftOperand.pos);
      n.condition = leftOperand;
      n.questionToken = questionToken;
      n.whenTrue = flags.withoutContext(withDisallowInDecoratorContext, parseAssignmentExpressionOrHigher);
      n.colonToken = parseExpectedToken(Syntax.ColonToken);
      n.whenFalse = nodeIsPresent(n.colonToken) ? parseAssignmentExpressionOrHigher() : createMissingNode(Syntax.Identifier, false, Diagnostics._0_expected, toString(Syntax.ColonToken));
      return finishNode(n);
    }
    function parseBinaryExpressionOrHigher(precedence: number): Expression {
      const leftOperand = parseUnaryExpressionOrHigher();
      return parseBinaryExpressionRest(precedence, leftOperand);
    }
    function parseBinaryExpressionRest(precedence: number, leftOperand: Expression): Expression {
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
            leftOperand = makeAsExpression(leftOperand, parseType());
          }
        } else leftOperand = makeBinaryExpression(leftOperand, parseTokenNode(), parseBinaryExpressionOrHigher(newPrecedence));
      }
      return leftOperand;
    }
    function makeBinaryExpression(left: Expression, operatorToken: BinaryOperatorToken, right: Expression): BinaryExpression {
      const n = createNode(Syntax.BinaryExpression, left.pos);
      n.left = left;
      n.operatorToken = operatorToken;
      n.right = right;
      return finishNode(n);
    }
    function makeAsExpression(left: Expression, right: TypeNode): AsExpression {
      const n = createNode(Syntax.AsExpression, left.pos);
      n.expression = left;
      n.type = right;
      return finishNode(n);
    }
    function parsePrefixUnaryExpression() {
      const n = createNode(Syntax.PrefixUnaryExpression);
      n.operator = <PrefixUnaryOperator>tok();
      next.tok();
      n.operand = parseSimpleUnaryExpression();
      return finishNode(n);
    }
    function parseDeleteExpression() {
      const n = createNode(Syntax.DeleteExpression);
      next.tok();
      n.expression = parseSimpleUnaryExpression();
      return finishNode(n);
    }
    function parseTypeOfExpression() {
      const n = createNode(Syntax.TypeOfExpression);
      next.tok();
      n.expression = parseSimpleUnaryExpression();
      return finishNode(n);
    }
    function parseVoidExpression() {
      const n = createNode(Syntax.VoidExpression);
      next.tok();
      n.expression = parseSimpleUnaryExpression();
      return finishNode(n);
    }
    function parseAwaitExpression() {
      const n = createNode(Syntax.AwaitExpression);
      next.tok();
      n.expression = parseSimpleUnaryExpression();
      return finishNode(n);
    }
    function parseUnaryExpressionOrHigher(): UnaryExpression | BinaryExpression {
      if (isUpdateExpression()) {
        const updateExpression = parseUpdateExpression();
        return tok() === Syntax.Asterisk2Token ? <BinaryExpression>parseBinaryExpressionRest(getBinaryOperatorPrecedence(tok()), updateExpression) : updateExpression;
      }
      const unaryOperator = tok();
      const simpleUnaryExpression = parseSimpleUnaryExpression();
      if (tok() === Syntax.Asterisk2Token) {
        const pos = Scanner.skipTrivia(sourceText, simpleUnaryExpression.pos);
        const { end } = simpleUnaryExpression;
        if (simpleUnaryExpression.kind === Syntax.TypeAssertionExpression) {
          parse.errorAt(pos, end, Diagnostics.A_type_assertion_expression_is_not_allowed_in_the_left_hand_side_of_an_exponentiation_expression_Consider_enclosing_the_expression_in_parentheses);
        } else {
          parse.errorAt(
            pos,
            end,
            Diagnostics.An_unary_expression_with_the_0_operator_is_not_allowed_in_the_left_hand_side_of_an_exponentiation_expression_Consider_enclosing_the_expression_in_parentheses,
            toString(unaryOperator)
          );
        }
      }
      return simpleUnaryExpression;
    }
    function parseSimpleUnaryExpression(): UnaryExpression {
      switch (tok()) {
        case Syntax.PlusToken:
        case Syntax.MinusToken:
        case Syntax.TildeToken:
        case Syntax.ExclamationToken:
          return parsePrefixUnaryExpression();
        case Syntax.DeleteKeyword:
          return parseDeleteExpression();
        case Syntax.TypeOfKeyword:
          return parseTypeOfExpression();
        case Syntax.VoidKeyword:
          return parseVoidExpression();
        case Syntax.LessThanToken:
          return parseTypeAssertion();
        case Syntax.AwaitKeyword:
          if (isAwaitExpression()) return parseAwaitExpression();
        // falls through
        default:
          return parseUpdateExpression();
      }
    }
    function parseUpdateExpression(): UpdateExpression {
      if (tok() === Syntax.Plus2Token || tok() === Syntax.Minus2Token) {
        const n = createNode(Syntax.PrefixUnaryExpression);
        n.operator = <PrefixUnaryOperator>tok();
        next.tok();
        n.operand = parseLeftHandSideExpressionOrHigher();
        return finishNode(n);
      } else if (sourceFile.languageVariant === LanguageVariant.JSX && tok() === Syntax.LessThanToken && lookAhead(next.isIdentifierOrKeywordOrGreaterThan)) {
        return parseJsxElementOrSelfClosingElementOrFragment(true);
      }
      const expression = parseLeftHandSideExpressionOrHigher();
      assert(isLeftHandSideExpression(expression));
      if ((tok() === Syntax.Plus2Token || tok() === Syntax.Minus2Token) && !scanner.hasPrecedingLineBreak()) {
        const n = createNode(Syntax.PostfixUnaryExpression, expression.pos);
        n.operand = expression;
        n.operator = <PostfixUnaryOperator>tok();
        next.tok();
        return finishNode(n);
      }
      return expression;
    }
    function parseLeftHandSideExpressionOrHigher(): LeftHandSideExpression {
      let expression: MemberExpression;
      if (tok() === Syntax.ImportKeyword) {
        if (lookAhead(next.isOpenParenOrLessThan)) {
          sourceFile.flags |= NodeFlags.PossiblyContainsDynamicImport;
          expression = parseTokenNode<PrimaryExpression>();
        } else if (lookAhead(next.isDot)) {
          const fullStart = scanner.getStartPos();
          next.tok();
          next.tok();
          const n = createNode(Syntax.MetaProperty, fullStart);
          n.keywordToken = Syntax.ImportKeyword;
          n.name = parseIdentifierName();
          expression = finishNode(n);
          sourceFile.flags |= NodeFlags.PossiblyContainsImportMeta;
        } else {
          expression = parseMemberExpressionOrHigher();
        }
      } else {
        expression = tok() === Syntax.SuperKeyword ? parseSuperExpression() : parseMemberExpressionOrHigher();
      }
      return parseCallExpressionRest(expression);
    }
    function parseMemberExpressionOrHigher(): MemberExpression {
      const expression = parsePrimaryExpression();
      return parseMemberExpressionRest(expression, /*allowOptionalChain*/ true);
    }
    function parseSuperExpression(): MemberExpression {
      const expression = parseTokenNode<PrimaryExpression>();
      if (tok() === Syntax.LessThanToken) {
        const startPos = getNodePos();
        const typeArguments = tryParse(parseTypeArgumentsInExpression);
        if (typeArguments !== undefined) parse.errorAt(startPos, getNodePos(), Diagnostics.super_may_not_use_type_arguments);
      }
      if (tok() === Syntax.OpenParenToken || tok() === Syntax.DotToken || tok() === Syntax.OpenBracketToken) return expression;
      const n = createNode(Syntax.PropertyAccessExpression, expression.pos);
      n.expression = expression;
      parseExpectedToken(Syntax.DotToken, Diagnostics.super_must_be_followed_by_an_argument_list_or_member_access);
      n.name = parseRightSideOfDot(true, true);
      return finishNode(n);
    }
    function parseJsxElementOrSelfClosingElementOrFragment(inExpressionContext: boolean): JsxElement | JsxSelfClosingElement | JsxFragment {
      const opening = parseJsxOpeningOrSelfClosingElementOrOpeningFragment(inExpressionContext);
      let result: JsxElement | JsxSelfClosingElement | JsxFragment;
      if (opening.kind === Syntax.JsxOpeningElement) {
        const n = createNode(Syntax.JsxElement, opening.pos);
        n.openingElement = opening;
        n.children = ctx.parseJsxChildren(n.openingElement);
        n.closingElement = parseJsxClosingElement(inExpressionContext);
        if (!tagNamesAreEquivalent(n.openingElement.tagName, n.closingElement.tagName)) {
          parse.errorAtRange(n.closingElement, Diagnostics.Expected_corresponding_JSX_closing_tag_for_0, getTextOfNodeFromSourceText(sourceText, n.openingElement.tagName));
        }
        result = finishNode(n);
      } else if (opening.kind === Syntax.JsxOpeningFragment) {
        const n = createNode(Syntax.JsxFragment, opening.pos);
        n.openingFragment = opening;
        n.children = ctx.parseJsxChildren(n.openingFragment);
        n.closingFragment = parseJsxClosingFragment(inExpressionContext);
        result = finishNode(n);
      } else {
        assert(opening.kind === Syntax.JsxSelfClosingElement);
        result = opening;
      }
      if (inExpressionContext && tok() === Syntax.LessThanToken) {
        const invalidElement = tryParse(() => parseJsxElementOrSelfClosingElementOrFragment(true));
        if (invalidElement) {
          parse.errorAtToken(Diagnostics.JSX_expressions_must_have_one_parent_element);
          const n2 = createNode(Syntax.BinaryExpression, result.pos);
          n2.end = invalidElement.end;
          n2.left = result;
          n2.right = invalidElement;
          n2.operatorToken = createMissingNode(Syntax.CommaToken, false);
          n2.operatorToken.pos = n2.operatorToken.end = n2.right.pos;
          return (n2 as Node) as JsxElement;
        }
      }
      return result;
    }
    function parseJsxText(): JsxText {
      const n = createNode(Syntax.JsxText);
      n.text = scanner.getTokenValue();
      n.onlyTriviaWhitespaces = currentToken === Syntax.JsxTextAllWhiteSpaces;
      currentToken = scanner.scanJsxToken();
      return finishNode(n);
    }
    function parseJsxChild(openingTag: JsxOpeningElement | JsxOpeningFragment, token: JsxTokenSyntax): JsxChild | undefined {
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
          return parseJsxText();
        case Syntax.OpenBraceToken:
          return parseJsxExpression(false);
        case Syntax.LessThanToken:
          return parseJsxElementOrSelfClosingElementOrFragment(false);
        default:
          return Debug.assertNever(token);
      }
    }
    function parseJsxAttributes(): JsxAttributes {
      const n = createNode(Syntax.JsxAttributes);
      n.properties = ctx.parseList(Parser.Context.JsxAttributes, parseJsxAttribute);
      return finishNode(n);
    }
    function parseJsxOpeningOrSelfClosingElementOrOpeningFragment(inExpressionContext: boolean): JsxOpeningElement | JsxSelfClosingElement | JsxOpeningFragment {
      const fullStart = scanner.getStartPos();
      parseExpected(Syntax.LessThanToken);
      if (tok() === Syntax.GreaterThanToken) {
        const n = createNode(Syntax.JsxOpeningFragment, fullStart);
        scanJsxText();
        return finishNode(n);
      }
      const tagName = parseJsxElementName();
      const typeArguments = tryParseTypeArguments();
      const attributes = parseJsxAttributes();
      let n: JsxOpeningLikeElement;
      if (tok() === Syntax.GreaterThanToken) {
        n = createNode(Syntax.JsxOpeningElement, fullStart);
        scanJsxText();
      } else {
        parseExpected(Syntax.SlashToken);
        if (inExpressionContext) parseExpected(Syntax.GreaterThanToken);
        else {
          parseExpected(Syntax.GreaterThanToken, undefined, false);
          scanJsxText();
        }
        n = createNode(Syntax.JsxSelfClosingElement, fullStart);
      }
      n.tagName = tagName;
      n.typeArguments = typeArguments;
      n.attributes = attributes;
      return finishNode(n);
    }
    function parseJsxElementName(): JsxTagNameExpression {
      scanJsxIdentifier();
      let expression: JsxTagNameExpression = tok() === Syntax.ThisKeyword ? parseTokenNode<ThisExpression>() : parseIdentifierName();
      while (parseOptional(Syntax.DotToken)) {
        const n = createNode(Syntax.PropertyAccessExpression, expression.pos);
        n.expression = expression;
        n.name = parseRightSideOfDot(true, false);
        expression = finishNode(n);
      }
      return expression;
    }
    function parseJsxExpression(inExpressionContext: boolean): JsxExpression | undefined {
      const n = createNode(Syntax.JsxExpression);
      if (!parseExpected(Syntax.OpenBraceToken)) return;
      if (tok() !== Syntax.CloseBraceToken) {
        n.dot3Token = parseOptionalToken(Syntax.Dot3Token);
        n.expression = parseExpression();
      }
      if (inExpressionContext) parseExpected(Syntax.CloseBraceToken);
      else {
        if (parseExpected(Syntax.CloseBraceToken, undefined, false)) scanJsxText();
      }
      return finishNode(n);
    }
    function parseJsxAttribute(): JsxAttribute | JsxSpreadAttribute {
      if (tok() === Syntax.OpenBraceToken) return parseJsxSpreadAttribute();
      scanJsxIdentifier();
      const n = createNode(Syntax.JsxAttribute);
      n.name = parseIdentifierName();
      if (tok() === Syntax.EqualsToken) {
        switch (scanJsxAttributeValue()) {
          case Syntax.StringLiteral:
            n.initializer = <StringLiteral>parseLiteralNode();
            break;
          default:
            n.initializer = parseJsxExpression(true);
            break;
        }
      }
      return finishNode(n);
    }
    function parseJsxSpreadAttribute(): JsxSpreadAttribute {
      const n = createNode(Syntax.JsxSpreadAttribute);
      parseExpected(Syntax.OpenBraceToken);
      parseExpected(Syntax.Dot3Token);
      n.expression = parseExpression();
      parseExpected(Syntax.CloseBraceToken);
      return finishNode(n);
    }
    function parseJsxClosingElement(inExpressionContext: boolean): JsxClosingElement {
      const n = createNode(Syntax.JsxClosingElement);
      parseExpected(Syntax.LessThanSlashToken);
      n.tagName = parseJsxElementName();
      if (inExpressionContext) parseExpected(Syntax.GreaterThanToken);
      else {
        parseExpected(Syntax.GreaterThanToken, undefined, false);
        scanJsxText();
      }
      return finishNode(n);
    }
    function parseJsxClosingFragment(inExpressionContext: boolean): JsxClosingFragment {
      const n = createNode(Syntax.JsxClosingFragment);
      parseExpected(Syntax.LessThanSlashToken);
      if (identifierOrKeyword(tok())) parse.errorAtRange(parseJsxElementName(), Diagnostics.Expected_corresponding_closing_tag_for_JSX_fragment);
      if (inExpressionContext) parseExpected(Syntax.GreaterThanToken);
      else {
        parseExpected(Syntax.GreaterThanToken, undefined, false);
        scanJsxText();
      }
      return finishNode(n);
    }
    function parseTypeAssertion(): TypeAssertion {
      const n = createNode(Syntax.TypeAssertionExpression);
      parseExpected(Syntax.LessThanToken);
      n.type = parseType();
      parseExpected(Syntax.GreaterThanToken);
      n.expression = parseSimpleUnaryExpression();
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
    function parsePropertyAccessExpressionRest(expression: LeftHandSideExpression, questionDotToken: QuestionDotToken | undefined) {
      const n = createNode(Syntax.PropertyAccessExpression, expression.pos);
      n.expression = expression;
      n.questionDotToken = questionDotToken;
      n.name = parseRightSideOfDot(true, true);
      if (questionDotToken || tryReparseOptionalChain(expression)) {
        n.flags |= NodeFlags.OptionalChain;
        if (isPrivateIdentifier(n.name)) parse.errorAtRange(n.name, Diagnostics.An_optional_chain_cannot_contain_private_identifiers);
      }
      return finishNode(n);
    }
    function parseElementAccessExpressionRest(expression: LeftHandSideExpression, questionDotToken: QuestionDotToken | undefined) {
      const n = createNode(Syntax.ElementAccessExpression, expression.pos);
      n.expression = expression;
      n.questionDotToken = questionDotToken;
      if (tok() === Syntax.CloseBracketToken) {
        n.argumentExpression = createMissingNode(Syntax.Identifier, true, Diagnostics.An_element_access_expression_should_take_an_argument);
      } else {
        const argument = flags.withoutDisallowIn(parseExpression);
        if (StringLiteral.orNumericLiteralLike(argument)) argument.text = internIdentifier(argument.text);
        n.argumentExpression = argument;
      }
      parseExpected(Syntax.CloseBracketToken);
      if (questionDotToken || tryReparseOptionalChain(expression)) n.flags |= NodeFlags.OptionalChain;
      return finishNode(n);
    }
    function parseMemberExpressionRest(expression: LeftHandSideExpression, allowOptionalChain: boolean): MemberExpression {
      while (true) {
        let questionDotToken: QuestionDotToken | undefined;
        let isPropertyAccess = false;
        if (allowOptionalChain && isStartOfOptionalPropertyOrElementAccessChain()) {
          questionDotToken = parseExpectedToken(Syntax.QuestionDotToken);
          isPropertyAccess = identifierOrKeyword(tok());
        } else isPropertyAccess = parseOptional(Syntax.DotToken);
        if (isPropertyAccess) {
          expression = parsePropertyAccessExpressionRest(expression, questionDotToken);
          continue;
        }
        if (!questionDotToken && tok() === Syntax.ExclamationToken && !scanner.hasPrecedingLineBreak()) {
          next.tok();
          const n = createNode(Syntax.NonNullExpression, expression.pos);
          n.expression = expression;
          expression = finishNode(n);
          continue;
        }
        if ((questionDotToken || !flags.inContext(NodeFlags.DecoratorContext)) && parseOptional(Syntax.OpenBracketToken)) {
          expression = parseElementAccessExpressionRest(expression, questionDotToken);
          continue;
        }
        if (isTemplateStartOfTaggedTemplate()) {
          expression = parseTaggedTemplateRest(expression, questionDotToken, undefined);
          continue;
        }
        return <MemberExpression>expression;
      }
    }
    function parseTaggedTemplateRest(tag: LeftHandSideExpression, questionDotToken: QuestionDotToken | undefined, typeArguments: NodeArray<TypeNode> | undefined) {
      const n = createNode(Syntax.TaggedTemplateExpression, tag.pos);
      n.tag = tag;
      n.questionDotToken = questionDotToken;
      n.typeArguments = typeArguments;
      n.template = tok() === Syntax.NoSubstitutionLiteral ? (reScanHeadOrNoSubstTemplate(), <NoSubstitutionLiteral>parseLiteralNode()) : parseTemplateExpression(/*tagged*/ true);
      if (questionDotToken || tag.flags & NodeFlags.OptionalChain) n.flags |= NodeFlags.OptionalChain;
      return finishNode(n);
    }
    function parseCallExpressionRest(expression: LeftHandSideExpression): LeftHandSideExpression {
      while (true) {
        expression = parseMemberExpressionRest(expression, /*allowOptionalChain*/ true);
        const questionDotToken = parseOptionalToken(Syntax.QuestionDotToken);
        if (tok() === Syntax.LessThanToken || tok() === Syntax.LessThan2Token) {
          const typeArguments = tryParse(parseTypeArgumentsInExpression);
          if (typeArguments) {
            if (isTemplateStartOfTaggedTemplate()) {
              expression = parseTaggedTemplateRest(expression, questionDotToken, typeArguments);
              continue;
            }
            const n = createNode(Syntax.CallExpression, expression.pos);
            n.expression = expression;
            n.questionDotToken = questionDotToken;
            n.typeArguments = typeArguments;
            n.arguments = parseArgumentList();
            if (questionDotToken || tryReparseOptionalChain(expression)) n.flags |= NodeFlags.OptionalChain;
            expression = finishNode(n);
            continue;
          }
        } else if (tok() === Syntax.OpenParenToken) {
          const n = createNode(Syntax.CallExpression, expression.pos);
          n.expression = expression;
          n.questionDotToken = questionDotToken;
          n.arguments = parseArgumentList();
          if (questionDotToken || tryReparseOptionalChain(expression)) n.flags |= NodeFlags.OptionalChain;
          expression = finishNode(n);
          continue;
        }
        if (questionDotToken) {
          const n = createNode(Syntax.PropertyAccessExpression, expression.pos) as PropertyAccessExpression;
          n.expression = expression;
          n.questionDotToken = questionDotToken;
          n.name = createMissingNode(Syntax.Identifier, false, Diagnostics.Identifier_expected);
          n.flags |= NodeFlags.OptionalChain;
          expression = finishNode(n);
        }
        break;
      }
      return expression;
    }
    function parseArgumentList() {
      parseExpected(Syntax.OpenParenToken);
      const result = ctx.parseDelimitedList(Parser.Context.ArgumentExpressions, parseArgumentExpression);
      parseExpected(Syntax.CloseParenToken);
      return result;
    }
    function parseTypeArgumentsInExpression() {
      if (reScanLessToken() !== Syntax.LessThanToken) return;
      next.tok();
      const typeArguments = ctx.parseDelimitedList(Parser.Context.TypeArguments, parseType);
      if (!parseExpected(Syntax.GreaterThanToken)) return;
      return typeArguments && canFollowTypeArgumentsInExpression() ? typeArguments : undefined;
    }
    function parsePrimaryExpression(): PrimaryExpression {
      switch (tok()) {
        case Syntax.NumericLiteral:
        case Syntax.BigIntLiteral:
        case Syntax.StringLiteral:
        case Syntax.NoSubstitutionLiteral:
          return parseLiteralNode();
        case Syntax.ThisKeyword:
        case Syntax.SuperKeyword:
        case Syntax.NullKeyword:
        case Syntax.TrueKeyword:
        case Syntax.FalseKeyword:
          return parseTokenNode<PrimaryExpression>();
        case Syntax.OpenParenToken:
          return parseParenthesizedExpression();
        case Syntax.OpenBracketToken:
          return parseArrayLiteralExpression();
        case Syntax.OpenBraceToken:
          return parseObjectLiteralExpression();
        case Syntax.AsyncKeyword:
          if (!lookAhead(next.isFunctionKeywordOnSameLine)) break;
          return parseFunctionExpression();
        case Syntax.ClassKeyword:
          return parseClassExpression();
        case Syntax.FunctionKeyword:
          return parseFunctionExpression();
        case Syntax.NewKeyword:
          return parseNewExpressionOrNewDotTarget();
        case Syntax.SlashToken:
        case Syntax.SlashEqualsToken:
          if (reScanSlashToken() === Syntax.RegexLiteral) return parseLiteralNode();
          break;
        case Syntax.TemplateHead:
          return parseTemplateExpression(false);
      }
      return parseIdentifier(Diagnostics.Expression_expected);
    }
    function parseParenthesizedExpression(): ParenthesizedExpression {
      const n = createNodeWithJSDoc(Syntax.ParenthesizedExpression);
      parseExpected(Syntax.OpenParenToken);
      n.expression = flags.withoutDisallowIn(parseExpression);
      parseExpected(Syntax.CloseParenToken);
      return finishNode(n);
    }
    function parseSpreadElement(): Expression {
      const n = createNode(Syntax.SpreadElement);
      parseExpected(Syntax.Dot3Token);
      n.expression = parseAssignmentExpressionOrHigher();
      return finishNode(n);
    }
    function parseArgumentOrArrayLiteralElement(): Expression {
      return tok() === Syntax.Dot3Token ? parseSpreadElement() : tok() === Syntax.CommaToken ? createNode(Syntax.OmittedExpression) : parseAssignmentExpressionOrHigher();
    }
    function parseArgumentExpression(): Expression {
      return flags.withoutContext(withDisallowInDecoratorContext, parseArgumentOrArrayLiteralElement);
    }
    function parseArrayLiteralExpression(): ArrayLiteralExpression {
      const n = createNode(Syntax.ArrayLiteralExpression);
      parseExpected(Syntax.OpenBracketToken);
      if (scanner.hasPrecedingLineBreak()) n.multiLine = true;
      n.elements = ctx.parseDelimitedList(Parser.Context.ArrayLiteralMembers, parseArgumentOrArrayLiteralElement);
      parseExpected(Syntax.CloseBracketToken);
      return finishNode(n);
    }
    function parseObjectLiteralElement(): ObjectLiteralElementLike {
      const n = createNodeWithJSDoc(Syntax.Unknown);
      if (parseOptionalToken(Syntax.Dot3Token)) {
        n.kind = Syntax.SpreadAssignment;
        (n as SpreadAssignment).expression = parseAssignmentExpressionOrHigher();
        return finishNode(n);
      }
      n.decorators = parseDecorators();
      n.modifiers = parseModifiers();
      if (parseContextualModifier(Syntax.GetKeyword)) {
        return parseAccessorDeclaration(n as AccessorDeclaration, Syntax.GetAccessor);
      }
      if (parseContextualModifier(Syntax.SetKeyword)) {
        return parseAccessorDeclaration(n as AccessorDeclaration, Syntax.SetAccessor);
      }
      const asteriskToken = parseOptionalToken(Syntax.AsteriskToken);
      const tokenIsIdentifier = isIdentifier();
      n.name = parsePropertyName();
      (n as MethodDeclaration).questionToken = parseOptionalToken(Syntax.QuestionToken);
      (n as MethodDeclaration).exclamationToken = parseOptionalToken(Syntax.ExclamationToken);
      if (asteriskToken || tok() === Syntax.OpenParenToken || tok() === Syntax.LessThanToken) {
        return parseMethodDeclaration(<MethodDeclaration>n, asteriskToken);
      }
      const isShorthandPropertyAssignment = tokenIsIdentifier && tok() !== Syntax.ColonToken;
      if (isShorthandPropertyAssignment) {
        n.kind = Syntax.ShorthandPropertyAssignment;
        const equalsToken = parseOptionalToken(Syntax.EqualsToken);
        if (equalsToken) {
          (n as ShorthandPropertyAssignment).equalsToken = equalsToken;
          (n as ShorthandPropertyAssignment).objectAssignmentInitializer = flags.withoutDisallowIn(parseAssignmentExpressionOrHigher);
        }
      } else {
        n.kind = Syntax.PropertyAssignment;
        parseExpected(Syntax.ColonToken);
        (n as PropertyAssignment).initializer = flags.withoutDisallowIn(parseAssignmentExpressionOrHigher);
      }
      return finishNode(n);
    }
    function parseObjectLiteralExpression(): ObjectLiteralExpression {
      const n = createNode(Syntax.ObjectLiteralExpression);
      const openBracePosition = scanner.getTokenPos();
      parseExpected(Syntax.OpenBraceToken);
      if (scanner.hasPrecedingLineBreak()) n.multiLine = true;
      n.properties = ctx.parseDelimitedList(Parser.Context.ObjectLiteralMembers, parseObjectLiteralElement, /*considerSemicolonAsDelimiter*/ true);
      if (!parseExpected(Syntax.CloseBraceToken)) {
        const lastError = lastOrUndefined(parseDiagnostics);
        if (lastError && lastError.code === Diagnostics._0_expected.code) {
          addRelatedInfo(lastError, createFileDiagnostic(sourceFile, openBracePosition, 1, Diagnostics.The_parser_expected_to_find_a_to_match_the_token_here));
        }
      }
      return finishNode(n);
    }
    function parseFunctionExpression(): FunctionExpression {
      const dc = flags.inContext(NodeFlags.DecoratorContext);
      if (dc) flags.set(false, NodeFlags.DecoratorContext);
      const n = createNodeWithJSDoc(Syntax.FunctionExpression);
      n.modifiers = parseModifiers();
      parseExpected(Syntax.FunctionKeyword);
      n.asteriskToken = parseOptionalToken(Syntax.AsteriskToken);
      const isGenerator = n.asteriskToken ? SignatureFlags.Yield : SignatureFlags.None;
      const isAsync = hasModifierOfKind(n, Syntax.AsyncKeyword) ? SignatureFlags.Await : SignatureFlags.None;
      n.name =
        isGenerator && isAsync
          ? flags.withYieldAndAwait(parseOptionalIdentifier)
          : isGenerator
          ? flags.withYield(parseOptionalIdentifier)
          : isAsync
          ? flags.withAwait(parseOptionalIdentifier)
          : parseOptionalIdentifier();
      fillSignature(Syntax.ColonToken, isGenerator | isAsync, n);
      n.body = parseFunctionBlock(isGenerator | isAsync);
      if (dc) flags.set(true, NodeFlags.DecoratorContext);
      return finishNode(n);
    }
    function parseOptionalIdentifier(): Identifier | undefined {
      return isIdentifier() ? parseIdentifier() : undefined;
    }
    function parseNewExpressionOrNewDotTarget(): NewExpression | MetaProperty {
      const fullStart = scanner.getStartPos();
      parseExpected(Syntax.NewKeyword);
      if (parseOptional(Syntax.DotToken)) {
        const n = createNode(Syntax.MetaProperty, fullStart);
        n.keywordToken = Syntax.NewKeyword;
        n.name = parseIdentifierName();
        return finishNode(n);
      }
      let expression: MemberExpression = parsePrimaryExpression();
      let typeArguments;
      while (true) {
        expression = parseMemberExpressionRest(expression, /*allowOptionalChain*/ false);
        typeArguments = tryParse(parseTypeArgumentsInExpression);
        if (isTemplateStartOfTaggedTemplate()) {
          assert(!!typeArguments, "Expected a type argument list; all plain tagged template starts should be consumed in 'parseMemberExpressionRest'");
          expression = parseTaggedTemplateRest(expression, /*optionalChain*/ undefined, typeArguments);
          typeArguments = undefined;
        }
        break;
      }
      const n = createNode(Syntax.NewExpression, fullStart);
      n.expression = expression;
      n.typeArguments = typeArguments;
      if (tok() === Syntax.OpenParenToken) n.arguments = parseArgumentList();
      else if (n.typeArguments) parse.errorAt(fullStart, scanner.getStartPos(), Diagnostics.A_new_expression_with_type_arguments_must_always_be_followed_by_a_parenthesized_argument_list);

      return finishNode(n);
    }
    function parseBlock(ignoreMissingOpenBrace: boolean, m?: DiagnosticMessage): Block {
      const n = createNode(Syntax.Block);
      const openBracePosition = scanner.getTokenPos();
      if (parseExpected(Syntax.OpenBraceToken, m) || ignoreMissingOpenBrace) {
        if (scanner.hasPrecedingLineBreak()) n.multiLine = true;
        n.statements = ctx.parseList(Parser.Context.BlockStatements, parseStatement);
        if (!parseExpected(Syntax.CloseBraceToken)) {
          const lastError = lastOrUndefined(parseDiagnostics);
          if (lastError && lastError.code === Diagnostics._0_expected.code) {
            addRelatedInfo(lastError, createFileDiagnostic(sourceFile, openBracePosition, 1, Diagnostics.The_parser_expected_to_find_a_to_match_the_token_here));
          }
        }
      } else n.statements = createMissingList<Statement>();
      return finishNode(n);
    }
    function parseFunctionBlock(flags: SignatureFlags, m?: DiagnosticMessage): Block {
      const yf = flags.inContext(NodeFlags.YieldContext);
      flags.set(!!(flags & SignatureFlags.Yield), NodeFlags.YieldContext);
      const af = flags.inContext(NodeFlags.AwaitContext);
      flags.set(!!(flags & SignatureFlags.Await), NodeFlags.AwaitContext);
      const dc = flags.inContext(NodeFlags.DecoratorContext);
      if (dc) flags.set(false, NodeFlags.DecoratorContext);
      const block = parseBlock(!!(flags & SignatureFlags.IgnoreMissingOpenBrace), m);
      if (dc) flags.set(true, NodeFlags.DecoratorContext);
      flags.set(yf, NodeFlags.YieldContext);
      flags.set(af, NodeFlags.AwaitContext);
      return block;
    }
    function parseEmptyStatement(): Statement {
      const n = createNode(Syntax.EmptyStatement);
      parseExpected(Syntax.SemicolonToken);
      return finishNode(n);
    }
    function parseIfStatement(): IfStatement {
      const n = createNode(Syntax.IfStatement);
      parseExpected(Syntax.IfKeyword);
      parseExpected(Syntax.OpenParenToken);
      n.expression = flags.withoutDisallowIn(parseExpression);
      parseExpected(Syntax.CloseParenToken);
      n.thenStatement = parseStatement();
      n.elseStatement = parseOptional(Syntax.ElseKeyword) ? parseStatement() : undefined;
      return finishNode(n);
    }
    function parseDoStatement(): DoStatement {
      const n = createNode(Syntax.DoStatement);
      parseExpected(Syntax.DoKeyword);
      n.statement = parseStatement();
      parseExpected(Syntax.WhileKeyword);
      parseExpected(Syntax.OpenParenToken);
      n.expression = flags.withoutDisallowIn(parseExpression);
      parseExpected(Syntax.CloseParenToken);
      parseOptional(Syntax.SemicolonToken);
      return finishNode(n);
    }
    function parseWhileStatement(): WhileStatement {
      const n = createNode(Syntax.WhileStatement);
      parseExpected(Syntax.WhileKeyword);
      parseExpected(Syntax.OpenParenToken);
      n.expression = flags.withoutDisallowIn(parseExpression);
      parseExpected(Syntax.CloseParenToken);
      n.statement = parseStatement();
      return finishNode(n);
    }
    function parseForOrForInOrForOfStatement(): Statement {
      const pos = getNodePos();
      parseExpected(Syntax.ForKeyword);
      const awaitToken = parseOptionalToken(Syntax.AwaitKeyword);
      parseExpected(Syntax.OpenParenToken);
      let initializer!: VariableDeclarationList | Expression;
      if (tok() !== Syntax.SemicolonToken) {
        if (tok() === Syntax.VarKeyword || tok() === Syntax.LetKeyword || tok() === Syntax.ConstKeyword) {
          initializer = parseVariableDeclarationList(true);
        } else {
          initializer = flags.withDisallowIn(parseExpression);
        }
      }
      let n: IterationStatement;
      if (awaitToken ? parseExpected(Syntax.OfKeyword) : parseOptional(Syntax.OfKeyword)) {
        const n2 = createNode(Syntax.ForOfStatement, pos);
        n2.awaitModifier = awaitToken;
        n2.initializer = initializer;
        n2.expression = flags.withoutDisallowIn(parseAssignmentExpressionOrHigher);
        parseExpected(Syntax.CloseParenToken);
        n = n2;
      } else if (parseOptional(Syntax.InKeyword)) {
        const n2 = createNode(Syntax.ForInStatement, pos);
        n2.initializer = initializer;
        n2.expression = flags.withoutDisallowIn(parseExpression);
        parseExpected(Syntax.CloseParenToken);
        n = n2;
      } else {
        const n2 = createNode(Syntax.ForStatement, pos);
        n2.initializer = initializer;
        parseExpected(Syntax.SemicolonToken);
        if (tok() !== Syntax.SemicolonToken && tok() !== Syntax.CloseParenToken) n2.condition = flags.withoutDisallowIn(parseExpression);
        parseExpected(Syntax.SemicolonToken);
        if (tok() !== Syntax.CloseParenToken) n2.incrementor = flags.withoutDisallowIn(parseExpression);
        parseExpected(Syntax.CloseParenToken);
        n = n2;
      }
      n.statement = parseStatement();
      return finishNode(n);
    }
    function parseBreakOrContinueStatement(kind: Syntax): BreakOrContinueStatement {
      const n = createNode(kind);
      parseExpected(kind === Syntax.BreakStatement ? Syntax.BreakKeyword : Syntax.ContinueKeyword);
      if (!canParseSemicolon()) n.label = parseIdentifier();
      parseSemicolon();
      return finishNode(n);
    }
    function parseReturnStatement(): ReturnStatement {
      const n = createNode(Syntax.ReturnStatement);
      parseExpected(Syntax.ReturnKeyword);
      if (!canParseSemicolon()) n.expression = flags.withoutDisallowIn(parseExpression);
      parseSemicolon();
      return finishNode(n);
    }
    function parseWithStatement(): WithStatement {
      const n = createNode(Syntax.WithStatement);
      parseExpected(Syntax.WithKeyword);
      parseExpected(Syntax.OpenParenToken);
      n.expression = flags.withoutDisallowIn(parseExpression);
      parseExpected(Syntax.CloseParenToken);
      n.statement = flags.withContext(NodeFlags.InWithStatement, parseStatement);
      return finishNode(n);
    }
    function parseCaseClause(): CaseClause {
      const n = createNode(Syntax.CaseClause);
      parseExpected(Syntax.CaseKeyword);
      n.expression = flags.withoutDisallowIn(parseExpression);
      parseExpected(Syntax.ColonToken);
      n.statements = ctx.parseList(Parser.Context.SwitchClauseStatements, parseStatement);
      return finishNode(n);
    }
    function parseDefaultClause(): DefaultClause {
      const n = createNode(Syntax.DefaultClause);
      parseExpected(Syntax.DefaultKeyword);
      parseExpected(Syntax.ColonToken);
      n.statements = ctx.parseList(Parser.Context.SwitchClauseStatements, parseStatement);
      return finishNode(n);
    }
    function parseCaseOrDefaultClause(): CaseOrDefaultClause {
      return tok() === Syntax.CaseKeyword ? parseCaseClause() : parseDefaultClause();
    }
    function parseSwitchStatement(): SwitchStatement {
      const n = createNode(Syntax.SwitchStatement);
      parseExpected(Syntax.SwitchKeyword);
      parseExpected(Syntax.OpenParenToken);
      n.expression = flags.withoutDisallowIn(parseExpression);
      parseExpected(Syntax.CloseParenToken);
      const n2 = createNode(Syntax.CaseBlock);
      parseExpected(Syntax.OpenBraceToken);
      n2.clauses = ctx.parseList(Parser.Context.SwitchClauses, parseCaseOrDefaultClause);
      parseExpected(Syntax.CloseBraceToken);
      n.caseBlock = finishNode(n2);
      return finishNode(n);
    }
    function parseThrowStatement(): ThrowStatement {
      const n = createNode(Syntax.ThrowStatement);
      parseExpected(Syntax.ThrowKeyword);
      n.expression = scanner.hasPrecedingLineBreak() ? undefined : flags.withoutDisallowIn(parseExpression);
      parseSemicolon();
      return finishNode(n);
    }
    function parseTryStatement(): TryStatement {
      const n = createNode(Syntax.TryStatement);
      parseExpected(Syntax.TryKeyword);
      n.tryBlock = parseBlock(false);
      n.catchClause = tok() === Syntax.CatchKeyword ? parseCatchClause() : undefined;
      if (!n.catchClause || tok() === Syntax.FinallyKeyword) {
        parseExpected(Syntax.FinallyKeyword);
        n.finallyBlock = parseBlock(false);
      }
      return finishNode(n);
    }
    function parseCatchClause(): CatchClause {
      const result = createNode(Syntax.CatchClause);
      parseExpected(Syntax.CatchKeyword);
      if (parseOptional(Syntax.OpenParenToken)) {
        result.variableDeclaration = parseVariableDeclaration();
        parseExpected(Syntax.CloseParenToken);
      } else result.variableDeclaration = undefined;
      result.block = parseBlock(false);
      return finishNode(result);
    }
    function parseDebuggerStatement(): Statement {
      const n = createNode(Syntax.DebuggerStatement);
      parseExpected(Syntax.DebuggerKeyword);
      parseSemicolon();
      return finishNode(n);
    }
    function parseExpressionOrLabeledStatement(): ExpressionStatement | LabeledStatement {
      const n = createNodeWithJSDoc(tok() === Syntax.Identifier ? Syntax.Unknown : Syntax.ExpressionStatement);
      const expression = flags.withoutDisallowIn(parseExpression);
      if (expression.kind === Syntax.Identifier && parseOptional(Syntax.ColonToken)) {
        n.kind = Syntax.LabeledStatement;
        (n as LabeledStatement).label = <Identifier>expression;
        (n as LabeledStatement).statement = parseStatement();
      } else {
        n.kind = Syntax.ExpressionStatement;
        (n as ExpressionStatement).expression = expression;
        parseSemicolon();
      }
      return finishNode(n);
    }
    function parseStatement(): Statement {
      switch (tok()) {
        case Syntax.SemicolonToken:
          return parseEmptyStatement();
        case Syntax.OpenBraceToken:
          return parseBlock(false);
        case Syntax.VarKeyword:
          return parseVariableStatement(createNodeWithJSDoc(Syntax.VariableDeclaration));
        case Syntax.LetKeyword:
          if (isLetDeclaration()) return parseVariableStatement(createNodeWithJSDoc(Syntax.VariableDeclaration));
          break;
        case Syntax.FunctionKeyword:
          return parseFunctionDeclaration(createNodeWithJSDoc(Syntax.FunctionDeclaration));
        case Syntax.ClassKeyword:
          return parseClassDeclaration(createNodeWithJSDoc(Syntax.ClassDeclaration));
        case Syntax.IfKeyword:
          return parseIfStatement();
        case Syntax.DoKeyword:
          return parseDoStatement();
        case Syntax.WhileKeyword:
          return parseWhileStatement();
        case Syntax.ForKeyword:
          return parseForOrForInOrForOfStatement();
        case Syntax.ContinueKeyword:
          return parseBreakOrContinueStatement(Syntax.ContinueStatement);
        case Syntax.BreakKeyword:
          return parseBreakOrContinueStatement(Syntax.BreakStatement);
        case Syntax.ReturnKeyword:
          return parseReturnStatement();
        case Syntax.WithKeyword:
          return parseWithStatement();
        case Syntax.SwitchKeyword:
          return parseSwitchStatement();
        case Syntax.ThrowKeyword:
          return parseThrowStatement();
        case Syntax.TryKeyword:
        case Syntax.CatchKeyword:
        case Syntax.FinallyKeyword:
          return parseTryStatement();
        case Syntax.DebuggerKeyword:
          return parseDebuggerStatement();
        case Syntax.AtToken:
          return parseDeclaration();
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
          if (isStartOfDeclaration()) return parseDeclaration();
          break;
      }
      return parseExpressionOrLabeledStatement();
    }
    function parseDeclaration(): Statement {
      const modifiers = lookAhead(() => (parseDecorators(), parseModifiers()));
      const isAmbient = some(modifiers, isDeclareModifier);
      if (isAmbient) {
        const n = ctx.tryReuseAmbientDeclaration();
        if (n) return n;
      }
      const n = createNodeWithJSDoc(Syntax.Unknown);
      n.decorators = parseDecorators();
      n.modifiers = parseModifiers();
      if (isAmbient) {
        for (const m of n.modifiers!) {
          m.flags |= NodeFlags.Ambient;
        }
        return flags.withContext(NodeFlags.Ambient, () => parseDeclarationWorker(n));
      } else return parseDeclarationWorker(n);
    }
    function parseDeclarationWorker(n: Statement): Statement {
      switch (tok()) {
        case Syntax.VarKeyword:
        case Syntax.LetKeyword:
        case Syntax.ConstKeyword:
          return parseVariableStatement(<VariableStatement>n);
        case Syntax.FunctionKeyword:
          return parseFunctionDeclaration(<FunctionDeclaration>n);
        case Syntax.ClassKeyword:
          return parseClassDeclaration(<ClassDeclaration>n);
        case Syntax.InterfaceKeyword:
          return parseInterfaceDeclaration(<InterfaceDeclaration>n);
        case Syntax.TypeKeyword:
          return parseTypeAliasDeclaration(<TypeAliasDeclaration>n);
        case Syntax.EnumKeyword:
          return parseEnumDeclaration(<EnumDeclaration>n);
        case Syntax.GlobalKeyword:
        case Syntax.ModuleKeyword:
        case Syntax.NamespaceKeyword:
          return parseModuleDeclaration(<ModuleDeclaration>n);
        case Syntax.ImportKeyword:
          return parseImportDeclarationOrImportEqualsDeclaration(<ImportDeclaration | ImportEqualsDeclaration>n);
        case Syntax.ExportKeyword:
          next.tok();
          switch (tok()) {
            case Syntax.DefaultKeyword:
            case Syntax.EqualsToken:
              return parseExportAssignment(<ExportAssignment>n);
            case Syntax.AsKeyword:
              return parseNamespaceExportDeclaration(<NamespaceExportDeclaration>n);
            default:
              return parseExportDeclaration(<ExportDeclaration>n);
          }
        default:
          if (n.decorators || n.modifiers) {
            // We reached this point because we encountered decorators and/or modifiers and assumed a declaration
            // would follow. For recovery and error reporting purposes, return an incomplete declaration.
            const missing = createMissingNode<Statement>(Syntax.MissingDeclaration, true, Diagnostics.Declaration_expected);
            missing.pos = n.pos;
            missing.decorators = n.decorators;
            missing.modifiers = n.modifiers;
            return finishNode(missing);
          }
          return undefined!; // TODO: GH#18217
      }
    }
    function parseFunctionBlockOrSemicolon(flags: SignatureFlags, m?: DiagnosticMessage): Block | undefined {
      if (tok() !== Syntax.OpenBraceToken && canParseSemicolon()) {
        parseSemicolon();
        return;
      }
      return parseFunctionBlock(flags, m);
    }
    function parseArrayBindingElement(): ArrayBindingElement {
      if (tok() === Syntax.CommaToken) return createNode(Syntax.OmittedExpression);
      const n = createNode(Syntax.BindingElement);
      n.dot3Token = parseOptionalToken(Syntax.Dot3Token);
      n.name = parseIdentifierOrPattern();
      n.initializer = parseInitializer();
      return finishNode(n);
    }
    function parseObjectBindingElement(): BindingElement {
      const n = createNode(Syntax.BindingElement);
      n.dot3Token = parseOptionalToken(Syntax.Dot3Token);
      const tokenIsIdentifier = isIdentifier();
      const propertyName = parsePropertyName();
      if (tokenIsIdentifier && tok() !== Syntax.ColonToken) n.name = <Identifier>propertyName;
      else {
        parseExpected(Syntax.ColonToken);
        n.propertyName = propertyName;
        n.name = parseIdentifierOrPattern();
      }
      n.initializer = parseInitializer();
      return finishNode(n);
    }
    function parseObjectBindingPattern(): ObjectBindingPattern {
      const n = createNode(Syntax.ObjectBindingPattern);
      parseExpected(Syntax.OpenBraceToken);
      n.elements = ctx.parseDelimitedList(Parser.Context.ObjectBindingElements, parseObjectBindingElement);
      parseExpected(Syntax.CloseBraceToken);
      return finishNode(n);
    }
    function parseArrayBindingPattern(): ArrayBindingPattern {
      const n = createNode(Syntax.ArrayBindingPattern);
      parseExpected(Syntax.OpenBracketToken);
      n.elements = ctx.parseDelimitedList(Parser.Context.ArrayBindingElements, parseArrayBindingElement);
      parseExpected(Syntax.CloseBracketToken);
      return finishNode(n);
    }
    function parseIdentifierOrPattern(privateIdentifierDiagnosticMessage?: DiagnosticMessage): Identifier | BindingPattern {
      if (tok() === Syntax.OpenBracketToken) return parseArrayBindingPattern();
      if (tok() === Syntax.OpenBraceToken) return parseObjectBindingPattern();
      return parseIdentifier(undefined, privateIdentifierDiagnosticMessage);
    }
    function parseVariableDeclarationAllowExclamation() {
      return parseVariableDeclaration(true);
    }
    function parseVariableDeclaration(allowExclamation?: boolean): VariableDeclaration {
      const n = createNode(Syntax.VariableDeclaration);
      n.name = parseIdentifierOrPattern(Diagnostics.Private_identifiers_are_not_allowed_in_variable_declarations);
      if (allowExclamation && n.name.kind === Syntax.Identifier && tok() === Syntax.ExclamationToken && !scanner.hasPrecedingLineBreak()) {
        n.exclamationToken = parseTokenNode<Token<Syntax.ExclamationToken>>();
      }
      n.type = parseTypeAnnotation();
      if (!isInOrOfKeyword(tok())) n.initializer = parseInitializer();
      return finishNode(n);
    }
    function parseVariableDeclarationList(inForStatementInitializer: boolean): VariableDeclarationList {
      const n = createNode(Syntax.VariableDeclarationList);
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
      if (tok() === Syntax.OfKeyword && lookAhead(canFollowContextualOfKeyword)) {
        n.declarations = createMissingList<VariableDeclaration>();
      } else {
        const f = flags.inContext(NodeFlags.DisallowInContext);
        flags.set(inForStatementInitializer, NodeFlags.DisallowInContext);
        n.declarations = ctx.parseDelimitedList(Parser.Context.VariableDeclarations, inForStatementInitializer ? parseVariableDeclaration : parseVariableDeclarationAllowExclamation);
        flags.set(f, NodeFlags.DisallowInContext);
      }
      return finishNode(n);
    }
    function parseVariableStatement(n: VariableStatement): VariableStatement {
      n.kind = Syntax.VariableStatement;
      n.declarationList = parseVariableDeclarationList(false);
      parseSemicolon();
      return finishNode(n);
    }
    function parseFunctionDeclaration(n: FunctionDeclaration): FunctionDeclaration {
      n.kind = Syntax.FunctionDeclaration;
      parseExpected(Syntax.FunctionKeyword);
      n.asteriskToken = parseOptionalToken(Syntax.AsteriskToken);
      n.name = hasModifierOfKind(n, Syntax.DefaultKeyword) ? parseOptionalIdentifier() : parseIdentifier();
      const isGenerator = n.asteriskToken ? SignatureFlags.Yield : SignatureFlags.None;
      const isAsync = hasModifierOfKind(n, Syntax.AsyncKeyword) ? SignatureFlags.Await : SignatureFlags.None;
      fillSignature(Syntax.ColonToken, isGenerator | isAsync, n);
      n.body = parseFunctionBlockOrSemicolon(isGenerator | isAsync, Diagnostics.or_expected);
      return finishNode(n);
    }
    function parseConstructorName() {
      if (tok() === Syntax.ConstructorKeyword) return parseExpected(Syntax.ConstructorKeyword);
      if (tok() === Syntax.StringLiteral && lookAhead(nextToken) === Syntax.OpenParenToken) {
        return tryParse(() => {
          const literalNode = parseLiteralNode();
          return literalNode.text === 'constructor' ? literalNode : undefined;
        });
      }
      return;
    }
    function tryParseConstructorDeclaration(n: ConstructorDeclaration): ConstructorDeclaration | undefined {
      return tryParse(() => {
        if (parseConstructorName()) {
          n.kind = Syntax.Constructor;
          fillSignature(Syntax.ColonToken, SignatureFlags.None, n);
          n.body = parseFunctionBlockOrSemicolon(SignatureFlags.None, Diagnostics.or_expected);
          return finishNode(n);
        }
        return;
      });
    }
    function parseMethodDeclaration(n: MethodDeclaration, asteriskToken: AsteriskToken, m?: DiagnosticMessage): MethodDeclaration {
      n.kind = Syntax.MethodDeclaration;
      n.asteriskToken = asteriskToken;
      const isGenerator = asteriskToken ? SignatureFlags.Yield : SignatureFlags.None;
      const isAsync = hasModifierOfKind(n, Syntax.AsyncKeyword) ? SignatureFlags.Await : SignatureFlags.None;
      fillSignature(Syntax.ColonToken, isGenerator | isAsync, n);
      n.body = parseFunctionBlockOrSemicolon(isGenerator | isAsync, m);
      return finishNode(n);
    }
    function parsePropertyDeclaration(n: PropertyDeclaration): PropertyDeclaration {
      n.kind = Syntax.PropertyDeclaration;
      if (!n.questionToken && tok() === Syntax.ExclamationToken && !scanner.hasPrecedingLineBreak()) {
        n.exclamationToken = parseTokenNode<Token<Syntax.ExclamationToken>>();
      }
      n.type = parseTypeAnnotation();
      n.initializer = flags.withoutContext(NodeFlags.YieldContext | NodeFlags.AwaitContext | NodeFlags.DisallowInContext, parseInitializer);
      parseSemicolon();
      return finishNode(n);
    }
    function parsePropertyOrMethodDeclaration(n: PropertyDeclaration | MethodDeclaration): PropertyDeclaration | MethodDeclaration {
      const asteriskToken = parseOptionalToken(Syntax.AsteriskToken);
      n.name = parsePropertyName();
      n.questionToken = parseOptionalToken(Syntax.QuestionToken);
      if (asteriskToken || tok() === Syntax.OpenParenToken || tok() === Syntax.LessThanToken) {
        return parseMethodDeclaration(<MethodDeclaration>n, asteriskToken, Diagnostics.or_expected);
      }
      return parsePropertyDeclaration(<PropertyDeclaration>n);
    }
    function parseAccessorDeclaration(n: AccessorDeclaration, kind: AccessorDeclaration['kind']): AccessorDeclaration {
      n.kind = kind;
      n.name = parsePropertyName();
      fillSignature(Syntax.ColonToken, SignatureFlags.None, n);
      n.body = parseFunctionBlockOrSemicolon(SignatureFlags.None);
      return finishNode(n);
    }
    function parseDecorators(): NodeArray<Decorator> | undefined {
      let list: Decorator[] | undefined;
      const listPos = getNodePos();
      while (true) {
        const decoratorStart = getNodePos();
        if (!parseOptional(Syntax.AtToken)) break;
        const n = createNode(Syntax.Decorator, decoratorStart);
        n.expression = flags.withDecorator(parseLeftHandSideExpressionOrHigher);
        finishNode(n);
        (list || (list = [])).push(n);
      }
      return list && createNodeArray(list, listPos);
    }
    function parseModifiers(permitInvalidConstAsModifier?: boolean): NodeArray<Modifier> | undefined {
      let list: Modifier[] | undefined;
      const listPos = getNodePos();
      while (true) {
        const modifierStart = scanner.getStartPos();
        const modifierKind = tok();
        if (tok() === Syntax.ConstKeyword && permitInvalidConstAsModifier) {
          if (!tryParse(next.isOnSameLineAndCanFollowModifier)) break;
        } else if (!parseAnyContextualModifier()) break;
        const modifier = finishNode(createNode(modifierKind, modifierStart));
        (list || (list = [])).push(modifier);
      }
      return list && createNodeArray(list, listPos);
    }
    function parseModifiersForArrowFunction(): NodeArray<Modifier> | undefined {
      let modifiers: NodeArray<Modifier> | undefined;
      if (tok() === Syntax.AsyncKeyword) {
        const modifierStart = scanner.getStartPos();
        const modifierKind = tok();
        next.tok();
        const modifier = finishNode(createNode(modifierKind, modifierStart));
        modifiers = createNodeArray<Modifier>([modifier], modifierStart);
      }
      return modifiers;
    }
    function parseClassElement(): ClassElement {
      if (tok() === Syntax.SemicolonToken) {
        const n = createNode(Syntax.SemicolonClassElement);
        next.tok();
        return finishNode(n);
      }
      const n = createNode(Syntax.Unknown);
      n.decorators = parseDecorators();
      n.modifiers = parseModifiers(true);
      if (parseContextualModifier(Syntax.GetKeyword)) return parseAccessorDeclaration(<AccessorDeclaration>n, Syntax.GetAccessor);
      if (parseContextualModifier(Syntax.SetKeyword)) return parseAccessorDeclaration(<AccessorDeclaration>n, Syntax.SetAccessor);
      if (tok() === Syntax.ConstructorKeyword || tok() === Syntax.StringLiteral) {
        const d = tryParseConstructorDeclaration(<ConstructorDeclaration>n);
        if (d) return d;
      }
      if (isIndexSignature()) return parseIndexSignatureDeclaration(<IndexSignatureDeclaration>n);
      if (identifierOrKeyword(tok()) || tok() === Syntax.StringLiteral || tok() === Syntax.NumericLiteral || tok() === Syntax.AsteriskToken || tok() === Syntax.OpenBracketToken) {
        const isAmbient = n.modifiers && some(n.modifiers, isDeclareModifier);
        if (isAmbient) {
          for (const m of n.modifiers!) {
            m.flags |= NodeFlags.Ambient;
          }
          return flags.withContext(NodeFlags.Ambient, () => parsePropertyOrMethodDeclaration(n as PropertyDeclaration | MethodDeclaration));
        }
        return parsePropertyOrMethodDeclaration(n as PropertyDeclaration | MethodDeclaration);
      }
      if (n.decorators || n.modifiers) {
        n.name = createMissingNode<Identifier>(Syntax.Identifier, true, Diagnostics.Declaration_expected);
        return parsePropertyDeclaration(<PropertyDeclaration>n);
      }
      return fail('Should not have attempted to parse class member declaration.');
    }
    function parseClassExpression(): ClassExpression {
      return <ClassExpression>parseClassDeclarationOrExpression(createNodeWithJSDoc(Syntax.Unknown), Syntax.ClassExpression);
    }
    function parseClassDeclaration(n: ClassLikeDeclaration): ClassDeclaration {
      return <ClassDeclaration>parseClassDeclarationOrExpression(n, Syntax.ClassDeclaration);
    }
    function parseClassDeclarationOrExpression(n: ClassLikeDeclaration, kind: ClassLikeDeclaration['kind']): ClassLikeDeclaration {
      n.kind = kind;
      parseExpected(Syntax.ClassKeyword);
      n.name = parseNameOfClassDeclarationOrExpression();
      n.typeParameters = parseTypeParameters();
      n.heritageClauses = parseHeritageClauses();
      if (parseExpected(Syntax.OpenBraceToken)) {
        n.members = parseClassMembers();
        parseExpected(Syntax.CloseBraceToken);
      } else n.members = createMissingList<ClassElement>();
      return finishNode(n);
    }
    function parseNameOfClassDeclarationOrExpression(): Identifier | undefined {
      return isIdentifier() && !isImplementsClause() ? parseIdentifier() : undefined;
    }
    function parseHeritageClauses(): NodeArray<HeritageClause> | undefined {
      if (isHeritageClause()) return ctx.parseList(Parser.Context.HeritageClauses, parseHeritageClause);
      return;
    }
    function parseHeritageClause(): HeritageClause {
      const tok = tok();
      assert(tok === Syntax.ExtendsKeyword || tok === Syntax.ImplementsKeyword);
      const n = createNode(Syntax.HeritageClause);
      n.token = tok;
      next.tok();
      n.types = ctx.parseDelimitedList(Parser.Context.HeritageClauseElement, parseExpressionWithTypeArguments);
      return finishNode(n);
    }
    function parseExpressionWithTypeArguments(): ExpressionWithTypeArguments {
      const n = createNode(Syntax.ExpressionWithTypeArguments);
      n.expression = parseLeftHandSideExpressionOrHigher();
      n.typeArguments = tryParseTypeArguments();
      return finishNode(n);
    }
    function tryParseTypeArguments(): NodeArray<TypeNode> | undefined {
      return tok() === Syntax.LessThanToken ? ctx.parseBracketedList(Parser.Context.TypeArguments, parseType, Syntax.LessThanToken, Syntax.GreaterThanToken) : undefined;
    }
    function parseClassMembers(): NodeArray<ClassElement> {
      return ctx.parseList(Parser.Context.ClassMembers, parseClassElement);
    }
    function parseInterfaceDeclaration(n: InterfaceDeclaration): InterfaceDeclaration {
      n.kind = Syntax.InterfaceDeclaration;
      parseExpected(Syntax.InterfaceKeyword);
      n.name = parseIdentifier();
      n.typeParameters = parseTypeParameters();
      n.heritageClauses = parseHeritageClauses();
      n.members = parseObjectTypeMembers();
      return finishNode(n);
    }
    function parseTypeAliasDeclaration(n: TypeAliasDeclaration): TypeAliasDeclaration {
      n.kind = Syntax.TypeAliasDeclaration;
      parseExpected(Syntax.TypeKeyword);
      n.name = parseIdentifier();
      n.typeParameters = parseTypeParameters();
      parseExpected(Syntax.EqualsToken);
      n.type = parseType();
      parseSemicolon();
      return finishNode(n);
    }
    function parseEnumMember(): EnumMember {
      const n = createNodeWithJSDoc(Syntax.EnumMember);
      n.name = parsePropertyName();
      n.initializer = flags.withoutDisallowIn(parseInitializer);
      return finishNode(n);
    }
    function parseEnumDeclaration(n: EnumDeclaration): EnumDeclaration {
      n.kind = Syntax.EnumDeclaration;
      parseExpected(Syntax.EnumKeyword);
      n.name = parseIdentifier();
      if (parseExpected(Syntax.OpenBraceToken)) {
        n.members = flags.withoutYieldAndAwait(() => ctx.parseDelimitedList(Parser.Context.EnumMembers, parseEnumMember));
        parseExpected(Syntax.CloseBraceToken);
      } else {
        n.members = createMissingList<EnumMember>();
      }
      return finishNode(n);
    }
    function parseModuleBlock(): ModuleBlock {
      const n = createNode(Syntax.ModuleBlock);
      if (parseExpected(Syntax.OpenBraceToken)) {
        n.statements = ctx.parseList(Parser.Context.BlockStatements, parseStatement);
        parseExpected(Syntax.CloseBraceToken);
      } else n.statements = createMissingList<Statement>();

      return finishNode(n);
    }
    function parseModuleOrNamespaceDeclaration(n: ModuleDeclaration, flags: NodeFlags): ModuleDeclaration {
      n.kind = Syntax.ModuleDeclaration;
      const namespaceFlag = flags & NodeFlags.Namespace;
      n.flags |= flags;
      n.name = parseIdentifier();
      n.body = parseOptional(Syntax.DotToken) ? <NamespaceDeclaration>parseModuleOrNamespaceDeclaration(createNode(Syntax.Unknown), NodeFlags.NestedNamespace | namespaceFlag) : parseModuleBlock();
      return finishNode(n);
    }
    function parseAmbientExternalModuleDeclaration(n: ModuleDeclaration): ModuleDeclaration {
      n.kind = Syntax.ModuleDeclaration;
      if (tok() === Syntax.GlobalKeyword) {
        n.name = parseIdentifier();
        n.flags |= NodeFlags.GlobalAugmentation;
      } else {
        n.name = <StringLiteral>parseLiteralNode();
        n.name.text = internIdentifier(n.name.text);
      }
      if (tok() === Syntax.OpenBraceToken) n.body = parseModuleBlock();
      else parseSemicolon();
      return finishNode(n);
    }
    function parseModuleDeclaration(n: ModuleDeclaration): ModuleDeclaration {
      let flags: NodeFlags = 0;
      if (tok() === Syntax.GlobalKeyword) {
        return parseAmbientExternalModuleDeclaration(n);
      } else if (parseOptional(Syntax.NamespaceKeyword)) flags |= NodeFlags.Namespace;
      else {
        parseExpected(Syntax.ModuleKeyword);
        if (tok() === Syntax.StringLiteral) return parseAmbientExternalModuleDeclaration(n);
      }
      return parseModuleOrNamespaceDeclaration(n, flags);
    }
    function parseNamespaceExportDeclaration(n: NamespaceExportDeclaration): NamespaceExportDeclaration {
      n.kind = Syntax.NamespaceExportDeclaration;
      parseExpected(Syntax.AsKeyword);
      parseExpected(Syntax.NamespaceKeyword);
      n.name = parseIdentifier();
      parseSemicolon();
      return finishNode(n);
    }
    function parseImportDeclarationOrImportEqualsDeclaration(n: ImportEqualsDeclaration | ImportDeclaration): ImportEqualsDeclaration | ImportDeclaration {
      parseExpected(Syntax.ImportKeyword);
      const afterImportPos = scanner.getStartPos();
      let identifier: Identifier | undefined;
      if (isIdentifier()) identifier = parseIdentifier();
      let isTypeOnly = false;
      if (tok() !== Syntax.FromKeyword && identifier?.escapedText === 'type' && (isIdentifier() || tokenAfterImportDefinitelyProducesImportDeclaration())) {
        isTypeOnly = true;
        identifier = isIdentifier() ? parseIdentifier() : undefined;
      }
      if (identifier && !tokenAfterImportedIdentifierDefinitelyProducesImportDeclaration()) {
        return parseImportEqualsDeclaration(<ImportEqualsDeclaration>n, identifier, isTypeOnly);
      }
      n.kind = Syntax.ImportDeclaration;
      if (
        identifier || // import id
        tok() === Syntax.AsteriskToken || // import *
        tok() === Syntax.OpenBraceToken // import {
      ) {
        (<ImportDeclaration>n).importClause = parseImportClause(identifier, afterImportPos, isTypeOnly);
        parseExpected(Syntax.FromKeyword);
      }
      (<ImportDeclaration>n).moduleSpecifier = parseModuleSpecifier();
      parseSemicolon();
      return finishNode(n);
    }
    function parseImportEqualsDeclaration(n: ImportEqualsDeclaration, identifier: Identifier, isTypeOnly: boolean): ImportEqualsDeclaration {
      n.kind = Syntax.ImportEqualsDeclaration;
      n.name = identifier;
      parseExpected(Syntax.EqualsToken);
      n.moduleReference = parseModuleReference();
      parseSemicolon();
      const finished = finishNode(n);
      if (isTypeOnly) parse.errorAtRange(finished, Diagnostics.Only_ECMAScript_imports_may_use_import_type);
      return finished;
    }
    function parseImportClause(identifier: Identifier | undefined, fullStart: number, isTypeOnly: boolean) {
      const n = createNode(Syntax.ImportClause, fullStart);
      n.isTypeOnly = isTypeOnly;
      if (identifier) n.name = identifier;
      if (!n.name || parseOptional(Syntax.CommaToken)) n.namedBindings = tok() === Syntax.AsteriskToken ? parseNamespaceImport() : parseNamedImportsOrExports(Syntax.NamedImports);
      return finishNode(n);
    }
    function parseModuleReference() {
      return isExternalModuleReference() ? parseExternalModuleReference() : parseEntityName(false);
    }
    function parseExternalModuleReference() {
      const n = createNode(Syntax.ExternalModuleReference);
      parseExpected(Syntax.RequireKeyword);
      parseExpected(Syntax.OpenParenToken);
      n.expression = parseModuleSpecifier();
      parseExpected(Syntax.CloseParenToken);
      return finishNode(n);
    }
    function parseModuleSpecifier(): Expression {
      if (tok() === Syntax.StringLiteral) {
        const result = parseLiteralNode();
        result.text = internIdentifier(result.text);
        return result;
      }
      return parseExpression();
    }
    function parseNamespaceImport(): NamespaceImport {
      const n = createNode(Syntax.NamespaceImport);
      parseExpected(Syntax.AsteriskToken);
      parseExpected(Syntax.AsKeyword);
      n.name = parseIdentifier();
      return finishNode(n);
    }
    function parseNamedImportsOrExports(kind: Syntax.NamedImports): NamedImports;
    function parseNamedImportsOrExports(kind: Syntax.NamedExports): NamedExports;
    function parseNamedImportsOrExports(kind: Syntax): NamedImportsOrExports {
      const n = createNode(kind);
      n.elements = <NodeArray<ImportSpecifier> | NodeArray<ExportSpecifier>>(
        ctx.parseBracketedList(Parser.Context.ImportOrExportSpecifiers, kind === Syntax.NamedImports ? parseImportSpecifier : parseExportSpecifier, Syntax.OpenBraceToken, Syntax.CloseBraceToken)
      );
      return finishNode(n);
    }
    function parseExportSpecifier() {
      return parseImportOrExportSpecifier(Syntax.ExportSpecifier);
    }
    function parseImportSpecifier() {
      return parseImportOrExportSpecifier(Syntax.ImportSpecifier);
    }
    function parseImportOrExportSpecifier(kind: Syntax): ImportOrExportSpecifier {
      const n = createNode(kind);
      let checkIdentifierIsKeyword = isKeyword(tok()) && !isIdentifier();
      let checkIdentifierStart = scanner.getTokenPos();
      let checkIdentifierEnd = scanner.getTextPos();
      const identifierName = parseIdentifierName();
      if (tok() === Syntax.AsKeyword) {
        n.propertyName = identifierName;
        parseExpected(Syntax.AsKeyword);
        checkIdentifierIsKeyword = isKeyword(tok()) && !isIdentifier();
        checkIdentifierStart = scanner.getTokenPos();
        checkIdentifierEnd = scanner.getTextPos();
        n.name = parseIdentifierName();
      } else n.name = identifierName;
      if (kind === Syntax.ImportSpecifier && checkIdentifierIsKeyword) parse.errorAt(checkIdentifierStart, checkIdentifierEnd, Diagnostics.Identifier_expected);
      return finishNode(n);
    }
    function parseNamespaceExport(pos: number): NamespaceExport {
      const n = createNode(Syntax.NamespaceExport, pos);
      n.name = parseIdentifier();
      return finishNode(n);
    }
    function parseExportDeclaration(n: ExportDeclaration): ExportDeclaration {
      n.kind = Syntax.ExportDeclaration;
      n.isTypeOnly = parseOptional(Syntax.TypeKeyword);
      const namespaceExportPos = scanner.getStartPos();
      if (parseOptional(Syntax.AsteriskToken)) {
        if (parseOptional(Syntax.AsKeyword)) n.exportClause = parseNamespaceExport(namespaceExportPos);
        parseExpected(Syntax.FromKeyword);
        n.moduleSpecifier = parseModuleSpecifier();
      } else {
        n.exportClause = parseNamedImportsOrExports(Syntax.NamedExports);
        if (tok() === Syntax.FromKeyword || (tok() === Syntax.StringLiteral && !scanner.hasPrecedingLineBreak())) {
          parseExpected(Syntax.FromKeyword);
          n.moduleSpecifier = parseModuleSpecifier();
        }
      }
      parseSemicolon();
      return finishNode(n);
    }
    function parseExportAssignment(n: ExportAssignment): ExportAssignment {
      n.kind = Syntax.ExportAssignment;
      if (parseOptional(Syntax.EqualsToken)) n.isExportEquals = true;
      else parseExpected(Syntax.DefaultKeyword);
      n.expression = parseAssignmentExpressionOrHigher();
      parseSemicolon();
      return finishNode(n);
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
    export namespace JSDocParser {
      export function parseJSDocTypeExpressionForTests(
        content: string,
        start: number | undefined,
        length: number | undefined
      ): { jsDocTypeExpression: JSDocTypeExpression; diagnostics: Diagnostic[] } | undefined {
        initializeState(content, ScriptTarget.ESNext, undefined, ScriptKind.JS);
        sourceFile = createSourceFile('file.js', ScriptTarget.ESNext, ScriptKind.JS, false);
        scanner.setText(content, start, length);
        currentToken = scanner.scan();
        const jsDocTypeExpression = parseJSDocTypeExpression();
        const diagnostics = parseDiagnostics;
        clearState();
        return jsDocTypeExpression ? { jsDocTypeExpression, diagnostics } : undefined;
      }

      export function parseJSDocTypeExpression(mayOmitBraces?: boolean): JSDocTypeExpression {
        const n = createNode(Syntax.JSDocTypeExpression);
        const hasBrace = (mayOmitBraces ? parseOptional : parseExpected)(Syntax.OpenBraceToken);
        n.type = flags.withContext(NodeFlags.JSDoc, parseJSDocType);
        if (!mayOmitBraces || hasBrace) parseExpectedJSDoc(Syntax.CloseBraceToken);
        fixupParentReferences(n);
        return finishNode(n);
      }

      export function parseIsolatedJSDocComment(content: string, start: number | undefined, length: number | undefined): { jsDoc: JSDoc; diagnostics: Diagnostic[] } | undefined {
        initializeState(content, ScriptTarget.ESNext, undefined, ScriptKind.JS);
        sourceFile = <SourceFile>{ languageVariant: LanguageVariant.TS, text: content };
        const jsDoc = flags.withContext(NodeFlags.JSDoc, () => parseJSDocCommentWorker(start, length));
        const diagnostics = parseDiagnostics;
        clearState();
        return jsDoc ? { jsDoc, diagnostics } : undefined;
      }

      export function parseJSDocComment(parent: HasJSDoc, start: number, length: number): JSDoc | undefined {
        const saveToken = currentToken;
        const saveParseDiagnosticsLength = parseDiagnostics.length;
        const saveParseErrorBeforeNextFinishedNode = parseErrorBeforeNextFinishedNode;
        const comment = flags.withContext(NodeFlags.JSDoc, () => parseJSDocCommentWorker(start, length));
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

      const enum JSDocState {
        BeginningOfLine,
        SawAsterisk,
        SavingComments,
        SavingBackticks,
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
        assert(start >= 0);
        assert(start <= end);
        assert(end <= content.length);
        if (!Scanner.isJSDocLike(content, start)) return;
        let tags: JSDocTag[];
        let tagsPos: number;
        let tagsEnd: number;
        const comments: string[] = [];
        return scanner.scanRange(start + 3, length - 5, () => {
          let state = JSDocState.SawAsterisk;
          let margin: number | undefined;
          let indent = start - Math.max(content.lastIndexOf('\n', start), 0) + 4;
          function pushComment(text: string) {
            if (!margin) {
              margin = indent;
            }
            comments.push(text);
            indent += text.length;
          }
          next.tokJSDoc();
          while (parseOptionalJsdoc(Syntax.WhitespaceTrivia));
          if (parseOptionalJsdoc(Syntax.NewLineTrivia)) {
            state = JSDocState.BeginningOfLine;
            indent = 0;
          }
          loop: while (true) {
            switch (tok()) {
              case Syntax.AtToken:
                if (state === JSDocState.BeginningOfLine || state === JSDocState.SawAsterisk) {
                  removeTrailingWhitespace(comments);
                  addTag(parseTag(indent));
                  state = JSDocState.BeginningOfLine;
                  margin = undefined;
                } else {
                  pushComment(scanner.getTokenText());
                }
                break;
              case Syntax.NewLineTrivia:
                comments.push(scanner.getTokenText());
                state = JSDocState.BeginningOfLine;
                indent = 0;
                break;
              case Syntax.AsteriskToken:
                const asterisk = scanner.getTokenText();
                if (state === JSDocState.SawAsterisk || state === JSDocState.SavingComments) {
                  state = JSDocState.SavingComments;
                  pushComment(asterisk);
                } else {
                  // Ignore the first asterisk on a line
                  state = JSDocState.SawAsterisk;
                  indent += asterisk.length;
                }
                break;
              case Syntax.WhitespaceTrivia:
                // only collect whitespace if we're already saving comments or have just crossed the comment indent margin
                const whitespace = scanner.getTokenText();
                if (state === JSDocState.SavingComments) {
                  comments.push(whitespace);
                } else if (margin !== undefined && indent + whitespace.length > margin) {
                  comments.push(whitespace.slice(margin - indent - 1));
                }
                indent += whitespace.length;
                break;
              case Syntax.EndOfFileToken:
                break loop;
              default:
                state = JSDocState.SavingComments;
                pushComment(scanner.getTokenText());
                break;
            }
            next.tokJSDoc();
          }
          removeLeadingNewlines(comments);
          removeTrailingWhitespace(comments);
          return createJSDocComment();
        });
        function parseTag(margin: number) {
          assert(tok() === Syntax.AtToken);
          const start = scanner.getTokenPos();
          next.tokJSDoc();
          const tagName = parseJSDocIdentifierName(undefined);
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
              tag = parseSimpleTag(start, Syntax.JSDocClassTag, tagName);
              break;
            case 'public':
              tag = parseSimpleTag(start, Syntax.JSDocPublicTag, tagName);
              break;
            case 'private':
              tag = parseSimpleTag(start, Syntax.JSDocPrivateTag, tagName);
              break;
            case 'protected':
              tag = parseSimpleTag(start, Syntax.JSDocProtectedTag, tagName);
              break;
            case 'readonly':
              tag = parseSimpleTag(start, Syntax.JSDocReadonlyTag, tagName);
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
            if (!indentText) margin += tag.end - tag.pos;

            tag.comment = parseTagComments(margin, indentText.slice(margin));
          }
          return tag;
        }

        function parseTagComments(indent: number, initialMargin?: string): string | undefined {
          const comments: string[] = [];
          let state = JSDocState.BeginningOfLine;
          let margin: number | undefined;
          function pushComment(text: string) {
            if (!margin) margin = indent;
            comments.push(text);
            indent += text.length;
          }
          if (initialMargin !== undefined) {
            if (initialMargin !== '') pushComment(initialMargin);
            state = JSDocState.SawAsterisk;
          }
          let tok = tok() as JSDocSyntax;
          loop: while (true) {
            switch (tok) {
              case Syntax.NewLineTrivia:
                if (state >= JSDocState.SawAsterisk) {
                  state = JSDocState.BeginningOfLine;
                  comments.push(scanner.getTokenText());
                }
                indent = 0;
                break;
              case Syntax.AtToken:
                if (state === JSDocState.SavingBackticks) {
                  comments.push(scanner.getTokenText());
                  break;
                }
                scanner.setTextPos(scanner.getTextPos() - 1);
              case Syntax.EndOfFileToken:
                break loop;
              case Syntax.WhitespaceTrivia:
                if (state === JSDocState.SavingComments || state === JSDocState.SavingBackticks) {
                  pushComment(scanner.getTokenText());
                } else {
                  const whitespace = scanner.getTokenText();
                  if (margin !== undefined && indent + whitespace.length > margin) {
                    comments.push(whitespace.slice(margin - indent));
                  }
                  indent += whitespace.length;
                }
                break;
              case Syntax.OpenBraceToken:
                state = JSDocState.SavingComments;
                if (lookAhead(() => next.tokJSDoc() === Syntax.AtToken && identifierOrKeyword(next.tokJSDoc()) && scanner.getTokenText() === 'link')) {
                  pushComment(scanner.getTokenText());
                  next.tokJSDoc();
                  pushComment(scanner.getTokenText());
                  next.tokJSDoc();
                }
                pushComment(scanner.getTokenText());
                break;
              case Syntax.BacktickToken:
                if (state === JSDocState.SavingBackticks) state = JSDocState.SavingComments;
                else state = JSDocState.SavingBackticks;

                pushComment(scanner.getTokenText());
                break;
              case Syntax.AsteriskToken:
                if (state === JSDocState.BeginningOfLine) {
                  state = JSDocState.SawAsterisk;
                  indent += 1;
                  break;
                }
              default:
                if (state !== JSDocState.SavingBackticks) state = JSDocState.SavingComments;
                pushComment(scanner.getTokenText());
                break;
            }
            tok = next.tokJSDoc();
          }
          removeLeadingNewlines(comments);
          removeTrailingWhitespace(comments);
          return comments.length === 0 ? undefined : comments.join('');
        }

        function parseUnknownTag(start: number, tagName: Identifier) {
          const n = createNode(Syntax.JSDocTag, start);
          n.tagName = tagName;
          return finishNode(n);
        }
        function addTag(tag: JSDocTag | undefined): void {
          if (!tag) return;

          if (!tags) {
            tags = [tag];
            tagsPos = tag.pos;
          } else tags.push(tag);

          tagsEnd = tag.end;
        }
        function tryParseTypeExpression(): JSDocTypeExpression | undefined {
          skipWhitespaceOrAsterisk();
          return tok() === Syntax.OpenBraceToken ? parseJSDocTypeExpression() : undefined;
        }
        function parseBracketNameInPropertyAndParamTag(): { name: EntityName; isBracketed: boolean } {
          const isBracketed = parseOptionalJsdoc(Syntax.OpenBracketToken);
          if (isBracketed) skipWhitespace();
          const isBackquoted = parseOptionalJsdoc(Syntax.BacktickToken);
          const name = parseJSDocEntityName();
          if (isBackquoted) parseExpectedTokenJSDoc(Syntax.BacktickToken);
          if (isBracketed) {
            skipWhitespace();
            if (parseOptionalToken(Syntax.EqualsToken)) parseExpression();
            parseExpected(Syntax.CloseBracketToken);
          }
          return { name, isBracketed };
        }
        function parseParameterOrPropertyTag(start: number, tagName: Identifier, target: PropertyLikeParse, indent: number): JSDocParameterTag | JSDocPropertyTag {
          let typeExpression = tryParseTypeExpression();
          let isNameFirst = !typeExpression;
          skipWhitespaceOrAsterisk();
          const { name, isBracketed } = parseBracketNameInPropertyAndParamTag();
          skipWhitespace();
          if (isNameFirst) typeExpression = tryParseTypeExpression();
          const n = target === PropertyLikeParse.Property ? createNode(Syntax.JSDocPropertyTag, start) : createNode(Syntax.JSDocParameterTag, start);
          const comment = parseTagComments(indent + scanner.getStartPos() - start);
          const nestedTypeLiteral = target !== PropertyLikeParse.CallbackParameter && parseNestedTypeLiteral(typeExpression, name, target, indent);
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
        function parseNestedTypeLiteral(typeExpression: JSDocTypeExpression | undefined, name: EntityName, target: PropertyLikeParse, indent: number) {
          if (typeExpression && isObjectOrObjectArrayTypeReference(typeExpression.type)) {
            const n = createNode(Syntax.JSDocTypeExpression, scanner.getTokenPos());
            let child: JSDocPropertyLikeTag | JSDocTypeTag | false;
            let n2: JSDocTypeLiteral;
            const start = scanner.getStartPos();
            let children: JSDocPropertyLikeTag[] | undefined;
            while ((child = tryParse(() => parseChildParameterOrPropertyTag(target, indent, name)))) {
              if (child.kind === Syntax.JSDocParameterTag || child.kind === Syntax.JSDocPropertyTag) children = append(children, child);
            }
            if (children) {
              n2 = createNode(Syntax.JSDocTypeLiteral, start);
              n2.jsDocPropertyTags = children;
              if (typeExpression.type.kind === Syntax.ArrayType) n2.isArrayType = true;
              n.type = finishNode(n2);
              return finishNode(n);
            }
          }
          return;
        }
        function parseReturnTag(start: number, tagName: Identifier): JSDocReturnTag {
          if (some(tags, isJSDocReturnTag)) parse.errorAt(tagName.pos, scanner.getTokenPos(), Diagnostics._0_tag_already_specified, tagName.escapedText);
          const n = createNode(Syntax.JSDocReturnTag, start);
          n.tagName = tagName;
          n.typeExpression = tryParseTypeExpression();
          return finishNode(n);
        }
        function parseTypeTag(start: number, tagName: Identifier): JSDocTypeTag {
          if (some(tags, isJSDocTypeTag)) parse.errorAt(tagName.pos, scanner.getTokenPos(), Diagnostics._0_tag_already_specified, tagName.escapedText);
          const n = createNode(Syntax.JSDocTypeTag, start);
          n.tagName = tagName;
          n.typeExpression = parseJSDocTypeExpression(true);
          return finishNode(n);
        }
        function parseAuthorTag(start: number, tagName: Identifier, indent: number): JSDocAuthorTag {
          const n = createNode(Syntax.JSDocAuthorTag, start);
          n.tagName = tagName;
          const authorInfoWithEmail = tryParse(() => tryParseAuthorNameAndEmail());
          if (!authorInfoWithEmail) return finishNode(n);
          n.comment = authorInfoWithEmail;
          if (lookAhead(() => next.tok() !== Syntax.NewLineTrivia)) {
            const comment = parseTagComments(indent);
            if (comment) n.comment += comment;
          }
          return finishNode(n);
        }
        function tryParseAuthorNameAndEmail(): string | undefined {
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
                if (seenLessThan || seenGreaterThan) {
                  return;
                }
                seenLessThan = true;
                comments.push(scanner.getTokenText());
                break;
              case Syntax.GreaterThanToken:
                if (!seenLessThan || seenGreaterThan) {
                  return;
                }
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
        function parseImplementsTag(start: number, tagName: Identifier): JSDocImplementsTag {
          const n = createNode(Syntax.JSDocImplementsTag, start);
          n.tagName = tagName;
          n.class = parseExpressionWithTypeArgumentsForAugments();
          return finishNode(n);
        }
        function parseAugmentsTag(start: number, tagName: Identifier): JSDocAugmentsTag {
          const n = createNode(Syntax.JSDocAugmentsTag, start);
          n.tagName = tagName;
          n.class = parseExpressionWithTypeArgumentsForAugments();
          return finishNode(n);
        }
        function parseExpressionWithTypeArgumentsForAugments(): ExpressionWithTypeArguments & {
          expression: Identifier | PropertyAccessEntityNameExpression;
        } {
          const usedBrace = parseOptional(Syntax.OpenBraceToken);
          const n = createNode(Syntax.ExpressionWithTypeArguments) as ExpressionWithTypeArguments & {
            expression: Identifier | PropertyAccessEntityNameExpression;
          };
          n.expression = parsePropertyAccessEntityNameExpression();
          n.typeArguments = tryParseTypeArguments();
          const res = finishNode(n);
          if (usedBrace) parseExpected(Syntax.CloseBraceToken);
          return res;
        }
        function parsePropertyAccessEntityNameExpression() {
          let n: Identifier | PropertyAccessEntityNameExpression = parseJSDocIdentifierName();
          while (parseOptional(Syntax.DotToken)) {
            const n2: PropertyAccessEntityNameExpression = createNode(Syntax.PropertyAccessExpression, n.pos) as PropertyAccessEntityNameExpression;
            n2.expression = n;
            n2.name = parseJSDocIdentifierName();
            n = finishNode(n2);
          }
          return n;
        }
        function parseSimpleTag(start: number, kind: Syntax, tagName: Identifier): JSDocTag {
          const tag = createNode(kind, start);
          tag.tagName = tagName;
          return finishNode(tag);
        }
        function parseThisTag(start: number, tagName: Identifier): JSDocThisTag {
          const tag = createNode(Syntax.JSDocThisTag, start);
          tag.tagName = tagName;
          tag.typeExpression = parseJSDocTypeExpression(true);
          skipWhitespace();
          return finishNode(tag);
        }
        function parseEnumTag(start: number, tagName: Identifier): JSDocEnumTag {
          const n = createNode(Syntax.JSDocEnumTag, start);
          n.tagName = tagName;
          n.typeExpression = parseJSDocTypeExpression(true);
          skipWhitespace();
          return finishNode(n);
        }
        function parseTypedefTag(start: number, tagName: Identifier, indent: number): JSDocTypedefTag {
          const typeExpression = tryParseTypeExpression();
          skipWhitespaceOrAsterisk();
          const n = createNode(Syntax.JSDocTypedefTag, start);
          n.tagName = tagName;
          n.fullName = parseJSDocTypeNameWithNamespace();
          n.name = getJSDocTypeAliasName(n.fullName);
          skipWhitespace();
          n.comment = parseTagComments(indent);
          n.typeExpression = typeExpression;
          let end: number | undefined;
          if (!typeExpression || isObjectOrObjectArrayTypeReference(typeExpression.type)) {
            let child: JSDocTypeTag | JSDocPropertyTag | false;
            let n2: JSDocTypeLiteral | undefined;
            let childTypeTag: JSDocTypeTag | undefined;
            while ((child = tryParse(() => parseChildPropertyTag(indent)))) {
              if (!n2) n2 = createNode(Syntax.JSDocTypeLiteral, start);
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
        function parseJSDocTypeNameWithNamespace(nested?: boolean) {
          const pos = scanner.getTokenPos();
          if (!identifierOrKeyword(tok())) return;
          const typeNameOrNamespaceName = parseJSDocIdentifierName();
          if (parseOptional(Syntax.DotToken)) {
            const n = createNode(Syntax.ModuleDeclaration, pos);
            if (nested) n.flags |= NodeFlags.NestedNamespace;
            n.name = typeNameOrNamespaceName;
            n.body = parseJSDocTypeNameWithNamespace(true);
            return finishNode(n);
          }
          if (nested) typeNameOrNamespaceName.isInJSDocNamespace = true;
          return typeNameOrNamespaceName;
        }
        function parseCallbackTag(start: number, tagName: Identifier, indent: number): JSDocCallbackTag {
          const n = createNode(Syntax.JSDocCallbackTag, start) as JSDocCallbackTag;
          n.tagName = tagName;
          n.fullName = parseJSDocTypeNameWithNamespace();
          n.name = getJSDocTypeAliasName(n.fullName);
          skipWhitespace();
          n.comment = parseTagComments(indent);
          let child: JSDocParameterTag | false;
          const n2 = createNode(Syntax.JSDocSignature, start) as JSDocSignature;
          n2.parameters = [];
          while ((child = tryParse(() => parseChildParameterOrPropertyTag(PropertyLikeParse.CallbackParameter, indent) as JSDocParameterTag))) {
            n2.parameters = append(n2.parameters as MutableNodeArray<JSDocParameterTag>, child);
          }
          const returnTag = tryParse(() => {
            if (parseOptionalJsdoc(Syntax.AtToken)) {
              const tag = parseTag(indent);
              if (tag && tag.kind === Syntax.JSDocReturnTag) return tag as JSDocReturnTag;
            }
            return;
          });
          if (returnTag) n2.type = returnTag;
          n.typeExpression = finishNode(n2);
          return finishNode(n);
        }
        function getJSDocTypeAliasName(fullName: JSDocNamespaceBody | undefined) {
          if (fullName) {
            let rightNode = fullName;
            while (true) {
              if (isIdentifier(rightNode) || !rightNode.body) return isIdentifier(rightNode) ? rightNode : rightNode.name;
              rightNode = rightNode.body;
            }
          }
          return;
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
        function parseChildPropertyTag(indent: number) {
          return parseChildParameterOrPropertyTag(PropertyLikeParse.Property, indent) as JSDocTypeTag | JSDocPropertyTag | false;
        }
        function parseChildParameterOrPropertyTag(target: PropertyLikeParse, indent: number, name?: EntityName): JSDocTypeTag | JSDocPropertyTag | JSDocParameterTag | false {
          let canParseTag = true;
          let seenAsterisk = false;
          while (true) {
            switch (next.tokJSDoc()) {
              case Syntax.AtToken:
                if (canParseTag) {
                  const child = tryParseChildTag(target, indent);
                  if (
                    child &&
                    (child.kind === Syntax.JSDocParameterTag || child.kind === Syntax.JSDocPropertyTag) &&
                    target !== PropertyLikeParse.CallbackParameter &&
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
                if (seenAsterisk) {
                  canParseTag = false;
                }
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
        function tryParseChildTag(target: PropertyLikeParse, indent: number): JSDocTypeTag | JSDocPropertyTag | JSDocParameterTag | false {
          assert(tok() === Syntax.AtToken);
          const start = scanner.getStartPos();
          next.tokJSDoc();
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
          if (!(target & t)) return false;
          return parseParameterOrPropertyTag(start, tagName, target, indent);
        }
        function parseTemplateTag(start: number, tagName: Identifier): JSDocTemplateTag {
          let constraint: JSDocTypeExpression | undefined;
          if (tok() === Syntax.OpenBraceToken) constraint = parseJSDocTypeExpression();
          const typeParameters = [];
          const typeParametersPos = getNodePos();
          do {
            skipWhitespace();
            const n = createNode(Syntax.TypeParameter);
            n.name = parseJSDocIdentifierName(Diagnostics.Unexpected_token_A_type_parameter_name_was_expected_without_curly_braces);
            finishNode(n);
            skipWhitespaceOrAsterisk();
            typeParameters.push(n);
          } while (parseOptionalJsdoc(Syntax.CommaToken));

          const n = createNode(Syntax.JSDocTemplateTag, start);
          n.tagName = tagName;
          n.constraint = constraint;
          n.typeParameters = createNodeArray(typeParameters, typeParametersPos);
          finishNode(n);
          return n;
        }
        function parseOptionalJsdoc(t: JSDocSyntax): boolean {
          if (tok() === t) {
            next.tokJSDoc();
            return true;
          }
          return false;
        }
        function parseJSDocEntityName(): EntityName {
          let entity: EntityName = parseJSDocIdentifierName();
          if (parseOptional(Syntax.OpenBracketToken)) parseExpected(Syntax.CloseBracketToken);
          while (parseOptional(Syntax.DotToken)) {
            const name = parseJSDocIdentifierName();
            if (parseOptional(Syntax.OpenBracketToken)) parseExpected(Syntax.CloseBracketToken);
            entity = createQualifiedName(entity, name);
          }
          return entity;
        }
        function parseJSDocIdentifierName(m?: DiagnosticMessage): Identifier {
          if (!identifierOrKeyword(tok())) return createMissingNode<Identifier>(Syntax.Identifier, !m, m || Diagnostics.Identifier_expected);
          identifierCount++;
          const pos = scanner.getTokenPos();
          const end = scanner.getTextPos();
          const n = createNode(Syntax.Identifier, pos);
          if (tok() !== Syntax.Identifier) n.originalKeywordKind = tok();
          n.escapedText = Scanner.escUnderscores(internIdentifier(scanner.getTokenValue()));
          finishNode(n, end);
          next.tokJSDoc();
          return n;
        }
      }
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
