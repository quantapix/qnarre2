import * as qb from './base';
import { Syntax } from './syntax';
import * as qy from './syntax';

export type AssertsToken = Token<Syntax.AssertsKeyword>;
export type AsteriskToken = Token<Syntax.AsteriskToken>;
export type AwaitKeywordToken = Token<Syntax.AwaitKeyword>;
export type ColonToken = Token<Syntax.ColonToken>;
export type Dot3Token = Token<Syntax.Dot3Token>;
export type DotToken = Token<Syntax.DotToken>;
export type EndOfFileToken = Token<Syntax.EndOfFileToken> & JSDocContainer;
export type EqualsGreaterThanToken = Token<Syntax.EqualsGreaterThanToken>;
export type EqualsToken = Token<Syntax.EqualsToken>;
export type ExclamationToken = Token<Syntax.ExclamationToken>;
export type MinusToken = Token<Syntax.MinusToken>;
export type PlusToken = Token<Syntax.PlusToken>;
export type QuestionDotToken = Token<Syntax.QuestionDotToken>;
export type QuestionToken = Token<Syntax.QuestionToken>;
export type ReadonlyToken = Token<Syntax.ReadonlyKeyword>;

export type ObjectTypeDeclaration = ClassLikeDeclaration | InterfaceDeclaration | TypeLiteralNode;
export type OptionalChain = PropertyAccessChain | ElementAccessChain | CallChain | NonNullChain;
export type OptionalChainRoot = PropertyAccessChainRoot | ElementAccessChainRoot | CallChainRoot;
export interface PrologueDirective extends ExpressionStatement {
  expression: StringLiteral;
}
export interface PromiseOrAwaitableType extends ObjectType, UnionType {
  promiseTypeOfPromiseConstructor?: Type;
  promisedTypeOfPromise?: Type;
  awaitedTypeOfType?: Type;
}
export interface PropertyAccessEntityNameExpression extends PropertyAccessExpression {
  _propertyAccessExpressionLikeQualifiedNameBrand?: any;
  expression: EntityNameExpression;
  name: Identifier;
}
export interface RedirectInfo {
  readonly redirectTarget: SourceFile;
  readonly unredirected: SourceFile;
}
export interface ResolvedType extends ObjectType, UnionOrIntersectionType {
  members: SymbolTable;
  properties: Symbol[];
  callSignatures: readonly Signature[];
  constructSignatures: readonly Signature[];
}
export interface ReverseMappedType extends ObjectType {
  source: Type;
  mappedType: MappedType;
  constraintType: IndexType;
}
export interface StringLiteralType extends LiteralType {
  value: string;
}
export type StructuredType = ObjectType | UnionType | IntersectionType;
export interface SyntheticDefaultModuleType extends Type {
  syntheticType?: Type;
}
export interface SubstitutionType extends InstantiableType {
  baseType: Type;
  substitute: Type;
}
export interface SuperElementAccessExpression extends ElementAccessExpression {
  expression: SuperExpression;
}
export type SuperProperty = SuperPropertyAccessExpression | SuperElementAccessExpression;

export type ModuleBody = NamespaceBody | JSDocNamespaceBody;
export type ModuleName = Identifier | StringLiteral;
export type ModuleReference = EntityName | ExternalModuleReference;
export type NamedExportBindings = NamespaceExport | NamedExports;
export type NamedImportBindings = NamespaceImport | NamedImports;
export type NamedImportsOrExports = NamedImports | NamedExports;
export type NamespaceBody = ModuleBlock | NamespaceDeclaration;
export interface NamespaceDeclaration extends ModuleDeclaration {
  name: Identifier;
  body: NamespaceBody;
}

export type AccessExpression = PropertyAccessExpression | ElementAccessExpression;
export type AccessorDeclaration = GetAccessorDeclaration | SetAccessorDeclaration;
export type AdditiveOperator = Syntax.PlusToken | Syntax.MinusToken;
export type AdditiveOperatorOrHigher = MultiplicativeOperatorOrHigher | AdditiveOperator;
export interface AllAccessorDeclarations {
  firstAccessor: AccessorDeclaration;
  secondAccessor: AccessorDeclaration | undefined;
  getAccessor: GetAccessorDeclaration | undefined;
  setAccessor: SetAccessorDeclaration | undefined;
}
export interface AmbientModuleDeclaration extends ModuleDeclaration {
  body?: ModuleBlock;
}
export interface AmdDependency {
  path: string;
  name?: string;
}
export interface AnonymousType extends ObjectType {
  target?: AnonymousType;
  mapper?: TypeMapper;
}
export type AnyImportOrRequire = AnyImportSyntax | RequireVariableDeclaration;
export type AnyImportOrReExport = AnyImportSyntax | ExportDeclaration;
export type AnyImportSyntax = ImportDeclaration | ImportEqualsDeclaration;
// prettier-ignore
export type AnyValidImportOrReExport = | ((ImportDeclaration | ExportDeclaration) & { moduleSpecifier: StringLiteral }) | (ImportEqualsDeclaration & { moduleReference: ExternalModuleReference & { expression: StringLiteral } }) | RequireOrImportCall | ValidImportTypeNode;
export type ArrayBindingElement = BindingElement | OmittedExpression;
export type ArrayBindingOrAssignmentPattern = ArrayBindingPattern | ArrayLiteralExpression;
export interface ArrayBindingPattern extends Node {
  kind: Syntax.ArrayBindingPattern;
  parent: VariableDeclaration | ParameterDeclaration | BindingElement;
  elements: Nodes<ArrayBindingElement>;
}
export interface ArrayDestructuringAssignment extends AssignmentExpression<EqualsToken> {
  left: ArrayLiteralExpression;
}
export interface ArrayLiteralExpression extends PrimaryExpression {
  kind: Syntax.ArrayLiteralExpression;
  elements: Nodes<Expression>;
  multiLine?: boolean;
}
export interface ArrayTypeNode extends TypeNode {
  kind: Syntax.ArrayType;
  elementType: TypeNode;
}
export interface ArrowFunction extends FunctionLikeDeclarationBase, Expression, JSDocContainer {
  kind: Syntax.ArrowFunction;
  equalsGreaterThanToken: EqualsGreaterThanToken;
  body: ConciseBody;
  name: never;
}
export interface AsExpression extends Expression {
  kind: Syntax.AsExpression;
  expression: Expression;
  type: TypeNode;
}
export type AssertionExpression = TypeAssertion | AsExpression;
export interface AssertsIdentifierTypePredicate extends TypePredicateBase {
  kind: TypePredicateKind.AssertsIdentifier;
  parameterName: string;
  parameterIndex: number;
  type: Type | undefined;
}
export interface AssertsThisTypePredicate extends TypePredicateBase {
  kind: TypePredicateKind.AssertsThis;
  parameterName: undefined;
  parameterIndex: undefined;
  type: Type | undefined;
}
export interface AssignmentExpression<TOperator extends AssignmentOperatorToken> extends BinaryExpression {
  left: LeftHandSideExpression;
  operatorToken: TOperator;
}
export type AssignmentOperator = Syntax.EqualsToken | CompoundAssignmentOperator;
export type AssignmentOperatorOrHigher = Syntax.Question2Token | LogicalOperatorOrHigher | AssignmentOperator;
export type AssignmentOperatorToken = Token<AssignmentOperator>;
export type AssignmentPattern = ArrayLiteralExpression | ObjectLiteralExpression;
export interface AwaitExpression extends UnaryExpression {
  kind: Syntax.AwaitExpression;
  expression: UnaryExpression;
}
export type BaseType = ObjectType | IntersectionType | TypeVariable;
export interface BigIntLiteral extends LiteralExpression {
  kind: Syntax.BigIntLiteral;
}
export interface BigIntLiteralType extends LiteralType {
  value: PseudoBigInt;
}
export interface BinaryExpression extends Expression, Declaration {
  kind: Syntax.BinaryExpression;
  left: Expression;
  operatorToken: BinaryOperatorToken;
  right: Expression;
}
export type BinaryOperator = AssignmentOperatorOrHigher | Syntax.CommaToken;
export type BinaryOperatorToken = Token<BinaryOperator>;
export type BindableAccessExpression = PropertyAccessEntityNameExpression | BindableElementAccessExpression;
export type BindableElementAccessExpression = ElementAccessExpression & {
  expression: BindableStaticNameExpression;
};
export type BindableObjectDefinePropertyCall = CallExpression & {
  arguments: { 0: BindableStaticNameExpression; 1: StringLiteralLike | NumericLiteral; 2: ObjectLiteralExpression };
};
export interface BindablePropertyAssignmentExpression extends BinaryExpression {
  left: BindableAccessExpression;
}
export interface BindableStaticPropertyAssignmentExpression extends BinaryExpression {
  left: BindableStaticAccessExpression;
}
export type BindableStaticAccessExpression = PropertyAccessEntityNameExpression | BindableStaticElementAccessExpression;
export type BindableStaticElementAccessExpression = LiteralLikeElementAccessExpression & {
  expression: BindableStaticNameExpression;
};
export type BindableStaticNameExpression = EntityNameExpression | BindableStaticElementAccessExpression;

