namespace core {
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
  export interface ArrayDestructuringAssignment extends AssignmentExpression<EqualsToken> {
    left: ArrayLiteralExpression;
  }
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
  export interface BigIntLiteralType extends LiteralType {
    value: PseudoBigInt;
  }
  export interface BindablePropertyAssignmentExpression extends BinaryExpression {
    left: BindableAccessExpression;
  }
  export interface BindableStaticPropertyAssignmentExpression extends BinaryExpression {
    left: BindableStaticAccessExpression;
  }
  export interface BooleanLiteral extends PrimaryExpression, TypeNode {
    kind: Syntax.TrueKeyword | Syntax.FalseKeyword;
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
  export interface ClassDeclaration extends ClassLikeDeclarationBase, DeclarationStatement {
    kind: Syntax.ClassDeclaration;
    name?: Identifier;
  }
  export interface ClassExpression extends ClassLikeDeclarationBase, PrimaryExpression {
    kind: Syntax.ClassExpression;
  }
  export interface ClassLikeDeclarationBase extends NamedDeclaration, JSDocContainer {
    kind: Syntax.ClassDeclaration | Syntax.ClassExpression;
    name?: Identifier;
    typeParameters?: Nodes<TypeParameterDeclaration>;
    heritageClauses?: Nodes<HeritageClause>;
    members: Nodes<ClassElement>;
  }
  export type ClassLikeDeclaration = ClassDeclaration | ClassExpression;
  export interface CommaListExpression extends Expression {
    kind: Syntax.CommaListExpression;
    elements: Nodes<Expression>;
  }
  export interface ComputedPropertyName extends Node {
    kind: Syntax.ComputedPropertyName;
    parent: Declaration;
    expression: Expression;
  }
  export interface ConditionalExpression extends Expression {
    kind: Syntax.ConditionalExpression;
    condition: Expression;
    questionToken: QuestionToken;
    whenTrue: Expression;
    colonToken: ColonToken;
    whenFalse: Expression;
  }
  export interface ConditionalTypeNode extends TypeNode {
    kind: Syntax.ConditionalType;
    checkType: TypeNode;
    extendsType: TypeNode;
    trueType: TypeNode;
    falseType: TypeNode;
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
  export interface ExternalModuleReference extends Node {
    kind: Syntax.ExternalModuleReference;
    parent: ImportEqualsDeclaration;
    expression: Expression;
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
  export type ForInitializer = VariableDeclarationList | Expression;
  export type ForInOrOfStatement = ForInStatement | ForOfStatement;
  export interface ForInStatement extends IterationStatement {
    kind: Syntax.ForInStatement;
    initializer: ForInitializer;
    expression: Expression;
  }
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
  export type FunctionOrConstructorTypeNode = FunctionTypeNode | ConstructorTypeNode;
  export interface FunctionOrConstructorTypeNodeBase extends TypeNode, SignatureDeclarationBase {
    kind: Syntax.FunctionType | Syntax.ConstructorType;
    type: TypeNode;
  }
  export interface FunctionTypeNode extends FunctionOrConstructorTypeNodeBase {
    kind: Syntax.FunctionType;
  }
  export interface GetAccessorDeclaration extends FunctionLikeDeclarationBase, ClassElement, ObjectLiteralElement, JSDocContainer {
    kind: Syntax.GetAccessor;
    parent: ClassLikeDeclaration | ObjectLiteralExpression;
    name: PropertyName;
    body?: FunctionBody;
  }
  export interface HeritageClause extends Node {
    kind: Syntax.HeritageClause;
    parent: InterfaceDeclaration | ClassLikeDeclaration;
    token: Syntax.ExtendsKeyword | Syntax.ImplementsKeyword;
    types: Nodes<ExpressionWithTypeArguments>;
  }
  export interface IfStatement extends Statement {
    kind: Syntax.IfStatement;
    expression: Expression;
    thenStatement: Statement;
    elseStatement?: Statement;
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
  export interface ImportEqualsDeclaration extends DeclarationStatement, JSDocContainer {
    kind: Syntax.ImportEqualsDeclaration;
    parent: SourceFile | ModuleBlock;
    name: Identifier;
    moduleReference: ModuleReference;
  }
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
  export interface IndexedAccessTypeNode extends TypeNode {
    kind: Syntax.IndexedAccessType;
    objectType: TypeNode;
    indexType: TypeNode;
  }
  export interface IndexSignatureDeclaration extends SignatureDeclarationBase, ClassElement, TypeElement {
    kind: Syntax.IndexSignature;
    parent: ObjectTypeDeclaration;
  }
  export interface InferTypeNode extends TypeNode {
    kind: Syntax.InferType;
    typeParameter: TypeParameterDeclaration;
  }
  export interface InterfaceDeclaration extends DeclarationStatement, JSDocContainer {
    kind: Syntax.InterfaceDeclaration;
    name: Identifier;
    typeParameters?: Nodes<TypeParameterDeclaration>;
    heritageClauses?: Nodes<HeritageClause>;
    members: Nodes<TypeElement>;
  }
  export interface IntersectionTypeNode extends TypeNode {
    kind: Syntax.IntersectionType;
    types: Nodes<TypeNode>;
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
  export interface JSDocPropertyTag extends JSDocPropertyLikeTag {
    kind: Syntax.JSDocPropertyTag;
  }
  export interface JSDocPropertyLikeTag extends JSDocTag, Declaration {
    parent: JSDoc;
    name: EntityName;
    typeExpression?: JSDocTypeExpression;
    isNameFirst: boolean;
    isBracketed: boolean;
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
  export type JSDocSyntax =
    | Syntax.EndOfFileToken
    | Syntax.WhitespaceTrivia
    | Syntax.AtToken
    | Syntax.NewLineTrivia
    | Syntax.AsteriskToken
    | Syntax.OpenBraceToken
    | Syntax.CloseBraceToken
    | Syntax.LessThanToken
    | Syntax.GreaterThanToken
    | Syntax.OpenBracketToken
    | Syntax.CloseBracketToken
    | Syntax.EqualsToken
    | Syntax.CommaToken
    | Syntax.DotToken
    | Syntax.Identifier
    | Syntax.BacktickToken
    | Syntax.Unknown
    | KeywordSyntax;
  export interface JSDocTag extends Node {
    parent: JSDoc | JSDocTypeLiteral;
    tagName: Identifier;
    comment?: string;
  }
  export interface JSDocTemplateTag extends JSDocTag {
    kind: Syntax.JSDocTemplateTag;
    constraint: JSDocTypeExpression | undefined;
    typeParameters: Nodes<TypeParameterDeclaration>;
  }
  export interface JSDocThisTag extends JSDocTag {
    kind: Syntax.JSDocThisTag;
    typeExpression?: JSDocTypeExpression;
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
  export interface JSDocTypeTag extends JSDocTag {
    kind: Syntax.JSDocTypeTag;
    typeExpression: JSDocTypeExpression;
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
  export interface JsxAttributes extends ObjectLiteralExpressionBase<JsxAttributeLike> {
    kind: Syntax.JsxAttributes;
    parent: JsxOpeningLikeElement;
  }
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
  export interface JsxText extends LiteralLikeNode {
    kind: Syntax.JsxText;
    onlyTriviaWhitespaces: boolean;
    parent: JsxElement;
  }
  export type KeywordSyntax =
    | Syntax.AbstractKeyword
    | Syntax.AnyKeyword
    | Syntax.AsKeyword
    | Syntax.AssertsKeyword
    | Syntax.BigIntKeyword
    | Syntax.BooleanKeyword
    | Syntax.BreakKeyword
    | Syntax.CaseKeyword
    | Syntax.CatchKeyword
    | Syntax.ClassKeyword
    | Syntax.ContinueKeyword
    | Syntax.ConstKeyword
    | Syntax.ConstructorKeyword
    | Syntax.DebuggerKeyword
    | Syntax.DeclareKeyword
    | Syntax.DefaultKeyword
    | Syntax.DeleteKeyword
    | Syntax.DoKeyword
    | Syntax.ElseKeyword
    | Syntax.EnumKeyword
    | Syntax.ExportKeyword
    | Syntax.ExtendsKeyword
    | Syntax.FalseKeyword
    | Syntax.FinallyKeyword
    | Syntax.ForKeyword
    | Syntax.FromKeyword
    | Syntax.FunctionKeyword
    | Syntax.GetKeyword
    | Syntax.IfKeyword
    | Syntax.ImplementsKeyword
    | Syntax.ImportKeyword
    | Syntax.InKeyword
    | Syntax.InferKeyword
    | Syntax.InstanceOfKeyword
    | Syntax.InterfaceKeyword
    | Syntax.IsKeyword
    | Syntax.KeyOfKeyword
    | Syntax.LetKeyword
    | Syntax.ModuleKeyword
    | Syntax.NamespaceKeyword
    | Syntax.NeverKeyword
    | Syntax.NewKeyword
    | Syntax.NullKeyword
    | Syntax.NumberKeyword
    | Syntax.ObjectKeyword
    | Syntax.PackageKeyword
    | Syntax.PrivateKeyword
    | Syntax.ProtectedKeyword
    | Syntax.PublicKeyword
    | Syntax.ReadonlyKeyword
    | Syntax.RequireKeyword
    | Syntax.GlobalKeyword
    | Syntax.ReturnKeyword
    | Syntax.SetKeyword
    | Syntax.StaticKeyword
    | Syntax.StringKeyword
    | Syntax.SuperKeyword
    | Syntax.SwitchKeyword
    | Syntax.SymbolKeyword
    | Syntax.ThisKeyword
    | Syntax.ThrowKeyword
    | Syntax.TrueKeyword
    | Syntax.TryKeyword
    | Syntax.TypeKeyword
    | Syntax.TypeOfKeyword
    | Syntax.UndefinedKeyword
    | Syntax.UniqueKeyword
    | Syntax.UnknownKeyword
    | Syntax.VarKeyword
    | Syntax.VoidKeyword
    | Syntax.WhileKeyword
    | Syntax.WithKeyword
    | Syntax.YieldKeyword
    | Syntax.AsyncKeyword
    | Syntax.AwaitKeyword
    | Syntax.OfKeyword;
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
  export interface LabeledStatement extends Statement, JSDocContainer {
    kind: Syntax.LabeledStatement;
    label: Identifier;
    statement: Statement;
  }
  export interface LiteralTypeNode extends TypeNode {
    kind: Syntax.LiteralType;
    literal: BooleanLiteral | LiteralExpression | PrefixUnaryExpression;
  }
  export interface MappedTypeNode extends TypeNode, Declaration {
    kind: Syntax.MappedType;
    readonlyToken?: ReadonlyToken | PlusToken | MinusToken;
    typeParameter: TypeParameterDeclaration;
    questionToken?: QuestionToken | PlusToken | MinusToken;
    type?: TypeNode;
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
  export type Modifiers = Nodes<Modifier>;
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
  export const enum NodeFlags {
    None = 0,
    Let = 1 << 0, // Variable declaration
    Const = 1 << 1, // Variable declaration
    NestedNamespace = 1 << 2, // Namespace declaration
    Synthesized = 1 << 3, // Node was synthesized during transformation
    Namespace = 1 << 4, // Namespace declaration
    OptionalChain = 1 << 5, // Chained MemberExpression rooted to a pseudo-OptionalExpression
    ExportContext = 1 << 6, // Export context (initialized by binding)
    ContainsThis = 1 << 7, // Interface contains references to "this"
    HasImplicitReturn = 1 << 8, // If function implicitly returns on one of codepaths (initialized by binding)
    HasExplicitReturn = 1 << 9, // If function has explicit reachable return on one of codepaths (initialized by binding)
    GlobalAugmentation = 1 << 10, // Set if module declaration is an augmentation for the global scope
    HasAsyncFunctions = 1 << 11, // If the file has async functions (initialized by binding)
    DisallowInContext = 1 << 12, // If node was parsed in a context where 'in-expressions' are not allowed
    YieldContext = 1 << 13, // If node was parsed in the 'yield' context created when parsing a generator
    DecoratorContext = 1 << 14, // If node was parsed as part of a decorator
    AwaitContext = 1 << 15, // If node was parsed in the 'await' context created when parsing an async function
    ThisNodeHasError = 1 << 16, // If the parser encountered an error when parsing the code that created this node
    JavaScriptFile = 1 << 17, // If node was parsed in a JavaScript
    ThisNodeOrAnySubNodesHasError = 1 << 18, // If this node or any of its children had an error
    HasAggregatedChildData = 1 << 19, // If we've computed data from children and cached it in this node
    PossiblyContainsDynamicImport = 1 << 20,
    PossiblyContainsImportMeta = 1 << 21,
    JSDoc = 1 << 22, // If node was parsed inside jsdoc
    Ambient = 1 << 23, // If node was inside an ambient context -- a declaration file, or inside something with the `declare` modifier.
    InWithStatement = 1 << 24, // If any ancestor of node was the `statement` of a WithStatement (not the `expression`)
    JsonFile = 1 << 25, // If node was parsed in a Json
    TypeCached = 1 << 26, // If a type was cached for node at any point
    BlockScoped = Let | Const,
    ReachabilityCheckFlags = HasImplicitReturn | HasExplicitReturn,
    ReachabilityAndEmitFlags = ReachabilityCheckFlags | HasAsyncFunctions,
    ContextFlags = DisallowInContext | YieldContext | DecoratorContext | AwaitContext | JavaScriptFile | InWithStatement | Ambient,
    TypeExcludesFlags = YieldContext | AwaitContext,
    PermanentlySetIncrementalFlags = PossiblyContainsDynamicImport | PossiblyContainsImportMeta,
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
  export interface ObjectBindingPattern extends Node {
    kind: Syntax.ObjectBindingPattern;
    parent: VariableDeclaration | ParameterDeclaration | BindingElement;
    elements: Nodes<BindingElement>;
  }
  export interface ObjectLiteralExpressionBase<T extends ObjectLiteralElement> extends PrimaryExpression, Declaration {
    properties: Nodes<T>;
  }
  export interface ObjectLiteralExpression extends ObjectLiteralExpressionBase<ObjectLiteralElementLike> {
    kind: Syntax.ObjectLiteralExpression;
    multiLine?: boolean;
  }
  export interface OmittedExpression extends Expression {
    kind: Syntax.OmittedExpression;
  }
  export interface OptionalTypeNode extends TypeNode {
    kind: Syntax.OptionalType;
    type: TypeNode;
  }
  export const enum OuterExpressionKinds {
    Parentheses = 1 << 0,
    TypeAssertions = 1 << 1,
    NonNullAssertions = 1 << 2,
    PartiallyEmittedExpressions = 1 << 3,
    Assertions = TypeAssertions | NonNullAssertions,
    All = Parentheses | Assertions | PartiallyEmittedExpressions,
  }
  export type OuterExpression = ParenthesizedExpression | TypeAssertion | AsExpression | NonNullExpression | PartiallyEmittedExpression;
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
  export interface PostfixUnaryExpression extends UpdateExpression {
    kind: Syntax.PostfixUnaryExpression;
    operand: LeftHandSideExpression;
    operator: PostfixUnaryOperator;
  }
  export interface PrefixUnaryExpression extends UpdateExpression {
    kind: Syntax.PrefixUnaryExpression;
    operator: PrefixUnaryOperator;
    operand: UnaryExpression;
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
  export interface PropertySignature extends TypeElement, JSDocContainer {
    kind: Syntax.PropertySignature;
    name: PropertyName;
    questionToken?: QuestionToken;
    type?: TypeNode;
    initializer?: Expression;
  }
  export interface QualifiedName extends Node {
    kind: Syntax.QualifiedName;
    left: EntityName;
    right: Identifier;
    jsdocDotPos?: number;
  }
  export interface RegexLiteral extends LiteralExpression {
    kind: Syntax.RegexLiteral;
  }
  export interface RestTypeNode extends TypeNode {
    kind: Syntax.RestType;
    type: TypeNode;
  }
  export interface ReturnStatement extends Statement {
    kind: Syntax.ReturnStatement;
    expression?: Expression;
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
  export interface ShorthandPropertyAssignment extends ObjectLiteralElement, JSDocContainer {
    parent: ObjectLiteralExpression;
    kind: Syntax.ShorthandPropertyAssignment;
    name: Identifier;
    questionToken?: QuestionToken;
    exclamationToken?: ExclamationToken;
    equalsToken?: Token<Syntax.EqualsToken>;
    objectAssignmentInitializer?: Expression;
  }
  export type SignatureDeclaration =
    | CallSignatureDeclaration
    | ConstructSignatureDeclaration
    | MethodSignature
    | IndexSignatureDeclaration
    | FunctionTypeNode
    | ConstructorTypeNode
    | JSDocFunctionType
    | FunctionDeclaration
    | MethodDeclaration
    | ConstructorDeclaration
    | AccessorDeclaration
    | FunctionExpression
    | ArrowFunction;
  export interface SpreadElement extends Expression {
    kind: Syntax.SpreadElement;
    parent: ArrayLiteralExpression | CallExpression | NewExpression;
    expression: Expression;
  }
  export interface SpreadAssignment extends ObjectLiteralElement, JSDocContainer {
    parent: ObjectLiteralExpression;
    kind: Syntax.SpreadAssignment;
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
  export interface SwitchStatement extends Statement {
    kind: Syntax.SwitchStatement;
    expression: Expression;
    caseBlock: CaseBlock;
    possiblyExhaustive?: boolean;
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
  export interface SyntaxList extends Node {
    _children: Node[];
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
  export interface TypeAcquisition {
    enableAutoDiscovery?: boolean;
    enable?: boolean;
    include?: string[];
    exclude?: string[];
    [option: string]: string[] | boolean | undefined;
  }
  export interface TypeAliasDeclaration extends DeclarationStatement, JSDocContainer {
    kind: Syntax.TypeAliasDeclaration;
    name: Identifier;
    typeParameters?: Nodes<TypeParameterDeclaration>;
    type: TypeNode;
  }
  export interface TypeAssertion extends UnaryExpression {
    kind: Syntax.TypeAssertionExpression;
    type: TypeNode;
    expression: UnaryExpression;
  }
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
    typeToTypeNode(type: Type, enclosingDeclaration: Node | undefined, flags: NodeBuilderFlags | undefined, tracker?: SymbolTracker): TypeNode | undefined; // eslint-disable-line @typescript-eslint/unified-signatures
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
    ): (SignatureDeclaration & { typeArguments?: Nodes<TypeNode> }) | undefined; // eslint-disable-line @typescript-eslint/unified-signatures
    indexInfoToIndexSignatureDeclaration(indexInfo: IndexInfo, kind: IndexKind, enclosingDeclaration: Node | undefined, flags: NodeBuilderFlags | undefined): IndexSignatureDeclaration | undefined;
    indexInfoToIndexSignatureDeclaration(
      indexInfo: IndexInfo,
      kind: IndexKind,
      enclosingDeclaration: Node | undefined,
      flags: NodeBuilderFlags | undefined,
      tracker?: SymbolTracker
    ): IndexSignatureDeclaration | undefined; // eslint-disable-line @typescript-eslint/unified-signatures
    /** Note that the resulting nodes cannot be checked. */
    symbolToEntityName(symbol: Symbol, meaning: SymbolFlags, enclosingDeclaration: Node | undefined, flags: NodeBuilderFlags | undefined): EntityName | undefined;
    /** Note that the resulting nodes cannot be checked. */
    symbolToExpression(symbol: Symbol, meaning: SymbolFlags, enclosingDeclaration: Node | undefined, flags: NodeBuilderFlags | undefined): Expression | undefined;
    /** Note that the resulting nodes cannot be checked. */
    symbolToTypeParameterDeclarations(symbol: Symbol, enclosingDeclaration: Node | undefined, flags: NodeBuilderFlags | undefined): Nodes<TypeParameterDeclaration> | undefined;
    /** Note that the resulting nodes cannot be checked. */
    symbolToParameterDeclaration(symbol: Symbol, enclosingDeclaration: Node | undefined, flags: NodeBuilderFlags | undefined): ParameterDeclaration | undefined;
    /** Note that the resulting nodes cannot be checked. */
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
    symbolToString(symbol: Symbol, enclosingDeclaration?: Node, meaning?: SymbolFlags, flags?: SymbolFormatFlags): string;
    typePredicateToString(predicate: TypePredicate, enclosingDeclaration?: Node, flags?: TypeFormatFlags): string;
    writeSignature(signature: Signature, enclosingDeclaration?: Node, flags?: TypeFormatFlags, kind?: SignatureKind, writer?: EmitTextWriter): string;
    writeType(type: Type, enclosingDeclaration?: Node, flags?: TypeFormatFlags, writer?: EmitTextWriter): string;
    writeSymbol(symbol: Symbol, enclosingDeclaration?: Node, meaning?: SymbolFlags, flags?: SymbolFormatFlags, writer?: EmitTextWriter): string;
    writeTypePredicate(predicate: TypePredicate, enclosingDeclaration?: Node, flags?: TypeFormatFlags, writer?: EmitTextWriter): string;
    getFullyQualifiedName(symbol: Symbol): string;
    getAugmentedPropertiesOfType(type: Type): Symbol[];
    getRootSymbols(symbol: Symbol): readonly Symbol[];
    getContextualType(node: Expression): Type | undefined;
    getContextualType(node: Expression, contextFlags?: ContextFlags): Type | undefined; // eslint-disable-line @typescript-eslint/unified-signatures
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
    /** Exclude accesses to private properties or methods with a `this` parameter that `type` doesn't satisfy. */
    isValidPropertyAccessForCompletions(node: PropertyAccessExpression | ImportTypeNode | QualifiedName, type: Type, property: Symbol): boolean;
    /** Follow all aliases to get the original symbol. */
    getAliasedSymbol(symbol: Symbol): Symbol;
    /** Follow a *single* alias to get the immediately aliased symbol. */
    getImmediateAliasedSymbol(symbol: Symbol): Symbol | undefined;
    getExportsOfModule(moduleSymbol: Symbol): Symbol[];
    /** Unlike `getExportsOfModule`, this includes properties of an `export =` value. */
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
    // qpx new QSymbol(flags: SymbolFlags, name: __String): TransientSymbol;
    createIndexInfo(type: Type, isReadonly: boolean, declaration?: SignatureDeclaration): IndexInfo;
    isSymbolAccessible(symbol: Symbol, enclosingDeclaration: Node | undefined, meaning: SymbolFlags, shouldComputeAliasToMarkVisible: boolean): SymbolAccessibilityResult;
    tryFindAmbientModuleWithoutAugmentations(moduleName: string): Symbol | undefined;
    getSymbolWalker(accept?: (symbol: Symbol) => boolean): SymbolWalker;
    // Should not be called directly.  Should only be accessed through the Program instance.
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
    /**
     * An external module with an 'export =' declaration resolves to the target of the 'export =' declaration,
     * and an external module with no 'export =' declaration resolves to the module itself.
     */
    resolveExternalModuleSymbol(symbol: Symbol): Symbol;
    /** @param node A location where we might consider accessing `this`. Not necessarily a ThisExpression. */
    tryGetThisTypeAt(node: Node, includeGlobalThis?: boolean): Type | undefined;
    getTypeArgumentConstraint(node: TypeNode): Type | undefined;
    /**
     * Does *not* get *all* suggestion diagnostics, just the ones that were convenient to report in the checker.
     * Others are added in computeSuggestionDiagnostics.
     */
    getSuggestionDiagnostics(file: SourceFile, cancellationToken?: CancellationToken): readonly DiagnosticWithLocation[];
    /**
     * Depending on the operation performed, it may be appropriate to throw away the checker
     * if the cancellation token is triggered. Typically, if it is used for error checking
     * and the operation is cancelled, then it should be discarded, otherwise it is safe to keep.
     */
    runWithCancellationToken<T>(token: CancellationToken, cb: (checker: TypeChecker) => T): T;
    getLocalTypeParametersOfClassOrInterfaceOrTypeAlias(symbol: Symbol): readonly TypeParameter[] | undefined;
    isDeclarationVisible(node: Declaration | AnyImportSyntax): boolean;
  }
  export interface TypeCheckerHost extends ModuleSpecifierResolutionHost {
    getCompilerOptions(): CompilerOptions;
    getSourceFiles(): readonly SourceFile[];
    getSourceFile(fileName: string): SourceFile | undefined;
    getResolvedTypeReferenceDirectives(): QReadonlyMap<ResolvedTypeReferenceDirective | undefined>;
    getProjectReferenceRedirect(fileName: string): string | undefined;
    isSourceOfProjectReferenceRedirect(fileName: string): boolean;
    readonly redirectTargetsMap: RedirectTargetsMap;
  }
  export type TypeComparer = (s: Type, t: Type, reportErrors?: boolean) => Ternary;
  export interface TypeElement extends NamedDeclaration {
    _typeElementBrand: any;
    name?: PropertyName;
    questionToken?: QuestionToken;
  }
  export const enum TypeFormatFlags {
    None = 0,
    NoTruncation = 1 << 0, // Don't truncate typeToString result
    WriteArrayAsGenericType = 1 << 1, // Write Array<T> instead T[]
    // hole because there's a hole in node builder flags
    UseStructuralFallback = 1 << 3, // When an alias cannot be named by its symbol, rather than report an error, fallback to a structural printout if possible
    // hole because there's a hole in node builder flags
    WriteTypeArgumentsOfSignature = 1 << 5, // Write the type arguments instead of type parameters of the signature
    UseFullyQualifiedType = 1 << 6, // Write out the fully qualified type name (eg. Module.Type, instead of Type)
    // hole because `UseOnlyExternalAliasing` is here in node builder flags, but functions which take old flags use `SymbolFormatFlags` instead
    SuppressAnyReturnType = 1 << 8, // If the return type is any-like, don't offer a return type.
    // hole because `WriteTypeParametersInQualifiedName` is here in node builder flags, but functions which take old flags use `SymbolFormatFlags` for this instead
    MultilineObjectLiterals = 1 << 10, // Always print object literals across multiple lines (only used to map into node builder flags)
    WriteClassExpressionAsTypeLiteral = 1 << 11, // Write a type literal instead of (Anonymous class)
    UseTypeOfFunction = 1 << 12, // Write typeof instead of function type literal
    OmitParameterModifiers = 1 << 13, // Omit modifiers on parameters
    UseAliasDefinedOutsideCurrentScope = 1 << 14, // For a `type T = ... ` defined in a different file, write `T` instead of its value, even though `T` can't be accessed in the current scope.
    UseSingleQuotesForStringLiteralType = 1 << 28, // Use single quotes for string literal type
    NoTypeReduction = 1 << 29, // Don't call getReducedType
    // Error Handling
    AllowUniqueESSymbolType = 1 << 20, // This is bit 20 to align with the same bit in `NodeBuilderFlags`
    // TypeFormatFlags exclusive
    AddUndefined = 1 << 17, // Add undefined to types of initialized, non-optional parameters
    WriteArrowStyleSignature = 1 << 18, // Write arrow style signature
    // State
    InArrayType = 1 << 19, // Writing an array element type
    InElementType = 1 << 21, // Writing an array or union element type
    InFirstTypeArgument = 1 << 22, // Writing first type argument of the instantiated type
    InTypeAlias = 1 << 23, // Writing type in type alias declaration
    /** @deprecated */ WriteOwnNameForAnyLike = 0, // Does nothing
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
  export interface TypeLiteralNode extends TypeNode, Declaration {
    kind: Syntax.TypeLiteral;
    members: Nodes<TypeElement>;
  }
  export const enum TypeMapKind {
    Simple,
    Array,
    Function,
    Composite,
    Merged,
  }
  export type TypeMapper =
    | { kind: TypeMapKind.Simple; source: Type; target: Type }
    | { kind: TypeMapKind.Array; sources: readonly Type[]; targets: readonly Type[] | undefined }
    | { kind: TypeMapKind.Function; func: (t: Type) => Type }
    | { kind: TypeMapKind.Composite | TypeMapKind.Merged; mapper1: TypeMapper; mapper2: TypeMapper };
  export interface TypeNode extends Node {
    _typeNodeBrand: any;
  }
  export interface TypeOfExpression extends UnaryExpression {
    kind: Syntax.TypeOfExpression;
    expression: UnaryExpression;
  }
  export type TypeOfTag = 'undefined' | 'number' | 'boolean' | 'string' | 'symbol' | 'object' | 'function';
  export type TypeOnlyCompatibleAliasDeclaration = ImportClause | NamespaceImport | ImportOrExportSpecifier;
  export interface TypeOperatorNode extends TypeNode {
    kind: Syntax.TypeOperator;
    operator: Syntax.KeyOfKeyword | Syntax.UniqueKeyword | Syntax.ReadonlyKeyword;
    type: TypeNode;
  }
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
  export type TypeVariable = TypeParameter | IndexedAccessType;
  export interface UnionTypeNode extends TypeNode {
    kind: Syntax.UnionType;
    types: Nodes<TypeNode>;
  }
  export type UnparsedNode = UnparsedPrologue | UnparsedSourceText | UnparsedSyntheticReference;
  export interface UnparsedPrepend extends UnparsedSection {
    kind: Syntax.UnparsedPrepend;
    data: string;
    parent: UnparsedSource;
    texts: readonly UnparsedTextLike[];
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
    lineAndCharOf(pos: number): LineAndChar;
  }
  export interface UnparsedSyntheticReference extends UnparsedSection {
    kind: Syntax.UnparsedSyntheticReference;
    parent: UnparsedSource;
    section: BundleFileHasNoDefaultLib | BundleFileReference;
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
  export interface VariableStatement extends Statement, JSDocContainer {
    kind: Syntax.VariableStatement;
    declarationList: VariableDeclarationList;
  }
  export interface VoidExpression extends UnaryExpression {
    kind: Syntax.VoidExpression;
    expression: UnaryExpression;
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
  // qpx
  export interface SymbolTable<S extends Symbol = Symbol> extends Map<__String, S>, UnderscoreEscapedMap<S> {}
  export type DotToken = Token<Syntax.DotToken>;
  export type Dot3Token = Token<Syntax.Dot3Token>;
  export type QuestionToken = Token<Syntax.QuestionToken>;
  export type QuestionDotToken = Token<Syntax.QuestionDotToken>;
  export type ExclamationToken = Token<Syntax.ExclamationToken>;
  export type ColonToken = Token<Syntax.ColonToken>;
  export type EqualsToken = Token<Syntax.EqualsToken>;
  export type AsteriskToken = Token<Syntax.AsteriskToken>;
  export type EqualsGreaterThanToken = Token<Syntax.EqualsGreaterThanToken>;
  export type EndOfFileToken = Token<Syntax.EndOfFileToken> & JSDocContainer;
  export type ReadonlyToken = Token<Syntax.ReadonlyKeyword>;
  export type AwaitKeywordToken = Token<Syntax.AwaitKeyword>;
  export type PlusToken = Token<Syntax.PlusToken>;
  export type MinusToken = Token<Syntax.MinusToken>;
  export type AssertsToken = Token<Syntax.AssertsKeyword>;

  export type Path = string & { __pathBrand: any };
  export type MatchingKeys<TRecord, TMatch, K extends keyof TRecord = keyof TRecord> = K extends (TRecord[K] extends TMatch ? K : never) ? K : never;
  export interface TextRange {
    pos: number;
    end: number;
  }
  export type JsxTokenSyntax =
    | Syntax.LessThanSlashToken
    | Syntax.EndOfFileToken
    | Syntax.ConflictMarkerTrivia
    | Syntax.JsxText
    | Syntax.JsxTextAllWhiteSpaces
    | Syntax.OpenBraceToken
    | Syntax.LessThanToken;
  export const enum RelationComparisonResult {
    Succeeded = 1 << 0, // Should be truthy
    Failed = 1 << 1,
    Reported = 1 << 2,
    ReportsUnmeasurable = 1 << 3,
    ReportsUnreliable = 1 << 4,
    ReportsMask = ReportsUnmeasurable | ReportsUnreliable,
  }
  export interface JSDocContainer {
    jsDoc?: JSDoc[];
    jsDocCache?: readonly JSDocTag[];
  }
  export type HasJSDoc =
    | ParameterDeclaration
    | CallSignatureDeclaration
    | ConstructSignatureDeclaration
    | MethodSignature
    | PropertySignature
    | ArrowFunction
    | ParenthesizedExpression
    | SpreadAssignment
    | ShorthandPropertyAssignment
    | PropertyAssignment
    | FunctionExpression
    | LabeledStatement
    | ExpressionStatement
    | VariableStatement
    | FunctionDeclaration
    | ConstructorDeclaration
    | MethodDeclaration
    | PropertyDeclaration
    | AccessorDeclaration
    | ClassLikeDeclaration
    | InterfaceDeclaration
    | TypeAliasDeclaration
    | EnumMember
    | EnumDeclaration
    | ModuleDeclaration
    | ImportEqualsDeclaration
    | IndexSignatureDeclaration
    | FunctionTypeNode
    | ConstructorTypeNode
    | JSDocFunctionType
    | ExportDeclaration
    | NamedTupleMember
    | EndOfFileToken;
  export type HasType =
    | SignatureDeclaration
    | VariableDeclaration
    | ParameterDeclaration
    | PropertySignature
    | PropertyDeclaration
    | TypePredicateNode
    | ParenthesizedTypeNode
    | TypeOperatorNode
    | MappedTypeNode
    | AssertionExpression
    | TypeAliasDeclaration
    | JSDocTypeExpression
    | JSDocNonNullableType
    | JSDocNullableType
    | JSDocOptionalType
    | JSDocVariadicType;
  export type HasExpressionInitializer = VariableDeclaration | ParameterDeclaration | BindingElement | PropertySignature | PropertyDeclaration | PropertyAssignment | EnumMember;
  export type HasInitializer = HasExpressionInitializer | ForStatement | ForInStatement | ForOfStatement | JsxAttribute;
  export type HasTypeArguments = CallExpression | NewExpression | TaggedTemplateExpression | JsxOpeningElement | JsxSelfClosingElement;
  export const enum GeneratedIdentifierFlags {
    // Kinds
    None = 0, // Not automatically generated.
    Auto = 1, // Automatically generated identifier.
    Loop = 2, // Automatically generated identifier with a preference for '_i'.
    Unique = 3, // Unique name based on the 'text' property.
    Node = 4, // Unique name based on the node in the 'original' property.
    KindMask = 7, // Mask to extract the kind of identifier from its flags.
    // Flags
    ReservedInNestedScopes = 1 << 3, // Reserve the generated name in nested scopes
    Optimistic = 1 << 4, // First instance won't use '_#' if there's no conflict
    FileLevel = 1 << 5, // Use only the file identifiers list and not generated names to search for conflicts
  }
  export interface TransientIdentifier extends Identifier {
    resolvedSymbol: Symbol;
  }
  export interface GeneratedIdentifier extends Identifier {
    autoGenerateFlags: GeneratedIdentifierFlags;
  }
  export type EntityName = Identifier | QualifiedName;
  export type PropertyName = Identifier | StringLiteral | NumericLiteral | ComputedPropertyName | PrivateIdentifier;
  export type DeclarationName = Identifier | PrivateIdentifier | StringLiteralLike | NumericLiteral | ComputedPropertyName | ElementAccessExpression | BindingPattern | EntityNameExpression;
  export interface DynamicNamedBinaryExpression extends BinaryExpression {
    left: ElementAccessExpression;
  }
  export interface DynamicNamedDeclaration extends NamedDeclaration {
    name: ComputedPropertyName;
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
  export interface DeclarationStatement extends NamedDeclaration, Statement {
    name?: Identifier | StringLiteral | NumericLiteral;
  }
  export type BindingElementGrandparent = BindingElement['parent']['parent'];
  export type BindingName = Identifier | BindingPattern;
  export interface PrivateIdentifierPropertyDeclaration extends PropertyDeclaration {
    name: PrivateIdentifier;
  }
  export interface PropertyLikeDeclaration extends NamedDeclaration {
    name: PropertyName;
  }
  export interface ObjectLiteralElement extends NamedDeclaration {
    _objectLiteralBrand: any;
    name?: PropertyName;
  }
  export type ObjectLiteralElementLike = PropertyAssignment | ShorthandPropertyAssignment | SpreadAssignment | MethodDeclaration | AccessorDeclaration;
  export type VariableLikeDeclaration =
    | VariableDeclaration
    | ParameterDeclaration
    | BindingElement
    | PropertyDeclaration
    | PropertyAssignment
    | PropertySignature
    | JsxAttribute
    | ShorthandPropertyAssignment
    | EnumMember
    | JSDocPropertyTag
    | JSDocParameterTag;
  export type AccessorDeclaration = GetAccessorDeclaration | SetAccessorDeclaration;
  export type LiteralImportTypeNode = ImportTypeNode & { argument: LiteralTypeNode & { literal: StringLiteral } };
  export interface NodeWithTypeArguments extends TypeNode {
    typeArguments?: Nodes<TypeNode>;
  }
  export type UnionOrIntersectionTypeNode = UnionTypeNode | IntersectionTypeNode;
  export interface UniqueTypeOperatorNode extends TypeOperatorNode {
    operator: Syntax.UniqueKeyword;
  }
  export type StringLiteralLike = StringLiteral | NoSubstitutionLiteral;
  export interface UnaryExpression extends Expression {
    _unaryExpressionBrand: any;
  }
  export interface UpdateExpression extends UnaryExpression {
    _updateExpressionBrand: any;
  }
  export type PrefixUnaryOperator = Syntax.Plus2Token | Syntax.Minus2Token | Syntax.PlusToken | Syntax.MinusToken | Syntax.TildeToken | Syntax.ExclamationToken;
  export type PostfixUnaryOperator = Syntax.Plus2Token | Syntax.Minus2Token;
  export interface LeftHandSideExpression extends UpdateExpression {
    _leftHandSideExpressionBrand: any;
  }
  export interface MemberExpression extends LeftHandSideExpression {
    _memberExpressionBrand: any;
  }
  export interface PrimaryExpression extends MemberExpression {
    _primaryExpressionBrand: any;
  }
  export interface NullLiteral extends PrimaryExpression, TypeNode {
    kind: Syntax.NullKeyword;
  }
  export interface ThisExpression extends PrimaryExpression, KeywordTypeNode {
    kind: Syntax.ThisKeyword;
  }
  export interface SuperExpression extends PrimaryExpression {
    kind: Syntax.SuperKeyword;
  }
  export type ObjectBindingOrAssignmentPattern = ObjectBindingPattern | ObjectLiteralExpression;
  export type ArrayBindingOrAssignmentPattern = ArrayBindingPattern | ArrayLiteralExpression;
  export interface ImportExpression extends PrimaryExpression {
    kind: Syntax.ImportKeyword;
  }
  export interface SyntheticExpression extends Expression {
    kind: Syntax.SyntheticExpression;
    isSpread: boolean;
    type: Type;
    tupleNameSource?: ParameterDeclaration | NamedTupleMember;
  }
  export type ExponentiationOperator = Syntax.Asterisk2Token;
  export type MultiplicativeOperator = Syntax.AsteriskToken | Syntax.SlashToken | Syntax.PercentToken;
  export type MultiplicativeOperatorOrHigher = ExponentiationOperator | MultiplicativeOperator;
  export type AdditiveOperator = Syntax.PlusToken | Syntax.MinusToken;
  export type AdditiveOperatorOrHigher = MultiplicativeOperatorOrHigher | AdditiveOperator;
  export type ShiftOperator = Syntax.LessThan2Token | Syntax.GreaterThan2Token | Syntax.GreaterThan3Token;
  export type ShiftOperatorOrHigher = AdditiveOperatorOrHigher | ShiftOperator;
  export type RelationalOperator = Syntax.LessThanToken | Syntax.LessThanEqualsToken | Syntax.GreaterThanToken | Syntax.GreaterThanEqualsToken | Syntax.InstanceOfKeyword | Syntax.InKeyword;
  export type RelationalOperatorOrHigher = ShiftOperatorOrHigher | RelationalOperator;
  export type EqualityOperator = Syntax.Equals2Token | Syntax.Equals3Token | Syntax.ExclamationEquals2Token | Syntax.ExclamationEqualsToken;
  export type EqualityOperatorOrHigher = RelationalOperatorOrHigher | EqualityOperator;
  export type BitwiseOperator = Syntax.AmpersandToken | Syntax.BarToken | Syntax.CaretToken;
  export type BitwiseOperatorOrHigher = EqualityOperatorOrHigher | BitwiseOperator;
  export type LogicalOperator = Syntax.Ampersand2Token | Syntax.Bar2Token;
  export type LogicalOperatorOrHigher = BitwiseOperatorOrHigher | LogicalOperator;
  export type CompoundAssignmentOperator =
    | Syntax.PlusEqualsToken
    | Syntax.MinusEqualsToken
    | Syntax.Asterisk2EqualsToken
    | Syntax.AsteriskEqualsToken
    | Syntax.SlashEqualsToken
    | Syntax.PercentEqualsToken
    | Syntax.AmpersandEqualsToken
    | Syntax.BarEqualsToken
    | Syntax.CaretEqualsToken
    | Syntax.LessThan2EqualsToken
    | Syntax.GreaterThan3EqualsToken
    | Syntax.GreaterThan2EqualsToken;
  export type AssignmentOperator = Syntax.EqualsToken | CompoundAssignmentOperator;
  export type AssignmentOperatorOrHigher = Syntax.Question2Token | LogicalOperatorOrHigher | AssignmentOperator;
  export type BinaryOperator = AssignmentOperatorOrHigher | Syntax.CommaToken;
  export type BinaryOperatorToken = Token<BinaryOperator>;
  export type AssignmentOperatorToken = Token<AssignmentOperator>;
  export interface ObjectDestructuringAssignment extends AssignmentExpression<EqualsToken> {
    left: ObjectLiteralExpression;
  }
  export type DestructuringAssignment = ObjectDestructuringAssignment | ArrayDestructuringAssignment;
  export type ConciseBody = FunctionBody | Expression;
  export interface LiteralLikeNode extends Node {
    text: string;
    isUnterminated?: boolean;
    hasExtendedEscape?: boolean;
  }
  export interface TemplateLiteralLikeNode extends LiteralLikeNode {
    rawText?: string;
  }
  export interface LiteralExpression extends LiteralLikeNode, PrimaryExpression {
    _literalExpressionBrand: any;
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
  export type TemplateLiteral = TemplateExpression | NoSubstitutionLiteral;
  export type EntityNameExpression = Identifier | PropertyAccessEntityNameExpression;
  export type EntityNameOrEntityNameExpression = EntityName | EntityNameExpression;
  export type AccessExpression = PropertyAccessExpression | ElementAccessExpression;
  export interface PrivateIdentifierPropertyAccessExpression extends PropertyAccessExpression {
    name: PrivateIdentifier;
  }
  export interface PropertyAccessChain extends PropertyAccessExpression {
    _optionalChainBrand: any;
    name: Identifier;
  }
  export interface PropertyAccessChainRoot extends PropertyAccessChain {
    questionDotToken: QuestionDotToken;
  }
  export interface SuperPropertyAccessExpression extends PropertyAccessExpression {
    expression: SuperExpression;
  }
  export interface PropertyAccessEntityNameExpression extends PropertyAccessExpression {
    _propertyAccessExpressionLikeQualifiedNameBrand?: any;
    expression: EntityNameExpression;
    name: Identifier;
  }
  export interface ElementAccessChainRoot extends ElementAccessChain {
    questionDotToken: QuestionDotToken;
  }
  export interface SuperElementAccessExpression extends ElementAccessExpression {
    expression: SuperExpression;
  }
  export type SuperProperty = SuperPropertyAccessExpression | SuperElementAccessExpression;
  export interface CallChainRoot extends CallChain {
    questionDotToken: QuestionDotToken;
  }
  export type OptionalChain = PropertyAccessChain | ElementAccessChain | CallChain | NonNullChain;
  export type OptionalChainRoot = PropertyAccessChainRoot | ElementAccessChainRoot | CallChainRoot;
  export interface WellKnownSymbolExpression extends PropertyAccessExpression {
    expression: Identifier & { escapedText: 'Symbol' };
    name: Identifier;
  }
  export type BindableObjectDefinePropertyCall = CallExpression & {
    arguments: { 0: BindableStaticNameExpression; 1: StringLiteralLike | NumericLiteral; 2: ObjectLiteralExpression };
  };
  export type BindableStaticNameExpression = EntityNameExpression | BindableStaticElementAccessExpression;
  export type LiteralLikeElementAccessExpression = ElementAccessExpression &
    Declaration & {
      argumentExpression: StringLiteralLike | NumericLiteral | WellKnownSymbolExpression;
    };
  export type BindableStaticElementAccessExpression = LiteralLikeElementAccessExpression & {
    expression: BindableStaticNameExpression;
  };
  export type BindableElementAccessExpression = ElementAccessExpression & {
    expression: BindableStaticNameExpression;
  };
  export type BindableStaticAccessExpression = PropertyAccessEntityNameExpression | BindableStaticElementAccessExpression;
  export type BindableAccessExpression = PropertyAccessEntityNameExpression | BindableElementAccessExpression;
  export interface SuperCall extends CallExpression {
    expression: SuperExpression;
  }
  export interface ImportCall extends CallExpression {
    expression: ImportExpression;
  }
  export type CallLikeExpression = CallExpression | NewExpression | TaggedTemplateExpression | Decorator | JsxOpeningLikeElement;
  export type AssertionExpression = TypeAssertion | AsExpression;
  export interface NonNullChain extends NonNullExpression {
    _optionalChainBrand: any;
  }
  export interface ImportMetaProperty extends MetaProperty {
    keywordToken: Syntax.ImportKeyword;
    name: Identifier & { escapedText: __String & 'meta' };
  }
  export type JsxOpeningLikeElement = JsxSelfClosingElement | JsxOpeningElement;
  export type JsxAttributeLike = JsxAttribute | JsxSpreadAttribute;
  export type JsxTagNameExpression = Identifier | ThisExpression | JsxTagNamePropertyAccess;
  export interface JsxTagNamePropertyAccess extends PropertyAccessExpression {
    expression: JsxTagNameExpression;
  }
  export type JsxChild = JsxText | JsxExpression | JsxElement | JsxSelfClosingElement | JsxFragment;
  export interface PrologueDirective extends ExpressionStatement {
    expression: StringLiteral;
  }
  export interface IterationStatement extends Statement {
    statement: Statement;
  }
  export type BreakOrContinueStatement = BreakStatement | ContinueStatement;
  export type CaseOrDefaultClause = CaseClause | DefaultClause;
  export type ObjectTypeDeclaration = ClassLikeDeclaration | InterfaceDeclaration | TypeLiteralNode;
  export type DeclarationWithTypeParameters = DeclarationWithTypeParameterChildren | JSDocTypedefTag | JSDocCallbackTag | JSDocSignature;
  export type DeclarationWithTypeParameterChildren = SignatureDeclaration | ClassLikeDeclaration | InterfaceDeclaration | TypeAliasDeclaration | JSDocTemplateTag;
  export interface ClassElement extends NamedDeclaration {
    _classElementBrand: any;
    name?: PropertyName;
  }
  export type ModuleBody = NamespaceBody | JSDocNamespaceBody;
  export type ModuleName = Identifier | StringLiteral;
  export type NamespaceBody = ModuleBlock | NamespaceDeclaration;
  export interface NamespaceDeclaration extends ModuleDeclaration {
    name: Identifier;
    body: NamespaceBody;
  }
  export type JSDocNamespaceBody = Identifier | JSDocNamespaceDeclaration;
  export interface JSDocNamespaceDeclaration extends ModuleDeclaration {
    name: Identifier;
    body?: JSDocNamespaceBody;
  }
  export type ModuleReference = EntityName | ExternalModuleReference;
  export type NamedExportBindings = NamespaceExport | NamedExports;
  export type NamedImportBindings = NamespaceImport | NamedImports;
  export type NamedImportsOrExports = NamedImports | NamedExports;
  export type ImportOrExportSpecifier = ImportSpecifier | ExportSpecifier;
  export interface FileReference extends TextRange {
    fileName: string;
  }
  export interface CheckJsDirective extends TextRange {
    enabled: boolean;
  }
  export type CommentKind = Syntax.SingleLineCommentTrivia | Syntax.MultiLineCommentTrivia;
  export interface CommentRange extends Range {
    hasTrailingNewLine?: boolean;
    kind: CommentKind;
  }
  export interface SynthesizedComment extends CommentRange {
    text: string;
    pos: -1;
    end: -1;
    hasLeadingNewline?: boolean;
  }
  export interface JSDocType extends TypeNode {
    _jsDocTypeBrand: any;
  }
  export interface JSDocNamepathType extends JSDocType {
    kind: Syntax.JSDocNamepathType;
    type: TypeNode;
  }
  export type JSDocTypeReferencingNode = JSDocVariadicType | JSDocOptionalType | JSDocNullableType | JSDocNonNullableType;
  export interface JSDocUnknownTag extends JSDocTag {
    kind: Syntax.JSDocTag;
  }
  export interface IncompleteType {
    flags: TypeFlags;
    type: Type;
  }
  export interface SourceFileLike {
    readonly text: string;
    lineMap?: readonly number[];
    posOf?(line: number, char: number, edits?: true): number;
  }
  export interface RedirectInfo {
    readonly redirectTarget: SourceFile;
    readonly unredirected: SourceFile;
  }
  export interface CommentDirective {
    range: Range;
    type: CommentDirectiveType;
  }
  export const enum CommentDirectiveType {
    ExpectError,
    Ignore,
  }
  export type ExportedModulesFromDeclarationEmit = readonly Symbol[];
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
  export type UnparsedSourceText = UnparsedPrepend | UnparsedTextLike;
  export interface UnparsedSection extends Node {
    kind: Syntax;
    data?: string;
    parent: UnparsedSource;
  }
  export interface UnparsedPrologue extends UnparsedSection {
    kind: Syntax.UnparsedPrologue;
    data: string;
    parent: UnparsedSource;
  }
  export interface UnparsedTextLike extends UnparsedSection {
    kind: Syntax.UnparsedText | Syntax.UnparsedInternalText;
    parent: UnparsedSource;
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
  export interface ProgramBuildInfo {}
  export interface Program extends ScriptReferenceHost {
    getCurrentDirectory(): string;
    getRootFileNames(): readonly string[];
    getSourceFiles(): readonly SourceFile[];
    getMissingFilePaths(): readonly Path[];
    getRefFileMap(): MultiMap<RefFile> | undefined;
    getFilesByNameMap(): QMap<SourceFile | false | undefined>;
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
    getClassifiableNames(): UnderscoreEscapedMap<true>;
    getNodeCount(): number;
    getIdentifierCount(): number;
    getSymbolCount(): number;
    getTypeCount(): number;
    getInstantiationCount(): number;
    getRelationCacheSizes(): { assignable: number; identity: number; subtype: number; strictSubtype: number };
    getFileProcessingDiagnostics(): DiagnosticCollection;
    getResolvedTypeReferenceDirectives(): QMap<ResolvedTypeReferenceDirective | undefined>;
    isSourceFileFromExternalLibrary(file: SourceFile): boolean;
    isSourceFileDefaultLibrary(file: SourceFile): boolean;
    // For testing purposes only.
    structureIsReused?: StructureIsReused;
    getSourceFileFromReference(referencingFile: SourceFile | UnparsedSource, ref: FileReference): SourceFile | undefined;
    getLibFileFromReference(ref: FileReference): SourceFile | undefined;
    /** Given a source file, get the name of the package it was imported from. */
    sourceFileToPackageName: QMap<string>;
    /** Set of all source files that some other source file redirects to. */
    redirectTargetsMap: MultiMap<string>;
    /** Is the file emitted file */
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
    getProbableSymlinks(): QReadonlyMap<string>;
    fileExists(fileName: string): boolean;
  }
  export interface Program extends TypeCheckerHost, ModuleSpecifierResolutionHost {}
  export type RedirectTargetsMap = QReadonlyMap<readonly string[]>;
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
    /** Line number in the .js file. */
    emittedLine: number;
    /** Column number in the .js file. */
    emittedColumn: number;
    /** Line number in the .ts file. */
    sourceLine: number;
    /** Column number in the .ts file. */
    sourceColumn: number;
    /** Optional name (index into names array) associated with this span. */
    nameIndex?: number;
    /** .ts file (index into sources array) associated with this span */
    sourceIndex: number;
  }
  export interface SourceMapEmitResult {
    inputSourceFileNames: readonly string[]; // Input source file (which one can use on program to get the file), 1:1 mapping with the sourceMap.sources list
    sourceMap: RawSourceMap;
  }
  export enum ExitStatus {
    Success = 0,
    DiagnosticsPresent_OutputsSkipped = 1,
    DiagnosticsPresent_OutputsGenerated = 2,
    InvalidProject_OutputsSkipped = 3,
    ProjectReferenceCycle_OutputsSkipped = 4,
    /** @deprecated Use ProjectReferenceCycle_OutputsSkipped instead. */
    ProjectReferenceCycle_OutputsSkupped = 4,
  }
  export interface EmitResult {
    emitSkipped: boolean;
    /** Contains declaration emit diagnostics */
    diagnostics: readonly Diagnostic[];
    emittedFiles?: string[]; // Array of files the compiler wrote to disk
    sourceMaps?: SourceMapEmitResult[]; // Array of sourceMapData if compiler emitted sourcemaps
    exportedModulesFromDeclarationEmit?: ExportedModulesFromDeclarationEmit;
  }
  export const enum UnionReduction {
    None = 0,
    Literal,
    Subtype,
  }
  export const enum ContextFlags {
    None = 0,
    Signature = 1 << 0, // Obtaining contextual signature
    NoConstraints = 1 << 1, // Don't obtain type variable constraints
    Completions = 1 << 2, // Ignore inference to current node and parent nodes out to the containing call for completions
  }
  // NOTE: If modifying this enum, must modify `TypeFormatFlags` too!
  export const enum NodeBuilderFlags {
    None = 0,
    // Options
    NoTruncation = 1 << 0, // Don't truncate result
    WriteArrayAsGenericType = 1 << 1, // Write Array<T> instead T[]
    GenerateNamesForShadowedTypeParams = 1 << 2, // When a type parameter T is shadowing another T, generate a name for it so it can still be referenced
    UseStructuralFallback = 1 << 3, // When an alias cannot be named by its symbol, rather than report an error, fallback to a structural printout if possible
    ForbidIndexedAccessSymbolReferences = 1 << 4, // Forbid references like `I["a"]["b"]` - print `typeof I.a<x>.b<y>` instead
    WriteTypeArgumentsOfSignature = 1 << 5, // Write the type arguments instead of type parameters of the signature
    UseFullyQualifiedType = 1 << 6, // Write out the fully qualified type name (eg. Module.Type, instead of Type)
    UseOnlyExternalAliasing = 1 << 7, // Only use external aliases for a symbol
    SuppressAnyReturnType = 1 << 8, // If the return type is any-like, don't offer a return type.
    WriteTypeParametersInQualifiedName = 1 << 9,
    MultilineObjectLiterals = 1 << 10, // Always write object literals across multiple lines
    WriteClassExpressionAsTypeLiteral = 1 << 11, // Write class {} as { new(): {} } - used for mixin declaration emit
    UseTypeOfFunction = 1 << 12, // Build using typeof instead of function type literal
    OmitParameterModifiers = 1 << 13, // Omit modifiers on parameters
    UseAliasDefinedOutsideCurrentScope = 1 << 14, // Allow non-visible aliases
    UseSingleQuotesForStringLiteralType = 1 << 28, // Use single quotes for string literal type
    NoTypeReduction = 1 << 29, // Don't call getReducedType
    // Error handling
    AllowThisInObjectLiteral = 1 << 15,
    AllowQualifedNameInPlaceOfIdentifier = 1 << 16,
    AllowAnonymousIdentifier = 1 << 17,
    AllowEmptyUnionOrIntersection = 1 << 18,
    AllowEmptyTuple = 1 << 19,
    AllowUniqueESSymbolType = 1 << 20,
    AllowEmptyIndexInfoType = 1 << 21,
    // Errors (cont.)
    AllowNodeModulesRelativePaths = 1 << 26,
    DoNotIncludeSymbolChain = 1 << 27, // Skip looking up and printing an accessible symbol chain
    IgnoreErrors = AllowThisInObjectLiteral |
      AllowQualifedNameInPlaceOfIdentifier |
      AllowAnonymousIdentifier |
      AllowEmptyUnionOrIntersection |
      AllowEmptyTuple |
      AllowEmptyIndexInfoType |
      AllowNodeModulesRelativePaths,
    // State
    InObjectTypeLiteral = 1 << 22,
    InTypeAlias = 1 << 23, // Writing type in type alias declaration
    InInitialEntityName = 1 << 24, // Set when writing the LHS of an entity name or entity name expression
    InReverseMappedType = 1 << 25,
  }
  // Ensure the shared flags between this and `NodeBuilderFlags` stay in alignment
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
    /** Note: Return values are not ordered. */
    walkType(root: Type): { visitedTypes: readonly Type[]; visitedSymbols: readonly Symbol[] };
    /** Note: Return values are not ordered. */
    walkSymbol(root: Symbol): { visitedTypes: readonly Type[]; visitedSymbols: readonly Symbol[] };
  }
  // This was previously deprecated in our public API, but is still used internally
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
  export interface IdentifierTypePredicate extends TypePredicateBase {
    kind: TypePredicateKind.Identifier;
    parameterName: string;
    parameterIndex: number;
    type: Type;
  }
  export type AnyImportSyntax = ImportDeclaration | ImportEqualsDeclaration;
  export type AnyImportOrRequire = AnyImportSyntax | RequireVariableDeclaration;
  export type AnyImportOrReExport = AnyImportSyntax | ExportDeclaration;
  export interface ValidImportTypeNode extends ImportTypeNode {
    argument: LiteralTypeNode & { literal: StringLiteral };
  }
  export type AnyValidImportOrReExport =
    | ((ImportDeclaration | ExportDeclaration) & { moduleSpecifier: StringLiteral })
    | (ImportEqualsDeclaration & { moduleReference: ExternalModuleReference & { expression: StringLiteral } })
    | RequireOrImportCall
    | ValidImportTypeNode;
  export type RequireOrImportCall = CallExpression & { expression: Identifier; arguments: [StringLiteralLike] };
  export interface RequireVariableDeclaration extends VariableDeclaration {
    initializer: RequireOrImportCall;
  }
  export type LateVisibilityPaintedStatement =
    | AnyImportSyntax
    | VariableStatement
    | ClassDeclaration
    | FunctionDeclaration
    | ModuleDeclaration
    | TypeAliasDeclaration
    | InterfaceDeclaration
    | EnumDeclaration;
  export interface SymbolVisibilityResult {
    accessibility: SymbolAccessibility;
    aliasesToMakeVisible?: LateVisibilityPaintedStatement[]; // aliases that need to have this symbol visible
    errorSymbolName?: string; // Optional symbol name that results in error
    errorNode?: Node; // optional node that results in error
  }
  export interface SymbolAccessibilityResult extends SymbolVisibilityResult {
    errorModuleName?: string; // If the symbol is not visible from module, module's name
  }
  /** Indicates how to serialize the name for a TypeReferenceNode when emitting decorator metadata */
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
    // Returns the constant value this property access resolves to, or 'undefined' for a non-constant
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
  export const enum EnumKind {
    Numeric, // Numeric enum (each member has a TypeFlags.Enum type)
    Literal, // Literal enum (each member has a TypeFlags.EnumLiteral type)
  }
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
  export type __String = (string & { __escapedIdentifier: void }) | (void & { __escapedIdentifier: void }) | InternalSymbolName;
  export type UnderscoreEscapedMap<T> = Map<__String, T>;
  export type ReadonlyUnderscoreEscapedMap<T> = ReadonlyMap<__String, T>;
  export interface PatternAmbientModule {
    pattern: Pattern;
    symbol: Symbol;
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
    deferredNodes?: QMap<Node>; // Set of nodes whose checking has been deferred
    capturedBlockScopeBindings?: Symbol[]; // Block-scoped bindings captured beneath this part of an IterationStatement
    outerTypeParameters?: TypeParameter[]; // Outer type parameters of anonymous object type
    instantiations?: QMap<Type>; // Instantiations of generic type alias (undefined if non-generic)
    isExhaustive?: boolean; // Is node an exhaustive switch statement
    skipDirectInference?: true; // Flag set by the API `getContextualType` call on a node when `Completions` is passed to force the checker to skip making inferences to a node's type
    declarationRequiresScopeChange?: boolean; // Set by `useOuterVariableScopeInParameter` in checker when downlevel emit would change the name resolution scope inside of a parameter.
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
    EnumLiteral = 1 << 10, // Always combined with StringLiteral, NumberLiteral, or Union
    BigIntLiteral = 1 << 11,
    ESSymbol = 1 << 12, // Type of symbol primitive introduced in ES6
    UniqueESSymbol = 1 << 13, // unique symbol
    Void = 1 << 14,
    Undefined = 1 << 15,
    Null = 1 << 16,
    Never = 1 << 17, // Never type
    TypeParameter = 1 << 18, // Type parameter
    Object = 1 << 19, // Object type
    Union = 1 << 20, // Union (T | U)
    Intersection = 1 << 21, // Intersection (T & U)
    Index = 1 << 22, // keyof T
    IndexedAccess = 1 << 23, // T[K]
    Conditional = 1 << 24, // T extends U ? X : Y
    Substitution = 1 << 25, // Type parameter substitution
    NonPrimitive = 1 << 26, // intrinsic object type
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
    // 'Narrowable' types are types where narrowing actually narrows.
    // This *should* be every type other than null, undefined, void, and never
    Narrowable = Any | Unknown | StructuredOrInstantiable | StringLike | NumberLike | BigIntLike | BooleanLike | ESSymbol | UniqueESSymbol | NonPrimitive,
    NotUnionOrUnit = Any | Unknown | ESSymbol | Object | NonPrimitive,
    NotPrimitiveUnion = Any | Unknown | Enum | Void | Never | StructuredOrInstantiable,
    // The following flags are aggregated during union and intersection type construction
    IncludesMask = Any | Unknown | Primitive | Never | Object | Union | Intersection | NonPrimitive,
    // The following flags are used for different purposes during union and intersection type construction
    IncludesStructuredOrInstantiable = TypeParameter,
    IncludesNonWideningType = Index,
    IncludesWildcard = IndexedAccess,
    IncludesEmptyObject = Conditional,
  }
  export type DestructuringPattern = BindingPattern | ObjectLiteralExpression | ArrayLiteralExpression;
  export interface IntrinsicType extends Type {
    intrinsicName: string; // Name of intrinsic type
    objectFlags: ObjectFlags;
  }
  export interface NullableType extends IntrinsicType {
    objectFlags: ObjectFlags;
  }
  export interface FreshableIntrinsicType extends IntrinsicType {
    freshType: IntrinsicType; // Fresh version of type
    regularType: IntrinsicType; // Regular version of type
  }
  export type FreshableType = LiteralType | FreshableIntrinsicType;
  export interface LiteralType extends Type {
    value: string | number | PseudoBigInt; // Value of literal
    freshType: LiteralType; // Fresh version of type
    regularType: LiteralType; // Regular version of type
  }
  export interface UniqueESSymbolType extends Type {
    symbol: Symbol;
    escName: __String;
  }
  export interface StringLiteralType extends LiteralType {
    value: string;
  }
  export interface NumberLiteralType extends LiteralType {
    value: number;
  }
  export interface EnumType extends Type {}
  export const enum ObjectFlags {
    Class = 1 << 0, // Class
    Interface = 1 << 1, // Interface
    Reference = 1 << 2, // Generic type reference
    Tuple = 1 << 3, // Synthesized generic tuple type
    Anonymous = 1 << 4, // Anonymous
    Mapped = 1 << 5, // Mapped
    Instantiated = 1 << 6, // Instantiated anonymous or mapped type
    ObjectLiteral = 1 << 7, // Originates in an object literal
    EvolvingArray = 1 << 8, // Evolving array type
    ObjectLiteralPatternWithComputedProperties = 1 << 9, // Object literal pattern with computed properties
    ContainsSpread = 1 << 10, // Object literal contains spread operation
    ReverseMapped = 1 << 11, // Object contains a property from a reverse-mapped type
    JsxAttributes = 1 << 12, // Jsx attributes type
    MarkerType = 1 << 13, // Marker type used for variance probing
    JSLiteral = 1 << 14, // Object type declared in JS - disables errors on read/write of nonexisting members
    FreshLiteral = 1 << 15, // Fresh object literal
    ArrayLiteral = 1 << 16, // Originates in an array literal
    ObjectRestType = 1 << 17, // Originates in object rest declaration
    PrimitiveUnion = 1 << 18, // Union of only primitive types
    ContainsWideningType = 1 << 19, // Type is or contains undefined or null widening type
    ContainsObjectOrArrayLiteral = 1 << 20, // Type is or contains object literal type
    NonInferrableType = 1 << 21, // Type is or contains anyFunctionType or silentNeverType
    IsGenericObjectTypeComputed = 1 << 22, // IsGenericObjectType flag has been computed
    IsGenericObjectType = 1 << 23, // Union or intersection contains generic object type
    IsGenericIndexTypeComputed = 1 << 24, // IsGenericIndexType flag has been computed
    IsGenericIndexType = 1 << 25, // Union or intersection contains generic index type
    CouldContainTypeVariablesComputed = 1 << 26, // CouldContainTypeVariables flag has been computed
    CouldContainTypeVariables = 1 << 27, // Type could contain a type variable
    ContainsIntersections = 1 << 28, // Union contains intersections
    IsNeverIntersectionComputed = 1 << 28, // IsNeverLike flag has been computed
    IsNeverIntersection = 1 << 29, // Intersection reduces to never
    ClassOrInterface = Class | Interface,
    RequiresWidening = ContainsWideningType | ContainsObjectOrArrayLiteral,
    PropagatingFlags = ContainsWideningType | ContainsObjectOrArrayLiteral | NonInferrableType,
  }
  export type ObjectFlagsType = NullableType | ObjectType | UnionType | IntersectionType;
  export interface ObjectType extends Type {
    objectFlags: ObjectFlags;
    members?: SymbolTable; // Properties by name
    properties?: Symbol[]; // Properties
    callSignatures?: readonly Signature[]; // Call signatures of type
    constructSignatures?: readonly Signature[]; // Construct signatures of type
    stringIndexInfo?: IndexInfo; // String indexing info
    numberIndexInfo?: IndexInfo; // Numeric indexing info
  }
  export interface InterfaceType extends ObjectType {
    typeParameters: TypeParameter[] | undefined; // Type parameters (undefined if non-generic)
    outerTypeParameters: TypeParameter[] | undefined; // Outer type parameters (undefined if none)
    localTypeParameters: TypeParameter[] | undefined; // Local type parameters (undefined if none)
    thisType: TypeParameter | undefined; // The "this" type (undefined if none)
    resolvedBaseConstructorType?: Type; // Resolved base constructor type of class
    resolvedBaseTypes: BaseType[]; // Resolved base types
  }
  export type BaseType = ObjectType | IntersectionType | TypeVariable; // Also `any` and `object`
  export interface InterfaceTypeWithDeclaredMembers extends InterfaceType {
    declaredProperties: Symbol[]; // Declared members
    declaredCallSignatures: Signature[]; // Declared call signatures
    declaredConstructSignatures: Signature[]; // Declared construct signatures
    declaredStringIndexInfo?: IndexInfo; // Declared string indexing info
    declaredNumberIndexInfo?: IndexInfo; // Declared numeric indexing info
  }
  export interface TypeReference extends ObjectType {
    target: GenericType; // Type reference target
    node?: TypeReferenceNode | ArrayTypeNode | TupleTypeNode;
    mapper?: TypeMapper;
    resolvedTypeArguments?: readonly Type[]; // Resolved type reference type arguments
    literalType?: TypeReference; // Clone of type with ObjectFlags.ArrayLiteral set
  }
  export interface DeferredTypeReference extends TypeReference {
    node: TypeReferenceNode | ArrayTypeNode | TupleTypeNode;
    mapper?: TypeMapper;
  }
  export const enum VarianceFlags {
    Invariant = 0, // Neither covariant nor contravariant
    Covariant = 1 << 0, // Covariant
    Contravariant = 1 << 1, // Contravariant
    Bivariant = Covariant | Contravariant, // Both covariant and contravariant
    Independent = 1 << 2, // Unwitnessed type parameter
    VarianceMask = Invariant | Covariant | Contravariant | Independent, // Mask containing all measured variances without the unmeasurable flag
    Unmeasurable = 1 << 3, // Variance result is unusable - relationship relies on structural comparisons which are not reflected in generic relationships
    Unreliable = 1 << 4, // Variance result is unreliable - checking may produce false negatives, but not false positives
    AllowsStructuralFallback = Unmeasurable | Unreliable,
  }
  export interface GenericType extends InterfaceType, TypeReference {
    instantiations: QMap<TypeReference>; // Generic instantiation cache
    variances?: VarianceFlags[]; // Variance of each type parameter
  }
  export interface UnionOrIntersectionType extends Type {
    types: Type[]; // Constituent types
    objectFlags: ObjectFlags;
    propertyCache: SymbolTable; // Cache of resolved properties
    resolvedProperties: Symbol[];
    resolvedIndexType: IndexType;
    resolvedStringIndexType: IndexType;
    resolvedBaseConstraint: Type;
  }
  export interface UnionType extends UnionOrIntersectionType {
    resolvedReducedType: Type;
    regularType: UnionType;
  }
  export interface IntersectionType extends UnionOrIntersectionType {
    resolvedApparentType: Type;
  }
  export type StructuredType = ObjectType | UnionType | IntersectionType;
  export interface MappedType extends AnonymousType {
    declaration: MappedTypeNode;
    typeParameter?: TypeParameter;
    constraintType?: Type;
    templateType?: Type;
    modifiersType?: Type;
    resolvedApparentType?: Type;
  }
  export interface EvolvingArrayType extends ObjectType {
    elementType: Type; // Element expressions of evolving array type
    finalArrayType?: Type; // Final array type of evolving array type
  }
  export interface ReverseMappedType extends ObjectType {
    source: Type;
    mappedType: MappedType;
    constraintType: IndexType;
  }
  export interface ResolvedType extends ObjectType, UnionOrIntersectionType {
    members: SymbolTable; // Properties by name
    properties: Symbol[]; // Properties
    callSignatures: readonly Signature[]; // Call signatures of type
    constructSignatures: readonly Signature[]; // Construct signatures of type
  }
  export interface FreshObjectLiteralType extends ResolvedType {
    regularType: ResolvedType; // Regular version of fresh type
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
  export interface PromiseOrAwaitableType extends ObjectType, UnionType {
    promiseTypeOfPromiseConstructor?: Type;
    promisedTypeOfPromise?: Type;
    awaitedTypeOfType?: Type;
  }
  export interface SyntheticDefaultModuleType extends Type {
    syntheticType?: Type;
  }
  export interface InstantiableType extends Type {
    resolvedBaseConstraint?: Type;
    resolvedIndexType?: IndexType;
    resolvedStringIndexType?: IndexType;
  }
  export interface IndexedAccessType extends InstantiableType {
    objectType: Type;
    indexType: Type;
    constraint?: Type;
    simplifiedForReading?: Type;
    simplifiedForWriting?: Type;
  }
  // keyof T types (TypeFlags.Index)
  export interface IndexType extends InstantiableType {
    type: InstantiableType | UnionOrIntersectionType;
    stringsOnly: boolean;
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
    instantiations?: QMap<Type>;
    aliasSymbol?: Symbol;
    aliasTypeArguments?: Type[];
  }
  // T extends U ? X : Y (TypeFlags.Conditional)
  export interface ConditionalType extends InstantiableType {
    root: ConditionalRoot;
    checkType: Type;
    extendsType: Type;
    resolvedTrueType: Type;
    resolvedFalseType: Type;
    resolvedInferredTrueType?: Type; // The `trueType` instantiated with the `combinedMapper`, if present
    resolvedDefaultConstraint?: Type;
    mapper?: TypeMapper;
    combinedMapper?: TypeMapper;
  }
  export interface SubstitutionType extends InstantiableType {
    baseType: Type;
    substitute: Type;
  }
  export const enum JsxReferenceKind {
    Component,
    Function,
    Mixed,
  }
  export const enum SignatureKind {
    Call,
    Construct,
  }
  export const enum SignatureFlags {
    None = 0,
    HasRestParameter = 1 << 0, // Indicates last parameter is rest parameter
    HasLiteralTypes = 1 << 1, // Indicates signature is specialized
    IsInnerCallChain = 1 << 2, // Indicates signature comes from a CallChain nested in an outer OptionalChain
    IsOuterCallChain = 1 << 3, // Indicates signature comes from a CallChain that is the outermost chain of an optional expression
    IsUntypedSignatureInJSFile = 1 << 4, // Indicates signature is from a js file and has no types
    // We do not propagate `IsInnerCallChain` to instantiated signatures, as that would result in us
    // attempting to add `| undefined` on each recursive call to `getReturnTypeOfSignature` when
    // instantiating the return type.
    PropagatingFlags = HasRestParameter | HasLiteralTypes,
    CallChainFlags = IsInnerCallChain | IsOuterCallChain,
  }
  export const enum IndexKind {
    String,
    Number,
  }
  export interface IndexInfo {
    type: Type;
    isReadonly: boolean;
    declaration?: IndexSignatureDeclaration;
  }
  export const enum InferencePriority {
    NakedTypeVariable = 1 << 0, // Naked type variable in union or intersection type
    HomomorphicMappedType = 1 << 1, // Reverse inference for homomorphic mapped type
    PartialHomomorphicMappedType = 1 << 2, // Partial reverse inference for homomorphic mapped type
    MappedTypeConstraint = 1 << 3, // Reverse inference for mapped type
    ContravariantConditional = 1 << 4, // Conditional type in contravariant position
    ReturnType = 1 << 5, // Inference made from return type of generic function
    LiteralKeyof = 1 << 6, // Inference made from a string literal to a keyof T
    NoConstraints = 1 << 7, // Don't infer from constraints of instantiable types
    AlwaysStrict = 1 << 8, // Always use strict rules for contravariant inferences
    MaxValue = 1 << 9, // Seed for inference priority tracking
    PriorityImpliesCombination = ReturnType | MappedTypeConstraint | LiteralKeyof, // These priorities imply that the resulting type should be a combination of all candidates
    Circularity = -1, // Inference circularity (value less than all other priorities)
  }
  export interface InferenceInfo {
    typeParameter: TypeParameter; // Type parameter for which inferences are being made
    candidates: Type[] | undefined; // Candidates in covariant positions (or undefined)
    contraCandidates: Type[] | undefined; // Candidates in contravariant positions (or undefined)
    inferredType?: Type; // Cache for resolved inferred type
    priority?: InferencePriority; // Priority of current inference set
    topLevel: boolean; // True if all inferences are to top level occurrences
    isFixed: boolean; // True if inferences are fixed
  }
  export const enum InferenceFlags {
    None = 0, // No special inference behaviors
    NoDefault = 1 << 0, // Infer unknownType for no inferences (otherwise anyType or emptyObjectType)
    AnyDefault = 1 << 1, // Infer anyType for no inferences (otherwise emptyObjectType)
    SkippedGenericFunction = 1 << 2, // A generic function was skipped during inference
  }
  /**
   * Ternary values are defined such that
   * x & y is False if either x or y is False.
   * x & y is Maybe if either x or y is Maybe, but neither x or y is False.
   * x & y is True if both x and y are True.
   * x | y is False if both x and y are False.
   * x | y is Maybe if either x or y is Maybe, but neither x or y is True.
   * x | y is True if either x or y is True.
   */
  export interface InferenceContext {
    inferences: InferenceInfo[]; // Inferences made for each type parameter
    signature?: Signature; // Generic signature for which inferences are made (if any)
    flags: InferenceFlags; // Inference flags
    compareTypes: TypeComparer; // Type comparer function
    mapper: TypeMapper; // Mapper that fixes inferences
    nonFixingMapper: TypeMapper; // Mapper that doesn't fix inferences
    returnMapper?: TypeMapper; // Type mapper for inferences from return types (if any)
    inferredTypeParameters?: readonly TypeParameter[]; // Inferred type parameters for function result
  }
  export interface WideningContext {
    parent?: WideningContext; // Parent context
    propertyName?: __String; // Name of property in parent
    siblings?: Type[]; // Types of siblings
    resolvedProperties?: Symbol[]; // Properties occurring in sibling object literals
  }
  export const enum AssignmentDeclarationKind {
    None,
    /// exports.name = expr
    ExportsProperty,
    /// module.exports = expr
    ModuleExports,
    /// className.prototype.name = expr
    PrototypeProperty,
    /// this.name = expr
    ThisProperty,
    // F.name = expr
    Property,
    // F.prototype = { ... }
    Prototype,
    // Object.defineProperty(x, 'name', { value: any, writable?: boolean (false by default) });
    // Object.defineProperty(x, 'name', { get: Function, set: Function });
    // Object.defineProperty(x, 'name', { get: Function });
    // Object.defineProperty(x, 'name', { set: Function });
    ObjectDefinePropertyValue,
    // Object.defineProperty(exports || module.exports, 'name', ...);
    ObjectDefinePropertyExports,
    // Object.defineProperty(Foo.prototype, 'name', ...);
    ObjectDefinePrototypeProperty,
  }
  /** @deprecated Use FileExtensionInfo instead. */
  export type xJsFileExtensionInfo = FileExtensionInfo;
  export interface FileExtensionInfo {
    extension: string;
    isMixedContent: boolean;
    scriptKind?: ScriptKind;
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
  export interface Diagnostic extends DiagnosticRelatedInformation {
    /** May store more in future. For now, this will simply be `true` to indicate when a diagnostic is an unused-identifier diagnostic. */
    reportsUnnecessary?: {};
    source?: string;
    relatedInformation?: DiagnosticRelatedInformation[];
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
  export enum DiagnosticCategory {
    Warning,
    Error,
    Suggestion,
    Message,
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
  export type CompilerOptionsValue = string | number | boolean | (string | number)[] | string[] | MapLike<string[]> | PluginImport[] | ProjectReference[] | null | undefined;
  export interface CompilerOptions {
    all?: boolean;
    allowJs?: boolean;
    allowNonTsExtensions?: boolean;
    allowSyntheticDefaultImports?: boolean;
    allowUmdGlobalAccess?: boolean;
    allowUnreachableCode?: boolean;
    allowUnusedLabels?: boolean;
    alwaysStrict?: boolean; // Always combine with strict property
    baseUrl?: string;
    /** An error if set - this should only go through the -b pipeline and not actually be observed */
    build?: boolean;
    charset?: string;
    checkJs?: boolean;
    configFilePath?: string;
    /** configFile is set as non enumerable property so as to avoid checking of json source files */
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
    noImplicitAny?: boolean; // Always combine with strict property
    noImplicitReturns?: boolean;
    noImplicitThis?: boolean; // Always combine with strict property
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
    paths?: MapLike<string[]>;
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
    strictFunctionTypes?: boolean; // Always combine with strict property
    strictBindCallApply?: boolean; // Always combine with strict property
    strictNullChecks?: boolean; // Always combine with strict property
    strictPropertyInitialization?: boolean; // Always combine with strict property
    stripInternal?: boolean;
    suppressExcessPropertyErrors?: boolean;
    suppressImplicitAnyIndexErrors?: boolean;
    suppressOutputPathCheck?: boolean;
    target?: ScriptTarget; // TODO: GH#18217 frequently asserted as defined
    traceResolution?: boolean;
    resolveJsonModule?: boolean;
    types?: string[];
    /** Paths used to compute primary types search locations */
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
  export interface LineAndChar {
    line: number;
    char: number;
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
  export const enum LanguageVariant {
    TS,
    TX,
    PY,
    JL,
  }
  /** Either a parsed command line or a parsed tsconfig.json */
  export interface ParsedCommandLine {
    options: CompilerOptions;
    typeAcquisition?: TypeAcquisition;
    fileNames: string[];
    projectReferences?: readonly ProjectReference[];
    watchOptions?: WatchOptions;
    raw?: any;
    errors: Diagnostic[];
    wildcardDirectories?: MapLike<WatchDirectoryFlags>;
    compileOnSave?: boolean;
    configFileSpecs?: ConfigFileSpecs;
  }
  export const enum WatchDirectoryFlags {
    None = 0,
    Recursive = 1 << 0,
  }
  export interface ConfigFileSpecs {
    filesSpecs: readonly string[] | undefined;
    /**
     * Present to report errors (user specified specs), validatedIncludeSpecs are used for file name matching
     */
    includeSpecs?: readonly string[];
    /**
     * Present to report errors (user specified specs), validatedExcludeSpecs are used for file name matching
     */
    excludeSpecs?: readonly string[];
    validatedIncludeSpecs?: readonly string[];
    validatedExcludeSpecs?: readonly string[];
    wildcardDirectories: MapLike<WatchDirectoryFlags>;
  }
  export interface ExpandResult {
    fileNames: string[];
    wildcardDirectories: MapLike<WatchDirectoryFlags>;
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
    type: 'string' | 'number' | 'boolean' | 'object' | 'list' | QMap<number | string>; // a value of a primitive type, or an object literal mapping named values to actual values
    isFilePath?: boolean; // True if option value is a path or fileName
    shortName?: string; // A short mnemonic for convenience - for instance, 'h' can be used in place of 'help'
    description?: DiagnosticMessage; // The message describing what the command line switch does
    paramType?: DiagnosticMessage; // The name to be used for a non-boolean option's parameter
    isTSConfigOnly?: boolean; // True if option can only be specified via tsconfig.json file
    isCommandLineOnly?: boolean;
    showInSimplifiedHelpView?: boolean;
    category?: DiagnosticMessage;
    strictFlag?: true; // true if the option is one of the flag under strict
    affectsSourceFile?: true; // true if we should recreate SourceFiles after this option changes
    affectsModuleResolution?: true; // currently same effect as `affectsSourceFile`
    affectsBindDiagnostics?: true; // true if this affects binding (currently same effect as `affectsSourceFile`)
    affectsSemanticDiagnostics?: true; // true if option affects semantic diagnostics
    affectsEmit?: true; // true if the options affects emit
    transpileOptionValue?: boolean | undefined; // If set this means that the option should be set to this value when transpiling
  }
  export interface CommandLineOptionOfPrimitiveType extends CommandLineOptionBase {
    type: 'string' | 'number' | 'boolean';
  }
  export interface CommandLineOptionOfCustomType extends CommandLineOptionBase {
    type: QMap<number | string>; // an object literal mapping named values to actual values
  }
  export interface DidYouMeanOptionsDiagnostics {
    optionDeclarations: CommandLineOption[];
    unknownOptionDiagnostic: DiagnosticMessage;
    unknownDidYouMeanDiagnostic: DiagnosticMessage;
  }
  export interface TsConfigOnlyOption extends CommandLineOptionBase {
    type: 'object';
    elementOptions?: QMap<CommandLineOption>;
    extraKeyDiagnostics?: DidYouMeanOptionsDiagnostics;
  }
  export interface CommandLineOptionOfListType extends CommandLineOptionBase {
    type: 'list';
    element: CommandLineOptionOfCustomType | CommandLineOptionOfPrimitiveType | TsConfigOnlyOption;
  }
  export type CommandLineOption = CommandLineOptionOfCustomType | CommandLineOptionOfPrimitiveType | TsConfigOnlyOption | CommandLineOptionOfListType;
  export interface ModuleResolutionHost {
    // TODO: GH#18217 Optional methods frequently used as non-optional
    fileExists(fileName: string): boolean;
    // readFile function is used to read arbitrary text files on disk, i.e. when resolution procedure needs the content of 'package.json'
    // to determine location of bundled typings for node module
    readFile(fileName: string): string | undefined;
    trace?(s: string): void;
    directoryExists?(directoryName: string): boolean;
    /**
     * Resolve a symbolic link.
     * @see https://nodejs.org/api/fs.html#fs_fs_realpathsync_path_options
     */
    realpath?(path: string): string;
    getCurrentDirectory?(): string;
    getDirectories?(path: string): string[];
  }
  export interface ResolvedModule {
    /** Path of the file the module was resolved to. */
    resolvedFileName: string;
    /** True if `resolvedFileName` comes from `node_modules`. */
    isExternalLibraryImport?: boolean;
  }
  export interface ResolvedModuleFull extends ResolvedModule {
    readonly originalPath?: string;
    extension: Extension;
    packageId?: PackageId;
  }
  export interface PackageId {
    name: string;
    subModuleName: string;
    version: string;
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
  export interface ResolvedModuleWithFailedLookupLocations {
    readonly resolvedModule: ResolvedModuleFull | undefined;
    readonly failedLookupLocations: string[];
  }
  export interface ResolvedTypeReferenceDirective {
    // True if the type declaration file was found in a primary lookup location
    primary: boolean;
    // The location of the .d.ts file we located, or undefined if resolution failed
    resolvedFileName: string | undefined;
    packageId?: PackageId;
    /** True if `resolvedFileName` comes from `node_modules`. */
    isExternalLibraryImport?: boolean;
  }
  export interface ResolvedTypeReferenceDirectiveWithFailedLookupLocations {
    readonly resolvedTypeReferenceDirective: ResolvedTypeReferenceDirective | undefined;
    readonly failedLookupLocations: string[];
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
    // TODO: later handle this in better way in builder host instead once the api for tsbuild finalizes and doesn't use compilerHost as base
    createDirectory?(directory: string): void;
    getSymlinks?(): QReadonlyMap<string>;
  }
  export type SourceOfProjectReferenceRedirect = string | true;
  export interface ResolvedProjectReferenceCallbacks {
    getSourceOfProjectReferenceRedirect(fileName: string): SourceOfProjectReferenceRedirect | undefined;
    forEachResolvedProjectReference<T>(cb: (resolvedProjectReference: ResolvedProjectReference | undefined, resolvedProjectReferencePath: Path) => T | undefined): T | undefined;
  }
  export const enum TransformFlags {
    None = 0,
    // Facts
    // - Flags used to indicate that a node or subtree contains syntax that requires transformation.
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
    // Markers
    // - Flags used to indicate that a subtree contains a specific transformation.
    ContainsTypeScriptClassSyntax = 1 << 11, // Decorators, Property Initializers, Parameter Property Initializers
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
    // Please leave this as 1 << 29.
    // It is the maximum bit we can set before we outgrow the size of a v8 small integer (SMI) on an x86 system.
    // It is a good reminder of how much room we have left
    HasComputedFlags = 1 << 29, // Transform flags have been computed.
    // Assertions
    // - Bitmasks that are used to assert facts about the syntax of a node and its subtree.
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
    // Scope Exclusions
    // - Bitmasks that exclude flags from propagating out of a specific context
    //   into the subtree flags of their container.
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
    // Propagating flags
    // - Bitmasks for flags that should propagate from a child
    PropertyNamePropagatingFlags = ContainsLexicalThis,
    // Masks
    // - Additional bitmasks
  }
  export interface SourceMapRange extends TextRange {
    source?: SourceMapSource;
  }
  export interface SourceMapSource {
    fileName: string;
    text: string;
    lineMap: readonly number[];
    skipTrivia?: (pos: number) => number;
  }
  export interface EmitNode {
    annotatedNodes?: Node[]; // Tracks Parse-tree nodes with EmitNodes for eventual cleanup.
    flags: EmitFlags; // Flags that customize emit
    leadingComments?: SynthesizedComment[]; // Synthesized leading comments
    trailingComments?: SynthesizedComment[]; // Synthesized trailing comments
    commentRange?: TextRange; // The text range to use when emitting leading or trailing comments
    sourceMapRange?: SourceMapRange; // The text range to use when emitting leading or trailing source mappings
    tokenSourceMapRanges?: (SourceMapRange | undefined)[]; // The text range to use when emitting source mappings for tokens
    constantValue?: string | number; // The constant value of an expression
    externalHelpersModuleName?: Identifier; // The local name for an imported helpers module
    externalHelpers?: boolean;
    helpers?: EmitHelper[]; // Emit helpers for the node
    startsOnNewLine?: boolean; // If the node should begin on a new line
  }
  export const enum EmitFlags {
    None = 0,
    SingleLine = 1 << 0, // The contents of this node should be emitted on a single line.
    AdviseOnEmitNode = 1 << 1, // The printer should invoke the onEmitNode callback when printing this node.
    NoSubstitution = 1 << 2, // Disables further substitution of an expression.
    CapturesThis = 1 << 3, // The function captures a lexical `this`
    NoLeadingSourceMap = 1 << 4, // Do not emit a leading source map location for this node.
    NoTrailingSourceMap = 1 << 5, // Do not emit a trailing source map location for this node.
    NoSourceMap = NoLeadingSourceMap | NoTrailingSourceMap, // Do not emit a source map location for this node.
    NoNestedSourceMaps = 1 << 6, // Do not emit source map locations for children of this node.
    NoTokenLeadingSourceMaps = 1 << 7, // Do not emit leading source map location for token nodes.
    NoTokenTrailingSourceMaps = 1 << 8, // Do not emit trailing source map location for token nodes.
    NoTokenSourceMaps = NoTokenLeadingSourceMaps | NoTokenTrailingSourceMaps, // Do not emit source map locations for tokens of this node.
    NoLeadingComments = 1 << 9, // Do not emit leading comments for this node.
    NoTrailingComments = 1 << 10, // Do not emit trailing comments for this node.
    NoComments = NoLeadingComments | NoTrailingComments, // Do not emit comments for this node.
    NoNestedComments = 1 << 11,
    HelperName = 1 << 12, // The Identifier refers to an *unscoped* emit helper (one that is emitted at the top of the file)
    ExportName = 1 << 13, // Ensure an export prefix is added for an identifier that points to an exported declaration with a local name (see SymbolFlags.ExportHasLocal).
    LocalName = 1 << 14, // Ensure an export prefix is not added for an identifier that points to an exported declaration.
    InternalName = 1 << 15, // The name is internal to an ES5 class body function.
    Indented = 1 << 16, // Adds an explicit extra indentation level for class and function bodies when printing (used to match old emitter).
    NoIndentation = 1 << 17, // Do not indent the node.
    AsyncFunctionBody = 1 << 18,
    ReuseTempVariableScope = 1 << 19, // Reuse the existing temp variable scope during emit.
    CustomPrologue = 1 << 20, // Treat the statement as if it were a prologue directive (NOTE: Prologue directives are *not* transformed).
    NoHoisting = 1 << 21, // Do not hoist this declaration in --module system
    HasEndOfDeclarationMarker = 1 << 22, // Declaration has an associated NotEmittedStatement to mark the end of the declaration
    Iterator = 1 << 23, // The expression to a `yield*` should be treated as an Iterator when down-leveling, not an Iterable.
    NoAsciiEscaping = 1 << 24, // When synthesizing nodes that lack an original node or textSourceNode, we want to write the text on the node with ASCII escaping substitutions.
    TypeScriptClassWrapper = 1 << 25, // The node is an IIFE class wrapper created by the ts transform.
    NeverApplyImportHelper = 1 << 26, // Indicates the node should never be wrapped with an import star helper (because, for example, it imports tslib itself)
    IgnoreSourceNewlines = 1 << 27, // Overrides `printerOptions.preserveSourceNewlines` to print this node (and all descendants) with default whitespace.
  }
  export interface EmitHelper {
    readonly name: string; // A unique name for this helper.
    readonly scoped: boolean; // Indicates whether the helper MUST be emitted in the current scope.
    readonly text: string | ((node: EmitHelperUniqueNameCallback) => string); // ES3-compatible raw script text, or a function yielding such a string
    readonly priority?: number; // Helpers with a higher priority are emitted earlier than other helpers on the node.
    readonly dependencies?: EmitHelper[];
  }
  export interface UnscopedEmitHelper extends EmitHelper {
    readonly scoped: false; // Indicates whether the helper MUST be emitted in the current scope.
    readonly importName?: string; // The name of the helper to use when importing via `--importHelpers`.
    readonly text: string; // ES3-compatible raw script text, or a function yielding such a string
  }
  export type UniqueNameHandler = (baseName: string, checkFn?: (name: string) => boolean, optimistic?: boolean) => string;
  export type EmitHelperUniqueNameCallback = (name: string) => string;
  export const enum ExternalEmitHelpers {
    Extends = 1 << 0, // __extends (used by the ES2015 class transformation)
    Assign = 1 << 1, // __assign (used by Jsx and ESNext object spread transformations)
    Rest = 1 << 2, // __rest (used by ESNext object rest transformation)
    Decorate = 1 << 3, // __decorate (used by TypeScript decorators transformation)
    Metadata = 1 << 4, // __metadata (used by TypeScript decorators transformation)
    Param = 1 << 5, // __param (used by TypeScript decorators transformation)
    Awaiter = 1 << 6, // __awaiter (used by ES2017 async functions transformation)
    Generator = 1 << 7, // __generator (used by ES2015 generator transformation)
    Values = 1 << 8, // __values (used by ES2015 for..of and yield* transformations)
    Read = 1 << 9, // __read (used by ES2015 iterator destructuring transformation)
    Spread = 1 << 10, // __spread (used by ES2015 array spread and argument list spread transformations)
    SpreadArrays = 1 << 11, // __spreadArrays (used by ES2015 array spread and argument list spread transformations)
    Await = 1 << 12, // __await (used by ES2017 async generator transformation)
    AsyncGenerator = 1 << 13, // __asyncGenerator (used by ES2017 async generator transformation)
    AsyncDelegator = 1 << 14, // __asyncDelegator (used by ES2017 async generator yield* transformation)
    AsyncValues = 1 << 15, // __asyncValues (used by ES2017 for..await..of transformation)
    ExportStar = 1 << 16, // __exportStar (used by CommonJS/AMD/UMD module transformation)
    MakeTemplateObject = 1 << 17, // __makeTemplateObject (used for constructing template string array objects)
    ClassPrivateFieldGet = 1 << 18, // __classPrivateFieldGet (used by the class private field transformation)
    ClassPrivateFieldSet = 1 << 19, // __classPrivateFieldSet (used by the class private field transformation)
    CreateBinding = 1 << 20, // __createBinding (use by the module transform for (re)exports and namespace imports)
    FirstEmitHelper = Extends,
    LastEmitHelper = CreateBinding,
    // Helpers included by ES2015 for..of
    ForOfIncludes = Values,
    // Helpers included by ES2017 for..await..of
    ForAwaitOfIncludes = AsyncValues,
    // Helpers included by ES2017 async generators
    AsyncGeneratorIncludes = Await | AsyncGenerator,
    // Helpers included by yield* in ES2017 async generators
    AsyncDelegatorIncludes = Await | AsyncDelegator | AsyncValues,
    // Helpers included by ES2015 spread
    SpreadIncludes = Read | Spread,
  }
  export const enum EmitHint {
    SourceFile, // Emitting a SourceFile
    Expression, // Emitting an Expression
    IdentifierName, // Emitting an IdentifierName
    MappedTypeParameter, // Emitting a TypeParameterDeclaration inside of a MappedTypeNode
    Unspecified, // Emitting an otherwise unspecified node
    EmbeddedStatement, // Emitting an embedded statement
    JsxAttributeValue, // Emitting a JSX attribute value
  }
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
    InParameters = 1 << 0, // currently visiting a parameter list
    VariablesHoistedInParameters = 1 << 1, // a temp variable was hoisted while visiting a parameter list
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
  export interface BundleFileSectionBase extends TextRange {
    kind: BundleFileSectionKind;
    data?: string;
  }
  export interface BundleFilePrologue extends BundleFileSectionBase {
    kind: BundleFileSectionKind.Prologue;
    data: string;
  }
  export interface BundleFileEmitHelpers extends BundleFileSectionBase {
    kind: BundleFileSectionKind.EmitHelpers;
    data: string;
  }
  export interface BundleFileHasNoDefaultLib extends BundleFileSectionBase {
    kind: BundleFileSectionKind.NoDefaultLib;
  }
  export interface BundleFileReference extends BundleFileSectionBase {
    kind: BundleFileSectionKind.Reference | BundleFileSectionKind.Type | BundleFileSectionKind.Lib;
    data: string;
  }
  export interface BundleFilePrepend extends BundleFileSectionBase {
    kind: BundleFileSectionKind.Prepend;
    data: string;
    texts: BundleFileTextLike[];
  }
  export type BundleFileTextLikeKind = BundleFileSectionKind.Text | BundleFileSectionKind.Internal;
  export interface BundleFileTextLike extends BundleFileSectionBase {
    kind: BundleFileTextLikeKind;
  }
  export type BundleFileSection = BundleFilePrologue | BundleFileEmitHelpers | BundleFileHasNoDefaultLib | BundleFileReference | BundleFilePrepend | BundleFileTextLike;
  export interface SourceFilePrologueDirectiveExpression extends TextRange {
    text: string;
  }
  export interface SourceFilePrologueDirective extends TextRange {
    expression: SourceFilePrologueDirectiveExpression;
  }
  export interface SourceFilePrologueInfo {
    file: number;
    text: string;
    directives: SourceFilePrologueDirective[];
  }
  export interface SourceFileInfo {
    // List of helpers in own source files emitted if no prepend is present
    helpers?: string[];
    prologues?: SourceFilePrologueInfo[];
  }
  export interface BundleFileInfo {
    sections: BundleFileSection[];
    sources?: SourceFileInfo;
  }
  export interface BundleBuildInfo {
    js?: BundleFileInfo;
    dts?: BundleFileInfo;
    commonSourceDirectory: string;
    sourceFiles: readonly string[];
  }
  export interface BuildInfo {
    bundle?: BundleBuildInfo;
    program?: ProgramBuildInfo;
    version: string;
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
  export interface RawSourceMap {
    version: 3;
    file: string;
    sourceRoot?: string | null;
    sources: string[];
    sourcesContent?: (string | null)[] | null;
    mappings: string;
    names?: string[] | null;
  }
  export interface SourceMapGenerator {
    getSources(): readonly string[];
    addSource(fileName: string): number;
    setSourceContent(sourceIndex: number, content: string | null): void;
    addName(name: string): number;
    addMapping(generatedLine: number, generatedCharacter: number): void;
    addMapping(generatedLine: number, generatedCharacter: number, sourceIndex: number, sourceLine: number, sourceCharacter: number, nameIndex?: number): void;
    appendSourceMap(generatedLine: number, generatedCharacter: number, sourceMap: RawSourceMap, sourceMapPath: string, start?: LineAndChar, end?: LineAndChar): void;
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
    getProbableSymlinks?(files: readonly SourceFile[]): QReadonlyMap<string>;
    getGlobalTypingsCacheLocation?(): string | undefined;
    getSourceFiles(): readonly SourceFile[];
    readonly redirectTargetsMap: RedirectTargetsMap;
    getProjectReferenceRedirect(fileName: string): string | undefined;
    isSourceOfProjectReferenceRedirect(fileName: string): boolean;
  }
  // Note: this used to be deprecated in our public API, but is still used internally
  export interface SymbolTracker {
    // Called when the symbol writer encounters a symbol to write.  Currently only used by the
    // declaration emitter to help determine if it should patch up the final declaration file
    // with import statements it previously saw (but chose not to emit).
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
    // Adds a diagnostic to this diagnostic collection.
    add(diagnostic: Diagnostic): void;
    // Returns the first existing diagnostic that is equivalent to the given one (sans related information)
    lookup(diagnostic: Diagnostic): Diagnostic | undefined;
    // Gets all the diagnostics that aren't associated with a file.
    getGlobalDiagnostics(): Diagnostic[];
    // If fileName is provided, gets all the diagnostics associated with that file name.
    // Otherwise, returns all the diagnostics (global and file associated) in this collection.
    getDiagnostics(): Diagnostic[];
    getDiagnostics(fileName: string): DiagnosticWithLocation[];
    reattachFileDiagnostics(newFile: SourceFile): void;
  }
  export const enum ListFormat {
    None = 0,
    // Line separators
    SingleLine = 0, // Prints the list on a single line (default).
    MultiLine = 1 << 0, // Prints the list on multiple lines.
    PreserveLines = 1 << 1, // Prints the list using line preservation if possible.
    LinesMask = SingleLine | MultiLine | PreserveLines,
    // Delimiters
    NotDelimited = 0, // There is no delimiter between list items (default).
    BarDelimited = 1 << 2, // Each list item is space-and-bar (" |") delimited.
    AmpersandDelimited = 1 << 3, // Each list item is space-and-ampersand (" &") delimited.
    CommaDelimited = 1 << 4, // Each list item is comma (",") delimited.
    AsteriskDelimited = 1 << 5, // Each list item is asterisk ("\n *") delimited, used with JSDoc.
    DelimitersMask = BarDelimited | AmpersandDelimited | CommaDelimited | AsteriskDelimited,
    AllowTrailingComma = 1 << 6, // Write a trailing comma (",") if present.
    // Whitespace
    Indented = 1 << 7, // The list should be indented.
    SpaceBetweenBraces = 1 << 8, // Inserts a space after the opening brace and before the closing brace.
    SpaceBetweenSiblings = 1 << 9, // Inserts a space between each sibling node.
    // Brackets/Braces
    Braces = 1 << 10, // The list is surrounded by "{" and "}".
    Parenthesis = 1 << 11, // The list is surrounded by "(" and ")".
    AngleBrackets = 1 << 12, // The list is surrounded by "<" and ">".
    SquareBrackets = 1 << 13, // The list is surrounded by "[" and "]".
    BracketsMask = Braces | Parenthesis | AngleBrackets | SquareBrackets,
    OptionalIfUndefined = 1 << 14, // Do not emit brackets if the list is undefined.
    OptionalIfEmpty = 1 << 15, // Do not emit brackets if the list is empty.
    Optional = OptionalIfUndefined | OptionalIfEmpty,
    // Other
    PreferNewLine = 1 << 16, // Prefer adding a LineTerminator between synthesized nodes.
    NoTrailingNewLine = 1 << 17, // Do not emit a trailing NewLine for a MultiLine list.
    NoInterveningComments = 1 << 18, // Do not emit comments between each node
    NoSpaceIfEmpty = 1 << 19, // If the literal is empty, do not add spaces between braces.
    SingleElement = 1 << 20,
    SpaceAfterList = 1 << 21, // Add space after list
    // Precomputed Formats
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
    name: TName; // Determines the name of the key in the resulting parsed type, type parameter to cause literal type inference
    optional?: boolean;
    captureSpan?: boolean;
  }
  export interface PragmaDefinition<T1 extends string = string, T2 extends string = string, T3 extends string = string, T4 extends string = string> {
    args?:
      | readonly [PragmaArgumentSpecification<T1>]
      | readonly [PragmaArgumentSpecification<T1>, PragmaArgumentSpecification<T2>]
      | readonly [PragmaArgumentSpecification<T1>, PragmaArgumentSpecification<T2>, PragmaArgumentSpecification<T3>]
      | readonly [PragmaArgumentSpecification<T1>, PragmaArgumentSpecification<T2>, PragmaArgumentSpecification<T3>, PragmaArgumentSpecification<T4>];
    // If not present, defaults to PragmaKindFlags.Default
    kind?: PragmaKindFlags;
  }
  // While not strictly a type, this is here because `PragmaMap` needs to be here to be used with `SourceFile`, and we don't
  //  fancy effectively defining it twice, once in value-space and once in type-space
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
  }[Extract<keyof T, number>]; // The mapped type maps over only the tuple members, but this reindex gets _all_ members - by extracting only `number` keys, we get only the tuple members
  type PragmaArgumentType<KPrag extends keyof ConcretePragmaSpecs> = ConcretePragmaSpecs[KPrag] extends {
    args: readonly PragmaArgumentSpecification<any>[];
  }
    ? UnionToIntersection<ArgumentDefinitionToFieldUnion<ConcretePragmaSpecs[KPrag]['args']>>
    : never;
  type ConcretePragmaSpecs = typeof commentPragmas;
  export type PragmaPseudoMap = { [K in keyof ConcretePragmaSpecs]: { arguments: PragmaArgumentType<K>; range: CommentRange } };
  export type PragmaPseudoMapEntry = { [K in keyof PragmaPseudoMap]: { name: K; args: PragmaPseudoMap[K] } }[keyof PragmaPseudoMap];
  export interface ReadonlyPragmaMap extends QReadonlyMap<PragmaPseudoMap[keyof PragmaPseudoMap] | PragmaPseudoMap[keyof PragmaPseudoMap][]> {
    get<K extends keyof PragmaPseudoMap>(k: K): PragmaPseudoMap[K] | PragmaPseudoMap[K][];
    // qpx-fixme forEach(action: <K extends keyof PragmaPseudoMap>(v: PragmaPseudoMap[K] | PragmaPseudoMap[K][], k: K) => void): void;
  }
  export interface PragmaMap extends QMap<PragmaPseudoMap[keyof PragmaPseudoMap] | PragmaPseudoMap[keyof PragmaPseudoMap][]>, ReadonlyPragmaMap {
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
  export interface PseudoBigInt {
    negative: boolean;
    base10Value: string;
  }
  export type ErrorCallback = (m: DiagnosticMessage, length: number) => void;
}
