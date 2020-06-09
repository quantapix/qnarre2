namespace qnr {
  const keywords: MapLike<KeywordSyntaxKind> = {
    abstract: SyntaxKind.AbstractKeyword,
    any: SyntaxKind.AnyKeyword,
    as: SyntaxKind.AsKeyword,
    asserts: SyntaxKind.AssertsKeyword,
    bigint: SyntaxKind.BigIntKeyword,
    boolean: SyntaxKind.BooleanKeyword,
    break: SyntaxKind.BreakKeyword,
    case: SyntaxKind.CaseKeyword,
    catch: SyntaxKind.CatchKeyword,
    class: SyntaxKind.ClassKeyword,
    continue: SyntaxKind.ContinueKeyword,
    const: SyntaxKind.ConstKeyword,
    ['' + 'constructor']: SyntaxKind.ConstructorKeyword,
    debugger: SyntaxKind.DebuggerKeyword,
    declare: SyntaxKind.DeclareKeyword,
    default: SyntaxKind.DefaultKeyword,
    delete: SyntaxKind.DeleteKeyword,
    do: SyntaxKind.DoKeyword,
    else: SyntaxKind.ElseKeyword,
    enum: SyntaxKind.EnumKeyword,
    export: SyntaxKind.ExportKeyword,
    extends: SyntaxKind.ExtendsKeyword,
    false: SyntaxKind.FalseKeyword,
    finally: SyntaxKind.FinallyKeyword,
    for: SyntaxKind.ForKeyword,
    from: SyntaxKind.FromKeyword,
    function: SyntaxKind.FunctionKeyword,
    get: SyntaxKind.GetKeyword,
    if: SyntaxKind.IfKeyword,
    implements: SyntaxKind.ImplementsKeyword,
    import: SyntaxKind.ImportKeyword,
    in: SyntaxKind.InKeyword,
    infer: SyntaxKind.InferKeyword,
    instanceof: SyntaxKind.InstanceOfKeyword,
    interface: SyntaxKind.InterfaceKeyword,
    is: SyntaxKind.IsKeyword,
    keyof: SyntaxKind.KeyOfKeyword,
    let: SyntaxKind.LetKeyword,
    module: SyntaxKind.ModuleKeyword,
    namespace: SyntaxKind.NamespaceKeyword,
    never: SyntaxKind.NeverKeyword,
    new: SyntaxKind.NewKeyword,
    null: SyntaxKind.NullKeyword,
    number: SyntaxKind.NumberKeyword,
    object: SyntaxKind.ObjectKeyword,
    package: SyntaxKind.PackageKeyword,
    private: SyntaxKind.PrivateKeyword,
    protected: SyntaxKind.ProtectedKeyword,
    public: SyntaxKind.PublicKeyword,
    readonly: SyntaxKind.ReadonlyKeyword,
    require: SyntaxKind.RequireKeyword,
    global: SyntaxKind.GlobalKeyword,
    return: SyntaxKind.ReturnKeyword,
    set: SyntaxKind.SetKeyword,
    static: SyntaxKind.StaticKeyword,
    string: SyntaxKind.StringKeyword,
    super: SyntaxKind.SuperKeyword,
    switch: SyntaxKind.SwitchKeyword,
    symbol: SyntaxKind.SymbolKeyword,
    this: SyntaxKind.ThisKeyword,
    throw: SyntaxKind.ThrowKeyword,
    true: SyntaxKind.TrueKeyword,
    try: SyntaxKind.TryKeyword,
    type: SyntaxKind.TypeKeyword,
    typeof: SyntaxKind.TypeOfKeyword,
    undefined: SyntaxKind.UndefinedKeyword,
    unique: SyntaxKind.UniqueKeyword,
    unknown: SyntaxKind.UnknownKeyword,
    var: SyntaxKind.VarKeyword,
    void: SyntaxKind.VoidKeyword,
    while: SyntaxKind.WhileKeyword,
    with: SyntaxKind.WithKeyword,
    yield: SyntaxKind.YieldKeyword,
    async: SyntaxKind.AsyncKeyword,
    await: SyntaxKind.AwaitKeyword,
    of: SyntaxKind.OfKeyword,
  };
  const strToKey = QMap.create(keywords);
  const strToTok = QMap.create<SyntaxKind>({
    ...keywords,
    '{': SyntaxKind.OpenBraceToken,
    '}': SyntaxKind.CloseBraceToken,
    '(': SyntaxKind.OpenParenToken,
    ')': SyntaxKind.CloseParenToken,
    '[': SyntaxKind.OpenBracketToken,
    ']': SyntaxKind.CloseBracketToken,
    '.': SyntaxKind.DotToken,
    '...': SyntaxKind.Dot3Token,
    ';': SyntaxKind.SemicolonToken,
    ',': SyntaxKind.CommaToken,
    '<': SyntaxKind.LessThanToken,
    '>': SyntaxKind.GreaterThanToken,
    '<=': SyntaxKind.LessThanEqualsToken,
    '>=': SyntaxKind.GreaterThanEqualsToken,
    '==': SyntaxKind.Equals2Token,
    '!=': SyntaxKind.ExclamationEqualsToken,
    '===': SyntaxKind.Equals3Token,
    '!==': SyntaxKind.ExclamationEquals2Token,
    '=>': SyntaxKind.EqualsGreaterThanToken,
    '+': SyntaxKind.PlusToken,
    '-': SyntaxKind.MinusToken,
    '**': SyntaxKind.Asterisk2Token,
    '*': SyntaxKind.AsteriskToken,
    '/': SyntaxKind.SlashToken,
    '%': SyntaxKind.PercentToken,
    '++': SyntaxKind.Plus2Token,
    '--': SyntaxKind.Minus2Token,
    '<<': SyntaxKind.LessThan2Token,
    '</': SyntaxKind.LessThanSlashToken,
    '>>': SyntaxKind.GreaterThan2Token,
    '>>>': SyntaxKind.GreaterThan3Token,
    '&': SyntaxKind.AmpersandToken,
    '|': SyntaxKind.BarToken,
    '^': SyntaxKind.CaretToken,
    '!': SyntaxKind.ExclamationToken,
    '~': SyntaxKind.TildeToken,
    '&&': SyntaxKind.Ampersand2Token,
    '||': SyntaxKind.Bar2Token,
    '?': SyntaxKind.QuestionToken,
    '??': SyntaxKind.Question2Token,
    '?.': SyntaxKind.QuestionDotToken,
    ':': SyntaxKind.ColonToken,
    '=': SyntaxKind.EqualsToken,
    '+=': SyntaxKind.PlusEqualsToken,
    '-=': SyntaxKind.MinusEqualsToken,
    '*=': SyntaxKind.AsteriskEqualsToken,
    '**=': SyntaxKind.Asterisk2EqualsToken,
    '/=': SyntaxKind.SlashEqualsToken,
    '%=': SyntaxKind.PercentEqualsToken,
    '<<=': SyntaxKind.LessThan2EqualsToken,
    '>>=': SyntaxKind.GreaterThan2EqualsToken,
    '>>>=': SyntaxKind.GreaterThan3EqualsToken,
    '&=': SyntaxKind.AmpersandEqualsToken,
    '|=': SyntaxKind.BarEqualsToken,
    '^=': SyntaxKind.CaretEqualsToken,
    '@': SyntaxKind.AtToken,
    '`': SyntaxKind.BacktickToken,
  });

  const tokStrings = strToTok.reverse();

  export namespace Token {
    export function toString(t: SyntaxKind) {
      return tokStrings[t];
    }
    export function fromString(s: string) {
      return strToTok.get(s);
    }
    export function identifierOrKeyword(t: SyntaxKind) {
      return t >= SyntaxKind.Identifier;
    }
    export function identifierOrKeywordOrGreaterThan(t: SyntaxKind) {
      return t === SyntaxKind.GreaterThanToken || Token.identifierOrKeyword(t);
    }
  }

  export type ErrorCallback = (m: DiagnosticMessage, length: number) => void;

  export interface Scanner {
    setLanguageVariant(l: LanguageVariant): void;
    setOnError(cb?: ErrorCallback): void;
    getText(): string;
    setText(t?: string, start?: number, length?: number): void;
    getTextPos(): number;
    setTextPos(p: number): void;
    getStartPos(): number;
    getToken(): SyntaxKind;
    getTokenPos(): number;
    getTokenText(): string;
    getTokenValue(): string;
    getTokenFlags(): TokenFlags;
    getDirectives(): CommentDirective[] | undefined;
    clearDirectives(): void;
    hasUnicodeEscape(): boolean;
    hasExtendedEscape(): boolean;
    hasPrecedingLineBreak(): boolean;
    isIdentifier(): boolean;
    isReservedWord(): boolean;
    isUnterminated(): boolean;
    scan(): SyntaxKind;
    scanJsDocToken(): JSDocSyntaxKind;
    scanJsxAttributeValue(): SyntaxKind;
    scanJsxIdentifier(): SyntaxKind;
    scanJsxToken(): JsxTokenSyntaxKind;
    scanRange<T>(start: number, length: number, cb: () => T): T;
    reScanGreaterToken(): SyntaxKind;
    reScanJsxAttributeValue(): SyntaxKind;
    reScanJsxToken(): JsxTokenSyntaxKind;
    reScanLessToken(): SyntaxKind;
    reScanQuestionToken(): SyntaxKind;
    reScanSlashToken(): SyntaxKind;
    reScanHeadOrNoSubstTemplate(): SyntaxKind;
    reScanTemplateToken(tagged: boolean): SyntaxKind;
    tryScan<T>(cb: () => T): T;
    setInJSDocType(inType: boolean): void;
    lookAhead<T>(cb: () => T): T;
  }
  export namespace Scanner {
    export const enum Codes {
      nullCharacter = 0,
      maxAsciiCharacter = 0x7f,

      lineFeed = 0x0a, // \n
      carriageReturn = 0x0d, // \r
      lineSeparator = 0x2028,
      paragraphSeparator = 0x2029,
      nextLine = 0x0085,

      space = 0x0020, // " "
      nonBreakingSpace = 0x00a0, //
      enQuad = 0x2000,
      emQuad = 0x2001,
      enSpace = 0x2002,
      emSpace = 0x2003,
      threePerEmSpace = 0x2004,
      fourPerEmSpace = 0x2005,
      sixPerEmSpace = 0x2006,
      figureSpace = 0x2007,
      punctuationSpace = 0x2008,
      thinSpace = 0x2009,
      hairSpace = 0x200a,
      zeroWidthSpace = 0x200b,
      narrowNoBreakSpace = 0x202f,
      ideographicSpace = 0x3000,
      mathematicalSpace = 0x205f,
      ogham = 0x1680,

      _ = 0x5f,
      $ = 0x24,

      _0 = 0x30,
      _1 = 0x31,
      _2 = 0x32,
      _3 = 0x33,
      _4 = 0x34,
      _5 = 0x35,
      _6 = 0x36,
      _7 = 0x37,
      _8 = 0x38,
      _9 = 0x39,

      a = 0x61,
      b = 0x62,
      c = 0x63,
      d = 0x64,
      e = 0x65,
      f = 0x66,
      g = 0x67,
      h = 0x68,
      i = 0x69,
      j = 0x6a,
      k = 0x6b,
      l = 0x6c,
      m = 0x6d,
      n = 0x6e,
      o = 0x6f,
      p = 0x70,
      q = 0x71,
      r = 0x72,
      s = 0x73,
      t = 0x74,
      u = 0x75,
      v = 0x76,
      w = 0x77,
      x = 0x78,
      y = 0x79,
      z = 0x7a,

      A = 0x41,
      B = 0x42,
      C = 0x43,
      D = 0x44,
      E = 0x45,
      F = 0x46,
      G = 0x47,
      H = 0x48,
      I = 0x49,
      J = 0x4a,
      K = 0x4b,
      L = 0x4c,
      M = 0x4d,
      N = 0x4e,
      O = 0x4f,
      P = 0x50,
      Q = 0x51,
      R = 0x52,
      S = 0x53,
      T = 0x54,
      U = 0x55,
      V = 0x56,
      W = 0x57,
      X = 0x58,
      Y = 0x59,
      Z = 0x5a,

      ampersand = 0x26, // &
      asterisk = 0x2a, // *
      at = 0x40, // @
      backslash = 0x5c, // \
      backtick = 0x60, // `
      bar = 0x7c, // |
      caret = 0x5e, // ^
      closeBrace = 0x7d, // }
      closeBracket = 0x5d, // ]
      closeParen = 0x29, // )
      colon = 0x3a, // :
      comma = 0x2c, // ,
      dot = 0x2e, // .
      doubleQuote = 0x22, // "
      equals = 0x3d, // =
      exclamation = 0x21, // !
      greaterThan = 0x3e, // >
      hash = 0x23, // #
      lessThan = 0x3c, // <
      minus = 0x2d, // -
      openBrace = 0x7b, // {
      openBracket = 0x5b, // [
      openParen = 0x28, // (
      percent = 0x25, // %
      plus = 0x2b, // +
      question = 0x3f, // ?
      semicolon = 0x3b, // ;
      singleQuote = 0x27, // '
      slash = 0x2f, // /
      tilde = 0x7e, // ~

      backspace = 0x08, // \b
      formFeed = 0x0c, // \f
      byteOrderMark = 0xfeff,
      tab = 0x09, // \t
      verticalTab = 0x0b, // \v
    }

    export function isLineBreak(c: number) {
      return c === Codes.lineFeed || c === Codes.carriageReturn || c === Codes.lineSeparator || c === Codes.paragraphSeparator;
    }

    export function isWhiteSpaceSingleLine(c: number) {
      switch (c) {
        case Codes.space:
        case Codes.tab:
        case Codes.verticalTab:
        case Codes.formFeed:
        case Codes.nonBreakingSpace:
        case Codes.nextLine:
        case Codes.ogham:
        case Codes.narrowNoBreakSpace:
        case Codes.mathematicalSpace:
        case Codes.ideographicSpace:
        case Codes.byteOrderMark:
          return true;
        default:
          return c >= Codes.enQuad && c <= Codes.zeroWidthSpace;
      }
    }

    export function isWhiteSpaceLike(c: number) {
      return isWhiteSpaceSingleLine(c) || isLineBreak(c);
    }

    function isDigit(c: number) {
      return c >= Codes._0 && c <= Codes._9;
    }

    function isHexDigit(c: number) {
      return isDigit(c) || (c >= Codes.A && c <= Codes.F) || (c >= Codes.a && c <= Codes.f);
    }

    function isOctalDigit(c: number) {
      return c >= Codes._0 && c <= Codes._7;
    }

    function isCodePoint(c: number) {
      return c <= 0x10ffff;
    }

    export function isDirSeparator(c: number) {
      return c === Codes.slash || c === Codes.backslash;
    }

    export function isVolumeChar(c: number) {
      return (c >= Codes.a && c <= Codes.z) || (c >= Codes.A && c <= Codes.Z);
    }

    export function isReservedName(x: __String) {
      const n = x as string;
      return n.charCodeAt(0) === Codes._ && n.charCodeAt(1) === Codes._ && n.charCodeAt(2) !== Codes._ && n.charCodeAt(2) !== Codes.at && n.charCodeAt(2) !== Codes.hash;
    }

    export function isJSDocLike(s: string, i: number) {
      return s.charCodeAt(i + 1) === Codes.asterisk && s.charCodeAt(i + 2) === Codes.asterisk && s.charCodeAt(i + 3) !== Codes.slash;
    }

    export function escapeUnderscores(s: string): __String {
      return (s.length >= 2 && s.charCodeAt(0) === Codes._ && s.charCodeAt(1) === Codes._ ? '_' + s : s) as __String;
    }

    export function unescapeUnderscores(x: __String): string {
      const s = x as string;
      return s.length >= 3 && s.charCodeAt(0) === Codes._ && s.charCodeAt(1) === Codes._ && s.charCodeAt(2) === Codes._ ? s.substr(1) : s;
    }

    export function urlVolumeEnd(url: string, i: number) {
      const c = url.charCodeAt(i);
      if (c === Codes.colon) return i + 1;
      if (c === Codes.percent && url.charCodeAt(i + 1) === Codes._3) {
        const c2 = url.charCodeAt(i + 2);
        if (c2 === Codes.a || c2 === Codes.A) return i + 3;
      }
      return -1;
    }

    const altDirSeparator = '\\';
    const urlSchemeSeparator = '://';

    export function encodedRootLength(path: string) {
      if (!path) return 0;
      const c = path.charCodeAt(0);
      if (c === Codes.slash || c === Codes.backslash) {
        if (path.charCodeAt(1) !== c) return 1;
        const i = path.indexOf(c === Codes.slash ? dirSeparator : altDirSeparator, 2);
        if (i < 0) return path.length;
        return i + 1;
      }
      if (isVolumeChar(c) && path.charCodeAt(1) === Codes.colon) {
        const c2 = path.charCodeAt(2);
        if (c2 === Codes.slash || c2 === Codes.backslash) return 3;
        if (path.length === 2) return 2;
      }
      const i = path.indexOf(urlSchemeSeparator);
      if (i !== -1) {
        const s = i + urlSchemeSeparator.length;
        const j = path.indexOf(dirSeparator, s);
        if (j !== -1) {
          const scheme = path.slice(0, i);
          const auth = path.slice(s, j);
          if (scheme === 'file' && (auth === '' || auth === 'localhost') && isVolumeChar(path.charCodeAt(j + 1))) {
            const e = urlVolumeEnd(path, j + 2);
            if (e !== -1) {
              if (path.charCodeAt(e) === Codes.slash) return ~(e + 1);
              if (e === path.length) return ~e;
            }
          }
          return ~(j + 1);
        }
        return ~path.length;
      }
      return 0;
    }

    export function extensionFrom(path: string, ext: string, eq: (a: string, b: string) => boolean) {
      if (!startsWith(ext, '.')) ext = '.' + ext;
      if (path.length >= ext.length && path.charCodeAt(path.length - ext.length) === Codes.dot) {
        const e = path.slice(path.length - ext.length);
        if (eq(e, ext)) return e;
      }
      return;
    }

    // prettier-ignore
    const identifierStart = [65, 90, 97, 122, 170, 170, 181, 181, 186, 186, 192, 214, 216, 246, 248, 705, 710, 721, 736, 740, 748, 748, 750, 750, 880, 884, 886, 887, 890, 893, 895, 895, 902, 902, 904, 906, 908, 908, 910, 929, 931, 1013, 1015, 1153, 1162, 1327, 1329, 1366, 1369, 1369, 1376, 1416, 1488, 1514, 1519, 1522, 1568, 1610, 1646, 1647, 1649, 1747, 1749, 1749, 1765, 1766, 1774, 1775, 1786, 1788, 1791, 1791, 1808, 1808, 1810, 1839, 1869, 1957, 1969, 1969, 1994, 2026, 2036, 2037, 2042, 2042, 2048, 2069, 2074, 2074, 2084, 2084, 2088, 2088, 2112, 2136, 2144, 2154, 2208, 2228, 2230, 2237, 2308, 2361, 2365, 2365, 2384, 2384, 2392, 2401, 2417, 2432, 2437, 2444, 2447, 2448, 2451, 2472, 2474, 2480, 2482, 2482, 2486, 2489, 2493, 2493, 2510, 2510, 2524, 2525, 2527, 2529, 2544, 2545, 2556, 2556, 2565, 2570, 2575, 2576, 2579, 2600, 2602, 2608, 2610, 2611, 2613, 2614, 2616, 2617, 2649, 2652, 2654, 2654, 2674, 2676, 2693, 2701, 2703, 2705, 2707, 2728, 2730, 2736, 2738, 2739, 2741, 2745, 2749, 2749, 2768, 2768, 2784, 2785, 2809, 2809, 2821, 2828, 2831, 2832, 2835, 2856, 2858, 2864, 2866, 2867, 2869, 2873, 2877, 2877, 2908, 2909, 2911, 2913, 2929, 2929, 2947, 2947, 2949, 2954, 2958, 2960, 2962, 2965, 2969, 2970, 2972, 2972, 2974, 2975, 2979, 2980, 2984, 2986, 2990, 3001, 3024, 3024, 3077, 3084, 3086, 3088, 3090, 3112, 3114, 3129, 3133, 3133, 3160, 3162, 3168, 3169, 3200, 3200, 3205, 3212, 3214, 3216, 3218, 3240, 3242, 3251, 3253, 3257, 3261, 3261, 3294, 3294, 3296, 3297, 3313, 3314, 3333, 3340, 3342, 3344, 3346, 3386, 3389, 3389, 3406, 3406, 3412, 3414, 3423, 3425, 3450, 3455, 3461, 3478, 3482, 3505, 3507, 3515, 3517, 3517, 3520, 3526, 3585, 3632, 3634, 3635, 3648, 3654, 3713, 3714, 3716, 3716, 3718, 3722, 3724, 3747, 3749, 3749, 3751, 3760, 3762, 3763, 3773, 3773, 3776, 3780, 3782, 3782, 3804, 3807, 3840, 3840, 3904, 3911, 3913, 3948, 3976, 3980, 4096, 4138, 4159, 4159, 4176, 4181, 4186, 4189, 4193, 4193, 4197, 4198, 4206, 4208, 4213, 4225, 4238, 4238, 4256, 4293, 4295, 4295, 4301, 4301, 4304, 4346, 4348, 4680, 4682, 4685, 4688, 4694, 4696, 4696, 4698, 4701, 4704, 4744, 4746, 4749, 4752, 4784, 4786, 4789, 4792, 4798, 4800, 4800, 4802, 4805, 4808, 4822, 4824, 4880, 4882, 4885, 4888, 4954, 4992, 5007, 5024, 5109, 5112, 5117, 5121, 5740, 5743, 5759, 5761, 5786, 5792, 5866, 5870, 5880, 5888, 5900, 5902, 5905, 5920, 5937, 5952, 5969, 5984, 5996, 5998, 6000, 6016, 6067, 6103, 6103, 6108, 6108, 6176, 6264, 6272, 6312, 6314, 6314, 6320, 6389, 6400, 6430, 6480, 6509, 6512, 6516, 6528, 6571, 6576, 6601, 6656, 6678, 6688, 6740, 6823, 6823, 6917, 6963, 6981, 6987, 7043, 7072, 7086, 7087, 7098, 7141, 7168, 7203, 7245, 7247, 7258, 7293, 7296, 7304, 7312, 7354, 7357, 7359, 7401, 7404, 7406, 7411, 7413, 7414, 7418, 7418, 7424, 7615, 7680, 7957, 7960, 7965, 7968, 8005, 8008, 8013, 8016, 8023, 8025, 8025, 8027, 8027, 8029, 8029, 8031, 8061, 8064, 8116, 8118, 8124, 8126, 8126, 8130, 8132, 8134, 8140, 8144, 8147, 8150, 8155, 8160, 8172, 8178, 8180, 8182, 8188, 8305, 8305, 8319, 8319, 8336, 8348, 8450, 8450, 8455, 8455, 8458, 8467, 8469, 8469, 8472, 8477, 8484, 8484, 8486, 8486, 8488, 8488, 8490, 8505, 8508, 8511, 8517, 8521, 8526, 8526, 8544, 8584, 11264, 11310, 11312, 11358, 11360, 11492, 11499, 11502, 11506, 11507, 11520, 11557, 11559, 11559, 11565, 11565, 11568, 11623, 11631, 11631, 11648, 11670, 11680, 11686, 11688, 11694, 11696, 11702, 11704, 11710, 11712, 11718, 11720, 11726, 11728, 11734, 11736, 11742, 12293, 12295, 12321, 12329, 12337, 12341, 12344, 12348, 12353, 12438, 12443, 12447, 12449, 12538, 12540, 12543, 12549, 12591, 12593, 12686, 12704, 12730, 12784, 12799, 13312, 19893, 19968, 40943, 40960, 42124, 42192, 42237, 42240, 42508, 42512, 42527, 42538, 42539, 42560, 42606, 42623, 42653, 42656, 42735, 42775, 42783, 42786, 42888, 42891, 42943, 42946, 42950, 42999, 43009, 43011, 43013, 43015, 43018, 43020, 43042, 43072, 43123, 43138, 43187, 43250, 43255, 43259, 43259, 43261, 43262, 43274, 43301, 43312, 43334, 43360, 43388, 43396, 43442, 43471, 43471, 43488, 43492, 43494, 43503, 43514, 43518, 43520, 43560, 43584, 43586, 43588, 43595, 43616, 43638, 43642, 43642, 43646, 43695, 43697, 43697, 43701, 43702, 43705, 43709, 43712, 43712, 43714, 43714, 43739, 43741, 43744, 43754, 43762, 43764, 43777, 43782, 43785, 43790, 43793, 43798, 43808, 43814, 43816, 43822, 43824, 43866, 43868, 43879, 43888, 44002, 44032, 55203, 55216, 55238, 55243, 55291, 63744, 64109, 64112, 64217, 64256, 64262, 64275, 64279, 64285, 64285, 64287, 64296, 64298, 64310, 64312, 64316, 64318, 64318, 64320, 64321, 64323, 64324, 64326, 64433, 64467, 64829, 64848, 64911, 64914, 64967, 65008, 65019, 65136, 65140, 65142, 65276, 65313, 65338, 65345, 65370, 65382, 65470, 65474, 65479, 65482, 65487, 65490, 65495, 65498, 65500, 65536, 65547, 65549, 65574, 65576, 65594, 65596, 65597, 65599, 65613, 65616, 65629, 65664, 65786, 65856, 65908, 66176, 66204, 66208, 66256, 66304, 66335, 66349, 66378, 66384, 66421, 66432, 66461, 66464, 66499, 66504, 66511, 66513, 66517, 66560, 66717, 66736, 66771, 66776, 66811, 66816, 66855, 66864, 66915, 67072, 67382, 67392, 67413, 67424, 67431, 67584, 67589, 67592, 67592, 67594, 67637, 67639, 67640, 67644, 67644, 67647, 67669, 67680, 67702, 67712, 67742, 67808, 67826, 67828, 67829, 67840, 67861, 67872, 67897, 67968, 68023, 68030, 68031, 68096, 68096, 68112, 68115, 68117, 68119, 68121, 68149, 68192, 68220, 68224, 68252, 68288, 68295, 68297, 68324, 68352, 68405, 68416, 68437, 68448, 68466, 68480, 68497, 68608, 68680, 68736, 68786, 68800, 68850, 68864, 68899, 69376, 69404, 69415, 69415, 69424, 69445, 69600, 69622, 69635, 69687, 69763, 69807, 69840, 69864, 69891, 69926, 69956, 69956, 69968, 70002, 70006, 70006, 70019, 70066, 70081, 70084, 70106, 70106, 70108, 70108, 70144, 70161, 70163, 70187, 70272, 70278, 70280, 70280, 70282, 70285, 70287, 70301, 70303, 70312, 70320, 70366, 70405, 70412, 70415, 70416, 70419, 70440, 70442, 70448, 70450, 70451, 70453, 70457, 70461, 70461, 70480, 70480, 70493, 70497, 70656, 70708, 70727, 70730, 70751, 70751, 70784, 70831, 70852, 70853, 70855, 70855, 71040, 71086, 71128, 71131, 71168, 71215, 71236, 71236, 71296, 71338, 71352, 71352, 71424, 71450, 71680, 71723, 71840, 71903, 71935, 71935, 72096, 72103, 72106, 72144, 72161, 72161, 72163, 72163, 72192, 72192, 72203, 72242, 72250, 72250, 72272, 72272, 72284, 72329, 72349, 72349, 72384, 72440, 72704, 72712, 72714, 72750, 72768, 72768, 72818, 72847, 72960, 72966, 72968, 72969, 72971, 73008, 73030, 73030, 73056, 73061, 73063, 73064, 73066, 73097, 73112, 73112, 73440, 73458, 73728, 74649, 74752, 74862, 74880, 75075, 77824, 78894, 82944, 83526, 92160, 92728, 92736, 92766, 92880, 92909, 92928, 92975, 92992, 92995, 93027, 93047, 93053, 93071, 93760, 93823, 93952, 94026, 94032, 94032, 94099, 94111, 94176, 94177, 94179, 94179, 94208, 100343, 100352, 101106, 110592, 110878, 110928, 110930, 110948, 110951, 110960, 111355, 113664, 113770, 113776, 113788, 113792, 113800, 113808, 113817, 119808, 119892, 119894, 119964, 119966, 119967, 119970, 119970, 119973, 119974, 119977, 119980, 119982, 119993, 119995, 119995, 119997, 120003, 120005, 120069, 120071, 120074, 120077, 120084, 120086, 120092, 120094, 120121, 120123, 120126, 120128, 120132, 120134, 120134, 120138, 120144, 120146, 120485, 120488, 120512, 120514, 120538, 120540, 120570, 120572, 120596, 120598, 120628, 120630, 120654, 120656, 120686, 120688, 120712, 120714, 120744, 120746, 120770, 120772, 120779, 123136, 123180, 123191, 123197, 123214, 123214, 123584, 123627, 124928, 125124, 125184, 125251, 125259, 125259, 126464, 126467, 126469, 126495, 126497, 126498, 126500, 126500, 126503, 126503, 126505, 126514, 126516, 126519, 126521, 126521, 126523, 126523, 126530, 126530, 126535, 126535, 126537, 126537, 126539, 126539, 126541, 126543, 126545, 126546, 126548, 126548, 126551, 126551, 126553, 126553, 126555, 126555, 126557, 126557, 126559, 126559, 126561, 126562, 126564, 126564, 126567, 126570, 126572, 126578, 126580, 126583, 126585, 126588, 126590, 126590, 126592, 126601, 126603, 126619, 126625, 126627, 126629, 126633, 126635, 126651, 131072, 173782, 173824, 177972, 177984, 178205, 178208, 183969, 183984, 191456, 194560, 195101];
    // prettier-ignore
    const identifierPart = [48, 57, 65, 90, 95, 95, 97, 122, 170, 170, 181, 181, 183, 183, 186, 186, 192, 214, 216, 246, 248, 705, 710, 721, 736, 740, 748, 748, 750, 750, 768, 884, 886, 887, 890, 893, 895, 895, 902, 906, 908, 908, 910, 929, 931, 1013, 1015, 1153, 1155, 1159, 1162, 1327, 1329, 1366, 1369, 1369, 1376, 1416, 1425, 1469, 1471, 1471, 1473, 1474, 1476, 1477, 1479, 1479, 1488, 1514, 1519, 1522, 1552, 1562, 1568, 1641, 1646, 1747, 1749, 1756, 1759, 1768, 1770, 1788, 1791, 1791, 1808, 1866, 1869, 1969, 1984, 2037, 2042, 2042, 2045, 2045, 2048, 2093, 2112, 2139, 2144, 2154, 2208, 2228, 2230, 2237, 2259, 2273, 2275, 2403, 2406, 2415, 2417, 2435, 2437, 2444, 2447, 2448, 2451, 2472, 2474, 2480, 2482, 2482, 2486, 2489, 2492, 2500, 2503, 2504, 2507, 2510, 2519, 2519, 2524, 2525, 2527, 2531, 2534, 2545, 2556, 2556, 2558, 2558, 2561, 2563, 2565, 2570, 2575, 2576, 2579, 2600, 2602, 2608, 2610, 2611, 2613, 2614, 2616, 2617, 2620, 2620, 2622, 2626, 2631, 2632, 2635, 2637, 2641, 2641, 2649, 2652, 2654, 2654, 2662, 2677, 2689, 2691, 2693, 2701, 2703, 2705, 2707, 2728, 2730, 2736, 2738, 2739, 2741, 2745, 2748, 2757, 2759, 2761, 2763, 2765, 2768, 2768, 2784, 2787, 2790, 2799, 2809, 2815, 2817, 2819, 2821, 2828, 2831, 2832, 2835, 2856, 2858, 2864, 2866, 2867, 2869, 2873, 2876, 2884, 2887, 2888, 2891, 2893, 2902, 2903, 2908, 2909, 2911, 2915, 2918, 2927, 2929, 2929, 2946, 2947, 2949, 2954, 2958, 2960, 2962, 2965, 2969, 2970, 2972, 2972, 2974, 2975, 2979, 2980, 2984, 2986, 2990, 3001, 3006, 3010, 3014, 3016, 3018, 3021, 3024, 3024, 3031, 3031, 3046, 3055, 3072, 3084, 3086, 3088, 3090, 3112, 3114, 3129, 3133, 3140, 3142, 3144, 3146, 3149, 3157, 3158, 3160, 3162, 3168, 3171, 3174, 3183, 3200, 3203, 3205, 3212, 3214, 3216, 3218, 3240, 3242, 3251, 3253, 3257, 3260, 3268, 3270, 3272, 3274, 3277, 3285, 3286, 3294, 3294, 3296, 3299, 3302, 3311, 3313, 3314, 3328, 3331, 3333, 3340, 3342, 3344, 3346, 3396, 3398, 3400, 3402, 3406, 3412, 3415, 3423, 3427, 3430, 3439, 3450, 3455, 3458, 3459, 3461, 3478, 3482, 3505, 3507, 3515, 3517, 3517, 3520, 3526, 3530, 3530, 3535, 3540, 3542, 3542, 3544, 3551, 3558, 3567, 3570, 3571, 3585, 3642, 3648, 3662, 3664, 3673, 3713, 3714, 3716, 3716, 3718, 3722, 3724, 3747, 3749, 3749, 3751, 3773, 3776, 3780, 3782, 3782, 3784, 3789, 3792, 3801, 3804, 3807, 3840, 3840, 3864, 3865, 3872, 3881, 3893, 3893, 3895, 3895, 3897, 3897, 3902, 3911, 3913, 3948, 3953, 3972, 3974, 3991, 3993, 4028, 4038, 4038, 4096, 4169, 4176, 4253, 4256, 4293, 4295, 4295, 4301, 4301, 4304, 4346, 4348, 4680, 4682, 4685, 4688, 4694, 4696, 4696, 4698, 4701, 4704, 4744, 4746, 4749, 4752, 4784, 4786, 4789, 4792, 4798, 4800, 4800, 4802, 4805, 4808, 4822, 4824, 4880, 4882, 4885, 4888, 4954, 4957, 4959, 4969, 4977, 4992, 5007, 5024, 5109, 5112, 5117, 5121, 5740, 5743, 5759, 5761, 5786, 5792, 5866, 5870, 5880, 5888, 5900, 5902, 5908, 5920, 5940, 5952, 5971, 5984, 5996, 5998, 6000, 6002, 6003, 6016, 6099, 6103, 6103, 6108, 6109, 6112, 6121, 6155, 6157, 6160, 6169, 6176, 6264, 6272, 6314, 6320, 6389, 6400, 6430, 6432, 6443, 6448, 6459, 6470, 6509, 6512, 6516, 6528, 6571, 6576, 6601, 6608, 6618, 6656, 6683, 6688, 6750, 6752, 6780, 6783, 6793, 6800, 6809, 6823, 6823, 6832, 6845, 6912, 6987, 6992, 7001, 7019, 7027, 7040, 7155, 7168, 7223, 7232, 7241, 7245, 7293, 7296, 7304, 7312, 7354, 7357, 7359, 7376, 7378, 7380, 7418, 7424, 7673, 7675, 7957, 7960, 7965, 7968, 8005, 8008, 8013, 8016, 8023, 8025, 8025, 8027, 8027, 8029, 8029, 8031, 8061, 8064, 8116, 8118, 8124, 8126, 8126, 8130, 8132, 8134, 8140, 8144, 8147, 8150, 8155, 8160, 8172, 8178, 8180, 8182, 8188, 8255, 8256, 8276, 8276, 8305, 8305, 8319, 8319, 8336, 8348, 8400, 8412, 8417, 8417, 8421, 8432, 8450, 8450, 8455, 8455, 8458, 8467, 8469, 8469, 8472, 8477, 8484, 8484, 8486, 8486, 8488, 8488, 8490, 8505, 8508, 8511, 8517, 8521, 8526, 8526, 8544, 8584, 11264, 11310, 11312, 11358, 11360, 11492, 11499, 11507, 11520, 11557, 11559, 11559, 11565, 11565, 11568, 11623, 11631, 11631, 11647, 11670, 11680, 11686, 11688, 11694, 11696, 11702, 11704, 11710, 11712, 11718, 11720, 11726, 11728, 11734, 11736, 11742, 11744, 11775, 12293, 12295, 12321, 12335, 12337, 12341, 12344, 12348, 12353, 12438, 12441, 12447, 12449, 12538, 12540, 12543, 12549, 12591, 12593, 12686, 12704, 12730, 12784, 12799, 13312, 19893, 19968, 40943, 40960, 42124, 42192, 42237, 42240, 42508, 42512, 42539, 42560, 42607, 42612, 42621, 42623, 42737, 42775, 42783, 42786, 42888, 42891, 42943, 42946, 42950, 42999, 43047, 43072, 43123, 43136, 43205, 43216, 43225, 43232, 43255, 43259, 43259, 43261, 43309, 43312, 43347, 43360, 43388, 43392, 43456, 43471, 43481, 43488, 43518, 43520, 43574, 43584, 43597, 43600, 43609, 43616, 43638, 43642, 43714, 43739, 43741, 43744, 43759, 43762, 43766, 43777, 43782, 43785, 43790, 43793, 43798, 43808, 43814, 43816, 43822, 43824, 43866, 43868, 43879, 43888, 44010, 44012, 44013, 44016, 44025, 44032, 55203, 55216, 55238, 55243, 55291, 63744, 64109, 64112, 64217, 64256, 64262, 64275, 64279, 64285, 64296, 64298, 64310, 64312, 64316, 64318, 64318, 64320, 64321, 64323, 64324, 64326, 64433, 64467, 64829, 64848, 64911, 64914, 64967, 65008, 65019, 65024, 65039, 65056, 65071, 65075, 65076, 65101, 65103, 65136, 65140, 65142, 65276, 65296, 65305, 65313, 65338, 65343, 65343, 65345, 65370, 65382, 65470, 65474, 65479, 65482, 65487, 65490, 65495, 65498, 65500, 65536, 65547, 65549, 65574, 65576, 65594, 65596, 65597, 65599, 65613, 65616, 65629, 65664, 65786, 65856, 65908, 66045, 66045, 66176, 66204, 66208, 66256, 66272, 66272, 66304, 66335, 66349, 66378, 66384, 66426, 66432, 66461, 66464, 66499, 66504, 66511, 66513, 66517, 66560, 66717, 66720, 66729, 66736, 66771, 66776, 66811, 66816, 66855, 66864, 66915, 67072, 67382, 67392, 67413, 67424, 67431, 67584, 67589, 67592, 67592, 67594, 67637, 67639, 67640, 67644, 67644, 67647, 67669, 67680, 67702, 67712, 67742, 67808, 67826, 67828, 67829, 67840, 67861, 67872, 67897, 67968, 68023, 68030, 68031, 68096, 68099, 68101, 68102, 68108, 68115, 68117, 68119, 68121, 68149, 68152, 68154, 68159, 68159, 68192, 68220, 68224, 68252, 68288, 68295, 68297, 68326, 68352, 68405, 68416, 68437, 68448, 68466, 68480, 68497, 68608, 68680, 68736, 68786, 68800, 68850, 68864, 68903, 68912, 68921, 69376, 69404, 69415, 69415, 69424, 69456, 69600, 69622, 69632, 69702, 69734, 69743, 69759, 69818, 69840, 69864, 69872, 69881, 69888, 69940, 69942, 69951, 69956, 69958, 69968, 70003, 70006, 70006, 70016, 70084, 70089, 70092, 70096, 70106, 70108, 70108, 70144, 70161, 70163, 70199, 70206, 70206, 70272, 70278, 70280, 70280, 70282, 70285, 70287, 70301, 70303, 70312, 70320, 70378, 70384, 70393, 70400, 70403, 70405, 70412, 70415, 70416, 70419, 70440, 70442, 70448, 70450, 70451, 70453, 70457, 70459, 70468, 70471, 70472, 70475, 70477, 70480, 70480, 70487, 70487, 70493, 70499, 70502, 70508, 70512, 70516, 70656, 70730, 70736, 70745, 70750, 70751, 70784, 70853, 70855, 70855, 70864, 70873, 71040, 71093, 71096, 71104, 71128, 71133, 71168, 71232, 71236, 71236, 71248, 71257, 71296, 71352, 71360, 71369, 71424, 71450, 71453, 71467, 71472, 71481, 71680, 71738, 71840, 71913, 71935, 71935, 72096, 72103, 72106, 72151, 72154, 72161, 72163, 72164, 72192, 72254, 72263, 72263, 72272, 72345, 72349, 72349, 72384, 72440, 72704, 72712, 72714, 72758, 72760, 72768, 72784, 72793, 72818, 72847, 72850, 72871, 72873, 72886, 72960, 72966, 72968, 72969, 72971, 73014, 73018, 73018, 73020, 73021, 73023, 73031, 73040, 73049, 73056, 73061, 73063, 73064, 73066, 73102, 73104, 73105, 73107, 73112, 73120, 73129, 73440, 73462, 73728, 74649, 74752, 74862, 74880, 75075, 77824, 78894, 82944, 83526, 92160, 92728, 92736, 92766, 92768, 92777, 92880, 92909, 92912, 92916, 92928, 92982, 92992, 92995, 93008, 93017, 93027, 93047, 93053, 93071, 93760, 93823, 93952, 94026, 94031, 94087, 94095, 94111, 94176, 94177, 94179, 94179, 94208, 100343, 100352, 101106, 110592, 110878, 110928, 110930, 110948, 110951, 110960, 111355, 113664, 113770, 113776, 113788, 113792, 113800, 113808, 113817, 113821, 113822, 119141, 119145, 119149, 119154, 119163, 119170, 119173, 119179, 119210, 119213, 119362, 119364, 119808, 119892, 119894, 119964, 119966, 119967, 119970, 119970, 119973, 119974, 119977, 119980, 119982, 119993, 119995, 119995, 119997, 120003, 120005, 120069, 120071, 120074, 120077, 120084, 120086, 120092, 120094, 120121, 120123, 120126, 120128, 120132, 120134, 120134, 120138, 120144, 120146, 120485, 120488, 120512, 120514, 120538, 120540, 120570, 120572, 120596, 120598, 120628, 120630, 120654, 120656, 120686, 120688, 120712, 120714, 120744, 120746, 120770, 120772, 120779, 120782, 120831, 121344, 121398, 121403, 121452, 121461, 121461, 121476, 121476, 121499, 121503, 121505, 121519, 122880, 122886, 122888, 122904, 122907, 122913, 122915, 122916, 122918, 122922, 123136, 123180, 123184, 123197, 123200, 123209, 123214, 123214, 123584, 123641, 124928, 125124, 125136, 125142, 125184, 125259, 125264, 125273, 126464, 126467, 126469, 126495, 126497, 126498, 126500, 126500, 126503, 126503, 126505, 126514, 126516, 126519, 126521, 126521, 126523, 126523, 126530, 126530, 126535, 126535, 126537, 126537, 126539, 126539, 126541, 126543, 126545, 126546, 126548, 126548, 126551, 126551, 126553, 126553, 126555, 126555, 126557, 126557, 126559, 126559, 126561, 126562, 126564, 126564, 126567, 126570, 126572, 126578, 126580, 126583, 126585, 126588, 126590, 126590, 126592, 126601, 126603, 126619, 126625, 126627, 126629, 126633, 126635, 126651, 131072, 173782, 173824, 177972, 177984, 178205, 178208, 183969, 183984, 191456, 194560, 195101, 917760, 917999];

    const charSize = (c: number) => (c >= 0x10000 ? 2 : 1);

    function isOneOf(c: number, cs: readonly number[]) {
      if (c < cs[0]) return false;
      let lo = 0;
      let hi = map.length;
      let mid: number;
      while (lo + 1 < hi) {
        mid = lo + (hi - lo) / 2;
        mid -= mid % 2;
        if (cs[mid] <= c && c <= cs[mid + 1]) return true;
        if (c < cs[mid]) hi = mid;
        else lo = mid + 2;
      }
      return false;
    }

    export function isIdentifierStart(c: number) {
      return (c >= Codes.A && c <= Codes.Z) || (c >= Codes.a && c <= Codes.z) || c === Codes.$ || c === Codes._ || (c > Codes.maxAsciiCharacter && isOneOf(c, identifierStart));
    }

    function isIdentifierPart(c: number, l?: LanguageVariant) {
      return (
        (c >= Codes.A && c <= Codes.Z) ||
        (c >= Codes.a && c <= Codes.z) ||
        (c >= Codes._0 && c <= Codes._9) ||
        c === Codes.$ ||
        c === Codes._ ||
        (l === LanguageVariant.TX ? c === Codes.minus || c === Codes.colon : false) ||
        (c > Codes.maxAsciiCharacter && isOneOf(c, identifierPart))
      );
    }

    export function isIdentifierText(s: string, l?: LanguageVariant) {
      let c = s.codePointAt(0)!;
      if (!isIdentifierStart(c)) return false;
      for (let i = charSize(c); i < s.length; i += charSize(c)) {
        if (!isIdentifierPart((c = s.codePointAt(i)!), l)) return false;
      }
      return true;
    }

    export function couldStartTrivia(s: string, pos: number) {
      const c = s.charCodeAt(pos);
      switch (c) {
        case Codes.carriageReturn:
        case Codes.lineFeed:
        case Codes.tab:
        case Codes.verticalTab:
        case Codes.formFeed:
        case Codes.space:
        case Codes.slash:
        case Codes.lessThan:
        case Codes.bar:
        case Codes.equals:
        case Codes.greaterThan:
          return true;
        case Codes.hash:
          return pos === 0;
        default:
          return c > Codes.maxAsciiCharacter;
      }
    }

    const markerLength = '<<<<<<<'.length;

    function isMarkerTrivia(s: string, pos: number) {
      assert(pos >= 0);
      if (pos === 0 || isLineBreak(s.charCodeAt(pos - 1))) {
        const c = s.charCodeAt(pos);
        if (pos + markerLength < s.length) {
          for (let i = 0; i < markerLength; i++) {
            if (s.charCodeAt(pos + i) !== c) return false;
          }
          return c === Codes.equals || s.charCodeAt(pos + markerLength) === Codes.space;
        }
      }
      return false;
    }

    function scanMarkerTrivia(s: string, pos: number, e?: (m: DiagnosticMessage, pos?: number, len?: number) => void) {
      if (e) e(Diagnostics.Merge_conflict_marker_encountered, pos, markerLength);
      const c = s.charCodeAt(pos);
      const l = s.length;
      if (c === Codes.lessThan || c === Codes.greaterThan) {
        while (pos < l && !isLineBreak(s.charCodeAt(pos))) {
          pos++;
        }
      } else {
        assert(c === Codes.bar || c === Codes.equals);
        while (pos < l) {
          const c2 = s.charCodeAt(pos);
          if ((c2 === Codes.equals || c2 === Codes.greaterThan) && c2 !== c && isMarkerTrivia(s, pos)) break;
          pos++;
        }
      }
      return pos;
    }

    const shebangRegex = /^#!.*/;

    export function getShebang(s: string) {
      const m = shebangRegex.exec(s);
      return m ? m[0] : undefined;
    }

    function isShebangTrivia(s: string, pos: number) {
      assert(pos === 0);
      return shebangRegex.test(s);
    }

    function scanShebangTrivia(s: string, pos: number) {
      const m = shebangRegex.exec(s);
      return pos + (m ? m[0].length : 0);
    }

    export function skipTrivia(s: string, pos: number, stopAfterLineBreak = false, stopAtComments = false) {
      if (isSynthesized(pos)) return pos;
      while (true) {
        const c = s.charCodeAt(pos);
        switch (c) {
          case Codes.carriageReturn:
            if (s.charCodeAt(pos + 1) === Codes.lineFeed) pos++;
          // falls through
          case Codes.lineFeed:
            pos++;
            if (stopAfterLineBreak) return pos;
            continue;
          case Codes.tab:
          case Codes.verticalTab:
          case Codes.formFeed:
          case Codes.space:
            pos++;
            continue;
          case Codes.slash:
            if (stopAtComments) break;
            if (s.charCodeAt(pos + 1) === Codes.slash) {
              pos += 2;
              while (pos < s.length) {
                if (isLineBreak(s.charCodeAt(pos))) break;
                pos++;
              }
              continue;
            }
            if (s.charCodeAt(pos + 1) === Codes.asterisk) {
              pos += 2;
              while (pos < s.length) {
                if (s.charCodeAt(pos) === Codes.asterisk && s.charCodeAt(pos + 1) === Codes.slash) {
                  pos += 2;
                  break;
                }
                pos++;
              }
              continue;
            }
            break;
          case Codes.lessThan:
          case Codes.bar:
          case Codes.equals:
          case Codes.greaterThan:
            if (isMarkerTrivia(s, pos)) {
              pos = scanMarkerTrivia(s, pos);
              continue;
            }
            break;
          case Codes.hash:
            if (pos === 0 && isShebangTrivia(s, pos)) {
              pos = scanShebangTrivia(s, pos);
              continue;
            }
            break;
          default:
            if (c > Codes.maxAsciiCharacter && isWhiteSpaceLike(c)) {
              pos++;
              continue;
            }
            break;
        }
        return pos;
      }
    }

    export function lineStarts(t: string) {
      const ss = [] as number[];
      let s = 0;
      let pos = 0;
      while (pos < t.length) {
        const c = t.charCodeAt(pos);
        pos++;
        switch (c) {
          case Codes.carriageReturn:
            if (t.charCodeAt(pos) === Codes.lineFeed) pos++;
          // falls through
          case Codes.lineFeed:
            ss.push(s);
            s = pos;
            break;
          default:
            if (c > Codes.maxAsciiCharacter && isLineBreak(c)) {
              ss.push(s);
              s = pos;
            }
            break;
        }
      }
      ss.push(s);
      return ss;
    }

    export function lineOf(starts: readonly number[], pos: number, lowerBound?: number) {
      let l = binarySearch(starts, pos, identity, compareValues, lowerBound);
      if (l < 0) {
        l = ~l - 1;
        assert(l !== -1, 'position before beginning of file');
      }
      return l;
    }

    export function lineAndCharOf(starts: readonly number[], pos: number): LineAndChar {
      const line = lineOf(starts, pos);
      return { line, char: pos - starts[line] };
    }

    function posOf(starts: readonly number[], line: number, char: number, debug?: string, edits?: true) {
      if (line < 0 || line >= starts.length) {
        if (edits) line = line < 0 ? 0 : line >= starts.length ? starts.length - 1 : line;
        else {
          fail(`Bad line number. Line: ${line}, starts.length: ${starts.length} , line map is correct? ${debug !== undefined ? arraysEqual(starts, lineStarts(debug)) : 'unknown'}`);
        }
      }
      const p = starts[line] + char;
      if (edits) return p > starts[line + 1] ? starts[line + 1] : typeof debug === 'string' && p > debug.length ? debug.length : p;
      if (line < starts.length - 1) assert(p < starts[line + 1]);
      else if (debug !== undefined) assert(p <= debug.length);
      return p;
    }

    export class SourceFile implements SourceFileLike {
      text = '';
      lineMap?: number[];
      lineStarts(): readonly number[] {
        return this.lineMap ?? (this.lineMap = lineStarts(this.text));
      }
      lineAndCharOf(pos: number) {
        return lineAndCharOf(this.lineStarts(), pos);
      }
      posOf(line: number, char: number): number;
      posOf(line: number, char: number, edits?: true): number;
      posOf(line: number, char: number, edits?: true): number {
        return posOf(this.lineStarts(), line, char, this.text, edits);
      }
      linesBetween(p1: number, p2: number): number;
      linesBetween(r1: QRange, r2: QRange, comments: boolean): number;
      linesBetween(x1: QRange | number, x2: QRange | number, comments = false) {
        if (typeof x1 === 'number') {
          if (x1 === x2) return 0;
          assert(typeof x2 === 'number');
          const ss = this.lineStarts();
          const min = Math.min(x1, x2);
          const isNegative = min === x2;
          const max = isNegative ? x1 : x2;
          const lower = lineOf(ss, min);
          const upper = lineOf(ss, max, lower);
          return isNegative ? lower - upper : upper - lower;
        }
        const s = this.startPos(x2 as QRange, comments);
        return this.linesBetween(x1.end, s);
      }
      linesBetweenEnds(r1: QRange, r2: QRange) {
        return this.linesBetween(r1.end, r2.end);
      }
      linesToPrevNonWhitespace(pos: number, stop: number, comments = false) {
        const s = skipTrivia(this.text, pos, false, comments);
        const p = this.prevNonWhitespacePos(s, stop);
        return this.linesBetween(p ?? stop, s);
      }
      linesToNextNonWhitespace(pos: number, stop: number, comments = false) {
        const s = skipTrivia(this.text, pos, false, comments);
        return this.linesBetween(pos, Math.min(stop, s));
      }
      startPos(r: QRange, comments = false) {
        return isSynthesized(r.pos) ? -1 : skipTrivia(this.text, r.pos, false, comments);
      }
      prevNonWhitespacePos(pos: number, stop = 0) {
        while (pos-- > stop) {
          if (!isWhiteSpaceLike(this.text.charCodeAt(pos))) return pos;
        }
        return;
      }
      onSameLine(p1: number, p2: number) {
        return this.linesBetween(p1, p2) === 0;
      }
      onSingleLine(r: QRange) {
        return this.onSameLine(r.pos, r.end);
      }
      multiLine(a: NodeArray<Node>) {
        return !this.onSameLine(a.pos, a.end);
      }
      startsOnSameLine(r1: QRange, r2: QRange) {
        return this.onSameLine(this.startPos(r1), this.startPos(r2));
      }
      endsOnSameLine(r1: QRange, r2: QRange) {
        return this.onSameLine(r1.end, r2.end);
      }
      startOnSameLineAsEnd(r1: QRange, r2: QRange) {
        return this.onSameLine(this.startPos(r1), r2.end);
      }
      endOnSameLineAsStart(r1: QRange, r2: QRange) {
        return this.onSameLine(r1.end, this.startPos(r2));
      }
    }

    function iterateCommentRanges<T, U>(
      reduce: boolean,
      text: string,
      pos: number,
      trailing: boolean,
      cb: (pos: number, end: number, k: CommentKind, hasTrailingNewLine: boolean, state?: T, memo?: U) => U,
      state?: T,
      initial?: U
    ): U | undefined {
      let pendingPos!: number;
      let pendingEnd!: number;
      let pendingKind!: CommentKind;
      let pendingHasTrailingNewLine!: boolean;
      let hasPendingCommentRange = false;
      let collecting = trailing;
      let accumulator = initial;
      if (pos === 0) {
        collecting = true;
        const shebang = getShebang(text);
        if (shebang) {
          pos = shebang.length;
        }
      }
      scan: while (pos >= 0 && pos < text.length) {
        const ch = text.charCodeAt(pos);
        switch (ch) {
          case Codes.carriageReturn:
            if (text.charCodeAt(pos + 1) === Codes.lineFeed) pos++;
          // falls through
          case Codes.lineFeed:
            pos++;
            if (trailing) break scan;
            collecting = true;
            if (hasPendingCommentRange) pendingHasTrailingNewLine = true;
            continue;
          case Codes.tab:
          case Codes.verticalTab:
          case Codes.formFeed:
          case Codes.space:
            pos++;
            continue;
          case Codes.slash:
            const nextChar = text.charCodeAt(pos + 1);
            let hasTrailingNewLine = false;
            if (nextChar === Codes.slash || nextChar === Codes.asterisk) {
              const kind = nextChar === Codes.slash ? SyntaxKind.SingleLineCommentTrivia : SyntaxKind.MultiLineCommentTrivia;
              const startPos = pos;
              pos += 2;
              if (nextChar === Codes.slash) {
                while (pos < text.length) {
                  if (isLineBreak(text.charCodeAt(pos))) {
                    hasTrailingNewLine = true;
                    break;
                  }
                  pos++;
                }
              } else {
                while (pos < text.length) {
                  if (text.charCodeAt(pos) === Codes.asterisk && text.charCodeAt(pos + 1) === Codes.slash) {
                    pos += 2;
                    break;
                  }
                  pos++;
                }
              }
              if (collecting) {
                if (hasPendingCommentRange) {
                  accumulator = cb(pendingPos, pendingEnd, pendingKind, pendingHasTrailingNewLine, state, accumulator);
                  if (!reduce && accumulator) {
                    // If we are not reducing and we have a truthy result, return it.
                    return accumulator;
                  }
                }
                pendingPos = startPos;
                pendingEnd = pos;
                pendingKind = kind;
                pendingHasTrailingNewLine = hasTrailingNewLine;
                hasPendingCommentRange = true;
              }
              continue;
            }
            break scan;
          default:
            if (ch > Codes.maxAsciiCharacter && isWhiteSpaceLike(ch)) {
              if (hasPendingCommentRange && isLineBreak(ch)) {
                pendingHasTrailingNewLine = true;
              }
              pos++;
              continue;
            }
            break scan;
        }
      }
      if (hasPendingCommentRange) {
        accumulator = cb(pendingPos, pendingEnd, pendingKind, pendingHasTrailingNewLine, state, accumulator);
      }
      return accumulator;
    }

    export function forEachLeadingCommentRange<U>(text: string, pos: number, cb: (pos: number, end: number, k: CommentKind, hasTrailingNewLine: boolean) => U): U | undefined;
    export function forEachLeadingCommentRange<T, U>(text: string, pos: number, cb: (pos: number, end: number, k: CommentKind, hasTrailingNewLine: boolean, state: T) => U, state: T): U | undefined;
    export function forEachLeadingCommentRange<T, U>(text: string, pos: number, cb: (pos: number, end: number, k: CommentKind, hasTrailingNewLine: boolean, state?: T) => U, state?: T): U | undefined {
      return iterateCommentRanges(/*reduce*/ false, text, pos, /*trailing*/ false, cb, state);
    }

    export function forEachTrailingCommentRange<U>(text: string, pos: number, cb: (pos: number, end: number, k: CommentKind, hasTrailingNewLine: boolean) => U): U | undefined;
    export function forEachTrailingCommentRange<T, U>(text: string, pos: number, cb: (pos: number, end: number, k: CommentKind, hasTrailingNewLine: boolean, state: T) => U, state: T): U | undefined;
    export function forEachTrailingCommentRange<T, U>(
      text: string,
      pos: number,
      cb: (pos: number, end: number, k: CommentKind, hasTrailingNewLine: boolean, state?: T) => U,
      state?: T
    ): U | undefined {
      return iterateCommentRanges(/*reduce*/ false, text, pos, /*trailing*/ true, cb, state);
    }

    function appendCommentRange(pos: number, end: number, kind: CommentKind, hasTrailingNewLine: boolean, _?: any, cs?: CommentRange[]) {
      if (!cs) cs = [];
      cs.push({ kind, pos, end, hasTrailingNewLine });
      return cs;
    }

    export function reduceEachLeadingCommentRange<T, U>(
      text: string,
      pos: number,
      cb: (pos: number, end: number, k: CommentKind, hasTrailingNewLine: boolean, state?: T, memo?: U) => U,
      state?: T,
      initial?: U
    ) {
      return iterateCommentRanges(/*reduce*/ true, text, pos, /*trailing*/ false, cb, state, initial);
    }

    export function getLeadingCommentRanges(text: string, pos: number): CommentRange[] | undefined {
      return reduceEachLeadingCommentRange(text, pos, appendCommentRange, /*state*/ undefined, /*initial*/ undefined);
    }

    export function reduceEachTrailingCommentRange<T, U>(
      text: string,
      pos: number,
      cb: (pos: number, end: number, k: CommentKind, hasTrailingNewLine: boolean, state?: T, memo?: U) => U,
      state?: T,
      initial?: U
    ) {
      return iterateCommentRanges(/*reduce*/ true, text, pos, /*trailing*/ true, cb, state, initial);
    }

    export function getTrailingCommentRanges(text: string, pos: number): CommentRange[] | undefined {
      return reduceEachTrailingCommentRange(text, pos, appendCommentRange, /*state*/ undefined, /*initial*/ undefined);
    }

    const directiveRegExSingleLine = /^\s*\/\/\/?\s*@(ts-expect-error|ts-ignore)/;
    const directiveRegExMultiLine = /^\s*(?:\/|\*)*\s*@(ts-expect-error|ts-ignore)/;

    export function create(skipTrivia = false, lang = LanguageVariant.TS, onError?: ErrorCallback): Scanner {
      let pos: number; // Current position (end position of text of current token)
      let end: number; // end of text
      let text: string;
      let token: SyntaxKind;
      let tokPos: number; // Start position of text of current token
      let startPos: number; // Start position of whitespace before current token
      let tokValue: string;
      let tokFlags: TokenFlags;
      let directives: CommentDirective[] | undefined;
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
        hasUnicodeEscape: () => (tokFlags & TokenFlags.UnicodeEscape) !== 0,
        hasExtendedEscape: () => (tokFlags & TokenFlags.ExtendedEscape) !== 0,
        hasPrecedingLineBreak: () => (tokFlags & TokenFlags.PrecedingLineBreak) !== 0,
        isIdentifier: () => token === SyntaxKind.Identifier || token > SyntaxKind.LastReservedWord,
        isReservedWord: () => token >= SyntaxKind.FirstReservedWord && token <= SyntaxKind.LastReservedWord,
        isUnterminated: () => (tokFlags & TokenFlags.Unterminated) !== 0,
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
        assert(p >= 0);
        pos = p;
        startPos = p;
        tokPos = p;
        token = SyntaxKind.Unknown;
        tokValue = undefined!;
        tokFlags = TokenFlags.None;
      }

      function scan(): SyntaxKind {
        startPos = pos;
        tokFlags = TokenFlags.None;
        let asterisk = false;
        while (true) {
          tokPos = pos;
          if (pos >= end) return (token = SyntaxKind.EndOfFileToken);
          let c = text.codePointAt(pos)!;
          if (c === Codes.hash && pos === 0 && isShebangTrivia(text, pos)) {
            pos = scanShebangTrivia(text, pos);
            if (skipTrivia) continue;
            else return (token = SyntaxKind.ShebangTrivia);
          }
          switch (c) {
            case Codes.lineFeed:
            case Codes.carriageReturn:
              tokFlags |= TokenFlags.PrecedingLineBreak;
              if (skipTrivia) {
                pos++;
                continue;
              } else {
                if (c === Codes.carriageReturn && pos + 1 < end && text.charCodeAt(pos + 1) === Codes.lineFeed) pos += 2;
                else pos++;
                return (token = SyntaxKind.NewLineTrivia);
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
                while (pos < end && isWhiteSpaceSingleLine(text.charCodeAt(pos))) {
                  pos++;
                }
                return (token = SyntaxKind.WhitespaceTrivia);
              }
            case Codes.exclamation:
              if (text.charCodeAt(pos + 1) === Codes.equals) {
                if (text.charCodeAt(pos + 2) === Codes.equals) return (pos += 3), (token = SyntaxKind.ExclamationEquals2Token);
                return (pos += 2), (token = SyntaxKind.ExclamationEqualsToken);
              }
              pos++;
              return (token = SyntaxKind.ExclamationToken);
            case Codes.doubleQuote:
            case Codes.singleQuote:
              tokValue = scanString();
              return (token = SyntaxKind.StringLiteral);
            case Codes.backtick:
              return (token = scanTemplateAndSetTokenValue(/* tagged */ false));
            case Codes.percent:
              if (text.charCodeAt(pos + 1) === Codes.equals) return (pos += 2), (token = SyntaxKind.PercentEqualsToken);
              pos++;
              return (token = SyntaxKind.PercentToken);
            case Codes.ampersand:
              if (text.charCodeAt(pos + 1) === Codes.ampersand) return (pos += 2), (token = SyntaxKind.Ampersand2Token);
              if (text.charCodeAt(pos + 1) === Codes.equals) return (pos += 2), (token = SyntaxKind.AmpersandEqualsToken);
              pos++;
              return (token = SyntaxKind.AmpersandToken);
            case Codes.openParen:
              pos++;
              return (token = SyntaxKind.OpenParenToken);
            case Codes.closeParen:
              pos++;
              return (token = SyntaxKind.CloseParenToken);
            case Codes.asterisk:
              if (text.charCodeAt(pos + 1) === Codes.equals) return (pos += 2), (token = SyntaxKind.AsteriskEqualsToken);
              if (text.charCodeAt(pos + 1) === Codes.asterisk) {
                if (text.charCodeAt(pos + 2) === Codes.equals) return (pos += 3), (token = SyntaxKind.Asterisk2EqualsToken);
                return (pos += 2), (token = SyntaxKind.Asterisk2Token);
              }
              pos++;
              if (inJSDocType && !asterisk && tokFlags & TokenFlags.PrecedingLineBreak) {
                asterisk = true;
                continue;
              }
              return (token = SyntaxKind.AsteriskToken);
            case Codes.plus:
              if (text.charCodeAt(pos + 1) === Codes.plus) return (pos += 2), (token = SyntaxKind.Plus2Token);
              if (text.charCodeAt(pos + 1) === Codes.equals) return (pos += 2), (token = SyntaxKind.PlusEqualsToken);
              pos++;
              return (token = SyntaxKind.PlusToken);
            case Codes.comma:
              pos++;
              return (token = SyntaxKind.CommaToken);
            case Codes.minus:
              if (text.charCodeAt(pos + 1) === Codes.minus) return (pos += 2), (token = SyntaxKind.Minus2Token);
              if (text.charCodeAt(pos + 1) === Codes.equals) return (pos += 2), (token = SyntaxKind.MinusEqualsToken);
              pos++;
              return (token = SyntaxKind.MinusToken);
            case Codes.dot:
              if (isDigit(text.charCodeAt(pos + 1))) {
                tokValue = scanNumber().value;
                return (token = SyntaxKind.NumericLiteral);
              }
              if (text.charCodeAt(pos + 1) === Codes.dot && text.charCodeAt(pos + 2) === Codes.dot) {
                return (pos += 3), (token = SyntaxKind.Dot3Token);
              }
              pos++;
              return (token = SyntaxKind.DotToken);
            case Codes.slash:
              if (text.charCodeAt(pos + 1) === Codes.slash) {
                pos += 2;
                while (pos < end) {
                  if (isLineBreak(text.charCodeAt(pos))) break;
                  pos++;
                }
                directives = appendIfDirective(directives, text.slice(tokPos, pos), directiveRegExSingleLine, tokPos);
                if (skipTrivia) continue;
                else return (token = SyntaxKind.SingleLineCommentTrivia);
              }
              if (text.charCodeAt(pos + 1) === Codes.asterisk) {
                pos += 2;
                if (text.charCodeAt(pos) === Codes.asterisk && text.charCodeAt(pos + 1) !== Codes.slash) {
                  tokFlags |= TokenFlags.PrecedingJSDocComment;
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
                  if (isLineBreak(c2)) {
                    last = pos;
                    tokFlags |= TokenFlags.PrecedingLineBreak;
                  }
                }
                directives = appendIfDirective(directives, text.slice(last, pos), directiveRegExMultiLine, last);
                if (!closed) error(Diagnostics.Asterisk_Slash_expected);
                if (skipTrivia) continue;
                else {
                  if (!closed) tokFlags |= TokenFlags.Unterminated;
                  return (token = SyntaxKind.MultiLineCommentTrivia);
                }
              }
              if (text.charCodeAt(pos + 1) === Codes.equals) return (pos += 2), (token = SyntaxKind.SlashEqualsToken);
              pos++;
              return (token = SyntaxKind.SlashToken);
            case Codes._0:
              if (pos + 2 < end && (text.charCodeAt(pos + 1) === Codes.X || text.charCodeAt(pos + 1) === Codes.x)) {
                pos += 2;
                tokValue = scanHexDigits(1, true, true);
                if (!tokValue) {
                  error(Diagnostics.Hexadecimal_digit_expected);
                  tokValue = '0';
                }
                tokValue = '0x' + tokValue;
                tokFlags |= TokenFlags.HexSpecifier;
                return (token = parseNumber());
              } else if (pos + 2 < end && (text.charCodeAt(pos + 1) === Codes.B || text.charCodeAt(pos + 1) === Codes.b)) {
                pos += 2;
                tokValue = scanBinOrOctDigits(/* base */ 2);
                if (!tokValue) {
                  error(Diagnostics.Binary_digit_expected);
                  tokValue = '0';
                }
                tokValue = '0b' + tokValue;
                tokFlags |= TokenFlags.BinarySpecifier;
                return (token = parseNumber());
              } else if (pos + 2 < end && (text.charCodeAt(pos + 1) === Codes.O || text.charCodeAt(pos + 1) === Codes.o)) {
                pos += 2;
                tokValue = scanBinOrOctDigits(/* base */ 8);
                if (!tokValue) {
                  error(Diagnostics.Octal_digit_expected);
                  tokValue = '0';
                }
                tokValue = '0o' + tokValue;
                tokFlags |= TokenFlags.OctalSpecifier;
                return (token = parseNumber());
              }
              if (pos + 1 < end && isOctalDigit(text.charCodeAt(pos + 1))) {
                tokValue = '' + scanOctDigits();
                tokFlags |= TokenFlags.Octal;
                return (token = SyntaxKind.NumericLiteral);
              }
            // falls through
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
              return (token = SyntaxKind.ColonToken);
            case Codes.semicolon:
              pos++;
              return (token = SyntaxKind.SemicolonToken);
            case Codes.lessThan:
              if (isMarkerTrivia(text, pos)) {
                pos = scanMarkerTrivia(text, pos, error);
                if (skipTrivia) continue;
                else return (token = SyntaxKind.ConflictMarkerTrivia);
              }
              if (text.charCodeAt(pos + 1) === Codes.lessThan) {
                if (text.charCodeAt(pos + 2) === Codes.equals) return (pos += 3), (token = SyntaxKind.LessThan2EqualsToken);
                return (pos += 2), (token = SyntaxKind.LessThan2Token);
              }
              if (text.charCodeAt(pos + 1) === Codes.equals) return (pos += 2), (token = SyntaxKind.LessThanEqualsToken);
              if (lang === LanguageVariant.TX && text.charCodeAt(pos + 1) === Codes.slash && text.charCodeAt(pos + 2) !== Codes.asterisk) {
                return (pos += 2), (token = SyntaxKind.LessThanSlashToken);
              }
              pos++;
              return (token = SyntaxKind.LessThanToken);
            case Codes.equals:
              if (isMarkerTrivia(text, pos)) {
                pos = scanMarkerTrivia(text, pos, error);
                if (skipTrivia) continue;
                else return (token = SyntaxKind.ConflictMarkerTrivia);
              }
              if (text.charCodeAt(pos + 1) === Codes.equals) {
                if (text.charCodeAt(pos + 2) === Codes.equals) return (pos += 3), (token = SyntaxKind.Equals3Token);
                return (pos += 2), (token = SyntaxKind.Equals2Token);
              }
              if (text.charCodeAt(pos + 1) === Codes.greaterThan) return (pos += 2), (token = SyntaxKind.EqualsGreaterThanToken);
              pos++;
              return (token = SyntaxKind.EqualsToken);
            case Codes.greaterThan:
              if (isMarkerTrivia(text, pos)) {
                pos = scanMarkerTrivia(text, pos, error);
                if (skipTrivia) continue;
                else return (token = SyntaxKind.ConflictMarkerTrivia);
              }
              pos++;
              return (token = SyntaxKind.GreaterThanToken);
            case Codes.question:
              pos++;
              if (text.charCodeAt(pos) === Codes.dot && !isDigit(text.charCodeAt(pos + 1))) {
                pos++;
                return (token = SyntaxKind.QuestionDotToken);
              }
              if (text.charCodeAt(pos) === Codes.question) {
                pos++;
                return (token = SyntaxKind.Question2Token);
              }
              return (token = SyntaxKind.QuestionToken);
            case Codes.openBracket:
              pos++;
              return (token = SyntaxKind.OpenBracketToken);
            case Codes.closeBracket:
              pos++;
              return (token = SyntaxKind.CloseBracketToken);
            case Codes.caret:
              if (text.charCodeAt(pos + 1) === Codes.equals) return (pos += 2), (token = SyntaxKind.CaretEqualsToken);
              pos++;
              return (token = SyntaxKind.CaretToken);
            case Codes.openBrace:
              pos++;
              return (token = SyntaxKind.OpenBraceToken);
            case Codes.bar:
              if (isMarkerTrivia(text, pos)) {
                pos = scanMarkerTrivia(text, pos, error);
                if (skipTrivia) continue;
                else return (token = SyntaxKind.ConflictMarkerTrivia);
              }
              if (text.charCodeAt(pos + 1) === Codes.bar) return (pos += 2), (token = SyntaxKind.Bar2Token);
              if (text.charCodeAt(pos + 1) === Codes.equals) return (pos += 2), (token = SyntaxKind.BarEqualsToken);
              pos++;
              return (token = SyntaxKind.BarToken);
            case Codes.closeBrace:
              pos++;
              return (token = SyntaxKind.CloseBraceToken);
            case Codes.tilde:
              pos++;
              return (token = SyntaxKind.TildeToken);
            case Codes.at:
              pos++;
              return (token = SyntaxKind.AtToken);
            case Codes.backslash:
              const c2 = peekExtEscape();
              if (c2 >= 0 && isIdentifierStart(c2)) {
                pos += 3;
                tokFlags |= TokenFlags.ExtendedEscape;
                tokValue = scanExtEscape() + scanIdentifierParts();
                return (token = scanIdentifier());
              }
              const c3 = peekUniEscape();
              if (c3 >= 0 && isIdentifierStart(c3)) {
                pos += 6;
                tokFlags |= TokenFlags.UnicodeEscape;
                tokValue = String.fromCharCode(c3) + scanIdentifierParts();
                return (token = scanIdentifier());
              }
              error(Diagnostics.Invalid_character);
              pos++;
              return (token = SyntaxKind.Unknown);
            case Codes.hash:
              if (pos !== 0 && text[pos + 1] === '!') {
                error(Diagnostics.can_only_be_used_at_the_start_of_a_file);
                pos++;
                return (token = SyntaxKind.Unknown);
              }
              pos++;
              if (isIdentifierStart((c = text.charCodeAt(pos)))) {
                pos++;
                while (pos < end && isIdentifierPart((c = text.charCodeAt(pos)))) pos++;
                tokValue = text.substring(tokPos, pos);
                if (c === Codes.backslash) tokValue += scanIdentifierParts();
              } else {
                tokValue = '#';
                error(Diagnostics.Invalid_character);
              }
              return (token = SyntaxKind.PrivateIdentifier);
            default:
              if (isIdentifierStart(c)) {
                pos += charSize(c);
                while (pos < end && isIdentifierPart((c = text.codePointAt(pos)!))) pos += charSize(c);
                tokValue = text.substring(tokPos, pos);
                if (c === Codes.backslash) tokValue += scanIdentifierParts();
                return (token = scanIdentifier());
              } else if (isWhiteSpaceSingleLine(c)) {
                pos += charSize(c);
                continue;
              } else if (isLineBreak(c)) {
                tokFlags |= TokenFlags.PrecedingLineBreak;
                pos += charSize(c);
                continue;
              }
              error(Diagnostics.Invalid_character);
              pos += charSize(c);
              return (token = SyntaxKind.Unknown);
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

      function reScanGreaterToken(): SyntaxKind {
        if (token === SyntaxKind.GreaterThanToken) {
          if (text.charCodeAt(pos) === Codes.greaterThan) {
            if (text.charCodeAt(pos + 1) === Codes.greaterThan) {
              if (text.charCodeAt(pos + 2) === Codes.equals) return (pos += 3), (token = SyntaxKind.GreaterThan3EqualsToken);
              return (pos += 2), (token = SyntaxKind.GreaterThan3Token);
            }
            if (text.charCodeAt(pos + 1) === Codes.equals) return (pos += 2), (token = SyntaxKind.GreaterThan2EqualsToken);
            pos++;
            return (token = SyntaxKind.GreaterThan2Token);
          }
          if (text.charCodeAt(pos) === Codes.equals) {
            pos++;
            return (token = SyntaxKind.GreaterThanEqualsToken);
          }
        }
        return token;
      }

      function reScanLessToken(): SyntaxKind {
        if (token === SyntaxKind.LessThan2Token) {
          pos = tokPos + 1;
          return (token = SyntaxKind.LessThanToken);
        }
        return token;
      }

      function reScanSlashToken(): SyntaxKind {
        if (token === SyntaxKind.SlashToken || token === SyntaxKind.SlashEqualsToken) {
          let p = tokPos + 1;
          let esc = false;
          let cls = false;
          while (true) {
            if (p >= end) {
              tokFlags |= TokenFlags.Unterminated;
              error(Diagnostics.Unterminated_regular_expression_literal);
              break;
            }
            const c = text.charCodeAt(p);
            if (isLineBreak(c)) {
              tokFlags |= TokenFlags.Unterminated;
              error(Diagnostics.Unterminated_regular_expression_literal);
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
          while (p < end && isIdentifierPart(text.charCodeAt(p))) {
            p++;
          }
          pos = p;
          tokValue = text.substring(tokPos, pos);
          token = SyntaxKind.RegexLiteral;
        }
        return token;
      }

      function reScanQuestionToken(): SyntaxKind {
        assert(token === SyntaxKind.Question2Token, "'reScanQuestionToken' should only be called on a '??'");
        pos = tokPos + 1;
        return (token = SyntaxKind.QuestionToken);
      }

      function reScanTemplateToken(tagged: boolean): SyntaxKind {
        assert(token === SyntaxKind.CloseBraceToken, "'reScanTemplateToken' should only be called on a '}'");
        pos = tokPos;
        return (token = scanTemplateAndSetTokenValue(tagged));
      }

      function reScanHeadOrNoSubstTemplate(): SyntaxKind {
        pos = tokPos;
        return (token = scanTemplateAndSetTokenValue(true));
      }

      function reScanJsxToken(): JsxTokenSyntaxKind {
        pos = tokPos = startPos;
        return (token = scanJsxToken());
      }

      function reScanJsxAttributeValue(): SyntaxKind {
        pos = tokPos = startPos;
        return scanJsxAttributeValue();
      }

      function error(m: DiagnosticMessage): void;
      function error(m: DiagnosticMessage, errPos: number, length: number): void;
      function error(m: DiagnosticMessage, errPos: number = pos, length?: number): void {
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

      function scanIdentifier(): SyntaxKind.Identifier | KeywordSyntaxKind {
        const l = tokValue.length;
        if (l >= 2 && l <= 11) {
          const c = tokValue.charCodeAt(0);
          if (c >= Codes.a && c <= Codes.z) {
            const w = strToKey.get(tokValue);
            if (w !== undefined) return (token = w);
          }
        }
        return (token = SyntaxKind.Identifier);
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
          if (isIdentifierPart(c)) {
            pos += charSize(c);
          } else if (c === Codes.backslash) {
            c = peekExtEscape();
            if (c >= 0 && isIdentifierPart(c)) {
              pos += 3;
              tokFlags |= TokenFlags.ExtendedEscape;
              r += scanExtEscape();
              s = pos;
              continue;
            }
            c = peekUniEscape();
            if (!(c >= 0 && isIdentifierPart(c))) break;
            tokFlags |= TokenFlags.UnicodeEscape;
            r += text.substring(s, pos);
            r += String.fromCodePoint(c);
            pos += 6;
            s = pos;
          } else break;
        }
        r += text.substring(s, pos);
        return r;
      }

      function scanNumber(): { type: SyntaxKind; value: string } {
        const s = pos;
        function scanFragment() {
          let r = '';
          let s = pos;
          let sep = false;
          let prev = false;
          while (true) {
            const c = text.charCodeAt(pos);
            if (c === Codes._) {
              tokFlags |= TokenFlags.ContainsSeparator;
              if (sep) {
                sep = false;
                prev = true;
                r += text.substring(s, pos);
              } else if (prev) error(Diagnostics.Multiple_consecutive_numeric_separators_are_not_permitted, pos, 1);
              else error(Diagnostics.Numeric_separators_are_not_allowed_here, pos, 1);
              pos++;
              s = pos;
              continue;
            }
            if (isDigit(c)) {
              sep = true;
              prev = false;
              pos++;
              continue;
            }
            break;
          }
          if (text.charCodeAt(pos - 1) === Codes._) error(Diagnostics.Numeric_separators_are_not_allowed_here, pos - 1, 1);
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
          tokFlags |= TokenFlags.Scientific;
          if (text.charCodeAt(pos) === Codes.plus || text.charCodeAt(pos) === Codes.minus) pos++;
          const p = pos;
          const f = scanFragment();
          if (!f) error(Diagnostics.Digit_expected);
          else {
            scientific = text.substring(e, p) + f;
            e = pos;
          }
        }
        if (tokFlags & TokenFlags.ContainsSeparator) {
          if (decimal) r += '.' + decimal;
          if (scientific) r += scientific;
        } else r = text.substring(s, e);
        function checkForIdentifier(scientific = false) {
          if (!isIdentifierStart(text.codePointAt(pos)!)) return;
          const p = pos;
          const l = scanIdentifierParts().length;
          if (l === 1 && text[p] === 'n') {
            if (scientific) error(Diagnostics.A_bigint_literal_cannot_use_exponential_notation, s, p - s + 1);
            else error(Diagnostics.A_bigint_literal_must_be_an_integer, s, p - s + 1);
          } else {
            error(Diagnostics.An_identifier_or_keyword_cannot_immediately_follow_a_numeric_literal, p, l);
            pos = p;
          }
        }
        if (decimal !== undefined || tokFlags & TokenFlags.Scientific) {
          checkForIdentifier(decimal === undefined && !!(tokFlags & TokenFlags.Scientific));
          return {
            type: SyntaxKind.NumericLiteral,
            value: '' + +r,
          };
        } else {
          tokValue = r;
          const type = parseNumber();
          checkForIdentifier();
          return { type, value: tokValue };
        }
      }

      function parseNumber(): SyntaxKind {
        if (text.charCodeAt(pos) === Codes.n) {
          tokValue += 'n';
          if (tokFlags & TokenFlags.BinaryOrOctalSpecifier) tokValue = parsePseudoBigInt(tokValue) + 'n';
          pos++;
          return SyntaxKind.BigIntLiteral;
        } else {
          const v =
            tokFlags & TokenFlags.BinarySpecifier
              ? parseInt(tokValue.slice(2), 2) // skip "0b"
              : tokFlags & TokenFlags.OctalSpecifier
              ? parseInt(tokValue.slice(2), 8) // skip "0o"
              : +tokValue;
          tokValue = '' + v;
          return SyntaxKind.NumericLiteral;
        }
      }

      function scanOctDigits(): number {
        const s = pos;
        while (isOctalDigit(text.charCodeAt(pos))) {
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
            tokFlags |= TokenFlags.ContainsSeparator;
            if (sep) {
              sep = false;
              prev = true;
            } else if (prev) error(Diagnostics.Multiple_consecutive_numeric_separators_are_not_permitted, pos, 1);
            else error(Diagnostics.Numeric_separators_are_not_allowed_here, pos, 1);
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
        if (text.charCodeAt(pos - 1) === Codes._) error(Diagnostics.Numeric_separators_are_not_allowed_here, pos - 1, 1);
        return String.fromCharCode(...ds);
      }

      function scanBinOrOctDigits(base: 2 | 8): string {
        let r = '';
        let sep = false;
        let prev = false;
        while (true) {
          const c = text.charCodeAt(pos);
          if (c === Codes._) {
            tokFlags |= TokenFlags.ContainsSeparator;
            if (sep) {
              sep = false;
              prev = true;
            } else if (prev) error(Diagnostics.Multiple_consecutive_numeric_separators_are_not_permitted, pos, 1);
            else error(Diagnostics.Numeric_separators_are_not_allowed_here, pos, 1);
            pos++;
            continue;
          }
          sep = true;
          if (!isDigit(c) || c - Codes._0 >= base) break;
          r += text[pos];
          pos++;
          prev = false;
        }
        if (text.charCodeAt(pos - 1) === Codes._) error(Diagnostics.Numeric_separators_are_not_allowed_here, pos - 1, 1);
        return r;
      }

      function scanExtEscape(): string {
        const vs = scanHexDigits(1);
        const v = vs ? parseInt(vs, 16) : -1;
        let e = false;
        if (v < 0) {
          error(Diagnostics.Hexadecimal_digit_expected);
          e = true;
        } else if (v > 0x10ffff) {
          error(Diagnostics.An_extended_Unicode_escape_value_must_be_between_0x0_and_0x10FFFF_inclusive);
          e = true;
        }
        if (pos >= end) {
          error(Diagnostics.Unexpected_end_of_text);
          e = true;
        } else if (text.charCodeAt(pos) === Codes.closeBrace) {
          pos++;
        } else {
          error(Diagnostics.Unterminated_Unicode_escape_sequence);
          e = true;
        }
        if (e) return '';
        return String.fromCodePoint(v);
      }

      function scanEscSequence(tagged?: boolean): string {
        const s = pos;
        pos++;
        if (pos >= end) {
          error(Diagnostics.Unexpected_end_of_text);
          return '';
        }
        const c = text.charCodeAt(pos);
        pos++;
        function scanHexEscape(count: number) {
          const vs = scanHexDigits(count, false);
          const v = vs ? parseInt(vs, 16) : -1;
          if (v >= 0) return String.fromCharCode(v);
          error(Diagnostics.Hexadecimal_digit_expected);
          return '';
        }
        switch (c) {
          case Codes._0:
            // '\01'
            if (tagged && pos < end && isDigit(text.charCodeAt(pos))) {
              pos++;
              tokFlags |= TokenFlags.ContainsInvalidEscape;
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
                if (p < end && !isHexDigit(text.charCodeAt(p)) && text.charCodeAt(p) !== Codes.openBrace) {
                  pos = p;
                  tokFlags |= TokenFlags.ContainsInvalidEscape;
                  return text.substring(s, pos);
                }
              }
            }
            // '\u{DDDDDDDD}'
            if (pos < end && text.charCodeAt(pos) === Codes.openBrace) {
              pos++;
              // '\u{'
              if (tagged && !isHexDigit(text.charCodeAt(pos))) {
                tokFlags |= TokenFlags.ContainsInvalidEscape;
                return text.substring(s, pos);
              }
              if (tagged) {
                const p = pos;
                const vs = scanHexDigits(1);
                const v = vs ? parseInt(vs, 16) : -1;
                // '\u{Not Code Point' or '\u{CodePoint'
                if (!isCodePoint(v) || text.charCodeAt(pos) !== Codes.closeBrace) {
                  tokFlags |= TokenFlags.ContainsInvalidEscape;
                  return text.substring(s, pos);
                } else pos = p;
              }
              tokFlags |= TokenFlags.ExtendedEscape;
              return scanExtEscape();
            }
            tokFlags |= TokenFlags.UnicodeEscape;
            // '\uDDDD'
            return scanHexEscape(/*numDigits*/ 4);
          case Codes.x:
            if (tagged) {
              if (!isHexDigit(text.charCodeAt(pos))) {
                tokFlags |= TokenFlags.ContainsInvalidEscape;
                return text.substring(s, pos);
              } else if (!isHexDigit(text.charCodeAt(pos + 1))) {
                pos++;
                tokFlags |= TokenFlags.ContainsInvalidEscape;
                return text.substring(s, pos);
              }
            }
            // '\xDD'
            return scanHexEscape(/*numDigits*/ 2);
          case Codes.carriageReturn:
            if (pos < end && text.charCodeAt(pos) === Codes.lineFeed) pos++;
          // falls through
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
            tokFlags |= TokenFlags.Unterminated;
            error(Diagnostics.Unterminated_string_literal);
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
          if (isLineBreak(c) && !jsxAttr) {
            r += text.substring(s, pos);
            tokFlags |= TokenFlags.Unterminated;
            error(Diagnostics.Unterminated_string_literal);
            break;
          }
          pos++;
        }
        return r;
      }

      function scanTemplateAndSetTokenValue(tagged: boolean): SyntaxKind {
        const backtick = text.charCodeAt(pos) === Codes.backtick;
        pos++;
        let s = pos;
        let v = '';
        let r: SyntaxKind;
        while (true) {
          if (pos >= end) {
            v += text.substring(s, pos);
            tokFlags |= TokenFlags.Unterminated;
            error(Diagnostics.Unterminated_template_literal);
            r = backtick ? SyntaxKind.NoSubstitutionLiteral : SyntaxKind.TemplateTail;
            break;
          }
          const c = text.charCodeAt(pos);
          // '`'
          if (c === Codes.backtick) {
            v += text.substring(s, pos);
            pos++;
            r = backtick ? SyntaxKind.NoSubstitutionLiteral : SyntaxKind.TemplateTail;
            break;
          }
          // '${'
          if (c === Codes.$ && pos + 1 < end && text.charCodeAt(pos + 1) === Codes.openBrace) {
            v += text.substring(s, pos);
            pos += 2;
            r = backtick ? SyntaxKind.TemplateHead : SyntaxKind.TemplateMiddle;
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
        assert(r !== undefined);
        tokValue = v;
        return r;
      }

      function appendIfDirective(ds: CommentDirective[] | undefined, t: string, re: RegExp, line: number) {
        const d = directiveFrom(t, re);
        if (d === undefined) return ds;
        return append(ds, { range: { pos: line, end: pos }, type: d });
      }

      function directiveFrom(t: string, re: RegExp) {
        const m = re.exec(t);
        if (!m) return;
        switch (m[1]) {
          case 'ts-expect-error':
            return CommentDirectiveType.ExpectError;
          case 'ts-ignore':
            return CommentDirectiveType.Ignore;
        }
        return;
      }

      function scanJsxToken(): JsxTokenSyntaxKind {
        startPos = tokPos = pos;
        if (pos >= end) return (token = SyntaxKind.EndOfFileToken);
        let c = text.charCodeAt(pos);
        if (c === Codes.lessThan) {
          if (text.charCodeAt(pos + 1) === Codes.slash) {
            pos += 2;
            return (token = SyntaxKind.LessThanSlashToken);
          }
          pos++;
          return (token = SyntaxKind.LessThanToken);
        }
        if (c === Codes.openBrace) {
          pos++;
          return (token = SyntaxKind.OpenBraceToken);
        }
        let first = 0;
        let last = -1;
        while (pos < end) {
          if (!isWhiteSpaceSingleLine(c)) last = pos;
          c = text.charCodeAt(pos);
          if (c === Codes.openBrace) break;
          if (c === Codes.lessThan) {
            if (isMarkerTrivia(text, pos)) {
              pos = scanMarkerTrivia(text, pos, error);
              return (token = SyntaxKind.ConflictMarkerTrivia);
            }
            break;
          }
          if (c === Codes.greaterThan) error(Diagnostics.Unexpected_token_Did_you_mean_or_gt, pos, 1);
          if (c === Codes.closeBrace) error(Diagnostics.Unexpected_token_Did_you_mean_or_rbrace, pos, 1);
          if (last > 0) last++;
          if (isLineBreak(c) && first === 0) first = -1;
          else if (!isWhiteSpaceLike(c)) first = pos;
          pos++;
        }
        const p = last === -1 ? pos : last;
        tokValue = text.substring(startPos, p);
        return first === -1 ? SyntaxKind.JsxTextAllWhiteSpaces : SyntaxKind.JsxText;
      }

      function scanJsxIdentifier(): SyntaxKind {
        if (Token.identifierOrKeyword(token)) {
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

      function scanJsxAttributeValue(): SyntaxKind {
        startPos = pos;
        switch (text.charCodeAt(pos)) {
          case Codes.doubleQuote:
          case Codes.singleQuote:
            tokValue = scanString(true);
            return (token = SyntaxKind.StringLiteral);
          default:
            return scan();
        }
      }

      function scanJsDocToken(): JSDocSyntaxKind {
        startPos = tokPos = pos;
        tokFlags = TokenFlags.None;
        if (pos >= end) return (token = SyntaxKind.EndOfFileToken);
        const c = text.codePointAt(pos)!;
        pos += charSize(c);
        switch (c) {
          case Codes.tab:
          case Codes.verticalTab:
          case Codes.formFeed:
          case Codes.space:
            while (pos < end && isWhiteSpaceSingleLine(text.charCodeAt(pos))) {
              pos++;
            }
            return (token = SyntaxKind.WhitespaceTrivia);
          case Codes.at:
            return (token = SyntaxKind.AtToken);
          case Codes.lineFeed:
          case Codes.carriageReturn:
            tokFlags |= TokenFlags.PrecedingLineBreak;
            return (token = SyntaxKind.NewLineTrivia);
          case Codes.asterisk:
            return (token = SyntaxKind.AsteriskToken);
          case Codes.openBrace:
            return (token = SyntaxKind.OpenBraceToken);
          case Codes.closeBrace:
            return (token = SyntaxKind.CloseBraceToken);
          case Codes.openBracket:
            return (token = SyntaxKind.OpenBracketToken);
          case Codes.closeBracket:
            return (token = SyntaxKind.CloseBracketToken);
          case Codes.lessThan:
            return (token = SyntaxKind.LessThanToken);
          case Codes.greaterThan:
            return (token = SyntaxKind.GreaterThanToken);
          case Codes.equals:
            return (token = SyntaxKind.EqualsToken);
          case Codes.comma:
            return (token = SyntaxKind.CommaToken);
          case Codes.dot:
            return (token = SyntaxKind.DotToken);
          case Codes.backtick:
            return (token = SyntaxKind.BacktickToken);
          case Codes.backslash:
            pos--;
            const c2 = peekExtEscape();
            if (c2 >= 0 && isIdentifierStart(c2)) {
              pos += 3;
              tokFlags |= TokenFlags.ExtendedEscape;
              tokValue = scanExtEscape() + scanIdentifierParts();
              return (token = scanIdentifier());
            }
            const c3 = peekUniEscape();
            if (c3 >= 0 && isIdentifierStart(c3)) {
              pos += 6;
              tokFlags |= TokenFlags.UnicodeEscape;
              tokValue = String.fromCharCode(c3) + scanIdentifierParts();
              return (token = scanIdentifier());
            }
            pos++;
            return (token = SyntaxKind.Unknown);
        }
        if (isIdentifierStart(c)) {
          let c2 = c;
          while ((pos < end && isIdentifierPart((c2 = text.codePointAt(pos)!))) || text.charCodeAt(pos) === Codes.minus) pos += charSize(c2);
          tokValue = text.substring(tokPos, pos);
          if (c2 === Codes.backslash) tokValue += scanIdentifierParts();
          return (token = scanIdentifier());
        }
        return (token = SyntaxKind.Unknown);
      }
    }

    let raw: Scanner | undefined;
    const sentinel: object = {};

    export function process(k: TemplateLiteralToken['kind'], s: string) {
      if (!raw) raw = Scanner.create();
      switch (k) {
        case SyntaxKind.NoSubstitutionLiteral:
          raw.setText('`' + s + '`');
          break;
        case SyntaxKind.TemplateHead:
          raw.setText('`' + s + '${');
          break;
        case SyntaxKind.TemplateMiddle:
          raw.setText('}' + s + '${');
          break;
        case SyntaxKind.TemplateTail:
          raw.setText('}' + s + '`');
          break;
      }
      let t = raw.scan();
      if (t === SyntaxKind.CloseBracketToken) t = raw.reScanTemplateToken(false);
      if (raw.isUnterminated()) {
        raw.setText();
        return sentinel;
      }
      let v: string | undefined;
      switch (t) {
        case SyntaxKind.NoSubstitutionLiteral:
        case SyntaxKind.TemplateHead:
        case SyntaxKind.TemplateMiddle:
        case SyntaxKind.TemplateTail:
          v = raw.getTokenValue();
          break;
      }
      if (raw.scan() !== SyntaxKind.EndOfFileToken) {
        raw.setText();
        return sentinel;
      }
      raw.setText();
      return v;
    }
  }
}