export interface BindingElement extends NamedDeclaration {
  kind: Syntax.BindingElement;
  parent?: BindingPattern;
  propertyName?: PropertyName;
  dot3Token?: Dot3Token;
  name: BindingName;
  initializer?: Expression;
}
export type BindingElementGrandparent = BindingElement['parent']['parent'];
export type BindingName = Identifier | BindingPattern;
// prettier-ignore
export type BindingOrAssignmentElement = | VariableDeclaration | ParameterDeclaration | BindingElement | PropertyAssignment | ShorthandPropertyAssignment | SpreadAssignment | OmittedExpression | SpreadElement | ArrayLiteralExpression | ObjectLiteralExpression | AssignmentExpression<EqualsToken> | Identifier | PropertyAccessExpression | ElementAccessExpression;
export type BindingOrAssignmentElementRestIndicator = Dot3Token | SpreadElement | SpreadAssignment;
export type BindingOrAssignmentElementTarget = BindingOrAssignmentPattern | Identifier | PropertyAccessExpression | ElementAccessExpression | OmittedExpression;
export type BindingOrAssignmentPattern = ObjectBindingOrAssignmentPattern | ArrayBindingOrAssignmentPattern;
export type BindingPattern = ArrayBindingPattern | ObjectBindingPattern;
export type BitwiseOperator = Syntax.AmpersandToken | Syntax.BarToken | Syntax.CaretToken;
export type BitwiseOperatorOrHigher = EqualityOperatorOrHigher | BitwiseOperator;
export interface Block extends Statement {
  kind: Syntax.Block;
  statements: Nodes<Statement>;
  multiLine?: boolean;
}
export type BlockLike = SourceFile | Block | ModuleBlock | CaseOrDefaultClause;
export interface BooleanLiteral extends PrimaryExpression, TypeNode {
  kind: Syntax.TrueKeyword | Syntax.FalseKeyword;
}
export interface BreakStatement extends Statement {
  kind: Syntax.BreakStatement;
  label?: Identifier;
}
export type BreakOrContinueStatement = BreakStatement | ContinueStatement;
export interface Bundle extends Node {
  kind: Syntax.Bundle;
  prepends: readonly (InputFiles | UnparsedSource)[];
  sourceFiles: readonly SourceFile[];
  syntheticFileReferences?: readonly FileReference[];
  syntheticTypeReferences?: readonly FileReference[];
  syntheticLibReferences?: readonly FileReference[];
  hasNoDefaultLib?: boolean;
}
export interface BuildInfo {
  bundle?: BundleBuildInfo;
  program?: ProgramBuildInfo;
  version: string;
}
export interface BundleBuildInfo {
  js?: BundleFileInfo;
  dts?: BundleFileInfo;
  commonSourceDirectory: string;
  sourceFiles: readonly string[];
}
export interface BundleFileEmitHelpers extends BundleFileSectionBase {
  kind: BundleFileSectionKind.EmitHelpers;
  data: string;
}
export interface BundleFileHasNoDefaultLib extends BundleFileSectionBase {
  kind: BundleFileSectionKind.NoDefaultLib;
}
export interface BundleFileInfo {
  sections: BundleFileSection[];
  sources?: SourceFileInfo;
}
export interface BundleFilePrepend extends BundleFileSectionBase {
  kind: BundleFileSectionKind.Prepend;
  data: string;
  texts: BundleFileTextLike[];
}
export interface BundleFilePrologue extends BundleFileSectionBase {
  kind: BundleFileSectionKind.Prologue;
  data: string;
}
export interface BundleFileReference extends BundleFileSectionBase {
  kind: BundleFileSectionKind.Reference | BundleFileSectionKind.Type | BundleFileSectionKind.Lib;
  data: string;
}
export type BundleFileSection = BundleFilePrologue | BundleFileEmitHelpers | BundleFileHasNoDefaultLib | BundleFileReference | BundleFilePrepend | BundleFileTextLike;
export interface BundleFileSectionBase extends qb.Range {
  kind: BundleFileSectionKind;
  data?: string;
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
export type BundleFileTextLikeKind = BundleFileSectionKind.Text | BundleFileSectionKind.Internal;
export interface BundleFileTextLike extends BundleFileSectionBase {
  kind: BundleFileTextLikeKind;
}
export interface CallChain extends CallExpression {
  _optionalChainBrand: any;
}
export interface CallChainRoot extends CallChain {
  questionDotToken: QuestionDotToken;
}
export interface CallExpression extends LeftHandSideExpression, Declaration {
  kind: Syntax.CallExpression;
  expression: LeftHandSideExpression;
  questionDotToken?: QuestionDotToken;
  typeArguments?: Nodes<TypeNode>;
  arguments: Nodes<Expression>;
}
export type CallLikeExpression = CallExpression | NewExpression | TaggedTemplateExpression | Decorator | JsxOpeningLikeElement;
export interface CheckJsDirective extends qb.Range {
  enabled: boolean;
}
export interface CallSignatureDeclaration extends SignatureDeclarationBase, TypeElement {
  kind: Syntax.CallSignature;
}
export interface CaseBlock extends Node {
  kind: Syntax.CaseBlock;
  parent: SwitchStatement;
  clauses: Nodes<CaseOrDefaultClause>;
}
export interface CaseClause extends Node {
  kind: Syntax.CaseClause;
  parent: CaseBlock;
  expression: Expression;
  statements: Nodes<Statement>;
  fallthroughFlowNode?: FlowNode;
}
export interface CatchClause extends Node {
  kind: Syntax.CatchClause;
  parent: TryStatement;
  variableDeclaration?: VariableDeclaration;
  block: Block;
}
export type CaseOrDefaultClause = CaseClause | DefaultClause;
export const enum CheckFlags {
  Instantiated = 1 << 0, // Instantiated symbol
  SyntheticProperty = 1 << 1, // Property in union or intersection type
  SyntheticMethod = 1 << 2, // Method in union or intersection type
  Readonly = 1 << 3, // Readonly transient symbol
  ReadPartial = 1 << 4, // Synthetic property present in some but not all constituents
  WritePartial = 1 << 5, // Synthetic property present in some but only satisfied by an index signature in others
  HasNonUniformType = 1 << 6, // Synthetic property with non-uniform type in constituents
  HasLiteralType = 1 << 7, // Synthetic property with at least one literal type in constituents
  ContainsPublic = 1 << 8, // Synthetic property with public constituent(s)
  ContainsProtected = 1 << 9, // Synthetic property with protected constituent(s)
  ContainsPrivate = 1 << 10, // Synthetic property with private constituent(s)
  ContainsStatic = 1 << 11, // Synthetic property with static constituent(s)
  Late = 1 << 12, // Late-bound symbol for a computed property with a dynamic name
  ReverseMapped = 1 << 13, // Property of reverse-inferred homomorphic mapped type
  OptionalParameter = 1 << 14, // Optional parameter
  RestParameter = 1 << 15, // Rest parameter
  DeferredType = 1 << 16, // Calculation of the type of this symbol is deferred due to processing costs, should be fetched with `getTypeOfSymbolWithDeferredType`
  HasNeverType = 1 << 17, // Synthetic property with at least one never type in constituents
  Mapped = 1 << 18, // Property of mapped type
  StripOptional = 1 << 19, // Strip optionality in mapped property
  Synthetic = SyntheticProperty | SyntheticMethod,
  Discriminant = HasNonUniformType | HasLiteralType,
  Partial = ReadPartial | WritePartial,
}
export interface ClassDeclaration extends ClassLikeDeclarationBase, DeclarationStatement {
  kind: Syntax.ClassDeclaration;
  name?: Identifier;
}
export interface ClassElement extends NamedDeclaration {
  _classElementBrand: any;
  name?: PropertyName;
}
export interface ClassExpression extends ClassLikeDeclarationBase, PrimaryExpression {
  kind: Syntax.ClassExpression;
}
export type ClassLikeDeclaration = ClassDeclaration | ClassExpression;
export interface ClassLikeDeclarationBase extends NamedDeclaration, JSDocContainer {
  kind: Syntax.ClassDeclaration | Syntax.ClassExpression;
  name?: Identifier;
  typeParameters?: Nodes<TypeParameterDeclaration>;
  heritageClauses?: Nodes<HeritageClause>;
  members: Nodes<ClassElement>;
}
export interface CommaListExpression extends Expression {
  kind: Syntax.CommaListExpression;
  elements: Nodes<Expression>;
}
export interface CommentDirective {
  range: qb.Range;
  type: CommentDirectiveType;
}
export const enum CommentDirectiveType {
  ExpectError,
  Ignore,
}
export interface CommentRange extends qb.Range {
  hasTrailingNewLine?: boolean;
  kind: qy.CommentKind;
}
// prettier-ignore
export type CompoundAssignmentOperator = | Syntax.PlusEqualsToken | Syntax.MinusEqualsToken | Syntax.Asterisk2EqualsToken | Syntax.AsteriskEqualsToken | Syntax.SlashEqualsToken | Syntax.AmpersandEqualsToken | Syntax.BarEqualsToken | Syntax.CaretEqualsToken | Syntax.LessThan2EqualsToken | Syntax.GreaterThan3EqualsToken | Syntax.GreaterThan2EqualsToken;
export interface ComputedPropertyName extends Node {
  parent: Declaration;
  kind: Syntax.ComputedPropertyName;
  expression: Expression;
}
export type ConciseBody = FunctionBody | Expression;
export interface ConditionalExpression extends Expression {
  kind: Syntax.ConditionalExpression;
  condition: Expression;
  questionToken: QuestionToken;
  whenTrue: Expression;
  colonToken: ColonToken;
  whenFalse: Expression;
}
export interface ConditionalRoot {
  node: ConditionalTypeNode;
  checkType: Type;
  extendsType: Type;
  trueType: Type;
  falseType: Type;
  isDistributive: boolean;
  inferTypeParameters?: TypeParameter[];
  outerTypeParameters?: TypeParameter[];
  instantiations?: qb.QMap<Type>;
  aliasSymbol?: Symbol;
  aliasTypeArguments?: Type[];
}
export interface ConditionalType extends InstantiableType {
  root: ConditionalRoot;
  checkType: Type;
  extendsType: Type;
  resolvedTrueType: Type;
  resolvedFalseType: Type;
  resolvedInferredTrueType?: Type;
  resolvedDefaultConstraint?: Type;
  mapper?: TypeMapper;
  combinedMapper?: TypeMapper;
}
export interface ConditionalTypeNode extends TypeNode {
  kind: Syntax.ConditionalType;
  checkType: TypeNode;
  extendsType: TypeNode;
  trueType: TypeNode;
  falseType: TypeNode;
}
export interface ConstructorDeclaration extends FunctionLikeDeclarationBase, ClassElement, JSDocContainer {
  kind: Syntax.Constructor;
  parent: ClassLikeDeclaration;
  body?: FunctionBody;
}
export interface ConstructorTypeNode extends FunctionOrConstructorTypeNodeBase {
  kind: Syntax.ConstructorType;
}
export interface ConstructSignatureDeclaration extends SignatureDeclarationBase, TypeElement {
  kind: Syntax.ConstructSignature;
}
export interface ContinueStatement extends Statement {
  kind: Syntax.ContinueStatement;
  label?: Identifier;
}
export interface DebuggerStatement extends Statement {
  kind: Syntax.DebuggerStatement;
}
export interface Declaration extends Node {
  _declarationBrand: any;
}
export type DeclarationName = Identifier | PrivateIdentifier | StringLiteralLike | NumericLiteral | ComputedPropertyName | ElementAccessExpression | BindingPattern | EntityNameExpression;
export interface DeclarationStatement extends NamedDeclaration, Statement {
  name?: Identifier | StringLiteral | NumericLiteral;
}
export type DeclarationWithTypeParameters = DeclarationWithTypeParameterChildren | JSDocTypedefTag | JSDocCallbackTag | JSDocSignature;
export type DeclarationWithTypeParameterChildren = SignatureDeclaration | ClassLikeDeclaration | InterfaceDeclaration | TypeAliasDeclaration | JSDocTemplateTag;
export interface Decorator extends Node {
  kind: Syntax.Decorator;
  parent: NamedDeclaration;
  expression: LeftHandSideExpression;
}
export interface DefaultClause extends Node {
  kind: Syntax.DefaultClause;
  parent: CaseBlock;
  statements: Nodes<Statement>;
  fallthroughFlowNode?: FlowNode;
}
export interface DeferredTypeReference extends TypeReference {
  node: TypeReferenceNode | ArrayTypeNode | TupleTypeNode;
  mapper?: TypeMapper;
}
export interface DeleteExpression extends UnaryExpression {
  kind: Syntax.DeleteExpression;
  expression: UnaryExpression;
}
export type DestructuringAssignment = ObjectDestructuringAssignment | ArrayDestructuringAssignment;
export interface DoStatement extends IterationStatement {
  kind: Syntax.DoStatement;
  expression: Expression;
}
export type DestructuringPattern = BindingPattern | ObjectLiteralExpression | ArrayLiteralExpression;
export interface Diagnostic extends DiagnosticRelatedInformation {
  reportsUnnecessary?: {};
  source?: string;
  relatedInformation?: DiagnosticRelatedInformation[];
}
export enum DiagnosticCategory {
  Warning,
  Error,
  Suggestion,
  Message,
}
export interface DiagnosticMessage {
  key: string;
  category: DiagnosticCategory;
  code: number;
  message: string;
  reportsUnnecessary?: {};
  elidedInCompatabilityPyramid?: boolean;
}
export interface DiagnosticMessageChain {
  messageText: string;
  category: DiagnosticCategory;
  code: number;
  next?: DiagnosticMessageChain[];
}
export interface DiagnosticRelatedInformation {
  category: DiagnosticCategory;
  code: number;
  file: SourceFile | undefined;
  start: number | undefined;
  length: number | undefined;
  messageText: string | DiagnosticMessageChain;
}
export interface DiagnosticWithLocation extends Diagnostic {
  file: SourceFile;
  start: number;
  length: number;
}
export interface DynamicNamedBinaryExpression extends BinaryExpression {
  left: ElementAccessExpression;
}
export interface DynamicNamedDeclaration extends NamedDeclaration {
  name: ComputedPropertyName;
}
export interface ElementAccessChain extends ElementAccessExpression {
  _optionalChainBrand: any;
}
export interface ElementAccessChainRoot extends ElementAccessChain {
  questionDotToken: QuestionDotToken;
}
export interface ElementAccessExpression extends MemberExpression {
  kind: Syntax.ElementAccessExpression;
  expression: LeftHandSideExpression;
  questionDotToken?: QuestionDotToken;
  argumentExpression: Expression;
}
export interface EmitNode {
  annotatedNodes?: Node[];
  flags: EmitFlags;
  leadingComments?: SynthesizedComment[];
  trailingComments?: SynthesizedComment[];
  commentRange?: qb.Range;
  sourceMapRange?: SourceMapRange;
  tokenSourceMapRanges?: (SourceMapRange | undefined)[];
  constantValue?: string | number;
  externalHelpersModuleName?: Identifier;
  externalHelpers?: boolean;
  helpers?: EmitHelper[];
  startsOnNewLine?: boolean;
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
export interface EmitHelper {
  readonly name: string;
  readonly scoped: boolean;
  readonly text: string | ((node: EmitHelperUniqueNameCallback) => string);
  readonly priority?: number;
  readonly dependencies?: EmitHelper[];
}
export type EmitHelperUniqueNameCallback = (name: string) => string;
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
export const enum EmitHint {
  SourceFile,
  Expression,
  IdentifierName,
  MappedTypeParameter,
  Unspecified,
  EmbeddedStatement,
  JsxAttributeValue,
}
export interface EmptyStatement extends Statement {
  kind: Syntax.EmptyStatement;
}
export interface EndOfDeclarationMarker extends Statement {
  kind: Syntax.EndOfDeclarationMarker;
}
export type EntityName = Identifier | QualifiedName;
export type EntityNameExpression = Identifier | PropertyAccessEntityNameExpression;
export type EntityNameOrEntityNameExpression = EntityName | EntityNameExpression;
export interface EnumDeclaration extends DeclarationStatement, JSDocContainer {
  kind: Syntax.EnumDeclaration;
  name: Identifier;
  members: Nodes<EnumMember>;
}
export const enum EnumKind {
  Numeric,
  Literal,
}
export interface EnumMember extends NamedDeclaration, JSDocContainer {
  kind: Syntax.EnumMember;
  parent: EnumDeclaration;
  name: PropertyName;
  initializer?: Expression;
}
export interface EnumType extends Type {}
export type EqualityOperator = Syntax.Equals2Token | Syntax.Equals3Token | Syntax.ExclamationEquals2Token | Syntax.ExclamationEqualsToken;
export type EqualityOperatorOrHigher = RelationalOperatorOrHigher | EqualityOperator;
export type ExponentiationOperator = Syntax.Asterisk2Token;
export interface ExportAssignment extends DeclarationStatement {
  kind: Syntax.ExportAssignment;
  parent: SourceFile;
  isExportEquals?: boolean;
  expression: Expression;
}
export interface ExportDeclaration extends DeclarationStatement, JSDocContainer {
  kind: Syntax.ExportDeclaration;
  parent: SourceFile | ModuleBlock;
  isTypeOnly: boolean;
  exportClause?: NamedExportBindings;
  moduleSpecifier?: Expression;
}
export type ExportedModulesFromDeclarationEmit = readonly Symbol[];
export interface ExportSpecifier extends NamedDeclaration {
  kind: Syntax.ExportSpecifier;
  parent: NamedExports;
  propertyName?: Identifier;
  name: Identifier;
}
export interface Expression extends Node {
  _expressionBrand: any;
}
export interface ExpressionStatement extends Statement, JSDocContainer {
  kind: Syntax.ExpressionStatement;
  expression: Expression;
}
export interface ExpressionWithTypeArguments extends NodeWithTypeArguments {
  kind: Syntax.ExpressionWithTypeArguments;
  parent: HeritageClause | JSDocAugmentsTag | JSDocImplementsTag;
  expression: LeftHandSideExpression;
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
export interface ExternalModuleReference extends Node {
  kind: Syntax.ExternalModuleReference;
  parent: ImportEqualsDeclaration;
  expression: Expression;
}
export interface EvolvingArrayType extends ObjectType {
  elementType: Type;
  finalArrayType?: Type;
}
export interface FileReference extends qb.Range {
  fileName: string;
}
export interface FlowArrayMutation extends FlowNodeBase {
  node: CallExpression | BinaryExpression;
  antecedent: FlowNode;
}
export interface FlowAssignment extends FlowNodeBase {
  node: Expression | VariableDeclaration | BindingElement;
  antecedent: FlowNode;
}
export interface FlowCall extends FlowNodeBase {
  node: CallExpression;
  antecedent: FlowNode;
}
export interface FlowCondition extends FlowNodeBase {
  node: Expression;
  antecedent: FlowNode;
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
export interface FlowLabel extends FlowNodeBase {
  antecedents: FlowNode[] | undefined;
}
export type FlowNode = FlowStart | FlowLabel | FlowAssignment | FlowCall | FlowCondition | FlowSwitchClause | FlowArrayMutation | FlowCall | FlowReduceLabel;
export interface FlowNodeBase {
  flags: FlowFlags;
  id?: number;
}
export interface FlowReduceLabel extends FlowNodeBase {
  target: FlowLabel;
  antecedents: FlowNode[];
  antecedent: FlowNode;
}
export interface FlowStart extends FlowNodeBase {
  node?: FunctionExpression | ArrowFunction | MethodDeclaration;
}
export interface FlowSwitchClause extends FlowNodeBase {
  switchStatement: SwitchStatement;
  clauseStart: number;
  clauseEnd: number;
  antecedent: FlowNode;
}
export type FlowType = Type | IncompleteType;
export interface ForInStatement extends IterationStatement {
  kind: Syntax.ForInStatement;
  initializer: ForInitializer;
  expression: Expression;
}
export type ForInitializer = VariableDeclarationList | Expression;
export type ForInOrOfStatement = ForInStatement | ForOfStatement;
export interface ForOfStatement extends IterationStatement {
  kind: Syntax.ForOfStatement;
  awaitModifier?: AwaitKeywordToken;
  initializer: ForInitializer;
  expression: Expression;
}
export interface ForStatement extends IterationStatement {
  kind: Syntax.ForStatement;
  initializer?: ForInitializer;
  condition?: Expression;
  incrementor?: Expression;
}
export interface FreshableIntrinsicType extends IntrinsicType {
  freshType: IntrinsicType;
  regularType: IntrinsicType;
}
export type FreshableType = LiteralType | FreshableIntrinsicType;
export interface UniqueESSymbolType extends Type {
  symbol: Symbol;
  escName: qb.__String;
}
export interface FreshObjectLiteralType extends ResolvedType {
  regularType: ResolvedType;
}
export type FunctionBody = Block;
export interface FunctionDeclaration extends FunctionLikeDeclarationBase, DeclarationStatement {
  kind: Syntax.FunctionDeclaration;
  name?: Identifier;
  body?: FunctionBody;
}
export interface FunctionExpression extends PrimaryExpression, FunctionLikeDeclarationBase, JSDocContainer {
  kind: Syntax.FunctionExpression;
  name?: Identifier;
  body: FunctionBody;
}
export type FunctionLikeDeclaration = FunctionDeclaration | MethodDeclaration | GetAccessorDeclaration | SetAccessorDeclaration | ConstructorDeclaration | FunctionExpression | ArrowFunction;
export interface FunctionLikeDeclarationBase extends SignatureDeclarationBase {
  _functionLikeDeclarationBrand: any;
  asteriskToken?: AsteriskToken;
  questionToken?: QuestionToken;
  exclamationToken?: ExclamationToken;
  body?: Block | Expression;
  endFlowNode?: FlowNode;
  returnFlowNode?: FlowNode;
}
export type FunctionOrConstructorTypeNode = FunctionTypeNode | ConstructorTypeNode;
export interface FunctionOrConstructorTypeNodeBase extends TypeNode, SignatureDeclarationBase {
  kind: Syntax.FunctionType | Syntax.ConstructorType;
  type: TypeNode;
}
export interface FunctionTypeNode extends FunctionOrConstructorTypeNodeBase {
  kind: Syntax.FunctionType;
}
export interface GeneratedIdentifier extends Identifier {
  autoGenerateFlags: GeneratedIdentifierFlags;
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
export interface GenericType extends InterfaceType, TypeReference {
  instantiations: qb.QMap<TypeReference>;
  variances?: VarianceFlags[];
}
export interface GetAccessorDeclaration extends FunctionLikeDeclarationBase, ClassElement, ObjectLiteralElement, JSDocContainer {
  kind: Syntax.GetAccessor;
  parent: ClassLikeDeclaration | ObjectLiteralExpression;
  name: PropertyName;
  body?: FunctionBody;
}
export type HasExpressionInitializer = VariableDeclaration | ParameterDeclaration | BindingElement | PropertySignature | PropertyDeclaration | PropertyAssignment | EnumMember;
export type HasInitializer = HasExpressionInitializer | ForStatement | ForInStatement | ForOfStatement | JsxAttribute;
// prettier-ignore
export type HasJSDoc = | ParameterDeclaration | CallSignatureDeclaration | ConstructSignatureDeclaration | MethodSignature | PropertySignature | ArrowFunction | ParenthesizedExpression | SpreadAssignment | ShorthandPropertyAssignment | PropertyAssignment | FunctionExpression | LabeledStatement | ExpressionStatement | VariableStatement | FunctionDeclaration | ConstructorDeclaration | MethodDeclaration | PropertyDeclaration | AccessorDeclaration | ClassLikeDeclaration | InterfaceDeclaration | TypeAliasDeclaration | EnumMember | EnumDeclaration | ModuleDeclaration | ImportEqualsDeclaration | IndexSignatureDeclaration | FunctionTypeNode | ConstructorTypeNode | JSDocFunctionType | ExportDeclaration | NamedTupleMember | EndOfFileToken;
// prettier-ignore
export type HasType = | SignatureDeclaration | VariableDeclaration | ParameterDeclaration | PropertySignature | PropertyDeclaration | TypePredicateNode | ParenthesizedTypeNode | TypeOperatorNode | MappedTypeNode | AssertionExpression | TypeAliasDeclaration | JSDocTypeExpression | JSDocNonNullableType | JSDocNullableType | JSDocOptionalType | JSDocVariadicType;
export type HasTypeArguments = CallExpression | NewExpression | TaggedTemplateExpression | JsxOpeningElement | JsxSelfClosingElement;

export interface HeritageClause extends Node {
  kind: Syntax.HeritageClause;
  parent: InterfaceDeclaration | ClassLikeDeclaration;
  token: Syntax.ExtendsKeyword | Syntax.ImplementsKeyword;
  types: Nodes<ExpressionWithTypeArguments>;
}
export interface Identifier extends PrimaryExpression, Declaration {
  kind: Syntax.Identifier;
  escapedText: qb.__String;
  originalKeywordKind?: Syntax;
  autoGenerateFlags?: GeneratedIdentifierFlags;
  autoGenerateId?: number;
  isInJSDocNamespace?: boolean;
  typeArguments?: Nodes<TypeNode | TypeParameterDeclaration>;
  jsdocDotPos?: number;
}
export interface IdentifierTypePredicate extends TypePredicateBase {
  kind: TypePredicateKind.Identifier;
  parameterName: string;
  parameterIndex: number;
  type: Type;
}
export interface IfStatement extends Statement {
  kind: Syntax.IfStatement;
  expression: Expression;
  thenStatement: Statement;
  elseStatement?: Statement;
}
export interface ImportCall extends CallExpression {
  expression: ImportExpression;
}
export interface ImportClause extends NamedDeclaration {
  kind: Syntax.ImportClause;
  parent: ImportDeclaration;
  isTypeOnly: boolean;
  name?: Identifier;
  namedBindings?: NamedImportBindings;
}
export interface ImportDeclaration extends Statement {
  kind: Syntax.ImportDeclaration;
  parent: SourceFile | ModuleBlock;
  importClause?: ImportClause;
  moduleSpecifier: Expression;
}
export interface ImportExpression extends PrimaryExpression {
  kind: Syntax.ImportKeyword;
}
export interface ImportEqualsDeclaration extends DeclarationStatement, JSDocContainer {
  kind: Syntax.ImportEqualsDeclaration;
  parent: SourceFile | ModuleBlock;
  name: Identifier;
  moduleReference: ModuleReference;
}
export interface ImportMetaProperty extends MetaProperty {
  keywordToken: Syntax.ImportKeyword;
  name: Identifier & { escapedText: qb.__String & 'meta' };
}
export type ImportOrExportSpecifier = ImportSpecifier | ExportSpecifier;
export interface ImportSpecifier extends NamedDeclaration {
  kind: Syntax.ImportSpecifier;
  parent: NamedImports;
  propertyName?: Identifier;
  name: Identifier;
}
export interface ImportTypeNode extends NodeWithTypeArguments {
  kind: Syntax.ImportType;
  isTypeOf?: boolean;
  argument: TypeNode;
  qualifier?: EntityName;
}
export interface IncompleteType {
  flags: TypeFlags;
  type: Type;
}
export interface IndexedAccessTypeNode extends TypeNode {
  kind: Syntax.IndexedAccessType;
  objectType: TypeNode;
  indexType: TypeNode;
}
export interface IndexedAccessType extends InstantiableType {
  objectType: Type;
  indexType: Type;
  constraint?: Type;
  simplifiedForReading?: Type;
  simplifiedForWriting?: Type;
}
export interface IndexInfo {
  type: Type;
  isReadonly: boolean;
  declaration?: IndexSignatureDeclaration;
}
export const enum IndexKind {
  String,
  Number,
}
export interface IndexSignatureDeclaration extends SignatureDeclarationBase, ClassElement, TypeElement {
  kind: Syntax.IndexSignature;
  parent: ObjectTypeDeclaration;
}
export interface IndexType extends InstantiableType {
  type: InstantiableType | UnionOrIntersectionType;
  stringsOnly: boolean;
}
export interface InferenceContext {
  inferences: InferenceInfo[];
  signature?: Signature;
  flags: InferenceFlags;
  compareTypes: TypeComparer;
  mapper: TypeMapper;
  nonFixingMapper: TypeMapper;
  returnMapper?: TypeMapper;
  inferredTypeParameters?: readonly TypeParameter[];
}
export interface InferenceInfo {
  typeParameter: TypeParameter;
  candidates: Type[] | undefined;
  contraCandidates: Type[] | undefined;
  inferredType?: Type;
  priority?: InferencePriority;
  topLevel: boolean;
  isFixed: boolean;
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
export interface InferTypeNode extends TypeNode {
  kind: Syntax.InferType;
  typeParameter: TypeParameterDeclaration;
}
export interface InputFiles extends Node {
  kind: Syntax.InputFiles;
  javascriptPath?: string;
  javascriptText: string;
  javascriptMapPath?: string;
  javascriptMapText?: string;
  declarationPath?: string;
  declarationText: string;
  declarationMapPath?: string;
  declarationMapText?: string;
  buildInfoPath?: string;
  buildInfo?: BuildInfo;
  oldFileOfCurrentEmit?: boolean;
}
export interface InstantiableType extends Type {
  resolvedBaseConstraint?: Type;
  resolvedIndexType?: IndexType;
  resolvedStringIndexType?: IndexType;
}
export interface InterfaceDeclaration extends DeclarationStatement, JSDocContainer {
  kind: Syntax.InterfaceDeclaration;
  name: Identifier;
  typeParameters?: Nodes<TypeParameterDeclaration>;
  heritageClauses?: Nodes<HeritageClause>;
  members: Nodes<TypeElement>;
}
export interface InterfaceType extends ObjectType {
  typeParameters: TypeParameter[] | undefined;
  outerTypeParameters: TypeParameter[] | undefined;
  localTypeParameters: TypeParameter[] | undefined;
  thisType: TypeParameter | undefined;
  resolvedBaseConstructorType?: Type;
  resolvedBaseTypes: BaseType[];
}
export interface InterfaceTypeWithDeclaredMembers extends InterfaceType {
  declaredProperties: Symbol[];
  declaredCallSignatures: Signature[];
  declaredConstructSignatures: Signature[];
  declaredStringIndexInfo?: IndexInfo;
  declaredNumberIndexInfo?: IndexInfo;
}
export interface IntersectionType extends UnionOrIntersectionType {
  resolvedApparentType: Type;
}
export interface IntersectionTypeNode extends TypeNode {
  kind: Syntax.IntersectionType;
  types: Nodes<TypeNode>;
}
export interface IntrinsicType extends Type {
  intrinsicName: string;
  objectFlags: ObjectFlags;
}
export interface IterationTypes {
  readonly yieldType: Type;
  readonly returnType: Type;
  readonly nextType: Type;
}
export interface IterableOrIteratorType extends ObjectType, UnionType {
  iterationTypesOfGeneratorReturnType?: IterationTypes;
  iterationTypesOfAsyncGeneratorReturnType?: IterationTypes;
  iterationTypesOfIterable?: IterationTypes;
  iterationTypesOfIterator?: IterationTypes;
  iterationTypesOfAsyncIterable?: IterationTypes;
  iterationTypesOfAsyncIterator?: IterationTypes;
  iterationTypesOfIteratorResult?: IterationTypes;
}
export interface IterationStatement extends Statement {
  statement: Statement;
}
export interface JSDoc extends Node {
  kind: Syntax.JSDocComment;
  parent: HasJSDoc;
  tags?: Nodes<JSDocTag>;
  comment?: string;
}
export interface JSDocAllType extends JSDocType {
  kind: Syntax.JSDocAllType;
}
export interface JSDocAugmentsTag extends JSDocTag {
  kind: Syntax.JSDocAugmentsTag;
  class: ExpressionWithTypeArguments & { expression: Identifier | PropertyAccessEntityNameExpression };
}
export interface JSDocAuthorTag extends JSDocTag {
  kind: Syntax.JSDocAuthorTag;
}
export interface JSDocCallbackTag extends JSDocTag, NamedDeclaration {
  parent: JSDoc;
  kind: Syntax.JSDocCallbackTag;
  fullName?: JSDocNamespaceDeclaration | Identifier;
  name?: Identifier;
  typeExpression: JSDocSignature;
}
export interface JSDocClassTag extends JSDocTag {
  kind: Syntax.JSDocClassTag;
}
export interface JSDocContainer {
  jsDoc?: JSDoc[];
  jsDocCache?: readonly JSDocTag[];
}
export interface JSDocEnumTag extends JSDocTag, Declaration {
  parent: JSDoc;
  kind: Syntax.JSDocEnumTag;
  typeExpression?: JSDocTypeExpression;
}
export interface JSDocFunctionType extends JSDocType, SignatureDeclarationBase {
  kind: Syntax.JSDocFunctionType;
}
export interface JSDocImplementsTag extends JSDocTag {
  kind: Syntax.JSDocImplementsTag;
  class: ExpressionWithTypeArguments & { expression: Identifier | PropertyAccessEntityNameExpression };
}
export interface JSDocNamepathType extends JSDocType {
  kind: Syntax.JSDocNamepathType;
  type: TypeNode;
}
export type JSDocNamespaceBody = Identifier | JSDocNamespaceDeclaration;
export interface JSDocNamespaceDeclaration extends ModuleDeclaration {
  name: Identifier;
  body?: JSDocNamespaceBody;
}
export interface JSDocNonNullableType extends JSDocType {
  kind: Syntax.JSDocNonNullableType;
  type: TypeNode;
}
export interface JSDocNullableType extends JSDocType {
  kind: Syntax.JSDocNullableType;
  type: TypeNode;
}
export interface JSDocOptionalType extends JSDocType {
  kind: Syntax.JSDocOptionalType;
  type: TypeNode;
}
export interface JSDocParameterTag extends JSDocPropertyLikeTag {
  kind: Syntax.JSDocParameterTag;
}
export interface JSDocPrivateTag extends JSDocTag {
  kind: Syntax.JSDocPrivateTag;
}
export interface JSDocPropertyLikeTag extends JSDocTag, Declaration {
  parent: JSDoc;
  name: EntityName;
  typeExpression?: JSDocTypeExpression;
  isNameFirst: boolean;
  isBracketed: boolean;
}
export interface JSDocPropertyTag extends JSDocPropertyLikeTag {
  kind: Syntax.JSDocPropertyTag;
}
export interface JSDocProtectedTag extends JSDocTag {
  kind: Syntax.JSDocProtectedTag;
}
export interface JSDocPublicTag extends JSDocTag {
  kind: Syntax.JSDocPublicTag;
}
export interface JSDocReadonlyTag extends JSDocTag {
  kind: Syntax.JSDocReadonlyTag;
}
export interface JSDocReturnTag extends JSDocTag {
  kind: Syntax.JSDocReturnTag;
  typeExpression?: JSDocTypeExpression;
}
export interface JSDocSignature extends JSDocType, Declaration {
  kind: Syntax.JSDocSignature;
  typeParameters?: readonly JSDocTemplateTag[];
  parameters: readonly JSDocParameterTag[];
  type: JSDocReturnTag | undefined;
}
export interface JSDocTag extends Node {
  parent: JSDoc | JSDocTypeLiteral;
  tagName: Identifier;
  comment?: string;
}
export interface JSDocTagInfo {}
export interface JSDocTemplateTag extends JSDocTag {
  kind: Syntax.JSDocTemplateTag;
  constraint?: JSDocTypeExpression;
  typeParameters: Nodes<TypeParameterDeclaration>;
}
export interface JSDocThisTag extends JSDocTag {
  kind: Syntax.JSDocThisTag;
  typeExpression?: JSDocTypeExpression;
}
export interface JSDocType extends TypeNode {
  _jsDocTypeBrand: any;
}
export interface JSDocTypedefTag extends JSDocTag, NamedDeclaration {
  parent: JSDoc;
  kind: Syntax.JSDocTypedefTag;
  fullName?: JSDocNamespaceDeclaration | Identifier;
  name?: Identifier;
  typeExpression?: JSDocTypeExpression | JSDocTypeLiteral;
}
export interface JSDocTypeExpression extends TypeNode {
  kind: Syntax.JSDocTypeExpression;
  type: TypeNode;
}
export interface JSDocTypeLiteral extends JSDocType {
  kind: Syntax.JSDocTypeLiteral;
  jsDocPropertyTags?: readonly JSDocPropertyLikeTag[];
  isArrayType?: boolean;
}
export type JSDocTypeReferencingNode = JSDocVariadicType | JSDocOptionalType | JSDocNullableType | JSDocNonNullableType;
export interface JSDocTypeTag extends JSDocTag {
  kind: Syntax.JSDocTypeTag;
  typeExpression: JSDocTypeExpression;
}
export interface JSDocUnknownTag extends JSDocTag {
  kind: Syntax.JSDocTag;
}
export interface JSDocUnknownType extends JSDocType {
  kind: Syntax.JSDocUnknownType;
}
export interface JSDocVariadicType extends JSDocType {
  kind: Syntax.JSDocVariadicType;
  type: TypeNode;
}
export interface JsxAttribute extends ObjectLiteralElement {
  kind: Syntax.JsxAttribute;
  parent: JsxAttributes;
  name: Identifier;
  initializer?: StringLiteral | JsxExpression;
}
export type JsxAttributeLike = JsxAttribute | JsxSpreadAttribute;
export interface JsxAttributes extends ObjectLiteralExpressionBase<JsxAttributeLike> {
  kind: Syntax.JsxAttributes;
  parent: JsxOpeningLikeElement;
}
export type JsxChild = JsxText | JsxExpression | JsxElement | JsxSelfClosingElement | JsxFragment;
export interface JsxClosingElement extends Node {
  kind: Syntax.JsxClosingElement;
  parent: JsxElement;
  tagName: JsxTagNameExpression;
}
export interface JsxClosingFragment extends Expression {
  kind: Syntax.JsxClosingFragment;
  parent: JsxFragment;
}
export interface JsxElement extends PrimaryExpression {
  kind: Syntax.JsxElement;
  openingElement: JsxOpeningElement;
  children: Nodes<JsxChild>;
  closingElement: JsxClosingElement;
}
export interface JsxExpression extends Expression {
  kind: Syntax.JsxExpression;
  parent: JsxElement | JsxAttributeLike;
  dot3Token?: Token<Syntax.Dot3Token>;
  expression?: Expression;
}
export const enum JsxFlags {
  None = 0,
  IntrinsicNamedElement = 1 << 0,
  IntrinsicIndexedElement = 1 << 1,
  IntrinsicElement = IntrinsicNamedElement | IntrinsicIndexedElement,
}
export interface JsxFragment extends PrimaryExpression {
  kind: Syntax.JsxFragment;
  openingFragment: JsxOpeningFragment;
  children: Nodes<JsxChild>;
  closingFragment: JsxClosingFragment;
}
export interface JsxOpeningElement extends Expression {
  kind: Syntax.JsxOpeningElement;
  parent: JsxElement;
  tagName: JsxTagNameExpression;
  typeArguments?: Nodes<TypeNode>;
  attributes: JsxAttributes;
}
export type JsxOpeningLikeElement = JsxSelfClosingElement | JsxOpeningElement;
export interface JsxOpeningFragment extends Expression {
  kind: Syntax.JsxOpeningFragment;
  parent: JsxFragment;
}
export interface JsxSelfClosingElement extends PrimaryExpression {
  kind: Syntax.JsxSelfClosingElement;
  tagName: JsxTagNameExpression;
  typeArguments?: Nodes<TypeNode>;
  attributes: JsxAttributes;
}
export interface JsxSpreadAttribute extends ObjectLiteralElement {
  kind: Syntax.JsxSpreadAttribute;
  parent: JsxAttributes;
  expression: Expression;
}
export type JsxTagNameExpression = Identifier | ThisExpression | JsxTagNamePropertyAccess;
export interface JsxTagNamePropertyAccess extends PropertyAccessExpression {
  expression: JsxTagNameExpression;
}
export interface JsxText extends LiteralLikeNode {
  kind: Syntax.JsxText;
  onlyTriviaWhiteSpaces: boolean;
  parent: JsxElement;
}
// prettier-ignore
export interface KeywordTypeNode extends TypeNode {
  kind: | Syntax.AnyKeyword | Syntax.UnknownKeyword | Syntax.NumberKeyword | Syntax.BigIntKeyword | Syntax.ObjectKeyword | Syntax.BooleanKeyword | Syntax.StringKeyword | Syntax.SymbolKeyword | Syntax.ThisKeyword | Syntax.VoidKeyword | Syntax.UndefinedKeyword | Syntax.NullKeyword | Syntax.NeverKeyword;
}
export interface LabeledStatement extends Statement, JSDocContainer {
  kind: Syntax.LabeledStatement;
  label: Identifier;
  statement: Statement;
}
export interface LateBoundBinaryExpressionDeclaration extends DynamicNamedBinaryExpression {
  left: LateBoundElementAccessExpression;
}
export interface LateBoundDeclaration extends DynamicNamedDeclaration {
  name: LateBoundName;
}
export interface LateBoundElementAccessExpression extends ElementAccessExpression {
  argumentExpression: EntityNameExpression;
}
export interface LateBoundName extends ComputedPropertyName {
  expression: EntityNameExpression;
}
export interface LeftHandSideExpression extends UpdateExpression {
  _leftHandSideExpressionBrand: any;
}
export interface LiteralExpression extends LiteralLikeNode, PrimaryExpression {
  _literalExpressionBrand: any;
}
export type LiteralImportTypeNode = ImportTypeNode & { argument: LiteralTypeNode & { literal: StringLiteral } };
export interface LiteralLikeNode extends Node {
  text: string;
  isUnterminated?: boolean;
  hasExtendedEscape?: boolean;
}
export type LiteralLikeElementAccessExpression = ElementAccessExpression &
  Declaration & {
    argumentExpression: StringLiteralLike | NumericLiteral | WellKnownSymbolExpression;
  };
export interface LiteralType extends Type {
  value: string | number | PseudoBigInt;
  freshType: LiteralType;
  regularType: LiteralType;
}
export interface LiteralTypeNode extends TypeNode {
  kind: Syntax.LiteralType;
  literal: BooleanLiteral | LiteralExpression | PrefixUnaryExpression;
}
export type LogicalOperator = Syntax.Ampersand2Token | Syntax.Bar2Token;
export type LogicalOperatorOrHigher = BitwiseOperatorOrHigher | LogicalOperator;
export interface MappedSymbol extends TransientSymbol {
  mappedType: MappedType;
  mapper: TypeMapper;
}
export interface MappedType extends AnonymousType {
  declaration: MappedTypeNode;
  typeParameter?: TypeParameter;
  constraintType?: Type;
  templateType?: Type;
  modifiersType?: Type;
  resolvedApparentType?: Type;
}
export interface MappedTypeNode extends TypeNode, Declaration {
  kind: Syntax.MappedType;
  readonlyToken?: ReadonlyToken | PlusToken | MinusToken;
  typeParameter: TypeParameterDeclaration;
  questionToken?: QuestionToken | PlusToken | MinusToken;
  type?: TypeNode;
}
export interface MemberExpression extends LeftHandSideExpression {
  _memberExpressionBrand: any;
}
export interface MergeDeclarationMarker extends Statement {
  kind: Syntax.MergeDeclarationMarker;
}
export interface MetaProperty extends PrimaryExpression {
  kind: Syntax.MetaProperty;
  keywordToken: Syntax.NewKeyword | Syntax.ImportKeyword;
  name: Identifier;
}
export interface MethodDeclaration extends FunctionLikeDeclarationBase, ClassElement, ObjectLiteralElement, JSDocContainer {
  kind: Syntax.MethodDeclaration;
  parent: ClassLikeDeclaration | ObjectLiteralExpression;
  name: PropertyName;
  body?: FunctionBody;
}
export interface MethodSignature extends SignatureDeclarationBase, TypeElement {
  kind: Syntax.MethodSignature;
  parent: ObjectTypeDeclaration;
  name: PropertyName;
}
export interface MissingDeclaration extends DeclarationStatement {
  kind: Syntax.MissingDeclaration;
  name?: Identifier;
}
export type Modifiers = Nodes<qy.Modifier>;
export interface ModuleBlock extends Node, Statement {
  kind: Syntax.ModuleBlock;
  parent: ModuleDeclaration;
  statements: Nodes<Statement>;
}
export interface ModuleDeclaration extends DeclarationStatement, JSDocContainer {
  kind: Syntax.ModuleDeclaration;
  parent: ModuleBody | SourceFile;
  name: ModuleName;
  body?: ModuleBody | JSDocNamespaceDeclaration;
}
export type MultiplicativeOperator = Syntax.AsteriskToken | Syntax.SlashToken | Syntax.PercentToken;
export type MultiplicativeOperatorOrHigher = ExponentiationOperator | MultiplicativeOperator;
export type MutableNodes<T extends Node> = Nodes<T> & T[];
export interface NamedDeclaration extends Declaration {
  name?: DeclarationName;
}
export interface NamedExports extends Node {
  kind: Syntax.NamedExports;
  parent: ExportDeclaration;
  elements: Nodes<ExportSpecifier>;
}
export interface NamedImports extends Node {
  kind: Syntax.NamedImports;
  parent: ImportClause;
  elements: Nodes<ImportSpecifier>;
}
export interface NamedTupleMember extends TypeNode, JSDocContainer, Declaration {
  kind: Syntax.NamedTupleMember;
  dot3Token?: Token<Syntax.Dot3Token>;
  name: Identifier;
  questionToken?: Token<Syntax.QuestionToken>;
  type: TypeNode;
}
export interface NamespaceExport extends NamedDeclaration {
  kind: Syntax.NamespaceExport;
  parent: ExportDeclaration;
  name: Identifier;
}
export interface NamespaceExportDeclaration extends DeclarationStatement {
  kind: Syntax.NamespaceExportDeclaration;
  name: Identifier;
}
export interface NamespaceImport extends NamedDeclaration {
  kind: Syntax.NamespaceImport;
  parent: ImportClause;
  name: Identifier;
}
export interface NewExpression extends PrimaryExpression, Declaration {
  kind: Syntax.NewExpression;
  expression: LeftHandSideExpression;
  typeArguments?: Nodes<TypeNode>;
  arguments?: Nodes<Expression>;
}
export interface Node extends qb.Range {
  id?: number;
  kind: Syntax;
  flags: NodeFlags;
  transformFlags: TransformFlags;
  modifierFlagsCache: qy.ModifierFlags;
  decorators?: Nodes<Decorator>;
  modifiers?: Modifiers;
  parent?: Node;
  original?: Node;
  symbol: Symbol;
  localSymbol?: Symbol;
  locals?: SymbolTable;
  nextContainer?: Node;
  flowNode?: FlowNode;
  emitNode?: EmitNode;
  contextualType?: Type;
  inferenceContext?: InferenceContext;
  jsDoc?: JSDoc[];
  is<S extends Syntax, T extends { kind: S; also?: Syntax[] }>(t: T): this is NodeType<T['kind']>;
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
  JSDoc = 1 << 22,
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
export interface Nodes<T extends Node> extends ReadonlyArray<T>, qb.Range {
  trailingComma?: boolean;
  transformFlags: TransformFlags;
}
export type NodeType<S extends Syntax> = S extends keyof SynMap ? SynMap[S] : never;
export interface NodeWithTypeArguments extends TypeNode {
  typeArguments?: Nodes<TypeNode>;
}
export interface NonNullChain extends NonNullExpression {
  _optionalChainBrand: any;
}
export interface NonNullExpression extends LeftHandSideExpression {
  kind: Syntax.NonNullExpression;
  expression: Expression;
}
export interface NoSubstitutionLiteral extends LiteralExpression, TemplateLiteralLikeNode, Declaration {
  kind: Syntax.NoSubstitutionLiteral;
  templateFlags?: TokenFlags;
}
export interface NotEmittedStatement extends Statement {
  kind: Syntax.NotEmittedStatement;
}
export interface NumericLiteral extends LiteralExpression, Declaration {
  kind: Syntax.NumericLiteral;
  numericLiteralFlags: TokenFlags;
}
export interface NullableType extends IntrinsicType {
  objectFlags: ObjectFlags;
}
export interface NullLiteral extends PrimaryExpression, TypeNode {
  kind: Syntax.NullKeyword;
}
export interface NumberLiteralType extends LiteralType {
  value: number;
}
export interface ObjectBindingPattern extends Node {
  kind: Syntax.ObjectBindingPattern;
  parent: VariableDeclaration | ParameterDeclaration | BindingElement;
  elements: Nodes<BindingElement>;
}
export type ObjectBindingOrAssignmentPattern = ObjectBindingPattern | ObjectLiteralExpression;
export interface ObjectDestructuringAssignment extends AssignmentExpression<EqualsToken> {
  left: ObjectLiteralExpression;
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
export type ObjectFlagsType = NullableType | ObjectType | UnionType | IntersectionType;
export interface ObjectLiteralElement extends NamedDeclaration {
  _objectLiteralBrand: any;
  name?: PropertyName;
}
export type ObjectLiteralElementLike = PropertyAssignment | ShorthandPropertyAssignment | SpreadAssignment | MethodDeclaration | AccessorDeclaration;
export interface ObjectLiteralExpression extends ObjectLiteralExpressionBase<ObjectLiteralElementLike> {
  kind: Syntax.ObjectLiteralExpression;
  multiLine?: boolean;
}
export interface ObjectLiteralExpressionBase<T extends ObjectLiteralElement> extends PrimaryExpression, Declaration {
  properties: Nodes<T>;
}
export interface ObjectType extends Type {
  objectFlags: ObjectFlags;
  members?: SymbolTable;
  properties?: Symbol[];
  callSignatures?: readonly Signature[];
  constructSignatures?: readonly Signature[];
  stringIndexInfo?: IndexInfo;
  numberIndexInfo?: IndexInfo;
}
export interface OmittedExpression extends Expression {
  kind: Syntax.OmittedExpression;
}
export interface OptionalTypeNode extends TypeNode {
  kind: Syntax.OptionalType;
  type: TypeNode;
}
export type OuterExpression = ParenthesizedExpression | TypeAssertion | AsExpression | NonNullExpression | PartiallyEmittedExpression;
export const enum OuterExpressionKinds {
  Parentheses = 1 << 0,
  TypeAssertions = 1 << 1,
  NonNullAssertions = 1 << 2,
  PartiallyEmittedExpressions = 1 << 3,
  Assertions = TypeAssertions | NonNullAssertions,
  All = Parentheses | Assertions | PartiallyEmittedExpressions,
}
export interface PackageId {
  name: string;
  subModuleName: string;
  version: string;
}
export interface ParameterDeclaration extends NamedDeclaration, JSDocContainer {
  kind: Syntax.Parameter;
  parent: SignatureDeclaration;
  dot3Token?: Dot3Token;
  name: BindingName;
  questionToken?: QuestionToken;
  type?: TypeNode;
  initializer?: Expression;
}
export type ParameterPropertyDeclaration = ParameterDeclaration & { parent: ConstructorDeclaration; name: Identifier };
export interface ParenthesizedExpression extends PrimaryExpression, JSDocContainer {
  kind: Syntax.ParenthesizedExpression;
  expression: Expression;
}
export interface ParenthesizedTypeNode extends TypeNode {
  kind: Syntax.ParenthesizedType;
  type: TypeNode;
}
export interface PartiallyEmittedExpression extends LeftHandSideExpression {
  kind: Syntax.PartiallyEmittedExpression;
  expression: Expression;
}
export type Path = string & { __pathBrand: any };
export interface PatternAmbientModule {
  pattern: qb.Pattern;
  symbol: Symbol;
}
export interface PostfixUnaryExpression extends UpdateExpression {
  kind: Syntax.PostfixUnaryExpression;
  operand: LeftHandSideExpression;
  operator: PostfixUnaryOperator;
}
export type PostfixUnaryOperator = Syntax.Plus2Token | Syntax.Minus2Token;
export interface PrefixUnaryExpression extends UpdateExpression {
  kind: Syntax.PrefixUnaryExpression;
  operator: PrefixUnaryOperator;
  operand: UnaryExpression;
}
export type PrefixUnaryOperator = Syntax.Plus2Token | Syntax.Minus2Token | Syntax.PlusToken | Syntax.MinusToken | Syntax.TildeToken | Syntax.ExclamationToken;
export interface PrimaryExpression extends MemberExpression {
  _primaryExpressionBrand: any;
}
export interface PrivateIdentifier extends Node {
  kind: Syntax.PrivateIdentifier;
  escapedText: qb.__String;
}
export interface PrivateIdentifierPropertyAccessExpression extends PropertyAccessExpression {
  name: PrivateIdentifier;
}
export interface PrivateIdentifierPropertyDeclaration extends PropertyDeclaration {
  name: PrivateIdentifier;
}
export interface ProgramBuildInfo {}
export interface PropertyAccessChain extends PropertyAccessExpression {
  _optionalChainBrand: any;
  name: Identifier;
}
export interface PropertyAccessChainRoot extends PropertyAccessChain {
  questionDotToken: QuestionDotToken;
}
export interface PropertyAccessExpression extends MemberExpression, NamedDeclaration {
  kind: Syntax.PropertyAccessExpression;
  expression: LeftHandSideExpression;
  questionDotToken?: QuestionDotToken;
  name: Identifier | PrivateIdentifier;
}
export interface PropertyAssignment extends ObjectLiteralElement, JSDocContainer {
  parent: ObjectLiteralExpression;
  kind: Syntax.PropertyAssignment;
  name: PropertyName;
  questionToken?: QuestionToken;
  initializer: Expression;
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
export interface PropertyLikeDeclaration extends NamedDeclaration {
  name: PropertyName;
}
export type PropertyName = Identifier | StringLiteral | NumericLiteral | ComputedPropertyName | PrivateIdentifier;
export interface PropertySignature extends TypeElement, JSDocContainer {
  kind: Syntax.PropertySignature;
  name: PropertyName;
  questionToken?: QuestionToken;
  type?: TypeNode;
  initializer?: Expression;
}
export interface PseudoBigInt {
  negative: boolean;
  base10Value: string;
}
export interface QualifiedName extends Node {
  kind: Syntax.QualifiedName;
  left: EntityName;
  right: Identifier;
  jsdocDotPos?: number;
}
export namespace Range {
  export interface SourceMap extends qb.Range {
    source?: SourceMapSource;
  }
}
export interface RawSourceMap {
  version: 3;
  file: string;
  sourceRoot?: string | null;
  sources: string[];
  sourcesContent?: (string | null)[] | null;
  mappings: string;
  names?: string[] | null;
}
export interface RegexLiteral extends LiteralExpression {
  kind: Syntax.RegexLiteral;
}
export type RelationalOperator = Syntax.LessThanToken | Syntax.LessThanEqualsToken | Syntax.GreaterThanToken | Syntax.GreaterThanEqualsToken | Syntax.InstanceOfKeyword | Syntax.InKeyword;
export type RelationalOperatorOrHigher = ShiftOperatorOrHigher | RelationalOperator;
export interface RestTypeNode extends TypeNode {
  kind: Syntax.RestType;
  type: TypeNode;
}
export type RequireOrImportCall = CallExpression & { expression: Identifier; arguments: [StringLiteralLike] };
export interface RequireVariableDeclaration extends VariableDeclaration {
  initializer: RequireOrImportCall;
}
export interface ResolvedModule {
  resolvedFileName: string;
  isExternalLibraryImport?: boolean;
}
export interface ResolvedModuleFull extends ResolvedModule {
  readonly originalPath?: string;
  extension: Extension;
  packageId?: PackageId;
}
export interface ResolvedModuleWithFailedLookupLocations {
  readonly resolvedModule: ResolvedModuleFull | undefined;
  readonly failedLookupLocations: string[];
}
export interface ResolvedTypeReferenceDirective {
  primary: boolean;
  resolvedFileName: string | undefined;
  packageId?: PackageId;
  isExternalLibraryImport?: boolean;
}
export interface ResolvedTypeReferenceDirectiveWithFailedLookupLocations {
  readonly resolvedTypeReferenceDirective: ResolvedTypeReferenceDirective | undefined;
  readonly failedLookupLocations: string[];
}
export interface ReturnStatement extends Statement {
  kind: Syntax.ReturnStatement;
  expression?: Expression;
}
export interface ReverseMappedSymbol extends TransientSymbol {
  propertyType: Type;
  mappedType: MappedType;
  constraintType: IndexType;
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
export interface SemicolonClassElement extends ClassElement {
  kind: Syntax.SemicolonClassElement;
  parent: ClassLikeDeclaration;
}
export interface SetAccessorDeclaration extends FunctionLikeDeclarationBase, ClassElement, ObjectLiteralElement, JSDocContainer {
  kind: Syntax.SetAccessor;
  parent: ClassLikeDeclaration | ObjectLiteralExpression;
  name: PropertyName;
  body?: FunctionBody;
}
export type ShiftOperator = Syntax.LessThan2Token | Syntax.GreaterThan2Token | Syntax.GreaterThan3Token;
export type ShiftOperatorOrHigher = AdditiveOperatorOrHigher | ShiftOperator;
export interface ShorthandPropertyAssignment extends ObjectLiteralElement, JSDocContainer {
  parent: ObjectLiteralExpression;
  kind: Syntax.ShorthandPropertyAssignment;
  name: Identifier;
  questionToken?: QuestionToken;
  exclamationToken?: ExclamationToken;
  equalsToken?: Token<Syntax.EqualsToken>;
  objectAssignmentInitializer?: Expression;
}
export interface Signature {
  flags: SignatureFlags;
  checker?: TypeChecker;
  declaration?: SignatureDeclaration | JSDocSignature;
  typeParameters?: readonly TypeParameter[];
  parameters: readonly Symbol[];
  thisParameter?: Symbol;
  resolvedReturnType?: Type;
  resolvedTypePredicate?: TypePredicate;
  minArgumentCount: number;
  target?: Signature;
  mapper?: TypeMapper;
  unionSignatures?: Signature[];
  erasedSignatureCache?: Signature;
  canonicalSignatureCache?: Signature;
  optionalCallSignatureCache?: { inner?: Signature; outer?: Signature };
  isolatedSignatureType?: ObjectType;
  instantiations?: qb.QMap<Signature>;
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
// prettier-ignore
export type SignatureDeclaration = | CallSignatureDeclaration | ConstructSignatureDeclaration | MethodSignature | IndexSignatureDeclaration | FunctionTypeNode | ConstructorTypeNode | JSDocFunctionType | FunctionDeclaration | MethodDeclaration | ConstructorDeclaration | AccessorDeclaration | FunctionExpression | ArrowFunction;
export interface SignatureDeclarationBase extends NamedDeclaration, JSDocContainer {
  kind: SignatureDeclaration['kind'];
  name?: PropertyName;
  typeParameters?: Nodes<TypeParameterDeclaration>;
  parameters: Nodes<ParameterDeclaration>;
  type?: TypeNode;
  typeArguments?: Nodes<TypeNode>;
}
export interface SourceFile extends Declaration {
  kind: Syntax.SourceFile;
  statements: Nodes<Statement>;
  endOfFileToken: Token<Syntax.EndOfFileToken>;
  fileName: string;
  path: Path;
  text: string;
  resolvedPath: Path;
  originalFileName: string;
  redirectInfo?: RedirectInfo;
  amdDependencies: readonly AmdDependency[];
  moduleName?: string;
  referencedFiles: readonly FileReference[];
  typeReferenceDirectives: readonly FileReference[];
  libReferenceDirectives: readonly FileReference[];
  languageVariant: qy.LanguageVariant;
  isDeclarationFile: boolean;
  renamedDependencies?: qb.QReadonlyMap<string>;
  hasNoDefaultLib: boolean;
  languageVersion: ScriptTarget;
  scriptKind: ScriptKind;
  externalModuleIndicator?: Node;
  commonJsModuleIndicator?: Node;
  jsGlobalAugmentations?: SymbolTable;
  identifiers: qb.QMap<string>;
  nodeCount: number;
  identifierCount: number;
  symbolCount: number;
  parseDiagnostics: DiagnosticWithLocation[];
  bindDiagnostics: DiagnosticWithLocation[];
  bindSuggestionDiagnostics?: DiagnosticWithLocation[];
  jsDocDiagnostics?: DiagnosticWithLocation[];
  additionalSyntacticDiagnostics?: readonly DiagnosticWithLocation[];
  lineMap: readonly number[];
  classifiableNames?: qb.ReadonlyUnderscoreEscapedMap<true>;
  commentDirectives?: CommentDirective[];
  resolvedModules?: qb.QMap<ResolvedModuleFull | undefined>;
  resolvedTypeReferenceDirectiveNames: qb.QMap<ResolvedTypeReferenceDirective | undefined>;
  imports: readonly StringLiteralLike[];
  moduleAugmentations: readonly (StringLiteral | Identifier)[];
  patternAmbientModules?: PatternAmbientModule[];
  ambientModuleNames: readonly string[];
  checkJsDirective?: CheckJsDirective;
  version: string;
  pragmas: ReadonlyPragmaMap;
  localJsxNamespace?: qb.__String;
  localJsxFactory?: EntityName;
  exportedModulesFromDeclarationEmit?: ExportedModulesFromDeclarationEmit;
}
export interface SourceFileInfo {
  helpers?: string[];
  prologues?: SourceFilePrologueInfo[];
}
export interface SourceFileLike {
  readonly text: string;
  lineMap?: readonly number[];
  posOf?(line: number, char: number, edits?: true): number;
}
export interface SourceFilePrologueInfo {
  file: number;
  text: string;
  directives: SourceFilePrologueDirective[];
}
export interface SourceFilePrologueDirective extends qb.Range {
  expression: SourceFilePrologueDirectiveExpression;
}
export interface SourceFilePrologueDirectiveExpression extends qb.Range {
  text: string;
}
export interface SourceMapRange extends qb.Range {
  source?: SourceMapSource;
}
export interface SourceMapSource {
  fileName: string;
  text: string;
  lineMap: readonly number[];
  skipTrivia?: (pos: number) => number;
}
export interface SpreadAssignment extends ObjectLiteralElement, JSDocContainer {
  parent: ObjectLiteralExpression;
  kind: Syntax.SpreadAssignment;
  expression: Expression;
}
export interface SpreadElement extends Expression {
  kind: Syntax.SpreadElement;
  parent: ArrayLiteralExpression | CallExpression | NewExpression;
  expression: Expression;
}
export interface Statement extends Node {
  _statementBrand: any;
}
export interface StringLiteral extends LiteralExpression, Declaration {
  kind: Syntax.StringLiteral;
  textSourceNode?: Identifier | StringLiteralLike | NumericLiteral;
  singleQuote?: boolean;
}
export type StringLiteralLike = StringLiteral | NoSubstitutionLiteral;
export interface SuperExpression extends PrimaryExpression {
  kind: Syntax.SuperKeyword;
}
export interface SuperCall extends CallExpression {
  expression: SuperExpression;
}
export interface SuperPropertyAccessExpression extends PropertyAccessExpression {
  expression: SuperExpression;
}
export interface SwitchStatement extends Statement {
  kind: Syntax.SwitchStatement;
  expression: Expression;
  caseBlock: CaseBlock;
  possiblyExhaustive?: boolean;
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
export interface Symbol {
  flags: SymbolFlags;
  escapedName: qb.__String;
  declarations: Declaration[];
  valueDeclaration: Declaration;
  members?: SymbolTable;
  exports?: SymbolTable;
  globalExports?: SymbolTable;
  id?: number;
  mergeId?: number;
  parent?: Symbol;
  exportSymbol?: Symbol;
  constEnumOnlyModule?: boolean;
  isReferenced?: SymbolFlags;
  isReplaceableByMethod?: boolean;
  isAssigned?: boolean;
  assignmentDeclarationMembers?: qb.QMap<Declaration>;
}
export interface SymbolLinks {
  immediateTarget?: Symbol;
  target?: Symbol;
  type?: Type;
  nameType?: Type;
  uniqueESSymbolType?: Type;
  declaredType?: Type;
  typeParameters?: TypeParameter[];
  outerTypeParameters?: TypeParameter[];
  instantiations?: qb.QMap<Type>;
  inferredClassSymbol?: qb.QMap<TransientSymbol>;
  mapper?: TypeMapper;
  referenced?: boolean;
  constEnumReferenced?: boolean;
  containingType?: UnionOrIntersectionType;
  leftSpread?: Symbol;
  rightSpread?: Symbol;
  syntheticOrigin?: Symbol;
  isDiscriminantProperty?: boolean;
  resolvedExports?: SymbolTable;
  resolvedMembers?: SymbolTable;
  exportsChecked?: boolean;
  typeParametersChecked?: boolean;
  isDeclarationWithCollidingName?: boolean;
  bindingElement?: BindingElement;
  exportsSomeValue?: boolean;
  enumKind?: EnumKind;
  originatingImport?: ImportDeclaration | ImportCall;
  lateSymbol?: Symbol;
  specifierCache?: qb.QMap<string>;
  extendedContainers?: Symbol[];
  extendedContainersByFile?: qb.QMap<Symbol[]>;
  variances?: VarianceFlags[];
  deferralConstituents?: Type[];
  deferralParent?: Type;
  cjsExportMerged?: Symbol;
  typeOnlyDeclaration?: TypeOnlyCompatibleAliasDeclaration | false;
  isConstructorDeclaredProperty?: boolean;
  tupleLabelDeclaration?: NamedTupleMember | ParameterDeclaration;
}
export interface SymbolDisplayPart {}
export interface SymbolTable<S extends Symbol = Symbol> extends Map<qb.__String, S>, qb.UnderscoreEscapedMap<S> {}
export interface SynMap {
  [Syntax.EndOfFileToken]: EndOfFileToken;
  [Syntax.NumericLiteral]: NumericLiteral;
  [Syntax.BigIntLiteral]: BigIntLiteral;
  [Syntax.StringLiteral]: StringLiteral;
  [Syntax.JsxText]: JsxText;
  [Syntax.RegexLiteral]: RegexLiteral;
  [Syntax.NoSubstitutionLiteral]: NoSubstitutionLiteral;
  [Syntax.TemplateHead]: TemplateHead;
  [Syntax.TemplateMiddle]: TemplateMiddle;
  [Syntax.TemplateTail]: TemplateTail;
  [Syntax.DotToken]: DotToken;
  [Syntax.Dot3Token]: Dot3Token;
  [Syntax.QuestionDotToken]: QuestionDotToken;
  [Syntax.EqualsGreaterThanToken]: EqualsGreaterThanToken;
  [Syntax.PlusToken]: PlusToken;
  [Syntax.MinusToken]: MinusToken;
  [Syntax.AsteriskToken]: AsteriskToken;
  [Syntax.ExclamationToken]: ExclamationToken;
  [Syntax.QuestionToken]: QuestionToken;
  [Syntax.ColonToken]: ColonToken;
  [Syntax.EqualsToken]: EqualsToken;
  [Syntax.Identifier]: Identifier;
  [Syntax.PrivateIdentifier]: PrivateIdentifier;
  [Syntax.QualifiedName]: QualifiedName;
  [Syntax.ComputedPropertyName]: ComputedPropertyName;
  [Syntax.TypeParameter]: TypeParameterDeclaration;
  [Syntax.Parameter]: ParameterDeclaration;
  [Syntax.Decorator]: Decorator;
  [Syntax.PropertySignature]: PropertySignature;
  [Syntax.PropertyDeclaration]: PropertyDeclaration;
  [Syntax.MethodSignature]: MethodSignature;
  [Syntax.MethodDeclaration]: MethodDeclaration;
  [Syntax.Constructor]: ConstructorDeclaration;
  [Syntax.GetAccessor]: GetAccessorDeclaration;
  [Syntax.SetAccessor]: SetAccessorDeclaration;
  [Syntax.CallSignature]: CallSignatureDeclaration;
  [Syntax.ConstructSignature]: ConstructSignatureDeclaration;
  [Syntax.IndexSignature]: IndexSignatureDeclaration;
  [Syntax.TypePredicate]: TypePredicateNode;
  [Syntax.TypeReference]: TypeReferenceNode;
  [Syntax.FunctionType]: FunctionTypeNode;
  [Syntax.ConstructorType]: ConstructorTypeNode;
  [Syntax.TypeQuery]: TypeQueryNode;
  [Syntax.TypeLiteral]: TypeLiteralNode;
  [Syntax.ArrayType]: ArrayTypeNode;
  [Syntax.TupleType]: TupleTypeNode;
  [Syntax.OptionalType]: OptionalTypeNode;
  [Syntax.RestType]: RestTypeNode;
  [Syntax.UnionType]: UnionTypeNode;
  [Syntax.IntersectionType]: IntersectionTypeNode;
  [Syntax.ConditionalType]: ConditionalTypeNode;
  [Syntax.InferType]: InferTypeNode;
  [Syntax.ParenthesizedType]: ParenthesizedTypeNode;
  [Syntax.ThisType]: ThisTypeNode;
  [Syntax.TypeOperator]: TypeOperatorNode;
  [Syntax.IndexedAccessType]: IndexedAccessTypeNode;
  [Syntax.MappedType]: MappedTypeNode;
  [Syntax.LiteralType]: LiteralTypeNode;
  [Syntax.NamedTupleMember]: NamedTupleMember;
  [Syntax.ImportType]: ImportTypeNode;
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
  [Syntax.TypeAssertionExpression]: TypeAssertion;
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
  [Syntax.UnparsedText]: UnparsedTextLike;
  [Syntax.UnparsedInternalText]: UnparsedTextLike;
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
  [Syntax.JSDocComment]: JSDoc;
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
  //[Syntax.Count]: Count;
}
export interface SyntaxList extends Node {
  _children: Node[];
}
export interface SynthesizedComment extends CommentRange {
  text: string;
  pos: -1;
  end: -1;
  hasLeadingNewline?: boolean;
}
export interface SyntheticExpression extends Expression {
  kind: Syntax.SyntheticExpression;
  isSpread: boolean;
  type: Type;
  tupleNameSource?: ParameterDeclaration | NamedTupleMember;
}
export interface SyntheticReferenceExpression extends LeftHandSideExpression {
  kind: Syntax.SyntheticReferenceExpression;
  expression: Expression;
  thisArg: Expression;
}
export interface TaggedTemplateExpression extends MemberExpression {
  kind: Syntax.TaggedTemplateExpression;
  tag: LeftHandSideExpression;
  typeArguments?: Nodes<TypeNode>;
  template: TemplateLiteral;
  questionDotToken?: QuestionDotToken;
}
export interface TemplateExpression extends PrimaryExpression {
  kind: Syntax.TemplateExpression;
  head: TemplateHead;
  templateSpans: Nodes<TemplateSpan>;
}
export interface TemplateHead extends TemplateLiteralLikeNode {
  kind: Syntax.TemplateHead;
  parent: TemplateExpression;
  templateFlags?: TokenFlags;
}
export type TemplateLiteral = TemplateExpression | NoSubstitutionLiteral;
export interface TemplateLiteralLikeNode extends LiteralLikeNode {
  rawText?: string;
}
export type TemplateLiteralToken = NoSubstitutionLiteral | TemplateHead | TemplateMiddle | TemplateTail;
export interface TemplateMiddle extends TemplateLiteralLikeNode {
  kind: Syntax.TemplateMiddle;
  parent: TemplateSpan;
  templateFlags?: TokenFlags;
}
export interface TemplateSpan extends Node {
  kind: Syntax.TemplateSpan;
  parent: TemplateExpression;
  expression: Expression;
  literal: TemplateMiddle | TemplateTail;
}
export interface TemplateTail extends TemplateLiteralLikeNode {
  kind: Syntax.TemplateTail;
  parent: TemplateSpan;
  templateFlags?: TokenFlags;
}
export const enum Ternary {
  False = 0,
  Maybe = 1,
  True = -1,
}
export interface ThisExpression extends PrimaryExpression, KeywordTypeNode {
  kind: Syntax.ThisKeyword;
}
export interface ThisTypeNode extends TypeNode {
  kind: Syntax.ThisType;
}
export interface ThisTypePredicate extends TypePredicateBase {
  kind: TypePredicateKind.This;
  parameterName: undefined;
  parameterIndex: undefined;
  type: Type;
}
export interface ThrowStatement extends Statement {
  kind: Syntax.ThrowStatement;
  expression?: Expression;
}
export interface Token<T extends Syntax> extends Node {
  kind: T;
}
export const enum TokenFlags {
  None = 0,
  PrecedingLineBreak = 1 << 0,
  PrecedingJSDocComment = 1 << 1,
  Unterminated = 1 << 2,
  ExtendedEscape = 1 << 3,
  Scientific = 1 << 4, // e.g. `10e2`
  Octal = 1 << 5, // e.g. `0777`
  HexSpecifier = 1 << 6, // e.g. `0x00000000`
  BinarySpecifier = 1 << 7, // e.g. `0b0110010000000000`
  OctalSpecifier = 1 << 8, // e.g. `0o777`
  ContainsSeparator = 1 << 9, // e.g. `0b1100_0101`
  UnicodeEscape = 1 << 10,
  ContainsInvalidEscape = 1 << 11, // e.g. `\uhello`
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
export interface TransientIdentifier extends Identifier {
  resolvedSymbol: Symbol;
}
export interface TransientSymbol extends Symbol, SymbolLinks {
  checkFlags: CheckFlags;
}
export interface TryStatement extends Statement {
  kind: Syntax.TryStatement;
  tryBlock: Block;
  catchClause?: CatchClause;
  finallyBlock?: Block;
}
export interface TupleType extends GenericType {
  minLength: number;
  hasRestElement: boolean;
  readonly: boolean;
  labeledElementDeclarations?: readonly (NamedTupleMember | ParameterDeclaration)[];
}
export interface TupleTypeNode extends TypeNode {
  kind: Syntax.TupleType;
  elements: Nodes<TypeNode | NamedTupleMember>;
}
export interface TupleTypeReference extends TypeReference {
  target: TupleType;
}
export interface TypeAliasDeclaration extends DeclarationStatement, JSDocContainer {
  kind: Syntax.TypeAliasDeclaration;
  name: Identifier;
  typeParameters?: Nodes<TypeParameterDeclaration>;
  type: TypeNode;
}
export interface Type {
  flags: TypeFlags;
  id: number;
  checker: TypeChecker;
  symbol: Symbol;
  pattern?: DestructuringPattern;
  aliasSymbol?: Symbol;
  aliasTypeArguments?: readonly Type[];
  aliasTypeArgumentsContainsMarker?: boolean;
  permissiveInstantiation?: Type;
  restrictiveInstantiation?: Type;
  immediateBaseConstraint?: Type;
  widened?: Type;
}
export interface TypeAcquisition {
  enableAutoDiscovery?: boolean;
  enable?: boolean;
  include?: string[];
  exclude?: string[];
  [option: string]: string[] | boolean | undefined;
}
export interface TypeAssertion extends UnaryExpression {
  kind: Syntax.TypeAssertionExpression;
  type: TypeNode;
  expression: UnaryExpression;
}
export type TypeComparer = (s: Type, t: Type, reportErrors?: boolean) => Ternary;
export interface TypeElement extends NamedDeclaration {
  _typeElementBrand: any;
  name?: PropertyName;
  questionToken?: QuestionToken;
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
export interface TypeLiteralNode extends TypeNode, Declaration {
  kind: Syntax.TypeLiteral;
  members: Nodes<TypeElement>;
}
export type TypeMapper =
  | { kind: TypeMapKind.Simple; source: Type; target: Type }
  | { kind: TypeMapKind.Array; sources: readonly Type[]; targets: readonly Type[] | undefined }
  | { kind: TypeMapKind.Function; func: (t: Type) => Type }
  | { kind: TypeMapKind.Composite | TypeMapKind.Merged; mapper1: TypeMapper; mapper2: TypeMapper };
export interface TypeNode extends Node {
  _typeNodeBrand: any;
}
export interface TypeNode extends Node {
  _typeNodeBrand: any;
}
export interface TypeOfExpression extends UnaryExpression {
  kind: Syntax.TypeOfExpression;
  expression: UnaryExpression;
}
export type TypeOfTag = 'undefined' | 'number' | 'boolean' | 'string' | 'symbol' | 'object' | 'function';
export interface TypeOperatorNode extends TypeNode {
  kind: Syntax.TypeOperator;
  operator: Syntax.KeyOfKeyword | Syntax.UniqueKeyword | Syntax.ReadonlyKeyword;
  type: TypeNode;
}
export type TypeOnlyCompatibleAliasDeclaration = ImportClause | NamespaceImport | ImportOrExportSpecifier;
export interface TypeParameter extends InstantiableType {
  constraint?: Type;
  default?: Type;
  target?: TypeParameter;
  mapper?: TypeMapper;
  isThisType?: boolean;
  resolvedDefaultType?: Type;
}
export interface TypeParameterDeclaration extends NamedDeclaration {
  kind: Syntax.TypeParameter;
  parent: DeclarationWithTypeParameterChildren | InferTypeNode;
  name: Identifier;
  constraint?: TypeNode;
  default?: TypeNode;
  expression?: Expression;
}
export type TypePredicate = ThisTypePredicate | IdentifierTypePredicate | AssertsThisTypePredicate | AssertsIdentifierTypePredicate;
export interface TypePredicateBase {
  kind: TypePredicateKind;
  type: Type | undefined;
}
export const enum TypePredicateKind {
  This,
  Identifier,
  AssertsThis,
  AssertsIdentifier,
}
export interface TypePredicateNode extends TypeNode {
  kind: Syntax.TypePredicate;
  parent: SignatureDeclaration | JSDocTypeExpression;
  assertsModifier?: AssertsToken;
  parameterName: Identifier | ThisTypeNode;
  type?: TypeNode;
}
export interface TypeQueryNode extends TypeNode {
  kind: Syntax.TypeQuery;
  exprName: EntityName;
}
export interface TypeReference extends ObjectType {
  target: GenericType;
  node?: TypeReferenceNode | ArrayTypeNode | TupleTypeNode;
  mapper?: TypeMapper;
  resolvedTypeArguments?: readonly Type[];
  literalType?: TypeReference;
}
export interface TypeReferenceNode extends NodeWithTypeArguments {
  kind: Syntax.TypeReference;
  typeName: EntityName;
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
export type TypeReferenceType = TypeReferenceNode | ExpressionWithTypeArguments;
export interface UnaryExpression extends Expression {
  _unaryExpressionBrand: any;
}
export type TypeVariable = TypeParameter | IndexedAccessType;
export type UnionOrIntersectionTypeNode = UnionTypeNode | IntersectionTypeNode;
export interface UnionTypeNode extends TypeNode {
  kind: Syntax.UnionType;
  types: Nodes<TypeNode>;
}
export interface UniqueTypeOperatorNode extends TypeOperatorNode {
  operator: Syntax.UniqueKeyword;
}
export interface UnionOrIntersectionType extends Type {
  types: Type[];
  objectFlags: ObjectFlags;
  propertyCache: SymbolTable;
  resolvedProperties: Symbol[];
  resolvedIndexType: IndexType;
  resolvedStringIndexType: IndexType;
  resolvedBaseConstraint: Type;
}
export interface UnionType extends UnionOrIntersectionType {
  resolvedReducedType: Type;
  regularType: UnionType;
}
export type UnparsedNode = UnparsedPrologue | UnparsedSourceText | UnparsedSyntheticReference;
export interface UnparsedPrepend extends UnparsedSection {
  kind: Syntax.UnparsedPrepend;
  data: string;
  parent: UnparsedSource;
  texts: readonly UnparsedTextLike[];
}
export interface UnparsedPrologue extends UnparsedSection {
  kind: Syntax.UnparsedPrologue;
  data: string;
  parent: UnparsedSource;
}
export interface UnparsedSection extends Node {
  kind: Syntax;
  data?: string;
  parent: UnparsedSource;
}
export interface UnparsedSource extends Node {
  kind: Syntax.UnparsedSource;
  fileName: string;
  text: string;
  prologues: readonly UnparsedPrologue[];
  helpers: readonly UnscopedEmitHelper[] | undefined;
  referencedFiles: readonly FileReference[];
  typeReferenceDirectives: readonly string[] | undefined;
  libReferenceDirectives: readonly FileReference[];
  hasNoDefaultLib?: boolean;
  sourceMapPath?: string;
  sourceMapText?: string;
  syntheticReferences?: readonly UnparsedSyntheticReference[];
  texts: readonly UnparsedSourceText[];
  oldFileOfCurrentEmit?: boolean;
  parsedSourceMap?: RawSourceMap | false | undefined;
  getLineAndCharacterOfPosition(pos: number): qy.LineAndChar;
}
export type UnparsedSourceText = UnparsedPrepend | UnparsedTextLike;
export interface UnparsedSyntheticReference extends UnparsedSection {
  kind: Syntax.UnparsedSyntheticReference;
  parent: UnparsedSource;
  section: BundleFileHasNoDefaultLib | BundleFileReference;
}
export interface UnparsedTextLike extends UnparsedSection {
  kind: Syntax.UnparsedText | Syntax.UnparsedInternalText;
  parent: UnparsedSource;
}
export interface UnscopedEmitHelper extends EmitHelper {
  readonly scoped: false;
  readonly importName?: string;
  readonly text: string;
}
export interface UpdateExpression extends UnaryExpression {
  _updateExpressionBrand: any;
}
export interface ValidImportTypeNode extends ImportTypeNode {
  argument: LiteralTypeNode & { literal: StringLiteral };
}
export interface VariableDeclaration extends NamedDeclaration {
  kind: Syntax.VariableDeclaration;
  parent: VariableDeclarationList | CatchClause;
  name: BindingName;
  exclamationToken?: ExclamationToken;
  type?: TypeNode;
  initializer?: Expression;
}
export interface VariableDeclarationList extends Node {
  kind: Syntax.VariableDeclarationList;
  parent: VariableStatement | ForStatement | ForOfStatement | ForInStatement;
  declarations: Nodes<VariableDeclaration>;
}
// prettier-ignore
export type VariableLikeDeclaration = | VariableDeclaration | ParameterDeclaration | BindingElement | PropertyDeclaration | PropertyAssignment | PropertySignature | JsxAttribute | ShorthandPropertyAssignment | EnumMember | JSDocPropertyTag | JSDocParameterTag;
export interface VariableStatement extends Statement, JSDocContainer {
  kind: Syntax.VariableStatement;
  declarationList: VariableDeclarationList;
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
export interface VoidExpression extends UnaryExpression {
  kind: Syntax.VoidExpression;
  expression: UnaryExpression;
}
export interface WellKnownSymbolExpression extends PropertyAccessExpression {
  expression: Identifier & { escapedText: 'Symbol' };
  name: Identifier;
}
export interface WhileStatement extends IterationStatement {
  kind: Syntax.WhileStatement;
  expression: Expression;
}
export interface WithStatement extends Statement {
  kind: Syntax.WithStatement;
  expression: Expression;
  statement: Statement;
}
export interface YieldExpression extends Expression {
  kind: Syntax.YieldExpression;
  asteriskToken?: AsteriskToken;
  expression?: Expression;
}

/*
export interface TypeChecker {
  getTypeOfSymbolAtLocation(symbol: Symbol, node: Node): Type;
  getDeclaredTypeOfSymbol(symbol: Symbol): Type;
  getPropertiesOfType(type: Type): Symbol[];
  getPropertyOfType(type: Type, propertyName: string): Symbol | undefined;
  getPrivateIdentifierPropertyOfType(leftType: Type, name: string, location: Node): Symbol | undefined;
  getTypeOfPropertyOfType(type: Type, propertyName: string): Type | undefined;
  getIndexInfoOfType(type: Type, kind: IndexKind): IndexInfo | undefined;
  getSignaturesOfType(type: Type, kind: SignatureKind): readonly Signature[];
  getIndexTypeOfType(type: Type, kind: IndexKind): Type | undefined;
  getBaseTypes(type: InterfaceType): BaseType[];
  getBaseTypeOfLiteralType(type: Type): Type;
  getWidenedType(type: Type): Type;
  getPromisedTypeOfPromise(promise: Type, errorNode?: Node): Type | undefined;
  getAwaitedType(type: Type): Type | undefined;
  getReturnTypeOfSignature(signature: Signature): Type;
  getParameterType(signature: Signature, parameterIndex: number): Type;
  getNullableType(type: Type, flags: TypeFlags): Type;
  getNonNullableType(type: Type): Type;
  getNonOptionalType(type: Type): Type;
  isNullableType(type: Type): boolean;
  getTypeArguments(type: TypeReference): readonly Type[];
  typeToTypeNode(type: Type, enclosingDeclaration: Node | undefined, flags: NodeBuilderFlags | undefined): TypeNode | undefined;
  typeToTypeNode(type: Type, enclosingDeclaration: Node | undefined, flags: NodeBuilderFlags | undefined, tracker?: SymbolTracker): TypeNode | undefined;
  signatureToSignatureDeclaration(
    signature: Signature,
    kind: Syntax,
    enclosingDeclaration: Node | undefined,
    flags: NodeBuilderFlags | undefined
  ): (SignatureDeclaration & { typeArguments?: Nodes<TypeNode> }) | undefined;
  signatureToSignatureDeclaration(
    signature: Signature,
    kind: Syntax,
    enclosingDeclaration: Node | undefined,
    flags: NodeBuilderFlags | undefined,
    tracker?: SymbolTracker
  ): (SignatureDeclaration & { typeArguments?: Nodes<TypeNode> }) | undefined;
  indexInfoToIndexSignatureDeclaration(indexInfo: IndexInfo, kind: IndexKind, enclosingDeclaration: Node | undefined, flags: NodeBuilderFlags | undefined): IndexSignatureDeclaration | undefined;
  indexInfoToIndexSignatureDeclaration(
    indexInfo: IndexInfo,
    kind: IndexKind,
    enclosingDeclaration: Node | undefined,
    flags: NodeBuilderFlags | undefined,
    tracker?: SymbolTracker
  ): IndexSignatureDeclaration | undefined;
  symbolToEntityName(symbol: Symbol, meaning: SymbolFlags, enclosingDeclaration: Node | undefined, flags: NodeBuilderFlags | undefined): EntityName | undefined;
  symbolToExpression(symbol: Symbol, meaning: SymbolFlags, enclosingDeclaration: Node | undefined, flags: NodeBuilderFlags | undefined): Expression | undefined;
  symbolToTypeParameterDeclarations(symbol: Symbol, enclosingDeclaration: Node | undefined, flags: NodeBuilderFlags | undefined): Nodes<TypeParameterDeclaration> | undefined;
  symbolToParameterDeclaration(symbol: Symbol, enclosingDeclaration: Node | undefined, flags: NodeBuilderFlags | undefined): ParameterDeclaration | undefined;
  typeParameterToDeclaration(parameter: TypeParameter, enclosingDeclaration: Node | undefined, flags: NodeBuilderFlags | undefined): TypeParameterDeclaration | undefined;
  getSymbolsInScope(location: Node, meaning: SymbolFlags): Symbol[];
  getSymbolAtLocation(node: Node): Symbol | undefined;
  getSymbolsOfParameterPropertyDeclaration(parameter: ParameterDeclaration, parameterName: string): Symbol[];
  getShorthandAssignmentValueSymbol(location: Node): Symbol | undefined;
  getExportSpecifierLocalTargetSymbol(location: ExportSpecifier): Symbol | undefined;
  getExportSymbolOfSymbol(symbol: Symbol): Symbol;
  getPropertySymbolOfDestructuringAssignment(location: Identifier): Symbol | undefined;
  getTypeOfAssignmentPattern(pattern: AssignmentPattern): Type;
  getTypeAtLocation(node: Node): Type;
  getTypeFromTypeNode(node: TypeNode): Type;
  signatureToString(signature: Signature, enclosingDeclaration?: Node, flags?: TypeFormatFlags, kind?: SignatureKind): string;
  typeToString(type: Type, enclosingDeclaration?: Node, flags?: TypeFormatFlags): string;
  symbolToString(s: Symbol, decl?: Node, meaning?: SymbolFlags, flags?: SymbolFormatFlags): string;
  typePredicateToString(predicate: TypePredicate, enclosingDeclaration?: Node, flags?: TypeFormatFlags): string;
  writeSignature(signature: Signature, enclosingDeclaration?: Node, flags?: TypeFormatFlags, kind?: SignatureKind, writer?: EmitTextWriter): string;
  writeType(type: Type, enclosingDeclaration?: Node, flags?: TypeFormatFlags, writer?: EmitTextWriter): string;
  writeSymbol(symbol: Symbol, enclosingDeclaration?: Node, meaning?: SymbolFlags, flags?: SymbolFormatFlags, writer?: EmitTextWriter): string;
  writeTypePredicate(predicate: TypePredicate, enclosingDeclaration?: Node, flags?: TypeFormatFlags, writer?: EmitTextWriter): string;
  getFullyQualifiedName(symbol: Symbol): string;
  getAugmentedPropertiesOfType(type: Type): Symbol[];
  getRootSymbols(symbol: Symbol): readonly Symbol[];
  getContextualType(node: Expression): Type | undefined;
  getContextualType(node: Expression, contextFlags?: ContextFlags): Type | undefined;
  getContextualTypeForObjectLiteralElement(element: ObjectLiteralElementLike): Type | undefined;
  getContextualTypeForArgumentAtIndex(call: CallLikeExpression, argIndex: number): Type | undefined;
  getContextualTypeForJsxAttribute(attribute: JsxAttribute | JsxSpreadAttribute): Type | undefined;
  isContextSensitive(node: Expression | MethodDeclaration | ObjectLiteralElementLike | JsxAttributeLike): boolean;
  getResolvedSignature(node: CallLikeExpression, candidatesOutArray?: Signature[], argumentCount?: number): Signature | undefined;
  getResolvedSignatureForSignatureHelp(node: CallLikeExpression, candidatesOutArray?: Signature[], argumentCount?: number): Signature | undefined;
  getExpandedParameters(sig: Signature): readonly (readonly Symbol[])[];
  hasEffectiveRestParameter(sig: Signature): boolean;
  getSignatureFromDeclaration(declaration: SignatureDeclaration): Signature | undefined;
  isImplementationOfOverload(node: SignatureDeclaration): boolean | undefined;
  isUndefinedSymbol(symbol: Symbol): boolean;
  isArgumentsSymbol(symbol: Symbol): boolean;
  isUnknownSymbol(symbol: Symbol): boolean;
  getMergedSymbol(symbol: Symbol): Symbol;
  getConstantValue(node: EnumMember | PropertyAccessExpression | ElementAccessExpression): string | number | undefined;
  isValidPropertyAccess(node: PropertyAccessExpression | QualifiedName | ImportTypeNode, propertyName: string): boolean;
  isValidPropertyAccessForCompletions(node: PropertyAccessExpression | ImportTypeNode | QualifiedName, type: Type, property: Symbol): boolean;
  getAliasedSymbol(symbol: Symbol): Symbol;
  getImmediateAliasedSymbol(symbol: Symbol): Symbol | undefined;
  getExportsOfModule(moduleSymbol: Symbol): Symbol[];
  getExportsAndPropertiesOfModule(moduleSymbol: Symbol): Symbol[];
  getJsxIntrinsicTagNamesAt(location: Node): Symbol[];
  isOptionalParameter(node: ParameterDeclaration): boolean;
  getAmbientModules(): Symbol[];
  tryGetMemberInModuleExports(memberName: string, moduleSymbol: Symbol): Symbol | undefined;
  tryGetMemberInModuleExportsAndProperties(memberName: string, moduleSymbol: Symbol): Symbol | undefined;
  getApparentType(type: Type): Type;
  getSuggestedSymbolForNonexistentProperty(name: Identifier | PrivateIdentifier | string, containingType: Type): Symbol | undefined;
  getSuggestionForNonexistentProperty(name: Identifier | PrivateIdentifier | string, containingType: Type): string | undefined;
  getSuggestedSymbolForNonexistentSymbol(location: Node, name: string, meaning: SymbolFlags): Symbol | undefined;
  getSuggestionForNonexistentSymbol(location: Node, name: string, meaning: SymbolFlags): string | undefined;
  getSuggestedSymbolForNonexistentModule(node: Identifier, target: Symbol): Symbol | undefined;
  getSuggestionForNonexistentExport(node: Identifier, target: Symbol): string | undefined;
  getBaseConstraintOfType(type: Type): Type | undefined;
  getDefaultFromTypeParameter(type: Type): Type | undefined;
  getAnyType(): Type;
  getStringType(): Type;
  getNumberType(): Type;
  getBooleanType(): Type;
  getFalseType(fresh?: boolean): Type;
  getTrueType(fresh?: boolean): Type;
  getVoidType(): Type;
  getUndefinedType(): Type;
  getNullType(): Type;
  getESSymbolType(): Type;
  getNeverType(): Type;
  getOptionalType(): Type;
  getUnionType(types: Type[], subtypeReduction?: UnionReduction): Type;
  createArrayType(elementType: Type): Type;
  getElementTypeOfArrayType(arrayType: Type): Type | undefined;
  createPromiseType(type: Type): Type;
  isTypeAssignableTo(source: Type, target: Type): boolean;
  createAnonymousType(
    symbol: Symbol | undefined,
    members: SymbolTable,
    callSignatures: Signature[],
    constructSignatures: Signature[],
    stringIndexInfo: IndexInfo | undefined,
    numberIndexInfo: IndexInfo | undefined
  ): Type;
  createSignature(
    declaration: SignatureDeclaration,
    typeParameters: TypeParameter[] | undefined,
    thisParameter: Symbol | undefined,
    parameters: Symbol[],
    resolvedReturnType: Type,
    typePredicate: TypePredicate | undefined,
    minArgumentCount: number,
    flags: SignatureFlags
  ): Signature;
  createIndexInfo(type: Type, isReadonly: boolean, declaration?: SignatureDeclaration): IndexInfo;
  isSymbolAccessible(symbol: Symbol, enclosingDeclaration: Node | undefined, meaning: SymbolFlags, shouldComputeAliasToMarkVisible: boolean): SymbolAccessibilityResult;
  tryFindAmbientModuleWithoutAugmentations(moduleName: string): Symbol | undefined;
  getSymbolWalker(accept?: (symbol: Symbol) => boolean): SymbolWalker;
  getDiagnostics(sourceFile?: SourceFile, cancellationToken?: CancellationToken): Diagnostic[];
  getGlobalDiagnostics(): Diagnostic[];
  getEmitResolver(sourceFile?: SourceFile, cancellationToken?: CancellationToken): EmitResolver;
  getNodeCount(): number;
  getIdentifierCount(): number;
  getSymbolCount(): number;
  getTypeCount(): number;
  getInstantiationCount(): number;
  getRelationCacheSizes(): { assignable: number; identity: number; subtype: number; strictSubtype: number };
  isArrayType(type: Type): boolean;
  isTupleType(type: Type): boolean;
  isArrayLikeType(type: Type): boolean;
  isTypeInvalidDueToUnionDiscriminant(contextualType: Type, obj: ObjectLiteralExpression | JsxAttributes): boolean;
  getAllPossiblePropertiesOfTypes(type: readonly Type[]): Symbol[];
  resolveName(name: string, location: Node | undefined, meaning: SymbolFlags, excludeGlobals: boolean): Symbol | undefined;
  getJsxNamespace(location?: Node): string;
  getAccessibleSymbolChain(symbol: Symbol, enclosingDeclaration: Node | undefined, meaning: SymbolFlags, useOnlyExternalAliasing: boolean): Symbol[] | undefined;
  getTypePredicateOfSignature(signature: Signature): TypePredicate | undefined;
  resolveExternalModuleName(moduleSpecifier: Expression): Symbol | undefined;
  resolveExternalModuleSymbol(symbol: Symbol): Symbol;
  tryGetThisTypeAt(node: Node, includeGlobalThis?: boolean): Type | undefined;
  getTypeArgumentConstraint(node: TypeNode): Type | undefined;
  getSuggestionDiagnostics(file: SourceFile, cancellationToken?: CancellationToken): readonly DiagnosticWithLocation[];
  runWithCancellationToken<T>(token: CancellationToken, cb: (checker: TypeChecker) => T): T;
  getLocalTypeParametersOfClassOrInterfaceOrTypeAlias(symbol: Symbol): readonly TypeParameter[] | undefined;
  isDeclarationVisible(node: Declaration | AnyImportSyntax): boolean;
}
export interface TypeCheckerHost extends ModuleSpecifierResolutionHost {
  getCompilerOptions(): CompilerOptions;
  getSourceFiles(): readonly SourceFile[];
  getSourceFile(fileName: string): SourceFile | undefined;
  getResolvedTypeReferenceDirectives(): qb.QReadonlyMap<ResolvedTypeReferenceDirective | undefined>;
  getProjectReferenceRedirect(fileName: string): string | undefined;
  isSourceOfProjectReferenceRedirect(fileName: string): boolean;
  readonly redirectTargetsMap: RedirectTargetsMap;
}
// qpx
export type MatchingKeys<TRecord, TMatch, K extends keyof TRecord = keyof TRecord> = K extends (TRecord[K] extends TMatch ? K : never) ? K : never;
export const enum RelationComparisonResult {
  Succeeded = 1 << 0,
  Failed = 1 << 1,
  Reported = 1 << 2,
  ReportsUnmeasurable = 1 << 3,
  ReportsUnreliable = 1 << 4,
  ReportsMask = ReportsUnmeasurable | ReportsUnreliable,
}
export interface JsonSourceFile extends SourceFile {
  statements: Nodes<JsonObjectExpressionStatement>;
}
export interface TsConfigSourceFile extends JsonSourceFile {
  extendedSourceFiles?: string[];
}
export interface JsonMinusNumericLiteral extends PrefixUnaryExpression {
  kind: Syntax.PrefixUnaryExpression;
  operator: Syntax.MinusToken;
  operand: NumericLiteral;
}
export interface JsonObjectExpressionStatement extends ExpressionStatement {
  expression: ObjectLiteralExpression | ArrayLiteralExpression | JsonMinusNumericLiteral | NumericLiteral | StringLiteral | BooleanLiteral | NullLiteral;
}
export interface ScriptReferenceHost {
  getCompilerOptions(): CompilerOptions;
  getSourceFile(fileName: string): SourceFile | undefined;
  getSourceFileByPath(path: Path): SourceFile | undefined;
  getCurrentDirectory(): string;
}
export interface ParseConfigHost {
  useCaseSensitiveFileNames: boolean;
  readDirectory(rootDir: string, extensions: readonly string[], excludes: readonly string[] | undefined, includes: readonly string[], depth?: number): readonly string[];
  fileExists(path: string): boolean;
  readFile(path: string): string | undefined;
  trace?(s: string): void;
}
export type ResolvedConfigFileName = string & { _isResolvedConfigFileName: never };
export type WriteFileCallback = (fileName: string, data: string, writeByteOrderMark: boolean, onError?: (message: string) => void, sourceFiles?: readonly SourceFile[]) => void;
export class OperationCanceledException {}
export interface CancellationToken {
  isCancellationRequested(): boolean;
  throwIfCancellationRequested(): void;
}
export enum RefFileKind {
  Import,
  ReferenceFile,
  TypeReferenceDirective,
}
export interface RefFile {
  referencedFileName: string;
  kind: RefFileKind;
  index: number;
  file: Path;
}
export interface Program extends ScriptReferenceHost {
  getCurrentDirectory(): string;
  getRootFileNames(): readonly string[];
  getSourceFiles(): readonly SourceFile[];
  getMissingFilePaths(): readonly Path[];
  getRefFileMap(): qb.MultiMap<RefFile> | undefined;
  getFilesByNameMap(): qb.QMap<SourceFile | false | undefined>;
  emit(targetSourceFile?: SourceFile, writeFile?: WriteFileCallback, cancellationToken?: CancellationToken, emitOnlyDtsFiles?: boolean, customTransformers?: CustomTransformers): EmitResult;
  emit(
    targetSourceFile?: SourceFile,
    writeFile?: WriteFileCallback,
    cancellationToken?: CancellationToken,
    emitOnlyDtsFiles?: boolean,
    customTransformers?: CustomTransformers,
    forceDtsEmit?: boolean
  ): EmitResult;
  getOptionsDiagnostics(cancellationToken?: CancellationToken): readonly Diagnostic[];
  getGlobalDiagnostics(cancellationToken?: CancellationToken): readonly Diagnostic[];
  getSyntacticDiagnostics(sourceFile?: SourceFile, cancellationToken?: CancellationToken): readonly DiagnosticWithLocation[];
  getSemanticDiagnostics(sourceFile?: SourceFile, cancellationToken?: CancellationToken): readonly Diagnostic[];
  getDeclarationDiagnostics(sourceFile?: SourceFile, cancellationToken?: CancellationToken): readonly DiagnosticWithLocation[];
  getConfigFileParsingDiagnostics(): readonly Diagnostic[];
  getSuggestionDiagnostics(sourceFile: SourceFile, cancellationToken?: CancellationToken): readonly DiagnosticWithLocation[];
  getBindAndCheckDiagnostics(sourceFile: SourceFile, cancellationToken?: CancellationToken): readonly Diagnostic[];
  getProgramDiagnostics(sourceFile: SourceFile, cancellationToken?: CancellationToken): readonly Diagnostic[];
  getTypeChecker(): TypeChecker;
  getCommonSourceDirectory(): string;
  getDiagnosticsProducingTypeChecker(): TypeChecker;
  dropDiagnosticsProducingTypeChecker(): void;
  getClassifiableNames(): qb.UnderscoreEscapedMap<true>;
  getNodeCount(): number;
  getIdentifierCount(): number;
  getSymbolCount(): number;
  getTypeCount(): number;
  getInstantiationCount(): number;
  getRelationCacheSizes(): { assignable: number; identity: number; subtype: number; strictSubtype: number };
  getFileProcessingDiagnostics(): DiagnosticCollection;
  getResolvedTypeReferenceDirectives(): qb.QMap<ResolvedTypeReferenceDirective | undefined>;
  isSourceFileFromExternalLibrary(file: SourceFile): boolean;
  isSourceFileDefaultLibrary(file: SourceFile): boolean;
  structureIsReused?: StructureIsReused;
  getSourceFileFromReference(referencingFile: SourceFile | UnparsedSource, ref: FileReference): SourceFile | undefined;
  getLibFileFromReference(ref: FileReference): SourceFile | undefined;
  sourceFileToPackageName: qb.QMap<string>;
  redirectTargetsMap: qb.MultiMap<string>;
  isEmittedFile(file: string): boolean;
  getResolvedModuleWithFailedLookupLocationsFromCache(moduleName: string, containingFile: string): ResolvedModuleWithFailedLookupLocations | undefined;
  getProjectReferences(): readonly ProjectReference[] | undefined;
  getResolvedProjectReferences(): readonly (ResolvedProjectReference | undefined)[] | undefined;
  getProjectReferenceRedirect(fileName: string): string | undefined;
  getResolvedProjectReferenceToRedirect(fileName: string): ResolvedProjectReference | undefined;
  forEachResolvedProjectReference<T>(cb: (resolvedProjectReference: ResolvedProjectReference | undefined, resolvedProjectReferencePath: Path) => T | undefined): T | undefined;
  getResolvedProjectReferenceByPath(projectReferencePath: Path): ResolvedProjectReference | undefined;
  isSourceOfProjectReferenceRedirect(fileName: string): boolean;
  getProgramBuildInfo?(): ProgramBuildInfo | undefined;
  emitBuildInfo(writeFile?: WriteFileCallback, cancellationToken?: CancellationToken): EmitResult;
  getProbableSymlinks(): qb.QReadonlyMap<string>;
  fileExists(fileName: string): boolean;
}
export interface Program extends TypeCheckerHost, ModuleSpecifierResolutionHost {}
export type RedirectTargetsMap = qb.QReadonlyMap<readonly string[]>;
export interface ResolvedProjectReference {
  commandLine: ParsedCommandLine;
  sourceFile: SourceFile;
  references?: readonly (ResolvedProjectReference | undefined)[];
}
export const enum StructureIsReused {
  Not = 0,
  SafeModules = 1 << 0,
  Completely = 1 << 1,
}
export type Transformer<T extends Node> = (node: T) => T;
export interface TransformationContext {}
export type TransformerFactory<T extends Node> = (c: TransformationContext) => Transformer<T>;
export type CustomTransformerFactory = (context: TransformationContext) => CustomTransformer;
export interface CustomTransformer {
  transformSourceFile(node: SourceFile): SourceFile;
  transformBundle(node: Bundle): Bundle;
}
export interface CustomTransformers {
  before?: (TransformerFactory<SourceFile> | CustomTransformerFactory)[];
  after?: (TransformerFactory<SourceFile> | CustomTransformerFactory)[];
  afterDeclarations?: (TransformerFactory<Bundle | SourceFile> | CustomTransformerFactory)[];
}
export interface EmitTransformers {
  scriptTransformers: readonly TransformerFactory<SourceFile | Bundle>[];
  declarationTransformers: readonly TransformerFactory<SourceFile | Bundle>[];
}
export interface SourceMapSpan {
  emittedLine: number;
  emittedColumn: number;
  sourceLine: number;
  sourceColumn: number;
  nameIndex?: number;
  sourceIndex: number;
}
export interface SourceMapEmitResult {
  inputSourceFileNames: readonly string[];
  sourceMap: RawSourceMap;
}
export enum ExitStatus {
  Success = 0,
  DiagnosticsPresent_OutputsSkipped = 1,
  DiagnosticsPresent_OutputsGenerated = 2,
  InvalidProject_OutputsSkipped = 3,
  ProjectReferenceCycle_OutputsSkipped = 4,
  ProjectReferenceCycle_OutputsSkupped = 4,
}
export interface EmitResult {
  emitSkipped: boolean;
  diagnostics: readonly Diagnostic[];
  emittedFiles?: string[];
  sourceMaps?: SourceMapEmitResult[];
  exportedModulesFromDeclarationEmit?: ExportedModulesFromDeclarationEmit;
}
export const enum UnionReduction {
  None = 0,
  Literal,
  Subtype,
}
export const enum ContextFlags {
  None = 0,
  Signature = 1 << 0,
  NoConstraints = 1 << 1,
  Completions = 1 << 2,
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
export const enum SymbolFormatFlags {
  None = 0x00000000,
  // Write symbols's type argument if it is instantiated symbol
  // eg. class C<T> { p: T }   <-- Show p as C<T>.p here
  //     var a: C<number>;
  //     var p = a.p; <--- Here p is property of C<number> so show it as C<number>.p instead of just C.p
  WriteTypeParametersOrArguments = 0x00000001,
  // Use only external alias information to get the symbol name in the given context
  // eg.  module m { export class c { } } import x = m.c;
  // When this flag is specified m.c will be used to refer to the class instead of alias symbol x
  UseOnlyExternalAliasing = 0x00000002,
  // Build symbol name using any nodes needed, instead of just components of an entity name
  AllowAnyNodeKind = 0x00000004,
  // Prefer aliases which are not directly visible
  UseAliasDefinedOutsideCurrentScope = 0x00000008,
  // Skip building an accessible symbol chain
  DoNotIncludeSymbolChain = 0x00000010,
}
export interface SymbolWalker {
  walkType(root: Type): { visitedTypes: readonly Type[]; visitedSymbols: readonly Symbol[] };
  walkSymbol(root: Symbol): { visitedTypes: readonly Type[]; visitedSymbols: readonly Symbol[] };
}
interface SymbolWriter extends SymbolTracker {
  writeKeyword(text: string): void;
  writeOperator(text: string): void;
  writePunctuation(text: string): void;
  writeSpace(text: string): void;
  writeStringLiteral(text: string): void;
  writeParameter(text: string): void;
  writeProperty(text: string): void;
  writeSymbol(text: string, symbol: Symbol): void;
  writeLine(force?: boolean): void;
  increaseIndent(): void;
  decreaseIndent(): void;
  clear(): void;
}
export const enum SymbolAccessibility {
  Accessible,
  NotAccessible,
  CannotBeNamed,
}
export const enum SyntheticSymbolKind {
  UnionOrIntersection,
  Spread,
}
export type LateVisibilityPaintedStatement = | AnyImportSyntax | VariableStatement | ClassDeclaration | FunctionDeclaration | ModuleDeclaration | TypeAliasDeclaration | InterfaceDeclaration | EnumDeclaration;
export interface SymbolVisibilityResult {
  accessibility: SymbolAccessibility;
  aliasesToMakeVisible?: LateVisibilityPaintedStatement[];
  errorSymbolName?: string;
  errorNode?: Node;
}
export interface SymbolAccessibilityResult extends SymbolVisibilityResult {
  errorModuleName?: string;
}
export interface EmitResolver {
  hasGlobalName(name: string): boolean;
  getReferencedExportContainer(node: Identifier, prefixLocals?: boolean): SourceFile | ModuleDeclaration | EnumDeclaration | undefined;
  getReferencedImportDeclaration(node: Identifier): Declaration | undefined;
  getReferencedDeclarationWithCollidingName(node: Identifier): Declaration | undefined;
  isDeclarationWithCollidingName(node: Declaration): boolean;
  isValueAliasDeclaration(node: Node): boolean;
  isReferencedAliasDeclaration(node: Node, checkChildren?: boolean): boolean;
  isTopLevelValueImportEqualsWithEntityName(node: ImportEqualsDeclaration): boolean;
  getNodeCheckFlags(node: Node): NodeCheckFlags;
  isDeclarationVisible(node: Declaration | AnyImportSyntax): boolean;
  isLateBound(node: Declaration): node is LateBoundDeclaration;
  collectLinkedAliases(node: Identifier, setVisibility?: boolean): Node[] | undefined;
  isImplementationOfOverload(node: FunctionLikeDeclaration): boolean | undefined;
  isRequiredInitializedParameter(node: ParameterDeclaration): boolean;
  isOptionalUninitializedParameterProperty(node: ParameterDeclaration): boolean;
  isExpandoFunctionDeclaration(node: FunctionDeclaration): boolean;
  getPropertiesOfContainerFunction(node: Declaration): Symbol[];
  createTypeOfDeclaration(
    declaration: AccessorDeclaration | VariableLikeDeclaration | PropertyAccessExpression,
    enclosingDeclaration: Node,
    flags: NodeBuilderFlags,
    tracker: SymbolTracker,
    addUndefined?: boolean
  ): TypeNode | undefined;
  createReturnTypeOfSignatureDeclaration(signatureDeclaration: SignatureDeclaration, enclosingDeclaration: Node, flags: NodeBuilderFlags, tracker: SymbolTracker): TypeNode | undefined;
  createTypeOfExpression(expr: Expression, enclosingDeclaration: Node, flags: NodeBuilderFlags, tracker: SymbolTracker): TypeNode | undefined;
  createLiteralConstValue(node: VariableDeclaration | PropertyDeclaration | PropertySignature | ParameterDeclaration, tracker: SymbolTracker): Expression;
  isSymbolAccessible(symbol: Symbol, enclosingDeclaration: Node | undefined, meaning: SymbolFlags | undefined, shouldComputeAliasToMarkVisible: boolean): SymbolAccessibilityResult;
  isEntityNameVisible(entityName: EntityNameOrEntityNameExpression, enclosingDeclaration: Node): SymbolVisibilityResult;
  getConstantValue(node: EnumMember | PropertyAccessExpression | ElementAccessExpression): string | number | undefined;
  getReferencedValueDeclaration(reference: Identifier): Declaration | undefined;
  getTypeReferenceSerializationKind(typeName: EntityName, location?: Node): TypeReferenceSerializationKind;
  isOptionalParameter(node: ParameterDeclaration): boolean;
  moduleExportsSomeValue(moduleReferenceExpression: Expression): boolean;
  isArgumentsLocalBinding(node: Identifier): boolean;
  getExternalModuleFileFromDeclaration(declaration: ImportEqualsDeclaration | ImportDeclaration | ExportDeclaration | ModuleDeclaration | ImportTypeNode): SourceFile | undefined;
  getTypeReferenceDirectivesForEntityName(name: EntityNameOrEntityNameExpression): string[] | undefined;
  getTypeReferenceDirectivesForSymbol(symbol: Symbol, meaning?: SymbolFlags): string[] | undefined;
  isLiteralConstDeclaration(node: VariableDeclaration | PropertyDeclaration | PropertySignature | ParameterDeclaration): boolean;
  getJsxFactoryEntity(location?: Node): EntityName | undefined;
  getAllAccessorDeclarations(declaration: AccessorDeclaration): AllAccessorDeclarations;
  getSymbolOfExternalModuleSpecifier(node: StringLiteralLike): Symbol | undefined;
  isBindingCapturedByNode(node: Node, decl: VariableDeclaration | BindingElement): boolean;
  getDeclarationStatementsForSourceFile(node: SourceFile, flags: NodeBuilderFlags, tracker: SymbolTracker, bundled?: boolean): Statement[] | undefined;
  isImportRequiredByAugmentation(decl: ImportDeclaration): boolean;
}
export const enum NodeCheckFlags {
  TypeChecked = 0x00000001, // Node has been type checked
  LexicalThis = 0x00000002, // Lexical 'this' reference
  CaptureThis = 0x00000004, // Lexical 'this' used in body
  CaptureNewTarget = 0x00000008, // Lexical 'new.target' used in body
  SuperInstance = 0x00000100, // Instance 'super' reference
  SuperStatic = 0x00000200, // Static 'super' reference
  ContextChecked = 0x00000400, // Contextual types have been assigned
  AsyncMethodWithSuper = 0x00000800, // An async method that reads a value from a member of 'super'.
  AsyncMethodWithSuperBinding = 0x00001000, // An async method that assigns a value to a member of 'super'.
  CaptureArguments = 0x00002000, // Lexical 'arguments' used in body
  EnumValuesComputed = 0x00004000, // Values for enum members have been computed, and any errors have been reported for them.
  LexicalModuleMergesWithClass = 0x00008000, // Instantiated lexical module declaration is merged with a previous class declaration.
  LoopWithCapturedBlockScopedBinding = 0x00010000, // Loop that contains block scoped variable captured in closure
  ContainsCapturedBlockScopeBinding = 0x00020000, // Part of a loop that contains block scoped variable captured in closure
  CapturedBlockScopedBinding = 0x00040000, // Block-scoped binding that is captured in some function
  BlockScopedBindingInLoop = 0x00080000, // Block-scoped binding with declaration nested inside iteration statement
  ClassWithBodyScopedClassBinding = 0x00100000, // Decorated class that contains a binding to itself inside of the class body.
  BodyScopedClassBinding = 0x00200000, // Binding to a decorated class inside of the class's body.
  NeedsLoopOutParameter = 0x00400000, // Block scoped binding whose value should be explicitly copied outside of the converted loop
  AssignmentsMarked = 0x00800000, // Parameter assignments have been marked
  ClassWithConstructorReference = 0x01000000, // Class that contains a binding to its constructor inside of the class body.
  ConstructorReferenceInClass = 0x02000000, // Binding to a class constructor inside of the class's body.
  ContainsClassWithPrivateIdentifiers = 0x04000000, // Marked on all block-scoped containers containing a class with private identifiers.
}
export interface NodeLinks {
  flags: NodeCheckFlags; // Set of flags specific to Node
  resolvedType?: Type; // Cached type of type node
  resolvedEnumType?: Type; // Cached constraint type from enum jsdoc tag
  resolvedSignature?: Signature; // Cached signature of signature node or call expression
  resolvedSymbol?: Symbol; // Cached name resolution result
  resolvedIndexInfo?: IndexInfo; // Cached indexing info resolution result
  effectsSignature?: Signature; // Signature with possible control flow effects
  enumMemberValue?: string | number; // Constant value of enum member
  isVisible?: boolean; // Is this node visible
  containsArgumentsReference?: boolean; // Whether a function-like declaration contains an 'arguments' reference
  hasReportedStatementInAmbientContext?: boolean; // Cache boolean if we report statements in ambient context
  jsxFlags: JsxFlags; // flags for knowing what kind of element/attributes we're dealing with
  resolvedJsxElementAttributesType?: Type; // resolved element attributes type of a JSX openinglike element
  resolvedJsxElementAllAttributesType?: Type; // resolved all element attributes type of a JSX openinglike element
  resolvedJSDocType?: Type; // Resolved type of a JSDoc type reference
  switchTypes?: Type[]; // Cached array of switch case expression types
  jsxNamespace?: Symbol | false; // Resolved jsx namespace symbol for this node
  contextFreeType?: Type; // Cached context-free type used by the first pass of inference; used when a function's return is partially contextually sensitive
  deferredNodes?: qb.QMap<Node>; // Set of nodes whose checking has been deferred
  capturedBlockScopeBindings?: Symbol[]; // Block-scoped bindings captured beneath this part of an IterationStatement
  outerTypeParameters?: TypeParameter[]; // Outer type parameters of anonymous object type
  instantiations?: qb.QMap<Type>; // Instantiations of generic type alias (undefined if non-generic)
  isExhaustive?: boolean; // Is node an exhaustive switch statement
  skipDirectInference?: true; // Flag set by the API `getContextualType` call on a node when `Completions` is passed to force the checker to skip making inferences to a node's type
  declarationRequiresScopeChange?: boolean; // Set by `useOuterVariableScopeInParameter` in checker when downlevel emit would change the name resolution scope inside of a parameter.
}
export const enum JsxReferenceKind {
  Component,
  Function,
  Mixed,
}
export interface WideningContext {
  parent?: WideningContext;
  propertyName?: qb.__String;
  siblings?: Type[];
  resolvedProperties?: Symbol[];
}
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
export type xJsFileExtensionInfo = FileExtensionInfo;
export interface FileExtensionInfo {
  extension: string;
  isMixedContent: boolean;
  scriptKind?: ScriptKind;
}
export function diagnosticCategoryName(d: { category: DiagnosticCategory }, lowerCase = true): string {
  const name = DiagnosticCategory[d.category];
  return lowerCase ? name.toLowerCase() : name;
}
export enum ModuleResolutionKind {
  Classic = 1,
  NodeJs = 2,
}
export interface PluginImport {
  name: string;
}
export interface ProjectReference {
  path: string;
  originalPath?: string;
  prepend?: boolean;
  circular?: boolean;
}
export enum WatchFileKind {
  FixedPollingInterval,
  PriorityPollingInterval,
  DynamicPriorityPolling,
  UseFsEvents,
  UseFsEventsOnParentDirectory,
}
export enum WatchDirectoryKind {
  UseFsEvents,
  FixedPollingInterval,
  DynamicPriorityPolling,
}
export enum PollingWatchKind {
  FixedInterval,
  PriorityInterval,
  DynamicPriority,
}
export type CompilerOptionsValue = string | number | boolean | (string | number)[] | string[] | qb.MapLike<string[]> | PluginImport[] | ProjectReference[] | null | undefined;
export interface CompilerOptions {
  all?: boolean;
  allowJs?: boolean;
  allowNonTsExtensions?: boolean;
  allowSyntheticDefaultImports?: boolean;
  allowUmdGlobalAccess?: boolean;
  allowUnreachableCode?: boolean;
  allowUnusedLabels?: boolean;
  alwaysStrict?: boolean;
  baseUrl?: string;
  build?: boolean;
  charset?: string;
  checkJs?: boolean;
  configFilePath?: string;
  readonly configFile?: TsConfigSourceFile;
  declaration?: boolean;
  declarationMap?: boolean;
  emitDeclarationOnly?: boolean;
  declarationDir?: string;
  diagnostics?: boolean;
  extendedDiagnostics?: boolean;
  disableSizeLimit?: boolean;
  disableSourceOfProjectReferenceRedirect?: boolean;
  disableSolutionSearching?: boolean;
  downlevelIteration?: boolean;
  emitBOM?: boolean;
  emitDecoratorMetadata?: boolean;
  experimentalDecorators?: boolean;
  forceConsistentCasingInFileNames?: boolean;
  generateCpuProfile?: string;
  help?: boolean;
  importHelpers?: boolean;
  importsNotUsedAsValues?: ImportsNotUsedAsValues;
  init?: boolean;
  inlineSourceMap?: boolean;
  inlineSources?: boolean;
  isolatedModules?: boolean;
  jsx?: JsxEmit;
  keyofStringsOnly?: boolean;
  lib?: string[];
  listEmittedFiles?: boolean;
  listFiles?: boolean;
  listFilesOnly?: boolean;
  locale?: string;
  mapRoot?: string;
  maxNodeModuleJsDepth?: number;
  module?: ModuleKind;
  moduleResolution?: ModuleResolutionKind;
  newLine?: NewLineKind;
  noEmit?: boolean;
  noEmitForJsFiles?: boolean;
  noEmitHelpers?: boolean;
  noEmitOnError?: boolean;
  noErrorTruncation?: boolean;
  noFallthroughCasesInSwitch?: boolean;
  noImplicitAny?: boolean;
  noImplicitReturns?: boolean;
  noImplicitThis?: boolean;
  noStrictGenericChecks?: boolean;
  noUnusedLocals?: boolean;
  noUnusedParameters?: boolean;
  noImplicitUseStrict?: boolean;
  assumeChangesOnlyAffectDirectDependencies?: boolean;
  noLib?: boolean;
  noResolve?: boolean;
  out?: string;
  outDir?: string;
  outFile?: string;
  paths?: qb.MapLike<string[]>;
  plugins?: PluginImport[];
  preserveConstEnums?: boolean;
  preserveSymlinks?: boolean;
  preserveWatchOutput?: boolean;
  project?: string;
  pretty?: boolean;
  reactNamespace?: string;
  jsxFactory?: string;
  composite?: boolean;
  incremental?: boolean;
  tsBuildInfoFile?: string;
  removeComments?: boolean;
  rootDir?: string;
  rootDirs?: string[];
  skipLibCheck?: boolean;
  skipDefaultLibCheck?: boolean;
  sourceMap?: boolean;
  sourceRoot?: string;
  strict?: boolean;
  strictFunctionTypes?: boolean;
  strictBindCallApply?: boolean;
  strictNullChecks?: boolean;
  strictPropertyInitialization?: boolean;
  stripInternal?: boolean;
  suppressExcessPropertyErrors?: boolean;
  suppressImplicitAnyIndexErrors?: boolean;
  suppressOutputPathCheck?: boolean;
  target?: ScriptTarget;
  traceResolution?: boolean;
  resolveJsonModule?: boolean;
  types?: string[];
  typeRoots?: string[];
  version?: boolean;
  watch?: boolean;
  esModuleInterop?: boolean;
  showConfig?: boolean;
  useDefineForClassFields?: boolean;
  [option: string]: CompilerOptionsValue | TsConfigSourceFile | undefined;
}
export interface WatchOptions {
  watchFile?: WatchFileKind;
  watchDirectory?: WatchDirectoryKind;
  fallbackPolling?: PollingWatchKind;
  synchronousWatchDirectory?: boolean;
  [option: string]: CompilerOptionsValue | undefined;
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
export const enum JsxEmit {
  None = 0,
  Preserve = 1,
  React = 2,
  ReactNative = 3,
}
export const enum ImportsNotUsedAsValues {
  Remove,
  Preserve,
  Error,
}
export const enum NewLineKind {
  CarriageReturnLineFeed = 0,
  LineFeed = 1,
}
export interface ParsedCommandLine {
  options: CompilerOptions;
  typeAcquisition?: TypeAcquisition;
  fileNames: string[];
  projectReferences?: readonly ProjectReference[];
  watchOptions?: WatchOptions;
  raw?: any;
  errors: Diagnostic[];
  wildcardDirectories?: qb.MapLike<WatchDirectoryFlags>;
  compileOnSave?: boolean;
  configFileSpecs?: ConfigFileSpecs;
}
export const enum WatchDirectoryFlags {
  None = 0,
  Recursive = 1 << 0,
}
export interface ConfigFileSpecs {
  filesSpecs: readonly string[] | undefined;
  includeSpecs?: readonly string[];
  excludeSpecs?: readonly string[];
  validatedIncludeSpecs?: readonly string[];
  validatedExcludeSpecs?: readonly string[];
  wildcardDirectories: qb.MapLike<WatchDirectoryFlags>;
}
export interface ExpandResult {
  fileNames: string[];
  wildcardDirectories: qb.MapLike<WatchDirectoryFlags>;
  spec: ConfigFileSpecs;
}
export type RequireResult<T = {}> = { module: T; modulePath?: string; error: undefined } | { module: undefined; modulePath?: undefined; error: { stack?: string; message?: string } };
export interface CreateProgramOptions {
  rootNames: readonly string[];
  options: CompilerOptions;
  projectReferences?: readonly ProjectReference[];
  host?: CompilerHost;
  oldProgram?: Program;
  configFileParsingDiagnostics?: readonly Diagnostic[];
}
export interface CommandLineOptionBase {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'list' | qb.QMap<number | string>;
  isFilePath?: boolean;
  shortName?: string;
  description?: DiagnosticMessage;
  paramType?: DiagnosticMessage;
  isTSConfigOnly?: boolean;
  isCommandLineOnly?: boolean;
  showInSimplifiedHelpView?: boolean;
  category?: DiagnosticMessage;
  strictFlag?: true;
  affectsSourceFile?: true;
  affectsModuleResolution?: true;
  affectsBindDiagnostics?: true;
  affectsSemanticDiagnostics?: true;
  affectsEmit?: true;
  transpileOptionValue?: boolean | undefined;
}
export interface CommandLineOptionOfPrimitiveType extends CommandLineOptionBase {
  type: 'string' | 'number' | 'boolean';
}
export interface CommandLineOptionOfCustomType extends CommandLineOptionBase {
  type: qb.QMap<number | string>;
}
export interface DidYouMeanOptionsDiagnostics {
  optionDeclarations: CommandLineOption[];
  unknownOptionDiagnostic: DiagnosticMessage;
  unknownDidYouMeanDiagnostic: DiagnosticMessage;
}
export interface TsConfigOnlyOption extends CommandLineOptionBase {
  type: 'object';
  elementOptions?: qb.QMap<CommandLineOption>;
  extraKeyDiagnostics?: DidYouMeanOptionsDiagnostics;
}
export interface CommandLineOptionOfListType extends CommandLineOptionBase {
  type: 'list';
  element: CommandLineOptionOfCustomType | CommandLineOptionOfPrimitiveType | TsConfigOnlyOption;
}
export type CommandLineOption = CommandLineOptionOfCustomType | CommandLineOptionOfPrimitiveType | TsConfigOnlyOption | CommandLineOptionOfListType;
export interface ModuleResolutionHost {
  fileExists(fileName: string): boolean;
  readFile(fileName: string): string | undefined;
  trace?(s: string): void;
  directoryExists?(directoryName: string): boolean;
  realpath?(path: string): string;
  getCurrentDirectory?(): string;
  getDirectories?(path: string): string[];
}
export type HasInvalidatedResolution = (sourceFile: Path) => boolean;
export interface CompilerHost extends ModuleResolutionHost {
  getSourceFile(fileName: string, languageVersion: ScriptTarget, onError?: (message: string) => void, shouldCreateNewSourceFile?: boolean): SourceFile | undefined;
  getSourceFileByPath?(fileName: string, path: Path, languageVersion: ScriptTarget, onError?: (message: string) => void, shouldCreateNewSourceFile?: boolean): SourceFile | undefined;
  getCancellationToken?(): CancellationToken;
  getDefaultLibFileName(options: CompilerOptions): string;
  getDefaultLibLocation?(): string;
  writeFile: WriteFileCallback;
  getCurrentDirectory(): string;
  getCanonicalFileName(fileName: string): string;
  useCaseSensitiveFileNames(): boolean;
  getNewLine(): string;
  readDirectory?(rootDir: string, extensions: readonly string[], excludes: readonly string[] | undefined, includes: readonly string[], depth?: number): string[];
  resolveModuleNames?(
    moduleNames: string[],
    containingFile: string,
    reusedNames: string[] | undefined,
    redirectedReference: ResolvedProjectReference | undefined,
    options: CompilerOptions
  ): (ResolvedModule | undefined)[];
  resolveTypeReferenceDirectives?(
    typeReferenceDirectiveNames: string[],
    containingFile: string,
    redirectedReference: ResolvedProjectReference | undefined,
    options: CompilerOptions
  ): (ResolvedTypeReferenceDirective | undefined)[];
  getEnvironmentVariable?(name: string): string | undefined;
  onReleaseOldSourceFile?(oldSourceFile: SourceFile, oldOptions: CompilerOptions, hasSourceFileByPath: boolean): void;
  hasInvalidatedResolution?: HasInvalidatedResolution;
  hasChangedAutomaticTypeDirectiveNames?: boolean;
  createHash?(data: string): string;
  getParsedCommandLine?(fileName: string): ParsedCommandLine | undefined;
  useSourceOfProjectReferenceRedirect?(): boolean;
  createDirectory?(directory: string): void;
  getSymlinks?(): qb.QReadonlyMap<string>;
}
export type SourceOfProjectReferenceRedirect = string | true;
export interface ResolvedProjectReferenceCallbacks {
  getSourceOfProjectReferenceRedirect(fileName: string): SourceOfProjectReferenceRedirect | undefined;
  forEachResolvedProjectReference<T>(cb: (resolvedProjectReference: ResolvedProjectReference | undefined, resolvedProjectReferencePath: Path) => T | undefined): T | undefined;
}
export type UniqueNameHandler = (baseName: string, checkFn?: (name: string) => boolean, optimistic?: boolean) => string;
export interface SourceFileMayBeEmittedHost {
  getCompilerOptions(): CompilerOptions;
  isSourceFileFromExternalLibrary(file: SourceFile): boolean;
  getResolvedProjectReferenceToRedirect(fileName: string): ResolvedProjectReference | undefined;
  isSourceOfProjectReferenceRedirect(fileName: string): boolean;
}
export interface EmitHost extends ScriptReferenceHost, ModuleSpecifierResolutionHost, SourceFileMayBeEmittedHost {
  getSourceFiles(): readonly SourceFile[];
  useCaseSensitiveFileNames(): boolean;
  getCurrentDirectory(): string;
  getLibFileFromReference(ref: FileReference): SourceFile | undefined;
  getCommonSourceDirectory(): string;
  getCanonicalFileName(fileName: string): string;
  getNewLine(): string;
  isEmitBlocked(emitFileName: string): boolean;
  getPrependNodes(): readonly (InputFiles | UnparsedSource)[];
  writeFile: WriteFileCallback;
  getProgramBuildInfo(): ProgramBuildInfo | undefined;
  getSourceFileFromReference: Program['getSourceFileFromReference'];
  readonly redirectTargetsMap: RedirectTargetsMap;
}
export interface PropertyDescriptorAttributes {
  enumerable?: boolean | Expression;
  configurable?: boolean | Expression;
  writable?: boolean | Expression;
  value?: Expression;
  get?: Expression;
  set?: Expression;
}
export const enum LexicalEnvironmentFlags {
  None = 0,
  InParameters = 1 << 0,
  VariablesHoistedInParameters = 1 << 1,
}
export interface Printer {
  printNode(hint: EmitHint, node: Node, sourceFile: SourceFile): string;
  printList<T extends Node>(format: ListFormat, list: Nodes<T>, sourceFile: SourceFile): string;
  printFile(sourceFile: SourceFile): string;
  printBundle(bundle: Bundle): string;
  writeNode(hint: EmitHint, node: Node, sourceFile: SourceFile | undefined, writer: EmitTextWriter): void;
  writeList<T extends Node>(format: ListFormat, list: Nodes<T> | undefined, sourceFile: SourceFile | undefined, writer: EmitTextWriter): void;
  writeFile(sourceFile: SourceFile, writer: EmitTextWriter, sourceMapGenerator: SourceMapGenerator | undefined): void;
  writeBundle(bundle: Bundle, writer: EmitTextWriter, sourceMapGenerator: SourceMapGenerator | undefined): void;
  bundleFileInfo?: BundleFileInfo;
}
export interface PrintHandlers {
  hasGlobalName?(name: string): boolean;
  onEmitNode?(hint: EmitHint, node: Node | undefined, emitCallback: (hint: EmitHint, node: Node | undefined) => void): void;
  isEmitNotificationEnabled?(node: Node | undefined): boolean;
  substituteNode?(hint: EmitHint, node: Node): Node;
  onEmitSourceMapOfNode?: (hint: EmitHint, node: Node, emitCallback: (hint: EmitHint, node: Node) => void) => void;
  onEmitSourceMapOfToken?: (
    node: Node | undefined,
    token: Syntax,
    writer: (s: string) => void,
    pos: number,
    emitCallback: (token: Syntax, writer: (s: string) => void, pos: number) => number
  ) => number;
  onEmitSourceMapOfPosition?: (pos: number) => void;
  onSetSourceFile?: (node: SourceFile) => void;
  onBeforeEmitNodes?: (nodes: Nodes<any> | undefined) => void;
  onAfterEmitNodes?: (nodes: Nodes<any> | undefined) => void;
  onBeforeEmitToken?: (node: Node) => void;
  onAfterEmitToken?: (node: Node) => void;
}
export interface PrinterOptions {
  removeComments?: boolean;
  newLine?: NewLineKind;
  omitTrailingSemicolon?: boolean;
  noEmitHelpers?: boolean;
  module?: CompilerOptions['module'];
  target?: CompilerOptions['target'];
  sourceMap?: boolean;
  inlineSourceMap?: boolean;
  inlineSources?: boolean;
  extendedDiagnostics?: boolean;
  onlyPrintJsDocStyle?: boolean;
  neverAsciiEscape?: boolean;
  writeBundleFileInfo?: boolean;
  recordInternalSection?: boolean;
  stripInternal?: boolean;
  preserveSourceNewlines?: boolean;
  relativeToBuildInfo?: (path: string) => string;
}
export interface SourceMapGenerator {
  getSources(): readonly string[];
  addSource(fileName: string): number;
  setSourceContent(sourceIndex: number, content: string | null): void;
  addName(name: string): number;
  addMapping(generatedLine: number, generatedCharacter: number): void;
  addMapping(generatedLine: number, generatedCharacter: number, sourceIndex: number, sourceLine: number, sourceCharacter: number, nameIndex?: number): void;
  appendSourceMap(generatedLine: number, generatedCharacter: number, sourceMap: RawSourceMap, sourceMapPath: string, start?: qy.LineAndChar, end?: qy.LineAndChar): void;
  toJSON(): RawSourceMap;
  toString(): string;
}
export interface DocumentPositionMapperHost {
  getSourceFileLike(fileName: string): SourceFileLike | undefined;
  getCanonicalFileName(path: string): string;
  log(text: string): void;
}
export interface DocumentPositionMapper {
  getSourcePosition(input: DocumentPosition): DocumentPosition;
  getGeneratedPosition(input: DocumentPosition): DocumentPosition;
}
export interface DocumentPosition {
  fileName: string;
  pos: number;
}
export interface EmitTextWriter extends SymbolWriter {
  write(s: string): void;
  writeTrailingSemicolon(text: string): void;
  writeComment(text: string): void;
  getText(): string;
  rawWrite(s: string): void;
  writeLiteral(s: string): void;
  getTextPos(): number;
  getLine(): number;
  getColumn(): number;
  getIndent(): number;
  isAtStartOfLine(): boolean;
  hasTrailingComment(): boolean;
  hasTrailingWhitespace(): boolean;
  getTextPosWithWriteLine?(): number;
}
export interface GetEffectiveTypeRootsHost {
  directoryExists?(directoryName: string): boolean;
  getCurrentDirectory?(): string;
}
export interface ModuleSpecifierResolutionHost {
  useCaseSensitiveFileNames?(): boolean;
  fileExists(path: string): boolean;
  getCurrentDirectory(): string;
  readFile?(path: string): string | undefined;
  getProbableSymlinks?(files: readonly SourceFile[]): qb.QReadonlyMap<string>;
  getGlobalTypingsCacheLocation?(): string | undefined;
  getSourceFiles(): readonly SourceFile[];
  readonly redirectTargetsMap: RedirectTargetsMap;
  getProjectReferenceRedirect(fileName: string): string | undefined;
  isSourceOfProjectReferenceRedirect(fileName: string): boolean;
}
export interface SymbolTracker {
  trackSymbol?(symbol: Symbol, enclosingDeclaration: Node | undefined, meaning: SymbolFlags): void;
  reportInaccessibleThisError?(): void;
  reportPrivateInBaseOfClassExpression?(propertyName: string): void;
  reportInaccessibleUniqueSymbolError?(): void;
  reportLikelyUnsafeImportRequiredError?(specifier: string): void;
  moduleResolverHost?: ModuleSpecifierResolutionHost & { getCommonSourceDirectory(): string };
  trackReferencedAmbientModule?(decl: ModuleDeclaration, symbol: Symbol): void;
  trackExternalModuleSymbolOfImportTypeNode?(symbol: Symbol): void;
  reportNonlocalAugmentation?(containingFile: SourceFile, parentSymbol: Symbol, augmentingSymbol: Symbol): void;
}
export interface TextSpan {
  start: number;
  length: number;
}
export interface TextChangeRange {
  span: TextSpan;
  newLength: number;
}
export interface DiagnosticCollection {
  add(diagnostic: Diagnostic): void;
  lookup(diagnostic: Diagnostic): Diagnostic | undefined;
  getGlobalDiagnostics(): Diagnostic[];
  getDiagnostics(): Diagnostic[];
  getDiagnostics(fileName: string): DiagnosticWithLocation[];
  reattachFileDiagnostics(newFile: SourceFile): void;
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
  JSDocComment = MultiLine | AsteriskDelimited,
}
export const enum PragmaKindFlags {
  None = 0,
  TripleSlashXML = 1 << 0,
  SingleLine = 1 << 1,
  MultiLine = 1 << 2,
  All = TripleSlashXML | SingleLine | MultiLine,
  Default = All,
}
interface PragmaArgumentSpecification<TName extends string> {
  name: TName;
  optional?: boolean;
  captureSpan?: boolean;
}
export interface PragmaDefinition<T1 extends string = string, T2 extends string = string, T3 extends string = string, T4 extends string = string> {
  args?:
    | readonly [PragmaArgumentSpecification<T1>]
    | readonly [PragmaArgumentSpecification<T1>, PragmaArgumentSpecification<T2>]
    | readonly [PragmaArgumentSpecification<T1>, PragmaArgumentSpecification<T2>, PragmaArgumentSpecification<T3>]
    | readonly [PragmaArgumentSpecification<T1>, PragmaArgumentSpecification<T2>, PragmaArgumentSpecification<T3>, PragmaArgumentSpecification<T4>];
  kind?: PragmaKindFlags;
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
  'amd-dependency': {
    args: [{ name: 'path' }, { name: 'name', optional: true }],
    kind: PragmaKindFlags.TripleSlashXML,
  },
  'amd-module': {
    args: [{ name: 'name' }],
    kind: PragmaKindFlags.TripleSlashXML,
  },
  'ts-check': {
    kind: PragmaKindFlags.SingleLine,
  },
  'ts-nocheck': {
    kind: PragmaKindFlags.SingleLine,
  },
  jsx: {
    args: [{ name: 'factory' }],
    kind: PragmaKindFlags.MultiLine,
  },
} as const;
type PragmaArgTypeMaybeCapture<TDesc> = TDesc extends { captureSpan: true } ? { value: string; pos: number; end: number } : string;
type PragmaArgTypeOptional<TDesc, TName extends string> = TDesc extends { optional: true } ? { [K in TName]?: PragmaArgTypeMaybeCapture<TDesc> } : { [K in TName]: PragmaArgTypeMaybeCapture<TDesc> };
type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (k: infer I) => void ? I : never;
type ArgumentDefinitionToFieldUnion<T extends readonly PragmaArgumentSpecification<any>[]> = {
  [K in keyof T]: PragmaArgTypeOptional<T[K], T[K] extends { name: infer TName } ? (TName extends string ? TName : never) : never>;
}[Extract<keyof T, number>];
type PragmaArgumentType<KPrag extends keyof ConcretePragmaSpecs> = ConcretePragmaSpecs[KPrag] extends {
  args: readonly PragmaArgumentSpecification<any>[];
}
  ? UnionToIntersection<ArgumentDefinitionToFieldUnion<ConcretePragmaSpecs[KPrag]['args']>>
  : never;
type ConcretePragmaSpecs = typeof commentPragmas;
export type PragmaPseudoMap = { [K in keyof ConcretePragmaSpecs]: { arguments: PragmaArgumentType<K>; range: CommentRange } };
export type PragmaPseudoMapEntry = { [K in keyof PragmaPseudoMap]: { name: K; args: PragmaPseudoMap[K] } }[keyof PragmaPseudoMap];
export interface ReadonlyPragmaMap extends qb.QReadonlyMap<PragmaPseudoMap[keyof PragmaPseudoMap] | PragmaPseudoMap[keyof PragmaPseudoMap][]> {
  get<K extends keyof PragmaPseudoMap>(k: K): PragmaPseudoMap[K] | PragmaPseudoMap[K][];
}
export interface PragmaMap extends qb.QMap<PragmaPseudoMap[keyof PragmaPseudoMap] | PragmaPseudoMap[keyof PragmaPseudoMap][]>, ReadonlyPragmaMap {
  set<K extends keyof PragmaPseudoMap>(k: K, v: PragmaPseudoMap[K] | PragmaPseudoMap[K][]): this;
  get<K extends keyof PragmaPseudoMap>(k: K): PragmaPseudoMap[K] | PragmaPseudoMap[K][];
  // qpx-fixme forEach(action: <K extends keyof PragmaPseudoMap>(v: PragmaPseudoMap[K] | PragmaPseudoMap[K][], k: K) => void): void;
}
export interface CommentDirectivesMap {
  getUnusedExpectations(): CommentDirective[];
  markUsed(matchedLine: number): boolean;
}
export interface UserPreferences {
  readonly disableSuggestions?: boolean;
  readonly quotePreference?: 'auto' | 'double' | 'single';
  readonly includeCompletionsForModuleExports?: boolean;
  readonly includeAutomaticOptionalChainCompletions?: boolean;
  readonly includeCompletionsWithInsertText?: boolean;
  readonly importModuleSpecifierPreference?: 'auto' | 'relative' | 'non-relative';
  readonly importModuleSpecifierEnding?: 'auto' | 'minimal' | 'index' | 'js';
  readonly allowTextChangesInNewFiles?: boolean;
  readonly providePrefixAndSuffixTextForRename?: boolean;
}
export type ErrorCallback = (m: DiagnosticMessage, length: number) => void;
*/
