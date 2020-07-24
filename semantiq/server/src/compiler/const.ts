export const enum AssignmentDeclarationKind {
  None,
  ExportsProperty,
  ModuleExports,
  PrototypeProperty,
  ThisProperty,
  Property,
  Prototype,
  ObjectDefinePropertyValue,
  ObjectDefinePropertyExports,
  ObjectDefinePrototypeProperty,
}
export const enum BundleFileSectionKind {
  Prologue = 'prologue',
  EmitHelpers = 'emitHelpers',
  NoDefaultLib = 'no-default-lib',
  Reference = 'reference',
  Type = 'type',
  Lib = 'lib',
  Prepend = 'prepend',
  Text = 'text',
  Internal = 'internal',
}
export const enum CheckFlags {
  Instantiated = 1 << 0,
  SyntheticProperty = 1 << 1,
  SyntheticMethod = 1 << 2,
  Readonly = 1 << 3,
  ReadPartial = 1 << 4,
  WritePartial = 1 << 5,
  HasNonUniformType = 1 << 6,
  HasLiteralType = 1 << 7,
  ContainsPublic = 1 << 8,
  ContainsProtected = 1 << 9,
  ContainsPrivate = 1 << 10,
  ContainsStatic = 1 << 11,
  Late = 1 << 12,
  ReverseMapped = 1 << 13,
  OptionalParameter = 1 << 14,
  RestParameter = 1 << 15,
  DeferredType = 1 << 16,
  HasNeverType = 1 << 17,
  Mapped = 1 << 18,
  StripOptional = 1 << 19,
  Synthetic = SyntheticProperty | SyntheticMethod,
  Discriminant = HasNonUniformType | HasLiteralType,
  Partial = ReadPartial | WritePartial,
}
export const enum CommentDirectiveType {
  ExpectError,
  Ignore,
}
export const enum ContextFlags {
  None = 0,
  Signature = 1 << 0,
  NoConstraints = 1 << 1,
  Completions = 1 << 2,
}
export const enum EmitFlags {
  None = 0,
  SingleLine = 1 << 0,
  AdviseOnEmitNode = 1 << 1,
  NoSubstitution = 1 << 2,
  CapturesThis = 1 << 3,
  NoLeadingSourceMap = 1 << 4,
  NoTrailingSourceMap = 1 << 5,
  NoSourceMap = NoLeadingSourceMap | NoTrailingSourceMap,
  NoNestedSourceMaps = 1 << 6,
  NoTokenLeadingSourceMaps = 1 << 7,
  NoTokenTrailingSourceMaps = 1 << 8,
  NoTokenSourceMaps = NoTokenLeadingSourceMaps | NoTokenTrailingSourceMaps,
  NoLeadingComments = 1 << 9,
  NoTrailingComments = 1 << 10,
  NoComments = NoLeadingComments | NoTrailingComments,
  NoNestedComments = 1 << 11,
  HelperName = 1 << 12,
  ExportName = 1 << 13,
  LocalName = 1 << 14,
  InternalName = 1 << 15,
  Indented = 1 << 16,
  NoIndentation = 1 << 17,
  AsyncFunctionBody = 1 << 18,
  ReuseTempVariableScope = 1 << 19,
  CustomPrologue = 1 << 20,
  NoHoisting = 1 << 21,
  HasEndOfDeclarationMarker = 1 << 22,
  Iterator = 1 << 23,
  NoAsciiEscaping = 1 << 24,
  TypeScriptClassWrapper = 1 << 25,
  NeverApplyImportHelper = 1 << 26,
  IgnoreSourceNewlines = 1 << 27,
}
export const enum EmitHint {
  SourceFile,
  Expression,
  IdentifierName,
  MappedTypeParameter,
  Unspecified,
  EmbeddedStatement,
  JsxAttributeValue,
}
export const enum EnumKind {
  Numeric,
  Literal,
}
export const enum Extension {
  Ts = '.ts',
  Tsx = '.tsx',
  Dts = '.d.ts',
  Js = '.js',
  Jsx = '.jsx',
  Json = '.json',
  TsBuildInfo = '.tsbuildinfo',
}
export const enum ExternalEmitHelpers {
  Extends = 1 << 0,
  Assign = 1 << 1,
  Rest = 1 << 2,
  Decorate = 1 << 3,
  Metadata = 1 << 4,
  Param = 1 << 5,
  Awaiter = 1 << 6,
  Generator = 1 << 7,
  Values = 1 << 8,
  Read = 1 << 9,
  Spread = 1 << 10,
  SpreadArrays = 1 << 11,
  Await = 1 << 12,
  AsyncGenerator = 1 << 13,
  AsyncDelegator = 1 << 14,
  AsyncValues = 1 << 15,
  ExportStar = 1 << 16,
  MakeTemplateObject = 1 << 17,
  ClassPrivateFieldGet = 1 << 18,
  ClassPrivateFieldSet = 1 << 19,
  CreateBinding = 1 << 20,
  FirstEmitHelper = Extends,
  LastEmitHelper = CreateBinding,
  ForOfIncludes = Values,
  ForAwaitOfIncludes = AsyncValues,
  AsyncGeneratorIncludes = Await | AsyncGenerator,
  AsyncDelegatorIncludes = Await | AsyncDelegator | AsyncValues,
  SpreadIncludes = Read | Spread,
}
export const enum FlowFlags {
  Unreachable = 1 << 0,
  Start = 1 << 1,
  BranchLabel = 1 << 2,
  LoopLabel = 1 << 3,
  Assignment = 1 << 4,
  TrueCondition = 1 << 5,
  FalseCondition = 1 << 6,
  SwitchClause = 1 << 7,
  ArrayMutation = 1 << 8,
  Call = 1 << 9,
  ReduceLabel = 1 << 10,
  Referenced = 1 << 11,
  Shared = 1 << 12,
  Label = BranchLabel | LoopLabel,
  Condition = TrueCondition | FalseCondition,
}
export const enum GeneratedIdentifierFlags {
  None = 0,
  Auto = 1,
  Loop = 2,
  Unique = 3,
  Node = 4,
  KindMask = 7,
  ReservedInNestedScopes = 1 << 3,
  Optimistic = 1 << 4,
  FileLevel = 1 << 5,
}
export const enum ImportsNotUsedAsValues {
  Remove,
  Preserve,
  Error,
}
export const enum IndexKind {
  String,
  Number,
}
export const enum InferenceFlags {
  None = 0,
  NoDefault = 1 << 0,
  AnyDefault = 1 << 1,
  SkippedGenericFunction = 1 << 2,
}
export const enum InferencePriority {
  NakedTypeVariable = 1 << 0,
  HomomorphicMappedType = 1 << 1,
  PartialHomomorphicMappedType = 1 << 2,
  MappedTypeConstraint = 1 << 3,
  ContravariantConditional = 1 << 4,
  ReturnType = 1 << 5,
  LiteralKeyof = 1 << 6,
  NoConstraints = 1 << 7,
  AlwaysStrict = 1 << 8,
  MaxValue = 1 << 9,
  PriorityImpliesCombination = ReturnType | MappedTypeConstraint | LiteralKeyof,
  Circularity = -1,
}
export const enum JsxEmit {
  None = 0,
  Preserve = 1,
  React = 2,
  ReactNative = 3,
}
export const enum JsxFlags {
  None = 0,
  IntrinsicNamedElement = 1 << 0,
  IntrinsicIndexedElement = 1 << 1,
  IntrinsicElement = IntrinsicNamedElement | IntrinsicIndexedElement,
}
export const enum JsxReferenceKind {
  Component,
  Function,
  Mixed,
}
export const enum LexicalEnvironmentFlags {
  None = 0,
  InParameters = 1 << 0,
  VariablesHoistedInParameters = 1 << 1,
}
export const enum ListFormat {
  None = 0,
  SingleLine = 0,
  MultiLine = 1 << 0,
  PreserveLines = 1 << 1,
  LinesMask = SingleLine | MultiLine | PreserveLines,
  NotDelimited = 0,
  BarDelimited = 1 << 2,
  AmpersandDelimited = 1 << 3,
  CommaDelimited = 1 << 4,
  AsteriskDelimited = 1 << 5,
  DelimitersMask = BarDelimited | AmpersandDelimited | CommaDelimited | AsteriskDelimited,
  AllowTrailingComma = 1 << 6,
  Indented = 1 << 7,
  SpaceBetweenBraces = 1 << 8,
  SpaceBetweenSiblings = 1 << 9,
  Braces = 1 << 10,
  Parenthesis = 1 << 11,
  AngleBrackets = 1 << 12,
  SquareBrackets = 1 << 13,
  BracketsMask = Braces | Parenthesis | AngleBrackets | SquareBrackets,
  OptionalIfUndefined = 1 << 14,
  OptionalIfEmpty = 1 << 15,
  Optional = OptionalIfUndefined | OptionalIfEmpty,
  PreferNewLine = 1 << 16,
  NoTrailingNewLine = 1 << 17,
  NoInterveningComments = 1 << 18,
  NoSpaceIfEmpty = 1 << 19,
  SingleElement = 1 << 20,
  SpaceAfterList = 1 << 21,
  Modifiers = SingleLine | SpaceBetweenSiblings | NoInterveningComments,
  HeritageClauses = SingleLine | SpaceBetweenSiblings,
  SingleLineTypeLiteralMembers = SingleLine | SpaceBetweenBraces | SpaceBetweenSiblings,
  MultiLineTypeLiteralMembers = MultiLine | Indented | OptionalIfEmpty,
  SingleLineTupleTypeElements = CommaDelimited | SpaceBetweenSiblings | SingleLine,
  MultiLineTupleTypeElements = CommaDelimited | Indented | SpaceBetweenSiblings | MultiLine,
  UnionTypeConstituents = BarDelimited | SpaceBetweenSiblings | SingleLine,
  IntersectionTypeConstituents = AmpersandDelimited | SpaceBetweenSiblings | SingleLine,
  ObjectBindingPatternElements = SingleLine | AllowTrailingComma | SpaceBetweenBraces | CommaDelimited | SpaceBetweenSiblings | NoSpaceIfEmpty,
  ArrayBindingPatternElements = SingleLine | AllowTrailingComma | CommaDelimited | SpaceBetweenSiblings | NoSpaceIfEmpty,
  ObjectLiteralExpressionProperties = PreserveLines | CommaDelimited | SpaceBetweenSiblings | SpaceBetweenBraces | Indented | Braces | NoSpaceIfEmpty,
  ArrayLiteralExpressionElements = PreserveLines | CommaDelimited | SpaceBetweenSiblings | AllowTrailingComma | Indented | SquareBrackets,
  CommaListElements = CommaDelimited | SpaceBetweenSiblings | SingleLine,
  CallExpressionArguments = CommaDelimited | SpaceBetweenSiblings | SingleLine | Parenthesis,
  NewExpressionArguments = CommaDelimited | SpaceBetweenSiblings | SingleLine | Parenthesis | OptionalIfUndefined,
  TemplateExpressionSpans = SingleLine | NoInterveningComments,
  SingleLineBlockStatements = SpaceBetweenBraces | SpaceBetweenSiblings | SingleLine,
  MultiLineBlockStatements = Indented | MultiLine,
  VariableDeclarationList = CommaDelimited | SpaceBetweenSiblings | SingleLine,
  SingleLineFunctionBodyStatements = SingleLine | SpaceBetweenSiblings | SpaceBetweenBraces,
  MultiLineFunctionBodyStatements = MultiLine,
  ClassHeritageClauses = SingleLine,
  ClassMembers = Indented | MultiLine,
  InterfaceMembers = Indented | MultiLine,
  EnumMembers = CommaDelimited | Indented | MultiLine,
  CaseBlockClauses = Indented | MultiLine,
  NamedImportsOrExportsElements = CommaDelimited | SpaceBetweenSiblings | AllowTrailingComma | SingleLine | SpaceBetweenBraces | NoSpaceIfEmpty,
  JsxElementOrFragmentChildren = SingleLine | NoInterveningComments,
  JsxElementAttributes = SingleLine | SpaceBetweenSiblings | NoInterveningComments,
  CaseOrDefaultClauseStatements = Indented | MultiLine | NoTrailingNewLine | OptionalIfEmpty,
  HeritageClauseTypes = CommaDelimited | SpaceBetweenSiblings | SingleLine,
  SourceFileStatements = MultiLine | NoTrailingNewLine,
  Decorators = MultiLine | Optional | SpaceAfterList,
  TypeArguments = CommaDelimited | SpaceBetweenSiblings | SingleLine | AngleBrackets | Optional,
  TypeParameters = CommaDelimited | SpaceBetweenSiblings | SingleLine | AngleBrackets | Optional,
  Parameters = CommaDelimited | SpaceBetweenSiblings | SingleLine | Parenthesis,
  IndexSignatureParameters = CommaDelimited | SpaceBetweenSiblings | SingleLine | Indented | SquareBrackets,
  DocComment = MultiLine | AsteriskDelimited,
}
export const enum NewLineKind {
  CarriageReturnLineFeed = 0,
  LineFeed = 1,
}
export const enum NodeBuilderFlags {
  None = 0,
  NoTruncation = 1 << 0,
  WriteArrayAsGenericType = 1 << 1,
  GenerateNamesForShadowedTypeParams = 1 << 2,
  UseStructuralFallback = 1 << 3,
  ForbidIndexedAccessSymbolReferences = 1 << 4,
  WriteTypeArgumentsOfSignature = 1 << 5,
  UseFullyQualifiedType = 1 << 6,
  UseOnlyExternalAliasing = 1 << 7,
  SuppressAnyReturnType = 1 << 8,
  WriteTypeParametersInQualifiedName = 1 << 9,
  MultilineObjectLiterals = 1 << 10,
  WriteClassExpressionAsTypeLiteral = 1 << 11,
  UseTypeOfFunction = 1 << 12,
  OmitParameterModifiers = 1 << 13,
  UseAliasDefinedOutsideCurrentScope = 1 << 14,
  UseSingleQuotesForStringLiteralType = 1 << 28,
  NoTypeReduction = 1 << 29,
  AllowThisInObjectLiteral = 1 << 15,
  AllowQualifedNameInPlaceOfIdentifier = 1 << 16,
  AllowAnonymousIdentifier = 1 << 17,
  AllowEmptyUnionOrIntersection = 1 << 18,
  AllowEmptyTuple = 1 << 19,
  AllowUniqueESSymbolType = 1 << 20,
  AllowEmptyIndexInfoType = 1 << 21,
  AllowNodeModulesRelativePaths = 1 << 26,
  DoNotIncludeSymbolChain = 1 << 27,
  IgnoreErrors = AllowThisInObjectLiteral |
    AllowQualifedNameInPlaceOfIdentifier |
    AllowAnonymousIdentifier |
    AllowEmptyUnionOrIntersection |
    AllowEmptyTuple |
    AllowEmptyIndexInfoType |
    AllowNodeModulesRelativePaths,
  InObjectTypeLiteral = 1 << 22,
  InTypeAlias = 1 << 23,
  InInitialEntityName = 1 << 24,
  InReverseMappedType = 1 << 25,
}
export const enum NodeCheckFlags {
  TypeChecked = 0x00000001,
  LexicalThis = 0x00000002,
  CaptureThis = 0x00000004,
  CaptureNewTarget = 0x00000008,
  SuperInstance = 0x00000100,
  SuperStatic = 0x00000200,
  ContextChecked = 0x00000400,
  AsyncMethodWithSuper = 0x00000800,
  AsyncMethodWithSuperBinding = 0x00001000,
  CaptureArguments = 0x00002000,
  EnumValuesComputed = 0x00004000,
  LexicalModuleMergesWithClass = 0x00008000,
  LoopWithCapturedBlockScopedBinding = 0x00010000,
  ContainsCapturedBlockScopeBinding = 0x00020000,
  CapturedBlockScopedBinding = 0x00040000,
  BlockScopedBindingInLoop = 0x00080000,
  ClassWithBodyScopedClassBinding = 0x00100000,
  BodyScopedClassBinding = 0x00200000,
  NeedsLoopOutParameter = 0x00400000,
  AssignmentsMarked = 0x00800000,
  ClassWithConstructorReference = 0x01000000,
  ConstructorReferenceInClass = 0x02000000,
  ContainsClassWithPrivateIdentifiers = 0x04000000,
}
export const enum NodeFlags {
  None = 0,
  Let = 1 << 0,
  Const = 1 << 1,
  NestedNamespace = 1 << 2,
  Synthesized = 1 << 3,
  Namespace = 1 << 4,
  OptionalChain = 1 << 5,
  ExportContext = 1 << 6,
  ContainsThis = 1 << 7,
  HasImplicitReturn = 1 << 8,
  HasExplicitReturn = 1 << 9,
  GlobalAugmentation = 1 << 10,
  HasAsyncFunctions = 1 << 11,
  DisallowInContext = 1 << 12,
  YieldContext = 1 << 13,
  DecoratorContext = 1 << 14,
  AwaitContext = 1 << 15,
  ThisNodeHasError = 1 << 16,
  JavaScriptFile = 1 << 17,
  ThisNodeOrAnySubNodesHasError = 1 << 18,
  HasAggregatedChildData = 1 << 19,
  PossiblyContainsDynamicImport = 1 << 20,
  PossiblyContainsImportMeta = 1 << 21,
  Doc = 1 << 22,
  Ambient = 1 << 23,
  InWithStatement = 1 << 24,
  JsonFile = 1 << 25,
  TypeCached = 1 << 26,
  BlockScoped = Let | Const,
  ReachabilityCheckFlags = HasImplicitReturn | HasExplicitReturn,
  ReachabilityAndEmitFlags = ReachabilityCheckFlags | HasAsyncFunctions,
  ContextFlags = DisallowInContext | YieldContext | DecoratorContext | AwaitContext | JavaScriptFile | InWithStatement | Ambient,
  TypeExcludesFlags = YieldContext | AwaitContext,
  PermanentlySetIncrementalFlags = PossiblyContainsDynamicImport | PossiblyContainsImportMeta,
}
export const enum ObjectFlags {
  Class = 1 << 0,
  Interface = 1 << 1,
  Reference = 1 << 2,
  Tuple = 1 << 3,
  Anonymous = 1 << 4,
  Mapped = 1 << 5,
  Instantiated = 1 << 6,
  ObjectLiteral = 1 << 7,
  EvolvingArray = 1 << 8,
  ObjectLiteralPatternWithComputedProperties = 1 << 9,
  ContainsSpread = 1 << 10,
  ReverseMapped = 1 << 11,
  JsxAttributes = 1 << 12,
  MarkerType = 1 << 13,
  JSLiteral = 1 << 14,
  FreshLiteral = 1 << 15,
  ArrayLiteral = 1 << 16,
  ObjectRestType = 1 << 17,
  PrimitiveUnion = 1 << 18,
  ContainsWideningType = 1 << 19,
  ContainsObjectOrArrayLiteral = 1 << 20,
  NonInferrableType = 1 << 21,
  IsGenericObjectTypeComputed = 1 << 22,
  IsGenericObjectType = 1 << 23,
  IsGenericIndexTypeComputed = 1 << 24,
  IsGenericIndexType = 1 << 25,
  CouldContainTypeVariablesComputed = 1 << 26,
  CouldContainTypeVariables = 1 << 27,
  ContainsIntersections = 1 << 28,
  IsNeverIntersectionComputed = 1 << 28,
  IsNeverIntersection = 1 << 29,
  ClassOrInterface = Class | Interface,
  RequiresWidening = ContainsWideningType | ContainsObjectOrArrayLiteral,
  PropagatingFlags = ContainsWideningType | ContainsObjectOrArrayLiteral | NonInferrableType,
}
export const enum OuterExpressionKinds {
  Parentheses = 1 << 0,
  TypeAssertions = 1 << 1,
  NonNullAssertions = 1 << 2,
  PartiallyEmittedExpressions = 1 << 3,
  Assertions = TypeAssertions | NonNullAssertions,
  All = Parentheses | Assertions | PartiallyEmittedExpressions,
}
export const enum PragmaKindFlags {
  None = 0,
  TripleSlashXML = 1 << 0,
  SingleLine = 1 << 1,
  MultiLine = 1 << 2,
  All = TripleSlashXML | SingleLine | MultiLine,
  Default = All,
}
export const enum RelationComparisonResult {
  Succeeded = 1 << 0,
  Failed = 1 << 1,
  Reported = 1 << 2,
  ReportsUnmeasurable = 1 << 3,
  ReportsUnreliable = 1 << 4,
  ReportsMask = ReportsUnmeasurable | ReportsUnreliable,
}
export const enum ScriptKind {
  Unknown = 0,
  JS = 1,
  JSX = 2,
  TS = 3,
  TSX = 4,
  External = 5,
  JSON = 6,
  Deferred = 7,
}
export const enum ScriptTarget {
  JSON = 0,
  ES2020 = 7,
  ESNext = 99,
}
export const enum SignatureFlags {
  None = 0,
  HasRestParameter = 1 << 0,
  HasLiteralTypes = 1 << 1,
  IsInnerCallChain = 1 << 2,
  IsOuterCallChain = 1 << 3,
  IsUntypedSignatureInJSFile = 1 << 4,
  PropagatingFlags = HasRestParameter | HasLiteralTypes,
  CallChainFlags = IsInnerCallChain | IsOuterCallChain,
}
export const enum SignatureKind {
  Call,
  Construct,
}
export const enum StructureIsReused {
  Not = 0,
  SafeModules = 1 << 0,
  Completely = 1 << 1,
}
export const enum SymbolAccessibility {
  Accessible,
  NotAccessible,
  CannotBeNamed,
}
export const enum SymbolFlags {
  None = 0,
  FunctionScopedVariable = 1 << 0,
  BlockScopedVariable = 1 << 1,
  Property = 1 << 2,
  EnumMember = 1 << 3,
  Function = 1 << 4,
  Class = 1 << 5,
  Interface = 1 << 6,
  ConstEnum = 1 << 7,
  RegularEnum = 1 << 8,
  ValueModule = 1 << 9,
  NamespaceModule = 1 << 10,
  TypeLiteral = 1 << 11,
  ObjectLiteral = 1 << 12,
  Method = 1 << 13,
  Constructor = 1 << 14,
  GetAccessor = 1 << 15,
  SetAccessor = 1 << 16,
  Signature = 1 << 17,
  TypeParameter = 1 << 18,
  TypeAlias = 1 << 19,
  ExportValue = 1 << 20,
  Alias = 1 << 21,
  Prototype = 1 << 22,
  ExportStar = 1 << 23,
  Optional = 1 << 24,
  Transient = 1 << 25,
  Assignment = 1 << 26,
  ModuleExports = 1 << 27,
  All = FunctionScopedVariable |
    BlockScopedVariable |
    Property |
    EnumMember |
    Function |
    Class |
    Interface |
    ConstEnum |
    RegularEnum |
    ValueModule |
    NamespaceModule |
    TypeLiteral |
    ObjectLiteral |
    Method |
    Constructor |
    GetAccessor |
    SetAccessor |
    Signature |
    TypeParameter |
    TypeAlias |
    ExportValue |
    Alias |
    Prototype |
    ExportStar |
    Optional |
    Transient,
  Enum = RegularEnum | ConstEnum,
  Variable = FunctionScopedVariable | BlockScopedVariable,
  Value = Variable | Property | EnumMember | ObjectLiteral | Function | Class | Enum | ValueModule | Method | GetAccessor | SetAccessor,
  Type = Class | Interface | Enum | EnumMember | TypeLiteral | TypeParameter | TypeAlias,
  Namespace = ValueModule | NamespaceModule | Enum,
  Module = ValueModule | NamespaceModule,
  Accessor = GetAccessor | SetAccessor,
  FunctionScopedVariableExcludes = Value & ~FunctionScopedVariable,
  BlockScopedVariableExcludes = Value,
  ParameterExcludes = Value,
  PropertyExcludes = None,
  EnumMemberExcludes = Value | Type,
  FunctionExcludes = Value & ~(Function | ValueModule | Class),
  ClassExcludes = (Value | Type) & ~(ValueModule | Interface | Function),
  InterfaceExcludes = Type & ~(Interface | Class),
  RegularEnumExcludes = (Value | Type) & ~(RegularEnum | ValueModule),
  ConstEnumExcludes = (Value | Type) & ~ConstEnum,
  ValueModuleExcludes = Value & ~(Function | Class | RegularEnum | ValueModule),
  NamespaceModuleExcludes = 0,
  MethodExcludes = Value & ~Method,
  GetAccessorExcludes = Value & ~SetAccessor,
  SetAccessorExcludes = Value & ~GetAccessor,
  TypeParameterExcludes = Type & ~TypeParameter,
  TypeAliasExcludes = Type,
  AliasExcludes = Alias,
  ModuleMember = Variable | Function | Class | Interface | Enum | Module | TypeAlias | Alias,
  ExportHasLocal = Function | Class | Enum | ValueModule,
  BlockScoped = BlockScopedVariable | Class | Enum,
  PropertyOrAccessor = Property | Accessor,
  ClassMember = Method | Accessor | Property,
  ExportSupportsDefaultModifier = Class | Function | Interface,
  ExportDoesNotSupportDefaultModifier = ~ExportSupportsDefaultModifier,
  Classifiable = Class | Enum | TypeAlias | Interface | TypeParameter | Module | Alias,
  LateBindingContainer = Class | Interface | TypeLiteral | ObjectLiteral | Function,
}
export const enum SymbolFormatFlags {
  None = 0x00000000,
  WriteTypeParametersOrArguments = 0x00000001,
  UseOnlyExternalAliasing = 0x00000002,
  AllowAnyNodeKind = 0x00000004,
  UseAliasDefinedOutsideCurrentScope = 0x00000008,
  DoNotIncludeSymbolChain = 0x00000010,
}
export const enum SyntheticSymbolKind {
  UnionOrIntersection,
  Spread,
}
export const enum Ternary {
  False = 0,
  Maybe = 1,
  True = -1,
}
export const enum TokenFlags {
  None = 0,
  PrecedingLineBreak = 1 << 0,
  PrecedingDocComment = 1 << 1,
  Unterminated = 1 << 2,
  ExtendedEscape = 1 << 3,
  Scientific = 1 << 4,
  Octal = 1 << 5,
  HexSpecifier = 1 << 6,
  BinarySpecifier = 1 << 7,
  OctalSpecifier = 1 << 8,
  ContainsSeparator = 1 << 9,
  UnicodeEscape = 1 << 10,
  ContainsInvalidEscape = 1 << 11,
  BinaryOrOctalSpecifier = BinarySpecifier | OctalSpecifier,
  NumericLiteralFlags = Scientific | Octal | HexSpecifier | BinaryOrOctalSpecifier | ContainsSeparator,
}
export const enum TransformFlags {
  None = 0,
  ContainsTypeScript = 1 << 0,
  ContainsJsx = 1 << 1,
  ContainsESNext = 1 << 2,
  ContainsES2020 = 1 << 3,
  ContainsES2019 = 1 << 4,
  ContainsES2018 = 1 << 5,
  ContainsES2017 = 1 << 6,
  ContainsES2016 = 1 << 7,
  ContainsES2015 = 1 << 8,
  ContainsGenerator = 1 << 9,
  ContainsDestructuringAssignment = 1 << 10,
  ContainsTypeScriptClassSyntax = 1 << 11,
  ContainsLexicalThis = 1 << 12,
  ContainsRestOrSpread = 1 << 13,
  ContainsObjectRestOrSpread = 1 << 14,
  ContainsComputedPropertyName = 1 << 15,
  ContainsBlockScopedBinding = 1 << 16,
  ContainsBindingPattern = 1 << 17,
  ContainsYield = 1 << 18,
  ContainsAwait = 1 << 19,
  ContainsHoistedDeclarationOrCompletion = 1 << 20,
  ContainsDynamicImport = 1 << 21,
  ContainsClassFields = 1 << 22,
  HasComputedFlags = 1 << 29,
  AssertTypeScript = ContainsTypeScript,
  AssertJsx = ContainsJsx,
  AssertESNext = ContainsESNext,
  AssertES2020 = ContainsES2020,
  AssertES2019 = ContainsES2019,
  AssertES2018 = ContainsES2018,
  AssertES2017 = ContainsES2017,
  AssertES2016 = ContainsES2016,
  AssertES2015 = ContainsES2015,
  AssertGenerator = ContainsGenerator,
  AssertDestructuringAssignment = ContainsDestructuringAssignment,
  OuterExpressionExcludes = HasComputedFlags,
  PropertyAccessExcludes = OuterExpressionExcludes,
  NodeExcludes = PropertyAccessExcludes,
  ArrowFunctionExcludes = NodeExcludes |
    ContainsTypeScriptClassSyntax |
    ContainsBlockScopedBinding |
    ContainsYield |
    ContainsAwait |
    ContainsHoistedDeclarationOrCompletion |
    ContainsBindingPattern |
    ContainsObjectRestOrSpread,
  FunctionExcludes = NodeExcludes |
    ContainsTypeScriptClassSyntax |
    ContainsLexicalThis |
    ContainsBlockScopedBinding |
    ContainsYield |
    ContainsAwait |
    ContainsHoistedDeclarationOrCompletion |
    ContainsBindingPattern |
    ContainsObjectRestOrSpread,
  ConstructorExcludes = NodeExcludes |
    ContainsLexicalThis |
    ContainsBlockScopedBinding |
    ContainsYield |
    ContainsAwait |
    ContainsHoistedDeclarationOrCompletion |
    ContainsBindingPattern |
    ContainsObjectRestOrSpread,
  MethodOrAccessorExcludes = NodeExcludes |
    ContainsLexicalThis |
    ContainsBlockScopedBinding |
    ContainsYield |
    ContainsAwait |
    ContainsHoistedDeclarationOrCompletion |
    ContainsBindingPattern |
    ContainsObjectRestOrSpread,
  PropertyExcludes = NodeExcludes | ContainsLexicalThis,
  ClassExcludes = NodeExcludes | ContainsTypeScriptClassSyntax | ContainsComputedPropertyName,
  ModuleExcludes = NodeExcludes | ContainsTypeScriptClassSyntax | ContainsLexicalThis | ContainsBlockScopedBinding | ContainsHoistedDeclarationOrCompletion,
  TypeExcludes = ~ContainsTypeScript,
  ObjectLiteralExcludes = NodeExcludes | ContainsTypeScriptClassSyntax | ContainsComputedPropertyName | ContainsObjectRestOrSpread,
  ArrayLiteralOrCallOrNewExcludes = NodeExcludes | ContainsRestOrSpread,
  VariableDeclarationListExcludes = NodeExcludes | ContainsBindingPattern | ContainsObjectRestOrSpread,
  ParameterExcludes = NodeExcludes,
  CatchClauseExcludes = NodeExcludes | ContainsObjectRestOrSpread,
  BindingPatternExcludes = NodeExcludes | ContainsRestOrSpread,
  PropertyNamePropagatingFlags = ContainsLexicalThis,
}
export const enum TypeFlags {
  Any = 1 << 0,
  Unknown = 1 << 1,
  String = 1 << 2,
  Number = 1 << 3,
  Boolean = 1 << 4,
  Enum = 1 << 5,
  BigInt = 1 << 6,
  StringLiteral = 1 << 7,
  NumberLiteral = 1 << 8,
  BooleanLiteral = 1 << 9,
  EnumLiteral = 1 << 10,
  BigIntLiteral = 1 << 11,
  ESSymbol = 1 << 12,
  UniqueESSymbol = 1 << 13,
  Void = 1 << 14,
  Undefined = 1 << 15,
  Null = 1 << 16,
  Never = 1 << 17,
  TypeParameter = 1 << 18,
  Object = 1 << 19,
  Union = 1 << 20,
  Intersection = 1 << 21,
  Index = 1 << 22,
  IndexedAccess = 1 << 23,
  Conditional = 1 << 24,
  Substitution = 1 << 25,
  NonPrimitive = 1 << 26,
  AnyOrUnknown = Any | Unknown,
  Nullable = Undefined | Null,
  Literal = StringLiteral | NumberLiteral | BigIntLiteral | BooleanLiteral,
  Unit = Literal | UniqueESSymbol | Nullable,
  StringOrNumberLiteral = StringLiteral | NumberLiteral,
  StringOrNumberLiteralOrUnique = StringLiteral | NumberLiteral | UniqueESSymbol,
  DefinitelyFalsy = StringLiteral | NumberLiteral | BigIntLiteral | BooleanLiteral | Void | Undefined | Null,
  PossiblyFalsy = DefinitelyFalsy | String | Number | BigInt | Boolean,
  Intrinsic = Any | Unknown | String | Number | BigInt | Boolean | BooleanLiteral | ESSymbol | Void | Undefined | Null | Never | NonPrimitive,
  Primitive = String | Number | BigInt | Boolean | Enum | EnumLiteral | ESSymbol | Void | Undefined | Null | Literal | UniqueESSymbol,
  StringLike = String | StringLiteral,
  NumberLike = Number | NumberLiteral | Enum,
  BigIntLike = BigInt | BigIntLiteral,
  BooleanLike = Boolean | BooleanLiteral,
  EnumLike = Enum | EnumLiteral,
  ESSymbolLike = ESSymbol | UniqueESSymbol,
  VoidLike = Void | Undefined,
  DisjointDomains = NonPrimitive | StringLike | NumberLike | BigIntLike | BooleanLike | ESSymbolLike | VoidLike | Null,
  UnionOrIntersection = Union | Intersection,
  StructuredType = Object | Union | Intersection,
  TypeVariable = TypeParameter | IndexedAccess,
  InstantiableNonPrimitive = TypeVariable | Conditional | Substitution,
  InstantiablePrimitive = Index,
  Instantiable = InstantiableNonPrimitive | InstantiablePrimitive,
  StructuredOrInstantiable = StructuredType | Instantiable,
  ObjectFlagsType = Any | Nullable | Never | Object | Union | Intersection,
  Simplifiable = IndexedAccess | Conditional,
  Substructure = Object | Union | Intersection | Index | IndexedAccess | Conditional | Substitution,
  Narrowable = Any | Unknown | StructuredOrInstantiable | StringLike | NumberLike | BigIntLike | BooleanLike | ESSymbol | UniqueESSymbol | NonPrimitive,
  NotUnionOrUnit = Any | Unknown | ESSymbol | Object | NonPrimitive,
  NotPrimitiveUnion = Any | Unknown | Enum | Void | Never | StructuredOrInstantiable,
  IncludesMask = Any | Unknown | Primitive | Never | Object | Union | Intersection | NonPrimitive,
  IncludesStructuredOrInstantiable = TypeParameter,
  IncludesNonWideningType = Index,
  IncludesWildcard = IndexedAccess,
  IncludesEmptyObject = Conditional,
}
export const enum TypeFormatFlags {
  None = 0,
  NoTruncation = 1 << 0,
  WriteArrayAsGenericType = 1 << 1,
  UseStructuralFallback = 1 << 3,
  WriteTypeArgumentsOfSignature = 1 << 5,
  UseFullyQualifiedType = 1 << 6,
  SuppressAnyReturnType = 1 << 8,
  MultilineObjectLiterals = 1 << 10,
  WriteClassExpressionAsTypeLiteral = 1 << 11,
  UseTypeOfFunction = 1 << 12,
  OmitParameterModifiers = 1 << 13,
  UseAliasDefinedOutsideCurrentScope = 1 << 14,
  UseSingleQuotesForStringLiteralType = 1 << 28,
  NoTypeReduction = 1 << 29,
  AllowUniqueESSymbolType = 1 << 20,
  AddUndefined = 1 << 17,
  WriteArrowStyleSignature = 1 << 18,
  InArrayType = 1 << 19,
  InElementType = 1 << 21,
  InFirstTypeArgument = 1 << 22,
  InTypeAlias = 1 << 23,
  WriteOwnNameForAnyLike = 0,
  NodeBuilderFlagsMask = NoTruncation |
    WriteArrayAsGenericType |
    UseStructuralFallback |
    WriteTypeArgumentsOfSignature |
    UseFullyQualifiedType |
    SuppressAnyReturnType |
    MultilineObjectLiterals |
    WriteClassExpressionAsTypeLiteral |
    UseTypeOfFunction |
    OmitParameterModifiers |
    UseAliasDefinedOutsideCurrentScope |
    AllowUniqueESSymbolType |
    InTypeAlias |
    UseSingleQuotesForStringLiteralType |
    NoTypeReduction,
}
export const enum TypeMapKind {
  Simple,
  Array,
  Function,
  Composite,
  Merged,
}
export const enum TypePredicateKind {
  This,
  Identifier,
  AssertsThis,
  AssertsIdentifier,
}
export const enum UnionReduction {
  None = 0,
  Literal,
  Subtype,
}
export const enum VarianceFlags {
  Invariant = 0,
  Covariant = 1 << 0,
  Contravariant = 1 << 1,
  Bivariant = Covariant | Contravariant,
  Independent = 1 << 2,
  VarianceMask = Invariant | Covariant | Contravariant | Independent,
  Unmeasurable = 1 << 3,
  Unreliable = 1 << 4,
  AllowsStructuralFallback = Unmeasurable | Unreliable,
}
export const enum WatchDirectoryFlags {
  None = 0,
  Recursive = 1 << 0,
}
export const commentPragmas = {
  reference: {
    args: [
      { name: 'types', optional: true, captureSpan: true },
      { name: 'lib', optional: true, captureSpan: true },
      { name: 'path', optional: true, captureSpan: true },
      { name: 'no-default-lib', optional: true },
    ],
    kind: PragmaKindFlags.TripleSlashXML,
  },
  'amd-dependency': { args: [{ name: 'path' }, { name: 'name', optional: true }], kind: PragmaKindFlags.TripleSlashXML },
  'amd-module': { args: [{ name: 'name' }], kind: PragmaKindFlags.TripleSlashXML },
  'ts-check': { kind: PragmaKindFlags.SingleLine },
  'ts-nocheck': { kind: PragmaKindFlags.SingleLine },
  jsx: { args: [{ name: 'factory' }], kind: PragmaKindFlags.MultiLine },
} as const;
export enum ExitStatus {
  Success = 0,
  DiagnosticsPresent_OutputsSkipped = 1,
  DiagnosticsPresent_OutputsGenerated = 2,
  InvalidProject_OutputsSkipped = 3,
  ProjectReferenceCycle_OutputsSkipped = 4,
  ProjectReferenceCycle_OutputsSkupped = 4,
}
export enum ModuleKind {
  None = 0,
  CommonJS = 1,
  AMD = 2,
  UMD = 3,
  System = 4,
  ES2015 = 5,
  ES2020 = 6,
  ESNext = 99,
}
export enum ModuleResolutionKind {
  Classic = 1,
  NodeJs = 2,
}
export enum PollingWatchKind {
  FixedInterval,
  PriorityInterval,
  DynamicPriority,
}
export enum RefFileKind {
  Import,
  ReferenceFile,
  TypeReferenceDirective,
}
export enum TypeReferenceSerializationKind {
  Unknown,
  TypeWithConstructSignatureAndValue,
  VoidNullableOrNeverType,
  NumberLikeType,
  BigIntLikeType,
  StringLikeType,
  BooleanType,
  ArrayLikeType,
  ESSymbolType,
  Promise,
  TypeWithCallSignature,
  ObjectType,
}
export enum WatchDirectoryKind {
  UseFsEvents,
  FixedPollingInterval,
  DynamicPriorityPolling,
}
export enum WatchFileKind {
  FixedPollingInterval,
  PriorityPollingInterval,
  DynamicPriorityPolling,
  UseFsEvents,
  UseFsEventsOnParentDirectory,
}
