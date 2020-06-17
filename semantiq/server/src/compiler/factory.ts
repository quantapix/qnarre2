namespace qnr {
  export namespace qf {
    export type ArrayBindingElement = BindingElement | OmittedExpression;
    export namespace ArrayBindingElement {
      export const also = [Syntax.BindingElement, Syntax.OmittedExpression];
    }

    export interface ArrayLiteralExpression extends PrimaryExpression {
      kind: Syntax.ArrayLiteralExpression;
      elements: Nodes<Expression>;
      multiLine?: boolean;
    }
    export namespace ArrayLiteralExpression {
      export const kind = Syntax.ArrayLiteralExpression;
    }

    export interface ArrayBindingPattern extends Node {
      kind: Syntax.ArrayBindingPattern;
      parent: VariableDeclaration | ParameterDeclaration | BindingElement;
      elements: Nodes<ArrayBindingElement>;
    }
    export namespace ArrayBindingPattern {
      export const kind = Syntax.ArrayBindingPattern;
      export function create(es: readonly ArrayBindingElement[]) {
        const n = qn.createSynthesized(Syntax.ArrayBindingPattern);
        n.elements = qns.create(es);
        return n;
      }
      export function update(n: ArrayBindingPattern, es: readonly ArrayBindingElement[]) {
        return n.elements !== es ? updateNode(create(es), n) : n;
      }
    }

    export interface ArrayTypeNode extends TypeNode {
      kind: Syntax.ArrayType;
      elementType: TypeNode;
    }
    export namespace ArrayTypeNode {
      export const kind = Syntax.ArrayType;
      export function create(t: TypeNode) {
        const n = qn.createSynthesized(Syntax.ArrayType);
        n.elementType = parenthesizeArrayTypeMember(t);
        return n;
      }
      export function update(n: ArrayTypeNode, t: TypeNode) {
        return n.elementType !== t ? updateNode(create(t), n) : n;
      }
    }

    export interface ArrowFunction extends Expression, FunctionLikeDeclarationBase, JSDocContainer {
      kind: Syntax.ArrowFunction;
      equalsGreaterThanToken: EqualsGreaterThanToken;
      body: ConciseBody;
      name: never;
    }
    export namespace ArrowFunction {
      export const kind = Syntax.ArrowFunction;
    }

    export interface AsExpression extends Expression {
      kind: Syntax.AsExpression;
      expression: Expression;
      type: TypeNode;
    }
    export namespace AsExpression {
      export const kind = Syntax.AsExpression;
    }

    export type AssignmentPattern = ArrayLiteralExpression | ObjectLiteralExpression;
    export namespace AssignmentPattern {
      export const kind = Syntax.ArrayLiteralExpression;
      export const also = [Syntax.ObjectLiteralExpression];
    }

    export interface AwaitExpression extends UnaryExpression {
      kind: Syntax.AwaitExpression;
      expression: UnaryExpression;
    }
    export namespace AwaitExpression {
      export const kind = Syntax.AwaitExpression;
    }

    export interface BigIntLiteral extends LiteralExpression {
      kind: Syntax.BigIntLiteral;
    }
    export namespace BigIntLiteral {
      export const kind = Syntax.BigIntLiteral;
      export function create(t: string) {
        const n = qn.createSynthesized(Syntax.BigIntLiteral);
        n.text = t;
        return n;
      }
      export function expression(e: Expression) {
        return (
          e.kind === Syntax.BigIntLiteral ||
          (e.kind === Syntax.PrefixUnaryExpression && (e as PrefixUnaryExpression).operator === Syntax.MinusToken && (e as PrefixUnaryExpression).operand.kind === Syntax.BigIntLiteral)
        );
      }
    }

    export interface BinaryExpression extends Expression, Declaration {
      kind: Syntax.BinaryExpression;
      left: Expression;
      operatorToken: BinaryOperatorToken;
      right: Expression;
    }
    export namespace BinaryExpression {
      export const kind = Syntax.BinaryExpression;
    }

    export interface BindingElement extends NamedDeclaration {
      kind: Syntax.BindingElement;
      parent: BindingPattern;
      propertyName?: PropertyName;
      dot3Token?: Dot3Token;
      name: BindingName;
      initializer?: Expression;
    }
    export namespace BindingElement {
      export const kind = Syntax.BindingElement;
      export function create(d: Dot3Token | undefined, p: string | PropertyName | undefined, b: string | BindingName, i?: Expression) {
        const n = qn.createSynthesized(Syntax.BindingElement);
        n.dot3Token = d;
        n.propertyName = asName(p);
        n.name = asName(b);
        n.initializer = i;
        return n;
      }
      export function update(n: BindingElement, d: Dot3Token | undefined, p: PropertyName | undefined, b: BindingName, i?: Expression) {
        return n.propertyName !== p || n.dot3Token !== d || n.name !== b || n.initializer !== i ? updateNode(create(d, p, b, i), n) : n;
      }
    }

    export type BindingPattern = ArrayBindingPattern | ObjectBindingPattern;
    export namespace BindingPattern {
      export const kind = Syntax.ArrayBindingPattern;
      export const also = [Syntax.ObjectBindingPattern];
      export function isEmptyBindingPattern(n: BindingName): n is BindingPattern {
        if (qn.is.kind(BindingPattern, n)) return qa.every(n.elements, isEmptyBindingElement);
        return false;
      }
    }

    export interface Block extends Statement {
      kind: Syntax.Block;
      statements: Nodes<Statement>;
      multiLine?: boolean;
    }
    export namespace Block {
      export const kind = Syntax.Block;
    }

    export type BlockLike = SourceFile | Block | ModuleBlock | CaseOrDefaultClause;

    export interface BreakStatement extends Statement {
      kind: Syntax.BreakStatement;
      label?: Identifier;
    }
    export namespace BreakStatement {
      export const kind = Syntax.BreakStatement;
    }

    export interface Bundle extends Node {
      kind: Syntax.Bundle;
      prepends: readonly (InputFiles | UnparsedSource)[];
      sourceFiles: readonly SourceFile[];
      syntheticFileReferences?: readonly FileReference[];
      syntheticTypeReferences?: readonly FileReference[];
      syntheticLibReferences?: readonly FileReference[];
      hasNoDefaultLib?: boolean;
    }
    export namespace Bundle {
      export const kind = Syntax.Bundle;
    }

    export interface CallExpression extends LeftHandSideExpression, Declaration {
      kind: Syntax.CallExpression;
      expression: LeftHandSideExpression;
      questionDotToken?: QuestionDotToken;
      typeArguments?: Nodes<TypeNode>;
      arguments: Nodes<Expression>;
    }
    export namespace CallExpression {
      export const kind = Syntax.CallExpression;
    }

    export interface CallSignatureDeclaration extends SignatureDeclarationBase, TypeElement {
      kind: Syntax.CallSignature;
    }
    export namespace CallSignatureDeclaration {
      export const kind = Syntax.CallSignature;
      export function create(ts: readonly TypeParameterDeclaration[] | undefined, ps: readonly ParameterDeclaration[], t?: TypeNode) {
        return SignatureDeclaration.create(Syntax.CallSignature, ts, ps, t) as CallSignatureDeclaration;
      }
      export function update(n: CallSignatureDeclaration, ts: Nodes<TypeParameterDeclaration> | undefined, ps: Nodes<ParameterDeclaration>, t?: TypeNode) {
        return SignatureDeclaration.update(n, ts, ps, t);
      }
    }

    export interface CaseBlock extends Node {
      kind: Syntax.CaseBlock;
      parent: SwitchStatement;
      clauses: Nodes<CaseOrDefaultClause>;
    }
    export namespace CaseBlock {
      export const kind = Syntax.CaseBlock;
    }

    export interface CaseClause extends Node {
      kind: Syntax.CaseClause;
      parent: CaseBlock;
      expression: Expression;
      statements: Nodes<Statement>;
      fallthroughFlowNode?: FlowNode;
    }
    export namespace CaseClause {
      export const kind = Syntax.CaseClause;
    }

    export interface CatchClause extends Node {
      kind: Syntax.CatchClause;
      parent: TryStatement;
      variableDeclaration?: VariableDeclaration;
      block: Block;
    }
    export namespace CatchClause {
      export const kind = Syntax.CatchClause;
    }

    export interface ClassDeclaration extends ClassLikeDeclarationBase, DeclarationStatement {
      kind: Syntax.ClassDeclaration;
      name?: Identifier;
    }
    export namespace ClassDeclaration {
      export const kind = Syntax.ClassDeclaration;
    }

    export interface ClassExpression extends ClassLikeDeclarationBase, PrimaryExpression {
      kind: Syntax.ClassExpression;
    }
    export namespace ClassExpression {
      export const kind = Syntax.ClassExpression;
    }

    export interface ClassLikeDeclarationBase extends NamedDeclaration, JSDocContainer {
      kind: Syntax.ClassDeclaration | Syntax.ClassExpression;
      name?: Identifier;
      typeParameters?: Nodes<TypeParameterDeclaration>;
      heritageClauses?: Nodes<HeritageClause>;
      members: Nodes<ClassElement>;
    }
    export type ClassLikeDeclaration = ClassDeclaration | ClassExpression;

    export interface ComputedPropertyName extends Node {
      kind: Syntax.ComputedPropertyName;
      parent: Declaration;
      expression: Expression;
    }
    export namespace ComputedPropertyName {
      export const kind = Syntax.ComputedPropertyName;
      export function create(e: Expression) {
        const n = qn.createSynthesized(Syntax.ComputedPropertyName);
        n.expression = isCommaSequence(e) ? createParen(e) : e;
        return n;
      }
      export function update(n: ComputedPropertyName, e: Expression) {
        return n.expression !== e ? updateNode(create(e), n) : n;
      }
    }

    export interface ConditionalExpression extends Expression {
      kind: Syntax.ConditionalExpression;
      condition: Expression;
      questionToken: QuestionToken;
      whenTrue: Expression;
      colonToken: ColonToken;
      whenFalse: Expression;
    }
    export namespace ConditionalExpression {
      export const kind = Syntax.ConditionalExpression;
    }

    export interface ConditionalTypeNode extends TypeNode {
      kind: Syntax.ConditionalType;
      checkType: TypeNode;
      extendsType: TypeNode;
      trueType: TypeNode;
      falseType: TypeNode;
    }
    export namespace ConditionalTypeNode {
      export const kind = Syntax.ConditionalType;
      export function create(c: TypeNode, e: TypeNode, t: TypeNode, f: TypeNode) {
        const n = qn.createSynthesized(Syntax.ConditionalType);
        n.checkType = parenthesizeConditionalTypeMember(c);
        n.extendsType = parenthesizeConditionalTypeMember(e);
        n.trueType = t;
        n.falseType = f;
        return n;
      }
      export function update(n: ConditionalTypeNode, c: TypeNode, e: TypeNode, t: TypeNode, f: TypeNode) {
        return n.checkType !== c || n.extendsType !== e || n.trueType !== t || n.falseType !== f ? updateNode(create(c, e, t, f), n) : n;
      }
    }

    export interface ConstructorDeclaration extends FunctionLikeDeclarationBase, ClassElement, JSDocContainer {
      kind: Syntax.Constructor;
      parent: ClassLikeDeclaration;
      body?: FunctionBody;
    }
    export namespace ConstructorDeclaration {
      export const kind = Syntax.Constructor;
      export function create(ds: readonly Decorator[] | undefined, ms: readonly Modifier[] | undefined, ps: readonly ParameterDeclaration[], b?: Block) {
        const n = qn.createSynthesized(Syntax.Constructor);
        n.decorators = qns.from(ds);
        n.modifiers = qns.from(ms);
        n.typeParameters = undefined;
        n.parameters = qns.create(ps);
        n.type = undefined;
        n.body = b;
        return n;
      }
      export function update(n: ConstructorDeclaration, ds: readonly Decorator[] | undefined, ms: readonly Modifier[] | undefined, ps: readonly ParameterDeclaration[], b?: Block) {
        return n.decorators !== ds || n.modifiers !== ms || n.parameters !== ps || n.body !== b ? updateNode(create(ds, ms, ps, b), n) : n;
      }
    }

    export interface ConstructorTypeNode extends FunctionOrConstructorTypeNodeBase {
      kind: Syntax.ConstructorType;
    }
    export namespace ConstructorTypeNode {
      export const kind = Syntax.ConstructorType;
      export function create(ts: readonly TypeParameterDeclaration[] | undefined, ps: readonly ParameterDeclaration[], t?: TypeNode) {
        return SignatureDeclaration.create(Syntax.ConstructorType, ts, ps, t) as ConstructorTypeNode;
      }
      export function update(n: ConstructorTypeNode, ts: Nodes<TypeParameterDeclaration> | undefined, ps: Nodes<ParameterDeclaration>, t?: TypeNode) {
        return SignatureDeclaration.update(n, ts, ps, t);
      }
    }

    export interface ConstructSignatureDeclaration extends SignatureDeclarationBase, TypeElement {
      kind: Syntax.ConstructSignature;
    }
    export namespace ConstructSignatureDeclaration {
      export const kind = Syntax.ConstructSignature;
      export function create(ts: readonly TypeParameterDeclaration[] | undefined, ps: readonly ParameterDeclaration[], t?: TypeNode) {
        return SignatureDeclaration.create(Syntax.ConstructSignature, ts, ps, t) as ConstructSignatureDeclaration;
      }
      export function update(n: ConstructSignatureDeclaration, ts: Nodes<TypeParameterDeclaration> | undefined, ps: Nodes<ParameterDeclaration>, t?: TypeNode) {
        return SignatureDeclaration.update(n, ts, ps, t);
      }
    }

    export interface ContinueStatement extends Statement {
      kind: Syntax.ContinueStatement;
      label?: Identifier;
    }
    export namespace ContinueStatement {
      export const kind = Syntax.ContinueStatement;
    }

    export interface DebuggerStatement extends Statement {
      kind: Syntax.DebuggerStatement;
    }
    export namespace DebuggerStatement {
      export const kind = Syntax.DebuggerStatement;
    }

    export interface Decorator extends Node {
      kind: Syntax.Decorator;
      parent: NamedDeclaration;
      expression: LeftHandSideExpression;
    }
    export namespace Decorator {
      export const kind = Syntax.Decorator;
    }

    export interface DefaultClause extends Node {
      kind: Syntax.DefaultClause;
      parent: CaseBlock;
      statements: Nodes<Statement>;
      fallthroughFlowNode?: FlowNode;
    }
    export namespace DefaultClause {
      export const kind = Syntax.DefaultClause;
    }

    export interface DeleteExpression extends UnaryExpression {
      kind: Syntax.DeleteExpression;
      expression: UnaryExpression;
    }
    export namespace DeleteExpression {
      export const kind = Syntax.DeleteExpression;
    }

    export interface DoStatement extends IterationStatement {
      kind: Syntax.DoStatement;
      expression: Expression;
    }
    export namespace DoStatement {
      export const kind = Syntax.DoStatement;
    }

    export interface ElementAccessExpression extends MemberExpression {
      kind: Syntax.ElementAccessExpression;
      expression: LeftHandSideExpression;
      questionDotToken?: QuestionDotToken;
      argumentExpression: Expression;
    }
    export namespace ElementAccessExpression {
      export const kind = Syntax.ElementAccessExpression;
    }

    export interface EmptyStatement extends Statement {
      kind: Syntax.EmptyStatement;
    }
    export namespace EmptyStatement {
      export const kind = Syntax.EmptyStatement;
    }

    export interface EnumDeclaration extends DeclarationStatement, JSDocContainer {
      kind: Syntax.EnumDeclaration;
      name: Identifier;
      members: Nodes<EnumMember>;
    }
    export namespace EnumDeclaration {
      export const kind = Syntax.EnumDeclaration;
    }

    export interface EnumMember extends NamedDeclaration, JSDocContainer {
      kind: Syntax.EnumMember;
      parent: EnumDeclaration;
      name: PropertyName;
      initializer?: Expression;
    }
    export namespace EnumMember {
      export const kind = Syntax.EnumMember;
    }

    export interface ExpressionStatement extends Statement, JSDocContainer {
      kind: Syntax.ExpressionStatement;
      expression: Expression;
    }
    export namespace ExpressionStatement {
      export const kind = Syntax.ExpressionStatement;
    }

    export interface ExportAssignment extends DeclarationStatement {
      kind: Syntax.ExportAssignment;
      parent: SourceFile;
      isExportEquals?: boolean;
      expression: Expression;
    }
    export namespace ExportAssignment {
      export const kind = Syntax.ExportAssignment;
    }

    export interface ExportDeclaration extends DeclarationStatement, JSDocContainer {
      kind: Syntax.ExportDeclaration;
      parent: SourceFile | ModuleBlock;
      isTypeOnly: boolean;
      exportClause?: NamedExportBindings;
      moduleSpecifier?: Expression;
    }
    export namespace ExportDeclaration {
      export const kind = Syntax.ExportDeclaration;
    }

    export namespace ExportSpecifier {
      export const kind = Syntax.ExportSpecifier;
    }
    export interface ExportSpecifier extends NamedDeclaration {
      kind: Syntax.ExportSpecifier;
      parent: NamedExports;
      propertyName?: Identifier;
      name: Identifier;
    }

    export interface ExpressionWithTypeArguments extends NodeWithTypeArguments {
      kind: Syntax.ExpressionWithTypeArguments;
      parent: HeritageClause | JSDocAugmentsTag | JSDocImplementsTag;
      expression: LeftHandSideExpression;
    }
    export namespace ExpressionWithTypeArguments {
      export const kind = Syntax.ExpressionWithTypeArguments;
    }

    export interface ExternalModuleReference extends Node {
      kind: Syntax.ExternalModuleReference;
      parent: ImportEqualsDeclaration;
      expression: Expression;
    }
    export namespace ExternalModuleReference {
      export const kind = Syntax.ExternalModuleReference;
    }

    export type ForInitializer = VariableDeclarationList | Expression;
    export type ForInOrOfStatement = ForInStatement | ForOfStatement;

    export interface ForInStatement extends IterationStatement {
      kind: Syntax.ForInStatement;
      initializer: ForInitializer;
      expression: Expression;
    }
    export namespace ForInStatement {
      export const kind = Syntax.ForInStatement;
    }

    export interface ForOfStatement extends IterationStatement {
      kind: Syntax.ForOfStatement;
      awaitModifier?: AwaitKeywordToken;
      initializer: ForInitializer;
      expression: Expression;
    }
    export namespace ForOfStatement {
      export const kind = Syntax.ForOfStatement;
    }

    export interface ForStatement extends IterationStatement {
      kind: Syntax.ForStatement;
      initializer?: ForInitializer;
      condition?: Expression;
      incrementor?: Expression;
    }
    export namespace ForStatement {
      export const kind = Syntax.ForStatement;
    }

    export interface FunctionDeclaration extends FunctionLikeDeclarationBase, DeclarationStatement {
      kind: Syntax.FunctionDeclaration;
      name?: Identifier;
      body?: FunctionBody;
    }
    export namespace FunctionDeclaration {
      export const kind = Syntax.FunctionDeclaration;
    }

    export interface FunctionExpression extends PrimaryExpression, FunctionLikeDeclarationBase, JSDocContainer {
      kind: Syntax.FunctionExpression;
      name?: Identifier;
      body: FunctionBody;
    }
    export namespace FunctionExpression {
      export const kind = Syntax.FunctionExpression;
    }

    export interface FunctionTypeNode extends FunctionOrConstructorTypeNodeBase {
      kind: Syntax.FunctionType;
    }
    export namespace FunctionTypeNode {
      export const kind = Syntax.FunctionType;
      export function create(ts: readonly TypeParameterDeclaration[] | undefined, ps: readonly ParameterDeclaration[], t?: TypeNode) {
        return SignatureDeclaration.create(Syntax.FunctionType, ts, ps, t) as FunctionTypeNode;
      }
      export function update(n: FunctionTypeNode, ts: Nodes<TypeParameterDeclaration> | undefined, ps: Nodes<ParameterDeclaration>, t?: TypeNode) {
        return SignatureDeclaration.update(n, ts, ps, t);
      }
    }

    export interface GetAccessorDeclaration extends FunctionLikeDeclarationBase, ClassElement, ObjectLiteralElement, JSDocContainer {
      kind: Syntax.GetAccessor;
      parent: ClassLikeDeclaration | ObjectLiteralExpression;
      name: PropertyName;
      body?: FunctionBody;
    }
    export namespace GetAccessorDeclaration {
      export const kind = Syntax.GetAccessor;
      export function create(ds: readonly Decorator[] | undefined, ms: readonly Modifier[] | undefined, p: string | PropertyName, ps: readonly ParameterDeclaration[], t?: TypeNode, b?: Block) {
        const n = qn.createSynthesized(Syntax.GetAccessor);
        n.decorators = qns.from(ds);
        n.modifiers = qns.from(ms);
        n.name = asName(p);
        n.typeParameters = undefined;
        n.parameters = qns.create(ps);
        n.type = t;
        n.body = b;
        return n;
      }
      export function update(
        n: GetAccessorDeclaration,
        ds: readonly Decorator[] | undefined,
        ms: readonly Modifier[] | undefined,
        p: PropertyName,
        ps: readonly ParameterDeclaration[],
        t?: TypeNode,
        b?: Block
      ) {
        return n.decorators !== ds || n.modifiers !== ms || n.name !== p || n.parameters !== ps || n.type !== t || n.body !== b ? updateNode(create(ds, ms, p, ps, t, b), n) : n;
      }
      export function orSetKind(n: Node): n is AccessorDeclaration {
        return n.kind === Syntax.SetAccessor || n.kind === Syntax.GetAccessor;
      }
    }

    export interface HeritageClause extends Node {
      kind: Syntax.HeritageClause;
      parent: InterfaceDeclaration | ClassLikeDeclaration;
      token: Syntax.ExtendsKeyword | Syntax.ImplementsKeyword;
      types: Nodes<ExpressionWithTypeArguments>;
    }
    export namespace HeritageClause {
      export const kind = Syntax.HeritageClause;
    }

    export interface Identifier extends PrimaryExpression, Declaration {
      kind: Syntax.Identifier;
      escapedText: __String;
      originalKeywordKind?: Syntax; // Original syntaxKind which get set so that we can report an error later
      autoGenerateFlags?: GeneratedIdentifierFlags; // Specifies whether to auto-generate the text for an identifier.
      autoGenerateId?: number; // Ensures unique generated identifiers get unique names, but clones get the same name.
      isInJSDocNamespace?: boolean; // if the node is a member in a JSDoc namespace
      typeArguments?: Nodes<TypeNode | TypeParameterDeclaration>; // Only defined on synthesized nodes. Though not syntactically valid, used in emitting diagnostics, quickinfo, and signature help.
      jsdocDotPos?: number; // Identifier occurs in JSDoc-style generic: Id.<T>
    }
    export namespace Identifier {
      export const kind = Syntax.Identifier;
    }

    export interface IfStatement extends Statement {
      kind: Syntax.IfStatement;
      expression: Expression;
      thenStatement: Statement;
      elseStatement?: Statement;
    }
    export namespace IfStatement {
      export const kind = Syntax.IfStatement;
    }

    export interface ImportClause extends NamedDeclaration {
      kind: Syntax.ImportClause;
      parent: ImportDeclaration;
      isTypeOnly: boolean;
      name?: Identifier;
      namedBindings?: NamedImportBindings;
    }
    export namespace ImportClause {
      export const kind = Syntax.ImportClause;
    }

    export interface ImportDeclaration extends Statement {
      kind: Syntax.ImportDeclaration;
      parent: SourceFile | ModuleBlock;
      importClause?: ImportClause;
      moduleSpecifier: Expression;
    }
    export namespace ImportDeclaration {
      export const kind = Syntax.ImportDeclaration;
    }

    export interface ImportEqualsDeclaration extends DeclarationStatement, JSDocContainer {
      kind: Syntax.ImportEqualsDeclaration;
      parent: SourceFile | ModuleBlock;
      name: Identifier;
      moduleReference: ModuleReference;
    }
    export namespace ImportEqualsDeclaration {
      export const kind = Syntax.ImportEqualsDeclaration;
    }

    export interface ImportSpecifier extends NamedDeclaration {
      kind: Syntax.ImportSpecifier;
      parent: NamedImports;
      propertyName?: Identifier;
      name: Identifier;
    }
    export namespace ImportSpecifier {
      export const kind = Syntax.ImportSpecifier;
    }

    export interface ImportTypeNode extends NodeWithTypeArguments {
      kind: Syntax.ImportType;
      isTypeOf?: boolean;
      argument: TypeNode;
      qualifier?: EntityName;
    }
    export namespace ImportTypeNode {
      export const kind = Syntax.ImportType;
      export function create(a: TypeNode, q?: EntityName, ts?: readonly TypeNode[], tof?: boolean) {
        const n = qn.createSynthesized(Syntax.ImportType);
        n.argument = a;
        n.qualifier = q;
        n.typeArguments = parenthesizeTypeParameters(ts);
        n.isTypeOf = tof;
        return n;
      }
      export function update(n: ImportTypeNode, a: TypeNode, q?: EntityName, ts?: readonly TypeNode[], tof?: boolean) {
        return n.argument !== a || n.qualifier !== q || n.typeArguments !== ts || n.isTypeOf !== tof ? updateNode(create(a, q, ts, tof), n) : n;
      }
    }

    export interface IndexedAccessTypeNode extends TypeNode {
      kind: Syntax.IndexedAccessType;
      objectType: TypeNode;
      indexType: TypeNode;
    }
    export namespace IndexedAccessTypeNode {
      export const kind = Syntax.IndexedAccessType;
      export function create(o: TypeNode, i: TypeNode) {
        const n = qn.createSynthesized(Syntax.IndexedAccessType);
        n.objectType = parenthesizeElementTypeMember(o);
        n.indexType = i;
        return n;
      }
      export function update(n: IndexedAccessTypeNode, o: TypeNode, i: TypeNode) {
        return n.objectType !== o || n.indexType !== i ? updateNode(create(o, i), n) : n;
      }
    }

    export interface IndexSignatureDeclaration extends SignatureDeclarationBase, ClassElement, TypeElement {
      kind: Syntax.IndexSignature;
      parent: ObjectTypeDeclaration;
    }
    export namespace IndexSignatureDeclaration {
      export const kind = Syntax.IndexSignature;
      export function create(ds: readonly Decorator[] | undefined, ms: readonly Modifier[] | undefined, ps: readonly ParameterDeclaration[], t: TypeNode): IndexSignatureDeclaration {
        const n = qn.createSynthesized(Syntax.IndexSignature);
        n.decorators = qns.from(ds);
        n.modifiers = qns.from(ms);
        n.parameters = qns.create(ps);
        n.type = t;
        return n;
      }
      export function update(n: IndexSignatureDeclaration, ds: readonly Decorator[] | undefined, ms: readonly Modifier[] | undefined, ps: readonly ParameterDeclaration[], t: TypeNode) {
        return n.parameters !== ps || n.type !== t || n.decorators !== ds || n.modifiers !== ms ? updateNode(create(ds, ms, ps, t), n) : n;
      }
    }

    export interface InferTypeNode extends TypeNode {
      kind: Syntax.InferType;
      typeParameter: TypeParameterDeclaration;
    }
    export namespace InferTypeNode {
      export const kind = Syntax.InferType;
      export function create(p: TypeParameterDeclaration) {
        const n = qn.createSynthesized(Syntax.InferType);
        n.typeParameter = p;
        return n;
      }
      export function update(n: InferTypeNode, p: TypeParameterDeclaration) {
        return n.typeParameter !== p ? updateNode(create(p), n) : n;
      }
    }

    export interface InterfaceDeclaration extends DeclarationStatement, JSDocContainer {
      kind: Syntax.InterfaceDeclaration;
      name: Identifier;
      typeParameters?: Nodes<TypeParameterDeclaration>;
      heritageClauses?: Nodes<HeritageClause>;
      members: Nodes<TypeElement>;
    }
    export namespace InterfaceDeclaration {
      export const kind = Syntax.InterfaceDeclaration;
    }

    export interface IntersectionTypeNode extends TypeNode {
      kind: Syntax.IntersectionType;
      types: Nodes<TypeNode>;
    }
    export namespace IntersectionTypeNode {
      export const kind = Syntax.IntersectionType;
      export function create(ts: readonly TypeNode[]) {
        return UnionTypeNode.orIntersectionCreate(Syntax.IntersectionType, ts) as IntersectionTypeNode;
      }
      export function update(n: IntersectionTypeNode, ts: Nodes<TypeNode>) {
        return UnionTypeNode.orIntersectionUpdate(n, ts);
      }
    }

    export interface JSDoc extends Node {
      kind: Syntax.JSDocComment;
      parent: HasJSDoc;
      tags?: Nodes<JSDocTag>;
      comment?: string;
    }
    export namespace JSDoc {
      export const kind = Syntax.JSDocComment;
    }

    export interface JSDocAllType extends JSDocType {
      kind: Syntax.JSDocAllType;
    }
    export namespace JSDocAllType {
      export const kind = Syntax.JSDocAllType;
    }

    export interface JSDocAugmentsTag extends JSDocTag {
      kind: Syntax.JSDocAugmentsTag;
      class: ExpressionWithTypeArguments & { expression: Identifier | PropertyAccessEntityNameExpression };
    }
    export namespace JSDocAugmentsTag {
      export const kind = Syntax.JSDocAugmentsTag;
    }

    export interface JSDocAuthorTag extends JSDocTag {
      kind: Syntax.JSDocAuthorTag;
    }
    export namespace JSDocAuthorTag {
      export const kind = Syntax.JSDocAuthorTag;
    }

    export interface JSDocCallbackTag extends JSDocTag, NamedDeclaration {
      parent: JSDoc;
      kind: Syntax.JSDocCallbackTag;
      fullName?: JSDocNamespaceDeclaration | Identifier;
      name?: Identifier;
      typeExpression: JSDocSignature;
    }
    export namespace JSDocCallbackTag {
      export const kind = Syntax.JSDocCallbackTag;
    }

    export interface JSDocClassTag extends JSDocTag {
      kind: Syntax.JSDocClassTag;
    }
    export namespace JSDocClassTag {
      export const kind = Syntax.JSDocClassTag;
    }

    export interface JSDocEnumTag extends JSDocTag, Declaration {
      parent: JSDoc;
      kind: Syntax.JSDocEnumTag;
      typeExpression?: JSDocTypeExpression;
    }
    export namespace JSDocEnumTag {
      export const kind = Syntax.JSDocEnumTag;
    }

    export interface JSDocFunctionType extends JSDocType, SignatureDeclarationBase {
      kind: Syntax.JSDocFunctionType;
    }
    export namespace JSDocFunctionType {
      export const kind = Syntax.JSDocFunctionType;
    }

    export interface JSDocImplementsTag extends JSDocTag {
      kind: Syntax.JSDocImplementsTag;
      class: ExpressionWithTypeArguments & { expression: Identifier | PropertyAccessEntityNameExpression };
    }
    export namespace JSDocImplementsTag {
      export const kind = Syntax.JSDocImplementsTag;
    }

    export interface JSDocNonNullableType extends JSDocType {
      kind: Syntax.JSDocNonNullableType;
      type: TypeNode;
    }
    export namespace JSDocNonNullableType {
      export const kind = Syntax.JSDocNonNullableType;
    }

    export interface JSDocNullableType extends JSDocType {
      kind: Syntax.JSDocNullableType;
      type: TypeNode;
    }
    export namespace JSDocNullableType {
      export const kind = Syntax.JSDocNullableType;
    }

    export interface JSDocOptionalType extends JSDocType {
      kind: Syntax.JSDocOptionalType;
      type: TypeNode;
    }
    export namespace JSDocOptionalType {
      export const kind = Syntax.JSDocOptionalType;
    }

    export interface JSDocParameterTag extends JSDocPropertyLikeTag {
      kind: Syntax.JSDocParameterTag;
    }
    export namespace JSDocParameterTag {
      export const kind = Syntax.JSDocParameterTag;
    }

    export interface JSDocPrivateTag extends JSDocTag {
      kind: Syntax.JSDocPrivateTag;
    }
    export namespace JSDocPrivateTag {
      export const kind = Syntax.JSDocPrivateTag;
    }

    export interface JSDocPropertyTag extends JSDocPropertyLikeTag {
      kind: Syntax.JSDocPropertyTag;
    }
    export namespace JSDocPropertyTag {
      export const kind = Syntax.JSDocPropertyTag;
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
    export namespace JSDocProtectedTag {
      export const kind = Syntax.JSDocProtectedTag;
    }

    export interface JSDocPublicTag extends JSDocTag {
      kind: Syntax.JSDocPublicTag;
    }
    export namespace JSDocPublicTag {
      export const kind = Syntax.JSDocPublicTag;
    }

    export interface JSDocReadonlyTag extends JSDocTag {
      kind: Syntax.JSDocReadonlyTag;
    }
    export namespace JSDocReadonlyTag {
      export const kind = Syntax.JSDocReadonlyTag;
    }

    export interface JSDocReturnTag extends JSDocTag {
      kind: Syntax.JSDocReturnTag;
      typeExpression?: JSDocTypeExpression;
    }
    export namespace JSDocReturnTag {
      export const kind = Syntax.JSDocReturnTag;
    }

    export interface JSDocSignature extends JSDocType, Declaration {
      kind: Syntax.JSDocSignature;
      typeParameters?: readonly JSDocTemplateTag[];
      parameters: readonly JSDocParameterTag[];
      type: JSDocReturnTag | undefined;
    }
    export namespace JSDocSignature {
      export const kind = Syntax.JSDocSignature;
    }

    export interface JSDocTemplateTag extends JSDocTag {
      kind: Syntax.JSDocTemplateTag;
      constraint: JSDocTypeExpression | undefined;
      typeParameters: Nodes<TypeParameterDeclaration>;
    }
    export namespace JSDocTemplateTag {
      export const kind = Syntax.JSDocTemplateTag;
    }

    export interface JSDocThisTag extends JSDocTag {
      kind: Syntax.JSDocThisTag;
      typeExpression?: JSDocTypeExpression;
    }
    export namespace JSDocThisTag {
      export const kind = Syntax.JSDocThisTag;
    }

    export interface JSDocTypedefTag extends JSDocTag, NamedDeclaration {
      parent: JSDoc;
      kind: Syntax.JSDocTypedefTag;
      fullName?: JSDocNamespaceDeclaration | Identifier;
      name?: Identifier;
      typeExpression?: JSDocTypeExpression | JSDocTypeLiteral;
    }
    export namespace JSDocTypedefTag {
      export const kind = Syntax.JSDocTypedefTag;
    }

    export interface JSDocTypeLiteral extends JSDocType {
      kind: Syntax.JSDocTypeLiteral;
      jsDocPropertyTags?: readonly JSDocPropertyLikeTag[];
      /** If true, then this type literal represents an *array* of its type. */
      isArrayType?: boolean;
    }
    export namespace JSDocTypeLiteral {
      export const kind = Syntax.JSDocTypeLiteral;
    }

    export interface JSDocTypeTag extends JSDocTag {
      kind: Syntax.JSDocTypeTag;
      typeExpression: JSDocTypeExpression;
    }
    export namespace JSDocTypeTag {
      export const kind = Syntax.JSDocTypeTag;
    }

    export interface JSDocTypeExpression extends TypeNode {
      kind: Syntax.JSDocTypeExpression;
      type: TypeNode;
    }
    export namespace JSDocTypeExpression {
      export const kind = Syntax.JSDocTypeExpression;
    }

    export interface JSDocUnknownType extends JSDocType {
      kind: Syntax.JSDocUnknownType;
    }
    export namespace JSDocUnknownType {
      export const kind = Syntax.JSDocUnknownType;
    }

    export interface JSDocVariadicType extends JSDocType {
      kind: Syntax.JSDocVariadicType;
      type: TypeNode;
    }
    export namespace JSDocVariadicType {
      export const kind = Syntax.JSDocVariadicType;
    }

    export interface JsxAttribute extends ObjectLiteralElement {
      kind: Syntax.JsxAttribute;
      parent: JsxAttributes;
      name: Identifier;
      initializer?: StringLiteral | JsxExpression;
    }
    export namespace JsxAttribute {
      export const kind = Syntax.JsxAttribute;
    }

    export interface JsxAttributes extends ObjectLiteralExpressionBase<JsxAttributeLike> {
      kind: Syntax.JsxAttributes;
      parent: JsxOpeningLikeElement;
    }
    export namespace JsxAttributes {
      export const kind = Syntax.JsxAttributes;
    }

    export interface JsxClosingElement extends Node {
      kind: Syntax.JsxClosingElement;
      parent: JsxElement;
      tagName: JsxTagNameExpression;
    }
    export namespace JsxClosingElement {
      export const kind = Syntax.JsxClosingElement;
    }

    export interface JsxClosingFragment extends Expression {
      kind: Syntax.JsxClosingFragment;
      parent: JsxFragment;
    }
    export namespace JsxClosingFragment {
      export const kind = Syntax.JsxClosingFragment;
    }

    export interface JsxElement extends PrimaryExpression {
      kind: Syntax.JsxElement;
      openingElement: JsxOpeningElement;
      children: Nodes<JsxChild>;
      closingElement: JsxClosingElement;
    }
    export namespace JsxElement {
      export const kind = Syntax.JsxElement;
    }

    export interface JsxExpression extends Expression {
      kind: Syntax.JsxExpression;
      parent: JsxElement | JsxAttributeLike;
      dot3Token?: Token<Syntax.Dot3Token>;
      expression?: Expression;
    }
    export namespace JsxExpression {
      export const kind = Syntax.JsxExpression;
    }

    export interface JsxFragment extends PrimaryExpression {
      kind: Syntax.JsxFragment;
      openingFragment: JsxOpeningFragment;
      children: Nodes<JsxChild>;
      closingFragment: JsxClosingFragment;
    }
    export namespace JsxFragment {
      export const kind = Syntax.JsxFragment;
    }

    export interface JsxOpeningElement extends Expression {
      kind: Syntax.JsxOpeningElement;
      parent: JsxElement;
      tagName: JsxTagNameExpression;
      typeArguments?: Nodes<TypeNode>;
      attributes: JsxAttributes;
    }
    export namespace JsxOpeningElement {
      export const kind = Syntax.JsxOpeningElement;
    }

    export interface JsxOpeningFragment extends Expression {
      kind: Syntax.JsxOpeningFragment;
      parent: JsxFragment;
    }
    export namespace JsxOpeningFragment {
      export const kind = Syntax.JsxOpeningFragment;
    }

    export interface JsxSelfClosingElement extends PrimaryExpression {
      kind: Syntax.JsxSelfClosingElement;
      tagName: JsxTagNameExpression;
      typeArguments?: Nodes<TypeNode>;
      attributes: JsxAttributes;
    }
    export namespace JsxSelfClosingElement {
      export const kind = Syntax.JsxSelfClosingElement;
    }

    export interface JsxSpreadAttribute extends ObjectLiteralElement {
      kind: Syntax.JsxSpreadAttribute;
      parent: JsxAttributes;
      expression: Expression;
    }
    export namespace JsxSpreadAttribute {
      export const kind = Syntax.JsxSpreadAttribute;
    }

    export interface JsxText extends LiteralLikeNode {
      kind: Syntax.JsxText;
      onlyTriviaWhitespaces: boolean;
      parent: JsxElement;
    }
    export namespace JsxText {
      export const kind = Syntax.JsxText;
      export function create(t: string, onlyTriviaWhitespaces?: boolean) {
        const n = qn.createSynthesized(Syntax.JsxText);
        n.text = t;
        n.onlyTriviaWhitespaces = !!onlyTriviaWhitespaces;
        return n;
      }
    }

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
    export namespace KeywordTypeNode {
      export function create(k: KeywordTypeNode['kind']) {
        return qn.createSynthesized(k) as KeywordTypeNode;
      }
    }

    export interface LabeledStatement extends Statement, JSDocContainer {
      kind: Syntax.LabeledStatement;
      label: Identifier;
      statement: Statement;
    }
    export namespace LabeledStatement {
      export const kind = Syntax.LabeledStatement;
    }

    export interface LiteralTypeNode extends TypeNode {
      kind: Syntax.LiteralType;
      literal: BooleanLiteral | LiteralExpression | PrefixUnaryExpression;
    }
    export namespace LiteralTypeNode {
      export const kind = Syntax.LiteralType;
      export function create(l: LiteralTypeNode['literal']) {
        const n = qn.createSynthesized(Syntax.LiteralType);
        n.literal = l;
        return n;
      }
      export function update(n: LiteralTypeNode, l: LiteralTypeNode['literal']) {
        return n.literal !== l ? updateNode(create(l), n) : n;
      }
    }

    export interface MappedTypeNode extends TypeNode, Declaration {
      kind: Syntax.MappedType;
      readonlyToken?: ReadonlyToken | PlusToken | MinusToken;
      typeParameter: TypeParameterDeclaration;
      questionToken?: QuestionToken | PlusToken | MinusToken;
      type?: TypeNode;
    }
    export namespace MappedTypeNode {
      export const kind = Syntax.MappedType;
      export function create(r: ReadonlyToken | PlusToken | MinusToken | undefined, p: TypeParameterDeclaration, q?: QuestionToken | PlusToken | MinusToken, t?: TypeNode) {
        const n = qn.createSynthesized(Syntax.MappedType);
        n.readonlyToken = r;
        n.typeParameter = p;
        n.questionToken = q;
        n.type = t;
        return n;
      }
      export function update(n: MappedTypeNode, r: ReadonlyToken | PlusToken | MinusToken | undefined, p: TypeParameterDeclaration, q?: QuestionToken | PlusToken | MinusToken, t?: TypeNode) {
        return n.readonlyToken !== r || n.typeParameter !== p || n.questionToken !== q || n.type !== t ? updateNode(create(r, p, q, t), n) : n;
      }
    }

    export interface MetaProperty extends PrimaryExpression {
      kind: Syntax.MetaProperty;
      keywordToken: Syntax.NewKeyword | Syntax.ImportKeyword;
      name: Identifier;
    }
    export namespace MetaProperty {
      export const kind = Syntax.MetaProperty;
    }

    export interface MethodDeclaration extends FunctionLikeDeclarationBase, ClassElement, ObjectLiteralElement, JSDocContainer {
      kind: Syntax.MethodDeclaration;
      parent: ClassLikeDeclaration | ObjectLiteralExpression;
      name: PropertyName;
      body?: FunctionBody;
    }
    export namespace MethodDeclaration {
      export const kind = Syntax.MethodDeclaration;
      export function create(
        ds: readonly Decorator[] | undefined,
        ms: readonly Modifier[] | undefined,
        a: AsteriskToken | undefined,
        p: string | PropertyName,
        q: QuestionToken | undefined,
        ts: readonly TypeParameterDeclaration[] | undefined,
        ps: readonly ParameterDeclaration[],
        t?: TypeNode,
        b?: Block
      ) {
        const n = qn.createSynthesized(Syntax.MethodDeclaration);
        n.decorators = qns.from(ds);
        n.modifiers = qns.from(ms);
        n.asteriskToken = a;
        n.name = asName(p);
        n.questionToken = q;
        n.typeParameters = qns.from(ts);
        n.parameters = qns.create(ps);
        n.type = t;
        n.body = b;
        return n;
      }
      export function update(
        n: MethodDeclaration,
        ds: readonly Decorator[] | undefined,
        ms: readonly Modifier[] | undefined,
        a: AsteriskToken | undefined,
        p: PropertyName,
        q: QuestionToken | undefined,
        ts: readonly TypeParameterDeclaration[] | undefined,
        ps: readonly ParameterDeclaration[],
        t?: TypeNode,
        b?: Block
      ) {
        return n.decorators !== ds ||
          n.modifiers !== ms ||
          n.asteriskToken !== a ||
          n.name !== p ||
          n.questionToken !== q ||
          n.typeParameters !== ts ||
          n.parameters !== ps ||
          n.type !== t ||
          n.body !== b
          ? updateNode(create(ds, ms, a, p, q, ts, ps, t, b), n)
          : n;
      }
    }

    export interface MethodSignature extends SignatureDeclarationBase, TypeElement {
      kind: Syntax.MethodSignature;
      parent: ObjectTypeDeclaration;
      name: PropertyName;
    }
    export namespace MethodSignature {
      export const kind = Syntax.MethodSignature;
      export function create(ts: readonly TypeParameterDeclaration[] | undefined, ps: readonly ParameterDeclaration[], t: TypeNode | undefined, p: string | PropertyName, q?: QuestionToken) {
        const n = SignatureDeclaration.create(Syntax.MethodSignature, ts, ps, t) as MethodSignature;
        n.name = asName(p);
        n.questionToken = q;
        return n;
      }
      export function update(n: MethodSignature, ts: Nodes<TypeParameterDeclaration> | undefined, ps: Nodes<ParameterDeclaration>, t: TypeNode | undefined, p: PropertyName, q?: QuestionToken) {
        return n.typeParameters !== ts || n.parameters !== ps || n.type !== t || n.name !== p || n.questionToken !== q ? updateNode(create(ts, ps, t, p, q), n) : n;
      }
    }

    export interface MissingDeclaration extends DeclarationStatement {
      kind: Syntax.MissingDeclaration;
      name?: Identifier;
    }
    export namespace MissingDeclaration {
      export const kind = Syntax.MissingDeclaration;
    }

    export interface ModuleBlock extends Node, Statement {
      kind: Syntax.ModuleBlock;
      parent: ModuleDeclaration;
      statements: Nodes<Statement>;
    }
    export namespace ModuleBlock {
      export const kind = Syntax.ModuleBlock;
    }

    export interface ModuleDeclaration extends DeclarationStatement, JSDocContainer {
      kind: Syntax.ModuleDeclaration;
      parent: ModuleBody | SourceFile;
      name: ModuleName;
      body?: ModuleBody | JSDocNamespaceDeclaration;
    }
    export namespace ModuleDeclaration {
      export const kind = Syntax.ModuleDeclaration;
    }

    export interface NamedExports extends Node {
      kind: Syntax.NamedExports;
      parent: ExportDeclaration;
      elements: Nodes<ExportSpecifier>;
    }
    export namespace NamedExports {
      export const kind = Syntax.NamedExports;
    }

    export interface NamedImports extends Node {
      kind: Syntax.NamedImports;
      parent: ImportClause;
      elements: Nodes<ImportSpecifier>;
    }
    export namespace NamedImports {
      export const kind = Syntax.NamedImports;
    }

    export interface NamedTupleMember extends TypeNode, JSDocContainer, Declaration {
      kind: Syntax.NamedTupleMember;
      dot3Token?: Token<Syntax.Dot3Token>;
      name: Identifier;
      questionToken?: Token<Syntax.QuestionToken>;
      type: TypeNode;
    }
    export namespace NamedTupleMember {
      export const kind = Syntax.NamedTupleMember;
      export function create(d: Token<Syntax.Dot3Token> | undefined, i: Identifier, q: Token<Syntax.QuestionToken> | undefined, t: TypeNode) {
        const n = qn.createSynthesized(Syntax.NamedTupleMember);
        n.dot3Token = d;
        n.name = i;
        n.questionToken = q;
        n.type = t;
        return n;
      }
      export function update(n: NamedTupleMember, d: Token<Syntax.Dot3Token> | undefined, i: Identifier, q: Token<Syntax.QuestionToken> | undefined, t: TypeNode) {
        return n.dot3Token !== d || n.name !== i || n.questionToken !== q || n.type !== t ? updateNode(create(d, i, q, t), n) : n;
      }
    }

    export interface NamespaceExport extends NamedDeclaration {
      kind: Syntax.NamespaceExport;
      parent: ExportDeclaration;
      name: Identifier;
    }
    export namespace NamespaceExport {
      export const kind = Syntax.NamespaceExport;
    }

    export interface NamespaceExportDeclaration extends DeclarationStatement {
      kind: Syntax.NamespaceExportDeclaration;
      name: Identifier;
    }
    export namespace NamespaceExportDeclaration {
      export const kind = Syntax.NamespaceExportDeclaration;
    }

    export interface NamespaceImport extends NamedDeclaration {
      kind: Syntax.NamespaceImport;
      parent: ImportClause;
      name: Identifier;
    }
    export namespace NamespaceImport {
      export const kind = Syntax.NamespaceImport;
    }

    export interface NewExpression extends PrimaryExpression, Declaration {
      kind: Syntax.NewExpression;
      expression: LeftHandSideExpression;
      typeArguments?: Nodes<TypeNode>;
      arguments?: Nodes<Expression>;
    }
    export namespace NewExpression {
      export const kind = Syntax.NewExpression;
    }

    export interface NonNullExpression extends LeftHandSideExpression {
      kind: Syntax.NonNullExpression;
      expression: Expression;
    }
    export namespace NonNullExpression {
      export const kind = Syntax.NonNullExpression;
    }

    export interface NoSubstitutionLiteral extends LiteralExpression, TemplateLiteralLikeNode, Declaration {
      kind: Syntax.NoSubstitutionLiteral;
      templateFlags?: TokenFlags;
    }
    export namespace NoSubstitutionLiteral {
      export const kind = Syntax.NoSubstitutionLiteral;
      export function create(t: string, raw?: string) {
        return qn.createTemplateLiteralLike(Syntax.NoSubstitutionLiteral, t, raw) as NoSubstitutionLiteral;
      }
    }

    export interface NotEmittedStatement extends Statement {
      kind: Syntax.NotEmittedStatement;
    }
    export namespace NotEmittedStatement {
      export const kind = Syntax.NotEmittedStatement;
    }

    export interface NumericLiteral extends LiteralExpression, Declaration {
      kind: Syntax.NumericLiteral;
      numericLiteralFlags: TokenFlags;
    }
    export namespace NumericLiteral {
      export const kind = Syntax.NumericLiteral;
      export function create(t: string, fs: TokenFlags = TokenFlags.None) {
        const n = qn.createSynthesized(Syntax.NumericLiteral);
        n.text = t;
        n.numericLiteralFlags = fs;
        return n;
      }
      export function name(name: string | __String) {
        return (+name).toString() === name;
      }
    }

    export interface ObjectBindingPattern extends Node {
      kind: Syntax.ObjectBindingPattern;
      parent: VariableDeclaration | ParameterDeclaration | BindingElement;
      elements: Nodes<BindingElement>;
    }
    export namespace ObjectBindingPattern {
      export const kind = Syntax.ObjectBindingPattern;
      export function create(es: readonly BindingElement[]) {
        const n = qn.createSynthesized(Syntax.ObjectBindingPattern);
        n.elements = qns.create(es);
        return n;
      }
      export function update(n: ObjectBindingPattern, es: readonly BindingElement[]) {
        return n.elements !== es ? updateNode(create(es), n) : n;
      }
    }

    export interface ObjectLiteralExpressionBase<T extends ObjectLiteralElement> extends PrimaryExpression, Declaration {
      properties: Nodes<T>;
    }
    export interface ObjectLiteralExpression extends ObjectLiteralExpressionBase<ObjectLiteralElementLike> {
      kind: Syntax.ObjectLiteralExpression;
      multiLine?: boolean;
    }
    export namespace ObjectLiteralExpression {
      export const kind = Syntax.ObjectLiteralExpression;
    }

    export interface OmittedExpression extends Expression {
      kind: Syntax.OmittedExpression;
    }
    export namespace OmittedExpression {
      export const kind = Syntax.OmittedExpression;
    }

    export interface OptionalTypeNode extends TypeNode {
      kind: Syntax.OptionalType;
      type: TypeNode;
    }
    export namespace OptionalTypeNode {
      export const kind = Syntax.OptionalType;
      export function create(t: TypeNode) {
        const n = qn.createSynthesized(Syntax.OptionalType);
        n.type = parenthesizeArrayTypeMember(t);
        return n;
      }
      export function update(n: OptionalTypeNode, t: TypeNode): OptionalTypeNode {
        return n.type !== t ? updateNode(create(t), n) : n;
      }
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
    export namespace ParameterDeclaration {
      export const kind = Syntax.Parameter;
    }

    export type ParameterPropertyDeclaration = ParameterDeclaration & { parent: ConstructorDeclaration; name: Identifier };

    export interface ParenthesizedExpression extends PrimaryExpression, JSDocContainer {
      kind: Syntax.ParenthesizedExpression;
      expression: Expression;
    }
    export namespace ParenthesizedExpression {
      export const kind = Syntax.ParenthesizedExpression;
    }

    export interface ParenthesizedTypeNode extends TypeNode {
      kind: Syntax.ParenthesizedType;
      type: TypeNode;
    }
    export namespace ParenthesizedTypeNode {
      export const kind = Syntax.ParenthesizedType;
      export function create(t: TypeNode) {
        const n = qn.createSynthesized(Syntax.ParenthesizedType);
        n.type = t;
        return n;
      }
      export function update(n: ParenthesizedTypeNode, t: TypeNode) {
        return n.type !== t ? updateNode(create(t), n) : n;
      }
    }

    export interface PartiallyEmittedExpression extends LeftHandSideExpression {
      kind: Syntax.PartiallyEmittedExpression;
      expression: Expression;
    }
    export namespace PartiallyEmittedExpression {
      export const kind = Syntax.PartiallyEmittedExpression;
    }

    export interface PostfixUnaryExpression extends UpdateExpression {
      kind: Syntax.PostfixUnaryExpression;
      operand: LeftHandSideExpression;
      operator: PostfixUnaryOperator;
    }
    export namespace PostfixUnaryExpression {
      export const kind = Syntax.PostfixUnaryExpression;
    }

    export interface PrefixUnaryExpression extends UpdateExpression {
      kind: Syntax.PrefixUnaryExpression;
      operator: PrefixUnaryOperator;
      operand: UnaryExpression;
    }
    export namespace PrefixUnaryExpression {
      export const kind = Syntax.PrefixUnaryExpression;
    }

    export interface PrivateIdentifier extends Node {
      kind: Syntax.PrivateIdentifier;
      escapedText: __String;
    }
    export namespace PrivateIdentifier {
      export const kind = Syntax.PrivateIdentifier;
    }

    export interface PropertyAccessExpression extends MemberExpression, NamedDeclaration {
      kind: Syntax.PropertyAccessExpression;
      expression: LeftHandSideExpression;
      questionDotToken?: QuestionDotToken;
      name: Identifier | PrivateIdentifier;
    }
    export namespace PropertyAccessExpression {
      export const kind = Syntax.PropertyAccessExpression;
    }

    export interface PropertyAssignment extends ObjectLiteralElement, JSDocContainer {
      parent: ObjectLiteralExpression;
      kind: Syntax.PropertyAssignment;
      name: PropertyName;
      questionToken?: QuestionToken;
      initializer: Expression;
    }
    export namespace PropertyAssignment {
      export const kind = Syntax.PropertyAssignment;
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
    export namespace PropertyDeclaration {
      export const kind = Syntax.PropertyDeclaration;
      export function create(ds: readonly Decorator[] | undefined, ms: readonly Modifier[] | undefined, p: string | PropertyName, q?: QuestionToken | ExclamationToken, t?: TypeNode, i?: Expression) {
        const n = qn.createSynthesized(Syntax.PropertyDeclaration);
        n.decorators = qns.from(ds);
        n.modifiers = qns.from(ms);
        n.name = asName(p);
        n.questionToken = q !== undefined && q.kind === Syntax.QuestionToken ? q : undefined;
        n.exclamationToken = q !== undefined && q.kind === Syntax.ExclamationToken ? q : undefined;
        n.type = t;
        n.initializer = i;
        return n;
      }
      export function update(
        n: PropertyDeclaration,
        ds: readonly Decorator[] | undefined,
        ms: readonly Modifier[] | undefined,
        p: string | PropertyName,
        q?: QuestionToken | ExclamationToken,
        t?: TypeNode,
        i?: Expression
      ) {
        return n.decorators !== ds ||
          n.modifiers !== ms ||
          n.name !== p ||
          n.questionToken !== (q !== undefined && q.kind === Syntax.QuestionToken ? q : undefined) ||
          n.exclamationToken !== (q !== undefined && q.kind === Syntax.ExclamationToken ? q : undefined) ||
          n.type !== t ||
          n.initializer !== i
          ? updateNode(create(ds, ms, p, q, t, i), n)
          : n;
      }
    }

    export interface PropertySignature extends TypeElement, JSDocContainer {
      kind: Syntax.PropertySignature;
      name: PropertyName;
      questionToken?: QuestionToken;
      type?: TypeNode;
      initializer?: Expression;
    }
    export namespace PropertySignature {
      export const kind = Syntax.PropertySignature;
      export function create(ms: readonly Modifier[] | undefined, p: PropertyName | string, q?: QuestionToken, t?: TypeNode, i?: Expression) {
        const n = qn.createSynthesized(Syntax.PropertySignature);
        n.modifiers = qns.from(ms);
        n.name = asName(p);
        n.questionToken = q;
        n.type = t;
        n.initializer = i;
        return n;
      }
      export function update(n: PropertySignature, ms: readonly Modifier[] | undefined, p: PropertyName, q?: QuestionToken, t?: TypeNode, i?: Expression) {
        return n.modifiers !== ms || n.name !== p || n.questionToken !== q || n.type !== t || n.initializer !== i ? updateNode(create(ms, p, q, t, i), n) : n;
      }
    }

    export interface QualifiedName extends Node {
      kind: Syntax.QualifiedName;
      left: EntityName;
      right: Identifier;
      jsdocDotPos?: number;
    }
    export namespace QualifiedName {
      export const kind = Syntax.QualifiedName;
      export function create(left: EntityName, right: string | Identifier) {
        const n = qn.createSynthesized(Syntax.QualifiedName);
        n.left = left;
        n.right = asName(right);
        return n;
      }
      export function update(n: QualifiedName, left: EntityName, right: Identifier) {
        return n.left !== left || n.right !== right ? updateNode(create(left, right), n) : n;
      }
    }

    export interface RegexLiteral extends LiteralExpression {
      kind: Syntax.RegexLiteral;
    }
    export namespace RegexLiteral {
      export const kind = Syntax.RegexLiteral;
      export function create(t: string) {
        const n = qn.createSynthesized(Syntax.RegexLiteral);
        n.text = t;
        return n;
      }
    }

    export interface RestTypeNode extends TypeNode {
      kind: Syntax.RestType;
      type: TypeNode;
    }
    export namespace RestTypeNode {
      export const kind = Syntax.RestType;
      export function create(t: TypeNode) {
        const n = qn.createSynthesized(Syntax.RestType);
        n.type = t;
        return n;
      }
      export function update(n: RestTypeNode, t: TypeNode): RestTypeNode {
        return n.type !== t ? updateNode(create(t), n) : n;
      }
    }

    export interface ReturnStatement extends Statement {
      kind: Syntax.ReturnStatement;
      expression?: Expression;
    }
    export namespace ReturnStatement {
      export const kind = Syntax.ReturnStatement;
    }

    export interface SemicolonClassElement extends ClassElement {
      kind: Syntax.SemicolonClassElement;
      parent: ClassLikeDeclaration;
    }
    export namespace SemicolonClassElement {
      export const kind = Syntax.SemicolonClassElement;
    }

    export interface SetAccessorDeclaration extends FunctionLikeDeclarationBase, ClassElement, ObjectLiteralElement, JSDocContainer {
      kind: Syntax.SetAccessor;
      parent: ClassLikeDeclaration | ObjectLiteralExpression;
      name: PropertyName;
      body?: FunctionBody;
    }
    export namespace SetAccessorDeclaration {
      export const kind = Syntax.SetAccessor;
      export function create(ds: readonly Decorator[] | undefined, ms: readonly Modifier[] | undefined, p: string | PropertyName, ps: readonly ParameterDeclaration[], b?: Block) {
        const n = qn.createSynthesized(Syntax.SetAccessor);
        n.decorators = qns.from(ds);
        n.modifiers = qns.from(ms);
        n.name = asName(p);
        n.typeParameters = undefined;
        n.parameters = qns.create(ps);
        n.body = b;
        return n;
      }
      export function update(n: SetAccessorDeclaration, ds: readonly Decorator[] | undefined, ms: readonly Modifier[] | undefined, p: PropertyName, ps: readonly ParameterDeclaration[], b?: Block) {
        return n.decorators !== ds || n.modifiers !== ms || n.name !== p || n.parameters !== ps || n.body !== b ? updateNode(create(ds, ms, p, ps, b), n) : n;
      }
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
    export namespace ShorthandPropertyAssignment {
      export const kind = Syntax.ShorthandPropertyAssignment;
    }

    export interface SignatureDeclarationBase extends NamedDeclaration, JSDocContainer {
      kind: SignatureDeclaration['kind'];
      name?: PropertyName;
      typeParameters?: Nodes<TypeParameterDeclaration>;
      parameters: Nodes<ParameterDeclaration>;
      type?: TypeNode;
      typeArguments?: Nodes<TypeNode>;
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
    export namespace SignatureDeclaration {
      export function create(k: Syntax, ts: readonly TypeParameterDeclaration[] | undefined, ps: readonly ParameterDeclaration[], t?: TypeNode, ta?: readonly TypeNode[]) {
        const n = qn.createSynthesized(k);
        n.typeParameters = qns.from(ts);
        n.parameters = qns.from(ps);
        n.type = t;
        n.typeArguments = qns.from(ta);
        return n;
      }
      export function update<T extends SignatureDeclaration>(n: T, ts: Nodes<TypeParameterDeclaration> | undefined, ps: Nodes<ParameterDeclaration>, t?: TypeNode): T {
        return n.typeParameters !== ts || n.parameters !== ps || n.type !== t ? updateNode(create(n.kind, ts, ps, t) as T, n) : n;
      }
    }

    export interface SpreadElement extends Expression {
      kind: Syntax.SpreadElement;
      parent: ArrayLiteralExpression | CallExpression | NewExpression;
      expression: Expression;
    }
    export namespace SpreadElement {
      export const kind = Syntax.SpreadElement;
    }

    export interface SpreadAssignment extends ObjectLiteralElement, JSDocContainer {
      parent: ObjectLiteralExpression;
      kind: Syntax.SpreadAssignment;
      expression: Expression;
    }
    export namespace SpreadAssignment {
      export const kind = Syntax.SpreadAssignment;
    }

    export interface StringLiteral extends LiteralExpression, Declaration {
      kind: Syntax.StringLiteral;
      textSourceNode?: Identifier | StringLiteralLike | NumericLiteral;
      singleQuote?: boolean;
    }
    export namespace StringLiteral {
      export const kind = Syntax.StringLiteral;
      export function create(t: string) {
        const n = qn.createSynthesized(Syntax.StringLiteral);
        n.text = t;
        return n;
      }
      export function like(n: Node): n is StringLiteralLike {
        return n.kind === Syntax.StringLiteral || n.kind === Syntax.NoSubstitutionLiteral;
      }
      export function orNumericLiteralLike(n: Node): n is StringLiteralLike | NumericLiteral {
        return like(n) || qn.is.kind(NumericLiteral, n);
      }
      export function orJsxExpressionKind(n: Node): n is StringLiteral | JsxExpression {
        const k = n.kind;
        return k === Syntax.StringLiteral || k === Syntax.JsxExpression;
      }
      export function orNumberLiteralExpression(e: Expression) {
        return (
          orNumericLiteralLike(e) ||
          (e.kind === Syntax.PrefixUnaryExpression && (e as PrefixUnaryExpression).operator === Syntax.MinusToken && (e as PrefixUnaryExpression).operand.kind === Syntax.NumericLiteral)
        );
      }
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
      languageVariant: LanguageVariant;
      isDeclarationFile: boolean;
      renamedDependencies?: qa.QReadonlyMap<string>;

      hasNoDefaultLib: boolean;

      languageVersion: ScriptTarget;
      scriptKind: ScriptKind;

      externalModuleIndicator?: Node;
      // The first node that causes this file to be a CommonJS module
      commonJsModuleIndicator?: Node;
      // JS identifier-declarations that are intended to merge with globals
      jsGlobalAugmentations?: SymbolTable;

      identifiers: qa.QMap<string>; // Map from a string to an interned string
      nodeCount: number;
      identifierCount: number;
      symbolCount: number;

      // File-level diagnostics reported by the parser (includes diagnostics about /// references
      // as well as code diagnostics).
      parseDiagnostics: DiagnosticWithLocation[];

      // File-level diagnostics reported by the binder.
      bindDiagnostics: DiagnosticWithLocation[];
      bindSuggestionDiagnostics?: DiagnosticWithLocation[];

      // File-level JSDoc diagnostics reported by the JSDoc parser
      jsDocDiagnostics?: DiagnosticWithLocation[];

      // Stores additional file-level diagnostics reported by the program
      additionalSyntacticDiagnostics?: readonly DiagnosticWithLocation[];

      // Stores a line map for the file.
      // This field should never be used directly to obtain line map, use getLineMap function instead.
      lineMap: readonly number[];
      classifiableNames?: ReadonlyUnderscoreEscapedMap<true>;
      // Comments containing @ts-* directives, in order.
      commentDirectives?: CommentDirective[];
      // Stores a mapping 'external module reference text' -> 'resolved file name' | undefined
      // It is used to resolve module names in the checker.
      // Content of this field should never be used directly - use getResolvedModuleFileName/setResolvedModuleFileName functions instead
      resolvedModules?: qa.QMap<ResolvedModuleFull | undefined>;
      resolvedTypeReferenceDirectiveNames: qa.QMap<ResolvedTypeReferenceDirective | undefined>;
      imports: readonly StringLiteralLike[];
      // Identifier only if `declare global`
      moduleAugmentations: readonly (StringLiteral | Identifier)[];
      patternAmbientModules?: PatternAmbientModule[];
      ambientModuleNames: readonly string[];
      checkJsDirective?: CheckJsDirective;
      version: string;
      pragmas: ReadonlyPragmaMap;
      localJsxNamespace?: __String;
      localJsxFactory?: EntityName;

      exportedModulesFromDeclarationEmit?: ExportedModulesFromDeclarationEmit;
    }
    export namespace SourceFile {
      export const kind = Syntax.SourceFile;
    }

    export interface SwitchStatement extends Statement {
      kind: Syntax.SwitchStatement;
      expression: Expression;
      caseBlock: CaseBlock;
      possiblyExhaustive?: boolean;
    }
    export namespace SwitchStatement {
      export const kind = Syntax.SwitchStatement;
    }

    export interface SyntaxList extends Node {
      _children: Node[];
    }
    export namespace SyntaxList {
      export const kind = Syntax.SyntaxList;
    }

    export interface SyntheticReferenceExpression extends LeftHandSideExpression {
      kind: Syntax.SyntheticReferenceExpression;
      expression: Expression;
      thisArg: Expression;
    }
    export namespace SyntheticReferenceExpression {
      export const kind = Syntax.SyntheticReferenceExpression;
    }

    export interface TaggedTemplateExpression extends MemberExpression {
      kind: Syntax.TaggedTemplateExpression;
      tag: LeftHandSideExpression;
      typeArguments?: Nodes<TypeNode>;
      template: TemplateLiteral;
      questionDotToken?: QuestionDotToken;
    }
    export namespace TaggedTemplateExpression {
      export const kind = Syntax.TaggedTemplateExpression;
    }

    export interface TemplateExpression extends PrimaryExpression {
      kind: Syntax.TemplateExpression;
      head: TemplateHead;
      templateSpans: Nodes<TemplateSpan>;
    }
    export namespace TemplateExpression {
      export const kind = Syntax.TemplateExpression;
    }

    export interface TemplateHead extends TemplateLiteralLikeNode {
      kind: Syntax.TemplateHead;
      parent: TemplateExpression;
      templateFlags?: TokenFlags;
    }
    export namespace TemplateHead {
      export const kind = Syntax.TemplateHead;
      export function create(t: string, raw?: string) {
        return qn.createTemplateLiteralLike(Syntax.TemplateHead, t, raw) as TemplateHead;
      }
    }

    export type TemplateLiteralToken = NoSubstitutionLiteral | TemplateHead | TemplateMiddle | TemplateTail;

    export interface TemplateMiddle extends TemplateLiteralLikeNode {
      kind: Syntax.TemplateMiddle;
      parent: TemplateSpan;
      templateFlags?: TokenFlags;
    }
    export namespace TemplateMiddle {
      export const kind = Syntax.TemplateMiddle;
      export function create(t: string, raw?: string) {
        return qn.createTemplateLiteralLike(Syntax.TemplateMiddle, t, raw) as TemplateMiddle;
      }
      export function orTemplateTailKind(n: Node): n is TemplateMiddle | TemplateTail {
        const k = n.kind;
        return k === Syntax.TemplateMiddle || k === Syntax.TemplateTail;
      }
    }

    export interface TemplateSpan extends Node {
      kind: Syntax.TemplateSpan;
      parent: TemplateExpression;
      expression: Expression;
      literal: TemplateMiddle | TemplateTail;
    }
    export namespace TemplateSpan {
      export const kind = Syntax.TemplateSpan;
    }

    export interface TemplateTail extends TemplateLiteralLikeNode {
      kind: Syntax.TemplateTail;
      parent: TemplateSpan;
      templateFlags?: TokenFlags;
    }
    export namespace TemplateTail {
      export const kind = Syntax.TemplateTail;
      export function create(t: string, raw?: string) {
        return qn.createTemplateLiteralLike(Syntax.TemplateTail, t, raw) as TemplateTail;
      }
    }

    export interface ThisTypeNode extends TypeNode {
      kind: Syntax.ThisType;
    }
    export namespace ThisTypeNode {
      export const kind = Syntax.ThisType;
      export function create() {
        return qn.createSynthesized(Syntax.ThisType);
      }
    }

    export interface ThrowStatement extends Statement {
      kind: Syntax.ThrowStatement;
      expression?: Expression;
    }
    export namespace ThrowStatement {
      export const kind = Syntax.ThrowStatement;
    }

    export interface TryStatement extends Statement {
      kind: Syntax.TryStatement;
      tryBlock: Block;
      catchClause?: CatchClause;
      finallyBlock?: Block;
    }
    export namespace TryStatement {
      export const kind = Syntax.TryStatement;
    }

    export interface TupleTypeNode extends TypeNode {
      kind: Syntax.TupleType;
      elements: Nodes<TypeNode | NamedTupleMember>;
    }
    export namespace TupleTypeNode {
      export const kind = Syntax.TupleType;
      export function create(es: readonly (TypeNode | NamedTupleMember)[]) {
        const n = qn.createSynthesized(Syntax.TupleType);
        n.elements = qns.create(es);
        return n;
      }
      export function update(n: TupleTypeNode, es: readonly (TypeNode | NamedTupleMember)[]) {
        return n.elements !== es ? updateNode(create(es), n) : n;
      }
    }

    export interface TypeAliasDeclaration extends DeclarationStatement, JSDocContainer {
      kind: Syntax.TypeAliasDeclaration;
      name: Identifier;
      typeParameters?: Nodes<TypeParameterDeclaration>;
      type: TypeNode;
    }
    export namespace TypeAliasDeclaration {
      export const kind = Syntax.TypeAliasDeclaration;
    }

    export interface TypeAssertion extends UnaryExpression {
      kind: Syntax.TypeAssertionExpression;
      type: TypeNode;
      expression: UnaryExpression;
    }
    export namespace TypeAssertion {
      export const kind = Syntax.TypeAssertionExpression;
    }

    export interface TypeLiteralNode extends TypeNode, Declaration {
      kind: Syntax.TypeLiteral;
      members: Nodes<TypeElement>;
    }
    export namespace TypeLiteralNode {
      export const kind = Syntax.TypeLiteral;
      export function create(ms: readonly TypeElement[] | undefined) {
        const n = qn.createSynthesized(Syntax.TypeLiteral);
        n.members = qns.create(ms);
        return n;
      }
      export function update(n: TypeLiteralNode, ms: Nodes<TypeElement>) {
        return n.members !== ms ? updateNode(create(ms), n) : n;
      }
    }

    export interface TypeNode extends Node {
      _typeNodeBrand: any;
    }

    export interface TypeOfExpression extends UnaryExpression {
      kind: Syntax.TypeOfExpression;
      expression: UnaryExpression;
    }
    export namespace TypeOfExpression {
      export const kind = Syntax.TypeOfExpression;
    }

    export interface TypeOperatorNode extends TypeNode {
      kind: Syntax.TypeOperator;
      operator: Syntax.KeyOfKeyword | Syntax.UniqueKeyword | Syntax.ReadonlyKeyword;
      type: TypeNode;
    }
    export namespace TypeOperatorNode {
      export const kind = Syntax.TypeOperator;
      export function create(t: TypeNode): TypeOperatorNode;
      export function create(o: Syntax.KeyOfKeyword | Syntax.UniqueKeyword | Syntax.ReadonlyKeyword, t: TypeNode): TypeOperatorNode;
      export function create(o: Syntax.KeyOfKeyword | Syntax.UniqueKeyword | Syntax.ReadonlyKeyword | TypeNode, t?: TypeNode) {
        const n = qn.createSynthesized(Syntax.TypeOperator);
        n.operator = typeof o === 'number' ? o : Syntax.KeyOfKeyword;
        n.type = parenthesizeElementTypeMember(typeof o === 'number' ? t! : o);
        return n;
      }
      export function update(n: TypeOperatorNode, t: TypeNode) {
        return n.type !== t ? updateNode(create(n.operator, t), n) : n;
      }
    }

    export interface TypeParameterDeclaration extends NamedDeclaration {
      kind: Syntax.TypeParameter;
      parent: DeclarationWithTypeParameterChildren | InferTypeNode;
      name: Identifier;
      constraint?: TypeNode;
      default?: TypeNode;
      expression?: Expression;
    }
    export namespace TypeParameterDeclaration {
      export const kind = Syntax.TypeParameter;
    }

    export interface TypePredicateNode extends TypeNode {
      kind: Syntax.TypePredicate;
      parent: SignatureDeclaration | JSDocTypeExpression;
      assertsModifier?: AssertsToken;
      parameterName: Identifier | ThisTypeNode;
      type?: TypeNode;
    }
    export namespace TypePredicateNode {
      export const kind = Syntax.TypePredicate;
      export function create(p: Identifier | ThisTypeNode | string, t: TypeNode) {
        return createWithModifier(undefined, p, t);
      }
      export function createWithModifier(a: AssertsToken | undefined, p: Identifier | ThisTypeNode | string, t?: TypeNode) {
        const n = qn.createSynthesized(Syntax.TypePredicate);
        n.assertsModifier = a;
        n.parameterName = asName(p);
        n.type = t;
        return n;
      }
      export function update(n: TypePredicateNode, p: Identifier | ThisTypeNode, t: TypeNode) {
        return updateWithModifier(n, n.assertsModifier, p, t);
      }
      export function updateWithModifier(n: TypePredicateNode, a: AssertsToken | undefined, p: Identifier | ThisTypeNode, t?: TypeNode) {
        return n.assertsModifier !== a || n.parameterName !== p || n.type !== t ? updateNode(createWithModifier(a, p, t), n) : n;
      }
    }

    export interface TypeQueryNode extends TypeNode {
      kind: Syntax.TypeQuery;
      exprName: EntityName;
    }
    export namespace TypeQueryNode {
      export const kind = Syntax.TypeQuery;
      export function create(e: EntityName) {
        const n = qn.createSynthesized(Syntax.TypeQuery);
        n.exprName = e;
        return n;
      }
      export function update(n: TypeQueryNode, e: EntityName) {
        return n.exprName !== e ? updateNode(create(e), n) : n;
      }
    }

    export interface TypeReferenceNode extends NodeWithTypeArguments {
      kind: Syntax.TypeReference;
      typeName: EntityName;
    }
    export namespace TypeReferenceNode {
      export const kind = Syntax.TypeReference;
      export function create(t: string | EntityName, ts?: readonly TypeNode[]) {
        const n = qn.createSynthesized(Syntax.TypeReference);
        n.typeName = asName(t);
        n.typeArguments = ts && parenthesizeTypeParameters(ts);
        return n;
      }
      export function update(n: TypeReferenceNode, t: EntityName, ts?: Nodes<TypeNode>) {
        return n.typeName !== t || n.typeArguments !== ts ? updateNode(create(t, ts), n) : n;
      }
    }

    export interface UnionTypeNode extends TypeNode {
      kind: Syntax.UnionType;
      types: Nodes<TypeNode>;
    }
    export namespace UnionTypeNode {
      export const kind = Syntax.UnionType;
      export function create(ts: readonly TypeNode[]) {
        return orIntersectionCreate(Syntax.UnionType, ts) as UnionTypeNode;
      }
      export function orIntersectionCreate(k: Syntax.UnionType | Syntax.IntersectionType, ts: readonly TypeNode[]) {
        const n = qn.createSynthesized(k);
        n.types = parenthesizeElementTypeMembers(ts);
        return n;
      }
      export function update(n: UnionTypeNode, ts: Nodes<TypeNode>) {
        return orIntersectionUpdate(n, ts);
      }
      export function orIntersectionUpdate<T extends UnionOrIntersectionTypeNode>(n: T, ts: Nodes<TypeNode>): T {
        return n.types !== ts ? updateNode(orIntersectionCreate(n.kind, ts) as T, n) : n;
      }
    }

    export interface UnparsedPrepend extends UnparsedSection {
      kind: Syntax.UnparsedPrepend;
      data: string;
      parent: UnparsedSource;
      texts: readonly UnparsedTextLike[];
    }
    export namespace UnparsedPrepend {
      export const kind = Syntax.UnparsedPrepend;
    }

    export interface UnparsedSource extends Node {
      kind: Syntax.UnparsedSource;
      fileName: string;
      text: string;
      prologues: readonly UnparsedPrologue[];
      helpers: readonly UnscopedEmitHelper[] | undefined;

      // References and noDefaultLibAre Dts only
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
      // Adding this to satisfy services, fix later

      lineAndCharOf(pos: number): LineAndChar;
    }
    export namespace UnparsedSource {
      export const kind = Syntax.UnparsedSource;
    }

    export interface VariableDeclaration extends NamedDeclaration {
      kind: Syntax.VariableDeclaration;
      parent: VariableDeclarationList | CatchClause;
      name: BindingName;
      exclamationToken?: ExclamationToken;
      type?: TypeNode;
      initializer?: Expression;
    }
    export namespace VariableDeclaration {
      export const kind = Syntax.VariableDeclaration;
    }

    export interface VariableDeclarationList extends Node {
      kind: Syntax.VariableDeclarationList;
      parent: VariableStatement | ForStatement | ForOfStatement | ForInStatement;
      declarations: Nodes<VariableDeclaration>;
    }
    export namespace VariableDeclarationList {
      export const kind = Syntax.VariableDeclarationList;
    }

    export interface VariableStatement extends Statement, JSDocContainer {
      kind: Syntax.VariableStatement;
      declarationList: VariableDeclarationList;
    }
    export namespace VariableStatement {
      export const kind = Syntax.VariableStatement;
    }

    export interface VoidExpression extends UnaryExpression {
      kind: Syntax.VoidExpression;
      expression: UnaryExpression;
    }
    export namespace VoidExpression {
      export const kind = Syntax.VoidExpression;
    }

    export interface WhileStatement extends IterationStatement {
      kind: Syntax.WhileStatement;
      expression: Expression;
    }
    export namespace WhileStatement {
      export const kind = Syntax.WhileStatement;
    }

    export interface WithStatement extends Statement {
      kind: Syntax.WithStatement;
      expression: Expression;
      statement: Statement;
    }
    export namespace WithStatement {
      export const kind = Syntax.WithStatement;
    }

    export interface YieldExpression extends Expression {
      kind: Syntax.YieldExpression;
      asteriskToken?: AsteriskToken;
      expression?: Expression;
    }
    export namespace YieldExpression {
      export const kind = Syntax.YieldExpression;
    }

    export type NodeTypes =
      | ArrayLiteralExpression
      | ArrayTypeNode
      | AsExpression
      | AwaitExpression
      | BinaryExpression
      | BindingElement
      | BindingPattern
      | Block
      | BreakOrContinueStatement
      | CallExpression
      | CaseBlock
      | CaseClause
      | CatchClause
      | ClassLikeDeclaration
      | CommaListExpression
      | ComputedPropertyName
      | ConditionalExpression
      | ConditionalTypeNode
      | Decorator
      | DefaultClause
      | DeleteExpression
      | DeleteExpression
      | DoStatement
      | ElementAccessExpression
      | EnumDeclaration
      | EnumMember
      | ExportAssignment
      | ExportDeclaration
      | ExpressionStatement
      | ExpressionWithTypeArguments
      | ExternalModuleReference
      | ForInStatement
      | ForOfStatement
      | ForStatement
      | FunctionLikeDeclaration
      | HeritageClause
      | IfStatement
      | ImportClause
      | ImportDeclaration
      | ImportEqualsDeclaration
      | ImportOrExportSpecifier
      | ImportTypeNode
      | IndexedAccessTypeNode
      | InferTypeNode
      | InterfaceDeclaration
      | JSDoc
      | JSDocAugmentsTag
      | JSDocAuthorTag
      | JSDocFunctionType
      | JSDocImplementsTag
      | JSDocSignature
      | JSDocTemplateTag
      | JSDocTypedefTag
      | JSDocTypeExpression
      | JSDocTypeLiteral
      | JSDocTypeReferencingNode
      | JsxAttribute
      | JsxAttributes
      | JsxClosingElement
      | JsxElement
      | JsxExpression
      | JsxFragment
      | JsxOpeningLikeElement
      | JsxSpreadAttribute
      | LabeledStatement
      | LiteralTypeNode
      | MappedTypeNode
      | MetaProperty
      | MissingDeclaration
      | ModuleDeclaration
      | NamedImportsOrExports
      | NamedTupleMember
      | NamespaceExport
      | NamespaceExportDeclaration
      | NamespaceImport
      | NonNullExpression
      | ObjectLiteralExpression
      | OptionalTypeNode
      | ParameterDeclaration
      | ParenthesizedExpression
      | ParenthesizedTypeNode
      | PartiallyEmittedExpression
      | PostfixUnaryExpression
      | PrefixUnaryExpression
      | PropertyAccessExpression
      | PropertyAssignment
      | PropertyDeclaration
      | PropertySignature
      | QualifiedName
      | RestTypeNode
      | ReturnStatement
      | ShorthandPropertyAssignment
      | SignatureDeclaration
      | SourceFile
      | SpreadAssignment
      | SpreadElement
      | SwitchStatement
      | TaggedTemplateExpression
      | TemplateExpression
      | TemplateSpan
      | ThrowStatement
      | TryStatement
      | TupleTypeNode
      | TypeAliasDeclaration
      | TypeAssertion
      | TypeLiteralNode
      | TypeOfExpression
      | TypeOperatorNode
      | TypeParameterDeclaration
      | TypePredicateNode
      | TypeQueryNode
      | TypeReferenceNode
      | UnionOrIntersectionTypeNode
      | VariableDeclaration
      | VariableDeclarationList
      | VariableStatement
      | VoidExpression
      | WhileStatement
      | WithStatement
      | YieldExpression;
  }

  export function updateNode<T extends Node>(updated: T, original: T): T {
    if (updated !== original) {
      setOriginalNode(updated, original);
      setTextRange(updated, original);
      aggregateTransformFlags(updated);
    }
    return updated;
  }
  export function getSynthesizedClone<T extends Node>(node: T): T {
    if (node === undefined) return node;
    const clone = qn.createSynthesized(node.kind) as T;
    clone.flags |= node.flags;
    setOriginalNode(clone, node);
    for (const key in node) {
      if (clone.hasOwnProperty(key) || !node.hasOwnProperty(key)) continue;
      (<any>clone)[key] = (<any>node)[key];
    }
    return clone;
  }
  export function createLiteral(value: string | StringLiteral | NoSubstitutionLiteral | NumericLiteral | Identifier, isSingleQuote: boolean): StringLiteral; // eslint-disable-line @typescript-eslint/unified-signatures
  export function createLiteral(value: string | number, isSingleQuote: boolean): StringLiteral | NumericLiteral;
  /** If a node is passed, creates a string literal whose source text is read from a source node during emit. */
  export function createLiteral(value: string | StringLiteral | NoSubstitutionLiteral | NumericLiteral | Identifier): StringLiteral;
  export function createLiteral(value: number | PseudoBigInt): NumericLiteral;
  export function createLiteral(value: boolean): BooleanLiteral;
  export function createLiteral(value: string | number | PseudoBigInt | boolean): PrimaryExpression;
  export function createLiteral(value: string | number | PseudoBigInt | boolean | StringLiteral | NoSubstitutionLiteral | NumericLiteral | Identifier, isSingleQuote?: boolean): PrimaryExpression {
    if (typeof value === 'number') {
      return NumericLiteral.create(value + '');
    }
    // eslint-disable-next-line no-in-operator
    if (typeof value === 'object' && 'base10Value' in value) {
      // PseudoBigInt
      return BigIntLiteral.create(pseudoBigIntToString(value) + 'n');
    }
    if (typeof value === 'boolean') {
      return value ? createTrue() : createFalse();
    }
    if (isString(value)) {
      const res = StringLiteral.create(value);
      if (isSingleQuote) res.singleQuote = true;
      return res;
    }
    return createLiteralFromNode(value);
  }
  function createLiteralFromNode(sourceNode: Exclude<PropertyNameLiteral, PrivateIdentifier>): StringLiteral {
    const node = StringLiteral.create(getTextOfIdentifierOrLiteral(sourceNode));
    node.textSourceNode = sourceNode;
    return node;
  }
  export function createIdentifier(text: string): Identifier;
  export function createIdentifier(text: string, typeArguments: readonly (TypeNode | TypeParameterDeclaration)[] | undefined): Identifier; // eslint-disable-line @typescript-eslint/unified-signatures
  export function createIdentifier(text: string, typeArguments?: readonly (TypeNode | TypeParameterDeclaration)[]): Identifier {
    const node = <Identifier>qn.createSynthesized(Syntax.Identifier);
    node.escapedText = qy.get.escUnderscores(text);
    node.originalKeywordKind = text ? Token.fromString(text) : Syntax.Unknown;
    node.autoGenerateFlags = GeneratedIdentifierFlags.None;
    node.autoGenerateId = 0;
    if (typeArguments) {
      node.typeArguments = NodeArray.create(typeArguments as readonly TypeNode[]);
    }
    return node;
  }
  export function updateIdentifier(node: Identifier): Identifier;
  export function updateIdentifier(node: Identifier, typeArguments: NodeArray<TypeNode | TypeParameterDeclaration> | undefined): Identifier; // eslint-disable-line @typescript-eslint/unified-signatures
  export function updateIdentifier(node: Identifier, typeArguments?: NodeArray<TypeNode | TypeParameterDeclaration> | undefined): Identifier {
    return node.typeArguments !== typeArguments ? updateNode(createIdentifier(idText(node), typeArguments), node) : node;
  }
  let nextAutoGenerateId = 0;
  export function createTempVariable(recordTempVariable: ((node: Identifier) => void) | undefined): Identifier;
  export function createTempVariable(recordTempVariable: ((node: Identifier) => void) | undefined, reservedInNestedScopes: boolean): GeneratedIdentifier;
  export function createTempVariable(recordTempVariable: ((node: Identifier) => void) | undefined, reservedInNestedScopes?: boolean): GeneratedIdentifier {
    const name = createIdentifier('') as GeneratedIdentifier;
    name.autoGenerateFlags = GeneratedIdentifierFlags.Auto;
    name.autoGenerateId = nextAutoGenerateId;
    nextAutoGenerateId++;
    if (recordTempVariable) {
      recordTempVariable(name);
    }
    if (reservedInNestedScopes) {
      name.autoGenerateFlags |= GeneratedIdentifierFlags.ReservedInNestedScopes;
    }
    return name;
  }
  export function createLoopVariable(): Identifier {
    const name = createIdentifier('');
    name.autoGenerateFlags = GeneratedIdentifierFlags.Loop;
    name.autoGenerateId = nextAutoGenerateId;
    nextAutoGenerateId++;
    return name;
  }
  export function createUniqueName(text: string): Identifier {
    const name = createIdentifier(text);
    name.autoGenerateFlags = GeneratedIdentifierFlags.Unique;
    name.autoGenerateId = nextAutoGenerateId;
    nextAutoGenerateId++;
    return name;
  }
  export function createOptimisticUniqueName(text: string): GeneratedIdentifier;
  export function createOptimisticUniqueName(text: string): Identifier;
  export function createOptimisticUniqueName(text: string): GeneratedIdentifier {
    const name = createIdentifier(text) as GeneratedIdentifier;
    name.autoGenerateFlags = GeneratedIdentifierFlags.Unique | GeneratedIdentifierFlags.Optimistic;
    name.autoGenerateId = nextAutoGenerateId;
    nextAutoGenerateId++;
    return name;
  }
  export function createFileLevelUniqueName(text: string): Identifier {
    const name = createOptimisticUniqueName(text);
    name.autoGenerateFlags |= GeneratedIdentifierFlags.FileLevel;
    return name;
  }
  export function getGeneratedNameForNode(node: Node | undefined): Identifier;
  export function getGeneratedNameForNode(node: Node | undefined, flags: GeneratedIdentifierFlags): Identifier; // eslint-disable-line @typescript-eslint/unified-signatures
  export function getGeneratedNameForNode(node: Node | undefined, flags?: GeneratedIdentifierFlags): Identifier {
    const name = createIdentifier(node && qn.is.kind(Identifier, node) ? idText(node) : '');
    name.autoGenerateFlags = GeneratedIdentifierFlags.Node | flags!;
    name.autoGenerateId = nextAutoGenerateId;
    name.original = node;
    nextAutoGenerateId++;
    return name;
  }
  export function createPrivateIdentifier(text: string): PrivateIdentifier {
    if (text[0] !== '#') {
      fail('First character of private identifier must be #: ' + text);
    }
    const node = qn.createSynthesized(Syntax.PrivateIdentifier) as PrivateIdentifier;
    node.escapedText = qy.get.escUnderscores(text);
    return node;
  }
  export function createToken<TKind extends Syntax>(token: TKind) {
    return <Token<TKind>>qn.createSynthesized(token);
  }
  export function createSuper() {
    return <SuperExpression>qn.createSynthesized(Syntax.SuperKeyword);
  }
  export function createThis() {
    return <ThisExpression & Token<Syntax.ThisKeyword>>qn.createSynthesized(Syntax.ThisKeyword);
  }
  export function createNull() {
    return <NullLiteral & Token<Syntax.NullKeyword>>qn.createSynthesized(Syntax.NullKeyword);
  }
  export function createTrue() {
    return <BooleanLiteral & Token<Syntax.TrueKeyword>>qn.createSynthesized(Syntax.TrueKeyword);
  }
  export function createFalse() {
    return <BooleanLiteral & Token<Syntax.FalseKeyword>>qn.createSynthesized(Syntax.FalseKeyword);
  }
  export function createModifier<T extends Modifier['kind']>(kind: T): Token<T> {
    return createToken(kind);
  }
  export function createModifiersFromModifierFlags(flags: ModifierFlags) {
    const result: Modifier[] = [];
    if (flags & ModifierFlags.Export) {
      result.push(createModifier(Syntax.ExportKeyword));
    }
    if (flags & ModifierFlags.Ambient) {
      result.push(createModifier(Syntax.DeclareKeyword));
    }
    if (flags & ModifierFlags.Default) {
      result.push(createModifier(Syntax.DefaultKeyword));
    }
    if (flags & ModifierFlags.Const) {
      result.push(createModifier(Syntax.ConstKeyword));
    }
    if (flags & ModifierFlags.Public) {
      result.push(createModifier(Syntax.PublicKeyword));
    }
    if (flags & ModifierFlags.Private) {
      result.push(createModifier(Syntax.PrivateKeyword));
    }
    if (flags & ModifierFlags.Protected) {
      result.push(createModifier(Syntax.ProtectedKeyword));
    }
    if (flags & ModifierFlags.Abstract) {
      result.push(createModifier(Syntax.AbstractKeyword));
    }
    if (flags & ModifierFlags.Static) {
      result.push(createModifier(Syntax.StaticKeyword));
    }
    if (flags & ModifierFlags.Readonly) {
      result.push(createModifier(Syntax.ReadonlyKeyword));
    }
    if (flags & ModifierFlags.Async) {
      result.push(createModifier(Syntax.AsyncKeyword));
    }
    return result;
  }
  export function createTypeParameterDeclaration(name: string | Identifier, constraint?: TypeNode, defaultType?: TypeNode) {
    const node = qn.createSynthesized(Syntax.TypeParameter) as TypeParameterDeclaration;
    node.name = asName(name);
    node.constraint = constraint;
    node.default = defaultType;
    return node;
  }
  export function updateTypeParameterDeclaration(node: TypeParameterDeclaration, name: Identifier, constraint: TypeNode | undefined, defaultType: TypeNode | undefined) {
    return node.name !== name || node.constraint !== constraint || node.default !== defaultType ? updateNode(createTypeParameterDeclaration(name, constraint, defaultType), node) : node;
  }
  export function createParameter(
    decorators: readonly Decorator[] | undefined,
    modifiers: readonly Modifier[] | undefined,
    dot3Token: Dot3Token | undefined,
    name: string | BindingName,
    questionToken?: QuestionToken,
    type?: TypeNode,
    initializer?: Expression
  ) {
    const node = <ParameterDeclaration>qn.createSynthesized(Syntax.Parameter);
    node.decorators = NodeArray.from(decorators);
    node.modifiers = NodeArray.from(modifiers);
    node.dot3Token = dot3Token;
    node.name = asName(name);
    node.questionToken = questionToken;
    node.type = type;
    node.initializer = initializer ? parenthesizeExpressionForList(initializer) : undefined;
    return node;
  }
  export function updateParameter(
    node: ParameterDeclaration,
    decorators: readonly Decorator[] | undefined,
    modifiers: readonly Modifier[] | undefined,
    dot3Token: Dot3Token | undefined,
    name: string | BindingName,
    questionToken: QuestionToken | undefined,
    type: TypeNode | undefined,
    initializer: Expression | undefined
  ) {
    return node.decorators !== decorators ||
      node.modifiers !== modifiers ||
      node.dot3Token !== dot3Token ||
      node.name !== name ||
      node.questionToken !== questionToken ||
      node.type !== type ||
      node.initializer !== initializer
      ? updateNode(createParameter(decorators, modifiers, dot3Token, name, questionToken, type, initializer), node)
      : node;
  }
  export function createDecorator(expression: Expression) {
    const node = <Decorator>qn.createSynthesized(Syntax.Decorator);
    node.expression = parenthesizeForAccess(expression);
    return node;
  }
  export function updateDecorator(node: Decorator, expression: Expression) {
    return node.expression !== expression ? updateNode(createDecorator(expression), node) : node;
  }
  export function createArrayLiteral(elements?: readonly Expression[], multiLine?: boolean) {
    const node = <ArrayLiteralExpression>qn.createSynthesized(Syntax.ArrayLiteralExpression);
    node.elements = parenthesizeListElements(NodeArray.create(elements));
    if (multiLine) node.multiLine = true;
    return node;
  }
  export function updateArrayLiteral(node: ArrayLiteralExpression, elements: readonly Expression[]) {
    return node.elements !== elements ? updateNode(createArrayLiteral(elements, node.multiLine), node) : node;
  }
  export function createObjectLiteral(properties?: readonly ObjectLiteralElementLike[], multiLine?: boolean) {
    const node = <ObjectLiteralExpression>qn.createSynthesized(Syntax.ObjectLiteralExpression);
    node.properties = NodeArray.create(properties);
    if (multiLine) node.multiLine = true;
    return node;
  }
  export function updateObjectLiteral(node: ObjectLiteralExpression, properties: readonly ObjectLiteralElementLike[]) {
    return node.properties !== properties ? updateNode(createObjectLiteral(properties, node.multiLine), node) : node;
  }

  export function createPropertyAccess(expression: Expression, name: string | Identifier | PrivateIdentifier) {
    const node = <PropertyAccessExpression>qn.createSynthesized(Syntax.PropertyAccessExpression);
    node.expression = parenthesizeForAccess(expression);
    node.name = asName(name);
    setEmitFlags(node, EmitFlags.NoIndentation);
    return node;
  }

  export function updatePropertyAccess(node: PropertyAccessExpression, expression: Expression, name: Identifier | PrivateIdentifier) {
    if (qn.is.propertyAccessChain(node)) {
      return updatePropertyAccessChain(node, expression, node.questionDotToken, cast(name, isIdentifier));
    }
    // Because we are updating existed propertyAccess we want to inherit its emitFlags
    // instead of using the default from createPropertyAccess
    return node.expression !== expression || node.name !== name ? updateNode(setEmitFlags(createPropertyAccess(expression, name), qn.get.emitFlags(node)), node) : node;
  }

  export function createPropertyAccessChain(expression: Expression, questionDotToken: QuestionDotToken | undefined, name: string | Identifier) {
    const node = <PropertyAccessChain>qn.createSynthesized(Syntax.PropertyAccessExpression);
    node.flags |= NodeFlags.OptionalChain;
    node.expression = parenthesizeForAccess(expression);
    node.questionDotToken = questionDotToken;
    node.name = asName(name);
    setEmitFlags(node, EmitFlags.NoIndentation);
    return node;
  }

  export function updatePropertyAccessChain(node: PropertyAccessChain, expression: Expression, questionDotToken: QuestionDotToken | undefined, name: Identifier) {
    assert(!!(node.flags & NodeFlags.OptionalChain), 'Cannot update a PropertyAccessExpression using updatePropertyAccessChain. Use updatePropertyAccess instead.');
    // Because we are updating an existing PropertyAccessChain we want to inherit its emitFlags
    // instead of using the default from createPropertyAccess
    return node.expression !== expression || node.questionDotToken !== questionDotToken || node.name !== name
      ? updateNode(setEmitFlags(createPropertyAccessChain(expression, questionDotToken, name), qn.get.emitFlags(node)), node)
      : node;
  }

  export function createElementAccess(expression: Expression, index: number | Expression) {
    const node = <ElementAccessExpression>qn.createSynthesized(Syntax.ElementAccessExpression);
    node.expression = parenthesizeForAccess(expression);
    node.argumentExpression = asExpression(index);
    return node;
  }

  export function updateElementAccess(node: ElementAccessExpression, expression: Expression, argumentExpression: Expression) {
    if (qn.is.optionalChain(node)) {
      return updateElementAccessChain(node, expression, node.questionDotToken, argumentExpression);
    }
    return node.expression !== expression || node.argumentExpression !== argumentExpression ? updateNode(createElementAccess(expression, argumentExpression), node) : node;
  }

  export function createElementAccessChain(expression: Expression, questionDotToken: QuestionDotToken | undefined, index: number | Expression) {
    const node = <ElementAccessChain>qn.createSynthesized(Syntax.ElementAccessExpression);
    node.flags |= NodeFlags.OptionalChain;
    node.expression = parenthesizeForAccess(expression);
    node.questionDotToken = questionDotToken;
    node.argumentExpression = asExpression(index);
    return node;
  }

  export function updateElementAccessChain(node: ElementAccessChain, expression: Expression, questionDotToken: QuestionDotToken | undefined, argumentExpression: Expression) {
    assert(!!(node.flags & NodeFlags.OptionalChain), 'Cannot update an ElementAccessExpression using updateElementAccessChain. Use updateElementAccess instead.');
    return node.expression !== expression || node.questionDotToken !== questionDotToken || node.argumentExpression !== argumentExpression
      ? updateNode(createElementAccessChain(expression, questionDotToken, argumentExpression), node)
      : node;
  }

  export function createCall(expression: Expression, typeArguments: readonly TypeNode[] | undefined, argumentsArray: readonly Expression[] | undefined) {
    const node = <CallExpression>qn.createSynthesized(Syntax.CallExpression);
    node.expression = parenthesizeForAccess(expression);
    node.typeArguments = NodeArray.from(typeArguments);
    node.arguments = parenthesizeListElements(NodeArray.create(argumentsArray));
    return node;
  }

  export function updateCall(node: CallExpression, expression: Expression, typeArguments: readonly TypeNode[] | undefined, argumentsArray: readonly Expression[]) {
    if (qn.is.optionalChain(node)) {
      return updateCallChain(node, expression, node.questionDotToken, typeArguments, argumentsArray);
    }
    return node.expression !== expression || node.typeArguments !== typeArguments || node.arguments !== argumentsArray ? updateNode(createCall(expression, typeArguments, argumentsArray), node) : node;
  }

  export function createCallChain(
    expression: Expression,
    questionDotToken: QuestionDotToken | undefined,
    typeArguments: readonly TypeNode[] | undefined,
    argumentsArray: readonly Expression[] | undefined
  ) {
    const node = <CallChain>qn.createSynthesized(Syntax.CallExpression);
    node.flags |= NodeFlags.OptionalChain;
    node.expression = parenthesizeForAccess(expression);
    node.questionDotToken = questionDotToken;
    node.typeArguments = NodeArray.from(typeArguments);
    node.arguments = parenthesizeListElements(NodeArray.create(argumentsArray));
    return node;
  }

  export function updateCallChain(
    node: CallChain,
    expression: Expression,
    questionDotToken: QuestionDotToken | undefined,
    typeArguments: readonly TypeNode[] | undefined,
    argumentsArray: readonly Expression[]
  ) {
    assert(!!(node.flags & NodeFlags.OptionalChain), 'Cannot update a CallExpression using updateCallChain. Use updateCall instead.');
    return node.expression !== expression || node.questionDotToken !== questionDotToken || node.typeArguments !== typeArguments || node.arguments !== argumentsArray
      ? updateNode(createCallChain(expression, questionDotToken, typeArguments, argumentsArray), node)
      : node;
  }

  export function createNew(expression: Expression, typeArguments: readonly TypeNode[] | undefined, argumentsArray: readonly Expression[] | undefined) {
    const node = <NewExpression>qn.createSynthesized(Syntax.NewExpression);
    node.expression = parenthesizeForNew(expression);
    node.typeArguments = NodeArray.from(typeArguments);
    node.arguments = argumentsArray ? parenthesizeListElements(NodeArray.create(argumentsArray)) : undefined;
    return node;
  }

  export function updateNew(node: NewExpression, expression: Expression, typeArguments: readonly TypeNode[] | undefined, argumentsArray: readonly Expression[] | undefined) {
    return node.expression !== expression || node.typeArguments !== typeArguments || node.arguments !== argumentsArray ? updateNode(createNew(expression, typeArguments, argumentsArray), node) : node;
  }

  /** @deprecated */ export function createTaggedTemplate(tag: Expression, template: TemplateLiteral): TaggedTemplateExpression;
  export function createTaggedTemplate(tag: Expression, typeArguments: readonly TypeNode[] | undefined, template: TemplateLiteral): TaggedTemplateExpression;

  export function createTaggedTemplate(tag: Expression, typeArgumentsOrTemplate: readonly TypeNode[] | TemplateLiteral | undefined, template?: TemplateLiteral): TaggedTemplateExpression;
  export function createTaggedTemplate(tag: Expression, typeArgumentsOrTemplate: readonly TypeNode[] | TemplateLiteral | undefined, template?: TemplateLiteral) {
    const node = <TaggedTemplateExpression>qn.createSynthesized(Syntax.TaggedTemplateExpression);
    node.tag = parenthesizeForAccess(tag);
    if (template) {
      node.typeArguments = NodeArray.from(typeArgumentsOrTemplate as readonly TypeNode[]);
      node.template = template;
    } else {
      node.typeArguments = undefined;
      node.template = typeArgumentsOrTemplate as TemplateLiteral;
    }
    return node;
  }

  /** @deprecated */ export function updateTaggedTemplate(node: TaggedTemplateExpression, tag: Expression, template: TemplateLiteral): TaggedTemplateExpression;
  export function updateTaggedTemplate(node: TaggedTemplateExpression, tag: Expression, typeArguments: readonly TypeNode[] | undefined, template: TemplateLiteral): TaggedTemplateExpression;
  export function updateTaggedTemplate(node: TaggedTemplateExpression, tag: Expression, typeArgumentsOrTemplate: readonly TypeNode[] | TemplateLiteral | undefined, template?: TemplateLiteral) {
    return node.tag !== tag || (template ? node.typeArguments !== typeArgumentsOrTemplate || node.template !== template : node.typeArguments !== undefined || node.template !== typeArgumentsOrTemplate)
      ? updateNode(createTaggedTemplate(tag, typeArgumentsOrTemplate, template), node)
      : node;
  }

  export function createTypeAssertion(type: TypeNode, expression: Expression) {
    const node = <TypeAssertion>qn.createSynthesized(Syntax.TypeAssertionExpression);
    node.type = type;
    node.expression = parenthesizePrefixOperand(expression);
    return node;
  }

  export function updateTypeAssertion(node: TypeAssertion, type: TypeNode, expression: Expression) {
    return node.type !== type || node.expression !== expression ? updateNode(createTypeAssertion(type, expression), node) : node;
  }

  export function createParen(expression: Expression) {
    const node = <ParenthesizedExpression>qn.createSynthesized(Syntax.ParenthesizedExpression);
    node.expression = expression;
    return node;
  }

  export function updateParen(node: ParenthesizedExpression, expression: Expression) {
    return node.expression !== expression ? updateNode(createParen(expression), node) : node;
  }

  export function createFunctionExpression(
    modifiers: readonly Modifier[] | undefined,
    asteriskToken: AsteriskToken | undefined,
    name: string | Identifier | undefined,
    typeParameters: readonly TypeParameterDeclaration[] | undefined,
    parameters: readonly ParameterDeclaration[] | undefined,
    type: TypeNode | undefined,
    body: Block
  ) {
    const node = <FunctionExpression>qn.createSynthesized(Syntax.FunctionExpression);
    node.modifiers = NodeArray.from(modifiers);
    node.asteriskToken = asteriskToken;
    node.name = asName(name);
    node.typeParameters = NodeArray.from(typeParameters);
    node.parameters = NodeArray.create(parameters);
    node.type = type;
    node.body = body;
    return node;
  }

  export function updateFunctionExpression(
    node: FunctionExpression,
    modifiers: readonly Modifier[] | undefined,
    asteriskToken: AsteriskToken | undefined,
    name: Identifier | undefined,
    typeParameters: readonly TypeParameterDeclaration[] | undefined,
    parameters: readonly ParameterDeclaration[],
    type: TypeNode | undefined,
    body: Block
  ) {
    return node.name !== name ||
      node.modifiers !== modifiers ||
      node.asteriskToken !== asteriskToken ||
      node.typeParameters !== typeParameters ||
      node.parameters !== parameters ||
      node.type !== type ||
      node.body !== body
      ? updateNode(createFunctionExpression(modifiers, asteriskToken, name, typeParameters, parameters, type, body), node)
      : node;
  }

  export function createArrowFunction(
    modifiers: readonly Modifier[] | undefined,
    typeParameters: readonly TypeParameterDeclaration[] | undefined,
    parameters: readonly ParameterDeclaration[],
    type: TypeNode | undefined,
    equalsGreaterThanToken: EqualsGreaterThanToken | undefined,
    body: ConciseBody
  ) {
    const node = <ArrowFunction>qn.createSynthesized(Syntax.ArrowFunction);
    node.modifiers = NodeArray.from(modifiers);
    node.typeParameters = NodeArray.from(typeParameters);
    node.parameters = NodeArray.create(parameters);
    node.type = type;
    node.equalsGreaterThanToken = equalsGreaterThanToken || createToken(Syntax.EqualsGreaterThanToken);
    node.body = parenthesizeConciseBody(body);
    return node;
  }
  export function updateArrowFunction(
    node: ArrowFunction,
    modifiers: readonly Modifier[] | undefined,
    typeParameters: readonly TypeParameterDeclaration[] | undefined,
    parameters: readonly ParameterDeclaration[],
    type: TypeNode | undefined,
    equalsGreaterThanToken: Token<Syntax.EqualsGreaterThanToken>,
    body: ConciseBody
  ): ArrowFunction {
    return node.modifiers !== modifiers ||
      node.typeParameters !== typeParameters ||
      node.parameters !== parameters ||
      node.type !== type ||
      node.equalsGreaterThanToken !== equalsGreaterThanToken ||
      node.body !== body
      ? updateNode(createArrowFunction(modifiers, typeParameters, parameters, type, equalsGreaterThanToken, body), node)
      : node;
  }

  export function createDelete(expression: Expression) {
    const node = <DeleteExpression>qn.createSynthesized(Syntax.DeleteExpression);
    node.expression = parenthesizePrefixOperand(expression);
    return node;
  }

  export function updateDelete(node: DeleteExpression, expression: Expression) {
    return node.expression !== expression ? updateNode(createDelete(expression), node) : node;
  }

  export function createTypeOf(expression: Expression) {
    const node = <TypeOfExpression>qn.createSynthesized(Syntax.TypeOfExpression);
    node.expression = parenthesizePrefixOperand(expression);
    return node;
  }

  export function updateTypeOf(node: TypeOfExpression, expression: Expression) {
    return node.expression !== expression ? updateNode(createTypeOf(expression), node) : node;
  }

  export function createVoid(expression: Expression) {
    const node = <VoidExpression>qn.createSynthesized(Syntax.VoidExpression);
    node.expression = parenthesizePrefixOperand(expression);
    return node;
  }

  export function updateVoid(node: VoidExpression, expression: Expression) {
    return node.expression !== expression ? updateNode(createVoid(expression), node) : node;
  }

  export function createAwait(expression: Expression) {
    const node = <AwaitExpression>qn.createSynthesized(Syntax.AwaitExpression);
    node.expression = parenthesizePrefixOperand(expression);
    return node;
  }

  export function updateAwait(node: AwaitExpression, expression: Expression) {
    return node.expression !== expression ? updateNode(createAwait(expression), node) : node;
  }

  export function createPrefix(operator: PrefixUnaryOperator, operand: Expression) {
    const node = <PrefixUnaryExpression>qn.createSynthesized(Syntax.PrefixUnaryExpression);
    node.operator = operator;
    node.operand = parenthesizePrefixOperand(operand);
    return node;
  }

  export function updatePrefix(node: PrefixUnaryExpression, operand: Expression) {
    return node.operand !== operand ? updateNode(createPrefix(node.operator, operand), node) : node;
  }

  export function createPostfix(operand: Expression, operator: PostfixUnaryOperator) {
    const node = <PostfixUnaryExpression>qn.createSynthesized(Syntax.PostfixUnaryExpression);
    node.operand = parenthesizePostfixOperand(operand);
    node.operator = operator;
    return node;
  }

  export function updatePostfix(node: PostfixUnaryExpression, operand: Expression) {
    return node.operand !== operand ? updateNode(createPostfix(operand, node.operator), node) : node;
  }

  export function createBinary(left: Expression, operator: BinaryOperator | BinaryOperatorToken, right: Expression) {
    const node = <BinaryExpression>qn.createSynthesized(Syntax.BinaryExpression);
    const operatorToken = asToken(operator);
    const operatorKind = operatorToken.kind;
    node.left = parenthesizeBinaryOperand(operatorKind, left, /*isLeftSideOfBinary*/ true, /*leftOperand*/ undefined);
    node.operatorToken = operatorToken;
    node.right = parenthesizeBinaryOperand(operatorKind, right, /*isLeftSideOfBinary*/ false, node.left);
    return node;
  }

  export function updateBinary(node: BinaryExpression, left: Expression, right: Expression, operator: BinaryOperator | BinaryOperatorToken = node.operatorToken) {
    return node.left !== left || node.right !== right || node.operatorToken !== operator ? updateNode(createBinary(left, operator, right), node) : node;
  }

  /** @deprecated */ export function createConditional(condition: Expression, whenTrue: Expression, whenFalse: Expression): ConditionalExpression;
  export function createConditional(condition: Expression, questionToken: QuestionToken, whenTrue: Expression, colonToken: ColonToken, whenFalse: Expression): ConditionalExpression;
  export function createConditional(condition: Expression, questionTokenOrWhenTrue: QuestionToken | Expression, whenTrueOrWhenFalse: Expression, colonToken?: ColonToken, whenFalse?: Expression) {
    const node = <ConditionalExpression>qn.createSynthesized(Syntax.ConditionalExpression);
    node.condition = parenthesizeForConditionalHead(condition);
    node.questionToken = whenFalse ? <QuestionToken>questionTokenOrWhenTrue : createToken(Syntax.QuestionToken);
    node.whenTrue = parenthesizeSubexpressionOfConditionalExpression(whenFalse ? whenTrueOrWhenFalse : <Expression>questionTokenOrWhenTrue);
    node.colonToken = whenFalse ? colonToken! : createToken(Syntax.ColonToken);
    node.whenFalse = parenthesizeSubexpressionOfConditionalExpression(whenFalse ? whenFalse : whenTrueOrWhenFalse);
    return node;
  }
  export function updateConditional(
    node: ConditionalExpression,
    condition: Expression,
    questionToken: Token<Syntax.QuestionToken>,
    whenTrue: Expression,
    colonToken: Token<Syntax.ColonToken>,
    whenFalse: Expression
  ): ConditionalExpression {
    return node.condition !== condition || node.questionToken !== questionToken || node.whenTrue !== whenTrue || node.colonToken !== colonToken || node.whenFalse !== whenFalse
      ? updateNode(createConditional(condition, questionToken, whenTrue, colonToken, whenFalse), node)
      : node;
  }

  export function createTemplateExpression(head: TemplateHead, templateSpans: readonly TemplateSpan[]) {
    const node = <TemplateExpression>qn.createSynthesized(Syntax.TemplateExpression);
    node.head = head;
    node.templateSpans = NodeArray.create(templateSpans);
    return node;
  }

  export function updateTemplateExpression(node: TemplateExpression, head: TemplateHead, templateSpans: readonly TemplateSpan[]) {
    return node.head !== head || node.templateSpans !== templateSpans ? updateNode(createTemplateExpression(head, templateSpans), node) : node;
  }

  export function createYield(expression?: Expression): YieldExpression;
  export function createYield(asteriskToken: AsteriskToken | undefined, expression: Expression): YieldExpression;
  export function createYield(asteriskTokenOrExpression?: AsteriskToken | undefined | Expression, expression?: Expression) {
    const asteriskToken = asteriskTokenOrExpression && asteriskTokenOrExpression.kind === Syntax.AsteriskToken ? <AsteriskToken>asteriskTokenOrExpression : undefined;
    expression = asteriskTokenOrExpression && asteriskTokenOrExpression.kind !== Syntax.AsteriskToken ? asteriskTokenOrExpression : expression;
    const node = <YieldExpression>qn.createSynthesized(Syntax.YieldExpression);
    node.asteriskToken = asteriskToken;
    node.expression = expression && parenthesizeExpressionForList(expression);
    return node;
  }

  export function updateYield(node: YieldExpression, asteriskToken: AsteriskToken | undefined, expression: Expression) {
    return node.expression !== expression || node.asteriskToken !== asteriskToken ? updateNode(createYield(asteriskToken, expression), node) : node;
  }

  export function createSpread(expression: Expression) {
    const node = <SpreadElement>qn.createSynthesized(Syntax.SpreadElement);
    node.expression = parenthesizeExpressionForList(expression);
    return node;
  }

  export function updateSpread(node: SpreadElement, expression: Expression) {
    return node.expression !== expression ? updateNode(createSpread(expression), node) : node;
  }

  export function createClassExpression(
    modifiers: readonly Modifier[] | undefined,
    name: string | Identifier | undefined,
    typeParameters: readonly TypeParameterDeclaration[] | undefined,
    heritageClauses: readonly HeritageClause[] | undefined,
    members: readonly ClassElement[]
  ) {
    const node = <ClassExpression>qn.createSynthesized(Syntax.ClassExpression);
    node.decorators = undefined;
    node.modifiers = NodeArray.from(modifiers);
    node.name = asName(name);
    node.typeParameters = NodeArray.from(typeParameters);
    node.heritageClauses = NodeArray.from(heritageClauses);
    node.members = NodeArray.create(members);
    return node;
  }

  export function updateClassExpression(
    node: ClassExpression,
    modifiers: readonly Modifier[] | undefined,
    name: Identifier | undefined,
    typeParameters: readonly TypeParameterDeclaration[] | undefined,
    heritageClauses: readonly HeritageClause[] | undefined,
    members: readonly ClassElement[]
  ) {
    return node.modifiers !== modifiers || node.name !== name || node.typeParameters !== typeParameters || node.heritageClauses !== heritageClauses || node.members !== members
      ? updateNode(createClassExpression(modifiers, name, typeParameters, heritageClauses, members), node)
      : node;
  }

  export function createOmittedExpression() {
    return <OmittedExpression>qn.createSynthesized(Syntax.OmittedExpression);
  }

  export function createExpressionWithTypeArguments(typeArguments: readonly TypeNode[] | undefined, expression: Expression) {
    const node = <ExpressionWithTypeArguments>qn.createSynthesized(Syntax.ExpressionWithTypeArguments);
    node.expression = parenthesizeForAccess(expression);
    node.typeArguments = NodeArray.from(typeArguments);
    return node;
  }

  export function updateExpressionWithTypeArguments(node: ExpressionWithTypeArguments, typeArguments: readonly TypeNode[] | undefined, expression: Expression) {
    return node.typeArguments !== typeArguments || node.expression !== expression ? updateNode(createExpressionWithTypeArguments(typeArguments, expression), node) : node;
  }

  export function createAsExpression(expression: Expression, type: TypeNode) {
    const node = <AsExpression>qn.createSynthesized(Syntax.AsExpression);
    node.expression = expression;
    node.type = type;
    return node;
  }

  export function updateAsExpression(node: AsExpression, expression: Expression, type: TypeNode) {
    return node.expression !== expression || node.type !== type ? updateNode(createAsExpression(expression, type), node) : node;
  }

  export function createNonNullExpression(expression: Expression) {
    const node = <NonNullExpression>qn.createSynthesized(Syntax.NonNullExpression);
    node.expression = parenthesizeForAccess(expression);
    return node;
  }

  export function updateNonNullExpression(node: NonNullExpression, expression: Expression) {
    if (qn.is.nonNullChain(node)) {
      return updateNonNullChain(node, expression);
    }
    return node.expression !== expression ? updateNode(createNonNullExpression(expression), node) : node;
  }

  export function createNonNullChain(expression: Expression) {
    const node = <NonNullChain>qn.createSynthesized(Syntax.NonNullExpression);
    node.flags |= NodeFlags.OptionalChain;
    node.expression = parenthesizeForAccess(expression);
    return node;
  }

  export function updateNonNullChain(node: NonNullChain, expression: Expression) {
    assert(!!(node.flags & NodeFlags.OptionalChain), 'Cannot update a NonNullExpression using updateNonNullChain. Use updateNonNullExpression instead.');
    return node.expression !== expression ? updateNode(createNonNullChain(expression), node) : node;
  }

  export function createMetaProperty(keywordToken: MetaProperty['keywordToken'], name: Identifier) {
    const node = <MetaProperty>qn.createSynthesized(Syntax.MetaProperty);
    node.keywordToken = keywordToken;
    node.name = name;
    return node;
  }

  export function updateMetaProperty(node: MetaProperty, name: Identifier) {
    return node.name !== name ? updateNode(createMetaProperty(node.keywordToken, name), node) : node;
  }

  // Misc

  export function createTemplateSpan(expression: Expression, literal: TemplateMiddle | TemplateTail) {
    const node = <TemplateSpan>qn.createSynthesized(Syntax.TemplateSpan);
    node.expression = expression;
    node.literal = literal;
    return node;
  }

  export function updateTemplateSpan(node: TemplateSpan, expression: Expression, literal: TemplateMiddle | TemplateTail) {
    return node.expression !== expression || node.literal !== literal ? updateNode(createTemplateSpan(expression, literal), node) : node;
  }

  export function createSemicolonClassElement() {
    return <SemicolonClassElement>qn.createSynthesized(Syntax.SemicolonClassElement);
  }

  // Element

  export function createBlock(statements: readonly Statement[], multiLine?: boolean): Block {
    const block = <Block>qn.createSynthesized(Syntax.Block);
    block.statements = NodeArray.create(statements);
    if (multiLine) block.multiLine = multiLine;
    return block;
  }

  export function updateBlock(node: Block, statements: readonly Statement[]) {
    return node.statements !== statements ? updateNode(createBlock(statements, node.multiLine), node) : node;
  }

  export function createVariableStatement(modifiers: readonly Modifier[] | undefined, declarationList: VariableDeclarationList | readonly VariableDeclaration[]) {
    const node = <VariableStatement>qn.createSynthesized(Syntax.VariableStatement);
    node.decorators = undefined;
    node.modifiers = NodeArray.from(modifiers);
    node.declarationList = isArray(declarationList) ? createVariableDeclarationList(declarationList) : declarationList;
    return node;
  }

  export function updateVariableStatement(node: VariableStatement, modifiers: readonly Modifier[] | undefined, declarationList: VariableDeclarationList) {
    return node.modifiers !== modifiers || node.declarationList !== declarationList ? updateNode(createVariableStatement(modifiers, declarationList), node) : node;
  }

  export function createEmptyStatement() {
    return <EmptyStatement>qn.createSynthesized(Syntax.EmptyStatement);
  }

  export function createExpressionStatement(expression: Expression): ExpressionStatement {
    const node = <ExpressionStatement>qn.createSynthesized(Syntax.ExpressionStatement);
    node.expression = parenthesizeExpressionForExpressionStatement(expression);
    return node;
  }

  export function updateExpressionStatement(node: ExpressionStatement, expression: Expression) {
    return node.expression !== expression ? updateNode(createExpressionStatement(expression), node) : node;
  }

  /** @deprecated Use `createExpressionStatement` instead.  */
  export const createStatement = createExpressionStatement;
  /** @deprecated Use `updateExpressionStatement` instead.  */
  export const updateStatement = updateExpressionStatement;

  export function createIf(expression: Expression, thenStatement: Statement, elseStatement?: Statement) {
    const node = <IfStatement>qn.createSynthesized(Syntax.IfStatement);
    node.expression = expression;
    node.thenStatement = asEmbeddedStatement(thenStatement);
    node.elseStatement = asEmbeddedStatement(elseStatement);
    return node;
  }

  export function updateIf(node: IfStatement, expression: Expression, thenStatement: Statement, elseStatement: Statement | undefined) {
    return node.expression !== expression || node.thenStatement !== thenStatement || node.elseStatement !== elseStatement ? updateNode(createIf(expression, thenStatement, elseStatement), node) : node;
  }

  export function createDo(statement: Statement, expression: Expression) {
    const node = <DoStatement>qn.createSynthesized(Syntax.DoStatement);
    node.statement = asEmbeddedStatement(statement);
    node.expression = expression;
    return node;
  }

  export function updateDo(node: DoStatement, statement: Statement, expression: Expression) {
    return node.statement !== statement || node.expression !== expression ? updateNode(createDo(statement, expression), node) : node;
  }

  export function createWhile(expression: Expression, statement: Statement) {
    const node = <WhileStatement>qn.createSynthesized(Syntax.WhileStatement);
    node.expression = expression;
    node.statement = asEmbeddedStatement(statement);
    return node;
  }

  export function updateWhile(node: WhileStatement, expression: Expression, statement: Statement) {
    return node.expression !== expression || node.statement !== statement ? updateNode(createWhile(expression, statement), node) : node;
  }

  export function createFor(initializer: ForInitializer | undefined, condition: Expression | undefined, incrementor: Expression | undefined, statement: Statement) {
    const node = <ForStatement>qn.createSynthesized(Syntax.ForStatement);
    node.initializer = initializer;
    node.condition = condition;
    node.incrementor = incrementor;
    node.statement = asEmbeddedStatement(statement);
    return node;
  }

  export function updateFor(node: ForStatement, initializer: ForInitializer | undefined, condition: Expression | undefined, incrementor: Expression | undefined, statement: Statement) {
    return node.initializer !== initializer || node.condition !== condition || node.incrementor !== incrementor || node.statement !== statement
      ? updateNode(createFor(initializer, condition, incrementor, statement), node)
      : node;
  }

  export function createForIn(initializer: ForInitializer, expression: Expression, statement: Statement) {
    const node = <ForInStatement>qn.createSynthesized(Syntax.ForInStatement);
    node.initializer = initializer;
    node.expression = expression;
    node.statement = asEmbeddedStatement(statement);
    return node;
  }

  export function updateForIn(node: ForInStatement, initializer: ForInitializer, expression: Expression, statement: Statement) {
    return node.initializer !== initializer || node.expression !== expression || node.statement !== statement ? updateNode(createForIn(initializer, expression, statement), node) : node;
  }

  export function createForOf(awaitModifier: AwaitKeywordToken | undefined, initializer: ForInitializer, expression: Expression, statement: Statement) {
    const node = <ForOfStatement>qn.createSynthesized(Syntax.ForOfStatement);
    node.awaitModifier = awaitModifier;
    node.initializer = initializer;
    node.expression = isCommaSequence(expression) ? createParen(expression) : expression;
    node.statement = asEmbeddedStatement(statement);
    return node;
  }

  export function updateForOf(node: ForOfStatement, awaitModifier: AwaitKeywordToken | undefined, initializer: ForInitializer, expression: Expression, statement: Statement) {
    return node.awaitModifier !== awaitModifier || node.initializer !== initializer || node.expression !== expression || node.statement !== statement
      ? updateNode(createForOf(awaitModifier, initializer, expression, statement), node)
      : node;
  }

  export function createContinue(label?: string | Identifier): ContinueStatement {
    const node = <ContinueStatement>qn.createSynthesized(Syntax.ContinueStatement);
    node.label = asName(label);
    return node;
  }

  export function updateContinue(node: ContinueStatement, label: Identifier | undefined) {
    return node.label !== label ? updateNode(createContinue(label), node) : node;
  }

  export function createBreak(label?: string | Identifier): BreakStatement {
    const node = <BreakStatement>qn.createSynthesized(Syntax.BreakStatement);
    node.label = asName(label);
    return node;
  }

  export function updateBreak(node: BreakStatement, label: Identifier | undefined) {
    return node.label !== label ? updateNode(createBreak(label), node) : node;
  }

  export function createReturn(expression?: Expression): ReturnStatement {
    const node = <ReturnStatement>qn.createSynthesized(Syntax.ReturnStatement);
    node.expression = expression;
    return node;
  }

  export function updateReturn(node: ReturnStatement, expression: Expression | undefined) {
    return node.expression !== expression ? updateNode(createReturn(expression), node) : node;
  }

  export function createWith(expression: Expression, statement: Statement) {
    const node = <WithStatement>qn.createSynthesized(Syntax.WithStatement);
    node.expression = expression;
    node.statement = asEmbeddedStatement(statement);
    return node;
  }

  export function updateWith(node: WithStatement, expression: Expression, statement: Statement) {
    return node.expression !== expression || node.statement !== statement ? updateNode(createWith(expression, statement), node) : node;
  }

  export function createSwitch(expression: Expression, caseBlock: CaseBlock): SwitchStatement {
    const node = <SwitchStatement>qn.createSynthesized(Syntax.SwitchStatement);
    node.expression = parenthesizeExpressionForList(expression);
    node.caseBlock = caseBlock;
    return node;
  }

  export function updateSwitch(node: SwitchStatement, expression: Expression, caseBlock: CaseBlock) {
    return node.expression !== expression || node.caseBlock !== caseBlock ? updateNode(createSwitch(expression, caseBlock), node) : node;
  }

  export function createLabel(label: string | Identifier, statement: Statement) {
    const node = <LabeledStatement>qn.createSynthesized(Syntax.LabeledStatement);
    node.label = asName(label);
    node.statement = asEmbeddedStatement(statement);
    return node;
  }

  export function updateLabel(node: LabeledStatement, label: Identifier, statement: Statement) {
    return node.label !== label || node.statement !== statement ? updateNode(createLabel(label, statement), node) : node;
  }

  export function createThrow(expression: Expression) {
    const node = <ThrowStatement>qn.createSynthesized(Syntax.ThrowStatement);
    node.expression = expression;
    return node;
  }

  export function updateThrow(node: ThrowStatement, expression: Expression) {
    return node.expression !== expression ? updateNode(createThrow(expression), node) : node;
  }

  export function createTry(tryBlock: Block, catchClause: CatchClause | undefined, finallyBlock: Block | undefined) {
    const node = <TryStatement>qn.createSynthesized(Syntax.TryStatement);
    node.tryBlock = tryBlock;
    node.catchClause = catchClause;
    node.finallyBlock = finallyBlock;
    return node;
  }

  export function updateTry(node: TryStatement, tryBlock: Block, catchClause: CatchClause | undefined, finallyBlock: Block | undefined) {
    return node.tryBlock !== tryBlock || node.catchClause !== catchClause || node.finallyBlock !== finallyBlock ? updateNode(createTry(tryBlock, catchClause, finallyBlock), node) : node;
  }

  export function createDebuggerStatement() {
    return <DebuggerStatement>qn.createSynthesized(Syntax.DebuggerStatement);
  }

  export function createVariableDeclaration(name: string | BindingName, type?: TypeNode, initializer?: Expression) {
    /* Internally, one should probably use createTypeScriptVariableDeclaration instead and handle definite assignment assertions */
    const node = <VariableDeclaration>qn.createSynthesized(Syntax.VariableDeclaration);
    node.name = asName(name);
    node.type = type;
    node.initializer = initializer !== undefined ? parenthesizeExpressionForList(initializer) : undefined;
    return node;
  }

  export function updateVariableDeclaration(node: VariableDeclaration, name: BindingName, type: TypeNode | undefined, initializer: Expression | undefined) {
    /* Internally, one should probably use updateTypeScriptVariableDeclaration instead and handle definite assignment assertions */
    return node.name !== name || node.type !== type || node.initializer !== initializer ? updateNode(createVariableDeclaration(name, type, initializer), node) : node;
  }

  export function createTypeScriptVariableDeclaration(name: string | BindingName, exclaimationToken?: Token<Syntax.ExclamationToken>, type?: TypeNode, initializer?: Expression) {
    const node = <VariableDeclaration>qn.createSynthesized(Syntax.VariableDeclaration);
    node.name = asName(name);
    node.type = type;
    node.initializer = initializer !== undefined ? parenthesizeExpressionForList(initializer) : undefined;
    node.exclamationToken = exclaimationToken;
    return node;
  }

  export function updateTypeScriptVariableDeclaration(
    node: VariableDeclaration,
    name: BindingName,
    exclaimationToken: Token<Syntax.ExclamationToken> | undefined,
    type: TypeNode | undefined,
    initializer: Expression | undefined
  ) {
    return node.name !== name || node.type !== type || node.initializer !== initializer || node.exclamationToken !== exclaimationToken
      ? updateNode(createTypeScriptVariableDeclaration(name, exclaimationToken, type, initializer), node)
      : node;
  }

  export function createVariableDeclarationList(declarations: readonly VariableDeclaration[], flags = NodeFlags.None) {
    const node = <VariableDeclarationList>qn.createSynthesized(Syntax.VariableDeclarationList);
    node.flags |= flags & NodeFlags.BlockScoped;
    node.declarations = NodeArray.create(declarations);
    return node;
  }

  export function updateVariableDeclarationList(node: VariableDeclarationList, declarations: readonly VariableDeclaration[]) {
    return node.declarations !== declarations ? updateNode(createVariableDeclarationList(declarations, node.flags), node) : node;
  }

  export function createFunctionDeclaration(
    decorators: readonly Decorator[] | undefined,
    modifiers: readonly Modifier[] | undefined,
    asteriskToken: AsteriskToken | undefined,
    name: string | Identifier | undefined,
    typeParameters: readonly TypeParameterDeclaration[] | undefined,
    parameters: readonly ParameterDeclaration[],
    type: TypeNode | undefined,
    body: Block | undefined
  ) {
    const node = <FunctionDeclaration>qn.createSynthesized(Syntax.FunctionDeclaration);
    node.decorators = NodeArray.from(decorators);
    node.modifiers = NodeArray.from(modifiers);
    node.asteriskToken = asteriskToken;
    node.name = asName(name);
    node.typeParameters = NodeArray.from(typeParameters);
    node.parameters = NodeArray.create(parameters);
    node.type = type;
    node.body = body;
    return node;
  }

  export function updateFunctionDeclaration(
    node: FunctionDeclaration,
    decorators: readonly Decorator[] | undefined,
    modifiers: readonly Modifier[] | undefined,
    asteriskToken: AsteriskToken | undefined,
    name: Identifier | undefined,
    typeParameters: readonly TypeParameterDeclaration[] | undefined,
    parameters: readonly ParameterDeclaration[],
    type: TypeNode | undefined,
    body: Block | undefined
  ) {
    return node.decorators !== decorators ||
      node.modifiers !== modifiers ||
      node.asteriskToken !== asteriskToken ||
      node.name !== name ||
      node.typeParameters !== typeParameters ||
      node.parameters !== parameters ||
      node.type !== type ||
      node.body !== body
      ? updateNode(createFunctionDeclaration(decorators, modifiers, asteriskToken, name, typeParameters, parameters, type, body), node)
      : node;
  }

  export function updateFunctionLikeBody(declaration: FunctionLikeDeclaration, body: Block): FunctionLikeDeclaration {
    switch (declaration.kind) {
      case Syntax.FunctionDeclaration:
        return createFunctionDeclaration(
          declaration.decorators,
          declaration.modifiers,
          declaration.asteriskToken,
          declaration.name,
          declaration.typeParameters,
          declaration.parameters,
          declaration.type,
          body
        );
      case Syntax.MethodDeclaration:
        return MethodDeclaration.create(
          declaration.decorators,
          declaration.modifiers,
          declaration.asteriskToken,
          declaration.name,
          declaration.questionToken,
          declaration.typeParameters,
          declaration.parameters,
          declaration.type,
          body
        );
      case Syntax.GetAccessor:
        return GetAccessorDeclaration.create(declaration.decorators, declaration.modifiers, declaration.name, declaration.parameters, declaration.type, body);
      case Syntax.SetAccessor:
        return SetAccessorDeclaration.create(declaration.decorators, declaration.modifiers, declaration.name, declaration.parameters, body);
      case Syntax.Constructor:
        return ConstructorDeclaration.create(declaration.decorators, declaration.modifiers, declaration.parameters, body);
      case Syntax.FunctionExpression:
        return createFunctionExpression(declaration.modifiers, declaration.asteriskToken, declaration.name, declaration.typeParameters, declaration.parameters, declaration.type, body);
      case Syntax.ArrowFunction:
        return createArrowFunction(declaration.modifiers, declaration.typeParameters, declaration.parameters, declaration.type, declaration.equalsGreaterThanToken, body);
    }
  }

  export function createClassDeclaration(
    decorators: readonly Decorator[] | undefined,
    modifiers: readonly Modifier[] | undefined,
    name: string | Identifier | undefined,
    typeParameters: readonly TypeParameterDeclaration[] | undefined,
    heritageClauses: readonly HeritageClause[] | undefined,
    members: readonly ClassElement[]
  ) {
    const node = <ClassDeclaration>qn.createSynthesized(Syntax.ClassDeclaration);
    node.decorators = NodeArray.from(decorators);
    node.modifiers = NodeArray.from(modifiers);
    node.name = asName(name);
    node.typeParameters = NodeArray.from(typeParameters);
    node.heritageClauses = NodeArray.from(heritageClauses);
    node.members = NodeArray.create(members);
    return node;
  }

  export function updateClassDeclaration(
    node: ClassDeclaration,
    decorators: readonly Decorator[] | undefined,
    modifiers: readonly Modifier[] | undefined,
    name: Identifier | undefined,
    typeParameters: readonly TypeParameterDeclaration[] | undefined,
    heritageClauses: readonly HeritageClause[] | undefined,
    members: readonly ClassElement[]
  ) {
    return node.decorators !== decorators ||
      node.modifiers !== modifiers ||
      node.name !== name ||
      node.typeParameters !== typeParameters ||
      node.heritageClauses !== heritageClauses ||
      node.members !== members
      ? updateNode(createClassDeclaration(decorators, modifiers, name, typeParameters, heritageClauses, members), node)
      : node;
  }

  export function createInterfaceDeclaration(
    decorators: readonly Decorator[] | undefined,
    modifiers: readonly Modifier[] | undefined,
    name: string | Identifier,
    typeParameters: readonly TypeParameterDeclaration[] | undefined,
    heritageClauses: readonly HeritageClause[] | undefined,
    members: readonly TypeElement[]
  ) {
    const node = <InterfaceDeclaration>qn.createSynthesized(Syntax.InterfaceDeclaration);
    node.decorators = NodeArray.from(decorators);
    node.modifiers = NodeArray.from(modifiers);
    node.name = asName(name);
    node.typeParameters = NodeArray.from(typeParameters);
    node.heritageClauses = NodeArray.from(heritageClauses);
    node.members = NodeArray.create(members);
    return node;
  }

  export function updateInterfaceDeclaration(
    node: InterfaceDeclaration,
    decorators: readonly Decorator[] | undefined,
    modifiers: readonly Modifier[] | undefined,
    name: Identifier,
    typeParameters: readonly TypeParameterDeclaration[] | undefined,
    heritageClauses: readonly HeritageClause[] | undefined,
    members: readonly TypeElement[]
  ) {
    return node.decorators !== decorators ||
      node.modifiers !== modifiers ||
      node.name !== name ||
      node.typeParameters !== typeParameters ||
      node.heritageClauses !== heritageClauses ||
      node.members !== members
      ? updateNode(createInterfaceDeclaration(decorators, modifiers, name, typeParameters, heritageClauses, members), node)
      : node;
  }

  export function createTypeAliasDeclaration(
    decorators: readonly Decorator[] | undefined,
    modifiers: readonly Modifier[] | undefined,
    name: string | Identifier,
    typeParameters: readonly TypeParameterDeclaration[] | undefined,
    type: TypeNode
  ) {
    const node = <TypeAliasDeclaration>qn.createSynthesized(Syntax.TypeAliasDeclaration);
    node.decorators = NodeArray.from(decorators);
    node.modifiers = NodeArray.from(modifiers);
    node.name = asName(name);
    node.typeParameters = NodeArray.from(typeParameters);
    node.type = type;
    return node;
  }

  export function updateTypeAliasDeclaration(
    node: TypeAliasDeclaration,
    decorators: readonly Decorator[] | undefined,
    modifiers: readonly Modifier[] | undefined,
    name: Identifier,
    typeParameters: readonly TypeParameterDeclaration[] | undefined,
    type: TypeNode
  ) {
    return node.decorators !== decorators || node.modifiers !== modifiers || node.name !== name || node.typeParameters !== typeParameters || node.type !== type
      ? updateNode(createTypeAliasDeclaration(decorators, modifiers, name, typeParameters, type), node)
      : node;
  }

  export function createEnumDeclaration(decorators: readonly Decorator[] | undefined, modifiers: readonly Modifier[] | undefined, name: string | Identifier, members: readonly EnumMember[]) {
    const node = <EnumDeclaration>qn.createSynthesized(Syntax.EnumDeclaration);
    node.decorators = NodeArray.from(decorators);
    node.modifiers = NodeArray.from(modifiers);
    node.name = asName(name);
    node.members = NodeArray.create(members);
    return node;
  }

  export function updateEnumDeclaration(
    node: EnumDeclaration,
    decorators: readonly Decorator[] | undefined,
    modifiers: readonly Modifier[] | undefined,
    name: Identifier,
    members: readonly EnumMember[]
  ) {
    return node.decorators !== decorators || node.modifiers !== modifiers || node.name !== name || node.members !== members
      ? updateNode(createEnumDeclaration(decorators, modifiers, name, members), node)
      : node;
  }

  export function createModuleDeclaration(
    decorators: readonly Decorator[] | undefined,
    modifiers: readonly Modifier[] | undefined,
    name: ModuleName,
    body: ModuleBody | undefined,
    flags = NodeFlags.None
  ) {
    const node = <ModuleDeclaration>qn.createSynthesized(Syntax.ModuleDeclaration);
    node.flags |= flags & (NodeFlags.Namespace | NodeFlags.NestedNamespace | NodeFlags.GlobalAugmentation);
    node.decorators = NodeArray.from(decorators);
    node.modifiers = NodeArray.from(modifiers);
    node.name = name;
    node.body = body;
    return node;
  }

  export function updateModuleDeclaration(
    node: ModuleDeclaration,
    decorators: readonly Decorator[] | undefined,
    modifiers: readonly Modifier[] | undefined,
    name: ModuleName,
    body: ModuleBody | undefined
  ) {
    return node.decorators !== decorators || node.modifiers !== modifiers || node.name !== name || node.body !== body
      ? updateNode(createModuleDeclaration(decorators, modifiers, name, body, node.flags), node)
      : node;
  }

  export function createModuleBlock(statements: readonly Statement[]) {
    const node = <ModuleBlock>qn.createSynthesized(Syntax.ModuleBlock);
    node.statements = NodeArray.create(statements);
    return node;
  }

  export function updateModuleBlock(node: ModuleBlock, statements: readonly Statement[]) {
    return node.statements !== statements ? updateNode(createModuleBlock(statements), node) : node;
  }

  export function createCaseBlock(clauses: readonly CaseOrDefaultClause[]): CaseBlock {
    const node = <CaseBlock>qn.createSynthesized(Syntax.CaseBlock);
    node.clauses = NodeArray.create(clauses);
    return node;
  }

  export function updateCaseBlock(node: CaseBlock, clauses: readonly CaseOrDefaultClause[]) {
    return node.clauses !== clauses ? updateNode(createCaseBlock(clauses), node) : node;
  }

  export function createNamespaceExportDeclaration(name: string | Identifier) {
    const node = <NamespaceExportDeclaration>qn.createSynthesized(Syntax.NamespaceExportDeclaration);
    node.name = asName(name);
    return node;
  }

  export function updateNamespaceExportDeclaration(node: NamespaceExportDeclaration, name: Identifier) {
    return node.name !== name ? updateNode(createNamespaceExportDeclaration(name), node) : node;
  }

  export function createImportEqualsDeclaration(decorators: readonly Decorator[] | undefined, modifiers: readonly Modifier[] | undefined, name: string | Identifier, moduleReference: ModuleReference) {
    const node = <ImportEqualsDeclaration>qn.createSynthesized(Syntax.ImportEqualsDeclaration);
    node.decorators = NodeArray.from(decorators);
    node.modifiers = NodeArray.from(modifiers);
    node.name = asName(name);
    node.moduleReference = moduleReference;
    return node;
  }

  export function updateImportEqualsDeclaration(
    node: ImportEqualsDeclaration,
    decorators: readonly Decorator[] | undefined,
    modifiers: readonly Modifier[] | undefined,
    name: Identifier,
    moduleReference: ModuleReference
  ) {
    return node.decorators !== decorators || node.modifiers !== modifiers || node.name !== name || node.moduleReference !== moduleReference
      ? updateNode(createImportEqualsDeclaration(decorators, modifiers, name, moduleReference), node)
      : node;
  }

  export function createImportDeclaration(
    decorators: readonly Decorator[] | undefined,
    modifiers: readonly Modifier[] | undefined,
    importClause: ImportClause | undefined,
    moduleSpecifier: Expression
  ): ImportDeclaration {
    const node = <ImportDeclaration>qn.createSynthesized(Syntax.ImportDeclaration);
    node.decorators = NodeArray.from(decorators);
    node.modifiers = NodeArray.from(modifiers);
    node.importClause = importClause;
    node.moduleSpecifier = moduleSpecifier;
    return node;
  }

  export function updateImportDeclaration(
    node: ImportDeclaration,
    decorators: readonly Decorator[] | undefined,
    modifiers: readonly Modifier[] | undefined,
    importClause: ImportClause | undefined,
    moduleSpecifier: Expression
  ) {
    return node.decorators !== decorators || node.modifiers !== modifiers || node.importClause !== importClause || node.moduleSpecifier !== moduleSpecifier
      ? updateNode(createImportDeclaration(decorators, modifiers, importClause, moduleSpecifier), node)
      : node;
  }

  export function createImportClause(name: Identifier | undefined, namedBindings: NamedImportBindings | undefined, isTypeOnly = false): ImportClause {
    const node = <ImportClause>qn.createSynthesized(Syntax.ImportClause);
    node.name = name;
    node.namedBindings = namedBindings;
    node.isTypeOnly = isTypeOnly;
    return node;
  }

  export function updateImportClause(node: ImportClause, name: Identifier | undefined, namedBindings: NamedImportBindings | undefined, isTypeOnly: boolean) {
    return node.name !== name || node.namedBindings !== namedBindings || node.isTypeOnly !== isTypeOnly ? updateNode(createImportClause(name, namedBindings, isTypeOnly), node) : node;
  }

  export function createNamespaceImport(name: Identifier): NamespaceImport {
    const node = <NamespaceImport>qn.createSynthesized(Syntax.NamespaceImport);
    node.name = name;
    return node;
  }

  export function createNamespaceExport(name: Identifier): NamespaceExport {
    const node = <NamespaceExport>qn.createSynthesized(Syntax.NamespaceExport);
    node.name = name;
    return node;
  }

  export function updateNamespaceImport(node: NamespaceImport, name: Identifier) {
    return node.name !== name ? updateNode(createNamespaceImport(name), node) : node;
  }

  export function updateNamespaceExport(node: NamespaceExport, name: Identifier) {
    return node.name !== name ? updateNode(createNamespaceExport(name), node) : node;
  }

  export function createNamedImports(elements: readonly ImportSpecifier[]): NamedImports {
    const node = <NamedImports>qn.createSynthesized(Syntax.NamedImports);
    node.elements = NodeArray.create(elements);
    return node;
  }

  export function updateNamedImports(node: NamedImports, elements: readonly ImportSpecifier[]) {
    return node.elements !== elements ? updateNode(createNamedImports(elements), node) : node;
  }

  export function createImportSpecifier(propertyName: Identifier | undefined, name: Identifier) {
    const node = <ImportSpecifier>qn.createSynthesized(Syntax.ImportSpecifier);
    node.propertyName = propertyName;
    node.name = name;
    return node;
  }

  export function updateImportSpecifier(node: ImportSpecifier, propertyName: Identifier | undefined, name: Identifier) {
    return node.propertyName !== propertyName || node.name !== name ? updateNode(createImportSpecifier(propertyName, name), node) : node;
  }

  export function createExportAssignment(decorators: readonly Decorator[] | undefined, modifiers: readonly Modifier[] | undefined, isExportEquals: boolean | undefined, expression: Expression) {
    const node = <ExportAssignment>qn.createSynthesized(Syntax.ExportAssignment);
    node.decorators = NodeArray.from(decorators);
    node.modifiers = NodeArray.from(modifiers);
    node.isExportEquals = isExportEquals;
    node.expression = isExportEquals ? parenthesizeBinaryOperand(Syntax.EqualsToken, expression, /*isLeftSideOfBinary*/ false, /*leftOperand*/ undefined) : parenthesizeDefaultExpression(expression);
    return node;
  }

  export function updateExportAssignment(node: ExportAssignment, decorators: readonly Decorator[] | undefined, modifiers: readonly Modifier[] | undefined, expression: Expression) {
    return node.decorators !== decorators || node.modifiers !== modifiers || node.expression !== expression
      ? updateNode(createExportAssignment(decorators, modifiers, node.isExportEquals, expression), node)
      : node;
  }

  export function createExportDeclaration(
    decorators: readonly Decorator[] | undefined,
    modifiers: readonly Modifier[] | undefined,
    exportClause: NamedExportBindings | undefined,
    moduleSpecifier?: Expression,
    isTypeOnly = false
  ) {
    const node = <ExportDeclaration>qn.createSynthesized(Syntax.ExportDeclaration);
    node.decorators = NodeArray.from(decorators);
    node.modifiers = NodeArray.from(modifiers);
    node.isTypeOnly = isTypeOnly;
    node.exportClause = exportClause;
    node.moduleSpecifier = moduleSpecifier;
    return node;
  }

  export function updateExportDeclaration(
    node: ExportDeclaration,
    decorators: readonly Decorator[] | undefined,
    modifiers: readonly Modifier[] | undefined,
    exportClause: NamedExportBindings | undefined,
    moduleSpecifier: Expression | undefined,
    isTypeOnly: boolean
  ) {
    return node.decorators !== decorators || node.modifiers !== modifiers || node.isTypeOnly !== isTypeOnly || node.exportClause !== exportClause || node.moduleSpecifier !== moduleSpecifier
      ? updateNode(createExportDeclaration(decorators, modifiers, exportClause, moduleSpecifier, isTypeOnly), node)
      : node;
  }

  export function createEmptyExports() {
    return createExportDeclaration(/*decorators*/ undefined, /*modifiers*/ undefined, createNamedExports([]), /*moduleSpecifier*/ undefined);
  }

  export function createNamedExports(elements: readonly ExportSpecifier[]) {
    const node = <NamedExports>qn.createSynthesized(Syntax.NamedExports);
    node.elements = NodeArray.create(elements);
    return node;
  }

  export function updateNamedExports(node: NamedExports, elements: readonly ExportSpecifier[]) {
    return node.elements !== elements ? updateNode(createNamedExports(elements), node) : node;
  }

  export function createExportSpecifier(propertyName: string | Identifier | undefined, name: string | Identifier) {
    const node = <ExportSpecifier>qn.createSynthesized(Syntax.ExportSpecifier);
    node.propertyName = asName(propertyName);
    node.name = asName(name);
    return node;
  }

  export function updateExportSpecifier(node: ExportSpecifier, propertyName: Identifier | undefined, name: Identifier) {
    return node.propertyName !== propertyName || node.name !== name ? updateNode(createExportSpecifier(propertyName, name), node) : node;
  }

  // Module references

  export function createExternalModuleReference(expression: Expression) {
    const node = <ExternalModuleReference>qn.createSynthesized(Syntax.ExternalModuleReference);
    node.expression = expression;
    return node;
  }

  export function updateExternalModuleReference(node: ExternalModuleReference, expression: Expression) {
    return node.expression !== expression ? updateNode(createExternalModuleReference(expression), node) : node;
  }

  // JSDoc

  export function createJSDocTypeExpression(type: TypeNode): JSDocTypeExpression {
    const node = qn.createSynthesized(Syntax.JSDocTypeExpression) as JSDocTypeExpression;
    node.type = type;
    return node;
  }

  export function createJSDocTypeTag(typeExpression: JSDocTypeExpression, comment?: string): JSDocTypeTag {
    const tag = createJSDocTag<JSDocTypeTag>(Syntax.JSDocTypeTag, 'type', comment);
    tag.typeExpression = typeExpression;
    return tag;
  }

  export function createJSDocReturnTag(typeExpression?: JSDocTypeExpression, comment?: string): JSDocReturnTag {
    const tag = createJSDocTag<JSDocReturnTag>(Syntax.JSDocReturnTag, 'returns', comment);
    tag.typeExpression = typeExpression;
    return tag;
  }

  export function createJSDocThisTag(typeExpression?: JSDocTypeExpression): JSDocThisTag {
    const tag = createJSDocTag<JSDocThisTag>(Syntax.JSDocThisTag, 'this');
    tag.typeExpression = typeExpression;
    return tag;
  }

  /**
   * @deprecated Use `createJSDocParameterTag` to create jsDoc param tag.
   */
  export function createJSDocParamTag(name: EntityName, isBracketed: boolean, typeExpression?: JSDocTypeExpression, comment?: string): JSDocParameterTag {
    const tag = createJSDocTag<JSDocParameterTag>(Syntax.JSDocParameterTag, 'param', comment);
    tag.typeExpression = typeExpression;
    tag.name = name;
    tag.isBracketed = isBracketed;
    return tag;
  }

  export function createJSDocClassTag(comment?: string): JSDocClassTag {
    return createJSDocTag<JSDocClassTag>(Syntax.JSDocClassTag, 'class', comment);
  }

  export function createJSDocComment(comment?: string | undefined, tags?: NodeArray<JSDocTag> | undefined) {
    const node = qn.createSynthesized(Syntax.JSDocComment) as JSDoc;
    node.comment = comment;
    node.tags = tags;
    return node;
  }

  export function createJSDocTag<T extends JSDocTag>(kind: T['kind'], tagName: string, comment?: string): T {
    const node = qn.createSynthesized(kind) as T;
    node.tagName = createIdentifier(tagName);
    node.comment = comment;
    return node;
  }

  export function createJSDocAugmentsTag(classExpression: JSDocAugmentsTag['class'], comment?: string) {
    const tag = createJSDocTag<JSDocAugmentsTag>(Syntax.JSDocAugmentsTag, 'augments', comment);
    tag.class = classExpression;
    return tag;
  }

  export function createJSDocEnumTag(typeExpression?: JSDocTypeExpression, comment?: string) {
    const tag = createJSDocTag<JSDocEnumTag>(Syntax.JSDocEnumTag, 'enum', comment);
    tag.typeExpression = typeExpression;
    return tag;
  }

  export function createJSDocTemplateTag(constraint: JSDocTypeExpression | undefined, typeParameters: readonly TypeParameterDeclaration[], comment?: string) {
    const tag = createJSDocTag<JSDocTemplateTag>(Syntax.JSDocTemplateTag, 'template', comment);
    tag.constraint = constraint;
    tag.typeParameters = NodeArray.from(typeParameters);
    return tag;
  }

  export function createJSDocTypedefTag(fullName?: JSDocNamespaceDeclaration | Identifier, name?: Identifier, comment?: string, typeExpression?: JSDocTypeExpression | JSDocTypeLiteral) {
    const tag = createJSDocTag<JSDocTypedefTag>(Syntax.JSDocTypedefTag, 'typedef', comment);
    tag.fullName = fullName;
    tag.name = name;
    tag.typeExpression = typeExpression;
    return tag;
  }

  export function createJSDocCallbackTag(fullName: JSDocNamespaceDeclaration | Identifier | undefined, name: Identifier | undefined, comment: string | undefined, typeExpression: JSDocSignature) {
    const tag = createJSDocTag<JSDocCallbackTag>(Syntax.JSDocCallbackTag, 'callback', comment);
    tag.fullName = fullName;
    tag.name = name;
    tag.typeExpression = typeExpression;
    return tag;
  }

  export function createJSDocSignature(typeParameters: readonly JSDocTemplateTag[] | undefined, parameters: readonly JSDocParameterTag[], type?: JSDocReturnTag) {
    const tag = qn.createSynthesized(Syntax.JSDocSignature) as JSDocSignature;
    tag.typeParameters = typeParameters;
    tag.parameters = parameters;
    tag.type = type;
    return tag;
  }

  function createJSDocPropertyLikeTag<T extends JSDocPropertyLikeTag>(
    kind: T['kind'],
    tagName: 'arg' | 'argument' | 'param',
    typeExpression: JSDocTypeExpression | undefined,
    name: EntityName,
    isNameFirst: boolean,
    isBracketed: boolean,
    comment?: string
  ) {
    const tag = createJSDocTag<T>(kind, tagName, comment);
    tag.typeExpression = typeExpression;
    tag.name = name;
    tag.isNameFirst = isNameFirst;
    tag.isBracketed = isBracketed;
    return tag;
  }

  export function createJSDocPropertyTag(typeExpression: JSDocTypeExpression | undefined, name: EntityName, isNameFirst: boolean, isBracketed: boolean, comment?: string) {
    return createJSDocPropertyLikeTag<JSDocPropertyTag>(Syntax.JSDocPropertyTag, 'param', typeExpression, name, isNameFirst, isBracketed, comment);
  }

  export function createJSDocParameterTag(typeExpression: JSDocTypeExpression | undefined, name: EntityName, isNameFirst: boolean, isBracketed: boolean, comment?: string) {
    return createJSDocPropertyLikeTag<JSDocParameterTag>(Syntax.JSDocParameterTag, 'param', typeExpression, name, isNameFirst, isBracketed, comment);
  }

  export function createJSDocTypeLiteral(jsDocPropertyTags?: readonly JSDocPropertyLikeTag[], isArrayType?: boolean) {
    const tag = qn.createSynthesized(Syntax.JSDocTypeLiteral) as JSDocTypeLiteral;
    tag.jsDocPropertyTags = jsDocPropertyTags;
    tag.isArrayType = isArrayType;
    return tag;
  }

  export function createJSDocImplementsTag(classExpression: JSDocImplementsTag['class'], comment?: string) {
    const tag = createJSDocTag<JSDocImplementsTag>(Syntax.JSDocImplementsTag, 'implements', comment);
    tag.class = classExpression;
    return tag;
  }

  export function createJSDocAuthorTag(comment?: string) {
    return createJSDocTag<JSDocAuthorTag>(Syntax.JSDocAuthorTag, 'author', comment);
  }

  export function createJSDocPublicTag() {
    return createJSDocTag<JSDocPublicTag>(Syntax.JSDocPublicTag, 'public');
  }

  export function createJSDocPrivateTag() {
    return createJSDocTag<JSDocPrivateTag>(Syntax.JSDocPrivateTag, 'private');
  }

  export function createJSDocProtectedTag() {
    return createJSDocTag<JSDocProtectedTag>(Syntax.JSDocProtectedTag, 'protected');
  }

  export function createJSDocReadonlyTag() {
    return createJSDocTag<JSDocReadonlyTag>(Syntax.JSDocReadonlyTag, 'readonly');
  }

  export function appendJSDocToContainer(node: JSDocContainer, jsdoc: JSDoc) {
    node.jsDoc = append(node.jsDoc, jsdoc);
    return node;
  }

  export function createJSDocVariadicType(type: TypeNode): JSDocVariadicType {
    const node = qn.createSynthesized(Syntax.JSDocVariadicType) as JSDocVariadicType;
    node.type = type;
    return node;
  }

  export function updateJSDocVariadicType(node: JSDocVariadicType, type: TypeNode): JSDocVariadicType {
    return node.type !== type ? updateNode(createJSDocVariadicType(type), node) : node;
  }

  // JSX

  export function createJsxElement(openingElement: JsxOpeningElement, children: readonly JsxChild[], closingElement: JsxClosingElement) {
    const node = <JsxElement>qn.createSynthesized(Syntax.JsxElement);
    node.openingElement = openingElement;
    node.children = NodeArray.create(children);
    node.closingElement = closingElement;
    return node;
  }

  export function updateJsxElement(node: JsxElement, openingElement: JsxOpeningElement, children: readonly JsxChild[], closingElement: JsxClosingElement) {
    return node.openingElement !== openingElement || node.children !== children || node.closingElement !== closingElement
      ? updateNode(createJsxElement(openingElement, children, closingElement), node)
      : node;
  }

  export function createJsxSelfClosingElement(tagName: JsxTagNameExpression, typeArguments: readonly TypeNode[] | undefined, attributes: JsxAttributes) {
    const node = <JsxSelfClosingElement>qn.createSynthesized(Syntax.JsxSelfClosingElement);
    node.tagName = tagName;
    node.typeArguments = NodeArray.from(typeArguments);
    node.attributes = attributes;
    return node;
  }

  export function updateJsxSelfClosingElement(node: JsxSelfClosingElement, tagName: JsxTagNameExpression, typeArguments: readonly TypeNode[] | undefined, attributes: JsxAttributes) {
    return node.tagName !== tagName || node.typeArguments !== typeArguments || node.attributes !== attributes
      ? updateNode(createJsxSelfClosingElement(tagName, typeArguments, attributes), node)
      : node;
  }

  export function createJsxOpeningElement(tagName: JsxTagNameExpression, typeArguments: readonly TypeNode[] | undefined, attributes: JsxAttributes) {
    const node = <JsxOpeningElement>qn.createSynthesized(Syntax.JsxOpeningElement);
    node.tagName = tagName;
    node.typeArguments = NodeArray.from(typeArguments);
    node.attributes = attributes;
    return node;
  }

  export function updateJsxOpeningElement(node: JsxOpeningElement, tagName: JsxTagNameExpression, typeArguments: readonly TypeNode[] | undefined, attributes: JsxAttributes) {
    return node.tagName !== tagName || node.typeArguments !== typeArguments || node.attributes !== attributes ? updateNode(createJsxOpeningElement(tagName, typeArguments, attributes), node) : node;
  }

  export function createJsxClosingElement(tagName: JsxTagNameExpression) {
    const node = <JsxClosingElement>qn.createSynthesized(Syntax.JsxClosingElement);
    node.tagName = tagName;
    return node;
  }

  export function updateJsxClosingElement(node: JsxClosingElement, tagName: JsxTagNameExpression) {
    return node.tagName !== tagName ? updateNode(createJsxClosingElement(tagName), node) : node;
  }

  export function createJsxFragment(openingFragment: JsxOpeningFragment, children: readonly JsxChild[], closingFragment: JsxClosingFragment) {
    const node = <JsxFragment>qn.createSynthesized(Syntax.JsxFragment);
    node.openingFragment = openingFragment;
    node.children = NodeArray.create(children);
    node.closingFragment = closingFragment;
    return node;
  }

  export function updateJsxText(node: JsxText, text: string, onlyTriviaWhitespaces?: boolean) {
    return node.text !== text || node.onlyTriviaWhitespaces !== onlyTriviaWhitespaces ? updateNode(JsxText.create(text, onlyTriviaWhitespaces), node) : node;
  }

  export function createJsxOpeningFragment() {
    return <JsxOpeningFragment>qn.createSynthesized(Syntax.JsxOpeningFragment);
  }

  export function createJsxJsxClosingFragment() {
    return <JsxClosingFragment>qn.createSynthesized(Syntax.JsxClosingFragment);
  }

  export function updateJsxFragment(node: JsxFragment, openingFragment: JsxOpeningFragment, children: readonly JsxChild[], closingFragment: JsxClosingFragment) {
    return node.openingFragment !== openingFragment || node.children !== children || node.closingFragment !== closingFragment
      ? updateNode(createJsxFragment(openingFragment, children, closingFragment), node)
      : node;
  }

  export function createJsxAttribute(name: Identifier, initializer: StringLiteral | JsxExpression) {
    const node = <JsxAttribute>qn.createSynthesized(Syntax.JsxAttribute);
    node.name = name;
    node.initializer = initializer;
    return node;
  }

  export function updateJsxAttribute(node: JsxAttribute, name: Identifier, initializer: StringLiteral | JsxExpression) {
    return node.name !== name || node.initializer !== initializer ? updateNode(createJsxAttribute(name, initializer), node) : node;
  }

  export function createJsxAttributes(properties: readonly JsxAttributeLike[]) {
    const node = <JsxAttributes>qn.createSynthesized(Syntax.JsxAttributes);
    node.properties = NodeArray.create(properties);
    return node;
  }

  export function updateJsxAttributes(node: JsxAttributes, properties: readonly JsxAttributeLike[]) {
    return node.properties !== properties ? updateNode(createJsxAttributes(properties), node) : node;
  }

  export function createJsxSpreadAttribute(expression: Expression) {
    const node = <JsxSpreadAttribute>qn.createSynthesized(Syntax.JsxSpreadAttribute);
    node.expression = expression;
    return node;
  }

  export function updateJsxSpreadAttribute(node: JsxSpreadAttribute, expression: Expression) {
    return node.expression !== expression ? updateNode(createJsxSpreadAttribute(expression), node) : node;
  }

  export function createJsxExpression(dot3Token: Dot3Token | undefined, expression: Expression | undefined) {
    const node = <JsxExpression>qn.createSynthesized(Syntax.JsxExpression);
    node.dot3Token = dot3Token;
    node.expression = expression;
    return node;
  }

  export function updateJsxExpression(node: JsxExpression, expression: Expression | undefined) {
    return node.expression !== expression ? updateNode(createJsxExpression(node.dot3Token, expression), node) : node;
  }

  // Clauses

  export function createCaseClause(expression: Expression, statements: readonly Statement[]) {
    const node = <CaseClause>qn.createSynthesized(Syntax.CaseClause);
    node.expression = parenthesizeExpressionForList(expression);
    node.statements = NodeArray.create(statements);
    return node;
  }

  export function updateCaseClause(node: CaseClause, expression: Expression, statements: readonly Statement[]) {
    return node.expression !== expression || node.statements !== statements ? updateNode(createCaseClause(expression, statements), node) : node;
  }

  export function createDefaultClause(statements: readonly Statement[]) {
    const node = <DefaultClause>qn.createSynthesized(Syntax.DefaultClause);
    node.statements = NodeArray.create(statements);
    return node;
  }

  export function updateDefaultClause(node: DefaultClause, statements: readonly Statement[]) {
    return node.statements !== statements ? updateNode(createDefaultClause(statements), node) : node;
  }

  export function createHeritageClause(token: HeritageClause['token'], types: readonly ExpressionWithTypeArguments[]) {
    const node = <HeritageClause>qn.createSynthesized(Syntax.HeritageClause);
    node.token = token;
    node.types = NodeArray.create(types);
    return node;
  }

  export function updateHeritageClause(node: HeritageClause, types: readonly ExpressionWithTypeArguments[]) {
    return node.types !== types ? updateNode(createHeritageClause(node.token, types), node) : node;
  }

  export function createCatchClause(variableDeclaration: string | VariableDeclaration | undefined, block: Block) {
    const node = <CatchClause>qn.createSynthesized(Syntax.CatchClause);
    node.variableDeclaration = isString(variableDeclaration) ? createVariableDeclaration(variableDeclaration) : variableDeclaration;
    node.block = block;
    return node;
  }

  export function updateCatchClause(node: CatchClause, variableDeclaration: VariableDeclaration | undefined, block: Block) {
    return node.variableDeclaration !== variableDeclaration || node.block !== block ? updateNode(createCatchClause(variableDeclaration, block), node) : node;
  }

  // Property assignments

  export function createPropertyAssignment(name: string | PropertyName, initializer: Expression) {
    const node = <PropertyAssignment>qn.createSynthesized(Syntax.PropertyAssignment);
    node.name = asName(name);
    node.questionToken = undefined;
    node.initializer = parenthesizeExpressionForList(initializer);
    return node;
  }

  export function updatePropertyAssignment(node: PropertyAssignment, name: PropertyName, initializer: Expression) {
    return node.name !== name || node.initializer !== initializer ? updateNode(createPropertyAssignment(name, initializer), node) : node;
  }

  export function createShorthandPropertyAssignment(name: string | Identifier, objectAssignmentInitializer?: Expression) {
    const node = <ShorthandPropertyAssignment>qn.createSynthesized(Syntax.ShorthandPropertyAssignment);
    node.name = asName(name);
    node.objectAssignmentInitializer = objectAssignmentInitializer !== undefined ? parenthesizeExpressionForList(objectAssignmentInitializer) : undefined;
    return node;
  }

  export function updateShorthandPropertyAssignment(node: ShorthandPropertyAssignment, name: Identifier, objectAssignmentInitializer: Expression | undefined) {
    return node.name !== name || node.objectAssignmentInitializer !== objectAssignmentInitializer ? updateNode(createShorthandPropertyAssignment(name, objectAssignmentInitializer), node) : node;
  }

  export function createSpreadAssignment(expression: Expression) {
    const node = <SpreadAssignment>qn.createSynthesized(Syntax.SpreadAssignment);
    node.expression = parenthesizeExpressionForList(expression);
    return node;
  }

  export function updateSpreadAssignment(node: SpreadAssignment, expression: Expression) {
    return node.expression !== expression ? updateNode(createSpreadAssignment(expression), node) : node;
  }

  // Enum

  export function createEnumMember(name: string | PropertyName, initializer?: Expression) {
    const node = <EnumMember>qn.createSynthesized(Syntax.EnumMember);
    node.name = asName(name);
    node.initializer = initializer && parenthesizeExpressionForList(initializer);
    return node;
  }

  export function updateEnumMember(node: EnumMember, name: PropertyName, initializer: Expression | undefined) {
    return node.name !== name || node.initializer !== initializer ? updateNode(createEnumMember(name, initializer), node) : node;
  }

  // Top-level nodes

  export function qp_updateSourceNode(
    node: SourceFile,
    statements: readonly Statement[],
    isDeclarationFile?: boolean,
    referencedFiles?: SourceFile['referencedFiles'],
    typeReferences?: SourceFile['typeReferenceDirectives'],
    hasNoDefaultLib?: boolean,
    libReferences?: SourceFile['libReferenceDirectives']
  ) {
    if (
      node.statements !== statements ||
      (isDeclarationFile !== undefined && node.isDeclarationFile !== isDeclarationFile) ||
      (referencedFiles !== undefined && node.referencedFiles !== referencedFiles) ||
      (typeReferences !== undefined && node.typeReferenceDirectives !== typeReferences) ||
      (libReferences !== undefined && node.libReferenceDirectives !== libReferences) ||
      (hasNoDefaultLib !== undefined && node.hasNoDefaultLib !== hasNoDefaultLib)
    ) {
      const updated = <SourceFile>qn.createSynthesized(Syntax.SourceFile);
      updated.flags |= node.flags;
      updated.statements = NodeArray.create(statements);
      updated.endOfFileToken = node.endOfFileToken;
      updated.fileName = node.fileName;
      updated.path = node.path;
      updated.text = node.text;
      updated.isDeclarationFile = isDeclarationFile === undefined ? node.isDeclarationFile : isDeclarationFile;
      updated.referencedFiles = referencedFiles === undefined ? node.referencedFiles : referencedFiles;
      updated.typeReferenceDirectives = typeReferences === undefined ? node.typeReferenceDirectives : typeReferences;
      updated.hasNoDefaultLib = hasNoDefaultLib === undefined ? node.hasNoDefaultLib : hasNoDefaultLib;
      updated.libReferenceDirectives = libReferences === undefined ? node.libReferenceDirectives : libReferences;
      if (node.amdDependencies !== undefined) updated.amdDependencies = node.amdDependencies;
      if (node.moduleName !== undefined) updated.moduleName = node.moduleName;
      if (node.languageVariant !== undefined) updated.languageVariant = node.languageVariant;
      if (node.renamedDependencies !== undefined) updated.renamedDependencies = node.renamedDependencies;
      if (node.languageVersion !== undefined) updated.languageVersion = node.languageVersion;
      if (node.scriptKind !== undefined) updated.scriptKind = node.scriptKind;
      if (node.externalModuleIndicator !== undefined) updated.externalModuleIndicator = node.externalModuleIndicator;
      if (node.commonJsModuleIndicator !== undefined) updated.commonJsModuleIndicator = node.commonJsModuleIndicator;
      if (node.identifiers !== undefined) updated.identifiers = node.identifiers;
      if (node.nodeCount !== undefined) updated.nodeCount = node.nodeCount;
      if (node.identifierCount !== undefined) updated.identifierCount = node.identifierCount;
      if (node.symbolCount !== undefined) updated.symbolCount = node.symbolCount;
      if (node.parseDiagnostics !== undefined) updated.parseDiagnostics = node.parseDiagnostics;
      if (node.bindDiagnostics !== undefined) updated.bindDiagnostics = node.bindDiagnostics;
      if (node.bindSuggestionDiagnostics !== undefined) updated.bindSuggestionDiagnostics = node.bindSuggestionDiagnostics;
      if (node.lineMap !== undefined) updated.lineMap = node.lineMap;
      if (node.classifiableNames !== undefined) updated.classifiableNames = node.classifiableNames;
      if (node.resolvedModules !== undefined) updated.resolvedModules = node.resolvedModules;
      if (node.resolvedTypeReferenceDirectiveNames !== undefined) updated.resolvedTypeReferenceDirectiveNames = node.resolvedTypeReferenceDirectiveNames;
      if (node.imports !== undefined) updated.imports = node.imports;
      if (node.moduleAugmentations !== undefined) updated.moduleAugmentations = node.moduleAugmentations;
      if (node.pragmas !== undefined) updated.pragmas = node.pragmas;
      if (node.localJsxFactory !== undefined) updated.localJsxFactory = node.localJsxFactory;
      if (node.localJsxNamespace !== undefined) updated.localJsxNamespace = node.localJsxNamespace;
      return updateNode(updated, node);
    }

    return node;
  }

  /**
   * Creates a shallow, memberwise clone of a node for mutation.
   */
  export function getMutableClone<T extends Node>(node: T): T {
    const clone = getSynthesizedClone(node);
    clone.pos = node.pos;
    clone.end = node.end;
    clone.parent = node.parent;
    return clone;
  }

  // Transformation nodes

  /**
   * Creates a synthetic statement to act as a placeholder for a not-emitted statement in
   * order to preserve comments.
   *
   * @param original The original statement.
   */
  export function createNotEmittedStatement(original: Node) {
    const node = <NotEmittedStatement>qn.createSynthesized(Syntax.NotEmittedStatement);
    node.original = original;
    setTextRange(node, original);
    return node;
  }

  /**
   * Creates a synthetic element to act as a placeholder for the end of an emitted declaration in
   * order to properly emit exports.
   */
  export function createEndOfDeclarationMarker(original: Node) {
    const node = <EndOfDeclarationMarker>qn.createSynthesized(Syntax.EndOfDeclarationMarker);
    node.emitNode = {} as EmitNode;
    node.original = original;
    return node;
  }

  /**
   * Creates a synthetic element to act as a placeholder for the beginning of a merged declaration in
   * order to properly emit exports.
   */
  export function createMergeDeclarationMarker(original: Node) {
    const node = <MergeDeclarationMarker>qn.createSynthesized(Syntax.MergeDeclarationMarker);
    node.emitNode = {} as EmitNode;
    node.original = original;
    return node;
  }

  /**
   * Creates a synthetic expression to act as a placeholder for a not-emitted expression in
   * order to preserve comments or sourcemap positions.
   *
   * @param expression The inner expression to emit.
   * @param original The original outer expression.
   * @param location The location for the expression. Defaults to the positions from "original" if provided.
   */
  export function createPartiallyEmittedExpression(expression: Expression, original?: Node) {
    const node = <PartiallyEmittedExpression>qn.createSynthesized(Syntax.PartiallyEmittedExpression);
    node.expression = expression;
    node.original = original;
    setTextRange(node, original);
    return node;
  }

  export function updatePartiallyEmittedExpression(node: PartiallyEmittedExpression, expression: Expression) {
    if (node.expression !== expression) {
      return updateNode(createPartiallyEmittedExpression(expression, node.original), node);
    }
    return node;
  }

  function flattenCommaElements(node: Expression): Expression | readonly Expression[] {
    if (isSynthesized(node) && !qn.is.parseTreeNode(node) && !node.original && !node.emitNode && !node.id) {
      if (node.kind === Syntax.CommaListExpression) {
        return (<CommaListExpression>node).elements;
      }
      if (qn.is.kind(node, BinaryExpression) && node.operatorToken.kind === Syntax.CommaToken) {
        return [node.left, node.right];
      }
    }
    return node;
  }

  export function createCommaList(elements: readonly Expression[]) {
    const node = <CommaListExpression>qn.createSynthesized(Syntax.CommaListExpression);
    node.elements = NodeArray.create(sameFlatMap(elements, flattenCommaElements));
    return node;
  }

  export function updateCommaList(node: CommaListExpression, elements: readonly Expression[]) {
    return node.elements !== elements ? updateNode(createCommaList(elements), node) : node;
  }

  export function createSyntheticReferenceExpression(expression: Expression, thisArg: Expression) {
    const node = <SyntheticReferenceExpression>qn.createSynthesized(Syntax.SyntheticReferenceExpression);
    node.expression = expression;
    node.thisArg = thisArg;
    return node;
  }

  export function updateSyntheticReferenceExpression(node: SyntheticReferenceExpression, expression: Expression, thisArg: Expression) {
    return node.expression !== expression || node.thisArg !== thisArg ? updateNode(createSyntheticReferenceExpression(expression, thisArg), node) : node;
  }

  export function createBundle(sourceFiles: readonly SourceFile[], prepends: readonly (UnparsedSource | InputFiles)[] = emptyArray) {
    const node = <Bundle>createNode(Syntax.Bundle);
    node.prepends = prepends;
    node.sourceFiles = sourceFiles;
    return node;
  }

  let allUnscopedEmitHelpers: QReadonlyMap<UnscopedEmitHelper> | undefined;
  function getAllUnscopedEmitHelpers() {
    return (
      allUnscopedEmitHelpers ||
      (allUnscopedEmitHelpers = arrayToMap(
        [
          valuesHelper,
          readHelper,
          spreadHelper,
          spreadArraysHelper,
          restHelper,
          decorateHelper,
          metadataHelper,
          paramHelper,
          awaiterHelper,
          assignHelper,
          awaitHelper,
          asyncGeneratorHelper,
          asyncDelegator,
          asyncValues,
          extendsHelper,
          templateObjectHelper,
          generatorHelper,
          importStarHelper,
          importDefaultHelper,
          classPrivateFieldGetHelper,
          classPrivateFieldSetHelper,
          createBindingHelper,
          setModuleDefaultHelper,
        ],
        (helper) => helper.name
      ))
    );
  }

  function createUnparsedSource() {
    const node = <UnparsedSource>createNode(Syntax.UnparsedSource);
    node.prologues = emptyArray;
    node.referencedFiles = emptyArray;
    node.libReferenceDirectives = emptyArray;
    node.lineAndCharOf = (pos) => qy.get.lineAndCharOf(node, pos);
    return node;
  }

  export function createUnparsedSourceFile(text: string): UnparsedSource;
  export function createUnparsedSourceFile(inputFile: InputFiles, type: 'js' | 'dts', stripInternal?: boolean): UnparsedSource;
  export function createUnparsedSourceFile(text: string, mapPath: string | undefined, map: string | undefined): UnparsedSource;
  export function createUnparsedSourceFile(textOrInputFiles: string | InputFiles, mapPathOrType?: string, mapTextOrStripInternal?: string | boolean): UnparsedSource {
    const node = createUnparsedSource();
    let stripInternal: boolean | undefined;
    let bundleFileInfo: BundleFileInfo | undefined;
    if (!isString(textOrInputFiles)) {
      assert(mapPathOrType === 'js' || mapPathOrType === 'dts');
      node.fileName = (mapPathOrType === 'js' ? textOrInputFiles.javascriptPath : textOrInputFiles.declarationPath) || '';
      node.sourceMapPath = mapPathOrType === 'js' ? textOrInputFiles.javascriptMapPath : textOrInputFiles.declarationMapPath;
      Object.defineProperties(node, {
        text: {
          get() {
            return mapPathOrType === 'js' ? textOrInputFiles.javascriptText : textOrInputFiles.declarationText;
          },
        },
        sourceMapText: {
          get() {
            return mapPathOrType === 'js' ? textOrInputFiles.javascriptMapText : textOrInputFiles.declarationMapText;
          },
        },
      });

      if (textOrInputFiles.buildInfo && textOrInputFiles.buildInfo.bundle) {
        node.oldFileOfCurrentEmit = textOrInputFiles.oldFileOfCurrentEmit;
        assert(mapTextOrStripInternal === undefined || typeof mapTextOrStripInternal === 'boolean');
        stripInternal = mapTextOrStripInternal;
        bundleFileInfo = mapPathOrType === 'js' ? textOrInputFiles.buildInfo.bundle.js : textOrInputFiles.buildInfo.bundle.dts;
        if (node.oldFileOfCurrentEmit) {
          parseOldFileOfCurrentEmit(node, Debug.checkDefined(bundleFileInfo));
          return node;
        }
      }
    } else {
      node.fileName = '';
      node.text = textOrInputFiles;
      node.sourceMapPath = mapPathOrType;
      node.sourceMapText = mapTextOrStripInternal as string;
    }
    assert(!node.oldFileOfCurrentEmit);
    parseUnparsedSourceFile(node, bundleFileInfo, stripInternal);
    return node;
  }

  function parseUnparsedSourceFile(node: UnparsedSource, bundleFileInfo: BundleFileInfo | undefined, stripInternal: boolean | undefined) {
    let prologues: UnparsedPrologue[] | undefined;
    let helpers: UnscopedEmitHelper[] | undefined;
    let referencedFiles: FileReference[] | undefined;
    let typeReferenceDirectives: string[] | undefined;
    let libReferenceDirectives: FileReference[] | undefined;
    let texts: UnparsedSourceText[] | undefined;

    for (const section of bundleFileInfo ? bundleFileInfo.sections : emptyArray) {
      switch (section.kind) {
        case BundleFileSectionKind.Prologue:
          (prologues || (prologues = [])).push(createUnparsedNode(section, node) as UnparsedPrologue);
          break;
        case BundleFileSectionKind.EmitHelpers:
          (helpers || (helpers = [])).push(getAllUnscopedEmitHelpers().get(section.data)!);
          break;
        case BundleFileSectionKind.NoDefaultLib:
          node.hasNoDefaultLib = true;
          break;
        case BundleFileSectionKind.Reference:
          (referencedFiles || (referencedFiles = [])).push({ pos: -1, end: -1, fileName: section.data });
          break;
        case BundleFileSectionKind.Type:
          (typeReferenceDirectives || (typeReferenceDirectives = [])).push(section.data);
          break;
        case BundleFileSectionKind.Lib:
          (libReferenceDirectives || (libReferenceDirectives = [])).push({ pos: -1, end: -1, fileName: section.data });
          break;
        case BundleFileSectionKind.Prepend:
          const prependNode = createUnparsedNode(section, node) as UnparsedPrepend;
          let prependTexts: UnparsedTextLike[] | undefined;
          for (const text of section.texts) {
            if (!stripInternal || text.kind !== BundleFileSectionKind.Internal) {
              (prependTexts || (prependTexts = [])).push(createUnparsedNode(text, node) as UnparsedTextLike);
            }
          }
          prependNode.texts = prependTexts || emptyArray;
          (texts || (texts = [])).push(prependNode);
          break;
        case BundleFileSectionKind.Internal:
          if (stripInternal) {
            if (!texts) texts = [];
            break;
          }
        // falls through

        case BundleFileSectionKind.Text:
          (texts || (texts = [])).push(createUnparsedNode(section, node) as UnparsedTextLike);
          break;
        default:
          Debug.assertNever(section);
      }
    }

    node.prologues = prologues || emptyArray;
    node.helpers = helpers;
    node.referencedFiles = referencedFiles || emptyArray;
    node.typeReferenceDirectives = typeReferenceDirectives;
    node.libReferenceDirectives = libReferenceDirectives || emptyArray;
    node.texts = texts || [<UnparsedTextLike>createUnparsedNode({ kind: BundleFileSectionKind.Text, pos: 0, end: node.text.length }, node)];
  }

  function parseOldFileOfCurrentEmit(node: UnparsedSource, bundleFileInfo: BundleFileInfo) {
    assert(!!node.oldFileOfCurrentEmit);
    let texts: UnparsedTextLike[] | undefined;
    let syntheticReferences: UnparsedSyntheticReference[] | undefined;
    for (const section of bundleFileInfo.sections) {
      switch (section.kind) {
        case BundleFileSectionKind.Internal:
        case BundleFileSectionKind.Text:
          (texts || (texts = [])).push(createUnparsedNode(section, node) as UnparsedTextLike);
          break;

        case BundleFileSectionKind.NoDefaultLib:
        case BundleFileSectionKind.Reference:
        case BundleFileSectionKind.Type:
        case BundleFileSectionKind.Lib:
          (syntheticReferences || (syntheticReferences = [])).push(createUnparsedSyntheticReference(section, node));
          break;

        // Ignore
        case BundleFileSectionKind.Prologue:
        case BundleFileSectionKind.EmitHelpers:
        case BundleFileSectionKind.Prepend:
          break;

        default:
          Debug.assertNever(section);
      }
    }
    node.texts = texts || emptyArray;
    node.helpers = map(bundleFileInfo.sources && bundleFileInfo.sources.helpers, (name) => getAllUnscopedEmitHelpers().get(name)!);
    node.syntheticReferences = syntheticReferences;
    return node;
  }

  function mapBundleFileSectionKindToSyntax(kind: BundleFileSectionKind): Syntax {
    switch (kind) {
      case BundleFileSectionKind.Prologue:
        return Syntax.UnparsedPrologue;
      case BundleFileSectionKind.Prepend:
        return Syntax.UnparsedPrepend;
      case BundleFileSectionKind.Internal:
        return Syntax.UnparsedInternalText;
      case BundleFileSectionKind.Text:
        return Syntax.UnparsedText;

      case BundleFileSectionKind.EmitHelpers:
      case BundleFileSectionKind.NoDefaultLib:
      case BundleFileSectionKind.Reference:
      case BundleFileSectionKind.Type:
      case BundleFileSectionKind.Lib:
        return fail(`BundleFileSectionKind: ${kind} not yet mapped to SyntaxKind`);

      default:
        return Debug.assertNever(kind);
    }
  }

  function createUnparsedNode(section: BundleFileSection, parent: UnparsedSource): UnparsedNode {
    const node = createNode(mapBundleFileSectionKindToSyntax(section.kind), section.pos, section.end) as UnparsedNode;
    node.parent = parent;
    node.data = section.data;
    return node;
  }

  function createUnparsedSyntheticReference(section: BundleFileHasNoDefaultLib | BundleFileReference, parent: UnparsedSource) {
    const node = createNode(Syntax.UnparsedSyntheticReference, section.pos, section.end) as UnparsedSyntheticReference;
    node.parent = parent;
    node.data = section.data;
    node.section = section;
    return node;
  }

  export function createInputFiles(javascriptText: string, declarationText: string): InputFiles;
  export function createInputFiles(
    readFileText: (path: string) => string | undefined,
    javascriptPath: string,
    javascriptMapPath: string | undefined,
    declarationPath: string,
    declarationMapPath: string | undefined,
    buildInfoPath: string | undefined
  ): InputFiles;
  export function createInputFiles(
    javascriptText: string,
    declarationText: string,
    javascriptMapPath: string | undefined,
    javascriptMapText: string | undefined,
    declarationMapPath: string | undefined,
    declarationMapText: string | undefined
  ): InputFiles;

  export function createInputFiles(
    javascriptText: string,
    declarationText: string,
    javascriptMapPath: string | undefined,
    javascriptMapText: string | undefined,
    declarationMapPath: string | undefined,
    declarationMapText: string | undefined,
    javascriptPath: string | undefined,
    declarationPath: string | undefined,
    buildInfoPath?: string | undefined,
    buildInfo?: BuildInfo,
    oldFileOfCurrentEmit?: boolean
  ): InputFiles;
  export function createInputFiles(
    javascriptTextOrReadFileText: string | ((path: string) => string | undefined),
    declarationTextOrJavascriptPath: string,
    javascriptMapPath?: string,
    javascriptMapTextOrDeclarationPath?: string,
    declarationMapPath?: string,
    declarationMapTextOrBuildInfoPath?: string,
    javascriptPath?: string | undefined,
    declarationPath?: string | undefined,
    buildInfoPath?: string | undefined,
    buildInfo?: BuildInfo,
    oldFileOfCurrentEmit?: boolean
  ): InputFiles {
    const node = <InputFiles>createNode(Syntax.InputFiles);
    if (!isString(javascriptTextOrReadFileText)) {
      const cache = createMap<string | false>();
      const textGetter = (path: string | undefined) => {
        if (path === undefined) return;
        let value = cache.get(path);
        if (value === undefined) {
          value = javascriptTextOrReadFileText(path);
          cache.set(path, value !== undefined ? value : false);
        }
        return value !== false ? (value as string) : undefined;
      };
      const definedTextGetter = (path: string) => {
        const result = textGetter(path);
        return result !== undefined ? result : `/* Input file ${path} was missing */\r\n`;
      };
      let buildInfo: BuildInfo | false;
      const getAndCacheBuildInfo = (getText: () => string | undefined) => {
        if (buildInfo === undefined) {
          const result = getText();
          buildInfo = result !== undefined ? getBuildInfo(result) : false;
        }
        return buildInfo || undefined;
      };
      node.javascriptPath = declarationTextOrJavascriptPath;
      node.javascriptMapPath = javascriptMapPath;
      node.declarationPath = Debug.checkDefined(javascriptMapTextOrDeclarationPath);
      node.declarationMapPath = declarationMapPath;
      node.buildInfoPath = declarationMapTextOrBuildInfoPath;
      Object.defineProperties(node, {
        javascriptText: {
          get() {
            return definedTextGetter(declarationTextOrJavascriptPath);
          },
        },
        javascriptMapText: {
          get() {
            return textGetter(javascriptMapPath);
          },
        }, // TODO:: if there is inline sourceMap in jsFile, use that
        declarationText: {
          get() {
            return definedTextGetter(Debug.checkDefined(javascriptMapTextOrDeclarationPath));
          },
        },
        declarationMapText: {
          get() {
            return textGetter(declarationMapPath);
          },
        }, // TODO:: if there is inline sourceMap in dtsFile, use that
        buildInfo: {
          get() {
            return getAndCacheBuildInfo(() => textGetter(declarationMapTextOrBuildInfoPath));
          },
        },
      });
    } else {
      node.javascriptText = javascriptTextOrReadFileText;
      node.javascriptMapPath = javascriptMapPath;
      node.javascriptMapText = javascriptMapTextOrDeclarationPath;
      node.declarationText = declarationTextOrJavascriptPath;
      node.declarationMapPath = declarationMapPath;
      node.declarationMapText = declarationMapTextOrBuildInfoPath;
      node.javascriptPath = javascriptPath;
      node.declarationPath = declarationPath;
      node.buildInfoPath = buildInfoPath;
      node.buildInfo = buildInfo;
      node.oldFileOfCurrentEmit = oldFileOfCurrentEmit;
    }
    return node;
  }

  export function updateBundle(node: Bundle, sourceFiles: readonly SourceFile[], prepends: readonly (UnparsedSource | InputFiles)[] = emptyArray) {
    if (node.sourceFiles !== sourceFiles || node.prepends !== prepends) {
      return createBundle(sourceFiles, prepends);
    }
    return node;
  }

  // Compound nodes

  export function createImmediatelyInvokedFunctionExpression(statements: readonly Statement[]): CallExpression;
  export function createImmediatelyInvokedFunctionExpression(statements: readonly Statement[], param: ParameterDeclaration, paramValue: Expression): CallExpression;
  export function createImmediatelyInvokedFunctionExpression(statements: readonly Statement[], param?: ParameterDeclaration, paramValue?: Expression) {
    return createCall(
      createFunctionExpression(
        /*modifiers*/ undefined,
        /*asteriskToken*/ undefined,
        /*name*/ undefined,
        /*typeParameters*/ undefined,
        /*parameters*/ param ? [param] : [],
        /*type*/ undefined,
        createBlock(statements, /*multiLine*/ true)
      ),
      /*typeArguments*/ undefined,
      /*argumentsArray*/ paramValue ? [paramValue] : []
    );
  }

  export function createImmediatelyInvokedArrowFunction(statements: readonly Statement[]): CallExpression;
  export function createImmediatelyInvokedArrowFunction(statements: readonly Statement[], param: ParameterDeclaration, paramValue: Expression): CallExpression;
  export function createImmediatelyInvokedArrowFunction(statements: readonly Statement[], param?: ParameterDeclaration, paramValue?: Expression) {
    return createCall(
      createArrowFunction(
        /*modifiers*/ undefined,
        /*typeParameters*/ undefined,
        /*parameters*/ param ? [param] : [],
        /*type*/ undefined,
        /*equalsGreaterThanToken*/ undefined,
        createBlock(statements, /*multiLine*/ true)
      ),
      /*typeArguments*/ undefined,
      /*argumentsArray*/ paramValue ? [paramValue] : []
    );
  }

  export function createComma(left: Expression, right: Expression) {
    return <Expression>createBinary(left, Syntax.CommaToken, right);
  }

  export function createLessThan(left: Expression, right: Expression) {
    return <Expression>createBinary(left, Syntax.LessThanToken, right);
  }

  export function createAssignment(left: ObjectLiteralExpression | ArrayLiteralExpression, right: Expression): DestructuringAssignment;
  export function createAssignment(left: Expression, right: Expression): BinaryExpression;
  export function createAssignment(left: Expression, right: Expression) {
    return createBinary(left, Syntax.EqualsToken, right);
  }

  export function createStrictEquality(left: Expression, right: Expression) {
    return createBinary(left, Syntax.Equals3Token, right);
  }

  export function createStrictInequality(left: Expression, right: Expression) {
    return createBinary(left, Syntax.ExclamationEquals2Token, right);
  }

  export function createAdd(left: Expression, right: Expression) {
    return createBinary(left, Syntax.PlusToken, right);
  }

  export function createSubtract(left: Expression, right: Expression) {
    return createBinary(left, Syntax.MinusToken, right);
  }

  export function createPostfixIncrement(operand: Expression) {
    return createPostfix(operand, Syntax.Plus2Token);
  }

  export function createLogicalAnd(left: Expression, right: Expression) {
    return createBinary(left, Syntax.Ampersand2Token, right);
  }

  export function createLogicalOr(left: Expression, right: Expression) {
    return createBinary(left, Syntax.Bar2Token, right);
  }

  export function createNullishCoalesce(left: Expression, right: Expression) {
    return createBinary(left, Syntax.Question2Token, right);
  }

  export function createLogicalNot(operand: Expression) {
    return createPrefix(Syntax.ExclamationToken, operand);
  }

  export function createVoidZero() {
    return createVoid(createLiteral(0));
  }

  export function createExportDefault(expression: Expression) {
    return createExportAssignment(/*decorators*/ undefined, /*modifiers*/ undefined, /*isExportEquals*/ false, expression);
  }

  export function createExternalModuleExport(exportName: Identifier) {
    return createExportDeclaration(/*decorators*/ undefined, /*modifiers*/ undefined, createNamedExports([createExportSpecifier(/*propertyName*/ undefined, exportName)]));
  }

  // Utilities

  /**
   * Clears any EmitNode entries from parse-tree nodes.
   * @param sourceFile A source file.
   */
  export function disposeEmitNodes(sourceFile: SourceFile) {
    // During transformation we may need to annotate a parse tree node with transient
    // transformation properties. As parse tree nodes live longer than transformation
    // nodes, we need to make sure we reclaim any memory allocated for custom ranges
    // from these nodes to ensure we do not hold onto entire subtrees just for position
    // information. We also need to reset these nodes to a pre-transformation state
    // for incremental parsing scenarios so that we do not impact later emit.
    sourceFile = qn.get.sourceFileOf(qn.get.parseTreeOf(sourceFile));
    const emitNode = sourceFile && sourceFile.emitNode;
    const annotatedNodes = emitNode && emitNode.annotatedNodes;
    if (annotatedNodes) {
      for (const node of annotatedNodes) {
        node.emitNode = undefined;
      }
    }
  }

  export function getOrCreateEmitNode(node: Node): EmitNode {
    if (!node.emitNode) {
      if (qn.is.parseTreeNode(node)) {
        if (node.kind === Syntax.SourceFile) {
          return (node.emitNode = { annotatedNodes: [node] } as EmitNode);
        }

        const sourceFile = qn.get.sourceFileOf(qn.get.parseTreeOf(qn.get.sourceFileOf(node)));
        getOrCreateEmitNode(sourceFile).annotatedNodes!.push(node);
      }

      node.emitNode = {} as EmitNode;
    }

    return node.emitNode;
  }

  export function removeAllComments<T extends Node>(node: T): T {
    const emitNode = getOrCreateEmitNode(node);
    emitNode.flags |= EmitFlags.NoComments;
    emitNode.leadingComments = undefined;
    emitNode.trailingComments = undefined;
    return node;
  }

  export function setTextRange<T extends TextRange>(range: T, location: TextRange | undefined): T {
    if (location) {
      range.pos = location.pos;
      range.end = location.end;
    }
    return range;
  }

  export function setEmitFlags<T extends Node>(node: T, emitFlags: EmitFlags) {
    getOrCreateEmitNode(node).flags = emitFlags;
    return node;
  }

  export function addEmitFlags<T extends Node>(node: T, emitFlags: EmitFlags) {
    const emitNode = getOrCreateEmitNode(node);
    emitNode.flags = emitNode.flags | emitFlags;
    return node;
  }

  export function getSourceMapRange(node: Node): SourceMapRange {
    const emitNode = node.emitNode;
    return (emitNode && emitNode.sourceMapRange) || node;
  }

  export function setSourceMapRange<T extends Node>(node: T, range: SourceMapRange | undefined) {
    getOrCreateEmitNode(node).sourceMapRange = range;
    return node;
  }

  let SourceMapSource: new (fileName: string, text: string, skipTrivia?: (pos: number) => number) => SourceMapSource;

  export function createSourceMapSource(fileName: string, text: string, skipTrivia?: (pos: number) => number): SourceMapSource {
    return new (SourceMapSource || (SourceMapSource = Node.SourceMapSourceObj))(fileName, text, qy.skipTrivia);
  }

  export function getTokenSourceMapRange(node: Node, token: Syntax): SourceMapRange | undefined {
    const emitNode = node.emitNode;
    const tokenSourceMapRanges = emitNode && emitNode.tokenSourceMapRanges;
    return tokenSourceMapRanges && tokenSourceMapRanges[token];
  }

  export function setTokenSourceMapRange<T extends Node>(node: T, token: Syntax, range: SourceMapRange | undefined) {
    const emitNode = getOrCreateEmitNode(node);
    const tokenSourceMapRanges = emitNode.tokenSourceMapRanges || (emitNode.tokenSourceMapRanges = []);
    tokenSourceMapRanges[token] = range;
    return node;
  }

  export function getStartsOnNewLine(node: Node) {
    const emitNode = node.emitNode;
    return emitNode && emitNode.startsOnNewLine;
  }

  export function setStartsOnNewLine<T extends Node>(node: T, newLine: boolean) {
    getOrCreateEmitNode(node).startsOnNewLine = newLine;
    return node;
  }

  export function getCommentRange(node: Node) {
    const emitNode = node.emitNode;
    return (emitNode && emitNode.commentRange) || node;
  }

  export function setCommentRange<T extends Node>(node: T, range: TextRange) {
    getOrCreateEmitNode(node).commentRange = range;
    return node;
  }

  export function getSyntheticLeadingComments(node: Node): SynthesizedComment[] | undefined {
    const emitNode = node.emitNode;
    return emitNode && emitNode.leadingComments;
  }

  export function setSyntheticLeadingComments<T extends Node>(node: T, comments: SynthesizedComment[] | undefined) {
    getOrCreateEmitNode(node).leadingComments = comments;
    return node;
  }

  export function addSyntheticLeadingComment<T extends Node>(node: T, kind: Syntax.SingleLineCommentTrivia | Syntax.MultiLineCommentTrivia, text: string, hasTrailingNewLine?: boolean) {
    return setSyntheticLeadingComments(
      node,
      append<SynthesizedComment>(getSyntheticLeadingComments(node), { kind, pos: -1, end: -1, hasTrailingNewLine, text })
    );
  }

  export function getSyntheticTrailingComments(node: Node): SynthesizedComment[] | undefined {
    const emitNode = node.emitNode;
    return emitNode && emitNode.trailingComments;
  }

  export function setSyntheticTrailingComments<T extends Node>(node: T, comments: SynthesizedComment[] | undefined) {
    getOrCreateEmitNode(node).trailingComments = comments;
    return node;
  }

  export function addSyntheticTrailingComment<T extends Node>(node: T, kind: Syntax.SingleLineCommentTrivia | Syntax.MultiLineCommentTrivia, text: string, hasTrailingNewLine?: boolean) {
    return setSyntheticTrailingComments(
      node,
      append<SynthesizedComment>(getSyntheticTrailingComments(node), { kind, pos: -1, end: -1, hasTrailingNewLine, text })
    );
  }

  export function moveSyntheticComments<T extends Node>(node: T, original: Node): T {
    setSyntheticLeadingComments(node, getSyntheticLeadingComments(original));
    setSyntheticTrailingComments(node, getSyntheticTrailingComments(original));
    const emit = getOrCreateEmitNode(original);
    emit.leadingComments = undefined;
    emit.trailingComments = undefined;
    return node;
  }

  export function ignoreSourceNewlines<T extends Node>(node: T): T {
    getOrCreateEmitNode(node).flags |= EmitFlags.IgnoreSourceNewlines;
    return node;
  }

  export function getConstantValue(node: PropertyAccessExpression | ElementAccessExpression): string | number | undefined {
    const emitNode = node.emitNode;
    return emitNode && emitNode.constantValue;
  }

  export function setConstantValue(node: PropertyAccessExpression | ElementAccessExpression, value: string | number): PropertyAccessExpression | ElementAccessExpression {
    const emitNode = getOrCreateEmitNode(node);
    emitNode.constantValue = value;
    return node;
  }

  export function addEmitHelper<T extends Node>(node: T, helper: EmitHelper): T {
    const emitNode = getOrCreateEmitNode(node);
    emitNode.helpers = append(emitNode.helpers, helper);
    return node;
  }

  export function addEmitHelpers<T extends Node>(node: T, helpers: EmitHelper[] | undefined): T {
    if (some(helpers)) {
      const emitNode = getOrCreateEmitNode(node);
      for (const helper of helpers) {
        emitNode.helpers = appendIfUnique(emitNode.helpers, helper);
      }
    }
    return node;
  }

  export function removeEmitHelper(node: Node, helper: EmitHelper): boolean {
    const emitNode = node.emitNode;
    if (emitNode) {
      const helpers = emitNode.helpers;
      if (helpers) {
        return orderedRemoveItem(helpers, helper);
      }
    }
    return false;
  }

  export function getEmitHelpers(node: Node): EmitHelper[] | undefined {
    const emitNode = node.emitNode;
    return emitNode && emitNode.helpers;
  }

  export function moveEmitHelpers(source: Node, target: Node, predicate: (helper: EmitHelper) => boolean) {
    const sourceEmitNode = source.emitNode;
    const sourceEmitHelpers = sourceEmitNode && sourceEmitNode.helpers;
    if (!some(sourceEmitHelpers)) return;

    const targetEmitNode = getOrCreateEmitNode(target);
    let helpersRemoved = 0;
    for (let i = 0; i < sourceEmitHelpers.length; i++) {
      const helper = sourceEmitHelpers[i];
      if (predicate(helper)) {
        helpersRemoved++;
        targetEmitNode.helpers = appendIfUnique(targetEmitNode.helpers, helper);
      } else if (helpersRemoved > 0) {
        sourceEmitHelpers[i - helpersRemoved] = helper;
      }
    }

    if (helpersRemoved > 0) {
      sourceEmitHelpers.length -= helpersRemoved;
    }
  }

  export function compareEmitHelpers(x: EmitHelper, y: EmitHelper) {
    if (x === y) return Comparison.EqualTo;
    if (x.priority === y.priority) return Comparison.EqualTo;
    if (x.priority === undefined) return Comparison.GreaterThan;
    if (y.priority === undefined) return Comparison.LessThan;
    return compareValues(x.priority, y.priority);
  }

  export function setOriginalNode<T extends Node>(node: T, original: Node | undefined): T {
    node.original = original;
    if (original) {
      const emitNode = original.emitNode;
      if (emitNode) node.emitNode = mergeEmitNode(emitNode, node.emitNode);
    }
    return node;
  }

  function mergeEmitNode(sourceEmitNode: EmitNode, destEmitNode: EmitNode | undefined) {
    const { flags, leadingComments, trailingComments, commentRange, sourceMapRange, tokenSourceMapRanges, constantValue, helpers, startsOnNewLine } = sourceEmitNode;
    if (!destEmitNode) destEmitNode = {} as EmitNode;
    // We are using `.slice()` here in case `destEmitNode.leadingComments` is pushed to later.
    if (leadingComments) destEmitNode.leadingComments = qa.addRange(leadingComments.slice(), destEmitNode.leadingComments);
    if (trailingComments) destEmitNode.trailingComments = qa.addRange(trailingComments.slice(), destEmitNode.trailingComments);
    if (flags) destEmitNode.flags = flags;
    if (commentRange) destEmitNode.commentRange = commentRange;
    if (sourceMapRange) destEmitNode.sourceMapRange = sourceMapRange;
    if (tokenSourceMapRanges) destEmitNode.tokenSourceMapRanges = mergeTokenSourceMapRanges(tokenSourceMapRanges, destEmitNode.tokenSourceMapRanges!);
    if (constantValue !== undefined) destEmitNode.constantValue = constantValue;
    if (helpers) destEmitNode.helpers = qa.addRange(destEmitNode.helpers, helpers);
    if (startsOnNewLine !== undefined) destEmitNode.startsOnNewLine = startsOnNewLine;
    return destEmitNode;
  }

  function mergeTokenSourceMapRanges(sourceRanges: (TextRange | undefined)[], destRanges: (TextRange | undefined)[]) {
    if (!destRanges) destRanges = [];
    for (const key in sourceRanges) {
      destRanges[key] = sourceRanges[key];
    }
    return destRanges;
  }

  export const nullTransformationContext: TransformationContext = {
    enableEmitNotification: qa.noop,
    enableSubstitution: qa.noop,
    endLexicalEnvironment: () => undefined,
    getCompilerOptions: () => ({}),
    getEmitHost: qa.notImplemented,
    getEmitResolver: qa.notImplemented,
    setLexicalEnvironmentFlags: qa.noop,
    getLexicalEnvironmentFlags: () => 0,
    hoistFunctionDeclaration: qa.noop,
    hoistVariableDeclaration: qa.noop,
    addInitializationStatement: qa.noop,
    isEmitNotificationEnabled: qa.notImplemented,
    isSubstitutionEnabled: qa.notImplemented,
    onEmitNode: qa.noop,
    onSubstituteNode: qa.notImplemented,
    readEmitHelpers: qa.notImplemented,
    requestEmitHelper: qa.noop,
    resumeLexicalEnvironment: qa.noop,
    startLexicalEnvironment: qa.noop,
    suspendLexicalEnvironment: qa.noop,
    addDiagnostic: qa.noop,
  };

  export type TypeOfTag = 'undefined' | 'number' | 'boolean' | 'string' | 'symbol' | 'object' | 'function';

  export function createTypeCheck(value: Expression, tag: TypeOfTag) {
    return tag === 'undefined' ? createStrictEquality(value, createVoidZero()) : createStrictEquality(createTypeOf(value), createLiteral(tag));
  }

  export function createMemberAccessForPropertyName(target: Expression, memberName: PropertyName, location?: TextRange): MemberExpression {
    if (qn.is.kind(ComputedPropertyName, memberName)) {
      return setTextRange(createElementAccess(target, memberName.expression), location);
    } else {
      const expression = setTextRange(
        qn.is.kind(Identifier, memberName) || qn.is.kind(PrivateIdentifier, memberName) ? createPropertyAccess(target, memberName) : createElementAccess(target, memberName),
        memberName
      );
      getOrCreateEmitNode(expression).flags |= EmitFlags.NoNestedSourceMaps;
      return expression;
    }
  }

  export function createFunctionCall(func: Expression, thisArg: Expression, argumentsList: readonly Expression[], location?: TextRange) {
    return setTextRange(createCall(createPropertyAccess(func, 'call'), /*typeArguments*/ undefined, [thisArg, ...argumentsList]), location);
  }

  export function createFunctionApply(func: Expression, thisArg: Expression, argumentsExpression: Expression, location?: TextRange) {
    return setTextRange(createCall(createPropertyAccess(func, 'apply'), /*typeArguments*/ undefined, [thisArg, argumentsExpression]), location);
  }

  export function createArraySlice(array: Expression, start?: number | Expression) {
    const argumentsList: Expression[] = [];
    if (start !== undefined) {
      argumentsList.push(typeof start === 'number' ? createLiteral(start) : start);
    }

    return createCall(createPropertyAccess(array, 'slice'), /*typeArguments*/ undefined, argumentsList);
  }

  export function createArrayConcat(array: Expression, values: readonly Expression[]) {
    return createCall(createPropertyAccess(array, 'concat'), /*typeArguments*/ undefined, values);
  }

  export function createMathPow(left: Expression, right: Expression, location?: TextRange) {
    return setTextRange(createCall(createPropertyAccess(createIdentifier('Math'), 'pow'), /*typeArguments*/ undefined, [left, right]), location);
  }

  function createReactNamespace(reactNamespace: string, parent: JsxOpeningLikeElement | JsxOpeningFragment) {
    // To ensure the emit resolver can properly resolve the namespace, we need to
    // treat this identifier as if it were a source tree node by clearing the `Synthesized`
    // flag and setting a parent node.
    const react = createIdentifier(reactNamespace || 'React');
    react.flags &= ~NodeFlags.Synthesized;
    // Set the parent that is in parse tree
    // this makes sure that parent chain is intact for checker to traverse complete scope tree
    react.parent = qn.get.parseTreeOf(parent);
    return react;
  }

  function createJsxFactoryExpressionFromEntityName(jsxFactory: EntityName, parent: JsxOpeningLikeElement | JsxOpeningFragment): Expression {
    if (qn.is.kind(QualifiedName, jsxFactory)) {
      const left = createJsxFactoryExpressionFromEntityName(jsxFactory.left, parent);
      const right = createIdentifier(idText(jsxFactory.right));
      right.escapedText = jsxFactory.right.escapedText;
      return createPropertyAccess(left, right);
    } else {
      return createReactNamespace(idText(jsxFactory), parent);
    }
  }

  function createJsxFactoryExpression(jsxFactoryEntity: EntityName | undefined, reactNamespace: string, parent: JsxOpeningLikeElement | JsxOpeningFragment): Expression {
    return jsxFactoryEntity ? createJsxFactoryExpressionFromEntityName(jsxFactoryEntity, parent) : createPropertyAccess(createReactNamespace(reactNamespace, parent), 'createElement');
  }

  export function createExpressionForJsxElement(
    jsxFactoryEntity: EntityName | undefined,
    reactNamespace: string,
    tagName: Expression,
    props: Expression,
    children: readonly Expression[],
    parentElement: JsxOpeningLikeElement,
    location: TextRange
  ): LeftHandSideExpression {
    const argumentsList = [tagName];
    if (props) {
      argumentsList.push(props);
    }

    if (children && children.length > 0) {
      if (!props) {
        argumentsList.push(createNull());
      }

      if (children.length > 1) {
        for (const child of children) {
          startOnNewLine(child);
          argumentsList.push(child);
        }
      } else {
        argumentsList.push(children[0]);
      }
    }

    return setTextRange(createCall(createJsxFactoryExpression(jsxFactoryEntity, reactNamespace, parentElement), /*typeArguments*/ undefined, argumentsList), location);
  }

  export function createExpressionForJsxFragment(
    jsxFactoryEntity: EntityName | undefined,
    reactNamespace: string,
    children: readonly Expression[],
    parentElement: JsxOpeningFragment,
    location: TextRange
  ): LeftHandSideExpression {
    const tagName = createPropertyAccess(createReactNamespace(reactNamespace, parentElement), 'Fragment');

    const argumentsList = [<Expression>tagName];
    argumentsList.push(createNull());

    if (children && children.length > 0) {
      if (children.length > 1) {
        for (const child of children) {
          startOnNewLine(child);
          argumentsList.push(child);
        }
      } else {
        argumentsList.push(children[0]);
      }
    }

    return setTextRange(createCall(createJsxFactoryExpression(jsxFactoryEntity, reactNamespace, parentElement), /*typeArguments*/ undefined, argumentsList), location);
  }

  // Helpers

  /**
   * Gets an identifier for the name of an *unscoped* emit helper.
   */
  export function getUnscopedHelperName(name: string) {
    return setEmitFlags(createIdentifier(name), EmitFlags.HelperName | EmitFlags.AdviseOnEmitNode);
  }

  export const valuesHelper: UnscopedEmitHelper = {
    name: 'typescript:values',
    importName: '__values',
    scoped: false,
    text: `
            var __values = (this && this.__values) || function(o) {
                var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
                if (m) return m.call(o);
                if (o && typeof o.length === "number") return {
                    next: function () {
                        if (o && i >= o.length) o = void 0;
                        return { value: o && o[i++], done: !o };
                    }
                };
                throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
            };`,
  };

  export function createValuesHelper(context: TransformationContext, expression: Expression, location?: TextRange) {
    context.requestEmitHelper(valuesHelper);
    return setTextRange(createCall(getUnscopedHelperName('__values'), /*typeArguments*/ undefined, [expression]), location);
  }

  export const readHelper: UnscopedEmitHelper = {
    name: 'typescript:read',
    importName: '__read',
    scoped: false,
    text: `
            var __read = (this && this.__read) || function (o, n) {
                var m = typeof Symbol === "function" && o[Symbol.iterator];
                if (!m) return o;
                var i = m.call(o), r, ar = [], e;
                try {
                    while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
                }
                catch (error) { e = { error: error }; }
                finally {
                    try {
                        if (r && !r.done && (m = i["return"])) m.call(i);
                    }
                    finally { if (e) throw e.error; }
                }
                return ar;
            };`,
  };

  export function createReadHelper(context: TransformationContext, iteratorRecord: Expression, count: number | undefined, location?: TextRange) {
    context.requestEmitHelper(readHelper);
    return setTextRange(createCall(getUnscopedHelperName('__read'), /*typeArguments*/ undefined, count !== undefined ? [iteratorRecord, createLiteral(count)] : [iteratorRecord]), location);
  }

  export const spreadHelper: UnscopedEmitHelper = {
    name: 'typescript:spread',
    importName: '__spread',
    scoped: false,
    dependencies: [readHelper],
    text: `
            var __spread = (this && this.__spread) || function () {
                for (var ar = [], i = 0; i < arguments.length; i++) ar = ar.concat(__read(arguments[i]));
                return ar;
            };`,
  };

  export function createSpreadHelper(context: TransformationContext, argumentList: readonly Expression[], location?: TextRange) {
    context.requestEmitHelper(spreadHelper);
    return setTextRange(createCall(getUnscopedHelperName('__spread'), /*typeArguments*/ undefined, argumentList), location);
  }

  export const spreadArraysHelper: UnscopedEmitHelper = {
    name: 'typescript:spreadArrays',
    importName: '__spreadArrays',
    scoped: false,
    text: `
            var __spreadArrays = (this && this.__spreadArrays) || function () {
                for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
                for (var r = Array(s), k = 0, i = 0; i < il; i++)
                    for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
                        r[k] = a[j];
                return r;
            };`,
  };

  export function createSpreadArraysHelper(context: TransformationContext, argumentList: readonly Expression[], location?: TextRange) {
    context.requestEmitHelper(spreadArraysHelper);
    return setTextRange(createCall(getUnscopedHelperName('__spreadArrays'), /*typeArguments*/ undefined, argumentList), location);
  }

  export function createForOfBindingStatement(node: ForInitializer, boundValue: Expression): Statement {
    if (qn.is.kind(VariableDeclarationList, node)) {
      const firstDeclaration = first(node.declarations);
      const updatedDeclaration = updateVariableDeclaration(firstDeclaration, firstDeclaration.name, /*typeNode*/ undefined, boundValue);
      return setTextRange(createVariableStatement(/*modifiers*/ undefined, updateVariableDeclarationList(node, [updatedDeclaration])), /*location*/ node);
    } else {
      const updatedExpression = setTextRange(createAssignment(node, boundValue), /*location*/ node);
      return setTextRange(createStatement(updatedExpression), /*location*/ node);
    }
  }

  export function insertLeadingStatement(dest: Statement, source: Statement) {
    if (qn.is.kind(Block, dest)) {
      return updateBlock(dest, setTextRange(NodeArray.create([source, ...dest.statements]), dest.statements));
    } else {
      return createBlock(NodeArray.create([dest, source]), /*multiLine*/ true);
    }
  }

  export function restoreEnclosingLabel(node: Statement, outermostLabeledStatement: LabeledStatement | undefined, afterRestoreLabelCallback?: (node: LabeledStatement) => void): Statement {
    if (!outermostLabeledStatement) {
      return node;
    }
    const updated = updateLabel(
      outermostLabeledStatement,
      outermostLabeledStatement.label,
      outermostLabeledStatement.statement.kind === Syntax.LabeledStatement ? restoreEnclosingLabel(node, <LabeledStatement>outermostLabeledStatement.statement) : node
    );
    if (afterRestoreLabelCallback) {
      afterRestoreLabelCallback(outermostLabeledStatement);
    }
    return updated;
  }

  export interface CallBinding {
    target: LeftHandSideExpression;
    thisArg: Expression;
  }

  function shouldBeCapturedInTempVariable(node: Expression, cacheIdentifiers: boolean): boolean {
    const target = skipParentheses(node) as Expression | ArrayLiteralExpression | ObjectLiteralExpression;
    switch (target.kind) {
      case Syntax.Identifier:
        return cacheIdentifiers;
      case Syntax.ThisKeyword:
      case Syntax.NumericLiteral:
      case Syntax.BigIntLiteral:
      case Syntax.StringLiteral:
        return false;
      case Syntax.ArrayLiteralExpression:
        const elements = target.elements;
        if (elements.length === 0) {
          return false;
        }
        return true;
      case Syntax.ObjectLiteralExpression:
        return (<ObjectLiteralExpression>target).properties.length > 0;
      default:
        return true;
    }
  }

  export function createCallBinding(expression: Expression, recordTempVariable: (temp: Identifier) => void, _?: ScriptTarget, cacheIdentifiers = false): CallBinding {
    const callee = skipOuterExpressions(expression, OuterExpressionKinds.All);
    let thisArg: Expression;
    let target: LeftHandSideExpression;
    if (qn.is.superProperty(callee)) {
      thisArg = createThis();
      target = callee;
    } else if (callee.kind === Syntax.SuperKeyword) {
      thisArg = createThis();
      target = <PrimaryExpression>callee;
    } else if (qn.get.emitFlags(callee) & EmitFlags.HelperName) {
      thisArg = createVoidZero();
      target = parenthesizeForAccess(callee);
    } else {
      switch (callee.kind) {
        case Syntax.PropertyAccessExpression: {
          if (shouldBeCapturedInTempVariable((<PropertyAccessExpression>callee).expression, cacheIdentifiers)) {
            // for `a.b()` target is `(_a = a).b` and thisArg is `_a`
            thisArg = createTempVariable(recordTempVariable);
            target = createPropertyAccess(
              setTextRange(createAssignment(thisArg, (<PropertyAccessExpression>callee).expression), (<PropertyAccessExpression>callee).expression),
              (<PropertyAccessExpression>callee).name
            );
            setTextRange(target, callee);
          } else {
            thisArg = (<PropertyAccessExpression>callee).expression;
            target = <PropertyAccessExpression>callee;
          }
          break;
        }

        case Syntax.ElementAccessExpression: {
          if (shouldBeCapturedInTempVariable((<ElementAccessExpression>callee).expression, cacheIdentifiers)) {
            // for `a[b]()` target is `(_a = a)[b]` and thisArg is `_a`
            thisArg = createTempVariable(recordTempVariable);
            target = createElementAccess(
              setTextRange(createAssignment(thisArg, (<ElementAccessExpression>callee).expression), (<ElementAccessExpression>callee).expression),
              (<ElementAccessExpression>callee).argumentExpression
            );
            setTextRange(target, callee);
          } else {
            thisArg = (<ElementAccessExpression>callee).expression;
            target = <ElementAccessExpression>callee;
          }

          break;
        }

        default: {
          // for `a()` target is `a` and thisArg is `void 0`
          thisArg = createVoidZero();
          target = parenthesizeForAccess(expression);
          break;
        }
      }
    }

    return { target, thisArg };
  }

  export function inlineExpressions(expressions: readonly Expression[]) {
    // Avoid deeply nested comma expressions as traversing them during emit can result in "Maximum call
    // stack size exceeded" errors.
    return expressions.length > 10 ? createCommaList(expressions) : reduceLeft(expressions, createComma)!;
  }

  export function createExpressionFromEntityName(node: EntityName | Expression): Expression {
    if (qn.is.kind(QualifiedName, node)) {
      const left = createExpressionFromEntityName(node.left);
      const right = getMutableClone(node.right);
      return setTextRange(createPropertyAccess(left, right), node);
    } else {
      return getMutableClone(node);
    }
  }

  export function createExpressionForPropertyName(memberName: Exclude<PropertyName, PrivateIdentifier>): Expression {
    if (qn.is.kind(Identifier, memberName)) {
      return createLiteral(memberName);
    } else if (qn.is.kind(ComputedPropertyName, memberName)) {
      return getMutableClone(memberName.expression);
    } else {
      return getMutableClone(memberName);
    }
  }

  export function createExpressionForObjectLiteralElementLike(node: ObjectLiteralExpression, property: ObjectLiteralElementLike, receiver: Expression): Expression | undefined {
    if (property.name && qn.is.kind(PrivateIdentifier, property.name)) {
      Debug.failBadSyntax(property.name, 'Private identifiers are not allowed in object literals.');
    }
    switch (property.kind) {
      case Syntax.GetAccessor:
      case Syntax.SetAccessor:
        return createExpressionForAccessorDeclaration(node.properties, property as typeof property & { name: Exclude<PropertyName, PrivateIdentifier> }, receiver, !!node.multiLine);
      case Syntax.PropertyAssignment:
        return createExpressionForPropertyAssignment(property, receiver);
      case Syntax.ShorthandPropertyAssignment:
        return createExpressionForShorthandPropertyAssignment(property, receiver);
      case Syntax.MethodDeclaration:
        return createExpressionForMethodDeclaration(property, receiver);
    }
    return;
  }

  function createExpressionForAccessorDeclaration(
    properties: NodeArray<Declaration>,
    property: AccessorDeclaration & { name: Exclude<PropertyName, PrivateIdentifier> },
    receiver: Expression,
    multiLine: boolean
  ) {
    const { firstAccessor, getAccessor, setAccessor } = getAllAccessorDeclarations(properties, property);
    if (property === firstAccessor) {
      const properties: ObjectLiteralElementLike[] = [];
      if (getAccessor) {
        const getterFunction = createFunctionExpression(
          getAccessor.modifiers,
          /*asteriskToken*/ undefined,
          /*name*/ undefined,
          /*typeParameters*/ undefined,
          getAccessor.parameters,
          /*type*/ undefined,
          getAccessor.body! // TODO: GH#18217
        );
        setTextRange(getterFunction, getAccessor);
        setOriginalNode(getterFunction, getAccessor);
        const getter = createPropertyAssignment('get', getterFunction);
        properties.push(getter);
      }

      if (setAccessor) {
        const setterFunction = createFunctionExpression(
          setAccessor.modifiers,
          /*asteriskToken*/ undefined,
          /*name*/ undefined,
          /*typeParameters*/ undefined,
          setAccessor.parameters,
          /*type*/ undefined,
          setAccessor.body! // TODO: GH#18217
        );
        setTextRange(setterFunction, setAccessor);
        setOriginalNode(setterFunction, setAccessor);
        const setter = createPropertyAssignment('set', setterFunction);
        properties.push(setter);
      }

      properties.push(createPropertyAssignment('enumerable', getAccessor || setAccessor ? createFalse() : createTrue()));
      properties.push(createPropertyAssignment('configurable', createTrue()));

      const expression = setTextRange(
        createCall(createPropertyAccess(createIdentifier('Object'), 'defineProperty'), /*typeArguments*/ undefined, [
          receiver,
          createExpressionForPropertyName(property.name),
          createObjectLiteral(properties, multiLine),
        ]),
        /*location*/ firstAccessor
      );

      return aggregateTransformFlags(expression);
    }

    return;
  }

  function createExpressionForPropertyAssignment(property: PropertyAssignment, receiver: Expression) {
    return aggregateTransformFlags(
      setOriginalNode(setTextRange(createAssignment(createMemberAccessForPropertyName(receiver, property.name, /*location*/ property.name), property.initializer), property), property)
    );
  }

  function createExpressionForShorthandPropertyAssignment(property: ShorthandPropertyAssignment, receiver: Expression) {
    return aggregateTransformFlags(
      setOriginalNode(
        setTextRange(createAssignment(createMemberAccessForPropertyName(receiver, property.name, /*location*/ property.name), getSynthesizedClone(property.name)), /*location*/ property),
        /*original*/ property
      )
    );
  }

  function createExpressionForMethodDeclaration(method: MethodDeclaration, receiver: Expression) {
    return aggregateTransformFlags(
      setOriginalNode(
        setTextRange(
          createAssignment(
            createMemberAccessForPropertyName(receiver, method.name, /*location*/ method.name),
            setOriginalNode(
              setTextRange(
                createFunctionExpression(
                  method.modifiers,
                  method.asteriskToken,
                  /*name*/ undefined,
                  /*typeParameters*/ undefined,
                  method.parameters,
                  /*type*/ undefined,
                  method.body! // TODO: GH#18217
                ),
                /*location*/ method
              ),
              /*original*/ method
            )
          ),
          /*location*/ method
        ),
        /*original*/ method
      )
    );
  }

  export function getInternalName(node: Declaration, allowComments?: boolean, allowSourceMaps?: boolean) {
    return getName(node, allowComments, allowSourceMaps, EmitFlags.LocalName | EmitFlags.InternalName);
  }

  export function isInternalName(node: Identifier) {
    return (qn.get.emitFlags(node) & EmitFlags.InternalName) !== 0;
  }

  export function getLocalName(node: Declaration, allowComments?: boolean, allowSourceMaps?: boolean) {
    return getName(node, allowComments, allowSourceMaps, EmitFlags.LocalName);
  }

  export function isLocalName(node: Identifier) {
    return (qn.get.emitFlags(node) & EmitFlags.LocalName) !== 0;
  }

  export function getExportName(node: Declaration, allowComments?: boolean, allowSourceMaps?: boolean): Identifier {
    return getName(node, allowComments, allowSourceMaps, EmitFlags.ExportName);
  }

  export function isExportName(node: Identifier) {
    return (qn.get.emitFlags(node) & EmitFlags.ExportName) !== 0;
  }

  export function getDeclarationName(node: Declaration, allowComments?: boolean, allowSourceMaps?: boolean) {
    return getName(node, allowComments, allowSourceMaps);
  }

  function getName(node: Declaration, allowComments?: boolean, allowSourceMaps?: boolean, emitFlags: EmitFlags = 0) {
    const nodeName = getNameOfDeclaration(node);
    if (nodeName && qn.is.kind(Identifier, nodeName) && !qn.is.generatedIdentifier(nodeName)) {
      const name = getMutableClone(nodeName);
      emitFlags |= qn.get.emitFlags(nodeName);
      if (!allowSourceMaps) emitFlags |= EmitFlags.NoSourceMap;
      if (!allowComments) emitFlags |= EmitFlags.NoComments;
      if (emitFlags) setEmitFlags(name, emitFlags);
      return name;
    }
    return getGeneratedNameForNode(node);
  }

  export function getExternalModuleOrNamespaceExportName(ns: Identifier | undefined, node: Declaration, allowComments?: boolean, allowSourceMaps?: boolean): Identifier | PropertyAccessExpression {
    if (ns && hasSyntacticModifier(node, ModifierFlags.Export)) {
      return getNamespaceMemberName(ns, getName(node), allowComments, allowSourceMaps);
    }
    return getExportName(node, allowComments, allowSourceMaps);
  }

  export function getNamespaceMemberName(ns: Identifier, name: Identifier, allowComments?: boolean, allowSourceMaps?: boolean): PropertyAccessExpression {
    const qualifiedName = createPropertyAccess(ns, isSynthesized(name) ? name : getSynthesizedClone(name));
    setTextRange(qualifiedName, name);
    let emitFlags: EmitFlags = 0;
    if (!allowSourceMaps) emitFlags |= EmitFlags.NoSourceMap;
    if (!allowComments) emitFlags |= EmitFlags.NoComments;
    if (emitFlags) setEmitFlags(qualifiedName, emitFlags);
    return qualifiedName;
  }

  export function convertToFunctionBody(node: ConciseBody, multiLine?: boolean): Block {
    return qn.is.kind(Block, node) ? node : setTextRange(createBlock([setTextRange(createReturn(node), node)], multiLine), node);
  }

  export function convertFunctionDeclarationToExpression(node: FunctionDeclaration) {
    if (!node.body) return fail();
    const updated = createFunctionExpression(node.modifiers, node.asteriskToken, node.name, node.typeParameters, node.parameters, node.type, node.body);
    setOriginalNode(updated, node);
    setTextRange(updated, node);
    if (getStartsOnNewLine(node)) {
      setStartsOnNewLine(updated, /*newLine*/ true);
    }
    aggregateTransformFlags(updated);
    return updated;
  }

  function isUseStrictPrologue(node: ExpressionStatement): boolean {
    return qn.is.kind(StringLiteral, node.expression) && node.expression.text === 'use strict';
  }

  export function addPrologue(target: Statement[], source: readonly Statement[], ensureUseStrict?: boolean, visitor?: (node: Node) => VisitResult<Node>): number {
    const offset = addStandardPrologue(target, source, ensureUseStrict);
    return addCustomPrologue(target, source, offset, visitor);
  }

  export function addStandardPrologue(target: Statement[], source: readonly Statement[], ensureUseStrict?: boolean): number {
    assert(target.length === 0, 'Prologue directives should be at the first statement in the target statements array');
    let foundUseStrict = false;
    let statementOffset = 0;
    const numStatements = source.length;
    while (statementOffset < numStatements) {
      const statement = source[statementOffset];
      if (qn.is.prologueDirective(statement)) {
        if (isUseStrictPrologue(statement)) {
          foundUseStrict = true;
        }
        target.push(statement);
      } else {
        break;
      }
      statementOffset++;
    }
    if (ensureUseStrict && !foundUseStrict) {
      target.push(startOnNewLine(createStatement(createLiteral('use strict'))));
    }
    return statementOffset;
  }

  export function addCustomPrologue(target: Statement[], source: readonly Statement[], statementOffset: number, visitor?: (node: Node) => VisitResult<Node>, filter?: (node: Node) => boolean): number;
  export function addCustomPrologue(
    target: Statement[],
    source: readonly Statement[],
    statementOffset: number | undefined,
    visitor?: (node: Node) => VisitResult<Node>,
    filter?: (node: Node) => boolean
  ): number | undefined;
  export function addCustomPrologue(
    target: Statement[],
    source: readonly Statement[],
    statementOffset: number | undefined,
    visitor?: (node: Node) => VisitResult<Node>,
    filter: (node: Node) => boolean = () => true
  ): number | undefined {
    const numStatements = source.length;
    while (statementOffset !== undefined && statementOffset < numStatements) {
      const statement = source[statementOffset];
      if (qn.get.emitFlags(statement) & EmitFlags.CustomPrologue && filter(statement)) {
        append(target, visitor ? visitNode(statement, visitor, isStatement) : statement);
      } else {
        break;
      }
      statementOffset++;
    }
    return statementOffset;
  }

  export function findUseStrictPrologue(statements: readonly Statement[]): Statement | undefined {
    for (const statement of statements) {
      if (qn.is.prologueDirective(statement)) {
        if (isUseStrictPrologue(statement)) {
          return statement;
        }
      } else {
        break;
      }
    }
    return;
  }

  export function startsWithUseStrict(statements: readonly Statement[]) {
    const firstStatement = firstOrUndefined(statements);
    return firstStatement !== undefined && qn.is.prologueDirective(firstStatement) && isUseStrictPrologue(firstStatement);
  }

  export function ensureUseStrict(statements: NodeArray<Statement>): NodeArray<Statement> {
    const foundUseStrict = findUseStrictPrologue(statements);

    if (!foundUseStrict) {
      return setTextRange(
        NodeArray.create<Statement>([startOnNewLine(createStatement(createLiteral('use strict'))), ...statements]),
        statements
      );
    }

    return statements;
  }

  export function parenthesizeBinaryOperand(binaryOperator: Syntax, operand: Expression, isLeftSideOfBinary: boolean, leftOperand?: Expression) {
    const skipped = skipPartiallyEmittedExpressions(operand);

    // If the resulting expression is already parenthesized, we do not need to do any further processing.
    if (skipped.kind === Syntax.ParenthesizedExpression) {
      return operand;
    }

    return binaryOperandNeedsParentheses(binaryOperator, operand, isLeftSideOfBinary, leftOperand) ? createParen(operand) : operand;
  }

  function binaryOperandNeedsParentheses(binaryOperator: Syntax, operand: Expression, isLeftSideOfBinary: boolean, leftOperand: Expression | undefined) {
    // If the operand has lower precedence, then it needs to be parenthesized to preserve the
    // intent of the expression. For example, if the operand is `a + b` and the operator is
    // `*`, then we need to parenthesize the operand to preserve the intended order of
    // operations: `(a + b) * x`.
    //
    // If the operand has higher precedence, then it does not need to be parenthesized. For
    // example, if the operand is `a * b` and the operator is `+`, then we do not need to
    // parenthesize to preserve the intended order of operations: `a * b + x`.
    //
    // If the operand has the same precedence, then we need to check the associativity of
    // the operator based on whether this is the left or right operand of the expression.
    //
    // For example, if `a / d` is on the right of operator `*`, we need to parenthesize
    // to preserve the intended order of operations: `x * (a / d)`
    //
    // If `a ** d` is on the left of operator `**`, we need to parenthesize to preserve
    // the intended order of operations: `(a ** b) ** c`
    const binaryOperatorPrecedence = qy.get.operatorPrecedence(Syntax.BinaryExpression, binaryOperator);
    const binaryOperatorAssociativity = qy.get.operatorAssociativity(Syntax.BinaryExpression, binaryOperator);
    const emittedOperand = skipPartiallyEmittedExpressions(operand);
    if (!isLeftSideOfBinary && operand.kind === Syntax.ArrowFunction && binaryOperatorPrecedence > 3) {
      // We need to parenthesize arrow functions on the right side to avoid it being
      // parsed as parenthesized expression: `a && (() => {})`
      return true;
    }
    const operandPrecedence = getExpressionPrecedence(emittedOperand);
    switch (compareValues(operandPrecedence, binaryOperatorPrecedence)) {
      case Comparison.LessThan:
        // If the operand is the right side of a right-associative binary operation
        // and is a yield expression, then we do not need parentheses.
        if (!isLeftSideOfBinary && binaryOperatorAssociativity === Associativity.Right && operand.kind === Syntax.YieldExpression) {
          return false;
        }

        return true;

      case Comparison.GreaterThan:
        return false;

      case Comparison.EqualTo:
        if (isLeftSideOfBinary) {
          // No need to parenthesize the left operand when the binary operator is
          // left associative:
          //  (a*b)/x    -> a*b/x
          //  (a**b)/x   -> a**b/x
          //
          // Parentheses are needed for the left operand when the binary operator is
          // right associative:
          //  (a/b)**x   -> (a/b)**x
          //  (a**b)**x  -> (a**b)**x
          return binaryOperatorAssociativity === Associativity.Right;
        } else {
          if (qn.is.kind(emittedOperand, BinaryExpression) && emittedOperand.operatorToken.kind === binaryOperator) {
            // No need to parenthesize the right operand when the binary operator and
            // operand are the same and one of the following:
            //  x*(a*b)     => x*a*b
            //  x|(a|b)     => x|a|b
            //  x&(a&b)     => x&a&b
            //  x^(a^b)     => x^a^b
            if (operatorHasAssociativeProperty(binaryOperator)) {
              return false;
            }

            // No need to parenthesize the right operand when the binary operator
            // is plus (+) if both the left and right operands consist solely of either
            // literals of the same kind or binary plus (+) expressions for literals of
            // the same kind (recursively).
            //  "a"+(1+2)       => "a"+(1+2)
            //  "a"+("b"+"c")   => "a"+"b"+"c"
            if (binaryOperator === Syntax.PlusToken) {
              const leftKind = leftOperand ? getLiteralKindOfBinaryPlusOperand(leftOperand) : Syntax.Unknown;
              if (qy.is.literal(leftKind) && leftKind === getLiteralKindOfBinaryPlusOperand(emittedOperand)) {
                return false;
              }
            }
          }

          // No need to parenthesize the right operand when the operand is right
          // associative:
          //  x/(a**b)    -> x/a**b
          //  x**(a**b)   -> x**a**b
          //
          // Parentheses are needed for the right operand when the operand is left
          // associative:
          //  x/(a*b)     -> x/(a*b)
          //  x**(a/b)    -> x**(a/b)
          const operandAssociativity = getExpressionAssociativity(emittedOperand);
          return operandAssociativity === Associativity.Left;
        }
    }
  }

  function operatorHasAssociativeProperty(binaryOperator: Syntax) {
    // The following operators are associative in JavaScript:
    //  (a*b)*c     -> a*(b*c)  -> a*b*c
    //  (a|b)|c     -> a|(b|c)  -> a|b|c
    //  (a&b)&c     -> a&(b&c)  -> a&b&c
    //  (a^b)^c     -> a^(b^c)  -> a^b^c
    //
    // While addition is associative in mathematics, JavaScript's `+` is not
    // guaranteed to be associative as it is overloaded with string concatenation.
    return binaryOperator === Syntax.AsteriskToken || binaryOperator === Syntax.BarToken || binaryOperator === Syntax.AmpersandToken || binaryOperator === Syntax.CaretToken;
  }

  interface BinaryPlusExpression extends BinaryExpression {
    cachedLiteralKind: Syntax;
  }

  function getLiteralKindOfBinaryPlusOperand(node: Expression): Syntax {
    node = skipPartiallyEmittedExpressions(node);

    if (qy.is.literal(node.kind)) {
      return node.kind;
    }

    if (node.kind === Syntax.BinaryExpression && (<BinaryExpression>node).operatorToken.kind === Syntax.PlusToken) {
      if ((<BinaryPlusExpression>node).cachedLiteralKind !== undefined) {
        return (<BinaryPlusExpression>node).cachedLiteralKind;
      }

      const leftKind = getLiteralKindOfBinaryPlusOperand((<BinaryExpression>node).left);
      const literalKind = qy.is.literal(leftKind) && leftKind === getLiteralKindOfBinaryPlusOperand((<BinaryExpression>node).right) ? leftKind : Syntax.Unknown;

      (<BinaryPlusExpression>node).cachedLiteralKind = literalKind;
      return literalKind;
    }

    return Syntax.Unknown;
  }

  export function parenthesizeForConditionalHead(condition: Expression) {
    const conditionalPrecedence = qy.get.operatorPrecedence(Syntax.ConditionalExpression, Syntax.QuestionToken);
    const emittedCondition = skipPartiallyEmittedExpressions(condition);
    const conditionPrecedence = getExpressionPrecedence(emittedCondition);
    if (compareValues(conditionPrecedence, conditionalPrecedence) !== Comparison.GreaterThan) {
      return createParen(condition);
    }
    return condition;
  }

  export function parenthesizeSubexpressionOfConditionalExpression(e: Expression): Expression {
    // per ES grammar both 'whenTrue' and 'whenFalse' parts of conditional expression are assignment expressions
    // so in case when comma expression is introduced as a part of previous transformations
    // if should be wrapped in parens since comma operator has the lowest precedence
    const emittedExpression = skipPartiallyEmittedExpressions(e);
    return isCommaSequence(emittedExpression) ? createParen(e) : e;
  }

  export function parenthesizeDefaultExpression(e: Expression) {
    const check = skipPartiallyEmittedExpressions(e);
    let needsParens = isCommaSequence(check);
    if (!needsParens) {
      switch (getLeftmostExpression(check, /*stopAtCallExpression*/ false).kind) {
        case Syntax.ClassExpression:
        case Syntax.FunctionExpression:
          needsParens = true;
      }
    }
    return needsParens ? createParen(e) : e;
  }

  export function parenthesizeForNew(expression: Expression): LeftHandSideExpression {
    const leftmostExpr = getLeftmostExpression(expression, /*stopAtCallExpressions*/ true);
    switch (leftmostExpr.kind) {
      case Syntax.CallExpression:
        return createParen(expression);

      case Syntax.NewExpression:
        return !(leftmostExpr as NewExpression).arguments ? createParen(expression) : <LeftHandSideExpression>expression;
    }

    return parenthesizeForAccess(expression);
  }

  export function parenthesizeForAccess(expression: Expression): LeftHandSideExpression {
    // isLeftHandSideExpression is almost the correct criterion for when it is not necessary
    // to parenthesize the expression before a dot. The known exception is:
    //
    //    NewExpression:
    //       new C.x        -> not the same as (new C).x
    //
    const emittedExpression = skipPartiallyEmittedExpressions(expression);
    if (qn.is.leftHandSideExpression(emittedExpression) && (emittedExpression.kind !== Syntax.NewExpression || (<NewExpression>emittedExpression).arguments)) {
      return <LeftHandSideExpression>expression;
    }

    return setTextRange(createParen(expression), expression);
  }

  export function parenthesizePostfixOperand(operand: Expression) {
    return qn.is.leftHandSideExpression(operand) ? operand : setTextRange(createParen(operand), operand);
  }

  export function parenthesizePrefixOperand(operand: Expression) {
    return qn.is.unaryExpression(operand) ? operand : setTextRange(createParen(operand), operand);
  }

  export function parenthesizeListElements(elements: NodeArray<Expression>) {
    let result: Expression[] | undefined;
    for (let i = 0; i < elements.length; i++) {
      const element = parenthesizeExpressionForList(elements[i]);
      if (result !== undefined || element !== elements[i]) {
        if (result === undefined) {
          result = elements.slice(0, i);
        }

        result.push(element);
      }
    }

    if (result !== undefined) {
      return setTextRange(NodeArray.create(result, elements.trailingComma), elements);
    }

    return elements;
  }

  export function parenthesizeExpressionForList(expression: Expression) {
    const emittedExpression = skipPartiallyEmittedExpressions(expression);
    const expressionPrecedence = getExpressionPrecedence(emittedExpression);
    const commaPrecedence = qy.get.operatorPrecedence(Syntax.BinaryExpression, Syntax.CommaToken);
    return expressionPrecedence > commaPrecedence ? expression : setTextRange(createParen(expression), expression);
  }

  export function parenthesizeExpressionForExpressionStatement(expression: Expression) {
    const emittedExpression = skipPartiallyEmittedExpressions(expression);
    if (qn.is.kind(CallExpression, emittedExpression)) {
      const callee = emittedExpression.expression;
      const kind = skipPartiallyEmittedExpressions(callee).kind;
      if (kind === Syntax.FunctionExpression || kind === Syntax.ArrowFunction) {
        const mutableCall = getMutableClone(emittedExpression);
        mutableCall.expression = setTextRange(createParen(callee), callee);
        return recreateOuterExpressions(expression, mutableCall, OuterExpressionKinds.PartiallyEmittedExpressions);
      }
    }

    const leftmostExpressionKind = getLeftmostExpression(emittedExpression, /*stopAtCallExpressions*/ false).kind;
    if (leftmostExpressionKind === Syntax.ObjectLiteralExpression || leftmostExpressionKind === Syntax.FunctionExpression) {
      return setTextRange(createParen(expression), expression);
    }

    return expression;
  }

  export function parenthesizeConditionalTypeMember(member: TypeNode) {
    return member.kind === Syntax.ConditionalType ? ParenthesizedTypeNode.create(member) : member;
  }

  export function parenthesizeElementTypeMember(member: TypeNode) {
    switch (member.kind) {
      case Syntax.UnionType:
      case Syntax.IntersectionType:
      case Syntax.FunctionType:
      case Syntax.ConstructorType:
        return ParenthesizedTypeNode.create(member);
    }
    return parenthesizeConditionalTypeMember(member);
  }

  export function parenthesizeArrayTypeMember(member: TypeNode) {
    switch (member.kind) {
      case Syntax.TypeQuery:
      case Syntax.TypeOperator:
      case Syntax.InferType:
        return ParenthesizedTypeNode.create(member);
    }
    return parenthesizeElementTypeMember(member);
  }

  export function parenthesizeElementTypeMembers(members: readonly TypeNode[]) {
    return NodeArray.create(sameMap(members, parenthesizeElementTypeMember));
  }

  export function parenthesizeTypeParameters(typeParameters: readonly TypeNode[] | undefined) {
    if (some(typeParameters)) {
      const params: TypeNode[] = [];
      for (let i = 0; i < typeParameters.length; ++i) {
        const entry = typeParameters[i];
        params.push(i === 0 && qn.is.functionOrConstructorTypeNode(entry) && entry.typeParameters ? ParenthesizedTypeNode.create(entry) : entry);
      }

      return NodeArray.create(params);
    }
    return;
  }

  export function getLeftmostExpression(node: Expression, stopAtCallExpressions: boolean) {
    while (true) {
      switch (node.kind) {
        case Syntax.PostfixUnaryExpression:
          node = (<PostfixUnaryExpression>node).operand;
          continue;

        case Syntax.BinaryExpression:
          node = (<BinaryExpression>node).left;
          continue;

        case Syntax.ConditionalExpression:
          node = (<ConditionalExpression>node).condition;
          continue;

        case Syntax.TaggedTemplateExpression:
          node = (<TaggedTemplateExpression>node).tag;
          continue;

        case Syntax.CallExpression:
          if (stopAtCallExpressions) {
            return node;
          }
        // falls through
        case Syntax.AsExpression:
        case Syntax.ElementAccessExpression:
        case Syntax.PropertyAccessExpression:
        case Syntax.NonNullExpression:
        case Syntax.PartiallyEmittedExpression:
          node = (<CallExpression | PropertyAccessExpression | ElementAccessExpression | AsExpression | NonNullExpression | PartiallyEmittedExpression>node).expression;
          continue;
      }

      return node;
    }
  }

  export function parenthesizeConciseBody(body: ConciseBody): ConciseBody {
    if (!qn.is.kind(Block, body) && (isCommaSequence(body) || getLeftmostExpression(body, /*stopAtCallExpressions*/ false).kind === Syntax.ObjectLiteralExpression)) {
      return setTextRange(createParen(body), body);
    }

    return body;
  }

  export function isCommaSequence(node: Expression): node is (BinaryExpression & { operatorToken: Token<Syntax.CommaToken> }) | CommaListExpression {
    return (node.kind === Syntax.BinaryExpression && (<BinaryExpression>node).operatorToken.kind === Syntax.CommaToken) || node.kind === Syntax.CommaListExpression;
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

  export function isOuterExpression(node: Node, kinds = OuterExpressionKinds.All): node is OuterExpression {
    switch (node.kind) {
      case Syntax.ParenthesizedExpression:
        return (kinds & OuterExpressionKinds.Parentheses) !== 0;
      case Syntax.TypeAssertionExpression:
      case Syntax.AsExpression:
        return (kinds & OuterExpressionKinds.TypeAssertions) !== 0;
      case Syntax.NonNullExpression:
        return (kinds & OuterExpressionKinds.NonNullAssertions) !== 0;
      case Syntax.PartiallyEmittedExpression:
        return (kinds & OuterExpressionKinds.PartiallyEmittedExpressions) !== 0;
    }
    return false;
  }

  export function skipOuterExpressions(node: Expression, kinds?: OuterExpressionKinds): Expression;
  export function skipOuterExpressions(node: Node, kinds?: OuterExpressionKinds): Node;
  export function skipOuterExpressions(node: Node, kinds = OuterExpressionKinds.All) {
    while (isOuterExpression(node, kinds)) {
      node = node.expression;
    }
    return node;
  }

  export function skipAssertions(node: Expression): Expression;
  export function skipAssertions(node: Node): Node;
  export function skipAssertions(node: Node): Node {
    return skipOuterExpressions(node, OuterExpressionKinds.Assertions);
  }

  function updateOuterExpression(outerExpression: OuterExpression, expression: Expression) {
    switch (outerExpression.kind) {
      case Syntax.ParenthesizedExpression:
        return updateParen(outerExpression, expression);
      case Syntax.TypeAssertionExpression:
        return updateTypeAssertion(outerExpression, outerExpression.type, expression);
      case Syntax.AsExpression:
        return updateAsExpression(outerExpression, expression, outerExpression.type);
      case Syntax.NonNullExpression:
        return updateNonNullExpression(outerExpression, expression);
      case Syntax.PartiallyEmittedExpression:
        return updatePartiallyEmittedExpression(outerExpression, expression);
    }
  }

  function isIgnorableParen(node: Expression) {
    return (
      node.kind === Syntax.ParenthesizedExpression &&
      isSynthesized(node) &&
      isSynthesized(getSourceMapRange(node)) &&
      isSynthesized(getCommentRange(node)) &&
      !some(getSyntheticLeadingComments(node)) &&
      !some(getSyntheticTrailingComments(node))
    );
  }

  export function recreateOuterExpressions(outerExpression: Expression | undefined, innerExpression: Expression, kinds = OuterExpressionKinds.All): Expression {
    if (outerExpression && isOuterExpression(outerExpression, kinds) && !isIgnorableParen(outerExpression)) {
      return updateOuterExpression(outerExpression, recreateOuterExpressions(outerExpression.expression, innerExpression));
    }
    return innerExpression;
  }

  export function startOnNewLine<T extends Node>(node: T): T {
    return setStartsOnNewLine(node, /*newLine*/ true);
  }

  export function getExternalHelpersModuleName(node: SourceFile) {
    const parseNode = qn.get.originalOf(node, isSourceFile);
    const emitNode = parseNode && parseNode.emitNode;
    return emitNode && emitNode.externalHelpersModuleName;
  }

  export function hasRecordedExternalHelpers(sourceFile: SourceFile) {
    const parseNode = qn.get.originalOf(sourceFile, isSourceFile);
    const emitNode = parseNode && parseNode.emitNode;
    return !!emitNode && (!!emitNode.externalHelpersModuleName || !!emitNode.externalHelpers);
  }

  export function createExternalHelpersImportDeclarationIfNeeded(
    sourceFile: SourceFile,
    compilerOptions: CompilerOptions,
    hasExportStarsToExportValues?: boolean,
    hasImportStar?: boolean,
    hasImportDefault?: boolean
  ) {
    if (compilerOptions.importHelpers && isEffectiveExternalModule(sourceFile, compilerOptions)) {
      let namedBindings: NamedImportBindings | undefined;
      const moduleKind = getEmitModuleKind(compilerOptions);
      if (moduleKind >= ModuleKind.ES2015 && moduleKind <= ModuleKind.ESNext) {
        // use named imports
        const helpers = getEmitHelpers(sourceFile);
        if (helpers) {
          const helperNames: string[] = [];
          for (const helper of helpers) {
            if (!helper.scoped) {
              const importName = (helper as UnscopedEmitHelper).importName;
              if (importName) {
                pushIfUnique(helperNames, importName);
              }
            }
          }
          if (some(helperNames)) {
            helperNames.sort(compareStringsCaseSensitive);
            // Alias the imports if the names are used somewhere in the file.
            // NOTE: We don't need to care about global import collisions as this is a module.
            namedBindings = createNamedImports(
              map(helperNames, (name) =>
                isFileLevelUniqueName(sourceFile, name)
                  ? createImportSpecifier(/*propertyName*/ undefined, createIdentifier(name))
                  : createImportSpecifier(createIdentifier(name), getUnscopedHelperName(name))
              )
            );
            const parseNode = qn.get.originalOf(sourceFile, isSourceFile);
            const emitNode = getOrCreateEmitNode(parseNode);
            emitNode.externalHelpers = true;
          }
        }
      } else {
        // use a namespace import
        const externalHelpersModuleName = getOrCreateExternalHelpersModuleNameIfNeeded(sourceFile, compilerOptions, hasExportStarsToExportValues, hasImportStar || hasImportDefault);
        if (externalHelpersModuleName) {
          namedBindings = createNamespaceImport(externalHelpersModuleName);
        }
      }
      if (namedBindings) {
        const externalHelpersImportDeclaration = createImportDeclaration(
          /*decorators*/ undefined,
          /*modifiers*/ undefined,
          createImportClause(/*name*/ undefined, namedBindings),
          createLiteral(externalHelpersModuleNameText)
        );
        addEmitFlags(externalHelpersImportDeclaration, EmitFlags.NeverApplyImportHelper);
        return externalHelpersImportDeclaration;
      }
    }
    return;
  }

  export function getOrCreateExternalHelpersModuleNameIfNeeded(node: SourceFile, compilerOptions: CompilerOptions, hasExportStarsToExportValues?: boolean, hasImportStarOrImportDefault?: boolean) {
    if (compilerOptions.importHelpers && isEffectiveExternalModule(node, compilerOptions)) {
      const externalHelpersModuleName = getExternalHelpersModuleName(node);
      if (externalHelpersModuleName) {
        return externalHelpersModuleName;
      }

      const moduleKind = getEmitModuleKind(compilerOptions);
      let create = (hasExportStarsToExportValues || (compilerOptions.esModuleInterop && hasImportStarOrImportDefault)) && moduleKind !== ModuleKind.System && moduleKind < ModuleKind.ES2015;
      if (!create) {
        const helpers = getEmitHelpers(node);
        if (helpers) {
          for (const helper of helpers) {
            if (!helper.scoped) {
              create = true;
              break;
            }
          }
        }
      }

      if (create) {
        const parseNode = qn.get.originalOf(node, isSourceFile);
        const emitNode = getOrCreateEmitNode(parseNode);
        return emitNode.externalHelpersModuleName || (emitNode.externalHelpersModuleName = createUniqueName(externalHelpersModuleNameText));
      }
    }
    return;
  }

  export function getLocalNameForExternalImport(node: ImportDeclaration | ExportDeclaration | ImportEqualsDeclaration, sourceFile: SourceFile): Identifier | undefined {
    const namespaceDeclaration = getNamespaceDeclarationNode(node);
    if (namespaceDeclaration && !isDefaultImport(node)) {
      const name = namespaceDeclaration.name;
      return qn.is.generatedIdentifier(name) ? name : createIdentifier(getSourceTextOfNodeFromSourceFile(sourceFile, name) || idText(name));
    }
    if (node.kind === Syntax.ImportDeclaration && node.importClause) {
      return getGeneratedNameForNode(node);
    }
    if (node.kind === Syntax.ExportDeclaration && node.moduleSpecifier) {
      return getGeneratedNameForNode(node);
    }
    return;
  }

  export function getExternalModuleNameLiteral(
    importNode: ImportDeclaration | ExportDeclaration | ImportEqualsDeclaration,
    sourceFile: SourceFile,
    host: EmitHost,
    resolver: EmitResolver,
    compilerOptions: CompilerOptions
  ) {
    const moduleName = getExternalModuleName(importNode)!; // TODO: GH#18217
    if (moduleName.kind === Syntax.StringLiteral) {
      return (
        tryGetModuleNameFromDeclaration(importNode, host, resolver, compilerOptions) || tryRenameExternalModule(<StringLiteral>moduleName, sourceFile) || getSynthesizedClone(<StringLiteral>moduleName)
      );
    }

    return;
  }

  function tryRenameExternalModule(moduleName: LiteralExpression, sourceFile: SourceFile) {
    const rename = sourceFile.renamedDependencies && sourceFile.renamedDependencies.get(moduleName.text);
    return rename && createLiteral(rename);
  }

  export function tryGetModuleNameFromFile(file: SourceFile | undefined, host: EmitHost, options: CompilerOptions): StringLiteral | undefined {
    if (!file) {
      return;
    }
    if (file.moduleName) {
      return createLiteral(file.moduleName);
    }
    if (!file.isDeclarationFile && (options.out || options.outFile)) {
      return createLiteral(getExternalModuleNameFromPath(host, file.fileName));
    }
    return;
  }

  function tryGetModuleNameFromDeclaration(declaration: ImportEqualsDeclaration | ImportDeclaration | ExportDeclaration, host: EmitHost, resolver: EmitResolver, compilerOptions: CompilerOptions) {
    return tryGetModuleNameFromFile(resolver.getExternalModuleFileFromDeclaration(declaration), host, compilerOptions);
  }

  export function getInitializerOfBindingOrAssignmentElement(bindingElement: BindingOrAssignmentElement): Expression | undefined {
    if (isDeclarationBindingElement(bindingElement)) {
      // `1` in `let { a = 1 } = ...`
      // `1` in `let { a: b = 1 } = ...`
      // `1` in `let { a: {b} = 1 } = ...`
      // `1` in `let { a: [b] = 1 } = ...`
      // `1` in `let [a = 1] = ...`
      // `1` in `let [{a} = 1] = ...`
      // `1` in `let [[a] = 1] = ...`
      return bindingElement.initializer;
    }

    if (qn.is.kind(PropertyAssignment, bindingElement)) {
      // `1` in `({ a: b = 1 } = ...)`
      // `1` in `({ a: {b} = 1 } = ...)`
      // `1` in `({ a: [b] = 1 } = ...)`
      const initializer = bindingElement.initializer;
      return isAssignmentExpression(initializer, /*excludeCompoundAssignment*/ true) ? initializer.right : undefined;
    }

    if (qn.is.kind(ShorthandPropertyAssignment, bindingElement)) {
      // `1` in `({ a = 1 } = ...)`
      return bindingElement.objectAssignmentInitializer;
    }

    if (isAssignmentExpression(bindingElement, /*excludeCompoundAssignment*/ true)) {
      // `1` in `[a = 1] = ...`
      // `1` in `[{a} = 1] = ...`
      // `1` in `[[a] = 1] = ...`
      return bindingElement.right;
    }

    if (qn.is.kind(SpreadElement, bindingElement)) {
      // Recovery consistent with existing emit.
      return getInitializerOfBindingOrAssignmentElement(<BindingOrAssignmentElement>bindingElement.expression);
    }
    return;
  }

  export function getTargetOfBindingOrAssignmentElement(bindingElement: BindingOrAssignmentElement): BindingOrAssignmentElementTarget | undefined {
    if (isDeclarationBindingElement(bindingElement)) {
      // `a` in `let { a } = ...`
      // `a` in `let { a = 1 } = ...`
      // `b` in `let { a: b } = ...`
      // `b` in `let { a: b = 1 } = ...`
      // `a` in `let { ...a } = ...`
      // `{b}` in `let { a: {b} } = ...`
      // `{b}` in `let { a: {b} = 1 } = ...`
      // `[b]` in `let { a: [b] } = ...`
      // `[b]` in `let { a: [b] = 1 } = ...`
      // `a` in `let [a] = ...`
      // `a` in `let [a = 1] = ...`
      // `a` in `let [...a] = ...`
      // `{a}` in `let [{a}] = ...`
      // `{a}` in `let [{a} = 1] = ...`
      // `[a]` in `let [[a]] = ...`
      // `[a]` in `let [[a] = 1] = ...`
      return bindingElement.name;
    }

    if (qn.is.objectLiteralElementLike(bindingElement)) {
      switch (bindingElement.kind) {
        case Syntax.PropertyAssignment:
          // `b` in `({ a: b } = ...)`
          // `b` in `({ a: b = 1 } = ...)`
          // `{b}` in `({ a: {b} } = ...)`
          // `{b}` in `({ a: {b} = 1 } = ...)`
          // `[b]` in `({ a: [b] } = ...)`
          // `[b]` in `({ a: [b] = 1 } = ...)`
          // `b.c` in `({ a: b.c } = ...)`
          // `b.c` in `({ a: b.c = 1 } = ...)`
          // `b[0]` in `({ a: b[0] } = ...)`
          // `b[0]` in `({ a: b[0] = 1 } = ...)`
          return getTargetOfBindingOrAssignmentElement(<BindingOrAssignmentElement>bindingElement.initializer);

        case Syntax.ShorthandPropertyAssignment:
          // `a` in `({ a } = ...)`
          // `a` in `({ a = 1 } = ...)`
          return bindingElement.name;

        case Syntax.SpreadAssignment:
          // `a` in `({ ...a } = ...)`
          return getTargetOfBindingOrAssignmentElement(<BindingOrAssignmentElement>bindingElement.expression);
      }

      // no target
      return;
    }

    if (isAssignmentExpression(bindingElement, /*excludeCompoundAssignment*/ true)) {
      // `a` in `[a = 1] = ...`
      // `{a}` in `[{a} = 1] = ...`
      // `[a]` in `[[a] = 1] = ...`
      // `a.b` in `[a.b = 1] = ...`
      // `a[0]` in `[a[0] = 1] = ...`
      return getTargetOfBindingOrAssignmentElement(<BindingOrAssignmentElement>bindingElement.left);
    }

    if (qn.is.kind(SpreadElement, bindingElement)) {
      // `a` in `[...a] = ...`
      return getTargetOfBindingOrAssignmentElement(<BindingOrAssignmentElement>bindingElement.expression);
    }

    // `a` in `[a] = ...`
    // `{a}` in `[{a}] = ...`
    // `[a]` in `[[a]] = ...`
    // `a.b` in `[a.b] = ...`
    // `a[0]` in `[a[0]] = ...`
    return bindingElement;
  }

  export function getRestIndicatorOfBindingOrAssignmentElement(bindingElement: BindingOrAssignmentElement): BindingOrAssignmentElementRestIndicator | undefined {
    switch (bindingElement.kind) {
      case Syntax.Parameter:
      case Syntax.BindingElement:
        // `...` in `let [...a] = ...`
        return bindingElement.dot3Token;

      case Syntax.SpreadElement:
      case Syntax.SpreadAssignment:
        // `...` in `[...a] = ...`
        return bindingElement;
    }

    return;
  }

  export function getPropertyNameOfBindingOrAssignmentElement(bindingElement: BindingOrAssignmentElement): Exclude<PropertyName, PrivateIdentifier> | undefined {
    const propertyName = tryGetPropertyNameOfBindingOrAssignmentElement(bindingElement);
    assert(!!propertyName || qn.is.kind(SpreadAssignment, bindingElement), 'Invalid property name for binding element.');
    return propertyName;
  }

  export function tryGetPropertyNameOfBindingOrAssignmentElement(bindingElement: BindingOrAssignmentElement): Exclude<PropertyName, PrivateIdentifier> | undefined {
    switch (bindingElement.kind) {
      case Syntax.BindingElement:
        // `a` in `let { a: b } = ...`
        // `[a]` in `let { [a]: b } = ...`
        // `"a"` in `let { "a": b } = ...`
        // `1` in `let { 1: b } = ...`
        if (bindingElement.propertyName) {
          const propertyName = bindingElement.propertyName;
          if (qn.is.kind(PrivateIdentifier, propertyName)) {
            return Debug.failBadSyntax(propertyName);
          }
          return qn.is.kind(ComputedPropertyName, propertyName) && isStringOrNumericLiteral(propertyName.expression) ? propertyName.expression : propertyName;
        }

        break;

      case Syntax.PropertyAssignment:
        // `a` in `({ a: b } = ...)`
        // `[a]` in `({ [a]: b } = ...)`
        // `"a"` in `({ "a": b } = ...)`
        // `1` in `({ 1: b } = ...)`
        if (bindingElement.name) {
          const propertyName = bindingElement.name;
          if (qn.is.kind(PrivateIdentifier, propertyName)) {
            return Debug.failBadSyntax(propertyName);
          }
          return qn.is.kind(ComputedPropertyName, propertyName) && isStringOrNumericLiteral(propertyName.expression) ? propertyName.expression : propertyName;
        }

        break;

      case Syntax.SpreadAssignment:
        // `a` in `({ ...a } = ...)`
        if (bindingElement.name && qn.is.kind(PrivateIdentifier, bindingElement.name)) {
          return Debug.failBadSyntax(bindingElement.name);
        }
        return bindingElement.name;
    }

    const target = getTargetOfBindingOrAssignmentElement(bindingElement);
    if (target && qn.is.propertyName(target)) {
      return target;
    }
    return;
  }

  function isStringOrNumericLiteral(node: Node): node is StringLiteral | NumericLiteral {
    const kind = node.kind;
    return kind === Syntax.StringLiteral || kind === Syntax.NumericLiteral;
  }

  export function getElementsOfBindingOrAssignmentPattern(name: BindingOrAssignmentPattern): readonly BindingOrAssignmentElement[] {
    switch (name.kind) {
      case Syntax.ObjectBindingPattern:
      case Syntax.ArrayBindingPattern:
      case Syntax.ArrayLiteralExpression:
        // `a` in `{a}`
        // `a` in `[a]`
        return <readonly BindingOrAssignmentElement[]>name.elements;

      case Syntax.ObjectLiteralExpression:
        // `a` in `{a}`
        return <readonly BindingOrAssignmentElement[]>name.properties;
    }
  }

  export function convertToArrayAssignmentElement(element: BindingOrAssignmentElement) {
    if (qn.is.kind(BindingElement, element)) {
      if (element.dot3Token) {
        Debug.assertNode(element.name, isIdentifier);
        return setOriginalNode(setTextRange(createSpread(element.name), element), element);
      }
      const expression = convertToAssignmentElementTarget(element.name);
      return element.initializer ? setOriginalNode(setTextRange(createAssignment(expression, element.initializer), element), element) : expression;
    }
    Debug.assertNode(element, isExpression);
    return <Expression>element;
  }

  export function convertToObjectAssignmentElement(element: BindingOrAssignmentElement) {
    if (qn.is.kind(BindingElement, element)) {
      if (element.dot3Token) {
        Debug.assertNode(element.name, isIdentifier);
        return setOriginalNode(setTextRange(createSpreadAssignment(element.name), element), element);
      }
      if (element.propertyName) {
        const expression = convertToAssignmentElementTarget(element.name);
        return setOriginalNode(setTextRange(createPropertyAssignment(element.propertyName, element.initializer ? createAssignment(expression, element.initializer) : expression), element), element);
      }
      Debug.assertNode(element.name, isIdentifier);
      return setOriginalNode(setTextRange(createShorthandPropertyAssignment(element.name, element.initializer), element), element);
    }
    Debug.assertNode(element, isObjectLiteralElementLike);
    return <ObjectLiteralElementLike>element;
  }

  export function convertToAssignmentPattern(node: BindingOrAssignmentPattern): AssignmentPattern {
    switch (node.kind) {
      case Syntax.ArrayBindingPattern:
      case Syntax.ArrayLiteralExpression:
        return convertToArrayAssignmentPattern(node);

      case Syntax.ObjectBindingPattern:
      case Syntax.ObjectLiteralExpression:
        return convertToObjectAssignmentPattern(node);
    }
  }

  export function convertToObjectAssignmentPattern(node: ObjectBindingOrAssignmentPattern) {
    if (qn.is.kind(ObjectBindingPattern, node)) {
      return setOriginalNode(setTextRange(createObjectLiteral(map(node.elements, convertToObjectAssignmentElement)), node), node);
    }
    Debug.assertNode(node, isObjectLiteralExpression);
    return node;
  }

  export function convertToArrayAssignmentPattern(node: ArrayBindingOrAssignmentPattern) {
    if (qn.is.kind(ArrayBindingPattern, node)) {
      return setOriginalNode(setTextRange(createArrayLiteral(map(node.elements, convertToArrayAssignmentElement)), node), node);
    }
    Debug.assertNode(node, isArrayLiteralExpression);
    return node;
  }

  export function convertToAssignmentElementTarget(node: BindingOrAssignmentElementTarget): Expression {
    if (qn.is.kind(BindingPattern, node)) {
      return convertToAssignmentPattern(node);
    }

    Debug.assertNode(node, isExpression);
    return node;
  }
}
