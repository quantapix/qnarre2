import * as qb from './base';
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
export const enum Syntax {
  Unknown,
  EndOfFileToken,
  SingleLineCommentTrivia,
  MultiLineCommentTrivia,
  NewLineTrivia,
  WhitespaceTrivia,
  ShebangTrivia,
  ConflictMarkerTrivia,
  NumericLiteral,
  BigIntLiteral,
  StringLiteral,
  JsxText,
  JsxTextAllWhiteSpaces,
  RegexLiteral,
  NoSubstitutionLiteral,
  TemplateHead,
  TemplateMiddle,
  TemplateTail,
  OpenBraceToken,
  CloseBraceToken,
  OpenParenToken,
  CloseParenToken,
  OpenBracketToken,
  CloseBracketToken,
  DotToken,
  Dot3Token,
  SemicolonToken,
  CommaToken,
  QuestionDotToken,
  LessThanToken,
  LessThanSlashToken,
  GreaterThanToken,
  LessThanEqualsToken,
  GreaterThanEqualsToken,
  Equals2Token,
  ExclamationEqualsToken,
  Equals3Token,
  ExclamationEquals2Token,
  EqualsGreaterThanToken,
  PlusToken,
  MinusToken,
  AsteriskToken,
  Asterisk2Token,
  SlashToken,
  PercentToken,
  Plus2Token,
  Minus2Token,
  LessThan2Token,
  GreaterThan2Token,
  GreaterThan3Token,
  AmpersandToken,
  BarToken,
  CaretToken,
  ExclamationToken,
  TildeToken,
  Ampersand2Token,
  Bar2Token,
  QuestionToken,
  ColonToken,
  AtToken,
  Question2Token,
  BacktickToken,
  EqualsToken,
  PlusEqualsToken,
  MinusEqualsToken,
  AsteriskEqualsToken,
  Asterisk2EqualsToken,
  SlashEqualsToken,
  PercentEqualsToken,
  LessThan2EqualsToken,
  GreaterThan2EqualsToken,
  GreaterThan3EqualsToken,
  AmpersandEqualsToken,
  BarEqualsToken,
  CaretEqualsToken,
  Identifier,
  PrivateIdentifier,
  BreakKeyword,
  CaseKeyword,
  CatchKeyword,
  ClassKeyword,
  ConstKeyword,
  ContinueKeyword,
  DebuggerKeyword,
  DefaultKeyword,
  DeleteKeyword,
  DoKeyword,
  ElseKeyword,
  EnumKeyword,
  ExportKeyword,
  ExtendsKeyword,
  FalseKeyword,
  FinallyKeyword,
  ForKeyword,
  FunctionKeyword,
  IfKeyword,
  ImportKeyword,
  InKeyword,
  InstanceOfKeyword,
  NewKeyword,
  NullKeyword,
  ReturnKeyword,
  SuperKeyword,
  SwitchKeyword,
  ThisKeyword,
  ThrowKeyword,
  TrueKeyword,
  TryKeyword,
  TypeOfKeyword,
  VarKeyword,
  VoidKeyword,
  WhileKeyword,
  WithKeyword,
  ImplementsKeyword,
  InterfaceKeyword,
  LetKeyword,
  PackageKeyword,
  PrivateKeyword,
  ProtectedKeyword,
  PublicKeyword,
  StaticKeyword,
  YieldKeyword,
  AbstractKeyword,
  AsKeyword,
  AssertsKeyword,
  AnyKeyword,
  AsyncKeyword,
  AwaitKeyword,
  BooleanKeyword,
  ConstructorKeyword,
  DeclareKeyword,
  GetKeyword,
  InferKeyword,
  IsKeyword,
  KeyOfKeyword,
  ModuleKeyword,
  NamespaceKeyword,
  NeverKeyword,
  ReadonlyKeyword,
  RequireKeyword,
  NumberKeyword,
  ObjectKeyword,
  SetKeyword,
  StringKeyword,
  SymbolKeyword,
  TypeKeyword,
  UndefinedKeyword,
  UniqueKeyword,
  UnknownKeyword,
  FromKeyword,
  GlobalKeyword,
  BigIntKeyword,
  OfKeyword, // LastKeyword and LastToken and LastContextualKeyword
  QualifiedName,
  ComputedPropertyName,
  TypeParameter,
  Parameter,
  Decorator,
  PropertySignature,
  PropertyDeclaration,
  MethodSignature,
  MethodDeclaration,
  Constructor,
  GetAccessor,
  SetAccessor,
  CallSignature,
  ConstructSignature,
  IndexSignature,
  TypePredicate,
  TypeReference,
  FunctionType,
  ConstructorType,
  TypeQuery,
  TypeLiteral,
  ArrayType,
  TupleType,
  OptionalType,
  RestType,
  UnionType,
  IntersectionType,
  ConditionalType,
  InferType,
  ParenthesizedType,
  ThisType,
  TypeOperator,
  IndexedAccessType,
  MappedType,
  LiteralType,
  NamedTupleMember,
  ImportType,
  ObjectBindingPattern,
  ArrayBindingPattern,
  BindingElement,
  ArrayLiteralExpression,
  ObjectLiteralExpression,
  PropertyAccessExpression,
  ElementAccessExpression,
  CallExpression,
  NewExpression,
  TaggedTemplateExpression,
  TypeAssertionExpression,
  ParenthesizedExpression,
  FunctionExpression,
  ArrowFunction,
  DeleteExpression,
  TypeOfExpression,
  VoidExpression,
  AwaitExpression,
  PrefixUnaryExpression,
  PostfixUnaryExpression,
  BinaryExpression,
  ConditionalExpression,
  TemplateExpression,
  YieldExpression,
  SpreadElement,
  ClassExpression,
  OmittedExpression,
  ExpressionWithTypeArguments,
  AsExpression,
  NonNullExpression,
  MetaProperty,
  SyntheticExpression,
  TemplateSpan,
  SemicolonClassElement,
  Block,
  EmptyStatement,
  VariableStatement,
  ExpressionStatement,
  IfStatement,
  DoStatement,
  WhileStatement,
  ForStatement,
  ForInStatement,
  ForOfStatement,
  ContinueStatement,
  BreakStatement,
  ReturnStatement,
  WithStatement,
  SwitchStatement,
  LabeledStatement,
  ThrowStatement,
  TryStatement,
  DebuggerStatement,
  VariableDeclaration,
  VariableDeclarationList,
  FunctionDeclaration,
  ClassDeclaration,
  InterfaceDeclaration,
  TypeAliasDeclaration,
  EnumDeclaration,
  ModuleDeclaration,
  ModuleBlock,
  CaseBlock,
  NamespaceExportDeclaration,
  ImportEqualsDeclaration,
  ImportDeclaration,
  ImportClause,
  NamespaceImport,
  NamedImports,
  ImportSpecifier,
  ExportAssignment,
  ExportDeclaration,
  NamedExports,
  NamespaceExport,
  ExportSpecifier,
  MissingDeclaration,
  ExternalModuleReference,
  JsxElement,
  JsxSelfClosingElement,
  JsxOpeningElement,
  JsxClosingElement,
  JsxFragment,
  JsxOpeningFragment,
  JsxClosingFragment,
  JsxAttribute,
  JsxAttributes,
  JsxSpreadAttribute,
  JsxExpression,
  CaseClause,
  DefaultClause,
  HeritageClause,
  CatchClause,
  PropertyAssignment,
  ShorthandPropertyAssignment,
  SpreadAssignment,
  EnumMember,
  UnparsedPrologue,
  UnparsedPrepend,
  UnparsedText,
  UnparsedInternalText,
  UnparsedSyntheticReference,
  SourceFile,
  Bundle,
  UnparsedSource,
  InputFiles,
  JSDocTypeExpression,
  JSDocAllType,
  JSDocUnknownType,
  JSDocNullableType,
  JSDocNonNullableType,
  JSDocOptionalType,
  JSDocFunctionType,
  JSDocVariadicType,
  JSDocNamepathType,
  JSDocComment,
  JSDocTypeLiteral,
  JSDocSignature,
  JSDocTag,
  JSDocAugmentsTag,
  JSDocImplementsTag,
  JSDocAuthorTag,
  JSDocClassTag,
  JSDocPublicTag,
  JSDocPrivateTag,
  JSDocProtectedTag,
  JSDocReadonlyTag,
  JSDocCallbackTag,
  JSDocEnumTag,
  JSDocParameterTag,
  JSDocReturnTag,
  JSDocThisTag,
  JSDocTypeTag,
  JSDocTemplateTag,
  JSDocTypedefTag,
  JSDocPropertyTag,
  SyntaxList,
  NotEmittedStatement,
  PartiallyEmittedExpression,
  CommaListExpression,
  MergeDeclarationMarker,
  EndOfDeclarationMarker,
  SyntheticReferenceExpression,
  Count,
  FirstAssignment = EqualsToken,
  LastAssignment = CaretEqualsToken,
  FirstCompoundAssignment = PlusEqualsToken,
  LastCompoundAssignment = CaretEqualsToken,
  FirstReservedWord = BreakKeyword,
  LastReservedWord = WithKeyword,
  FirstKeyword = BreakKeyword,
  LastKeyword = OfKeyword,
  FirstFutureReservedWord = ImplementsKeyword,
  LastFutureReservedWord = YieldKeyword,
  FirstTypeNode = TypePredicate,
  LastTypeNode = ImportType,
  FirstPunctuation = OpenBraceToken,
  LastPunctuation = CaretEqualsToken,
  FirstToken = Unknown,
  LastToken = LastKeyword,
  FirstTriviaToken = SingleLineCommentTrivia,
  LastTriviaToken = ConflictMarkerTrivia,
  FirstLiteralToken = NumericLiteral,
  LastLiteralToken = NoSubstitutionLiteral,
  FirstTemplateToken = NoSubstitutionLiteral,
  LastTemplateToken = TemplateTail,
  FirstBinaryOperator = LessThanToken,
  LastBinaryOperator = CaretEqualsToken,
  FirstStatement = VariableStatement,
  LastStatement = DebuggerStatement,
  FirstNode = QualifiedName,
  FirstJSDocNode = JSDocTypeExpression,
  LastJSDocNode = JSDocPropertyTag,
  FirstJSDocTagNode = JSDocTag,
  LastJSDocTagNode = JSDocPropertyTag,
  FirstContextualKeyword = AbstractKeyword,
  LastContextualKeyword = OfKeyword,
}
export const enum Associativity {
  Left,
  Right,
}
export const enum ModifierFlags {
  None = 0,
  Export = 1 << 0,
  Ambient = 1 << 1,
  Public = 1 << 2,
  Private = 1 << 3,
  Protected = 1 << 4,
  Static = 1 << 5,
  Readonly = 1 << 6,
  Abstract = 1 << 7,
  Async = 1 << 8,
  Default = 1 << 9,
  Const = 1 << 11,
  HasComputedJSDocModifiers = 1 << 12,
  HasComputedFlags = 1 << 29,
  AccessibilityModifier = Public | Private | Protected,
  ParameterPropertyModifier = AccessibilityModifier | Readonly,
  NonPublicAccessibilityModifier = Private | Protected,
  TypeScriptModifier = Ambient | Public | Private | Protected | Readonly | Abstract | Const,
  ExportDefault = Export | Default,
  All = Export | Ambient | Public | Private | Protected | Static | Readonly | Abstract | Async | Default | Const,
}
// prettier-ignore
export const enum LanguageVariant { TS, TX, PY, JL }
// prettier-ignore
export type KeywordSyntax = | Syntax.AbstractKeyword | Syntax.AnyKeyword | Syntax.AsKeyword | Syntax.AssertsKeyword | Syntax.BigIntKeyword | Syntax.BooleanKeyword | Syntax.BreakKeyword | Syntax.CaseKeyword | Syntax.CatchKeyword | Syntax.ClassKeyword | Syntax.ContinueKeyword | Syntax.ConstKeyword | Syntax.ConstructorKeyword | Syntax.DebuggerKeyword | Syntax.DeclareKeyword | Syntax.DefaultKeyword | Syntax.DeleteKeyword | Syntax.DoKeyword | Syntax.ElseKeyword | Syntax.EnumKeyword | Syntax.ExportKeyword | Syntax.ExtendsKeyword | Syntax.FalseKeyword | Syntax.FinallyKeyword | Syntax.ForKeyword | Syntax.FromKeyword | Syntax.FunctionKeyword | Syntax.GetKeyword | Syntax.IfKeyword | Syntax.ImplementsKeyword | Syntax.ImportKeyword | Syntax.InKeyword | Syntax.InferKeyword | Syntax.InstanceOfKeyword | Syntax.InterfaceKeyword | Syntax.IsKeyword | Syntax.KeyOfKeyword | Syntax.LetKeyword | Syntax.ModuleKeyword | Syntax.NamespaceKeyword | Syntax.NeverKeyword | Syntax.NewKeyword | Syntax.NullKeyword | Syntax.NumberKeyword | Syntax.ObjectKeyword | Syntax.PackageKeyword | Syntax.PrivateKeyword | Syntax.ProtectedKeyword | Syntax.PublicKeyword | Syntax.ReadonlyKeyword | Syntax.RequireKeyword | Syntax.GlobalKeyword | Syntax.ReturnKeyword | Syntax.SetKeyword | Syntax.StaticKeyword | Syntax.StringKeyword | Syntax.SuperKeyword | Syntax.SwitchKeyword | Syntax.SymbolKeyword | Syntax.ThisKeyword | Syntax.ThrowKeyword | Syntax.TrueKeyword | Syntax.TryKeyword | Syntax.TypeKeyword | Syntax.TypeOfKeyword | Syntax.UndefinedKeyword | Syntax.UniqueKeyword | Syntax.UnknownKeyword | Syntax.VarKeyword | Syntax.VoidKeyword | Syntax.WhileKeyword | Syntax.WithKeyword | Syntax.YieldKeyword | Syntax.AsyncKeyword | Syntax.AwaitKeyword | Syntax.OfKeyword;
// prettier-ignore
export type JSDocSyntax = | Syntax.EndOfFileToken | Syntax.WhitespaceTrivia | Syntax.AtToken | Syntax.NewLineTrivia | Syntax.AsteriskToken | Syntax.OpenBraceToken | Syntax.CloseBraceToken | Syntax.LessThanToken | Syntax.GreaterThanToken | Syntax.OpenBracketToken | Syntax.CloseBracketToken | Syntax.EqualsToken | Syntax.CommaToken | Syntax.DotToken | Syntax.Identifier | Syntax.BacktickToken | Syntax.Unknown | KeywordSyntax;
// prettier-ignore
export type JsxTokenSyntax = | Syntax.LessThanSlashToken | Syntax.EndOfFileToken | Syntax.ConflictMarkerTrivia | Syntax.JsxText | Syntax.JsxTextAllWhiteSpaces | Syntax.OpenBraceToken | Syntax.LessThanToken;
export type CommentKind = Syntax.SingleLineCommentTrivia | Syntax.MultiLineCommentTrivia;
export type TriviaKind = Syntax.SingleLineCommentTrivia | Syntax.MultiLineCommentTrivia | Syntax.NewLineTrivia | Syntax.WhitespaceTrivia | Syntax.ShebangTrivia | Syntax.ConflictMarkerTrivia;
// prettier-ignore
export type Modifier = | Token<Syntax.AbstractKeyword> | Token<Syntax.AsyncKeyword> | Token<Syntax.ConstKeyword> | Token<Syntax.DeclareKeyword> | Token<Syntax.DefaultKeyword> | Token<Syntax.ExportKeyword> | Token<Syntax.PublicKeyword> | Token<Syntax.PrivateKeyword> | Token<Syntax.ProtectedKeyword> | Token<Syntax.ReadonlyKeyword> | Token<Syntax.StaticKeyword>;
// prettier-ignore
const identifierStart = [65, 90, 97, 122, 170, 170, 181, 181, 186, 186, 192, 214, 216, 246, 248, 705, 710, 721, 736, 740, 748, 748, 750, 750, 880, 884, 886, 887, 890, 893, 895, 895, 902, 902, 904, 906, 908, 908, 910, 929, 931, 1013, 1015, 1153, 1162, 1327, 1329, 1366, 1369, 1369, 1376, 1416, 1488, 1514, 1519, 1522, 1568, 1610, 1646, 1647, 1649, 1747, 1749, 1749, 1765, 1766, 1774, 1775, 1786, 1788, 1791, 1791, 1808, 1808, 1810, 1839, 1869, 1957, 1969, 1969, 1994, 2026, 2036, 2037, 2042, 2042, 2048, 2069, 2074, 2074, 2084, 2084, 2088, 2088, 2112, 2136, 2144, 2154, 2208, 2228, 2230, 2237, 2308, 2361, 2365, 2365, 2384, 2384, 2392, 2401, 2417, 2432, 2437, 2444, 2447, 2448, 2451, 2472, 2474, 2480, 2482, 2482, 2486, 2489, 2493, 2493, 2510, 2510, 2524, 2525, 2527, 2529, 2544, 2545, 2556, 2556, 2565, 2570, 2575, 2576, 2579, 2600, 2602, 2608, 2610, 2611, 2613, 2614, 2616, 2617, 2649, 2652, 2654, 2654, 2674, 2676, 2693, 2701, 2703, 2705, 2707, 2728, 2730, 2736, 2738, 2739, 2741, 2745, 2749, 2749, 2768, 2768, 2784, 2785, 2809, 2809, 2821, 2828, 2831, 2832, 2835, 2856, 2858, 2864, 2866, 2867, 2869, 2873, 2877, 2877, 2908, 2909, 2911, 2913, 2929, 2929, 2947, 2947, 2949, 2954, 2958, 2960, 2962, 2965, 2969, 2970, 2972, 2972, 2974, 2975, 2979, 2980, 2984, 2986, 2990, 3001, 3024, 3024, 3077, 3084, 3086, 3088, 3090, 3112, 3114, 3129, 3133, 3133, 3160, 3162, 3168, 3169, 3200, 3200, 3205, 3212, 3214, 3216, 3218, 3240, 3242, 3251, 3253, 3257, 3261, 3261, 3294, 3294, 3296, 3297, 3313, 3314, 3333, 3340, 3342, 3344, 3346, 3386, 3389, 3389, 3406, 3406, 3412, 3414, 3423, 3425, 3450, 3455, 3461, 3478, 3482, 3505, 3507, 3515, 3517, 3517, 3520, 3526, 3585, 3632, 3634, 3635, 3648, 3654, 3713, 3714, 3716, 3716, 3718, 3722, 3724, 3747, 3749, 3749, 3751, 3760, 3762, 3763, 3773, 3773, 3776, 3780, 3782, 3782, 3804, 3807, 3840, 3840, 3904, 3911, 3913, 3948, 3976, 3980, 4096, 4138, 4159, 4159, 4176, 4181, 4186, 4189, 4193, 4193, 4197, 4198, 4206, 4208, 4213, 4225, 4238, 4238, 4256, 4293, 4295, 4295, 4301, 4301, 4304, 4346, 4348, 4680, 4682, 4685, 4688, 4694, 4696, 4696, 4698, 4701, 4704, 4744, 4746, 4749, 4752, 4784, 4786, 4789, 4792, 4798, 4800, 4800, 4802, 4805, 4808, 4822, 4824, 4880, 4882, 4885, 4888, 4954, 4992, 5007, 5024, 5109, 5112, 5117, 5121, 5740, 5743, 5759, 5761, 5786, 5792, 5866, 5870, 5880, 5888, 5900, 5902, 5905, 5920, 5937, 5952, 5969, 5984, 5996, 5998, 6000, 6016, 6067, 6103, 6103, 6108, 6108, 6176, 6264, 6272, 6312, 6314, 6314, 6320, 6389, 6400, 6430, 6480, 6509, 6512, 6516, 6528, 6571, 6576, 6601, 6656, 6678, 6688, 6740, 6823, 6823, 6917, 6963, 6981, 6987, 7043, 7072, 7086, 7087, 7098, 7141, 7168, 7203, 7245, 7247, 7258, 7293, 7296, 7304, 7312, 7354, 7357, 7359, 7401, 7404, 7406, 7411, 7413, 7414, 7418, 7418, 7424, 7615, 7680, 7957, 7960, 7965, 7968, 8005, 8008, 8013, 8016, 8023, 8025, 8025, 8027, 8027, 8029, 8029, 8031, 8061, 8064, 8116, 8118, 8124, 8126, 8126, 8130, 8132, 8134, 8140, 8144, 8147, 8150, 8155, 8160, 8172, 8178, 8180, 8182, 8188, 8305, 8305, 8319, 8319, 8336, 8348, 8450, 8450, 8455, 8455, 8458, 8467, 8469, 8469, 8472, 8477, 8484, 8484, 8486, 8486, 8488, 8488, 8490, 8505, 8508, 8511, 8517, 8521, 8526, 8526, 8544, 8584, 11264, 11310, 11312, 11358, 11360, 11492, 11499, 11502, 11506, 11507, 11520, 11557, 11559, 11559, 11565, 11565, 11568, 11623, 11631, 11631, 11648, 11670, 11680, 11686, 11688, 11694, 11696, 11702, 11704, 11710, 11712, 11718, 11720, 11726, 11728, 11734, 11736, 11742, 12293, 12295, 12321, 12329, 12337, 12341, 12344, 12348, 12353, 12438, 12443, 12447, 12449, 12538, 12540, 12543, 12549, 12591, 12593, 12686, 12704, 12730, 12784, 12799, 13312, 19893, 19968, 40943, 40960, 42124, 42192, 42237, 42240, 42508, 42512, 42527, 42538, 42539, 42560, 42606, 42623, 42653, 42656, 42735, 42775, 42783, 42786, 42888, 42891, 42943, 42946, 42950, 42999, 43009, 43011, 43013, 43015, 43018, 43020, 43042, 43072, 43123, 43138, 43187, 43250, 43255, 43259, 43259, 43261, 43262, 43274, 43301, 43312, 43334, 43360, 43388, 43396, 43442, 43471, 43471, 43488, 43492, 43494, 43503, 43514, 43518, 43520, 43560, 43584, 43586, 43588, 43595, 43616, 43638, 43642, 43642, 43646, 43695, 43697, 43697, 43701, 43702, 43705, 43709, 43712, 43712, 43714, 43714, 43739, 43741, 43744, 43754, 43762, 43764, 43777, 43782, 43785, 43790, 43793, 43798, 43808, 43814, 43816, 43822, 43824, 43866, 43868, 43879, 43888, 44002, 44032, 55203, 55216, 55238, 55243, 55291, 63744, 64109, 64112, 64217, 64256, 64262, 64275, 64279, 64285, 64285, 64287, 64296, 64298, 64310, 64312, 64316, 64318, 64318, 64320, 64321, 64323, 64324, 64326, 64433, 64467, 64829, 64848, 64911, 64914, 64967, 65008, 65019, 65136, 65140, 65142, 65276, 65313, 65338, 65345, 65370, 65382, 65470, 65474, 65479, 65482, 65487, 65490, 65495, 65498, 65500, 65536, 65547, 65549, 65574, 65576, 65594, 65596, 65597, 65599, 65613, 65616, 65629, 65664, 65786, 65856, 65908, 66176, 66204, 66208, 66256, 66304, 66335, 66349, 66378, 66384, 66421, 66432, 66461, 66464, 66499, 66504, 66511, 66513, 66517, 66560, 66717, 66736, 66771, 66776, 66811, 66816, 66855, 66864, 66915, 67072, 67382, 67392, 67413, 67424, 67431, 67584, 67589, 67592, 67592, 67594, 67637, 67639, 67640, 67644, 67644, 67647, 67669, 67680, 67702, 67712, 67742, 67808, 67826, 67828, 67829, 67840, 67861, 67872, 67897, 67968, 68023, 68030, 68031, 68096, 68096, 68112, 68115, 68117, 68119, 68121, 68149, 68192, 68220, 68224, 68252, 68288, 68295, 68297, 68324, 68352, 68405, 68416, 68437, 68448, 68466, 68480, 68497, 68608, 68680, 68736, 68786, 68800, 68850, 68864, 68899, 69376, 69404, 69415, 69415, 69424, 69445, 69600, 69622, 69635, 69687, 69763, 69807, 69840, 69864, 69891, 69926, 69956, 69956, 69968, 70002, 70006, 70006, 70019, 70066, 70081, 70084, 70106, 70106, 70108, 70108, 70144, 70161, 70163, 70187, 70272, 70278, 70280, 70280, 70282, 70285, 70287, 70301, 70303, 70312, 70320, 70366, 70405, 70412, 70415, 70416, 70419, 70440, 70442, 70448, 70450, 70451, 70453, 70457, 70461, 70461, 70480, 70480, 70493, 70497, 70656, 70708, 70727, 70730, 70751, 70751, 70784, 70831, 70852, 70853, 70855, 70855, 71040, 71086, 71128, 71131, 71168, 71215, 71236, 71236, 71296, 71338, 71352, 71352, 71424, 71450, 71680, 71723, 71840, 71903, 71935, 71935, 72096, 72103, 72106, 72144, 72161, 72161, 72163, 72163, 72192, 72192, 72203, 72242, 72250, 72250, 72272, 72272, 72284, 72329, 72349, 72349, 72384, 72440, 72704, 72712, 72714, 72750, 72768, 72768, 72818, 72847, 72960, 72966, 72968, 72969, 72971, 73008, 73030, 73030, 73056, 73061, 73063, 73064, 73066, 73097, 73112, 73112, 73440, 73458, 73728, 74649, 74752, 74862, 74880, 75075, 77824, 78894, 82944, 83526, 92160, 92728, 92736, 92766, 92880, 92909, 92928, 92975, 92992, 92995, 93027, 93047, 93053, 93071, 93760, 93823, 93952, 94026, 94032, 94032, 94099, 94111, 94176, 94177, 94179, 94179, 94208, 100343, 100352, 101106, 110592, 110878, 110928, 110930, 110948, 110951, 110960, 111355, 113664, 113770, 113776, 113788, 113792, 113800, 113808, 113817, 119808, 119892, 119894, 119964, 119966, 119967, 119970, 119970, 119973, 119974, 119977, 119980, 119982, 119993, 119995, 119995, 119997, 120003, 120005, 120069, 120071, 120074, 120077, 120084, 120086, 120092, 120094, 120121, 120123, 120126, 120128, 120132, 120134, 120134, 120138, 120144, 120146, 120485, 120488, 120512, 120514, 120538, 120540, 120570, 120572, 120596, 120598, 120628, 120630, 120654, 120656, 120686, 120688, 120712, 120714, 120744, 120746, 120770, 120772, 120779, 123136, 123180, 123191, 123197, 123214, 123214, 123584, 123627, 124928, 125124, 125184, 125251, 125259, 125259, 126464, 126467, 126469, 126495, 126497, 126498, 126500, 126500, 126503, 126503, 126505, 126514, 126516, 126519, 126521, 126521, 126523, 126523, 126530, 126530, 126535, 126535, 126537, 126537, 126539, 126539, 126541, 126543, 126545, 126546, 126548, 126548, 126551, 126551, 126553, 126553, 126555, 126555, 126557, 126557, 126559, 126559, 126561, 126562, 126564, 126564, 126567, 126570, 126572, 126578, 126580, 126583, 126585, 126588, 126590, 126590, 126592, 126601, 126603, 126619, 126625, 126627, 126629, 126633, 126635, 126651, 131072, 173782, 173824, 177972, 177984, 178205, 178208, 183969, 183984, 191456, 194560, 195101];
// prettier-ignore
const identifierPart = [48, 57, 65, 90, 95, 95, 97, 122, 170, 170, 181, 181, 183, 183, 186, 186, 192, 214, 216, 246, 248, 705, 710, 721, 736, 740, 748, 748, 750, 750, 768, 884, 886, 887, 890, 893, 895, 895, 902, 906, 908, 908, 910, 929, 931, 1013, 1015, 1153, 1155, 1159, 1162, 1327, 1329, 1366, 1369, 1369, 1376, 1416, 1425, 1469, 1471, 1471, 1473, 1474, 1476, 1477, 1479, 1479, 1488, 1514, 1519, 1522, 1552, 1562, 1568, 1641, 1646, 1747, 1749, 1756, 1759, 1768, 1770, 1788, 1791, 1791, 1808, 1866, 1869, 1969, 1984, 2037, 2042, 2042, 2045, 2045, 2048, 2093, 2112, 2139, 2144, 2154, 2208, 2228, 2230, 2237, 2259, 2273, 2275, 2403, 2406, 2415, 2417, 2435, 2437, 2444, 2447, 2448, 2451, 2472, 2474, 2480, 2482, 2482, 2486, 2489, 2492, 2500, 2503, 2504, 2507, 2510, 2519, 2519, 2524, 2525, 2527, 2531, 2534, 2545, 2556, 2556, 2558, 2558, 2561, 2563, 2565, 2570, 2575, 2576, 2579, 2600, 2602, 2608, 2610, 2611, 2613, 2614, 2616, 2617, 2620, 2620, 2622, 2626, 2631, 2632, 2635, 2637, 2641, 2641, 2649, 2652, 2654, 2654, 2662, 2677, 2689, 2691, 2693, 2701, 2703, 2705, 2707, 2728, 2730, 2736, 2738, 2739, 2741, 2745, 2748, 2757, 2759, 2761, 2763, 2765, 2768, 2768, 2784, 2787, 2790, 2799, 2809, 2815, 2817, 2819, 2821, 2828, 2831, 2832, 2835, 2856, 2858, 2864, 2866, 2867, 2869, 2873, 2876, 2884, 2887, 2888, 2891, 2893, 2902, 2903, 2908, 2909, 2911, 2915, 2918, 2927, 2929, 2929, 2946, 2947, 2949, 2954, 2958, 2960, 2962, 2965, 2969, 2970, 2972, 2972, 2974, 2975, 2979, 2980, 2984, 2986, 2990, 3001, 3006, 3010, 3014, 3016, 3018, 3021, 3024, 3024, 3031, 3031, 3046, 3055, 3072, 3084, 3086, 3088, 3090, 3112, 3114, 3129, 3133, 3140, 3142, 3144, 3146, 3149, 3157, 3158, 3160, 3162, 3168, 3171, 3174, 3183, 3200, 3203, 3205, 3212, 3214, 3216, 3218, 3240, 3242, 3251, 3253, 3257, 3260, 3268, 3270, 3272, 3274, 3277, 3285, 3286, 3294, 3294, 3296, 3299, 3302, 3311, 3313, 3314, 3328, 3331, 3333, 3340, 3342, 3344, 3346, 3396, 3398, 3400, 3402, 3406, 3412, 3415, 3423, 3427, 3430, 3439, 3450, 3455, 3458, 3459, 3461, 3478, 3482, 3505, 3507, 3515, 3517, 3517, 3520, 3526, 3530, 3530, 3535, 3540, 3542, 3542, 3544, 3551, 3558, 3567, 3570, 3571, 3585, 3642, 3648, 3662, 3664, 3673, 3713, 3714, 3716, 3716, 3718, 3722, 3724, 3747, 3749, 3749, 3751, 3773, 3776, 3780, 3782, 3782, 3784, 3789, 3792, 3801, 3804, 3807, 3840, 3840, 3864, 3865, 3872, 3881, 3893, 3893, 3895, 3895, 3897, 3897, 3902, 3911, 3913, 3948, 3953, 3972, 3974, 3991, 3993, 4028, 4038, 4038, 4096, 4169, 4176, 4253, 4256, 4293, 4295, 4295, 4301, 4301, 4304, 4346, 4348, 4680, 4682, 4685, 4688, 4694, 4696, 4696, 4698, 4701, 4704, 4744, 4746, 4749, 4752, 4784, 4786, 4789, 4792, 4798, 4800, 4800, 4802, 4805, 4808, 4822, 4824, 4880, 4882, 4885, 4888, 4954, 4957, 4959, 4969, 4977, 4992, 5007, 5024, 5109, 5112, 5117, 5121, 5740, 5743, 5759, 5761, 5786, 5792, 5866, 5870, 5880, 5888, 5900, 5902, 5908, 5920, 5940, 5952, 5971, 5984, 5996, 5998, 6000, 6002, 6003, 6016, 6099, 6103, 6103, 6108, 6109, 6112, 6121, 6155, 6157, 6160, 6169, 6176, 6264, 6272, 6314, 6320, 6389, 6400, 6430, 6432, 6443, 6448, 6459, 6470, 6509, 6512, 6516, 6528, 6571, 6576, 6601, 6608, 6618, 6656, 6683, 6688, 6750, 6752, 6780, 6783, 6793, 6800, 6809, 6823, 6823, 6832, 6845, 6912, 6987, 6992, 7001, 7019, 7027, 7040, 7155, 7168, 7223, 7232, 7241, 7245, 7293, 7296, 7304, 7312, 7354, 7357, 7359, 7376, 7378, 7380, 7418, 7424, 7673, 7675, 7957, 7960, 7965, 7968, 8005, 8008, 8013, 8016, 8023, 8025, 8025, 8027, 8027, 8029, 8029, 8031, 8061, 8064, 8116, 8118, 8124, 8126, 8126, 8130, 8132, 8134, 8140, 8144, 8147, 8150, 8155, 8160, 8172, 8178, 8180, 8182, 8188, 8255, 8256, 8276, 8276, 8305, 8305, 8319, 8319, 8336, 8348, 8400, 8412, 8417, 8417, 8421, 8432, 8450, 8450, 8455, 8455, 8458, 8467, 8469, 8469, 8472, 8477, 8484, 8484, 8486, 8486, 8488, 8488, 8490, 8505, 8508, 8511, 8517, 8521, 8526, 8526, 8544, 8584, 11264, 11310, 11312, 11358, 11360, 11492, 11499, 11507, 11520, 11557, 11559, 11559, 11565, 11565, 11568, 11623, 11631, 11631, 11647, 11670, 11680, 11686, 11688, 11694, 11696, 11702, 11704, 11710, 11712, 11718, 11720, 11726, 11728, 11734, 11736, 11742, 11744, 11775, 12293, 12295, 12321, 12335, 12337, 12341, 12344, 12348, 12353, 12438, 12441, 12447, 12449, 12538, 12540, 12543, 12549, 12591, 12593, 12686, 12704, 12730, 12784, 12799, 13312, 19893, 19968, 40943, 40960, 42124, 42192, 42237, 42240, 42508, 42512, 42539, 42560, 42607, 42612, 42621, 42623, 42737, 42775, 42783, 42786, 42888, 42891, 42943, 42946, 42950, 42999, 43047, 43072, 43123, 43136, 43205, 43216, 43225, 43232, 43255, 43259, 43259, 43261, 43309, 43312, 43347, 43360, 43388, 43392, 43456, 43471, 43481, 43488, 43518, 43520, 43574, 43584, 43597, 43600, 43609, 43616, 43638, 43642, 43714, 43739, 43741, 43744, 43759, 43762, 43766, 43777, 43782, 43785, 43790, 43793, 43798, 43808, 43814, 43816, 43822, 43824, 43866, 43868, 43879, 43888, 44010, 44012, 44013, 44016, 44025, 44032, 55203, 55216, 55238, 55243, 55291, 63744, 64109, 64112, 64217, 64256, 64262, 64275, 64279, 64285, 64296, 64298, 64310, 64312, 64316, 64318, 64318, 64320, 64321, 64323, 64324, 64326, 64433, 64467, 64829, 64848, 64911, 64914, 64967, 65008, 65019, 65024, 65039, 65056, 65071, 65075, 65076, 65101, 65103, 65136, 65140, 65142, 65276, 65296, 65305, 65313, 65338, 65343, 65343, 65345, 65370, 65382, 65470, 65474, 65479, 65482, 65487, 65490, 65495, 65498, 65500, 65536, 65547, 65549, 65574, 65576, 65594, 65596, 65597, 65599, 65613, 65616, 65629, 65664, 65786, 65856, 65908, 66045, 66045, 66176, 66204, 66208, 66256, 66272, 66272, 66304, 66335, 66349, 66378, 66384, 66426, 66432, 66461, 66464, 66499, 66504, 66511, 66513, 66517, 66560, 66717, 66720, 66729, 66736, 66771, 66776, 66811, 66816, 66855, 66864, 66915, 67072, 67382, 67392, 67413, 67424, 67431, 67584, 67589, 67592, 67592, 67594, 67637, 67639, 67640, 67644, 67644, 67647, 67669, 67680, 67702, 67712, 67742, 67808, 67826, 67828, 67829, 67840, 67861, 67872, 67897, 67968, 68023, 68030, 68031, 68096, 68099, 68101, 68102, 68108, 68115, 68117, 68119, 68121, 68149, 68152, 68154, 68159, 68159, 68192, 68220, 68224, 68252, 68288, 68295, 68297, 68326, 68352, 68405, 68416, 68437, 68448, 68466, 68480, 68497, 68608, 68680, 68736, 68786, 68800, 68850, 68864, 68903, 68912, 68921, 69376, 69404, 69415, 69415, 69424, 69456, 69600, 69622, 69632, 69702, 69734, 69743, 69759, 69818, 69840, 69864, 69872, 69881, 69888, 69940, 69942, 69951, 69956, 69958, 69968, 70003, 70006, 70006, 70016, 70084, 70089, 70092, 70096, 70106, 70108, 70108, 70144, 70161, 70163, 70199, 70206, 70206, 70272, 70278, 70280, 70280, 70282, 70285, 70287, 70301, 70303, 70312, 70320, 70378, 70384, 70393, 70400, 70403, 70405, 70412, 70415, 70416, 70419, 70440, 70442, 70448, 70450, 70451, 70453, 70457, 70459, 70468, 70471, 70472, 70475, 70477, 70480, 70480, 70487, 70487, 70493, 70499, 70502, 70508, 70512, 70516, 70656, 70730, 70736, 70745, 70750, 70751, 70784, 70853, 70855, 70855, 70864, 70873, 71040, 71093, 71096, 71104, 71128, 71133, 71168, 71232, 71236, 71236, 71248, 71257, 71296, 71352, 71360, 71369, 71424, 71450, 71453, 71467, 71472, 71481, 71680, 71738, 71840, 71913, 71935, 71935, 72096, 72103, 72106, 72151, 72154, 72161, 72163, 72164, 72192, 72254, 72263, 72263, 72272, 72345, 72349, 72349, 72384, 72440, 72704, 72712, 72714, 72758, 72760, 72768, 72784, 72793, 72818, 72847, 72850, 72871, 72873, 72886, 72960, 72966, 72968, 72969, 72971, 73014, 73018, 73018, 73020, 73021, 73023, 73031, 73040, 73049, 73056, 73061, 73063, 73064, 73066, 73102, 73104, 73105, 73107, 73112, 73120, 73129, 73440, 73462, 73728, 74649, 74752, 74862, 74880, 75075, 77824, 78894, 82944, 83526, 92160, 92728, 92736, 92766, 92768, 92777, 92880, 92909, 92912, 92916, 92928, 92982, 92992, 92995, 93008, 93017, 93027, 93047, 93053, 93071, 93760, 93823, 93952, 94026, 94031, 94087, 94095, 94111, 94176, 94177, 94179, 94179, 94208, 100343, 100352, 101106, 110592, 110878, 110928, 110930, 110948, 110951, 110960, 111355, 113664, 113770, 113776, 113788, 113792, 113800, 113808, 113817, 113821, 113822, 119141, 119145, 119149, 119154, 119163, 119170, 119173, 119179, 119210, 119213, 119362, 119364, 119808, 119892, 119894, 119964, 119966, 119967, 119970, 119970, 119973, 119974, 119977, 119980, 119982, 119993, 119995, 119995, 119997, 120003, 120005, 120069, 120071, 120074, 120077, 120084, 120086, 120092, 120094, 120121, 120123, 120126, 120128, 120132, 120134, 120134, 120138, 120144, 120146, 120485, 120488, 120512, 120514, 120538, 120540, 120570, 120572, 120596, 120598, 120628, 120630, 120654, 120656, 120686, 120688, 120712, 120714, 120744, 120746, 120770, 120772, 120779, 120782, 120831, 121344, 121398, 121403, 121452, 121461, 121461, 121476, 121476, 121499, 121503, 121505, 121519, 122880, 122886, 122888, 122904, 122907, 122913, 122915, 122916, 122918, 122922, 123136, 123180, 123184, 123197, 123200, 123209, 123214, 123214, 123584, 123641, 124928, 125124, 125136, 125142, 125184, 125259, 125264, 125273, 126464, 126467, 126469, 126495, 126497, 126498, 126500, 126500, 126503, 126503, 126505, 126514, 126516, 126519, 126521, 126521, 126523, 126523, 126530, 126530, 126535, 126535, 126537, 126537, 126539, 126539, 126541, 126543, 126545, 126546, 126548, 126548, 126551, 126551, 126553, 126553, 126555, 126555, 126557, 126557, 126559, 126559, 126561, 126562, 126564, 126564, 126567, 126570, 126572, 126578, 126580, 126583, 126585, 126588, 126590, 126590, 126592, 126601, 126603, 126619, 126625, 126627, 126629, 126633, 126635, 126651, 131072, 173782, 173824, 177972, 177984, 178205, 178208, 183969, 183984, 191456, 194560, 195101, 917760, 917999];
export const dirSeparator = '/';
const altDirSeparator = '\\';
const urlSchemeSeparator = '://';
const markerLength = '<<<<<<<'.length;
const shebangRegex = /^#!.*/;
const keywords: qb.MapLike<KeywordSyntax> = {
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
export const strToKey = new qb.QMap(keywords);
const strToTok = new qb.QMap<Syntax>({
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
export interface LineAndChar {
  line: number;
  char: number;
}
export namespace Range {
  export interface Comment extends qb.Range {
    hasTrailingNewLine?: boolean;
    kind: CommentKind;
  }
}
export const is = new (class {
  lineBreak(c: number) {
    return c === Codes.lineFeed || c === Codes.carriageReturn || c === Codes.lineSeparator || c === Codes.paragraphSeparator;
  }
  whiteSpaceSingleLine(c: number) {
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
  whiteSpaceLike(c: number) {
    return this.whiteSpaceSingleLine(c) || this.lineBreak(c);
  }
  digit(c: number) {
    return c >= Codes._0 && c <= Codes._9;
  }
  hexDigit(c: number) {
    return this.digit(c) || (c >= Codes.A && c <= Codes.F) || (c >= Codes.a && c <= Codes.f);
  }
  octalDigit(c: number) {
    return c >= Codes._0 && c <= Codes._7;
  }
  codePoint(c: number) {
    return c <= 0x10ffff;
  }
  dirSeparator(c: number) {
    return c === Codes.slash || c === Codes.backslash;
  }
  volumeChar(c: number) {
    return (c >= Codes.a && c <= Codes.z) || (c >= Codes.A && c <= Codes.Z);
  }
  reservedName(x: qb.__String) {
    const n = x as string;
    return n.charCodeAt(0) === Codes._ && n.charCodeAt(1) === Codes._ && n.charCodeAt(2) !== Codes._ && n.charCodeAt(2) !== Codes.at && n.charCodeAt(2) !== Codes.hash;
  }
  jsDocLike(s: string, i: number) {
    return s.charCodeAt(i + 1) === Codes.asterisk && s.charCodeAt(i + 2) === Codes.asterisk && s.charCodeAt(i + 3) !== Codes.slash;
  }
  identifierOrKeyword(t: Syntax) {
    return t >= Syntax.Identifier;
  }
  identifierOrKeywordOrGreaterThan(t: Syntax) {
    return t === Syntax.GreaterThanToken || this.identifierOrKeyword(t);
  }
  identifierStart(c: number) {
    return (c >= Codes.A && c <= Codes.Z) || (c >= Codes.a && c <= Codes.z) || c === Codes.$ || c === Codes._ || (c > Codes.maxAsciiCharacter && this.oneOf(c, identifierStart));
  }
  identifierPart(c: number, l?: LanguageVariant) {
    return (
      (c >= Codes.A && c <= Codes.Z) ||
      (c >= Codes.a && c <= Codes.z) ||
      (c >= Codes._0 && c <= Codes._9) ||
      c === Codes.$ ||
      c === Codes._ ||
      (l === LanguageVariant.TX ? c === Codes.minus || c === Codes.colon : false) ||
      (c > Codes.maxAsciiCharacter && this.oneOf(c, identifierPart))
    );
  }
  oneOf(c: number, cs: readonly number[]) {
    if (c < cs[0]) return false;
    let lo = 0;
    let hi = cs.length;
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
  identifierText(s: string, l?: LanguageVariant) {
    let c = s.codePointAt(0)!;
    if (!this.identifierStart(c)) return false;
    for (let i = get.charSize(c); i < s.length; i += get.charSize(c)) {
      if (!this.identifierPart((c = s.codePointAt(i)!), l)) return false;
    }
    return true;
  }
  couldStartTrivia(s: string, pos: number) {
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
  markerTrivia(s: string, pos: number) {
    qb.assert(pos >= 0);
    if (pos === 0 || this.lineBreak(s.charCodeAt(pos - 1))) {
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
  shebangTrivia(s: string, pos: number) {
    qb.assert(pos === 0);
    return shebangRegex.test(s);
  }
  trivia(k: Syntax): k is TriviaKind {
    return Syntax.FirstTriviaToken <= k && k <= Syntax.LastTriviaToken;
  }
  keyword(k: Syntax) {
    return Syntax.FirstKeyword <= k && k <= Syntax.LastKeyword;
  }
  contextualKeyword(k: Syntax) {
    return Syntax.FirstContextualKeyword <= k && k <= Syntax.LastContextualKeyword;
  }
  nonContextualKeyword(k: Syntax) {
    return this.keyword(k) && !this.contextualKeyword(k);
  }
  futureReservedKeyword(k: Syntax) {
    return Syntax.FirstFutureReservedWord <= k && k <= Syntax.LastFutureReservedWord;
  }
  stringANonContextualKeyword(s: string) {
    const k = fromString(s);
    return k !== undefined && this.nonContextualKeyword(k);
  }
  stringAndKeyword(s: string) {
    const k = fromString(s);
    return k !== undefined && this.keyword(k);
  }
  literal(k: Syntax) {
    return Syntax.FirstLiteralToken <= k && k <= Syntax.LastLiteralToken;
  }
  templateLiteral(k: Syntax) {
    return Syntax.FirstTemplateToken <= k && k <= Syntax.LastTemplateToken;
  }
  modifier(k: Syntax): k is Modifier['kind'] {
    switch (k) {
      case Syntax.AbstractKeyword:
      case Syntax.AsyncKeyword:
      case Syntax.ConstKeyword:
      case Syntax.DeclareKeyword:
      case Syntax.DefaultKeyword:
      case Syntax.ExportKeyword:
      case Syntax.PublicKeyword:
      case Syntax.PrivateKeyword:
      case Syntax.ProtectedKeyword:
      case Syntax.ReadonlyKeyword:
      case Syntax.StaticKeyword:
        return true;
    }
    return false;
  }
  parameterPropertyModifier(k: Syntax) {
    return !!(get.modifierFlag(k) & ModifierFlags.ParameterPropertyModifier);
  }
  classMemberModifier(k: Syntax) {
    return this.parameterPropertyModifier(k) || k === Syntax.StaticKeyword;
  }
  functionLikeDeclaration(k: Syntax) {
    switch (k) {
      case Syntax.FunctionDeclaration:
      case Syntax.MethodDeclaration:
      case Syntax.Constructor:
      case Syntax.GetAccessor:
      case Syntax.SetAccessor:
      case Syntax.FunctionExpression:
      case Syntax.ArrowFunction:
        return true;
      default:
        return false;
    }
  }
  functionLike(k: Syntax) {
    switch (k) {
      case Syntax.MethodSignature:
      case Syntax.CallSignature:
      case Syntax.JSDocSignature:
      case Syntax.ConstructSignature:
      case Syntax.IndexSignature:
      case Syntax.FunctionType:
      case Syntax.JSDocFunctionType:
      case Syntax.ConstructorType:
        return true;
      default:
        return this.functionLikeDeclaration(k);
    }
  }
  leftHandSideExpression(k: Syntax) {
    switch (k) {
      case Syntax.PropertyAccessExpression:
      case Syntax.ElementAccessExpression:
      case Syntax.NewExpression:
      case Syntax.CallExpression:
      case Syntax.JsxElement:
      case Syntax.JsxSelfClosingElement:
      case Syntax.JsxFragment:
      case Syntax.TaggedTemplateExpression:
      case Syntax.ArrayLiteralExpression:
      case Syntax.ParenthesizedExpression:
      case Syntax.ObjectLiteralExpression:
      case Syntax.ClassExpression:
      case Syntax.FunctionExpression:
      case Syntax.Identifier:
      case Syntax.RegexLiteral:
      case Syntax.NumericLiteral:
      case Syntax.BigIntLiteral:
      case Syntax.StringLiteral:
      case Syntax.NoSubstitutionLiteral:
      case Syntax.TemplateExpression:
      case Syntax.FalseKeyword:
      case Syntax.NullKeyword:
      case Syntax.ThisKeyword:
      case Syntax.TrueKeyword:
      case Syntax.SuperKeyword:
      case Syntax.NonNullExpression:
      case Syntax.MetaProperty:
      case Syntax.ImportKeyword:
        return true;
      default:
        return false;
    }
  }
  unaryExpression(k: Syntax) {
    switch (k) {
      case Syntax.PrefixUnaryExpression:
      case Syntax.PostfixUnaryExpression:
      case Syntax.DeleteExpression:
      case Syntax.TypeOfExpression:
      case Syntax.VoidExpression:
      case Syntax.AwaitExpression:
      case Syntax.TypeAssertionExpression:
        return true;
      default:
        return this.leftHandSideExpression(k);
    }
  }
  expression(k: Syntax) {
    switch (k) {
      case Syntax.ConditionalExpression:
      case Syntax.YieldExpression:
      case Syntax.ArrowFunction:
      case Syntax.BinaryExpression:
      case Syntax.SpreadElement:
      case Syntax.AsExpression:
      case Syntax.OmittedExpression:
      case Syntax.CommaListExpression:
      case Syntax.PartiallyEmittedExpression:
        return true;
      default:
        return this.unaryExpression(k);
    }
  }
  declaration(k: Syntax) {
    return (
      k === Syntax.ArrowFunction ||
      k === Syntax.BindingElement ||
      k === Syntax.ClassDeclaration ||
      k === Syntax.ClassExpression ||
      k === Syntax.Constructor ||
      k === Syntax.EnumDeclaration ||
      k === Syntax.EnumMember ||
      k === Syntax.ExportSpecifier ||
      k === Syntax.FunctionDeclaration ||
      k === Syntax.FunctionExpression ||
      k === Syntax.GetAccessor ||
      k === Syntax.ImportClause ||
      k === Syntax.ImportEqualsDeclaration ||
      k === Syntax.ImportSpecifier ||
      k === Syntax.InterfaceDeclaration ||
      k === Syntax.JsxAttribute ||
      k === Syntax.MethodDeclaration ||
      k === Syntax.MethodSignature ||
      k === Syntax.ModuleDeclaration ||
      k === Syntax.NamespaceExportDeclaration ||
      k === Syntax.NamespaceImport ||
      k === Syntax.NamespaceExport ||
      k === Syntax.Parameter ||
      k === Syntax.PropertyAssignment ||
      k === Syntax.PropertyDeclaration ||
      k === Syntax.PropertySignature ||
      k === Syntax.SetAccessor ||
      k === Syntax.ShorthandPropertyAssignment ||
      k === Syntax.TypeAliasDeclaration ||
      k === Syntax.TypeParameter ||
      k === Syntax.VariableDeclaration ||
      k === Syntax.JSDocTypedefTag ||
      k === Syntax.JSDocCallbackTag ||
      k === Syntax.JSDocPropertyTag
    );
  }
  declarationStatement(k: Syntax) {
    return (
      k === Syntax.FunctionDeclaration ||
      k === Syntax.MissingDeclaration ||
      k === Syntax.ClassDeclaration ||
      k === Syntax.InterfaceDeclaration ||
      k === Syntax.TypeAliasDeclaration ||
      k === Syntax.EnumDeclaration ||
      k === Syntax.ModuleDeclaration ||
      k === Syntax.ImportDeclaration ||
      k === Syntax.ImportEqualsDeclaration ||
      k === Syntax.ExportDeclaration ||
      k === Syntax.ExportAssignment ||
      k === Syntax.NamespaceExportDeclaration
    );
  }
  statementKindButNotDeclaration(k: Syntax) {
    return (
      k === Syntax.BreakStatement ||
      k === Syntax.ContinueStatement ||
      k === Syntax.DebuggerStatement ||
      k === Syntax.DoStatement ||
      k === Syntax.ExpressionStatement ||
      k === Syntax.EmptyStatement ||
      k === Syntax.ForInStatement ||
      k === Syntax.ForOfStatement ||
      k === Syntax.ForStatement ||
      k === Syntax.IfStatement ||
      k === Syntax.LabeledStatement ||
      k === Syntax.ReturnStatement ||
      k === Syntax.SwitchStatement ||
      k === Syntax.ThrowStatement ||
      k === Syntax.TryStatement ||
      k === Syntax.VariableStatement ||
      k === Syntax.WhileStatement ||
      k === Syntax.WithStatement ||
      k === Syntax.NotEmittedStatement ||
      k === Syntax.EndOfDeclarationMarker ||
      k === Syntax.MergeDeclarationMarker
    );
  }
  logicalOperator(k: Syntax) {
    return k === Syntax.Bar2Token || k === Syntax.Ampersand2Token || k === Syntax.ExclamationToken;
  }
  assignmentOperator(k: Syntax) {
    return k >= Syntax.FirstAssignment && k <= Syntax.LastAssignment;
  }
  typeNode(kind: Syntax) {
    return (
      (kind >= Syntax.FirstTypeNode && kind <= Syntax.LastTypeNode) ||
      kind === Syntax.AnyKeyword ||
      kind === Syntax.UnknownKeyword ||
      kind === Syntax.NumberKeyword ||
      kind === Syntax.BigIntKeyword ||
      kind === Syntax.ObjectKeyword ||
      kind === Syntax.BooleanKeyword ||
      kind === Syntax.StringKeyword ||
      kind === Syntax.SymbolKeyword ||
      kind === Syntax.ThisKeyword ||
      kind === Syntax.VoidKeyword ||
      kind === Syntax.UndefinedKeyword ||
      kind === Syntax.NullKeyword ||
      kind === Syntax.NeverKeyword ||
      kind === Syntax.ExpressionWithTypeArguments ||
      kind === Syntax.JSDocAllType ||
      kind === Syntax.JSDocUnknownType ||
      kind === Syntax.JSDocNullableType ||
      kind === Syntax.JSDocNonNullableType ||
      kind === Syntax.JSDocOptionalType ||
      kind === Syntax.JSDocFunctionType ||
      kind === Syntax.JSDocVariadicType
    );
  }
})();
export const get = new (class {
  charSize(c: number) {
    return c >= 0x10000 ? 2 : 1;
  }
  escUnderscores(s: string): qb.__String {
    return (s.length >= 2 && s.charCodeAt(0) === Codes._ && s.charCodeAt(1) === Codes._ ? '_' + s : s) as qb.__String;
  }
  unescUnderscores(x: qb.__String): string {
    const s = x as string;
    return s.length >= 3 && s.charCodeAt(0) === Codes._ && s.charCodeAt(1) === Codes._ && s.charCodeAt(2) === Codes._ ? s.substr(1) : s;
  }
  urlVolumeEnd(url: string, i: number): number {
    const c = url.charCodeAt(i);
    if (c === Codes.colon) return i + 1;
    if (c === Codes.percent && url.charCodeAt(i + 1) === Codes._3) {
      const c2 = url.charCodeAt(i + 2);
      if (c2 === Codes.a || c2 === Codes.A) return i + 3;
    }
    return -1;
  }
  encodedRootLength(path: string): number {
    if (!path) return 0;
    const c = path.charCodeAt(0);
    if (c === Codes.slash || c === Codes.backslash) {
      if (path.charCodeAt(1) !== c) return 1;
      const i = path.indexOf(c === Codes.slash ? dirSeparator : altDirSeparator, 2);
      if (i < 0) return path.length;
      return i + 1;
    }
    if (is.volumeChar(c) && path.charCodeAt(1) === Codes.colon) {
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
        if (scheme === 'file' && (auth === '' || auth === 'localhost') && is.volumeChar(path.charCodeAt(j + 1))) {
          const e = this.urlVolumeEnd(path, j + 2);
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
  extensionFrom(path: string, ext: string, eq: (a: string, b: string) => boolean): string | undefined {
    if (!qb.startsWith(ext, '.')) ext = '.' + ext;
    if (path.length >= ext.length && path.charCodeAt(path.length - ext.length) === Codes.dot) {
      const e = path.slice(path.length - ext.length);
      if (eq(e, ext)) return e;
    }
    return;
  }
  lineStarts(t: string): number[] {
    const ss = [] as number[];
    let s = 0;
    let pos = 0;
    while (pos < t.length) {
      const c = t.charCodeAt(pos);
      pos++;
      switch (c) {
        case Codes.carriageReturn:
          if (t.charCodeAt(pos) === Codes.lineFeed) pos++;
        case Codes.lineFeed:
          ss.push(s);
          s = pos;
          break;
        default:
          if (c > Codes.maxAsciiCharacter && is.lineBreak(c)) {
            ss.push(s);
            s = pos;
          }
          break;
      }
    }
    ss.push(s);
    return ss;
  }
  lineOf(starts: readonly number[], pos: number, lowerBound?: number): number {
    let l = qb.binarySearch(starts, pos, qb.identity, qb.compareValues, lowerBound);
    if (l < 0) {
      l = ~l - 1;
      qb.assert(l !== -1, 'position before beginning of file');
    }
    return l;
  }
  lineAndCharOf(starts: readonly number[], pos: number): LineAndChar {
    const line = this.lineOf(starts, pos);
    return { line, char: pos - starts[line] };
  }
  posOf(starts: readonly number[], line: number, char: number, debug?: string, edits?: true): number {
    if (line < 0 || line >= starts.length) {
      if (edits) line = line < 0 ? 0 : line >= starts.length ? starts.length - 1 : line;
      else {
        qb.fail(`Bad line number. Line: ${line}, starts.length: ${starts.length} , line map is correct? ${debug !== undefined ? qb.arraysEqual(starts, this.lineStarts(debug)) : 'unknown'}`);
      }
    }
    const p = starts[line] + char;
    if (edits) return p > starts[line + 1] ? starts[line + 1] : typeof debug === 'string' && p > debug.length ? debug.length : p;
    if (line < starts.length - 1) qb.assert(p < starts[line + 1]);
    else if (debug !== undefined) qb.assert(p <= debug.length);
    return p;
  }
  shebang(s: string): string | undefined {
    const m = shebangRegex.exec(s);
    return m ? m[0] : undefined;
  }
  leadingCommentRanges(s: string, pos: number): Range.Comment[] | undefined {
    return reduceEachLeadingCommentRange(s, pos, appendCommentRange, undefined, undefined);
  }
  trailingCommentRanges(s: string, pos: number): Range.Comment[] | undefined {
    return reduceEachTrailingCommentRange(s, pos, appendCommentRange, undefined, undefined);
  }
  operatorAssociativity(k: Syntax, o: Syntax, args?: boolean): Associativity {
    switch (k) {
      case Syntax.NewExpression:
        return args ? Associativity.Left : Associativity.Right;
      case Syntax.PrefixUnaryExpression:
      case Syntax.TypeOfExpression:
      case Syntax.VoidExpression:
      case Syntax.DeleteExpression:
      case Syntax.AwaitExpression:
      case Syntax.ConditionalExpression:
      case Syntax.YieldExpression:
        return Associativity.Right;
      case Syntax.BinaryExpression:
        switch (o) {
          case Syntax.Asterisk2Token:
          case Syntax.EqualsToken:
          case Syntax.PlusEqualsToken:
          case Syntax.MinusEqualsToken:
          case Syntax.Asterisk2EqualsToken:
          case Syntax.AsteriskEqualsToken:
          case Syntax.SlashEqualsToken:
          case Syntax.PercentEqualsToken:
          case Syntax.LessThan2EqualsToken:
          case Syntax.GreaterThan2EqualsToken:
          case Syntax.GreaterThan3EqualsToken:
          case Syntax.AmpersandEqualsToken:
          case Syntax.CaretEqualsToken:
          case Syntax.BarEqualsToken:
            return Associativity.Right;
        }
    }
    return Associativity.Left;
  }
  operatorPrecedence(k: Syntax, o: Syntax, args?: boolean): number {
    switch (k) {
      case Syntax.CommaListExpression:
        return 0;
      case Syntax.SpreadElement:
        return 1;
      case Syntax.YieldExpression:
        return 2;
      case Syntax.ConditionalExpression:
        return 4;
      case Syntax.BinaryExpression:
        switch (o) {
          case Syntax.CommaToken:
            return 0;
          case Syntax.EqualsToken:
          case Syntax.PlusEqualsToken:
          case Syntax.MinusEqualsToken:
          case Syntax.Asterisk2EqualsToken:
          case Syntax.AsteriskEqualsToken:
          case Syntax.SlashEqualsToken:
          case Syntax.PercentEqualsToken:
          case Syntax.LessThan2EqualsToken:
          case Syntax.GreaterThan2EqualsToken:
          case Syntax.GreaterThan3EqualsToken:
          case Syntax.AmpersandEqualsToken:
          case Syntax.CaretEqualsToken:
          case Syntax.BarEqualsToken:
            return 3;
          default:
            return this.binaryOperatorPrecedence(o);
        }
      case Syntax.PrefixUnaryExpression:
      case Syntax.TypeOfExpression:
      case Syntax.VoidExpression:
      case Syntax.DeleteExpression:
      case Syntax.AwaitExpression:
        return 16;
      case Syntax.PostfixUnaryExpression:
        return 17;
      case Syntax.CallExpression:
        return 18;
      case Syntax.NewExpression:
        return args ? 19 : 18;
      case Syntax.TaggedTemplateExpression:
      case Syntax.PropertyAccessExpression:
      case Syntax.ElementAccessExpression:
        return 19;
      case Syntax.ThisKeyword:
      case Syntax.SuperKeyword:
      case Syntax.Identifier:
      case Syntax.NullKeyword:
      case Syntax.TrueKeyword:
      case Syntax.FalseKeyword:
      case Syntax.NumericLiteral:
      case Syntax.BigIntLiteral:
      case Syntax.StringLiteral:
      case Syntax.ArrayLiteralExpression:
      case Syntax.ObjectLiteralExpression:
      case Syntax.FunctionExpression:
      case Syntax.ArrowFunction:
      case Syntax.ClassExpression:
      case Syntax.JsxElement:
      case Syntax.JsxSelfClosingElement:
      case Syntax.JsxFragment:
      case Syntax.RegexLiteral:
      case Syntax.NoSubstitutionLiteral:
      case Syntax.TemplateExpression:
      case Syntax.ParenthesizedExpression:
      case Syntax.OmittedExpression:
        return 20;
      default:
        return -1;
    }
  }
  binaryOperatorPrecedence(k: Syntax): number {
    switch (k) {
      case Syntax.Question2Token:
        return 4;
      case Syntax.Bar2Token:
        return 5;
      case Syntax.Ampersand2Token:
        return 6;
      case Syntax.BarToken:
        return 7;
      case Syntax.CaretToken:
        return 8;
      case Syntax.AmpersandToken:
        return 9;
      case Syntax.Equals2Token:
      case Syntax.ExclamationEqualsToken:
      case Syntax.Equals3Token:
      case Syntax.ExclamationEquals2Token:
        return 10;
      case Syntax.LessThanToken:
      case Syntax.GreaterThanToken:
      case Syntax.LessThanEqualsToken:
      case Syntax.GreaterThanEqualsToken:
      case Syntax.InstanceOfKeyword:
      case Syntax.InKeyword:
      case Syntax.AsKeyword:
        return 11;
      case Syntax.LessThan2Token:
      case Syntax.GreaterThan2Token:
      case Syntax.GreaterThan3Token:
        return 12;
      case Syntax.PlusToken:
      case Syntax.MinusToken:
        return 13;
      case Syntax.AsteriskToken:
      case Syntax.SlashToken:
      case Syntax.PercentToken:
        return 14;
      case Syntax.Asterisk2Token:
        return 15;
    }
    return -1;
  }
  modifierFlag(k: Syntax): ModifierFlags {
    switch (k) {
      case Syntax.StaticKeyword:
        return ModifierFlags.Static;
      case Syntax.PublicKeyword:
        return ModifierFlags.Public;
      case Syntax.ProtectedKeyword:
        return ModifierFlags.Protected;
      case Syntax.PrivateKeyword:
        return ModifierFlags.Private;
      case Syntax.AbstractKeyword:
        return ModifierFlags.Abstract;
      case Syntax.ExportKeyword:
        return ModifierFlags.Export;
      case Syntax.DeclareKeyword:
        return ModifierFlags.Ambient;
      case Syntax.ConstKeyword:
        return ModifierFlags.Const;
      case Syntax.DefaultKeyword:
        return ModifierFlags.Default;
      case Syntax.AsyncKeyword:
        return ModifierFlags.Async;
      case Syntax.ReadonlyKeyword:
        return ModifierFlags.Readonly;
    }
    return ModifierFlags.None;
  }
})();
export function toString(t: Syntax) {
  return tokStrings[t];
}
export function fromString(s: string) {
  return strToTok.get(s);
}
export function markerTrivia(s: string, pos: number, e?: (m: DiagnosticMessage, pos?: number, len?: number) => void) {
  if (e) e(Diagnostics.Merge_conflict_marker_encountered, pos, markerLength);
  const c = s.charCodeAt(pos);
  const l = s.length;
  if (c === Codes.lessThan || c === Codes.greaterThan) {
    while (pos < l && !is.lineBreak(s.charCodeAt(pos))) {
      pos++;
    }
  } else {
    qb.assert(c === Codes.bar || c === Codes.equals);
    while (pos < l) {
      const c2 = s.charCodeAt(pos);
      if ((c2 === Codes.equals || c2 === Codes.greaterThan) && c2 !== c && is.markerTrivia(s, pos)) break;
      pos++;
    }
  }
  return pos;
}
export function shebangTrivia(s: string, pos: number) {
  const m = shebangRegex.exec(s);
  return pos + (m ? m[0].length : 0);
}
export function skipTrivia(s: string, pos: number, stopAfterLineBreak = false, stopAtComments = false) {
  if (qb.isSynthesized(pos)) return pos;
  while (true) {
    const c = s.charCodeAt(pos);
    switch (c) {
      case Codes.carriageReturn:
        if (s.charCodeAt(pos + 1) === Codes.lineFeed) pos++;
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
            if (is.lineBreak(s.charCodeAt(pos))) break;
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
        if (is.markerTrivia(s, pos)) {
          pos = markerTrivia(s, pos);
          continue;
        }
        break;
      case Codes.hash:
        if (pos === 0 && is.shebangTrivia(s, pos)) {
          pos = shebangTrivia(s, pos);
          continue;
        }
        break;
      default:
        if (c > Codes.maxAsciiCharacter && is.whiteSpaceLike(c)) {
          pos++;
          continue;
        }
        break;
    }
    return pos;
  }
}
export function iterateCommentRanges<T, U>(
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
    const shebang = get.shebang(text);
    if (shebang) {
      pos = shebang.length;
    }
  }
  scan: while (pos >= 0 && pos < text.length) {
    const ch = text.charCodeAt(pos);
    switch (ch) {
      case Codes.carriageReturn:
        if (text.charCodeAt(pos + 1) === Codes.lineFeed) pos++;
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
          const kind = nextChar === Codes.slash ? Syntax.SingleLineCommentTrivia : Syntax.MultiLineCommentTrivia;
          const startPos = pos;
          pos += 2;
          if (nextChar === Codes.slash) {
            while (pos < text.length) {
              if (is.lineBreak(text.charCodeAt(pos))) {
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
        if (ch > Codes.maxAsciiCharacter && is.whiteSpaceLike(ch)) {
          if (hasPendingCommentRange && is.lineBreak(ch)) {
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
  return iterateCommentRanges(false, text, pos, false, cb, state);
}
export function forEachTrailingCommentRange<U>(text: string, pos: number, cb: (pos: number, end: number, k: CommentKind, hasTrailingNewLine: boolean) => U): U | undefined;
export function forEachTrailingCommentRange<T, U>(text: string, pos: number, cb: (pos: number, end: number, k: CommentKind, hasTrailingNewLine: boolean, state: T) => U, state: T): U | undefined;
export function forEachTrailingCommentRange<T, U>(text: string, pos: number, cb: (pos: number, end: number, k: CommentKind, hasTrailingNewLine: boolean, state?: T) => U, state?: T): U | undefined {
  return iterateCommentRanges(false, text, pos, true, cb, state);
}
export function appendCommentRange(pos: number, end: number, kind: CommentKind, hasTrailingNewLine: boolean, _?: any, cs?: Range.Comment[]) {
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
  return iterateCommentRanges(true, text, pos, false, cb, state, initial);
}
export function reduceEachTrailingCommentRange<T, U>(
  text: string,
  pos: number,
  cb: (pos: number, end: number, k: CommentKind, hasTrailingNewLine: boolean, state?: T, memo?: U) => U,
  state?: T,
  initial?: U
) {
  return iterateCommentRanges(true, text, pos, true, cb, state, initial);
}
