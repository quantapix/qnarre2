import * as qd from '../diagnostic';
import * as qt from '../type';
import * as qu from '../util';
export * from '../type';
export interface Frame extends qt.Frame {
  check: unknown;
  instantiate: unknown;
  resolve: unknown;
}
export const enum IterationUse {
  AllowsSyncIterablesFlag = 1 << 0,
  AllowsAsyncIterablesFlag = 1 << 1,
  AllowsStringInputFlag = 1 << 2,
  ForOfFlag = 1 << 3,
  YieldStarFlag = 1 << 4,
  SpreadFlag = 1 << 5,
  DestructuringFlag = 1 << 6,
  Elem = AllowsSyncIterablesFlag,
  Spread = AllowsSyncIterablesFlag | SpreadFlag,
  Destructuring = AllowsSyncIterablesFlag | DestructuringFlag,
  ForOf = AllowsSyncIterablesFlag | AllowsStringInputFlag | ForOfFlag,
  ForAwaitOf = AllowsSyncIterablesFlag | AllowsAsyncIterablesFlag | AllowsStringInputFlag | ForOfFlag,
  YieldStar = AllowsSyncIterablesFlag | YieldStarFlag,
  AsyncYieldStar = AllowsSyncIterablesFlag | AllowsAsyncIterablesFlag | YieldStarFlag,
  GeneratorReturnType = AllowsSyncIterablesFlag,
  AsyncGeneratorReturnType = AllowsAsyncIterablesFlag,
}
export const enum IterationTypeKind {
  Yield,
  Return,
  Next,
}
export interface IterationTypesResolver {
  iterableCacheKey: 'iterationTypesOfAsyncIterable' | 'iterationTypesOfIterable';
  iteratorCacheKey: 'iterationTypesOfAsyncIterator' | 'iterationTypesOfIterator';
  iteratorSymbolName: 'asyncIterator' | 'iterator';
  getGlobalIteratorType: (reportErrors: boolean) => qt.GenericType;
  getGlobalIterableType: (reportErrors: boolean) => qt.GenericType;
  getGlobalIterableIteratorType: (reportErrors: boolean) => qt.GenericType;
  getGlobalGeneratorType: (reportErrors: boolean) => qt.GenericType;
  resolveIterationType: (type: qt.Type, errorNode: qt.Node | undefined) => qt.Type | undefined;
  mustHaveANextMethodDiagnostic: qd.Message;
  mustBeAMethodDiagnostic: qd.Message;
  mustHaveAValueDiagnostic: qd.Message;
}
export const enum WideningKind {
  Normal,
  FunctionReturn,
  GeneratorNext,
  GeneratorYield,
}
export const enum ExpandingFlags {
  None = 0,
  Source = 1,
  Target = 1 << 1,
  Both = Source | Target,
}
export const enum TypeFacts {
  None = 0,
  TypeofEQString = 1 << 0,
  TypeofEQNumber = 1 << 1,
  TypeofEQBigInt = 1 << 2,
  TypeofEQBoolean = 1 << 3,
  TypeofESymbol = 1 << 4,
  TypeofEQObject = 1 << 5,
  TypeofEQFunction = 1 << 6,
  TypeofEQHostObject = 1 << 7,
  TypeofNEString = 1 << 8,
  TypeofNENumber = 1 << 9,
  TypeofNEBigInt = 1 << 10,
  TypeofNEBoolean = 1 << 11,
  TypeofNESymbol = 1 << 12,
  TypeofNEObject = 1 << 13,
  TypeofNEFunction = 1 << 14,
  TypeofNEHostObject = 1 << 15,
  EQUndefined = 1 << 16,
  EQNull = 1 << 17,
  EQUndefinedOrNull = 1 << 18,
  NEUndefined = 1 << 19,
  NENull = 1 << 20,
  NEUndefinedOrNull = 1 << 21,
  Truthy = 1 << 22,
  Falsy = 1 << 23,
  All = (1 << 24) - 1,
  BaseStringStrictFacts = TypeofEQString |
    TypeofNENumber |
    TypeofNEBigInt |
    TypeofNEBoolean |
    TypeofNESymbol |
    TypeofNEObject |
    TypeofNEFunction |
    TypeofNEHostObject |
    NEUndefined |
    NENull |
    NEUndefinedOrNull,
  BaseStringFacts = BaseStringStrictFacts | EQUndefined | EQNull | EQUndefinedOrNull | Falsy,
  StringStrictFacts = BaseStringStrictFacts | Truthy | Falsy,
  StringFacts = BaseStringFacts | Truthy,
  EmptyStringStrictFacts = BaseStringStrictFacts | Falsy,
  EmptyStringFacts = BaseStringFacts,
  NonEmptyStringStrictFacts = BaseStringStrictFacts | Truthy,
  NonEmptyStringFacts = BaseStringFacts | Truthy,
  BaseNumberStrictFacts = TypeofEQNumber |
    TypeofNEString |
    TypeofNEBigInt |
    TypeofNEBoolean |
    TypeofNESymbol |
    TypeofNEObject |
    TypeofNEFunction |
    TypeofNEHostObject |
    NEUndefined |
    NENull |
    NEUndefinedOrNull,
  BaseNumberFacts = BaseNumberStrictFacts | EQUndefined | EQNull | EQUndefinedOrNull | Falsy,
  NumberStrictFacts = BaseNumberStrictFacts | Truthy | Falsy,
  NumberFacts = BaseNumberFacts | Truthy,
  ZeroNumberStrictFacts = BaseNumberStrictFacts | Falsy,
  ZeroNumberFacts = BaseNumberFacts,
  NonZeroNumberStrictFacts = BaseNumberStrictFacts | Truthy,
  NonZeroNumberFacts = BaseNumberFacts | Truthy,
  BaseBigIntStrictFacts = TypeofEQBigInt |
    TypeofNEString |
    TypeofNENumber |
    TypeofNEBoolean |
    TypeofNESymbol |
    TypeofNEObject |
    TypeofNEFunction |
    TypeofNEHostObject |
    NEUndefined |
    NENull |
    NEUndefinedOrNull,
  BaseBigIntFacts = BaseBigIntStrictFacts | EQUndefined | EQNull | EQUndefinedOrNull | Falsy,
  BigIntStrictFacts = BaseBigIntStrictFacts | Truthy | Falsy,
  BigIntFacts = BaseBigIntFacts | Truthy,
  ZeroBigIntStrictFacts = BaseBigIntStrictFacts | Falsy,
  ZeroBigIntFacts = BaseBigIntFacts,
  NonZeroBigIntStrictFacts = BaseBigIntStrictFacts | Truthy,
  NonZeroBigIntFacts = BaseBigIntFacts | Truthy,
  BaseBooleanStrictFacts = TypeofEQBoolean |
    TypeofNEString |
    TypeofNENumber |
    TypeofNEBigInt |
    TypeofNESymbol |
    TypeofNEObject |
    TypeofNEFunction |
    TypeofNEHostObject |
    NEUndefined |
    NENull |
    NEUndefinedOrNull,
  BaseBooleanFacts = BaseBooleanStrictFacts | EQUndefined | EQNull | EQUndefinedOrNull | Falsy,
  BooleanStrictFacts = BaseBooleanStrictFacts | Truthy | Falsy,
  BooleanFacts = BaseBooleanFacts | Truthy,
  FalseStrictFacts = BaseBooleanStrictFacts | Falsy,
  FalseFacts = BaseBooleanFacts,
  TrueStrictFacts = BaseBooleanStrictFacts | Truthy,
  TrueFacts = BaseBooleanFacts | Truthy,
  SymbolStrictFacts = TypeofESymbol |
    TypeofNEString |
    TypeofNENumber |
    TypeofNEBigInt |
    TypeofNEBoolean |
    TypeofNEObject |
    TypeofNEFunction |
    TypeofNEHostObject |
    NEUndefined |
    NENull |
    NEUndefinedOrNull |
    Truthy,
  SymbolFacts = SymbolStrictFacts | EQUndefined | EQNull | EQUndefinedOrNull | Falsy,
  ObjectStrictFacts = TypeofEQObject |
    TypeofEQHostObject |
    TypeofNEString |
    TypeofNENumber |
    TypeofNEBigInt |
    TypeofNEBoolean |
    TypeofNESymbol |
    TypeofNEFunction |
    NEUndefined |
    NENull |
    NEUndefinedOrNull |
    Truthy,
  ObjectFacts = ObjectStrictFacts | EQUndefined | EQNull | EQUndefinedOrNull | Falsy,
  FunctionStrictFacts = TypeofEQFunction |
    TypeofEQHostObject |
    TypeofNEString |
    TypeofNENumber |
    TypeofNEBigInt |
    TypeofNEBoolean |
    TypeofNESymbol |
    TypeofNEObject |
    NEUndefined |
    NENull |
    NEUndefinedOrNull |
    Truthy,
  FunctionFacts = FunctionStrictFacts | EQUndefined | EQNull | EQUndefinedOrNull | Falsy,
  UndefinedFacts = TypeofNEString |
    TypeofNENumber |
    TypeofNEBigInt |
    TypeofNEBoolean |
    TypeofNESymbol |
    TypeofNEObject |
    TypeofNEFunction |
    TypeofNEHostObject |
    EQUndefined |
    EQUndefinedOrNull |
    NENull |
    Falsy,
  NullFacts = TypeofEQObject |
    TypeofNEString |
    TypeofNENumber |
    TypeofNEBigInt |
    TypeofNEBoolean |
    TypeofNESymbol |
    TypeofNEFunction |
    TypeofNEHostObject |
    EQNull |
    EQUndefinedOrNull |
    NEUndefined |
    Falsy,
  EmptyObjectStrictFacts = All & ~(EQUndefined | EQNull | EQUndefinedOrNull),
  EmptyObjectFacts = All,
}
export const typeofEQFacts: qu.QReadonlyMap<TypeFacts> = new qu.QMap({
  string: TypeFacts.TypeofEQString,
  number: TypeFacts.TypeofEQNumber,
  bigint: TypeFacts.TypeofEQBigInt,
  boolean: TypeFacts.TypeofEQBoolean,
  symbol: TypeFacts.TypeofESymbol,
  undefined: TypeFacts.EQUndefined,
  object: TypeFacts.TypeofEQObject,
  function: TypeFacts.TypeofEQFunction,
});
export const typeofNEFacts: qu.QReadonlyMap<TypeFacts> = new qu.QMap({
  string: TypeFacts.TypeofNEString,
  number: TypeFacts.TypeofNENumber,
  bigint: TypeFacts.TypeofNEBigInt,
  boolean: TypeFacts.TypeofNEBoolean,
  symbol: TypeFacts.TypeofNESymbol,
  undefined: TypeFacts.NEUndefined,
  object: TypeFacts.TypeofNEObject,
  function: TypeFacts.TypeofNEFunction,
});
export type TypeSystemEntity = qt.Node | qt.Symbol | qt.Type | qt.Signature;
export const enum TypeSystemPropertyName {
  Type,
  ResolvedBaseConstructorType,
  DeclaredType,
  ResolvedReturnType,
  ImmediateBaseConstraint,
  EnumTagType,
  ResolvedTypeArguments,
}
export const enum CheckMode {
  Normal = 0,
  Contextual = 1 << 0,
  Inferential = 1 << 1,
  SkipContextSensitive = 1 << 2,
  SkipGenericFunctions = 1 << 3,
  IsForSignatureHelp = 1 << 4,
}
export const enum AccessFlags {
  None = 0,
  NoIndexSignatures = 1 << 0,
  Writing = 1 << 1,
  CacheSymbol = 1 << 2,
  NoTupleBoundsCheck = 1 << 3,
}
export const enum SignatureCheckMode {
  BivariantCallback = 1 << 0,
  StrictCallback = 1 << 1,
  IgnoreReturnTypes = 1 << 2,
  StrictArity = 1 << 3,
  Callback = BivariantCallback | StrictCallback,
}
export const enum IntersectionState {
  None = 0,
  Source = 1 << 0,
  Target = 1 << 1,
  PropertyCheck = 1 << 2,
  InPropertyCheck = 1 << 3,
}
export const enum MappedTypeModifiers {
  IncludeReadonly = 1 << 0,
  ExcludeReadonly = 1 << 1,
  IncludeOptional = 1 << 2,
  ExcludeOptional = 1 << 3,
}
export const enum MembersOrExportsResolutionKind {
  resolvedExports = 'resolvedExports',
  resolvedMembers = 'resolvedMembers',
}
export const enum UnusedKind {
  Local,
  Param,
}
export type AddUnusedDiagnostic = (containingNode: qt.Node, type: UnusedKind, diagnostic: qd.DiagnosticWithLocation) => void;
export const enum DeclarationMeaning {
  GetAccessor = 1,
  SetAccessor = 2,
  PropertyAssignment = 4,
  Method = 8,
  GetOrSetAccessor = GetAccessor | SetAccessor,
  PropertyAssignmentOrMethod = PropertyAssignment | Method,
}
export const enum DeclarationSpaces {
  None = 0,
  ExportValue = 1 << 0,
  ExportType = 1 << 1,
  ExportNamespace = 1 << 2,
}
