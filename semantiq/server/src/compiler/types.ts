import { SourceFileLike, Syntax } from './syntax';
import * as qd from './diags';
import * as qt from './const';
import * as qu from './utils';
import * as qy from './syntax';
export * from './const';
export interface AllAccessorDeclarations {
  firstAccessor: AccessorDeclaration;
  secondAccessor?: AccessorDeclaration;
  getAccessor?: GetAccessorDeclaration;
  setAccessor?: SetAccessorDeclaration;
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
export interface ArrayBindingPattern extends Nobj {
  kind: Syntax.ArrayBindingPattern;
  parent?: VariableDeclaration | ParamDeclaration | BindingElem;
  elems: Nodes<ArrayBindingElem>;
}
export interface ArrayDestructuringAssignment extends AssignmentExpression<EqualsToken> {
  left: ArrayLiteralExpression;
}
export interface ArrayLiteralExpression extends PrimaryExpr {
  kind: Syntax.ArrayLiteralExpression;
  elems: Nodes<Expression>;
  multiLine?: boolean;
}
export interface ArrayTyping extends Tobj {
  kind: Syntax.ArrayTyping;
  elemType: Typing;
}
export interface ArrowFunction extends FunctionLikeDecl, Expr, DocContainer {
  kind: Syntax.ArrowFunction;
  equalsGreaterThanToken: EqualsGreaterThanToken;
  body: ConciseBody;
  name: never;
}
export interface AsExpression extends Expr {
  kind: Syntax.AsExpression;
  expression: Expression;
  type: Typing;
}
export interface AssertsIdentifierTypePredicate extends TypePredicateBase {
  kind: qt.TypePredicateKind.AssertsIdentifier;
  paramName: string;
  paramIndex: number;
  type?: Type;
}
export interface AssertsThisTypePredicate extends TypePredicateBase {
  kind: qt.TypePredicateKind.AssertsThis;
  paramName: undefined;
  paramIndex: undefined;
  type?: Type;
}
export interface AssignmentExpression<TOperator extends AssignmentOperatorToken> extends BinaryExpression {
  left: LeftExpression;
  operatorToken: TOperator;
}
export interface AwaitExpression extends UnaryExpr {
  kind: Syntax.AwaitExpression;
  expression: UnaryExpression;
}
export interface BigIntLiteral extends LiteralExpr {
  kind: Syntax.BigIntLiteral;
}
export interface BigIntLiteralType extends LiteralType {
  value: PseudoBigInt;
}
export interface BinaryExpression extends Expr, Decl {
  kind: Syntax.BinaryExpression;
  left: Expression;
  operatorToken: BinaryOperatorToken;
  right: Expression;
}
export interface BindablePropertyAssignmentExpression extends BinaryExpression {
  left: BindableAccessExpression;
}
export interface BindableStaticPropertyAssignmentExpression extends BinaryExpression {
  left: BindableStaticAccessExpression;
}
export interface BindingElem extends NamedDecl {
  kind: Syntax.BindingElem;
  parent?: BindingPattern;
  propertyName?: PropertyName;
  dot3Token?: Dot3Token;
  name: BindingName;
  initer?: Expression;
}
export interface Block extends Stmt {
  kind: Syntax.Block;
  statements: Nodes<Statement>;
  multiLine?: boolean;
}
export interface BooleanLiteral extends PrimaryExpr, Tobj {
  kind: Syntax.TrueKeyword | Syntax.FalseKeyword;
}
export interface BreakStatement extends Stmt {
  kind: Syntax.BreakStatement;
  label?: Identifier;
}
export interface BuildInfo {
  bundle?: BundleBuildInfo;
  program?: ProgramBuildInfo;
  version: string;
}
export interface Bundle extends Nobj {
  kind: Syntax.Bundle;
  prepends: readonly (InputFiles | UnparsedSource)[];
  sourceFiles: readonly SourceFile[];
  syntheticFileReferences?: readonly FileReference[];
  syntheticTypeReferences?: readonly FileReference[];
  syntheticLibReferences?: readonly FileReference[];
  hasNoDefaultLib?: boolean;
}
export interface BundleBuildInfo {
  js?: BundleFileInfo;
  dts?: BundleFileInfo;
  commonSourceDirectory: string;
  sourceFiles: readonly string[];
}
export interface BundleFileEmitHelpers extends BundleFileSectionBase {
  kind: qt.BundleFileSectionKind.EmitHelpers;
  data: string;
}
export interface BundleFileHasNoDefaultLib extends BundleFileSectionBase {
  kind: qt.BundleFileSectionKind.NoDefaultLib;
}
export interface BundleFileInfo {
  sections: BundleFileSection[];
  sources?: SourceFileInfo;
}
export interface BundleFilePrepend extends BundleFileSectionBase {
  kind: qt.BundleFileSectionKind.Prepend;
  data: string;
  texts: BundleFileTextLike[];
}
export interface BundleFilePrologue extends BundleFileSectionBase {
  kind: qt.BundleFileSectionKind.Prologue;
  data: string;
}
export interface BundleFileReference extends BundleFileSectionBase {
  kind: qt.BundleFileSectionKind.Reference | qt.BundleFileSectionKind.Type | qt.BundleFileSectionKind.Lib;
  data: string;
}
export interface BundleFileSectionBase extends qu.Range {
  kind: qt.BundleFileSectionKind;
  data?: string;
}
export interface BundleFileTextLike extends BundleFileSectionBase {
  kind: BundleFileTextLikeKind;
}
export interface CallChain extends CallExpression {
  _optionalChainBrand: any;
}
export interface CallChainRoot extends CallChain {
  questionDotToken: QuestionDotToken;
}
export interface CallExpression extends LeftExpr, Decl {
  kind: Syntax.CallExpression;
  expression: LeftExpression;
  questionDotToken?: QuestionDotToken;
  typeArgs?: Nodes<Typing>;
  args: Nodes<Expression>;
}
export interface CallSignatureDeclaration extends SignatureDecl, TypeElem {
  kind: Syntax.CallSignature;
}
export interface CancelToken {
  isCancelRequested(): boolean;
  throwIfCancelRequested(): void;
}
export interface CaseBlock extends Nobj {
  kind: Syntax.CaseBlock;
  parent?: SwitchStatement;
  clauses: Nodes<CaseOrDefaultClause>;
}
export interface CaseClause extends Nobj {
  kind: Syntax.CaseClause;
  parent?: CaseBlock;
  expression: Expression;
  statements: Nodes<Statement>;
  fallthroughFlowNode?: FlowNode;
}
export interface CatchClause extends Nobj {
  kind: Syntax.CatchClause;
  parent?: TryStatement;
  variableDeclaration?: VariableDeclaration;
  block: Block;
}
export interface CheckJsDirective extends qu.Range {
  enabled: boolean;
}
export interface ClassDeclaration extends ClassLikeDecl, DeclarationStmt {
  kind: Syntax.ClassDeclaration;
  name?: Identifier;
}
export interface ClassElem extends NamedDecl {
  _classElemBrand: any;
  name?: PropertyName;
}
export interface ClassExpression extends ClassLikeDecl, PrimaryExpr {
  kind: Syntax.ClassExpression;
}
export interface ClassImplementingOrExtendingExpressionWithTypings {
  readonly class: ClassLikeDeclaration;
  readonly isImplements: boolean;
}
export interface ClassLikeDecl extends NamedDecl, DocContainer {
  kind: Syntax.ClassDeclaration | Syntax.ClassExpression;
  name?: Identifier;
  typeParams?: Nodes<TypeParamDeclaration>;
  heritageClauses?: Nodes<HeritageClause>;
  members: Nodes<ClassElem>;
}
export interface CommaListExpression extends Expr {
  kind: Syntax.CommaListExpression;
  elems: Nodes<Expression>;
}
export interface CommandLineOptionBase {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'list' | qu.QMap<number | string>;
  isFilePath?: boolean;
  shortName?: string;
  description?: qd.Message;
  paramType?: qd.Message;
  isTSConfigOnly?: boolean;
  isCommandLineOnly?: boolean;
  showInSimplifiedHelpView?: boolean;
  category?: qd.Message;
  strictFlag?: true;
  affectsSourceFile?: true;
  affectsModuleResolution?: true;
  affectsBindDiagnostics?: true;
  affectsSemanticDiagnostics?: true;
  affectsEmit?: true;
  transpileOptionValue?: boolean;
}
export interface CommandLineOptionOfCustomType extends CommandLineOptionBase {
  type: qu.QMap<number | string>;
}
export interface CommandLineOptionOfListType extends CommandLineOptionBase {
  type: 'list';
  elem: CommandLineOptionOfCustomType | CommandLineOptionOfPrimitiveType | TsConfigOnlyOption;
}
export interface CommandLineOptionOfPrimitiveType extends CommandLineOptionBase {
  type: 'string' | 'number' | 'boolean';
}
export interface CommentDirective {
  range: qu.Range;
  type: qt.CommentDirectiveType;
}
export interface CommentDirectivesMap {
  getUnusedExpectations(): CommentDirective[];
  markUsed(matchedLine: number): boolean;
}
export interface CommentRange extends qu.Range {
  hasTrailingNewLine?: boolean;
  kind: qy.CommentKind;
}
export interface CompilerHost extends ModuleResolutionHost {
  getSourceFile(fileName: string, languageVersion: qt.ScriptTarget, onError?: (message: string) => void, shouldCreateNewSourceFile?: boolean): SourceFile | undefined;
  getSourceFileByPath?(fileName: string, path: Path, languageVersion: qt.ScriptTarget, onError?: (message: string) => void, shouldCreateNewSourceFile?: boolean): SourceFile | undefined;
  getCancelToken?(): CancelToken;
  getDefaultLibFileName(opts: CompilerOpts): string;
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
    opts: CompilerOpts
  ): (ResolvedModule | undefined)[];
  resolveTypeReferenceDirectives?(
    typeReferenceDirectiveNames: string[],
    containingFile: string,
    redirectedReference: ResolvedProjectReference | undefined,
    opts: CompilerOpts
  ): (ResolvedTypeReferenceDirective | undefined)[];
  getEnvironmentVariable?(name: string): string | undefined;
  onReleaseOldSourceFile?(oldSourceFile: SourceFile, oldOpts: CompilerOpts, hasSourceFileByPath: boolean): void;
  hasInvalidatedResolution?: HasInvalidatedResolution;
  hasChangedAutomaticTypeDirectiveNames?: boolean;
  createHash?(data: string): string;
  getParsedCommandLine?(fileName: string): ParsedCommandLine | undefined;
  useSourceOfProjectReferenceRedirect?(): boolean;
  createDirectory?(directory: string): void;
  getSymlinks?(): qu.QReadonlyMap<string>;
}
export interface CompilerOpts {
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
  importsNotUsedAsValues?: qt.ImportsNotUsedAsValues;
  init?: boolean;
  inlineSourceMap?: boolean;
  inlineSources?: boolean;
  isolatedModules?: boolean;
  jsx?: qt.JsxEmit;
  keyofStringsOnly?: boolean;
  lib?: string[];
  listEmittedFiles?: boolean;
  listFiles?: boolean;
  listFilesOnly?: boolean;
  locale?: string;
  mapRoot?: string;
  maxNodeModuleJsDepth?: number;
  module?: qt.ModuleKind;
  moduleResolution?: qt.ModuleResolutionKind;
  newLine?: qt.NewLineKind;
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
  noUnusedParams?: boolean;
  noImplicitUseStrict?: boolean;
  assumeChangesOnlyAffectDirectDependencies?: boolean;
  noLib?: boolean;
  noResolve?: boolean;
  out?: string;
  outDir?: string;
  outFile?: string;
  paths?: qu.MapLike<string[]>;
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
  target?: qt.ScriptTarget;
  traceResolution?: boolean;
  resolveJsonModule?: boolean;
  types?: string[];
  typeRoots?: string[];
  version?: boolean;
  watch?: boolean;
  esModuleInterop?: boolean;
  showConfig?: boolean;
  useDefineForClassFields?: boolean;
  [option: string]: CompilerOptsValue | TsConfigSourceFile | undefined;
}
export interface ComputedPropertyName extends Nobj {
  kind: Syntax.ComputedPropertyName;
  expression: Expression;
}
export interface ConditionalExpression extends Expr {
  kind: Syntax.ConditionalExpression;
  condition: Expression;
  questionToken: QuestionToken;
  whenTrue: Expression;
  colonToken: ColonToken;
  whenFalse: Expression;
}
export interface ConditionalRoot {
  node: ConditionalTyping;
  checkType: Type;
  extendsType: Type;
  trueType: Type;
  falseType: Type;
  isDistributive: boolean;
  inferTypeParams?: TypeParam[];
  outerTypeParams?: TypeParam[];
  instantiations?: qu.QMap<Type>;
  aliasSymbol?: Symbol;
  aliasTypeArgs?: Type[];
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
export interface ConditionalTyping extends Tobj {
  kind: Syntax.ConditionalTyping;
  checkType: Typing;
  extendsType: Typing;
  trueType: Typing;
  falseType: Typing;
}
export interface ConfigFileSpecs {
  filesSpecs?: readonly string[];
  includeSpecs?: readonly string[];
  excludeSpecs?: readonly string[];
  validatedIncludeSpecs?: readonly string[];
  validatedExcludeSpecs?: readonly string[];
  wildcardDirectories: qu.MapLike<qt.WatchDirectoryFlags>;
}
export interface ConstructorDeclaration extends FunctionLikeDecl, ClassElem, DocContainer {
  kind: Syntax.Constructor;
  parent?: ClassLikeDeclaration;
  body?: FunctionBody;
}
export interface ConstructorTyping extends FunctionOrConstructorTobj {
  kind: Syntax.ConstructorTyping;
}
export interface ConstructSignatureDeclaration extends SignatureDecl, TypeElem {
  kind: Syntax.ConstructSignature;
}
export interface ContinueStatement extends Stmt {
  kind: Syntax.ContinueStatement;
  label?: Identifier;
}
export interface CreateProgramOpts {
  rootNames: readonly string[];
  opts: CompilerOpts;
  projectReferences?: readonly ProjectReference[];
  host?: CompilerHost;
  oldProgram?: Program;
  configFileParsingDiagnostics?: readonly qd.Diagnostic[];
}
export interface CustomTransformer {
  transformSourceFile(node: SourceFile): SourceFile;
  transformBundle(node: Bundle): Bundle;
}
export interface CustomTransformers {
  before?: (TransformerFactory<SourceFile> | CustomTransformerFactory)[];
  after?: (TransformerFactory<SourceFile> | CustomTransformerFactory)[];
  afterDeclarations?: (TransformerFactory<Bundle | SourceFile> | CustomTransformerFactory)[];
}
export interface DebuggerStatement extends Stmt {
  kind: Syntax.DebuggerStatement;
}
export interface DeclarationStmt extends NamedDecl, Stmt {
  name?: Identifier | StringLiteral | NumericLiteral;
}
export interface Decorator extends Nobj {
  kind: Syntax.Decorator;
  expression: LeftExpression;
}
export interface DefaultClause extends Nobj {
  kind: Syntax.DefaultClause;
  parent?: CaseBlock;
  statements: Nodes<Statement>;
  fallthroughFlowNode?: FlowNode;
}
export interface DeferredTypeReference extends TypeReference {
  node: TypingReference | ArrayTyping | TupleTyping;
  mapper?: TypeMapper;
}
export interface DeleteExpression extends UnaryExpr {
  kind: Syntax.DeleteExpression;
  expression: UnaryExpression;
}
export interface DidYouMeanOptsDiagnostics {
  optionDeclarations: CommandLineOption[];
  unknownOptionDiagnostic: qd.Message;
  unknownDidYouMeanDiagnostic: qd.Message;
}
export interface Decl extends Nobj {
  _declarationBrand: any;
}
export interface Doc extends Nobj {
  kind: Syntax.DocComment;
  parent?: HasDoc;
  tags?: Nodes<DocTag>;
  comment?: string;
}
export interface DocAllTyping extends DocTobj {
  kind: Syntax.DocAllTyping;
}
export interface DocAugmentsTag extends DocTag {
  kind: Syntax.DocAugmentsTag;
  class: ExpressionWithTypings & { expression: Identifier | PropertyAccessEntityNameExpression };
}
export interface DocAuthorTag extends DocTag {
  kind: Syntax.DocAuthorTag;
}
export interface DocCallbackTag extends DocTag, NamedDecl {
  kind: Syntax.DocCallbackTag;
  parent?: Doc;
  fullName?: DocNamespaceDeclaration | Identifier;
  name?: Identifier;
  typeExpression: DocSignature;
}
export interface DocClassTag extends DocTag {
  kind: Syntax.DocClassTag;
}
export interface DocContainer {
  doc?: Doc[];
  cache?: readonly DocTag[];
}
export interface DocEnumTag extends DocTag, Decl {
  kind: Syntax.DocEnumTag;
  parent?: Doc;
  typeExpression?: DocTypingExpression;
}
export interface DocFunctionTyping extends DocTobj, SignatureDecl {
  kind: Syntax.DocFunctionTyping;
}
export interface DocImplementsTag extends DocTag {
  kind: Syntax.DocImplementsTag;
  class: ExpressionWithTypings & { expression: Identifier | PropertyAccessEntityNameExpression };
}
export interface DocNamepathTyping extends DocTobj {
  kind: Syntax.DocNamepathTyping;
  type: Typing;
}
export interface DocNamespaceDeclaration extends ModuleDeclaration {
  name: Identifier;
  body?: DocNamespaceBody;
}
export interface DocNonNullableTyping extends DocTobj {
  kind: Syntax.DocNonNullableTyping;
  type: Typing;
}
export interface DocNullableTyping extends DocTobj {
  kind: Syntax.DocNullableTyping;
  type: Typing;
}
export interface DocOptionalTyping extends DocTobj {
  kind: Syntax.DocOptionalTyping;
  type: Typing;
}
export interface DocParamTag extends DocPropertyLikeTag {
  kind: Syntax.DocParamTag;
}
export interface DocPrivateTag extends DocTag {
  kind: Syntax.DocPrivateTag;
}
export interface DocPropertyLikeTag extends DocTag, Decl {
  parent?: Doc;
  name: EntityName;
  typeExpression?: DocTypingExpression;
  isNameFirst: boolean;
  isBracketed: boolean;
}
export interface DocPropertyTag extends DocPropertyLikeTag {
  kind: Syntax.DocPropertyTag;
}
export interface DocProtectedTag extends DocTag {
  kind: Syntax.DocProtectedTag;
}
export interface DocPublicTag extends DocTag {
  kind: Syntax.DocPublicTag;
}
export interface DocReadonlyTag extends DocTag {
  kind: Syntax.DocReadonlyTag;
}
export interface DocReturnTag extends DocTag {
  kind: Syntax.DocReturnTag;
  typeExpression?: DocTypingExpression;
}
export interface DocSignature extends DocTobj, Decl {
  kind: Syntax.DocSignature;
  typeParams?: readonly DocTemplateTag[];
  params: readonly DocParamTag[];
  type?: DocReturnTag;
}
export interface DocTag extends Nobj {
  parent?: Doc | DocTypingLiteral;
  tagName: Identifier;
  comment?: string;
}
export interface DocTagInfo {}
export interface DocTemplateTag extends DocTag {
  kind: Syntax.DocTemplateTag;
  constraint?: DocTypingExpression;
  typeParams: Nodes<TypeParamDeclaration>;
}
export interface DocThisTag extends DocTag {
  kind: Syntax.DocThisTag;
  typeExpression?: DocTypingExpression;
}
export interface DocTypedefTag extends DocTag, NamedDecl {
  parent?: Doc;
  kind: Syntax.DocTypedefTag;
  fullName?: DocNamespaceDeclaration | Identifier;
  name?: Identifier;
  typeExpression?: DocTypingExpression | DocTypingLiteral;
}
export interface DocTypingExpression extends Tobj {
  kind: Syntax.DocTypingExpression;
  type: Typing;
}
export interface DocTypingLiteral extends DocTobj {
  kind: Syntax.DocTypingLiteral;
  docPropertyTags?: readonly DocPropertyLikeTag[];
  isArrayType?: boolean;
}
export interface DocTypeTag extends DocTag {
  kind: Syntax.DocTypeTag;
  typeExpression: DocTypingExpression;
}
export interface DocTobj extends Tobj {
  _docTypeBrand: any;
}
export interface DocumentPosition {
  fileName: string;
  pos: number;
}
export interface DocumentPositionMapper {
  getSourcePosition(input: DocumentPosition): DocumentPosition;
  getGeneratedPosition(input: DocumentPosition): DocumentPosition;
}
export interface DocumentPositionMapperHost {
  getSourceFileLike(fileName: string): SourceFileLike | undefined;
  getCanonicalFileName(path: string): string;
  log(text: string): void;
}
export interface DocUnknownTag extends DocTag {
  kind: Syntax.DocUnknownTag;
}
export interface DocUnknownTyping extends DocTobj {
  kind: Syntax.DocUnknownTyping;
}
export interface DocVariadicTyping extends DocTobj {
  kind: Syntax.DocVariadicTyping;
  type: Typing;
}
export interface DoStatement extends IterationStmt {
  kind: Syntax.DoStatement;
  expression: Expression;
}
export interface DynamicNamedBinaryExpression extends BinaryExpression {
  left: ElemAccessExpression;
}
export interface DynamicNamedDecl extends NamedDecl {
  name: ComputedPropertyName;
}
export interface ElemAccessChain extends ElemAccessExpression {
  _optionalChainBrand: any;
}
export interface ElemAccessChainRoot extends ElemAccessChain {
  questionDotToken: QuestionDotToken;
}
export interface ElemAccessExpression extends MemberExpr {
  kind: Syntax.ElemAccessExpression;
  expression: LeftExpression;
  questionDotToken?: QuestionDotToken;
  argExpression: Expression;
}
export interface EmitHelper {
  readonly name: string;
  readonly scoped: boolean;
  readonly text: string | ((node: EmitHelperUniqueNameCallback) => string);
  readonly priority?: number;
  readonly dependencies?: EmitHelper[];
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
export interface EmitNode {
  annotatedNodes?: Node[];
  flags: qt.EmitFlags;
  leadingComments?: SynthesizedComment[];
  trailingComments?: SynthesizedComment[];
  commentRange?: qu.Range;
  sourceMapRange?: SourceMapRange;
  tokenSourceMapRanges?: (SourceMapRange | undefined)[];
  constantValue?: string | number;
  externalHelpersModuleName?: Identifier;
  externalHelpers?: boolean;
  helpers?: EmitHelper[];
  startsOnNewLine?: boolean;
}
export interface EmitResolver {
  hasGlobalName(name: string): boolean;
  getReferencedExportContainer(node: Identifier, prefixLocals?: boolean): SourceFile | ModuleDeclaration | EnumDeclaration | undefined;
  getReferencedImportDeclaration(node: Identifier): Declaration | undefined;
  getReferencedDeclarationWithCollidingName(node: Identifier): Declaration | undefined;
  isDeclarationWithCollidingName(node: Declaration): boolean;
  isValueAliasDeclaration(node: Node): boolean;
  referencedAliasDeclaration(node: Node, checkChildren?: boolean): boolean;
  isTopLevelValueImportEqualsWithEntityName(node: ImportEqualsDeclaration): boolean;
  getNodeCheckFlags(node: Node): qt.NodeCheckFlags;
  isDeclarationVisible(node: Declaration | AnyImportSyntax): boolean;
  isLateBound(node: Decl): node is LateBoundDecl;
  collectLinkedAliases(node: Identifier, setVisibility?: boolean): Node[] | undefined;
  isImplementationOfOverload(node: FunctionLikeDeclaration): boolean | undefined;
  isRequiredInitializedParam(node: ParamDeclaration): boolean;
  isOptionalUninitializedParamProperty(node: ParamDeclaration): boolean;
  isExpandoFunctionDeclaration(node: FunctionDeclaration): boolean;
  getPropertiesOfContainerFunction(node: Declaration): Symbol[];
  createTypeOfDeclaration(
    declaration: AccessorDeclaration | VariableLikeDeclaration | PropertyAccessExpression,
    enclosingDeclaration: Node,
    flags: qt.NodeBuilderFlags,
    tracker: SymbolTracker,
    addUndefined?: boolean
  ): Typing | undefined;
  createReturnTypeOfSignatureDeclaration(signatureDeclaration: SignatureDeclaration, enclosingDeclaration: Node, flags: qt.NodeBuilderFlags, tracker: SymbolTracker): Typing | undefined;
  createTypeOfExpression(expr: Expression, enclosingDeclaration: Node, flags: qt.NodeBuilderFlags, tracker: SymbolTracker): Typing | undefined;
  createLiteralConstValue(node: VariableDeclaration | PropertyDeclaration | PropertySignature | ParamDeclaration, tracker: SymbolTracker): Expression;
  isEntityNameVisible(entityName: EntityNameOrEntityNameExpression, enclosingDeclaration: Node): SymbolVisibilityResult;
  getConstantValue(node: EnumMember | PropertyAccessExpression | ElemAccessExpression): string | number | undefined;
  getReferencedValueDeclaration(reference: Identifier): Declaration | undefined;
  getTypeReferenceSerializationKind(typeName: EntityName, location?: Node): qt.TypeReferenceSerializationKind;
  isOptionalParam(node: ParamDeclaration): boolean;
  moduleExportsSomeValue(moduleReferenceExpression: Expression): boolean;
  isArgsLocalBinding(node: Identifier): boolean;
  getExternalModuleFileFromDeclaration(declaration: ImportEqualsDeclaration | ImportDeclaration | ExportDeclaration | ModuleDeclaration | ImportTyping): SourceFile | undefined;
  getTypeReferenceDirectivesForEntityName(name: EntityNameOrEntityNameExpression): string[] | undefined;
  getTypeReferenceDirectivesForSymbol(symbol: Symbol, meaning?: qt.SymbolFlags): string[] | undefined;
  isLiteralConstDeclaration(node: VariableDeclaration | PropertyDeclaration | PropertySignature | ParamDeclaration): boolean;
  getJsxFactoryEntity(location?: Node): EntityName | undefined;
  getAllAccessorDeclarations(declaration: AccessorDeclaration): AllAccessorDeclarations;
  getSymbolOfExternalModuleSpecifier(node: StringLiteralLike): Symbol | undefined;
  isBindingCapturedByNode(node: Node, decl: VariableDeclaration | BindingElem): boolean;
  getDeclarationStmtsForSourceFile(node: SourceFile, flags: qt.NodeBuilderFlags, tracker: SymbolTracker, bundled?: boolean): Statement[] | undefined;
  isImportRequiredByAugmentation(decl: ImportDeclaration): boolean;
}
export interface EmitResult {
  emitSkipped: boolean;
  diagnostics: readonly qd.Diagnostic[];
  emittedFiles?: string[];
  sourceMaps?: SourceMapEmitResult[];
  exportedModulesFromDeclarationEmit?: ExportedModulesFromDeclarationEmit;
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
export interface EmitTransformers {
  scriptTransformers: readonly TransformerFactory<SourceFile | Bundle>[];
  declarationTransformers: readonly TransformerFactory<SourceFile | Bundle>[];
}
export interface EmptyStatement extends Stmt {
  kind: Syntax.EmptyStatement;
}
export interface EndOfDeclarationMarker extends Stmt {
  kind: Syntax.EndOfDeclarationMarker;
}
export interface EnumDeclaration extends DeclarationStmt, DocContainer {
  kind: Syntax.EnumDeclaration;
  name: Identifier;
  members: Nodes<EnumMember>;
}
export interface EnumMember extends NamedDecl, DocContainer {
  kind: Syntax.EnumMember;
  parent?: EnumDeclaration;
  name: PropertyName;
  initer?: Expression;
}
export interface EnumType extends Type {}
export interface Expr extends Nobj {
  _expressionBrand: any;
}
export interface EvolvingArrayType extends ObjectType {
  elemType: Type;
  finalArrayType?: Type;
}
export interface ExpandResult {
  fileNames: string[];
  wildcardDirectories: qu.MapLike<qt.WatchDirectoryFlags>;
  spec: ConfigFileSpecs;
}
export interface ExportAssignment extends DeclarationStmt {
  kind: Syntax.ExportAssignment;
  parent?: SourceFile;
  isExportEquals?: boolean;
  expression: Expression;
}
export interface ExportDeclaration extends DeclarationStmt, DocContainer {
  kind: Syntax.ExportDeclaration;
  parent?: SourceFile | ModuleBlock;
  isTypeOnly: boolean;
  exportClause?: NamedExportBindings;
  moduleSpecifier?: Expression;
}
export interface ExportSpecifier extends NamedDecl {
  kind: Syntax.ExportSpecifier;
  parent?: NamedExports;
  propertyName?: Identifier;
  name: Identifier;
}
export interface ExpressionStatement extends Stmt, DocContainer {
  kind: Syntax.ExpressionStatement;
  expression: Expression;
}
export interface ExpressionWithTypings extends WithArgsTobj {
  kind: Syntax.ExpressionWithTypings;
  parent?: HeritageClause | DocAugmentsTag | DocImplementsTag;
  expression: LeftExpression;
}
export interface ExternalModuleReference extends Nobj {
  kind: Syntax.ExternalModuleReference;
  parent?: ImportEqualsDeclaration;
  expression: Expression;
}
export interface FileExtensionInfo {
  extension: string;
  isMixedContent: boolean;
  scriptKind?: qt.Script;
}
export interface FileReference extends qu.Range {
  fileName: string;
}
export interface FlowArrayMutation extends FlowNobj {
  node: CallExpression | BinaryExpression;
  antecedent: FlowNode;
}
export interface FlowAssignment extends FlowNobj {
  node: Expression | VariableDeclaration | BindingElem;
  antecedent: FlowNode;
}
export interface FlowCall extends FlowNobj {
  node: CallExpression;
  antecedent: FlowNode;
}
export interface FlowCondition extends FlowNobj {
  node: Expression;
  antecedent: FlowNode;
}
export interface FlowLabel extends FlowNobj {
  antecedents?: FlowNode[];
}
export interface FlowNobj {
  flags: qt.FlowFlags;
  id?: number;
}
export interface FlowReduceLabel extends FlowNobj {
  target: FlowLabel;
  antecedents: FlowNode[];
  antecedent: FlowNode;
}
export interface FlowStart extends FlowNobj {
  node?: FunctionExpression | ArrowFunction | MethodDeclaration;
}
export interface FlowSwitchClause extends FlowNobj {
  switchStatement: SwitchStatement;
  clauseStart: number;
  clauseEnd: number;
  antecedent: FlowNode;
}
export interface ForInStatement extends IterationStmt {
  kind: Syntax.ForInStatement;
  initer: ForIniter;
  expression: Expression;
}
export interface ForOfStatement extends IterationStmt {
  kind: Syntax.ForOfStatement;
  awaitModifier?: AwaitKeywordToken;
  initer: ForIniter;
  expression: Expression;
}
export interface ForStatement extends IterationStmt {
  kind: Syntax.ForStatement;
  initer?: ForIniter;
  condition?: Expression;
  incrementor?: Expression;
}
export interface Frame extends qu.Frame {
  calc: unknown;
  decl: unknown;
  emit: unknown;
  format: unknown;
  make: unknown;
  nest: unknown;
  sign: unknown;
  skip: unknown;
  stmt: unknown;
  symb: unknown;
  type: unknown;
  visit: unknown;
}
export interface FreshableIntrinsicType extends IntrinsicType {
  freshType: IntrinsicType;
  regularType: IntrinsicType;
}
export interface FreshObjectLiteralType extends ResolvedType {
  regularType: ResolvedType;
}
export interface FunctionDeclaration extends FunctionLikeDecl, DeclarationStmt {
  kind: Syntax.FunctionDeclaration;
  name?: Identifier;
  body?: FunctionBody;
}
export interface FunctionExpression extends PrimaryExpr, FunctionLikeDecl, DocContainer {
  kind: Syntax.FunctionExpression;
  name?: Identifier;
  body: FunctionBody;
}
export interface FunctionLikeDecl extends SignatureDecl {
  _functionLikeDeclarationBrand: any;
  asteriskToken?: AsteriskToken;
  questionToken?: QuestionToken;
  exclamationToken?: ExclamationToken;
  body?: Block | Expression;
  endFlowNode?: FlowNode;
  returnFlowNode?: FlowNode;
}
export interface FunctionOrConstructorTobj extends Tobj, SignatureDecl {
  kind: Syntax.FunctionTyping | Syntax.ConstructorTyping;
  type: Typing;
}
export interface FunctionTyping extends FunctionOrConstructorTobj {
  kind: Syntax.FunctionTyping;
}
export interface GeneratedIdentifier extends Identifier {
  autoGenFlags: qt.GeneratedIdentifierFlags;
}
export interface GenericType extends InterfaceType, TypeReference {
  instantiations: qu.QMap<TypeReference>;
  variances?: qt.VarianceFlags[];
}
export interface GetAccessorDeclaration extends FunctionLikeDecl, ClassElem, ObjectLiteralElem, DocContainer {
  kind: Syntax.GetAccessor;
  parent?: ClassLikeDeclaration | ObjectLiteralExpression;
  name: PropertyName;
  body?: FunctionBody;
}
export interface GetEffectiveTypeRootsHost {
  directoryExists?(directoryName: string): boolean;
  getCurrentDirectory?(): string;
}
export interface HeritageClause extends Nobj {
  kind: Syntax.HeritageClause;
  parent?: InterfaceDeclaration | ClassLikeDeclaration;
  token: Syntax.ExtendsKeyword | Syntax.ImplementsKeyword;
  types: Nodes<ExpressionWithTypings>;
}
export interface Identifier extends PrimaryExpr, Decl {
  kind: Syntax.Identifier;
  escapedText: qu.__String;
  originalKeywordKind?: Syntax;
  autoGenFlags?: qt.GeneratedIdentifierFlags;
  autoGenId?: number;
  isInDocNamespace?: boolean;
  typeArgs?: Nodes<Typing | TypeParamDeclaration>;
  jsdocDotPos?: number;
}
export interface IdentifierTypePredicate extends TypePredicateBase {
  kind: qt.TypePredicateKind.Identifier;
  paramName: string;
  paramIndex: number;
  type: Type;
}
export interface IfStatement extends Stmt {
  kind: Syntax.IfStatement;
  expression: Expression;
  thenStatement: Statement;
  elseStatement?: Statement;
}
export interface ImportCall extends CallExpression {
  expression: ImportExpression;
}
export interface ImportClause extends NamedDecl {
  kind: Syntax.ImportClause;
  parent?: ImportDeclaration;
  isTypeOnly: boolean;
  name?: Identifier;
  namedBindings?: NamedImportBindings;
}
export interface ImportDeclaration extends Stmt {
  kind: Syntax.ImportDeclaration;
  parent?: SourceFile | ModuleBlock;
  importClause?: ImportClause;
  moduleSpecifier: Expression;
}
export interface ImportEqualsDeclaration extends DeclarationStmt, DocContainer {
  kind: Syntax.ImportEqualsDeclaration;
  parent?: SourceFile | ModuleBlock;
  name: Identifier;
  moduleReference: ModuleReference;
}
export interface ImportExpression extends PrimaryExpr {
  kind: Syntax.ImportKeyword;
}
export interface ImportMetaProperty extends MetaProperty {
  keywordToken: Syntax.ImportKeyword;
  name: Identifier & { escapedText: qu.__String & 'meta' };
}
export interface ImportSpecifier extends NamedDecl {
  kind: Syntax.ImportSpecifier;
  parent?: NamedImports;
  propertyName?: Identifier;
  name: Identifier;
}
export interface ImportTyping extends WithArgsTobj {
  kind: Syntax.ImportTyping;
  isTypeOf?: boolean;
  arg: Typing;
  qualifier?: EntityName;
}
export interface IncompleteType {
  flags: qt.TypeFlags;
  type: Type;
}
export interface IndexedAccessType extends InstantiableType {
  objectType: Type;
  indexType: Type;
  constraint?: Type;
  simplifiedForReading?: Type;
  simplifiedForWriting?: Type;
}
export interface IndexedAccessTyping extends Tobj {
  kind: Syntax.IndexedAccessTyping;
  objectType: Typing;
  indexType: Typing;
}
export interface IndexInfo {
  type: Type;
  isReadonly: boolean;
  declaration?: IndexSignatureDeclaration;
}
export interface IndexSignatureDeclaration extends SignatureDecl, ClassElem, TypeElem {
  kind: Syntax.IndexSignature;
  parent?: ObjectTypeDeclaration;
}
export interface IndexType extends InstantiableType {
  type: InstantiableType | UnionOrIntersectionType;
  stringsOnly: boolean;
}
export interface InferenceContext {
  inferences: InferenceInfo[];
  signature?: Signature;
  flags: qt.InferenceFlags;
  compareTypes: TypeComparer;
  mapper: TypeMapper;
  nonFixingMapper: TypeMapper;
  returnMapper?: TypeMapper;
  inferredTypeParams?: readonly TypeParam[];
}
export interface InferenceInfo {
  typeParam: TypeParam;
  candidates?: Type[];
  contraCandidates?: Type[];
  inferredType?: Type;
  priority?: qt.InferencePriority;
  topLevel: boolean;
  isFixed: boolean;
}
export interface InferTyping extends Tobj {
  kind: Syntax.InferTyping;
  typeParam: TypeParamDeclaration;
}
export interface InputFiles extends Nobj {
  kind: Syntax.InputFiles;
  jsPath?: string;
  jsText: string;
  jsMapPath?: string;
  jsMapText?: string;
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
export interface InterfaceDeclaration extends DeclarationStmt, DocContainer {
  kind: Syntax.InterfaceDeclaration;
  name: Identifier;
  typeParams?: Nodes<TypeParamDeclaration>;
  heritageClauses?: Nodes<HeritageClause>;
  members: Nodes<TypeElem>;
}
export interface InterfaceType extends ObjectType {
  typeParams?: TypeParam[];
  outerTypeParams?: TypeParam[];
  localTypeParams?: TypeParam[];
  thisType?: TypeParam;
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
export interface IntersectionTyping extends Tobj {
  kind: Syntax.IntersectionTyping;
  types: Nodes<Typing>;
}
export interface IntrinsicType extends Type {
  intrinsicName: string;
  objectFlags: qt.ObjectFlags;
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
export interface IterationStmt extends Stmt {
  statement: Statement;
}
export interface IterationTypes {
  readonly yieldType: Type;
  readonly returnType: Type;
  readonly nextType: Type;
}
export interface JsonMinusNumericLiteral extends PrefixUnaryExpression {
  kind: Syntax.PrefixUnaryExpression;
  operator: Syntax.MinusToken;
  operand: NumericLiteral;
}
export interface JsonObjectExpressionStatement extends ExpressionStatement {
  expression: ObjectLiteralExpression | ArrayLiteralExpression | JsonMinusNumericLiteral | NumericLiteral | StringLiteral | BooleanLiteral | NullLiteral;
}
export interface JsonSourceFile extends SourceFile {
  statements: Nodes<JsonObjectExpressionStatement>;
}
export interface JsxAttribute extends ObjectLiteralElem {
  kind: Syntax.JsxAttribute;
  parent?: JsxAttributes;
  name: Identifier;
  initer?: StringLiteral | JsxExpression;
}
export interface JsxAttributes extends ObjectLiteralExpr<JsxAttributeLike> {
  kind: Syntax.JsxAttributes;
  parent?: JsxOpeningLikeElem;
}
export interface JsxClosingElem extends Nobj {
  kind: Syntax.JsxClosingElem;
  parent?: JsxElem;
  tagName: JsxTagNameExpression;
}
export interface JsxClosingFragment extends Expr {
  kind: Syntax.JsxClosingFragment;
  parent?: JsxFragment;
}
export interface JsxElem extends PrimaryExpr {
  kind: Syntax.JsxElem;
  opening: JsxOpeningElem;
  children: Nodes<JsxChild>;
  closing: JsxClosingElem;
}
export interface JsxExpression extends Expr {
  kind: Syntax.JsxExpression;
  parent?: JsxElem | JsxAttributeLike;
  dot3Token?: Token<Syntax.Dot3Token>;
  expression?: Expression;
}
export interface JsxFragment extends PrimaryExpr {
  kind: Syntax.JsxFragment;
  openingFragment: JsxOpeningFragment;
  children: Nodes<JsxChild>;
  closingFragment: JsxClosingFragment;
}
export interface JsxOpeningElem extends Expr {
  kind: Syntax.JsxOpeningElem;
  parent?: JsxElem;
  tagName: JsxTagNameExpression;
  typeArgs?: Nodes<Typing>;
  attributes: JsxAttributes;
}
export interface JsxOpeningFragment extends Expr {
  kind: Syntax.JsxOpeningFragment;
  parent?: JsxFragment;
}
export interface JsxSelfClosingElem extends PrimaryExpr {
  kind: Syntax.JsxSelfClosingElem;
  tagName: JsxTagNameExpression;
  typeArgs?: Nodes<Typing>;
  attributes: JsxAttributes;
}
export interface JsxSpreadAttribute extends ObjectLiteralElem {
  kind: Syntax.JsxSpreadAttribute;
  parent?: JsxAttributes;
  expression: Expression;
}
export interface JsxTagNamePropertyAccess extends PropertyAccessExpression {
  expression: JsxTagNameExpression;
}
export interface JsxText extends LiteralLikeNode {
  kind: Syntax.JsxText;
  onlyTriviaWhiteSpaces: boolean;
  parent?: JsxElem;
}
export interface KeywordTyping extends Tobj {
  kind:
    | Syntax.AnyKeyword
    | Syntax.BigIntKeyword
    | Syntax.BooleanKeyword
    | Syntax.NeverKeyword
    | Syntax.NullKeyword
    | Syntax.NumberKeyword
    | Syntax.ObjectKeyword
    | Syntax.StringKeyword
    | Syntax.SymbolKeyword
    | Syntax.ThisKeyword
    | Syntax.UndefinedKeyword
    | Syntax.UnknownKeyword
    | Syntax.VoidKeyword;
}
export interface LabeledStatement extends Stmt, DocContainer {
  kind: Syntax.LabeledStatement;
  label: Identifier;
  statement: Statement;
}
export interface LateBoundBinaryExpressionDeclaration extends DynamicNamedBinaryExpression {
  left: LateBoundElemAccessExpression;
}
export interface LateBoundDecl extends DynamicNamedDecl {
  name: LateBoundName;
}
export interface LateBoundElemAccessExpression extends ElemAccessExpression {
  argExpression: EntityNameExpression;
}
export interface LateBoundName extends ComputedPropertyName {
  expression: EntityNameExpression;
}
export interface LeftExpr extends UpdateExpr {
  _leftExpressionBrand: any;
}
export interface LiteralExpr extends PrimaryExpr, LiteralLikeNode {
  _literalExpressionBrand: any;
}
export interface LiteralLikeNode extends Nobj {
  text: string;
  isUnterminated?: boolean;
  hasExtendedEscape?: boolean;
}
export interface LiteralType extends Type {
  value: string | number | PseudoBigInt;
  freshType: LiteralType;
  regularType: LiteralType;
}
export interface LiteralTyping extends Tobj {
  kind: Syntax.LiteralTyping;
  literal: BooleanLiteral | LiteralExpression | PrefixUnaryExpression;
}
export interface MappedSymbol extends TransientSymbol {
  mappedType: MappedType;
  mapper: TypeMapper;
}
export interface MappedType extends AnonymousType {
  declaration: MappedTyping;
  typeParam?: TypeParam;
  constraintType?: Type;
  templateType?: Type;
  modifiersType?: Type;
  resolvedApparentType?: Type;
}
export interface MappedTyping extends Tobj, Decl {
  kind: Syntax.MappedTyping;
  readonlyToken?: ReadonlyToken | PlusToken | MinusToken;
  typeParam: TypeParamDeclaration;
  questionToken?: QuestionToken | PlusToken | MinusToken;
  type?: Typing;
}
export interface MemberExpr extends LeftExpr {
  _memberExpressionBrand: any;
}
export interface MergeDeclarationMarker extends Stmt {
  kind: Syntax.MergeDeclarationMarker;
}
export interface MetaProperty extends PrimaryExpr {
  kind: Syntax.MetaProperty;
  keywordToken: Syntax.NewKeyword | Syntax.ImportKeyword;
  name: Identifier;
}
export interface MethodDeclaration extends FunctionLikeDecl, ClassElem, ObjectLiteralElem, DocContainer {
  kind: Syntax.MethodDeclaration;
  parent?: ClassLikeDeclaration | ObjectLiteralExpression;
  name: PropertyName;
  body?: FunctionBody;
}
export interface MethodSignature extends SignatureDecl, TypeElem {
  kind: Syntax.MethodSignature;
  parent?: ObjectTypeDeclaration;
  name: PropertyName;
}
export interface MissingDeclaration extends DeclarationStmt {
  kind: Syntax.MissingDeclaration;
  name?: Identifier;
}
export interface ModuleBlock extends Stmt {
  kind: Syntax.ModuleBlock;
  parent?: ModuleDeclaration;
  statements: Nodes<Statement>;
}
export interface ModuleDeclaration extends DeclarationStmt, DocContainer {
  kind: Syntax.ModuleDeclaration;
  parent?: ModuleBody | SourceFile;
  name: ModuleName;
  body?: ModuleBody | DocNamespaceDeclaration;
}
export interface ModuleResolutionHost {
  fileExists(fileName: string): boolean;
  readFile(fileName: string): string | undefined;
  trace?(s: string): void;
  directoryExists?(directoryName: string): boolean;
  realpath?(path: string): string;
  getCurrentDirectory?(): string;
  getDirectories?(path: string): string[];
}
export interface ModuleSpecifierResolutionHost {
  useCaseSensitiveFileNames?(): boolean;
  fileExists(path: string): boolean;
  getCurrentDirectory(): string;
  readFile?(path: string): string | undefined;
  getProbableSymlinks?(files: readonly SourceFile[]): qu.QReadonlyMap<string>;
  getGlobalTypingsCacheLocation?(): string | undefined;
  getSourceFiles(): readonly SourceFile[];
  readonly redirectTargetsMap: RedirectTargetsMap;
  getProjectReferenceRedirect(fileName: string): string | undefined;
  isSourceOfProjectReferenceRedirect(fileName: string): boolean;
}
export interface NamedDecl extends Decl {
  name?: DeclarationName;
}
export interface NamedExports extends Nobj {
  kind: Syntax.NamedExports;
  parent?: ExportDeclaration;
  elems: Nodes<ExportSpecifier>;
}
export interface NamedImports extends Nobj {
  kind: Syntax.NamedImports;
  parent?: ImportClause;
  elems: Nodes<ImportSpecifier>;
}
export interface NamedTupleMember extends Tobj, DocContainer, Decl {
  kind: Syntax.NamedTupleMember;
  dot3Token?: Token<Syntax.Dot3Token>;
  name: Identifier;
  questionToken?: QuestionToken;
  type: Typing;
}
export interface NamespaceDeclaration extends ModuleDeclaration {
  name: Identifier;
  body: NamespaceBody;
}
export interface NamespaceExport extends NamedDecl {
  kind: Syntax.NamespaceExport;
  parent?: ExportDeclaration;
  name: Identifier;
}
export interface NamespaceExportDeclaration extends DeclarationStmt {
  kind: Syntax.NamespaceExportDeclaration;
  name: Identifier;
}
export interface NamespaceImport extends NamedDecl {
  kind: Syntax.NamespaceImport;
  parent?: ImportClause;
  name: Identifier;
}
export interface NewExpression extends PrimaryExpr, Decl {
  kind: Syntax.NewExpression;
  expression: LeftExpression;
  typeArgs?: Nodes<Typing>;
  args?: Nodes<Expression>;
}
export interface Nobj extends qu.Range {
  contextualType?: Type;
  decorators?: Nodes<Decorator>;
  doc?: Doc[];
  emitNode?: EmitNode;
  flags: qt.NodeFlags;
  flowNode?: FlowNode;
  id?: number;
  inferenceContext?: InferenceContext;
  kind: Syntax;
  locals?: SymbolTable;
  localSymbol?: Symbol;
  modifierFlagsCache: qt.ModifierFlags;
  modifiers?: Nodes<Modifier>;
  nextContainer?: Nobj;
  original?: Node;
  parent?: Node;
  sourceFile: SourceFile;
  symbol: Symbol;
  trafoFlags: qt.TrafoFlags;
  visit<T>(v?: (n?: Node) => T | undefined): T | undefined;
}
export interface NodeLinks {
  capturedBlockScopeBindings?: Symbol[];
  containsArgsReference?: boolean;
  contextFreeType?: Type;
  declarationRequiresScopeChange?: boolean;
  deferredNodes?: qu.QMap<Node>;
  effectsSignature?: Signature;
  enumMemberValue?: string | number;
  flags: qt.NodeCheckFlags;
  hasReportedStatementInAmbientContext?: boolean;
  instantiations?: qu.QMap<Type>;
  isExhaustive?: boolean;
  isVisible?: boolean;
  jsxFlags: qt.JsxFlags;
  jsxNamespace?: Symbol | false;
  outerTypeParams?: TypeParam[];
  resolvedDocType?: Type;
  resolvedEnumType?: Type;
  resolvedIndexInfo?: IndexInfo;
  resolvedJsxElemAllAttributesType?: Type;
  resolvedJsxElemAttributesType?: Type;
  resolvedSignature?: Signature;
  resolvedSymbol?: Symbol;
  resolvedType?: Type;
  skipDirectInference?: true;
  switchTypes?: Type[];
}
export interface Nodes<T extends Nobj = Nobj> extends ReadonlyArray<T>, qu.Range {
  trailingComma?: boolean;
  trafoFlags: qt.TrafoFlags;
  visit<T>(v?: (n?: Node) => T | undefined, vs?: (ns?: Nodes) => T | undefined): T | undefined;
}
export interface WithArgsTobj extends Tobj {
  typeArgs?: Nodes<Typing>;
}
export interface NonNullChain extends NonNullExpression {
  _optionalChainBrand: any;
}
export interface NonNullExpression extends LeftExpr {
  kind: Syntax.NonNullExpression;
  expression: Expression;
}
export interface NoSubstitutionLiteral extends LiteralExpr, TemplateLiteralLikeNode, Decl {
  kind: Syntax.NoSubstitutionLiteral;
  templateFlags?: qt.TokenFlags;
}
export interface NotEmittedStatement extends Stmt {
  kind: Syntax.NotEmittedStatement;
}
export interface NullableType extends IntrinsicType {
  objectFlags: qt.ObjectFlags;
}
export interface NullLiteral extends PrimaryExpr, Tobj {
  kind: Syntax.NullKeyword;
}
export interface NumberLiteralType extends LiteralType {
  value: number;
}
export interface NumericLiteral extends LiteralExpr, Decl {
  kind: Syntax.NumericLiteral;
  numericLiteralFlags: qt.TokenFlags;
}
export interface ObjectBindingPattern extends Nobj {
  kind: Syntax.ObjectBindingPattern;
  parent?: VariableDeclaration | ParamDeclaration | BindingElem;
  elems: Nodes<BindingElem>;
}
export interface ObjectDestructuringAssignment extends AssignmentExpression<EqualsToken> {
  left: ObjectLiteralExpression;
}
export interface ObjectLiteralElem extends NamedDecl {
  _objectLiteralBrand: any;
  name?: PropertyName;
}
export interface ObjectLiteralExpression extends ObjectLiteralExpr<ObjectLiteralElemLike> {
  kind: Syntax.ObjectLiteralExpression;
  multiLine?: boolean;
}
export interface ObjectLiteralExpr<T extends ObjectLiteralElem> extends PrimaryExpr, Decl {
  properties: Nodes<T>;
}
export interface ObjectType extends Type {
  objectFlags: qt.ObjectFlags;
  members?: SymbolTable;
  properties?: Symbol[];
  callSignatures?: readonly Signature[];
  constructSignatures?: readonly Signature[];
  stringIndexInfo?: IndexInfo;
  numberIndexInfo?: IndexInfo;
}
export interface OmittedExpression extends Expr {
  kind: Syntax.OmittedExpression;
}
export class OperationCanceledException {}
export interface OptionalTyping extends Tobj {
  kind: Syntax.OptionalTyping;
  type: Typing;
}
export interface PackageId {
  name: string;
  subModuleName: string;
  version: string;
}
export interface ParamDeclaration extends NamedDecl, DocContainer {
  kind: Syntax.Param;
  parent?: SignatureDeclaration;
  dot3Token?: Dot3Token;
  name: BindingName;
  questionToken?: QuestionToken;
  type?: Typing;
  initer?: Expression;
}
export interface ParenthesizedExpression extends PrimaryExpr, DocContainer {
  kind: Syntax.ParenthesizedExpression;
  expression: Expression;
}
export interface ParenthesizedTyping extends Tobj {
  kind: Syntax.ParenthesizedTyping;
  type: Typing;
}
export interface ParseConfigHost {
  useCaseSensitiveFileNames: boolean;
  readDirectory(rootDir: string, extensions: readonly string[], excludes: readonly string[] | undefined, includes: readonly string[], depth?: number): readonly string[];
  fileExists(path: string): boolean;
  readFile(path: string): string | undefined;
  trace?(s: string): void;
}
export interface ParsedCommandLine {
  opts: CompilerOpts;
  typeAcquisition?: TypeAcquisition;
  fileNames: string[];
  projectReferences?: readonly ProjectReference[];
  watchOpts?: WatchOpts;
  raw?: any;
  errors: qd.Diagnostic[];
  wildcardDirectories?: qu.MapLike<qt.WatchDirectoryFlags>;
  compileOnSave?: boolean;
  configFileSpecs?: ConfigFileSpecs;
}
export interface PartiallyEmittedExpression extends LeftExpr {
  kind: Syntax.PartiallyEmittedExpression;
  expression: Expression;
}
export interface PatternAmbientModule {
  pattern: qu.Pattern;
  symbol: Symbol;
}
export interface PluginImport {
  name: string;
}
export interface PostfixUnaryExpression extends UpdateExpr {
  kind: Syntax.PostfixUnaryExpression;
  operand: LeftExpression;
  operator: PostfixUnaryOperator;
}
export interface PragmaDefinition<T1 extends string = string, T2 extends string = string, T3 extends string = string, T4 extends string = string> {
  args?:
    | readonly [PragmaArgSpecification<T1>]
    | readonly [PragmaArgSpecification<T1>, PragmaArgSpecification<T2>]
    | readonly [PragmaArgSpecification<T1>, PragmaArgSpecification<T2>, PragmaArgSpecification<T3>]
    | readonly [PragmaArgSpecification<T1>, PragmaArgSpecification<T2>, PragmaArgSpecification<T3>, PragmaArgSpecification<T4>];
  kind?: qt.PragmaKindFlags;
}
export interface PragmaMap extends qu.QMap<PragmaPseudoMap[keyof PragmaPseudoMap] | PragmaPseudoMap[keyof PragmaPseudoMap][]>, ReadonlyPragmaMap {
  set<K extends keyof PragmaPseudoMap>(k: K, v: PragmaPseudoMap[K] | PragmaPseudoMap[K][]): this;
  get<K extends keyof PragmaPseudoMap>(k: K): PragmaPseudoMap[K] | PragmaPseudoMap[K][];
  forEach(action: <K extends keyof PragmaPseudoMap>(v: PragmaPseudoMap[K] | PragmaPseudoMap[K][], k: K) => void): void;
}
export interface PrefixUnaryExpression extends UpdateExpr {
  kind: Syntax.PrefixUnaryExpression;
  operator: PrefixUnaryOperator;
  operand: UnaryExpression;
}
export interface PrimaryExpr extends MemberExpr {
  _primaryExpressionBrand: any;
}
export interface Printer {
  printNode(hint: qt.EmitHint, node: Node, sourceFile: SourceFile): string;
  printList<T extends Nobj>(format: qt.ListFormat, list: Nodes<T>, sourceFile: SourceFile): string;
  printFile(sourceFile: SourceFile): string;
  printBundle(bundle: Bundle): string;
  writeNode(hint: qt.EmitHint, node: Node, sourceFile: SourceFile | undefined, writer: EmitTextWriter): void;
  writeList<T extends Nobj>(format: qt.ListFormat, list: Nodes<T> | undefined, sourceFile: SourceFile | undefined, writer: EmitTextWriter): void;
  writeFile(sourceFile: SourceFile, writer: EmitTextWriter, sourceMapGenerator: SourceMapGenerator | undefined): void;
  writeBundle(bundle: Bundle, writer: EmitTextWriter, sourceMapGenerator: SourceMapGenerator | undefined): void;
  bundleFileInfo?: BundleFileInfo;
}
export interface PrinterOpts {
  removeComments?: boolean;
  newLine?: qt.NewLineKind;
  omitTrailingSemicolon?: boolean;
  noEmitHelpers?: boolean;
  module?: CompilerOpts['module'];
  target?: CompilerOpts['target'];
  sourceMap?: boolean;
  inlineSourceMap?: boolean;
  inlineSources?: boolean;
  extendedDiagnostics?: boolean;
  onlyPrintDocStyle?: boolean;
  neverAsciiEscape?: boolean;
  writeBundleFileInfo?: boolean;
  recordInternalSection?: boolean;
  stripInternal?: boolean;
  preserveSourceNewlines?: boolean;
  relativeToBuildInfo?: (path: string) => string;
}
export interface PrintHandlers {
  hasGlobalName?(name: string): boolean;
  onEmitNode?(hint: qt.EmitHint, node: Node | undefined, emitCallback: (hint: qt.EmitHint, node: Node | undefined) => void): void;
  isEmitNotificationEnabled?(node: Node | undefined): boolean;
  substituteNode?(hint: qt.EmitHint, node: Node): Node;
  onEmitSourceMapOfNode?: (hint: qt.EmitHint, node: Node, emitCallback: (hint: qt.EmitHint, node: Node) => void) => void;
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
export interface PrivateIdentifier extends Nobj {
  kind: Syntax.PrivateIdentifier;
  escapedText: qu.__String;
}
export interface PrivateIdentifierPropertyAccessExpression extends PropertyAccessExpression {
  name: PrivateIdentifier;
}
export interface PrivateIdentifierPropertyDeclaration extends PropertyDeclaration {
  name: PrivateIdentifier;
}
export interface Program extends ScriptReferenceHost {
  getCurrentDirectory(): string;
  getRootFileNames(): readonly string[];
  getSourceFiles(): readonly SourceFile[];
  getMissingFilePaths(): readonly Path[];
  getRefFileMap(): qu.MultiMap<RefFile> | undefined;
  getFilesByNameMap(): qu.QMap<SourceFile | false | undefined>;
  emit(targetSourceFile?: SourceFile, writeFile?: WriteFileCallback, cancelToken?: CancelToken, emitOnlyDtsFiles?: boolean, customTransformers?: CustomTransformers): EmitResult;
  emit(
    targetSourceFile?: SourceFile,
    writeFile?: WriteFileCallback,
    cancelToken?: CancelToken,
    emitOnlyDtsFiles?: boolean,
    customTransformers?: CustomTransformers,
    forceDtsEmit?: boolean
  ): EmitResult;
  getOptsDiagnostics(cancelToken?: CancelToken): readonly qd.Diagnostic[];
  getGlobalDiagnostics(cancelToken?: CancelToken): readonly qd.Diagnostic[];
  getSyntacticDiagnostics(sourceFile?: SourceFile, cancelToken?: CancelToken): readonly qd.DiagnosticWithLocation[];
  getSemanticDiagnostics(sourceFile?: SourceFile, cancelToken?: CancelToken): readonly qd.Diagnostic[];
  getDeclarationDiagnostics(sourceFile?: SourceFile, cancelToken?: CancelToken): readonly qd.DiagnosticWithLocation[];
  getConfigFileParsingDiagnostics(): readonly qd.Diagnostic[];
  getSuggestionDiagnostics(sourceFile: SourceFile, cancelToken?: CancelToken): readonly qd.DiagnosticWithLocation[];
  getBindAndCheckDiagnostics(sourceFile: SourceFile, cancelToken?: CancelToken): readonly qd.Diagnostic[];
  getProgramDiagnostics(sourceFile: SourceFile, cancelToken?: CancelToken): readonly qd.Diagnostic[];
  getTypeChecker(): TypeChecker;
  getCommonSourceDirectory(): string;
  getDiagnosticsProducingTypeChecker(): TypeChecker;
  dropDiagnosticsProducingTypeChecker(): void;
  getClassifiableNames(): qu.EscapedMap<true>;
  getNodeCount(): number;
  getIdentifierCount(): number;
  getSymbolCount(): number;
  getTypeCount(): number;
  getInstantiationCount(): number;
  getRelationCacheSizes(): { assignable: number; identity: number; subtype: number; strictSubtype: number };
  getFileProcessingDiagnostics(): qd.DiagnosticCollection;
  getResolvedTypeReferenceDirectives(): qu.QMap<ResolvedTypeReferenceDirective | undefined>;
  isSourceFileFromExternalLibrary(file: SourceFile): boolean;
  isSourceFileDefaultLibrary(file: SourceFile): boolean;
  structureIsReused?: qt.StructureIsReused;
  getSourceFileFromReference(referencingFile: SourceFile | UnparsedSource, ref: FileReference): SourceFile | undefined;
  getLibFileFromReference(ref: FileReference): SourceFile | undefined;
  sourceFileToPackageName: qu.QMap<string>;
  redirectTargetsMap: qu.MultiMap<string>;
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
  emitBuildInfo(writeFile?: WriteFileCallback, cancelToken?: CancelToken): EmitResult;
  getProbableSymlinks(): qu.QReadonlyMap<string>;
  fileExists(fileName: string): boolean;
}
export interface Program extends TypeCheckerHost, ModuleSpecifierResolutionHost {}
export interface ProgramBuildInfo {}
export interface ProjectReference {
  path: string;
  originalPath?: string;
  prepend?: boolean;
  circular?: boolean;
}
export interface PrologueDirective extends ExpressionStatement {
  expression: StringLiteral;
}
export interface PromiseOrAwaitableType extends ObjectType, UnionType {
  promiseTypeOfPromiseConstructor?: Type;
  promisedTypeOfPromise?: Type;
  awaitedTypeOfType?: Type;
}
export interface PropertyAccessChain extends PropertyAccessExpression {
  _optionalChainBrand: any;
  name: Identifier;
}
export interface PropertyAccessChainRoot extends PropertyAccessChain {
  questionDotToken: QuestionDotToken;
}
export interface PropertyAccessEntityNameExpression extends PropertyAccessExpression {
  _propertyAccessExpressionLikeQualifiedNameBrand?: any;
  expression: EntityNameExpression;
  name: Identifier;
}
export interface PropertyAccessExpression extends MemberExpr, NamedDecl {
  kind: Syntax.PropertyAccessExpression;
  expression: LeftExpression;
  questionDotToken?: QuestionDotToken;
  name: Identifier | PrivateIdentifier;
}
export interface PropertyAssignment extends ObjectLiteralElem, DocContainer {
  parent?: ObjectLiteralExpression;
  kind: Syntax.PropertyAssignment;
  name: PropertyName;
  questionToken?: QuestionToken;
  initer: Expression;
}
export interface PropertyDeclaration extends ClassElem, DocContainer {
  kind: Syntax.PropertyDeclaration;
  parent?: ClassLikeDeclaration;
  name: PropertyName;
  questionToken?: QuestionToken;
  exclamationToken?: ExclamationToken;
  type?: Typing;
  initer?: Expression;
}
export interface PropertyDescriptorAttributes {
  enumerable?: boolean | Expression;
  configurable?: boolean | Expression;
  writable?: boolean | Expression;
  value?: Expression;
  get?: Expression;
  set?: Expression;
}
export interface PropertyLikeDecl extends NamedDecl {
  name: PropertyName;
}
export interface PropertySignature extends TypeElem, DocContainer {
  kind: Syntax.PropertySignature;
  name: PropertyName;
  questionToken?: QuestionToken;
  type?: Typing;
  initer?: Expression;
}
export interface PseudoBigInt {
  negative: boolean;
  base10Value: string;
}
export interface QualifiedName extends Nobj {
  kind: Syntax.QualifiedName;
  left: EntityName;
  right: Identifier;
  jsdocDotPos?: number;
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
export interface ReadonlyPragmaMap extends qu.QReadonlyMap<PragmaPseudoMap[keyof PragmaPseudoMap] | PragmaPseudoMap[keyof PragmaPseudoMap][]> {
  get<K extends keyof PragmaPseudoMap>(k: K): PragmaPseudoMap[K] | PragmaPseudoMap[K][];
}
export interface RedirectInfo {
  readonly redirectTarget: SourceFile;
  readonly unredirected: SourceFile;
}
export interface RefFile {
  referencedFileName: string;
  kind: qt.RefFileKind;
  index: number;
  file: Path;
}
export interface RegexLiteral extends LiteralExpr {
  kind: Syntax.RegexLiteral;
}
export interface RequireVariableDeclaration extends VariableDeclaration {
  initer: RequireOrImportCall;
}
export interface ResolvedModule {
  resolvedFileName: string;
  isExternalLibraryImport?: boolean;
}
export interface ResolvedModuleFull extends ResolvedModule {
  readonly originalPath?: string;
  extension: qt.Extension;
  packageId?: PackageId;
}
export interface ResolvedModuleWithFailedLookupLocations {
  readonly resolvedModule?: ResolvedModuleFull;
  readonly failedLookupLocations: string[];
}
export interface ResolvedProjectReference {
  commandLine: ParsedCommandLine;
  sourceFile: SourceFile;
  references?: readonly (ResolvedProjectReference | undefined)[];
}
export interface ResolvedProjectReferenceCallbacks {
  getSourceOfProjectReferenceRedirect(fileName: string): SourceOfProjectReferenceRedirect | undefined;
  forEachResolvedProjectReference<T>(cb: (resolvedProjectReference: ResolvedProjectReference | undefined, resolvedProjectReferencePath: Path) => T | undefined): T | undefined;
}
export interface ResolvedType extends ObjectType, UnionOrIntersectionType {
  members: SymbolTable;
  properties: Symbol[];
  callSignatures: readonly Signature[];
  constructSignatures: readonly Signature[];
}
export interface ResolvedTypeReferenceDirective {
  primary: boolean;
  resolvedFileName?: string;
  packageId?: PackageId;
  isExternalLibraryImport?: boolean;
}
export interface ResolvedTypeReferenceDirectiveWithFailedLookupLocations {
  readonly resolvedTypeReferenceDirective?: ResolvedTypeReferenceDirective;
  readonly failedLookupLocations: string[];
}
export interface RestTyping extends Tobj {
  kind: Syntax.RestTyping;
  type: Typing;
}
export interface ReturnStatement extends Stmt {
  kind: Syntax.ReturnStatement;
  expression?: Expression;
}
export interface ReverseMappedSymbol extends TransientSymbol {
  propertyType: Type;
  mappedType: MappedType;
  constraintType: IndexType;
}
export interface ReverseMappedType extends ObjectType {
  source: Type;
  mappedType: MappedType;
  constraintType: IndexType;
}
export interface ScriptReferenceHost {
  getCompilerOpts(): CompilerOpts;
  getSourceFile(fileName: string): SourceFile | undefined;
  getSourceFileByPath(path: Path): SourceFile | undefined;
  getCurrentDirectory(): string;
}
export interface SemicolonClassElem extends ClassElem {
  kind: Syntax.SemicolonClassElem;
  parent?: ClassLikeDeclaration;
}
export interface SetAccessorDeclaration extends FunctionLikeDecl, ClassElem, ObjectLiteralElem, DocContainer {
  kind: Syntax.SetAccessor;
  parent?: ClassLikeDeclaration | ObjectLiteralExpression;
  name: PropertyName;
  body?: FunctionBody;
}
export interface ShorthandPropertyAssignment extends ObjectLiteralElem, DocContainer {
  parent?: ObjectLiteralExpression;
  kind: Syntax.ShorthandPropertyAssignment;
  name: Identifier;
  questionToken?: QuestionToken;
  exclamationToken?: ExclamationToken;
  equalsToken?: Token<Syntax.EqualsToken>;
  objectAssignmentIniter?: Expression;
}
export interface Signature {
  canonicalCache?: Signature;
  checker: TypeChecker;
  declaration?: SignatureDeclaration | DocSignature;
  erasedCache?: Signature;
  flags: qt.SignatureFlags;
  instantiations?: qu.QMap<Signature>;
  isolatedSignatureType?: ObjectType;
  mapper?: TypeMapper;
  minArgCount: number;
  optionalCallCache?: { inner?: Signature; outer?: Signature };
  params: readonly Symbol[];
  resolvedPredicate?: TypePredicate;
  resolvedReturn?: Type;
  target?: Signature;
  thisParam?: Symbol;
  typeParams?: readonly TypeParam[];
  unions?: Signature[];
}
export interface SignatureDecl extends NamedDecl, DocContainer {
  kind: SignatureDeclaration['kind'];
  name?: PropertyName;
  typeParams?: Nodes<TypeParamDeclaration>;
  params: Nodes<ParamDeclaration>;
  type?: Typing;
  typeArgs?: Nodes<Typing>;
}
export interface Stmt extends Nobj {
  _statementBrand: any;
}
export interface SourceFile extends Decl {
  additionalSyntacticDiagnostics?: readonly qd.DiagnosticWithLocation[];
  ambientModuleNames: readonly string[];
  amdDependencies: readonly AmdDependency[];
  bindDiagnostics: qd.DiagnosticWithLocation[];
  bindSuggestionDiagnostics?: qd.DiagnosticWithLocation[];
  checkJsDirective?: CheckJsDirective;
  classifiableNames?: qu.ReadonlyEscapedMap<true>;
  commentDirectives?: CommentDirective[];
  commonJsModuleIndicator?: Node;
  docDiagnostics?: qd.DiagnosticWithLocation[];
  endOfFileToken: Token<Syntax.EndOfFileToken>;
  exportedModulesFromDeclarationEmit?: ExportedModulesFromDeclarationEmit;
  externalModuleIndicator?: Node;
  fileName: string;
  hasNoDefaultLib: boolean;
  identifierCount: number;
  identifiers: qu.QMap<string>;
  imports: readonly StringLiteralLike[];
  isDeclarationFile: boolean;
  jsGlobalAugmentations?: SymbolTable;
  kind: Syntax.SourceFile;
  language: qy.Language;
  languageVersion: qt.ScriptTarget;
  libReferenceDirectives: readonly FileReference[];
  lineMap?: readonly number[];
  localJsxFactory?: EntityName;
  localJsxNamespace?: qu.__String;
  moduleAugmentations: readonly (StringLiteral | Identifier)[];
  moduleName?: string;
  nodeCount: number;
  originalFileName: string;
  parseDiagnostics: qd.DiagnosticWithLocation[];
  path: Path;
  patternAmbientModules?: PatternAmbientModule[];
  pragmas: ReadonlyPragmaMap;
  redirectInfo?: RedirectInfo;
  referencedFiles: readonly FileReference[];
  renamedDependencies?: qu.QReadonlyMap<string>;
  resolvedModules?: qu.QMap<ResolvedModuleFull | undefined>;
  resolvedPath: Path;
  resolvedTypeReferenceDirectiveNames: qu.QMap<ResolvedTypeReferenceDirective | undefined>;
  scriptKind: qt.Script;
  statements: Nodes<Statement>;
  symbolCount: number;
  text: string;
  typeReferenceDirectives: readonly FileReference[];
  version: string;
}
export interface SourceFileInfo {
  helpers?: string[];
  prologues?: SourceFilePrologueInfo[];
}
export interface SourceFileMayBeEmittedHost {
  getCompilerOpts(): CompilerOpts;
  isSourceFileFromExternalLibrary(file: SourceFile): boolean;
  getResolvedProjectReferenceToRedirect(fileName: string): ResolvedProjectReference | undefined;
  isSourceOfProjectReferenceRedirect(fileName: string): boolean;
}
export interface SourceFilePrologueDirective extends qu.Range {
  expression: SourceFilePrologueDirectiveExpression;
}
export interface SourceFilePrologueDirectiveExpression extends qu.Range {
  text: string;
}
export interface SourceFilePrologueInfo {
  directives: SourceFilePrologueDirective[];
  file: number;
  text: string;
}
export interface SourceMapEmitResult {
  inputSourceFileNames: readonly string[];
  sourceMap: RawSourceMap;
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
export interface SourceMapRange extends qu.Range {
  source?: SourceMapSource;
}
export interface SourceMapSource {
  fileName: string;
  text: string;
  lineMap: readonly number[];
  skipTrivia?: (pos: number) => number;
}
export interface SourceMapSpan {
  emittedColumn: number;
  emittedLine: number;
  nameIndex?: number;
  sourceColumn: number;
  sourceIndex: number;
  sourceLine: number;
}
export interface SpreadAssignment extends ObjectLiteralElem, DocContainer {
  kind: Syntax.SpreadAssignment;
  expression: Expression;
  parent?: ObjectLiteralExpression;
}
export interface SpreadElem extends Expr {
  kind: Syntax.SpreadElem;
  parent?: ArrayLiteralExpression | CallExpression | NewExpression;
  expression: Expression;
}
export interface StringLiteral extends LiteralExpr, Decl {
  kind: Syntax.StringLiteral;
  textSourceNode?: Identifier | StringLiteralLike | NumericLiteral;
  singleQuote?: boolean;
}
export interface StringLiteralType extends LiteralType {
  value: string;
}
export interface SubstitutionType extends InstantiableType {
  baseType: Type;
  substitute: Type;
}
export interface SuperCall extends CallExpression {
  expression: SuperExpression;
}
export interface SuperElemAccessExpression extends ElemAccessExpression {
  expression: SuperExpression;
}
export interface SuperExpression extends PrimaryExpr {
  kind: Syntax.SuperKeyword;
}
export interface SuperPropertyAccessExpression extends PropertyAccessExpression {
  expression: SuperExpression;
}
export interface SwitchStatement extends Stmt {
  kind: Syntax.SwitchStatement;
  expression: Expression;
  caseBlock: CaseBlock;
  possiblyExhaustive?: boolean;
}
export interface Symbol {
  assigned?: boolean;
  assignmentDeclarations?: qu.QMap<Declaration>;
  constEnumOnlyModule?: boolean;
  declarations?: Declaration[];
  escName: qu.__String;
  exports?: SymbolTable;
  exportSymbol?: Symbol;
  flags: qt.SymbolFlags;
  globalExports?: SymbolTable;
  id: number;
  links: SymbolLinks;
  members?: SymbolTable;
  mergeId?: number;
  parent?: Symbol;
  referred?: qt.SymbolFlags;
  replaceable?: boolean;
  valueDeclaration?: Declaration;
}
export interface SymbolAccessibilityResult extends SymbolVisibilityResult {
  errorModuleName?: string;
}
export interface SymbolDisplayPart {}
export interface SymbolLinks {
  bindingElem?: BindingElem;
  cjsExportMerged?: Symbol;
  constEnumReferenced?: boolean;
  containingType?: UnionOrIntersectionType;
  declaredType?: Type;
  deferralConstituents?: Type[];
  deferralParent?: Type;
  enumKind?: qt.EnumKind;
  exportsChecked?: boolean;
  exportsSomeValue?: boolean;
  extendedContainers?: Symbol[];
  extendedContainersByFile?: qu.QMap<Symbol[]>;
  immediateTarget?: Symbol;
  inferredClassSymbol?: qu.QMap<TransientSymbol>;
  instantiations?: qu.QMap<Type>;
  isConstructorDeclaredProperty?: boolean;
  isDeclarationWithCollidingName?: boolean;
  isDiscriminantProperty?: boolean;
  lateSymbol?: Symbol;
  leftSpread?: Symbol;
  mapper?: TypeMapper;
  nameType?: Type;
  originatingImport?: ImportDeclaration | ImportCall;
  outerTypeParams?: TypeParam[];
  referenced?: boolean;
  resolvedExports?: SymbolTable;
  resolvedMembers?: SymbolTable;
  rightSpread?: Symbol;
  specCache?: qu.QMap<string>;
  syntheticOrigin?: Symbol;
  target?: Symbol;
  tupleLabelDeclaration?: NamedTupleMember | ParamDeclaration;
  type?: Type;
  typeOnlyDeclaration?: TypeOnlyCompatibleAliasDeclaration | false;
  typeParams?: TypeParam[];
  typeParamsChecked?: boolean;
  uniqueESSymbolType?: Type;
  variances?: qt.VarianceFlags[];
}
export interface SymbolTable<S extends Symbol = Symbol> extends Map<qu.__String, S>, qu.EscapedMap<S> {}
export interface SymbolTracker {
  moduleResolverHost?: ModuleSpecifierResolutionHost & { getCommonSourceDirectory(): string };
  reportInaccessibleThisError?(): void;
  reportInaccessibleUniqueSymbolError?(): void;
  reportLikelyUnsafeImportRequiredError?(spec: string): void;
  reportNonlocalAugmentation?(s: SourceFile, parent: Symbol, augment: Symbol): void;
  reportPrivateInBaseOfClassExpression?(n: string): void;
  trackExternalModuleSymbolOfImportTyping?(s: Symbol): void;
  trackReferencedAmbientModule?(d: ModuleDeclaration, s: Symbol): void;
  trackSymbol?(s: Symbol, decl: Node | undefined, f: qt.SymbolFlags): void;
}
export interface SymbolVisibilityResult {
  accessibility: qt.SymbolAccessibility;
  aliasesToMakeVisible?: LateVisibilityPaintedStatement[];
  errorNode?: Node;
  errorSymbolName?: string;
}
export interface SymbolWalker {
  walkSymbol(root: Symbol): { visitedTypes: readonly Type[]; visitedSymbols: readonly Symbol[] };
  walkType(root: Type): { visitedTypes: readonly Type[]; visitedSymbols: readonly Symbol[] };
}
export interface SyntaxList extends Nobj {
  kind: Syntax.SyntaxList;
  children: Nobj[];
}
export interface SynthesizedComment extends CommentRange {
  text: string;
  pos: -1;
  end: -1;
  hasLeadingNewline?: boolean;
}
export interface SyntheticDefaultModuleType extends Type {
  syntheticType?: Type;
}
export interface SyntheticExpression extends Expr {
  kind: Syntax.SyntheticExpression;
  isSpread: boolean;
  type: Type;
  tupleNameSource?: ParamDeclaration | NamedTupleMember;
}
export interface SyntheticReferenceExpression extends LeftExpr {
  kind: Syntax.SyntheticReferenceExpression;
  expression: Expression;
  thisArg: Expression;
}
export interface TaggedTemplateExpression extends MemberExpr {
  kind: Syntax.TaggedTemplateExpression;
  tag: LeftExpression;
  typeArgs?: Nodes<Typing>;
  template: TemplateLiteral;
  questionDotToken?: QuestionDotToken;
}
export interface TemplateExpression extends PrimaryExpr {
  kind: Syntax.TemplateExpression;
  head: TemplateHead;
  templateSpans: Nodes<TemplateSpan>;
}
export interface TemplateHead extends TemplateLiteralLikeNode {
  kind: Syntax.TemplateHead;
  parent?: TemplateExpression;
  templateFlags?: qt.TokenFlags;
}
export interface TemplateLiteralLikeNode extends LiteralLikeNode {
  rawText?: string;
}
export interface TemplateMiddle extends TemplateLiteralLikeNode {
  kind: Syntax.TemplateMiddle;
  parent?: TemplateSpan;
  templateFlags?: qt.TokenFlags;
}
export interface TemplateSpan extends Nobj {
  kind: Syntax.TemplateSpan;
  parent?: TemplateExpression;
  expression: Expression;
  literal: TemplateMiddle | TemplateTail;
}
export interface TemplateTail extends TemplateLiteralLikeNode {
  kind: Syntax.TemplateTail;
  parent?: TemplateSpan;
  templateFlags?: qt.TokenFlags;
}
export interface ThisExpression extends PrimaryExpr, KeywordTyping {
  kind: Syntax.ThisKeyword;
}
export interface ThisTyping extends Tobj {
  kind: Syntax.ThisTyping;
}
export interface ThisTypePredicate extends TypePredicateBase {
  kind: qt.TypePredicateKind.This;
  paramName: undefined;
  paramIndex: undefined;
  type: Type;
}
export interface ThrowStatement extends Stmt {
  kind: Syntax.ThrowStatement;
  expression?: Expression;
}
export interface Token<T extends Syntax> extends Nobj {
  kind: T;
}
export interface TrafoContext {
  addDiagnostic(d: qd.DiagnosticWithLocation): void;
  addInitializationStatement(n: Statement): void;
  enableEmitNotification(k: Syntax): void;
  enableSubstitution(k: Syntax): void;
  endLexicalEnv(): Statement[] | undefined;
  getCompilerOpts(): CompilerOpts;
  getEmitHost(): EmitHost;
  getEmitResolver(): EmitResolver;
  getLexicalEnvFlags(): qt.LexicalEnvFlags;
  hoistFunctionDeclaration(n: FunctionDeclaration): void;
  hoistVariableDeclaration(n: Identifier): void;
  isEmitNotificationEnabled(n: Node): boolean;
  isSubstitutionEnabled(n: Node): boolean;
  onEmitNode: (h: qt.EmitHint, n: Node, cb: (h: qt.EmitHint, n: Node) => void) => void;
  onSubstituteNode: (h: qt.EmitHint, n: Node) => Node;
  readEmitHelpers(): EmitHelper[] | undefined;
  requestEmitHelper(h: EmitHelper): void;
  resumeLexicalEnv(): void;
  setLexicalEnvFlags(f: qt.LexicalEnvFlags, v: boolean): void;
  startLexicalEnv(): void;
  suspendLexicalEnv(): void;
}
export interface TransientIdentifier extends Identifier {
  resolvedSymbol: Symbol;
}
export interface TransientSymbol extends Symbol, SymbolLinks {
  checkFlags: qt.CheckFlags;
}
export interface TryStatement extends Stmt {
  kind: Syntax.TryStatement;
  tryBlock: Block;
  catchClause?: CatchClause;
  finallyBlock?: Block;
}
export interface TsConfigOnlyOption extends CommandLineOptionBase {
  type: 'object';
  elemOpts?: qu.QMap<CommandLineOption>;
  extraKeyDiagnostics?: DidYouMeanOptsDiagnostics;
}
export interface TsConfigSourceFile extends JsonSourceFile {
  extendedSourceFiles?: string[];
}
export interface TupleType extends GenericType {
  minLength: number;
  hasRestElem: boolean;
  readonly: boolean;
  labeledElemDeclarations?: readonly (NamedTupleMember | ParamDeclaration)[];
}
export interface TupleTyping extends Tobj {
  kind: Syntax.TupleTyping;
  elems: Nodes<Typing | NamedTupleMember>;
}
export interface TupleTypeReference extends TypeReference {
  target: TupleType;
}
export interface Type {
  aliasSymbol?: Symbol;
  aliasTypeArgs?: readonly Type[];
  aliasTypeArgsContainsMarker?: boolean;
  checker: TypeChecker;
  flags: qt.TypeFlags;
  id: number;
  immediateBaseConstraint?: Type;
  objectFlags: qt.ObjectFlags;
  pattern?: DestructuringPattern;
  permissive?: Type;
  restrictive?: Type;
  symbol?: Symbol;
  typeArgs?: readonly Type[];
  widened?: Type;
  isa(f: qt.TypeFlags): boolean;
  isobj(f: qt.ObjectFlags): boolean;
}
export interface TypeAcquisition {
  enableAutoDiscovery?: boolean;
  enable?: boolean;
  include?: string[];
  exclude?: string[];
  [option: string]: string[] | boolean | undefined;
}
export interface TypeAliasDeclaration extends DeclarationStmt, DocContainer {
  kind: Syntax.TypeAliasDeclaration;
  name: Identifier;
  typeParams?: Nodes<TypeParamDeclaration>;
  type: Typing;
}
export interface TypeAssertion extends UnaryExpr {
  kind: Syntax.TypeAssertionExpression;
  type: Typing;
  expression: UnaryExpression;
}
export interface CheckerGet {
  aliasedSymbol(s: Symbol): Symbol;
  indexTypeOfType(t: Type, k: qt.IndexKind): Type | undefined;
  returnTypeOfSignature(s: Signature): Type;
  typeArgs(r: TypeReference): readonly Type[];
  typeAtLocation(n: Node): Type;
}
export interface CheckerIs {}
export interface TypeChecker {
  get: CheckerGet;
  is: CheckerIs;
}
export interface TypeCheckerHost extends ModuleSpecifierResolutionHost {
  getCompilerOpts(): CompilerOpts;
  getSourceFiles(): readonly SourceFile[];
  getSourceFile(fileName: string): SourceFile | undefined;
  getResolvedTypeReferenceDirectives(): qu.QReadonlyMap<ResolvedTypeReferenceDirective | undefined>;
  getProjectReferenceRedirect(fileName: string): string | undefined;
  isSourceOfProjectReferenceRedirect(fileName: string): boolean;
  readonly redirectTargetsMap: RedirectTargetsMap;
}
export interface TypeElem extends NamedDecl {
  _typeElemBrand: any;
  name?: PropertyName;
  questionToken?: QuestionToken;
}
export interface TypingLiteral extends Tobj, Decl {
  kind: Syntax.TypingLiteral;
  members: Nodes<TypeElem>;
}
export interface TypeOfExpression extends UnaryExpr {
  kind: Syntax.TypeOfExpression;
  expression: UnaryExpression;
}
export interface TypingOperator extends Tobj {
  kind: Syntax.TypingOperator;
  operator: Syntax.KeyOfKeyword | Syntax.UniqueKeyword | Syntax.ReadonlyKeyword;
  type: Typing;
}
export interface TypeParam extends InstantiableType {
  constraint?: Type;
  default?: Type;
  target?: TypeParam;
  mapper?: TypeMapper;
  isThisType?: boolean;
  resolvedDefaultType?: Type;
}
export interface TypeParamDeclaration extends NamedDecl {
  kind: Syntax.TypeParam;
  parent?: DeclarationWithTypeParamChildren | InferTyping;
  name: Identifier;
  constraint?: Typing;
  default?: Typing;
  expression?: Expression;
}
export interface TypePredicateBase {
  kind: qt.TypePredicateKind;
  type?: Type;
}
export interface TypingPredicate extends Tobj {
  kind: Syntax.TypingPredicate;
  parent?: SignatureDeclaration | DocTypingExpression;
  assertsModifier?: AssertsToken;
  paramName: Identifier | ThisTyping;
  type?: Typing;
}
export interface TypingQuery extends Tobj {
  kind: Syntax.TypingQuery;
  exprName: EntityName;
}
export interface TypeReference extends ObjectType {
  target: GenericType;
  node?: TypingReference | ArrayTyping | TupleTyping;
  mapper?: TypeMapper;
  resolvedTypeArgs?: readonly Type[];
  literalType?: TypeReference;
}
export interface TypingReference extends WithArgsTobj {
  kind: Syntax.TypingReference;
  typeName: EntityName;
}
export interface Tobj extends Nobj {
  _typingBrand: any;
}
export interface UnaryExpr extends Expr {
  _unaryExpressionBrand: any;
}
export interface UnionOrIntersectionType extends Type {
  types: Type[];
  objectFlags: qt.ObjectFlags;
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
export interface UnionTyping extends Tobj {
  kind: Syntax.UnionTyping;
  types: Nodes<Typing>;
}
export interface UniqueESSymbolType extends Type {
  symbol: Symbol;
  escName: qu.__String;
}
export interface UniqueTypingOperator extends TypingOperator {
  operator: Syntax.UniqueKeyword;
}
export interface UnparsedPrepend extends UnparsedSection {
  kind: Syntax.UnparsedPrepend;
  data: string;
  parent?: UnparsedSource;
  texts: readonly UnparsedTextLike[];
}
export interface UnparsedPrologue extends UnparsedSection {
  kind: Syntax.UnparsedPrologue;
  data: string;
  parent?: UnparsedSource;
}
export interface UnparsedSection extends Nobj {
  kind: Syntax;
  data?: string;
  parent?: UnparsedSource;
}
export interface UnparsedSource extends Nobj {
  fileName: string;
  hasNoDefaultLib?: boolean;
  helpers?: readonly UnscopedEmitHelper[];
  kind: Syntax.UnparsedSource;
  libReferenceDirectives: readonly FileReference[];
  oldFileOfCurrentEmit?: boolean;
  parsedSourceMap?: RawSourceMap | false;
  prologues: readonly UnparsedPrologue[];
  referencedFiles: readonly FileReference[];
  sourceMapPath?: string;
  sourceMapText?: string;
  syntheticReferences?: readonly UnparsedSyntheticReference[];
  text: string;
  texts: readonly UnparsedSourceText[];
  typeReferenceDirectives?: readonly string[];
}
export interface UnparsedSyntheticReference extends UnparsedSection {
  kind: Syntax.UnparsedSyntheticReference;
  parent?: UnparsedSource;
  section: BundleFileHasNoDefaultLib | BundleFileReference;
}
export interface UnparsedTextLike extends UnparsedSection {
  kind: Syntax.UnparsedText | Syntax.UnparsedInternalText;
  parent?: UnparsedSource;
}
export interface UnscopedEmitHelper extends EmitHelper {
  readonly scoped: false;
  readonly importName?: string;
  readonly text: string;
}
export interface UpdateExpr extends UnaryExpr {
  _updateExpressionBrand: any;
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
export interface ValidImportTyping extends ImportTyping {
  arg: LiteralTyping & { literal: StringLiteral };
}
export interface VariableDeclaration extends NamedDecl {
  kind: Syntax.VariableDeclaration;
  parent?: VariableDeclarationList | CatchClause;
  name: BindingName;
  exclamationToken?: ExclamationToken;
  type?: Typing;
  initer?: Expression;
}
export interface VariableDeclarationList extends Nobj {
  kind: Syntax.VariableDeclarationList;
  parent?: VariableStatement | ForStatement | ForOfStatement | ForInStatement;
  declarations: Nodes<VariableDeclaration>;
}
export interface VariableStatement extends Stmt, DocContainer {
  kind: Syntax.VariableStatement;
  declarationList: VariableDeclarationList;
}
export interface VoidExpression extends UnaryExpr {
  kind: Syntax.VoidExpression;
  expression: UnaryExpression;
}
export interface WatchOpts {
  watchFile?: qt.WatchFileKind;
  watchDirectory?: qt.WatchDirectoryKind;
  fallbackPolling?: qt.PollingWatchKind;
  synchronousWatchDirectory?: boolean;
  [option: string]: CompilerOptsValue | undefined;
}
export interface WellKnownSymbolExpression extends PropertyAccessExpression {
  expression: Identifier & { escapedText: 'Symbol' };
  name: Identifier;
}
export interface WhileStatement extends IterationStmt {
  kind: Syntax.WhileStatement;
  expression: Expression;
}
export interface WideningContext {
  parent?: WideningContext;
  propertyName?: qu.__String;
  siblings?: Type[];
  resolvedProperties?: Symbol[];
}
export interface WithStatement extends Stmt {
  kind: Syntax.WithStatement;
  expression: Expression;
  statement: Statement;
}
export interface YieldExpression extends Expr {
  kind: Syntax.YieldExpression;
  asteriskToken?: AsteriskToken;
  expression?: Expression;
}
export namespace Range {
  export interface SourceMap extends qu.Range {
    source?: SourceMapSource;
  }
}
export type AccessExpression = PropertyAccessExpression | ElemAccessExpression;
export type AccessorDeclaration = GetAccessorDeclaration | SetAccessorDeclaration;
export type AdditiveOperator = Syntax.PlusToken | Syntax.MinusToken;
export type AdditiveOperatorOrHigher = MultiplicativeOperatorOrHigher | AdditiveOperator;
export type AnyImportOrReExport = AnyImportSyntax | ExportDeclaration;
export type AnyImportOrRequire = AnyImportSyntax | RequireVariableDeclaration;
export type AnyImportSyntax = ImportDeclaration | ImportEqualsDeclaration;
export type AnyValidImportOrReExport =
  | ((ImportDeclaration | ExportDeclaration) & { moduleSpecifier: StringLiteral })
  | (ImportEqualsDeclaration & { moduleReference: ExternalModuleReference & { expression: StringLiteral } })
  | RequireOrImportCall
  | ValidImportTyping;
export type ArrayBindingElem = BindingElem | OmittedExpression;
export type ArrayBindingOrAssignmentPattern = ArrayBindingPattern | ArrayLiteralExpression;
export type AssertionExpression = TypeAssertion | AsExpression;
export type AssertsToken = Token<Syntax.AssertsKeyword>;
export type AssignmentOperator = Syntax.EqualsToken | CompoundAssignmentOperator;
export type AssignmentOperatorOrHigher = Syntax.Question2Token | LogicalOperatorOrHigher | AssignmentOperator;
export type AssignmentOperatorToken = Token<AssignmentOperator>;
export type AssignmentPattern = ArrayLiteralExpression | ObjectLiteralExpression;
export type AsteriskToken = Token<Syntax.AsteriskToken>;
export type AwaitKeywordToken = Token<Syntax.AwaitKeyword>;
export type BaseType = ObjectType | IntersectionType | TypeVariable;
export type BinaryOperator = AssignmentOperatorOrHigher | Syntax.CommaToken;
export type BinaryOperatorToken = Token<BinaryOperator>;
export type BindableAccessExpression = PropertyAccessEntityNameExpression | BindableElemAccessExpression;
export type BindableElemAccessExpression = ElemAccessExpression & { expression: BindableStaticNameExpression };
export type BindableObjectDefinePropertyCall = CallExpression & { args: { 0: BindableStaticNameExpression; 1: StringLiteralLike | NumericLiteral; 2: ObjectLiteralExpression } };
export type BindableStaticAccessExpression = PropertyAccessEntityNameExpression | BindableStaticElemAccessExpression;
export type BindableStaticElemAccessExpression = LiteralLikeElemAccessExpression & { expression: BindableStaticNameExpression };
export type BindableStaticNameExpression = EntityNameExpression | BindableStaticElemAccessExpression;
export type BindingElemGrandparent = BindingElem['parent']['parent'];
export type BindingName = Identifier | BindingPattern;
export type BindingOrAssignmentElem =
  | ArrayLiteralExpression
  | AssignmentExpression<EqualsToken>
  | BindingElem
  | ElemAccessExpression
  | Identifier
  | ObjectLiteralExpression
  | OmittedExpression
  | ParamDeclaration
  | PropertyAccessExpression
  | PropertyAssignment
  | ShorthandPropertyAssignment
  | SpreadAssignment
  | SpreadElem
  | VariableDeclaration;
export type BindingOrAssignmentElemRestIndicator = Dot3Token | SpreadElem | SpreadAssignment;
export type BindingOrAssignmentElemTarget = BindingOrAssignmentPattern | Identifier | PropertyAccessExpression | ElemAccessExpression | OmittedExpression;
export type BindingOrAssignmentPattern = ObjectBindingOrAssignmentPattern | ArrayBindingOrAssignmentPattern;
export type BindingPattern = ArrayBindingPattern | ObjectBindingPattern;
export type BitwiseOperator = Syntax.AmpersandToken | Syntax.BarToken | Syntax.CaretToken;
export type BitwiseOperatorOrHigher = EqualityOperatorOrHigher | BitwiseOperator;
export type BlockLike = SourceFile | Block | ModuleBlock | CaseOrDefaultClause;
export type BreakOrContinueStatement = BreakStatement | ContinueStatement;
export type BundleFileSection = BundleFilePrologue | BundleFileEmitHelpers | BundleFileHasNoDefaultLib | BundleFileReference | BundleFilePrepend | BundleFileTextLike;
export type BundleFileTextLikeKind = qt.BundleFileSectionKind.Text | qt.BundleFileSectionKind.Internal;
export type CallLikeExpression = CallExpression | NewExpression | TaggedTemplateExpression | Decorator | JsxOpeningLikeElem;
export type CaseOrDefaultClause = CaseClause | DefaultClause;
export type ClassLikeDeclaration = ClassDeclaration | ClassExpression;
export type ColonToken = Token<Syntax.ColonToken>;
export type CommaToken = Token<Syntax.CommaToken>;
export type CommandLineOption = CommandLineOptionOfCustomType | CommandLineOptionOfPrimitiveType | TsConfigOnlyOption | CommandLineOptionOfListType;
export type CompilerOptsValue = string | number | boolean | (string | number)[] | string[] | qu.MapLike<string[]> | PluginImport[] | ProjectReference[] | null | undefined;
export type CompoundAssignmentOperator =
  | Syntax.AmpersandEqualsToken
  | Syntax.Asterisk2EqualsToken
  | Syntax.AsteriskEqualsToken
  | Syntax.BarEqualsToken
  | Syntax.CaretEqualsToken
  | Syntax.GreaterThan2EqualsToken
  | Syntax.GreaterThan3EqualsToken
  | Syntax.LessThan2EqualsToken
  | Syntax.MinusEqualsToken
  | Syntax.PlusEqualsToken
  | Syntax.SlashEqualsToken;
export type ConciseBody = FunctionBody | Expression;
export type CustomTransformerFactory = (context: TrafoContext) => CustomTransformer;
export type Declaration =
  | ArrowFunction
  | BinaryExpression
  | BindingElem
  | CallExpression
  | CallSignatureDeclaration
  | ClassDeclaration
  | ClassExpression
  | ConstructorDeclaration
  | ConstructorTyping
  | ConstructSignatureDeclaration
  | DocCallbackTag
  | DocEnumTag
  | DocFunctionTyping
  | DocParamTag
  | DocPropertyTag
  | DocSignature
  | DocTypedefTag
  | EnumDeclaration
  | EnumMember
  | ExportAssignment
  | ExportDeclaration
  | ExportSpecifier
  | FunctionDeclaration
  | FunctionExpression
  | FunctionTyping
  | GetAccessorDeclaration
  | Identifier
  | ImportClause
  | ImportEqualsDeclaration
  | ImportSpecifier
  | IndexSignatureDeclaration
  | InterfaceDeclaration
  | JsxAttributes
  | MappedTyping
  | MethodDeclaration
  | MethodSignature
  | MissingDeclaration
  | ModuleDeclaration
  | NamedTupleMember
  | NamespaceExportDeclaration
  | NamespaceImport
  | NewExpression
  | NoSubstitutionLiteral
  | NumericLiteral
  | ObjectLiteralExpression
  | ParamDeclaration
  | PropertyAccessExpression
  | PropertyDeclaration
  | PropertySignature
  | SemicolonClassElem
  | SetAccessorDeclaration
  | SourceFile
  | StringLiteral
  | TypeAliasDeclaration
  | TypingLiteral
  | TypeParamDeclaration
  | VariableDeclaration;
export type DeclarationName = Identifier | PrivateIdentifier | StringLiteralLike | NumericLiteral | ComputedPropertyName | ElemAccessExpression | BindingPattern | EntityNameExpression;
export type DeclarationWithTypeParamChildren = SignatureDeclaration | ClassLikeDeclaration | InterfaceDeclaration | TypeAliasDeclaration | DocTemplateTag;
export type DeclarationWithTypeParams = DeclarationWithTypeParamChildren | DocTypedefTag | DocCallbackTag | DocSignature;
export type DestructuringAssignment = ObjectDestructuringAssignment | ArrayDestructuringAssignment;
export type DestructuringPattern = BindingPattern | ObjectLiteralExpression | ArrayLiteralExpression;
export type DocNamespaceBody = Identifier | DocNamespaceDeclaration;
export type DocTypeReferencingNode = DocVariadicTyping | DocOptionalTyping | DocNullableTyping | DocNonNullableTyping;
export type DocTyping =
  | DocAllTyping
  | DocFunctionTyping
  | DocNamepathTyping
  | DocNonNullableTyping
  | DocNullableTyping
  | DocOptionalTyping
  | DocSignature
  | DocTypingLiteral
  | DocUnknownTyping
  | DocVariadicTyping;
export type Dot3Token = Token<Syntax.Dot3Token>;
export type DotToken = Token<Syntax.DotToken>;
export type EmitHelperUniqueNameCallback = (name: string) => string;
export type EndOfFileToken = Token<Syntax.EndOfFileToken> & DocContainer;
export type EntityName = Identifier | QualifiedName;
export type EntityNameExpression = Identifier | PropertyAccessEntityNameExpression;
export type EntityNameOrEntityNameExpression = EntityName | EntityNameExpression;
export type EqualityOperator = Syntax.Equals2Token | Syntax.Equals3Token | Syntax.ExclamationEquals2Token | Syntax.ExclamationEqualsToken;
export type EqualityOperatorOrHigher = RelationalOperatorOrHigher | EqualityOperator;
export type EqualsGreaterThanToken = Token<Syntax.EqualsGreaterThanToken>;
export type EqualsToken = Token<Syntax.EqualsToken>;
export type ErrorCallback = (m: qd.Message, length: number) => void;
export type ExclamationToken = Token<Syntax.ExclamationToken>;
export type ExponentiationOperator = Syntax.Asterisk2Token;
export type ExportedModulesFromDeclarationEmit = readonly Symbol[];
export type Expression =
  | ArrowFunction
  | AsExpression
  | AwaitExpression
  | BinaryExpression
  | CommaListExpression
  | ConditionalExpression
  | DeleteExpression
  | JsxClosingFragment
  | JsxExpression
  | JsxOpeningElem
  | JsxOpeningFragment
  | OmittedExpression
  | SpreadElem
  | SyntheticExpression
  | TypeAssertion
  | TypeOfExpression
  | UnaryExpression
  | VoidExpression
  | YieldExpression;
export type FlowNode = FlowStart | FlowLabel | FlowAssignment | FlowCall | FlowCondition | FlowSwitchClause | FlowArrayMutation | FlowCall | FlowReduceLabel;
export type FlowType = Type | IncompleteType;
export type ForIniter = VariableDeclarationList | Expression;
export type ForInOrOfStatement = ForInStatement | ForOfStatement;
export type FreshableType = LiteralType | FreshableIntrinsicType;
export type FunctionBody = Block;
export type FunctionLikeDeclaration = FunctionDeclaration | MethodDeclaration | GetAccessorDeclaration | SetAccessorDeclaration | ConstructorDeclaration | FunctionExpression | ArrowFunction;
export type FunctionOrConstructorTyping = FunctionTyping | ConstructorTyping;
export type HasDoc =
  | AccessorDeclaration
  | ArrowFunction
  | CallSignatureDeclaration
  | ClassLikeDeclaration
  | ConstructorDeclaration
  | ConstructorTyping
  | ConstructSignatureDeclaration
  | DocFunctionTyping
  | EndOfFileToken
  | EnumDeclaration
  | EnumMember
  | ExportDeclaration
  | ExpressionStatement
  | FunctionDeclaration
  | FunctionExpression
  | FunctionTyping
  | ImportEqualsDeclaration
  | IndexSignatureDeclaration
  | InterfaceDeclaration
  | LabeledStatement
  | MethodDeclaration
  | MethodSignature
  | ModuleDeclaration
  | NamedTupleMember
  | ParamDeclaration
  | ParenthesizedExpression
  | PropertyAssignment
  | PropertyDeclaration
  | PropertySignature
  | ShorthandPropertyAssignment
  | SpreadAssignment
  | TypeAliasDeclaration
  | VariableStatement;
export type HasExpressionIniter = VariableDeclaration | ParamDeclaration | BindingElem | PropertySignature | PropertyDeclaration | PropertyAssignment | EnumMember;
export type HasIniter = HasExpressionIniter | ForStatement | ForInStatement | ForOfStatement | JsxAttribute;
export type HasInvalidatedResolution = (sourceFile: Path) => boolean;
export type HasType =
  | AssertionExpression
  | DocNonNullableTyping
  | DocNullableTyping
  | DocOptionalTyping
  | DocTypingExpression
  | DocVariadicTyping
  | MappedTyping
  | ParamDeclaration
  | ParenthesizedTyping
  | PropertyDeclaration
  | PropertySignature
  | SignatureDeclaration
  | TypeAliasDeclaration
  | TypingOperator
  | TypingPredicate
  | VariableDeclaration;
export type HasTypeArgs = CallExpression | NewExpression | TaggedTemplateExpression | JsxOpeningElem | JsxSelfClosingElem;
export type ImportOrExportSpecifier = ImportSpecifier | ExportSpecifier;
export type JsxAttributeLike = JsxAttribute | JsxSpreadAttribute;
export type JsxChild = JsxText | JsxExpression | JsxElem | JsxSelfClosingElem | JsxFragment;
export type JsxOpeningLikeElem = JsxSelfClosingElem | JsxOpeningElem;
export type JsxTagNameExpression = Identifier | ThisExpression | JsxTagNamePropertyAccess;
export type LateVisibilityPaintedStatement =
  | AnyImportSyntax
  | ClassDeclaration
  | EnumDeclaration
  | FunctionDeclaration
  | InterfaceDeclaration
  | ModuleDeclaration
  | TypeAliasDeclaration
  | VariableStatement;
export type LeftExpression = CallExpression | MemberExpression | NonNullExpression | PartiallyEmittedExpression | SyntheticReferenceExpression;
export type LiteralExpression = BigIntLiteral | NoSubstitutionLiteral | NumericLiteral | RegexLiteral | StringLiteral;
export type LiteralImportTyping = ImportTyping & { arg: LiteralTyping & { literal: StringLiteral } };
export type LiteralLikeElemAccessExpression = ElemAccessExpression & Declaration & { argExpression: StringLiteralLike | NumericLiteral | WellKnownSymbolExpression };
export type LogicalOperator = Syntax.Ampersand2Token | Syntax.Bar2Token;
export type LogicalOperatorOrHigher = BitwiseOperatorOrHigher | LogicalOperator;
export type MatchingKeys<TRecord, TMatch, K extends keyof TRecord = keyof TRecord> = K extends (TRecord[K] extends TMatch ? K : never) ? K : never;
export type MemberExpression = ElemAccessExpression | PrimaryExpression | PropertyAccessExpression | TaggedTemplateExpression;
export type MinusToken = Token<Syntax.MinusToken>;
export type Modifier =
  | Token<Syntax.AbstractKeyword>
  | Token<Syntax.AsyncKeyword>
  | Token<Syntax.ConstKeyword>
  | Token<Syntax.DeclareKeyword>
  | Token<Syntax.DefaultKeyword>
  | Token<Syntax.ExportKeyword>
  | Token<Syntax.PublicKeyword>
  | Token<Syntax.PrivateKeyword>
  | Token<Syntax.ProtectedKeyword>
  | Token<Syntax.ReadonlyKeyword>
  | Token<Syntax.StaticKeyword>;
export type Modifiers = Nodes<Modifier>;
export type ModuleBody = NamespaceBody | DocNamespaceBody;
export type ModuleName = Identifier | StringLiteral;
export type ModuleReference = EntityName | ExternalModuleReference;
export type MultiplicativeOperator = Syntax.AsteriskToken | Syntax.SlashToken | Syntax.PercentToken;
export type MultiplicativeOperatorOrHigher = ExponentiationOperator | MultiplicativeOperator;
export type MutableNodes<T extends Nobj> = Nodes<T> & T[];
export type NamedExportBindings = NamespaceExport | NamedExports;
export type NamedImportBindings = NamespaceImport | NamedImports;
export type NamedImportsOrExports = NamedImports | NamedExports;
export type NamespaceBody = ModuleBlock | NamespaceDeclaration;
export type Node =
  | ArrayBindingPattern
  | ArrayLiteralExpression
  | ArrayTyping
  | ArrowFunction
  | AsExpression
  | AssertsToken
  | AssignmentOperatorToken
  | AsteriskToken
  | AwaitExpression
  | AwaitKeywordToken
  | BigIntLiteral
  | BinaryExpression
  | BinaryOperatorToken
  | BindingElem
  | Block
  | BooleanLiteral
  | BreakStatement
  | Bundle
  | CallExpression
  | CallSignatureDeclaration
  | CaseBlock
  | CaseClause
  | CatchClause
  | ClassDeclaration
  | ClassExpression
  | ColonToken
  | CommaListExpression
  | ComputedPropertyName
  | ConditionalExpression
  | ConditionalTyping
  | ConstructorDeclaration
  | ConstructorTyping
  | ConstructSignatureDeclaration
  | ContinueStatement
  | DebuggerStatement
  | Declaration
  | Decorator
  | DefaultClause
  | DeleteExpression
  | Doc
  | DocAllTyping
  | DocAugmentsTag
  | DocAuthorTag
  | DocCallbackTag
  | DocClassTag
  | DocEnumTag
  | DocFunctionTyping
  | DocImplementsTag
  | DocNamepathTyping
  | DocNonNullableTyping
  | DocNullableTyping
  | DocOptionalTyping
  | DocParamTag
  | DocPrivateTag
  | DocPropertyTag
  | DocProtectedTag
  | DocPublicTag
  | DocReadonlyTag
  | DocReturnTag
  | DocSignature
  | DocTemplateTag
  | DocThisTag
  | DocTypedefTag
  | DocTypingExpression
  | DocTypingLiteral
  | DocTypeTag
  | DocUnknownTag
  | DocUnknownTyping
  | DocVariadicTyping
  | DoStatement
  | Dot3Token
  | DotToken
  | ElemAccessExpression
  | EmptyStatement
  | EndOfDeclarationMarker
  | EndOfFileToken
  | EnumDeclaration
  | EnumMember
  | EqualsGreaterThanToken
  | EqualsToken
  | ExclamationToken
  | ExportAssignment
  | ExportDeclaration
  | ExportSpecifier
  | Expression
  | ExpressionStatement
  | ExpressionWithTypings
  | ExternalModuleReference
  | ForInStatement
  | ForOfStatement
  | ForStatement
  | FunctionDeclaration
  | FunctionExpression
  | FunctionLikeDeclaration
  | FunctionTyping
  | GetAccessorDeclaration
  | HeritageClause
  | Identifier
  | IfStatement
  | ImportClause
  | ImportDeclaration
  | ImportEqualsDeclaration
  | ImportExpression
  | ImportSpecifier
  | ImportTyping
  | IndexedAccessTyping
  | IndexSignatureDeclaration
  | InferTyping
  | InputFiles
  | InterfaceDeclaration
  | IntersectionTyping
  | JsxAttribute
  | JsxAttributes
  | JsxClosingElem
  | JsxClosingFragment
  | JsxElem
  | JsxExpression
  | JsxFragment
  | JsxOpeningElem
  | JsxOpeningFragment
  | JsxSelfClosingElem
  | JsxSpreadAttribute
  | JsxText
  | KeywordTyping
  | LabeledStatement
  | LiteralTyping
  | MappedTyping
  | MergeDeclarationMarker
  | MetaProperty
  | MethodDeclaration
  | MethodSignature
  | MinusToken
  | MissingDeclaration
  | Modifier
  | ModuleBlock
  | ModuleDeclaration
  | NamedExports
  | NamedImports
  | NamedTupleMember
  | NamespaceExport
  | NamespaceExportDeclaration
  | NamespaceImport
  | NewExpression
  | NonNullExpression
  | NoSubstitutionLiteral
  | NotEmittedStatement
  | NumericLiteral
  | ObjectBindingPattern
  | ObjectLiteralExpression
  | OmittedExpression
  | OptionalTyping
  | ParamDeclaration
  | ParenthesizedExpression
  | ParenthesizedTyping
  | PartiallyEmittedExpression
  | PlusToken
  | PostfixUnaryExpression
  | PrefixUnaryExpression
  | PrivateIdentifier
  | PropertyAccessExpression
  | PropertyAssignment
  | PropertyDeclaration
  | PropertySignature
  | QualifiedName
  | QuestionDotToken
  | QuestionToken
  | ReadonlyToken
  | RegexLiteral
  | RestTyping
  | ReturnStatement
  | SemicolonClassElem
  | SetAccessorDeclaration
  | ShorthandPropertyAssignment
  | SourceFile
  | SpreadAssignment
  | SpreadElem
  | Statement
  | StringLiteral
  | SuperExpression
  | SwitchStatement
  | SyntaxList
  | SyntheticExpression
  | SyntheticReferenceExpression
  | TaggedTemplateExpression
  | TemplateExpression
  | TemplateHead
  | TemplateMiddle
  | TemplateSpan
  | TemplateTail
  | ThisTyping
  | ThrowStatement
  | TryStatement
  | TupleTyping
  | TypeAliasDeclaration
  | TypeAssertion
  | TypingLiteral
  | TypeOfExpression
  | TypingOperator
  | TypeParamDeclaration
  | TypingPredicate
  | TypingQuery
  | TypingReference
  | UnionTyping
  | UniqueTypingOperator
  | UnparsedPrepend
  | UnparsedPrologue
  | UnparsedSource
  | UnparsedSyntheticReference
  | UnparsedTextLike
  | VariableDeclaration
  | VariableDeclarationList
  | VariableStatement
  | VoidExpression
  | WhileStatement
  | WithStatement
  | YieldExpression;
export type NodeWithPossibleHoistedDeclaration =
  | Block
  | CaseBlock
  | CaseClause
  | CatchClause
  | DefaultClause
  | DoStatement
  | ForInStatement
  | ForOfStatement
  | ForStatement
  | IfStatement
  | LabeledStatement
  | SwitchStatement
  | TryStatement
  | VariableStatement
  | WhileStatement
  | WithStatement;
export type ObjectBindingOrAssignmentPattern = ObjectBindingPattern | ObjectLiteralExpression;
export type ObjectFlagsType = NullableType | ObjectType | UnionType | IntersectionType;
export type ObjectLiteralElemLike = PropertyAssignment | ShorthandPropertyAssignment | SpreadAssignment | MethodDeclaration | AccessorDeclaration;
export type ObjectTypeDeclaration = ClassLikeDeclaration | InterfaceDeclaration | TypingLiteral;
export type OptionalChain = PropertyAccessChain | ElemAccessChain | CallChain | NonNullChain;
export type OptionalChainRoot = PropertyAccessChainRoot | ElemAccessChainRoot | CallChainRoot;
export type OuterExpression = ParenthesizedExpression | TypeAssertion | AsExpression | NonNullExpression | PartiallyEmittedExpression;
export type ParamPropertyDeclaration = ParamDeclaration & { parent?: ConstructorDeclaration; name: Identifier };
export type Path = string & { __pathBrand: any };
export type PlusToken = Token<Syntax.PlusToken>;
export type PostfixUnaryOperator = Syntax.Plus2Token | Syntax.Minus2Token;
export type PragmaPseudoMap = { [K in keyof ConcretePragmaSpecs]: { args: PragmaArgType<K>; range: CommentRange } };
export type PragmaPseudoMapEntry = { [K in keyof PragmaPseudoMap]: { name: K; args: PragmaPseudoMap[K] } }[keyof PragmaPseudoMap];
export type PrefixUnaryOperator = Syntax.Plus2Token | Syntax.Minus2Token | Syntax.PlusToken | Syntax.MinusToken | Syntax.TildeToken | Syntax.ExclamationToken;
export type PrimaryExpression =
  | ArrayLiteralExpression
  | BooleanLiteral
  | ClassExpression
  | FunctionExpression
  | Identifier
  | ImportExpression
  | JsxAttributes
  | JsxElem
  | JsxFragment
  | JsxSelfClosingElem
  | LiteralExpression
  | MetaProperty
  | NewExpression
  | NullLiteral
  | ObjectLiteralExpression
  | ParenthesizedExpression
  | SuperExpression
  | TemplateExpression
  | ThisExpression;
export type PropertyName = Identifier | StringLiteral | NumericLiteral | ComputedPropertyName | PrivateIdentifier;
export type PropertyNameLiteral = Identifier | StringLiteralLike | NumericLiteral;
export type QuestionDotToken = Token<Syntax.QuestionDotToken>;
export type QuestionToken = Token<Syntax.QuestionToken>;
export type ReadonlyToken = Token<Syntax.ReadonlyKeyword>;
export type RedirectTargetsMap = qu.QReadonlyMap<readonly string[]>;
export type RelationalOperator = Syntax.LessThanToken | Syntax.LessThanEqualsToken | Syntax.GreaterThanToken | Syntax.GreaterThanEqualsToken | Syntax.InstanceOfKeyword | Syntax.InKeyword;
export type RelationalOperatorOrHigher = ShiftOperatorOrHigher | RelationalOperator;
export type RequireOrImportCall = CallExpression & { expression: Identifier; args: [StringLiteralLike] };
export type RequireResult<T = {}> = { module: T; modulePath?: string; error: undefined } | { module: undefined; modulePath?: undefined; error: { stack?: string; message?: string } };
export type ResolvedConfigFileName = string & { _isResolvedConfigFileName: never };
export type ShiftOperator = Syntax.LessThan2Token | Syntax.GreaterThan2Token | Syntax.GreaterThan3Token;
export type ShiftOperatorOrHigher = AdditiveOperatorOrHigher | ShiftOperator;
export type SignatureDeclaration =
  | AccessorDeclaration
  | ArrowFunction
  | CallSignatureDeclaration
  | ConstructorDeclaration
  | ConstructorTyping
  | ConstructSignatureDeclaration
  | DocFunctionTyping
  | FunctionDeclaration
  | FunctionExpression
  | FunctionTyping
  | IndexSignatureDeclaration
  | MethodDeclaration
  | MethodSignature;
export type SourceOfProjectReferenceRedirect = string | true;
export type Statement =
  | Block
  | BreakStatement
  | ClassDeclaration
  | ContinueStatement
  | DebuggerStatement
  | DoStatement
  | EmptyStatement
  | EndOfDeclarationMarker
  | EnumDeclaration
  | ExportAssignment
  | ExportDeclaration
  | ExpressionStatement
  | ForInStatement
  | ForOfStatement
  | ForStatement
  | FunctionDeclaration
  | IfStatement
  | ImportDeclaration
  | ImportEqualsDeclaration
  | InterfaceDeclaration
  | LabeledStatement
  | MergeDeclarationMarker
  | MissingDeclaration
  | ModuleBlock
  | ModuleDeclaration
  | NamespaceExportDeclaration
  | NotEmittedStatement
  | ReturnStatement
  | SwitchStatement
  | ThrowStatement
  | TryStatement
  | TypeAliasDeclaration
  | VariableStatement
  | WhileStatement
  | WithStatement;
export type StringLiteralLike = StringLiteral | NoSubstitutionLiteral;
export type StructuredType = ObjectType | UnionType | IntersectionType;
export type SuperProperty = SuperPropertyAccessExpression | SuperElemAccessExpression;
export type TemplateLiteral = TemplateExpression | NoSubstitutionLiteral;
export type TemplateLiteralToken = NoSubstitutionLiteral | TemplateHead | TemplateMiddle | TemplateTail;
export type Transformer<T extends Node> = (node: T) => T;
export type TransformerFactory<T extends Node> = (c: TrafoContext) => Transformer<T>;
export type TypeComparer = (s: Type, t: Type, reportErrors?: boolean) => qt.Ternary;
export type TypeMapper =
  | { kind: qt.TypeMapKind.Array; sources: readonly Type[]; targets: readonly Type[] | undefined }
  | { kind: qt.TypeMapKind.Composite | qt.TypeMapKind.Merged; mapper1: TypeMapper; mapper2: TypeMapper }
  | { kind: qt.TypeMapKind.Function; func: (t: Type) => Type }
  | { kind: qt.TypeMapKind.Simple; source: Type; target: Type };
export type TypeOfTag = 'undefined' | 'number' | 'boolean' | 'string' | 'symbol' | 'object' | 'function';
export type TypeOnlyCompatibleAliasDeclaration = ImportClause | NamespaceImport | ImportOrExportSpecifier;
export type TypePredicate = ThisTypePredicate | IdentifierTypePredicate | AssertsThisTypePredicate | AssertsIdentifierTypePredicate;
export type TypeReferenceType = TypingReference | ExpressionWithTypings;
export type TypeVariable = TypeParam | IndexedAccessType;
export type Typing =
  | ArrayTyping
  | BooleanLiteral
  | ConditionalTyping
  | ConstructorTyping
  | DocTyping
  | DocTypingExpression
  | ExpressionWithTypings
  | FunctionTyping
  | ImportTyping
  | IndexedAccessTyping
  | InferTyping
  | IntersectionTyping
  | KeywordTyping
  | LiteralTyping
  | MappedTyping
  | NamedTupleMember
  | NullLiteral
  | OptionalTyping
  | ParenthesizedTyping
  | RestTyping
  | ThisTyping
  | TupleTyping
  | TypingLiteral
  | TypingOperator
  | TypingPredicate
  | TypingQuery
  | TypingReference
  | UnionTyping;
export type UnaryExpression = AwaitExpression | DeleteExpression | TypeAssertion | TypeOfExpression | UpdateExpression | VoidExpression;
export type UnionOrIntersectionTyping = UnionTyping | IntersectionTyping;
export type UniqueNameHandler = (baseName: string, checkFn?: (name: string) => boolean, optimistic?: boolean) => string;
export type UnparsedNode = UnparsedPrologue | UnparsedSourceText | UnparsedSyntheticReference;
export type UnparsedSourceText = UnparsedPrepend | UnparsedTextLike;
export type UpdateExpression = PostfixUnaryExpression | PrefixUnaryExpression | LeftExpression;
export type ValueSignatureDeclaration = FunctionDeclaration | MethodDeclaration | ConstructorDeclaration | AccessorDeclaration | FunctionExpression;
export type VariableLikeDeclaration =
  | BindingElem
  | DocParamTag
  | DocPropertyTag
  | EnumMember
  | JsxAttribute
  | ParamDeclaration
  | PropertyAssignment
  | PropertyDeclaration
  | PropertySignature
  | ShorthandPropertyAssignment
  | VariableDeclaration;
export type Visitor<T extends Node = Node> = (n?: Node) => VisitResult<T>;
export type Visitors<T extends Node = Node> = (ns?: Nodes) => VisitResult<T>;
export type VisitResult<T extends Node> = T | T[] | undefined;
export type WriteFileCallback = (fileName: string, data: string, writeByteOrderMark: boolean, onError?: (message: string) => void, sourceFiles?: readonly SourceFile[]) => void;
export type xJsFileExtensionInfo = FileExtensionInfo;
interface PragmaArgSpecification<TName extends string> {
  name: TName;
  optional?: boolean;
  captureSpan?: boolean;
}
interface SymbolWriter extends SymbolTracker {
  writeKeyword(text: string): void;
  writeOperator(text: string): void;
  writePunctuation(text: string): void;
  writeSpace(text: string): void;
  writeStringLiteral(text: string): void;
  writeParam(text: string): void;
  writeProperty(text: string): void;
  writeSymbol(text: string, symbol: Symbol): void;
  writeLine(force?: boolean): void;
  increaseIndent(): void;
  decreaseIndent(): void;
  clear(): void;
}
type ArgDefinitionToFieldUnion<T extends readonly PragmaArgSpecification<any>[]> = {
  [K in keyof T]: PragmaArgTypeOptional<T[K], T[K] extends { name: infer TName } ? (TName extends string ? TName : never) : never>;
}[Extract<keyof T, number>];
type ConcretePragmaSpecs = typeof qt.commentPragmas;
type PragmaArgTypeMaybeCapture<TDesc> = TDesc extends { captureSpan: true } ? { value: string; pos: number; end: number } : string;
type PragmaArgTypeOptional<TDesc, TName extends string> = TDesc extends { optional: true } ? { [K in TName]?: PragmaArgTypeMaybeCapture<TDesc> } : { [K in TName]: PragmaArgTypeMaybeCapture<TDesc> };
type PragmaArgType<KPrag extends keyof ConcretePragmaSpecs> = ConcretePragmaSpecs[KPrag] extends { args: readonly PragmaArgSpecification<any>[] }
  ? UnionToIntersection<ArgDefinitionToFieldUnion<ConcretePragmaSpecs[KPrag]['args']>>
  : never;
type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (k: infer I) => void ? I : never;
