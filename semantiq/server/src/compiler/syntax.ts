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

  export namespace Context {
    const enum ParsingContext {
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

    export function create() {
      const scanner = Scanner.create(true);
      let currentToken: Syntax;
      let contextFlags: NodeFlags;
      let parsingContext: ParsingContext;

      function setContextFlag(v: boolean, fs: NodeFlags) {
        if (v) contextFlags |= fs;
        else contextFlags &= ~fs;
      }
      function setDisallowInContext(v: boolean) {
        setContextFlag(v, NodeFlags.DisallowInContext);
      }
      function setYieldContext(v: boolean) {
        setContextFlag(v, NodeFlags.YieldContext);
      }
      function setDecoratorContext(v: boolean) {
        setContextFlag(v, NodeFlags.DecoratorContext);
      }
      function setAwaitContext(v: boolean) {
        setContextFlag(v, NodeFlags.AwaitContext);
      }
      function doOutsideOfContext<T>(fs: NodeFlags, f: () => T): T {
        const clear = fs & contextFlags;
        if (clear) {
          setContextFlag(false, clear);
          const r = f();
          setContextFlag(true, clear);
          return r;
        }
        return f();
      }
      function doInsideOfContext<T>(fs: NodeFlags, f: () => T): T {
        const set = fs & ~contextFlags;
        if (set) {
          setContextFlag(true, set);
          const r = f();
          setContextFlag(false, set);
          return r;
        }
        return f();
      }
      function allowInAnd<T>(f: () => T): T {
        return doOutsideOfContext(NodeFlags.DisallowInContext, f);
      }
      function disallowInAnd<T>(f: () => T): T {
        return doInsideOfContext(NodeFlags.DisallowInContext, f);
      }
      function doInYieldContext<T>(f: () => T): T {
        return doInsideOfContext(NodeFlags.YieldContext, f);
      }
      function doInDecoratorContext<T>(f: () => T): T {
        return doInsideOfContext(NodeFlags.DecoratorContext, f);
      }
      function doInAwaitContext<T>(f: () => T): T {
        return doInsideOfContext(NodeFlags.AwaitContext, f);
      }
      function doOutsideOfAwaitContext<T>(f: () => T): T {
        return doOutsideOfContext(NodeFlags.AwaitContext, f);
      }
      function doInYieldAndAwaitContext<T>(f: () => T): T {
        return doInsideOfContext(NodeFlags.YieldContext | NodeFlags.AwaitContext, f);
      }
      function doOutsideOfYieldAndAwaitContext<T>(f: () => T): T {
        return doOutsideOfContext(NodeFlags.YieldContext | NodeFlags.AwaitContext, f);
      }
      function inContext(flags: NodeFlags) {
        return (contextFlags & flags) !== 0;
      }
      function inYieldContext() {
        return inContext(NodeFlags.YieldContext);
      }
      function inDisallowInContext() {
        return inContext(NodeFlags.DisallowInContext);
      }
      function inDecoratorContext() {
        return inContext(NodeFlags.DecoratorContext);
      }
      function inAwaitContext() {
        return inContext(NodeFlags.AwaitContext);
      }
      function token(): Syntax {
        return currentToken;
      }
      function nextToken(): Syntax {
        if (isKeyword(currentToken) && (scanner.hasUnicodeEscape() || scanner.hasExtendedEscape())) {
          parseErrorAt(scanner.getTokenPos(), scanner.getTextPos(), Diagnostics.Keywords_cannot_contain_escape_characters);
        }
        return nextTokenWithoutCheck();
      }
      function nextTokenWithoutCheck(): Syntax {
        return (currentToken = scanner.scan());
      }
      function nextTokenJSDoc(): JSDocSyntax {
        return (currentToken = scanner.scanJsDocToken());
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
      function isIdentifier() {
        if (token() === Syntax.Identifier) return true;
        if (token() === Syntax.YieldKeyword && inYieldContext()) return false;
        if (token() === Syntax.AwaitKeyword && inAwaitContext()) return false;
        return token() > Syntax.LastReservedWord;
      }
      function nextTokenIsOnSameLineAndCanFollowModifier() {
        nextToken();
        if (scanner.hasPrecedingLineBreak()) return false;
        return canFollowModifier();
      }
      function nextTokenCanFollowModifier() {
        switch (token()) {
          case Syntax.ConstKeyword:
            return nextToken() === Syntax.EnumKeyword;
          case Syntax.ExportKeyword:
            nextToken();
            if (token() === Syntax.DefaultKeyword) return lookAhead(nextTokenCanFollowDefaultKeyword);
            if (token() === Syntax.TypeKeyword) return lookAhead(nextTokenCanFollowExportModifier);
            return canFollowExportModifier();
          case Syntax.DefaultKeyword:
            return nextTokenCanFollowDefaultKeyword();
          case Syntax.StaticKeyword:
          case Syntax.GetKeyword:
          case Syntax.SetKeyword:
            nextToken();
            return canFollowModifier();
          default:
            return nextTokenIsOnSameLineAndCanFollowModifier();
        }
      }
      function canFollowExportModifier() {
        return token() !== Syntax.AsteriskToken && token() !== Syntax.AsKeyword && token() !== Syntax.OpenBraceToken && canFollowModifier();
      }
      function nextTokenCanFollowExportModifier() {
        nextToken();
        return canFollowExportModifier();
      }
      function canFollowModifier() {
        return token() === Syntax.OpenBracketToken || token() === Syntax.OpenBraceToken || token() === Syntax.AsteriskToken || token() === Syntax.Dot3Token || isLiteralPropertyName();
      }
      function nextTokenCanFollowDefaultKeyword() {
        nextToken();
        return (
          token() === Syntax.ClassKeyword ||
          token() === Syntax.FunctionKeyword ||
          token() === Syntax.InterfaceKeyword ||
          (token() === Syntax.AbstractKeyword && lookAhead(nextTokenIsClassKeywordOnSameLine)) ||
          (token() === Syntax.AsyncKeyword && lookAhead(nextTokenIsFunctionKeywordOnSameLine))
        );
      }
      function speculate<T>(cb: () => T, isLookAhead: boolean): T {
        const saveToken = currentToken;
        const saveParseDiagnosticsLength = parseDiagnostics.length;
        const saveParseErrorBeforeNextFinishedNode = parseErrorBeforeNextFinishedNode;
        const saveContextFlags = contextFlags;
        const r = isLookAhead ? scanner.lookAhead(cb) : scanner.tryScan(cb);
        assert(saveContextFlags === contextFlags);
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
      function canParseSemicolon() {
        if (token() === Syntax.SemicolonToken) return true;
        return token() === Syntax.CloseBraceToken || token() === Syntax.EndOfFileToken || scanner.hasPrecedingLineBreak();
      }
      function isLiteralPropertyName(): boolean {
        return identifierOrKeyword(token()) || token() === Syntax.StringLiteral || token() === Syntax.NumericLiteral;
      }
      function isListElement(c: ParsingContext, inErrorRecovery: boolean): boolean {
        if (currentNode(c)) return true;
        switch (c) {
          case ParsingContext.SourceElements:
          case ParsingContext.BlockStatements:
          case ParsingContext.SwitchClauseStatements:
            return !(token() === Syntax.SemicolonToken && inErrorRecovery) && isStartOfStatement();
          case ParsingContext.SwitchClauses:
            return token() === Syntax.CaseKeyword || token() === Syntax.DefaultKeyword;
          case ParsingContext.TypeMembers:
            return lookAhead(isTypeMemberStart);
          case ParsingContext.ClassMembers:
            return lookAhead(isClassMemberStart) || (token() === Syntax.SemicolonToken && !inErrorRecovery);
          case ParsingContext.EnumMembers:
            return token() === Syntax.OpenBracketToken || isLiteralPropertyName();
          case ParsingContext.ObjectLiteralMembers:
            switch (token()) {
              case Syntax.OpenBracketToken:
              case Syntax.AsteriskToken:
              case Syntax.Dot3Token:
              case Syntax.DotToken:
                return true;
              default:
                return isLiteralPropertyName();
            }
          case ParsingContext.RestProperties:
            return isLiteralPropertyName();
          case ParsingContext.ObjectBindingElements:
            return token() === Syntax.OpenBracketToken || token() === Syntax.Dot3Token || isLiteralPropertyName();
          case ParsingContext.HeritageClauseElement:
            if (token() === Syntax.OpenBraceToken) return lookAhead(isValidHeritageClauseObjectLiteral);
            if (!inErrorRecovery) return isStartOfLeftHandSideExpression() && !isHeritageClauseExtendsOrImplementsKeyword();
            return isIdentifier() && !isHeritageClauseExtendsOrImplementsKeyword();
          case ParsingContext.VariableDeclarations:
            return isIdentifierOrPrivateIdentifierOrPattern();
          case ParsingContext.ArrayBindingElements:
            return token() === Syntax.CommaToken || token() === Syntax.Dot3Token || isIdentifierOrPrivateIdentifierOrPattern();
          case ParsingContext.TypeParameters:
            return isIdentifier();
          case ParsingContext.ArrayLiteralMembers:
            switch (token()) {
              case Syntax.CommaToken:
              case Syntax.DotToken:
                return true;
            }
          case ParsingContext.ArgumentExpressions:
            return token() === Syntax.Dot3Token || isStartOfExpression();
          case ParsingContext.Parameters:
            return isStartOfParameter(false);
          case ParsingContext.JSDocParameters:
            return isStartOfParameter(true);
          case ParsingContext.TypeArguments:
          case ParsingContext.TupleElementTypes:
            return token() === Syntax.CommaToken || isStartOfType();
          case ParsingContext.HeritageClauses:
            return isHeritageClause();
          case ParsingContext.ImportOrExportSpecifiers:
            return identifierOrKeyword(token());
          case ParsingContext.JsxAttributes:
            return identifierOrKeyword(token()) || token() === Syntax.OpenBraceToken;
          case ParsingContext.JsxChildren:
            return true;
        }
        return fail("Non-exhaustive case in 'isListElement'.");
      }
      function isListTerminator(c: ParsingContext): boolean {
        if (token() === Syntax.EndOfFileToken) return true;
        switch (c) {
          case ParsingContext.BlockStatements:
          case ParsingContext.SwitchClauses:
          case ParsingContext.TypeMembers:
          case ParsingContext.ClassMembers:
          case ParsingContext.EnumMembers:
          case ParsingContext.ObjectLiteralMembers:
          case ParsingContext.ObjectBindingElements:
          case ParsingContext.ImportOrExportSpecifiers:
            return token() === Syntax.CloseBraceToken;
          case ParsingContext.SwitchClauseStatements:
            return token() === Syntax.CloseBraceToken || token() === Syntax.CaseKeyword || token() === Syntax.DefaultKeyword;
          case ParsingContext.HeritageClauseElement:
            return token() === Syntax.OpenBraceToken || token() === Syntax.ExtendsKeyword || token() === Syntax.ImplementsKeyword;
          case ParsingContext.VariableDeclarations:
            return isVariableDeclaratorListTerminator();
          case ParsingContext.TypeParameters:
            return (
              token() === Syntax.GreaterThanToken || token() === Syntax.OpenParenToken || token() === Syntax.OpenBraceToken || token() === Syntax.ExtendsKeyword || token() === Syntax.ImplementsKeyword
            );
          case ParsingContext.ArgumentExpressions:
            return token() === Syntax.CloseParenToken || token() === Syntax.SemicolonToken;
          case ParsingContext.ArrayLiteralMembers:
          case ParsingContext.TupleElementTypes:
          case ParsingContext.ArrayBindingElements:
            return token() === Syntax.CloseBracketToken;
          case ParsingContext.JSDocParameters:
          case ParsingContext.Parameters:
          case ParsingContext.RestProperties:
            return token() === Syntax.CloseParenToken || token() === Syntax.CloseBracketToken /*|| token === Syntax.OpenBraceToken*/;
          case ParsingContext.TypeArguments:
            return token() !== Syntax.CommaToken;
          case ParsingContext.HeritageClauses:
            return token() === Syntax.OpenBraceToken || token() === Syntax.CloseBraceToken;
          case ParsingContext.JsxAttributes:
            return token() === Syntax.GreaterThanToken || token() === Syntax.SlashToken;
          case ParsingContext.JsxChildren:
            return token() === Syntax.LessThanToken && lookAhead(nextTokenIsSlash);
          default:
            return false;
        }
      }
      function isValidHeritageClauseObjectLiteral() {
        assert(token() === Syntax.OpenBraceToken);
        if (nextToken() === Syntax.CloseBraceToken) {
          const t = nextToken();
          return t === Syntax.CommaToken || t === Syntax.OpenBraceToken || t === Syntax.ExtendsKeyword || t === Syntax.ImplementsKeyword;
        }
        return true;
      }
      function nextTokenIsIdentifier() {
        nextToken();
        return isIdentifier();
      }
      function nextTokenIsIdentifierOrKeyword() {
        nextToken();
        return identifierOrKeyword(token());
      }
      function nextTokenIsIdentifierOrKeywordOrGreaterThan() {
        nextToken();
        return identifierOrKeywordOrGreaterThan(token());
      }
      function isHeritageClauseExtendsOrImplementsKeyword(): boolean {
        if (token() === Syntax.ImplementsKeyword || token() === Syntax.ExtendsKeyword) return lookAhead(nextTokenIsStartOfExpression);
        return false;
      }
      function nextTokenIsStartOfExpression() {
        nextToken();
        return isStartOfExpression();
      }
      function nextTokenIsStartOfType() {
        nextToken();
        return isStartOfType();
      }
      function isVariableDeclaratorListTerminator(): boolean {
        if (canParseSemicolon()) return true;
        if (isInOrOfKeyword(token())) return true;
        if (token() === Syntax.EqualsGreaterThanToken) return true;
        return false;
      }
      function isInSomeParsingContext(): boolean {
        for (let c = 0; c < ParsingContext.Count; c++) {
          if (parsingContext & (1 << c)) {
            if (isListElement(c, true) || isListTerminator(c)) return true;
          }
        }
        return false;
      }
      function isReusableParsingContext(c: ParsingContext): boolean {
        switch (c) {
          case ParsingContext.ClassMembers:
          case ParsingContext.SwitchClauses:
          case ParsingContext.SourceElements:
          case ParsingContext.BlockStatements:
          case ParsingContext.SwitchClauseStatements:
          case ParsingContext.EnumMembers:
          case ParsingContext.TypeMembers:
          case ParsingContext.VariableDeclarations:
          case ParsingContext.JSDocParameters:
          case ParsingContext.Parameters:
            return true;
        }
        return false;
      }
      function parsingContextErrors(c: ParsingContext): DiagnosticMessage {
        switch (c) {
          case ParsingContext.SourceElements:
            return Diagnostics.Declaration_or_statement_expected;
          case ParsingContext.BlockStatements:
            return Diagnostics.Declaration_or_statement_expected;
          case ParsingContext.SwitchClauses:
            return Diagnostics.case_or_default_expected;
          case ParsingContext.SwitchClauseStatements:
            return Diagnostics.Statement_expected;
          case ParsingContext.RestProperties:
          case ParsingContext.TypeMembers:
            return Diagnostics.Property_or_signature_expected;
          case ParsingContext.ClassMembers:
            return Diagnostics.Unexpected_token_A_constructor_method_accessor_or_property_was_expected;
          case ParsingContext.EnumMembers:
            return Diagnostics.Enum_member_expected;
          case ParsingContext.HeritageClauseElement:
            return Diagnostics.Expression_expected;
          case ParsingContext.VariableDeclarations:
            return Diagnostics.Variable_declaration_expected;
          case ParsingContext.ObjectBindingElements:
            return Diagnostics.Property_destructuring_pattern_expected;
          case ParsingContext.ArrayBindingElements:
            return Diagnostics.Array_element_destructuring_pattern_expected;
          case ParsingContext.ArgumentExpressions:
            return Diagnostics.Argument_expression_expected;
          case ParsingContext.ObjectLiteralMembers:
            return Diagnostics.Property_assignment_expected;
          case ParsingContext.ArrayLiteralMembers:
            return Diagnostics.Expression_or_comma_expected;
          case ParsingContext.JSDocParameters:
            return Diagnostics.Parameter_declaration_expected;
          case ParsingContext.Parameters:
            return Diagnostics.Parameter_declaration_expected;
          case ParsingContext.TypeParameters:
            return Diagnostics.Type_parameter_declaration_expected;
          case ParsingContext.TypeArguments:
            return Diagnostics.Type_argument_expected;
          case ParsingContext.TupleElementTypes:
            return Diagnostics.Type_expected;
          case ParsingContext.HeritageClauses:
            return Diagnostics.Unexpected_token_expected;
          case ParsingContext.ImportOrExportSpecifiers:
            return Diagnostics.Identifier_expected;
          case ParsingContext.JsxAttributes:
            return Diagnostics.Identifier_expected;
          case ParsingContext.JsxChildren:
            return Diagnostics.Identifier_expected;
          default:
            return undefined!;
        }
      }
      function getExpectedCommaDiagnostic(c: ParsingContext) {
        return c === ParsingContext.EnumMembers ? Diagnostics.An_enum_member_name_must_be_followed_by_a_or : undefined;
      }
      function isStartOfParameter(isJSDocParameter: boolean): boolean {
        return token() === Syntax.Dot3Token || isIdentifierOrPrivateIdentifierOrPattern() || isModifierKind(token()) || token() === Syntax.AtToken || isStartOfType(!isJSDocParameter);
      }
      function isIndexSignature(): boolean {
        return token() === Syntax.OpenBracketToken && lookAhead(isUnambiguouslyIndexSignature);
      }
      function isUnambiguouslyIndexSignature() {
        nextToken();
        if (token() === Syntax.Dot3Token || token() === Syntax.CloseBracketToken) return true;
        if (isModifierKind(token())) {
          nextToken();
          if (isIdentifier()) return true;
        } else if (!isIdentifier()) return false;
        else nextToken();
        if (token() === Syntax.ColonToken || token() === Syntax.CommaToken) return true;
        if (token() !== Syntax.QuestionToken) return false;
        nextToken();
        return token() === Syntax.ColonToken || token() === Syntax.CommaToken || token() === Syntax.CloseBracketToken;
      }
      function isTypeMemberStart(): boolean {
        if (token() === Syntax.OpenParenToken || token() === Syntax.LessThanToken) return true;
        let idToken = false;
        while (isModifierKind(token())) {
          idToken = true;
          nextToken();
        }
        if (token() === Syntax.OpenBracketToken) return true;
        if (isLiteralPropertyName()) {
          idToken = true;
          nextToken();
        }
        if (idToken) {
          return (
            token() === Syntax.OpenParenToken ||
            token() === Syntax.LessThanToken ||
            token() === Syntax.QuestionToken ||
            token() === Syntax.ColonToken ||
            token() === Syntax.CommaToken ||
            canParseSemicolon()
          );
        }
        return false;
      }
      function nextTokenIsOpenParenOrLessThan() {
        nextToken();
        return token() === Syntax.OpenParenToken || token() === Syntax.LessThanToken;
      }

      function nextTokenIsDot() {
        return nextToken() === Syntax.DotToken;
      }

      function nextTokenIsOpenParenOrLessThanOrDot() {
        switch (nextToken()) {
          case Syntax.OpenParenToken:
          case Syntax.LessThanToken:
          case Syntax.DotToken:
            return true;
        }
        return false;
      }
      function isStartOfMappedType() {
        nextToken();
        if (token() === Syntax.PlusToken || token() === Syntax.MinusToken) return nextToken() === Syntax.ReadonlyKeyword;
        if (token() === Syntax.ReadonlyKeyword) nextToken();
        return token() === Syntax.OpenBracketToken && nextTokenIsIdentifier() && nextToken() === Syntax.InKeyword;
      }

      function isNextTokenColonOrQuestionColon() {
        return nextToken() === Syntax.ColonToken || (token() === Syntax.QuestionToken && nextToken() === Syntax.ColonToken);
      }

      function isTupleElementName() {
        if (token() === Syntax.Dot3Token) return identifierOrKeyword(nextToken()) && isNextTokenColonOrQuestionColon();
        return identifierOrKeyword(token()) && isNextTokenColonOrQuestionColon();
      }
      function isStartOfTypeOfImportType() {
        nextToken();
        return token() === Syntax.ImportKeyword;
      }

      function nextTokenIsNumericOrBigIntLiteral() {
        nextToken();
        return token() === Syntax.NumericLiteral || token() === Syntax.BigIntLiteral;
      }
      function isStartOfType(inStartOfParameter?: boolean): boolean {
        switch (token()) {
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
            return !inStartOfParameter && lookAhead(nextTokenIsNumericOrBigIntLiteral);
          case Syntax.OpenParenToken:
            // Only consider '(' the start of a type if followed by ')', '...', an identifier, a modifier,
            // or something that starts a type. We don't want to consider things like '(1)' a type.
            return !inStartOfParameter && lookAhead(isStartOfParenthesizedOrFunctionType);
          default:
            return isIdentifier();
        }
      }

      function isStartOfParenthesizedOrFunctionType() {
        nextToken();
        return token() === Syntax.CloseParenToken || isStartOfParameter(/*isJSDocParameter*/ false) || isStartOfType();
      }
      function isStartOfFunctionType(): boolean {
        if (token() === Syntax.LessThanToken) return true;
        return token() === Syntax.OpenParenToken && lookAhead(isUnambiguouslyStartOfFunctionType);
      }

      function isUnambiguouslyStartOfFunctionType() {
        nextToken();
        if (token() === Syntax.CloseParenToken || token() === Syntax.Dot3Token) return true;
        if (skipParameterStart()) {
          if (token() === Syntax.ColonToken || token() === Syntax.CommaToken || token() === Syntax.QuestionToken || token() === Syntax.EqualsToken) return true;
          if (token() === Syntax.CloseParenToken) {
            nextToken();
            if (token() === Syntax.EqualsGreaterThanToken) return true;
          }
        }
        return false;
      }

      function isStartOfLeftHandSideExpression() {
        switch (token()) {
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
            return lookAhead(nextTokenIsOpenParenOrLessThanOrDot);
          default:
            return isIdentifier();
        }
      }

      function isStartOfExpression() {
        if (isStartOfLeftHandSideExpression()) return true;
        switch (token()) {
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

      function isStartOfExpressionStatement() {
        return token() !== Syntax.OpenBraceToken && token() !== Syntax.FunctionKeyword && token() !== Syntax.ClassKeyword && token() !== Syntax.AtToken && isStartOfExpression();
      }

      function isYieldExpression() {
        if (token() === Syntax.YieldKeyword) {
          if (inYieldContext()) return true;
          return lookAhead(nextTokenIsIdentifierOrKeywordOrLiteralOnSameLine);
        }
        return false;
      }

      function nextTokenIsIdentifierOnSameLine() {
        nextToken();
        return !scanner.hasPrecedingLineBreak() && isIdentifier();
      }

      function isParenthesizedArrowFunctionExpression(): Tristate {
        if (token() === Syntax.OpenParenToken || token() === Syntax.LessThanToken || token() === Syntax.AsyncKeyword) {
          return lookAhead(isParenthesizedArrowFunctionExpressionWorker);
        }
        if (token() === Syntax.EqualsGreaterThanToken) return Tristate.True;
        return Tristate.False;
      }

      function isParenthesizedArrowFunctionExpressionWorker(): Tristate {
        if (token() === Syntax.AsyncKeyword) {
          nextToken();
          if (scanner.hasPrecedingLineBreak()) return Tristate.False;
          if (token() !== Syntax.OpenParenToken && token() !== Syntax.LessThanToken) return Tristate.False;
        }
        const first = token();
        const second = nextToken();
        if (first === Syntax.OpenParenToken) {
          if (second === Syntax.CloseParenToken) {
            const third = nextToken();
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
          switch (nextToken()) {
            case Syntax.ColonToken:
              return Tristate.True;
            case Syntax.QuestionToken:
              nextToken();
              if (token() === Syntax.ColonToken || token() === Syntax.CommaToken || token() === Syntax.EqualsToken || token() === Syntax.CloseParenToken) return Tristate.True;
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
              const third = nextToken();
              if (third === Syntax.ExtendsKeyword) {
                const fourth = nextToken();
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
      function isUnParenthesizedAsyncArrowFunctionWorker(): Tristate {
        // AsyncArrowFunctionExpression:
        //      1) async[no LineTerminator here]AsyncArrowBindingIdentifier[?Yield][no LineTerminator here]=>AsyncConciseBody[?In]
        //      2) CoverCallExpressionAndAsyncArrowHead[?Yield, ?Await][no LineTerminator here]=>AsyncConciseBody[?In]
        if (token() === Syntax.AsyncKeyword) {
          nextToken();
          // If the "async" is followed by "=>" token then it is not a beginning of an async arrow-function
          // but instead a simple arrow-function which will be parsed inside "parseAssignmentExpressionOrHigher"
          if (scanner.hasPrecedingLineBreak() || token() === Syntax.EqualsGreaterThanToken) {
            return Tristate.False;
          }
          // Check for un-parenthesized AsyncArrowFunction
          const expr = parseBinaryExpressionOrHigher(/*precedence*/ 0);
          if (!scanner.hasPrecedingLineBreak() && expr.kind === Syntax.Identifier && token() === Syntax.EqualsGreaterThanToken) {
            return Tristate.True;
          }
        }
        return Tristate.False;
      }
      function isInOrOfKeyword(t: Syntax) {
        return t === Syntax.InKeyword || t === Syntax.OfKeyword;
      }
      function isBinaryOperator() {
        if (inDisallowInContext() && token() === Syntax.InKeyword) return false;

        return getBinaryOperatorPrecedence(token()) > 0;
      }
      function isAwaitExpression() {
        if (token() === Syntax.AwaitKeyword) {
          if (inAwaitContext()) return true;
          return lookAhead(nextTokenIsIdentifierOrKeywordOrLiteralOnSameLine);
        }
        return false;
      }
      function isUpdateExpression() {
        switch (token()) {
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
          // falls through
          default:
            return true;
        }
      }
      function nextTokenIsIdentifierOrKeywordOrOpenBracketOrTemplate() {
        nextToken();
        return identifierOrKeyword(token()) || token() === Syntax.OpenBracketToken || isTemplateStartOfTaggedTemplate();
      }
      function isStartOfOptionalPropertyOrElementAccessChain() {
        return token() === Syntax.QuestionDotToken && lookAhead(nextTokenIsIdentifierOrKeywordOrOpenBracketOrTemplate);
      }
      function isTemplateStartOfTaggedTemplate() {
        return token() === Syntax.NoSubstitutionLiteral || token() === Syntax.TemplateHead;
      }
      function canFollowTypeArgumentsInExpression() {
        switch (token()) {
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
      function nextTokenIsIdentifierOrKeywordOnSameLine() {
        nextToken();
        return identifierOrKeyword(token()) && !scanner.hasPrecedingLineBreak();
      }
      function nextTokenIsClassKeywordOnSameLine() {
        nextToken();
        return token() === Syntax.ClassKeyword && !scanner.hasPrecedingLineBreak();
      }
      function nextTokenIsFunctionKeywordOnSameLine() {
        nextToken();
        return token() === Syntax.FunctionKeyword && !scanner.hasPrecedingLineBreak();
      }
      function nextTokenIsIdentifierOrKeywordOrLiteralOnSameLine() {
        nextToken();
        return (identifierOrKeyword(token()) || token() === Syntax.NumericLiteral || token() === Syntax.BigIntLiteral || token() === Syntax.StringLiteral) && !scanner.hasPrecedingLineBreak();
      }
      function isDeclaration() {
        while (true) {
          switch (token()) {
            case Syntax.VarKeyword:
            case Syntax.LetKeyword:
            case Syntax.ConstKeyword:
            case Syntax.FunctionKeyword:
            case Syntax.ClassKeyword:
            case Syntax.EnumKeyword:
              return true;
            case Syntax.InterfaceKeyword:
            case Syntax.TypeKeyword:
              return nextTokenIsIdentifierOnSameLine();
            case Syntax.ModuleKeyword:
            case Syntax.NamespaceKeyword:
              return nextTokenIsIdentifierOrStringLiteralOnSameLine();
            case Syntax.AbstractKeyword:
            case Syntax.AsyncKeyword:
            case Syntax.DeclareKeyword:
            case Syntax.PrivateKeyword:
            case Syntax.ProtectedKeyword:
            case Syntax.PublicKeyword:
            case Syntax.ReadonlyKeyword:
              nextToken();
              if (scanner.hasPrecedingLineBreak()) return false;

              continue;
            case Syntax.GlobalKeyword:
              nextToken();
              return token() === Syntax.OpenBraceToken || token() === Syntax.Identifier || token() === Syntax.ExportKeyword;
            case Syntax.ImportKeyword:
              nextToken();
              return token() === Syntax.StringLiteral || token() === Syntax.AsteriskToken || token() === Syntax.OpenBraceToken || Token.identifierOrKeyword(token());
            case Syntax.ExportKeyword:
              let currentToken = nextToken();
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
              nextToken();
              continue;
            default:
              return false;
          }
        }
      }
      function isStartOfDeclaration() {
        return lookAhead(isDeclaration);
      }
      function isStartOfStatement() {
        switch (token()) {
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
            return isStartOfDeclaration() || lookAhead(nextTokenIsOpenParenOrLessThanOrDot);
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
            return isStartOfDeclaration() || !lookAhead(nextTokenIsIdentifierOrKeywordOnSameLine);
          default:
            return isStartOfExpression();
        }
      }
      function nextTokenIsIdentifierOrStartOfDestructuring() {
        nextToken();
        return isIdentifier() || token() === Syntax.OpenBraceToken || token() === Syntax.OpenBracketToken;
      }
      function isLetDeclaration() {
        return lookAhead(nextTokenIsIdentifierOrStartOfDestructuring);
      }
      function isDeclareModifier(modifier: Modifier) {
        return modifier.kind === Syntax.DeclareKeyword;
      }
      function nextTokenIsIdentifierOrStringLiteralOnSameLine() {
        nextToken();
        return !scanner.hasPrecedingLineBreak() && (isIdentifier() || token() === Syntax.StringLiteral);
      }
      function isIdentifierOrPrivateIdentifierOrPattern() {
        return token() === Syntax.OpenBraceToken || token() === Syntax.OpenBracketToken || token() === Syntax.PrivateIdentifier || isIdentifier();
      }
      function canFollowContextualOfKeyword() {
        return nextTokenIsIdentifier() && nextToken() === Syntax.CloseParenToken;
      }
      function isClassMemberStart() {
        let idToken: Syntax | undefined;
        if (token() === Syntax.AtToken) return true;
        while (isModifierKind(token())) {
          idToken = token();
          if (isClassMemberModifier(idToken)) return true;
          nextToken();
        }
        if (token() === Syntax.AsteriskToken) return true;
        if (isLiteralPropertyName()) {
          idToken = token();
          nextToken();
        }
        if (token() === Syntax.OpenBracketToken) return true;
        if (idToken !== undefined) {
          if (!isKeyword(idToken) || idToken === Syntax.SetKeyword || idToken === Syntax.GetKeyword) return true;
          switch (token()) {
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
      function isImplemenAtsClause() {
        return token() === Syntax.ImplementsKeyword && lookAhead(nextTokenIsIdentifierOrKeyword);
      }
      function isHeritageClause() {
        return token() === Syntax.ExtendsKeyword || token() === Syntax.ImplementsKeyword;
      }
      function isExternalModuleReference() {
        return token() === Syntax.RequireKeyword && lookAhead(nextTokenIsOpenParen);
      }

      function nextTokenIsOpenParen() {
        return nextToken() === Syntax.OpenParenToken;
      }

      function nextTokenIsSlash() {
        return nextToken() === Syntax.SlashToken;
      }
      function tokenAfterImportDefinitelyProducesImportDeclaration() {
        return token() === Syntax.AsteriskToken || token() === Syntax.OpenBraceToken;
      }

      function tokenAfterImportedIdentifierDefinitelyProducesImportDeclaration() {
        return token() === Syntax.CommaToken || token() === Syntax.FromKeyword;
      }
      function isAnExternalModuleIndicatorNode(n: Node) {
        return hasModifierOfKind(n, Syntax.ExportKeyword) ||
          (n.kind === Syntax.ImportEqualsDeclaration && (<ImportEqualsDeclaration>n).moduleReference.kind === Syntax.ExternalModuleReference) ||
          n.kind === Syntax.ImportDeclaration ||
          n.kind === Syntax.ExportAssignment ||
          n.kind === Syntax.ExportDeclaration
          ? n
          : undefined;
      }
      function hasModifierOfKind(n: Node, kind: Syntax) {
        return some(n.modifiers, (m) => m.kind === kind);
      }
      function isImportMeta(n: Node): boolean {
        return isMetaProperty(n) && n.keywordToken === Syntax.ImportKeyword && n.name.escapedText === 'meta';
      }
      function isObjectOrObjectArrayTypeReference(n: TypeNode): boolean {
        switch (n.kind) {
          case Syntax.ObjectKeyword:
            return true;
          case Syntax.ArrayType:
            return isObjectOrObjectArrayTypeReference((n as ArrayTypeNode).elementType);
          default:
            return TypeReferenceNode.kind(n) && isIdentifier(n.typeName) && n.typeName.escapedText === 'Object' && !n.typeArguments;
        }
      }
      function isNextNonwhitespaceTokenEndOfFile(): boolean {
        while (true) {
          nextTokenJSDoc();
          if (token() === Syntax.EndOfFileToken) return true;

          if (!(token() === Syntax.WhitespaceTrivia || token() === Syntax.NewLineTrivia)) return false;
        }
      }
      function skipWhitespace(): void {
        if (token() === Syntax.WhitespaceTrivia || token() === Syntax.NewLineTrivia) {
          if (lookAhead(isNextNonwhitespaceTokenEndOfFile)) return;
        }
        while (token() === Syntax.WhitespaceTrivia || token() === Syntax.NewLineTrivia) {
          nextTokenJSDoc();
        }
      }
      function skipWhitespaceOrAsterisk(): string {
        if (token() === Syntax.WhitespaceTrivia || token() === Syntax.NewLineTrivia) {
          if (lookAhead(isNextNonwhitespaceTokenEndOfFile)) return '';
        }
        let precedingLineBreak = scanner.hasPrecedingLineBreak();
        let seenLineBreak = false;
        let indentText = '';
        while ((precedingLineBreak && token() === Syntax.AsteriskToken) || token() === Syntax.WhitespaceTrivia || token() === Syntax.NewLineTrivia) {
          indentText += scanner.getTokenText();
          if (token() === Syntax.NewLineTrivia) {
            precedingLineBreak = true;
            seenLineBreak = true;
            indentText = '';
          } else if (token() === Syntax.AsteriskToken) precedingLineBreak = false;
          nextTokenJSDoc();
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
    }
  }
}
