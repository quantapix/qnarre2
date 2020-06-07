namespace qnr {
  export function asName<T extends Identifier | BindingName | PropertyName | EntityName | ThisTypeNode | undefined>(n: string | T): T | Identifier {
    return isString(n) ? createIdentifier(n) : n;
  }

  export function asExpression<T extends Expression | undefined>(e: string | number | boolean | T): T | StringLiteral | NumericLiteral | BooleanLiteral {
    return typeof e === 'string' ? StringLiteral.create(e) : typeof e === 'number' ? NumericLiteral.create('' + e) : typeof e === 'boolean' ? (e ? createTrue() : createFalse()) : e;
  }

  export function asNodeArray<T extends Node>(a: readonly T[]): NodeArray<T>;
  export function asNodeArray<T extends Node>(a: readonly T[] | undefined): NodeArray<T> | undefined;
  export function asNodeArray<T extends Node>(a: readonly T[] | undefined): NodeArray<T> | undefined {
    return a ? createNodeArray(a) : undefined;
  }

  export function asToken<TKind extends SyntaxKind>(t: TKind | Token<TKind>): Token<TKind> {
    return typeof t === 'number' ? createToken(t) : t;
  }

  export function asEmbeddedStatement<T extends Node>(statement: T): T | EmptyStatement;
  export function asEmbeddedStatement<T extends Node>(statement: T | undefined): T | EmptyStatement | undefined;
  export function asEmbeddedStatement<T extends Node>(statement: T | undefined): T | EmptyStatement | undefined {
    return statement && isNotEmittedStatement(statement) ? setTextRange(setOriginalNode(createEmptyStatement(), statement), statement) : statement;
  }

  export namespace Node {
    export function createSynthesized(k: SyntaxKind): Node {
      const n = createNode(k, -1, -1);
      n.flags |= NodeFlags.Synthesized;
      return n;
    }
    export function createTemplateLiteralLike(k: TemplateLiteralToken['kind'], t: string, raw: string | undefined) {
      const n = createSynthesized(k) as TemplateLiteralLikeNode;
      n.text = t;
      if (raw === undefined || t === raw) n.rawText = raw;
      else {
        const c = getCookedText(k, raw);
        if (typeof c === 'object') return fail('Invalid raw text');
        assert(t === c, "Expected argument 'text' to be the normalized (i.e. 'cooked') version of argument 'rawText'.");
        n.rawText = raw;
      }
      return n;
    }
  }

  export interface NumericLiteral extends LiteralExpression, Declaration {
    kind: SyntaxKind.NumericLiteral;
    numericLiteralFlags: TokenFlags;
  }
  export namespace NumericLiteral {
    export function create(t: string, fs: TokenFlags = TokenFlags.None) {
      const n = Node.createSynthesized(SyntaxKind.NumericLiteral) as NumericLiteral;
      n.text = t;
      n.numericLiteralFlags = fs;
      return n;
    }
    export function kind(n: Node): n is NumericLiteral {
      return n.kind === SyntaxKind.NumericLiteral;
    }
    export function name(name: string | __String) {
      return (+name).toString() === name;
    }
  }

  export interface BigIntLiteral extends LiteralExpression {
    kind: SyntaxKind.BigIntLiteral;
  }
  export namespace BigIntLiteral {
    export function create(t: string) {
      const n = Node.createSynthesized(SyntaxKind.BigIntLiteral) as BigIntLiteral;
      n.text = t;
      return n;
    }
    export function kind(n: Node): n is BigIntLiteral {
      return n.kind === SyntaxKind.BigIntLiteral;
    }
    export function expression(e: Expression) {
      return (
        e.kind === SyntaxKind.BigIntLiteral ||
        (e.kind === SyntaxKind.PrefixUnaryExpression && (e as PrefixUnaryExpression).operator === SyntaxKind.MinusToken && (e as PrefixUnaryExpression).operand.kind === SyntaxKind.BigIntLiteral)
      );
    }
  }

  export interface StringLiteral extends LiteralExpression, Declaration {
    kind: SyntaxKind.StringLiteral;
    textSourceNode?: Identifier | StringLiteralLike | NumericLiteral;
    singleQuote?: boolean;
  }
  export namespace StringLiteral {
    export function create(t: string) {
      const n = Node.createSynthesized(SyntaxKind.StringLiteral) as StringLiteral;
      n.text = t;
      return n;
    }
    export function kind(n: Node): n is StringLiteral {
      return n.kind === SyntaxKind.StringLiteral;
    }
    export function like(n: Node): n is StringLiteralLike {
      return n.kind === SyntaxKind.StringLiteral || n.kind === SyntaxKind.NoSubstitutionTemplateLiteral;
    }
    export function orNumericLiteralLike(n: Node): n is StringLiteralLike | NumericLiteral {
      return like(n) || NumericLiteral.kind(n);
    }
    export function orJsxExpressionKind(n: Node): n is StringLiteral | JsxExpression {
      const k = n.kind;
      return k === SyntaxKind.StringLiteral || k === SyntaxKind.JsxExpression;
    }
    export function orNumberLiteralExpression(e: Expression) {
      return (
        orNumericLiteralLike(e) ||
        (e.kind === SyntaxKind.PrefixUnaryExpression && (e as PrefixUnaryExpression).operator === SyntaxKind.MinusToken && (e as PrefixUnaryExpression).operand.kind === SyntaxKind.NumericLiteral)
      );
    }
  }

  export interface JsxText extends LiteralLikeNode {
    kind: SyntaxKind.JsxText;
    onlyTriviaWhitespaces: boolean;
    parent: JsxElement;
  }
  export namespace JsxText {
    export function create(t: string, onlyTriviaWhitespaces?: boolean) {
      const n = Node.createSynthesized(SyntaxKind.JsxText) as JsxText;
      n.text = t;
      n.onlyTriviaWhitespaces = !!onlyTriviaWhitespaces;
      return n;
    }
    export function kind(n: Node): n is JsxText {
      return n.kind === SyntaxKind.JsxText;
    }
  }

  export interface RegularExpressionLiteral extends LiteralExpression {
    kind: SyntaxKind.RegularExpressionLiteral;
  }
  export namespace RegularExpressionLiteral {
    export function create(t: string) {
      const n = Node.createSynthesized(SyntaxKind.RegularExpressionLiteral) as RegularExpressionLiteral;
      n.text = t;
      return n;
    }
    export function kind(n: Node): n is RegularExpressionLiteral {
      return n.kind === SyntaxKind.RegularExpressionLiteral;
    }
  }

  export interface NoSubstitutionTemplateLiteral extends LiteralExpression, TemplateLiteralLikeNode, Declaration {
    kind: SyntaxKind.NoSubstitutionTemplateLiteral;
    templateFlags?: TokenFlags;
  }
  export namespace NoSubstitutionTemplateLiteral {
    export function create(t: string, raw?: string) {
      return Node.createTemplateLiteralLike(SyntaxKind.NoSubstitutionTemplateLiteral, t, raw) as NoSubstitutionTemplateLiteral;
    }
    export function kind(n: Node): n is NoSubstitutionTemplateLiteral {
      return n.kind === SyntaxKind.NoSubstitutionTemplateLiteral;
    }
  }

  export interface TemplateHead extends TemplateLiteralLikeNode {
    kind: SyntaxKind.TemplateHead;
    parent: TemplateExpression;
    templateFlags?: TokenFlags;
  }
  export namespace TemplateHead {
    export function create(t: string, raw?: string) {
      return Node.createTemplateLiteralLike(SyntaxKind.TemplateHead, t, raw) as TemplateHead;
    }
    export function kind(n: Node): n is TemplateHead {
      return n.kind === SyntaxKind.TemplateHead;
    }
  }

  export interface TemplateMiddle extends TemplateLiteralLikeNode {
    kind: SyntaxKind.TemplateMiddle;
    parent: TemplateSpan;
    templateFlags?: TokenFlags;
  }
  export namespace TemplateMiddle {
    export function create(t: string, raw?: string) {
      return Node.createTemplateLiteralLike(SyntaxKind.TemplateMiddle, t, raw) as TemplateMiddle;
    }
    export function kind(n: Node): n is TemplateMiddle {
      return n.kind === SyntaxKind.TemplateMiddle;
    }
    export function orTemplateTailKind(n: Node): n is TemplateMiddle | TemplateTail {
      const k = n.kind;
      return k === SyntaxKind.TemplateMiddle || k === SyntaxKind.TemplateTail;
    }
  }

  export interface TemplateTail extends TemplateLiteralLikeNode {
    kind: SyntaxKind.TemplateTail;
    parent: TemplateSpan;
    templateFlags?: TokenFlags;
  }
  export namespace TemplateTail {
    export function create(t: string, raw?: string) {
      return Node.createTemplateLiteralLike(SyntaxKind.TemplateTail, t, raw) as TemplateTail;
    }
    export function kind(n: Node): n is TemplateTail {
      return n.kind === SyntaxKind.TemplateTail;
    }
  }

  export interface QualifiedName extends Node {
    kind: SyntaxKind.QualifiedName;
    left: EntityName;
    right: Identifier;
    jsdocDotPos?: number;
  }
  export namespace QualifiedName {
    export function create(left: EntityName, right: string | Identifier) {
      const n = Node.createSynthesized(SyntaxKind.QualifiedName) as QualifiedName;
      n.left = left;
      n.right = asName(right);
      return n;
    }
    export function kind(n: Node): n is QualifiedName {
      return n.kind === SyntaxKind.QualifiedName;
    }
    export function update(n: QualifiedName, left: EntityName, right: Identifier) {
      return n.left !== left || n.right !== right ? updateNode(create(left, right), n) : n;
    }
  }

  export interface ComputedPropertyName extends Node {
    parent: Declaration;
    kind: SyntaxKind.ComputedPropertyName;
    expression: Expression;
  }
  export namespace ComputedPropertyName {
    export function create(e: Expression) {
      const n = Node.createSynthesized(SyntaxKind.ComputedPropertyName) as ComputedPropertyName;
      n.expression = isCommaSequence(e) ? createParen(e) : e;
      return n;
    }
    export function kind(n: Node): n is ComputedPropertyName {
      return n.kind === SyntaxKind.ComputedPropertyName;
    }
    export function update(n: ComputedPropertyName, e: Expression) {
      return n.expression !== e ? updateNode(create(e), n) : n;
    }
  }

  export interface PropertySignature extends TypeElement, JSDocContainer {
    kind: SyntaxKind.PropertySignature;
    name: PropertyName;
    questionToken?: QuestionToken;
    type?: TypeNode;
    initializer?: Expression;
  }
  export namespace PropertySignature {
    export function create(ms: readonly Modifier[] | undefined, p: PropertyName | string, q?: QuestionToken, t?: TypeNode, i?: Expression) {
      const n = Node.createSynthesized(SyntaxKind.PropertySignature) as PropertySignature;
      n.modifiers = asNodeArray(ms);
      n.name = asName(p);
      n.questionToken = q;
      n.type = t;
      n.initializer = i;
      return n;
    }
    export function update(n: PropertySignature, ms: readonly Modifier[] | undefined, p: PropertyName, q?: QuestionToken, t?: TypeNode, i?: Expression) {
      return n.modifiers !== ms || n.name !== p || n.questionToken !== q || n.type !== t || n.initializer !== i ? updateNode(create(ms, p, q, t, i), n) : n;
    }
    export function kind(n: Node): n is PropertySignature {
      return n.kind === SyntaxKind.PropertySignature;
    }
  }

  export interface PropertyDeclaration extends ClassElement, JSDocContainer {
    kind: SyntaxKind.PropertyDeclaration;
    parent: ClassLikeDeclaration;
    name: PropertyName;
    questionToken?: QuestionToken;
    exclamationToken?: ExclamationToken;
    type?: TypeNode;
    initializer?: Expression;
  }
  export namespace PropertyDeclaration {
    export function create(ds: readonly Decorator[] | undefined, ms: readonly Modifier[] | undefined, p: string | PropertyName, q?: QuestionToken | ExclamationToken, t?: TypeNode, i?: Expression) {
      const n = Node.createSynthesized(SyntaxKind.PropertyDeclaration) as PropertyDeclaration;
      n.decorators = asNodeArray(ds);
      n.modifiers = asNodeArray(ms);
      n.name = asName(p);
      n.questionToken = q !== undefined && q.kind === SyntaxKind.QuestionToken ? q : undefined;
      n.exclamationToken = q !== undefined && q.kind === SyntaxKind.ExclamationToken ? q : undefined;
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
        n.questionToken !== (q !== undefined && q.kind === SyntaxKind.QuestionToken ? q : undefined) ||
        n.exclamationToken !== (q !== undefined && q.kind === SyntaxKind.ExclamationToken ? q : undefined) ||
        n.type !== t ||
        n.initializer !== i
        ? updateNode(create(ds, ms, p, q, t, i), n)
        : n;
    }
    export function kind(n: Node): n is PropertyDeclaration {
      return n.kind === SyntaxKind.PropertyDeclaration;
    }
  }

  export interface MethodSignature extends SignatureDeclarationBase, TypeElement {
    kind: SyntaxKind.MethodSignature;
    parent: ObjectTypeDeclaration;
    name: PropertyName;
  }
  export namespace MethodSignature {
    export function create(ts: readonly TypeParameterDeclaration[] | undefined, ps: readonly ParameterDeclaration[], t: TypeNode | undefined, p: string | PropertyName, q?: QuestionToken) {
      const n = SignatureDeclaration.create(SyntaxKind.MethodSignature, ts, ps, t) as MethodSignature;
      n.name = asName(p);
      n.questionToken = q;
      return n;
    }
    export function update(n: MethodSignature, ts: NodeArray<TypeParameterDeclaration> | undefined, ps: NodeArray<ParameterDeclaration>, t: TypeNode | undefined, p: PropertyName, q?: QuestionToken) {
      return n.typeParameters !== ts || n.parameters !== ps || n.type !== t || n.name !== p || n.questionToken !== q ? updateNode(create(ts, ps, t, p, q), n) : n;
    }
    export function kind(n: Node): n is MethodSignature {
      return n.kind === SyntaxKind.MethodSignature;
    }
  }

  export interface MethodDeclaration extends FunctionLikeDeclarationBase, ClassElement, ObjectLiteralElement, JSDocContainer {
    kind: SyntaxKind.MethodDeclaration;
    parent: ClassLikeDeclaration | ObjectLiteralExpression;
    name: PropertyName;
    body?: FunctionBody;
  }
  export namespace MethodDeclaration {
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
      const n = Node.createSynthesized(SyntaxKind.MethodDeclaration) as MethodDeclaration;
      n.decorators = asNodeArray(ds);
      n.modifiers = asNodeArray(ms);
      n.asteriskToken = a;
      n.name = asName(p);
      n.questionToken = q;
      n.typeParameters = asNodeArray(ts);
      n.parameters = createNodeArray(ps);
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
    export function kind(n: Node): n is MethodDeclaration {
      return n.kind === SyntaxKind.MethodDeclaration;
    }
  }

  export interface ConstructorDeclaration extends FunctionLikeDeclarationBase, ClassElement, JSDocContainer {
    kind: SyntaxKind.Constructor;
    parent: ClassLikeDeclaration;
    body?: FunctionBody;
  }
  export namespace ConstructorDeclaration {
    export function create(ds: readonly Decorator[] | undefined, ms: readonly Modifier[] | undefined, ps: readonly ParameterDeclaration[], b?: Block) {
      const n = Node.createSynthesized(SyntaxKind.Constructor) as ConstructorDeclaration;
      n.decorators = asNodeArray(ds);
      n.modifiers = asNodeArray(ms);
      n.typeParameters = undefined;
      n.parameters = createNodeArray(ps);
      n.type = undefined;
      n.body = b;
      return n;
    }
    export function update(n: ConstructorDeclaration, ds: readonly Decorator[] | undefined, ms: readonly Modifier[] | undefined, ps: readonly ParameterDeclaration[], b?: Block) {
      return n.decorators !== ds || n.modifiers !== ms || n.parameters !== ps || n.body !== b ? updateNode(create(ds, ms, ps, b), n) : n;
    }
    export function kind(n: Node): n is ConstructorDeclaration {
      return n.kind === SyntaxKind.Constructor;
    }
  }

  export interface GetAccessorDeclaration extends FunctionLikeDeclarationBase, ClassElement, ObjectLiteralElement, JSDocContainer {
    kind: SyntaxKind.GetAccessor;
    parent: ClassLikeDeclaration | ObjectLiteralExpression;
    name: PropertyName;
    body?: FunctionBody;
  }
  export namespace GetAccessorDeclaration {
    export function create(ds: readonly Decorator[] | undefined, ms: readonly Modifier[] | undefined, p: string | PropertyName, ps: readonly ParameterDeclaration[], t?: TypeNode, b?: Block) {
      const n = Node.createSynthesized(SyntaxKind.GetAccessor) as GetAccessorDeclaration;
      n.decorators = asNodeArray(ds);
      n.modifiers = asNodeArray(ms);
      n.name = asName(p);
      n.typeParameters = undefined;
      n.parameters = createNodeArray(ps);
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
    export function kind(n: Node): n is GetAccessorDeclaration {
      return n.kind === SyntaxKind.GetAccessor;
    }
    export function orSetKind(n: Node): n is AccessorDeclaration {
      return n.kind === SyntaxKind.SetAccessor || n.kind === SyntaxKind.GetAccessor;
    }
  }

  export interface SetAccessorDeclaration extends FunctionLikeDeclarationBase, ClassElement, ObjectLiteralElement, JSDocContainer {
    kind: SyntaxKind.SetAccessor;
    parent: ClassLikeDeclaration | ObjectLiteralExpression;
    name: PropertyName;
    body?: FunctionBody;
  }
  export namespace SetAccessorDeclaration {
    export function create(ds: readonly Decorator[] | undefined, ms: readonly Modifier[] | undefined, p: string | PropertyName, ps: readonly ParameterDeclaration[], b?: Block) {
      const n = Node.createSynthesized(SyntaxKind.SetAccessor) as SetAccessorDeclaration;
      n.decorators = asNodeArray(ds);
      n.modifiers = asNodeArray(ms);
      n.name = asName(p);
      n.typeParameters = undefined;
      n.parameters = createNodeArray(ps);
      n.body = b;
      return n;
    }
    export function update(n: SetAccessorDeclaration, ds: readonly Decorator[] | undefined, ms: readonly Modifier[] | undefined, p: PropertyName, ps: readonly ParameterDeclaration[], b?: Block) {
      return n.decorators !== ds || n.modifiers !== ms || n.name !== p || n.parameters !== ps || n.body !== b ? updateNode(create(ds, ms, p, ps, b), n) : n;
    }
    export function kind(n: Node): n is SetAccessorDeclaration {
      return n.kind === SyntaxKind.SetAccessor;
    }
  }

  export interface CallSignatureDeclaration extends SignatureDeclarationBase, TypeElement {
    kind: SyntaxKind.CallSignature;
  }
  export namespace CallSignatureDeclaration {
    export function create(ts: readonly TypeParameterDeclaration[] | undefined, ps: readonly ParameterDeclaration[], t?: TypeNode) {
      return SignatureDeclaration.create(SyntaxKind.CallSignature, ts, ps, t) as CallSignatureDeclaration;
    }
    export function update(n: CallSignatureDeclaration, ts: NodeArray<TypeParameterDeclaration> | undefined, ps: NodeArray<ParameterDeclaration>, t?: TypeNode) {
      return SignatureDeclaration.update(n, ts, ps, t);
    }
    export function kind(n: Node): n is CallSignatureDeclaration {
      return n.kind === SyntaxKind.CallSignature;
    }
  }

  export interface ConstructSignatureDeclaration extends SignatureDeclarationBase, TypeElement {
    kind: SyntaxKind.ConstructSignature;
  }
  export namespace ConstructSignatureDeclaration {
    export function create(ts: readonly TypeParameterDeclaration[] | undefined, ps: readonly ParameterDeclaration[], t?: TypeNode) {
      return SignatureDeclaration.create(SyntaxKind.ConstructSignature, ts, ps, t) as ConstructSignatureDeclaration;
    }
    export function update(n: ConstructSignatureDeclaration, ts: NodeArray<TypeParameterDeclaration> | undefined, ps: NodeArray<ParameterDeclaration>, t?: TypeNode) {
      return SignatureDeclaration.update(n, ts, ps, t);
    }
    export function kind(n: Node): n is ConstructSignatureDeclaration {
      return n.kind === SyntaxKind.ConstructSignature;
    }
  }

  export interface IndexSignatureDeclaration extends SignatureDeclarationBase, ClassElement, TypeElement {
    kind: SyntaxKind.IndexSignature;
    parent: ObjectTypeDeclaration;
  }
  export namespace IndexSignatureDeclaration {
    export function create(ds: readonly Decorator[] | undefined, ms: readonly Modifier[] | undefined, ps: readonly ParameterDeclaration[], t: TypeNode): IndexSignatureDeclaration {
      const n = Node.createSynthesized(SyntaxKind.IndexSignature) as IndexSignatureDeclaration;
      n.decorators = asNodeArray(ds);
      n.modifiers = asNodeArray(ms);
      n.parameters = createNodeArray(ps);
      n.type = t;
      return n;
    }
    export function update(n: IndexSignatureDeclaration, ds: readonly Decorator[] | undefined, ms: readonly Modifier[] | undefined, ps: readonly ParameterDeclaration[], t: TypeNode) {
      return n.parameters !== ps || n.type !== t || n.decorators !== ds || n.modifiers !== ms ? updateNode(create(ds, ms, ps, t), n) : n;
    }
    export function kind(n: Node): n is IndexSignatureDeclaration {
      return n.kind === SyntaxKind.IndexSignature;
    }
  }

  export interface TypeNode extends Node {
    _typeNodeBrand: any;
  }

  export interface KeywordTypeNode extends TypeNode {
    kind:
      | SyntaxKind.AnyKeyword
      | SyntaxKind.UnknownKeyword
      | SyntaxKind.NumberKeyword
      | SyntaxKind.BigIntKeyword
      | SyntaxKind.ObjectKeyword
      | SyntaxKind.BooleanKeyword
      | SyntaxKind.StringKeyword
      | SyntaxKind.SymbolKeyword
      | SyntaxKind.ThisKeyword
      | SyntaxKind.VoidKeyword
      | SyntaxKind.UndefinedKeyword
      | SyntaxKind.NullKeyword
      | SyntaxKind.NeverKeyword;
  }
  export namespace KeywordTypeNode {
    export function createKeywordTypeNode(kind: KeywordTypeNode['kind']) {
      return <KeywordTypeNode>Node.createSynthesized(kind);
    }
  }

  export interface TypePredicateNode extends TypeNode {
    kind: SyntaxKind.TypePredicate;
    parent: SignatureDeclaration | JSDocTypeExpression;
    assertsModifier?: AssertsToken;
    parameterName: Identifier | ThisTypeNode;
    type?: TypeNode;
  }
  export namespace TypePredicateNode {
    export function createTypePredicateNode(parameterName: Identifier | ThisTypeNode | string, type: TypeNode) {
      return createTypePredicateNodeWithModifier(/*assertsModifier*/ undefined, parameterName, type);
    }
    export function createTypePredicateNodeWithModifier(assertsModifier: AssertsToken | undefined, parameterName: Identifier | ThisTypeNode | string, type: TypeNode | undefined) {
      const node = Node.createSynthesized(SyntaxKind.TypePredicate) as TypePredicateNode;
      node.assertsModifier = assertsModifier;
      node.parameterName = asName(parameterName);
      node.type = type;
      return node;
    }
    export function updateTypePredicateNode(node: TypePredicateNode, parameterName: Identifier | ThisTypeNode, type: TypeNode) {
      return updateTypePredicateNodeWithModifier(node, node.assertsModifier, parameterName, type);
    }
    export function updateTypePredicateNodeWithModifier(node: TypePredicateNode, assertsModifier: AssertsToken | undefined, parameterName: Identifier | ThisTypeNode, type: TypeNode | undefined) {
      return node.assertsModifier !== assertsModifier || node.parameterName !== parameterName || node.type !== type
        ? updateNode(createTypePredicateNodeWithModifier(assertsModifier, parameterName, type), node)
        : node;
    }
    export function isTypePredicateNode(n: Node): n is TypePredicateNode {
      return n.kind === SyntaxKind.TypePredicate;
    }
  }

  export interface TypeReferenceNode extends NodeWithTypeArguments {
    kind: SyntaxKind.TypeReference;
    typeName: EntityName;
  }
  export namespace TypeReferenceNode {
    export function createTypeReferenceNode(typeName: string | EntityName, typeArguments: readonly TypeNode[] | undefined) {
      const node = Node.createSynthesized(SyntaxKind.TypeReference) as TypeReferenceNode;
      node.typeName = asName(typeName);
      node.typeArguments = typeArguments && parenthesizeTypeParameters(typeArguments);
      return node;
    }
    export function updateTypeReferenceNode(node: TypeReferenceNode, typeName: EntityName, typeArguments: NodeArray<TypeNode> | undefined) {
      return node.typeName !== typeName || node.typeArguments !== typeArguments ? updateNode(createTypeReferenceNode(typeName, typeArguments), node) : node;
    }
    export function isTypeReferenceNode(n: Node): n is TypeReferenceNode {
      return n.kind === SyntaxKind.TypeReference;
    }
  }

  export interface FunctionTypeNode extends FunctionOrConstructorTypeNodeBase {
    kind: SyntaxKind.FunctionType;
  }
  export namespace FunctionTypeNode {
    export function createFunctionTypeNode(typeParameters: readonly TypeParameterDeclaration[] | undefined, parameters: readonly ParameterDeclaration[], type: TypeNode | undefined) {
      return SignatureDeclaration.create(SyntaxKind.FunctionType, typeParameters, parameters, type) as FunctionTypeNode;
    }
    export function updateFunctionTypeNode(
      node: FunctionTypeNode,
      typeParameters: NodeArray<TypeParameterDeclaration> | undefined,
      parameters: NodeArray<ParameterDeclaration>,
      type: TypeNode | undefined
    ) {
      return SignatureDeclaration.update(node, typeParameters, parameters, type);
    }
    export function isFunctionTypeNode(n: Node): n is FunctionTypeNode {
      return n.kind === SyntaxKind.FunctionType;
    }
  }

  export interface ConstructorTypeNode extends FunctionOrConstructorTypeNodeBase {
    kind: SyntaxKind.ConstructorType;
  }
  export namespace ConstructorTypeNode {
    export function createConstructorDeclarationTypeNode(typeParameters: readonly TypeParameterDeclaration[] | undefined, parameters: readonly ParameterDeclaration[], type: TypeNode | undefined) {
      return SignatureDeclaration.create(SyntaxKind.ConstructorType, typeParameters, parameters, type) as ConstructorTypeNode;
    }
    export function updateConstructorDeclarationTypeNode(
      node: ConstructorTypeNode,
      typeParameters: NodeArray<TypeParameterDeclaration> | undefined,
      parameters: NodeArray<ParameterDeclaration>,
      type: TypeNode | undefined
    ) {
      return SignatureDeclaration.update(node, typeParameters, parameters, type);
    }
    export function isConstructorTypeNode(n: Node): n is ConstructorTypeNode {
      return n.kind === SyntaxKind.ConstructorType;
    }
  }

  export interface TypeQueryNode extends TypeNode {
    kind: SyntaxKind.TypeQuery;
    exprName: EntityName;
  }
  export namespace TypeQueryNode {
    export function createTypeQueryNode(exprName: EntityName) {
      const node = Node.createSynthesized(SyntaxKind.TypeQuery) as TypeQueryNode;
      node.exprName = exprName;
      return node;
    }
    export function updateTypeQueryNode(node: TypeQueryNode, exprName: EntityName) {
      return node.exprName !== exprName ? updateNode(createTypeQueryNode(exprName), node) : node;
    }
    export function isTypeQueryNode(n: Node): n is TypeQueryNode {
      return n.kind === SyntaxKind.TypeQuery;
    }
  }

  export interface TypeLiteralNode extends TypeNode, Declaration {
    kind: SyntaxKind.TypeLiteral;
    members: NodeArray<TypeElement>;
  }
  export namespace TypeLiteralNode {
    export function createTypeLiteralNode(members: readonly TypeElement[] | undefined) {
      const node = Node.createSynthesized(SyntaxKind.TypeLiteral) as TypeLiteralNode;
      node.members = createNodeArray(members);
      return node;
    }
    export function updateTypeLiteralNode(node: TypeLiteralNode, members: NodeArray<TypeElement>) {
      return node.members !== members ? updateNode(createTypeLiteralNode(members), node) : node;
    }
    export function isTypeLiteralNode(n: Node): n is TypeLiteralNode {
      return n.kind === SyntaxKind.TypeLiteral;
    }
  }

  export interface ArrayTypeNode extends TypeNode {
    kind: SyntaxKind.ArrayType;
    elementType: TypeNode;
  }
  export namespace ArrayTypeNode {
    export function createArrayTypeNode(elementType: TypeNode) {
      const node = Node.createSynthesized(SyntaxKind.ArrayType) as ArrayTypeNode;
      node.elementType = parenthesizeArrayTypeMember(elementType);
      return node;
    }
    export function updateArrayTypeNode(node: ArrayTypeNode, elementType: TypeNode): ArrayTypeNode {
      return node.elementType !== elementType ? updateNode(createArrayTypeNode(elementType), node) : node;
    }
    export function isArrayTypeNode(n: Node): n is ArrayTypeNode {
      return n.kind === SyntaxKind.ArrayType;
    }
  }

  export interface TupleTypeNode extends TypeNode {
    kind: SyntaxKind.TupleType;
    elements: NodeArray<TypeNode | NamedTupleMember>;
  }
  export namespace TupleTypeNode {
    export function createTupleTypeNode(elements: readonly (TypeNode | NamedTupleMember)[]) {
      const node = Node.createSynthesized(SyntaxKind.TupleType) as TupleTypeNode;
      node.elements = createNodeArray(elements);
      return node;
    }
    export function updateTupleTypeNode(node: TupleTypeNode, elements: readonly (TypeNode | NamedTupleMember)[]) {
      return node.elements !== elements ? updateNode(createTupleTypeNode(elements), node) : node;
    }
    export function isTupleTypeNode(n: Node): n is TupleTypeNode {
      return n.kind === SyntaxKind.TupleType;
    }
  }

  export interface OptionalTypeNode extends TypeNode {
    kind: SyntaxKind.OptionalType;
    type: TypeNode;
  }
  export namespace OptionalTypeNode {
    export function createOptionalTypeNode(type: TypeNode) {
      const node = Node.createSynthesized(SyntaxKind.OptionalType) as OptionalTypeNode;
      node.type = parenthesizeArrayTypeMember(type);
      return node;
    }
    export function updateOptionalTypeNode(node: OptionalTypeNode, type: TypeNode): OptionalTypeNode {
      return node.type !== type ? updateNode(createOptionalTypeNode(type), node) : node;
    }
  }

  export interface RestTypeNode extends TypeNode {
    kind: SyntaxKind.RestType;
    type: TypeNode;
  }
  export namespace RestTypeNode {
    export function createRestTypeNode(type: TypeNode) {
      const node = Node.createSynthesized(SyntaxKind.RestType) as RestTypeNode;
      node.type = type;
      return node;
    }
    export function updateRestTypeNode(node: RestTypeNode, type: TypeNode): RestTypeNode {
      return node.type !== type ? updateNode(createRestTypeNode(type), node) : node;
    }
  }

  export interface UnionTypeNode extends TypeNode {
    kind: SyntaxKind.UnionType;
    types: NodeArray<TypeNode>;
  }
  export namespace UnionTypeNode {
    export function createUnionTypeNode(types: readonly TypeNode[]): UnionTypeNode {
      return <UnionTypeNode>createUnionOrIntersectionTypeNode(SyntaxKind.UnionType, types);
    }
    export function updateUnionTypeNode(node: UnionTypeNode, types: NodeArray<TypeNode>) {
      return updateUnionOrIntersectionTypeNode(node, types);
    }
    export function createUnionOrIntersectionTypeNode(kind: SyntaxKind.UnionType | SyntaxKind.IntersectionType, types: readonly TypeNode[]) {
      const node = Node.createSynthesized(kind) as UnionTypeNode | IntersectionTypeNode;
      node.types = parenthesizeElementTypeMembers(types);
      return node;
    }
    export function updateUnionOrIntersectionTypeNode<T extends UnionOrIntersectionTypeNode>(node: T, types: NodeArray<TypeNode>): T {
      return node.types !== types ? updateNode(<T>createUnionOrIntersectionTypeNode(node.kind, types), node) : node;
    }
    export function isUnionTypeNode(n: Node): n is UnionTypeNode {
      return n.kind === SyntaxKind.UnionType;
    }
  }

  export interface IntersectionTypeNode extends TypeNode {
    kind: SyntaxKind.IntersectionType;
    types: NodeArray<TypeNode>;
  }
  export namespace IntersectionTypeNode {
    export function createIntersectionTypeNode(types: readonly TypeNode[]): IntersectionTypeNode {
      return <IntersectionTypeNode>createUnionOrIntersectionTypeNode(SyntaxKind.IntersectionType, types);
    }
    export function updateIntersectionTypeNode(node: IntersectionTypeNode, types: NodeArray<TypeNode>) {
      return updateUnionOrIntersectionTypeNode(node, types);
    }
    export function isIntersectionTypeNode(n: Node): n is IntersectionTypeNode {
      return n.kind === SyntaxKind.IntersectionType;
    }
  }

  export interface ConditionalTypeNode extends TypeNode {
    kind: SyntaxKind.ConditionalType;
    checkType: TypeNode;
    extendsType: TypeNode;
    trueType: TypeNode;
    falseType: TypeNode;
  }
  export namespace ConditionalTypeNode {
    export function createConditionalTypeNode(checkType: TypeNode, extendsType: TypeNode, trueType: TypeNode, falseType: TypeNode) {
      const node = Node.createSynthesized(SyntaxKind.ConditionalType) as ConditionalTypeNode;
      node.checkType = parenthesizeConditionalTypeMember(checkType);
      node.extendsType = parenthesizeConditionalTypeMember(extendsType);
      node.trueType = trueType;
      node.falseType = falseType;
      return node;
    }
    export function updateConditionalTypeNode(node: ConditionalTypeNode, checkType: TypeNode, extendsType: TypeNode, trueType: TypeNode, falseType: TypeNode) {
      return node.checkType !== checkType || node.extendsType !== extendsType || node.trueType !== trueType || node.falseType !== falseType
        ? updateNode(createConditionalTypeNode(checkType, extendsType, trueType, falseType), node)
        : node;
    }
    export function isConditionalTypeNode(n: Node): n is ConditionalTypeNode {
      return n.kind === SyntaxKind.ConditionalType;
    }
  }

  export interface InferTypeNode extends TypeNode {
    kind: SyntaxKind.InferType;
    typeParameter: TypeParameterDeclaration;
  }
  export namespace InferTypeNode {
    export function createInferTypeNode(typeParameter: TypeParameterDeclaration) {
      const node = <InferTypeNode>Node.createSynthesized(SyntaxKind.InferType);
      node.typeParameter = typeParameter;
      return node;
    }
    export function updateInferTypeNode(node: InferTypeNode, typeParameter: TypeParameterDeclaration) {
      return node.typeParameter !== typeParameter ? updateNode(createInferTypeNode(typeParameter), node) : node;
    }
    export function isInferTypeNode(n: Node): n is InferTypeNode {
      return n.kind === SyntaxKind.InferType;
    }
  }

  export interface ParenthesizedTypeNode extends TypeNode {
    kind: SyntaxKind.ParenthesizedType;
    type: TypeNode;
  }
  export namespace ParenthesizedTypeNode {
    export function createParenthesizedType(type: TypeNode) {
      const node = <ParenthesizedTypeNode>Node.createSynthesized(SyntaxKind.ParenthesizedType);
      node.type = type;
      return node;
    }
    export function updateParenthesizedType(node: ParenthesizedTypeNode, type: TypeNode) {
      return node.type !== type ? updateNode(createParenthesizedType(type), node) : node;
    }
    export function isParenthesizedTypeNode(n: Node): n is ParenthesizedTypeNode {
      return n.kind === SyntaxKind.ParenthesizedType;
    }
  }

  export interface ThisTypeNode extends TypeNode {
    kind: SyntaxKind.ThisType;
  }
  export namespace ThisTypeNode {
    export function createThisTypeNode() {
      return <ThisTypeNode>Node.createSynthesized(SyntaxKind.ThisType);
    }
    export function isThisTypeNode(n: Node): n is ThisTypeNode {
      return n.kind === SyntaxKind.ThisType;
    }
  }

  export interface TypeOperatorNode extends TypeNode {
    kind: SyntaxKind.TypeOperator;
    operator: SyntaxKind.KeyOfKeyword | SyntaxKind.UniqueKeyword | SyntaxKind.ReadonlyKeyword;
    type: TypeNode;
  }
  export namespace TypeOperatorNode {
    export function createTypeOperatorNode(type: TypeNode): TypeOperatorNode;
    export function createTypeOperatorNode(operator: SyntaxKind.KeyOfKeyword | SyntaxKind.UniqueKeyword | SyntaxKind.ReadonlyKeyword, type: TypeNode): TypeOperatorNode;
    export function createTypeOperatorNode(operatorOrType: SyntaxKind.KeyOfKeyword | SyntaxKind.UniqueKeyword | SyntaxKind.ReadonlyKeyword | TypeNode, type?: TypeNode) {
      const node = Node.createSynthesized(SyntaxKind.TypeOperator) as TypeOperatorNode;
      node.operator = typeof operatorOrType === 'number' ? operatorOrType : SyntaxKind.KeyOfKeyword;
      node.type = parenthesizeElementTypeMember(typeof operatorOrType === 'number' ? type! : operatorOrType);
      return node;
    }
    export function updateTypeOperatorNode(node: TypeOperatorNode, type: TypeNode) {
      return node.type !== type ? updateNode(createTypeOperatorNode(node.operator, type), node) : node;
    }
    export function isTypeOperatorNode(n: Node): n is TypeOperatorNode {
      return n.kind === SyntaxKind.TypeOperator;
    }
  }

  export interface IndexedAccessTypeNode extends TypeNode {
    kind: SyntaxKind.IndexedAccessType;
    objectType: TypeNode;
    indexType: TypeNode;
  }
  export namespace IndexedAccessTypeNode {
    export function createIndexedAccessTypeNode(objectType: TypeNode, indexType: TypeNode) {
      const node = Node.createSynthesized(SyntaxKind.IndexedAccessType) as IndexedAccessTypeNode;
      node.objectType = parenthesizeElementTypeMember(objectType);
      node.indexType = indexType;
      return node;
    }
    export function updateIndexedAccessTypeNode(node: IndexedAccessTypeNode, objectType: TypeNode, indexType: TypeNode) {
      return node.objectType !== objectType || node.indexType !== indexType ? updateNode(createIndexedAccessTypeNode(objectType, indexType), node) : node;
    }
    export function isIndexedAccessTypeNode(n: Node): n is IndexedAccessTypeNode {
      return n.kind === SyntaxKind.IndexedAccessType;
    }
  }

  export interface MappedTypeNode extends TypeNode, Declaration {
    kind: SyntaxKind.MappedType;
    readonlyToken?: ReadonlyToken | PlusToken | MinusToken;
    typeParameter: TypeParameterDeclaration;
    questionToken?: QuestionToken | PlusToken | MinusToken;
    type?: TypeNode;
  }
  export namespace MappedTypeNode {
    export function createMappedTypeNode(
      readonlyToken: ReadonlyToken | PlusToken | MinusToken | undefined,
      typeParameter: TypeParameterDeclaration,
      questionToken: QuestionToken | PlusToken | MinusToken | undefined,
      type: TypeNode | undefined
    ): MappedTypeNode {
      const node = Node.createSynthesized(SyntaxKind.MappedType) as MappedTypeNode;
      node.readonlyToken = readonlyToken;
      node.typeParameter = typeParameter;
      node.questionToken = questionToken;
      node.type = type;
      return node;
    }
    export function updateMappedTypeNode(
      node: MappedTypeNode,
      readonlyToken: ReadonlyToken | PlusToken | MinusToken | undefined,
      typeParameter: TypeParameterDeclaration,
      questionToken: QuestionToken | PlusToken | MinusToken | undefined,
      type: TypeNode | undefined
    ): MappedTypeNode {
      return node.readonlyToken !== readonlyToken || node.typeParameter !== typeParameter || node.questionToken !== questionToken || node.type !== type
        ? updateNode(createMappedTypeNode(readonlyToken, typeParameter, questionToken, type), node)
        : node;
    }
    export function isMappedTypeNode(n: Node): n is MappedTypeNode {
      return n.kind === SyntaxKind.MappedType;
    }
  }

  export interface LiteralTypeNode extends TypeNode {
    kind: SyntaxKind.LiteralType;
    literal: BooleanLiteral | LiteralExpression | PrefixUnaryExpression;
  }
  export namespace LiteralTypeNode {
    export function createLiteralTypeNode(literal: LiteralTypeNode['literal']) {
      const node = Node.createSynthesized(SyntaxKind.LiteralType) as LiteralTypeNode;
      node.literal = literal;
      return node;
    }
    export function updateLiteralTypeNode(node: LiteralTypeNode, literal: LiteralTypeNode['literal']) {
      return node.literal !== literal ? updateNode(createLiteralTypeNode(literal), node) : node;
    }
    export function isLiteralTypeNode(n: Node): n is LiteralTypeNode {
      return n.kind === SyntaxKind.LiteralType;
    }
  }

  export interface NamedTupleMember extends TypeNode, JSDocContainer, Declaration {
    kind: SyntaxKind.NamedTupleMember;
    dotDotDotToken?: Token<SyntaxKind.Dot3Token>;
    name: Identifier;
    questionToken?: Token<SyntaxKind.QuestionToken>;
    type: TypeNode;
  }
  export namespace NamedTupleMember {
    export function createNamedTupleMember(dotDotDotToken: Token<SyntaxKind.Dot3Token> | undefined, name: Identifier, questionToken: Token<SyntaxKind.QuestionToken> | undefined, type: TypeNode) {
      const node = <NamedTupleMember>Node.createSynthesized(SyntaxKind.NamedTupleMember);
      node.dotDotDotToken = dotDotDotToken;
      node.name = name;
      node.questionToken = questionToken;
      node.type = type;
      return node;
    }
    export function updateNamedTupleMember(
      node: NamedTupleMember,
      dotDotDotToken: Token<SyntaxKind.Dot3Token> | undefined,
      name: Identifier,
      questionToken: Token<SyntaxKind.QuestionToken> | undefined,
      type: TypeNode
    ) {
      return node.dotDotDotToken !== dotDotDotToken || node.name !== name || node.questionToken !== questionToken || node.type !== type
        ? updateNode(createNamedTupleMember(dotDotDotToken, name, questionToken, type), node)
        : node;
    }
  }

  export interface ImportTypeNode extends NodeWithTypeArguments {
    kind: SyntaxKind.ImportType;
    isTypeOf?: boolean;
    argument: TypeNode;
    qualifier?: EntityName;
  }
  export namespace ImportTypeNode {
    export function createImportTypeNode(argument: TypeNode, qualifier?: EntityName, typeArguments?: readonly TypeNode[], isTypeOf?: boolean) {
      const node = <ImportTypeNode>Node.createSynthesized(SyntaxKind.ImportType);
      node.argument = argument;
      node.qualifier = qualifier;
      node.typeArguments = parenthesizeTypeParameters(typeArguments);
      node.isTypeOf = isTypeOf;
      return node;
    }
    export function updateImportTypeNode(node: ImportTypeNode, argument: TypeNode, qualifier?: EntityName, typeArguments?: readonly TypeNode[], isTypeOf?: boolean) {
      return node.argument !== argument || node.qualifier !== qualifier || node.typeArguments !== typeArguments || node.isTypeOf !== isTypeOf
        ? updateNode(createImportTypeNode(argument, qualifier, typeArguments, isTypeOf), node)
        : node;
    }
    export function isImportTypeNode(n: Node): n is ImportTypeNode {
      return n.kind === SyntaxKind.ImportType;
    }
  }

  function createMethodCall(object: Expression, methodName: string | Identifier, argumentsList: readonly Expression[]) {
    return createCall(createPropertyAccess(object, asName(methodName)), /*typeArguments*/ undefined, argumentsList);
  }

  function createGlobalMethodCall(globalObjectName: string, methodName: string, argumentsList: readonly Expression[]) {
    return createMethodCall(createIdentifier(globalObjectName), methodName, argumentsList);
  }

  export function createObjectDefinePropertyCall(target: Expression, propertyName: string | Expression, attributes: Expression) {
    return createGlobalMethodCall('Object', 'defineProperty', [target, asExpression(propertyName), attributes]);
  }

  function tryAddPropertyAssignment(ps: Push<PropertyAssignment>, p: string, e?: Expression) {
    if (e) {
      ps.push(createPropertyAssignment(p, e));
      return true;
    }
    return false;
  }

  export function createPropertyDescriptor(attributes: PropertyDescriptorAttributes, singleLine?: boolean) {
    const ps: PropertyAssignment[] = [];
    tryAddPropertyAssignment(ps, 'enumerable', asExpression(attributes.enumerable));
    tryAddPropertyAssignment(ps, 'configurable', asExpression(attributes.configurable));
    let isData = tryAddPropertyAssignment(ps, 'writable', asExpression(attributes.writable));
    isData = tryAddPropertyAssignment(ps, 'value', attributes.value) || isData;
    let isAccessor = tryAddPropertyAssignment(ps, 'get', attributes.get);
    isAccessor = tryAddPropertyAssignment(ps, 'set', attributes.set) || isAccessor;
    assert(!(isData && isAccessor), 'A PropertyDescriptor may not be both an accessor descriptor and a data descriptor.');
    return createObjectLiteral(ps, !singleLine);
  }

  export namespace SignatureDeclaration {
    export function create(k: SyntaxKind, ts: readonly TypeParameterDeclaration[] | undefined, ps: readonly ParameterDeclaration[], t?: TypeNode, ta?: readonly TypeNode[]) {
      const n = Node.createSynthesized(k) as SignatureDeclaration;
      n.typeParameters = asNodeArray(ts);
      n.parameters = asNodeArray(ps);
      n.type = t;
      n.typeArguments = asNodeArray(ta);
      return n;
    }
    export function update<T extends SignatureDeclaration>(n: T, ts: NodeArray<TypeParameterDeclaration> | undefined, ps: NodeArray<ParameterDeclaration>, t?: TypeNode): T {
      return n.typeParameters !== ts || n.parameters !== ps || n.type !== t ? updateNode(create(n.kind, ts, ps, t) as T, n) : n;
    }
  }
}
